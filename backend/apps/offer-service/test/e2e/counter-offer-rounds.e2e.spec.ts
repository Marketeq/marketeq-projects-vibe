// apps/offer-service/test/e2e/counter-offer-rounds.e2e.spec.ts
// OS-32 Flow 2: CO rounds, rate warnings, COUNTERED blocking, CO withdrawal restore
import * as request from 'supertest';
import {
  bootstrapE2E, createTestOffer, createTestCO, cleanupTestData,
  app, httpServer, clientAToken, talentXToken,
} from './e2e.setup';

describe('E2E: Counter Offer Rounds', () => {
  beforeAll(() => bootstrapE2E());
  beforeEach(() => cleanupTestData());
  afterAll(() => app?.close());

  // Scenario 1: 1-round CO, talent submits, client accepts
  it('Scenario 1: Talent counter offer accepted by client', async () => {
    const offer = await createTestOffer({ rate: 90 });

    const { counterOffer, rateWarning } = await createTestCO(offer.id, 100);
    expect(counterOffer.status).toBe('PENDING');
    expect(rateWarning).toBe(false); // 100 < 90*1.25=112.5

    // Client accepts the CO
    const acceptRes = await request(httpServer)
      .post(`/v1/offers/${offer.id}/counter-offers/${counterOffer.id}/accept`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('ACCEPTED');
  });

  // Scenario 2: Rate warning — talent asks >25% above offer rate
  it('Scenario 2: rateWarning=true when talent exceeds 25% threshold', async () => {
    const offer = await createTestOffer({ rate: 100 });

    // 126 > 100 * 1.25 = 125: triggers warning
    const { rateWarning } = await createTestCO(offer.id, 126);
    expect(rateWarning).toBe(true);
  });

  // Scenario 3: Talent cannot accept original offer while CO is PENDING
  it('Scenario 3: Accept blocked when offer is COUNTERED', async () => {
    const offer = await createTestOffer({ rate: 90 });
    await createTestCO(offer.id, 100);

    const res = await request(httpServer)
      .post(`/v1/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${talentXToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});
    expect(res.status).toBe(403);
  });

  // Scenario 4: CO withdraw restores parent to PENDING
  it('Scenario 4: CO withdrawal restores parent to PENDING', async () => {
    const offer = await createTestOffer({ rate: 90 });
    const { counterOffer } = await createTestCO(offer.id, 100);

    await request(httpServer)
      .post(`/v1/offers/${offer.id}/counter-offers/${counterOffer.id}/withdraw`)
      .set('Authorization', `Bearer ${talentXToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});

    const res = await request(httpServer)
      .get(`/v1/offers/${offer.id}`)
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(res.body.status).toBe('PENDING');
  });
});