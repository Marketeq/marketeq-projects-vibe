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

  async sendShareProjectEmail(
    to: string,
    params: {
      sharerName?: string;
      projectTitle?: string;
      projectUrl: string;
      note?: string;
    },
  ): Promise<void> {
    const sharer = params.sharerName?.trim();
    const projectTitle = params.projectTitle?.trim();
    const note = params.note?.trim();
    const subject = projectTitle
      ? `${projectTitle} was shared with you – Marketeq`
      : 'A project was shared with you – Marketeq';

    await this.send({
      to: [{ email: to }],
      subject,
      htmlContent: this.buildShareProjectHtml({
        sharerName: sharer,
        projectTitle,
        projectUrl: params.projectUrl,
        note,
      }),
      tags: ['share-project'],
    });
  }

  private buildShareProjectHtml(params: {
    sharerName?: string;
    projectTitle?: string;
    projectUrl: string;
    note?: string;
  }): string {
    const sharer = params.sharerName
      ? this.escapeHtml(params.sharerName)
      : '';
    const projectUrl = this.escapeAttribute(params.projectUrl);
    const projectTitle = params.projectTitle
      ? this.escapeHtml(params.projectTitle)
      : 'a project';

    const introHtml = sharer
      ? `<p><strong>${sharer}</strong> shared <strong>${projectTitle}</strong> with you on Marketeq.</p>`
      : `<p><strong>${projectTitle}</strong> has been shared with you on Marketeq.</p>`;

    const noteHtml = params.note
      ? `<p style="background:#F8F9FB;border-left:3px solid #316BFF;border-radius:4px;color:#515B6F;margin:20px 0;padding:12px 16px;">${this.escapeHtml(
          params.note,
        )}</p>`
      : '';

    return `<!doctype html>
<html>
  <body style="background:#ffffff;margin:0;padding:0;">
    <main style="color:#25324B;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.45;margin:0 auto;max-width:640px;padding:40px 24px;">
      <div style="color:#1D3B7A;font-size:20px;font-weight:700;margin-bottom:24px;">Marketeq</div>
      <p>Hi there,</p>
      ${introHtml}
      <p>Take a look at the project and see if it's a good fit for you.</p>
      ${noteHtml}
      <p style="margin: 24px 0;"><a href="${projectUrl}" style="background:#316BFF;border-radius:6px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:20px;padding:12px 18px;text-decoration:none;">View project on Marketeq</a></p>
      <p style="color:#515B6F;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br /><a href="${projectUrl}" style="color:#316BFF;word-break:break-all;">${projectUrl}</a></p>
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
