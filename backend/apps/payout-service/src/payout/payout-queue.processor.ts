// apps/payout-service/src/payout/payout-queue.processor.ts
// Consumes the 'payout-processing' Bull queue (jobs pushed by
// PayoutService.enqueueForProcessing) and dispatches to the executor for the
// payout's deposit method type. Previously nothing consumed this queue —
// crypto/card/bank executors existed but were never actually invoked.
import { Processor, Process } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { MethodType } from '../entities/deposit-method.entity';
import { CryptoPayoutExecutorService } from '../execution/crypto-payout-executor.service';
import { CardPayoutExecutorService } from '../card/card-payout-executor.service';
import { BankPayoutExecutorService } from '../bank/bank-payout-executor.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutService } from './payout.service';

@Processor({ name: 'payout-processing' })
export class PayoutQueueProcessor {
  private readonly logger = new Logger(PayoutQueueProcessor.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly cryptoExecutor: CryptoPayoutExecutorService,
    private readonly cardExecutor: CardPayoutExecutorService,
    private readonly bankExecutor: BankPayoutExecutorService,
    private readonly publisher: PayoutPublisher,
    private readonly payoutService: PayoutService,
  ) {}

  @Process('process-payout')
  async handleProcessPayout(job: Job<{ payoutRequestId: string }>): Promise<void> {
    const { payoutRequestId } = job.data;

    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });
    if (!payout || !payout.depositMethod) {
      this.logger.error(`process-payout job for missing payout/method: ${payoutRequestId}`);
      return;
    }

    // cancel() only removes waiting/delayed Bull jobs — a job already picked
    // up (active) by this processor when cancel() ran isn't stoppable that
    // way. Since cancel() also refunds the instant hold as soon as it flips
    // status to CANCELLED, letting execution continue here would both pay
    // the contractor out for real AND have already credited their balance
    // back — a double payout. This fresh DB read closes that window: it
    // can't catch a job that started executing before cancel() wrote
    // CANCELLED, but it does catch the far more likely case of the job
    // simply not having been dequeued yet.
    if (payout.status === PayoutStatus.CANCELLED) {
      this.logger.warn(`process-payout job for cancelled payout skipped: ${payoutRequestId}`);
      return;
    }

    // Same reasoning one step further: the executors now publish
    // payout.completed/payout.failed, and each of those events moves real
    // money in earnings-service. Re-running an already-settled payout would
    // emit a second terminal event for the same hold — crediting or debiting
    // the contractor twice. Nothing enqueues a payout twice today, so this is
    // belt-and-braces rather than a known path, but it is the cheap half of
    // the trade.
    if (payout.status === PayoutStatus.COMPLETED || payout.status === PayoutStatus.FAILED) {
      this.logger.warn(`process-payout job for already-${payout.status} payout skipped: ${payoutRequestId}`);
      return;
    }

    // PS-19 §3.3/§3.4: execution-time re-checks. These methods already
    // existed (recheckBalanceAtExecution/recheckKycAtExecution) and fail the
    // payout + write failureReason themselves, but had zero callers — this
    // is the actual dispatch point where they belong, run right before
    // handing off to an executor that would otherwise move real money
    // against a balance/KYC state that's gone stale since initiation.
    const balanceOk = await this.payoutService.recheckBalanceAtExecution(
      payout.contractorId, payoutRequestId, parseFloat(payout.amountUsd),
    );
    if (!balanceOk) return;
    const kycOk = await this.payoutService.recheckKycAtExecution(payout.contractorId, payoutRequestId);
    if (!kycOk) return;

    switch (payout.depositMethod.methodType) {
      case MethodType.CRYPTO:
        return this.cryptoExecutor.executeCryptoPayout(payoutRequestId);
      case MethodType.MARKETEQ_DEBIT_CARD:
        return this.cardExecutor.executeCardPayout(payoutRequestId);
      case MethodType.BANK_STRIPE:
      case MethodType.BANK_MANUAL:
      // PS-09 v2.0 §2: WISE/PAYONEER execute through the same Stripe ACH
      // path as a regular bank payout — the OAuth-retrieved routing +
      // account number was already registered as a Stripe external_account
      // at connection time (oauth.service.ts's handleCallback).
      case MethodType.WISE:
      case MethodType.PAYONEER:
        return this.bankExecutor.executeBankPayout(payoutRequestId);
      default:
        // WISE/PAYONEER/TEQ_COIN execution isn't built yet. Leaving the
        // request QUEUED kept it visible instead of vanishing, which was the
        // right call while nothing had been debited yet — but the balance is
        // now taken up-front at magic-link confirmation
        // (BalanceService.holdForPayout), and these methods are reachable:
        // AddMethodDto accepts them and addMethod() routes WISE/PAYONEER
        // through the real OAuth verification flow. A payout parked here
        // would hold the contractor's funds indefinitely with no executor
        // that will ever release them. Fail it explicitly instead —
        // payout.failed restores available_balance and the contractor gets an
        // actionable error rather than a silent freeze.
        return this.failUnsupportedMethod(payout);
    }
  }

  private async failUnsupportedMethod(payout: PayoutRequest): Promise<void> {
    const reason = `Payouts to ${payout.depositMethod.methodType} are not available yet. Your funds have been returned to your available balance — please withdraw using another method.`;
    this.logger.warn(`No executor for method type ${payout.depositMethod.methodType} — failing payout ${payout.id} and releasing its hold`);

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: payout.currency ?? 'USD',
      methodType: payout.depositMethod.methodType,
      reason,
      failedAt: new Date().toISOString(),
    });
  }
}
