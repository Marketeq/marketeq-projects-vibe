// apps/offer-service/test/e2e/e2e.setup.ts
// OS-32: E2E test bootstrap — app, JWT helpers, per-test cleanup.
// All E2E test files import from this file.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { AblyService } from '../../src/realtime/ably.service';
import { OfferExceptionFilter } from '../../src/filters/offer-exception.filter';
import { createMockAblyService } from '../mocks/ably.mock';

// Seed user UUIDs (match OS-18 seed constants)
export const SEED_USERS = {
  CLIENT_A: '10000000-0000-4000-a000-000000000001',
  TALENT_X: '20000000-0000-4000-a000-000000000001',
  TALENT_Y: '20000000-0000-4000-a000-000000000002',
};
export const SEED_LISTINGS = {
  PROJECT_ALPHA: '30000000-0000-4000-a000-000000000001',
  SERVICE_BETA: '30000000-0000-4000-a000-000000000002',
};

// ============================================================
// Shared test state
// ============================================================
export let app: INestApplication;
export let httpServer: any;
export let clientAToken: string;
export let talentXToken: string;
export let talentYToken: string;
export let mockAbly: ReturnType<typeof createMockAblyService>;

/**
 * cleanupTestData()
 *
 * Deletes all test data from the offer_service schema.
 * Called before each E2E suite to start with a clean slate.
 */
export async function cleanupTestData(): Promise<void> {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM offer_service.offer_history');
  await client.query('DELETE FROM offer_service.outbox');
  await client.query('DELETE FROM offer_service.counter_offers');
  await client.query('DELETE FROM offer_service.offers');
  await client.end();
}

/**
 * bootstrapE2E()
 *
 * Call in beforeAll() of every E2E test suite.
 * Sets up the NestJS app with mocked Ably and RabbitMQ.
 */
export async function bootstrapE2E(): Promise<void> {
  await cleanupTestData();
  mockAbly = createMockAblyService();

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AblyService)
    .useValue(mockAbly)
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new OfferExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  httpServer = app.getHttpServer();

  // Generate JWT tokens using the project's private key (RS256)
  const privateKeyPath = path.join(process.cwd(), 'private.pem');
  let signOpts: any;
  let signingKey: string;

  if (fs.existsSync(privateKeyPath)) {
    signingKey = fs.readFileSync(privateKeyPath, 'utf8');
    signOpts = { algorithm: 'RS256' as const, expiresIn: '24h' };
  } else {
    // Fallback to HS256 with JWT_SECRET for environments without private.pem
    signingKey = process.env.JWT_SECRET || 'asdasdasd';
    signOpts = { expiresIn: '24h' };
  }

  clientAToken = jwt.sign(
    { sub: SEED_USERS.CLIENT_A, id: SEED_USERS.CLIENT_A, role: 'CLIENT', email: 'client@test.com' },
    signingKey,
    signOpts,
  );
  talentXToken = jwt.sign(
    { sub: SEED_USERS.TALENT_X, id: SEED_USERS.TALENT_X, role: 'TALENT', email: 'talentx@test.com' },
    signingKey,
    signOpts,
  );
  talentYToken = jwt.sign(
    { sub: SEED_USERS.TALENT_Y, id: SEED_USERS.TALENT_Y, role: 'TALENT', email: 'talenty@test.com' },
    signingKey,
    signOpts,
  );
}

// ============================================================
// Shared request helpers
// ============================================================

/** Create an offer as CLIENT_A to TALENT_X. Returns the created offer. */
export async function createTestOffer(overrides: Record<string, unknown> = {}) {
  const res = await request(httpServer)
    .post('/v1/offers')
    .set('Authorization', `Bearer ${clientAToken}`)
    .set('X-Idempotency-Key', crypto.randomUUID())
    .send({
      talentId: SEED_USERS.TALENT_X,
      jobListingId: SEED_LISTINGS.PROJECT_ALPHA,
      contractType: 'PROJECT',
      contractTitle: 'E2E Test Project',
      rate: 95,
      currencyCode: 'USD',
      durationMonths: 6,
      workSchedule: { type: 'FULL_TIME' },
      startDate: '2027-06-01',
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body;
}

/** Submit a counter offer. Returns { counterOffer, rateWarning }. */
export async function createTestCO(
  offerId: string,
  rate: number,
  token = talentXToken,
) {
  const res = await request(httpServer)
    .post(`/v1/offers/${offerId}/counter-offers`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Idempotency-Key', crypto.randomUUID())
    .send({
      rate,
      currencyCode: 'USD',
      durationMonths: 6,
      workSchedule: { type: 'FULL_TIME' },
      startDate: '2027-06-01',
    });
  expect(res.status).toBe(201);
  return res.body;
}