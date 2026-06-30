// apps/offer-service/test/offer-state-machine.spec.ts
// OS-27: Rate warning threshold unit tests
import { OfferStateMachine } from '../src/offers/offer-state-machine';

describe('OfferStateMachine.computeRateWarning()', () => {
  describe('Talent counter offers', () => {
    it('returns true when coRate > parentRate * 1.25', () => {
      expect(OfferStateMachine.computeRateWarning(100, 126, 'TALENT')).toBe(true);
    });

    it('returns false when coRate = parentRate * 1.25 exactly (strict >)', () => {
      expect(OfferStateMachine.computeRateWarning(100, 125, 'TALENT')).toBe(false);
    });

    it('returns false when coRate < parentRate * 1.25', () => {
      expect(OfferStateMachine.computeRateWarning(100, 124, 'TALENT')).toBe(false);
    });

    it('handles non-integer threshold (95 * 1.25 = 118.75)', () => {
      expect(OfferStateMachine.computeRateWarning(95, 119, 'TALENT')).toBe(true);
      expect(OfferStateMachine.computeRateWarning(95, 118, 'TALENT')).toBe(false);
    });

    it('returns false when talent rate is below offer (conceding)', () => {
      expect(OfferStateMachine.computeRateWarning(100, 80, 'TALENT')).toBe(false);
    });

    it('warns for real-world scenario: $90 offer, $120 CO', () => {
      expect(OfferStateMachine.computeRateWarning(90, 120, 'TALENT')).toBe(true);
      // 120 > 90 * 1.25 = 112.5 → true
    });

    it('no warn for borderline: $90 offer, $112 CO', () => {
      expect(OfferStateMachine.computeRateWarning(90, 112, 'TALENT')).toBe(false);
      // 112 < 112.5 → false
    });
  });

  describe('Client counter offers', () => {
    it('returns true when coRate < parentRate * 0.80', () => {
      expect(OfferStateMachine.computeRateWarning(100, 79, 'CLIENT')).toBe(true);
    });

    it('returns false when coRate = parentRate * 0.80 exactly (strict <)', () => {
      expect(OfferStateMachine.computeRateWarning(100, 80, 'CLIENT')).toBe(false);
    });

    it('returns false when coRate > parentRate * 0.80', () => {
      expect(OfferStateMachine.computeRateWarning(100, 81, 'CLIENT')).toBe(false);
    });

    it('handles non-integer threshold (95 * 0.80 = 76.0)', () => {
      expect(OfferStateMachine.computeRateWarning(95, 75, 'CLIENT')).toBe(true);
      expect(OfferStateMachine.computeRateWarning(95, 76, 'CLIENT')).toBe(false);
    });

    it('returns false when client rate is above offer (increasing)', () => {
      expect(OfferStateMachine.computeRateWarning(100, 110, 'CLIENT')).toBe(false);
    });
  });
});