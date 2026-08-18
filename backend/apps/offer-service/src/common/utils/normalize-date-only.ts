// apps/offer-service/src/common/utils/normalize-date-only.ts
// pg returns `date`-typed columns (e.g. offers.start_date,
// counter_offers.start_date) as JS Date objects, not strings. The entity
// column transformer (offer.entity.ts's startDate transformer) normally
// converts this to YYYY-MM-DD, but any raw SQL path — dataSource.query()/
// em.query() with RETURNING * — bypasses that transformer entirely and
// gets the raw Date object back. Left unconverted, it serializes as a full
// ISO timestamp instead of a date-only string, breaking anything that
// expects the documented YYYY-MM-DD contract (e.g. types/offer.ts on the
// frontend, which parses startDate as date-only and produces "Invalid
// Date" otherwise — the exact failure this was written to fix).
export const normalizeDateOnly = (value: Date | string): string =>
  value instanceof Date ? value.toISOString().split('T')[0] : value;
