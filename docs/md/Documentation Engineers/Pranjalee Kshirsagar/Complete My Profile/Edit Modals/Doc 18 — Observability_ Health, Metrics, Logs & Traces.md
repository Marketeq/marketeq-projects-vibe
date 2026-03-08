# **Observability: Health, Metrics, Logs & Traces**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** Minimal, production-ready observability: **health endpoints,
lightweight metrics, structured logs, request correlation**. Tracing is
header-level correlation first; full OTEL can be toggled later if your
platform standard already exists. No extra systems beyond the core
backend standards.

## **0) TL;DR (what ships)**

- **Health:** /health/live, /health/ready (process + DB ping).

- **Metrics:** /metrics (basic counters/histograms) --- JSON-only APIs
  remain unchanged.

- **Logs:** structured, correlation via x-request-id, no PII/body
  logging.

- **Traces:** header propagation now; optional OTEL wiring behind a flag
  (no-op by default).

## **1) Health Endpoints (Liveness & Readiness)**

### **Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/health.controller.ts\
  import { Controller, Get } from \'@nestjs/common\';\
  import { DataSource } from \'typeorm\';\
  \
  \@Controller(\'/health\')\
  export class HealthController {\
  constructor(private readonly db: DataSource) {}\
  \
  \@Get(\'/live\')\
  live() {\
  // Process is up; avoid heavy checks here.\
  return { status: \'ok\' };\
  }\
  \
  \@Get(\'/ready\')\
  async ready() {\
  // Lightweight DB ping; reject if connection pool is unhealthy.\
  try {\
  // Prefer a fast, metadata-free query\
  await this.db.query(\'SELECT 1\');\
  return { status: \'ok\', checks: { db: \'ok\' } };\
  } catch (e) {\
  return { status: \'fail\', checks: { db: \'error\' } };\
  }\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Module wiring**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/observability.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { HealthController } from \'./health.controller\';\
  \
  \@Module({\
  controllers: \[HealthController\]\
  })\
  export class ObservabilityModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> Import ObservabilityModule in the root app module.\
> **Kubernetes:** point livenessProbe to /health/live, readinessProbe to
> /health/ready.

## **2) Metrics (basic Prometheus exposition)**

> Keep metrics minimal and low-overhead. No business/PII values inside
> labels.

