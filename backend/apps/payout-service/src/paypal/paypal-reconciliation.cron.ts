// apps/payout-service/src/paypal/paypal-reconciliation.cron.ts
// Polling fallback for PayPal payout status. The webhook path
// (paypal-webhook.controller.ts) is the fast path once it's actually wired
// up (PAYPAL_WEBHOOK_ID + a dashboard subscription + a publicly reachable
// URL) — none of which exist in local dev, and even in production a missed
// or failed webhook delivery would otherwise leave a payout stuck at
// PROCESSING forever, the same gap this closes. Mirrors the lock/tick
// pattern in schedule-execution.cron.ts.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { MethodType } from '../entities/deposit-method.entity';
import { PaypalProvider } from '../providers/paypal.provider';

const LOCK_TTL_MS = 4 * 60 * 1000; // 4 minutes — shorter than the 5-minute tick below
const CONCURRENCY_CAP = 20;

// Terminal PayPal item states this cron acts on. PENDING/UNCLAIMED/ONHOLD
// are left alone — still genuinely in flight, not stuck.
const SUCCESS_STATUSES = new Set(['SUCCESS']);
const FAILURE_STATUSES = new Set(['FAILED', 'DENIED', 'BLOCKED', 'RETURNED', 'REFUNDED', 'REVERSED']);

@Injectable()
export class PaypalReconciliationCron {
  private readonly logger = new Logger(PaypalReconciliationCron.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly paypalProvider: PaypalProvider,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  @Cron('*/5 * * * *')
  async reconcile(): Promise<void> {
    const lockKey = 'paypal:reconcile:lock';
    const lockAcquired = await this.redis.set(lockKey, 'locked', 'PX', LOCK_TTL_MS, 'NX');
    if (!lockAcquired) {
      this.logger.warn('PayPal reconciliation already running — skipping tick');
      return;
    }

    try {
      // 60s grace period so this never races the initial createPayout() call
      // for a payout still mid-request.
      const cutoff = new Date(Date.now() - 60_000);
      const stuck = await this.payoutRepo.find({
        where: { status: PayoutStatus.PROCESSING, processingAt: LessThan(cutoff) },
        relations: ['depositMethod'],
        take: 200,
      });
      const paypalPayouts = stuck.filter((p) => p.depositMethod?.methodType === MethodType.PAYPAL);
      if (paypalPayouts.length === 0) return;

      this.logger.log(`PayPal reconciliation: checking ${paypalPayouts.length} stuck payout(s)`);

      const batches = this.chunk(paypalPayouts, CONCURRENCY_CAP);
      for (const batch of batches) {
        await Promise.allSettled(batch.map((p) => this.reconcileOne(p)));
      }
    } catch (err: any) {
      this.logger.error(`PayPal reconciliation error: ${err.message}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async reconcileOne(payout: PayoutRequest): Promise<void> {
    const batchId = payout.providerReference ?? payout.externalTransactionId;
    if (!batchId) return;

    try {
      const result = await this.paypalProvider.getPayoutBatch(batchId);
      const status = result?.item?.transaction_status;
      if (!status) return;

      if (SUCCESS_STATUSES.has(status)) {
        await this.paypalProvider.handlePayoutItemSucceeded(result!.item);
      } else if (FAILURE_STATUSES.has(status)) {
        await this.paypalProvider.handlePayoutItemFailed(result!.item, status);
      }
      // PENDING / UNCLAIMED / ONHOLD: leave at PROCESSING, check again next tick.
    } catch (err: any) {
      this.logger.warn(`PayPal reconciliation failed for payout ${payout.id} (batch ${batchId}): ${err.message}`);
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }
}
