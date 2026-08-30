import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractStatus } from '../entities/enums';
import {
  TalentNetworkContractDto,
  TalentNetworkDto,
  TalentNetworkEntryDto,
  TalentNetworkStatus,
} from '../dtos/talent-network.dto';

/**
 * Bucket precedence, straight from the Final Logic doc:
 *
 *   active  > pending > past
 *
 * - active first, because "if a past hire is rehired, their new active
 *   contract moves them back into Active Talent". An active contract
 *   outranks any history.
 * - pending next, because "talent invited to a NEW contract who has not yet
 *   accepted" is a pending invitation even when an older contract of theirs
 *   has already ended.
 * - past last: nothing open, only ended contracts.
 *
 * `canceled` contracts never activated, so they are not a relationship at
 * all and are excluded from the network entirely.
 */
const STATUS_PRECEDENCE: Array<[ContractStatus, TalentNetworkStatus]> = [
  [ContractStatus.ACTIVE, 'active'],
  [ContractStatus.PENDING, 'pending'],
  [ContractStatus.ENDED, 'past'],
];

@Injectable()
export class TalentNetworkService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}

  /**
   * The client's Talent Network, derived entirely from their contracts.
   * No Talent Network table exists, by design.
   *
   * Deliberately returns talentIds and contract context only. Names, avatars
   * and rates for the cards live in user-service, and contracts-service never
   * reads another service's schema.
   */
  async getTalentNetwork(clientId: string): Promise<TalentNetworkDto> {
    const contracts = await this.contractRepository.find({
      where: { clientId, status: Not(ContractStatus.CANCELED) },
      order: { createdAt: 'ASC' },
    });

    // One person can be hired on several contracts; the network is keyed by
    // person, so they get one entry, not one per contract.
    const byTalent = new Map<string, Contract[]>();
    for (const contract of contracts) {
      if (!contract.talentId) continue;
      const existing = byTalent.get(contract.talentId);
      if (existing) {
        existing.push(contract);
      } else {
        byTalent.set(contract.talentId, [contract]);
      }
    }

    const active: TalentNetworkEntryDto[] = [];
    const pending: TalentNetworkEntryDto[] = [];
    const past: TalentNetworkEntryDto[] = [];

    for (const [talentId, talentContracts] of byTalent) {
      const entry = this.toEntry(talentId, talentContracts);
      if (!entry) continue;

      if (entry.status === 'active') active.push(entry);
      else if (entry.status === 'pending') pending.push(entry);
      else past.push(entry);
    }

    // Most recent relationship first within each bucket.
    const byRecency = (a: TalentNetworkEntryDto, b: TalentNetworkEntryDto) =>
      b.contract.updatedAt.localeCompare(a.contract.updatedAt);
    active.sort(byRecency);
    pending.sort(byRecency);
    past.sort(byRecency);

    return {
      clientId,
      active,
      pending,
      past,
      counts: {
        // Only `active` feeds the My Team number. The other half of that
        // number, accepted External Team members, is owned by
        // invitations-service; this service deliberately does not guess at it.
        active: active.length,
        pending: pending.length,
        past: past.length,
        total: active.length + pending.length + past.length,
      },
    };
  }

  /**
   * Builds one person's network entry from every non-canceled contract the
   * client holds with them, picking the bucket by STATUS_PRECEDENCE and the
   * most recently updated contract within that bucket as the deciding one.
   */
  private toEntry(
    talentId: string,
    contracts: Contract[],
  ): TalentNetworkEntryDto | null {
    for (const [contractStatus, networkStatus] of STATUS_PRECEDENCE) {
      const matching = contracts.filter((c) => c.status === contractStatus);
      if (matching.length === 0) continue;

      const deciding = matching.reduce((latest, candidate) =>
        candidate.updatedAt > latest.updatedAt ? candidate : latest,
      );

      return {
        talentId,
        status: networkStatus,
        countsTowardTeam: networkStatus === 'active',
        contract: this.toContractDto(deciding),
        contractIds: contracts.map((c) => c.id),
        firstHiredAtISO: this.earliest(contracts.map((c) => c.startAtISO)),
        lastEndedAtISO: this.latest(contracts.map((c) => c.endAtISO)),
      };
    }

    // Unreachable while ContractStatus has only the four members above.
    // Canceled contracts are filtered out before we get here. Returning null
    // rather than throwing keeps one unknown status from breaking the tab.
    return null;
  }

  private toContractDto(contract: Contract): TalentNetworkContractDto {
    return {
      id: contract.id,
      groupId: contract.groupId,
      title: contract.title,
      status: contract.status,
      // TypeORM hands decimal columns back as strings; the cards render a
      // rate, so normalise it here rather than in every caller.
      rate: Number(contract.rate),
      schedule: contract.schedule,
      duration: contract.duration,
      startAtISO: contract.startAtISO ?? null,
      endAtISO: contract.endAtISO ?? null,
      projectId: contract.projectId ?? null,
      serviceId: contract.serviceId ?? null,
      teamId: contract.teamId ?? null,
      jobId: contract.jobId ?? null,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    };
  }

  private earliest(values: Array<string | null | undefined>): string | null {
    const set = values.filter((v): v is string => !!v);
    return set.length ? set.reduce((a, b) => (a < b ? a : b)) : null;
  }

  private latest(values: Array<string | null | undefined>): string | null {
    const set = values.filter((v): v is string => !!v);
    return set.length ? set.reduce((a, b) => (a > b ? a : b)) : null;
  }
}
