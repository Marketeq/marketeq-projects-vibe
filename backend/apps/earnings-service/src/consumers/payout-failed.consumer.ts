import { Injectable }                              from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectRepository }                       from '@nestjs/typeorm';
import { Repository, DataSource }                 from 'typeorm';
import { ConfigService }                          from '@nestjs/config';
import { BaseConsumer }                            from './base.consumer';
import { BalanceSnapshot }                        from '../entities/balance-snapshot.entity';
import { EarningsPublisher }                      from '../publishers/earnings.publisher';
import { CacheService }                           from '../cache/cache.service';

@Injectable()
export class PayoutFailedConsumer extends BaseConsumer {
  constructor(
    config: ConfigService,
    @InjectRepository(BalanceSnapshot) private readonly bsRepo: Repository<BalanceSnapshot>,
    private readonly ds: DataSource, private readonly publisher: EarningsPublisher,
    private readonly cacheService: CacheService,
  ) { super(config, 'PayoutFailedConsumer'); }

  @MessagePattern('payout.failed')
  async handle(@Payload() d: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let attempt = 0;
    while (attempt < this.retryMax) {
      attempt++;
      try {
        if (await this.isDuplicate(d.eventId, 'payout.failed')) { ch.ack(msg); return; }
        const snapBefore = await this.bsRepo.findOne({ where: { contractorId: d.contractorId } });
        await this.ds.query(`UPDATE balance_snapshots SET available_balance = available_balance + $1::numeric,
          total_paid_out_usd = GREATEST(0, total_paid_out_usd - $1::numeric), updated_at = NOW()
          WHERE contractor_id = $2`, [d.payoutAmountUsd, d.contractorId]);
        await this.cacheService.invalidateBalance(d.contractorId);
        this.logger.log(`payout.failed: ${d.payoutId} restored +${d.payoutAmountUsd}`);
        const snapAfter = await this.bsRepo.findOne({ where: { contractorId: d.contractorId } });
        await this.publisher.publishBalanceUpdated({
          contractorId: d.contractorId, availableBalance: snapAfter?.availableBalance ?? '0.00',
          previousBalance: snapBefore?.availableBalance ?? '0.00', delta: `+${d.payoutAmountUsd}`,
          mutationType: 'payout_failed', sourceEventId: d.eventId, sourceRoutingKey: 'payout.failed',
          displayCurrency: snapAfter?.displayCurrency ?? 'USD', localCurrency: snapAfter?.localCurrency ?? 'USD',
          mutationAt: new Date().toISOString(),
        });
        ch.ack(msg); return;
      } catch (err: any) {
        this.logger.warn(`Attempt ${attempt}/${this.retryMax}: ${err.message}`);
        if (attempt < this.retryMax) { await this.sleep(this.backoffMs(attempt)); }
        else { this.logger.error('Exhausted → DLQ', { d }); ch.nack(msg, false, false); }
      }
    }
  }
}
