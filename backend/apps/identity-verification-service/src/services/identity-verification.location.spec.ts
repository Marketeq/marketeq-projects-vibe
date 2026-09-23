import { IdentityVerificationService } from './identity-verification.service';
import { LocationVerificationStatus } from '../entities/enums/identity-verification.enums';
import { NoDetectedLocationException } from '../common/errors/domain-exceptions';

/**
 * Focused spec for the LocationProvider backfill added to getOrCreateProfile
 * and confirmHomeCountry (Technical Architecture §11 integration). Only the
 * location-related behavior is covered here — the rest of
 * IdentityVerificationService has no spec file on this branch yet.
 */
describe('IdentityVerificationService — location backfill', () => {
  const buildService = (existingProfile: any, resolvedLocation: any) => {
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(existingProfile),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn((profile: any) => Promise.resolve(profile)),
    };
    const locationProvider = {
      resolve: jest.fn().mockResolvedValue(resolvedLocation),
    };
    const events = { publish: jest.fn() };

    const service = new IdentityVerificationService(
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      locationProvider as any,
      {} as any,
      events as any,
    );

    return { service, profileRepository, locationProvider, events };
  };

  describe('getOrCreateProfile', () => {
    it('does not call the LocationProvider when detectedCountry is already set', async () => {
      const existing = { userId: 'u1', detectedCountry: 'US' };
      const { service, locationProvider, profileRepository } = buildService(existing, null);

      const result = await service.getOrCreateProfile('u1', '203.0.113.5');

      expect(locationProvider.resolve).not.toHaveBeenCalled();
      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('does not call the LocationProvider when no IP is available', async () => {
      const existing = { userId: 'u1', detectedCountry: null };
      const { service, locationProvider } = buildService(existing, null);

      await service.getOrCreateProfile('u1', null);

      expect(locationProvider.resolve).not.toHaveBeenCalled();
    });

    it('backfills detectedCountry/detectedRegionState/detectedCity and saves when resolved', async () => {
      const existing = { userId: 'u1', detectedCountry: null };
      const resolved = { countryCode: 'US', regionState: 'NY', city: 'New York' };
      const { service, profileRepository } = buildService(existing, resolved);

      const result = await service.getOrCreateProfile('u1', '203.0.113.5');

      expect(result.detectedCountry).toBe('US');
      expect(result.detectedRegionState).toBe('NY');
      expect(result.detectedCity).toBe('New York');
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ detectedCountry: 'US' }),
      );
    });

    it('does not write anything when the provider fails to resolve a location', async () => {
      const existing = { userId: 'u1', detectedCountry: null };
      const { service, profileRepository } = buildService(existing, null);

      const result = await service.getOrCreateProfile('u1', '203.0.113.5');

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('still creates and saves a brand new profile even with no IP', async () => {
      const { service, profileRepository } = buildService(undefined, null);

      await service.getOrCreateProfile('u1', null);

      expect(profileRepository.create).toHaveBeenCalledWith({ userId: 'u1' });
      expect(profileRepository.save).toHaveBeenCalled();
    });
  });

  describe('confirmHomeCountry', () => {
    it('backfills the location first, then confirms it as home country', async () => {
      const existing = {
        userId: 'u1',
        detectedCountry: null,
        verifiedHomeCountry: null,
        locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      };
      const resolved = { countryCode: 'CA', regionState: 'ON', city: 'Toronto' };
      const { service } = buildService(existing, resolved);

      const result = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(result.verifiedHomeCountry).toBe('CA');
      expect(result.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
    });

    it('still throws NoDetectedLocationException when the provider cannot resolve anything', async () => {
      const existing = { userId: 'u1', detectedCountry: null };
      const { service } = buildService(existing, null);

      await expect(service.confirmHomeCountry('u1', '203.0.113.5')).rejects.toBeInstanceOf(
        NoDetectedLocationException,
      );
    });
  });
});
