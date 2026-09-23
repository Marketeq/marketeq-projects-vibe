// frontend/src/lib/api/detected-location.ts
//
// Combines two real backend calls, both proxied through api-gateway:
//   - identity-verification-service (GET /v1/identity-verification/me) for
//     the country-level text (detectedCity/RegionState/Country) — the only
//     location data that service is allowed to own (Technical Architecture
//     §3: "Precise, coordinate-based location for profile display... this
//     service consumes country-level resolution only").
//   - location-service (GET /location/resolve-ip) for the approximate
//     coordinates used to center the map, since §3 assigns coordinate-based
//     display explicitly elsewhere, not to identity-verification-service.
// Both calls resolve the same request's IP through geoip-lite, so in
// practice they agree — but they are genuinely two independent HTTP calls,
// each proxied separately through the gateway.
//
// BLOCKED pending explicit CTO approval: both calls currently 502
// ("Unknown service: identityVerification" / "Unknown service: location").
// api-gateway's routing needs two entries in proxy.service.ts's serviceMap,
// but that file is permanently locked (CODE_REVIEW_SOP.md §1.4, CTO-only —
// same tier as login/auth files). The required change is prepared, not
// applied: see .claude/pending-review/proxy.service.cto-review.{patch,md}.
// Do not add the mapping anywhere else (e.g. proxy.controller.ts) to route
// around the freeze — wait for CTO approval on the patch.
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
//      failed (502, network error, etc.) — not the same thing as "looked
//      and found nothing," and must not be presented to the user as if it
//      were the same honest-empty state.
import { IdentityVerificationAPI } from "@/service/http/identity-verification"
import { LocationAPI } from "@/service/http/location"

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
  /** True when the backend call itself failed (502/network error/etc.),
   *  as opposed to succeeding with an empty result. See file header. */
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

  const [statusResult, ipResult] = await Promise.allSettled([
    IdentityVerificationAPI.getMyStatus(),
    LocationAPI.resolveIp(),
  ])

  // Either call rejecting (502 from the still-blocked gateway route, a
  // network error, anything) is a service failure — categorically
  // different from a fulfilled call that legitimately found no location.
  if (statusResult.status === "rejected" || ipResult.status === "rejected") {
    return { ...UNDETECTED_LOCATION, serviceUnavailable: true }
  }

  const status = statusResult.value.data
  const ip = ipResult.value.data

  const countryCode = status.detectedCountry ?? null
  if (!countryCode) {
    return UNDETECTED_LOCATION
  }

  const coordinates = ip.coordinates ?? null

  return {
    city: status.detectedCity ?? "",
    region: status.detectedRegionState ?? "",
    countryCode,
    countryName: countryNameFromCode(countryCode),
    latitude: coordinates ? coordinates[0] : null,
    longitude: coordinates ? coordinates[1] : null,
    detected: true,
    serviceUnavailable: false,
  }
}
