// apps/payout-service/src/providers/wise-platform-webhook.service.ts
// PS-36 §10: Wise Platform transfer state-change webhook handling. Mirrors
// stripe.provider.ts's payout.paid/payout.failed handlers — same "restore
// balance + publish + audit" shape, different provider.
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { WisePlatformService } from '../execution/wise-platform.service';

@Injectable()
export class WisePlatformWebhookService {
  private readonly logger = new Logger(WisePlatformWebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly wisePlatform: WisePlatformService,
  ) {
    this.webhookSecret = this.config.get('WISE_PLATFORM_WEBHOOK_SECRET', '');
  }

  // PS-40 §3.1/§3.2: the webhook payload only has the transfer id + state,
  // not amounts — look the transfer up for targetCurrency/targetAmount.
  // Best-effort: a lookup failure must not block the balance-affecting
  // completed/failed handling above it, so this swallows and logs rather
  // than throwing.
  private async lookupTransferAmounts(
    transferId: string,
  ): Promise<{ targetAmount: number; targetCurrency: string } | null> {
    try {
      const transfer = await this.wisePlatform.getTransfer(transferId);
      return { targetAmount: transfer.targetValue, targetCurrency: transfer.targetCurrency };
    } catch (err) {
      this.logger.warn(`Could not look up Wise transfer ${transferId} amounts for event payload: ${err}`);
      return null;
    }
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!this.webhookSecret || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('base64');
    // Signature must be the same length for timingSafeEqual — a mismatched
    // length is a mismatched signature, not a crash.
    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(signature);
    if (expectedBuf.length !== givenBuf.length) return false;
    return timingSafeEqual(expectedBuf, givenBuf);
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.verifySignature(rawBody, signature)) {
      throw new BadRequestException('Invalid Wise Platform webhook signature');
    }

    const event = JSON.parse(rawBody.toString());
    const transferId = event.data?.resource?.id != null ? String(event.data.resource.id) : null;
    const state = event.data?.current_state as string | undefined;
    if (!transferId || !state) {
      this.logger.warn('Wise Platform webhook missing resource id or current_state — ignoring');
      return;
    }

    const payout = await this.payoutRepo.findOne({
      where: { wisePlatformTransferId: transferId },
      relations: ['depositMethod'],
    });
    if (!payout) {
      this.logger.warn(`No payout request for Wise transfer ${transferId}`);
      return;
    }

    switch (state) {
      case 'processing':
        await this.payoutRepo.update(payout.id, { providerStatus: 'processing' });
        break;
      case 'funds_converted':
        this.logger.log(`Wise transfer ${transferId}: funds converted`);
        break;
      case 'outgoing_payment_sent':
        await this.handleCompleted(payout, transferId);
        break;
      case 'funds_refunded':
        await this.handleFailed(payout, transferId, 'funds_refunded');
        break;
      case 'cancelled':
        await this.handleCancelled(payout, transferId);
        break;
      default:
        this.logger.log(`Wise transfer ${transferId} state: ${state}`);
    }
  }

  private async handleCompleted(payout: PayoutRequest, transferId: string): Promise<void> {
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.COMPLETED,
      completedAt: new Date(),
      settledAt: new Date(),
      providerStatus: 'outgoing_payment_sent',
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'wise-platform-webhook',
      action: 'bank.payout.settled',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.COMPLETED,
      metadata: { wisePlatformTransferId: transferId },
    });

    await this.publisher.publishPayoutCompleted({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      settledAt: new Date().toISOString(),
      wisePlatformTransferId: transferId,
    });

    // PS-40 §3.1: additive, dedicated event for consumers bound specifically
    // to the Wise-Platform routing key (e.g. a finance alert queue) rather
    // than the generic payout.completed above.
    const amounts = await this.lookupTransferAmounts(transferId);
    await this.publisher.publishWisePlatformTransferSent({
      payoutRequestId: payout.id,
      contractorId: payout.contractorId,
      wisePlatformTransferId: transferId,
      amountUsd: Number(payout.amountUsd),
      targetCurrency: amounts?.targetCurrency ?? payout.depositMethod?.bankCurrency ?? '',
      targetAmount: amounts?.targetAmount ?? Number(payout.amountUsd),
      bankCountry: payout.depositMethod?.bankCountry ?? '',
    });
  }

  private async handleFailed(payout: PayoutRequest, transferId: string, reasonCode: string): Promise<void> {
    const reason = reasonCode === 'funds_refunded'
      ? 'The transfer could not be delivered and funds were returned.'
      : 'The transfer failed.';

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      providerStatus: reasonCode,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'wise-platform-webhook',
      action: 'bank.payout.failed',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.FAILED,
      metadata: { wisePlatformTransferId: transferId, reasonCode },
    });

    // Consumed downstream by earnings-service to restore the contractor's
    // balance — same event bank-payout-executor.service.ts publishes on a
    // Stripe-side failure.
    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason,
      failedAt: new Date().toISOString(),
      wisePlatformTransferId: transferId,
      failureCode: reasonCode,
    });

    // PS-40 §3.2: additive, dedicated event — same rationale as
    // publishWisePlatformTransferSent in handleCompleted above.
    await this.publisher.publishWisePlatformTransferFailed({
      payoutRequestId: payout.id,
      contractorId: payout.contractorId,
      wisePlatformTransferId: transferId,
      amountUsd: Number(payout.amountUsd),
      failureReason: reasonCode,
      bankCountry: payout.depositMethod?.bankCountry ?? '',
    });
  }

  private async handleCancelled(payout: PayoutRequest, transferId: string): Promise<void> {
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.CANCELLED,
      cancelledAt: new Date(),
      providerStatus: 'cancelled',
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'wise-platform-webhook',
      action: 'bank.payout.cancelled',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.CANCELLED,
      metadata: { wisePlatformTransferId: transferId },
    });

    // Same balance-restoration event as a failure — a cancelled transfer
    // never delivered, so the contractor's hold must release the same way.
    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason: 'The transfer was cancelled before funding.',
      failedAt: new Date().toISOString(),
      wisePlatformTransferId: transferId,
      cancelledByProvider: true,
    });
  }
}
