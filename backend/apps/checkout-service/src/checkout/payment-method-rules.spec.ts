import { resolvePaymentMethods } from './payment-method-rules';

const availability = (amountDueCents: number) =>
  Object.fromEntries(
    resolvePaymentMethods(amountDueCents).methods.map((method) => [
      method.id,
      method.available,
    ]),
  );

describe('payment-method-rules', () => {
  describe('resolvePaymentMethods', () => {
    it('returns the six methods in order', () => {
      expect(
        resolvePaymentMethods(500_000).methods.map((method) => method.id),
      ).toEqual(['card', 'ach', 'wire', 'google_pay', 'apple_pay', 'klarna']);
    });

    it('makes every method available for a normal amount', () => {
      const result = resolvePaymentMethods(500_000);
      expect(result.noPaymentNeeded).toBe(false);
      expect(result.methods.every((method) => method.available)).toBe(true);
      expect(result.methods.every((method) => method.reason === null)).toBe(
        true,
      );
    });

    it('returns no methods and flags noPaymentNeeded at zero', () => {
      expect(resolvePaymentMethods(0)).toEqual({
        noPaymentNeeded: true,
        methods: [],
      });
    });

    it('treats a negative amount like zero', () => {
      expect(resolvePaymentMethods(-100).noPaymentNeeded).toBe(true);
    });

    it('hides Klarna below $1.00', () => {
      expect(availability(99).klarna).toBe(false);
    });

    it('allows Klarna at exactly $1.00', () => {
      expect(availability(100).klarna).toBe(true);
    });

    it('allows Klarna at exactly $10,000.00', () => {
      expect(availability(1_000_000).klarna).toBe(true);
    });

    it('hides Klarna above $10,000.00', () => {
      expect(availability(1_000_001).klarna).toBe(false);
    });

    it('gives a reason when Klarna is unavailable', () => {
      const klarna = resolvePaymentMethods(1_000_001).methods.find(
        (method) => method.id === 'klarna',
      );
      expect(klarna?.reason).toBe('Klarna is not available for this amount');
    });

    it('keeps the other methods available when Klarna is not', () => {
      expect(availability(1_000_001)).toEqual({
        card: true,
        ach: true,
        wire: true,
        google_pay: true,
        apple_pay: true,
        klarna: false,
      });
    });

    it('asks the browser to check Google Pay and Apple Pay only', () => {
      const checks = Object.fromEntries(
        resolvePaymentMethods(500_000).methods.map((method) => [
          method.id,
          method.browserCheck,
        ]),
      );
      expect(checks).toEqual({
        card: null,
        ach: null,
        wire: null,
        google_pay: 'google_pay',
        apple_pay: 'apple_pay',
        klarna: null,
      });
    });

    it('returns the fee labels and processing times', () => {
      const byId = Object.fromEntries(
        resolvePaymentMethods(500_000).methods.map((method) => [
          method.id,
          method,
        ]),
      );
      expect(byId.card.feeLabel).toBe('2.9% + $0.30 per transaction');
      expect(byId.ach.feeLabel).toBe('0.8% per transaction');
      expect(byId.ach.processingTime).toBe('Up to 4 business days');
      expect(byId.wire.processingTime).toBe('1 to 5 business days');
      expect(byId.klarna.feeLabel).toBe(
        'starting at 5.99% + $0.30 per transaction',
      );
      expect(byId.card.processingTime).toBeNull();
    });
  });
});
