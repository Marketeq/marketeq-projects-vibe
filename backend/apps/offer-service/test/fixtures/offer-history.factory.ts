// apps/offer-service/test/fixtures/offer-history.factory.ts
// OS-34: All history event type factories.
import { OfferHistoryEvent } from '../../src/offer-history/entities/offer-history-event.entity';
import { SEED_OFFERS, SEED_USERS } from '../../seeds/constants/seed-ids';

function futureStr(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function createHistoryEvent(o: Partial<OfferHistoryEvent> = {}): OfferHistoryEvent {
  return {
    id:             o.id ?? crypto.randomUUID(),
    offerId:        o.offerId ?? SEED_OFFERS.PENDING,
    counterOfferId: o.counterOfferId ?? null,
    eventType:      o.eventType ?? 'offer.created',
    actor:          o.actor ?? 'CLIENT',
    actorId:        o.actorId ?? SEED_USERS.CLIENT_A,
    terms:          o.terms ?? {
      rate: 95, currencyCode: 'USD', durationMonths: 6,
      workSchedule: { type: 'FULL_TIME' }, startDate: futureStr(30), message: null,
    },
    createdAt:      o.createdAt ?? new Date(),
  } as OfferHistoryEvent;
}

export const createOfferCreatedEvent   = (o: any = {}) => createHistoryEvent({ eventType: 'offer.created', actor: 'CLIENT', ...o });
export const createOfferEditedEvent    = (o: any = {}) => createHistoryEvent({ eventType: 'offer.edited', actor: 'CLIENT', ...o });
export const createOfferAcceptedEvent  = (o: any = {}) => createHistoryEvent({ eventType: 'offer.accepted', actor: 'TALENT', ...o });
export const createOfferDeclinedEvent  = (o: any = {}) => createHistoryEvent({ eventType: 'offer.declined', actor: 'TALENT', ...o });
export const createOfferWithdrawnEvent = (o: any = {}) => createHistoryEvent({ eventType: 'offer.withdrawn', actor: 'CLIENT', ...o });
export const createOfferExpiredEvent   = (o: any = {}) => createHistoryEvent({ eventType: 'offer.expired', actor: 'SYSTEM', actorId: null, ...o });
export const createOfferCounteredEvent = (o: any = {}) => createHistoryEvent({ eventType: 'offer.countered', actor: 'TALENT', ...o });
export const createCOAcceptedEvent     = (o: any = {}) => createHistoryEvent({ eventType: 'offer.counter_accepted', actor: 'CLIENT', ...o });
export const createCODeclinedEvent     = (o: any = {}) => createHistoryEvent({ eventType: 'offer.counter_declined', actor: 'CLIENT', ...o });
export const createCOWithdrawnEvent    = (o: any = {}) => createHistoryEvent({ eventType: 'offer.counter_withdrawn', actor: 'TALENT', ...o });
export const createCOEditedEvent       = (o: any = {}) => createHistoryEvent({ eventType: 'offer.counter_edited', actor: 'TALENT', ...o });
export const createCOExpiredEvent      = (o: any = {}) => createHistoryEvent({ eventType: 'offer.counter_expired', actor: 'SYSTEM', actorId: null, ...o });
export const createOfferResentEvent    = (o: any = {}) => createHistoryEvent({ eventType: 'offer.resent', actor: 'CLIENT', ...o });