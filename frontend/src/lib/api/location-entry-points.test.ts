// Run like detected-location.test.ts (from the frontend/ directory).
//
// BTB-387, Christopher's confirmed rule: every identity-verification entry point that opens a
// screen showing the user's location asks the browser for the DEVICE location first. If it
// cannot be obtained the "Turn on location to continue" dialog opens and the flow stays closed;
// there is no IP-derived country, city or map, and nothing is written before a GPS result.
//
// The runtime half drives the real getDetectedLocation, createLocationRecovery and
// createDeviceLocationRequester through each entry point's composition; the source half pins
// the order inside each handler (location first, return on null, only then close/open/write).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  getDetectedLocation,
  type DetectedLocation,
  type GetDetectedLocationOptions,
} from "./detected-location"
import { createDeviceLocationRequester } from "./device-location-request"
import { createLocationRecovery } from "./location-recovery"
import { startChangeHomeCountry } from "./location-mismatch"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const dashboard = read("app", "(group)", "talent-dashboard", "page.tsx")
const host = read("contexts", "identity-verification-host.tsx")
const flush = () => new Promise<void>((r) => setImmediate(r))
const between = (s: string, a: string, b: string) => {
  const i = s.indexOf(a)
  assert.ok(i > -1, a)
  const j = s.indexOf(b, i)
  assert.ok(j > -1, b)
  return s.slice(i, j)
}

type Outcome =
  | { status: "ok" }
  | { status: "denied"; permission: "denied" | "prompt" }
  | { status: "unsupported" }
  | { status: "unavailable" }
  | { status: "timeout" }

const GPS_US = {
  status: "resolved",
  countryCode: "US",
  countryName: "United States",
  city: "Austin",
  regionCode: "TX",
  regionName: "Texas",
  latitude: 30.27,
  longitude: -97.74,
}

// One simulated browser + backend + page. `outcomes` are consumed one per geolocation request.
function world(outcomes: Outcome[]) {
  const log = { positionRequests: 0, ipLookups: 0, gpsResolves: 0 }
  let current: Outcome = { status: "denied", permission: "denied" }
  const pending: Array<(o: Outcome) => void> = []
  const options = (): GetDetectedLocationOptions =>
    ({
      getPosition: (signal?: AbortSignal) => {
        log.positionRequests += 1
        const next = outcomes.shift()
        const settle = (o: Outcome) => {
          current = o
          return o.status === "ok"
            ? { status: "ok", latitude: 30.27, longitude: -97.74 }
            : { status: o.status === "denied" ? "denied" : o.status }
        }
        if (next) return Promise.resolve(settle(next))
        // nothing scripted: the prompt stays open until the test answers or aborts it
        return new Promise((resolve) => {
          pending.push((o) => resolve(settle(o)))
          signal?.addEventListener("abort", () => resolve({ status: "cancelled" }), { once: true })
        })
      },
      getPermissionState: async () =>
        current.status === "denied" ? current.permission : "denied",
      fetchGpsLocation: async () => {
        log.gpsResolves += 1
        return GPS_US
      },
      // the IP lookup: must never be reached from a device-location request
      fetchLocation: async () => {
        log.ipLookups += 1
        return { countryCode: "US", countryName: "United States", city: "Austin", regionCode: "TX", latitude: 1, longitude: 2 }
      },
    }) as unknown as GetDetectedLocationOptions

  let attempt = 0
  const dialogs: string[] = []
  const recovery = createLocationRecovery({
    detect: (ctx) =>
      getDetectedLocation({ useBrowserLocation: true, ...options(), signal: ctx.signal, isCurrent: ctx.isCurrent }),
    onChange: (state) => dialogs.push(state.open ? `open:${state.reason}${state.busy ? ":busy" : ""}` : "closed"),
  })
  const request = createDeviceLocationRequester({
    detect: (o) => getDetectedLocation({ useBrowserLocation: true, ...options(), ...o }),
    recovery,
    attempt: () => attempt,
  })
  return {
    log,
    dialogs,
    recovery,
    request,
    answer: (o: Outcome) => pending.shift()?.(o),
    navigate: () => {
      attempt += 1
      recovery.abort()
    },
  }
}

