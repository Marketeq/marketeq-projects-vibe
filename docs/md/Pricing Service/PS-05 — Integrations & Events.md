PS-05

**Integrations & Events**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document defines every external integration used by
pricing-service: the fawazahmed0/exchange-api FX rate source, the
Frankfurter.app fallback, the Redis cache strategy for both rate data
and FX rates, the transaction-service daily data pull for platform rate
averages, and the business rules governing budget display and rounding.

API endpoints are in PS-04. Entity definitions are in PS-03. This
document covers only integration logic, cache behaviour, scheduled jobs,
and display rules.

# **2. FX Rate Integration --- fawazahmed0/exchange-api**

pricing-service fetches live exchange rates from a self-hosted instance
of the fawazahmed0/exchange-api open-source container. This is the same
container instance already running in the Marketeq infrastructure and
used by earnings-service and payout-service. pricing-service does not
run a separate instance.

## **2.1 Shared Instance**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  Container             fawazahmed0/currency-api

  Config variable       FX_API_URL

  Shared with           earnings-service, payout-service. All three
                        services use the same FX_API_URL value.

  Base currency         USD

  Primary endpoint      GET {FX_API_URL}/latest?from=USD

  Pair endpoint         GET {FX_API_URL}/latest?from={FROM}&to={TO}

  Response format       JSON with a rates object keyed by ISO 4217
                        currency code. Values are floats relative to the
                        from currency.
  -----------------------------------------------------------------------

## **2.2 FX Rate Fetch Implementation**

