import { buildVerificationSummary, newSessionRequirementsMet, VerificationSummaryInput } from './verification-summary';
import { FAILED_FINAL_COOLDOWN_MS } from '../attempt-limit/hosted-kyc-attempt-cycle';
import { HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from '../../services/free-kyc.service';
import { VerificationSummaryService } from '../../services/verification-summary.service';
import {
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
} from '../../entities/enums/identity-verification.enums';

// PMCM-650: what the dashboard reads while a home-country change is pending. The
// claim runs through the ordinary retry states, so the summary must (a) not call a
// verified account with a pending claim "complete", (b) apply the 15-minute rule to
// the PENDING country's own confirmation, and (c) leave every account without a
// claim exactly as it was.
describe('verification summary with a pending home-country change', () => {
  const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
  const FRESH = new Date(NOW - 60_000);
  const STALE = new Date(NOW - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1);
  // The verified country's own confirmation is old: it must not matter while a claim is pending.
  const OLD_VERIFIED_CONFIRMATION = new Date(NOW - 30 * 24 * 60 * 60 * 1000);

  const input = (over: Partial<VerificationSummaryInput> = {}): VerificationSummaryInput => ({
    identityStatus: I.VERIFIED,
    locationStatus: L.VERIFIED,
    failedFinalAt: null,
    hostedCycleAttempts: 0,
    hasActiveHostedSession: false,
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: OLD_VERIFIED_CONFIRMATION,
    travelModeActive: false,
    travelClassification: null,
    pendingHomeCountry: 'CA',
    pendingHomeCountryConfirmedAt: FRESH,
    nowMs: NOW,
    ...over,
  });
  const next = (over: Partial<VerificationSummaryInput> = {}) => buildVerificationSummary(input(over)).nextAction;

  it('a verified account with a fresh pending claim is not "complete": it starts re-verification', () => {
    expect(next()).toBe('start_identity');
    // The gate fields are untouched: fullyVerified still reflects the two statuses.
    expect(buildVerificationSummary(input()).fullyVerified).toBe(true);
  });

  it('a verified account with a stale pending claim must confirm the location again first', () => {
    expect(next({ pendingHomeCountryConfirmedAt: STALE })).toBe('confirm_location');
  });

  it('a verified account with NO claim is complete, exactly as before', () => {
    expect(next({ pendingHomeCountry: null, pendingHomeCountryConfirmedAt: null })).toBe('complete');
    expect(next({ pendingHomeCountry: undefined, pendingHomeCountryConfirmedAt: undefined })).toBe('complete');
  });

  it('the 15-minute edge applies to the pending confirmation: exactly at the window is fine, one millisecond past is not', () => {
    const atEdge = new Date(NOW - HOME_COUNTRY_CONFIRMATION_WINDOW_MS);
    expect(newSessionRequirementsMet(input({ pendingHomeCountryConfirmedAt: atEdge }))).toBe(true);
    expect(newSessionRequirementsMet(input({ pendingHomeCountryConfirmedAt: STALE }))).toBe(false);
  });

  it('a missing pending confirmation time is never "fresh"', () => {
    expect(newSessionRequirementsMet(input({ pendingHomeCountryConfirmedAt: null }))).toBe(false);
    expect(next({ pendingHomeCountryConfirmedAt: null })).toBe('confirm_location');
  });

  describe('a retry after a decline goes straight to Didit while the pending confirmation is fresh', () => {
    it('first and second decline: retry_identity with attempts left, no location step', () => {
      const first = buildVerificationSummary(input({ identityStatus: I.FAILED, hostedCycleAttempts: 1 }));
      expect(first).toMatchObject({ nextAction: 'retry_identity', attemptsUsed: 1, attemptsRemaining: 2, canRetry: true, retryAvailableAt: null });

      const second = buildVerificationSummary(input({ identityStatus: I.FAILED, hostedCycleAttempts: 2 }));
      expect(second).toMatchObject({ nextAction: 'retry_identity', attemptsUsed: 2, attemptsRemaining: 1, canRetry: true });
    });

    it('a retry with a stale pending confirmation goes back to location confirmation', () => {
      expect(next({ identityStatus: I.FAILED, hostedCycleAttempts: 1, pendingHomeCountryConfirmedAt: STALE })).toBe('confirm_location');
    });

    it('the ordinary confirmation time is not consulted while a claim is pending (old verified confirmation, fresh pending one)', () => {
      expect(next({ identityStatus: I.FAILED, hostedCycleAttempts: 1 })).toBe('retry_identity');
    });

    it('third decline: the ordinary failed_final cooldown, with the exact retry time and three of three used', () => {
      const failedFinalAt = new Date(NOW - 1000);
      const s = buildVerificationSummary(input({ identityStatus: I.FAILED_FINAL, failedFinalAt, hostedCycleAttempts: 0 }));
      expect(s).toMatchObject({ nextAction: 'wait_for_retry', attemptsUsed: 3, attemptsRemaining: 0, canRetry: false });
      expect(s.retryAvailableAt).toBe(new Date(failedFinalAt.getTime() + FAILED_FINAL_COOLDOWN_MS).toISOString());
    });

    it('after the cooldown the claim is still retained: retry needs only a fresh pending confirmation', () => {
      const failedFinalAt = new Date(NOW - FAILED_FINAL_COOLDOWN_MS);
      expect(next({ identityStatus: I.FAILED_FINAL, failedFinalAt })).toBe('retry_identity');
      expect(next({ identityStatus: I.FAILED_FINAL, failedFinalAt, pendingHomeCountryConfirmedAt: STALE })).toBe('confirm_location');
    });
  });

  it('while in progress or in review the ordinary actions apply (resume, wait)', () => {
    expect(next({ identityStatus: I.IN_PROGRESS, hasActiveHostedSession: true })).toBe('continue_identity');
    expect(next({ identityStatus: I.PENDING })).toBe('await_review');
  });

  it('every account WITHOUT a pending claim gets the same answer as before, whatever the pending fields say about confirmation', () => {
    const withoutClaim = { pendingHomeCountry: null, pendingHomeCountryConfirmedAt: STALE };
    expect(next({ ...withoutClaim, identityStatus: I.UNSTARTED, verifiedHomeCountryConfirmedAt: FRESH })).toBe('start_identity');
    expect(next({ ...withoutClaim, identityStatus: I.UNSTARTED })).toBe('confirm_location'); // old verified confirmation
    expect(next({ ...withoutClaim, identityStatus: I.VERIFIED, locationStatus: L.NOT_VERIFIED })).toBe('confirm_location');
  });

  it('the summary service reads the pending claim from the stored profile', async () => {
    const service = new VerificationSummaryService(
      { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
    );
    const profile: any = {
      id: 'profile-1',
      identityVerificationStatus: I.VERIFIED,
      locationVerificationStatus: L.VERIFIED,
      failedFinalAt: null,
      verifiedHomeCountry: 'US',
      verifiedHomeCountryConfirmedAt: OLD_VERIFIED_CONFIRMATION,
      travelModeActive: false,
      travelClassification: null,
      pendingHomeCountry: 'CA',
      pendingHomeCountryConfirmedAt: FRESH,
    };

    expect((await service.summarize(profile, NOW)).nextAction).toBe('start_identity');
    expect((await service.summarize({ ...profile, pendingHomeCountry: null }, NOW)).nextAction).toBe('complete');
  });
});
