import { AcceptedOfferInput, GroupsService } from '../src/services/groups.service';
import { Contract } from '../src/entities/contract.entity';
import { ContractGroup } from '../src/entities/contract-group.entity';
import { ContractStatus, GroupType } from '../src/entities/enums';

/**
 * Locks in OS-07 (CR-01): an accepted offer becomes exactly one PENDING
 * contract in a one-contract group, with terms taken from the event
 * payload — and a redelivered event never creates a second contract.
 *
 * Repositories are faked: the rules under test are the payload mapping and
 * the offerId idempotency, not Postgres.
 */

const OFFER: AcceptedOfferInput = {
  offerId: '40000000-0000-4000-a000-000000000001',
  clientId: 'client-1',
  talentId: 'talent-1',
  jobListingId: 'listing-1',
  contractType: 'PROJECT',
  contractTitle: 'Alpha Platform Rebuild',
  terms: { rate: 95, durationMonths: 6, workSchedule: { type: 'FULL_TIME' } },
};

function setup(existing: Contract | null = null) {
  const savedGroups: Partial<ContractGroup>[] = [];
  const savedContracts: Partial<Contract>[] = [];

  const groupRepo = {
    create: jest.fn((g: Partial<ContractGroup>) => g),
    save: jest.fn(async (g: Partial<ContractGroup>) => {
      const row = { ...g, id: 'group-new' };
      savedGroups.push(row);
      return row;
    }),
  };
  const txContractRepo = {
    create: jest.fn((c: Partial<Contract>) => c),
    save: jest.fn(async (c: Partial<Contract>) => {
      const row = { ...c, id: 'contract-new' };
      savedContracts.push(row);
      return row;
    }),
  };
  const manager = {
    transaction: jest.fn(async (fn: (m: unknown) => unknown) =>
      fn({
        getRepository: (entity: unknown) =>
          entity === ContractGroup ? groupRepo : txContractRepo,
      }),
    ),
  };
  const contractRepository = { findOne: jest.fn(async () => existing) };
  const contractGroupRepository = { manager };

  const service = new GroupsService(
    contractGroupRepository as never,
    contractRepository as never,
  );
  return { service, savedGroups, savedContracts, manager };
}

describe('GroupsService.createFromAcceptedOffer', () => {
  it('creates one PENDING contract with the agreed terms', async () => {
    const { service, savedGroups, savedContracts } = setup();

    const { contract, created } = await service.createFromAcceptedOffer(OFFER);

    expect(created).toBe(true);
    expect(contract.id).toBe('contract-new');
    expect(savedGroups).toHaveLength(1);
    expect(savedGroups[0]).toMatchObject({
      type: GroupType.PROJECT,
      ownerClientId: 'client-1',
      projectId: 'listing-1',
      depositPaid: false,
    });
    expect(savedContracts).toHaveLength(1);
    expect(savedContracts[0]).toMatchObject({
      groupId: 'group-new',
      clientId: 'client-1',
      talentId: 'talent-1',
      offerId: OFFER.offerId,
      title: 'Alpha Platform Rebuild',
      rate: 95,
      schedule: 'full-time',
      duration: '6 months',
      projectId: 'listing-1',
      status: ContractStatus.PENDING,
    });
  });

  it('maps a CONTRACT offer to a job group and singularises one month', async () => {
    const { service, savedGroups, savedContracts } = setup();

    await service.createFromAcceptedOffer({
      ...OFFER,
      contractType: 'CONTRACT',
      terms: { rate: 50, durationMonths: 1, workSchedule: { type: 'PART_TIME' } },
    });

    expect(savedGroups[0]).toMatchObject({ type: GroupType.JOB, jobId: 'listing-1' });
    expect(savedContracts[0]).toMatchObject({ schedule: 'part-time', duration: '1 month' });
  });

  it('falls back to a placeholder title when the offer has none', async () => {
    const { service, savedContracts } = setup();

    await service.createFromAcceptedOffer({ ...OFFER, contractTitle: null });

    expect(savedContracts[0].title).toBe('Untitled contract');
  });

  it('stores the weekly cap from the offer schedule (PMCM-829)', async () => {
    const cases: Array<[{ type: string; hoursPerWeek?: number }, number | null]> = [
      [{ type: 'CUSTOM', hoursPerWeek: 15 }, 15],
      [{ type: 'FULL_TIME' }, 40],
      [{ type: 'PART_TIME' }, 20],
      [{ type: 'PART_TIME', hoursPerWeek: 25 }, 25],
      [{ type: 'CUSTOM' }, null],
    ];
    for (const [workSchedule, expected] of cases) {
      const { service, savedContracts } = setup();
      await service.createFromAcceptedOffer({
        ...OFFER,
        terms: { ...OFFER.terms, workSchedule },
      });
      expect(savedContracts[0].weeklyCapHours).toBe(expected);
    }
  });

  it('returns the existing contract on a redelivered event without creating another', async () => {
    const existing = { id: 'contract-existing', offerId: OFFER.offerId } as Contract;
    const { service, manager, savedContracts } = setup(existing);

    const { contract, created } = await service.createFromAcceptedOffer(OFFER);

    expect(created).toBe(false);
    expect(contract.id).toBe('contract-existing');
    expect(manager.transaction).not.toHaveBeenCalled();
    expect(savedContracts).toHaveLength(0);
  });
});
