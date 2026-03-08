**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 05 \-- Integrations & Events**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 05

  Prerequisites      Doc 00 through Doc 04

  Message Broker     RabbitMQ \-- topic exchanges

  Events Consumed    11 (billing: 7 \| time-tracking: 1 \| payout: 3)

  Events Published   2 (transaction.created, transaction.status.updated)

  Realtime Push      Ably \-- per-user channel, transaction status
                     changes

  Cache              Redis \-- transaction and invoice list query results

  Stripe             Read-only \-- invoice hosted URL and PDF link
                     retrieval

  QuickBooks         Indirect \-- via billing-service reconciliation
                     events
  -----------------------------------------------------------------------

# **1. Purpose**

This document defines every event-driven integration for
transaction-service. It covers the RabbitMQ topology, all 11 consumed
event payload contracts and their consumer handler implementations, the
2 events this service publishes, Ably real-time status push, Redis
caching strategy, QuickBooks reconciliation flow, share context for
invitations-service, and ASCII sequence diagrams for every major money
flow.

transaction-service is a passive ledger. It never initiates a payment,
calls a billing API, or instructs another service to do anything. Every
write to the transactions and invoices tables originates from a RabbitMQ
message. The HTTP endpoints in Doc 04 are read-only from the database
perspective \-- the only HTTP-triggered writes are problem reports and
audit log entries.

+-----------------------------------------------------------------------+
| **Architecture Principle**                                            |
|                                                                       |
| transaction-service consumes events and records them. It never calls  |
| billing-service, time-tracking-service, or payout-service directly.   |
| All communication is one-directional via RabbitMQ. This keeps the     |
| ledger decoupled from payment processing and auditable in isolation.  |
+=======================================================================+

# **2. RabbitMQ Exchange & Queue Topology**

## **2.1 Exchanges**

All Marketeq services publish to durable topic exchanges.
transaction-service subscribes to three upstream exchanges and publishes
to one outbound exchange.

  --------------------------------------------------------------------------------------
  **Exchange**            **Type**   **Published By**        **Description**
  ----------------------- ---------- ----------------------- ---------------------------
  marketeq.billing        topic      billing-service         All billing events \--
                                                             payments, refunds,
                                                             invoices, subscriptions,
                                                             wire transfers

  marketeq.timetracking   topic      time-tracking-service   Hourly tracking events that
                                                             credit contractor earnings

  marketeq.payout         topic      payout-service          Talent payout lifecycle
                                                             events

  marketeq.transactions   topic      transaction-service     Outbound events published
                                                             by this service
  --------------------------------------------------------------------------------------

## **2.2 Queue Bindings**

  --------------------------------------------------------------------------------------------------------
  **Queue**                     **Bound Exchange**      **Routing Key    **Dead-Letter Queue**
                                                        Pattern**        
  ----------------------------- ----------------------- ---------------- ---------------------------------
  txn-svc.billing.events        marketeq.billing        billing.#        txn-svc.billing.events.dlq

  txn-svc.timetracking.events   marketeq.timetracking   timetracking.#   txn-svc.timetracking.events.dlq

  txn-svc.payout.events         marketeq.payout         payout.#         txn-svc.payout.events.dlq
  --------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Dead-Letter Queues are Mandatory**                                  |
|                                                                       |
| Every queue must have a DLQ configured. If a consumer throws an       |
| unhandled exception the message is nack\'d without requeue and routed |
| to the DLQ. A non-empty DLQ means a financial event was not recorded. |
| This is a P1 incident. See Doc 06 for DLQ depth alerting              |
| configuration.                                                        |
+=======================================================================+

## **2.3 RabbitMQ Module Configuration**

**/apps/transaction-service/src/app.module.ts (RabbitMQ addition)**