// The compositions the entry points use, with spies for what must NOT happen early.
interface EntryHarness {
  opened: DetectedLocation[]
  writes: string[]
  press: (w: ReturnType<typeof world>, signal?: AbortSignal) => Promise<void>
}
function changeHomeCountryEntry(): EntryHarness {
  const h: EntryHarness = {
    opened: [],
    writes: [],
    press: async (w, signal) => {
      const launch = await startChangeHomeCountry({
        getDetectedLocation: (o) => getDetectedLocation(o),
        requestDeviceLocation: () => w.request({ signal }),
      })
      if (launch) h.opened.push(launch.location) // openFlowFromMismatch: the flow opens
    },
  }
  return h
}
function updateEntry(): EntryHarness {
  // Travel Mode Update (popup, live card): location first, then close the popup and open the flow.
  const h: EntryHarness = {
    opened: [],
    writes: [],
    press: async (w, signal) => {
      const location = await w.request({ signal })
      if (!location) return
      h.opened.push(location)
    },
  }
  return h
}
const ENTRIES: Array<[string, () => EntryHarness]> = [
  ["Location mismatch -> Change my home country", changeHomeCountryEntry],
  ["Traveler prompt -> Change my home country", changeHomeCountryEntry],
  ["Still traveling? check-in -> Update my home country", changeHomeCountryEntry],
  ["Travel Mode Update popup", updateEntry],
  ["Live Travel Mode card Update", updateEntry],
]

for (const [name, make] of ENTRIES) {
  describe(`runtime: ${name}`, () => {
    it("GPS success opens the location screen with the device location, no dialog, no IP lookup", async () => {
      const w = world([{ status: "ok" }])
      const e = make()
      await e.press(w)
      assert.equal(e.opened.length, 1)
      assert.equal(e.opened[0].city, "Austin")
      assert.equal(e.opened[0].detected, true)
      assert.deepEqual(w.dialogs, [])
      assert.equal(w.log.ipLookups, 0)
    })

    for (const [label, outcome, reason] of [
      ["blocked permission", { status: "denied", permission: "denied" }, "blocked"],
      ["dismissed prompt", { status: "denied", permission: "prompt" }, "dismissed"],
      ["unsupported browser", { status: "unsupported" }, "unsupported"],
      ["unavailable device location", { status: "unavailable" }, "device_unavailable"],
      ["timeout", { status: "timeout" }, "timeout"],
    ] as Array<[string, Outcome, string]>) {
      it(`${label}: the recovery dialog opens, the screen stays closed, nothing is read from the IP`, async () => {
        const w = world([outcome])
        const e = make()
        const pressed = e.press(w)
        await flush()
        assert.deepEqual(w.dialogs, [`open:${reason}`])
        assert.equal(e.opened.length, 0, "the location screen is closed while the dialog is open")
        assert.equal(w.log.ipLookups, 0)
        w.recovery.cancel()
        await pressed
        assert.equal(e.opened.length, 0)
        assert.deepEqual(e.writes, [])
        assert.equal(w.log.ipLookups, 0)
      })
    }

    it("Cancel gives up: no screen, no write, the originating screen is untouched", async () => {
      const w = world([{ status: "denied", permission: "denied" }])
      const e = make()
      const pressed = e.press(w)
      await flush()
      w.recovery.cancel()
      await pressed
      assert.equal(e.opened.length, 0)
      assert.equal(w.dialogs.at(-1), "closed")
    })

    it("Try Again reuses the recovery controller (busy, then GPS opens the screen)", async () => {
      const w = world([{ status: "denied", permission: "denied" }, { status: "ok" }])
      const e = make()
      const pressed = e.press(w)
      await flush()
      assert.equal(e.opened.length, 0)
      await w.recovery.tryAgain()
      await pressed
      assert.ok(w.dialogs.includes("open:blocked:busy"), "the dialog's own loading state was used")
      assert.equal(e.opened.length, 1)
      assert.equal(e.opened[0].city, "Austin")
      assert.equal(w.dialogs.at(-1), "closed")
      assert.equal(w.log.ipLookups, 0)
    })

    it("Try Again that fails again keeps the dialog and the screen closed", async () => {
      const w = world([
        { status: "denied", permission: "denied" },
        { status: "denied", permission: "prompt" },
      ])
      const e = make()
      const pressed = e.press(w)
      await flush()
      await w.recovery.tryAgain()
      assert.equal(e.opened.length, 0)
      assert.equal(w.recovery.state.open, true)
      assert.equal(w.recovery.state.reason, "dismissed")
      w.recovery.cancel()
      await pressed
    })

    it("a route, account or role change while the prompt waits drops the answer: nothing opens", async () => {
      const w = world([]) // the browser's own prompt is open and unanswered
      const e = make()
      const pressed = e.press(w)
      await flush()
      w.navigate()
      w.answer({ status: "ok" }) // the late answer
      await pressed
      assert.equal(e.opened.length, 0)
    })

    it("a navigation while the recovery dialog is open closes it and opens nothing", async () => {
      const w = world([{ status: "denied", permission: "denied" }])
      const e = make()
      const pressed = e.press(w)
      await flush()
      w.navigate()
      await pressed
      assert.equal(e.opened.length, 0)
      assert.equal(w.dialogs.at(-1), "closed")
    })

    it("the caller's AbortSignal (unmount / logout) cancels the wait and the dialog", async () => {
      const w = world([{ status: "denied", permission: "denied" }])
      const e = make()
      const controller = new AbortController()
      const pressed = e.press(w, controller.signal)
      await flush()
      controller.abort()
      await pressed
      assert.equal(e.opened.length, 0)
      assert.equal(w.recovery.state.open, false)
    })

    it("duplicate presses are ignored: one browser request, one dialog, one screen", async () => {
      const w = world([{ status: "ok" }])
      const e = make()
      await Promise.all([e.press(w), e.press(w), e.press(w)])
      assert.equal(w.log.positionRequests, 1)
      assert.equal(e.opened.length, 1)

      const w2 = world([{ status: "denied", permission: "denied" }])
      const e2 = make()
      const first = e2.press(w2)
      await flush()
      await e2.press(w2) // pressed again while the dialog is open
      assert.equal(w2.log.positionRequests, 1)
      assert.deepEqual(w2.dialogs, ["open:blocked"])
      w2.recovery.cancel()
      await first
    })

    it("no IP fallback: a failed device location never produces an IP-derived country, city or map", async () => {
      const w = world([{ status: "unavailable" }])
      const e = make()
      const pressed = e.press(w)
      await flush()
      w.recovery.cancel()
      await pressed
      assert.equal(w.log.ipLookups, 0)
      assert.equal(e.opened.length, 0)
    })
  })
}

