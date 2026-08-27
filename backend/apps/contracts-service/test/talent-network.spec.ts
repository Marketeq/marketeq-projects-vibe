import { TalentNetworkService } from '../src/services/talent-network.service';
import { Contract } from '../src/entities/contract.entity';
import { ContractStatus } from '../src/entities/enums';

/**
 * Locks in the classification rules from "Talent Network & My Team — Final
 * Logic" (Aug 2026): which bucket each talent lands in, which of them count
 * toward the My Team number, and that canceled contracts are not a
 * relationship at all.
 *
 * The repository is faked rather than hit: the rules under test are pure
 * derivation over a contract list, so a real Postgres would only add
 * flakiness.
 */

const CLIENT = 'client-1';

let seq = 0;

function contract(over: Partial<Contract>): Contract {
  seq += 1;
  return {
    id: `contract-${seq}`,
    groupId: 'group-1',
    clientId: CLIENT,
    clientName: 'Acme',
    talentId: 'talent-1',
    title: 'UX Designer',
    rate: '85.00' as unknown as number, // TypeORM returns decimals as strings
    schedule: 'full-time',
    duration: '3 months',
    status: ContractStatus.ACTIVE,
    startAtISO: null as unknown as string,
    endAtISO: null as unknown as string,
    projectId: null as unknown as string,
    serviceId: null as unknown as string,
    teamId: null as unknown as string,
    jobId: null as unknown as string,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  } as Contract;
}

function serviceWith(contracts: Contract[]) {
  const repository = {
    // Mirrors `where: { clientId, status: Not(CANCELED) }` so the exclusion
    // is exercised here rather than assumed.
    find: jest.fn(async () =>
      contracts.filter(
        (c) =>
          c.clientId === CLIENT && c.status !== ContractStatus.CANCELED,
      ),
    ),
  };
  return new TalentNetworkService(repository as never);
}

beforeEach(() => {
  seq = 0;
});

describe('TalentNetworkService', () => {
  it('splits talent into active, pending and past', async () => {
    const service = serviceWith([
      contract({ talentId: 'active-talent', status: ContractStatus.ACTIVE }),
      contract({ talentId: 'pending-talent', status: ContractStatus.PENDING }),
      contract({ talentId: 'past-talent', status: ContractStatus.ENDED }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.active.map((e) => e.talentId)).toEqual(['active-talent']);
    expect(network.pending.map((e) => e.talentId)).toEqual(['pending-talent']);
    expect(network.past.map((e) => e.talentId)).toEqual(['past-talent']);
    expect(network.counts).toEqual({
      active: 1,
      pending: 1,
      past: 1,
      total: 3,
    });
  });

  it('counts only active talent toward the team number', async () => {
    const service = serviceWith([
      contract({ talentId: 'a', status: ContractStatus.ACTIVE }),
      contract({ talentId: 'b', status: ContractStatus.ACTIVE }),
      contract({ talentId: 'c', status: ContractStatus.PENDING }),
      contract({ talentId: 'd', status: ContractStatus.ENDED }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.counts.active).toBe(2);
    expect(network.active.every((e) => e.countsTowardTeam)).toBe(true);
    expect(network.pending.every((e) => e.countsTowardTeam)).toBe(false);
    expect(network.past.every((e) => e.countsTowardTeam)).toBe(false);
  });

  it('keeps a rehired past talent in active, not past', async () => {
    const service = serviceWith([
      contract({
        talentId: 'rehired',
        status: ContractStatus.ENDED,
        startAtISO: '2025-01-01T00:00:00.000Z',
        endAtISO: '2025-06-01T00:00:00.000Z',
      }),
      contract({
        talentId: 'rehired',
        status: ContractStatus.ACTIVE,
        startAtISO: '2026-02-01T00:00:00.000Z',
      }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.past).toHaveLength(0);
    expect(network.active).toHaveLength(1);
    const [entry] = network.active;
    expect(entry.contract.status).toBe(ContractStatus.ACTIVE);
    // History survives the move. Both contracts stay on the entry.
    expect(entry.contractIds).toHaveLength(2);
    expect(entry.firstHiredAtISO).toBe('2025-01-01T00:00:00.000Z');
    expect(entry.lastEndedAtISO).toBe('2025-06-01T00:00:00.000Z');
  });

  it('treats a past talent invited to a new contract as pending', async () => {
    const service = serviceWith([
      contract({ talentId: 'reinvited', status: ContractStatus.ENDED }),
      contract({ talentId: 'reinvited', status: ContractStatus.PENDING }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.past).toHaveLength(0);
    expect(network.pending.map((e) => e.talentId)).toEqual(['reinvited']);
    expect(network.counts.active).toBe(0);
  });

  it('gives one entry per person, not per contract', async () => {
    const service = serviceWith([
      contract({ talentId: 'busy', status: ContractStatus.ACTIVE }),
      contract({ talentId: 'busy', status: ContractStatus.ACTIVE }),
      contract({ talentId: 'busy', status: ContractStatus.ENDED }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.counts.total).toBe(1);
    expect(network.active[0].contractIds).toHaveLength(3);
  });

  it('excludes canceled contracts from the network entirely', async () => {
    const service = serviceWith([
      contract({ talentId: 'never-started', status: ContractStatus.CANCELED }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.counts).toEqual({
      active: 0,
      pending: 0,
      past: 0,
      total: 0,
    });
  });

  it('picks the most recently updated contract in the winning bucket', async () => {
    const service = serviceWith([
      contract({
        id: 'older',
        talentId: 'talent-1',
        status: ContractStatus.ACTIVE,
        title: 'Older engagement',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      contract({
        id: 'newer',
        talentId: 'talent-1',
        status: ContractStatus.ACTIVE,
        title: 'Newer engagement',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.active[0].contract.id).toBe('newer');
    expect(network.active[0].contract.title).toBe('Newer engagement');
  });

  it('normalises the decimal rate to a number', async () => {
    const service = serviceWith([
      contract({ talentId: 'talent-1', rate: '120.50' as unknown as number }),
    ]);

    const network = await service.getTalentNetwork(CLIENT);

    expect(network.active[0].contract.rate).toBe(120.5);
  });
})
