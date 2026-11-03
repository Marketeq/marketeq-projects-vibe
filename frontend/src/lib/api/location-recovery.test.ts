// Run like detected-location.test.ts (from the frontend/ directory):
//   npx tsc src/lib/api/location-recovery.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && node --test <tmp>/src/lib/api/location-recovery.test.js
//
// BTB-387: the state machine behind "Turn on location to continue".
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type {
  DetectedLocation,
  LocationFailureReason,
} from "./detected-location"
import {
  type LocationRecoveryState,
  type RecoveryDetectContext,
  createLocationRecovery,
} from "./location-recovery"

const flush = () => new Promise<void>((r) => setImmediate(r))

const base: DetectedLocation = {
  city: "",
  region: "",
  countryCode: "",
  countryName: "",
  latitude: null,
  longitude: null,
  detected: false,
  serviceUnavailable: false,
}
const gps: DetectedLocation = {
  ...base,
  city: "Chicago",
  region: "IL",
  countryCode: "US",
  countryName: "United States",
  latitude: 41.88,
  longitude: -87.63,
  detected: true,
}
const failure = (locationFailure: LocationFailureReason): DetectedLocation => ({
  ...base,
  locationFailure,
})

// A detection that the test settles by hand, one request at a time.
function harness() {
  const requests: Array<{
    context: RecoveryDetectContext
    settle: (location: DetectedLocation) => void
  }> = []
  const states: LocationRecoveryState[] = []
  const events: string[] = []
  const recovery = createLocationRecovery({
    detect: (context) =>
      new Promise<DetectedLocation>((resolve) => {
        requests.push({ context, settle: resolve })
      }),
    onChange: (state) => states.push(state),
  })
  const open = (reason: LocationFailureReason = "blocked") =>
    recovery.open(reason, {
      onSuccess: (location) => events.push(`success:${location.city}`),
      onDismiss: (kind) => events.push(`dismiss:${kind}`),
    })
  return { recovery, requests, states, events, open }
}

describe("opening and the two views", () => {
  it("opens on the main view with the failure reason and nothing busy", () => {
    const h = harness()
    assert.equal(h.recovery.state.open, false)
    h.open("dismissed")
    assert.deepEqual(h.recovery.state, {
      open: true,
      reason: "dismissed",
      view: "main",
      busy: false,
    })
  })

  it("Show me how switches the same dialog to the instructions; Back returns", () => {
    const h = harness()
    h.open()
    h.recovery.showHowTo()
    assert.equal(h.recovery.state.view, "howto")
    assert.equal(h.recovery.state.open, true) // one dialog, never a second one
    h.recovery.showHowTo() // repeated presses change nothing
    assert.equal(h.recovery.state.view, "howto")
    h.recovery.back()
    assert.equal(h.recovery.state.view, "main")
    h.recovery.back()
    assert.equal(h.recovery.state.view, "main")
  })

  it("view changes do nothing while closed", () => {
    const h = harness()
    h.recovery.showHowTo()
    h.recovery.back()
    assert.equal(h.recovery.state.open, false)
    assert.deepEqual(h.states, [])
  })

  it("opening again dismisses the first and starts clean on the main view", () => {
    const h = harness()
    h.open("blocked")
    h.recovery.showHowTo()
    h.open("timeout")
    assert.deepEqual(h.events, ["dismiss:abort"])
    assert.equal(h.recovery.state.view, "main")
    assert.equal(h.recovery.state.reason, "timeout")
  })
})

describe("Try Again", () => {
  it("retry success closes the dialog and hands over the device location", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    assert.equal(h.recovery.state.busy, true)
    h.requests[0].settle(gps)
    await p
    assert.equal(h.recovery.state.open, false)
    assert.deepEqual(h.events, ["success:Chicago"])
  })

  it("retry failure keeps the dialog open with the new reason, and it can be tried again", async () => {
    const h = harness()
    h.open("blocked")
    const p = h.recovery.tryAgain()
    h.requests[0].settle(failure("dismissed"))
    await p
    assert.deepEqual(h.recovery.state, {
      open: true,
      reason: "dismissed",
      view: "main",
      busy: false,
    })
    assert.deepEqual(h.events, [])
    const second = h.recovery.tryAgain()
    h.requests[1].settle(gps)
    await second
    assert.deepEqual(h.events, ["success:Chicago"])
  })

  it("a retry on the instructions view stays on it when it fails", async () => {
    const h = harness()
    h.open()
    h.recovery.showHowTo()
    const p = h.recovery.tryAgain()
    h.requests[0].settle(failure("blocked"))
    await p
    assert.equal(h.recovery.state.view, "howto")
  })

  it("double clicks make one request", async () => {
    const h = harness()
    h.open()
    const first = h.recovery.tryAgain()
    const second = h.recovery.tryAgain()
    const third = h.recovery.tryAgain()
    assert.equal(h.requests.length, 1)
    h.requests[0].settle(gps)
    await Promise.all([first, second, third])
    assert.deepEqual(h.events, ["success:Chicago"]) // one success, not three
  })

  it("a press after success (dialog closed) does nothing", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    h.requests[0].settle(gps)
    await p
    await h.recovery.tryAgain()
    assert.equal(h.requests.length, 1)
  })

  it("a thrown detection counts as a failure to read the location, not a crash", async () => {
    const states: LocationRecoveryState[] = []
    const events: string[] = []
    const recovery = createLocationRecovery({
      detect: async () => {
        throw new Error("boom")
      },
      onChange: (s) => states.push(s),
    })
    recovery.open("blocked", {
      onSuccess: () => events.push("success"),
      onDismiss: () => events.push("dismiss"),
    })
    await recovery.tryAgain()
    assert.equal(recovery.state.reason, "resolve_failed")
    assert.equal(recovery.state.open, true)
    assert.deepEqual(events, [])
  })

  it("a country mismatch is still a GPS result: the dialog closes and the flow gets it", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    h.requests[0].settle({
      ...base,
      countryCode: "US",
      countryName: "United States",
      locationMismatch: true,
    })
    await p
    assert.equal(h.recovery.state.open, false)
    assert.equal(h.events.length, 1)
  })

  it("the request carries a live signal and a live isCurrent", async () => {
    const h = harness()
    h.open()
    void h.recovery.tryAgain()
    const { context } = h.requests[0]
    assert.equal(context.signal.aborted, false)
    assert.equal(context.isCurrent(), true)
  })
})

