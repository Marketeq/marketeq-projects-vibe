import {
  DeclaredDuration,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { DAY_MS } from './travel-mode-duration';
import {
  TravelModeFields,
  TravelModeState,
  deriveTravelModeState,
  travelModeBlocksNewSession,
} from './travel-mode-state';

describe('deriveTravelModeState / travelModeBlocksNewSession', () => {
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const ENDS_6 = ACTIVATED.getTime() + 6 * DAY_MS;
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
      ['no travel data at all', fields(), ENDS_6, 'none', false],
      ['permanently relocated alone', fields({ travelClassification: RELOCATED }), ENDS_6, 'none', false],
      ['pending duration: traveling, flag off, no activation', fields({ travelClassification: TRAVELING }), ENDS_6, 'pending', true],
      ['pending duration: traveling with only a duration, no activation time', fields({ travelClassification: TRAVELING, declaredDuration: DeclaredDuration.NOT_SURE }), ENDS_6, 'pending', true],
      ['pending duration: traveling with only an activation time, no duration', fields({ travelClassification: TRAVELING, travelModeActivatedAt: ACTIVATED }), ENDS_6, 'pending', true],
      ['active, 1 ms before the end', valid(), ENDS_6 - 1, 'active', true],
      ['expired, exactly at the end', valid(), ENDS_6, 'expired', false],
      ['expired, 1 ms after the end', valid(), ENDS_6 + 1, 'expired', false],
      ['expired with the raw flag still true', valid({ travelModeActive: true }), ENDS_6 + DAY_MS, 'expired', false],
      ['expired with the raw flag already false', valid({ travelModeActive: false }), ENDS_6 + DAY_MS, 'expired', false],
      ['expired, classification null', valid({ travelClassification: null }), ENDS_6, 'expired', false],
      ['active, classification null (relocation never declared)', valid({ travelClassification: null }), ENDS_6 - 1, 'active', true],
      ['active, classification permanently relocated', valid({ travelClassification: RELOCATED }), ENDS_6 - 1, 'active', true],
      ['invalid: raw active, no activation, no duration, classification null', fields({ travelModeActive: true }), ENDS_6, 'invalid', false],
      ['invalid: raw active, classification permanently relocated', fields({ travelModeActive: true, travelClassification: RELOCATED }), ENDS_6, 'invalid', false],
      ['invalid: raw active, classification traveling', fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_6, 'invalid', true],
      ['invalid: raw active, missing duration', valid({ declaredDuration: null }), ENDS_6, 'invalid', true],
      ['invalid: raw active, unknown duration', valid({ declaredDuration: 'forever' }), ENDS_6, 'invalid', true],
      ['invalid: raw active, missing activation time', valid({ travelModeActivatedAt: null }), ENDS_6, 'invalid', true],
      ['invalid: raw active, invalid activation date', valid({ travelModeActivatedAt: new Date('not a date') }), ENDS_6, 'invalid', true],
      ['invalid: raw active, activation time is not a Date', valid({ travelModeActivatedAt: ACTIVATED.toISOString() }), ENDS_6, 'invalid', true],
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
      [DeclaredDuration.A_FEW_DAYS, 6],
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
      expect(deriveTravelModeState(fields(), ENDS_6).endsAt).toBeNull();
      expect(deriveTravelModeState(valid({ declaredDuration: 'forever' }), ENDS_6).endsAt).toBeNull();
      expect(deriveTravelModeState(fields({ travelClassification: TRAVELING }), ENDS_6).endsAt).toBeNull();
    });
  });

  describe('the blocking rule', () => {
    it('pending and active block; expired does not', () => {
      expect(travelModeBlocksNewSession(fields({ travelClassification: TRAVELING }), ENDS_6)).toBe(true);
      expect(travelModeBlocksNewSession(valid(), ENDS_6 - 1)).toBe(true);
      expect(travelModeBlocksNewSession(valid(), ENDS_6)).toBe(false);
    });

    it('invalid raw-active data blocks only when the classification is temporarily_traveling', () => {
      expect(travelModeBlocksNewSession(fields({ travelModeActive: true, travelClassification: TRAVELING }), ENDS_6)).toBe(true);
      for (const classification of [null, RELOCATED]) {
        expect(travelModeBlocksNewSession(fields({ travelModeActive: true, travelClassification: classification }), ENDS_6)).toBe(false);
      }
    });

    it('an unrelated classification keeps its existing behavior: it never blocks by itself', () => {
      expect(travelModeBlocksNewSession(fields({ travelClassification: RELOCATED }), ENDS_6)).toBe(false);
      expect(travelModeBlocksNewSession(fields({ travelClassification: null }), ENDS_6)).toBe(false);
    });

    it('a clock that is not a finite number fails closed for a valid activation', () => {
      expect(deriveTravelModeState(valid(), Number.NaN).state).toBe('active');
      expect(travelModeBlocksNewSession(valid(), Number.NaN)).toBe(true);
    });

    it('does not read or change anything outside its arguments', () => {
      const f = valid();
      const snapshot = JSON.stringify(f);
      deriveTravelModeState(f, ENDS_6);
      travelModeBlocksNewSession(f, ENDS_6);
      expect(JSON.stringify(f)).toBe(snapshot);
    });
  });
});
