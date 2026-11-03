// Run like detected-location.test.ts (from the frontend/ directory).
// BTB-387: the "Show me how" instructions are chosen from the user agent.
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  browserDisplayName,
  currentBrowserEnvironment,
  detectBrowser,
  detectPlatform,
  getLocationInstructions,
} from "./location-instructions"

const UA = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
  chromeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0",
  edgeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  firefoxMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0",
  firefoxWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  opera:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 OPR/110.0.0.0",
}

describe("browser and platform detection", () => {
  it("recognises Chrome, Edge, Safari and Firefox (Edge before Chrome, Chrome before Safari)", () => {
    assert.equal(detectBrowser({ userAgent: UA.chromeMac }), "chrome")
    assert.equal(detectBrowser({ userAgent: UA.chromeWin }), "chrome")
    assert.equal(detectBrowser({ userAgent: UA.edgeWin }), "edge")
    assert.equal(detectBrowser({ userAgent: UA.edgeMac }), "edge")
    assert.equal(detectBrowser({ userAgent: UA.safariMac }), "safari")
    assert.equal(detectBrowser({ userAgent: UA.firefoxMac }), "firefox")
    assert.equal(detectBrowser({ userAgent: UA.firefoxWin }), "firefox")
  })

  it("anything else, and an empty environment, is 'other'", () => {
    assert.equal(detectBrowser({ userAgent: UA.opera }), "other")
    assert.equal(detectBrowser({}), "other")
    assert.equal(detectBrowser({ userAgent: "curl/8.0" }), "other")
  })

  it("detects macOS and Windows, and does not mistake an iPhone for a Mac", () => {
    assert.equal(detectPlatform({ userAgent: UA.chromeMac }), "mac")
    assert.equal(detectPlatform({ platform: "macOS" }), "mac")
    assert.equal(detectPlatform({ userAgent: UA.chromeWin }), "windows")
    assert.equal(detectPlatform({ platform: "Windows" }), "windows")
    assert.equal(detectPlatform({ userAgent: UA.iphoneSafari }), "other")
    assert.equal(detectPlatform({}), "other")
  })

  it("has a display name for each", () => {
    assert.deepEqual(
      (["chrome", "edge", "safari", "firefox", "other"] as const).map(
        browserDisplayName
      ),
      ["Chrome", "Edge", "Safari", "Firefox", "your browser"]
    )
  })
})

describe("the steps", () => {
  const steps = (ua: string) => getLocationInstructions({ userAgent: ua })

  it("Chrome: site controls icon -> Site settings -> Location -> Allow", () => {
    const { browserSteps } = steps(UA.chromeMac)
    assert.match(browserSteps[0], /site controls icon/)
    assert.match(browserSteps[1], /Site settings/)
    assert.match(browserSteps[2], /Location.*Allow/)
    assert.match(browserSteps[3], /Try Again/)
  })

  it("Edge: the same path, with Edge's own name for the site menu", () => {
    const { browserSteps } = steps(UA.edgeWin)
    assert.match(browserSteps[0], /site controls icon/)
    assert.match(browserSteps[1], /Permissions for this site/)
    assert.match(browserSteps[2], /Location.*Allow/)
  })

  it("Safari: Safari -> Settings -> Websites -> Location -> Allow", () => {
    const { browserSteps } = steps(UA.safariMac)
    assert.match(browserSteps[0], /Safari → Settings/)
    assert.match(browserSteps[1], /Websites/)
    assert.match(browserSteps[1], /Location/)
    assert.match(browserSteps[2], /Allow/)
  })

  it("Firefox: permissions icon beside the address bar -> clear blocked Location -> allow on retry", () => {
    const { browserSteps } = steps(UA.firefoxMac)
    assert.match(browserSteps[0], /permissions icon beside the address bar/)
    assert.match(browserSteps[1], /clear the blocked setting/)
    assert.match(browserSteps[2], /Try Again.*Allow/)
  })

  it("an unknown browser gets generic steps", () => {
    const { browserSteps, browserName } = steps(UA.opera)
    assert.equal(browserName, "your browser")
    assert.match(browserSteps.join(" "), /site settings/i)
  })

  it("macOS devices get the Location Services path, naming the browser", () => {
    const { deviceHeading, deviceSteps } = steps(UA.chromeMac)
    assert.match(deviceHeading, /Mac/)
    assert.match(
      deviceSteps[0],
      /System Settings → Privacy & Security → Location Services/
    )
    assert.match(deviceSteps[1], /Chrome/)
    assert.match(steps(UA.safariMac).deviceSteps[1], /Safari/)
    assert.match(steps(UA.firefoxMac).deviceSteps[1], /Firefox/)
  })

  it("Windows devices get the Location services path, naming the browser", () => {
    const { deviceHeading, deviceSteps } = steps(UA.edgeWin)
    assert.match(deviceHeading, /Windows/)
    assert.match(deviceSteps[0], /Settings → Privacy & security → Location/)
    assert.match(deviceSteps[1], /Edge/)
    assert.match(steps(UA.firefoxWin).deviceSteps[1], /Firefox/)
  })

  it("other devices get a generic device step", () => {
    const { deviceSteps } = steps(UA.iphoneSafari)
    assert.match(deviceSteps[0], /device settings/)
  })

  it("every browser ends its steps by sending the user back to Try Again", () => {
    for (const ua of Object.values(UA)) {
      const { browserSteps, deviceSteps } = steps(ua)
      assert.match(browserSteps[browserSteps.length - 1], /Try Again/)
      assert.match(deviceSteps[deviceSteps.length - 1], /Try Again/)
    }
  })

  it("no step points the user at a chrome:// address (a page cannot open it and it would not work)", () => {
    for (const ua of Object.values(UA)) {
      const { browserSteps, deviceSteps } = steps(ua)
      assert.ok(
        ![...browserSteps, ...deviceSteps].some((s) =>
          /chrome:\/\/|about:preferences/.test(s)
        )
      )
    }
  })

  it("an empty environment (server render) never throws", () => {
    assert.doesNotThrow(() => getLocationInstructions({}))
    assert.doesNotThrow(() => currentBrowserEnvironment())
  })
})
