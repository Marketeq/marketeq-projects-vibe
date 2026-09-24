import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import {
  TravelClassification,
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  AttemptOutcome,
  VpnProxyDetectionResult,
} from '../entities/enums/identity-verification.enums';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';
import { DiditWebhookPayloadDto } from '../dto/webhooks/didit-webhook.payload.dto';
import {
  DuplicateDocumentException,
  RetryLimitExceededException,
  ProfileNotFoundException,
  DocumentNotFoundException,
  NoDetectedLocationException,
  ClassificationRequiredException,
  InvalidWebhookSignatureException,
  UnknownVendorSessionException,
  VpnProxyDetectedException,
} from '../common/errors/domain-exceptions';
import { verifyDiditWebhookSignature } from '../common/utils/verify-didit-webhook-signature';
import {
  normalizeDocumentNumber,
  hashDocumentNumber,
} from '../common/security/document-fingerprint';
import { coarseFailureReason } from '../common/status/coarse-failure-reason';
import {
  DocumentVerificationProvider,
  DOCUMENT_VERIFICATION_PROVIDER,
} from '../providers/document-verification/document-verification-provider.interface';
import {
  VpnProxyDetectionProvider,
  VPN_PROXY_DETECTION_PROVIDER,
} from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import {
  LocationProvider,
  LOCATION_PROVIDER,
} from '../providers/location/location-provider.interface';
import {
  ObjectStorageProvider,
  OBJECT_STORAGE_PROVIDER,
} from '../providers/storage/object-storage-provider.interface';
import {
  NotificationEventPublisher,
  NOTIFICATION_EVENT_PUBLISHER,
} from '../events/notification-event-publisher.interface';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

