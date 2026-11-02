// frontend/src/lib/api/detected-location.ts
//
// The verification dialog's detected location. It comes from ONE place: the
// Identity Verification Service's GET /v1/identity-verification/detected-
// location, which resolves the caller's IP server-side with the same
// effective-client-IP logic home-country/confirm uses — so what the dialog
// shows and what gets confirmed are one IP decision. This file never calls
// location-service directly and never sends or receives an IP address.
//
// City, region and coordinates are approximate and display-only; only the
// country is ever used for identity decisions, and only on the server. This
// file never touches persisted verification state.
//
// No hardcoded fallback location. Three distinct outcomes, never collapsed:
//   1. detected: true            — a real value from a successful lookup.
//   2. detected: false, serviceUnavailable: false — the lookup succeeded but
//      found nothing (e.g. a private/loopback IP with no dev override).
//   3. detected: false, serviceUnavailable: true  — the call itself failed
//      (5xx, network error, an unexpected response shape).

import {
  getBrowserPosition,
  onGeolocationGranted,
  type BrowserPositionResult,
} from "./browser-geolocation"
import type { LocationConsentDecision } from "./location-consent"

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
  /** True when the browser's GPS country disagreed with the server-derived IP
   *  country. Nothing from the GPS result is shown, and the dialog must not let
   *  the user confirm a home country on a conflicting signal. */
  locationMismatch?: boolean
  /** True when the backend call itself failed (502/network error/an
   *  unexpected response shape/etc.), as opposed to succeeding with an
   *  empty result. See file header. */
  serviceUnavailable: boolean
  /** True when the detection attempt was abandoned (navigation, logout, account
   *  switch, a newer attempt) before it produced anything. The result carries no
   *  location and must not be applied to the UI. */
  cancelled?: boolean
  /** True only when the user explicitly pressed Deny (or Escape / clicked outside) on the
   *  approximate-location consent dialog. It is an explicit state, never inferred from
   *  missing coordinates or from any other failure. The dialog shows its "couldn't detect"
   *  screen with both actions disabled while it is set. */
  consentDenied?: boolean
}

/** The same location without a consent denial (used when a flow starts again). */
export function withoutConsentDenied(
  location: DetectedLocation
): DetectedLocation {
  if (!location.consentDenied) return location
  const { consentDenied: _denied, ...rest } = location
  return rest
}

// How many times a grant during the consent question may send the attempt back to the
// browser position (a guard against a misbehaving permission source, not a product limit).
const MAX_PERMISSION_PASSES = 3

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

// Response of the Identity Verification Service's GET /detected-location.
// Resolved server-side with the same effective client IP that
// home-country/confirm uses; the IP itself is never returned. Display-only:
// only the country is ever used for identity decisions, on the server.
export interface DetectedLocationResponse {
  countryCode: string | null
  countryName: string | null
  city: string | null
  regionCode: string | null
  regionName: string | null
  latitude: number | null
  longitude: number | null
}

// Content validation, distinct from axios/JSON-parse succeeding: a 200
// response can still be structurally wrong (an HTML error page served with
// a 200, a truncated body, a future contract change) and this is rendered
// straight to the user and fed to the map — so shape is checked before any
// field is trusted, not just that parsing succeeded.
function isValidDetectedLocationResponse(
  value: unknown
): value is DetectedLocationResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const body = value as Record<string, unknown>

  for (const key of [
    "countryCode",
    "countryName",
    "city",
    "regionCode",
    "regionName",
  ]) {
    const field = body[key]
    if (field !== null && field !== undefined && typeof field !== "string") {
      return false
    }
  }

  for (const [key, limit] of [
    ["latitude", 90],
    ["longitude", 180],
  ] as const) {
    const field = body[key]
    if (field === null || field === undefined) continue
    if (typeof field !== "number" || !Number.isFinite(field)) return false
    if (field < -limit || field > limit) return false
  }
  // A map pin needs both or neither.
  if ((body.latitude == null) !== (body.longitude == null)) return false

  return true
}

export interface GetDetectedLocationOptions {
  // The localStorage mock is ignored unless the caller opts in, so a stale
  // mock can never make the dialog show a different location than the one
  // the server will confirm. Only preview/Storybook may pass this.
  allowDevMock?: boolean
  // Ask the browser for its position (this triggers the permission prompt).
  // ONLY an explicit user action — Verify My Account / Retry — may pass this;
  // it must never run on page load.
  useBrowserLocation?: boolean
  // Asked when the browser could not provide a usable position (denied, dismissed,
  // timeout, unsupported, unavailable, or its coordinates could not be resolved by
  // the server). Resolves to the user's answer on "may Marketeq estimate your
  // location from your network connection?". Only "allow" runs the server/IP lookup.
  // When this is absent the answer is "deny": the IP lookup never runs unasked.
  requestApproximateConsent?: () => Promise<LocationConsentDecision>
  // False once this attempt is no longer the live one (navigation, logout, account
  // switch, a newer attempt). Checked after every await so a stale answer neither
  // opens the consent question, fetches, nor returns a location.
  isCurrent?: () => boolean
  // Cancels the wait for the browser's own permission prompt (navigation, logout,
  // account switch, a newer attempt). The wait ends as a cancelled attempt.
  signal?: AbortSignal
  // Closes the consent question when the browser permission is granted while it is
  // open (the browser's answer wins over the IP question).
  cancelApproximateConsent?: () => void
  // Test seams; default to the real browser API and service endpoints.
  fetchLocation?: () => Promise<unknown>
  getPosition?: (signal?: AbortSignal) => Promise<BrowserPositionResult>
  // Calls back once when the browser permission changes to "granted"; returns a
  // function that stops watching.
  watchGeolocationGranted?: (onGranted: () => void) => () => void
  fetchGpsLocation?: (latitude: number, longitude: number) => Promise<unknown>
}

