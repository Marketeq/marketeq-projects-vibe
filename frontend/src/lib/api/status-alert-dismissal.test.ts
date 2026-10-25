// Run like status-alerts.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  type PersistentDisplayAlert,
  dismissPersistentAlertOptimistically,
  isRenderedStatusAlert,
} from "./status-alert-dismissal"
import {
  type DismissalState,
  buildAlertStack,
  selectVisibleAlerts,
} from "./status-alert-state"
import type { StatusAlert, StatusAlertType } from "./status-alerts"

const NOW = Date.parse("2026-10-25T12:00:00.000Z")
const at = (min: number) => new Date(NOW - min * 60_000).toISOString()
const alert = (n: number, type: StatusAlertType, min: number): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: "Travel Mode is on",
  body: "You can continue using the platform while away from your home country.",
  link: null,
  metadata: null,
  createdAt: at(min),
})
const empty: DismissalState = {
  dismissedPersistentIds: new Set(),
  dismissedLiveKeys: new Set(),
}
// A React-like holder for the state.
const holder = () => {
  let state = empty
  return {
    get: () => state,
    update: (change: (s: DismissalState) => DismissalState) => {
      state = change(state)
    },
  }
}
const stackFor = (alerts: StatusAlert[], state: DismissalState) =>
  buildAlertStack({
    persistent: alerts.filter((a) => a.type === "travel_mode"),
    ...state,
    loginSessionKey: null,
    nowMs: NOW,
    travelModeActive: undefined,
    fullyVerified: undefined,
  })

describe("dismissing the Travel Mode alert", () => {
  const first = alert(1, "travel_mode", 60)
  const second = alert(2, "travel_mode", 10)

  it("removes the card at once, before the request has finished", async () => {
    const s = holder()
    let release: () => void = () => {}
    const dismiss = () => new Promise<void>((resolve) => (release = resolve))
    const [card] = stackFor([first], s.get())
    const pending = dismissPersistentAlertOptimistically({
      alert: card as PersistentDisplayAlert,
      dismiss,
      update: s.update,
    })
    assert.equal(stackFor([first], s.get()).length, 0) // gone while pending
    release()
    assert.deepEqual(await pending, { ok: true })
    assert.equal(stackFor([first], s.get()).length, 0)
  })

  it("calls the persistent dismissal with the alert's own id, once", async () => {
    const s = holder()
    const calls: string[] = []
    const [card] = stackFor([first], s.get())
    await dismissPersistentAlertOptimistically({
      alert: card as PersistentDisplayAlert,
      dismiss: async (id) => void calls.push(id),
      update: s.update,
    })
    assert.deepEqual(calls, [first.id])
  })

  it("lets the next stacked alert move up", async () => {
    const s = holder()
    const stack = stackFor([first, second], s.get())
    assert.equal(stack[0].key, `persistent:${second.id}`) // newest first
    await dismissPersistentAlertOptimistically({
      alert: stack[0] as PersistentDisplayAlert,
      dismiss: async () => {},
      update: s.update,
    })
    const after = selectVisibleAlerts(stackFor([first, second], s.get()))
    assert.deepEqual(
      after.visible.map((a) => a.key),
      [`persistent:${first.id}`]
    )
  })

  it("restores the card and reports the error when the request fails", async () => {
    const s = holder()
    const failure = new Error("offline")
    const [card] = stackFor([first], s.get())
    const outcome = await dismissPersistentAlertOptimistically({
      alert: card as PersistentDisplayAlert,
      dismiss: async () => {
        throw failure
      },
      update: s.update,
    })
    assert.deepEqual(outcome, { ok: false, error: failure })
    assert.equal(stackFor([first], s.get()).length, 1)
  })

  it("a failure restores only that card, not an alert dismissed earlier", async () => {
    const s = holder()
    const stack = stackFor([first, second], s.get())
    await dismissPersistentAlertOptimistically({
      alert: stack[0] as PersistentDisplayAlert,
      dismiss: async () => {},
      update: s.update,
    })
    await dismissPersistentAlertOptimistically({
      alert: stack[1] as PersistentDisplayAlert,
      dismiss: async () => {
        throw new Error("500")
      },
      update: s.update,
    })
    assert.deepEqual(
      stackFor([first, second], s.get()).map((a) => a.key),
      [`persistent:${first.id}`]
    )
  })

  it("the same activation does not reappear when a stale list read returns it again", async () => {
    const s = holder()
    const [card] = stackFor([first], s.get())
    await dismissPersistentAlertOptimistically({
      alert: card as PersistentDisplayAlert,
      dismiss: async () => {},
      update: s.update,
    })
    // A list request that was already in flight still contains the dismissed row.
    assert.equal(stackFor([first], s.get()).length, 0)
  })

  it("a new activation is a new occurrence (new id) and appears even after the old one was dismissed", async () => {
    const s = holder()
    const [card] = stackFor([first], s.get())
    await dismissPersistentAlertOptimistically({
      alert: card as PersistentDisplayAlert,
      dismiss: async () => {},
      update: s.update,
    })
    const next = stackFor([first, second], s.get())
    assert.deepEqual(
      next.map((a) => a.key),
      [`persistent:${second.id}`]
    )
  })
})

