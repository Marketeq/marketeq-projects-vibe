// apps/offer-service/src/offers/offer-state-machine.spec.ts
// OS-31: 100% coverage on state machine — transitions, guards, rate warning
import { OfferStateMachine, InvalidOfferTransitionException } from './offer-state-machine';
import { OfferStatus } from './enums/offer-status.enum';
import { CounterOfferStatus } from '../counter-offers/enums/counter-offer-status.enum';
import { ForbiddenException } from '@nestjs/common';

describe('OfferStateMachine', () => {
  // ===========================================================
  // assertCanTransition (offer)
  // ===========================================================
  describe('assertCanTransition (offer)', () => {
    it.each([
      [OfferStatus.PENDING, OfferStatus.ACCEPTED],
      [OfferStatus.PENDING, OfferStatus.DECLINED],
      [OfferStatus.PENDING, OfferStatus.WITHDRAWN],
      [OfferStatus.PENDING, OfferStatus.EXPIRED],
      [OfferStatus.COUNTERED, OfferStatus.PENDING],
      [OfferStatus.COUNTERED, OfferStatus.ACCEPTED],
      [OfferStatus.COUNTERED, OfferStatus.WITHDRAWN],
    ])('allows %s -> %s', (from, to) => {
      expect(() => OfferStateMachine.assertCanTransition(from, to)).not.toThrow();
    });

    it.each([
      [OfferStatus.ACCEPTED, OfferStatus.DECLINED],
      [OfferStatus.ACCEPTED, OfferStatus.PENDING],
      [OfferStatus.DECLINED, OfferStatus.PENDING],
      [OfferStatus.DECLINED, OfferStatus.ACCEPTED],
      [OfferStatus.WITHDRAWN, OfferStatus.PENDING],
      [OfferStatus.EXPIRED, OfferStatus.PENDING],
      [OfferStatus.PENDING, OfferStatus.PENDING],
    ])('blocks %s -> %s', (from, to) => {
      expect(() => OfferStateMachine.assertCanTransition(from, to))
        .toThrow(InvalidOfferTransitionException);
    });
  });

  // ===========================================================
  // assertCanTransitionCO (counter offer)
  // ===========================================================
  describe('assertCanTransitionCO (counter offer)', () => {
    it.each([
      [CounterOfferStatus.PENDING, CounterOfferStatus.ACCEPTED],
      [CounterOfferStatus.PENDING, CounterOfferStatus.DECLINED],
      [CounterOfferStatus.PENDING, CounterOfferStatus.WITHDRAWN],
      [CounterOfferStatus.PENDING, CounterOfferStatus.EXPIRED],
      [CounterOfferStatus.PENDING, CounterOfferStatus.SUPERSEDED],
    ])('allows %s -> %s', (from, to) => {
      expect(() => OfferStateMachine.assertCanTransitionCO(from, to)).not.toThrow();
    });

    it.each([
      [CounterOfferStatus.ACCEPTED, CounterOfferStatus.PENDING],
      [CounterOfferStatus.DECLINED, CounterOfferStatus.PENDING],
      [CounterOfferStatus.WITHDRAWN, CounterOfferStatus.PENDING],
      [CounterOfferStatus.EXPIRED, CounterOfferStatus.PENDING],
      [CounterOfferStatus.SUPERSEDED, CounterOfferStatus.PENDING],
    ])('blocks %s -> %s (terminal)', (from, to) => {
      expect(() => OfferStateMachine.assertCanTransitionCO(from, to))
        .toThrow(InvalidOfferTransitionException);
    });
  });

  // ===========================================================
  // Role guards
  // ===========================================================
  describe('assertIsTalent', () => {
    it('passes when requesterId matches talentId', () => {
      expect(() => OfferStateMachine.assertIsTalent({ talentId: 'T1' }, 'T1')).not.toThrow();
    });
    it('throws ForbiddenException when mismatch', () => {
      expect(() => OfferStateMachine.assertIsTalent({ talentId: 'T1' }, 'C1'))
        .toThrow(ForbiddenException);
    });
  });

  describe('assertIsClient', () => {
    it('passes when requesterId matches clientId', () => {
      expect(() => OfferStateMachine.assertIsClient({ clientId: 'C1' }, 'C1')).not.toThrow();
    });
    it('throws ForbiddenException when mismatch', () => {
      expect(() => OfferStateMachine.assertIsClient({ clientId: 'C1' }, 'T1'))
        .toThrow(ForbiddenException);
    });
  });

  describe('assertIsParty', () => {
    const offer = { clientId: 'C1', talentId: 'T1' };
    it('passes for client', () => {
      expect(() => OfferStateMachine.assertIsParty(offer, 'C1')).not.toThrow();
    });
    it('passes for talent', () => {
      expect(() => OfferStateMachine.assertIsParty(offer, 'T1')).not.toThrow();
    });
    it('throws for non-party', () => {
      expect(() => OfferStateMachine.assertIsParty(offer, 'X9'))
        .toThrow(ForbiddenException);
    });
  });

  describe('assertIsNonSubmitter', () => {
    const offer = { clientId: 'C1', talentId: 'T1' };

    it('talent can act on client CO', () => {
      const co = { submittedBy: 'CLIENT', submittedById: 'C1' };
      expect(() => OfferStateMachine.assertIsNonSubmitter(co, offer, 'T1')).not.toThrow();
    });
    it('client can act on talent CO', () => {
      const co = { submittedBy: 'TALENT', submittedById: 'T1' };
      expect(() => OfferStateMachine.assertIsNonSubmitter(co, offer, 'C1')).not.toThrow();
    });
    it('submitter cannot act on their own CO', () => {
      const co = { submittedBy: 'TALENT', submittedById: 'T1' };
      expect(() => OfferStateMachine.assertIsNonSubmitter(co, offer, 'T1'))
        .toThrow(ForbiddenException);
    });
  });

  describe('assertIsSubmitter', () => {
    it('passes when requesterId matches submittedById', () => {
      expect(() => OfferStateMachine.assertIsSubmitter({ submittedById: 'T1' }, 'T1')).not.toThrow();
    });
    it('throws when mismatch', () => {
      expect(() => OfferStateMachine.assertIsSubmitter({ submittedById: 'T1' }, 'C1'))
        .toThrow(ForbiddenException);
    });
  });

  // ===========================================================
  // assertNotBlockedByCO
  // ===========================================================
  describe('assertNotBlockedByCO', () => {
    it('passes when offer is PENDING', () => {
      expect(() => OfferStateMachine.assertNotBlockedByCO(
        { status: OfferStatus.PENDING }, 'accept',
      )).not.toThrow();
    });
    it('throws when offer is COUNTERED', () => {
      expect(() => OfferStateMachine.assertNotBlockedByCO(
        { status: OfferStatus.COUNTERED }, 'accept',
      )).toThrow(ForbiddenException);
    });
    it('blocks decline on COUNTERED', () => {
      expect(() => OfferStateMachine.assertNotBlockedByCO(
        { status: OfferStatus.COUNTERED }, 'decline',
      )).toThrow(ForbiddenException);
    });
  });

  // ===========================================================
  // computeRateWarning (full edge cases)
  // ===========================================================
  describe('computeRateWarning', () => {
    describe('TALENT submits', () => {
      it('warns when rate > parentRate * 1.25', () => {
        expect(OfferStateMachine.computeRateWarning(100, 126, 'TALENT')).toBe(true);
      });
      it('no warn at exactly 125 (strict >)', () => {
        expect(OfferStateMachine.computeRateWarning(100, 125, 'TALENT')).toBe(false);
      });
      it('no warn below 125', () => {
        expect(OfferStateMachine.computeRateWarning(100, 124, 'TALENT')).toBe(false);
      });
      it('handles non-integer threshold (95 * 1.25 = 118.75)', () => {
        expect(OfferStateMachine.computeRateWarning(95, 119, 'TALENT')).toBe(true);
        expect(OfferStateMachine.computeRateWarning(95, 118, 'TALENT')).toBe(false);
      });
      it('no warn when talent concedes', () => {
        expect(OfferStateMachine.computeRateWarning(100, 80, 'TALENT')).toBe(false);
      });
      it('real-world: $90 offer, $120 CO', () => {
        expect(OfferStateMachine.computeRateWarning(90, 120, 'TALENT')).toBe(true);
      });
    });

    describe('CLIENT submits', () => {
      it('warns when rate < parentRate * 0.80', () => {
        expect(OfferStateMachine.computeRateWarning(100, 79, 'CLIENT')).toBe(true);
      });
      it('no warn at exactly 80 (strict <)', () => {
        expect(OfferStateMachine.computeRateWarning(100, 80, 'CLIENT')).toBe(false);
      });
      it('no warn above 80', () => {
        expect(OfferStateMachine.computeRateWarning(100, 81, 'CLIENT')).toBe(false);
      });
      it('handles non-integer threshold (95 * 0.80 = 76.0)', () => {
        expect(OfferStateMachine.computeRateWarning(95, 75, 'CLIENT')).toBe(true);
        expect(OfferStateMachine.computeRateWarning(95, 76, 'CLIENT')).toBe(false);
      });
      it('no warn when client increases', () => {
        expect(OfferStateMachine.computeRateWarning(100, 110, 'CLIENT')).toBe(false);
      });
    });
  });
});