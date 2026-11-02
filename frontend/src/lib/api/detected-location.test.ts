// Run: npx tsc src/lib/api/detected-location.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>)   # run from the frontend/ directory
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { getDetectedLocation, withoutConsentDenied } from "./detected-location"
import {
  readDashboardPage,
  readDashboardWithHost,
  readIdentityHost,
} from "./dashboard-host-source"

const SERVER_BODY = {
  countryCode: "US",
  countryName: "United States",
  city: "Chicago",
  regionCode: null,
  regionName: "Illinois",
  latitude: 41.88,
  longitude: -87.63,
}

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

function withMock<T>(value: string, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as any
  const prevLs = g.localStorage
  const prevEnv = process.env.NODE_ENV
  g.localStorage = { getItem: () => value }
  ;(process.env as any).NODE_ENV = "development"
  return fn().finally(() => {
    g.localStorage = prevLs
    ;(process.env as any).NODE_ENV = prevEnv
  })
}

describe("verification flow location source", () => {
  it("never calls /location/resolve-ip or the direct location client", () => {
    for (const file of [
      ["src", "lib", "api", "detected-location.ts"],
      ["components", "identity-verification-flow.tsx"],
      ["app", "(group)", "talent-dashboard", "page.tsx"],
    ]) {
      const source = read(...file)
      assert.ok(!source.includes("/location/resolve-ip"), file.join("/"))
      assert.ok(!source.includes("LocationAPI"), file.join("/"))
      assert.ok(!source.includes("service/http/location"), file.join("/"))
    }
  })

  it("reads the Identity Verification Service endpoint instead", () => {
    assert.ok(
      read("service", "http", "identity-verification.ts").includes(
        "/v1/identity-verification/detected-location"
      )
    )
    assert.ok(
      read("src", "lib", "api", "detected-location.ts").includes(
        "getDetectedLocation"
      )
    )
  })

  it("the dashboard calls getDetectedLocation() with no mock opt-in", () => {
    assert.ok(
      !readDashboardWithHost().includes(
        "allowDevMock"
      )
    )
  })
})

describe("getDetectedLocation", () => {
  it("maps the server response to the existing DetectedLocation shape", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => SERVER_BODY,
    })
    assert.deepEqual(result, {
      city: "Chicago",
      region: "Illinois",
      countryCode: "US",
      countryName: "United States",
      latitude: 41.88,
      longitude: -87.63,
      detected: true,
      serviceUnavailable: false,
    })
  })

  it("prefers the region code over the region name when the server provides one", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => ({ ...SERVER_BODY, regionCode: "IL" }),
    })
    assert.equal(result.region, "IL")
  })

  it("country-only: keeps the server country but is NOT 'detected', with no city, region or pin (no fabricated coordinates)", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => ({
        ...SERVER_BODY,
        city: null,
        regionName: null,
        latitude: null,
        longitude: null,
      }),
    })
    assert.deepEqual(result, {
      city: "",
      region: "",
      countryCode: "US",
      countryName: "United States",
      latitude: null,
      longitude: null,
      detected: false,
      serviceUnavailable: false,
    })
  })

  it("passes the server's precise coordinates through untouched", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => ({
        ...SERVER_BODY,
        latitude: 41.8781,
        longitude: -87.6298,
      }),
    })
    assert.equal(result.latitude, 41.8781)
    assert.equal(result.longitude, -87.6298)
  })

  it("never surfaces an IP address, even if one were present in the body", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => ({ ...SERVER_BODY, ip: "203.0.113.5" }),
    })
    assert.ok(!JSON.stringify(result).includes("203.0.113.5"))
    assert.ok(!("ip" in result))
  })

  it("a lookup that finds nothing keeps the 'undetected, not unavailable' state", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => ({ ...SERVER_BODY, countryCode: null }),
    })
    assert.equal(result.detected, false)
    assert.equal(result.serviceUnavailable, false)
  })

  it("a failed call keeps the existing service-unavailable state", async () => {
    const result = await getDetectedLocation({
      fetchLocation: async () => {
        throw new Error("503")
      },
    })
    assert.equal(result.detected, false)
    assert.equal(result.serviceUnavailable, true)
  })

  it("an unexpected response shape is service-unavailable, never a guess", async () => {
    for (const bad of [
      "<html>",
      null,
      [],
      { ...SERVER_BODY, latitude: "41" },
      { ...SERVER_BODY, latitude: 200 },
      { ...SERVER_BODY, longitude: null }, // pin needs both coordinates
      { ...SERVER_BODY, countryCode: 5 },
    ]) {
      const result = await getDetectedLocation({
        fetchLocation: async () => bad,
      })
      assert.equal(result.detected, false)
      assert.equal(result.serviceUnavailable, true)
    }
  })

  it("a stale localStorage mock cannot override the server location", async () => {
    const mock = JSON.stringify({
      city: "Toronto",
      region: "ON",
      countryCode: "CA",
      countryName: "Canada",
    })
    const result = await withMock(mock, () =>
      getDetectedLocation({ fetchLocation: async () => SERVER_BODY })
    )
    assert.equal(result.countryCode, "US")
  })

  it("explicit preview mocking still works", async () => {
    const mock = JSON.stringify({
      city: "Toronto",
      region: "ON",
      countryCode: "CA",
      countryName: "Canada",
    })
    const result = await withMock(mock, () =>
      getDetectedLocation({
        allowDevMock: true,
        fetchLocation: async () => {
          assert.fail("must not call the server when the mock is explicit")
        },
      })
    )
    assert.equal(result.countryCode, "CA")
  })
})

