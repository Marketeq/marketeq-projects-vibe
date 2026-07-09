import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { PlatformRateAverage } from '../entities/platform-rate-average.entity';
import { REDIS_KEYS } from '../../config/redis.config';

@Injectable()
export class RatesRefreshService {
  private readonly logger = new Logger(RatesRefreshService.name);

  constructor(
    @InjectRepository(PlatformRateAverage)
    private readonly rateRepo: Repository<PlatformRateAverage>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  // Runs every hour — finds stale rate records and evicts their Redis cache entries
  // so the next request re-reads from DB and surfaces the is_stale flag to the client.
  @Cron(CronExpression.EVERY_HOUR)
  async evictStaleRateCache(): Promise<void> {
    const staleHours = this.config.get<number>('RATE_STALE_THRESHOLD_HOURS') ?? 24;
    const staleThreshold = new Date(Date.now() - staleHours * 3_600_000);

    let staleRecords: PlatformRateAverage[];
    try {
      staleRecords = await this.rateRepo.find({
        where: { lastUpdated: LessThan(staleThreshold) },
      });
    } catch (err: any) {
      this.logger.error(`Rate staleness check failed: ${err.message}`);
      return;
    }

    if (!staleRecords.length) {
      this.logger.log('Rate staleness check: all records are fresh');
      return;
    }

    const pipeline = this.redis.pipeline();
    for (const record of staleRecords) {
      const key = REDIS_KEYS.rate(
        record.role,
        record.region,
        record.experienceLevel,
        record.schedule,
      );
      pipeline.del(key);
    }
    await pipeline.exec();

    this.logger.warn(
      `Rate staleness check: ${staleRecords.length} stale record(s) found — ` +
      `Redis cache evicted, next request will expose is_stale=true`,
    );
  }

  // Runs daily at 3 AM — fetches rate averages from transaction-service
  // and updates the local ps_platform_rate_averages table.
  @Cron('0 3 * * *')
  async refreshRatesFromTransactions(): Promise<void> {
    const txServiceUrl = this.config.get<string>('TRANSACTION_SERVICE_URL');
    if (!txServiceUrl) {
      this.logger.warn('TRANSACTION_SERVICE_URL not set — skipping daily rate refresh');
      return;
    }

    try {
      const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await firstValueFrom(
        this.http.get(`${txServiceUrl}/v1/transactions/rate-averages`, {
          params: { sinceDate },
          timeout: 15_000,
        }),
      );

      if (!data?.averages?.length) {
        this.logger.log('Daily rate refresh: no transaction data available');
        return;
      }

      let updated = 0;
      for (const avg of data.averages) {
        if (!avg.effectiveHourlyRate || avg.transactionCount < 3) continue;

        const rateCents = Math.round(avg.effectiveHourlyRate * 100);

        // Update all matching records with fresh rate data
        const result = await this.rateRepo
          .createQueryBuilder()
          .update(PlatformRateAverage)
          .set({
            hourlyRateMedianUsdCents: rateCents,
            hourlyRateLowUsdCents: Math.round(rateCents * 0.7),
            hourlyRateHighUsdCents: Math.round(rateCents * 1.4),
            sampleSize: avg.transactionCount,
          })
          .where('1 = 1') // update all records — broad refresh
          .andWhere('"last_updated" < :threshold', {
            threshold: new Date(Date.now() - 12 * 3_600_000),
          })
          .execute();

        updated += result.affected ?? 0;
      }

      this.logger.log(`Daily rate refresh: updated ${updated} rate record(s) from transaction data`);
    } catch (err: any) {
      this.logger.error(`Daily rate refresh failed: ${err.message}`);
    }
  }
}
