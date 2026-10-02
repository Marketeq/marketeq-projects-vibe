import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class DomainException extends HttpException {
  abstract readonly code: string;
  constructor(message: string, status: HttpStatus, details?: Record<string, unknown>) {
    super({ message, details }, status);
  }
}

export class DuplicateDocumentException extends DomainException {
  readonly code = 'DUPLICATE_DOCUMENT';
  constructor(details?: Record<string, unknown>) {
    super('A document with this number is already on file under a different account.', HttpStatus.CONFLICT, details);
  }
}

export class RetryLimitExceededException extends DomainException {
  readonly code = 'RETRY_LIMIT_EXCEEDED';
  constructor(details?: Record<string, unknown>) {
    super('The maximum of three verification attempts has been reached.', HttpStatus.TOO_MANY_REQUESTS, details);
  }
}

export class DocumentExpiredException extends DomainException {
  readonly code = 'DOCUMENT_EXPIRED';
  constructor(details?: Record<string, unknown>) {
    super('This document has already expired.', HttpStatus.BAD_REQUEST, details);
  }
}

export class VpnProxyDetectedException extends DomainException {
  readonly code = 'VPN_PROXY_DETECTED';
  constructor(details?: Record<string, unknown>) {
    super('Verification cannot proceed while a VPN or proxy is detected.', HttpStatus.FORBIDDEN, details);
  }
}

export class VendorUnavailableException extends DomainException {
  readonly code = 'VENDOR_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super('The verification vendor is temporarily unavailable. Try again shortly.', HttpStatus.BAD_GATEWAY, details);
  }
}

// Distinct from VpnProxyDetectedException: this fires when the connection
// check itself could not produce a result (timeout, provider outage,
// invalid credentials, exhausted quota, malformed response) — never a
// confirmed clean or masked answer. Per the settled policy, this must
// never be treated as "none" and must block continuation exactly like a
// detected VPN/proxy would, without implying one was actually found.
export class ConnectionCheckUnavailableException extends DomainException {
  readonly code = 'CONNECTION_CHECK_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super("We couldn't check your connection. Please try again later.", HttpStatus.SERVICE_UNAVAILABLE, details);
  }
}

export class LocationLookupUnavailableException extends DomainException {
  readonly code = 'LOCATION_LOOKUP_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super("We couldn't detect your location. Please try again later.", HttpStatus.SERVICE_UNAVAILABLE, details);
  }
}

export class ProfileNotFoundException extends DomainException {
  readonly code = 'PROFILE_NOT_FOUND';
  constructor(details?: Record<string, unknown>) {
    super('No identity verification profile exists for this account yet.', HttpStatus.NOT_FOUND, details);
  }
}

export class DocumentNotFoundException extends DomainException {
  readonly code = 'DOCUMENT_NOT_FOUND';
  constructor(details?: Record<string, unknown>) {
    super('No matching document was found for this account.', HttpStatus.NOT_FOUND, details);
  }
}

export class NoDetectedLocationException extends DomainException {
  readonly code = 'NO_DETECTED_LOCATION';
  constructor(details?: Record<string, unknown>) {
    super('No detected location is available to confirm yet.', HttpStatus.CONFLICT, details);
  }
}

export class ClassificationRequiredException extends DomainException {
  readonly code = 'CLASSIFICATION_REQUIRED';
  constructor(details?: Record<string, unknown>) {
    super('Record a Temporarily Traveling classification before declaring a travel duration.', HttpStatus.CONFLICT, details);
  }
}

export class InvalidWebhookSignatureException extends DomainException {
  readonly code = 'INVALID_SIGNATURE';
  constructor(details?: Record<string, unknown>) {
    super('Webhook signature verification failed.', HttpStatus.UNAUTHORIZED, details);
  }
}

export class UnknownVendorSessionException extends DomainException {
  readonly code = 'UNKNOWN_VENDOR_SESSION';
  constructor(details?: Record<string, unknown>) {
    super('No verification attempt matches this vendor session.', HttpStatus.NOT_FOUND, details);
  }
}

// Distinct from UnsupportedDocumentForCountryException: this fires when the
// coverage lookup itself could not produce an answer (the committed coverage
// catalog failed its integrity check — see CatalogDocumentCoverageProvider) —
// never a confirmed "this type isn't accepted" result. Callers must fail
// closed on this (block submission, show error/retry in the UI), the same
// policy already applied to ConnectionCheckUnavailableException and
// LocationLookupUnavailableException.
export class DocumentCoverageUnavailableException extends DomainException {
  readonly code = 'DOCUMENT_COVERAGE_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super("We couldn't load accepted documents for that country. Please try again later.", HttpStatus.SERVICE_UNAVAILABLE, details);
  }
}

export class UnsupportedDocumentForCountryException extends DomainException {
  readonly code = 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY';
  constructor(details?: Record<string, unknown>) {
    super('This document type is not accepted for the selected issuing country.', HttpStatus.BAD_REQUEST, details);
  }
}

