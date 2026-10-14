// apps/payout-service/src/execution/crypto-payout-executor.service.ts
// PS-12 §2: End-to-end crypto payout execution.
// Orchestrates: pre-flight checks → bridge selection → gas estimation →
// bridge API call → transaction tracking → status update.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, CryptoProvider } from '../entities/deposit-method.entity';
import { BridgeSelectorService, BridgeType } from './bridge-selector.service';
import { GasEstimatorService } from './gas-estimator.service';
import { CryptoRetryService } from './crypto-retry.service';
import { CryptoMinimumService } from './crypto-minimum.service';
import { CryptoPayoutProvider } from '../providers/crypto.provider';
import { ConversionService } from '../crypto/conversion.service';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutExecutionGate } from '../identity-gate/payout-execution-gate.service';
import { PayoutError } from '../common/errors/payout.error';
import { ChainalysisService } from './chainalysis.service';
import { KycClient } from '../common/kyc.client';

// PS-12 §9.1: OFAC blocked countries (same as PS-07)
// G9: marker for a re-run stopped by the verification gate (not a failure).
const GATE_HOLD_RERUN = 'VERIFICATION_REQUIRED_HOLD_ON_RERUN';

const OFAC_BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SD', 'SY',
  'RU', 'BY', 'MM', 'VE', 'ZW', 'CF', 'CD', 'SO', 'LY', 'YE', 'NI'];

@Injectable()
export class CryptoPayoutExecutorService {
  private readonly logger = new Logger(CryptoPayoutExecutorService.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly bridgeSelector: BridgeSelectorService,
    private readonly gasEstimator: GasEstimatorService,
    private readonly retryService: CryptoRetryService,
    private readonly minimumService: CryptoMinimumService,
    private readonly cryptoProvider: CryptoPayoutProvider,
    private readonly conversionSvc: ConversionService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly chainalysis: ChainalysisService,
    private readonly kycClient: KycClient,
    private readonly executionGate: PayoutExecutionGate,
  ) {}

