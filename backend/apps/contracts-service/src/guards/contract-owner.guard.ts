// apps/contracts-service/src/guards/contract-owner.guard.ts
// PMCM-331: authorization for PUT /contracts/:id/end. Previously the
// controller took no @Req() and performed no ownership check at all — any
// authenticated user could end any contract by id under the service's
// global JwtAuthGuard.
//
// There is no role claim to check (same story as offer-service's
// OfferPartyGuard/party-role.util.ts: libs/auth's JwtStrategy never sets
// one). Ownership is derived from the record instead: the caller must be
// the contract's own clientId, or the ownerClientId of its ContractGroup.
// Same 403 for "contract not found" and "not the owner" — anti-enumeration,
// matching OfferPartyGuard's OFFER_ACCESS_DENIED shape.
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractGroup } from '../entities/contract-group.entity';

@Injectable()
export class ContractOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractGroup)
    private readonly groupRepo: Repository<ContractGroup>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    const contractId = request.params?.id;
    if (!contractId) return true; // No contract param — skip.

    const contract = await this.contractRepo.findOne({ where: { id: contractId } });

    let isOwner = false;
    if (contract) {
      isOwner = contract.clientId === userId;
      if (!isOwner) {
        const group = await this.groupRepo.findOne({ where: { id: contract.groupId } });
        isOwner = group?.ownerClientId === userId;
      }
    }

    if (!contract || !isOwner) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'CONTRACT_ACCESS_DENIED',
        message: 'You do not have access to this contract.',
      });
    }

    request.contract = contract;
    return true;
  }
}
