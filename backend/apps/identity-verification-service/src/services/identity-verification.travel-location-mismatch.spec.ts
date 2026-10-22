import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from '../controllers/identity-verification.controller';
import { TwoStageVerificationService } from './two-stage-verification.service';
import { FreeKycService } from './free-kyc.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { VPN_PROXY_DETECTION_PROVIDER } from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import { LocationLookupUnavailableException } from '../common/errors/domain-exceptions';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  VpnProxyDetectionResult,
} from '../entities/enums/identity-verification.enums';

// PMCM-650: the "still traveling?" signal. getLocationMismatch stays false while
// Travel Mode is in force (the ordinary new-location prompt is not for travelers);
// this separate signal is true only for an ACTIVE traveler whose live IP country is
// different from the verified home country. It is read-only, omitted from the
// response unless true, and says nothing about when to show the prompt (the screen
// shows it once per login).
describe('travelModeLocationMismatch', () => {
  const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
  const DAY = 24 * 60 * 60 * 1000;

  const traveler = (over: Record<string, any> = {}): any => ({
    id: 'p1',
    userId: 'u1',
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    verifiedHomeCountry: 'US',
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: new Date(NOW - DAY),
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, // 13 days: still in force
    ...over,
  });

  const build = (resolve: jest.Mock) => {
    const service = new IdentityVerificationService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { resolve } as any,
      {} as any,
      { publish: jest.fn() } as any,
    );
    return service;
  };
  const live = (countryCode: string) => jest.fn().mockResolvedValue({ countryCode, regionState: null, city: null });

  describe('the service rule', () => {
    it('an active traveler detected in a DIFFERENT country: true', async () => {
      await expect(build(live('CA')).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(true);
    });

    it('a third country is the same signal: it only asks whether the country differs from the verified home country', async () => {
      await expect(build(live('MX')).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(true);
    });

    it('the verified home country (any letter case): false', async () => {
      await expect(build(live('us')).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(false);
    });

    it.each([
      ['Travel Mode is not active', { travelModeActive: false, travelClassification: null, travelModeActivatedAt: null, declaredDuration: null }],
      ['the period has ended', { travelModeActivatedAt: new Date(NOW - 20 * DAY) }],
      ['a duration was never chosen (classified only)', { travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }],
      ['the active flag is set but the activation is invalid', { travelModeActivatedAt: null }],
      ['there is no verified home country', { verifiedHomeCountry: null }],
    ])('false when %s, without looking the country up when it cannot matter', async (_why, patch) => {
      const resolve = live('CA');
      await expect(build(resolve).getTravelModeLocationMismatch(traveler(patch), '198.51.100.9', NOW)).resolves.toBe(false);
    });

    it('does not even resolve the IP when Travel Mode is not in force', async () => {
      const resolve = live('CA');
      await build(resolve).getTravelModeLocationMismatch(traveler({ travelModeActive: false }), '198.51.100.9', NOW);
      expect(resolve).not.toHaveBeenCalled();
    });

    it('no IP, an unknown country or an unavailable lookup is false and never fails the status read', async () => {
      await expect(build(live('CA')).getTravelModeLocationMismatch(traveler(), null, NOW)).resolves.toBe(false);
      await expect(build(jest.fn().mockResolvedValue(null)).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(false);
      const unavailable = jest.fn().mockRejectedValue(new LocationLookupUnavailableException());
      await expect(build(unavailable).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(false);
    });

    it('an unexpected lookup error is not swallowed as "no mismatch"', async () => {
      const boom = jest.fn().mockRejectedValue(new Error('boom'));
      await expect(build(boom).getTravelModeLocationMismatch(traveler(), '198.51.100.9', NOW)).rejects.toThrow('boom');
    });

    it('the existing ordinary signal is unchanged: still false for the same active traveler', async () => {
      await expect(build(live('CA')).getLocationMismatch(traveler(), '198.51.100.9', NOW)).resolves.toBe(false);
    });

    it('and the ordinary signal is still true for a non-traveler in another country', async () => {
      const nonTraveler = traveler({ travelModeActive: false, travelClassification: null, travelModeActivatedAt: null, declaredDuration: null });
      await expect(build(live('CA')).getLocationMismatch(nonTraveler, '198.51.100.9', NOW)).resolves.toBe(true);
    });
  });

  describe('the response', () => {
    it('adds the key only when the signal is true; every other response keeps exactly its old keys', () => {
      const without: any = ProfileStatusResponseDto.fromEntity(traveler(), undefined, NOW, false, null, false);
      const withSignal: any = ProfileStatusResponseDto.fromEntity(traveler(), undefined, NOW, false, null, true);
      const omitted: any = ProfileStatusResponseDto.fromEntity(traveler(), undefined, NOW);

      expect('travelModeLocationMismatch' in without).toBe(false);
      expect('travelModeLocationMismatch' in omitted).toBe(false);
      expect(withSignal.travelModeLocationMismatch).toBe(true);
      expect(Object.keys(withSignal).filter((k) => !(k in without))).toEqual(['travelModeLocationMismatch']);
      // The ordinary signal is not affected by it.
      expect(withSignal.locationMismatch).toBe(false);
    });
  });

  describe('GET /v1/identity-verification/me (HTTP)', () => {
    let app: INestApplication;
    const service = {
      getOrCreateProfile: jest.fn(),
      getVerificationSummary: jest.fn(),
      getLocationMismatch: jest.fn(),
      getTravelModeLocationMismatch: jest.fn(),
      getLoginReminderAt: jest.fn(),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      service.getOrCreateProfile.mockResolvedValue(traveler());
      service.getVerificationSummary.mockResolvedValue(undefined);
      service.getLocationMismatch.mockResolvedValue(false);
      service.getTravelModeLocationMismatch.mockResolvedValue(false);
      service.getLoginReminderAt.mockResolvedValue(null);
      const moduleRef = await Test.createTestingModule({
        controllers: [IdentityVerificationController],
        providers: [
          { provide: IdentityVerificationService, useValue: service },
          { provide: TwoStageVerificationService, useValue: {} },
          { provide: FreeKycService, useValue: {} },
          { provide: VPN_PROXY_DETECTION_PROVIDER, useValue: { detect: jest.fn().mockResolvedValue(VpnProxyDetectionResult.NONE) } },
          VpnProxyCheckGuard,
        ],
      })
        .overrideGuard(BearerAuthGuard)
        .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'u1'), true) })
        .compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();
    });
    afterEach(async () => app.close());

    it('reports the signal for an active traveler in another country, with the ordinary signal still false', async () => {
      service.getTravelModeLocationMismatch.mockResolvedValue(true);
      const res = await request(app.getHttpServer()).get('/v1/identity-verification/me');
      expect(res.status).toBe(200);
      expect(res.body.travelModeLocationMismatch).toBe(true);
      expect(res.body.locationMismatch).toBe(false);
      expect(service.getTravelModeLocationMismatch).toHaveBeenCalledTimes(1);
    });

    it('omits the key otherwise', async () => {
      const res = await request(app.getHttpServer()).get('/v1/identity-verification/me');
      expect(res.status).toBe(200);
      expect('travelModeLocationMismatch' in res.body).toBe(false);
    });
  });
});
