import { Injectable } from '@nestjs/common';
import { ContractStatus } from '../entities/enums';

/**
 * ActivationSubscriber ensures all contracts in a group
 * activate together once the deposit is cleared.
 */
@Injectable()
export class ActivationSubscriber {
  async activateGroupContracts(groupId: string) {
    // 1. Start DB transaction
    // 2. Fetch all contracts in the group
    const contracts: Array<{ id: string; status: ContractStatus; startAtISO?: string }> = [
      { id: 'c1', status: ContractStatus.PENDING },
      { id: 'c2', status: ContractStatus.PENDING },
    ];

    // 3. Update ALL contracts to ACTIVE
    const now = new Date().toISOString();
    contracts.forEach((c) => {
      c.status = ContractStatus.ACTIVE;
      c.startAtISO = now;
    });

    // 4. Commit transaction
    // 5. Emit events
    return contracts;
  }
}
