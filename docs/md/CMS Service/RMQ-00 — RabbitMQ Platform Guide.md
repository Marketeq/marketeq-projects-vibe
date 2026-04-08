**RMQ-00 — RabbitMQ Platform Guide**

Scope: All services in the Marketeq monorepo

*Purpose: Platform-wide RabbitMQ exchange topology, naming conventions
for exchanges, queues, and routing keys, consumer patterns, dead-letter
queue configuration, and connection resilience strategy. This is the
authoritative reference — all service-specific RabbitMQ docs (RMQ-01
through RMQ-03) reference this guide and do not duplicate it.*

**1. Platform Overview**

RabbitMQ is the message broker for all async inter-service communication
on the Marketeq platform. It provides delivery guarantees, automatic
retry, and fully decoupled producers and consumers. All exchanges and
queues are durable — they survive broker restarts.

Connection string: RABBITMQ_URL env var. Format:
amqp://user:pass@rabbitmq:5672. All services share the same RabbitMQ
instance.

**2. Exchange Topology**

|  |  |  |  |
|----|----|----|----|
| **Exchange** | **Type** | **Durable** | **Purpose** |
| **cms.events** | topic | Yes | Published by cms-service. Category sync events. All CMS-originated async messages. |
| **cms.events.dlx** | direct | Yes | Dead-letter exchange for cms.events. Failed messages land here after max retries. |

**3. Queue Registry**

|  |  |  |  |
|----|----|----|----|
| **Queue** | **Exchange** | **Routing Key** | **Consumer** |
| **cms.category.category** | cms.events | category.\* | category-service |
| **cms.category.category.dlq** | cms.events.dlx | category.\* | Manual inspection / alerting |

**4. Naming Conventions**

> **Exchanges**

- Pattern: \<publisher-service\>.events

- Example: cms.events — published by cms-service

- All exchanges are topic type and durable

> **Routing Keys**

- Pattern: \<resource\>.\<action\>

- Examples: category.saved, category.deleted

- Use past tense for events that have occurred

- Use dot notation — no hyphens or underscores

> **Consumer Queues**

- Pattern: \<publisher-service\>.\<consumer-service\>.\<resource\>

- Example: cms.category.category — published by cms-service, consumed by
  category-service, for the category resource

> **Dead-Letter Queues**

- Pattern: \<consumer-queue\>.dlq

- Example: cms.category.category.dlq

**5. Dead-Letter Queue Configuration**

Every consumer queue must be configured with a dead-letter exchange and
a message TTL for retry. Messages that exhaust retries are forwarded to
the DLQ for manual inspection.

> // Consumer queue declaration with DLQ wiring (NestJS RMQ transport)
>
> queueOptions: {
>
> durable: true,
>
> arguments: {
>
> 'x-dead-letter-exchange': 'cms.events.dlx',
>
> 'x-dead-letter-routing-key': 'category.dead',
>
> 'x-message-ttl': 30000, // 30s before message is DLQ'd on nack
>
> },
>
> },

**6. Consumer Pattern — NestJS Hybrid App**

NestJS microservices that need to consume RabbitMQ events while also
serving HTTP (e.g. category-service) run as hybrid apps. This pattern is
documented in RMQ-02 and RMQ-03.

> // main.ts — hybrid app pattern
>
> const app = await NestFactory.create(AppModule);
>
> // Connect the RabbitMQ microservice transport
>
> app.connectMicroservice\<MicroserviceOptions\>({
>
> transport: Transport.RMQ,
>
> options: {
>
> urls: \[process.env.RABBITMQ_URL!\],
>
> queue: 'cms.category.category',
>
> queueOptions: {
>
> durable: true,
>
> arguments: {
>
> 'x-dead-letter-exchange': 'cms.events.dlx',
>
> 'x-message-ttl': 30000,
>
> },
>
> },
>
> noAck: false,
>
> prefetchCount:1,
>
> },
>
> });
>
> // Start both HTTP and microservice listeners
>
> await app.startAllMicroservices();
>
> await app.listen(process.env.PORT ?? 3025);

**7. Connection Resilience**

- All services connect to RabbitMQ at startup. Connection failure is not
  fatal — the service logs a warning and retries.

- Use exponential backoff for reconnect: 1s → 5s → 30s → 60s.

- NestJS RMQ transport handles reconnect automatically when noAck: false
  and the connection drops.

- Publish failures in cms-service are retried up to 3 times (see CS-05,
  CmsEventPublisher).

- The nightly cron reconciliation in category-service is the final
  safety net for any missed events.

**8. Message Acknowledgement**

- Always use noAck: false. Manual acknowledgement ensures messages are
  not lost if the consumer crashes mid-processing.

- Acknowledge (ack) after successful processing.

- Negative-acknowledge (nack) with requeue: false on permanent failures
  — this routes the message to the DLQ.

- Never nack with requeue: true — this creates infinite retry loops.
