// frontend/src/lib/api/status-refresh.ts
//
// What the identity verification host re-reads, and when, so a status change that happened
// while the talent was elsewhere (a review approved in another tab, an alert stored a moment
// late) shows up on whatever authenticated page the talent is on, without a refresh.
//
// Read-only (GET /me, plus the existing one-time reconcile on load) and event-driven only: a
// page load, the tab becoming visible, a route change. There is no timer and no polling. One
// refresh runs at a time (a second event while one is in flight is dropped, never queued), so
// repeated visibility or focus events cannot stack overlapping reads or open a dialog twice.
// The approval marker is consumed in the same step that reports "approved", so the Verified
// result is announced once.
//
//   dashboard mounted   it reads the summary itself, so the host does only what the dashboard's
//                       own approval check always did: resolve a review marker, if there is one.
//   any other page      the host re-reads the summary on a visibility or route event (and that
//                       read re-loads the alert list), and resolves a review marker.
//   awaiting a Didit    the return path (its own visibility handler) owns that read: nothing
//   return              extra is read here.
import {
  resolveReviewedResult,
  type ReviewedResultOutcome,
  type ReviewedResultStorage,
} from "./reviewed-approval-result"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"

export type StatusRefreshTrigger = "load" | "visible" | "route"

export type StatusRefreshResult =
  | "inactive" // signed out, a client, a public page: nothing is read
  | "busy" // another refresh is in flight
  | "idle" // nothing to do for this trigger
  | "return-path" // a Didit return is awaited: its own handler reads
  | "dashboard" // the dashboard owns the summary read
  | "refreshed" // the summary was re-read
  | ReviewedResultOutcome // a review marker was resolved

export interface StatusRefreshDeps {
  /** The host is active for a signed-in talent (the only place anything is read). */
  active: () => boolean
  /** The dashboard is mounted and reads the summary itself. */
  dashboardReadsSummary: () => boolean
  /** A Didit return is being awaited (its own handler reads). */
  awaitingDiditReturn: () => boolean
  storage: () => ReviewedResultStorage | undefined
  userId: () => string | null | undefined
  /** GET /me. */
  readSummary: () => Promise<IdentityVerificationSummaryView | null>
  /** Hands a freshly read summary to the host (its alert list re-loads from it). */
  onSummary: (summary: IdentityVerificationSummaryView) => void
  /** The existing one-time reconcile, used on load only. */
  reconcile?: () => Promise<unknown>
  /** A reviewed session was approved: show the Verified result and load its alert. */
  onApproved: () => void
  hasReviewedMarker: () => boolean
}

export function createStatusRefresher(deps: StatusRefreshDeps) {
  let inFlight = false

  async function resolveMarker(withReconcile: boolean): Promise<ReviewedResultOutcome> {
    const outcome = await resolveReviewedResult({
      storage: deps.storage(),
      userId: deps.userId(),
      fetchSummary: async () => {
        const summary = await deps.readSummary()
        if (summary) deps.onSummary(summary)
        return summary
      },
      reconcile: withReconcile ? deps.reconcile : undefined,
    })
    if (outcome === "approved") deps.onApproved()
    return outcome
  }

  return {
    async run(trigger: StatusRefreshTrigger): Promise<StatusRefreshResult> {
      if (!deps.active()) return "inactive"
      if (inFlight) return "busy"
      inFlight = true
      try {
        if (trigger === "load") {
          // The host's own once-per-account read covers the summary; only a review marker
          // needs a decision here (with the one reconcile the dashboard always made).
          return deps.hasReviewedMarker() ? await resolveMarker(true) : "idle"
        }
        if (deps.awaitingDiditReturn()) return "return-path"
        if (deps.hasReviewedMarker()) return await resolveMarker(false)
        if (deps.dashboardReadsSummary()) return "dashboard"
        const summary = await deps.readSummary()
        if (summary) deps.onSummary(summary)
        return summary ? "refreshed" : "idle"
      } finally {
        inFlight = false
      }
    },
  }
}
