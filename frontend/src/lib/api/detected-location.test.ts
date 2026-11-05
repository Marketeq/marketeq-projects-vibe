// Run: npx tsc src/lib/api/detected-location.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>)   # run from the frontend/ directory
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { getDetectedLocation } from "./detected-location"
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

  // BTB-387: the device location is required. Whatever stops the browser from giving a
  // position is reported as a failure reason with NOTHING from the network: no country,
  // city, region, coordinates or pin, and the IP lookup is never made.
  const NOTHING = {
    city: "",
    region: "",
    countryCode: "",
    countryName: "",
    latitude: null,
    longitude: null,
    detected: false,
    serviceUnavailable: false,
  }
  const REASONS = [
    ["unsupported", undefined, "unsupported"],
    ["unavailable", undefined, "device_unavailable"],
    ["timeout", undefined, "timeout"],
    ["denied", "denied", "blocked"],
    ["denied", "prompt", "dismissed"],
    ["denied", undefined, "blocked"],
    ["denied", "granted", "blocked"],
  ] as const
  for (const [status, permission, reason] of REASONS) {
    it(`${status} (permission ${permission ?? "unknown"}) is "${reason}": nothing IP-derived, no lookup, no GPS call`, async () => {
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => ({ status }),
        getPermissionState: async () => permission,
        fetchGpsLocation: async () => assert.fail("must not send coordinates"),
        fetchLocation: async () => assert.fail("must not look up the IP"),
      })
      assert.deepEqual(result, { ...NOTHING, locationFailure: reason })
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

  it("an unavailable, failed or malformed GPS lookup is a resolve_failed: no IP lookup", async () => {
    for (const gps of [
      async () => ({ ...GPS_RESOLVED, status: "unavailable", city: null, latitude: null, longitude: null }),
      async () => {
        throw new Error("503")
      },
      async () => "<html>",
      async () => ({ ...GPS_RESOLVED, status: "resolved", latitude: null, longitude: null }),
      async () => ({ ...GPS_RESOLVED, status: "weird" }),
    ]) {
      const result = await getDetectedLocation({
        useBrowserLocation: true,
        getPosition: async () => GRANTED,
        fetchGpsLocation: gps,
        fetchLocation: async () => assert.fail("must not look up the IP"),
      })
      assert.deepEqual(result, { ...NOTHING, locationFailure: "resolve_failed" })
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
      fetchLocation: async () => assert.fail("must not look up the IP"),
    })
    assert.equal(result.latitude, null)
    assert.equal(result.longitude, null)
    assert.equal(result.detected, false)
    assert.equal(result.locationFailure, "resolve_failed")
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

describe("device location only: no network fallback (BTB-387)", () => {
  it("a GPS success is unchanged and carries no failure", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => GPS_RESOLVED,
      fetchLocation: async () => assert.fail("no IP lookup after a GPS success"),
    })
    assert.equal(result.city, "Chicago")
    assert.equal(result.detected, true)
    assert.ok(!("locationFailure" in result))
  })

  it("a refusal never reaches the IP lookup even when the server could name a city", async () => {
    const result = await getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      getPermissionState: async () => "denied",
      fetchLocation: async () => SERVER_BODY,
    })
    const text = JSON.stringify(result)
    for (const leak of ["Chicago", "Illinois", "United States", "41.88", "-87.63", '"US"']) {
      assert.ok(!text.includes(leak), leak)
    }
    assert.equal(result.locationFailure, "blocked")
  })

  it("the server lookup still serves callers that do not ask the browser (Travel Mode Update)", async () => {
    const result = await getDetectedLocation({ fetchLocation: async () => SERVER_BODY })
    assert.equal(result.city, "Chicago")
    assert.ok(!("locationFailure" in result))
  })

  it("an abandoned attempt (navigation, logout, account switch) is cancelled at every step and says nothing", async () => {
    // cancelled while the browser prompt was open
    assert.equal(
      (
        await getDetectedLocation({
          useBrowserLocation: true,
          getPosition: async () => ({ status: "cancelled" }),
        })
      ).cancelled,
      true
    )
    // stale once the position arrived
    let live = true
    const afterPosition = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => {
        live = false
        return { status: "denied" }
      },
      getPermissionState: async () => assert.fail("a stale attempt must not read the permission"),
    })
    assert.equal(afterPosition.cancelled, true)
    assert.ok(!("locationFailure" in afterPosition))
    // stale while the GPS answer was pending
    live = true
    const afterGps = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => GRANTED,
      fetchGpsLocation: async () => {
        live = false
        return GPS_RESOLVED
      },
    })
    assert.equal(afterGps.cancelled, true)
    assert.equal(afterGps.detected, false)
    // stale while the permission was being read
    live = true
    const afterPermission = await getDetectedLocation({
      useBrowserLocation: true,
      isCurrent: () => live,
      getPosition: async () => ({ status: "denied" }),
      getPermissionState: async () => {
        live = false
        return "prompt"
      },
    })
    assert.equal(afterPermission.cancelled, true)
    assert.ok(!("locationFailure" in afterPermission))
  })
})

describe("browser geolocation wiring (source guards)", () => {
  const page = readDashboardWithHost()

  it("is requested only from the explicit verify action, never on page load", () => {
    // BTB-387: every call that asks the browser for the device location is an explicit user
    // action: Verify My Account, "Permanently relocated", the location dialog's Try Again,
    // and createDeviceLocationRequester (the Update, "Change my home country" and check-in "Update my
    // home country" clicks). No IP-only (server-derived) lookup is made by any of them.
    const calls = page.match(/getDetectedLocation\(/g) ?? []
    assert.equal(calls.length, 4)
    // those four + the host wrapper that only branches on the option
    assert.equal((page.match(/useBrowserLocation/g) ?? []).length, 5)
    assert.ok(page.includes("getDetectedLocation({ useBrowserLocation: true })"))
    assert.ok(!page.includes("await getDetectedLocation()"))
    // The explicit verify action lives in the host; before it (the host's imports, state and
    // return effect) nothing asks for a position, and neither does the page's load code.
    const host = readIdentityHost()
    const handlerAt = host.indexOf("const handleVerifyMyAccount")
    assert.ok(host.indexOf("getDetectedLocation(", handlerAt) > -1)
    const beforeHandler = host.slice(0, handlerAt)
    // the two earlier calls are the dialog's Try Again (createLocationRecovery.tryAgain) and
    // requestDeviceLocation, both made only from a click
    assert.equal(beforeHandler.split("getDetectedLocation(").length - 1, 2)
    assert.ok(
      beforeHandler.slice(beforeHandler.indexOf("createLocationRecovery(")).includes("getDetectedLocation(")
    )
    assert.ok(
      beforeHandler.slice(beforeHandler.indexOf("createDeviceLocationRequester({")).includes("getDetectedLocation(")
    )
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
