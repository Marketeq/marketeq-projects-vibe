// apps/offer-service/src/outbox/outbox.service.ts
// OS-21: Atomic outbox writer — always called inside a transaction.
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';

export interface OutboxWriteInput {
  aggregateId: string;
  eventType: string;
  routingKey: string;
  payload: Record<string, unknown>;
  exchange?: string;
  aggregateType?: string;
}

@Injectable()
export class OutboxService {
  async write(input: OutboxWriteInput, manager: EntityManager): Promise<void> {
    const {
      aggregateId, eventType, routingKey, payload,
      exchange = OFFER_EXCHANGE, aggregateType = 'offer',
    } = input;

    await manager.getRepository(OutboxEvent).insert({
      aggregateId, aggregateType, eventType,
      exchange, routingKey, payload: payload as any,
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      scheduledAt: new Date(),
    });
  }
}