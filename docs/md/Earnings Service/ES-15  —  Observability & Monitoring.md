**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-15 --- Observability & Monitoring

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        ES-15 --- Observability & Monitoring

  **Version**         1.0

  **Metrics**         16 Prometheus metrics across 5 subsystems

  **Log format**      JSON structured --- every field named and typed

  **Alerts**          9 alerting rules with thresholds and runbook links

  **Health endpoint** GET /health --- liveness + readiness

  **Prerequisites**   ES-04, ES-07, ES-09
  -----------------------------------------------------------------------

# **1. Prometheus Metrics**

All metrics use the prefix earnings\_. Register via prom-client in a
MetricsModule. Expose on GET /metrics --- accessible from internal
network only, not via API gateway.

## **1.1 Balance cache**

  ----------------------------------------------------------------------------------------------------------------------
  **Metric**                                 **Type**    **Labels**                          **Description**
  ------------------------------------------ ----------- ----------------------------------- ---------------------------
  **earnings_cache_requests_total**          Counter     result=hit\|miss\|error, endpoint   Total balance cache
                                                                                             lookups. Derive hit rate:
                                                                                             hit/(hit+miss).

  **earnings_cache_ttl_remaining_seconds**   Histogram   ---                                 TTL remaining on cache hit.
                                                                                             Buckets: 30,60,120,180,300.
                                                                                             Low values indicate
                                                                                             near-expiry reads.

  **earnings_cache_invalidations_total**     Counter     reason=consumer_event\|ttl_expiry   DEL calls fired by
                                                                                             consumers vs natural TTL
                                                                                             expiry.
  ----------------------------------------------------------------------------------------------------------------------

## **1.2 FX rate resolution**

  ---------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                               **Type**    **Labels**                                              **Description**
  ---------------------------------------- ----------- ------------------------------------------------------- --------------------------
  **earnings_fx_fetch_duration_seconds**   Histogram   source=redis\|primary\|fallback\|db_cache\|emergency    End-to-end latency per FX
                                                                                                               source. Buckets:
                                                                                                               .01,.05,.1,.25,.5,1,2.5.

  **earnings_fx_source_total**             Counter     source=redis\|primary\|fallback\|db_cache\|emergency,   Count of resolutions per
                                                       currency_pair                                           source. Emergency source
                                                                                                               firing is a critical
                                                                                                               signal.

  **earnings_fx_cache_age_seconds**        Gauge       currency_pair                                           Age of the current Redis
                                                                                                               FX entry at read time.
                                                                                                               Alert when \> 3600.
  ---------------------------------------------------------------------------------------------------------------------------------------

## **1.3 RabbitMQ consumers**

  ----------------------------------------------------------------------------------------------------------------
  **Metric**                                          **Type**    **Labels**              **Description**
  --------------------------------------------------- ----------- ----------------------- ------------------------
  **earnings_consumer_processing_duration_seconds**   Histogram   routing_key             Time from message
                                                                                          receipt to ack/nack.
                                                                                          Buckets:
                                                                                          .01,.05,.1,.5,1,5.

  **earnings_consumer_messages_total**                Counter     routing_key,            Messages processed per
                                                                  result=ack\|nack\|dlq   routing key and outcome.

  **earnings_consumer_lag_messages**                  Gauge       queue                   Unacked message count
                                                                                          per queue. Read from
                                                                                          RabbitMQ management API.
                                                                                          Alert when \> 100.

  **earnings_consumer_retries_total**                 Counter     routing_key             Retry attempts before
                                                                                          ack or DLQ. High value
                                                                                          indicates transient
                                                                                          upstream failures.
  ----------------------------------------------------------------------------------------------------------------

