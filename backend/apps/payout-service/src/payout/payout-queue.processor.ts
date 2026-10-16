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
import { WithdrawalNotifier } from '../notifications/withdrawal-notifier.service';

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
    private readonly withdrawalNotifier: WithdrawalNotifier,
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

    // PS-19 §3.3/§3.4: execution-time re-checks, run right before handing off
    // to an executor that would otherwise move real money against a
    // balance/KYC state that has gone stale since initiation. A failed check
    // fails the payout and releases its hold itself.
    //
    // PMCM-285: when a lookup errors (earnings or KYC unreachable), the job is
    // retried by throwing, since the job carries attempts: 3. On the last
    // attempt the payout is failed and its hold released. Before, the error
    // was swallowed and the payout stayed QUEUED with its funds held forever.
    try {
      const balanceOk = await this.payoutService.recheckBalanceAtExecution(
        payout.contractorId, payoutRequestId, parseFloat(payout.amountUsd),
      );
      if (!balanceOk) return;
      const kycOk = await this.payoutService.recheckKycAtExecution(payout.contractorId, payoutRequestId);
      if (!kycOk) return;
    } catch (err: any) {
      // ECONNREFUSED from axios arrives with an empty message.
      const cause = err?.message || err?.code || String(err);
      // Read through a narrow shape: bull's Job typings do not resolve its
      // own fields in every install of this monorepo.
      const { attemptsMade = 0, opts } = job as unknown as {
        attemptsMade?: number;
        opts?: { attempts?: number };
      };
      const attempts = opts?.attempts ?? 1;
      if (attemptsMade + 1 < attempts) {
        this.logger.warn(
          `Pre-execution checks errored for payout ${payoutRequestId} (attempt ${attemptsMade + 1}/${attempts}), retrying: ${cause}`,
        );
        throw err;
      }
      this.logger.error(
        `Pre-execution checks errored for payout ${payoutRequestId} on the last attempt, failing it and releasing the hold: ${cause}`,
      );
      await this.payoutService.failHeldPayoutBeforeExecution(
        payoutRequestId,
        'We couldn’t complete the checks needed to send this withdrawal. Your funds are back in your available balance. Please try again.',
        'ERR_EXECUTION_PRECHECK_UNAVAILABLE',
      );
      return;
    }

    await this.execute(payout);

    // PMCM-806 N-01 "withdrawal submitted". This is the one place every
    // method's executor runs, and the executor is what moves the payout to
    // PROCESSING. The notifier re-reads the status and only sends if it is
    // PROCESSING now. A payout that completed in-line (card) gets N-02 from
    // the publisher instead, and one that failed gets N-03.
    void this.withdrawalNotifier.notifySubmitted(payoutRequestId);
  }

  private async execute(payout: PayoutRequest): Promise<void> {
    const payoutRequestId = payout.id;
    switch (payout.depositMethod.methodType) {
      case MethodType.CRYPTO:
        return this.cryptoExecutor.executeCryptoPayout(payoutRequestId);
      case MethodType.MARKETEQ_DEBIT_CARD:
        return this.cardExecutor.executeCardPayout(payoutRequestId);
      case MethodType.BANK_STRIPE:
      case MethodType.BANK_MANUAL:
      // PS-09 v2.0 §2: WISE executes through the same Stripe ACH
      // path as a regular bank payout — the OAuth-retrieved routing +
      // account number was already registered as a Stripe external_account
      // at connection time (oauth.service.ts's handleCallback).
      case MethodType.WISE:
        return this.bankExecutor.executeBankPayout(payoutRequestId);
      default:
        // WISE/TEQ_COIN execution isn't built yet. Leaving the
        // request QUEUED kept it visible instead of vanishing, which was the
        // right call while nothing had been debited yet — but the balance is
        // now taken up-front at magic-link confirmation
        // (BalanceService.holdForPayout), and these methods are reachable:
        // AddMethodDto accepts them and addMethod() routes WISE
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