describe("source: the order inside every entry point (location first, then close, open or write)", () => {
  const popup = between(dashboard, "const handleTravelUpdate = useCallback(", "[travelPopup, openFlow, requestDeviceLocation]")
  const live = between(host, "const handleLiveTravelUpdate = useCallback(", "}, [openFlow, requestDeviceLocation])")
  const mismatch = between(dashboard, "const handleChangeHomeCountry = useCallback(", "}, [openFlowFromMismatch, requestDeviceLocation])")
  const checkIn = between(dashboard, "const handleCheckInUpdateHomeCountry = useCallback(", "// The host calls these")
  const verify = between(host, "// Explicit user action: the only place browser location is requested.", "setDetectedLocation(location)")
  const relocate = between(host, "const refreshLocationForRelocation = useCallback(", "}, [])")

  it("Travel Mode Update popup: device location first, popup closed and flow opened only after it", () => {
    assert.ok(popup.includes("await requestDeviceLocation()"))
    assert.ok(!popup.includes("getDetectedLocation("))
    const at = popup.indexOf("if (!location) return")
    assert.ok(at > popup.indexOf("await requestDeviceLocation()"))
    assert.ok(popup.indexOf("setTravelPopup(null)") > at)
    assert.ok(popup.indexOf("openFlow(") > at)
  })
  it("live Travel Mode card Update (any page): device location first, flow opened only after it", () => {
    assert.ok(live.includes("await requestDeviceLocation()"))
    assert.ok(!live.includes("getDetectedLocation("))
    assert.ok(live.indexOf("openFlow(") > live.indexOf("if (!location) return"))
  })
  it("mismatch / traveler prompt Change my home country: the prompt stays open until a location exists", () => {
    assert.ok(mismatch.includes("startChangeHomeCountry({"))
    assert.ok(mismatch.includes("if (launch) openFlowFromMismatch(launch, \"change-country\")"))
    assert.ok(!mismatch.includes("IdentityVerificationAPI"))
  })
  it("check-in Update my home country: nothing is dismissed or opened without a location", () => {
    const at = checkIn.indexOf("if (!launch) return")
    assert.ok(at > checkIn.indexOf("await startChangeHomeCountry({"))
    assert.ok(checkIn.indexOf("checkInDismissalsRef.current.dismiss(") > at)
    assert.ok(checkIn.indexOf("openFlowFromMismatch(") > at)
    assert.ok(!checkIn.includes("IdentityVerificationAPI"))
  })
  it("Verify My Account (and every caller of startVerification): GPS first, the flow opens only without a failure", () => {
    assert.ok(verify.includes("getDetectedLocation({ useBrowserLocation: true })"))
    assert.ok(verify.indexOf("if (location.locationFailure)") > verify.indexOf("getDetectedLocation({ useBrowserLocation: true })"))
    assert.ok(verify.includes("openLocationRecovery(location.locationFailure"))
  })
  it("Permanently relocated: the device location, the recovery dialog on failure, the flow waits", () => {
    assert.ok(relocate.includes("getDetectedLocation({ useBrowserLocation: true })"))
    assert.ok(relocate.includes("openLocationRecovery("))
  })
  it("the only getDetectedLocation() call without the device option left in the app is the traveling-duration screen, which shows no location", () => {
    assert.ok(!dashboard.includes("await getDetectedLocation()"))
    assert.ok(!host.includes("await getDetectedLocation()"))
    const mismatchLib = read("src", "lib", "api", "location-mismatch.ts")
    const still = between(mismatchLib, "export async function startStillTraveling", "/**\n * \"Change my home country\"")
    assert.ok(still.includes('initialState: "traveling-showcase"'))
  })
  it("the dashboard cancels its pending location request on unmount and on an account change", () => {
    assert.ok(dashboard.includes("deviceLocationRequestRef.current?.abort()"))
    assert.equal((dashboard.match(/deviceLocationRequestRef\.current\?\.abort\(\)/g) ?? []).length, 2)
    assert.ok(dashboard.includes("signal: controller.signal"))
    assert.ok(dashboard.includes("isCurrent: () => !controller.signal.aborted"))
    assert.ok(dashboard.includes("if (deviceLocationRequestRef.current) return null"))
  })
  it("the host cancels pending requests on navigation, logout, account switch, role change and unmount", () => {
    assert.ok(host.includes("cancelLocationDetection() // and so does a pending location request or its dialog"))
    assert.ok(host.includes("useEffect(() => cancelLocationDetection, [cancelLocationDetection])"))
    assert.ok(host.includes("attempt: () => locationAttemptRef.current"))
  })
})

