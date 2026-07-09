// apps/offer-service/test/e2e/error-cases.e2e.spec.ts
// OS-32 Flow 7: Auth errors, role errors, 409 CAS, 422 validation
import * as request from 'supertest';
import {
  bootstrapE2E, createTestOffer, cleanupTestData,
  app, httpServer, clientAToken, talentYToken,
  SEED_USERS, SEED_LISTINGS,
} from './e2e.setup';

describe('E2E: Error Cases', () => {
  beforeAll(() => bootstrapE2E());
  beforeEach(() => cleanupTestData());
  afterAll(() => app?.close());

  it('401 when no auth token provided', async () => {
    const res = await request(httpServer).get('/v1/offers/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('403 when unrelated user tries to access an offer', async () => {
    const offer = await createTestOffer();
    const res = await request(httpServer)
      .get(`/v1/offers/${offer.id}`)
      .set('Authorization', `Bearer ${talentYToken}`);
    expect(res.status).toBe(403);
  });

  it('409 active offer constraint blocks second offer to same talent', async () => {
    await createTestOffer();
    const res = await request(httpServer)
      .post('/v1/offers')
      .set('Authorization', `Bearer ${clientAToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({
        talentId: SEED_USERS.TALENT_X,
        jobListingId: SEED_LISTINGS.PROJECT_ALPHA,
        contractType: 'SERVICE',
        contractTitle: 'Second Attempt',
        rate: 100,
        currencyCode: 'USD',
        durationMonths: 3,
        workSchedule: { type: 'FULL_TIME' },
        startDate: '2027-06-01',
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ACTIVE_OFFER_ALREADY_EXISTS');
  });
});