import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { CreateContractDto } from '../dtos/create-contract.dto';
import { ContractStatus } from '../entities/enums';
import { ContractGroup } from '../entities/contract-group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractGroupSummaryDto } from '../dtos/contract-group-summary.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(ContractGroup)
    private readonly contractGroupRepository: Repository<ContractGroup>,

    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}
  async createGroup(
    dto: CreateGroupDto,
    ownerClientId: string,
  ): Promise<{ group: ContractGroup; contracts: Contract[] }> {
    return this.contractGroupRepository.manager.transaction(async (manager) => {
      const groupRepo = manager.getRepository(ContractGroup);
      const contractRepo = manager.getRepository(Contract);

      // Create group
      const group = groupRepo.create({
        type: dto.type,
        ownerClientId,
        projectId: dto.projectId,
        serviceId: dto.serviceId,
        teamId: dto.teamId,
        jobId: dto.jobId,
        depositPaid: false,
      });

      const savedGroup = await groupRepo.save(group);

      // Create linked contracts
      const contracts = dto.contracts.map((c) =>
        contractRepo.create({
          ...c,
          clientId: ownerClientId, // satisfies NOT NULL
          groupId: savedGroup.id,
          status: ContractStatus.PENDING,
        }),
      );

      const savedContracts = await contractRepo.save(contracts);

      return {
        group: savedGroup,
        contracts: savedContracts,
      };
    });
  }

  async getGroup(id: string) {
    const group = await this.contractGroupRepository.findOne({
      where: { id },
      relations: ['contracts'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  // T2-13: attach a Contract to an EXISTING group — the operation FR-11 and
  // UC-1 assumed already existed (T2-11 found it didn't; createGroup only
  // ever builds a brand-new group). Mirrors createGroup's own shape for the
  // new row: clientId from the group (never the body — same reasoning as
  // ownerClientId's removal from CreateGroupDto above), status always
  // PENDING, and no projectId/serviceId/teamId/jobId on the Contract itself
  // — createGroup doesn't set those either, despite the columns existing.
  //
  // Response shape: returns the created Contract row, not the refreshed
  // group and not just an id. Matches REST convention for POST to a
  // sub-collection (return the created resource), and gives the frontend
  // chunk everything it needs (id, groupId, talentId, title, status, ...)
  // to update local state without a second round trip.
  //
  // Known race, not fixed here: this is check-then-insert, not atomic. Two
  // concurrent requests adding the same talent can both pass the
  // `.some(...)` check below and both insert — a real gap under real
  // concurrency. Fixing it is a schema decision (see the report for why a
  // plain unique index on (groupId, talentId) would be the WRONG eventual
  // constraint, given CANCELED/ENDED rows are allowed to repeat), not
  // something to reach for silently inside a feature PR.
  async addMember(
    groupId: string,
    dto: CreateContractDto,
    callerId: string,
  ): Promise<Contract> {
    const group = await this.getGroup(groupId);

    if (group.ownerClientId !== callerId) {
      throw new ForbiddenException('You may only modify your own group');
    }

    // FR-11: PENDING and ACTIVE are current membership — an unanswered
    // invite or an ongoing engagement. CANCELED (rejected offer, or never
    // activated) and ENDED (a prior engagement that concluded) are not
    // current membership, which is what the edge case actually guards
    // against, so neither blocks a re-add. Not specified anywhere; this is
    // the judgment call flagged in the plan.
    const alreadyMember = group.contracts.some(
      (contract) =>
        contract.talentId === dto.talentId &&
        (contract.status === ContractStatus.PENDING ||
          contract.status === ContractStatus.ACTIVE),
    );
    if (alreadyMember) {
      throw new ConflictException(
        'This talent is already part of this contract.',
      );
    }

    const contract = this.contractRepository.create({
      ...dto,
      clientId: group.ownerClientId,
      groupId: group.id,
      status: ContractStatus.PENDING,
    });

    return this.contractRepository.save(contract);
  }

  // FR-1: contracts list for the Hire Me modal. One query via the existing
  // OneToMany relation — no N+1. No aggregate group status: FR-8/FR-11 are
  // per-talent (per member), not per-group, so there's nothing here to
  // derive that has a caller.
  async getGroupsForClient(
    ownerClientId: string,
  ): Promise<ContractGroupSummaryDto[]> {
    const groups = await this.contractGroupRepository.find({
      where: { ownerClientId },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });

    return groups.map((group) => ({
      id: group.id,
      members: group.contracts.map((contract) => ({
        contractId: contract.id,
        talentId: contract.talentId,
        title: contract.title,
        status: contract.status,
      })),
      projectId: group.projectId,
      serviceId: group.serviceId,
      teamId: group.teamId,
      jobId: group.jobId,
    }));
  }
}