// ---------------------------------------------------------------------------
// Browser geolocation
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
const COUNTRY_ONLY_BODY = {
  ...SERVER_BODY,
  city: null,
  regionName: null,
  latitude: null,
  longitude: null,
}
const UNDETECTED = {
  city: "",
  region: "",
  countryCode: "",
  countryName: "",
  latitude: null,
  longitude: null,
  detected: false,
  serviceUnavailable: false,
}
const DENIED = { ...UNDETECTED, consentDenied: true }
const GRANTED = { status: "ok" as const, latitude: 41.878113, longitude: -87.629799 }

describe("getDetectedLocation with browser geolocation", () => {
  it("never asks the browser for its position unless explicitly opted in", async () => {
    let asked = 0
    await getDetectedLocation({
      getPosition: async () => {
        asked++
        return GRANTED
      },
      fetchLocation: async () => COUNTRY_ONLY_BODY,
    })
    assert.equal(asked, 0)
  })

  it("asks once after the explicit action and shows city, region, country and the returned pin", async () => {
    let asked = 0
    let sent: unknown[] = []
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => {
        asked++
        return GRANTED
      },
      fetchGpsLocation: async (lat, lon) => {
        sent = [lat, lon]
        return GPS_RESOLVED
      },
      fetchLocation: async () => assert.fail("country-only path not needed"),
    })
    assert.equal(asked, 1)
    assert.deepEqual(sent, [GRANTED.latitude, GRANTED.longitude])
    assert.deepEqual(result, {
      city: "Chicago",
      region: "IL",
      countryCode: "US",
      countryName: "United States",
      latitude: 41.88,
      longitude: -87.63,
      detected: true,
      serviceUnavailable: false,
    })
  })

  // The browser could not give a position: denied, the prompt dismissed (the browser
  // reports that as unavailable/denied), timeout, unsupported, or unavailable. None of
  // them may reach the IP lookup unless the user allows it in the consent dialog.
  for (const status of ["denied", "unavailable", "timeout", "unsupported"] as const) {
    it(`${status}: asks first; Deny shows nothing IP-derived and never looks it up or calls the GPS endpoint`, async () => {
      let asked = 0
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status }),
        fetchGpsLocation: async () => assert.fail("must not send coordinates"),
        fetchLocation: async () => assert.fail("must not look up the IP unasked"),
        requestApproximateConsent: async () => {
          asked += 1
          return "deny"
        },
      })
      assert.equal(asked, 1)
      assert.deepEqual(result, DENIED)
    })

    it(`${status}: with no consent callback the answer is Deny, never a silent IP lookup`, async () => {
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status }),
        fetchLocation: async () => assert.fail("must not look up the IP unasked"),
      })
      // not a user denial: nobody was asked, so nothing is disabled
      assert.deepEqual(result, UNDETECTED)
      assert.ok(!("consentDenied" in result))
    })

    it(`${status}: Allow runs the existing server lookup once and shows what it found`, async () => {
      let lookups = 0
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status }),
        fetchGpsLocation: async () => assert.fail("must not send coordinates"),
        fetchLocation: async () => {
          lookups += 1
          return SERVER_BODY
        },
        requestApproximateConsent: async () => "allow",
      })
      assert.equal(lookups, 1)
      assert.equal(result.city, "Chicago")
      assert.equal(result.detected, true)
    })
  }

  it("GPS/IP country mismatch: shows nothing from the GPS result, keeps the server country and flags the mismatch", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => ({
        ...GPS_RESOLVED,
        status: "country_mismatch",
        city: null,
        regionCode: null,
        regionName: null,
        latitude: null,
        longitude: null,
      }),
      fetchLocation: async () => assert.fail("must not re-resolve silently"),
    })
    assert.equal(result.locationMismatch, true)
    assert.equal(result.countryCode, "US")
    assert.equal(result.detected, false)
    assert.equal(result.city, "")
    assert.equal(result.latitude, null)
    assert.equal(result.longitude, null)
  })

  it("an unavailable, failed or malformed GPS lookup asks before using the network location", async () => {
    for (const gps of [
      async () => ({ ...GPS_RESOLVED, status: "unavailable", city: null, latitude: null, longitude: null }),
      async () => {
        throw new Error("503")
      },
      async () => "<html>",
      async () => ({ ...GPS_RESOLVED, status: "resolved", latitude: null, longitude: null }),
      async () => ({ ...GPS_RESOLVED, status: "weird" }),
    ]) {
      let asked = 0
      const denied = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => GRANTED,
        fetchGpsLocation: gps,
        fetchLocation: async () => assert.fail("must not look up the IP unasked"),
        requestApproximateConsent: async () => {
          asked += 1
          return "deny"
        },
      })
      assert.equal(asked, 1)
      assert.deepEqual(denied, DENIED)

      const allowed = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => GRANTED,
        fetchGpsLocation: gps,
        fetchLocation: async () => COUNTRY_ONLY_BODY,
        requestApproximateConsent: async () => "allow",
      })
      assert.equal(allowed.detected, false)
      assert.equal(allowed.serviceUnavailable, false)
      assert.equal(allowed.countryCode, "US")
      assert.equal(allowed.latitude, null)
      assert.ok(!allowed.locationMismatch)
    }
  })

  it("never fabricates a pin: no returned coordinates means none in the result", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => ({
        ...GPS_RESOLVED,
        latitude: null,
        longitude: null,
      }),
      fetchLocation: async () => COUNTRY_ONLY_BODY,
    })
    assert.equal(result.latitude, null)
    assert.equal(result.longitude, null)
    assert.equal(result.detected, false)
  })

  it("never puts the browser's precise coordinates or an IP into the result", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => ({ ...GPS_RESOLVED, ip: "203.0.113.5" }),
    })
    const text = JSON.stringify(result)
    assert.ok(!text.includes("41.878113"))
    assert.ok(!text.includes("87.629799"))
    assert.ok(!text.includes("203.0.113.5"))
  })
})

