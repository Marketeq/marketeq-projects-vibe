Marketeq Home Page

Cache Strategy & Invalidation

Redis caching, RabbitMQ event-driven invalidation, edge caching, and
cache key design

April 5, 2026

Backend Only --- No React, HTML, or Frontend Code

1.  Caching Architecture Overview

The homepage implements a multi-layer caching strategy to minimize
assembly pipeline latency and reduce load on the CMS. This document
details cache layers, key design, invalidation patterns, and failure
modes.

-   Two cache layers

    Application cache (Redis/Upstash) --- primary MVP cache

    Potential CDN/edge cache (Cloudflare) --- future enhancement

-   Redis primary role

    Serverless, managed Redis via Upstash

    Sits between API controller and assembly pipeline

    Reduces CMS queries and assembly computation

-   Cache-aside pattern

    Request arrives at API controller

    Check Redis cache first

    On hit: return cached payload immediately

    On miss: execute assembly pipeline, store result, return

-   Cache lifecycle

    Default TTL: 300 seconds (5 minutes)

    Event-driven invalidation: instant deletion on CMS changes

    Automatic expiry: Redis evicts expired keys

2.  Cache Key Design

    2.1 Key Pattern

Cache keys follow a deterministic pattern that encodes the homepage slug
and variant identifier:

  -----------------------------------------------------------------------
  hp:{slug}:{variant}

  -----------------------------------------------------------------------

Examples:

+-----------------------------------------------------------------------+
| hp:home:                                                              |
|                                                                       |
| hp:home:experiment-a                                                  |
|                                                                       |
| hp:home:experiment-b                                                  |
+-----------------------------------------------------------------------+

Key properties:

-   Slug is always \'home\' for the default homepage

-   Variant comes from mktq_hp_variant cookie (optional, defaults to
    empty string)

-   Pattern enables bulk invalidation using wildcard queries

    2.2 Cache Key Builder

Utility functions for consistent key generation across the codebase:

shared/utils/cache-key.util.ts

