**Marketeq Home Page**

**Monitoring, Logging & Observability**

*Structured logging, health checks, metrics, alerts, and debugging
strategies for the homepage backend*

April 5, 2026

**Scope: Backend Only**

**1. Logging Strategy**

**1.1 NestJS Logger**

-   All homepage classes use NestJS built-in Logger

-   Logger is injected per class: private readonly logger = new
    Logger(ClassName.name)

-   Log levels: log (info), warn, error, debug, verbose

-   Production: log + warn + error only. Development: all levels.

**1.2 Structured Log Format**

-   All logs include: timestamp, level, context (class name), message

-   Additional fields for homepage: slug, variant, cacheHit,
    assemblyTimeMs

-   Format: JSON in production, human-readable in development

**1.3 Log Points**

Key logging locations and triggers:

  --------------------------------------------- ------------------ ------------------------------------
  **Location**                                  **Level**          **Message**

  **HomepageController.getHomepage**            log                Homepage request received

  **HomepageService.getHomepage (cache hit)**   debug              Cache hit for key: {key}

  **HomepageService.getHomepage (cache miss)**  debug              Cache miss, assembling homepage

  **HomepageService.getHomepage (after cache    debug              Cached homepage with key: {key},
  write)**                                                         TTL: {ttl}s

  **HomepageService.resolveHomepageDocument**   warn               No default active homepage found in
                                                                   CMS

  **HomepageService.assembleSections**          debug              Assembling {n} sections

  **HomepageService.invalidateCache**           log                Invalidated {n} homepage cache keys

  **HomepageConsumer.connect**                  log                Homepage RabbitMQ consumer connected

  **HomepageConsumer.onMessage**                log                Received {routingKey}: slug={slug}

  **HomepageConsumer.onMessage (error)**        error              Error processing RMQ message

  **MostPopularEvaluator.evaluate (empty        warn               No active {entity} listings found
  pool)**                                                          

  **MostPopularEvaluator.evaluate (after        debug              Evaluated {n} listings, returning
  scoring)**                                                       top {limit}
  --------------------------------------------- ------------------ ------------------------------------

**1.4 Error Logging**

-   All caught errors log the full stack trace via error.stack

-   HTTP exceptions are NOT logged (NestJS handles these via exception
    filter)

-   CMS fetch failures: logged as error with CMS URL and status code

-   RabbitMQ failures: logged as error with connection URL (redacted
    password)

-   Redis failures: logged as warn (degraded but functional)

**2. Health Checks**

**2.1 NestJS Health Check Endpoint**

**File:** apps/api-gateway/src/health/health.controller.ts

-   Endpoint: GET /api/health

-   Checks: database (TypeORM), redis (cache-manager), rabbitmq (amqplib
    connection), cms (HTTP ping)

