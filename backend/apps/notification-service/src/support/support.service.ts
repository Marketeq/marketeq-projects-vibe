import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BrevoService } from '../brevo/brevo.service';
import { ScheduleCallDto } from './dto/schedule-call.dto';
import { SupportMessageDto } from './dto/support-message.dto';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_MESSAGE =
  'Too many support requests from this address. Please try again later.';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly brevoService: BrevoService,
    private readonly configService: ConfigService,
  ) {}

  private get supportInbox(): string {
    return (
      this.configService.get<string>('SUPPORT_INBOX_EMAIL') ||
      this.configService.get<string>('BREVO_FROM_EMAIL') ||
      'support@marketeqdigital.com'
    );
  }

  /**
   * In-memory per-IP limiter, mirroring auth-service's password-reset limiter.
   *
   * These endpoints are public and send mail, which makes them a relay worth
   * abusing. Being in-memory it is per-instance and resets on deploy — enough
   * to stop a naive loop, not a distributed flood. A shared Redis bucket is
   * the real fix and is noted in the account recovery notes.
   */
  private enforceRateLimit(ipAddress: string, scope: string): void {
    const limit = Number(
      this.configService.get<string>('SUPPORT_RATE_LIMIT') ?? 5,
    );
    const windowMs = Number(
      this.configService.get<string>('SUPPORT_RATE_LIMIT_WINDOW_MS') ??
        15 * 60 * 1000,
    );
    const now = Date.now();

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    const key = `${scope}:${ipAddress.trim() || 'unknown'}`;
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (bucket.count >= limit) {
      throw new HttpException(RATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
  }

  /**
   * Escapes before interpolation. Every value here was typed by an anonymous
   * sender and lands in an HTML email a support agent opens.
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async sendSupportMessage(
    dto: SupportMessageDto,
    ipAddress: string,
  ): Promise<{ success: true }> {
    this.enforceRateLimit(ipAddress, 'support-message');

    const name = `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();
    const html = `
      <p><strong>From:</strong> ${this.escapeHtml(name)}</p>
      <p><strong>Reply to:</strong> ${this.escapeHtml(dto.email.trim())}</p>
      <hr />
      <p>${this.escapeHtml(dto.message.trim()).replace(/\n/g, '<br />')}</p>
    `;

    await this.brevoService.sendHtmlEmail(
      this.supportInbox,
      `[Support] ${dto.subject.trim()}`,
      html,
    );

    this.logger.log(
      `sendSupportMessage: relayed a support message from ${dto.email.trim()}`,
    );

    return { success: true };
  }

  async requestCall(
    dto: ScheduleCallDto,
    ipAddress: string,
  ): Promise<{ success: true }> {
    this.enforceRateLimit(ipAddress, 'schedule-call');

    const html = `
      <p><strong>Name:</strong> ${this.escapeHtml(dto.name.trim())}</p>
      <p><strong>Email:</strong> ${this.escapeHtml(dto.email.trim())}</p>
      <p><strong>Phone:</strong> ${this.escapeHtml(dto.phone.trim())}</p>
      <p><strong>Preferred date:</strong> ${this.escapeHtml(dto.date.trim())}</p>
      <p><strong>Preferred time:</strong> ${this.escapeHtml(dto.time.trim())}</p>
      <hr />
      <p>Submitted from the account recovery Contact Support flow. The date and
      time are free text with no timezone — confirm them with the caller before
      booking.</p>
    `;

    await this.brevoService.sendHtmlEmail(
      this.supportInbox,
      `[Call request] ${dto.name.trim()}`,
      html,
    );

    this.logger.log(`requestCall: relayed a call request from ${dto.email.trim()}`);

    return { success: true };
  }
}
