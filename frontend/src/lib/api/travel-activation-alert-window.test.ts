// Run: npx tsc src/lib/api/travel-activation-alert-window.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>)   # run from the frontend/ directory
// The shared host re-reads the alert list a bounded number of times after a Travel Mode
// activation. A slow queue used to outlast the 3.1s default window, so the "Travel Mode is on"
// card only appeared on the next focus, visibility or route event.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  ALERT_RECONCILE_DELAYS_MS,
  TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS,
  hasNewAlertOfType,
  isNewTravelActivation,
  reconcileStatusAlerts,
} from "./status-alert-reconcile"
import { buildAlertStack, selectVisibleAlerts } from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const host = read("contexts", "identity-verification-host.tsx")

const travelAlert = (n: number): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type: "travel_mode",
  title: "Travel Mode is on",
  body: "b",
  link: null,
  metadata: null,
  createdAt: "2026-10-30T01:00:00.000Z",
})

const run = (
  reads: Array<StatusAlert[] | Error>,
  options: { current?: () => boolean; known?: Set<string> } = {}
) => {
  const waits: number[] = []
  const applied: StatusAlert[][] = []
  let calls = 0
  const done = reconcileStatusAlerts({
    list: async () => {
      const next = reads[Math.min(calls, reads.length - 1)]
      calls += 1
      if (next instanceof Error) throw next
      return next
    },
    isSettled: (a) =>
      hasNewAlertOfType(a, "travel_mode", options.known ?? new Set()),
    apply: (a) => void applied.push(a),
    isCurrent: options.current ?? (() => true),
    sleep: async (ms) => void waits.push(ms),
    delaysMs: TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS,
  })
  return { done, waits, applied, calls: () => calls }
}

describe("the Travel Mode activation window is longer than the default, and still bounded", () => {
  it("outlasts the 3.1s default that a slow queue used to exceed", () => {
    const total = TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS.reduce((a, b) => a + b, 0)
    assert.ok(total > 3_100, `waits add up to ${total}ms`)
  })

  it("is a fixed, small number of reads with no loop and a ceiling of 30s", () => {
    assert.ok(TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS.length <= 8)
    const total = TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS.reduce((a, b) => a + b, 0)
    assert.ok(total <= 30_000, `waits add up to ${total}ms`)
  })

  it("leaves the default window used by every other alert exactly as it was", () => {
    assert.deepEqual([...ALERT_RECONCILE_DELAYS_MS], [400, 900, 1800])
  })

  it("a late consumer: the alert appears on a late read, is applied, and the reads stop there", async () => {
    const r = run([[], [], [], [], [travelAlert(1)], [travelAlert(1)]])
    assert.equal(await r.done, "settled")
    assert.equal(r.calls(), 5)
    assert.deepEqual(r.waits, [400, 900, 1800, 3000, 5000])
    assert.deepEqual(r.applied[r.applied.length - 1], [travelAlert(1)])
  })

  it("the alert never arrives: exactly the bounded reads, then it gives up (no polling)", async () => {
    const r = run([[]])
    assert.equal(await r.done, "gave_up")
    assert.equal(r.calls(), TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS.length)
  })

  it("reads that fail while the service is down cost one attempt each and a later one can still settle", async () => {
    const r = run([new Error("502"), new Error("502"), [travelAlert(2)]])
    assert.equal(await r.done, "settled")
    assert.equal(r.calls(), 3)
  })

  it("no duplicate: an alert the page already holds does not settle it, and a second run supersedes the first", async () => {
    const known = new Set([travelAlert(1).id])
    const held = run([[travelAlert(1)]], { known })
    assert.equal(await held.done, "gave_up")
    let current = true
    const first = run([[]], { current: () => current })
    current = false
    assert.equal(await first.done, "superseded")
    assert.equal(first.applied.length, 0)
  })
})

describe("closing or cancelling before the duration is confirmed starts nothing", () => {
  it("no activation in /me, so no alert read is started", () => {
    const off = { travelModeEndsAt: null, travelModeExpired: null }
    assert.equal(isNewTravelActivation(off, off), false)
    assert.equal(isNewTravelActivation(null, off), false)
  })
})

describe("the host applies the longer window to Travel Mode only", () => {
  const start = host.indexOf("const startAlertReconcile = useCallback(")
  const block = host.slice(start, host.indexOf("    []\n  )", start))

  it("passes the travel schedule only when every awaited type is travel_mode", () => {
    assert.match(
      block,
      /delaysMs: expected\.every\(\(type\) => type === "travel_mode"\)\s+\? TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS\s+: undefined/
    )
  })

  it("keeps the unchanged call sites and the single-flight guards", () => {
    assert.match(host, /startAlertReconcile\(\["travel_mode"\]\)/)
    assert.match(host, /startAlertReconcile\(\["verified", "home_country_updated"\]\)/)
    assert.match(block, /isCurrent: \(\) => generation === alertReconcileGenRef\.current/)
    assert.match(block, /if \(latestRequest === statusAlertRequestRef\.current\)/)
  })

  it("an account change or sign-out ends a running window and empties the alerts", () => {
    const reset = host.slice(
      host.indexOf("accountKeyRef.current = accountKey"),
      host.indexOf("}, [accountKey])")
    )
    assert.match(reset, /alertReconcileGenRef\.current \+= 1/)
    assert.match(reset, /setStatusAlerts\(\[\]\)/)
    assert.match(reset, /setTravelSummary\(null\)/)
  })

  it("leaving the page ends a running window", () => {
    assert.match(host, /alertReconcileGenRef\.current = -1/)
  })
})

describe("the Update reminder rule is untouched", () => {
  const base = {
    persistent: [travelAlert(1)],
    loginSessionKey: "login-a",
    travelModeActive: true,
    travelModeOccurrence: "2026-11-02T00:00:00.000Z",
  }
  const types = (activatedThisLogin: boolean) =>
    selectVisibleAlerts(
      buildAlertStack({ ...base, travelModeActivatedThisLogin: activatedThisLogin })
    ).visible.map((a) => `${a.source}:${a.type}`)

  it("the login that activated shows the persistent card and hides the Update card", () => {
    assert.deepEqual(types(true), ["persistent:travel_mode"])
  })

  it("a new login shows the Update card again beside the persistent one", () => {
    const shown = types(false)
    assert.equal(shown.length, 2)
    assert.ok(shown.includes("persistent:travel_mode"))
    assert.ok(shown.some((t) => t.startsWith("live:")))
  })
})
