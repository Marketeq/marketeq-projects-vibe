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
import { KycReconciliationUnavailableException } from '../common/errors/domain-exceptions';

// HTTP contract of POST /v1/identity-verification/kyc-sessions/reconcile: the
// real controller, validation pipe and exception filter over a mocked service.
describe('POST /v1/identity-verification/kyc-sessions/reconcile (HTTP contract)', () => {
  const ROUTE = '/v1/identity-verification/kyc-sessions/reconcile';
  let app: INestApplication;
  const vpnGuard = { canActivate: jest.fn() };
  const freeKyc = { startOrResume: jest.fn(), reconcileForUser: jest.fn() };

  beforeEach(async () => {
    vpnGuard.canActivate.mockReset().mockReturnValue(true);
    freeKyc.startOrResume.mockReset().mockResolvedValue({ url: 'https://verify.didit.me/session/x' });
    freeKyc.reconcileForUser.mockReset().mockResolvedValue({ outcome: 'unchanged' });
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
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
      .overrideGuard(VpnProxyCheckGuard)
      .useValue(vpnGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterEach(async () => app.close());

  it('returns 200 with ONLY a fixed outcome (the caller re-reads the real status from GET /me)', async () => {
    for (const outcome of ['no_active_session', 'unchanged', 'updated']) {
      freeKyc.reconcileForUser.mockResolvedValueOnce({ outcome });
      const res = await request(app.getHttpServer()).post(ROUTE).send({});
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ outcome });
    }
  });

  it('is an authenticated POST: the controller carries the bearer guard and the route is POST only', async () => {
    const guards: unknown[] = Reflect.getMetadata('__guards__', IdentityVerificationController) ?? [];
    expect(guards).toContain(BearerAuthGuard);
    for (const method of ['get', 'put', 'patch', 'delete'] as const) {
      const res = await request(app.getHttpServer())[method](ROUTE);
      expect(res.status).toBe(404);
    }
    expect(freeKyc.reconcileForUser).not.toHaveBeenCalled();
  });

  it('passes ONLY the authenticated user to the service — a session id in the body or query is never read', async () => {
    const res = await request(app.getHttpServer())
      .post(`${ROUTE}?sessionId=didit-from-query&diditSessionId=x`)
      .send({ sessionId: 'didit-from-body', diditSessionId: 'x', userId: 'someone-else' });
    expect(res.status).toBe(200);
    expect(freeKyc.reconcileForUser).toHaveBeenCalledTimes(1);
    expect(freeKyc.reconcileForUser.mock.calls[0]).toEqual(['user-1']);
  });

  it('is throttled with the same limit and window as session start (10 per minute)', () => {
    const proto = IdentityVerificationController.prototype;
    const limit = (fn: unknown) => Reflect.getMetadata('THROTTLER:LIMITdefault', fn as object);
    const ttl = (fn: unknown) => Reflect.getMetadata('THROTTLER:TTLdefault', fn as object);
    expect(limit(proto.reconcileKycSession)).toBe(10);
    expect(ttl(proto.reconcileKycSession)).toBe(60000);
    expect(limit(proto.reconcileKycSession)).toBe(limit(proto.startKycSession));
    expect(ttl(proto.reconcileKycSession)).toBe(ttl(proto.startKycSession));
  });

  it('does not add or change VPN/proxy behavior: the reconcile route has no VPN guard while session start still does', async () => {
    await request(app.getHttpServer()).post(ROUTE).send({}).expect(200);
    expect(vpnGuard.canActivate).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post('/v1/identity-verification/kyc-sessions').send({}).expect(200);
    expect(vpnGuard.canActivate).toHaveBeenCalledTimes(1);
  });

  it('a vendor failure is a fixed 502 KYC_RECONCILIATION_UNAVAILABLE that leaks no vendor body, session id or reference', async () => {
    freeKyc.reconcileForUser.mockRejectedValueOnce(new KycReconciliationUnavailableException({ reason: 'VendorTransportError' }));
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('KYC_RECONCILIATION_UNAVAILABLE');
    const text = JSON.stringify(res.body);
    for (const leak of ['didit-', 'verify.didit.me', 'api_key', 'Bearer']) expect(text).not.toContain(leak);
  });

  it('an unexpected error does not leak details', async () => {
    freeKyc.reconcileForUser.mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'));
    const res = await request(app.getHttpServer()).post(ROUTE).send({});
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|ECONNREFUSED|10\.0\.0\.5/);
  });
});
