import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exceptions carrying the doc's `{ success: false, error: CODE, message }`
 * shape. InvitationExceptionFilter renders them as-is; any other
 * HttpException thrown in this service still gets wrapped with a generic
 * code derived from its status, so nothing needs both.
 */
export class InvitationApiException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ success: false, error: code, message }, status);
  }
}

export class TokenExpiredException extends InvitationApiException {
  constructor(message = 'Invitation link has expired') {
    super(HttpStatus.GONE, 'TOKEN_EXPIRED', message);
  }
}

export class InvalidTokenException extends InvitationApiException {
  constructor(message = 'Invalid invitation token') {
    super(HttpStatus.GONE, 'INVALID_TOKEN', message);
  }
}

export class AlreadyMemberException extends InvitationApiException {
  constructor(message = 'This person is already a member') {
    super(HttpStatus.CONFLICT, 'ALREADY_MEMBER', message);
  }
}

export class AlreadyAcceptedException extends InvitationApiException {
  constructor(message = 'Invitation has already been accepted') {
    super(HttpStatus.CONFLICT, 'ALREADY_ACCEPTED', message);
  }
}

export class InvitationNotPendingException extends InvitationApiException {
  constructor(message = 'Invitation is not pending') {
    super(HttpStatus.CONFLICT, 'NOT_PENDING', message);
  }
}

export class InvitationCanceledException extends InvitationApiException {
  constructor(message = 'Invitation was canceled') {
    super(HttpStatus.CONFLICT, 'INVITATION_CANCELED', message);
  }
}

export class EmailMismatchException extends InvitationApiException {
  constructor(message = 'Email does not match invitation') {
    super(HttpStatus.FORBIDDEN, 'EMAIL_MISMATCH', message);
  }
}

export class InvitationNotFoundException extends InvitationApiException {
  constructor(message = 'Invitation not found') {
    super(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }
}

/** Which of the acting user's own verification requirements is outstanding. */
export type OutstandingVerificationRequirement = 'identity' | 'location' | 'both';

/**
 * Account-verification gate G7 (accept an invitation, gated at acceptance):
 * the acting user has not satisfied gate_open = is_verified OR in_grace.
 * Carries only the acting user's own outstanding requirement - never a
 * status value, failure reason, document or vendor detail, and never anything
 * about another account. Same `{ success, error, message }` envelope as the
 * rest of this service, plus `missingRequirements`; InvitationExceptionFilter
 * renders any body carrying `error` as-is.
 */
export class VerificationRequiredException extends HttpException {
  constructor(missingRequirements: OutstandingVerificationRequirement) {
    super(
      {
        success: false,
        error: 'VERIFICATION_REQUIRED',
        message: 'Verify your account to accept this invitation.',
        missingRequirements,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * The gate could not be evaluated (identity-verification-service unreachable,
 * timed out, not configured, or answered with something unusable). The action
 * is refused, not allowed: an unanswered gate is a closed gate.
 */
export class IdentityVerificationUnavailableException extends InvitationApiException {
  constructor(message = "We couldn't confirm your verification status. Please try again shortly.") {
    super(HttpStatus.SERVICE_UNAVAILABLE, 'IDENTITY_VERIFICATION_UNAVAILABLE', message);
  }
}
