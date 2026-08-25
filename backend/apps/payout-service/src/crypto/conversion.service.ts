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

  // Provider-specific: unlike getDisplayRate() above (a generic, provider-
  // agnostic market rate used at connect time for every crypto provider),
  // this calls Transak's real Get Price API directly — the same fee-
  // inclusive quote a contractor would actually get. Real HTTP call,
  // verified against Transak's staging Get Price endpoint, not a stub.
  // Returns null (never throws) so the caller can fall back to the generic
  // market rate — this is a display convenience, not something that should
  // block connecting a wallet if Transak's API is briefly unavailable.
  //
  // Both TRANSAK_API_KEY and TRANSAK_API_BASE are required: the host differs
  // per environment (staging vs production Transak), so it is read from env
  // rather than defaulted in code (DEVOPS_SOP §6). Unset means "skip the
  // Transak quote and use the generic rate", never "silently quote off
  // Transak staging in production".
  async getTransakDisplayRate(
    token: string, network: string, fiatAmount = 100,
  ): Promise<{ display: string; rate: number } | null> {
    const apiKey = this.config.get<string>('TRANSAK_API_KEY');
    if (!apiKey) return null;

    const apiBase = this.config.get<string>('TRANSAK_API_BASE');
    if (!apiBase) {
      this.logger.warn('TRANSAK_API_BASE is not set — falling back to the generic market rate.');
      return null;
    }
    const params = new URLSearchParams({
      partnerApiKey: apiKey,
      fiatCurrency: 'USD',
      cryptoCurrency: token,
      network,
      isBuyOrSell: 'BUY',
      fiatAmount: String(fiatAmount),
      paymentMethod: 'credit_debit_card',
    });

    try {
      const res = await fetch(`${apiBase}/api/v1/pricing/public/quotes?${params.toString()}`, {
        headers: { 'x-api-key': apiKey },
      });
      const data: any = await res.json().catch(() => null);
      const cryptoAmount = data?.response?.cryptoAmount;
      const quotedFiat = data?.response?.fiatAmount;
      if (!res.ok || !cryptoAmount || !quotedFiat) {
        this.logger.warn(`Transak quote failed for ${token}/${network}: ${res.status} ${JSON.stringify(data)}`);
        return null;
      }
      const rate = quotedFiat / cryptoAmount;
      return { display: `1 ${token} ≈ $${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} (Transak rate, incl. fees)`, rate };
    } catch (err) {
      this.logger.warn(`Transak quote request failed for ${token}/${network}: ${(err as Error).message}`);
      return null;
    }
  }
}