// ---------------------------------------------------------------------------------------------
// Inside the flow: the transitions that lead to the current-location screen (Back from "How long
// are you traveling?", the travel reminder's Update) for a flow opened with the server-derived
// location. The REAL flow helper (goToLocationScreen) and the REAL host callback
// (requestLocationForFlow) are run from their source against the simulated browser above.
// ---------------------------------------------------------------------------------------------
const flowSource = read("components", "identity-verification-flow.tsx")
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>

const goBody = (() => {
  const head = "const goToLocationScreen = (event: \"BACK\" | \"UPDATE_LOCATION\", then?: () => void) => {"
  const at = flowSource.indexOf("const goToLocationScreen = (")
  assert.ok(at > -1)
  const open = flowSource.indexOf("=> {", at) + "=> {".length
  void head
  return flowSource.slice(open, flowSource.indexOf("\n  }\n", open))
})()
const hostCallbackBody = (() => {
  const marker = "const requestLocationForFlow = useCallback(async () => {"
  const at = host.indexOf(marker)
  assert.ok(at > -1)
  return host.slice(at + marker.length, host.indexOf("\n  }, [requestDeviceLocation])", at))
})()

function flowHarness(w: ReturnType<typeof world>, options: { guarded?: boolean; mounted?: () => boolean } = {}) {
  const calls: string[] = []
  const state = { detected: null as DetectedLocation | null, ipLocationOnly: true }
  const ref: { current: AbortController | null } = { current: null }
  const callback = new AsyncFunction(
    "requestDeviceLocation", "setDetectedLocation", "setFlowLaunch", "flowLocationRequestRef",
    hostCallbackBody
  )
  const onBeforeLocationScreen = options.guarded === false
    ? undefined
    : () =>
        callback(
          (o: unknown) => w.request(o as never),
          (l: DetectedLocation) => { state.detected = l; calls.push("detected:" + l.city) },
          (fn: (p: { ipLocationOnly?: boolean }) => { ipLocationOnly?: boolean }) => { state.ipLocationOnly = Boolean(fn({ ipLocationOnly: true }).ipLocationOnly); calls.push("launch:ipLocationOnly=" + state.ipLocationOnly) },
          ref
        ) as Promise<boolean>
  const pendingRef = { current: false }
  const go = new Function(
    "onBeforeLocationScreen", "locationScreenPendingRef", "getIsMounted", "send", "event", "then",
    goBody
  ) as (...a: unknown[]) => void
  const press = (event: "BACK" | "UPDATE_LOCATION", then?: () => void) =>
    go(onBeforeLocationScreen, pendingRef, options.mounted ?? (() => true), (e: string) => calls.push("send:" + e), event, then)
  return { calls, state, ref, press, pendingRef }
}

