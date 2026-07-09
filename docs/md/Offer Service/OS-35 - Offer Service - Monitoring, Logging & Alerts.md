**OS-35**

**Offer Service --- Monitoring, Logging & Alerts**

**Log format:** Structured JSON (stdout) **Masking:** JWT • secrets •
PII **Health:** GET /health • GET /ready

This document defines the complete observability stack for
offer-service: structured log schema with sensitive-field masking, the
HTTP request logger interceptor, health check endpoints for K8s liveness
and readiness probes, every metric to track, alert thresholds with
P1/P2/P3 severity levels, and the on-call escalation runbook.

**File Map**

  ---------- ------------------------------------------------------- ----------------------
  **Step**   **File Path**                                           **Purpose**

  **1**      src/common/logger/offer-logger.service.ts               Structured JSON logger
                                                                     with SENSITIVE_KEYS
                                                                     masking

  **2**      src/common/interceptors/request-logger.interceptor.ts   Per-request log:
                                                                     method, path, status,
                                                                     durationMs, userId

  **3**      src/health/health.service.ts                            DB • RabbitMQ • Ably •
                                                                     Redis readiness checks

  **4**      src/health/health.controller.ts                         GET /health (liveness)
                                                                     and GET /ready
                                                                     (readiness)

  **5**      src/health/health.module.ts                             HealthModule wiring

  **6**      src/app.module.ts (update)                              Register global
                                                                     interceptor and
                                                                     HealthModule

  **7**      (reference)                                             All metrics: what to
                                                                     track, how, and SQL
                                                                     queries for dashboards

  **8**      (reference)                                             Alert thresholds table
                                                                     --- P1/P2/P3 with
                                                                     response actions

  **9**      (reference)                                             On-call escalation
                                                                     runbook for every P1
                                                                     scenario
  ---------- ------------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Step 1 OfferLoggerService --- offer-logger.service.ts**             |
|                                                                       |
| Structured JSON logs with automatic sensitive-field masking           |
+-----------------------------------------------------------------------+

All log output from offer-service is newline-delimited JSON written to
stdout. Log aggregators (DataDog, CloudWatch Logs, Grafana Loki) ingest
from stdout without any agent configuration. Every line contains a fixed
set of fields that enables filtering and alerting on specific field
values.

+-----------------------------------------------------------------------+
| NEVER log these fields --- they are automatically redacted by         |
| maskSensitive():                                                      |
|                                                                       |
| Authorization, X-Internal-Secret (contains JWT / shared secret)       |
|                                                                       |
| ABLY_API_KEY, JWT_SECRET, DB_PASSWORD, INTERNAL_SERVICE_SECRET (env   |
| secrets)                                                              |
|                                                                       |
| declinedReason (may contain personal information from talent)         |
|                                                                       |
| password, token, apiKey, secret, credit_card, ssn (any field name)    |
|                                                                       |
| If you add a new field that contains sensitive data: add its key to   |
| SENSITIVE_KEYS.                                                       |
|                                                                       |
| The masker is recursive --- it catches nested fields at any depth.    |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/logger/offer-logger.service.ts**

  -----------------------------------------------------------------------

