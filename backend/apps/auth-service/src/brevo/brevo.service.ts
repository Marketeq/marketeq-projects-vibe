import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

const BREVO_API_BASE = 'https://api.brevo.com/v3';
const PASSWORD_CREATED_SUBJECT =
  'Your Account Password Has Been Successfully Created!';
const RECOVERY_EMAIL_SUBJECT = 'Set Up Your Account Recovery Email';
const EMAIL_FONT =
  "'Inter',-apple-system,'Segoe UI',Arial,Helvetica,sans-serif";

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
  private readonly recoveryEmailTemplateId?: number;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY || '';
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'support@marketeqdigital.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Marketeq Projects';

    const raw = process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID;
    this.passwordResetTemplateId = raw ? Number(raw) : undefined;
    const passwordCreatedRaw = process.env.BREVO_PASSWORD_CREATED_TEMPLATE_ID;
    this.passwordCreatedTemplateId = passwordCreatedRaw ? Number(passwordCreatedRaw) : undefined;
    const recoveryEmailRaw = process.env.BREVO_RECOVERY_EMAIL_TEMPLATE_ID;
    this.recoveryEmailTemplateId = recoveryEmailRaw ? Number(recoveryEmailRaw) : undefined;

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

  /**
   * Confirmation link for adding a recovery email.
   *
   * Sent to the requested address, never to the account's current one — the
   * whole point is to prove whoever asked can read the new inbox.
   */
  async sendRecoveryEmailVerification(
    to: string,
    params: { firstName?: string; confirmUrl: string },
  ): Promise<void> {
    const request: SendTransacEmailRequest = {
      to: [{ email: to }],
      subject: RECOVERY_EMAIL_SUBJECT,
      params: {
        firstName: params.firstName ?? '',
        confirmUrl: params.confirmUrl,
      },
      tags: ['recovery-email'],
    };

    // A Brevo-hosted template wins when one is configured, matching how
    // password-reset and password-created behave. Without it the in-repo
    // layout below is used, so the flow works in an environment that has an
    // API key but no template set up.
    if (this.recoveryEmailTemplateId) {
      request.templateId = this.recoveryEmailTemplateId;
    } else {
      request.htmlContent = this.buildRecoveryEmailHtml(params);
    }

    await this.send(request);
  }

  /**
   * Table-based rather than flex: Gmail, Outlook and most desktop clients
   * strip or ignore modern layout CSS, so the Figma auto-layout is expressed
   * as nested tables with explicit spacer rows. The values are the Figma ones
   * — 724px frame, 660px content, 24px gaps, #344054 body, 260x36 button.
   */
  private buildRecoveryEmailHtml(params: {
    firstName?: string;
    confirmUrl: string;
  }): string {
    const firstName = this.escapeHtml(params.firstName?.trim() || 'there');
    const href = this.escapeAttribute(params.confirmUrl);
    const assetBase = this.resolveEmailAssetBase();
    const logo = assetBase
      ? `<img src="${this.escapeAttribute(`${assetBase}/email/marketeq-logo.png`)}" width="128" height="19" alt="Marketeq" style="display:block;width:128px;height:19px;border:0;" />`
      : `<span style="font-family:${EMAIL_FONT};font-size:20px;line-height:20px;font-weight:800;color:#22376B;letter-spacing:-0.4px;">Marketeq</span>`;

    const line = (html: string) =>
      `<tr><td style="font-family:${EMAIL_FONT};font-size:14px;line-height:20px;font-weight:500;color:#344054;padding:0 0 24px 0;">${html}</td></tr>`;

    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${this.escapeHtml(RECOVERY_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="724" style="width:724px;max-width:100%;">

      <tr><td style="padding:0 0 55px 0;">${logo}</td></tr>

      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="660" style="width:660px;max-width:100%;">
          ${line(`Hi ${firstName},`)}
          ${line('You have requested this email be added to your Marketeq account for account recovery.')}
          ${line('Please click the button below to enable account recovery for your account.')}
          ${line('This link will expire after <strong style="font-weight:700;">24 hours</strong>.')}
          ${line('If you are receiving this message in error, you can ignore this email.')}
          <tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="background-color:#306CFE;border-radius:5px;box-shadow:0px 1px 2px rgba(16,24,40,0.05);">
                <a href="${href}" style="display:inline-block;width:232px;padding:8px 14px;font-family:${EMAIL_FONT};font-size:14px;line-height:20px;font-weight:600;color:#ffffff;text-align:center;text-decoration:none;">Enable Account Recovery</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
  }

  /**
   * Where the wordmark is served from. Only https qualifies — a localhost base
   * renders as a broken image in a real inbox, so the text wordmark is the
   * better fallback. Mirrors notification-service's resolver.
   */
  private resolveEmailAssetBase(): string | undefined {
    const base = (process.env.EMAIL_ASSET_BASE_URL?.trim() || '').replace(
      /\/+$/,
      '',
    );
    if (!base) return undefined;
    try {
      return new URL(base).protocol === 'https:' ? base : undefined;
    } catch {
      return undefined;
    }
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
