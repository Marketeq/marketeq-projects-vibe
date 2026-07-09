import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class CacheService {
  private readonly logger = new Logger('CacheService');
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(config.get<string>('REDIS_URL') as string);
  }

  buildKey(userId: string, scope: 'transactions' | 'invoices', params: object): string {
    const hash = createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .slice(0, 16);
    return 'user:' + userId + ':' + scope + ':' + hash;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      this.logger.warn('Cache read failed: ' + key, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      this.logger.warn('Cache write failed: ' + key, err);
    }
  }

  async invalidate(prefix: string): Promise<void> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [next, batch] = await this.client.scan(
          cursor, 'MATCH', prefix + '*', 'COUNT', 100,
        );
        cursor = next;
        keys.push(...batch);
      } while (cursor !== '0');
      if (keys.length > 0) await this.client.del(...keys);
    } catch (err) {
      this.logger.warn('Cache invalidation failed for ' + prefix, err);
    }
  }
}