import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../../entities/enums/identity-verification.enums';

// RabbitMQ request/reply contract for the synchronous gate check (TRVG2 §2:
// gate_open(account) := is_verified(account) OR in_grace(account)). Consuming
// services enforce the gate at their own action endpoints; this service only
// answers, it never enforces (Doc 00 §3 items 15–16, Doc 02 SVC-20).
//
// Consumers keep their own copy of these names — services do not import each
// other's src (Doc 01 §16) — so any change here is a cross-service contract
// change.
export const IDENTITY_VERIFICATION_RPC_QUEUE = 'identity_verification_rpc_queue';
export const ACCOUNT_GATE_CHECK_PATTERN = 'identity_verification.gate_check';

// Which requirement(s) keep the gate closed. 'none' whenever the gate is open,
// including when it is open only because the account is inside its grace
// window.
export type MissingVerificationRequirement = 'identity' | 'location' | 'both' | 'none';

export interface AccountGateCheckRequest {
  userId: string;
}

// Deliberately narrow: only what a consumer needs to enforce the gate and tell
// the acting user which requirement is outstanding. Raw verification statuses
// and the grace flag are used INSIDE this service to compute the answer and
// are never sent (TRVG2 section 6: verification internals do not leave the
// owning service); neither are attempt counts, failure reasons, timestamps,
// document or vendor data.
export interface AccountGateDecision {
  gateOpen: boolean;
  missingRequirements: MissingVerificationRequirement;
}

// Derived from the already-computed gateOpen, never from a second copy of the
// gate formula: an open gate has nothing missing; a closed gate is missing
// whichever of the two statuses is not VERIFIED.
export function deriveMissingRequirements(
  identityStatus: IdentityVerificationStatus,
  locationStatus: LocationVerificationStatus,
  gateOpen: boolean,
): MissingVerificationRequirement {
  if (gateOpen) return 'none';
  const identityMissing = identityStatus !== IdentityVerificationStatus.VERIFIED;
  const locationMissing = locationStatus !== LocationVerificationStatus.VERIFIED;
  if (identityMissing && locationMissing) return 'both';
  if (identityMissing) return 'identity';
  if (locationMissing) return 'location';
  // Unreachable while gateOpen is derived from the same statuses (both
  // VERIFIED implies is_verified, which opens the gate). Fail closed rather
  // than report 'none' on a closed gate if that invariant is ever broken.
  return 'both';
}

// The single definition of gate_open for a profile (TRVG2 section 2):
// gate_open = is_verified OR in_grace. Shared by the internal status (RabbitMQ
// gate decision) and the GET /me response, so no reader recomputes it.
// Grace is a renewal window: it holds through EXPIRED, IN_PROGRESS, PENDING and
// FAILED renewal states (TRVG2 2.7/2.8) for 30 days after expired_at, but never
// for a currently VERIFIED identity, so a stale expired_at cannot keep a gate open.
export const GRACE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface GateProfileInput {
  identityVerificationStatus: IdentityVerificationStatus;
  locationVerificationStatus: LocationVerificationStatus;
  expiredAt?: Date | null;
}

export function computeGateState(
  profile: GateProfileInput,
  nowMs: number,
): { isVerified: boolean; inGrace: boolean; gateOpen: boolean } {
  const isVerified =
    profile.identityVerificationStatus === IdentityVerificationStatus.VERIFIED &&
    profile.locationVerificationStatus === LocationVerificationStatus.VERIFIED;
  const inGrace =
    profile.expiredAt instanceof Date &&
    profile.identityVerificationStatus !== IdentityVerificationStatus.VERIFIED &&
    nowMs - profile.expiredAt.getTime() < GRACE_WINDOW_MS;
  return { isVerified, inGrace, gateOpen: isVerified || inGrace };
}
