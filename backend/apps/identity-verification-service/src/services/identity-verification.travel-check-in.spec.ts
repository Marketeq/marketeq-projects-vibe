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
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';

/**
 * The periodic "Still traveling?" check-in (PMCM-641), backend side.
 *
 * A check-in is RESOLVED only by a saved duration answer or by starting the home-country
 * update flow. Showing, closing, skipping, refreshing, navigating away or a failed request
 * leaves the same occurrence due. One occurrence is answered at most once, across tabs.
 * The repository is a small stateful fake whose update is a real compare-and-set.
 */
describe('IdentityVerificationService — periodic "Still traveling?" check-in', () => {
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z'); // 13 days unless a test says otherwise
  const at = (days: number, offsetMs = 0) =>
    new Date(ACTIVATED.getTime() + days * DAY + offsetMs);
  type Row = Record<string, any>;

  let row: Row;
  let snapshots: Row[]; // reads served instead of the live row, oldest first (a stale read)
  let profileUpdate: jest.Mock;
  let events: { publish: jest.Mock };
  let locationResolve: jest.Mock;
  let service: IdentityVerificationService;

  const evaluate = (actual: any, expected: any): boolean => {
    if (expected instanceof FindOperator) {
      if (expected.type === 'isNull')
        return actual === null || actual === undefined;
      throw new Error(`unsupported operator ${expected.type}`);
    }
    if (expected instanceof Date)
      return actual instanceof Date && actual.getTime() === expected.getTime();
    return actual === expected;
  };
  const matches = (criteria: Row) =>
    Object.entries(criteria).every(([key, expected]) =>
      evaluate(row[key], expected),
    );

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
    profileUpdate = jest.fn(async (criteria: Row, data: Row) => {
      if (!row || !matches(criteria)) return { affected: 0 };
      Object.assign(row, data);
      return { affected: 1 };
    });
    events = { publish: jest.fn() };
    locationResolve = jest.fn(async () => ({ countryCode: 'CA' }));
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
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { resolve: locationResolve } as any,
      {} as any,
      events as any,
      {} as any,
    );
    jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  };

  const setNow = (nowMs: number) =>
    jest.spyOn(Date, 'now').mockReturnValue(nowMs);
  // The real client always sends the occurrence /me showed. By default an answer here does
  // the same (the current unresolved occurrence); `checkInAt: null` is a voluntary revision.
  const answer = (
    nowMs: number,
    duration: DeclaredDuration,
    options: { checkInAt?: Date | null; session?: LoginSession | null } = {},
  ) => {
    setNow(nowMs);
    const current =
      options.checkInAt === undefined && row
        ? (service as any).getTravelCheckIn(
            row,
            options.session ?? null,
            nowMs,
          ).availableAt
        : options.checkInAt;
    return service.updateActiveTravelDuration('u1', duration, {
      ...options,
      checkInAt: current ?? null,
    });
  };
  const due = async (nowMs: number, session: LoginSession | null = null) => {
    setNow(nowMs);
    return (await service.isTravelCheckInDue('u1', session)).due;
  };
  const schedule = (nowMs: number, session: LoginSession | null = null) =>
    deriveTravelReminderSchedule(
      row as any,
      nowMs,
      service.getLoginReminderAt(row as any, session, nowMs),
    );
  const reject = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as any;
    }
    return null;
  };
  const session = (sid: string, loginAt: Date): LoginSession => ({
    sid,
    authTimeMs: Math.floor(loginAt.getTime() / 1000) * 1000,
  });
  const loginDueMs = (s: LoginSession) => s.authTimeMs + 5 * MINUTE;
  const loginAt = at(1); // a login on day 1, with Travel Mode already active

  afterEach(() => jest.restoreAllMocks());

  describe('answering a check-in saves a new duration and restarts the schedule from the response time', () => {
    it.each([
      [DeclaredDuration.A_FEW_DAYS, 7],
      [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
      [DeclaredDuration.NOT_SURE, 30],
    ])(
      '%s: the period starts at the response time and lasts %i days, the next check-in is day 3',
      async (duration, days) => {
        build();
        const responseMs = at(2, 3 * 60 * MINUTE).getTime();

        const saved = await answer(responseMs, duration);

        expect(row.declaredDuration).toBe(duration);
        expect(row.travelModeActivatedAt).toEqual(new Date(responseMs));
        expect(
          travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration),
        ).toEqual(new Date(responseMs + days * DAY));
        expect(row.nextTravelReminderAt).toEqual(
          new Date(responseMs + 3 * DAY),
        );
        expect(row.lastTravelReminderSentAt).toBeNull();
        expect(row.travelCheckInCount).toBe(1);
        expect(saved).toMatchObject({
          declaredDuration: duration,
          travelCheckInCount: 1,
          travelModeActive: true,
        });
      },
    );

    it('"Not sure" is an answer like any other: it counts, and it sets the 30-day period', async () => {
      build();
      await answer(at(2).getTime(), DeclaredDuration.NOT_SURE);
      expect(row.travelCheckInCount).toBe(1);
      expect(row.declaredDuration).toBe(DeclaredDuration.NOT_SURE);
    });

    it('restarts from the response: the new period is NOT added to the old end', async () => {
      build(
        profile({ declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS }),
      ); // would have ended on day 30
      const responseMs = at(10).getTime();

      await answer(responseMs, DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(
        travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration),
      ).toEqual(new Date(responseMs + 13 * DAY));
    });

    it('a second and a third answer each count', async () => {
      build();
      await answer(at(4).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);
      await answer(at(9).getTime(), DeclaredDuration.NOT_SURE);
      await answer(at(14).getTime(), DeclaredDuration.A_FEW_DAYS);
      expect(row.travelCheckInCount).toBe(3);
      expect(row.travelModeActivatedAt).toEqual(at(14));
    });

    it('an answer clears what the previous period had resolved', async () => {
      build(
        profile({
          lastTravelReminderSentAt: at(7),
          nextTravelReminderAt: null,
        }),
      ); // day 3 and day 7 both resolved
      const answeredMs = at(8).getTime();
      await answer(answeredMs, DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(row.lastTravelReminderSentAt).toBeNull();
      expect(schedule(answeredMs)).toEqual({
        due: false,
        availableAt: new Date(answeredMs + 3 * DAY),
      });
    });

    it('writes only Travel Mode columns, in one compare-and-set pinned to what it observed, and publishes nothing', async () => {
      build();
      await answer(at(2).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(profileUpdate).toHaveBeenCalledTimes(1);
      const [criteria, data] = profileUpdate.mock.calls[0];
      expect(Object.keys(data).sort()).toEqual(
        [
          'declaredDuration',
          'lastTravelReminderSentAt',
          'nextTravelReminderAt',
          'travelCheckInCount',
          'travelModeActivatedAt',
        ].sort(),
      );
      expect(Object.keys(criteria)).toEqual(
        expect.arrayContaining([
          'id',
          'travelModeActive',
          'travelClassification',
          'travelModeActivatedAt',
          'declaredDuration',
          'travelCheckInCount',
          'lastTravelReminderSentAt',
        ]),
      );
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

  describe('the check-in days: 3 and 6 for "A few days" (7 days), 3 and 7 for every other answer', () => {
    it('"A few days": day 6 is a real, due check-in strictly before the end', async () => {
      build();
      const answeredMs = at(2).getTime();
      await answer(answeredMs, DeclaredDuration.A_FEW_DAYS);

      expect(schedule(answeredMs + 3 * DAY)).toEqual({
        due: true,
        availableAt: new Date(answeredMs + 3 * DAY),
      });
      row.lastTravelReminderSentAt = new Date(answeredMs + 3 * DAY + 1000); // day 3 resolved
      expect(schedule(answeredMs + 6 * DAY - 1)).toEqual({
        due: false,
        availableAt: new Date(answeredMs + 6 * DAY),
      });
      expect(schedule(answeredMs + 6 * DAY)).toEqual({
        due: true,
        availableAt: new Date(answeredMs + 6 * DAY),
      });
      expect(schedule(answeredMs + 7 * DAY - 1).due).toBe(true); // still answerable until the last millisecond
      expect(schedule(answeredMs + 7 * DAY)).toEqual({
        due: false,
        availableAt: null,
      }); // expired
    });

    it.each([
      DeclaredDuration.ONE_TO_TWO_WEEKS,
      DeclaredDuration.MORE_THAN_TWO_WEEKS,
      DeclaredDuration.NOT_SURE,
    ])('%s: day 3 then day 7, counted from the answer', async (duration) => {
      build();
      const answeredMs = at(8).getTime();
      await answer(answeredMs, duration);

      expect(schedule(answeredMs + 3 * DAY - 1)).toEqual({
        due: false,
        availableAt: new Date(answeredMs + 3 * DAY),
      });
      expect(schedule(answeredMs + 3 * DAY).due).toBe(true);
      row.lastTravelReminderSentAt = new Date(answeredMs + 3 * DAY + 1000);
      expect(schedule(answeredMs + 7 * DAY)).toEqual({
        due: true,
        availableAt: new Date(answeredMs + 7 * DAY),
      });
    });
  });

  describe('a check-in that was shown, closed, skipped, refreshed or failed stays due', () => {
    it('asking any number of times neither consumes nor changes it (this is what closing, skipping and refreshing do)', async () => {
      build();
      const nowMs = at(3, MINUTE).getTime();
      const before = JSON.parse(JSON.stringify(row));

      for (let i = 0; i < 5; i += 1)
        expect(await due(nowMs + i * MINUTE)).toBe(true);

      expect(schedule(nowMs)).toEqual({ due: true, availableAt: at(3) });
      expect(JSON.parse(JSON.stringify(row))).toEqual(before);
      expect(profileUpdate).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('it is still due, with the same time, a day later (navigation away and back)', async () => {
      build();
      expect(await due(at(3, MINUTE).getTime())).toBe(true);
      expect(schedule(at(4).getTime()).availableAt).toEqual(at(3));
    });

    it('a failed answer request writes nothing and the same occurrence is still due', async () => {
      build();
      profileUpdate.mockRejectedValueOnce(new Error('boom'));
      const nowMs = at(3, MINUTE).getTime();

      await expect(
        answer(nowMs, DeclaredDuration.NOT_SURE, { checkInAt: at(3) }),
      ).rejects.toThrow('boom');

      expect(row).toMatchObject({
        travelCheckInCount: 0,
        travelModeActivatedAt: ACTIVATED,
        lastTravelReminderSentAt: null,
      });
      expect(schedule(nowMs)).toEqual({ due: true, availableAt: at(3) });
      // and the retry with the same occurrence succeeds
      await answer(nowMs, DeclaredDuration.NOT_SURE, { checkInAt: at(3) });
      expect(row.travelCheckInCount).toBe(1);
    });

    it('a rejected answer (bad state) leaves the occurrence due as well', async () => {
      build(
        profile({
          pendingHomeCountry: 'CA',
          identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
        }),
      );
      const error = await reject(
        answer(at(3, MINUTE).getTime(), DeclaredDuration.NOT_SURE),
      );
      expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
      row.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED; // abandoned
      expect(schedule(at(3, MINUTE).getTime())).toEqual({
        due: true,
        availableAt: at(3),
      });
    });

    it('resolved by starting the home-country flow (the resolved-up-to time passes it): the next occurrence is day 7', () => {
      build();
      row.lastTravelReminderSentAt = at(3, 5 * MINUTE);
      expect(schedule(at(3, 6 * MINUTE).getTime())).toEqual({
        due: false,
        availableAt: at(7),
      });
    });
  });

  describe('one occurrence is answered at most once, across tabs', () => {
    it('two tabs answering at the same time: one saves, the other is told it was already answered', async () => {
      build();
      setNow(at(3, MINUTE).getTime());

      const results = await Promise.allSettled([
        service.updateActiveTravelDuration(
          'u1',
          DeclaredDuration.ONE_TO_TWO_WEEKS,
          { checkInAt: at(3) },
        ),
        service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE, {
          checkInAt: at(3),
        }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const lost = results.find(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult;
      expect(lost.reason).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(lost.reason.getStatus()).toBe(409);
      expect(row.travelCheckInCount).toBe(1);
      const winner = results.find(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>;
      expect(row.declaredDuration).toBe(winner.value.declaredDuration);
    });

    it('a second tab answering the SAME occurrence later is rejected and changes nothing', async () => {
      build();
      await answer(at(3, MINUTE).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS, {
        checkInAt: at(3),
      }); // tab A
      const afterA = JSON.parse(JSON.stringify(row));

      const error = await reject(
        answer(at(3, 10 * MINUTE).getTime(), DeclaredDuration.NOT_SURE, {
          checkInAt: at(3),
        }),
      ); // tab B, still showing it

      expect(error).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(JSON.parse(JSON.stringify(row))).toEqual(afterA);
      expect(row.travelCheckInCount).toBe(1);
    });

    it('an occurrence already resolved by the home-country flow cannot be answered afterwards', async () => {
      build();
      row.lastTravelReminderSentAt = at(3, 5 * MINUTE); // a started home-country flow resolved it
      const error = await reject(
        answer(at(3, 10 * MINUTE).getTime(), DeclaredDuration.NOT_SURE, {
          checkInAt: at(3),
        }),
      );
      expect(error).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(row.travelCheckInCount).toBe(0);
    });

    it('a time that is not the current unresolved occurrence is rejected without writing', async () => {
      build();
      for (const wrong of [at(7), at(3, 1), at(2)]) {
        const error = await reject(
          answer(at(3, MINUTE).getTime(), DeclaredDuration.NOT_SURE, {
            checkInAt: wrong,
          }),
        );
        expect(error).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      }
      expect(profileUpdate).not.toHaveBeenCalled();
    });

    it('the next occurrence (after an answer) is a different one and can be answered', async () => {
      build();
      await answer(at(3, MINUTE).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS, {
        checkInAt: at(3),
      });
      const nextDay3 = new Date(row.travelModeActivatedAt.getTime() + 3 * DAY);
      await answer(nextDay3.getTime() + MINUTE, DeclaredDuration.NOT_SURE, {
        checkInAt: nextDay3,
      });
      expect(row.travelCheckInCount).toBe(2);
    });


    it('an answer that finds the period ended meanwhile is reported as not active, not as answered', async () => {
      build();
      snapshots.push({ ...row });
      Object.assign(row, { travelModeActive: false }); // ended / cleared after the read
      const error = await reject(
        answer(at(2).getTime(), DeclaredDuration.NOT_SURE),
      );
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
    });
  });

  describe('a revision (no checkInAt) edits the answer just given: same update and restart, no extra count', () => {
    const revise = (nowMs: number, duration: DeclaredDuration) =>
      answer(nowMs, duration, { checkInAt: null });

    it('updates the duration, restarts the period and the schedule, and leaves the count alone', async () => {
      build();
      await answer(at(3, MINUTE).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);
      expect(row.travelCheckInCount).toBe(1);

      const reviseMs = at(3, 10 * MINUTE).getTime();
      const saved = await revise(reviseMs, DeclaredDuration.MORE_THAN_TWO_WEEKS);

      expect(row.declaredDuration).toBe(DeclaredDuration.MORE_THAN_TWO_WEEKS);
      expect(row.travelModeActivatedAt).toEqual(new Date(reviseMs));
      expect(
        travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration),
      ).toEqual(new Date(reviseMs + 30 * DAY));
      expect(row.nextTravelReminderAt).toEqual(new Date(reviseMs + 3 * DAY));
      expect(row.lastTravelReminderSentAt).toBeNull();
      expect(row.travelCheckInCount).toBe(1);
      expect(saved.travelCheckInCount).toBe(1);
      expect(schedule(reviseMs)).toEqual({
        due: false,
        availableAt: new Date(reviseMs + 3 * DAY),
      });
    });

    it('BTB-401: a first revision of a never-answered period restarts it and leaves home country, identity status and the count alone', async () => {
      build();
      const before = {
        home: row.verifiedHomeCountry,
        identity: row.identityVerificationStatus,
        classification: row.travelClassification,
      };
      expect(row.travelCheckInCount).toBe(0);

      const reviseMs = at(2).getTime();
      await revise(reviseMs, DeclaredDuration.NOT_SURE);

      expect(row.declaredDuration).toBe(DeclaredDuration.NOT_SURE);
      expect(row.travelModeActivatedAt).toEqual(new Date(reviseMs));
      expect(
        travelModeEndsAt(row.travelModeActivatedAt, row.declaredDuration),
      ).toEqual(new Date(reviseMs + 30 * DAY));
      expect(row.nextTravelReminderAt).toEqual(new Date(reviseMs + 3 * DAY));
      expect(row.lastTravelReminderSentAt).toBeNull();
      expect(row.travelCheckInCount).toBe(0);
      expect(row.verifiedHomeCountry).toBe(before.home);
      expect(row.identityVerificationStatus).toBe(before.identity);
      expect(row.travelClassification).toBe(before.classification);
    });

    it('several revisions in a row never count', async () => {
      build();
      await answer(at(3).getTime(), DeclaredDuration.NOT_SURE);
      await revise(at(3, MINUTE).getTime(), DeclaredDuration.A_FEW_DAYS);
      await revise(at(3, 2 * MINUTE).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);
      expect(row.travelCheckInCount).toBe(1);
      expect(row.declaredDuration).toBe(DeclaredDuration.ONE_TO_TWO_WEEKS);
    });

    it('the original occurrence stays resolved: it is not due again and cannot be answered again', async () => {
      build();
      await answer(at(3, MINUTE).getTime(), DeclaredDuration.ONE_TO_TWO_WEEKS);
      await revise(at(3, 5 * MINUTE).getTime(), DeclaredDuration.NOT_SURE);

      expect(await due(at(3, 6 * MINUTE).getTime())).toBe(false);
      await expect(
        service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE, {
          checkInAt: at(3),
        }),
      ).rejects.toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(row.travelCheckInCount).toBe(1);
    });

    it('writes no count column, and keeps the compare-and-set pins on the period, the count and the resolved-up-to time', async () => {
      build(profile({ travelCheckInCount: 2 }));
      await revise(at(5).getTime(), DeclaredDuration.NOT_SURE);

      const [criteria, data] = profileUpdate.mock.calls[0];
      expect(Object.keys(data)).not.toContain('travelCheckInCount');
      expect(criteria.travelCheckInCount).toBe(2);
      expect(Object.keys(criteria)).toEqual(
        expect.arrayContaining([
          'id',
          'travelModeActive',
          'travelClassification',
          'travelModeActivatedAt',
          'declaredDuration',
          'travelCheckInCount',
          'lastTravelReminderSentAt',
        ]),
      );
      expect(row.travelCheckInCount).toBe(2);
    });

    it('two simultaneous revisions: exactly one applies', async () => {
      build();
      setNow(at(4).getTime());
      const results = await Promise.allSettled([
        service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE),
        service.updateActiveTravelDuration('u1', DeclaredDuration.A_FEW_DAYS),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const lost = results.find(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult;
      expect(lost.reason).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(row.travelCheckInCount).toBe(0);
    });

    it('is still refused unless Travel Mode is in force, and while a home-country change runs', async () => {
      build(profile({ travelModeActive: false }));
      await expect(
        revise(at(4).getTime(), DeclaredDuration.NOT_SURE),
      ).rejects.toBeInstanceOf(TravelModeNotActiveException);
      expect(row.travelCheckInCount).toBe(0);
    });
  });

  describe('the answer is refused unless Travel Mode is in force', () => {
    it('no profile', async () => {
      build(null);
      setNow(at(2).getTime());
      expect(
        await reject(
          service.updateActiveTravelDuration('u1', DeclaredDuration.NOT_SURE),
        ),
      ).toBeInstanceOf(TravelModeNotActiveException);
    });

    it('never activated (pending)', async () => {
      build(
        profile({
          travelModeActive: false,
          travelModeActivatedAt: null,
          declaredDuration: null,
          nextTravelReminderAt: null,
        }),
      );
      const error = await reject(
        answer(at(2).getTime(), DeclaredDuration.NOT_SURE),
      );
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(profileUpdate).not.toHaveBeenCalled();
    });

    it('the period ended: it is deactivated, nothing is restarted, and the count is untouched', async () => {
      build(profile({ travelCheckInCount: 2 })); // 13 days from ACTIVATED
      const error = await reject(
        answer(at(13).getTime(), DeclaredDuration.NOT_SURE),
      );
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(error.getStatus()).toBe(409);
      expect(row).toMatchObject({
        travelModeActive: false,
        travelCheckInCount: 2,
        travelModeActivatedAt: ACTIVATED,
      });
    });

    it('1 ms before the end it is still accepted', async () => {
      build();
      await answer(at(13).getTime() - 1, DeclaredDuration.NOT_SURE);
      expect(row.travelCheckInCount).toBe(1);
    });

    it('a profile that is not classified as temporarily traveling is not changed', async () => {
      build(
        profile({
          travelClassification: TravelClassification.PERMANENTLY_RELOCATED,
        }),
      );
      const error = await reject(
        answer(at(2).getTime(), DeclaredDuration.NOT_SURE),
      );
      expect(error).toBeInstanceOf(TravelModeNotActiveException);
      expect(row.travelCheckInCount).toBe(0);
      expect(profileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('a home-country change keeps its behavior', () => {
    const claimed = (status: IdentityVerificationStatus) =>
      profile({
        identityVerificationStatus: status,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: at(1),
        pendingRelocationSessionId: 's1',
      });

    it.each([
      IdentityVerificationStatus.IN_PROGRESS,
      IdentityVerificationStatus.PENDING,
    ])(
      'a running or in-review session (%s) refuses the answer and nothing is written',
      async (status) => {
        build(claimed(status));
        const error = await reject(
          answer(at(2).getTime(), DeclaredDuration.NOT_SURE),
        );
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
      expect(profileUpdate.mock.calls[0][0]).toMatchObject({
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      });
    });

    it('a relocation session that starts between the guard and the write wins: the answer is refused and writes nothing', async () => {
      build(claimed(IdentityVerificationStatus.UNSTARTED));
      snapshots.push({ ...row }); // the read the guard sees ...
      row.identityVerificationStatus = IdentityVerificationStatus.IN_PROGRESS; // ... then Didit starts

      const error = await reject(
        answer(at(2).getTime(), DeclaredDuration.NOT_SURE),
      );

      expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
      expect(row.travelCheckInCount).toBe(0);
      expect(row.travelModeActivatedAt).toEqual(ACTIVATED);
    });

    it('no check-in is due while a home-country change is running, and it is due again once that is abandoned', async () => {
      build(claimed(IdentityVerificationStatus.IN_PROGRESS));
      const nowMs = at(3, MINUTE).getTime();
      expect(await due(nowMs)).toBe(false);
      expect(schedule(nowMs)).toEqual({ due: false, availableAt: null });

      row.identityVerificationStatus = IdentityVerificationStatus.UNSTARTED; // abandoned: recoverable
      expect(await due(nowMs)).toBe(true);
    });
  });

  describe('the first check-in: five minutes after a login, until it is answered', () => {
    it('before any answer a login is due exactly five minutes after authentication, and stays due', async () => {
      build();
      const s = session('sid-a', loginAt);
      expect(
        service.getLoginReminderAt(row as any, s, loginDueMs(s) + 1),
      ).toEqual(new Date(loginDueMs(s)));
      expect(await due(loginDueMs(s) - 1, s)).toBe(false);
      expect(await due(loginDueMs(s), s)).toBe(true);
      expect(await due(loginDueMs(s) + 3 * MINUTE, s)).toBe(true); // shown and closed: still due
      expect(schedule(loginDueMs(s) + 3 * MINUTE, s).availableAt).toEqual(
        new Date(loginDueMs(s)),
      );
    });

    it('not answering it is not an answer: the next login is offered the check-in again, five minutes after that login', async () => {
      build();
      const first = session('sid-a', loginAt);
      expect(await due(loginDueMs(first), first)).toBe(true); // shown, then closed
      const next = session('sid-b', at(2));
      expect(
        service.getLoginReminderAt(row as any, next, loginDueMs(next)),
      ).toEqual(new Date(loginDueMs(next)));
      expect(row).toMatchObject({
        travelCheckInCount: 0,
        declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
        travelModeActivatedAt: ACTIVATED,
      });
    });

    it('once it is answered, another login does not start the five-minute check-in again', async () => {
      build();
      const first = session('sid-a', loginAt);
      const answeredMs = loginDueMs(first) + 2 * MINUTE;
      await answer(answeredMs, DeclaredDuration.NOT_SURE, {
        checkInAt: new Date(loginDueMs(first)),
        session: first,
      });

      const later = session('sid-b', new Date(answeredMs + 30 * MINUTE));
      expect(
        service.getLoginReminderAt(row as any, later, loginDueMs(later) + 1),
      ).toBeNull();
      expect(await due(loginDueMs(later), later)).toBe(false);
      expect(schedule(loginDueMs(later), later).availableAt).toEqual(
        new Date(answeredMs + 3 * DAY),
      );
    });

    it('the login occurrence is answered once: a second tab of the same login is rejected', async () => {
      build();
      const s = session('sid-a', loginAt);
      const occurrence = new Date(loginDueMs(s));
      await answer(loginDueMs(s) + MINUTE, DeclaredDuration.NOT_SURE, {
        checkInAt: occurrence,
        session: s,
      });
      const error = await reject(
        answer(loginDueMs(s) + 2 * MINUTE, DeclaredDuration.NOT_SURE, {
          checkInAt: occurrence,
          session: s,
        }),
      );
      expect(error).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(row.travelCheckInCount).toBe(1);
    });

    it('a login occurrence the caller never had (another session id with a stale token) is not answerable', async () => {
      build();
      const s = session('sid-a', loginAt);
      const error = await reject(
        answer(loginDueMs(s) + MINUTE, DeclaredDuration.NOT_SURE, {
          checkInAt: new Date(loginDueMs(s)),
        }),
      ); // no session sent
      expect(error).toBeInstanceOf(TravelCheckInAlreadyAnsweredException);
      expect(profileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('a due check-in and a location mismatch are reported together (the frontend gives the check-in priority)', () => {
    it('both signals are true at once for an active traveler detected abroad', async () => {
      build();
      const nowMs = at(3, MINUTE).getTime();
      setNow(nowMs);

      const mismatch = await service.getTravelModeLocationMismatch(
        row as any,
        '203.0.113.9',
        nowMs,
      );
      const body = ProfileStatusResponseDto.fromEntity(
        row as any,
        undefined,
        nowMs,
        false,
        null,
        mismatch,
      );

      expect(mismatch).toBe(true);
      expect(body).toMatchObject({
        travelReminderDue: true,
        travelModeLocationMismatch: true,
      });
      expect(body.travelReminderAvailableAt).toBe(at(3).toISOString());
    });
  });
});
