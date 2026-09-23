// frontend/src/lib/api/identity-verification-status.ts
//
// Isolated identity-verification status client. The real
// identity-verification-service GET /v1/identity-verification/me endpoint
// exists on a separate (not-yet-merged) backend branch — this file must
// never call it, create it, or assume its shape beyond the status values
// below. Temporary, self-contained mock so the frontend can be built and
// tested without depending on that branch. Swap `checkIdentityVerificationStatus`'s
// body for a real fetch call once the endpoint ships; the return type and
// call sites do not need to change.
//
// Values mirror identity-verification-service's own confirmed nine-value
// IdentityVerificationStatus enum exactly, so the eventual real integration
// is a drop-in swap.
export type IdentityVerificationStatus =
  | "unstarted"
  | "in_progress"
  | "pending"
  | "verified"
  | "failed"
  | "failed_final"
  | "blocked_duplicate"
  | "blocked_age"
  | "expired"

const MOCK_OVERRIDE_KEY = "__mock_identity_verification_status"
const VALID_STATUSES: IdentityVerificationStatus[] = [
  "unstarted",
  "in_progress",
  "pending",
  "verified",
  "failed",
  "failed_final",
  "blocked_duplicate",
  "blocked_age",
  "expired",
]

function readDevMockOverride(): IdentityVerificationStatus | null {
  if (process.env.NODE_ENV === "production") return null
  try {
    if (typeof localStorage === "undefined") return null
    const value = localStorage.getItem(MOCK_OVERRIDE_KEY)
    return (VALID_STATUSES as string[]).includes(value ?? "")
      ? (value as IdentityVerificationStatus)
      : null
  } catch {
    return null
  }
}

/**
 * Checks the current account's identity verification status. TEMPORARY
 * MOCK — see file header.
 *
 * Unlike VPN/proxy detection, there is no "unavailable" ambiguity to
 * preserve here: with no real endpoint to call, the safe default is
 * "unstarted" in every environment (dev and production alike) — it's the
 * fail-safe direction, since it prompts the user to verify rather than
 * silently skipping verification the way defaulting to "verified" would.
 * A dev-only override lets every other status be exercised for testing:
 *   localStorage.setItem('__mock_identity_verification_status', 'verified')
 */
export async function checkIdentityVerificationStatus(): Promise<IdentityVerificationStatus> {
  return readDevMockOverride() ?? "unstarted"
}
