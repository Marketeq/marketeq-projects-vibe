// apps/payout-service/src/card/card-payout-executor.service.ts
// PS-13 §4: Push-to-card payout execution via Stripe Issuing.
// Moves USD from Marketeq Stripe balance to card spending balance.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutError } from '../common/errors/payout.error';
import { PayoutPublisher } from '../publishers/payout.publisher';

const CARD_BALANCE_CAP = 10_000; // $10,000 max balance

@Injectable()
export class CardPayoutExecutorService {
  private readonly logger = new Logger(CardPayoutExecutorService.name);
  private stripe: any = null;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {
    const key = this.config.get('STRIPE_SECRET_KEY', '');
    if (key && key !== 'sk_test_YOUR_TEST_KEY_HERE') {
      try {
        const Stripe = require('stripe');
        this.stripe = new Stripe(key, { apiVersion: '2024-06-20' });
      } catch { this.logger.warn('Stripe SDK not available — using stubs'); }
    }
  }

  /**
   * PS-13 §4: Execute a debit card payout.
   * Pushes USD from Marketeq Stripe balance to card spending balance.
   */
  async executeCardPayout(payoutRequestId: string): Promise<void> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });

    if (!payout) {
      this.logger.error(`Payout request not found: ${payoutRequestId}`);
      return;
    }

    const method = payout.depositMethod;
    if (!method || method.methodType !== MethodType.MARKETEQ_DEBIT_CARD) {
      this.logger.error(`Payout ${payoutRequestId} is not DEBIT_CARD type`);
      return;
    }

    // Pre-flight checks
    // PS-24 §11: this is "not yet activated," not "not found" — the row
    // exists, method.methodType/existence were already confirmed above.
    // ERR_CARD_NOT_FOUND is for a depositMethodId that doesn't resolve to a
    // DEBIT_CARD method at all, a different failure than this one.
    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.failPayout(payout, 'Card has not been activated.', 'ERR_CARD_NOT_ACTIVATED');
      return;
    }

    if (method.cardStatus === 'frozen') {
      await this.failPayout(payout, 'Card is frozen. Unfreeze to receive payouts.', 'ERR_CARD_FROZEN');
      return;
    }

    if (method.cardStatus === 'canceled') {
      await this.failPayout(payout, 'Card has been canceled.', 'ERR_CARD_CANCELED');
      return;
    }

    // PS-13 §5: Balance cap check
    // In production, query Stripe for current card balance
    // For now, use cap as static check
    const amountUsd = parseFloat(payout.netAmountUsd);
    const cap = parseFloat(method.cardBalanceCap ?? String(CARD_BALANCE_CAP));
    if (amountUsd > cap) {
      await this.failPayout(payout,
        `Payout would exceed card balance cap of $${cap}. Spend down your card balance first.`,
        'ERR_CARD_BALANCE_CAP_EXCEEDED');
      return;
    }

    // Mark as processing
    await this.payoutRepo.update(payoutRequestId, {
      status: PayoutStatus.PROCESSING,
      processingAt: new Date(),
    });

    try {
      const amountCents = Math.round(amountUsd * 100);
      let stripeTransactionId = `txn_stub_${Date.now()}`;

      if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
        // Production: use Stripe Issuing funding
        // Exact API confirmed during card program setup
        const funding = await this.stripe.testHelpers.issuing.cards.fundCard(
          method.stripeCardId,
          { amount: amountCents, currency: 'usd' },
        );
        stripeTransactionId = funding.id;
      } else {
        this.logger.log(`[STUB] Card payout: $${amountUsd} to card ••••${method.cardLast4} (${stripeTransactionId})`);
      }

      // Settlement is near-instant for card funding
      await this.payoutRepo.update(payoutRequestId, {
        status: PayoutStatus.COMPLETED,
        completedAt: new Date(),
        settledAt: new Date(),
        providerReference: stripeTransactionId,
        providerStatus: 'settled',
        externalTransactionId: stripeTransactionId,
        bridgeProvider: 'STRIPE_ISSUING',
      });

      await this.methodRepo.update(method.id, {
        lastPayoutAt: new Date(),
      });

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'card.payout.completed',
        previousStatus: PayoutStatus.PROCESSING,
        newStatus: PayoutStatus.COMPLETED,
        metadata: { stripeTransactionId, amountCents },
      });

      // Releases the instant hold placed at magic-link confirmation
      // (BalanceService.holdForPayout) into total_paid_out_usd. This executor
      // was the only one that never published a terminal event; without it a
      // completed card payout leaves the amount stranded in pending_hold_usd
      // forever. amountUsd (gross) — not netAmountUsd — is what was held, so
      // it is what must be released, same as the crypto/bank executors.
      await this.publisher.publishPayoutCompleted({
        contractorId: payout.contractorId,
        payoutRequestId,
        amount: payout.amountUsd,
        currency: 'USD',
        methodType: 'MARKETEQ_DEBIT_CARD',
        settledAt: new Date().toISOString(),
      });

      this.logger.log(`Card payout completed: ${payoutRequestId} → $${amountUsd} to ••••${method.cardLast4}`);

    } catch (err: any) {
      this.logger.error(`Card payout failed: ${payoutRequestId} — ${err.message}`);
      await this.failPayout(payout, err.message, 'ERR_CARD_PAYOUT_FAILED');
    }
  }

  private async failPayout(payout: PayoutRequest, reason: string, errorCode: string): Promise<void> {
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'card.payout.failed',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { reason, errorCode },
    });

    // Restores available_balance. The balance is debited up-front now
    // (BalanceService.holdForPayout at magic-link confirmation), so a card
    // payout that fails — here or in any of the pre-flight branches above,
    // all of which route through this method — must publish payout.failed or
    // the contractor is left permanently short the amount with no payout to
    // show for it. Every other executor already does this.
    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'MARKETEQ_DEBIT_CARD',
      reason,
      failedAt: new Date().toISOString(),
      failureCode: errorCode,
    });
  }

  // PS-13 §4 step 5: Stripe webhook confirming a card transaction (the
  // contractor actually spending funded balance at a merchant — distinct
  // from the fundCard() call above, which loads the card and settles
  // synchronously). No handler existed for this event at all. This records
  // an audit trail entry per transaction; it does not affect payout status
  // (funding already completed independently of contractor spend).
  async handleIssuingTransactionCreated(transaction: any): Promise<void> {
    const cardId = transaction.card;
    if (!cardId) return;

    const method = await this.methodRepo.findOne({ where: { stripeCardId: cardId } as any });
    if (!method) {
      this.logger.warn(`issuing_transaction.created for unknown card ${cardId}`);
      return;
    }

    await this.auditService.log({
      contractorId: method.contractorId,
      actorType: 'service',
      actorId: 'stripe-webhook',
      action: 'card.transaction.created',
      metadata: {
        methodId: method.id,
        stripeCardId: cardId,
        stripeTransactionId: transaction.id,
        amountCents: transaction.amount,
        merchantData: transaction.merchant_data ?? null,
      },
    });
  }
}