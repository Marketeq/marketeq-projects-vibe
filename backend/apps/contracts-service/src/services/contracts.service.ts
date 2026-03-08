import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractGroup } from '../entities/contract-group.entity';
import { ContractStatus } from '../entities/enums';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';
import { AuditLoggerService } from './audit-logger.service';
import { EventsService } from './events.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractGroup) private readonly groupRepo: Repository<ContractGroup>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditLoggerService,
    private readonly events: EventsService,
  ) {}

  async createGroup(dto: CreateGroupDto, user: { sub: string; role: string }) {
    const group = await this.dataSource.transaction(async (em) => {
      const savedGroup = await em.save(ContractGroup, em.create(ContractGroup, {
        type: dto.type,
        ownerClientId: dto.ownerClientId,
        projectId: dto.projectId,
        serviceId: dto.serviceId,
        teamId: dto.teamId,
        jobId: dto.jobId,
      }));

      const contracts = dto.contracts.map(c =>
        em.create(Contract, {
          ...c,
          clientId: dto.ownerClientId,
          groupId: savedGroup.id,
          projectId: dto.projectId,
          serviceId: dto.serviceId,
          teamId: dto.teamId,
          jobId: dto.jobId,
          status: ContractStatus.PENDING,
        }),
      );
      await em.save(Contract, contracts);

      return em.findOneOrFail(ContractGroup, { where: { id: savedGroup.id }, relations: ['contracts'] });
    });

    this.events.groupCreated(group.id, group.ownerClientId, group.type, group.contracts);
    await this.audit.log(user, 'GROUP_CREATED', { groupId: group.id });

    return group;
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

  async respondToOffer(id: string, dto: AcceptRejectDto, user: { sub: string; role: string }) {
    const contract = await this.getContract(id);
    if (contract.talentId !== dto.talentId) throw new BadRequestException('Not your contract');
    if (contract.status !== ContractStatus.PENDING) throw new BadRequestException('Contract is not pending');

    if (!dto.accepted) {
      await this.contractRepo.update(id, { status: ContractStatus.CANCELED });
      await this.audit.log(user, 'CONTRACT_REJECTED', { contractId: id });
      return { id, status: ContractStatus.CANCELED };
    }

    await this.audit.log(user, 'CONTRACT_ACCEPTED', { contractId: id });
    return { id, message: 'Offer accepted. Waiting for deposit.' };
  }

  async endContract(id: string, dto: EndContractDto, user: { sub: string; role: string }) {
    const contract = await this.getContract(id);
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be ended');
    }

    const endAtISO = new Date().toISOString();
    await this.contractRepo.update(id, {
      status: ContractStatus.ENDED,
      endAtISO,
      reasonCode: dto.reasonCode,
      notes: dto.notes,
    });

    this.events.contractEnded(id, contract.groupId, contract.clientId, contract.talentId, dto.reasonCode, endAtISO);
    await this.audit.log(user, 'CONTRACT_ENDED', { contractId: id, groupId: contract.groupId, reason: dto.reasonCode });

    return { contractId: id, status: ContractStatus.ENDED, endAtISO };
  }

  async activateGroup(groupId: string, paymentRef?: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['contracts'] });
    if (!group) throw new NotFoundException('Contract group not found');

    const now = new Date().toISOString();
    const pendingContracts = group.contracts.filter(c => c.status === ContractStatus.PENDING);

    await this.dataSource.transaction(async (em) => {
      await em.update(ContractGroup, groupId, { depositPaid: true });
      for (const contract of pendingContracts) {
        await em.update(Contract, contract.id, { status: ContractStatus.ACTIVE, startAtISO: now });
      }
    });

    for (const contract of pendingContracts) {
      this.events.contractActivated(contract.id, groupId, contract.clientId, contract.talentId, now);
    }
    this.events.groupActivated(groupId, group.ownerClientId, pendingContracts.length);

    return { groupId, activated: pendingContracts.length, paymentRef };
  }

  async cancelGroup(groupId: string, reason: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['contracts'] });
    if (!group) throw new NotFoundException('Contract group not found');

    const pendingIds = group.contracts
      .filter(c => c.status === ContractStatus.PENDING)
      .map(c => c.id);

    if (pendingIds.length > 0) {
      await this.contractRepo.update(pendingIds, { status: ContractStatus.CANCELED });
    }

    this.events.contractsCanceled(groupId, pendingIds, reason);
    return { groupId, canceled: pendingIds.length };
  }
}
