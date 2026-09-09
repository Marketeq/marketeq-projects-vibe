# Identity Verification Service - Alerting Readiness

## Current Status
This service currently has no configured alerting, logging vendor, or metrics aggregation. This document outlines what would need to be decided before production alerting is established.

## Metrics to Track (When Vendor Is Chosen)
- Verification attempt count by outcome (approved/rejected/error)
- Document submission rate
- Travel Mode activations
- Webhook delivery latency
- Database query latency
- RabbitMQ publish failures

## Health Checks Available
- **GET /health** - Basic liveness check (returns `{"status":"ok"}`)
- **GET /ready** - Readiness check (verifies database connectivity)
- **GET /internal/metrics** - In-memory counter registry (internal-only)

## Dependencies to Monitor
- PostgreSQL database availability and query performance
- RabbitMQ broker availability
- Didit vendor API availability and latency

## Alerting Thresholds (To Be Defined)
These require input from the team and SLO discussions:
- Failed verification attempts threshold
- Document submission timeout threshold
- Webhook processing failure threshold
- Database connection pool exhaustion

## Reference Implementations
Other Marketeq services use:
- **auth-service**: Prometheus/Grafana for metrics
- **content-moderation-service**: Datadog and CloudWatch

These are provided as illustrative precedent only and do not represent a mandated choice for this service.
