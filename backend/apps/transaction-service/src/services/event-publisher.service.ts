import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../entities/enums';

@Injectable()
export class EventPublisherService {
  constructor(private readonly amqp: AmqpConnection) {}

  async publishTransactionCreated(txn: Transaction): Promise<void> {
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
    await this.amqp.publish('marketeq.transactions', 'transaction.status.updated', {
      transactionId:  txn.id,
      userId:         txn.userId,
      previousStatus,
      newStatus:      txn.status,
      updatedAt:      new Date().toISOString(),
    });
  }
}