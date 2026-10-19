import { Injectable, Inject, Logger } from '@nestjs/common';
import { GpsLocationResponseDto } from '../dto/response/gps-location.response.dto';
import { countryNameFromCode } from '../dto/response/detected-location.response.dto';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThan, LessThanOrEqual, Or, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
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
  TravelModeAlreadyActiveException,
  InvalidWebhookSignatureException,
  UnknownVendorSessionException,
  VpnProxyDetectedException,
  UnsupportedDocumentForCountryException,
  LegacyVerificationPathRetiredException,
  LocationLookupUnavailableException,
} from '../common/errors/domain-exceptions';
import { verifyDiditWebhookSignature } from '../common/utils/verify-didit-webhook-signature';
import {
  normalizeDocumentNumber,
  hashDocumentNumber,
} from '../common/security/document-fingerprint';
import { coarseFailureReason } from '../common/status/coarse-failure-reason';
import { AccountGateBatchEntry, AccountGateDecision, computeGateState, deriveMissingRequirements } from '../common/gate/account-gate-decision';
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
import { FAILED_FINAL_COOLDOWN_MS } from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import { NextAction } from '../common/status/verification-summary';
import { VerificationSummaryService } from './verification-summary.service';
import {
  deriveTravelModeState,
  deriveTravelReminderClaim,
  expireTravelModeIfDue,
  travelModeBlocksNewSession,
} from '../common/travel-mode/travel-mode-state';
import { deriveLoginReminderAt, LoginSession } from '../common/travel-mode/login-reminder';

// First Travel Mode reminder is due 3 days after activation (approved
// reminder days: 3 and 7).
const FIRST_REMINDER_AFTER_ACTIVATION_MS = 3 * 24 * 60 * 60 * 1000;

