import { IsNull } from 'typeorm';
import { IdentityVerificationService } from './identity-verification.service';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import {
  HomeCountryChangeInProgressException,
  TravelModeAlreadyActiveException,
} from '../common/errors/domain-exceptions';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

/**
 * Travel Mode activation (recordTravelDuration): the first duration is accepted,
 * a second one while Travel Mode is in force is rejected (no extending or
 * shortening), a new one is accepted after the previous period has ended, and
 * concurrent requests produce exactly one activation. The repository is a small
 * stateful fake whose update is a real compare-and-set.
 */
describe('IdentityVerificationService — Travel Mode activation', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
  const TRAVELING = TravelClassification.TEMPORARILY_TRAVELING;
  type Row = Record<string, any>;

  let row: Row | null;
  let update: jest.Mock;
  let events: { publish: jest.Mock };
  let service: IdentityVerificationService;
  let warn: jest.SpyInstance;

  const matches = (criteria: Row) =>
    row !== null &&
    Object.entries(criteria).every(([key, expected]) => {
      const actual = row![key];
      if (expected && typeof expected === 'object' && 'type' in expected && (expected as any).type === 'isNull') {
        return actual === null || actual === undefined;
      }
      if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
      return actual === expected;
    });

  const build = (initial: Row | null) => {
    row = initial;
    update = jest.fn(async (criteria: Row, data: Row) => {
      if (!matches(criteria)) return { affected: 0 };
      Object.assign(row!, data);
      return { affected: 1 };
    });
    const profileRepository = {
      findOne: jest.fn(async () => (row ? { ...row } : null)), // a new object per read, like the real repository
      create: jest.fn((d: Row) => ({ ...d })),
      save: jest.fn(async (p: Row) => ((row = { id: 'p1', ...p }), { ...row })),
      update,
    };
    events = { publish: jest.fn() };
    service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, events as any,
    );
    warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    return { profileRepository };
  };

  const pending = (over: Row = {}): Row => ({
    id: 'p1',
    userId: 'u1',
    detectedCountry: 'US',
    travelClassification: TRAVELING,
    travelModeActive: false,
    travelModeActivatedAt: null,
    declaredDuration: null,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: null,
    ...over,
  });
  // A 13-day Travel Mode that started `startedDaysAgo` days before NOW.
  const inForce = (startedMs = NOW - DAY_MS, over: Row = {}): Row =>
    pending({
      travelModeActive: true,
      travelModeActivatedAt: new Date(startedMs),
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      lastTravelReminderSentAt: new Date(startedMs + 3 * DAY_MS),
      nextTravelReminderAt: new Date(startedMs + 7 * DAY_MS),
      ...over,
    });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const reject = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as any;
    }
    return null;
  };

  describe('the first duration selection (pending) is accepted', () => {
    it('activates with an exact compare-and-set and publishes the activation event once', async () => {
      build(pending());

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(
        { id: 'p1', travelModeActive: false, travelModeActivatedAt: IsNull(), declaredDuration: IsNull() },
        {
          // The classification is saved in this same write as the activation.
          travelClassification: TRAVELING,
          declaredDuration: DeclaredDuration.A_FEW_DAYS,
          travelModeActive: true,
          travelModeActivatedAt: new Date(NOW),
          lastTravelReminderSentAt: null,
          nextTravelReminderAt: new Date(NOW + 3 * DAY_MS),
        },
      );
      expect(saved).toMatchObject({ id: 'p1', travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS, travelClassification: TRAVELING });
      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED, profileId: 'p1', userId: 'u1' }),
      );
    });

    it('sets the first reminder exactly 3 days after activation, never 5 minutes', async () => {
      build(pending());

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.NOT_SURE);

      expect(saved.nextTravelReminderAt!.getTime() - saved.travelModeActivatedAt!.getTime()).toBe(3 * DAY_MS);
      expect(row!.nextTravelReminderAt).toEqual(new Date(NOW + 3 * DAY_MS));
    });

    it.each(Object.values(DeclaredDuration))('stores the %s duration as declared (mapping unchanged)', async (duration) => {
      build(pending());

      await service.recordTravelDuration('u1', duration);

      expect(row!.declaredDuration).toBe(duration);
      expect(row!.travelModeActive).toBe(true);
    });

    it('leaves the classification untouched', async () => {
      build(pending());
      await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);
      expect(row!.travelClassification).toBe(TRAVELING);
    });
  });

  describe('a second submission while Travel Mode is in force is rejected', () => {
    it.each([
      ['the same duration', DeclaredDuration.ONE_TO_TWO_WEEKS],
      ['a different, longer duration', DeclaredDuration.MORE_THAN_TWO_WEEKS],
      ['a different, shorter duration', DeclaredDuration.A_FEW_DAYS],
    ])('%s returns the exact 409 and changes nothing', async (_label, duration) => {
      build(inForce());
      const before = JSON.parse(JSON.stringify(row));

      const error = await reject(service.recordTravelDuration('u1', duration));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(error.code).toBe('TRAVEL_MODE_ALREADY_ACTIVE');
      expect(error.getStatus()).toBe(409);
      expect(error.getResponse()).toEqual({ message: 'Travel Mode is already active.', details: undefined });
      expect(update).not.toHaveBeenCalled();
      expect(JSON.parse(JSON.stringify(row))).toEqual(before); // duration, activation time and reminder cursor intact
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('1 ms before the end of the period it is still rejected', async () => {
      const started = NOW - 13 * DAY_MS + 1; // ends 1 ms after NOW
      build(inForce(started));

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(update).not.toHaveBeenCalled();
      expect(row!.travelModeActive).toBe(true);
    });
  });

  describe('after the period has ended a new activation is accepted', () => {
    it('exactly at the end: the expiry is persisted, then the activation is based on the POST-expiry values', async () => {
      const started = NOW - 13 * DAY_MS; // ends exactly at NOW
      build(inForce(started));
      const oldActivation = new Date(started);

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(update).toHaveBeenCalledTimes(2);
      // 1) the expiry compare-and-set, on what was stored
      expect(update.mock.calls[0]).toEqual([
        { id: 'p1', travelModeActive: true, travelModeActivatedAt: oldActivation, declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS },
        { travelModeActive: false, nextTravelReminderAt: null },
      ]);
      // 2) the activation compare-and-set, on the state AFTER expiry: inactive, previous values preserved
      expect(update.mock.calls[1][0]).toEqual({
        id: 'p1',
        travelModeActive: false,
        travelModeActivatedAt: oldActivation,
        declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      });
      expect(saved).toMatchObject({ travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS });
      expect(row!.travelModeActivatedAt).toEqual(new Date(NOW));
      expect(row!.lastTravelReminderSentAt).toBeNull(); // a new activation resets the reminder cycle
      expect(row!.nextTravelReminderAt).toEqual(new Date(NOW + 3 * DAY_MS));
      expect(events.publish).toHaveBeenCalledTimes(1);
    });

    it('an already persisted expiry (raw flag false) goes straight to the activation', async () => {
      const started = NOW - 20 * DAY_MS;
      build(inForce(started, { travelModeActive: false, nextTravelReminderAt: null }));

      await service.recordTravelDuration('u1', DeclaredDuration.MORE_THAN_TWO_WEEKS);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0][0]).toMatchObject({ travelModeActive: false, travelModeActivatedAt: new Date(started) });
      expect(row).toMatchObject({ travelModeActive: true, declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS });
    });

    it('a lost expiry compare-and-set uses the reloaded winner: an activation made meanwhile is respected', async () => {
      build(inForce(NOW - 13 * DAY_MS));
      // Another request activated a new period after this one read the row.
      update.mockImplementationOnce(async () => {
        Object.assign(row!, inForce(NOW - 1000, { declaredDuration: DeclaredDuration.NOT_SURE }));
        return { affected: 0 };
      });

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(update).toHaveBeenCalledTimes(1); // no activation was attempted
      expect(row!.declaredDuration).toBe(DeclaredDuration.NOT_SURE);
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('a lost expiry compare-and-set that reloads a cleared profile still activates, saving the classification with it', async () => {
      build(inForce(NOW - 13 * DAY_MS));
      update.mockImplementationOnce(async () => {
        Object.assign(row!, pending({ travelClassification: null }));
        return { affected: 0 };
      });

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(update).toHaveBeenCalledTimes(2);
      expect(saved).toMatchObject({ travelModeActive: true, travelClassification: TRAVELING });
      expect(row).toMatchObject({ travelModeActive: true, travelClassification: TRAVELING, declaredDuration: DeclaredDuration.A_FEW_DAYS });
    });
  });

  describe('invalid raw-active data fails closed', () => {
    it.each([
      ['no activation time', { travelModeActivatedAt: null }],
      ['no duration', { declaredDuration: null }],
      ['an unknown duration', { declaredDuration: 'forever' }],
    ])('with %s: deactivated safely, this request still gets the 409, nothing is activated', async (_label, over) => {
      build(inForce(NOW - DAY_MS, over));
      const before = { ...row! };

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(update).toHaveBeenCalledTimes(1); // only the fail-safe, never an activation
      expect(update.mock.calls[0][1]).toEqual({ travelModeActive: false, nextTravelReminderAt: null });
      expect(row!.travelModeActive).toBe(false);
      expect(row!.nextTravelReminderAt).toBeNull();
      expect(row!.travelClassification).toBe(before.travelClassification);
      expect(row!.declaredDuration).toEqual(before.declaredDuration);
      expect(row!.travelModeActivatedAt).toEqual(before.travelModeActivatedAt);
      expect(row!.lastTravelReminderSentAt).toEqual(before.lastTravelReminderSentAt);
      expect(events.publish).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith('Travel Mode fail-safe: reason=invalid_travel_data');
      expect(JSON.stringify(warn.mock.calls)).not.toContain('p1');
    });

    it('a later retry proceeds once the invalid state has been deactivated', async () => {
      build(inForce(NOW - DAY_MS, { declaredDuration: null }));

      await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));
      const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(saved).toMatchObject({ travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS });
      expect(row!.travelModeActivatedAt).toEqual(new Date(NOW));
      expect(events.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent requests produce one activation', () => {
    it('two initial requests: one winner, one 409, one event, and the winner’s duration persists', async () => {
      build(pending());

      const results = await Promise.allSettled([
        service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS),
        service.recordTravelDuration('u1', DeclaredDuration.MORE_THAN_TWO_WEEKS),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(row!.declaredDuration).toBe(DeclaredDuration.A_FEW_DAYS); // first request won; never replaced
      expect(update).toHaveBeenCalledTimes(2); // both tried, only one matched
    });

    it('two requests after an expired period also produce exactly one activation', async () => {
      build(inForce(NOW - 20 * DAY_MS, { travelModeActive: false, nextTravelReminderAt: null }));

      const results = await Promise.allSettled([
        service.recordTravelDuration('u1', DeclaredDuration.NOT_SURE),
        service.recordTravelDuration('u1', DeclaredDuration.ONE_TO_TWO_WEEKS),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(row!.declaredDuration).toBe(DeclaredDuration.NOT_SURE);
    });

    it('exactly one compare-and-set matches; the loser changes nothing', async () => {
      build(pending());

      await Promise.allSettled([
        service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS),
        service.recordTravelDuration('u1', DeclaredDuration.ONE_TO_TWO_WEEKS),
      ]);

      const outcomes = await Promise.all(update.mock.results.map((r) => r.value));
      expect(outcomes.map((o) => o.affected).sort()).toEqual([0, 1]);
      // The stored row is exactly the winner's write, with nothing from the loser mixed in.
      expect(row).toMatchObject({
        travelModeActive: true,
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
        travelModeActivatedAt: new Date(NOW),
        lastTravelReminderSentAt: null,
        nextTravelReminderAt: new Date(NOW + 3 * DAY_MS),
      });
    });
  });

  describe('the duration save carries the classification (nothing is saved before it)', () => {
    it('an account with no classification at all activates in ONE write that sets it', async () => {
      build(pending({ travelClassification: null }));

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.ONE_TO_TWO_WEEKS);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0][1]).toMatchObject({ travelClassification: TRAVELING, travelModeActive: true, declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS });
      expect(saved).toMatchObject({ travelClassification: TRAVELING, travelModeActive: true });
    });

    it('a stranded row (classified, no duration) activates exactly like a fresh account', async () => {
      build(pending());

      await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(row).toMatchObject({ travelClassification: TRAVELING, travelModeActive: true });
    });

    it('an active Travel Mode with another classification is not changed: already active, nothing written', async () => {
      build(inForce(NOW - DAY_MS, { travelClassification: TravelClassification.PERMANENTLY_RELOCATED }));

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(update).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('invalid active data with no classification fails closed: no activation', async () => {
      build(inForce(NOW - DAY_MS, { travelClassification: null, declaredDuration: null }));

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(TravelModeAlreadyActiveException);
      expect(row!.declaredDuration).toBeNull();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('a home-country change is not talked over', () => {
    const claim = (over: Row = {}): Row =>
      pending({
        travelClassification: null,
        verifiedHomeCountry: 'US',
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(NOW - 60_000),
        pendingRelocationSessionId: 'session-row-1',
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        locationVerificationStatus: 'verified',
        ...over,
      });

    it.each([
      ['running', IdentityVerificationStatus.IN_PROGRESS],
      ['in review', IdentityVerificationStatus.PENDING],
    ])('a claim whose Didit session is %s refuses the duration: nothing written, claim intact', async (_label, status) => {
      build(claim({ identityVerificationStatus: status }));

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
      expect(update).not.toHaveBeenCalled();
      expect(row).toMatchObject({ pendingHomeCountry: 'CA', pendingRelocationSessionId: 'session-row-1', travelModeActive: false });
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('an abandoned claim (no unfinished session) is withdrawn in the same write that activates Travel Mode', async () => {
      build(claim());

      const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0][1]).toMatchObject({
        travelClassification: TRAVELING,
        travelModeActive: true,
        pendingHomeCountry: null,
        pendingHomeCountryConfirmedAt: null,
        pendingRelocationSessionId: null,
      });
      expect(saved).toMatchObject({ travelModeActive: true, pendingHomeCountry: null, verifiedHomeCountry: 'US' });
    });

    it('a relocation session that starts between the check and the write loses: nothing is activated', async () => {
      build(claim());
      update.mockImplementationOnce(async () => ({ affected: 0 }));

      const error = await reject(service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS));

      expect(error).toBeInstanceOf(HomeCountryChangeInProgressException);
      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
