**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-07 --- Redis Caching Strategy**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-07 --- Redis Caching Strategy

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Cache store**     Redis via ioredis (REDIS_URL env var)

  **Cache scope**     Balance cache only --- FX rate cache is defined in
                      ES-06

  **Fallback**        DB read-through when Redis is unavailable ---
                      service never hard-fails on cache miss

  **Prerequisites**   ES-00 through ES-06

  **Next Document**   ES-08 --- Health, Metrics & Observability
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines the complete Redis caching strategy for the balance data in   |
| earnings-service.                                                     |
|                                                                       |
| This document covers exactly one cache key namespace:                 |
| balance:{userId}                                                      |
|                                                                       |
| Every aspect of the cache lifecycle is specified:                     |
|                                                                       |
| • Key schema, value format, and TTL settings                          |
|                                                                       |
| • Write path: when and how the cache is populated                     |
|                                                                       |
| • Read path: cache-aside pattern, cold-start behaviour                |
|                                                                       |
| • Invalidation triggers: which events invalidate which keys           |
|                                                                       |
| • Redis unavailability: transparent DB fallback with no service       |
| disruption                                                            |
|                                                                       |
| • CacheService implementation injected into BalanceService            |
|                                                                       |
| The FX rate cache (fx:{from}:{to} keys) is defined in ES-06 and is    |
| not repeated here.                                                    |
|                                                                       |
| The consumer idempotency keys (processed:\*) and threshold guard keys |
| (threshold_fired:\*)                                                  |
|                                                                       |
| used in ES-04 and ES-05 are documented in those documents and not     |
| repeated here.                                                        |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                       **Reference**
  ------------------------------------- ---------------------------------
  **ES-01 --- balance_snapshots table   DB fallback reads from this table
  exists**                              

  **ES-02 ---                           CacheService is injected here;
  BalanceService.getBalance() exists**  replaces stub comments

  **ES-04 --- All consumers call        Consumers already invalidate the
  redis.del() after balance mutations** key --- this doc formalises the
                                        contract

  **Redis running at REDIS_URL**        Required --- service degrades
                                        gracefully if unavailable
  -----------------------------------------------------------------------

# **2. Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ cache/                                                             |
|                                                                       |
| │ ├─ cache.module.ts ← ES-07 NEW                                      |
|                                                                       |
| │ └─ cache.service.ts ← ES-07 NEW                                     |
|                                                                       |
| ├─ balance/                                                           |
|                                                                       |
| │ └─ balance.service.ts ES-02 --- updated §8 to inject CacheService   |
|                                                                       |
| └─ app.module.ts updated §9 --- adds CacheModule                      |
+=======================================================================+

# **3. Environment Variables**

  -----------------------------------------------------------------------------------------------------
  **Variable**                    **Required**   **Default**          **Description**
  ------------------------------- -------------- -------------------- ---------------------------------
  **REDIS_URL**                   Yes            redis://redis:6379   ioredis connection string. TLS:
                                                                      rediss://. Sentinel:
                                                                      redis-sentinel://

  **BALANCE_CACHE_TTL_SECONDS**   No             300                  TTL for balance:{userId} keys.
                                                                      Default 5 minutes. The TTL is a
                                                                      safety net only --- event-driven
                                                                      invalidation keeps the cache
                                                                      fresh in real time.

  **REDIS_CONNECT_TIMEOUT_MS**    No             2000                 How long to wait for a Redis
                                                                      connection before treating Redis
                                                                      as unavailable and falling
                                                                      through to DB.

  **REDIS_COMMAND_TIMEOUT_MS**    No             500                  Per-command timeout. If a GET or
                                                                      SET takes longer than this, the
                                                                      command is aborted and the DB
                                                                      fallback fires.
  -----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **TTL is a safety net, not the primary freshness mechanism**          |
|                                                                       |
| The balance cache is invalidated by events in real time (ES-04        |
| consumers call DEL after                                              |
|                                                                       |
| every mutation). The 5-minute TTL exists only as a safety net in case |
| a DEL is missed                                                       |
|                                                                       |
| (e.g. consumer crashes after the DB write but before the DEL).        |
|                                                                       |
| Lowering the TTL increases DB load. Raising it increases the window   |
| for a stale cache                                                     |
|                                                                       |
| when a DEL is missed. 300 seconds is the recommended balance.         |
+=======================================================================+

# **4. Cache Key Schema**

## **4.1 Complete key catalogue --- earnings-service scope**

  -------------------------------------------------------------------------------------------------------------------
  **Key pattern**                           **Namespace**   **Value type**      **TTL**                     **Owner
                                                                                                            doc**
  ----------------------------------------- --------------- ------------------- --------------------------- ---------
  **balance:{userId}**                      Balance cache   JSON string ---     BALANCE_CACHE_TTL_SECONDS   ES-07
                                                            BalanceCacheEntry   (300s)                      (this
                                                                                                            doc)

  **fx:{from}:{to}**                        FX rate cache   Numeric string e.g. FX_CACHE_TTL_SECONDS        ES-06
                                                            \"83.42000000\"     (3600s)                     

  **processed:{routingKey}:{eventId}**      Consumer dedup  \"1\"               86400s (24h)                ES-04

  **threshold_fired:{userId}:{year}**       YTD threshold   \"1\"               400 days                    ES-05
                                            guard                                                           

  **rate_limit:internal:{endpoint}:{ip}**   Internal rate   Sorted set          60s                         ES-03
                                            limiter         (timestamps)                                    
  -------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Key naming conventions**                                            |
