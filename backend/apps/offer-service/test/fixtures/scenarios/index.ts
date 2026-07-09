// apps/offer-service/test/fixtures/scenarios/index.ts
// OS-34: Named, pre-built scenarios — import and use directly in tests.
import { OfferScenarioBuilder } from '../offer-scenario-builder';

export const SCENARIOS = {
  /** PENDING offer, no CO. */
  pending: new OfferScenarioBuilder()
    .withOffer({ rate: 95 })
    .build(),

  /** PENDING offer about to expire (20h). Warning already sent. */
  expiringSoon: new OfferScenarioBuilder()
    .withOffer({
      rate: 95,
      expiresAt: new Date(Date.now() + 20 * 3600 * 1000),
      warningSentAt: new Date(Date.now() - 4 * 3600 * 1000),
    } as any)
    .build(),

  /** COUNTERED: talent submitted CO at $110 on a $90 offer (no warning). */
  singleRoundCO: new OfferScenarioBuilder()
    .withOffer({ rate: 90 })
    .withTalentCO({ rate: 110 })
    .build(),

  /** COUNTERED: talent asked >25% above. rateWarning = true. */
  rateWarningCO: new OfferScenarioBuilder()
    .withOffer({ rate: 100 })
    .withTalentCO({ rate: 126 })
    .build(),

  /** ACCEPTED via counter offer acceptance. */
  acceptedViaCO: new OfferScenarioBuilder()
    .withOffer({ rate: 90 })
    .withTalentCO({ rate: 110 }).accepted()
    .withOffer({}) // chain reset — not needed, acceptedViaCO uses terminal
    ? undefined as any // TS workaround
    : undefined as any,

  /** Three-round negotiation. Last CO is PENDING. */
  threeRoundCO: new OfferScenarioBuilder()
    .withOffer({ rate: 120 })
    .withTalentCO({ rate: 145 }).declined()
    .withClientCO({ rate: 130 }).declined()
    .withTalentCO({ rate: 135 })
    .build(),

  /** Three-round negotiation. Last CO accepted. */
  threeRoundAccepted: new OfferScenarioBuilder()
    .withOffer({ rate: 120 })
    .withTalentCO({ rate: 145 }).declined()
    .withClientCO({ rate: 130 }).declined()
    .withTalentCO({ rate: 135 }).accepted()
    .build(),

  /** Client CO with rate warning: 79 < 100 * 0.80. */
  clientCOWithWarning: new OfferScenarioBuilder()
    .withOffer({ rate: 100 })
    .withClientCO({ rate: 79 })
    .build(),

  /** CO expired, parent restored to PENDING. */
  coExpiredRestored: new OfferScenarioBuilder()
    .withOffer({ rate: 90 })
    .withTalentCO({ rate: 110 }).expired()
    .build(),
} as const;

// Fix acceptedViaCO separately (fluent chain issue)
(SCENARIOS as any).acceptedViaCO = new OfferScenarioBuilder()
  .withOffer({ rate: 90 })
  .withTalentCO({ rate: 110 }).accepted()
  .build();