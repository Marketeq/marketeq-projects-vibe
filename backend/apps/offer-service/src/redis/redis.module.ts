// apps/offer-service/src/redis/redis.module.ts
// OS-14: Global RedisModule — creates a single shared ioredis client.
// Imported once in AppModule. @Global() makes REDIS_CLIENT injectable everywhere.
import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { OfferConfig } from '../config/offer.config';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const cfg = config.get<OfferConfig>('offer')!.redis;
        const redisUrl = config.get<string>('REDIS_URL');

        if (!redisUrl && cfg.host === 'localhost') {
          logger.warn('REDIS_URL not set — Redis disabled, using null client');
          return null;
        }

        const client = new Redis({
          host: cfg.host,
          port: cfg.port,
          password: cfg.password || undefined,
          keyPrefix: cfg.keyPrefix || 'offer:',
          retryStrategy: (times: number) => {
            if (times > 10) return null;
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true,
          enableReadyCheck: false,
        });

        client.on('error', (err) => {
          logger.error(`Redis connection error: ${err.message}`);
        });

        client.on('connect', () => {
          logger.log('Connected to Redis');
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}