import { Injectable, Logger } from '@nestjs/common';
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
    try {
      await this.http.post('/smtp/email', {
        sender: request.sender ?? this.defaultSender,
        to: request.to,
        subject: request.subject,
        htmlContent: request.htmlContent,
        templateId: request.templateId,
        params: request.params,
        tags: request.tags,
      });
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && err.response?.data
          ? JSON.stringify(err.response.data)
          : (err as Error)?.message) || 'unknown error';
      this.logger.error(
        `Brevo send failed (templateId=${request.templateId ?? 'none'}, to=${request.to
          .map((r) => r.email)
          .join(',')}): ${message}`,
      );
      throw err;
    }
  }

  async sendTwoFactorSms(phone: string, code: string): Promise<void> {
    try {
      await this.http.post('/transactionalSMS/sms', {
        type: 'transactional',
        unicodeEnabled: false,
        sender: this.fromName,
        recipient: phone,
        content: `Your Marketeq verification code is: ${code}. It expires in 5 minutes.`,
      });
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const message = data ? JSON.stringify(data) : (err as Error)?.message || 'unknown error';
      this.logger.error(`Brevo SMS send failed (to=${phone}): ${message}`);

      if (data?.code === 'not_enough_credits') {
        throw new Error('SMS service is temporarily unavailable. Please try authenticator app instead.');
      }
      if (data?.code === 'unauthorized' || err?.response?.status === 401) {
        throw new Error('SMS service configuration error. Please contact support.');
      }
      throw err;
    }
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
