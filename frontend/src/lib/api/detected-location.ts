// frontend/src/lib/api/detected-location.ts
//
// Single current-location lookup, used for both the displayed text and the
// map marker — one call, not two independently-timed sources. Previously
// this combined identity-verification-service's GET /me
// (detectedCity/RegionState/Country — persisted, set ONCE on first-ever
// profile creation, never re-resolved) with location-service's live
// resolve-ip (coordinates, fresh every call). That mixed a frozen snapshot
// with a live value and could disagree with itself. This version reads
// identity-verification-service's /me for display not at all — it reads
// location-service's GET /location/resolve-ip, live, once per call, and
// uses its country + coordinates for everything shown.
//
// Deliberately does NOT also call GET /location/resolve-coordinates here.
// That endpoint reverse-geocodes a lat/lon pair via LocationIQ to
// municipality level, and LS-00 reserves it for GPS-based profile display —
// a genuinely precise input this flow does not have. Feeding it the
// *approximate*, city-level-at-best coordinates that resolve-ip derives
// from an IP/MaxMind lookup would produce city/region text that reads as
// precise but isn't backed by precise input — exactly the kind of
// misleadingly-specific display this flow must not produce. So city/region
// are populated only if resolve-ip's own response genuinely supplies them
// (it doesn't today — location-service's IpResolution is
// {ip, country, currency, timezone, coordinates} only, confirmed by reading
// location.service.ts) and are otherwise left honestly empty, never
// reverse-geocoded from an approximate coordinate as a way to fill them in.
//
// identity-verification-service's persisted detectedCountry/
// verifiedHomeCountry/locationVerificationStatus are completely untouched by
// this file — this is deliberate. Those fields drive verification
// eligibility (confirmHomeCountry) and must only ever change via that
// explicit action or a webhook outcome, never as a side effect of the
// account viewing its current-location display. This file's
// DetectedLocation is display-only, approximate, and never conflated with
// confirmed residence or verification status.
//
// STILL BLOCKED pending the same unapproved gateway routing patch as before
// (.claude/pending-review/proxy.service.cto-review.{patch,md}):
// api-gateway's proxy.service.ts serviceMap has no entry for 'location', so
// the call below currently 502s through the gateway ("Unknown service:
// location"). This is not the only remaining gap, even once that patch
// lands — see the two items below, neither fixed by this file:
//   - Client-IP trust: the IP location-service resolves is whatever
//     extractClientIp() picks off x-forwarded-for, and api-gateway's
//     proxy.service.ts forwards an inbound x-forwarded-for chain from the
//     browser and only appends its own view of the client afterward — it
//     never strips a client-supplied prefix. X-Forwarded-For is not a
//     forbidden header in the Fetch spec, so this is spoofable by any
//     caller, browser or direct. Not verified fixed anywhere in this chain.
//   - location-service access protection: GET /location/resolve-ip has no
//     auth at all today (confirmed by reading location.controller.ts) —
//     this is the existing status quo, not introduced or resolved here.
//
// Detection is IP-based only, never the browser Geolocation API — using
// that would require browser permission for precise device location, which
// Technical Architecture §11 explicitly scopes out for this service
// ("country-level resolution only, not precise/coordinate-based").
//
// No hardcoded fallback location. Three distinct outcomes are surfaced,
// never collapsed into one another:
//   1. detected: true            — a real value, from a successful lookup.
//   2. detected: false, serviceUnavailable: false — the lookup succeeded
//      but genuinely found nothing (e.g. a private/loopback IP in dev).
//   3. detected: false, serviceUnavailable: true  — the backend call itself
//      failed (502, network error, an unexpected response shape) — not the
//      same thing as "looked and found nothing," and must not be presented
//      to the user as if it were the same honest-empty state.
import { LocationAPI, type IpLocationResolution } from "@/service/http/location"

