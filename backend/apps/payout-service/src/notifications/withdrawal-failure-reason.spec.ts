import { WITHDRAWAL_FAILURE_REASONS as R, toWithdrawalFailureReason } from './withdrawal-failure-reason';
import { describeArrivalWindow } from './withdrawal-notifier.service';

describe('toWithdrawalFailureReason (PMCM-806)', () => {
  it.each([
    ['account_closed', R.BANK_REJECTED],
    ['declined', R.BANK_REJECTED],
    ['funds_refunded', R.BANK_REJECTED],
    ['invalid_account_number', R.DETAILS_INCORRECT],
    ['no_account', R.DETAILS_INCORRECT],
    ['ERR_BANK_NOT_VERIFIED', R.METHOD_NEEDS_VERIFICATION],
    ['ERR_OAUTH_REAUTH_REQUIRED', R.METHOD_NEEDS_VERIFICATION],
    ['ERR_CARD_FROZEN', R.METHOD_NEEDS_VERIFICATION],
    ['ERR_BRIDGE_UNAVAILABLE', R.PROVIDER_UNAVAILABLE],
    ['insufficient_funds', R.PROVIDER_UNAVAILABLE],
  ])('maps %s', (code, expected) => {
    expect(toWithdrawalFailureReason(code)).toBe(expected);
  });

  it.each([[undefined], [null], [''], ['ERR_BANK_PAYOUT_FAILED'], ['ERR_PAYOUT_OFAC_BLOCKED'], ['something_new']])(
    'falls back to the no-reason line for %p, never blank or raw',
    (code) => {
      expect(toWithdrawalFailureReason(code)).toBe(R.NO_REASON);
    },
  );
});

describe('describeArrivalWindow', () => {
  const from = new Date('2026-10-14T10:00:00.000Z'); // Wednesday

  it('instant / same-moment estimates', () => {
    expect(describeArrivalWindow(from, from)).toBe('within minutes');
    expect(describeArrivalWindow(from, new Date('2026-10-14T10:30:00.000Z'))).toBe('within 30 minutes');
  });

  it('counts business days, skipping the weekend', () => {
    expect(describeArrivalWindow(from, new Date('2026-10-15T10:00:00.000Z'))).toBe('1 business day');
    // Wed + 3 business days = Mon.
    expect(describeArrivalWindow(from, new Date('2026-10-19T10:00:00.000Z'))).toBe('3 business days');
  });
});
