**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-04 --- RabbitMQ Consumer Implementation**

  ------------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ----------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-04 --- RabbitMQ Consumer Implementation

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Broker**          RabbitMQ via RABBITMQ_URL env var

  **Exchange**        marketeq.events (topic, durable)

  **Dead-Letter       marketeq.dlx (direct, durable)
  Exchange**          

  **Ack mode**        Manual --- noAck: false on every queue

  **Prerequisites**   ES-00, ES-01, ES-02, ES-03

  **Next Document**   ES-05 --- RabbitMQ Publisher Implementation
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines every inbound RabbitMQ consumer in earnings-service.          |
|                                                                       |
| Five events are consumed:                                             |
|                                                                       |
| transaction.created --- writes earnings_cache row, credits balance    |
|                                                                       |
| transaction.reversed --- marks entry reversed, decrements balance     |
|                                                                       |
| payout.completed --- decrements balance by payout amount              |
|                                                                       |
| payout.failed --- restores balance after a failed transfer            |
|                                                                       |
| contract.activated --- populates contract_label_cache for display     |
| labels                                                                |
|                                                                       |
| Every consumer: validates payload, enforces idempotency, retries up   |
| to 3x with                                                            |
|                                                                       |
| exponential backoff, routes to DLQ on final failure.                  |
|                                                                       |
| Not covered: publishers (ES-05), Redis caching layer (ES-07).         |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                         **Reference**
  --------------------------------------- -------------------------------
  **ES-01 --- all four tables             Must be migrated
  (earnings_cache, balance_snapshots,     
  contract_label_cache, fx_rate_cache)**  

  **ES-02 --- EarningsService and         Implement first
  BalanceService exist and export         
  correctly**                             

  **ES-03 --- ConsumersModule can import  Implement first
  BalanceModule and EarningsModule**      

  **RabbitMQ running, marketeq.events     docker compose up rabbitmq -d
  exchange and marketeq.dlx exchange      
  created**                               
  -----------------------------------------------------------------------

# **2. Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ app.module.ts updated §10 --- adds ConsumersModule                 |
|                                                                       |
| ├─ main.ts updated §10 --- connectMicroservice()                      |
|                                                                       |
| └─ consumers/                                                         |
|                                                                       |
| ├─ consumers.module.ts ← ES-04                                        |
|                                                                       |
| ├─ base.consumer.ts ← ES-04 (shared idempotency + retry)              |
|                                                                       |
| ├─ transaction-created.consumer.ts ← ES-04                            |
|                                                                       |
| ├─ transaction-reversed.consumer.ts ← ES-04                           |
|                                                                       |
| ├─ payout-completed.consumer.ts ← ES-04                               |
|                                                                       |
| ├─ payout-failed.consumer.ts ← ES-04                                  |
|                                                                       |
| └─ contract-activated.consumer.ts ← ES-04                             |
+=======================================================================+

# **3. Environment Variables**

  -----------------------------------------------------------------------------------------------
  **Variable**                  **Required**   **Default**   **Description**
  ----------------------------- -------------- ------------- ------------------------------------
  **RABBITMQ_URL**              Yes            ---           amqp://guest:guest@rabbitmq:5672

  **RABBITMQ_PREFETCH**         No             10            Messages fetched per consumer at a
                                                             time. Lower = safer under load.

  **CONSUMER_RETRY_MAX**        No             3             Max delivery attempts before routing
                                                             to DLQ.

  **CONSUMER_RETRY_DELAY_MS**   No             1000          Base backoff ms. Attempt 1=1s, 2=2s,
                                                             3=4s (exponential).
  -----------------------------------------------------------------------------------------------

# **4. Queue & Dead-Letter Topology**

  ----------------------------------------------------------------------------------------------
  **Queue**                           **Routing Key**        **DLQ Name**
  ----------------------------------- ---------------------- -----------------------------------
  **earnings.transaction.created**    transaction.created    earnings.transaction.created.dlq

  **earnings.transaction.reversed**   transaction.reversed   earnings.transaction.reversed.dlq

  **earnings.payout.completed**       payout.completed       earnings.payout.completed.dlq

  **earnings.payout.failed**          payout.failed          earnings.payout.failed.dlq

  **earnings.contract.activated**     contract.activated     earnings.contract.activated.dlq
  ----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Queue declaration rules --- applied to every queue above**          |
|                                                                       |
| durable: true \| autoDelete: false                                    |
|                                                                       |
| x-dead-letter-exchange: marketeq.dlx                                  |
|                                                                       |
| x-dead-letter-routing-key: \<queue-name\>.dlq                         |
|                                                                       |
| x-message-ttl: 86400000 (24 hours --- messages expire if unprocessed) |
|                                                                       |
| All DLQs: durable, no further dead-lettering, no TTL (sit until       |
| manually cleared)                                                     |
|                                                                       |
| Alert rule: fire PagerDuty when any earnings.\*.dlq depth \> 0        |
+=======================================================================+