+----------------------------------------------------------------------------+
| import { Injectable, LoggerService } from \'@nestjs/common\';              |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // Sensitive field registry --- add any new sensitive key here             |
|                                                                            |
| // ============================================================            |
|                                                                            |
| const SENSITIVE_KEYS = new Set(\[                                          |
|                                                                            |
| \'password\', \'PASSWORD\',                                                |
|                                                                            |
| \'secret\', \'SECRET\',                                                    |
|                                                                            |
| \'token\', \'TOKEN\',                                                      |
|                                                                            |
| \'apiKey\', \'api_key\', \'ABLY_API_KEY\',                                 |
|                                                                            |
| \'authorization\', \'Authorization\',                                      |
|                                                                            |
| \'x-internal-secret\', \'X-Internal-Secret\', \'INTERNAL_SERVICE_SECRET\', |
|                                                                            |
| \'JWT_SECRET\', \'DB_PASSWORD\',                                           |
|                                                                            |
| \'declinedReason\', \'declined_reason\',                                   |
|                                                                            |
| \'credit_card\', \'card_number\', \'ssn\', \'routing_number\',             |
|                                                                            |
| \'privateKey\', \'private_key\',                                           |
|                                                                            |
| \]);                                                                       |
|                                                                            |
| /\*\*                                                                      |
|                                                                            |
| \* maskSensitive()                                                         |
|                                                                            |
| \*                                                                         |
|                                                                            |
| \* Recursively walks any object and replaces the value of any key          |
|                                                                            |
| \* that appears in SENSITIVE_KEYS with the string \"\[REDACTED\]\".        |
|                                                                            |
| \*                                                                         |
|                                                                            |
| \* \@param obj Any value (object, array, primitive)                        |
|                                                                            |
| \* \@param depth Internal recursion depth guard (max 5)                    |
|                                                                            |
| \*/                                                                        |
|                                                                            |
| export function maskSensitive(obj: unknown, depth = 0): unknown {          |
|                                                                            |
| if (depth \> 5 \|\| obj === null \|\| obj === undefined) return obj;       |
|                                                                            |
| if (typeof obj !== \'object\') return obj;                                 |
|                                                                            |
| if (Array.isArray(obj)) return obj.map(v =\> maskSensitive(v, depth + 1)); |
|                                                                            |
| const masked: Record\<string, unknown\> = {};                              |
|                                                                            |
| for (const \[key, value\] of Object.entries(obj as Record\<string,         |
| unknown\>)) {                                                              |
|                                                                            |
| masked\[key\] = SENSITIVE_KEYS.has(key) \|\|                               |
| SENSITIVE_KEYS.has(key.toLowerCase())                                      |
|                                                                            |
| ? \'\[REDACTED\]\'                                                         |
|                                                                            |
| : maskSensitive(value, depth + 1);                                         |
|                                                                            |
| }                                                                          |
|                                                                            |
| return masked;                                                             |
|                                                                            |
| }                                                                          |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // Log entry schema (every line contains these fields)                     |
|                                                                            |
| // ============================================================            |
|                                                                            |
| interface LogEntry {                                                       |
|                                                                            |
| timestamp: string; // ISO 8601 UTC: \"2025-02-01T14:30:00.000Z\"           |
|                                                                            |
| level: \'error\' \| \'warn\' \| \'info\' \| \'debug\' \| \'verbose\';      |
|                                                                            |
| service: \'offer-service\';                                                |
|                                                                            |
| context: string; // Class name: \"OffersService\", \"ExpiryProcessor\"     |
|                                                                            |
| message: string; // Human-readable description                             |
|                                                                            |
| // Optional structured fields (added via logWithData):                     |
|                                                                            |
| offerId?: string;                                                          |
|                                                                            |
| requestId?: string;                                                        |
|                                                                            |
| userId?: string;                                                           |
|                                                                            |
| eventType?: string;                                                        |
|                                                                            |
| durationMs?: number;                                                       |
|                                                                            |
| retryCount?: number;                                                       |
|                                                                            |
| \[key: string\]: unknown; // Any additional structured fields              |
|                                                                            |
| }                                                                          |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // OfferLoggerService                                                      |
|                                                                            |
| // ============================================================            |
|                                                                            |
| /\*\*                                                                      |
|                                                                            |
| \* OfferLoggerService implements NestJS LoggerService.                     |
|                                                                            |
| \* Inject it in AppModule as the global logger.                            |
|                                                                            |
| \*                                                                         |
|                                                                            |
| \* Every log line is a JSON object written to stdout.                      |
|                                                                            |
| \* Sensitive fields are automatically redacted.                            |
|                                                                            |
| \*                                                                         |
|                                                                            |
| \* Usage:                                                                  |
|                                                                            |
| \* this.logger.log(\'Offer accepted\', \'OffersService\', { offerId,       |
| userId });                                                                 |
|                                                                            |
| \* this.logger.error(\'DB query failed\', err.stack, \'OffersService\');   |
|                                                                            |
| \*/                                                                        |
|                                                                            |
| \@Injectable()                                                             |
|                                                                            |
| export class OfferLoggerService implements LoggerService {                 |
|                                                                            |
| private readonly SERVICE = \'offer-service\' as const;                     |
|                                                                            |
| private write(                                                             |
|                                                                            |
| level: \'error\' \| \'warn\' \| \'info\' \| \'debug\' \| \'verbose\',      |
|                                                                            |
| message: string,                                                           |
|                                                                            |
| context?: string,                                                          |
|                                                                            |
| extra?: Record\<string, unknown\>,                                         |
|                                                                            |
| ): void {                                                                  |
|                                                                            |
| const entry: LogEntry = {                                                  |
|                                                                            |
| timestamp: new Date().toISOString(),                                       |
|                                                                            |
| level,                                                                     |
|                                                                            |
| service: this.SERVICE,                                                     |
|                                                                            |
| context: context ?? \'App\',                                               |
|                                                                            |
| message,                                                                   |
|                                                                            |
| \...(extra ? maskSensitive(extra) as Record\<string, unknown\> : {}),      |
|                                                                            |
| };                                                                         |
|                                                                            |
| // Newline-delimited JSON to stdout.                                       |
|                                                                            |
| // Docker/K8s captures this and forwards to the log aggregator.            |
|                                                                            |
| process.stdout.write(JSON.stringify(entry) + \'\\n\');                     |
|                                                                            |
| }                                                                          |
|                                                                            |
| // NestJS LoggerService interface implementation:                          |
|                                                                            |
| log (message: string, context?: string): void { this.write(\'info\',       |
| message, context); }                                                       |
|                                                                            |
| error (message: string, trace?: string, context?: string): void {          |
| this.write(\'error\', message, context, { trace }); }                      |
|                                                                            |
| warn (message: string, context?: string): void { this.write(\'warn\',      |
| message, context); }                                                       |
|                                                                            |
| debug (message: string, context?: string): void { this.write(\'debug\',    |
| message, context); }                                                       |
|                                                                            |
| verbose(message: string, context?: string): void { this.write(\'verbose\', |
| message, context); }                                                       |
|                                                                            |
| /\*\*                                                                      |
|                                                                            |
| \* logWithData() --- Structured log with additional typed fields.          |
|                                                                            |
| \* Use this everywhere in service methods instead of plain log().          |
|                                                                            |
| \*                                                                         |
|                                                                            |
| \* \@example                                                               |
|                                                                            |
| \* this.logger.logWithData(\'info\', \'Offer accepted\',                   |
| \'OffersService\', {                                                       |
|                                                                            |
| \* offerId: offer.id, userId: requesterId,                                 |
|                                                                            |
| \* });                                                                     |
|                                                                            |
| \*/                                                                        |
|                                                                            |
| logWithData(                                                               |
|                                                                            |
| level: \'error\' \| \'warn\' \| \'info\' \| \'debug\',                     |
|                                                                            |
| message: string,                                                           |
|                                                                            |
| context: string,                                                           |
|                                                                            |
| data: Record\<string, unknown\>,                                           |
|                                                                            |
| ): void {                                                                  |
|                                                                            |
| this.write(level, message, context, data);                                 |
|                                                                            |
| }                                                                          |
|                                                                            |
| }                                                                          |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // Register as the global NestJS logger in main.ts:                        |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // import { OfferLoggerService } from                                      |
| \'./common/logger/offer-logger.service\';                                  |
|                                                                            |
| // async function bootstrap() {                                            |
|                                                                            |
| // const app = await NestFactory.create(AppModule, { bufferLogs: true });  |
|                                                                            |
| // app.useLogger(app.get(OfferLoggerService));                             |
|                                                                            |
| // await app.listen(process.env.PORT ?? 3005);                             |
|                                                                            |
| // }                                                                       |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // Example log output (pretty-printed for readability):                    |
|                                                                            |
| // ============================================================            |
|                                                                            |
| // Offer accepted:                                                         |
|                                                                            |
| // {\"timestamp\":\"2025-02-01T14:30:00.123Z\",\"level\":\"info\",         |
|                                                                            |
| // \"service\":\"offer-service\",\"context\":\"OffersService\",            |
|                                                                            |
| // \"message\":\"Offer                                                     |
| accepted\",\"offerId\":\"f47ac10b-\...\",\"userId\":\"20000000-\...\"}     |
|                                                                            |
| // Authorization header redacted:                                          |
|                                                                            |
| //                                                                         |
| {\"timestamp\":\"\...\",\"level\":\"info\",\"service\":\"offer-service\",  |
|                                                                            |
| // \"context\":\"RequestLoggerInterceptor\",                               |
|                                                                            |
| // \"message\":\"POST /v1/offers 201 95ms\",                               |
|                                                                            |
| // \"authorization\":\"\[REDACTED\]\"}                                     |
|                                                                            |
| // Outbox FAILED:                                                          |
|                                                                            |
| //                                                                         |
| {\"timestamp\":\"\...\",\"level\":\"error\",\"service\":\"offer-service\", |
|                                                                            |
| // \"context\":\"OutboxProcessor\",                                        |
|                                                                            |
| // \"message\":\"OUTBOX FAILED after 10 retries\",                         |
|                                                                            |
| //                                                                         |
| \"eventType\":\"offer.accepted\",\"outboxId\":\"\...\",\"retryCount\":10}  |
+----------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 RequestLoggerInterceptor --- request-logger.interceptor.ts** |
|                                                                       |
| Logs every HTTP request and response with duration                    |
+-----------------------------------------------------------------------+

The interceptor wraps every controller handler and logs the method,
path, status code, and duration in milliseconds. 5xx errors are logged
at error level (triggers alerts). 4xx client errors are logged at warn
level. Request bodies are never logged.

  ----------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/common/interceptors/request-logger.interceptor.ts**

  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Injectable, NestInterceptor, ExecutionContext,                        |
|                                                                       |
| CallHandler, Logger,                                                  |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { Observable } from \'rxjs\';                                  |
|                                                                       |
| import { tap, catchError } from \'rxjs/operators\';                   |
|                                                                       |
| import { throwError } from \'rxjs\';                                  |
|                                                                       |
| import type { Request, Response } from \'express\';                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class RequestLoggerInterceptor implements NestInterceptor {    |
|                                                                       |
| private readonly logger = new Logger(RequestLoggerInterceptor.name);  |
|                                                                       |
| intercept(context: ExecutionContext, next: CallHandler):              |
| Observable\<unknown\> {                                               |
|                                                                       |
| const req: Request = context.switchToHttp().getRequest();             |
|                                                                       |
| const res: Response = context.switchToHttp().getResponse();           |
|                                                                       |
| const startMs = Date.now();                                           |
|                                                                       |
| // Extract safe metadata from the request --- NEVER log body or auth  |
| header.                                                               |
|                                                                       |
| const method = req.method;                                            |
|                                                                       |
| const path = req.url.split(\'?\')\[0\]; // Strip query params         |
|                                                                       |
| const requestId = (req.headers\[\'x-request-id\'\] as string) ??      |
| crypto.randomUUID();                                                  |
|                                                                       |
| const userId = (req as any).user?.sub ?? \'anonymous\';               |
|                                                                       |
| // Log idempotency key prefix only (first 8 chars) for tracing        |
| duplicate requests.                                                   |
|                                                                       |
| const idempKeyRaw = req.headers\[\'x-idempotency-key\'\] as string \| |
| undefined;                                                            |
|                                                                       |
| const idempPrefix = idempKeyRaw ? idempKeyRaw.substring(0, 8) +       |
| \'\...\' : undefined;                                                 |
|                                                                       |
| return next.handle().pipe(                                            |
|                                                                       |
| tap(() =\> {                                                          |
|                                                                       |
| const ms = Date.now() - startMs;                                      |
|                                                                       |
| const status = res.statusCode;                                        |
|                                                                       |
| // All successful responses at info level.                            |
|                                                                       |
| this.logger.log(                                                      |
|                                                                       |
| \`\${method} \${path} \${status} \${ms}ms\` +                         |
|                                                                       |
| (idempPrefix ? \` idem=\${idempPrefix}\` : \'\'),                     |
|                                                                       |
| RequestLoggerInterceptor.name,                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| catchError((err: unknown) =\> {                                       |
|                                                                       |
| const ms = Date.now() - startMs;                                      |
|                                                                       |
| const status = (err as any)?.statusCode ?? (err as any)?.status ??    |
| 500;                                                                  |
|                                                                       |
| const errorCode = (err as any)?.errorCode ?? \'UNKNOWN\';             |
|                                                                       |
| const logLine = \`\${method} \${path} \${status} \${ms}ms\` +         |
|                                                                       |
| \` errorCode=\${errorCode}\` +                                        |
|                                                                       |
| (idempPrefix ? \` idem=\${idempPrefix}\` : \'\') +                    |
|                                                                       |
| \` requestId=\${requestId} userId=\${userId}\`;                       |
|                                                                       |
| if (status \>= 500) {                                                 |
|                                                                       |
| this.logger.error(logLine, (err as Error).stack,                      |
| RequestLoggerInterceptor.name);                                       |
|                                                                       |
| } else if (status \>= 400) {                                          |
|                                                                       |
| // 4xx: expected client errors. Warn level --- do NOT page on these.  |
|                                                                       |
| this.logger.warn(logLine, RequestLoggerInterceptor.name);             |
|                                                                       |
| }                                                                     |
|                                                                       |
| return throwError(() =\> err);                                        |
|                                                                       |
| }),                                                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 HealthService --- health.service.ts**                        |
|                                                                       |
| Checks DB, RabbitMQ, Ably, Redis                                      |
+-----------------------------------------------------------------------+

HealthService performs four dependency checks. DB and RabbitMQ are
critical --- their failure causes /ready to return 503 and stops load
balancer traffic. Ably is non-critical --- its failure causes a degraded
state (status=degraded) but does NOT stop traffic. Redis failure is
treated as critical because the idempotency layer depends on it.

+-----------------------------------------------------------------------+
| /health vs /ready --- the two probes serve different purposes:        |
|                                                                       |
| GET /health (liveness probe):                                         |
|                                                                       |
| Is the NestJS process alive?                                          |
|                                                                       |
| Returns 200 as long as the process is running.                        |
|                                                                       |
| Used by K8s to decide whether to RESTART the container.               |
|                                                                       |
| Never returns 5xx (if the process is dead, there is no response at    |
| all).                                                                 |
|                                                                       |
| GET /ready (readiness probe):                                         |
|                                                                       |
| Is this instance ready to handle traffic?                             |
|                                                                       |
| Returns 200 when all critical dependencies are reachable.             |
|                                                                       |
| Returns 503 when DB, RabbitMQ, or Redis is unreachable.               |
|                                                                       |
| Returns 200 with status=degraded when only Ably is unreachable.       |
|                                                                       |
| Used by K8s to decide whether to ROUTE TRAFFIC to this instance.      |
|                                                                       |
| When /ready returns 503: K8s removes the pod from the service         |
| endpoints.                                                            |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/health/health.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger, Inject } from \'@nestjs/common\';        |
|                                                                       |
| import { InjectDataSource } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { RabbitMQPublisher } from                                     |
| \'../messaging/rabbitmq.publisher\';                                  |
|                                                                       |
| import { AblyService } from \'../realtime/ably.service\';             |
|                                                                       |
| import { REDIS_CLIENT } from \'../redis/redis.constants\';            |
|                                                                       |
| import type Redis from \'ioredis\';                                   |
|                                                                       |
| export interface DependencyChecks {                                   |
|                                                                       |
| db: \'connected\' \| \'disconnected\';                                |
|                                                                       |
| rabbitmq: \'connected\' \| \'disconnected\';                          |
|                                                                       |
| ably: \'connected\' \| \'degraded\';                                  |
|                                                                       |
| redis: \'connected\' \| \'disconnected\';                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface ReadinessStatus {                                    |
|                                                                       |
| status: \'ok\' \| \'degraded\' \| \'error\';                          |
|                                                                       |
| uptime: number;                                                       |
|                                                                       |
| timestamp: string;                                                    |
|                                                                       |
| version: string;                                                      |
|                                                                       |
| checks: DependencyChecks;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class HealthService {                                          |
|                                                                       |
| private readonly logger = new Logger(HealthService.name);             |
|                                                                       |
| private readonly version = process.env.APP_VERSION ?? \'dev\';        |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectDataSource() private readonly ds: DataSource,                 |
|                                                                       |
| private readonly publisher: RabbitMQPublisher,                        |
|                                                                       |
| private readonly ably: AblyService,                                   |
|                                                                       |
| \@Inject(REDIS_CLIENT) private readonly redis: Redis,                 |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| /\*\* Always returns true. Used by GET /health. \*/                   |
|                                                                       |
| isAlive(): true { return true; }                                      |
|                                                                       |
| /\*\* Checks all four dependencies. Used by GET /ready. \*/           |
|                                                                       |
| async getReadinessStatus(): Promise\<ReadinessStatus\> {              |
|                                                                       |
| const \[dbOk, rmqOk, ablyOk, redisOk\] = await Promise.allSettled(\[  |
|                                                                       |
| this.checkDb(),                                                       |
|                                                                       |
| Promise.resolve(this.checkRabbitMQ()),                                |
|                                                                       |
| this.checkAbly(),                                                     |
|                                                                       |
| this.checkRedis(),                                                    |
|                                                                       |
| \]).then(results =\> results.map(                                     |
|                                                                       |
| r =\> r.status === \'fulfilled\' ? r.value : false                    |
|                                                                       |
| ));                                                                   |
|                                                                       |
| const criticalOk = dbOk && rmqOk && redisOk;                          |
|                                                                       |
| const status: ReadinessStatus\[\'status\'\] =                         |
|                                                                       |
| !criticalOk ? \'error\' : !ablyOk ? \'degraded\' : \'ok\';            |
|                                                                       |
| return {                                                              |
|                                                                       |
| status,                                                               |
|                                                                       |
| uptime: Math.floor(process.uptime()),                                 |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| version: this.version,                                                |
|                                                                       |
| checks: {                                                             |
|                                                                       |
| db: dbOk ? \'connected\' : \'disconnected\',                          |
|                                                                       |
| rabbitmq: rmqOk ? \'connected\' : \'disconnected\',                   |
|                                                                       |
| ably: ablyOk ? \'connected\' : \'degraded\',                          |
|                                                                       |
| redis: redisOk ? \'connected\' : \'disconnected\',                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkDb(): Promise\<boolean\> {                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.ds.query(\'SELECT 1\');                                    |
|                                                                       |
| return true;                                                          |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\'DB health check failed\', (err as                 |
| Error).message);                                                      |
|                                                                       |
| return false;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private checkRabbitMQ(): boolean {                                    |
|                                                                       |
| // RabbitMQPublisher.isReady() reflects the current AMQP connection   |
| state.                                                                |
|                                                                       |
| return this.publisher.isReady();                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkAbly(): Promise\<boolean\> {                       |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await this.ably.isReady();                                     |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return false;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async checkRedis(): Promise\<boolean\> {                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const pong = await this.redis.ping();                                 |
|                                                                       |
| return pong === \'PONG\';                                             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return false;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 HealthController --- health.controller.ts**                  |
|                                                                       |
| /health and /ready HTTP endpoints                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/health/health.controller.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Controller, Get, HttpCode, HttpStatus, HttpException,                 |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { HealthService, ReadinessStatus } from \'./health.service\';  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* HealthController --- No auth required on either endpoint.          |
|                                                                       |
| \* Both endpoints are excluded from JwtAuthGuard via \@Public()       |
| decorator.                                                            |
|                                                                       |
| \* They must be reachable from the K8s probe without a JWT token.     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* NOTE: The \@Public() decorator is defined in                       |
| src/auth/decorators/public.decorator.ts.                              |
|                                                                       |
| \* It sets a metadata flag that JwtAuthGuard checks before enforcing  |
| auth.                                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Controller(\'\')                                                    |
|                                                                       |
| export class HealthController {                                       |
|                                                                       |
| constructor(private readonly healthService: HealthService) {}         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* GET /health --- Liveness probe.                                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns 200 if the NestJS process is running.                      |
|                                                                       |
| \* This endpoint NEVER returns 5xx. It has no external dependencies.  |
|                                                                       |
| \* K8s restarts the pod only when this endpoint becomes unreachable.  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* K8s config (deployment.yaml):                                      |
|                                                                       |
| \* livenessProbe:                                                     |
|                                                                       |
| \* httpGet: { path: /health, port: 3005 }                             |
|                                                                       |
| \* initialDelaySeconds: 10                                            |
|                                                                       |
| \* periodSeconds: 30                                                  |
|                                                                       |
| \* failureThreshold: 3                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Get(\'health\')                                                     |
|                                                                       |
| \@HttpCode(HttpStatus.OK)                                             |
|                                                                       |
| health(): { status: string; timestamp: string } {                     |
|                                                                       |
| return { status: \'ok\', timestamp: new Date().toISOString() };       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* GET /ready --- Readiness probe.                                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns 200 { status: \"ok\" \| \"degraded\" } when the service    |
| can handle traffic.                                                   |
|                                                                       |
| \* Returns 503 when DB, RabbitMQ, or Redis is unreachable.            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* K8s config (deployment.yaml):                                      |
|                                                                       |
| \* readinessProbe:                                                    |
|                                                                       |
| \* httpGet: { path: /ready, port: 3005 }                              |
|                                                                       |
| \* initialDelaySeconds: 15                                            |
|                                                                       |
| \* periodSeconds: 10                                                  |
|                                                                       |
| \* failureThreshold: 2                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Load balancer annotation (AWS ALB):                                |
|                                                                       |
| \* alb.ingress.kubernetes.io/healthcheck-path: /ready                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Get(\'ready\')                                                      |
|                                                                       |
| async ready(): Promise\<ReadinessStatus\> {                           |
|                                                                       |
| const result = await this.healthService.getReadinessStatus();         |
|                                                                       |
| if (result.status === \'error\') {                                    |
|                                                                       |
| throw new HttpException(                                              |
|                                                                       |
| result,                                                               |
|                                                                       |
| HttpStatus.SERVICE_UNAVAILABLE, // 503                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return result;                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Expected /ready responses:                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // All healthy:                                                       |
|                                                                       |
| // 200 { \"status\": \"ok\", \"uptime\": 3601, \"version\":           |
| \"1.2.3\",                                                            |
|                                                                       |
| // \"checks\": { \"db\":\"connected\",\"rabbitmq\":\"connected\",     |
|                                                                       |
| // \"ably\":\"connected\",\"redis\":\"connected\" } }                 |
|                                                                       |
| // Ably down only (non-critical):                                     |
|                                                                       |
| // 200 { \"status\": \"degraded\", \"checks\": { \"ably\":            |
| \"degraded\" } }                                                      |
|                                                                       |
| // DB or RabbitMQ down:                                               |
|                                                                       |
| // 503 { \"status\": \"error\", \"checks\": { \"db\":                 |
| \"disconnected\" } }                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 HealthModule --- health.module.ts**                          |
|                                                                       |
| Register HealthService and HealthController                           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/health/health.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { HealthService } from \'./health.service\';                   |
|                                                                       |
| import { HealthController } from \'./health.controller\';             |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| providers: \[HealthService\],                                         |
|                                                                       |
| controllers: \[HealthController\],                                    |
|                                                                       |
| exports: \[HealthService\],                                           |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class HealthModule {}                                          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 AppModule & main.ts Updates**                                |
|                                                                       |
| Wire the global logger, interceptor, and HealthModule                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/main.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { AppModule } from \'./app.module\';                           |
|                                                                       |
| import { OfferLoggerService } from                                    |
| \'./common/logger/offer-logger.service\';                             |
|                                                                       |
| import { RequestLoggerInterceptor } from                              |
| \'./common/interceptors/request-logger.interceptor\';                 |
|                                                                       |
| import { OfferExceptionFilter } from                                  |
| \'./common/filters/offer-exception.filter\';                          |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const app = await NestFactory.create(AppModule, {                     |
|                                                                       |
| // Buffer logs until the custom logger is attached.                   |
|                                                                       |
| // Without bufferLogs: true, early startup logs use the default       |
| NestJS logger.                                                        |
|                                                                       |
| bufferLogs: true,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 1. Attach the structured JSON logger as the global NestJS logger.  |
|                                                                       |
| app.useLogger(app.get(OfferLoggerService));                           |
|                                                                       |
| // 2. Global request/response logger (logs every HTTP call).          |
|                                                                       |
| app.useGlobalInterceptors(new RequestLoggerInterceptor());            |
|                                                                       |
| // 3. Global exception filter (maps exceptions to structured HTTP     |
| responses).                                                           |
|                                                                       |
| app.useGlobalFilters(new OfferExceptionFilter());                     |
|                                                                       |
| // 4. API prefix.                                                     |
|                                                                       |
| app.setGlobalPrefix(\'v1\');                                          |
|                                                                       |
| const port = parseInt(process.env.PORT ?? \'3005\', 10);              |
|                                                                       |
| await app.listen(port);                                               |
|                                                                       |
| // Log startup with structured fields.                                |
|                                                                       |
| app.get(OfferLoggerService).logWithData(                              |
|                                                                       |
| \'info\',                                                             |
|                                                                       |
| \`offer-service listening on port \${port}\`,                         |
|                                                                       |
| \'Bootstrap\',                                                        |
|                                                                       |
| { port, version: process.env.APP_VERSION ?? \'dev\', nodeEnv:         |
| process.env.NODE_ENV },                                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| bootstrap().catch(err =\> {                                           |
|                                                                       |
| process.stderr.write(JSON.stringify({                                 |
|                                                                       |
| timestamp: new Date().toISOString(), level: \'error\',                |
|                                                                       |
| service: \'offer-service\', message: \'Bootstrap failed\',            |
|                                                                       |
| error: String(err),                                                   |
|                                                                       |
| }) + \'\\n\');                                                        |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts --- add these two
  imports**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferLoggerService } from                                    |
| \'./common/logger/offer-logger.service\';                             |
|                                                                       |
| import { HealthModule } from \'./health/health.module\';              |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // \... existing modules \...                                         |
|                                                                       |
| HealthModule, // \<\-- ADD                                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| // \... existing providers \...                                       |
|                                                                       |
| OfferLoggerService, // \<\-- ADD (make injectable globally)           |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[OfferLoggerService\],                                      |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 (Reference) All Metrics to Track**                           |
|                                                                       |
| What to collect, how to collect it, and SQL for dashboards            |
+-----------------------------------------------------------------------+

**Log-derived metrics (parsed from JSON stdout)**

  ------------------- ----------------------------------------- -------------------------------------
  **Metric**          **Log field / filter**                    **Dashboard query**

  API requests / min  message matches \"GET\|POST\|PATCH\"      Count log lines per path per minute

  API p95 latency     durationMs in request log                 p95 of durationMs grouped by path
  (ms)                                                          

  5xx error rate (%)  status \>= 500 in request log             (5xx count / total count) \* 100 per
                                                                minute

  409 CAS rate        errorCode=OFFER_CONCURRENT_MODIFICATION   Count per minute --- spike = heavy
                                                                concurrent load

  Active offer        eventType=offer.created in outbox         Count outbox rows with this eventType
  created / min                                                 per min

  Offer accepted /    eventType=offer.accepted in outbox        Count per minute --- business health
  min                                                           indicator

  CO submitted / min  eventType=offer.countered in outbox       Count per minute

  Offer expired / min eventType=offer.expired in outbox         Count per minute from ExpiryProcessor

  Outbox FAILED       level=error AND \"OUTBOX FAILED\"         Count per hour --- P1 alert if \> 0
  events                                                        

  Expiry processor    \"Expiring N primary offer(s)\" log lines Time delta between log pairs per cron
  run time (ms)                                                 tick

  Ably publish        level=warn AND \"ably\" in context        Count per 10 min
  failures                                                      
  ------------------- ----------------------------------------- -------------------------------------

**Database-derived metrics (polled every 60 seconds)**

+-----------------------------------------------------------------------+
| \-- 1. Outbox queue depth: events waiting to publish                  |
|                                                                       |
| SELECT status, COUNT(\*) AS count                                     |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| GROUP BY status;                                                      |
|                                                                       |
| \-- Healthy: PENDING \< 100, FAILED = 0, PROCESSING = 0 (or low       |
| transient count)                                                      |
|                                                                       |
| \-- 2. Outbox FAILED events: the single most critical metric          |
|                                                                       |
| SELECT id, event_type, aggregate_id, retry_count, last_error,         |
| created_at                                                            |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| ORDER BY created_at DESC                                              |
|                                                                       |
| LIMIT 10;                                                             |
|                                                                       |
| \-- Expected: 0 rows. Any row triggers P1 alert.                      |
|                                                                       |
| \-- 3. Active offers by status                                        |
|                                                                       |
| SELECT status, COUNT(\*) AS count                                     |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE status IN (\'PENDING\', \'COUNTERED\')                          |
|                                                                       |
| GROUP BY status;                                                      |
|                                                                       |
| \-- Track growth rate. Sudden spike may indicate a client integration |
| bug.                                                                  |
|                                                                       |
| \-- 4. Expiry backlog (offers that expired but were not processed)    |
|                                                                       |
| SELECT COUNT(\*) AS overdue_offers                                    |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE status = \'PENDING\' AND expires_at \<= NOW() - INTERVAL \'2    |
| minutes\';                                                            |
|                                                                       |
| \-- Expected: 0. \> 0 means ExpiryProcessor cron has fallen behind.   |
|                                                                       |
| \-- 5. Offers accepted in last 24h (business health)                  |
|                                                                       |
| SELECT COUNT(\*) AS accepted_24h                                      |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE status = \'ACCEPTED\'                                           |
|                                                                       |
| AND accepted_at \>= NOW() - INTERVAL \'24 hours\';                    |
|                                                                       |
| \-- Baseline this over 7 days. Drop of \>50% vs baseline is a P3      |
| alert.                                                                |
|                                                                       |
| \-- 6. Counter offers pending (negotiation activity)                  |
|                                                                       |
| SELECT COUNT(\*) AS pending_cos                                       |
|                                                                       |
| FROM offer_service.counter_offers                                     |
|                                                                       |
| WHERE status = \'PENDING\';                                           |
|                                                                       |
| \-- 7. DB connection pool usage (TypeORM)                             |
|                                                                       |
| \-- TypeORM does not expose pool stats via SQL.                       |
|                                                                       |
| \-- Monitor via TypeORM extra logging or DataDog APM agent.           |
|                                                                       |
| \-- Alert when pool used \> 90% (see pg_stat_activity):               |
|                                                                       |
| SELECT COUNT(\*) AS active_connections                                |
|                                                                       |
| FROM pg_stat_activity                                                 |
|                                                                       |
| WHERE datname = \'marketeq_prod\';                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 (Reference) Alert Thresholds**                               |
|                                                                       |
| P1/P2/P3 severity definitions and response actions                    |
+-----------------------------------------------------------------------+

P1 = page on-call immediately, acknowledge within 5 minutes. P2 =
acknowledge within 30 minutes, resolve within 24 hours. P3 = create
ticket, resolve in next sprint. Error rate thresholds apply to 5xx
responses only --- 4xx are correct client errors and do not count.

  ------------------- --------------- -------- ---------------------------------
  **Metric**          **Threshold**   **P**    **Immediate action**

  Outbox FAILED count \> 0 for \> 1   **P1**   Page. Check RabbitMQ. SQL: SELECT
                      min                      \* FROM outbox WHERE
                                               status=\'FAILED\'. Reset to
                                               PENDING after broker recovery.

  GET /ready returns  \>= 2           **P1**   K8s already removed pod. Check
  503                 consecutive              DB/RabbitMQ. Restart if
                                               dependency recovered. See runbook
                                               Step 9b.

  5xx error rate      \> 0.5% over 5  **P1**   Check logs for stack traces.
                      min                      Identify failing endpoint. Roll
                                               back deploy if correlated.

  API p95 latency     \> 1 000ms over **P1**   Check pg_stat_statements for slow
  (all endpoints)     5 min                    queries. Check connection pool.
                                               Check RabbitMQ publisher backlog.

  Offer acceptance    \< 90% of       **P1**   Any successful accept() returning
  success rate        attempts                 5xx or CAS failure storm.
                                               Investigate state machine and CAS
                                               code.

  Outbox queue depth  \> 500 for \> 2 **P2**   OutboxProcessor falling behind.
  (PENDING)           min                      Check RabbitMQ broker throughput.
                                               Check processor logs for errors.

  Expiry backlog      \> 0 for \> 5   **P2**   ExpiryProcessor cron stalled.
  (overdue offers)    min                      Verify ScheduleModule registered.
                                               Check ExpiryProcessor logs.

  DB connection pool  \> 90% for \> 1 **P2**   Increase TypeORM poolSize. Check
  usage               min                      pg_stat_activity for long-running
                                               transactions.

  409 CAS conflict    \> 5% over 10   **P2**   Heavy concurrent load or client
  rate                min                      retry loop. Check which endpoint
                                               generates conflicts. Check
                                               request patterns.

  POST /v1/offers p95 \> 500ms over 5 **P2**   listings-service call slow or
  latency             min                      timeout. Check
                                               LISTINGS_TIMEOUT_MS. Check
                                               idx_offers_client_talent.

  Ably publish        \> 5% over 10   **P2**   Real-time updates degraded. REST
  failure rate        min                      API still works. Check Ably
                                               status page. Ticket for frontend
                                               fallback.

  Accepted offers     \> 50% below 7d **P3**   Potential regression in accept
  (24h drop)          avg                      flow. Check recent deploys.
                                               Reproduce in staging.

  Offer expiry rate   \> 200% of      **P3**   May be normal (bulk expiry of
  spike               hourly avg               14-day-old offers). Verify no TTL
                                               reset bug. Check warning
                                               processor ran.

  WarningProcessor:   \> 30 min gap   **P3**   Cron may have stopped. Check
  no runs             in logs                  SchedulerModule in AppModule.
                                               Check \@Cron decorator on
                                               sendWarnings().
  ------------------- --------------- -------- ---------------------------------

+-----------------------------------------------------------------------+
| **Step 9 (Reference) On-Call Runbook --- Every P1 Scenario**          |
|                                                                       |
| Exact SQL and kubectl commands for each incident type                 |
+-----------------------------------------------------------------------+

**Runbook A --- Outbox FAILED events**

+-----------------------------------------------------------------------+
| \# STEP 1: Acknowledge the alert. Time limit: 5 minutes.              |
|                                                                       |
| \# STEP 2: Check which events failed and why.                         |
|                                                                       |
| SELECT id, event_type, aggregate_id, retry_count, last_error,         |
| created_at                                                            |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \# STEP 3: Check RabbitMQ broker health.                              |
|                                                                       |
| curl -s -u guest:guest                                                |
| http://\<rabbitmq-host\>:15672/api/healthchecks/node \| jq .          |
|                                                                       |
| \# STEP 4a: If RabbitMQ is down --- wait for broker recovery, then:   |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PENDING\', retry_count = 0, last_error = NULL,         |
|                                                                       |
| scheduled_at = NOW()                                                  |
|                                                                       |
| WHERE status = \'FAILED\';                                            |
|                                                                       |
| \# OutboxProcessor picks up PENDING events within 5 seconds.          |
|                                                                       |
| \# STEP 4b: If RabbitMQ is healthy but events still fail --- check    |
| pod logs:                                                             |
|                                                                       |
| kubectl logs -l app=offer-service \--since=15m \| grep \"OUTBOX       |
| FAILED\"                                                              |
|                                                                       |
| \# STEP 5: Verify recovery. No FAILED rows after 5 min:               |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service.outbox WHERE status = \'FAILED\'; |
|                                                                       |
| \# Expected: 0                                                        |
|                                                                       |
| \# STEP 6: Document in incident log: time, affected events, root      |
| cause, resolution.                                                    |
+-----------------------------------------------------------------------+

**Runbook B --- GET /ready returning 503**

+-----------------------------------------------------------------------+
| \# STEP 1: Identify which check failed.                               |
|                                                                       |
| curl -s http://\<service-host\>:3005/ready \| jq .checks              |
|                                                                       |
| \# e.g.: { \"db\": \"disconnected\", \"rabbitmq\": \"connected\",     |
| \"redis\": \"connected\" }                                            |
|                                                                       |
| \# STEP 2a: DB disconnected --- test connectivity from the pod.       |
|                                                                       |
| kubectl exec -it \<offer-service-pod\> \-- \\                         |
|                                                                       |
| psql \$DATABASE_URL -c \'SELECT 1\'                                   |
|                                                                       |
| \# If this fails: DB server is down. Escalate to DB on-call.          |
|                                                                       |
| \# If this works: TypeORM pool exhausted. Restart the pod:            |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
|                                                                       |
| \# STEP 2b: RabbitMQ disconnected.                                    |
|                                                                       |
| kubectl exec -it \<offer-service-pod\> \-- \\                         |
|                                                                       |
| curl -s http://\<rabbitmq\>:15672/api/healthchecks/node               |
|                                                                       |
| \# If down: escalate to infrastructure on-call.                       |
|                                                                       |
| \# If up: restart offer-service pod to re-establish AMQP connection.  |
|                                                                       |
| \# STEP 2c: Redis disconnected.                                       |
|                                                                       |
| kubectl exec -it \<offer-service-pod\> \-- redis-cli -h \$REDIS_HOST  |
| ping                                                                  |
|                                                                       |
| \# If down: escalate. Redis required for idempotency keys.            |
|                                                                       |
| \# STEP 3: After recovery, verify /ready returns 200:                 |
|                                                                       |
| curl -s http://\<service-host\>:3005/ready \| jq .status              |
|                                                                       |
| \# Expected: \"ok\"                                                   |
+-----------------------------------------------------------------------+

**Runbook C --- 5xx Error Rate Spike**

+-----------------------------------------------------------------------+
| \# STEP 1: Identify the failing endpoint and error code.              |
|                                                                       |
| kubectl logs -l app=offer-service \--since=10m \\                     |
|                                                                       |
| \| jq -r \'select(.level==\"error\") \| \[.path, .status, .errorCode, |
| .message\] \| \@csv\'                                                 |
|                                                                       |
| \# STEP 2: Check if the spike correlates with a recent deployment.    |
|                                                                       |
| kubectl rollout history deployment/offer-service                      |
|                                                                       |
| \# If yes: roll back immediately.                                     |
|                                                                       |
| kubectl rollout undo deployment/offer-service                         |
|                                                                       |
| \# STEP 3: If not a deploy issue, check for DB lock contention.       |
|                                                                       |
| SELECT pid, state, wait_event, query, NOW() - query_start AS duration |
|                                                                       |
| FROM pg_stat_activity                                                 |
|                                                                       |
| WHERE state != \'idle\'                                               |
|                                                                       |
| ORDER BY duration DESC                                                |
|                                                                       |
| LIMIT 20;                                                             |
|                                                                       |
| \# Queries blocked for \> 30s: investigate root cause.                |
|                                                                       |
| \# To unblock (last resort only --- confirm with DBA):                |
|                                                                       |
| \# SELECT pg_terminate_backend(\<pid\>);                              |
|                                                                       |
| \# STEP 4: Check outbox for cascade failures.                         |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service.outbox WHERE status = \'FAILED\'; |
|                                                                       |
| \# If \> 0: follow Runbook A.                                         |
+-----------------------------------------------------------------------+

**Escalation path**

  --------------------- -------------------------------------------------
  **P1 --- 0 to 5 min** Primary on-call: acknowledge alert, begin
                        runbook.

  **P1 --- 5 to 15      If not resolved: contact secondary on-call, open
  min**                 incident channel.

  **P1 --- 15 to 30     Engineering manager joins incident channel.
  min**                 Consider customer comms.

  **P1 --- \> 30 min**  Full incident response: war room, status page
                        update, CTO briefed.

  **P2 --- \< 30 min**  Primary on-call: acknowledge, create JIRA ticket
                        with priority HIGH.

  **P2 --- \< 24 hrs**  Fix deployed to staging, verified, deployed to
                        production.

  **P3 --- next         Ticket created in backlog, triaged in next sprint
  sprint**              planning.
  --------------------- -------------------------------------------------
