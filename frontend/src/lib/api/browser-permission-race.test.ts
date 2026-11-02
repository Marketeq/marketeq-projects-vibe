// Run like detected-location.test.ts (from the frontend/ directory):
//   npx tsc src/lib/api/browser-permission-race.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && node --test <tmp>/src/lib/api/browser-permission-race.test.js
//
// BTB-387 race: the custom "Location Access Needed" dialog opened UNDER Chrome's own
// permission prompt because the position request's timeout kept running while the
// prompt waited for the user. Everything here is deterministic: a fake clock, a fake
// geolocation and a fake Permissions API stand in for the browser.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  type BrowserPositionResult,
  type GeolocationLike,
  type PermissionStatusLike,
  type PermissionsLike,
  getBrowserPosition,
  onGeolocationGranted,
} from "./browser-geolocation"
import { getDetectedLocation } from "./detected-location"
import { createLocationConsentGate } from "./location-consent"

const flush = () => new Promise<void>((r) => setImmediate(r))

function fakeClock() {
  let now = 0
  let next = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  const stats = { set: 0, cleared: 0 }
  return {
    stats,
    timers: {
      set(callback: () => void, ms: number) {
        stats.set++
        const id = next++
        pending.set(id, { at: now + ms, callback })
        return id
      },
      clear(handle: unknown) {
        if (pending.delete(handle as number)) stats.cleared++
      },
    },
    get pending() {
      return pending.size
    },
    advance(ms: number) {
      const target = now + ms
      for (;;) {
        const due = [...pending.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        pending.delete(due[0])
        now = due[1].at
        due[1].callback()
      }
      now = target
    },
  }
}

function fakeGeo() {
  const requests: Array<{
    ok: Parameters<GeolocationLike["getCurrentPosition"]>[0]
    fail: Parameters<GeolocationLike["getCurrentPosition"]>[1]
    options: Parameters<GeolocationLike["getCurrentPosition"]>[2]
  }> = []
  const geolocation: GeolocationLike = {
    getCurrentPosition(ok, fail, options) {
      requests.push({ ok, fail, options })
    },
  }
  return {
    geolocation,
    requests,
    succeed(latitude = 41.88, longitude = -87.63) {
      requests.forEach((r) => r.ok({ coords: { latitude, longitude } }))
    },
    fail(code: number) {
      requests.forEach((r) => r.fail({ code }))
    },
  }
}

function fakePermissions(initial: "prompt" | "granted" | "denied") {
  let state: string = initial
  const listeners = new Set<() => void>()
  const status: PermissionStatusLike = {
    get state() {
      return state
    },
    addEventListener: (_t, l) => void listeners.add(l),
    removeEventListener: (_t, l) => void listeners.delete(l),
  }
  const permissions: PermissionsLike = { query: async () => status }
  return {
    permissions,
    listeners,
    set(next: "prompt" | "granted" | "denied") {
      state = next
      ;[...listeners].forEach((l) => l())
    },
  }
}

// A promise's state, without awaiting it.
function watch<T>(promise: Promise<T>) {
  const box: { done: boolean; value?: T } = { done: false }
  void promise.then((value) => {
    box.done = true
    box.value = value
  })
  return box
}

const NATIVE_MAX = 0xffffffff

describe("getBrowserPosition: the native prompt is not a timeout", () => {
  it("never hands the browser a timeout that could fire while the prompt is open", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    void getBrowserPosition(g.geolocation, {
      permissions: p.permissions,
      timers: clock.timers,
    })
    assert.equal(g.requests[0].options?.timeout, NATIVE_MAX)
    assert.equal(g.requests[0].options?.maximumAge, 0)
    assert.equal(g.requests[0].options?.enableHighAccuracy, false)
  })

  it("1) a prompt left unanswered far beyond the timeout produces no outcome and runs no timer", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
    )
    await flush()
    clock.advance(10 * 60_000)
    await flush()
    assert.equal(result.done, false)
    assert.equal(clock.stats.set, 0)
    assert.equal(g.requests.length, 1) // asked once, never re-asked
  })

  it("2) Allow after that long delay: the pending request succeeds with the coordinates", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
    )
    await flush()
    clock.advance(60_000)
    p.set("granted") // the user clicks Allow
    g.succeed()
    await flush()
    assert.deepEqual(result.value, {
      status: "ok",
      latitude: 41.88,
      longitude: -87.63,
    })
    assert.equal(clock.pending, 0) // the post-grant timer was cleared, nothing left running
  })

  it("3) an explicit Block is denied", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const result = getBrowserPosition(g.geolocation, {
      permissions: p.permissions,
      timers: fakeClock().timers,
    })
    await flush()
    p.set("denied")
    g.fail(1)
    assert.deepEqual(await result, { status: "denied" })
  })

  it("4) closing the prompt with X is denied while the permission still reads 'prompt'", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const result = getBrowserPosition(g.geolocation, {
      permissions: p.permissions,
      timers: fakeClock().timers,
    })
    await flush()
    g.fail(1) // Chrome reports a dismissal as code 1 and leaves the state at 'prompt'
    assert.deepEqual(await result, { status: "denied" })
  })

  it("permission already denied: denied without waiting", async () => {
    const g = fakeGeo()
    const p = fakePermissions("denied")
    assert.deepEqual(
      await getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: fakeClock().timers,
      }),
      { status: "denied" }
    )
  })

  it("granted: a position that never comes is a timeout, but only after the timeout", async () => {
    const g = fakeGeo()
    const p = fakePermissions("granted")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
        timeoutMs: 10_000,
      })
    )
    await flush()
    clock.advance(9_999)
    await flush()
    assert.equal(result.done, false)
    clock.advance(1)
    await flush()
    assert.deepEqual(result.value, { status: "timeout" })
  })

  it("prompt -> granted starts the timer only then (the wait for the user is never counted)", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
        timeoutMs: 10_000,
      })
    )
    await flush()
    clock.advance(120_000)
    assert.equal(clock.stats.set, 0)
    p.set("granted")
    clock.advance(9_999)
    await flush()
    assert.equal(result.done, false)
    clock.advance(1)
    await flush()
    assert.deepEqual(result.value, { status: "timeout" })
  })

  it("7) repeated permission events start one timer and give one outcome", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
    )
    await flush()
    for (let i = 0; i < 5; i++) p.set("granted")
    assert.equal(clock.stats.set, 1)
    assert.equal(g.requests.length, 1) // no duplicate position request
    g.succeed()
    await flush()
    assert.equal(result.value?.status, "ok")
    assert.equal(p.listeners.size, 0)
  })

  it("6) late callbacks and timers cannot replace the first outcome", async () => {
    // timeout first, then a late success
    {
      const g = fakeGeo()
      const p = fakePermissions("granted")
      const clock = fakeClock()
      const result = getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
      await flush()
      clock.advance(10_000)
      assert.deepEqual(await result, { status: "timeout" })
      g.succeed()
      g.fail(1)
      assert.deepEqual(await result, { status: "timeout" })
    }
    // success first, then a late denial, a late permission change and the timer
    {
      const g = fakeGeo()
      const p = fakePermissions("granted")
      const clock = fakeClock()
      const result = getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
      await flush()
      g.succeed(1, 2)
      assert.deepEqual(await result, {
        status: "ok",
        latitude: 1,
        longitude: 2,
      })
      g.fail(1)
      p.set("denied")
      clock.advance(60_000)
      assert.deepEqual(await result, {
        status: "ok",
        latitude: 1,
        longitude: 2,
      })
    }
  })

  it("a native timeout reported while the prompt is unanswered is not a denial: it asks again and waits", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: p.permissions,
        timers: clock.timers,
      })
    )
    await flush()
    g.fail(3)
    await flush()
    assert.equal(result.done, false)
    clock.advance(1_000)
    assert.equal(g.requests.length, 2)
    p.set("granted")
    g.requests[1].ok({ coords: { latitude: 3, longitude: 4 } })
    await flush()
    assert.deepEqual(result.value, { status: "ok", latitude: 3, longitude: 4 })
  })

  it("a native timeout with the permission granted (or no Permissions API) is a timeout", async () => {
    const g1 = fakeGeo()
    const granted = getBrowserPosition(g1.geolocation, {
      permissions: fakePermissions("granted").permissions,
      timers: fakeClock().timers,
    })
    await flush()
    g1.fail(3)
    assert.deepEqual(await granted, { status: "timeout" })

    const g2 = fakeGeo()
    const noApi = getBrowserPosition(g2.geolocation, {
      permissions: null,
      timers: fakeClock().timers,
    })
    g2.fail(3)
    assert.deepEqual(await noApi, { status: "timeout" })
  })

  it("without the Permissions API the timer starts at once (the prompt cannot be observed)", async () => {
    const g = fakeGeo()
    const clock = fakeClock()
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions: null,
        timers: clock.timers,
        timeoutMs: 10_000,
      })
    )
    await flush()
    assert.equal(clock.stats.set, 1)
    clock.advance(10_000)
    await flush()
    assert.deepEqual(result.value, { status: "timeout" })
  })

  it("a Permissions API that throws behaves like none", async () => {
    const g = fakeGeo()
    const clock = fakeClock()
    const permissions: PermissionsLike = {
      query: async () => {
        throw new Error("unsupported")
      },
    }
    const result = watch(
      getBrowserPosition(g.geolocation, {
        permissions,
        timers: clock.timers,
        timeoutMs: 5_000,
      })
    )
    await flush()
    clock.advance(5_000)
    await flush()
    assert.deepEqual(result.value, { status: "timeout" })
  })

  it("8) aborting cancels the wait and removes every listener and timer", async () => {
    const g = fakeGeo()
    const p = fakePermissions("prompt")
    const clock = fakeClock()
    const controller = new AbortController()
    const result = getBrowserPosition(g.geolocation, {
      permissions: p.permissions,
      timers: clock.timers,
      signal: controller.signal,
    })
    await flush()
    assert.equal(p.listeners.size, 1)
    controller.abort()
    assert.deepEqual(await result, { status: "cancelled" })
    assert.equal(p.listeners.size, 0)
    assert.equal(clock.pending, 0)
    g.succeed() // a late answer is ignored
    assert.deepEqual(await result, { status: "cancelled" })
  })

  it("an already-aborted signal never touches the geolocation API", async () => {
    const g = fakeGeo()
    const controller = new AbortController()
    controller.abort()
    assert.deepEqual(
      await getBrowserPosition(g.geolocation, {
        permissions: fakePermissions("prompt").permissions,
        signal: controller.signal,
      }),
      { status: "cancelled" }
    )
    assert.equal(g.requests.length, 0)
  })
})

