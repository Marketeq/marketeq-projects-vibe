**OS-21**

**Offer Service --- Outbox Pattern Implementation**

**Pattern:** Transactional Outbox **Guarantee:** At-least-once delivery
**Retry:** 10 attempts with exponential backoff

This document covers the complete Transactional Outbox pattern
implementation for offer-service. The outbox pattern guarantees that
every offer state change is paired with a RabbitMQ event publication,
even under broker failure, service crashes, or network partitions. It is
the foundation of all inter-service communication in offer-service.

**File Map --- All Files to Create**

  ---------- -------------------------------------------- ----------------------
  **Step**   **File Path**                                **Purpose**

  **0**      (install)                                    npm install
                                                          \@nestjs/schedule

  **1**      src/outbox/entities/outbox-event.entity.ts   OutboxEvent TypeORM
                                                          entity (verify from
                                                          OS-15)

  **2**      src/outbox/outbox.service.ts                 OutboxService ---
                                                          write() called inside
                                                          transactions

  **3**      src/outbox/outbox.processor.ts               OutboxProcessor ---
                                                          background poller

  **4**      src/outbox/outbox.module.ts                  OutboxModule --- wires
                                                          entity, service,
                                                          processor

  **5**      src/app.module.ts (update)                   Import ScheduleModule
                                                          and OutboxModule

  **6**      (integration)                                How OffersService uses
                                                          outbox.write() inside
                                                          transactions

  **7**      (integration)                                Complete acceptOffer()
                                                          example with full
                                                          atomic transaction

  **8**      (reference)                                  Verification,
                                                          monitoring, and
                                                          troubleshooting guide
  ---------- -------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview 1 Why the Outbox Pattern Exists**                          |
|                                                                       |
| The data integrity problem it solves                                  |
+-----------------------------------------------------------------------+

Every offer state change must notify downstream services via RabbitMQ.
The naive approach is: save to database, then publish to RabbitMQ. This
creates a window where the state is saved but the event is not
published, leaving downstream services out of sync.

