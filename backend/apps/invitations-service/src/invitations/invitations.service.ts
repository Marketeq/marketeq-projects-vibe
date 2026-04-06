import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Invitation } from "./invitations.entity";
import { CreateInvitationsDto, AcceptInvitationDto, CreateInviteLinkDto } from "./invitations.dto";
import { NotificationsClient } from "./notifications.client";
import { InternalUserSummary, UserServiceClient } from "./user-service.client";
import { generateInviteLinkToken, generateInviteToken, nowPlusDays, verifyInviteLinkToken } from "../auth/token.util";

type AcceptInvitationResult = {
  id: string | null;
  teamId: string;
  teamName?: string;
  invitedEmail: string;
  role: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdByUserId: string;
  acceptedAt: Date;
  canceledAt: Date | null;
  resentCount: number;
  acceptedUser: {
    id: string;
    email: string;
    role: string;
    onboardingDismissed: boolean;
    hasCompletedOnboarding: boolean;
    accountState: 'existing_account';
  };
  postAccept: {
    nextStep: 'go_to_team' | 'continue_onboarding';
    reason:
      | 'existing_user_completed_onboarding'
      | 'existing_user_needs_onboarding';
    suggestedPath: '/teams' | '/onboarding';
    teamId: string;
  };
};

@Injectable()
export class InvitationsService {
  private repo: Repository<Invitation>;
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notify: NotificationsClient,
    private readonly userService: UserServiceClient
  ) {
    this.repo = this.ds.getRepository(Invitation);
  }

  private getExpiry(): Date {
    const days = Number(process.env.INVITE_EXP_DAYS || 7);
    return nowPlusDays(days);
  }

  private buildAcceptResponse(
    invitation: {
      id: string | null;
      teamId: string;
      teamName?: string;
      invitedEmail: string;
      role: string;
      status: string;
      token: string;
      expiresAt: Date;
      createdByUserId: string;
      acceptedAt: Date;
      canceledAt?: Date | null;
      resentCount: number;
    },
    userSummary: InternalUserSummary,
  ): AcceptInvitationResult {
    return {
      ...invitation,
      canceledAt: invitation.canceledAt ?? null,
      acceptedUser: {
        id: userSummary.id,
        email: userSummary.email,
        role: userSummary.role,
        onboardingDismissed: userSummary.onboardingDismissed,
        hasCompletedOnboarding: true,
        accountState: 'existing_account',
      },
      postAccept: {
        nextStep: 'go_to_team',
        reason: 'existing_user_completed_onboarding',
        suggestedPath: '/teams',
        teamId: invitation.teamId,
      },
    };
  }

  createInviteLink(
    dto: CreateInviteLinkDto,
    creator: { id: string; email: string; name?: string },
    team: { id: string; name: string },
  ) {
    const expiresAt = this.getExpiry();
    const token = generateInviteLinkToken({
      teamId: dto.teamId,
      role: dto.role,
      teamName: team.name,
      invitedBy: creator.id,
      exp: expiresAt.getTime(),
    });

    return {
      teamId: dto.teamId,
      teamName: team.name,
      role: dto.role,
      status: 'pending' as const,
      token,
      expiresAt,
      url: `${process.env.APP_BASE_URL}/invite/accept?token=${encodeURIComponent(token)}`,
    };
  }

  async createInvites(dto: CreateInvitationsDto, creator: { id: string; email: string; name?: string }, team: { id: string; name: string }) {
    const results: Array<{ invitation: Invitation; alreadyInvited: boolean }> = [];
    
    for (const email of dto.emails) {
      const normalizedEmail = email.trim().toLowerCase();
      // If a pending invite exists for team + email, return it (idempotent)
      let existing = await this.repo.findOne({ where: { teamId: dto.teamId, invitedEmail: normalizedEmail, status: 'pending' as any } });
      if (existing) {
        results.push({ invitation: existing, alreadyInvited: true });
        continue;
      }

      const token = generateInviteToken();
      const inv = this.repo.create({
              teamId: dto.teamId,
              teamName: team.name, 
              invitedEmail: normalizedEmail,
              role: dto.role,
              status: 'pending',
              token,
              expiresAt: this.getExpiry(),
              createdByUserId: creator.id
            });
      const saved = await this.repo.save(inv);
     
      const acceptUrl = `${process.env.APP_BASE_URL}/invite/accept?token=${encodeURIComponent(token)}`;
      await this.notify.sendTeamInvite({
        to: normalizedEmail,
        senderName: creator.name || creator.email,
        teamName: team.name,
        acceptUrl,
        expiresInDays: Number(process.env.INVITE_EXP_DAYS || 7),
        note: dto.note
      });

      results.push({ invitation: saved, alreadyInvited: false });
    }

    return results;
  }

  async list(params: { teamId?: string; invitedEmail?: string; status?: Invitation['status']; limit?: number; cursor?: string }) {
    const qb = this.repo.createQueryBuilder('i')
      .orderBy('i.created_at', 'DESC')
      .limit(Math.min(Number(params.limit || 25), 100));

    if (params.teamId) qb.andWhere('i.team_id = :teamId', { teamId: params.teamId });
    if (params.invitedEmail) qb.andWhere('LOWER(TRIM(i.invited_email)) = :invitedEmail', { invitedEmail: params.invitedEmail.trim().toLowerCase() });
    if (params.status) qb.andWhere('i.status = :status', { status: params.status });
    if (params.cursor) qb.andWhere('i.created_at < :cursor', { cursor: new Date(params.cursor) });

    const data = await qb.getMany();
    const nextCursor = data.length ? data[data.length - 1].createdAt.toISOString() : null;
    return { data, nextCursor };
  }

  async resend(id: string, actor: { id: string; email: string }, team: { name: string }) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'pending') throw new BadRequestException('Only pending invites can be resent');

    const acceptUrl = `${process.env.APP_BASE_URL}/invite/accept?token=${encodeURIComponent(inv.token)}`;
    await this.notify.sendTeamInvite({
      to: inv.invitedEmail,
      senderName: actor.email,
      teamName: team.name,
      acceptUrl,
      expiresInDays: Number(process.env.INVITE_EXP_DAYS || 7)
    });

    inv.resentCount += 1;
    await this.repo.save(inv);
    return inv;
  }

  async cancel(id: string, actorId: string) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'pending') throw new BadRequestException('Only pending invites can be canceled');

    inv.status = 'canceled' as any;
    inv.canceledAt = new Date();
    await this.repo.save(inv);
    return inv;
  }

  async accept(dto: AcceptInvitationDto, authUser: { id: string; email: string }) {
    const inv = await this.repo.findOne({ where: { token: dto.token } });
    if (!inv) {
      const linkPayload = verifyInviteLinkToken(dto.token);
      if (!linkPayload) {
        throw new NotFoundException('Invalid token');
      }

      try {
        const added = await this.userService.addTeamMember({
          teamId: linkPayload.teamId,
          userId: authUser.id,
          role: linkPayload.role
        });
        if (!added) {
          throw new Error('Team membership add returned unsuccessful response');
        }
      } catch (error) {
        console.error('Failed to add team member via generic link:', error);
        throw new BadRequestException('Failed to add team member');
      }

      const updatedUserSummary = await this.userService.dismissOnboarding(authUser.id);

      return this.buildAcceptResponse({
        id: null,
        teamId: linkPayload.teamId,
        teamName: linkPayload.teamName,
        invitedEmail: authUser.email,
        role: linkPayload.role,
        status: 'accepted',
        token: dto.token,
        expiresAt: new Date(linkPayload.exp),
        createdByUserId: linkPayload.invitedBy,
        acceptedAt: new Date(),
        canceledAt: null,
        resentCount: 0,
      }, updatedUserSummary);
    }

    const now = new Date();
    if (inv.status !== 'pending') throw new BadRequestException('Invitation is not pending');
    if (inv.expiresAt <= now) {
      inv.status = 'expired' as any;
      await this.repo.save(inv);
      throw new BadRequestException('Invitation has expired');
    }

    // The email on the invitation must match the authenticated user's email.
    if (inv.invitedEmail.trim().toLowerCase() !== (authUser.email || '').trim().toLowerCase()) {
      throw new BadRequestException('Invitation email does not match your account');
    }

    // Add to team_members via user-service API
    try {
      const added = await this.userService.addTeamMember({
        teamId: inv.teamId,
        userId: authUser.id,
        role: inv.role
      });
      if (!added) {
        throw new Error('Team membership add returned unsuccessful response');
      }
    } catch (error) {
      console.error('Failed to add team member:', error);
      throw new BadRequestException('Failed to add team member');
    }

    const updateResult = await this.repo.update(
      { id: inv.id, status: 'pending' as any },
      { status: 'accepted' as any, acceptedAt: now },
    );

    if (!updateResult.affected) {
      throw new BadRequestException('Invitation state changed, please retry');
    }

    const updated = await this.repo.findOne({ where: { id: inv.id } });
    if (!updated) {
      throw new NotFoundException('Invitation not found');
    }

    const updatedUserSummary = await this.userService.dismissOnboarding(authUser.id);

    return this.buildAcceptResponse(
      {
        ...updated,
        acceptedAt: updated.acceptedAt ?? now,
      },
      updatedUserSummary,
    );
  }

  async getOne(id: string) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    return inv;
  }
}
