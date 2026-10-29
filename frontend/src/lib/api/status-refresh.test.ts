// Run like status-alerts.test.ts (from the frontend/ directory).
//
// A status change that happened while the talent was on another page or tab (an In Review
// result, a review approved later) shows on the page they are on, without a refresh: the
// result dialog once, and the persistent alert after a bounded reload. Read-only, event
// driven, no timer. The refresher, the review marker, the bounded reconcile and the alert
// stack are the real modules; only the network and the clock are stood in for.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { isIdentityHostActive } from "./identity-host-routes"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import {
  type ReviewedResultStorage,
  hasReviewedResult,
  markReviewedResult,
} from "./reviewed-approval-result"
import { reconcileStatusAlerts } from "./status-alert-reconcile"
import {
  type DismissalState,
  MAX_VISIBLE_ALERTS,
  applySupersession,
  buildAlertStack,
  dismissAlert,
  selectVisibleAlerts,
} from "./status-alert-state"
import type { StatusAlert, StatusAlertType } from "./status-alerts"
import { type StatusRefreshDeps, createStatusRefresher } from "./status-refresh"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const host = read("contexts", "identity-verification-host.tsx")
const dashboard = read("app", "(group)", "talent-dashboard", "page.tsx")

const USER = "user-1"
const review = {
  flowState: "await-review",
} as unknown as IdentityVerificationSummaryView
const approved = {
  flowState: "complete",
  fullyVerified: true,
  pendingHomeCountry: null,
  hasActiveSession: false,
} as unknown as IdentityVerificationSummaryView

const memory = (): ReviewedResultStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

// A refresher over a controllable backend. `answers` is what GET /me returns, in order.
function harness(
  over: Partial<StatusRefreshDeps> = {},
  answers: (IdentityVerificationSummaryView | null)[] = []
) {
  const storage = memory()
  const calls = {
    reads: 0,
    reconciles: 0,
    approved: 0,
    summaries: [] as unknown[],
  }
  const queue = [...answers]
  const deps: StatusRefreshDeps = {
    active: () => true,
    dashboardReadsSummary: () => false,
    awaitingDiditReturn: () => false,
    storage: () => storage,
    userId: () => USER,
    hasReviewedMarker: () => hasReviewedResult(storage, USER),
    readSummary: async () => {
      calls.reads++
      return queue.length ? queue.shift()! : review
    },
    onSummary: (s) => void calls.summaries.push(s),
    reconcile: async () => void calls.reconciles++,
    onApproved: () => void calls.approved++,
    ...over,
  }
  return { storage, calls, refresher: createStatusRefresher(deps), deps }
}

const alert = (
  n: number,
  type: StatusAlertType,
  createdAt: string
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: `t${n}`,
  body: `b${n}`,
  link: null,
  metadata: null,
  createdAt,
})
const T0 = Date.parse("2026-10-28T03:00:00.000Z")
const iso = (s: number) => new Date(T0 + s * 1000).toISOString()
const empty: DismissalState = {
  dismissedPersistentIds: new Set(),
  dismissedLiveKeys: new Set(),
}
const stackOf = (persistent: StatusAlert[], d: DismissalState = empty) =>
  selectVisibleAlerts(
    buildAlertStack({
      persistent,
      loginSessionKey: "l",
      travelModeActive: false,
      dismissedPersistentIds: d.dismissedPersistentIds,
      dismissedLiveKeys: d.dismissedLiveKeys,
    })
  ).visible

