import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PlatformRateAverage } from '../entities/platform-rate-average.entity';
import { GetRatesQueryDto } from '../dto/get-rates-query.dto';
import { RatesResponseDto } from '../dto/rates-response.dto';
import { REDIS_KEYS } from '../../config/redis.config';

@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);

  constructor(
    @InjectRepository(PlatformRateAverage)
    private readonly rateRepo: Repository<PlatformRateAverage>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async getRates(query: GetRatesQueryDto): Promise<RatesResponseDto & { cache_hit: boolean }> {
    const cacheKey = REDIS_KEYS.rate(
      query.role ?? 'all',
      query.location ?? 'all',
      query.experience ?? 'all',
      query.schedule ?? 'all',
    );

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), cache_hit: true };
      }
    } catch (err: any) {
      this.logger.warn(`Redis read failed for ${cacheKey}: ${err.message} — falling back to DB`);
    }

    const rate = await this.findRate(query);

    if (!rate) {
      this.logger.log(
        `No rate data: role=${query.role} region=${query.location ?? 'all'} — returning no_data`,
      );
      return {
        role: query.role ?? null,
        location: query.location ?? null,
        experience: query.experience ?? null,
        schedule: query.schedule ?? null,
        hourlyRateLowUsdCents: null,
        hourlyRateMedianUsdCents: null,
        hourlyRateHighUsdCents: null,
        sampleSize: null,
        isStale: false,
        lastUpdated: null,
        noData: true,
        cache_hit: false,
      };
    }

    const staleHours = this.config.get<number>('RATE_STALE_THRESHOLD_HOURS') ?? 24;
    const ageHours = (Date.now() - rate.lastUpdated.getTime()) / 3_600_000;
    const isStale = ageHours >= staleHours;

    this.logger.log(
      `Rate fetched from DB: cacheKey=${cacheKey} sampleSize=${rate.sampleSize} ` +
      `updatedAt=${rate.lastUpdated.toISOString()} is_stale=${isStale}`,
    );

    const response: RatesResponseDto & { cache_hit: boolean; stale_since?: string } = {
      role: query.role ?? null,
      location: query.location ?? null,
      experience: query.experience ?? null,
      schedule: query.schedule ?? null,
      hourlyRateLowUsdCents: rate.hourlyRateLowUsdCents,
      hourlyRateMedianUsdCents: rate.hourlyRateMedianUsdCents,
      hourlyRateHighUsdCents: rate.hourlyRateHighUsdCents,
      sampleSize: rate.sampleSize,
      isStale,
      lastUpdated: rate.lastUpdated.toISOString(),
      noData: false,
      cache_hit: false,
      ...(isStale ? { stale_since: rate.lastUpdated.toISOString() } : {}),
    };

    try {
      const ttl = this.config.get<number>('RATE_CACHE_TTL_SECONDS') ?? 86400;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(response));
    } catch (err: any) {
      this.logger.warn(`Redis write failed for ${cacheKey}: ${err.message}`);
    }

    return response;
  }

  async getPriceGuide(query: GetRatesQueryDto) {
    const rates = await this.getRates(query);
    return {
      low: rates.hourlyRateLowUsdCents,
      median: rates.hourlyRateMedianUsdCents,
      high: rates.hourlyRateHighUsdCents,
      is_stale: rates.isStale,
      no_data: rates.noData,
      role: query.role ?? null,
      location: query.location ?? null,
      experience: query.experience ?? null,
      schedule: query.schedule ?? null,
    };
  }

  private async findRate(q: GetRatesQueryDto): Promise<PlatformRateAverage | null> {
    const where: Record<string, any> = {};
    if (q.role) where.role = ILike(q.role);
    if (q.location) where.region = ILike(q.location);
    if (q.experience) where.experienceLevel = q.experience;
    if (q.schedule) {
      // Custom schedules are normalized to part_time (DB only stores full_time/part_time).
      where.schedule = q.schedule === 'custom' ? 'part_time' : q.schedule;
    }

    // If no dimensions specified, don't return an arbitrary record
    if (Object.keys(where).length === 0) return null;

    return this.rateRepo.findOne({ where });
  }
}
