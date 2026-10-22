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
import { buildVerificationSummary } from '../common/status/verification-summary';
import {
  DeclaredDuration,
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

/**
 * How the controller turns the verified access token into the login session handed to the
 * service. The guard is overridden to put a chosen token payload on the request, exactly
 * where BearerAuthGuard puts it; every other piece is the real controller and DTO.
 */
describe('Travel Mode login reminder — token to service (HTTP)', () => {
  const ME = '/v1/identity-verification/me';
  const CLAIM = '/v1/identity-verification/travel-reminder/claim';
  const SID = '7f3c1d9e-1b2a-4c3d-8e4f-5a6b7c8d9e0f';
  const NOW_SECONDS = Math.floor(Date.now() / 1000);
  const ACTIVATED = new Date(Date.now() - 24 * 60 * 60 * 1000); // active since yesterday, 13 days

  let app: INestApplication;
  let tokenPayload: Record<string, unknown> | undefined;
  const ivs = {
    getOrCreateProfile: jest.fn(),
    getVerificationSummary: jest.fn(),
    getLocationMismatch: jest.fn(),
    getTravelModeLocationMismatch: jest.fn().mockResolvedValue(false),
    getLoginReminderAt: jest.fn(),
    claimTravelReminder: jest.fn(),
  };

  const travellingProfile = () =>
    ({
      id: 'profile-1',
      userId: 'user-1',
      verifiedHomeCountry: 'US',
      detectedCountry: 'US',
      travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
      travelModeActive: true,
      travelModeActivatedAt: ACTIVATED,
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      lastTravelReminderSentAt: null,
      identityVerificationStatus: I.VERIFIED,
      locationVerificationStatus: L.VERIFIED,
    }) as any;

  beforeEach(async () => {
    tokenPayload = { sub: 'user-1', sid: SID, auth_time: NOW_SECONDS - 600 };
    ivs.getOrCreateProfile.mockReset().mockResolvedValue(travellingProfile());
    ivs.getVerificationSummary.mockReset().mockResolvedValue(
      buildVerificationSummary({
        identityStatus: I.VERIFIED,
        locationStatus: L.VERIFIED,
        failedFinalAt: null,
        hostedCycleAttempts: 0,
        hasActiveHostedSession: false,
        verifiedHomeCountry: 'US',
        verifiedHomeCountryConfirmedAt: new Date(),
        travelModeActive: true,
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        nowMs: Date.now(),
      } as any),
    );
    ivs.getLocationMismatch.mockReset().mockResolvedValue(false);
    ivs.getTravelModeLocationMismatch.mockReset().mockResolvedValue(false);
    ivs.getLoginReminderAt.mockReset().mockResolvedValue(null);
    ivs.claimTravelReminder.mockReset().mockResolvedValue({ claimed: false });

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
          req.userId = 'user-1';
          req.user = tokenPayload;
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

  describe('POST /travel-reminder/claim', () => {
    it('hands the service the token’s session id and authentication time (milliseconds)', async () => {
      ivs.claimTravelReminder.mockResolvedValue({ claimed: true });
      const res = await request(app.getHttpServer()).post(CLAIM).expect(200);
      expect(res.body).toEqual({ claimed: true });
      expect(ivs.claimTravelReminder).toHaveBeenCalledTimes(1);
      expect(ivs.claimTravelReminder).toHaveBeenCalledWith('user-1', { sid: SID, authTimeMs: (NOW_SECONDS - 600) * 1000 });
    });

    it.each([
      ['a token from before auth_time existed', { sub: 'user-1', sid: SID }],
      ['no session id', { sub: 'user-1', auth_time: NOW_SECONDS - 600 }],
      ['a string auth_time', { sub: 'user-1', sid: SID, auth_time: String(NOW_SECONDS - 600) }],
      ['a fractional auth_time', { sub: 'user-1', sid: SID, auth_time: NOW_SECONDS - 600.5 }],
      ['milliseconds instead of seconds', { sub: 'user-1', sid: SID, auth_time: Date.now() }],
      ['a future auth_time', { sub: 'user-1', sid: SID, auth_time: NOW_SECONDS + 3600 }],
      ['a malformed sid', { sub: 'user-1', sid: "x'; DROP TABLE y;--", auth_time: NOW_SECONDS - 600 }],
      ['no payload at all', undefined],
    ])('%s: the service gets no login session (day 3 / day 7 only)', async (_label, payload) => {
      tokenPayload = payload;
      await request(app.getHttpServer()).post(CLAIM).expect(200);
      expect(ivs.claimTravelReminder).toHaveBeenCalledWith('user-1', null);
    });

    it('ignores anything the client sends: session and time come only from the verified token', async () => {
      await request(app.getHttpServer())
        .post(`${CLAIM}?sid=attacker&auth_time=1`)
        .send({ sid: 'attacker', auth_time: 1, authTimeMs: 1 })
        .expect(200);
      expect(ivs.claimTravelReminder).toHaveBeenCalledWith('user-1', { sid: SID, authTimeMs: (NOW_SECONDS - 600) * 1000 });
    });

    it('the response is still exactly { claimed: boolean }', async () => {
      ivs.claimTravelReminder.mockResolvedValue({ claimed: false });
      const res = await request(app.getHttpServer()).post(CLAIM).expect(200);
      expect(Object.keys(res.body)).toEqual(['claimed']);
    });
  });

  describe('GET /me', () => {
    it('asks the service for this session’s login reminder with the token’s session', async () => {
      await request(app.getHttpServer()).get(ME).expect(200);
      expect(ivs.getLoginReminderAt).toHaveBeenCalledWith(expect.objectContaining({ id: 'profile-1' }), {
        sid: SID,
        authTimeMs: (NOW_SECONDS - 600) * 1000,
      });
    });

    it('asks with no session for a token without usable claims', async () => {
      tokenPayload = { sub: 'user-1', sid: SID };
      await request(app.getHttpServer()).get(ME).expect(200);
      expect(ivs.getLoginReminderAt).toHaveBeenCalledWith(expect.anything(), null);
    });

    it('reports a due login reminder on the existing fields, ahead of day 3', async () => {
      const dueAt = new Date(Date.now() - 60_000);
      ivs.getLoginReminderAt.mockResolvedValue(dueAt);
      const res = await request(app.getHttpServer()).get(ME).expect(200);
      expect(res.body.travelReminderDue).toBe(true);
      expect(res.body.travelReminderAvailableAt).toBe(dueAt.toISOString());
    });

    it('reports a login reminder that is still in the future without marking it due', async () => {
      const dueAt = new Date(Date.now() + 2 * 60_000);
      ivs.getLoginReminderAt.mockResolvedValue(dueAt);
      const res = await request(app.getHttpServer()).get(ME).expect(200);
      expect(res.body.travelReminderDue).toBe(false);
      expect(res.body.travelReminderAvailableAt).toBe(dueAt.toISOString());
    });

    it('with no login reminder the day 3 schedule is reported exactly as before', async () => {
      const res = await request(app.getHttpServer()).get(ME).expect(200);
      expect(res.body.travelReminderDue).toBe(false);
      expect(res.body.travelReminderAvailableAt).toBe(new Date(ACTIVATED.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString());
    });

    it('adds no new field and leaks no session id or token claim', async () => {
      ivs.getLoginReminderAt.mockResolvedValue(new Date(Date.now() - 1000));
      const res = await request(app.getHttpServer()).get(ME).expect(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(SID);
      expect(Object.keys(res.body)).not.toEqual(expect.arrayContaining(['sid', 'auth_time', 'authTime', 'loginReminderAt']));
    });
  });
});