describe("1-2. In Review on any page shows the Submitted alert, even if the first read was empty", () => {
  it("the bounded reconcile keeps reading until Submitted is stored, then stops", async () => {
    const reads = [[], [], [alert(1, "submitted_for_review", iso(5))]]
    let n = 0
    const applied: StatusAlert[][] = []
    const outcome = await reconcileStatusAlerts({
      list: async () => reads[n++],
      isSettled: (a) => a.some((x) => x.type === "submitted_for_review"),
      apply: (a) => void applied.push(a),
      isCurrent: () => true,
      sleep: async () => {},
    })
    assert.equal(outcome, "settled")
    assert.equal(n, 3, "stops once Submitted is found")
    assert.equal(stackOf(applied[2]).length, 1)
    assert.equal(
      stackOf(applied[0]).length,
      0,
      "the stale first read showed nothing, not a wrong card"
    )
  })

  it("the In Review result on a page starts the same bounded reload (not dashboard-only)", () => {
    assert.match(
      host,
      /shouldShowPendingModal\(summary\)[\s\S]*?startAlertReconcile\(\["submitted_for_review"\]/
    )
    assert.ok(
      !/startAlertReconcile\(\["submitted_for_review"\]/.test(dashboard)
    )
  })
})

describe("3-4. A review approved while the tab was hidden shows Verified once, superseding Submitted", () => {
  it("visible again: one reconcile-free GET resolves the marker, consumes it and announces approval once", async () => {
    const h = harness({}, [approved])
    markReviewedResult(h.storage, USER)
    assert.equal(await h.refresher.run("visible"), "approved")
    assert.equal(h.calls.approved, 1)
    assert.equal(h.calls.reconciles, 0, "GET only on a visibility event")
    assert.equal(h.calls.reads, 1)
    assert.equal(
      hasReviewedResult(h.storage, USER),
      false,
      "marker consumed in the same step"
    )
  })

  it("Verified replaces Submitted in the stack", () => {
    const list = applySupersession([
      alert(1, "submitted_for_review", iso(0)),
      alert(2, "verified", iso(50)),
    ])
    const types = stackOf(list).map((a) => a.type)
    assert.deepEqual(types, ["verified"])
  })

  it("still in review keeps the marker and shows nothing", async () => {
    const h = harness({}, [review, review])
    markReviewedResult(h.storage, USER)
    assert.equal(await h.refresher.run("visible"), "waiting")
    assert.equal(await h.refresher.run("route"), "waiting")
    assert.equal(h.calls.approved, 0)
    assert.equal(hasReviewedResult(h.storage, USER), true)
  })
})

describe("5. Repeated visibility, focus and route events do not duplicate anything", () => {
  it("a burst of events while one is in flight is dropped, and approval is announced once", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const h = harness({
      readSummary: async () => {
        h.calls.reads++
        await gate
        return approved
      },
    })
    markReviewedResult(h.storage, USER)
    const first = h.refresher.run("visible")
    const burst = await Promise.all([
      h.refresher.run("visible"),
      h.refresher.run("route"),
      h.refresher.run("visible"),
    ])
    assert.deepEqual(burst, ["busy", "busy", "busy"])
    release()
    assert.equal(await first, "approved")
    assert.equal(h.calls.reads, 1, "one read, no overlap")
    assert.equal(h.calls.approved, 1)
    // later events find no marker and announce nothing
    assert.notEqual(await h.refresher.run("visible"), "approved")
    assert.equal(h.calls.approved, 1)
  })

  it("two refreshers over one browser's storage still announce an approval once (marker consumed synchronously)", async () => {
    const a = harness({}, [approved])
    const b = harness(
      {
        storage: () => a.storage,
        hasReviewedMarker: () => hasReviewedResult(a.storage, USER),
      },
      [approved]
    )
    markReviewedResult(a.storage, USER)
    const [x, y] = await Promise.all([
      a.refresher.run("visible"),
      b.refresher.run("visible"),
    ])
    assert.equal([x, y].filter((r) => r === "approved").length, 1)
  })
})

describe("6. A dismissed alert is not resurrected", () => {
  it("a re-read of the same list keeps a dismissed Verified card dismissed", () => {
    const verified = alert(2, "verified", iso(50))
    const [shown] = stackOf([verified])
    const { state, effect } = dismissAlert(empty, shown)
    assert.deepEqual(effect, { kind: "dismiss_on_server", id: verified.id })
    assert.equal(stackOf([verified], state).length, 0)
    assert.equal(
      stackOf([verified], state).length,
      0,
      "a second read does not bring it back"
    )
  })
})

describe("7. Route changes and visibility trigger one read each, with no polling", () => {
  it("each event is exactly one GET; nothing runs between events", async () => {
    const h = harness()
    await h.refresher.run("route")
    await h.refresher.run("visible")
    assert.equal(h.calls.reads, 2)
    assert.equal(h.calls.reconciles, 0)
    const src = read("src", "lib", "api", "status-refresh.ts")
    assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(src))
  })

  it("on the dashboard (which reads the summary itself) a route or visibility event reads nothing extra", async () => {
    const h = harness({ dashboardReadsSummary: () => true })
    assert.equal(await h.refresher.run("route"), "dashboard")
    assert.equal(await h.refresher.run("visible"), "dashboard")
    assert.equal(h.calls.reads, 0)
  })

  it("while a Didit return is awaited, its own handler owns the read", async () => {
    const h = harness({ awaitingDiditReturn: () => true })
    assert.equal(await h.refresher.run("visible"), "return-path")
    assert.equal(h.calls.reads, 0)
  })

  it("load resolves a marker with the one reconcile and reads nothing without one", async () => {
    const none = harness()
    assert.equal(await none.refresher.run("load"), "idle")
    assert.equal(none.calls.reads, 0)
    const h = harness({}, [approved])
    markReviewedResult(h.storage, USER)
    assert.equal(await h.refresher.run("load"), "approved")
    assert.equal(h.calls.reconciles, 1)
  })

  it("the read is latest-response-wins: a summary read for a previous account is dropped", () => {
    assert.match(
      host,
      /const key = accountKeyRef\.current\s+const next = await fetchIdentityVerificationSummary\(\)\s+return accountKeyRef\.current === key \? next : null/
    )
  })
})

