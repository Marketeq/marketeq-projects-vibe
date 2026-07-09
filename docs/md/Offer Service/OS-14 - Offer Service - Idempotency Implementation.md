**OS-14**

**Offer Service --- Idempotency Implementation**

**Header:** X-Idempotency-Key: \<UUID v4\> **Storage:** Redis **TTL:**
24 hours **Format:** offer:idempotency:{userId}:{key}

This document covers the complete idempotency implementation for
offer-service. Idempotency prevents duplicate state changes when a
client retries a request due to a network timeout, mobile app retry, or
accidental double-submit. Every write operation in offer-service (POST
and PATCH) requires a client-supplied X-Idempotency-Key header. If the
same key is sent again within 24 hours, the original response is
returned without re-executing the operation.

**File Map --- All Idempotency Files to Create**

  ---------- --------------------------------------------- ---------------------------
  **Step**   **File Path**                                 **Purpose**

  **0**      (install)                                     npm install ioredis
                                                           \@nestjs/cache-manager
                                                           cache-manager-ioredis-yet

  **1**      src/redis/redis.module.ts                     RedisModule --- exports a
                                                           configured ioredis client
                                                           as a provider

  **2**      src/redis/redis.constants.ts                  REDIS_CLIENT injection
                                                           token constant

  **3**      src/interceptors/idempotency.interceptor.ts   IdempotencyInterceptor ---
                                                           core logic

  **4**      src/app.module.ts (update)                    Import RedisModule into
                                                           AppModule

  **5**      (reference)                                   Which endpoints require
                                                           X-Idempotency-Key and which
                                                           do not
  ---------- --------------------------------------------- ---------------------------

+-----------------------------------------------------------------------+
| **Overview Why Idempotency Matters in Offer-Service**                 |
|                                                                       |
| The specific problems it solves                                       |
+-----------------------------------------------------------------------+

Offer operations change financial and legal state. If a client\'s \"Send
Offer\" request times out at the network layer after the server
processed it, the client app may retry --- creating a duplicate offer.
If a talent\'s \"Accept\" request is retried, two acceptances would fire
the offer.accepted event, potentially creating two contracts in
contracts-service. Idempotency prevents all of these scenarios.

+-----------------------------------------------------------------------+
| Concrete scenarios prevented by idempotency:                          |
|                                                                       |
| Scenario 1: Mobile app creates an offer, receives timeout, retries.   |
|                                                                       |
| Without idempotency: Two offers created. Client sees duplicate.       |
|                                                                       |
| With idempotency: Second request returns the first offer. No          |
| duplicate.                                                            |
|                                                                       |
| Scenario 2: Talent accepts offer. Response lost in transit. App       |
| retries.                                                              |
|                                                                       |
| Without idempotency: offer.accepted fired twice. Two ContractGroups   |
| created.                                                              |
|                                                                       |
| With idempotency: Second accept returns the already-accepted offer.   |
| One contract.                                                         |
|                                                                       |
| Scenario 3: Client submits counter offer. Double-tap on mobile.       |
|                                                                       |
| Without idempotency: Two counter offers created. One supersedes the   |
| other.                                                                |
|                                                                       |
| With idempotency: Second submit returns the first counter offer. One  |
| CO.                                                                   |
|                                                                       |
| Scenario 4: Frontend sends PATCH /v1/offers/:id (edit) twice          |
| simultaneously.                                                       |
|                                                                       |
| Without idempotency: Two edits processed. Race condition.             |
|                                                                       |
| With idempotency: One edit processed. Second returns cached result.   |
+-----------------------------------------------------------------------+

**How It Works --- Step by Step**

  ---------- ------------------------------------------------------------------
  **Step**   **What Happens**

  **1**      Client generates a UUID v4 and sends it in the X-Idempotency-Key
             header.

  **2**      IdempotencyInterceptor intercepts the request BEFORE the
             controller method runs.

  **3**      Interceptor validates the key format (must be UUID v4, 36 chars,
             standard format).

  **4**      Interceptor constructs the Redis key:
             offer:idempotency:{userId}:{idempotencyKey}

  **5**      Interceptor checks Redis for an existing entry with this key.

  **6a**     If NO entry exists: request is new. A \"PROCESSING\" lock is
             written to Redis. Request proceeds to the controller.

  **6b**     If entry is \"PROCESSING\": another request with this key is
             in-flight. Return 409 IDEMPOTENCY_CONFLICT.

  **6c**     If entry is a stored response: key was used before. Return the
             stored response immediately. Controller never runs.

  **7**      Controller executes and returns a response (success or error).

  **8**      Interceptor intercepts the outgoing response.

  **9**      Interceptor stores the response in Redis with the idempotency key
             and 24h TTL.

  **10**     Response is sent to the client. On any retry within 24h, Step 6c
             replays it.
  ---------- ------------------------------------------------------------------

**Redis Key Structure**

The idempotency key stored in Redis includes the userId to prevent
cross-user key collisions. If two users happen to generate the same UUID
v4 (astronomically unlikely, but theoretically possible), they will have
different Redis keys and will not interfere with each other.

+---------------------------------------------------------------------------------------------+
| // Redis key format:                                                                        |
|                                                                                             |
| offer:idempotency:{userId}:{X-Idempotency-Key}                                              |
|                                                                                             |
| // Example:                                                                                 |
|                                                                                             |
| offer:idempotency:550e8400-e29b-41d4-a716-446655440000:f47ac10b-58cc-4372-a567-0e02b2c3d479 |
|                                                                                             |
| // TTL: 24 hours (86400 seconds)                                                            |
|                                                                                             |
| // Configured via IDEMPOTENCY_KEY_TTL_HOURS in environment variables (OS-09)                |
|                                                                                             |
| // Value stored: JSON-serialised cached response                                            |
|                                                                                             |
| {                                                                                           |
|                                                                                             |
| \"statusCode\": 201,                                                                        |
|                                                                                             |
| \"body\": { \"id\": \"offer-uuid\", \"status\": \"PENDING\", \... }                         |
|                                                                                             |
| }                                                                                           |
|                                                                                             |
| // Value during processing (lock):                                                          |
|                                                                                             |
| \"PROCESSING\"                                                                              |
|                                                                                             |
| // Lock TTL: 30 seconds (prevents orphaned locks if the service crashes mid-request)        |
+---------------------------------------------------------------------------------------------+

