# Expected Load & Scaling — identity-verification-service

No source available to this project defines an expected load figure for this service.

## Not confirmed by any source

- Requests-per-second, concurrent-user target, or peak-vs-average traffic ratio.
- Database row-count projection at any time horizon.
- Latency SLA (p50/p95/p99) for any route or background job.
- Connection-pool size, retry/lazy-connection option, container CPU/memory limit, or replica count.

## Confirmed instead: how the service behaves under load

- **TypeOrmModule.forRoot()** connects eagerly at bootstrap with no pool size, retryAttempts, or lazy-connection option set. /health itself fails to start if the database is unreachable.
- **The Didit vendor call** is awaited synchronously with no timeout, no retry loop, and no circuit breaker.
- **The RabbitMQ event publish** is awaited but failure-isolated — a broker slowdown does not block the HTTP response path.

## Where real data will come from

Doc 08's MetricsService, once wired into Doc 05's business logic, will make GET /v1/internal/metrics the confirmed source of real request-volume and job-run counts.

## What this document does not do

- It does not estimate or invent an expected load figure.
- It does not configure a connection-pool size.
- It does not wire Doc 08's MetricsService into Doc 05's business logic.
- It does not set a container resource limit or replica count.
