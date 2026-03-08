import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  private emit(eventName: string, data: Record<string, any>): void {
    const payload = { eventName, timestamp: new Date().toISOString(), data };
    this.client.emit(eventName, payload);
    this.logger.log(`Emitted: ${eventName}`);
  }

  groupCreated(groupId: string, ownerClientId: string, type: string, contracts: any[]): void {
    this.emit('contract.group.created', { groupId, ownerClientId, type, contracts });
  }

  contractActivated(contractId: string, groupId: string, clientId: string, talentId: string, startAtISO: string): void {
    this.emit('contract.activated', { contractId, groupId, clientId, talentId, startAtISO });
  }

  groupActivated(groupId: string, clientId: string, contractCount: number): void {
    this.emit('contract.group.activated', { groupId, clientId, contractCount });
  }

  contractEnded(contractId: string, groupId: string, clientId: string, talentId: string, reasonCode: string, endAtISO: string): void {
    this.emit('contract.ended', { contractId, groupId, clientId, talentId, reasonCode, endAtISO });
  }

  contractsCanceled(groupId: string, contractIds: string[], reason: string): void {
    this.emit('contract.canceled', { groupId, contracts: contractIds, reason });
  }
}