### **Bootstrap & Registry**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/metrics.ts\
  import client from \'prom-client\';\
  \
  // One global registry\
  export const registry = new client.Registry();\
  client.collectDefaultMetrics({ register: registry, prefix:
  \'user_service\_\' });\
  \
  export const httpRequestsTotal = new client.Counter({\
  name: \'user_service_http_requests_total\',\
  help: \'Total HTTP requests\',\
  labelNames: \[\'method\', \'route\', \'status\'\] as const\
  });\
  export const httpRequestDuration = new client.Histogram({\
  name: \'user_service_http_request_duration_seconds\',\
  help: \'Request duration in seconds\',\
  labelNames: \[\'method\', \'route\', \'status\'\] as const,\
  buckets: \[0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5\]\
  });\
  registry.registerMetric(httpRequestsTotal);\
  registry.registerMetric(httpRequestDuration);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Middleware instrumentation**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/metrics.middleware.ts\
  import type { Request, Response, NextFunction } from \'express\';\
  import { httpRequestsTotal, httpRequestDuration } from \'./metrics\';\
  \
  export function metricsMiddleware(req: Request, res: Response, next:
  NextFunction) {\
  const start = process.hrtime.bigint();\
  const method = (req.method \|\| \'GET\').toUpperCase();\
  \
  // Label-safe route template, fallback to originalUrl\
  const route = (req.route?.path \|\| req.baseUrl \|\| req.path \|\|
  \'unknown\');\
  \
  res.on(\'finish\', () =\> {\
  const status = String(res.statusCode);\
  const dur = Number(process.hrtime.bigint() - start) / 1e9; // seconds\
  httpRequestsTotal.labels(method, route, status).inc();\
  httpRequestDuration.labels(method, route, status).observe(dur);\
  });\
  \
  next();\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Metrics endpoint**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/metrics.controller.ts\
  import { Controller, Get, Header } from \'@nestjs/common\';\
  import { registry } from \'./metrics\';\
  \
  \@Controller()\
  export class MetricsController {\
  \@Get(\'/metrics\')\
  \@Header(\'Content-Type\', \'text/plain; version=0.0.4\')\
  async metrics(): Promise\<string\> {\
  return await registry.metrics();\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Module wiring**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/observability.module.ts\
  import { Module, MiddlewareConsumer } from \'@nestjs/common\';\
  import { HealthController } from \'./health.controller\';\
  import { MetricsController } from \'./metrics.controller\';\
  import { metricsMiddleware } from \'./metrics.middleware\';\
  \
  \@Module({\
  controllers: \[HealthController, MetricsController\]\
  })\
  export class ObservabilityModule {\
  configure(consumer: MiddlewareConsumer) {\
  // Apply to API routes; skip /metrics itself to avoid recursion\
  consumer.apply(metricsMiddleware).forRoutes(\'\*\');\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**SLIs to chart (suggested):**

- rate(user_service_http_requests_total\[5m\]) by status

- histogram_quantile(0.95,
  sum(rate(user_service_http_request_duration_seconds_bucket\[5m\])) by
  (le))

- 5xx error rate:
  sum(rate(user_service_http_requests_total{status=\~\"5..\"}\[5m\])) /
  sum(rate(user_service_http_requests_total\[5m\]))

## **3) Structured Logging & Correlation**

### **Request-ID middleware**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/request-id.middleware.ts\
  import type { Request, Response, NextFunction } from \'express\';\
  import { randomUUID } from \'crypto\';\
  \
  export function requestIdMiddleware(req: Request, res: Response, next:
  NextFunction) {\
  const incoming = (req.headers\[\'x-request-id\'\] as string) \|\|
  randomUUID();\
  res.setHeader(\'x-request-id\', incoming);\
  (req as any).requestId = incoming;\
  next();\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Minimal request logger**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/observability/request-logger.middleware.ts\
  import type { Request, Response, NextFunction } from \'express\';\
  \
  export function requestLoggerMiddleware(req: Request, res: Response,
  next: NextFunction) {\
  const started = Date.now();\
  const reqId = (req as any).requestId;\
  const method = req.method;\
  const path = req.originalUrl \|\| req.url;\
  \
  // Do NOT log bodies or PII\
  res.on(\'finish\', () =\> {\
  const ms = Date.now() - started;\
  const status = res.statusCode;\
  // eslint-disable-next-line no-console\
  console.info(JSON.stringify({ t: \'http\', reqId, method, path, status,
  ms }));\
  });\
  \
  next();\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Bind in bootstrap**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/main.ts (excerpt)\
  import { requestIdMiddleware } from
  \'@/observability/request-id.middleware\';\
  import { requestLoggerMiddleware } from
  \'@/observability/request-logger.middleware\';\
  \
  app.use(requestIdMiddleware);\
  app.use(requestLoggerMiddleware);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Log policy**

- **Do not** log request/response bodies on profile endpoints.

- Include reqId in app logs and propagate x-request-id in responses.

- Errors are normalized (Doc 05) and safe for logging.

## **4) Traces (header propagation now; OTEL optional)**

### **Header propagation (always)**

- Accept and forward x-request-id.

- If gateway emits W3C trace headers (traceparent, tracestate), they are
  **opaque** here; we keep x-request-id for app correlation.

### **Optional OpenTelemetry (behind a flag)**

- If your platform standardizes OTEL, expose: OTEL_ENABLED=true,
  OTEL_EXPORTER_OTLP_ENDPOINT=\....

- Use the official Nest/Node OTEL SDK in a separate module; **default to
  no-op** when disabled.

- **Do not** add vendor SDKs here unless already approved by
  architecture standards.

*(No code here to avoid introducing new deps in this sprint; wire in a
follow-up doc if enabled.)*

## **5) Readiness Gates for Deploy/Rollout**

- **Readiness fails** if DB ping fails.

- **Canary/rolling update:** rely on readiness to drain pods before
  shutdown.

- **Graceful shutdown:** ensure Nest app.enableShutdownHooks() is called
  so inflight requests complete.

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/main.ts (excerpt)\
  app.enableShutdownHooks();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Alerting Hints (minimal, platform-level)**

- **Availability:** readiness probe failure count \> 0 over 5m.

- **Latency:** p95 user_service_http_request_duration_seconds \> 1s for
  10m.

- **Error rate:** 5xx ratio \> 1% over 10m.

- **DB:** readiness failing with { db: \'error\' } \> 1m.

(Define alerts in your platform monitors; this service just emits
metrics.)

## **7) QA / Ops Checklist**

- /health/live returns {status:\"ok\"}.

- /health/ready returns {status:\"ok\", checks:{db:\"ok\"}} under normal
  ops; simulate DB outage → \"fail\".

- /metrics exposes default + HTTP metrics; scrape succeeds.

- Logs present one JSON line per request with reqId, method, path,
  status, duration.

- Response headers include x-request-id.

- No request bodies in logs; no PII fields present.

- Load test: p95 latency and error rate within Doc 05 targets.

## **8) Out of Scope (explicit)**

- No external APM vendor SDKs this sprint.

- No business metrics (counts of skills/amounts) in labels.

- No logging of HTML bodies, rate amounts, or portfolio raw URLs.
