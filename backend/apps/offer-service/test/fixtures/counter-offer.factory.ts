// apps/offer-service/test/fixtures/counter-offer.factory.ts
// OS-34: Plain-object CO factories for ALL 6 CO states.
import { CounterOffer } from '../../src/counter-offers/entities/counter-offer.entity';
import { CounterOfferStatus } from '../../src/counter-offers/enums/counter-offer-status.enum';
import { WorkScheduleType } from '../../src/offers/enums/work-schedule-type.enum';
import { SEED_USERS, SEED_OFFERS } from '../../seeds/constants/seed-ids';

function defaultCOExpiry(): Date {
  const d = new Date(); d.setDate(d.getDate() + 14); return d;
}
function futureStr(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function createCounterOffer(o: Partial<CounterOffer> = {}): CounterOffer {
  const now = new Date();
  return {
    id:                o.id ?? crypto.randomUUID(),
    offerId:           o.offerId ?? SEED_OFFERS.COUNTERED,
    submittedBy:       o.submittedBy ?? 'TALENT',
    submittedById:     o.submittedById ?? SEED_USERS.TALENT_X,
    status:            o.status ?? CounterOfferStatus.PENDING,
    rate:              o.rate ?? 110,
    currencyCode:      o.currencyCode ?? 'USD',
    durationMonths:    o.durationMonths ?? 6,
    workSchedule:      o.workSchedule ?? { type: WorkScheduleType.FULL_TIME },
    startDate:         o.startDate ?? futureStr(28),
    message:           o.message ?? null,
    expiresAt:         o.expiresAt ?? defaultCOExpiry(),
    warningSentAt:     o.warningSentAt ?? null,
    acceptedAt:        o.acceptedAt ?? null,
    declinedAt:        o.declinedAt ?? null,
    withdrawnAt:       o.withdrawnAt ?? null,
    withdrawalMessage: o.withdrawalMessage ?? null,
    expiredAt:         o.expiredAt ?? null,
    supersededAt:      o.supersededAt ?? null,
    createdAt:         o.createdAt ?? now,
    updatedAt:         o.updatedAt ?? now,
  } as CounterOffer;
}

export const createPendingCO = (o: Partial<CounterOffer> = {}) =>
  createCounterOffer({ ...o, status: CounterOfferStatus.PENDING });

export const createAcceptedCO = (o: Partial<CounterOffer> = {}) =>
  createCounterOffer({ status: CounterOfferStatus.ACCEPTED, acceptedAt: new Date(), ...o });

export const createDeclinedCO = (o: Partial<CounterOffer> = {}) =>
  createCounterOffer({ status: CounterOfferStatus.DECLINED, declinedAt: new Date(), ...o });

export const createWithdrawnCO = (o: Partial<CounterOffer> = {}) =>
  createCounterOffer({ status: CounterOfferStatus.WITHDRAWN, withdrawnAt: new Date(), withdrawalMessage: 'Reconsidering.', ...o });

export const createSupersededCO = (o: Partial<CounterOffer> = {}) =>
  createCounterOffer({ status: CounterOfferStatus.SUPERSEDED, supersededAt: new Date(), ...o });

export function createExpiredCO(daysAgo = 1, o: Partial<CounterOffer> = {}): CounterOffer {
  const past = new Date(); past.setDate(past.getDate() - daysAgo);
  return createCounterOffer({ status: CounterOfferStatus.EXPIRED, expiresAt: past, expiredAt: past, ...o });
}

export function createClientCO(offerId: string, rate: number, clientId: string, o: Partial<CounterOffer> = {}): CounterOffer {
  return createCounterOffer({ offerId, submittedBy: 'CLIENT', submittedById: clientId, rate, ...o });
}

export function createHighRateCO(parentRate: number, offerId: string, o: Partial<CounterOffer> = {}): CounterOffer {
  const coRate = Math.ceil(parentRate * 1.25) + 1;
  return createPendingCO({ offerId, rate: coRate, ...o });
}