describe("inside the flow: Back from 'How long are you traveling?' and the reminder's Update need the device location", () => {
  it("GPS success: the detected location is replaced with the device's, the flag is cleared, then the screen opens", async () => {
    const w = world([{ status: "ok" }])
    const f = flowHarness(w)
    f.press("BACK")
    await flush(); await flush()
    assert.deepEqual(f.calls, ["detected:Austin", "launch:ipLocationOnly=false", "send:BACK"])
    assert.equal(w.log.ipLookups, 0)
    assert.deepEqual(w.dialogs, [])
  })

  for (const [label, outcome] of [
    ["blocked", { status: "denied", permission: "denied" }],
    ["dismissed", { status: "denied", permission: "prompt" }],
    ["unsupported", { status: "unsupported" }],
    ["unavailable", { status: "unavailable" }],
    ["timeout", { status: "timeout" }],
  ] as Array<[string, Outcome]>) {
    it(`${label}: the user stays on the current screen, the dialog opens, Cancel leaves them there, no IP lookup`, async () => {
      const w = world([outcome])
      const f = flowHarness(w)
      f.press("BACK")
      await flush()
      assert.equal(w.recovery.state.open, true)
      assert.deepEqual(f.calls, [], "the screen has not moved")
      w.recovery.cancel()
      await flush(); await flush()
      assert.deepEqual(f.calls, [], "Cancel returns to the current screen")
      assert.equal(f.pendingRef.current, false, "the next press can start again")
      assert.equal(w.log.ipLookups, 0)
    })
  }

  it("Try Again: updates the detected location, then opens the location screen", async () => {
    const w = world([{ status: "denied", permission: "denied" }, { status: "ok" }])
    const f = flowHarness(w)
    f.press("BACK")
    await flush()
    assert.deepEqual(f.calls, [])
    await w.recovery.tryAgain()
    await flush(); await flush()
    assert.deepEqual(f.calls, ["detected:Austin", "launch:ipLocationOnly=false", "send:BACK"])
    assert.ok(w.dialogs.includes("open:blocked:busy"))
  })

  it("the reminder's Update runs its follow-up (open the dialog) only after the location screen is reached", async () => {
    const w = world([{ status: "denied", permission: "denied" }, { status: "ok" }])
    const f = flowHarness(w)
    f.press("UPDATE_LOCATION", () => f.calls.push("onOpenChange(true)"))
    await flush()
    assert.deepEqual(f.calls, [])
    await w.recovery.tryAgain()
    await flush(); await flush()
    assert.deepEqual(f.calls.slice(-2), ["send:UPDATE_LOCATION", "onOpenChange(true)"])
  })

  it("duplicate clicks: one browser request, one dialog, one move", async () => {
    const w = world([{ status: "ok" }])
    const f = flowHarness(w)
    f.press("BACK"); f.press("BACK"); f.press("BACK")
    await flush(); await flush()
    assert.equal(w.log.positionRequests, 1)
    assert.equal(f.calls.filter((c) => c === "send:BACK").length, 1)

    const w2 = world([{ status: "denied", permission: "denied" }])
    const f2 = flowHarness(w2)
    f2.press("BACK")
    await flush()
    f2.press("BACK") // pressed again while the dialog is open
    await flush()
    assert.equal(w2.log.positionRequests, 1)
    assert.deepEqual(w2.dialogs, ["open:blocked"])
    w2.recovery.cancel()
    await flush(); await flush()
    assert.deepEqual(f2.calls, [])
  })

  it("navigation cleanup: a route/account/role change while the prompt waits moves nothing and changes no location", async () => {
    const w = world([]) // the browser's prompt is open and unanswered
    const f = flowHarness(w)
    f.press("BACK")
    await flush()
    w.navigate()
    w.answer({ status: "ok" })
    await flush(); await flush()
    assert.deepEqual(f.calls, [])
    assert.equal(f.pendingRef.current, false)
  })

  it("navigation cleanup: closing the flow aborts the request and closes the dialog, nothing moves", async () => {
    const w = world([{ status: "denied", permission: "denied" }])
    const f = flowHarness(w)
    // the host aborts flowLocationRequestRef when the flow closes or is replaced
    const refAbort = () => f.ref.current?.abort()
    f.press("BACK")
    await flush()
    assert.equal(w.recovery.state.open, true)
    refAbort()
    await flush(); await flush()
    assert.equal(w.recovery.state.open, false)
    assert.deepEqual(f.calls, [])
  })

  it("an unmounted flow does not move or run its follow-up", async () => {
    const w = world([{ status: "ok" }])
    const f = flowHarness(w, { mounted: () => false })
    f.press("UPDATE_LOCATION", () => f.calls.push("onOpenChange(true)"))
    await flush(); await flush()
    assert.ok(!f.calls.includes("send:UPDATE_LOCATION"))
    assert.ok(!f.calls.includes("onOpenChange(true)"))
  })

  it("without the prop (Verify My Account, Update, the preview) the move is immediate and unchanged", () => {
    const w = world([])
    const f = flowHarness(w, { guarded: false })
    f.press("BACK")
    f.press("UPDATE_LOCATION", () => f.calls.push("onOpenChange(true)"))
    assert.deepEqual(f.calls, ["send:BACK", "send:UPDATE_LOCATION", "onOpenChange(true)"])
    assert.equal(w.log.positionRequests, 0)
  })
})

