import { ProfileStatusResponseDto } from './profile-status.response.dto';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { buildVerificationSummary } from '../../common/status/verification-summary';

// The append-only Travel Mode fields of GET /me: travelModeEndsAt, travelModeExpired,
// travelReminderDue and travelReminderAvailableAt. The clock is always explicit.
describe('ProfileStatusResponseDto — Travel Mode fields', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
  const at = (days: number, offsetMs = 0) => new Date(ACTIVATED.getTime() + days * DAY + offsetMs);
  const iso = (d: Date) => d.toISOString();
  const TRAVELING = TravelClassification.TEMPORARILY_TRAVELING;

  const EXISTING_KEYS = [
    'verifiedHomeCountry', 'detectedCountry', 'detectedRegionState', 'detectedCity', 'timeZone',
    'travelClassification', 'declaredDuration', 'travelModeActive',
    'identityVerificationStatus', 'identityRejectionReason', 'locationVerificationStatus',
    'reconfirmationRequired', 'fullyVerified',
  ];
  const NEW_TRAVEL_KEYS = ['travelModeEndsAt', 'travelModeExpired', 'travelReminderDue', 'travelReminderAvailableAt'];
  // Appended after the Travel Mode fields: the returning-user new-location signal (always present, false unless /me computes it).
  const NEW_LOCATION_KEYS = ['locationMismatch'];

  const profile = (over: Record<string, unknown> = {}) =>
    ({
      id: 'profile-1',
      userId: 'user-1',
      verifiedHomeCountry: 'US',
      detectedCountry: 'FR',
      detectedRegionState: 'IDF',
      detectedCity: 'Paris',
      timeZone: 'Europe/Paris',
      travelClassification: TRAVELING,
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, // 13 days
      travelModeActive: true,
      travelModeActivatedAt: ACTIVATED,
      lastTravelReminderSentAt: null,
      nextTravelReminderAt: at(3),
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      identityRejectionReason: null,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      ...over,
    }) as any;
  const dto = (over: Record<string, unknown>, nowMs: number) => ProfileStatusResponseDto.fromEntity(profile(over), undefined, nowMs);
  const travel = (d: ProfileStatusResponseDto) => ({
    endsAt: d.travelModeEndsAt,
    expired: d.travelModeExpired,
    due: d.travelReminderDue,
    availableAt: d.travelReminderAvailableAt,
  });

  describe('append-only: every existing field is unchanged', () => {
    it('the response is exactly the old keys plus the four new ones and the location signal', () => {
      const keys = Object.keys(dto({}, at(1).getTime())).sort();
      expect(keys).toEqual([...EXISTING_KEYS, ...NEW_TRAVEL_KEYS, ...NEW_LOCATION_KEYS].sort());
    });

    it('with a summary the seven summary fields are still added, and nothing else', () => {
      const summary = buildVerificationSummary({
        identityStatus: IdentityVerificationStatus.UNSTARTED,
        locationStatus: LocationVerificationStatus.VERIFIED,
        failedFinalAt: null,
        hostedCycleAttempts: 0,
        hasActiveHostedSession: false,
        verifiedHomeCountry: 'US',
        verifiedHomeCountryConfirmedAt: new Date(at(1).getTime() - 60_000),
        travelModeActive: true,
        travelClassification: TRAVELING,
        nowMs: at(1).getTime(),
      });
      const keys = Object.keys(ProfileStatusResponseDto.fromEntity(profile(), summary, at(1).getTime())).sort();
      expect(keys).toEqual(
        [...EXISTING_KEYS, ...NEW_TRAVEL_KEYS, ...NEW_LOCATION_KEYS, 'nextAction', 'attemptsUsed', 'attemptsRemaining', 'maxAttempts', 'canRetry', 'retryAvailableAt', 'hasActiveSession'].sort(),
      );
    });

    it('the existing values are exactly what they were', () => {
      const d = dto({}, at(1).getTime());
      expect(d).toMatchObject({
        verifiedHomeCountry: 'US',
        detectedCountry: 'FR',
        detectedRegionState: 'IDF',
        detectedCity: 'Paris',
        timeZone: 'Europe/Paris',
        travelClassification: TRAVELING,
        declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
        travelModeActive: true,
        identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
        identityRejectionReason: null,
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        reconfirmationRequired: true, // verified US, detected FR: unchanged rule
        fullyVerified: false,
      });
    });

    it('a different state leaves the existing fields exactly as before', () => {
      const d = dto({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null, travelClassification: null }, at(1).getTime());
      expect(d).toMatchObject({ travelModeActive: false, declaredDuration: null, travelClassification: null });
    });

    it('serializes ISO strings and null (no Date objects)', () => {
      const json = JSON.parse(JSON.stringify(dto({}, at(1).getTime())));
      expect(json.travelModeEndsAt).toBe(iso(at(13)));
      expect(json.travelReminderAvailableAt).toBe(iso(at(3)));
      expect(typeof json.travelModeExpired).toBe('boolean');
      expect(typeof json.travelReminderDue).toBe('boolean');
      const none = JSON.parse(JSON.stringify(dto({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }, at(1).getTime())));
      expect(none.travelModeEndsAt).toBeNull();
      expect(none.travelReminderAvailableAt).toBeNull();
    });
  });

  describe('active Travel Mode', () => {
    it('before day 3: end time known, not expired, day 3 is the future availability', () => {
      expect(travel(dto({}, at(1).getTime()))).toEqual({ endsAt: iso(at(13)), expired: false, due: false, availableAt: iso(at(3)) });
    });
    it('1 ms before day 3: not due', () => {
      expect(travel(dto({}, at(3, -1).getTime()))).toMatchObject({ due: false, availableAt: iso(at(3)) });
    });
    it('exactly at day 3: due, and the time stays day 3', () => {
      expect(travel(dto({}, at(3).getTime()))).toMatchObject({ due: true, availableAt: iso(at(3)) });
    });
    it('1 ms after day 3: still due with the same time', () => {
      expect(travel(dto({}, at(3, 1).getTime()))).toMatchObject({ due: true, availableAt: iso(at(3)) });
    });
    it('catch-up: day 3 is still due on day 5 until claimed', () => {
      expect(travel(dto({}, at(5).getTime()))).toMatchObject({ due: true, availableAt: iso(at(3)) });
    });
  });

  describe('after claims', () => {
    it('after the day-3 claim the next read returns day 7 (future, not due)', () => {
      const lastTravelReminderSentAt = at(3, 5000);
      expect(travel(dto({ lastTravelReminderSentAt }, at(4).getTime()))).toMatchObject({ due: false, availableAt: iso(at(7)) });
    });
    it('day 7: 1 ms before not due, exactly at it due', () => {
      const lastTravelReminderSentAt = at(3);
      expect(travel(dto({ lastTravelReminderSentAt }, at(7, -1).getTime()))).toMatchObject({ due: false, availableAt: iso(at(7)) });
      expect(travel(dto({ lastTravelReminderSentAt }, at(7).getTime()))).toMatchObject({ due: true, availableAt: iso(at(7)) });
    });
    it('both missed then one claim consumes both: nothing left (already claimed)', () => {
      expect(travel(dto({ lastTravelReminderSentAt: at(9) }, at(10).getTime()))).toMatchObject({ due: false, availableAt: null });
    });
    it('claimed at day 7: completed, though Travel Mode is still active', () => {
      const d = dto({ lastTravelReminderSentAt: at(7) }, at(8).getTime());
      expect(d.travelModeActive).toBe(true);
      expect(travel(d)).toMatchObject({ due: false, availableAt: null });
    });
  });

  describe('the 6-day duration', () => {
    const sixDay = { declaredDuration: DeclaredDuration.A_FEW_DAYS };
    it('knows its end and has only day 3', () => {
      expect(travel(dto(sixDay, at(1).getTime()))).toEqual({ endsAt: iso(at(6)), expired: false, due: false, availableAt: iso(at(3)) });
    });
    it('day 3 stays claimable until the last millisecond before the end', () => {
      expect(travel(dto(sixDay, at(6, -1).getTime()))).toMatchObject({ expired: false, due: true, availableAt: iso(at(3)) });
    });
    it('after the day-3 claim there is no day 7: nothing is available', () => {
      expect(travel(dto({ ...sixDay, lastTravelReminderSentAt: at(3) }, at(4).getTime()))).toMatchObject({ due: false, availableAt: null });
    });
  });

  describe('expired', () => {
    it('exactly at the end: expired, end time still reported, nothing to claim', () => {
      expect(travel(dto({ declaredDuration: DeclaredDuration.A_FEW_DAYS }, at(6).getTime()))).toEqual({
        endsAt: iso(at(6)),
        expired: true,
        due: false,
        availableAt: null,
      });
    });
    it('1 ms before the end it is not expired', () => {
      expect(travel(dto({ declaredDuration: DeclaredDuration.A_FEW_DAYS }, at(6, -1).getTime())).expired).toBe(false);
    });
    it.each([
      ['raw flag still true', true],
      ['raw flag already false (persisted)', false],
    ])('long after the end (%s): expired with nothing to claim', (_label, travelModeActive) => {
      expect(travel(dto({ travelModeActive, declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS }, at(20).getTime()))).toEqual({
        endsAt: iso(at(13)),
        expired: true,
        due: false,
        availableAt: null,
      });
    });
    it.each([
      [DeclaredDuration.A_FEW_DAYS, 6],
      [DeclaredDuration.ONE_TO_TWO_WEEKS, 13],
      [DeclaredDuration.MORE_THAN_TWO_WEEKS, 30],
      [DeclaredDuration.NOT_SURE, 30],
    ])('%s: expires exactly at day %s', (declaredDuration, days) => {
      expect(dto({ declaredDuration }, at(days, -1).getTime()).travelModeExpired).toBe(false);
      expect(dto({ declaredDuration }, at(days).getTime()).travelModeExpired).toBe(true);
    });
  });

  describe('states without a trustworthy active period', () => {
    const NOTHING = { endsAt: null, expired: false, due: false, availableAt: null };
    it('pending: classified, never activated', () => {
      expect(travel(dto({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }, at(3).getTime()))).toEqual(NOTHING);
    });
    it('cleared by a home-country confirmation', () => {
      expect(
        travel(dto({ travelClassification: null, travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null, nextTravelReminderAt: null }, at(3).getTime())),
      ).toEqual(NOTHING);
    });
    it.each([
      ['no activation time', { travelModeActivatedAt: null }],
      ['no duration', { declaredDuration: null }],
      ['an unknown duration', { declaredDuration: 'forever' }],
      ['an invalid activation date', { travelModeActivatedAt: new Date('not a date') }],
    ])('invalid raw-active data (%s): no end time, not expired, no reminder', (_label, over) => {
      expect(travel(dto(over, at(3).getTime()))).toEqual(NOTHING);
    });
    it('inactive: the raw flag off inside the window yields no reminder', () => {
      expect(travel(dto({ travelModeActive: false }, at(3).getTime()))).toMatchObject({ due: false, availableAt: null });
    });
  });

  describe('derivation and the clock', () => {
    it('never uses the job’s raw reminder cursor', () => {
      const base = travel(dto({}, at(4).getTime()));
      for (const nextTravelReminderAt of [null, at(1), at(7), at(99)]) {
        expect(travel(dto({ nextTravelReminderAt }, at(4).getTime()))).toEqual(base);
      }
    });
    it('is driven by the injected clock', () => {
      expect(travel(dto({}, at(2).getTime())).due).toBe(false);
      expect(travel(dto({}, at(4).getTime())).due).toBe(true);
    });
    it('uses the current time when no clock is given', () => {
      const spy = jest.spyOn(Date, 'now').mockReturnValue(at(3).getTime());
      try {
        expect(travel(ProfileStatusResponseDto.fromEntity(profile())).due).toBe(true);
        spy.mockReturnValue(at(3, -1).getTime());
        expect(travel(ProfileStatusResponseDto.fromEntity(profile())).due).toBe(false);
      } finally {
        spy.mockRestore();
      }
    });
    it('fails closed on an unusable last-claim time', () => {
      expect(travel(dto({ lastTravelReminderSentAt: 'garbage' }, at(3).getTime()))).toMatchObject({ due: false, availableAt: null });
    });
  });
});
