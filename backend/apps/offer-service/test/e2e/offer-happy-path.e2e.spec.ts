// apps/offer-service/test/e2e/offer-happy-path.e2e.spec.ts
// OS-32 Flow 1: Create → accept. Create → decline. Create → withdraw.
import * as request from 'supertest';
import {
  bootstrapE2E, createTestOffer, cleanupTestData,
  app, httpServer, clientAToken, talentXToken,
} from './e2e.setup';

describe('E2E: Offer Happy Path', () => {
  beforeAll(() => bootstrapE2E());
  beforeEach(() => cleanupTestData());
  afterAll(() => app?.close());

  // Scenario 1: CREATE -> ACCEPT
  it('Scenario 1: Client creates offer, talent accepts it', async () => {
    const offer = await createTestOffer();
    expect(offer.status).toBe('PENDING');
    expect(offer.id).toBeDefined();
    expect(offer.expiresAt).toBeDefined();

    // TALENT accepts
    const acceptRes = await request(httpServer)
      .post(`/v1/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${talentXToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('ACCEPTED');
    expect(acceptRes.body.acceptedAt).toBeDefined();

    // Accept again → 409
    const replayRes = await request(httpServer)
      .post(`/v1/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${talentXToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});
    expect(replayRes.status).toBe(409);
  });

  // Scenario 2: CREATE -> DECLINE
  it('Scenario 2: Client creates offer, talent declines with reason', async () => {
    const offer = await createTestOffer();

    const declineRes = await request(httpServer)
      .post(`/v1/offers/${offer.id}/decline`)
      .set('Authorization', `Bearer ${talentXToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({ reason: 'Budget does not align.', chip: 'BUDGET_DOESNT_WORK' });
    expect(declineRes.status).toBe(200);
    expect(declineRes.body.status).toBe('DECLINED');
    expect(declineRes.body.declinedAt).toBeDefined();
  });

  // Scenario 3: CREATE -> WITHDRAW
  it('Scenario 3: Client withdraws a pending offer', async () => {
    const offer = await createTestOffer();

    const withdrawRes = await request(httpServer)
      .post(`/v1/offers/${offer.id}/withdraw`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({ message: 'Pausing this hire.' });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.status).toBe('WITHDRAWN');
  });

  // Scenario 4: ROLE guard — client cannot accept their own offer
  it('Scenario 4: CLIENT cannot accept their own offer (403)', async () => {
    const offer = await createTestOffer();

    const res = await request(httpServer)
      .post(`/v1/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .set('X-Idempotency-Key', crypto.randomUUID())
      .send({});
    expect(res.status).toBe(403);
  });
});