// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  TRAVEL_POPUP_DURATION_MS,
  USER_CLOSE_WINDOW_MS,
  createTravelPopupCloseGuard,
  isActiveTravelUpdate,
} from "./travel-popup"
import { MAX_TIMER_MS } from "./travel-reminder"

describe("the popup duration is browser-safe", () => {
  it("is finite, an integer, and no larger than setTimeout accepts (never clamped to immediate)", () => {
    assert.ok(Number.isFinite(TRAVEL_POPUP_DURATION_MS))
    assert.ok(Number.isInteger(TRAVEL_POPUP_DURATION_MS))
    assert.ok(TRAVEL_POPUP_DURATION_MS <= 2_147_483_647)
    assert.equal(TRAVEL_POPUP_DURATION_MS, MAX_TIMER_MS)
  })

  it("is far longer than the ordinary 5-second toast duration", () => {
    assert.ok(TRAVEL_POPUP_DURATION_MS > 5_000 * 1_000)
  })
})

describe("the popup does not auto-close through the ordinary toast duration", () => {
  // A toast reports its own timer expiry through the same onOpenChange(false) a user close
  // uses. Model both with a fake clock: only a gesture-marked close may close the popup.
  const clock = () => {
    const state = { now: 1_000_000 }
    return { state, now: () => state.now }
  }

  it("a close reported by the toast's own timer is ignored, however often it happens", () => {
    const { state, now } = clock()
    const guard = createTravelPopupCloseGuard(now)
    for (const elapsed of [5_000, 60_000, 3_600_000, 86_400_000, TRAVEL_POPUP_DURATION_MS]) {
      state.now += elapsed
      assert.equal(guard.shouldClose(false), false)
    }
  })

  it("the X, Escape and a swipe each mark a user close, which then closes exactly once", () => {
    const { state, now } = clock()
    const guard = createTravelPopupCloseGuard(now)
    for (const gesture of ["X", "Escape", "swipe"]) {
      guard.markUserClose()
      assert.equal(guard.shouldClose(false), true, gesture)
      assert.equal(guard.shouldClose(false), false, `${gesture}: a second report is a timer close`)
      state.now += 10
    }
  })

  it("a timer close shortly AFTER the toast opened does not count as a user close", () => {
    const { state, now } = clock()
    const guard = createTravelPopupCloseGuard(now)
    state.now += 5_000 // the ordinary duration passes
    assert.equal(guard.shouldClose(false), false)
  })

  it("a stale gesture mark expires, so a much later timer close is still ignored", () => {
    const { state, now } = clock()
    const guard = createTravelPopupCloseGuard(now)
    guard.markUserClose()
    state.now += USER_CLOSE_WINDOW_MS + 1
    assert.equal(guard.shouldClose(false), false)
  })

  it("opening never closes it", () => {
    const guard = createTravelPopupCloseGuard()
    guard.markUserClose()
    assert.equal(guard.shouldClose(true), false)
  })

  it("a close that follows a user gesture within the window is honored", () => {
    const { state, now } = clock()
    const guard = createTravelPopupCloseGuard(now)
    guard.markUserClose()
    state.now += USER_CLOSE_WINDOW_MS
    assert.equal(guard.shouldClose(false), true)
  })
})

describe("which kind of Update it is", () => {
  it("a reminder while Travel Mode is still in force is an active update", () => {
    assert.equal(isActiveTravelUpdate("reminder", { travelModeExpired: false }), true)
    assert.equal(isActiveTravelUpdate("reminder", { travelModeExpired: null }), true)
  })

  it("a reminder whose Travel Mode has ended since (fresh /me says expired) is not active", () => {
    assert.equal(isActiveTravelUpdate("reminder", { travelModeExpired: true }), false)
  })

  it("without a fresh read the popup's own kind decides", () => {
    assert.equal(isActiveTravelUpdate("reminder", null), true)
  })

  it("an expiry popup is never an active update, whatever /me says", () => {
    for (const fresh of [null, { travelModeExpired: false }, { travelModeExpired: true }, { travelModeExpired: null }]) {
      assert.equal(isActiveTravelUpdate("expiry", fresh), false)
    }
  })

  it("an unknown popup kind is never an active update", () => {
    assert.equal(isActiveTravelUpdate(null, { travelModeExpired: false }), false)
  })
})
