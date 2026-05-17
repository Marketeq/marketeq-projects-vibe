import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CurrencyRate } from '../entities/currency-rate.entity';
import { REDIS_KEYS } from '../../config/redis.config';

export interface FxRateResult {
  rate: number;
  fetchedAt: string;
  isStale: boolean;
}

@Injectable()
export class FxCacheService {
  private readonly logger = new Logger(FxCacheService.name);

  constructor(
    @InjectRepository(CurrencyRate)
    private readonly rateRepo: Repository<CurrencyRate>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async getRate(from: string, to: string): Promise<FxRateResult> {
    const cacheKey = REDIS_KEYS.fx(from, to);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { rate: parsed.rate, fetchedAt: parsed.fetchedAt, isStale: false };
      }
    } catch (err: any) {
      this.logger.warn(`Redis read failed for ${cacheKey}: ${err.message} — falling back to DB`);
    }

    const record = await this.rateRepo.findOne({
      where: { fromCurrency: from, toCurrency: to },
    });

    if (!record) {
      this.logger.error(`Both FX APIs unavailable for ${from}:${to} and no cached fallback — returning 503`);
      throw new ServiceUnavailableException({
        code: 'PS_DEPENDENCY_ERROR',
        message: 'Exchange rate service unavailable.',
      });
    }

    const ttl = this.config.get<number>('FX_CACHE_TTL_SECONDS') ?? 3600;
    const staleThresholdMs = ttl * 1000;
    const ageMs = Date.now() - new Date(record.fetchedAt).getTime();
    const isStale = ageMs > staleThresholdMs;
    const fetchedAt = new Date(record.fetchedAt).toISOString();

    if (isStale) {
      this.logger.warn(`Both FX APIs unreachable for ${from}:${to} — serving stale cached rate`);
    }

    if (!isStale) {
      try {
        await this.redis.setex(
          cacheKey,
          ttl,
          JSON.stringify({ rate: record.rate, fetchedAt }),
        );
      } catch (err: any) {
        this.logger.warn(`Redis write failed for ${cacheKey}: ${err.message}`);
      }
    }

    return { rate: Number(record.rate), fetchedAt, isStale };
  }

  async getAllRates(base: string): Promise<{ rates: Record<string, number>; fetchedAt: string; isStale: boolean }> {
    const cacheKey = REDIS_KEYS.fxAll(base);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), isStale: false };
      }
    } catch (err: any) {
      this.logger.warn(`Redis read failed for ${cacheKey}: ${err.message} — falling back to DB`);
    }

    const records = await this.rateRepo.find({
      where: { fromCurrency: base },
    });

    if (!records.length) {
      throw new ServiceUnavailableException({
        code: 'PS_DEPENDENCY_ERROR',
        message: 'Exchange rate service unavailable.',
      });
    }

    const ttl = this.config.get<number>('FX_CACHE_TTL_SECONDS') ?? 3600;
    const staleThresholdMs = ttl * 1000;

    const oldestFetchedAt = records.reduce((oldest, r) =>
      new Date(r.fetchedAt) < new Date(oldest.fetchedAt) ? r : oldest,
    ).fetchedAt;

    const ageMs = Date.now() - new Date(oldestFetchedAt).getTime();
    const isStale = ageMs > staleThresholdMs;
    const fetchedAt = new Date(oldestFetchedAt).toISOString();

    const rates: Record<string, number> = {};
    for (const r of records) {
      rates[r.toCurrency] = Number(r.rate);
    }

    if (!isStale) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify({ rates, fetchedAt }));
      } catch (err: any) {
        this.logger.warn(`Redis write failed for ${cacheKey}: ${err.message}`);
      }
    }

    return { rates, fetchedAt, isStale };
  }
}
