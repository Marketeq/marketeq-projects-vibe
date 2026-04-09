import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private readonly sendgridEnabled: boolean;
  private sendgridTemporarilyDisabled = false;
  private readonly smtpEnabled: boolean;
  private readonly smtpTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null;
  private readonly fromEmail: string;

  constructor() {
    const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim() || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@marketeq.com';

    if (sendgridApiKey.startsWith('SG.')) {
      sgMail.setApiKey(sendgridApiKey);
      this.sendgridEnabled = true;
    } else {
      this.sendgridEnabled = false;
      this.logger.warn('SENDGRID_API_KEY is missing or invalid; falling back to SMTP if configured.');
    }

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPassword = process.env.SMTP_PASSWORD?.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (smtpHost && smtpUser && smtpPassword) {
      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      this.smtpEnabled = true;
    } else {
      this.smtpTransporter = null;
      this.smtpEnabled = false;
      this.logger.warn('SMTP is not fully configured; outbound emails may not be delivered.');
    }
  }

  async sendNotificationEmail(to: string, title: string, body: string, link?: string) {
    const html = `<p>${body}</p>${link ? `<p><a href="${link}">View on Marketeq</a></p>` : ''}`;

    this.logger.log(`Attempting to send email to=${to} subject="${title}" sendgrid=${this.sendgridEnabled && !this.sendgridTemporarilyDisabled} smtp=${this.smtpEnabled}`);

    if (this.sendgridEnabled && !this.sendgridTemporarilyDisabled) {
      try {
        const [response] = await sgMail.send({
          to,
          from: this.fromEmail,
          subject: title,
          html,
        });
        this.logger.log(`SendGrid success for ${to}: statusCode=${response.statusCode} headers=${JSON.stringify(response.headers?.['x-message-id'] ?? 'n/a')}`);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const statusCode = (err as any)?.code ?? (err as any)?.response?.statusCode;
        const responseBody = (err as any)?.response?.body;
        const unauthorized = statusCode === 401 || statusCode === 403 || /unauthorized|forbidden/i.test(message);

        this.logger.error(`SendGrid failed for ${to}: status=${statusCode} message=${message} body=${JSON.stringify(responseBody ?? 'n/a')}`);

        if (unauthorized) {
          this.sendgridTemporarilyDisabled = true;
          this.logger.warn('SendGrid returned unauthorized/forbidden; disabling SendGrid for this runtime and falling back to SMTP.');
        }
      }
    }

    if (this.smtpEnabled && this.smtpTransporter) {
      try {
        const info = await this.smtpTransporter.sendMail({
          to,
          from: this.fromEmail,
          subject: title,
          html,
        });
        this.logger.log(`SMTP success for ${to}: messageId=${info.messageId} response=${info.response}`);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`SMTP delivery failed for ${to}: ${message}`);
      }
    }

    this.logger.warn(`No email transport available for ${to}; notification email not delivered. sendgridEnabled=${this.sendgridEnabled} sendgridDisabledRuntime=${this.sendgridTemporarilyDisabled} smtpEnabled=${this.smtpEnabled}`);
  }

  async sendMagicLink(to: string, link: string) {
    try {
      await this.sendNotificationEmail(
        to,
        'Verify your phone number - Marketeq',
        'Click the link below to verify your phone number.',
        link,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send magic link to ${to}: ${message}`);
    }
  }
}