describe("the busy state is long enough to be seen (minBusyMs)", () => {
  // A hand-driven clock and wait, so nothing here sleeps.
  function timed(minBusyMs: number) {
    let clock = 0
    const waits: Array<{ ms: number; release: () => void }> = []
    const requests: Array<(location: DetectedLocation) => void> = []
    const events: string[] = []
    const recovery = createLocationRecovery({
      detect: () =>
        new Promise<DetectedLocation>((resolve) => {
          requests.push(resolve)
        }),
      minBusyMs,
      now: () => clock,
      wait: (ms) =>
        new Promise<void>((resolve) => {
          waits.push({ ms, release: resolve })
        }),
    })
    recovery.open("blocked", {
      onSuccess: (l) => events.push(`success:${l.city}`),
      onDismiss: (k) => events.push(`dismiss:${k}`),
    })
    return {
      recovery,
      waits,
      requests,
      events,
      tick: (ms: number) => (clock += ms),
    }
  }

  it("an instant refusal keeps the spinner up for the minimum, then shows the new reason", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.tick(30) // the browser refused after 30 ms
    t.requests[0](failure("blocked"))
    await flush()
    assert.equal(t.recovery.state.busy, true) // still spinning
    assert.equal(t.waits.length, 1)
    assert.equal(t.waits[0].ms, 670)
    t.tick(670)
    t.waits[0].release()
    await p
    assert.equal(t.recovery.state.busy, false)
    assert.equal(t.recovery.state.open, true)
  })

  it("an instant success also shows the spinner first, then hands over the location", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.tick(10)
    t.requests[0](gps)
    await flush()
    assert.equal(t.recovery.state.busy, true)
    assert.deepEqual(t.events, []) // nothing opens before the spinner has been seen
    t.waits[0].release()
    await p
    assert.deepEqual(t.events, ["success:Chicago"])
  })

  it("an answer slower than the minimum is applied at once (no extra wait)", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.tick(900)
    t.requests[0](failure("timeout"))
    await p
    assert.equal(t.waits.length, 0)
    assert.equal(t.recovery.state.reason, "timeout")
  })

  it("double clicks during the wait are ignored", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.requests[0](failure("blocked"))
    await flush()
    await t.recovery.tryAgain()
    await t.recovery.tryAgain()
    assert.equal(t.requests.length, 1)
    t.waits[0].release()
    await p
  })

  it("Cancel during the wait drops the answer: no success, no reopened dialog", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.requests[0](gps)
    await flush()
    t.recovery.cancel()
    t.waits[0].release()
    await p
    assert.equal(t.recovery.state.open, false)
    assert.deepEqual(t.events, ["dismiss:cancel"])
  })

  it("a cancelled detection does not wait at all", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.requests[0]({ ...base, cancelled: true })
    await p
    assert.equal(t.waits.length, 0)
    assert.equal(t.recovery.state.busy, false)
  })

  it("the minimum never delays the device request: it starts synchronously with the press, before any wait", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    // nothing has been awaited yet, and the request is already out
    assert.equal(t.requests.length, 1)
    assert.equal(t.waits.length, 0)
    assert.equal(t.recovery.state.busy, true)
    t.requests[0](gps)
    await flush()
    t.waits[0].release()
    await p
  })

  it("exactly one device request per press, with or without the minimum, across failures and a success", async () => {
    const t = timed(700)
    for (let press = 1; press <= 3; press++) {
      const p = t.recovery.tryAgain()
      assert.equal(t.requests.length, press) // one new request per press, none extra
      t.requests[press - 1](press < 3 ? failure("blocked") : gps)
      await flush()
      t.waits[press - 1].release()
      await p
    }
    assert.equal(t.requests.length, 3)
    assert.equal(t.waits.length, 3) // the only extra thing a press does is wait; it never asks again
    assert.deepEqual(t.events, ["success:Chicago"])
  })

  it("the wait changes nothing about the answer: same reason, same location, same hooks", async () => {
    const withMin = timed(700)
    const p1 = withMin.recovery.tryAgain()
    withMin.requests[0](failure("timeout"))
    await flush()
    withMin.waits[0].release()
    await p1
    const plain = harness()
    plain.open("blocked")
    const p2 = plain.recovery.tryAgain()
    plain.requests[0].settle(failure("timeout"))
    await p2
    assert.deepEqual(withMin.recovery.state, plain.recovery.state)
  })

  it("navigation, logout, account or role change and unmount during the wait drop the answer", async () => {
    const t = timed(700)
    const p = t.recovery.tryAgain()
    t.requests[0](gps) // the device answered; the spinner is still showing
    await flush()
    t.recovery.abort() // what the host does on a reset or an unmount
    t.waits[0].release()
    await p
    assert.equal(t.recovery.state.open, false)
    assert.deepEqual(t.events, ["dismiss:abort"]) // no success, nothing opens, nothing reopens
  })

  it("an abort during the wait cancels the request's signal, so a still-pending GPS wait is released", async () => {
    let seen: AbortSignal | undefined
    const recovery = createLocationRecovery({
      detect: ({ signal }) => {
        seen = signal
        return new Promise<DetectedLocation>(() => {}) // the native prompt is never answered
      },
      minBusyMs: 700,
    })
    recovery.open("blocked", { onSuccess: () => {}, onDismiss: () => {} })
    void recovery.tryAgain()
    assert.equal(seen?.aborted, false)
    recovery.abort()
    assert.equal(seen?.aborted, true)
  })

  it("the default (no minimum) behaves exactly as before", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    h.requests[0].settle(failure("blocked"))
    await p
    assert.equal(h.recovery.state.busy, false)
  })
})

