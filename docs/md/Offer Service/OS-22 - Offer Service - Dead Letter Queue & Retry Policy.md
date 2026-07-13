**OS-22**

**Offer Service --- Dead Letter Queue & Retry Policy**

**Max retries:** 10 **Backoff:** exponential (2\^n minutes) **DLQ
retention:** 7 days **Alert:** structured log + optional Slack webhook

This document covers the complete Dead Letter Queue (DLQ) implementation
for offer-service. It addresses two separate retry concerns: the Outbox
Retry (offer-service publishing to RabbitMQ) and the Consumer DLQ Retry
(consuming services failing to process a received message). Both are
documented here because offer-service owns the RabbitMQ topology that
both depend on.

**File Map**

  ---------- ----------------------------------------------- ----------------------
  **Step**   **File Path**                                   **Purpose**

  **1**      (reference)                                     Two retry concerns:
                                                             outbox retry vs
                                                             consumer DLQ retry

  **2**      src/outbox/outbox.processor.ts                  OutboxProcessor with
                                                             full retry + backoff +
                                                             FAILED logic

  **3**      src/common/alert/alert.service.ts               AlertService --- Slack
                                                             webhook on FAILED
                                                             outbox events

  **4**      src/messaging/constants/rabbitmq.constants.ts   DLQ constants (already
             (update)                                        in OS-19, verify they
                                                             exist)

  **5**      (reference)                                     Consumer DLQ retry
                                                             policy --- how
                                                             downstream services
                                                             should implement it

  **6**      (reference)                                     DLQ monitoring and
                                                             manual recovery
                                                             procedures

  **7**      (reference)                                     Verification checklist
  ---------- ----------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Two Separate Retry Concerns**                              |
|                                                                       |
| Outbox retry vs Consumer DLQ retry --- understand both before         |
| touching this code                                                    |
+-----------------------------------------------------------------------+

The word \"retry\" appears in two different places in this system.
Confusing them causes hard-to-debug bugs. Read this section carefully
before writing any retry-related code.

**Concern 1 --- Outbox Retry (offer-service side)**

Problem: offer-service has a state change to publish (e.g. offer
accepted) but RabbitMQ is temporarily unreachable.

  --------------------- -------------------------------------------------
  **Where it runs**     offer-service OutboxProcessor (scheduler cron)

  **What retries**      Publishing a pending outbox row to the RabbitMQ
                        broker

  **Max attempts**      10 --- after this, the outbox row status = FAILED

  **Backoff**           Exponential: scheduled_at = NOW() +
                        (2\^retryCount minutes). Attempt 1 = +2min, 2 =
                        +4min, 3 = +8min, \... 10 = +1024min (\~17h)

  **Trigger**           RabbitMQ is down or the ConfirmChannel nacks the
                        message

  **On exhaustion**     outbox row status → FAILED. Structured ERROR log
                        emitted. Optional Slack alert.

  **Recovery**          Fix the broker issue. Update status = PENDING and
                        retry_count = 0 on the FAILED rows. Poller picks
                        them up.

  **Code location**     src/outbox/outbox.processor.ts --- Step 2 of this
                        document
  --------------------- -------------------------------------------------

**Concern 2 --- Consumer DLQ Retry (consuming service side)**

Problem: A consuming service (contracts-service, notification-service,
messaging-service) receives a message from RabbitMQ but fails to process
it (bug in consumer, dependency down, etc.).

  --------------------- -------------------------------------------------
  **Where it runs**     contracts-service, notification-service,
                        messaging-service (not offer-service)

  **What retries**      Processing a received RabbitMQ message

  **Max attempts**      10 --- consumer tracks via x-death header count

  **Backoff**           Consumer NACKs with requeue=false. RabbitMQ
                        routes to DLX → DLQ. Consumer re-queues from DLQ
                        with a delay.

  **Trigger**           Consumer throws an exception during message
                        processing

  **On exhaustion**     Message stays in DLQ permanently (7-day TTL). DLQ
                        depth \> 0 triggers monitoring alert.

  **Recovery**          Manual re-queue using rabbitmqadmin or shovel
                        plugin after fixing the consumer bug.

  **Code location**     offer-service only declares the topology.
                        Consumer code lives in consumer services.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| offer-service declares the DLX/DLQ topology for all consumer queues   |
| (OS-19).                                                              |
|                                                                       |
| offer-service also has its own outbox retry (this document, Step 2).  |
|                                                                       |
| The consumer DLQ retry logic lives in the consuming services (Step 5  |
| is a reference guide).                                                |
|                                                                       |
| This document covers both the offer-service side AND provides the     |
| consumer-side pattern.                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 OutboxProcessor --- Full Implementation with Retry &         |
| Backoff**                                                             |
|                                                                       |
| The complete outbox poller with retry logic                           |
+-----------------------------------------------------------------------+

The OutboxProcessor is a scheduled cron job that polls the outbox table,
publishes pending events to RabbitMQ, and handles failures with
exponential backoff. It is the only component in offer-service that
retries failed RabbitMQ publications.

