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

// ── Event payload interface ────────────────────────────────────────────
interface TimeTrackingHoursLoggedEvent {
  eventId:          string;
  contractorId:     string;
  clientId:         string;
  contractId:       string;
  contractType:     string;
  contractorHandle: string;
  hoursLogged:      number;
  hourlyRate:       number;
  earnedAmount:     number;
  invoiceNumber:    string;
  billingPeriod:    string;
  loggedAt:         string;
}

// ── Consumer ───────────────────────────────────────────────────────────
@Injectable()
export class TimeTrackingConsumer {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    private readonly cacheService: CacheService,
  ) {}

  // 4.1 timetracking.hours.logged
  @RabbitSubscribe({
    exchange:   'marketeq.timetracking',
    routingKey: 'timetracking.hours.logged',
    queue:      'txn-svc.timetracking.events',
  })
  async onHoursLogged(payload: TimeTrackingHoursLoggedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    // This record is scoped to contractorId -- not clientId
    // The client-facing debit record was already created by billing.payment.completed
    // This credit record is what the contractor sees on the Earnings & Payouts screen
    const earning = this.repo.create({
      transactionId:               payload.eventId,
      date:                        new Date(payload.loggedAt),
      descriptionType:             TransactionType.HOURLY_PAYMENT,
      descriptionContractorHandle: payload.contractorHandle,
      descriptionBillingPeriod:    payload.billingPeriod,
      descriptionHours:            payload.hoursLogged,
      invoiceNumber:               payload.invoiceNumber,
      amount:                      payload.earnedAmount,
      amountDirection:             AmountDirection.CREDIT,  // Credit for contractor
      status:                      TransactionStatus.CREDITED,
      paymentMethodType:           PaymentMethodType.BANK_ACH,
      paymentMethodLabel:          'Platform Earnings',
      paymentMethodIdentifier:     'N/A',
      contractType:                payload.contractType as ContractType,
      contractId:                  payload.contractId,
      userId:                      payload.contractorId,  // Contractor owns this record
      usdEquivalent:               payload.earnedAmount,
    });

    await this.repo.save(earning);
    await this.cacheService.invalidate('user:' + payload.contractorId + ':transactions');
  }
}