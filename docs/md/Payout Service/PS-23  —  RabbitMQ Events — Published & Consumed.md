**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-23 --- RabbitMQ Events --- Published & Consumed

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-23 --- RabbitMQ Events --- Published & Consumed

  **Version**         1.0

  **Applies to**      All RabbitMQ event contracts between payout-service
                      and other services.

  **Broker**          RabbitMQ. Exchange type: direct for all
                      payout-service events.

  **Events            payout.initiated, payout.completed, payout.failed,
  published**         payout.scheduled.skipped --- plus all subsidiary
                      events from PS-14 through PS-19.

  **Events consumed** earnings.balance.updated

  **Idempotency**     All consumers must be idempotent. eventId (UUID v4)
                      in every payload. Consumers deduplicate by eventId.

  **Dead-letter       Every queue has a paired DLQ. Max 3 delivery
  config**            attempts. DLQ messages consumed by
                      dead-letter-processor.

  **Prerequisites**   PS-02, PS-03, PS-14, PS-15, PS-16, PS-17,
                      earnings-service
  -----------------------------------------------------------------------

# **1. Overview**

payout-service communicates with other Marketeq services exclusively via
RabbitMQ events --- it never calls other services synchronously except
for internal API calls to kyc-identity-service (gate status) and
earnings-service (balance read and debit). This document is the
definitive contract for all events payout-service publishes and all
events it consumes. Any change to a payload schema, exchange, routing
key, or delivery guarantee must be coordinated across all consuming
services and documented here before deployment.

+-----------------------------------------------------------------------+
| **This document is the event contract --- treat it as an interface    |
| specification**                                                       |
|                                                                       |
| Every payload field marked as required must be present on every event |
| emission.                                                             |
|                                                                       |
| Adding optional fields is non-breaking. Removing or renaming any      |
| field is breaking.                                                    |
|                                                                       |
| Breaking changes require: (1) version bump on the event type string,  |
|                                                                       |
| \(2\) coordination with all consuming services before deployment,     |
|                                                                       |
| \(3\) a migration period where both versions are published            |
| simultaneously.                                                       |
|                                                                       |
| Never change a field type silently --- treat type changes as breaking |
| changes.                                                              |
+=======================================================================+

# **2. Infrastructure Configuration**

## **2.1 Exchanges**

  --------------------------------------------------------------------------------------
  **Exchange name**          **Type**   **Durable**   **Purpose**
  -------------------------- ---------- ------------- ----------------------------------
  **payout-service**         direct     Yes           All events published by
                                                      payout-service. One exchange ---
                                                      routing keys distinguish event
                                                      types.

  **earnings-service**       direct     Yes           Events published by
                                                      earnings-service. payout-service
                                                      subscribes to this exchange.

  **notification-service**   direct     Yes           Notification events.
                                                      payout-service publishes here for
                                                      email/in-app delivery.

  **dead-letter**            fanout     Yes           Receives all dead-lettered
                                                      messages from all service queues.
                                                      Consumed by dead-letter-processor
                                                      service.
  --------------------------------------------------------------------------------------

