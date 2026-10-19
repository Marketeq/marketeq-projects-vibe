import { HttpException, HttpStatus } from '@nestjs/common';

/** Which of the acting contractor's own verification requirements is outstanding. */
export type OutstandingVerificationRequirement = 'identity' | 'location' | 'both';

// Bodies use payout-service's own error shape (`errorCode`, read by
// GlobalExceptionFilter), with the same stable codes the other verification
// gates return so one frontend branch can handle all of them.

/**
 * Account-verification gate G9 (withdraw earnings): the contractor has not
 * satisfied gate_open = is_verified OR in_grace. Carries only the acting
 * contractor's own outstanding requirement - never a status value, failure
 * reason, document or vendor detail.
 */
export class VerificationRequiredException extends HttpException {
  constructor(missingRequirements: OutstandingVerificationRequirement) {
    super(
      {
        errorCode: 'VERIFICATION_REQUIRED',
        message: 'Verify your account to continue.',
        missingRequirements,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * The gate could not be evaluated (identity-verification-service unreachable,
 * timed out, not configured, or answered with something unusable). The
 * withdrawal is refused, not allowed: an unanswered gate is a closed gate.
 */
export class IdentityVerificationUnavailableException extends HttpException {
  constructor() {
    super(
      {
        errorCode: 'IDENTITY_VERIFICATION_UNAVAILABLE',
        message: "We couldn't confirm your verification status. Please try again shortly.",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
