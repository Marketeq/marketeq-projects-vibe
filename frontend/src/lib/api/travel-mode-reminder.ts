// frontend/src/lib/api/travel-mode-reminder.ts
//
// Isolated mock for the "selected travel time has elapsed" reminder. The
// real trigger is a backend-scheduled job — something no browser session
// can wait around for in reality (the shortest option, "A few days," is
// still days), and no such job exists yet in identity-verification-service
// today. This mock stands in with a short, fixed client-side delay purely
// so the reminder notification is demonstrable end to end; it never claims
// to track the user's actual selected duration and must be swapped for a
// real push/poll-based check once the backend job exists.
export type TravelDuration =
  | "A few days"
  | "1–2 weeks"
  | "More than 2 weeks"
  | "Not sure"

const MOCK_REMINDER_DELAY_MS = 15000

export function scheduleTravelModeReminderMock(
  _duration: TravelDuration | null,
  onDue: () => void
): () => void {
  const timer = setTimeout(onDue, MOCK_REMINDER_DELAY_MS)
  return () => clearTimeout(timer)
}
