import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  private emit(eventName: string, data: Record<string, any>): void {
    this.client.emit(eventName, { eventName, timestamp: new Date().toISOString(), data });
    this.logger.log(`Emitted: ${eventName}`);
  }

  billingFinalized(contractId: string, invoiceId: string, finalAmount: number, creditApplied: number): void {
    this.emit('billing.finalized', { contractId, invoiceId, finalAmount, creditApplied });
  }

  paymentFailed(contractId: string, groupId: string, reason: string): void {
    this.emit('billing.payment_failed', { contractId, groupId, reason });
  }
}
