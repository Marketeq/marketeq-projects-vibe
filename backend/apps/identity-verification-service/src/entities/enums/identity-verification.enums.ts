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

export enum IdentityVerificationStatus {
  NOT_VERIFIED = 'not_verified',
  SUBMITTED_PENDING_REVIEW = 'submitted_pending_review',
  VERIFIED = 'verified',
  REJECTED_BLOCKED = 'rejected_blocked',
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
