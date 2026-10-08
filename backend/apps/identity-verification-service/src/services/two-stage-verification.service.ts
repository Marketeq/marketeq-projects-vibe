import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { IdentityDocument } from '../entities/identity-document.entity';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { BiometricSession } from '../entities/biometric-session.entity';
import { ProcessedWebhookEvent } from '../entities/processed-webhook-event.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import {
  getAccountWideAttemptCount,
  reserveAttemptSlot,
  RETRY_LIMIT,
} from '../common/attempt-limit/account-wide-attempt-count';
import { normalizeDocumentNumber, hashDocumentNumber } from '../common/security/document-fingerprint';
import {
  DuplicateDocumentException,
  VendorOutcomeUnknownException,
} from '../common/errors/domain-exceptions';
import {
  DocumentCheckStatus,
  BiometricSessionStatus,
  IdentityVerificationStatus,
} from '../entities/enums/identity-verification.enums';
import {
  ObjectStorageProvider,
  OBJECT_STORAGE_PROVIDER,
} from '../providers/storage/object-storage-provider.interface';
import {
  ObjectNotFoundError,
  ObjectReadInterruptedError,
  ObjectStorageUnavailableError,
  ObjectTooLargeError,
} from '../providers/storage/object-storage.errors';
import {
  StandaloneIdVerificationProvider,
  STANDALONE_ID_VERIFICATION_PROVIDER,
} from '../providers/document-verification/standalone-id-verification-provider.interface';
import {
  AmbiguousVendorOutcomeError,
  MalformedVendorResponseError as DocCheckMalformedError,
  UnreadableDocumentImageError,
  VendorAuthOrCreditError as DocCheckAuthError,
  VendorRateLimitedError as DocCheckRateLimitError,
  VendorTransportError as DocCheckTransportError,
} from '../providers/document-verification/standalone-id-verification.errors';
import {
  HostedBiometricSessionProvider,
  HOSTED_BIOMETRIC_SESSION_PROVIDER,
} from '../providers/biometric-session/hosted-biometric-session-provider.interface';
import {
  MalformedVendorResponseError as SessionMalformedError,
  VendorAuthOrCreditError as SessionAuthError,
  VendorRateLimitedError as SessionRateLimitError,
  VendorTransportError as SessionTransportError,
} from '../providers/biometric-session/hosted-biometric-session.errors';
import {
  parseDiditWebhookEvent,
  verifyDiditWebhookRawSignature,
  verifyDiditWebhookTimestamp,
} from '../providers/webhooks/didit-webhook-verification';
import {
  checkDuplicateEvent,
  checkOutOfOrder,
  checkUnknownSession,
} from '../providers/webhooks/didit-webhook-event-tracker';
import { deriveOverallOutcome, OverallOutcome, StageOutcome } from '../providers/webhooks/derive-overall-outcome';
import {
  DocumentNotFoundException,
  ProfileNotFoundException,
  DocumentNotEligibleForBiometricVerificationException,
  VendorStageUnavailableException,
  UnknownBiometricSessionException,
} from '../common/errors/domain-exceptions';

// Real orchestration for the two-stage Didit integration: standalone
// document check, then a Didit-hosted biometric session using that
// check's own portrait, finalized only by a validated webhook.
//
// Deliberately a NEW service, not an extension of IdentityVerificationService
// — that service's existing 100+ tests and its old hosted-Sessions-API
// placeholder path (documentVerificationProvider / startVerificationSession
// / PendingVerificationSession-per-attempt) are left completely untouched
// by this file, per "preserve existing work." That old path is superseded
// by this one for the document+biometric flow, but retiring it (deleting
// DiditDocumentVerificationProvider, DOCUMENT_VERIFICATION_PROVIDER, the
// old startVerificationSession method, and updating the webhook controller
// route to point here instead) is a separate, deliberate cleanup decision
// this pass does not make unilaterally — reported as a known duplication,
// not silently left ambiguous.
//
// The 10MB figure below matches
// DiditStandaloneIdVerificationProvider's own documented limit exactly —
// duplicated as a constant rather than imported since that field is
// private to that class.
const MAX_DOCUMENT_IMAGE_BYTES = 10 * 1024 * 1024;

function toStageOutcome(status: DocumentCheckStatus | null): StageOutcome {
  if (status === DocumentCheckStatus.APPROVED) return 'approved';
  if (status === DocumentCheckStatus.DECLINED) return 'declined';
  return 'pending';
}

