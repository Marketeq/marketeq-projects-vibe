**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 06 \-- Observability & Health**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 06

  Prerequisites      Doc 00 through Doc 05

  Health Endpoints   /health (liveness) \| /ready (readiness)

  Log Format         Structured JSON \-- one object per event

  Log Destination    stdout \-- collected by platform log aggregator

  Metrics            Prometheus-compatible \-- exposed at /metrics

  Alerting           PagerDuty via Prometheus Alertmanager

  Scheduled Jobs     Nightly overdue invoice escalation \| DLQ depth
                     check
  -----------------------------------------------------------------------

# **1. Purpose**

This document defines the full observability strategy for
transaction-service. It covers the health and readiness endpoint
implementations, structured logging for every event type the service
handles, the complete set of Prometheus metrics with their label
schemas, alert rules with severity levels and thresholds, SLO
definitions for transaction processing, and the nightly scheduled job
that escalates overdue invoices.

Observability is not optional for a financial service. If a consumer
silently fails to write a ledger record, or if the error rate spikes
during a payment processing window, the team needs to know within
minutes \-- not hours. Every section in this document exists to make
failure loud and obvious.

# **2. Health Endpoints**

Two endpoints are exposed. /health is the liveness probe \-- it answers
whether the process is alive. /ready is the readiness probe \-- it
answers whether the service can handle traffic right now. Both are
excluded from JWT authentication.