> // apps/pricing-service/src/currency/services/fx-cache.service.ts
>
> // Handles FX rate fetching, caching, and fallback.
>
> import { Injectable, Logger } from \'@nestjs/common\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> import { HttpService } from \'@nestjs/axios\';
>
> import { Cron, CronExpression } from \'@nestjs/schedule\';
>
> import { InjectRedis } from \'@nestjs-modules/ioredis\';
>
> import { firstValueFrom } from \'rxjs\';
>
> import Redis from \'ioredis\';
>
> \@Injectable()
>
> export class FxCacheService {
>
> private readonly logger = new Logger(FxCacheService.name);
>
> constructor(
>
> private readonly config: ConfigService,
>
> private readonly http: HttpService,
>
> \@InjectRedis() private readonly redis: Redis,
>
> ) {}
>
> // Runs every hour to keep FX rates fresh in Redis.
>
> \@Cron(CronExpression.EVERY_HOUR)
>
> async refreshFxRates(): Promise\<void\> {
>
> this.logger.log(\"Starting hourly FX rate refresh\");
>
> try {
>
> const rates = await this.fetchFromPrimary();
>
> await this.writeRatesToRedis(rates);
>
> this.logger.log(\`FX rates refreshed: \${Object.keys(rates).length}
> currency pairs cached\`);
>
> } catch (primaryErr) {
>
> this.logger.warn(\`Primary FX API failed: \${primaryErr.message}.
> Trying fallback.\`);
>
> try {
>
> const rates = await this.fetchFromFallback();
>
> await this.writeRatesToRedis(rates);
>
> this.logger.log(\`FX rates refreshed via fallback:
> \${Object.keys(rates).length} pairs\`);
>
> } catch (fallbackErr) {
>
> this.logger.error(\`Both FX sources failed. Rates remain stale.
> \${fallbackErr.message}\`);
>
> }
>
> }
>
> }
>
> private async fetchFromPrimary(): Promise\<Record\<string, number\>\>
> {
>
> const fxUrl = this.config.get\<string\>(\"FX_API_URL\");
>
> const res = await firstValueFrom(
>
> this.http.get(\`\${fxUrl}/latest?from=USD\`, { timeout: 10_000 })
>
> );
>
> return res.data.rates as Record\<string, number\>;
>
> }
>
> private async fetchFromFallback(): Promise\<Record\<string, number\>\>
> {
>
> const fallbackUrl =
> this.config.get\<string\>(\"FX_API_FALLBACK_URL\");
>
> const res = await firstValueFrom(
>
> this.http.get(\`\${fallbackUrl}/latest?from=USD\`, { timeout: 10_000
> })
>
> );
>
> return res.data.rates as Record\<string, number\>;
>
> }
>
> private async writeRatesToRedis(rates: Record\<string, number\>):
> Promise\<void\> {
>
> const ttl = this.config.get\<number\>(\"FX_CACHE_TTL_SECONDS\") ??
> 3600;
>
> const pipeline = this.redis.pipeline();
>
> for (const \[currency, rate\] of Object.entries(rates)) {
>
> pipeline.setex(\`ps:fx:USD:\${currency}\`, ttl, rate.toString());
>
> // Keep stale copy with no TTL for last-resort fallback.
>
> pipeline.set(\`ps:fx:USD:\${currency}:stale\`, rate.toString());
>
> }
>
> // Cache the full rates object for GET /v1/currency/rates.
>
> const payload = JSON.stringify({
>
> rates,
>
> base: \"USD\",
>
> fetched_at: new Date().toISOString(),
>
> });
>
> pipeline.setex(\"ps:fx:all\", ttl, payload);
>
> await pipeline.exec();
>
> }
>
> }

# **3. Frankfurter.app Fallback**

When the primary fawazahmed0/exchange-api instance is unreachable,
pricing-service falls back to Frankfurter.app
(https://api.frankfurter.app). Frankfurter.app is a free, public FX rate
API with no API key required. It uses the European Central Bank as its
data source and updates rates on ECB publication days (typically
weekdays).

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  Config variable       FX_API_FALLBACK_URL

  Default value         https://api.frankfurter.app

  Authentication        None required. Public API.

  Rate update frequency ECB publication days (typically Monday to
                        Friday). Rates may be 1-3 days old on weekends.

  Endpoint used         GET {FX_API_FALLBACK_URL}/latest?from=USD

  Response              Same rates object format as
  compatibility         fawazahmed0/exchange-api. No code change required
                        to switch between them.
  -----------------------------------------------------------------------

## **3.1 Fallback Strategy**

The fallback is invoked automatically when the primary FX API request
fails for any reason: network timeout, connection refused, or non-200
response. The fallback is tried once. If it also fails, pricing-service
serves the last cached rate from Redis with is_stale: true. If no cached
rate exists at all, a 503 PS_DEPENDENCY_ERROR is returned.

> // Fallback decision tree:
>
> // 1. Check Redis cache (ps:fx:USD:{CURRENCY})
>
> // Hit → return immediately (is_stale: false)
>
> // Miss → proceed to step 2
>
> // 2. Fetch from primary (FX_API_URL)
>
> // Success → write to Redis, return (is_stale: false)
>
> // Failure → proceed to step 3
>
> // 3. Fetch from fallback (FX_API_FALLBACK_URL)
>
> // Success → write to Redis, return (is_stale: false)
>
> // Failure → proceed to step 4
>
> // 4. Check stale Redis key (ps:fx:USD:{CURRENCY}:stale)
>
> // Hit → return stale value (is_stale: true)
>
> // Miss → throw 503 PS_DEPENDENCY_ERROR

# **4. Redis Cache Strategy**

pricing-service uses Redis for two independent caches: the platform rate
average cache and the FX rate cache. Both use the ps: namespace prefix
to avoid collisions with other services in the shared Redis instance.

## **4.1 Cache Key Schema**

  ---------------------------------------------------------------------------------------
  **Key Pattern**                          **TTL**      **Contents**
  ---------------------------------------- ------------ ---------------------------------
  ps:rates:{role}:{region}:{exp}:{sched}   86400s (24h) Serialised RatesResponse JSON for
                                                        the specific
                                                        role/region/experience/schedule
                                                        combination.

  ps:fx:USD:{CURRENCY}                     3600s (1h)   Float string. The exchange rate
                                                        from USD to CURRENCY. Example:
                                                        ps:fx:USD:EUR = \"0.9215\"

  ps:fx:USD:{CURRENCY}:stale               No TTL       Float string. Last known rate.
                                                        Written alongside the TTL key.
                                                        Never expires. Used as
                                                        last-resort fallback when both FX
                                                        APIs are down.

  ps:fx:all                                3600s (1h)   Full serialised rates object with
                                                        base currency and fetched_at
                                                        timestamp. Powers GET
                                                        /v1/currency/rates.
  ---------------------------------------------------------------------------------------

## **4.2 Rate Cache Key Construction**

> // Cache key for platform rate averages
>
> // All components are lowercased and spaces replaced with underscores.
>
> // When a query parameter is omitted the component uses \"all\".
>
> // role=UX Designer, location=United States, experience=mid,
> schedule=full_time:
>
> // ps:rates:ux_designer:united_states:mid:full_time
>
> // role=Backend Developer, no location, no experience, no schedule:
>
> // ps:rates:backend_developer:all:all:all
>
> // This means a query without filters returns a broader cached average
>
> // and a query with all four filters returns the most specific cached
> rate.
>
> // Each combination is cached independently.

## **4.3 Cache Invalidation**

Cache invalidation is triggered in two scenarios:

- Daily rate refresh job --- after successfully writing new
  PlatformRateAverage records to PostgreSQL, the job deletes all
  ps:rates:\* keys from Redis. Cached rates are rebuilt lazily on the
  next request for each combination.

- Hourly FX refresh job --- overwrites the ps:fx:\* keys with fresh
  values using setex. No explicit deletion is needed because the TTL
  handles expiry.

> // apps/pricing-service/src/rates/services/rates-refresh.service.ts
>
> // Cache invalidation after daily rate refresh
>
> async invalidateRatesCache(): Promise\<void\> {
>
> const keys = await this.redis.keys(\"ps:rates:\*\");
>
> if (keys.length \> 0) {
>
> await this.redis.del(\...keys);
>
> this.logger.log(\`Rate cache invalidated: \${keys.length} keys
> deleted\`);
>
> }
>
> }

# **5. transaction-service Integration --- Daily Rate Refresh**

Platform average hourly rates are derived from historical payout data in
transaction-service. A daily NestJS scheduled job in pricing-service
queries transaction-service for aggregated payout amounts grouped by
role, region, experience level, and work schedule. It then computes
percentile distributions and upserts the results into the
ps_platform_rate_averages table.

## **5.1 Scheduled Job**

> // apps/pricing-service/src/rates/services/rates-refresh.service.ts
>
> import { Injectable, Logger } from \'@nestjs/common\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> import { HttpService } from \'@nestjs/axios\';
>
> import { Cron } from \'@nestjs/schedule\';
>
> import { InjectRepository } from \'@nestjs/typeorm\';
>
> import { Repository } from \'typeorm\';
>
> import { InjectRedis } from \'@nestjs-modules/ioredis\';
>
> import { firstValueFrom } from \'rxjs\';
>
> import Redis from \'ioredis\';
>
> import { PlatformRateAverage } from
> \'../entities/platform-rate-average.entity\';
>
> \@Injectable()
>
> export class RatesRefreshService {
>
> private readonly logger = new Logger(RatesRefreshService.name);
>
> constructor(
>
> private readonly config: ConfigService,
>
> private readonly http: HttpService,
>
> \@InjectRepository(PlatformRateAverage)
>
> private readonly rateRepo: Repository\<PlatformRateAverage\>,
>
> \@InjectRedis() private readonly redis: Redis,
>
> ) {}
>
> // Runs daily at 02:00 UTC when platform traffic is lowest.
>
> \@Cron(\"0 2 \* \* \*\")
>
> async refreshPlatformRates(): Promise\<void\> {
>
> this.logger.log(\"Starting daily platform rate refresh\");
>
> const windowDays =
> this.config.get\<number\>(\"RATE_DATA_WINDOW_DAYS\") ?? 90;
>
> const sinceDate = new Date();
>
> sinceDate.setDate(sinceDate.getDate() - windowDays);
>
> try {
>
> const txUrl = this.config.get\<string\>(\"TRANSACTION_SERVICE_URL\");
>
> const res = await firstValueFrom(
>
> this.http.get(\`\${txUrl}/v1/transactions/rate-averages\`, {
>
> params: { sinceDate: sinceDate.toISOString().split(\"T\")\[0\] },
>
> timeout: 30_000,
>
> })
>
> );
>
> const aggregates = res.data.averages as RateAggregate\[\];
>
> let upsertCount = 0;
>
> for (const agg of aggregates) {
>
> await this.rateRepo.upsert(
>
> {
>
> roleTitle: agg.roleTitle,
>
> region: agg.region,
>
> experienceLevel: agg.experienceLevel,
>
> workSchedule: agg.workSchedule,
>
> hourlyLowUsdCents: agg.p25RateUsdCents,
>
> hourlyMedianUsdCents: agg.p50RateUsdCents,
>
> hourlyHighUsdCents: agg.p75RateUsdCents,
>
> sampleSize: agg.sampleSize,
>
> updatedAt: new Date(),
>
> },
>
> \[\"roleTitle\", \"region\", \"experienceLevel\", \"workSchedule\"\],
>
> );
>
> upsertCount++;
>
> }
>
> await this.invalidateRatesCache();
>
> this.logger.log(\`Platform rates refreshed: \${upsertCount} records
> upserted\`);
>
> } catch (err) {
>
> this.logger.error(\`Daily rate refresh failed: \${err.message}\`,
> err.stack);
>
> // Existing rates remain valid. Stale indicator applies after
> RATE_STALE_THRESHOLD_HOURS.
>
> }
>
> }
>
> async invalidateRatesCache(): Promise\<void\> {
>
> const keys = await this.redis.keys(\"ps:rates:\*\");
>
> if (keys.length \> 0) {
>
> await this.redis.del(\...keys);
>
> this.logger.log(\`Rate cache invalidated: \${keys.length} keys
> deleted\`);
>
> }
>
> }
>
> }

## **5.2 transaction-service Endpoint Called**

> // GET
> {TRANSACTION_SERVICE_URL}/v1/transactions/rate-averages?sinceDate=YYYY-MM-DD
>
> // Expected response from transaction-service:
>
> {
>
> \"averages\": \[
>
> {
>
> \"roleTitle\": \"UX Designer\",
>
> \"region\": \"United States\",
>
> \"experienceLevel\": \"mid\",
>
> \"workSchedule\": \"full_time\",
>
> \"p25RateUsdCents\": 7500,
>
> \"p50RateUsdCents\": 10000,
>
> \"p75RateUsdCents\": 13500,
>
> \"sampleSize\": 142
>
> }
>
> \]
>
> }
>
> // p25 = 25th percentile (low rate)
>
> // p50 = 50th percentile (median rate)
>
> // p75 = 75th percentile (high rate)
>
> // sampleSize = number of completed transactions in the window
>
> *Important: The rate refresh job uses upsert --- not insert. If a
> role/region/experience/schedule combination already exists in
> ps_platform_rate_averages, the existing record is updated. New
> combinations are inserted. Records with no new transaction data in the
> window are left unchanged with their existing updatedAt timestamp,
> which will eventually trigger the stale indicator.*

## **5.3 Rate Refresh Failure Handling**

If transaction-service is unreachable during the daily refresh, the job
logs the error and exits silently. The existing PlatformRateAverage
records are not modified. After RATE_STALE_THRESHOLD_HOURS (default 24)
the existing records begin returning with is_stale: true in API
responses. listings-service shows the stale indicator on the budget
calculator. The client can still proceed with the listing --- stale rate
data does not block publishing.

# **6. Budget Display Rules**

## **6.1 Gross Amount Only**

pricing-service always returns and stores gross amounts --- the total
before any platform fee deduction. The platform fee percentage is never
calculated, disclosed, or included in any pricing-service response. The
client sees the gross budget amount they will budget for the engagement.
The platform fee is applied by billing-service after the contract is
activated and is only visible to the client in the billing and invoice
context.

> // CORRECT --- gross amount only
>
> // GET /v1/rates response
>
> {
>
> \"hourlyMedianUsdCents\": 10000, // \$100/hr gross
>
> \"hourlyLowUsdCents\": 7500, // \$75/hr gross
>
> \"hourlyHighUsdCents\": 13500 // \$135/hr gross
>
> }
>
> // INCORRECT --- never do this
>
> {
>
> \"hourlyMedianUsdCents\": 10000,
>
> \"platformFeePercent\": 12, // NEVER include this field
>
> \"hourlyAfterFeeUsdCents\": 8800 // NEVER include this field
>
> }
>
> *Warning: pricing-service must never include platform fee data, net
> amounts after fees, or any field that allows the caller to infer the
> platform fee. This is a business policy enforced at the service level.
> Any PR adding fee-related fields to pricing-service responses must be
> rejected.*

## **6.2 Storage Currency**

All monetary values in pricing-service are stored in USD cents
(integer). This applies to PlatformRateAverage hourly rates and to all
values returned in the budget calculation response. Currency conversion
from USD to the client display currency is a display-layer operation
performed by the currency endpoint on demand --- it is never applied to
stored data.

  ------------------------------------------------------------------------
  **Layer**          **Format**         **Rule**
  ------------------ ------------------ ----------------------------------
  Database           integer (USD       All rate columns stored as integer
                     cents)             cents. Column names end with
                                        \_usd_cents.

  API responses      integer (USD       Rate and budget calculation
                     cents)             responses return amounts in USD
                                        cents. The caller is responsible
                                        for display conversion.

  Currency           float (display)    GET /v1/currency/convert accepts
  conversion                            and returns float amounts in whole
                                        units (not cents). Conversion is a
                                        display utility, not a storage
                                        operation.
  ------------------------------------------------------------------------

# **7. Rounding Rules**

Rounding is applied consistently to prevent accumulated floating-point
errors across multi-role budget calculations. Two rounding contexts
exist: calculation and display.

## **7.1 Calculation Rounding**

All arithmetic during budget calculation uses integer cent values.
Math.round() is applied only once per role subtotal --- when converting
from the float product of hours and cents rate back to an integer. This
prevents error accumulation across multiple roles.

> // CORRECT calculation rounding
>
> const hourlyRateUsdCents = 10000; // \$100.00/hr stored as integer
> cents
>
> const estimatedHours = 160.5; // hours stored as float
>
> // Apply Math.round ONCE per role subtotal
>
> const subtotalUsdCents = Math.round(hourlyRateUsdCents \*
> estimatedHours);
>
> // = Math.round(10000 \* 160.5) = Math.round(1605000) = 1605000
>
> // Sum subtotals as integers --- no rounding needed
>
> const totalUsdCents = subtotal1 + subtotal2 + subtotal3;
>
> // INCORRECT --- rounding at intermediate steps causes accumulation
>
> const bad = Math.round(hourlyRateUsdCents \* estimatedHours / 100) \*
> 100; // Don\'t do this

## **7.2 Display Rounding**

When converting USD cents to a display currency for the client, the
converted float amount is rounded to 2 decimal places for display. This
rounding is applied only in the GET /v1/currency/convert response --- it
is never applied to stored data.

> // Display rounding in currency conversion
>
> const amountUsd = 1600; // \$1,600.00
>
> const eurRate = 0.9215;
>
> // Round to 2 decimal places for display only
>
> const displayEur = Math.round(amountUsd \* eurRate \* 100) / 100;
>
> // = Math.round(1600 \* 0.9215 \* 100) / 100
>
> // = Math.round(147440) / 100
>
> // = 1474.40
>
> // The stored budget remains in USD cents --- never converted at rest.

## **7.3 Rounding Summary Table**

  ------------------------------------------------------------------------
  **Context**            **Rounding         **Notes**
                         Applied**          
  ---------------------- ------------------ ------------------------------
  Role subtotal          Math.round() once  Applied at hours \* rate.
  calculation                               Never at intermediate
                                            arithmetic steps.

  Total budget sum       No rounding        Integer addition of
                                            already-rounded subtotals. No
                                            additional rounding needed.

  Currency conversion    2 decimal places   Math.round(amount \* rate \*
  (display)                                 100) / 100. Applied only in
                                            the convert endpoint response.

  Platform rate storage  No rounding        p25, p50, p75 percentiles from
                                            transaction-service are
                                            already in integer cents.
                                            Stored verbatim.

  FX rate storage        No rounding        Float rate stored as-is from
                                            FX API. Rounding only happens
                                            at conversion time.
  ------------------------------------------------------------------------

# **8. Integration Dependency Map**

  -----------------------------------------------------------------------------------
  **Dependency**             **Direction**       **Purpose**
  -------------------------- ------------------- ------------------------------------
  fawazahmed0/exchange-api   Outbound            Primary FX rate source. Called
                             (pricing-service    hourly by FxCacheService scheduled
                             calls it)           job.

  Frankfurter.app            Outbound (fallback) FX rate fallback. Only called when
                                                 primary is unreachable.

  transaction-service        Outbound            Rate average data source. Called
                             (pricing-service    daily by RatesRefreshService
                             calls it)           scheduled job.

  Redis                      Read/Write          Rate cache (24h TTL) and FX rate
                                                 cache (1h TTL). Shared instance with
                                                 other services.

  PostgreSQL (Supabase)      Read/Write          PlatformRateAverage and CurrencyRate
                                                 persistence. ps\_\* table prefix.

  listings-service           Inbound             Primary API consumer. Budget
                             (listings-service   calculator and currency conversion
                             calls               during job creation wizard.
                             pricing-service)    
  -----------------------------------------------------------------------------------

# **9. References**

- PS-00 --- Service Overview & Repo Placement --- rate data flow
  diagrams

- PS-01 --- Docker & Runtime Setup --- FX_API_URL, FX_API_FALLBACK_URL,
  REDIS_URL, TRANSACTION_SERVICE_URL environment variables

- PS-03 --- Data Models & DTOs --- PlatformRateAverage entity schema

- PS-04 --- API Endpoints --- endpoints that consume the cache and
  integration outputs defined here

- PS-06 --- Observability & Health --- alerts for FX API failure and
  rate refresh failure

- SD-07 --- Currency and Budget Display Rules --- extended business
  rules for budget display and currency handling