describe("approximate-location consent for one detection attempt", () => {
  it("GPS success is unchanged: no question, no IP lookup", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => GPS_RESOLVED,
      fetchLocation: async () => assert.fail("no IP lookup after a GPS success"),
      requestApproximateConsent: async () => assert.fail("must not ask after a GPS success"),
    })
    assert.equal(result.city, "Chicago")
    assert.equal(result.detected, true)
  })

  it("a GPS/IP country mismatch is unchanged: no question, no pin", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => ({ ...GPS_RESOLVED, status: "country_mismatch" }),
      fetchLocation: async () => assert.fail("no IP lookup on a mismatch"),
      requestApproximateConsent: async () => assert.fail("must not ask on a mismatch"),
    })
    assert.equal(result.locationMismatch, true)
    assert.equal(result.latitude, null)
  })

  it("without the browser option nothing is asked and the server lookup runs as before (Travel Mode Update)", async () => {
    const result = await getDetectedLocation({
      requestApproximateConsent: async () => assert.fail("must not ask"),
      isCurrent: () => true,
      fetchLocation: async () => SERVER_BODY,
    })
    assert.equal(result.city, "Chicago")
  })

  it("Deny never surfaces a city-level IP result, however precise the server would have been", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      fetchLocation: async () => SERVER_BODY,
      requestApproximateConsent: async () => "deny",
    })
    const text = JSON.stringify(result)
    for (const leak of ["Chicago", "Illinois", "United States", "41.88", "-87.63", "US"]) {
      assert.ok(!text.includes(leak), leak)
    }
  })

  it("a cancelled question (navigation, logout, account switch) fetches and shows nothing", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      fetchLocation: async () => assert.fail("must not look up after cancel"),
      requestApproximateConsent: async () => "cancelled",
    })
    assert.equal(result.cancelled, true)
    assert.equal(result.detected, false)
    assert.equal(result.countryCode, "")
  })

  it("an attempt that went stale while the browser prompt was open never asks", async () => {
    let live = true
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => {
        live = false
        return { status: "denied" }
      },
      requestApproximateConsent: async () => assert.fail("a stale attempt must not open the dialog"),
      fetchLocation: async () => assert.fail("a stale attempt must not look up"),
    })
    assert.equal(result.cancelled, true)
  })

  it("an attempt that went stale while the GPS answer was pending never asks", async () => {
    let live = true
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => {
        live = false
        return { ...GPS_RESOLVED, status: "unavailable" }
      },
      requestApproximateConsent: async () => assert.fail("a stale attempt must not open the dialog"),
      fetchLocation: async () => assert.fail("a stale attempt must not look up"),
    })
    assert.equal(result.cancelled, true)
  })

  it("an Allow that arrives after the attempt went stale does not look anything up", async () => {
    let live = true
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => ({ status: "timeout" }),
      requestApproximateConsent: async () => {
        live = false
        return "allow"
      },
      fetchLocation: async () => assert.fail("must not look up for a stale attempt"),
    })
    assert.equal(result.cancelled, true)
  })

  it("a lookup answer that arrives after the attempt went stale is discarded", async () => {
    let live = true
    for (const fetchLocation of [
      async () => {
        live = false
        return SERVER_BODY
      },
      async () => {
        live = false
        throw new Error("down")
      },
    ]) {
      live = true
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        isCurrent: () => live,
        getPosition: async () => ({ status: "unsupported" }),
        requestApproximateConsent: async () => "allow",
        fetchLocation,
      })
      assert.equal(result.cancelled, true)
      assert.equal(result.city, "")
      assert.equal(result.serviceUnavailable, false)
    }
  })

  it("the consent answer is not remembered: every attempt asks again", async () => {
    let asked = 0
    const options = {
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" as const }),
      fetchLocation: async () => SERVER_BODY,
      requestApproximateConsent: async () => {
        asked += 1
        return "allow" as const
      },
    }
    await getDetectedLocation(options)
    await getDetectedLocation(options)
    assert.equal(asked, 2)
  })
})