**Endpoint Coverage --- Which Operations Require the Key**

  ---------------------------------- --------------- ------------------------------
  **Endpoint**                       **Required?**   **Why**

  POST /v1/offers                    **Required**    Creates an offer record.
                                                     Duplicate = two active offers.

  PATCH /v1/offers/:id               **Required**    Edits offer terms. Duplicate =
                                                     double TTL reset, double
                                                     notification.

  POST /v1/offers/:id/accept         **Required**    Fires offer.accepted.
                                                     Duplicate = two contracts
                                                     created.

  POST /v1/offers/:id/decline        **Required**    Fires offer.declined.
                                                     Duplicate event is harmless
                                                     but confusing.

  POST /v1/offers/:id/withdraw       **Required**    Fires offer.withdrawn.
                                                     Idempotent by nature but key
                                                     enforced for consistency.

  POST /v1/offers/:id/resend         **Required**    Creates a new offer record.
                                                     Duplicate = two resent offers.

  POST \.../counter-offers           **Required**    Creates a counter offer
                                                     record.

  PATCH \.../counter-offers/:id      **Required**    Edits CO terms. Same reason as
                                                     offer edit.

  POST                               **Required**    Fires offer.counter_accepted +
  \.../counter-offers/:id/accept                     offer.accepted.

  POST                               **Required**    Fires offer.counter_declined.
  \.../counter-offers/:id/decline                    

  POST                               **Required**    Fires offer.counter_withdrawn.
  \.../counter-offers/:id/withdraw                   

  GET /v1/offers/:id                 **NOT           Read-only. Safe to duplicate.
                                     required**      

  GET /v1/offers/:id/history         **NOT           Read-only.
                                     required**      

  GET \.../counter-offers/:id        **NOT           Read-only.
                                     required**      

  GET /health                        **NOT           Health probe. No state change.
                                     required**      

  GET /ready                         **NOT           Readiness probe. No state
                                     required**      change.
  ---------------------------------- --------------- ------------------------------

+-----------------------------------------------------------------------+
| **Step 0 Install Dependencies**                                       |
|                                                                       |
| Run once from the monorepo root                                       |
+-----------------------------------------------------------------------+