describe("onGeolocationGranted", () => {
  it("fires once when the permission CHANGES to granted; repeated events do not repeat it", async () => {
    const p = fakePermissions("denied")
    let calls = 0
    onGeolocationGranted(() => calls++, p.permissions)
    await flush()
    p.set("granted")
    p.set("granted")
    p.set("prompt")
    p.set("granted")
    assert.equal(calls, 1)
  })

  it("an already-granted permission does not fire it", async () => {
    const p = fakePermissions("granted")
    let calls = 0
    onGeolocationGranted(() => calls++, p.permissions)
    await flush()
    p.set("granted")
    assert.equal(calls, 0)
  })

  it("stops watching when disposed, even before the permission query resolves", async () => {
    const p = fakePermissions("prompt")
    let calls = 0
    const stop = onGeolocationGranted(() => calls++, p.permissions)
    stop()
    await flush()
    assert.equal(p.listeners.size, 0)
    p.set("granted")
    assert.equal(calls, 0)
    const stop2 = onGeolocationGranted(() => calls++, p.permissions)
    await flush()
    stop2()
    assert.equal(p.listeners.size, 0)
  })

  it("without the Permissions API it watches nothing", () => {
    assert.doesNotThrow(() => onGeolocationGranted(() => {}, null)())
  })
})

