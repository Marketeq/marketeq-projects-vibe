import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Invoice } from '../entities/invoice.entity';
import {
  TransactionType, TransactionStatus, AmountDirection,
  PaymentMethodType, ContractType, BillingFrequency,
  MembershipTier, InvoiceStatus,
} from '../entities/enums';
import { CacheService } from '../services/cache.service';
import { AblyService } from '../services/ably.service';
import { EventPublisherService } from '../services/event-publisher.service';

// ── Event payload interfaces ───────────────────────────────────────────
interface BillingPaymentCompletedEvent {
  eventId: string; userId: string; contractId: string;
  contractType: string; transactionType: string;
  descriptionProjectName: string | null;
  descriptionContractorHandle: string | null;
  descriptionBillingPeriod: string | null;
  descriptionHours: number | null;
  invoiceNumber: string | null;
  amount: number; billingFrequency: string | null;
  membershipTier: string | null; paymentMethodType: string;
  paymentMethodLabel: string; paymentMethodIdentifier: string;
  paidAt: string;
}

interface BillingPaymentFailedEvent {
  eventId: string; userId: string; contractId: string;
  contractType: string; transactionType: string;
  amount: number; paymentMethodType: string;
  paymentMethodLabel: string; paymentMethodIdentifier: string;
  failureReason: string; failedAt: string;
}

interface BillingRefundIssuedEvent {
  eventId: string; userId: string;
  originalTransactionId: string; contractId: string;
  contractType: string; refundAmount: number; isPartial: boolean;
  paymentMethodType: string; paymentMethodLabel: string;
  paymentMethodIdentifier: string; refundedAt: string;
}

interface BillingInvoiceGeneratedEvent {
  eventId: string; userId: string; contractId: string;
  invoiceId: string; stripeInvoiceId: string | null;
  descriptionType: string; descriptionBillingPeriod: string | null;
  dateIssued: string; dueDate: string;
  amount: number; status: string;
}

interface BillingInvoiceStatusUpdatedEvent {
  invoiceId: string; userId: string;
  newStatus: string; updatedAt: string;
}

interface BillingSubscriptionChargedEvent {
  eventId: string; userId: string; membershipTier: string;
  billingFrequency: string; amount: number;
  paymentMethodType: string; paymentMethodLabel: string;
  paymentMethodIdentifier: string; contractId: string;
  billingPeriod: string; chargedAt: string;
}

interface BillingWireConfirmedEvent {
  eventId: string; userId: string; contractId: string;
  contractType: string; amount: number;
  wireFeeAmount: number; invoiceNumber: string; confirmedAt: string;
}

