import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { GpsLocationResponseDto } from '../dto/response/gps-location.response.dto';
import { countryNameFromCode } from '../dto/response/detected-location.response.dto';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import {
  TravelClassification,
  DeclaredDuration,
  HostedKycSessionStatus,
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
  HomeCountryChangeInProgressException,
  TravelModeAlreadyActiveException,
  TravelModeNotActiveException,
  TravelModeConfirmationUnavailableException,
  TravelCheckInAlreadyAnsweredException,
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
import {
  clearPendingRelocation,
  hasPendingHomeCountryChange,
  isRelocationUnfinished,
  shouldHoldNewCountryAsPending,
} from '../common/home-country-change/home-country-change';
import { VerificationSummaryService } from './verification-summary.service';
import { StatusAlertPublisher } from '../events/status-alert.publisher';
import {
  deriveTravelModeState,
  deriveTravelReminderSchedule,
  expireTravelModeIfDue,
  travelModeSuppressesLocationPrompt,
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
    // Appended after `verificationSummary` so no earlier position moves. Optional so a missing
    // publisher can never break a Travel Mode activation (PMCM-651).
    @Optional()
    private readonly statusAlerts?: StatusAlertPublisher,
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
    // A home-country claim, or the Didit session behind it, is unfinished: the banner or
    // gate carries the user through it, so no new-location prompt is offered.
    if (isRelocationUnfinished(profile)) return false;
    if (travelModeSuppressesLocationPrompt(profile, nowMs)) return false;
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
   * The active-traveler counterpart of getLocationMismatch: true only while Travel
   * Mode is in force (a valid activation that has not ended, still flagged active),
   * a verified home country exists, and the request's live IP country is known and
   * DIFFERENT from it. getLocationMismatch deliberately stays false during Travel
   * Mode, so a traveler is only ever offered the "still traveling?" prompt through
   * this separate signal. It says nothing about WHEN to show it: the screen shows
   * it once per login. Read-only, the same free local IP lookup, and an
   * unavailable lookup, a missing IP or an unknown country is simply false.
   */
  async getTravelModeLocationMismatch(
    profile: IdentityVerificationProfile,
    ipAddress?: string | null,
    nowMs: number = Date.now(),
  ): Promise<boolean> {
    const home = profile.verifiedHomeCountry;
    if (!home || !ipAddress) return false;
    if (isRelocationUnfinished(profile)) return false;
    if (!profile.travelModeActive || deriveTravelModeState(profile, nowMs).state !== 'active') return false;
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
    // A claim whose Didit session is running or in review is neither cleared nor replaced
    // by any confirmation (same country or another): the linked session's approval must
    // still be able to promote it. Rejected before anything is read or written below.
    if (existing) this.assertNoUnfinishedRelocation(existing);
    // An already verified account (or one whose home-country change is already
    // in flight) never has its verified home country overwritten by an IP
    // reading, whatever route got here and whether or not a relocation was
    // declared first: a DIFFERENT detected country becomes PENDING, and only a
    // Didit approval replaces the verified one. Re-confirming the SAME country
    // moves nothing: it falls through to the ordinary refresh below, which also
    // drops any claim for another country.
    if (existing && (await this.shouldHoldCountry(existing, detected.countryCode))) {
      if (detected.countryCode !== existing.verifiedHomeCountry) {
        return this.confirmPendingHomeCountry(existing, detected);
      }
      clearPendingRelocation(existing);
    }
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
    profile.travelCheckInCount = 0;

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

  /**
   * Confirming a DIFFERENT country for an account that already has a verified home
   * country. The detected country was resolved server-side from the request IP just
   * now and the user explicitly confirmed it. verifiedHomeCountry, the location
   * status and Travel Mode are NOT touched: the claim is stored as pending and only a
   * Didit approval of the session linked to it promotes it (and ends Travel Mode).
   *
   * Re-confirming the SAME pending country refreshes the 15-minute basis and keeps
   * its session link, so valid retries continue; a DIFFERENT country is a new claim
   * and unlinks the old session. The identity status, its attempt cycle and its
   * cooldown are never touched here.
   */
  private async confirmPendingHomeCountry(
    profile: IdentityVerificationProfile,
    detected: { countryCode: string; regionState?: string | null; city?: string | null },
  ): Promise<IdentityVerificationProfile> {
    // Travel Mode and the travel classification are left exactly as they are: only an
    // approval of this claim's Didit session ends them (see FreeKycService).
    profile.detectedCountry = detected.countryCode;
    profile.detectedRegionState = (detected.regionState ?? null) as string | null;
    profile.detectedCity = (detected.city ?? null) as string | null;

    if (profile.pendingHomeCountry !== detected.countryCode) {
      profile.pendingHomeCountry = detected.countryCode;
      profile.pendingRelocationSessionId = null;
    }
    profile.pendingHomeCountryConfirmedAt = new Date();
    return this.profileRepository.save(profile);
  }

  /**
   * Whether confirming `detectedCountry` must be held as a pending claim instead of
   * overwriting the verified home country. Besides the verified / claim-in-flight
   * cases, an account whose identity was verified before (expired, or a Didit
   * approval on record) is held too, so an abandoned or withdrawn relocation can
   * never let a plain confirmation replace the country Didit vouched for. Looked up
   * only for a verified home country that the detected country would change.
   */
  private async shouldHoldCountry(profile: IdentityVerificationProfile, detectedCountry: string): Promise<boolean> {
    if (shouldHoldNewCountryAsPending(profile)) return true;
    if (!profile.verifiedHomeCountry || detectedCountry === profile.verifiedHomeCountry) return false;
    const everApproved = await this.dataSource
      .getRepository(HostedKycSession)
      .exist({ where: { profileId: profile.id, status: HostedKycSessionStatus.APPROVED } });
    return shouldHoldNewCountryAsPending(profile, { everApproved });
  }

  // --- Travel / Relocation ---

  async recordTravelClassification(
    userId: string,
    classification: TravelClassification,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);

    if (classification === TravelClassification.PERMANENTLY_RELOCATED) {
      // An account with a verified home country keeps it, its location status and
      // its Travel Mode while the claim is pending: nothing is recorded by this click.
      // The claim is created only by the explicit country confirmation, and nothing
      // is replaced until Didit approves the change.
      if (shouldHoldNewCountryAsPending(profile)) return profile;
      // Any other account has no verified home country to protect: the relocation
      // routes back through location verification (SVC-07, 00 §3 item 4).
      profile.travelClassification = classification;
      profile.locationVerificationStatus = LocationVerificationStatus.NOT_VERIFIED;
      return this.profileRepository.save(profile);
    }

    // Choosing "traveling" withdraws a pending relocation claim, so an old
    // home-country-change session can never promote it afterwards. Never while that
    // claim's Didit session is running or in review: it would strand the account.
    this.assertNoUnfinishedRelocation(profile);
    clearPendingRelocation(profile);
    profile.travelClassification = classification;
    return this.profileRepository.save(profile);
  }

  // A claim whose Didit session is running or waiting for a decision is not withdrawn.
  private assertNoUnfinishedRelocation(profile: IdentityVerificationProfile): void {
    if (
      hasPendingHomeCountryChange(profile) &&
      (profile.identityVerificationStatus === IdentityVerificationStatus.IN_PROGRESS ||
        profile.identityVerificationStatus === IdentityVerificationStatus.PENDING)
    ) {
      throw new HomeCountryChangeInProgressException();
    }
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
    // The classification is saved together with the duration (below), never before it,
    // so there is no "classified but no duration" state to require or to strand in.
    // A running or in-review home-country change is not talked over by Travel Mode.
    this.assertNoUnfinishedRelocation(found);

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
    // Choosing "traveling" withdraws an old claim that has no unfinished session (the
    // guard above refused one that has), in this same write.
    const withdrawsClaim = hasPendingHomeCountryChange(profile);
    const result = await this.profileRepository.update(
      {
        id: profile.id,
        travelModeActive: false,
        travelModeActivatedAt: observedActivation,
        declaredDuration: profile.declaredDuration ?? IsNull(),
        // The claim guard held against this status; if a relocation session started
        // meanwhile the write does not match and is rejected.
        ...(withdrawsClaim ? { identityVerificationStatus: profile.identityVerificationStatus } : {}),
      },
      {
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        ...(withdrawsClaim
          ? { pendingHomeCountry: null, pendingHomeCountryConfirmedAt: null, pendingRelocationSessionId: null }
          : {}),
        declaredDuration: duration,
        travelModeActive: true,
        travelModeActivatedAt: now,
        // A new activation starts its own reminder schedule: nothing from a
        // previous activation may suppress it.
        lastTravelReminderSentAt: null,
        nextTravelReminderAt: firstReminderAt,
        // A new activation is a new cycle: its first check-in is unanswered again.
        travelCheckInCount: 0,
      },
    );
    if (result.affected !== 1) {
      throw withdrawsClaim ? new HomeCountryChangeInProgressException() : new TravelModeAlreadyActiveException();
    }

    profile.travelClassification = TravelClassification.TEMPORARILY_TRAVELING;
    if (withdrawsClaim) clearPendingRelocation(profile);
    profile.declaredDuration = duration;
    profile.travelModeActive = true;
    profile.travelModeActivatedAt = now;
    profile.lastTravelReminderSentAt = null;
    profile.nextTravelReminderAt = firstReminderAt;
    profile.travelCheckInCount = 0;

    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED,
      profileId: profile.id,
      userId,
      occurredAt: now.toISOString(),
    });
    // One persistent alert per activation, keyed by the activation time (a new activation
    // is a new key, so it shows again after the previous one was dismissed).
    await this.statusAlerts?.travelMode(userId, now);
    return profile;
  }

  /**
   * An already-active traveler chose "Temporarily traveling" on Update: Travel Mode is confirmed
   * again. Nothing on the profile changes (the period keeps its dates, duration and reminder
   * schedule); the only effect is a new persistent "Travel Mode is on" alert occurrence, keyed
   * by the client's confirmationId. Accepted only while Travel Mode is in force and no
   * home-country change is running, like the check-in answer. If the alert could not be handed
   * to notification-service the request fails (503) and nothing is recorded, so the client can
   * retry with the same id.
   */
  async confirmActiveTravelMode(userId: string, confirmationId: string): Promise<IdentityVerificationProfile> {
    const found = await this.profileRepository.findOne({ where: { userId } });
    if (!found) throw new TravelModeNotActiveException();
    this.assertNoUnfinishedRelocation(found);
    const profile = await expireTravelModeIfDue(this.profileRepository, found, Date.now(), this.logger);
    if (
      profile.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING ||
      !profile.travelModeActive ||
      deriveTravelModeState(profile, Date.now()).state !== 'active'
    ) {
      throw new TravelModeNotActiveException();
    }
    const handedOver = (await this.statusAlerts?.travelModeConfirmed(userId, confirmationId)) === true;
    if (!handedOver) throw new TravelModeConfirmationUnavailableException();
    return profile;
  }

  /**
   * The answer to a "Still traveling?" check-in: an active traveler saves a new duration.
   * recordTravelDuration keeps rejecting an active period, so a normal activation request
   * can never replace one by accident; this is the one explicit path that does.
   *
   * Only a saved duration is an answer, "Not sure" included. Opening, closing, skipping or
   * refreshing a check-in calls nothing, and a failed request writes nothing, so the same
   * occurrence stays due.
   *
   * It updates the existing row (there is no second period to overlap): the new period
   * starts now and ends at the new duration's expiry (it restarts from the response time,
   * it is not added to the old end), the check-in schedule restarts from now (the
   * resolved-up-to time is cleared, so nothing a previous period resolved can suppress it),
   * and an ANSWER (a request with `checkInAt`) also raises the answer count by one, which
   * ends the five-minute-after-login check-in for this cycle. A REVISION (no `checkInAt`)
   * edits the answer that was just given: same update and restart, but the count is
   * neither read as a new answer nor changed. Only Travel Mode columns are written: identity and location
   * status, the verified home country and any home-country claim are untouched, and a
   * running or in-review home-country change refuses the answer outright.
   *
   * One occurrence is resolved at most once. The write is a compare-and-set on the period,
   * the count and the resolved-up-to time that were observed, so of any number of
   * simultaneous answers exactly one applies. `options.checkInAt` closes the sequential
   * case: it is the `travelReminderAvailableAt` the caller was shown, and it must still be
   * the current unresolved occurrence, otherwise another tab already resolved it and this
   * request is rejected without writing. Without it the request is a voluntary revision of
   * the duration (the confirmation's Back): it resolves no occurrence, counts nothing, and
   * keeps the same compare-and-set on the period, the count and the resolved-up-to time.
   */
  async updateActiveTravelDuration(
    userId: string,
    duration: DeclaredDuration,
    options: { checkInAt?: Date | null; session?: LoginSession | null } = {},
  ): Promise<IdentityVerificationProfile> {
    const found = await this.profileRepository.findOne({ where: { userId } });
    if (!found) throw new TravelModeNotActiveException();
    this.assertNoUnfinishedRelocation(found);

    // Lazy expiry first, exactly like the activation: an ended period (or active data with
    // no trustworthy end) is deactivated and is then simply not active.
    const nowMs = Date.now();
    const profile = await expireTravelModeIfDue(this.profileRepository, found, nowMs, this.logger);
    if (
      profile.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING ||
      !profile.travelModeActive ||
      deriveTravelModeState(profile, nowMs).state !== 'active'
    ) {
      throw new TravelModeNotActiveException();
    }
    const observedActivation = profile.travelModeActivatedAt;
    if (!(observedActivation instanceof Date)) throw new TravelModeNotActiveException();
    const observedCount = profile.travelCheckInCount ?? 0;

    if (options.checkInAt) {
      const current = this.getTravelCheckIn(
        profile,
        options.session ?? null,
        nowMs,
      );
      if (
        !current.availableAt ||
        current.availableAt.getTime() !== options.checkInAt.getTime()
      ) {
        throw new TravelCheckInAlreadyAnsweredException();
      }
    }

    // Only an answer to an occurrence counts; a revision edits the answer already counted.
    const countsAsAnswer = Boolean(options.checkInAt);
    const observedResolvedUpTo = profile.lastTravelReminderSentAt;
    const now = new Date(nowMs);
    const nextReminderAt = new Date(nowMs + FIRST_REMINDER_AFTER_ACTIVATION_MS);
    // A claim with no live session may exist (it is recoverable and left exactly as it is).
    // A relocation session that starts between the guard above and the write changes the
    // identity status, so the write is pinned to the status the guard saw.
    const pinsStatus = hasPendingHomeCountryChange(profile);
    const result = await this.profileRepository.update(
      {
        id: profile.id,
        travelModeActive: true,
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActivatedAt: observedActivation,
        declaredDuration: profile.declaredDuration ?? IsNull(),
        travelCheckInCount: observedCount,
        lastTravelReminderSentAt: observedResolvedUpTo ?? IsNull(),
        ...(pinsStatus
          ? { identityVerificationStatus: profile.identityVerificationStatus }
          : {}),
      },
      {
        declaredDuration: duration,
        travelModeActivatedAt: now,
        lastTravelReminderSentAt: null,
        nextTravelReminderAt: nextReminderAt,
        ...(countsAsAnswer ? { travelCheckInCount: observedCount + 1 } : {}),
      },
    );
    if (result.affected !== 1) {
      const fresh = await this.profileRepository.findOne({ where: { id: profile.id } });
      if (fresh && fresh.travelModeActive && deriveTravelModeState(fresh, Date.now()).state === 'active') {
        if (pinsStatus && fresh.identityVerificationStatus !== profile.identityVerificationStatus) {
          throw new HomeCountryChangeInProgressException();
        }
        throw new TravelCheckInAlreadyAnsweredException();
      }
      throw new TravelModeNotActiveException();
    }

    profile.declaredDuration = duration;
    profile.travelModeActivatedAt = now;
    profile.lastTravelReminderSentAt = null;
    profile.nextTravelReminderAt = nextReminderAt;
    if (countsAsAnswer) profile.travelCheckInCount = observedCount + 1;
    return profile;
  }

  /**
   * The check-in schedule for a profile as GET /me reports it: the earliest unresolved
   * occurrence (day 3, day 6 or 7, or this login's five-minute occurrence) and whether it
   * is due. Pure and read-only, the one derivation /me, the due check and the answer's
   * occurrence check share.
   */
  private getTravelCheckIn(
    profile: IdentityVerificationProfile,
    session: LoginSession | null,
    nowMs: number,
  ) {
    const loginAt = session
      ? deriveLoginReminderAt(profile, session.authTimeMs, nowMs)
      : null;
    return deriveTravelReminderSchedule(profile, nowMs, loginAt);
  }

  /**
   * Whether a check-in is due for the caller right now. READ-ONLY: it claims, consumes and
   * writes nothing (an expired period is deactivated first, as on every read). A check-in
   * stays due until it is resolved by a saved duration answer or by starting the
   * home-country update flow, so opening, closing, skipping, refreshing or navigating away
   * from it reports it again. It is kept as POST travel-reminder/claim for clients that
   * still call it; GET /me (travelReminderDue) says the same thing.
   */
  async isTravelCheckInDue(
    userId: string,
    session: LoginSession | null = null,
  ): Promise<{ due: boolean }> {
    const found = await this.profileRepository.findOne({ where: { userId } });
    if (!found) return { due: false };
    const nowMs = Date.now();
    const profile = await expireTravelModeIfDue(
      this.profileRepository,
      found,
      nowMs,
      this.logger,
    );
    return { due: this.getTravelCheckIn(profile, session, nowMs).due };
  }

  /**
   * This login's five-minute occurrence to report on GET /me: the time it is due, or null
   * when the token has no usable session, the period was not active at login, it is over,
   * the first check-in was already answered, or it was resolved. Pure and read-only.
   */
  getLoginReminderAt(
    profile: IdentityVerificationProfile,
    session: LoginSession | null,
    nowMs: number = Date.now(),
  ): Date | null {
    return session
      ? deriveLoginReminderAt(profile, session.authTimeMs, nowMs)
      : null;
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
