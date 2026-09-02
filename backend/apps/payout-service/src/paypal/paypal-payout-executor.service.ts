// apps/payout-service/src/paypal/paypal-payout-executor.service.ts
// PayPal Payouts API execution: platform PayPal app → contractor's PayPal
// email. Previously payout-queue.processor.ts had no executor for
// MethodType.PAYPAL at all — payouts were created, queued, and never
// processed (see the "No executor for method type" warning it logged).

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PaypalProvider } from '../providers/paypal.provider';

@Injectable()
export class PaypalPayoutExecutorService {
  private readonly logger = new Logger(PaypalPayoutExecutorService.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly paypalProvider: PaypalProvider,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {}

  async executePaypalPayout(payoutRequestId: string): Promise<void> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });
    if (!payout) {
      this.logger.error(`Payout request not found: ${payoutRequestId}`);
      return;
    }

    const method = payout.depositMethod;
    if (!method || method.methodType !== MethodType.PAYPAL) {
      this.logger.error(`Payout ${payoutRequestId} is not a PayPal type`);
      return;
    }

    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.failPayout(payout, 'PayPal account has not been verified.', 'ERR_PAYPAL_NOT_VERIFIED');
      return;
    }

    // paypalEmail predates the real OAuth connect flow (oauth.service.ts)
    // and is never written to by it — the real PayPal address lands in the
    // generic accountEmail column instead (same fallback methods.service.ts
    // already applies when returning method data to the frontend).
    const receiverEmail = method.paypalEmail ?? method.accountEmail;
    if (!receiverEmail) {
      await this.failPayout(payout, 'No PayPal email on file for this deposit method.', 'ERR_PAYPAL_EMAIL_MISSING');
      return;
    }

    await this.payoutRepo.update(payoutRequestId, {
      status: PayoutStatus.PROCESSING,
      processingAt: new Date(),
    });

    try {
      const amountUsd = parseFloat(payout.netAmountUsd);
      const result = await this.paypalProvider.createPayout(payoutRequestId, receiverEmail, amountUsd);

      // PayPal Payouts settle asynchronously — batch_status starts at
      // PENDING/PROCESSING. Leave PROCESSING here; there is no webhook
      // listener wired up yet to move this to COMPLETED (same gap flagged
      // for Ramp before that was fixed — a future PAYPAL webhook handler
      // should call the same completion path bank/crypto executors use).
      await this.payoutRepo.update(payoutRequestId, {
        externalTransactionId: result.payoutItemId || result.payoutBatchId,
        bridgeProvider: 'PAYPAL',
        providerReference: result.payoutBatchId,
        providerStatus: result.status,
        providerResponse: result as any,
      });

      await this.methodRepo.update(method.id, { lastPayoutAt: new Date() });

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'paypal.payout.executed',
        previousStatus: PayoutStatus.QUEUED,
        newStatus: PayoutStatus.PROCESSING,
        metadata: { payoutBatchId: result.payoutBatchId, amountUsd },
      });

      this.logger.log(`PayPal payout initiated: ${payoutRequestId} → $${amountUsd} to ${receiverEmail} (batch ${result.payoutBatchId})`);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      this.logger.error(`PayPal payout failed: ${payoutRequestId} — ${message}`);
      await this.failPayout(payout, message, err.errorCode ?? 'ERR_PAYPAL_PAYOUT_FAILED');
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
      action: 'paypal.payout.failed',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { reason, errorCode },
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
