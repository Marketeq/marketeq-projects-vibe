import { Controller, Logger } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'
import { TransactionService } from '../services/transaction.service'
import { InvoiceService } from '../services/invoice.service'
import { TransactionType, TransactionStatus, AmountDirection } from '../entities/transaction.entity'
import { InvoiceStatus } from '../entities/invoice.entity'

@Controller()
export class BillingConsumer {
  private readonly logger = new Logger(BillingConsumer.name)

  constructor(
    private readonly txSvc: TransactionService,
    private readonly invoiceSvc: InvoiceService,
  ) {}

  @EventPattern('payment_completed')
  async onPaymentCompleted(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.userId,
      type: TransactionType.PAID_IN_FULL,
      status: TransactionStatus.PAID,
      direction: AmountDirection.DEBIT,
      amount: data.amount,
      currency: data.currency,
      fee: data.fee,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeInvoiceId: data.stripeInvoiceId,
      description: data.description ?? 'Payment completed',
      paidAt: new Date().toISOString(),
    })
  }

  @EventPattern('payment_failed')
  async onPaymentFailed(@Payload() data: any) {
    if (data.transactionId) {
      await this.txSvc.updateStatus(data.transactionId, TransactionStatus.FAILED)
    }
  }

  @EventPattern('refund_issued')
  async onRefundIssued(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.userId,
      type: TransactionType.REFUND_ISSUED,
      status: TransactionStatus.REFUNDED,
      direction: AmountDirection.CREDIT,
      amount: data.amount,
      currency: data.currency,
      parentTransactionId: data.parentTransactionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      description: data.description ?? 'Refund issued',
      paidAt: new Date().toISOString(),
    })
  }

  @EventPattern('invoice_generated')
  async onInvoiceGenerated(@Payload() data: any) {
    await this.invoiceSvc.recordFromEvent({
      userId: data.userId,
      transactionId: data.transactionId,
      stripeInvoiceId: data.stripeInvoiceId,
      invoiceNumber: data.invoiceNumber,
      status: InvoiceStatus.PAYMENT_PENDING,
      amount: data.amount,
      currency: data.currency,
      dueDate: data.dueDate,
      description: data.description,
      hostedInvoiceUrl: data.hostedInvoiceUrl,
      invoicePdfUrl: data.invoicePdfUrl,
    })
  }

  @EventPattern('invoice_status_updated')
  async onInvoiceStatusUpdated(@Payload() data: any) {
    await this.invoiceSvc.updateStatus(data.stripeInvoiceId, data.status as InvoiceStatus)
  }

  @EventPattern('subscription_charged')
  async onSubscriptionCharged(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.userId,
      type: data.membershipTier === 'basic'
        ? TransactionType.BASIC_MEMBERSHIP
        : data.membershipTier === 'pro'
          ? TransactionType.PRO_MEMBERSHIP
          : TransactionType.ENTERPRISE_MEMBERSHIP,
      status: TransactionStatus.PAID,
      direction: AmountDirection.DEBIT,
      amount: data.amount,
      currency: data.currency,
      membershipTier: data.membershipTier,
      billingFrequency: data.billingFrequency,
      description: `${data.membershipTier} membership`,
      paidAt: new Date().toISOString(),
    })
  }

  @EventPattern('wire_transfer_confirmed')
  async onWireTransferConfirmed(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.userId,
      type: TransactionType.WIRE_TRANSFER_FEE,
      status: TransactionStatus.PAID,
      direction: AmountDirection.DEBIT,
      amount: data.amount,
      currency: data.currency,
      description: 'Wire transfer confirmed',
      paidAt: new Date().toISOString(),
    })
  }
}
