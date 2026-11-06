// Run like detected-location.test.ts (from the frontend/ directory):
//   npx tsc src/lib/api/browser-permission-race.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && node --test <tmp>/src/lib/api/browser-permission-race.test.js
//
// BTB-387 race: the recovery dialog opened UNDER Chrome's own permission prompt
// because the position request's timeout kept running while the prompt waited for
// the user. Everything here is deterministic: a fake clock, a fake
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
  queryGeolocationPermission,
} from "./browser-geolocation"
import { getDetectedLocation } from "./detected-location"

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

describe("queryGeolocationPermission", () => {
  it("reads the three states without prompting", async () => {
    for (const state of ["prompt", "granted", "denied"] as const) {
      assert.equal(
        await queryGeolocationPermission(fakePermissions(state).permissions),
        state
      )
    }
  })

  it("is undefined without the Permissions API or when the query fails or answers oddly", async () => {
    assert.equal(await queryGeolocationPermission(null), undefined)
    assert.equal(
      await queryGeolocationPermission({
        query: async () => {
          throw new Error("unsupported")
        },
      }),
      undefined
    )
    assert.equal(
      await queryGeolocationPermission({
        query: async () =>
          ({
            ...fakePermissions("prompt").permissions,
            state: "weird",
          }) as never,
      }),
      undefined
    )
  })
})

// ---------------------------------------------------------------------------
// The whole detection, with the real position wrapper over the fakes. The browser's
// own prompt comes first; the "Turn on location" dialog (see location-recovery.ts) is
// only ever shown for a definitive failure, and nothing here ever reaches the network
// (IP) lookup.
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

function detection(initial: "prompt" | "granted" | "denied" = "prompt") {
  const g = fakeGeo()
  const p = fakePermissions(initial)
  const clock = fakeClock()
  const counts = { ipLookups: 0, gpsCalls: 0 }
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
      getPermissionState: () => queryGeolocationPermission(p.permissions),
      fetchGpsLocation: async () => {
        counts.gpsCalls++
        return GPS_RESOLVED
      },
      fetchLocation: async () => {
        counts.ipLookups++
        return GPS_RESOLVED
      },
    })
  return {
    g,
    p,
    clock,
    counts,
    controller,
    run,
    stale: () => {
      live = false
    },
  }
}

describe("detection: Chrome's prompt first, a failure only after a definitive outcome", () => {
  it("1) a prompt left unanswered far beyond the old timeout produces no failure", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.clock.advance(5 * 60_000)
    await flush()
    assert.equal(result.done, false)
    assert.equal(d.counts.ipLookups, 0)
  })

  it("2) the user then allows: the GPS path succeeds, with no failure and no IP lookup", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.clock.advance(60_000)
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(result.value?.city, "Chicago")
    assert.equal(result.value?.detected, true)
    assert.equal(result.value?.locationFailure, undefined)
    assert.equal(d.counts.gpsCalls, 1)
    assert.equal(d.counts.ipLookups, 0)
  })

  it("3) an explicit Block is reported as blocked", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.p.set("denied")
    d.g.fail(1)
    await flush()
    assert.equal(result.value?.locationFailure, "blocked")
    assert.equal(d.counts.ipLookups, 0)
    assert.equal(result.value?.countryCode, "")
  })

  it("4) closing the Chrome prompt (code 1 while the permission still reads 'prompt') is dismissed", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    assert.equal(result.value?.locationFailure, "dismissed")
    assert.equal(d.counts.ipLookups, 0)
  })

  it("an unsupported browser is reported as unsupported", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: () =>
        getBrowserPosition(undefined, {
          permissions: null,
          timers: fakeClock().timers,
        }),
      fetchLocation: async () => assert.fail("must not look up the IP"),
    })
    assert.equal(result.locationFailure, "unsupported")
  })

  it("permission granted but the device cannot provide a position (code 2) is device_unavailable", async () => {
    const d = detection("granted")
    const result = watch(d.run())
    await flush()
    d.g.fail(2)
    await flush()
    assert.equal(result.value?.locationFailure, "device_unavailable")
  })

  it("permission granted but no coordinates in time is a timeout, and only after the timeout", async () => {
    const d = detection("granted")
    const result = watch(d.run())
    await flush()
    d.clock.advance(9_999)
    await flush()
    assert.equal(result.done, false)
    d.clock.advance(1)
    await flush()
    assert.equal(result.value?.locationFailure, "timeout")
  })

  it("6) a late GPS answer after the outcome cannot replace it", async () => {
    const d = detection("prompt")
    const result = watch(d.run())
    await flush()
    d.g.fail(1)
    await flush()
    assert.equal(result.value?.locationFailure, "dismissed")
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(result.value?.locationFailure, "dismissed")
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
    assert.equal(result.value?.locationFailure, undefined)
    assert.equal(d.p.listeners.size, 0)
    assert.equal(d.clock.pending, 0)
    d.p.set("granted")
    d.g.succeed()
    await flush()
    assert.equal(d.counts.gpsCalls, 0)
    assert.equal(d.counts.ipLookups, 0)
  })
})

describe("the host's wiring of the native-prompt wait (source guards)", () => {
  const host = readFileSync(
    join(process.cwd(), "contexts", "identity-verification-host.tsx"),
    "utf8"
  )

  it("every browser-location attempt carries an abort signal", () => {
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[]\n  )", at))
    assert.ok(wrapper.includes("new AbortController()"))
    assert.ok(wrapper.includes("signal: controller.signal"))
    assert.ok(wrapper.includes("locationAbortsRef.current.delete(controller)"))
  })

  it("reset and unmount abort every pending wait", () => {
    const at = host.indexOf("const cancelLocationDetection = useCallback(")
    const body = host.slice(at, host.indexOf("[locationRecovery]", at))
    assert.ok(
      body.includes(
        "locationAbortsRef.current.forEach((controller) => controller.abort())"
      )
    )
    assert.ok(body.includes("locationAbortsRef.current.clear()"))
    assert.ok(body.includes("locationRecovery.abort()"))
  })
})

// type-only reference so the unused import of the result type documents the contract
export type _Contract = BrowserPositionResult
