// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Returning to the Marketeq tab (or window) while a verification is under review reconciles the
// Didit session, re-reads the status and shows the Verified result and alert on the page the talent
// is on: no refresh, no navigation, no polling. The fake backend below only moves off "in review"
// when it is RECONCILED, which is exactly the situation when Didit's webhook is late, missed or
// unreachable (the real-Didit local run that exposed this). The refresher, review marker, alert
// supersession and stack are the real modules.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import {
  type ReviewedResultStorage,
  hasReviewedResult,
  markReviewedResult,
  shouldMarkReviewedResult,
} from "./reviewed-approval-result"
import {
  applySupersession,
  buildAlertStack,
  selectVisibleAlerts,
} from "./status-alert-state"
import type { StatusAlert, StatusAlertType } from "./status-alerts"
import {
  RECONCILE_MIN_INTERVAL_MS,
  type StatusRefreshDeps,
  createStatusRefresher,
} from "./status-refresh"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const host = read("contexts", "identity-verification-host.tsx")
const refresherSource = read("src", "lib", "api", "status-refresh.ts")
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

const memory = (): ReviewedResultStorage => {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

// A backend whose Didit decision is only learned by reconciling (no webhook).
function scenario(over: Partial<StatusRefreshDeps> = {}) {
  const storage = memory()
  const state = {
    clock: Date.now(),
    diditApproved: false,
    backendApproved: false,
    failReconcile: false,
  }
  const calls = {
    reconciles: 0,
    reads: 0,
    approved: 0,
    summaries: [] as unknown[],
  }
  const deps: StatusRefreshDeps = {
    active: () => true,
    dashboardReadsSummary: () => false,
    awaitingDiditReturn: () => false,
    storage: () => storage,
    userId: () => USER,
    hasReviewedMarker: () => hasReviewedResult(storage, USER, state.clock),
    readSummary: async () => {
      calls.reads++
      return state.backendApproved ? approved : review
    },
    onSummary: (s) => void calls.summaries.push(s),
    reconcile: async () => {
      calls.reconciles++
      if (state.failReconcile) throw new Error("reconcile unavailable")
      if (state.diditApproved) state.backendApproved = true
    },
    onApproved: () => void calls.approved++,
    now: () => state.clock,
    ...over,
  }
  markReviewedResult(storage, USER, state.clock) // the Submitted result was shown
  return { storage, state, calls, refresher: createStatusRefresher(deps) }
}

const alert = (n: number, type: StatusAlertType, sec: number): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: `t${n}`,
  body: `b${n}`,
  link: null,
  metadata: null,
  createdAt: new Date(
    Date.parse("2026-10-29T06:00:00.000Z") + sec * 1000
  ).toISOString(),
})

describe("In Review, approved while the tab was hidden: visibility restores and shows Verified", () => {
  it("reconciles the Didit session, reads the new status and announces approval once", async () => {
    const s = scenario()
    s.state.diditApproved = true // approved in the Didit console; no webhook reached us
    assert.equal(await s.refresher.run("visible"), "approved")
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.reads, 1)
    assert.equal(s.calls.approved, 1)
    assert.equal(
      hasReviewedResult(s.storage, USER, s.state.clock),
      false,
      "marker consumed in the same step"
    )
  })

  it("a route change still only reads and never reconciles (only returning to the tab does)", async () => {
    const s = scenario()
    s.state.diditApproved = true
    assert.equal(
      await s.refresher.run("route"),
      "waiting",
      "a route change still only reads"
    )
    assert.equal(s.calls.reconciles, 0)
    assert.equal(s.calls.approved, 0)
  })
})

describe("In Review, approved while the page stayed visible: window focus restores", () => {
  it("a focus event runs the same reconcile + read and announces approval once", async () => {
    const s = scenario()
    s.state.diditApproved = true
    assert.equal(await s.refresher.run("focus"), "approved")
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.approved, 1)
  })

  it("still under review keeps the marker, shows nothing and does not navigate", async () => {
    const s = scenario()
    assert.equal(await s.refresher.run("focus"), "waiting")
    assert.equal(s.calls.approved, 0)
    assert.equal(hasReviewedResult(s.storage, USER, s.state.clock), true)
  })
})

describe("focus and visibility firing together are one reconciliation", () => {
  it("the second event is dropped while the first is in flight", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const s = scenario({
      reconcile: async () => {
        s.calls.reconciles++
        await gate
        s.state.backendApproved = true
      },
    })
    const first = s.refresher.run("visible")
    const rest = await Promise.all([
      s.refresher.run("focus"),
      s.refresher.run("visible"),
      s.refresher.run("focus"),
    ])
    assert.deepEqual(rest, ["busy", "busy", "busy"])
    release()
    assert.equal(await first, "approved")
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.reads, 1)
    assert.equal(s.calls.approved, 1)
  })
})

describe("Submitted is replaced by Verified", () => {
  it("the stack keeps only Verified once it exists", () => {
    const list = applySupersession([
      alert(1, "submitted_for_review", 0),
      alert(2, "verified", 50),
    ])
    const shown = selectVisibleAlerts(
      buildAlertStack({
        persistent: list,
        loginSessionKey: "l",
        travelModeActive: false,
      })
    ).visible.map((a) => a.type)
    assert.deepEqual(shown, ["verified"])
  })

  it("approval starts the bounded alert reload and opens the existing Verified result (no new markup)", () => {
    const block = host.slice(
      host.indexOf("onApproved: () => {"),
      host.indexOf("[startAlertReconcile, setProfileBannerShown]")
    )
    assert.ok(block.includes("setVerifiedModalOpen(true)"))
    assert.ok(
      block.includes(
        'startAlertReconcile(["verified", "home_country_updated"])'
      )
    )
  })
})

