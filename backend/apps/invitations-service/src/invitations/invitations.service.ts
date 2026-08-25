import { BrevoService } from '../../../notification-service/src/brevo/brevo.service';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus, InvitationRole } from '../entities/invitation.entity';
import { CreateInvitationsDto, CreateInviteLinkDto, ListInvitationsDto, AcceptInvitationDto, ShareProjectLinkDto } from '../dto/invitation.dto';
import { generateInviteLinkToken, verifyInviteLinkToken } from '../auth/token.util';
import { InternalUserSummary, UserServiceClient } from './user-service.client';

type AcceptInvitationResult = {
  id: string | null;
  teamId: string;
  teamName?: string;
  invitedEmail: string;
  role: string;
  note?: string | null;
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
  private readonly logger = new Logger(InvitationsService.name);
  private readonly expDays: number;
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly userService: UserServiceClient,
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmq: ClientProxy,
    // Add BrevoService for direct email sending
    private readonly brevoService: BrevoService,
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
      note?: string | null;
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
    const hasCompleted = userSummary.onboardingDismissed;

    return {
      ...invitation,
      canceledAt: invitation.canceledAt ?? null,
      acceptedUser: {
        id: userSummary.id,
        email: userSummary.email,
        role: userSummary.role,
        onboardingDismissed: userSummary.onboardingDismissed,
        hasCompletedOnboarding: hasCompleted,
        accountState: 'existing_account',
      },
      postAccept: {
        nextStep: hasCompleted ? 'go_to_team' : 'continue_onboarding',
        reason: hasCompleted
          ? 'existing_user_completed_onboarding'
          : 'existing_user_needs_onboarding',
        suggestedPath: hasCompleted ? '/teams' : '/onboarding',
        teamId: invitation.teamId,
      },
    };
  }

  private normalizeInvitationNote(note?: string): string | null {
    if (typeof note !== 'string') return null;
    const trimmed = note.trim();
    return trimmed.length > 0 ? trimmed : null;
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

  private async getSafeDismissedUserSummary(invitee: { id: string; email: string; role?: string }): Promise<InternalUserSummary> {
    try {
      return await this.userService.dismissOnboarding(invitee.id);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message ?? err?.message ?? 'unknown error';

      if (status === 404) {
        this.logger.warn(
          `User ${invitee.id} not found in user-service during onboarding dismiss. Attempting internal sync + retry.`,
        );

        try {
          await this.userService.syncUserProfile({
            id: invitee.id,
            email: invitee.email,
          });

          return await this.userService.dismissOnboarding(invitee.id);
        } catch (syncErr: any) {
          const syncStatus = syncErr?.response?.status;
          const syncMessage = syncErr?.response?.data?.message ?? syncErr?.message ?? 'unknown error';

          if (syncStatus === 409) {
            this.logger.warn(
              `Identity conflict while syncing user ${invitee.id} (${invitee.email}). user-service has same email under a different id. message=${syncMessage}`,
            );
          } else {
            this.logger.warn(
              `Failed sync+retry recovery for user ${invitee.id}. status=${syncStatus ?? 'n/a'} message=${syncMessage}`,
            );
          }
        }
      }

      this.logger.warn(
        `Failed to dismiss onboarding via user-service for ${invitee.id}; continuing with fallback summary. status=${status ?? 'n/a'} message=${message}`,
      );

      return {
        id: invitee.id,
        email: invitee.email,
        role: invitee.role ?? 'member',
        onboardingDismissed: false,
        hasCompletedOnboarding: false,
        isActive: true,
      };
    }
  }

  async createInvites(dto: CreateInvitationsDto, inviter: { id: string; email: string }) {
    const results = [];
    const normalizedNote = this.normalizeInvitationNote(dto.note);
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
          note: normalizedNote ?? undefined,
          token,
          expiresAt,
          createdByUserId: inviter.id,
        }),
      );


      // --- Send invitation via RabbitMQ (existing logic) ---
      this.rabbitmq.emit('notification.email.team_invitation', {
        to: email,
        teamName: dto.teamId,
        role: dto.role,
        acceptUrl: `${this.appBaseUrl}/invite/accept?token=${token}`,
        inviterEmail: inviter.email,
        note: normalizedNote ?? undefined,
      });

      // --- Direct Brevo email for testing (comment out when switching back to SendGrid) ---
      this.logger.log(
        `[DirectBrevo] Sending invitation email: to=${email} teamId=${dto.teamId} role=${dto.role} inviter=${inviter.email} token=${token.substring(0, 8)}...`,
      );
      try {
        await this.brevoService.sendNotificationEmail(
          email,
          `You're invited to join team ${dto.teamId}`,
          `You have been invited as ${dto.role}.`,
          `${this.appBaseUrl}/invite/accept?token=${token}`
        );
        this.logger.log(`[DirectBrevo] Invitation email sent successfully: to=${email}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`[DirectBrevo] Failed to send invitation email: to=${email} error=${message}`);
      }

      // Publish notification event to RabbitMQ
      this.rabbitmq.emit('notification.send', {
        recipientId: inviter.id,
        recipientEmail: inviter.email,
        category: 'teams',
        event: 'invitation.sent',
        title: `Invitation sent to ${email}`,
        body: `You've invited ${email} to join your team as ${dto.role}`,
        link: `${this.appBaseUrl}/my-team`,
        metadata: { invitedEmail: email, teamId: dto.teamId, role: dto.role },
        delivery: { inApp: true, email: false },
      });

      results.push({ ...inv, alreadyInvited: false });
    }
    return results;
  }

  async shareProjectLink(
    dto: ShareProjectLinkDto,
    sharer: { id?: string; sub?: string; email?: string },
  ) {
    const sharerEmail = sharer?.email?.trim();
    let sharerName = sharerEmail || undefined;
    const sharerId = sharer?.id ?? sharer?.sub;
    if (sharerId) {
      try {
        const summary = await this.userService.getUserSummary(sharerId);
        const fullName = [summary.firstName, summary.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (fullName) {
          sharerName = sharerEmail ? `${fullName} (${sharerEmail})` : fullName;
        }
      } catch {
        // fall back to email
      }
    }
    const note = dto.message?.trim() || undefined;

    const results: Array<{ email: string; sent: boolean }> = [];
    for (const email of dto.emails) {
      try {
        await this.brevoService.sendShareProjectEmail(email, {
          sharerName,
          projectTitle: dto.projectTitle,
          projectUrl: dto.projectUrl,
          note,
        });
        this.logger.log(`[ShareProject] Link email sent: to=${email}`);
        results.push({ email, sent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[ShareProject] Failed to send link email: to=${email} error=${message}`,
        );
        results.push({ email, sent: false });
      }
    }
    return { success: true, results };
  }

  async list(dto: ListInvitationsDto) {
    const qb = this.repo.createQueryBuilder('i').orderBy('i.createdAt', 'DESC');

    if (dto.teamId) qb.andWhere('i.teamId = :teamId', { teamId: dto.teamId });
    if (dto.status) qb.andWhere('i.status = :status', { status: dto.status });
    if (dto.invitedEmail) {
      qb.andWhere('LOWER(i.invitedEmail) = LOWER(:invitedEmail)', {
        invitedEmail: dto.invitedEmail.trim(),
      });
    }
    if (dto.cursor) qb.andWhere('i.createdAt < :cursor', { cursor: new Date(dto.cursor) });

    qb.take((dto.limit ?? 20) + 1);
    const rows = await qb.getMany();
    const limit = dto.limit ?? 20;
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    // Enrich accepted invitations with the invitee's profile (name + avatar)
    const enriched = await Promise.all(
      data.map(async (inv) => {
        if (inv.status === 'accepted') {
          try {
            // Prefer id-based lookup for newer rows; fallback to email for older accepted invites.
            const summary = inv.inviteeUserId
              ? await this.userService.getUserSummary(inv.inviteeUserId)
              : await this.userService.getUserSummaryByEmail(inv.invitedEmail);
            return {
              ...inv,
              inviteeName: [summary.firstName, summary.lastName].filter(Boolean).join(' ') || summary.email,
              avatarUrl: summary.avatarUrl ?? null,
            };
          } catch {
            // Fallback: return without enrichment
          }
        }
        return inv;
      }),
    );

    return {
      data: enriched,
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

    this.rabbitmq.emit('notification.email.team_invitation', {
      to: inv.invitedEmail,
      teamName: inv.teamName ?? inv.teamId,
      role: inv.role,
      acceptUrl: `${this.appBaseUrl}/invite/accept?token=${inv.token}`,
      inviterEmail: '',
      note: inv.note,
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

      // Link-based accept — add to the team roster via user-service.
      await this.userService
        .addTeamMember({
          teamId: linkPayload.teamId,
          userId: invitee.id,
          role: linkPayload.role,
        })
        .catch(() => null);

      const updatedUserSummary = await this.getSafeDismissedUserSummary(invitee);

      return this.buildAcceptResponse({
        id: null,
        teamId: linkPayload.teamId,
        teamName: linkPayload.teamName,
        invitedEmail: invitee.email,
        role: linkPayload.role,
        note: null,
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

    // Add to the team roster via user-service (idempotent; user-service
    // owns the user_service.team_members table the roster is read from).
    await this.userService
      .addTeamMember({
        teamId: inv.teamId,
        userId: invitee.id,
        role: inv.role,
      })
      .catch(() => null);

    inv.status = InvitationStatus.ACCEPTED;
    inv.acceptedAt = new Date();
    inv.inviteeUserId = invitee.id;
    const updated = await this.repo.save(inv);

    if (!updated) {
      throw new NotFoundException('Invitation not found');
    }

     const updatedUserSummary = await this.getSafeDismissedUserSummary(invitee);

    // Publish notification to invitee: they've accepted and joined the team
    this.rabbitmq.emit('notification.send', {
      recipientId: invitee.id,
      recipientEmail: invitee.email,
      category: 'teams',
      event: 'invitation.accepted',
      title: `You've joined ${updated.teamId}`,
      body: `You successfully accepted the invitation to join the team`,
      link: `/my-team`,
      metadata: { teamId: updated.teamId, invitationId: updated.id },
      delivery: { inApp: true, email: false },
    });

    // Publish notification to inviter: invitee has accepted
    this.rabbitmq.emit('notification.send', {
      recipientId: updated.createdByUserId,
      category: 'teams',
      event: 'invitation.accepted_by_invitee',
      title: `${invitee.email} accepted your invitation`,
      body: `${invitee.email} has joined your team as ${updated.role}`,
      link: `/my-team`,
      metadata: { teamId: updated.teamId, acceptedByEmail: invitee.email, invitationId: updated.id },
      delivery: { inApp: true, email: false },
    });


    return this.buildAcceptResponse(
      {
        ...updated,
        acceptedAt: updated.acceptedAt ?? new Date(),
      },
      updatedUserSummary,
    );
  }
}