+-----------------------------------------------------------------------+
| Exponential backoff schedule (2\^retryCount minutes):                 |
|                                                                       |
| Attempt 1 (retryCount = 0 → 1): wait 2\^1 = 2 minutes                 |
|                                                                       |
| Attempt 2 (retryCount = 1 → 2): wait 2\^2 = 4 minutes                 |
|                                                                       |
| Attempt 3 (retryCount = 2 → 3): wait 2\^3 = 8 minutes                 |
|                                                                       |
| Attempt 4: 16 min \| Attempt 5: 32 min \| Attempt 6: 64 min           |
|                                                                       |
| Attempt 7: 128 min \| Attempt 8: 256 min \| Attempt 9: 512 min        |
|                                                                       |
| Attempt 10 (max): 1024 minutes ≈ 17 hours                             |
|                                                                       |
| Total window before FAILED: \~34 hours                                |
|                                                                       |
| This gives the broker time to recover from transient outages.         |
|                                                                       |
| If RabbitMQ is down for 34+ hours, the event fails permanently.       |
|                                                                       |
| The FAILED rows remain for manual inspection and requeue.             |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/outbox/outbox.processor.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { Cron, CronExpression } from \'@nestjs/schedule\';            |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, DataSource } from \'typeorm\';                   |
|                                                                       |
| import { OutboxEvent, OutboxEventStatus } from                        |
| \'./entities/outbox-event.entity\';                                   |
|                                                                       |
| import { RabbitMQPublisher } from                                     |
| \'../messaging/rabbitmq.publisher\';                                  |
|                                                                       |
| import { AlertService } from \'../common/alert/alert.service\';       |
|                                                                       |
| import { OfferRoutingKey } from                                       |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| /\*\* Maximum number of publish attempts before marking the event as  |
| FAILED. \*/                                                           |
|                                                                       |
| const MAX_RETRY_ATTEMPTS = 10;                                        |
|                                                                       |
| /\*\* How many events to claim per cron tick. \*/                     |
|                                                                       |
| const BATCH_SIZE = 10;                                                |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OutboxProcessor --- Polls the outbox table and publishes pending   |
| events.                                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Cron schedule: every 5 seconds.                                    |
|                                                                       |
| \* Claims PENDING outbox rows using SELECT FOR UPDATE SKIP LOCKED.    |
|                                                                       |
| \* Publishes each event using RabbitMQPublisher (publisher confirms). |
|                                                                       |
| \* On success: deletes the row.                                       |
|                                                                       |
| \* On failure: increments retry_count, sets exponential backoff on    |
| scheduled_at.                                                         |
|                                                                       |
| \* After MAX_RETRY_ATTEMPTS: marks row as FAILED, logs ERROR, fires   |
| Slack alert.                                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* SKIP LOCKED: ensures multiple service instances (horizontal        |
| scaling) do not                                                       |
|                                                                       |
| \* double-process the same outbox row.                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OutboxProcessor {                                        |
|                                                                       |
| private readonly logger = new Logger(OutboxProcessor.name);           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(OutboxEvent)                                       |
|                                                                       |
| private readonly outboxRepo: Repository\<OutboxEvent\>,               |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly publisher: RabbitMQPublisher,                        |
|                                                                       |
| private readonly alert: AlertService,                                 |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Main poller --- runs every 5 seconds                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| \@Cron(CronExpression.EVERY_5_SECONDS)                                |
|                                                                       |
| async processPendingEvents(): Promise\<void\> {                       |
|                                                                       |
| // Skip if publisher is not ready (channel not open).                 |
|                                                                       |
| if (!this.publisher.isReady()) return;                                |
|                                                                       |
| await this.claimAndPublishBatch();                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Claim a batch of PENDING outbox events using SELECT FOR UPDATE     |
| SKIP LOCKED.                                                          |
|                                                                       |
| \* SKIP LOCKED: if another instance has locked a row, this instance   |
| skips it.                                                             |
|                                                                       |
| \* This prevents double-processing when multiple service replicas     |
| run.                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async claimAndPublishBatch(): Promise\<void\> {               |
|                                                                       |
| // Use a transaction to claim the batch atomically.                   |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| // Claim up to BATCH_SIZE rows, skip any currently locked by another  |
| instance.                                                             |
|                                                                       |
| const rows = await em.query\<OutboxEvent\[\]\>(\`                     |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PROCESSING\'                                           |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.outbox                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND scheduled_at \<= NOW()                                            |
|                                                                       |
| ORDER BY scheduled_at ASC                                             |
|                                                                       |
| LIMIT \$1                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING                                                             |
|                                                                       |
| id, aggregate_id AS \"aggregateId\",                                  |
|                                                                       |
| event_type AS \"eventType\",                                          |
|                                                                       |
| routing_key AS \"routingKey\",                                        |
|                                                                       |
| exchange, payload,                                                    |
|                                                                       |
| retry_count AS \"retryCount\"                                         |
|                                                                       |
| \`, \[BATCH_SIZE\]);                                                  |
|                                                                       |
| if (rows.length === 0) return;                                        |
|                                                                       |
| this.logger.debug(\`Claimed \${rows.length} outbox event(s) for       |
| publishing.\`);                                                       |
|                                                                       |
| // Publish each claimed row. This happens outside the transaction     |
|                                                                       |
| // because RabbitMQ publish is an I/O operation that should not       |
|                                                                       |
| // block the transaction longer than needed.                          |
|                                                                       |
| // The row is already PROCESSING in the DB.                           |
|                                                                       |
| await Promise.all(                                                    |
|                                                                       |
| rows.map(row =\> this.publishAndSettle(row)),                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Publish one outbox event to RabbitMQ and update its status.        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Success path: delete the row (published, no longer needed).        |
|                                                                       |
| \* Failure path: increment retry_count, set exponential backoff,      |
| restore PENDING.                                                      |
|                                                                       |
| \* After 10 failures: mark FAILED, fire alert.                        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async publishAndSettle(row: OutboxEvent): Promise\<void\> {   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.publisher.publish({                                        |
|                                                                       |
| routingKey: row.routingKey as OfferRoutingKey,                        |
|                                                                       |
| payload: row.payload,                                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Success: delete the row. PUBLISHED rows do not need to be stored.  |
|                                                                       |
| await this.outboxRepo.delete({ id: row.id });                         |
|                                                                       |
| this.logger.debug(\`Published and deleted outbox event:               |
| \${row.eventType} (\${row.id})\`);                                    |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| await this.handlePublishFailure(row, err);                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Handle a failed publish attempt.                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Increments retry_count.                                            |
|                                                                       |
| \* If retry_count \< MAX_RETRY_ATTEMPTS: set exponential backoff,     |
| restore PENDING.                                                      |
|                                                                       |
| \* If retry_count \>= MAX_RETRY_ATTEMPTS: mark FAILED, fire           |
| engineering alert.                                                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async handlePublishFailure(                                   |
|                                                                       |
| row: OutboxEvent,                                                     |
|                                                                       |
| err: unknown,                                                         |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const newRetryCount = row.retryCount + 1;                             |
|                                                                       |
| const errMsg = err instanceof Error ? err.message : String(err);      |
|                                                                       |
| if (newRetryCount \>= MAX_RETRY_ATTEMPTS) {                           |
|                                                                       |
| // \-\-\-- FAILED: max retries exhausted \-\-\--                      |
|                                                                       |
| await this.outboxRepo.update(row.id, {                                |
|                                                                       |
| status: OutboxEventStatus.FAILED,                                     |
|                                                                       |
| retryCount: newRetryCount,                                            |
|                                                                       |
| lastError: errMsg,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Structured ERROR log --- captured by log aggregator (DataDog,      |
| CloudWatch, etc.)                                                     |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`OUTBOX FAILED after \${newRetryCount} retries:\` +                  |
|                                                                       |
| \` eventType=\${row.eventType}\` +                                    |
|                                                                       |
| \` outboxId=\${row.id}\` +                                            |
|                                                                       |
| \` aggregateId=\${row.aggregateId}\` +                                |
|                                                                       |
| \` lastError=\${errMsg}\`,                                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Fire engineering alert (Slack webhook if configured).              |
|                                                                       |
| await this.alert.sendOutboxFailedAlert({                              |
|                                                                       |
| outboxId: row.id,                                                     |
|                                                                       |
| aggregateId: row.aggregateId,                                         |
|                                                                       |
| eventType: row.eventType,                                             |
|                                                                       |
| retryCount: newRetryCount,                                            |
|                                                                       |
| lastError: errMsg,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // \-\-\-- PENDING: schedule retry with exponential backoff \-\-\--   |
|                                                                       |
| // backoffMinutes = 2\^retryCount (minutes)                           |
|                                                                       |
| // Attempt 1: 2min, 2: 4min, 3: 8min, 4: 16min, \... 9: 512min        |
|                                                                       |
| const backoffMinutes = Math.pow(2, newRetryCount);                    |
|                                                                       |
| const scheduledAt = new Date(                                         |
|                                                                       |
| Date.now() + backoffMinutes \* 60 \* 1000                             |
|                                                                       |
| );                                                                    |
|                                                                       |
| await this.outboxRepo.update(row.id, {                                |
|                                                                       |
| status: OutboxEventStatus.PENDING,                                    |
|                                                                       |
| retryCount: newRetryCount,                                            |
|                                                                       |
| lastError: errMsg,                                                    |
|                                                                       |
| scheduledAt,                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.logger.warn(                                                     |
|                                                                       |
| \`Outbox publish failed (attempt                                      |
| \${newRetryCount}/\${MAX_RETRY_ATTEMPTS}):\` +                        |
|                                                                       |
| \` eventType=\${row.eventType}\` +                                    |
|                                                                       |
| \` outboxId=\${row.id}\` +                                            |
|                                                                       |
| \` nextRetry=\${scheduledAt.toISOString()}\` +                        |
|                                                                       |
| \` error=\${errMsg}\`,                                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Manual recovery helper (called from runbook, not by cron)          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* resetFailedEvents() --- Resets FAILED outbox events to PENDING.    |
|                                                                       |
| \* Called manually after fixing the underlying broker issue.          |
|                                                                       |
| \* NOT called automatically.                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage (from a NestJS REPL or admin endpoint):                      |
|                                                                       |
| \* await outboxProcessor.resetFailedEvents();                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async resetFailedEvents(): Promise\<number\> {                        |
|                                                                       |
| const result = await this.outboxRepo                                  |
|                                                                       |
| .createQueryBuilder()                                                 |
|                                                                       |
| .update(OutboxEvent)                                                  |
|                                                                       |
| .set({                                                                |
|                                                                       |
| status: OutboxEventStatus.PENDING,                                    |
|                                                                       |
| retryCount: 0,                                                        |
|                                                                       |
| lastError: null,                                                      |
|                                                                       |
| scheduledAt: new Date(),                                              |
|                                                                       |
| })                                                                    |
|                                                                       |
| .where(\'status = :status\', { status: OutboxEventStatus.FAILED })    |
|                                                                       |
| .execute();                                                           |
|                                                                       |
| const count = result.affected ?? 0;                                   |
|                                                                       |
| this.logger.log(\`Reset \${count} FAILED outbox events to             |
| PENDING.\`);                                                          |
|                                                                       |
| return count;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 AlertService --- alert.service.ts**                          |
|                                                                       |
| Engineering alert when outbox events reach FAILED status              |
+-----------------------------------------------------------------------+

AlertService sends a Slack webhook notification when an outbox event is
permanently failed after 10 retries. It is a non-critical service --- if
the Slack call fails, it logs a warning but does not throw. The
structured log from Step 2 is always written regardless of whether Slack
is configured.

+-----------------------------------------------------------------------+
| Two alert mechanisms work together:                                   |
|                                                                       |
| 1\. Structured ERROR log (always): the logger.error() call in         |
| OutboxProcessor.                                                      |
|                                                                       |
| Log aggregators (DataDog, CloudWatch, Loki) can create monitors on    |
| this pattern.                                                         |
|                                                                       |
| Pattern to monitor: \"OUTBOX FAILED after\" in logs from              |
| OutboxProcessor context.                                              |
|                                                                       |
| 2\. Slack webhook (optional): configured via ALERT_SLACK_WEBHOOK_URL  |
| env var.                                                              |
|                                                                       |
| Only fires when ALERT_SLACK_WEBHOOK_URL is set.                       |
|                                                                       |
| In development and test: var is unset, no Slack noise.                |
|                                                                       |
| In staging and production: set the webhook URL.                       |
|                                                                       |
| The structured log is the primary alert. Slack is convenience.        |
|                                                                       |
| Never rely solely on Slack for critical alerts.                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/alert/alert.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { OfferConfig } from \'../../config/offer.config\';            |
|                                                                       |
| export interface OutboxFailedAlertPayload {                           |
|                                                                       |
| outboxId: string;                                                     |
|                                                                       |
| aggregateId: string; // offerId                                       |
|                                                                       |
| eventType: string;                                                    |
|                                                                       |
| retryCount: number;                                                   |
|                                                                       |
| lastError: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* AlertService --- Sends engineering alerts for critical failures.   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Currently supports:                                                |
|                                                                       |
| \* - Slack webhook on OUTBOX FAILED events                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* ALERT_SLACK_WEBHOOK_URL must be set in .env to enable Slack        |
| alerts.                                                               |
|                                                                       |
| \* If not set, only the structured log is written.                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class AlertService {                                           |
|                                                                       |
| private readonly logger = new Logger(AlertService.name);              |
|                                                                       |
| private readonly slackWebhookUrl: string \| undefined;                |
|                                                                       |
| private readonly serviceName: string;                                 |
|                                                                       |
| private readonly environment: string;                                 |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| const cfg = this.config.get\<OfferConfig\>(\'offer\');                |
|                                                                       |
| this.slackWebhookUrl = cfg.alert?.slackWebhookUrl;                    |
|                                                                       |
| this.serviceName = \'offer-service\';                                 |
|                                                                       |
| this.environment = process.env.NODE_ENV ?? \'development\';           |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* sendOutboxFailedAlert()                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called when an outbox event exhausts all 10 retry attempts.        |
|                                                                       |
| \* Always logs internally. Sends to Slack if webhook is configured.   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async sendOutboxFailedAlert(payload: OutboxFailedAlertPayload):       |
| Promise\<void\> {                                                     |
|                                                                       |
| if (!this.slackWebhookUrl) {                                          |
|                                                                       |
| this.logger.warn(\'ALERT_SLACK_WEBHOOK_URL not set. Slack alert       |
| skipped.\');                                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| const message = this.buildSlackMessage(payload);                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const response = await fetch(this.slackWebhookUrl, {                  |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| headers: { \'Content-Type\': \'application/json\' },                  |
|                                                                       |
| body: JSON.stringify(message),                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!response.ok) {                                                   |
|                                                                       |
| this.logger.warn(\`Slack alert HTTP error: \${response.status}        |
| \${response.statusText}\`);                                           |
|                                                                       |
| } else {                                                              |
|                                                                       |
| this.logger.log(\'Slack alert sent successfully.\');                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Never throw from AlertService. The alert is best-effort.           |
|                                                                       |
| this.logger.warn(\`Slack alert failed: \${err instanceof Error ?      |
| err.message : String(err)}\`);                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private buildSlackMessage(p: OutboxFailedAlertPayload): object {      |
|                                                                       |
| const isProduction = this.environment === \'production\';             |
|                                                                       |
| return {                                                              |
|                                                                       |
| text: \`:red_circle: \*\[\${this.environment.toUpperCase()}\] OUTBOX  |
| FAILED --- offer-service\*\`,                                         |
|                                                                       |
| blocks: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| type: \'header\',                                                     |
|                                                                       |
| text: {                                                               |
|                                                                       |
| type: \'plain_text\',                                                 |
|                                                                       |
| text: \`🔴 OUTBOX FAILED --- \${this.environment.toUpperCase()}\`,    |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| type: \'section\',                                                    |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Service:\*\\n\${this.serviceName}\` },  |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Event                                   |
| Type:\*\\n\\\`\${p.eventType}\\\`\` },                                |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Retry Count:\*\\n\${p.retryCount}\` },  |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Offer ID:\*\\n\${p.aggregateId}\` },    |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Outbox ID:\*\\n\${p.outboxId}\` },      |
|                                                                       |
| { type: \'mrkdwn\', text: \`\*Last                                    |
| Error:\*\\n\${p.lastError.substring(0, 200)}\` },                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| type: \'section\',                                                    |
|                                                                       |
| text: {                                                               |
|                                                                       |
| type: \'mrkdwn\',                                                     |
|                                                                       |
| text: \[                                                              |
|                                                                       |
| \`\*Immediate action required:\*\`,                                   |
|                                                                       |
| \`1. Check RabbitMQ broker health\`,                                  |
|                                                                       |
| \`2. Query FAILED events: \\\`SELECT \* FROM offer_service.outbox     |
| WHERE status=\'FAILED\';\\\`\`,                                       |
|                                                                       |
| \`3. Fix the underlying issue\`,                                      |
|                                                                       |
| \`4. Reset: \\\`UPDATE offer_service.outbox SET status=\'PENDING\',   |
| retry_count=0, scheduled_at=NOW() WHERE status=\'FAILED\';\\\`\`,     |
|                                                                       |
| \].join(\'\\n\'),                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| \],                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Register AlertService in AppModule**

AlertService must be added as a provider in a shared module so
OutboxProcessor can inject it. Add it to CommonModule or create an
AlertModule.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/alert/alert.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { AlertService } from \'./alert.service\';                     |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| providers: \[AlertService\],                                          |
|                                                                       |
| exports: \[AlertService\],                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AlertModule {}                                           |
+-----------------------------------------------------------------------+

Then import AlertModule in AppModule alongside RedisModule and
MessagingModule:

+-----------------------------------------------------------------------+
| // In apps/offer-service/src/app.module.ts:                           |
|                                                                       |
| import { AlertModule } from \'./common/alert/alert.module\';          |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot(\...),                                           |
|                                                                       |
| TypeOrmModule.forRootAsync(\...),                                     |
|                                                                       |
| AuthModule,                                                           |
|                                                                       |
| RedisModule,                                                          |
|                                                                       |
| MessagingModule,                                                      |
|                                                                       |
| AlertModule, // \<\-- ADD THIS                                        |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \...                                                                  |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Environment Variables**                                      |
|                                                                       |
| Required and optional variables for retry and alerting                |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: .env (add to existing offer-service environment variables)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Outbox Retry Configuration                                         |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Maximum number of outbox publish attempts before marking FAILED.   |
|                                                                       |
| \# Confirmed value: 10. Change requires updating MAX_RETRY_ATTEMPTS   |
| in outbox.processor.ts.                                               |
|                                                                       |
| OUTBOX_MAX_RETRY_ATTEMPTS=10                                          |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Engineering Alert Configuration                                    |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Slack incoming webhook URL. Leave empty to disable Slack alerts.   |
|                                                                       |
| \# Required in production. Optional in development and staging.       |
|                                                                       |
| \# Get this from: Slack workspace -\> Apps -\> Incoming Webhooks      |
|                                                                       |
| \# Format: https://hooks.slack.com/services/T\.../B\.../\...          |
|                                                                       |
| ALERT_SLACK_WEBHOOK_URL=                                              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# DLQ Retention (already set in OS-19 topology)                      |
|                                                                       |
| \# These values are documented here for reference.                    |
|                                                                       |
| \# DLQ_MESSAGE_TTL_MS is set in rabbitmq.constants.ts, not .env.      |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# DLQ message TTL: 7 days (604800000 ms). Hardcoded in               |
| rabbitmq.constants.ts.                                                |
|                                                                       |
| \# DLQ_MESSAGE_TTL_MS = 604800000                                     |
+-----------------------------------------------------------------------+

**Add alert config to offer.config.ts**

Add the alert configuration block to the Joi-validated config used in
OS-09:

+-----------------------------------------------------------------------+
| // In apps/offer-service/src/config/offer.config.ts:                  |
|                                                                       |
| // Add this to the exported config object:                            |
|                                                                       |
| alert: {                                                              |
|                                                                       |
| slackWebhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL ?? undefined,    |
|                                                                       |
| },                                                                    |
|                                                                       |
| // OfferConfig interface update:                                      |
|                                                                       |
| export interface OfferConfig {                                        |
|                                                                       |
| // \... existing fields \...                                          |
|                                                                       |
| alert: {                                                              |
|                                                                       |
| slackWebhookUrl?: string;                                             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Consumer DLQ Retry Pattern**                                 |
|                                                                       |
| Reference guide for contracts-service, notification-service,          |
| messaging-service                                                     |
+-----------------------------------------------------------------------+

This is not code that goes in offer-service. It is the reference pattern
that engineers building consuming services must follow. The DLQ topology
is already declared by offer-service (OS-19). Consuming services only
need to implement the retry-aware consumer logic.

**How Consumer DLQ Retry Works**

When a consuming service receives a message and fails to process it, it
nacks the message with requeue=false. RabbitMQ routes the nacked message
to the DLX. The message lands in the DLQ with an x-death header
recording how many times it has been dead-lettered. A separate consumer
on the DLQ re-queues the message back to the original queue after a
delay for retry.

+-----------------------------------------------------------------------+
| // Consumer DLQ retry pattern (reference --- for consumer services):  |
|                                                                       |
| // x-death header structure (added by RabbitMQ):                      |
|                                                                       |
| // {                                                                  |
|                                                                       |
| // \"x-death\": \[                                                    |
|                                                                       |
| // {                                                                  |
|                                                                       |
| // \"count\": 3, // Total times this message has been dead-lettered   |
|                                                                       |
| // \"queue\": \"marketeq.offers.contracts\",                          |
|                                                                       |
| // \"reason\": \"rejected\",                                          |
|                                                                       |
| // \"time\": \<timestamp\>,                                           |
|                                                                       |
| // \"exchange\": \"marketeq.offers\",                                 |
|                                                                       |
| // \"routing-keys\":\[\"offer.accepted\"\]                            |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // \]                                                                 |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // Consumer retry handler:                                            |
|                                                                       |
| async function handleMessage(message, channel) {                      |
|                                                                       |
| const payload = JSON.parse(message.content.toString());               |
|                                                                       |
| // Check death count for retry limit.                                 |
|                                                                       |
| const xDeath = message.properties.headers\[\"x-death\"\];             |
|                                                                       |
| const deathCount = xDeath?.\[0\]?.count ?? 0;                         |
|                                                                       |
| const MAX_CONSUMER_RETRIES = 10;                                      |
|                                                                       |
| if (deathCount \>= MAX_CONSUMER_RETRIES) {                            |
|                                                                       |
| // Permanently failed. Ack the DLQ message (removes from DLQ).        |
|                                                                       |
| // The message is lost at this point --- alert engineering.           |
|                                                                       |
| logger.error(\`MESSAGE PERMANENTLY FAILED after \${deathCount}        |
| retries:\` +                                                          |
|                                                                       |
| \` eventType=\${payload.eventType} offerId=\${payload.offerId}\` +    |
|                                                                       |
| \` eventId=\${payload.eventId}\`);                                    |
|                                                                       |
| channel.ack(message);                                                 |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Process the message.                                               |
|                                                                       |
| await processEvent(payload);                                          |
|                                                                       |
| channel.ack(message);                                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Failed processing. NACK with requeue=false --- routes to DLX.      |
|                                                                       |
| // RabbitMQ increments x-death.count automatically.                   |
|                                                                       |
| logger.warn(\`Message processing failed (death count:                 |
| \${deathCount}): \${err.message}\`);                                  |
|                                                                       |
| channel.nack(message, false, false); // false=single,                 |
| false=no-requeue                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Note: For DLQ-based retry with delay, the consumer reads from the  |
| DLQ                                                                   |
|                                                                       |
| // and republishes back to the original queue with a delay:           |
|                                                                       |
| async function processDLQMessage(message, channel) {                  |
|                                                                       |
| const xDeath = message.properties.headers\[\"x-death\"\];             |
|                                                                       |
| const deathCount = xDeath?.\[0\]?.count ?? 0;                         |
|                                                                       |
| const queueName = xDeath?.\[0\]?.queue;                               |
|                                                                       |
| // Delay increases with each death count (exponential backoff).       |
|                                                                       |
| const delayMs = Math.min(Math.pow(2, deathCount) \* 1000, 30 \* 60 \* |
| 1000); // max 30min                                                   |
|                                                                       |
| await new Promise(resolve =\> setTimeout(resolve, delayMs));          |
|                                                                       |
| // Re-publish to the original queue.                                  |
|                                                                       |
| channel.publish(\"marketeq.offers\",                                  |
| xDeath\[0\]\[\"routing-keys\"\]\[0\], message.content, {              |
|                                                                       |
| persistent: true,                                                     |
|                                                                       |
| headers: message.properties.headers, // Preserve x-death for count    |
| tracking                                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| channel.ack(message);                                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 DLQ Monitoring & Manual Recovery Procedures**                |
|                                                                       |
| What to do when messages land in a DLQ                                |
+-----------------------------------------------------------------------+

**Monitor DLQ Depth**

The primary signal that something has failed is messages accumulating in
a DLQ. Monitor all three DLQs. A depth greater than 0 requires
investigation.

+-------------------------------------------------------------------------+
| \# ============================================================         |
|                                                                         |
| \# Check DLQ depth via RabbitMQ Management API                          |
|                                                                         |
| \# ============================================================         |
|                                                                         |
| \# Check all DLQs:                                                      |
|                                                                         |
| curl -s -u guest:guest                                                  |
| http://localhost:15672/api/queues/%2F/marketeq.offers.contracts.dlq \|  |
| jq .messages                                                            |
|                                                                         |
| curl -s -u guest:guest                                                  |
| http://localhost:15672/api/queues/%2F/marketeq.offers.notifications.dlq |
| \| jq .messages                                                         |
|                                                                         |
| curl -s -u guest:guest                                                  |
| http://localhost:15672/api/queues/%2F/marketeq.offers.messaging.dlq \|  |
| jq .messages                                                            |
|                                                                         |
| \# If any value \> 0: investigate immediately.                          |
|                                                                         |
| \# Expected in normal operation: 0                                      |
|                                                                         |
| \# ============================================================         |
|                                                                         |
| \# Check FAILED outbox events (offer-service side)                      |
|                                                                         |
| \# ============================================================         |
|                                                                         |
| SELECT id, event_type, retry_count, last_error, aggregate_id,           |
| scheduled_at                                                            |
|                                                                         |
| FROM offer_service.outbox                                               |
|                                                                         |
| WHERE status = \'FAILED\'                                               |
|                                                                         |
| ORDER BY created_at DESC;                                               |
|                                                                         |
| \# Expected in normal operation: 0 rows                                 |
|                                                                         |
| \# If rows exist: the outbox failed to publish. Check RabbitMQ          |
| connection.                                                             |
+-------------------------------------------------------------------------+

**Investigate a DLQ Message**

When a DLQ has messages, use the Management UI or rabbitmqadmin to
inspect them without removing them from the queue.

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Inspect DLQ messages WITHOUT removing them (peek)                  |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Via Management UI:                                                 |
|                                                                       |
| \# Queues -\> marketeq.offers.contracts.dlq -\> Get Messages -\> Ack  |
| Mode: Nack                                                            |
|                                                                       |
| \# \"Nack\" mode: message is returned but not removed from the queue. |
|                                                                       |
| \# NEVER use \"Ack\" mode unless you intentionally want to discard    |
| the message.                                                          |
|                                                                       |
| \# Via rabbitmqadmin (get without ack --- message stays in queue):    |
|                                                                       |
| rabbitmqadmin get queue=marketeq.offers.contracts.dlq                 |
| ackmode=ack_requeue_true                                              |
|                                                                       |
| \# Look for in the output:                                            |
|                                                                       |
| \# headers.x-death\[0\].count --- how many times this message has     |
| been retried                                                          |
|                                                                       |
| \# headers.x-death\[0\].queue --- which consumer queue it came from   |
|                                                                       |
| \# payload.eventType --- which event type failed                      |
|                                                                       |
| \# payload.offerId --- which offer this relates to                    |
|                                                                       |
| \# payload.eventId --- unique event ID for deduplication              |
|                                                                       |
| \# Cross-reference with offer-service logs:                           |
|                                                                       |
| grep \'offerId\' /var/log/offer-service/app.log \| grep \'\<offerId   |
| from DLQ message\>\'                                                  |
+-----------------------------------------------------------------------+

**Manual Re-queue from DLQ (after fixing the bug)**

After identifying and fixing the bug that caused messages to land in the
DLQ, re-queue the messages so the consumer can process them. ONLY do
this after the fix is deployed --- otherwise the messages will fail
again and land back in the DLQ.

+-----------------------------------------------------------------------+
| STOP: Before re-queuing, confirm the bug fix is deployed to the       |
| consuming service.                                                    |
|                                                                       |
| Re-queuing before the fix causes an infinite loop: message fails →    |
| DLQ → re-queue → fails again.                                         |
|                                                                       |
| If a message has deathCount \>= 10, it will be permanently discarded  |
| on the next failure.                                                  |
|                                                                       |
| Coordinate with the team before running any re-queue operation in     |
| production.                                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Method 1: RabbitMQ Shovel Plugin (recommended for bulk)            |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# The shovel plugin moves messages between queues.                   |
|                                                                       |
| \# Enable it first (if not already enabled):                          |
|                                                                       |
| rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management    |
|                                                                       |
| \# Create a shovel to move all DLQ messages back to the original      |
| queue:                                                                |
|                                                                       |
| rabbitmqctl set_parameter shovel recover-contracts \\                 |
|                                                                       |
| \'{\"src-protocol\": \"amqp091\",                                     |
|                                                                       |
| \"src-uri\": \"amqp://\",                                             |
|                                                                       |
| \"src-queue\": \"marketeq.offers.contracts.dlq\",                     |
|                                                                       |
| \"dest-protocol\":\"amqp091\",                                        |
|                                                                       |
| \"dest-uri\": \"amqp://\",                                            |
|                                                                       |
| \"dest-exchange\":\"marketeq.offers\",                                |
|                                                                       |
| \"src-prefetch-count\": 50,                                           |
|                                                                       |
| \"ack-mode\": \"on-confirm\"}\'                                       |
|                                                                       |
| \# Monitor the shovel:                                                |
|                                                                       |
| rabbitmqadmin list shovels                                            |
|                                                                       |
| \# Remove the shovel after migration is done:                         |
|                                                                       |
| rabbitmqctl clear_parameter shovel recover-contracts                  |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Method 2: Direct SQL re-queue for outbox FAILED events             |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# For FAILED outbox events (offer-service side --- not RabbitMQ      |
| DLQ):                                                                 |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PENDING\',                                             |
|                                                                       |
| retry_count = 0,                                                      |
|                                                                       |
| last_error = NULL,                                                    |
|                                                                       |
| scheduled_at = NOW()                                                  |
|                                                                       |
| WHERE status = \'FAILED\';                                            |
|                                                                       |
| \# This resets all FAILED events to PENDING.                          |
|                                                                       |
| \# The OutboxProcessor poller picks them up on the next cron tick.    |
|                                                                       |
| \# Monitor the outbox table to confirm they process successfully:     |
|                                                                       |
| SELECT status, COUNT(\*) FROM offer_service.outbox GROUP BY status;   |
|                                                                       |
| \# Expected after recovery: PENDING (being processed), then empty.    |
+-----------------------------------------------------------------------+

**Backoff Schedule Reference**

This table shows exactly when each retry attempt is scheduled from the
moment of first failure. Use it to estimate how long recovery takes
without intervention.

  ------------- ---------------- ------------- --------------------------------------
  **Attempt**   **retryCount**   **Wait (2\^n  **Elapsed since first failure**
                                 min)**        

  1             0 → 1            2 min         2 minutes

  2             1 → 2            4 min         6 minutes

  3             2 → 3            8 min         14 minutes

  4             3 → 4            16 min        30 minutes

  5             4 → 5            32 min        \~1 hour

  6             5 → 6            64 min        \~2 hours

  7             6 → 7            128 min       \~4 hours

  8             7 → 8            256 min       \~8 hours

  9             8 → 9            512 min       \~17 hours

  **10          9 → 10           --- (FAILED)  **\~34 hours total window before
  (FAILED)**                                   permanent failure**
  ------------- ---------------- ------------- --------------------------------------

+-----------------------------------------------------------------------+
| **Step 7 Verification Checklist**                                     |
|                                                                       |
| Confirm retry and DLQ mechanisms work correctly                       |
+-----------------------------------------------------------------------+

**Test 1 --- Confirm outbox FAILED path fires (simulated)**

+-----------------------------------------------------------------------+
| // Unit test for OutboxProcessor.handlePublishFailure():              |
|                                                                       |
| describe(\'OutboxProcessor\', () =\> {                                |
|                                                                       |
| it(\'marks event as FAILED after MAX_RETRY_ATTEMPTS\', async () =\> { |
|                                                                       |
| // Arrange: create an outbox row at retryCount = 9 (one away from     |
| FAILED)                                                               |
|                                                                       |
| const row = {                                                         |
|                                                                       |
| id: \'test-id\',                                                      |
|                                                                       |
| aggregateId: \'offer-id\',                                            |
|                                                                       |
| eventType: \'offer.created\',                                         |
|                                                                       |
| routingKey: \'offer.created\',                                        |
|                                                                       |
| exchange: \'marketeq.offers\',                                        |
|                                                                       |
| payload: {},                                                          |
|                                                                       |
| retryCount: 9,                                                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Mock the update call                                               |
|                                                                       |
| outboxRepo.update = jest.fn();                                        |
|                                                                       |
| alert.sendOutboxFailedAlert = jest.fn();                              |
|                                                                       |
| // Act: simulate a publish failure                                    |
|                                                                       |
| await processor\[\'handlePublishFailure\'\](row, new                  |
| Error(\'Connection refused\'));                                       |
|                                                                       |
| // Assert: row marked FAILED, alert sent                              |
|                                                                       |
| expect(outboxRepo.update).toHaveBeenCalledWith(\'test-id\',           |
| expect.objectContaining({                                             |
|                                                                       |
| status: \'FAILED\',                                                   |
|                                                                       |
| retryCount: 10,                                                       |
|                                                                       |
| }));                                                                  |
|                                                                       |
| expect(alert.sendOutboxFailedAlert).toHaveBeenCalledWith(             |
|                                                                       |
| expect.objectContaining({ retryCount: 10 })                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'sets exponential backoff on transient failure\', async () =\> {  |
|                                                                       |
| const row = { id: \'test-id\', retryCount: 2, /\* \... \*/ };         |
|                                                                       |
| await processor\[\'handlePublishFailure\'\](row, new                  |
| Error(\'timeout\'));                                                  |
|                                                                       |
| // backoffMinutes = 2\^3 = 8                                          |
|                                                                       |
| const expectedScheduledAt = new Date(Date.now() + 8 \* 60 \* 1000);   |
|                                                                       |
| expect(outboxRepo.update).toHaveBeenCalledWith(\'test-id\',           |
| expect.objectContaining({                                             |
|                                                                       |
| status: \'PENDING\',                                                  |
|                                                                       |
| retryCount: 3,                                                        |
|                                                                       |
| scheduledAt: expect.any(Date),                                        |
|                                                                       |
| }));                                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Test 2 --- Confirm DLQ receives nacked messages**

+------------------------------------------------------------------------------+
| \# Integration test: verify DLQ routing works                                |
|                                                                              |
| \# 1. Start offer-service (topology is declared at startup)                  |
|                                                                              |
| npm run start:dev \--workspace=apps/offer-service                            |
|                                                                              |
| \# 2. Publish a test message to the primary exchange                         |
|                                                                              |
| \# Management UI: Exchanges -\> marketeq.offers -\> Publish Message          |
|                                                                              |
| \# Routing key: offer.accepted                                               |
|                                                                              |
| \# Payload:                                                                  |
| {\"eventId\":\"test\",\"eventType\":\"offer.accepted\",\"offerId\":\"test\"} |
|                                                                              |
| \# 3. Verify message reached contracts queue                                 |
|                                                                              |
| curl -s -u guest:guest                                                       |
| http://localhost:15672/api/queues/%2F/marketeq.offers.contracts \| jq        |
| .messages                                                                    |
|                                                                              |
| \# Expected: 1                                                               |
|                                                                              |
| \# 4. Simulate a consumer nack (using Management UI):                        |
|                                                                              |
| \# Queues -\> marketeq.offers.contracts -\> Get Messages                     |
|                                                                              |
| \# Ack Mode: \"Nack message requeue false\"                                  |
|                                                                              |
| \# This simulates a consumer failing and not re-queuing                      |
|                                                                              |
| \# 5. Verify message landed in DLQ                                           |
|                                                                              |
| curl -s -u guest:guest                                                       |
| http://localhost:15672/api/queues/%2F/marketeq.offers.contracts.dlq \| jq    |
| .messages                                                                    |
|                                                                              |
| \# Expected: 1                                                               |
|                                                                              |
| \# 6. Inspect the DLQ message x-death header                                 |
|                                                                              |
| \# Management UI: marketeq.offers.contracts.dlq -\> Get Messages -\> Ack     |
| Mode: Nack                                                                   |
|                                                                              |
| \# Should show: x-death\[0\].count = 1, x-death\[0\].queue =                 |
| \"marketeq.offers.contracts\"                                                |
+------------------------------------------------------------------------------+

**Test 3 --- Verify Slack alert fires on FAILED (staging only)**

+-------------------------------------------------------------------------+
| \# Set a test Slack webhook in staging .env:                            |
|                                                                         |
| ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T\.../B\.../.. |
|                                                                         |
| \# Manually set an outbox row to retryCount=9, status=PENDING,          |
| scheduled_at=NOW():                                                     |
|                                                                         |
| UPDATE offer_service.outbox                                             |
|                                                                         |
| SET retry_count = 9, status = \'PENDING\', scheduled_at = NOW()         |
|                                                                         |
| WHERE id = \'\<real outbox row id\>\';                                  |
|                                                                         |
| \# Then: stop RabbitMQ to force the next publish to fail.               |
|                                                                         |
| docker stop rabbitmq                                                    |
|                                                                         |
| \# Wait for the next cron tick (5 seconds).                             |
|                                                                         |
| \# OutboxProcessor picks up the row, fails to publish, increments to    |
| 10, marks FAILED.                                                       |
|                                                                         |
| \# Verify:                                                              |
|                                                                         |
| \# 1. Row status = FAILED in the database                               |
|                                                                         |
| SELECT status, retry_count FROM offer_service.outbox WHERE id = \'\<row |
| id\>\';                                                                 |
|                                                                         |
| \# Expected: FAILED, 10                                                 |
|                                                                         |
| \# 2. ERROR log in offer-service logs:                                  |
|                                                                         |
| grep \"OUTBOX FAILED after\" /var/log/offer-service/app.log             |
|                                                                         |
| \# Expected: \"OUTBOX FAILED after 10 retries: eventType=\...           |
| outboxId=\...\"                                                         |
|                                                                         |
| \# 3. Slack alert received in engineering channel.                      |
|                                                                         |
| \# Restart RabbitMQ and reset the row:                                  |
|                                                                         |
| docker start rabbitmq                                                   |
|                                                                         |
| UPDATE offer_service.outbox SET status=\'PENDING\', retry_count=0,      |
| scheduled_at=NOW() WHERE id=\'\<id\>\';                                 |
+-------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If OUTBOX FAILED events accumulate in production:                     |
|                                                                       |
| 1\. Check RabbitMQ broker health first: Management UI or              |
| rabbitmqadmin status                                                  |
|                                                                       |
| 2\. Check offer-service logs for connection errors                    |
|                                                                       |
| 3\. Query: SELECT \* FROM offer_service.outbox WHERE                  |
| status=\'FAILED\'                                                     |
|                                                                       |
| 4\. Identify the eventType and offerId for impact assessment          |
|                                                                       |
| 5\. Fix the broker issue                                              |
|                                                                       |
| 6\. Reset: UPDATE offer_service.outbox SET status=\'PENDING\',        |
| retry_count=0,                                                        |
|                                                                       |
| scheduled_at=NOW() WHERE status=\'FAILED\'                            |
|                                                                       |
| 7\. Monitor the next 5-10 minutes for successful processing           |
|                                                                       |
| If DLQ depth grows in production:                                     |
|                                                                       |
| 1\. Identify which DLQ (contracts, notifications, messaging)          |
|                                                                       |
| 2\. Check that consuming service is running and healthy               |
|                                                                       |
| 3\. Inspect DLQ messages: check x-death.count and payload.eventType   |
|                                                                       |
| 4\. Review consuming service logs for the error                       |
|                                                                       |
| 5\. Fix the consumer bug, deploy the fix                              |
|                                                                       |
| 6\. Use rabbitmq shovel to re-queue DLQ messages                      |
|                                                                       |
| 7\. Monitor consumer queue depth returning to normal                  |
+-----------------------------------------------------------------------+
