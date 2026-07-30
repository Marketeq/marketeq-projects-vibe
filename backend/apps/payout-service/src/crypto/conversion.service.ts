import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import Redis                  from 'ioredis';

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private readonly redis: Redis;
  private readonly apiBase: string;
  private readonly cacheTtl: number;

  constructor(private readonly config: ConfigService) {
    // Same options as earnings-service CacheService. Without them a bare
    // `new Redis(url)` retries forever and, with no 'error' listener attached,
    // ioredis logs an unhandled error event per attempt — which is what floods
    // the logs when REDIS_URL is unset and this falls back to localhost.
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      connectTimeout:     parseInt(this.config.get('REDIS_CONNECT_TIMEOUT_MS', '2000'), 10),
      commandTimeout:     parseInt(this.config.get('REDIS_COMMAND_TIMEOUT_MS', '500'), 10),
      lazyConnect:        true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 30_000);
      },
    });

    // Rate lookups already fall through to the upstream API when Redis is
    // unavailable (see getDisplayRate), so this only downgrades the noise.
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis unavailable — conversion rates uncached: ${err.message}`);
    });
    this.apiBase = this.config.get('FAWAZAHMED0_API_BASE', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1');
    this.cacheTtl = parseInt(this.config.get('CRYPTO_CONVERSION_CACHE_TTL_SECONDS', '900'), 10);
  }

  async getDisplayRate(token: string, fiat = 'USD'): Promise<{ display: string; rate: number }> {
    const cacheKey = `crypto:rate:${token.toLowerCase()}:${fiat.toLowerCase()}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const rate = parseFloat(cached);
        return { display: `1 ${token} ≈ $${rate.toLocaleString('en-US')}`, rate };
      }
    } catch { /* Redis unavailable — continue to fetch */ }

    try {
      const url = `${this.apiBase}/currencies/${token.toLowerCase()}.json`;
      const http = url.startsWith('https') ? require('https') : require('http');

      const data: any = await new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 3000 }, (res: any) => {
          let body = '';
          res.on('data', (c: string) => body += c);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      });

      const rate = data?.[token.toLowerCase()]?.[fiat.toLowerCase()];
      if (!rate) throw new Error(`No rate for ${token}/${fiat}`);

      try { await this.redis.set(cacheKey, String(rate), 'EX', this.cacheTtl); } catch {}
      return { display: `1 ${token} ≈ $${Number(rate).toLocaleString('en-US')}`, rate };
    } catch {
      this.logger.warn(`Conversion rate fetch failed for ${token}/${fiat}`);
      return { display: `1 ${token} (rate unavailable)`, rate: 0 };
    }
  }
}
