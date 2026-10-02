// frontend/src/lib/api/identity-next-step.ts
//
// Routing for the dashboard's "Your profile is not public / Verify My Account" box:
// ask only for what is still missing. The backend's `nextAction` (GET /me) decides
// which step is due — this file only turns it into "location" or "identity". No
// attempt, cooldown, confirmation-age or status rule is re-derived here.
//
//   location  → the existing location step ("Yes, this is my home country")
//   identity  → Didit only (new session, or resume of the existing one); the
//               location step is skipped because the backend already trusts it
//   null      → nothing to ask for right now (in review, waiting for a retry
//               window, complete, or a value this build doesn't recognise)
import { markAwaitingResult } from "./identity-verification-status"
import { isDiditHostedUrl } from "./free-kyc"
import type {
  IdentityFlowState,
  IdentityVerificationSummaryView,
} from "./identity-verification-state"

export type GateRoute = "location" | "identity"

const ROUTE_BY_FLOW_STATE: Record<IdentityFlowState, GateRoute | null> = {
  "confirm-location": "location",
  "start-identity": "identity",
  "continue-identity": "identity",
  "retry-identity": "identity", // a rejected attempt with attempts left: same box, Didit only
  "reverify-identity": "identity",
  "await-review": null,
  "wait-for-retry": null,
  complete: null,
  unknown: null,
}

export function gateRouteForFlowState(
  flowState: IdentityFlowState
): GateRoute | null {
  return ROUTE_BY_FLOW_STATE[flowState] ?? null
}

// What the dashboard does when it checks on load:
//   open      → show the existing gate (`reason` picks its existing copy)
//   closed    → show nothing
//   fallback  → the server gave no usable nextAction (an older server); use the
//               pre-existing status check instead
export type GateDecision =
  | { kind: "open"; reason: "unstarted" | "status_unavailable" }
  | { kind: "closed" }
  | { kind: "fallback" }

export function decideGate(
  summary: IdentityVerificationSummaryView | null
): GateDecision {
  if (summary === null) return { kind: "open", reason: "status_unavailable" }
  if (summary.flowState === "unknown") return { kind: "fallback" }
  return gateRouteForFlowState(summary.flowState)
    ? { kind: "open", reason: "unstarted" }
    : { kind: "closed" }
}

// ---------------------------------------------------------------------------
// Waiting for a retry window (third rejection)
// ---------------------------------------------------------------------------

/**
 * The retry time to show on the "You've used all three attempts" screen, taken
 * straight from the backend, or null when that screen does not apply. It applies
 * only when the backend says to wait for a retry AND supplies a valid retry time:
 * the other waiting states (a block with no self-service path) carry no retry time
 * and get no screen. Nothing is computed here — no attempt count, no 24-hour rule.
 */
export function cooldownRetryAt(
  summary: IdentityVerificationSummaryView | null
): string | null {
  if (!summary || summary.flowState !== "wait-for-retry") return null
  const at = summary.retryAvailableAt
  if (!at || !Number.isFinite(new Date(at).getTime())) return null
  return at
}

export interface RetryTimeFormatOptions {
  locale?: string
  timeZone?: string
}

/**
 * "{date} at {time}" for the retry time, in the viewer's own locale and time zone
 * (a date and time, never a duration). Returns null for anything that is not a
 * valid timestamp, so a bad value can never render as "Invalid Date".
 */
export function formatRetryAt(
  iso: string | null | undefined,
  options: RetryTimeFormatOptions = {}
): { date: string; time: string } | null {
  if (!iso) return null
  const when = new Date(iso)
  if (!Number.isFinite(when.getTime())) return null
  const { locale, timeZone } = options
  return {
    date: when.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }),
    time: when.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }),
  }
}

// ---------------------------------------------------------------------------
// Didit only
// ---------------------------------------------------------------------------

export type StartIdentityOnlyOutcome =
  | "redirected"
  | "needs_location" // the backend wants the home country confirmed again (15-minute window)
  | "not_startable" // the account can't start right now (e.g. already verified)
  | "failed"

export interface StartIdentityOnlyDeps {
  // POST /v1/identity-verification/kyc-sessions — VPN/proxy guarded, resumes an
  // unfinished session when there is one.
  startFreeKyc: () => Promise<{ data: { url: string } }>
  redirect: (url: string) => void
  markAwaitingResult?: () => void
}

const CONFIRMATION_REQUIRED_CODE = "HOME_COUNTRY_CONFIRMATION_REQUIRED"
const NOT_STARTABLE_CODE = "IDENTITY_VERIFICATION_NOT_STARTABLE"

function conflictCode(error: unknown): string | null {
  const e = error as {
    response?: {
      status?: number
      data?: { code?: string; error?: { code?: string } }
    }
  }
  if (e?.response?.status !== 409) return null
  return e.response?.data?.code ?? e.response?.data?.error?.code ?? null
}

/**
 * Starts (or resumes) Didit WITHOUT the location step. The backend still enforces
 * its own rules: if the home-country confirmation has gone stale it answers 409
 * HOME_COUNTRY_CONFIRMATION_REQUIRED, which this reports as "needs_location" so the
 * caller falls back to the normal location step. Never marks anyone verified.
 */
export async function startIdentityOnly(
  deps: StartIdentityOnlyDeps
): Promise<StartIdentityOnlyOutcome> {
  try {
    const { data } = await deps.startFreeKyc()
    if (!isDiditHostedUrl(data?.url)) {
      throw new Error("Free KYC returned an invalid redirect URL.")
    }
    ;(
      deps.markAwaitingResult ??
      (() =>
        markAwaitingResult(
          typeof window === "undefined" ? undefined : window.localStorage
        ))
    )()
    deps.redirect(data.url)
    return "redirected"
  } catch (error) {
    const code = conflictCode(error)
    if (code === CONFIRMATION_REQUIRED_CODE) return "needs_location"
    if (code === NOT_STARTABLE_CODE) return "not_startable"
    // No Figma state exists for a failure here, so stay on the current screen and
    // log instead of inventing UI.
    console.error("[identity-verification] Didit-only start failed", error)
    return "failed"
  }
}

async function defaultDeps(): Promise<StartIdentityOnlyDeps> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  return {
    startFreeKyc: () => IdentityVerificationAPI.startFreeKyc(),
    redirect: (url: string) => window.location.assign(url),
  }
}

export async function startIdentityOnlyForDashboard(): Promise<StartIdentityOnlyOutcome> {
  return startIdentityOnly(await defaultDeps())
}
