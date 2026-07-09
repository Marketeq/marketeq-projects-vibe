// apps/offer-service/test/fixtures/db-offer.fixture.ts
// OS-34: Integration fixture — persists offers to the test DB via EntityManager.
import { EntityManager } from 'typeorm';
import { Offer } from '../../src/offers/entities/offer.entity';
import { CounterOffer } from '../../src/counter-offers/entities/counter-offer.entity';
import { OfferHistoryEvent } from '../../src/offer-history/entities/offer-history-event.entity';
import { OfferScenarioBuilder, ScenarioResult } from './offer-scenario-builder';

export class DbOfferFixture {
  constructor(private readonly em: EntityManager) {}

  async save(scenario: ScenarioResult): Promise<ScenarioResult> {
    const savedOffer = await this.em.save(Offer, scenario.offer);
    const savedCOs = await this.em.save(CounterOffer, scenario.counterOffers);
    await this.em.save(OfferHistoryEvent, scenario.history);

    return {
      offer: savedOffer,
      counterOffers: savedCOs,
      activeCO: savedCOs.find((co) => co.status === 'PENDING') ?? null,
      history: scenario.history,
    };
  }

  async createPendingOffer(overrides: Record<string, unknown> = {}): Promise<ScenarioResult> {
    return this.save(new OfferScenarioBuilder().withOffer(overrides as any).build());
  }

  async createCounteredOffer(
    offerOverrides: Record<string, unknown> = {},
    coOverrides: Record<string, unknown> = {},
  ): Promise<ScenarioResult> {
    return this.save(
      new OfferScenarioBuilder()
        .withOffer(offerOverrides as any)
        .withTalentCO({ rate: (coOverrides.rate as number) ?? 110 })
        .build(),
    );
  }

  async createThreeRoundOffer(parentRate = 120): Promise<ScenarioResult> {
    return this.save(
      new OfferScenarioBuilder()
        .withOffer({ rate: parentRate })
        .withTalentCO({ rate: parentRate + 25 }).declined()
        .withClientCO({ rate: parentRate + 10 }).declined()
        .withTalentCO({ rate: parentRate + 15 })
        .build(),
    );
  }

  async createAcceptedViaCounterOffer(parentRate = 90, coRate = 110): Promise<ScenarioResult> {
    return this.save(
      new OfferScenarioBuilder()
        .withOffer({ rate: parentRate })
        .withTalentCO({ rate: coRate }).accepted()
        .build(),
    );
  }
}