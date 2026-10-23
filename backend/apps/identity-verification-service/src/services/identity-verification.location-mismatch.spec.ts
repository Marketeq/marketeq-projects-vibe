import { IdentityVerificationService } from './identity-verification.service';
import { LocationLookupUnavailableException } from '../common/errors/domain-exceptions';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-06T12:00:00.000Z');

/**
 * Focused spec for the returning-user new-location signal on GET /me. Countries
 * are mocked through the provider; nothing here talks to location-service.
 */
describe('IdentityVerificationService — getLocationMismatch', () => {
  const buildService = (resolve: jest.Mock) => {
    const profileRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    const locationProvider = {
      resolve,
      resolveDisplay: jest.fn(),
      resolveCoordinates: jest.fn(),
    };
    const service = new IdentityVerificationService(
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      locationProvider as any,
      {} as any,
      { publish: jest.fn() } as any,
    );
    return { service, profileRepository, locationProvider };
  };

  const liveCountry = (countryCode: string | null) =>
    jest.fn().mockResolvedValue(countryCode === null ? null : { countryCode, regionState: null, city: null });

  const profile = (overrides: Record<string, unknown> = {}): any => ({
    userId: 'u1',
    verifiedHomeCountry: 'US',
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    travelClassification: null,
    travelModeActive: false,
    travelModeActivatedAt: null,
    declaredDuration: null,
    ...overrides,
  });

  it('is true when the live country differs from the verified home country', async () => {
    const { service } = buildService(liveCountry('DE'));
    await expect(service.getLocationMismatch(profile(), '203.0.113.5', NOW)).resolves.toBe(true);
  });

  it('is false when the live country matches, ignoring case', async () => {
    const { service } = buildService(liveCountry('us'));
    await expect(service.getLocationMismatch(profile(), '203.0.113.5', NOW)).resolves.toBe(false);
  });

  it('is false without a verified home country, and does not look anything up', async () => {
    const resolve = liveCountry('DE');
    const { service } = buildService(resolve);
    await expect(
      service.getLocationMismatch(profile({ verifiedHomeCountry: null }), '203.0.113.5', NOW),
    ).resolves.toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('is false without an IP, and does not look anything up', async () => {
    const resolve = liveCountry('DE');
    const { service } = buildService(resolve);
    await expect(service.getLocationMismatch(profile(), null, NOW)).resolves.toBe(false);
    await expect(service.getLocationMismatch(profile(), undefined, NOW)).resolves.toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('is false when the live country is unknown', async () => {
    const { service } = buildService(liveCountry(null));
    await expect(service.getLocationMismatch(profile(), '203.0.113.5', NOW)).resolves.toBe(false);
  });

  it('is false while Travel Mode is active, and does not look anything up', async () => {
    const resolve = liveCountry('DE');
    const { service } = buildService(resolve);
    const active = profile({
      travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
      travelModeActive: true,
      travelModeActivatedAt: new Date(NOW - DAY_MS),
      declaredDuration: DeclaredDuration.A_FEW_DAYS,
    });
    await expect(service.getLocationMismatch(active, '203.0.113.5', NOW)).resolves.toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('self-heals a leftover classification with no duration: the prompt is offered again', async () => {
    // Rows written by the old click-time classification (temporarily_traveling, no
    // duration, Travel Mode off) block nothing and no longer hide the prompt.
    const { service } = buildService(liveCountry('DE'));
    const stranded = profile({ travelClassification: TravelClassification.TEMPORARILY_TRAVELING });
    await expect(service.getLocationMismatch(stranded, '203.0.113.5', NOW)).resolves.toBe(true);
  });

  describe('stays quiet while a home-country change is unfinished', () => {
    it.each([
      ['a running Didit session', { identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }],
      ['a Didit session in review', { identityVerificationStatus: IdentityVerificationStatus.PENDING }],
      ['a claim after a decline', { pendingHomeCountry: 'DE', identityVerificationStatus: IdentityVerificationStatus.FAILED }],
      ['a claim in the decline cooldown', { pendingHomeCountry: 'DE', identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }],
    ])('%s: no new-location prompt', async (_label, over) => {
      const { service, locationProvider } = buildService(liveCountry('DE'));
      await expect(service.getLocationMismatch(profile(over), '203.0.113.5', NOW)).resolves.toBe(false);
      expect(locationProvider.resolve).not.toHaveBeenCalled();
    });

    describe('a claim with no live session does not lock the user out', () => {
    it.each([
      ['abandoned or expired (unstarted)', IdentityVerificationStatus.UNSTARTED],
      ['confirmed but the session never started (verified)', IdentityVerificationStatus.VERIFIED],
      ['confirmed on an expired verification', IdentityVerificationStatus.EXPIRED],
    ])('%s: the prompt is offered again', async (_label, identityVerificationStatus) => {
      const { service } = buildService(liveCountry('DE'));
      const stranded = profile({ pendingHomeCountry: 'DE', identityVerificationStatus });
      await expect(service.getLocationMismatch(stranded, '203.0.113.5', NOW)).resolves.toBe(true);
    });

    it('the active-traveler prompt is offered again too', async () => {
      const { service } = buildService(liveCountry('DE'));
      const traveler = profile({
        pendingHomeCountry: 'DE',
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        travelModeActivatedAt: new Date(NOW - DAY_MS),
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
      });
      await expect(service.getTravelModeLocationMismatch(traveler, '203.0.113.5', NOW)).resolves.toBe(true);
    });
  });

  it('the active-traveler prompt is quiet too', async () => {
      const { service } = buildService(liveCountry('DE'));
      const traveler = profile({
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        travelModeActivatedAt: new Date(NOW - DAY_MS),
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
      });
      await expect(service.getTravelModeLocationMismatch(traveler, '203.0.113.5', NOW)).resolves.toBe(true);
      for (const over of [
        { pendingHomeCountry: 'DE', identityVerificationStatus: IdentityVerificationStatus.FAILED },
        { identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS },
        { identityVerificationStatus: IdentityVerificationStatus.PENDING },
      ]) {
        await expect(service.getTravelModeLocationMismatch({ ...traveler, ...over }, '203.0.113.5', NOW)).resolves.toBe(false);
      }
    });
  });

  it('is true again once the Travel Mode period has ended', async () => {
    const { service } = buildService(liveCountry('DE'));
    const expired = profile({
      travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
      travelModeActive: true,
      travelModeActivatedAt: new Date(NOW - 10 * DAY_MS),
      declaredDuration: DeclaredDuration.A_FEW_DAYS, // 6 days
    });
    await expect(service.getLocationMismatch(expired, '203.0.113.5', NOW)).resolves.toBe(true);
  });

  it('is false, not an error, when the location lookup is unavailable', async () => {
    const resolve = jest.fn().mockRejectedValue(new LocationLookupUnavailableException({ reason: 'request_failed' }));
    const { service } = buildService(resolve);
    await expect(service.getLocationMismatch(profile(), '203.0.113.5', NOW)).resolves.toBe(false);
  });

  it('does not swallow unexpected errors', async () => {
    const { service } = buildService(jest.fn().mockRejectedValue(new Error('boom')));
    await expect(service.getLocationMismatch(profile(), '203.0.113.5', NOW)).rejects.toThrow('boom');
  });

  it('uses only the free IP lookup and persists nothing', async () => {
    const { service, profileRepository, locationProvider } = buildService(liveCountry('DE'));
    await service.getLocationMismatch(profile(), '203.0.113.5', NOW);
    expect(locationProvider.resolve).toHaveBeenCalledTimes(1);
    expect(locationProvider.resolveDisplay).not.toHaveBeenCalled();
    expect(locationProvider.resolveCoordinates).not.toHaveBeenCalled();
    expect(profileRepository.save).not.toHaveBeenCalled();
    expect(profileRepository.update).not.toHaveBeenCalled();
  });
});

describe('ProfileStatusResponseDto — locationMismatch', () => {
  const entity: any = {
    verifiedHomeCountry: 'US',
    detectedCountry: 'US',
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    travelClassification: null,
    travelModeActive: false,
    travelModeActivatedAt: null,
    declaredDuration: null,
  };

  it('defaults to false on every response that does not compute it', () => {
    expect(ProfileStatusResponseDto.fromEntity(entity).locationMismatch).toBe(false);
  });

  it('carries the computed value on /me', () => {
    expect(ProfileStatusResponseDto.fromEntity(entity, undefined, NOW, true).locationMismatch).toBe(true);
    expect(ProfileStatusResponseDto.fromEntity(entity, undefined, NOW, false).locationMismatch).toBe(false);
  });

  it('does not change any other field', () => {
    const base = ProfileStatusResponseDto.fromEntity(entity, undefined, NOW);
    const withFlag = ProfileStatusResponseDto.fromEntity(entity, undefined, NOW, true);
    expect({ ...withFlag, locationMismatch: false }).toEqual(base);
  });
});
