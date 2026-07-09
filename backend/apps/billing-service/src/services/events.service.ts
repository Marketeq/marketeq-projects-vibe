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

  paymentSucceeded(contractId: string, groupId: string, invoiceId: string, amount: number): void {
    this.emit('billing.payment_succeeded', { contractId, groupId, invoiceId, amount });
  }

  invoiceCreated(invoiceId: string, contractId: string, groupId: string, amount: number, installmentNumber: number): void {
    this.emit('billing.invoice_created', { invoiceId, contractId, groupId, amount, installmentNumber });
  }

  subscriptionPaused(groupId: string, reason: string): void {
    this.emit('billing.subscription_paused', { groupId, reason });
  }

  subscriptionResumed(groupId: string): void {
    this.emit('billing.subscription_resumed', { groupId });
  }

  subscriptionCanceled(groupId: string): void {
    this.emit('billing.subscription_canceled', { groupId });
  }

  refundIssued(invoiceId: string, contractId: string, amount: number): void {
    this.emit('billing.refund_issued', { invoiceId, contractId, amount });
  }
}
