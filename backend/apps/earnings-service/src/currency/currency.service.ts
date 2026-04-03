import { Injectable, Logger }     from '@nestjs/common';
import { ConfigService }          from '@nestjs/config';
import { InjectRepository }       from '@nestjs/typeorm';
import { Repository }             from 'typeorm';
import Redis                      from 'ioredis';
import { FxRateCache }            from '../entities/fx-rate-cache.entity';

export interface ConversionResult {
  amount:     string;
  currency:   string;
  rate:       string;
  stale:      boolean;
  rateSource: 'primary' | 'fallback' | 'db_cache' | 'emergency';
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private redis: Redis | null = null;
  private readonly primaryUrl:  string;
  private readonly fallbackUrl: string;
  private readonly cacheTtl:    number;
  private readonly staleMax:    number;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FxRateCache)
    private readonly fxRepo: Repository<FxRateCache>,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try { this.redis = new Redis(redisUrl); } catch { this.redis = null; }
    }
    this.primaryUrl  = this.config.get<string>('FX_API_URL') || '';
    this.fallbackUrl = this.config.get('FX_API_FALLBACK_URL', 'https://api.frankfurter.app');
    this.cacheTtl    = parseInt(this.config.get('FX_CACHE_TTL_SECONDS', '3600'), 10);
    this.staleMax    = parseInt(this.config.get('FX_STALE_MAX_SECONDS', '86400'), 10);
  }

  async convertFromUsd(amountUsd: string, toCurrency: string): Promise<ConversionResult> {
    if (toCurrency === 'USD') {
      return {
        amount: parseFloat(amountUsd).toFixed(2),
        currency: 'USD', rate: '1.00000000', stale: false, rateSource: 'primary',
      };
    }
    const { rate, stale, rateSource } = await this.getRate('USD', toCurrency);
    const raw = parseFloat(amountUsd) * rate;
    return {
      amount: raw.toFixed(2),
      currency: toCurrency, rate: rate.toFixed(8), stale, rateSource,
    };
  }

  async getRate(from: string, to: string):
    Promise<{rate: number; stale: boolean; rateSource: ConversionResult['rateSource']}> {
    from = from.toUpperCase(); to = to.toUpperCase();
    if (from === to) return { rate: 1, stale: false, rateSource: 'primary' };

    // Step 1: Redis cache
    if (this.redis) {
      const cached = await this.redis.get(`fx:${from.toLowerCase()}:${to.toLowerCase()}`);
      if (cached) return { rate: parseFloat(cached), stale: false, rateSource: 'primary' };
    }

    // Step 2: Primary — fawazahmed0
    if (this.primaryUrl) {
      try {
        const rate = await this.fetchFromPrimary(from, to);
        await this.cacheRate(from, to, rate);
        return { rate, stale: false, rateSource: 'primary' };
      } catch (err) {
        this.logger.warn(`Primary FX fetch failed (${from}→${to}): ${err.message}`);
      }
    }

    // Step 3: Fallback — Frankfurter
    try {
      const rate = await this.fetchFromFallback(from, to);
      await this.cacheRate(from, to, rate);
      return { rate, stale: false, rateSource: 'fallback' };
    } catch (err) {
      this.logger.warn(`Fallback FX fetch failed (${from}→${to}): ${err.message}`);
    }

    // Step 4: DB cache
    const dbRow = await this.fxRepo.findOne({ where: { fromCurrency: from, toCurrency: to } });
    if (dbRow) {
      const ageSeconds = (Date.now() - dbRow.fetchedAt.getTime()) / 1000;
      if (ageSeconds <= this.staleMax) {
        this.logger.warn(`Using stale DB rate for ${from}→${to} (age: ${Math.round(ageSeconds)}s)`);
        return { rate: parseFloat(dbRow.rate), stale: true, rateSource: 'db_cache' };
      }
    }

    // Step 5: Emergency
    this.logger.error(`All FX sources exhausted for ${from}→${to}. Returning emergency rate 1.0.`);
    return { rate: 1, stale: true, rateSource: 'emergency' };
  }

  private async fetchFromPrimary(from: string, to: string): Promise<number> {
    const url = `${this.primaryUrl}/v1/currencies/usd.json`;
    const data: any = await this.httpGet(url);
    const rates = data?.usd;
    if (!rates) throw new Error('Unexpected response from fawazahmed0');

    if (from === 'USD') {
      const rate = rates[to.toLowerCase()];
      if (!rate) throw new Error(`Currency ${to} not found`);
      return rate;
    }
    const usdToTo   = rates[to.toLowerCase()];
    const usdToFrom = rates[from.toLowerCase()];
    if (!usdToTo || !usdToFrom) throw new Error(`Missing rate for ${from} or ${to}`);
    return usdToTo / usdToFrom;
  }

  private async fetchFromFallback(from: string, to: string): Promise<number> {
    const url = `${this.fallbackUrl}/latest?from=${from}&to=${to}`;
    const data: any = await this.httpGet(url);
    const rate = data?.rates?.[to];
    if (!rate) throw new Error(`Frankfurter: no rate for ${to}`);
    return rate;
  }

  private httpGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const lib = url.startsWith('https') ? require('https') : require('http');
      const req = lib.get(url, { timeout: 5000 }, (res: any) => {
        let body = '';
        res.on('data', (chunk: string) => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Invalid JSON')); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private async cacheRate(from: string, to: string, rate: number): Promise<void> {
    const fKey = `fx:${from.toLowerCase()}:${to.toLowerCase()}`;
    const rKey = `fx:${to.toLowerCase()}:${from.toLowerCase()}`;

    if (this.redis) {
      await this.redis.pipeline()
        .setex(fKey, this.cacheTtl, rate.toFixed(8))
        .setex(rKey, this.cacheTtl, (1 / rate).toFixed(8))
        .exec();
    }

    await this.fxRepo.query(`
      INSERT INTO fx_rate_cache (from_currency, to_currency, rate, fetched_at, expires_at)
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${this.cacheTtl} seconds')
      ON CONFLICT (from_currency, to_currency) DO UPDATE
      SET rate = $3, fetched_at = NOW(), expires_at = NOW() + INTERVAL '${this.cacheTtl} seconds'
    `, [from, to, rate.toFixed(8)]);

    await this.fxRepo.query(`
      INSERT INTO fx_rate_cache (from_currency, to_currency, rate, fetched_at, expires_at)
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${this.cacheTtl} seconds')
      ON CONFLICT (from_currency, to_currency) DO UPDATE
      SET rate = $3, fetched_at = NOW(), expires_at = NOW() + INTERVAL '${this.cacheTtl} seconds'
    `, [to, from, (1 / rate).toFixed(8)]);
  }
}
