// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Regression (PMCM-651): a verification (first-time or a home-country change) comes back from
// Didit In Review and the "Your verification has been submitted" dialog opens. The persistent
// "Your location verification was submitted" alert is stored asynchronously by
// notification-service, so the page's alert read can run before it exists, and the page never
// looked again: Done closed the dialog and the alert only appeared after a manual refresh.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  ALERT_RECENCY_WINDOW_MS,
  ALERT_RECONCILE_DELAYS_MS,
  hasRecentAlertOfType,
  reconcileStatusAlerts,
} from "./status-alert-reconcile"
import { buildAlertStack, selectVisibleAlerts } from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"
import { readDashboardWithHost, readIdentityHost } from "./dashboard-host-source"

const page = readDashboardWithHost()

const NOW = Date.parse("2026-10-26T03:00:00.000Z")
const SINCE = NOW - ALERT_RECENCY_WINDOW_MS
const alert = (
  n: number,
  type: StatusAlert["type"],
  ageMs: number
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: type,
  body: "b",
  link: null,
  metadata: null,
  createdAt: new Date(NOW - ageMs).toISOString(),
})
const older = alert(1, "submitted_for_review", 60 * 60_000) // an earlier submission, an hour old
const fresh = alert(2, "submitted_for_review", 1_200) // this return's alert, created 1.2s ago
const visible = (persistent: StatusAlert[]) =>
  selectVisibleAlerts(
    buildAlertStack({
      persistent,
      loginSessionKey: "l",
      travelModeActive: false,
    })
  ).visible.map((a) => (a.source === "persistent" ? a.id : a.key))

const run = async (reads: StatusAlert[][]) => {
  const applied: StatusAlert[][] = []
  let calls = 0
  const outcome = await reconcileStatusAlerts({
    list: async () => reads[Math.min(calls++, reads.length - 1)],
    isSettled: (a) => hasRecentAlertOfType(a, "submitted_for_review", SINCE),
    apply: (a) => void applied.push(a),
    isCurrent: () => true,
    sleep: async () => undefined,
  })
  return { outcome, applied, calls }
}

describe("recognising this return's Submitted alert", () => {
  it("is an alert of the type created at or after the start of the wait", () => {
    assert.equal(
      hasRecentAlertOfType([fresh], "submitted_for_review", SINCE),
      true
    )
    assert.equal(hasRecentAlertOfType([fresh], "verified", SINCE), false)
  })

  it("an older alert of the same type never counts", () => {
    assert.equal(
      hasRecentAlertOfType([older], "submitted_for_review", SINCE),
      false
    )
  })

  it("an unreadable creation time never counts", () => {
    assert.equal(
      hasRecentAlertOfType(
        [{ ...fresh, createdAt: "not a date" }],
        "submitted_for_review",
        SINCE
      ),
      false
    )
  })
})

describe("In Review > Done: the alert shows without a refresh", () => {
  it("the first read is empty; the next read has the new alert: it is shown and the wait stops", async () => {
    const r = await run([[], [fresh]])
    assert.equal(r.outcome, "settled")
    assert.equal(r.calls, 2)
    assert.deepEqual(visible(r.applied[r.applied.length - 1]), [fresh.id])
  })

  it("the first read is stale (an older submission only): it does not stop the wait, and the new alert replaces it on screen", async () => {
    const r = await run([[older], [older], [fresh, older]])
    assert.equal(r.outcome, "settled")
    assert.equal(r.calls, 3) // the older alert did not satisfy the wait
    assert.ok(visible(r.applied[r.applied.length - 1]).includes(fresh.id))
  })

  it("the page's own read already had the new alert: the first re-read settles at once", async () => {
    const r = await run([[fresh]])
    assert.equal(r.outcome, "settled")
    assert.equal(r.calls, 1)
  })

  it("only an older alert ever arrives: the wait ends after its fixed number of reads, never looping", async () => {
    const r = await run([[older]])
    assert.equal(r.outcome, "gave_up")
    assert.equal(r.calls, ALERT_RECONCILE_DELAYS_MS.length)
  })

  it("Home Country Updated is not awaited, so it cannot appear before an approval", async () => {
    const early = alert(3, "home_country_updated", 500)
    const r = await run([[early]])
    assert.equal(r.outcome, "gave_up") // a Home Country Updated alert never settles a Submitted wait
  })
})

describe("the page starts the wait when a verification returns In Review", () => {
  const pendingBranch = page.slice(
    page.indexOf("if (shouldShowPendingModal(summary)) {"),
    page.indexOf("// The banner or gate may have opened from an earlier read")
  )

  it("the In Review branch (either kind) starts a bounded reconcile for Submitted only, dated from now", () => {
    assert.match(
      pendingBranch,
      /setPendingModalOpen\(true\)\s+(?:\/\/[^\n]*\n\s*)*startAlertReconcile\(\["submitted_for_review"\], \{\s+sinceMs: Date\.now\(\) - ALERT_RECENCY_WINDOW_MS,\s+\}\)/
    )
    assert.doesNotMatch(pendingBranch, /home_country_updated|"verified"/)
  })

  it("it uses the shared bounded helper: no interval, no fixed delay before the first read", () => {
    assert.doesNotMatch(pendingBranch, /setInterval|setTimeout|5000/)
    const host = readIdentityHost()
    const returnEffect = host.slice(
      host.indexOf(
        "const apply = (summary: IdentityVerificationSummaryView | null)"
      ),
      host.indexOf("// Real required check")
    )
    assert.match(returnEffect, /\}, \[user, startAlertReconcile, hostActive, resultsSurfaceMounted\]\)/)
  })

  it("Done on the dialog is not what loads the alert: it only closes it", () => {
    assert.doesNotMatch(
      page.slice(
        page.indexOf("open={pendingModalOpen}"),
        page.indexOf("open={pendingModalOpen}") + 600
      ),
      /startAlertReconcile|StatusAlertsAPI/
    )
  })

  it("the approval-transition reloads are unchanged", () => {
    assert.equal(
      page.split('startAlertReconcile(["verified", "home_country_updated"])')
        .length - 1,
      2
    )
  })
})