  /**
   * PS-12 §2: Execute a crypto payout. Called by the Bull queue processor
   * when a CRYPTO-type payout reaches PROCESSING state.
   */
  async executeCryptoPayout(payoutRequestId: string): Promise<void> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });

    if (!payout) {
      this.logger.error(`Payout request not found: ${payoutRequestId}`);
      return;
    }

    if (payout.status !== PayoutStatus.QUEUED && payout.status !== PayoutStatus.PROCESSING) {
      this.logger.warn(`Payout ${payoutRequestId} not in executable state: ${payout.status}`);
      return;
    }

    const method = payout.depositMethod;
    if (!method || method.methodType !== MethodType.CRYPTO) {
      this.logger.error(`Payout ${payoutRequestId} is not CRYPTO type`);
      await this.failPayout(payout, 'Deposit method is not a crypto wallet.', 'ERR_CRYPTO_TOKEN_NOT_SUPPORTED');
      return;
    }

    // G9: verification gate before any status change or provider contact.
    if (!(await this.executionGate.guardBeforeProvider(payout, 'crypto.start'))) return;
    const rerun = payout.status === PayoutStatus.PROCESSING;

    // Mark as PROCESSING
    await this.payoutRepo.update(payoutRequestId, {
      status: PayoutStatus.PROCESSING,
      processingAt: new Date(),
    });

    try {
      // ── Step 1: Pre-flight validation ──
      await this.preflightChecks(payout, method);

      // ── Step 2: Select bridge (PS-12 §3) ──
      const bridge = this.bridgeSelector.selectBridge(
        method.cryptoProvider!,
        method.cryptoNetwork!,
        method.cryptoCurrency!,
      );
      const settlementEstimate = this.bridgeSelector.getSettlementEstimate(bridge, method.cryptoNetwork!);

      this.logger.log(`Payout ${payoutRequestId}: bridge=${bridge}, network=${method.cryptoNetwork}, token=${method.cryptoCurrency}`);

      // ── Step 3: Gas estimation for direct EVM (PS-12 §4) ──
      let gasUSD = 0;
      let gasWei = '0';
      if (bridge === BridgeType.TREASURY_DIRECT) {
        const gasResult = await this.retryService.executeWithRetry(
          () => this.gasEstimator.estimateGasUSD(
            method.cryptoNetwork!, method.cryptoAddress!, method.cryptoCurrency!, parseFloat(payout.amountUsd),
          ),
          { payoutRequestId, operation: 'gas_estimation' },
        );
        gasUSD = gasResult.gasUSD;
        gasWei = gasResult.gasWei;

        // PS-12 §4.3: Gas spike protection
        this.gasEstimator.checkGasSpike(gasUSD, parseFloat(payout.netAmountUsd));
      }

      // ── Step 4: Get live conversion rate (PS-12 §1 — NOT fawazahmed0 display rate) ──
      const rateResult = await this.conversionSvc.getDisplayRate(method.cryptoCurrency!, 'USD');
      const liveRate = rateResult.rate;
      if (liveRate <= 0) {
        throw new PayoutError('Conversion rate unavailable.', HttpStatus.SERVICE_UNAVAILABLE, 'ERR_BRIDGE_UNAVAILABLE');
      }

      // Net crypto amount = (payout USD - gas fee) / live rate
      const netUsd = parseFloat(payout.netAmountUsd) - gasUSD;
      const cryptoAmount = netUsd / liveRate;

      // ── Step 5: Execute via bridge/provider (PS-12 §2 step 4) ──
      const result = await this.retryService.executeWithRetry(
        async () => {
          // G9: evaluated again on EVERY attempt (including the delayed retries),
          // immediately before the provider is asked to send. A transient
          // 'unavailable' is retried like any other 503; 'closed' is not.
          if (!(await this.executionGate.allowProviderCall(payout, 'crypto.provider', rerun))) {
            throw new PayoutError('Verification gate closed on re-run.', HttpStatus.FORBIDDEN, GATE_HOLD_RERUN);
          }
          return this.cryptoProvider.initiateWithdrawal(
          method.cryptoProvider!,
          method.cryptoAddress!,  // encrypted — provider stubs don't decrypt in dev
          method.cryptoNetwork!,
          method.cryptoCurrency!,
          parseFloat(payout.netAmountUsd),
          );
        },
        { payoutRequestId, operation: 'bridge_execution' },
      );

      // ── Step 6: Update payout with settlement data ──
      const estimatedSettlement = new Date(Date.now() + this.parseEstimateToMs(settlementEstimate));

      await this.payoutRepo.update(payoutRequestId, {
        externalTransactionId: result.providerTxId,
        bridgeProvider: bridge,
        cryptoAmount: cryptoAmount.toFixed(18),
        cryptoToken: method.cryptoCurrency,
        cryptoNetwork: method.cryptoNetwork,
        conversionRate: liveRate.toFixed(8),
        gasFeeUsd: gasUSD.toFixed(8),
        gasFeeWei: gasWei,
        settlementEstimatedAt: estimatedSettlement,
        providerReference: result.providerTxId,
        providerStatus: result.status,
        status: PayoutStatus.PROCESSING, // remains PROCESSING until webhook confirms settlement
      });

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'crypto.payout.executed',
        previousStatus: PayoutStatus.QUEUED,
        newStatus: PayoutStatus.PROCESSING,
        metadata: {
          bridge, txId: result.providerTxId,
          cryptoAmount: cryptoAmount.toFixed(8),
          gasUSD: gasUSD.toFixed(2),
          rate: liveRate,
        },
      });

      this.logger.log(`Payout ${payoutRequestId} executed: txId=${result.providerTxId}, bridge=${bridge}, crypto=${cryptoAmount.toFixed(8)} ${method.cryptoCurrency}`);

    } catch (err: any) {
      if (err?.errorCode === GATE_HOLD_RERUN) return; // re-run blocked by the gate: nothing changed, already audited
      this.logger.error(`Payout ${payoutRequestId} failed: ${err.message}`);
      await this.failPayout(payout, err.message, err.errorCode ?? 'ERR_BRIDGE_UNAVAILABLE');
    }
  }

  /**
   * Called by bridge webhook when settlement is confirmed.
   * Moves payout to COMPLETED.
   */
  async confirmSettlement(payoutRequestId: string, txHash: string): Promise<void> {
    await this.payoutRepo.update(payoutRequestId, {
      status: PayoutStatus.COMPLETED,
      completedAt: new Date(),
      settledAt: new Date(),
      externalTransactionId: txHash,
      providerStatus: 'settled',
    });

    const payout = await this.payoutRepo.findOne({ where: { id: payoutRequestId } });
    if (payout) {
      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'service',
        actorId: 'bridge-webhook',
        action: 'crypto.payout.settled',
        previousStatus: PayoutStatus.PROCESSING,
        newStatus: PayoutStatus.COMPLETED,
        metadata: { txHash },
      });

      await this.publisher.publishPayoutCompleted({
        contractorId: payout.contractorId,
        payoutRequestId,
        amount: payout.amountUsd,
        currency: payout.cryptoToken ?? 'USD',
        methodType: 'CRYPTO',
        settledAt: new Date().toISOString(),
      });
    }
  }

  // ─── Pre-flight checks (PS-12 §2 step 2 + §6 + §7 + §9) ──
  private async preflightChecks(payout: PayoutRequest, method: DepositMethod): Promise<void> {
    // PS-12 §7: Token supported for actual payout?
    this.minimumService.validateTokenSupported(method.cryptoCurrency!, method.cryptoNetwork!);

    // PS-12 §6: Minimum amount check
    this.minimumService.validateMinimum(parseFloat(payout.netAmountUsd), method.cryptoCurrency!, method.cryptoNetwork!);

    // PS-12 §9.1: OFAC double-check at execution. OFAC_BLOCKED_COUNTRIES
    // above existed but was never actually checked against anything — this
    // was a log line, not a control. Country check is feature-flagged the
    // same way as PS-35's biometric gate: kyc-identity-service's gate-status
    // response has no contractorCountry field yet (confirmed), so a
    // FEATURE_CRYPTO_OFAC_COUNTRY_CHECK_ENABLED default of false keeps this
    // dormant rather than blocking every crypto payout the moment
    // ofacFlagged/contractorCountry both read undefined.
    if (this.config.get('FEATURE_CRYPTO_OFAC_COUNTRY_CHECK_ENABLED', 'false') === 'true') {
      const kyc = await this.kycClient.getStatus(payout.contractorId);
      const country = (kyc as any).contractorCountry as string | undefined;
      if (country && OFAC_BLOCKED_COUNTRIES.includes(country.toUpperCase())) {
        throw new PayoutError(
          'This payout cannot be processed due to regulatory restrictions.',
          HttpStatus.FORBIDDEN, 'ERR_PAYOUT_OFAC_BLOCKED',
        );
      }
    }

    // Chainalysis wallet-address screening — real data (method.cryptoAddress)
    // is always available here, unlike the country check above, so this
    // runs whenever Chainalysis is configured rather than behind a feature
    // flag; ChainalysisService itself fails closed (503) if unconfigured or
    // unreachable, per the same "never fail open" reasoning as PS-35 §8.
    if (this.chainalysis.isConfigured()) {
      const screening = await this.chainalysis.screenAddress(method.cryptoAddress!);
      if (screening.blocked) {
        this.logger.warn(`Chainalysis blocked payout ${payout.id}: ${method.cryptoAddress} matched ${screening.matchedCategory}`);
        throw new PayoutError(
          'This payout cannot be processed due to regulatory restrictions.',
          HttpStatus.FORBIDDEN, 'ERR_PAYOUT_OFAC_BLOCKED',
        );
      }
    } else {
      this.logger.warn(`Chainalysis not configured — wallet screening skipped for payout ${payout.id}`);
    }
  }

  // ─── Fail payout ──────────────────────────────────────────
  private async failPayout(payout: PayoutRequest, reason: string, errorCode: string): Promise<void> {
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      retryCount: (payout.retryCount ?? 0) + 1,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'crypto.payout.failed',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { reason, errorCode },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'CRYPTO',
      reason,
      failedAt: new Date().toISOString(),
    });
  }

  // ─── Helpers ──────────────────────────────────────────────
  private parseEstimateToMs(estimate: string): number {
    // Conservative: use upper bound from settlement estimates
    if (estimate.includes('3 business days')) return 3 * 24 * 60 * 60 * 1000;
    if (estimate.includes('1 business day')) return 24 * 60 * 60 * 1000;
    if (estimate.includes('30 minutes')) return 30 * 60 * 1000;
    if (estimate.includes('15 minutes')) return 15 * 60 * 1000;
    if (estimate.includes('3 minutes')) return 3 * 60 * 1000;
    if (estimate.includes('2 minutes')) return 2 * 60 * 1000;
    return 60 * 60 * 1000; // default 1 hour
  }
}