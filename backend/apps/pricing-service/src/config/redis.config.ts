import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export function createRedisClient(config: ConfigService): Redis {
  const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    // Retry a few times, then give up so we don't spam reconnect errors while
    // Redis is down — pricing-service reads from PostgreSQL in that case.
    retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2_000)),
    // Do not crash the process if Redis is temporarily unreachable.
    // pricing-service falls back to PostgreSQL reads when Redis is down.
    enableReadyCheck: false,
    lazyConnect: true,
    // Fail commands immediately when disconnected instead of queueing them —
    // otherwise `await redis.get()` hangs while Redis is down, blocking the
    // DB fallback. With this off, the read rejects fast and the catch handler
    // reads from Postgres.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  let loggedError = false;
  client.on('error', (err) => {
    if (loggedError) return;
    loggedError = true;
    console.error('Redis unavailable, using PostgreSQL fallback:', err.message);
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
