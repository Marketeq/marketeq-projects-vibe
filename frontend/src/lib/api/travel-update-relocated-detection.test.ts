// Run like travel-update-flow.test.ts (from the frontend/ directory).
//
// Regression: Update on "You are in Travel Mode" > "Permanently relocated" showed the
// server-IP location (or "We couldn't detect your current location") because the Update
// action only calls getDetectedLocation() without the browser, and nothing re-detected when
// the traveler said they had permanently relocated. "Permanently relocated" is now the
// explicit action that runs browser detection, through the flow's optional
// onPermanentlyRelocated prop; every other entry is unchanged.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { type DetectedLocation, getDetectedLocation } from "./detected-location"
import { readDashboardWithHost } from "./dashboard-host-source"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const page = readDashboardWithHost()

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const handlerStart = flow.indexOf(
  "const handlePermanentlyRelocated = async () => {"
)
const handlerBody = flow.slice(
  handlerStart + "const handlePermanentlyRelocated = async () => {".length,
  flow.indexOf("\n  }\n", handlerStart)
)
const refreshStart = page.indexOf(
  "const refreshLocationForRelocation = useCallback(async () => {"
)
const refreshBody = page.slice(
  refreshStart +
    "const refreshLocationForRelocation = useCallback(async () => {".length,
  page.indexOf("\n  }, [])", refreshStart)
)
const updateStart = page.indexOf("const handleTravelUpdate = useCallback(")
const updateBody = page.slice(
  updateStart,
  page.indexOf("[travelPopup, openFlow]", updateStart)
)
const temporarilyAt = flow.indexOf("if (activeTravelModeUpdate) {")
const temporarilyBody = flow.slice(
  temporarilyAt,
  flow.indexOf('send("NEXT")', temporarilyAt)
)

// Runs the REAL flow handler against a recorded callback.
async function clickRelocated(
  onPermanentlyRelocated: (() => Promise<void>) | undefined,
  relocatingRef = { current: false },
  mounted = true
) {
  const calls: string[] = []
  const stubs = {
    persistTravelClassification: (c: string) => calls.push(`persist:${c}`),
    send: (e: string) => calls.push(`send:${e}`),
    relocatingRef,
    // Loading-state UI: the card's spinner while the caller's detection is awaited.
    setRelocating: (v: boolean) => calls.push(`relocating:${v}`),
    onPermanentlyRelocated: onPermanentlyRelocated
      ? async () => {
          calls.push("detect")
          await onPermanentlyRelocated()
        }
      : undefined,
    getIsMounted: () => mounted,
  }
  const promise = new AsyncFunction(...Object.keys(stubs), handlerBody)(
    ...Object.values(stubs)
  )
  return { calls, promise: promise as Promise<void> }
}

const position = (status: "ok" | "denied") => async () =>
  status === "ok"
    ? ({ status: "ok", latitude: 51.5072, longitude: -0.1276 } as const)
    : ({ status: "denied" } as const)
const COUNTRY_ONLY = {
  countryCode: "US",
  countryName: "United States",
  city: null,
  regionCode: null,
  regionName: null,
  latitude: null,
  longitude: null,
}
const GPS_LONDON = {
  status: "resolved",
  countryCode: "GB",
  countryName: "United Kingdom",
  city: "London",
  regionCode: "ENG",
  regionName: "England",
  latitude: 51.5072,
  longitude: -0.1276,
}

