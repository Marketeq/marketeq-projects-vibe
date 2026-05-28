import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export function createRedisClient(config: ConfigService): Redis {
  const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    // Retry with exponential backoff up to 10 seconds between attempts.
    retryStrategy: (times: number) => Math.min(times * 200, 10_000),
    // Do not crash the process if Redis is temporarily unreachable.
    // pricing-service falls back to PostgreSQL reads when Redis is down.
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err.message);
  });

  return client;
}

// Redis cache key helpers — used by RatesService and FxCacheService.
// Centralising key construction avoids key format drift across services.
export const REDIS_KEYS = {
  // Rate cache key: includes all four lookup dimensions.
  // Example: ps:rates:ux_designer:united_states:mid:full_time
  rate: (
    role: string,
    location: string,
    experience: string,
    schedule: string,
  ) => `ps:rates:${slugify(role)}:${slugify(location)}:${experience}:${schedule}`,

  // FX rate cache key: pair of currencies.
  // Example: ps:fx:USD:EUR
  fx: (from: string, to: string) => `ps:fx:${from}:${to}`,

  // All FX rates for a base currency.
  // Example: ps:fx:all:USD
  fxAll: (base: string) => `ps:fx:all:${base}`,
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