|                                                                       |
| All keys: lowercase, colon-delimited namespaces.                      |
|                                                                       |
| UUIDs in keys: lowercase with hyphens as issued by PostgreSQL         |
| gen_random_uuid().                                                    |
|                                                                       |
| No spaces or special characters other than colons and hyphens.        |
|                                                                       |
| Example: balance:550e8400-e29b-41d4-a716-446655440000                 |
+=======================================================================+

## **4.2 balance:{userId} --- value format**

The cache value is a JSON-serialised BalanceCacheEntry. The entire
object is stored as a single string --- no Redis hash is used. This
avoids partial-read consistency issues.

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // BalanceCacheEntry --- the object stored as JSON in Redis           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"availableBalance\": \"567.00\", // USD --- raw from                 |
| balance_snapshots                                                     |
|                                                                       |
| \"pendingHoldUsd\": \"0.00\",                                         |
|                                                                       |
| \"totalEarnedUsd\": \"4820.50\",                                      |
|                                                                       |
| \"totalPaidOutUsd\": \"4253.50\",                                     |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"localCurrency\": \"INR\",                                           |
|                                                                       |
| \"updatedAt\": \"2025-06-10T14:32:00Z\", //                           |
| balance_snapshots.updated_at                                          |
|                                                                       |
| \"cachedAt\": \"2025-06-10T14:32:01Z\", // when this entry was        |
| written to Redis                                                      |
|                                                                       |
| \"cacheVersion\": 1 // bump when schema changes                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ---------------------------------------------------------------------------------------------
  **Field**              **Source**                             **Notes**
  ---------------------- -------------------------------------- -------------------------------
  **availableBalance**   balance_snapshots.available_balance    USD string. Currency conversion
                                                                applied at read time (ES-06),
                                                                not stored here.

  **pendingHoldUsd**     balance_snapshots.pending_hold_usd     

  **totalEarnedUsd**     balance_snapshots.total_earned_usd     Used for IRS threshold
                                                                monitoring (ES-05).

  **totalPaidOutUsd**    balance_snapshots.total_paid_out_usd   

  **displayCurrency**    balance_snapshots.display_currency     Persisted from user-service.
                                                                Updated via
                                                                payout.schedule.updated
                                                                consumer.

  **localCurrency**      balance_snapshots.local_currency       Re-detected on every login ---
                                                                may differ from cached value if
                                                                contractor travels.

  **updatedAt**          balance_snapshots.updated_at           When the DB row last changed.
                                                                Used by payout-service to
                                                                detect stale data (ES-03).

  **cachedAt**           Set at write time                      When the Redis entry was
                                                                written. Used for the cachedAt
                                                                field in balance API responses.

  **cacheVersion**       Hard-coded integer                     Increment when
                                                                BalanceCacheEntry shape
                                                                changes. Old-version entries
                                                                are treated as cache misses.
  ---------------------------------------------------------------------------------------------

# **5. Read Path --- Cache-Aside Pattern**

BalanceService.getBalance() follows a strict cache-aside read pattern.
The cache is never a write-through cache --- it is populated lazily on
the first read after an invalidation.

+-----------------------------------------------------------------------+
| **Read path --- step by step**                                        |
|                                                                       |
| 1\. Attempt to read from Redis: GET balance:{userId}                  |
|                                                                       |
| Redis unavailable (timeout / connection error) → skip to step 3. Log  |
| WARN.                                                                 |
|                                                                       |
| Redis available, key missing (cold start or post-invalidation) → skip |
| to step 3.                                                            |
|                                                                       |
| Redis available, key found → JSON.parse, check cacheVersion.          |
|                                                                       |
| cacheVersion mismatch → treat as miss, skip to step 3.                |
|                                                                       |
| cacheVersion OK → return cached entry. Done.                          |
|                                                                       |
| 2\. (Cache hit) Apply currency conversion (ES-06) and return          |
| BalanceResponseDto.                                                   |
|                                                                       |
| Set dto.cachedAt from entry.cachedAt.                                 |
|                                                                       |
| 3\. (Cache miss / Redis down) Read from balance_snapshots DB.         |
|                                                                       |
| Row not found → throw NotFoundException (new contractor, \$0          |
| balance).                                                             |
|                                                                       |
| Row found → build BalanceCacheEntry.                                  |
|                                                                       |
| 4\. Write BalanceCacheEntry to Redis: SETEX balance:{userId} TTL      |
| {json}                                                                |
|                                                                       |
| Redis unavailable → skip write silently. Next read will retry.        |
|                                                                       |
| 5\. Apply currency conversion (ES-06) and return BalanceResponseDto.  |
+=======================================================================+

## **5.1 Cold-start behaviour**

Cold start occurs when: (a) the service first boots, (b) Redis is
flushed, or (c) a key has expired via TTL after a missed invalidation.
In all three cases the read path falls through to the DB transparently.
There is no warm-up required and no special cold-start logic.

