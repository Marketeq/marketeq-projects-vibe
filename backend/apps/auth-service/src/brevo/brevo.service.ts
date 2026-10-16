import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

const BREVO_API_BASE = 'https://api.brevo.com/v3';
const PASSWORD_CREATED_SUBJECT =
  'Your Account Password Has Been Successfully Created!';
const PASSWORD_CHANGED_SUBJECT = 'Your Password Has Been Changed';
const RECOVERY_EMAIL_SUBJECT = 'Set Up Your Account Recovery Email';

/** Shared stack for the table-based templates below. */
const EMAIL_FONT =
  "'Inter',-apple-system,'Segoe UI',Arial,Helvetica,sans-serif";

/**
 * The Marketeq lockup, served from Brevo's own content library — the same
 * asset the password-reset template (id 2) already uses, so it is a URL that
 * is known to render in the clients our mail actually reaches.
 *
 * It has to be a hosted raster: the vector source
 * (frontend/components/icons/marketeq-logo.tsx) cannot be inlined because
 * Gmail strips <svg> and blocks data: image URIs.
 *
 * The file is 256x38, i.e. 2x the 128x19 it is displayed at, so it stays sharp
 * on high-DPI screens.
 */
const MARKETEQ_LOGO_URL =
  'https://img.mailinblue.com/10971309/images/content_library/original/6a508977bb8791bb42794f96.png';

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
  private readonly passwordChangedTemplateId?: number;
  private readonly recoveryEmailTemplateId?: number;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY || '';
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'support@marketeqdigital.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Marketeq Projects';

    const raw = process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID;
    this.passwordResetTemplateId = raw ? Number(raw) : undefined;
    const passwordCreatedRaw = process.env.BREVO_PASSWORD_CREATED_TEMPLATE_ID;
    this.passwordCreatedTemplateId = passwordCreatedRaw ? Number(passwordCreatedRaw) : undefined;
    const passwordChangedRaw = process.env.BREVO_PASSWORD_CHANGED_TEMPLATE_ID;
    this.passwordChangedTemplateId = passwordChangedRaw ? Number(passwordChangedRaw) : undefined;
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
   * Security notification sent after a password is actually changed.
   *
   * The when/device/where lines exist so someone who did *not* change their
   * password can recognise that from the email alone. Each value is optional:
   * the user-agent and the IP can legitimately be absent (a non-browser
   * client, a proxy that strips them), and a line that would read
   * "Device: unknown" tells the reader nothing while implying we looked. Such
   * a line is omitted instead.
   */
  async sendPasswordChangedEmail(
    to: string,
    params: {
      firstName?: string;
      when?: string;
      device?: string;
      where?: string;
      changePasswordUrl?: string;
    },
  ): Promise<void> {
    const request: SendTransacEmailRequest = {
      to: [{ email: to }],
      subject: PASSWORD_CHANGED_SUBJECT,
      params: {
        firstName: params.firstName ?? '',
        when: params.when ?? '',
        device: params.device ?? '',
        where: params.where ?? '',
        changePasswordUrl: params.changePasswordUrl ?? '',
      },
      tags: ['password-changed'],
    };

    if (this.passwordChangedTemplateId) {
      request.templateId = this.passwordChangedTemplateId;
    } else {
      request.htmlContent = this.buildPasswordChangedHtml(params);
    }

    await this.send(request);
  }

  /**
   * Figma values, kept literal: 724px frame with 40px vertical padding and a
   * 660px content column, 24px between blocks, Inter 14px/20px, body weight
   * 500 and labels 700, text #22376B (Dark Blue/400), link #306CFE
   * (Primary/500).
   *
   * Inline styles and no flexbox because email clients strip <style> blocks
   * and do not lay out flex. Inter is named first but will not load in most
   * clients, hence the Arial/Helvetica fallback.
   *
   * The logo is the full Figma lockup at its specified 128px width. Height is
   * set to 19px rather than the Figma's 18.81px: the hosted asset's own aspect
   * ratio puts it at 19.00px there, and forcing the fractional value would
   * distort it by more than the 0.19px it would correct.
   */
  private buildPasswordChangedHtml(params: {
    firstName?: string;
    when?: string;
    device?: string;
    where?: string;
    changePasswordUrl?: string;
  }): string {
    const firstName = this.escapeHtml(params.firstName?.trim() || 'there');
    const changePasswordUrl = params.changePasswordUrl?.trim();

    const linkText = 'change your password';
    const linkHtml = changePasswordUrl
      ? `<a href="${this.escapeAttribute(changePasswordUrl)}" style="color:#306CFE;text-decoration:underline;">${linkText}</a>`
      : linkText;

    const detail = (label: string, value?: string): string => {
      const trimmed = value?.trim();
      if (!trimmed) return '';
      return `<div style="margin:0;"><span style="font-weight:700;">${this.escapeHtml(label)}:</span> ${this.escapeHtml(trimmed)}</div>`;
    };

    const details = [
      detail('When', params.when),
      detail('Device', params.device),
      detail('Where', params.where),
    ].join('');

    const detailsBlock = details
      ? `<div style="margin:24px 0 0;">${details}</div>`
      : '';

    return `<!doctype html>
<html>
  <body style="background:#ffffff;margin:0;padding:0;">
    <div style="color:#22376B;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:14px;font-weight:500;line-height:20px;margin:0 auto;max-width:724px;padding:40px 24px;">
      <img src="${MARKETEQ_LOGO_URL}" alt="Marketeq" width="128" height="19" style="border:0;display:block;height:19px;margin:0 0 32px;max-width:100%;outline:none;text-decoration:none;width:128px;" />
      <div style="max-width:660px;">
        <p style="margin:0 0 24px;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;">Your Marketeq password has been successfully updated.</p>
        <p style="margin:0;">If you did not perform this action, you should ${linkHtml} right away. If this was you, you can safely ignore this email.</p>
        ${detailsBlock}
        <p style="margin:24px 0 0;">Thanks,</p>
        <p style="font-weight:700;margin:0;">The Marketeq Team</p>
      </div>
    </div>
  </body>
</html>`;
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
   *
   * The logo comes from MARKETEQ_LOGO_URL rather than an env-gated asset base,
   * so it matches the other two templates in this file and renders without any
   * extra configuration.
   */
  private buildRecoveryEmailHtml(params: {
    firstName?: string;
    confirmUrl: string;
  }): string {
    const firstName = this.escapeHtml(params.firstName?.trim() || 'there');
    const href = this.escapeAttribute(params.confirmUrl);

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

      <tr><td style="padding:0 0 55px 0;"><img src="${MARKETEQ_LOGO_URL}" alt="Marketeq" width="128" height="19" style="border:0;display:block;height:19px;max-width:100%;outline:none;text-decoration:none;width:128px;" /></td></tr>

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
}
