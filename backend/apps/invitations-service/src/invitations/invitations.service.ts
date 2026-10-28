import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus, InvitationRole } from '../entities/invitation.entity';
import { CreateInvitationsDto, CreateInviteLinkDto, ListInvitationsDto, AcceptInvitationDto, ShareProjectLinkDto, UpdateInvitationDto, CheckInvitationsDto } from '../dto/invitation.dto';
import { generateInviteLinkToken, verifyInviteLinkToken } from '../auth/token.util';
import {
  generateInviteSecret,
  hashInviteSecret,
  verifyInviteSecret,
  buildAcceptToken,
  parseAcceptToken,
} from '../auth/invite-secret.util';
import { InternalUserSummary, UserServiceClient } from './user-service.client';
import { InvitationEventsService } from './invitation-events.service';
import {
  AlreadyAcceptedException,
  AlreadyMemberException,
  EmailMismatchException,
  InvalidTokenException,
  InvitationCanceledException,
  InvitationNotFoundException,
  InvitationNotPendingException,
  TokenExpiredException,
  VerificationRequiredException,
  LinkPasswordRequiredException,
  LinkPasswordInvalidException,
  LinkAccessDeniedException,
  InvitationForbiddenException,
} from '../common/invitation-exceptions';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { InviteSettingsService } from './invite-settings.service';
import { InviteAccessLevel, InviteSettings } from '../entities/invite-settings.entity';

type AcceptInvitationResult = {
  id: string | null;
  teamId: string;
  teamName?: string;
  companyId?: string;
  invitedEmail: string;
  role: string;
  note?: string | null;
  permissions?: string[];
  status: string;
  token?: string;
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
    accountState: 'existing_account' | 'new_account';
  };
  postAccept: {
    nextStep: 'go_to_team' | 'continue_onboarding';
    reason:
      | 'existing_user_completed_onboarding'
      | 'existing_user_needs_onboarding';
    suggestedPath?: string;
    teamId: string;
  };
};

export type InvitationPreview = {
  companyId: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  inviterName: string | null;
  inviterUsername: string | null;
  role: string;
  /** Granular permission-role ids (select-permissions-panel.tsx) the inviter
   * assigned. This is the actual access-control grant. `role` is the legacy
   * admin/editor/viewer field kept for back-compat and is no longer what the
   * invite UI lets the inviter choose. */
  permissions: string[];
  expiresAt: Date;
  status: string;
  /**
   * Whether accepting will ask for the Link Settings password. False for a
   * per-invitation accept token, which is never password-gated — only the
   * shared link is.
   */
  requiresPassword: boolean;
};

/** Whoever is making the request, as the gateway hands them over. */
type Actor = { id: string; email?: string | null };

/** A resend taken but not yet sent (R3-09). */
type HeldResend = { id: string; held: true; sendAt: Date };

/**
 * R3-12's row-action table, as permission-role ids.
 *
 * Administrator "invites and removes members, assigns and changes roles";
 * Coordinator "manages the roster"; Onboarder "handles pending invites". Both
 * Coordinator and Onboarder "cannot change roles", which is the line between
 * the two lists.
 */
const ROSTER_PERMISSIONS = ['administrator', 'coordinator', 'onboarder'] as const;
const ADMIN_PERMISSIONS = ['administrator'] as const;

/** Good enough to flag a chip; the real validation is CreateInvitationsDto. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Signature lifetime for a link whose account has expiry switched off. Long
 * enough to mean "never" in practice, finite so a token still carries one.
 */