describe("source: the flow and its callers", () => {
  it("only Back from the duration screen and the reminder's Update were changed to ask first", () => {
    assert.equal((flowSource.match(/goToLocationScreen\(/g) ?? []).length, 2) // the two call sites (the definition is `= (`)
    assert.ok(flowSource.includes('onClick={() => goToLocationScreen("BACK")}'))
    assert.ok(flowSource.includes('goToLocationScreen("UPDATE_LOCATION", () => onOpenChange(true))'))
    const duration = flowSource.slice(flowSource.indexOf('{state === "traveling-showcase"'))
    assert.ok(duration.slice(0, duration.indexOf("How long are you traveling?")).includes('goToLocationScreen("BACK")'))
  })
  it("the only caller that passes onBeforeLocationScreen is the host, and only for a server-location launch", () => {
    assert.equal((host.match(/onBeforeLocationScreen=/g) ?? []).length, 1)
    assert.ok(host.includes("flowLaunch.ipLocationOnly ? requestLocationForFlow : undefined"))
    const preview = read("app", "identity-verification-preview", "preview-client.tsx")
    assert.ok(!preview.includes("onBeforeLocationScreen"))
    assert.ok(dashboard.includes('...(launch.initialState === "traveling-showcase"'))
    assert.ok(dashboard.includes("{ ipLocationOnly: true }"))
  })
  it("the host aborts the flow's pending request when the flow closes or a new instance replaces it", () => {
    assert.equal((host.match(/flowLocationRequestRef\.current\?\.abort\(\)/g) ?? []).length, 2)
  })
  it("Permanently relocated writes nothing before the device location exists", () => {
    const handler = between(flowSource, "const handlePermanentlyRelocated = async () => {", "const locationScreenPendingRef")
    const awaitAt = handler.indexOf("await onPermanentlyRelocated()")
    assert.ok(awaitAt > -1)
    const persists = [...handler.matchAll(/persistTravelClassification\(/g)].map((m) => m.index ?? 0)
    assert.equal(persists.length, 2)
    assert.ok(persists[0] < awaitAt && handler.slice(0, persists[0]).includes("if (!onPermanentlyRelocated)"))
    assert.ok(persists[1] > awaitAt, "the callback path saves only after the device location")
  })
})
