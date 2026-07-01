import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingSubscription, SubscriptionStatus, BillingFrequency } from '../entities/subscription.entity';
import { BillingInvoice, InvoiceStatus } from '../entities/invoice.entity';
import { PaymentRetryLog } from '../entities/payment-retry-log.entity';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { EventsService } from './events.service';
import { getDepositMultiplier } from '../utils/installment-calculator';

const RETRY_DELAYS_HOURS = [12, 24, 36]; // 3 attempts over 72 hours

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(BillingSubscription) private readonly subRepo: Repository<BillingSubscription>,
    @InjectRepository(BillingInvoice) private readonly invoiceRepo: Repository<BillingInvoice>,
    @InjectRepository(PaymentRetryLog) private readonly retryRepo: Repository<PaymentRetryLog>,
    private readonly stripe: StripeSubscriptionService,
    private readonly events: EventsService,
  ) {}

  async createSubscription(dto: CreateSubscriptionDto): Promise<BillingSubscription> {
    const { stripeSubscriptionId, installmentAmount, totalInstallments } =
      await this.stripe.createSubscription(dto);

    const depositMultiplier = getDepositMultiplier(dto.frequency);
    const depositAmount = installmentAmount * depositMultiplier;

    const subscription = await this.subRepo.save(this.subRepo.create({
      groupId: dto.groupId,
      clientId: dto.clientId,
      stripeCustomerId: dto.stripeCustomerId,
      stripeSubscriptionId,
      frequency: dto.frequency,
      installmentAmount,
      totalInstallments,
      depositAmount,
      depositPaid: false,
      projectId: dto.projectId,
      serviceId: dto.serviceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    }));

    this.logger.log(`Created billing subscription for group ${dto.groupId} (deposit: $${depositAmount})`);
    return subscription;
  }

  async getSubscription(id: string): Promise<BillingSubscription> {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getSubscriptionsByGroup(groupId: string): Promise<BillingSubscription[]> {
    return this.subRepo.find({ where: { groupId }, order: { createdAt: 'DESC' } });
  }

  async getSubscriptionsByClient(clientId: string): Promise<BillingSubscription[]> {
    return this.subRepo.find({ where: { clientId }, order: { createdAt: 'DESC' } });
  }

  async getInvoicesByContract(contractId: string): Promise<BillingInvoice[]> {
    return this.invoiceRepo.find({ where: { contractId }, order: { createdAt: 'DESC' } });
  }

  async getInvoicesByGroup(groupId: string): Promise<BillingInvoice[]> {
    return this.invoiceRepo.find({ where: { groupId }, order: { createdAt: 'DESC' } });
  }

  async getInvoice(id: string): Promise<BillingInvoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async handleGroupActivated(data: { groupId: string; clientId: string }) {
    const subscriptions = await this.subRepo.find({ where: { groupId: data.groupId, status: SubscriptionStatus.ACTIVE } });

    for (const sub of subscriptions) {
      // Create the first invoice (deposit invoice) for each subscription
      const invoice = await this.invoiceRepo.save(this.invoiceRepo.create({
        contractId: sub.contractId || sub.groupId,
        groupId: sub.groupId,
        clientId: sub.clientId,
        talentId: '', // populated when contract details arrive
        subscriptionId: sub.id,
        amount: sub.depositAmount > 0 ? sub.depositAmount : sub.installmentAmount,
        installmentNumber: 1,
        description: sub.depositAmount > 0 ? 'Deposit payment' : 'Installment #1',
        status: InvoiceStatus.PENDING,
      }));

      this.events.invoiceCreated(invoice.id, invoice.contractId, invoice.groupId, invoice.amount, 1);
      this.logger.log(`Created initial invoice ${invoice.id} for subscription ${sub.id}`);
    }

    this.logger.log(`Group ${data.groupId} activated — ${subscriptions.length} initial invoice(s) created`);
  }

  async handleContractEnded(data: {
    contractId: string;
    groupId: string;
    clientId: string;
    talentId: string;
  }) {
    const pendingInvoices = await this.invoiceRepo.find({
      where: { contractId: data.contractId, status: InvoiceStatus.PENDING },
    });

    for (const invoice of pendingInvoices) {
      await this.invoiceRepo.update(invoice.id, {
        status: InvoiceStatus.FINALIZED,
        finalizedAt: new Date().toISOString(),
      });

      this.events.billingFinalized(data.contractId, invoice.id, invoice.amount, invoice.creditApplied);
    }

    this.logger.log(`Finalized ${pendingInvoices.length} invoice(s) for contract ${data.contractId}`);
  }

  async handleInvoicePaid(stripeInvoiceId: string, amountPaidCents: number) {
    let invoice = await this.invoiceRepo.findOne({ where: { stripeInvoiceId } });

    if (!invoice) {
      // Auto-create invoice record from Stripe webhook if not pre-existing
      // This handles subsequent installment invoices created by Stripe's recurring billing
      const sub = await this.findSubscriptionByStripeInvoice(stripeInvoiceId);
      if (sub) {
        const nextInstallment = sub.paidInstallments + 1;
        invoice = await this.invoiceRepo.save(this.invoiceRepo.create({
          contractId: sub.contractId || sub.groupId,
          groupId: sub.groupId,
          clientId: sub.clientId,
          talentId: '',
          subscriptionId: sub.id,
          stripeInvoiceId,
          amount: amountPaidCents / 100,
          installmentNumber: nextInstallment,
          description: `Installment #${nextInstallment}`,
          status: InvoiceStatus.PENDING,
        }));
        this.logger.log(`Auto-created invoice for Stripe invoice ${stripeInvoiceId}`);
      } else {
        this.logger.warn(`Invoice not found for Stripe ID: ${stripeInvoiceId}`);
        return;
      }
    }

    await this.invoiceRepo.update(invoice.id, {
      status: InvoiceStatus.PAID,
      paidAt: new Date().toISOString(),
      stripeInvoiceId,
    });

    if (invoice.subscriptionId) {
      const sub = await this.subRepo.findOne({ where: { id: invoice.subscriptionId } });
      if (sub) {
        await this.subRepo.increment({ id: sub.id }, 'paidInstallments', 1);

        // Mark deposit as paid if this is the first payment
        if (!sub.depositPaid) {
          await this.subRepo.update(sub.id, { depositPaid: true });
        }

        // Check if subscription is complete
        if (sub.totalInstallments > 0 && sub.paidInstallments + 1 >= sub.totalInstallments) {
          await this.stripe.cancelSubscription(sub.stripeSubscriptionId);
          await this.subRepo.update(sub.id, { status: SubscriptionStatus.CANCELED });
          this.logger.log(`Subscription ${sub.id} completed — all ${sub.totalInstallments} installments paid`);
        }

        this.events.paymentSucceeded(invoice.contractId, invoice.groupId, invoice.id, invoice.amount);
      }
    }
  }

  async handlePaymentFailed(stripeInvoiceId: string, failureReason: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { stripeInvoiceId } });
    if (!invoice) return;

    const existingRetries = await this.retryRepo.count({ where: { invoiceId: invoice.id } });

    if (existingRetries >= RETRY_DELAYS_HOURS.length) {
      await this.invoiceRepo.update(invoice.id, { status: InvoiceStatus.FAILED });

      const sub = await this.subRepo.findOne({ where: { id: invoice.subscriptionId ?? '' } });
      if (sub) {
        await this.stripe.pauseSubscription(sub.stripeSubscriptionId);
        await this.subRepo.update(sub.id, { status: SubscriptionStatus.PAUSED });
        this.events.paymentFailed(invoice.contractId, invoice.groupId, 'all_retries_exhausted');
        this.events.subscriptionPaused(sub.groupId, 'payment_failure');
      }
      return;
    }

    const delayHours = RETRY_DELAYS_HOURS[existingRetries];
    const nextRetryAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

    await this.retryRepo.save(this.retryRepo.create({
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId ?? '',
      attemptNumber: existingRetries + 1,
      failureReason,
      nextRetryAt,
      succeeded: false,
    }));

    // Mark subscription as past_due after first failure
    if (invoice.subscriptionId) {
      await this.subRepo.update(invoice.subscriptionId, { status: SubscriptionStatus.PAST_DUE });
    }

    this.logger.warn(`Payment failed for invoice ${invoice.id}. Retry ${existingRetries + 1} scheduled at ${nextRetryAt}`);
  }

  async cancelSubscription(groupId: string): Promise<void> {
    const subs = await this.subRepo.find({
      where: { groupId, status: SubscriptionStatus.ACTIVE },
    });
    for (const sub of subs) {
      await this.stripe.cancelSubscription(sub.stripeSubscriptionId);
      await this.subRepo.update(sub.id, { status: SubscriptionStatus.CANCELED });
    }
    this.events.subscriptionCanceled(groupId);
  }

  async pauseSubscription(groupId: string, reason: string): Promise<void> {
    const subs = await this.subRepo.find({
      where: { groupId, status: SubscriptionStatus.ACTIVE },
    });
    for (const sub of subs) {
      await this.stripe.pauseSubscription(sub.stripeSubscriptionId);
      await this.subRepo.update(sub.id, { status: SubscriptionStatus.PAUSED });
    }
    this.events.subscriptionPaused(groupId, reason);
  }

  async resumeSubscription(groupId: string): Promise<void> {
    const subs = await this.subRepo.find({
      where: { groupId, status: SubscriptionStatus.PAUSED },
    });
    for (const sub of subs) {
      await this.stripe.resumeSubscription(sub.stripeSubscriptionId);
      await this.subRepo.update(sub.id, { status: SubscriptionStatus.ACTIVE });
    }
    this.events.subscriptionResumed(groupId);
  }

  async refundInvoice(invoiceId: string, amountCents?: number): Promise<BillingInvoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.PAID) {
      throw new BadRequestException('Only paid invoices can be refunded');
    }

    const refundAmount = amountCents ? amountCents / 100 : invoice.amount;
    if (refundAmount > invoice.amount - invoice.refundedAmount) {
      throw new BadRequestException('Refund amount exceeds remaining refundable amount');
    }

    if (invoice.stripeInvoiceId) {
      await this.stripe.refundInvoice(invoice.stripeInvoiceId, amountCents);
    }

    const newRefundedTotal = Number(invoice.refundedAmount) + refundAmount;
    const isFullRefund = newRefundedTotal >= invoice.amount;

    await this.invoiceRepo.update(invoice.id, {
      refundedAmount: newRefundedTotal,
      refundedAt: new Date().toISOString(),
      status: isFullRefund ? InvoiceStatus.REFUNDED : InvoiceStatus.PAID,
    });

    this.events.refundIssued(invoice.id, invoice.contractId, refundAmount);

    return this.invoiceRepo.findOne({ where: { id: invoiceId } }) as Promise<BillingInvoice>;
  }

  async getRetryLogs(invoiceId: string): Promise<PaymentRetryLog[]> {
    return this.retryRepo.find({ where: { invoiceId }, order: { attemptNumber: 'ASC' } });
  }

  private async findSubscriptionByStripeInvoice(stripeInvoiceId: string): Promise<BillingSubscription | null> {
    try {
      const stripeInvoice = await this.stripe.retrieveInvoice(stripeInvoiceId);
      if (stripeInvoice?.subscription) {
        const stripeSubId = typeof stripeInvoice.subscription === 'string'
          ? stripeInvoice.subscription
          : stripeInvoice.subscription.id;
        return this.subRepo.findOne({ where: { stripeSubscriptionId: stripeSubId } });
      }
    } catch (err) {
      this.logger.warn(`Could not retrieve Stripe invoice ${stripeInvoiceId}: ${err}`);
    }
    return null;
  }
}
