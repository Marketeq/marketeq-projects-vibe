import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { ContractStatus } from '../entities/enums';
import { ContractGroup } from '../entities/contract-group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';

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
  ): Promise<{ group: ContractGroup; contracts: Contract[] }> {
    return this.contractGroupRepository.manager.transaction(async (manager) => {
      const groupRepo = manager.getRepository(ContractGroup);
      const contractRepo = manager.getRepository(Contract);

      // Create group
      const group = groupRepo.create({
        type: dto.type,
        ownerClientId: dto.ownerClientId,
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
          clientId: dto.ownerClientId, // satisfies NOT NULL
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
}