export interface DetectedLocation {
  city: string
  region: string
  countryCode: string
  countryName: string
  latitude: number | null
  longitude: number | null
  /** True only for a real, successfully resolved value. Never true for a
   *  hardcoded guess. */
  detected: boolean
  /** True when the backend call itself failed (502/network error/an
   *  unexpected response shape/etc.), as opposed to succeeding with an
   *  empty result. See file header. */
  serviceUnavailable: boolean
}

const MOCK_OVERRIDE_KEY = "__mock_detected_location"

const UNDETECTED_LOCATION: DetectedLocation = {
  city: "",
  region: "",
  countryCode: "",
  countryName: "",
  latitude: null,
  longitude: null,
  detected: false,
  serviceUnavailable: false,
}

function readDevMockOverride(): DetectedLocation | null {
  if (process.env.NODE_ENV === "production") return null
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(MOCK_OVERRIDE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.city === "string" &&
      typeof parsed?.region === "string" &&
      typeof parsed?.countryCode === "string" &&
      typeof parsed?.countryName === "string"
    ) {
      return {
        city: parsed.city,
        region: parsed.region,
        countryCode: parsed.countryCode,
        countryName: parsed.countryName,
        latitude: typeof parsed.latitude === "number" ? parsed.latitude : null,
        longitude:
          typeof parsed.longitude === "number" ? parsed.longitude : null,
        detected: true,
        serviceUnavailable: false,
      }
    }
    return null
  } catch {
    return null
  }
}

function countryNameFromCode(countryCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" })
    return displayNames.of(countryCode) ?? countryCode
  } catch {
    return countryCode
  }
}

// Content validation, distinct from axios/JSON-parse succeeding: a 200
// response can still be structurally wrong (an HTML error page served with
// a 200, a truncated body, a future location-service contract change) and
// this is rendered straight to the user and fed to the map — so shape is
// checked before any field is trusted, not just that parsing succeeded.
function isValidIpLocationResolution(value: unknown): value is IpLocationResolution {
  if (!value || typeof value !== "object") return false
  const body = value as Record<string, unknown>

  if (body.country !== null && body.country !== undefined && typeof body.country !== "string") {
    return false
  }

  const coordinates = body.coordinates
  if (coordinates !== null && coordinates !== undefined) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return false
    const [lat, lon] = coordinates
    if (typeof lat !== "number" || typeof lon !== "number") return false
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false
  }

  return true
}

/**
 * Resolves the account's detected current location. Dev-only override
 * still works for testing without a real public IP, e.g.:
 *   localStorage.setItem('__mock_detected_location', JSON.stringify({
 *     city: 'Toronto', region: 'ON', countryCode: 'CA', countryName: 'Canada',
 *     latitude: 43.6532, longitude: -79.3832
 *   }))
 */
export async function getDetectedLocation(): Promise<DetectedLocation> {
  const override = readDevMockOverride()
  if (override) return override

  let ipResult: { data: IpLocationResolution }
  try {
    ipResult = await LocationAPI.resolveIp()
  } catch {
    return { ...UNDETECTED_LOCATION, serviceUnavailable: true }
  }

  if (!isValidIpLocationResolution(ipResult.data)) {
    return { ...UNDETECTED_LOCATION, serviceUnavailable: true }
  }

  const countryCode = ipResult.data.country ?? null
  if (!countryCode) {
    return UNDETECTED_LOCATION
  }

  const coordinates = ipResult.data.coordinates ?? null
  const latitude = coordinates ? coordinates[0] : null
  const longitude = coordinates ? coordinates[1] : null

  // location-service's resolve-ip contract has no region/city fields today
  // (IpLocationResolution above mirrors it exactly: ip/country/currency/
  // timezone/coordinates, nothing else) — so these stay honestly empty
  // rather than being derived by reverse-geocoding the approximate
  // coordinates above. See file header for why that derivation is
  // deliberately not done here.
  const city = ""
  const region = ""

  return {
    city,
    region,
    countryCode,
    countryName: countryNameFromCode(countryCode),
    latitude,
    longitude,
    detected: true,
    serviceUnavailable: false,
  }
}