export interface InternalCallerStatus {
  identityVerificationStatus: IdentityVerificationStatus;
  locationVerificationStatus: LocationVerificationStatus;
  isVerified: boolean;
  gateOpen: boolean;
  inGrace: boolean;
  // Hosted Free KYC attempts in the current retry cycle (3 while a final failure
  // is cooling down) — no longer the all-rows count across every pipeline.
  attemptCount: number;
  // Backward-compatible summary additions (see common/status/verification-summary.ts).
  fullyVerified: boolean;
  nextAction: NextAction;
  attemptsRemaining: number;
  maxAttempts: number;
  canRetry: boolean;
  retryAvailableAt: string | null;
  hasActiveSession: boolean;
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
    // Appended last so every earlier constructor position is unchanged.
    private readonly verificationSummary: VerificationSummaryService,
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
    const found = await this.profileRepository.findOne({ where: { userId } });
    // Lazy expiry: a Travel Mode whose period is over is ended (and persisted)
    // before anything reads or returns this profile.
    const existing = found
      ? await expireTravelModeIfDue(this.profileRepository, found, Date.now(), this.logger)
      : null;
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
   * Returning-user new-location signal for GET /me. True only when the profile has
   * a verified home country, the request's live IP country is known and differs
   * from it, and Travel Mode is not in force (the same rule that already stops a
   * new session while Travel Mode is active or pending). The live country comes
   * from the free local IP lookup (provider.resolve): never the GPS or display
   * paths, so no reverse-geocoding quota is spent. Read-only: nothing is stored.
   * An unavailable lookup, a missing IP or an unknown country is simply false, so
   * a location-service outage can never fail or change the status response.
   */
  async getLocationMismatch(
    profile: IdentityVerificationProfile,
    ipAddress?: string | null,
    nowMs: number = Date.now(),
  ): Promise<boolean> {
    const home = profile.verifiedHomeCountry;
    if (!home || !ipAddress) return false;
    if (travelModeBlocksNewSession(profile, nowMs)) return false;
    try {
      const live = await this.locationProvider.resolve({ ipAddress });
      const liveCountry = live?.countryCode;
      if (!liveCountry) return false;
      return liveCountry.toUpperCase() !== home.toUpperCase();
    } catch (err) {
      if (err instanceof LocationLookupUnavailableException) return false;
      throw err;
    }
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
    // The stored row is read as it is, before any normalization, so active data
    // with no trustworthy end is seen as such (see below). A brand-new profile
    // has nothing stored yet and is created here.
    const stored = await this.profileRepository.findOne({ where: { userId } });
    const found = stored ?? (await this.getOrCreateProfile(userId));
    if (found.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING) {
      throw new ClassificationRequiredException();
    }

    // Extending or shortening Travel Mode while it is in force is not
    // supported: only the first duration, or a new one after the previous
    // period has ended, is accepted.
    const nowMs = Date.now();
    const state = deriveTravelModeState(found, nowMs).state;
    if (state === 'active') throw new TravelModeAlreadyActiveException();

    // An ended period (or active data with no trustworthy end) is deactivated
    // and persisted by the shared expiry helper. The profile it returns, which
    // is the freshly reloaded row if another request got there first, is the
    // one the activation below is based on.
    const profile = await expireTravelModeIfDue(this.profileRepository, found, nowMs, this.logger);
    // Untrustworthy active data fails closed: it is now deactivated, but this
    // request does not activate anything. A later retry may proceed.
    if (state === 'invalid') throw new TravelModeAlreadyActiveException();
    if (profile.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING) {
      throw new ClassificationRequiredException();
    }
    if (deriveTravelModeState(profile, nowMs).state === 'active') throw new TravelModeAlreadyActiveException();

    // Compare-and-set on what this request observed AFTER expiry: not active,
    // and the same (preserved) previous activation time and duration, or none.
    // Of any number of concurrent requests only one can match; the rest lose
    // and are rejected without writing, so a duration is never replaced.
    const now = new Date(nowMs);
    const firstReminderAt = new Date(nowMs + FIRST_REMINDER_AFTER_ACTIVATION_MS);
    const observedActivation =
      profile.travelModeActivatedAt instanceof Date && Number.isFinite(profile.travelModeActivatedAt.getTime())
        ? profile.travelModeActivatedAt
        : IsNull();
    const result = await this.profileRepository.update(
      {
        id: profile.id,
        travelModeActive: false,
        travelModeActivatedAt: observedActivation,
        declaredDuration: profile.declaredDuration ?? IsNull(),
      },
      {
        declaredDuration: duration,
        travelModeActive: true,
        travelModeActivatedAt: now,
        // A new activation starts its own reminder schedule: nothing from a
        // previous activation may suppress it.
        lastTravelReminderSentAt: null,
        nextTravelReminderAt: firstReminderAt,
      },
    );
    if (result.affected !== 1) throw new TravelModeAlreadyActiveException();

    profile.declaredDuration = duration;
    profile.travelModeActive = true;
    profile.travelModeActivatedAt = now;
    profile.lastTravelReminderSentAt = null;
    profile.nextTravelReminderAt = firstReminderAt;

    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED,
      profileId: profile.id,
      userId,
      occurredAt: now.toISOString(),
    });
    return profile;
  }

  /**
   * Claims the next Travel Mode reminder for the dashboard, for the caller's own
   * profile only. Returns { claimed: true } to exactly one of any number of
   * simultaneous callers; everyone else, and every case where nothing is
   * claimable (no profile, not active, pending, invalid, expired, nothing due,
   * everything already claimed), gets { claimed: false }. It never creates a
   * profile and never throws for those cases.
   *
   * Only lastTravelReminderSentAt is written (the reminder job stays the sole
   * owner of nextTravelReminderAt and of the travel_mode_still_active event, and
   * no event is published here). The write is one compare-and-set on the id, the
   * flag still being active and the activation time and duration this call
   * observed, with the stored claim time null or earlier than the latest due
   * reminder, so a claim made against an older activation can never consume a
   * newer one's reminders, and a future or unusable stored claim time claims
   * nothing.
   */
  async claimTravelReminder(
    userId: string,
    session: LoginSession | null = null,
  ): Promise<{ claimed: boolean }> {
    const found = await this.profileRepository.findOne({ where: { userId } });
    if (!found) return { claimed: false };

    // Lazy expiry first: an ended period (or active data with no trustworthy end,
    // which takes the fail-safe) is deactivated before anything is claimed.
    const nowMs = Date.now();
    const profile = await expireTravelModeIfDue(this.profileRepository, found, nowMs, this.logger);

    const claim = deriveTravelReminderClaim(profile, nowMs);

    // This login session's own reminder (5 minutes after authentication), when the
    // verified token carries a usable session and the period was active at login.
    const loginAt = session ? deriveLoginReminderAt(profile, session.authTimeMs, nowMs) : null;
    const loginDue = session !== null && loginAt !== null && loginAt.getTime() <= nowMs;

    if (!claim && !loginDue) return { claimed: false };
    if (!loginDue) {
      // Day 3 / day 7 only: exactly the original single compare-and-set.
      return { claimed: await this.claimDayReminder(this.profileRepository, profile, claim!.latestDue, nowMs) };
    }
    return this.claimWithLoginReminder(profile, claim, (session as LoginSession).sid, nowMs);
  }

  /**
   * The login-session reminder to report on GET /me: the time it is due, or null when
   * the token has no usable session, the period was not active at login, it is over,
   * or this session's reminder was already claimed. Read-only; a lookup failure only
   * means "no login reminder" (it never fails or changes the status response).
   */
  async getLoginReminderAt(
    profile: IdentityVerificationProfile,
    session: LoginSession | null,
    nowMs: number = Date.now(),
  ): Promise<Date | null> {
    if (!session) return null;
    const dueAt = deriveLoginReminderAt(profile, session.authTimeMs, nowMs);
    if (!dueAt) return null;
    try {
      const rows: unknown[] = await this.dataSource.query(
        `SELECT 1 FROM identity_verification.travel_login_reminder_claims
         WHERE profile_id = $1 AND session_id = $2 LIMIT 1`,
        [profile.id, session.sid],
      );
      return rows.length > 0 ? null : dueAt;
    } catch {
      this.logger.error('Travel Mode login reminder lookup failed; reporting no login reminder.');
      return null;
    }
  }

  // The day 3 / day 7 claim: one atomic compare-and-set on the profile's
  // lastTravelReminderSentAt, against whatever repository the caller is using.
  private async claimDayReminder(
    repository: Pick<Repository<IdentityVerificationProfile>, 'update'>,
    profile: IdentityVerificationProfile,
    latestDue: Date,
    nowMs: number,
  ): Promise<boolean> {
    const result = await repository.update(
      {
        id: profile.id,
        travelModeActive: true,
        travelModeActivatedAt: profile.travelModeActivatedAt as Date,
        declaredDuration: profile.declaredDuration as DeclaredDuration,
        lastTravelReminderSentAt: Or(IsNull(), LessThan(latestDue)),
      },
      { lastTravelReminderSentAt: new Date(nowMs) },
    );
    return result.affected === 1;
  }

  /**
   * Claims a due login-session reminder together with any day reminder that is due at the
   * same moment, so an overlap is ONE popup. One transaction under a per-profile advisory
   * lock: of any number of simultaneous claimers (tabs, refreshes) exactly one gets
   * { claimed: true } for everything due, the rest get nothing. The session's claim is a
   * unique (profile, session) row, so a refresh or another tab of the SAME login can
   * never claim it twice, while a new login (new session id) gets its own.
   */
  private async claimWithLoginReminder(
    profile: IdentityVerificationProfile,
    dayClaim: { latestDue: Date } | null,
    sessionId: string,
    nowMs: number,
  ): Promise<{ claimed: boolean }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`travel-reminder-claim:${profile.id}`]);
      const inserted: unknown[] = await queryRunner.query(
        `INSERT INTO identity_verification.travel_login_reminder_claims (profile_id, session_id)
         VALUES ($1, $2)
         ON CONFLICT (profile_id, session_id) DO NOTHING
         RETURNING id`,
        [profile.id, sessionId],
      );
      const dayClaimed = dayClaim
        ? await this.claimDayReminder(
            queryRunner.manager.getRepository(IdentityVerificationProfile),
            profile,
            dayClaim.latestDue,
            nowMs,
          )
        : false;
      await queryRunner.commitTransaction();
      return { claimed: inserted.length === 1 || dayClaimed };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
  /** Backward-compatible summary for the account holder's own /me response. */
  getVerificationSummary(profile: IdentityVerificationProfile) {
    return this.verificationSummary.summarize(profile);
  }

  async getStatusForInternalCaller(userId: string): Promise<InternalCallerStatus> {
    const found = await this.profileRepository.findOne({ where: { userId } });
    if (!found) throw new ProfileNotFoundException();
    const profile = await expireTravelModeIfDue(this.profileRepository, found, Date.now(), this.logger);

    // Hosted Free KYC current-cycle count and the stable next action. The old
    // all-rows counter (every pipeline, never reset) is deliberately not used here.
    const summary = await this.verificationSummary.summarize(profile);
    // gate_open has one definition (common/gate/account-gate-decision.ts).
    const { isVerified, inGrace, gateOpen } = computeGateState(profile, Date.now());

    return {
      identityVerificationStatus: profile.identityVerificationStatus,
      locationVerificationStatus: profile.locationVerificationStatus,
      isVerified,
      gateOpen,
      inGrace,
      attemptCount: summary.attemptsUsed,
      fullyVerified: summary.fullyVerified,
      nextAction: summary.nextAction,
      attemptsRemaining: summary.attemptsRemaining,
      maxAttempts: summary.maxAttempts,
      canRetry: summary.canRetry,
      retryAvailableAt: summary.retryAvailableAt,
      hasActiveSession: summary.hasActiveSession,
      failureReason: coarseFailureReason(profile.identityVerificationStatus),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // Canonical gate decision for consuming services (RabbitMQ request/reply,
  // see IdentityVerificationGateController). Delegates to
  // getStatusForInternalCaller so gate_open/in_grace keep exactly one
  // definition. An account with no profile has verified nothing: the gate is
  // closed and both requirements are outstanding - it must never fall through
  // to "open" the way a missing row could if this simply propagated the
  // ProfileNotFoundException as an error.
  async getAccountGateDecision(userId: string): Promise<AccountGateDecision> {
    try {
      const status = await this.getStatusForInternalCaller(userId);
      // The raw statuses and inGrace stay in this service: they only feed the
      // two fields that are sent.
      return {
        gateOpen: status.gateOpen,
        missingRequirements: deriveMissingRequirements(
          status.identityVerificationStatus,
          status.locationVerificationStatus,
          status.gateOpen,
        ),
      };
    } catch (err) {
      if (err instanceof ProfileNotFoundException) {
        return { gateOpen: false, missingRequirements: 'both' };
      }
      throw err;
    }
  }

  // Batch form of getAccountGateDecision (G5): one query for every requested
  // account, with gate_open computed by the same computeGateState. An account
  // with no profile has verified nothing and is reported closed, exactly as in
  // the single check, so a missing row can never read as "open". Every
  // requested id gets exactly one entry.
  async getAccountGateDecisions(userIds: string[]): Promise<AccountGateBatchEntry[]> {
    const unique = Array.from(new Set(userIds));
    // user_id is a uuid column: a non-uuid id cannot match a profile, and must
    // not make the whole query throw and take the other accounts down with it.
    const queryable = unique.filter((id) => isUUID(id));
    const profiles = queryable.length
      ? await this.profileRepository.find({ where: { userId: In(queryable) } })
      : [];
    const byUser = new Map(profiles.map((p) => [p.userId, p]));
    const nowMs = Date.now();

    const decisions: AccountGateBatchEntry[] = [];
    for (const userId of unique) {
      const found = byUser.get(userId);
      if (!found) {
        decisions.push({ userId, gateOpen: false, missingRequirements: 'both' });
        continue;
      }
      const profile = await expireTravelModeIfDue(this.profileRepository, found, nowMs, this.logger);
      const { gateOpen } = computeGateState(profile, nowMs);
      decisions.push({
        userId,
        gateOpen,
        missingRequirements: deriveMissingRequirements(
          profile.identityVerificationStatus,
          profile.locationVerificationStatus,
          gateOpen,
        ),
      });
    }
    return decisions;
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