ioredis is the Redis client library --- full-featured, promise-based,
TypeScript-native. It is the recommended client for NestJS services.
cache-manager-ioredis-yet is the modern ioredis adapter for NestJS
CacheModule (the \"yet\" suffix is the maintained fork). Check your
monorepo package.json first --- Redis client may already be installed.

  -----------------------------------------------------------------------
  **FILE: Terminal --- run from monorepo root**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Check if ioredis is already installed                              |
|                                                                       |
| cat package.json \| grep ioredis                                      |
|                                                                       |
| \# Install ioredis if not present                                     |
|                                                                       |
| npm install ioredis                                                   |
|                                                                       |
| npm install \--save-dev \@types/ioredis                               |
|                                                                       |
| \# Verify                                                             |
|                                                                       |
| cat package.json \| grep ioredis                                      |
|                                                                       |
| \# Expected: \"ioredis\": \"\^5.x.x\"                                 |
|                                                                       |
| \# uuid is needed for generating idempotency key validation           |
|                                                                       |
| npm install uuid                                                      |
|                                                                       |
| npm install \--save-dev \@types/uuid                                  |
|                                                                       |
| \# Note: Do NOT install cache-manager or \@nestjs/cache-manager for   |
| idempotency.                                                          |
|                                                                       |
| \# We use ioredis directly in the interceptor for maximum control.    |
|                                                                       |
| \# Cache manager adds unnecessary abstraction for this use case.      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 RedisModule --- Shared ioredis Client**                      |
|                                                                       |
| Creates a single Redis connection reused across the service           |
+-----------------------------------------------------------------------+

RedisModule creates a single ioredis client that is shared across the
entire offer-service. Using a shared client prevents connection pool
exhaustion. The module is marked global so any other module that needs
Redis access can inject the client without importing RedisModule
explicitly.

+-----------------------------------------------------------------------+
| Why a custom RedisModule instead of NestJS CacheModule?               |
|                                                                       |
| CacheModule is designed for simple key-value caching with TTL.        |
|                                                                       |
| For idempotency we need: SET with NX (only set if not exists) + EX    |
| (TTL) + GET.                                                          |
|                                                                       |
| ioredis provides these as atomic operations (SET key value EX 86400   |
| NX).                                                                  |
|                                                                       |
| Using ioredis directly gives us exact control over the locking        |
| behaviour.                                                            |
|                                                                       |
| NestJS CacheModule does not expose these atomic Redis commands.       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/redis/redis.constants.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* REDIS_CLIENT --- Injection token for the ioredis client.           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Used with \@Inject(REDIS_CLIENT) in services and interceptors.     |
|                                                                       |
| \* Keep this in its own file so it can be imported without importing  |
|                                                                       |
| \* the full RedisModule, avoiding circular dependencies.              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const REDIS_CLIENT = Symbol(\'REDIS_CLIENT\');                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/redis/redis.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| import { REDIS_CLIENT } from \'./redis.constants\';                   |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* RedisModule --- Provides a shared ioredis client for               |
| offer-service.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@Global() --- means any module can inject REDIS_CLIENT without    |
| importing RedisModule.                                                |
|                                                                       |
| \* Imported once in AppModule. All other modules get access           |
| automatically.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The connection is configured from offer.redis.\* env vars (OS-09): |
|                                                                       |
| \* REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (optional), REDIS_TLS       |
| (optional)                                                            |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| provide: REDIS_CLIENT,                                                |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| useFactory: (config: ConfigService) =\> {                             |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').redis;               |
|                                                                       |
| const client = new Redis({                                            |
|                                                                       |
| host: cfg.host,                                                       |
|                                                                       |
| port: cfg.port,                                                       |
|                                                                       |
| password: cfg.password \|\| undefined,                                |
|                                                                       |
| tls: cfg.tls ? {} : undefined,                                        |
|                                                                       |
| keyPrefix: cfg.keyPrefix \|\| \'offer:\',                             |
|                                                                       |
| // Reconnect automatically on disconnect.                             |
|                                                                       |
| // Attempt up to 10 retries with exponential backoff.                 |
|                                                                       |
| retryStrategy: (times: number) =\> {                                  |
|                                                                       |
| if (times \> 10) return null; // Stop retrying after 10 attempts      |
|                                                                       |
| return Math.min(times \* 100, 3000); // 100ms, 200ms, \... 3000ms     |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Lazy connect: do not connect until first command.                  |
|                                                                       |
| // Prevents startup failures if Redis is temporarily unavailable.     |
|                                                                       |
| lazyConnect: false,                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| client.on(\'error\', (err) =\> {                                      |
|                                                                       |
| console.error(\'\[RedisModule\] Connection error:\', err.message);    |
|                                                                       |
| });                                                                   |
|                                                                       |
| client.on(\'connect\', () =\> {                                       |
|                                                                       |
| console.log(\'\[RedisModule\] Connected to Redis\');                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| return client;                                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[REDIS_CLIENT\],                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class RedisModule {}                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 IdempotencyInterceptor**                                     |
|                                                                       |
| The core implementation --- intercepts requests and manages the cache |
+-----------------------------------------------------------------------+

IdempotencyInterceptor is a NestJS interceptor applied per-endpoint via
\@UseInterceptors(IdempotencyInterceptor). It runs both before and after
the controller method. Before: checks the Redis cache and potentially
short-circuits the request. After: stores the response in Redis so
future retries get the same result.

+-----------------------------------------------------------------------+
| Interceptors wrap the controller method execution.                    |
|                                                                       |
| The intercept() method receives a CallHandler (next).                 |
|                                                                       |
| Calling next.handle() runs the controller method.                     |
|                                                                       |
| NOT calling next.handle() short-circuits the request --- this is how  |
| cache hits work.                                                      |
|                                                                       |
| The observable returned from intercept() is what ultimately reaches   |
| the client.                                                           |
|                                                                       |
| Never store error responses in the idempotency cache.                 |
|                                                                       |
| Only 2xx responses are cached. If the controller returns a 409 or     |
| 500,                                                                  |
|                                                                       |
| the idempotency key is freed so the client can retry with the same    |
| key.                                                                  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/interceptors/idempotency.interceptor.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------------------------+
| import {                                                                                |
|                                                                                         |
| CallHandler, ExecutionContext, Inject, Injectable,                                      |
|                                                                                         |
| NestInterceptor, BadRequestException, ConflictException, Logger,                        |
|                                                                                         |
| } from \'@nestjs/common\';                                                              |
|                                                                                         |
| import { Observable, from, switchMap, tap } from \'rxjs\';                              |
|                                                                                         |
| import { Request } from \'express\';                                                    |
|                                                                                         |
| import Redis from \'ioredis\';                                                          |
|                                                                                         |
| import { REDIS_CLIENT } from \'../redis/redis.constants\';                              |
|                                                                                         |
| import { ConfigService } from \'@nestjs/config\';                                       |
|                                                                                         |
| import { OfferConfig } from \'../config/offer.config\';                                 |
|                                                                                         |
| import { OFFER_CONSTANTS } from \'../common/constants/offer.constants\';                |
|                                                                                         |
| /\*\*                                                                                   |
|                                                                                         |
| \* The TTL for the in-flight lock (PROCESSING state).                                   |
|                                                                                         |
| \* If the service crashes mid-request, this lock will expire after 30 seconds,          |
|                                                                                         |
| \* allowing the client to retry.                                                        |
|                                                                                         |
| \*/                                                                                     |
|                                                                                         |
| const PROCESSING_LOCK_TTL_SECONDS = 30;                                                 |
|                                                                                         |
| /\*\*                                                                                   |
|                                                                                         |
| \* The value stored in Redis while a request is in-flight.                              |
|                                                                                         |
| \* Detected in canActivate to prevent concurrent duplicate requests.                    |
|                                                                                         |
| \*/                                                                                     |
|                                                                                         |
| const PROCESSING_SENTINEL = \'PROCESSING\';                                             |
|                                                                                         |
| /\*\*                                                                                   |
|                                                                                         |
| \* IdempotencyInterceptor --- Implements idempotent request handling.                   |
|                                                                                         |
| \*                                                                                      |
|                                                                                         |
| \* Applied per-endpoint with \@UseInterceptors(IdempotencyInterceptor).                 |
|                                                                                         |
| \* Only applies to write operations: POST and PATCH.                                    |
|                                                                                         |
| \*                                                                                      |
|                                                                                         |
| \* Request lifecycle:                                                                   |
|                                                                                         |
| \* 1. Read X-Idempotency-Key from request header.                                       |
|                                                                                         |
| \* 2. Validate format (must be UUID v4).                                                |
|                                                                                         |
| \* 3. Check Redis for existing entry.                                                   |
|                                                                                         |
| \* 4a. Cache hit (stored response): return cached response, skip controller.            |
|                                                                                         |
| \* 4b. Processing lock active: return 409 IDEMPOTENCY_CONFLICT.                         |
|                                                                                         |
| \* 4c. No entry: write PROCESSING lock, proceed to controller.                          |
|                                                                                         |
| \* 5. Controller executes and returns response.                                         |
|                                                                                         |
| \* 6. Store successful response in Redis with 24h TTL.                                  |
|                                                                                         |
| \* 7. Release PROCESSING lock (overwritten by stored response in step 6).               |
|                                                                                         |
| \*/                                                                                     |
|                                                                                         |
| \@Injectable()                                                                          |
|                                                                                         |
| export class IdempotencyInterceptor implements NestInterceptor {                        |
|                                                                                         |
| private readonly logger = new Logger(IdempotencyInterceptor.name);                      |
|                                                                                         |
| constructor(                                                                            |
|                                                                                         |
| \@Inject(REDIS_CLIENT)                                                                  |
|                                                                                         |
| private readonly redis: Redis,                                                          |
|                                                                                         |
| private readonly config: ConfigService,                                                 |
|                                                                                         |
| ) {}                                                                                    |
|                                                                                         |
| private get ttlSeconds(): number {                                                      |
|                                                                                         |
| const cfg = this.config.get\<OfferConfig\>(\'offer\');                                  |
|                                                                                         |
| return (cfg.idempotency?.ttlHours ?? OFFER_CONSTANTS.IDEMPOTENCY_KEY_TTL_HOURS) \*      |
| 3600;                                                                                   |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| intercept(context: ExecutionContext, next: CallHandler): Observable\<unknown\> {        |
|                                                                                         |
| const request = context.switchToHttp().getRequest\<Request\>();                         |
|                                                                                         |
| // Only apply idempotency to write operations.                                          |
|                                                                                         |
| // GET requests are safe to repeat without idempotency.                                 |
|                                                                                         |
| if (request.method === \'GET\') {                                                       |
|                                                                                         |
| return next.handle();                                                                   |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // 1. Read and validate the idempotency key                                             |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| const idempotencyKey = request.headers\[\'x-idempotency-key\'\] as string \| undefined; |
|                                                                                         |
| if (!idempotencyKey) {                                                                  |
|                                                                                         |
| throw new BadRequestException({                                                         |
|                                                                                         |
| statusCode: 400,                                                                        |
|                                                                                         |
| error: \'MISSING_IDEMPOTENCY_KEY\',                                                     |
|                                                                                         |
| message: \'X-Idempotency-Key header is required for this operation. Generate a UUID v4  |
| on the client and include it in every write request.\',                                 |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // Validate UUID v4 format: 8-4-4-4-12 with version 4 and variant bits                  |
|                                                                                         |
| const UUID_V4_REGEX =                                                                   |
| /\^\[0-9a-f\]{8}-\[0-9a-f\]{4}-4\[0-9a-f\]{3}-\[89ab\]\[0-9a-f\]{3}-\[0-9a-f\]{12}\$/i; |
|                                                                                         |
| if (!UUID_V4_REGEX.test(idempotencyKey)) {                                              |
|                                                                                         |
| throw new BadRequestException({                                                         |
|                                                                                         |
| statusCode: 400,                                                                        |
|                                                                                         |
| error: \'INVALID_IDEMPOTENCY_KEY\',                                                     |
|                                                                                         |
| message: \'X-Idempotency-Key must be a valid UUID v4 (e.g.                              |
| f47ac10b-58cc-4372-a567-0e02b2c3d479). Use crypto.randomUUID() or a uuid library to     |
| generate one.\',                                                                        |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // 2. Build the Redis key (scoped to userId to prevent cross-user collisions)           |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // req.user is populated by JwtAuthGuard which runs before interceptors.                |
|                                                                                         |
| const userId = (request as any).user?.sub as string \| undefined;                       |
|                                                                                         |
| if (!userId) {                                                                          |
|                                                                                         |
| // This should not happen --- JwtAuthGuard runs before this interceptor.                |
|                                                                                         |
| // If it does, it means \@Public() endpoint accidentally has \@UseInterceptors.         |
|                                                                                         |
| this.logger.warn(\'IdempotencyInterceptor: no userId on request. Is this a \@Public()   |
| endpoint?\');                                                                           |
|                                                                                         |
| return next.handle();                                                                   |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // Key format: idempotency:{userId}:{idempotencyKey}                                    |
|                                                                                         |
| // Note: RedisModule.keyPrefix already prepends \"offer:\" so the full key is:          |
|                                                                                         |
| // offer:idempotency:{userId}:{idempotencyKey}                                          |
|                                                                                         |
| const redisKey = \`idempotency:\${userId}:\${idempotencyKey}\`;                         |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // 3. Process the request with idempotency semantics                                    |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| return from(this.processWithIdempotency(redisKey, next));                               |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| private async processWithIdempotency(                                                   |
|                                                                                         |
| redisKey: string,                                                                       |
|                                                                                         |
| next: CallHandler,                                                                      |
|                                                                                         |
| ): Promise\<unknown\> {                                                                 |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // Check existing Redis entry                                                           |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| const existing = await this.redis.get(redisKey);                                        |
|                                                                                         |
| // Case A: Key was used before and response was stored.                                 |
|                                                                                         |
| // Return the cached response without running the controller.                           |
|                                                                                         |
| if (existing && existing !== PROCESSING_SENTINEL) {                                     |
|                                                                                         |
| try {                                                                                   |
|                                                                                         |
| const cached = JSON.parse(existing) as { statusCode: number; body: unknown };           |
|                                                                                         |
| this.logger.debug(\`Idempotency cache hit for key \${redisKey}. Returning cached        |
| \${cached.statusCode} response.\`);                                                     |
|                                                                                         |
| // Return the body directly. NestJS will serialize it.                                  |
|                                                                                         |
| return cached.body;                                                                     |
|                                                                                         |
| } catch {                                                                               |
|                                                                                         |
| // Malformed cache entry. Delete and proceed as new request.                            |
|                                                                                         |
| this.logger.warn(\`Malformed idempotency cache entry for key \${redisKey}. Proceeding   |
| as new request.\`);                                                                     |
|                                                                                         |
| await this.redis.del(redisKey);                                                         |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // Case B: Another request with this key is in-flight.                                  |
|                                                                                         |
| if (existing === PROCESSING_SENTINEL) {                                                 |
|                                                                                         |
| throw new ConflictException({                                                           |
|                                                                                         |
| statusCode: 409,                                                                        |
|                                                                                         |
| error: \'IDEMPOTENCY_CONFLICT\',                                                        |
|                                                                                         |
| message: \'A request with this idempotency key is currently being processed. Wait for   |
| it to complete before retrying.\',                                                      |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // Case C: No existing entry. Write the PROCESSING lock.                                |
|                                                                                         |
| // SET key PROCESSING EX 30 NX --- only set if key does not exist (NX).                 |
|                                                                                         |
| // If two concurrent requests arrive simultaneously, only one will win the NX lock.     |
|                                                                                         |
| const locked = await this.redis.set(                                                    |
|                                                                                         |
| redisKey,                                                                               |
|                                                                                         |
| PROCESSING_SENTINEL,                                                                    |
|                                                                                         |
| \'EX\',                                                                                 |
|                                                                                         |
| PROCESSING_LOCK_TTL_SECONDS,                                                            |
|                                                                                         |
| \'NX\', // Only set if Not eXists                                                       |
|                                                                                         |
| );                                                                                      |
|                                                                                         |
| // Another concurrent request won the lock race.                                        |
|                                                                                         |
| if (locked !== \'OK\') {                                                                |
|                                                                                         |
| throw new ConflictException({                                                           |
|                                                                                         |
| statusCode: 409,                                                                        |
|                                                                                         |
| error: \'IDEMPOTENCY_CONFLICT\',                                                        |
|                                                                                         |
| message: \'A request with this idempotency key is currently being processed. Wait for   |
| it to complete before retrying.\',                                                      |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| // Execute the controller and cache the response                                        |
|                                                                                         |
| // ================================================================                     |
|                                                                                         |
| try {                                                                                   |
|                                                                                         |
| // next.handle() runs the controller method and returns an Observable.                  |
|                                                                                         |
| // We convert to a promise to use async/await.                                          |
|                                                                                         |
| const responseBody = await new Promise\<unknown\>((resolve, reject) =\> {               |
|                                                                                         |
| next.handle().subscribe({                                                               |
|                                                                                         |
| next: (value) =\> resolve(value),                                                       |
|                                                                                         |
| error: (err) =\> reject(err),                                                           |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| // Store successful response in Redis with full TTL.                                    |
|                                                                                         |
| // This overwrites the PROCESSING sentinel.                                             |
|                                                                                         |
| const cacheEntry = JSON.stringify({                                                     |
|                                                                                         |
| statusCode: 200, // Stored for reference. Actual HTTP status is set by NestJS.          |
|                                                                                         |
| body: responseBody,                                                                     |
|                                                                                         |
| });                                                                                     |
|                                                                                         |
| await this.redis.set(                                                                   |
|                                                                                         |
| redisKey,                                                                               |
|                                                                                         |
| cacheEntry,                                                                             |
|                                                                                         |
| \'EX\',                                                                                 |
|                                                                                         |
| this.ttlSeconds,                                                                        |
|                                                                                         |
| );                                                                                      |
|                                                                                         |
| return responseBody;                                                                    |
|                                                                                         |
| } catch (error) {                                                                       |
|                                                                                         |
| // On error: delete the PROCESSING lock so the client can retry with the same key.      |
|                                                                                         |
| // Do NOT cache error responses --- the client may retry and succeed.                   |
|                                                                                         |
| await this.redis.del(redisKey);                                                         |
|                                                                                         |
| throw error;                                                                            |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| }                                                                                       |
|                                                                                         |
| }                                                                                       |
+-----------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Update AppModule --- Import RedisModule**                    |
|                                                                       |
| One import line in AppModule                                          |
+-----------------------------------------------------------------------+

RedisModule must be imported in AppModule for the ioredis client to be
available as an injectable provider. Because RedisModule is decorated
with \@Global(), the REDIS_CLIENT token is automatically available in
every module in the application without additional imports.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts (add RedisModule to
  imports)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { APP_GUARD } from \'@nestjs/core\';                           |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { AuthModule } from \'./auth/auth.module\';                    |
|                                                                       |
| import { RedisModule } from \'./redis/redis.module\'; // \<\-- ADD    |
| THIS                                                                  |
|                                                                       |
| import { OffersModule } from \'./offers/offers.module\';              |
|                                                                       |
| import { CounterOffersModule } from                                   |
| \'./counter-offers/counter-offers.module\';                           |
|                                                                       |
| import { HealthModule } from \'./common/health/health.module\';       |
|                                                                       |
| import { JwtAuthGuard } from \'./guards/jwt-auth.guard\';             |
|                                                                       |
| import offerConfig from \'./config/offer.config\';                    |
|                                                                       |
| import { validationSchema } from \'./config/validation.schema\';      |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({                                                |
|                                                                       |
| isGlobal: true,                                                       |
|                                                                       |
| load: \[offerConfig\],                                                |
|                                                                       |
| validationSchema,                                                     |
|                                                                       |
| }),                                                                   |
|                                                                       |
| TypeOrmModule.forRootAsync({                                          |
|                                                                       |
| useFactory: (config) =\> ({                                           |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| host: config.get(\'offer.db.host\'),                                  |
|                                                                       |
| port: config.get\<number\>(\'offer.db.port\'),                        |
|                                                                       |
| username: config.get(\'offer.db.username\'),                          |
|                                                                       |
| password: config.get(\'offer.db.password\'),                          |
|                                                                       |
| database: config.get(\'offer.db.database\'),                          |
|                                                                       |
| schema: config.get(\'offer.db.schema\'),                              |
|                                                                       |
| autoLoadEntities: true,                                               |
|                                                                       |
| synchronize: config.get(\'offer.db.synchronize\'),                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| inject: \[ConfigModule\],                                             |
|                                                                       |
| }),                                                                   |
|                                                                       |
| AuthModule,                                                           |
|                                                                       |
| RedisModule, // \<\-- ADD THIS. \@Global() means REDIS_CLIENT is      |
| available everywhere.                                                 |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| { provide: APP_GUARD, useClass: JwtAuthGuard },                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Using \@UseInterceptors in Controllers**                     |
|                                                                       |
| Apply IdempotencyInterceptor to write endpoints                       |
+-----------------------------------------------------------------------+

IdempotencyInterceptor is applied per-method using
\@UseInterceptors(IdempotencyInterceptor) on each write endpoint. It is
deliberately NOT applied globally or at the class level because GET
endpoints must not require the X-Idempotency-Key header. The controller
patterns from OS-10/OS-12 already show this in context.

**Apply to POST/PATCH endpoints, skip GET endpoints**

+-----------------------------------------------------------------------+
| import { IdempotencyInterceptor } from                                |
| \'../interceptors/idempotency.interceptor\';                          |
|                                                                       |
| \@Controller(\'offers\')                                              |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class OffersController {                                       |
|                                                                       |
| // WRITE endpoint --- apply IdempotencyInterceptor                    |
|                                                                       |
| \@Post()                                                              |
|                                                                       |
| \@UseGuards(RolesGuard)                                               |
|                                                                       |
| \@Roles(UserRole.CLIENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor) // \<\-- Required. Client   |
| must send X-Idempotency-Key.                                          |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async createOffer(@Req() req, \@Body() dto: CreateOfferDto) {         |
|                                                                       |
| return this.offersService.create(req.user.sub, dto);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // READ endpoint --- do NOT apply IdempotencyInterceptor              |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| \@UseGuards(OfferPartyGuard)                                          |
|                                                                       |
| // No \@UseInterceptors here --- GET requests are safe to repeat      |
| without a key.                                                        |
|                                                                       |
| async getOffer(@Param(\'id\', ParseUUIDPipe) id: string) {            |
|                                                                       |
| return this.offersService.findById(id);                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // WRITE endpoint --- apply IdempotencyInterceptor                    |
|                                                                       |
| \@Post(\':id/accept\')                                                |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.TALENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor) // \<\-- Required. Prevents |
| double-accept.                                                        |
|                                                                       |
| async acceptOffer(@Req() req, \@Param(\'id\', ParseUUIDPipe) id:      |
| string, \@Body() dto: AcceptOfferDto) {                               |
|                                                                       |
| return this.offersService.accept(id, req.user.sub, dto);              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**CounterOffersController --- class-level guard, method-level
interceptor**

+-----------------------------------------------------------------------+
| // CounterOffersController: OfferPartyGuard at class level,           |
| IdempotencyInterceptor per-method                                     |
|                                                                       |
| \@Controller(\'offers/:offerId/counter-offers\')                      |
|                                                                       |
| \@UseGuards(JwtAuthGuard, OfferPartyGuard)                            |
|                                                                       |
| export class CounterOffersController {                                |
|                                                                       |
| \@Post()                                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor) // Required for POST        |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async createCounterOffer(                                             |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: CreateCounterOfferDto,                                  |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.create(offerId, req.user.sub,        |
| req.user.role, dto);                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| // No \@UseInterceptors --- GET is safe to repeat                     |
|                                                                       |
| async getCounterOffer(                                                |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.findById(offerId, id);               |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Patch(\':id\')                                                      |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor) // Required for PATCH       |
|                                                                       |
| async editCounterOffer(                                               |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: EditCounterOfferDto,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.edit(offerId, id, req.user.sub,      |
| dto);                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Post(\':id/accept\')                                                |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async acceptCounterOffer(                                             |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.accept(offerId, id, req.user.sub);   |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Post(\':id/decline\')                                               |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async declineCounterOffer(                                            |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.decline(offerId, id, req.user.sub);  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Post(\':id/withdraw\')                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async withdrawCounterOffer(                                           |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: WithdrawCounterOfferDto,                                |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.withdraw(offerId, id, req.user.sub,  |
| dto);                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Reference Error Responses from IdempotencyInterceptor**             |
|                                                                       |
| What the client receives for each failure mode                        |
+-----------------------------------------------------------------------+

The interceptor can return three different error responses before the
request reaches the controller. These are distinct from the business
logic errors returned by the service layer.

**Error 1 --- 400 MISSING_IDEMPOTENCY_KEY**

The client sent a POST or PATCH without the X-Idempotency-Key header.
The client must generate a UUID v4 and include it before retrying.

+-----------------------------------------------------------------------+
| // HTTP 400                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 400,                                                  |
|                                                                       |
| \"error\": \"MISSING_IDEMPOTENCY_KEY\",                               |
|                                                                       |
| \"message\": \"X-Idempotency-Key header is required for this          |
| operation. Generate a UUID v4 on the client and include it in every   |
| write request.\",                                                     |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Error 2 --- 400 INVALID_IDEMPOTENCY_KEY**

The X-Idempotency-Key header was present but is not a valid UUID v4.
Common causes: sending a sequential integer, a short token, or a UUID
v1/v3/v5 instead of v4.

+-----------------------------------------------------------------------+
| // HTTP 400                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 400,                                                  |
|                                                                       |
| \"error\": \"INVALID_IDEMPOTENCY_KEY\",                               |
|                                                                       |
| \"message\": \"X-Idempotency-Key must be a valid UUID v4 (e.g.        |
| f47ac10b-58cc-4372-a567-0e02b2c3d479). Use crypto.randomUUID() or a   |
| uuid library to generate one.\",                                      |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Error 3 --- 409 IDEMPOTENCY_CONFLICT**

The client sent a request with a key that is already being processed by
another in-flight request. This is the race condition case: two
identical requests arrived simultaneously. The client should wait for
the in-flight request to complete before retrying.

+-----------------------------------------------------------------------+
| // HTTP 409                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 409,                                                  |
|                                                                       |
| \"error\": \"IDEMPOTENCY_CONFLICT\",                                  |
|                                                                       |
| \"message\": \"A request with this idempotency key is currently being |
| processed. Wait for it to complete before retrying.\",                |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Cache Hit --- 200/201 from cached response**

When the same key is sent a second time after a successful first
request, the interceptor returns the cached response. The HTTP status
code and body are identical to the original response. The client cannot
distinguish a cache hit from a fresh execution. This is the intended
behaviour.

+-----------------------------------------------------------------------+
| // First request: POST /v1/offers with X-Idempotency-Key: abc-123     |
|                                                                       |
| // Result: 201 Created, offer id = \"offer-uuid-001\"                 |
|                                                                       |
| // Second request: POST /v1/offers with X-Idempotency-Key: abc-123    |
| (same key)                                                            |
|                                                                       |
| // Result: 200 OK, same offer object returned. No new offer created.  |
|                                                                       |
| // {                                                                  |
|                                                                       |
| // \"id\": \"offer-uuid-001\", // Same ID as the original             |
|                                                                       |
| // \"status\": \"PENDING\",                                           |
|                                                                       |
| // \... // Identical to the first response                            |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // Note: HTTP status on cache hit may be 200 instead of 201.          |
|                                                                       |
| // The body is identical. The client should handle both 200 and 201   |
| on POST.                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Reference Frontend & Client Integration Guide**                     |
|                                                                       |
| How to correctly generate and use idempotency keys                    |
+-----------------------------------------------------------------------+

This section is for frontend developers and any other client consuming
the offer-service API. Correct key generation and management is critical
for idempotency to work as intended.

**Generating the Key --- JavaScript / TypeScript**

+-----------------------------------------------------------------------+
| // Browser (modern): use the native crypto API                        |
|                                                                       |
| const idempotencyKey = crypto.randomUUID();                           |
|                                                                       |
| // Result: \'f47ac10b-58cc-4372-a567-0e02b2c3d479\'                   |
|                                                                       |
| // Node.js (v15.6+): same API                                         |
|                                                                       |
| const { randomUUID } = require(\'crypto\');                           |
|                                                                       |
| const idempotencyKey = randomUUID();                                  |
|                                                                       |
| // Using the uuid package (works in all environments):                |
|                                                                       |
| import { v4 as uuidv4 } from \'uuid\';                                |
|                                                                       |
| const idempotencyKey = uuidv4();                                      |
|                                                                       |
| // CORRECT: new key for every distinct operation                      |
|                                                                       |
| async function sendOffer(offerData) {                                 |
|                                                                       |
| const key = crypto.randomUUID(); // Generated HERE, before the        |
| request                                                               |
|                                                                       |
| const response = await fetch(\'/v1/offers\', {                        |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| \'Authorization\': \`Bearer \${accessToken}\`,                        |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| \'X-Idempotency-Key\': key,                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| body: JSON.stringify(offerData),                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| return response.json();                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Retry Pattern --- Same Key on Network Timeout**

+-----------------------------------------------------------------------+
| // CORRECT retry pattern: persist the key before the first attempt    |
|                                                                       |
| // so the same key is reused on retry, not a new one.                 |
|                                                                       |
| async function sendOfferWithRetry(offerData, maxRetries = 3) {        |
|                                                                       |
| // Generate the key ONCE. Persist it. Reuse it on retry.              |
|                                                                       |
| const idempotencyKey = crypto.randomUUID();                           |
|                                                                       |
| for (let attempt = 1; attempt \<= maxRetries; attempt++) {            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const response = await fetch(\'/v1/offers\', {                        |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| \'Authorization\': \`Bearer \${accessToken}\`,                        |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| \'X-Idempotency-Key\': idempotencyKey, // SAME key every attempt      |
|                                                                       |
| },                                                                    |
|                                                                       |
| body: JSON.stringify(offerData),                                      |
|                                                                       |
| signal: AbortSignal.timeout(10000), // 10s timeout                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (response.ok \|\| response.status === 422 \|\| response.status === |
| 409) {                                                                |
|                                                                       |
| // 2xx: success. 422/409: validation or business error --- do not     |
| retry.                                                                |
|                                                                       |
| return response.json();                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 5xx or network error: retry with same key                          |
|                                                                       |
| if (attempt === maxRetries) throw new Error(\'Max retries reached\'); |
|                                                                       |
| } catch (networkError) {                                              |
|                                                                       |
| if (attempt === maxRetries) throw networkError;                       |
|                                                                       |
| await new Promise(r =\> setTimeout(r, attempt \* 1000)); // backoff   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // WRONG: generating a NEW key on retry                               |
|                                                                       |
| async function sendOfferWRONG(offerData) {                            |
|                                                                       |
| for (let i = 0; i \< 3; i++) {                                        |
|                                                                       |
| const key = crypto.randomUUID(); // BAD: new key each time = no       |
| idempotency                                                           |
|                                                                       |
| await fetch(\'/v1/offers\', { headers: { \'X-Idempotency-Key\': key   |
| }, \... });                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**When to Generate a New Key**

  --------------------- -------------------------------------------------
  **New key:            User clicks \"Send Offer\" for the first time.
  intentional new       New operation = new key.
  action**              

  **New key: after      Server returned 409 OFFER_ALREADY_EXISTS. User
  business error**      withdrew the existing offer and wants to send a
                        new one. New intent = new key.

  **New key: after 422  User corrected the form fields. Different payload
  validation error**    = logically different request = new key.

  **SAME key: on        Request timed out at the network layer. Same
  network timeout**     intent, same payload = same key.

  **SAME key: on 5xx    Server returned 500. Same intent = same key. The
  retry**               server did not cache the error.

  **SAME key: app       Mobile app was killed after sending but before
  restart mid-request** receiving response. Persist the key in local
                        storage and use it on restart.

  **DO NOT reuse keys** Never reuse an idempotency key for a different
                        operation. Keys are scoped to a specific action.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Reference Edge Cases & Behaviour**                                  |
|                                                                       |
| Documented corner cases and how they are handled                      |
+-----------------------------------------------------------------------+

**Edge Case 1 --- Service crashes mid-request**

If offer-service crashes or restarts while a request is in-flight, the
PROCESSING sentinel in Redis has a 30-second TTL. After 30 seconds, the
lock expires. The client can then retry with the same key and the
request will be processed as new. The controller must be idempotent in
itself (atomic CAS for state transitions, covered in OS-25) so the
second attempt will either succeed or return the correct 409 if the
first attempt partially succeeded.

**Edge Case 2 --- Redis is unavailable**

If the Redis connection fails, the interceptor will throw an error when
attempting to read/write. This bubbles up as a 500 INTERNAL_ERROR. The
request is not processed. The client can retry. When Redis recovers, the
retry succeeds. Note: if Redis unavailability is prolonged, ALL write
operations are blocked because the interceptor is mandatory. Monitor
Redis with the /ready health endpoint.

**Edge Case 3 --- Key reused across different endpoints**

The Redis key is scoped to userId + idempotency key value. It is NOT
scoped to the specific endpoint path. If a client sends the same UUID to
POST /v1/offers and then to POST /v1/offers/:id/accept, they are
different Redis keys (different paths produce different state, but the
key is still just userId + UUID). However, a client SHOULD generate a
unique key per operation to avoid any theoretical cross-operation
collision.

**Edge Case 4 --- Key expired between request and retry**

The idempotency key TTL is 24 hours. If the client retries after more
than 24 hours, the Redis entry has expired and the retry is processed as
a new request. This is intentional --- 24 hours is sufficient time for
all reasonable retry scenarios. After 24 hours, the original operation
is assumed complete and the client should treat the retry as a new
operation.

**Edge Case 5 --- Concurrent requests with the same key (race
condition)**

If two requests arrive simultaneously with the same key, the first to
execute the Redis SET NX command wins the lock. The second receives 409
IDEMPOTENCY_CONFLICT immediately. The client that receives the 409
should wait briefly and then retry --- by which time the first request
will have completed and stored its response. The retry will then get a
cache hit and receive the stored response.

+-----------------------------------------------------------------------+
| **Step 5 Verification --- Test Idempotency End-to-End**               |
|                                                                       |
| Confirm all behaviour works correctly                                 |
+-----------------------------------------------------------------------+

**Test 1 --- Missing key returns 400**

+-----------------------------------------------------------------------+
| \# POST without X-Idempotency-Key --- must return 400                 |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -d \'{\"rate\":45,\...}\' \| jq .error                                |
|                                                                       |
| \# Expected: \"MISSING_IDEMPOTENCY_KEY\"                              |
+-----------------------------------------------------------------------+

**Test 2 --- Invalid key format returns 400**

+-----------------------------------------------------------------------+
| \# UUID v1 instead of v4                                              |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: not-a-uuid\" \\                               |
|                                                                       |
| -d \'{\"rate\":45,\...}\' \| jq .error                                |
|                                                                       |
| \# Expected: \"INVALID_IDEMPOTENCY_KEY\"                              |
+-----------------------------------------------------------------------+

**Test 3 --- Same key returns same response (cache hit)**

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# Generate a key once                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                             |
| KEY=\$(python3 -c \"import uuid; print(str(uuid.uuid4()))\")                                                                                                                                                                                |
|                                                                                                                                                                                                                                             |
| echo \"Key: \$KEY\"                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                             |
| \# First request --- creates the offer                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                          |
|                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                                              |
|                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: \$KEY\" \\                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                             |
| -d                                                                                                                                                                                                                                          |
| \'{\"talentId\":\"\...\",\"jobListingId\":\"\...\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .id                                                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                             |
| \# Expected: \"offer-uuid-001\" (new offer created)                                                                                                                                                                                         |
|                                                                                                                                                                                                                                             |
| \# Second request --- SAME key, same body                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                          |
|                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                                              |
|                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: \$KEY\" \\                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                             |
| -d                                                                                                                                                                                                                                          |
| \'{\"talentId\":\"\...\",\"jobListingId\":\"\...\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .id                                                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                             |
| \# Expected: \"offer-uuid-001\" (SAME ID --- cache hit, no new offer created)                                                                                                                                                               |
|                                                                                                                                                                                                                                             |
| \# Verify only one offer exists in the database                                                                                                                                                                                             |
|                                                                                                                                                                                                                                             |
| \# SELECT COUNT(\*) FROM offers WHERE client_id = \'\...\' AND created_at \> NOW() - INTERVAL \'1 minute\';                                                                                                                                 |
|                                                                                                                                                                                                                                             |
| \# Expected: 1                                                                                                                                                                                                                              |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Test 4 --- New key creates a new offer**

+------------------------------------------------------------------------------------------------------------+
| \# Different key for intentionally different operation                                                     |
|                                                                                                            |
| KEY2=\$(python3 -c \"import uuid; print(str(uuid.uuid4()))\")                                              |
|                                                                                                            |
| \# Different key = fresh request. But same client-talent pair = 409 OFFER_ALREADY_EXISTS.                  |
|                                                                                                            |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                         |
|                                                                                                            |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                             |
|                                                                                                            |
| -H \"Content-Type: application/json\" \\                                                                   |
|                                                                                                            |
| -H \"X-Idempotency-Key: \$KEY2\" \\                                                                        |
|                                                                                                            |
| -d                                                                                                         |
| \'{\"talentId\":\"\...\",\"jobListingId\":\"\...\",\"contractType\":\"TEAM\",\"contractTitle\":\"Different |
| Title\",\"rate\":60,\...}\' \| jq .error                                                                   |
|                                                                                                            |
| \# Expected: \"OFFER_ALREADY_EXISTS\" (409)                                                                |
|                                                                                                            |
| \# This confirms the idempotency cache is working:                                                         |
|                                                                                                            |
| \# - Key \$KEY --- cached. Returns first offer.                                                            |
|                                                                                                            |
| \# - Key \$KEY2 --- not cached. Reaches service. Service correctly rejects duplicate.                      |
+------------------------------------------------------------------------------------------------------------+

**Test 5 --- Confirm Redis key is stored and expires**

+-------------------------------------------------------------------------------------------+
| \# Connect to Redis and verify the key was stored                                         |
|                                                                                           |
| \# (using redis-cli with the correct host/port from .env)                                 |
|                                                                                           |
| redis-cli -h localhost -p 6379                                                            |
|                                                                                           |
| \# List idempotency keys (keyPrefix is \"offer:\" from config)                            |
|                                                                                           |
| \> KEYS offer:idempotency:\*                                                              |
|                                                                                           |
| \# Expected: one entry per request with the format:                                       |
|                                                                                           |
| \# \"offer:idempotency:{userId}:{idempotencyKey}\"                                        |
|                                                                                           |
| \# Check TTL                                                                              |
|                                                                                           |
| \> TTL \"offer:idempotency:{userId}:{idempotencyKey}\"                                    |
|                                                                                           |
| \# Expected: a number close to 86400 (24 hours in seconds)                                |
|                                                                                           |
| \# Check stored value (should be JSON with statusCode and body)                           |
|                                                                                           |
| \> GET \"offer:idempotency:{userId}:{idempotencyKey}\"                                    |
|                                                                                           |
| \# Expected:                                                                              |
| \'{\"statusCode\":200,\"body\":{\"id\":\"offer-uuid-001\",\"status\":\"PENDING\",\...}}\' |
+-------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If missing key does not return 400 (returns 401 or 403 instead):      |
|                                                                       |
| JwtAuthGuard is running before the interceptor --- this is correct    |
| and expected.                                                         |
|                                                                       |
| The 401 means the JWT failed BEFORE the interceptor could check the   |
| key.                                                                  |
|                                                                       |
| An unauthenticated request will always get 401 first. Provide a valid |
| JWT.                                                                  |
|                                                                       |
| If same key returns a new offer instead of the cached one (cache      |
| miss):                                                                |
|                                                                       |
| Check that REDIS_HOST and REDIS_PORT are correct in .env.             |
|                                                                       |
| Check that RedisModule is in AppModule.imports.                       |
|                                                                       |
| Check that the keyPrefix in RedisModule matches what redis-cli KEYS   |
| returns.                                                              |
|                                                                       |
| Confirm the interceptor is injecting REDIS_CLIENT from the correct    |
| module.                                                               |
|                                                                       |
| If GET /v1/offers/:id requires X-Idempotency-Key:                     |
|                                                                       |
| The interceptor was applied to a GET endpoint by mistake.             |
|                                                                       |
| Remove \@UseInterceptors(IdempotencyInterceptor) from GET methods.    |
|                                                                       |
| The interceptor has an internal guard (method === GET returns         |
| next.handle())                                                        |
|                                                                       |
| but it is cleaner to not apply it at all on read endpoints.           |
+-----------------------------------------------------------------------+
