import { Injectable } from '@nestjs/common';
import { ContractStatus } from '../entities/enums';

@Injectable()
export class WebhooksService {
  async handleDepositCleared(payload: any) {
    const { groupId, paymentRef } = payload;
    // 1. Mark group.depositPaid = true
    // 2. Activate all pending contracts in the group
    // 3. Emit `contract.activated` events

    const contracts = [
      { id: 'c1', status: ContractStatus.ACTIVE },
      { id: 'c2', status: ContractStatus.ACTIVE },
    ];

    // 4. Emit activation events (per contract + group)
    // publishEvent('contract.activated', { contractId: c.id })
    // publishEvent('contract.group.activated', { groupId })
    return {
      groupId: payload.groupId,
      status: 'deposit cleared, contracts activated',
    };
  }

  async handleBillingFinalized(payload: any) {
    // 1. Update contract billing records
    // 2. Mark contract as ended if billing closed
    return { contractId: payload.contractId, status: 'billing finalized' };
  }

  async handleDepositFailed(payload: any) {
    const { groupId } = payload;

    // Keep contracts in PENDING until retry window expires
    // If expired → mark group + contracts as CANCELED
    return { groupId, status: 'deposit failed, awaiting retry or cancel' };
  }
}
