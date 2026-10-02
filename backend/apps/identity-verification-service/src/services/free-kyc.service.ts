import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import { ProcessedWebhookEvent } from '../entities/processed-webhook-event.entity';
import {
  AttemptOutcome,
  HostedKycSessionStatus,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
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
import { HomeCountryConfirmationReason } from '../common/errors/kyc-error-reasons';
import {
  NOTIFICATION_EVENT_PUBLISHER,
  NotificationEventPublisher,
} from '../events/notification-event-publisher.interface';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

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
  async startOrResume(userId: string): Promise<{ url: string }> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });
    return this.withProfileLock(profile.id, () => this.startOrResumeLocked(profile.id));
  }

  private async startOrResumeLocked(profileId: string): Promise<{ url: string }> {
    let profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) throw new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' satisfies HomeCountryConfirmationReason });

    // Runs under the per-profile advisory lock held by startOrResume, so
    // concurrent starts cannot both leave failed_final or create two sessions.
    profile = await this.endElapsedFailedFinalCooldown(profile);

    this.assertStatusAllowsStart(profile);

    const active = await this.sessionRepository.findOne({
      where: { profileId, status: In(ACTIVE_SESSION_STATUSES) },
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
        // Still active at Didit: resume it. The session already belongs to this
        // profile and was started under a valid confirmation, so resuming needs
        // no (new) home-country confirmation at all. Only creating a NEW session
        // requires verified location, travel mode off and a fresh confirmation.
        return this.resume(active);
      }

      // Decided at Didit: re-apply the start rules to the updated profile
      // (verified / pending review => not startable, no new session;
      // failed_final => limit; failed / unstarted => continue below).
      this.assertStatusAllowsStart(profile);
    }

    this.assertHomeCountryConfirmed(profile, { requireFresh: true });

    // Attempts in the CURRENT retry cycle only: hosted-session attempts since
    // the last final failure or approval. Historical rows stay stored but no
    // longer count once a cycle closes, and legacy document-pipeline rows are
    // never counted here (see common/attempt-limit/hosted-kyc-attempt-cycle.ts).
    const attemptTotal = await getHostedKycCycleAttemptCount(this.cycleRepos(), profileId);
    if (attemptTotal >= RETRY_LIMIT) throw new RetryLimitExceededException();

    return this.createNew(profile);
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
    if (!signal.verified || !this.events) return;
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
  // Mode. POST /home-country/confirm sets verifiedHomeCountry, its
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
    if (profile.travelModeActive || profile.travelClassification === TravelClassification.TEMPORARILY_TRAVELING) {
      fail('travel_mode_active');
    }
    if (options.requireFresh) {
      const age = Date.now() - (profile.verifiedHomeCountryConfirmedAt as Date).getTime();
      if (age > HOME_COUNTRY_CONFIRMATION_WINDOW_MS) fail('confirmation_stale');
    }
  }

  private async resume(active: HostedKycSession): Promise<{ url: string }> {
    // Didit returns the same unfinished session for the same vendor_data —
    // the hosted URL is never stored here.
    const created = await this.callProvider(active.vendorReference);
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

  private async createNew(profile: IdentityVerificationProfile): Promise<{ url: string }> {
    const vendorReference = randomUUID();
    const created = await this.callProvider(vendorReference);
    const url = this.validatedUrl(created.url);

    await this.sessionRepository.save(
      this.sessionRepository.create({
        profileId: profile.id,
        diditSessionId: created.sessionId,
        vendorReference,
        status: mapDiditStatusToKycStatus(created.status) ?? HostedKycSessionStatus.CREATED,
      }),
    );

    if (profile.identityVerificationStatus !== IdentityVerificationStatus.IN_PROGRESS) {
      profile.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS;
      await this.profileRepository.save(profile);
    }
    return { url };
  }

  private async callProvider(vendorReference: string) {
    const workflowId = process.env.DIDIT_FREE_KYC_WORKFLOW_ID;
    const frontendUrl = process.env.FRONTEND_URL;
    if (!workflowId || !frontendUrl) {
      throw new VendorStageUnavailableException({ reason: 'free_kyc_not_configured' });
    }
    try {
      return await this.provider.createKycSession({
        workflowId,
        vendorData: vendorReference,
        callbackUrl: `${frontendUrl.replace(/\/+$/, '')}/talent-dashboard`,
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
    session.status = status;
    if (eventTimestamp !== null) session.lastEventTimestamp = eventTimestamp;
    await manager.getRepository(HostedKycSession).save(session);
    await this.applyProfileOutcome(manager, session, status, signal);
    return true;
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
}
