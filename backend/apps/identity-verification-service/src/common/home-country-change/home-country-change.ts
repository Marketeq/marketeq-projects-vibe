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
export function shouldHoldNewCountryAsPending(profile: HomeCountryChangeFields): boolean {
  return canChangeHomeCountry(profile) || hasPendingHomeCountryChange(profile);
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
