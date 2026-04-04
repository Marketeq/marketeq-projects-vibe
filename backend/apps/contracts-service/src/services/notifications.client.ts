import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsClient {
  async notifyContractEnded(contract: any, reason: string) {
    // Send email/push/dashboard alert
    return {
      contractId: contract.id,
      message: `Contract ended with reason: ${reason}`,
    };
  }
}
