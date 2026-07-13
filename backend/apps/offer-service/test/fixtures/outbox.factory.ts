// apps/offer-service/test/fixtures/outbox.factory.ts
// OS-34: Outbox event factories for all status transitions.
import { OutboxEvent, OutboxEventStatus } from '../../src/outbox/entities/outbox-event.entity';
import { SEED_OFFERS } from '../../seeds/constants/seed-ids';

export function createOutboxEvent(o: Partial<OutboxEvent> = {}): OutboxEvent {
  const now = new Date();
  return {
    id:            o.id ?? crypto.randomUUID(),
    aggregateId:   o.aggregateId ?? SEED_OFFERS.PENDING,
    aggregateType: o.aggregateType ?? 'offer',
    eventType:     o.eventType ?? 'offer.created',
    exchange:      o.exchange ?? 'marketeq.offers',
    routingKey:    o.routingKey ?? 'offer.created',
    payload:       o.payload ?? { offerId: SEED_OFFERS.PENDING },
    status:        o.status ?? OutboxEventStatus.PENDING,
    retryCount:    o.retryCount ?? 0,
    lastError:     o.lastError ?? null,
    scheduledAt:   o.scheduledAt ?? now,
    processedAt:   o.processedAt ?? null,
    createdAt:     o.createdAt ?? now,
    updatedAt:     o.updatedAt ?? now,
  } as OutboxEvent;
}

export const createFailedOutboxEvent = (o: Partial<OutboxEvent> = {}) =>
  createOutboxEvent({ status: OutboxEventStatus.FAILED, retryCount: 10, lastError: 'Connection refused after 10 attempts.', ...o });

export const createProcessingOutboxEvent = (o: Partial<OutboxEvent> = {}) =>
  createOutboxEvent({ status: OutboxEventStatus.PROCESSING, ...o });

export function createBackoffOutboxEvent(retryCount: number, o: Partial<OutboxEvent> = {}): OutboxEvent {
  const backoffMs = Math.pow(2, retryCount) * 60 * 1000;
  const scheduledAt = new Date(Date.now() + backoffMs);
  return createOutboxEvent({ status: OutboxEventStatus.PENDING, retryCount, lastError: `Attempt ${retryCount} failed: timeout.`, scheduledAt, ...o });
}