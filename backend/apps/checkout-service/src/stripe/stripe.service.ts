import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as any,
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  async createFinancialConnectionsSession(params: {
    customerId: string;
    permissions: Array<'balances' | 'ownership' | 'payment_method' | 'transactions'>;
  }) {
    return this.stripe.financialConnections.sessions.create({
      account_holder: { type: 'customer', customer: params.customerId },
      permissions: params.permissions,
    });
  }

  async createPaymentMethodFromFinancialAccount(financialAccountId: string) {
    return this.stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: { financial_connections_account: financialAccountId },
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    customerId?: string;
    paymentMethodTypes?: string[];
    paymentMethodId?: string;
    metadata?: Record<string, string>;
    confirm?: boolean;
  }) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency || 'usd',
      customer: params.customerId,
      payment_method_types: params.paymentMethodTypes || ['card'],
      payment_method: params.paymentMethodId,
      confirm: params.confirm || false,
      metadata: params.metadata || {},
    });
  }

  async retrievePaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }
}