## **2.2 Queue declarations (payout-service)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/messaging/queues.config.ts                                     |
|                                                                       |
| // Folder: /apps/payout-service/src/messaging/                        |
|                                                                       |
| export const QUEUES = {                                               |
|                                                                       |
| // Queues payout-service owns (subscribes to)                         |
|                                                                       |
| EARNINGS_BALANCE_UPDATED: {                                           |
|                                                                       |
| name: \"payout-service.earnings.balance.updated\",                    |
|                                                                       |
| exchange: \"earnings-service\",                                       |
|                                                                       |
| routingKey: \"earnings.balance.updated\",                             |
|                                                                       |
| dlq: \"payout-service.earnings.balance.updated.dlq\",                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Dead-letter queues --- payout-service side                         |
|                                                                       |
| EARNINGS_BALANCE_UPDATED_DLQ: {                                       |
|                                                                       |
| name: \"payout-service.earnings.balance.updated.dlq\",                |
|                                                                       |
| exchange: \"dead-letter\",                                            |
|                                                                       |
| routingKey: \"payout-service.earnings.balance.updated\",              |
|                                                                       |
| },                                                                    |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // Queue declaration with DLQ binding                                 |
|                                                                       |
| channel.assertQueue(QUEUES.EARNINGS_BALANCE_UPDATED.name, {           |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| arguments: {                                                          |
|                                                                       |
| \"x-dead-letter-exchange\": \"dead-letter\",                          |
|                                                                       |
| \"x-dead-letter-routing-key\":                                        |
| \"payout-service.earnings.balance.updated\",                          |
|                                                                       |
| \"x-message-ttl\": 86_400_000, // 24-hour TTL on queued messages      |
|                                                                       |
| \"x-max-delivery-count\": 3, // Max 3 delivery attempts before DLQ    |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
+=======================================================================+

## **2.3 Dead-letter queue policy**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Max delivery        3\. On the 3rd failed acknowledgement: message is
  attempts**            dead-lettered.

  **DLQ naming          {originating-queue}.dlq
  convention**          

  **DLQ exchange**      dead-letter (fanout). All DLQ messages go here.

  **DLQ consumer**      dead-letter-processor service. Logs the message,
                        alerts ops team, stores in dead_letter_archive
                        table for manual inspection.

  **DLQ message TTL**   7 days. After 7 days: auto-deleted from DLQ. Ops
                        must process within 7 days.

  **Retry strategy**    Exponential backoff via requeue with per-message
                        delay header: attempt 1 immediate, attempt 2
                        after 30s, attempt 3 after 5 minutes. Implemented
                        via RabbitMQ delayed message plugin.

  **Alerting**          PagerDuty alert fires if any DLQ depth \> 0. Ops
                        must investigate all DLQ messages.
  -----------------------------------------------------------------------

## **2.4 Idempotency --- consumer-side deduplication**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Every consumer must implement idempotency using eventId            |
|                                                                       |
| // Base consumer class --- all consumers extend this                  |
|                                                                       |
| // src/messaging/base-consumer.ts                                     |
|                                                                       |
| abstract class BaseConsumer\<T extends { eventId: string }\> {        |
|                                                                       |
| async handle(msg: ConsumeMessage): Promise\<void\> {                  |
|                                                                       |
| const payload: T = JSON.parse(msg.content.toString());                |
|                                                                       |
| // Deduplication check --- Redis SETNX with 24-hour TTL               |
|                                                                       |
| const dedupKey = \`consumed:\${this.queueName}:\${payload.eventId}\`; |
|                                                                       |
| const isNew = await this.redis.set(dedupKey, \"1\", \"EX\", 86400,    |
| \"NX\");                                                              |
|                                                                       |
| if (!isNew) {                                                         |
|                                                                       |
| // Already processed --- ack silently, do not reprocess               |
|                                                                       |
| this.channel.ack(msg);                                                |
|                                                                       |
| this.logger.log(\"Duplicate event ignored\", { eventId:               |
| payload.eventId });                                                   |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.process(payload);                                          |
|                                                                       |
| this.channel.ack(msg);                                                |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\"Consumer processing failed\", { eventId:          |
| payload.eventId, err });                                              |
|                                                                       |
| // Requeue with backoff on attempt \< 3, DLQ on attempt 3             |
|                                                                       |
| const attempt = (msg.properties.headers?.\[\"x-delivery-count\"\] ??  |
| 0) + 1;                                                               |
|                                                                       |
| if (attempt \< 3) {                                                   |
|                                                                       |
| this.channel.nack(msg, false, true); // requeue                       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| this.channel.nack(msg, false, false); // dead-letter                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| abstract process(payload: T): Promise\<void\>;                        |
|                                                                       |
| abstract queueName: string;                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Events Published by payout-service**

## **3.1 payout.initiated**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Exchange**       payout-service

  **Routing key**    payout.initiated

  **Published when** POST /v1/payouts/initiate succeeds. payout_requests
                     row created with status=awaiting_verification
                     (manual) or status=processing (scheduled, no magic
                     link required).

  **Consumed by**    notification-service (send \"your withdrawal is
                     being processed\" in-app notification),
                     earnings-service (reserve the balance),
                     analytics-service
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout.initiated payload                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string, // UUID v4 --- unique per event emission             |
|                                                                       |
| eventType: \"payout.initiated\",                                      |
|                                                                       |
| occurredAt: string, // ISO 8601                                       |
|                                                                       |
| payoutRequestId: string, // UUID --- payout_requests.id               |
|                                                                       |
| contractorId: string, // UUID                                         |
|                                                                       |
| amountUSD: number, // e.g. 250.00                                     |
|                                                                       |
| depositMethodId: string, // UUID                                      |
|                                                                       |
| methodType: \"BANK_STRIPE\" \| \"BANK_MANUAL\" \| \"PAYPAL\" \|       |
| \"WISE\" \|                                                           |
|                                                                       |
| \"PAYONEER\" \| \"CRYPTO\" \| \"DEBIT_CARD\",                         |
|                                                                       |
| initiationType: \"manual\" \| \"scheduled\",                          |
|                                                                       |
| scheduleId: string \| null, // UUID if scheduled, null if manual      |
|                                                                       |
| splitRole: \"primary\" \| \"secondary\" \| null, // null if not a     |
| split payout                                                          |
|                                                                       |
| status: \"awaiting_verification\" \| \"processing\",                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 payout.completed**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Exchange**       payout-service

  **Routing key**    payout.completed

  **Published when** payout_requests.status transitions to completed.
                     Triggered by settlement webhook from
                     Stripe/bridge/provider.

  **Consumed by**    notification-service (send \"your payout was sent\"
                     email + in-app), earnings-service (confirm ledger
                     debit is final), analytics-service, finance-service
                     (reconciliation)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout.completed payload                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| eventType: \"payout.completed\",                                      |
|                                                                       |
| occurredAt: string,                                                   |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| depositMethodId: string,                                              |
|                                                                       |
| methodType: string,                                                   |
|                                                                       |
| initiationType: \"manual\" \| \"scheduled\",                          |
|                                                                       |
| scheduleId: string \| null,                                           |
|                                                                       |
| splitRole: \"primary\" \| \"secondary\" \| null,                      |
|                                                                       |
| // Settlement details                                                 |
|                                                                       |
| externalTransactionId: string, // Stripe payout ID, crypto txHash,    |
| PayPal txId, etc.                                                     |
|                                                                       |
| settledAt: string, // ISO 8601 --- time settlement confirmed          |
|                                                                       |
| settlementNetwork: string \| null, // \"ethereum\" \| \"bitcoin\" \|  |
| \"ach\" \| null                                                       |
|                                                                       |
| bridgeProvider: string \| null, // \"ramp\" \| \"transak\" \|         |
| \"stripe\" \| null                                                    |
|                                                                       |
| // For notification-service message personalisation                   |
|                                                                       |
| methodLabel: string, // e.g. \"Chase Bank (\...4521)\", \"PayPal      |
| (you@email.com)\"                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 payout.failed**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Exchange**       payout-service

  **Routing key**    payout.failed

  **Published when** payout_requests.status transitions to failed for any
                     reason.

  **Consumed by**    notification-service (send failure notification),
                     earnings-service (release reserved balance --- funds
                     return to available), analytics-service,
                     finance-service
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout.failed payload                                              |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| eventType: \"payout.failed\",                                         |
|                                                                       |
| occurredAt: string,                                                   |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| depositMethodId: string,                                              |
|                                                                       |
| methodType: string,                                                   |
|                                                                       |
| initiationType: \"manual\" \| \"scheduled\",                          |
|                                                                       |
| scheduleId: string \| null,                                           |
|                                                                       |
| splitRole: \"primary\" \| \"secondary\" \| null,                      |
|                                                                       |
| // Failure detail                                                     |
|                                                                       |
| failureCode: string, // ERR\_\* code from PS-19 error reference       |
|                                                                       |
| failureReason: string, // Human-readable for notification-service     |
|                                                                       |
| retryable: boolean, // true if payout-service will retry              |
| automatically                                                         |
|                                                                       |
| retryCount: number, // How many times this payout has been attempted  |
|                                                                       |
| finalFailure: boolean, // true if max retries exhausted --- no        |
| further attempts                                                      |
|                                                                       |
| // ACH-specific (populated when methodType = BANK_STRIPE or           |
| BANK_MANUAL)                                                          |
|                                                                       |
| achReturnCode: string \| null, // R01, R02, etc.                      |
|                                                                       |
| // Whether method was deactivated as a result of this failure         |
|                                                                       |
| methodDeactivated: boolean,                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.4 payout.scheduled.skipped**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Exchange**       payout-service

  **Routing key**    payout.scheduled.skipped

  **Published when** Schedule execution cycle is skipped for any reason
                     (below threshold, outside window, pause condition
                     active, KYC gate failed). Does NOT fire on every
                     skipped cycle --- only when the skip reason changes
                     or when consecutiveMissCount reaches a notification
                     threshold.

  **Consumed by**    notification-service (threshold miss notification
                     per PS-17 §5.3), analytics-service
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout.scheduled.skipped payload                                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| eventType: \"payout.scheduled.skipped\",                              |
|                                                                       |
| occurredAt: string,                                                   |
|                                                                       |
| scheduleId: string,                                                   |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| frequency: \"WEEKLY\" \| \"BIWEEKLY\" \| \"MONTHLY\" \|               |
| \"THRESHOLD\",                                                        |
|                                                                       |
| skipReason: \"BELOW_THRESHOLD\" \| \"OUTSIDE_WINDOW\" \|              |
| \"PAUSE_CONDITION\" \|                                                |
|                                                                       |
| \"KYC_GATE_FAILED\" \| \"EDD_TRIGGERED\" \| \"ZERO_BALANCE\",         |
|                                                                       |
| // Populated when skipReason = BELOW_THRESHOLD                        |
|                                                                       |
| thresholdUSD: number \| null,                                         |
|                                                                       |
| currentBalanceUSD: number \| null,                                    |
|                                                                       |
| consecutiveMissCount: number \| null,                                 |
|                                                                       |
| notifyContractor: boolean, // true when consecutiveMissCount % 3 ===  |
| 0                                                                     |
|                                                                       |
| // Populated when skipReason = PAUSE_CONDITION                        |
|                                                                       |
| pauseCondition: string \| null, // NO_DEFAULT_METHOD \| OFAC_FLAG \|  |
| etc.                                                                  |
|                                                                       |
| // Next scheduled attempt                                             |
|                                                                       |
| nextExecutionAt: string, // ISO 8601                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.5 Subsidiary events --- full reference**

The following events are published by payout-service in addition to the
four primary events above. Each is documented in detail in the
referenced document. This table provides the complete routing key
inventory for exchange configuration and consumer binding.

  --------------------------------------------------------------------------------------------
  **Event (routing key)**               **Exchange**     **Defined   **Consumed by**
                                                         in**        
  ------------------------------------- ---------------- ----------- -------------------------
  **payout.magic_link.requested**       payout-service   PS-14 §4.1  notification-service

  **payout.cancelled**                  payout-service   PS-14 §10   notification-service,
                                                                     earnings-service

  **payout.paused**                     payout-service   PS-16 §7.1  notification-service

  **payout.resumed**                    payout-service   PS-16 §7.2  notification-service

  **payout.edd.triggered**              payout-service   PS-15 §6.2  compliance-service,
                                                                     notification-service

  **payout.schedule.completed**         payout-service   PS-17 §7    notification-service,
                                                                     analytics-service

  **payout.schedule.threshold_miss**    payout-service   PS-17 §5.2  notification-service

  **payout.schedule.partial_failure**   payout-service   PS-17 §8.3  notification-service,
                                                                     finance-service

  **payout.secondary.failed**           payout-service   PS-17 §8.4  finance-service (alert
                                                                     queue)

  **payout.method.deactivated**         payout-service   PS-23 §3    notification-service,
                                                         (ACH return payout-service (pause
                                                         handler)    evaluator)

  **payout.trust_safety.escalation**    payout-service   PS-23 §3    trust-safety-service
                                                         (ACH return 
                                                         handler)    
  --------------------------------------------------------------------------------------------

# **4. Events Consumed by payout-service**

## **4.1 earnings.balance.updated**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Exchange**       earnings-service

  **Routing key**    earnings.balance.updated

  **Queue            payout-service.earnings.balance.updated
  (payout-service    
  side)**            

  **DLQ**            payout-service.earnings.balance.updated.dlq

  **Published by**   earnings-service on every credit, debit, lock, or
                     unlock event that changes a contractor\'s available
                     balance.

  **Why              Before executing a scheduled payout or confirming a
  payout-service     manual withdrawal, payout-service must verify the
  consumes it**      balance has not changed since initiation. This event
                     triggers a re-check of the pending payout against
                     the current balance.

  **Idempotency      Consumer must deduplicate by eventId. Balance
  requirement**      updates may arrive out of order --- consumer must
                     compare the event\'s balanceUSD against the payout
                     amount, not assume the event represents the latest
                     state.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // earnings.balance.updated payload --- published by earnings-service |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string, // UUID v4                                           |
|                                                                       |
| eventType: \"earnings.balance.updated\",                              |
|                                                                       |
| occurredAt: string, // ISO 8601                                       |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| previousBalanceUSD: number,                                           |
|                                                                       |
| newBalanceUSD: number, // Available balance after this event          |
|                                                                       |
| changeAmountUSD: number, // Positive = credit, negative = debit       |
|                                                                       |
| changeReason: \"CONTRACT_COMPLETED\" \| \"PAYOUT_INITIATED\" \|       |
| \"PAYOUT_REVERSED\" \|                                                |
|                                                                       |
| \"DISPUTE_LOCK\" \| \"DISPUTE_UNLOCK\" \| \"ADJUSTMENT\" \|           |
| \"FEE_DEDUCTED\",                                                     |
|                                                                       |
| relatedEntityId: string, // contractId, payoutRequestId, or           |
| adjustmentId                                                          |
|                                                                       |
| relatedEntityType: \"contract\" \| \"payout_request\" \|              |
| \"adjustment\",                                                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.2 Consumer behaviour on earnings.balance.updated**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/messaging/consumers/earnings-balance-updated.consumer.ts       |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class EarningsBalanceUpdatedConsumer                           |
|                                                                       |
| extends BaseConsumer\<EarningsBalanceUpdatedPayload\> {               |
|                                                                       |
| readonly queueName = QUEUES.EARNINGS_BALANCE_UPDATED.name;            |
|                                                                       |
| async process(payload: EarningsBalanceUpdatedPayload):                |
| Promise\<void\> {                                                     |
|                                                                       |
| // Only act on balance decreases --- a credit does not affect pending |
| payouts                                                               |
|                                                                       |
| if (payload.changeAmountUSD \>= 0) return;                            |
|                                                                       |
| // Find any payout_requests in AWAITING_VERIFICATION or PROCESSING    |
| state                                                                 |
|                                                                       |
| // for this contractor that have not yet executed                     |
|                                                                       |
| const pendingPayouts = await this.payoutRequestRepo.find({            |
|                                                                       |
| where: {                                                              |
|                                                                       |
| contractorId: payload.contractorId,                                   |
|                                                                       |
| status: In(\[                                                         |
|                                                                       |
| PayoutStatus.AWAITING_VERIFICATION,                                   |
|                                                                       |
| PayoutStatus.PROCESSING,                                              |
|                                                                       |
| PayoutStatus.AWAITING_EDD,                                            |
|                                                                       |
| \]),                                                                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| for (const payout of pendingPayouts) {                                |
|                                                                       |
| // If new balance is insufficient for this payout: fail it            |
| proactively                                                           |
|                                                                       |
| if (payload.newBalanceUSD \< payout.amountUSD) {                      |
|                                                                       |
| await this.payoutRequestRepo.update(payout.id, {                      |
|                                                                       |
| status: PayoutStatus.FAILED,                                          |
|                                                                       |
| failureCode: \"ERR_INSUFFICIENT_BALANCE_AT_EXECUTION\",               |
|                                                                       |
| failureReason: \"Balance changed before payout could execute.\",      |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.failed\", {                      |
|                                                                       |
| eventId: uuidv4(),                                                    |
|                                                                       |
| eventType: \"payout.failed\",                                         |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| payoutRequestId: payout.id,                                           |
|                                                                       |
| contractorId: payload.contractorId,                                   |
|                                                                       |
| amountUSD: payout.amountUSD,                                          |
|                                                                       |
| depositMethodId: payout.depositMethodId,                              |
|                                                                       |
| methodType: payout.methodType,                                        |
|                                                                       |
| initiationType: payout.initiationType,                                |
|                                                                       |
| scheduleId: payout.scheduleId,                                        |
|                                                                       |
| splitRole: payout.splitRole,                                          |
|                                                                       |
| failureCode: \"ERR_INSUFFICIENT_BALANCE_AT_EXECUTION\",               |
|                                                                       |
| failureReason: \"Your balance changed before your payout could be     |
| sent.\",                                                              |
|                                                                       |
| retryable: false,                                                     |
|                                                                       |
| retryCount: 0,                                                        |
|                                                                       |
| finalFailure: true,                                                   |
|                                                                       |
| achReturnCode: null,                                                  |
|                                                                       |
| methodDeactivated: false,                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Event Versioning and Schema Evolution**

  -------------------------------------------------------------------------------
  **Change type**    **Classification**   **Process**
  ------------------ -------------------- ---------------------------------------
  **Add optional     Non-breaking         Can be deployed to payout-service
  field to payload**                      without coordinating consumers.
                                          Consumers must ignore unknown fields.
                                          Document the new field in this document
                                          before deployment.

  **Remove field     Breaking             Full coordination required. (1) Bump
  from payload**                          eventType version string:
                                          \"payout.completed\" →
                                          \"payout.completed.v2\". (2) Publish
                                          both versions during migration window.
                                          (3) Confirm all consumers migrated
                                          before deprecating v1.

  **Rename field**   Breaking             Same as remove --- treat as remove
                                          old + add new.

  **Change field     Breaking             Same as remove.
  type (e.g. string                       
  → number)**                             

  **Add new required Breaking             Same as remove --- consumers that
  field**                                 don\'t expect it will fail schema
                                          validation.

  **Add new event    Non-breaking for     New consumers can subscribe at any
  type**             existing consumers   time. Existing consumers are
                                          unaffected.
  -------------------------------------------------------------------------------

## **5.1 eventType versioning convention**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Current version (v1) --- no version suffix                         |
|                                                                       |
| eventType: \"payout.completed\"                                       |
|                                                                       |
| // Breaking change --- bump to v2                                     |
|                                                                       |
| eventType: \"payout.completed.v2\"                                    |
|                                                                       |
| // During migration: publish both                                     |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.completed\", legacyPayload);     |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.completed.v2\", newPayload);     |
|                                                                       |
| // Deprecation: remove v1 publication after all consumers confirm     |
| migration                                                             |
|                                                                       |
| // Deprecation window: minimum 2 sprints (4 weeks)                    |
+=======================================================================+

# **6. Payload Field Standards --- All Events**

  ------------------------------------------------------------------------------------
  **Field**          **Type**      **Required**   **Rule**
  ------------------ ------------- -------------- ------------------------------------
  **eventId**        string (UUID  Yes --- all    Unique per emission. Used for
                     v4)           events         consumer deduplication. Generated by
                                                  publisher using uuidv4().

  **eventType**      string        Yes --- all    Exact string matching the routing
                                   events         key. Allows consumers to
                                                  discriminate in fanout scenarios.

  **occurredAt**     string (ISO   Yes --- all    Server-side UTC timestamp at time of
                     8601)         events         event emission. Never client-side
                                                  time.

  **contractorId**   string (UUID) Yes --- all    Always included. Enables
                                   payout events  consumer-side filtering without
                                                  payload inspection.

  **amountUSD**      number        Yes ---        Decimal with up to 2dp. Never a
                                   financial      string. Never formatted with
                                   events         currency symbols.

  **All IDs**        string (UUID) Varies         All entity IDs are UUID v4. Never
                                                  integer IDs in events.

  **Enum fields**    string        Varies         Use string literals, not numeric
                     literal union                enums. Consumer must handle unknown
                                                  enum values gracefully (ignore, do
                                                  not crash).

  **Nullable         field \| null Varies         Explicitly typed as nullable. Never
  fields**                                        omit nullable fields --- always
                                                  include with null value.
  ------------------------------------------------------------------------------------

# **7. Monitoring and Observability**

  -------------------------------------------------------------------------------
  **Metric**                   **Alert            **Action**
                               threshold**        
  ---------------------------- ------------------ -------------------------------
  **payout-service publish     \> 1% of attempted PagerDuty alert. Investigate
  failure rate**               publishes in       RabbitMQ connectivity. Payouts
                               5-minute window    may be completing without
                                                  downstream consumers being
                                                  notified.

  **earnings.balance.updated   \> 1,000 messages  Alert ops. Consumer may be
  queue depth**                                   behind. Pending payouts may
                                                  execute against stale balance.

  **Any DLQ depth \> 0**       Immediate          PagerDuty alert. Manual
                                                  inspection required. Each DLQ
                                                  message represents a failed
                                                  consumer that did not
                                                  self-recover.

  **Event processing latency   p99 \> 5 seconds   Warning alert. Investigate
  (consumed events)**                             consumer performance.

  **eventId deduplication      Informational ---  High hit rate may indicate
  cache hit rate**             log only           upstream publisher is retrying
                                                  excessively.
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Publisher wrapper --- always logs publish attempt and outcome      |
|                                                                       |
| // src/messaging/rabbitmq-publisher.ts                                |
|                                                                       |
| async publish\<T extends { eventId: string; eventType: string }\>(    |
|                                                                       |
| routingKey: string,                                                   |
|                                                                       |
| payload: T,                                                           |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const startMs = Date.now();                                           |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.channel.publish(                                           |
|                                                                       |
| \"payout-service\",                                                   |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| Buffer.from(JSON.stringify(payload)),                                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| persistent: true, // Survives RabbitMQ restart                        |
|                                                                       |
| contentType: \"application/json\",                                    |
|                                                                       |
| messageId: payload.eventId,                                           |
|                                                                       |
| timestamp: Math.floor(Date.now() / 1000),                             |
|                                                                       |
| appId: \"payout-service\",                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| this.metrics.increment(\"rabbitmq.publish.success\", { routingKey }); |
|                                                                       |
| this.logger.log(\"Event published\", {                                |
|                                                                       |
| eventId: payload.eventId,                                             |
|                                                                       |
| eventType: payload.eventType,                                         |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| durationMs: Date.now() - startMs,                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.metrics.increment(\"rabbitmq.publish.failure\", { routingKey }); |
|                                                                       |
| this.logger.error(\"Event publish failed\", { eventId:                |
| payload.eventId, routingKey, err });                                  |
|                                                                       |
| throw err; // Let caller handle --- do not silently swallow           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Complete Event Inventory --- payout-service**

  -------------------------------------------------------------------------------------------------------------
  **Event (routing key)**               **Direction**   **Exchange**       **Primary consumers**   **Defined
                                                                                                   in**
  ------------------------------------- --------------- ------------------ ----------------------- ------------
  **payout.initiated**                  Published       payout-service     notification-service,   PS-23 §3.1
                                                                           earnings-service,       
                                                                           analytics-service       

  **payout.completed**                  Published       payout-service     notification-service,   PS-23 §3.2
                                                                           earnings-service,       
                                                                           analytics-service,      
                                                                           finance-service         

  **payout.failed**                     Published       payout-service     notification-service,   PS-23 §3.3
                                                                           earnings-service,       
                                                                           analytics-service,      
                                                                           finance-service         

  **payout.scheduled.skipped**          Published       payout-service     notification-service,   PS-23 §3.4
                                                                           analytics-service       

  **payout.magic_link.requested**       Published       payout-service     notification-service    PS-14 §4.1

  **payout.cancelled**                  Published       payout-service     notification-service,   PS-14 §10
                                                                           earnings-service        

  **payout.paused**                     Published       payout-service     notification-service    PS-16 §7.1

  **payout.resumed**                    Published       payout-service     notification-service    PS-16 §7.2

  **payout.edd.triggered**              Published       payout-service     compliance-service,     PS-15 §6.2
                                                                           notification-service    

  **payout.schedule.completed**         Published       payout-service     notification-service,   PS-17 §7
                                                                           analytics-service       

  **payout.schedule.threshold_miss**    Published       payout-service     notification-service    PS-17 §5.2

  **payout.schedule.partial_failure**   Published       payout-service     notification-service,   PS-17 §8.3
                                                                           finance-service         

  **payout.secondary.failed**           Published       payout-service     finance-service         PS-17 §8.4

  **payout.method.deactivated**         Published       payout-service     notification-service,   PS-23 §3
                                                                           payout-service (pause)  

  **payout.trust_safety.escalation**    Published       payout-service     trust-safety-service    PS-23 §3

  **earnings.balance.updated**          Consumed        earnings-service   (payout-service is the  PS-23 §4
                                                                           consumer)               
  -------------------------------------------------------------------------------------------------------------

# **9. References**

  -----------------------------------------------------------------------
  **Document**          **Relevant to**
  --------------------- -------------------------------------------------
  **PS-02 ---           payout_requests status transitions that trigger
  Withdrawal Flow**     event publication.

  **PS-14 --- Magic     payout.magic_link.requested, payout.cancelled
  Link**                event specs.

  **PS-15 --- KYC       payout.edd.triggered event spec.
  Gating**              

  **PS-16 --- Paused    payout.paused, payout.resumed event specs.
  Payouts**             

  **PS-17 --- Schedule  payout.schedule.\* event specs.
  Execution Engine**    payout.secondary.failed.

  **earnings-service    earnings.balance.updated publisher spec.
  ES-07**               
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-23 \| v1.0
