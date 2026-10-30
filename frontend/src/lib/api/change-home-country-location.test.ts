// Run like detected-location.test.ts (from the frontend/ directory).
//
// A verified CA traveler whose request resolves to the US clicks "Change my home country".
// The confirmation must be the SAME detected-location screen the first-time flow shows,
// loaded the same way (browser position -> server reverse geocode -> city, region, country
// and the real map), and must never take the recorded country from the browser.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  getDetectedLocation,
  type GetDetectedLocationOptions,
} from "./detected-location"
import {
  shouldShowTravelerLocationPrompt,
  startChangeHomeCountry,
  startStillTraveling,
} from "./location-mismatch"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import { readDashboardWithHost } from "./dashboard-host-source"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = readDashboardWithHost()
const flow = read("components", "identity-verification-flow.tsx")
const http = read("service", "http", "identity-verification.ts")
const mismatchSource = read("src", "lib", "api", "location-mismatch.ts")

// The configured test IP resolves to the US at COUNTRY precision only: no city, region or pin.
const IP_COUNTRY_ONLY_US = {
  countryCode: "US",
  countryName: "United States",
  city: null,
  regionCode: null,
  regionName: null,
  latitude: null,
  longitude: null,
}
// The server's reverse geocode of the browser's position, accepted only when its country
// equals the request's country (here US == US).
const GPS_RESOLVED_US = {
  status: "resolved",
  countryCode: "US",
  countryName: "United States",
  city: "Austin",
  regionCode: "TX",
  regionName: "Texas",
  latitude: 30.27,
  longitude: -97.74,
}

// The same seams for both entry points, so any difference is a difference of path, not data.
const seams = (gps: unknown, position: unknown = { status: "ok", latitude: 30.2672, longitude: -97.7431 }) =>
  ({
    fetchLocation: async () => IP_COUNTRY_ONLY_US,
    getPosition: async () => position,
    fetchGpsLocation: async () => gps,
  }) as unknown as GetDetectedLocationOptions
const returningPath = (options: GetDetectedLocationOptions) =>
  startChangeHomeCountry({
    getDetectedLocation: (o) => getDetectedLocation({ ...o, ...options }),
  })
// What Verify My Account does (page.tsx): getDetectedLocation({ useBrowserLocation: true }).
const originalPath = (options: GetDetectedLocationOptions) =>
  getDetectedLocation({ useBrowserLocation: true, ...options })

const meForVerifiedCaTraveler = () =>
  parseIdentityVerificationSummary({
    nextAction: "complete",
    status: "verified",
    fullyVerified: true,
    verifiedHomeCountry: "CA",
    detectedCountry: "CA", // stored, stale: the parser and the screen must not use it
    locationMismatch: false,
    travelModeLocationMismatch: true,
    travelModeActive: true,
    loginSessionKey: "a".repeat(64),
  })

describe("the contradictory /me state still qualifies for the traveler prompt", () => {
  it("travelModeLocationMismatch alone decides; the stale stored country is not read", () => {
    const me = meForVerifiedCaTraveler()
    assert.equal(shouldShowTravelerLocationPrompt(me), true)
    assert.ok(!("detectedCountry" in (me as object)), "the view carries no stored country to rely on")
  })
})

