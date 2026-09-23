// frontend/src/lib/api/detected-location.ts
//
// Isolated detected-location client. Real IP-based location detection (the
// LocationProvider interface identity-verification-service's docs
// describe) does not exist on this branch or the backend branch yet —
// this is a temporary, self-contained mock. Swap `getDetectedLocation`'s
// body for a real call once that integration exists; the return shape and
// call sites do not need to change.
//
// No real map integration exists anywhere in this codebase today (no
// Google Maps/Mapbox/Leaflet dependency, no maps API key in any env
// template) and the backend only stores city/region/country as text, not
// coordinates — so there is nothing to render a real map from yet either.
// The UI shows a labeled placeholder in the map's place until both a real
// location signal and a maps integration decision exist.
export interface DetectedLocation {
  city: string
  region: string
  countryCode: string
  countryName: string
}

const MOCK_OVERRIDE_KEY = "__mock_detected_location"

const DEFAULT_LOCATION: DetectedLocation = {
  city: "New York",
  region: "NY",
  countryCode: "US",
  countryName: "United States",
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
      return parsed as DetectedLocation
    }
    return null
  } catch {
    return null
  }
}

/**
 * Resolves the account's detected current location. TEMPORARY MOCK — see
 * file header. Dev-only override, e.g.:
 *   localStorage.setItem('__mock_detected_location', JSON.stringify({
 *     city: 'Toronto', region: 'ON', countryCode: 'CA', countryName: 'Canada'
 *   }))
 */
export async function getDetectedLocation(): Promise<DetectedLocation> {
  return readDevMockOverride() ?? DEFAULT_LOCATION
}
