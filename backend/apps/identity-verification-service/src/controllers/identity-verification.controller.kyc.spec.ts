import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationWebhooksController } from './identity-verification-webhooks.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { VPN_PROXY_DETECTION_PROVIDER } from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { VpnProxyDetectionResult } from '../entities/enums/identity-verification.enums';
import { ConnectionCheckUnavailableException } from '../common/errors/domain-exceptions';

// HTTP-level: the real controllers, the real VpnProxyCheckGuard, the real
// exception filter and the real raw-body handling; everything behind them is
// a mock. Proves ordering (guard BEFORE any session logic) and route wiring.
describe('Free KYC routes (HTTP)', () => {
  let app: INestApplication;
  const detect = jest.fn();
  const freeKyc = { startOrResume: jest.fn(), handleWebhook: jest.fn() };
  const identity = { confirmHomeCountry: jest.fn() };

  beforeEach(async () => {
    detect.mockReset().mockResolvedValue(VpnProxyDetectionResult.NONE);
    freeKyc.startOrResume.mockReset().mockResolvedValue({ url: 'https://verify.didit.me/session/x' });
    freeKyc.handleWebhook.mockReset().mockResolvedValue(undefined);
    identity.confirmHomeCountry.mockReset().mockResolvedValue({
      verifiedHomeCountry: 'US', detectedCountry: 'US', detectedRegionState: null, detectedCity: null, timeZone: null,
      travelClassification: null, declaredDuration: null, travelModeActive: false,
      identityVerificationStatus: 'unstarted', locationVerificationStatus: 'verified',
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController, IdentityVerificationWebhooksController],
      providers: [
        VpnProxyCheckGuard,
        { provide: VPN_PROXY_DETECTION_PROVIDER, useValue: { detect } },
        { provide: IdentityVerificationService, useValue: identity },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: freeKyc },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().userId = 'user-1';
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterEach(async () => app.close());

  describe('POST /v1/identity-verification/kyc-sessions', () => {
    it('runs the VPN/proxy check, then returns ONLY the redirect url', async () => {
      const res = await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({});
      expect(res.status).toBe(200);
      expect(Object.keys(res.body)).toEqual(['url']);
      expect(detect).toHaveBeenCalledTimes(1);
      expect(freeKyc.startOrResume).toHaveBeenCalledWith('user-1', undefined);
    });

    it("passes the browser's own origin to the service, which validates it against FRONTEND_URL", async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/identity-verification/kyc-sessions')
        .send({ returnOrigin: 'https://staging-marketeq-projects.vercel.app' });
      expect(res.status).toBe(200);
      expect(freeKyc.startOrResume).toHaveBeenCalledWith('user-1', 'https://staging-marketeq-projects.vercel.app');
    });

    it.each([[123], [['https://a.com']], ['x'.repeat(2049)]])(
      'rejects a malformed returnOrigin (case %#) before the service runs',
      async (value) => {
        const res = await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({ returnOrigin: value });
        expect(res.status).toBe(400);
        expect(freeKyc.startOrResume).not.toHaveBeenCalled();
      },
    );

    it.each([
      [VpnProxyDetectionResult.VPN_DETECTED],
      [VpnProxyDetectionResult.PROXY_DETECTED],
      [VpnProxyDetectionResult.VPN_AND_PROXY_DETECTED],
    ])('a %s result blocks the route and NO session is created or returned', async (result) => {
      detect.mockResolvedValue(result);
      const res = await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({});
      expect(res.status).toBe(403);
      expect(freeKyc.startOrResume).not.toHaveBeenCalled();
      expect(JSON.stringify(res.body)).not.toContain('didit.me');
    });

    it('fails closed when the connection check itself is unavailable', async () => {
      detect.mockRejectedValue(new ConnectionCheckUnavailableException({ reason: 'test' }));
      const res = await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({});
      expect(res.status).toBe(503);
      expect(freeKyc.startOrResume).not.toHaveBeenCalled();
    });

    it('fails closed on an unexpected check failure', async () => {
      detect.mockRejectedValue(new Error('boom'));
      const res = await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({});
      expect(res.status).toBe(503);
      expect(freeKyc.startOrResume).not.toHaveBeenCalled();
    });

    it('rejects any user/country/callback field the client tries to supply in the body (only returnOrigin is read)', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/identity-verification/kyc-sessions')
        .send({ userId: 'someone-else', country: 'ZZ', callback: 'https://evil.example' });
      expect(res.status).toBe(400);
      expect(freeKyc.startOrResume).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/identity-verification/home-country/confirm', () => {
    it('confirms from the request IP only — a country in the body has no effect', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/identity-verification/home-country/confirm')
        .set('cf-connecting-ip', '198.51.100.7')
        .send({ country: 'ZZ', verifiedHomeCountry: 'ZZ' });
      expect(res.status).toBe(200);
      expect(identity.confirmHomeCountry).toHaveBeenCalledWith('user-1', '198.51.100.7');
      expect(identity.confirmHomeCountry.mock.calls[0]).toHaveLength(2);
    });

    it('is blocked by the VPN/proxy guard like every advancing action', async () => {
      detect.mockResolvedValue(VpnProxyDetectionResult.VPN_DETECTED);
      const res = await request(app.getHttpServer()).post('/v1/identity-verification/home-country/confirm').send({});
      expect(res.status).toBe(403);
      expect(identity.confirmHomeCountry).not.toHaveBeenCalled();
    });
  });

  describe('development-only client-IP override (route level)', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    afterEach(() => {
      delete process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP;
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    });

    it('in development the server variable drives the VPN check AND the home-country confirmation, ignoring a header', async () => {
      process.env.NODE_ENV = 'development';
      process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP = '8.8.4.4';
      await request(app.getHttpServer())
        .post('/v1/identity-verification/home-country/confirm')
        .set('cf-connecting-ip', '9.9.9.9')
        .set('x-identity-verification-dev-client-ip', '1.2.3.4')
        .send({});
      expect(detect).toHaveBeenCalledWith({ ipAddress: '8.8.4.4' });
      expect(identity.confirmHomeCountry).toHaveBeenCalledWith('user-1', '8.8.4.4');
    });

    it('outside development the variable is ignored and the normal extraction is used', async () => {
      process.env.NODE_ENV = 'production';
      process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP = '8.8.4.4';
      await request(app.getHttpServer())
        .post('/v1/identity-verification/home-country/confirm')
        .set('cf-connecting-ip', '9.9.9.9')
        .send({});
      expect(detect).toHaveBeenCalledWith({ ipAddress: '9.9.9.9' });
      expect(identity.confirmHomeCountry).toHaveBeenCalledWith('user-1', '9.9.9.9');
    });
  });

  describe('POST /v1/identity-verification/webhooks/didit-kyc', () => {
    it('hands the EXACT raw bytes plus x-signature-v2 and x-timestamp to the service, with no bearer auth or VPN check', async () => {
      const raw = '{"b":1,  "a":"é"}';
      const res = await request(app.getHttpServer())
        .post('/v1/identity-verification/webhooks/didit-kyc')
        .set('content-type', 'application/json')
        .set('x-signature-v2', 'sig-v2')
        .set('x-signature', 'legacy-sig')
        .set('x-timestamp', '1800000000')
        .send(raw);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
      const [rawBody, headers] = freeKyc.handleWebhook.mock.calls[0];
      expect(Buffer.isBuffer(rawBody)).toBe(true);
      expect(rawBody.toString('utf8')).toBe(raw);
      // Only V2 is forwarded — the legacy header is never passed along.
      expect(headers).toEqual({ signatureV2: 'sig-v2', timestamp: '1800000000' });
      expect(detect).not.toHaveBeenCalled();
    });

    it('a delivery with only the legacy X-Signature reaches the service with NO v2 signature (which rejects it)', async () => {
      await request(app.getHttpServer())
        .post('/v1/identity-verification/webhooks/didit-kyc')
        .set('content-type', 'application/json')
        .set('x-signature', 'legacy-sig')
        .set('x-timestamp', '1800000000')
        .send('{"a":1}');
      expect(freeKyc.handleWebhook.mock.calls[0][1].signatureV2).toBeUndefined();
    });
  });
});
