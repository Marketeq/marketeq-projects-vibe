// frontend/src/lib/api/identity-verification-status.ts
//
// Real identity-verification status client — calls
// identity-verification-service's GET /v1/identity-verification/me (proxied
// through api-gateway, same endpoint detected-location.ts already uses).
//

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

export interface CheckIdentityVerificationStatusOptions {
  // The localStorage mock is ignored unless the caller opts in. Only the
  // development preview / Storybook may pass this — never the real dashboard,
  // where a stale mock key would hide the account's true status.
  allowDevMock?: boolean
  // Test seam; defaults to the real GET /v1/identity-verification/me.
  fetchStatus?: () => Promise<string | undefined>
}

async function fetchRealStatus(): Promise<string | undefined> {
  const { IdentityVerificationAPI } =
    await import("@/service/http/identity-verification")
  const res = await IdentityVerificationAPI.getMyStatus()
  return res.data.identityVerificationStatus
}

/**
 * Checks the current account's real identity verification status.
 * The dev-only override exercises every status for preview/testing, but only
 * when explicitly enabled by the caller:
 *   localStorage.setItem('__mock_identity_verification_status', 'verified')
 *   checkIdentityVerificationStatus({ allowDevMock: true })
 */
export async function checkIdentityVerificationStatus(
  options: CheckIdentityVerificationStatusOptions = {}
): Promise<IdentityVerificationStatusResult> {
  if (options.allowDevMock) {
    const override = readDevMockOverride()
    if (override) return override
  }

  try {
    const status = await (options.fetchStatus ?? fetchRealStatus)()
    return (VALID_STATUSES as string[]).includes(status ?? "")
      ? (status as IdentityVerificationStatus)
      : "unavailable"
  } catch {
    return "unavailable"
  }
}

// What the dashboard's entry prompt should do for a status: only an
// unstarted account (or an unknown one) gets the start prompt. Any other
// confirmed status — verified, pending, etc. — never opens it.
export function gateReasonForStatus(
  status: IdentityVerificationStatusResult
): "unstarted" | "status_unavailable" | null {
  if (status === "unavailable") return "status_unavailable"
  if (status === "unstarted") return "unstarted"
  return null
}

export const IDENTITY_STATUS_REFRESHED_EVENT =
  "identity-verification-status-refreshed"

// ---------------------------------------------------------------------------
// Verified-result trigger: "You're all set!" after returning from Didit.
// ---------------------------------------------------------------------------

export interface VerificationSummary {
  identity: string
  location: string
}

export interface CheckVerificationSummaryOptions {
  // Test seam; defaults to the real GET /v1/identity-verification/me.
  fetchSummary?: () => Promise<VerificationSummary>
}

async function fetchRealSummary(): Promise<VerificationSummary> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  const res = await IdentityVerificationAPI.getMyStatus()
  return {
    identity: res.data.identityVerificationStatus,
    location: res.data.locationVerificationStatus,
  }
}

// Reads the account's real, server-held status. Never reads a status from the
// URL a browser comes back from Didit with, and never honors a dev mock.
// "unavailable" is never treated as verified.
export async function checkVerificationSummary(
  options: CheckVerificationSummaryOptions = {}
): Promise<VerificationSummary | "unavailable"> {
  try {
    const summary = await (options.fetchSummary ?? fetchRealSummary)()
    if (
      typeof summary?.identity !== "string" ||
      typeof summary?.location !== "string"
    ) {
      return "unavailable"
    }
    return summary
  } catch {
    return "unavailable"
  }
}

// The success trigger needs BOTH conditions.
export function isIdentityAndLocationVerified(
  summary: VerificationSummary | "unavailable"
): boolean {
  return (
    summary !== "unavailable" &&
    summary.identity === "verified" &&
    summary.location === "verified"
  )
}

// A result trigger is only for someone who actually went through Didit from
// this browser and came back. The flag is set just before the redirect to
// Didit and cleared when a result is shown; it expires so an abandoned attempt
// can never surface a stale message later.
export const AWAITING_RESULT_KEY = "marketeq:identity-verification:awaiting-result"
export const AWAITING_RESULT_TTL_MS = 24 * 60 * 60 * 1000
// The webhook can land a few seconds after the browser returns, so after
// coming back the dashboard rechecks for a short, bounded time (5s x 12 = 60s).
export const RESULT_POLL_INTERVAL_MS = 5_000
export const RESULT_POLL_MAX_ATTEMPTS = 12

export interface KeyValueStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function markAwaitingResult(
  storage: KeyValueStorage | undefined,
  now: number = Date.now()
): void {
  try {
    storage?.setItem(AWAITING_RESULT_KEY, String(now))
  } catch {
    // storage unavailable: the trigger simply won't fire, nothing else breaks
  }
}

export function hasAwaitingResult(
  storage: KeyValueStorage | undefined,
  now: number = Date.now()
): boolean {
  try {
    const raw = storage?.getItem(AWAITING_RESULT_KEY)
    if (!raw) return false
    const startedAt = Number(raw)
    if (!Number.isFinite(startedAt)) return false
    if (now - startedAt > AWAITING_RESULT_TTL_MS || startedAt > now) {
      storage?.removeItem(AWAITING_RESULT_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function clearAwaitingResult(storage: KeyValueStorage | undefined): void {
  try {
    storage?.removeItem(AWAITING_RESULT_KEY)
  } catch {
    // ignore
  }
}
