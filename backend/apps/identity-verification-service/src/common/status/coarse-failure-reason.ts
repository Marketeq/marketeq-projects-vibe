import { IdentityVerificationStatus } from '../../entities/enums/identity-verification.enums';

// A coarse, non-vendor-specific reason string derived from status alone —
// never the raw verification_attempts.failure_code column, which is
// vendor-provided and server-side-only (Service Overview §3 item 12;
// TRVG2 §6.1: the internal surface never exposes vendor detail). Shared
// by the internal status endpoint (SVC-24) and the account holder's own
// profile status response so both surfaces describe a blocked/failed
// state the same way.
export function coarseFailureReason(status: IdentityVerificationStatus): string | null {
  switch (status) {
    case IdentityVerificationStatus.FAILED:
    case IdentityVerificationStatus.FAILED_FINAL:
      return 'verification_failed';
    case IdentityVerificationStatus.BLOCKED_AGE:
      return 'age_restriction';
    case IdentityVerificationStatus.BLOCKED_DUPLICATE:
      return 'duplicate_document';
    case IdentityVerificationStatus.EXPIRED:
      return 'document_expired';
    default:
      return null;
  }
}
