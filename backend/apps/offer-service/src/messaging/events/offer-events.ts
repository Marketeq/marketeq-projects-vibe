// apps/offer-service/src/messaging/events/offer-events.ts
// OS-19: All 14 event type constants. Used in OutboxEvent + OfferHistoryEvent.
import { OFFER_ROUTING_KEYS } from '../constants/rabbitmq.constants';

export const OFFER_EVENTS = OFFER_ROUTING_KEYS;

export type { OfferRoutingKey as OfferEventType } from '../constants/rabbitmq.constants';