describe("giving up and cancelling", () => {
  it("Cancel closes the dialog and tells the caller it was a cancel", () => {
    const h = harness()
    h.open()
    h.recovery.cancel()
    assert.equal(h.recovery.state.open, false)
    assert.deepEqual(h.events, ["dismiss:cancel"])
  })

  it("repeated Cancel presses or an Escape right after dismiss once", () => {
    const h = harness()
    h.open()
    h.recovery.cancel()
    h.recovery.cancel()
    h.recovery.abort()
    assert.deepEqual(h.events, ["dismiss:cancel"])
  })

  it("Cancel while a retry is in flight aborts it, and its late answer changes nothing", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    const { context, settle } = h.requests[0]
    h.recovery.cancel()
    assert.equal(context.signal.aborted, true)
    assert.equal(context.isCurrent(), false)
    settle(gps) // arrives after the user gave up
    await p
    assert.equal(h.recovery.state.open, false)
    assert.deepEqual(h.events, ["dismiss:cancel"]) // no success, no flow
  })

  it("route, logout, account or role change and unmount abort the same way (kind 'abort')", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    h.recovery.abort()
    h.requests[0].settle(failure("blocked"))
    await p
    assert.equal(h.recovery.state.open, false)
    assert.deepEqual(h.events, ["dismiss:abort"])
  })

  it("an answer from a cancelled attempt cannot reopen or re-enable a newer dialog", async () => {
    const h = harness()
    h.open("blocked")
    const old = h.recovery.tryAgain()
    h.recovery.cancel()
    h.open("timeout") // the user starts verification again
    const fresh = h.recovery.tryAgain()
    h.requests[0].settle(gps) // the OLD request answers late
    await old
    assert.equal(h.recovery.state.busy, true) // still waiting for its own request
    assert.deepEqual(h.events, ["dismiss:cancel"]) // the old success did not leak in
    h.requests[1].settle(failure("dismissed"))
    await fresh
    assert.equal(h.recovery.state.reason, "dismissed")
  })

  it("a cancelled detection result is ignored and leaves the dialog usable", async () => {
    const h = harness()
    h.open()
    const p = h.recovery.tryAgain()
    h.requests[0].settle({ ...base, cancelled: true })
    await p
    assert.deepEqual(h.recovery.state, {
      open: true,
      reason: "blocked",
      view: "main",
      busy: false,
    })
  })

  it("closing never leaves the next dialog busy or on the instructions view", () => {
    const h = harness()
    h.open()
    h.recovery.showHowTo()
    void h.recovery.tryAgain()
    h.recovery.cancel()
    h.open("blocked")
    assert.deepEqual(h.recovery.state, {
      open: true,
      reason: "blocked",
      view: "main",
      busy: false,
    })
  })
})

describe("nothing here reaches the network", () => {
  it("the module has no fetch, axios or IP lookup of its own", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "api", "location-recovery.ts"),
      "utf8"
    ).replace(/\/\/.*$/gm, "")
    assert.ok(
      !/\bfetch\(|axios|AxiosRequest|detected-location\/|getDetectedLocation/.test(
        source
      )
    )
  })
})