+-----------------------------------------------------------------------+
| **Cold start is safe by design**                                      |
|                                                                       |
| The cache-aside pattern means a cold cache never causes incorrect     |
| data --- it only causes                                               |
|                                                                       |
| a single DB read. The first request after a cold start populates the  |
| cache.                                                                |
|                                                                       |
| Under high load after a Redis flush, the DB will receive one read per |
| contractor.                                                           |
|                                                                       |
| This is acceptable --- balance_snapshots is indexed on contractor_id. |
+=======================================================================+

# **6. Write Path --- Cache Population**

The cache is written in two places. Both use the same JSON serialisation
and the same TTL.

  -----------------------------------------------------------------------------
  **Write trigger**        **Location**                  **When it fires**
  ------------------------ ----------------------------- ----------------------
  **Cache miss (lazy       BalanceService.getBalance()   On every GET
  population)**            --- step 4 of read path       /v1/earnings/balance
                                                         request that results
                                                         in a DB read

  **Post-invalidation warm Not implemented --- by design Cache is populated
  (optional)**                                           lazily on the next
                                                         read. No pre-warming.
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Why no pre-warming?**                                               |
|                                                                       |
| Pre-warming after invalidation would require earnings-service to      |
| immediately re-read the DB                                            |
|                                                                       |
| and re-populate the cache after every consumer event. This adds       |
| latency to the consumer                                               |
|                                                                       |
| hot path and provides marginal benefit --- the next contractor        |
| balance request will populate                                         |
|                                                                       |
| the cache anyway. Lazy population is simpler and equally correct.     |
+=======================================================================+

# **7. Invalidation Triggers**

The balance cache for a contractor is invalidated (DEL balance:{userId})
after every event that mutates their balance. This is already
implemented in ES-04 consumers --- this section is the authoritative
specification of that contract.

  --------------------------------------------------------------------------------------------------------
  **Event (routing key)**       **Consumer (ES-04)**          **Mutation**         **Invalidation timing**
  ----------------------------- ----------------------------- -------------------- -----------------------
  **transaction.created**       TransactionCreatedConsumer    availableBalance +   After DB transaction
                                                              totalEarnedUsd       commits, before
                                                              increase             publishBalanceUpdated
                                                                                   (ES-05)

  **transaction.reversed**      TransactionReversedConsumer   availableBalance     After DB update commits
                                                              decreases            

  **payout.completed**          PayoutCompletedConsumer       availableBalance     After DB update commits
                                                              decreases,           
                                                              totalPaidOutUsd      
                                                              increases            

  **payout.failed**             PayoutFailedConsumer          availableBalance     After DB update commits
                                                              restored             

  **payout.schedule.updated**   (future consumer --- ES-04    displayCurrency,     After DB update commits
                                extension)                    localCurrency,       
                                                              reserveBalance may   
                                                              change               
  --------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Invalidation ordering rule**                                        |
|                                                                       |
| DEL must always be called AFTER the DB write commits and BEFORE the   |
| event is published                                                    |
|                                                                       |
| (publishBalanceUpdated in ES-05). This ordering guarantees:           |
|                                                                       |
| \(a\) If a consumer reads the balance after receiving the published   |
| event, the cache is                                                   |
|                                                                       |
| already gone and a fresh DB read will return the updated value.       |
|                                                                       |
| \(b\) A cache DEL that fires before the DB write commits would cause  |
| the next read to                                                      |
|                                                                       |
| return stale data from the DB --- this must never happen.             |
+=======================================================================+

## **7.1 DEL call site in each consumer**

