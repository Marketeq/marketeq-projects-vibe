import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';

// Home-country change (PMCM-650). An account that already has a verified home
// country must not have it replaced by an IP reading: a different detected
// country is held as PENDING and only replaces verifiedHomeCountry when Didit
// approves the session started for that claim. The claim then runs through the
// ordinary identity states and attempt cycle (in progress, failed, failed_final
// with the 24-hour cooldown, verified), so the account is not always VERIFIED
// while it is pending. Eligibility therefore depends on the verified home
// country and the claim itself, not on the identity status.

export interface HomeCountryChangeFields {
  identityVerificationStatus?: IdentityVerificationStatus | null;
  locationVerificationStatus?: LocationVerificationStatus | null;
  verifiedHomeCountry?: string | null;
  travelClassification?: TravelClassification | null;
  pendingHomeCountry?: string | null;
}

function hasVerifiedHomeCountry(profile: HomeCountryChangeFields): boolean {
  return (
    profile.locationVerificationStatus === LocationVerificationStatus.VERIFIED &&
    typeof profile.verifiedHomeCountry === 'string' &&
    profile.verifiedHomeCountry.length > 0
  );
}

/** Identity and location verified, with a verified home country on record. */
export function canChangeHomeCountry(profile: HomeCountryChangeFields): boolean {
  return profile.identityVerificationStatus === IdentityVerificationStatus.VERIFIED && hasVerifiedHomeCountry(profile);
}

/**
 * A claim is in flight: a verified home country exists and a different country
 * is pending. True whatever the identity status is (it may be in progress,
 * failed or cooling down after a decline), so the claim survives the retries.
 */
export function hasPendingHomeCountryChange(profile: HomeCountryChangeFields): boolean {
  return hasVerifiedHomeCountry(profile) && typeof profile.pendingHomeCountry === 'string' && profile.pendingHomeCountry.length > 0;
}

/**
 * Whether confirming a DIFFERENT detected country must be stored as pending
 * instead of overwriting verifiedHomeCountry: an already verified account, or one
 * whose claim is already in flight. Any other account (first-time verification,
 * or location verified without a completed identity verification) keeps the
 * existing behaviour: there is no verified identity at stake, so the
 * confirmation sets the country.
 */
export function shouldHoldNewCountryAsPending(
  profile: HomeCountryChangeFields,
  options: { everApproved?: boolean } = {},
): boolean {
  return canChangeHomeCountry(profile) || hasPendingHomeCountryChange(profile) || hasBeenIdentityVerified(profile, options);
}

/**
 * A verified home country on an account whose identity WAS verified before (its
 * verification expired, or Didit approved a session for it) but is not verified
 * right now: after an abandoned or withdrawn relocation, or an expiry. Its home
 * country is still the one Didit vouched for, so an IP reading cannot overwrite
 * it either. `everApproved` is the caller's lookup of an approved Didit session;
 * a never-verified account (first-time verification) is not held.
 */
export function hasBeenIdentityVerified(
  profile: HomeCountryChangeFields,
  options: { everApproved?: boolean } = {},
): boolean {
  if (!hasVerifiedHomeCountry(profile)) return false;
  return profile.identityVerificationStatus === IdentityVerificationStatus.EXPIRED || options.everApproved === true;
}

/**
 * A home-country claim or its Didit session is unfinished: the claim exists, or the
 * identity status says a session is running (in progress) or waiting for a decision
 * (pending review). Location prompts stay quiet and the travel duration save is
 * refused while this holds.
 */
export function isRelocationUnfinished(profile: HomeCountryChangeFields): boolean {
  return (
    hasPendingHomeCountryChange(profile) ||
    profile.identityVerificationStatus === IdentityVerificationStatus.IN_PROGRESS ||
    profile.identityVerificationStatus === IdentityVerificationStatus.PENDING
  );
}

export interface PendingRelocationFields {
  pendingHomeCountry: string | null;
  pendingHomeCountryConfirmedAt: Date | null;
  pendingRelocationSessionId: string | null;
}

/** Drops the claimed country and its session link. */
export function clearPendingRelocation(profile: PendingRelocationFields): void {
  profile.pendingHomeCountry = null;
  profile.pendingHomeCountryConfirmedAt = null;
  profile.pendingRelocationSessionId = null;
}
