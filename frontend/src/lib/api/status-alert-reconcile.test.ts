// Run like status-alerts.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ALERT_RECONCILE_DELAYS_MS,
  hasNewAlertOfType,
  isNewTravelActivation,
  reconcileStatusAlerts,
} from "./status-alert-reconcile"
import type { StatusAlert } from "./status-alerts"

const inForce = (endsAt: string) => ({
  travelModeEndsAt: endsAt,
  travelModeExpired: false,
})
const off = { travelModeEndsAt: null, travelModeExpired: null }
const alert = (n: number, type: StatusAlert["type"]): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: "t",
  body: "b",
  link: null,
  metadata: null,
  createdAt: "2026-10-26T01:00:00.000Z",
})

describe("detecting a Travel Mode activation made in this visit", () => {
  it("first-time activation: not in force before, in force now", () => {
    assert.equal(
      isNewTravelActivation(off, inForce("2026-11-02T00:00:00.000Z")),
      true
    )
  })

  it("a renewed activation (a different period end) counts", () => {
    assert.equal(
      isNewTravelActivation(
        inForce("2026-11-02T00:00:00.000Z"),
        inForce("2026-11-20T00:00:00.000Z")
      ),
      true
    )
  })

  it("nothing new: the same period, still off, expired, or the first read of the page", () => {
    const period = inForce("2026-11-02T00:00:00.000Z")
    assert.equal(isNewTravelActivation(period, period), false)
    assert.equal(isNewTravelActivation(off, off), false)
    assert.equal(isNewTravelActivation(period, off), false)
    assert.equal(
      isNewTravelActivation(period, {
        travelModeEndsAt: "2026-11-02T00:00:00.000Z",
        travelModeExpired: true,
      }),
      false
    )
    assert.equal(isNewTravelActivation(null, period), false)
    assert.equal(isNewTravelActivation(off, null), false)
  })
})

describe("bounded reconciliation of the alert list", () => {
  const harness = (
    reads: Array<StatusAlert[] | Error>,
    current = () => true
  ) => {
    const waits: number[] = []
    const applied: StatusAlert[][] = []
    let listCalls = 0
    const run = (known = new Set<string>()) =>
      reconcileStatusAlerts({
        list: async () => {
          const next = reads[Math.min(listCalls, reads.length - 1)]
          listCalls += 1
          if (next instanceof Error) throw next
          return next
        },
        isSettled: (alerts) => hasNewAlertOfType(alerts, "travel_mode", known),
        apply: (alerts) => void applied.push(alerts),
        isCurrent: current,
        sleep: async (ms) => void waits.push(ms),
      })
    return { run, waits, applied, calls: () => listCalls }
  }

  it("the alert is already there on the first re-read: one read, no more waiting", async () => {
    const h = harness([[alert(1, "travel_mode")]])
    assert.equal(await h.run(), "settled")
    assert.equal(h.calls(), 1)
    assert.deepEqual(h.waits, [400])
  })

  it("the consumer is late: reads again until the alert appears, then stops", async () => {
    const h = harness([
      [],
      [],
      [alert(1, "travel_mode")],
      [alert(1, "travel_mode")],
    ])
    assert.equal(await h.run(), "settled")
    assert.equal(h.calls(), 3)
    assert.deepEqual(h.waits, [400, 900, 1800])
    assert.equal(h.applied.length, 3) // every read is shown, so the card appears as soon as it exists
  })

  it("an alert that was already known does not settle it", async () => {
    const known = new Set([alert(1, "travel_mode").id])
    const h = harness([[alert(1, "travel_mode")]])
    assert.equal(await h.run(known), "gave_up")
  })

  it("an unfinished or abandoned flow creates no alert: it makes exactly the bounded reads and gives up", async () => {
    const h = harness([[]])
    assert.equal(await h.run(), "gave_up")
    assert.equal(h.calls(), ALERT_RECONCILE_DELAYS_MS.length)
  })

  it("is bounded: a fixed small number of reads and about three seconds of waiting, never a loop", () => {
    assert.ok(ALERT_RECONCILE_DELAYS_MS.length <= 4)
    const total = ALERT_RECONCILE_DELAYS_MS.reduce((a, b) => a + b, 0)
    assert.ok(total <= 3500, `waits add up to ${total}ms`)
    assert.ok(
      ALERT_RECONCILE_DELAYS_MS.every((d) => d < 5000),
      "no fixed five-second wait"
    )
  })

  it("a failed read costs one attempt and the next one can still settle it", async () => {
    const h = harness([new Error("503"), [alert(2, "travel_mode")]])
    assert.equal(await h.run(), "settled")
    assert.equal(h.calls(), 2)
  })

  it("a newer reconciliation (or the page going away) ends this one without applying anything stale", async () => {
    let current = true
    const h = harness([[]], () => current)
    const promise = h.run()
    current = false
    assert.equal(await promise, "superseded")
    assert.equal(h.applied.length, 0)
  })
})
