import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { FindOperator } from 'typeorm';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { VerificationSummaryService } from '../services/verification-summary.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

// POST /v1/identity-verification/travel-reminder/claim over HTTP: the REAL bearer
// guard (with a signed test token), the real controller, filter and service, over a
// stateful fake repository that evaluates the real TypeORM operators.
describe('POST /v1/identity-verification/travel-reminder/claim', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const CLAIM = '/v1/identity-verification/travel-reminder/claim';
  const ME = '/v1/identity-verification/me';
  const SECRET = 'test-only-signing-secret';
  type Row = Record<string, any>;

  let row: Row | null;
  let app: INestApplication;
  let update: jest.Mock;
  let findOne: jest.Mock;
  let publish: jest.Mock;
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const k of ['JWT_SECRET', 'AUTH_JWT_PUBLIC_KEY']) saved[k] = process.env[k];
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    process.env.JWT_SECRET = SECRET;
  });
  afterAll(() => {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const token = (sub = 'user-1') => jwt.sign({ sub }, SECRET, { algorithm: 'HS256' });
  const auth = () => ({ Authorization: `Bearer ${token()}` });

  // A 13-day Travel Mode started `startedMsAgo` ago (day 3 falls at +3 days).
  const profile = (startedMsAgo: number, over: Row = {}): Row => ({
    id: 'profile-1',
    userId: 'user-1',
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
    detectedCountry: 'US',
    detectedRegionState: null,
    detectedCity: null,
    timeZone: null,
    identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
    identityRejectionReason: null,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    failedFinalAt: null,
    expiredAt: null,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: new Date(Date.now() - startedMsAgo),
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: new Date(Date.now() - startedMsAgo + 3 * DAY),
    ...over,
  });
  const dueDay3 = (over: Row = {}) => profile(3 * DAY + 2000, over); // day 3 passed 2 seconds ago
  const beforeDay3 = (over: Row = {}) => profile(1 * DAY, over);

  const evaluate = (actual: any, expected: any): boolean => {
    if (expected instanceof FindOperator) {
      if (expected.type === 'isNull') return actual === null || actual === undefined;
      if (expected.type === 'lessThan') return actual != null && actual < (expected.value as any);
      if (expected.type === 'or') return (expected.value as unknown as FindOperator<any>[]).some((c) => evaluate(actual, c));
      throw new Error(`unsupported operator ${expected.type}`);
    }
    if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
    return actual === expected;
  };

  const build = async (initial: Row | null, vpnAllows = true) => {
    row = initial;
    update = jest.fn(async (criteria: Row, data: Row) => {
      const hit = row !== null && Object.entries(criteria).every(([k, v]) => evaluate(row![k], v));
      if (!hit) return { affected: 0 };
      Object.assign(row!, data);
      return { affected: 1 };
    });
    // Like the real repository: only the row that matches the where-clause is returned.
    findOne = jest.fn(async ({ where }: { where: Row }) =>
      row && Object.entries(where).every(([k, v]) => row![k] === v) ? { ...row } : null,
    );
    publish = jest.fn();
    const summary = new VerificationSummaryService(
      { find: jest.fn(async () => []), findOne: jest.fn(async () => null) } as any,
      { find: jest.fn(async () => []) } as any,
    );
    const service = new IdentityVerificationService(
      { findOne, create: jest.fn(), save: jest.fn(), update } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { resolve: jest.fn() } as any, {} as any, { publish } as any, summary,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: service },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: {} },
      ],
    })
      .overrideGuard(VpnProxyCheckGuard) // BearerAuthGuard is NOT overridden: the real one runs
      .useValue({ canActivate: () => vpnAllows })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  };
  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  const claim = () => request(app.getHttpServer()).post(CLAIM).set(auth());

  describe('response contract', () => {
    it('a claimable reminder returns HTTP 200 with exactly { claimed: true }', async () => {
      await build(dueDay3());

      const res = await claim().expect(200);

      expect(res.body).toEqual({ claimed: true });
      expect(Object.keys(res.body)).toEqual(['claimed']);
    });

    it('a duplicate returns exactly { claimed: false } with HTTP 200, never an error', async () => {
      await build(dueDay3());
      await claim().expect(200);

      const res = await claim().expect(200);

      expect(res.body).toEqual({ claimed: false });
    });

    it('nothing due yet, no profile, and expired all return 200 { claimed: false }', async () => {
      await build(beforeDay3());
      expect((await claim().expect(200)).body).toEqual({ claimed: false });
      await app.close();

      await build(null);
      expect((await claim().expect(200)).body).toEqual({ claimed: false });
      await app.close();

      await build(profile(14 * DAY)); // a 13-day period that ended a day ago
      expect((await claim().expect(200)).body).toEqual({ claimed: false });
    });

    it('the response never carries an identifier, a time, a day number or a state', async () => {
      await build(dueDay3());
      const res = await claim().expect(200);
      const text = JSON.stringify(res.body);
      for (const leak of ['profile-1', 'user-1', '20', 'day', 'due', 'travel']) expect(text).not.toContain(leak);
    });

    it('only POST exists on this route', async () => {
      await build(dueDay3());
      await request(app.getHttpServer()).get(CLAIM).set(auth()).expect(404);
    });
  });

  describe('authentication: the existing 401 behavior is unchanged', () => {
    it.each([
      ['no Authorization header', {}],
      ['a non-Bearer scheme', { Authorization: 'Basic abc' }],
      ['an invalid token', { Authorization: 'Bearer not-a-token' }],
      ['a token signed with another secret', { Authorization: `Bearer ${jwt.sign({ sub: 'user-1' }, 'another-secret', { algorithm: 'HS256' })}` }],
      ['a token without a user claim', { Authorization: `Bearer ${jwt.sign({ scope: 'x' }, SECRET, { algorithm: 'HS256' })}` }],
    ])('%s returns 401 and touches no profile', async (_label, headers) => {
      await build(dueDay3());

      await request(app.getHttpServer()).post(CLAIM).set(headers).expect(401);

      expect(findOne).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('a valid token works', async () => {
      await build(dueDay3());
      await request(app.getHttpServer()).post(CLAIM).set(auth()).expect(200);
    });
  });

  describe('it uses the authenticated caller only', () => {
    it('ignores any body, query, profile id or timestamp it is sent', async () => {
      await build(dueDay3());

      const res = await request(app.getHttpServer())
        .post(`${CLAIM}?userId=attacker&profileId=profile-9&timestamp=2000-01-01T00:00:00.000Z`)
        .set(auth())
        .send({ userId: 'attacker', profileId: 'profile-9', claimed: true, lastTravelReminderSentAt: '2099-01-01T00:00:00.000Z' })
        .expect(200);

      expect(res.body).toEqual({ claimed: true });
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } }); // always the token's user
      expect(update.mock.calls[0][0].id).toBe('profile-1');
      expect(row!.lastTravelReminderSentAt.getTime()).toBeLessThan(Date.now() + 1000); // not the client's timestamp
    });

    it('another user’s profile is never read for this caller', async () => {
      await build(dueDay3());
      const res = await request(app.getHttpServer()).post(CLAIM).set({ Authorization: `Bearer ${token('someone-else')}` }).expect(200);

      expect(res.body).toEqual({ claimed: false }); // that user has no profile
      expect(findOne).toHaveBeenCalledWith({ where: { userId: 'someone-else' } });
      expect(update).not.toHaveBeenCalled();
      expect(row!.lastTravelReminderSentAt).toBeNull(); // user-1's reminder was not consumed
    });
  });

  describe('no VPN guard', () => {
    it('is not guarded by VpnProxyCheckGuard: with that guard denying, a guarded route is refused but the claim works', async () => {
      await build(dueDay3(), false);

      await request(app.getHttpServer()).get('/v1/identity-verification/connection-check').set(auth()).expect(403);
      const res = await claim().expect(200);

      expect(res.body).toEqual({ claimed: true });
    });

    it('declares no route-level guard; only the class-level bearer guard applies', () => {
      const routeGuards = Reflect.getMetadata('__guards__', IdentityVerificationController.prototype.claimTravelReminder);
      expect(routeGuards).toBeUndefined();
      expect(Reflect.getMetadata('__guards__', IdentityVerificationController)).toEqual([BearerAuthGuard]);
    });
  });

  describe('concurrency over HTTP', () => {
    it('two simultaneous requests: one true, one false', async () => {
      await build(dueDay3());

      const [a, b] = await Promise.all([claim(), claim()]);

      expect([a.status, b.status]).toEqual([200, 200]);
      expect([a.body.claimed, b.body.claimed].sort()).toEqual([false, true]);
    });
  });

  describe('only lastTravelReminderSentAt changes; no cursor update and no event', () => {
    it('writes one field and publishes nothing', async () => {
      await build(dueDay3());
      const before = JSON.parse(JSON.stringify(row));

      await claim().expect(200);

      expect(Object.keys(update.mock.calls[0][1])).toEqual(['lastTravelReminderSentAt']);
      const after = JSON.parse(JSON.stringify(row));
      expect(Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]))).toEqual(['lastTravelReminderSentAt']);
      expect(row!.nextTravelReminderAt.getTime()).toBe(new Date(before.nextTravelReminderAt).getTime()); // the job's cursor
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('GET /me stays correct after a claim', () => {
    const me = () => request(app.getHttpServer()).get(ME).set(auth()).expect(200);

    it('13 days: before the claim day 3 is due; after it the next read returns day 7 and everything else is unchanged', async () => {
      await build(dueDay3());
      const first = (await me()).body;
      expect(first).toMatchObject({ travelModeActive: true, travelReminderDue: true });
      expect(first.travelReminderAvailableAt).toBe(new Date(row!.travelModeActivatedAt.getTime() + 3 * DAY).toISOString());

      await claim().expect(200);
      const second = (await me()).body;

      expect(second.travelReminderDue).toBe(false);
      expect(second.travelReminderAvailableAt).toBe(new Date(row!.travelModeActivatedAt.getTime() + 7 * DAY).toISOString());
      for (const key of ['travelModeActive', 'travelModeEndsAt', 'travelModeExpired', 'travelClassification', 'declaredDuration', 'nextAction', 'identityVerificationStatus']) {
        expect(second[key]).toEqual(first[key]);
      }
    });

    it('6 days: after the day-3 claim there is nothing further', async () => {
      await build(dueDay3({ declaredDuration: DeclaredDuration.A_FEW_DAYS }));

      await claim().expect(200);
      const after = (await me()).body;

      expect(after).toMatchObject({ travelModeActive: true, travelReminderDue: false, travelReminderAvailableAt: null });
    });

    it('a late login after day 7: one claim consumes both and /me then reports nothing left', async () => {
      await build(profile(9 * DAY));
      expect((await me()).body.travelReminderDue).toBe(true);

      expect((await claim().expect(200)).body).toEqual({ claimed: true });

      expect((await me()).body).toMatchObject({ travelReminderDue: false, travelReminderAvailableAt: null });
      expect((await claim().expect(200)).body).toEqual({ claimed: false });
    });
  });
});
