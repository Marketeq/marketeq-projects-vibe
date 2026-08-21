// apps/payout-service/src/notifications/brevo-mail.service.ts
// PS-14: Brevo transactional email client — magic-link withdrawal
// confirmation emails only. Per 00 — Payouts Epic Overview §9.3,
// payout-service calls its email provider directly for magic links;
// every other contractor communication goes through notification-service
// via RabbitMQ. Reuses the same BREVO_API_KEY/FROM_EMAIL/FROM_NAME env vars
// notification-service already reads, plus BREVO_WITHDRAWAL_TEMPLATE_ID for
// the branded template — unset falls back to the inline HTML below.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

@Injectable()
export class BrevoMailService {
  private readonly logger = new Logger(BrevoMailService.name);
  private readonly http: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly enabled: boolean;
  private readonly withdrawalTemplateId?: number;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('BREVO_API_KEY', '');
    this.fromEmail = this.config.get('BREVO_FROM_EMAIL', 'noreply@marketeq.com');
    this.fromName = this.config.get('BREVO_FROM_NAME', 'Marketeq');
    this.enabled = !!apiKey;

    const rawTemplateId = this.config.get('BREVO_WITHDRAWAL_TEMPLATE_ID');
    this.withdrawalTemplateId = rawTemplateId ? Number(rawTemplateId) : undefined;

    if (!this.enabled) {
      this.logger.warn('BREVO_API_KEY is not set — magic-link emails will not be delivered.');
    }

    this.http = axios.create({
      baseURL: BREVO_API_BASE,
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      timeout: 10_000,
    });
  }

  async sendMagicLink(to: string, link: string, amountUsd: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    this.logger.log(`Brevo sending magic link: to=${to} templateId=${this.withdrawalTemplateId ?? 'inline'}`);

    const request: Record<string, unknown> = {
      sender: { email: this.fromEmail, name: this.fromName },
      to: [{ email: to }],
      tags: ['payout-magic-link'],
    };

    if (this.withdrawalTemplateId) {
      request.templateId = this.withdrawalTemplateId;
      request.params = { amount: amountUsd, verifyUrl: link };
    } else {
      request.subject = 'Confirm your withdrawal — Marketeq';
      request.htmlContent = this.buildWithdrawalConfirmHtml(link, amountUsd);
    }

    try {
      const response = await this.http.post('/smtp/email', request);
      this.logger.log(`Brevo success: to=${to} messageId=${response.data?.messageId ?? 'n/a'}`);
    } catch (err) {
      const statusCode = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message = (err as Error)?.message || 'unknown error';
      this.logger.error(`Brevo send failed: to=${to} status=${statusCode ?? 'n/a'} message=${message}`);
      throw err;
    }
  }

  // Same visual template as frontend/public/emailTemplate.html (the
  // "verify your account" email) — heading, body copy, blue CTA button,
  // expiry note, footer disclaimer with a plain-text fallback link.
  private buildWithdrawalConfirmHtml(link: string, amountUsd: string): string {
    const safeLink = this.escapeAttribute(link);
    const safeAmount = this.escapeHtml(amountUsd);

    return `<!doctype html>
<html>
  <body style="background:#ffffff;margin:0;padding:0;">
    <center style="width:100%;background:#ffffff;padding:40px;">
      <table style="width:100%;max-width:600px;text-align:left;">
        <tr>
          <td>
            <h1 style="font-size:24px;font-weight:600;color:#000000;margin:0 0 16px;">
              Confirm your withdrawal
            </h1>
          </td>
        </tr>
        <tr>
          <td>
            <p style="font-size:16px;font-weight:300;color:#000000;margin:0 0 24px;">
              Click the button below to confirm your withdrawal of <strong>$${safeAmount}</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:12px;">
            <a href="${safeLink}"
              style="padding:18px 14px;background-color:#306cfe;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
              Confirm Withdrawal
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;">
            <h3 style="font-size:14px;font-weight:500;color:#000000;margin:0;">
              This link expires in 15 minutes.
            </h3>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;">
            <p style="font-size:12px;font-weight:400;color:#929292;margin:0;">
              If you didn't request this withdrawal, you can ignore this email. Button not
              working? Copy the link below and paste it into your browser:
              <a href="${safeLink}" style="color:#306cfe;text-decoration:underline;">${safeLink}</a>
            </p>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  }
}