## **1.4 Export queue**

  ------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                                 **Type**    **Labels**                               **Description**
  ------------------------------------------ ----------- ---------------------------------------- ------------------------------------
  **earnings_export_queue_depth**            Gauge       state=waiting\|active\|delayed\|failed   Bull queue depth per state. Alert on
                                                                                                  failed \> 0.

  **earnings_export_job_duration_seconds**   Histogram   format=csv\|pdf                          Total job time from dequeue to R2
                                                                                                  upload complete. Buckets:
                                                                                                  1,5,10,30,60,120.

  **earnings_export_file_size_bytes**        Histogram   format=csv\|pdf                          Generated file size. Buckets:
                                                                                                  10K,100K,1M,5M,10M,50M.

  **earnings_export_rows_total**             Histogram   format=csv\|pdf                          Row count per export job. Buckets:
                                                                                                  100,1000,5000,25000,100000,500000.
  ------------------------------------------------------------------------------------------------------------------------------------

## **1.5 HTTP endpoints**

  -------------------------------------------------------------------------------------------------------------
  **Metric**                                   **Type**    **Labels**      **Description**
  -------------------------------------------- ----------- --------------- ------------------------------------
  **earnings_http_request_duration_seconds**   Histogram   method, route,  Standard HTTP latency. Use
                                                           status_code     express-prom-bundle or manual
                                                                           middleware. Buckets:
                                                                           .005,.01,.025,.05,.1,.25,.5,1,2.5.

  **earnings_http_errors_total**               Counter     route,          Count of EarningsError throws by
                                                           error_code      errorCode. Tracks client vs server
                                                                           error trends.
  -------------------------------------------------------------------------------------------------------------

