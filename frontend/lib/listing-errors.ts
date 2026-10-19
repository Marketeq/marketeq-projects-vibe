// PMCM-261: single, typed source of truth for turning a listings-API error
// into safe, generic, user-facing copy — AC4/AC5/X3. Never surfaces a status
// code, a raw class-validator string, or an internal/service name. Pages
// keep their OWN human-written copy (moderation rejection, upload
// validation, PMCM-254/255 field copy) as-is; this is only for the generic
// fallback that used to dump the raw backend message straight to the UI.

const TIMEOUT_MESSAGE =
  "This is taking longer than expected. Check your connection and try again."
const GENERIC_MESSAGE = "Something went wrong. Please try again."

type ListingApiError = {
  code?: string
  name?: string
  message?: string
  response?: {
    status?: number
    data?: { message?: unknown; [key: string]: unknown }
  }
}

function asListingApiError(err: unknown): ListingApiError {
  return typeof err === "object" && err !== null
    ? (err as ListingApiError)
    : {}
}

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"])

/**
 * True for an axios timeout/abort, a fetch() aborted via
 * AbortSignal.timeout(), or any other no-response network failure.
 */
export function isTimeoutError(err: unknown): boolean {
  const e = asListingApiError(err)
  if (e.code && TIMEOUT_CODES.has(e.code)) return true
  // AbortSignal.timeout() rejects with a DOMException named "TimeoutError"
  // (plain user-initiated aborts are "AbortError" instead — not a timeout).
  if (e.name === "TimeoutError") return true
  if (
    !e.response &&
    typeof e.message === "string" &&
    /timeout/i.test(e.message)
  ) {
    return true
  }
  return false
}

/** True when the request failed with an HTTP 401 (session expired/invalid). */
export function isUnauthorizedError(err: unknown): boolean {
  return asListingApiError(err)?.response?.status === 401
}

/**
 * Raw backend message, for INTERNAL classification only (e.g. detecting a
 * moderation rejection to pick the right already-written copy) — never pass
 * this straight to the UI; use toUserMessage for display.
 */
export function rawBackendMessage(err: unknown): string {
  const raw = asListingApiError(err)?.response?.data?.message
  if (Array.isArray(raw)) return raw.join(" ")
  if (typeof raw === "string") return raw
  return ""
}

/**
 * Safe, generic, user-facing copy for any listings-API failure that doesn't
 * already have its own human-written message. Two outcomes only: the
 * timeout copy, or the generic fallback — nothing backend-sourced ever
 * reaches the caller through this function.
 */
export function toUserMessage(err: unknown): string {
  return isTimeoutError(err) ? TIMEOUT_MESSAGE : GENERIC_MESSAGE
}
