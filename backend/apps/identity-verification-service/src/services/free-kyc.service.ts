import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { resolveCallbackOrigin } from '../common/config/frontend-origin';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import { ProcessedWebhookEvent } from '../entities/processed-webhook-event.entity';
import {
  AttemptOutcome,
  HostedKycSessionPurpose,
  HostedKycSessionStatus,
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../entities/enums/identity-verification.enums';
import {
  HOSTED_BIOMETRIC_SESSION_PROVIDER,
  HostedBiometricSessionProvider,
} from '../providers/biometric-session/hosted-biometric-session-provider.interface';
import {
  AmbiguousVendorOutcomeError,
  HostedSessionNotFoundError,
  InvalidSessionCreationRequestError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from '../providers/biometric-session/hosted-biometric-session.errors';
import type { HostedSessionDecisionSummary } from '../providers/biometric-session/hosted-biometric-session-provider.interface';
import { verifyDiditWebhookSignatureV2 } from '../providers/webhooks/didit-webhook-signature-v2';
import {
  parseDiditWebhookEvent,
  verifyDiditWebhookTimestamp,
} from '../providers/webhooks/didit-webhook-verification';
import {
  ExpiredOrInvalidDiditWebhookTimestampError,
  InvalidDiditWebhookSignatureError,
  MalformedDiditWebhookEventError,
} from '../providers/webhooks/didit-webhook-verification.errors';
import { assertDiditHostedUrl, InvalidHostedUrlError } from '../common/utils/validate-didit-hosted-url';
import { getAccountWideAttemptCount, RETRY_LIMIT } from '../common/attempt-limit/account-wide-attempt-count';
import {
  getHostedKycCycleAttemptCount,
  hasFailedFinalCooldownElapsed,
  HostedKycCycleRepositories,
} from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import {
  HomeCountryConfirmationRequiredException,
  KycReconciliationUnavailableException,
  InvalidWebhookSignatureException,
  KycNotStartableException,
  RetryLimitExceededException,
  UnknownKycSessionException,
  VendorOutcomeUnknownException,
  VendorStageUnavailableException,
} from '../common/errors/domain-exceptions';
import { isUnfinishedSessionResumable } from '../common/status/unfinished-session-resumability';
import { HomeCountryConfirmationReason } from '../common/errors/kyc-error-reasons';
import { expireTravelModeIfDue, travelModeBlocksNewSession } from '../common/travel-mode/travel-mode-state';
import { clearPendingRelocation, hasPendingHomeCountryChange } from '../common/home-country-change/home-country-change';
import {
  NOTIFICATION_EVENT_PUBLISHER,
  NotificationEventPublisher,
} from '../events/notification-event-publisher.interface';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';
import { HomeCountryUpdatedNotificationPublisher } from '../events/home-country-updated-notification.publisher';

// A NEW hosted session requires verified location, travel mode off and a
// home-country confirmation no older than this. Resuming an already-created
// active session requires none of them (see startOrResume).
export const HOME_COUNTRY_CONFIRMATION_WINDOW_MS = 15 * 60 * 1000;

const ACTIVE_SESSION_STATUSES = [HostedKycSessionStatus.CREATED, HostedKycSessionStatus.IN_PROGRESS];

// Sessions that have not reached a final decision locally and can therefore be
// reconciled with Didit: the two active statuses plus "in review" (a profile
// waiting in review is not startable, so a lost decision webhook would strand it).
const RECONCILABLE_SESSION_STATUSES = [...ACTIVE_SESSION_STATUSES, HostedKycSessionStatus.IN_REVIEW];

// Fixed, value-free result of POST kyc-sessions/reconcile. The caller re-reads
// the real status from GET /me; this never carries identifiers or statuses.
export type KycReconcileOutcome = 'no_active_session' | 'unchanged' | 'updated';

// Filled inside a transition when the profile newly becomes verified, so the
// IDENTITY_VERIFIED event is published only AFTER that transaction commits and only
// for a real transition (a replay, a duplicate approval or a reconcile of an
// already-verified profile never sets it).
interface IdentityVerifiedSignal {
  verified?: { profileId: string; userId: string };
  // Set only when an approved home-country-change session actually promoted the
  // pending country (never for a replay, a stale session or any other outcome).
  // hostedKycSessionId: the hosted_kyc_sessions row that was promoted (it keys the
  // in-app notification, so one promotion can only ever notify once).
  homeCountryUpdated?: { profileId: string; userId: string; hostedKycSessionId: string };
}

// Didit's documented session statuses (docs.didit.me/integration/
// verification-statuses), exact and case-sensitive. Anything not listed maps
// to undefined and changes nothing — an unknown status can never become
// approved.
export function mapDiditStatusToKycStatus(status: string): HostedKycSessionStatus | undefined {
  switch (status) {
    case 'Not Started':
      return HostedKycSessionStatus.CREATED;
    case 'In Progress':
    case 'Resubmitted':
    case 'Awaiting User':
      return HostedKycSessionStatus.IN_PROGRESS;
    case 'In Review':
      return HostedKycSessionStatus.IN_REVIEW;
    case 'Approved':
      return HostedKycSessionStatus.APPROVED;
    case 'Declined':
      return HostedKycSessionStatus.DECLINED;
    case 'Abandoned':
      return HostedKycSessionStatus.ABANDONED;
    case 'Expired':
      return HostedKycSessionStatus.EXPIRED;
    case 'Kyc Expired':
      return HostedKycSessionStatus.KYC_EXPIRED;
    default:
      return undefined;
  }
}

export interface FreeKycWebhookHeaders {
  signatureV2: string | undefined;
  timestamp: string | undefined;
}

@Injectable()
export class FreeKycService {
  private readonly logger = new Logger(FreeKycService.name);

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(HostedKycSession)
    private readonly sessionRepository: Repository<HostedKycSession>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
    @InjectRepository(PendingVerificationSession)
    private readonly pendingSessionRepository: Repository<PendingVerificationSession>,
    @InjectRepository(IdentityDocument)
    private readonly documentRepository: Repository<IdentityDocument>,
    @InjectRepository(AttemptReservation)
    private readonly reservationRepository: Repository<AttemptReservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(HOSTED_BIOMETRIC_SESSION_PROVIDER)
    private readonly provider: HostedBiometricSessionProvider,
    // Appended last so every earlier constructor position is unchanged. Optional so a
    // missing publisher can never break a verification: the event is a notification,
    // never part of the state change.
    @Optional()
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly events?: NotificationEventPublisher,
    // Appended after `events` for the same reason: no earlier position moves, and a missing
    // publisher can never break an approval. Tells the account holder, in-app, that an
    // approved home-country change was applied.
    @Optional()
    private readonly homeCountryNotifications?: HomeCountryUpdatedNotificationPublisher,
  ) {}

  // ---------------------------------------------------------------------
  // Start / resume
  // ---------------------------------------------------------------------

  /**
   * Returns the Didit-hosted Free KYC URL for the caller, creating a session
   * only when none is active. The VPN/proxy guard runs on the controller
   * route before this is reached. Serialized per profile so a double click or
   * retry can never create two sessions, and Didit's own same-vendor_data
   * reuse backs that up for the resume case.
   */
  async startOrResume(userId: string, returnOrigin?: string): Promise<{ url: string }> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });
    return this.withProfileLock(profile.id, () => this.startOrResumeLocked(profile.id, returnOrigin));
  }

  private async startOrResumeLocked(profileId: string, returnOrigin?: string): Promise<{ url: string }> {
    let profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });

    // Lazy Travel Mode expiry, under the same per-profile lock as the start itself,
    // so the rules below never see a stale raw-active state.
    profile = await expireTravelModeIfDue(this.profileRepository, profile, Date.now(), this.logger);

    // A home-country change is in flight (a different country is pending): the
    // retry runs through the relocation start, which reuses everything below but
    // links the session to the pending country. Never true for first-time or
    // ordinary verification (no pending country).
    if (hasPendingHomeCountryChange(profile)) return this.startHomeCountryChangeLocked(profileId, returnOrigin);

    // Runs under the per-profile advisory lock held by startOrResume, so
    // concurrent starts cannot both leave failed_final or create two sessions.
    profile = await this.endElapsedFailedFinalCooldown(profile);

    this.assertStatusAllowsStart(profile);

    // Ordinary sessions only: a home-country-change session is never resumed (or
    // reconciled as one) by the ordinary start path.
    const active = await this.sessionRepository.findOne({
      where: {
        profileId,
        status: In(ACTIVE_SESSION_STATUSES),
        purpose: HostedKycSessionPurpose.IDENTITY_VERIFICATION,
      },
      order: { createdAt: 'DESC' },
    });

    if (active) {
      // Fallback only: before resuming, ask Didit (server-to-server) whether
      // this stored session already reached a decision — e.g. the signed
      // webhook never arrived. Fails closed; never creates a replacement on
      // any doubt. The webhook remains the primary mechanism.
      await this.reconcileActiveSession(active);
      profile = (await this.profileRepository.findOne({ where: { id: profileId } })) ?? profile;

      if (ACTIVE_SESSION_STATUSES.includes(active.status)) {
        // Still active at Didit. It is resumed only while the home-country
        // confirmation it was started under is current (15 minutes) and no newer
        // confirmation has superseded it; no new confirmation is needed to resume.
        if (
          isUnfinishedSessionResumable({
            confirmedAt: profile.verifiedHomeCountryConfirmedAt,
            sessionConfirmedAt: active.confirmedAt,
            nowMs: Date.now(),
            windowMs: HOME_COUNTRY_CONFIRMATION_WINDOW_MS,
          })
        ) {
          return this.resume(active, returnOrigin);
        }
        // Past the window (or superseded): retire it, then fall through to the
        // new-session rules below, which demand a fresh confirmation (409
        // confirmation_stale otherwise) before any new Didit session is created.
        profile = await this.retireStaleUnfinishedSession(active, profile);
      } else {
        // Decided at Didit: re-apply the start rules to the updated profile
        // (verified / pending review => not startable, no new session;
        // failed_final => limit; failed / unstarted => continue below).
        this.assertStatusAllowsStart(profile);
      }
    }

    this.assertHomeCountryConfirmed(profile, { requireFresh: true });

    // Attempts in the CURRENT retry cycle only: hosted-session attempts since
    // the last final failure or approval. Historical rows stay stored but no
    // longer count once a cycle closes, and legacy document-pipeline rows are
    // never counted here (see common/attempt-limit/hosted-kyc-attempt-cycle.ts).
    const attemptTotal = await getHostedKycCycleAttemptCount(this.cycleRepos(), profileId);
    if (attemptTotal >= RETRY_LIMIT) throw new RetryLimitExceededException();

    return this.createNew(profile, returnOrigin);
  }

  // ---------------------------------------------------------------------
  // Home-country change (PMCM-650)
  // ---------------------------------------------------------------------

  /**
   * Starts (or resumes) the Didit session for a home-country change. Explicit and
   * separate from startOrResume (which still refuses a verified account, and hands
   * a retry here while a claim is pending). Allowed only while a different country
   * is PENDING for an account with a verified home country (see
   * IdentityVerificationService.confirmHomeCountry). The session is stored with
   * purpose HOME_COUNTRY_CHANGE and the pending country it was started for, and the
   * profile is linked to it.
   *
   * It reuses the ordinary identity retry behaviour: the account moves to
   * in_progress when the session is created, a decline makes it failed (third
   * decline: failed_final with the 24-hour cooldown), the attempt cycle is the
   * ordinary one, and the 15-minute confirmation rule applies to the pending
   * confirmation. Approval returns it to verified and promotes the pending country.
   */
  async startHomeCountryChange(userId: string, returnOrigin?: string): Promise<{ url: string }> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });
    return this.withProfileLock(profile.id, () => this.startHomeCountryChangeLocked(profile.id, returnOrigin));
  }

  private async startHomeCountryChangeLocked(profileId: string, returnOrigin?: string): Promise<{ url: string }> {
    let profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });

    profile = await expireTravelModeIfDue(this.profileRepository, profile, Date.now(), this.logger);
    profile = await this.endElapsedFailedFinalCooldown(profile);
    this.assertHomeCountryChangeStartable(profile);

    // The current relocation session, if any. Only the one the profile points
    // at counts, and only while it was started for the country still pending.
    const current = profile.pendingRelocationSessionId
      ? await this.sessionRepository.findOne({ where: { id: profile.pendingRelocationSessionId } })
      : null;
    const linked =
      current &&
      current.purpose === HostedKycSessionPurpose.HOME_COUNTRY_CHANGE &&
      current.pendingHomeCountry === profile.pendingHomeCountry
        ? current
        : null;

    if (linked && RECONCILABLE_SESSION_STATUSES.includes(linked.status)) {
      // Same fail-closed fallback as the ordinary path, before anything is resumed
      // or replaced: it may find the session already decided at Didit.
      await this.reconcileActiveSession(linked);
      profile = (await this.profileRepository.findOne({ where: { id: profileId } })) ?? profile;
      this.assertHomeCountryChangeStartable(profile);

      if (linked.status === HostedKycSessionStatus.IN_REVIEW) {
        // Waiting for Didit's decision: no second session.
        throw new KycNotStartableException({ status: profile.identityVerificationStatus, reason: 'home_country_change_in_review' });
      }
      if (ACTIVE_SESSION_STATUSES.includes(linked.status)) return this.resume(linked, returnOrigin);
    }

    this.assertHomeCountryChangeConfirmationFresh(profile);

    const attemptTotal = await getHostedKycCycleAttemptCount(this.cycleRepos(), profileId);
    if (attemptTotal >= RETRY_LIMIT) throw new RetryLimitExceededException();

    return this.createHomeCountryChangeSession(profile, returnOrigin);
  }

  // A pending country must exist, and the identity status must allow a start under
  // the ordinary rules, except that an already verified account IS allowed here
  // (that is the point of the relocation start). In review, blocked and the
  // failed_final cooldown keep their ordinary answers.
  private assertHomeCountryChangeStartable(profile: IdentityVerificationProfile): void {
    if (!hasPendingHomeCountryChange(profile)) {
      throw new KycNotStartableException({ status: profile.identityVerificationStatus, reason: 'no_home_country_change' });
    }
    if (profile.identityVerificationStatus !== IdentityVerificationStatus.VERIFIED) {
      this.assertStatusAllowsStart(profile);
    }
  }

  // The 15-minute rule, applied to the pending country's own confirmation.
  private assertHomeCountryChangeConfirmationFresh(profile: IdentityVerificationProfile): void {
    const fail = (reason: HomeCountryConfirmationReason): never => {
      throw new HomeCountryConfirmationRequiredException({ reason });
    };
    const confirmedAt = profile.pendingHomeCountryConfirmedAt;
    if (!(confirmedAt instanceof Date) || !Number.isFinite(confirmedAt.getTime())) fail('confirmation_missing');
    // Travel Mode is deliberately not checked: the account keeps it until an approval
    // of this claim's session ends it, so it cannot stand in the way of the claim.
    if (Date.now() - (confirmedAt as Date).getTime() > HOME_COUNTRY_CONFIRMATION_WINDOW_MS) fail('confirmation_stale');
  }

  private async createHomeCountryChangeSession(
    profile: IdentityVerificationProfile,
    returnOrigin?: string,
  ): Promise<{ url: string }> {
    const vendorReference = randomUUID();
    const created = await this.callProvider(vendorReference, returnOrigin);
    const url = this.validatedUrl(created.url);

    const saved = await this.sessionRepository.save(
      this.sessionRepository.create({
        profileId: profile.id,
        diditSessionId: created.sessionId,
        vendorReference,
        status: mapDiditStatusToKycStatus(created.status) ?? HostedKycSessionStatus.CREATED,
        purpose: HostedKycSessionPurpose.HOME_COUNTRY_CHANGE,
        pendingHomeCountry: profile.pendingHomeCountry,
      }),
    );
    // Link the claim to THIS session, and move the account into the ordinary
    // in-progress identity state (as createNew does for any session).
    profile.pendingRelocationSessionId = saved.id;
    if (profile.identityVerificationStatus !== IdentityVerificationStatus.IN_PROGRESS) {
      profile.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS;
    }
    // Starting the home-country update flow resolves the Travel Mode check-in that led here:
    // every check-in due so far is resolved (a later one is not). Opening or abandoning the
    // check-in beforehand resolved nothing; this is the one point where the flow really starts.
    if (profile.travelModeActive) profile.lastTravelReminderSentAt = new Date();
    await this.profileRepository.save(profile);
    return { url };
  }

  /**
   * Lazy cooldown: a failed_final profile becomes eligible the moment its
   * 24-hour cooldown has elapsed, without waiting for the daily 09:00 sweep
   * (which remains as background cleanup and makes the same transition).
   * Before that — or when failed_final_at is missing, invalid or in the future —
   * the profile is returned unchanged, so starting stays blocked with the
   * retry-limit response (fail closed). Only the status is moved back to
   * unstarted; attempt rows are never touched, and the new retry cycle starts
   * empty because the final decline already closed the previous cycle.
   */
  private async endElapsedFailedFinalCooldown(
    profile: IdentityVerificationProfile,
  ): Promise<IdentityVerificationProfile> {
    if (profile.identityVerificationStatus !== IdentityVerificationStatus.FAILED_FINAL) return profile;
    if (!hasFailedFinalCooldownElapsed(profile.failedFinalAt, Date.now())) return profile;

    profile.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED;
    profile.failedFinalAt = null;
    await this.profileRepository.save(profile);
    this.logger.log('failed_final cooldown elapsed — a fresh retry cycle begins.');
    return profile;
  }

  /**
   * Authenticated, user-triggered fallback for a lost or delayed Didit webhook
   * (the signed webhook stays the primary path). The session is resolved
   * server-side from the caller's own stored unfinished session — the browser
   * never supplies a Didit session id. Runs under the same per-profile lock as
   * start/resume, asks Didit for that exact session's decision, validates
   * ownership (session, vendor reference, workflow, environment, application),
   * and applies it through the same transition code as the webhook, so terminal
   * protection, one-attempt-per-decline and idempotency are shared.
   *
   * Fails closed: any vendor failure, ownership or environment mismatch, or
   * unusable status throws a fixed-reason error with NO state change — no
   * replacement session is created and no attempt is consumed. A profile with
   * nothing unfinished (including a terminal local session) is a no-op that
   * does not call Didit.
   */
  async reconcileForUser(userId: string): Promise<{ outcome: KycReconcileOutcome }> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) return { outcome: 'no_active_session' };

    return this.withProfileLock(profile.id, async () => {
      const unfinished = await this.sessionRepository.findOne({
        where: { profileId: profile.id, status: In(RECONCILABLE_SESSION_STATUSES) },
        order: { createdAt: 'DESC' },
      });
      if (!unfinished) return { outcome: 'no_active_session' as const };

      const before = unfinished.status;
      try {
        await this.reconcileActiveSession(unfinished);
      } catch (err) {
        // Same fail-closed behavior and fixed reason, under this action's own
        // stable error code (the start/resume path keeps VENDOR_STAGE_UNAVAILABLE).
        if (err instanceof VendorStageUnavailableException) {
          const details = (err.getResponse() as { details?: Record<string, unknown> }).details;
          throw new KycReconciliationUnavailableException(details);
        }
        throw err;
      }
      return { outcome: unfinished.status === before ? ('unchanged' as const) : ('updated' as const) };
    });
  }

  // ---------------------------------------------------------------------
  // Fallback reconciliation (runs only inside the locked start/resume path)
  // ---------------------------------------------------------------------

  // Statuses a session that has not finished can legitimately be seen in;
  // reconciliation acts only on decisions/endings and leaves these alone.
  private static readonly RECONCILE_NO_CHANGE = new Set<HostedKycSessionStatus>([
    HostedKycSessionStatus.CREATED,
    HostedKycSessionStatus.IN_PROGRESS,
  ]);

  private async reconcileActiveSession(active: HostedKycSession): Promise<void> {
    const decision = await this.fetchDecision(active.diditSessionId);
    this.assertDecisionOwnsSession(active, decision);

    const mapped = mapDiditStatusToKycStatus(decision.status);
    // Unknown status, or "Kyc Expired" on a session we never saw approved, is
    // inconsistent with our record: fail closed rather than guess.
    if (!mapped || mapped === HostedKycSessionStatus.KYC_EXPIRED) {
      this.logger.warn('Session decision carried an unusable status — failing closed.');
      throw new VendorStageUnavailableException({ reason: 'decision_unusable_status' });
    }
    if (FreeKycService.RECONCILE_NO_CHANGE.has(mapped)) return;

    const signal: IdentityVerifiedSignal = {};
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(HostedKycSession).findOne({
        where: { id: active.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) return;
      await this.applyTransition(manager, locked, mapped, null, signal);
      active.status = locked.status;
    });
    await this.publishIdentityVerified(signal);
  }

  // Published after the transaction has committed. A publish failure never fails
  // the webhook or the reconcile (the state change already stands): it is logged
  // with fixed text only. There is no outbox, so a crash between commit and
  // publish can lose the event.
  private async publishIdentityVerified(signal: IdentityVerifiedSignal): Promise<void> {
    if (this.events && signal.verified) {
      try {
        await this.events.publish({
          eventType: IdentityVerificationEventType.IDENTITY_VERIFIED,
          profileId: signal.verified.profileId,
          userId: signal.verified.userId,
          occurredAt: new Date().toISOString(),
        });
      } catch {
        this.logger.warn('identity_verified event publish failed.');
      }
    }
    if (signal.homeCountryUpdated) {
      const promoted = signal.homeCountryUpdated;
      if (this.events) {
        try {
          await this.events.publish({
            eventType: IdentityVerificationEventType.HOME_COUNTRY_UPDATED,
            profileId: promoted.profileId,
            userId: promoted.userId,
            occurredAt: new Date().toISOString(),
          });
        } catch {
          this.logger.warn('home_country_updated event publish failed.');
        }
      }
      // The in-app notification for the account holder, independent of the event above.
      // Set only by promoteApprovedHomeCountryChange, so it is sent for a linked,
      // matching, still-pending approval and nothing else; the key is the session row.
      if (this.homeCountryNotifications) {
        try {
          await this.homeCountryNotifications.homeCountryUpdated({
            userId: promoted.userId,
            hostedKycSessionId: promoted.hostedKycSessionId,
          });
        } catch {
          this.logger.warn('home_country_updated notification hand-off failed.');
        }
      }
    }
  }

  private async fetchDecision(sessionId: string): Promise<HostedSessionDecisionSummary> {
    try {
      return await this.provider.getSessionDecision(sessionId);
    } catch (err) {
      if (err instanceof HostedSessionNotFoundError) {
        // Unknown to Didit: never create a replacement on this evidence.
        this.logger.warn('Session decision lookup: Didit has no such session — failing closed.');
        throw new VendorStageUnavailableException({ reason: 'decision_session_not_found' });
      }
      if (
        err instanceof VendorAuthOrCreditError ||
        err instanceof VendorRateLimitedError ||
        err instanceof VendorTransportError ||
        err instanceof MalformedVendorResponseError ||
        err instanceof AmbiguousVendorOutcomeError
      ) {
        // Timeout, 5xx, malformed body, auth or rate limit: fixed class name
        // only — never the vendor body or any secret.
        this.logger.warn(`Session decision lookup unavailable: ${err.constructor.name}`);
        throw new VendorStageUnavailableException({ reason: err.constructor.name });
      }
      throw err;
    }
  }

  // The decision must demonstrably belong to OUR stored session. Essential
  // fields must be present and equal; `environment` / `application_id` are
  // checked whenever the response carries them. Any conflict or gap fails
  // closed with a fixed reason code (never the values).
  private assertDecisionOwnsSession(active: HostedKycSession, decision: HostedSessionDecisionSummary): void {
    const fail = (reason: string): never => {
      this.logger.warn(`Session decision ownership check failed: ${reason}`);
      throw new VendorStageUnavailableException({ reason });
    };
    if (decision.sessionId !== active.diditSessionId) fail('decision_session_mismatch');
    if (decision.vendorData === null || decision.workflowId === null) fail('decision_missing_field');
    if (decision.vendorData !== active.vendorReference) fail('decision_vendor_data_mismatch');
    if (decision.workflowId !== process.env.DIDIT_FREE_KYC_WORKFLOW_ID) fail('decision_workflow_mismatch');
    if (decision.environment !== null) {
      const expected = process.env.DIDIT_EXPECTED_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
      if (decision.environment !== expected) fail('decision_environment_mismatch');
    }
    const expectedApplicationId = process.env.DIDIT_APPLICATION_ID;
    if (decision.applicationId !== null && expectedApplicationId && decision.applicationId !== expectedApplicationId) {
      fail('decision_application_mismatch');
    }
  }

  private assertStatusAllowsStart(profile: IdentityVerificationProfile): void {
    switch (profile.identityVerificationStatus) {
      case IdentityVerificationStatus.VERIFIED:
      case IdentityVerificationStatus.PENDING:
      case IdentityVerificationStatus.BLOCKED_DUPLICATE:
      case IdentityVerificationStatus.BLOCKED_AGE:
        throw new KycNotStartableException({ status: profile.identityVerificationStatus });
      case IdentityVerificationStatus.FAILED_FINAL:
        throw new RetryLimitExceededException();
      default:
        return;
    }
  }

  // A current, server-recorded home-country confirmation, with no Travel
  // Mode in force (an expired one, or a leftover classification with no
  // duration, is ignored). POST /home-country/confirm sets verifiedHomeCountry, its
  // timestamp and the verified status from a live server-side IP lookup
  // (never a country sent by the frontend).
  private assertHomeCountryConfirmed(
    profile: IdentityVerificationProfile,
    options: { requireFresh: boolean },
  ): void {
    // Fixed reasons only (see common/errors/kyc-error-reasons.ts).
    const fail = (reason: HomeCountryConfirmationReason): never => {
      throw new HomeCountryConfirmationRequiredException({ reason });
    };
    if (profile.locationVerificationStatus !== LocationVerificationStatus.VERIFIED) fail('location_not_verified');
    if (!profile.verifiedHomeCountry || !profile.verifiedHomeCountryConfirmedAt) fail('confirmation_missing');
    if (travelModeBlocksNewSession(profile, Date.now())) {
      fail('travel_mode_active');
    }
    if (options.requireFresh) {
      const age = Date.now() - (profile.verifiedHomeCountryConfirmedAt as Date).getTime();
      if (age > HOME_COUNTRY_CONFIRMATION_WINDOW_MS) fail('confirmation_stale');
    }
  }

  /**
   * Retires an unfinished session whose confirmation window has passed. It ends
   * without a decision, exactly like Didit's own Abandoned: no attempt row is
   * written and abandoned sessions never count toward the retry cycle. The profile
   * returns to unstarted so the next start follows the new-session rules. A decision
   * Didit delivers later (webhook) is still applied; only a decided session is final.
   */
  private async retireStaleUnfinishedSession(
    session: HostedKycSession,
    profile: IdentityVerificationProfile,
  ): Promise<IdentityVerificationProfile> {
    session.status = HostedKycSessionStatus.ABANDONED;
    await this.sessionRepository.save(session);
    if (profile.identityVerificationStatus === IdentityVerificationStatus.IN_PROGRESS) {
      profile.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED;
      await this.profileRepository.save(profile);
    }
    this.logger.log('Unfinished session retired: its home-country confirmation expired.');
    return profile;
  }

  private async resume(active: HostedKycSession, returnOrigin?: string): Promise<{ url: string }> {
    // Didit returns the same unfinished session for the same vendor_data —
    // the hosted URL is never stored here.
    const created = await this.callProvider(active.vendorReference, returnOrigin);
    const url = this.validatedUrl(created.url);

    const mapped = mapDiditStatusToKycStatus(created.status);
    if (created.sessionId !== active.diditSessionId) {
      // Didit issued a different session (e.g. workflow republished): track
      // the current one under the same opaque reference.
      active.diditSessionId = created.sessionId;
      if (mapped) active.status = mapped;
      await this.sessionRepository.save(active);
    }
    return { url };
  }

  private async createNew(profile: IdentityVerificationProfile, returnOrigin?: string): Promise<{ url: string }> {
    const vendorReference = randomUUID();
    const created = await this.callProvider(vendorReference, returnOrigin);
    const url = this.validatedUrl(created.url);

    await this.sessionRepository.save(
      this.sessionRepository.create({
        profileId: profile.id,
        diditSessionId: created.sessionId,
        vendorReference,
        status: mapDiditStatusToKycStatus(created.status) ?? HostedKycSessionStatus.CREATED,
        // The confirmation this session was started under (see unfinished-session-resumability.ts).
        confirmedAt: profile.verifiedHomeCountryConfirmedAt,
      }),
    );

    if (profile.identityVerificationStatus !== IdentityVerificationStatus.IN_PROGRESS) {
      profile.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS;
      await this.profileRepository.save(profile);
    }
    return { url };
  }

  private async callProvider(vendorReference: string, returnOrigin?: string) {
    const workflowId = process.env.DIDIT_FREE_KYC_WORKFLOW_ID;
    if (!workflowId) {
      throw new VendorStageUnavailableException({ reason: 'free_kyc_not_configured' });
    }
    // FRONTEND_URL is a list of origins (live, staging, dev, ...). Didit returns the browser
    // to exactly one of them: the request's own origin, accepted only if it is on that list.
    // Nothing is guessed (never "the first"), and nothing is created before this is settled.
    const callbackOrigin = resolveCallbackOrigin(process.env.FRONTEND_URL, returnOrigin);
    if (!callbackOrigin.ok) {
      if (callbackOrigin.reason === 'not_configured') {
        throw new VendorStageUnavailableException({ reason: 'free_kyc_not_configured' });
      }
      this.logger.warn(`Hosted KYC return origin not accepted: ${callbackOrigin.reason}`);
      throw new BadRequestException(
        callbackOrigin.reason === 'invalid_origin'
          ? { code: 'INVALID_RETURN_ORIGIN', message: 'returnOrigin is not an allowed frontend origin.' }
          : { code: 'RETURN_ORIGIN_REQUIRED', message: 'returnOrigin is required.' },
      );
    }
    try {
      return await this.provider.createKycSession({
        workflowId,
        vendorData: vendorReference,
        callbackUrl: `${callbackOrigin.origin}/talent-dashboard`,
      });
    } catch (err) {
      if (err instanceof AmbiguousVendorOutcomeError) {
        this.logger.warn(`Hosted KYC session outcome unknown (no response received): ${err.constructor.name}`);
        throw new VendorOutcomeUnknownException({ reason: err.constructor.name });
      }
      if (
        err instanceof VendorAuthOrCreditError ||
        err instanceof VendorRateLimitedError ||
        err instanceof VendorTransportError ||
        err instanceof MalformedVendorResponseError ||
        err instanceof InvalidSessionCreationRequestError
      ) {
        // Fixed class name only — never the vendor body or any secret.
        this.logger.warn(`Hosted KYC session unavailable: ${err.constructor.name}`);
        throw new VendorStageUnavailableException({ reason: err.constructor.name });
      }
      throw err;
    }
  }

  private validatedUrl(value: string): string {
    try {
      return assertDiditHostedUrl(value);
    } catch (err) {
      if (err instanceof InvalidHostedUrlError) {
        this.logger.warn('Hosted KYC session returned a URL that failed validation');
        throw new VendorStageUnavailableException({ reason: 'invalid_hosted_url' });
      }
      throw err;
    }
  }

  private async withProfileLock<T>(profileId: string, work: () => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`identity-kyc-start:${profileId}`]);
      const result = await work();
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private attemptRepos(
    manager?: EntityManager,
  ): Parameters<typeof getAccountWideAttemptCount>[0] {
    return {
      attemptRepository: manager ? manager.getRepository(VerificationAttempt) : this.attemptRepository,
      pendingSessionRepository: manager
        ? manager.getRepository(PendingVerificationSession)
        : this.pendingSessionRepository,
      documentRepository: manager ? manager.getRepository(IdentityDocument) : this.documentRepository,
      reservationRepository: manager ? manager.getRepository(AttemptReservation) : this.reservationRepository,
    };
  }

  // Repositories for the hosted-session retry-cycle counter, optionally bound
  // to a transaction. (attemptRepos above is retained for the shared legacy
  // counter; hosted Free KYC no longer uses it for its limit.)
  private cycleRepos(manager?: EntityManager): HostedKycCycleRepositories {
    return {
      sessionRepository: manager ? manager.getRepository(HostedKycSession) : this.sessionRepository,
      attemptRepository: manager ? manager.getRepository(VerificationAttempt) : this.attemptRepository,
    };
  }

  // ---------------------------------------------------------------------
  // Webhook
  // ---------------------------------------------------------------------

  /**
   * The ONLY path that changes verification status from a Didit outcome. A
   * browser redirect never reaches this. Fails closed: no secret configured,
   * or a missing/malformed/stale/invalid X-Signature-V2, rejects with no state
   * change. Idempotent per event_id, ordered per session by event timestamp,
   * and atomic (event record + session + profile change in one transaction).
   */
  async handleWebhook(rawBody: Buffer, headers: FreeKycWebhookHeaders, nowSeconds?: number): Promise<void> {
    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) {
      throw new InvalidWebhookSignatureException({ reason: 'secret_not_configured' });
    }

    try {
      verifyDiditWebhookSignatureV2(rawBody, headers.signatureV2, secret);
      verifyDiditWebhookTimestamp(headers.timestamp, nowSeconds);
    } catch (err) {
      if (err instanceof InvalidDiditWebhookSignatureError) {
        throw new InvalidWebhookSignatureException({ reason: err.reason });
      }
      if (err instanceof ExpiredOrInvalidDiditWebhookTimestampError) {
        throw new InvalidWebhookSignatureException({ reason: 'timestamp' });
      }
      throw err;
    }

    let event;
    try {
      event = parseDiditWebhookEvent(rawBody);
    } catch (err) {
      if (err instanceof MalformedDiditWebhookEventError) {
        throw new BadRequestException('Malformed webhook event.');
      }
      throw err;
    }

    // Only session status changes drive verification status.
    if (event.webhook_type !== 'status.updated') return;

    const expectedApplicationId = process.env.DIDIT_APPLICATION_ID;
    if (expectedApplicationId && event.application_id !== expectedApplicationId) {
      this.logger.warn('Webhook application_id mismatch — ignored.');
      return;
    }
    const expectedEnvironment = process.env.DIDIT_EXPECTED_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
    if (event.environment !== expectedEnvironment) {
      this.logger.warn(`Webhook environment mismatch (got ${event.environment}) — ignored.`);
      return;
    }

    const signal: IdentityVerifiedSignal = {};
    await this.dataSource.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(HostedKycSession);
      const session = await sessionRepository.findOne({
        where: { diditSessionId: event.session_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new UnknownKycSessionException({ sessionId: event.session_id });
      if (event.vendor_data !== null && event.vendor_data !== session.vendorReference) {
        this.logger.warn('Webhook vendor_data does not match the session — ignored.');
        return;
      }

      // Idempotency: the primary key on event_id is the concurrency-safe
      // guard; a second delivery of the same event is a no-op.
      try {
        await manager
          .getRepository(ProcessedWebhookEvent)
          .insert({ eventId: event.event_id, sessionId: event.session_id });
      } catch (err) {
        if ((err as { code?: string }).code === '23505') {
          this.logger.debug('Duplicate webhook event ignored.');
          return;
        }
        throw err;
      }

      // Ordering: only a STRICTLY older event is ignored. Didit timestamps are
      // whole seconds, so two different events (distinct event_id) can share a
      // second; dropping the later one could lose the final decision. True
      // replays are already dropped by event_id above.
      if (session.lastEventTimestamp !== null && event.timestamp < Number(session.lastEventTimestamp)) {
        this.logger.debug('Out-of-order webhook event ignored.');
        return;
      }

      const mapped = mapDiditStatusToKycStatus(event.status);
      if (!mapped) {
        // Unrecognized status: record nothing about the outcome, never approve.
        this.logger.warn('Webhook carried an unrecognized session status — no change applied.');
        return;
      }

      await this.applyTransition(manager, session, mapped, String(event.timestamp), signal);
    });
    await this.publishIdentityVerified(signal);
  }

  /**
   * The single status-transition path, shared by the signed webhook and the
   * fallback reconciliation below: terminal protection (mirroring Didit's
   * documented terminal statuses — Approved, Declined, Kyc Expired "won't
   * change again", apart from an approved session later expiring), then the
   * session row, then the profile outcome incl. one-attempt-per-session
   * accounting. `eventTimestamp` is null for reconciliation, which has no
   * event time and therefore never touches last_event_timestamp.
   */
  private async applyTransition(
    manager: EntityManager,
    session: HostedKycSession,
    status: HostedKycSessionStatus,
    eventTimestamp: string | null,
    signal: IdentityVerifiedSignal,
  ): Promise<boolean> {
    if (this.isBlockedTerminalTransition(session.status, status)) {
      this.logger.debug('Status change would regress a finished session — ignored.');
      return false;
    }
    if (await this.isSupersededOrdinarySession(manager, session)) {
      // A late event for a session that a newer ordinary session has replaced
      // (e.g. one retired after its confirmation window): it is inert. Neither the
      // session row (an APPROVED/DECLINED row would also move the retry cycle), nor
      // the profile, nor the attempt count is touched, so the replacement flow cannot
      // be overwritten or verified by the old session.
      this.logger.warn('Event for a superseded session — ignored.');
      return false;
    }
    session.status = status;
    if (eventTimestamp !== null) session.lastEventTimestamp = eventTimestamp;
    await manager.getRepository(HostedKycSession).save(session);
    await this.applyProfileOutcome(manager, session, status, signal);
    return true;
  }

  /**
   * True when a NEWER ordinary identity session exists for the same profile. The
   * profile row is locked first (the same lock the outcome below takes), so the
   * check and the write are atomic against another transition of this profile.
   * With no replacement the session is still the current one and a late genuine
   * decision applies as it always did. Home-country-change sessions are not judged
   * here (they have their own pending-claim rules).
   */
  private async isSupersededOrdinarySession(manager: EntityManager, session: HostedKycSession): Promise<boolean> {
    if (session.purpose !== undefined && session.purpose !== HostedKycSessionPurpose.IDENTITY_VERIFICATION) return false;
    await manager.getRepository(IdentityVerificationProfile).findOne({
      where: { id: session.profileId },
      lock: { mode: 'pessimistic_write' },
    });
    const latest = await manager.getRepository(HostedKycSession).findOne({
      where: { profileId: session.profileId, purpose: HostedKycSessionPurpose.IDENTITY_VERIFICATION },
      order: { createdAt: 'DESC' },
    });
    if (!latest || latest.id === session.id) return false;
    return latest.createdAt.getTime() > session.createdAt.getTime();
  }

  private isBlockedTerminalTransition(current: HostedKycSessionStatus, next: HostedKycSessionStatus): boolean {
    if (current === next) return false;
    // "Kyc Expired" only ever follows an approval: for any session that was not
    // approved it is inconsistent with our record and must change nothing.
    if (next === HostedKycSessionStatus.KYC_EXPIRED && current !== HostedKycSessionStatus.APPROVED) return true;
    switch (current) {
      case HostedKycSessionStatus.APPROVED:
        return next !== HostedKycSessionStatus.KYC_EXPIRED;
      case HostedKycSessionStatus.DECLINED:
      case HostedKycSessionStatus.KYC_EXPIRED:
        return true;
      default:
        return false;
    }
  }

  private async applyProfileOutcome(
    manager: EntityManager,
    session: HostedKycSession,
    status: HostedKycSessionStatus,
    signal: IdentityVerifiedSignal,
  ): Promise<void> {
    const profileRepository = manager.getRepository(IdentityVerificationProfile);
    // The profile row is locked for the rest of the transaction so cycle
    // counting and the status write are atomic even if two sessions of the same
    // profile are ever processed at once.
    const profile = await profileRepository.findOne({
      where: { id: session.profileId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!profile) return;

    // Approval is the only outcome with a country attached. While a home-country
    // claim is pending, ONLY an approval of the session linked to it (started for
    // that country) counts: it promotes the pending country and then restores
    // verified through the ordinary rules below. An older session, an unrelated
    // ordinary session, a replay after the promotion, or a withdrawn claim
    // changes nothing at all: neither the country nor the verification status.
    // Every other outcome (declines, in progress, in review, abandoned, expired)
    // follows the ordinary identity rules, whatever the session was for.
    if (status === HostedKycSessionStatus.APPROVED) {
      const isRelocation = session.purpose === HostedKycSessionPurpose.HOME_COUNTRY_CHANGE;
      if (hasPendingHomeCountryChange(profile) || isRelocation) {
        if (!this.promoteApprovedHomeCountryChange(profile, session, signal)) {
          this.logger.debug('Approval did not match the pending home-country claim — nothing changed.');
          return;
        }
        // Saved now: the ordinary rules below may return early for a profile that
        // is already verified.
        await profileRepository.save(profile);
      }
    }

    const current = profile.identityVerificationStatus;

    // Once verified, only a KYC-expiry can change the profile; a stale or
    // later non-approval event for another session never downgrades it.
    if (current === IdentityVerificationStatus.VERIFIED && status !== HostedKycSessionStatus.KYC_EXPIRED) return;
    if (
      current === IdentityVerificationStatus.BLOCKED_DUPLICATE ||
      current === IdentityVerificationStatus.BLOCKED_AGE ||
      current === IdentityVerificationStatus.FAILED_FINAL
    ) {
      return;
    }

    switch (status) {
      case HostedKycSessionStatus.APPROVED:
        // Reached only when the profile was not already verified (guarded above),
        // so this is a real transition: announce it once the transaction commits.
        profile.identityVerificationStatus = IdentityVerificationStatus.VERIFIED;
        // A successful (re-)verification ends any renewal window (TRVG2 §2.7).
        profile.expiredAt = null;
        signal.verified = { profileId: profile.id, userId: profile.userId };
        break;
      case HostedKycSessionStatus.DECLINED: {
        const attemptRepository = manager.getRepository(VerificationAttempt);
        const alreadyCounted = await attemptRepository.findOne({ where: { vendorSessionId: session.diditSessionId } });
        if (!alreadyCounted) {
          // Attempts already used in the current retry cycle (this session's own
          // row does not exist yet, so it is not counted).
          const before = await getHostedKycCycleAttemptCount(this.cycleRepos(manager), profile.id);
          await attemptRepository.insert({
            profileId: profile.id,
            documentId: null,
            vendorSessionId: session.diditSessionId,
            attemptMethod: null,
            attemptDocumentType: null,
            attemptOutcome: AttemptOutcome.REJECTED,
            failureCode: 'kyc_declined',
            attemptNumber: Math.min(before + 1, RETRY_LIMIT),
          });
          if (before + 1 >= RETRY_LIMIT) {
            profile.identityVerificationStatus = IdentityVerificationStatus.FAILED_FINAL;
            profile.failedFinalAt = new Date();
          } else {
            profile.identityVerificationStatus = IdentityVerificationStatus.FAILED;
          }
        }
        break;
      }
      case HostedKycSessionStatus.IN_REVIEW:
        profile.identityVerificationStatus = IdentityVerificationStatus.PENDING;
        break;
      case HostedKycSessionStatus.CREATED:
      case HostedKycSessionStatus.IN_PROGRESS:
        profile.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS;
        break;
      case HostedKycSessionStatus.ABANDONED:
      case HostedKycSessionStatus.EXPIRED:
        // The session ended without a decision: consumes no attempt, and the
        // profile returns to a startable state whether it was in progress or
        // waiting in review (a pending profile is not startable, so leaving it
        // pending would strand the account).
        if (
          current === IdentityVerificationStatus.IN_PROGRESS ||
          current === IdentityVerificationStatus.PENDING
        ) {
          profile.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED;
        }
        break;
      case HostedKycSessionStatus.KYC_EXPIRED:
        // Only a previously verified profile can expire; anything else is
        // inconsistent with our record and changes nothing.
        if (current === IdentityVerificationStatus.VERIFIED) {
          profile.identityVerificationStatus = IdentityVerificationStatus.EXPIRED;
          profile.expiredAt = new Date();
        }
        break;
    }
    await profileRepository.save(profile);
  }
  // True only for the approval of the CURRENT home-country-change session, started
  // for the country that is still pending, on an account whose verification is not
  // blocked. Promotes exactly that country and clears the claim.
  private promoteApprovedHomeCountryChange(
    profile: IdentityVerificationProfile,
    session: HostedKycSession,
    signal: IdentityVerifiedSignal,
  ): boolean {
    const blocked =
      profile.identityVerificationStatus === IdentityVerificationStatus.BLOCKED_DUPLICATE ||
      profile.identityVerificationStatus === IdentityVerificationStatus.BLOCKED_AGE ||
      profile.identityVerificationStatus === IdentityVerificationStatus.FAILED_FINAL;
    const promotable =
      session.purpose === HostedKycSessionPurpose.HOME_COUNTRY_CHANGE &&
      hasPendingHomeCountryChange(profile) &&
      profile.pendingRelocationSessionId === session.id &&
      profile.pendingHomeCountry === session.pendingHomeCountry &&
      !blocked;
    if (!promotable) return false;
    profile.verifiedHomeCountry = profile.pendingHomeCountry;
    profile.verifiedHomeCountryConfirmedAt = new Date();
    // The approved change ends Travel Mode (and only an approved change does): the
    // account's new home country is where the user now is.
    profile.travelClassification = null;
    profile.travelModeActive = false;
    profile.declaredDuration = null;
    profile.travelModeActivatedAt = null;
    profile.nextTravelReminderAt = null;
    profile.lastTravelReminderSentAt = null;
    profile.travelCheckInCount = 0;
    clearPendingRelocation(profile);
    signal.homeCountryUpdated = { profileId: profile.id, userId: profile.userId, hostedKycSessionId: session.id };
    return true;
  }
}
