import { Injectable, Logger, Module } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

interface BrevoSender {
  email: string;
  name?: string;
}

interface BrevoRecipient {
  email: string;
  name?: string;
}

interface SendTransacEmailRequest {
  sender?: BrevoSender;
  to: BrevoRecipient[];
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  tags?: string[];
}

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly http: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly passwordResetTemplateId?: number;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY || '';
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@marketeq.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Marketeq';

    const raw = process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID;
    this.passwordResetTemplateId = raw ? Number(raw) : undefined;

    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not set — transactional emails will fail until configured.',
      );
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

  private get defaultSender(): BrevoSender {
    return { email: this.fromEmail, name: this.fromName };
  }

  private async send(request: SendTransacEmailRequest): Promise<void> {
    const sender = request.sender ?? this.defaultSender;
    const recipients = request.to.map((r) => r.email).join(',');

    this.logger.log(
      `Brevo sending: from=${sender.email} to=${recipients} subject="${request.subject ?? '(template)'}" templateId=${request.templateId ?? 'none'} tags=${(request.tags ?? []).join(',')}`,
    );

    try {
      const response = await this.http.post('/smtp/email', {
        sender,
        to: request.to,
        subject: request.subject,
        htmlContent: request.htmlContent,
        textContent: request.textContent,
        templateId: request.templateId,
        params: request.params,
        tags: request.tags,
      });

      this.logger.log(
        `Brevo success: to=${recipients} messageId=${response.data?.messageId ?? 'n/a'} statusCode=${response.status}`,
      );
    } catch (err) {
      const statusCode = axios.isAxiosError(err) ? err.response?.status : undefined;
      const responseBody = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? 'n/a') : undefined;
      const message = (err as Error)?.message || 'unknown error';

      this.logger.error(
        `Brevo send failed: to=${recipients} status=${statusCode ?? 'n/a'} message=${message} body=${responseBody ?? 'n/a'}`,
      );
      throw err;
    }
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    body: string,
    link?: string,
  ): Promise<void> {
    await this.send({
      to: [{ email: to }],
      subject: title,
      htmlContent: `<p>${body}</p>${
        link ? `<p><a href="${link}">View on Marketeq</a></p>` : ''
      }`,
      tags: ['notification'],
    });
  }

  /** Sends a fully-rendered HTML document (branded templates) as-is. */
  async sendHtmlEmail(
    to: string,
    title: string,
    html: string,
    text?: string,
  ): Promise<void> {
    await this.send({
      to: [{ email: to }],
      subject: title,
      htmlContent: html,
      textContent: text,
      tags: ['notification'],
    });
  }

  async sendMagicLink(to: string, link: string): Promise<void> {
    await this.send({
      to: [{ email: to }],
      subject: 'Verify your phone number – Marketeq',
      htmlContent: `<p>Click the link below to verify your phone number:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
      tags: ['magic-link'],
    });
  }

  async sendPasswordResetEmail(
    to: string,
    params: { firstName?: string; resetUrl: string },
  ): Promise<void> {
    if (!this.passwordResetTemplateId) {
      this.logger.error(
        'BREVO_PASSWORD_RESET_TEMPLATE_ID is not set — cannot send password reset email.',
      );
      throw new Error('Password reset template id is not configured');
    }

    await this.send({
      to: [{ email: to }],
      templateId: this.passwordResetTemplateId,
      params: {
        firstName: params.firstName ?? '',
        resetUrl: params.resetUrl,
      },
      tags: ['password-reset'],
    });
  }
}

@Module({
  providers: [BrevoService],
  exports: [BrevoService],
})
export class BrevoModule {}
