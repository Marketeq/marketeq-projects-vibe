import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  DeclaredDuration,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';
import { coarseFailureReason } from '../../common/status/coarse-failure-reason';
import { NextAction, VerificationSummary } from '../../common/status/verification-summary';
import { computeGateState } from '../../common/gate/account-gate-decision';
import { deriveTravelModeState, deriveTravelReminderSchedule } from '../../common/travel-mode/travel-mode-state';

export class ProfileStatusResponseDto {
  verifiedHomeCountry!: string | null;
  detectedCountry!: string | null;
  detectedRegionState!: string | null;
  detectedCity!: string | null;
  timeZone!: string | null;

  travelClassification!: TravelClassification | null;
  declaredDuration!: DeclaredDuration | null;
  travelModeActive!: boolean;
  // Append-only Travel Mode additions, derived from the stored activation, the
  // duration, the last reminder claim and the server clock (never the job's raw
  // reminder cursor). The ISO fields are null whenever there is no value.
  /** Exact end of the activation (also for an ended period); null without a valid activation. */
  travelModeEndsAt!: string | null;
  /** A valid activation exists and its end has passed. */
  travelModeExpired!: boolean;
  /** An unclaimed day-3 or day-7 reminder is due now. */
  travelReminderDue!: boolean;
  /** Time of the earliest unclaimed reminder; null when none is left or Travel Mode is not active. */
  travelReminderAvailableAt!: string | null;

  identityVerificationStatus!: IdentityVerificationStatus;
  identityRejectionReason!: string | null;
  locationVerificationStatus!: LocationVerificationStatus;

  reconfirmationRequired!: boolean;

  /**
   * Returning-user new-location signal: a verified home country exists, the live IP
   * country is known and different, and Travel Mode is not in force. Computed on
   * GET /me only (see IdentityVerificationService.getLocationMismatch); false
   * everywhere else. Never stored.
   */
  locationMismatch!: boolean;

  // Backward-compatible summary additions. fullyVerified is derived from the two
  // statuses alone, so it is on every response that carries this DTO. The rest
  // need hosted-session data and are present only where a summary is supplied
  // (GET /me); responses that do not supply one simply omit them. See
  // common/status/verification-summary.ts for the nextAction contract.
  fullyVerified!: boolean;
  /**
   * gate_open = is_verified OR in_grace (the same definition the RabbitMQ gate
   * decision uses). Unlike fullyVerified it stays true for a talent inside the
   * 30-day grace window, so a screen that gates an action must read this, not
   * fullyVerified. The grace flag itself, expired_at and the raw statuses'
   * meaning stay inside this service; only the boolean is exposed.
   */
  gateOpen!: boolean;
  nextAction?: NextAction;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  maxAttempts?: number;
  canRetry?: boolean;
  retryAvailableAt?: string | null;
  hasActiveSession?: boolean;

  // Home-country change (append-only, and OMITTED unless it applies, so every
  // response for an account with no relocation claim keeps exactly its old keys).
  // The country the account claimed it moved to, still awaiting Didit's approval;
  // verifiedHomeCountry above is unchanged until an approval promotes it. Attempts
  // and the cooldown are the ordinary fields (attemptsRemaining, retryAvailableAt).
  pendingHomeCountry?: string;

  /**
   * An account in Travel Mode is detected in a country different from its verified
   * home country (the "still traveling?" prompt's signal). OMITTED unless true, so
   * every other response keeps exactly its old keys. Never stored; computed on GET
   * /me only. Unlike locationMismatch it is only ever true while Travel Mode is in
   * force.
   */
  travelModeLocationMismatch?: boolean;

  /**
   * Duration answers saved by check-ins in the current Travel Mode cycle. OMITTED while
   * it is 0 (absent means 0 = the first check-in has not been answered); present and
   * positive once an answer was saved, which is when later check-ins use the "asked
   * before" copy. Skipping or closing a check-in never changes it.
   */
  travelCheckInCount?: number;

  /**
   * An opaque key for THIS login (a one-way digest of the verified token's session id,
   * see common/travel-mode/login-session-key.ts), so the browser can remember per login
   * that a popup was shown or dismissed without ever seeing the session id. Stable for a
   * login across refreshes; different for every new login and every account. OMITTED when
   * the token has no valid session id. GET /me only.
   */
  loginSessionKey?: string;

  static fromEntity(
    profile: IdentityVerificationProfile,
    summary?: VerificationSummary,
    nowMs: number = Date.now(),
    locationMismatch: boolean = false,
    loginReminderAt: Date | null = null,
    travelModeLocationMismatch: boolean = false,
    loginSessionKey: string | null = null,
  ): ProfileStatusResponseDto {
    const dto = new ProfileStatusResponseDto();
    dto.verifiedHomeCountry = profile.verifiedHomeCountry;
    dto.detectedCountry = profile.detectedCountry;
    dto.detectedRegionState = profile.detectedRegionState;
    dto.detectedCity = profile.detectedCity;
    dto.timeZone = profile.timeZone;
    dto.travelClassification = profile.travelClassification;
    dto.declaredDuration = profile.declaredDuration;
    dto.travelModeActive = profile.travelModeActive;
    const travelMode = deriveTravelModeState(profile, nowMs);
    dto.travelModeEndsAt = travelMode.endsAt ? travelMode.endsAt.toISOString() : null;
    dto.travelModeExpired = travelMode.state === 'expired';
    const reminder = deriveTravelReminderSchedule(profile, nowMs, loginReminderAt);
    dto.travelReminderDue = reminder.due;
    dto.travelReminderAvailableAt = reminder.availableAt ? reminder.availableAt.toISOString() : null;
    dto.identityVerificationStatus = profile.identityVerificationStatus;
    dto.identityRejectionReason =
      profile.identityRejectionReason ?? coarseFailureReason(profile.identityVerificationStatus);
    dto.locationVerificationStatus = profile.locationVerificationStatus;
    dto.locationMismatch = locationMismatch === true;
    dto.reconfirmationRequired = Boolean(
      profile.verifiedHomeCountry && profile.detectedCountry && profile.verifiedHomeCountry !== profile.detectedCountry,
    );
    // Both conditions are required: identity verified AND location verified.
    dto.fullyVerified =
      profile.identityVerificationStatus === IdentityVerificationStatus.VERIFIED &&
      profile.locationVerificationStatus === LocationVerificationStatus.VERIFIED;
    dto.gateOpen = computeGateState(profile, nowMs).gateOpen;
    if (profile.pendingHomeCountry) dto.pendingHomeCountry = profile.pendingHomeCountry;
    if (travelModeLocationMismatch === true) dto.travelModeLocationMismatch = true;
    if (profile.travelCheckInCount > 0) dto.travelCheckInCount = profile.travelCheckInCount;
    if (typeof loginSessionKey === 'string' && loginSessionKey.length > 0) dto.loginSessionKey = loginSessionKey;
    if (summary) {
      dto.nextAction = summary.nextAction;
      dto.attemptsUsed = summary.attemptsUsed;
      dto.attemptsRemaining = summary.attemptsRemaining;
      dto.maxAttempts = summary.maxAttempts;
      dto.canRetry = summary.canRetry;
      dto.retryAvailableAt = summary.retryAvailableAt;
      dto.hasActiveSession = summary.hasActiveSession;
    }
    return dto;
  }
}
