import 'reflect-metadata';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from '../controllers/identity-verification.controller';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

// A verified CA traveler whose STORED detectedCountry is still CA (getOrCreateProfile fills it
// once) logs in from a request that now resolves to US. The mismatch signal, the pending
// claim and the confirmation must all come from the live request lookup, never from the
// stored value, and never from anything the client sends.
describe('stored detectedCountry=CA, live request lookup=US', () => {
  const NOW = Date.parse('2026-10-21T18:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  const traveler = (over: Record<string, unknown> = {}): any => ({
    id: 'profile-1',
    userId: 'u1',
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    verifiedHomeCountry: 'CA',
    verifiedHomeCountryConfirmedAt: new Date(NOW - 30 * DAY_MS),
    detectedCountry: 'CA', // stale
    detectedRegionState: null,
    detectedCity: null,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: new Date(NOW - DAY_MS),
    declaredDuration: DeclaredDuration.A_FEW_DAYS,
    nextTravelReminderAt: new Date(NOW + 2 * DAY_MS),
    pendingHomeCountry: null,
    pendingHomeCountryConfirmedAt: null,
    pendingRelocationSessionId: null,
    ...over,
  });

  const build = (profile: any) => {
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn((p: any) => Promise.resolve(p)),
      update: jest.fn(),
    };
    const locationProvider = {
      resolve: jest.fn().mockResolvedValue({ countryCode: 'US', regionState: null, city: null }),
      resolveDisplay: jest.fn(),
    };
    const dataSource = { getRepository: jest.fn(() => ({ exist: jest.fn().mockResolvedValue(true) })) };
    const service = new IdentityVerificationService(
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      {} as any,
      {} as any,
      {} as any,
      locationProvider as any,
      {} as any,
      { publish: jest.fn() } as any,
    );
    return { service, profileRepository, locationProvider };
  };

  it('/me contract: the traveler signal is true although the stored country equals home, and it comes from the live lookup', async () => {
    const profile = traveler();
    const { service, locationProvider } = build(profile);

    await expect(service.getTravelModeLocationMismatch(profile, '203.0.113.9', NOW)).resolves.toBe(true);
    expect(locationProvider.resolve).toHaveBeenCalledWith({ ipAddress: '203.0.113.9' });
    // The ordinary signal stays false during Travel Mode, and the stored value is untouched.
    await expect(service.getLocationMismatch(profile, '203.0.113.9', NOW)).resolves.toBe(false);
    expect(profile.detectedCountry).toBe('CA');

    const dto = ProfileStatusResponseDto.fromEntity(profile, undefined, NOW, false, null, true, null);
    expect(dto.travelModeLocationMismatch).toBe(true);
    expect(dto.verifiedHomeCountry).toBe('CA');
    expect(dto.locationMismatch).toBe(false);
  });

  it('confirming records the LIVE country (US) as pending; CA stays verified and Travel Mode stays on', async () => {
    const profile = traveler();
    const { service, locationProvider } = build(profile);

    const saved: any = await service.confirmHomeCountry('u1', '203.0.113.9');

    expect(locationProvider.resolve).toHaveBeenCalledWith({ ipAddress: '203.0.113.9' });
    expect(saved.pendingHomeCountry).toBe('US');
    expect(saved.verifiedHomeCountry).toBe('CA');
    expect(saved.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
    expect(saved.travelModeActive).toBe(true);
    expect(saved.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
    expect(saved.declaredDuration).toBe(DeclaredDuration.A_FEW_DAYS);
    expect(saved.pendingHomeCountryConfirmedAt).toBeInstanceOf(Date);
  });

  it('without a request IP nothing is claimed: the stored CA is never used as a fallback', async () => {
    const profile = traveler();
    const { service, profileRepository } = build(profile);

    await expect(service.confirmHomeCountry('u1', null)).rejects.toThrow();
    expect(profileRepository.save).not.toHaveBeenCalled();
    expect(profile.pendingHomeCountry).toBeNull();
  });

  it('the endpoint accepts no body or query, so a client cannot invent the country', () => {
    const args = Reflect.getMetadata(
      '__routeArguments__',
      IdentityVerificationController,
      'confirmHomeCountry',
    ) as Record<string, unknown> | undefined;
    // Only @Req() is injected: no @Body(), @Query() or @Param().
    const kinds = Object.keys(args ?? {}).map((k) => Number(k.split(':')[0]));
    const BODY = 3;
    const QUERY = 4;
    const PARAM = 5;
    expect(kinds.some((k) => k === BODY || k === QUERY || k === PARAM)).toBe(false);
  });
});