function biometricStatusToStageOutcome(status: BiometricSessionStatus): StageOutcome {
  if (status === BiometricSessionStatus.APPROVED) return 'approved';
  if (status === BiometricSessionStatus.DECLINED) return 'declined';
  return 'pending';
}

// Exact, case-sensitive Didit status strings this pass recognizes as
// terminal. Anything else (In Review, Kyc Expired, an unrecognized future
// value) maps to IN_REVIEW — never silently Approved, never silently
// Declined on a value we don't recognize.
function mapDiditStatusToBiometricSessionStatus(status: string): BiometricSessionStatus {
  if (status === 'Approved') return BiometricSessionStatus.APPROVED;
  if (status === 'Declined') return BiometricSessionStatus.DECLINED;
  return BiometricSessionStatus.IN_REVIEW;
}

export interface WebhookHeaders {
  signature: string | undefined;
  timestamp: string | undefined;
}

@Injectable()
export class TwoStageVerificationService {
  private readonly logger = new Logger(TwoStageVerificationService.name);

  constructor(
    @InjectRepository(IdentityDocument)
    private readonly documentRepository: Repository<IdentityDocument>,
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(BiometricSession)
    private readonly biometricSessionRepository: Repository<BiometricSession>,
    @InjectRepository(ProcessedWebhookEvent)
    private readonly processedWebhookEventRepository: Repository<ProcessedWebhookEvent>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
    @InjectRepository(PendingVerificationSession)
    private readonly pendingSessionRepository: Repository<PendingVerificationSession>,
    @InjectRepository(AttemptReservation)
    private readonly reservationRepository: Repository<AttemptReservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly objectStorageProvider: ObjectStorageProvider,
    @Inject(STANDALONE_ID_VERIFICATION_PROVIDER)
    private readonly documentCheckProvider: StandaloneIdVerificationProvider,
    @Inject(HOSTED_BIOMETRIC_SESSION_PROVIDER)
    private readonly hostedSessionProvider: HostedBiometricSessionProvider,
  ) {}

