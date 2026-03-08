import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractGroup } from '../entities/contract-group.entity';
import { ContractStatus, GroupType } from '../entities/enums';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractGroup) private readonly groupRepo: Repository<ContractGroup>,
  ) {}

  async createGroup(dto: {
    type: GroupType;
    ownerClientId: string;
    projectId?: string;
    serviceId?: string;
    teamId?: string;
    jobId?: string;
    contracts: Array<{ talentId: string; title: string; rate: number; schedule: string; duration: string }>;
  }) {
    const group = this.groupRepo.create({
      type: dto.type,
      ownerClientId: dto.ownerClientId,
      projectId: dto.projectId,
      serviceId: dto.serviceId,
      teamId: dto.teamId,
      jobId: dto.jobId,
    });
    const savedGroup = await this.groupRepo.save(group);

    const contracts = dto.contracts.map((c) =>
      this.contractRepo.create({
        ...c,
        clientId: dto.ownerClientId,
        groupId: savedGroup.id,
        projectId: dto.projectId,
        serviceId: dto.serviceId,
        teamId: dto.teamId,
        jobId: dto.jobId,
      }),
    );
    await this.contractRepo.save(contracts);

    return this.groupRepo.findOne({ where: { id: savedGroup.id }, relations: ['contracts'] });
  }

  async getGroup(id: string) {
    const group = await this.groupRepo.findOne({ where: { id }, relations: ['contracts'] });
    if (!group) throw new NotFoundException('Contract group not found');
    return group;
  }

  async getContract(id: string) {
    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async getContractsByClient(clientId: string) {
    return this.contractRepo.find({ where: { clientId }, order: { createdAt: 'DESC' } });
  }

  async getContractsByTalent(talentId: string) {
    return this.contractRepo.find({ where: { talentId }, order: { createdAt: 'DESC' } });
  }

  async respondToOffer(id: string, dto: { accepted: boolean; talentId: string }) {
    const contract = await this.getContract(id);
    if (contract.talentId !== dto.talentId) throw new BadRequestException('Not your contract');
    if (contract.status !== ContractStatus.PENDING) throw new BadRequestException('Contract not pending');

    if (!dto.accepted) {
      await this.contractRepo.update(id, { status: ContractStatus.CANCELED });
      return { id, status: ContractStatus.CANCELED };
    }

    return { id, message: 'Offer accepted. Waiting for deposit.' };
  }

  async endContract(id: string, dto: { reasonCode: string; notes: string }) {
    const contract = await this.getContract(id);
    if (contract.status !== ContractStatus.ACTIVE) throw new BadRequestException('Contract is not active');

    await this.contractRepo.update(id, {
      status: ContractStatus.ENDED,
      endAtISO: new Date().toISOString(),
      reasonCode: dto.reasonCode,
      notes: dto.notes,
    });

    return { id, status: ContractStatus.ENDED };
  }

  async activateGroup(groupId: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['contracts'] });
    if (!group) throw new NotFoundException('Group not found');

    await this.groupRepo.update(groupId, { depositPaid: true });
    const now = new Date().toISOString();
    for (const contract of group.contracts) {
      if (contract.status === ContractStatus.PENDING) {
        await this.contractRepo.update(contract.id, {
          status: ContractStatus.ACTIVE,
          startAtISO: now,
        });
      }
    }

    return { groupId, activated: true };
  }
}
