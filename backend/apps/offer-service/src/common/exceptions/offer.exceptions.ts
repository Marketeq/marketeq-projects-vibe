// apps/offer-service/src/common/exceptions/offer.exceptions.ts
// OS-13: All typed exception classes for offer-service.
// Every error in offer-service should be thrown as one of these classes (or a new one
// added here) — never as a raw HttpException with inline objects.
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all typed exceptions in offer-service.
 * The exception filter reads errorCode to populate the "error" field.
 */
export class OfferServiceException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    httpStatus: HttpStatus,
  ) {
    super({ errorCode, message }, httpStatus);
  }
}

// =============================================================================
// 401 — Unauthorized
// =============================================================================
export class InvalidTokenException extends OfferServiceException {
  constructor() {
    super('UNAUTHORIZED', 'A valid token is required. Please sign in.', HttpStatus.UNAUTHORIZED);
  }
}

// =============================================================================
// 403 — Forbidden
// =============================================================================
export class ForbiddenAccessException extends OfferServiceException {
  constructor() {
    super('FORBIDDEN', 'You do not have permission to perform this action.', HttpStatus.FORBIDDEN);
  }
}

export class NotOfferPartyException extends OfferServiceException {
  constructor() {
    super('FORBIDDEN', 'You do not have access to this offer.', HttpStatus.FORBIDDEN);
  }
}

export class ClientOnlyActionException extends OfferServiceException {
  constructor() {
    super('FORBIDDEN', 'This action is only available to clients.', HttpStatus.FORBIDDEN);
  }
}

export class TalentOnlyActionException extends OfferServiceException {
  constructor() {
    super('FORBIDDEN', 'This action is only available to talent.', HttpStatus.FORBIDDEN);
  }
}

