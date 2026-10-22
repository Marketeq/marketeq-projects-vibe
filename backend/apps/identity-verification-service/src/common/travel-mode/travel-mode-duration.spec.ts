import { DeclaredDuration } from '../../entities/enums/identity-verification.enums';
import { DAY_MS, travelModeEndsAt, travelReminderDays, travelReminderOccurrences } from './travel-mode-duration';

describe('travelModeEndsAt', () => {
  const activatedAt = new Date('2026-06-01T12:00:00.000Z');
  const endsAfterDays = (duration: DeclaredDuration) =>
    (travelModeEndsAt(activatedAt, duration)!.getTime() - activatedAt.getTime()) / DAY_MS;

  it('maps the four durations to 6, 13, 30 and 30 days', () => {
    expect(endsAfterDays(DeclaredDuration.A_FEW_DAYS)).toBe(6);
    expect(endsAfterDays(DeclaredDuration.ONE_TO_TWO_WEEKS)).toBe(13);
    expect(endsAfterDays(DeclaredDuration.MORE_THAN_TWO_WEEKS)).toBe(30);
    expect(endsAfterDays(DeclaredDuration.NOT_SURE)).toBe(30);
  });

  it('covers every DeclaredDuration value', () => {
    for (const duration of Object.values(DeclaredDuration)) {
      expect(travelModeEndsAt(activatedAt, duration)).toBeInstanceOf(Date);
    }
  });

  it('is exact to the millisecond: active 1 ms before the end, expired exactly at the end', () => {
    const endsAt = travelModeEndsAt(activatedAt, DeclaredDuration.A_FEW_DAYS)!;
    expect(endsAt.toISOString()).toBe('2026-06-07T12:00:00.000Z');
    const effective = (now: number) => now < endsAt.getTime();
    expect(effective(endsAt.getTime() - 1)).toBe(true);
    expect(effective(endsAt.getTime())).toBe(false);
    expect(effective(endsAt.getTime() + 1)).toBe(false);
  });

  it('uses elapsed UTC time, not calendar days, across a daylight-saving change', () => {
    const start = new Date('2026-03-07T12:00:00.000Z');
    const endsAt = travelModeEndsAt(start, DeclaredDuration.A_FEW_DAYS)!;
    expect(endsAt.getTime() - start.getTime()).toBe(144 * 60 * 60 * 1000);
    expect(endsAt.toISOString()).toBe('2026-03-13T12:00:00.000Z');
  });

  it('returns null for an invalid activation time or an unknown duration', () => {
    expect(travelModeEndsAt(new Date('not a date'), DeclaredDuration.A_FEW_DAYS)).toBeNull();
    expect(travelModeEndsAt(null as unknown as Date, DeclaredDuration.A_FEW_DAYS)).toBeNull();
    expect(travelModeEndsAt(activatedAt, 'forever' as unknown as DeclaredDuration)).toBeNull();
    expect(travelModeEndsAt(activatedAt, 'constructor' as unknown as DeclaredDuration)).toBeNull();
    expect(travelModeEndsAt(activatedAt, null as unknown as DeclaredDuration)).toBeNull();
  });

  it('the approved check-in days: 3 and 6 for "A few days", 3 and 7 for every other answer ("Not sure" included)', () => {
    expect([...travelReminderDays(DeclaredDuration.A_FEW_DAYS)]).toEqual([3, 6]);
    expect([...travelReminderDays(DeclaredDuration.ONE_TO_TWO_WEEKS)]).toEqual([3, 7]);
    expect([...travelReminderDays(DeclaredDuration.MORE_THAN_TWO_WEEKS)]).toEqual([3, 7]);
    expect([...travelReminderDays(DeclaredDuration.NOT_SURE)]).toEqual([3, 7]);
  });

  it('an unknown or missing duration falls back to day 3 and day 7', () => {
    expect([...travelReminderDays(null)]).toEqual([3, 7]);
    expect([...travelReminderDays('whatever' as DeclaredDuration)]).toEqual([3, 7]);
  });
});

describe('travelReminderOccurrences', () => {
  const activatedAt = new Date('2026-06-01T12:00:00.000Z');
  const occurrencesFor = (duration: DeclaredDuration) =>
    travelReminderOccurrences(activatedAt, travelModeEndsAt(activatedAt, duration)!, duration).map((d) => (d.getTime() - activatedAt.getTime()) / DAY_MS);

  // "A few days" is day 3 and day 6, but the 6-day period ends exactly on day 6 and a
  // reminder at or after the end does not exist, so only day 3 can ever be due.
  it('6 days: day 3 only (day 6 lands exactly on the end)', () => {
    expect(occurrencesFor(DeclaredDuration.A_FEW_DAYS)).toEqual([3]);
  });

  it('13, 30 and 30 days: day 3 and day 7, earliest first', () => {
    expect(occurrencesFor(DeclaredDuration.ONE_TO_TWO_WEEKS)).toEqual([3, 7]);
    expect(occurrencesFor(DeclaredDuration.MORE_THAN_TWO_WEEKS)).toEqual([3, 7]);
    expect(occurrencesFor(DeclaredDuration.NOT_SURE)).toEqual([3, 7]);
  });

  it('only times strictly before the end exist: a reminder exactly at the end does not', () => {
    const at = (days: number, offsetMs = 0) => new Date(activatedAt.getTime() + days * DAY_MS + offsetMs);
    const n = DeclaredDuration.NOT_SURE;
    expect(travelReminderOccurrences(activatedAt, at(7, 1), n).map((d) => d.getTime())).toEqual([at(3).getTime(), at(7).getTime()]);
    expect(travelReminderOccurrences(activatedAt, at(7), n).map((d) => d.getTime())).toEqual([at(3).getTime()]);
    expect(travelReminderOccurrences(activatedAt, at(3, 1), n).map((d) => d.getTime())).toEqual([at(3).getTime()]);
    expect(travelReminderOccurrences(activatedAt, at(3), n)).toEqual([]);
    // "A few days" keeps day 6 only when the period is longer than 6 days.
    const f = DeclaredDuration.A_FEW_DAYS;
    expect(travelReminderOccurrences(activatedAt, at(6, 1), f).map((d) => d.getTime())).toEqual([at(3).getTime(), at(6).getTime()]);
    expect(travelReminderOccurrences(activatedAt, at(6), f).map((d) => d.getTime())).toEqual([at(3).getTime()]);
  });

  it('is exactly the approved reminder days and never mutates its inputs', () => {
    const endsAt = new Date(activatedAt.getTime() + 30 * DAY_MS);
    const before = [activatedAt.getTime(), endsAt.getTime()];
    expect(travelReminderOccurrences(activatedAt, endsAt, DeclaredDuration.MORE_THAN_TWO_WEEKS)).toHaveLength(2);
    expect([activatedAt.getTime(), endsAt.getTime()]).toEqual(before);
  });
});
