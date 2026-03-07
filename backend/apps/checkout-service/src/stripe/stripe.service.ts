import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  async createCheckoutSession(params: {
    clientId: string;
    amount: number;
    currency?: string;
    projectId?: string;
    contractId?: string;
    paymentMethod: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: params.paymentMethod === 'ach' ? ['us_bank_account'] : ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency || 'usd',
            product_data: { name: 'Marketeq Payment' },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        clientId: params.clientId,
        projectId: params.projectId || '',
        contractId: params.contractId || '',
        ...params.metadata,
      },
    });

    return session;
  }

  async createSubscription(params: {
    customerId: string;
    priceAmount: number;
    interval: 'month' | 'week';
    metadata?: Record<string, string>;
  }) {
    const price = await this.stripe.prices.create({
      unit_amount: Math.round(params.priceAmount * 100),
      currency: 'usd',
      recurring: { interval: params.interval },
      product_data: { name: 'Marketeq Installment' },
    });

    return this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: price.id }],
      metadata: params.metadata || {},
    });
  }

  async retrieveSession(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }
}