+-----------------------------------------------------------------------+
| export function buildHomepageCacheKey(slug: string, variant?:         |
| string): string {                                                     |
|                                                                       |
| const variantPart = variant ? variant : \'\';                         |
|                                                                       |
| return \`hp:\${slug}:\${variantPart}\`;                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildHomepageInvalidationPattern(slug: string):       |
| string {                                                              |
|                                                                       |
| return \`hp:\${slug}:\*\`;                                            |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Usage in HomepageService:

+-----------------------------------------------------------------------+
| const cacheKey = buildHomepageCacheKey(\'home\', userVariant);        |
|                                                                       |
| const pattern = buildHomepageInvalidationPattern(\'home\');           |
+-----------------------------------------------------------------------+

2.3 Key Properties

-   Deterministic

    Same inputs (slug, variant) always produce same key

    Critical for consistent cache hits across requests

-   Variant-aware

    Different A/B test groups get separate cache entries

    Enables per-variant caching without conflicts

-   Pattern-friendly

    Wildcard pattern hp:{slug}:\* enables bulk invalidation

    Single CMS change invalidates all variants at once

3.  Redis Configuration

    3.1 Connection Setup

Redis instance provided by Upstash, a managed Redis service optimized
for serverless environments.

+-----------------------------------------------------------------------+
| Provider: Upstash Redis (serverless, managed)                         |
|                                                                       |
| Connection: via REDIS_URL env var                                     |
|                                                                       |
| Protocol: rediss:// (TLS encrypted)                                   |
|                                                                       |
| Region: Auto-selected based on API gateway deployment                 |
+-----------------------------------------------------------------------+

Connection string format:

  -----------------------------------------------------------------------
  rediss://username:password@host:port

  -----------------------------------------------------------------------

3.2 NestJS CacheModule Integration

The CacheModule is registered in HomepageModule to provide cacheManager
dependency:

+-----------------------------------------------------------------------+
| import { CacheModule } from \'@nestjs/cache-manager\';                |
|                                                                       |
| import \* as redisStore from \'cache-manager-redis-store\';           |
|                                                                       |
| import type { RedisClientOptions } from \'redis\';                    |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| CacheModule.registerAsync\<RedisClientOptions\>({                     |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| useFactory: (config: ConfigService) =\> ({                            |
|                                                                       |
| store: redisStore,                                                    |
|                                                                       |
| url: config.get\<string\>(\'REDIS_URL\'),                             |
|                                                                       |
| ttl: config.get\<number\>(\'HOMEPAGE_CACHE_TTL\', 300),               |
|                                                                       |
| }),                                                                   |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[HomepageService, HomepageConsumer\],                     |
|                                                                       |
| exports: \[HomepageService\],                                         |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class HomepageModule {}                                        |
+-----------------------------------------------------------------------+

3.3 TTL Strategy

The default cache TTL (Time To Live) balances freshness with
performance:

+-----------------------------------------------------------------------+
| Default TTL: 300 seconds (5 minutes)                                  |
|                                                                       |
| Configurable via: HOMEPAGE_CACHE_TTL env var                          |
|                                                                       |
| Min recommended: 60 seconds                                           |
|                                                                       |
| Max recommended: 600 seconds (10 minutes)                             |
+-----------------------------------------------------------------------+

Rationale for 5-minute default:

-   Homepage content changes infrequently (typically a few CMS edits per
    week)

-   RabbitMQ event-driven invalidation handles most CMS changes
    instantly

-   5-minute TTL is worst-case staleness if event-driven invalidation
    fails

-   Acceptable UX: users see latest content within 5 minutes of CMS edit

-   Balances cache hit rate (high) with content freshness (acceptable)

4.  Cache Read/Write Flow

    4.1 Cache Read in HomepageService.getHomepage()

The cache read flow checks Redis before executing the assembly pipeline:

+-----------------------------------------------------------------------+
| async getHomepage(slug: string, variant?: string, isPreview?:         |
| boolean): Promise\<AssembledHomepage\> {                              |
|                                                                       |
| // Step 1: Build cache key                                            |
|                                                                       |
| const cacheKey = buildHomepageCacheKey(slug, variant);                |
|                                                                       |
| // Step 2: Skip cache in preview mode                                 |
|                                                                       |
| if (isPreview) {                                                      |
|                                                                       |
| return this.assembleHomepage(slug, variant);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 3: Attempt cache read                                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const cached = await                                                  |
| this.cacheManager.get\<AssembledHomepage\>(cacheKey);                 |
|                                                                       |
| if (cached) {                                                         |
|                                                                       |
| this.logger.log(\`Cache HIT: \${cacheKey}\`);                         |
|                                                                       |
| return cached;                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Redis error --- log and fall through to assembly                   |
|                                                                       |
| this.logger.warn(\`Cache read failed: \${err.message}\`);             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 4: Cache miss --- assemble fresh content                      |
|                                                                       |
| this.logger.log(\`Cache MISS: \${cacheKey}\`);                        |
|                                                                       |
| const assembled = await this.assembleHomepage(slug, variant);         |
|                                                                       |
| // Step 5: Write to cache                                             |
|                                                                       |
| await this.writeCacheEntry(cacheKey, assembled);                      |
|                                                                       |
| return assembled;                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

4.2 Cache Write

After successful assembly, the result is stored in Redis:

+-----------------------------------------------------------------------+
| private async writeCacheEntry(                                        |
|                                                                       |
| key: string,                                                          |
|                                                                       |
| payload: AssembledHomepage                                            |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const ttl = this.config.get\<number\>(\'HOMEPAGE_CACHE_TTL\', 300);   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.cacheManager.set(key, payload, ttl \* 1000); // ttl in ms  |
|                                                                       |
| this.logger.log(\`Cache WRITE: \${key} (ttl: \${ttl}s)\`);            |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\`Cache write failed: \${err.message}\`);           |
|                                                                       |
| // Non-blocking error --- request still succeeds                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

4.3 Preview Mode Bypass

When a CMS admin requests preview (isPreview=true), cache is completely
bypassed:

+-----------------------------------------------------------------------+
| const response = await this.homepageService.getHomepage(              |
|                                                                       |
| \'home\',                                                             |
|                                                                       |
| userVariant,                                                          |
|                                                                       |
| isPreview: true // Bypass cache entirely                              |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

Why preview bypasses cache:

-   CMS admins need to see real-time changes during content editing

-   Cached content would show stale edits, breaking the preview
    experience

-   Preview requests are low-volume (internal only), no performance
    impact

5.  Event-Driven Invalidation

    5.1 RabbitMQ Topology

Message broker topology for cache invalidation:

+-----------------------------------------------------------------------+
| Exchange: cms.events (topic type, durable)                            |
|                                                                       |
| Queue: api-gateway.homepage (durable, exclusive: false)               |
|                                                                       |
| Binding 1: homepage.saved routing key                                 |
|                                                                       |
| Binding 2: homepage.deleted routing key                               |
|                                                                       |
| Consumer: HomepageConsumer in api-gateway                             |
+-----------------------------------------------------------------------+

Topology diagram:

+-----------------------------------------------------------------------+
| \[Payload CMS\]                                                       |
|                                                                       |
| \|                                                                    |
|                                                                       |
| v                                                                     |
|                                                                       |
| cms.events exchange (topic)                                           |
|                                                                       |
| \|                                                                    |
|                                                                       |
| \-\-\-\--+\-\-\-\--                                                   |
|                                                                       |
| \| \|                                                                 |
|                                                                       |
| homepage.saved homepage.deleted                                       |
|                                                                       |
| \| \|                                                                 |
|                                                                       |
| +\-\-\-\--+\-\-\-\--+                                                 |
|                                                                       |
| \|                                                                    |
|                                                                       |
| v                                                                     |
|                                                                       |
| api-gateway.homepage queue                                            |
|                                                                       |
| \|                                                                    |
|                                                                       |
| v                                                                     |
|                                                                       |
| HomepageConsumer                                                      |
+-----------------------------------------------------------------------+

5.2 Event Flow

Step-by-step flow from CMS change to cache invalidation:

+-----------------------------------------------------------------------+
| Step 1: CMS Admin Action                                              |
|                                                                       |
| \- Admin saves/deletes homepage in Payload admin panel                |
|                                                                       |
| Step 2: Payload Hook Fires                                            |
|                                                                       |
| \- afterChange hook: publishes message to exchange                    |
|                                                                       |
| \- afterDelete hook: publishes message to exchange                    |
|                                                                       |
| Step 3: Message Routing                                               |
|                                                                       |
| \- cms.events exchange routes message to api-gateway.homepage queue   |
|                                                                       |
| \- Routing key: \'homepage.saved\' or \'homepage.deleted\'            |
|                                                                       |
| Step 4: Consumer Receives                                             |
|                                                                       |
| \- HomepageConsumer listening on api-gateway.homepage queue           |
|                                                                       |
| \- Message handler triggered                                          |
|                                                                       |
| Step 5: Cache Invalidation                                            |
|                                                                       |
| \- Consumer calls homepageService.invalidateCache(slug)               |
|                                                                       |
| Step 6: Next Request                                                  |
|                                                                       |
| \- User refreshes page or new request arrives                         |
|                                                                       |
| \- Cache miss detected (key deleted)                                  |
|                                                                       |
| \- Fresh assembly executed                                            |
|                                                                       |
| \- New cache entry written                                            |
|                                                                       |
| Typical latency: \<1 second end-to-end                                |
+-----------------------------------------------------------------------+

5.3 HomepageConsumer Implementation

Production consumer code at
apps/api-gateway/src/homepage/homepage.consumer.ts:

+-----------------------------------------------------------------------+
| import { Injectable, OnModuleInit, OnModuleDestroy } from             |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import \* as amqplib from \'amqplib\';                                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { Logger } from \'@nestjs/common\';                            |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class HomepageConsumer implements OnModuleInit,                |
| OnModuleDestroy {                                                     |
|                                                                       |
| private connection: amqplib.Connection;                               |
|                                                                       |
| private channel: amqplib.Channel;                                     |
|                                                                       |
| private readonly logger = new Logger(HomepageConsumer.name);          |
|                                                                       |
| private readonly QUEUE_NAME = \'api-gateway.homepage\';               |
|                                                                       |
| private readonly EXCHANGE_NAME = \'cms.events\';                      |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private config: ConfigService,                                        |
|                                                                       |
| private homepageService: HomepageService,                             |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async onModuleInit() {                                                |
|                                                                       |
| await this.connect();                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async connect(retries = 0): Promise\<void\> {                 |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const url = this.config.get\<string\>(\'RABBITMQ_URL\');              |
|                                                                       |
| this.connection = await amqplib.connect(url);                         |
|                                                                       |
| this.channel = await this.connection.createChannel();                 |
|                                                                       |
| // Declare exchange and queue                                         |
|                                                                       |
| await this.channel.assertExchange(this.EXCHANGE_NAME, \'topic\', {    |
| durable: true });                                                     |
|                                                                       |
| await this.channel.assertQueue(this.QUEUE_NAME, { durable: true });   |
|                                                                       |
| // Bind routing keys                                                  |
|                                                                       |
| await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME,     |
| \'homepage.saved\');                                                  |
|                                                                       |
| await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME,     |
| \'homepage.deleted\');                                                |
|                                                                       |
| // Start consuming                                                    |
|                                                                       |
| this.channel.consume(this.QUEUE_NAME, (msg) =\>                       |
| this.handleMessage(msg), { noAck: false });                           |
|                                                                       |
| this.logger.log(\'HomepageConsumer connected to RabbitMQ\');          |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| const delay = Math.min(1000 \* Math.pow(2, retries), 30000); //       |
| Exponential backoff                                                   |
|                                                                       |
| this.logger.error(\`Failed to connect: \${err.message}. Retrying in   |
| \${delay}ms\`);                                                       |
|                                                                       |
| setTimeout(() =\> this.connect(retries + 1), delay);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async handleMessage(msg: amqplib.ConsumeMessage \| null) {    |
|                                                                       |
| if (!msg) return;                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const content = JSON.parse(msg.content.toString());                   |
|                                                                       |
| const { slug } = content;                                             |
|                                                                       |
| this.logger.log(\`Processing invalidation for slug: \${slug}\`);      |
|                                                                       |
| await this.homepageService.invalidateCache(slug);                     |
|                                                                       |
| // Acknowledge message                                                |
|                                                                       |
| this.channel.ack(msg);                                                |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\`Message handler failed: \${err.message}\`);       |
|                                                                       |
| // Negative acknowledge without requeue (poison message)              |
|                                                                       |
| this.channel.nack(msg, false, false);                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| async onModuleDestroy() {                                             |
|                                                                       |
| await this.channel?.close();                                          |
|                                                                       |
| await this.connection?.close();                                       |
|                                                                       |
| this.logger.log(\'HomepageConsumer gracefully shut down\');           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

5.4 Cache Invalidation Method

The invalidateCache method in HomepageService deletes all cache entries
for a given slug:

+-----------------------------------------------------------------------+
| async invalidateCache(slug: string): Promise\<void\> {                |
|                                                                       |
| const pattern = buildHomepageInvalidationPattern(slug);               |
|                                                                       |
| const ttl = this.config.get\<number\>(\'HOMEPAGE_CACHE_TTL\', 300);   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Attempt pattern-based deletion (Redis SCAN + DEL)                  |
|                                                                       |
| const pattern = \`hp:\${slug}:\*\`;                                   |
|                                                                       |
| let cursor = \'0\';                                                   |
|                                                                       |
| let keysDeleted = 0;                                                  |
|                                                                       |
| do {                                                                  |
|                                                                       |
| const result = await this.redisClient.scan(                           |
|                                                                       |
| cursor,                                                               |
|                                                                       |
| \'MATCH\', pattern,                                                   |
|                                                                       |
| \'COUNT\', 100                                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| cursor = result\[0\];                                                 |
|                                                                       |
| const keys = result\[1\];                                             |
|                                                                       |
| if (keys.length \> 0) {                                               |
|                                                                       |
| await this.redisClient.del(\...keys);                                 |
|                                                                       |
| keysDeleted += keys.length;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| } while (cursor !== \'0\');                                           |
|                                                                       |
| this.logger.log(\`Invalidated \${keysDeleted} cache entries for slug: |
| \${slug}\`);                                                          |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Fallback: delete specific known key                                |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const primaryKey = buildHomepageCacheKey(slug);                       |
|                                                                       |
| await this.cacheManager.del(primaryKey);                              |
|                                                                       |
| this.logger.warn(\`Pattern deletion failed, deleted primary key       |
| fallback\`);                                                          |
|                                                                       |
| } catch (fallbackErr) {                                               |
|                                                                       |
| this.logger.error(\`Invalidation failed: \${err.message}\`);          |
|                                                                       |
| // Non-blocking error --- CMS change succeeded, cache will TTL        |
| eventually                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

6.  Invalidation Scenarios

This table outlines common triggers, cache actions, and expected
latencies:

  ----------------- ------------------ ----------------- -----------------
  Trigger Event     Routing Key        Cache Action      Latency

  CMS admin saves   homepage.saved     Delete all        \<1 second
  homepage                             hp:{slug}:\* keys 

  CMS admin deletes homepage.deleted   Delete all        \<1 second
  homepage                             hp:{slug}:\* keys 

  CMS admin updates (separate event)   No direct         N/A
  banner                               invalidation      

  Listing data      (no event)         Stale until TTL   Up to 5 min
  changes                              expires           

  Category changes  (no event)         Stale until TTL   Up to 5 min
                                       expires           

  Cache TTL expires N/A                Automatic Redis   Exactly at TTL
                                       eviction          
  ----------------- ------------------ ----------------- -----------------

7.  Failure Modes

    7.1 Redis Down

Impact: Cache layer unavailable. Requests fall back to assembly
pipeline.

+-----------------------------------------------------------------------+
| Behavior: cacheManager.get() throws, caught by try/catch, assembly    |
| proceeds                                                              |
|                                                                       |
| Performance: 200-400ms per request (instead of \<50ms cached)         |
|                                                                       |
| Recovery: Automatic when Redis comes online                           |
|                                                                       |
| User impact: Slower page loads, eventual consistency maintained       |
+-----------------------------------------------------------------------+

7.2 RabbitMQ Down

Impact: Cache invalidation messages cannot be delivered. Content becomes
stale.

+-----------------------------------------------------------------------+
| Behavior: Payload hooks log error and continue (CMS operations        |
| succeed)                                                              |
|                                                                       |
| Staleness: Content stale until TTL expires (max 5 minutes)            |
|                                                                       |
| Recovery: Consumer reconnects automatically with exponential backoff  |
|                                                                       |
| User impact: Users may see outdated content for up to 5 minutes       |
+-----------------------------------------------------------------------+

7.3 CMS Down

Impact: Cannot fetch fresh content for assembly. Cached content serves
users.

+-----------------------------------------------------------------------+
| Behavior: homepageService.assembleHomepage() fails, exception caught  |
|                                                                       |
| Cache behavior: Existing cached content continues to serve            |
|                                                                       |
| Empty cache: If cache is empty and CMS is down, return 503 Service    |
| Unavailable                                                           |
|                                                                       |
| Recovery: Automatic when CMS comes online                             |
+-----------------------------------------------------------------------+

Recommended error handling in controller:

+-----------------------------------------------------------------------+
| \@Get(\'/\')                                                          |
|                                                                       |
| async getHomepage(@Query(\'slug\') slug = \'home\'): Promise\<any\> { |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await this.homepageService.getHomepage(slug);                  |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\`Homepage assembly failed: \${err.message}\`);     |
|                                                                       |
| throw new ServiceUnavailableException(\'Homepage service temporarily  |
| unavailable\');                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

8.  Edge Caching (Future Enhancement)

Beyond the MVP, edge caching at CDN layer can further reduce latency and
improve global performance.

8.1 Cloudflare Edge Cache

-   CDN layer

    Cloudflare caches the /api/homepage response at edge locations
    globally

    Cache TTL: Match Redis TTL (300s) for consistency

-   Surrogate keys

    Tag cache entries with surrogate keys: \'homepage\',
    \'homepage:home\'

    Cloudflare Purge API allows targeted purging by tag

-   Invalidation

    RabbitMQ consumer also triggers Cloudflare purge API

    Purge by surrogate key: DELETE cache entries at all edge locations
    instantly

-   Stale-while-revalidate

    Serve stale cache while revalidating in background

    Users always get fast responses, eventual consistency maintained

    8.2 Implementation Outline

+-----------------------------------------------------------------------+
| // In HomepageConsumer, after invalidating Redis:                     |
|                                                                       |
| await this.cloudflarePurgeService.purgeByTag(\'homepage\',            |
| \'homepage:home\');                                                   |
|                                                                       |
| // Cloudflare purge API call:                                         |
|                                                                       |
| POST https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"tags\": \[\"homepage\", \"homepage:home\"\]                         |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

9.  Cache Monitoring

Monitor cache behavior to detect issues and optimize performance:

9.1 Key Metrics

-   Redis key count

    Monitor: COUNT hp:\* keys

    Alert: Unexpected spike or sudden drop

-   Cache hit ratio

    Log: Cache hits vs misses in HomepageService

    Target: \>80% hit ratio under normal load

    Below 80%: Investigate TTL settings or invalidation logic

-   TTL distribution

    Monitor: Ensure keys are evicting properly at TTL

    Alert: Keys persisting beyond TTL indicates Redis issue

-   Memory usage

    Monitor: Redis memory consumption for homepage keys

    Alert: Memory exceeds threshold or grows unexpectedly

    9.2 Recommended Alerts

+-----------------------------------------------------------------------+
| Cache hit ratio drops below 80%                                       |
|                                                                       |
| → Investigate increased cache misses                                  |
|                                                                       |
| Redis memory exceeds 80% of allocated capacity                        |
|                                                                       |
| → Cache may be evicting keys prematurely                              |
|                                                                       |
| RabbitMQ consumer connection fails                                    |
|                                                                       |
| → Invalidation events not being processed                             |
|                                                                       |
| Homepage assembly latency exceeds 500ms                               |
|                                                                       |
| → Possible performance degradation in CMS or assembly pipeline        |
+-----------------------------------------------------------------------+

9.3 Observability Implementation

Example metrics collection in HomepageService:

+-----------------------------------------------------------------------+
| async getHomepage(slug: string, variant?: string):                    |
| Promise\<AssembledHomepage\> {                                        |
|                                                                       |
| const cacheKey = buildHomepageCacheKey(slug, variant);                |
|                                                                       |
| const startTime = Date.now();                                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const cached = await                                                  |
| this.cacheManager.get\<AssembledHomepage\>(cacheKey);                 |
|                                                                       |
| if (cached) {                                                         |
|                                                                       |
| // Increment hit counter                                              |
|                                                                       |
| this.metricsService.increment(\'homepage.cache.hits\');               |
|                                                                       |
| this.logger.debug(\`Cache HIT in \${Date.now() - startTime}ms\`);     |
|                                                                       |
| return cached;                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.metricsService.increment(\'homepage.cache.errors\');             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Cache miss --- assemble                                            |
|                                                                       |
| this.metricsService.increment(\'homepage.cache.misses\');             |
|                                                                       |
| const assembled = await this.assembleHomepage(slug, variant);         |
|                                                                       |
| const assemblyTime = Date.now() - startTime;                          |
|                                                                       |
| this.metricsService.histogram(\'homepage.assembly.time\',             |
| assemblyTime);                                                        |
|                                                                       |
| await this.writeCacheEntry(cacheKey, assembled);                      |
|                                                                       |
| return assembled;                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

10. Configuration Reference

Environment variables and configuration options for cache setup:

  ----------------------------------- -----------------------------------
  Env Variable                        Details

  REDIS_URL                           Required. Upstash Redis connection
                                      string (rediss://\...)

  HOMEPAGE_CACHE_TTL                  Optional. Cache TTL in seconds.
                                      Default: 300 (5 min)

  RABBITMQ_URL                        Required. CloudAMQP or local
                                      RabbitMQ connection string

  LOG_LEVEL                           Optional. Logging level (debug,
                                      info, warn, error). Default: info
  ----------------------------------- -----------------------------------

10.1 .env.local Example

+-----------------------------------------------------------------------+
| \# Redis (Upstash)                                                    |
|                                                                       |
| REDIS_URL=rediss://username:password@host.upstash.io:38395            |
|                                                                       |
| \# RabbitMQ (CloudAMQP)                                               |
|                                                                       |
| RABBITMQ_URL=amqp://user:pass@host.cloudamqp.com/vhost                |
|                                                                       |
| \# Cache TTL (5 minutes)                                              |
|                                                                       |
| HOMEPAGE_CACHE_TTL=300                                                |
|                                                                       |
| \# Logging                                                            |
|                                                                       |
| LOG_LEVEL=debug                                                       |
+-----------------------------------------------------------------------+

10.2 Docker Compose (Local Development)

+-----------------------------------------------------------------------+
| version: \'3.8\'                                                      |
|                                                                       |
| services:                                                             |
|                                                                       |
| redis:                                                                |
|                                                                       |
| image: redis:7-alpine                                                 |
|                                                                       |
| ports:                                                                |
|                                                                       |
| \- \"6379:6379\"                                                      |
|                                                                       |
| rabbitmq:                                                             |
|                                                                       |
| image: rabbitmq:3.12-management                                       |
|                                                                       |
| ports:                                                                |
|                                                                       |
| \- \"5672:5672\"                                                      |
|                                                                       |
| \- \"15672:15672\"                                                    |
|                                                                       |
| environment:                                                          |
|                                                                       |
| RABBITMQ_DEFAULT_USER: guest                                          |
|                                                                       |
| RABBITMQ_DEFAULT_PASS: guest                                          |
+-----------------------------------------------------------------------+

Note: For production, use managed services (Upstash Redis, CloudAMQP).

End of Document
