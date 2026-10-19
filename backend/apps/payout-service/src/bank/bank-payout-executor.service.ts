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
import { isOfacBlockedCountry } from '../common/ofac-countries';
import { OAuthService } from '../oauth/oauth.service';
import { PayoutError } from '../common/errors/payout.error';
import {
  PayoutExecutionGate,
  VERIFICATION_REQUIRED_AT_EXECUTION,
  VERIFICATION_UNAVAILABLE_AT_EXECUTION,
} from '../identity-gate/payout-execution-gate.service';

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
    private readonly oauthService: OAuthService,
    private readonly executionGate: PayoutExecutionGate,
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

    // PS-09 v2.0 §2: WISE executes through this same Stripe ACH path
    // — Marketeq never calls the Wise Payouts API directly. Once
    // OAuth has registered a Stripe external_account for the method
    // (oauth.service.ts's handleCallback), it is indistinguishable from a
    // regular bank payout from here on.
    const method = payout.depositMethod;
    const bankLikeTypes = [MethodType.BANK_STRIPE, MethodType.BANK_MANUAL, MethodType.WISE];
    if (!method || !bankLikeTypes.includes(method.methodType)) {
      this.logger.error(`Payout ${payoutRequestId} is not a bank-executed type`);
      return;
    }

    // G9: verification gate, first thing - before any status change or provider
    // contact (covers the Stripe and the Wise Platform paths). Every individual
    // provider call below is checked again immediately before it is made.
    if (!(await this.executionGate.guardBeforeProvider(payout, 'bank.start'))) return;

    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.failPayout(payout, 'Bank account has not been verified.', 'ERR_BANK_NOT_VERIFIED');
      return;
    }

    // PS-21 §6.1: "At every payout initiation" — checkOFACAtExecution().
    // bank-validation.service.ts only screens the country once, at deposit
    // method creation; OFAC's sanctioned-country list can change between
    // then and any later payout, so it must be re-checked here too, before
    // the bridge API call. Crypto payouts already have their own
    // per-execution screening (chainalysis.service.ts); this was the
    // bank-rail gap.
    if (isOfacBlockedCountry(method.bankCountry)) {
      await this.failPayout(payout,
        'Payouts to this country are not currently supported.',
        'ERR_PAYOUT_OFAC_BLOCKED');
      return;
    }

    // PS-09 v2.0 §11: a token-refresh failure sets reauthRequired and blocks
    // payouts to this method until the contractor re-authorizes.
    if ((method as any).reauthRequired) {
      await this.failPayout(payout,
        'Your Wise connection needs to be re-authorized before this payout can proceed.',
        'ERR_PAYOUT_METHOD_REAUTH_REQUIRED');
      return;
    }

    // PS-09 v2.0 §11: ensureFreshToken() was fully built but never called
    // from anywhere — a revoked Wise OAuth grant was never
    // detected until whatever hypothetical future caller invoked it. This
    // is that caller: proactively refresh (or flip reauthRequired) right
    // before the payout actually executes, since it's the only real
    // point-of-use for a still-valid grant. Execution itself doesn't
    // consume the access token (WISE routes through Stripe via
    // stripeExternalAccountId below, per PS-09 v2.0 §2) — this call exists
    // purely to detect a revoked grant and fail closed instead of letting
    // it go undetected indefinitely.
    if (method.methodType === MethodType.WISE) {
      try {
        await this.oauthService.ensureFreshToken(method);
      } catch (err: any) {
        // ensureFreshToken() now distinguishes a genuinely revoked grant
        // from a transient refresh failure (Wise 5xx, network blip) — only
        // the former should tell the contractor to re-authorize. A
        // transient failure fails just this attempt with a retryable
        // message, matching everything else that reaches the generic
        // catch below rather than a wrong, alarming "reauthorize" message.
        if (err instanceof PayoutError && err.errorCode === 'ERR_OAUTH_REAUTH_REQUIRED') {
          await this.failPayout(payout,
            'Your Wise connection needs to be re-authorized before this payout can proceed.',
            'ERR_PAYOUT_METHOD_REAUTH_REQUIRED');
          return;
        }
        await this.failPayout(payout,
          'This withdrawal could not be processed right now. Please try again shortly.',
          'ERR_PAYOUT_METHOD_TOKEN_REFRESH_FAILED');
        return;
      }
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
        // Mirrors the Wise Platform float check below (PS-36 §11): without
        // this, an underfunded platform balance was only ever discovered
        // from transfers.create()'s thrown error, which then leaked
        // Stripe's raw (often test-mode-specific, e.g. "creating Charges
        // using the 4000000000000077 test card") message straight to the
        // contractor via failureReason. Checking first lets this fail with
        // the same generic, finance-actionable message as every other
        // pre-flight check in this file.
        //
        // Gated to the first execution only (payout.status read above,
        // before the PROCESSING update) — PS-33 §6's idempotency keys exist
        // specifically so Bull's automatic retry of a job whose worker died
        // mid-run (e.g. a Render deploy) re-runs cleanly instead of moving
        // money twice. Running this check on that re-run too would fail a
        // payout whose transfers.create()/payouts.create() already
        // succeeded once — on a re-run completedTransferId starts null
        // regardless of what the first run did, so failPayout() here would
        // neither reverse the already-completed transfer nor stop
        // earnings-service crediting the contractor's balance back while
        // Stripe is still en route to their bank. A re-run must always
        // reach the idempotent calls below untouched by this check.
        if (payout.status !== PayoutStatus.PROCESSING) {
          const platformBalanceUsd = await this.getStripePlatformBalanceUsd();
          if (platformBalanceUsd < amountUsd) {
            this.logger.error(`Stripe platform balance insufficient: available $${platformBalanceUsd} < required $${amountUsd} for payout ${payoutRequestId}`);
            await this.failPayout(payout,
              'This withdrawal could not be processed right now. Please try again shortly.',
              'ERR_STRIPE_PLATFORM_INSUFFICIENT_BALANCE');
            return;
          }
        }

        // Move platform balance → connected account, then connected account
        // balance → the attached external bank account. Two calls because a
        // Custom account's own balance has to be funded before it can pay
        // out from it — there's no single "pay this destination bank
        // directly from platform balance" call for Connect.
        // PS-33 §6: transfer-{payoutRequestId} — a network-error retry of
        // this same payout job must not create a second Transfer.
        // G9: re-check right before each irreversible Stripe call. A re-run
        // (payout was already PROCESSING) that is now blocked stops quietly.
        if (!(await this.executionGate.allowProviderCall(payout, 'bank.transfer', payout.status === PayoutStatus.PROCESSING))) return;
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
        if (!(await this.executionGate.allowProviderCall(payout, 'bank.payout', payout.status === PayoutStatus.PROCESSING))) return;
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
      // failPayout's `reason` becomes contractor-facing failureReason —
      // every other call site above passes a written, customer-safe
      // message. This catch-all is the one path reached with a raw
      // provider exception (Stripe API/network errors not covered by an
      // explicit pre-check), so it must not forward err.message verbatim:
      // Stripe error text can include account-internal or test-mode detail
      // ("...creating Charges using the 4000000000000077 test card...")
      // that means nothing to a contractor. The real message is still
      // captured below in the audit log for support/engineering to see.
      const gateBlocked =
        err?.errorCode === VERIFICATION_REQUIRED_AT_EXECUTION || err?.errorCode === VERIFICATION_UNAVAILABLE_AT_EXECUTION;
      await this.failPayout(
        payout,
        gateBlocked
          ? err.message
          : 'This withdrawal could not be processed. Please try again or contact support if the issue persists.',
        err.errorCode ?? 'ERR_BANK_PAYOUT_FAILED',
        err.message,
      );
    }
  }

  // Stripe's available balance (as opposed to pending) — what a
  // transfers.create() call actually draws from. Mirrors
  // WisePlatformService.getWisePlatformBalanceUsd()'s role for the Wise
  // branch below.
  private async getStripePlatformBalanceUsd(): Promise<number> {
    if (!this.stripe) return Infinity;
    const balance = await this.stripe.balance.retrieve();
    const usdAvailable = (balance.available ?? []).find((b: any) => b.currency === 'usd');
    return (usdAvailable?.amount ?? 0) / 100;
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

      // PS-36 §11: check Marketeq's own Wise Platform float before funding —
      // getWisePlatformBalanceUsd() existed with zero callers, so an
      // insufficient float surfaced only as a raw fundTransfer() 502
      // (ERR_WISE_PLATFORM_FUND_FAILED) instead of this doc's distinct,
      // finance-actionable pre-flight error.
      const platformBalanceUsd = await this.wisePlatformService.getWisePlatformBalanceUsd();
      if (platformBalanceUsd < amountUsd) {
        this.logger.error(`Wise Platform float insufficient: balance $${platformBalanceUsd} < required $${amountUsd} for payout ${payout.id}`);
        await this.failPayout(payout,
          'This withdrawal could not be processed right now. Please try again shortly.',
          'ERR_WISE_PLATFORM_INSUFFICIENT_BALANCE');
        return;
      }

      if (!(await this.executionGate.allowProviderCall(payout, 'bank.wise_transfer', payout.status === PayoutStatus.PROCESSING))) return;
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

  private async failPayout(
    payout: PayoutRequest,
    reason: string,
    errorCode: string,
    internalReason?: string,
  ): Promise<void> {
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
    });

    // internalReason preserves the raw provider error (when the caller has
    // one) for support/engineering, without it ever reaching the
    // contractor-facing `reason` above — see the catch-all in
    // executeBankPayout for why this distinction exists.
    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'bank.payout.failed',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { reason, errorCode, ...(internalReason && internalReason !== reason ? { internalReason } : {}) },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason,
      failedAt: new Date().toISOString(),
      failureCode: errorCode,
    });
  }
}