-   Response: { status: \"ok\" \| \"error\", details: { db: \"up\",
    redis: \"up\", rabbitmq: \"up\", cms: \"up\" } }

**2.2 Health Check Implementation**

Full code using \@nestjs/terminus:

  -----------------------------------------------------------------------
  \@Controller(\'api/health\')\
  export class HealthController {\
  constructor(\
  private health: HealthCheckService,\
  private db: TypeOrmHealthIndicator,\
  private http: HttpHealthIndicator,\
  ) {}\
  \
  \@Get()\
  check() {\
  return this.health.check(\[\
  () =\> this.db.pingCheck(\'database\'),\
  () =\> this.http.pingCheck(\'cms\', process.env.CMS_SERVICE_URL +
  \'/admin\'),\
  \]);\
  }\
  }

  -----------------------------------------------------------------------

**2.3 CMS Health Check**

-   Ping: GET {CMS_SERVICE_URL}/admin (returns 200 if CMS is running)

-   Timeout: 3 seconds

-   Frequency: Called by load balancer every 30 seconds

**3. Metrics**

**3.1 Key Metrics to Track**

Metrics for homepage performance and reliability:

  ------------------------------------ -------------------------------------------------
  **Metric**                           **Description**

  **homepage_request_total**           Counter: Total homepage API requests

  **homepage_request_duration_ms**     Histogram: Response time distribution

  **homepage_cache_hit_total**         Counter: Number of cache hits

  **homepage_cache_miss_total**        Counter: Number of cache misses

  **homepage_cache_hit_ratio**         Gauge: hits / (hits + misses) over 5-min window

  **homepage_assembly_duration_ms**    Histogram: Time to assemble from DB

  **homepage_evaluator_duration_ms**   Histogram: Time per evaluator call

  **homepage_rmq_events_received**     Counter: RabbitMQ events processed

  **homepage_rmq_events_failed**       Counter: RabbitMQ events that failed processing

  **homepage_cache_invalidations**     Counter: Number of cache invalidations
  ------------------------------------ -------------------------------------------------

**3.2 Implementation Pattern**

Using NestJS interceptors for request-level metrics:

  -----------------------------------------------------------------------
  \@Injectable()\
  export class HomepageMetricsInterceptor implements NestInterceptor {\
  intercept(context: ExecutionContext, next: CallHandler) {\
  const start = Date.now();\
  return next.handle().pipe(\
  tap(() =\> {\
  const duration = Date.now() - start;\
  // Record to your metrics provider\
  this.logger.log(\`homepage_request_duration_ms=\${duration}\`);\
  }),\
  );\
  }\
  }

  -----------------------------------------------------------------------

**4. Alerting Rules**

Critical and warning alerts for homepage monitoring:

  ------------------ ------------------------ ----------------------------
  **Alert Name**     **Condition**            **Action**

  **Homepage 5xx     \> 1% of requests return Page oncall. Check CMS and
  Rate**             5xx over 5 minutes       DB connectivity.

  **Homepage P99     \> 2000ms over 5 minutes Check DB query performance
  Latency**                                   and cache hit ratio.

  **Cache Hit Ratio  \< 70% over 15 minutes   Check Redis connectivity and
  Drop**                                      RMQ invalidation frequency.

  **RMQ Consumer     Consumer not connected   Check RabbitMQ connectivity.
  Disconnected**     for \> 60 seconds        Cache invalidation is
                                              broken.

  **CMS              Health check fails 3     Check CMS service. Homepage
  Unreachable**      consecutive times        serves stale cache.

  **Redis            Health check fails 3     All requests go through full
  Unreachable**      consecutive times        assembly (increased
                                              latency).

  **Homepage 404     \> 10 404 responses in 5 Check CMS for active default
  Spike**            minutes                  homepage. May indicate
                                              misconfiguration.
  ------------------ ------------------------ ----------------------------

**5. Debugging Guide**

**5.1 Common Issues and Solutions**

Troubleshooting table for typical homepage issues:

  ---------------- ------------------- ----------------------------------
  **Symptom**      **Likely Cause**    **How to Debug**

  **GET            No active default   Check cms.homepages table for
  /api/homepage    homepage in CMS     is_default=true AND
  returns 404**                        status=\'active\'

  **Stale content  Cache not           Check RMQ consumer logs for
  after CMS edit** invalidated         \"Received homepage.saved\". Check
                                       Redis for stale keys.

  **Slow response  Cache misses        Check cache hit ratio metrics.
  times**                              Verify Redis is connected.

  **Empty sections No active listings  Run SQL validation queries from
  in response**    match evaluator     10-HP Testing doc
                   criteria            

  **Preview mode   Wrong preview token Verify x-preview-token header
  returns 403**                        matches PREVIEW_SECRET env var

  **RMQ consumer   Connection failure  Check RABBITMQ_URL env var. Verify
  not starting**                       RabbitMQ is running. Check
                                       firewall rules.
  ---------------- ------------------- ----------------------------------

**5.2 Useful Debug Commands**

Commands for investigating runtime issues:

  -----------------------------------------------------------------------
  \# Check Redis cache keys\
  redis-cli KEYS \"hp:\*\"\
  \
  \# Check specific cache entry\
  redis-cli GET \"hp:home:\"\
  \
  \# Check RabbitMQ queue status\
  rabbitmqctl list_queues name messages consumers\
  \
  \# Check CMS homepage entries\
  curl http://localhost:3001/api/homepages \| jq \'.docs\[\] \| {title,
  slug, status, isDefault}\'\
  \
  \# Force cache clear\
  redis-cli DEL \"hp:home:\"

  -----------------------------------------------------------------------

**5.3 Request Tracing**

-   Each request should carry a correlation ID (x-request-id header)

-   If not provided by client, generate one in middleware

-   Log the correlation ID in every log line for end-to-end tracing

-   Correlation ID is returned in response headers

**6. Dashboard Recommendations**

Recommended panels for a monitoring dashboard (Grafana or similar):

-   Request rate (requests/sec) over time

-   Response time percentiles (P50, P95, P99)

-   Cache hit ratio gauge

-   Error rate by status code

-   RMQ event processing rate

-   Active evaluator query time breakdown

-   Redis memory usage for hp:\* keys

**7. Log Retention**

-   Production logs: 30 days hot storage, 90 days cold storage

-   Metrics: 90 days at full resolution, 1 year aggregated

-   Debug logs (verbose): Not enabled in production. Enable temporarily
    for debugging via LOG_LEVEL env var.
