import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { DAY_MS } from './travel-mode-duration';
import {
  TravelModeFields,
  TravelModeState,
  TravelReminderFields,
  deriveTravelModeState,
  deriveTravelReminderSchedule,
  travelModeBlocksNewSession,
  travelModeSuppressesLocationPrompt,
} from './travel-mode-state';

describe('deriveTravelModeState / travelModeBlocksNewSession', () => {
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const ENDS_A_FEW = ACTIVATED.getTime() + 7 * DAY_MS;
  const TRAVELING = TravelClassification.TEMPORARILY_TRAVELING;
  const RELOCATED = TravelClassification.PERMANENTLY_RELOCATED;

  const fields = (over: TravelModeFields = {}): TravelModeFields => ({
    travelClassification: null,
    travelModeActive: false,
    travelModeActivatedAt: null,
    declaredDuration: null,
    ...over,
  });
  const valid = (over: TravelModeFields = {}) =>
    fields({
      travelClassification: TRAVELING,
      travelModeActive: true,
      travelModeActivatedAt: ACTIVATED,
      declaredDuration: DeclaredDuration.A_FEW_DAYS,
      ...over,
    });

  describe('complete state table', () => {
    // [label, fields, clock, expected state, blocks a new session]
    const table: Array<[string, TravelModeFields, number, TravelModeState, boolean]> = [
      ['no travel data at all', fields(), ENDS_A_FEW, 'none', false],
      ['permanently relocated alone', fields({ travelClassification: RELOCATED }), ENDS_A_FEW, 'none', false],
      ['pending duration: traveling, flag off, no activation', fields({ travelClassification: TRAVELING }), ENDS_A_FEW, 'pending', true],
      ['pending duration: traveling with only a duration, no activation time', fields({ travelClassification: TRAVELING, declaredDuration: DeclaredDuration.NOT_SURE }), ENDS_A_FEW, 'pending', true],
      ['pending duration: traveling with only an activation time, no duration', fields({ travelClassification: TRAVELING, travelModeActivatedAt: ACTIVATED }), ENDS_A_FEW, 'pending', true],
      ['active, 1 ms before the end', valid(), ENDS_A_FEW - 1, 'active', true],
      ['expired, exactly at the end', valid(), ENDS_A_FEW, 'expired', false],
      ['expired, 1 ms after the end', valid(), ENDS_A_FEW + 1, 'expired', false],
      ['expired with the raw flag still true', valid({ travelModeActive: true }), ENDS_A_FEW + DAY_MS, 'expired', false],
      ['expired with the raw flag already false', valid({ travelModeActive: false }), ENDS_A_FEW + DAY_MS, 'expired', false],
      ['expired, classification null', valid({ travelClassification: null }), ENDS_A_FEW, 'expired', false],
      ['active, classification null (relocation never declared)', valid({ travelClassification: null }), ENDS_A_FEW - 1, 'active', true],
      ['active, classification permanently relocated', valid({ travelClassification: RELOCATED }), ENDS_A_FEW - 1, 'active', true],
      ['invalid: raw active, no activation, no duration, classification null', fields({ travelModeActive: true }), ENDS_A_FEW, 'invalid', false],
      ['invalid: raw active, classification permanently relocated', fields({ travelModeActive: true, travelClassification: RELOCATED }), ENDS_A_FEW, 'invalid', false],
      ['invalid: raw active, classification traveling', fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_A_FEW, 'invalid', true],
      ['invalid: raw active, missing duration', valid({ declaredDuration: null }), ENDS_A_FEW, 'invalid', true],
      ['invalid: raw active, unknown duration', valid({ declaredDuration: 'forever' }), ENDS_A_FEW, 'invalid', true],
      ['invalid: raw active, missing activation time', valid({ travelModeActivatedAt: null }), ENDS_A_FEW, 'invalid', true],
      ['invalid: raw active, invalid activation date', valid({ travelModeActivatedAt: new Date('not a date') }), ENDS_A_FEW, 'invalid', true],
      ['invalid: raw active, activation time is not a Date', valid({ travelModeActivatedAt: ACTIVATED.toISOString() }), ENDS_A_FEW, 'invalid', true],
    ];

    it.each(table)('%s', (_label, f, now, state, blocks) => {
      expect(deriveTravelModeState(f, now).state).toBe(state);
      expect(travelModeBlocksNewSession(f, now)).toBe(blocks);
    });

    it('all five states are produced', () => {
      const produced = new Set(table.map(([, f, now]) => deriveTravelModeState(f, now).state));
      expect([...produced].sort()).toEqual(['active', 'expired', 'invalid', 'none', 'pending']);
    });
  });

  describe('exact end instant (explicit clock, no sleeping)', () => {
    it.each([
      [DeclaredDuration.A_FEW_DAYS, 7],
      [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
      [DeclaredDuration.NOT_SURE, 30],
    ])('%s: active 1 ms before day %s, expired exactly at it', (duration, days) => {
      const endsAtMs = ACTIVATED.getTime() + days * DAY_MS;
      const f = valid({ declaredDuration: duration });

      const before = deriveTravelModeState(f, endsAtMs - 1);
      expect(before.state).toBe('active');
      expect(before.endsAt!.getTime()).toBe(endsAtMs);

      const at = deriveTravelModeState(f, endsAtMs);
      expect(at.state).toBe('expired');
      expect(at.endsAt!.getTime()).toBe(endsAtMs);
    });

    it('endsAt is null whenever there is no valid activation', () => {
      expect(deriveTravelModeState(fields(), ENDS_A_FEW).endsAt).toBeNull();
      expect(deriveTravelModeState(valid({ declaredDuration: 'forever' }), ENDS_A_FEW).endsAt).toBeNull();
      expect(deriveTravelModeState(fields({ travelClassification: TRAVELING }), ENDS_A_FEW).endsAt).toBeNull();
    });
  });

  describe('travelModeSuppressesLocationPrompt', () => {
    it('active suppresses; expired does not', () => {
      expect(travelModeSuppressesLocationPrompt(valid(), ENDS_A_FEW - 1)).toBe(true);
      expect(travelModeSuppressesLocationPrompt(valid(), ENDS_A_FEW)).toBe(false);
    });

    it('a leftover classification with no duration (pending) suppresses nothing, although it still blocks a new session', () => {
      const stranded = fields({ travelClassification: TRAVELING });
      expect(travelModeSuppressesLocationPrompt(stranded, ENDS_A_FEW)).toBe(false);
      expect(travelModeBlocksNewSession(stranded, ENDS_A_FEW)).toBe(true);
    });

    it('invalid raw-active data suppresses it only for a traveler', () => {
      expect(travelModeSuppressesLocationPrompt(fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_A_FEW)).toBe(true);
      for (const classification of [null, RELOCATED]) {
        expect(travelModeSuppressesLocationPrompt(fields({ travelModeActive: true, travelClassification: classification }), ENDS_A_FEW)).toBe(false);
      }
    });
  });

  describe('travelModeSuppressesLocationPrompt', () => {
    it('active suppresses; expired does not', () => {
      expect(travelModeSuppressesLocationPrompt(valid(), ENDS_6 - 1)).toBe(true);
      expect(travelModeSuppressesLocationPrompt(valid(), ENDS_6)).toBe(false);
    });

    it('a leftover classification with no duration (pending) suppresses nothing, although it still blocks a new session', () => {
      const stranded = fields({ travelClassification: TRAVELING });
      expect(travelModeSuppressesLocationPrompt(stranded, ENDS_6)).toBe(false);
      expect(travelModeBlocksNewSession(stranded, ENDS_6)).toBe(true);
    });

    it('invalid raw-active data suppresses it only for a traveler', () => {
      expect(travelModeSuppressesLocationPrompt(fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_6)).toBe(true);
      for (const classification of [null, RELOCATED]) {
        expect(travelModeSuppressesLocationPrompt(fields({ travelModeActive: true, travelClassification: classification }), ENDS_6)).toBe(false);
      }
    });
  });

  describe('the blocking rule', () => {
    it('pending and active block; expired does not', () => {
      expect(travelModeBlocksNewSession(fields({ travelClassification: TRAVELING }), ENDS_A_FEW)).toBe(true);
      expect(travelModeBlocksNewSession(valid(), ENDS_A_FEW - 1)).toBe(true);
      expect(travelModeBlocksNewSession(valid(), ENDS_A_FEW)).toBe(false);
    });

    it('invalid raw-active data blocks only when the classification is temporarily_traveling', () => {
      expect(travelModeBlocksNewSession(fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_A_FEW)).toBe(true);
      for (const classification of [null, RELOCATED]) {
        expect(travelModeBlocksNewSession(fields({ travelModeActive: true, travelClassification: classification }), ENDS_A_FEW)).toBe(false);
      }
    });

    it('an unrelated classification keeps its existing behavior: it never blocks by itself', () => {
      expect(travelModeBlocksNewSession(fields({ travelClassification: RELOCATED }), ENDS_A_FEW)).toBe(false);
      expect(travelModeBlocksNewSession(fields({ travelClassification: null }), ENDS_A_FEW)).toBe(false);
    });

    it('a clock that is not a finite number fails closed for a valid activation', () => {
      expect(deriveTravelModeState(valid(), Number.NaN).state).toBe('active');
      expect(travelModeBlocksNewSession(valid(), Number.NaN)).toBe(true);
    });

    it('does not read or change anything outside its arguments', () => {
      const f = valid();
      const snapshot = JSON.stringify(f);
      deriveTravelModeState(f, ENDS_A_FEW);
      travelModeBlocksNewSession(f, ENDS_A_FEW);
      expect(JSON.stringify(f)).toBe(snapshot);
    });
  });
});

describe('deriveTravelReminderSchedule', () => {
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const at = (days: number, offsetMs = 0) => new Date(ACTIVATED.getTime() + days * DAY_MS + offsetMs);
  const TRAVELING = TravelClassification.TEMPORARILY_TRAVELING;

  const fields = (over: TravelReminderFields = {}): TravelReminderFields => ({
    travelClassification: TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: ACTIVATED,
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, // 13 days
    lastTravelReminderSentAt: null,
    ...over,
  });
  const few = { declaredDuration: DeclaredDuration.A_FEW_DAYS };
  const NONE = { due: false, availableAt: null };
  const schedule = (f: TravelReminderFields, now: Date | number) =>
    deriveTravelReminderSchedule(f, typeof now === 'number' ? now : now.getTime());

  describe('before day 3 and at its exact boundary (never claimed)', () => {
    it('1 ms before day 3: not due, available at day 3', () => {
      expect(schedule(fields(), at(3, -1))).toEqual({ due: false, availableAt: at(3) });
    });
    it('exactly at day 3: due, and it keeps its own time', () => {
      expect(schedule(fields(), at(3))).toEqual({ due: true, availableAt: at(3) });
    });
    it('1 ms after day 3: still due, still day 3 (until claimed)', () => {
      expect(schedule(fields(), at(3, 1))).toEqual({ due: true, availableAt: at(3) });
    });
    it('immediately after activation: not due, available at day 3', () => {
      expect(schedule(fields(), ACTIVATED)).toEqual({ due: false, availableAt: at(3) });
    });
  });

  describe('after a claim, the next eligible reminder is returned', () => {
    it('claimed exactly at day 3: day 7 next (13 days), not due until its exact time', () => {
      const f = fields({ lastTravelReminderSentAt: at(3) });
      expect(schedule(f, at(5))).toEqual({ due: false, availableAt: at(7) });
      expect(schedule(f, at(7, -1))).toEqual({ due: false, availableAt: at(7) });
      expect(schedule(f, at(7))).toEqual({ due: true, availableAt: at(7) });
      expect(schedule(f, at(7, 1))).toEqual({ due: true, availableAt: at(7) });
    });
    it('a claim 1 ms before day 3 does not consume day 3', () => {
      expect(schedule(fields({ lastTravelReminderSentAt: at(3, -1) }), at(3))).toEqual({ due: true, availableAt: at(3) });
    });
    it('a claim between day 3 and day 7 consumed day 3 only', () => {
      expect(schedule(fields({ lastTravelReminderSentAt: at(5) }), at(6))).toEqual({ due: false, availableAt: at(7) });
    });
    it('claimed exactly at day 7: the schedule is complete', () => {
      expect(schedule(fields({ lastTravelReminderSentAt: at(7) }), at(8))).toEqual(NONE);
    });
  });

  describe('catch-up: missed reminders stay claimable', () => {
    it('day 3 stays due on day 5 until it is claimed', () => {
      expect(schedule(fields(), at(5))).toEqual({ due: true, availableAt: at(3) });
    });
    it('both unclaimed and both past: the earliest is reported, and one claim consumes both', () => {
      const f = fields();
      expect(schedule(f, at(9))).toEqual({ due: true, availableAt: at(3) });
      // what a claim at day 9 records: both reminders are then consumed
      expect(schedule({ ...f, lastTravelReminderSentAt: at(9) }, at(9, 1))).toEqual(NONE);
    });
  });

  describe('"A few days" (7 days): day 3 and day 6', () => {
    it('day 3 first, then day 6, each due from its exact time', () => {
      expect(schedule(fields(few), at(3, -1))).toEqual({
        due: false,
        availableAt: at(3),
      });
      expect(schedule(fields(few), at(3))).toEqual({
        due: true,
        availableAt: at(3),
      });
      const afterDay3 = fields({ ...few, lastTravelReminderSentAt: at(3) });
      expect(schedule(afterDay3, at(6, -1))).toEqual({
        due: false,
        availableAt: at(6),
      });
      expect(schedule(afterDay3, at(6))).toEqual({
        due: true,
        availableAt: at(6),
      });
      expect(schedule(afterDay3, at(7, -1))).toEqual({
        due: true,
        availableAt: at(6),
      });
    });
    it('once day 6 is resolved there is nothing left, and never a day 7', () => {
      expect(
        schedule(fields({ ...few, lastTravelReminderSentAt: at(6) }), at(6, 1)),
      ).toEqual(NONE);
      for (const sent of [null, at(1), at(3), at(5)]) {
        const result = schedule(
          fields({ ...few, lastTravelReminderSentAt: sent }),
          at(5),
        );
        expect([at(3).getTime(), at(6).getTime()]).toContain(
          result.availableAt!.getTime(),
        );
      }
    });
  });

  describe('a shown check-in is not a resolved one', () => {
    it('reports the same occurrence however often it is asked, until the resolved-up-to time passes it', () => {
      const f = fields();
      for (let i = 0; i < 3; i += 1)
        expect(schedule(f, at(4))).toEqual({ due: true, availableAt: at(3) });
      expect(
        schedule({ ...f, lastTravelReminderSentAt: at(4) }, at(4)),
      ).toEqual({ due: false, availableAt: at(7) });
    });
  });

  describe('a home-country change that is running or waiting owns the screen', () => {
    const claim = {
      verifiedHomeCountry: 'US',
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      pendingHomeCountry: 'CA',
    };
    it.each([
      IdentityVerificationStatus.IN_PROGRESS,
      IdentityVerificationStatus.PENDING,
    ])(
      'no check-in is due while the session is %s (it would refuse an answer)',
      (status) => {
        expect(
          schedule(
            fields({ ...claim, identityVerificationStatus: status }),
            at(4),
          ),
        ).toEqual(NONE);
      },
    );
    it('a recoverable claim (no live session) does not hide it', () => {
      expect(
        schedule(
          fields({
            ...claim,
            identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
          }),
          at(4),
        ),
      ).toEqual({
        due: true,
        availableAt: at(3),
      });
    });
  });

  describe('expiry', () => {
    it('exactly at the end nothing is available, for every duration', () => {
      for (const [duration, days] of [[DeclaredDuration.A_FEW_DAYS, 7], [DeclaredDuration.ONE_TO_TWO_WEEKS, 13], [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30], [DeclaredDuration.NOT_SURE, 30]] as const) {
        expect(schedule(fields({ declaredDuration: duration }), at(days))).toEqual(NONE);
        expect(schedule(fields({ declaredDuration: duration }), at(days, -1)).availableAt).not.toBeNull();
      }
    });
    it('an expired period reports nothing, whether the raw flag is still true or already false', () => {
      expect(schedule(fields(few), at(8))).toEqual(NONE);
      expect(schedule(fields({ ...few, travelModeActive: false }), at(8))).toEqual(NONE);
    });
  });

  describe('states that never have a schedule', () => {
    it.each([
      ['pending (classified, never activated)', fields({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null })],
      ['none', fields({ travelClassification: null, travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null })],
      ['inactive (raw flag off) even inside the window', fields({ travelModeActive: false })],
      ['invalid: raw active, no activation time', fields({ travelModeActivatedAt: null })],
      ['invalid: raw active, no duration', fields({ declaredDuration: null })],
      ['invalid: raw active, unknown duration', fields({ declaredDuration: 'forever' })],
      ['invalid: raw active, invalid activation date', fields({ travelModeActivatedAt: new Date('not a date') })],
    ])('%s', (_label, f) => {
      expect(schedule(f, at(3))).toEqual(NONE);
    });
  });

  describe('fail closed on an unusable last-claim time', () => {
    it.each([
      ['a string', '2026-06-04T09:00:00.000Z'],
      ['an invalid date', new Date('not a date')],
      ['a number', 1_780_000_000_000],
    ])('%s yields no schedule', (_label, sent) => {
      expect(schedule(fields({ lastTravelReminderSentAt: sent }), at(3))).toEqual(NONE);
    });
    it('a claim time in the future of everything consumes everything', () => {
      expect(schedule(fields({ lastTravelReminderSentAt: at(40) }), at(3))).toEqual(NONE);
    });
  });

  describe('purity and the clock', () => {
    it('depends only on the clock it is given', () => {
      const f = fields();
      expect(schedule(f, at(2))).toEqual({ due: false, availableAt: at(3) });
      expect(schedule(f, at(4))).toEqual({ due: true, availableAt: at(3) });
      expect(schedule(f, at(2))).toEqual({ due: false, availableAt: at(3) }); // earlier clock again: same answer
    });
    it('never reads the job’s reminder cursor', () => {
      const base = schedule(fields(), at(4));
      for (const cursor of [null, at(1), at(7), at(99), 'garbage']) {
        expect(schedule({ ...fields(), nextTravelReminderAt: cursor } as TravelReminderFields, at(4))).toEqual(base);
      }
    });
    it('a clock that is not a finite number is never due', () => {
      expect(schedule(fields(), Number.NaN).due).toBe(false);
    });
    it('does not change its input', () => {
      const f = fields({ lastTravelReminderSentAt: at(3) });
      const snapshot = JSON.stringify(f);
      schedule(f, at(5));
      expect(JSON.stringify(f)).toBe(snapshot);
    });
  });
});