async function fetchServerLocation(): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  const res = await IdentityVerificationAPI.getDetectedLocation()
  return res.data
}

async function fetchServerGpsLocation(
  latitude: number,
  longitude: number
): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  const res = await IdentityVerificationAPI.resolveGpsLocation(
    latitude,
    longitude
  )
  return res.data
}

interface GpsLocationResponse extends DetectedLocationResponse {
  status: "resolved" | "country_mismatch" | "unavailable"
}

function isValidGpsLocationResponse(
  value: unknown
): value is GpsLocationResponse {
  if (!isValidDetectedLocationResponse(value)) return false
  const status = (value as unknown as Record<string, unknown>).status
  return (
    status === "resolved" ||
    status === "country_mismatch" ||
    status === "unavailable"
  )
}

// Builds the dialog's location from a validated server response. A location
// shows as "detected" only when there is a real pin to show: with just a
// country there is no city, no region and no map, so claiming "we detected
// your location" next to a "couldn't detect your location" map would
// contradict itself. In that case the server-derived country is kept (it still
// drives document selection and home-country confirmation) but detected is
// false. Coordinates are never fabricated or substituted with a country centre.
function toDetectedLocation(
  data: DetectedLocationResponse,
  extra: Partial<DetectedLocation> = {}
): DetectedLocation {
  const countryCode = data.countryCode ?? null
  if (!countryCode) {
    return { ...UNDETECTED_LOCATION, ...extra }
  }
  const hasPin = data.latitude != null && data.longitude != null
  return {
    city: hasPin ? (data.city ?? "") : "",
    region: hasPin ? (data.regionCode ?? data.regionName ?? "") : "",
    countryCode,
    countryName: data.countryName ?? countryNameFromCode(countryCode),
    latitude: hasPin ? data.latitude : null,
    longitude: hasPin ? data.longitude : null,
    detected: hasPin,
    serviceUnavailable: false,
    ...extra,
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
export async function getDetectedLocation(
  options: GetDetectedLocationOptions = {}
): Promise<DetectedLocation> {
  if (options.allowDevMock) {
    const override = readDevMockOverride()
    if (override) return override
  }

  const isCurrent = options.isCurrent ?? (() => true)
  const cancelled = (): DetectedLocation => ({
    ...UNDETECTED_LOCATION,
    cancelled: true,
  })

  // Browser geolocation: only on explicit opt-in. A usable GPS result is returned as
  // before. Any shortfall (denied, dismissed, timeout, unsupported, unavailable, or a
  // failed, inconclusive or malformed server answer for the coordinates) no longer
  // falls straight through to the IP lookup: the user is asked first, and only an
  // explicit "allow" runs it.
  if (options.useBrowserLocation) {
    // Normally one pass. A second pass happens only when the browser permission is
    // granted WHILE the consent question is open: the browser's answer then wins.
    for (let pass = 0; ; pass++) {
      const position = await (
        options.getPosition ?? ((signal) => getBrowserPosition(undefined, { signal }))
      )(options.signal)
      if (position.status === "cancelled" || !isCurrent()) return cancelled()
      if (position.status === "ok") {
        try {
          const gps = await (options.fetchGpsLocation ?? fetchServerGpsLocation)(
            position.latitude,
            position.longitude
          )
          if (!isCurrent()) return cancelled()
          if (isValidGpsLocationResponse(gps)) {
            if (gps.status === "resolved") {
              const resolved = toDetectedLocation(gps)
              if (resolved.detected) return resolved
            } else if (gps.status === "country_mismatch") {
              return toDetectedLocation(
                { ...gps, latitude: null, longitude: null },
                { locationMismatch: true }
              )
            }
          }
        } catch {
          // inconclusive: ask before using the network location
        }
        if (!isCurrent()) return cancelled()
      }

      // Nobody to ask: nothing IP-derived is looked up, but this is not a user denial.
      if (!options.requestApproximateConsent)
        return { ...UNDETECTED_LOCATION }

      // Ask, while watching the browser permission: if it is granted meanwhile, the
      // question is withdrawn and the browser position is tried again.
      let grantedMeanwhile: () => void = () => {}
      const granted = new Promise<"granted">((resolve) => {
        grantedMeanwhile = () => resolve("granted")
      })
      const stopWatching =
        pass < MAX_PERMISSION_PASSES
          ? (options.watchGeolocationGranted ?? onGeolocationGranted)(
              () => grantedMeanwhile()
            )
          : () => {}
      const answered = await Promise.race([
        options.requestApproximateConsent().then((decision) => ({ decision })),
        granted,
      ])
      stopWatching()
      if (answered === "granted") {
        options.cancelApproximateConsent?.()
        if (!isCurrent()) return cancelled()
        continue
      }
      const { decision } = answered
      if (decision === "cancelled" || !isCurrent()) return cancelled()
      // Deny: nothing IP-derived is looked up or shown (no country, city, state,
      // coordinates or map). The explicit denial is carried so the "couldn't detect"
      // screen can disable its actions; it is never inferred from missing data.
      if (decision !== "allow")
        return { ...UNDETECTED_LOCATION, consentDenied: true }
      break
    }
  }

  let data: unknown
  try {
    data = await (options.fetchLocation ?? fetchServerLocation)()
  } catch {
    if (!isCurrent()) return cancelled()
    return { ...UNDETECTED_LOCATION, serviceUnavailable: true }
  }
  if (!isCurrent()) return cancelled()

  if (!isValidDetectedLocationResponse(data)) {
    return { ...UNDETECTED_LOCATION, serviceUnavailable: true }
  }

  return toDetectedLocation(data)
}
