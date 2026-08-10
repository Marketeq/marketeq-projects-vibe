import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroupDto } from '../dtos/create-group.dto';
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
