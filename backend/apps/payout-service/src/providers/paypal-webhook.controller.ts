// apps/payout-service/src/providers/paypal-webhook.controller.ts
// PayPal Payouts webhook handler — closes the gap flagged in
// paypal-payout-executor.service.ts: without this, a PayPal payout stays at
// PayoutStatus.PROCESSING forever, since PayPal Payouts settle asynchronously
// and nothing was listening for the outcome. Mirrors stripe-webhook.controller.ts.

import { Controller, Post, Req, Headers, HttpCode, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PaypalProvider } from './paypal.provider';
import { Public } from '../decorators/public.decorator';

@Controller('v1/webhooks')
export class PaypalWebhookController {
  private readonly logger = new Logger(PaypalWebhookController.name);

  constructor(private readonly paypalProvider: PaypalProvider) {}

  // PayPal's servers call this directly — no Marketeq JWT exists to send.
  // Authenticity is verified via a server-to-server call to PayPal's own
  // verify-webhook-signature API (see PaypalProvider.verifyWebhookSignature),
  // not a local HMAC check, so this endpoint needs the normal parsed JSON
  // body rather than the raw buffer Stripe's webhook route requires.
  @Public()
  @Post('paypal')
  @HttpCode(200)
  async handlePaypalWebhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
    const event = req.body as any;

    const verified = await this.paypalProvider.verifyWebhookSignature(headers, event);
    if (!verified) {
      this.logger.warn(`PayPal webhook signature verification failed for event ${event?.id}`);
      return { received: false };
    }

    this.logger.log(`PayPal webhook received: ${event.event_type}`);

    switch (event.event_type) {
      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
        await this.paypalProvider.handlePayoutItemSucceeded(event.resource);
        break;
      case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      case 'PAYMENT.PAYOUTS-ITEM.DENIED':
      case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
      case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
      case 'PAYMENT.PAYOUTS-ITEM.CANCELED':
        await this.paypalProvider.handlePayoutItemFailed(event.resource, event.event_type);
        break;
      default:
        this.logger.log(`PayPal webhook: unhandled event type ${event.event_type}`);
    }

    return { received: true };
  }
}
