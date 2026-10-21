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
// The location behind the flow is the server's (no browser location permission here).
import { type DetectedLocation, getDetectedLocation } from "./detected-location"
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
  getDetectedLocation: () => Promise<DetectedLocation>
}

const defaultDeps: MismatchDeps = {
  getDetectedLocation: () => getDetectedLocation(),
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

export async function startChangeHomeCountry(
  deps: MismatchDeps = defaultDeps
): Promise<MismatchLaunch> {
  return { location: await deps.getDetectedLocation() }
}
