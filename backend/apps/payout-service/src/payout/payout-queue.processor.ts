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
import { PayoutRequest } from '../entities/payout-request.entity';
import { MethodType } from '../entities/deposit-method.entity';
import { CryptoPayoutExecutorService } from '../execution/crypto-payout-executor.service';
import { CardPayoutExecutorService } from '../card/card-payout-executor.service';
import { BankPayoutExecutorService } from '../bank/bank-payout-executor.service';

@Processor({ name: 'payout-processing' })
export class PayoutQueueProcessor {
  private readonly logger = new Logger(PayoutQueueProcessor.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly cryptoExecutor: CryptoPayoutExecutorService,
    private readonly cardExecutor: CardPayoutExecutorService,
    private readonly bankExecutor: BankPayoutExecutorService,
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

    switch (payout.depositMethod.methodType) {
      case MethodType.CRYPTO:
        return this.cryptoExecutor.executeCryptoPayout(payoutRequestId);
      case MethodType.MARKETEQ_DEBIT_CARD:
        return this.cardExecutor.executeCardPayout(payoutRequestId);
      case MethodType.BANK_STRIPE:
      case MethodType.BANK_MANUAL:
        return this.bankExecutor.executeBankPayout(payoutRequestId);
      default:
        // PAYPAL/WISE/PAYONEER/TEQ_COIN execution isn't built yet — leave the
        // payout QUEUED rather than silently dropping the job, so it stays
        // visible instead of vanishing.
        this.logger.warn(`No executor for method type ${payout.depositMethod.methodType} — payout ${payoutRequestId} left unprocessed`);
    }
  }
}