+-----------------------------------------------------------------------+
| // THE PROBLEM --- naive two-step approach (BROKEN):                  |
|                                                                       |
| // Step 1: Save offer state to PostgreSQL                             |
|                                                                       |
| await this.offerRepo.save({ \...offer, status: OfferStatus.ACCEPTED   |
| });                                                                   |
|                                                                       |
| // ✓ Database: offer is ACCEPTED                                      |
|                                                                       |
| // Broker: no event yet                                               |
|                                                                       |
| // \*\*\* Service crashes HERE, or broker is down \*\*\*              |
|                                                                       |
| // Step 2: Publish to RabbitMQ                                        |
|                                                                       |
| await this.rabbitMQ.publish(\'offer.accepted\', payload);             |
|                                                                       |
| // ✗ This never runs                                                  |
|                                                                       |
| // Result:                                                            |
|                                                                       |
| // - Database: offer is ACCEPTED (correct)                            |
|                                                                       |
| // - contracts-service: never received offer.accepted (no             |
| ContractGroup created)                                                |
|                                                                       |
| // - notification-service: never received offer.accepted (talent not  |
| notified)                                                             |
|                                                                       |
| // - State is permanently inconsistent. No automatic recovery.        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // THE SOLUTION --- outbox pattern (CORRECT):                         |
|                                                                       |
| // Both happen in ONE atomic transaction:                             |
|                                                                       |
| await this.dataSource.transaction(async (manager) =\> {               |
|                                                                       |
| // Step A: Update offer status                                        |
|                                                                       |
| await manager.update(Offer, { id: offerId }, { status:                |
| OfferStatus.ACCEPTED, acceptedAt: new Date() });                      |
|                                                                       |
| // Step B: Write outbox row (pending event)                           |
|                                                                       |
| await manager.insert(OutboxEvent, {                                   |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: \'offer.accepted\',                                        |
|                                                                       |
| routingKey: \'offer.accepted\',                                       |
|                                                                       |
| payload: buildOfferAcceptedPayload(offer),                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Both writes commit together. If the transaction fails, both roll   |
| back.                                                                 |
|                                                                       |
| // If it succeeds: the outbox row guarantees delivery.                |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Background poller picks up the outbox row and publishes to         |
| RabbitMQ.                                                             |
|                                                                       |
| // If broker is down: poller retries with exponential backoff (max 10 |
| times).                                                               |
|                                                                       |
| // If service crashes: next startup picks up PENDING outbox rows.     |
|                                                                       |
| // The event is GUARANTEED to be published eventually.                |
+-----------------------------------------------------------------------+

**Exactly-Once vs At-Least-Once**

The outbox pattern provides AT-LEAST-ONCE delivery. The broker may
receive the same message more than once if the poller crashes after
publishing but before deleting the outbox row. Consumers MUST be
idempotent (check eventId before processing). See OS-20 for the consumer
idempotency pattern.

+-----------------------------------------------------------------------+
| **Overview 2 Architecture --- All Components and Their Roles**        |
|                                                                       |
| How the pieces connect                                                |
+-----------------------------------------------------------------------+

  ----------------------- -------------------------------------------------
  **OutboxEvent entity**  TypeORM entity. Represents one row in
                          offer_service.outbox. Stores event type, payload,
                          status, retry count. Defined in OS-15.

  **OutboxService**       Injectable NestJS service. One method: write().
                          Called by OffersService and CounterOffersService
                          INSIDE a transaction. Inserts the outbox row
                          atomically with the state change.

  **OutboxProcessor**     \@Injectable with \@Cron. Runs every 10 seconds.
                          Claims PENDING rows with SELECT FOR UPDATE SKIP
                          LOCKED. Publishes to RabbitMQ via
                          RabbitMQPublisher. On success: deletes row. On
                          failure: schedules retry.

  **OutboxModule**        NestJS module. Registers OutboxEvent with
                          TypeORM, provides OutboxService and
                          OutboxProcessor, exports OutboxService.

  **RabbitMQPublisher**   Defined in OS-19. OutboxProcessor injects it to
                          publish events. Uses ConfirmChannel (publisher
                          confirms).

  **ScheduleModule**      From \@nestjs/schedule. Provides the \@Cron
                          decorator that drives OutboxProcessor. Registered
                          in AppModule.
  ----------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| // Complete flow for offer acceptance:                                |
|                                                                       |
| // 1. OffersService.accept() called via HTTP                          |
|                                                                       |
| // 2. dataSource.transaction() wraps steps A+B+C:                     |
|                                                                       |
| // A. UPDATE offers SET status=ACCEPTED WHERE id=? AND status=PENDING |
| (atomic CAS)                                                          |
|                                                                       |
| // B. INSERT offer_history (event log entry)                          |
|                                                                       |
| // C. INSERT outbox (pending event row) \<- OutboxService.write()     |
|                                                                       |
| // 3. Transaction commits --- both state change and outbox row are    |
| durable                                                               |
|                                                                       |
| // 4. HTTP response returned to talent                                |
|                                                                       |
| // 5. AblyService.publish() --- real-time frontend update             |
|                                                                       |
| // 6. (10 seconds later) OutboxProcessor cron fires:                  |
|                                                                       |
| // - SELECT outbox WHERE status=PENDING FOR UPDATE SKIP LOCKED        |
|                                                                       |
| // - UPDATE outbox SET status=PROCESSING WHERE id=?                   |
|                                                                       |
| // - RabbitMQPublisher.publish(\'offer.accepted\', payload)           |
|                                                                       |
| // - DELETE FROM outbox WHERE id=? (on confirm from broker)           |
|                                                                       |
| // 7. contracts-service, notification-service, messaging-service      |
| receive event                                                         |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 0 Install \@nestjs/schedule**                                  |
|                                                                       |
| Required for the OutboxProcessor \@Cron decorator                     |
+-----------------------------------------------------------------------+

\@nestjs/schedule provides the \@Cron() decorator that drives the
OutboxProcessor. It uses node-cron under the hood. Check if it is
already installed in the monorepo before running npm install.

  -----------------------------------------------------------------------
  **FILE: Terminal --- run from monorepo root**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Check if already installed                                         |
|                                                                       |
| cat package.json \| grep \"@nestjs/schedule\"                         |
|                                                                       |
| \# Install if not present                                             |
|                                                                       |
| npm install \@nestjs/schedule                                         |
|                                                                       |
| \# Verify                                                             |
|                                                                       |
| cat package.json \| grep \"@nestjs/schedule\"                         |
|                                                                       |
| \# Expected: \"@nestjs/schedule\": \"\^4.x.x\"                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 OutboxEvent Entity**                                         |
|                                                                       |
| Verify it exists from OS-15                                           |
+-----------------------------------------------------------------------+

The OutboxEvent entity was created in OS-15. Verify it exists at the
correct path before proceeding. If it does not exist, create it now
using the code from OS-15.

+-----------------------------------------------------------------------+
| Verify this file exists:                                              |
|                                                                       |
| apps/offer-service/src/outbox/entities/outbox-event.entity.ts         |
|                                                                       |
| It must export: OutboxEvent class and OutboxEventStatus enum.         |
|                                                                       |
| Run: cat                                                              |
| apps/offer-service/src/outbox/entities/outbox-event.entity.ts         |
|                                                                       |
| Confirm: OutboxEventStatus { PENDING, PROCESSING, PUBLISHED, FAILED } |
|                                                                       |
| If missing: copy from OS-15 Step 9 exactly.                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 OutboxService --- outbox.service.ts**                        |
|                                                                       |
| The atomic writer --- always called inside a transaction              |
+-----------------------------------------------------------------------+

OutboxService has exactly one public method: write(). This method
inserts a new PENDING outbox row using the EntityManager passed to it.
The EntityManager MUST be the same one that is executing the state
change transaction. This is what makes the write atomic.

+-----------------------------------------------------------------------+
| NEVER call outboxService.write() outside of a                         |
| dataSource.transaction() callback.                                    |
|                                                                       |
| If you call it without a transaction manager, the outbox row and      |
| state change                                                          |
|                                                                       |
| are separate database operations. A crash between them causes         |
| inconsistency.                                                        |
|                                                                       |
| Correct pattern:                                                      |
|                                                                       |
| await this.dataSource.transaction(async (manager) =\> {               |
|                                                                       |
| await manager.update(Offer, \..., { status: ACCEPTED });              |
|                                                                       |
| await this.outboxService.write({ \... }, manager); // Same manager!   |
|                                                                       |
| });                                                                   |
|                                                                       |
| Wrong pattern (DO NOT DO THIS):                                       |
|                                                                       |
| await this.offerRepo.update(\..., { status: ACCEPTED });              |
|                                                                       |
| await this.outboxService.write({ \... }); // No manager passed = not  |
| atomic!                                                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/outbox/outbox.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { EntityManager } from \'typeorm\';                            |
|                                                                       |
| import { OutboxEvent, OutboxEventStatus } from                        |
| \'./entities/outbox-event.entity\';                                   |
|                                                                       |
| import { OFFER_EXCHANGE } from                                        |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| /\*\* Input to outbox.write() --- everything needed to publish one    |
| event. \*/                                                            |
|                                                                       |
| export interface OutboxWriteInput {                                   |
|                                                                       |
| aggregateId: string; // The offer ID this event relates to            |
|                                                                       |
| eventType: string; // e.g. \"offer.accepted\" --- also the routing    |
| key                                                                   |
|                                                                       |
| routingKey: string; // RabbitMQ routing key (same as eventType)       |
|                                                                       |
| payload: Record\<string, unknown\>; // Full event payload (OS-20)     |
|                                                                       |
| exchange?: string; // Defaults to OFFER_EXCHANGE (marketeq.offers)    |
|                                                                       |
| aggregateType?: string; // Defaults to \"offer\"                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OutboxService --- Atomic outbox writer.                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Provides a single write() method that inserts a PENDING outbox row |
|                                                                       |
| \* using the EntityManager from the calling transaction.              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Always pass the SAME manager used for state changes.               |
|                                                                       |
| \* The row commits atomically with the state change.                  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The OutboxProcessor picks up PENDING rows and publishes to         |
| RabbitMQ.                                                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OutboxService {                                          |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* write() --- Insert a pending outbox row inside the current         |
| transaction.                                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param input --- Event details (aggregate ID, type, routing key,  |
| payload)                                                              |
|                                                                       |
| \* \@param manager --- The EntityManager from                         |
| dataSource.transaction() callback                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* await this.dataSource.transaction(async (manager) =\> {            |
|                                                                       |
| \* await manager.update(Offer, { id: offerId }, { status: ACCEPTED    |
| });                                                                   |
|                                                                       |
| \* await this.outboxService.write({                                   |
|                                                                       |
| \* aggregateId: offerId,                                              |
|                                                                       |
| \* eventType: \'offer.accepted\',                                     |
|                                                                       |
| \* routingKey: \'offer.accepted\',                                    |
|                                                                       |
| \* payload: buildOfferAcceptedPayload(offer),                         |
|                                                                       |
| \* }, manager);                                                       |
|                                                                       |
| \* });                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async write(input: OutboxWriteInput, manager: EntityManager):         |
| Promise\<void\> {                                                     |
|                                                                       |
| const {                                                               |
|                                                                       |
| aggregateId,                                                          |
|                                                                       |
| eventType,                                                            |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| payload,                                                              |
|                                                                       |
| exchange = OFFER_EXCHANGE,                                            |
|                                                                       |
| aggregateType = \'offer\',                                            |
|                                                                       |
| } = input;                                                            |
|                                                                       |
| await manager                                                         |
|                                                                       |
| .getRepository(OutboxEvent)                                           |
|                                                                       |
| .insert({                                                             |
|                                                                       |
| aggregateId,                                                          |
|                                                                       |
| aggregateType,                                                        |
|                                                                       |
| eventType,                                                            |
|                                                                       |
| exchange,                                                             |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| payload,                                                              |
|                                                                       |
| status: OutboxEventStatus.PENDING,                                    |
|                                                                       |
| retryCount: 0,                                                        |
|                                                                       |
| scheduledAt: new Date(),                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 OutboxProcessor --- outbox.processor.ts**                    |
|                                                                       |
| The background poller that publishes events to RabbitMQ               |
+-----------------------------------------------------------------------+

OutboxProcessor is the heart of the outbox pattern. It runs on a cron
schedule (every 10 seconds). On each tick it claims a batch of PENDING
rows, publishes each one to RabbitMQ, and handles the result. The SKIP
LOCKED clause prevents multiple service instances from processing the
same row.

+-----------------------------------------------------------------------+
| SELECT FOR UPDATE SKIP LOCKED --- why this matters:                   |
|                                                                       |
| When Kubernetes runs 2 replicas of offer-service, both instances run  |
|                                                                       |
| OutboxProcessor at the same time.                                     |
|                                                                       |
| Without SKIP LOCKED:                                                  |
|                                                                       |
| Both instances SELECT the same PENDING rows.                          |
|                                                                       |
| Both try to publish the same events.                                  |
|                                                                       |
| Both consumers receive duplicate messages (multiplied for every       |
| broker consumer).                                                     |
|                                                                       |
| With SKIP LOCKED:                                                     |
|                                                                       |
| Instance A locks rows 1, 2, 3.                                        |
|                                                                       |
| Instance B tries to lock them but they are locked, so it SKIPS them.  |
|                                                                       |
| Instance B gets rows 4, 5, 6 instead.                                 |
|                                                                       |
| Each event is published exactly once per outbox row.                  |
|                                                                       |
| At-least-once delivery is preserved without double-publishing.        |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/outbox/outbox.processor.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { Cron, CronExpression } from \'@nestjs/schedule\';            |
|                                                                       |
| import { InjectDataSource } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { OutboxEvent, OutboxEventStatus } from                        |
| \'./entities/outbox-event.entity\';                                   |
|                                                                       |
| import { RabbitMQPublisher } from                                     |
| \'../messaging/rabbitmq.publisher\';                                  |
|                                                                       |
| /\*\* Maximum retries before a row moves to FAILED status. \*/        |
|                                                                       |
| const OUTBOX_MAX_RETRIES = 10;                                        |
|                                                                       |
| /\*\* Number of rows to claim per cron tick. \*/                      |
|                                                                       |
| const OUTBOX_BATCH_SIZE = 50;                                         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OutboxProcessor --- Background poller for the transactional        |
| outbox.                                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Runs every 10 seconds (configurable via                            |
| OUTBOX_POLL_INTERVAL_SECONDS).                                        |
|                                                                       |
| \* Claims PENDING outbox rows with SELECT FOR UPDATE SKIP LOCKED.     |
|                                                                       |
| \* Publishes each event to RabbitMQ via RabbitMQPublisher             |
| (ConfirmChannel).                                                     |
|                                                                       |
| \* On success: deletes the row.                                       |
|                                                                       |
| \* On failure: increments retryCount, sets scheduledAt to next retry  |
| time.                                                                 |
|                                                                       |
| \* After 10 failures: moves to FAILED status and alerts.              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OutboxProcessor {                                        |
|                                                                       |
| private readonly logger = new Logger(OutboxProcessor.name);           |
|                                                                       |
| private isRunning = false; // Guard: prevents overlapping executions  |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectDataSource()                                                  |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly publisher: RabbitMQPublisher,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* processOutbox() --- The cron job method.                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* CronExpression.EVERY_10_SECONDS runs the poller every 10 seconds.  |
|                                                                       |
| \* Adjust the interval based on event volume and latency              |
| requirements.                                                         |
|                                                                       |
| \* The isRunning flag prevents a long tick from causing overlapping   |
| executions.                                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Cron(CronExpression.EVERY_10_SECONDS, { name: \'outbox-processor\'  |
| })                                                                    |
|                                                                       |
| async processOutbox(): Promise\<void\> {                              |
|                                                                       |
| if (this.isRunning) {                                                 |
|                                                                       |
| this.logger.debug(\'Outbox tick skipped: previous execution still     |
| running.\');                                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| this.isRunning = true;                                                |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.processBatch();                                            |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| const message = err instanceof Error ? err.message : String(err);     |
|                                                                       |
| this.logger.error(\'Outbox batch processing error:\', message);       |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| this.isRunning = false;                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* processBatch() --- Claims and processes one batch of PENDING       |
| outbox rows.                                                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async processBatch(): Promise\<void\> {                       |
|                                                                       |
| const runner = this.dataSource.createQueryRunner();                   |
|                                                                       |
| await runner.connect();                                               |
|                                                                       |
| await runner.startTransaction();                                      |
|                                                                       |
| let rows: OutboxEvent\[\] = \[\];                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Claim PENDING rows with SELECT FOR UPDATE SKIP LOCKED.             |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // This atomic claim-and-mark prevents multiple instances from        |
|                                                                       |
| // processing the same rows simultaneously.                           |
|                                                                       |
| rows = await runner.manager.query\<OutboxEvent\[\]\>(\`               |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'\${OutboxEventStatus.PROCESSING}\',                    |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.outbox                                   |
|                                                                       |
| WHERE status = \'\${OutboxEventStatus.PENDING}\'                      |
|                                                                       |
| AND scheduled_at \<= NOW()                                            |
|                                                                       |
| ORDER BY scheduled_at ASC                                             |
|                                                                       |
| LIMIT \${OUTBOX_BATCH_SIZE}                                           |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await runner.commitTransaction();                                     |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| await runner.rollbackTransaction();                                   |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| await runner.release();                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (rows.length === 0) return;                                        |
|                                                                       |
| this.logger.debug(\`Processing \${rows.length} outbox rows.\`);       |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Process each row independently.                                    |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Each row has its own try/catch. One failure does not block others. |
|                                                                       |
| const results = await Promise.allSettled(                             |
|                                                                       |
| rows.map(row =\> this.processRow(row)),                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| const failed = results.filter(r =\> r.status ===                      |
| \'rejected\').length;                                                 |
|                                                                       |
| if (failed \> 0) {                                                    |
|                                                                       |
| this.logger.warn(\`\${failed}/\${rows.length} outbox rows failed.     |
| Will retry.\`);                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* processRow() --- Publish one outbox event and handle the result.   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async processRow(row: OutboxEvent): Promise\<void\> {         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Publish with publisher confirms (ConfirmChannel).                  |
|                                                                       |
| // If the broker rejects: throws an error, caught below.              |
|                                                                       |
| await this.publisher.publish({                                        |
|                                                                       |
| routingKey: row.routingKey,                                           |
|                                                                       |
| payload: row.payload,                                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Broker confirmed receipt. Delete the outbox row.                   |
|                                                                       |
| await this.dataSource.query(                                          |
|                                                                       |
| \`DELETE FROM offer_service.outbox WHERE id = \$1\`,                  |
|                                                                       |
| \[row.id\],                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| this.logger.debug(\`Published and deleted outbox row: \${row.id}      |
| (\${row.eventType})\`);                                               |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| const message = err instanceof Error ? err.message : String(err);     |
|                                                                       |
| const newRetryCount = (row.retryCount ?? 0) + 1;                      |
|                                                                       |
| if (newRetryCount \>= OUTBOX_MAX_RETRIES) {                           |
|                                                                       |
| // Max retries exhausted. Move to FAILED.                             |
|                                                                       |
| // Engineering should be alerted. Manual intervention required.       |
|                                                                       |
| await this.dataSource.query(\`                                        |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'\${OutboxEventStatus.FAILED}\',                        |
|                                                                       |
| retry_count = \$1,                                                    |
|                                                                       |
| last_error = \$2,                                                     |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE id = \$3                                                        |
|                                                                       |
| \`, \[newRetryCount, message, row.id\]);                              |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`Outbox row \${row.id} FAILED after \${OUTBOX_MAX_RETRIES}           |
| retries.\`,                                                           |
|                                                                       |
| \`Event: \${row.eventType}. Last error: \${message}\`,                |
|                                                                       |
| );                                                                    |
|                                                                       |
| // TODO: send alert to on-call (Slack webhook, PagerDuty, etc.)       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Exponential backoff: 2\^retryCount minutes.                        |
|                                                                       |
| // Attempt 1: +1 min, 2: +2 min, 3: +4 min, 4: +8 min, 5: +16 min,    |
| \...                                                                  |
|                                                                       |
| const backoffMinutes = Math.pow(2, newRetryCount - 1);                |
|                                                                       |
| const nextRetry = new Date(Date.now() + backoffMinutes \* 60_000);    |
|                                                                       |
| await this.dataSource.query(\`                                        |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'\${OutboxEventStatus.PENDING}\',                       |
|                                                                       |
| retry_count = \$1,                                                    |
|                                                                       |
| last_error = \$2,                                                     |
|                                                                       |
| scheduled_at = \$3,                                                   |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE id = \$4                                                        |
|                                                                       |
| \`, \[newRetryCount, message, nextRetry, row.id\]);                   |
|                                                                       |
| this.logger.warn(                                                     |
|                                                                       |
| \`Outbox row \${row.id} failed (attempt                               |
| \${newRetryCount}/\${OUTBOX_MAX_RETRIES}).\`,                         |
|                                                                       |
| \`Retry in \${backoffMinutes} minute(s). Error: \${message}\`,        |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 OutboxModule --- outbox.module.ts**                          |
|                                                                       |
| Wires the entity, service, and processor together                     |
+-----------------------------------------------------------------------+

OutboxModule registers the OutboxEvent entity with TypeORM (so the
repository is available), provides OutboxService and OutboxProcessor,
and exports OutboxService so OffersModule and CounterOffersModule can
inject it. It also imports MessagingModule so RabbitMQPublisher is
available to OutboxProcessor.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/outbox/outbox.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { OutboxEvent } from \'./entities/outbox-event.entity\';       |
|                                                                       |
| import { OutboxService } from \'./outbox.service\';                   |
|                                                                       |
| import { OutboxProcessor } from \'./outbox.processor\';               |
|                                                                       |
| import { MessagingModule } from \'../messaging/rabbitmq.module\';     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OutboxModule --- Transactional outbox pattern module.              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Provides: OutboxService (exported), OutboxProcessor (internal)     |
|                                                                       |
| \* Requires: MessagingModule (for RabbitMQPublisher injection)        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Import this module in OffersModule and CounterOffersModule so they |
|                                                                       |
| \* can inject OutboxService via constructor injection.                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* OutboxProcessor runs automatically when this module is loaded.     |
|                                                                       |
| \* It starts the \@Cron poller on application startup.                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[OutboxEvent\]),                            |
|                                                                       |
| MessagingModule, // Provides RabbitMQPublisher to OutboxProcessor     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| OutboxService,                                                        |
|                                                                       |
| OutboxProcessor,                                                      |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[                                                           |
|                                                                       |
| OutboxService, // Exported so OffersModule and CounterOffersModule    |
| can inject it                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class OutboxModule {}                                          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Update AppModule --- Register ScheduleModule and             |
| OutboxModule**                                                        |
|                                                                       |
| Two imports required in AppModule                                     |
+-----------------------------------------------------------------------+

ScheduleModule.forRoot() activates the cron job scheduler globally. It
MUST be in AppModule (not just OutboxModule) for \@Cron() decorators to
work. OutboxModule provides the processor. Both must be imported.

+-----------------------------------------------------------------------+
| ScheduleModule.forRoot() must be in AppModule, not in OutboxModule.   |
|                                                                       |
| If ScheduleModule is only in OutboxModule, cron jobs may not run.     |
|                                                                       |
| This is a common NestJS setup mistake with \@nestjs/schedule.         |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts (update)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { ScheduleModule } from \'@nestjs/schedule\'; // \<\-- ADD     |
|                                                                       |
| import { OutboxModule } from \'./outbox/outbox.module\'; // \<\-- ADD |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ \... }),                                       |
|                                                                       |
| TypeOrmModule.forRootAsync({ \... }),                                 |
|                                                                       |
| AuthModule,                                                           |
|                                                                       |
| RedisModule,                                                          |
|                                                                       |
| MessagingModule,                                                      |
|                                                                       |
| ScheduleModule.forRoot(), // \<\-- ADD. Activates all \@Cron          |
| decorators globally.                                                  |
|                                                                       |
| OutboxModule, // \<\-- ADD. Starts the outbox poller.                 |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| { provide: APP_GUARD, useClass: JwtAuthGuard },                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Import OutboxModule in Feature Modules**                     |
|                                                                       |
| OffersModule and CounterOffersModule must import OutboxModule         |
+-----------------------------------------------------------------------+

For OutboxService to be injectable in OffersService and
CounterOffersService, OutboxModule must be imported in OffersModule and
CounterOffersModule respectively. This is because NestJS DI is
module-scoped.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.module.ts (update)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OutboxModule } from \'../outbox/outbox.module\'; // \<\--    |
| ADD                                                                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[Offer, OfferHistoryEvent\]),               |
|                                                                       |
| OutboxModule, // \<\-- ADD. Makes OutboxService injectable in         |
| OffersService.                                                        |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[OffersController\],                                    |
|                                                                       |
| providers: \[OffersService\],                                         |
|                                                                       |
| exports: \[OffersService\],                                           |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class OffersModule {}                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/counter-offers/counter-offers.module.ts
  (update)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OutboxModule } from \'../outbox/outbox.module\'; // \<\--    |
| ADD                                                                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[CounterOffer, OfferHistoryEvent\]),        |
|                                                                       |
| OutboxModule, // \<\-- ADD. Makes OutboxService injectable in         |
| CounterOffersService.                                                 |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[CounterOffersController\],                             |
|                                                                       |
| providers: \[CounterOffersService\],                                  |
|                                                                       |
| exports: \[CounterOffersService\],                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class CounterOffersModule {}                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Complete Atomic Transaction Pattern --- acceptOffer()        |
| Example**                                                             |
|                                                                       |
| The exact pattern every state-changing method must follow             |
+-----------------------------------------------------------------------+

This is the definitive example of how every state-changing method in
OffersService must be structured. All five operations (CAS update, state
column updates, history insert, outbox insert, Ably publish) follow this
exact pattern. Copy this for accept, decline, withdraw, edit, resend,
create, and all counter offer methods.

+-----------------------------------------------------------------------+
| The five operations in every state change:                            |
|                                                                       |
| 1\. CAS (Compare-And-Swap): atomic status check + update in one SQL   |
| query.                                                                |
|                                                                       |
| If 0 rows affected: another request got there first. Throw 409.       |
|                                                                       |
| If 1 row affected: we own this transition.                            |
|                                                                       |
| 2\. Timestamp columns: update acceptedAt, declinedAt, etc.            |
|                                                                       |
| 3\. History event: append to offer_history (immutable event log).     |
|                                                                       |
| 4\. Outbox event: write pending RabbitMQ event row.                   |
|                                                                       |
| 5\. Ably publish: real-time frontend update (AFTER transaction        |
| commits).                                                             |
|                                                                       |
| Operations 1-4 are inside the transaction.                            |
|                                                                       |
| Operation 5 is OUTSIDE the transaction (Ably is not transactional).   |
|                                                                       |
| If Ably publish fails: the database state and outbox row are already  |
| committed.                                                            |
|                                                                       |
| The frontend will get the update via polling or reconnect.            |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts (acceptOffer
  example)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, ConflictException, NotFoundException } from      |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { InjectDataSource, InjectRepository } from                    |
| \'@nestjs/typeorm\';                                                  |
|                                                                       |
| import { DataSource, Repository } from \'typeorm\';                   |
|                                                                       |
| import { Offer } from \'./entities/offer.entity\';                    |
|                                                                       |
| import { OfferStatus } from \'./enums/offer-status.enum\';            |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../offer-history/entities/offer-history-event.entity\';             |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { AblyService } from \'../realtime/ably.service\';             |
|                                                                       |
| import { AcceptOfferDto } from \'./dto/accept-offer.dto\';            |
|                                                                       |
| import { buildOfferAcceptedPayload } from                             |
| \'../messaging/events/offer-payload-builders\';                       |
|                                                                       |
| import { OFFER_EVENTS } from \'../messaging/events/offer-events\';    |
|                                                                       |
| import { OFFER_EXCHANGE } from                                        |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| import { OfferNotFoundException, OfferNotActionableException } from   |
| \'../common/exceptions/offer.exceptions\';                            |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OffersService {                                          |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Offer)                                             |
|                                                                       |
| private readonly offerRepo: Repository\<Offer\>,                      |
|                                                                       |
| \@InjectDataSource()                                                  |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly outboxService: OutboxService,                        |
|                                                                       |
| private readonly ablyService: AblyService,                            |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* accept() --- Talent accepts a pending offer.                       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Uses an atomic CAS (Compare-And-Swap) to prevent race conditions.  |
|                                                                       |
| \* All database writes are in one transaction.                        |
|                                                                       |
| \* Ably publish happens AFTER the transaction commits.                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async accept(offerId: string, requesterId: string, dto:               |
| AcceptOfferDto): Promise\<Offer\> {                                   |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Load offer for validation (before transaction)                     |
|                                                                       |
| // ================================================================   |
|                                                                       |
| const offer = await this.offerRepo.findOne({ where: { id: offerId }   |
| });                                                                   |
|                                                                       |
| if (!offer) {                                                         |
|                                                                       |
| throw new OfferNotFoundException();                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING) {                           |
|                                                                       |
| throw new OfferNotActionableException(offer.status);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Atomic transaction: CAS + history + outbox                         |
|                                                                       |
| // ================================================================   |
|                                                                       |
| let updatedOffer: Offer;                                              |
|                                                                       |
| await this.dataSource.transaction(async (manager) =\> {               |
|                                                                       |
| // \-\-\-- Step A: Atomic Compare-And-Swap (CAS) \-\-\--              |
|                                                                       |
| // Update ONLY if status is still PENDING (prevents race conditions). |
|                                                                       |
| // If two concurrent requests both pass the pre-check above,          |
|                                                                       |
| // only ONE will match the WHERE status = PENDING condition.          |
|                                                                       |
| // The other gets 0 rows affected and we throw 409.                   |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| const result = await manager.query\<\[unknown\[\], number\]\>(\`      |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'\${OfferStatus.ACCEPTED}\',                            |
|                                                                       |
| accepted_at = \$1,                                                    |
|                                                                       |
| updated_at = \$2                                                      |
|                                                                       |
| WHERE id = \$3 AND status = \'\${OfferStatus.PENDING}\'               |
|                                                                       |
| RETURNING id                                                          |
|                                                                       |
| \`, \[now, now, offerId\]);                                           |
|                                                                       |
| const affectedRows = result\[1\];                                     |
|                                                                       |
| if (affectedRows === 0) {                                             |
|                                                                       |
| // Another request accepted (or changed) this offer between our       |
| pre-check                                                             |
|                                                                       |
| // and the CAS. The offer is no longer PENDING. Throw 409.            |
|                                                                       |
| throw new ConflictException({                                         |
|                                                                       |
| statusCode: 409,                                                      |
|                                                                       |
| error: \'OFFER_ALREADY_ACCEPTED\',                                    |
|                                                                       |
| message: \'This offer has already been accepted.\',                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- Step B: Reload the updated offer for history + outbox      |
| \-\-\--                                                               |
|                                                                       |
| updatedOffer = await manager.findOneOrFail(Offer, { where: { id:      |
| offerId } });                                                         |
|                                                                       |
| // \-\-\-- Step C: Insert offer history event \-\-\--                 |
|                                                                       |
| await manager.insert(OfferHistoryEvent, {                             |
|                                                                       |
| offerId: offerId,                                                     |
|                                                                       |
| eventType: \'offer.accepted\',                                        |
|                                                                       |
| actor: \'TALENT\',                                                    |
|                                                                       |
| actorId: requesterId,                                                 |
|                                                                       |
| terms: {                                                              |
|                                                                       |
| rate: updatedOffer.rate,                                              |
|                                                                       |
| currencyCode: updatedOffer.currencyCode,                              |
|                                                                       |
| durationMonths: updatedOffer.durationMonths,                          |
|                                                                       |
| workSchedule: updatedOffer.workSchedule,                              |
|                                                                       |
| startDate: updatedOffer.startDate,                                    |
|                                                                       |
| message: updatedOffer.message,                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-\-\-- Step D: Write outbox event (atomic with state change)      |
| \-\-\--                                                               |
|                                                                       |
| await this.outboxService.write({                                      |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.ACCEPTED,                                     |
|                                                                       |
| routingKey: OFFER_EVENTS.ACCEPTED,                                    |
|                                                                       |
| payload: buildOfferAcceptedPayload(updatedOffer),                     |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| }, manager); // \<\-- SAME manager. This is what makes it atomic.     |
|                                                                       |
| // Steps A + C + D commit together here.                              |
|                                                                       |
| // If any step throws: all three roll back. No partial state.         |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Post-transaction: real-time update (NOT inside the transaction)    |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Ably publish is not transactional. It happens after commit.        |
|                                                                       |
| // If it fails: the state is already saved and the outbox will        |
| deliver                                                               |
|                                                                       |
| // the RabbitMQ event. The frontend will update via its next poll or  |
| reconnect.                                                            |
|                                                                       |
| await this.ablyService.publish(                                       |
|                                                                       |
| \`offer:\${offerId}\`,                                                |
|                                                                       |
| \'offer.updated\',                                                    |
|                                                                       |
| { offerId, status: OfferStatus.ACCEPTED },                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| return updatedOffer!;                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7b Counter Offer Transaction Pattern --- createCounterOffer()  |
| Example**                                                             |
|                                                                       |
| Multi-entity atomic transaction                                       |
+-----------------------------------------------------------------------+

Counter offer creation is more complex: it updates the parent offer
status to COUNTERED, inserts a new counter offer row, inserts a history
event, and writes the outbox row. All four operations are in a single
transaction.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/counter-offers/counter-offers.service.ts
  (createCounterOffer example)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| async create(                                                         |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| requesterRole: \'CLIENT\' \| \'TALENT\',                              |
|                                                                       |
| dto: CreateCounterOfferDto,                                           |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| const parentOffer = await this.offerRepo.findOne({ where: { id:       |
| offerId } });                                                         |
|                                                                       |
| // Validate: parent offer must be PENDING (talent CO) or COUNTERED    |
| (client response CO)                                                  |
|                                                                       |
| const allowedStatuses = requesterRole === \'TALENT\'                  |
|                                                                       |
| ? \[OfferStatus.PENDING\]                                             |
|                                                                       |
| : \[OfferStatus.COUNTERED\];                                          |
|                                                                       |
| if (!parentOffer \|\| !allowedStatuses.includes(parentOffer.status))  |
| {                                                                     |
|                                                                       |
| throw new OfferNotActionableException(parentOffer?.status ??          |
| \'NOT_FOUND\');                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Compute rate warning                                               |
|                                                                       |
| const rateWarning = computeRateWarning(parentOffer.rate, dto.rate,    |
| requesterRole);                                                       |
|                                                                       |
| let newCO: CounterOffer;                                              |
|                                                                       |
| await this.dataSource.transaction(async (manager) =\> {               |
|                                                                       |
| // \-\-\-- Step A: If client is responding, supersede existing        |
| PENDING CO \-\-\--                                                    |
|                                                                       |
| if (requesterRole === \'CLIENT\') {                                   |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| await manager.query(\`                                                |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'\${CounterOfferStatus.SUPERSEDED}\', superseded_at =   |
| \$1                                                                   |
|                                                                       |
| WHERE offer_id = \$2 AND status = \'\${CounterOfferStatus.PENDING}\'  |
|                                                                       |
| \`, \[now, offerId\]);                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- Step B: Update parent offer status to COUNTERED \-\-\--    |
|                                                                       |
| await manager.query(\`                                                |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'\${OfferStatus.COUNTERED}\',                           |
|                                                                       |
| expires_at = \$1, \-- Reset TTL clock                                 |
|                                                                       |
| warning_sent_at = NULL, \-- Clear expiry warning                      |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE id = \$2 AND status IN (\'\${OfferStatus.PENDING}\',            |
| \'\${OfferStatus.COUNTERED}\')                                        |
|                                                                       |
| \`, \[new Date(Date.now() + 14 \* 24 \* 60 \* 60 \* 1000),            |
| offerId\]);                                                           |
|                                                                       |
| // \-\-\-- Step C: Insert new counter offer \-\-\--                   |
|                                                                       |
| const insertResult = await manager.insert(CounterOffer, {             |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| submittedBy: requesterRole,                                           |
|                                                                       |
| submittedById: requesterId,                                           |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
|                                                                       |
| rate: dto.rate,                                                       |
|                                                                       |
| currencyCode: dto.currencyCode,                                       |
|                                                                       |
| durationMonths: dto.durationMonths,                                   |
|                                                                       |
| workSchedule: dto.workSchedule,                                       |
|                                                                       |
| startDate: dto.startDate,                                             |
|                                                                       |
| message: dto.message ?? null,                                         |
|                                                                       |
| expiresAt: new Date(Date.now() + 14 \* 24 \* 60 \* 60 \* 1000),       |
|                                                                       |
| });                                                                   |
|                                                                       |
| newCO = await manager.findOneOrFail(CounterOffer, {                   |
|                                                                       |
| where: { id: insertResult.identifiers\[0\].id },                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-\-\-- Step D: History event \-\-\--                              |
|                                                                       |
| await manager.insert(OfferHistoryEvent, {                             |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| counterOfferId: newCO.id,                                             |
|                                                                       |
| eventType: \'offer.countered\',                                       |
|                                                                       |
| actor: requesterRole,                                                 |
|                                                                       |
| actorId: requesterId,                                                 |
|                                                                       |
| terms: {                                                              |
|                                                                       |
| rate: dto.rate,                                                       |
|                                                                       |
| currencyCode: dto.currencyCode,                                       |
|                                                                       |
| durationMonths: dto.durationMonths,                                   |
|                                                                       |
| workSchedule: dto.workSchedule,                                       |
|                                                                       |
| startDate: dto.startDate,                                             |
|                                                                       |
| message: dto.message ?? null,                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-\-\-- Step E: Outbox event \-\-\--                               |
|                                                                       |
| await this.outboxService.write({                                      |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTERED,                                    |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTERED,                                   |
|                                                                       |
| payload: buildOfferCounteredPayload(parentOffer, newCO, rateWarning), |
|                                                                       |
| }, manager);                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Post-transaction: Ably real-time update                            |
|                                                                       |
| await this.ablyService.publish(                                       |
|                                                                       |
| \`offer:\${offerId}\`,                                                |
|                                                                       |
| \'offer.updated\',                                                    |
|                                                                       |
| { offerId, status: OfferStatus.COUNTERED, counterOfferId: newCO!.id   |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| return newCO!;                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Helper: compute rate warning (1.25x threshold)                     |
|                                                                       |
| private computeRateWarning(parentRate: number, counterRate: number,   |
| submittedBy: \'CLIENT\' \| \'TALENT\'): boolean {                     |
|                                                                       |
| if (submittedBy === \'TALENT\') {                                     |
|                                                                       |
| // Talent asking more than 25% above original                         |
|                                                                       |
| return counterRate \> parentRate \* 1.25;                             |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Client offering more than 20% below original                       |
|                                                                       |
| return counterRate \< parentRate \* 0.8;                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Verification & Monitoring**                                  |
|                                                                       |
| Confirm the outbox is working correctly                               |
+-----------------------------------------------------------------------+

**Test 1 --- Verify OutboxProcessor starts**

+-----------------------------------------------------------------------+
| \# Start the service                                                  |
|                                                                       |
| npm run start:dev \--workspace=apps/offer-service                     |
|                                                                       |
| \# Look for these lines in startup logs:                              |
|                                                                       |
| \# \[RabbitMQ\] Connected to broker.                                  |
|                                                                       |
| \# \[RabbitMQPublisher\] RabbitMQ topology declared. Publisher ready. |
|                                                                       |
| \# \[NestApplication\] Nest application successfully started          |
|                                                                       |
| \# Wait 10 seconds, then look for the first cron tick:                |
|                                                                       |
| \# \[OutboxProcessor\] Processing 0 outbox rows.                      |
|                                                                       |
| \# (0 rows because no events have been emitted yet)                   |
|                                                                       |
| \# If you do NOT see OutboxProcessor logs after 10+ seconds:          |
|                                                                       |
| \# 1. ScheduleModule.forRoot() is missing from AppModule              |
|                                                                       |
| \# 2. OutboxModule is not imported in AppModule                       |
|                                                                       |
| \# 3. \@Cron decorator is not loading (check \@nestjs/schedule        |
| version)                                                              |
+-----------------------------------------------------------------------+

**Test 2 --- Verify atomic write: create an offer and check outbox**

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# 1. Create an offer                                                                                                                                                                                               |
|                                                                                                                                                                                                                     |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                  |
|                                                                                                                                                                                                                     |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                      |
|                                                                                                                                                                                                                     |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                            |
|                                                                                                                                                                                                                     |
| -H \"X-Idempotency-Key: \$(python3 -c \'import uuid; print(uuid.uuid4())\')\" \\                                                                                                                                    |
|                                                                                                                                                                                                                     |
| -d                                                                                                                                                                                                                  |
| \'{\"talentId\":\"\...\",\"jobListingId\":\"\...\",\"contractType\":\"PROJECT\",\"rate\":95,\"currencyCode\":\"USD\",\"durationMonths\":6,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .id                                                                                                                                                                                                           |
|                                                                                                                                                                                                                     |
| \# 2. Immediately check the outbox (before the poller runs)                                                                                                                                                         |
|                                                                                                                                                                                                                     |
| psql -h localhost -U postgres -d marketeq_dev -c \\                                                                                                                                                                 |
|                                                                                                                                                                                                                     |
| \"SELECT id, event_type, status, retry_count FROM offer_service.outbox ORDER BY created_at DESC LIMIT 5;\"                                                                                                          |
|                                                                                                                                                                                                                     |
| \# Expected: 1 row with event_type=offer.created, status=PENDING, retry_count=0                                                                                                                                     |
|                                                                                                                                                                                                                     |
| \# 3. Wait 15 seconds for the poller to run                                                                                                                                                                         |
|                                                                                                                                                                                                                     |
| sleep 15                                                                                                                                                                                                            |
|                                                                                                                                                                                                                     |
| \# 4. Check the outbox again                                                                                                                                                                                        |
|                                                                                                                                                                                                                     |
| psql -h localhost -U postgres -d marketeq_dev -c \\                                                                                                                                                                 |
|                                                                                                                                                                                                                     |
| \"SELECT id, event_type, status FROM offer_service.outbox ORDER BY created_at DESC LIMIT 5;\"                                                                                                                       |
|                                                                                                                                                                                                                     |
| \# Expected: 0 rows (row was deleted after successful publish)                                                                                                                                                      |
|                                                                                                                                                                                                                     |
| \# 5. Check RabbitMQ Management UI                                                                                                                                                                                  |
|                                                                                                                                                                                                                     |
| \# http://localhost:15672 → Queues → marketeq.offers.notifications                                                                                                                                                  |
|                                                                                                                                                                                                                     |
| \# Expected: 1 message with event_type=offer.created                                                                                                                                                                |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Test 3 --- Verify retry logic: simulate broker failure**

+-----------------------------------------------------------------------+
| \# Stop RabbitMQ (simulate broker outage)                             |
|                                                                       |
| docker stop rabbitmq                                                  |
|                                                                       |
| \# Create another offer (this will write to outbox, but poller cannot |
| publish)                                                              |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: \$(python3 -c \'import uuid;                  |
| print(uuid.uuid4())\')\" \\                                           |
|                                                                       |
| -d \'\...\' \| jq .id                                                 |
|                                                                       |
| \# Offer is created (DB write succeeds), but event cannot be          |
| published                                                             |
|                                                                       |
| \# Watch the outbox table during retries:                             |
|                                                                       |
| watch -n 5 \'psql -h localhost -U postgres -d marketeq_dev -c         |
| \"SELECT id, event_type, status, retry_count, scheduled_at FROM       |
| offer_service.outbox;\"\'                                             |
|                                                                       |
| \# Expected: retry_count increments, status stays PENDING,            |
| scheduled_at moves forward                                            |
|                                                                       |
| \# Restart RabbitMQ                                                   |
|                                                                       |
| docker start rabbitmq                                                 |
|                                                                       |
| \# Within 10 seconds of restart: the poller should pick up the row    |
| and publish                                                           |
|                                                                       |
| \# Check outbox: row should be deleted                                |
|                                                                       |
| \# Check RabbitMQ: event appears in the notifications queue           |
+-----------------------------------------------------------------------+

**Monitoring queries --- run these in production**

+-----------------------------------------------------------------------+
| \-- Check for stuck PENDING rows (more than 30 minutes old):          |
|                                                                       |
| SELECT id, event_type, retry_count, scheduled_at, last_error          |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND created_at \< NOW() - INTERVAL \'30 minutes\'                     |
|                                                                       |
| ORDER BY created_at ASC;                                              |
|                                                                       |
| \-- Check for FAILED rows (max retries exhausted):                    |
|                                                                       |
| SELECT id, event_type, retry_count, last_error, created_at            |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Count outbox rows by status:                                      |
|                                                                       |
| SELECT status, COUNT(\*) FROM offer_service.outbox GROUP BY status;   |
|                                                                       |
| \-- Oldest PENDING row (lag indicator):                               |
|                                                                       |
| SELECT MIN(created_at) AS oldest_pending FROM offer_service.outbox    |
| WHERE status = \'PENDING\';                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| FAILED outbox rows require manual intervention.                       |
|                                                                       |
| When a row reaches FAILED status (10 retries exhausted):              |
|                                                                       |
| 1\. The event was never published to RabbitMQ.                        |
|                                                                       |
| 2\. downstream services did not receive it.                           |
|                                                                       |
| 3\. Query the row: SELECT \* FROM offer_service.outbox WHERE status = |
| \'FAILED\'                                                            |
|                                                                       |
| 4\. Investigate the last_error column for the root cause.             |
|                                                                       |
| 5\. Manually re-queue: UPDATE offer_service.outbox                    |
|                                                                       |
| SET status=\'PENDING\', retry_count=0, scheduled_at=NOW()             |
|                                                                       |
| WHERE id=\'uuid\';                                                    |
|                                                                       |
| 6\. The poller will pick it up on the next tick.                      |
|                                                                       |
| PROCESSING rows stuck for more than 60 seconds indicate a crash       |
| mid-publish.                                                          |
|                                                                       |
| Reset them: UPDATE offer_service.outbox SET status=\'PENDING\'        |
|                                                                       |
| WHERE status=\'PROCESSING\' AND updated_at \< NOW() - INTERVAL \'60   |
| seconds\';                                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **File Structure Complete Outbox Feature File Map**                   |
|                                                                       |
| Every file created in this document                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| apps/offer-service/src/                                               |
|                                                                       |
| ├── outbox/                                                           |
|                                                                       |
| │ ├── entities/                                                       |
|                                                                       |
| │ │ └── outbox-event.entity.ts ← Step 1 (from OS-15)                  |
|                                                                       |
| │ ├── outbox.service.ts ← Step 2: atomic writer                       |
|                                                                       |
| │ ├── outbox.processor.ts ← Step 3: background poller                 |
|                                                                       |
| │ └── outbox.module.ts ← Step 4: module wiring                        |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── messaging/                                                        |
|                                                                       |
| │ ├── constants/                                                      |
|                                                                       |
| │ │ └── rabbitmq.constants.ts ← OS-19                                 |
|                                                                       |
| │ ├── events/                                                         |
|                                                                       |
| │ │ ├── offer-events.ts ← OS-19                                       |
|                                                                       |
| │ │ ├── offer-event-payloads.ts ← OS-20                               |
|                                                                       |
| │ │ └── offer-payload-builders.ts ← OS-20                             |
|                                                                       |
| │ ├── rabbitmq.publisher.ts ← OS-19                                   |
|                                                                       |
| │ └── rabbitmq.module.ts ← OS-19                                      |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── offers/                                                           |
|                                                                       |
| │ └── offers.service.ts ← Step 7: acceptOffer() example               |
|                                                                       |
| ├── counter-offers/                                                   |
|                                                                       |
| │ └── counter-offers.service.ts ← Step 7b: createCounterOffer()       |
| example                                                               |
|                                                                       |
| └── app.module.ts ← Step 5: ScheduleModule + OutboxModule             |
|                                                                       |
| // Every state-changing method in OffersService and                   |
| CounterOffersService                                                  |
|                                                                       |
| // must follow the same transaction pattern shown in Steps 7 and 7b:  |
|                                                                       |
| // dataSource.transaction() wrapping CAS + history + outbox.write()   |
+-----------------------------------------------------------------------+
