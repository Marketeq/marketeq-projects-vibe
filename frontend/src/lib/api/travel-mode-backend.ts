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
// logged and resolves false so the caller can keep its screen open. "Skip" (no duration
// chosen) is recorded as the screen's own "Not sure" option.
export async function recordTravelDuration(
  deps: TravelModeDeps,
  duration: string | null
): Promise<boolean> {
  try {
    await deps.recordTravelDuration(
      (duration && TRAVEL_DURATION_TO_BACKEND[duration]) || "not_sure"
    )
    return true
  } catch (error) {
    console.error("[identity-verification] travel duration failed", error)
    return false
  }
}