export class CannotAcceptOwnCounterOfferException extends OfferServiceException {
  constructor() {
    super(
      'CANNOT_ACCEPT_OWN_COUNTER_OFFER',
      'You cannot accept your own counter offer.',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class CannotHireSelfException extends OfferServiceException {
  constructor() {
    super('CANNOT_HIRE_SELF', 'You cannot send an offer to yourself.', HttpStatus.FORBIDDEN);
  }
}

// =============================================================================
// 404 — Not Found
// =============================================================================
export class OfferNotFoundException extends OfferServiceException {
  constructor() {
    super('OFFER_NOT_FOUND', 'Offer not found.', HttpStatus.NOT_FOUND);
  }
}

export class CounterOfferNotFoundException extends OfferServiceException {
  constructor() {
    super('COUNTER_OFFER_NOT_FOUND', 'Counter offer not found.', HttpStatus.NOT_FOUND);
  }
}

// =============================================================================
// 409 — Conflict (state machine violations)
// =============================================================================

// ---- Active offer constraint ----
export class ActiveOfferAlreadyExistsException extends OfferServiceException {
  public readonly activeOfferId: string;
  public readonly activeOfferStatus: string;

  constructor(activeOfferId: string, activeOfferStatus: string) {
    super(
      'ACTIVE_OFFER_ALREADY_EXISTS',
      'An active offer already exists for this client-talent pair. Withdraw the existing offer before sending a new one.',
      HttpStatus.CONFLICT,
    );
    this.activeOfferId = activeOfferId;
    this.activeOfferStatus = activeOfferStatus;
  }
}

// ---- Offer state violations ----
export class OfferNotActionableException extends OfferServiceException {
  constructor(currentStatus: string) {
    super(
      'OFFER_NOT_ACTIONABLE',
      `This action is not available because the offer is currently ${currentStatus.toLowerCase()}.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class OfferAlreadyAcceptedException extends OfferServiceException {
  constructor() {
    super('OFFER_ALREADY_ACCEPTED', 'This offer has already been accepted.', HttpStatus.CONFLICT);
  }
}

export class OfferAlreadyDeclinedException extends OfferServiceException {
  constructor() {
    super('OFFER_ALREADY_DECLINED', 'This offer has already been declined.', HttpStatus.CONFLICT);
  }
}

export class OfferAlreadyWithdrawnException extends OfferServiceException {
  constructor() {
    super('OFFER_ALREADY_WITHDRAWN', 'This offer has already been withdrawn.', HttpStatus.CONFLICT);
  }
}

export class OfferExpiredException extends OfferServiceException {
  constructor() {
    super(
      'OFFER_EXPIRED',
      'This offer has expired. The client can resend it if you are still interested.',
      HttpStatus.CONFLICT,
    );
  }
}

export class OfferNotResendableException extends OfferServiceException {
  constructor() {
    super(
      'OFFER_NOT_RESENDABLE',
      'Only expired, declined, or withdrawn offers can be resent.',
      HttpStatus.CONFLICT,
    );
  }
}

// ---- Counter offer state violations ----
export class CounterOfferAlreadyPendingException extends OfferServiceException {
  constructor() {
    super(
      'COUNTER_OFFER_ALREADY_PENDING',
      'A counter offer is already pending. Withdraw or wait for a response before submitting another.',
      HttpStatus.CONFLICT,
    );
  }
}

export class CounterOfferNotActionableException extends OfferServiceException {
  constructor(currentStatus: string) {
    super(
      'COUNTER_OFFER_NOT_ACTIONABLE',
      `This action is not available because the counter offer is currently ${currentStatus.toLowerCase()}.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class CounterOfferWithdrawnException extends OfferServiceException {
  constructor() {
    super(
      'COUNTER_OFFER_WITHDRAWN',
      'This counter offer has been withdrawn. The original offer is still active.',
      HttpStatus.CONFLICT,
    );
  }
}

export class CounterOfferExpiredException extends OfferServiceException {
  constructor() {
    super(
      'COUNTER_OFFER_EXPIRED',
      'This counter offer has expired. The original offer is still active.',
      HttpStatus.CONFLICT,
    );
  }
}

// ---- Talent availability ----
export class TalentNotAvailableException extends OfferServiceException {
  constructor() {
    super(
      'TALENT_NOT_AVAILABLE',
      'This talent is no longer available to receive offers.',
      HttpStatus.CONFLICT,
    );
  }
}

// =============================================================================
// 422 — Validation Error (manual; class-validator handled by filter)
// =============================================================================
export class OfferValidationException extends OfferServiceException {
  constructor(message: string, public readonly field?: string) {
    super('VALIDATION_ERROR', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// =============================================================================
// 500 — Internal Server Error (documentation only — never throw manually)
// =============================================================================
export class InternalOfferException extends OfferServiceException {
  constructor() {
    super(
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again. If the issue persists, contact support.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
// =============================================================================
// Account-verification gate G4 (offer creation / acceptance by a gated talent)
// =============================================================================

/**
 * The talent on this offer has not satisfied gate_open. Returned to the CLIENT
 * acting on that talent (create, edit, resend, counter, counter-accept):
 * deliberately generic. TRVG2 section 6 lets a client learn only that the hire
 * action is closed - never a verification status, a reason or what is missing.
 */
export class TalentNotHireableException extends OfferServiceException {
  constructor() {
    super('TALENT_NOT_HIREABLE', 'This freelancer isn’t available to hire right now', HttpStatus.FORBIDDEN);
  }
}

/**
 * The acting TALENT has not satisfied gate_open (accept, counter, counter-
 * accept on their own offer). Carries only the talent's OWN outstanding
 * requirement so the existing "Verify My Account" entry can open - never a
 * status value, failure reason, document or vendor detail.
 */
export class VerificationRequiredException extends OfferServiceException {
  constructor(public readonly missingRequirements: 'identity' | 'location' | 'both') {
    super('VERIFICATION_REQUIRED', 'Verify your account to continue.', HttpStatus.FORBIDDEN);
  }
}

/**
 * The gate could not be evaluated (identity-verification-service unreachable,
 * timed out, not configured, or answered with something unusable). The action
 * is refused with no side effects: an unanswered gate is a closed gate.
 */
export class IdentityVerificationUnavailableException extends OfferServiceException {
  constructor() {
    super(
      'IDENTITY_VERIFICATION_UNAVAILABLE',
      "We couldn't complete this action right now. Please try again shortly.",
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
