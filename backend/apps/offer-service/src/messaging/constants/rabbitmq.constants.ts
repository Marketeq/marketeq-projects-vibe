// apps/offer-service/src/messaging/constants/rabbitmq.constants.ts
// OS-19: All RabbitMQ topology constants. Never hardcode these strings elsewhere.
// OS-23: Added ABLY_CHANNEL_PREFIX for real-time channel naming.
 
export const RABBITMQ_CLIENT = Symbol('RABBITMQ_CLIENT');
 
// Exchanges
export const OFFER_EXCHANGE = 'marketeq.offers';
export const OFFER_DLX = 'marketeq.offers.dlx';
 
// Consumer queues
export const QUEUE_CONTRACTS = 'marketeq.offers.contracts';
export const QUEUE_NOTIFICATIONS = 'marketeq.offers.notifications';
export const QUEUE_MESSAGING = 'marketeq.offers.messaging';
 
// Dead-letter queues
export const DLQ_CONTRACTS = 'marketeq.offers.contracts.dlq';
export const DLQ_NOTIFICATIONS = 'marketeq.offers.notifications.dlq';
export const DLQ_MESSAGING = 'marketeq.offers.messaging.dlq';
 
// DLX routing keys
export const DLX_KEY_CONTRACTS = 'marketeq.offers.contracts';
export const DLX_KEY_NOTIFICATIONS = 'marketeq.offers.notifications';
export const DLX_KEY_MESSAGING = 'marketeq.offers.messaging';
 
// Routing keys (one per event type)
export const OFFER_ROUTING_KEYS = {
  CREATED: 'offer.created',
  ACCEPTED: 'offer.accepted',
  DECLINED: 'offer.declined',
  WITHDRAWN: 'offer.withdrawn',
  EXPIRED: 'offer.expired',
  EXPIRING_SOON: 'offer.expiring_soon',
  EDITED: 'offer.edited',
  COUNTERED: 'offer.countered',
  COUNTER_ACCEPTED: 'offer.counter_accepted',
  COUNTER_DECLINED: 'offer.counter_declined',
  COUNTER_WITHDRAWN: 'offer.counter_withdrawn',
  COUNTER_EDITED: 'offer.counter_edited',
  COUNTER_EXPIRED: 'offer.counter_expired',
  RESENT: 'offer.resent',
} as const;
 
export type OfferRoutingKey = typeof OFFER_ROUTING_KEYS[keyof typeof OFFER_ROUTING_KEYS];
 
// Queue bindings
export const QUEUE_BINDINGS = {
  [QUEUE_CONTRACTS]: [OFFER_ROUTING_KEYS.ACCEPTED, OFFER_ROUTING_KEYS.COUNTER_ACCEPTED],
  [QUEUE_NOTIFICATIONS]: ['offer.#'], // wildcard — all 14 events
  [QUEUE_MESSAGING]: [
    OFFER_ROUTING_KEYS.CREATED, OFFER_ROUTING_KEYS.EDITED,
    OFFER_ROUTING_KEYS.ACCEPTED, OFFER_ROUTING_KEYS.DECLINED,
    OFFER_ROUTING_KEYS.WITHDRAWN, OFFER_ROUTING_KEYS.EXPIRED,
    OFFER_ROUTING_KEYS.COUNTERED, OFFER_ROUTING_KEYS.RESENT,
  ],
} as const;
 
// DLQ message TTL (7 days)
export const DLQ_MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
 
// OS-23: Ably channel prefix — one channel per offer: "offer:{offerId}"
export const ABLY_CHANNEL_PREFIX = 'offer:';