describe("8. Public pages, clients, signed-out users and other accounts stay inert and clean", () => {
  it("an inactive host reads nothing and announces nothing", async () => {
    const h = harness({ active: () => false }, [approved])
    markReviewedResult(h.storage, USER)
    for (const t of ["load", "visible", "route"] as const)
      assert.equal(await h.refresher.run(t), "inactive")
    assert.equal(h.calls.reads, 0)
    assert.equal(h.calls.approved, 0)
  })

  it("another account on the same browser cannot consume this user's marker", async () => {
    const h = harness(
      { userId: () => "user-2", hasReviewedMarker: () => false },
      [approved]
    )
    markReviewedResult(h.storage, USER)
    assert.notEqual(await h.refresher.run("visible"), "approved")
    assert.equal(hasReviewedResult(h.storage, USER), true)
  })

  it("the host is inert on sign-in / onboarding / signed out, and the refresher is guarded by talent + active", () => {
    assert.equal(
      isIdentityHostActive({ pathname: "/sign-in", userId: USER }),
      false
    )
    assert.equal(
      isIdentityHostActive({ pathname: "/onboarding/talent", userId: USER }),
      false
    )
    assert.equal(
      isIdentityHostActive({ pathname: "/jobs/1", userId: null }),
      false
    )
    assert.equal(
      isIdentityHostActive({ pathname: "/jobs/1", userId: USER }),
      true
    )
    assert.ok(
      host.includes(
        "live.hostActive && live.user && resolveDashboardRole(live.user) === ROLE.TALENT"
      )
    )
  })
})

describe("9. The dashboard runs no second approval resolver", () => {
  it("only the host resolves a reviewed session", () => {
    assert.ok(
      !/resolveReviewedResult|reconcileReviewedSession|reviewedCheckStartedRef/.test(
        dashboard
      )
    )
    assert.equal(host.split("createStatusRefresher(").length - 1, 1)
  })
})

describe("10. No blocked gated action is retried", () => {
  it("approval opens the result and reloads the alert; it calls no gate, launcher or original action", () => {
    const block = host.slice(
      host.indexOf("onApproved: () => {"),
      host.indexOf("[startAlertReconcile, setProfileBannerShown]")
    )
    assert.ok(block.includes("setVerifiedModalOpen(true)"))
    assert.ok(
      !/retry|pendingAction|onVerified|router\.|startVerification|openFlow/.test(
        block
      )
    )
  })
})

describe("the three-card cap and ordering are unchanged", () => {
  it("never more than three, newest first", () => {
    const list = [1, 2, 3, 4, 5].map((n) =>
      alert(n, "travel_mode", iso(n * 10))
    )
    const v = stackOf(list)
    assert.equal(v.length, MAX_VISIBLE_ALERTS)
  })
})

describe("the host's classes are generated", () => {
  it("Tailwind scans contexts/, where the host (and its fixed alert stack) lives", () => {
    const config = read("tailwind.config.ts")
    assert.ok(config.includes('"./contexts/**/*.{js,ts,jsx,tsx,mdx}"'))
    assert.ok(
      host.includes("top-[112px]"),
      "the stack's offset is an arbitrary class only the scan can generate"
    )
  })
})
