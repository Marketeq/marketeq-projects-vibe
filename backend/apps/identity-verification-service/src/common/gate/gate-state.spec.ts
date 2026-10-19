import { IdentityVerificationStatus as I, LocationVerificationStatus as L } from '../../entities/enums/identity-verification.enums';
import { ProfileStatusResponseDto } from '../../dto/response/profile-status.response.dto';
import { computeGateState, GRACE_WINDOW_MS } from './account-gate-decision';

// gate_open has ONE definition. These cases pin it, and prove GET /me (the DTO)
// reports exactly what the RabbitMQ gate decision is built from - including the
// grace window that fullyVerified deliberately ignores.
const NOW = Date.parse('2026-10-10T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const profile = (identity: I, location: L, expiredAt: Date | null) =>
  ({
    id: 'p', userId: 'u', verifiedHomeCountry: null, detectedCountry: null, detectedRegionState: null, detectedCity: null, timeZone: null,
    travelClassification: null, declaredDuration: null, travelModeActive: false, travelModeActivatedAt: null,
    lastTravelReminderSentAt: null, nextTravelReminderAt: null, identityRejectionReason: null,
    identityVerificationStatus: identity, locationVerificationStatus: location, expiredAt,
  }) as any;

describe('computeGateState / GET /me gateOpen', () => {
  const cases: Array<[string, I, L, Date | null, { isVerified: boolean; inGrace: boolean; gateOpen: boolean }]> = [
    ['verified identity and location', I.VERIFIED, L.VERIFIED, null, { isVerified: true, inGrace: false, gateOpen: true }],
    ['in grace (expired 5 days ago)', I.EXPIRED, L.VERIFIED, new Date(NOW - 5 * DAY), { isVerified: false, inGrace: true, gateOpen: true }],
    ['in grace while a renewal is in progress', I.IN_PROGRESS, L.VERIFIED, new Date(NOW - 2 * DAY), { isVerified: false, inGrace: true, gateOpen: true }],
    ['grace ended (expired 40 days ago)', I.EXPIRED, L.VERIFIED, new Date(NOW - 40 * DAY), { isVerified: false, inGrace: false, gateOpen: false }],
    ['grace ends exactly at 30 days', I.EXPIRED, L.VERIFIED, new Date(NOW - GRACE_WINDOW_MS), { isVerified: false, inGrace: false, gateOpen: false }],
    ['never verified', I.UNSTARTED, L.NOT_VERIFIED, null, { isVerified: false, inGrace: false, gateOpen: false }],
    ['identity verified, location not', I.VERIFIED, L.NOT_VERIFIED, null, { isVerified: false, inGrace: false, gateOpen: false }],
    ['verified with a stale expired_at is verified, not grace', I.VERIFIED, L.VERIFIED, new Date(NOW - 5 * DAY), { isVerified: true, inGrace: false, gateOpen: true }],
    ['identity verified, location not, stale expired_at: grace never applies to a VERIFIED identity', I.VERIFIED, L.NOT_VERIFIED, new Date(NOW - 5 * DAY), { isVerified: false, inGrace: false, gateOpen: false }],
  ];

  it.each(cases)('%s', (_n, identity, location, expiredAt, expected) => {
    const p = profile(identity, location, expiredAt);
    expect(computeGateState(p, NOW)).toEqual(expected);
    const dto = ProfileStatusResponseDto.fromEntity(p, undefined, NOW);
    expect(dto.gateOpen).toBe(expected.gateOpen);
    // fullyVerified keeps meaning "both verified" and ignores grace
    expect(dto.fullyVerified).toBe(expected.isVerified);
  });

  it('exposes only the boolean: no grace flag, expired_at or window length in the response', () => {
    const dto = ProfileStatusResponseDto.fromEntity(profile(I.EXPIRED, L.VERIFIED, new Date(NOW - DAY)), undefined, NOW);
    const keys = Object.keys(dto);
    expect(keys).toContain('gateOpen');
    for (const forbidden of ['inGrace', 'expiredAt', 'graceEndsAt', 'isVerified']) expect(keys).not.toContain(forbidden);
  });
});
