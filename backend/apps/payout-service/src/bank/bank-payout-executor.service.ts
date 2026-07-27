// apps/payout-service/src/bank/bank-payout-executor.service.ts
// Stripe Connect bank payout execution: platform Stripe balance → contractor's
// connected account → their attached external bank account. Replaces the
// previous state where BANK_STRIPE/BANK_MANUAL verification existed but no
// code actually moved payout money anywhere.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';

@Injectable()
export class BankPayoutExecutorService {
  private readonly logger = new Logger(BankPayoutExecutorService.name);
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

  async executeBankPayout(payoutRequestId: string): Promise<void> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });

    if (!payout) {
      this.logger.error(`Payout request not found: ${payoutRequestId}`);
      return;
    }

    const method = payout.depositMethod;
    if (!method || (method.methodType !== MethodType.BANK_STRIPE && method.methodType !== MethodType.BANK_MANUAL)) {
      this.logger.error(`Payout ${payoutRequestId} is not a bank type`);
      return;
    }

    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.failPayout(payout, 'Bank account has not been verified.', 'ERR_BANK_NOT_VERIFIED');
      return;
    }

    if (!method.stripeConnectAccountId || !method.stripeExternalAccountId) {
      await this.failPayout(payout, 'Bank account is not attached for payouts.', 'ERR_CONNECT_ACCOUNT_NOT_ATTACHED');
      return;
    }

    if (!method.connectPayoutsEnabled) {
      await this.failPayout(payout,
        'Your bank account is still being reviewed by Stripe. Please try again shortly.',
        'ERR_CONNECT_ACCOUNT_NOT_PAYOUT_READY');
      return;
    }

    await this.payoutRepo.update(payoutRequestId, {
      status: PayoutStatus.PROCESSING,
      processingAt: new Date(),
    });

    try {
      const amountUsd = parseFloat(payout.netAmountUsd);
      const amountCents = Math.round(amountUsd * 100);
      let payoutId = `po_stub_${Date.now()}`;
      let transferId = `tr_stub_${Date.now()}`;

      if (this.stripe && !method.stripeConnectAccountId.startsWith('acct_mock')) {
        // Move platform balance → connected account, then connected account
        // balance → the attached external bank account. Two calls because a
        // Custom account's own balance has to be funded before it can pay
        // out from it — there's no single "pay this destination bank
        // directly from platform balance" call for Connect.
        const transfer = await this.stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: method.stripeConnectAccountId,
          metadata: { payoutRequestId, contractorId: payout.contractorId },
        });
        transferId = transfer.id;

        const stripePayout = await this.stripe.payouts.create(
          {
            amount: amountCents,
            currency: 'usd',
            destination: method.stripeExternalAccountId,
            metadata: { payoutRequestId, contractorId: payout.contractorId },
          },
          { stripeAccount: method.stripeConnectAccountId },
        );
        payoutId = stripePayout.id;
      } else {
        this.logger.log(`[STUB] Bank payout: $${amountUsd} to connect account ${method.stripeConnectAccountId} (${payoutId})`);
      }

      // Stripe payouts to a bank settle in 1-2 business days, not
      // synchronously — leave PROCESSING and let the payout.paid webhook
      // (stripe-webhook.controller.ts) move this to COMPLETED, same async
      // settlement pattern crypto-payout-executor uses.
      await this.payoutRepo.update(payoutRequestId, {
        externalTransactionId: payoutId,
        bridgeProvider: 'STRIPE_CONNECT',
        providerReference: payoutId,
        providerStatus: 'in_transit',
        providerResponse: { transferId, payoutId },
      });

      await this.methodRepo.update(method.id, { lastPayoutAt: new Date() });

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'bank.payout.executed',
        previousStatus: PayoutStatus.QUEUED,
        newStatus: PayoutStatus.PROCESSING,
        metadata: { transferId, payoutId, amountCents },
      });

      this.logger.log(`Bank payout initiated: ${payoutRequestId} → $${amountUsd} to ••••${method.bankAccountLast4}`);

    } catch (err: any) {
      this.logger.error(`Bank payout failed: ${payoutRequestId} — ${err.message}`);
      await this.failPayout(payout, err.message, err.errorCode ?? 'ERR_BANK_PAYOUT_FAILED');
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
      action: 'bank.payout.failed',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { reason, errorCode },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason,
      failedAt: new Date().toISOString(),
    });
  }
}
