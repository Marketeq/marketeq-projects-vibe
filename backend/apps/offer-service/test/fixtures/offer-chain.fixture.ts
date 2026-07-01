// apps/offer-service/test/fixtures/offer-chain.fixture.ts
// OS-18: Pre-built multi-round negotiation chains for complex tests.
import { createOffer, createCounteredOffer } from './offer.factory';
import { createCounterOffer, createSupersededCO, createPendingCO } from './counter-offer.factory';
import { Offer } from '../../src/offers/entities/offer.entity';
import { CounterOffer } from '../../src/counter-offers/entities/counter-offer.entity';

export interface NegotiationChain {
  offer: Offer;
  counterOffers: CounterOffer[];
}

/** Creates a 3-round negotiation: offer → CO1 (superseded) → CO2 (superseded) → CO3 (pending) */
export function createThreeRoundNegotiation(overrides: {
  offer?: Partial<Offer>;
  co1?: Partial<CounterOffer>;
  co2?: Partial<CounterOffer>;
  co3?: Partial<CounterOffer>;
} = {}): NegotiationChain {
  const offer = createCounteredOffer({ rate: 100, ...overrides.offer });

  const co1 = createSupersededCO({
    offerId: offer.id,
    submittedBy: 'TALENT',
    submittedById: offer.talentId,
    rate: 130,
    ...overrides.co1,
  });

  const co2 = createSupersededCO({
    offerId: offer.id,
    submittedBy: 'CLIENT',
    submittedById: offer.clientId,
    rate: 115,
    ...overrides.co2,
  });

  const co3 = createPendingCO({
    offerId: offer.id,
    submittedBy: 'TALENT',
    submittedById: offer.talentId,
    rate: 120,
    ...overrides.co3,
  });

  return { offer, counterOffers: [co1, co2, co3] };
}