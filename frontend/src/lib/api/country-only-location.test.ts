// Run like detected-location.test.ts (from the frontend/ directory).
//
// A country-level result (a country, no coordinates) on the returning-user "Change my home
// country" confirmation: the country is named, nothing claims it was not detected, and the
// confirmation actions stay. Rendered with react-dom/server; the Radix dialog shell renders
// nothing on a server (portals mount in the browser), so the map panel is rendered for real
// and the heading/label come from the one function the screen uses.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  describeDetectedLocation,
  getDetectedLocation,
  type DetectedLocation,
} from "./detected-location"
import { startChangeHomeCountry } from "./location-mismatch"

const flowSource = readFileSync(join(process.cwd(), "components", "identity-verification-flow.tsx"), "utf8")
const render = async (props: Record<string, unknown>): Promise<string> => {
  const { DetectedLocationMap } = await import("../../../components/identity-verification-flow")
  return renderToStaticMarkup(createElement(DetectedLocationMap, props as never))
}
// The panel's own "not detected" sentence, as rendered text (&rsquo; becomes ’).
const COULDNT = "We couldn’t detect your location"

const COUNTRY_ONLY_US = {
  countryCode: "US",
  countryName: "United States",
  city: null,
  regionCode: null,
  regionName: null,
  latitude: null,
  longitude: null,
}
const usLaunch = async (): Promise<DetectedLocation> =>
  (
    await startChangeHomeCountry({
      getDetectedLocation: () => getDetectedLocation({ fetchLocation: async () => COUNTRY_ONLY_US }),
    })
  ).location

describe("country-only US on Change my home country (rendered)", () => {
  it("names the United States in the map area and never says the location was not detected", async () => {
    const loc = await usLaunch()
    const html = await render({
      latitude: loc.latitude,
      longitude: loc.longitude,
      serviceUnavailable: loc.serviceUnavailable,
      countryName: loc.detected && loc.latitude == null && loc.longitude == null ? loc.countryName : null,
    })
    assert.ok(html.includes("United States"), html)
    assert.ok(!html.includes(COULDNT), html)
    assert.ok(!html.includes("detect"), "no detection-failure wording anywhere in the panel")
    assert.ok(!/leaflet|locationiq|openstreetmap/i.test(html), "no map, tiles or attribution are implied")
  })

  it("the heading and label say the country was detected, with no city or region", async () => {
    const { heading, label } = describeDetectedLocation(await usLaunch())
    assert.equal(heading, "We detected your current location as:")
    assert.equal(label, "United States")
  })

  it("the screen wires the country to the map only for a detected result without coordinates", () => {
    assert.ok(/detectedLocation\.detected &&\s*detectedLocation\.latitude == null &&\s*detectedLocation\.longitude == null\s*\? detectedLocation\.countryName \|\| null\s*: null/.test(flowSource))
  })

  it("the confirmation actions are unchanged and do not depend on coordinates", () => {
    const ideal = flowSource.slice(flowSource.indexOf("Is this your home country?"), flowSource.indexOf('{state === "home-country-showcase" && ('))
    assert.ok(ideal.includes("No, I&rsquo;m currently traveling"))
    assert.ok(ideal.includes("Yes, this is my home country"))
    assert.ok(ideal.includes("startingFreeKyc || detectedLocation.locationMismatch === true"))
    assert.ok(!/latitude|longitude|detected\b/.test(ideal.slice(ideal.indexOf("<Button"))), "no button is gated on the location")
  })
})

describe("genuinely undetected results keep the existing failure state", () => {
  it("no country, no coordinates: the panel says the location was not detected", async () => {
    const html = await render({ latitude: null, longitude: null, serviceUnavailable: false, countryName: null })
    assert.ok(html.includes(COULDNT), html)
  })

  it("a country the caller did not mark detected (first-time flow) is not named by the panel", async () => {
    const shared = await getDetectedLocation({ fetchLocation: async () => COUNTRY_ONLY_US })
    assert.equal(shared.detected, false)
    assert.deepEqual(describeDetectedLocation(shared), {
      heading: "We couldn’t detect your current location",
      label: null,
    })
    const html = await render({ latitude: null, longitude: null, serviceUnavailable: false, countryName: null })
    assert.ok(html.includes(COULDNT))
  })

  it("a failed lookup still says the service is unavailable", async () => {
    const down = await getDetectedLocation({ fetchLocation: async () => { throw new Error("down") } })
    assert.equal(describeDetectedLocation(down).heading, "Location service temporarily unavailable.")
    const html = await render({ latitude: null, longitude: null, serviceUnavailable: true, countryName: "United States" })
    assert.ok(html.includes("Location service temporarily unavailable."))
    assert.ok(!html.includes("United States"))
  })

  it("a GPS conflict is left alone: not shown as detected, so no country is named", async () => {
    const conflict = { ...(await getDetectedLocation({ fetchLocation: async () => COUNTRY_ONLY_US })), locationMismatch: true }
    const launch = (await startChangeHomeCountry({ getDetectedLocation: async () => conflict })).location
    assert.equal(launch.detected, false)
    assert.equal(describeDetectedLocation(launch).label, null)
  })

  it("a result with coordinates is unchanged: heading and full label, map state is loading not country-only", async () => {
    const rich: DetectedLocation = {
      city: "Austin", region: "TX", countryCode: "US", countryName: "United States",
      latitude: 30.27, longitude: -97.74, detected: true, serviceUnavailable: false,
    }
    assert.deepEqual(describeDetectedLocation(rich), {
      heading: "We detected your current location as:",
      label: "Austin, TX, United States",
    })
    const html = await render({ latitude: 30.27, longitude: -97.74, serviceUnavailable: false, countryName: null })
    assert.ok(!html.includes(COULDNT) && !html.includes("United States"))
  })
})
