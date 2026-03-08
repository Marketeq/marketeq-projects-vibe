**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-05 --- RabbitMQ Publisher Implementation**

  ------------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ----------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-05 --- RabbitMQ Publisher Implementation

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Exchange**        marketeq.events (topic, durable)

  **Events            earnings.balance.updated \|
  published**         earnings.threshold.reached

  **Prerequisites**   ES-00, ES-01, ES-02, ES-03, ES-04

  **Next Document**   ES-06 --- Currency Conversion Service
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines the two outbound RabbitMQ events published by                 |
| earnings-service.                                                     |
|                                                                       |
| Event 1 --- earnings.balance.updated                                  |
|                                                                       |
| Fired after every balance mutation: transaction credited, reversed,   |
| payout completed,                                                     |
|                                                                       |
| payout failed. Consumed by payout-service and notification-service.   |
|                                                                       |
| Allows downstream services to react to balance changes in             |
| near-real-time.                                                       |
|                                                                       |
| Event 2 --- earnings.threshold.reached                                |
|                                                                       |
| Fired once per contractor per calendar year when their cumulative YTD |
| earnings                                                              |
|                                                                       |
| first reach or exceed \$600 USD. Consumed by kyc-identity-service to  |
| trigger                                                               |
|                                                                       |
| the W-9 / W-8BEN tax identity collection flow.                        |
|                                                                       |
| Each section covers: when the event fires, full payload schema,       |
| publisher code,                                                       |
|                                                                       |
| consumer expectations, and idempotency guarantees.                    |
|                                                                       |
| Not covered: inbound consumers (ES-04), Redis caching (ES-07).        |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                         **Reference**
  --------------------------------------- -------------------------------
  **ES-04 implemented --- consumers call  Consumers are the primary
  publishBalanceUpdated() and             callers of both publishers
  publishThresholdReached()**             

  **marketeq.events topic exchange        Created when any service first
  declared and durable in RabbitMQ**      connects --- see ES-00

  **RABBITMQ_URL and PUBLISHER_CONFIRM    Defined in §3
  env vars available**                    
  -----------------------------------------------------------------------

# **2. Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ publishers/                                                        |
|                                                                       |
| │ ├─ publishers.module.ts ← ES-05 NEW                                 |
|                                                                       |
| │ └─ earnings.publisher.ts ← ES-05 NEW                                |
|                                                                       |
| ├─ consumers/                                                         |
|                                                                       |
| │ ├─ base.consumer.ts ES-04 --- updated §8 to inject                  |
| EarningsPublisher                                                     |
|                                                                       |
| │ └─ transaction-created.consumer.ts ES-04 --- updated §8 to call     |
| publisher                                                             |
|                                                                       |
| └─ app.module.ts updated §7 --- adds PublishersModule                 |
+=======================================================================+

# **3. Environment Variables**

  ----------------------------------------------------------------------------------------
  **Variable**            **Required**   **Default**   **Description**
  ----------------------- -------------- ------------- -----------------------------------
  **RABBITMQ_URL**        Yes            ---           amqp://guest:guest@rabbitmq:5672
                                                       (shared with ES-04)

  **PUBLISHER_CONFIRM**   No             true          Enable RabbitMQ publisher confirms.
                                                       When true, publish() waits for
                                                       broker ack before resolving. Set
                                                       false only in local dev to reduce
                                                       latency.
  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Publisher confirms**                                                |
|                                                                       |
| With PUBLISHER_CONFIRM=true (default), every publish() call waits for |
| a broker ack.                                                         |
|                                                                       |
| This guarantees the message reached the exchange before the caller    |
| continues.                                                            |
|                                                                       |
| Trade-off: \~1--3ms latency added per publish. Acceptable for all     |
| current use cases.                                                    |
|                                                                       |
| If the broker is unreachable, publish() throws --- the caller         |
| (consumer handler) catches                                            |
|                                                                       |
| this and retries the entire handler, which will re-attempt the        |
| publish.                                                              |
+=======================================================================+

# **4. EarningsPublisher Service**

EarningsPublisher is a NestJS injectable service. It wraps the amqplib
channel, handles publisher confirms, and attaches a unique eventId to
every message for downstream idempotency checks. Both publish methods
are called by the ES-04 consumers.

