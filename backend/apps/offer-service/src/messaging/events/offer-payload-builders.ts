// apps/offer-service/src/messaging/events/offer-payload-builders.ts
// OS-20: Builder functions for all 14 event payloads.
import { v4 as uuidv4 } from 'uuid';
import { Offer } from '../../offers/entities/offer.entity';
import { CounterOffer } from '../../counter-offers/entities/counter-offer.entity';
import { DeclineChip } from '../../offers/enums/decline-chip.enum';
import { OFFER_EVENTS } from './offer-events';
import {
  OfferCreatedPayload, OfferEditedPayload, OfferAcceptedPayload,
  OfferDeclinedPayload, OfferWithdrawnPayload, OfferExpiredPayload,
  OfferExpiringSoonPayload, OfferResentPayload,
  OfferCounteredPayload, OfferCounterEditedPayload,
  OfferCounterAcceptedPayload, OfferCounterDeclinedPayload,
  OfferCounterWithdrawnPayload, OfferCounterExpiredPayload,
  OfferTermsPayload, PayloadWorkSchedule,
} from './offer-event-payloads';

function termsFromOffer(offer: Offer): OfferTermsPayload {
  return {
    rate: offer.rate, currencyCode: offer.currencyCode,
    durationMonths: offer.durationMonths,
    workSchedule: offer.workSchedule as PayloadWorkSchedule,
    startDate: offer.startDate, message: offer.message,
  };
}

function termsFromCO(co: CounterOffer): OfferTermsPayload {
  return {
    rate: co.rate, currencyCode: co.currencyCode,
    durationMonths: co.durationMonths,
    workSchedule: co.workSchedule as PayloadWorkSchedule,
    startDate: co.startDate, message: co.message,
  };
}

function base<A extends 'CLIENT' | 'TALENT' | 'SYSTEM', ID extends string | null>(offer: Offer, actor: A, actorId: ID) {
  return {
    eventId: uuidv4(), schemaVersion: '1' as const,
    occurredAt: new Date().toISOString(),
    actor, actorId,
    offerId: offer.id, clientId: offer.clientId,
    talentId: offer.talentId, jobListingId: offer.jobListingId,
    contractType: offer.contractType, contractTitle: offer.contractTitle,
  };
}

export function buildOfferCreatedPayload(offer: Offer): OfferCreatedPayload {
  return { ...base(offer, 'CLIENT', offer.clientId), eventType: OFFER_EVENTS.CREATED, terms: termsFromOffer(offer), expiresAt: offer.expiresAt.toISOString() };
}

export function buildOfferEditedPayload(offer: Offer, previousTerms: OfferTermsPayload): OfferEditedPayload {
  return { ...base(offer, 'CLIENT', offer.clientId), eventType: OFFER_EVENTS.EDITED, terms: termsFromOffer(offer), previousTerms, expiresAt: offer.expiresAt.toISOString() };
}

export function buildOfferAcceptedPayload(offer: Offer): OfferAcceptedPayload {
  return { ...base(offer, 'TALENT', offer.talentId), eventType: OFFER_EVENTS.ACCEPTED, acceptedAt: (offer.acceptedAt ?? new Date()).toISOString(), terms: termsFromOffer(offer) };
}

export function buildOfferDeclinedPayload(offer: Offer): OfferDeclinedPayload {
  return { ...base(offer, 'TALENT', offer.talentId), eventType: OFFER_EVENTS.DECLINED, declinedAt: (offer.declinedAt ?? new Date()).toISOString(), terms: termsFromOffer(offer) };
}

export function buildOfferWithdrawnPayload(offer: Offer): OfferWithdrawnPayload {
  return { ...base(offer, 'CLIENT', offer.clientId), eventType: OFFER_EVENTS.WITHDRAWN, withdrawnAt: (offer.withdrawnAt ?? new Date()).toISOString(), withdrawalMessage: offer.withdrawalMessage, terms: termsFromOffer(offer) };
}

export function buildOfferExpiredPayload(offer: Offer): OfferExpiredPayload {
  return { ...base(offer, 'SYSTEM', null), eventType: OFFER_EVENTS.EXPIRED, expiredAt: (offer.expiredAt ?? offer.expiresAt).toISOString(), terms: termsFromOffer(offer) };
}

