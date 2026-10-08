import { IdentityVerificationService } from './identity-verification.service';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { deriveMissingRequirements } from '../common/gate/account-gate-decision';
import { VerificationSummaryService } from './verification-summary.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * getAccountGateDecision is the canonical answer consuming services get over
 * RabbitMQ. It must (a) reuse the one gate_open/in_grace definition in
 * getStatusForInternalCaller, (b) say which requirement is outstanding, and
 * (c) treat an account with no profile as closed with both missing.
 */
describe('IdentityVerificationService.getAccountGateDecision', () => {
  const buildService = (findOne: jest.Mock) => {
    const countRepo = () => ({ count: jest.fn().mockResolvedValue(0) });
    return new IdentityVerificationService(
      { findOne } as any, // profileRepository
      countRepo() as any, // documentRepository
      countRepo() as any, // attemptRepository
      countRepo() as any, // pendingSessionRepository
      countRepo() as any, // reservationRepository
      {} as any, // dataSource
      {} as any, // documentVerificationProvider
      {} as any, // documentCoverageProvider
      {} as any, // vpnProxyDetectionProvider
      {} as any, // locationProvider
      {} as any, // objectStorageProvider
      { publish: jest.fn() } as any, // events
      // Hosted Free KYC data feeding the summary getStatusForInternalCaller builds on.
      new VerificationSummaryService(
        { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) } as any,
        { find: jest.fn().mockResolvedValue([]) } as any,
      ),
    );
  };

  const profile = (overrides: Partial<IdentityVerificationProfile>): IdentityVerificationProfile =>
    ({
      id: 'profile-1',
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      expiredAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      ...overrides,
    }) as IdentityVerificationProfile;

  it('opens the gate with nothing missing when identity and location are both VERIFIED', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({
          identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
          locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        }),
      ),
    );

    await expect(service.getAccountGateDecision('user-1')).resolves.toEqual({
      gateOpen: true,
      missingRequirements: 'none',
    });
  });

  it('keeps the gate open inside the 30-day grace window and reports nothing missing', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({
          identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
          locationVerificationStatus: LocationVerificationStatus.VERIFIED,
          expiredAt: new Date(Date.now() - 15 * DAY_MS),
        }),
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');

    expect(decision.gateOpen).toBe(true);
    expect(decision.missingRequirements).toBe('none');
  });

  it('closes the gate once the grace window has passed, naming identity as missing', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({
          identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
          locationVerificationStatus: LocationVerificationStatus.VERIFIED,
          expiredAt: new Date(Date.now() - 40 * DAY_MS),
        }),
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');

    expect(decision.gateOpen).toBe(false);
    expect(decision.missingRequirements).toBe('identity');
  });

  it('reports identity as the only missing requirement when location is VERIFIED', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({
          identityVerificationStatus: IdentityVerificationStatus.FAILED,
          locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        }),
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');

    expect(decision.gateOpen).toBe(false);
    expect(decision.missingRequirements).toBe('identity');
  });

  it('reports location as the only missing requirement when identity is VERIFIED', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({
          identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
          locationVerificationStatus: LocationVerificationStatus.SUBMITTED_PENDING_REVIEW,
        }),
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');

    expect(decision.gateOpen).toBe(false);
    expect(decision.missingRequirements).toBe('location');
  });

  it('reports both requirements missing when neither is VERIFIED', async () => {
    const service = buildService(jest.fn().mockResolvedValue(profile({})));

    const decision = await service.getAccountGateDecision('user-1');

    expect(decision.gateOpen).toBe(false);
    expect(decision.missingRequirements).toBe('both');
  });

  it('closes the gate as both-missing when the account has no identity-verification profile', async () => {
    const service = buildService(jest.fn().mockResolvedValue(null));

    await expect(service.getAccountGateDecision('user-without-profile')).resolves.toEqual({
      gateOpen: false,
      missingRequirements: 'both',
    });
  });

  it('does not swallow unexpected failures — a broken lookup must not read as a decision', async () => {
    const service = buildService(jest.fn().mockRejectedValue(new Error('db unavailable')));

    await expect(service.getAccountGateDecision('user-1')).rejects.toThrow('db unavailable');
  });

  it('never exposes attempt counts, failure reasons, timestamps, documents or vendor data', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue(
        profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }),
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');

    // Exactly the two contract fields - no raw statuses, no grace flag.
    expect(Object.keys(decision).sort()).toEqual(['gateOpen', 'missingRequirements']);
  });
});

