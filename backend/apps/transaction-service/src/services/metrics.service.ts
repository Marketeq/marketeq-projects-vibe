import { Injectable, OnModuleInit } from '@nestjs/common';
import * as prom from 'prom-client';

// ── Safe registration helpers ──────────────────────────────────────────────
// prom-client throws if you register the same metric name twice (hot-reload).
// These helpers return the existing metric if already registered.

function counter(config: prom.CounterConfiguration<string>): prom.Counter {
  const existing = prom.register.getSingleMetric(config.name);
  if (existing) return existing as prom.Counter;
  return new prom.Counter(config);
}

function histogram(config: prom.HistogramConfiguration<string>): prom.Histogram {
  const existing = prom.register.getSingleMetric(config.name);
  if (existing) return existing as prom.Histogram;
  return new prom.Histogram(config);
}

function gauge(config: prom.GaugeConfiguration<string>): prom.Gauge {
  const existing = prom.register.getSingleMetric(config.name);
  if (existing) return existing as prom.Gauge;
  return new prom.Gauge(config);
}

@Injectable()
export class MetricsService implements OnModuleInit {

  // ── Consumer metrics ─────────────────────────────────────────────────
  readonly consumerMessagesTotal = counter({
    name:       'txn_consumer_messages_total',
    help:       'Total RabbitMQ messages processed',
    labelNames: ['routing_key', 'status'],
  });
  readonly consumerDuration = histogram({
    name:       'txn_consumer_duration_seconds',
    help:       'Consumer handler duration',
    labelNames: ['routing_key'],
    buckets:    [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

  // ── Transaction record metrics ───────────────────────────────────────
  readonly recordsCreatedTotal = counter({
    name:       'txn_records_created_total',
    help:       'Total transaction records written to the database',
    labelNames: ['description_type', 'amount_direction'],
  });

  // ── Payment failure rate ─────────────────────────────────────────────
  readonly paymentFailureRate = gauge({
    name:       'txn_payment_failure_rate',
    help:       'Ratio of failed to total payment transactions over last 5 minutes',
    labelNames: ['contract_type'],
  });

  // ── HTTP metrics ─────────────────────────────────────────────────────
  readonly httpRequestsTotal = counter({
    name:       'txn_http_requests_total',
    help:       'Total HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
  });
  readonly httpDuration = histogram({
    name:       'txn_http_duration_seconds',
    help:       'HTTP request duration',
    labelNames: ['method', 'path'],
    buckets:    [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  });

  // ── Cache metrics ────────────────────────────────────────────────────
  readonly cacheHits = counter({
    name:       'txn_cache_hits_total',
    help:       'Redis cache hits',
    labelNames: ['scope'],
  });
  readonly cacheMisses = counter({
    name:       'txn_cache_misses_total',
    help:       'Redis cache misses',
    labelNames: ['scope'],
  });
  readonly cacheInvalidations = counter({
    name:       'txn_cache_invalidations_total',
    help:       'Redis cache invalidation operations',
    labelNames: ['scope'],
  });

  // ── Ably metrics ─────────────────────────────────────────────────────
  readonly ablyPublishesTotal = counter({
    name:       'txn_ably_publishes_total',
    help:       'Ably real-time publish attempts',
    labelNames: ['status'],
  });

  // ── DLQ & export metrics ─────────────────────────────────────────────
  readonly dlqDepth = gauge({
    name:       'txn_dlq_depth',
    help:       'Dead-letter queue depth',
    labelNames: ['queue'],
  });
  readonly exportQueueDepth = gauge({
    name:       'txn_export_queue_depth',
    help:       'Async export jobs queued',
    labelNames: [],
  });
  readonly exportDuration = histogram({
    name:       'txn_export_duration_seconds',
    help:       'Time to complete a synchronous export',
    labelNames: ['scope', 'format'],
    buckets:    [0.5, 1, 2, 5, 10, 30, 60],
  });

  // ── Overdue invoices ─────────────────────────────────────────────────
  readonly overdueInvoicesTotal = counter({
    name:       'txn_overdue_invoices_updated_total',
    help:       'Invoices escalated to overdue status by nightly cron',
    labelNames: [],
  });

  // ── Stripe metrics ───────────────────────────────────────────────────
  readonly stripeFetchDuration = histogram({
    name:       'txn_stripe_fetch_duration_seconds',
    help:       'Stripe invoice URL fetch latency',
    labelNames: ['status'],
    buckets:    [0.1, 0.25, 0.5, 1, 2, 5],
  });

  // ── DB metrics ───────────────────────────────────────────────────────
  readonly dbQueryDuration = histogram({
    name:       'txn_db_query_duration_seconds',
    help:       'Database query duration',
    labelNames: ['operation'],
    buckets:    [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

  onModuleInit(): void {
    prom.collectDefaultMetrics({ prefix: 'txn_node_' });
  }

  async timeAsync<T>(
    hist: prom.Histogram,
    labels: object,
    fn: () => Promise<T>,
  ): Promise<T> {
    const end = hist.startTimer(labels as prom.LabelValues<string>);
    try {
      return await fn();
    } finally {
      end();
    }
  }
}