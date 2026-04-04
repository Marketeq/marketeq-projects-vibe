// apps/payout-service/src/payout/withdrawal-rate-limit.service.ts
// PS-19 §3.2: 5 manual withdrawals per contractor per rolling 60-minute window.
// Tracked in Redis. Scheduled payouts are exempt.

import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PayoutError } from '../common/errors/payout.error';

const MAX_WITHDRAWALS = 5;
const WINDOW_SECONDS = 3600; // 60 minutes

@Injectable()
export class WithdrawalRateLimitService {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  /**
   * PS-19 §3.2: Check and increment the withdrawal rate limit counter.
   * Throws ERR_WITHDRAWAL_RATE_LIMIT (429) if limit exceeded.
   */
  async checkWithdrawalRateLimit(contractorId: string): Promise<void> {
    const key = `ratelimit:withdrawal:${contractorId}`;

    const count = await this.redis.incr(key);

    // Set TTL on first increment only
    if (count === 1) {
      await this.redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_WITHDRAWALS) {
      const ttl = await this.redis.ttl(key);
      throw new PayoutError(
        'You have reached the maximum of 5 withdrawals per hour. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
        'ERR_WITHDRAWAL_RATE_LIMIT',
        { retryAfterSeconds: ttl > 0 ? ttl : WINDOW_SECONDS },
      );
    }
  }
}