  // --- Ownership helper, matches the existing service's own pattern ---
  private async loadOwnedDocument(userId: string, documentId: string): Promise<IdentityDocument> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new ProfileNotFoundException();
    const document = await this.documentRepository.findOne({
      where: { id: documentId, profileId: profile.id },
    });
    if (!document) throw new DocumentNotFoundException();
    return document;
  }

  /**
   * Stage 1: submits the document's stored image(s) to Didit's standalone
   * document-check API and records the result. Idempotent — a document
   * already checked returns its cached result rather than re-billing,
   * UNLESS the stored image hash no longer matches (defensive; no code
   * path replaces documentImageReference today, but this makes the cache
   * correct by construction rather than by that absence of a feature).
   *
   * This is the first real vendor call of an attempt cycle in this
   * pipeline (mirroring identity-verification.service.ts's old
   * startVerificationSession, now retired) — gated by the same
   * account-wide 3-attempt ceiling, made ATOMIC via
   * account-wide-attempt-count.ts's reserveAttemptSlot: the ceiling check
   * and the reservation insert happen under one per-profile advisory lock,
   * so two concurrent calls for the same profile cannot both read a count
   * under the ceiling and both proceed — a plain count-then-act check
   * cannot provide that guarantee (see this project's own note on why that
   * is insufficient). Only a FRESH (non-cached) call reserves at all: the
   * cache-hit branch above returns before it. The reservation is released
   * in `finally` no matter how the vendor call resolves — on success it is
   * superseded by documentCheckedAt (set below), on failure it is
   * released so the outage costs no attempt, and if this process crashes
   * before either happens, the reservation self-heals after
   * RESERVATION_TTL_MS.
   *
   * documentNumber/expirationDate backfill: for captureMethod=scan
   * documents these are null at submission time (SubmitDocumentRequestDto's
   * header comment). Once Didit's own OCR/MRZ extraction returns them
   * here, they are written onto this row for the FIRST time only — never
   * overwriting a value the user already supplied via manual entry, never
   * fabricated when Didit's extraction itself comes back null (some ID
   * cards genuinely have no expiry; OCR can fail to read a number, in
   * which case duplicate-detection for this document is skipped, not
   * blocked on an invented value). When a real documentNumber first
   * becomes available this way, the exact same duplicate-detection query
   * submitDocument runs at submission time (Doc 03 §8a) runs here instead,
   * at the point the number is actually known.
   */
  async checkDocumentWithVendor(userId: string, documentId: string): Promise<IdentityDocument> {
    const document = await this.loadOwnedDocument(userId, documentId);

    const front = await this.readOwnedImage(document.documentImageReference);
    const currentHash = createHash('sha256').update(front.bytes).digest('hex');

    if (document.documentCheckStatus && document.documentCheckImageHash === currentHash) {
      return document;
    }

    const reservation = await reserveAttemptSlot(this.dataSource, this.attemptRepos(), document.profileId);
    // Set true only when the vendor's outcome is genuinely unknown (no
    // response received at all) — see the AmbiguousVendorOutcomeError
    // branch below. Every other exit path (success, a definite vendor
    // failure, a storage failure) releases normally.
    let keepReservationOnAmbiguousOutcome = false;

    try {
      const back = document.backImageReference
        ? await this.readOwnedImage(document.backImageReference)
        : null;

      const result = await this.documentCheckProvider.checkDocument({
        frontImage: { bytes: front.bytes, contentType: front.contentType },
        backImage: back ? { bytes: back.bytes, contentType: back.contentType } : undefined,
        // Explicit, not defaulted — see this project's earlier documented
        // evaluation: true is required for fetchPortraitFromDocumentCheckSession
        // to be able to look this session's portrait back up later, since
        // "Begin verifying" can happen well after this call returns.
        saveApiRequest: true,
        vendorData: document.id,
      });

      document.documentCheckStatus =
        result.status === 'Approved' ? DocumentCheckStatus.APPROVED : DocumentCheckStatus.DECLINED;
      document.documentCheckWarnings = result.warnings.map((w) => ({
        risk: w.risk,
        logType: w.logType,
        shortDescription: w.shortDescription,
      }));
      document.documentCheckImageHash = currentHash;
      document.documentCheckRequestId = result.requestId;
      document.documentCheckedAt = new Date();

      if (!document.expirationDate && result.expirationDate) {
        document.expirationDate = result.expirationDate;
      }

      // Scanned driver's licences carry no issuingState at submission time
      // (SubmitDocumentRequestDto); backfill it from Didit's extraction, never
      // overwriting a value already stored.
      if (!document.issuingState && result.issuingState) {
        document.issuingState = result.issuingState;
      }

      const saved =
        !document.documentNumber && result.documentNumber
          ? await this.backfillDocumentNumberCheckDuplicateAndSave(document, result.documentNumber)
          : await this.documentRepository.save(document);

      // Release BEFORE any further ceiling check below (applyOverallOutcome
      // on a Declined result also counts account-wide attempts) — this
      // attempt is now confirmed via documentCheckedAt above, so counting
      // both that AND a still-fresh reservation for the same attempt would
      // double-count it against the ceiling.
      await reservation.release();

      if (saved.isDuplicateMatch) {
        const profile = await this.profileRepository.findOne({ where: { id: saved.profileId } });
        if (profile) {
          profile.identityVerificationStatus = IdentityVerificationStatus.BLOCKED_DUPLICATE;
          await this.profileRepository.save(profile);
        }
        // SVC-17: never identifies the account holding the conflicting
        // document — details only ever carry this profile's own document id.
        throw new DuplicateDocumentException({ documentId: saved.id });
      }

      if (saved.documentCheckStatus === DocumentCheckStatus.DECLINED) {
        await this.applyOverallOutcome(saved.profileId, 'declined');
      }

      return saved;
    } catch (err) {
      if (err instanceof DuplicateDocumentException) throw err;
      if (err instanceof VendorStageUnavailableException) throw err; // already mapped by readOwnedImage
      if (err instanceof AmbiguousVendorOutcomeError) {
        // No response was received at all — we have no evidence the
        // vendor did NOT process this request (save_api_request=true
        // could have persisted a real result server-side). Do NOT
        // release: this attempt must keep counting toward the ceiling
        // (reservation stays fresh) rather than silently allowing
        // unlimited free retries against an outcome we can't confirm.
        // It self-heals via RESERVATION_TTL_MS if this really was a
        // permanent loss, not a still-pending one (see that constant's
        // comment on why it's sized relative to the adapter's own fetch
        // timeout).
        keepReservationOnAmbiguousOutcome = true;
        this.logger.warn(`Document check outcome unknown (no response received): ${err.constructor.name}`);
        throw new VendorOutcomeUnknownException({ reason: err.constructor.name });
      }
      if (
        err instanceof UnreadableDocumentImageError ||
        err instanceof DocCheckAuthError ||
        err instanceof DocCheckRateLimitError ||
        err instanceof DocCheckTransportError ||
        err instanceof DocCheckMalformedError
      ) {
        // Vendor/transport failure — never written as a terminal result,
        // never surfaced as a rejection of the user's document.
        this.logger.warn(`Document check unavailable: ${err.constructor.name}`);
        throw new VendorStageUnavailableException({ reason: err.constructor.name });
      }
      throw err;
    } finally {
      if (!keepReservationOnAmbiguousOutcome) {
        await reservation.release();
      }
    }
  }

  private attemptRepos() {
    return {
      attemptRepository: this.attemptRepository,
      pendingSessionRepository: this.pendingSessionRepository,
      documentRepository: this.documentRepository,
      reservationRepository: this.reservationRepository,
    };
  }

  // Reuses submitDocument's exact duplicate-detection query (Doc 03 §8a),
  // just relocated to the moment a real documentNumber first becomes known
  // for a captureMethod=scan document, via an advisory lock scoped the same
  // way (fingerprint + issuingCountry + documentType). The lock, duplicate
  // lookup, AND the document save all happen inside the same transaction —
  // required so no concurrent call can slip a conflicting row in between
  // the check and the save, the same guarantee submitDocument's own
  // transaction provides. This never holds the lock across the vendor HTTP
  // call, which has already completed by the time this runs.
  private async backfillDocumentNumberCheckDuplicateAndSave(
    document: IdentityDocument,
    extractedDocumentNumber: string,
  ): Promise<IdentityDocument> {
    const fingerprint = hashDocumentNumber(normalizeDocumentNumber(extractedDocumentNumber));
    document.documentNumber = extractedDocumentNumber;
    document.documentNumberNormalized = fingerprint;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1 || $2 || $3))', [
        fingerprint,
        document.issuingCountry,
        document.documentType,
      ]);
      const matches: Array<{ id: string }> = await queryRunner.query(
        `SELECT id FROM identity_verification.identity_documents
         WHERE document_number_normalized = $1 AND issuing_country = $2
           AND document_type = $3 AND profile_id <> $4
         LIMIT 1`,
        [fingerprint, document.issuingCountry, document.documentType, document.profileId],
      );
      const duplicate = matches[0];
      if (duplicate) {
        document.isDuplicateMatch = true;
        document.duplicateOfDocumentId = duplicate.id;
      }
      const saved = await queryRunner.manager.save(document);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async readOwnedImage(objectKey: string): Promise<{ bytes: Buffer; contentType: string }> {
    try {
      return await this.objectStorageProvider.getObject({
        objectKey,
        maxBytes: MAX_DOCUMENT_IMAGE_BYTES,
      });
    } catch (err) {
      if (
        err instanceof ObjectNotFoundError ||
        err instanceof ObjectTooLargeError ||
        err instanceof ObjectReadInterruptedError ||
        err instanceof ObjectStorageUnavailableError
      ) {
        throw new VendorStageUnavailableException({ reason: err.constructor.name });
      }
      throw err;
    }
  }

  /**
   * Stage 2: creates (or resumes) the Didit-hosted biometric session for
   * an already-approved document. Eligibility: the document must have a
   * DocumentCheckStatus.APPROVED result AND Didit must actually be able
   * to hand back a portrait for that exact check — a document that
   * "submitted" but never got a usable portrait is NOT eligible, per the
   * explicit requirement that submission alone is insufficient.
   */
  async beginBiometricVerification(
    userId: string,
    documentId: string,
  ): Promise<{ sessionId: string; url: string; resumed: boolean }> {
    const document = await this.loadOwnedDocument(userId, documentId);

    if (document.documentCheckStatus !== DocumentCheckStatus.APPROVED || !document.documentCheckRequestId) {
      throw new DocumentNotEligibleForBiometricVerificationException({
        documentCheckStatus: document.documentCheckStatus,
      });
    }

    const existing = await this.biometricSessionRepository.findOne({
      where: { documentId: document.id },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.status === BiometricSessionStatus.CREATED) {
      return { sessionId: existing.diditSessionId, url: existing.hostedUrl, resumed: true };
    }
    if (existing && existing.status === BiometricSessionStatus.APPROVED) {
      return { sessionId: existing.diditSessionId, url: existing.hostedUrl, resumed: true };
    }

    const workflowId = process.env.DIDIT_BIOMETRIC_WORKFLOW_ID;
    if (!workflowId) {
      throw new VendorStageUnavailableException({ reason: 'DIDIT_BIOMETRIC_WORKFLOW_ID_not_configured' });
    }

    try {
      const portrait = await this.hostedSessionProvider.fetchPortraitFromDocumentCheckSession(
        document.documentCheckRequestId,
      );
      if (!portrait) {
        // Ambiguous/not-ready, NEVER treated as a decline.
        throw new DocumentNotEligibleForBiometricVerificationException({
          reason: 'no_portrait_available_from_document_check',
        });
      }

      const session = await this.hostedSessionProvider.createSession({
        workflowId,
        portraitImageBase64: portrait,
        vendorData: document.id,
      });

      const saved = await this.biometricSessionRepository.save(
        this.biometricSessionRepository.create({
          profileId: document.profileId,
          documentId: document.id,
          diditSessionId: session.sessionId,
          hostedUrl: session.url,
          status: BiometricSessionStatus.CREATED,
        }),
      );
      return { sessionId: saved.diditSessionId, url: saved.hostedUrl, resumed: false };
    } catch (err) {
      if (err instanceof DocumentNotEligibleForBiometricVerificationException) throw err;
      if (err instanceof AmbiguousVendorOutcomeError) {
        // No response received from createSession or the portrait fetch.
        // This method spends no account-wide attempt (see
        // checkDocumentWithVendor's header comment on where that ceiling
        // is gated), so there is no reservation to protect here — but a
        // caller retrying immediately after this specific error could
        // create a SECOND real hosted session at Didit for the same
        // document if the first request actually succeeded server-side
        // and only the response was lost. Not fixed here (would need a
        // vendor-side idempotency key, not confirmed to exist for this
        // endpoint) — surfaced with distinct messaging so a caller/UI can
        // at least avoid an immediate blind retry.
        this.logger.warn(`Hosted session stage outcome unknown (no response received): ${err.constructor.name}`);
        throw new VendorOutcomeUnknownException({ reason: err.constructor.name });
      }
      if (
        err instanceof SessionAuthError ||
        err instanceof SessionRateLimitError ||
        err instanceof SessionTransportError ||
        err instanceof SessionMalformedError
      ) {
        this.logger.warn(`Hosted session stage unavailable: ${err.constructor.name}`);
        throw new VendorStageUnavailableException({ reason: err.constructor.name });
      }
      throw err;
    }
  }

  /**
   * Validated-webhook-only finalization. Returning from Didit's hosted
   * page is never sufficient on its own — only this method, driven by a
   * signature-and-timestamp-verified delivery, may change
   * BiometricSession.status or IdentityVerificationProfile.identityVerificationStatus.
   */
  async handleBiometricSessionWebhook(
    rawBody: Buffer,
    headers: WebhookHeaders,
    nowSeconds?: number,
  ): Promise<void> {
    const secret = process.env.DIDIT_WEBHOOK_SECRET as string;
    verifyDiditWebhookRawSignature(rawBody, headers.signature, secret);
    verifyDiditWebhookTimestamp(headers.timestamp, nowSeconds);
    const event = parseDiditWebhookEvent(rawBody);

    // Application/environment check — skipped gracefully (not hard-failed)
    // when DIDIT_APPLICATION_ID isn't configured yet; see this method's
    // reported dependency in the final summary.
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

    // Unknown-session check, using the real backing store (our own
    // biometric_sessions table) as didit-webhook-event-tracker.checkUnknownSession's
    // caller-supplied lookup. A webhook for a session we never created is
    // never trusted enough to change anything.
    const session = await this.biometricSessionRepository.findOne({
      where: { diditSessionId: event.session_id },
    });
    const unknownCheck = checkUnknownSession(
      event.session_id,
      session ? new Set([session.diditSessionId]) : new Set(),
    );
    if (unknownCheck.isUnknown || !session) {
      throw new UnknownBiometricSessionException({ sessionId: event.session_id });
    }

    // Duplicate check, using the real backing store (processed_webhook_events)
    // as checkDuplicateEvent's caller-supplied lookup — a fast pre-check
    // for the common case. The table's unique primary key on event_id is
    // the concurrency-safe backstop for two deliveries arriving at once
    // (see the insert below and its catch block).
    const alreadyProcessed = await this.processedWebhookEventRepository.findOne({
      where: { eventId: event.event_id },
    });
    const duplicateCheck = checkDuplicateEvent(
      event.event_id,
      alreadyProcessed ? new Set([alreadyProcessed.eventId]) : new Set(),
    );
    if (duplicateCheck.isDuplicate) {
      this.logger.debug(`Duplicate webhook event ignored: ${event.event_id}`);
      return;
    }

    try {
      await this.processedWebhookEventRepository.insert({
        eventId: event.event_id,
        sessionId: event.session_id,
      });
    } catch {
      // Unique-constraint violation on eventId = a second delivery of the
      // same event arrived concurrently with the one above — idempotent
      // no-op, not an error. This is the race the pre-check above cannot
      // close on its own.
      this.logger.debug(`Concurrent duplicate webhook event ignored: ${event.event_id}`);
      return;
    }

    const outOfOrder = checkOutOfOrder(
      event.session_id,
      event.timestamp,
      new Map(session.lastEventTimestamp !== null ? [[event.session_id, session.lastEventTimestamp]] : []),
    );
    if (outOfOrder.isOutOfOrder) {
      this.logger.debug(`Out-of-order webhook event ignored for session ${event.session_id}`);
      return;
    }

    session.status = mapDiditStatusToBiometricSessionStatus(event.status);
    session.lastEventTimestamp = event.timestamp;
    await this.biometricSessionRepository.save(session);

    const document = await this.documentRepository.findOne({ where: { id: session.documentId } });
    if (!document) return;

    const outcome = deriveOverallOutcome({
      documentCheck: toStageOutcome(document.documentCheckStatus),
      biometricSession: biometricStatusToStageOutcome(session.status),
    });
    await this.applyOverallOutcome(session.profileId, outcome);
  }

  // Writes the overall result ONLY when the outcome is actually determined
  // (never an intermediate 'pending' state as terminal). Reuses the
  // existing IdentityVerificationStatus enum (VERIFIED / FAILED /
  // FAILED_FINAL) rather than inventing new values. A 'declined' outcome
  // applies the SAME account-wide 3-attempt ceiling used elsewhere
  // (account-wide-attempt-count.ts) — FAILED_FINAL + failedFinalAt once the
  // ceiling is reached, otherwise a plain FAILED, mirroring
  // identity-verification.service.ts's handleDiditWebhook REJECTED branch
  // exactly. Called from both checkDocumentWithVendor (a fresh Declined
  // document-check — no need to wait on a biometric session that can never
  // become eligible) and handleBiometricSessionWebhook (a Declined or
  // Approved biometric outcome combined with the document-check stage).
  private async applyOverallOutcome(profileId: string, outcome: OverallOutcome): Promise<void> {
    if (outcome === 'pending') return;

    const profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) return;

    if (outcome === 'verified') {
      profile.identityVerificationStatus = IdentityVerificationStatus.VERIFIED;
      // A successful (re-)verification ends any renewal window (TRVG2 §2.7).
      profile.expiredAt = null;
    } else {
      const attemptTotal = await getAccountWideAttemptCount(this.attemptRepos(), profileId);
      if (attemptTotal >= RETRY_LIMIT) {
        profile.identityVerificationStatus = IdentityVerificationStatus.FAILED_FINAL;
        profile.failedFinalAt = new Date();
      } else {
        profile.identityVerificationStatus = IdentityVerificationStatus.FAILED;
      }
    }
    await this.profileRepository.save(profile);
  }

  /** Authenticated status read for the frontend — reports what is
   * actually stored, never inferring "verified" from anything other than
   * profile.identityVerificationStatus itself. */
  async getTwoStageStatus(userId: string, documentId: string) {
    const document = await this.loadOwnedDocument(userId, documentId);
    const profile = await this.profileRepository.findOne({ where: { id: document.profileId } });
    const biometricSession = await this.biometricSessionRepository.findOne({
      where: { documentId: document.id },
      order: { createdAt: 'DESC' },
    });

    return {
      documentCheckStatus: document.documentCheckStatus,
      biometricSessionStatus: biometricSession?.status ?? null,
      biometricSessionUrl: biometricSession?.hostedUrl ?? null,
      overallStatus: profile?.identityVerificationStatus ?? IdentityVerificationStatus.UNSTARTED,
    };
  }
}
