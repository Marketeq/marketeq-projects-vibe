import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
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
import { VPN_PROXY_DETECTION_PROVIDER } from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { VpnProxyDetectionResult } from '../entities/enums/identity-verification.enums';

// GET /me is an informational status read and must work behind a VPN or proxy;
// every route that advances verification keeps the real VpnProxyCheckGuard.
describe('VpnProxyCheckGuard coverage: GET /me is open, advancing routes stay guarded', () => {
  const proto = IdentityVerificationController.prototype as any;
  const guardsOf = (method: string): unknown[] => Reflect.getMetadata(GUARDS_METADATA, proto[method]) ?? [];

  it('GET /me carries no VpnProxyCheckGuard', () => {
    expect(guardsOf('getMyStatus')).not.toContain(VpnProxyCheckGuard);
  });

  it.each([
    'connectionCheck',
    'confirmHomeCountry',
    'recordTravelClassification',
  ])('keeps VpnProxyCheckGuard on %s', (method) => {
    expect(typeof proto[method]).toBe('function');
    expect(guardsOf(method)).toContain(VpnProxyCheckGuard);
  });

  describe('over HTTP with a detected VPN and the real guard', () => {
    let app: INestApplication;
    const service = {
      getOrCreateProfile: jest.fn(),
      getVerificationSummary: jest.fn(),
      getLocationMismatch: jest.fn(),
      getLoginReminderAt: jest.fn(),
      confirmHomeCountry: jest.fn(),
      recordTravelClassification: jest.fn(),
    };
    const twoStage = { beginBiometricVerification: jest.fn() };
    const freeKyc = { createSession: jest.fn(), startSession: jest.fn() };
    const detect = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();
      detect.mockResolvedValue(VpnProxyDetectionResult.VPN_DETECTED);
      const moduleRef = await Test.createTestingModule({
        controllers: [IdentityVerificationController],
        providers: [
          { provide: IdentityVerificationService, useValue: service },
          { provide: TwoStageVerificationService, useValue: twoStage },
          { provide: FreeKycService, useValue: freeKyc },
          { provide: VPN_PROXY_DETECTION_PROVIDER, useValue: { detect } },
          VpnProxyCheckGuard,
        ],
      })
        .overrideGuard(BearerAuthGuard)
        .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'user-1'), true) })
        .compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();
    });
    afterEach(async () => app?.close());

    it('GET /me returns 200 behind a VPN without running the detection check', async () => {
      service.getOrCreateProfile.mockResolvedValue({ id: 'p1', userId: 'user-1' });
      service.getVerificationSummary.mockResolvedValue(undefined);
      service.getLocationMismatch.mockResolvedValue(false);
      service.getLoginReminderAt.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/v1/identity-verification/me');
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(503);
      expect(detect).not.toHaveBeenCalled();
      expect(service.getOrCreateProfile).toHaveBeenCalledTimes(1);
    });

    it('GET /connection-check still returns 403 with the detection result', async () => {
      const res = await request(app.getHttpServer()).get('/v1/identity-verification/connection-check').expect(403);
      expect(detect).toHaveBeenCalledTimes(1);
      const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
      expect(body.code ?? body.error?.code).toBe('VPN_PROXY_DETECTED');
      expect((body.details ?? body.error?.details).vpnProxyResult).toBe(VpnProxyDetectionResult.VPN_DETECTED);
    });

    it('GET /connection-check passes when the connection is clean', async () => {
      detect.mockResolvedValue(VpnProxyDetectionResult.NONE);
      await request(app.getHttpServer()).get('/v1/identity-verification/connection-check').expect(200, { ok: true });
    });

    it.each([
      ['post', '/v1/identity-verification/home-country/confirm', {}],
      ['post', '/v1/identity-verification/travel-classification', { classification: 'temporarily_traveling' }],
      ['post', '/v1/identity-verification/kyc-sessions', {}],
      ['post', '/v1/identity-verification/documents/upload-url', {}],
      ['post', '/v1/identity-verification/documents', {}],
      ['post', '/v1/identity-verification/documents/doc-1/verify', {}],
      ['post', '/v1/identity-verification/documents/doc-1/document-check', {}],
      ['post', '/v1/identity-verification/documents/doc-1/begin-biometric-verification', {}],
    ] as const)('%s %s is rejected for a VPN before any handler runs', async (_m, url, body) => {
      const res = await request(app.getHttpServer()).post(url).send(body);
      expect(res.status).toBe(403);
      expect(detect).toHaveBeenCalledTimes(1);
      for (const fn of [...Object.values(service), ...Object.values(twoStage), ...Object.values(freeKyc)]) {
        expect(fn).not.toHaveBeenCalled();
      }
    });
  });
});
