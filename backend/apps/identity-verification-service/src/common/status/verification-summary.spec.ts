import {
  NEXT_ACTIONS,
  buildVerificationSummary,
  newSessionRequirementsMet,
  NextAction,
  VerificationSummaryInput,
} from './verification-summary';
import { FAILED_FINAL_COOLDOWN_MS } from '../attempt-limit/hosted-kyc-attempt-cycle';
import { HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from '../../services/free-kyc.service';
import {
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';

describe('verification summary (backward-compatible additions + stable nextAction)', () => {
  const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
  const T0 = new Date(NOW);
  const FRESH = new Date(NOW - 60_000);
  const STALE = new Date(NOW - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1);

  // A profile whose location is confirmed and fresh, no active session, no attempts.
  const base = (over: Partial<VerificationSummaryInput> = {}): VerificationSummaryInput => ({
    identityStatus: I.UNSTARTED,
    locationStatus: L.VERIFIED,
    failedFinalAt: null,
    hostedCycleAttempts: 0,
    hasActiveHostedSession: false,
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: FRESH,
    travelModeActive: false,
    travelClassification: null,
    nowMs: NOW,
    ...over,
  });
  const summary = (over: Partial<VerificationSummaryInput> = {}) => buildVerificationSummary(base(over));

  describe('fullyVerified requires BOTH identity and location verified', () => {
    it.each([
      [I.VERIFIED, L.VERIFIED, true],
      [I.VERIFIED, L.NOT_VERIFIED, false],
      [I.VERIFIED, L.SUBMITTED_PENDING_REVIEW, false],
      [I.PENDING, L.VERIFIED, false],
      [I.IN_PROGRESS, L.VERIFIED, false],
      [I.UNSTARTED, L.VERIFIED, false],
      [I.FAILED, L.VERIFIED, false],
      [I.FAILED_FINAL, L.VERIFIED, false],
      [I.EXPIRED, L.VERIFIED, false],
      [I.BLOCKED_DUPLICATE, L.VERIFIED, false],
      [I.BLOCKED_AGE, L.VERIFIED, false],
      [I.UNSTARTED, L.NOT_VERIFIED, false],
    ])('identity %s + location %s → %s', (identityStatus, locationStatus, expected) => {
      expect(summary({ identityStatus, locationStatus }).fullyVerified).toBe(expected);
    });

    it('is never true because of a grace window or a past expiry', () => {
      expect(summary({ identityStatus: I.EXPIRED }).fullyVerified).toBe(false);
    });
  });

  describe('nextAction (stable contract)', () => {
    it('the value set is exactly the documented, append-only list', () => {
      expect([...NEXT_ACTIONS]).toEqual([
        'confirm_location', 'start_identity', 'continue_identity', 'await_review',
        'retry_identity', 'wait_for_retry', 'reverify_identity', 'complete',
      ]);
    });

    const travelling = { travelClassification: TravelClassification.TEMPORARILY_TRAVELING };
    const cases: Array<[string, Partial<VerificationSummaryInput>, NextAction]> = [
      // complete
      ['fully verified', { identityStatus: I.VERIFIED }, 'complete'],
      // confirm_location
      ['identity verified, location not (e.g. after a relocation)', { identityStatus: I.VERIFIED, locationStatus: L.NOT_VERIFIED }, 'confirm_location'],
      ['unstarted, location not verified', { locationStatus: L.NOT_VERIFIED }, 'confirm_location'],
      ['unstarted, no home country on record', { verifiedHomeCountry: null }, 'confirm_location'],
      ['unstarted, no confirmation time', { verifiedHomeCountryConfirmedAt: null }, 'confirm_location'],
      ['unstarted, confirmation stale (older than 15 minutes)', { verifiedHomeCountryConfirmedAt: STALE }, 'confirm_location'],
      ['unstarted, travel mode active', { travelModeActive: true }, 'confirm_location'],
      ['unstarted, temporary-travel classification', travelling, 'confirm_location'],
      ['failed with stale confirmation', { identityStatus: I.FAILED, verifiedHomeCountryConfirmedAt: STALE }, 'confirm_location'],
      ['expired with location not verified', { identityStatus: I.EXPIRED, locationStatus: L.NOT_VERIFIED }, 'confirm_location'],
      // start_identity
      ['unstarted, location confirmed and fresh', {}, 'start_identity'],
      ['in progress but no unfinished session to resume', { identityStatus: I.IN_PROGRESS }, 'start_identity'],
      // continue_identity (resume needs no new-session checks)
      ['in progress with an unfinished session', { identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true }, 'continue_identity'],
      ['…even with a stale confirmation', { identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true, verifiedHomeCountryConfirmedAt: STALE }, 'continue_identity'],
      ['…even with location not verified', { identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true, locationStatus: L.NOT_VERIFIED }, 'continue_identity'],
      ['…even with travel mode on', { identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true, travelModeActive: true }, 'continue_identity'],
      // await_review
      ['pending review', { identityStatus: I.PENDING }, 'await_review'],
      ['pending review with a stale confirmation', { identityStatus: I.PENDING, verifiedHomeCountryConfirmedAt: STALE }, 'await_review'],
      // retry_identity
      ['failed, attempts remain', { identityStatus: I.FAILED, hostedCycleAttempts: 1 }, 'retry_identity'],
      ['failed after two attempts', { identityStatus: I.FAILED, hostedCycleAttempts: 2 }, 'retry_identity'],
      // wait_for_retry
      ['final failure inside the cooldown', { identityStatus: I.FAILED_FINAL, failedFinalAt: T0 }, 'wait_for_retry'],
      ['duplicate block', { identityStatus: I.BLOCKED_DUPLICATE }, 'wait_for_retry'],
      ['age block', { identityStatus: I.BLOCKED_AGE }, 'wait_for_retry'],
      // reverify_identity
      ['expired verification, location fine', { identityStatus: I.EXPIRED }, 'reverify_identity'],
    ];
    it.each(cases)('%s → %s', (_label, over, expected) => {
      expect(summary(over).nextAction).toBe(expected);
    });

    it('every one of the eight values is produced by some state', () => {
      const produced = new Set(cases.map(([, over]) => summary(over).nextAction));
      for (const value of NEXT_ACTIONS) expect(produced).toContain(value);
    });

    it('exhaustive sweep: every identity × location × session × confirmation × travel combination obeys the invariants', () => {
      const confirmations: Array<[string, Partial<VerificationSummaryInput>]> = [
        ['fresh', {}],
        ['stale', { verifiedHomeCountryConfirmedAt: STALE }],
        ['missing', { verifiedHomeCountryConfirmedAt: null, verifiedHomeCountry: null }],
      ];
      let combinations = 0;
      for (const identityStatus of Object.values(I)) {
        for (const locationStatus of Object.values(L)) {
          for (const hasActiveHostedSession of [true, false]) {
            for (const [, conf] of confirmations) {
              for (const travelModeActive of [true, false]) {
                for (const failedFinalAt of [T0, null]) {
                  combinations++;
                  const input = base({ identityStatus, locationStatus, hasActiveHostedSession, travelModeActive, failedFinalAt, ...conf });
                  const s = buildVerificationSummary(input);
                  expect(NEXT_ACTIONS).toContain(s.nextAction);
                  expect(s.fullyVerified).toBe(s.nextAction === 'complete');
                  if (s.nextAction === 'continue_identity') {
                    expect(identityStatus).toBe(I.IN_PROGRESS);
                    expect(hasActiveHostedSession).toBe(true);
                  }
                  if (['start_identity', 'retry_identity', 'reverify_identity'].includes(s.nextAction)) {
                    expect(newSessionRequirementsMet(input)).toBe(true); // a start is only offered when it can succeed
                  }
                  if (s.nextAction === 'confirm_location') {
                    const identityDoneLocationNot = identityStatus === I.VERIFIED && locationStatus !== L.VERIFIED;
                    expect(identityDoneLocationNot || !newSessionRequirementsMet(input)).toBe(true);
                  }
                  expect(s.attemptsUsed + s.attemptsRemaining).toBe(s.maxAttempts);
                  expect(s.hasActiveSession).toBe(hasActiveHostedSession);
                  if (s.canRetry) expect(s.attemptsRemaining).toBeGreaterThan(0);
                }
              }
            }
          }
        }
      }
      expect(combinations).toBeGreaterThan(500);
    });
  });

  describe('new-session requirements (the confirm_location rule)', () => {
    it('are met only with verified location, a home country, travel off and a confirmation within 15 minutes', () => {
      expect(newSessionRequirementsMet(base())).toBe(true);
      expect(newSessionRequirementsMet(base({ locationStatus: L.NOT_VERIFIED }))).toBe(false);
      expect(newSessionRequirementsMet(base({ verifiedHomeCountry: null }))).toBe(false);
      expect(newSessionRequirementsMet(base({ verifiedHomeCountryConfirmedAt: null }))).toBe(false);
      expect(newSessionRequirementsMet(base({ verifiedHomeCountryConfirmedAt: 'not-a-date' }))).toBe(false);
      expect(newSessionRequirementsMet(base({ travelModeActive: true }))).toBe(false);
    });

    it('the 15-minute edge: exactly at the window is fine, one millisecond past is not', () => {
      expect(newSessionRequirementsMet(base({ verifiedHomeCountryConfirmedAt: new Date(NOW - HOME_COUNTRY_CONFIRMATION_WINDOW_MS) }))).toBe(true);
      expect(newSessionRequirementsMet(base({ verifiedHomeCountryConfirmedAt: new Date(NOW - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1) }))).toBe(false);
    });
  });

  describe('attempts and canRetry', () => {
    it.each([
      [0, 3],
      [1, 2],
      [2, 1],
    ])('%i used in the current cycle → %i remaining', (used, remaining) => {
      expect(summary({ identityStatus: I.FAILED, hostedCycleAttempts: used })).toMatchObject({
        attemptsUsed: used, attemptsRemaining: remaining, maxAttempts: 3,
      });
    });

    it('never reports negative, fractional, non-finite or more than three attempts', () => {
      expect(summary({ hostedCycleAttempts: -4 }).attemptsUsed).toBe(0);
      expect(summary({ hostedCycleAttempts: 1.9 }).attemptsUsed).toBe(1);
      expect(summary({ hostedCycleAttempts: Number.NaN }).attemptsUsed).toBe(0);
      expect(summary({ hostedCycleAttempts: 99 })).toMatchObject({ attemptsUsed: 3, attemptsRemaining: 0 });
    });

    it.each<[string, Partial<VerificationSummaryInput>, boolean]>([
      ['failed with attempts remaining', { identityStatus: I.FAILED, hostedCycleAttempts: 2 }, true],
      ['failed with the counter somehow at the limit', { identityStatus: I.FAILED, hostedCycleAttempts: 3 }, false],
      ['unstarted', {}, false],
      ['in progress', { identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true }, false],
      ['pending review', { identityStatus: I.PENDING }, false],
      ['verified', { identityStatus: I.VERIFIED }, false],
      ['expired (re-verify, not a retry)', { identityStatus: I.EXPIRED }, false],
      ['blocked', { identityStatus: I.BLOCKED_DUPLICATE }, false],
      ['final failure inside the cooldown', { identityStatus: I.FAILED_FINAL, failedFinalAt: T0 }, false],
      ['final failure after the cooldown', { identityStatus: I.FAILED_FINAL, failedFinalAt: T0, nowMs: NOW + FAILED_FINAL_COOLDOWN_MS }, true],
    ])('canRetry: %s → %s', (_label, over, expected) => {
      expect(summary(over).canRetry).toBe(expected);
    });

    it('canRetry does not depend on the location requirement (the nextAction says confirm first)', () => {
      const s = summary({ identityStatus: I.FAILED, hostedCycleAttempts: 1, verifiedHomeCountryConfirmedAt: STALE });
      expect(s.canRetry).toBe(true);
      expect(s.nextAction).toBe('confirm_location');
    });
  });

  describe('failed_final and the exact 24-hour cooldown (Part 1 helper, single source)', () => {
    const failedFinal = (failedFinalAt: unknown, nowMs: number) => summary({ identityStatus: I.FAILED_FINAL, failedFinalAt, nowMs });

    it('during the cooldown: wait_for_retry, 3 of 3 used, 0 remaining, the exact retry time, no retry', () => {
      const s = failedFinal(T0, NOW + FAILED_FINAL_COOLDOWN_MS - 1);
      expect(s).toMatchObject({ nextAction: 'wait_for_retry', attemptsUsed: 3, attemptsRemaining: 0, maxAttempts: 3, canRetry: false });
      expect(s.retryAvailableAt).toBe(new Date(NOW + FAILED_FINAL_COOLDOWN_MS).toISOString());
    });

    it('exactly at expiry and after: retry_identity with three fresh attempts and no retry time', () => {
      for (const delta of [0, 1, 7 * FAILED_FINAL_COOLDOWN_MS]) {
        const s = failedFinal(T0, NOW + FAILED_FINAL_COOLDOWN_MS + delta);
        // the confirmation is fresh relative to "now" for this check
        const fresh = summary({ identityStatus: I.FAILED_FINAL, failedFinalAt: T0, nowMs: NOW + FAILED_FINAL_COOLDOWN_MS + delta, verifiedHomeCountryConfirmedAt: new Date(NOW + FAILED_FINAL_COOLDOWN_MS + delta - 1000) });
        expect(fresh).toMatchObject({ nextAction: 'retry_identity', attemptsUsed: 0, attemptsRemaining: 3, canRetry: true, retryAvailableAt: null });
        expect(s.retryAvailableAt).toBeNull();
      }
    });

    it('a missing or invalid timestamp fails closed: still waiting, no invented retry time', () => {
      for (const bad of [null, undefined, new Date(Number.NaN), '2026-09-30T12:00:00Z']) {
        const s = failedFinal(bad, NOW + 10 * FAILED_FINAL_COOLDOWN_MS);
        expect(s).toMatchObject({ nextAction: 'wait_for_retry', attemptsUsed: 3, canRetry: false, retryAvailableAt: null });
      }
    });

    it('a future-dated timestamp (ahead of the clock) fails closed with no retry time', () => {
      expect(failedFinal(new Date(NOW + 60_000), NOW)).toMatchObject({ nextAction: 'wait_for_retry', attemptsUsed: 3, retryAvailableAt: null });
    });

    it('is a read-only projection: building the summary never mutates its input', () => {
      const input = base({ identityStatus: I.FAILED_FINAL, failedFinalAt: T0, nowMs: NOW + FAILED_FINAL_COOLDOWN_MS });
      const before = JSON.stringify(input);
      buildVerificationSummary(input);
      expect(JSON.stringify(input)).toBe(before);
    });
  });

  describe('hasActiveSession and privacy', () => {
    it('passes the active-session flag through', () => {
      expect(summary({ hasActiveHostedSession: true, identityStatus: I.IN_PROGRESS }).hasActiveSession).toBe(true);
      expect(summary().hasActiveSession).toBe(false);
    });

    it('carries only statuses, counts, booleans and one timestamp — no identifier, country, coordinate or vendor value', () => {
      const s = buildVerificationSummary(base({ identityStatus: I.FAILED_FINAL, failedFinalAt: T0, verifiedHomeCountry: 'US' }));
      expect(Object.keys(s).sort()).toEqual(
        ['attemptsRemaining', 'attemptsUsed', 'canRetry', 'fullyVerified', 'hasActiveSession', 'maxAttempts', 'nextAction', 'retryAvailableAt'],
      );
      expect(JSON.stringify(s)).not.toContain('US');
    });
  });
});
