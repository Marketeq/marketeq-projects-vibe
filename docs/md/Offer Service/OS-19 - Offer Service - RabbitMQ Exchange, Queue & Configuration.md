**OS-19**

**Offer Service --- RabbitMQ Exchange, Queue & Configuration**

**Exchange:** marketeq.offers (topic) **Events:** 14 **Role:** Publisher
only (no consumer queue)

This document covers the complete RabbitMQ topology for offer-service:
the exchange, all queues and bindings, dead-letter configuration, the
publisher implementation, and the NestJS module setup. offer-service is
a publisher only --- it does not consume from any queue. It declares the
full topology at startup so downstream consumers can connect without
needing to know the topology themselves.

**File Map**

  ---------- ----------------------------------------------- ----------------------
  **Step**   **File Path**                                   **Purpose**

  **0**      (install)                                       npm install amqplib
                                                             \@types/amqplib

  **1**      src/messaging/constants/rabbitmq.constants.ts   Exchange, queue names,
                                                             and routing key
                                                             constants

  **2**      src/messaging/rabbitmq.module.ts                NestJS module
                                                             providing the amqplib
                                                             connection

  **3**      src/messaging/rabbitmq.publisher.ts             Publisher service ---
                                                             declares topology and
                                                             publishes events

  **4**      src/messaging/events/offer-events.ts            All 14 event type
                                                             strings as typed
                                                             constants

  **5**      src/app.module.ts (update)                      Import MessagingModule
                                                             into AppModule

  **6**      (reference)                                     Complete queue and
                                                             binding specification

  **7**      (reference)                                     Verification and
                                                             management commands
  ---------- ----------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Topology Overview**                                        |
|                                                                       |
| Exchange, queues, bindings, and DLX in one view                       |
+-----------------------------------------------------------------------+

offer-service publishes all 14 offer events to one topic exchange. Three
downstream services consume events via their own dedicated queues. A
dead-letter exchange catches failed messages after retries are
exhausted. offer-service declares this entire topology at startup.

