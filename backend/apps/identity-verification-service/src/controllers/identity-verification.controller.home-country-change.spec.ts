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
import { KycNotStartableException } from '../common/errors/domain-exceptions';

// HTTP-level, same approach as identity-verification.controller.kyc.spec.ts: the
// real controller, VPN/proxy guard and exception filter, with the services mocked.
describe('POST /v1/identity-verification/kyc-sessions/home-country-change (HTTP)', () => {
  const ROUTE = '/v1/identity-verification/kyc-sessions/home-country-change';
  let app: INestApplication;
  const detect = jest.fn();
  const freeKyc = { startOrResume: jest.fn(), startHomeCountryChange: jest.fn(), handleWebhook: jest.fn() };

  beforeEach(async () => {
    detect.mockReset().mockResolvedValue(VpnProxyDetectionResult.NONE);
    freeKyc.startOrResume.mockReset();
    freeKyc.startHomeCountryChange.mockReset().mockResolvedValue({ url: 'https://verify.didit.me/session/x' });
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController, IdentityVerificationWebhooksController],
      providers: [
        VpnProxyCheckGuard,
        { provide: VPN_PROXY_DETECTION_PROVIDER, useValue: { detect } },
        { provide: IdentityVerificationService, useValue: {} },
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

  it('runs the VPN/proxy check, then returns ONLY the redirect url', async () => {
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['url']);
    expect(detect).toHaveBeenCalledTimes(1);
    expect(freeKyc.startHomeCountryChange).toHaveBeenCalledWith('user-1');
  });

  it('is a separate route: the ordinary start is not involved', async () => {
    await request(app.getHttpServer()).post(ROUTE).send({});
    expect(freeKyc.startOrResume).not.toHaveBeenCalled();
  });

  it.each([
    [VpnProxyDetectionResult.VPN_DETECTED],
    [VpnProxyDetectionResult.PROXY_DETECTED],
    [VpnProxyDetectionResult.VPN_AND_PROXY_DETECTED],
  ])('a %s result blocks the route before any session logic runs', async (result) => {
    detect.mockResolvedValue(result);
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(403);
    expect(freeKyc.startHomeCountryChange).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('didit.me');
  });

  it('fails closed when the connection check is unavailable', async () => {
    detect.mockRejectedValue(new Error('boom'));
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(503);
    expect(freeKyc.startHomeCountryChange).not.toHaveBeenCalled();
  });

  it('ignores any user, country, purpose or session id the client tries to supply', async () => {
    const res = await request(app.getHttpServer())
      .post(ROUTE)
      .send({ userId: 'someone-else', country: 'ZZ', purpose: 'identity_verification', sessionId: 'x' });
    expect(res.status).toBe(200);
    expect(freeKyc.startHomeCountryChange).toHaveBeenCalledWith('user-1');
    expect(freeKyc.startHomeCountryChange.mock.calls[0]).toHaveLength(1);
  });

  it('answers the existing not-startable contract for an account that has no relocation claim', async () => {
    freeKyc.startHomeCountryChange.mockRejectedValue(new KycNotStartableException({ status: 'verified', reason: 'no_home_country_change' }));
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('IDENTITY_VERIFICATION_NOT_STARTABLE');
  });
});
