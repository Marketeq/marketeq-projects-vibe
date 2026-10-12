import { FindOperator } from 'typeorm';
import {
  DeclaredDuration,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';
import { DAY_MS } from './travel-mode-duration';
import { expireTravelModeIfDue } from './travel-mode-state';

describe('expireTravelModeIfDue (persisted lazy expiry)', () => {
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const ENDS_6 = ACTIVATED.getTime() + 6 * DAY_MS;
  const TRAVELING = TravelClassification.TEMPORARILY_TRAVELING;
  const LAST_SENT = new Date('2026-06-04T09:00:00.000Z');
  const NEXT = new Date('2026-06-08T12:00:00.000Z');

  const profileRow = (over: Record<string, unknown> = {}) =>
    ({
      id: 'p1',
      userId: 'u1',
      travelClassification: TRAVELING,
      travelModeActive: true,
      travelModeActivatedAt: ACTIVATED,
      declaredDuration: DeclaredDuration.A_FEW_DAYS,
      lastTravelReminderSentAt: LAST_SENT,
      nextTravelReminderAt: NEXT,
      ...over,
    }) as unknown as IdentityVerificationProfile;

  const build = (update = jest.fn().mockResolvedValue({ affected: 1 }), fresh: unknown = null) => {
    const repository = { update, findOne: jest.fn().mockResolvedValue(fresh) };
    const logger = { warn: jest.fn() };
    return { repository, logger, run: (p: IdentityVerificationProfile, now: number) => expireTravelModeIfDue(repository as any, p, now, logger) };
  };

  it('valid expiry updates exactly the flag and the reminder cursor, with a compare-and-set on the observed row', async () => {
    const { repository, run } = build();
    const profile = profileRow();

    const result = await run(profile, ENDS_6);

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'p1', travelModeActive: true, travelModeActivatedAt: ACTIVATED, declaredDuration: DeclaredDuration.A_FEW_DAYS },
      { travelModeActive: false, nextTravelReminderAt: null },
    );
    expect(Object.keys(repository.update.mock.calls[0][1]).sort()).toEqual(['nextTravelReminderAt', 'travelModeActive']);
    expect(result).toBe(profile);
    expect(result.travelModeActive).toBe(false);
    expect(result.nextTravelReminderAt).toBeNull();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('preserves the classification, duration, activation time and last reminder time', async () => {
    const { run } = build();
    const result = await run(profileRow(), ENDS_6);

    expect(result.travelClassification).toBe(TRAVELING);
    expect(result.declaredDuration).toBe(DeclaredDuration.A_FEW_DAYS);
    expect(result.travelModeActivatedAt).toBe(ACTIVATED);
    expect(result.lastTravelReminderSentAt).toBe(LAST_SENT);
  });

  it.each([
    [DeclaredDuration.A_FEW_DAYS, 6],
    [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
    [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
    [DeclaredDuration.NOT_SURE, 30],
  ])('%s: still active 1 ms before day %s, expired exactly at it', async (duration, days) => {
    const endsAt = ACTIVATED.getTime() + days * DAY_MS;

    const before = build();
    const stillActive = await before.run(profileRow({ declaredDuration: duration }), endsAt - 1);
    expect(before.repository.update).not.toHaveBeenCalled();
    expect(before.repository.findOne).not.toHaveBeenCalled();
    expect(stillActive.travelModeActive).toBe(true);

    const at = build();
    const ended = await at.run(profileRow({ declaredDuration: duration }), endsAt);
    expect(at.repository.update).toHaveBeenCalledTimes(1);
    expect(ended.travelModeActive).toBe(false);
  });

  describe('invalid raw-active data: fail safe', () => {
    it.each([
      ['no activation time', { travelModeActivatedAt: null }],
      ['an invalid activation date', { travelModeActivatedAt: new Date('not a date') }],
      ['no duration', { declaredDuration: null }],
      ['an unknown duration', { declaredDuration: 'forever' }],
      ['neither', { travelModeActivatedAt: null, declaredDuration: null }],
    ])('with %s: only the flag and the cursor change, with a fixed reason and no identifier', async (_label, over) => {
      const { repository, logger, run } = build();
      const profile = profileRow(over);
      const before = { ...profile };

      const result = await run(profile, ENDS_6 - 5 * DAY_MS);

      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update.mock.calls[0][1]).toEqual({ travelModeActive: false, nextTravelReminderAt: null });
      expect(result.travelModeActive).toBe(false);
      expect(result.nextTravelReminderAt).toBeNull();
      expect(result.travelClassification).toBe(before.travelClassification);
      expect(result.declaredDuration).toEqual(before.declaredDuration);
      expect(result.travelModeActivatedAt).toEqual(before.travelModeActivatedAt);
      expect(result.lastTravelReminderSentAt).toBe(LAST_SENT);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Travel Mode fail-safe: reason=invalid_travel_data');
      const logged = JSON.stringify(logger.warn.mock.calls);
      expect(logged).not.toContain('p1');
      expect(logged).not.toContain('u1');
    });

    it('matches observed null values with IS NULL, never with an equals-null', async () => {
      const { repository, run } = build();

      await run(profileRow({ travelModeActivatedAt: null, declaredDuration: null }), ENDS_6);

      const criteria = repository.update.mock.calls[0][0];
      expect(criteria).toMatchObject({ id: 'p1', travelModeActive: true });
      for (const key of ['travelModeActivatedAt', 'declaredDuration']) {
        expect(criteria[key]).toBeInstanceOf(FindOperator);
        expect((criteria[key] as FindOperator<unknown>).type).toBe('isNull');
      }
    });

    it('does not log when the fail-safe lost the compare-and-set', async () => {
      const { logger, run } = build(jest.fn().mockResolvedValue({ affected: 0 }), profileRow({ travelModeActive: false }));

      await run(profileRow({ declaredDuration: null }), ENDS_6);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('a lost compare-and-set', () => {
    it('reloads and returns the fresh row without overwriting the winner or the caller’s copy', async () => {
      const winner = profileRow({ travelModeActivatedAt: new Date(ENDS_6 + 1000), declaredDuration: DeclaredDuration.NOT_SURE });
      const { repository, run } = build(jest.fn().mockResolvedValue({ affected: 0 }), winner);
      const stale = profileRow();

      const result = await run(stale, ENDS_6 + DAY_MS);

      expect(result).toBe(winner);
      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'p1' } });
      expect(stale.travelModeActive).toBe(true);
      expect(stale.nextTravelReminderAt).toBe(NEXT);
    });

    it('falls back to the caller’s row if the reload finds nothing', async () => {
      const { run } = build(jest.fn().mockResolvedValue({ affected: 0 }), null);
      const stale = profileRow();

      expect(await run(stale, ENDS_6 + DAY_MS)).toBe(stale);
    });
  });

  describe('nothing due: no update and no reload', () => {
    it.each([
      ['active Travel Mode', profileRow(), ENDS_6 - 1],
      ['the raw flag already false after an expired period', profileRow({ travelModeActive: false }), ENDS_6 + DAY_MS],
      ['a pending duration (classified, never activated)', profileRow({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }), ENDS_6],
      ['no travel data at all', profileRow({ travelModeActive: false, travelClassification: null, travelModeActivatedAt: null, declaredDuration: null }), ENDS_6],
      ['a profile cleared by a home-country confirmation', profileRow({ travelModeActive: false, travelClassification: null, travelModeActivatedAt: null, declaredDuration: null, nextTravelReminderAt: null }), ENDS_6],
    ])('%s', async (_label, profile, now) => {
      const { repository, logger, run } = build();

      const result = await run(profile, now);

      expect(result).toBe(profile);
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  it('is idempotent: a second call after the expiry is a no-op', async () => {
    const { repository, run } = build();
    const profile = profileRow();

    await run(profile, ENDS_6);
    const again = await run(profile, ENDS_6 + DAY_MS);

    expect(again).toBe(profile);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('never logs for a valid expiry', async () => {
    const { logger, run } = build();
    await run(profileRow(), ENDS_6);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
