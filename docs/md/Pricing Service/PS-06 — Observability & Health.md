PS-06

**Observability & Health**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document defines the health check endpoint, logging guidelines, key
operational metrics, and alert thresholds for pricing-service.
pricing-service sits in the critical path of the Step 4 budget
calculator --- degradation or silent failure here directly impacts every
client who is actively building a job listing. Because it is called
synchronously on every scope table change, latency and availability
matter as much here as correctness.

> *Important: pricing-service failing silently is worse than it
> returning an error. A 503 response allows listings-service to degrade
> gracefully and show a stale indicator. A hung request with no timeout
> causes listings-service to stall. All HTTP calls to upstream
> dependencies (transaction-service, FX API, Frankfurter.app) must use
> explicit timeouts of 10 seconds or less.*

# **2. Health Check Endpoint**

The health endpoint is registered at the root level in app.module.ts
with no route prefix. It returns HTTP 200 and the body below within 10
seconds of container start.

> // apps/pricing-service/src/health/health.controller.ts
>
> import { Controller, Get } from \'@nestjs/common\';
>
> \@Controller()
>
> export class HealthController {
>
> \@Get(\'health\')
>
> health(): { status: string } {
>
> return { status: \'ok\' };
>
> }
>
> }

Verify after every deployment:

> curl -f http://localhost:3016/health
>
> \# Expected: {\"status\":\"ok\"}

## **2.1 Supabase Health Check Configuration**

  -----------------------------------------------------------------------
  **Setting**            **Value**
  ---------------------- ------------------------------------------------
  Health check path      /health

  Success codes          200--299

  Timeout                10s

  Container port         Must match PORT environment variable (3016).
                         Mismatch causes health check failure and
                         automatic deployment rollback.
  -----------------------------------------------------------------------

# **3. Logging Guidelines**

pricing-service uses NestJS built-in Logger. Each service class
instantiates its own logger with the class name as the context. Log
output goes to stdout and is collected by Supabase.

## **3.1 Log Levels**

  -----------------------------------------------------------------------
  **Level**     **When to Use**
  ------------- ---------------------------------------------------------
  log           Successful rate lookups from DB (not cache hits --- too
                high volume), successful FX refreshes, successful daily
                rate refresh completion. One line per meaningful
                operation.

  warn          Primary FX API failed but fallback succeeded. Stale rate
                returned. Rate data approaching stale threshold (age \>
                20h, threshold 24h). transaction-service slow (\> 5s).

  error         Both FX API and fallback unreachable. Daily rate refresh
                failed entirely. Redis connection lost. Unexpected
                exception in budget calculation.

  debug         Disabled in production. Used locally to trace cache key
                construction and Redis pipeline operations.
  -----------------------------------------------------------------------

> *Important: Cache hits on GET /v1/rates and GET /v1/currency/convert
> are not logged individually --- they are too high-frequency and would
> flood the log stream. Only DB fetches and FX API calls are logged. Log
> the cache_hit flag only when logging a DB fetch to distinguish the
> first-request path.*

## **3.2 Standard Log Format**

> // Rate served from cache (cache hit)
>
> this.logger.log(
>
> \`Rate served: role=\${query.role} region=\${query.location ??
> \'all\'} \` +
>
> \`exp=\${query.experience ?? \'all\'} sched=\${query.schedule ??
> \'all\'} \` +
>
> \`cache_hit=true is_stale=\${response.is_stale}\`
>
> );
>
> // Rate served from DB (cache miss)
>
> this.logger.log(
>
> \`Rate fetched from DB: cacheKey=\${cacheKey}
> sampleSize=\${rate.sampleSize} \` +
>
> \`updatedAt=\${rate.updatedAt.toISOString()} is_stale=\${isStale}\`
>
> );
>
> // No rate data for combination
>
> this.logger.log(
>
> \`No rate data: role=\${query.role} region=\${query.location ??
> \'all\'} --- returning no_data\`
>
> );
>
> // FX rate served
>
> this.logger.log(
>
> \`FX rate served: from=\${from} to=\${to} rate=\${rate}
> is_stale=\${isStale}\`
>
> );
>
> // FX primary failed, fallback used
>
> this.logger.warn(
>
> \`Primary FX API failed: \${primaryErr.message}. Fallback succeeded
> for \${from}:\${to}\`
>
> );
>
> // Both FX sources failed, stale used
>
> this.logger.warn(
>
> \`Both FX APIs unreachable for \${from}:\${to} --- serving stale
> cached rate\`
>
> );
>
> // Both FX sources failed, no stale available
>
> this.logger.error(
>
> \`Both FX APIs unavailable for \${from}:\${to} and no cached fallback
> --- returning 503\`
>
> );
>
> // Daily rate refresh completed
>
> this.logger.log(
>
> \`Platform rates refreshed: \${upsertCount} records upserted from
> transaction-service\`
>
> );
>
> // Daily rate refresh failed
>
> this.logger.error(
>
> \`Daily rate refresh failed: \${err.message} --- existing rates
> remain, stale indicator will activate after \${staleHours}h\`,
>
> err.stack
>
> );
>
> // Redis cache invalidated after refresh
>
> this.logger.log(
>
> \`Rate cache invalidated: \${keys.length} keys deleted after daily
> refresh\`
>
> );

# **4. Key Metrics to Monitor**

  -------------------------------------------------------------------------
  **Metric**             **Target**    **Why It Matters**
  ---------------------- ------------- ------------------------------------
  GET /v1/rates success  ≥ 99.9%       Called synchronously on every budget
  rate                                 calculator update. Failures show as
                                       stale or missing data in Step 4.

  GET /v1/rates p95      \< 80ms       Budget calculator refreshes on every
  latency                              scope field change. Latency above
                                       80ms at p95 makes the UI feel
                                       sluggish. Cache hits should be \<
                                       5ms; DB hits should be \< 50ms.

  POST                   ≥ 99.9%       Drives real-time budget total in
  /v1/budget/calculate                 Step 4. Failures show as missing
  success rate                         budget amount.

  POST                   \< 300ms      Multi-role calculation makes
  /v1/budget/calculate                 multiple Redis reads. Should still
  p95 latency                          complete well under 300ms for scopes
                                       with up to 16 tasks.

  GET                    \< 50ms       Should always be a Redis cache hit.
  /v1/currency/convert                 Latency above 50ms suggests Redis is
  p95 latency                          being bypassed.

  Redis cache hit rate   ≥ 90%         A cache hit rate below 90% indicates
  (rate keys)                          the rate cache TTL is too short or
                                       the cache is being evicted. Check
                                       Redis memory limits.

  Redis cache hit rate   ≥ 99%         FX keys are refreshed every hour. A
  (FX keys)                            hit rate below 99% suggests Redis
                                       eviction or a key pattern mismatch.

  Daily rate refresh     100%          One scheduled job per day. A single
  success rate                         failure is already a miss. Failures
                                       result in stale rate data after 24
                                       hours.

  Stale rate data count  0 at refresh  Count of PlatformRateAverage records
                         time          where updated_at is older than
                                       RATE_STALE_THRESHOLD_HOURS. Should
                                       drop to 0 after each successful
                                       refresh.

  FX refresh success     ≥ 95%         5% failure tolerance accommodates
  rate (hourly)                        short outages of the primary FX API.
                                       The fallback absorbs most failures.
                                       Below 95% indicates a sustained
                                       outage.

  transaction-service    \< 30s        The daily refresh job uses a
  call latency (daily                  30-second timeout. If
  job)                                 transaction-service is consistently
                                       slow, the job may not complete
                                       before the timeout.
  -------------------------------------------------------------------------

# **5. Alert Thresholds**

The following conditions must trigger an alert. P1 alerts are in the
critical path of the job creation wizard. P2 alerts indicate degraded
state that is recoverable without immediate action.

  ---------------------------------------------------------------------------
  **Condition**             **Severity**   **Response**
  ------------------------- -------------- ----------------------------------
  GET /v1/rates error rate  P1             Investigate Redis and PostgreSQL
  exceeds 1% over any                      connectivity. listings-service
  5-minute window                          Step 4 is degraded for all
                                           affected clients.

  GET /health returns       P1             Container is unhealthy. Supabase
  non-200                                  will roll back automatically.
                                           Check container startup logs.

  Redis connection lost     P1             All cached reads fall through to
                                           PostgreSQL. Rate query latency
                                           jumps to 50ms+. FX conversions
                                           degrade to direct API calls.
                                           Restore Redis immediately.

  Both FX API and fallback  P1             Currency conversion degraded.
  unreachable for \> 15                    pricing-service serves stale FX
  minutes                                  rates (is_stale: true) or returns
                                           503. Coordinate with
                                           infrastructure to restore
                                           fawazahmed0 container.

  Daily rate refresh failed P2             Rate data remains at previous
                                           day\'s values. Stale indicator
                                           will activate in listings-service
                                           after 24 hours. Investigate
                                           transaction-service connectivity
                                           and re-trigger manually.

  GET /v1/rates p95 latency P2             Check Redis latency. If Redis is
  exceeds 500ms                            healthy, check PostgreSQL query
                                           performance on
                                           ps_platform_rate_averages. A full
                                           table scan indicates a missing
                                           index.

  Stale rate count \> 50%   P2             Last refresh succeeded but many
  of total records 25+                     role/region combinations have no
  hours after last refresh                 recent transaction data. Check
                                           transaction-service data volume
                                           and RATE_DATA_WINDOW_DAYS setting.

  FX hourly refresh failure P2             Primary FX API is having sustained
  rate \> 20% over any                     issues. Investigate fawazahmed0
  24-hour period                           container health. The fallback is
                                           absorbing failures but a prolonged
                                           primary outage needs attention.
  ---------------------------------------------------------------------------

# **6. Operational Runbook**

## **6.1 Diagnosing Stale Rate Data**

If listings-service is showing the stale indicator on the budget
calculator for all clients, run this query to determine when rates were
last refreshed.

> \-- Find all rate records older than 24 hours
>
> SELECT role_title, region, experience_level, work_schedule,
>
> updated_at,
>
> EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS age_hours
>
> FROM ps_platform_rate_averages
>
> WHERE updated_at \< NOW() - INTERVAL \'24 hours\'
>
> ORDER BY updated_at ASC;
>
> \-- If many rows are returned:
>
> \-- 1. Check logs for the most recent daily refresh run.
>
> \-- Search: service=pricing-service AND message CONTAINS \'Platform
> rates refreshed\'
>
> \-- 2. If no recent refresh log exists, the cron job failed or was
> never scheduled.
>
> \-- 3. Trigger a manual refresh by calling the internal admin endpoint
>
> \-- (POST /v1/admin/refresh-rates --- to be added in a future sprint)
> or
>
> \-- restart the service to trigger the \@Cron job on the next
> scheduled window.

## **6.2 Redis Connectivity Checks**

> \# Check Redis connectivity from within the pricing-service container
>
> redis-cli -u \$REDIS_URL ping
>
> \# Expected: PONG
>
> \# Check rate cache key count
>
> redis-cli -u \$REDIS_URL keys \'ps:rates:\*\' \| wc -l
>
> \# After a successful refresh this should match the number of rate
> combinations.
>
> \# If 0, the cache was invalidated and not yet repopulated (expected
> post-refresh).
>
> \# Check FX cache keys
>
> redis-cli -u \$REDIS_URL keys \'ps:fx:\*\' \| wc -l
>
> \# Should be \> 0 if the hourly FX refresh ran successfully.
>
> \# Check a specific FX rate
>
> redis-cli -u \$REDIS_URL get \'ps:fx:USD:EUR\'
>
> \# Expected: a float string like \'0.9215\'
>
> \# If Redis is unreachable, pricing-service will still serve from
> PostgreSQL
>
> \# for rate queries but every request will incur a DB hit until Redis
> recovers.

## **6.3 FX API Availability Checks**

> \# Diagnose FX API availability
>
> curl -f \$FX_API_URL/latest?from=USD \| head -c 200
>
> \# Expected: JSON with rates object
>
> \# If primary fails, test fallback directly
>
> curl -f https://api.frankfurter.app/latest?from=USD \| head -c 200
>
> \# Expected: JSON with rates object
>
> \# Check stale FX keys (these never expire --- last known rates)
>
> redis-cli -u \$REDIS_URL keys \'ps:fx:USD:\*:stale\' \| wc -l
>
> \# If \> 0, pricing-service can serve stale rates even with both FX
> APIs down.
>
> \# is_stale: true will be returned in all currency conversion
> responses.

## **6.4 Budget Calculator Returning Zeros**

If POST /v1/budget/calculate returns totalUsdCents: 0 for all roles
despite valid scope input, the most likely cause is that the rate cache
was invalidated by a daily refresh and the subsequent DB query found no
matching rows. Check the sequence:

- Confirm PlatformRateAverage records exist in the database with the
  expected role, region, and experience combinations.

- Confirm the role title in the request body matches the roleTitle
  column value in the database (ILike matching is case-insensitive but
  must be a prefix or exact match, not a contains match).

- Confirm the ps:rates:\* Redis keys exist. If they are all missing, the
  cache was invalidated and the DB query returned no_data for every
  role.

- If the database has records but they are not being found, check the
  ILike query and the exact values being passed from listings-service. A
  role title of \"UX Designer\" will not match \"ux-designer\" because
  ILike matches patterns, not stemmed forms.

# **7. Log Query Reference**

  -----------------------------------------------------------------------
  **What to Find**         **Log Query Pattern**
  ------------------------ ----------------------------------------------
  All DB rate fetches      service=pricing-service AND message CONTAINS
  (cache misses) in last   \"Rate fetched from DB\" AND timestamp \> -1h
  hour                     

  All no_data returns      service=pricing-service AND message CONTAINS
  (missing combinations)   \"No rate data\"

  FX fallback activations  service=pricing-service AND level=warn AND
                           message CONTAINS \"Primary FX API failed\"

  Stale FX rate responses  service=pricing-service AND level=warn AND
                           message CONTAINS \"serving stale cached rate\"

  Both FX sources failed   service=pricing-service AND level=error AND
                           message CONTAINS \"Both FX APIs unavailable\"

  Daily rate refresh       service=pricing-service AND message CONTAINS
  result                   \"Platform rates refreshed\"

  Daily rate refresh       service=pricing-service AND level=error AND
  failure                  message CONTAINS \"Daily rate refresh failed\"

  Cache invalidation       service=pricing-service AND message CONTAINS
  events                   \"Rate cache invalidated\"

  All errors in last 15    service=pricing-service AND level=error AND
  minutes                  timestamp \> -15m
  -----------------------------------------------------------------------

# **8. References**

- PS-01 --- Docker & Runtime Setup --- PORT, REDIS_URL,
  RATE_STALE_THRESHOLD_HOURS environment variables

- PS-04 --- API Endpoints --- endpoint contracts that generate the log
  lines and metrics described here

- PS-05 --- Integrations & Events --- FX cache strategy, daily rate
  refresh job, and Redis key schema

- PS-07 --- QA & Test Data --- test cases for stale data and fallback
  behaviour
