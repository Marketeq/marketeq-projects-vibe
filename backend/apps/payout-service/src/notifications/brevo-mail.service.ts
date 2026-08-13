// apps/payout-service/src/notifications/brevo-mail.service.ts
// PS-14: Brevo transactional email client — magic-link withdrawal
// confirmation emails only. Per 00 — Payouts Epic Overview §9.3,
// payout-service calls its email provider directly for magic links;
// every other contractor communication goes through notification-service
// via RabbitMQ. Reuses the same BREVO_API_KEY/FROM_EMAIL/FROM_NAME env vars
// notification-service already reads — no new env vars needed.

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

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('BREVO_API_KEY', '');
    this.fromEmail = this.config.get('BREVO_FROM_EMAIL', 'noreply@marketeq.com');
    this.fromName = this.config.get('BREVO_FROM_NAME', 'Marketeq');
    this.enabled = !!apiKey;

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

    this.logger.log(`Brevo sending magic link: to=${to}`);

    try {
      const response = await this.http.post('/smtp/email', {
        sender: { email: this.fromEmail, name: this.fromName },
        to: [{ email: to }],
        subject: 'Confirm your withdrawal — Marketeq',
        htmlContent: `<p>Click the link below to confirm your withdrawal of $${amountUsd}:</p>`
          + `<p><a href="${link}">${link}</a></p>`
          + `<p>This link expires in 15 minutes. If you didn't request this withdrawal, you can ignore this email.</p>`,
        tags: ['payout-magic-link'],
      });
      this.logger.log(`Brevo success: to=${to} messageId=${response.data?.messageId ?? 'n/a'}`);
    } catch (err) {
      const statusCode = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message = (err as Error)?.message || 'unknown error';
      this.logger.error(`Brevo send failed: to=${to} status=${statusCode ?? 'n/a'} message=${message}`);
      throw err;
    }
  }
}
