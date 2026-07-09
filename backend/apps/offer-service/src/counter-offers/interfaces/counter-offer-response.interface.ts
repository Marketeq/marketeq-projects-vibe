// apps/offer-service/src/counter-offers/interfaces/counter-offer-response.interface.ts
// OS-11: TypeScript interfaces for counter offer API responses
import { CounterOfferStatus } from '../enums/counter-offer-status.enum';
import { WorkScheduleResponse, OfferResponse } from '../../offers/interfaces/offer-response.interface';

/** CounterOfferResponse — Returned by all primary counter offer endpoints. */
export interface CounterOfferResponse {
  id: string;
  offerId: string;
  submittedBy: 'CLIENT' | 'TALENT';
  submittedById: string;
  status: CounterOfferStatus;
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: WorkScheduleResponse;
  startDate: string;
  startDateDisplay: string;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  rateWarning: boolean;         // advisory only
}

/** DeclineCounterOfferResponse — Returned by POST .../decline (200) */
export interface DeclineCounterOfferResponse {
  counterOffer: CounterOfferResponse;  // status: DECLINED
  parentOffer: OfferResponse;          // status: PENDING (restored)
}

/** WithdrawCounterOfferResponse — Returned by POST .../withdraw (200) */
export interface WithdrawCounterOfferResponse {
  counterOffer: CounterOfferResponse;  // status: WITHDRAWN
  parentOffer: OfferResponse;          // status: PENDING (restored)
}