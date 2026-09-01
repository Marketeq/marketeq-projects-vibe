// apps/payout-service/src/providers/paypal.provider.ts
// PayPal Payouts API — https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
// Server-to-server: OAuth2 client_credentials token, then POST a payout batch
// with the contractor's PayPal email as the receiver. Distinct from the
// "Log in with PayPal" OAuth flow in oauth.service.ts (identity only) — this
// uses the same app credentials but the Payouts API scope/endpoints instead.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { PayoutError } from '../common/errors/payout.error';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';

@Injectable()
export class PaypalProvider {
  private readonly logger = new Logger(PaypalProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiBase: string;
  private readonly webhookId: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {
    this.clientId = this.config.get('PAYPAL_CLIENT_ID', '');
    this.clientSecret = this.config.get('PAYPAL_CLIENT_SECRET', '');
    this.webhookId = this.config.get('PAYPAL_WEBHOOK_ID', '');
    const mode = this.config.get('PAYPAL_MODE', 'sandbox');
    this.apiBase = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.apiBase}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: this.clientId, password: this.clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10_000,
      },
    );
    return response.data.access_token;
  }

  async createPayout(
    payoutRequestId: string, receiverEmail: string, amountUsd: number,
  ): Promise<{ payoutBatchId: string; payoutItemId: string; status: string }> {
    if (!this.isConfigured()) {
      throw new PayoutError('PayPal is not configured.', HttpStatus.SERVICE_UNAVAILABLE, 'ERR_PAYPAL_NOT_CONFIGURED');
    }

    const token = await this.getAccessToken();
    // sender_batch_id doubles as the idempotency key PayPal-Request-Id — a
    // retry of the same payoutRequestId will not double-pay.
    const senderBatchId = `payout_${payoutRequestId}`;

    this.logger.log(`Creating PayPal payout batch for ${payoutRequestId} → ${receiverEmail} ($${amountUsd})`);

    const response = await axios.post(
      `${this.apiBase}/v1/payments/payouts`,
      {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: 'You have a payout from Marketeq!',
          email_message: 'You have received a payout from Marketeq. Thanks for your work!',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: { value: amountUsd.toFixed(2), currency: 'USD' },
            receiver: receiverEmail,
            note: 'Marketeq contractor payout',
            sender_item_id: payoutRequestId,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': senderBatchId,
        },
        timeout: 15_000,
      },
    );

    const batch = response.data;
    const item = batch.items?.[0];
    return {
      payoutBatchId: batch.batch_header.payout_batch_id,
      payoutItemId: item?.payout_item_id ?? '',
      status: batch.batch_header.batch_status,
    };
  }

  // Polling fallback for PaypalReconciliationCron — createPayout()'s response
  // doesn't reliably include payout_item_id yet (see findPayoutByBatchOrItem
  // below), so a fresh GET here is also how the item ID gets backfilled for
  // payouts that started with only the batch ID recorded.
  async getPayoutBatch(payoutBatchId: string): Promise<{ item: any } | null> {
    if (!this.isConfigured()) return null;
    const token = await this.getAccessToken();
    const response = await axios.get(`${this.apiBase}/v1/payments/payouts/${payoutBatchId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    const item = response.data.items?.[0];
    return item ? { item } : null;
  }

  // ─── Webhook event verification ───────────────────────────────
  // Unlike Stripe's local HMAC check, PayPal verifies webhook authenticity
  // via a server-to-server call to its own API — the headers below plus the
  // raw parsed event body are sent back to PayPal, which returns
  // verification_status: SUCCESS | FAILURE. No raw-body express middleware
  // is needed for this (unlike /v1/webhooks/stripe in main.ts).
  async verifyWebhookSignature(
    headers: Record<string, string | undefined>,
    event: any,
  ): Promise<boolean> {
    if (!this.isConfigured() || !this.webhookId) {
      this.logger.warn('PayPal webhook verification skipped: PAYPAL_WEBHOOK_ID not configured.');
      return false;
    }

    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        `${this.apiBase}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: this.webhookId,
          webhook_event: event,
        },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 10_000,
        },
      );
      return response.data?.verification_status === 'SUCCESS';
    } catch (err: any) {
      this.logger.error(`PayPal webhook verification call failed: ${JSON.stringify(err.response?.data ?? err.message)}`);
      return false;
    }
  }

  // TypeORM silently drops an `undefined` property from a where clause
  // rather than treating it as "no match" — passing payoutItemId straight
  // through when PayPal omits it would turn that branch into an
  // unconditional match against the first row. Build the OR list from only
  // the IDs actually present on the event.
  private async findPayoutByBatchOrItem(
    payoutItemId: string | undefined,
    payoutBatchId: string | undefined,
  ): Promise<PayoutRequest | null> {
    const where: Array<Record<string, string>> = [];
    if (payoutItemId) where.push({ externalTransactionId: payoutItemId });
    if (payoutBatchId) where.push({ externalTransactionId: payoutBatchId }, { providerReference: payoutBatchId });
    if (where.length === 0) return null;
    return this.payoutRepo.findOne({ where });
  }

  // ─── Webhook handlers ─────────────────────────────────────────
  // Matched by payoutItemId — payout-item-level events (not batch-level),
  // which is what payout_item_id in items[0] above corresponds to. Mirrors
  // StripeProvider.handlePayoutPaid/handlePayoutFailed exactly, since
  // paypal-payout-executor.service.ts leaves status at PROCESSING and relies
  // entirely on this handler to move it to COMPLETED/FAILED.
  async handlePayoutItemSucceeded(resource: any) {
    const payoutItemId = resource.payout_item_id;
    const payoutBatchId = resource.payout_batch_id;
    this.logger.log(`PayPal PAYOUTS-ITEM.SUCCEEDED: item ${payoutItemId}, batch ${payoutBatchId}`);
    // Matched by batch ID, not item ID: createPayout()'s response doesn't
    // reliably include payout_item_id at creation time (PayPal populates it
    // slightly after the batch is created), so the executor's
    // `payoutItemId || payoutBatchId` fallback stores the batch ID as
    // externalTransactionId in practice — confirmed against a real sandbox
    // payout where the item ID differed from what was actually persisted.
    const payout = await this.findPayoutByBatchOrItem(payoutItemId, payoutBatchId);
    if (!payout) {
      this.logger.warn(`payout item succeeded for unknown batch ${payoutBatchId} / item ${payoutItemId}`);
      return;
    }

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.COMPLETED,
      completedAt: new Date(),
      settledAt: new Date(),
      providerStatus: 'SUCCESS',
      externalTransactionId: payoutItemId ?? payout.externalTransactionId,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'paypal-webhook',
      action: 'paypal.payout.settled',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.COMPLETED,
      metadata: { payoutItemId, payoutBatchId },
    });

    await this.publisher.publishPayoutCompleted({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'PAYPAL',
      settledAt: new Date().toISOString(),
    });
  }

  // Covers FAILED, DENIED, BLOCKED, RETURNED, and CANCELED item events — all
  // terminal non-success states PayPal reports for a payout item.
  async handlePayoutItemFailed(resource: any, eventType: string) {
    const payoutItemId = resource.payout_item_id;
    const payoutBatchId = resource.payout_batch_id;
    this.logger.log(`PayPal ${eventType}: item ${payoutItemId}, batch ${payoutBatchId}`);
    // Same batch-ID fallback as handlePayoutItemSucceeded above.
    const payout = await this.findPayoutByBatchOrItem(payoutItemId, payoutBatchId);
    if (!payout) {
      this.logger.warn(`${eventType} for unknown batch ${payoutBatchId} / item ${payoutItemId}`);
      return;
    }

    const reason = resource.errors?.message ?? `PayPal payout ${resource.transaction_status ?? eventType}.`;
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      providerStatus: resource.transaction_status ?? eventType,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'paypal-webhook',
      action: 'paypal.payout.failed',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.FAILED,
      metadata: { payoutItemId, eventType },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'PAYPAL',
      reason,
      failedAt: new Date().toISOString(),
    });
  }
}
