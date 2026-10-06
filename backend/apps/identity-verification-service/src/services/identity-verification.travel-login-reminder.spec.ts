import { FindOperator } from 'typeorm';
import { IdentityVerificationService } from './identity-verification.service';
import { DeclaredDuration, TravelClassification } from '../entities/enums/identity-verification.enums';
import { LoginSession } from '../common/travel-mode/login-reminder';
import { deriveTravelReminderSchedule } from '../common/travel-mode/travel-mode-state';

/**
 * The login-session reminder ("5 minutes after authentication") claimed together with, but
 * separately from, the day 3 / day 7 reminders.
 *
 * The fakes below are small and stateful on purpose: the claims table enforces the unique
 * (profile, session) row the way Postgres does (ON CONFLICT DO NOTHING returns no row), the
 * per-profile advisory lock really serializes concurrent claimers until commit or rollback,
 * rollback really removes rows inserted in the transaction, and the profile update is the same
 * real-operator compare-and-set the day claim has always used.
 */
describe('IdentityVerificationService — login-session Travel Mode reminder', () => {
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z'); // 13 days unless a test says otherwise
  const at = (days: number, offsetMs = 0) => new Date(ACTIVATED.getTime() + days * DAY + offsetMs);
  type Row = Record<string, any>;
  type ClaimRow = { profile_id: string; session_id: string };

  let row: Row;
  let claimRows: ClaimRow[];
  let lockTail: Promise<void>;
  let failDayUpdateInTransaction: boolean;
  let profileUpdate: jest.Mock;
  let dataSourceQuery: jest.Mock;
  let createQueryRunner: jest.Mock;
  let events: { publish: jest.Mock };
  let service: IdentityVerificationService;

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
  const matches = (criteria: Row) => Object.entries(criteria).every(([key, expected]) => evaluate(row[key], expected));

  const sessionQueryRunner = () => {
    let releaseLock: (() => void) | null = null;
    let inserted: ClaimRow[] = [];
    const unlock = () => {
      if (releaseLock) {
        releaseLock();
        releaseLock = null;
      }
    };
    return {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      query: jest.fn(async (sql: string, params: any[]) => {
        if (/pg_advisory_xact_lock/.test(sql)) {
          const previous = lockTail;
          let next!: () => void;
          lockTail = new Promise<void>((resolve) => (next = resolve));
          await previous; // blocks until every earlier holder commits or rolls back
          releaseLock = next;
          return [{}];
        }
        if (/INSERT INTO identity_verification\.travel_login_reminder_claims/.test(sql)) {
          expect(sql).toMatch(/ON CONFLICT \(profile_id, session_id\) DO NOTHING/);
          const [profileId, sessionId] = params;
          if (claimRows.some((r) => r.profile_id === profileId && r.session_id === sessionId)) return [];
          const created = { profile_id: profileId, session_id: sessionId };
          claimRows.push(created);
          inserted.push(created);
          return [{ id: `claim-${claimRows.length}` }];
        }
        throw new Error(`unexpected SQL in a claim transaction: ${sql}`);
      }),
      manager: {
        getRepository: () => ({
          update: jest.fn(async (criteria: Row, data: Row) => {
            if (failDayUpdateInTransaction) throw new Error('boom');
            return profileUpdate(criteria, data);
          }),
        }),
      },
      commitTransaction: jest.fn(async () => {
        inserted = [];
        unlock();
      }),
      rollbackTransaction: jest.fn(async () => {
        claimRows = claimRows.filter((r) => !inserted.includes(r));
        inserted = [];
        unlock();
      }),
      release: jest.fn(async () => unlock()),
    };
  };

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

  const build = (initial: Row = profile()) => {
    row = initial;
    claimRows = [];
    lockTail = Promise.resolve();
    failDayUpdateInTransaction = false;
    profileUpdate = jest.fn(async (criteria: Row, data: Row) => {
      if (!matches(criteria)) return { affected: 0 };
      Object.assign(row, data);
      return { affected: 1 };
    });
    dataSourceQuery = jest.fn(async (sql: string, params: any[]) => {
      expect(sql).toMatch(/^\s*SELECT 1 FROM identity_verification\.travel_login_reminder_claims/);
      return claimRows.some((r) => r.profile_id === params[0] && r.session_id === params[1]) ? [{ '?column?': 1 }] : [];
    });
    createQueryRunner = jest.fn(() => sessionQueryRunner());
    events = { publish: jest.fn() };
    const profileRepository = {
      findOne: jest.fn(async () => ({ ...row })), // a new object per read, like the real repository
      create: jest.fn(),
      save: jest.fn(),
      update: profileUpdate,
    };
    const dataSource = { query: dataSourceQuery, createQueryRunner };
    service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, dataSource as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, events as any,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  };

  const session = (sid: string, loginAt: Date): LoginSession => ({ sid, authTimeMs: Math.floor(loginAt.getTime() / 1000) * 1000 });
  const claim = (s: LoginSession | null, nowMs: number) => {
    jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    return service.claimTravelReminder('u1', s);
  };
  const loginAt = at(1); // a login on day 1, with Travel Mode already active
  const dueMs = (s: LoginSession) => s.authTimeMs + 5 * MINUTE;

  afterEach(() => jest.restoreAllMocks());

  describe('exactly five minutes after authentication', () => {
    it('claims once it is due, records this session, and leaves the day cursor and everything else alone', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
      expect(claimRows).toEqual([{ profile_id: 'p1', session_id: 'sid-a' }]);
      expect(row.lastTravelReminderSentAt).toBeNull(); // day 3 / day 7 cursor untouched
      expect(row.nextTravelReminderAt).toEqual(at(3)); // the daily job's cursor untouched
      expect(profileUpdate).not.toHaveBeenCalled(); // no day reminder was due, so no day write at all
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('is not claimable one millisecond early, and takes no lock or transaction', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(claim(s, dueMs(s) - 1)).resolves.toEqual({ claimed: false });
      expect(claimRows).toHaveLength(0);
      expect(createQueryRunner).not.toHaveBeenCalled();
    });

    it('is claimable at any later time in the period (a late page load still gets it)', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(claim(s, dueMs(s) + DAY)).resolves.toEqual({ claimed: true });
    });
  });

  describe('each login session has its own reminder, claimed once', () => {
    it('a refresh or another tab of the same login can never claim it again', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
      for (const later of [MINUTE, 10 * MINUTE, DAY]) {
        await expect(claim(s, dueMs(s) + later)).resolves.toEqual({ claimed: false });
      }
      expect(claimRows).toHaveLength(1);
    });

    it('a genuinely new login (new sid) gets its own reminder, whatever the earlier one did', async () => {
      build();
      const a = session('sid-a', loginAt);
      const b = session('sid-b', at(1, 3 * 60 * MINUTE));
      await expect(claim(a, dueMs(a))).resolves.toEqual({ claimed: true });
      await expect(claim(b, dueMs(b))).resolves.toEqual({ claimed: true });
      await expect(claim(a, dueMs(b) + MINUTE)).resolves.toEqual({ claimed: false });
      await expect(claim(b, dueMs(b) + MINUTE)).resolves.toEqual({ claimed: false });
      expect(claimRows.map((r) => r.session_id).sort()).toEqual(['sid-a', 'sid-b']);
      expect(row.lastTravelReminderSentAt).toBeNull(); // the global cursor was never the mechanism
    });

    it('a claim by one session never swallows another session’s reminder (the global cursor cannot do this)', async () => {
      build();
      const a = session('sid-a', loginAt);
      const b = session('sid-b', at(1, 20 * MINUTE));
      // Session A's reminder is claimed long after B's login; B's own is still unclaimed and still due.
      await claim(a, dueMs(b) + 10 * MINUTE);
      await expect(claim(b, dueMs(b) + 10 * MINUTE)).resolves.toEqual({ claimed: true });
    });
  });

  describe('only when Travel Mode was active at authentication', () => {
    it('a login before the activation has no login reminder', async () => {
      build();
      const s = session('sid-a', new Date(ACTIVATED.getTime() - 60 * MINUTE));
      await expect(claim(s, ACTIVATED.getTime() + 10 * MINUTE)).resolves.toEqual({ claimed: false });
      expect(claimRows).toHaveLength(0);
      expect(createQueryRunner).not.toHaveBeenCalled();
    });

    it('a login in the same second as the activation counts', async () => {
      build(profile({ travelModeActivatedAt: new Date(ACTIVATED.getTime() + 500) }));
      const s = { sid: 'sid-a', authTimeMs: ACTIVATED.getTime() };
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
    });

    it('a re-activation after a login does not create a login reminder for that older login', async () => {
      build(profile({ travelModeActivatedAt: at(5) }));
      const s = session('sid-a', at(4)); // logged in before this period started
      await expect(claim(s, at(5, 10 * MINUTE).getTime())).resolves.toEqual({ claimed: false });
    });
  });

  describe('never after expiry', () => {
    it('claims nothing once the period has ended, even for a login during it', async () => {
      build();
      const s = session('sid-a', at(12));
      const end = ACTIVATED.getTime() + 13 * DAY;
      await expect(claim(s, end + MINUTE)).resolves.toEqual({ claimed: false });
      expect(claimRows).toHaveLength(0);
      expect(row.travelModeActive).toBe(false); // the existing lazy expiry still runs first
    });

    it('a reminder that would land at or after the end never exists', async () => {
      build(profile({ lastTravelReminderSentAt: at(8) })); // day 3 / day 7 already claimed: isolate the login rule
      const end = ACTIVATED.getTime() + 13 * DAY;
      const s = { sid: 'sid-a', authTimeMs: end - 3 * MINUTE };
      await expect(claim(s, end - 1000)).resolves.toEqual({ claimed: false });
      expect(claimRows).toHaveLength(0);
    });

    it('the 6-day option: a login on day 5 is reminded, a login in the last minutes is not', async () => {
      const sixDays = { declaredDuration: DeclaredDuration.A_FEW_DAYS, lastTravelReminderSentAt: at(4) }; // day 3 already claimed
      build(profile(sixDays));
      const early = session('sid-a', at(5));
      await expect(claim(early, dueMs(early))).resolves.toEqual({ claimed: true });
      build(profile(sixDays));
      const late = { sid: 'sid-b', authTimeMs: ACTIVATED.getTime() + 6 * DAY - 2 * MINUTE };
      await expect(claim(late, ACTIVATED.getTime() + 6 * DAY - 1000)).resolves.toEqual({ claimed: false });
    });
  });

  describe('a missing or unusable session means no login reminder, and nothing else changes', () => {
    it('without a session only day 3 / day 7 exist, through the original single compare-and-set', async () => {
      build();
      await expect(claim(null, at(1, 10 * MINUTE).getTime())).resolves.toEqual({ claimed: false });
      await expect(claim(null, at(3, MINUTE).getTime())).resolves.toEqual({ claimed: true });
      expect(row.lastTravelReminderSentAt).toEqual(at(3, MINUTE));
      expect(claimRows).toHaveLength(0);
      expect(createQueryRunner).not.toHaveBeenCalled(); // no transaction, no lock on the day-only path
    });

    it('the one-argument call (before this change) behaves exactly as it did', async () => {
      build();
      jest.spyOn(Date, 'now').mockReturnValue(at(3, MINUTE).getTime());
      await expect(service.claimTravelReminder('u1')).resolves.toEqual({ claimed: true });
      expect(createQueryRunner).not.toHaveBeenCalled();
    });
  });

  describe('overlap with a day reminder: one popup, both claimed safely', () => {
    const overlap = () => {
      // Logged in 10 minutes before day 3: the login reminder (day 3 − 5 min) and day 3 are both due at day 3 + 1 min.
      const s = { sid: 'sid-a', authTimeMs: at(3).getTime() - 10 * MINUTE };
      return { s, nowMs: at(3, MINUTE).getTime() };
    };

    it('one claim returns true once and consumes both, in one transaction', async () => {
      build();
      const { s, nowMs } = overlap();
      await expect(claim(s, nowMs)).resolves.toEqual({ claimed: true });
      expect(claimRows).toHaveLength(1);
      expect(row.lastTravelReminderSentAt).toEqual(new Date(nowMs));
      const runner = createQueryRunner.mock.results[0].value;
      expect(runner.startTransaction).toHaveBeenCalledTimes(1);
      expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(runner.rollbackTransaction).not.toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalledTimes(1);
    });

    it('nothing is left to show afterwards: neither tab nor refresh sees either reminder again', async () => {
      build();
      const { s, nowMs } = overlap();
      await claim(s, nowMs);
      await expect(claim(s, nowMs + MINUTE)).resolves.toEqual({ claimed: false });
      jest.spyOn(Date, 'now').mockReturnValue(nowMs + MINUTE);
      const remaining = await service.getLoginReminderAt(row as any, s, nowMs + MINUTE);
      expect(remaining).toBeNull();
      // GET /me now reports only the next day occurrence: day 7.
      expect(deriveTravelReminderSchedule(row as any, nowMs + MINUTE, remaining)).toEqual({ due: false, availableAt: at(7) });
    });

    it('the login reminder alone leaves day 3 to be claimed on its own later', async () => {
      build();
      const s = session('sid-a', at(1));
      await claim(s, dueMs(s)); // login reminder only
      await expect(claim(s, at(3, MINUTE).getTime())).resolves.toEqual({ claimed: true }); // then day 3, by itself
      expect(row.lastTravelReminderSentAt).toEqual(at(3, MINUTE));
      expect(claimRows).toHaveLength(1);
    });

    it('a day reminder due while this session’s login reminder was already claimed is still claimed', async () => {
      build();
      const s = session('sid-a', at(1));
      await claim(s, dueMs(s));
      jest.spyOn(Date, 'now').mockReturnValue(at(3, MINUTE).getTime());
      await expect(service.claimTravelReminder('u1', s)).resolves.toEqual({ claimed: true });
      expect(claimRows).toHaveLength(1);
    });
  });

  describe('simultaneous claimers (tabs, refreshes, retries)', () => {
    it('five tabs of one login: exactly one gets true, one row is written', async () => {
      build();
      const s = session('sid-a', loginAt);
      jest.spyOn(Date, 'now').mockReturnValue(dueMs(s) + MINUTE);
      const results = await Promise.all(Array.from({ length: 5 }, () => service.claimTravelReminder('u1', s)));
      expect(results.filter((r) => r.claimed)).toHaveLength(1);
      expect(claimRows).toHaveLength(1);
    });

    it('with a login and a day reminder both due, exactly one claimer gets both and nobody gets half', async () => {
      build();
      const s = { sid: 'sid-a', authTimeMs: at(3).getTime() - 10 * MINUTE };
      jest.spyOn(Date, 'now').mockReturnValue(at(3, MINUTE).getTime());
      const results = await Promise.all(Array.from({ length: 4 }, () => service.claimTravelReminder('u1', s)));
      expect(results.filter((r) => r.claimed)).toHaveLength(1);
      expect(claimRows).toHaveLength(1);
      expect(profileUpdate.mock.results.filter((r) => r.value && (r.value as any).then).length).toBeGreaterThan(0);
      const successfulDayWrites = (await Promise.all(profileUpdate.mock.results.map((r) => r.value))).filter(
        (r: any) => r.affected === 1 && r !== undefined,
      );
      expect(successfulDayWrites).toHaveLength(1); // the day cursor moved exactly once
      expect(row.lastTravelReminderSentAt).toEqual(at(3, MINUTE));
    });

    it('two different logins both due at once: each gets its own reminder, the day reminder is claimed once', async () => {
      build();
      const a = { sid: 'sid-a', authTimeMs: at(3).getTime() - 10 * MINUTE };
      const b = { sid: 'sid-b', authTimeMs: at(3).getTime() - 9 * MINUTE };
      jest.spyOn(Date, 'now').mockReturnValue(at(3, MINUTE).getTime());
      const results = await Promise.all([service.claimTravelReminder('u1', a), service.claimTravelReminder('u1', b)]);
      expect(results.map((r) => r.claimed)).toEqual([true, true]);
      expect(claimRows.map((r) => r.session_id).sort()).toEqual(['sid-a', 'sid-b']);
      const dayWrites = (await Promise.all(profileUpdate.mock.results.map((r) => r.value))).filter((r: any) => r.affected === 1);
      expect(dayWrites).toHaveLength(1);
    });
  });

  describe('a failure rolls the whole claim back', () => {
    it('an error in the day write removes the login claim and propagates; a retry then succeeds', async () => {
      build();
      const s = { sid: 'sid-a', authTimeMs: at(3).getTime() - 10 * MINUTE };
      const nowMs = at(3, MINUTE).getTime();
      failDayUpdateInTransaction = true;
      await expect(claim(s, nowMs)).rejects.toThrow('boom');
      expect(claimRows).toHaveLength(0); // the inserted row was rolled back
      const runner = createQueryRunner.mock.results[0].value;
      expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(runner.commitTransaction).not.toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalledTimes(1);

      failDayUpdateInTransaction = false;
      await expect(claim(s, nowMs)).resolves.toEqual({ claimed: true });
      expect(claimRows).toHaveLength(1);
    });
  });

  describe('getLoginReminderAt — what GET /me reports', () => {
    const profileEntity = () => ({ ...row }) as any;

    it('is the due time for an eligible, unclaimed session, using one read-only lookup', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(service.getLoginReminderAt(profileEntity(), s, dueMs(s) - MINUTE)).resolves.toEqual(new Date(dueMs(s)));
      expect(dataSourceQuery).toHaveBeenCalledTimes(1);
      expect(dataSourceQuery.mock.calls[0][1]).toEqual(['p1', 'sid-a']);
    });

    it('is null once this session’s reminder was claimed, but a new session still has its own', async () => {
      build();
      const a = session('sid-a', loginAt);
      const b = session('sid-b', at(1, 60 * MINUTE));
      await claim(a, dueMs(a));
      await expect(service.getLoginReminderAt(profileEntity(), a, dueMs(a) + MINUTE)).resolves.toBeNull();
      await expect(service.getLoginReminderAt(profileEntity(), b, dueMs(a) + MINUTE)).resolves.toEqual(new Date(dueMs(b)));
    });

    it('is null without a session, and does no lookup', async () => {
      build();
      await expect(service.getLoginReminderAt(profileEntity(), null, NOW())).resolves.toBeNull();
      expect(dataSourceQuery).not.toHaveBeenCalled();
    });

    it('is null, with no lookup, when Travel Mode was not active at login or is over', async () => {
      build();
      const beforeActivation = session('sid-a', new Date(ACTIVATED.getTime() - 60 * MINUTE));
      await expect(service.getLoginReminderAt(profileEntity(), beforeActivation, at(1).getTime())).resolves.toBeNull();
      const during = session('sid-b', at(12));
      await expect(service.getLoginReminderAt(profileEntity(), during, ACTIVATED.getTime() + 14 * DAY)).resolves.toBeNull();
      expect(dataSourceQuery).not.toHaveBeenCalled();
    });

    it('is null, never an error, when the lookup fails (the status response must keep working)', async () => {
      build();
      dataSourceQuery.mockRejectedValue(new Error('relation does not exist'));
      const s = session('sid-a', loginAt);
      await expect(service.getLoginReminderAt(profileEntity(), s, dueMs(s))).resolves.toBeNull();
      expect((service as any).logger.error).toHaveBeenCalledTimes(1);
      expect(String((service as any).logger.error.mock.calls[0][0])).not.toContain('sid-a');
    });
  });

  const NOW = () => at(1, 10 * MINUTE).getTime();
});
