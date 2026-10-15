import {
  NO_SPECIFIC_REASON,
  WITHDRAWAL_FAILURE_REASONS,
  buildWithdrawalEmail,
  buildWithdrawalPush,
  normalizeFailureReason,
} from './withdrawal.template';

const base = {
  firstName: 'Jane',
  amountUsd: '650.00',
  feeUsd: '5.00',
  netAmountUsd: '645.00',
  methodLabel: 'Chase Bank ••••4553',
  reference: '3f2b8c1e-1111-4a2b-9c3d-abcdefabcdef',
  transactionUrl: 'https://app.example.com/earnings?tab=payouts',
  reviewMethodUrl: 'https://app.example.com/earnings?tab=overview',
  tryAgainUrl: 'https://app.example.com/earnings?tab=overview',
  supportEmail: 'support@marketeqdigital.com',
};

describe('withdrawal notifications (PMCM-806)', () => {
  describe('normalizeFailureReason', () => {
    it.each(WITHDRAWAL_FAILURE_REASONS.map((r) => [r]))('keeps the approved line "%s"', (reason) => {
      expect(normalizeFailureReason(reason)).toBe(reason);
    });

    it.each([[undefined], [null], [''], ['   ']])('never leaves the reason blank (%p)', (reason) => {
      expect(normalizeFailureReason(reason)).toBe(NO_SPECIFIC_REASON);
    });

    it.each([['account_closed'], ['ERR_BANK_PAYOUT_FAILED'], ['The bank account has been closed.']])(
      'replaces raw provider text "%s" with the no-reason line (AC-06)',
      (reason) => {
        expect(normalizeFailureReason(reason)).toBe(NO_SPECIFIC_REASON);
      },
    );

    it('accepts a straight apostrophe from the publisher', () => {
      expect(normalizeFailureReason("We weren't given a specific reason")).toBe(NO_SPECIFIC_REASON);
    });
  });

  describe('push copy', () => {
    it('N-01 includes the arrival estimate when known', () => {
      expect(
        buildWithdrawalPush({ kind: 'submitted', ...base, estimatedArrivalAt: '2026-10-16T12:00:00.000Z' }),
      ).toEqual({
        title: 'Withdrawal on its way',
        body: '$650.00 to Chase Bank ••••4553. Estimated arrival Oct 16, 2026.',
      });
    });

    it('N-01 drops the arrival line when there is no estimate', () => {
      expect(buildWithdrawalPush({ kind: 'submitted', ...base, estimatedArrivalAt: null }).body).toBe(
        '$650.00 to Chase Bank ••••4553.',
      );
    });

    it('N-02 leads with the net amount', () => {
      expect(buildWithdrawalPush({ kind: 'completed', ...base })).toEqual({
        title: '$645.00 delivered',
        body: 'Your withdrawal to Chase Bank ••••4553 has arrived.',
      });
    });

    it('N-03 says the money is back in the balance (AC-02)', () => {
      expect(buildWithdrawalPush({ kind: 'failed', ...base })).toEqual({
        title: 'Withdrawal couldn’t be completed',
        body: '$650.00 has been returned to your balance.',
      });
    });
  });

  describe('email', () => {
    it('N-01 subject, details and CTA', () => {
      const email = buildWithdrawalEmail({
        kind: 'submitted',
        ...base,
        estimatedArrivalAt: '2026-10-16T12:00:00.000Z',
        arrivalWindow: '2 business days',
      });
      expect(email.subject).toBe('Your $650.00 withdrawal is processing');
      expect(email.text).toContain('Fee: $5.00');
      expect(email.text).toContain('You’ll receive: $645.00');
      expect(email.text).toContain('Estimated arrival: Oct 16, 2026 (2 business days)');
      expect(email.text).toContain('another email as soon as the money arrives');
      expect(email.html).toContain('Track withdrawal');
    });

    it('N-02 subject, net amount, method and support line (AC-01)', () => {
      const email = buildWithdrawalEmail({
        kind: 'completed',
        ...base,
        completedAt: '2026-10-14T15:04:00.000Z',
      });
      expect(email.subject).toBe('$645.00 has arrived in your account');
      expect(email.text).toContain('Received: $645.00');
      expect(email.text).toContain('Method: Chase Bank ••••4553');
      expect(email.text).toContain('Completed: Oct 14, 2026, 3:04 PM UTC');
      expect(email.text).toContain(`Reference: ${base.reference}`);
      expect(email.text).toContain('within one business day');
      expect(email.html).toContain('View receipt');
    });

    it('N-03 leads with the money being safe, then the reason and both CTAs (AC-02, AC-04)', () => {
      const email = buildWithdrawalEmail({
        kind: 'failed',
        ...base,
        failureReason: 'Your bank rejected the transfer',
      });
      expect(email.subject).toBe('We couldn’t complete your $650.00 withdrawal');
      expect(email.text.startsWith('$650.00 is back in your balance')).toBe(true);
      expect(email.text.indexOf('No funds have been lost')).toBeLessThan(email.text.indexOf('Reason:'));
      expect(email.text).toContain('Reason: Your bank rejected the transfer');
      expect(email.text).toContain('What to do next');
      expect(email.html).toContain('Review payout method');
      expect(email.html).toContain('Try again');
      expect(email.text).toContain(`Review payout method: ${base.reviewMethodUrl}`);
      expect(email.text).toContain(`Try again: ${base.tryAgainUrl}`);
    });

    it('N-03 never shows a blank or raw reason (AC-03, AC-06)', () => {
      for (const failureReason of [undefined, '', 'account_closed']) {
        const email = buildWithdrawalEmail({ kind: 'failed', ...base, failureReason });
        expect(email.text).toContain(`Reason: ${NO_SPECIFIC_REASON}`);
        expect(email.html).not.toContain('account_closed');
      }
    });

    it('falls back to a neutral greeting without a first name', () => {
      const email = buildWithdrawalEmail({ kind: 'completed', ...base, firstName: null });
      expect(email.text).toContain('Hi there,');
    });

    it('escapes contractor-controlled text', () => {
      const email = buildWithdrawalEmail({ kind: 'completed', ...base, methodLabel: '<b>x</b>' });
      expect(email.html).not.toContain('<b>x</b>');
      expect(email.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    });
  });
});
