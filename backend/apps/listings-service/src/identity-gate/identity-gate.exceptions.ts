import { HttpException, HttpStatus } from '@nestjs/common';

/** Which of the acting user's own verification requirements is outstanding. */
export type OutstandingVerificationRequirement = 'identity' | 'location' | 'both';

/**
 * Account-verification gate G2 (publish a talent-owned listing): the talent
 * has not satisfied gate_open = is_verified OR in_grace. Carries only the
 * acting talent's own outstanding requirement - never a status value, failure
 * reason, document or vendor detail, and never anything about another account.
 * `missingRequirements` is omitted when the caller is not the gated owner
 * (a system caller), so nobody learns another account's verification state.
 */
export class VerificationRequiredException extends HttpException {
  constructor(missingRequirements?: OutstandingVerificationRequirement) {
    super(
      {
        success: false,
        error: 'VERIFICATION_REQUIRED',
        message: 'Verify your account to publish this listing.',
        ...(missingRequirements ? { missingRequirements } : {}),
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
export class IdentityVerificationUnavailableException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: 'IDENTITY_VERIFICATION_UNAVAILABLE',
        message: "We couldn't confirm your verification status. Please try again shortly.",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
