// frontend/src/lib/api/travel-mode-backend.ts
//
// Persists the choices the existing travel UI already collects, without
// changing that UI: which travel option the user picked and the duration.
// Backend value names are the exact enum values identity-verification-service
// accepts (TravelClassification / DeclaredDuration).
//
// A failed classification is logged and never blocks the UI. A failed duration save is
// reported to the caller (see recordTravelDuration), which keeps the screen open.

export type TravelClassificationValue =
  | "temporarily_traveling"
  | "permanently_relocated"

export type DeclaredDurationValue =
  | "a_few_days"
  | "one_to_two_weeks"
  | "more_than_two_weeks"
  | "not_sure"

// Labels exactly as the existing duration screen shows them.
export const TRAVEL_DURATION_TO_BACKEND: Record<string, DeclaredDurationValue> = {
  "A few days": "a_few_days",
  "1–2 weeks": "one_to_two_weeks",
  "More than 2 weeks": "more_than_two_weeks",
  "Not sure": "not_sure",
}

// What "Skip" submits: an explicit "Not sure", whatever was selected before. Skip never
// reads the selection. identity-verification-service cannot represent a Travel Mode with
// no duration at all: `declared_duration = null` ("skipped", Data Model doc) on an active
// period is the fail-closed `invalid` state (travel-mode-state.ts) and would deactivate it,
// and the length of a skipped period is not documented. So the request is the Not sure
// period; "skipped" exists only on this screen, to choose the confirmation copy. A real
// null-duration state needs a backend contract decision (see PMCM-639).
export const SKIPPED_TRAVEL_DURATION_LABEL = "Not sure"

export interface TravelModeDeps {
  recordTravelClassification: (c: TravelClassificationValue) => Promise<unknown>
  recordTravelDuration: (d: DeclaredDurationValue) => Promise<unknown>
}

export async function recordTravelClassification(
  deps: TravelModeDeps,
  classification: TravelClassificationValue
): Promise<void> {
  try {
    await deps.recordTravelClassification(classification)
  } catch (error) {
    console.error("[identity-verification] travel classification failed", error)
  }
}

// Saves the whole Travel Mode activation: the backend sets the classification and the
// duration in ONE atomic write, so nothing is saved before this call and nothing is
// half-saved if it fails. Resolves true only when the backend accepted it; a failure is
// logged and resolves false so the caller can keep its screen open.
//
// The duration must be one of the four screen labels: nothing is invented for a missing or
// unknown one (that used to fall back to "not_sure", which let Confirm save an answer the
// user never gave). "Skip" passes SKIPPED_TRAVEL_DURATION_LABEL on purpose.
export async function recordTravelDuration(
  deps: TravelModeDeps,
  duration: string
): Promise<boolean> {
  const backendDuration = TRAVEL_DURATION_TO_BACKEND[duration]
  if (!backendDuration) {
    console.error("[identity-verification] travel duration is not one of the screen options")
    return false
  }
  try {
    await deps.recordTravelDuration(backendDuration)
    return true
  } catch (error) {
    console.error("[identity-verification] travel duration failed", error)
    return false
  }
}
