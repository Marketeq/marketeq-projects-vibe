import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { deriveLoginSessionKey } from '../common/travel-mode/login-session-key';
import { buildVerificationSummary } from '../common/status/verification-summary';
import {
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
} from '../entities/enums/identity-verification.enums';

/**
 * GET /me returns an opaque per-login key derived from the verified token's sid, so the
 * browser (which cannot read the HttpOnly session_id cookie) can remember per login that
 * a popup was shown or dismissed. The guard is overridden to put a chosen token payload on
 * the request, exactly where BearerAuthGuard puts it.
 */
describe('GET /me — loginSessionKey', () => {
  const ME = '/v1/identity-verification/me';
  const SID_A = '7f3c1d9e-1b2a-4c3d-8e4f-5a6b7c8d9e0f';
  const SID_B = '0a1b2c3d-1b2a-4c3d-8e4f-5a6b7c8d9e0f';
  const AUTH_TIME = Math.floor(Date.now() / 1000) - 600;
  const ACCESS_TOKEN = 'eyJhbGciOi.eyJzdWIiOiJ1c2VyLTEi.c2lnbmF0dXJl';
  const CSRF = 'csrf-secret-value';
  const REFRESH = 'refresh-secret-value';

  let app: INestApplication;
  let tokenPayload: Record<string, unknown> | undefined;
  let userId = 'user-1';
  const ivs = {
    getOrCreateProfile: jest.fn(),
    getVerificationSummary: jest.fn(),
    getLocationMismatch: jest.fn(),
    getTravelModeLocationMismatch: jest.fn(),
    getLoginReminderAt: jest.fn(),
  };

  beforeEach(async () => {
    tokenPayload = { sub: 'user-1', sid: SID_A, auth_time: AUTH_TIME };
    userId = 'user-1';
    ivs.getOrCreateProfile.mockReset().mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      verifiedHomeCountry: 'US',
      detectedCountry: 'US',
      travelClassification: null,
      travelModeActive: false,
      identityVerificationStatus: I.VERIFIED,
      locationVerificationStatus: L.VERIFIED,
    });
    ivs.getVerificationSummary.mockReset().mockResolvedValue(
      buildVerificationSummary({
        identityStatus: I.VERIFIED,
        locationStatus: L.VERIFIED,
        failedFinalAt: null,
        hostedCycleAttempts: 0,
        hasActiveHostedSession: false,
        verifiedHomeCountry: 'US',
        verifiedHomeCountryConfirmedAt: new Date(),
        travelModeActive: false,
        travelClassification: null,
        nowMs: Date.now(),
      } as any),
    );
    ivs.getLocationMismatch.mockReset().mockResolvedValue(false);
    ivs.getTravelModeLocationMismatch.mockReset().mockResolvedValue(false);
    ivs.getLoginReminderAt.mockReset().mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: ivs },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: {} },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.userId = userId;
          req.user = tokenPayload;
          req.headers.authorization = `Bearer ${ACCESS_TOKEN}`;
          return true;
        },
      })
      .overrideGuard(VpnProxyCheckGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterEach(async () => app.close());

  const me = async (extraHeaders: Record<string, string> = {}) => {
    const res = await request(app.getHttpServer()).get(ME).set(extraHeaders).expect(200);
    return res.body as Record<string, unknown>;
  };

  it('returns an opaque key derived from the verified sid', async () => {
    const body = await me();
    expect(body.loginSessionKey).toBe(deriveLoginSessionKey('user-1', SID_A));
    expect(body.loginSessionKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never exposes the raw sid, any token, the csrf token or auth_time anywhere in the response', async () => {
    const res = await request(app.getHttpServer())
      .get(ME)
      .set('Cookie', [`access_token=${ACCESS_TOKEN}`, `refresh_token=${REFRESH}`, `session_id=${SID_A}`])
      .set('x-csrf-token', CSRF)
      .expect(200);
    const text = JSON.stringify(res.body) + JSON.stringify(res.headers);
    for (const secret of [SID_A, ACCESS_TOKEN, REFRESH, CSRF, String(AUTH_TIME)]) {
      expect(text).not.toContain(secret);
    }
    expect(Object.keys(res.body)).not.toEqual(expect.arrayContaining(['sid', 'auth_time', 'authTime', 'sessionId', 'session_id']));
  });

  it('is stable across requests of the same login (a refresh)', async () => {
    const first = await me();
    const second = await me();
    expect(second.loginSessionKey).toBe(first.loginSessionKey);
  });

  it('is different for a genuinely new login (a new sid)', async () => {
    const first = await me();
    tokenPayload = { sub: 'user-1', sid: SID_B, auth_time: AUTH_TIME + 5 };
    const second = await me();
    expect(second.loginSessionKey).toBeDefined();
    expect(second.loginSessionKey).not.toBe(first.loginSessionKey);
  });

  it('is different for another account even with the same sid (no inheriting a marker)', async () => {
    const first = await me();
    userId = 'user-2';
    const second = await me();
    expect(second.loginSessionKey).not.toBe(first.loginSessionKey);
  });

  it('an older token without a sid still works: the response is complete and simply has no key', async () => {
    tokenPayload = { sub: 'user-1' };
    const body = await me();
    expect('loginSessionKey' in body).toBe(false);
    expect(body.identityVerificationStatus).toBe(I.VERIFIED);
    expect(body.nextAction).toBe('complete');
  });

  it.each([
    ['a malformed sid', { sub: 'user-1', sid: "x'; DROP TABLE y;--" }],
    ['a numeric sid', { sub: 'user-1', sid: 1234 }],
    ['no payload', undefined],
  ])('%s: the key is omitted', async (_label, payload) => {
    tokenPayload = payload;
    const body = await me();
    expect('loginSessionKey' in body).toBe(false);
  });

  it('an auth_time-less token with a valid sid still gets a key (it needs only the sid)', async () => {
    tokenPayload = { sub: 'user-1', sid: SID_A };
    expect((await me()).loginSessionKey).toBe(deriveLoginSessionKey('user-1', SID_A));
  });

  it('ignores anything the client sends: the key comes only from the verified token', async () => {
    const res = await request(app.getHttpServer()).get(`${ME}?sid=attacker&loginSessionKey=attacker`).set('x-sid', 'attacker').expect(200);
    expect(res.body.loginSessionKey).toBe(deriveLoginSessionKey('user-1', SID_A));
  });
});