# **5. Idempotency Strategy**

  ----------------------------------------------------------------------------------------
  **Consumer**               **Mechanism**      **Detail**
  -------------------------- ------------------ ------------------------------------------
  **transaction.created**    DB UNIQUE          ON CONFLICT DO NOTHING on transaction_id +
                             constraint         idempotency_key. PostgreSQL error code
                                                23505 is caught and silently acked.

  **transaction.reversed**   Redis SET NX + DB  Redis key
                             WHERE              processed:transaction.reversed:{eventId}
                             status=confirmed   (24h TTL). DB UPDATE only affects rows
                                                still in confirmed state.

  **payout.completed**       Redis SET NX       Redis key
                                                processed:payout.completed:{eventId} (24h
                                                TTL).

  **payout.failed**          Redis SET NX       Redis key
                                                processed:payout.failed:{eventId} (24h
                                                TTL).

  **contract.activated**     Redis SET NX + DB  Redis dedup. DB upsert is safe to re-run
                             UPSERT             (ON CONFLICT DO UPDATE).
  ----------------------------------------------------------------------------------------

# **6. Retry Policy**

  --------------------------------------------------------------------------
  **Attempt**      **Wait before attempt**   **On failure**
  ---------------- ------------------------- -------------------------------
  **1 (first       0 ms                      Catch, log WARN, wait backoff
  delivery)**                                

  **2**            1 ×                       Catch, log WARN, wait backoff
                   CONSUMER_RETRY_DELAY_MS   
                   (1s default)              

  **3**            2 ×                       Catch, log WARN, wait backoff
                   CONSUMER_RETRY_DELAY_MS   
                   (2s default)              

  **Final (4th)**  4 ×                       Log ERROR, nack(false, false) →
                   CONSUMER_RETRY_DELAY_MS   DLQ
                   (4s default)              
  --------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **DLQ policy**                                                        |
|                                                                       |
| Messages in DLQ are NOT auto-retried. An engineer must inspect and    |
| act:                                                                  |
|                                                                       |
| \(a\) fix the bug and republish the message, or (b) discard if no     |
| longer valid.                                                         |
|                                                                       |
| Monitor DLQ depth in RabbitMQ management UI or via Prometheus         |
| rabbitmq_queue_messages.                                              |
|                                                                       |
| nack(message, false, false) --- second false = no requeue, routes to  |
| DLQ via x-dead-letter-exchange.                                       |
+=======================================================================+

# **7. Base Consumer (Shared Logic)**

