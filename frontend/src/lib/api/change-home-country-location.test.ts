// Run like detected-location.test.ts (from the frontend/ directory).
//
// A verified CA traveler whose current request lookup is US (country only, no pin) clicks
// "Change my home country": the confirmation screen must show the US, from the live lookup
// and never from /me's stale stored detectedCountry.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { describeDetectedLocation, getDetectedLocation } from "./detected-location"
import {
  shouldShowTravelerLocationPrompt,
  showCountryOnlyAsDetected,
  startChangeHomeCountry,
} from "./location-mismatch"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const flow = read("components", "identity-verification-flow.tsx")
const http = read("service", "http", "identity-verification.ts")

// What the live request lookup returns for a US caller with only a country-level result:
// the server sends the country and no city, region or coordinates.
const COUNTRY_ONLY_US = {
  countryCode: "US",
  countryName: "United States",
  city: null,
  regionCode: null,
  regionName: null,
  latitude: null,
  longitude: null,
}
const liveLookup = (body: unknown) => () =>
  getDetectedLocation({ fetchLocation: async () => body })

// The contradictory live state: stored detectedCountry CA (never refreshed), verified home
// CA, Travel Mode on, and the backend's own live comparison says the caller is elsewhere.
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

describe("Change my home country shows the live country on the confirmation screen", () => {
  it("a country-only live lookup (US) is shown as detected, with the US as the country", async () => {
    const launch = await startChangeHomeCountry({ getDetectedLocation: liveLookup(COUNTRY_ONLY_US) })
    assert.equal(launch.location.countryCode, "US")
    assert.equal(launch.location.countryName, "United States")
    assert.equal(launch.location.detected, true)
    assert.equal(launch.location.serviceUnavailable, false)
    assert.equal(launch.initialState, undefined, "from the top: the detected-country confirmation")
  })

  it("the screen prints heading 'We detected your current location as:' and the country (no city or region)", async () => {
    const { location } = await startChangeHomeCountry({ getDetectedLocation: liveLookup(COUNTRY_ONLY_US) })
    // The screen's heading and label come from this one function (see the flow's use below).
    const { heading, label } = describeDetectedLocation(location)
    assert.equal(heading, "We detected your current location as:")
    assert.equal(label, "United States")
    assert.ok(flow.includes("describeDetectedLocation(detectedLocation)"))
  })

  it("the shared lookup is unchanged: the first-time flow still gets a country-only result as not detected", async () => {
    const shared = await liveLookup(COUNTRY_ONLY_US)()
    assert.equal(shared.detected, false) // exactly as before, so "couldn't detect" stays for first-time users
    assert.equal(shared.countryCode, "US")
  })

  it("only the returning-user launch applies it; Verify My Account does not", () => {
    assert.ok(!/showCountryOnlyAsDetected/.test(page))
    const verify = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("const handleVerifyMyAccount") + 4000)
    assert.ok(verify.includes("getDetectedLocation({ useBrowserLocation: true })"))
  })

  it("a rich result (with a pin) is returned as it was", async () => {
    const rich = {
      ...COUNTRY_ONLY_US,
      city: "Austin",
      regionCode: "TX",
      latitude: 30.27,
      longitude: -97.74,
    }
    const loc = await liveLookup(rich)()
    assert.deepEqual(showCountryOnlyAsDetected(loc), loc)
  })

  it("failures and conflicts are left alone: unavailable service, GPS mismatch, no country", async () => {
    const down = await getDetectedLocation({ fetchLocation: async () => { throw new Error("down") } })
    assert.deepEqual(showCountryOnlyAsDetected(down), down)
    assert.equal(showCountryOnlyAsDetected(down).detected, false)

    const conflict = { ...(await liveLookup(COUNTRY_ONLY_US)()), locationMismatch: true }
    assert.equal(showCountryOnlyAsDetected(conflict).detected, false)

    const none = await liveLookup({ ...COUNTRY_ONLY_US, countryCode: null, countryName: null })()
    assert.equal(showCountryOnlyAsDetected(none).detected, false)
  })
})

describe("what is recorded is never taken from the screen", () => {
  it("the confirmation request carries no body, so no client-supplied country can reach the backend", () => {
    assert.ok(
      /confirmHomeCountry: \(\) =>\s*AxiosRequest\.post\("\/v1\/identity-verification\/home-country\/confirm", null\)/.test(http)
    )
    const yes = flow.slice(flow.indexOf("const handleHomeCountryYes"), flow.indexOf("// Travel branch"))
    assert.ok(yes.includes("confirmHomeCountry: () => IdentityVerificationAPI.confirmHomeCountry()"))
    assert.ok(!/countryCode/.test(yes), "the screen's country is not sent")
  })
})
