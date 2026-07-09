import { Logger }        from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis             from 'ioredis';

export abstract class BaseConsumer {
  protected readonly logger: Logger;
  protected redis: Redis | null = null;
  protected readonly retryMax: number;
  protected readonly retryDelayMs: number;
  private readonly redisUrl: string;

  constructor(config: ConfigService, ctx: string) {
    this.logger       = new Logger(ctx);
    this.redisUrl     = config.get<string>('REDIS_URL') || '';
    this.retryMax     = parseInt(config.get('CONSUMER_RETRY_MAX', '3'), 10);
    this.retryDelayMs = parseInt(config.get('CONSUMER_RETRY_DELAY_MS', '1000'), 10);
    if (this.redisUrl) {
      try { this.redis = new Redis(this.redisUrl); } catch { this.redis = null; }
    }
  }

  protected async isDuplicate(eventId: string, key: string): Promise<boolean> {
    if (!this.redis) return false;
    const r = await this.redis.set(`processed:${key}:${eventId}`, '1', 'EX', 86400, 'NX');
    return r === null;
  }

  protected backoffMs(attempt: number): number {
    return this.retryDelayMs * Math.pow(2, attempt - 1);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
