import { TravelModeReminderJob } from './travel-mode-reminder.job';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { DeclaredDuration } from '../entities/enums/identity-verification.enums';
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
