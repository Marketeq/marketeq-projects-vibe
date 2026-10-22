import { IdentityVerificationService } from './identity-verification.service';
import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationSummaryService } from './verification-summary.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;

/**
 * getAccountGateDecisions (G5) is the batch form of getAccountGateDecision.
 * It must give every requested account exactly one decision, computed by the
 * same gate_open rule, with a missing profile closed - never open - and
 * without one bad id taking the rest of the batch down.
 */
describe('IdentityVerificationService.getAccountGateDecisions', () => {
  const buildService = (find: jest.Mock) => {
    const countRepo = () => ({ count: jest.fn().mockResolvedValue(0) });
    return new IdentityVerificationService(
      { find, findOne: jest.fn() } as any, // profileRepository
      countRepo() as any,
      countRepo() as any,
      countRepo() as any,
      countRepo() as any,
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

  const profile = (userId: string, o: Partial<IdentityVerificationProfile>): IdentityVerificationProfile =>
    ({
      id: `p-${userId}`,
      userId,
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      expiredAt: null,
      travelModeActive: false,
      ...o,
    }) as IdentityVerificationProfile;

  const VERIFIED = U(1);
  const GRACE = U(2);
  const LAPSED = U(3);
  const UNVERIFIED = U(4);
  const LOCATION_ONLY = U(5);
  const NO_PROFILE = U(6);

  const rows = () => [
    profile(VERIFIED, {
      identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    }),
    profile(GRACE, {
      identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      expiredAt: new Date(Date.now() - 5 * DAY_MS),
    }),
    profile(LAPSED, {
      identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      expiredAt: new Date(Date.now() - 31 * DAY_MS),
    }),
    profile(UNVERIFIED, {}),
    profile(LOCATION_ONLY, { identityVerificationStatus: IdentityVerificationStatus.VERIFIED }),
  ];

  it('answers a mixed batch in one query, one decision per account, with the single-check rule', async () => {
    const find = jest.fn().mockResolvedValue(rows());
    const service = buildService(find);

    const out = await service.getAccountGateDecisions([VERIFIED, GRACE, LAPSED, UNVERIFIED, LOCATION_ONLY, NO_PROFILE]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { userId: VERIFIED, gateOpen: true, missingRequirements: 'none' },
      { userId: GRACE, gateOpen: true, missingRequirements: 'none' },
      { userId: LAPSED, gateOpen: false, missingRequirements: 'identity' },
      { userId: UNVERIFIED, gateOpen: false, missingRequirements: 'both' },
      { userId: LOCATION_ONLY, gateOpen: false, missingRequirements: 'location' },
      { userId: NO_PROFILE, gateOpen: false, missingRequirements: 'both' },
    ]);
  });

  it('reports an account with no profile closed, never open', async () => {
    const service = buildService(jest.fn().mockResolvedValue([]));
    await expect(service.getAccountGateDecisions([NO_PROFILE])).resolves.toEqual([
      { userId: NO_PROFILE, gateOpen: false, missingRequirements: 'both' },
    ]);
  });

  it('de-duplicates repeated ids and returns exactly one entry each', async () => {
    const find = jest.fn().mockResolvedValue(rows());
    const out = await buildService(find).getAccountGateDecisions([VERIFIED, VERIFIED, UNVERIFIED]);
    expect(out.map((d) => d.userId)).toEqual([VERIFIED, UNVERIFIED]);
  });

  it('closes a non-uuid id without querying it, and still answers the valid ones', async () => {
    const find = jest.fn().mockResolvedValue(rows());
    const out = await buildService(find).getAccountGateDecisions(['not-a-uuid', VERIFIED]);

    expect(find.mock.calls[0][0].where.userId._value).toEqual([VERIFIED]);
    expect(out).toEqual([
      { userId: 'not-a-uuid', gateOpen: false, missingRequirements: 'both' },
      { userId: VERIFIED, gateOpen: true, missingRequirements: 'none' },
    ]);
  });

  it('does not touch the database when no id is queryable', async () => {
    const find = jest.fn();
    const out = await buildService(find).getAccountGateDecisions(['x']);
    expect(find).not.toHaveBeenCalled();
    expect(out).toEqual([{ userId: 'x', gateOpen: false, missingRequirements: 'both' }]);
  });

  it('propagates a database failure instead of answering (the consumer then fails closed)', async () => {
    const service = buildService(jest.fn().mockRejectedValue(new Error('db down')));
    await expect(service.getAccountGateDecisions([VERIFIED])).rejects.toThrow('db down');
  });

  it('agrees with the single check for every account', async () => {
    const find = jest.fn().mockResolvedValue(rows());
    const service = buildService(find);
    const byId = new Map(rows().map((p) => [p.userId, p]));
    (service as any).profileRepository.findOne = jest.fn(async ({ where }: any) => byId.get(where.userId) ?? null);

    const ids = [VERIFIED, GRACE, LAPSED, UNVERIFIED, LOCATION_ONLY, NO_PROFILE];
    const batch = await service.getAccountGateDecisions(ids);
    for (const entry of batch) {
      const { userId, ...single } = entry;
      await expect(service.getAccountGateDecision(userId)).resolves.toEqual(single);
    }
  });
});