Each ES-04 consumer already has a redis.del() call. This section
confirms the exact call pattern. If a consumer is added in future, it
must follow this same pattern.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Pattern used in every balance-mutating consumer (ES-04):           |
|                                                                       |
| // STEP ORDER --- must be in this exact sequence:                     |
|                                                                       |
| // 1. await this.dataSource.transaction(\...) → DB write commits      |
|                                                                       |
| // 2. await this.redis.del(\`balance:\${contractorId}\`) → cache      |
| invalidated                                                           |
|                                                                       |
| // 3. await this.publisher.publishBalanceUpdated(\...) → event        |
| published (ES-05)                                                     |
|                                                                       |
| // Example from TransactionCreatedConsumer.process():                 |
|                                                                       |
| private async process(d: any): Promise\<void\> {                      |
|                                                                       |
| // Step 1: DB write (atomic transaction)                              |
|                                                                       |
| await this.ds.transaction(async em =\> {                              |
|                                                                       |
| await em.createQueryBuilder().insert().into(EarningsCache)\...        |
|                                                                       |
| await em.query(\`UPDATE balance_snapshots \...\`);                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Step 2: Invalidate cache --- MUST come after DB commit             |
|                                                                       |
| await this.redis.del(\`balance:\${d.contractorId}\`);                 |
|                                                                       |
| // Step 3: Publish event --- MUST come after cache invalidation       |
|                                                                       |
| await this.publisher.publishBalanceUpdated({ \... });                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Redis unavailability during DEL:                                   |
|                                                                       |
| // If Redis is down, this.redis.del() throws. The consumer catches it |
| in the retry                                                          |
|                                                                       |
| // loop and retries the entire process() call (including the DB       |
| write).                                                               |
|                                                                       |
| // The DB write is idempotent (ON CONFLICT DO NOTHING / UNIQUE        |
| constraints),                                                         |
|                                                                       |
| // so re-running it is safe. The DEL will succeed on retry when Redis |
| recovers.                                                             |
+=======================================================================+

# **8. Redis Unavailability --- Fallback Behaviour**

Redis is treated as an optional acceleration layer, never a hard
dependency. If Redis is unreachable for any reason, earnings-service
reads and writes directly from the DB with no service degradation
visible to the contractor.

  ---------------------------------------------------------------------------------------
  **Operation**      **Redis available** **Redis             **Service impact**
                                         unavailable**       
  ------------------ ------------------- ------------------- ----------------------------
  **GET balance ---  Return from Redis   N/A                 ---
  cache hit**        (\~1ms)                                 

  **GET balance ---  Read DB, write to   Read DB only, skip  One extra DB read per
  cache miss**       Redis               write (log WARN)    request until Redis
                                                             recovers. Latency: +5--15ms.

  **DEL after        Delete key (\~1ms)  Log WARN, continue  Cache may be stale until TTL
  mutation**                             (no throw)          expires or Redis recovers.
                                                             Max stale window =
                                                             BALANCE_CACHE_TTL_SECONDS.

  **SETEX after      Write to Redis      Skip silently (log  Next request also hits DB.
  cache miss**                           WARN)               Self-heals when Redis
                                                             recovers.
  ---------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Never let Redis errors propagate to HTTP responses**                |
|                                                                       |
| All Redis operations in CacheService are wrapped in try-catch.        |
|                                                                       |
| A Redis error must never cause a 500 response to the contractor.      |
|                                                                       |
| The correct behaviour is: log WARN, fall through to DB, return        |
| correct data.                                                         |
|                                                                       |
| A Redis error that causes a 500 is a bug.                             |
+=======================================================================+

## **8.1 ioredis connection options**

CacheService configures ioredis with explicit timeouts and a lazyConnect
strategy so connection failures on startup do not crash the service.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // ioredis connection options used in CacheService                    |
|                                                                       |
| const redisOptions: Redis.RedisOptions = {                            |
|                                                                       |
| // Connection timeouts                                                |
|                                                                       |
| connectTimeout: parseInt(config.get(\"REDIS_CONNECT_TIMEOUT_MS\",     |
| \"2000\"), 10),                                                       |
|                                                                       |
| commandTimeout: parseInt(config.get(\"REDIS_COMMAND_TIMEOUT_MS\",     |
| \"500\"), 10),                                                        |
|                                                                       |
| // lazyConnect: do not throw on startup if Redis is unreachable.      |
|                                                                       |
| // Service boots successfully; first command attempt will try to      |
| connect.                                                              |
|                                                                       |
| lazyConnect: true,                                                    |
|                                                                       |
| // Retry strategy: exponential backoff, max 10 retries, max 30s       |
| between retries.                                                      |
|                                                                       |
| // Returns null after max retries to stop retrying (prevents          |
| unbounded retry loops).                                               |
|                                                                       |
| retryStrategy(times: number) {                                        |
|                                                                       |
| if (times \> 10) return null; // null = stop retrying, mark           |
| connection as failed                                                  |
|                                                                       |
| return Math.min(times \* 200, 30_000);                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Do not throw on Redis connection error --- emit an error event     |
| instead.                                                              |
|                                                                       |
| // CacheService listens to the error event and logs WARN.             |
|                                                                       |
| enableOfflineQueue: false, // reject commands immediately when        |
| disconnected                                                          |
|                                                                       |
| // rather than queuing them (avoids memory buildup)                   |
|                                                                       |
| };                                                                    |
+=======================================================================+

# **9. CacheService --- Full Implementation**

### **src/cache/cache.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/cache/cache.module.ts                                          |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { CacheService } from \'./cache.service\';                     |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| providers:\[CacheService\],                                           |
|                                                                       |
| exports: \[CacheService\],                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class CacheModule {}                                           |
+=======================================================================+

### **src/cache/cache.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/cache/cache.service.ts                                         |
|                                                                       |
| import { Injectable, Logger, OnModuleDestroy } from                   |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| // Version the cache entry schema.                                    |
|                                                                       |
| // Increment CACHE_VERSION whenever BalanceCacheEntry fields change.  |
|                                                                       |
| // Old-version entries are treated as cache misses and transparently  |
| refreshed.                                                            |
|                                                                       |
| const CACHE_VERSION = 1;                                              |
|                                                                       |
| export interface BalanceCacheEntry {                                  |
|                                                                       |
| availableBalance: string;                                             |
|                                                                       |
| pendingHoldUsd: string;                                               |
|                                                                       |
| totalEarnedUsd: string;                                               |
|                                                                       |
| totalPaidOutUsd: string;                                              |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| localCurrency: string;                                                |
|                                                                       |
| updatedAt: string; // ISO 8601 --- balance_snapshots.updated_at       |
|                                                                       |
| cachedAt: string; // ISO 8601 --- when this entry was written         |
|                                                                       |
| cacheVersion: number;                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class CacheService implements OnModuleDestroy {                |
|                                                                       |
| private readonly logger = new Logger(CacheService.name);              |
|                                                                       |
| private readonly redis: Redis;                                        |
|                                                                       |
| private readonly ttl: number;                                         |
|                                                                       |
| private available = true; // tracks whether Redis is currently        |
| reachable                                                             |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| this.ttl = parseInt(this.config.get(\'BALANCE_CACHE_TTL_SECONDS\',    |
| \'300\'), 10);                                                        |
|                                                                       |
| this.redis = new Redis({                                              |
|                                                                       |
| \...this.parseRedisUrl(this.config.get\<string\>(\'REDIS_URL\')),     |
|                                                                       |
| connectTimeout:                                                       |
| parseInt(this.config.get(\'REDIS_CONNECT_TIMEOUT_MS\',\'2000\'), 10), |
|                                                                       |
| commandTimeout:                                                       |
| parseInt(this.config.get(\'REDIS_COMMAND_TIMEOUT_MS\', \'500\'), 10), |
|                                                                       |
| lazyConnect: true,                                                    |
|                                                                       |
| enableOfflineQueue:false,                                             |
|                                                                       |
| retryStrategy(times) {                                                |
|                                                                       |
| if (times \> 10) return null;                                         |
|                                                                       |
| return Math.min(times \* 200, 30_000);                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.redis.on(\'error\', (err) =\> {                                  |
|                                                                       |
| this.available = false;                                               |
|                                                                       |
| this.logger.warn(\`Redis error --- falling back to DB:                |
| \${err.message}\`);                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.redis.on(\'ready\', () =\> {                                     |
|                                                                       |
| this.available = true;                                                |
|                                                                       |
| this.logger.log(\'Redis reconnected --- cache resuming\');            |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| async onModuleDestroy() {                                             |
|                                                                       |
| try { await this.redis.quit(); } catch { /\* ignore \*/ }             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── BALANCE CACHE ─────────────────────────────────────────────     |
|                                                                       |
| // Read a cached balance entry. Returns null on miss, version         |
| mismatch, or Redis error.                                             |
|                                                                       |
| async getBalance(userId: string): Promise\<BalanceCacheEntry \|       |
| null\> {                                                              |
|                                                                       |
| if (!this.available) return null;                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const raw = await this.redis.get(\`balance:\${userId}\`);             |
|                                                                       |
| if (!raw) return null;                                                |
|                                                                       |
| const entry: BalanceCacheEntry = JSON.parse(raw);                     |
|                                                                       |
| // Version check --- stale schema treated as miss.                    |
|                                                                       |
| if (entry.cacheVersion !== CACHE_VERSION) {                           |
|                                                                       |
| this.logger.debug(\`Cache version mismatch for \${userId} ---         |
| treating as miss\`);                                                  |
|                                                                       |
| return null;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| return entry;                                                         |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Cache GET error for balance:\${userId}:            |
| \${err.message}\`);                                                   |
|                                                                       |
| return null; // fall through to DB                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Write a balance entry to cache. Silently skips on Redis error.     |
|                                                                       |
| async setBalance(userId: string, entry: Omit\<BalanceCacheEntry,      |
| \'cachedAt\' \| \'cacheVersion\'\>): Promise\<void\> {                |
|                                                                       |
| if (!this.available) return;                                          |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const payload: BalanceCacheEntry = {                                  |
|                                                                       |
| \...entry,                                                            |
|                                                                       |
| cachedAt: new Date().toISOString(),                                   |
|                                                                       |
| cacheVersion: CACHE_VERSION,                                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| await this.redis.setex(\`balance:\${userId}\`, this.ttl,              |
| JSON.stringify(payload));                                             |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Cache SET error for balance:\${userId}:            |
| \${err.message}\`);                                                   |
|                                                                       |
| // Do not rethrow --- cache write failure must never surface as a     |
| 500.                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Invalidate a balance entry. Called by ES-04 consumers after DB     |
| mutation.                                                             |
|                                                                       |
| // Silently skips on Redis error --- the TTL will expire the key      |
| eventually.                                                           |
|                                                                       |
| async invalidateBalance(userId: string): Promise\<void\> {            |
|                                                                       |
| if (!this.available) return;                                          |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.redis.del(\`balance:\${userId}\`);                         |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Cache DEL error for balance:\${userId}:            |
| \${err.message}\`);                                                   |
|                                                                       |
| // Do not rethrow --- invalidation failure must never disrupt the     |
| consumer.                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Invalidate balance keys for multiple contractors in one pipeline.  |
|                                                                       |
| // Used when a bulk operation affects many contractors                |
| simultaneously.                                                       |
|                                                                       |
| async invalidateBalanceBatch(userIds: string\[\]): Promise\<void\> {  |
|                                                                       |
| if (!this.available \|\| userIds.length === 0) return;                |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const keys = userIds.map(id =\> \`balance:\${id}\`);                  |
|                                                                       |
| await this.redis.del(\...keys);                                       |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Cache batch DEL error: \${err.message}\`);         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── HELPERS ───────────────────────────────────────────────────     |
|                                                                       |
| // Parse REDIS_URL into ioredis connection options.                   |
|                                                                       |
| // Handles: redis://, rediss:// (TLS), unix socket.                   |
|                                                                       |
| private parseRedisUrl(url: string): Partial\<Redis.RedisOptions\> {   |
|                                                                       |
| if (!url) return { host: \'localhost\', port: 6379 };                 |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const u = new URL(url);                                               |
|                                                                       |
| const opts: Partial\<Redis.RedisOptions\> = {                         |
|                                                                       |
| host: u.hostname \|\| \'localhost\',                                  |
|                                                                       |
| port: parseInt(u.port \|\| \'6379\', 10),                             |
|                                                                       |
| password: u.password \|\| undefined,                                  |
|                                                                       |
| db: u.pathname ? parseInt(u.pathname.slice(1), 10) \|\| 0 : 0,        |
|                                                                       |
| };                                                                    |
|                                                                       |
| if (u.protocol === \'rediss:\') {                                     |
|                                                                       |
| (opts as any).tls = {};                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| return opts;                                                          |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return { host: \'localhost\', port: 6379 };                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. BalanceService Integration**

This section shows the complete updated BalanceService.getBalance()
method with CacheService fully wired in. This replaces the stub comments
from ES-02 §6.4.

### **src/balance/balance.module.ts --- add CacheModule**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.module.ts --- updated                          |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { BalanceController } from \'./balance.controller\';           |
|                                                                       |
| import { BalanceService } from \'./balance.service\';                 |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| import { CacheModule } from \'../cache/cache.module\'; // ← added     |
|                                                                       |
| import { CurrencyModule } from \'../currency/currency.module\'; //    |
| ES-06                                                                 |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[TypeOrmModule.forFeature(\[BalanceSnapshot\]),             |
| CacheModule, CurrencyModule\],                                        |
|                                                                       |
| controllers: \[BalanceController\],                                   |
|                                                                       |
| providers: \[BalanceService\],                                        |
|                                                                       |
| exports: \[BalanceService\],                                          |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class BalanceModule {}                                         |
+=======================================================================+

### **src/balance/balance.service.ts --- complete updated implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.service.ts --- complete final version (ES-02 + |
| ES-06 + ES-07)                                                        |
|                                                                       |
| import { Injectable, NotFoundException } from \'@nestjs/common\';     |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| import { BalanceResponseDto } from \'./dto/balance-response.dto\';    |
|                                                                       |
| import { CacheService, BalanceCacheEntry } from                       |
| \'../cache/cache.service\';                                           |
|                                                                       |
| import { CurrencyService } from \'../currency/currency.service\';     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class BalanceService {                                         |
|                                                                       |
| private readonly DISPLAY_LABEL = \'After reserve & threshold          |
| deductions\';                                                         |
|                                                                       |
| private readonly DISPLAY_LABEL_STALE = \'After reserve & threshold    |
| deductions (rate may be delayed)\';                                   |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(BalanceSnapshot)                                   |
|                                                                       |
| private readonly repo: Repository\<BalanceSnapshot\>,                 |
|                                                                       |
| private readonly cache: CacheService,                                 |
|                                                                       |
| private readonly currency: CurrencyService,                           |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async getBalance(                                                     |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| localCurrency: string,                                                |
|                                                                       |
| displayCurrency: string,                                              |
|                                                                       |
| ): Promise\<BalanceResponseDto\> {                                    |
|                                                                       |
| // ── Step 1: Try cache ──────────────────────────────────────        |
|                                                                       |
| const cached = await this.cache.getBalance(contractorId);             |
|                                                                       |
| if (cached) {                                                         |
|                                                                       |
| return this.buildDto(cached, localCurrency, displayCurrency);         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── Step 2: Cache miss --- read DB ───────────────────────────      |
|                                                                       |
| const snap = await this.repo.findOne({ where: { contractorId } });    |
|                                                                       |
| if (!snap) throw new NotFoundException(\'No balance record found for  |
| this contractor\');                                                   |
|                                                                       |
| // ── Step 3: Populate cache ─────────────────────────────────        |
|                                                                       |
| const entry: Omit\<BalanceCacheEntry, \'cachedAt\' \|                 |
| \'cacheVersion\'\> = {                                                |
|                                                                       |
| availableBalance: snap.availableBalance,                              |
|                                                                       |
| pendingHoldUsd: snap.pendingHoldUsd,                                  |
|                                                                       |
| totalEarnedUsd: snap.totalEarnedUsd,                                  |
|                                                                       |
| totalPaidOutUsd: snap.totalPaidOutUsd,                                |
|                                                                       |
| displayCurrency: snap.displayCurrency,                                |
|                                                                       |
| localCurrency: snap.localCurrency,                                    |
|                                                                       |
| updatedAt: snap.updatedAt.toISOString(),                              |
|                                                                       |
| };                                                                    |
|                                                                       |
| await this.cache.setBalance(contractorId, entry);                     |
|                                                                       |
| // ── Step 4: Build and return response ─────────────────────         |
|                                                                       |
| return this.buildDto(entry as BalanceCacheEntry, localCurrency,       |
| displayCurrency);                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async buildDto(                                               |
|                                                                       |
| entry: BalanceCacheEntry \|                                           |
| Omit\<BalanceCacheEntry,\'cachedAt\'\|\'cacheVersion\'\>,             |
|                                                                       |
| localCurrency: string,                                                |
|                                                                       |
| displayCurrency: string,                                              |
|                                                                       |
| ): Promise\<BalanceResponseDto\> {                                    |
|                                                                       |
| const display = await                                                 |
| this.currency.convertFromUsd(entry.availableBalance,                  |
| displayCurrency);                                                     |
|                                                                       |
| const local = await                                                   |
| this.currency.convertFromUsd(entry.availableBalance, localCurrency);  |
|                                                                       |
| const dto = new BalanceResponseDto();                                 |
|                                                                       |
| dto.availableBalance = entry.availableBalance;                        |
|                                                                       |
| dto.availableBalanceDisplay = display.amount;                         |
|                                                                       |
| dto.displayCurrency = display.currency;                               |
|                                                                       |
| dto.availableBalanceLocal = local.amount;                             |
|                                                                       |
| dto.localCurrency = local.currency;                                   |
|                                                                       |
| dto.reserveBalance = \'0.00\';                                        |
|                                                                       |
| dto.pendingHoldUsd = entry.pendingHoldUsd;                            |
|                                                                       |
| dto.totalEarnedUsd = entry.totalEarnedUsd;                            |
|                                                                       |
| dto.totalPaidOutUsd = entry.totalPaidOutUsd;                          |
|                                                                       |
| dto.displayLabel = display.stale ? this.DISPLAY_LABEL_STALE :         |
| this.DISPLAY_LABEL;                                                   |
|                                                                       |
| dto.lastUpdatedAt = entry.updatedAt;                                  |
|                                                                       |
| dto.cachedAt = (entry as BalanceCacheEntry).cachedAt ?? new           |
| Date().toISOString();                                                 |
|                                                                       |
| return dto;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Used by ES-03 InternalController --- returns raw DB row, bypasses  |
| cache.                                                                |
|                                                                       |
| async getBalanceRaw(contractorId: string): Promise\<BalanceSnapshot   |
| \| null\> {                                                           |
|                                                                       |
| return this.repo.findOne({ where: { contractorId } });                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **10.1 Update consumers to use CacheService.invalidateBalance()**

The four ES-04 consumers currently call this.redis.del() directly on
their own Redis client. Update them to inject CacheService and call
invalidateBalance() instead. This centralises the key schema in one
place.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Change in all four balance-mutating consumers (ES-04):             |
|                                                                       |
| // BEFORE (direct redis.del in each consumer):                        |
|                                                                       |
| await this.redis.del(\`balance:\${contractorId}\`);                   |
|                                                                       |
| // AFTER (inject CacheService, call invalidateBalance):               |
|                                                                       |
| await this.cacheService.invalidateBalance(contractorId);              |
|                                                                       |
| // Consumer constructor addition (shown for                           |
| TransactionCreatedConsumer):                                          |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| config: ConfigService,                                                |
|                                                                       |
| \@InjectRepository(EarningsCache) private readonly ecRepo:            |
| Repository\<EarningsCache\>,                                          |
|                                                                       |
| \@InjectRepository(BalanceSnapshot) private readonly bsRepo:          |
| Repository\<BalanceSnapshot\>,                                        |
|                                                                       |
| private readonly ds: DataSource,                                      |
|                                                                       |
| private readonly publisher: EarningsPublisher,                        |
|                                                                       |
| private readonly cacheService: CacheService, // ← add this            |
|                                                                       |
| ) { super(config, \'TransactionCreatedConsumer\'); }                  |
|                                                                       |
| // Add CacheModule to ConsumersModule imports:                        |
|                                                                       |
| // imports: \[ConfigModule, PublishersModule, CacheModule,            |
| TypeOrmModule.forFeature(\[\...\])\],                                 |
+=======================================================================+

# **11. app.module.ts --- Final State**

This is the complete app.module.ts after all documents ES-01 through
ES-07.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts --- final state after ES-07                      |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { DatabaseModule } from \'./database/database.module\';        |
|                                                                       |
| import { BalanceModule } from \'./balance/balance.module\';           |
|                                                                       |
| import { EarningsModule } from \'./earnings/earnings.module\';        |
|                                                                       |
| import { InternalModule } from \'./internal/internal.module\';        |
|                                                                       |
| import { ConsumersModule } from \'./consumers/consumers.module\';     |
|                                                                       |
| import { PublishersModule } from \'./publishers/publishers.module\';  |
|                                                                       |
| import { CurrencyModule } from \'./currency/currency.module\';        |
|                                                                       |
| import { GeoModule } from \'./geo/geo.module\';                       |
|                                                                       |
| import { CacheModule } from \'./cache/cache.module\';                 |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule,                                                       |
|                                                                       |
| CacheModule, // must be before BalanceModule and ConsumersModule      |
|                                                                       |
| CurrencyModule, // must be before BalanceModule and EarningsModule    |
|                                                                       |
| GeoModule,                                                            |
|                                                                       |
| BalanceModule,                                                        |
|                                                                       |
| EarningsModule,                                                       |
|                                                                       |
| InternalModule,                                                       |
|                                                                       |
| ConsumersModule,                                                      |
|                                                                       |
| PublishersModule,                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **12. Verification**

## **Cache hit --- confirm Redis is used**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. First request --- cold cache, DB read, cache populated:         |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/balance \| jq .cachedAt             |
|                                                                       |
| \# Returns a timestamp from \~now                                     |
|                                                                       |
| \# 2. Confirm key exists in Redis:                                    |
|                                                                       |
| redis-cli GET \'balance:CONTRACTOR_UUID\' \| python3 -m json.tool     |
|                                                                       |
| \# Returns BalanceCacheEntry JSON with cacheVersion: 1                |
|                                                                       |
| redis-cli TTL \'balance:CONTRACTOR_UUID\'                             |
|                                                                       |
| \# Returns a value \<= 300 (BALANCE_CACHE_TTL_SECONDS)                |
|                                                                       |
| \# 3. Second request --- cache hit:                                   |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/balance \| jq .cachedAt             |
|                                                                       |
| \# Returns same timestamp as first request (served from cache, not    |
| re-queried)                                                           |
+=======================================================================+

## **Invalidation --- balance updates after a transaction event**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. Check current cachedAt:                                         |
|                                                                       |
| T1=\$(curl -s -H \'Authorization: Bearer TOKEN\'                      |
| http://localhost:3010/v1/earnings/balance \| jq -r .cachedAt)         |
|                                                                       |
| \# 2. Publish a transaction.created event (see ES-04 §11 for          |
| payload):                                                             |
|                                                                       |
| rabbitmqadmin publish exchange=marketeq.events                        |
| routing_key=transaction.created payload=\'{\...}\'                    |
|                                                                       |
| \# 3. Wait for consumer to process (\~100ms), then check balance      |
| again:                                                                |
|                                                                       |
| sleep 1                                                               |
|                                                                       |
| T2=\$(curl -s -H \'Authorization: Bearer TOKEN\'                      |
| http://localhost:3010/v1/earnings/balance \| jq -r .cachedAt)         |
|                                                                       |
| \# T2 should be AFTER T1 --- cache was invalidated and repopulated:   |
|                                                                       |
| echo \$T1 \$T2                                                        |
|                                                                       |
| \# Confirm availableBalance increased by netAmountUsd from the event. |
+=======================================================================+

## **Redis unavailability --- transparent DB fallback**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. Stop Redis:                                                     |
|                                                                       |
| docker compose stop redis                                             |
|                                                                       |
| \# 2. Request balance --- must still return 200:                      |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/balance \| jq .                     |
|                                                                       |
| \# Expected: 200 with correct balance data (read from DB)             |
|                                                                       |
| \# Expected in logs: \'Redis error --- falling back to DB\'           |
|                                                                       |
| \# Must NOT see: 500 error, ECONNREFUSED in response body             |
|                                                                       |
| \# 3. Restart Redis:                                                  |
|                                                                       |
| docker compose start redis                                            |
|                                                                       |
| \# 4. Next request --- cache miss (Redis was down during              |
| invalidations),                                                       |
|                                                                       |
| \# DB read, then cache repopulated:                                   |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/balance \| jq .cachedAt             |
|                                                                       |
| \# Expected: fresh timestamp --- cache rebuilt from DB                |
+=======================================================================+

## **Cache version --- schema migration**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Simulate a schema migration (increment CACHE_VERSION in            |
| cache.service.ts):                                                    |
|                                                                       |
| \# 1. Set CACHE_VERSION = 2 in cache.service.ts                       |
|                                                                       |
| \# 2. Restart service                                                 |
|                                                                       |
| \# 3. Redis still has old entries with cacheVersion: 1                |
|                                                                       |
| \# First request after restart:                                       |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/balance \| jq .cachedAt             |
|                                                                       |
| \# Expected: fresh timestamp (old entry treated as miss, DB read, new |
| entry written)                                                        |
|                                                                       |
| \# Check Redis --- entry should now have cacheVersion: 2:             |
|                                                                       |
| redis-cli GET \'balance:CONTRACTOR_UUID\' \| python3 -m json.tool \|  |
| grep cacheVersion                                                     |
|                                                                       |
| \# Expected: \'cacheVersion\': 2                                      |
+=======================================================================+

# **13. Complete Cache Key Reference**

Single-page reference for all Redis keys owned or used by
earnings-service. Print and keep with the service runbook.

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Key**                                   **TTL**                       **Invalidated by**                 **Written by**                                          **Purpose**
  ----------------------------------------- ----------------------------- ---------------------------------- ------------------------------------------------------- ----------------------------
  **balance:{userId}**                      300s                          ES-04 consumers via                BalanceService.getBalance() on cache miss               Contractor available balance
                                            (BALANCE_CACHE_TTL_SECONDS)   CacheService.invalidateBalance()                                                           --- avoids DB on every
                                                                                                                                                                     balance poll

  **fx:{from}:{to}**                        3600s (FX_CACHE_TTL_SECONDS)  TTL expiry only --- never manually CurrencyService.cacheRate() after live FX fetch         Forward FX rate for display
                                                                          deleted                                                                                    conversion

  **fx:{to}:{from}**                        3600s                         TTL expiry only                    CurrencyService.cacheRate() --- inverse computed at     Inverse FX rate --- cached
                                                                                                             same time                                               to avoid a second API call

  **processed:{routingKey}:{eventId}**      86400s (24h)                  TTL expiry only                    BaseConsumer.isDuplicate() on first delivery            Consumer idempotency ---
                                                                                                                                                                     prevents duplicate event
                                                                                                                                                                     processing

  **threshold_fired:{userId}:{year}**       34560000s (400 days)          TTL expiry only                    TransactionCreatedConsumer.checkAndPublishThreshold()   Prevents
                                                                                                                                                                     earnings.threshold.reached
                                                                                                                                                                     firing more than once per
                                                                                                                                                                     year

  **rate_limit:internal:{endpoint}:{ip}**   60s                           TTL expiry + pipeline cleanup      InternalRateLimitMiddleware                             Internal endpoint rate
                                                                                                                                                                     limiting sliding window
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-07 \| v1.0
