import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import {
  TransactionType, TransactionStatus,
  AmountDirection, PaymentMethodType, ContractType,
} from '../entities/enums';
import { CacheService } from '../services/cache.service';
import { AblyService } from '../services/ably.service';

// ── Event payload interfaces ───────────────────────────────────────────
interface PayoutInitiatedEvent {
  eventId:                string;
  contractorId:           string;
  contractId:             string | null;
  amount:                 number;
  payoutMethodType:       string;
  payoutMethodLabel:      string;
  payoutMethodIdentifier: string;
  initiatedAt:            string;
}

interface PayoutCompletedEvent {
  originalEventId: string;
  contractorId:    string;
  amount:          number;
  completedAt:     string;
}

interface PayoutFailedEvent {
  originalEventId: string;
  contractorId:    string;
  failureReason:   string;
}

// ── Consumer ───────────────────────────────────────────────────────────
@Injectable()
export class PayoutConsumer {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    private readonly cacheService: CacheService,
    private readonly ablyService:  AblyService,
  ) {}

  // 5.1 payout.initiated
  @RabbitSubscribe({
    exchange:   'marketeq.payout',
    routingKey: 'payout.initiated',
    queue:      'txn-svc.payout.events',
  })
  async onPayoutInitiated(payload: PayoutInitiatedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const payout = this.repo.create({
      transactionId:           payload.eventId,
      date:                    new Date(payload.initiatedAt),
      descriptionType:         TransactionType.PROJECT_PAYMENT,
      amount:                  payload.amount,
      amountDirection:         AmountDirection.DEBIT,
      status:                  TransactionStatus.PROCESSING,
      paymentMethodType:       payload.payoutMethodType       as PaymentMethodType,
      paymentMethodLabel:      payload.payoutMethodLabel,
      paymentMethodIdentifier: payload.payoutMethodIdentifier,
      contractType:            ContractType.INDIVIDUAL,
      contractId:              payload.contractId ?? 'system',
      userId:                  payload.contractorId,
      usdEquivalent:           payload.amount,
    });

    await this.repo.save(payout);
    await this.cacheService.invalidate('user:' + payload.contractorId + ':transactions');
    await this.ablyService.publishStatusUpdate(
      payload.contractorId, payout.id, TransactionStatus.PROCESSING,
    );
  }

  // 5.2 payout.completed
  @RabbitSubscribe({
    exchange:   'marketeq.payout',
    routingKey: 'payout.completed',
    queue:      'txn-svc.payout.events',
  })
  async onPayoutCompleted(payload: PayoutCompletedEvent): Promise<void> {
    await this.repo.update(
      { transactionId: payload.originalEventId },
      { status: TransactionStatus.SUCCEEDED, paidAt: new Date(payload.completedAt) },
    );
    const txn = await this.repo.findOne({ where: { transactionId: payload.originalEventId } });
    await this.cacheService.invalidate('user:' + payload.contractorId + ':transactions');
    if (txn) {
      await this.ablyService.publishStatusUpdate(
        payload.contractorId, txn.id, TransactionStatus.SUCCEEDED,
      );
    }
  }

  // 5.3 payout.failed
  @RabbitSubscribe({
    exchange:   'marketeq.payout',
    routingKey: 'payout.failed',
    queue:      'txn-svc.payout.events',
  })
  async onPayoutFailed(payload: PayoutFailedEvent): Promise<void> {
    await this.repo.update(
      { transactionId: payload.originalEventId },
      { status: TransactionStatus.FAILED },
    );
    const txn = await this.repo.findOne({ where: { transactionId: payload.originalEventId } });
    await this.cacheService.invalidate('user:' + payload.contractorId + ':transactions');
    if (txn) {
      await this.ablyService.publishStatusUpdate(
        payload.contractorId, txn.id, TransactionStatus.FAILED,
      );
    }
  }
}