// Run like status-alerts.test.ts (from the frontend/ directory).
//
// The edge of the tab-return reconcile: a return that lands inside the 5-second spacing while the
// session is still under review. Without a deferred reconcile an approval that happened in the
// meantime stays unseen until another focus event (when Didit's webhook cannot reach the backend).
// One bounded one-shot is scheduled for when the spacing ends; it is not polling. The refresher,
// review marker and alert stack are the real modules; the clock and the one-shot timer are fakes.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import {
  type ReviewedResultStorage,
  hasReviewedResult,
  markReviewedResult,
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
const oneShotSource = read("src", "lib", "api", "one-shot.ts")
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
const settle = () => new Promise<void>((r) => setTimeout(r, 0))

interface FakeTimer {
  run: () => void
  ms: number
  cancelled: boolean
  fired: boolean
}

// The backend only learns Didit's decision by being reconciled (no webhook).
function scenario(over: Partial<StatusRefreshDeps> = {}) {
  const storage = memory()
  const state = {
    clock: Date.now(),
    diditApproved: false,
    backendApproved: false,
    failReconcile: false,
    user: USER as string | null,
    active: true,
  }
  const calls = { reconciles: 0, reads: 0, approved: 0 }
  const timers: FakeTimer[] = []
  const deps: StatusRefreshDeps = {
    active: () => state.active,
    dashboardReadsSummary: () => false,
    awaitingDiditReturn: () => false,
    storage: () => storage,
    userId: () => state.user,
    hasReviewedMarker: () => hasReviewedResult(storage, USER, state.clock),
    readSummary: async () => {
      calls.reads++
      return state.backendApproved ? approved : review
    },
    onSummary: () => undefined,
    reconcile: async () => {
      calls.reconciles++
      if (state.failReconcile) throw new Error("reconcile unavailable")
      if (state.diditApproved) state.backendApproved = true
    },
    onApproved: () => void calls.approved++,
    now: () => state.clock,
    schedule: (run, ms) => {
      const timer: FakeTimer = { run, ms, cancelled: false, fired: false }
      timers.push(timer)
      return () => {
        timer.cancelled = true
      }
    },
    ...over,
  }
  markReviewedResult(storage, USER, state.clock)
  const fire = async (timer: FakeTimer) => {
    if (timer.cancelled) return
    timer.fired = true
    timer.run()
    await settle()
  }
  return {
    storage,
    state,
    calls,
    timers,
    fire,
    refresher: createStatusRefresher(deps),
  }
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

describe("1-4. approval inside the 5-second window is shown by the deferred reconcile", () => {
  it("one focus inside the window, no second focus or refresh: one deferred reconcile shows Verified", async () => {
    const s = scenario()
    // a successful reconcile at t0, still in review
    assert.equal(await s.refresher.run("focus"), "waiting")
    assert.equal(s.calls.reconciles, 1)
    // 2s later the session is approved in Didit (no webhook reaches the backend)
    s.state.clock += 2_000
    s.state.diditApproved = true
    // ONE focus inside the spacing (t0 + 2.5s): it can only read
    s.state.clock += 500
    assert.equal(await s.refresher.run("focus"), "waiting")
    assert.equal(
      s.calls.reconciles,
      1,
      "inside the spacing: no second reconcile yet"
    )
    assert.equal(s.calls.approved, 0)
    // exactly one deferred reconcile was scheduled, for when the spacing ends
    assert.equal(s.timers.length, 1)
    assert.equal(s.timers[0].ms, RECONCILE_MIN_INTERVAL_MS - 2_500)
    // no second focus, no refresh: only the timer runs
    s.state.clock += s.timers[0].ms
    await s.fire(s.timers[0])
    assert.equal(s.calls.reconciles, 2)
    assert.equal(s.calls.approved, 1, "Verified is announced, once")
    assert.equal(
      hasReviewedResult(s.storage, USER, s.state.clock),
      false,
      "marker consumed"
    )
    assert.equal(s.timers.length, 1, "nothing else was scheduled")
  })

  it("Verified replaces Submitted in the alert stack", () => {
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

  it("the approved result starts the same bounded alert reload and the existing dialog", () => {
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

describe("5. multiple events create only one deferred reconcile", () => {
  it("focus, visibility and more focus inside the window fold into a single timer", async () => {
    const s = scenario()
    await s.refresher.run("focus") // reconcile at t0
    s.state.clock += 1_000
    for (const t of ["focus", "visible", "focus", "visible", "focus"] as const)
      await s.refresher.run(t)
    assert.equal(s.timers.length, 1)
    assert.equal(s.calls.reconciles, 1)
    // route changes read only and never schedule anything
    await s.refresher.run("route")
    assert.equal(s.timers.length, 1)
  })

  it("once it has fired and nothing changed it does not schedule again: bounded, not polling", async () => {
    const s = scenario()
    await s.refresher.run("focus")
    s.state.clock += 1_000
    await s.refresher.run("focus")
    s.state.clock += s.timers[0].ms
    await s.fire(s.timers[0]) // reconciles; still under review
    assert.equal(s.calls.reconciles, 2)
    assert.equal(s.calls.approved, 0)
    assert.equal(
      s.timers.length,
      1,
      "no second timer was armed by the deferred run itself"
    )
    assert.equal(
      hasReviewedResult(s.storage, USER, s.state.clock),
      true,
      "the wait is kept for the next return"
    )
  })

  it("a return after the spacing has ended reconciles straight away and schedules nothing", async () => {
    const s = scenario()
    await s.refresher.run("focus")
    s.state.clock += RECONCILE_MIN_INTERVAL_MS
    s.state.diditApproved = true
    assert.equal(await s.refresher.run("focus"), "approved")
    assert.equal(s.timers.length, 0)
  })
})

describe("6. it is cancelled by sign-out, an account switch, unmount or the session leaving review", () => {
  const armed = async () => {
    const s = scenario()
    await s.refresher.run("focus")
    s.state.clock += 1_000
    await s.refresher.run("focus")
    assert.equal(s.timers.length, 1)
    s.state.clock += s.timers[0].ms
    s.state.diditApproved = true
    return s
  }

  it("cancel() (logout, account switch and unmount call it) drops the timer: nothing reconciles", async () => {
    const s = await armed()
    s.refresher.cancel()
    assert.equal(s.timers[0].cancelled, true)
    await s.fire(s.timers[0])
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.approved, 0)
  })

  it("a timer that still fires does nothing for another account or a signed-out host", async () => {
    const other = await armed()
    other.state.user = "user-2"
    await other.fire(other.timers[0])
    assert.equal(other.calls.reconciles, 1)
    assert.equal(other.calls.approved, 0)
    const out = await armed()
    out.state.active = false
    await out.fire(out.timers[0])
    assert.equal(out.calls.reconciles, 1)
    assert.equal(out.calls.approved, 0)
  })

  it("a webhook that lands first (the session leaves review) cancels it: no extra reconcile", async () => {
    const s = scenario()
    await s.refresher.run("focus")
    s.state.clock += 1_000
    await s.refresher.run("focus") // arms the timer
    s.state.backendApproved = true // the webhook finally arrived
    s.state.clock += 500
    assert.equal(await s.refresher.run("visible"), "approved") // a plain read sees it
    assert.equal(s.timers[0].cancelled, true)
    await s.fire(s.timers[0])
    assert.equal(s.calls.reconciles, 1)
    assert.equal(s.calls.approved, 1)
  })

  it("a marker that is gone by the time it fires means nothing is reconciled", async () => {
    const s = await armed()
    s.storage.removeItem(
      `marketeq:identity-verification:reviewed-result:${USER}`
    )
    await s.fire(s.timers[0])
    assert.equal(s.calls.reconciles, 1)
  })

  it("the host cancels on account change, sign-out and unmount", () => {
    assert.match(
      host,
      /useEffect\(\(\) => \{\s+statusRefresher\.cancel\(\)\s+\}, \[accountKey, statusRefresher\]\)/
    )
    assert.ok(
      host.includes(
        "useEffect(() => () => statusRefresher.cancel(), [statusRefresher])"
      )
    )
    assert.ok(host.includes("schedule: scheduleOneShot"))
  })
})

describe("the deferred reconcile is safe", () => {
  it("a failing deferred reconcile stays on the page, arms nothing and is retried by the next event", async () => {
    const s = scenario()
    await s.refresher.run("focus")
    s.state.clock += 1_000
    await s.refresher.run("focus")
    s.state.clock += s.timers[0].ms
    s.state.failReconcile = true
    s.state.diditApproved = true
    await s.fire(s.timers[0])
    assert.equal(s.calls.approved, 0)
    assert.equal(s.timers.length, 1, "no retry timer")
    s.state.failReconcile = false
    assert.equal(
      await s.refresher.run("focus"),
      "approved",
      "the next event retries straight away"
    )
  })

  it("it waits for a refresh that is in flight instead of overlapping it or being dropped", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let slow = false
    const s = scenario({
      readSummary: async () => {
        s.calls.reads++
        if (slow) await gate
        return s.state.backendApproved ? approved : review
      },
    })
    await s.refresher.run("focus")
    s.state.clock += 1_000
    await s.refresher.run("focus") // arms
    s.state.clock += s.timers[0].ms
    s.state.diditApproved = true
    slow = true
    const inFlight = s.refresher.run("route") // a read is running when the timer fires
    s.timers[0].run()
    await settle()
    assert.equal(s.calls.reconciles, 1, "not started while the other one runs")
    release()
    await inFlight
    await settle()
    assert.equal(s.calls.reconciles, 2)
    assert.equal(s.calls.approved, 1)
  })

  it("nothing in it navigates or starts a gated action, and the only timer is the one-shot", () => {
    const code = refresherSource.replace(/\/\/.*$/gm, "")
    assert.ok(
      !/router|location\.|history\.|startVerification|openFlow|runApply/.test(
        code
      )
    )
    assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(code))
    assert.ok(
      oneShotSource.includes("setTimeout") &&
        !oneShotSource.includes("setInterval")
    )
    assert.equal(
      refresherSource.split("deps.schedule(").length - 1,
      1,
      "scheduled from one place"
    )
  })
})
