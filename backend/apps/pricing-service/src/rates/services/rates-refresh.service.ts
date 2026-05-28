import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
      // Evict the specific cache key for this record's dimensions.
      // On next request, rates.service.ts will re-read from DB and return is_stale=true.
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
}
