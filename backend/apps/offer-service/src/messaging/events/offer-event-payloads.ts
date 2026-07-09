// apps/offer-service/src/messaging/events/offer-event-payloads.ts
// OS-20: All 14 event payload interfaces for offer-service.
import { ContractType } from '../../offers/enums/contract-type.enum';
import { WorkScheduleType } from '../../offers/enums/work-schedule-type.enum';
import { OfferRoutingKey } from '../constants/rabbitmq.constants';

export interface PayloadWorkSchedule {
  type: WorkScheduleType;
  hoursPerWeek?: number;
}

export interface OfferTermsPayload {
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: PayloadWorkSchedule;
  startDate: string;
  message: string | null;
}

export interface BaseOfferEventPayload {
  eventId: string;
  eventType: OfferRoutingKey;
  schemaVersion: string;
  occurredAt: string;
  actor: 'CLIENT' | 'TALENT' | 'SYSTEM';
  actorId: string | null;
  offerId: string;
  clientId: string;
  talentId: string;
  jobListingId: string;
  contractType: ContractType;
  contractTitle: string;
}

export interface OfferCreatedPayload extends BaseOfferEventPayload {
  eventType: 'offer.created';
  actor: 'CLIENT';
  terms: OfferTermsPayload;
  expiresAt: string;
}

export interface OfferEditedPayload extends BaseOfferEventPayload {
  eventType: 'offer.edited';
  actor: 'CLIENT';
  terms: OfferTermsPayload;
  previousTerms: OfferTermsPayload;
  expiresAt: string;
}

export interface OfferAcceptedPayload extends BaseOfferEventPayload {
  eventType: 'offer.accepted';
  actor: 'TALENT';
  acceptedAt: string;
  terms: OfferTermsPayload;
}

export interface OfferDeclinedPayload extends BaseOfferEventPayload {
  eventType: 'offer.declined';
  actor: 'TALENT';
  declinedAt: string;
  terms: OfferTermsPayload;
}

export interface OfferWithdrawnPayload extends BaseOfferEventPayload {
  eventType: 'offer.withdrawn';
  actor: 'CLIENT';
  withdrawnAt: string;
  withdrawalMessage: string | null;
  terms: OfferTermsPayload;
}

export interface OfferExpiredPayload extends BaseOfferEventPayload {
  eventType: 'offer.expired';
  actor: 'SYSTEM';
  actorId: null;
  expiredAt: string;
  terms: OfferTermsPayload;
}

export interface OfferExpiringSoonPayload extends BaseOfferEventPayload {
  eventType: 'offer.expiring_soon';
  actor: 'SYSTEM';
  actorId: null;
  expiresAt: string;
  hoursRemaining: number;
  terms: OfferTermsPayload;
}

export interface OfferResentPayload extends BaseOfferEventPayload {
  eventType: 'offer.resent';
  actor: 'CLIENT';
  originalOfferId: string;
  terms: OfferTermsPayload;
  expiresAt: string;
}

export interface OfferCounteredPayload extends BaseOfferEventPayload {
  eventType: 'offer.countered';
  actor: 'CLIENT' | 'TALENT';
  counterOfferId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  submittedById: string;
  parentOfferTerms: OfferTermsPayload;
  counterOfferTerms: OfferTermsPayload;
  rateWarning: boolean;
  counterExpiresAt: string;
}

export interface OfferCounterEditedPayload extends BaseOfferEventPayload {
  eventType: 'offer.counter_edited';
  actor: 'CLIENT' | 'TALENT';
  counterOfferId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  submittedById: string;
  counterOfferTerms: OfferTermsPayload;
  previousTerms: OfferTermsPayload;
  counterExpiresAt: string;
}

export interface OfferCounterAcceptedPayload extends BaseOfferEventPayload {
  eventType: 'offer.counter_accepted';
  actor: 'CLIENT' | 'TALENT';
  counterOfferId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  acceptedBy: 'CLIENT' | 'TALENT';
  acceptedById: string;
  acceptedAt: string;
  counterOfferTerms: OfferTermsPayload;
  originalOfferTerms: OfferTermsPayload;
}

export interface OfferCounterDeclinedPayload extends BaseOfferEventPayload {
  eventType: 'offer.counter_declined';
  actor: 'CLIENT' | 'TALENT';
  counterOfferId: string;
  declinedBy: 'CLIENT' | 'TALENT';
  declinedById: string;
  declinedAt: string;
  counterOfferTerms: OfferTermsPayload;
  parentOfferStatus: 'PENDING';
}

export interface OfferCounterWithdrawnPayload extends BaseOfferEventPayload {
  eventType: 'offer.counter_withdrawn';
  actor: 'CLIENT' | 'TALENT';
  counterOfferId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  withdrawnBy: 'CLIENT' | 'TALENT';
  withdrawnById: string;
  withdrawnAt: string;
  withdrawalMessage: string | null;
  counterOfferTerms: OfferTermsPayload;
  parentOfferStatus: 'PENDING';
}

export interface OfferCounterExpiredPayload extends BaseOfferEventPayload {
  eventType: 'offer.counter_expired';
  actor: 'SYSTEM';
  actorId: null;
  counterOfferId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  expiredAt: string;
  counterOfferTerms: OfferTermsPayload;
  parentOfferStatus: 'PENDING' | 'EXPIRED';
}

export type AnyOfferEventPayload =
  | OfferCreatedPayload
  | OfferEditedPayload
  | OfferAcceptedPayload
  | OfferDeclinedPayload
  | OfferWithdrawnPayload
  | OfferExpiredPayload
  | OfferExpiringSoonPayload
  | OfferResentPayload
  | OfferCounteredPayload
  | OfferCounterEditedPayload
  | OfferCounterAcceptedPayload
  | OfferCounterDeclinedPayload
  | OfferCounterWithdrawnPayload
  | OfferCounterExpiredPayload;