export function buildOfferExpiringSoonPayload(offer: Offer): OfferExpiringSoonPayload {
  const hoursRemaining = Math.max(0, Math.floor((offer.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
  return { ...base(offer, 'SYSTEM', null), eventType: OFFER_EVENTS.EXPIRING_SOON, expiresAt: offer.expiresAt.toISOString(), hoursRemaining, terms: termsFromOffer(offer) };
}

export function buildOfferResentPayload(newOffer: Offer): OfferResentPayload {
  return { ...base(newOffer, 'CLIENT', newOffer.clientId), eventType: OFFER_EVENTS.RESENT, originalOfferId: newOffer.originalOfferId!, terms: termsFromOffer(newOffer), expiresAt: newOffer.expiresAt.toISOString() };
}

export function buildOfferCounteredPayload(offer: Offer, co: CounterOffer, rateWarning: boolean): OfferCounteredPayload {
  return { ...base(offer, co.submittedBy, co.submittedById), eventType: OFFER_EVENTS.COUNTERED, counterOfferId: co.id, submittedBy: co.submittedBy, submittedById: co.submittedById, parentOfferTerms: termsFromOffer(offer), counterOfferTerms: termsFromCO(co), rateWarning, counterExpiresAt: co.expiresAt.toISOString() };
}

export function buildOfferCounterEditedPayload(offer: Offer, co: CounterOffer, previousTerms: OfferTermsPayload): OfferCounterEditedPayload {
  return { ...base(offer, co.submittedBy, co.submittedById), eventType: OFFER_EVENTS.COUNTER_EDITED, counterOfferId: co.id, submittedBy: co.submittedBy, submittedById: co.submittedById, counterOfferTerms: termsFromCO(co), previousTerms, counterExpiresAt: co.expiresAt.toISOString() };
}

export function buildOfferCounterAcceptedPayload(offer: Offer, co: CounterOffer, acceptedById: string): OfferCounterAcceptedPayload {
  const acceptedBy = co.submittedBy === 'CLIENT' ? 'TALENT' : 'CLIENT';
  return { ...base(offer, acceptedBy, acceptedById), eventType: OFFER_EVENTS.COUNTER_ACCEPTED, counterOfferId: co.id, submittedBy: co.submittedBy, acceptedBy, acceptedById, acceptedAt: (co.acceptedAt ?? new Date()).toISOString(), counterOfferTerms: termsFromCO(co), originalOfferTerms: termsFromOffer(offer) };
}

export function buildOfferCounterDeclinedPayload(offer: Offer, co: CounterOffer, declinedById: string, declinedReason?: string, declinedChip?: DeclineChip): OfferCounterDeclinedPayload {
  const declinedBy = co.submittedBy === 'CLIENT' ? 'TALENT' : 'CLIENT';
  return { ...base(offer, declinedBy, declinedById), eventType: OFFER_EVENTS.COUNTER_DECLINED, counterOfferId: co.id, declinedBy, declinedById, declinedAt: (co.declinedAt ?? new Date()).toISOString(), counterOfferTerms: termsFromCO(co), parentOfferStatus: offer.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING', declinedReason, declinedChip };
}

export function buildOfferCounterWithdrawnPayload(offer: Offer, co: CounterOffer): OfferCounterWithdrawnPayload {
  return { ...base(offer, co.submittedBy, co.submittedById), eventType: OFFER_EVENTS.COUNTER_WITHDRAWN, counterOfferId: co.id, submittedBy: co.submittedBy, withdrawnBy: co.submittedBy, withdrawnById: co.submittedById, withdrawnAt: (co.withdrawnAt ?? new Date()).toISOString(), withdrawalMessage: co.withdrawalMessage, counterOfferTerms: termsFromCO(co), parentOfferStatus: 'PENDING' };
}

export function buildOfferCounterExpiredPayload(offer: Offer, co: CounterOffer): OfferCounterExpiredPayload {
  return { ...base(offer, 'SYSTEM', null), eventType: OFFER_EVENTS.COUNTER_EXPIRED, counterOfferId: co.id, submittedBy: co.submittedBy, expiredAt: (co.expiredAt ?? co.expiresAt).toISOString(), counterOfferTerms: termsFromCO(co), parentOfferStatus: offer.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING' };
}