// apps/offer-service/src/common/utils/derive-idempotency-key.spec.ts
import { deriveIdempotencyKey } from './derive-idempotency-key';

describe('deriveIdempotencyKey', () => {
  const base = {
    userId: 'U1',
    method: 'POST',
    routePath: '/offers/:id/accept',
    offerId: 'O1',
    body: {},
  };

  it('is stable across identical requests', () => {
    const a = deriveIdempotencyKey({ ...base });
    const b = deriveIdempotencyKey({ ...base });
    expect(a).toBe(b);
  });

  it('is stable regardless of body key order', () => {
    const a = deriveIdempotencyKey({ ...base, body: { reason: 'no', chip: 'BUDGET' } });
    const b = deriveIdempotencyKey({ ...base, body: { chip: 'BUDGET', reason: 'no' } });
    expect(a).toBe(b);
  });

  it('differs when the user differs', () => {
    const a = deriveIdempotencyKey({ ...base, userId: 'U1' });
    const b = deriveIdempotencyKey({ ...base, userId: 'U2' });
    expect(a).not.toBe(b);
  });

  it('differs when the offer differs', () => {
    const a = deriveIdempotencyKey({ ...base, offerId: 'O1' });
    const b = deriveIdempotencyKey({ ...base, offerId: 'O2' });
    expect(a).not.toBe(b);
  });

  it('differs when the action (method + route) differs', () => {
    const a = deriveIdempotencyKey({ ...base, routePath: '/offers/:id/accept' });
    const b = deriveIdempotencyKey({ ...base, routePath: '/offers/:id/decline' });
    expect(a).not.toBe(b);
  });

  it('differs when the body differs', () => {
    const a = deriveIdempotencyKey({ ...base, body: { reason: 'Budget doesn’t work' } });
    const b = deriveIdempotencyKey({ ...base, body: { reason: 'Too busy right now' } });
    expect(a).not.toBe(b);
  });

  it('falls back to routePath when there is no offer in scope (e.g. createOffer)', () => {
    const withNoOffer = deriveIdempotencyKey({
      userId: 'U1',
      method: 'POST',
      routePath: '/offers',
      body: { talentId: 'T1' },
    });
    const withOfferIdUndefined = deriveIdempotencyKey({
      userId: 'U1',
      method: 'POST',
      routePath: '/offers',
      offerId: undefined,
      body: { talentId: 'T1' },
    });
    expect(withNoOffer).toBe(withOfferIdUndefined);
  });

  it('produces a hex string, not a UUID (never mistaken for a client-supplied key)', () => {
    const key = deriveIdempotencyKey(base);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
