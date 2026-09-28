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
// coverage lookup itself could not produce an answer (no confirmed data
// source is wired in yet — see DocumentCoverageProvider's doc comment) —
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
