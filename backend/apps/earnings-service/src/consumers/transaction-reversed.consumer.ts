import { Injectable }                              from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectRepository }                       from '@nestjs/typeorm';
import { Repository, DataSource }                 from 'typeorm';
import { ConfigService }                          from '@nestjs/config';
import { BaseConsumer }                            from './base.consumer';
import { EarningsCache }                          from '../entities/earnings-cache.entity';
import { BalanceSnapshot }                        from '../entities/balance-snapshot.entity';
import { EarningsPublisher }                      from '../publishers/earnings.publisher';
import { CacheService }                           from '../cache/cache.service';

@Injectable()
export class TransactionReversedConsumer extends BaseConsumer {
  constructor(
    config: ConfigService,
    @InjectRepository(EarningsCache) private readonly ecRepo: Repository<EarningsCache>,
    @InjectRepository(BalanceSnapshot) private readonly bsRepo: Repository<BalanceSnapshot>,
    private readonly ds: DataSource, private readonly publisher: EarningsPublisher,
    private readonly cacheService: CacheService,
  ) { super(config, 'TransactionReversedConsumer'); }

  @MessagePattern('transaction.reversed')
  async handle(@Payload() d: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let attempt = 0;
    while (attempt < this.retryMax) {
      attempt++;
      try {
        if (await this.isDuplicate(d.eventId, 'transaction.reversed')) { ch.ack(msg); return; }
        await this.process(d); ch.ack(msg); return;
      } catch (err: any) {
        this.logger.warn(`Attempt ${attempt}/${this.retryMax}: ${err.message}`);
        if (attempt < this.retryMax) { await this.sleep(this.backoffMs(attempt)); }
        else { this.logger.error('Exhausted → DLQ', { d }); ch.nack(msg, false, false); }
      }
    }
  }

  private async process(d: any): Promise<void> {
    const snapBefore = await this.bsRepo.findOne({ where: { contractorId: d.contractorId } });
    await this.ds.transaction(async em => {
      const res = await em.update(EarningsCache,
        { transactionId: d.transactionId, status: 'confirmed' },
        { status: 'reversed', reversedAt: new Date(d.reversedAt) });
      if (res.affected === 0) { this.logger.warn(`No confirmed row for ${d.transactionId}`); return; }
      await em.query(`UPDATE balance_snapshots SET available_balance = GREATEST(0, available_balance - $1::numeric),
        last_debit_at = NOW(), updated_at = NOW() WHERE contractor_id = $2`, [d.netAmountUsd, d.contractorId]);
    });
    await this.cacheService.invalidateBalance(d.contractorId);
    this.logger.log(`transaction.reversed: ${d.transactionId} -${d.netAmountUsd} USD`);
    const snapAfter = await this.bsRepo.findOne({ where: { contractorId: d.contractorId } });
    await this.publisher.publishBalanceUpdated({
      contractorId: d.contractorId, availableBalance: snapAfter?.availableBalance ?? '0.00',
      previousBalance: snapBefore?.availableBalance ?? '0.00', delta: `-${d.netAmountUsd}`,
      mutationType: 'reversal', sourceEventId: d.eventId, sourceRoutingKey: 'transaction.reversed',
      displayCurrency: snapAfter?.displayCurrency ?? 'USD', localCurrency: snapAfter?.localCurrency ?? 'USD',
      mutationAt: new Date().toISOString(),
    });
  }
}
