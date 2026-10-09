import { DeclaredDuration } from '../../entities/enums/identity-verification.enums';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Approved Travel Mode reminders: day 3 and day 7 after activation.
export const TRAVEL_REMINDER_DAYS = [3, 7] as const;

// Approved length of each declared duration, in days. Exhaustive on purpose:
// adding a DeclaredDuration without a length is a compile error.
const TRAVEL_DURATION_DAYS: Record<DeclaredDuration, number> = {
  [DeclaredDuration.A_FEW_DAYS]: 6,
  [DeclaredDuration.ONE_TO_TWO_WEEKS]: 13,
  [DeclaredDuration.MORE_THAN_TWO_WEEKS]: 30,
  [DeclaredDuration.NOT_SURE]: 30,
};

/**
 * The instant Travel Mode ends: activation plus the declared duration, in
 * epoch milliseconds (no calendar, local-time or DST arithmetic). Travel Mode
 * is effective while `now < endsAt` and expired from `endsAt` onwards.
 * Returns null when the activation time is invalid or the duration is unknown.
 */
export function travelModeEndsAt(activatedAt: Date, duration: DeclaredDuration): Date | null {
  const days = TRAVEL_DURATION_DAYS[duration];
  const start = activatedAt?.getTime();
  if (typeof days !== 'number' || !Number.isFinite(start)) return null;
  return new Date(start + days * DAY_MS);
}

/**
 * The reminder times of one activation, earliest first: day 3 and day 7 after
 * activation, keeping only those that fall strictly before the end. A reminder
 * that would land at or after `endsAt` does not exist (so the 6-day duration
 * has no day-7 reminder).
 */
export function travelReminderOccurrences(activatedAt: Date, endsAt: Date): Date[] {
  return TRAVEL_REMINDER_DAYS.map((day) => new Date(activatedAt.getTime() + day * DAY_MS)).filter(
    (due) => due.getTime() < endsAt.getTime(),
  );
}
