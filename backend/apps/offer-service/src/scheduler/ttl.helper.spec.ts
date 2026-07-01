// apps/offer-service/src/scheduler/ttl.helper.spec.ts
// OS-31: 100% coverage on TTL helper functions
import {
  calculateExpiresAt,
  getWarningThreshold,
  isWithinExtensionWindow,
  hoursUntilExpiry,
  OFFER_TTL_DAYS,
  EXPIRY_WARNING_HOURS,
  EXTENSION_THRESHOLD_DAYS,
} from './ttl.helper';

describe('TTL Helpers', () => {
  describe('calculateExpiresAt', () => {
    it('returns a date 14 days from now', () => {
      const before = new Date();
      const result = calculateExpiresAt();
      const after = new Date();

      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + OFFER_TTL_DAYS);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + OFFER_TTL_DAYS);

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe('getWarningThreshold', () => {
    it('returns a date 48 hours from now', () => {
      const before = new Date();
      const result = getWarningThreshold();

      const expectedMin = new Date(before);
      expectedMin.setHours(expectedMin.getHours() + EXPIRY_WARNING_HOURS);

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      // Allow 1 second tolerance
      expect(result.getTime()).toBeLessThanOrEqual(expectedMin.getTime() + 1000);
    });
  });

  describe('isWithinExtensionWindow', () => {
    it('returns true when expired less than 30 days ago', () => {
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() - 15); // 15 days ago
      expect(isWithinExtensionWindow(expiredAt)).toBe(true);
    });

    it('returns true at exactly 30 days', () => {
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() - EXTENSION_THRESHOLD_DAYS);
      expect(isWithinExtensionWindow(expiredAt)).toBe(true);
    });

    it('returns false when expired more than 30 days ago', () => {
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() - 31);
      expect(isWithinExtensionWindow(expiredAt)).toBe(false);
    });

    it('returns true for just-expired offers', () => {
      const expiredAt = new Date();
      expect(isWithinExtensionWindow(expiredAt)).toBe(true);
    });
  });

  describe('hoursUntilExpiry', () => {
    it('returns approximate hours for future date', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);
      const result = hoursUntilExpiry(expiresAt);
      expect(result).toBeGreaterThanOrEqual(47);
      expect(result).toBeLessThanOrEqual(48);
    });

    it('returns 0 for past dates', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 5);
      expect(hoursUntilExpiry(expiresAt)).toBe(0);
    });

    it('returns 0 for now', () => {
      expect(hoursUntilExpiry(new Date())).toBe(0);
    });
  });
});