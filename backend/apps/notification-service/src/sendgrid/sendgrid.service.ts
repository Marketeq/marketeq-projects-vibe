import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendNotificationEmail(to: string, title: string, body: string, link?: string) {
    try {
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@marketeq.com',
        subject: title,
        html: `<p>${body}</p>${link ? `<p><a href="${link}">View on Marketeq</a></p>` : ''}`,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendMagicLink(to: string, link: string) {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@marketeq.com',
      subject: 'Verify your phone number – Marketeq',
      html: `<p>Click the link below to verify your phone number:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    });
  }
}