+-----------------------------------------------------------------------+
| **app.module.ts \-- RabbitMQ setup**                                  |
+-----------------------------------------------------------------------+
| import { RabbitMQModule } from \'@golevelup/nestjs-rabbitmq\';        |
|                                                                       |
| // Add to AppModule imports alongside existing modules                |
|                                                                       |
| RabbitMQModule.forRootAsync({                                         |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| useFactory: (config: ConfigService) =\> ({                            |
|                                                                       |
| exchanges: \[                                                         |
|                                                                       |
| { name: \'marketeq.billing\', type: \'topic\' },                      |
|                                                                       |
| { name: \'marketeq.timetracking\', type: \'topic\' },                 |
|                                                                       |
| { name: \'marketeq.payout\', type: \'topic\' },                       |
|                                                                       |
| { name: \'marketeq.transactions\', type: \'topic\' },                 |
|                                                                       |
| \],                                                                   |
|                                                                       |
| uri: config.get\<string\>(\'RABBITMQ_URL\'),                          |
|                                                                       |
| connectionInitOptions: { wait: true },                                |
|                                                                       |
| // Failed messages go to DLQ \-- never lost, never infinite-retried   |
|                                                                       |
| defaultRpcErrorHandler: (channel, msg, \_err) =\> {                   |
|                                                                       |
| channel.nack(msg, false, false);                                      |
|                                                                       |
| },                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| }),                                                                   |
+=======================================================================+

# **3. Events Consumed \-- billing-service (7 events)**

billing-service publishes 7 events that transaction-service consumes.
Each results in one or more new immutable ledger records. All billing
event handlers live in BillingConsumer.

**/apps/transaction-service/src/consumers/billing.consumer.ts**

## **3.1 billing.payment.completed**

+-----------------------------------------------------------------------+
| **CONSUMES billing.payment.completed** via marketeq.billing           |
|                                                                       |
| *Client payment processed by Stripe. Creates a debit transaction      |
| record.*                                                              |
+=======================================================================+

### **Payload**

+-----------------------------------------------------------------------+
| **billing.payment.completed \-- payload**                             |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string, // Idempotency key \-- stored as transaction_id      |
|                                                                       |
| userId: string, // Client UUID                                        |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| contractType: string, // TransactionType enum value                   |
|                                                                       |
| transactionType: string,                                              |
|                                                                       |
| descriptionProjectName: string \| null,                               |
|                                                                       |
| descriptionContractorHandle: string \| null,                          |
|                                                                       |
| descriptionBillingPeriod: string \| null,                             |
|                                                                       |
| descriptionHours: number \| null,                                     |
|                                                                       |
| invoiceNumber: string \| null,                                        |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| billingFrequency: string \| null,                                     |
|                                                                       |
| membershipTier: string \| null,                                       |
|                                                                       |
| paymentMethodType: string,                                            |
|                                                                       |
| paymentMethodLabel: string,                                           |
|                                                                       |
| paymentMethodIdentifier: string,                                      |
|                                                                       |
| paidAt: string, // ISO 8601                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Handler**

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onPaymentCompleted**                            |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.billing\',                                       |
|                                                                       |
| routingKey: \'billing.payment.completed\',                            |
|                                                                       |
| queue: \'txn-svc.billing.events\',                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onPaymentCompleted(payload: BillingPaymentCompletedEvent):      |
| Promise\<void\> {                                                     |
|                                                                       |
| // Idempotency guard \-- skip if this event was already processed     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| const txn = this.repo.create({                                        |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.paidAt),                                       |
|                                                                       |
| descriptionType: payload.transactionType as TransactionType,          |
|                                                                       |
| descriptionProjectName: payload.descriptionProjectName,               |
|                                                                       |
| descriptionContractorHandle: payload.descriptionContractorHandle,     |
|                                                                       |
| descriptionBillingPeriod: payload.descriptionBillingPeriod,           |
|                                                                       |
| descriptionHours: payload.descriptionHours,                           |
|                                                                       |
| invoiceNumber: payload.invoiceNumber,                                 |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.PAID,                                       |
|                                                                       |
| paymentMethodType: payload.paymentMethodType as PaymentMethodType,    |
|                                                                       |
| paymentMethodLabel: payload.paymentMethodLabel,                       |
|                                                                       |
| paymentMethodIdentifier: payload.paymentMethodIdentifier,             |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| billingFrequency: payload.billingFrequency as BillingFrequency ??     |
| null,                                                                 |
|                                                                       |
| membershipTier: payload.membershipTier as MembershipTier ?? null,     |
|                                                                       |
| paidAt: new Date(payload.paidAt),                                     |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.amount,                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(txn);                                            |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':transactions\');                                                   |
|                                                                       |
| await this.publisher.publishTransactionCreated(txn);                  |
|                                                                       |
| await this.ablyService.publishStatusUpdate(payload.userId, txn.id,    |
| TransactionStatus.PAID);                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 billing.payment.failed**

+-----------------------------------------------------------------------+
| **CONSUMES billing.payment.failed** via marketeq.billing              |
|                                                                       |
| *Stripe payment attempt failed. Creates a failed status transaction   |
| record.*                                                              |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.payment.failed \-- payload**                                |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| contractType: string,                                                 |
|                                                                       |
| transactionType: string,                                              |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| paymentMethodType: string,                                            |
|                                                                       |
| paymentMethodLabel: string,                                           |
|                                                                       |
| paymentMethodIdentifier: string,                                      |
|                                                                       |
| failureReason: string, // Stripe decline code                         |
|                                                                       |
| failedAt: string,                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onPaymentFailed**                               |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.billing\', routingKey:                           |
| \'billing.payment.failed\',                                           |
|                                                                       |
| queue: \'txn-svc.billing.events\',                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onPaymentFailed(payload: BillingPaymentFailedEvent):            |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| const txn = this.repo.create({                                        |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.failedAt),                                     |
|                                                                       |
| descriptionType: payload.transactionType as TransactionType,          |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.FAILED,                                     |
|                                                                       |
| paymentMethodType: payload.paymentMethodType as PaymentMethodType,    |
|                                                                       |
| paymentMethodLabel: payload.paymentMethodLabel,                       |
|                                                                       |
| paymentMethodIdentifier: payload.paymentMethodIdentifier,             |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.amount,                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(txn);                                            |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':transactions\');                                                   |
|                                                                       |
| await this.ablyService.publishStatusUpdate(payload.userId, txn.id,    |
| TransactionStatus.FAILED);                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 billing.refund.issued**

+-----------------------------------------------------------------------+
| **CONSUMES billing.refund.issued** via marketeq.billing               |
|                                                                       |
| *Refund processed by Stripe. Creates a credit record linked to the    |
| original via parent_transaction_id. Original record is never          |
| modified.*                                                            |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.refund.issued \-- payload**                                 |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| originalTransactionId: string, // UUID of original \-- becomes        |
| parent_transaction_id                                                 |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| contractType: string,                                                 |
|                                                                       |
| refundAmount: number, // May be partial                               |
|                                                                       |
| isPartial: boolean,                                                   |
|                                                                       |
| paymentMethodType: string,                                            |
|                                                                       |
| paymentMethodLabel: string,                                           |
|                                                                       |
| paymentMethodIdentifier: string,                                      |
|                                                                       |
| refundedAt: string,                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onRefundIssued**                                |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.billing\', routingKey:                           |
| \'billing.refund.issued\',                                            |
|                                                                       |
| queue: \'txn-svc.billing.events\',                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onRefundIssued(payload: BillingRefundIssuedEvent):              |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| // Partial refund gets PARTIALLY_REFUNDED; full refund gets REFUNDED  |
|                                                                       |
| const status = payload.isPartial                                      |
|                                                                       |
| ? TransactionStatus.PARTIALLY_REFUNDED                                |
|                                                                       |
| : TransactionStatus.REFUNDED;                                         |
|                                                                       |
| const refund = this.repo.create({                                     |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.refundedAt),                                   |
|                                                                       |
| descriptionType: TransactionType.REFUND_ISSUED,                       |
|                                                                       |
| amount: payload.refundAmount, // Refunded portion only                |
|                                                                       |
| amountDirection: AmountDirection.CREDIT,                              |
|                                                                       |
| status,                                                               |
|                                                                       |
| paymentMethodType: payload.paymentMethodType as PaymentMethodType,    |
|                                                                       |
| paymentMethodLabel: payload.paymentMethodLabel,                       |
|                                                                       |
| paymentMethodIdentifier: payload.paymentMethodIdentifier,             |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| parentTransactionId: payload.originalTransactionId, // FK link to     |
| original                                                              |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.refundAmount,                                  |
|                                                                       |
| paidAt: new Date(payload.refundedAt),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(refund);                                         |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':transactions\');                                                   |
|                                                                       |
| await this.ablyService.publishStatusUpdate(payload.userId, refund.id, |
| status);                                                              |
|                                                                       |
| // Note: original transaction record is NEVER modified \--            |
| immutability preserved                                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.4 billing.invoice.generated**

+-----------------------------------------------------------------------+
| **CONSUMES billing.invoice.generated** via marketeq.billing           |
|                                                                       |
| *New invoice created by billing-service. Writes a new record to the   |
| invoices table.*                                                      |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.invoice.generated \-- payload**                             |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| invoiceId: string, // INV-YYYY-NNN format                             |
|                                                                       |
| stripeInvoiceId: string \| null,                                      |
|                                                                       |
| descriptionType: string,                                              |
|                                                                       |
| descriptionBillingPeriod: string \| null,                             |
|                                                                       |
| dateIssued: string,                                                   |
|                                                                       |
| dueDate: string,                                                      |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| status: string, // Usually \'payment_pending\' initially              |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onInvoiceGenerated**                            |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.billing\', routingKey:                           |
| \'billing.invoice.generated\',                                        |
|                                                                       |
| queue: \'txn-svc.billing.events\',                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onInvoiceGenerated(payload: BillingInvoiceGeneratedEvent):      |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.invoiceRepo.findOne({ where: { invoiceId:   |
| payload.invoiceId } });                                               |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| const invoice = this.invoiceRepo.create({                             |
|                                                                       |
| invoiceId: payload.invoiceId,                                         |
|                                                                       |
| stripeInvoiceId: payload.stripeInvoiceId,                             |
|                                                                       |
| dateIssued: new Date(payload.dateIssued),                             |
|                                                                       |
| descriptionType: payload.descriptionType,                             |
|                                                                       |
| descriptionBillingPeriod: payload.descriptionBillingPeriod,           |
|                                                                       |
| dueDate: new Date(payload.dueDate),                                   |
|                                                                       |
| status: payload.status as InvoiceStatus,                              |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.invoiceRepo.save(invoice);                                 |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':invoices\');                                                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.5 billing.invoice.status.updated**

+-----------------------------------------------------------------------+
| **CONSUMES billing.invoice.status.updated** via marketeq.billing      |
|                                                                       |
| *Invoice status changed by billing-service \-- e.g. payment_pending   |
| to paid. Updates the invoice record status.*                          |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.invoice.status.updated \-- payload**                        |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| invoiceId: string, // INV-YYYY-NNN                                    |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| newStatus: string, // InvoiceStatus enum value                        |
|                                                                       |
| updatedAt: string,                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onInvoiceStatusUpdated**                        |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.billing\', routingKey:                           |
| \'billing.invoice.status.updated\',                                   |
|                                                                       |
| queue: \'txn-svc.billing.events\',                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onInvoiceStatusUpdated(payload:                                 |
| BillingInvoiceStatusUpdatedEvent): Promise\<void\> {                  |
|                                                                       |
| await this.invoiceRepo.update(                                        |
|                                                                       |
| { invoiceId: payload.invoiceId, userId: payload.userId },             |
|                                                                       |
| { status: payload.newStatus as InvoiceStatus, updatedAt: new Date() } |
|                                                                       |
| );                                                                    |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':invoices\');                                                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.6 billing.subscription.charged**

+-----------------------------------------------------------------------+
| **CONSUMES billing.subscription.charged** via marketeq.billing        |
|                                                                       |
| *Recurring premium membership billed. Creates a membership            |
| transaction record.*                                                  |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.subscription.charged \-- payload**                          |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| membershipTier: string, // \'basic\' \| \'pro\' \| \'enterprise\' \|  |
| \'agency\'                                                            |
|                                                                       |
| billingFrequency: string,                                             |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| paymentMethodType: string,                                            |
|                                                                       |
| paymentMethodLabel: string,                                           |
|                                                                       |
| paymentMethodIdentifier: string,                                      |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| billingPeriod: string,                                                |
|                                                                       |
| chargedAt: string,                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onSubscriptionCharged**                         |
+-----------------------------------------------------------------------+
| async onSubscriptionCharged(payload:                                  |
| BillingSubscriptionChargedEvent): Promise\<void\> {                   |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| // Map tier to the correct TransactionType enum value                 |
|                                                                       |
| const typeMap: Record\<string, TransactionType\> = {                  |
|                                                                       |
| basic: TransactionType.BASIC_MEMBERSHIP,                              |
|                                                                       |
| pro: TransactionType.PRO_MEMBERSHIP,                                  |
|                                                                       |
| enterprise: TransactionType.ENTERPRISE_MEMBERSHIP,                    |
|                                                                       |
| agency: TransactionType.ENTERPRISE_MEMBERSHIP,                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| const txn = this.repo.create({                                        |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.chargedAt),                                    |
|                                                                       |
| descriptionType: typeMap\[payload.membershipTier\],                   |
|                                                                       |
| descriptionBillingPeriod: payload.billingPeriod,                      |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.PAID,                                       |
|                                                                       |
| paymentMethodType: payload.paymentMethodType as PaymentMethodType,    |
|                                                                       |
| paymentMethodLabel: payload.paymentMethodLabel,                       |
|                                                                       |
| paymentMethodIdentifier: payload.paymentMethodIdentifier,             |
|                                                                       |
| contractType: ContractType.SERVICE,                                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| billingFrequency: payload.billingFrequency as BillingFrequency,       |
|                                                                       |
| membershipTier: payload.membershipTier as MembershipTier,             |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.amount,                                        |
|                                                                       |
| paidAt: new Date(payload.chargedAt),                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(txn);                                            |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':transactions\');                                                   |
|                                                                       |
| await this.publisher.publishTransactionCreated(txn);                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.7 billing.wire.transfer.confirmed**

+-----------------------------------------------------------------------+
| **CONSUMES billing.wire.transfer.confirmed** via marketeq.billing     |
|                                                                       |
| *Wire transfer manually confirmed by AR team via Airtable             |
| integration. Creates the payment record and, if present, a separate   |
| wire fee record.*                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **billing.wire.transfer.confirmed \-- payload**                       |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| contractType: string,                                                 |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| wireFeeAmount: number, // May be 0 \-- creates separate fee record if |
| \> 0                                                                  |
|                                                                       |
| invoiceNumber: string,                                                |
|                                                                       |
| confirmedAt: string,                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **BillingConsumer \-- onWireTransferConfirmed**                       |
+-----------------------------------------------------------------------+
| async onWireTransferConfirmed(payload: BillingWireConfirmedEvent):    |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| // Primary wire payment record                                        |
|                                                                       |
| const wire = this.repo.create({                                       |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.confirmedAt),                                  |
|                                                                       |
| descriptionType: TransactionType.PROJECT_PAYMENT,                     |
|                                                                       |
| invoiceNumber: payload.invoiceNumber,                                 |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.PAID,                                       |
|                                                                       |
| paymentMethodType: PaymentMethodType.BANK_ACH,                        |
|                                                                       |
| paymentMethodLabel: \'Wire Transfer\',                                |
|                                                                       |
| paymentMethodIdentifier: \'WIRE\',                                    |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.amount,                                        |
|                                                                       |
| paidAt: new Date(payload.confirmedAt),                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(wire);                                           |
|                                                                       |
| // Separate wire fee record \-- only if fee \> 0                      |
|                                                                       |
| if (payload.wireFeeAmount \> 0) {                                     |
|                                                                       |
| const fee = this.repo.create({                                        |
|                                                                       |
| transactionId: payload.eventId + \'-fee\',                            |
|                                                                       |
| date: new Date(payload.confirmedAt),                                  |
|                                                                       |
| descriptionType: TransactionType.WIRE_TRANSFER_FEE,                   |
|                                                                       |
| amount: payload.wireFeeAmount,                                        |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.PAID,                                       |
|                                                                       |
| paymentMethodType: PaymentMethodType.BANK_ACH,                        |
|                                                                       |
| paymentMethodLabel: \'Wire Transfer\',                                |
|                                                                       |
| paymentMethodIdentifier: \'WIRE\',                                    |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| parentTransactionId: wire.id, // Links fee to the payment             |
|                                                                       |
| userId: payload.userId,                                               |
|                                                                       |
| usdEquivalent: payload.wireFeeAmount,                                 |
|                                                                       |
| paidAt: new Date(payload.confirmedAt),                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(fee);                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.userId +       |
| \':transactions\');                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Events Consumed \-- time-tracking-service (1 event)**

**/apps/transaction-service/src/consumers/timetracking.consumer.ts**

## **4.1 timetracking.hours.logged**

+-----------------------------------------------------------------------+
| **CONSUMES timetracking.hours.logged** via marketeq.timetracking      |
|                                                                       |
| *Contractor logged hours against a pre-funded contract. Creates an    |
| earnings credit record scoped to the contractor. This is the ledger   |
| entry that the future Earnings & Payouts screen will display.*        |
+=======================================================================+

+-----------------------------------------------------------------------+
| **timetracking.hours.logged \-- payload**                             |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| contractorId: string, // Talent user UUID \-- record is scoped to     |
| this user                                                             |
|                                                                       |
| clientId: string, // Client UUID \-- for reference only               |
|                                                                       |
| contractId: string,                                                   |
|                                                                       |
| contractType: string,                                                 |
|                                                                       |
| contractorHandle: string,                                             |
|                                                                       |
| hoursLogged: number,                                                  |
|                                                                       |
| hourlyRate: number,                                                   |
|                                                                       |
| earnedAmount: number, // hoursLogged \* hourlyRate                    |
|                                                                       |
| invoiceNumber: string,                                                |
|                                                                       |
| billingPeriod: string,                                                |
|                                                                       |
| loggedAt: string,                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **TimeTrackingConsumer \-- onHoursLogged**                            |
+-----------------------------------------------------------------------+
| \@RabbitSubscribe({                                                   |
|                                                                       |
| exchange: \'marketeq.timetracking\',                                  |
|                                                                       |
| routingKey: \'timetracking.hours.logged\',                            |
|                                                                       |
| queue: \'txn-svc.timetracking.events\',                               |
|                                                                       |
| })                                                                    |
|                                                                       |
| async onHoursLogged(payload: TimeTrackingHoursLoggedEvent):           |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| // This record is scoped to contractorId \-- not clientId             |
|                                                                       |
| // The client-facing debit record was already created by              |
| billing.payment.completed                                             |
|                                                                       |
| // This credit record is what the contractor sees on the Earnings &   |
| Payouts screen                                                        |
|                                                                       |
| const earning = this.repo.create({                                    |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.loggedAt),                                     |
|                                                                       |
| descriptionType: TransactionType.HOURLY_PAYMENT,                      |
|                                                                       |
| descriptionContractorHandle: payload.contractorHandle,                |
|                                                                       |
| descriptionBillingPeriod: payload.billingPeriod,                      |
|                                                                       |
| descriptionHours: payload.hoursLogged,                                |
|                                                                       |
| invoiceNumber: payload.invoiceNumber,                                 |
|                                                                       |
| amount: payload.earnedAmount,                                         |
|                                                                       |
| amountDirection: AmountDirection.CREDIT, // Credit for contractor     |
|                                                                       |
| status: TransactionStatus.CREDITED,                                   |
|                                                                       |
| paymentMethodType: PaymentMethodType.BANK_ACH,                        |
|                                                                       |
| paymentMethodLabel: \'Platform Earnings\',                            |
|                                                                       |
| paymentMethodIdentifier: \'N/A\',                                     |
|                                                                       |
| contractType: payload.contractType as ContractType,                   |
|                                                                       |
| contractId: payload.contractId,                                       |
|                                                                       |
| userId: payload.contractorId, // Contractor owns this record          |
|                                                                       |
| usdEquivalent: payload.earnedAmount,                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(earning);                                        |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.contractorId + |
| \':transactions\');                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Dual-Ledger Design**                                                |
|                                                                       |
| When a client pays for hours, two records are created: (1)            |
| billing.payment.completed creates a DEBIT on the client\'s ledger.    |
| (2) timetracking.hours.logged creates a CREDIT on the contractor\'s   |
| ledger. Same contract, same invoice, two different userId-scoped      |
| records. This is the foundation for the future Earnings & Payouts     |
| sprint.                                                               |
+=======================================================================+

# **5. Events Consumed \-- payout-service (3 events)**

**/apps/transaction-service/src/consumers/payout.consumer.ts**

## **5.1 payout.initiated**

+-----------------------------------------------------------------------+
| **CONSUMES payout.initiated** via marketeq.payout                     |
|                                                                       |
| *Contractor requested a payout to their bank account. Creates a       |
| processing status record.*                                            |
+=======================================================================+

+-----------------------------------------------------------------------+
| **payout.initiated \-- payload**                                      |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| contractId: string \| null,                                           |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| payoutMethodType: string,                                             |
|                                                                       |
| payoutMethodLabel: string,                                            |
|                                                                       |
| payoutMethodIdentifier: string,                                       |
|                                                                       |
| initiatedAt: string,                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.2 payout.completed**

+-----------------------------------------------------------------------+
| **CONSUMES payout.completed** via marketeq.payout                     |
|                                                                       |
| *ACH transfer settled. Updates the payout record status from          |
| processing to succeeded.*                                             |
+=======================================================================+

+-----------------------------------------------------------------------+
| **payout.completed \-- payload**                                      |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| originalEventId: string, // eventId from payout.initiated             |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| completedAt: string,                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.3 payout.failed**

+-----------------------------------------------------------------------+
| **CONSUMES payout.failed** via marketeq.payout                        |
|                                                                       |
| *ACH transfer rejected. Updates the payout record status from         |
| processing to failed.*                                                |
+=======================================================================+

+-----------------------------------------------------------------------+
| **payout.failed \-- payload**                                         |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| originalEventId: string,                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| failureReason: string,                                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **src/consumers/payout.consumer.ts**                                  |
+-----------------------------------------------------------------------+
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { RabbitSubscribe } from \'@golevelup/nestjs-rabbitmq\';       |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import {                                                              |
|                                                                       |
| TransactionType, TransactionStatus,                                   |
|                                                                       |
| AmountDirection, PaymentMethodType, ContractType                      |
|                                                                       |
| } from \'../entities/enums\';                                         |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class PayoutConsumer {                                         |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Transaction) private readonly repo:                |
| Repository\<Transaction\>,                                            |
|                                                                       |
| private readonly cacheService: CacheService,                          |
|                                                                       |
| private readonly ablyService: AblyService,                            |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@RabbitSubscribe({ exchange:\'marketeq.payout\',                     |
| routingKey:\'payout.initiated\',                                      |
|                                                                       |
| queue:\'txn-svc.payout.events\' })                                    |
|                                                                       |
| async onPayoutInitiated(payload: PayoutInitiatedEvent):               |
| Promise\<void\> {                                                     |
|                                                                       |
| const exists = await this.repo.findOne({ where: { transactionId:      |
| payload.eventId } });                                                 |
|                                                                       |
| if (exists) return;                                                   |
|                                                                       |
| const payout = this.repo.create({                                     |
|                                                                       |
| transactionId: payload.eventId,                                       |
|                                                                       |
| date: new Date(payload.initiatedAt),                                  |
|                                                                       |
| descriptionType: TransactionType.PROJECT_PAYMENT,                     |
|                                                                       |
| amount: payload.amount,                                               |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status: TransactionStatus.PROCESSING,                                 |
|                                                                       |
| paymentMethodType: payload.payoutMethodType as PaymentMethodType,     |
|                                                                       |
| paymentMethodLabel: payload.payoutMethodLabel,                        |
|                                                                       |
| paymentMethodIdentifier: payload.payoutMethodIdentifier,              |
|                                                                       |
| contractType: ContractType.INDIVIDUAL,                                |
|                                                                       |
| contractId: payload.contractId ?? \'system\',                         |
|                                                                       |
| userId: payload.contractorId,                                         |
|                                                                       |
| usdEquivalent: payload.amount,                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.repo.save(payout);                                         |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.contractorId + |
| \':transactions\');                                                   |
|                                                                       |
| await this.ablyService.publishStatusUpdate(payload.contractorId,      |
| payout.id, TransactionStatus.PROCESSING);                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@RabbitSubscribe({ exchange:\'marketeq.payout\',                     |
| routingKey:\'payout.completed\',                                      |
|                                                                       |
| queue:\'txn-svc.payout.events\' })                                    |
|                                                                       |
| async onPayoutCompleted(payload: PayoutCompletedEvent):               |
| Promise\<void\> {                                                     |
|                                                                       |
| await this.repo.update(                                               |
|                                                                       |
| { transactionId: payload.originalEventId },                           |
|                                                                       |
| { status: TransactionStatus.SUCCEEDED, paidAt: new                    |
| Date(payload.completedAt) }                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| const txn = await this.repo.findOne({ where: { transactionId:         |
| payload.originalEventId } });                                         |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.contractorId + |
| \':transactions\');                                                   |
|                                                                       |
| if (txn) await                                                        |
| this.ablyService.publishStatusUpdate(payload.contractorId, txn.id,    |
| TransactionStatus.SUCCEEDED);                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@RabbitSubscribe({ exchange:\'marketeq.payout\',                     |
| routingKey:\'payout.failed\',                                         |
|                                                                       |
| queue:\'txn-svc.payout.events\' })                                    |
|                                                                       |
| async onPayoutFailed(payload: PayoutFailedEvent): Promise\<void\> {   |
|                                                                       |
| await this.repo.update(                                               |
|                                                                       |
| { transactionId: payload.originalEventId },                           |
|                                                                       |
| { status: TransactionStatus.FAILED }                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| const txn = await this.repo.findOne({ where: { transactionId:         |
| payload.originalEventId } });                                         |
|                                                                       |
| await this.cacheService.invalidate(\'user:\' + payload.contractorId + |
| \':transactions\');                                                   |
|                                                                       |
| if (txn) await                                                        |
| this.ablyService.publishStatusUpdate(payload.contractorId, txn.id,    |
| TransactionStatus.FAILED);                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Events Published by transaction-service (2 events)**

transaction-service publishes two events to the marketeq.transactions
exchange. These are consumed by billing-service for reconciliation
confirmation and by notification-service to trigger user alerts.

## **6.1 transaction.created**

+-----------------------------------------------------------------------+
| **PUBLISHES transaction.created** via marketeq.transactions           |
|                                                                       |
| *Published when a new transaction record is written. Consumed by      |
| billing-service and analytics-service.*                               |
+=======================================================================+

+-----------------------------------------------------------------------+
| **transaction.created \-- outbound payload**                          |
+-----------------------------------------------------------------------+
| // Outbound payload                                                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| transactionId: string, // Internal UUID                               |
|                                                                       |
| externalEventId: string, // The eventId from the upstream event \--   |
| for reconciliation                                                    |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| amount: number,                                                       |
|                                                                       |
| status: string,                                                       |
|                                                                       |
| descriptionType: string,                                              |
|                                                                       |
| createdAt: string,                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.2 transaction.status.updated**

+-----------------------------------------------------------------------+
| **PUBLISHES transaction.status.updated** via marketeq.transactions    |
|                                                                       |
| *Published when an existing transaction status changes. Consumed by   |
| notification-service.*                                                |
+=======================================================================+

+-----------------------------------------------------------------------+
| **transaction.status.updated \-- outbound payload**                   |
+-----------------------------------------------------------------------+
| // Outbound payload                                                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| transactionId: string,                                                |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| previousStatus: string,                                               |
|                                                                       |
| newStatus: string,                                                    |
|                                                                       |
| updatedAt: string,                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.3 EventPublisherService**

**/apps/transaction-service/src/services/event-publisher.service.ts**

+-----------------------------------------------------------------------+
| **src/services/event-publisher.service.ts**                           |
+-----------------------------------------------------------------------+
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { AmqpConnection } from \'@golevelup/nestjs-rabbitmq\';        |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { TransactionStatus } from \'../entities/enums\';              |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class EventPublisherService {                                  |
|                                                                       |
| constructor(private readonly amqp: AmqpConnection) {}                 |
|                                                                       |
| async publishTransactionCreated(txn: Transaction): Promise\<void\> {  |
|                                                                       |
| await this.amqp.publish(\'marketeq.transactions\',                    |
| \'transaction.created\', {                                            |
|                                                                       |
| transactionId: txn.id,                                                |
|                                                                       |
| externalEventId: txn.transactionId,                                   |
|                                                                       |
| userId: txn.userId,                                                   |
|                                                                       |
| amount: txn.amount,                                                   |
|                                                                       |
| status: txn.status,                                                   |
|                                                                       |
| descriptionType: txn.descriptionType,                                 |
|                                                                       |
| createdAt: txn.createdAt.toISOString(),                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| async publishStatusUpdated(                                           |
|                                                                       |
| txn: Transaction,                                                     |
|                                                                       |
| previousStatus: TransactionStatus                                     |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| await this.amqp.publish(\'marketeq.transactions\',                    |
| \'transaction.status.updated\', {                                     |
|                                                                       |
| transactionId: txn.id,                                                |
|                                                                       |
| userId: txn.userId,                                                   |
|                                                                       |
| previousStatus,                                                       |
|                                                                       |
| newStatus: txn.status,                                                |
|                                                                       |
| updatedAt: new Date().toISOString(),                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Ably \-- Real-Time Status Updates**

When a transaction status changes, transaction-service immediately
publishes to the user\'s Ably channel. The frontend subscribes on page
load and updates the list and detail modal without a page refresh or
polling.

## **7.1 Channel Naming**

  ---------------------------------------------------------------------------
  **Channel**             **Example**            **Used For**
  ----------------------- ---------------------- ----------------------------
  transactions:{userId}   transactions:abc-123   All transaction status
                                                 updates for a specific user

  invoices:{userId}       invoices:abc-123       All invoice status updates
                                                 for a specific user
  ---------------------------------------------------------------------------

## **7.2 Ably Event Payload**

+-----------------------------------------------------------------------+
| **Ably publish payload**                                              |
+-----------------------------------------------------------------------+
| // Published to Ably channel on every status change                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| event: \'transaction.status.changed\',                                |
|                                                                       |
| transactionId: string,                                                |
|                                                                       |
| newStatus: string, // TransactionStatus enum value                    |
|                                                                       |
| timestamp: string,                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.3 AblyService**

**/apps/transaction-service/src/services/ably.service.ts**

+-----------------------------------------------------------------------+
| **src/services/ably.service.ts**                                      |
+-----------------------------------------------------------------------+
| import { Injectable, Logger, OnModuleInit } from \'@nestjs/common\';  |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as Ably from \'ably\';                                      |
|                                                                       |
| import { TransactionStatus } from \'../entities/enums\';              |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class AblyService implements OnModuleInit {                    |
|                                                                       |
| private readonly logger = new Logger(\'AblyService\');                |
|                                                                       |
| private client: Ably.Rest;                                            |
|                                                                       |
| constructor(private readonly config: ConfigService) {}                |
|                                                                       |
| onModuleInit(): void {                                                |
|                                                                       |
| this.client = new Ably.Rest({ key:                                    |
| this.config.get\<string\>(\'ABLY_API_KEY\') });                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| async publishStatusUpdate(                                            |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| transactionId: string,                                                |
|                                                                       |
| newStatus: TransactionStatus                                          |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const channel = this.client.channels.get(\'transactions:\' + userId); |
|                                                                       |
| await channel.publish(\'transaction.status.changed\', {               |
|                                                                       |
| transactionId,                                                        |
|                                                                       |
| newStatus,                                                            |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Ably failures are non-fatal \-- log and continue                   |
|                                                                       |
| // Frontend will get the update on next query or page reload          |
|                                                                       |
| this.logger.error(\'Ably publish failed for user \' + userId, err);   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| async publishInvoiceStatusUpdate(                                     |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| invoiceId: string,                                                    |
|                                                                       |
| newStatus: string                                                     |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const channel = this.client.channels.get(\'invoices:\' + userId);     |
|                                                                       |
| await channel.publish(\'invoice.status.changed\', {                   |
|                                                                       |
| invoiceId, newStatus, timestamp: new Date().toISOString()             |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\'Ably invoice publish failed for user \' + userId, |
| err);                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Ably Failures Are Non-Fatal**                                       |
|                                                                       |
| The publish call is wrapped in try-catch. A failure must never        |
| disrupt consumer processing \-- the transaction record is already     |
| safely written to the database. The Ably push is best-effort. The     |
| frontend will receive the correct state on its next API call or page  |
| refresh.                                                              |
+=======================================================================+

# **8. Redis Caching Strategy**

The transaction list endpoint is the highest-traffic endpoint in the
service. Every page load and every filter change triggers a query. Redis
caches query results to reduce database load on repeated identical
requests.

## **8.1 Cache Key Structure**

  --------------------------------------------------------------------------------------
  **Key Pattern**                           **TTL**   **Invalidated When**
  ----------------------------------------- --------- ----------------------------------
  user:{userId}:transactions:{filterHash}   300s (5   Any new transaction is written for
                                            min)      this user \-- all matching keys
                                                      purged via SCAN

  user:{userId}:invoices:{filterHash}       300s (5   Any invoice created or status
                                            min)      updated for this user

  user:{userId}:contracts                   3600s (1  Contract data is stable \-- long
                                            hr)       TTL acceptable
  --------------------------------------------------------------------------------------

The {filterHash} is a 16-character SHA-256 hash of the full query
parameter object. Each unique filter combination has its own cache
entry. Changing any filter produces a cache miss.

## **8.2 CacheService**

**/apps/transaction-service/src/services/cache.service.ts**

+-----------------------------------------------------------------------+
| **src/services/cache.service.ts**                                     |
+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { Redis } from \'ioredis\';                                    |
|                                                                       |
| import { createHash } from \'crypto\';                                |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class CacheService {                                           |
|                                                                       |
| private readonly logger = new Logger(\'CacheService\');               |
|                                                                       |
| private readonly client: Redis;                                       |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| this.client = new Redis(config.get\<string\>(\'REDIS_URL\'));         |
|                                                                       |
| }                                                                     |
|                                                                       |
| buildKey(userId: string, scope: \'transactions\' \| \'invoices\',     |
| params: object): string {                                             |
|                                                                       |
| const hash = createHash(\'sha256\')                                   |
|                                                                       |
| .update(JSON.stringify(params))                                       |
|                                                                       |
| .digest(\'hex\')                                                      |
|                                                                       |
| .slice(0, 16);                                                        |
|                                                                       |
| return \'user:\' + userId + \':\' + scope + \':\' + hash;             |
|                                                                       |
| }                                                                     |
|                                                                       |
| async get\<T\>(key: string): Promise\<T \| null\> {                   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const val = await this.client.get(key);                               |
|                                                                       |
| return val ? JSON.parse(val) : null;                                  |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\'Cache read failed: \' + key, err);                 |
|                                                                       |
| return null; // Cache miss on error \-- fall through to DB            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| async set(key: string, value: unknown, ttl = 300): Promise\<void\> {  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.client.setex(key, ttl, JSON.stringify(value));             |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\'Cache write failed: \' + key, err);                |
|                                                                       |
| // Non-fatal \-- data was returned from DB successfully               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Invalidate all entries for a user\'s scope without blocking        |
|                                                                       |
| async invalidate(prefix: string): Promise\<void\> {                   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const keys: string\[\] = \[\];                                        |
|                                                                       |
| let cursor = \'0\';                                                   |
|                                                                       |
| do {                                                                  |
|                                                                       |
| const \[next, batch\] = await this.client.scan(cursor, \'MATCH\',     |
| prefix + \'\*\', \'COUNT\', 100);                                     |
|                                                                       |
| cursor = next;                                                        |
|                                                                       |
| keys.push(\...batch);                                                 |
|                                                                       |
| } while (cursor !== \'0\');                                           |
|                                                                       |
| if (keys.length \> 0) await this.client.del(\...keys);                |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\'Cache invalidation failed for \' + prefix, err);   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.3 Cache Wrapper in TransactionService**

+-----------------------------------------------------------------------+
| **TransactionService \-- cache wrapper pattern**                      |
+-----------------------------------------------------------------------+
| // In TransactionService.findAll \-- wrap the DB query with a cache   |
| check                                                                 |
|                                                                       |
| async findAll(userId: string, filters: TransactionFilterDto) {        |
|                                                                       |
| const key = this.cacheService.buildKey(userId, \'transactions\',      |
| filters);                                                             |
|                                                                       |
| const cached = await this.cacheService.get(key);                      |
|                                                                       |
| if (cached) return cached; // Cache hit \-- return immediately        |
|                                                                       |
| // \... existing query builder and filter logic from Doc 04 \...      |
|                                                                       |
| const result = PaginatedResponseDto.of(dtos, total, page, limit);     |
|                                                                       |
| await this.cacheService.set(key, result, 300); // Cache for 5 minutes |
|                                                                       |
| return result;                                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. QuickBooks Reconciliation**

QuickBooks is used by the accounts receivable team to reconcile invoice
payments and wire transfers. transaction-service never calls QuickBooks
directly. All QuickBooks communication is owned by billing-service,
which translates QuickBooks webhook events into normalised RabbitMQ
messages that transaction-service consumes.

## **9.1 Reconciliation Flow**

- AR team marks a payment or invoice as confirmed in QuickBooks

- QuickBooks sends a webhook to billing-service

- billing-service validates the payment and publishes either
  billing.wire.transfer.confirmed or billing.invoice.status.updated to
  RabbitMQ

- transaction-service consumer handles the event and updates the ledger

- transaction-service publishes transaction.created or
  transaction.status.updated to notify downstream services

+-----------------------------------------------------------------------+
| **QuickBooks Scope Boundary**                                         |
|                                                                       |
| transaction-service has zero direct integration with QuickBooks. All  |
| QuickBooks communication is owned exclusively by billing-service.     |
| This decouples the ledger from any specific accounting system \-- if  |
| QuickBooks is ever replaced, transaction-service requires zero        |
| changes.                                                              |
+=======================================================================+

## **9.2 Ledger Correction Pattern**

When reconciliation reveals a discrepancy between a recorded amount and
the actual settled amount, the AR team triggers a ledger correction.
This creates a new ledger_correction type transaction referencing the
original via parent_transaction_id. The original record is never
modified.

+-----------------------------------------------------------------------+
| **billing.ledger.correction \-- payload**                             |
+-----------------------------------------------------------------------+
| // billing.ledger.correction event payload                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| eventId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| originalTransactionId: string, // Becomes parent_transaction_id       |
|                                                                       |
| correctionAmount: number, // Positive = credit adjustment, negative = |
| debit                                                                 |
|                                                                       |
| reason: string,                                                       |
|                                                                       |
| correctedAt: string,                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

  --------------------------------------------------------------------------
  **Scenario**       **Original         **Correction        **Result**
                     Record**           Record**            
  ------------------ ------------------ ------------------- ----------------
  Client overpaid by Immutable DEBIT    CREDIT \$50         Ledger shows
  \$50               \$550              ledger_correction   both; net is
                                        (parent = original) \$500

  Wire fee           Immutable DEBIT    CREDIT \$5          Ledger shows
  miscalculated      \$15 wire fee      ledger_correction   both; net
                                        (parent = fee txn)  corrected

  Duplicate charge   Immutable DEBIT    CREDIT \$500        Full refund
                     \$500              refund_issued       record; original
                                        (parent = original) intact
  --------------------------------------------------------------------------

# **10. Share Context \-- invitations-service Integration**

When a user clicks the Share icon on a transaction or invoice,
transaction-service builds a context payload and hands it off to
invitations-service. transaction-service does not own the share modal
UI, recipient management, or delivery logic \-- it only provides the
item description line that appears in the modal.

**/apps/transaction-service/src/services/share.service.ts**

+-----------------------------------------------------------------------+
| **src/services/share.service.ts**                                     |
+-----------------------------------------------------------------------+
| import { Injectable, NotFoundException } from \'@nestjs/common\';     |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { Invoice } from \'../entities/invoice.entity\';               |
|                                                                       |
| export interface ShareContextPayload {                                |
|                                                                       |
| itemType: \'transaction\' \| \'invoice\';                             |
|                                                                       |
| itemId: string;                                                       |
|                                                                       |
| contextLabel: string; // Line shown in the share modal below the      |
| headline                                                              |
|                                                                       |
| referenceNumber: string;                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ShareService {                                           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Transaction) private readonly txnRepo:             |
| Repository\<Transaction\>,                                            |
|                                                                       |
| \@InjectRepository(Invoice) private readonly invRepo:                 |
| Repository\<Invoice\>,                                                |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async getTransactionContext(id: string, userId: string):              |
| Promise\<ShareContextPayload\> {                                      |
|                                                                       |
| const txn = await this.txnRepo.findOne({ where: { id, userId } });    |
|                                                                       |
| if (!txn) throw new NotFoundException({ code: \'NOT_FOUND\', message: |
| \'Transaction not found.\' });                                        |
|                                                                       |
| const typeLabel = txn.descriptionType.replace(/\_/g, \' \');          |
|                                                                       |
| const detail = txn.descriptionProjectName                             |
|                                                                       |
| ? typeLabel + \' for \' + txn.descriptionProjectName +                |
|                                                                       |
| (txn.descriptionBillingPeriod ? \', \' + txn.descriptionBillingPeriod |
| : \'\')                                                               |
|                                                                       |
| : typeLabel + \' \-- \' + txn.descriptionContractorHandle;            |
|                                                                       |
| // Example: \'Sharing Transaction #1234567890 \-- monthly installment |
| for UX Audit, November 2025\'                                         |
|                                                                       |
| return {                                                              |
|                                                                       |
| itemType: \'transaction\',                                            |
|                                                                       |
| itemId: id,                                                           |
|                                                                       |
| contextLabel: \'Sharing Transaction #\' + txn.transactionId + \' \--  |
| \' + detail,                                                          |
|                                                                       |
| referenceNumber: txn.transactionId,                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| async getInvoiceContext(id: string, userId: string):                  |
| Promise\<ShareContextPayload\> {                                      |
|                                                                       |
| const inv = await this.invRepo.findOne({ where: { id, userId } });    |
|                                                                       |
| if (!inv) throw new NotFoundException({ code: \'NOT_FOUND\', message: |
| \'Invoice not found.\' });                                            |
|                                                                       |
| const detail = inv.descriptionType +                                  |
|                                                                       |
| (inv.descriptionBillingPeriod ? \', \' + inv.descriptionBillingPeriod |
| : \'\');                                                              |
|                                                                       |
| // Example: \'Sharing Invoice INV-2023-001 \-- Monthly installment,   |
| November 2025\'                                                       |
|                                                                       |
| return {                                                              |
|                                                                       |
| itemType: \'invoice\',                                                |
|                                                                       |
| itemId: id,                                                           |
|                                                                       |
| contextLabel: \'Sharing Invoice \' + inv.invoiceId + \' \-- \' +      |
| detail,                                                               |
|                                                                       |
| referenceNumber: inv.invoiceId,                                       |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **11. Event Sequence Diagrams**

## **11.1 Client Payment Flow**

From client paying an invoice through to the transaction appearing on
the Transactions screen with a real-time status update.

+--------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SEQUENCE: Client Payment \-- billing.payment.completed**                                                                                                   |
+--------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Client billing-service Stripe RabbitMQ transaction-service Ably Frontend                                                                                     |
|                                                                                                                                                              |
| \| \| \| \| \| \| \|                                                                                                                                         |
|                                                                                                                                                              |
| \| Pay invoice \| \| \| \| \| \|                                                                                                                             |
|                                                                                                                                                              |
| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \| \| \| \|                                                                                                         |
|                                                                                                                                                              |
| \| \| Charge card \| \| \| \| \|                                                                                                                             |
|                                                                                                                                                              |
| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \| \| \|                                                                                                             |
|                                                                                                                                                              |
| \| \| succeeded \| \| \| \| \|                                                                                                                               |
|                                                                                                                                                              |
| \| \| \<\-\-\-\-\-\-\-\-\-\-- \| \| \| \| \|                                                                                                                 |
|                                                                                                                                                              |
| \| \| Publish event \| \| \| \| \|                                                                                                                           |
|                                                                                                                                                              |
| \| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \|                                                                                 |
|                                                                                                                                                              |
| \| \| billing.payment.completed \| \| \| \|                                                                                                                  |
|                                                                                                                                                              |
| \| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \|                                                                                                             |
|                                                                                                                                                              |
| \| \| \| \| \[consumer\] \| \| \|                                                                                                                            |
|                                                                                                                                                              |
| \| \| \| \| idempotency check \| \|                                                                                                                          |
|                                                                                                                                                              |
| \| \| \| \| write txn row (status=paid) \| \|                                                                                                                |
|                                                                                                                                                              |
| \| \| \| \| invalidate Redis cache \| \|                                                                                                                     |
|                                                                                                                                                              |
| \| \| \| \| publish transaction.created \| \|                                                                                                                |
|                                                                                                                                                              |
| \| \| \| \| \| publish \-\-\-\--\> \| \|                                                                                                                     |
|                                                                                                                                                              |
| \| \| \| \| \| status=paid \| \|                                                                                                                             |
|                                                                                                                                                              |
| \| UI updates without page refresh \| \| \| \| \-\-\-\-\-\-\--\> \|                                                                                          |
|                                                                                                                                                              |
| \|                                                                                                                                                           |
| \<\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\<\-- |
| \| \|                                                                                                                                                        |
+==============================================================================================================================================================+

## **11.2 Refund Flow**

From a refund being processed by Stripe through to a separate credit
record appearing in the ledger, linked to the original via
parent_transaction_id.

+-----------------------------------------------------------------------+
| **SEQUENCE: Refund \-- billing.refund.issued**                        |
+-----------------------------------------------------------------------+
| billing-service Stripe RabbitMQ transaction-service Database          |
|                                                                       |
| \| \| \| \| \|                                                        |
|                                                                       |
| \| Process refund \| \| \| \|                                         |
|                                                                       |
| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \| \|                        |
|                                                                       |
| \| refund confirmed\| \| \| \|                                        |
|                                                                       |
| \| \<\-\-\-\-\-\-\-\-\-\-\-\-\-- \| \| \| \|                          |
|                                                                       |
| \| Publish event \| \| \| \|                                          |
|                                                                       |
| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\>  |
| \| \|                                                                 |
|                                                                       |
| \| billing.refund.issued \| \| \|                                     |
|                                                                       |
| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \|                        |
|                                                                       |
| \| \| \| \[consumer\] \| \|                                           |
|                                                                       |
| \| \| \| \| Idempotency check \|                                      |
|                                                                       |
| \| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \|                    |
|                                                                       |
| \| \| \| \| Not found \-- ok \|                                       |
|                                                                       |
| \| \| \| \| \<\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- \|                    |
|                                                                       |
| \| \| \| \| Insert refund row \|                                      |
|                                                                       |
| \| \| \| \| type=refund_issued \|                                     |
|                                                                       |
| \| \| \| \| direction=CREDIT \|                                       |
|                                                                       |
| \| \| \| \| parent_txn_id=orig \|                                     |
|                                                                       |
| \| \| \| \| amount=refund only \|                                     |
|                                                                       |
| \| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \|                    |
|                                                                       |
| Note: Original transaction is NEVER modified \-- immutability rule    |
| preserved                                                             |
+=======================================================================+

## **11.3 Contractor Earnings Flow**

From a contractor logging hours through to an earning credit appearing
on their ledger. The client debit and the contractor credit are two
separate records in the same table.

+-----------------------------------------------------------------------+
| **SEQUENCE: Earnings \-- timetracking.hours.logged**                  |
+-----------------------------------------------------------------------+
| Contractor time-tracking-service RabbitMQ transaction-service         |
|                                                                       |
| \| \| \| \|                                                           |
|                                                                       |
| \| Log hours \| \| \|                                                 |
|                                                                       |
| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \| \|                           |
|                                                                       |
| \| \| Validate hours \| \|                                            |
|                                                                       |
| \| \| against funded \| \|                                            |
|                                                                       |
| \| \| contract \| \|                                                  |
|                                                                       |
| \| \| Publish event \| \|                                             |
|                                                                       |
| \| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \|                          |
|                                                                       |
| \| \| timetracking.hours.logged \|                                    |
|                                                                       |
| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \|                               |
|                                                                       |
| \| \| \| \[consumer\] \|                                              |
|                                                                       |
| \| \| \| Insert earning row                                           |
|                                                                       |
| \| \| \| userId = contractorId                                        |
|                                                                       |
| \| \| \| direction = CREDIT                                           |
|                                                                       |
| \| \| \| status = credited                                            |
|                                                                       |
| \| \| \| \|                                                           |
|                                                                       |
| Note: Client already has a DEBIT record from                          |
| billing.payment.completed                                             |
|                                                                       |
| Note: Contractor now has a CREDIT record from this event              |
|                                                                       |
| Note: Same invoice, two userId-scoped records \-- the dual-ledger     |
| design                                                                |
+=======================================================================+

## **11.4 Payout Flow**

From a contractor requesting a payout through to the bank transfer
completing and the status updating in real time.

+----------------------------------------------------------------------------------------------------------------------------+
| **SEQUENCE: Payout \-- payout.initiated then payout.completed**                                                            |
+----------------------------------------------------------------------------------------------------------------------------+
| Contractor payout-service RabbitMQ transaction-service Ably                                                                |
|                                                                                                                            |
| \| \| \| \| \|                                                                                                             |
|                                                                                                                            |
| \| Request payout\| \| \| \|                                                                                               |
|                                                                                                                            |
| \| \-\-\-\-\-\-\-\-\-\-\--\> \| \| \| \|                                                                                   |
|                                                                                                                            |
| \| \| Initiate ACH \| \| \|                                                                                                |
|                                                                                                                            |
| \| \| Publish event\| \| \|                                                                                                |
|                                                                                                                            |
| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\>\| \| \|                                                                                  |
|                                                                                                                            |
| \| \| payout.initiated \| \|                                                                                               |
|                                                                                                                            |
| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \| \|                                                                                 |
|                                                                                                                            |
| \| \| \| \[consumer\] \| \|                                                                                                |
|                                                                                                                            |
| \| \| \| Insert row status=processing \|                                                                                   |
|                                                                                                                            |
| \| \| \| \| publish \-\-\-\--\> \|                                                                                         |
|                                                                                                                            |
| \| \| \| \| status=processing                                                                                              |
|                                                                                                                            |
| \| \...\..... ACH settles (1-3 business days) \...\..... \|                                                                |
|                                                                                                                            |
| \| \| payout.completed \| \|                                                                                               |
|                                                                                                                            |
| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\>\| \| \|                                                                                  |
|                                                                                                                            |
| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \| \|                                                                                 |
|                                                                                                                            |
| \| \| \| \[consumer\] \| \|                                                                                                |
|                                                                                                                            |
| \| \| \| Update row status=succeeded \|                                                                                    |
|                                                                                                                            |
| \| \| \| \| publish \-\-\-\--\> \|                                                                                         |
|                                                                                                                            |
| \| \| \| \| status=succeeded                                                                                               |
|                                                                                                                            |
| \| UI shows succeeded in real time \| \|                                                                                   |
|                                                                                                                            |
| \|                                                                                                                         |
| \<\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\<\-\-\-\-\-\-\-\-\-- |
| \|                                                                                                                         |
+============================================================================================================================+

## **11.5 Invoice Generation Flow**

From billing-service generating an invoice through to it appearing on
the Invoices tab with a Stripe hosted URL available.

+---------------------------------------------------------------------------------------------------------------------------------------+
| **SEQUENCE: Invoice \-- billing.invoice.generated then client views it**                                                              |
+---------------------------------------------------------------------------------------------------------------------------------------+
| billing-service Stripe RabbitMQ transaction-service Frontend                                                                          |
|                                                                                                                                       |
| \| \| \| \| \|                                                                                                                        |
|                                                                                                                                       |
| \| Contract billing interval triggered \| \|                                                                                          |
|                                                                                                                                       |
| \| Create Stripe invoice \| \| \|                                                                                                     |
|                                                                                                                                       |
| \| \-\-\-\-\-\-\-\-\-\-\--\> \| \| \| \|                                                                                              |
|                                                                                                                                       |
| \| stripe_invoice_id returned \| \| \|                                                                                                |
|                                                                                                                                       |
| \| \<\-\-\-\-\-\-\-\-\-\-- \| \| \| \|                                                                                                |
|                                                                                                                                       |
| \| Publish event\| \| \| \|                                                                                                           |
|                                                                                                                                       |
| \| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\> \| \|                                                                  |
|                                                                                                                                       |
| \| billing.invoice.generated \| \| \|                                                                                                 |
|                                                                                                                                       |
| \| \| \| \-\-\-\-\-\-\-\-\-\-\-\--\> \| \|                                                                                            |
|                                                                                                                                       |
| \| \| \| \[consumer\] \| \|                                                                                                           |
|                                                                                                                                       |
| \| \| \| Insert invoice row \|                                                                                                        |
|                                                                                                                                       |
| \| \| \| store stripe_invoice_id \|                                                                                                   |
|                                                                                                                                       |
| \| \| \| \| \|                                                                                                                        |
|                                                                                                                                       |
| \| Client opens Invoices tab \| \| \|                                                                                                 |
|                                                                                                                                       |
| \|                                                                                                                                    |
| \<\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                                       |
| \| GET /v1/invoices returns new invoice \| \|                                                                                         |
|                                                                                                                                       |
| \| Client clicks invoice ID to open modal \| \|                                                                                       |
|                                                                                                                                       |
| \| GET /v1/invoices/:id \--\> InvoiceService calls Stripe API \|                                                                      |
|                                                                                                                                       |
| \| Returns hosted_invoice_url + invoice_pdf_url \| \|                                                                                 |
+=======================================================================================================================================+

# **12. Idempotency & Message Delivery Guarantees**

RabbitMQ provides at-least-once delivery. Every consumer handler
performs an idempotency check before writing to prevent duplicate ledger
entries from redelivered messages.

  -----------------------------------------------------------------------
  **Rule**         **Implementation**           **Rationale**
  ---------------- ---------------------------- -------------------------
  Idempotency      findOne({ where: {           Prevents duplicate
  check before     transactionId:               entries when a message is
  write            payload.eventId } })         delivered more than once

  eventId as       Upstream eventId stored as   Same event always maps to
  transactionId    the transaction_id field     the same transaction_id
                                                \-- detectable on retry

  Nack without     channel.nack(msg, false,     Failed messages go to DLQ
  requeue on       false)                       for manual review \-- no
  exception                                     infinite retry loop

  DLQ depth alert  Alert on any DLQ depth \> 0  Non-empty DLQ means a
                   \-- see Doc 06               financial event was not
                                                recorded \-- P1 incident
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **DLQ Monitoring is Non-Negotiable**                                  |
|                                                                       |
| Any message in a dead-letter queue represents a financial event that  |
| failed to be recorded in the ledger. This is a P1 incident regardless |
| of time of day. Configure DLQ depth alerting before going to          |
| production. See Doc 06 for full monitoring setup.                     |
+=======================================================================+

# **13. Complete Event Reference**

  ---------------------------------------------------------------------------------------------------------------
  **Direction**   **Routing Key**                   **Source /              **Creates / Updates**
                                                    Destination**           
  --------------- --------------------------------- ----------------------- -------------------------------------
  CONSUMES        billing.payment.completed         billing-service         New DEBIT transaction, status=paid

  CONSUMES        billing.payment.failed            billing-service         New DEBIT transaction, status=failed

  CONSUMES        billing.refund.issued             billing-service         New CREDIT transaction,
                                                                            status=refunded/partially_refunded,
                                                                            parent_transaction_id set

  CONSUMES        billing.invoice.generated         billing-service         New invoice record

  CONSUMES        billing.invoice.status.updated    billing-service         Updates invoice status field

  CONSUMES        billing.subscription.charged      billing-service         New DEBIT transaction, membership
                                                                            type

  CONSUMES        billing.wire.transfer.confirmed   billing-service         New DEBIT transaction + optional wire
                                                                            fee record

  CONSUMES        timetracking.hours.logged         time-tracking-service   New CREDIT transaction,
                                                                            status=credited, userId=contractorId

  CONSUMES        payout.initiated                  payout-service          New DEBIT transaction,
                                                                            status=processing

  CONSUMES        payout.completed                  payout-service          Updates existing payout record status
                                                                            to succeeded

  CONSUMES        payout.failed                     payout-service          Updates existing payout record status
                                                                            to failed

  PUBLISHES       transaction.created               marketeq.transactions   Consumed by billing-service,
                                                                            analytics-service

  PUBLISHES       transaction.status.updated        marketeq.transactions   Consumed by notification-service
  ---------------------------------------------------------------------------------------------------------------

# **14. Next Steps**

With all integrations and event consumers fully defined, proceed to Doc
06 for observability and the nightly scheduled jobs:

  -----------------------------------------------------------------------------
  **Document**   **Title**          **What It Covers**
  -------------- ------------------ -------------------------------------------
  Doc 06         Observability &    Extended /ready check with RabbitMQ and
                 Health             Redis connectivity. Structured JSON logging
                                    for all consumer events and API calls.
                                    Metric definitions: consumer latency, DLQ
                                    depth, cache hit rate, Ably publish success
                                    rate. Nightly cron for overdue invoice
                                    escalation. Alert thresholds and SLO
                                    definitions.

  Doc 07         QA & Test Data     Consumer integration test cases for all 11
                                    events. Seed scripts for all transaction
                                    types and status combinations. Ably publish
                                    mock setup. Redis cache test fixtures.
                                    Postman collection with consumer simulation
                                    endpoints for local testing.
  -----------------------------------------------------------------------------