## **2.1 GET /health (Liveness)**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  Path               /health

  Method             GET

  Auth               None \-- excluded from JwtAuthGuard

  Purpose            Liveness probe \-- is the process running and
                     responsive

  Used By            Supabase / container orchestrator to decide whether
                     to restart the container

  Response           200 OK always \-- if the process is alive enough to
                     respond, it is alive

  Response Body      { \"status\": \"ok\", \"uptime\": 3847 }

  Timeout Budget     Must respond within 2s \-- no I/O calls permitted in
                     this handler
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **GET /health \-- liveness handler**                                  |
+-----------------------------------------------------------------------+
| // src/controllers/health.controller.ts                               |
|                                                                       |
| \@Controller()                                                        |
|                                                                       |
| export class HealthController {                                       |
|                                                                       |
| private readonly startTime = Date.now();                              |
|                                                                       |
| \@Get(\'health\')                                                     |
|                                                                       |
| liveness() {                                                          |
|                                                                       |
| return {                                                              |
|                                                                       |
| status: \'ok\',                                                       |
|                                                                       |
| uptime: Math.floor((Date.now() - this.startTime) / 1000),             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.2 GET /ready (Readiness)**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  Path               /ready

  Method             GET

  Auth               None \-- excluded from JwtAuthGuard

  Purpose            Readiness probe \-- can the service handle requests
                     right now

  Used By            Load balancer \-- removes the instance from rotation
                     if not ready

  Success            200 OK \-- all dependency checks pass

  Failure            503 Service Unavailable \-- one or more checks
                     failed

  Checks             PostgreSQL connectivity, Redis connectivity,
                     RabbitMQ channel state

  Timeout Budget     5s total \-- each individual check has a 2s timeout
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **GET /ready \-- readiness handler**                                  |
+-----------------------------------------------------------------------+
| // src/controllers/health.controller.ts (continued)                   |
|                                                                       |
| \@Get(\'ready\')                                                      |
|                                                                       |
| async readiness() {                                                   |
|                                                                       |
| const checks = await Promise.allSettled(\[                            |
|                                                                       |
| this.checkDatabase(),                                                 |
|                                                                       |
| this.checkRedis(),                                                    |
|                                                                       |
| this.checkRabbitMQ(),                                                 |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| const results = {                                                     |
|                                                                       |
| database: checks\[0\].status === \'fulfilled\' ? checks\[0\].value :  |
| { ok: false, error: String(checks\[0\].reason) },                     |
|                                                                       |
| redis: checks\[1\].status === \'fulfilled\' ? checks\[1\].value : {   |
| ok: false, error: String(checks\[1\].reason) },                       |
|                                                                       |
| rabbitmq: checks\[2\].status === \'fulfilled\' ? checks\[2\].value :  |
| { ok: false, error: String(checks\[2\].reason) },                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| const allOk = Object.values(results).every(function(r) { return r.ok; |
| });                                                                   |
|                                                                       |
| if (!allOk) {                                                         |
|                                                                       |
| throw new ServiceUnavailableException({ status: \'degraded\', checks: |
| results });                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { status: \'ready\', checks: results };                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkDatabase(): Promise\<{ ok: boolean; latencyMs?:    |
| number }\> {                                                          |
|                                                                       |
| const start = Date.now();                                             |
|                                                                       |
| await this.dataSource.query(\'SELECT 1\');                            |
|                                                                       |
| return { ok: true, latencyMs: Date.now() - start };                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkRedis(): Promise\<{ ok: boolean; latencyMs?:       |
| number }\> {                                                          |
|                                                                       |
| const start = Date.now();                                             |
|                                                                       |
| await this.redis.ping();                                              |
|                                                                       |
| return { ok: true, latencyMs: Date.now() - start };                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkRabbitMQ(): Promise\<{ ok: boolean }\> {           |
|                                                                       |
| // AmqpConnection exposes managedConnection \-- check if channel is   |
| open                                                                  |
|                                                                       |
| const connected = this.amqp.managedConnection.isConnected();          |
|                                                                       |
| if (!connected) throw new Error(\'RabbitMQ channel not connected\');  |
|                                                                       |
| return { ok: true };                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Sample /ready Response Shapes**

+-----------------------------------------------------------------------+
| **/ready response shapes**                                            |
+-----------------------------------------------------------------------+
| // 200 OK \-- all checks pass                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"status\": \"ready\",                                                |
|                                                                       |
| \"checks\": {                                                         |
|                                                                       |
| \"database\": { \"ok\": true, \"latencyMs\": 4 },                     |
|                                                                       |
| \"redis\": { \"ok\": true, \"latencyMs\": 1 },                        |
|                                                                       |
| \"rabbitmq\": { \"ok\": true }                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 503 Service Unavailable \-- Redis unreachable                      |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"status\": \"degraded\",                                             |
|                                                                       |
| \"checks\": {                                                         |
|                                                                       |
| \"database\": { \"ok\": true, \"latencyMs\": 5 },                     |
|                                                                       |
| \"redis\": { \"ok\": false, \"error\": \"connect ECONNREFUSED         |
| 127.0.0.1:6379\" },                                                   |
|                                                                       |
| \"rabbitmq\": { \"ok\": true }                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Structured Logging Strategy**

All logs are emitted as single-line JSON objects to stdout. The platform
log aggregator (Datadog, Papertrail, or equivalent) collects stdout and
makes logs searchable. No log files are written to disk.

Every log entry includes a standard envelope. Domain-specific fields are
added per event type. The level field uses standard values: error, warn,
info, debug. Production runs at info level. Debug logs are suppressed in
production.

## **3.1 Standard Log Envelope**

+-----------------------------------------------------------------------+
| **Standard log envelope**                                             |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"level\": \"info\", // error \| warn \| info \| debug                |
|                                                                       |
| \"timestamp\": \"2025-04-02T10:30:00.123Z\",                          |
|                                                                       |
| \"service\": \"transaction-service\",                                 |
|                                                                       |
| \"traceId\": \"uuid\", // Propagated from incoming request or         |
| generated per consumer message                                        |
|                                                                       |
| \"context\": \"BillingConsumer\", // NestJS logger context \-- class  |
| name                                                                  |
|                                                                       |
| \"message\": \"\...\",                                                |
|                                                                       |
| // \...event-specific fields below                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Trace ID Propagation**                                              |
|                                                                       |
| Every HTTP request generates a traceId (UUID v4) injected by          |
| middleware. Every RabbitMQ message extracts the traceId from the      |
| message headers if present, or generates a new one. The traceId is    |
| attached to all log entries produced during that request or message   |
| lifecycle, allowing full correlation across services.                 |
+=======================================================================+

## **3.2 LoggerService**

**/apps/transaction-service/src/services/logger.service.ts**

+-----------------------------------------------------------------------+
| **src/services/logger.service.ts**                                    |
+-----------------------------------------------------------------------+
| import { Injectable, LoggerService as NestLoggerService } from        |
| \'@nestjs/common\';                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class StructuredLogger implements NestLoggerService {          |
|                                                                       |
| private context?: string;                                             |
|                                                                       |
| private traceId?: string;                                             |
|                                                                       |
| setContext(context: string): void { this.context = context; }         |
|                                                                       |
| setTraceId(traceId: string): void { this.traceId = traceId; }         |
|                                                                       |
| private emit(level: string, message: string, extra?: object): void {  |
|                                                                       |
| // Single process.stdout.write \-- never console.log in production    |
|                                                                       |
| process.stdout.write(JSON.stringify({                                 |
|                                                                       |
| level,                                                                |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| service: \'transaction-service\',                                     |
|                                                                       |
| traceId: this.traceId ?? \'none\',                                    |
|                                                                       |
| context: this.context ?? \'App\',                                     |
|                                                                       |
| message,                                                              |
|                                                                       |
| \...extra,                                                            |
|                                                                       |
| }) + \'\\n\');                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| error(message: string, extra?: object): void { this.emit(\'error\',   |
| message, extra); }                                                    |
|                                                                       |
| warn(message: string, extra?: object): void { this.emit(\'warn\',     |
| message, extra); }                                                    |
|                                                                       |
| log(message: string, extra?: object): void { this.emit(\'info\',      |
| message, extra); }                                                    |
|                                                                       |
| debug(message: string, extra?: object): void {                        |
|                                                                       |
| if (process.env.NODE_ENV !== \'production\') this.emit(\'debug\',     |
| message, extra);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| verbose() {} // Not used                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 What Gets Logged Per Event Type**

The following table defines the log entries emitted for every event
category the service handles. Each entry specifies the level, message
template, and the additional fields included.

  -----------------------------------------------------------------------------
  **Event / Trigger**   **Level**   **Message**         **Extra Fields**
  --------------------- ----------- ------------------- -----------------------
  RabbitMQ message      info        Consumer message    routingKey, queue,
  received                          received            eventId, userId

  Idempotency skip      info        Duplicate event \-- routingKey, eventId,
                                    skipping            existingTxnId

  Transaction written   info        Transaction record  transactionId, userId,
                                    created             amount, status,
                                                        descriptionType

  Invoice written       info        Invoice record      invoiceId, userId,
                                    created             amount, status

  Status update applied info        Record status       recordId,
                                    updated             previousStatus,
                                                        newStatus

  Cache hit             debug       Cache hit \--       cacheKey, userId, scope
                                    returning cached    
                                    result              

  Cache miss            debug       Cache miss \--      cacheKey, userId, scope
                                    querying database   

  Cache invalidated     debug       Cache invalidated   prefix, keysDeleted

  Ably publish success  debug       Ably status update  userId, transactionId,
                                    published           newStatus

  Ably publish failure  warn        Ably publish failed userId, transactionId,
                                    \-- non-fatal       error

  HTTP request          info        HTTP {method}       method, path,
                                    {path}              statusCode, durationMs,
                                                        userId

  HTTP 4xx response     warn        HTTP {method}       method, path,
                                    {path} \-- client   statusCode, code,
                                    error               userId

  HTTP 5xx response     error       HTTP {method}       method, path,
                                    {path} \-- server   statusCode, stack
                                    error               (non-prod only)

  Consumer exception    error       Consumer handler    routingKey, eventId,
                                    threw exception     error, stack

  Message sent to DLQ   error       Message nack\'d to  routingKey, eventId,
                                    dead-letter queue   reason

  Redis read failure    warn        Cache read failed   cacheKey, error
                                    \-- falling through 

  Redis write failure   warn        Cache write failed  cacheKey, error
                                    \-- non-fatal       

  DB connection failure error       Database query      query (truncated),
                                    failed              error, durationMs

  Export triggered      info        Export job          userId, scope, format,
                                    triggered           recordCount, queued

  Report submitted      info        Problem report      transactionId, userId,
                                    submitted           reportId, category

  Overdue cron ran      info        Overdue invoice     invoicesUpdated,
                                    escalation          durationMs
                                    completed           

  Stripe URL fetch      warn        Stripe invoice URL  stripeInvoiceId, error
  failure                           fetch failed        \-- invoice returned
                                                        without URL
  -----------------------------------------------------------------------------

## **3.4 Sample Log Entries**

+------------------------------------------------------------------------------------------------------+
| **Sample structured log entries**                                                                    |
+------------------------------------------------------------------------------------------------------+
| // Transaction created by consumer                                                                   |
|                                                                                                      |
| {\"level\":\"info\",\"timestamp\":\"2025-04-02T10:30:00.123Z\",\"service\":\"transaction-service\",  |
|                                                                                                      |
| \"traceId\":\"abc-123\",\"context\":\"BillingConsumer\",\"message\":\"Transaction record created\",  |
|                                                                                                      |
| \"transactionId\":\"uuid\",\"userId\":\"uuid\",\"amount\":515,\"status\":\"paid\",                   |
|                                                                                                      |
| \"descriptionType\":\"monthly_installment\"}                                                         |
|                                                                                                      |
| // Idempotency skip                                                                                  |
|                                                                                                      |
| {\"level\":\"info\",\"timestamp\":\"2025-04-02T10:30:01.004Z\",\"service\":\"transaction-service\",  |
|                                                                                                      |
| \"traceId\":\"abc-124\",\"context\":\"BillingConsumer\",\"message\":\"Duplicate event \--            |
| skipping\",                                                                                          |
|                                                                                                      |
| \"routingKey\":\"billing.payment.completed\",\"eventId\":\"abc-123\",\"existingTxnId\":\"uuid\"}     |
|                                                                                                      |
| // Consumer exception \-- highest priority log                                                       |
|                                                                                                      |
| {\"level\":\"error\",\"timestamp\":\"2025-04-02T10:31:00.000Z\",\"service\":\"transaction-service\", |
|                                                                                                      |
| \"traceId\":\"abc-125\",\"context\":\"BillingConsumer\",\"message\":\"Consumer handler threw         |
| exception\",                                                                                         |
|                                                                                                      |
| \"routingKey\":\"billing.payment.completed\",\"eventId\":\"xyz-999\",                                |
|                                                                                                      |
| \"error\":\"duplicate key value violates unique constraint                                           |
| \\\"transactions_transaction_id_key\\\"\"}                                                           |
+======================================================================================================+

# **4. Prometheus Metrics**

Metrics are exposed at GET /metrics in Prometheus text format using the
prom-client library. The endpoint is excluded from JWT authentication
but should be restricted to internal network access only at the
infrastructure level.

**npm install prom-client**

## **4.1 Metric Definitions**

  ----------------------------------------------------------------------------------------------
  **Metric Name**                      **Type**    **Labels**                  **Description**
  ------------------------------------ ----------- --------------------------- -----------------
  txn_consumer_messages_total          Counter     routing_key, status         Total RabbitMQ
                                                   (success\|error\|skipped)   messages
                                                                               processed by
                                                                               consumers

  txn_consumer_duration_seconds        Histogram   routing_key                 Consumer handler
                                                                               processing
                                                                               duration in
                                                                               seconds

  txn_records_created_total            Counter     description_type,           Total transaction
                                                   amount_direction            records written
                                                                               to the database

  txn_payment_failure_rate             Gauge       contract_type               Ratio of failed
                                                                               to total payment
                                                                               transactions over
                                                                               the last 5
                                                                               minutes

  txn_http_requests_total              Counter     method, path, status_code   Total HTTP
                                                                               requests handled

  txn_http_duration_seconds            Histogram   method, path                HTTP request
                                                                               duration in
                                                                               seconds

  txn_cache_hits_total                 Counter     scope                       Redis cache hits
                                                   (transactions\|invoices)    on list endpoints

  txn_cache_misses_total               Counter     scope                       Redis cache
                                                   (transactions\|invoices)    misses on list
                                                                               endpoints

  txn_cache_invalidations_total        Counter     scope                       Redis cache
                                                   (transactions\|invoices)    invalidation
                                                                               operations

  txn_ably_publishes_total             Counter     status (success\|error)     Ably real-time
                                                                               publish attempts

  txn_dlq_depth                        Gauge       queue                       Current depth of
                                                                               each dead-letter
                                                                               queue \-- polled
                                                                               every 60s

  txn_export_queue_depth               Gauge       (none)                      Number of async
                                                                               export jobs
                                                                               currently queued

  txn_export_duration_seconds          Histogram   scope, format               Time to complete
                                                                               a synchronous
                                                                               export

  txn_overdue_invoices_updated_total   Counter     (none)                      Invoices
                                                                               escalated to
                                                                               overdue status by
                                                                               nightly cron

  txn_stripe_fetch_duration_seconds    Histogram   status (success\|error)     Stripe invoice
                                                                               URL fetch latency

  txn_db_query_duration_seconds        Histogram   operation                   Database query
                                                   (find\|save\|update)        duration \--
                                                                               detect slow
                                                                               queries
  ----------------------------------------------------------------------------------------------

## **4.2 MetricsService Implementation**

**/apps/transaction-service/src/services/metrics.service.ts**

+-----------------------------------------------------------------------+
| **src/services/metrics.service.ts**                                   |
+-----------------------------------------------------------------------+
| import { Injectable, OnModuleInit } from \'@nestjs/common\';          |
|                                                                       |
| import \* as prom from \'prom-client\';                               |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class MetricsService implements OnModuleInit {                 |
|                                                                       |
| // Consumer metrics                                                   |
|                                                                       |
| readonly consumerMessagesTotal = new prom.Counter({                   |
|                                                                       |
| name: \'txn_consumer_messages_total\',                                |
|                                                                       |
| help: \'Total RabbitMQ messages processed\',                          |
|                                                                       |
| labelNames: \[\'routing_key\', \'status\'\],                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| readonly consumerDuration = new prom.Histogram({                      |
|                                                                       |
| name: \'txn_consumer_duration_seconds\',                              |
|                                                                       |
| help: \'Consumer handler duration\',                                  |
|                                                                       |
| labelNames: \[\'routing_key\'\],                                      |
|                                                                       |
| buckets: \[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5\],                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // HTTP metrics                                                       |
|                                                                       |
| readonly httpRequestsTotal = new prom.Counter({                       |
|                                                                       |
| name: \'txn_http_requests_total\',                                    |
|                                                                       |
| help: \'Total HTTP requests\',                                        |
|                                                                       |
| labelNames: \[\'method\', \'path\', \'status_code\'\],                |
|                                                                       |
| });                                                                   |
|                                                                       |
| readonly httpDuration = new prom.Histogram({                          |
|                                                                       |
| name: \'txn_http_duration_seconds\',                                  |
|                                                                       |
| help: \'HTTP request duration\',                                      |
|                                                                       |
| labelNames: \[\'method\', \'path\'\],                                 |
|                                                                       |
| buckets: \[0.05, 0.1, 0.25, 0.5, 1, 2, 5\],                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Cache metrics                                                      |
|                                                                       |
| readonly cacheHits = new prom.Counter({ name:                         |
| \'txn_cache_hits_total\', help: \'Redis cache hits\', labelNames:     |
| \[\'scope\'\] });                                                     |
|                                                                       |
| readonly cacheMisses = new prom.Counter({ name:                       |
| \'txn_cache_misses_total\', help: \'Redis cache misses\', labelNames: |
| \[\'scope\'\] });                                                     |
|                                                                       |
| // DLQ depth gauge \-- updated by scheduled poller                    |
|                                                                       |
| readonly dlqDepth = new prom.Gauge({                                  |
|                                                                       |
| name: \'txn_dlq_depth\',                                              |
|                                                                       |
| help: \'Dead-letter queue depth\',                                    |
|                                                                       |
| labelNames: \[\'queue\'\],                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Export metrics                                                     |
|                                                                       |
| readonly exportQueueDepth = new prom.Gauge({                          |
|                                                                       |
| name: \'txn_export_queue_depth\',                                     |
|                                                                       |
| help: \'Async export jobs queued\',                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| onModuleInit(): void {                                                |
|                                                                       |
| // Collect default Node.js process metrics (memory, CPU, event loop   |
| lag)                                                                  |
|                                                                       |
| prom.collectDefaultMetrics({ prefix: \'txn_node\_\' });               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Helper: time a function and record it                              |
|                                                                       |
| async timeAsync\<T\>(histogram: prom.Histogram, labels: object, fn:   |
| () =\> Promise\<T\>): Promise\<T\> {                                  |
|                                                                       |
| const end = histogram.startTimer(labels);                             |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await fn();                                                    |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| end();                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.3 /metrics Endpoint**

+-----------------------------------------------------------------------+
| **GET /metrics handler**                                              |
+-----------------------------------------------------------------------+
| // src/controllers/health.controller.ts (continued)                   |
|                                                                       |
| \@Get(\'metrics\')                                                    |
|                                                                       |
| async metrics(@Res() res: Response): Promise\<void\> {                |
|                                                                       |
| // Restrict to internal network at infrastructure level \-- no JWT    |
| needed                                                                |
|                                                                       |
| res.set(\'Content-Type\', prom.register.contentType);                 |
|                                                                       |
| res.end(await prom.register.metrics());                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.4 Consumer Instrumentation Pattern**

Every consumer handler wraps its body with a timer and increments the
counter on success, error, or idempotency skip. This pattern must be
applied consistently to all 11 consumers.

+-----------------------------------------------------------------------+
| **Consumer instrumentation pattern**                                  |
+-----------------------------------------------------------------------+
| // Pattern applied to every consumer handler                          |
|                                                                       |
| async onPaymentCompleted(payload: BillingPaymentCompletedEvent):      |
| Promise\<void\> {                                                     |
|                                                                       |
| const routingKey = \'billing.payment.completed\';                     |
|                                                                       |
| const end = this.metrics.consumerDuration.startTimer({ routing_key:   |
| routingKey });                                                        |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) {                                                         |
|                                                                       |
| this.metrics.consumerMessagesTotal.inc({ routing_key: routingKey,     |
| status: \'skipped\' });                                               |
|                                                                       |
| this.logger.log(\'Duplicate event \-- skipping\', { routingKey,       |
| eventId: payload.eventId });                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \... handler logic \...                                            |
|                                                                       |
| this.metrics.consumerMessagesTotal.inc({ routing_key: routingKey,     |
| status: \'success\' });                                               |
|                                                                       |
| this.logger.log(\'Transaction record created\', { transactionId:      |
| txn.id, userId: txn.userId,                                           |
|                                                                       |
| amount: txn.amount, status: txn.status });                            |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.metrics.consumerMessagesTotal.inc({ routing_key: routingKey,     |
| status: \'error\' });                                                 |
|                                                                       |
| this.logger.error(\'Consumer handler threw exception\', { routingKey, |
| eventId: payload.eventId, error: String(err) });                      |
|                                                                       |
| throw err; // Re-throw so RabbitMQ nacks and routes to DLQ            |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| end();                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Alert Rules & Thresholds**

Alerts are defined as Prometheus alerting rules. P1 and P2 alerts page
on-call immediately. P3 alerts create a ticket for next-business-day
review. P4 alerts are informational and go to a Slack channel only.

## **5.1 DLQ & Consumer Alerts**

  -------------------------------------------------------------------------------------------------------------------------------
  **Alert Name**        **Severity**   **Condition**                                               **Threshold**   **Action**
  --------------------- -------------- ----------------------------------------------------------- --------------- --------------
  DLQDepthNonZero       **P1 -         txn_dlq_depth{queue=\~\'.\*\'} \> 0                         Any message in  Page on-call
                        Critical**                                                                 any DLQ         immediately
                                                                                                                   \-- financial
                                                                                                                   event not
                                                                                                                   recorded

  ConsumerErrorRate     **P1 -         rate(txn_consumer_messages_total{status=\'error\'}\[5m\])   More than 6     Page on-call
                        Critical**     \> 0.1                                                      errors/min      \-- consumers
                                                                                                                   failing at
                                                                                                                   high rate

  ConsumerHighLatency   **P2 - High**  p99(txn_consumer_duration_seconds) \> 5                     p99 \> 5        Investigate DB
                                                                                                   seconds         or downstream
                                                                                                                   dependency
                                                                                                                   slowness

  ConsumerStopped       **P2 - High**  rate(txn_consumer_messages_total\[10m\]) == 0               Zero messages   Check RabbitMQ
                                                                                                   for 10 min      connectivity
                                                                                                                   \-- may
                                                                                                                   indicate queue
                                                                                                                   drain or
                                                                                                                   disconnect
  -------------------------------------------------------------------------------------------------------------------------------

## **5.2 Payment Failure Rate Alerts**

  ----------------------------------------------------------------------------------------------------
  **Alert Name**               **Severity**   **Condition**              **Threshold**   **Action**
  ---------------------------- -------------- -------------------------- --------------- -------------
  PaymentFailureRateHigh       **P1 -         txn_payment_failure_rate   Failure rate \> Page on-call
                               Critical**     \> 0.10                    10%             \-- possible
                                                                                         Stripe outage
                                                                                         or widespread
                                                                                         card decline
                                                                                         issue

  PaymentFailureRateElevated   **P2 - High**  txn_payment_failure_rate   Failure rate \> Investigate
                                              \> 0.05                    5%              \-- elevated
                                                                                         declines may
                                                                                         indicate
                                                                                         fraud spike
                                                                                         or billing
                                                                                         config issue

  PaymentFailureRateLow        **P3 -         txn_payment_failure_rate   Failure rate \> Monitor \--
                               Medium**       \> 0.02                    2%              above normal
                                                                                         baseline but
                                                                                         not
                                                                                         immediately
                                                                                         critical
  ----------------------------------------------------------------------------------------------------

## **5.3 HTTP API Alerts**

  ----------------------------------------------------------------------------------------------------------------------------
  **Alert Name**     **Severity**   **Condition**                                                **Threshold**   **Action**
  ------------------ -------------- ------------------------------------------------------------ --------------- -------------
  HighErrorRate5xx   **P1 -         rate(txn_http_requests_total{status_code=\~\'5..\'}\[5m\]) / 5xx rate \> 5%  Page on-call
                     Critical**     rate(txn_http_requests_total\[5m\]) \> 0.05                                  \-- service
                                                                                                                 is returning
                                                                                                                 errors to
                                                                                                                 users

  HighLatencyP99     **P2 - High**  histogram_quantile(0.99, txn_http_duration_seconds) \> 3     p99 \> 3        Investigate
                                                                                                 seconds         slow queries
                                                                                                                 \-- check DB
                                                                                                                 indexes and
                                                                                                                 cache hit
                                                                                                                 rate

  HighLatencyP50     **P3 -         histogram_quantile(0.50, txn_http_duration_seconds) \> 1     p50 \> 1 second Median
                     Medium**                                                                                    latency
                                                                                                                 elevated \--
                                                                                                                 check Redis
                                                                                                                 and DB
                                                                                                                 connection
                                                                                                                 pools

  Elevated4xxRate    **P3 -         rate(txn_http_requests_total{status_code=\~\'4..\'}\[5m\]) / 4xx rate \> 20% Possible
                     Medium**       rate(txn_http_requests_total\[5m\]) \> 0.20                                  client bug or
                                                                                                                 API contract
                                                                                                                 break \--
                                                                                                                 review error
                                                                                                                 codes
  ----------------------------------------------------------------------------------------------------------------------------

## **5.4 Infrastructure Alerts**

  ----------------------------------------------------------------------------------------------------------------------------------
  **Alert Name**         **Severity**   **Condition**                                                **Threshold**   **Action**
  ---------------------- -------------- ------------------------------------------------------------ --------------- ---------------
  DatabaseDown           **P1 -         /ready check database.ok == false for \> 30s                 DB unreachable  Page on-call
                         Critical**                                                                  30s             \-- service
                                                                                                                     cannot write or
                                                                                                                     read
                                                                                                                     transactions

  RedisDown              **P2 - High**  /ready check redis.ok == false for \> 60s                    Redis down 60s  Service
                                                                                                                     degrades to
                                                                                                                     DB-only \-- no
                                                                                                                     cache, higher
                                                                                                                     latency.
                                                                                                                     Investigate.

  RabbitMQDisconnected   **P1 -         /ready check rabbitmq.ok == false for \> 30s                 AMQP down 30s   Page on-call
                         Critical**                                                                                  \-- consumers
                                                                                                                     stopped, events
                                                                                                                     accumulating in
                                                                                                                     broker

  HighMemoryUsage        **P3 -         txn_node_process_heap_used_bytes /                           Heap \> 85%     Investigate
                         Medium**       txn_node_process_heap_size_bytes \> 0.85                                     memory leak \--
                                                                                                                     consider
                                                                                                                     rolling restart

  ExportQueueBacklog     **P2 - High**  txn_export_queue_depth \> 50                                 Queue depth \>  Export worker
                                                                                                     50              may be backed
                                                                                                                     up \-- check
                                                                                                                     job processor
                                                                                                                     health

  StripeFetchSlow        **P3 -         p99(txn_stripe_fetch_duration_seconds{status=\'success\'})   Stripe p99 \>   Stripe API
                         Medium**       \> 2                                                         2s              degraded \--
                                                                                                                     non-critical,
                                                                                                                     invoice detail
                                                                                                                     loads without
                                                                                                                     URL
  ----------------------------------------------------------------------------------------------------------------------------------

## **5.5 Prometheus Alert Rule File**

**/apps/transaction-service/alerts/transaction-service.rules.yml**

+-----------------------------------------------------------------------+
| **transaction-service.rules.yml**                                     |
+-----------------------------------------------------------------------+
| groups:                                                               |
|                                                                       |
| \- name: transaction-service                                          |
|                                                                       |
| interval: 30s                                                         |
|                                                                       |
| rules:                                                                |
|                                                                       |
| \# P1 \-- DLQ non-empty                                               |
|                                                                       |
| \- alert: DLQDepthNonZero                                             |
|                                                                       |
| expr: txn_dlq_depth \> 0                                              |
|                                                                       |
| for: 0m                                                               |
|                                                                       |
| labels:                                                               |
|                                                                       |
| severity: critical                                                    |
|                                                                       |
| team: backend                                                         |
|                                                                       |
| annotations:                                                          |
|                                                                       |
| summary: \"Dead-letter queue has {{ \$value }} messages\"             |
|                                                                       |
| description: \"Financial events not recorded. Review DLQ              |
| immediately.\"                                                        |
|                                                                       |
| runbook: \"https://wiki.marketeq.com/runbooks/txn-dlq\"               |
|                                                                       |
| \# P1 \-- Consumer error rate                                         |
|                                                                       |
| \- alert: ConsumerErrorRate                                           |
|                                                                       |
| expr: rate(txn_consumer_messages_total{status=\"error\"}\[5m\]) \>    |
| 0.1                                                                   |
|                                                                       |
| for: 2m                                                               |
|                                                                       |
| labels:                                                               |
|                                                                       |
| severity: critical                                                    |
|                                                                       |
| annotations:                                                          |
|                                                                       |
| summary: \"Consumer error rate {{ \$value \| humanize }}/s\"          |
|                                                                       |
| \# P1 \-- Payment failure rate                                        |
|                                                                       |
| \- alert: PaymentFailureRateHigh                                      |
|                                                                       |
| expr: txn_payment_failure_rate \> 0.10                                |
|                                                                       |
| for: 5m                                                               |
|                                                                       |
| labels:                                                               |
|                                                                       |
| severity: critical                                                    |
|                                                                       |
| annotations:                                                          |
|                                                                       |
| summary: \"Payment failure rate {{ \$value \| humanizePercentage }}\" |
|                                                                       |
| \# P2 \-- HTTP 5xx rate                                               |
|                                                                       |
| \- alert: HighErrorRate5xx                                            |
|                                                                       |
| expr: \>                                                              |
|                                                                       |
| rate(txn_http_requests_total{status_code=\~\"5..\"}\[5m\])            |
|                                                                       |
| / rate(txn_http_requests_total\[5m\]) \> 0.05                         |
|                                                                       |
| for: 3m                                                               |
|                                                                       |
| labels:                                                               |
|                                                                       |
| severity: high                                                        |
|                                                                       |
| annotations:                                                          |
|                                                                       |
| summary: \"HTTP 5xx rate {{ \$value \| humanizePercentage }}\"        |
+=======================================================================+

# **6. SLO Definitions**

SLOs define the reliability commitments for the service. Each SLO has a
target, an error budget (the acceptable failure rate within a 30-day
window), and a burn rate alert that fires when the error budget is being
consumed too quickly.

## **6.1 SLO Table**

  ---------------------------------------------------------------------------------------------------------------------------------
  **SLO Name**     **Target**             **Error       **Measurement**                                            **Notes**
                                          Budget (30                                                               
                                          days)**                                                                  
  ---------------- ---------------------- ------------- ---------------------------------------------------------- ----------------
  Transaction      99.9% of billing       43.2 min /    Rate of DLQ entries vs total consumed messages             Measured from
  Event Processing events result in a     month                                                                    message publish
                   ledger record within                                                                            time to
                   30 seconds of being                                                                             transaction row
                   published                                                                                       created_at. DLQ
                                                                                                                   entries count as
                                                                                                                   full failures.

  Transaction List 99.9% of GET           43.2 min /    txn_http_requests_total and txn_http_duration_seconds      Excludes planned
  Availability     /v1/transactions       month                                                                    maintenance
                   requests return 200                                                                             windows. Cache
                   within 2 seconds                                                                                hit target of
                                                                                                                   70% is a
                                                                                                                   supporting
                                                                                                                   metric, not an
                                                                                                                   SLO.

  Invoice List     99.9% of GET           43.2 min /    txn_http_requests_total and txn_http_duration_seconds      Same measurement
  Availability     /v1/invoices requests  month                                                                    as transaction
                   return 200 within 2                                                                             list.
                   seconds                                                                                         

  Transaction      99.95% of GET          21.6 min /    Status code and duration from                              Stricter SLO
  Detail           /v1/transactions/:id   month         txn_http_duration_seconds{path=\'/v1/transactions/:id\'}   because this
  Availability     requests return 200                                                                             endpoint
                   within 1 second                                                                                 supports the
                                                                                                                   Transaction
                                                                                                                   Detail modal \--
                                                                                                                   a core
                                                                                                                   user-facing
                                                                                                                   interaction.

  Payment Failure  Payment transaction    Threshold,    txn_payment_failure_rate gauge                             Baseline failure
  Rate             failure rate below 3%  not                                                                      rate due to
                   over any 24-hour       time-based                                                               insufficient
                   window                                                                                          funds, expired
                                                                                                                   cards etc. is
                                                                                                                   \~1%. 3%
                                                                                                                   triggers
                                                                                                                   investigation.

  Consumer         p99 consumer handler   Degraded      txn_consumer_duration_seconds histogram                    Consumer
  Processing       duration below 2       performance                                                              handlers that
  Latency          seconds                budget: 1% of                                                            exceed 5s are
                                          messages may                                                             treated as
                                          exceed 2s                                                                errors
                                                                                                                   regardless of
                                                                                                                   final outcome.

  Export Delivery  Synchronous exports    5% may exceed txn_export_duration_seconds histogram                      Async exports
                   (\<=1000 records)      10s but must                                                             are not covered
                   complete within 10     complete                                                                 by this SLO \--
                   seconds for 95% of     within 60s                                                               they have a
                   requests                                                                                        best-effort
                                                                                                                   1-hour email
                                                                                                                   delivery target.
  ---------------------------------------------------------------------------------------------------------------------------------

## **6.2 SLO Burn Rate Alerts**

Burn rate alerts fire when the error budget is being consumed faster
than sustainable. A burn rate of 1 means the full budget will be
consumed in exactly 30 days. A burn rate of 14.4 means the budget will
be gone in 2 hours.

  ---------------------------------------------------------------------------
  **Window**      **Burn Rate   **Severity**   **Meaning**
                  Threshold**                  
  --------------- ------------- -------------- ------------------------------
  1h lookback     \> 14.4x      P1 - Critical  Budget exhausted in under 2
                                               hours at current rate \-- page
                                               immediately

  6h lookback     \> 6x         P2 - High      Budget exhausted in under 5
                                               days \-- investigate within
                                               the hour

  24h lookback    \> 3x         P3 - Medium    Budget exhausted in under 10
                                               days \-- review before next
                                               sprint

  72h lookback    \> 1x         P4 - Low       Burning at or above
                                               sustainable rate \-- awareness
                                               only
  ---------------------------------------------------------------------------

# **7. Nightly Scheduled Jobs**

Two scheduled jobs run nightly. Both are implemented using NestJS \@Cron
and run inside the transaction-service process. They do not require a
separate worker.

## **7.1 Overdue Invoice Escalation**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  Schedule           0 1 \* \* \* (1:00 AM UTC daily)

  Purpose            Find all invoices where due_date \< today and status
                     NOT IN (paid, partially_paid, cancelled) and update
                     their status to overdue

  Why Nightly        The read-time CASE expression in GET /v1/invoices
                     catches overdue invoices in API responses
                     immediately. The nightly job ensures the database
                     status column reflects reality for reporting,
                     exports, and any direct DB queries by the analytics
                     team.

  On Failure         Log error at error level \-- job failure does not
                     affect the read-time override. Alert fires if two
                     consecutive nightly runs fail.

  Metric             txn_overdue_invoices_updated_total incremented by
                     count of updated rows
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **src/services/scheduler.service.ts**                                 |
+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { Cron, CronExpression } from \'@nestjs/schedule\';            |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, LessThan, Not, In } from \'typeorm\';            |
|                                                                       |
| import { Invoice } from \'../entities/invoice.entity\';               |
|                                                                       |
| import { InvoiceStatus } from \'../entities/enums\';                  |
|                                                                       |
| import { MetricsService } from \'./metrics.service\';                 |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class SchedulerService {                                       |
|                                                                       |
| private readonly logger = new Logger(\'SchedulerService\');           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Invoice) private readonly invoiceRepo:             |
| Repository\<Invoice\>,                                                |
|                                                                       |
| private readonly metrics: MetricsService,                             |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@Cron(\'0 1 \* \* \*\', { name: \'overdue-invoice-escalation\',      |
| timeZone: \'UTC\' })                                                  |
|                                                                       |
| async escalateOverdueInvoices(): Promise\<void\> {                    |
|                                                                       |
| const start = Date.now();                                             |
|                                                                       |
| this.logger.log(\'Overdue invoice escalation started\');              |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const today = new Date();                                             |
|                                                                       |
| today.setHours(0, 0, 0, 0);                                           |
|                                                                       |
| const result = await this.invoiceRepo.update(                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| dueDate: LessThan(today),                                             |
|                                                                       |
| status: Not(In(\[InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID,    |
| InvoiceStatus.CANCELLED\])),                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| { status: InvoiceStatus.OVERDUE, updatedAt: new Date() }              |
|                                                                       |
| );                                                                    |
|                                                                       |
| const count = result.affected ?? 0;                                   |
|                                                                       |
| this.metrics.overdueInvoicesTotal.inc(count);                         |
|                                                                       |
| this.logger.log(\'Overdue invoice escalation completed\', {           |
|                                                                       |
| invoicesUpdated: count,                                               |
|                                                                       |
| durationMs: Date.now() - start,                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\'Overdue invoice escalation failed\', { error:     |
| String(err) });                                                       |
|                                                                       |
| // Job failure is non-fatal \-- read-time override still works        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.2 DLQ Depth Poller**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  Schedule           Every 60 seconds

  Purpose            Poll the RabbitMQ management API for the depth of
                     each dead-letter queue and update the txn_dlq_depth
                     gauge. Prometheus scrapes the gauge every 30
                     seconds.

  Why Polled         Prometheus cannot scrape RabbitMQ queue depths
                     directly. The service polls and exposes the value as
                     a gauge so Prometheus can alert on it.

  On Failure         Log warn \-- poller failure does not impact the
                     service. DLQ depth gauge retains its last known
                     value until the next successful poll.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **SchedulerService \-- DLQ depth poller**                             |
+-----------------------------------------------------------------------+
| // In SchedulerService \-- polled every 60s                           |
|                                                                       |
| \@Cron(\'\*/1 \* \* \* \*\', { name: \'dlq-depth-poller\' })          |
|                                                                       |
| async pollDlqDepths(): Promise\<void\> {                              |
|                                                                       |
| const queues = \[                                                     |
|                                                                       |
| \'txn-svc.billing.events.dlq\',                                       |
|                                                                       |
| \'txn-svc.timetracking.events.dlq\',                                  |
|                                                                       |
| \'txn-svc.payout.events.dlq\',                                        |
|                                                                       |
| \];                                                                   |
|                                                                       |
| for (const queue of queues) {                                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // RabbitMQ Management HTTP API                                       |
|                                                                       |
| const url = this.config.get(\'RABBITMQ_MANAGEMENT_URL\') +            |
| \'/api/queues/%2F/\' + queue;                                         |
|                                                                       |
| const res = await fetch(url, {                                        |
|                                                                       |
| headers: { Authorization: \'Basic \' + Buffer.from(                   |
|                                                                       |
| this.config.get(\'RABBITMQ_USER\') + \':\' +                          |
| this.config.get(\'RABBITMQ_PASSWORD\')                                |
|                                                                       |
| ).toString(\'base64\') }                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| const data = await res.json();                                        |
|                                                                       |
| this.metrics.dlqDepth.set({ queue }, data.messages ?? 0);             |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\'DLQ depth poll failed for \' + queue, { error:     |
| String(err) });                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Logging Configuration & Log Levels**

  --------------------------------------------------------------------
  **Environment**    **Log Level** **Debug Logs**   **Stack Traces in
                                                    HTTP Errors**
  ------------------ ------------- ---------------- ------------------
  production         info          Suppressed       Suppressed \--
                                                    error message only

  staging            info          Suppressed       Included

  development        debug         Included         Included
  --------------------------------------------------------------------

Log volume estimate at info level in production: approximately 500-800
log lines per minute at steady state with normal transaction volume.
Each line is approximately 400-600 bytes. This is well within standard
log aggregator free tier limits.

+-----------------------------------------------------------------------+
| **Never Log PII or Payment Data**                                     |
|                                                                       |
| Logs must never contain full card numbers, bank account numbers,      |
| CVVs, SSNs, or passwords. The paymentMethodIdentifier field (last 4   |
| digits) is safe to log. The full identifier is never available to     |
| this service \-- it is masked at the billing-service level before the |
| event is published. Audit any new log statements before merging.      |
+=======================================================================+

# **9. Runbook Quick Reference**

Common failure scenarios and first-response actions for on-call
engineers.

  ---------------------------------------------------------------------------------
  **Symptom**   **Likely Cause**  **First Action**                **Escalate If**
  ------------- ----------------- ------------------------------- -----------------
  DLQ alert     Consumer threw    1\. Check error logs for the    DLQ depth exceeds
  fires         unhandled         consumer class. 2. Inspect the  10 or grows for
                exception \--     DLQ message payload via         more than 30
                typically a DB    RabbitMQ management UI. 3. Fix  minutes
                constraint        the root cause. 4. Re-publish   
                violation or      the message from the DLQ to the 
                malformed payload source queue.                   

  Payment       Stripe outage,    1\. Check Stripe status page.   Failure rate
  failure rate  surge of card     2. Review                       stays above 5%
  alert         declines, or      billing.payment.failed event    for more than 10
                billing-service   payloads in DLQ for             minutes
                publishing        failureReason field. 3. Check   
                incorrect amounts billing-service logs for Stripe 
                                  API errors.                     

  /ready        DB connection     1\. Check DB pool settings \--  DB unreachable
  returns 503   pool exhausted,   default max 10 connections. 2.  for more than 2
  on database   Supabase          Check Supabase dashboard for    minutes
  check         connection limit  active connections. 3. Restart  
                reached, or       the service to recycle          
                network partition connections if needed.          

  Consumer      RabbitMQ          1\. Check /ready for RabbitMQ   Zero consumption
  messages      connection lost,  status. 2. Check RABBITMQ_URL   for more than 5
  total rate    wrong             environment variable. 3. Check  minutes
  drops to zero RABBITMQ_URL, or  RabbitMQ management UI for      
                queue deleted     queue existence.                

  High HTTP p99 Redis unavailable 1\. Check txn_cache_hits_total  p99 stays above 5
  latency alert (cache misses     vs txn_cache_misses_total       seconds for more
                hitting DB), slow ratio. 2. Check                 than 5 minutes
                DB query, or      txn_db_query_duration_seconds   
                missing index     for slow queries. 3. Check      
                                  /ready Redis status.            
  ---------------------------------------------------------------------------------

# **10. Next Steps**

  -----------------------------------------------------------------------------
  **Document**   **Title**          **What It Covers**
  -------------- ------------------ -------------------------------------------
  Doc 07         QA & Test Data     Integration test cases for all 11 consumer
                                    events. Unit tests for the filter,
                                    pagination, and serialization logic. Seed
                                    scripts for all transaction types and
                                    status combinations. Postman collection for
                                    all 7 HTTP endpoints. Local consumer
                                    simulation for testing RabbitMQ flows
                                    without a live broker.

  -----------------------------------------------------------------------------
