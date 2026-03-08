import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingSubscription, SubscriptionStatus } from '../entities/subscription.entity';
import { BillingInvoice, InvoiceStatus } from '../entities/invoice.entity';
import { PaymentRetryLog } from '../entities/payment-retry-log.entity';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { EventsService } from './events.service';

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

    const subscription = await this.subRepo.save(this.subRepo.create({
      groupId: dto.groupId,
      clientId: dto.clientId,
      stripeCustomerId: dto.stripeCustomerId,
      stripeSubscriptionId,
      frequency: dto.frequency,
      installmentAmount,
      totalInstallments,
      projectId: dto.projectId,
      serviceId: dto.serviceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    }));

    this.logger.log(`Created billing subscription for group ${dto.groupId}`);
    return subscription;
  }

  async getSubscription(id: string): Promise<BillingSubscription> {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getInvoicesByContract(contractId: string): Promise<BillingInvoice[]> {
    return this.invoiceRepo.find({ where: { contractId }, order: { createdAt: 'DESC' } });
  }

  async getInvoicesByGroup(groupId: string): Promise<BillingInvoice[]> {
    return this.invoiceRepo.find({ where: { groupId }, order: { createdAt: 'DESC' } });
  }

  async handleGroupActivated(data: { groupId: string; clientId: string }) {
    // Create initial invoice record when group billing starts
    this.logger.log(`Group ${data.groupId} activated — billing started`);
    // Subscriptions are created at checkout; this just logs the activation
  }

  async handleContractEnded(data: {
    contractId: string;
    groupId: string;
    clientId: string;
    talentId: string;
  }) {
    // Finalize any pending invoices for this contract
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

  async handleInvoicePaid(stripeInvoiceId: string, amount: number) {
    const invoice = await this.invoiceRepo.findOne({ where: { stripeInvoiceId } });
    if (!invoice) {
      this.logger.warn(`Invoice not found for Stripe ID: ${stripeInvoiceId}`);
      return;
    }

    await this.invoiceRepo.update(invoice.id, {
      status: InvoiceStatus.PAID,
      paidAt: new Date().toISOString(),
    });

    // Increment paidInstallments on subscription
    if (invoice.subscriptionId) {
      await this.subRepo.increment({ id: invoice.subscriptionId }, 'paidInstallments', 1);
    }
  }

  async handlePaymentFailed(stripeInvoiceId: string, failureReason: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { stripeInvoiceId } });
    if (!invoice) return;

    // Find existing retry logs for this invoice
    const existingRetries = await this.retryRepo.count({ where: { invoiceId: invoice.id } });

    if (existingRetries >= RETRY_DELAYS_HOURS.length) {
      // All retries exhausted — pause subscription and emit event
      await this.invoiceRepo.update(invoice.id, { status: InvoiceStatus.FAILED });

      const sub = await this.subRepo.findOne({ where: { id: invoice.subscriptionId ?? '' } });
      if (sub) {
        await this.stripe.pauseSubscription(sub.stripeSubscriptionId);
        await this.subRepo.update(sub.id, { status: SubscriptionStatus.PAUSED });
        this.events.paymentFailed(invoice.contractId, invoice.groupId, 'all_retries_exhausted');
      }
      return;
    }

    // Schedule next retry
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

    this.logger.warn(`Payment failed for invoice ${invoice.id}. Retry ${existingRetries + 1} scheduled at ${nextRetryAt}`);
  }

  async cancelSubscription(groupId: string): Promise<void> {
    const subs = await this.subRepo.find({ where: { groupId } });
    for (const sub of subs) {
      await this.stripe.cancelSubscription(sub.stripeSubscriptionId);
      await this.subRepo.update(sub.id, { status: SubscriptionStatus.CANCELED });
    }
  }
}