// ── Consumer ───────────────────────────────────────────────────────────
@Injectable()
export class BillingConsumer {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    @InjectRepository(Invoice)     private readonly invoiceRepo: Repository<Invoice>,
    private readonly cacheService:   CacheService,
    private readonly ablyService:    AblyService,
    private readonly publisher:      EventPublisherService,
  ) {}

  // 3.1 billing.payment.completed
  @RabbitSubscribe({
    exchange:   'marketeq.billing',
    routingKey: 'billing.payment.completed',
    queue:      'txn-svc.billing.events',
  })
  async onPaymentCompleted(payload: BillingPaymentCompletedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const txn = this.repo.create({
      transactionId:               payload.eventId,
      date:                        new Date(payload.paidAt),
      descriptionType:             payload.transactionType as TransactionType,
      descriptionProjectName:      payload.descriptionProjectName,
      descriptionContractorHandle: payload.descriptionContractorHandle,
      descriptionBillingPeriod:    payload.descriptionBillingPeriod,
      descriptionHours:            payload.descriptionHours,
      invoiceNumber:               payload.invoiceNumber,
      amount:                      payload.amount,
      amountDirection:             AmountDirection.DEBIT,
      status:                      TransactionStatus.PAID,
      paymentMethodType:           payload.paymentMethodType as PaymentMethodType,
      paymentMethodLabel:          payload.paymentMethodLabel,
      paymentMethodIdentifier:     payload.paymentMethodIdentifier,
      contractType:                payload.contractType as ContractType,
      contractId:                  payload.contractId,
      billingFrequency:            payload.billingFrequency as BillingFrequency ?? null,
      membershipTier:              payload.membershipTier   as MembershipTier   ?? null,
      paidAt:                      new Date(payload.paidAt),
      userId:                      payload.userId,
      usdEquivalent:               payload.amount,
    });

    await this.repo.save(txn);
    await this.cacheService.invalidate('user:' + payload.userId + ':transactions');
    await this.publisher.publishTransactionCreated(txn);
    await this.ablyService.publishStatusUpdate(payload.userId, txn.id, TransactionStatus.PAID);
  }

  // 3.2 billing.payment.failed
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.payment.failed',
    queue: 'txn-svc.billing.events',
  })
  async onPaymentFailed(payload: BillingPaymentFailedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const txn = this.repo.create({
      transactionId:           payload.eventId,
      date:                    new Date(payload.failedAt),
      descriptionType:         payload.transactionType as TransactionType,
      amount:                  payload.amount,
      amountDirection:         AmountDirection.DEBIT,
      status:                  TransactionStatus.FAILED,
      paymentMethodType:       payload.paymentMethodType as PaymentMethodType,
      paymentMethodLabel:      payload.paymentMethodLabel,
      paymentMethodIdentifier: payload.paymentMethodIdentifier,
      contractType:            payload.contractType as ContractType,
      contractId:              payload.contractId,
      userId:                  payload.userId,
      usdEquivalent:           payload.amount,
    });

    await this.repo.save(txn);
    await this.cacheService.invalidate('user:' + payload.userId + ':transactions');
    await this.ablyService.publishStatusUpdate(payload.userId, txn.id, TransactionStatus.FAILED);
  }

  // 3.3 billing.refund.issued
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.refund.issued',
    queue: 'txn-svc.billing.events',
  })
  async onRefundIssued(payload: BillingRefundIssuedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const status = payload.isPartial
      ? TransactionStatus.PARTIALLY_REFUNDED
      : TransactionStatus.REFUNDED;

    const refund = this.repo.create({
      transactionId:           payload.eventId,
      date:                    new Date(payload.refundedAt),
      descriptionType:         TransactionType.REFUND_ISSUED,
      amount:                  payload.refundAmount,
      amountDirection:         AmountDirection.CREDIT,
      status,
      paymentMethodType:       payload.paymentMethodType as PaymentMethodType,
      paymentMethodLabel:      payload.paymentMethodLabel,
      paymentMethodIdentifier: payload.paymentMethodIdentifier,
      contractType:            payload.contractType as ContractType,
      contractId:              payload.contractId,
      parentTransactionId:     payload.originalTransactionId,
      userId:                  payload.userId,
      usdEquivalent:           payload.refundAmount,
      paidAt:                  new Date(payload.refundedAt),
    });

    await this.repo.save(refund);
    await this.cacheService.invalidate('user:' + payload.userId + ':transactions');
    await this.ablyService.publishStatusUpdate(payload.userId, refund.id, status);
  }

  // 3.4 billing.invoice.generated
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.invoice.generated',
    queue: 'txn-svc.billing.events',
  })
  async onInvoiceGenerated(payload: BillingInvoiceGeneratedEvent): Promise<void> {
    const exists = await this.invoiceRepo.findOne({ where: { invoiceId: payload.invoiceId } });
    if (exists) return;

    const invoice = this.invoiceRepo.create({
      invoiceId:                payload.invoiceId,
      stripeInvoiceId:          payload.stripeInvoiceId,
      dateIssued:               new Date(payload.dateIssued),
      descriptionType:          payload.descriptionType,
      descriptionBillingPeriod: payload.descriptionBillingPeriod,
      dueDate:                  new Date(payload.dueDate),
      status:                   payload.status as InvoiceStatus,
      amount:                   payload.amount,
      contractId:               payload.contractId,
      userId:                   payload.userId,
    });

    await this.invoiceRepo.save(invoice);
    await this.cacheService.invalidate('user:' + payload.userId + ':invoices');
  }

  // 3.5 billing.invoice.status.updated
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.invoice.status.updated',
    queue: 'txn-svc.billing.events',
  })
  async onInvoiceStatusUpdated(payload: BillingInvoiceStatusUpdatedEvent): Promise<void> {
    await this.invoiceRepo.update(
      { invoiceId: payload.invoiceId, userId: payload.userId },
      { status: payload.newStatus as InvoiceStatus, updatedAt: new Date() },
    );
    await this.cacheService.invalidate('user:' + payload.userId + ':invoices');
  }

  // 3.6 billing.subscription.charged
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.subscription.charged',
    queue: 'txn-svc.billing.events',
  })
  async onSubscriptionCharged(payload: BillingSubscriptionChargedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const typeMap: Record<string, TransactionType> = {
      basic:      TransactionType.BASIC_MEMBERSHIP,
      pro:        TransactionType.PRO_MEMBERSHIP,
      enterprise: TransactionType.ENTERPRISE_MEMBERSHIP,
      agency:     TransactionType.ENTERPRISE_MEMBERSHIP,
    };

    const txn = this.repo.create({
      transactionId:            payload.eventId,
      date:                     new Date(payload.chargedAt),
      descriptionType:          typeMap[payload.membershipTier],
      descriptionBillingPeriod: payload.billingPeriod,
      amount:                   payload.amount,
      amountDirection:          AmountDirection.DEBIT,
      status:                   TransactionStatus.PAID,
      paymentMethodType:        payload.paymentMethodType as PaymentMethodType,
      paymentMethodLabel:       payload.paymentMethodLabel,
      paymentMethodIdentifier:  payload.paymentMethodIdentifier,
      contractType:             ContractType.SERVICE,
      contractId:               payload.contractId,
      billingFrequency:         payload.billingFrequency as BillingFrequency,
      membershipTier:           payload.membershipTier   as MembershipTier,
      userId:                   payload.userId,
      usdEquivalent:            payload.amount,
      paidAt:                   new Date(payload.chargedAt),
    });

    await this.repo.save(txn);
    await this.cacheService.invalidate('user:' + payload.userId + ':transactions');
    await this.publisher.publishTransactionCreated(txn);
  }

  // 3.7 billing.wire.transfer.confirmed
  @RabbitSubscribe({
    exchange: 'marketeq.billing', routingKey: 'billing.wire.transfer.confirmed',
    queue: 'txn-svc.billing.events',
  })
  async onWireTransferConfirmed(payload: BillingWireConfirmedEvent): Promise<void> {
    const exists = await this.repo.findOne({ where: { transactionId: payload.eventId } });
    if (exists) return;

    const wire = this.repo.create({
      transactionId:           payload.eventId,
      date:                    new Date(payload.confirmedAt),
      descriptionType:         TransactionType.PROJECT_PAYMENT,
      invoiceNumber:           payload.invoiceNumber,
      amount:                  payload.amount,
      amountDirection:         AmountDirection.DEBIT,
      status:                  TransactionStatus.PAID,
      paymentMethodType:       PaymentMethodType.BANK_ACH,
      paymentMethodLabel:      'Wire Transfer',
      paymentMethodIdentifier: 'WIRE',
      contractType:            payload.contractType as ContractType,
      contractId:              payload.contractId,
      userId:                  payload.userId,
      usdEquivalent:           payload.amount,
      paidAt:                  new Date(payload.confirmedAt),
    });
    await this.repo.save(wire);

    if (payload.wireFeeAmount > 0) {
      const fee = this.repo.create({
        transactionId:           payload.eventId + '-fee',
        date:                    new Date(payload.confirmedAt),
        descriptionType:         TransactionType.WIRE_TRANSFER_FEE,
        amount:                  payload.wireFeeAmount,
        amountDirection:         AmountDirection.DEBIT,
        status:                  TransactionStatus.PAID,
        paymentMethodType:       PaymentMethodType.BANK_ACH,
        paymentMethodLabel:      'Wire Transfer',
        paymentMethodIdentifier: 'WIRE',
        contractType:            payload.contractType as ContractType,
        contractId:              payload.contractId,
        parentTransactionId:     wire.id,
        userId:                  payload.userId,
        usdEquivalent:           payload.wireFeeAmount,
        paidAt:                  new Date(payload.confirmedAt),
      });
      await this.repo.save(fee);
    }

    await this.cacheService.invalidate('user:' + payload.userId + ':transactions');
  }
}