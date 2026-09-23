// apps/offer-service/src/offers/interfaces/offer-response.interface.ts
// OS-11: TypeScript interfaces for all offer API response shapes
import { OfferStatus } from '../enums/offer-status.enum';
import { ContractType } from '../enums/contract-type.enum';
import { WorkScheduleType } from '../enums/work-schedule-type.enum';
import { CounterOfferStatus } from '../../counter-offers/enums/counter-offer-status.enum';
import { UserRole } from '../../common/types/user-role.enum';

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
  // PMCM-392 AC-40.06: set once contracts-service creates the contract for
  // this (accepted) offer; null otherwise.
  contractId: string | null;
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

/**
 * Summary of the most recent counter-offer for an offer-list row — enough
 * to render a "Countered" badge without a second round-trip per row.
 * Deliberately smaller than CounterOfferResponse (counter-offers/interfaces):
 * no workSchedule/message (detail-view content, not list content) and no
 * rateWarning (a derived advisory flag only meaningful when a counter is
 * actually being reviewed/actioned, not for a list badge).
 */
export interface LatestCounterOfferSummary {
  id: string;
  submittedBy: 'CLIENT' | 'TALENT';
  submittedById: string;
  status: CounterOfferStatus;
  rate: number;
  currencyCode: string;
  durationMonths: number;
  startDate: string;
  createdAt: string;
}

/**
 * GET /v1/offers — one row of the offers-inbox list.
 *
 * Note: NOT typed as OfferResponse (or a structural variant of it).
 * OfferResponse promises `startDateDisplay`, but nothing in this service —
 * including GET /:id today — actually computes it; `findById` returns the
 * raw Offer entity as-is. Claiming to satisfy OfferResponse here would make
 * list rows carry a field detail rows don't, which is the opposite of
 * "detail and list agree." This mirrors exactly what GET /:id already
 * returns (an Offer, dates included) plus the one field this endpoint adds.
 */
export interface OfferListItem {
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
  startDate: string;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  withdrawnAt: Date | null;
  expiredAt: Date | null;
  warningSentAt: Date | null;
  // PMCM-392 AC-40.06: set once contracts-service creates the contract for
  // this (accepted) offer; null otherwise.
  contractId: string | null;
  latestCounterOffer: LatestCounterOfferSummary | null;
  // Which side of this offer the authenticated caller is on. Derived from
  // clientId/talentId vs the JWT's userId — never from the `as` query
  // param, which only narrows the WHERE clause and has no bearing on what
  // any individual row actually is.
  viewerRole: UserRole;
}

/** PaginatedOfferListResponse — Returned by GET /v1/offers (200) */
export interface PaginatedOfferListResponse {
  data: OfferListItem[];
  total: number;
  page: number;
  limit: number;
}