### **src/publishers/publishers.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/publishers/publishers.module.ts                                |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { EarningsPublisher } from \'./earnings.publisher\';           |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| providers:\[EarningsPublisher\],                                      |
|                                                                       |
| exports: \[EarningsPublisher\], // exported so ConsumersModule can    |
| inject it                                                             |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class PublishersModule {}                                      |
+=======================================================================+

### **src/publishers/earnings.publisher.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/publishers/earnings.publisher.ts                               |
|                                                                       |
| import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from     |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as amqp from \'amqplib\';                                   |
|                                                                       |
| import { randomUUID } from \'crypto\';                                |
|                                                                       |
| const EXCHANGE = \'marketeq.events\';                                 |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class EarningsPublisher implements OnModuleInit,               |
| OnModuleDestroy {                                                     |
|                                                                       |
| private readonly logger = new Logger(EarningsPublisher.name);         |
|                                                                       |
| private connection: amqp.Connection;                                  |
|                                                                       |
| private channel: amqp.ConfirmChannel;                                 |
|                                                                       |
| constructor(private readonly config: ConfigService) {}                |
|                                                                       |
| // OnModuleInit --- establish connection and confirm channel on       |
| startup.                                                              |
|                                                                       |
| async onModuleInit(): Promise\<void\> {                               |
|                                                                       |
| const url = this.config.get\<string\>(\'RABBITMQ_URL\');              |
|                                                                       |
| const confirm = this.config.get(\'PUBLISHER_CONFIRM\', \'true\') ===  |
| \'true\';                                                             |
|                                                                       |
| this.connection = await amqp.connect(url);                            |
|                                                                       |
| // ConfirmChannel waits for broker ack on every publish().            |
|                                                                       |
| // Falls back to regular channel if publisher confirms are disabled.  |
|                                                                       |
| this.channel = confirm                                                |
|                                                                       |
| ? await this.connection.createConfirmChannel()                        |
|                                                                       |
| : await this.connection.createChannel() as any;                       |
|                                                                       |
| // Declare exchange --- idempotent, safe to re-run on restart.        |
|                                                                       |
| await this.channel.assertExchange(EXCHANGE, \'topic\', { durable:     |
| true });                                                              |
|                                                                       |
| this.logger.log(\`EarningsPublisher connected --- confirms:           |
| \${confirm}\`);                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| async onModuleDestroy(): Promise\<void\> {                            |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.channel?.close();                                          |
|                                                                       |
| await this.connection?.close();                                       |
|                                                                       |
| } catch { /\* ignore close errors on shutdown \*/ }                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Internal publish helper. Attaches eventId, timestamp, and source.  |
|                                                                       |
| // Waits for broker ack when using ConfirmChannel.                    |
|                                                                       |
| private publish(routingKey: string, payload: object): Promise\<void\> |
| {                                                                     |
|                                                                       |
| const envelope = {                                                    |
|                                                                       |
| \...payload,                                                          |
|                                                                       |
| eventId: randomUUID(), // unique per publish --- used by consumers    |
| for dedup                                                             |
|                                                                       |
| publishedAt: new Date().toISOString(),                                |
|                                                                       |
| source: \'earnings-service\',                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| const content = Buffer.from(JSON.stringify(envelope));                |
|                                                                       |
| const options = { persistent: true, contentType: \'application/json\' |
| };                                                                    |
|                                                                       |
| return new Promise((resolve, reject) =\> {                            |
|                                                                       |
| const sent = this.channel.publish(EXCHANGE, routingKey, content,      |
| options,                                                              |
|                                                                       |
| (err) =\> err ? reject(err) : resolve(),                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| // If channel buffer is full (backpressure), sent=false.              |
|                                                                       |
| // Reject so the caller can retry.                                    |
|                                                                       |
| if (!sent) reject(new Error(\'RabbitMQ channel buffer full ---        |
| backpressure\'));                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── PUBLIC METHODS ─────────────────────────────────────────────    |
|                                                                       |
| // Publish earnings.balance.updated.                                  |
|                                                                       |
| // Called by all four balance-mutating consumers in ES-04 after a     |
| successful DB write.                                                  |
|                                                                       |
| async publishBalanceUpdated(payload: BalanceUpdatedPayload):          |
| Promise\<void\> {                                                     |
|                                                                       |
| await this.publish(\'earnings.balance.updated\', payload);            |
|                                                                       |
| this.logger.log(\`earnings.balance.updated published for              |
| \${payload.contractorId}\`);                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Publish earnings.threshold.reached.                                |
|                                                                       |
| // Called by TransactionCreatedConsumer when cumulative YTD crosses   |
| \$600.                                                                |
|                                                                       |
| // MUST be called at most once per contractor per calendar year.      |
|                                                                       |
| // Caller is responsible for checking the threshold before calling    |
| this.                                                                 |
|                                                                       |
| async publishThresholdReached(payload: ThresholdReachedPayload):      |
| Promise\<void\> {                                                     |
|                                                                       |
| await this.publish(\'earnings.threshold.reached\', payload);          |
|                                                                       |
| this.logger.log(                                                      |
|                                                                       |
| \`earnings.threshold.reached published for \${payload.contractorId}   |
| --- \` +                                                              |
|                                                                       |
| \`YTD: \${payload.ytdTotalUsd} year: \${payload.year}\`,              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── PAYLOAD TYPE DEFINITIONS ──────────────────────────────────     |
|                                                                       |
| export interface BalanceUpdatedPayload {                              |
|                                                                       |
| contractorId: string; // UUID                                         |
|                                                                       |
| availableBalance: string; // USD --- current available balance after  |
| mutation                                                              |
|                                                                       |
| previousBalance: string; // USD --- balance before this mutation      |
|                                                                       |
| delta: string; // USD --- signed change: positive=credit,             |
| negative=debit                                                        |
|                                                                       |
| mutationType: \'credit\' \| \'debit\' \| \'reversal\' \|              |
| \'payout_completed\' \| \'payout_failed\';                            |
|                                                                       |
| sourceEventId: string; // UUID of the inbound event that caused this  |
| mutation                                                              |
|                                                                       |
| sourceRoutingKey: string; // e.g. \'transaction.created\'             |
|                                                                       |
| displayCurrency: string; // contractor\'s displayCurrency for         |
| notification formatting                                               |
|                                                                       |
| localCurrency: string; // contractor\'s localCurrency                 |
|                                                                       |
| mutationAt: string; // ISO 8601 --- when the mutation occurred        |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface ThresholdReachedPayload {                            |
|                                                                       |
| contractorId: string; // UUID                                         |
|                                                                       |
| year: number; // calendar year (e.g. 2025)                            |
|                                                                       |
| ytdTotalUsd: string; // total YTD earnings at the moment of crossing  |
|                                                                       |
| thresholdUsd: number; // always 600.00                                |
|                                                                       |
| crossedAt: string; // ISO 8601 --- when the threshold was crossed     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Event 1 --- earnings.balance.updated**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Routing key**       earnings.balance.updated

  **Exchange**          marketeq.events

  **Durable**           true

  **Persistent**        true --- survives broker restart

  **Publisher           Enabled by default --- broker ack awaited before
  confirms**            returning
  -----------------------------------------------------------------------

## **5.1 When it fires**

  ---------------------------------------------------------------------------
  **Triggering consumer**    **Mutation type**              **delta sign**
  -------------------------- ------------------------------ -----------------
  **transaction.created**    Balance credited by            Positive --- e.g.
                             net_amount_usd                 \"+80.00\"

  **transaction.reversed**   Balance debited by             Negative --- e.g.
                             net_amount_usd                 \"-80.00\"

  **payout.completed**       Balance debited by             Negative --- e.g.
                             payoutAmountUsd                \"-200.00\"

  **payout.failed**          Balance restored by            Positive --- e.g.
                             payoutAmountUsd                \"+200.00\"
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Timing guarantee**                                                  |
|                                                                       |
| Published AFTER the DB write has committed and AFTER the Redis cache  |
| key has been                                                          |
|                                                                       |
| invalidated. Consumers of this event can immediately call GET         |
| /v1/internal/earnings/balance                                         |
|                                                                       |
| and receive the updated balance.                                      |
+=======================================================================+

## **5.2 Full payload schema**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // earnings.balance.updated --- full envelope as published            |
|                                                                       |
| {                                                                     |
|                                                                       |
| // ── Envelope fields added by EarningsPublisher.publish() ──         |
|                                                                       |
| \"eventId\": \"uuid-v4\", // unique per publish --- use for dedup     |
|                                                                       |
| \"publishedAt\": \"2025-06-10T14:32:01Z\",                            |
|                                                                       |
| \"source\": \"earnings-service\",                                     |
|                                                                       |
| // ── Payload fields from BalanceUpdatedPayload ──                    |
|                                                                       |
| \"contractorId\": \"uuid\",                                           |
|                                                                       |
| \"availableBalance\": \"487.00\", // current balance after mutation   |
|                                                                       |
| \"previousBalance\": \"407.00\", // balance before this mutation      |
|                                                                       |
| \"delta\": \"+80.00\", // signed: positive=credit, negative=debit     |
|                                                                       |
| \"mutationType\": \"credit\", // see table above for all values       |
|                                                                       |
| \"sourceEventId\": \"uuid\", // eventId of the inbound event that     |
| caused this                                                           |
|                                                                       |
| \"sourceRoutingKey\": \"transaction.created\",                        |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"localCurrency\": \"INR\",                                           |
|                                                                       |
| \"mutationAt\": \"2025-06-10T14:32:00Z\"                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

  --------------------------------------------------------------------------
  **Field**              **Type**   **Description**
  ---------------------- ---------- ----------------------------------------
  **eventId**            UUID       Added by publisher. Every delivery gets
                         string     a unique ID. Consumers use this for
                                    Redis SET NX dedup.

  **publishedAt**        ISO 8601   When the message was published. Added by
                                    publisher.

  **source**             string     Always \"earnings-service\". Added by
                                    publisher.

  **contractorId**       UUID       The contractor whose balance changed.
                         string     

  **availableBalance**   numeric    USD balance after this mutation. Do NOT
                         string     convert currency in this event ---
                                    consumers fetch displayCurrency
                                    conversion themselves if needed.

  **previousBalance**    numeric    USD balance before this mutation. Allows
                         string     consumers to verify no concurrent
                                    mutation occurred between read and this
                                    event.

  **delta**              numeric    Signed USD change. Positive for credits,
                         string     negative for debits. e.g. \"+80.00\" or
                                    \"-200.00\". Always includes sign
                                    character.

  **mutationType**       enum       \"credit\" ---
                         string     transaction.created\"reversal\" ---
                                    transaction.reversed\"debit\" ---
                                    payout.completed\"payout_failed\" ---
                                    payout.failed

  **sourceEventId**      UUID       The eventId of the inbound event in
                         string     ES-04 that triggered this mutation.
                                    Allows consumers to trace the full event
                                    chain.

  **sourceRoutingKey**   string     Routing key of the inbound event. e.g.
                                    \"transaction.created\".

  **displayCurrency**    string     ISO 4217. Used by notification-service
                                    to format the balance message in the
                                    contractor\'s preferred currency.

  **localCurrency**      string     ISO 4217. Geo-detected local currency.

  **mutationAt**         ISO 8601   When the DB mutation occurred, not when
                                    the event was published. Use this for
                                    audit logs and time-series charting.
  --------------------------------------------------------------------------

## **5.3 Consumer expectations**

  --------------------------------------------------------------------------
  **Consumer service**       **What it does with this       **Idempotency
                             event**                        requirement**
  -------------------------- ------------------------------ ----------------
  **payout-service**         Refreshes its internal balance Redis SET NX on
                             cache so withdrawal pre-checks eventId. Ignore
                             use current values. Does NOT   duplicate
                             call the internal balance      deliveries.
                             endpoint on every event ---    
                             caches the value.              

  **notification-service**   Sends in-app notification to   Redis SET NX on
                             contractor: \"Your balance has eventId. Only
                             been updated to \$X.\"         send one
                             Converts availableBalance to   notification per
                             displayCurrency using its own  event.
                             FX lookup.                     
  --------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Consumer contract obligations**                                     |
|                                                                       |
| Consumers MUST NOT assume events arrive in order. Two rapid mutations |
| may produce                                                           |
|                                                                       |
| two earnings.balance.updated events --- the second event\'s           |
| availableBalance is authoritative.                                    |
|                                                                       |
| If a consumer receives events out of order, use mutationAt timestamps |
| to resolve.                                                           |
|                                                                       |
| Consumers MUST treat this event as a hint, not a ledger. The source   |
| of truth for                                                          |
|                                                                       |
| balance is always GET /v1/internal/earnings/balance/:userId (ES-03).  |
+=======================================================================+

## **5.4 Where publishBalanceUpdated() is called in ES-04 consumers**

The four balance-mutating consumers in ES-04 each need one line added
after their successful DB write. The pattern is identical across all
four. Example shown for TransactionCreatedConsumer --- apply the same
pattern to the other three.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Update src/consumers/transaction-created.consumer.ts               |
|                                                                       |
| // Add EarningsPublisher to constructor injection.                    |
|                                                                       |
| // In TransactionCreatedConsumer constructor:                         |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| config: ConfigService,                                                |
|                                                                       |
| \@InjectRepository(EarningsCache) private readonly ecRepo:            |
| Repository\<EarningsCache\>,                                          |
|                                                                       |
| \@InjectRepository(BalanceSnapshot) private readonly bsRepo:          |
| Repository\<BalanceSnapshot\>,                                        |
|                                                                       |
| private readonly ds: DataSource,                                      |
|                                                                       |
| private readonly publisher: EarningsPublisher, // ← add this          |
|                                                                       |
| ) { super(config, \'TransactionCreatedConsumer\'); }                  |
|                                                                       |
| // At the end of the process() method, after redis.del():             |
|                                                                       |
| private async process(d: any): Promise\<void\> {                      |
|                                                                       |
| // \... existing DB transaction and redis.del() \...                  |
|                                                                       |
| // Read updated balance for the event payload.                        |
|                                                                       |
| const snap = await this.bsRepo.findOne({ where: { contractorId:       |
| d.contractorId } });                                                  |
|                                                                       |
| const prev = snap                                                     |
|                                                                       |
| ? (parseFloat(snap.availableBalance) -                                |
| parseFloat(d.netAmountUsd)).toFixed(2)                                |
|                                                                       |
| : \'0.00\';                                                           |
|                                                                       |
| await this.publisher.publishBalanceUpdated({                          |
|                                                                       |
| contractorId: d.contractorId,                                         |
|                                                                       |
| availableBalance: snap?.availableBalance ?? d.netAmountUsd,           |
|                                                                       |
| previousBalance: prev,                                                |
|                                                                       |
| delta: \`+\${d.netAmountUsd}\`,                                       |
|                                                                       |
| mutationType: \'credit\',                                             |
|                                                                       |
| sourceEventId: d.eventId,                                             |
|                                                                       |
| sourceRoutingKey: \'transaction.created\',                            |
|                                                                       |
| displayCurrency: snap?.displayCurrency ?? \'USD\',                    |
|                                                                       |
| localCurrency: snap?.localCurrency ?? \'USD\',                        |
|                                                                       |
| mutationAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| // YTD threshold check --- see §6.3.                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Apply same pattern to:                                             |
|                                                                       |
| // TransactionReversedConsumer --- mutationType: \'reversal\', delta: |
| \'-{netAmountUsd}\'                                                   |
|                                                                       |
| // PayoutCompletedConsumer --- mutationType: \'payout_completed\',    |
| delta: \'-{payoutAmountUsd}\' (debit)                                 |
|                                                                       |
| // PayoutFailedConsumer --- mutationType: \'payout_failed\', delta:   |
| \'+{payoutAmountUsd}\'                                                |
+=======================================================================+

# **6. Event 2 --- earnings.threshold.reached**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Routing key**       earnings.threshold.reached

  **Exchange**          marketeq.events

  **Durable**           true

  **Persistent**        true

  **Fire rate**         At most once per contractor per calendar year

  **Threshold**         \$600.00 USD YTD --- IRS 1099-NEC reporting
                        threshold
  -----------------------------------------------------------------------

## **6.1 When it fires**

Fired by TransactionCreatedConsumer after the balance upsert completes,
when the new cumulative YTD total first reaches or exceeds \$600.00 USD
in the current calendar year.

+-----------------------------------------------------------------------+
| **Threshold crossing logic --- executed inside                        |
| TransactionCreatedConsumer.process()**                                |
|                                                                       |
| 1\. After the DB transaction commits (earnings_cache insert +         |
| balance_snapshots upsert),                                            |
|                                                                       |
| query the YTD total: SELECT SUM(net_amount_usd) FROM earnings_cache   |
|                                                                       |
| WHERE contractor_id=\$1 AND status=\'confirmed\' AND EXTRACT(YEAR     |
| FROM work_start_at)=\$2                                               |
|                                                                       |
| 2\. If ytdTotal \>= 600.00 AND the previous total was \< 600.00 →     |
| threshold just crossed                                                |
|                                                                       |
| 3\. Check Redis: key threshold_fired:{contractorId}:{year} --- SET NX |
| with 400-day TTL                                                      |
|                                                                       |
| 4\. If SET NX returns null (key existed) → already fired this year,   |
| skip                                                                  |
|                                                                       |
| 5\. If SET NX returns \"OK\" → first crossing this year, publish      |
| earnings.threshold.reached                                            |
|                                                                       |
| The Redis guard in step 3-4 ensures the event fires at most once per  |
| contractor per year                                                   |
|                                                                       |
| even if multiple transactions arrive in rapid succession (race        |
| condition guard).                                                     |
+=======================================================================+

## **6.2 Full payload schema**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // earnings.threshold.reached --- full envelope as published          |
|                                                                       |
| {                                                                     |
|                                                                       |
| // ── Envelope fields ──                                              |
|                                                                       |
| \"eventId\": \"uuid-v4\",                                             |
|                                                                       |
| \"publishedAt\": \"2025-06-10T14:32:01Z\",                            |
|                                                                       |
| \"source\": \"earnings-service\",                                     |
|                                                                       |
| // ── Payload fields from ThresholdReachedPayload ──                  |
|                                                                       |
| \"contractorId\": \"uuid\",                                           |
|                                                                       |
| \"year\": 2025,                                                       |
|                                                                       |
| \"ytdTotalUsd\": \"647.50\", // total YTD at the moment of crossing   |
|                                                                       |
| \"thresholdUsd\": 600.00, // always 600.00                            |
|                                                                       |
| \"crossedAt\": \"2025-06-10T14:32:00Z\"                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -----------------------------------------------------------------------
  **Field**           **Type**   **Description**
  ------------------- ---------- ----------------------------------------
  **eventId**         UUID       Unique per publish. kyc-identity-service
                      string     uses this for Redis SET NX dedup.

  **publishedAt**     ISO 8601   When the message was published.

  **source**          string     Always \"earnings-service\".

  **contractorId**    UUID       The contractor who crossed the
                      string     threshold.

  **year**            integer    Calendar year (e.g. 2025).
                                 kyc-identity-service uses this to scope
                                 the W-9/W-8BEN request to the correct
                                 tax year.

  **ytdTotalUsd**     numeric    The YTD total at the moment of crossing.
                      string     May be above \$600 if a single
                                 transaction pushed it above (e.g. first
                                 transaction is \$1200). Not capped at
                                 \$600.

  **thresholdUsd**    number     Always 600.00. Included so consumers do
                                 not need to hard-code the threshold.

  **crossedAt**       ISO 8601   When the threshold was crossed (the
                                 workStartAt of the triggering
                                 transaction). Not when the event was
                                 published.
  -----------------------------------------------------------------------

## **6.3 Consumer expectations**

  ------------------------------------------------------------------------------------------------
  **Consumer service**       **What it does with this event**                      **Idempotency
                                                                                   requirement**
  -------------------------- ----------------------------------------------------- ---------------
  **kyc-identity-service**   1\. Calls GET                                         Redis SET NX on
                             /v1/internal/earnings/ytd/:contractorId?year={year}   eventId. Tax
                             (ES-03) to get the precise current YTD total. 2.      form must be
                             Determines contractor jurisdiction (US or             requested
                             international). 3. Initiates W-9 (US) or W-8BEN       exactly once
                             (international) collection flow. 4. Sets a flag on    per year.
                             the contractor\'s KYC record: tax_form_required=true  
                             for this year.                                        

  ------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Critical: kyc-identity-service must never trigger twice in the same |
| year**                                                                |
|                                                                       |
| earnings-service guarantees at-most-once publication per contractor   |
| per year via Redis.                                                   |
|                                                                       |
| kyc-identity-service must add its own idempotency guard (Redis SET NX |
| on eventId)                                                           |
|                                                                       |
| in case the RabbitMQ broker delivers the message more than once.      |
|                                                                       |
| If kyc-identity-service receives this event and tax_form_required is  |
| already true                                                          |
|                                                                       |
| for this contractor/year, it must silently ack and take no action.    |
+=======================================================================+

## **6.4 Threshold check code --- added to TransactionCreatedConsumer**

Add the checkAndPublishThreshold() method to TransactionCreatedConsumer
and call it at the end of process(). This replaces the placeholder
comment from ES-04.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Addition to src/consumers/transaction-created.consumer.ts          |
|                                                                       |
| // Add EarningsPublisher and DataSource to constructor (DataSource    |
| already present from ES-04).                                          |
|                                                                       |
| // Add to constructor injection:                                      |
|                                                                       |
| // private readonly publisher: EarningsPublisher                      |
|                                                                       |
| // Add this method to the class:                                      |
|                                                                       |
| private async checkAndPublishThreshold(                               |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| netAmountUsd: string,                                                 |
|                                                                       |
| workStartAt: string,                                                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const year = new Date(workStartAt).getUTCFullYear();                  |
|                                                                       |
| // Sum confirmed YTD earnings for this calendar year.                 |
|                                                                       |
| const row = await this.ds.query(\`                                    |
|                                                                       |
| SELECT COALESCE(SUM(CAST(net_amount_usd AS numeric)), 0) AS ytd       |
|                                                                       |
| FROM earnings_cache                                                   |
|                                                                       |
| WHERE contractor_id = \$1                                             |
|                                                                       |
| AND status = \'confirmed\'                                            |
|                                                                       |
| AND EXTRACT(YEAR FROM work_start_at) = \$2\`,                         |
|                                                                       |
| \[contractorId, year\],                                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| const ytd = parseFloat(row\[0\]?.ytd ?? \'0\');                       |
|                                                                       |
| // Only fire if the threshold is now met.                             |
|                                                                       |
| if (ytd \< 600.00) return;                                            |
|                                                                       |
| // Redis guard --- at most once per contractor per calendar year.     |
|                                                                       |
| // TTL: 400 days --- covers the full year plus a safe buffer.         |
|                                                                       |
| const guardKey = \`threshold_fired:\${contractorId}:\${year}\`;       |
|                                                                       |
| const first = await this.redis.set(guardKey, \'1\', \'EX\', 400 \*    |
| 86400, \'NX\');                                                       |
|                                                                       |
| if (first === null) {                                                 |
|                                                                       |
| // Already fired this year --- skip silently.                         |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.publisher.publishThresholdReached({                        |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| year,                                                                 |
|                                                                       |
| ytdTotalUsd: ytd.toFixed(2),                                          |
|                                                                       |
| thresholdUsd: 600.00,                                                 |
|                                                                       |
| crossedAt: workStartAt,                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Call at the end of process():                                      |
|                                                                       |
| // await this.checkAndPublishThreshold(d.contractorId,                |
| d.netAmountUsd, d.workStartAt);                                       |
+=======================================================================+

# **7. Wire PublishersModule into ConsumersModule & AppModule**

Two module files need updating to inject EarningsPublisher into the
consumers.

### **src/consumers/consumers.module.ts --- updated**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/consumers/consumers.module.ts --- updated                      |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { PublishersModule } from \'../publishers/publishers.module\'; |
| // ← added                                                            |
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
| PublishersModule, // ← added --- makes EarningsPublisher available    |
| for injection                                                         |
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

### **src/app.module.ts --- updated**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts --- updated                                      |
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
| import { ConsumersModule } from \'./consumers/consumers.module\';     |
|                                                                       |
| import { PublishersModule } from \'./publishers/publishers.module\';  |
| // ← added                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule, BalanceModule, EarningsModule,                        |
|                                                                       |
| InternalModule, ConsumersModule,                                      |
|                                                                       |
| PublishersModule, // ← added                                          |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **8. Verification**

## **Confirm earnings.balance.updated fires on transaction.created**

+-----------------------------------------------------------------------------------------------------+
| bash                                                                                                |
+-----------------------------------------------------------------------------------------------------+
| \# 1. In RabbitMQ management UI (http://localhost:15672),                                           |
|                                                                                                     |
| \# bind a temporary test queue to marketeq.events with routing key earnings.balance.updated         |
|                                                                                                     |
| \# 2. Publish a transaction.created event (see ES-04 §11 for payload)                               |
|                                                                                                     |
| rabbitmqadmin publish exchange=marketeq.events routing_key=transaction.created \\                   |
|                                                                                                     |
| payload=\'{\"eventId\":\"e1\",\"transactionId\":\"t1\",\"contractorId\":\"CONTRACTOR_UUID\",\...}\' |
|                                                                                                     |
| \# 3. Check the test queue --- should contain 1 earnings.balance.updated message:                   |
|                                                                                                     |
| rabbitmqadmin get queue=test.balance.watch                                                          |
|                                                                                                     |
| \# Expected payload fields: contractorId, delta, mutationType=\'credit\', availableBalance          |
|                                                                                                     |
| \# 4. Confirm publisher confirms --- check service logs:                                            |
|                                                                                                     |
| \# Expected: \'earnings.balance.updated published for CONTRACTOR_UUID\'                             |
+=====================================================================================================+

## **Confirm earnings.threshold.reached fires at \$600 crossing**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. Bind a test queue to routing key earnings.threshold.reached     |
|                                                                       |
| \# 2. Publish enough transaction.created events to push YTD \>=       |
| \$600.                                                                |
|                                                                       |
| \# Each event credits netAmountUsd to the contractor.                 |
|                                                                       |
| \# Example: publish 8 events each with netAmountUsd=\'80.00\' (total  |
| = \$640)                                                              |
|                                                                       |
| \# After the event that pushes total \>= \$600:                       |
|                                                                       |
| \# Expected in test queue: 1 earnings.threshold.reached message       |
|                                                                       |
| \# Expected fields: contractorId, year, ytdTotalUsd \>= \'600.00\',   |
| thresholdUsd: 600                                                     |
|                                                                       |
| \# 3. Publish one more transaction.created event (total now \> \$600) |
|                                                                       |
| \# Expected: NO second earnings.threshold.reached published           |
|                                                                       |
| \# Verify Redis guard key exists:                                     |
|                                                                       |
| redis-cli GET threshold_fired:CONTRACTOR_UUID:2025                    |
|                                                                       |
| \# Expected: \'1\'                                                    |
+=======================================================================+

## **Confirm publisher confirms are working**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Stop RabbitMQ while service is running:                            |
|                                                                       |
| docker compose stop rabbitmq                                          |
|                                                                       |
| \# Publish a transaction.created event --- consumer will process and  |
| try to publish                                                        |
|                                                                       |
| \# Expected: EarningsPublisher.publish() throws, consumer handler     |
| catches the error,                                                    |
|                                                                       |
| \# retries the full handler (including the publish), eventually       |
| routes to DLQ                                                         |
|                                                                       |
| \# Restart RabbitMQ:                                                  |
|                                                                       |
| docker compose start rabbitmq                                         |
|                                                                       |
| \# Service reconnects automatically via amqplib connection retry      |
+=======================================================================+

# **9. Event Contract Summary**

This table is the authoritative reference for all events published by
earnings-service. Consumer teams copy this table into their own service
documentation.

  -----------------------------------------------------------------------------------------------------------------------------------------
  **Routing Key**                  **Exchange**      **Published by**               **Consumers**          **At most    **Payload fields**
                                                                                                           once?**      
  -------------------------------- ----------------- ------------------------------ ---------------------- ------------ -------------------
  **earnings.balance.updated**     marketeq.events   TransactionCreatedConsumer,    payout-service,        No --- fires contractorId,
                                                     TransactionReversedConsumer,   notification-service   on every     availableBalance,
                                                     PayoutCompletedConsumer,                              balance      previousBalance,
                                                     PayoutFailedConsumer                                  mutation     delta,
                                                                                                                        mutationType,
                                                                                                                        sourceEventId,
                                                                                                                        sourceRoutingKey,
                                                                                                                        displayCurrency,
                                                                                                                        localCurrency,
                                                                                                                        mutationAt

  **earnings.threshold.reached**   marketeq.events   TransactionCreatedConsumer     kyc-identity-service   Yes --- once contractorId, year,
                                                                                                           per          ytdTotalUsd,
                                                                                                           contractor   thresholdUsd,
                                                                                                           per calendar crossedAt
                                                                                                           year via     
                                                                                                           Redis guard  
  -----------------------------------------------------------------------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship to ES-05**
  ------------------------- ---------------------------------------------
  **ES-03 --- Internal      GET /v1/internal/earnings/ytd/:userId called
  Endpoints**               by kyc-identity-service after receiving
                            earnings.threshold.reached

  **ES-04 --- RabbitMQ      All four balance-mutating consumers call
  Consumers**               publishBalanceUpdated().
                            TransactionCreatedConsumer calls
                            publishThresholdReached().

  **ES-07 --- Redis         Redis key
  Caching**                 threshold_fired:{contractorId}:{year}
                            (400-day TTL) prevents duplicate threshold
                            events. balance:{contractorId} key format
                            also used here.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-05 \| v1.0
