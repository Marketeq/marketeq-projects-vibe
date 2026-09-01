import { Controller }                              from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectRepository }                       from '@nestjs/typeorm';
import { Repository, DataSource }                 from 'typeorm';
import { ConfigService }                          from '@nestjs/config';
import { BaseConsumer }                            from './base.consumer';
import { EarningsCache }                          from '../entities/earnings-cache.entity';
import { BalanceSnapshot }                        from '../entities/balance-snapshot.entity';
import { EarningsPublisher }                      from '../publishers/earnings.publisher';
import { CacheService }                           from '../cache/cache.service';

@Controller()
export class TransactionCreatedConsumer extends BaseConsumer {
  constructor(
    config: ConfigService,
    @InjectRepository(EarningsCache) private readonly ecRepo: Repository<EarningsCache>,
    @InjectRepository(BalanceSnapshot) private readonly bsRepo: Repository<BalanceSnapshot>,
    private readonly ds: DataSource,
    private readonly publisher: EarningsPublisher,
    private readonly cacheService: CacheService,
  ) { super(config, 'TransactionCreatedConsumer'); }

  @MessagePattern('transaction.created')
  async handle(@Payload() d: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let attempt = 0;
    while (attempt < this.retryMax) {
      attempt++;
      try {
        await this.process(d); ch.ack(msg); return;
      } catch (err: any) {
        if (err?.code === '23505') { this.logger.warn(`Duplicate skipped: ${d?.transactionId}`); ch.ack(msg); return; }
        this.logger.warn(`Attempt ${attempt}/${this.retryMax}: ${err.message}`);
        if (attempt < this.retryMax) { await this.sleep(this.backoffMs(attempt)); }
        else { this.logger.error('Exhausted → DLQ', { d }); ch.nack(msg, false, false); }
      }
    }
  }

  private async process(d: any): Promise<void> {
    // Step 1: DB write
    await this.ds.transaction(async em => {
      await em.createQueryBuilder().insert().into(EarningsCache).values({
        transactionId: d.transactionId, contractorId: d.contractorId,
        contractId: d.contractId ?? null, projectId: d.projectId ?? null,
        taskId: d.taskId ?? null, entryType: d.entryType,
        grossAmount: d.grossAmount, feeAmount: d.feeAmount, netAmount: d.netAmount,
        currency: d.currency, fxRateToUsd: d.fxRateToUsd, netAmountUsd: d.netAmountUsd,
        status: 'confirmed', workStartAt: new Date(d.workStartAt),
        workEndAt: new Date(d.workEndAt), durationMinutes: d.durationMinutes,
        avgKeyboardPct: d.avgKeyboardPct ?? null, avgMousePct: d.avgMousePct ?? null,
        idempotencyKey: d.idempotencyKey,
      }).orIgnore().execute();

      await em.query(`
        INSERT INTO balance_snapshots (contractor_id, available_balance, total_earned_usd, last_credit_at, updated_at)
        VALUES ($1, $2::numeric, $2::numeric, NOW(), NOW())
        ON CONFLICT (contractor_id) DO UPDATE SET
          available_balance = balance_snapshots.available_balance + $2::numeric,
          total_earned_usd  = balance_snapshots.total_earned_usd  + $2::numeric,
          last_credit_at = NOW(), updated_at = NOW()
      `, [d.contractorId, d.netAmountUsd]);
    });

    // Step 2: Invalidate cache
    await this.cacheService.invalidateBalance(d.contractorId);
    this.logger.log(`transaction.created: ${d.transactionId} +${d.netAmountUsd} USD`);

    // Step 3: Publish event
    const snap = await this.bsRepo.findOne({ where: { contractorId: d.contractorId } });
    const prev = snap ? (parseFloat(snap.availableBalance) - parseFloat(d.netAmountUsd)).toFixed(2) : '0.00';
    await this.publisher.publishBalanceUpdated({
      contractorId: d.contractorId, availableBalance: snap?.availableBalance ?? d.netAmountUsd,
      previousBalance: prev, delta: `+${d.netAmountUsd}`, mutationType: 'credit',
      sourceEventId: d.eventId, sourceRoutingKey: 'transaction.created',
      displayCurrency: snap?.displayCurrency ?? 'USD', localCurrency: snap?.localCurrency ?? 'USD',
      mutationAt: new Date().toISOString(),
    });

    // Step 4: YTD threshold check
    await this.checkAndPublishThreshold(d.contractorId, d.netAmountUsd, d.workStartAt);
  }

  private async checkAndPublishThreshold(contractorId: string, netAmountUsd: string, workStartAt: string): Promise<void> {
    const year = new Date(workStartAt).getUTCFullYear();
    const row = await this.ds.query(`
      SELECT COALESCE(SUM(CAST(net_amount_usd AS numeric)), 0) AS ytd FROM earnings_cache
      WHERE contractor_id = $1 AND status = 'confirmed' AND EXTRACT(YEAR FROM work_start_at) = $2`,
      [contractorId, year]);
    const ytd = parseFloat(row[0]?.ytd ?? '0');
    if (ytd < 600.00) return;
    if (!this.redis) return;
    const first = await this.redis.set(`threshold_fired:${contractorId}:${year}`, '1', 'EX', 400 * 86400, 'NX');
    if (first === null) return;
    await this.publisher.publishThresholdReached({
      contractorId, year, ytdTotalUsd: ytd.toFixed(2), thresholdUsd: 600.00, crossedAt: workStartAt,
    });
  }
}
