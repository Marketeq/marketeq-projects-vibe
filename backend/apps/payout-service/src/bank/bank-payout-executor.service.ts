// apps/payout-service/src/bank/bank-payout-executor.service.ts
// Stripe Connect bank payout execution: platform Stripe balance → contractor's
// connected account → their attached external bank account. Replaces the
// previous state where BANK_STRIPE/BANK_MANUAL verification existed but no
// code actually moved payout money anywhere.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PayoutRequest, PayoutStatus, PayoutSpeed } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { WisePlatformService } from '../execution/wise-platform.service';
import { PayoutFeeService } from '../fees/payout-fee.service';

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
    private readonly wisePlatformService: WisePlatformService,
    private readonly feeService: PayoutFeeService,
  ) {
    const key = this.config.get('STRIPE_SECRET_KEY', '');
    if (key && key !== 'sk_test_YOUR_TEST_KEY_HERE') {
      try {
        const Stripe = require('stripe');
        this.stripe = new Stripe(key, { apiVersion: this.config.get('STRIPE_API_VERSION', '2024-06-20') });
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

    // PS-09 v2.0 §2: WISE/PAYONEER execute through this same Stripe ACH path
    // — Marketeq never calls the Wise/Payoneer Payouts API directly. Once
    // OAuth has registered a Stripe external_account for the method
    // (oauth.service.ts's handleCallback), it is indistinguishable from a
    // regular bank payout from here on.
    const method = payout.depositMethod;
    const bankLikeTypes = [MethodType.BANK_STRIPE, MethodType.BANK_MANUAL, MethodType.WISE, MethodType.PAYONEER];
    if (!method || !bankLikeTypes.includes(method.methodType)) {
      this.logger.error(`Payout ${payoutRequestId} is not a bank-executed type`);
      return;
    }

    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.failPayout(payout, 'Bank account has not been verified.', 'ERR_BANK_NOT_VERIFIED');
      return;
    }

    // PS-09 v2.0 §11: a token-refresh failure sets reauthRequired and blocks
    // payouts to this method until the contractor re-authorizes.
    if ((method as any).reauthRequired) {
      await this.failPayout(payout,
        'Your Wise/Payoneer connection needs to be re-authorized before this payout can proceed.',
        'ERR_PAYOUT_METHOD_REAUTH_REQUIRED');
      return;
    }

    // PS-34 §2/§6: BANK_MANUAL methods outside Stripe's cross-border
    // coverage (India, Japan, GCC, and everything else) never get a Stripe
    // Connect account at all — they route through Wise Platform instead.
    // Must branch before the Stripe-specific checks below, which don't
    // apply to this path.
    if (
      method.methodType === MethodType.BANK_MANUAL &&
      method.bankCountry &&
      method.bankCountry.toUpperCase() !== 'US' &&
      !this.feeService.isStripeCrossBorderCountry(method.bankCountry)
    ) {
      await this.executeWisePlatformPayout(payout, method);
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

    // Tracks the real platform→connected-account Transfer once it succeeds,
    // so the catch block below can reverse it if the second leg (connected
    // account→bank payout) then fails. Declared outside the try so it
    // survives into catch — stays null for the stub path and for any
    // failure before the transfer itself completes.
    let completedTransferId: string | null = null;

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
        // PS-33 §6: transfer-{payoutRequestId} — a network-error retry of
        // this same payout job must not create a second Transfer.
        const transfer = await this.stripe.transfers.create(
          {
            amount: amountCents,
            currency: 'usd',
            destination: method.stripeConnectAccountId,
            metadata: { payoutRequestId, contractorId: payout.contractorId },
          },
          { idempotencyKey: `transfer-${payoutRequestId}` },
        );
        transferId = transfer.id;
        completedTransferId = transfer.id;

        // Previously always omitted (implicit 'standard') regardless of
        // speed — a contractor who paid the instant fee still got a real
        // 1-2 business day payout, silently. method: 'instant' is what
        // actually invokes Stripe's real Instant Payouts product; Stripe
        // itself rejects this if the connected account isn't instant-payout
        // capable, which the surrounding try/catch already turns into a
        // normal failPayout() rather than a silent fallback to standard.
        // PS-33 §6: payout-{payoutRequestId} — same dedup reasoning as the
        // transfer above, one step further down the pipeline.
        const stripePayout = await this.stripe.payouts.create(
          {
            amount: amountCents,
            currency: 'usd',
            destination: method.stripeExternalAccountId,
            metadata: { payoutRequestId, contractorId: payout.contractorId },
            ...(payout.speed === PayoutSpeed.INSTANT ? { method: 'instant' } : {}),
          },
          { stripeAccount: method.stripeConnectAccountId, idempotencyKey: `payout-${payoutRequestId}` },
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

      this.logger.log(`Bank payout initiated: ${payoutRequestId} → $${amountUsd} to ••••${method.bankAccountLast4 ?? method.accountIdentifier}`);

    } catch (err: any) {
      this.logger.error(`Bank payout failed: ${payoutRequestId} — ${err.message}`);
      if (completedTransferId) {
        await this.reverseTransfer(completedTransferId, payoutRequestId, payout.contractorId);
      }
      await this.failPayout(payout, err.message, err.errorCode ?? 'ERR_BANK_PAYOUT_FAILED');
    }
  }

  // The platform→connected-account Transfer succeeded but the connected
  // account→bank Payout call then threw (network error, Stripe rejection,
  // etc.) — left unreversed, that money sits stranded in the contractor's
  // connected account balance rather than back on the platform's own
  // balance, even though payout_requests/balance_snapshots already record
  // the payout as failed and the contractor's hold as released.
  private async reverseTransfer(transferId: string, payoutRequestId: string, contractorId: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.transfers.createReversal(transferId, { idempotencyKey: `reversal-${payoutRequestId}` });
      this.logger.log(`Reversed transfer ${transferId} for failed payout ${payoutRequestId}`);
    } catch (err: any) {
      // A reversal failure must never block failPayout from still marking
      // the payout FAILED and releasing the contractor's balance hold —
      // that has to happen regardless. Logged loudly (and audited) since
      // this leaves real platform funds stranded in the connected account
      // until someone reverses it manually.
      this.logger.error(
        `Failed to reverse transfer ${transferId} for payout ${payoutRequestId} — funds remain stranded in the connected account: ${err.message}`,
      );
      await this.auditService.log({
        contractorId, payoutRequestId, actorType: 'service', actorId: 'payout-service',
        action: 'bank.transfer.reversal_failed',
        metadata: { transferId, error: err.message },
      });
    }
  }

  // PS-34 §5.2 steps 1 + 4-6: quote, create, and fund the Wise Platform
  // transfer for a non-Stripe-cross-border international payout. The
  // recipient itself was already created at method-verification time
  // (methods.service.ts verifyViaWisePlatform) — only the quote/transfer are
  // per-payout. Wise settles asynchronously (transfer state webhooks, same
  // as Stripe's payout.paid pattern) — left PROCESSING here.
  private async executeWisePlatformPayout(payout: PayoutRequest, method: DepositMethod): Promise<void> {
    if (!method.wisePlatformRecipientId) {
      await this.failPayout(payout, 'Bank account is not attached for payouts.', 'ERR_CONNECT_ACCOUNT_NOT_ATTACHED');
      return;
    }

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.PROCESSING,
      processingAt: new Date(),
    });

    try {
      const amountUsd = parseFloat(payout.netAmountUsd);
      const quote = await this.wisePlatformService.getQuote({
        sourceCurrency: 'USD',
        targetCurrency: method.bankCurrency ?? 'USD',
        sourceAmount: amountUsd,
      });
      const transferId = await this.wisePlatformService.executeTransfer({
        quoteId: quote.quoteId,
        recipientId: method.wisePlatformRecipientId,
        reference: payout.id,
      });

      await this.payoutRepo.update(payout.id, {
        wisePlatformTransferId: transferId,
        bridgeProvider: 'WISE_PLATFORM',
        providerReference: transferId,
        providerStatus: 'incoming_payment_waiting',
        providerResponse: { transferId, quoteId: quote.quoteId },
      } as any);

      await this.methodRepo.update(method.id, { lastPayoutAt: new Date(), wisePlatformTransferId: transferId } as any);

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId: payout.id,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'bank.payout.executed',
        previousStatus: PayoutStatus.QUEUED,
        newStatus: PayoutStatus.PROCESSING,
        metadata: { transferId, quoteId: quote.quoteId, provider: 'wise_platform' },
      });

      this.logger.log(`Wise Platform payout initiated: ${payout.id} → $${amountUsd} to recipient ${method.wisePlatformRecipientId}`);
    } catch (err: any) {
      this.logger.error(`Wise Platform payout failed: ${payout.id} — ${err.message}`);
      await this.failPayout(payout, err.message, err.errorCode ?? 'ERR_WISE_PLATFORM_TRANSFER_FAILED');
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
