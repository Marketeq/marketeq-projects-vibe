import { DeclaredDuration } from '../../entities/enums/identity-verification.enums';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Approved check-in days, counted from the activation (the initial duration answer) or from
// the latest saved duration answer, whichever is later. Both restart the schedule: an
// answer sets a new activation time (see updateActiveTravelDuration). "A few days" is
// day 3 and day 6; every other answer, "Not sure" included, is day 3 and day 7.
const DEFAULT_CHECK_IN_DAYS: readonly number[] = [3, 7];
const TRAVEL_CHECK_IN_DAYS: Record<DeclaredDuration, readonly number[]> = {
  [DeclaredDuration.A_FEW_DAYS]: [3, 6],
  [DeclaredDuration.ONE_TO_TWO_WEEKS]: [3, 7],
  [DeclaredDuration.MORE_THAN_TWO_WEEKS]: [3, 7],
  [DeclaredDuration.NOT_SURE]: [3, 7],
};

/** The check-in days for a declared duration (day 3 and day 7 for an unknown value). */
export function travelReminderDays(duration: DeclaredDuration | null | undefined): readonly number[] {
  return (duration && TRAVEL_CHECK_IN_DAYS[duration]) || DEFAULT_CHECK_IN_DAYS;
}

// Approved length of each declared duration, in days. Exhaustive on purpose:
// adding a DeclaredDuration without a length is a compile error. "A few days" is 7 days
// (it was 6) so that its day-6 check-in falls strictly before the end and can be due.
const TRAVEL_DURATION_DAYS: Record<DeclaredDuration, number> = {
  [DeclaredDuration.A_FEW_DAYS]: 7,
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
 * The reminder times of one activation, earliest first: the duration's check-in days
 * after activation (see travelReminderDays), keeping only those that fall strictly
 * before the end. A reminder that would land at or after `endsAt` does not exist.
 * Every duration is longer than its last check-in day (7 > 6, 13 > 7, 30 > 7).
 */
export function travelReminderOccurrences(
  activatedAt: Date,
  endsAt: Date,
  duration: DeclaredDuration | null | undefined,
): Date[] {
  return travelReminderDays(duration)
    .map((day) => new Date(activatedAt.getTime() + day * DAY_MS))
    .filter((due) => due.getTime() < endsAt.getTime());
}
