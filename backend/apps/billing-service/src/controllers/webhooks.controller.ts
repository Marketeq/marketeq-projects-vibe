import { Controller, Post, Req, Headers, RawBodyRequest, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from '../services/billing.service';
import { StripeSubscriptionService } from '../services/stripe-subscription.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly stripeService: StripeSubscriptionService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing Stripe signature');

    let event: any;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody!, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.billing.handleInvoicePaid(
          event.data.object.id,
          event.data.object.amount_paid,
        );
        break;

      case 'invoice.payment_failed':
        await this.billing.handlePaymentFailed(
          event.data.object.id,
          event.data.object.last_finalization_error?.message ?? 'unknown',
        );
        break;

      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
