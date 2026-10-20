// frontend/src/lib/api/identity-verification-state.ts
//
// State layer for the hosted Didit Free KYC flow. The backend's verification
// summary is AUTHORITATIVE: this file maps its stable `nextAction` to one internal
// state and runs the return-from-Didit reconciliation. It deliberately does NOT
// recreate attempt, cooldown, confirmation-age or status rules — nothing here ever
// derives a state from statuses, counts or timestamps; those fields are only parsed
// and passed through for screens built later.
//
// No UI lives here.
import {
  AWAITING_RESULT_KEY,
  type KeyValueStorage,
} from "./identity-verification-status"

// The backend's append-only nextAction contract (backend verification-summary.ts).
export const NEXT_ACTIONS = [
  "confirm_location",
  "start_identity",
  "continue_identity",
  "await_review",
  "retry_identity",
  "wait_for_retry",
  "reverify_identity",
  "complete",
] as const
export type NextAction = (typeof NEXT_ACTIONS)[number]

// The single internal frontend state. "unknown" is the safe landing for anything
// the backend sends that this build does not recognise (a newer server value, a
// missing field, a malformed body): it grants no action and shows no success.
export type IdentityFlowState =
  | "confirm-location"
  | "start-identity"
  | "continue-identity"
  | "await-review"
  | "retry-identity"
  | "wait-for-retry"
  | "reverify-identity"
  | "complete"
  | "unknown"

// The ONE mapping from backend nextAction to internal state.
const FLOW_STATE_BY_NEXT_ACTION: Record<NextAction, IdentityFlowState> = {
  confirm_location: "confirm-location",
  start_identity: "start-identity",
  continue_identity: "continue-identity",
  await_review: "await-review",
  retry_identity: "retry-identity",
  wait_for_retry: "wait-for-retry",
  reverify_identity: "reverify-identity",
  complete: "complete",
}

export function isNextAction(value: unknown): value is NextAction {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FLOW_STATE_BY_NEXT_ACTION, value)
  )
}

export function mapNextActionToFlowState(value: unknown): IdentityFlowState {
  return isNextAction(value) ? FLOW_STATE_BY_NEXT_ACTION[value] : "unknown"
}

// What a parsed GET /me summary looks like to the UI layer. Every field is either
// exactly what the backend sent (validated by type) or null — never inferred.
export interface IdentityVerificationSummaryView {
  flowState: IdentityFlowState
  nextAction: NextAction | null
  fullyVerified: boolean | null
  // gate_open exactly as the backend sent it (null when absent or malformed). Unlike
  // fullyVerified it is true inside the 30-day grace window; any screen that gates an
  // action must read this, never fullyVerified. Nothing is derived here.
  gateOpen: boolean | null
  attemptsUsed: number | null
  attemptsRemaining: number | null
  maxAttempts: number | null
  canRetry: boolean | null
  retryAvailableAt: string | null
  hasActiveSession: boolean | null
  // Append-only Travel Mode fields, exactly as the backend sent them (or null when
  // absent or malformed). Nothing is derived here: the backend computes expiry and
  // reminder availability from its own clock.
  travelModeEndsAt: string | null
  travelModeExpired: boolean | null
  travelReminderDue: boolean | null
  travelReminderAvailableAt: string | null
  // Returning-user new-location signal, exactly as the backend sent it (null when
  // absent or malformed, which shows nothing). The backend alone decides it: a
  // verified home country, a known and different live country, no Travel Mode.
  locationMismatch: boolean | null
  // The same idea for an account whose Travel Mode is in force: the live country
  // differs from the verified home country. The backend sends the key only when true
  // (null otherwise); it is what offers the "still traveling?" prompt (once per
  // login, decided by the screen, see travel-location-prompt.ts).
  travelModeLocationMismatch: boolean | null
}

const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null)
const count = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null
// A string that is a real timestamp, else null (an unparseable value never schedules anything).
const isoTime = (v: unknown): string | null =>
  typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null

// Returns null when the body is not an object (treated as "unavailable").
export function parseIdentityVerificationSummary(
  raw: unknown
): IdentityVerificationSummaryView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const body = raw as Record<string, unknown>
  const nextAction = isNextAction(body.nextAction) ? body.nextAction : null
  return {
    flowState: mapNextActionToFlowState(body.nextAction),
    nextAction,
    fullyVerified: bool(body.fullyVerified),
    gateOpen: bool(body.gateOpen),
    attemptsUsed: count(body.attemptsUsed),
    attemptsRemaining: count(body.attemptsRemaining),
    maxAttempts: count(body.maxAttempts),
    canRetry: bool(body.canRetry),
    retryAvailableAt:
      typeof body.retryAvailableAt === "string" ? body.retryAvailableAt : null,
    hasActiveSession: bool(body.hasActiveSession),
    travelModeEndsAt: isoTime(body.travelModeEndsAt),
    travelModeExpired: bool(body.travelModeExpired),
    travelReminderDue: bool(body.travelReminderDue),
    travelReminderAvailableAt: isoTime(body.travelReminderAvailableAt),
    locationMismatch: bool(body.locationMismatch),
    travelModeLocationMismatch: bool(body.travelModeLocationMismatch),
  }
}

