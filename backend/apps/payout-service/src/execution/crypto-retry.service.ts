// apps/payout-service/src/execution/crypto-retry.service.ts
// PS-12 §8.3: Exponential backoff retry for transient bridge/RPC failures.

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CryptoRetryService {
  private readonly logger = new Logger(CryptoRetryService.name);

  /**
   * Execute a function with exponential backoff retry.
   * Delays: 0s (immediate), 1 min, 5 min.
   * Only retries transient errors (5xx, network errors, timeouts).
   * 4xx errors (bad address, unsupported token) are NOT retried.
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: { payoutRequestId: string; operation: string },
    maxAttempts = 3,
  ): Promise<T> {
    const delays = [0, 60_000, 300_000]; // 0s, 1min, 5min

    for (let i = 0; i < maxAttempts; i++) {
      if (delays[i] > 0) {
        this.logger.log(`Retry ${i + 1}/${maxAttempts} for ${context.operation} (payout: ${context.payoutRequestId}) — waiting ${delays[i] / 1000}s`);
        await new Promise(r => setTimeout(r, delays[i]));
      }

      try {
        return await fn();
      } catch (err: any) {
        const isRetryable = this.isRetryable(err);

        this.logger.warn(
          `Crypto payout attempt ${i + 1}/${maxAttempts} failed: ${context.operation}`,
          {
            payoutRequestId: context.payoutRequestId,
            error: err.message,
            isRetryable,
            attempt: i + 1,
          },
        );

        if (!isRetryable || i === maxAttempts - 1) throw err;
      }
    }

    throw new Error('unreachable');
  }

  /**
   * PS-12 §8.1: Determines if an error is transient and retryable.
   * 5xx bridge errors and RPC connection errors → retryable
   * 4xx bridge errors (bad address, unsupported token) → NOT retryable
   */
  private isRetryable(err: any): boolean {
    // HTTP 5xx errors
    if (err.status >= 500 || err.statusCode >= 500) return true;

    // Network / timeout errors (ethers.js, http)
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') return true;
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') return true;
    if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;

    // NestJS SERVICE_UNAVAILABLE
    if (err.status === 503 || err.statusCode === 503) return true;

    // Explicit error codes from our services
    if (err.errorCode === 'ERR_GAS_ESTIMATION_FAILED') return true;
    if (err.errorCode === 'ERR_TX_BROADCAST_FAILED') return true;
    if (err.errorCode === 'ERR_BRIDGE_UNAVAILABLE') return true;

    // Everything else (4xx, validation, etc.) → not retryable
    return false;
  }
}