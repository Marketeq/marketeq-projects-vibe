import { FindOperator, IsNull, LessThan, Or } from 'typeorm';
import { IdentityVerificationService } from './identity-verification.service';
import { DeclaredDuration, TravelClassification } from '../entities/enums/identity-verification.enums';

/**
 * claimTravelReminder: one atomic compare-and-set on lastTravelReminderSentAt.
 * The repository is a small stateful fake whose update evaluates the real
 * TypeORM operators (IsNull, LessThan, Or) the way the database would.
 */
describe('IdentityVerificationService — claimTravelReminder', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const at = (days: number, offsetMs = 0) => new Date(ACTIVATED.getTime() + days * DAY + offsetMs);
  type Row = Record<string, any>;

  let row: Row | null;
  let update: jest.Mock;
  let events: { publish: jest.Mock };
  let service: IdentityVerificationService;
  let now: number;

  const evaluate = (actual: any, expected: any): boolean => {
    if (expected instanceof FindOperator) {
      switch (expected.type) {
        case 'isNull':
          return actual === null || actual === undefined;
        case 'lessThan':
          return actual !== null && actual !== undefined && actual < (expected.value as any);
        case 'or':
          return (expected.value as unknown as FindOperator<any>[]).some((child) => evaluate(actual, child));
        default:
          throw new Error(`unsupported operator ${expected.type}`);
      }
    }
    if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
    return actual === expected;
  };
  const matches = (criteria: Row) => row !== null && Object.entries(criteria).every(([key, expected]) => evaluate(row![key], expected));

  const build = (initial: Row | null, clockMs: Date) => {
    row = initial;
    now = clockMs.getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    update = jest.fn(async (criteria: Row, data: Row) => {
      if (!matches(criteria)) return { affected: 0 };
      Object.assign(row!, data);
      return { affected: 1 };
    });
    const profileRepository = {
      findOne: jest.fn(async () => (row ? { ...row } : null)), // a new object per read, like the real repository
      create: jest.fn(),
      save: jest.fn(),
      update,
    };
    events = { publish: jest.fn() };
    service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, events as any,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    return { profileRepository };
  };

  // A profile whose Travel Mode started at ACTIVATED (13 days by default).
  const profile = (over: Row = {}): Row => ({
    id: 'p1',
    userId: 'u1',
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: ACTIVATED,
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: at(3),
    ...over,
  });
  const six = { declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(3) };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('nothing to claim returns { claimed: false }', () => {
    it('no profile at all: false, nothing created or written', async () => {
      const { profileRepository } = build(null, at(3));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(update).not.toHaveBeenCalled();
      expect(profileRepository.create).not.toHaveBeenCalled();
      expect(profileRepository.save).not.toHaveBeenCalled();
    });

    it.each([
      ['inactive (raw flag off)', profile({ travelModeActive: false })],
      ['pending (classified, never activated)', profile({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null })],
      ['no travel data at all', profile({ travelClassification: null, travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null })],
    ])('%s: false and nothing written', async (_label, initial) => {
      build(initial, at(3));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['no activation time', { travelModeActivatedAt: null }],
      ['no duration', { declaredDuration: null }],
      ['an unknown duration', { declaredDuration: 'forever' }],
    ])('invalid raw-active data (%s): the existing fail-safe runs and the answer is false', async (_label, over) => {
      build(profile(over), at(3));

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0][1]).toEqual({ travelModeActive: false, nextTravelReminderAt: null }); // the fail-safe only
      expect(row!.travelModeActive).toBe(false);
      expect(row!.lastTravelReminderSentAt).toBeNull(); // nothing claimed
    });

    it('an expired period: expiry is persisted first and the answer is false', async () => {
      build(profile(), at(13));

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });

      expect(row!.travelModeActive).toBe(false);
      expect(row!.lastTravelReminderSentAt).toBeNull();
      expect(update.mock.calls.every(([, data]) => !('lastTravelReminderSentAt' in data))).toBe(true);
    });
  });

  describe('day 3 boundary', () => {
    it('1 ms before day 3: false and nothing written', async () => {
      build(profile(), at(3, -1));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(update).not.toHaveBeenCalled();
    });
    it('exactly at day 3: true', async () => {
      build(profile(), at(3));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(row!.lastTravelReminderSentAt).toEqual(at(3));
    });
    it('1 ms after day 3: true', async () => {
      build(profile(), at(3, 1));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
    });
  });

  describe('day 7 exists only for the 13-day and 30-day durations', () => {
    it.each([
      [DeclaredDuration.ONE_TO_TWO_WEEKS],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS],
      [DeclaredDuration.NOT_SURE],
    ])('%s: day 7 is claimable exactly at day 7 after day 3 was claimed, not 1 ms before', async (duration) => {
      build(profile({ declaredDuration: duration, lastTravelReminderSentAt: at(3) }), at(7, -1));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });

      build(profile({ declaredDuration: duration, lastTravelReminderSentAt: at(3) }), at(7));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(row!.lastTravelReminderSentAt).toEqual(at(7));
    });

    it('the 6-day duration has day 3 only: after claiming it nothing more is ever claimable', async () => {
      build(profile(six), at(3));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });

      for (const day of [4, 5]) {
        jest.spyOn(Date, 'now').mockReturnValue(at(day).getTime());
        await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      }
      jest.spyOn(Date, 'now').mockReturnValue(at(7).getTime()); // would be day 7: the period is over
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
    });
  });

  describe('exact expiry', () => {
    it('1 ms before the end an unclaimed reminder is still claimable', async () => {
      build(profile(six), at(6, -1));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
    });
    it('exactly at the end nothing is claimable, even though day 3 was never claimed', async () => {
      build(profile(six), at(6));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(row!.lastTravelReminderSentAt).toBeNull();
    });
  });

  describe('catch-up for a missed reminder', () => {
    it('day 5: the missed day-3 reminder is claimed; day 7 is claimed separately later', async () => {
      build(profile(), at(5));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(row!.lastTravelReminderSentAt).toEqual(at(5));

      jest.spyOn(Date, 'now').mockReturnValue(at(6).getTime());
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });

      jest.spyOn(Date, 'now').mockReturnValue(at(7).getTime());
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(row!.lastTravelReminderSentAt).toEqual(at(7));
    });

    it('the first login after day 7: one claim consumes both occurrences', async () => {
      build(profile(), at(9));

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(row!.lastTravelReminderSentAt).toEqual(at(9));

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false }); // nothing is left
      expect(update).toHaveBeenCalledTimes(1);
    });
  });

  describe('duplicate and concurrent claims', () => {
    it('a duplicate claim is false and writes nothing more', async () => {
      build(profile(), at(3));
      expect(await service.claimTravelReminder('u1')).toEqual({ claimed: true });
      expect(await service.claimTravelReminder('u1')).toEqual({ claimed: false });
      expect(update).toHaveBeenCalledTimes(1);
    });

    it('two simultaneous claims: exactly one true and one false', async () => {
      build(profile(), at(3));

      const results = await Promise.all([service.claimTravelReminder('u1'), service.claimTravelReminder('u1')]);

      expect(results.map((r) => r.claimed).sort()).toEqual([false, true]);
      expect(update).toHaveBeenCalledTimes(2); // both tried; only one matched
      expect(row!.lastTravelReminderSentAt).toEqual(at(3));
    });

    it('many simultaneous claims still produce a single winner', async () => {
      build(profile(), at(9));
      const results = await Promise.all(Array.from({ length: 6 }, () => service.claimTravelReminder('u1')));
      expect(results.filter((r) => r.claimed)).toHaveLength(1);
    });
  });

  describe('the activation changing during a claim', () => {
    it('a claim against an older activation never consumes a newer activation’s reminder', async () => {
      build(profile(), at(3));
      // After this claim read the row, another request starts a NEW activation.
      const newer = { travelModeActivatedAt: at(3, 1000), declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS, lastTravelReminderSentAt: null, nextTravelReminderAt: at(6, 1000) };
      update.mockImplementationOnce(async (criteria: Row) => {
        Object.assign(row!, newer);
        return matches(criteria) ? { affected: 1 } : { affected: 0 };
      });

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });

      expect(row!.lastTravelReminderSentAt).toBeNull(); // the new activation's day-3 reminder is untouched
      expect(row!.travelModeActivatedAt).toEqual(at(3, 1000));
    });

    it('an expiry between the read and the write also makes the claim lose', async () => {
      build(profile(six), at(5));
      update.mockImplementationOnce(async (criteria: Row) => {
        Object.assign(row!, { travelModeActive: false, nextTravelReminderAt: null });
        return matches(criteria) ? { affected: 1 } : { affected: 0 };
      });

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(row!.lastTravelReminderSentAt).toBeNull();
    });
  });

  describe('stored claim timestamps fail closed', () => {
    it('a future stored claim time claims nothing and writes nothing', async () => {
      build(profile({ lastTravelReminderSentAt: at(40) }), at(9));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(update).not.toHaveBeenCalled();
      expect(row!.lastTravelReminderSentAt).toEqual(at(40));
    });

    it('even if the database sees a future claim time first, the compare-and-set refuses', async () => {
      build(profile(), at(9));
      // Another writer stores a time at or after the latest due occurrence between read and write.
      update.mockImplementationOnce(async (criteria: Row) => {
        row!.lastTravelReminderSentAt = at(9, 5);
        return matches(criteria) ? { affected: 1 } : { affected: 0 };
      });

      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(row!.lastTravelReminderSentAt).toEqual(at(9, 5));
    });

    it.each([
      ['a string', '2026-06-04T09:00:00.000Z'],
      ['an invalid date', new Date('not a date')],
    ])('an unusable stored claim time (%s) claims nothing', async (_label, stored) => {
      build(profile({ lastTravelReminderSentAt: stored }), at(9));
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: false });
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('exactly what is written', () => {
    it('the compare-and-set matches the profile, active flag, observed activation time and duration, and the claim time condition', async () => {
      build(profile(), at(9));

      await service.claimTravelReminder('u1');

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(
        {
          id: 'p1',
          travelModeActive: true,
          travelModeActivatedAt: ACTIVATED,
          declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
          lastTravelReminderSentAt: Or(IsNull(), LessThan(at(7))), // the latest due occurrence
        },
        { lastTravelReminderSentAt: new Date(at(9).getTime()) },
      );
    });

    it('only lastTravelReminderSentAt changes: no cursor, no flag, nothing else', async () => {
      build(profile(), at(9));
      const before = JSON.parse(JSON.stringify(row));

      await service.claimTravelReminder('u1');

      expect(Object.keys(update.mock.calls[0][1])).toEqual(['lastTravelReminderSentAt']);
      const after = JSON.parse(JSON.stringify(row));
      const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
      expect(changed).toEqual(['lastTravelReminderSentAt']);
      expect(row!.nextTravelReminderAt).toEqual(at(3)); // the job’s cursor is untouched
    });

    it('publishes no event', async () => {
      build(profile(), at(9));
      await service.claimTravelReminder('u1');
      await service.claimTravelReminder('u1');
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('the claim time is the server clock at the claim', async () => {
      build(profile(), at(4, 12345));
      await service.claimTravelReminder('u1');
      expect(row!.lastTravelReminderSentAt).toEqual(at(4, 12345));
    });
  });
});
