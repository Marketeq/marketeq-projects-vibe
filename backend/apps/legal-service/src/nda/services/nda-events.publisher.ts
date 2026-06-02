import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

/**
 * Publishes NDA lifecycle events to the RabbitMQ `marketeq.legal` topic exchange.
 *
 * Events published:
 *  - nda.generated  → listings-service links ndaDocumentId to listing record
 *  - nda.signed     → listings-service unlocks scope; notification-service notifies parties
 *  - nda.voided     → listings-service disables NDA requirement on the listing
 *
 * Belt-and-suspenders: the transactional OutboxWorker also publishes these events
 * from the ls_outbox_events table. Direct emit here handles the happy path;
 * the outbox handles broker-down scenarios.
 */
@Injectable()
export class NdaEventsPublisher {
  private readonly logger = new Logger(NdaEventsPublisher.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  emit(routingKey: string, payload: Record<string, unknown>): void {
    const envelope = { ...payload, emittedAt: new Date().toISOString() };
    this.client.emit(routingKey, envelope);
    this.logger.log(`Event emitted → ${routingKey}`);
  }
}
