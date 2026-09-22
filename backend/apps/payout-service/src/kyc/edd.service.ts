// apps/payout-service/src/kyc/edd.service.ts
// PS-15 §6: Enhanced Due Diligence (EDD) for payouts >= $10,000.
// Routes high-value payouts to compliance review queue before execution.

import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';

const EDD_THRESHOLD = 10_000; // $10,000 USD

@Injectable()
export class EddService {
  private readonly logger = new Logger(EddService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {}

  /**
   * PS-15 §6.2: Check if payout amount triggers EDD review.
   */
  async checkEDD(
    amountUSD: number,
    contractorId: string,
  ): Promise<{ requiresEDD: boolean }> {
    if (amountUSD < EDD_THRESHOLD) {
      return { requiresEDD: false };
    }

    // Log EDD trigger for compliance audit trail
    await this.auditService.log({
      contractorId,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'edd.triggered',
      metadata: { amountUSD, threshold: EDD_THRESHOLD },
    });

    this.logger.warn(`EDD triggered for contractor ${contractorId}: $${amountUSD} >= $${EDD_THRESHOLD}`);

    return { requiresEDD: true };
  }

  /**
   * PS-15 §6.2: Publish EDD event to compliance queue.
   * Called after payout_requests row is created with status=awaiting_edd.
   */
  async publishEddEvent(payload: {
    payoutRequestId: string;
    contractorId: string;
    amountUSD: number;
    depositMethodId: string;
    methodType: string;
  }): Promise<void> {
    await this.publisher.publishEddTriggered({
      contractorId: payload.contractorId,
      payoutRequestId: payload.payoutRequestId,
      amountUsd: payload.amountUSD,
      triggerReason: `Amount $${payload.amountUSD} met the $${EDD_THRESHOLD} EDD threshold.`,
    });
    this.logger.log(`[EDD] payout.edd.triggered published for payout ${payload.payoutRequestId}`);
  }

  /**
   * Returns the EDD threshold for display purposes.
   */
  getThreshold(): number {
    return EDD_THRESHOLD;
  }
}