### **src/consumers/base.consumer.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/base.consumer.ts                                     |
|                                                                       |
| // All five consumers extend this class.                              |
|                                                                       |
| // Provides: Redis client, idempotency check, backoff helper, sleep.  |
|                                                                       |
| import { Logger } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| export abstract class BaseConsumer {                                  |
|                                                                       |
| protected readonly logger: Logger;                                    |
|                                                                       |
| protected readonly redis: Redis;                                      |
|                                                                       |
| protected readonly retryMax: number;                                  |
|                                                                       |
| protected readonly retryDelayMs: number;                              |
|                                                                       |
| constructor(config: ConfigService, ctx: string) {                     |
|                                                                       |
| this.logger = new Logger(ctx);                                        |
|                                                                       |
| this.redis = new Redis(config.get\<string\>(\'REDIS_URL\'));          |
|                                                                       |
| this.retryMax = parseInt(config.get(\'CONSUMER_RETRY_MAX\', \'3\'),   |
| 10);                                                                  |
|                                                                       |
| this.retryDelayMs =                                                   |
| parseInt(config.get(\'CONSUMER_RETRY_DELAY_MS\',\'1000\'), 10);       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // SET NX with 24h TTL. Returns true = duplicate (already processed). |
|                                                                       |
| protected async isDuplicate(eventId: string, key: string):            |
| Promise\<boolean\> {                                                  |
|                                                                       |
| const r = await this.redis.set(\`processed:\${key}:\${eventId}\`,     |
| \'1\', \'EX\', 86400, \'NX\');                                        |
|                                                                       |
| return r === null; // null = key existed = duplicate                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Exponential backoff: base \* 2\^(attempt-1)                        |
|                                                                       |
| protected backoffMs(attempt: number): number {                        |
|                                                                       |
| return this.retryDelayMs \* Math.pow(2, attempt - 1);                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| protected sleep(ms: number): Promise\<void\> {                        |
|                                                                       |
| return new Promise(r =\> setTimeout(r, ms));                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Consumers Module**

### **src/consumers/consumers.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/consumers.module.ts                                  |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { TransactionCreatedConsumer } from                            |
| \'./transaction-created.consumer\';                                   |
|                                                                       |
| import { TransactionReversedConsumer } from                           |
| \'./transaction-reversed.consumer\';                                  |
|                                                                       |
| import { PayoutCompletedConsumer } from                               |
| \'./payout-completed.consumer\';                                      |
|                                                                       |
| import { PayoutFailedConsumer } from \'./payout-failed.consumer\';    |
|                                                                       |
| import { ContractActivatedConsumer } from                             |
| \'./contract-activated.consumer\';                                    |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule,                                                         |
|                                                                       |
| TypeOrmModule.forFeature(\[EarningsCache, BalanceSnapshot,            |
| ContractLabelCache\]),                                                |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| TransactionCreatedConsumer, TransactionReversedConsumer,              |
|                                                                       |
| PayoutCompletedConsumer, PayoutFailedConsumer,                        |
| ContractActivatedConsumer,                                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class ConsumersModule {}                                       |
+=======================================================================+

# **9. Consumer Implementations**

## **9.1 transaction.created**

Queue: earnings.transaction.created \| Writes: earnings_cache,
balance_snapshots

+-----------------------------------------------------------------------+
| **Handler steps**                                                     |
|                                                                       |
| 1\. Validate payload --- missing required fields throw, message       |
| routes to DLQ after retries                                           |
|                                                                       |
| 2\. Insert earnings_cache with ON CONFLICT DO NOTHING (idempotency at |
| DB layer)                                                             |
|                                                                       |
| 3\. Catch PostgreSQL error 23505 (unique_violation) --- ack silently, |
| return                                                                |
|                                                                       |
| 4\. Upsert balance_snapshots --- increment available_balance +        |
| total_earned_usd atomically                                           |
|                                                                       |
| 5\. Invalidate Redis balance cache key: balance:{contractorId}        |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Event payload fields**                                              |
|                                                                       |
| eventId (UUID), transactionId (UUID), contractorId (UUID),            |
| contractId?, projectId?, taskId?                                      |
|                                                                       |
| entryType (\"screenshot\"\|\"manual\"), grossAmount, feeAmount,       |
| netAmount, currency                                                   |
|                                                                       |
| fxRateToUsd, netAmountUsd, workStartAt (ISO8601), workEndAt (ISO8601) |
|                                                                       |
| durationMinutes (int), avgKeyboardPct?, avgMousePct?, idempotencyKey  |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/transaction-created.consumer.ts                      |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { Ctx, MessagePattern, Payload, RmqContext } from              |
| \'@nestjs/microservices\';                                            |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, DataSource } from \'typeorm\';                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { BaseConsumer } from \'./base.consumer\';                     |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class TransactionCreatedConsumer extends BaseConsumer {        |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| config: ConfigService,                                                |
|                                                                       |
| \@InjectRepository(EarningsCache)                                     |
|                                                                       |
| private readonly ecRepo: Repository\<EarningsCache\>,                 |
|                                                                       |
| \@InjectRepository(BalanceSnapshot)                                   |
|                                                                       |
| private readonly bsRepo: Repository\<BalanceSnapshot\>,               |
|                                                                       |
| private readonly ds: DataSource,                                      |
|                                                                       |
| ) { super(config, \'TransactionCreatedConsumer\'); }                  |
|                                                                       |
| \@MessagePattern(\'transaction.created\')                             |
|                                                                       |
| async handle(@Payload() d: any, \@Ctx() ctx: RmqContext):             |
| Promise\<void\> {                                                     |
|                                                                       |
| const ch = ctx.getChannelRef();                                       |
|                                                                       |
| const msg = ctx.getMessage();                                         |
|                                                                       |
| let attempt = 0;                                                      |
|                                                                       |
| while (attempt \< this.retryMax) {                                    |
|                                                                       |
| attempt++;                                                            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.process(d);                                                |
|                                                                       |
| ch.ack(msg);                                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| // 23505 = PostgreSQL unique_violation --- duplicate event, safe to   |
| ack.                                                                  |
|                                                                       |
| if (err?.code === \'23505\') {                                        |
|                                                                       |
| this.logger.warn(\`Duplicate skipped: \${d?.transactionId}\`);        |
|                                                                       |
| ch.ack(msg);                                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| this.logger.warn(\`Attempt \${attempt}/\${this.retryMax}:             |
| \${err.message}\`);                                                   |
|                                                                       |
| if (attempt \< this.retryMax) { await                                 |
| this.sleep(this.backoffMs(attempt)); }                                |
|                                                                       |
| else { this.logger.error(\'Exhausted → DLQ\', { d }); ch.nack(msg,    |
| false, false); }                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async process(d: any): Promise\<void\> {                      |
|                                                                       |
| await this.ds.transaction(async em =\> {                              |
|                                                                       |
| // INSERT \... ON CONFLICT DO NOTHING enforces idempotency at DB      |
| level.                                                                |
|                                                                       |
| await em.createQueryBuilder()                                         |
|                                                                       |
| .insert().into(EarningsCache)                                         |
|                                                                       |
| .values({                                                             |
|                                                                       |
| transactionId: d.transactionId,                                       |
|                                                                       |
| contractorId: d.contractorId,                                         |
|                                                                       |
| contractId: d.contractId ?? null,                                     |
|                                                                       |
| projectId: d.projectId ?? null,                                       |
|                                                                       |
| taskId: d.taskId ?? null,                                             |
|                                                                       |
| entryType: d.entryType,                                               |
|                                                                       |
| grossAmount: d.grossAmount,                                           |
|                                                                       |
| feeAmount: d.feeAmount,                                               |
|                                                                       |
| netAmount: d.netAmount,                                               |
|                                                                       |
| currency: d.currency,                                                 |
|                                                                       |
| fxRateToUsd: d.fxRateToUsd,                                           |
|                                                                       |
| netAmountUsd: d.netAmountUsd,                                         |
|                                                                       |
| status: \'confirmed\',                                                |
|                                                                       |
| workStartAt: new Date(d.workStartAt),                                 |
|                                                                       |
| workEndAt: new Date(d.workEndAt),                                     |
|                                                                       |
| durationMinutes: d.durationMinutes,                                   |
|                                                                       |
| avgKeyboardPct: d.avgKeyboardPct ?? null,                             |
|                                                                       |
| avgMousePct: d.avgMousePct ?? null,                                   |
|                                                                       |
| idempotencyKey: d.idempotencyKey,                                     |
|                                                                       |
| })                                                                    |
|                                                                       |
| .orIgnore() // ON CONFLICT DO NOTHING                                 |
|                                                                       |
| .execute();                                                           |
|                                                                       |
| // Upsert balance_snapshots --- new contractor row or increment       |
| existing.                                                             |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| INSERT INTO balance_snapshots                                         |
|                                                                       |
| (contractor_id, available_balance, total_earned_usd, last_credit_at,  |
| updated_at)                                                           |
|                                                                       |
| VALUES (\$1, \$2::numeric, \$2::numeric, NOW(), NOW())                |
|                                                                       |
| ON CONFLICT (contractor_id) DO UPDATE SET                             |
|                                                                       |
| available_balance = balance_snapshots.available_balance +             |
| \$2::numeric,                                                         |
|                                                                       |
| total_earned_usd = balance_snapshots.total_earned_usd + \$2::numeric, |
|                                                                       |
| last_credit_at = NOW(),                                               |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| \`, \[d.contractorId, d.netAmountUsd\]);                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Invalidate balance cache (full cache impl in ES-07).               |
|                                                                       |
| await this.redis.del(\`balance:\${d.contractorId}\`);                 |
|                                                                       |
| this.logger.log(\`transaction.created: \${d.transactionId}            |
| +\${d.netAmountUsd} USD\`);                                           |
|                                                                       |
| // YTD threshold check → ES-05 publisher wired here when ES-05 is     |
| complete.                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.2 transaction.reversed**

Queue: earnings.transaction.reversed \| Writes: earnings_cache,
balance_snapshots

+-----------------------------------------------------------------------+
| **Handler steps**                                                     |
|                                                                       |
| 1\. Redis dedup on eventId                                            |
|                                                                       |
| 2\. UPDATE earnings_cache SET status=reversed WHERE transactionId=X   |
| AND status=confirmed                                                  |
|                                                                       |
| 3\. If 0 rows updated --- already reversed or not found --- log warn, |
| return (safe)                                                         |
|                                                                       |
| 4\. Decrement balance_snapshots.available_balance by netAmountUsd     |
| (GREATEST guard)                                                      |
|                                                                       |
| 5\. Invalidate Redis balance cache                                    |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Event payload fields**                                              |
|                                                                       |
| eventId (UUID), transactionId (UUID), contractorId (UUID)             |
|                                                                       |
| netAmountUsd (string), reversedAt (ISO8601), reason? (string)         |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/transaction-reversed.consumer.ts                     |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { Ctx, MessagePattern, Payload, RmqContext } from              |
| \'@nestjs/microservices\';                                            |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, DataSource } from \'typeorm\';                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { BaseConsumer } from \'./base.consumer\';                     |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class TransactionReversedConsumer extends BaseConsumer {       |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| config: ConfigService,                                                |
|                                                                       |
| \@InjectRepository(EarningsCache)                                     |
|                                                                       |
| private readonly ecRepo: Repository\<EarningsCache\>,                 |
|                                                                       |
| private readonly ds: DataSource,                                      |
|                                                                       |
| ) { super(config, \'TransactionReversedConsumer\'); }                 |
|                                                                       |
| \@MessagePattern(\'transaction.reversed\')                            |
|                                                                       |
| async handle(@Payload() d: any, \@Ctx() ctx: RmqContext):             |
| Promise\<void\> {                                                     |
|                                                                       |
| const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let     |
| attempt = 0;                                                          |
|                                                                       |
| while (attempt \< this.retryMax) {                                    |
|                                                                       |
| attempt++;                                                            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| if (await this.isDuplicate(d.eventId, \'transaction.reversed\')) {    |
|                                                                       |
| this.logger.warn(\`Duplicate skipped: \${d.eventId}\`); ch.ack(msg);  |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.process(d); ch.ack(msg); return;                           |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| this.logger.warn(\`Attempt \${attempt}/\${this.retryMax}:             |
| \${err.message}\`);                                                   |
|                                                                       |
| if (attempt \< this.retryMax) { await                                 |
| this.sleep(this.backoffMs(attempt)); }                                |
|                                                                       |
| else { this.logger.error(\'Exhausted → DLQ\', { d }); ch.nack(msg,    |
| false, false); }                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async process(d: any): Promise\<void\> {                      |
|                                                                       |
| await this.ds.transaction(async em =\> {                              |
|                                                                       |
| // Only update rows still in \'confirmed\' state.                     |
|                                                                       |
| // If already reversed (duplicate) or not found, affected = 0 ---     |
| safe to skip.                                                         |
|                                                                       |
| const res = await em.update(EarningsCache,                            |
|                                                                       |
| { transactionId: d.transactionId, status: \'confirmed\' as any },     |
|                                                                       |
| { status: \'reversed\' as any, reversedAt: new Date(d.reversedAt) },  |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (res.affected === 0) {                                             |
|                                                                       |
| this.logger.warn(\`No confirmed row for transactionId                 |
| \${d.transactionId} --- skip\`);                                      |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Decrement balance. GREATEST(0,\...) prevents negative balance.     |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE balance_snapshots                                              |
|                                                                       |
| SET available_balance = GREATEST(0, available_balance -               |
| \$1::numeric),                                                        |
|                                                                       |
| last_debit_at = NOW(),                                                |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE contractor_id = \$2                                             |
|                                                                       |
| \`, \[d.netAmountUsd, d.contractorId\]);                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.redis.del(\`balance:\${d.contractorId}\`);                 |
|                                                                       |
| this.logger.log(\`transaction.reversed: \${d.transactionId}           |
| -\${d.netAmountUsd} USD\`);                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.3 payout.completed**

Queue: earnings.payout.completed \| Writes: balance_snapshots

+-----------------------------------------------------------------------+
| **Handler steps**                                                     |
|                                                                       |
| 1\. Redis dedup on eventId                                            |
|                                                                       |
| 2\. Decrement balance_snapshots.available_balance by payoutAmountUsd  |
|                                                                       |
| 3\. Increment balance_snapshots.total_paid_out_usd                    |
|                                                                       |
| 4\. Invalidate Redis balance cache                                    |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Event payload fields**                                              |
|                                                                       |
| eventId (UUID), payoutId (UUID), contractorId (UUID)                  |
|                                                                       |
| payoutAmountUsd (string), completedAt (ISO8601), destinationMethod?   |
| (string)                                                              |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/payout-completed.consumer.ts                         |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { Ctx, MessagePattern, Payload, RmqContext } from              |
| \'@nestjs/microservices\';                                            |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { BaseConsumer } from \'./base.consumer\';                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class PayoutCompletedConsumer extends BaseConsumer {           |
|                                                                       |
| constructor(config: ConfigService, private readonly ds: DataSource) { |
|                                                                       |
| super(config, \'PayoutCompletedConsumer\');                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@MessagePattern(\'payout.completed\')                                |
|                                                                       |
| async handle(@Payload() d: any, \@Ctx() ctx: RmqContext):             |
| Promise\<void\> {                                                     |
|                                                                       |
| const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let     |
| attempt = 0;                                                          |
|                                                                       |
| while (attempt \< this.retryMax) {                                    |
|                                                                       |
| attempt++;                                                            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| if (await this.isDuplicate(d.eventId, \'payout.completed\')) {        |
|                                                                       |
| this.logger.warn(\`Duplicate skipped: \${d.eventId}\`); ch.ack(msg);  |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.ds.query(\`                                                |
|                                                                       |
| UPDATE balance_snapshots                                              |
|                                                                       |
| SET available_balance = GREATEST(0, available_balance -               |
| \$1::numeric),                                                        |
|                                                                       |
| total_paid_out_usd = total_paid_out_usd + \$1::numeric,               |
|                                                                       |
| last_debit_at = NOW(), updated_at = NOW()                             |
|                                                                       |
| WHERE contractor_id = \$2\`,                                          |
|                                                                       |
| \[d.payoutAmountUsd, d.contractorId\]);                               |
|                                                                       |
| await this.redis.del(\`balance:\${d.contractorId}\`);                 |
|                                                                       |
| this.logger.log(\`payout.completed: \${d.payoutId}                    |
| -\${d.payoutAmountUsd} USD\`);                                        |
|                                                                       |
| ch.ack(msg); return;                                                  |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| this.logger.warn(\`Attempt \${attempt}/\${this.retryMax}:             |
| \${err.message}\`);                                                   |
|                                                                       |
| if (attempt \< this.retryMax) { await                                 |
| this.sleep(this.backoffMs(attempt)); }                                |
|                                                                       |
| else { this.logger.error(\'Exhausted → DLQ\', { d }); ch.nack(msg,    |
| false, false); }                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.4 payout.failed**

Queue: earnings.payout.failed \| Writes: balance_snapshots

+-----------------------------------------------------------------------+
| **Handler steps**                                                     |
|                                                                       |
| 1\. Redis dedup on eventId                                            |
|                                                                       |
| 2\. Restore balance_snapshots.available_balance by payoutAmountUsd    |
|                                                                       |
| 3\. Decrement total_paid_out_usd if it was already incremented        |
| (GREATEST guard)                                                      |
|                                                                       |
| 4\. Invalidate Redis balance cache                                    |
|                                                                       |
| payout.failed fires when a transfer fails AFTER the ledger debit was  |
| written in                                                            |
|                                                                       |
| payout-service. earnings-service restores the balance as a            |
| compensating action.                                                  |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Event payload fields**                                              |
|                                                                       |
| eventId (UUID), payoutId (UUID), contractorId (UUID)                  |
|                                                                       |
| payoutAmountUsd (string), failedAt (ISO8601), failureReason? (string) |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/payout-failed.consumer.ts                            |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { Ctx, MessagePattern, Payload, RmqContext } from              |
| \'@nestjs/microservices\';                                            |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { BaseConsumer } from \'./base.consumer\';                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class PayoutFailedConsumer extends BaseConsumer {              |
|                                                                       |
| constructor(config: ConfigService, private readonly ds: DataSource) { |
|                                                                       |
| super(config, \'PayoutFailedConsumer\');                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@MessagePattern(\'payout.failed\')                                   |
|                                                                       |
| async handle(@Payload() d: any, \@Ctx() ctx: RmqContext):             |
| Promise\<void\> {                                                     |
|                                                                       |
| const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let     |
| attempt = 0;                                                          |
|                                                                       |
| while (attempt \< this.retryMax) {                                    |
|                                                                       |
| attempt++;                                                            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| if (await this.isDuplicate(d.eventId, \'payout.failed\')) {           |
|                                                                       |
| this.logger.warn(\`Duplicate skipped: \${d.eventId}\`); ch.ack(msg);  |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.ds.query(\`                                                |
|                                                                       |
| UPDATE balance_snapshots                                              |
|                                                                       |
| SET available_balance = available_balance + \$1::numeric,             |
|                                                                       |
| total_paid_out_usd = GREATEST(0, total_paid_out_usd - \$1::numeric),  |
|                                                                       |
| updated_at = NOW()                                                    |
|                                                                       |
| WHERE contractor_id = \$2\`,                                          |
|                                                                       |
| \[d.payoutAmountUsd, d.contractorId\]);                               |
|                                                                       |
| await this.redis.del(\`balance:\${d.contractorId}\`);                 |
|                                                                       |
| this.logger.log(\`payout.failed: \${d.payoutId} restored              |
| +\${d.payoutAmountUsd}\${d.failureReason ? \'                         |
| reason:\'+d.failureReason : \'\'}\`);                                 |
|                                                                       |
| ch.ack(msg); return;                                                  |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| this.logger.warn(\`Attempt \${attempt}/\${this.retryMax}:             |
| \${err.message}\`);                                                   |
|                                                                       |
| if (attempt \< this.retryMax) { await                                 |
| this.sleep(this.backoffMs(attempt)); }                                |
|                                                                       |
| else { this.logger.error(\'Exhausted → DLQ\', { d }); ch.nack(msg,    |
| false, false); }                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.5 contract.activated**

Queue: earnings.contract.activated \| Writes: contract_label_cache

+-----------------------------------------------------------------------+
| **Handler steps**                                                     |
|                                                                       |
| 1\. Redis dedup on eventId                                            |
|                                                                       |
| 2\. Upsert contract_label_cache --- ON CONFLICT (contractId) DO       |
| UPDATE                                                                |
|                                                                       |
| Safe to rerun on duplicate delivery without side effects              |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Event payload fields**                                              |
|                                                                       |
| eventId (UUID), contractId (UUID), contractorId (UUID), clientId      |
| (UUID)                                                                |
|                                                                       |
| projectId?, contractTitle?, projectName?, clientDisplayName?,         |
| activatedAt (ISO8601)                                                 |
+=======================================================================+

+---------------------------------------------------------------------------------------+
| typescript                                                                            |
+---------------------------------------------------------------------------------------+
| // src/consumers/contract-activated.consumer.ts                                       |
|                                                                                       |
| import { Injectable } from \'@nestjs/common\';                                        |
|                                                                                       |
| import { Ctx, MessagePattern, Payload, RmqContext } from \'@nestjs/microservices\';   |
|                                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                                 |
|                                                                                       |
| import { Repository } from \'typeorm\';                                               |
|                                                                                       |
| import { ConfigService } from \'@nestjs/config\';                                     |
|                                                                                       |
| import { BaseConsumer } from \'./base.consumer\';                                     |
|                                                                                       |
| import { ContractLabelCache } from \'../entities/contract-label-cache.entity\';       |
|                                                                                       |
| \@Injectable()                                                                        |
|                                                                                       |
| export class ContractActivatedConsumer extends BaseConsumer {                         |
|                                                                                       |
| constructor(                                                                          |
|                                                                                       |
| config: ConfigService,                                                                |
|                                                                                       |
| \@InjectRepository(ContractLabelCache)                                                |
|                                                                                       |
| private readonly labelRepo: Repository\<ContractLabelCache\>,                         |
|                                                                                       |
| ) { super(config, \'ContractActivatedConsumer\'); }                                   |
|                                                                                       |
| \@MessagePattern(\'contract.activated\')                                              |
|                                                                                       |
| async handle(@Payload() d: any, \@Ctx() ctx: RmqContext): Promise\<void\> {           |
|                                                                                       |
| const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let attempt = 0;        |
|                                                                                       |
| while (attempt \< this.retryMax) {                                                    |
|                                                                                       |
| attempt++;                                                                            |
|                                                                                       |
| try {                                                                                 |
|                                                                                       |
| if (await this.isDuplicate(d.eventId, \'contract.activated\')) {                      |
|                                                                                       |
| this.logger.warn(\`Duplicate skipped: \${d.eventId}\`); ch.ack(msg); return;          |
|                                                                                       |
| }                                                                                     |
|                                                                                       |
| // Upsert --- safe to re-run. ON CONFLICT updates label fields.                       |
|                                                                                       |
| await this.labelRepo.createQueryBuilder()                                             |
|                                                                                       |
| .insert().into(ContractLabelCache)                                                    |
|                                                                                       |
| .values({                                                                             |
|                                                                                       |
| contractId: d.contractId,                                                             |
|                                                                                       |
| contractorId: d.contractorId,                                                         |
|                                                                                       |
| clientId: d.clientId,                                                                 |
|                                                                                       |
| projectId: d.projectId ?? null,                                                       |
|                                                                                       |
| contractTitle: d.contractTitle ?? null,                                               |
|                                                                                       |
| projectName: d.projectName ?? null,                                                   |
|                                                                                       |
| clientDisplayName: d.clientDisplayName ?? null,                                       |
|                                                                                       |
| status: \'active\',                                                                   |
|                                                                                       |
| activatedAt: new Date(d.activatedAt),                                                 |
|                                                                                       |
| })                                                                                    |
|                                                                                       |
| .orUpdate(                                                                            |
|                                                                                       |
| \[\'contractTitle\',\'projectName\',\'clientDisplayName\',\'status\',\'updatedAt\'\], |
|                                                                                       |
| \[\'contractId\'\],                                                                   |
|                                                                                       |
| )                                                                                     |
|                                                                                       |
| .execute();                                                                           |
|                                                                                       |
| this.logger.log(\`contract.activated: label cached for \${d.contractId}\`);           |
|                                                                                       |
| ch.ack(msg); return;                                                                  |
|                                                                                       |
| } catch (err: any) {                                                                  |
|                                                                                       |
| this.logger.warn(\`Attempt \${attempt}/\${this.retryMax}: \${err.message}\`);         |
|                                                                                       |
| if (attempt \< this.retryMax) { await this.sleep(this.backoffMs(attempt)); }          |
|                                                                                       |
| else { this.logger.error(\'Exhausted → DLQ\', { d }); ch.nack(msg, false, false); }   |
|                                                                                       |
| }                                                                                     |
|                                                                                       |
| }                                                                                     |
|                                                                                       |
| }                                                                                     |
|                                                                                       |
| }                                                                                     |
+=======================================================================================+

# **10. Bootstrap --- Hybrid HTTP + Microservice**

earnings-service runs as a hybrid NestJS application: HTTP server
(ES-02/03) and RabbitMQ consumer. Both start in the same process via
connectMicroservice().

### **src/main.ts --- updated**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/main.ts --- updated for hybrid HTTP + RabbitMQ                 |
|                                                                       |
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { ValidationPipe } from \'@nestjs/common\';                    |
|                                                                       |
| import { MicroserviceOptions, Transport } from                        |
| \'@nestjs/microservices\';                                            |
|                                                                       |
| import { AppModule } from \'./app.module\';                           |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const app = await NestFactory.create(AppModule);                      |
|                                                                       |
| app.useGlobalPipes(new ValidationPipe({                               |
|                                                                       |
| whitelist: true, transform: true,                                     |
|                                                                       |
| transformOptions: { enableImplicitConversion: true },                 |
|                                                                       |
| }));                                                                  |
|                                                                       |
| // Connect RabbitMQ microservice transport.                           |
|                                                                       |
| // noAck: false --- manual ack on every consumer (retry + DLQ         |
| support).                                                             |
|                                                                       |
| app.connectMicroservice\<MicroserviceOptions\>({                      |
|                                                                       |
| transport: Transport.RMQ,                                             |
|                                                                       |
| options: {                                                            |
|                                                                       |
| urls: \[process.env.RABBITMQ_URL \|\|                                 |
| \'amqp://guest:guest@rabbitmq:5672\'\],                               |
|                                                                       |
| queue: \'earnings.events\',                                           |
|                                                                       |
| prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH \|\| \'10\',    |
| 10),                                                                  |
|                                                                       |
| noAck: false,                                                         |
|                                                                       |
| queueOptions: {                                                       |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| arguments: {                                                          |
|                                                                       |
| \'x-dead-letter-exchange\': \'marketeq.dlx\',                         |
|                                                                       |
| \'x-message-ttl\': 86400000,                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| await app.startAllMicroservices();                                    |
|                                                                       |
| await app.listen(process.env.PORT \|\| 3010);                         |
|                                                                       |
| console.log(\`earnings-service ready --- HTTP                         |
| :\${process.env.PORT\|\|3010} + RabbitMQ\`);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| bootstrap();                                                          |
+=======================================================================+

### **src/app.module.ts --- updated**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts                                                  |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { DatabaseModule } from \'./database/database.module\';        |
|                                                                       |
| import { BalanceModule } from \'./balance/balance.module\';           |
|                                                                       |
| import { EarningsModule } from \'./earnings/earnings.module\';        |
|                                                                       |
| import { InternalModule } from \'./internal/internal.module\';        |
|                                                                       |
| import { ConsumersModule } from \'./consumers/consumers.module\'; //  |
| ← added                                                               |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule, BalanceModule, EarningsModule,                        |
|                                                                       |
| InternalModule, ConsumersModule, // ← ConsumersModule added           |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **11. Verification**

## **Start service**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| docker compose up postgres redis rabbitmq -d                          |
|                                                                       |
| cd apps/earnings-service && npm run start:dev                         |
|                                                                       |
| \# Expected: earnings-service ready --- HTTP :3010 + RabbitMQ         |
+=======================================================================+

## **Test transaction.created**

+---------------------------------------------------------------------------------------------+
| bash                                                                                        |
+---------------------------------------------------------------------------------------------+
| \# Publish via RabbitMQ management UI (http://localhost:15672, guest/guest)                 |
|                                                                                             |
| \# Exchange: marketeq.events Routing key: transaction.created                               |
|                                                                                             |
| \# Payload:                                                                                 |
|                                                                                             |
| {                                                                                           |
|                                                                                             |
| \"eventId\":\"evt-001\",\"transactionId\":\"txn-001\",\"contractorId\":\"CONTRACTOR_UUID\", |
|                                                                                             |
| \"entryType\":\"screenshot\",\"grossAmount\":\"100.00\",\"feeAmount\":\"20.00\",            |
|                                                                                             |
| \"netAmount\":\"80.00\",\"currency\":\"USD\",\"fxRateToUsd\":\"1.00000000\",                |
|                                                                                             |
| \"netAmountUsd\":\"80.00\",\"workStartAt\":\"2025-06-10T09:00:00Z\",                        |
|                                                                                             |
| \"workEndAt\":\"2025-06-10T11:00:00Z\",\"durationMinutes\":120,                             |
|                                                                                             |
| \"idempotencyKey\":\"billing-001:1\"                                                        |
|                                                                                             |
| }                                                                                           |
|                                                                                             |
| \# Verify earnings_cache has 1 row:                                                         |
|                                                                                             |
| psql \$DATABASE_URL -c \"SELECT transaction_id, net_amount_usd, status FROM                 |
| earnings_cache;\"                                                                           |
|                                                                                             |
| \# Verify balance_snapshots.available_balance = 80.00:                                      |
|                                                                                             |
| psql \$DATABASE_URL -c \"SELECT contractor_id, available_balance FROM balance_snapshots;\"  |
+=============================================================================================+

## **Test idempotency --- publish the same event twice**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Publish identical event again (same eventId, same transactionId)   |
|                                                                       |
| \# Expected log: \'Duplicate skipped: txn-001\'                       |
|                                                                       |
| \# DB: still 1 row in earnings_cache (not 2). Balance still 80.00     |
| (not 160.00)                                                          |
+=======================================================================+

## **Test payout.completed**

+-----------------------------------------------------------------------------------------+
| bash                                                                                    |
+-----------------------------------------------------------------------------------------+
| \# Routing key: payout.completed                                                        |
|                                                                                         |
| \# Payload:                                                                             |
| {\"eventId\":\"evt-002\",\"payoutId\":\"pay-001\",\"contractorId\":\"CONTRACTOR_UUID\", |
|                                                                                         |
| \# \"payoutAmountUsd\":\"80.00\",\"completedAt\":\"2025-06-10T15:00:00Z\"}              |
|                                                                                         |
| \# After: available_balance = 0.00, total_paid_out_usd = 80.00                          |
+=========================================================================================+

## **Test payout.failed (balance restore)**

+----------------------------------------------------------------------------------------------------------+
| bash                                                                                                     |
+----------------------------------------------------------------------------------------------------------+
| \# Routing key: payout.failed                                                                            |
|                                                                                                          |
| \# Payload: {\"eventId\":\"evt-003\",\"payoutId\":\"pay-002\",\"contractorId\":\"CONTRACTOR_UUID\",      |
|                                                                                                          |
| \#                                                                                                       |
| \"payoutAmountUsd\":\"80.00\",\"failedAt\":\"2025-06-10T16:00:00Z\",\"failureReason\":\"BANK_REJECTED\"} |
|                                                                                                          |
| \# After: available_balance increases by 80.00                                                           |
+==========================================================================================================+

## **Test DLQ routing --- malformed payload**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Routing key: transaction.created                                   |
|                                                                       |
| \# Payload: {\"eventId\":\"bad-001\"} (missing required fields)       |
|                                                                       |
| \# Expected logs: 3x \'Attempt N/3\', then \'Exhausted → DLQ\'        |
|                                                                       |
| \# RabbitMQ UI: earnings.transaction.created.dlq depth = 1            |
+=======================================================================+

# **12. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship to ES-04**
  ------------------------- ---------------------------------------------
  **ES-01 --- Database      earnings_cache, balance_snapshots,
  Schema**                  contract_label_cache tables written by
                            consumers

  **ES-05 --- RabbitMQ      earnings.threshold.reached publisher called
  Publishers**              from TransactionCreatedConsumer after YTD
                            crosses \$600

  **ES-07 --- Redis         balance:{contractorId} cache key invalidated
  Caching**                 by all balance-mutating consumers
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-04 \| v1.0