describe('IdentityVerificationService.getAccountGateDecision - Travel Mode and relocation never decide the gate', () => {
  const build = (p: Partial<IdentityVerificationProfile>) => {
    const profile = {
      id: 'profile-1',
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      expiredAt: null,
      travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
      travelModeActive: true,
      declaredDuration: DeclaredDuration.A_FEW_DAYS,
      travelModeActivatedAt: new Date(Date.now() - 1 * DAY_MS),
      nextTravelReminderAt: new Date(Date.now() + 2 * DAY_MS),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      ...p,
    } as IdentityVerificationProfile;
    return new IdentityVerificationService(
      { findOne: jest.fn().mockResolvedValue(profile), update: jest.fn(), save: jest.fn() } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { publish: jest.fn() } as any,
      new VerificationSummaryService(
        { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) } as any,
        { find: jest.fn().mockResolvedValue([]) } as any,
      ),
    );
  };

  it('a verified traveler stays open: Travel Mode neither opens nor closes anything', async () => {
    const service = build({
      identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    });
    await expect(service.getAccountGateDecision('user-1')).resolves.toMatchObject({
      gateOpen: true,
      missingRequirements: 'none',
    });
  });

  it('an unverified traveler stays gated: Travel Mode is not a way around verification', async () => {
    const service = build({});
    await expect(service.getAccountGateDecision('user-1')).resolves.toMatchObject({
      gateOpen: false,
      missingRequirements: 'both',
    });
  });

  it('relocation in progress (location reset) closes the gate for an identity-verified account', async () => {
    const service = build({
      identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
      locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      travelClassification: TravelClassification.PERMANENTLY_RELOCATED,
      travelModeActive: false,
      declaredDuration: null,
      travelModeActivatedAt: null,
      nextTravelReminderAt: null,
    });
    await expect(service.getAccountGateDecision('user-1')).resolves.toMatchObject({
      gateOpen: false,
      missingRequirements: 'location',
    });
  });

  it('a stale expiredAt cannot rescue a re-verified account that lost its location (expiry prerequisite)', async () => {
    const service = build({
      identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
      locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      expiredAt: new Date(Date.now() - 5 * DAY_MS),
    });
    await expect(service.getAccountGateDecision('user-1')).resolves.toMatchObject({
      gateOpen: false,
      missingRequirements: 'location',
    });
  });

  it('an expired account renewing (IN_PROGRESS) stays open inside the 30-day window', async () => {
    const service = build({
      identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      expiredAt: new Date(Date.now() - 10 * DAY_MS),
    });
    await expect(service.getAccountGateDecision('user-1')).resolves.toMatchObject({
      gateOpen: true,
      missingRequirements: 'none',
    });
  });
});

describe('IdentityVerificationService.getAccountGateDecision - the RPC response is only gateOpen and missingRequirements', () => {
  const STATES: Array<[string, Partial<IdentityVerificationProfile> | null]> = [
    ['verified + verified', { identityVerificationStatus: IdentityVerificationStatus.VERIFIED, locationVerificationStatus: LocationVerificationStatus.VERIFIED }],
    ['expired inside grace', { identityVerificationStatus: IdentityVerificationStatus.EXPIRED, locationVerificationStatus: LocationVerificationStatus.VERIFIED, expiredAt: new Date(Date.now() - 3 * DAY_MS) }],
    ['expired past grace', { identityVerificationStatus: IdentityVerificationStatus.EXPIRED, locationVerificationStatus: LocationVerificationStatus.VERIFIED, expiredAt: new Date(Date.now() - 40 * DAY_MS) }],
    ['blocked duplicate', { identityVerificationStatus: IdentityVerificationStatus.BLOCKED_DUPLICATE }],
    ['failed final', { identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }],
    ['unstarted', {}],
    ['no profile', null],
  ];
  const FORBIDDEN = [
    'inGrace',
    'identityVerificationStatus',
    'locationVerificationStatus',
    'attemptCount',
    'failureReason',
    'expiredAt',
    'createdAt',
    'updatedAt',
  ];

  it.each(STATES)('%s: the response has exactly two keys and no raw status or grace field', async (_label, over) => {
    const findOne = jest.fn().mockResolvedValue(
      over === null
        ? null
        : ({
            id: 'profile-1',
            identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
            locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
            expiredAt: null,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-02'),
            ...over,
          } as IdentityVerificationProfile),
    );
    const service = new IdentityVerificationService(
      { findOne } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      { count: jest.fn().mockResolvedValue(0) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { publish: jest.fn() } as any,
      new VerificationSummaryService(
        { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) } as any,
        { find: jest.fn().mockResolvedValue([]) } as any,
      ),
    );

    const decision = await service.getAccountGateDecision('user-1');
    const wire = JSON.parse(JSON.stringify(decision)); // what actually crosses RabbitMQ

    expect(Object.keys(wire).sort()).toEqual(['gateOpen', 'missingRequirements']);
    for (const field of FORBIDDEN) expect(wire).not.toHaveProperty(field);
    expect(typeof wire.gateOpen).toBe('boolean');
    expect(['identity', 'location', 'both', 'none']).toContain(wire.missingRequirements);
    expect(wire.gateOpen).toBe(wire.missingRequirements === 'none');
  });
});

describe('deriveMissingRequirements', () => {
  it('is always none for an open gate, whatever the statuses are', () => {
    expect(
      deriveMissingRequirements(IdentityVerificationStatus.EXPIRED, LocationVerificationStatus.NOT_VERIFIED, true),
    ).toBe('none');
  });

  it('fails closed to both if a closed gate ever has two VERIFIED statuses', () => {
    expect(
      deriveMissingRequirements(IdentityVerificationStatus.VERIFIED, LocationVerificationStatus.VERIFIED, false),
    ).toBe('both');
  });
});
