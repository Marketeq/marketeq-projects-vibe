import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

interface ContractCreatedPayload {
  contractId: string;
  clientId: string;
  freelancerId: string;
  contractId?: string;
}

interface ContractEndedPayload {
  contractId: string;
  clientId: string;
  freelancerId: string;
  reason?: string;
}

interface UserUpdatedPayload {
  userId: string;
  changes: Record<string, unknown>;
}

@Controller()
export class TimeTrackingConsumer {
  private readonly logger = new Logger(TimeTrackingConsumer.name);

  @EventPattern('contract.created')
  handleContractCreated(@Payload() data: ContractCreatedPayload): void {
    this.logger.log(
      `Contract created: ${data.contractId} — freelancer=${data.freelancerId}, client=${data.clientId}`,
    );
    // Future: auto-create time tracking scope/settings for the new contract
  }

  @EventPattern('contract.ended')
  handleContractEnded(@Payload() data: ContractEndedPayload): void {
    this.logger.log(
      `Contract ended: ${data.contractId} — reason=${data.reason ?? 'none'}`,
    );
    // Future: finalize pending time entries, stop active timers for this contract
  }

  @EventPattern('user.updated')
  handleUserUpdated(@Payload() data: UserUpdatedPayload): void {
    this.logger.log(`User updated: ${data.userId}`);
    // Future: update any cached user info (display name, avatar) in time tracking records
  }
}
