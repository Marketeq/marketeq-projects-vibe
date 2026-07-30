// apps/payout-service/src/providers/stripe-webhook.controller.ts
// PS-05: Stripe Financial Connections + payout webhook handler.
// main.ts mounts `express.raw({ type: 'application/json' })` on exactly this
// path (/v1/webhooks/stripe) ahead of Nest's body parser, so req.body here is
// the raw Buffer Stripe's SDK needs for signature verification — parsed JSON
// would fail stripe.webhooks.constructEvent's check.

import { Controller, Post, Req, Headers, HttpCode, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { StripeProvider } from './stripe.provider';
import { Public } from '../decorators/public.decorator';

@Controller('v1/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeProvider: StripeProvider) {}

  // Stripe's servers call this directly — no Marketeq JWT exists to send.
  // Authenticity is verified entirely via the Stripe-Signature header below,
  // so this must bypass the app-wide JwtAuthGuard (APP_GUARD in app.module.ts).
  @Public()
  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: any;
    try {
      event = this.stripeProvider.constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature validation failed: ${(err as Error).message}`);
      return { received: false };
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'financial_connections.account.disconnected':
        await this.stripeProvider.handleFCDisconnected(event.data.object);
        break;
      case 'payout.paid':
        await this.stripeProvider.handlePayoutPaid(event.data.object);
        break;
      case 'payout.failed':
        await this.stripeProvider.handlePayoutFailed(event.data.object);
        break;
      case 'account.updated':
        await this.stripeProvider.handleAccountUpdated(event.data.object);
        break;
      default:
        this.logger.log(`Stripe webhook: unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