// ---------------------------------------------------------------------------
// The whole detection, with the real position wrapper over the fakes.
// ---------------------------------------------------------------------------
const GPS_RESOLVED = {
  status: "resolved",
  countryCode: "US",
  countryName: "United States",
  city: "Chicago",
  regionCode: "IL",
  regionName: "Illinois",
  latitude: 41.88,
  longitude: -87.63,
}
const IP_BODY = { ...GPS_RESOLVED, status: undefined }

function detection(initial: "prompt" | "granted" | "denied" = "prompt") {
  const g = fakeGeo()
  const p = fakePermissions(initial)
  const clock = fakeClock()
  const gate = createLocationConsentGate()
  const counts = { consent: 0, ipLookups: 0, gpsCalls: 0, cancelConsent: 0 }
  const controller = new AbortController()
  let live = true
  const run = () =>
    getDetectedLocation({
      useBrowserLocation: true,
      signal: controller.signal,
      isCurrent: () => live,
      getPosition: (signal) =>
        getBrowserPosition(g.geolocation, {
          permissions: p.permissions,
          timers: clock.timers,
          signal,
        }),
      watchGeolocationGranted: (listener) =>
        onGeolocationGranted(listener, p.permissions),
      fetchGpsLocation: async () => {
        counts.gpsCalls++
        return GPS_RESOLVED
      },
      fetchLocation: async () => {
        counts.ipLookups++
        return IP_BODY
      },
      requestApproximateConsent: () => {
        counts.consent++
        return gate.request()
      },
      cancelApproximateConsent: () => {
        counts.cancelConsent++
        gate.cancel()
      },
    })
  return {
    g,
    p,
    clock,
    gate,
    counts,
    controller,
    run,
    stale: () => {
      live = false
    },
  }
}

