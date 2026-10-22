// apps/offer-service/src/offers/offer-state-machine.ts
// OS-25: Pure logic module — transition maps + guard conditions.
// No database access, no NestJS decorators. Import in services before any state change.
import { ForbiddenException } from '@nestjs/common';
import { OfferStatus } from './enums/offer-status.enum';
import { CounterOfferStatus } from '../counter-offers/enums/counter-offer-status.enum';
import { OfferServiceException } from '../common/exceptions/offer.exceptions';
import { HttpStatus } from '@nestjs/common';

// ============================================================
// Valid transition maps
// ============================================================

/**
 * OFFER_TRANSITIONS
 * Maps each source status to valid target statuses.
 * Terminal states have no entries.
 *
 * PENDING -> COUNTERED is NOT here — it is triggered implicitly
 * by counter offer creation in CounterOffersService.create().
 */
export const OFFER_TRANSITIONS: Partial<Record<OfferStatus, OfferStatus[]>> = {
  [OfferStatus.PENDING]: [
    OfferStatus.ACCEPTED,
    OfferStatus.DECLINED,
    OfferStatus.WITHDRAWN,
    OfferStatus.EXPIRED,
  ],
  [OfferStatus.COUNTERED]: [
    OfferStatus.PENDING,   // Restored when CO is declined/withdrawn/expired
    OfferStatus.ACCEPTED,  // When CO is accepted
    OfferStatus.WITHDRAWN, // Client can withdraw even when COUNTERED
  ],
};

/**
 * COUNTER_OFFER_TRANSITIONS
 */
export const COUNTER_OFFER_TRANSITIONS: Partial<Record<CounterOfferStatus, CounterOfferStatus[]>> = {
  [CounterOfferStatus.PENDING]: [
    CounterOfferStatus.ACCEPTED,
    CounterOfferStatus.DECLINED,
    CounterOfferStatus.WITHDRAWN,
    CounterOfferStatus.EXPIRED,
    CounterOfferStatus.SUPERSEDED,
  ],
};

// ============================================================
// OfferStateMachine
// ============================================================

export class OfferStateMachine {
  /**
   * Assert that a primary offer transition is valid.
   * Throws 409 if the transition is not allowed.
   */
  static assertCanTransition(from: OfferStatus, to: OfferStatus): void {
    const allowed = OFFER_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidOfferTransitionException('offer', from, to);
    }
  }

  /**
   * Assert that a counter offer transition is valid.
   */
  static assertCanTransitionCO(
    from: CounterOfferStatus,
    to: CounterOfferStatus,
  ): void {
    const allowed = COUNTER_OFFER_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidOfferTransitionException('counterOffer', from, to);
    }
  }

  // ============================================================
  // Guard conditions
  // ============================================================

  /** Assert the requester is the TALENT on this offer. */
  static assertIsTalent(offer: { talentId: string }, requesterId: string): void {
    if (offer.talentId !== requesterId) {
      throw new ForbiddenException('Only the talent on this offer can perform this action.');
    }
  }

  /** Assert the requester is the CLIENT on this offer. */
  static assertIsClient(offer: { clientId: string }, requesterId: string): void {
    if (offer.clientId !== requesterId) {
      throw new ForbiddenException('Only the client on this offer can perform this action.');
    }
  }

  /** Assert the requester is either the client OR talent. */
  static assertIsParty(
    offer: { clientId: string; talentId: string },
    requesterId: string,
  ): void {
    if (offer.clientId !== requesterId && offer.talentId !== requesterId) {
      throw new ForbiddenException('You are not a party to this offer.');
    }
  }

  /**
   * Assert the requester is the NON-SUBMITTER of a counter offer.
   * Non-submitter can accept or decline.
   */
  static assertIsNonSubmitter(
    co: { submittedBy: string; submittedById: string },
    offer: { clientId: string; talentId: string },
    requesterId: string,
  ): void {
    const nonSubmitterId = co.submittedBy === 'TALENT'
      ? offer.clientId
      : offer.talentId;
    if (nonSubmitterId !== requesterId) {
      throw new ForbiddenException(
        'Only the party who received this counter offer can accept or decline it.',
      );
    }
  }

  /** Assert the requester is the SUBMITTER of a counter offer. */
  static assertIsSubmitter(
    co: { submittedById: string },
    requesterId: string,
  ): void {
    if (co.submittedById !== requesterId) {
      throw new ForbiddenException(
        'Only the party who submitted this counter offer can withdraw or edit it.',
      );
    }
  }

  /**
   * Assert no active (PENDING) counter offer blocks this offer action.
   * When COUNTERED, talent must act on the CO first (cannot accept/decline the offer).
   * Client CAN still withdraw the offer even when COUNTERED.
   */
  static assertNotBlockedByCO(
    offer: { status: OfferStatus },
    action: 'accept' | 'decline',
  ): void {
    if (offer.status === OfferStatus.COUNTERED) {
      throw new ForbiddenException(
        `Cannot ${action} an offer with an active counter offer. ` +
        'Withdraw the counter offer first.',
      );
    }
  }

  /**
   * Compute the rate warning flag for a counter offer.
   * Talent CO: warn if coRate > parentRate * 1.25
   * Client CO: warn if coRate < parentRate * 0.80
   */
  static computeRateWarning(
    parentRate: number,
    coRate: number,
    submittedBy: 'CLIENT' | 'TALENT',
  ): boolean {
    if (submittedBy === 'TALENT') {
      return coRate > parentRate * 1.25;
    } else {
      return coRate < parentRate * 0.80;
    }
  }
}

// ============================================================
// Custom exception for invalid transitions — HTTP 409 Conflict
// ============================================================

export class InvalidOfferTransitionException extends OfferServiceException {
  constructor(
    type: 'offer' | 'counterOffer',
    from: string,
    to: string,
  ) {
    const errorCode = type === 'offer'
      ? 'OFFER_INVALID_TRANSITION'
      : 'COUNTER_OFFER_INVALID_TRANSITION';
    super(
      errorCode,
      `Cannot transition ${type} from ${from} to ${to}.`,
      HttpStatus.CONFLICT,
    );
  }
}

// ============================================================
// CAS failure exception — HTTP 409 Conflict
// ============================================================

export class OfferConcurrentModificationException extends OfferServiceException {
  // `id` is kept as a constructor param (for any future server-side
  // logging) but intentionally left out of the user-facing message below —
  // callers pass either an offer id or a counter-offer id depending on
  // which row's CAS update affected 0 rows (see counter-offers.service.ts/
  // offers.service.ts), so a message naming it "Offer {id}" was wrong for
  // every counter-offer call site, and a raw internal id in front of a
  // real user is not a safe message regardless of which entity it is.
  constructor(id: string) {
    super(
      'OFFER_CONCURRENT_MODIFICATION',
      'This was just updated elsewhere. Please reload and try again.',
      HttpStatus.CONFLICT,
    );
  }
}