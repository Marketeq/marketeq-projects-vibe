// apps/offer-service/src/offers/normalize-date-only.spec.ts
// Regression guard for the start_date-as-Date-object bug: pg returns
// `date` columns as JS Date objects, and the raw-SQL mapping paths
// (mapRawToOffer in offers.service.ts and counter-offers.service.ts,
// mapRawToCO in counter-offers.service.ts, fetchLatestCounterOffers in
// offers.service.ts) all delegate to this one helper now instead of each
// carrying their own copy of the normalization — so testing the helper
// directly is testing all four call sites at once. Style matches
// offer-list-query.builder.spec.ts: pure function, no mocking.
import { normalizeDateOnly } from '../common/utils/normalize-date-only';

describe('normalizeDateOnly', () => {
  it('converts a JS Date to a YYYY-MM-DD string', () => {
    const date = new Date('2026-09-16T07:00:00.000Z');
    expect(normalizeDateOnly(date)).toBe('2026-09-16');
  });

  it('is stable regardless of the time-of-day component', () => {
    const midnight = new Date('2026-01-05T00:00:00.000Z');
    const almostMidnight = new Date('2026-01-05T23:59:59.999Z');
    expect(normalizeDateOnly(midnight)).toBe('2026-01-05');
    expect(normalizeDateOnly(almostMidnight)).toBe('2026-01-05');
  });

  it('passes an already-normalized string straight through', () => {
    expect(normalizeDateOnly('2026-09-16')).toBe('2026-09-16');
  });

  it('does not mistake a string for needing conversion', () => {
    // A plain string is not `instanceof Date` even if it looks like an
    // ISO timestamp — must be returned as-is, not re-parsed.
    expect(normalizeDateOnly('2026-09-16T07:00:00.000Z')).toBe(
      '2026-09-16T07:00:00.000Z',
    );
  });
});