const NEVER_EXPIRES_MS = 100 * 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly expHours: number;
  private readonly appBaseUrl: string;

  /**
   * Resends being held before they go out, keyed by invitation id (R3-09).
   *
   * In process, not in a queue, and deliberately so: the hold is a handful of
   * seconds whose only job is to give Undo something to cancel, and a dropped
   * hold on restart simply means the resend never went — the safe direction,
   * since the invitation and its old link are untouched until the timer
   * fires. The caveat is that Undo has to reach the same instance that took
   * the resend; with one instance per environment today that holds, and the
   * endpoint reports `held: false` when it cannot find a hold to cancel.
   */
  private readonly heldResends = new Map<
    string,
    { timer: NodeJS.Timeout; sendAt: number }
  >();

  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
    private readonly config: ConfigService,
    private readonly userService: UserServiceClient,
    private readonly events: InvitationEventsService,
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmq: ClientProxy,
    private readonly identityGate: IdentityVerificationGateClient,
    private readonly inviteSettings: InviteSettingsService,
  ) {
    // R3-03: email invitations are valid for a fixed 30 days (720h). This was
    // 336h (14 days) from QA-180/PMCM-399, which predates the decision.
    // INVITE_EXP_HOURS/INVITE_EXP_DAYS still override it for any deployment
    // that set one explicitly — this only changes the unconfigured default.
    //
    // It governs email invitations only. The copied link's expiry comes from
    // Link Settings instead (R3-02/R3-03), which is why `createInviteLink`
    // no longer reads this.
    const days = config.get('INVITE_EXP_DAYS');
    this.expHours = days
      ? parseInt(days, 10) * 24
      : parseInt(config.get('INVITE_EXP_HOURS') ?? '720', 10);
    this.appBaseUrl = config.get('APP_BASE_URL') ?? 'http://localhost:3000';
  }

  private buildAcceptResponse(
    invitation: {
      id: string | null;
      teamId: string;
      teamName?: string;
      companyId?: string;
      invitedEmail: string;
      role: string;
      note?: string | null;
      permissions?: string[];
      status: string;
      token?: string;
      expiresAt: Date;
      createdByUserId: string;
      acceptedAt: Date;
      canceledAt?: Date | null;
      resentCount: number;
    },
    userSummary: InternalUserSummary,
    wasOnboarded: boolean = false,
  ): AcceptInvitationResult {
    const hasCompleted = wasOnboarded;

    return {
      ...invitation,
      canceledAt: invitation.canceledAt ?? null,
      acceptedUser: {
        id: userSummary.id,
        email: userSummary.email,
        role: userSummary.role,
        onboardingDismissed: userSummary.onboardingDismissed,
        hasCompletedOnboarding: hasCompleted,
        accountState: wasOnboarded ? 'existing_account' : 'new_account',
      },
      postAccept: {
        nextStep: hasCompleted ? 'go_to_team' : 'continue_onboarding',
        reason: hasCompleted
          ? 'existing_user_completed_onboarding'
          : 'existing_user_needs_onboarding',
        suggestedPath: hasCompleted ? '/my-team' : undefined,
        teamId: invitation.teamId,
      },
    };
  }

  private normalizeInvitationNote(note?: string): string | null {
    if (typeof note !== 'string') return null;
    const trimmed = note.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Mints a Copy Link invitation.
   *
   * The link's expiry comes from the account's Link Settings, not from the
   * email-invitation window (R3-02/R3-03: "the copied link follows the Link
   * Settings expiration"). With expiry switched off the link never expires,
   * like Slack's "never expires" option — expressed here as a far-future
   * signature expiry, because the real decision is made again at accept time
   * against whatever the settings say then.
   *
   * Access level and password are not baked into the token at all. They are
   * read live in `accept`, so turning a link off, or putting a password on
   * it, takes effect on links people are already holding. That is what
   * "saves immediately" has to mean for a control whose whole purpose is to
   * govern a URL that has already left the building.
   */
  async createInviteLink(
    dto: CreateInviteLinkDto,
    creator: { id: string; email: string },
    team: { id: string; name: string },
  ) {
    const settings = await this.inviteSettings.get(dto.teamId);
    const issuedAt = Date.now();
    const deadline = this.inviteSettings.resolveLinkDeadline(settings, issuedAt);

    // The signature needs some expiry of its own; "never" is a hundred
    // years. The live check in accept() can then shorten it to whatever the
    // settings say at the time — it cannot extend past the signature, so
    // lengthening the window later does not revive a token whose signature
    // has already lapsed. Shortening, which is the direction that matters
    // for turning a link off, applies immediately.
    const signatureExp = deadline ?? issuedAt + NEVER_EXPIRES_MS;
    const expiresAt = deadline ? new Date(deadline) : null;

    const token = generateInviteLinkToken({
      teamId: dto.teamId,
      companyId: dto.companyId,
      role: dto.role,
      teamName: team.name,
      invitedBy: creator.id,
      invitedByEmail: creator.email,
      exp: signatureExp,
    });

    return {
      teamId: dto.teamId,
      companyId: dto.companyId,
      teamName: team.name,
      role: dto.role,
      status: 'pending' as const,
      token,
      expiresAt,
      requiresPassword: this.inviteSettings.isPasswordRequired(settings),
      accessLevel: this.inviteSettings.effectiveAccessLevel(settings),
      url: `${this.appBaseUrl}/invite/accept?token=${encodeURIComponent(token)}`,
    };
  }

  /**
   * Applies Link Settings to somebody arriving on an invite link.
   *
   * Runs on the link path only. A per-invitation accept token is already a
   * secret addressed to one person, and the settings describe the shared
   * link, so gating a direct invitation behind the link password would lock
   * out the very people who were invited by name.
   */
  private async assertLinkSettingsAllow(
    settings: InviteSettings,
    linkPayload: { teamId: string; companyId?: string; iat?: number; exp: number },
    arrival: { id: string; email: string },
    linkPassword?: string,
  ): Promise<void> {
    // Expiry, measured from when the link was minted. Tokens predating `iat`
    // fall back to their own `exp`, which verifyInviteLinkToken has already
    // enforced, so they are simply left alone here.
    if (linkPayload.iat) {
      const deadline = this.inviteSettings.resolveLinkDeadline(
        settings,
        linkPayload.iat,
      );
      if (deadline && Date.now() > deadline) {
        throw new TokenExpiredException();
      }
    }

    switch (this.inviteSettings.effectiveAccessLevel(settings)) {
      case InviteAccessLevel.OWNER_ONLY:
        // "Works for nobody but the account owner, so it is effectively off."
        if (arrival.id !== linkPayload.teamId) throw new LinkAccessDeniedException();
        break;
      case InviteAccessLevel.INVITED_GUESTS: {
        // "Works only for emails that already have a pending invitation."
        const pending = await this.repo
          .createQueryBuilder('i')
          .where('i.teamId = :teamId', { teamId: linkPayload.teamId })
          .andWhere('LOWER(i.invitedEmail) = LOWER(:email)', { email: arrival.email })
          .andWhere('i.status = :status', { status: InvitationStatus.PENDING })
          .getOne();
        if (!pending) throw new LinkAccessDeniedException();
        break;
      }
      case InviteAccessLevel.ANYONE:
      default:
        break;
    }

    if (this.inviteSettings.isPasswordRequired(settings)) {
      if (!linkPassword) throw new LinkPasswordRequiredException();
      const ok = await this.inviteSettings.verifyPassword(settings, linkPassword);
      if (!ok) throw new LinkPasswordInvalidException();
    }
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
          // This only runs for a request that already cleared
          // GatewayAuthGuard with a valid JWT, so the invitee has live
          // credentials, so a lazily-created row here must not default to
          // hasPassword: false, or every EMAIL-provider user whose
          // user-service profile hadn't been synced yet gets wrongly
          // prompted to "create a password" they already have (bugfix:
          // this was pinning hasPassword false on every such row, and
          // syncFromAuth's upsert then preserves that false forever since
          // future syncs only set it when explicitly true).
          await this.userService.syncUserProfile({
            id: invitee.id,
            email: invitee.email,
            hasPassword: true,
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
    const permissions = dto.permissions ?? [];

    // "Allow Notification Alerts" (R3-02): invitees who already have an
    // account get the in-app card as well as the email. Read once for the
    // whole batch — it is an account-wide setting and cannot change mid-send.
    const settings = await this.inviteSettings.get(dto.teamId);
    const notifyInApp = settings.notificationAlerts;

    // Resolve the company name once so the notification email shows a real
    // name instead of the raw team/company UUID.
    let companyName: string | undefined;
    if (dto.companyId) {
      try {
        const company = await this.userService.getCompany(dto.companyId);
        companyName = company.name;
      } catch {
        this.logger.warn(`Could not resolve company name for ${dto.companyId}; falling back to teamId in email copy`);
      }
    }

    // Inviter display name + avatar for the branded invitation email. Best
    // effort: a user-service hiccup must not block the invite, the template
    // falls back to the inviter's email and an initials avatar.
    let inviterName: string | undefined;
    let inviterAvatarUrl: string | undefined;
    let inviterUsername: string | undefined;
    try {
      const profile = await this.userService.getUserSummary(inviter.id);
      inviterName =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') || undefined;
      inviterAvatarUrl = profile.avatarUrl;
      inviterUsername = profile.username;
    } catch {
      this.logger.warn(`Could not resolve inviter profile for ${inviter.id}; email will fall back to their email address`);
    }

    for (const email of dto.emails) {
      // Doc workflow step 4: duplicate prevention against active company
      // membership. Only runs when a company is attached, because legacy
      // team-only invites have nothing to check this against.
      if (dto.companyId) {
        const existingMember = await this.userService
          .getCompanyMemberByEmail(dto.companyId, email)
          .catch(() => null);
        if (existingMember) {
          // Per-item rejection, not a thrown exception. A batch invite of
          // several emails must not abort for the whole request just
          // because one recipient already belongs to the company.
          results.push({
            email,
            error: 'ALREADY_MEMBER',
            message: `${email} is already a member of this company`,
          });
          continue;
        }
      }

      // Doc workflow step 5: duplicate prevention against a pending invite.
      const existing = await this.repo.findOne({
        where: { teamId: dto.teamId, invitedEmail: email, status: InvitationStatus.PENDING },
      });

      if (existing) {
        results.push({ ...existing, alreadyInvited: true });
        continue;
      }

      const secret = generateInviteSecret();
      const tokenHash = await hashInviteSecret(secret);
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + this.expHours * 60 * 60 * 1000);

      const inv = await this.repo.save(
        this.repo.create({
          teamId: dto.teamId,
          companyId: dto.companyId,
          invitedEmail: email,
          role: dto.role,
          note: normalizedNote ?? undefined,
          permissions,
          tokenHash,
          expiresAt,
          createdByUserId: inviter.id,
          createdByEmail: inviter.email,
        }),
      );

      const acceptToken = buildAcceptToken(inv.id, secret);
      const acceptUrl = `${this.appBaseUrl}/invite/accept?token=${acceptToken}`;

      this.rabbitmqEmailDispatch({
        to: email,
        teamName: companyName ?? dto.teamId,
        role: dto.role,
        acceptUrl,
        inviterEmail: inviter.email,
        inviterName,
        inviterAvatarUrl,
        note: normalizedNote ?? undefined,
      });

      this.events.created(inv.id, dto.teamId, dto.companyId, email, dto.role);

      this.notifyInviter(inviter, email, dto.teamId, permissions);

      // In-app notification to invitee if they are an existing registered user
      try {
        const inviteeUser = notifyInApp
          ? await this.userService.getUserSummaryByEmail(email).catch(() => null)
          : null;

        if (inviteeUser?.id) {
          this.notifyInviteeOnInvite(inviteeUser, inviter, {
            invitationId: inv.id,
            acceptUrl,
            teamName: companyName ?? 'external team',
            role: dto.role,
            inviterUsername,
            inviterName,
            inviterAvatarUrl,
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not dispatch in-app notification to invitee ${email}: ${err?.message ?? err}`,
        );
      }

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
        this.rabbitmq.emit('notification.email.project_shared', {
          to: email,
          sharerName,
          projectTitle: dto.projectTitle,
          projectUrl: dto.projectUrl,
          note,
        });
        this.logger.log(`[ShareProject] Link email queued: to=${email}`);
        results.push({ email, sent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[ShareProject] Failed to queue link email: to=${email} error=${message}`,
        );
        results.push({ email, sent: false });
      }
    }
    return { success: true, results };
  }

  /** notification.email.team_invitation, consumed by notification-service's
   * email worker (notification.service.ts sendTeamInvitationEmail). This is
   * the single email path now; the old duplicate direct-Brevo send in this
   * method has been removed. */
  private rabbitmqEmailDispatch(payload: {
    to: string;
    teamName: string;
    role: string;
    acceptUrl: string;
    inviterEmail: string;
    inviterName?: string;
    inviterAvatarUrl?: string;
    note?: string;
  }): void {
    this.rabbitmq.emit('notification.email.team_invitation', payload);
  }

  /** notification.email.invitation_accepted, consumed by notification-service's
   * email worker (notification.service.ts sendInvitationAcceptedEmail). Typed
   * here so the payload the consumer destructures can't drift silently:
   * ClientProxy.emit itself accepts anything. */
  private rabbitmqAcceptedEmailDispatch(payload: {
    to: string;
    companyName: string;
    companyLogoUrl?: string;
    memberCount?: number;
    inviteeName?: string;
    inviteeEmail: string;
    inviteMoreUrl: string;
    launchUrl: string;
  }): void {
    this.rabbitmq.emit('notification.email.invitation_accepted', payload);
  }

  /**
   * Describes what an invitation actually grants, for user-facing copy.
   *
   * `role` must never appear in anything a person reads. The invite dialog
   * has had no role picker since the permissions panel replaced it, so the
   * field is always the DTO's `viewer` default — which is how the inviter's
   * notification came to tell people they had invited a Hiring Manager and a
   * Negotiator "as viewer". Permissions are the real grant; with none, the
   * sentence simply does without.
   */
  private describeGrant(permissions?: string[]): string | null {
    const names = (permissions ?? [])
      .filter(Boolean)
      .map((id) =>
        id
          .split('-')
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
          .join(' '),
      );
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.length} roles`;
  }

  /** In-app notification to the inviter confirming the invite was sent. */
  private notifyInviter(
    inviter: { id: string; email: string },
    invitedEmail: string,
    teamId: string,
    permissions: string[],
  ): void {
    const grant = this.describeGrant(permissions);
    this.rabbitmq.emit('notification.send', {
      recipientId: inviter.id,
      recipientEmail: inviter.email,
      category: 'teams',
      event: 'invitation.sent',
      title: `Invitation sent to ${invitedEmail}`,
      body: grant
        ? `You've invited ${invitedEmail} to join your team as ${grant}`
        : `You've invited ${invitedEmail} to join your team`,
      link: `${this.appBaseUrl}/my-team`,
      metadata: { invitedEmail, teamId, permissions },
      delivery: { inApp: true, email: false },
    });
  }

  /** In-app notification to the invitee when an invite is created for an existing user. */
  private notifyInviteeOnInvite(
    invitee: { id: string; email: string },
    inviter: { id: string; email: string },
    details: {
      invitationId: string;
      acceptUrl: string;
      teamName: string;
      role: string;
      inviterUsername?: string;
      inviterName?: string;
      inviterAvatarUrl?: string;
    },
  ): void {
    const inviterHandle = details.inviterUsername
      ? `@${details.inviterUsername}`
      : details.inviterName
        ? details.inviterName
        : inviter.email;

    const teamDescription =
      details.teamName && details.teamName !== 'external team'
        ? `join their team at ${details.teamName}`
        : `join their external team`;

    this.rabbitmq.emit('notification.send', {
      recipientId: invitee.id,
      recipientEmail: invitee.email,
      category: 'team',
      event: 'team.invitation.received',
      title: 'New Offer',
      body: `${inviterHandle} invited you to ${teamDescription}`,
      link: details.acceptUrl,
      metadata: {
        invitationId: details.invitationId,
        acceptUrl: details.acceptUrl,
        inviterId: inviter.id,
        inviterUsername: details.inviterUsername,
        inviterName: details.inviterName,
        avatarUrl: details.inviterAvatarUrl,
        teamName: details.teamName,
        role: details.role,
        ctaLabel: 'View Invite',
        badgeIcon: 'briefcase',
      },
      delivery: { inApp: true, email: false },
    });
  }

  /** notification.email.invitation_accepted, the inviter's copy of the good
   * news, sent once an invitee joins. Mirrors rabbitmqEmailDispatch (the
   * invitee's copy); notification-service owns the rendering.
   *
   * Best effort by design: this runs after the invitation is already accepted
   * and the roster written, so a failed lookup here must never surface as a
   * failed accept. Every error is logged and swallowed. */
  private async emailInviterOnAccept(params: {
    inviterUserId: string;
    inviterEmail?: string;
    invitee: { id: string; email: string };
    companyId?: string;
    fallbackCompanyName: string;
  }): Promise<void> {
    try {
      const inviterPromise = (async () => {
        try {
          return await this.userService.getUserSummary(params.inviterUserId);
        } catch {
          if (params.inviterEmail) {
            return await this.userService.getUserSummaryByEmail(params.inviterEmail).catch(() => null);
          }
          return null;
        }
      })();

      const [inviter, invitee, company, memberCount] = await Promise.all([
        inviterPromise,
        this.userService.getUserSummary(params.invitee.id).catch(() => null),
        params.companyId
          ? this.userService.getCompany(params.companyId).catch(() => null)
          : Promise.resolve(null),
        params.companyId
          ? this.userService.getCompanyMemberCount(params.companyId).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);

      const destinationEmail = inviter?.email || params.inviterEmail;
      if (!destinationEmail) {
        this.logger.warn(
          `Skipping invite-accepted email: no email on inviter ${params.inviterUserId}`,
        );
        return;
      }

      const inviteeName = invitee
        ? [invitee.firstName, invitee.lastName].filter(Boolean).join(' ') || undefined
        : undefined;

      this.rabbitmqAcceptedEmailDispatch({
        to: destinationEmail,
        companyName: company?.name ?? params.fallbackCompanyName,
        companyLogoUrl: company?.logoUrl,
        memberCount,
        inviteeName,
        inviteeEmail: params.invitee.email,
        // Team management is where both actions land: it holds the roster and
        // the invite window. No company-scoped launch route exists yet.
        inviteMoreUrl: `${this.appBaseUrl}/my-team`,
        launchUrl: `${this.appBaseUrl}/my-team`,
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to dispatch invite-accepted email to inviter ${params.inviterUserId}: ${err?.message ?? err}`,
      );
    }
  }

  /** In-app notification to the inviter once an invite is accepted.
   *
   * The invitee deliberately gets nothing here. The only invite notification
   * they should see is the "New Offer" card from notifyInviteeOnInvite; a
   * follow-up "You've joined ..." is redundant to the person who just clicked
   * accept. Note this has to be an emit that never happens rather than
   * `delivery.inApp: false`. The notification service persists every payload it
   * dispatches and only gates the realtime push, so a suppressed-delivery
   * notification would still list in the panel and still count as unread. */
  private notifyAccepted(invitee: { id: string; email: string }, updated: Invitation): void {
    const grant = this.describeGrant(updated.permissions);
    this.rabbitmq.emit('notification.send', {
      recipientId: updated.createdByUserId,
      category: 'teams',
      event: 'invitation.accepted_by_invitee',
      title: `${invitee.email} accepted your invitation`,
      body: grant
        ? `${invitee.email} has joined your team as ${grant}`
        : `${invitee.email} has joined your team`,
      link: `/my-team`,
      metadata: { teamId: updated.teamId, acceptedByEmail: invitee.email, invitationId: updated.id },
      delivery: { inApp: true, email: false },
    });
  }

  async list(dto: ListInvitationsDto) {
    const qb = this.repo.createQueryBuilder('i').orderBy('i.createdAt', 'DESC');

    if (dto.teamId) qb.andWhere('i.teamId = :teamId', { teamId: dto.teamId });
    if (dto.companyId) qb.andWhere('i.companyId = :companyId', { companyId: dto.companyId });
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
    if (!inv) throw new InvitationNotFoundException();
    return inv;
  }

  /**
   * `list` for an external caller, scoped to what they may see.
   *
   * The raw `list` stays unauthorised on purpose: CompanyInvitationsController
   * reaches it behind CompanyContextGuard, which has already established
   * membership of the company being listed, and re-deriving that here would
   * be a second round trip to user-service for an answer already in hand.
   */
  async listFor(dto: ListInvitationsDto, actor: Actor) {
    // "Which invitations are addressed to me?" — the sign-in banner and the
    // accept page ask this by email alone, and legitimately across teams:
    // an invitee is by definition not a member of the team that invited
    // them. Allowed only for the caller's own address, so it cannot be used
    // to ask who else has been invited.
    const ownEmail =
      !!dto.invitedEmail &&
      !!actor.email &&
      dto.invitedEmail.trim().toLowerCase() === actor.email.trim().toLowerCase();
    if (ownEmail) return this.list(dto);

    // A request naming neither a team nor a company is asking for "my
    // invitations", so scope it to the caller rather than refusing it. It
    // used to return every invitation in the system, which is the behaviour
    // actually worth removing here — refusing the call instead just breaks
    // the caller while leaving nothing safer in its place.
    const scoped: ListInvitationsDto =
      !dto.teamId && !dto.companyId ? { ...dto, teamId: actor.id } : dto;

    await this.assertCanActOnTeam(scoped.teamId, scoped.companyId, actor);
    return this.list(scoped);
  }

  /** `getOne` for an external caller, under the R3-12 rule. */
  async getOneFor(id: string, actor: Actor): Promise<Invitation> {
    const inv = await this.getOne(id);
    await this.assertCanManageInvitation(inv, actor, ROSTER_PERMISSIONS);
    return inv;
  }

  /**
   * Does the actual resend. Split out from `resend` so a held resend (R3-09)
   * has something to call when its timer fires, with no authorisation or
   * hold logic in the way — both already happened when the hold was taken.
   */
  private async performResend(id: string): Promise<Invitation> {
    const inv = await this.getOne(id);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new InvitationNotPendingException('Can only resend pending invitations');
    }

    // Mint a new secret + hash so the old link stops working, and reset
    // expiry. This is the doc's "invalidates old token" step.
    const secret = generateInviteSecret();
    inv.tokenHash = await hashInviteSecret(secret);
    inv.token = undefined;
    inv.expiresAt = new Date();
    inv.expiresAt.setTime(inv.expiresAt.getTime() + this.expHours * 60 * 60 * 1000);
    inv.resentCount += 1;
    await this.repo.save(inv);

    const acceptToken = buildAcceptToken(inv.id, secret);

    // Resends must carry the same branding as the original send: resolve the
    // company name and the original inviter, best effort.
    const [company, inviter] = await Promise.all([
      inv.companyId ? this.userService.getCompany(inv.companyId).catch(() => null) : null,
      inv.createdByUserId
        ? this.userService.getUserSummary(inv.createdByUserId).catch(() => null)
        : null,
    ]);

    this.rabbitmqEmailDispatch({
      to: inv.invitedEmail,
      teamName: company?.name ?? inv.teamName ?? inv.teamId,
      role: inv.role,
      acceptUrl: `${this.appBaseUrl}/invite/accept?token=${acceptToken}`,
      inviterEmail: inviter?.email ?? '',
      inviterName: inviter
        ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || undefined
        : undefined,
      inviterAvatarUrl: inviter?.avatarUrl,
      note: inv.note,
    });

    this.events.resent(inv.id, inv.teamId, inv.companyId, inv.invitedEmail);

    // In-app notification to invitee if they are an existing registered user,
    // subject to the same "Allow Notification Alerts" setting as the original
    // send.
    try {
      const settings = await this.inviteSettings.get(inv.teamId);
      const inviteeUser = settings.notificationAlerts
        ? await this.userService
            .getUserSummaryByEmail(inv.invitedEmail)
            .catch(() => null)
        : null;

      if (inviteeUser?.id) {
        this.notifyInviteeOnInvite(
          inviteeUser,
          { id: inv.createdByUserId, email: inv.createdByEmail || inviter?.email || '' },
          {
            invitationId: inv.id,
            acceptUrl: `${this.appBaseUrl}/invite/accept?token=${acceptToken}`,
            teamName: company?.name ?? inv.teamName ?? 'external team',
            role: inv.role,
            inviterUsername: inviter?.username,
            inviterName: inviter
              ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || undefined
              : undefined,
            inviterAvatarUrl: inviter?.avatarUrl,
          },
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not dispatch in-app notification on resend to invitee ${inv.invitedEmail}: ${err?.message ?? err}`,
      );
    }

    return inv;
  }

  async cancel(id: string, actor: Actor): Promise<Invitation> {
    const inv = await this.getOne(id);
    await this.assertCanManageInvitation(inv, actor, ROSTER_PERMISSIONS);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new InvitationNotPendingException('Can only cancel pending invitations');
    }
    // A cancel supersedes a resend that has not gone out yet: resending a
    // link and then revoking it in the same breath must not leave a timer
    // about to mail a fresh link for an invitation that no longer exists.
    this.dropHeldResend(id);
    inv.status = InvitationStatus.CANCELED;
    inv.canceledAt = new Date();
    const saved = await this.repo.save(inv);
    this.events.revoked(inv.id, inv.teamId, inv.companyId, inv.invitedEmail);
    return saved;
  }

  /**
   * Resend, optionally held for `holdMs` first (R3-09).
   *
   * With a hold, nothing goes out and nothing on the invitation changes until
   * the timer fires, so the old link and its expiry stay exactly as they were
   * and `undoResend` can drop the whole thing. Once it fires the resend runs
   * normally: new secret, old link dead, fresh 30-day expiry. Gmail's "Undo
   * send", which is the behaviour the decision names.
   *
   * `holdMs` defaults to 0, so a caller that does its own hold — as the
   * invite UI does today, on an 8s toast — keeps the behaviour it has now.
   */
  async resend(
    id: string,
    actor: Actor,
    holdMs = 0,
  ): Promise<Invitation | HeldResend> {
    const inv = await this.getOne(id);
    await this.assertCanManageInvitation(inv, actor, ROSTER_PERMISSIONS);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new InvitationNotPendingException('Can only resend pending invitations');
    }

    if (holdMs <= 0) return this.performResend(id);

    // A second resend while one is held replaces it rather than queueing a
    // second mail.
    this.dropHeldResend(id);

    const sendAt = Date.now() + holdMs;
    const timer = setTimeout(() => {
      this.heldResends.delete(id);
      this.performResend(id).catch((err) =>
        this.logger.error(
          `Held resend for invitation ${id} failed: ${err?.message ?? err}`,
        ),
      );
    }, holdMs);
    // Never keep the process alive for a pending resend.
    timer.unref?.();
    this.heldResends.set(id, { timer, sendAt });

    this.logger.log(`Resend for invitation ${id} held until ${new Date(sendAt).toISOString()}`);
    return { id, held: true, sendAt: new Date(sendAt) };
  }

  /**
   * Undo on "Your invitation has been resent" (R3-09): drop a held resend so
   * nothing goes out and the existing link keeps working.
   *
   * Reports `canceled: false` rather than failing when there is nothing to
   * drop — the resend has already gone, which is exactly what Undo looks like
   * when it arrives late, and the caller has nothing useful to do with an
   * error there.
   */
  async undoResend(id: string, actor: Actor): Promise<{ id: string; canceled: boolean }> {
    const inv = await this.getOne(id);
    await this.assertCanManageInvitation(inv, actor, ROSTER_PERMISSIONS);
    return { id, canceled: this.dropHeldResend(id) };
  }

  private dropHeldResend(id: string): boolean {
    const held = this.heldResends.get(id);
    if (!held) return false;
    clearTimeout(held.timer);
    this.heldResends.delete(id);
    return true;
  }

  /**
   * Change the grant on a pending invitation (R3-10).
   *
   * Administrator only: the roles frame gives Coordinator and Onboarder the
   * roster and pending invites but says both "cannot change roles", so they
   * can resend and cancel this invitation without being able to rewrite what
   * it grants.
   *
   * Pending only. An accepted invitation's grant lives on the company_users
   * row by then, and user-service's member routes own it — rewriting the
   * invitation would change nothing and quietly disagree with the roster.
   */
  async updatePending(
    id: string,
    dto: UpdateInvitationDto,
    actor: Actor,
  ): Promise<Invitation> {
    const inv = await this.getOne(id);
    await this.assertCanManageInvitation(inv, actor, ADMIN_PERMISSIONS);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new InvitationNotPendingException(
        'Can only change the roles on a pending invitation',
      );
    }

    if (dto.permissions !== undefined) inv.permissions = dto.permissions;
    if (dto.role !== undefined) inv.role = dto.role;

    const saved = await this.repo.save(inv);
    this.logger.log(
      `Invitation ${id} permissions updated by ${actor.id}: [${saved.permissions.join(', ')}]`,
    );
    return saved;
  }

  /**
   * Pre-flight duplicate check for the invite field (R3-11).
   *
   * Exactly the two checks `createInvites` runs per address — company
   * membership, then a pending invitation — so a chip can be flagged as it is
   * created rather than at send time. Send still re-runs them: this is a
   * snapshot, and somebody else may invite the same person in between.
   */
  async checkEmails(dto: CheckInvitationsDto, actor: Actor) {
    await this.assertCanActOnTeam(dto.teamId, dto.companyId, actor);

    const results = await Promise.all(
      dto.emails.map(async (email) => {
        const trimmed = email.trim();
        const valid = EMAIL_PATTERN.test(trimmed);
        if (!valid) {
          return { email: trimmed, valid: false, alreadyMember: false, alreadyInvited: false };
        }

        const [member, pending] = await Promise.all([
          dto.companyId
            ? this.userService
                .getCompanyMemberByEmail(dto.companyId, trimmed)
                .catch(() => null)
            : Promise.resolve(null),
          this.repo
            .createQueryBuilder('i')
            .where('i.teamId = :teamId', { teamId: dto.teamId })
            .andWhere('LOWER(i.invitedEmail) = LOWER(:email)', { email: trimmed })
            .andWhere('i.status = :status', { status: InvitationStatus.PENDING })
            .getOne(),
        ]);

        return {
          email: trimmed,
          valid: true,
          alreadyMember: !!member,
          alreadyInvited: !!pending,
        };
      }),
    );

    return { data: results };
  }

  /**
   * R3-12's table, enforced.
   *
   * The account owner and the person who sent the invitation always qualify.
   * Anyone else has to hold one of `allowed` in the company the invitation
   * belongs to. A team-only invitation with no company has no roster to check
   * against, so it stays with the owner and the sender.
   *
   * Before this, `resend` and `cancel` took an id and no actor at all: any
   * signed-in user could cancel any invitation in the system by guessing its
   * id. That is the hole this closes, as much as it is the decision it
   * implements.
   */
  private async assertCanManageInvitation(
    inv: Invitation,
    actor: Actor,
    allowed: readonly string[],
  ): Promise<void> {
    if (actor.id && inv.teamId === actor.id) return;
    if (actor.id && inv.createdByUserId === actor.id) return;

    if (inv.companyId && actor.id) {
      const membership = await this.userService
        .getCompanyMembership(inv.companyId, actor.id)
        .catch(() => null);
      const held = membership?.permissions ?? [];
      if (held.some((p) => allowed.includes(p))) return;
    }

    this.logger.warn(
      `Refused invitation action: actor=${actor.id} invitation=${inv.id} team=${inv.teamId}`,
    );
    throw new InvitationForbiddenException();
  }

  /**
   * The same rule for routes that name a team rather than one invitation.
   */
  private async assertCanActOnTeam(
    teamId: string | undefined,
    companyId: string | undefined,
    actor: Actor,
  ): Promise<void> {
    if (teamId && actor.id === teamId) return;

    if (companyId && actor.id) {
      const isMember = await this.userService
        .checkCompanyMembership(companyId, actor.id)
        .catch(() => false);
      if (isMember) return;
    }

    this.logger.warn(
      `Refused team-scoped invitation action: actor=${actor.id} team=${teamId ?? 'n/a'} company=${companyId ?? 'n/a'}`,
    );
    throw new InvitationForbiddenException();
  }

  async preview(token: string): Promise<InvitationPreview> {
    const inv = await this.resolveInvitationForRead(token);

    if (!inv) {
      const linkPayload = verifyInviteLinkToken(token);
      if (!linkPayload) throw new InvalidTokenException();

      const [company, inviter] = await Promise.all([
        linkPayload.companyId
          ? this.userService.getCompany(linkPayload.companyId).catch(() => null)
          : Promise.resolve(null),
        this.userService.getUserSummary(linkPayload.invitedBy).catch(() => null),
      ]);

      // Link Settings decide both of these, and are read live so a change
      // in the panel shows up on the next preview of a link already copied.
      const linkSettings = await this.inviteSettings.get(linkPayload.teamId);
      const settingsDeadline = linkPayload.iat
        ? this.inviteSettings.resolveLinkDeadline(linkSettings, linkPayload.iat)
        : linkPayload.exp;
      const effectiveExpiry = settingsDeadline ?? linkPayload.exp;

      return {
        companyId: linkPayload.companyId ?? null,
        companyName: company?.name ?? linkPayload.teamName ?? null,
        companyLogoUrl: company?.logoUrl ?? null,
        inviterName: inviter
          ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email
          : linkPayload.invitedByEmail ?? null,
        inviterUsername: inviter?.username ?? null,
        role: linkPayload.role,
        // Invite links don't currently carry granular permissions through
        // the signed token payload. Only the legacy role does.
        permissions: [],
        expiresAt: new Date(effectiveExpiry),
        status:
          settingsDeadline !== null && Date.now() > effectiveExpiry
            ? 'expired'
            : 'pending',
        // So the accept page can ask for the password up front rather than
        // bouncing the arrival off a 401 to find out.
        requiresPassword: this.inviteSettings.isPasswordRequired(linkSettings),
      };
    }

    const [company, inviter] = await Promise.all([
      inv.companyId ? this.userService.getCompany(inv.companyId).catch(() => null) : Promise.resolve(null),
      this.userService.getUserSummary(inv.createdByUserId).catch(() => null),
    ]);

    const isExpired = inv.status === InvitationStatus.PENDING && inv.expiresAt < new Date();

    return {
      companyId: inv.companyId ?? null,
      companyName: company?.name ?? inv.teamName ?? null,
      companyLogoUrl: company?.logoUrl ?? null,
      inviterName: inviter
        ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email
        : inv.createdByEmail ?? null,
      inviterUsername: inviter?.username ?? null,
      role: inv.role,
      permissions: inv.permissions ?? [],
      expiresAt: inv.expiresAt,
      status: isExpired ? 'expired' : inv.status,
      // A per-invitation token is already a secret addressed to one person;
      // the Link Settings password guards the shared link, not this.
      requiresPassword: false,
    };
  }

  /** Resolves a DB-backed invitation (hashed token first, legacy plaintext
   * fallback), or null if the token doesn't match a DB row at all. The
   * caller then tries the HMAC link-token path. Never mutates. */
  private async resolveInvitationForRead(token: string): Promise<Invitation | null> {
    const parsed = parseAcceptToken(token);
    if (parsed) {
      const candidate = await this.repo.findOne({ where: { id: parsed.invitationId } });
      if (candidate?.tokenHash && (await verifyInviteSecret(parsed.secret, candidate.tokenHash))) {
        return candidate;
      }
      return null;
    }
    return this.repo.findOne({ where: { token } });
  }

  /**
   * Asks identity-verification-service for the acting user's gate decision and
   * refuses the action unless it is open. The decision is the owning service's
   * (gate_open = is_verified OR in_grace); nothing is recomputed here. If the
   * decision cannot be obtained the client throws
   * IdentityVerificationUnavailableException - an unanswered gate stays closed.
   * The error carries only this user's own outstanding requirement.
   */
  private async assertVerificationGateOpen(userId: string): Promise<void> {
    const decision = await this.identityGate.checkGate(userId);
    if (decision.gateOpen) return;
    // The client only returns a closed gate that names what is missing (a
    // closed gate reporting 'none' is rejected there as malformed); the
    // 'none' branch narrows the type and keeps this closed if that invariant
    // is ever loosened.
    throw new VerificationRequiredException(
      decision.missingRequirements === 'none' ? 'both' : decision.missingRequirements,
    );
  }

  async accept(dto: AcceptInvitationDto, invitee: { id: string; email: string }): Promise<Invitation | Record<string, any>> {
    // Verification gate G7 (accept an invitation, gated at acceptance). Runs
    // before anything else in this method - token resolution, both roster
    // writes, the status flip, events and emails all follow it - so a blocked
    // acceptance leaves no trace. Both accept routes (/invitations/accept and
    // /v1/invitations/accept) share this one method.
    await this.assertVerificationGateOpen(invitee.id);

    const inv = await this.resolveInvitationForRead(dto.token);

    if (!inv) {
      // Fallback: try to verify as a generic invite link token (HMAC-signed)
      const linkPayload = verifyInviteLinkToken(dto.token);
      if (!linkPayload) {
        throw new InvalidTokenException();
      }

      // Link Settings (R3-02) are enforced here, before any roster write, so
      // a refused arrival leaves nothing behind. Read live rather than from
      // the token: see createInviteLink.
      const linkSettings = await this.inviteSettings.get(linkPayload.teamId);
      await this.assertLinkSettingsAllow(
        linkSettings,
        linkPayload,
        invitee,
        dto.linkPassword,
      );

      // Link-based accept. Add to the team roster via user-service, and
      // to the company roster too when the link carries a company.
      await this.userService
        .addTeamMember({
          teamId: linkPayload.teamId,
          userId: invitee.id,
          role: linkPayload.role,
        })
        .catch(() => null);

      if (linkPayload.companyId) {
        // Not swallowed: a company-scoped link that fails to write the
        // roster must not report success.
        await this.userService.addCompanyMember({
          companyId: linkPayload.companyId,
          userId: invitee.id,
          role: linkPayload.role,
        });
      }

      const priorSummary = await this.userService
        .getUserSummary(invitee.id)
        .catch(() => null);
      const wasOnboarded = priorSummary?.onboardingDismissed === true;

      const updatedUserSummary = await this.getSafeDismissedUserSummary(invitee);

      this.events.accepted(null, linkPayload.teamId, linkPayload.companyId, invitee.email, invitee.id);

      await this.emailInviterOnAccept({
        inviterUserId: linkPayload.invitedBy,
        inviterEmail: linkPayload.invitedByEmail,
        invitee,
        companyId: linkPayload.companyId,
        fallbackCompanyName: linkPayload.teamName ?? linkPayload.teamId,
      });

      return this.buildAcceptResponse({
        id: null,
        teamId: linkPayload.teamId,
        teamName: linkPayload.teamName,
        companyId: linkPayload.companyId,
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
      }, updatedUserSummary, wasOnboarded);
    }

    if (inv.status === InvitationStatus.CANCELED) throw new InvitationCanceledException();
    if (inv.status === InvitationStatus.ACCEPTED) throw new AlreadyAcceptedException();
    if (inv.status !== InvitationStatus.PENDING) throw new InvalidTokenException();
    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.repo.save(inv);
      throw new TokenExpiredException();
    }
    if (inv.invitedEmail.toLowerCase() !== invitee.email.toLowerCase()) {
      throw new EmailMismatchException();
    }

    // Company roster write happens BEFORE the status flip is persisted, and
    // is not swallowed: if it throws, nothing about this invitation has
    // been mutated yet, so there's nothing to roll back. (The legacy team
    // roster write below stays best-effort, as it did before, because every
    // invitation has a teamId, so making it hard-fail would break existing
    // team-only invites that predate the company model.)
    if (inv.companyId) {
      await this.userService.addCompanyMember({
        companyId: inv.companyId,
        userId: invitee.id,
        role: inv.role,
        permissions: inv.permissions,
      });
    }

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
      throw new InvitationNotFoundException();
    }

    const priorSummary = await this.userService
      .getUserSummary(invitee.id)
      .catch(() => null);
    const wasOnboarded = priorSummary?.onboardingDismissed === true;

    const updatedUserSummary = await this.getSafeDismissedUserSummary(invitee);

    this.events.accepted(updated.id, updated.teamId, updated.companyId, invitee.email, invitee.id);

    // Publish notification to invitee: they've accepted and joined the team
    this.notifyAccepted(invitee, updated);

    // ...and the inviter gets an email confirming their invite was accepted.
    await this.emailInviterOnAccept({
      inviterUserId: updated.createdByUserId,
      inviterEmail: updated.createdByEmail,
      invitee,
      companyId: updated.companyId,
      fallbackCompanyName: updated.teamName ?? updated.teamId,
    });

    return this.buildAcceptResponse(
      {
        ...updated,
        acceptedAt: updated.acceptedAt ?? new Date(),
      },
      updatedUserSummary,
      wasOnboarded,
    );
  }
}
