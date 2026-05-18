import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { CurrencyRate } from '../entities/currency-rate.entity';
import { REDIS_KEYS } from '../../config/redis.config';

interface FxApiResponse {
  base: string;
  rates: Record<string, number>;
}

@Injectable()
export class FxRefreshService implements OnModuleInit {
  private readonly logger = new Logger(FxRefreshService.name);

  constructor(
    @InjectRepository(CurrencyRate)
    private readonly rateRepo: Repository<CurrencyRate>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  // On startup: seed the DB if empty so currency endpoints work immediately.
  async onModuleInit(): Promise<void> {
    const count = await this.rateRepo.count();
    if (count === 0) {
      this.logger.log('No FX rates found in DB — fetching on startup');
      await this.refreshRates();
    }
  }

  // Runs every hour — fetches all USD rates from the FX API,
  // upserts into ps_currency_rates, and invalidates Redis cache.
  @Cron(CronExpression.EVERY_HOUR)
  async refreshRates(): Promise<void> {
    const primaryUrl = this.config.get<string>('FX_API_URL');
    const fallbackUrl =
      this.config.get<string>('FX_API_FALLBACK_URL') ?? 'https://api.frankfurter.app';

    let rates: Record<string, number> | null = null;

    // Try primary FX API first.
    if (primaryUrl) {
      try {
        const res = await firstValueFrom(
          this.httpService.get<FxApiResponse>(`${primaryUrl}/latest?from=USD`),
        );
        rates = res.data?.rates ?? null;
        if (rates) this.logger.log('FX rates fetched from primary API');
      } catch (err: any) {
        this.logger.warn(`Primary FX API unreachable (${err.message}) — trying fallback`);
      }
    }

    // Fall back to Frankfurter if primary failed or is not configured.
    if (!rates) {
      try {
        const res = await firstValueFrom(
          this.httpService.get<FxApiResponse>(`${fallbackUrl}/latest?from=USD`),
        );
        rates = res.data?.rates ?? null;
        if (rates) this.logger.log('FX rates fetched from fallback API (Frankfurter)');
      } catch (err: any) {
        this.logger.error(`Both FX APIs unreachable: ${err.message} — skipping refresh`);
        return;
      }
    }

    if (!rates || !Object.keys(rates).length) {
      this.logger.error('FX API returned empty rates — skipping update');
      return;
    }

    const entries = Object.entries(rates);
    const now = new Date();

    // Upsert all currency pairs into the database.
    await this.rateRepo.upsert(
      entries.map(([toCurrency, rate]) => ({
        fromCurrency: 'USD',
        toCurrency,
        rate,
        fetchedAt: now,
      })),
      { conflictPaths: ['fromCurrency', 'toCurrency'] },
    );

    // Invalidate Redis cache so next read picks up fresh DB values.
    const pipeline = this.redis.pipeline();
    for (const [toCurrency] of entries) {
      pipeline.del(REDIS_KEYS.fx('USD', toCurrency));
    }
    pipeline.del(REDIS_KEYS.fxAll('USD'));
    await pipeline.exec();

    this.logger.log(
      `FX refresh complete: ${entries.length} pairs upserted, Redis cache invalidated`,
    );
  }
}
