import { Injectable, Inject, Logger } from '@nestjs/common';
import { GpsLocationResponseDto } from '../dto/response/gps-location.response.dto';
import { countryNameFromCode } from '../dto/response/detected-location.response.dto';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import {
  TravelClassification,
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  AttemptOutcome,
  VpnProxyDetectionResult,
  DocumentType,
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
  UnsupportedDocumentForCountryException,
  LegacyVerificationPathRetiredException,
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
  DocumentCoverageProvider,
  DOCUMENT_COVERAGE_PROVIDER,
  DocumentCoverageMetadata,
  SupportedDocumentCountry,
} from '../providers/document-coverage/document-coverage-provider.interface';
import {
  VpnProxyDetectionProvider,
  VPN_PROXY_DETECTION_PROVIDER,
} from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import {
  DisplayLocation,
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
import { getAccountWideAttemptCount, RETRY_LIMIT } from '../common/attempt-limit/account-wide-attempt-count';

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
    @InjectRepository(AttemptReservation)
    private readonly reservationRepository: Repository<AttemptReservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_VERIFICATION_PROVIDER)
    private readonly documentVerificationProvider: DocumentVerificationProvider,
    @Inject(DOCUMENT_COVERAGE_PROVIDER)
    private readonly documentCoverageProvider: DocumentCoverageProvider,
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

  /**
   * Display-only lookup for the location dialog. Takes the SAME effective
   * client IP the controller hands to confirmHomeCountry, so what the user is
   * shown and what gets confirmed come from one server-side IP decision.
   * Returns null when there is no IP or the provider finds nothing; provider
   * outages propagate as LocationLookupUnavailableException.
   */
  async getDetectedLocationForDisplay(ipAddress?: string | null): Promise<DisplayLocation | null> {
    return ipAddress ? this.locationProvider.resolveDisplay({ ipAddress }) : null;
  }

  /**
   * Browser-geolocation display. The browser's coordinates are used ONLY for an
   * immediate server-side reverse geocode and are never stored or logged (they
   * are also rounded to ~1 km before leaving this method). Nothing the browser
   * sends is trusted as a place: city/region/country all come from the provider.
   *
   * The country shown is always the server-derived IP country — the same one
   * confirmHomeCountry uses. If the reverse-geocoded country disagrees with it,
   * nothing from the GPS result is shown ('country_mismatch'), so the dialog can
   * never display one country while confirming another. City, region and
   * coordinates are display-only, never identity proof.
   */
  async resolveGpsDisplay(
    ipAddress: string | null | undefined,
    latitude: number,
    longitude: number,
  ): Promise<GpsLocationResponseDto> {
    const empty = (status: GpsLocationResponseDto['status']): GpsLocationResponseDto => ({
      status,
      countryCode: null,
      countryName: null,
      city: null,
      regionCode: null,
      regionName: null,
      latitude: null,
      longitude: null,
    });

    const ipLocation = ipAddress ? await this.locationProvider.resolve({ ipAddress }) : null;
    if (!ipLocation) return empty('unavailable');

    const base = {
      ...empty('unavailable'),
      countryCode: ipLocation.countryCode,
      countryName: countryNameFromCode(ipLocation.countryCode),
    };

    // ~1.1 km: enough for a city-level pin, never a precise position.
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLon = Math.round(longitude * 100) / 100;
    const place = await this.locationProvider.resolveCoordinates({ latitude: roundedLat, longitude: roundedLon });
    if (!place || !place.countryCode) return base;

    if (place.countryCode !== ipLocation.countryCode) {
      // Fixed message: neither country (nor any coordinate) is logged.
      this.logger.warn('gps_ip_country_mismatch');
      return { ...base, status: 'country_mismatch' };
    }

    return {
      status: 'resolved',
      countryCode: ipLocation.countryCode,
      countryName: base.countryName,
      city: place.city,
      regionCode: place.regionCode,
      regionName: place.regionName,
      latitude: roundedLat,
      longitude: roundedLon,
    };
  }

  async confirmHomeCountry(
    userId: string,
    ipAddress?: string | null,
  ): Promise<IdentityVerificationProfile> {
    // The country being confirmed is ALWAYS resolved server-side from the
    // current request IP right now — never a value supplied by the client,
    // and never the stored first-ever detection (getOrCreateProfile only
    // fills detectedCountry once). Detected location, verified home country,
    // confirmation time and verified status are all written from that one
    // result in a single save.
    const detected = ipAddress ? await this.locationProvider.resolve({ ipAddress }) : null;
    if (!detected) {
      throw new NoDetectedLocationException();
    }

    const existing = await this.profileRepository.findOne({ where: { userId } });
    const profile = existing ?? this.profileRepository.create({ userId });
    const previousCountry = profile.verifiedHomeCountry;
    const isFirstConfirmation = profile.locationVerificationStatus !== LocationVerificationStatus.VERIFIED;

    // A successful, server-verified home-country confirmation ends any
    // Travel Mode: cleared in the SAME single save as the confirmation, and
    // only reached after the live location lookup succeeded (a failed lookup
    // throws above and leaves the travel state untouched).
    profile.travelModeActive = false;
    profile.travelClassification = null;
    profile.declaredDuration = null;
    profile.travelModeActivatedAt = null;
    profile.nextTravelReminderAt = null;

    profile.detectedCountry = detected.countryCode;
    profile.detectedRegionState = detected.regionState;
    profile.detectedCity = detected.city;
    profile.verifiedHomeCountry = detected.countryCode;
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

  // Backend-owned mirror of the document-selection screen's own filtering —
  // deliberately re-checked here, not trusted from the request body, so a
  // client that skips or tampers with the UI's own filtering still can't
  // submit an issuingCountry/documentType combination the coverage provider
  // doesn't back. Propagates DocumentCoverageUnavailableException as-is when
  // the provider can't determine coverage (fail closed, same policy as
  // every other "can't determine yet" boundary in this service).
  async getAcceptedDocumentTypes(issuingCountry: string): Promise<DocumentType[]> {
    return this.documentCoverageProvider.getAcceptedDocumentTypes(issuingCountry);
  }

  async getSupportedDocumentCountries(): Promise<SupportedDocumentCountry[]> {
    return this.documentCoverageProvider.getSupportedCountries();
  }

  // Version of the coverage catalog that answers getAcceptedDocumentTypes and
  // submitDocument's coverage check — the same provider, so the same catalog.
  async getDocumentCoverageMetadata(): Promise<DocumentCoverageMetadata> {
    return this.documentCoverageProvider.getCatalogMetadata();
  }

  async submitDocument(
    userId: string,
    dto: SubmitDocumentRequestDto,
  ): Promise<IdentityDocument> {
    const profile = await this.getOrCreateProfile(userId);

    const acceptedDocumentTypes = await this.documentCoverageProvider.getAcceptedDocumentTypes(
      dto.issuingCountry,
    );
    if (!acceptedDocumentTypes.includes(dto.documentType)) {
      throw new UnsupportedDocumentForCountryException({
        issuingCountry: dto.issuingCountry,
        documentType: dto.documentType,
      });
    }

    // documentNumber is absent for captureMethod=scan (SubmitDocumentRequestDto's
    // header comment) — nothing to fingerprint or duplicate-check yet at
    // submission time in that case. TwoStageVerificationService.checkDocumentWithVendor
    // runs this exact same duplicate check later, once Didit's document-check
    // extracts a real number (or never runs it, if extraction genuinely
    // produces none) — see that method's own header comment.
    const documentNumberFingerprint = dto.documentNumber
      ? hashDocumentNumber(normalizeDocumentNumber(dto.documentNumber))
      : null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let duplicate: { id: string; profile_id: string } | undefined;
      if (documentNumberFingerprint) {
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
        duplicate = matches[0];
      }

      const document = queryRunner.manager.create(IdentityDocument, {
        profileId: profile.id,
        documentType: dto.documentType,
        documentTypeLabel: dto.documentTypeLabel ?? null,
        issuingCountry: dto.issuingCountry,
        documentNumber: dto.documentNumber ?? null,
        documentNumberNormalized: documentNumberFingerprint,
        expirationDate: dto.expirationDate ?? null,
        issuingState: dto.issuingState ?? null,
        captureMethod: dto.captureMethod,
        documentImageReference: dto.documentImageReference,
        backImageReference: dto.backImageReference ?? null,
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

  private getAccountWideAttemptCount(profileId: string): Promise<number> {
    return getAccountWideAttemptCount(
      {
        attemptRepository: this.attemptRepository,
        pendingSessionRepository: this.pendingSessionRepository,
        documentRepository: this.documentRepository,
        reservationRepository: this.reservationRepository,
      },
      profileId,
    );
  }

  // RETIRED for new attempts (2026-09-26). This used to start a NEW
  // old-pipeline (hosted-Sessions-API) vendor session with only a plain
  // count-then-act ceiling check — no lock, so two concurrent calls could
  // both read a count under the ceiling and both create a session. Rather
  // than retrofit locking onto a path that's already superseded by the
  // two-stage flow, new attempts on this path are closed off entirely
  // instead: after only a document-existence check, this method now
  // always throws.
  //
  // This retirement does NOT, by itself, make it safe for handleDiditWebhook
  // to treat whatever PendingVerificationSession rows already exist as
  // trustworthy — that was this pass's original (2026-09-26) reasoning and
  // was corrected the same day (see that method's comment): predating
  // retirement only proves the row is old, not that a webhook resolving it
  // is genuine or that "Approved" means what the code assumes. This method
  // still closes off new attempts (that part of the fix stands on its own
  // merits — the concurrency race it fixes is real regardless of the
  // webhook question) — it is handleDiditWebhook's APPROVED branch that
  // was walked back separately. The vendor call, PendingVerificationSession
  // creation, and IN_PROGRESS transition this method used to perform are
  // removed as dead code, not left unreachable; see git history for the
  // prior body.
  async startVerificationSession(
    userId: string,
    documentId: string,
    _ipAddress: string | null = null,
  ): Promise<{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number }> {
    const profile = await this.getOrCreateProfile(userId);
    const document = await this.documentRepository.findOne({
      where: { id: documentId, profileId: profile.id },
    });
    if (!document) throw new DocumentNotFoundException();

    throw new LegacyVerificationPathRetiredException();
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
      //
      // 2026-09-27 correction: the previous pass (2026-09-26) restored
      // this branch to unconditionally set VERIFIED, reasoning that
      // startVerificationSession's retirement makes every remaining
      // PendingVerificationSession "predate retirement" and therefore
      // trustworthy. That reasoning was reviewed and rejected: predating
      // retirement only establishes the SESSION ROW is old — it says
      // nothing about whether a webhook claiming to resolve it is
      // genuine, or whether "Approved" actually means what this code
      // assumes. Concretely, on inspection:
      //  - `outcome` above is read from `raw.outcome`, a field this
      //    file's own comment already flags as a PLACEHOLDER never
      //    confirmed against Didit's real payload.
      //  - DiditWebhookPayloadDto (vendorSessionId/eventType/occurredAt/raw)
      //    has no decorators and no transform from Didit's real,
      //    confirmed-this-engagement snake_case envelope
      //    (session_id/event_id/webhook_type/...) — unlike
      //    didit-webhook-verification.ts's parseDiditWebhookEvent, which
      //    IS verified against that real envelope.
      //  - main.ts's global ValidationPipe runs with
      //    { whitelist: true, forbidNonWhitelisted: true }. Since
      //    DiditWebhookPayloadDto has zero validated/whitelisted
      //    properties, a real Didit payload (which has properties) would
      //    be REJECTED by that pipe before this method ever runs — this
      //    route cannot currently process a genuine Didit webhook at all.
      //  - The signature check below reads header `x-didit-signature`
      //    (identity-verification-webhooks.controller.ts), not the
      //    `x-signature`/`x-timestamp` pair confirmed this engagement as
      //    Didit's real header names.
      // None of this was verified when "predates retirement" was offered
      // as the safety argument — it wasn't evidence, it was an assumption.
      // Given that, this branch no longer sets VERIFIED at all (in either
      // direction, unconditionally or via a flag) until the payload
      // contract above is actually confirmed and fixed. The attempt is
      // still recorded (counts toward the account-wide ceiling, matching
      // the REJECTED branch below), so this is a reported gap, not a
      // silent no-op. Already-VERIFIED profiles in the database from
      // before this change are untouched by any of this — nothing here
      // reads or rewrites existing status values in bulk.
      if (outcome === AttemptOutcome.APPROVED) {
        this.logger.warn(
          `Legacy verification path received an Approved outcome for profile ${savedAttempt.profileId}, but this path's payload contract (DiditWebhookPayloadDto, the x-didit-signature header, and the raw.outcome field) is unverified against Didit's real webhook shape and cannot currently confirm this is a genuine, complete approval. Not setting VERIFIED. See handleDiditWebhook's comment for what needs confirming before this can be re-enabled.`,
        );
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
      // No IDENTITY_VERIFIED publish here — matches the branch above:
      // nothing was actually confirmed VERIFIED, so nothing to announce.
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
