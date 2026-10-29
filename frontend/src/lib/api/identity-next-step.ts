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
import { openDiditOverlay } from "./didit-overlay"
import { markAwaitingResult } from "./identity-verification-status"
import { isDiditHostedUrl } from "./free-kyc"
import { markCurrentPageAsReturnOrigin } from "./verification-return-origin-browser"
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

// What "Verify My Account" does, and therefore whether the actionable surfaces (the
// dashboard banner, the first-time gate) are shown at all. One function decides
// both, from the backend's CURRENT answer only:
//   location  → the existing location flow ("Yes, this is my home country")
//   didit     → Didit only: start, resume the stored session, retry or re-verify
//   limit     → the approved third-attempt dialog (backend says wait, with a valid
//               retry time); no flow starts
//   close     → nothing is actionable: in review, a wait without a retry time,
//               complete, an unknown value, or an unreadable status. No session is
//               started and no actionable surface is shown.
export type VerifyAction =
  | { kind: "location" }
  | { kind: "didit" }
  | { kind: "limit"; retryAt: string }
  | { kind: "close" }

export function verifyActionFor(
  summary: IdentityVerificationSummaryView | null
): VerifyAction {
  if (!summary) return { kind: "close" }
  if (summary.flowState === "wait-for-retry") {
    const retryAt = cooldownRetryAt(summary)
    return retryAt ? { kind: "limit", retryAt } : { kind: "close" }
  }
  const route = gateRouteForFlowState(summary.flowState)
  if (route === "location") return { kind: "location" }
  if (route === "identity") return { kind: "didit" }
  return { kind: "close" }
}

// The dashboard banner is shown exactly for the actionable, incomplete states:
// confirm_location, start_identity, continue_identity, retry_identity and
// reverify_identity. Never for review, the cooldown, complete, unknown or an
// unreadable status.
export function shouldShowProfileBanner(
  summary: IdentityVerificationSummaryView | null
): boolean {
  const action = verifyActionFor(summary)
  return action.kind === "location" || action.kind === "didit"
}

// The first-time modal gate (existing AccountVerificationGate) still opens on load
// for a first-time verification only. Rejected, resumed and re-verifying users get
// the banner alone.
const GATE_MODAL_FLOW_STATES: IdentityFlowState[] = [
  "confirm-location",
  "start-identity",
]

export function shouldOpenFirstTimeGate(
  summary: IdentityVerificationSummaryView | null
): boolean {
  return (
    shouldShowProfileBanner(summary) &&
    GATE_MODAL_FLOW_STATES.includes(summary!.flowState)
  )
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
  // Remembers the page this started on so the return lands there; see free-kyc.ts.
  markReturnOrigin?: (hostedUrl: string) => void
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
    ;(deps.markReturnOrigin ?? markCurrentPageAsReturnOrigin)(data.url)
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
    // Opens Didit over this page; falls back to the redirect if the overlay cannot run.
    redirect: (url: string) => void openDiditOverlay(url),
  }
}

// One start at a time: a second call while one is running (a double click on Verify My Account,
// the gate button and the banner together) shares that call's outcome instead of creating
// another session.
let startInFlight: Promise<StartIdentityOnlyOutcome> | null = null

export function startIdentityOnlyForDashboard(): Promise<StartIdentityOnlyOutcome> {
  if (startInFlight) return startInFlight
  const run = (async () => startIdentityOnly(await defaultDeps()))()
  startInFlight = run
  const clear = () => {
    if (startInFlight === run) startInFlight = null
  }
  run.then(clear, clear)
  return run
}
