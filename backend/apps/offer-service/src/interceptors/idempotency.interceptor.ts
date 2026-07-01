// apps/offer-service/src/interceptors/idempotency.interceptor.ts
// OS-14: Redis-backed idempotency. Caches successful responses for 24h.
// Applied per-endpoint on POST/PATCH via @UseInterceptors(IdempotencyInterceptor).
import {
  CallHandler, ExecutionContext, Inject, Injectable,
  NestInterceptor, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { OFFER_CONSTANTS } from '../common/constants/offer.constants';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROCESSING_LOCK_TTL_SECONDS = 30;
const PROCESSING_SENTINEL = 'PROCESSING';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly ttlSeconds = OFFER_CONSTANTS.IDEMPOTENCY_KEY_TTL_HOURS * 3600;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only apply to write operations
    if (request.method === 'GET') {
      return next.handle();
    }

    // 1. Read and validate the idempotency key
    const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;

    if (!idempotencyKey) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'X-Idempotency-Key header is required for this operation. Generate a UUID v4 on the client and include it in every write request.',
      });
    }

    if (!UUID_V4_REGEX.test(idempotencyKey)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: 'X-Idempotency-Key must be a valid UUID v4 (e.g. f47ac10b-58cc-4372-a567-0e02b2c3d479). Use crypto.randomUUID() or a uuid library to generate one.',
      });
    }

    // 2. Build Redis key scoped to userId
    const userId = (request as any).user?.sub || (request as any).user?.id;
    if (!userId) {
      this.logger.warn('IdempotencyInterceptor: no userId on request. Is this a @Public() endpoint?');
      return next.handle();
    }

    // keyPrefix "offer:" is applied by ioredis — full key: offer:idempotency:{userId}:{key}
    const redisKey = `idempotency:${userId}:${idempotencyKey}`;

    // 3. Process with idempotency semantics (graceful degradation if Redis is unavailable)
    return from(this.processWithIdempotency(redisKey, next).catch((err) => {
      if (this.isRedisConnectionError(err)) {
        this.logger.warn('Redis unavailable — skipping idempotency check, proceeding with request.');
        return new Promise<unknown>((resolve, reject) => {
          next.handle().subscribe({ next: resolve, error: reject });
        });
      }
      throw err;
    }));
  }

  private isRedisConnectionError(err: unknown): boolean {
    const msg = (err as Error)?.message ?? '';
    return msg.includes('Connection is closed') || msg.includes('ECONNREFUSED') || msg.includes('Stream isn\'t writeable');
  }

  private async processWithIdempotency(
    redisKey: string,
    next: CallHandler,
  ): Promise<unknown> {
    // Check existing Redis entry
    const existing = await this.redis.get(redisKey);

    // Case A: Cache hit — return stored response without running controller
    if (existing && existing !== PROCESSING_SENTINEL) {
      try {
        const cached = JSON.parse(existing) as { statusCode: number; body: unknown };
        this.logger.debug(`Idempotency cache hit for key ${redisKey}. Returning cached ${cached.statusCode} response.`);
        return cached.body;
      } catch {
        this.logger.warn(`Malformed idempotency cache entry for key ${redisKey}. Proceeding as new request.`);
        await this.redis.del(redisKey);
      }
    }

    // Case B: Another request with this key is in-flight
    if (existing === PROCESSING_SENTINEL) {
      throw new ConflictException({
        statusCode: 409,
        error: 'IDEMPOTENCY_CONFLICT',
        message: 'A request with this idempotency key is currently being processed. Wait for it to complete before retrying.',
      });
    }

    // Case C: No existing entry — write PROCESSING lock (SET NX EX 30)
    const locked = await this.redis.set(
      redisKey,
      PROCESSING_SENTINEL,
      'EX',
      PROCESSING_LOCK_TTL_SECONDS,
      'NX',
    );

    if (locked !== 'OK') {
      throw new ConflictException({
        statusCode: 409,
        error: 'IDEMPOTENCY_CONFLICT',
        message: 'A request with this idempotency key is currently being processed. Wait for it to complete before retrying.',
      });
    }

    // Execute controller and cache successful response
    try {
      const responseBody = await new Promise<unknown>((resolve, reject) => {
        next.handle().subscribe({
          next: (value) => resolve(value),
          error: (err) => reject(err),
        });
      });

      // Store successful response with 24h TTL (overwrites PROCESSING sentinel)
      const cacheEntry = JSON.stringify({
        statusCode: 200,
        body: responseBody,
      });

      await this.redis.set(redisKey, cacheEntry, 'EX', this.ttlSeconds);

      return responseBody;
    } catch (error) {
      // On error: delete PROCESSING lock so client can retry with same key
      await this.redis.del(redisKey);
      throw error;
    }
  }
}