describe("Change my home country loads the location exactly like the original flow", () => {
  it("asks for the browser position, like Verify My Account", async () => {
    const seen: Array<GetDetectedLocationOptions | undefined> = []
    await startChangeHomeCountry({
      getDetectedLocation: async (o) => {
        seen.push(o)
        return getDetectedLocation(seams(GPS_RESOLVED_US))
      },
    })
    assert.deepEqual(seen, [{ useBrowserLocation: true }])
    assert.ok(/getDetectedLocation\(\{ useBrowserLocation: true \}\)/.test(page), "the original entry still does")
  })

  it("a country-only IP result plus a resolved browser position gives city, region, country and coordinates", async () => {
    const { location } = await returningPath(seams(GPS_RESOLVED_US))
    assert.equal(location.city, "Austin")
    assert.equal(location.region, "TX")
    assert.equal(location.countryName, "United States")
    assert.equal(location.countryCode, "US")
    assert.equal(location.latitude, 30.27)
    assert.equal(location.longitude, -97.74)
    assert.equal(location.detected, true)
    assert.equal(location.serviceUnavailable, false)
  })

  it("is identical to what the original flow gets from the same data", async () => {
    const options = seams(GPS_RESOLVED_US)
    assert.deepEqual((await returningPath(options)).location, await originalPath(options))
  })

  it("every shortfall behaves as it does for a first-time user (denied, unavailable, timeout, failed server call)", async () => {
    for (const position of [{ status: "denied" }, { status: "unavailable" }, { status: "timeout" }]) {
      const options = seams(GPS_RESOLVED_US, position)
      assert.deepEqual((await returningPath(options)).location, await originalPath(options), String(position.status))
    }
    const failing = {
      ...seams(GPS_RESOLVED_US),
      fetchGpsLocation: async () => { throw new Error("down") },
    } as unknown as GetDetectedLocationOptions
    assert.deepEqual((await returningPath(failing)).location, await originalPath(failing))
  })

  it("a browser position in another country than the request is a conflict, handled as in the original flow", async () => {
    const conflict = { ...GPS_RESOLVED_US, status: "country_mismatch", city: null, regionCode: null, regionName: null }
    const options = seams(conflict)
    const { location } = await returningPath(options)
    assert.deepEqual(location, await originalPath(options))
    assert.equal(location.locationMismatch, true)
    assert.equal(location.detected, false)
    assert.ok(flow.includes("startingFreeKyc || detectedLocation.locationMismatch === true"), "Yes stays disabled on a conflict")
  })

  it("the screen draws the pin and map from the loaded coordinates and prints city, region and country", () => {
    assert.ok(/<DetectedLocationMap\s+latitude=\{detectedLocation\.latitude\}\s+longitude=\{detectedLocation\.longitude\}/.test(flow))
    assert.ok(flow.includes("detectedLocation.city,"))
    assert.ok(flow.includes("detectedLocation.region,"))
    assert.ok(flow.includes("detectedLocation.countryName,"))
    assert.ok(!flow.includes("country-only"), "no separate country-only presentation")
    assert.ok(!mismatchSource.includes("showCountryOnlyAsDetected"))
  })
})

describe("the first-time flow is unchanged", () => {
  it("Verify My Account still asks for the browser position and uses the shared lookup", () => {
    const verify = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("const handleVerifyMyAccount") + 4000)
    assert.ok(verify.includes("getDetectedLocation({ useBrowserLocation: true })"))
  })
  it("a country-only IP result with no browser position is still 'couldn't detect' (country kept, not shown)", async () => {
    const shared = await getDetectedLocation({ fetchLocation: async () => IP_COUNTRY_ONLY_US })
    assert.equal(shared.detected, false)
    assert.equal(shared.countryCode, "US")
  })
  it("'I’m still traveling' still opens the duration screen without asking for the position", async () => {
    let options: GetDetectedLocationOptions | undefined | "unset" = "unset"
    const launch = await startStillTraveling({
      getDetectedLocation: async (o) => {
        options = o
        return getDetectedLocation({ fetchLocation: async () => IP_COUNTRY_ONLY_US })
      },
    })
    assert.equal(launch.initialState, "traveling-showcase")
    assert.equal(options, undefined)
  })
})

describe("what is recorded is never taken from the screen, and opening it records nothing", () => {
  it("the confirmation request carries no body, so no client-supplied country can reach the backend", () => {
    assert.ok(
      /confirmHomeCountry: \(\) =>\s*AxiosRequest\.post\("\/v1\/identity-verification\/home-country\/confirm", null\)/.test(http)
    )
    const yes = flow.slice(flow.indexOf("const handleHomeCountryYes"), flow.indexOf("// Travel branch"))
    assert.ok(yes.includes("confirmHomeCountry: () => IdentityVerificationAPI.confirmHomeCountry()"))
    assert.ok(!/countryCode/.test(yes), "the screen's country is not sent")
  })
  it("loading the location only reads: no confirm, claim or session call is made", () => {
    assert.ok(!/confirmHomeCountry|startHomeCountryChange|startFreeKyc|recordTravel/.test(mismatchSource))
  })
})
