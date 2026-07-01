import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { BillingFrequency } from '../entities/subscription.entity';
import {
  calculateInstallmentCount,
  getStripeInterval,
} from '../utils/installment-calculator';

@Injectable()
export class StripeSubscriptionService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeSubscriptionService.name);

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<{
    stripeSubscriptionId: string;
    installmentAmount: number;
    totalInstallments: number;
  }> {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const totalInstallments = endDate
      ? calculateInstallmentCount(startDate, endDate, dto.frequency)
      : 0; // ongoing

    if (totalInstallments === 0 && endDate) {
      throw new BadRequestException('Could not calculate installment count from provided dates');
    }

    const installmentAmountCents = totalInstallments > 0
      ? Math.ceil(dto.totalAmountCents / totalInstallments)
      : dto.totalAmountCents; // for ongoing, use the provided amount as recurring amount

    const { interval, interval_count } = getStripeInterval(dto.frequency);

    const subscription = await this.stripe.subscriptions.create({
      customer: dto.stripeCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: dto.description || `Marketeq Installment Plan`,
          },
          unit_amount: installmentAmountCents,
          recurring: { interval, interval_count },
        } as any,
      }],
      billing_cycle_anchor: Math.floor(startDate.getTime() / 1000),
      proration_behavior: 'none',
      metadata: {
        groupId: dto.groupId,
        clientId: dto.clientId,
        frequency: dto.frequency,
        totalInstallments: String(totalInstallments),
        projectId: dto.projectId ?? '',
        serviceId: dto.serviceId ?? '',
      },
    });

    this.logger.log(`Created Stripe subscription ${subscription.id} for group ${dto.groupId}`);

    return {
      stripeSubscriptionId: subscription.id,
      installmentAmount: installmentAmountCents / 100,
      totalInstallments,
    };
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(stripeSubscriptionId);
    this.logger.log(`Canceled Stripe subscription ${stripeSubscriptionId}`);
  }

  async pauseSubscription(stripeSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });
    this.logger.log(`Paused Stripe subscription ${stripeSubscriptionId}`);
  }

  async resumeSubscription(stripeSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: '',
    } as any);
    this.logger.log(`Resumed Stripe subscription ${stripeSubscriptionId}`);
  }

  async retrieveInvoice(stripeInvoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(stripeInvoiceId);
  }

  async refundInvoice(stripeInvoiceId: string, amountCents?: number): Promise<Stripe.Refund> {
    const invoice = await this.stripe.invoices.retrieve(stripeInvoiceId);
    const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id;
    if (!chargeId) {
      throw new BadRequestException('No charge found on this invoice');
    }

    const params: Stripe.RefundCreateParams = { charge: chargeId };
    if (amountCents) params.amount = amountCents;

    const refund = await this.stripe.refunds.create(params);
    this.logger.log(`Refund ${refund.id} created for invoice ${stripeInvoiceId}`);
    return refund;
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }
}
