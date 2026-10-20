import { IdentityVerificationService } from './identity-verification.service';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  DeclaredDuration,
} from '../entities/enums/identity-verification.enums';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

// PMCM-650, account side. An account that already has a verified home country
// never has it overwritten by confirming a DIFFERENT detected country: the claim
// is stored as PENDING (whether or not a relocation was declared first, so the
// confirmation endpoint cannot be used to bypass it) and only a Didit approval
// (see free-kyc-home-country-change.spec.ts) replaces it. Confirming the SAME
// country only refreshes the confirmation. Every other account keeps the existing
// behaviour, which these tests also pin.
describe('home-country change — confirmation and classification', () => {
  const T0 = new Date('2026-10-20T12:00:00.000Z');

  beforeEach(() => jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  type Row = Record<string, any>;

  const verifiedProfile = (over: Row = {}): Row => ({
    id: 'profile-1',
    userId: 'u1',
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date('2026-09-01T00:00:00.000Z'),
    detectedCountry: 'US',
    travelClassification: null,
    travelModeActive: false,
    declaredDuration: null,
    travelModeActivatedAt: null,
    nextTravelReminderAt: null,
    pendingHomeCountry: null,
    pendingHomeCountryConfirmedAt: null,
    pendingRelocationSessionId: null,
    ...over,
  });

  // `everApproved`: whether Didit has ever approved a hosted session for this profile.
  const build = (profile: Row | undefined, resolved: Row | null, everApproved = false) => {
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn((p: any) => Promise.resolve(p)),
    };
    const locationProvider = { resolve: jest.fn().mockResolvedValue(resolved) };
    const events = { publish: jest.fn() };
    const dataSource = { getRepository: jest.fn(() => ({ exist: jest.fn().mockResolvedValue(everApproved) })) };
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
      events as any,
    );
    return { service, profileRepository, events };
  };

  const CA = { countryCode: 'CA', regionState: 'ON', city: 'Toronto' };

  describe('recordTravelClassification', () => {
    it('declaring a relocation changes NOTHING on a fully verified account: no write, no status reset, no classification', async () => {
      const profile = verifiedProfile();
      const { service, profileRepository } = build(profile, null);

      await service.recordTravelClassification('u1', TravelClassification.PERMANENTLY_RELOCATED);

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(profile.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(profile.verifiedHomeCountry).toBe('US');
      expect(profile.travelClassification).toBeNull();
    });

    it('declaring a relocation leaves an active Travel Mode exactly as it is', async () => {
      const profile = verifiedProfile({
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
        travelModeActivatedAt: new Date(),
      });
      const { service, profileRepository } = build(profile, null);

      await service.recordTravelClassification('u1', TravelClassification.PERMANENTLY_RELOCATED);

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(profile.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
      expect(profile.travelModeActive).toBe(true);
    });

    it('an account whose claim is already in flight (identity failed mid-retry) keeps its location status too', async () => {
      const profile = verifiedProfile({
        identityVerificationStatus: IdentityVerificationStatus.FAILED,
        pendingHomeCountry: 'CA',
      });
      const { service } = build(profile, null);

      await service.recordTravelClassification('u1', TravelClassification.PERMANENTLY_RELOCATED);

      expect(profile.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(profile.verifiedHomeCountry).toBe('US');
    });

    it('any other account still has its location status reset, exactly as before', async () => {
      const unverifiedIdentity = verifiedProfile({ identityVerificationStatus: IdentityVerificationStatus.UNSTARTED });
      const { service } = build(unverifiedIdentity, null);

      await service.recordTravelClassification('u1', TravelClassification.PERMANENTLY_RELOCATED);

      expect(unverifiedIdentity.locationVerificationStatus).toBe(LocationVerificationStatus.NOT_VERIFIED);
    });

    it('choosing "temporarily traveling" withdraws a pending claim and its session link', async () => {
      const profile = verifiedProfile({
        travelClassification: TravelClassification.PERMANENTLY_RELOCATED,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(),
        pendingRelocationSessionId: 'session-row-1',
      });
      const { service } = build(profile, null);

      await service.recordTravelClassification('u1', TravelClassification.TEMPORARILY_TRAVELING);

      expect(profile.pendingHomeCountry).toBeNull();
      expect(profile.pendingHomeCountryConfirmedAt).toBeNull();
      expect(profile.pendingRelocationSessionId).toBeNull();
      expect(profile.verifiedHomeCountry).toBe('US');
    });

    it.each([
      ['running', IdentityVerificationStatus.IN_PROGRESS],
      ['in review', IdentityVerificationStatus.PENDING],
    ])('is refused while the claim\'s Didit session is %s: nothing is withdrawn or written', async (_label, status) => {
      const profile = verifiedProfile({
        identityVerificationStatus: status,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(),
        pendingRelocationSessionId: 'session-row-1',
      });
      const { service, profileRepository } = build(profile, null);

      await expect(service.recordTravelClassification('u1', TravelClassification.TEMPORARILY_TRAVELING)).rejects.toMatchObject({
        code: 'HOME_COUNTRY_CHANGE_IN_PROGRESS',
      });

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(profile.pendingHomeCountry).toBe('CA');
      expect(profile.pendingRelocationSessionId).toBe('session-row-1');
    });
  });

  describe('confirmHomeCountry after a declared relocation', () => {
    const relocating = (over: Row = {}) =>
      verifiedProfile({ travelClassification: TravelClassification.PERMANENTLY_RELOCATED, ...over });

    it('stores the detected country as PENDING and preserves the current home country and status', async () => {
      const profile = relocating();
      const { service, events } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountryConfirmedAt).toEqual(T0);
      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.verifiedHomeCountryConfirmedAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
      expect(saved.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(saved.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
      expect(saved.travelClassification).toBe(TravelClassification.PERMANENTLY_RELOCATED);
      // Nothing is announced until Didit approves.
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('the country comes from the server-side lookup, never from the caller', async () => {
      const profile = relocating();
      const { service } = build(profile, CA);
      // The service API takes only the user id and the request IP.
      expect(service.confirmHomeCountry.length).toBeLessThanOrEqual(2);
      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');
      expect(saved.pendingHomeCountry).toBe('CA');
    });

    it('a failed lookup writes nothing: the existing state, claim and home country stay', async () => {
      const profile = relocating({ pendingHomeCountry: 'CA', pendingHomeCountryConfirmedAt: new Date(0) });
      const { service, profileRepository } = build(profile, null);

      await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toThrow();

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(profile.pendingHomeCountry).toBe('CA');
      expect(profile.verifiedHomeCountry).toBe('US');
    });

    it('keeps Travel Mode (and the verified country) untouched: only an approval ends it', async () => {
      const profile = relocating({
        travelModeActive: true,
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
        travelModeActivatedAt: new Date(),
        nextTravelReminderAt: new Date(),
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.travelModeActive).toBe(true);
      expect(saved.declaredDuration).toBe(DeclaredDuration.A_FEW_DAYS);
      expect(saved.travelModeActivatedAt).toBeInstanceOf(Date);
      expect(saved.nextTravelReminderAt).toBeInstanceOf(Date);
      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.pendingHomeCountry).toBe('CA');
    });

    it('re-confirming the SAME pending country refreshes the 15-minute basis and keeps the session link (valid retry)', async () => {
      const profile = relocating({
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(Date.now() - 20 * 60 * 1000),
        pendingRelocationSessionId: 'session-row-1',
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountryConfirmedAt).toEqual(T0);
      expect(saved.pendingRelocationSessionId).toBe('session-row-1');
    });

    it('confirming a DIFFERENT country is a new claim: the old session link is dropped', async () => {
      const profile = relocating({
        pendingHomeCountry: 'MX',
        pendingHomeCountryConfirmedAt: new Date(),
        pendingRelocationSessionId: 'session-row-1',
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.pendingRelocationSessionId).toBeNull();
    });

    it('an in-flight claim (identity failed, retrying) is re-confirmed as pending and never overwrites the verified country', async () => {
      const profile = relocating({
        identityVerificationStatus: IdentityVerificationStatus.FAILED,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(Date.now() - 30 * 60 * 1000),
        pendingRelocationSessionId: 'session-row-1',
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountryConfirmedAt).toEqual(T0);
      expect(saved.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED);
    });

    it('detecting the SAME country as the verified one means nothing moved: the claim is dropped and the confirmation refreshed, no event', async () => {
      const profile = relocating({ pendingHomeCountry: 'CA', pendingRelocationSessionId: 'session-row-1' });
      const { service, events } = build(profile, { countryCode: 'US', regionState: 'NY', city: 'New York' });

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBeNull();
      expect(saved.pendingRelocationSessionId).toBeNull();
      expect(saved.travelClassification).toBeNull();
      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.verifiedHomeCountryConfirmedAt).toEqual(T0);
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('the confirmation endpoint cannot be used to bypass the pending claim', () => {
    it('a verified account with NO relocation declared that confirms a different country gets a pending claim, not an overwrite', async () => {
      const profile = verifiedProfile(); // classification null: the relocation step was skipped
      const { service, events } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.verifiedHomeCountryConfirmedAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
      expect(saved.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountryConfirmedAt).toEqual(T0);
      // The claim itself (pendingHomeCountry) is what a session start accepts; no
      // classification is written for it.
      expect(saved.travelClassification).toBeNull();
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('so does a verified traveler: Travel Mode is kept and the home country is not replaced', async () => {
      const profile = verifiedProfile({
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
        travelModeActivatedAt: new Date(),
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.pendingHomeCountry).toBe('CA');
      expect(saved.travelModeActive).toBe(true);
      expect(saved.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
    });

    it('an account whose identity was verified before (a Didit approval on record) is held even though it is not verified right now', async () => {
      const profile = verifiedProfile({ identityVerificationStatus: IdentityVerificationStatus.UNSTARTED });
      const { service, events } = build(profile, CA, true);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.pendingHomeCountry).toBe('CA');
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('so is one whose verification expired, with no lookup needed', async () => {
      const profile = verifiedProfile({ identityVerificationStatus: IdentityVerificationStatus.EXPIRED });
      const { service } = build(profile, CA, false);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.pendingHomeCountry).toBe('CA');
    });

    it('a verified account confirming the SAME country only refreshes the confirmation: no claim, no event', async () => {
      const profile = verifiedProfile();
      const { service, events } = build(profile, { countryCode: 'US', regionState: 'NY', city: 'New York' });

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.verifiedHomeCountryConfirmedAt).toEqual(T0);
      expect(saved.pendingHomeCountry).toBeNull();
      expect(saved.travelClassification).toBeNull();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('a claim with a live Didit session is never cleared or replaced by a confirmation', () => {
    const US = { countryCode: 'US', regionState: 'NY', city: 'New York' };
    const claim = (status: IdentityVerificationStatus, over: Row = {}) =>
      verifiedProfile({
        identityVerificationStatus: status,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
        pendingRelocationSessionId: 'session-row-1',
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
        travelModeActivatedAt: new Date(Date.now() - 86_400_000),
        nextTravelReminderAt: new Date(Date.now() + 86_400_000),
        ...over,
      });

    it.each([
      ['running', IdentityVerificationStatus.IN_PROGRESS],
      ['in review', IdentityVerificationStatus.PENDING],
    ])('a same-country confirmation while the session is %s: 409 HOME_COUNTRY_CHANGE_IN_PROGRESS and NOTHING changes', async (_label, status) => {
      const profile = claim(status);
      const before = JSON.stringify(profile);
      const { service, profileRepository, events } = build(profile, US);

      await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toMatchObject({
        code: 'HOME_COUNTRY_CHANGE_IN_PROGRESS',
        status: 409,
      });

      expect(profileRepository.save).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
      expect(JSON.stringify(profile)).toBe(before);
      expect(profile).toMatchObject({
        verifiedHomeCountry: 'US',
        pendingHomeCountry: 'CA',
        pendingRelocationSessionId: 'session-row-1',
        identityVerificationStatus: status,
        travelModeActive: true,
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
      });
    });

    it.each([
      ['running', IdentityVerificationStatus.IN_PROGRESS],
      ['in review', IdentityVerificationStatus.PENDING],
    ])('another country (even the pending one again) while the session is %s is refused the same way', async (_label, status) => {
      for (const detected of [{ countryCode: 'MX', regionState: null, city: null }, { countryCode: 'CA', regionState: 'ON', city: 'Toronto' }]) {
        const profile = claim(status);
        const before = JSON.stringify(profile);
        const { service, profileRepository } = build(profile, detected);

        await expect(service.confirmHomeCountry('u1', '198.51.100.9')).rejects.toMatchObject({ code: 'HOME_COUNTRY_CHANGE_IN_PROGRESS' });

        expect(profileRepository.save).not.toHaveBeenCalled();
        expect(JSON.stringify(profile)).toBe(before);
      }
    });

    it.each([
      ['abandoned or expired (unstarted)', IdentityVerificationStatus.UNSTARTED],
      ['declined (failed)', IdentityVerificationStatus.FAILED],
    ])('a claim whose session is %s keeps the existing behaviour: a same-country confirmation drops it', async (_label, status) => {
      const profile = claim(status);
      const { service } = build(profile, US);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBeNull();
      expect(saved.pendingRelocationSessionId).toBeNull();
      expect(saved.verifiedHomeCountry).toBe('US');
      expect(saved.travelModeActive).toBe(false); // the ordinary same-country confirmation ends Travel Mode
    });

    it('a different country on an abandoned claim still replaces the claim and drops the old session link', async () => {
      const profile = claim(IdentityVerificationStatus.UNSTARTED);
      const { service } = build(profile, { countryCode: 'MX', regionState: null, city: null });

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBe('MX');
      expect(saved.pendingRelocationSessionId).toBeNull();
      expect(saved.verifiedHomeCountry).toBe('US');
    });

    it('an ordinary in-progress or in-review account with NO claim is not affected (first-time verification)', async () => {
      for (const status of [IdentityVerificationStatus.IN_PROGRESS, IdentityVerificationStatus.PENDING]) {
        const profile = verifiedProfile({
          identityVerificationStatus: status,
          locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
          verifiedHomeCountry: null,
          verifiedHomeCountryConfirmedAt: null,
        });
        const { service } = build(profile, CA);

        const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

        expect(saved.verifiedHomeCountry).toBe('CA');
        expect(saved.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      }
    });
  });

  describe('confirmHomeCountry is unchanged for every other account', () => {
    it('a first-time account still has its home country set and verified immediately', async () => {
      const profile = verifiedProfile({
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
        verifiedHomeCountry: null,
        verifiedHomeCountryConfirmedAt: null,
      });
      const { service, events } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('CA');
      expect(saved.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(saved.pendingHomeCountry).toBeNull();
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: IdentityVerificationEventType.LOCATION_VERIFIED }),
      );
    });

    it('an account with location verified but identity NOT verified and no claim keeps the existing behaviour (initial verification retries are unchanged)', async () => {
      const profile = verifiedProfile({ identityVerificationStatus: IdentityVerificationStatus.UNSTARTED });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountry).toBeNull();
    });

    it('an account whose identity is not verified keeps the existing overwrite-and-verify behaviour after a relocation declaration', async () => {
      const profile = verifiedProfile({
        identityVerificationStatus: IdentityVerificationStatus.FAILED,
        locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
        travelClassification: TravelClassification.PERMANENTLY_RELOCATED,
      });
      const { service } = build(profile, CA);

      const saved: any = await service.confirmHomeCountry('u1', '198.51.100.9');

      expect(saved.verifiedHomeCountry).toBe('CA');
      expect(saved.pendingHomeCountry).toBeNull();
      expect(saved.travelClassification).toBeNull();
    });
  });

  describe('status response', () => {
    const now = T0.getTime();

    it('omits the new field for an account with no claim (existing shape unchanged)', () => {
      const dto: any = ProfileStatusResponseDto.fromEntity(verifiedProfile() as any, undefined, now);
      expect('pendingHomeCountry' in dto).toBe(false);
    });

    it('shows the pending country while verifiedHomeCountry is still the old one', () => {
      const dto: any = ProfileStatusResponseDto.fromEntity(verifiedProfile({ pendingHomeCountry: 'CA' }) as any, undefined, now);
      expect(dto.pendingHomeCountry).toBe('CA');
      expect(dto.verifiedHomeCountry).toBe('US');
    });
  });
});
