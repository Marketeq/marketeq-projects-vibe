import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService }                       from '@nestjs/config';
import Redis                                   from 'ioredis';

const CACHE_VERSION = 1;

export interface BalanceCacheEntry {
  availableBalance:  string;
  pendingHoldUsd:    string;
  totalEarnedUsd:    string;
  totalPaidOutUsd:   string;
  displayCurrency:   string;
  localCurrency:     string;
  updatedAt:         string;
  cachedAt:          string;
  cacheVersion:      number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis:  Redis;
  private readonly ttl:    number;
  private available = true;

  constructor(private readonly config: ConfigService) {
    this.ttl = parseInt(this.config.get('BALANCE_CACHE_TTL_SECONDS', '300'), 10);
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl, {
      connectTimeout:    parseInt(this.config.get('REDIS_CONNECT_TIMEOUT_MS', '2000'), 10),
      commandTimeout:    parseInt(this.config.get('REDIS_COMMAND_TIMEOUT_MS', '500'), 10),
      lazyConnect:       true,
      enableOfflineQueue:false,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 30_000);
      },
    });

    this.redis.on('error', (err) => {
      this.available = false;
      this.logger.warn(`Redis error — falling back to DB: ${err.message}`);
    });
    this.redis.on('ready', () => {
      this.available = true;
      this.logger.log('Redis reconnected — cache resuming');
    });
  }

  async onModuleDestroy() {
    try { await this.redis.quit(); } catch { /* ignore */ }
  }

  async getBalance(userId: string): Promise<BalanceCacheEntry | null> {
    if (!this.available) return null;
    try {
      const raw = await this.redis.get(`balance:${userId}`);
      if (!raw) return null;
      const entry: BalanceCacheEntry = JSON.parse(raw);
      if (entry.cacheVersion !== CACHE_VERSION) {
        this.logger.debug(`Cache version mismatch for ${userId} — treating as miss`);
        return null;
      }
      return entry;
    } catch (err) {
      this.logger.warn(`Cache GET error for balance:${userId}: ${err.message}`);
      return null;
    }
  }

  async setBalance(userId: string, entry: Omit<BalanceCacheEntry, 'cachedAt' | 'cacheVersion'>): Promise<void> {
    if (!this.available) return;
    try {
      const payload: BalanceCacheEntry = {
        ...entry,
        cachedAt:     new Date().toISOString(),
        cacheVersion: CACHE_VERSION,
      };
      await this.redis.setex(`balance:${userId}`, this.ttl, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`Cache SET error for balance:${userId}: ${err.message}`);
    }
  }

  async invalidateBalance(userId: string): Promise<void> {
    if (!this.available) return;
    try {
      await this.redis.del(`balance:${userId}`);
    } catch (err) {
      this.logger.warn(`Cache DEL error for balance:${userId}: ${err.message}`);
    }
  }

  async invalidateBalanceBatch(userIds: string[]): Promise<void> {
    if (!this.available || userIds.length === 0) return;
    try {
      await this.redis.del(...userIds.map(id => `balance:${id}`));
    } catch (err) {
      this.logger.warn(`Cache batch DEL error: ${err.message}`);
    }
  }
}
