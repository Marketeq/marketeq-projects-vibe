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
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { LocationLookupUnavailableException } from '../common/errors/domain-exceptions';

// HTTP-level: the real controller and exception filter, with the service
// mocked, proving which IP reaches the server-side location decision and that
// the response never carries one.
describe('GET /v1/identity-verification/detected-location', () => {
  const CLIENT_IP = '198.51.100.23'; // what the request itself claims (XFF)
  const DEV_IP = '8.8.4.4'; // server-side dev override
  let app: INestApplication;
  const display = jest.fn();
  const confirm = jest.fn();
  const gps = jest.fn();
  const savedEnv = { NODE_ENV: process.env.NODE_ENV, dev: process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP };
  let logged: string[];

  const build = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: { getDetectedLocationForDisplay: display, confirmHomeCountry: confirm, resolveGpsDisplay: gps } },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: {} },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'user-1'), true) })
      .overrideGuard(VpnProxyCheckGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    // Same pipe configuration as main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  };

  beforeEach(async () => {
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((m: any) => void logged.push(String(m)));
    }
    display.mockReset().mockResolvedValue({
      countryCode: 'US', regionState: 'Illinois', city: 'Chicago', regionCode: null, latitude: 41.88, longitude: -87.63,
    });
    confirm.mockReset().mockResolvedValue({});
    gps.mockReset().mockResolvedValue({
      status: 'resolved', countryCode: 'US', countryName: 'United States', city: 'Chicago', regionCode: 'IL',
      regionName: 'Illinois', latitude: 41.88, longitude: -87.63,
    });
    process.env.NODE_ENV = 'development';
    process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP = DEV_IP;
    await build();
  });
  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    process.env.NODE_ENV = savedEnv.NODE_ENV;
    if (savedEnv.dev === undefined) delete process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP;
    else process.env.IDENTITY_VERIFICATION_DEV_CLIENT_IP = savedEnv.dev;
  });

  it('returns the sanitized display fields, including country name, and no IP address', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/identity-verification/detected-location')
      .set('X-Forwarded-For', CLIENT_IP)
      .expect(200);
    expect(res.body).toEqual({
      countryCode: 'US', countryName: 'United States', city: 'Chicago',
      regionCode: null, regionName: 'Illinois', latitude: 41.88, longitude: -87.63,
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(CLIENT_IP);
    expect(text).not.toContain(DEV_IP);
    expect(Object.keys(res.body)).not.toContain('ip');
  });

  it('display and home-country confirmation receive the very same effective IP', async () => {
    await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').set('X-Forwarded-For', CLIENT_IP).expect(200);
    await request(app.getHttpServer()).post('/v1/identity-verification/home-country/confirm').set('X-Forwarded-For', CLIENT_IP).expect(200);
    expect(display.mock.calls[0][0]).toBe(confirm.mock.calls[0][1]);
    expect(display.mock.calls[0][0]).toBe(DEV_IP);
  });

  it('the dev override is honored only on the server: browser-supplied IPs (headers, query) are ignored', async () => {
    await request(app.getHttpServer())
      .get('/v1/identity-verification/detected-location?ip=192.0.2.9')
      .set('X-Forwarded-For', CLIENT_IP)
      .set('X-Real-IP', '192.0.2.10')
      .set('X-Dev-Client-Ip', '192.0.2.11')
      .expect(200);
    expect(display.mock.calls[0][0]).toBe(DEV_IP);
  });

  it('outside development the override is ignored and the request-derived IP is used', async () => {
    process.env.NODE_ENV = 'production';
    await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').set('X-Forwarded-For', CLIENT_IP).expect(200);
    await request(app.getHttpServer()).post('/v1/identity-verification/home-country/confirm').set('X-Forwarded-For', CLIENT_IP).expect(200);
    expect(display.mock.calls[0][0]).toBe(CLIENT_IP);
    expect(confirm.mock.calls[0][1]).toBe(CLIENT_IP);
  });

  it('a lookup that finds nothing returns an all-null body (200)', async () => {
    display.mockResolvedValue(null);
    const res = await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').expect(200);
    expect(res.body).toEqual({
      countryCode: null, countryName: null, city: null, regionCode: null, regionName: null, latitude: null, longitude: null,
    });
  });

  it('a location-service outage surfaces as 503 LOCATION_LOOKUP_UNAVAILABLE', async () => {
    display.mockRejectedValue(new LocationLookupUnavailableException({ reason: 'request_failed' }));
    const res = await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').expect(503);
    expect(res.body.code).toBe('LOCATION_LOOKUP_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain(DEV_IP);
  });

  it('never logs either IP', async () => {
    await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').set('X-Forwarded-For', CLIENT_IP).expect(200);
    display.mockRejectedValue(new LocationLookupUnavailableException({ reason: 'request_failed' }));
    await request(app.getHttpServer()).get('/v1/identity-verification/detected-location').set('X-Forwarded-For', CLIENT_IP).expect(503);
    const all = logged.join('\n');
    expect(all).not.toContain(CLIENT_IP);
    expect(all).not.toContain(DEV_IP);
  });

  describe('POST /v1/identity-verification/detected-location/coordinates', () => {
    const post = (body: unknown) =>
      request(app.getHttpServer())
        .post('/v1/identity-verification/detected-location/coordinates')
        .set('X-Forwarded-For', CLIENT_IP)
        .send(body as object);

    it('passes the same effective IP and only the two numbers to the service, and returns no IP', async () => {
      const res = await post({ latitude: 41.878113, longitude: -87.629799 }).expect(200);
      expect(gps).toHaveBeenCalledWith(DEV_IP, 41.878113, -87.629799);
      expect(gps.mock.calls[0][0]).toBe(display.mock.calls[0]?.[0] ?? DEV_IP);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(CLIENT_IP);
      expect(text).not.toContain(DEV_IP);
      expect(res.body.status).toBe('resolved');
    });

    it('rejects out-of-range, non-numeric and missing coordinates (400) without calling the service', async () => {
      for (const bad of [
        { latitude: 91, longitude: 0 },
        { latitude: -91, longitude: 0 },
        { latitude: 0, longitude: 181 },
        { latitude: 0, longitude: -181 },
        { latitude: '41.8', longitude: '-87.6' },
        { latitude: null, longitude: 0 },
        { latitude: 1 },
        {},
      ]) {
        await post(bad).expect(400);
      }
      expect(gps).not.toHaveBeenCalled();
    });

    it('rejects any country, city or state supplied by the browser (400)', async () => {
      for (const extra of [{ country: 'US' }, { countryCode: 'US' }, { city: 'Chicago' }, { state: 'Illinois' }, { ip: '8.8.8.8' }]) {
        await post({ latitude: 41.88, longitude: -87.63, ...extra }).expect(400);
      }
      expect(gps).not.toHaveBeenCalled();
    });

    it('never logs the coordinates or either IP', async () => {
      await post({ latitude: 41.878113, longitude: -87.629799 }).expect(200);
      await post({ latitude: 999, longitude: 0 }).expect(400);
      const all = logged.join('\n');
      for (const secret of ['41.878113', '87.629799', CLIENT_IP, DEV_IP]) expect(all).not.toContain(secret);
    });
  });
});
