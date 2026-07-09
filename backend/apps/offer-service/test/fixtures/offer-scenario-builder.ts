// apps/offer-service/test/fixtures/offer-scenario-builder.ts
// OS-34: Fluent builder for any multi-round negotiation scenario.
// .build() for plain objects (unit tests), .save(em) via DbOfferFixture for integration.
import { Offer } from '../../src/offers/entities/offer.entity';
import { CounterOffer } from '../../src/counter-offers/entities/counter-offer.entity';
import { OfferHistoryEvent } from '../../src/offer-history/entities/offer-history-event.entity';
import { OfferStatus } from '../../src/offers/enums/offer-status.enum';
import { CounterOfferStatus } from '../../src/counter-offers/enums/counter-offer-status.enum';
import {
  createOffer, createCounteredOffer, createAcceptedOffer,
} from './offer.factory';
import {
  createPendingCO, createAcceptedCO, createDeclinedCO,
  createSupersededCO, createExpiredCO,
} from './counter-offer.factory';
import { createHistoryEvent } from './offer-history.factory';
import { SEED_USERS } from '../../seeds/constants/seed-ids';

export interface ScenarioResult {
  offer: Offer;
  counterOffers: CounterOffer[];
  activeCO: CounterOffer | null;
  history: OfferHistoryEvent[];
}

type COTerminal = 'accepted' | 'declined' | 'withdrawn' | 'expired' | null;

interface COStepDef {
  party: 'CLIENT' | 'TALENT';
  rate: number;
  terminal: COTerminal;
}

export class OfferScenarioBuilder {
  private offerOverrides: Partial<Offer> = {};
  private coSteps: COStepDef[] = [];

  withOffer(overrides: Partial<Offer>): this {
    this.offerOverrides = overrides;
    return this;
  }

  withTalentCO(overrides: { rate: number; message?: string }): COStep {
    return new COStep(this, 'TALENT', overrides.rate);
  }

  withClientCO(overrides: { rate: number; message?: string }): COStep {
    return new COStep(this, 'CLIENT', overrides.rate);
  }

  /** @internal */
  _addStep(party: 'CLIENT' | 'TALENT', rate: number, terminal: COTerminal): this {
    this.coSteps.push({ party, rate, terminal });
    return this;
  }

  /** @internal — update terminal status of the last step */
  _updateLastTerminal(terminal: COTerminal): this {
    if (this.coSteps.length > 0) {
      this.coSteps[this.coSteps.length - 1].terminal = terminal;
    }
    return this;
  }

  build(): ScenarioResult {
    const offerId = this.offerOverrides.id ?? crypto.randomUUID();
    const clientId = this.offerOverrides.clientId ?? SEED_USERS.CLIENT_A;
    const talentId = this.offerOverrides.talentId ?? SEED_USERS.TALENT_X;

    const counterOffers: CounterOffer[] = [];
    const history: OfferHistoryEvent[] = [];
    let activeCO: CounterOffer | null = null;

    // Determine final offer status
    const lastStep = this.coSteps[this.coSteps.length - 1];
    let offerStatus: OfferStatus;
    if (!lastStep) {
      offerStatus = OfferStatus.PENDING;
    } else if (lastStep.terminal === 'accepted') {
      offerStatus = OfferStatus.ACCEPTED;
    } else if (lastStep.terminal === null) {
      offerStatus = OfferStatus.COUNTERED;
    } else {
      offerStatus = OfferStatus.PENDING; // Restored after CO terminal
    }

    const offer = createOffer({
      id: offerId, clientId, talentId,
      status: offerStatus,
      ...this.offerOverrides,
    });

    history.push(createHistoryEvent({
      offerId, eventType: 'offer.created', actor: 'CLIENT', actorId: clientId,
    }));

    this.coSteps.forEach((step, i) => {
      const coId = crypto.randomUUID();
      const isLast = i === this.coSteps.length - 1;
      const submitterId = step.party === 'TALENT' ? talentId : clientId;

      let co: CounterOffer;
      if (isLast && step.terminal === null) {
        co = createPendingCO({ id: coId, offerId, submittedBy: step.party, submittedById: submitterId, rate: step.rate });
        activeCO = co;
      } else if (step.terminal === 'accepted') {
        co = createAcceptedCO({ id: coId, offerId, submittedBy: step.party, submittedById: submitterId, rate: step.rate });
      } else if (step.terminal === 'declined') {
        co = createDeclinedCO({ id: coId, offerId, submittedBy: step.party, submittedById: submitterId, rate: step.rate });
      } else if (step.terminal === 'expired') {
        co = createExpiredCO(1, { id: coId, offerId, submittedBy: step.party, submittedById: submitterId, rate: step.rate });
      } else {
        co = createSupersededCO({ id: coId, offerId, submittedBy: step.party, submittedById: submitterId, rate: step.rate });
      }

      counterOffers.push(co);
      history.push(createHistoryEvent({
        offerId, counterOfferId: coId, eventType: 'offer.countered',
        actor: step.party, actorId: submitterId,
      }));
    });

    return { offer, counterOffers, activeCO, history };
  }
}

class COStep {
  constructor(
    private readonly builder: OfferScenarioBuilder,
    private readonly party: 'CLIENT' | 'TALENT',
    private readonly rate: number,
  ) {
    this.builder._addStep(party, rate, null);
  }

  accepted(): OfferScenarioBuilder { return this.builder._updateLastTerminal('accepted'); }
  declined(): OfferScenarioBuilder { return this.builder._updateLastTerminal('declined'); }
  withdrawn(): OfferScenarioBuilder { return this.builder._updateLastTerminal('withdrawn'); }
  expired(): OfferScenarioBuilder { return this.builder._updateLastTerminal('expired'); }

  // Allow chaining directly to next withTalentCO/withClientCO
  withTalentCO(overrides: { rate: number }): COStep {
    return this.builder.withTalentCO(overrides);
  }
  withClientCO(overrides: { rate: number }): COStep {
    return this.builder.withClientCO(overrides);
  }

  build(): ScenarioResult { return this.builder.build(); }
}