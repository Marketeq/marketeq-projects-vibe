// apps/offer-service/src/offers/interfaces/offer-response.interface.ts
// OS-11: TypeScript interfaces for all offer API response shapes
import { OfferStatus } from '../enums/offer-status.enum';
import { ContractType } from '../enums/contract-type.enum';
import { WorkScheduleType } from '../enums/work-schedule-type.enum';

/** WorkSchedule as returned in all API responses. */
export interface WorkScheduleResponse {
  type: WorkScheduleType;
  hoursPerWeek?: number; // Only present when type = CUSTOM
}

/**
 * OfferResponse — Returned by all primary offer endpoints
 * (POST/GET/PATCH /v1/offers/:id, accept, decline, withdraw)
 */
export interface OfferResponse {
  id: string;
  clientId: string;
  talentId: string;
  jobListingId: string;
  contractType: ContractType;
  contractTitle: string;
  status: OfferStatus;
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: WorkScheduleResponse;
  startDate: string;            // YYYY-MM-DD
  startDateDisplay: string;     // "Monday, Jan 30, 2025"
  message: string | null;
  expiresAt: string;            // ISO 8601 UTC
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  expiredAt: string | null;
  warningSentAt: string | null;
}

/** ResendOfferResponse — Returned by POST /v1/offers/:id/resend (201) */
export interface ResendOfferResponse extends OfferResponse {
  originalOfferId: string;
}

/** Terms snapshot stored at each history event. */
export interface OfferHistoryTerms {
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: WorkScheduleResponse;
  startDate: string;
  startDateDisplay: string;
  message: string | null;
}

/** A single event in the offer history timeline. */
export interface OfferHistoryEvent {
  id: string;
  offerId: string;
  eventType: string;            // 'offer.created' | 'offer.edited' | 'offer.countered' etc.
  actor: 'CLIENT' | 'TALENT' | 'SYSTEM';
  actorId: string;
  terms: OfferHistoryTerms;
  createdAt: string;
}

/** OfferHistoryResponse — Returned by GET /v1/offers/:id/history (200) */
export interface OfferHistoryResponse {
  data: OfferHistoryEvent[];
  nextCursor: string | null;
  total: number;
}