## **1.6 MetricsModule implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/metrics/metrics.module.ts                                      |
|                                                                       |
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { MetricsService } from \'./metrics.service\';                 |
|                                                                       |
| import { MetricsController } from \'./metrics.controller\';           |
|                                                                       |
| \@Global() \@Module({                                                 |
|                                                                       |
| providers: \[MetricsService\],                                        |
|                                                                       |
| controllers: \[MetricsController\],                                   |
|                                                                       |
| exports: \[MetricsService\],                                          |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class MetricsModule {}                                         |
|                                                                       |
| // src/metrics/metrics.service.ts                                     |
|                                                                       |
| import { Injectable, OnModuleInit } from \'@nestjs/common\';          |
|                                                                       |
| import \* as prom from \'prom-client\';                               |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class MetricsService implements OnModuleInit {                 |
|                                                                       |
| readonly cacheRequests = new prom.Counter({                           |
| name:\'earnings_cache_requests_total\',                               |
| labelNames:\[\'result\',\'endpoint\'\], help:\'Balance cache lookup   |
| results\' });                                                         |
|                                                                       |
| readonly cacheTtl = new prom.Histogram({                              |
| name:\'earnings_cache_ttl_remaining_seconds\',                        |
| buckets:\[30,60,120,180,300\], help:\'Remaining TTL on cache hit\'    |
| });                                                                   |
|                                                                       |
| readonly cacheInvalidate = new prom.Counter({                         |
| name:\'earnings_cache_invalidations_total\',                          |
| labelNames:\[\'reason\'\], help:\'Cache DEL calls\' });               |
|                                                                       |
| readonly fxDuration = new prom.Histogram({                            |
| name:\'earnings_fx_fetch_duration_seconds\',                          |
| labelNames:\[\'source\'\], buckets:\[.01,.05,.1,.25,.5,1,2.5\],       |
| help:\'FX resolution latency\' });                                    |
|                                                                       |
| readonly fxSource = new prom.Counter({                                |
| name:\'earnings_fx_source_total\',                                    |
| labelNames:\[\'source\',\'currency_pair\'\], help:\'FX resolutions    |
| per source\' });                                                      |
|                                                                       |
| readonly fxCacheAge = new prom.Gauge({                                |
| name:\'earnings_fx_cache_age_seconds\',                               |
| labelNames:\[\'currency_pair\'\], help:\'Age of cached FX rate\' });  |
|                                                                       |
| readonly consumerDuration= new prom.Histogram({                       |
| name:\'earnings_consumer_processing_duration_seconds\',               |
| labelNames:\[\'routing_key\'\], buckets:\[.01,.05,.1,.5,1,5\],        |
| help:\'Consumer processing time\' });                                 |
|                                                                       |
| readonly consumerMessages= new prom.Counter({                         |
| name:\'earnings_consumer_messages_total\',                            |
| labelNames:\[\'routing_key\',\'result\'\], help:\'Consumer message    |
| outcomes\' });                                                        |
|                                                                       |
| readonly consumerLag = new prom.Gauge({                               |
| name:\'earnings_consumer_lag_messages\', labelNames:\[\'queue\'\],    |
| help:\'Unacked messages per queue\' });                               |
|                                                                       |
| readonly consumerRetries = new prom.Counter({                         |
| name:\'earnings_consumer_retries_total\',                             |
| labelNames:\[\'routing_key\'\], help:\'Consumer retry attempts\' });  |
|                                                                       |
| readonly exportDepth = new prom.Gauge({                               |
| name:\'earnings_export_queue_depth\', labelNames:\[\'state\'\],       |
| help:\'Bull queue depth by state\' });                                |
|                                                                       |
| readonly exportDuration = new prom.Histogram({                        |
| name:\'earnings_export_job_duration_seconds\',                        |
| labelNames:\[\'format\'\], buckets:\[1,5,10,30,60,120\],              |
| help:\'Export job duration\' });                                      |
|                                                                       |
| readonly httpDuration = new prom.Histogram({                          |
| name:\'earnings_http_request_duration_seconds\',                      |
| labelNames:\[\'method\',\'route\',\'status_code\'\],                  |
| buckets:\[.005,.01,.025,.05,.1,.25,.5,1,2.5\], help:\'HTTP latency\'  |
| });                                                                   |
|                                                                       |
| readonly httpErrors = new prom.Counter({                              |
| name:\'earnings_http_errors_total\',                                  |
| labelNames:\[\'route\',\'error_code\'\], help:\'HTTP errors by        |
| errorCode\' });                                                       |
|                                                                       |
| onModuleInit() { prom.collectDefaultMetrics({                         |
| prefix:\'earnings_node\_\' }); }                                      |
|                                                                       |
| async getMetrics() { return prom.register.metrics(); }                |
|                                                                       |
| contentType() { return prom.register.contentType; }                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // src/metrics/metrics.controller.ts                                  |
|                                                                       |
| import { Controller, Get, Res } from \'@nestjs/common\';              |
|                                                                       |
| import { Response } from \'express\';                                 |
|                                                                       |
| import { MetricsService } from \'./metrics.service\';                 |
|                                                                       |
| \@Controller() export class MetricsController {                       |
|                                                                       |
| constructor(private readonly metrics: MetricsService) {}              |
|                                                                       |
| \@Get(\'metrics\')                                                    |
|                                                                       |
| async metrics(@Res() res: Response) {                                 |
|                                                                       |
| res.setHeader(\'Content-Type\', this.metrics.contentType());          |
|                                                                       |
| res.end(await this.metrics.getMetrics());                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **2. Structured Logging Schema**

Every log line is JSON. No free-form strings at WARN or above. Use
winston or pino with the fields below. Log level controlled by LOG_LEVEL
env var (default: info).

  ---------------------------------------------------------------------------------------------
  **Field**          **Type**   **Always present?**  **Description**
  ------------------ ---------- -------------------- ------------------------------------------
  **timestamp**      ISO 8601   Yes                  UTC. e.g. \"2025-06-10T14:32:01.123Z\"
                     string                          

  **level**          string     Yes                  \"debug\"\|\"info\"\|\"warn\"\|\"error\"

  **service**        string     Yes                  Always \"earnings-service\"

  **context**        string     Yes                  Class or module name. e.g.
                                                     \"BalanceService\",
                                                     \"TransactionCreatedConsumer\"

  **message**        string     Yes                  Human-readable description

  **requestId**      UUID       On HTTP logs         x-request-id header value or generated
                     string                          UUID

  **contractorId**   UUID       When applicable      Never log full balance amounts alongside
                     string                          contractorId

  **routingKey**     string     On consumer logs     RabbitMQ routing key

  **eventId**        UUID       On                   Event idempotency ID
                     string     consumer/publisher   
                                logs                 

  **durationMs**     number     On timed operations  Milliseconds elapsed

  **errorCode**      string     On error logs        ERR_EARNINGS\_\* code

  **stack**          string     On error level only  Stack trace --- error level only, never
                                                     warn or info
  ---------------------------------------------------------------------------------------------

## **2.1 Log level policy**

  --------------------------------------------------------------------------
  **Level**   **When to use**     **Examples**
  ----------- ------------------- ------------------------------------------
  **debug**   Detailed flow       Cache key computed, FX rate fetched from
              tracing ---         Redis hit
              disabled in         
              production          

  **info**    Normal operation    Consumer processed message, export job
              milestones          started, export job completed

  **warn**    Degraded but        Redis unavailable, Frankfurter fallback
              recoverable ---     used, stale FX rate served
              Redis down, FX      
              fallback used,      
              cache miss spike    

  **error**   Failures requiring  DB query failed, R2 upload failed after 3
              investigation ---   retries, unhandled exception in consumer
              unhandled           
              exceptions, R2      
              upload failure, DLQ 
              routed              
  --------------------------------------------------------------------------

## **2.2 Example log lines**

+----------------------------------------------------------------------------------------------------------+
| json                                                                                                     |
+----------------------------------------------------------------------------------------------------------+
| // INFO --- consumer processed successfully                                                              |
|                                                                                                          |
| {\"timestamp\":\"2025-06-10T14:32:01Z\",\"level\":\"info\",\"service\":\"earnings-service\",             |
|                                                                                                          |
| \"context\":\"TransactionCreatedConsumer\",\"message\":\"transaction.created processed\",                |
|                                                                                                          |
| \"routingKey\":\"transaction.created\",\"eventId\":\"uuid\",\"contractorId\":\"uuid\",\"durationMs\":42} |
|                                                                                                          |
| // WARN --- Redis unavailable, falling back to DB                                                        |
|                                                                                                          |
| {\"timestamp\":\"2025-06-10T14:32:02Z\",\"level\":\"warn\",\"service\":\"earnings-service\",             |
|                                                                                                          |
| \"context\":\"CacheService\",\"message\":\"Redis unavailable --- falling back to DB\",                   |
|                                                                                                          |
| \"errorCode\":\"ERR_EARNINGS_CACHE_WRITE_CRITICAL\",\"durationMs\":2001}                                 |
|                                                                                                          |
| // WARN --- FX fallback used                                                                             |
|                                                                                                          |
| {\"timestamp\":\"2025-06-10T14:32:03Z\",\"level\":\"warn\",\"service\":\"earnings-service\",             |
|                                                                                                          |
| \"context\":\"CurrencyService\",\"message\":\"Primary FX API unavailable --- using Frankfurter           |
| fallback\",                                                                                              |
|                                                                                                          |
| \"currencyPair\":\"USD/INR\",\"durationMs\":312}                                                         |
|                                                                                                          |
| // ERROR --- R2 upload failed                                                                            |
|                                                                                                          |
| {\"timestamp\":\"2025-06-10T14:32:04Z\",\"level\":\"error\",\"service\":\"earnings-service\",            |
|                                                                                                          |
| \"context\":\"ExportProcessor\",\"message\":\"R2 upload failed after 3 retries\",                        |
|                                                                                                          |
| \"errorCode\":\"ERR_EARNINGS_R2_UPLOAD_FAILED\",\"jobId\":\"uuid\",\"attempt\":3,                        |
|                                                                                                          |
| \"stack\":\"Error: PutObject failed\...\\n at R2Service.upload\...\"}                                    |
+==========================================================================================================+

# **3. Alerting Rules**

Rules are written in Prometheus Alertmanager YAML format. All alerts
route to the earnings-service PagerDuty integration. Critical alerts
page on-call immediately. Warning alerts create a ticket only.

## **3.1 Alert definitions**

  ------------------------------------------------------------------------------------------------------------------------------------------
  **Alert name**                      **Severity**   **Condition**                                                **For**   **Annotation /
                                                                                                                            runbook**
  ----------------------------------- -------------- ------------------------------------------------------------ --------- ----------------
  **EarningsBalanceCacheMissSpike**   warning        earnings_cache_requests_total{result=\"miss\"} /             5m        Cache miss rate
                                                     (earnings_cache_requests_total{result=\"miss\"} +                      \>50% for 5 min.
                                                     earnings_cache_requests_total{result=\"hit\"}) \> 0.5                  Check Redis
                                                                                                                            health. Runbook:
                                                                                                                            §3.2

  **EarningsRedisDown**               critical       earnings_cache_requests_total{result=\"error\"} \> 0         2m        Any Redis error.
                                                                                                                            DB fallback
                                                                                                                            active. Runbook:
                                                                                                                            §3.3

  **EarningsFXPrimaryDown**           warning        earnings_fx_source_total{source=\"primary\"} == 0 AND        3m        Primary FX API
                                                     earnings_fx_source_total{source=\"fallback\"} \> 0                     not responding.
                                                                                                                            Fallback active.
                                                                                                                            Not yet
                                                                                                                            critical.

  **EarningsFXAllSourcesDown**        critical       earnings_fx_source_total{source=\"emergency\"} \> 0          1m        Emergency rate
                                                                                                                            1.0 applied ---
                                                                                                                            all FX sources
                                                                                                                            exhausted.
                                                                                                                            Balance display
                                                                                                                            degraded.

  **EarningsFXCacheStale**            warning        earnings_fx_cache_age_seconds \> 3600                        5m        FX cache older
                                                                                                                            than 1 hour.
                                                                                                                            Investigate FX
                                                                                                                            API
                                                                                                                            connectivity.

  **EarningsConsumerLag**             warning        earnings_consumer_lag_messages \> 100                        3m        Consumer queue
                                                                                                                            backed up. Check
                                                                                                                            consumer health
                                                                                                                            and RabbitMQ.

  **EarningsConsumerLagCritical**     critical       earnings_consumer_lag_messages \> 500                        2m        Severe consumer
                                                                                                                            lag. Balance
                                                                                                                            updates
                                                                                                                            significantly
                                                                                                                            delayed.

  **EarningsDLQNonEmpty**             critical       rabbitmq_queue_messages_ready{queue=\~\"earnings.\*.dlq\"}   1m        Messages in DLQ.
                                                     \> 0                                                                   Manual
                                                                                                                            investigation
                                                                                                                            required.

  **EarningsExportJobsFailed**        warning        earnings_export_queue_depth{state=\"failed\"} \> 0           1m        One or more
                                                                                                                            async export
                                                                                                                            jobs failed.
                                                                                                                            Check R2
                                                                                                                            connectivity and
                                                                                                                            Bull queue.
  ------------------------------------------------------------------------------------------------------------------------------------------

## **3.2 Runbook: balance cache miss spike**

+-----------------------------------------------------------------------+
| **EarningsBalanceCacheMissSpike --- investigation steps**             |
|                                                                       |
| 1\. Check Redis connectivity: redis-cli -u \$REDIS_URL ping           |
|                                                                       |
| 2\. Check Redis memory: redis-cli info memory \| grep                 |
| used_memory_human                                                     |
|                                                                       |
| 3\. Check TTL of a sample key: redis-cli TTL                          |
| \"balance:{contractorId}\"                                            |
|                                                                       |
| 4\. If Redis is healthy but miss rate is high --- check for a mass    |
| cache invalidation event.                                             |
|                                                                       |
| This can occur after a bulk payout run that DELs many keys            |
| simultaneously.                                                       |
|                                                                       |
| 5\. If miss rate \> 90% and Redis is healthy --- suspect a cache key  |
| schema change (CACHE_VERSION bump).                                   |
|                                                                       |
| Old entries are treated as misses until TTL expires.                  |
+=======================================================================+

## **3.3 Runbook: Redis down**

+-----------------------------------------------------------------------+
| **EarningsRedisDown --- investigation steps**                         |
|                                                                       |
| 1\. Check container: docker compose ps redis                          |
|                                                                       |
| 2\. Check Redis logs: docker compose logs redis \--tail 50            |
|                                                                       |
| 3\. While Redis is down: all balance reads fall through to DB.        |
|                                                                       |
| DB load will increase proportionally to request rate. Monitor DB      |
| connection pool.                                                      |
|                                                                       |
| 4\. Consumer DEL calls will fail silently (WARN log). Cache may be    |
| stale after Redis recovers.                                           |
|                                                                       |
| After Redis recovers: keys repopulate lazily on next read. No manual  |
| action needed.                                                        |
|                                                                       |
| 5\. If Redis OOM (out of memory): increase maxmemory or flush         |
| non-critical keys.                                                    |
|                                                                       |
| Do not flush the entire keyspace --- idempotency keys (processed:\*)  |
| will be lost.                                                         |
+=======================================================================+

## **3.4 Runbook: FX API down**

+-----------------------------------------------------------------------+
| **EarningsFXAllSourcesDown --- investigation steps**                  |
|                                                                       |
| 1\. Check fx-api container: docker compose ps fx-api                  |
|                                                                       |
| 2\. Check fawazahmed0 API: curl -s                                    |
| \$FX_API_URL/v1/currencies/usd.json \| head                           |
|                                                                       |
| 3\. Check Frankfurter fallback: curl -s                               |
| https://api.frankfurter.app/latest?from=USD&to=INR                    |
|                                                                       |
| 4\. Check fx_rate_cache table: SELECT currency_pair, fetched_at FROM  |
| fx_rate_cache ORDER BY fetched_at DESC LIMIT 10;                      |
|                                                                       |
| 5\. While all sources are down: balance amounts display in USD        |
| (emergency rate 1.0).                                                 |
|                                                                       |
| No financial data is lost. Notify Product team of degraded currency   |
| display.                                                              |
|                                                                       |
| 6\. After FX API recovers: Redis cache repopulates on next request.   |
| No manual flush needed.                                               |
+=======================================================================+

# **4. Health Check Endpoint**

Two endpoints. GET /health for liveness (is the process alive?). GET
/health/ready for readiness (is the service ready to accept traffic?).
Kubernetes uses liveness for restart decisions and readiness for
load-balancer inclusion.

  -----------------------------------------------------------------------------------------------------------------------
  **Endpoint**      **Purpose**        **Healthy response**                    **Unhealthy response**
  ----------------- ------------------ --------------------------------------- ------------------------------------------
  **GET /health**   Liveness --- is    200 {\"status\":\"ok\"}                 500 if process is deadlocked or OOM ---
                    the process alive?                                         Kubernetes restarts pod

  **GET             Readiness --- can  200                                     503
  /health/ready**   the service handle {\"status\":\"ok\",\"checks\":{\...}}   {\"status\":\"error\",\"checks\":{\...}}
                    requests?                                                  --- pod removed from load balancer
  -----------------------------------------------------------------------------------------------------------------------

## **4.1 Readiness checks**

  -------------------------------------------------------------------------
  **Check**        **Healthy condition**          **Unhealthy action**
  ---------------- ------------------------------ -------------------------
  **PostgreSQL**   SELECT 1 responds within 1     503 --- remove from LB.
                   second                         Alert on-call.

  **Redis**        PING responds within 500ms     Service degrades
                                                  gracefully (DB fallback).
                                                  Readiness remains healthy
                                                  --- Redis is optional.

  **RabbitMQ**     Connection status is           503 --- consumers cannot
                   \"connected\"                  process events. Remove
                                                  from LB.

  **FX API         GET /v1/currencies/usd.json    Readiness remains healthy
  (primary)**      responds within 2s             --- fallback chain
                                                  handles this. Emit
                                                  warning metric.
  -------------------------------------------------------------------------

## **4.2 Health controller implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/health/health.controller.ts                                    |
|                                                                       |
| import { Controller, Get } from \'@nestjs/common\';                   |
|                                                                       |
| import { InjectDataSource } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| import \* as amqplib from \'amqplib\';                                |
|                                                                       |
| \@Controller(\'health\')                                              |
|                                                                       |
| export class HealthController {                                       |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectDataSource() private readonly ds: DataSource,                 |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@Get()                                                               |
|                                                                       |
| liveness() { return { status: \'ok\' }; }                             |
|                                                                       |
| \@Get(\'ready\')                                                      |
|                                                                       |
| async readiness() {                                                   |
|                                                                       |
| const checks: Record\<string, string\> = {};                          |
|                                                                       |
| let healthy = true;                                                   |
|                                                                       |
| // PostgreSQL                                                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.ds.query(\'SELECT 1\');                                    |
|                                                                       |
| checks.postgres = \'ok\';                                             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| checks.postgres = \'error\';                                          |
|                                                                       |
| healthy = false;                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Redis --- optional, degraded is still ready                        |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const redis = new Redis(this.config.get(\'REDIS_URL\'), {             |
| lazyConnect:true, connectTimeout:500 });                              |
|                                                                       |
| await redis.ping();                                                   |
|                                                                       |
| await redis.quit();                                                   |
|                                                                       |
| checks.redis = \'ok\';                                                |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| checks.redis = \'degraded\'; // not critical --- service falls back   |
| to DB                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // RabbitMQ                                                           |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const conn = await                                                    |
| amqplib.connect(this.config.get(\'RABBITMQ_URL\'));                   |
|                                                                       |
| await conn.close();                                                   |
|                                                                       |
| checks.rabbitmq = \'ok\';                                             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| checks.rabbitmq = \'error\';                                          |
|                                                                       |
| healthy = false;                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| const status = healthy ? 200 : 503;                                   |
|                                                                       |
| return { status: healthy ? \'ok\' : \'error\', checks };              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Grafana Dashboard --- Recommended Panels**

  ----------------------------------------------------------------------------------------------------------
  **Row**         **Panel**          **Query (abbreviated)**                             **Visualisation**
  --------------- ------------------ --------------------------------------------------- -------------------
  **Cache**       Cache hit rate %   rate(cache_requests_total{result=\"hit\"}\[5m\]) /  Stat + time series
                                     rate(cache_requests_total\[5m\]) \* 100             

  **Cache**       Cache miss rate %  rate(cache_requests_total{result=\"miss\"}\[5m\]) / Stat + time series
                                     rate(cache_requests_total\[5m\]) \* 100             

  **FX**          FX source          rate(fx_source_total\[5m\]) by (source)             Stacked bar
                  breakdown                                                              

  **FX**          FX fetch p99       histogram_quantile(0.99,                            Time series
                  latency            fx_fetch_duration_seconds_bucket) by (source)       

  **Consumers**   Consumer lag per   consumer_lag_messages by (queue)                    Time series ---
                  queue                                                                  alert line at 100

  **Consumers**   DLQ depth          rabbitmq_queue_messages_ready{queue=\~\"\*.dlq\"}   Stat --- red when
                                                                                         \> 0

  **Consumers**   Messages/sec per   rate(consumer_messages_total\[1m\]) by              Time series
                  routing key        (routing_key)                                       

  **Export**      Export queue depth export_queue_depth by (state)                       Stacked bar

  **Export**      Export job p95     histogram_quantile(0.95,                            Stat
                  duration           export_job_duration_seconds_bucket) by (format)     

  **HTTP**        Request rate by    rate(http_request_duration_seconds_count\[1m\]) by  Time series
                  route              (route)                                             

  **HTTP**        p99 latency by     histogram_quantile(0.99,                            Time series
                  route              http_request_duration_seconds_bucket) by (route)    

  **HTTP**        Error rate by      rate(http_errors_total\[5m\]) by (error_code)       Table
                  errorCode                                                              
  ----------------------------------------------------------------------------------------------------------

# **6. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **ES-04 --- RabbitMQ   Consumer lag, DLQ metrics, routing key labels
  Consumers**            

  **ES-06 --- Currency   FX source chain, emergency rate --- drives FX
  Conversion**           alert thresholds

  **ES-07 --- Redis      Cache hit/miss rate, invalidation reason labels,
  Caching**              Redis unavailability runbook

  **ES-09 --- Export     Export queue depth, job duration, R2 upload
  Endpoint**             failure alert

  **ES-10 --- Error      errorCode label values used in
  Catalog**              earnings_http_errors_total metric
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-15 \| v1.0