// The vendor document check hasn't produced a usable result yet — either
// it was never run, or it ran but the standalone response had no portrait
// (e.g. PORTRAIT_IMAGE_NOT_DETECTED-equivalent). Distinct from a real
// Declined decision: this is "not ready", never treated as a rejection.
export class DocumentNotEligibleForBiometricVerificationException extends DomainException {
  readonly code = 'DOCUMENT_NOT_ELIGIBLE_FOR_BIOMETRIC_VERIFICATION';
  constructor(details?: Record<string, unknown>) {
    super('This document is not yet ready for face verification.', HttpStatus.CONFLICT, details);
  }
}

// The vendor call for this stage failed for reasons unrelated to the
// user's document/face (auth/credit/rate-limit/transport/malformed
// response) — never surfaced as a rejection of the user. Implies a
// DEFINITE failure: either no response was needed (a local validation
// failure) or a response WAS received confirming the vendor did not
// produce a usable result. Safe to retry immediately/freely.
export class VendorStageUnavailableException extends DomainException {
  readonly code = 'VENDOR_STAGE_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super('The verification vendor is temporarily unavailable. Try again shortly.', HttpStatus.BAD_GATEWAY, details);
  }
}

// The authenticated reconcile action (POST kyc-sessions/reconcile) could not
// get a trustworthy answer from the vendor — a lookup failure, or a decision
// that did not demonstrably belong to the caller's own session. Fail-closed:
// nothing was changed. details.reason is one of the fixed reasons only (a vendor
// error class name or a decision_* ownership code), never a value.
export class KycReconciliationUnavailableException extends DomainException {
  readonly code = 'KYC_RECONCILIATION_UNAVAILABLE';
  constructor(details?: Record<string, unknown>) {
    super('We could not check your verification right now. Try again shortly.', HttpStatus.BAD_GATEWAY, details);
  }
}

// Distinct from VendorStageUnavailableException: no HTTP response was
// ever received (network failure, or the adapter's own request timeout
// aborting a hung connection — see AmbiguousVendorOutcomeError), so
// whether the vendor actually processed the request is genuinely
// unknown. Unlike VendorStageUnavailableException, a caller must NOT
// treat this as safe to retry immediately without consequence — see
// TwoStageVerificationService.checkDocumentWithVendor, which does not
// release the attempt reservation on this specific error so an ambiguous
// outcome still counts toward the account-wide ceiling until it
// self-heals via RESERVATION_TTL_MS.
export class VendorOutcomeUnknownException extends DomainException {
  readonly code = 'VENDOR_OUTCOME_UNKNOWN';
  constructor(details?: Record<string, unknown>) {
    super(
      "We couldn't confirm whether this step completed. Please wait a moment before trying again.",
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }
}

// A biometric-session webhook referenced a didit_session_id this service
// never created. Never trusted enough to change any status.
export class UnknownBiometricSessionException extends DomainException {
  readonly code = 'UNKNOWN_BIOMETRIC_SESSION';
  constructor(details?: Record<string, unknown>) {
    super('No biometric session matches this webhook.', HttpStatus.NOT_FOUND, details);
  }
}

// startVerificationSession (the old hosted-Sessions-API path) no longer
// creates new attempts — superseded by the two-stage flow
// (TwoStageVerificationService). This is a permanent, code-level retirement
// of NEW attempts on this path, not a runtime-toggleable bypass — it fixes
// a real concurrency race in that method's own attempt-ceiling check
// (see its own comment). It does NOT, on its own, establish that any
// PendingVerificationSession row still around is safe to approve via
// webhook; that is a separate question, resolved separately (and more
// conservatively) in handleDiditWebhook — see that method's comment for
// why "predates retirement" was tried and rejected as a safety argument.
export class LegacyVerificationPathRetiredException extends DomainException {
  readonly code = 'LEGACY_VERIFICATION_PATH_RETIRED';
  constructor(details?: Record<string, unknown>) {
    super(
      'This verification method has been retired. Please use the current document and face verification flow.',
      HttpStatus.GONE,
      details,
    );
  }
}

// Free KYC (Didit-hosted) start/resume gate: a current, server-recorded
// home-country confirmation is required, and it can't coexist with active
// Travel Mode / a temporary-travel classification.
export class HomeCountryConfirmationRequiredException extends DomainException {
  readonly code = 'HOME_COUNTRY_CONFIRMATION_REQUIRED';
  constructor(details?: Record<string, unknown>) {
    super('Please confirm your home country before verifying your identity.', HttpStatus.CONFLICT, details);
  }
}

// The profile's current identity-verification status doesn't allow starting
// a new hosted session (already verified, awaiting review, or blocked).
export class KycNotStartableException extends DomainException {
  readonly code = 'IDENTITY_VERIFICATION_NOT_STARTABLE';
  constructor(details?: Record<string, unknown>) {
    super('Identity verification cannot be started right now.', HttpStatus.CONFLICT, details);
  }
}

// 404 on purpose: Didit retries a 404 (not a 4xx), which covers the narrow
// race where a webhook arrives before our own session row is committed.
export class UnknownKycSessionException extends DomainException {
  readonly code = 'UNKNOWN_KYC_SESSION';
  constructor(details?: Record<string, unknown>) {
    super('No hosted verification session matches this webhook.', HttpStatus.NOT_FOUND, details);
  }
}
