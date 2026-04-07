import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus, InvitationRole } from '../entities/invitation.entity';
import { CreateInvitationsDto, CreateInviteLinkDto, ListInvitationsDto, AcceptInvitationDto } from '../dto/invitation.dto';
import { generateInviteLinkToken, verifyInviteLinkToken } from '../auth/token.util';
import { NotificationsClient } from './notifications.client';
import { InternalUserSummary, UserServiceClient } from './user-service.client';

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
    suggestedPath: '/my-team' | '/onboarding';
    teamId: string;
  };
};

@Injectable()
export class InvitationsService {
  private readonly expDays: number;
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsClient,
    private readonly userService: UserServiceClient,
  ) {
    this.expDays = parseInt(config.get('INVITE_EXP_DAYS') ?? '7', 10);
    this.appBaseUrl = config.get('APP_BASE_URL') ?? 'http://localhost:3000';
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
        suggestedPath: '/my-team',
        teamId: invitation.teamId,
      },
    };
  }

  createInviteLink(
    dto: CreateInviteLinkDto,
    creator: { id: string; email: string },
    team: { id: string; name: string },
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expDays);

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
      url: `${this.appBaseUrl}/invite/accept?token=${encodeURIComponent(token)}`,
    };
  }

  async createInvites(dto: CreateInvitationsDto, inviter: { id: string; email: string }) {
    const results = [];
    for (const email of dto.emails) {
      const existing = await this.repo.findOne({
        where: { teamId: dto.teamId, invitedEmail: email, status: InvitationStatus.PENDING },
      });

      if (existing) {
        results.push({ ...existing, alreadyInvited: true });
        continue;
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.expDays);

      const inv = await this.repo.save(
        this.repo.create({
          teamId: dto.teamId,
          invitedEmail: email,
          role: dto.role,
          token,
          expiresAt,
          createdByUserId: inviter.id,
          note: dto.note ?? null,
        }),
      );

      await this.notifications.sendInvitationEmail({
        to: email,
        teamName: dto.teamId,
        role: dto.role,
        acceptUrl: `${this.appBaseUrl}/invitations/accept?token=${token}`,
        inviterEmail: inviter.email,
        note: dto.note,
      });

      results.push({ ...inv, alreadyInvited: false });
    }
    return results;
  }

  async list(dto: ListInvitationsDto) {
    const qb = this.repo.createQueryBuilder('i').orderBy('i.createdAt', 'DESC');

    if (dto.teamId) qb.andWhere('i.teamId = :teamId', { teamId: dto.teamId });
    if (dto.status) qb.andWhere('i.status = :status', { status: dto.status });
    if (dto.cursor) qb.andWhere('i.createdAt < :cursor', { cursor: new Date(dto.cursor) });

    qb.take((dto.limit ?? 20) + 1);
    const rows = await qb.getMany();
    const limit = dto.limit ?? 20;
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
    };
  }

  async getOne(id: string): Promise<Invitation> {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    return inv;
  }

  async resend(id: string): Promise<Invitation> {
    const inv = await this.getOne(id);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invitations');
    }
    inv.resentCount += 1;
    await this.repo.save(inv);

    await this.notifications.sendInvitationEmail({
      to: inv.invitedEmail,
      teamName: inv.teamId,
      role: inv.role,
      acceptUrl: `${this.appBaseUrl}/invitations/accept?token=${inv.token}`,
      inviterEmail: '',
    });

    return inv;
  }

  async cancel(id: string): Promise<Invitation> {
    const inv = await this.getOne(id);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }
    inv.status = InvitationStatus.CANCELED;
    inv.canceledAt = new Date();
    return this.repo.save(inv);
  }

  async accept(dto: AcceptInvitationDto, invitee: { id: string; email: string }): Promise<Invitation | Record<string, any>> {
    const inv = await this.repo.findOne({ where: { token: dto.token } });
    if (!inv) {
      // Fallback: try to verify as a generic invite link token (HMAC-signed)
      const linkPayload = verifyInviteLinkToken(dto.token);
      if (!linkPayload) {
        throw new NotFoundException('Invalid invitation token');
      }

      // Link-based accept — add to team_members directly
      await this.dataSource.query(
        `INSERT INTO team_members (team_id, user_id, role, created_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (team_id, user_id) DO NOTHING`,
        [linkPayload.teamId, invitee.id, linkPayload.role],
      ).catch(() => null);

      const updatedUserSummary = await this.userService.dismissOnboarding(invitee.id);

      return this.buildAcceptResponse({
        id: null,
        teamId: linkPayload.teamId,
        teamName: linkPayload.teamName,
        invitedEmail: invitee.email,
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
    if (inv.status !== InvitationStatus.PENDING) throw new BadRequestException('Invitation is no longer pending');
    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.repo.save(inv);
      throw new BadRequestException('Invitation has expired');
    }
    if (inv.invitedEmail.toLowerCase() !== invitee.email.toLowerCase()) {
      throw new ForbiddenException('Email does not match invitation');
    }

    // Idempotent team_members insert
    await this.dataSource.query(
      `INSERT INTO team_members (team_id, user_id, role, created_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [inv.teamId, invitee.id, inv.role],
    ).catch(() => null); // ignore if team_members table not yet created

    inv.status = InvitationStatus.ACCEPTED;
    inv.acceptedAt = new Date();
    const updated = await this.repo.save(inv);

    if (!updated) {
      throw new NotFoundException('Invitation not found');
    }

    const updatedUserSummary = await this.userService.dismissOnboarding(invitee.id);

    return this.buildAcceptResponse(
      {
        ...updated,
        acceptedAt: updated.acceptedAt ?? new Date(),
      },
      updatedUserSummary,
    );
  }
}