describe("repeated focus does not reopen the same result or duplicate alerts", () => {
  it("after approval, further focus and visibility events announce nothing", async () => {
    const s = scenario()
    s.state.diditApproved = true
    assert.equal(await s.refresher.run("focus"), "approved")
    for (const t of ["focus", "visible", "focus", "route"] as const) {
      assert.notEqual(await s.refresher.run(t), "approved")
    }
    assert.equal(s.calls.approved, 1)
  })

  it("coming back repeatedly while still in review reconciles at most once per interval, but still reads", async () => {
    const s = scenario()
    await s.refresher.run("focus")
    await s.refresher.run("visible")
    await s.refresher.run("focus")
    assert.equal(
      s.calls.reconciles,
      1,
      "spaced: Didit is not called on every alt-tab"
    )
    assert.equal(
      s.calls.reads,
      3,
      "the status is still re-read, so a webhook that landed shows up"
    )
    s.state.clock += RECONCILE_MIN_INTERVAL_MS
    s.state.diditApproved = true
    assert.equal(await s.refresher.run("focus"), "approved")
    assert.equal(s.calls.reconciles, 2)
  })
})

describe("a reconciliation failure stays on the page and is retried by a later event", () => {
  it("does not announce, navigate or retry anything itself; the next event reconciles again", async () => {
    const s = scenario()
    s.state.failReconcile = true
    s.state.diditApproved = true
    assert.equal(await s.refresher.run("focus"), "waiting")
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.approved, 0)
    assert.equal(
      hasReviewedResult(s.storage, USER, s.state.clock),
      true,
      "the wait is kept"
    )
    // no spacing after a failure: the very next event retries
    s.state.failReconcile = false
    assert.equal(await s.refresher.run("visible"), "approved")
    assert.equal(s.calls.reconciles, 2)
    assert.equal(s.calls.approved, 1)
  })

  it("a failing read is not approval either", async () => {
    const s = scenario({
      readSummary: async () => {
        throw new Error("network")
      },
    })
    assert.equal(await s.refresher.run("focus"), "waiting")
    assert.equal(s.calls.approved, 0)
  })

  it("nothing in the refresher or its host wiring navigates or starts a gated action", () => {
    assert.ok(
      !/router|location\.|history\.|startVerification|openFlow|runApply|retry/.test(
        refresherSource.replace(/\/\/.*$/gm, "")
      )
    )
    const wiring = host.slice(
      host.indexOf("// Status that changed while the talent was elsewhere"),
      host.indexOf("// Everything above belongs to one account on one page")
    )
    assert.ok(
      !/router\.|startVerification|openFlow|runApply/.test(
        wiring.replace(/\/\/.*$/gm, "")
      )
    )
  })
})

describe("scope: who is reconciled, and no polling", () => {
  it("only a talent with a pending review on an active host; a signed-out or inactive host does nothing", async () => {
    const off = scenario({ active: () => false })
    for (const t of ["load", "visible", "focus", "route"] as const)
      assert.equal(await off.refresher.run(t), "inactive")
    assert.equal(off.calls.reconciles + off.calls.reads, 0)
    const none = scenario({ hasReviewedMarker: () => false })
    assert.equal(await none.refresher.run("focus"), "refreshed")
    assert.equal(
      none.calls.reconciles,
      0,
      "no pending verification: nothing is reconciled"
    )
  })

  it("the dashboard path and a Didit return awaiting its own handler are unchanged", async () => {
    const d = scenario({
      dashboardReadsSummary: () => true,
      hasReviewedMarker: () => false,
    })
    assert.equal(await d.refresher.run("focus"), "dashboard")
    const r = scenario({ awaitingDiditReturn: () => true })
    assert.equal(await r.refresher.run("visible"), "return-path")
    assert.equal(r.calls.reconciles + r.calls.reads, 0)
  })

  it("is event-driven: window focus and visibility listeners, no timer", () => {
    assert.ok(host.includes('window.addEventListener("focus", onFocus)'))
    assert.ok(host.includes('window.removeEventListener("focus", onFocus)'))
    assert.ok(host.includes('void statusRefresher.run("focus")'))
    assert.ok(host.includes('void statusRefresher.run("visible")'))
    assert.ok(
      !/setInterval|setTimeout|requestAnimationFrame/.test(refresherSource)
    )
  })

  it("an account whose summary says in review is remembered as waiting (also from another browser)", () => {
    assert.equal(shouldMarkReviewedResult(review), true)
    assert.equal(shouldMarkReviewedResult(approved), false)
    assert.equal(shouldMarkReviewedResult(null), false)
    assert.match(
      host,
      /if \(!shouldMarkReviewedResult\(travelSummary\)\) return\s+if \(hasReviewedResult\(window\.localStorage, user\.id\)\) return\s+markReviewedResult\(window\.localStorage, user\.id\)/
    )
  })
})
