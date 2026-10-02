import { FreeKycService, HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from './free-kyc.service';
import { buildVerificationSummary } from '../common/status/verification-summary';
import {
  HomeCountryConfirmationRequiredException,
  RetryLimitExceededException,
} from '../common/errors/domain-exceptions';
import {
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

// Drift guard: the summary says "confirm_location" exactly when the REAL start path
// would refuse a NEW session for a home-country reason. Same inputs, both sides.
describe('verification summary ↔ real start path parity (new-session requirements)', () => {
  const T0 = new Date('2026-10-01T12:00:00.000Z');
  beforeEach(() => jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
  afterEach(() => {
    jest.useRealTimers();
    delete process.env.DIDIT_FREE_KYC_WORKFLOW_ID;
    delete process.env.FRONTEND_URL;
  });

  const profileRow = (over: Record<string, unknown>) => ({
    id: 'profile-1', userId: 'user-1',
    identityVerificationStatus: I.UNSTARTED,
    locationVerificationStatus: L.VERIFIED,
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date(T0.getTime() - 60_000),
    travelModeActive: false,
    travelClassification: null,
    failedFinalAt: null,
    ...over,
  });

  // The real service over fakes with no sessions and no history: a NEW session is the only path.
  const startsFor = async (profile: Record<string, any>) => {
    const sessions: any[] = [];
    const sessionRepository = {
      findOne: jest.fn(async () => null),
      find: jest.fn(async () => sessions),
      create: jest.fn((d: any) => ({ id: 'row-1', createdAt: new Date(), ...d })),
      save: jest.fn(async (d: any) => (sessions.push(d), d)),
    };
    const profileRepository = { findOne: jest.fn(async () => profile), save: jest.fn(async (p: any) => p) };
    const attemptRepository = { find: jest.fn(async () => []) };
    const empty = { count: jest.fn(async () => 0) };
    const queryRunner = {
      connect: jest.fn(async () => undefined), startTransaction: jest.fn(async () => undefined),
      query: jest.fn(async () => []), commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined), release: jest.fn(async () => undefined), isTransactionActive: true,
    };
    const service = new FreeKycService(
      profileRepository as any, sessionRepository as any, attemptRepository as any,
      empty as any, empty as any, empty as any,
      { createQueryRunner: () => queryRunner, transaction: jest.fn() } as any,
      { createKycSession: jest.fn(async () => ({ sessionId: 'didit-1', url: 'https://verify.didit.me/x', status: 'Not Started' })), getSessionDecision: jest.fn() } as any,
    );
    process.env.DIDIT_FREE_KYC_WORKFLOW_ID = 'wf';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    try {
      await service.startOrResume('user-1');
      return { blockedForHomeCountry: false, other: null as string | null };
    } catch (e) {
      if (e instanceof HomeCountryConfirmationRequiredException) return { blockedForHomeCountry: true, other: null };
      if (e instanceof RetryLimitExceededException) return { blockedForHomeCountry: false, other: 'retry_limit' };
      return { blockedForHomeCountry: false, other: (e as Error).constructor.name };
    }
  };

  const statuses = [I.UNSTARTED, I.FAILED, I.EXPIRED];
  const confirmations: Array<[string, Date | null]> = [
    ['fresh', new Date(T0.getTime() - 60_000)],
    ['exactly at the window edge', new Date(T0.getTime() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS)],
    ['one millisecond stale', new Date(T0.getTime() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1)],
    ['missing', null],
  ];

  it.each(
    statuses.flatMap((status) =>
      Object.values(L).flatMap((location) =>
        confirmations.flatMap(([label, at]) =>
          [false, true].flatMap((travelModeActive) =>
            [null, TravelClassification.TEMPORARILY_TRAVELING].map((classification) => [status, location, label, at, travelModeActive, classification] as const),
          ),
        ),
      ),
    ),
  )('%s / location %s / confirmation %s / travel %s / classification %s', async (status, location, _label, at, travelModeActive, classification) => {
    const profile = profileRow({
      identityVerificationStatus: status,
      locationVerificationStatus: location,
      verifiedHomeCountryConfirmedAt: at,
      travelModeActive,
      travelClassification: classification,
    });
    const summary = buildVerificationSummary({
      identityStatus: status,
      locationStatus: location,
      failedFinalAt: null,
      hostedCycleAttempts: 0,
      hasActiveHostedSession: false,
      verifiedHomeCountry: profile.verifiedHomeCountry,
      verifiedHomeCountryConfirmedAt: at,
      travelModeActive,
      travelClassification: classification,
      nowMs: Date.now(),
    });
    const real = await startsFor(profile);
    expect(real.other).toBeNull(); // nothing else stops these states from starting
    expect(summary.nextAction === 'confirm_location').toBe(real.blockedForHomeCountry);
    if (!real.blockedForHomeCountry) {
      expect(['start_identity', 'retry_identity', 'reverify_identity']).toContain(summary.nextAction);
    }
  });
});
