import { Injectable, Optional, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../entities/enums';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(@Optional() private readonly amqp: AmqpConnection | null) {}

  async publishTransactionCreated(txn: Transaction): Promise<void> {
    if (!this.amqp) { this.logger.warn('RabbitMQ disabled — skipping transaction.created event'); return; }
    await this.amqp.publish('marketeq.transactions', 'transaction.created', {
      transactionId:   txn.id,
      externalEventId: txn.transactionId,
      userId:          txn.userId,
      amount:          txn.amount,
      status:          txn.status,
      descriptionType: txn.descriptionType,
      createdAt:       txn.createdAt.toISOString(),
    });
  }

  async publishStatusUpdated(
    txn: Transaction,
    previousStatus: TransactionStatus,
  ): Promise<void> {
    if (!this.amqp) { this.logger.warn('RabbitMQ disabled — skipping transaction.status.updated event'); return; }
    await this.amqp.publish('marketeq.transactions', 'transaction.status.updated', {
      transactionId:  txn.id,
      userId:         txn.userId,
      previousStatus,
      newStatus:      txn.status,
      updatedAt:      new Date().toISOString(),
    });
  }
}