describe("Permanently relocated runs browser-based detection", () => {
  it("waits for the caller's detection, then moves on (and only then)", async () => {
    let release!: () => void
    const { calls, promise } = await clickRelocated(
      () => new Promise<void>((r) => (release = r))
    )
    assert.deepEqual(calls, [
      "persist:permanently_relocated",
      "relocating:true",
      "detect",
    ])
    release()
    await promise
    assert.deepEqual(calls, [
      "persist:permanently_relocated",
      "relocating:true",
      "detect",
      "relocating:false",
      "send:RELOCATED",
    ])
  })

  it("the dashboard's callback asks with exactly getDetectedLocation({ useBrowserLocation: true }) and applies a device location", () => {
    // BTB-387: the same call as Verify My Account; a failure opens the "Turn on location to
    // continue" dialog instead of applying anything (see location-recovery-host.test.ts).
    assert.match(
      refreshBody,
      /const location = await getDetectedLocation\(\{ useBrowserLocation: true \}\)/
    )
    assert.match(refreshBody, /setDetectedLocation\(location\)/)
  })

  it("the next screen gets city/state/country and coordinates (map tiles + red pin) from browser GPS", async () => {
    const loc = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: position("ok"),
      fetchGpsLocation: async () => GPS_LONDON as never,
      fetchLocation: async () => COUNTRY_ONLY,
    })
    assert.equal(loc.detected, true)
    assert.deepEqual(
      [loc.city, loc.region, loc.countryName],
      ["London", "ENG", "United Kingdom"]
    )
    assert.deepEqual([loc.latitude, loc.longitude], [51.5072, -0.1276])
  })
})

describe("Temporarily traveling does not invoke it", () => {
  it("its branch neither calls the prop nor requests location nor saves anything", () => {
    assert.ok(!temporarilyBody.includes("onPermanentlyRelocated"))
    assert.ok(
      !/getDetectedLocation|geolocation|getBrowserPosition|persistTravelClassification/.test(
        temporarilyBody
      )
    )
  })
  it("the prop is read in exactly one place besides its declaration", () => {
    const code = flow
      .split("\n")
      .filter((l) => !/^\s*\/\//.test(l))
      .join("\n")
    // destructured, typed, and two uses inside the handler (the guard and the call)
    assert.equal((code.match(/onPermanentlyRelocated/g) ?? []).length, 4)
    assert.equal((handlerBody.match(/onPermanentlyRelocated/g) ?? []).length, 2)
  })
})

describe("denied permission or failed detection never produces a made-up location", () => {
  it("denied GPS is a locationFailure with nothing from the server: no country, city or coordinates", async () => {
    const loc = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: position("denied"),
      getPermissionState: async () => "denied",
      fetchLocation: async () => COUNTRY_ONLY,
    })
    assert.equal(loc.detected, false)
    assert.equal(loc.locationFailure, "blocked")
    assert.deepEqual(
      [loc.latitude, loc.longitude, loc.city, loc.countryCode],
      [null, null, "", ""]
    )
  })
  it("the server lookup is never made on this path, so its failure cannot matter", async () => {
    const loc: DetectedLocation = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: position("denied"),
      getPermissionState: async () => "denied",
      fetchLocation: async () => {
        throw new Error("must not be called")
      },
    })
    assert.equal(loc.locationFailure, "blocked")
    assert.equal(loc.serviceUnavailable, false)
    assert.equal(loc.latitude, null)
  })
  it("the flow's text for both states is unchanged", () => {
    assert.ok(flow.includes("We couldn’t detect your current location"))
    assert.ok(flow.includes("Location service temporarily unavailable."))
  })
  it("a rejected callback still releases the double-click guard", async () => {
    const ref = { current: false }
    const { promise } = await clickRelocated(async () => {
      throw new Error("x")
    }, ref)
    await assert.rejects(promise)
    assert.equal(ref.current, false)
  })
})