describe("explicit consent denial state", () => {
  it("only an answered Deny sets consentDenied", async () => {
    const denied = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      requestApproximateConsent: async () => "deny",
      fetchLocation: async () => assert.fail("no lookup after Deny"),
    })
    assert.equal(denied.consentDenied, true)
  })

  it("Allow keeps the normal IP-fallback result, with no denial flag", async () => {
    const allowed = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      requestApproximateConsent: async () => "allow",
      fetchLocation: async () => SERVER_BODY,
    })
    assert.equal(allowed.city, "Chicago")
    assert.equal(allowed.detected, true)
    assert.ok(!allowed.consentDenied)
  })

  it("other location failures never set it", async () => {
    const results = await Promise.all([
      // service failure after Allow
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status: "timeout" }),
        requestApproximateConsent: async () => "allow",
        fetchLocation: async () => {
          throw new Error("down")
        },
      }),
      // country-only result after Allow
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status: "unsupported" }),
        requestApproximateConsent: async () => "allow",
        fetchLocation: async () => COUNTRY_ONLY_BODY,
      }),
      // invalid shape after Allow
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status: "unsupported" }),
        requestApproximateConsent: async () => "allow",
        fetchLocation: async () => "<html>",
      }),
      // cancelled attempt
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status: "denied" }),
        requestApproximateConsent: async () => "cancelled",
      }),
      // GPS/IP mismatch
      getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => GRANTED,
        fetchGpsLocation: async () => ({ ...GPS_RESOLVED, status: "country_mismatch" }),
      }),
      // plain server lookup (Travel Mode Update)
      getDetectedLocation({ fetchLocation: async () => COUNTRY_ONLY_BODY }),
      // lookup that finds nothing
      getDetectedLocation({
        fetchLocation: async () => ({ ...COUNTRY_ONLY_BODY, countryCode: null, countryName: null }),
      }),
    ])
    for (const r of results) assert.ok(!r.consentDenied)
    assert.equal(results[0].serviceUnavailable, true)
    assert.equal(results[4].locationMismatch, true)
  })

  it("a flow that starts again drops the denial and nothing else", async () => {
    const denied = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      requestApproximateConsent: async () => "deny",
    })
    const cleared = withoutConsentDenied(denied)
    assert.ok(!("consentDenied" in cleared))
    assert.deepEqual({ ...cleared }, { ...UNDETECTED })
    assert.equal(denied.consentDenied, true) // the original is not mutated
    const plain = { ...UNDETECTED }
    assert.equal(withoutConsentDenied(plain), plain)
  })

  it("a restart asks again and its answer replaces the old denial", async () => {
    let answers = ["deny", "allow"] as const
    let i = 0
    const options = {
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" as const }),
      requestApproximateConsent: async () => answers[i++],
      fetchLocation: async () => SERVER_BODY,
    }
    const first = await getDetectedLocation(options)
    const second = await getDetectedLocation(options)
    assert.equal(first.consentDenied, true)
    assert.ok(!second.consentDenied)
    assert.equal(second.city, "Chicago")
  })
})

