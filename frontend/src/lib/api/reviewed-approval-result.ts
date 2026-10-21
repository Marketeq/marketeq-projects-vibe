// frontend/src/lib/api/reviewed-approval-result.ts
//
// PMCM-653: a FIRST-TIME verification that came back from Didit "in review" shows the
// "Your verification has been submitted" modal. When that same verification is later
// approved, this browser shows the existing success alert ("All set! Your identity and
// location are verified.") once.
//
//   marker      written only when the submitted modal is shown for a first-time
//               verification, per account (the key carries the user id), so another
//               account on the same browser can never read or consume it. It only says
//               "this browser told this user their verification is under review"; it
//               never decides that anything was approved.
//   decision    the trusted backend summary alone: the alert needs nextAction
//               "complete" AND fullyVerified true. localStorage alone never shows it.
//   consumed    removing the marker is the same synchronous step that grants the alert,
//               so concurrent checks (mount, tab focus, StrictMode) show it once.
//   not shown   still in review, unreadable or unknown answers keep the marker and show
//               nothing; a decline, an abandoned or expired session or any other
//               non-review answer ends the wait quietly.
//   home-country  never marked (the caller passes only first-time verifications); a
//               home-country approval keeps its own outcome.
//   expiry      a marker older than a week (or from the future) is ignored and removed.
import type { IdentityVerificationSummaryView } from "./identity-verification-state"

export const REVIEWED_RESULT_KEY_PREFIX =
  "marketeq:identity-verification:reviewed-result:"
// A review can take days; this only bounds a marker an account never comes back to.
export const REVIEWED_RESULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface ReviewedResultStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export const reviewedResultKey = (userId: string): string =>
  `${REVIEWED_RESULT_KEY_PREFIX}${userId}`

/**
 * Whether the "submitted" modal being shown is for a FIRST-TIME verification, which is
 * the only kind this alert follows. A home-country change (the backend still holds a
 * pending home country) keeps its own outcome and is never marked.
 */
export function shouldMarkReviewedResult(
  summary: IdentityVerificationSummaryView | null
): boolean {
  return summary?.flowState === "await-review" && summary.pendingHomeCountry === null
}

export type ReviewedResultDecision = "approved" | "waiting" | "ended"

/** Records that THIS user was told their first-time verification is under review. */
export function markReviewedResult(
  storage: ReviewedResultStorage | undefined,
  userId: string | null | undefined,
  now: number = Date.now()
): void {
  if (!userId) return
  try {
    storage?.setItem(reviewedResultKey(userId), String(now))
  } catch {
    // storage unavailable: the alert simply never fires, nothing else breaks
  }
}

/** Whether a valid, recent marker exists for this user. Removes an expired or malformed one. */
export function hasReviewedResult(
  storage: ReviewedResultStorage | undefined,
  userId: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!userId) return false
  try {
    const key = reviewedResultKey(userId)
    const raw = storage?.getItem(key)
    if (!raw) return false
    const markedAt = Number(raw)
    if (
      !Number.isFinite(markedAt) ||
      markedAt > now ||
      now - markedAt > REVIEWED_RESULT_TTL_MS
    ) {
      storage?.removeItem(key)
      return false
    }
    return true
  } catch {
    return false
  }
}

/** Forgets this user's marker without reading it. */
export function clearReviewedResult(
  storage: ReviewedResultStorage | undefined,
  userId: string | null | undefined
): void {
  if (!userId) return
  try {
    storage?.removeItem(reviewedResultKey(userId))
  } catch {
    // nothing to do
  }
}

/** True ONCE for a valid marker of this user, and always removes it. */
export function consumeReviewedResult(
  storage: ReviewedResultStorage | undefined,
  userId: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!hasReviewedResult(storage, userId, now)) return false
  clearReviewedResult(storage, userId)
  return true
}

/**
 * What the backend's answer means for a marker. Only the authoritative summary counts:
 * an unreadable answer or a nextAction this build does not know keeps waiting.
 */
export function decideReviewedResult(
  summary: IdentityVerificationSummaryView | null
): ReviewedResultDecision {
  if (!summary) return "waiting"
  switch (summary.flowState) {
    case "complete":
      // "complete" without the matching fullyVerified is not trusted as approval.
      return summary.fullyVerified === true ? "approved" : "waiting"
    case "await-review":
    case "unknown":
      return "waiting"
    default:
      // declined (retry / wait for retry), abandoned or expired (start / continue /
      // confirm / reverify): the review is over and it was not an approval.
      return "ended"
  }
}

// The existing reconcile endpoint (the same call the return-from-Didit path makes): the
// server resolves the session itself, no id from the browser.
export async function reconcileReviewedSession(): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  return (await IdentityVerificationAPI.reconcileKycSession()).data
}

export type ReviewedResultOutcome = "none" | "waiting" | "ended" | "approved"

export interface ResolveReviewedResultDeps {
  storage: ReviewedResultStorage | undefined
  userId: string | null | undefined
  fetchSummary: () => Promise<IdentityVerificationSummaryView | null>
  /** The existing reconcile path; run at most once per call, a failure is ignored. */
  reconcile?: () => Promise<unknown>
  now?: number
}

/**
 * One check of a marker against the backend: optionally reconcile once, read the
 * summary, and act on it. "approved" is returned at most once per marker.
 */
export async function resolveReviewedResult(
  deps: ResolveReviewedResultDeps
): Promise<ReviewedResultOutcome> {
  const { storage, userId } = deps
  if (!hasReviewedResult(storage, userId, deps.now)) return "none"
  if (deps.reconcile) {
    try {
      await deps.reconcile()
    } catch {
      // the webhook may still land; the summary below is the real answer
    }
  }
  let summary: IdentityVerificationSummaryView | null = null
  try {
    summary = await deps.fetchSummary()
  } catch {
    // unreadable: keep waiting, never guess
  }
  const decision = decideReviewedResult(summary)
  if (decision === "approved") {
    return consumeReviewedResult(storage, userId, deps.now) ? "approved" : "none"
  }
  if (decision === "ended") {
    clearReviewedResult(storage, userId)
    return "ended"
  }
  return "waiting"
}
