**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-30 --- Observability & Monitoring

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-30 --- Observability & Monitoring

  **Version**         1.0

  **Applies to**      payout-service, schedule executor, magic link
                      verifier, RabbitMQ consumers, settlement webhooks.

  **Metrics stack**   Prometheus + Grafana. Metrics exposed at GET
                      /metrics (Prometheus scrape endpoint).

  **Logging stack**   Structured JSON logs. Winston or Pino. Shipped to
                      centralised log aggregator (e.g. Datadog, Grafana
                      Loki).

  **Alerting**        PagerDuty via Prometheus Alertmanager. Critical
                      alerts: immediate page. Warning alerts: Slack
                      #payout-ops.

  **Health checks**   GET /health (liveness). GET /health/ready
                      (readiness). GET /health/deep (dependency checks).

  **Prerequisites**   PS-02, PS-03, PS-14, PS-17, PS-21, PS-23
  -----------------------------------------------------------------------

# **1. Overview**

This document defines every Prometheus metric, structured log field,
PagerDuty alert, and health check endpoint that payout-service must
expose. Observability is a first-class requirement --- the metrics and
alert thresholds defined here must be implemented before payout-service
processes any live transactions. Each metric includes its type, label
dimensions, recording rule (where applicable), and the alert condition
it feeds.

+-----------------------------------------------------------------------+
| **Naming conventions**                                                |
|                                                                       |
| Metric names: payout\_{subsystem}\_{measurement}\_{unit}.             |
|                                                                       |
| All metrics are prefixed payout\_ to prevent collision with other     |
| services.                                                             |
|                                                                       |
| Counter metrics end in \_total.                                       |
|                                                                       |
| Histogram metrics end in \_duration_seconds or \_latency_seconds.     |
|                                                                       |
| Gauge metrics use present-tense names (e.g. payout_queue_depth).      |
|                                                                       |
| Label names: snake_case. Label values: lowercase where possible.      |
|                                                                       |
| No high-cardinality labels (no UUIDs, no contractor IDs, no email     |
| addresses in labels).                                                 |
+=======================================================================+

# **2. Prometheus Metrics**

## **2.1 Withdrawal success and failure rate**

  -------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                               **Type**    **Labels**                                              **Description**
  ---------------------------------------- ----------- ------------------------------------------------------- ------------------------
  **payout_withdrawal_initiated_total**    Counter     method_type, initiation_type (manual\|scheduled)        Incremented each time
                                                                                                               POST
                                                                                                               /v1/payouts/initiate
                                                                                                               creates a
                                                                                                               payout_requests row.

  **payout_withdrawal_completed_total**    Counter     method_type, initiation_type, bridge_provider           Incremented when
                                                       (stripe\|ramp\|transak\|paypal\|wise\|payoneer\|null)   payout_requests.status
                                                                                                               transitions to
                                                                                                               completed.

  **payout_withdrawal_failed_total**       Counter     method_type, initiation_type, failure_code,             Incremented when
                                                       final_failure (true\|false)                             payout_requests.status
                                                                                                               transitions to failed.

  **payout_withdrawal_duration_seconds**   Histogram   method_type, initiation_type                            Time from
                                                                                                               payout_requests creation
                                                                                                               to status=completed.
                                                                                                               Buckets: 1s, 5s, 30s,
                                                                                                               300s, 3600s, 86400s,
                                                                                                               +Inf.
  -------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/metrics/withdrawal.metrics.ts                                  |
