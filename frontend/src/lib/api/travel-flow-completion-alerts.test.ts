// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Regression (PMCM-651): after the FIRST-TIME flow's "Travel Mode is now active!" > Done, the
// dashboard showed no alert until a manual refresh. The ordinary flow closes with
// mismatchFlowKindRef === null, and handleIdentityFlowOpenChange used to return without
// reading /me, so the live card saw stale state and the persistent alert list was never
// reloaded. These tests fail on that code.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  hasNewAlertOfType,
  isNewTravelActivation,
  reconcileStatusAlerts,
} from "./status-alert-reconcile"
import { buildAlertStack, selectVisibleAlerts } from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"
import { readDashboardWithHost } from "./dashboard-host-source"

const page = readDashboardWithHost()
const handler = page.slice(
  page.indexOf("const handleIdentityFlowOpenChange = useCallback("),
  page.indexOf("[markTravelerPromptCompleted]")
)

describe("the page re-reads /me when an ordinary flow closes", () => {
  it("a closing flow with no mismatch kind fetches the summary and stores it", () => {
    assert.match(
      handler,
      /const kind = mismatchFlowKindRef\.current\s+if \(!open && kind === null\) \{[\s\S]*?fetchIdentityVerificationSummary\(\)\.then\(\(fresh\) => \{\s+if \(fresh\) setTravelSummary\(fresh\)\s+\}\)\s+return\s+\}/
    )
  })

  it("that branch only updates the summary: no banner, prompt or completion marker is touched", () => {
    const branch = handler.slice(
      handler.indexOf("if (!open && kind === null)"),
      handler.indexOf("if (open || kind === null) return")
    )
    assert.doesNotMatch(
      branch,
      /setProfileBannerShown|setCooldownRetryTime|setLocationMismatchOpen|markTravelerPromptCompleted|travelerPromptHandledRef/
    )
  })

  it("an opening flow does nothing here, and the mismatch flows' completion markers are untouched", () => {
    assert.match(handler, /if \(open \|\| kind === null\) return/)
    assert.match(handler, /mismatchFlowCompleted\(kind, fresh\)/)
    assert.match(
      handler,
      /markTravelerPromptCompleted\(fresh\?\.loginSessionKey \?\? null\)/
    )
    assert.match(handler, /travelerPromptHandledRef\.current\.reset\(\)/)
    assert.match(
      handler,
      /setProfileBannerShown\(shouldShowProfileBanner\(fresh\)\)/
    )
    assert.match(
      handler,
      /setLocationMismatchOpen\(shouldShowLocationMismatchPrompt\(fresh\)\)/
    )
  })
})

describe("the persistent alert follows a detected activation, boundedly", () => {
  const effect = page.slice(
    page.indexOf("isNewTravelActivation(previous, travelSummary)") - 400,
    page.indexOf("// Which login this is")
  )

  it("reconciles only when the summary shows a NEW activation", () => {
    assert.match(
      effect,
      /if \(!user \|\| !isNewTravelActivation\(previous, travelSummary\)\) return/
    )
    assert.match(effect, /previousTravelSummaryRef\.current = travelSummary/)
  })

  it("is the shared bounded helper, with no interval, no continuous polling and no fixed 5s wait", () => {
    assert.match(effect, /startAlertReconcile\(\["travel_mode"\]\)/)
    const reconcile = page.slice(
      page.indexOf("const startAlertReconcile = useCallback"),
      page.indexOf("// A Travel Mode activation made in this page visit")
    )
    assert.match(reconcile, /reconcileStatusAlerts\(\{/)
    assert.doesNotMatch(reconcile, /setInterval|5000|while \(true\)/)
    assert.doesNotMatch(page, /setInterval/)
  })

  it("the newest read wins over a slower older one, and a newer run (or unmount) ends an older one", () => {
    const reconcile = page.slice(
      page.indexOf("const startAlertReconcile = useCallback"),
      page.indexOf("// A Travel Mode activation made in this page visit")
    )
    assert.match(
      reconcile,
      /latestRequest = \+\+statusAlertRequestRef\.current/
    )
    assert.match(reconcile, /latestRequest === statusAlertRequestRef\.current/)
    assert.match(reconcile, /generation === alertReconcileGenRef\.current/)
    assert.match(page, /alertReconcileGenRef\.current = -1/)
  })
})

describe("the whole first-time flow, end to end without a refresh", () => {
  const NOW = Date.parse("2026-10-26T01:50:00.000Z")
  type TravelState = {
    travelModeEndsAt: string | null
    travelModeExpired: boolean | null
  }
  const unverified: TravelState = {
    travelModeEndsAt: null,
    travelModeExpired: null,
  }
  const afterDone: TravelState = {
    travelModeEndsAt: "2026-11-02T01:50:00.000Z",
    travelModeExpired: false,
  }
  const travelAlert: StatusAlert = {
    id: "00000000-0000-4000-8000-000000000001",
    type: "travel_mode",
    title: "Travel Mode is on",
    body: "b",
    link: null,
    metadata: null,
    createdAt: "2026-10-26T01:50:00.200Z",
  }
  const visibleTypes = (
    summary: typeof unverified,
    persistent: StatusAlert[]
  ) =>
    selectVisibleAlerts(
      buildAlertStack({
        persistent,
        loginSessionKey: "login-1",
        travelModeActive: summary.travelModeExpired === false,
      })
    ).visible.map((a) => a.type)

  it("before the fix the page stayed on the stale summary: no card at all", () => {
    assert.deepEqual(visibleTypes(unverified, []), [])
  })

  it("Done re-reads /me: the live card shows at once, and the persistent card follows once the consumer has stored it", async () => {
    // Done closes the flow: /me now reports the new period.
    assert.equal(isNewTravelActivation(unverified, afterDone), true)
    assert.deepEqual(visibleTypes(afterDone, []), ["travel_mode_ongoing"]) // live card, immediately

    // The first alert read (with the summary) races the consumer and misses; the
    // reconciliation's second read sees it.
    let persistent: StatusAlert[] = []
    const reads: StatusAlert[][] = [[], [travelAlert]]
    let read = 0
    const outcome = await reconcileStatusAlerts({
      list: async () => reads[Math.min(read++, reads.length - 1)],
      isSettled: (a) => hasNewAlertOfType(a, "travel_mode", new Set()),
      apply: (a) => {
        persistent = a
      },
      isCurrent: () => true,
      sleep: async () => undefined,
    })
    assert.equal(outcome, "settled")
    assert.deepEqual(visibleTypes(afterDone, persistent), [
      "travel_mode_ongoing",
      "travel_mode",
    ])
  })

  it("closing or abandoning an unfinished flow creates nothing: the summary is unchanged, so no reconciliation and no card", () => {
    assert.equal(isNewTravelActivation(unverified, unverified), false)
    assert.deepEqual(visibleTypes(unverified, []), [])
  })
})

describe("the alert list is loaded for talent accounts only", () => {
  it("a client landing on the talent dashboard (it redirects) makes no status-alert request", () => {
    const loader = page.slice(
      page.indexOf("Talent accounts only: a client that lands here"),
      page.indexOf("}, [user, travelSummary])")
    )
    assert.match(
      loader,
      /resolveDashboardRole\(user\) !== ROLE\.TALENT\) return/
    )
    assert.match(loader, /StatusAlertsAPI\.list\(\)/)
    assert.ok(
      loader.indexOf("ROLE.TALENT") < loader.indexOf("StatusAlertsAPI.list()")
    )
  })
})
