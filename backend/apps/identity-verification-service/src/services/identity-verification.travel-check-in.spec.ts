import { FindOperator } from 'typeorm';
import { IdentityVerificationService } from './identity-verification.service';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import {
  HomeCountryChangeInProgressException,
  TravelCheckInAlreadyAnsweredException,
  TravelModeNotActiveException,
} from '../common/errors/domain-exceptions';
import { LoginSession } from '../common/travel-mode/login-reminder';
import { travelModeEndsAt } from '../common/travel-mode/travel-mode-duration';
import { deriveTravelReminderSchedule } from '../common/travel-mode/travel-mode-state';

/**
 * The periodic "Still traveling?" check-in (PMCM-641), backend side:
 *  - the answer (updateActiveTravelDuration): a saved duration restarts the schedule from the
 *    response time, "Not sure" is an answer, nothing but Travel Mode columns is written;
 *  - the first check-in (five minutes after login) is offered until it is answered, and not
 *    after; closing it is not an answer;
 *  - claiming stays single-winner, and a claim derived from a stale profile claims nothing.
 *
 * The fakes are small and stateful: the profile update is a real compare-and-set, the claims
 * table enforces the unique (profile, session) row, and rollback really removes inserted rows.
 */
describe('IdentityVerificationService — periodic "Still traveling?" check-in', () => {
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z'); // 13 days unless a test says otherwise
  const at = (days: number, offsetMs = 0) => new Date(ACTIVATED.getTime() + days * DAY + offsetMs);
  type Row = Record<string, any>;
  type ClaimRow = { profile_id: string; session_id: string };

  let row: Row;
  let snapshots: Row[]; // reads served instead of the live row, oldest first (a stale read)
  let claimRows: ClaimRow[];
  let profileUpdate: jest.Mock;
  let createQueryRunner: jest.Mock;
  let rollbacks: number;
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
    let inserted: ClaimRow[] = [];
    return {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      query: jest.fn(async (sql: string, params: any[]) => {
        if (/pg_advisory_xact_lock/.test(sql)) return [{}];
        if (/FOR SHARE/.test(sql) && /identity_verification_profiles/.test(sql)) {
          return [
            {
              travel_mode_active: row.travelModeActive,
              travel_mode_activated_at: row.travelModeActivatedAt,
              travel_check_in_count: row.travelCheckInCount ?? 0,
            },
          ];
        }
        if (/INSERT INTO identity_verification\.travel_login_reminder_claims/.test(sql)) {
          const [profileId, sessionId] = params;
          if (claimRows.some((r) => r.profile_id === profileId && r.session_id === sessionId)) return [];
          const created = { profile_id: profileId, session_id: sessionId };
          claimRows.push(created);
          inserted.push(created);
          return [{ id: `claim-${claimRows.length}` }];
        }
        throw new Error(`unexpected SQL in a claim transaction: ${sql}`);
      }),
      manager: { getRepository: () => ({ update: profileUpdate }) },
      commitTransaction: jest.fn(async () => {
        inserted = [];
      }),
      rollbackTransaction: jest.fn(async () => {
        rollbacks += 1;
        claimRows = claimRows.filter((r) => !inserted.includes(r));
        inserted = [];
      }),
      release: jest.fn(async () => undefined),
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
    travelCheckInCount: 0,
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    verifiedHomeCountry: 'US',
    pendingHomeCountry: null,
    pendingHomeCountryConfirmedAt: null,
    pendingRelocationSessionId: null,
    ...over,
  });

  const build = (initial: Row | null = profile()) => {
    row = initial as Row;
    snapshots = [];
    claimRows = [];
    rollbacks = 0;
    profileUpdate = jest.fn(async (criteria: Row, data: Row) => {
      if (!row || !matches(criteria)) return { affected: 0 };
      Object.assign(row, data);
      return { affected: 1 };
    });
    createQueryRunner = jest.fn(() => sessionQueryRunner());
    const dataSource = {
      query: jest.fn(async (_sql: string, params: any[]) =>
        claimRows.some((r) => r.profile_id === params[0] && r.session_id === params[1]) ? [{ '?column?': 1 }] : [],
      ),
      createQueryRunner,
    };
    events = { publish: jest.fn() };
    const profileRepository = {
      findOne: jest.fn(async () => {
        const served = snapshots.shift() ?? row;
        return served ? { ...served } : null; // a new object per read, like the real repository
      }),
      create: jest.fn(),
      save: jest.fn(),
      update: profileUpdate,
    };
    service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, dataSource as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, events as any,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  };

  const setNow = (nowMs: number) => jest.spyOn(Date, 'now').mockReturnValue(nowMs);
  const answer = (nowMs: number, duration: DeclaredDuration) => {
    setNow(nowMs);
    return service.updateActiveTravelDuration('u1', duration);
  };
  const claim = (s: LoginSession | null, nowMs: number) => {
    setNow(nowMs);
    return service.claimTravelReminder('u1', s);
  };
  const reject = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as any;
    }
    return null;
  };
  const session = (sid: string, loginAt: Date): LoginSession => ({ sid, authTimeMs: Math.floor(loginAt.getTime() / 1000) * 1000 });
  const dueMs = (s: LoginSession) => s.authTimeMs + 5 * MINUTE;
  const loginAt = at(1); // a login on day 1, with Travel Mode already active

  afterEach(() => jest.restoreAllMocks());

  describe('answering a check-in saves a new duration and restarts the schedule from the response time', () => {
    it.each([
      [DeclaredDuration.A_FEW_DAYS, 6],
      [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
      [DeclaredDuration.NOT_SURE, 30],
    ])('%s: the period starts at the response time and lasts %i days, the next reminder is day 3', async (duration, days) => {
      build();
      const responseMs = at(2, 3 * 60 * MINUTE).getTime();

      const saved = await answer(responseMs, duration);

      expect(row.declaredDuration).toBe(duration);
      expect(row.travelModeActivatedAt).toEqual(new Date(responseMs));
      expect(travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration)).toEqual(new Date(responseMs + days * DAY));
      expect(row.nextTravelReminderAt).toEqual(new Date(responseMs + 3 * DAY));
      expect(row.lastTravelReminderSentAt).toBeNull();
      expect(row.travelCheckInCount).toBe(1);
      expect(saved).toMatchObject({ declaredDuration: duration, travelCheckInCount: 1, travelModeActive: true });
    });

    it('"Not sure" is an answer like any other: it counts, and it sets the 30-day period', async () => {
      build();
      await answer(at(2).getTime(), DeclaredDuration.NOT_SURE);
      expect(row.travelCheckInCount).toBe(1);
      expect(row.declaredDuration).toBe(DeclaredDuration.NOT_SURE);
    });

    it('restarts from the response: the new period is NOT added to the old end', async () => {
      build(profile({ declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS })); // would have ended on day 30
      const responseMs = at(10).getTime();

      await answer(responseMs, DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration)).toEqual(new Date(responseMs + 13 * DAY));
    });

    it('a second and a third answer each count', async () => {
      build();
      await answer(at(4).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);
      await answer(at(9).getTime(), DeclaredDuration.NOT_SURE);
      await answer(at(14).getTime(), DeclaredDuration.A_FEW_DAYS);
      expect(row.travelCheckInCount).toBe(3);
      expect(row.travelModeActivatedAt).toEqual(at(14));
    });

    it('writes only Travel Mode columns, in one compare-and-set, and publishes nothing', async () => {
      build();
      await answer(at(2).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(profileUpdate).toHaveBeenCalledTimes(1);
      const [criteria, data] = profileUpdate.mock.calls[0];
      expect(Object.keys(data).sort()).toEqual(
        ['declaredDuration', 'lastTravelReminderSentAt', 'nextTravelReminderAt', 'travelCheckInCount', 'travelModeActivatedAt'].sort(),
      );
      expect(criteria).toMatchObject({
        id: 'p1',
        travelModeActive: true,
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelCheckInCount: 0,
      });
      expect(row).toMatchObject({
        identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        verifiedHomeCountry: 'US',
        pendingHomeCountry: null,
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
      });
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('the check-in days after an answer: 3 and 6 for "A few days", 3 and 7 for every other answer', () => {
    const claimAll = async (answeredAtMs: number, probes: number[]) => {
      const results: boolean[] = [];
      for (const probe of probes) results.push((await claim(null, answeredAtMs + probe)).claimed);
      return results;
    };

    it.each([DeclaredDuration.ONE_TO_TWO_WEEKS, DeclaredDuration.MORE_THAN_TWO_WEEKS, DeclaredDuration.NOT_SURE])(
      '%s: day 3 then day 7, each claimable once, counted from the answer',
      async (duration) => {
        build(profile({ lastTravelReminderSentAt: at(7), nextTravelReminderAt: null })); // the old period had claimed both
        const answeredMs = at(8).getTime();
        await answer(answeredMs, duration);

        const schedule = (nowMs: number) => deriveTravelReminderSchedule(row as any, nowMs);
        expect(schedule(answeredMs).due).toBe(false);
        expect(schedule(answeredMs).availableAt).toEqual(new Date(answeredMs + 3 * DAY));

        expect(await claimAll(answeredMs, [3 * DAY - 1, 3 * DAY, 3 * DAY + MINUTE])).toEqual([false, true, false]);
        expect(schedule(answeredMs + 4 * DAY).availableAt).toEqual(new Date(answeredMs + 7 * DAY));
        expect(await claimAll(answeredMs, [7 * DAY - 1, 7 * DAY, 8 * DAY])).toEqual([false, true, false]);
      },
    );

    it('"A few days": day 3 is claimable; day 6 is the end of the 6-day period, so nothing follows it', async () => {
      build();
      const answeredMs = at(2).getTime();
      await answer(answeredMs, DeclaredDuration.A_FEW_DAYS);

      expect(await claimAll(answeredMs, [3 * DAY])).toEqual([true]);
      // A reminder at or after the end does not exist (the rule that has always applied):
      // the day-6 occurrence coincides with expiry and can never be due.
      expect(deriveTravelReminderSchedule(row as any, answeredMs + 4 * DAY)).toEqual({ due: false, availableAt: null });
      expect(await claimAll(answeredMs, [6 * DAY - 1, 6 * DAY])).toEqual([false, false]);
    });
  });

  describe('the answer is refused unless Travel Mode is in force', () => {
    it('no profile', async () => {
      build(null);
      setNow(at(2).getTime());
      expect(await reject(service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE))).toBeInstanceOf(TravelModeNotActiveException);
    });

    it('never activated (pending)', async () => {
      build(profile({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null, nextTravelReminderAt: null }));
      const error = await reject(answer(at(2).getTime(), DeclaredDuration.NOT_SURE));
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(profileUpdate).not.toHaveBeenCalled();
    });

    it('the period ended: it is deactivated, nothing is restarted, and the count is untouched', async () => {
      build(profile({ travelCheckInCount: 2 })); // 13 days from ACTIVATED
      const error = await reject(answer(at(13).getTime(), DeclaredDuration.NOT_SURE));
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(error.getStatus()).toBe(409);
      expect(row).toMatchObject({ travelModeActive: false, travelCheckInCount: 2, travelModeActivatedAt: ACTIVATED });
    });

    it('1 ms before the end it is still accepted', async () => {
      build();
      await answer(at(13).getTime() - 1, DeclaredDuration.NOT_SURE);
      expect(row.travelCheckInCount).toBe(1);
    });

    it('a profile that is not classified as temporarily traveling is not changed', async () => {
      build(profile({ travelClassification: TravelClassification.PERMANENTLY_RELOCATED }));
      const error = await reject(answer(at(2).getTime(), DeclaredDuration.NOT_SURE));
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(row.travelCheckInCount).toBe(0);
      expect(profileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('a home-country change keeps its behavior', () => {
    const claimed = (status: IdentityVerificationStatus) =>
      profile({ identityVerificationStatus: status, pendingHomeCountry: 'CA', pendingHomeCountryConfirmedAt: at(1), pendingRelocationSessionId: 's1' });

    it.each([IdentityVerificationStatus.IN_PROGRESS, IdentityVerificationStatus.PENDING])(
      'a running or in-review session (%s) refuses the answer and nothing is written',
      async (status) => {
        build(claimed(status));
        const error = await reject(answer(at(2).getTime(), DeclaredDuration.NOT_SURE));
        expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
        expect(profileUpdate).not.toHaveBeenCalled();
        expect(row.travelCheckInCount).toBe(0);
      },
    );

    it('a claim with no live session is recoverable: the answer is accepted and the claim is left exactly as it is', async () => {
      build(claimed(IdentityVerificationStatus.UNSTARTED));
      await answer(at(2).getTime(), DeclaredDuration.NOT_SURE);

      expect(row).toMatchObject({
        travelCheckInCount: 1,
        pendingHomeCountry: 'CA',
        pendingRelocationSessionId: 's1',
        verifiedHomeCountry: 'US',
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      });
      // The write is pinned to the status the guard saw.
      expect(profileUpdate.mock.calls[0][0]).toMatchObject({ identityVerificationStatus: IdentityVerificationStatus.UNSTARTED });
    });

    it('a relocation session that starts between the guard and the write wins: the answer is refused and writes nothing', async () => {
      build(claimed(IdentityVerificationStatus.UNSTARTED));
      snapshots.push({ ...row }); // the read the guard sees ...
      row.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS; // ... then Didit starts

      const error = await reject(answer(at(2).getTime(), DeclaredDuration.NOT_SURE));

      expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
      expect(row.travelCheckInCount).toBe(0);
      expect(row.travelModeActivatedAt).toEqual(ACTIVATED);
    });

    it('nothing is claimed for a check-in while a home-country change is running, and it is offered again afterwards', async () => {
      build(claimed(IdentityVerificationStatus.IN_PROGRESS));
      const s = session('sid-a', loginAt);

      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: false });
      expect(createQueryRunner).not.toHaveBeenCalled();
      expect(claimRows).toHaveLength(0);

      row.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED; // abandoned: recoverable
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
    });
  });

  describe('concurrent answers: exactly one applies', () => {
    it('two tabs answering at once: one saves, the other is told it was already answered', async () => {
      build();
      setNow(at(2).getTime());

      const results = await Promise.allSettled([
        service.updateActiveTravelDuration('u1', DeclaredDuration.ONE_TO_TWO_WEEKS),
        service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const lost = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(lost.reason).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(lost.reason.getStatus()).toBe(409);
      expect(row.travelCheckInCount).toBe(1);
      const winner = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>;
      expect(row.declaredDuration).toBe(winner.value.declaredDuration);
    });

    it('an answer that finds the period ended meanwhile is reported as not active, not as answered', async () => {
      build();
      snapshots.push({ ...row });
      Object.assign(row, { travelModeActive: false }); // ended / cleared after the read

      const error = await reject(answer(at(2).getTime(), DeclaredDuration.NOT_SURE));

      expect(error).toBeInstanceOf(TravelModeNotActiveException);
    });
  });

  describe('the first check-in: five minutes after a login, until it is answered', () => {
    it('before any answer a login is reminded exactly five minutes after authentication', async () => {
      build();
      const s = session('sid-a', loginAt);
      expect(await service.getLoginReminderAt(row as any, s, dueMs(s) + 1)).toEqual(new Date(dueMs(s)));
      await expect(claim(s, dueMs(s) - 1)).resolves.toEqual({ claimed: false });
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
    });

    it('closing or skipping it is not an answer: nothing changes, and the next login is offered it again', async () => {
      build();
      const first = session('sid-a', loginAt);
      await expect(claim(first, dueMs(first))).resolves.toEqual({ claimed: true }); // shown, then closed: no answer call
      expect(row).toMatchObject({ travelCheckInCount: 0, declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, travelModeActivatedAt: ACTIVATED });

      const next = session('sid-b', at(2));
      await expect(claim(next, dueMs(next))).resolves.toEqual({ claimed: true });
      expect(claimRows.map((r) => r.session_id)).toEqual(['sid-a', 'sid-b']);
    });

    it('once it is answered, another login does not start the five-minute check-in again', async () => {
      build();
      const first = session('sid-a', loginAt);
      await claim(first, dueMs(first));
      const answeredMs = dueMs(first) + 2 * MINUTE;
      await answer(answeredMs, DeclaredDuration.NOT_SURE);

      const later = session('sid-b', new Date(answeredMs + 30 * MINUTE));
      expect(await service.getLoginReminderAt(row as any, later, dueMs(later) + 1)).toBeNull();
      await expect(claim(later, dueMs(later))).resolves.toEqual({ claimed: false });
      expect(claimRows.map((r) => r.session_id)).toEqual(['sid-a']);
      expect(deriveTravelReminderSchedule(row as any, dueMs(later), null).availableAt).toEqual(new Date(answeredMs + 3 * DAY));
    });

    it('the answer made at the five-minute check-in itself also ends it for every later login', async () => {
      build();
      const s = session('sid-a', loginAt);
      await claim(s, dueMs(s));
      await answer(dueMs(s) + MINUTE, DeclaredDuration.ONE_TO_TWO_WEEKS);

      const sameLoginAgain = await claim(s, dueMs(s) + 10 * MINUTE);
      expect(sameLoginAgain).toEqual({ claimed: false });
      expect(claimRows).toHaveLength(1);
    });
  });

  describe('a claim derived from a stale profile claims nothing', () => {
    it('the first check-in was answered (another tab) between the read and the claim lock: no claim row, rolled back', async () => {
      build();
      const s = session('sid-a', loginAt);
      const stale = { ...row }; // what this claim will read: first check-in unanswered
      await answer(dueMs(s) - 1, DeclaredDuration.NOT_SURE); // another tab answers just before
      snapshots.push(stale);

      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: false });

      expect(claimRows).toHaveLength(0);
      expect(rollbacks).toBe(1);
    });

    it('the unchanged profile still claims (control)', async () => {
      build();
      const s = session('sid-a', loginAt);
      await expect(claim(s, dueMs(s))).resolves.toEqual({ claimed: true });
      expect(rollbacks).toBe(0);
    });
  });
});