|                                                                       |
| // Folder: /apps/payout-service/src/metrics/                          |
|                                                                       |
| import { Counter, Histogram, register } from \"prom-client\";         |
|                                                                       |
| export const withdrawalInitiated = new Counter({                      |
|                                                                       |
| name: \"payout_withdrawal_initiated_total\",                          |
|                                                                       |
| help: \"Total withdrawal initiations by method type and initiation    |
| type\",                                                               |
|                                                                       |
| labelNames: \[\"method_type\", \"initiation_type\"\],                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| export const withdrawalCompleted = new Counter({                      |
|                                                                       |
| name: \"payout_withdrawal_completed_total\",                          |
|                                                                       |
| help: \"Total completed withdrawals\",                                |
|                                                                       |
| labelNames: \[\"method_type\", \"initiation_type\",                   |
| \"bridge_provider\"\],                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| export const withdrawalFailed = new Counter({                         |
|                                                                       |
| name: \"payout_withdrawal_failed_total\",                             |
|                                                                       |
| help: \"Total failed withdrawals by failure code\",                   |
|                                                                       |
| labelNames: \[\"method_type\", \"initiation_type\", \"failure_code\", |
| \"final_failure\"\],                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| export const withdrawalDuration = new Histogram({                     |
|                                                                       |
| name: \"payout_withdrawal_duration_seconds\",                         |
|                                                                       |
| help: \"Time from initiation to completion\",                         |
|                                                                       |
| labelNames: \[\"method_type\", \"initiation_type\"\],                 |
|                                                                       |
| buckets: \[1, 5, 30, 300, 3600, 86400, Infinity\],                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Recording rule for success rate (add to Prometheus rules file):    |
|                                                                       |
| // - record: payout:withdrawal_success_rate_5m                        |
|                                                                       |
| // expr: \|                                                           |
|                                                                       |
| // rate(payout_withdrawal_completed_total\[5m\])                      |
|                                                                       |
| // / (rate(payout_withdrawal_completed_total\[5m\]) +                 |
| rate(payout_withdrawal_failed_total\[5m\]))                           |
+=======================================================================+

## **2.2 Schedule execution lag per frequency type**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                                  **Type**    **Labels**                                                                          **Description**
  ------------------------------------------- ----------- ----------------------------------------------------------------------------------- -------------------------
  **payout_schedule_execution_lag_seconds**   Histogram   frequency (WEEKLY\|BIWEEKLY\|MONTHLY\|THRESHOLD)                                    Seconds between a
                                                                                                                                              schedule\'s
                                                                                                                                              nextExecutionAt timestamp
                                                                                                                                              and the time it actually
                                                                                                                                              begins execution.
                                                                                                                                              Measures cron + queue
                                                                                                                                              processing delay.
                                                                                                                                              Buckets: 60s, 300s, 600s,
                                                                                                                                              1800s, 3600s, +Inf.

  **payout_schedule_executed_total**          Counter     frequency, outcome (success\|failed\|skipped)                                       Incremented for each
                                                                                                                                              schedule slot evaluated
                                                                                                                                              by the cron tick.

  **payout_schedule_skipped_total**           Counter     frequency, skip_reason                                                              Incremented for each
                                                          (BELOW_THRESHOLD\|PAUSE_CONDITION\|KYC_GATE_FAILED\|OUTSIDE_WINDOW\|ZERO_BALANCE)   skipped schedule cycle.

  **payout_schedule_cron_duration_seconds**   Histogram   ---                                                                                 Time taken by the master
                                                                                                                                              cron tick to evaluate all
                                                                                                                                              due schedules. Buckets:
                                                                                                                                              1s, 5s, 15s, 30s, 60s,
                                                                                                                                              +Inf. Alert if p99 \> 25
                                                                                                                                              minutes (approaching next
                                                                                                                                              tick).
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Schedule execution lag --- recorded at execution start             |
|                                                                       |
| // src/schedule/schedule-executor.ts                                  |
|                                                                       |
| const lag = (Date.now() - schedule.nextExecutionAt.getTime()) / 1000; |
|                                                                       |
| scheduleExecutionLag                                                  |
|                                                                       |
| .labels({ frequency: schedule.frequency })                            |
|                                                                       |
| .observe(lag);                                                        |
|                                                                       |
| // Alert condition:                                                   |
|                                                                       |
| // LABELS: frequency=\"WEEKLY\"                                       |
|                                                                       |
| // ALERT if histogram p99 \> 3600 (1 hour behind) for any frequency   |
| type                                                                  |
|                                                                       |
| // Suggests cron tick is overloaded or Redis lock is being held too   |
| long                                                                  |
+=======================================================================+

## **2.3 Method type distribution**

  -------------------------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                                        **Type**    **Labels**                                                 **Description**
  ------------------------------------------------- ----------- ---------------------------------------------------------- ------------------------------
  **payout_method_count**                           Gauge       method_type, status (active\|pending\|failed\|inactive)    Current count of deposit
                                                                                                                           methods by type and status.
                                                                                                                           Updated on method
                                                                                                                           create/update/delete events.
                                                                                                                           Gives a live view of method
                                                                                                                           adoption.

  **payout_method_added_total**                     Counter     method_type                                                Incremented each time a new
                                                                                                                           deposit method is successfully
                                                                                                                           created.

  **payout_method_deactivated_total**               Counter     method_type, reason                                        Incremented each time a method
                                                                (ACH_RETURN\|REAUTH_EXPIRED\|USER_DELETED\|ADMIN_ACTION)   transitions to isActive=false.

  **payout_method_verification_duration_seconds**   Histogram   method_type, verification_type                             Time from method creation to
                                                                (micro_deposit\|financial_connections\|instant)            verificationStatus=VERIFIED.
                                                                                                                           Buckets: 60s, 3600s, 86400s,
                                                                                                                           259200s (3 days), +Inf.
  -------------------------------------------------------------------------------------------------------------------------------------------------------

## **2.4 Stripe Financial Connections API latency**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                                  **Type**    **Labels**                                                                                      **Description**
  ------------------------------------------- ----------- ----------------------------------------------------------------------------------------------- -------------------------
  **payout_stripe_api_latency_seconds**       Histogram   operation                                                                                       Latency of every Stripe
                                                          (create_payout\|create_cardholder\|issue_card\|activate_card\|link_session\|webhook_process),   API call made by
                                                          status (success\|error)                                                                         payout-service. Buckets:
                                                                                                                                                          0.1s, 0.5s, 1s, 2s, 5s,
                                                                                                                                                          10s, +Inf.

  **payout_stripe_api_errors_total**          Counter     operation, stripe_error_code (e.g. rate_limit_error, api_connection_error, card_error)          Incremented for every
                                                                                                                                                          non-2xx Stripe API
                                                                                                                                                          response.

  **payout_stripe_webhook_processed_total**   Counter     event_type, status (processed\|skipped\|error)                                                  Incremented for each
                                                                                                                                                          inbound Stripe webhook.
                                                                                                                                                          event_type from Stripe
                                                                                                                                                          event object (e.g.
                                                                                                                                                          payout.paid,
                                                                                                                                                          payout.failed).
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Stripe API call wrapper --- all Stripe calls go through this       |
|                                                                       |
| // src/stripe/stripe-instrumented.client.ts                           |
|                                                                       |
| async call\<T\>(                                                      |
|                                                                       |
| operation: string,                                                    |
|                                                                       |
| fn: () =\> Promise\<T\>,                                              |
|                                                                       |
| ): Promise\<T\> {                                                     |
|                                                                       |
| const end = stripeApiLatency.labels({ operation, status: \"success\"  |
| }).startTimer();                                                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const result = await fn();                                            |
|                                                                       |
| end();                                                                |
|                                                                       |
| return result;                                                        |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| stripeApiLatency.labels({ operation, status: \"error\"                |
| }).startTimer()();                                                    |
|                                                                       |
| stripeApiErrors                                                       |
|                                                                       |
| .labels({ operation, stripe_error_code: err.code ?? \"unknown\" })    |
|                                                                       |
| .inc();                                                               |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| const payout = await this.stripeClient.call(\"create_payout\", () =\> |
|                                                                       |
| stripe.payouts.create({ amount, currency: \"usd\", destination }, {   |
| idempotencyKey })                                                     |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.5 Crypto settlement timing per provider**

  ---------------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                                      **Type**    **Labels**                                              **Description**
  ----------------------------------------------- ----------- ------------------------------------------------------- -------------------------
  **payout_crypto_settlement_duration_seconds**   Histogram   provider (ramp\|transak), network                       Time from crypto payout
                                                              (ethereum\|bitcoin\|solana\|tron\|polygon\|litecoin),   initiation to on-chain
                                                              status (confirmed\|failed)                              confirmation threshold
                                                                                                                      met. Buckets: 60s, 300s,
                                                                                                                      900s, 3600s, 14400s,
                                                                                                                      86400s, +Inf.

  **payout_crypto_confirmations_total**           Counter     network, final_status (confirmed\|dropped\|replaced)    Incremented when a
                                                                                                                      transaction reaches the
                                                                                                                      required confirmation
                                                                                                                      count or is dropped.

  **payout_crypto_gas_spike_blocked_total**       Counter     network                                                 Incremented when a payout
                                                                                                                      is queued due to gas \>
                                                                                                                      10% of payout amount
                                                                                                                      (PS-25 §10).

  **payout_bridge_api_latency_seconds**           Histogram   provider, operation                                     Latency of calls to Ramp
                                                              (initiate\|status_check\|webhook_receive), status       and Transak bridge APIs.
                                                              (success\|error)                                        Buckets: 0.1s, 0.5s, 1s,
                                                                                                                      5s, 10s, +Inf.

  **payout_bridge_api_errors_total**              Counter     provider, error_type                                    Incremented for non-2xx
                                                                                                                      responses from bridge
                                                                                                                      providers.
  ---------------------------------------------------------------------------------------------------------------------------------------------

## **2.6 Magic link delivery success rate**

  ---------------------------------------------------------------------------------------------------------
  **Metric**                                     **Type**    **Labels**       **Description**
  ---------------------------------------------- ----------- ---------------- -----------------------------
  **payout_magic_link_sent_total**               Counter     ---              Incremented when
                                                                              payout.magic_link.requested
                                                                              is published to RabbitMQ
                                                                              (dispatch attempted).

  **payout_magic_link_delivered_total**          Counter     ---              Incremented when
                                                                              notification-service confirms
                                                                              SendGrid delivery (webhook or
                                                                              event acknowledgment).
                                                                              Requires notification-service
                                                                              to emit a delivery
                                                                              confirmation event consumed
                                                                              by payout-service.

  **payout_magic_link_verified_total**           Counter     ---              Incremented when a magic link
                                                                              token is successfully
                                                                              verified (atomic Redis DEL
                                                                              succeeds and payoutRequest
                                                                              advances to processing).

  **payout_magic_link_expired_total**            Counter     ---              Incremented when GET /verify
                                                                              returns
                                                                              ERR_MAGIC_LINK_EXPIRED.

  **payout_magic_link_resend_total**             Counter     ---              Incremented on each POST
                                                                              /resend-verification call.

  **payout_magic_link_time_to_verify_seconds**   Histogram   ---              Time from
                                                                              magic_link.requested event to
                                                                              successful verification.
                                                                              Buckets: 30s, 60s, 300s,
                                                                              600s, 900s (15 min max),
                                                                              +Inf.
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Recording rule --- magic link delivery funnel (add to Prometheus   |
| rules):                                                               |
|                                                                       |
| // - record: payout:magic_link_verify_rate_1h                         |
|                                                                       |
| // expr: \|                                                           |
|                                                                       |
| // rate(payout_magic_link_verified_total\[1h\])                       |
|                                                                       |
| // / rate(payout_magic_link_sent_total\[1h\])                         |
|                                                                       |
| // labels:                                                            |
|                                                                       |
| // service: payout-service                                            |
|                                                                       |
| // Alert: if verify_rate_1h \< 0.5 (fewer than 50% of sent magic      |
| links are verified                                                    |
|                                                                       |
| // in the subsequent hour) → may indicate email delivery failure or   |
| UX confusion.                                                         |
|                                                                       |
| // SEVERITY: warning (Slack). Escalate to critical if rate \< 0.2.    |
+=======================================================================+

## **2.7 RabbitMQ event processing time**

  ----------------------------------------------------------------------------------------------------------------------
  **Metric**                                     **Type**    **Labels**                       **Description**
  ---------------------------------------------- ----------- -------------------------------- --------------------------
  **payout_rabbitmq_publish_total**              Counter     routing_key, status              Incremented for every
                                                             (success\|error)                 RabbitMQ publish attempt
                                                                                              from payout-service.

  **payout_rabbitmq_consume_duration_seconds**   Histogram   queue_name, status               Processing time per
                                                             (acked\|nacked\|dead_lettered)   consumed message from
                                                                                              queue receipt to ack/nack.
                                                                                              Buckets: 0.01s, 0.05s,
                                                                                              0.1s, 0.5s, 1s, 5s, +Inf.

  **payout_rabbitmq_dlq_depth**                  Gauge       queue_name                       Current depth of each
                                                                                              dead-letter queue. Updated
                                                                                              by a background scraper
                                                                                              that queries the RabbitMQ
                                                                                              Management API. Alert if
                                                                                              \> 0.

  **payout_rabbitmq_consumer_lag**               Gauge       queue_name                       Message count in queue not
                                                                                              yet consumed. Updated by
                                                                                              RabbitMQ exporter. Alert
                                                                                              if \> 1000 for
                                                                                              earnings.balance.updated
                                                                                              queue.
  ----------------------------------------------------------------------------------------------------------------------

## **2.8 KYC gate and EDD metrics**

  -------------------------------------------------------------------------------------------------------------------------
  **Metric**                               **Type**    **Labels**                                 **Description**
  ---------------------------------------- ----------- ------------------------------------------ -------------------------
  **payout_kyc_gate_blocked_total**        Counter     tier                                       Incremented each time a
                                                       (tier1\|tier2\|tier3\|first_payout_hold)   KYC gate blocks a
                                                                                                  withdrawal initiation.

  **payout_edd_triggered_total**           Counter     ---                                        Incremented each time a
                                                                                                  payout is routed to
                                                                                                  awaiting_edd.

  **payout_edd_review_duration_seconds**   Histogram   decision (approved\|rejected)              Time from edd.triggered
                                                                                                  to compliance officer
                                                                                                  decision. Buckets: 3600s,
                                                                                                  14400s, 86400s (1 day),
                                                                                                  172800s (2 days), +Inf.

  **payout_ofac_blocked_total**            Counter     block_type                                 Incremented for every
                                                       (country\|wallet_address\|name_match)      OFAC screening block. No
                                                                                                  PII in labels.
  -------------------------------------------------------------------------------------------------------------------------

## **2.9 Rate limiting metrics**

  -------------------------------------------------------------------------------------------------------------------
  **Metric**                        **Type**   **Labels**                                   **Description**
  --------------------------------- ---------- -------------------------------------------- -------------------------
  **payout_rate_limit_hit_total**   Counter    endpoint                                     Incremented each time a
                                               (withdrawal_initiate\|resend_verification)   rate limit is enforced
                                                                                            (429 returned).

  -------------------------------------------------------------------------------------------------------------------

# **3. Grafana Dashboards**

  -----------------------------------------------------------------------
  **Dashboard**          **Panels**
  ---------------------- ------------------------------------------------
  **Payout Overview**    Withdrawal success rate (5m), failure rate by
                         method type, in-flight payout count
                         (withdrawableUSD pending), daily payout volume
                         (USD).

  **Schedule Executor**  Schedule execution lag p50/p95/p99 by frequency,
                         schedule cron tick duration, skipped schedules
                         by reason, consecutive threshold miss rate.

  **Method Health**      Method count by type and status, ACH return rate
                         by code, OAuth reauth events per hour,
                         micro-deposit verification completion rate.

  **Crypto Settlement**  Settlement duration p50/p95 by network, gas
                         spike block rate, bridge API error rate (Ramp vs
                         Transak), confirmation time by network.

  **Magic Link Funnel**  Sent → Delivered → Verified → Expired funnel
                         (hourly), time-to-verify p50/p95, resend rate,
                         magic link expiry rate.

  **Queue Health**       RabbitMQ consumer lag per queue, DLQ depth per
                         queue, consume duration p99, publish error rate,
                         dead-letter alert panel.

  **Compliance**         EDD triggered count (daily), OFAC block count,
                         KYC gate block rate by tier, EDD review duration
                         p95, rate limit hits.
  -----------------------------------------------------------------------

# **4. Structured Logging Schema**

All log entries from payout-service must be structured JSON. No
unstructured printf-style log lines. The base schema below applies to
every log entry. Event-specific fields are added on top.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Base log schema --- every log entry from payout-service            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"timestamp\": \"2025-06-16T09:00:00.000Z\", // ISO 8601 UTC          |
|                                                                       |
| \"level\": \"info\" \| \"warn\" \| \"error\" \| \"debug\",            |
|                                                                       |
| \"service\": \"payout-service\",                                      |
|                                                                       |
| \"version\": \"1.4.2\", // From package.json version                  |
|                                                                       |
| \"environment\": \"production\" \| \"staging\",                       |
|                                                                       |
| \"traceId\": \"uuid-v4\", // X-Trace-ID from inbound request or       |
| generated                                                             |
|                                                                       |
| \"spanId\": \"uuid-v4\",                                              |
|                                                                       |
| \"message\": \"Human-readable description of event\",                 |
|                                                                       |
| \"event\": \"payout.initiated\", // Machine-readable event tag        |
| (snake_case)                                                          |
|                                                                       |
| \"durationMs\": 42, // Populated for timed operations                 |
|                                                                       |
| // Context fields --- include where applicable                        |
|                                                                       |
| \"contractorId\": \"uuid\", // ALWAYS include if a contractor is      |
| known                                                                 |
|                                                                       |
| \"payoutRequestId\": \"uuid\", // Include for payout-specific events  |
|                                                                       |
| \"depositMethodId\": \"uuid\", // Include for method-specific events  |
|                                                                       |
| \"scheduleId\": \"uuid\", // Include for schedule events              |
|                                                                       |
| \"methodType\": \"BANK_STRIPE\",                                      |
|                                                                       |
| \"amountUSD\": 200.00,                                                |
|                                                                       |
| \"errorCode\": \"ERR_INSUFFICIENT_FUNDS\", // Include for error       |
| events                                                                |
|                                                                       |
| // NEVER log:                                                         |
|                                                                       |
| \"rawToken\": \"NEVER\", // Magic link tokens                         |
|                                                                       |
| \"ssn\": \"NEVER\",                                                   |
|                                                                       |
| \"routingNumber\": \"NEVER\", // Full bank account details            |
|                                                                       |
| \"accountNumber\": \"NEVER\",                                         |
|                                                                       |
| \"walletAddress\": \"log truncated only: 0x1234\...abcd\",            |
|                                                                       |
| \"cardNumber\": \"NEVER\",                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.1 Event-specific log fields**

  ---------------------------------------------------------------------------------------------------------------------------
  **Event tag**                        **Level**   **Required extra fields**                   **Notes**
  ------------------------------------ ----------- ------------------------------------------- ------------------------------
  **payout.initiated**                 info        contractorId, payoutRequestId, amountUSD,   Log on payout_requests row
                                                   methodType, initiationType                  creation.

  **payout.magic_link.sent**           info        contractorId, payoutRequestId               Log when RabbitMQ event
                                                                                               published. Do NOT log the
                                                                                               token.

  **payout.magic_link.verified**       info        contractorId, payoutRequestId, durationMs   Log on successful atomic Redis
                                                   (time to verify)                            DEL. Do NOT log the token.

  **payout.magic_link.expired**        warn        contractorId, payoutRequestId               Log when GET /verify returns
                                                                                               ERR_MAGIC_LINK_EXPIRED.

  **payout.magic_link.already_used**   warn        contractorId, payoutRequestId               Log when GET /verify returns
                                                                                               ERR_MAGIC_LINK_ALREADY_USED.
                                                                                               May indicate replay attempt.

  **payout.kyc.blocked**               info        contractorId, tier                          Log on KYC gate block. Never
                                                   (tier1\|tier2\|tier3\|first_payout_hold),   log the TIN or identity
                                                   subReason                                   document data.

  **payout.edd.triggered**             warn        contractorId, payoutRequestId, amountUSD    Log when EDD gate fires.

  **payout.ofac.blocked**              warn        contractorId, blockType                     Log OFAC block. Never log the
                                                   (country\|wallet\|name)                     specific SDN match detail in
                                                                                               application logs --- log to
                                                                                               compliance audit trail
                                                                                               separately.

  **payout.completed**                 info        contractorId, payoutRequestId, amountUSD,   Log on settlement
                                                   methodType, durationMs,                     confirmation.
                                                   externalTransactionId                       

  **payout.failed**                    error       contractorId, payoutRequestId, amountUSD,   Log on every failure.
                                                   methodType, errorCode, failureReason,       Level=error on
                                                   retryCount, finalFailure                    finalFailure=true, level=warn
                                                                                               on retryable failures.

  **payout.schedule.executed**         info        scheduleId, contractorId, frequency,        Log on each schedule cron
                                                   amountUSD, outcome                          evaluation.
                                                   (success\|failed\|skipped)                  

  **payout.schedule.skipped**          info        scheduleId, contractorId, frequency,        Log on schedule skip.
                                                   skipReason, consecutiveMissCount            

  **payout.method.deactivated**        warn        contractorId, depositMethodId, methodType,  Log on method deactivation.
                                                   reason                                      

  **payout.ach.return**                warn        contractorId, payoutRequestId,              Log on ACH return webhook.
                                                   achReturnCode, methodDeactivated            

  **payout.rabbitmq.publish.error**    error       routingKey, eventId, errorMessage           Log on RabbitMQ publish
                                                                                               failure. Critical ---
                                                                                               downstream consumers will not
                                                                                               fire.

  **payout.rabbitmq.dlq**              error       queueName, eventId, deliveryCount,          Log when a message is
                                                   errorMessage                                dead-lettered.
  ---------------------------------------------------------------------------------------------------------------------------

## **4.2 Log level policy**

  -------------------------------------------------------------------------
  **Level**   **When to use**
  ----------- -------------------------------------------------------------
  **debug**   Internal state transitions, Redis cache hits/misses,
              individual DB queries. Disabled in production. Enabled
              per-request via X-Debug-Trace header in staging.

  **info**    Normal business events: payout initiated, completed, method
              added, schedule executed. All events a compliance auditor
              would want to see.

  **warn**    Unexpected but non-fatal events: magic link expired, magic
              link already used, ACH return received, schedule skipped,
              OFAC block, KYC gate block, retryable payout failure.

  **error**   Fatal events requiring investigation: final payout failure,
              RabbitMQ publish error, DLQ message, unexpected uncaught
              exception, Stripe API persistent failure, split rounding
              fault (ERR_SPLIT_ROUNDING_FAULT).
  -------------------------------------------------------------------------

# **5. PagerDuty Alert Triggers**

+-----------------------------------------------------------------------+
| **All critical alerts must be implemented before payout-service goes  |
| live**                                                                |
|                                                                       |
| Critical-severity alerts page the on-call engineer immediately.       |
|                                                                       |
| Warning-severity alerts post to #payout-ops Slack channel.            |
|                                                                       |
| All alerts must be tested in staging with synthetic data before       |
| production deployment.                                                |
|                                                                       |
| Alert thresholds below are initial values --- tune after 30 days of   |
| production baseline data.                                             |
+=======================================================================+

## **5.1 Negative balance alert**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Alert name**     PayoutNegativeContractorBalance

  **Severity**       Critical --- immediate PagerDuty page

  **Trigger          Any contractor\'s availableBalanceUSD \< 0 in the
  condition**        earnings-service database. Evaluated by a Prometheus
                     recording rule or a scheduled query running every 60
                     seconds.

  **Why critical**   A negative balance indicates either a race condition
                     in the debit logic, a dispute reversal applied to an
                     already-zero balance, or data corruption. Funds have
                     been sent to a contractor for an amount not covered
                     by their balance. Immediate investigation required.

  **Prometheus       min(earnings_contractor_available_balance_usd) \< 0
  expression**       

  **Alert message**  CRITICAL: Contractor balance negative.
                     contractorId={label}. Balance={value}. Investigate
                     earnings-service debit atomicity immediately.

  **Auto-resolve**   When all balances return \>= 0.

  **Runbook**        1\. Identify contractor with negative balance via
                     earnings-service admin endpoint. 2. Determine which
                     debit transaction caused the negative. 3. Check
                     payout_audit_log for concurrent execution. 4. If
                     data corruption: halt all payouts for affected
                     contractor via admin pause endpoint. 5. Escalate to
                     engineering lead.
  -----------------------------------------------------------------------

## **5.2 OFAC match alert**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Alert name**     PayoutOFACMatchDetected

  **Severity**       Critical --- immediate PagerDuty page + compliance
                     team email

  **Trigger          payout_ofac_blocked_total increments by any amount.
  condition**        Any OFAC screening hit, regardless of block type.

  **Why critical**   An OFAC match means Marketeq has attempted to
                     process a payment to a sanctioned entity. Even a
                     blocked match requires immediate reporting review
                     and potential SAR filing depending on the match
                     type.

  **Prometheus       increase(payout_ofac_blocked_total\[5m\]) \> 0
  expression**       

  **Alert message**  CRITICAL: OFAC screening match detected.
                     blockType={label}. Payout blocked. Compliance team
                     must review immediately. contractorId in audit log.

  **Auto-resolve**   Does not auto-resolve --- requires manual
                     acknowledgement by compliance officer.

  **Runbook**        1\. Retrieve contractorId from payout_audit_log
                     (action=ofac.blocked, most recent). 2. Do NOT
                     contact the contractor --- OFAC regulations may
                     prohibit tipping off. 3. Contact compliance officer
                     immediately. 4. Compliance officer reviews against
                     SDN list and determines if SAR filing is required.
                     5. Account placed on compliance hold via admin
                     endpoint. 6. Document entire chain of events.
  -----------------------------------------------------------------------

## **5.3 Payout queue depth spike**

  ---------------------------------------------------------------------------------------------------------
  **Property**       **Value**
  ------------------ --------------------------------------------------------------------------------------
  **Alert name**     PayoutQueueDepthSpike

  **Severity**       Warning (Slack) at \> 100 messages. Critical (PagerDuty) at \> 1000 messages.

  **Trigger          payout_rabbitmq_consumer_lag{queue_name=\"payout-service.earnings.balance.updated\"}
  condition          \> 100 for 5 minutes.
  (warning)**        

  **Trigger          Same metric \> 1000 for 2 minutes. Or any DLQ depth \> 0 (payout_rabbitmq_dlq_depth \>
  condition          0).
  (critical)**       

  **Why it matters** If the earnings.balance.updated consumer is lagging, pending payout executions are not
                     being proactively checked against balance changes. This increases the window during
                     which a race condition could result in an underfunded execution attempt. DLQ depth \>
                     0 means messages have failed 3 delivery attempts --- manual intervention required.

  **Prometheus       payout_rabbitmq_dlq_depth \> 0 OR payout_rabbitmq_consumer_lag \> 1000
  expression         
  (critical)**       

  **Alert message**  CRITICAL: RabbitMQ DLQ has {value} messages / consumer lag {value}. Manual inspection
                     required. Check dead-letter-processor logs.

  **Auto-resolve**   When metric returns to 0 (DLQ) or below threshold (lag).

  **Runbook**        1\. Check dead-letter-processor service logs for error pattern. 2. Inspect DLQ
                     messages in RabbitMQ management console. 3. If processing error is transient: re-queue
                     from DLQ. 4. If processing error is systemic: halt re-queue, fix root cause, then
                     re-queue. 5. For consumer lag: check payout-service pod health, check DB connection
                     pool, scale consumer pods if needed.
  ---------------------------------------------------------------------------------------------------------

## **5.4 Magic link delivery failure**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Alert name**     PayoutMagicLinkDeliveryFailure

  **Severity**       Warning (Slack) at \< 90% delivery rate. Critical
                     (PagerDuty) at \< 70% or 5 consecutive delivery
                     failures.

  **Trigger          payout:magic_link_verify_rate_1h \< 0.7 (fewer than
  condition**        70% of sent magic links verified within 1 hour). Or:
                     increase(payout_magic_link_expired_total\[5m\]) \> 5
                     (more than 5 magic links expiring in 5 minutes
                     without verification).

  **Why it matters** If magic link emails are not being delivered,
                     contractors cannot complete withdrawals. A sudden
                     drop in verify rate may indicate: SendGrid outage,
                     email going to spam, notification-service failure,
                     or an increase in expired tokens due to poor UX
                     friction.

  **Prometheus       payout:magic_link_verify_rate_1h \< 0.7
  expression**       

  **Alert message**  WARNING: Magic link verify rate dropped to {value}
                     (threshold: 0.7). Check SendGrid delivery logs and
                     notification-service health.

  **Auto-resolve**   When rate returns above 0.7 for 10 minutes.

  **Runbook**        1\. Check notification-service logs for RabbitMQ
                     consumption errors on payout.magic_link.requested
                     queue. 2. Check SendGrid dashboard for delivery
                     failures or bounce rate. 3. Check spam folder
                     classification rate in SendGrid. 4. If
                     notification-service is healthy and SendGrid is
                     healthy: check if the drop correlates with a new
                     contractor cohort (may be using disposable email
                     addresses). 5. If SendGrid is down: escalate to ops
                     --- manual payout authorisation process may be
                     required.
  -----------------------------------------------------------------------

## **5.5 Additional alert definitions**

  --------------------------------------------------------------------------------------------------------------------------------------------------
  **Alert name**                   **Severity**   **Condition**                                                                  **Alert message**
  -------------------------------- -------------- ------------------------------------------------------------------------------ -------------------
  **PayoutStripeAPIErrorSpike**    Critical       rate(payout_stripe_api_errors_total\[5m\]) \> 0.1 (\> 10% error rate across    CRITICAL: Stripe
                                                  all Stripe operations for 3 minutes)                                           API error rate
                                                                                                                                 elevated. Payouts
                                                                                                                                 may be failing.
                                                                                                                                 Check Stripe status
                                                                                                                                 page.

  **PayoutCryptoSettlementSlow**   Warning        histogram_quantile(0.95, payout_crypto_settlement_duration_seconds) \> 14400   WARNING: Crypto
                                                  (p95 settlement \> 4 hours)                                                    settlement p95
                                                                                                                                 exceeding 4 hours.
                                                                                                                                 Network congestion
                                                                                                                                 likely. Review
                                                                                                                                 pending crypto
                                                                                                                                 payouts.

  **PayoutScheduleCronOverrun**    Critical       payout_schedule_cron_duration_seconds \> 1500 (cron tick \> 25 minutes ---     CRITICAL: Schedule
                                                  approaching 30-minute window)                                                  cron tick
                                                                                                                                 overrunning. Risk
                                                                                                                                 of missed schedule
                                                                                                                                 window. Check DB
                                                                                                                                 query performance
                                                                                                                                 and schedule count.

  **PayoutEDDBacklog**             Warning        payout_edd_review_duration_seconds bucket (2d) / payout_edd_triggered_total \> WARNING: EDD review
                                                  0.3 (\> 30% of EDD reviews taking more than 2 days)                            backlog growing.
                                                                                                                                 Compliance team
                                                                                                                                 capacity may be
                                                                                                                                 insufficient.
                                                                                                                                 Review edd_reviews
                                                                                                                                 queue.

  **PayoutACHReturnRateHigh**      Warning        rate(payout_withdrawal_failed_total{failure_code=\~\"ACH_RETURN.\*\"}\[1h\]) / WARNING: ACH return
                                                  rate(payout_withdrawal_initiated_total{method_type=\"BANK_MANUAL\"}\[1h\]) \>  rate elevated. May
                                                  0.05 (\> 5% ACH return rate)                                                   indicate poor
                                                                                                                                 account number
                                                                                                                                 quality in manual
                                                                                                                                 bank entry. Review
                                                                                                                                 recent BANK_MANUAL
                                                                                                                                 additions.

  **PayoutHealthCheckFailing**     Critical       probe_success{job=\"payout-service-health\"} == 0 for 1 minute                 CRITICAL:
                                                                                                                                 payout-service
                                                                                                                                 health check
                                                                                                                                 failing. Service
                                                                                                                                 may be down.
  --------------------------------------------------------------------------------------------------------------------------------------------------

# **6. Health Check Endpoint Specification**

## **6.1 GET /health --- liveness probe**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Purpose**        Kubernetes liveness probe. Answers: is the process
                     alive?

  **What it checks** Process is running and can respond to HTTP. No
                     dependency checks.

  **Response         HTTP 200. Body: { \"status\": \"ok\", \"timestamp\":
  (healthy)**        \"ISO8601\", \"service\": \"payout-service\",
                     \"version\": \"1.4.2\" }

  **Response         Does not return unhealthy --- if the process cannot
  (unhealthy)**      respond at all, it is dead and Kubernetes will
                     restart it.

  **Kubernetes       livenessProbe.httpGet.path: /health.
  config**           initialDelaySeconds: 10. periodSeconds: 30.
                     failureThreshold: 3.
  -----------------------------------------------------------------------

## **6.2 GET /health/ready --- readiness probe**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Purpose**        Kubernetes readiness probe. Answers: is the service
                     ready to receive traffic?

  **What it checks** 1\. PostgreSQL connection pool: can execute
                     SELECT 1. 2. Redis connection: can execute PING. 3.
                     RabbitMQ connection: channel is open.

  **Response (all    HTTP 200. Body as below.
  healthy)**         

  **Response (any    HTTP 503. Body shows which dependency failed.
  unhealthy)**       Kubernetes removes pod from load balancer.

  **Kubernetes       readinessProbe.httpGet.path: /health/ready.
  config**           initialDelaySeconds: 5. periodSeconds: 10.
                     failureThreshold: 2.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /health/ready --- response shape                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"status\": \"ok\" \| \"degraded\",                                   |
|                                                                       |
| \"timestamp\": \"2025-06-16T09:00:00.000Z\",                          |
|                                                                       |
| \"checks\": {                                                         |
|                                                                       |
| \"postgres\": {                                                       |
|                                                                       |
| \"status\": \"ok\" \| \"error\",                                      |
|                                                                       |
| \"latencyMs\": 3,                                                     |
|                                                                       |
| \"error\": null \| \"Connection timeout\"                             |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"redis\": {                                                          |
|                                                                       |
| \"status\": \"ok\" \| \"error\",                                      |
|                                                                       |
| \"latencyMs\": 1,                                                     |
|                                                                       |
| \"error\": null                                                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"rabbitmq\": {                                                       |
|                                                                       |
| \"status\": \"ok\" \| \"error\",                                      |
|                                                                       |
| \"latencyMs\": 2,                                                     |
|                                                                       |
| \"error\": null                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // HTTP 200 when all checks are \"ok\".                               |
|                                                                       |
| // HTTP 503 when any check is \"error\".                              |
|                                                                       |
| // status: \"degraded\" is returned at HTTP 503 to allow load         |
| balancers to                                                          |
|                                                                       |
| // distinguish between a fully dead service (no response) and a       |
|                                                                       |
| // dependency-failed service (503 with body).                         |
+=======================================================================+

## **6.3 GET /health/deep --- full dependency check**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Purpose**        Deep health check for ops debugging. Not used by
                     Kubernetes probes --- too slow and too chatty.

  **What it checks** All readiness checks + Stripe API reachability (GET
                     /v1/balance) + RabbitMQ queue depth + Redis key
                     count estimate + Ably connection status.

  **When to call**   Manually by ops engineers during incident
                     investigation. Not polled automatically.

  **Response**       HTTP 200 (even if some dependencies are degraded)
                     --- deep check always responds. Status in body
                     indicates degraded components.

  **Auth required**  Yes --- requires internal service token
                     (X-Internal-Token header). Not exposed externally.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /health/deep --- extended response shape                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"status\": \"ok\" \| \"degraded\",                                   |
|                                                                       |
| \"timestamp\": \"2025-06-16T09:00:00.000Z\",                          |
|                                                                       |
| \"checks\": {                                                         |
|                                                                       |
| \"postgres\": { \"status\": \"ok\", \"latencyMs\": 3 },               |
|                                                                       |
| \"redis\": { \"status\": \"ok\", \"latencyMs\": 1 },                  |
|                                                                       |
| \"rabbitmq\": { \"status\": \"ok\", \"latencyMs\": 2,                 |
| \"queueDepths\": { \"payout-service.earnings.balance.updated\": 0 }   |
| },                                                                    |
|                                                                       |
| \"stripe\": { \"status\": \"ok\", \"latencyMs\": 210, \"error\": null |
| },                                                                    |
|                                                                       |
| \"ably\": { \"status\": \"ok\", \"connectedChannels\": 4512 },        |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"meta\": {                                                           |
|                                                                       |
| \"activePayouts\": 12, // payout_requests WHERE status IN             |
| (processing, awaiting_verification)                                   |
|                                                                       |
| \"pendingSchedules\": 847, // payout_schedules WHERE isActive=true    |
|                                                                       |
| \"dlqDepth\": 0                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Prometheus Recording Rules**

Recording rules pre-compute expensive queries so dashboards and alerts
load instantly. Add these to the payout-service Prometheus rules file.

+-------------------------------------------------------------------------------------+
| typescript                                                                          |
+-------------------------------------------------------------------------------------+
| \# payout-service.rules.yml                                                         |
|                                                                                     |
| groups:                                                                             |
|                                                                                     |
| \- name: payout_service                                                             |
|                                                                                     |
| interval: 30s                                                                       |
|                                                                                     |
| rules:                                                                              |
|                                                                                     |
| \# Withdrawal success rate over 5 minutes                                           |
|                                                                                     |
| \- record: payout:withdrawal_success_rate_5m                                        |
|                                                                                     |
| expr: \|                                                                            |
|                                                                                     |
| rate(payout_withdrawal_completed_total\[5m\])                                       |
|                                                                                     |
| / (rate(payout_withdrawal_completed_total\[5m\]) +                                  |
| rate(payout_withdrawal_failed_total\[5m\]))                                         |
|                                                                                     |
| \# Failure rate by method type over 1 hour                                          |
|                                                                                     |
| \- record: payout:withdrawal_failure_rate_by_method_1h                              |
|                                                                                     |
| expr: \|                                                                            |
|                                                                                     |
| sum by (method_type)                                                                |
| (rate(payout_withdrawal_failed_total{final_failure=\"true\"}\[1h\]))                |
|                                                                                     |
| / sum by (method_type) (rate(payout_withdrawal_initiated_total\[1h\]))              |
|                                                                                     |
| \# Magic link verify rate over 1 hour                                               |
|                                                                                     |
| \- record: payout:magic_link_verify_rate_1h                                         |
|                                                                                     |
| expr: \|                                                                            |
|                                                                                     |
| rate(payout_magic_link_verified_total\[1h\])                                        |
|                                                                                     |
| / rate(payout_magic_link_sent_total\[1h\])                                          |
|                                                                                     |
| \# Schedule execution lag p99 by frequency                                          |
|                                                                                     |
| \- record: payout:schedule_lag_p99_by_frequency                                     |
|                                                                                     |
| expr: \|                                                                            |
|                                                                                     |
| histogram_quantile(0.99,                                                            |
|                                                                                     |
| sum by (frequency, le) (rate(payout_schedule_execution_lag_seconds_bucket\[30m\]))  |
|                                                                                     |
| )                                                                                   |
|                                                                                     |
| \# ACH return rate over 1 hour                                                      |
|                                                                                     |
| \- record: payout:ach_return_rate_1h                                                |
|                                                                                     |
| expr: \|                                                                            |
|                                                                                     |
| sum(rate(payout_withdrawal_failed_total{failure_code=\~\"ACH_RETURN\_.\*\"}\[1h\])) |
|                                                                                     |
| / sum(rate(payout_withdrawal_initiated_total{method_type=\~\"BANK.\*\"}\[1h\]))     |
+=====================================================================================+

# **8. References**

  -----------------------------------------------------------------------
  **Document**          **Relevant to**
  --------------------- -------------------------------------------------
  **PS-02 ---           payout_requests status transitions that generate
  Withdrawal Flow**     metric and log events.

  **PS-14 --- Magic     Magic link lifecycle events (sent, verified,
  Link Verification**   expired, already_used).

  **PS-17 --- Schedule  Schedule cron tick metrics, execution lag, skip
  Execution Engine**    reasons.

  **PS-21 ---           OFAC block logging, EDD audit log, 7-year
  Compliance Reference  retention.
  (Engineering)**       

  **PS-23 --- RabbitMQ  Queue names, DLQ config, event routing keys.
  Events**              

  **PS-24 --- Error     Error codes used as metric labels and log fields.
  Catalog**             
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-30 \| v1.0