+-----------------------------------------------------------------------+
| Key architectural decision: offer-service declares all queues.        |
|                                                                       |
| offer-service could declare only the exchange and let each consumer   |
| declare its own queue.                                                |
|                                                                       |
| Instead, offer-service declares the exchange, ALL three consumer      |
| queues, and ALL bindings.                                             |
|                                                                       |
| Why: If offer-service starts and publishes before consumers declare   |
| their queues,                                                         |
|                                                                       |
| published messages are lost (no queue exists to receive them).        |
|                                                                       |
| By declaring all queues at offer-service startup, messages are safe   |
| even if                                                               |
|                                                                       |
| contracts-service, notification-service, or messaging-service are not |
| yet running.                                                          |
|                                                                       |
| Consumer services use assertQueue (idempotent) --- if the queue       |
| already exists                                                        |
|                                                                       |
| with the same settings, the assert is a no-op.                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Topology summary                                                   |
|                                                                       |
| Exchange: marketeq.offers                                             |
|                                                                       |
| Type: topic                                                           |
|                                                                       |
| Durable: true                                                         |
|                                                                       |
| Queues (3 consumer queues + 3 DLQs):                                  |
|                                                                       |
| marketeq.offers.contracts → consumed by: contracts-service            |
|                                                                       |
| marketeq.offers.notifications → consumed by: notification-service     |
|                                                                       |
| marketeq.offers.messaging → consumed by: messaging-service            |
|                                                                       |
| marketeq.offers.contracts.dlq → dead letters from contracts queue     |
|                                                                       |
| marketeq.offers.notifications.dlq → dead letters from notifications   |
| queue                                                                 |
|                                                                       |
| marketeq.offers.messaging.dlq → dead letters from messaging queue     |
|                                                                       |
| Dead-letter exchange: marketeq.offers.dlx                             |
|                                                                       |
| Type: direct                                                          |
|                                                                       |
| Durable: true                                                         |
|                                                                       |
| Bindings:                                                             |
|                                                                       |
| contracts queue: offer.accepted (exact match)                         |
|                                                                       |
| notifications queue: offer.# (all 14 events)                          |
|                                                                       |
| messaging queue: offer.created, offer.edited, offer.accepted,         |
|                                                                       |
| offer.declined, offer.withdrawn, offer.expired,                       |
|                                                                       |
| offer.countered, offer.resent (8 events)                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 1 Exchange --- marketeq.offers**                            |
|                                                                       |
| Topic exchange for all offer lifecycle events                         |
+-----------------------------------------------------------------------+

  --------------------- -------------------------------------------------
  **Name**              marketeq.offers

  **Type**              topic --- routes messages by routing key
                        patterns. Allows both exact matches (e.g.
                        offer.accepted) and wildcard matches (e.g.
                        offer.#)

  **Durable**           true --- exchange survives broker restart. Always
                        true in production.

  **Auto-delete**       false --- exchange is never automatically deleted
                        when consumers disconnect.

  **Internal**          false --- the exchange is accessible to
                        publishers.

  **Who publishes**     offer-service only, via the outbox processor. No
                        other service publishes to this exchange.

  **Who consumes**      contracts-service, notification-service,
                        messaging-service via their dedicated queues.

  **Publisher           Enabled on the channel. Publisher confirms ensure
  confirms**            the broker has persisted the message before the
                        publish() call resolves.
  --------------------- -------------------------------------------------

**Why topic exchange instead of direct?**

A direct exchange requires consumers to listen on the exact routing key.
A topic exchange allows wildcards. notification-service needs ALL 14
events --- it binds with offer.# (all routing keys starting with
\"offer.\"). This single binding covers all events without listing each
one. If a 15th event is added in the future, notification-service
automatically receives it without any topology change.

+-----------------------------------------------------------------------+
| **Section 2 All 14 Routing Keys**                                     |
|                                                                       |
| One per event type --- the confirmed event list                       |
+-----------------------------------------------------------------------+

Each routing key is an exact string. The publisher uses the routing key
as-is. Consumers bind to exact keys or wildcard patterns. Adding a new
event requires: a new routing key constant, a new binding on any queue
that needs it, and a new entry in the consumer switch/case.

  -------- ----------------------------- --------------- ------------------------------
  **\#**   **Routing Key**               **Trigger**     **Who Receives It**

  **1**    **offer.created**             Client sends    notifications (all), messaging
                                         offer           (new offer card in chat)

  **2**    **offer.accepted**            Talent accepts  contracts (creates
                                         offer           ContractGroup), notifications,
                                                         messaging

  **3**    **offer.declined**            Talent declines notifications, messaging
                                         offer           

  **4**    **offer.withdrawn**           Client          notifications, messaging
                                         withdraws offer 

  **5**    **offer.expired**             Scheduler: TTL  notifications, messaging
                                         elapsed         

  **6**    **offer.expiring_soon**       Scheduler: 48h  notifications only
                                         warning         

  **7**    **offer.edited**              Client edits    notifications (talent notified
                                         offer           of edit), messaging

  **8**    **offer.countered**           Talent submits  notifications, messaging
                                         CO              

  **9**    **offer.counter_accepted**    Either party    contracts (new ContractGroup),
                                         accepts CO      notifications, messaging

  **10**   **offer.counter_declined**    Either party    notifications
                                         declines CO     

  **11**   **offer.counter_withdrawn**   CO submitter    notifications
                                         withdraws       

  **12**   **offer.counter_edited**      CO submitter    notifications
                                         edits CO        

  **13**   **offer.counter_expired**     Scheduler: CO   notifications
                                         TTL elapsed     

  **14**   **offer.resent**              Client resends  notifications, messaging
                                         terminal offer  
  -------- ----------------------------- --------------- ------------------------------

+-----------------------------------------------------------------------+
| **Section 3 Queue Specification**                                     |
|                                                                       |
| All queues, bindings, and prefetch settings                           |
+-----------------------------------------------------------------------+

**Queue 1 --- marketeq.offers.contracts (contracts-service)**

  --------------------- -------------------------------------------------
  **Queue name**        marketeq.offers.contracts

  **Consumer**          contracts-service

  **Durable**           true

  **Auto-delete**       false

  **Exclusive**         false

  **Prefetch**          5 --- low prefetch because contract creation is
                        heavyweight (DB writes, downstream calls)

  **DLX**               marketeq.offers.dlx

  **Bindings**          offer.accepted, offer.counter_accepted

  **Why these           contracts-service creates a ContractGroup on
  bindings**            EVERY acceptance. It binds only to acceptance
                        events.
  --------------------- -------------------------------------------------

**Queue 2 --- marketeq.offers.notifications (notification-service)**

  --------------------- -------------------------------------------------
  **Queue name**        marketeq.offers.notifications

  **Consumer**          notification-service

  **Durable**           true

  **Auto-delete**       false

  **Exclusive**         false

  **Prefetch**          20 --- notifications are lightweight (DB insert +
                        push notification). Higher prefetch improves
                        throughput.

  **DLX**               marketeq.offers.dlx

  **Bindings**          offer.# (wildcard --- ALL 14 events)

  **Why this binding**  notification-service sends a notification for
                        every offer lifecycle event. The offer.# wildcard
                        automatically includes any future events.
  --------------------- -------------------------------------------------

**Queue 3 --- marketeq.offers.messaging (messaging-service)**

  --------------------- -------------------------------------------------
  **Queue name**        marketeq.offers.messaging

  **Consumer**          messaging-service

  **Durable**           true

  **Auto-delete**       false

  **Exclusive**         false

  **Prefetch**          10

  **DLX**               marketeq.offers.dlx

  **Bindings**          offer.created, offer.edited, offer.accepted,
                        offer.declined, offer.withdrawn, offer.expired,
                        offer.countered, offer.resent

  **Why these           messaging-service posts offer cards and state
  bindings**            change cards into the client-talent chat thread.
                        It does NOT listen to expiring_soon,
                        counter_accepted, counter_declined,
                        counter_withdrawn, counter_edited,
                        counter_expired.
  --------------------- -------------------------------------------------

**Dead-Letter Exchange --- marketeq.offers.dlx**

  --------------------- -------------------------------------------------
  **DLX name**          marketeq.offers.dlx

  **Type**              direct --- routes dead letters to specific DLQs
                        by routing key

  **Durable**           true

  **DLQ 1**             marketeq.offers.contracts.dlq --- bound to
                        routing key: marketeq.offers.contracts

  **DLQ 2**             marketeq.offers.notifications.dlq --- bound to
                        routing key: marketeq.offers.notifications

  **DLQ 3**             marketeq.offers.messaging.dlq --- bound to
                        routing key: marketeq.offers.messaging

  **DLQ retention**     7 days (x-message-ttl = 604800000ms). Messages
                        auto-expire from DLQ after 7 days.

  **How DLX works**     When a consumer nacks a message with
                        requeue:false (after max retries), RabbitMQ
                        routes it to the DLX using the
                        x-dead-letter-exchange setting on the source
                        queue.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 0 Install Dependencies**                                       |
|                                                                       |
| amqplib is the AMQP client for RabbitMQ                               |
+-----------------------------------------------------------------------+

amqplib is the low-level AMQP 0-9-1 client for Node.js. It is used
directly (not via NestJS microservices transport) because the outbox
pattern requires manual channel management and publisher confirms. Check
whether amqplib is already installed in the monorepo.

  -----------------------------------------------------------------------
  **FILE: Terminal --- run from monorepo root**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Check if already installed                                         |
|                                                                       |
| cat package.json \| grep amqplib                                      |
|                                                                       |
| \# Install if missing                                                 |
|                                                                       |
| npm install amqplib                                                   |
|                                                                       |
| npm install \--save-dev \@types/amqplib                               |
|                                                                       |
| \# Verify                                                             |
|                                                                       |
| cat package.json \| grep amqplib                                      |
|                                                                       |
| \# Expected: \"amqplib\": \"\^0.10.x\"                                |
|                                                                       |
| \# Note: we do NOT use \@nestjs/microservices RabbitMQ transport.     |
|                                                                       |
| \# Reason: the outbox pattern requires direct channel control and     |
| publisher confirms.                                                   |
|                                                                       |
| \# \@nestjs/microservices wraps amqplib but does not expose confirm   |
| channels.                                                             |
|                                                                       |
| \# We use amqplib directly for full control over ack, nack, and       |
| confirmations.                                                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 RabbitMQ Constants**                                         |
|                                                                       |
| Single source of truth for all exchange, queue, and routing key names |
+-----------------------------------------------------------------------+

Every string name used in RabbitMQ configuration is defined here. No
magic strings anywhere in the codebase. If an exchange or queue name
changes, change it here and everywhere updates automatically. The
RABBITMQ_CLIENT injection token is used to inject the amqplib
connection.

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/messaging/constants/rabbitmq.constants.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* RabbitMQ topology constants for offer-service.                     |
|                                                                       |
| \* All exchange names, queue names, routing keys, and DLX settings.   |
|                                                                       |
| \* Import from here --- never hardcode these strings anywhere else.   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Injection token                                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const RABBITMQ_CLIENT = Symbol(\'RABBITMQ_CLIENT\');           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Exchange                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const OFFER_EXCHANGE = \'marketeq.offers\';                    |
|                                                                       |
| export const OFFER_DLX = \'marketeq.offers.dlx\';                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Consumer queues (declared by offer-service at startup)             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const QUEUE_CONTRACTS = \'marketeq.offers.contracts\';         |
|                                                                       |
| export const QUEUE_NOTIFICATIONS = \'marketeq.offers.notifications\'; |
|                                                                       |
| export const QUEUE_MESSAGING = \'marketeq.offers.messaging\';         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Dead-letter queues                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const DLQ_CONTRACTS = \'marketeq.offers.contracts.dlq\';       |
|                                                                       |
| export const DLQ_NOTIFICATIONS =                                      |
| \'marketeq.offers.notifications.dlq\';                                |
|                                                                       |
| export const DLQ_MESSAGING = \'marketeq.offers.messaging.dlq\';       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // DLX routing keys (used when binding DLQs to DLX)                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const DLX_KEY_CONTRACTS = \'marketeq.offers.contracts\';       |
|                                                                       |
| export const DLX_KEY_NOTIFICATIONS =                                  |
| \'marketeq.offers.notifications\';                                    |
|                                                                       |
| export const DLX_KEY_MESSAGING = \'marketeq.offers.messaging\';       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Routing keys (one per event type)                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const OFFER_ROUTING_KEYS = {                                   |
|                                                                       |
| CREATED: \'offer.created\',                                           |
|                                                                       |
| ACCEPTED: \'offer.accepted\',                                         |
|                                                                       |
| DECLINED: \'offer.declined\',                                         |
|                                                                       |
| WITHDRAWN: \'offer.withdrawn\',                                       |
|                                                                       |
| EXPIRED: \'offer.expired\',                                           |
|                                                                       |
| EXPIRING_SOON: \'offer.expiring_soon\',                               |
|                                                                       |
| EDITED: \'offer.edited\',                                             |
|                                                                       |
| COUNTERED: \'offer.countered\',                                       |
|                                                                       |
| COUNTER_ACCEPTED: \'offer.counter_accepted\',                         |
|                                                                       |
| COUNTER_DECLINED: \'offer.counter_declined\',                         |
|                                                                       |
| COUNTER_WITHDRAWN:\'offer.counter_withdrawn\',                        |
|                                                                       |
| COUNTER_EDITED: \'offer.counter_edited\',                             |
|                                                                       |
| COUNTER_EXPIRED: \'offer.counter_expired\',                           |
|                                                                       |
| RESENT: \'offer.resent\',                                             |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| export type OfferRoutingKey = typeof OFFER_ROUTING_KEYS\[keyof typeof |
| OFFER_ROUTING_KEYS\];                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Queue bindings (which routing keys each queue receives)            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const QUEUE_BINDINGS = {                                       |
|                                                                       |
| // contracts-service: accept events only                              |
|                                                                       |
| \[QUEUE_CONTRACTS\]: \[                                               |
|                                                                       |
| OFFER_ROUTING_KEYS.ACCEPTED,                                          |
|                                                                       |
| OFFER_ROUTING_KEYS.COUNTER_ACCEPTED,                                  |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // notification-service: all events (use wildcard in binding)         |
|                                                                       |
| \[QUEUE_NOTIFICATIONS\]: \[\'offer.#\'\], // wildcard binds all 14    |
|                                                                       |
| // messaging-service: 8 events (no CO-internal events)                |
|                                                                       |
| \[QUEUE_MESSAGING\]: \[                                               |
|                                                                       |
| OFFER_ROUTING_KEYS.CREATED,                                           |
|                                                                       |
| OFFER_ROUTING_KEYS.EDITED,                                            |
|                                                                       |
| OFFER_ROUTING_KEYS.ACCEPTED,                                          |
|                                                                       |
| OFFER_ROUTING_KEYS.DECLINED,                                          |
|                                                                       |
| OFFER_ROUTING_KEYS.WITHDRAWN,                                         |
|                                                                       |
| OFFER_ROUTING_KEYS.EXPIRED,                                           |
|                                                                       |
| OFFER_ROUTING_KEYS.COUNTERED,                                         |
|                                                                       |
| OFFER_ROUTING_KEYS.RESENT,                                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Message TTL for DLQs (7 days in milliseconds)                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const DLQ_MESSAGE_TTL_MS = 7 \* 24 \* 60 \* 60 \* 1000; //     |
| 604800000                                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 MessagingModule --- rabbitmq.module.ts**                     |
|                                                                       |
| NestJS module providing the amqplib connection as an injectable       |
+-----------------------------------------------------------------------+

MessagingModule creates the amqplib AMQP connection and exports it as a
provider. It is decorated with \@Global() so any module can inject
RABBITMQ_CLIENT without importing MessagingModule explicitly. The
connection is created once at startup and reused across all channels.

+-----------------------------------------------------------------------+
| Connection vs Channel:                                                |
|                                                                       |
| An AMQP connection is a TCP connection to the RabbitMQ broker.        |
|                                                                       |
| A channel is a logical multiplexed stream within a connection.        |
|                                                                       |
| Best practice: one shared connection, one channel per operation type. |
|                                                                       |
| MessagingModule provides the CONNECTION.                              |
|                                                                       |
| RabbitMQPublisher creates a dedicated channel for publishing.         |
|                                                                       |
| The outbox processor gets its own channel for confirm-mode            |
| publishing.                                                           |
|                                                                       |
| Why not use \@nestjs/microservices?                                   |
|                                                                       |
| \@nestjs/microservices wraps amqplib but abstracts away publisher     |
| confirms.                                                             |
|                                                                       |
| Publisher confirms are mandatory for the outbox pattern: they verify  |
|                                                                       |
| the broker has persisted the message before we mark it as PUBLISHED.  |
|                                                                       |
| We use amqplib directly to access ConfirmChannel.                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/messaging/rabbitmq.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module, Global, OnApplicationShutdown } from                 |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as amqp from \'amqplib\';                                   |
|                                                                       |
| import { RABBITMQ_CLIENT } from \'./constants/rabbitmq.constants\';   |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| import { RabbitMQPublisher } from \'./rabbitmq.publisher\';           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* MessagingModule --- Provides the amqplib AMQP connection and       |
| RabbitMQ publisher.                                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@Global() --- RABBITMQ_CLIENT is injectable in every module       |
| without re-importing.                                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The connection is established at startup and closed gracefully on  |
| shutdown.                                                             |
|                                                                       |
| \* If connection fails at startup, the service fails to start         |
| (fail-fast).                                                          |
|                                                                       |
| \* If connection is lost after startup, amqplib will attempt          |
| reconnection.                                                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| provide: RABBITMQ_CLIENT,                                             |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| useFactory: async (config: ConfigService): Promise\<amqp.Connection\> |
| =\> {                                                                 |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').rabbitmq;            |
|                                                                       |
| const connectionUrl = cfg.url ?? \[                                   |
|                                                                       |
| \`amqp\${cfg.tls ? \'s\' : \'\'}://\`,                                |
|                                                                       |
| \`\${cfg.username}:\${cfg.password}\`,                                |
|                                                                       |
| \`@\${cfg.host}:\${cfg.port}\`,                                       |
|                                                                       |
| \`/\${encodeURIComponent(cfg.vhost ?? \'/\')}\`,                      |
|                                                                       |
| \].join(\'\');                                                        |
|                                                                       |
| const connection = await amqp.connect(connectionUrl, {                |
|                                                                       |
| // Heartbeat: broker and client send heartbeats every 60s.            |
|                                                                       |
| // If neither receives a heartbeat, the connection is assumed dead.   |
|                                                                       |
| heartbeat: 60,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| connection.on(\'error\', (err) =\> {                                  |
|                                                                       |
| console.error(\'\[RabbitMQ\] Connection error:\', err.message);       |
|                                                                       |
| });                                                                   |
|                                                                       |
| connection.on(\'close\', () =\> {                                     |
|                                                                       |
| console.warn(\'\[RabbitMQ\] Connection closed. Service may need       |
| restart.\');                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| console.log(\'\[RabbitMQ\] Connected to broker.\');                   |
|                                                                       |
| return connection;                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| RabbitMQPublisher,                                                    |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[RABBITMQ_CLIENT, RabbitMQPublisher\],                      |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class MessagingModule {}                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 RabbitMQPublisher --- rabbitmq.publisher.ts**                |
|                                                                       |
| Declares topology and publishes events with confirms                  |
+-----------------------------------------------------------------------+

RabbitMQPublisher is the core publisher service. On initialization it
creates a ConfirmChannel and declares the full topology (exchange, DLX,
all queues, all bindings). It then provides a publish() method used by
the outbox processor to send events. Publisher confirms ensure the
broker has persisted each message before the publish() promise resolves.

+-----------------------------------------------------------------------+
| RabbitMQPublisher.onModuleInit() declares the FULL topology on every  |
| startup.                                                              |
|                                                                       |
| All assertExchange and assertQueue calls are IDEMPOTENT.              |
|                                                                       |
| If the exchange/queue already exists with the SAME settings: no-op.   |
|                                                                       |
| If the exchange/queue exists with DIFFERENT settings: RabbitMQ        |
| returns a channel error.                                              |
|                                                                       |
| Changing exchange/queue settings (e.g. making a durable queue         |
| non-durable)                                                          |
|                                                                       |
| requires deleting the existing exchange/queue first. This is a manual |
| operation.                                                            |
|                                                                       |
| In production: delete the queue only when it is empty and consumers   |
| are stopped.                                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/messaging/rabbitmq.publisher.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Inject, OnModuleInit, Logger } from              |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import \* as amqp from \'amqplib\';                                   |
|                                                                       |
| import {                                                              |
|                                                                       |
| RABBITMQ_CLIENT,                                                      |
|                                                                       |
| OFFER_EXCHANGE, OFFER_DLX,                                            |
|                                                                       |
| QUEUE_CONTRACTS, QUEUE_NOTIFICATIONS, QUEUE_MESSAGING,                |
|                                                                       |
| DLQ_CONTRACTS, DLQ_NOTIFICATIONS, DLQ_MESSAGING,                      |
|                                                                       |
| DLX_KEY_CONTRACTS, DLX_KEY_NOTIFICATIONS, DLX_KEY_MESSAGING,          |
|                                                                       |
| QUEUE_BINDINGS, DLQ_MESSAGE_TTL_MS,                                   |
|                                                                       |
| OfferRoutingKey,                                                      |
|                                                                       |
| } from \'./constants/rabbitmq.constants\';                            |
|                                                                       |
| /\*\* Shape of a message published to the exchange. \*/               |
|                                                                       |
| export interface RabbitMQMessage {                                    |
|                                                                       |
| routingKey: OfferRoutingKey;                                          |
|                                                                       |
| payload: Record\<string, unknown\>;                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* RabbitMQPublisher --- Declares topology and publishes events.      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Used exclusively by OutboxProcessor to publish pending outbox      |
| events.                                                               |
|                                                                       |
| \* Every publish uses a ConfirmChannel so we know the broker received |
| the message.                                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Topology declared at onModuleInit():                               |
|                                                                       |
| \* - marketeq.offers (topic exchange)                                 |
|                                                                       |
| \* - marketeq.offers.dlx (dead-letter exchange)                       |
|                                                                       |
| \* - 3 consumer queues with DLX settings                              |
|                                                                       |
| \* - 3 DLQs                                                           |
|                                                                       |
| \* - All bindings                                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class RabbitMQPublisher implements OnModuleInit {              |
|                                                                       |
| private readonly logger = new Logger(RabbitMQPublisher.name);         |
|                                                                       |
| private channel: amqp.ConfirmChannel;                                 |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@Inject(RABBITMQ_CLIENT)                                             |
|                                                                       |
| private readonly connection: amqp.Connection,                         |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async onModuleInit(): Promise\<void\> {                               |
|                                                                       |
| this.channel = await this.connection.createConfirmChannel();          |
|                                                                       |
| this.channel.on(\'error\', (err) =\> {                                |
|                                                                       |
| this.logger.error(\'Channel error:\', err.message);                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.declareTopology();                                         |
|                                                                       |
| this.logger.log(\'RabbitMQ topology declared. Publisher ready.\');    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Topology declaration                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| private async declareTopology(): Promise\<void\> {                    |
|                                                                       |
| // \-- Primary exchange \--                                           |
|                                                                       |
| await this.channel.assertExchange(OFFER_EXCHANGE, \'topic\', {        |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| autoDelete: false,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-- Dead-letter exchange \--                                       |
|                                                                       |
| await this.channel.assertExchange(OFFER_DLX, \'direct\', {            |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| autoDelete: false,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-- Dead-letter queues (declare first, referenced by consumer      |
| queues) \--                                                           |
|                                                                       |
| for (const \[dlq, dlxKey\] of \[                                      |
|                                                                       |
| \[DLQ_CONTRACTS, DLX_KEY_CONTRACTS\],                                 |
|                                                                       |
| \[DLQ_NOTIFICATIONS, DLX_KEY_NOTIFICATIONS\],                         |
|                                                                       |
| \[DLQ_MESSAGING, DLX_KEY_MESSAGING\],                                 |
|                                                                       |
| \] as const) {                                                        |
|                                                                       |
| await this.channel.assertQueue(dlq, {                                 |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| autoDelete: false,                                                    |
|                                                                       |
| arguments: {                                                          |
|                                                                       |
| \'x-message-ttl\': DLQ_MESSAGE_TTL_MS, // 7-day retention             |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Bind DLQ to DLX with the service-specific routing key              |
|                                                                       |
| await this.channel.bindQueue(dlq, OFFER_DLX, dlxKey);                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-- Consumer queues \--                                            |
|                                                                       |
| const queueConfigs = \[                                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: QUEUE_CONTRACTS,                                                |
|                                                                       |
| dlxKey: DLX_KEY_CONTRACTS,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: QUEUE_NOTIFICATIONS,                                            |
|                                                                       |
| dlxKey: DLX_KEY_NOTIFICATIONS,                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: QUEUE_MESSAGING,                                                |
|                                                                       |
| dlxKey: DLX_KEY_MESSAGING,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| \];                                                                   |
|                                                                       |
| for (const { name, dlxKey } of queueConfigs) {                        |
|                                                                       |
| await this.channel.assertQueue(name, {                                |
|                                                                       |
| durable: true,                                                        |
|                                                                       |
| autoDelete: false,                                                    |
|                                                                       |
| arguments: {                                                          |
|                                                                       |
| \'x-dead-letter-exchange\': OFFER_DLX,                                |
|                                                                       |
| \'x-dead-letter-routing-key\': dlxKey,                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-- Bindings \--                                                   |
|                                                                       |
| // Bind each consumer queue to the primary exchange with its routing  |
| keys.                                                                 |
|                                                                       |
| for (const \[queueName, routingKeys\] of                              |
| Object.entries(QUEUE_BINDINGS)) {                                     |
|                                                                       |
| for (const routingKey of routingKeys) {                               |
|                                                                       |
| await this.channel.bindQueue(queueName, OFFER_EXCHANGE, routingKey);  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| this.logger.log(\`Topology declared: \${OFFER_EXCHANGE} + 3 queues +  |
| 3 DLQs\`);                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Publishing                                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* publish() --- Publishes a single message with publisher confirms.  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Publisher confirms: the broker sends an ack/nack back to the       |
| publisher                                                             |
|                                                                       |
| \* after persisting the message. This promise resolves on ack,        |
| rejects on nack.                                                      |
|                                                                       |
| \* The outbox processor retries on rejection.                         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param message --- routingKey and payload to publish              |
|                                                                       |
| \* \@returns Promise\<void\> --- resolves when broker confirms        |
| receipt                                                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async publish(message: RabbitMQMessage): Promise\<void\> {            |
|                                                                       |
| const { routingKey, payload } = message;                              |
|                                                                       |
| return new Promise((resolve, reject) =\> {                            |
|                                                                       |
| const content = Buffer.from(JSON.stringify(payload));                 |
|                                                                       |
| const options: amqp.Options.Publish = {                               |
|                                                                       |
| persistent: true, // Message survives broker restart (stored to disk) |
|                                                                       |
| contentType: \'application/json\',                                    |
|                                                                       |
| contentEncoding: \'utf-8\',                                           |
|                                                                       |
| timestamp: Math.floor(Date.now() / 1000), // Unix timestamp (seconds) |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| \'x-event-type\': routingKey, // Redundant copy for consumers         |
|                                                                       |
| \'x-service-origin\': \'offer-service\',                              |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| // channel.publish() returns false if the write buffer is full        |
| (backpressure).                                                       |
|                                                                       |
| // The callback fires when the broker sends an ack or nack.           |
|                                                                       |
| const ok = this.channel.publish(                                      |
|                                                                       |
| OFFER_EXCHANGE,                                                       |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| content,                                                              |
|                                                                       |
| options,                                                              |
|                                                                       |
| (err) =\> {                                                           |
|                                                                       |
| if (err) {                                                            |
|                                                                       |
| this.logger.error(\`Publish nacked for \${routingKey}:\`,             |
| err.message);                                                         |
|                                                                       |
| reject(err);                                                          |
|                                                                       |
| } else {                                                              |
|                                                                       |
| resolve();                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| // If the write buffer is full, wait for drain before continuing.     |
|                                                                       |
| if (!ok) {                                                            |
|                                                                       |
| this.channel.once(\'drain\', () =\> {                                 |
|                                                                       |
| this.logger.warn(\`Write buffer drained for \${routingKey}. Broker    |
| may be under load.\`);                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* publishBatch() --- Publishes multiple messages and waits for all   |
| confirms.                                                             |
|                                                                       |
| \* Used by the outbox processor to publish a batch of pending events. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async publishBatch(messages: RabbitMQMessage\[\]): Promise\<void\> {  |
|                                                                       |
| await Promise.all(messages.map(m =\> this.publish(m)));               |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* isReady() --- Returns true if the channel is open and usable.      |
|                                                                       |
| \* Used by the /ready health check endpoint.                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| isReady(): boolean {                                                  |
|                                                                       |
| return !!this.channel && !this.channel.closed;                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Event Types --- offer-events.ts**                            |
|                                                                       |
| Typed constants for all 14 event names                                |
+-----------------------------------------------------------------------+

This file exports typed event name constants. The OutboxEvent entity
uses these strings in its event_type column. The outbox processor reads
event_type to determine the routing key. Always import event names from
here --- never use raw strings in service code.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/messaging/events/offer-events.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OFFER_ROUTING_KEYS } from                                    |
| \'../constants/rabbitmq.constants\';                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OFFER_EVENTS --- All 14 event type constants.                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* These match the routing keys exactly (same strings).               |
|                                                                       |
| \* Used in:                                                           |
|                                                                       |
| \* - OutboxEvent.eventType column                                     |
|                                                                       |
| \* - OutboxEvent.routingKey column                                    |
|                                                                       |
| \* - OfferHistoryEvent.eventType column                               |
|                                                                       |
| \* - Service methods when writing outbox rows                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const OFFER_EVENTS = OFFER_ROUTING_KEYS;                       |
|                                                                       |
| // Re-export the type for use in service methods                      |
|                                                                       |
| export type { OfferRoutingKey as OfferEventType } from                |
| \'../constants/rabbitmq.constants\';                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in service methods:                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // import { OFFER_EVENTS } from \'../messaging/events/offer-events\'; |
|                                                                       |
| //                                                                    |
|                                                                       |
| // await this.outboxService.create({                                  |
|                                                                       |
| // aggregateId: offer.id,                                             |
|                                                                       |
| // eventType: OFFER_EVENTS.ACCEPTED,                                  |
|                                                                       |
| // routingKey: OFFER_EVENTS.ACCEPTED,                                 |
|                                                                       |
| // exchange: OFFER_EXCHANGE,                                          |
|                                                                       |
| // payload: buildOfferAcceptedPayload(offer),                         |
|                                                                       |
| // });                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Update AppModule --- Import MessagingModule**                |
|                                                                       |
| One import line in AppModule                                          |
+-----------------------------------------------------------------------+

MessagingModule must be imported in AppModule for the RabbitMQ
connection to be established at startup. Because MessagingModule is
\@Global(), the RABBITMQ_CLIENT and RabbitMQPublisher are automatically
available in every module.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts --- add MessagingModule to
  imports**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { MessagingModule } from \'./messaging/rabbitmq.module\'; //   |
| \<\-- ADD THIS                                                        |
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
| MessagingModule, // \<\-- ADD THIS. \@Global() means publisher is     |
| injectable everywhere.                                                |
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
| **Section 6 Complete Queue & Binding Reference**                      |
|                                                                       |
| Every queue, argument, and binding in one table                       |
+-----------------------------------------------------------------------+

  --------------------------------------- ------------- ---------- -------------- ---------------------------------------
  **Queue**                               **Durable**   **DLX?**   **Prefetch**   **Bindings (routing keys)**

  **marketeq.offers.contracts**           true          yes        5              offer.accepted, offer.counter_accepted

  **marketeq.offers.notifications**       true          yes        20             offer.# (all 14 events via wildcard)

  **marketeq.offers.messaging**           true          yes        10             offer.created, offer.edited,
                                                                                  offer.accepted, offer.declined,
                                                                                  offer.withdrawn, offer.expired,
                                                                                  offer.countered, offer.resent

  **marketeq.offers.contracts.dlq**       true          no         ---            Bound to marketeq.offers.dlx with key:
                                                                                  marketeq.offers.contracts

  **marketeq.offers.notifications.dlq**   true          no         ---            Bound to marketeq.offers.dlx with key:
                                                                                  marketeq.offers.notifications

  **marketeq.offers.messaging.dlq**       true          no         ---            Bound to marketeq.offers.dlx with key:
                                                                                  marketeq.offers.messaging
  --------------------------------------- ------------- ---------- -------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Section 7 Environment Variables**                                   |
|                                                                       |
| RabbitMQ settings required in .env                                    |
+-----------------------------------------------------------------------+

These variables are read by the ConfigService (OS-09) and passed to the
MessagingModule connection factory. All variables are validated by the
Joi schema at startup.

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# apps/offer-service/.env --- RabbitMQ settings                      |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Connection                                                         |
|                                                                       |
| RABBITMQ_HOST=localhost                                               |
|                                                                       |
| RABBITMQ_PORT=5672                                                    |
|                                                                       |
| RABBITMQ_USERNAME=guest \# Change in staging/production               |
|                                                                       |
| RABBITMQ_PASSWORD=guest \# Change in staging/production               |
|                                                                       |
| RABBITMQ_VHOST=/ \# Default vhost. Use a dedicated vhost in           |
| production.                                                           |
|                                                                       |
| \# TLS (set to true in staging and production)                        |
|                                                                       |
| RABBITMQ_TLS=false                                                    |
|                                                                       |
| \# Alternatively, use a full AMQP URL:                                |
|                                                                       |
| \# RABBITMQ_URL=amqp://user:pass@rabbit-host:5672/vhost               |
|                                                                       |
| \# If RABBITMQ_URL is set, host/port/username/password are ignored.   |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# How these map to offer.config.ts (OS-09):                          |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.host =\> RABBITMQ_HOST              |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.port =\> RABBITMQ_PORT              |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.username =\> RABBITMQ_USERNAME      |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.password =\> RABBITMQ_PASSWORD      |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.vhost =\> RABBITMQ_VHOST            |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.tls =\> RABBITMQ_TLS                |
|                                                                       |
| \# config.get(\'offer\').rabbitmq.url =\> RABBITMQ_URL (optional)     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Verification --- Confirm Topology After Startup**            |
|                                                                       |
| Use RabbitMQ Management UI or CLI                                     |
+-----------------------------------------------------------------------+

After starting offer-service for the first time, verify that all
exchanges, queues, and bindings were created correctly. Use either the
RabbitMQ Management UI (http://localhost:15672) or the rabbitmqctl CLI.

**Using the Management UI**

+-----------------------------------------------------------------------+
| \# Start RabbitMQ with management plugin (Docker):                    |
|                                                                       |
| docker run -d \--name rabbitmq \\                                     |
|                                                                       |
| -p 5672:5672 -p 15672:15672 \\                                        |
|                                                                       |
| rabbitmq:3-management                                                 |
|                                                                       |
| \# Default credentials: guest/guest                                   |
|                                                                       |
| \# Management UI: http://localhost:15672                              |
|                                                                       |
| \# After starting offer-service, check:                               |
|                                                                       |
| \# Exchanges tab:                                                     |
|                                                                       |
| \# marketeq.offers --- type: topic, durable: true                     |
|                                                                       |
| \# marketeq.offers.dlx --- type: direct, durable: true                |
|                                                                       |
| \# Queues tab:                                                        |
|                                                                       |
| \# marketeq.offers.contracts --- durable: true,                       |
| x-dead-letter-exchange set                                            |
|                                                                       |
| \# marketeq.offers.notifications --- durable: true,                   |
| x-dead-letter-exchange set                                            |
|                                                                       |
| \# marketeq.offers.messaging --- durable: true,                       |
| x-dead-letter-exchange set                                            |
|                                                                       |
| \# marketeq.offers.contracts.dlq                                      |
|                                                                       |
| \# marketeq.offers.notifications.dlq                                  |
|                                                                       |
| \# marketeq.offers.messaging.dlq                                      |
|                                                                       |
| \# Bindings: click on marketeq.offers exchange → Bindings tab         |
|                                                                       |
| \# marketeq.offers.contracts ← offer.accepted, offer.counter_accepted |
|                                                                       |
| \# marketeq.offers.notifications ← offer.# (wildcard)                 |
|                                                                       |
| \# marketeq.offers.messaging ← offer.created, offer.edited, \... (8   |
| keys)                                                                 |
+-----------------------------------------------------------------------+

**Using rabbitmqadmin CLI**

+-----------------------------------------------------------------------+
| \# List all exchanges                                                 |
|                                                                       |
| rabbitmqadmin list exchanges                                          |
|                                                                       |
| \# Should include: marketeq.offers (topic), marketeq.offers.dlx       |
| (direct)                                                              |
|                                                                       |
| \# List all queues                                                    |
|                                                                       |
| rabbitmqadmin list queues                                             |
|                                                                       |
| \# Should include all 6 queues                                        |
|                                                                       |
| \# List bindings on the primary exchange                              |
|                                                                       |
| rabbitmqadmin list bindings \| grep marketeq.offers                   |
|                                                                       |
| \# Should show all routing key bindings                               |
|                                                                       |
| \# Verify a specific binding                                          |
|                                                                       |
| rabbitmqadmin list bindings source=marketeq.offers                    |
+-----------------------------------------------------------------------+

**Publish a test message and verify routing**

+-----------------------------------------------------------------------+
| \# Publish a test offer.created event via Management UI:              |
|                                                                       |
| \# 1. Go to Exchanges → marketeq.offers → Publish Message             |
|                                                                       |
| \# 2. Routing key: offer.created                                      |
|                                                                       |
| \# 3. Payload: {\"test\": true, \"offerId\": \"test-123\"}            |
|                                                                       |
| \# 4. Click Publish                                                   |
|                                                                       |
| \# Verify delivery:                                                   |
|                                                                       |
| \# Queues → marketeq.offers.notifications → Messages → Get Messages   |
|                                                                       |
| \# Should show the test message.                                      |
|                                                                       |
| \# Queues → marketeq.offers.messaging → Get Messages                  |
|                                                                       |
| \# Should also show the test message (offer.created is bound to       |
| both).                                                                |
|                                                                       |
| \# Queues → marketeq.offers.contracts → Get Messages                  |
|                                                                       |
| \# Should NOT show the message (contracts only binds offer.accepted). |
|                                                                       |
| \# Publish offer.accepted and verify it reaches contracts queue:      |
|                                                                       |
| \# Routing key: offer.accepted                                        |
|                                                                       |
| \# Should appear in: contracts, notifications, messaging queues.      |
|                                                                       |
| \# Publish offer.expiring_soon and verify:                            |
|                                                                       |
| \# Should appear in: notifications queue ONLY.                        |
+-----------------------------------------------------------------------+

**Confirm publisher confirms are working**

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# Start offer-service and watch startup logs:                                                                                                                                                                      |
|                                                                                                                                                                                                                     |
| npm run start:dev \--workspace=apps/offer-service                                                                                                                                                                   |
|                                                                                                                                                                                                                     |
| \# Look for:                                                                                                                                                                                                        |
|                                                                                                                                                                                                                     |
| \# \[RabbitMQ\] Connected to broker.                                                                                                                                                                                |
|                                                                                                                                                                                                                     |
| \# \[RabbitMQPublisher\] RabbitMQ topology declared. Publisher ready.                                                                                                                                               |
|                                                                                                                                                                                                                     |
| \# Create an offer via the API (triggers offer.created event through outbox):                                                                                                                                       |
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
|                                                                                                                                                                                                                     |
| \# In the Management UI: check marketeq.offers.notifications queue                                                                                                                                                  |
|                                                                                                                                                                                                                     |
| \# You should see 1 message in the queue (offer.created event)                                                                                                                                                      |
|                                                                                                                                                                                                                     |
| \# Check: Delivery mode = Persistent (2), Content-Type = application/json                                                                                                                                           |
|                                                                                                                                                                                                                     |
| \# Check headers: x-event-type = offer.created, x-service-origin = offer-service                                                                                                                                    |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If connection fails on startup with \"ECONNREFUSED\":                 |
|                                                                       |
| RabbitMQ is not running. Start it: docker-compose up -d rabbitmq      |
|                                                                       |
| Verify RABBITMQ_HOST and RABBITMQ_PORT in .env.                       |
|                                                                       |
| If topology assertion fails with \"PRECONDITION_FAILED\":             |
|                                                                       |
| A queue or exchange already exists with different settings.           |
|                                                                       |
| This happens when settings change after initial declaration.          |
|                                                                       |
| Fix: delete the queue/exchange in Management UI, then restart the     |
| service.                                                              |
|                                                                       |
| In production: only do this when the queue is empty and consumers are |
| stopped.                                                              |
|                                                                       |
| If messages are published but not received by consumers:              |
|                                                                       |
| Check bindings in Management UI (Exchanges → marketeq.offers →        |
| Bindings).                                                            |
|                                                                       |
| Check that the routing key matches the binding pattern exactly.       |
|                                                                       |
| Remember: offer.expiring_soon does NOT match offer.# --- wait, it     |
| does.                                                                 |
|                                                                       |
| offer.# matches ALL routing keys starting with \"offer.\".            |
|                                                                       |
| Double-check by publishing to the exchange via Management UI and      |
| watching queues.                                                      |
|                                                                       |
| If the channel is null when publish() is called:                      |
|                                                                       |
| onModuleInit() may not have completed before the first publish        |
| attempt.                                                              |
|                                                                       |
| Ensure MessagingModule is imported before SchedulerModule in          |
| AppModule.                                                            |
|                                                                       |
| The outbox processor should only start polling after all modules are  |
| initialized.                                                          |
+-----------------------------------------------------------------------+
