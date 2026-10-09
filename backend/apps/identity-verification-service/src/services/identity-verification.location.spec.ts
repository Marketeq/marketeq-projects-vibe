import { Logger } from '@nestjs/common';
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
    it('resolves the current location server-side and confirms it as home country', async () => {
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

    it('never confirms a stale stored detectedCountry: it re-resolves the current IP and overwrites it', async () => {
      // First-ever detection was US; the user is now in CA.
      const existing = {
        userId: 'u1',
        detectedCountry: 'US',
        detectedRegionState: 'NY',
        detectedCity: 'New York',
        verifiedHomeCountry: 'US',
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      };
      const { service, locationProvider, profileRepository } = buildService(existing, {
        countryCode: 'CA',
        regionState: 'ON',
        city: 'Toronto',
      });

      const result = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(locationProvider.resolve).toHaveBeenCalledWith({ ipAddress: '198.51.100.9' });
      expect(result.detectedCountry).toBe('CA');
      expect(result.detectedRegionState).toBe('ON');
      expect(result.detectedCity).toBe('Toronto');
      expect(result.verifiedHomeCountry).toBe('CA');
      // One atomic write with everything from the same server-side result.
      expect(profileRepository.save).toHaveBeenCalledTimes(1);
    });

    it('records a fresh confirmation timestamp from the server clock', async () => {
      const existing = { userId: 'u1', verifiedHomeCountryConfirmedAt: new Date('2020-01-01T00:00:00Z') };
      const { service } = buildService(existing, { countryCode: 'US', regionState: null, city: null });
      const before = Date.now();
      const result: any = await service.confirmHomeCountry('u1', '198.51.100.9');
      expect(result.verifiedHomeCountryConfirmedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('does not fall back to the stored country when there is no IP to resolve', async () => {
      const existing = { userId: 'u1', detectedCountry: 'US' };
      const { service, locationProvider } = buildService(existing, { countryCode: 'US', regionState: null, city: null });

      await expect(service.confirmHomeCountry('u1', null)).rejects.toBeInstanceOf(NoDetectedLocationException);
      expect(locationProvider.resolve).not.toHaveBeenCalled();
    });

    describe('travel reset on a fresh server-side confirmation', () => {
      const travelling = () => ({
        userId: 'u1',
        detectedCountry: 'US',
        verifiedHomeCountry: 'US',
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        travelModeActive: true,
        travelClassification: 'temporarily_traveling',
        declaredDuration: 'one_to_two_weeks',
        travelModeActivatedAt: new Date('2026-09-20T00:00:00Z'),
        nextTravelReminderAt: new Date('2026-10-01T00:00:00Z'),
      });

      it('clears all five travel fields and saves the new confirmation in ONE atomic save', async () => {
        const existing: any = travelling();
        const { service, profileRepository } = buildService(existing, { countryCode: 'US', regionState: null, city: null });

        const result: any = await service.confirmHomeCountry('u1', '198.51.100.9');

        expect(result.travelModeActive).toBe(false);
        expect(result.travelClassification).toBeNull();
        expect(result.declaredDuration).toBeNull();
        expect(result.travelModeActivatedAt).toBeNull();
        expect(result.nextTravelReminderAt).toBeNull();
        expect(result.detectedCountry).toBe('US');
        expect(result.verifiedHomeCountry).toBe('US');
        expect(result.verifiedHomeCountryConfirmedAt).toBeInstanceOf(Date);
        expect(result.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
        expect(profileRepository.save).toHaveBeenCalledTimes(1);
      });

      it('does NOT clear travel state when the location lookup resolves nothing', async () => {
        const existing: any = travelling();
        const { service, profileRepository } = buildService(existing, null);

        await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toBeInstanceOf(NoDetectedLocationException);

        expect(existing.travelModeActive).toBe(true);
        expect(existing.travelClassification).toBe('temporarily_traveling');
        expect(existing.declaredDuration).toBe('one_to_two_weeks');
        expect(existing.travelModeActivatedAt).toBeInstanceOf(Date);
        expect(existing.nextTravelReminderAt).toBeInstanceOf(Date);
        expect(profileRepository.save).not.toHaveBeenCalled();
      });

      it('does NOT clear travel state when there is no IP to resolve', async () => {
        const existing: any = travelling();
        const { service, profileRepository } = buildService(existing, { countryCode: 'US', regionState: null, city: null });

        await expect(service.confirmHomeCountry('u1', null)).rejects.toBeInstanceOf(NoDetectedLocationException);

        expect(existing.travelModeActive).toBe(true);
        expect(profileRepository.save).not.toHaveBeenCalled();
      });

      it('does NOT clear travel state when the location provider itself fails', async () => {
        const existing: any = travelling();
        const { service, locationProvider, profileRepository } = buildService(existing, null);
        locationProvider.resolve.mockRejectedValue(new Error('location-service down'));

        await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toThrow('location-service down');

        expect(existing.travelModeActive).toBe(true);
        expect(existing.travelClassification).toBe('temporarily_traveling');
        expect(profileRepository.save).not.toHaveBeenCalled();
      });

      it('does NOT clear travel state when saving the confirmation fails', async () => {
        const existing: any = travelling();
        const { service, profileRepository } = buildService(existing, { countryCode: 'US', regionState: null, city: null });
        profileRepository.save.mockRejectedValue(new Error('db write failed'));

        await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toThrow('db write failed');
        // Nothing was persisted (a single failed save), so no partial state exists to report.
        expect(profileRepository.save).toHaveBeenCalledTimes(1);
      });

      it('leaves an already-clear profile clear (idempotent)', async () => {
        const existing: any = { userId: 'u1', travelModeActive: false, travelClassification: null, declaredDuration: null, travelModeActivatedAt: null, nextTravelReminderAt: null };
        const { service } = buildService(existing, { countryCode: 'US', regionState: null, city: null });
        const result: any = await service.confirmHomeCountry('u1', '198.51.100.9');
        expect(result.travelModeActive).toBe(false);
        expect(result.travelClassification).toBeNull();
      });
    });

    it('creates the profile when none exists yet and confirms from the live lookup', async () => {
      const { service, profileRepository } = buildService(null, { countryCode: 'DE', regionState: null, city: null });
      const result = await service.confirmHomeCountry('u1', '198.51.100.9');
      expect(profileRepository.create).toHaveBeenCalledWith({ userId: 'u1' });
      expect(result.verifiedHomeCountry).toBe('DE');
    });
  });

  describe('getDetectedLocationForDisplay', () => {
    it('asks the provider for the display view with the given effective IP', async () => {
      const shown = { countryCode: 'US', regionState: null, city: null, regionCode: null, latitude: 1, longitude: 2 };
      const { service, locationProvider } = buildService(null, null);
      (locationProvider as any).resolveDisplay = jest.fn().mockResolvedValue(shown);
      await expect(service.getDetectedLocationForDisplay('203.0.113.9')).resolves.toBe(shown);
      expect((locationProvider as any).resolveDisplay).toHaveBeenCalledWith({ ipAddress: '203.0.113.9' });
    });

    it('returns null without calling the provider when there is no IP', async () => {
      const { service, locationProvider } = buildService(null, null);
      (locationProvider as any).resolveDisplay = jest.fn();
      await expect(service.getDetectedLocationForDisplay(null)).resolves.toBeNull();
      expect((locationProvider as any).resolveDisplay).not.toHaveBeenCalled();
    });
  });

  describe('resolveGpsDisplay', () => {
    const IP_COUNTRY = { countryCode: 'US', regionState: null, city: null };
    const place = { countryCode: 'US', countryName: 'United States', city: 'Chicago', regionName: 'Illinois', regionCode: 'IL' };

    const gps = (ipLocation: any, resolvedPlace: any) => {
      const built = buildService(null, ipLocation);
      (built.locationProvider as any).resolveCoordinates = jest.fn().mockResolvedValue(resolvedPlace);
      return built;
    };

    it('resolved: display fields come from the provider, country from the server IP, coordinates rounded', async () => {
      const { service, locationProvider } = gps(IP_COUNTRY, place);
      await expect(service.resolveGpsDisplay('198.51.100.7', 41.878113, -87.629799)).resolves.toEqual({
        status: 'resolved', countryCode: 'US', countryName: 'United States',
        city: 'Chicago', regionCode: 'IL', regionName: 'Illinois', latitude: 41.88, longitude: -87.63,
      });
      expect((locationProvider as any).resolveCoordinates).toHaveBeenCalledWith({ latitude: 41.88, longitude: -87.63 });
    });

    it('country mismatch: shows nothing from the GPS result, keeps the server country, logs a fixed code only', async () => {
      const { service } = gps(IP_COUNTRY, { ...place, countryCode: 'CA' });
      const logged: string[] = [];
      jest.spyOn(Logger.prototype, 'warn').mockImplementation((m: any) => void logged.push(String(m)));
      const result = await service.resolveGpsDisplay('198.51.100.7', 43.65, -79.38);
      expect(result).toEqual({
        status: 'country_mismatch', countryCode: 'US', countryName: 'United States',
        city: null, regionCode: null, regionName: null, latitude: null, longitude: null,
      });
      expect(logged).toEqual(['gps_ip_country_mismatch']);
      jest.restoreAllMocks();
    });

    it('provider unavailable or no place: country-only fallback with no city, region or pin', async () => {
      for (const unresolved of [null, { ...place, countryCode: null }]) {
        const { service } = gps(IP_COUNTRY, unresolved);
        await expect(service.resolveGpsDisplay('198.51.100.7', 41.88, -87.63)).resolves.toEqual({
          status: 'unavailable', countryCode: 'US', countryName: 'United States',
          city: null, regionCode: null, regionName: null, latitude: null, longitude: null,
        });
      }
    });

    it('no server-derived country: unavailable, and the coordinates are never reverse-geocoded', async () => {
      const { service, locationProvider } = gps(null, place);
      await expect(service.resolveGpsDisplay('198.51.100.7', 41.88, -87.63)).resolves.toMatchObject({
        status: 'unavailable', countryCode: null, latitude: null, longitude: null,
      });
      expect((locationProvider as any).resolveCoordinates).not.toHaveBeenCalled();
      await expect(service.resolveGpsDisplay(null, 41.88, -87.63)).resolves.toMatchObject({ status: 'unavailable' });
    });

    it('persists nothing: no profile save, and the IP never appears in the result', async () => {
      const { service, profileRepository } = gps(IP_COUNTRY, place);
      const result = await service.resolveGpsDisplay('198.51.100.7', 41.878113, -87.629799);
      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(profileRepository.create).not.toHaveBeenCalled();
      const text = JSON.stringify(result);
      expect(text).not.toContain('198.51.100.7');
      expect(text).not.toContain('41.878113');
      expect(text).not.toContain('-87.629799');
    });
  });
});
