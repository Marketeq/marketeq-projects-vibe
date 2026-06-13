import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

const BREVO_API_BASE = 'https://api.brevo.com/v3';
const PASSWORD_CREATED_SUBJECT =
  'Your Account Password Has Been Successfully Created!';

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
  private readonly passwordCreatedTemplateId?: number;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY || '';
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'support@marketeqdigital.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Marketeq Projects';

    const raw = process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID;
    this.passwordResetTemplateId = raw ? Number(raw) : undefined;
    const passwordCreatedRaw = process.env.BREVO_PASSWORD_CREATED_TEMPLATE_ID;
    this.passwordCreatedTemplateId = passwordCreatedRaw ? Number(passwordCreatedRaw) : undefined;

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

  async sendPasswordCreatedEmail(
    to: string,
    params: { firstName?: string; signInUrl?: string },
  ): Promise<void> {
    const request: SendTransacEmailRequest = {
      to: [{ email: to }],
      subject: PASSWORD_CREATED_SUBJECT,
      params: {
        firstName: params.firstName ?? '',
        signInUrl: params.signInUrl ?? '',
      },
      tags: ['password-created'],
    };

    if (this.passwordCreatedTemplateId) {
      request.templateId = this.passwordCreatedTemplateId;
    } else {
      request.htmlContent = this.buildPasswordCreatedHtml(params);
    }

    await this.send(request);
  }

  private buildPasswordCreatedHtml(params: {
    firstName?: string;
    signInUrl?: string;
  }): string {
    const firstName = this.escapeHtml(params.firstName?.trim() || 'there');
    const signInUrl = params.signInUrl?.trim();
    const ctaHtml = signInUrl
      ? `<p style="margin: 24px 0;"><a href="${this.escapeAttribute(signInUrl)}" style="background:#316BFF;border-radius:6px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:20px;padding:12px 18px;text-decoration:none;">Sign in to Marketeq</a></p>`
      : '';

    return `<!doctype html>
<html>
  <body style="background:#ffffff;margin:0;padding:0;">
    <main style="color:#25324B;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.45;margin:0 auto;max-width:640px;padding:40px 24px;">
      <div style="color:#1D3B7A;font-size:20px;font-weight:700;margin-bottom:24px;">Marketeq</div>
      <p>Dear ${firstName},</p>
      <p>Welcome to Marketeq Projects! We're excited to have you on board. This is a quick confirmation that your password has been successfully created for your new account.</p>
      <p>What's Next?</p>
      <p>You can now use your password to log into your account and start exploring!</p>
      ${ctaHtml}
      <p>If you didn't create this account, please contact our support team immediately at <a href="mailto:support@marketeqdigital.com" style="color:#25324B;">support@marketeqdigital.com</a>, and we'll assist you in securing your information.</p>
      <p>Thank you for choosing Marketeq for all your digital project needs. We look forward to helping you achieve your goals.</p>
      <p style="margin-top:28px;">Best regards,</p>
      <p>The Marketeq Projects Team</p>
    </main>
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