describe("what is rendered so far", () => {
  it("not the types whose cards are not built yet, and never the live cards", () => {
    const stack = buildAlertStack({
      persistent: [
        alert(1, "travel_mode", 5),
        alert(2, "home_country_updated", 9),
      ],
      loginSessionKey: "l",
      nowMs: NOW,
      travelModeActive: true,
      fullyVerified: false,
    })
    assert.deepEqual(
      stack.filter(isRenderedStatusAlert).map((a) => a.type),
      ["travel_mode"]
    )
  })
})

describe("the submitted-for-review alert", () => {
  const submitted = alert(7, "submitted_for_review", 5)
  const travel = alert(8, "travel_mode", 20)
  const stack = (state: DismissalState) =>
    buildAlertStack({
      persistent: [travel, submitted],
      ...state,
      loginSessionKey: null,
      nowMs: NOW,
      travelModeActive: undefined,
      fullyVerified: undefined,
    })

  it("is rendered, and stacks with Travel Mode newest first", () => {
    const rendered = stack(empty).filter(isRenderedStatusAlert)
    assert.deepEqual(
      rendered.map((a) => a.type),
      ["submitted_for_review", "travel_mode"]
    )
  })

  it("dismisses through the persistent API, optimistically, and is restored on failure", async () => {
    const s = holder()
    const [top] = stack(s.get())
    const calls: string[] = []
    const ok = await dismissPersistentAlertOptimistically({
      alert: top as PersistentDisplayAlert,
      dismiss: async (id) => void calls.push(id),
      update: s.update,
    })
    assert.deepEqual(ok, { ok: true })
    assert.deepEqual(calls, [submitted.id])
    assert.deepEqual(
      stack(s.get()).map((a) => a.type),
      ["travel_mode"]
    )

    const f = holder()
    const failed = await dismissPersistentAlertOptimistically({
      alert: stack(f.get())[0] as PersistentDisplayAlert,
      dismiss: async () => {
        throw new Error("500")
      },
      update: f.update,
    })
    assert.equal(failed.ok, false)
    assert.equal(stack(f.get()).length, 2)
  })

  it("a newer Verified alert replaces it in the list the page builds", () => {
    const verified = alert(9, "verified", 1)
    const types = buildAlertStack({
      persistent: [travel, submitted, verified],
      ...empty,
      loginSessionKey: null,
      nowMs: NOW,
      travelModeActive: undefined,
      fullyVerified: undefined,
    }).map((a) => a.type)
    assert.ok(!types.includes("submitted_for_review"))
  })
})

describe("the verified alert", () => {
  const verified = alert(10, "verified", 2)
  const submitted = alert(11, "submitted_for_review", 30)
  const travel = alert(12, "travel_mode", 20)
  const stack = (state: DismissalState, extra: StatusAlert[] = []) =>
    buildAlertStack({
      persistent: [travel, submitted, verified, ...extra],
      ...state,
      loginSessionKey: null,
      nowMs: NOW,
      travelModeActive: undefined,
      fullyVerified: undefined,
    })

  it("is rendered, replaces the older Submitted alert, and stacks newest first with Travel Mode", () => {
    assert.deepEqual(
      stack(empty)
        .filter(isRenderedStatusAlert)
        .map((a) => a.type),
      ["verified", "travel_mode"]
    )
  })

  it("a later, independent Submitted (a new verification) is not hidden by the old Verified", () => {
    const later = alert(13, "submitted_for_review", 1)
    assert.deepEqual(
      stack(empty, [later])
        .filter(isRenderedStatusAlert)
        .map((a) => a.type),
      ["submitted_for_review", "verified", "travel_mode"]
    )
  })

  it("dismisses through the persistent API, optimistically, and is restored on failure", async () => {
    const s = holder()
    const calls: string[] = []
    const ok = await dismissPersistentAlertOptimistically({
      alert: stack(s.get())[0] as PersistentDisplayAlert,
      dismiss: async (id) => void calls.push(id),
      update: s.update,
    })
    assert.deepEqual(ok, { ok: true })
    assert.deepEqual(calls, [verified.id])
    assert.deepEqual(
      stack(s.get()).map((a) => a.type),
      ["travel_mode"]
    )

    const f = holder()
    const failed = await dismissPersistentAlertOptimistically({
      alert: stack(f.get())[0] as PersistentDisplayAlert,
      dismiss: async () => {
        throw new Error("500")
      },
      update: f.update,
    })
    assert.equal(failed.ok, false)
    assert.equal(stack(f.get()).filter(isRenderedStatusAlert).length, 2)
  })
})
