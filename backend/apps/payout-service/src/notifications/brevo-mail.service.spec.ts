// PS-14 §4.2: every line of the withdrawal confirmation email is fixed by the
// spec. These pin the copy, not the markup.
import { BrevoMailService, MAGIC_LINK_SUBJECT, formatUsd, formatUtcTime } from './brevo-mail.service';

function makeService(templateId?: string) {
  const env: Record<string, string | undefined> = {
    BREVO_API_KEY: 'test-key',
    BREVO_WITHDRAWAL_TEMPLATE_ID: templateId,
  };
  const config = { get: (k: string, d?: string) => env[k] ?? d } as any;
  const svc = new BrevoMailService(config);
  const post = jest.fn().mockResolvedValue({ data: { messageId: 'm-1' } });
  (svc as any).http = { post };
  return { svc, post };
}

const LINK = 'https://app.marketeq.com/verify-withdrawal?token=abc&id=p-1';
const DETAILS = {
  amountUsd: '1250.00000000',
  methodLabel: 'Chase ••••4321',
  expiresAt: new Date('2026-10-16T10:45:00Z'),
};

describe('magic-link withdrawal email (PS-14 §4.2)', () => {
  it('formats amount and UTC time as the spec shows them', () => {
    expect(formatUsd('250')).toBe('$250.00');
    expect(formatUsd('1250.00000000')).toBe('$1,250.00');
    expect(formatUtcTime(new Date('2026-10-16T10:45:00Z'))).toBe('10:45 AM');
    expect(formatUtcTime(new Date('2026-10-16T22:05:00Z'))).toBe('10:05 PM');
  });

  it('sends the spec subject and every spec line, in HTML and plain text', async () => {
    const { svc, post } = makeService();
    await svc.sendMagicLink('c@example.com', LINK, DETAILS);
    const body = post.mock.calls[0][1];

    expect(body.subject).toBe(MAGIC_LINK_SUBJECT);
    expect(body.subject).toBe('Confirm your Marketeq withdrawal — action required');

    const html = (body.htmlContent as string).replace(/\s+/g, ' ');
    const text = body.textContent as string;
    for (const line of [
      'Confirm your withdrawal',
      'This link expires at 10:45 AM UTC.',
      'Confirm withdrawal',
      'If you do not confirm within 15 minutes, your withdrawal request will be cancelled and your balance will remain unchanged.',
      'Do not forward this email. This link can only be used once.',
    ]) {
      expect(html).toContain(line);
      expect(text).toContain(line);
    }
    expect(html).toContain('You requested a withdrawal of <strong>$1,250.00</strong> to <strong>Chase ••••4321</strong>.');
    expect(text).toContain('You requested a withdrawal of $1,250.00 to Chase ••••4321.');
    expect(html).toContain('If you did not request this withdrawal, contact support immediately at');
    expect(text).toContain('If you did not request this withdrawal, contact support immediately at support@marketeq.com.');
    // The old copy told contractors they could ignore an unrequested withdrawal.
    expect(html).not.toMatch(/ignore this email/i);
    expect(html).toContain(LINK.replace(/&/g, '&amp;'));
  });

  it('escapes the method label', async () => {
    const { svc, post } = makeService();
    await svc.sendMagicLink('c@example.com', LINK, { ...DETAILS, methodLabel: '<b>x</b>' });
    expect(post.mock.calls[0][1].htmlContent).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('passes the same values to a Brevo template when one is configured', async () => {
    const { svc, post } = makeService('42');
    await svc.sendMagicLink('c@example.com', LINK, DETAILS);
    expect(post.mock.calls[0][1]).toMatchObject({
      templateId: 42,
      params: { amount: '$1,250.00', methodLabel: 'Chase ••••4321', expiresAt: '10:45 AM', verifyUrl: LINK },
    });
  });
});
