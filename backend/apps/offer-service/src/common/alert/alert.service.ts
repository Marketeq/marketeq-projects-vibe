// apps/offer-service/src/common/alert/alert.service.ts
// OS-22: Engineering alert service — Slack webhook on FAILED outbox events.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutboxFailedAlertPayload {
  outboxId: string;
  aggregateId: string;
  eventType: string;
  retryCount: number;
  lastError: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly slackWebhookUrl: string | undefined;
  private readonly environment: string;

  constructor(private readonly config: ConfigService) {
    const cfg = this.config.get('offer') as any;
    this.slackWebhookUrl = cfg.alert?.slackWebhookUrl;
    this.environment = process.env.NODE_ENV ?? 'development';
  }

  async sendOutboxFailedAlert(payload: OutboxFailedAlertPayload): Promise<void> {
    if (!this.slackWebhookUrl) {
      this.logger.warn('ALERT_SLACK_WEBHOOK_URL not set. Slack alert skipped.');
      return;
    }

    const message = {
      text: `:red_circle: *[${this.environment.toUpperCase()}] OUTBOX FAILED — offer-service*`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: `🔴 OUTBOX FAILED — ${this.environment.toUpperCase()}` } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Service:*\noffer-service` },
            { type: 'mrkdwn', text: `*Event Type:*\n\`${payload.eventType}\`` },
            { type: 'mrkdwn', text: `*Retry Count:*\n${payload.retryCount}` },
            { type: 'mrkdwn', text: `*Offer ID:*\n${payload.aggregateId}` },
            { type: 'mrkdwn', text: `*Outbox ID:*\n${payload.outboxId}` },
            { type: 'mrkdwn', text: `*Last Error:*\n${payload.lastError.substring(0, 200)}` },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        this.logger.warn(`Slack alert HTTP error: ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(`Slack alert failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}