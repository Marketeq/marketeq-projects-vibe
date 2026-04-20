# CS-08 — Observability & Health

**Service:** cms-service | **Powered by:** Payload CMS

> **Purpose:** Health endpoint, logging configuration, structured log format, RabbitMQ failure alerting and retry logging, R2 upload failure handling, alert thresholds, and monitoring integration.
> **Prerequisites:** CS-01 (runtime), CS-05 (CategorySyncModule).

---

## 1. Health Endpoint

cms-service exposes `GET /health` on port 3020. Used by Docker healthchecks, Supabase health probes, and monitoring systems.

```typescript
// Registered in server.ts BEFORE payload.init()
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'cms-service' });
});
```

| Property | Value |
|---|---|
| Endpoint | `GET /health` |
| Expected response | `{ "status": "ok", "service": "cms-service" }` |
| Success codes | 200 |
| Timeout | 10 seconds |
| Start period | 20 seconds (allow time for Payload to boot before first probe) |
| Failure threshold | 3 consecutive failures before container is marked unhealthy |

---

## 2. Readiness Check

A separate `/ready` endpoint verifies that the database and RabbitMQ connections are established before cms-service is considered ready to serve traffic.

```typescript
app.get('/ready', async (_req, res) => {
  const checks = {
    database: false,
    rabbitmq: false,
  };

  try {
    await payload.db.connection.query('SELECT 1');
    checks.database = true;
  } catch { /* logged below */ }

  try {
    checks.rabbitmq = cmsEventPublisher.isConnected();
  } catch { /* logged below */ }

  const allReady = Object.values(checks).every(Boolean);
  res.status(allReady ? 200 : 503).json({ ready: allReady, checks });
});
```

---

## 3. Logging Configuration

cms-service uses Payload's built-in logger (powered by pino) with structured JSON output.

```typescript
// In payload.config.ts
export default buildConfig({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});
```

---

## 4. Structured Log Format

Every log line is a JSON object. Compatible with Datadog, Grafana Loki, and CloudWatch Logs.

```json
{
  "level":   "info",
  "time":    1718000000000,
  "service": "cms-service",
  "msg":     "category.saved published for slug: design-tools"
}
```

| Level | When to use |
|---|---|
| `error` | Unhandled exceptions, RabbitMQ publish failure after all retries, DB connection failure, R2 upload failure. |
| `warn` | RabbitMQ reconnect attempt, missing optional env var, category sync publisher not initialised. |
| `info` | Service startup, successful RabbitMQ publish, admin user login, content published. |
| `debug` | Payload request/response cycle details. Disable in production (`LOG_LEVEL=info`). |

---

## 5. RabbitMQ Failure Handling

CmsEventPublisher retries failed publishes up to 3 times with exponential backoff. After exhaustion, the failure is logged at `error` level. The nightly cron reconciliation in category-service is the recovery mechanism.

**Log: Retry attempt**
```
[CmsEventPublisher] Attempt 1 failed for category.saved. Retrying in 1000ms.
[CmsEventPublisher] Attempt 2 failed for category.saved. Retrying in 5000ms.
[CmsEventPublisher] Attempt 3 failed for category.saved. Retrying in 30000ms.
```

**Log: All retries exhausted**
```
[CmsEventPublisher] All retries exhausted for category.saved. Event lost to DLQ. Error: connect ECONNREFUSED
```

**Log: Successful publish**
```
[CmsEventPublisher] category.saved published for id: abc-123, slug: design-tools
```

**Alert threshold:** if more than 3 DLQ messages accumulate within 10 minutes, page the on-call engineer.

**Recovery:** restart RabbitMQ connection and trigger nightly reconciliation manually if needed:
```bash
curl -X POST http://category-service:3025/api/admin/reconcile-categories
```

---

## 6. R2 Upload Failure Handling

When an upload to Cloudflare R2 fails, the `@payloadcms/storage-r2` plugin throws an error that Payload returns as HTTP 500. The upload is not written to the database.

**Log: Upload failure**
```
[R2Storage] Upload failed for filename: image.png. Error: RequestError: R2 endpoint unreachable.
```

**Recovery steps:**
1. Check `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` environment variables.
2. Verify the R2 bucket (`R2_BUCKET`) exists and the key has write permissions.
3. Check the Cloudflare status page for R2 service incidents.
4. Re-attempt the upload once R2 connectivity is restored — there is no automatic retry for uploads.

---

## 7. Alert Thresholds

| Condition | Threshold | Action |
|---|---|---|
| Health check failures | 3 consecutive | Docker marks container unhealthy. Supabase restarts the container. |
| `/ready` returns 503 | 2 consecutive | Alert on-call. Check DB and RabbitMQ connectivity. |
| RabbitMQ DLQ messages | > 3 in 10 minutes | Alert on-call. Trigger manual reconciliation. |
| R2 upload errors | > 5 per hour | Alert on-call. Check Cloudflare R2 status. |
| HTTP 500 rate | > 1% of requests | Alert on-call. Check cms-service error logs. |
| cms-service restart | Any unexpected restart | Alert on-call. Review startup logs. |

---

## 8. Monitoring Integration

- **Logs:** ship JSON logs to your log aggregator (Datadog, Grafana Loki, CloudWatch). Filter by `service: cms-service`.
- **Metrics:** expose Prometheus metrics via a `/metrics` endpoint if required (add `prom-client` to `package.json`).
- **Uptime:** configure an external uptime monitor to probe `GET /health` every 60 seconds.
- **RabbitMQ:** monitor the `cms.category.category.dlq` queue depth via the RabbitMQ management UI.
- **Database:** monitor PostgreSQL connection pool via Supabase dashboard metrics. Alert if > 80%.

---

## 9. Verification

- Run `curl http://localhost:3020/health` — expect `{ status: 'ok', service: 'cms-service' }`.
- Run `curl http://localhost:3020/ready` — expect `{ ready: true, checks: { database: true, rabbitmq: true } }`.
- Simulate RabbitMQ disconnection and confirm retry logs appear at `warn` level.
- Confirm logs are JSON-formatted in production (`LOG_LEVEL=info`).
- **References:** CS-01 (Docker healthcheck config), CS-05 (RabbitMQ publisher and DLQ), RMQ-00 (exchange topology).
