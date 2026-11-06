// frontend/src/lib/api/location-mismatch.ts
//
// The returning-user new-location prompt (Storybook ChangeLocation, "You're logging in
// from a location outside your usual one"). The backend alone decides when it applies:
// GET /me says locationMismatch === true only for a verified home country, a known and
// different live country, and no Travel Mode in force. Nothing here compares countries.
//
//   shown      locationMismatch === true, and no other verification surface owns the
//              screen (the first-time gate or the "three attempts" dialog). The
//              first-time flow is never touched by this prompt.
//   "I'm still traveling" (returning user, no Travel Mode in force) opens the EXISTING
//              flow on its "How long are you traveling?" screen and SAVES NOTHING. The
//              duration screen's Confirm/Skip is what saves: the backend sets the
//              classification and the whole Travel Mode activation in one atomic write,
//              so closing the screen leaves the account exactly as it was.
//   "Change my home country"  opens the EXISTING flow from the top so the home country
//              is confirmed again, and SAVES NOTHING either. Closing the confirmation
//              changes no account state; the pending claim is created only by the
//              explicit "Yes, this is my home country" confirmation.
// The location behind "Change my home country" is the DEVICE location, requested on that
// explicit click (BTB-387): the browser's position, reverse-geocoded and checked by the
// server against the request country. If the device location cannot be obtained the flow does
// not open (the "Turn on location to continue" dialog does, from the caller) and there is no
// IP fallback. "I'm still traveling" shows no location.
import {
  type DetectedLocation,
  type GetDetectedLocationOptions,
  getDetectedLocation,
} from "./detected-location"
import { cooldownRetryAt, shouldOpenFirstTimeGate } from "./identity-next-step"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"

export type MismatchFlowStart =
  | "traveling-showcase"
  | "current-location-showcase"

export interface MismatchLaunch {
  location: DetectedLocation
  /** Undefined means the flow's normal first screen (re-confirm the home country). */
  initialState?: MismatchFlowStart
}

export interface MismatchDeps {
  getDetectedLocation: (
    options?: GetDetectedLocationOptions
  ) => Promise<DetectedLocation>
  /**
   * The device location with the recovery dialog behind it (the host's requestDeviceLocation):
   * resolves with a GPS result, or null when the attempt ended without one. When it is not
   * supplied the browser is asked once and any shortfall ends the attempt.
   */
  requestDeviceLocation?: () => Promise<DetectedLocation | null>
}

const defaultDeps: MismatchDeps = {
  getDetectedLocation: (options) => getDetectedLocation(options),
}

/**
 * Whether another verification surface owns the screen. The first-time gate does, except
 * for a returning user whose home-country claim has no live session: the backend sends
 * pendingHomeCountry for that claim, which a first-time user never has, and it only
 * reaches the prompts when nothing is running or in review (an abandoned or expired
 * session). That user is offered the decision again instead of being locked behind the
 * gate. The "three attempts" dialog always owns the screen.
 */
function otherSurfaceOwnsScreen(
  summary: IdentityVerificationSummaryView | null
): boolean {
  if (cooldownRetryAt(summary) !== null) return true
  if (summary?.pendingHomeCountry) return false
  return shouldOpenFirstTimeGate(summary)
}

export function shouldShowLocationMismatchPrompt(
  summary: IdentityVerificationSummaryView | null
): boolean {
  if (summary?.locationMismatch !== true) return false
  return !otherSurfaceOwnsScreen(summary)
}

/**
 * The "still traveling?" prompt for an account whose Travel Mode is in force: the
 * backend says it was detected in a country other than its verified home country
 * (travelModeLocationMismatch). It uses the same ChangeLocation dialog and the same
 * exclusions as the returning-user prompt (no other verification surface owns the
 * screen). WHEN to show it (once per login) is decided in travel-location-prompt.ts.
 */
export function shouldShowTravelerLocationPrompt(
  summary: IdentityVerificationSummaryView | null
): boolean {
  if (summary?.travelModeLocationMismatch !== true) return false
  return !otherSurfaceOwnsScreen(summary)
}

export async function startStillTraveling(
  deps: MismatchDeps = defaultDeps
): Promise<MismatchLaunch> {
  return {
    location: await deps.getDetectedLocation(),
    initialState: "traveling-showcase",
  }
}

/**
 * "Change my home country" opens the SAME detected-location confirmation the first-time
 * flow does, loaded the same way: Verify My Account asks for the browser's position (an
 * explicit user action, and so is this click), the backend reverse-geocodes it, accepts it
 * only if its country matches the server-derived request country, and the screen shows the
 * city, region and country with the real map. It returns null, and the caller leaves the
 * flow closed, whenever the device location was not produced (denied, dismissed, blocked,
 * unsupported, unavailable, timed out, cancelled): there is never an IP-derived country, city
 * or map and never a blank "couldn't detect your location" screen. The country that is
 * eventually recorded is resolved by the backend from the request again, never taken from
 * this view.
 */
export async function startChangeHomeCountry(
  deps: MismatchDeps = defaultDeps
): Promise<MismatchLaunch | null> {
  const location = deps.requestDeviceLocation
    ? await deps.requestDeviceLocation()
    : await deps.getDetectedLocation({ useBrowserLocation: true })
  if (!location || location.cancelled || location.locationFailure) return null
  return { location }
}
