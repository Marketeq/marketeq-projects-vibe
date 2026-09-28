export enum TravelClassification {
  TEMPORARILY_TRAVELING = 'temporarily_traveling',
  PERMANENTLY_RELOCATED = 'permanently_relocated',
}

export enum DeclaredDuration {
  A_FEW_DAYS = 'a_few_days',
  ONE_TO_TWO_WEEKS = 'one_to_two_weeks',
  MORE_THAN_TWO_WEEKS = 'more_than_two_weeks',
  NOT_SURE = 'not_sure',
}

// TRVG2 §1.1 ("Verification status") nine-value enumeration, replacing the
// earlier four-value placeholder model. See TRVG2 §3 ("State Transitions")
// for the full transition table: UNSTARTED -> IN_PROGRESS -> PENDING ->
// VERIFIED; PENDING can instead go to FAILED / FAILED_FINAL / BLOCKED_DUPLICATE
// / BLOCKED_AGE; FAILED_FINAL and BLOCKED_AGE both auto-clear back to
// UNSTARTED (24h cooldown / eligible_on respectively); VERIFIED -> EXPIRED
// on document_expires_on, which returns to IN_PROGRESS on a new session.
export enum IdentityVerificationStatus {
  UNSTARTED = 'unstarted',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  FAILED_FINAL = 'failed_final',
  BLOCKED_DUPLICATE = 'blocked_duplicate',
  BLOCKED_AGE = 'blocked_age',
  EXPIRED = 'expired',
}

export enum LocationVerificationStatus {
  NOT_VERIFIED = 'not_verified',
  SUBMITTED_PENDING_REVIEW = 'submitted_pending_review',
  VERIFIED = 'verified',
}

export enum DocumentType {
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
  DRIVERS_LICENCE = 'drivers_licence',
  RESIDENCE_PERMIT = 'residence_permit',
}

export enum CaptureMethod {
  SCAN = 'scan',
  MANUAL_ENTRY = 'manual_entry',
}

export enum VerificationDepth {
  REGISTRY_VALIDATED = 'registry_validated',
  AUTHENTICATED = 'authenticated',
}

export enum AttemptOutcome {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ERROR = 'error',
}

export enum VpnProxyDetectionResult {
  NONE = 'none',
  VPN_DETECTED = 'vpn_detected',
  PROXY_DETECTED = 'proxy_detected',
  VPN_AND_PROXY_DETECTED = 'vpn_and_proxy_detected',
}

// Result of the standalone Didit document-check call (POST
// /v3/id-verification/) for one IdentityDocument row. Distinct from
// IdentityVerificationStatus, which is the account-wide, both-stages
// outcome — this is one stage's own vendor result only.
export enum DocumentCheckStatus {
  APPROVED = 'approved',
  DECLINED = 'declined',
  // Vendor call failed (transport/auth/rate-limit/malformed response) —
  // distinct from a real Declined decision. Never written as a terminal
  // result; a retry can still succeed.
  UNAVAILABLE = 'unavailable',
}

// Our own tracked status for a Didit-hosted biometric session, updated
// only by a verified webhook — never by the redirect return from Didit's
// page (see providers/webhooks/README-style header comments).
export enum BiometricSessionStatus {
  CREATED = 'created',
  APPROVED = 'approved',
  DECLINED = 'declined',
  IN_REVIEW = 'in_review',
  EXPIRED = 'expired',
}