describe("detection: Chrome's prompt first, the custom dialog only after a definitive outcome", () => {
  it("1) prompt unanswered beyond the old timeout: no custom dialog, no IP lookup", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.clock.advance(5 * 60_000)
    await flush()
    assert.equal(result.done, false)
    assert.equal(d.counts.consent, 0)
    assert.equal(d.gate.pending, false)
    assert.equal(d.counts.ipLookups, 0)
  })

  it("2) the user then allows: the GPS path succeeds, with no dialog and no IP lookup", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.clock.advance(60_000)
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(result.value?.city, "Chicago")
    assert.equal(result.value?.detected, true)
    assert.equal(d.counts.gpsCalls, 1)
    assert.equal(d.counts.consent, 0)
    assert.equal(d.counts.ipLookups, 0)
  })

  it("3) an explicit Block opens the custom dialog exactly once", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.p.set("denied")
    d.g.fail(1)
    await flush()
    assert.equal(d.counts.consent, 1)
    assert.equal(d.gate.pending, true)
    assert.equal(d.counts.ipLookups, 0)
    d.gate.decide("deny")
    await flush()
    assert.equal(result.value?.consentDenied, true)
    assert.equal(d.counts.consent, 1)
  })

  it("4) closing the Chrome prompt (X) opens the custom dialog exactly once", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    assert.equal(d.counts.consent, 1)
    d.gate.decide("allow")
    await flush()
    assert.equal(d.counts.ipLookups, 1)
    assert.equal(result.value?.city, "Chicago")
  })

  it("an unsupported browser opens the dialog once", async () => {
    const clock = fakeClock()
    const gate = createLocationConsentGate()
    let asked = 0
    const result = watch(
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: () =>
          getBrowserPosition(undefined, {
            permissions: null,
            timers: clock.timers,
          }),
        watchGeolocationGranted: () => () => {},
        requestApproximateConsent: () => {
          asked++
          return gate.request()
        },
        fetchLocation: async () => IP_BODY,
      })
    )
    await flush()
    assert.equal(asked, 1)
    gate.decide("deny")
    await flush()
    assert.equal(result.value?.consentDenied, true)
  })

  it("permission granted but no coordinates in time (timeout) opens the dialog once", async () => {
    const d = detection("granted")
    const result = watch(d.run())
    await flush()
    assert.equal(d.counts.consent, 0)
    d.clock.advance(10_000)
    await flush()
    assert.equal(d.counts.consent, 1)
    d.gate.decide("deny")
    await flush()
    assert.equal(result.value?.consentDenied, true)
  })

  it("5) permission becomes granted while the dialog is open: it is withdrawn and GPS wins", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1) // dismissed -> the custom dialog opens
    await flush()
    assert.equal(d.counts.consent, 1)
    assert.equal(d.gate.pending, true)
    d.p.set("granted") // ... and then the user allows location after all
    await flush()
    assert.equal(d.counts.cancelConsent, 1)
    assert.equal(d.gate.pending, false)
    assert.equal(d.g.requests.length, 2) // a fresh browser position was requested
    d.g.requests[1].ok({ coords: { latitude: 41.88, longitude: -87.63 } })
    await flush()
    assert.equal(result.value?.city, "Chicago")
    assert.equal(result.value?.consentDenied, undefined)
    assert.equal(d.counts.consent, 1) // never asked a second time
    assert.equal(d.counts.ipLookups, 0)
  })

  it("7) repeated permission events while the dialog is open withdraw it once and request one position", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    for (let i = 0; i < 4; i++) d.p.set("granted")
    await flush()
    assert.equal(d.counts.cancelConsent, 1)
    assert.equal(d.g.requests.length, 2)
    d.g.requests[1].ok({ coords: { latitude: 41.88, longitude: -87.63 } })
    await flush()
    assert.equal(result.value?.detected, true)
    assert.equal(d.counts.gpsCalls, 1)
  })

  it("6) once the user answers the dialog, a late permission change cannot replace that outcome", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    d.gate.decide("deny")
    await flush()
    assert.equal(result.value?.consentDenied, true)
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(result.value?.consentDenied, true)
    assert.equal(d.counts.cancelConsent, 0)
    assert.equal(d.counts.gpsCalls, 0)
  })

  it("8) cancelling (route, logout, account or role change, unmount) ends the wait for Chrome's prompt", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.stale()
    d.controller.abort() // what the host's reset / unmount does
    await flush()
    assert.equal(result.value?.cancelled, true)
    assert.equal(d.p.listeners.size, 0)
    assert.equal(d.clock.pending, 0)
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(d.counts.consent, 0)
    assert.equal(d.counts.gpsCalls, 0)
    assert.equal(d.counts.ipLookups, 0)
  })

  it("8b) cancelling while the dialog is open drops the dialog's answer and the permission watcher", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    d.stale()
    d.gate.cancel()
    await flush()
    assert.equal(result.value?.cancelled, true)
    assert.equal(d.p.listeners.size, 0)
    d.p.set("granted")
    await flush()
    assert.equal(d.g.requests.length, 1) // no retry for a dead attempt
  })
})

describe("the host's wiring (source guards)", () => {
  const host = readFileSync(
    join(process.cwd(), "contexts", "identity-verification-host.tsx"),
    "utf8"
  )

  it("every browser-location attempt carries an abort signal and can cancel the dialog", () => {
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[locationConsentGate]", at))
    assert.ok(wrapper.includes("new AbortController()"))
    assert.ok(wrapper.includes("signal: controller.signal"))
    assert.ok(
      wrapper.includes("cancelApproximateConsent: locationConsentGate.cancel")
    )
    assert.ok(wrapper.includes("locationAbortsRef.current.delete(controller)"))
  })

  it("reset and unmount abort every pending wait", () => {
    const at = host.indexOf("const cancelLocationDetection = useCallback(")
    const body = host.slice(at, host.indexOf("[locationConsentGate]", at))
    assert.ok(
      body.includes(
        "locationAbortsRef.current.forEach((controller) => controller.abort())"
      )
    )
    assert.ok(body.includes("locationAbortsRef.current.clear()"))
  })
})

// type-only reference so the unused import of the result type documents the contract
export type _Contract = BrowserPositionResult