describe("browser geolocation wiring (source guards)", () => {
  const page = readDashboardWithHost()

  it("is requested only from the explicit verify action, never on page load", () => {
    // Three call sites: the explicit verify action (which may ask for the browser's
    // location), the Travel Mode popup's Update action (server-derived location only: it
    // never passes the option, so opening it can never trigger the permission prompt) and
    // the Update flow's "Permanently relocated" choice (an explicit user action, wired
    // through the flow's onPermanentlyRelocated prop; see travel-update-relocated-detection.test.ts).
    const calls = page.match(/getDetectedLocation\(/g) ?? []
    // (plus the host's own default for the live card's Update on a page without a popup: also
    // server-derived only, so it can never trigger the permission prompt)
    assert.equal(calls.length, 4)
    // (two call sites plus the host's consent wrapper, which only branches on the option:
    // see location-consent.test.ts)
    assert.equal((page.match(/useBrowserLocation/g) ?? []).length, 3)
    assert.ok(page.includes("getDetectedLocation({ useBrowserLocation: true })"))
    assert.ok(page.includes("await getDetectedLocation()"))
    // The explicit verify action lives in the host; before it (the host's imports, state and
    // return effect) nothing asks for a position, and neither does the page's load code.
    const host = readIdentityHost()
    const handlerAt = host.indexOf("const handleVerifyMyAccount")
    assert.ok(host.indexOf("getDetectedLocation(", handlerAt) > -1)
    const beforeHandler = host.slice(0, handlerAt)
    assert.ok(!beforeHandler.includes("getDetectedLocation("))
    assert.ok(!beforeHandler.includes("getBrowserPosition"))
    assert.ok(!readDashboardPage().includes("getBrowserPosition"))
  })

  it("navigator.geolocation is touched only by the browser-geolocation helper", () => {
    for (const file of [
      ["app", "(group)", "talent-dashboard", "page.tsx"],
      ["components", "identity-verification-flow.tsx"],
      ["src", "lib", "api", "detected-location.ts"],
      ["service", "http", "identity-verification.ts"],
    ]) {
      const source = read(...file)
      assert.ok(!source.includes("navigator.geolocation"), file.join("/"))
      assert.ok(!source.includes("getCurrentPosition"), file.join("/"))
    }
    assert.ok(
      read("src", "lib", "api", "browser-geolocation.ts").includes(
        "getCurrentPosition"
      )
    )
  })

  it("coordinates are never logged or stored by the frontend helpers", () => {
    for (const file of ["browser-geolocation.ts", "detected-location.ts"]) {
      const source = read("src", "lib", "api", file)
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n")
      assert.ok(!/console\./.test(source), file)
      assert.ok(!/localStorage\.setItem|sessionStorage|document\.cookie/.test(source), file)
    }
  })

  it("the Yes button is disabled when the GPS and IP countries disagree", () => {
    assert.ok(
      read("components", "identity-verification-flow.tsx").includes(
        "detectedLocation.locationMismatch === true"
      )
    )
  })

  it("the client sends only latitude and longitude to the server", () => {
    const client = read("service", "http", "identity-verification.ts")
    assert.ok(client.includes("detected-location/coordinates"))
    assert.match(client, /\{\s*latitude,\s*longitude,?\s*\}/)
  })
})
