// apps/offer-service/test/fixtures/offer.factory.ts
// OS-34: Plain-object offer factories for ALL 6 offer states.
// No DB dependency. Use in unit tests with mocked repos.
import { Offer } from '../../src/offers/entities/offer.entity';
import { OfferStatus } from '../../src/offers/enums/offer-status.enum';
import { ContractType } from '../../src/offers/enums/contract-type.enum';
import { WorkScheduleType } from '../../src/offers/enums/work-schedule-type.enum';
import { SEED_USERS, SEED_LISTINGS } from '../../seeds/constants/seed-ids';

function defaultExpiry(): Date {
  const d = new Date(); d.setDate(d.getDate() + 14); return d;
}
function pastDate(daysAgo: number): Date {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); return d;
}
function futureStr(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function createOffer(overrides: Partial<Offer> = {}): Offer {
  const now = new Date();
  return {
    id:               overrides.id ?? crypto.randomUUID(),
    clientId:         overrides.clientId ?? SEED_USERS.CLIENT_A,
    talentId:         overrides.talentId ?? SEED_USERS.TALENT_X,
    jobListingId:     overrides.jobListingId ?? SEED_LISTINGS.PROJECT_ALPHA,
    contractType:     overrides.contractType ?? ContractType.PROJECT,
    contractTitle:    overrides.contractTitle ?? 'Test Project',
    status:           overrides.status ?? OfferStatus.PENDING,
    rate:             overrides.rate ?? 95,
    currencyCode:     overrides.currencyCode ?? 'USD',
    durationMonths:   overrides.durationMonths ?? 6,
    workSchedule:     overrides.workSchedule ?? { type: WorkScheduleType.FULL_TIME },
    startDate:        overrides.startDate ?? futureStr(30),
    message:          overrides.message ?? null,
    expiresAt:        overrides.expiresAt ?? defaultExpiry(),
    warningSentAt:    overrides.warningSentAt ?? null,
    acceptedAt:       overrides.acceptedAt ?? null,
    declinedAt:       overrides.declinedAt ?? null,
    declinedReason:   overrides.declinedReason ?? null,
    declinedChip:     overrides.declinedChip ?? null,
    withdrawnAt:      overrides.withdrawnAt ?? null,
    withdrawalMessage: overrides.withdrawalMessage ?? null,
    expiredAt:        overrides.expiredAt ?? null,
    originalOfferId:  overrides.originalOfferId ?? null,
    createdAt:        overrides.createdAt ?? now,
    updatedAt:        overrides.updatedAt ?? now,
  } as Offer;
}

export const createPendingOffer = (o: Partial<Offer> = {}) =>
  createOffer({ ...o, status: OfferStatus.PENDING });

export const createAcceptedOffer = (o: Partial<Offer> = {}) =>
  createOffer({ status: OfferStatus.ACCEPTED, acceptedAt: new Date(), ...o });

export const createDeclinedOffer = (o: Partial<Offer> = {}) =>
  createOffer({ status: OfferStatus.DECLINED, declinedAt: new Date(), declinedReason: 'Budget does not match current rates.', declinedChip: 'BUDGET_DOESNT_WORK', ...o });

export const createWithdrawnOffer = (o: Partial<Offer> = {}) =>
  createOffer({ status: OfferStatus.WITHDRAWN, withdrawnAt: new Date(), withdrawalMessage: 'Pausing hiring for now.', ...o });

export const createExpiredOfferRecent = (o: Partial<Offer> = {}) => {
  const expiredAt = pastDate(10);
  return createOffer({ status: OfferStatus.EXPIRED, expiresAt: expiredAt, expiredAt, ...o });
};

export const createExpiredOfferOld = (o: Partial<Offer> = {}) => {
  const expiredAt = pastDate(40);
  return createOffer({ status: OfferStatus.EXPIRED, expiresAt: expiredAt, expiredAt, ...o });
};

export const createCounteredOffer = (o: Partial<Offer> = {}) =>
  createOffer({ ...o, status: OfferStatus.COUNTERED });

export const createExpiringSoonOffer = (o: Partial<Offer> = {}) => {
  const expiresAt = new Date(Date.now() + 20 * 60 * 60 * 1000);
  const warningSentAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
  return createOffer({ expiresAt, warningSentAt, ...o });
};

export const createResentOffer = (originalOfferId: string, o: Partial<Offer> = {}) =>
  createOffer({ status: OfferStatus.PENDING, originalOfferId, ...o });