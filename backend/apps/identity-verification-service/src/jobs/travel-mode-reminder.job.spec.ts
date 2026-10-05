import { readFileSync } from 'fs';
import { join } from 'path';
import { FindOperator } from 'typeorm';
import { TravelModeReminderJob } from './travel-mode-reminder.job';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { DeclaredDuration, TravelClassification } from '../entities/enums/identity-verification.enums';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

describe('TravelModeReminderJob.runDailySweep', () => {
  const buildProfile = (id: string): IdentityVerificationProfile =>
    ({ id, userId: `user-${id}` }) as IdentityVerificationProfile;

  const buildJob = (profiles: IdentityVerificationProfile[]) => {
    const profileRepository = {
      find: jest.fn().mockResolvedValue(profiles),
      save: jest.fn(),
    };
    const events = { publish: jest.fn() };
    const job = new TravelModeReminderJob(profileRepository as any, events as any);
    const logger = { log: jest.fn(), error: jest.fn() };
    (job as any).logger = logger;
    return { job, profileRepository, events, logger };
  };

  it('processes every due profile when none fail', async () => {
    const profiles = [buildProfile('p1'), buildProfile('p2'), buildProfile('p3')];
    const { job, logger } = buildJob(profiles);
    const evaluateSpy = jest.spyOn(job as any, 'evaluateAndSendIfDue').mockResolvedValue(undefined);

    await job.runDailySweep();

    expect(evaluateSpy).toHaveBeenCalledTimes(3);
    expect(evaluateSpy).toHaveBeenNthCalledWith(1, profiles[0], expect.any(Date));
    expect(evaluateSpy).toHaveBeenNthCalledWith(2, profiles[1], expect.any(Date));
    expect(evaluateSpy).toHaveBeenNthCalledWith(3, profiles[2], expect.any(Date));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('continues to the second profile when the first fails', async () => {
    const profiles = [buildProfile('p1'), buildProfile('p2')];
    const { job } = buildJob(profiles);
    const evaluateSpy = jest
      .spyOn(job as any, 'evaluateAndSendIfDue')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    await job.runDailySweep();

    expect(evaluateSpy).toHaveBeenCalledTimes(2);
    expect(evaluateSpy).toHaveBeenNthCalledWith(2, profiles[1], expect.any(Date));
  });

  it('logs the failure with the profile id, without leaking the raw error', async () => {
    const profiles = [buildProfile('p1')];
    const { job, logger } = buildJob(profiles);
    const sensitiveError = new Error(
      'duplicate key value violates unique constraint "users_email_key" DETAIL: Key (email)=(secret@example.com) already exists',
    );
    jest.spyOn(job as any, 'evaluateAndSendIfDue').mockRejectedValue(sensitiveError);

    await job.runDailySweep();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [loggedMessage] = logger.error.mock.calls[0];
    expect(loggedMessage).toContain('p1');
    expect(loggedMessage).not.toContain('secret@example.com');
    expect(loggedMessage).not.toContain('boom');
    expect(loggedMessage).not.toContain(sensitiveError.message);
  });
});

describe('TravelModeReminderJob reminder schedule (day 3 and day 7)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const activatedAt = new Date('2026-06-01T12:00:00.000Z');
  const at = (days: number, offsetMs = 0) => new Date(activatedAt.getTime() + days * DAY_MS + offsetMs);

  const buildProfile = (overrides: Record<string, unknown> = {}): IdentityVerificationProfile =>
    ({
      id: 'p1',
      userId: 'u1',
      travelModeActive: true,
      travelModeActivatedAt: activatedAt,
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      lastTravelReminderSentAt: null,
      nextTravelReminderAt: at(3),
      ...overrides,
    }) as unknown as IdentityVerificationProfile;

  const buildJob = (update = jest.fn().mockResolvedValue({ affected: 1 })) => {
    const profileRepository = { find: jest.fn().mockResolvedValue([]), update };
    const events = { publish: jest.fn() };
    const job = new TravelModeReminderJob(profileRepository as any, events as any);
    const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    (job as any).logger = logger;
    const run = (profile: IdentityVerificationProfile, now: Date) =>
      (job as any).evaluateAndSendIfDue(profile, now) as Promise<void>;
    return { job, profileRepository, events, logger, run, update };
  };

  const cursorWrites = (update: jest.Mock) => update.mock.calls.map(([, data]) => data.nextTravelReminderAt);

  it('day 3 sends one reminder and moves the cursor to day 7 (13 days)', async () => {
    const { run, events, update } = buildJob();
    const profile = buildProfile();

    await run(profile, at(3));

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: IdentityVerificationEventType.TRAVEL_MODE_STILL_ACTIVE, profileId: 'p1', userId: 'u1' }),
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      { id: 'p1', travelModeActive: true, nextTravelReminderAt: at(3) },
      { nextTravelReminderAt: at(7) },
    );
  });

  it('day 3 moves the cursor to day 7 for the 30-day durations too', async () => {
    for (const duration of [DeclaredDuration.MORE_THAN_TWO_WEEKS, DeclaredDuration.NOT_SURE]) {
      const { run, update } = buildJob();
      await run(buildProfile({ declaredDuration: duration }), at(3));
      expect(cursorWrites(update)).toEqual([at(7)]);
    }
  });

  it('day 3 of the 6-day duration clears the cursor: there is no day 7', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ declaredDuration: DeclaredDuration.A_FEW_DAYS }), at(3));

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(cursorWrites(update)).toEqual([null]);
  });

  it('day 7 sends one reminder and clears the cursor', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ nextTravelReminderAt: at(7) }), at(7));

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(cursorWrites(update)).toEqual([null]);
  });

  it('never sends a day-7 reminder for the 6-day duration, even from a stale day-7 cursor', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(7) }), at(7));

    expect(events.publish).not.toHaveBeenCalled();
    expect(cursorWrites(update)).toEqual([null]);
  });

  it('sends nothing before day 3 and leaves the cursor alone', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile(), at(3, -1));

    expect(events.publish).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('a late day-3 run is still sent 1 ms before expiry, and nothing is sent exactly at expiry', async () => {
    const endsAt = at(6);
    const sixDay = { declaredDuration: DeclaredDuration.A_FEW_DAYS };

    const before = buildJob();
    await before.run(buildProfile(sixDay), new Date(endsAt.getTime() - 1));
    expect(before.events.publish).toHaveBeenCalledTimes(1);
    expect(cursorWrites(before.update)).toEqual([null]);

    const exactly = buildJob();
    await exactly.run(buildProfile(sixDay), endsAt);
    expect(exactly.events.publish).not.toHaveBeenCalled();
    expect(cursorWrites(exactly.update)).toEqual([null]);

    const after = buildJob();
    await after.run(buildProfile(sixDay), new Date(endsAt.getTime() + 1));
    expect(after.events.publish).not.toHaveBeenCalled();
    expect(cursorWrites(after.update)).toEqual([null]);
  });

  it('sends nothing at or after expiry for any duration', async () => {
    const expiries: Array<[DeclaredDuration, number]> = [
      [DeclaredDuration.A_FEW_DAYS, 6],
      [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
      [DeclaredDuration.NOT_SURE, 30],
    ];
    for (const [duration, days] of expiries) {
      const { run, events, update } = buildJob();
      await run(buildProfile({ declaredDuration: duration, nextTravelReminderAt: at(7) }), at(days));
      expect(events.publish).not.toHaveBeenCalled();
      expect(cursorWrites(update)).toEqual([null]);
    }
  });

  it('sends a single reminder when day 3 and day 7 are both overdue (e.g. after an outage)', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS }), at(8));

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(cursorWrites(update)).toEqual([null]);
  });

  it('does not send day 3 again when only day 7 is left', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ nextTravelReminderAt: at(7) }), at(9));

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(cursorWrites(update)).toEqual([null]);
  });

  it('does nothing when no reminder is left (cursor already null)', async () => {
    const { run, events, update } = buildJob();

    await run(buildProfile({ nextTravelReminderAt: null }), at(8));

    expect(events.publish).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('publishes nothing when another run already moved the cursor', async () => {
    const { run, events } = buildJob(jest.fn().mockResolvedValue({ affected: 0 }));

    await run(buildProfile(), at(3));

    expect(events.publish).not.toHaveBeenCalled();
  });

  it('two overlapping runs over the same profile publish exactly once', async () => {
    const update = jest.fn().mockResolvedValueOnce({ affected: 1 }).mockResolvedValue({ affected: 0 });
    const { run, events } = buildJob(update);

    await Promise.all([run(buildProfile(), at(3)), run(buildProfile(), at(3))]);

    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('a stale run cannot affect a profile that was re-activated or whose Travel Mode ended', async () => {
    const { run, update } = buildJob(jest.fn().mockResolvedValue({ affected: 0 }));

    await run(buildProfile(), at(3));

    // The compare-and-set is keyed on the cursor value this run read and on
    // Travel Mode still being active, so it matches nothing in either case.
    expect(update.mock.calls[0][0]).toEqual({ id: 'p1', travelModeActive: true, nextTravelReminderAt: at(3) });
  });

  it('clears the cursor with a fixed reason and no identifiers for missing or invalid travel data', async () => {
    const cases: Array<Record<string, unknown>> = [
      { travelModeActivatedAt: null },
      { travelModeActivatedAt: new Date('not a date') },
      { declaredDuration: null },
      { declaredDuration: 'forever' },
    ];
    for (const overrides of cases) {
      const { run, events, update, logger } = buildJob();

      await run(buildProfile(overrides), at(3));

      expect(events.publish).not.toHaveBeenCalled();
      expect(cursorWrites(update)).toEqual([null]);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Travel Mode reminder skipped: reason=invalid_travel_data');
      const logged = JSON.stringify([...logger.warn.mock.calls, ...logger.error.mock.calls, ...logger.log.mock.calls]);
      expect(logged).not.toContain('p1');
      expect(logged).not.toContain('u1');
    }
  });

  it('writes only nextTravelReminderAt: never lastTravelReminderSentAt, travelModeActive or any other field', async () => {
    const { run, update } = buildJob();

    await run(buildProfile(), at(3));
    await run(buildProfile({ nextTravelReminderAt: at(7) }), at(7));
    await run(buildProfile({ declaredDuration: DeclaredDuration.A_FEW_DAYS }), at(6));

    expect(update.mock.calls.length).toBeGreaterThan(0);
    for (const [, data] of update.mock.calls) {
      expect(Object.keys(data)).toEqual(['nextTravelReminderAt']);
    }
  });

  it('leaves lastTravelReminderSentAt and travelModeActive on the profile untouched', async () => {
    const { run } = buildJob();
    const profile = buildProfile();

    await run(profile, at(3));

    expect(profile.lastTravelReminderSentAt).toBeNull();
    expect(profile.travelModeActive).toBe(true);
  });

  it('the daily sweep still selects active profiles whose cursor is due', async () => {
    const { job, profileRepository } = buildJob();

    await job.runDailySweep();

    expect(profileRepository.find).toHaveBeenCalledWith({
      where: { travelModeActive: true, nextTravelReminderAt: expect.anything() },
    });
  });
});

describe('TravelModeReminderJob daily expiry backstop', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const activatedAt = new Date('2026-06-01T12:00:00.000Z');
  const at = (days: number, offsetMs = 0) => new Date(activatedAt.getTime() + days * DAY_MS + offsetMs);
  type Row = Record<string, any>;

  const row = (id: string, over: Row = {}): Row => ({
    id,
    userId: `user-${id}`,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: activatedAt,
    declaredDuration: DeclaredDuration.A_FEW_DAYS, // 6 days
    lastTravelReminderSentAt: new Date('2026-06-04T09:00:00.000Z'),
    nextTravelReminderAt: at(3),
    ...over,
  });

  // A small stateful repository: find honours the where-clause (including
  // LessThanOrEqual) and update is a real compare-and-set over the rows.
  const build = (rows: Row[]) => {
    const calls: string[] = [];
    const matchesValue = (actual: any, expected: any): boolean => {
      if (expected instanceof FindOperator) {
        if (expected.type === 'isNull') return actual === null || actual === undefined;
        if (expected.type === 'lessThanOrEqual') return actual !== null && actual <= (expected as any).value;
        throw new Error(`unsupported operator ${expected.type}`);
      }
      if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
      return actual === expected;
    };
    const select = (where: Row) => rows.filter((r) => Object.entries(where).every(([k, v]) => matchesValue(r[k], v)));
    const repository = {
      find: jest.fn(async ({ where }: { where: Row }) => {
        calls.push('nextTravelReminderAt' in where ? 'find:reminders' : 'find:expiry');
        return select(where).map((r) => ({ ...r }));
      }),
      update: jest.fn(async (criteria: Row, data: Row) => {
        calls.push(`update:${Object.keys(data).join('+')}`);
        const hit = select(criteria);
        hit.forEach((r) => Object.assign(r, data));
        return { affected: hit.length };
      }),
      findOne: jest.fn(async ({ where }: { where: Row }) => rows.find((r) => r.id === where.id) ?? null),
      save: jest.fn(),
    };
    const events = { publish: jest.fn(async () => { calls.push('publish'); }) };
    const job = new TravelModeReminderJob(repository as any, events as any);
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    (job as any).logger = logger;
    return { job, repository, events, logger, calls, rows };
  };

  const sweepAt = async (now: Date, job: TravelModeReminderJob) => {
    jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      await job.runDailySweep();
    } finally {
      jest.useRealTimers();
    }
  };

  const allLogged = (logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock }) =>
    JSON.stringify([...logger.log.mock.calls, ...logger.warn.mock.calls, ...logger.error.mock.calls]);

  it('runs the expiry pass before the reminder pass', async () => {
    const { job, calls } = build([row('p1')]);

    await sweepAt(at(3), job);

    expect(calls.indexOf('find:expiry')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('find:reminders')).toBeGreaterThan(calls.indexOf('find:expiry'));
  });

  it('deactivates an expired profile, changing only the flag and the cursor', async () => {
    const original = row('p1');
    const { job, rows, repository } = build([original]);

    await sweepAt(at(7), job); // the 6-day period ended a day ago

    expect(rows[0].travelModeActive).toBe(false);
    expect(rows[0].nextTravelReminderAt).toBeNull();
    expect(rows[0].travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
    expect(rows[0].declaredDuration).toBe(DeclaredDuration.A_FEW_DAYS);
    expect(rows[0].travelModeActivatedAt).toEqual(activatedAt);
    expect(rows[0].lastTravelReminderSentAt).toEqual(new Date('2026-06-04T09:00:00.000Z'));
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(Object.keys(repository.update.mock.calls[0][1]).sort()).toEqual(['nextTravelReminderAt', 'travelModeActive']);
  });

  it('an expired profile publishes no reminder, even though its reminder cursor was due', async () => {
    const { job, events, calls } = build([row('p1', { nextTravelReminderAt: at(3) })]);

    await sweepAt(at(7), job);

    expect(events.publish).not.toHaveBeenCalled();
    expect(calls).not.toContain('publish');
  });

  it('expires exactly at the boundary and not 1 ms before it', async () => {
    const endsAt = at(6);

    const exactly = build([row('p1')]);
    await sweepAt(endsAt, exactly.job);
    expect(exactly.rows[0].travelModeActive).toBe(false);
    expect(exactly.rows[0].nextTravelReminderAt).toBeNull();

    const before = build([row('p1')]);
    await sweepAt(new Date(endsAt.getTime() - 1), before.job);
    expect(before.rows[0].travelModeActive).toBe(true);
  });

  it.each([
    [DeclaredDuration.A_FEW_DAYS, 6],
    [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
    [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
    [DeclaredDuration.NOT_SURE, 30],
  ])('%s: still active 1 ms before day %s, expired exactly at it', async (duration, days) => {
    const before = build([row('p1', { declaredDuration: duration, nextTravelReminderAt: null })]);
    await sweepAt(at(days, -1), before.job);
    expect(before.rows[0].travelModeActive).toBe(true);

    const at_ = build([row('p1', { declaredDuration: duration, nextTravelReminderAt: null })]);
    await sweepAt(at(days), at_.job);
    expect(at_.rows[0].travelModeActive).toBe(false);
  });

  it('a profile whose reminder cursor is already null is still expired (the reminder pass would never see it)', async () => {
    const { job, rows } = build([row('p1', { declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, nextTravelReminderAt: null })]);

    await sweepAt(at(14), job);

    expect(rows[0].travelModeActive).toBe(false);
  });

  it('keeps an active profile before its boundary unchanged, and still sends its due reminder', async () => {
    const { job, rows, events } = build([row('p1', { declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS })]);

    await sweepAt(at(3), job);

    expect(rows[0].travelModeActive).toBe(true);
    expect(rows[0].travelModeActivatedAt).toEqual(activatedAt);
    expect(events.publish).toHaveBeenCalledTimes(1); // the existing day-3 reminder
    expect(rows[0].nextTravelReminderAt).toEqual(at(7));
  });

  describe('invalid raw-active data fails safe', () => {
    it.each([
      ['no activation time', { travelModeActivatedAt: null }],
      ['no duration', { declaredDuration: null }],
      ['neither', { travelModeActivatedAt: null, declaredDuration: null }],
    ])('with %s: deactivated, cursor cleared, other fields kept, fixed identifier-free log', async (_label, over) => {
      const original = row('p1', over);
      const { job, rows, logger, events } = build([original]);

      await sweepAt(at(2), job);

      expect(rows[0].travelModeActive).toBe(false);
      expect(rows[0].nextTravelReminderAt).toBeNull();
      expect(rows[0].travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
      expect(rows[0].lastTravelReminderSentAt).toEqual(new Date('2026-06-04T09:00:00.000Z'));
      expect(logger.warn).toHaveBeenCalledWith('Travel Mode fail-safe: reason=invalid_travel_data');
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  it('never selects an already inactive profile and never writes to it', async () => {
    const inactive = row('p1', { travelModeActive: false, nextTravelReminderAt: null });
    const { job, repository, rows } = build([inactive]);

    await sweepAt(at(30), job);

    expect(repository.find).toHaveBeenCalledWith({ where: { travelModeActive: true } });
    expect(repository.update).not.toHaveBeenCalled();
    expect(rows[0]).toEqual(inactive);
  });

  describe('failure isolation: a failed expiry pass skips the reminder pass', () => {
    it('one profile failing does not stop the other profiles from being expired', async () => {
      const { job, rows, repository } = build([row('p1'), row('p2'), row('p3')]);
      repository.update.mockRejectedValueOnce(new Error('boom'));

      await expect(sweepAt(at(7), job)).resolves.toBeUndefined(); // the cron process is never failed

      expect(rows.filter((r) => r.travelModeActive === false).map((r) => r.id)).toEqual(['p2', 'p3']);
    });

    it('one profile failing expiry skips the reminder pass entirely: nothing is queried or published', async () => {
      // p1's expiry fails and leaves it raw-active with a due reminder; p2 is a
      // healthy active profile that is also due a day-3 reminder.
      const { job, repository, events, calls, rows } = build([
        row('p1', { declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(3) }),
        row('p2', { declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS, nextTravelReminderAt: at(3) }),
      ]);
      repository.update.mockRejectedValueOnce(new Error('boom'));

      await sweepAt(at(7), job);

      expect(events.publish).not.toHaveBeenCalled();
      expect(calls).not.toContain('find:reminders');
      expect(rows[0].travelModeActive).toBe(true); // the profile that failed to expire stays untouched
      expect(rows[0].nextTravelReminderAt).toEqual(at(3));
    });

    it('a failure of the whole expiry query publishes no reminder and never runs the reminder query', async () => {
      const { job, repository, events, logger } = build([row('p1', { declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS })]);
      repository.find.mockRejectedValueOnce(new Error('db down'));

      await expect(sweepAt(at(3), job)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Travel Mode expiry sweep failed.');
      expect(repository.find).toHaveBeenCalledTimes(1); // only the failed expiry query
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('an expired profile whose deactivation failed never receives a reminder', async () => {
      const { job, repository, events } = build([row('p1', { declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(3) })]);
      repository.update.mockRejectedValue(new Error('boom'));

      await sweepAt(at(7), job);

      expect(events.publish).not.toHaveBeenCalled();
    });

    it('the failure is contained and logged with counts only', async () => {
      const { job, repository, logger } = build([row('p1'), row('p2')]);
      repository.update.mockRejectedValue(new Error('boom: user-p1'));

      await sweepAt(at(7), job);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Travel Mode expiry failed for 2 profile(s).');
      const logged = allLogged(logger);
      for (const leak of ['p1', 'p2', 'user-', 'boom']) expect(logged).not.toContain(leak);
    });
  });

  describe('a fully successful expiry pass leaves the reminder behavior unchanged', () => {
    it('still sends the day-3 reminder and moves the cursor to day 7', async () => {
      const { job, events, rows, calls } = build([row('p1', { declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS })]);

      await sweepAt(at(3), job);

      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(rows[0].nextTravelReminderAt).toEqual(at(7));
      expect(calls.indexOf('find:reminders')).toBeGreaterThan(calls.indexOf('find:expiry'));
    });

    it('still sends the day-7 reminder (13 days) and clears the cursor', async () => {
      const { job, events, rows } = build([
        row('p1', { declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, nextTravelReminderAt: at(7) }),
      ]);

      await sweepAt(at(7), job);

      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(rows[0].travelModeActive).toBe(true);
      expect(rows[0].nextTravelReminderAt).toBeNull();
    });

    it('never sends a day-7 reminder for the 6-day duration', async () => {
      const { job, events } = build([row('p1', { declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(7) })]);

      await sweepAt(at(7), job);

      expect(events.publish).not.toHaveBeenCalled();
    });

    it('an expired profile is deactivated and publishes nothing while a healthy neighbour still gets its reminder', async () => {
      const { job, events, rows } = build([
        row('p1', { declaredDuration: DeclaredDuration.A_FEW_DAYS, nextTravelReminderAt: at(3) }), // ended a day ago
        row('p2', { declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS, nextTravelReminderAt: at(3) }),
      ]);

      await sweepAt(at(7), job);

      expect(rows[0].travelModeActive).toBe(false);
      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p2' }));
    });
  });

  it('adds no identifier, id or stored value to any log it writes', async () => {
    const { job, repository, logger } = build([row('p1'), row('p2', { declaredDuration: null }), row('p3', { travelModeActivatedAt: null })]);
    repository.update.mockRejectedValueOnce(new Error('boom: user-p1 secret@example.com'));

    await sweepAt(at(7), job);

    const logged = allLogged(logger);
    for (const leak of ['p1', 'p2', 'p3', 'user-', 'secret@example.com', 'boom', '2026-06']) {
      expect(logged).not.toContain(leak);
    }
    expect(logger.log).toHaveBeenCalledWith('Travel Mode expiry sweep: 3 active profile(s) checked.');
    expect(logger.error).toHaveBeenCalledWith('Travel Mode expiry failed for 1 profile(s).');
  });

  describe('what must stay unchanged', () => {
    const source = readFileSync(join(__dirname, 'travel-mode-reminder.job.ts'), 'utf8');

    it('keeps the single existing daily 09:00 schedule', () => {
      expect(source.match(/@Cron\(/g)).toHaveLength(1);
      expect(source).toContain('@Cron(CronExpression.EVERY_DAY_AT_9AM)\n  async runDailySweep()');
    });

    it('keeps the two reminder hooks and the existing event type', () => {
      const job = new TravelModeReminderJob({} as any, {} as any);
      expect(typeof job.onFreshLogin).toBe('function');
      expect(typeof job.onDetectedCountryChanged).toBe('function');
      expect(source).toContain('IdentityVerificationEventType.TRAVEL_MODE_STILL_ACTIVE');
    });

    it('the expiry pass writes nothing itself: it only calls the shared helper', () => {
      const pass = source.slice(source.indexOf('private async expireEndedTravelModes'), source.indexOf('async onFreshLogin'));
      expect(pass).toContain('expireTravelModeIfDue(');
      expect(pass).not.toMatch(/\.update\(|\.save\(/);
    });
  });
});