describe("closing without choosing writes no state", () => {
  it("nothing runs on open: Update calls only the server-side getDetectedLocation(), no browser", () => {
    assert.match(updateBody, /await getDetectedLocation\(\)/)
    assert.ok(!/useBrowserLocation|persistTravel|recordTravel/.test(updateBody))
  })
  it("the only classification write in the flow is inside the Permanently relocated handler", () => {
    const code = flow
      .split("\n")
      .filter((l) => !/^\s*\/\//.test(l))
      .join("\n")
    assert.equal((code.match(/persistTravelClassification\(/g) ?? []).length, 1) // the handler's call
    assert.ok(
      handlerBody.includes(
        'persistTravelClassification("permanently_relocated")'
      )
    )
  })
})

describe("Verify My Account is unchanged", () => {
  it("without the prop the handler is synchronous: one write, then RELOCATED, no detection", async () => {
    const { calls } = await clickRelocated(undefined)
    assert.deepEqual(calls, ["persist:permanently_relocated", "send:RELOCATED"])
  })
  it("only the Update launch sets the flag; Verify My Account's launch drops it", () => {
    // the dashboard's Update, and the host's default for the live card on any other page
    assert.equal(
      (page.match(/detectBrowserLocationOnRelocate: true/g) ?? []).length,
      2
    )
    assert.ok(updateBody.includes("detectBrowserLocationOnRelocate: true"))
    const verify = page.slice(
      page.indexOf(
        "const activeTravelModeUpdate = isTravelModeInForce(summary)"
      )
    )
    const launch = verify.slice(0, verify.indexOf("setIdentityFlowOpen(true)"))
    assert.ok(
      !launch.includes("detectBrowserLocationOnRelocate") ||
        !/\.\.\.prev/.test(launch)
    )
    assert.ok(launch.includes("{ key: prev.key + 1,"))
  })
  it("the prop is passed only when the Update launch set it", () => {
    assert.match(
      page,
      /onPermanentlyRelocated=\{\s*flowLaunch\.detectBrowserLocationOnRelocate\s*\?\s*refreshLocationForRelocation\s*:\s*undefined\s*\}/
    )
  })
})

describe("no duplicate home-country-change session", () => {
  it("a second click while detection is pending does nothing: one write, one detection, one RELOCATED", async () => {
    let release!: () => void
    const ref = { current: false }
    const first = await clickRelocated(
      () => new Promise<void>((r) => (release = r)),
      ref
    )
    const second = await clickRelocated(async () => {}, ref)
    await second.promise
    assert.deepEqual(second.calls, [])
    release()
    await first.promise
    assert.deepEqual(
      first.calls.filter((c) => c.startsWith("persist")),
      ["persist:permanently_relocated"]
    )
    assert.equal(first.calls.filter((c) => c === "send:RELOCATED").length, 1)
  })
  it("the detection path starts no session: no Didit / home-country-confirm call anywhere in the handler or callback", () => {
    assert.ok(
      !/Didit|confirmHomeCountry|startFreeKyc|home-country/i.test(
        handlerBody + refreshBody
      )
    )
  })
  it("an unmounted flow does not advance", async () => {
    const { calls, promise } = await clickRelocated(
      async () => {},
      { current: false },
      false
    )
    await promise
    assert.ok(!calls.includes("send:RELOCATED"))
    // and an unmounted flow sets no pending state after the detection returns
    assert.deepEqual(calls.filter((c) => c.startsWith("relocating")), ["relocating:true"])
  })
})

describe("Permanently relocated: loading state (only when the caller's detection is awaited)", () => {
  it("a rejected detection still clears the pending state", async () => {
    const { calls, promise } = await clickRelocated(async () => {
      throw new Error("x")
    })
    await assert.rejects(promise)
    assert.deepEqual(calls.filter((c) => c.startsWith("relocating")), ["relocating:true", "relocating:false"])
  })
  it("without the callback there is no pending state at all (it moves on at once)", async () => {
    const { calls } = await clickRelocated(undefined)
    assert.ok(!calls.some((c) => c.startsWith("relocating")))
  })
  it("the card shows the design-system Spinner in place of its icon (never both), is disabled and aria-busy; Back and the other card are disabled too", () => {
    const screen = flow.slice(
      flow.indexOf('{state === "current-location-showcase" && ('),
      flow.indexOf('{state === "traveling-showcase" && (')
    )
    assert.match(screen, /disabled=\{relocating\}\s+aria-busy=\{relocating\}/)
    assert.match(screen, /\{relocating \? \(\s*<Spinner[\s\S]*?\) : \(\s*<Home03 className="size-5 shrink-0 text-primary-500" \/>\s*\)\}/)
    assert.equal((screen.match(/disabled=\{relocating\}/g) ?? []).length, 3) // Back, Temporarily, Permanently
    assert.match(screen, /disabled=\{relocating\}\s+onClick=\{\(\) => send\("BACK"\)\}/)
    assert.equal((screen.match(/void handlePermanentlyRelocated\(\)/g) ?? []).length, 1)
    // the existing guard and classification write are untouched
    assert.ok(handlerBody.includes("if (relocatingRef.current) return"))
  })
})
