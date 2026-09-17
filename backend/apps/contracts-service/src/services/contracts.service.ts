import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';
import { ContractStatus } from '../entities/enums';
import { BillingClient } from './billing.client';
import { ReviewsClient } from './reviews.client';
import { NotificationsClient } from './notifications.client';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly billingClient: BillingClient,
    private readonly reviewsClient: ReviewsClient,
    private readonly notificationsClient: NotificationsClient,
  ) {}
  async endContract(id: string, dto: EndContractDto, requesterId: string) {
    // 1. Fetch contract
    const contract = await this.findContractById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // 2. Ownership. Only the contract's own client may end it — My Contracts
    // offers this action to clients alone (its `endItem` is gated on
    // `isClient`), so restricting to clientId matches what the UI already
    // allows and takes nothing away from talent. Checked before any
    // side-effecting call below: ending is destructive and irreversible.
    if (contract.clientId !== requesterId) {
      throw new ForbiddenException('You may only end your own contracts');
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Contract is not active');
    }

    // 3. Call Billing Service to finalize the invoice/credits
    const billingResult = await this.billingClient.finalizeContract(
      contract.id,
    );

    // 4. Update the contract status to ENDED
    contract.status = ContractStatus.ENDED;
    contract.endAtISO = new Date().toISOString();
    await this.contractRepository.save(contract);

    // 5. Trigger reviews service
    const reviewsResult = await this.reviewsClient.triggerReview(
      contract.id,
      contract.talentId,
      contract.clientId,
    );
    // 6. Send notifications
    await this.notificationsClient.notifyContractEnded(
      contract,
      dto.reasonCode,
    );

    return {
      contractId: contract.id,
      status: contract.status,
      billing: billingResult,
      reviewWindow: '90 days open',
    };
  }

  private async findContractById(id: string) {
    return await this.contractRepository.findOne({ where: { id } });
  }

  async respondToOffer(id: string, dto: AcceptRejectDto) {
    const contract = await this.contractRepository.findOne({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    
    if(contract.status !== ContractStatus.PENDING){
      throw new BadRequestException(`Only pending contracts can be accepted or rejected. Current status: ${contract.status}`)
    }

    if (dto.accepted) {
      return {
        id,
        message: 'Offer accepted. Waiting for deposit.',
      };
    }

    contract.status = ContractStatus.CANCELED;
    await this.contractRepository.save(contract);

    return {
      id,
      status: contract.status,
      message: 'Offer rejected.',
    };
  }

  async getContract(id: string) {
    return await this.contractRepository.findOne({ where: { id } });
  }

  async getContractsByClient(clientId: string) {
    return await this.contractRepository.find({ where: { clientId } });
  }

  async getContractsByTalent(talentId: string) {
    return await this.contractRepository.find({ where: { talentId } });
  }

  async update(id: string, data: Record<string, any>) {
    try {
      const result = await this.contractRepository.update(id, data);
      if (result.affected === 0) throw new NotFoundException('Contract not found');
      return { success: true };
    } catch (err) {
      throw err;
    }
  }
}
