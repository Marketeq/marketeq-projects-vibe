// frontend/src/lib/api/travel-mode-backend.ts
//
// Persists the choices the existing travel UI already collects, without
// changing that UI: which travel option the user picked and the duration.
// Backend value names are the exact enum values identity-verification-service
// accepts (TravelClassification / DeclaredDuration).
//
// Failures are logged and never block the UI — the screens behave exactly as
// they did before this persistence existed.

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

// `pendingClassification` is the still-running classification request from
// the earlier click, so duration is never sent before it. "Skip" (no
// duration chosen) is recorded as the screen's own "Not sure" option.
export async function recordTravelDuration(
  deps: TravelModeDeps,
  duration: string | null,
  pendingClassification?: Promise<void>
): Promise<void> {
  try {
    await pendingClassification
    await deps.recordTravelDuration(
      (duration && TRAVEL_DURATION_TO_BACKEND[duration]) || "not_sure"
    )
  } catch (error) {
    console.error("[identity-verification] travel duration failed", error)
  }
}
