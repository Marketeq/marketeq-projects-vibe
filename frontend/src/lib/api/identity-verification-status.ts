// frontend/src/lib/api/identity-verification-status.ts
//
// Real identity-verification status client — calls
// identity-verification-service's GET /v1/identity-verification/me (proxied
// through api-gateway, same endpoint detected-location.ts already uses).
//
import { IdentityVerificationAPI } from "@/service/http/identity-verification"

// Values mirror identity-verification-service's own confirmed nine-value
// IdentityVerificationStatus enum exactly.
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

// A failed/unreachable check is never coerced into "unstarted" — that would
// wrongly claim the account needs verification when the truth is simply
// unknown. Callers must show this as its own distinct, honest state.
export type IdentityVerificationStatusResult =
  | IdentityVerificationStatus
  | "unavailable"

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
 * Checks the current account's real identity verification status.
 * A dev-only override still lets every status be exercised for testing:
 *   localStorage.setItem('__mock_identity_verification_status', 'verified')
 */
export async function checkIdentityVerificationStatus(): Promise<IdentityVerificationStatusResult> {
  const override = readDevMockOverride()
  if (override) return override

  try {
    const res = await IdentityVerificationAPI.getMyStatus()
    const status = res.data.identityVerificationStatus
    return (VALID_STATUSES as string[]).includes(status)
      ? (status as IdentityVerificationStatus)
      : "unavailable"
  } catch {
    return "unavailable"
  }
}
