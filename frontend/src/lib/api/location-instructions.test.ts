// Run like detected-location.test.ts (from the frontend/ directory).
// BTB-387: the "Show me how" instructions are chosen from the user agent.
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  browserDisplayName,
  currentBrowserEnvironment,
  detectBrowser,
  detectDeviceSection,
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

describe("browser detection", () => {
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
    assert.equal(
      browserSteps[2],
      "For Location, choose Allow. Do not choose Allow this time."
    )
    assert.match(browserSteps[3], /Try Again/)
  })

  it("only Chrome / Chromium tells the user not to choose 'Allow this time' (Edge, Safari, Firefox and a generic browser do not present that choice in these steps)", () => {
    const withWarning = (ua: string) =>
      steps(ua).browserSteps.some((step) => /Allow this time/.test(step))
    for (const ua of [UA.chromeMac, UA.chromeWin]) {
      assert.ok(withWarning(ua), ua)
      assert.equal(
        steps(ua).browserSteps.filter((s) => /Allow this time/.test(s)).length,
        1
      )
    }
    for (const ua of [
      UA.edgeWin,
      UA.edgeMac,
      UA.safariMac,
      UA.firefoxMac,
      UA.firefoxWin,
      UA.opera,
      UA.iphoneSafari,
      "",
    ]) {
      assert.ok(!withWarning(ua), ua)
    }
    // the Mac / Windows Location Services help never mentions it either
    for (const section of steps(UA.chromeMac).deviceSections) {
      assert.ok(!section.steps.some((s) => /Allow this time/.test(s)))
    }
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

  it("both operating systems are ALWAYS offered, for every browser and device (never guessed or hidden)", () => {
    for (const ua of [...Object.values(UA), ""]) {
      const { deviceSections } = steps(ua)
      assert.deepEqual(
        deviceSections.map((s) => s.id),
        ["mac", "windows"]
      )
    }
  })

  it("the two tabs are labelled Mac and Windows, under the approved lead-in", () => {
    const instructions = steps(UA.chromeWin)
    assert.deepEqual(
      instructions.deviceSections.map((s) => s.label),
      ["Mac", "Windows"]
    )
    assert.equal(
      instructions.deviceHeading,
      "Still not working? Check Location Services"
    )
  })

  it("the Mac steps name the Location Services path and the user's browser", () => {
    const [mac] = steps(UA.chromeMac).deviceSections
    assert.match(
      mac.steps[0],
      /System Settings → Privacy & Security → Location Services/
    )
    assert.match(mac.steps[1], /Chrome/)
    assert.match(steps(UA.safariMac).deviceSections[0].steps[1], /Safari/)
    assert.match(steps(UA.firefoxMac).deviceSections[0].steps[1], /Firefox/)
  })

  it("the Windows steps name the Location services path and the user's browser", () => {
    const [, windows] = steps(UA.edgeWin).deviceSections
    assert.match(windows.steps[0], /Settings → Privacy & security → Location/)
    assert.match(windows.steps[1], /Edge/)
    assert.match(steps(UA.firefoxWin).deviceSections[1].steps[1], /Firefox/)
  })

  it("an unknown browser or device still gets both rows, naming 'your browser'", () => {
    const { deviceSections } = steps(UA.iphoneSafari)
    assert.equal(deviceSections.length, 2)
    const generic = steps("")
    assert.match(generic.deviceSections[0].steps[1], /your browser/)
  })

  it("every browser step list and both device step lists end by sending the user back to Try Again", () => {
    for (const ua of Object.values(UA)) {
      const { browserSteps, deviceSections } = steps(ua)
      assert.match(browserSteps[browserSteps.length - 1], /Try Again/)
      for (const section of deviceSections) {
        assert.match(section.steps[section.steps.length - 1], /Try Again/)
      }
    }
  })

  it("no step points the user at a chrome:// address (a page cannot open it and it would not work)", () => {
    for (const ua of Object.values(UA)) {
      const { browserSteps, deviceSections } = steps(ua)
      const all = [...browserSteps, ...deviceSections.flatMap((d) => d.steps)]
      assert.ok(!all.some((s) => /chrome:\/\/|about:preferences/.test(s)))
    }
  })

  it("an empty environment (server render) never throws", () => {
    assert.doesNotThrow(() => getLocationInstructions({}))
    assert.doesNotThrow(() => currentBrowserEnvironment())
  })
})

