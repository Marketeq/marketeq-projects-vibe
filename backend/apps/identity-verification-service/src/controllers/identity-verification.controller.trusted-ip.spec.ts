import 'reflect-metadata';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { VPN_PROXY_DETECTION_PROVIDER } from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { ProxyCheckVpnProxyDetectionProvider } from '../providers/vpn-proxy/proxycheck-vpn-proxy-detection.provider';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

const CLEAN_IP = '8.8.8.8';
const VPN_IP = '185.59.221.75';

// D6 regression: a caller can put anything in X-Forwarded-For (Render appends
// to it rather than replacing it). The real guard + the real proxycheck
// provider (fetch stubbed per IP) must judge ONLY the trusted CF-Connecting-IP.
describe('trusted client IP — guarded routes (HTTP)', () => {
  const savedEnv = {
    NODE_ENV: process.env.NODE_ENV,
    dev: process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP,
    key: process.env.PROXYCHECK_API_KEY,
  };
  const originalFetch = (global as unknown as { fetch: unknown }).fetch;
  let app: INestApplication;
  let fetchMock: jest.Mock;
  let queried: string[];
  const freeKyc = { startOrResume: jest.fn() };
  const identity = {
    confirmHomeCountry: jest.fn(),
    startVerificationSession: jest.fn(),
    getDetectedLocationForDisplay: jest.fn(),
    getOrCreateProfile: jest.fn(),
  };

  beforeEach(async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP;
    process.env.PROXYCHECK_API_KEY = 'test-key';
    queried = [];
    fetchMock = jest.fn(async (url: string) => {
      const ip = decodeURIComponent(url.split('/v3/')[1].split('?')[0]);
      queried.push(ip);
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', [ip]: { detections: { vpn: ip === VPN_IP, proxy: false } } }),
      };
    });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    freeKyc.startOrResume.mockReset().mockResolvedValue({ url: 'https://verify.didit.me/session/x' });
    identity.confirmHomeCountry.mockReset().mockResolvedValue({});
    identity.startVerificationSession.mockReset().mockResolvedValue({});
    identity.getDetectedLocationForDisplay.mockReset().mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        VpnProxyCheckGuard,
        { provide: VPN_PROXY_DETECTION_PROVIDER, useClass: ProxyCheckVpnProxyDetectionProvider },
        { provide: IdentityVerificationService, useValue: identity },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: freeKyc },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'user-1'), true) })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    (global as unknown as { fetch: unknown }).fetch = originalFetch;
    for (const [k, v] of Object.entries({
      NODE_ENV: savedEnv.NODE_ENV,
      IDENTITY_VERIFICATION_DEV_CLIENT_IP: savedEnv.dev,
      PROXYCHECK_API_KEY: savedEnv.key,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const connectionCheck = () => request(app.getHttpServer()).get('/v1/identity-verification/connection-check');

  it('clean trusted IP passes', async () => {
    await connectionCheck().set('CF-Connecting-IP', CLEAN_IP).expect(200);
    expect(queried).toEqual([CLEAN_IP]);
  });

  it('VPN trusted IP is blocked', async () => {
    const res = await connectionCheck().set('CF-Connecting-IP', VPN_IP).expect(403);
    expect(res.body.code).toBe('VPN_PROXY_DETECTED');
  });

  it('a fake clean X-Forwarded-For cannot hide a VPN-classified trusted IP', async () => {
    const res = await connectionCheck()
      .set('X-Forwarded-For', CLEAN_IP)
      .set('X-Real-IP', CLEAN_IP)
      .set('CF-Connecting-IP', VPN_IP)
      .expect(403);
    expect(res.body.code).toBe('VPN_PROXY_DETECTED');
    expect(queried).toEqual([VPN_IP]);
  });

  it('a fake VPN X-Forwarded-For cannot override a clean trusted IP', async () => {
    await connectionCheck().set('X-Forwarded-For', VPN_IP).set('CF-Connecting-IP', CLEAN_IP).expect(200);
    expect(queried).toEqual([CLEAN_IP]);
  });

  it('multiple supplied X-Forwarded-For values are discarded', async () => {
    await connectionCheck()
      .set('X-Forwarded-For', `${VPN_IP}, 1.1.1.1`)
      .set('X-Forwarded-For', '9.9.9.9')
      .set('CF-Connecting-IP', CLEAN_IP)
      .expect(200);
    expect(queried).toEqual([CLEAN_IP]);
  });

  it.each([
    ['missing (only a spoofed X-Forwarded-For)', undefined],
    ['malformed', 'not-an-ip'],
    ['a list', `${CLEAN_IP}, ${VPN_IP}`],
    ['with a port', `${CLEAN_IP}:443`],
    ['private', '10.1.2.3'],
    ['loopback', '127.0.0.1'],
  ])('production fails closed (503, provider never asked) when the trusted IP is %s', async (_n, value) => {
    let call = connectionCheck().set('X-Forwarded-For', CLEAN_IP);
    if (value !== undefined) call = call.set('CF-Connecting-IP', value);
    const res = await call.expect(503);
    expect(res.body.code).toBe('CONNECTION_CHECK_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('two CF-Connecting-IP headers (joined by the server) fail closed', async () => {
    await connectionCheck().set('CF-Connecting-IP', [CLEAN_IP, VPN_IP]).expect(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes IPv4-mapped and IPv6 trusted IPs before the check', async () => {
    await connectionCheck().set('CF-Connecting-IP', `::ffff:${CLEAN_IP}`).expect(200);
    await connectionCheck().set('CF-Connecting-IP', '2606:4700:4700::1111').expect(200);
    expect(queried).toEqual([CLEAN_IP, '2606:4700:4700::1111']);
  });

  it('the connection check, guarded KYC session creation and document session start all judge the same canonical IP', async () => {
    await connectionCheck().set('X-Forwarded-For', VPN_IP).set('CF-Connecting-IP', CLEAN_IP).expect(200);
    await request(app.getHttpServer())
      .post('/v1/identity-verification/kyc-sessions')
      .set('X-Forwarded-For', VPN_IP)
      .set('CF-Connecting-IP', CLEAN_IP)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .post('/v1/identity-verification/documents/doc-1/verify')
      .set('X-Forwarded-For', VPN_IP)
      .set('CF-Connecting-IP', CLEAN_IP)
      .send({})
      .expect(201);
    expect(queried).toEqual([CLEAN_IP, CLEAN_IP, CLEAN_IP]);
    expect(identity.startVerificationSession).toHaveBeenCalledWith('user-1', 'doc-1', CLEAN_IP);
  });

  it('a VPN trusted IP creates no KYC session and no document session', async () => {
    await request(app.getHttpServer())
      .post('/v1/identity-verification/kyc-sessions')
      .set('X-Forwarded-For', CLEAN_IP)
      .set('CF-Connecting-IP', VPN_IP)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/v1/identity-verification/documents/doc-1/verify')
      .set('X-Forwarded-For', CLEAN_IP)
      .set('CF-Connecting-IP', VPN_IP)
      .send({})
      .expect(403);
    expect(freeKyc.startOrResume).not.toHaveBeenCalled();
    expect(identity.startVerificationSession).not.toHaveBeenCalled();
  });

  it('home-country confirmation and the location display receive the same canonical IP the guard checked', async () => {
    await request(app.getHttpServer())
      .post('/v1/identity-verification/home-country/confirm')
      .set('X-Forwarded-For', VPN_IP)
      .set('CF-Connecting-IP', `::ffff:${CLEAN_IP}`)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/identity-verification/detected-location')
      .set('X-Forwarded-For', VPN_IP)
      .set('CF-Connecting-IP', `::ffff:${CLEAN_IP}`)
      .expect(200);
    expect(queried).toEqual([CLEAN_IP]);
    expect(identity.confirmHomeCountry).toHaveBeenCalledWith('user-1', CLEAN_IP);
    expect(identity.getDetectedLocationForDisplay).toHaveBeenCalledWith(CLEAN_IP);
  });

  it('informational routes get null (not the socket peer) when no trusted IP exists in production', async () => {
    await request(app.getHttpServer())
      .get('/v1/identity-verification/detected-location')
      .set('X-Forwarded-For', CLEAN_IP)
      .expect(200);
    expect(identity.getDetectedLocationForDisplay).toHaveBeenCalledWith(null);
  });

  describe('development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('a direct local request (no header) uses the loopback socket and passes the local check', async () => {
      await connectionCheck().set('X-Forwarded-For', VPN_IP).expect(200);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the dev override still wins, and only in development', async () => {
      process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP = VPN_IP;
      await connectionCheck().set('CF-Connecting-IP', CLEAN_IP).expect(403);
      process.env.NODE_ENV = 'production';
      await connectionCheck().set('CF-Connecting-IP', CLEAN_IP).expect(200);
    });
  });
});