const RETRY_LIMIT = 3;
const FIRST_REMINDER_DELAY_MS = 5 * 60 * 1000;
const FAILED_FINAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface InternalCallerStatus {
  identityVerificationStatus: IdentityVerificationStatus;
  locationVerificationStatus: LocationVerificationStatus;
  isVerified: boolean;
  gateOpen: boolean;
  inGrace: boolean;
  attemptCount: number;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(IdentityDocument)
    private readonly documentRepository: Repository<IdentityDocument>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
    @InjectRepository(PendingVerificationSession)
    private readonly pendingSessionRepository: Repository<PendingVerificationSession>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_VERIFICATION_PROVIDER)
    private readonly documentVerificationProvider: DocumentVerificationProvider,
    @Inject(VPN_PROXY_DETECTION_PROVIDER)
    private readonly vpnProxyDetectionProvider: VpnProxyDetectionProvider,
    @Inject(LOCATION_PROVIDER)
    private readonly locationProvider: LocationProvider,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly objectStorageProvider: ObjectStorageProvider,
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly events: NotificationEventPublisher,
  ) {}

  // --- Profile lifecycle ---

  /**
   * ipAddress is optional and only ever passed by callers that have a raw
   * request to extract it from (currently getMyStatus and
   * confirmHomeCountry). When present and the profile has no detected
   * location yet, this backfills it via the LocationProvider boundary
   * (Technical Architecture §11) — country-level only, never overwriting an
   * already-detected value. Which caller should trigger this, and on what
   * cadence (every call vs. once), is left as the still-undecided
   * LocationProvider integration point the docs flag (§11); this is the
   * minimal default that makes "detected location" actually populate.
   */
  async getOrCreateProfile(
    userId: string,
    ipAddress?: string | null,
  ): Promise<IdentityVerificationProfile> {
    const existing = await this.profileRepository.findOne({ where: { userId } });
    const profile = existing ?? this.profileRepository.create({ userId });

    if (!profile.detectedCountry && ipAddress) {
      const detected = await this.locationProvider.resolve({ ipAddress });
      if (detected) {
        profile.detectedCountry = detected.countryCode;
        profile.detectedRegionState = detected.regionState;
        profile.detectedCity = detected.city;
        return this.profileRepository.save(profile);
      }
    }

    return existing ?? this.profileRepository.save(profile);
  }

  async confirmHomeCountry(
    userId: string,
    ipAddress?: string | null,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId, ipAddress);
    if (!profile.detectedCountry) {
      throw new NoDetectedLocationException();
    }
    const previousCountry = profile.verifiedHomeCountry;
    const isFirstConfirmation = profile.locationVerificationStatus !== LocationVerificationStatus.VERIFIED;

    profile.verifiedHomeCountry = profile.detectedCountry;
    profile.verifiedHomeCountryConfirmedAt = new Date();
    profile.locationVerificationStatus = LocationVerificationStatus.VERIFIED;
    const saved = await this.profileRepository.save(profile);

    if (isFirstConfirmation) {
      await this.events.publish({
        eventType: IdentityVerificationEventType.LOCATION_VERIFIED,
        profileId: saved.id,
        userId,
        occurredAt: new Date().toISOString(),
      });
    } else if (previousCountry !== saved.verifiedHomeCountry) {
      await this.events.publish({
        eventType: IdentityVerificationEventType.HOME_COUNTRY_UPDATED,
        profileId: saved.id,
        userId,
        occurredAt: new Date().toISOString(),
      });
    }
    return saved;
  }

  // --- Travel / Relocation ---

  async recordTravelClassification(
    userId: string,
    classification: TravelClassification,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);
    profile.travelClassification = classification;

    // SVC-07: Permanently Relocated routes back through location/document
    // proof verification rather than duration selection or Travel Mode — a
    // relocation claim must be proved by a document before it replaces the
    // verified home country (00 §3 item 4). Resetting location status here
    // forces the existing home-country-confirm -> document flow to run
    // again; Temporarily Traveling is unaffected.
    if (classification === TravelClassification.PERMANENTLY_RELOCATED) {
      profile.locationVerificationStatus = LocationVerificationStatus.NOT_VERIFIED;
    }

    return this.profileRepository.save(profile);
  }

  async recordTravelDuration(
    userId: string,
    duration: DeclaredDuration,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING) {
      throw new ClassificationRequiredException();
    }
    const now = new Date();
    profile.declaredDuration = duration;
    profile.travelModeActive = true;
    profile.travelModeActivatedAt = now;
    profile.nextTravelReminderAt = new Date(now.getTime() + FIRST_REMINDER_DELAY_MS);
    const saved = await this.profileRepository.save(profile);

    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED,
      profileId: saved.id,
      userId,
      occurredAt: now.toISOString(),
    });
    return saved;
  }

  // --- Documents ---

  async createDocumentUploadUrl(
    userId: string,
    fileExtension: string,
  ): Promise<{ uploadUrl: string; documentImageReference: string; expiresAt: string }> {
    const profile = await this.getOrCreateProfile(userId);
    const result = await this.objectStorageProvider.createUploadUrl({
      profileId: profile.id,
      fileExtension,
    });
    return {
      uploadUrl: result.uploadUrl,
      documentImageReference: result.objectKey,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  async submitDocument(
    userId: string,
    dto: SubmitDocumentRequestDto,
  ): Promise<IdentityDocument> {
    const profile = await this.getOrCreateProfile(userId);
    const documentNumberNormalized = normalizeDocumentNumber(dto.documentNumber);
    const documentNumberFingerprint = hashDocumentNumber(documentNumberNormalized);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1 || $2 || $3))', [
        documentNumberFingerprint,
        dto.issuingCountry,
        dto.documentType,
      ]);

      const matches: Array<{ id: string; profile_id: string }> = await queryRunner.query(
        `SELECT id, profile_id FROM identity_verification.identity_documents
         WHERE document_number_normalized = $1 AND issuing_country = $2
           AND document_type = $3 AND profile_id <> $4
         LIMIT 1`,
        [documentNumberFingerprint, dto.issuingCountry, dto.documentType, profile.id],
      );
      const duplicate = matches[0];

      const document = queryRunner.manager.create(IdentityDocument, {
        profileId: profile.id,
        documentType: dto.documentType,
        documentTypeLabel: dto.documentTypeLabel ?? null,
        issuingCountry: dto.issuingCountry,
        documentNumber: dto.documentNumber,
        documentNumberNormalized: documentNumberFingerprint,
        expirationDate: dto.expirationDate,
        issuingState: dto.issuingState ?? null,
        captureMethod: dto.captureMethod,
        documentImageReference: dto.documentImageReference,
        isDuplicateMatch: !!duplicate,
        duplicateOfDocumentId: duplicate ? duplicate.id : null,
      });
      const saved = await queryRunner.manager.save(document);

      if (duplicate) {
        // SVC-17: a deterministic block, not an AI review case. The
        // response never identifies the account holding the conflicting
        // document (TRVG2 §6.2) — DuplicateDocumentException's details
        // only ever carry the CALLING profile's own newly-created
        // documentId, never the other profile's id.
        await queryRunner.manager.update(IdentityVerificationProfile, profile.id, {
          identityVerificationStatus: IdentityVerificationStatus.BLOCKED_DUPLICATE,
        });
        await queryRunner.commitTransaction();
        throw new DuplicateDocumentException({ documentId: saved.id });
      }

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

  // Account-wide (profile_id alone) count of settled attempts plus
  // in-flight sessions still awaiting a Didit outcome — TRVG2 §2's
  // gate-table note / Answer 3. Summing both, rather than only settled
  // attempts, keeps the 3-attempt ceiling from being bypassed by
  // concurrent in-flight sessions.
  private async getAccountWideAttemptCount(profileId: string): Promise<number> {
    const existingAttempts = await this.attemptRepository.count({ where: { profileId } });
    const pendingSessions = await this.pendingSessionRepository.count({ where: { profileId } });
    return existingAttempts + pendingSessions;
  }

  async startVerificationSession(
    userId: string,
    documentId: string,
    ipAddress: string | null = null,
  ): Promise<{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number }> {
    const profile = await this.getOrCreateProfile(userId);
    const document = await this.documentRepository.findOne({
      where: { id: documentId, profileId: profile.id },
    });
    if (!document) throw new DocumentNotFoundException();

    const attemptTotal = await this.getAccountWideAttemptCount(profile.id);
    if (attemptTotal >= RETRY_LIMIT) {
      throw new RetryLimitExceededException();
    }

    // VpnProxyCheckGuard already enforces this same check at the
    // controller boundary — this call is a defense-in-depth re-check right
    // before the vendor session actually starts, not the sole enforcement
    // point (Technical Requirements §1.5: backend enforcement, not just
    // the frontend gate).
    const vpnProxyResult = await this.vpnProxyDetectionProvider.detect({
      ipAddress: ipAddress ?? '',
    });
    if (vpnProxyResult !== VpnProxyDetectionResult.NONE) {
      throw new VpnProxyDetectedException({ vpnProxyResult });
    }

    const session = await this.documentVerificationProvider.startVerificationSession({
      documentId: document.id,
      documentType: document.documentType,
      issuingCountry: document.issuingCountry,
      documentImageReference: document.documentImageReference,
    });

    const attemptNumber = attemptTotal + 1;
    const pendingSession = this.pendingSessionRepository.create({
      profileId: profile.id,
      documentId: document.id,
      vendorSessionId: session.vendorSessionId,
      attemptMethod: document.captureMethod,
      attemptDocumentType: document.documentType,
      attemptNumber,
      vpnProxyDetectionResult: vpnProxyResult,
    });
    await this.pendingSessionRepository.save(pendingSession);

    // TRVG2 §3: session created -> IN_PROGRESS.
    await this.profileRepository.update(profile.id, {
      identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
    });

    return {
      vendorSessionId: session.vendorSessionId,
      vendorSessionUrl: session.vendorSessionUrl,
      attemptNumber,
    };
  }

  async listDocuments(userId: string): Promise<IdentityDocument[]> {
    const profile = await this.getOrCreateProfile(userId);
    return this.documentRepository.find({ where: { profileId: profile.id } });
  }

  // SVC-20/SVC-24: read-only, metadata-only internal surface. Never
  // exposes document images, raw vendor payloads, document_ref, or the
  // raw failure_code column. Consumer-scoping (what a hiring client vs. a
  // team owner may see) is the calling service's responsibility, not
  // this one's (Doc 04 §8b, TRVG2 §6) — this method returns the full,
  // confirmed internal shape to an already-authorized internal caller.
  async getStatusForInternalCaller(userId: string): Promise<InternalCallerStatus> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new ProfileNotFoundException();

    const attemptCount = await this.getAccountWideAttemptCount(profile.id);
    const isVerified =
      profile.identityVerificationStatus === IdentityVerificationStatus.VERIFIED &&
      profile.locationVerificationStatus === LocationVerificationStatus.VERIFIED;
    const inGrace =
      profile.expiredAt !== null &&
      Date.now() - profile.expiredAt.getTime() < 30 * 24 * 60 * 60 * 1000;
    const gateOpen = isVerified || inGrace;

    return {
      identityVerificationStatus: profile.identityVerificationStatus,
      locationVerificationStatus: profile.locationVerificationStatus,
      isVerified,
      gateOpen,
      inGrace,
      attemptCount,
      failureReason: coarseFailureReason(profile.identityVerificationStatus),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async handleDiditWebhook(
    payload: DiditWebhookPayloadDto,
    signatureHeader: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const verified = verifyDiditWebhookSignature(
      rawBody,
      signatureHeader,
      process.env.DIDIT_WEBHOOK_SECRET as string,
    );
    if (!verified) throw new InvalidWebhookSignatureException();

    const existingAttempt = await this.attemptRepository.findOne({
      where: { vendorSessionId: payload.vendorSessionId },
    });
    if (existingAttempt) {
      // Idempotent: this delivery has already been processed (Didit
      // re-delivering, or a genuine duplicate).
      return;
    }

    const pendingSession = await this.pendingSessionRepository.findOne({
      where: { vendorSessionId: payload.vendorSessionId },
    });
    if (!pendingSession) throw new UnknownVendorSessionException();

    // PLACEHOLDER OUTCOME/DEPTH/AGE MAPPING — confirm against Didit's
    // real payload once its documentation is available. This document
    // reads these under placeholder keys on the raw passthrough field,
    // same status as the rest of this file's Didit-facing code.
    const raw = payload.raw as
      | {
          outcome?: string;
          failure_code?: string;
          verification_depth?: string;
          under_age?: boolean;
          eligible_on?: string;
        }
      | undefined;
    const outcome = raw?.outcome ?? AttemptOutcome.ERROR;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const accountWideAttemptTotal = await queryRunner.manager.count(VerificationAttempt, {
        where: { profileId: pendingSession.profileId },
      });

      const attempt = queryRunner.manager.create(VerificationAttempt, {
        profileId: pendingSession.profileId,
        documentId: pendingSession.documentId,
        vendorSessionId: pendingSession.vendorSessionId,
        attemptMethod: pendingSession.attemptMethod,
        attemptDocumentType: pendingSession.attemptDocumentType,
        attemptOutcome: outcome,
        attemptNumber: pendingSession.attemptNumber,
        vpnProxyDetectionResult: pendingSession.vpnProxyDetectionResult,
        failureCode: raw?.failure_code ?? null,
      });
      const savedAttempt = await queryRunner.manager.save(attempt);
      await queryRunner.manager.delete(PendingVerificationSession, pendingSession.id);

      if (raw?.verification_depth && pendingSession.documentId) {
        await queryRunner.manager.update(IdentityDocument, pendingSession.documentId, {
          verificationDepth: raw.verification_depth as IdentityDocument['verificationDepth'],
        });
      }

      // TRVG2 §3 transition table.
      if (outcome === AttemptOutcome.APPROVED) {
        await queryRunner.manager.update(IdentityVerificationProfile, savedAttempt.profileId, {
          identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
        });
      } else if (raw?.under_age) {
        // No source specifies how Didit actually conveys an under-18
        // result; raw.under_age/raw.eligible_on are this pass's own
        // placeholder keys, flagged the same way as the rest of this
        // handler's Didit-facing mapping.
        await queryRunner.manager.update(IdentityVerificationProfile, savedAttempt.profileId, {
          identityVerificationStatus: IdentityVerificationStatus.BLOCKED_AGE,
          eligibleOn: raw.eligible_on ?? null,
        });
      } else if (outcome === AttemptOutcome.REJECTED) {
        const attemptNumberForCeiling = accountWideAttemptTotal + 1;
        if (attemptNumberForCeiling >= RETRY_LIMIT) {
          await queryRunner.manager.update(IdentityVerificationProfile, savedAttempt.profileId, {
            identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL,
            failedFinalAt: new Date(),
          });
        } else {
          await queryRunner.manager.update(IdentityVerificationProfile, savedAttempt.profileId, {
            identityVerificationStatus: IdentityVerificationStatus.FAILED,
          });
        }
      }
      // AttemptOutcome.ERROR (in-band vendor error, not a network
      // failure): leave status unchanged. No source resolves whether an
      // in-band error should drive a FAILED transition — not decided
      // here (Doc 05 Section 4).

      await queryRunner.commitTransaction();

      if (outcome === AttemptOutcome.APPROVED) {
        const profile = await this.profileRepository.findOne({ where: { id: savedAttempt.profileId } });
        await this.events.publish({
          eventType: IdentityVerificationEventType.IDENTITY_VERIFIED,
          profileId: savedAttempt.profileId,
          userId: profile?.userId || payload.vendorSessionId,
          occurredAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Auto-clearing (TRVG2 §3) ---
  // Called by StatusAutoClearJob's daily sweep. TRVG2: these transitions
  // "must fire without user action" — a scheduled evaluation, not a
  // check performed only on next login.

  async clearExpiredFailedFinal(): Promise<number> {
    const cutoff = new Date(Date.now() - FAILED_FINAL_COOLDOWN_MS);
    const due = await this.profileRepository.find({
      where: {
        identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL,
        failedFinalAt: LessThanOrEqual(cutoff),
      },
    });
    for (const profile of due) {
      await this.profileRepository.update(profile.id, {
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        failedFinalAt: null,
      });
    }
    return due.length;
  }

  async clearEligibleBlockedAge(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const due = await this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.identity_verification_status = :status', {
        status: IdentityVerificationStatus.BLOCKED_AGE,
      })
      .andWhere('profile.eligible_on IS NOT NULL')
      .andWhere('profile.eligible_on <= :today', { today })
      .getMany();
    for (const profile of due) {
      await this.profileRepository.update(profile.id, {
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        eligibleOn: null,
      });
    }
    return due.length;
  }

  async evaluateDocumentExpiry(): Promise<number> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const due = await this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.identity_verification_status = :status', {
        status: IdentityVerificationStatus.VERIFIED,
      })
      .andWhere('profile.document_expires_on IS NOT NULL')
      .andWhere('profile.document_expires_on <= :today', { today })
      .getMany();
    for (const profile of due) {
      await this.profileRepository.update(profile.id, {
        identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
        expiredAt: now,
      });
    }
    await this.profileRepository
      .createQueryBuilder()
      .update(IdentityVerificationProfile)
      .set({ lastEvaluatedAt: now })
      .where('identity_verification_status != :unstarted', {
        unstarted: IdentityVerificationStatus.UNSTARTED,
      })
      .execute();
    return due.length;
  }
}
