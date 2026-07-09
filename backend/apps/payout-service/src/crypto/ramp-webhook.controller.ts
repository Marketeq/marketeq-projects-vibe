// apps/payout-service/src/crypto/ramp-webhook.controller.ts
// PS-11 §2.5: Ramp webhook handler for payout status events
// Events: RELEASE_CREATED, RELEASE_FINISHED, RELEASE_FAILED

import { Controller, Post, Req, Headers, HttpCode, Logger, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PayoutError } from '../common/errors/payout.error';
import { AuditService } from '../audit/audit.service';

@Controller('v1/webhooks')
export class RampWebhookController {
  private readonly logger = new Logger(RampWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Post('ramp')
  @HttpCode(200)
  async handleRampWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-ramp-signature') signature: string,
  ) {
    // 1. Validate HMAC signature
    const secret = this.config.get('RAMP_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('RAMP_WEBHOOK_SECRET not configured — rejecting webhook');
      return { received: false };
    }

    const rawBody = (req as any).rawBody ?? Buffer.from(JSON.stringify((req as any).body));
    if (!this.validateSignature(rawBody, signature, secret)) {
      this.logger.warn('Ramp webhook signature validation failed');
      return { received: false };
    }

    // 2. Parse event
    const event = typeof (req as any).body === 'string'
      ? JSON.parse((req as any).body)
      : (req as any).body;
    const eventType = event?.type ?? event?.event;

    this.logger.log(`Ramp webhook received: ${eventType}`);

    // 3. Handle events (payout execution — stub for future PS docs)
    switch (eventType) {
      case 'RELEASE_CREATED':
        // Ramp initiated the payout — update payout_request status
        this.logger.log(`Ramp RELEASE_CREATED: ${JSON.stringify(event.payload?.id ?? 'unknown')}`);
        break;

      case 'RELEASE_FINISHED':
        // Crypto delivered to contractor wallet
        this.logger.log(`Ramp RELEASE_FINISHED: ${JSON.stringify(event.payload?.id ?? 'unknown')}`);
        break;

      case 'RELEASE_FAILED':
        // Payout failed at Ramp level
        this.logger.warn(`Ramp RELEASE_FAILED: ${JSON.stringify(event.payload ?? {})}`);
        break;

      default:
        this.logger.log(`Ramp webhook: unhandled event type ${eventType}`);
    }

    return { received: true };
  }

  // PS-11 §2.5: HMAC-SHA256 signature validation
  private validateSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    if (!signature) return false;
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expected, 'utf8'),
      );
    } catch {
      return false;
    }
  }
}