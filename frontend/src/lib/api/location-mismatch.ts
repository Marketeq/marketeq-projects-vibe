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
//   "I'm currently traveling" records Temporarily traveling, then opens the EXISTING flow on
//              its "How long are you traveling?" screen. If recording fails the flow opens
//              on "Tell us more about your current location", whose own Temporarily
//              traveling button records it again, so the duration step never runs without
//              a classification.
//   "Change my home country"  records Permanently relocated (which the backend answers by
//              resetting location verification), then opens the EXISTING flow from the top
//              so the home country is confirmed again. A failed record is only logged: the
//              flow's own confirmation is the real work.
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
  recordTravelClassification: (
    classification: "temporarily_traveling" | "permanently_relocated"
  ) => Promise<unknown>
  getDetectedLocation: () => Promise<DetectedLocation>
}

async function defaultRecord(
  classification: "temporarily_traveling" | "permanently_relocated"
): Promise<unknown> {
  const { IdentityVerificationAPI } =
    await import("@/service/http/identity-verification")
  return IdentityVerificationAPI.recordTravelClassification(classification)
}

const defaultDeps: MismatchDeps = {
  recordTravelClassification: defaultRecord,
  getDetectedLocation: () => getDetectedLocation(),
}

export function shouldShowLocationMismatchPrompt(
  summary: IdentityVerificationSummaryView | null
): boolean {
  if (summary?.locationMismatch !== true) return false
  return !shouldOpenFirstTimeGate(summary) && cooldownRetryAt(summary) === null
}

export async function startStillTraveling(
  deps: MismatchDeps = defaultDeps
): Promise<MismatchLaunch> {
  let recorded = true
  try {
    await deps.recordTravelClassification("temporarily_traveling")
  } catch {
    recorded = false
  }
  const location = await deps.getDetectedLocation()
  return {
    location,
    initialState: recorded ? "traveling-showcase" : "current-location-showcase",
  }
}

export async function startChangeHomeCountry(
  deps: MismatchDeps = defaultDeps
): Promise<MismatchLaunch> {
  try {
    await deps.recordTravelClassification("permanently_relocated")
  } catch (error) {
    console.error(
      "[identity-verification] relocation classification failed",
      error
    )
  }
  return { location: await deps.getDetectedLocation() }
}
