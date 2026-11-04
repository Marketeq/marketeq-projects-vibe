// PMCM-806 AC-04: the failed/cancelled withdrawal email's two CTAs must land on
// the stated destinations — "Review payout method" on the method that failed,
// "Try again" on the Withdraw dialog pre-filled with the amount.
import { NotificationService, WithdrawalNotificationPayload } from './notification.service';
import { memoryIdempotencyRepo } from '../testing/in-memory-idempotency.repo';

function serviceWithCapturedEmail() {
  const notifRepo = {
    create: (v: any) => v,
    findOne: jest.fn(async () => null),
    save: jest.fn(async (v: any) => ({ id: 'n1', ...v })),
  };
  const prefRepo = { findOne: jest.fn(async () => null) };
  const ably = { isEnabled: () => false };
  const service = new NotificationService(
    notifRepo as any,
    prefRepo as any,
    memoryIdempotencyRepo() as any,
    ably as any,
    {} as any,
  );
  const sent: Array<{ to: string; subject: string; html: string; text: string }> = [];
  jest
    .spyOn(service as any, 'sendHtmlViaBrevo')
    .mockImplementation(async (...args: unknown[]) => {
      const [to, subject, html, text] = args as [string, string, string, string];
      sent.push({ to, subject, html, text });
    });
  return { service, sent };
}

const base: WithdrawalNotificationPayload = {
  kind: 'failed',
  recipientId: 'acct-1',
  recipientEmail: 'talent@example.com',
  firstName: 'Sam',
  payoutRequestId: '11111111-2222-3333-4444-555555555555',
  depositMethodId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  amountUsd: '125.50',
  feeUsd: '0.00',
  netAmountUsd: '125.50',
  methodLabel: 'Chase Bank •4553',
  failureReason: 'Your bank rejected the transfer',
};

describe('PMCM-806 AC-04 withdrawal recovery CTAs', () => {
  const prevFrontend = process.env.FRONTEND_URL;
  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://app.example.com';
  });
  afterAll(() => {
    process.env.FRONTEND_URL = prevFrontend;
  });

  it.each(['failed', 'cancelled'] as const)(
    '%s: Review payout method opens the failed method, Try again pre-fills the amount',
    async (kind) => {
      const { service, sent } = serviceWithCapturedEmail();
      await service.sendWithdrawalNotification({ ...base, kind });
      expect(sent).toHaveLength(1);
      expect(sent[0].text).toContain(
        'Review payout method: https://app.example.com/earnings?tab=overview&method=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );
      expect(sent[0].text).toContain(
        'Try again: https://app.example.com/earnings?tab=overview&withdrawAmount=125.50',
      );
      // The HTML buttons carry the same destinations (& is HTML-escaped).
      expect(sent[0].html).toContain(
        'href="https://app.example.com/earnings?tab=overview&amp;method=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"',
      );
      expect(sent[0].html).toContain(
        'href="https://app.example.com/earnings?tab=overview&amp;withdrawAmount=125.50"',
      );
    },
  );

  it('falls back to the Deposit Methods overview when the method id is unknown', async () => {
    const { service, sent } = serviceWithCapturedEmail();
    await service.sendWithdrawalNotification({ ...base, depositMethodId: null });
    expect(sent[0].text).toContain(
      'Review payout method: https://app.example.com/earnings?tab=overview\n',
    );
  });
});