describe("which operating-system tab is selected first", () => {
  it("Windows for a Windows user agent, whatever the browser", () => {
    for (const ua of [UA.chromeWin, UA.edgeWin, UA.firefoxWin]) {
      assert.equal(detectDeviceSection({ userAgent: ua }), "windows")
    }
  })

  it("Mac for a Mac user agent, whatever the browser", () => {
    for (const ua of [UA.chromeMac, UA.edgeMac, UA.safariMac, UA.firefoxMac]) {
      assert.equal(detectDeviceSection({ userAgent: ua }), "mac")
    }
  })

  it("falls back to Mac when the user agent is missing, empty or unrecognised", () => {
    assert.equal(detectDeviceSection({}), "mac")
    assert.equal(detectDeviceSection({ userAgent: "" }), "mac")
    assert.equal(detectDeviceSection({ userAgent: UA.iphoneSafari }), "mac")
    assert.equal(
      detectDeviceSection({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }),
      "mac"
    )
  })

  it("never removes a tab: both are offered whichever is selected", () => {
    for (const ua of [UA.chromeWin, UA.chromeMac, ""]) {
      assert.equal(
        getLocationInstructions({ userAgent: ua }).deviceSections.length,
        2
      )
    }
  })
})

describe("the decorative illustration above the steps (one panel per step)", () => {
  const illus = (ua: string) => getLocationInstructions({ userAgent: ua })

  it("has exactly one panel per browser step, for every browser, so its numbers match the numbered text", () => {
    for (const ua of [...Object.values(UA), ""]) {
      const { illustration, browserSteps } = illus(ua)
      assert.equal(illustration.length, browserSteps.length)
    }
  })

  it("always ends with Try Again, and Chrome / Edge / Safari / generic show the lasting Allow just before it", () => {
    for (const ua of [UA.chromeMac, UA.edgeWin, UA.safariMac, UA.opera, ""]) {
      const { illustration } = illus(ua)
      assert.equal(illustration[illustration.length - 1].scene, "try-again")
      assert.equal(illustration[illustration.length - 2].scene, "location-allow")
    }
    const firefox = illus(UA.firefoxMac).illustration
    assert.equal(firefox[firefox.length - 1].scene, "try-again")
  })

  it("Chrome's tune icon is Chrome's alone: Edge and a generic browser show a lock, Firefox its permissions pin, Safari has no address-bar icon", () => {
    assert.equal(illus(UA.chromeMac).illustration[0].icon, "tune")
    assert.equal(illus(UA.chromeWin).illustration[0].icon, "tune")
    assert.equal(illus(UA.edgeWin).illustration[0].icon, "lock")
    assert.equal(illus(UA.edgeMac).illustration[0].icon, "lock")
    assert.equal(illus(UA.opera).illustration[0].icon, "lock")
    assert.equal(illus(UA.firefoxMac).illustration[0].icon, "pin")
    const safari = illus(UA.safariMac).illustration
    assert.equal(safari[0].scene, "menu-bar")
    assert.ok(!safari.some((p) => p.scene === "address-bar" || p.icon === "tune"))
    for (const ua of [UA.edgeWin, UA.safariMac, UA.firefoxMac, UA.opera]) {
      assert.ok(!illus(ua).illustration.some((p) => p.icon === "tune"))
    }
  })

  it("never says Chrome for another browser, and never offers 'Allow this time'", () => {
    for (const ua of [...Object.values(UA), ""]) {
      const { illustration, browser } = illus(ua)
      for (const panel of illustration) {
        assert.ok(!/this time/i.test(panel.caption))
        if (browser !== "chrome") assert.ok(!/chrome/i.test(panel.caption))
      }
    }
  })

  it("Safari's panels follow Safari's own path (menu bar, then Websites), not an address-bar icon", () => {
    const [first, second] = illus(UA.safariMac).illustration
    assert.deepEqual([first.scene, second.scene], ["menu-bar", "settings-tab"])
  })

  it("an empty environment (server render) still gives the generic panels", () => {
    assert.ok(getLocationInstructions({}).illustration.length >= 3)
  })
})