// The pending modal's only trigger: the backend says Didit has the session in
// review (nextAction await_review). Re-verifying a home country and a first-time
// verification share it.
export function shouldShowPendingModal(
  summary: IdentityVerificationSummaryView | null
): boolean {
  return summary?.flowState === "await-review"
}

// The success modal's only trigger: the backend says the account is complete.
export function shouldShowSuccessModal(
  summary: IdentityVerificationSummaryView | null
): boolean {
  return summary?.flowState === "complete"
}

// --- default network dependencies (dynamic import keeps this file testable) ---

async function defaultReconcile(): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  return (await IdentityVerificationAPI.reconcileKycSession()).data
}

async function defaultFetchStatus(): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  return (await IdentityVerificationAPI.getMyStatus()).data
}

/**
 * GET /me parsed through the contract. null means unavailable (a failed request or
 * a malformed body) — never coerced into a state.
 */
export async function fetchIdentityVerificationSummary(
  fetchStatus: () => Promise<unknown> = defaultFetchStatus
): Promise<IdentityVerificationSummaryView | null> {
  try {
    return parseIdentityVerificationSummary(await fetchStatus())
  } catch {
    return null
  }
}

// --- return from Didit: reconcile once, then read the real state ---

export const RETURN_RECONCILED_FOR_KEY =
  "marketeq:identity-verification:reconciled-for"

export type ReturnReconcileStatus = "ok" | "failed" | "skipped"

export interface ReturnReconcileResult {
  /** ok: the POST succeeded; failed: it errored (we fall back to /me polling); skipped: a success is already recorded for this return. */
  reconcile: ReturnReconcileStatus
  summary: IdentityVerificationSummaryView | null
}

export interface ReturnReconcilerDeps {
  reconcile?: () => Promise<unknown>
  fetchStatus?: () => Promise<unknown>
  // Where the awaiting-result flag lives (localStorage) and where the "already
  // reconciled for this return" marker lives (sessionStorage, per tab).
  awaitingStorage?: KeyValueStorage
  markerStorage?: KeyValueStorage
}

// In-flight reconciliations, keyed by the Didit return (the awaiting flag's value).
// In memory only — never persisted — and removed the moment the request settles, so a
// crash, reload or failed request cannot leave anything that blocks a retry.
const inFlightReconciles = new Map<string, Promise<boolean>>()

/**
 * Runs the return reconciliation for ONE Didit return:
 *   1. POST reconcile — unless a success is already recorded for this return,
 *   2. then GET /me, whose nextAction is the authoritative state (read whether the
 *      POST succeeded, failed or was skipped).
 *
 * Deduplication, in two separate layers:
 *  - In flight (memory): run() is memoized per reconciler and concurrent callers for
 *    the same return share one POST, so rerenders and StrictMode's double effect
 *    produce a single call. The in-flight entry is dropped when the request settles.
 *  - Success (sessionStorage, per tab): the marker holds the awaiting flag's own
 *    timestamp and is written ONLY AFTER the POST succeeds. A failed POST leaves no
 *    marker, so a reload or remount for the same return retries; a successful one is
 *    not repeated across remounts. A NEW Didit attempt has a new flag timestamp and
 *    reconciles on its own.
 * A reconcile failure never throws: the caller falls back to its bounded /me polling.
 */
export function createReturnReconciler(deps: ReturnReconcilerDeps = {}) {
  const reconcile = deps.reconcile ?? defaultReconcile
  const fetchStatus = deps.fetchStatus ?? defaultFetchStatus
  let pending: Promise<ReturnReconcileResult> | null = null

  const currentFlag = (): string | null => {
    try {
      return deps.awaitingStorage?.getItem(AWAITING_RESULT_KEY) || null
    } catch {
      return null
    }
  }
  const alreadyReconciled = (flag: string | null): boolean => {
    try {
      return (
        flag !== null &&
        deps.markerStorage?.getItem(RETURN_RECONCILED_FOR_KEY) === flag
      )
    } catch {
      return false
    }
  }
  const markReconciled = (flag: string | null) => {
    try {
      if (flag) deps.markerStorage?.setItem(RETURN_RECONCILED_FOR_KEY, flag)
    } catch {
      // storage unavailable: worst case one extra reconcile on a later mount
    }
  }

  // Resolves true when the POST succeeded, false when it failed. Never rejects.
  const reconcileOnce = (flag: string | null): Promise<boolean> => {
    const key = flag ?? ""
    const shared = inFlightReconciles.get(key)
    if (shared) return shared
    const started = (async () => {
      try {
        await reconcile()
        markReconciled(flag) // success only
        return true
      } catch {
        return false // no marker: a later mount may retry
      } finally {
        inFlightReconciles.delete(key)
      }
    })()
    inFlightReconciles.set(key, started)
    return started
  }

  const execute = async (): Promise<ReturnReconcileResult> => {
    const flag = currentFlag()
    let status: ReturnReconcileStatus = "skipped"
    if (!alreadyReconciled(flag)) {
      status = (await reconcileOnce(flag)) ? "ok" : "failed"
    }
    const summary = await fetchIdentityVerificationSummary(fetchStatus)
    return { reconcile: status, summary }
  }

  return {
    run: (): Promise<ReturnReconcileResult> => (pending ??= execute()),
  }
}
