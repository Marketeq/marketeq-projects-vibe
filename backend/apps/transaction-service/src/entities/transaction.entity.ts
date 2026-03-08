import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Contract } from './contract.entity'
import { PaymentMethod } from './payment-method.entity'

export enum TransactionType {
  DAILY_INSTALLMENT = 'daily_installment',
  WEEKLY_INSTALLMENT = 'weekly_installment',
  MONTHLY_INSTALLMENT = 'monthly_installment',
  QUARTERLY_INSTALLMENT = 'quarterly_installment',
  ANNUAL_INSTALLMENT = 'annual_installment',
  HOURLY_PAYMENT = 'hourly_payment',
  FINAL_PAYMENT = 'final_payment',
  PAID_IN_FULL = 'paid_in_full',
  REFUND_ISSUED = 'refund_issued',
  CREDIT_APPLIED = 'credit_applied',
  DEPOSIT = 'deposit',
  WIRE_TRANSFER_FEE = 'wire_transfer_fee',
  PURCHASE = 'purchase',
  BASIC_MEMBERSHIP = 'basic_membership',
  PRO_MEMBERSHIP = 'pro_membership',
  ENTERPRISE_MEMBERSHIP = 'enterprise_membership',
  LEDGER_CORRECTION = 'ledger_correction',
  CASE = 'case',
  PROJECT_PAYMENT = 'project_payment',
}

export enum TransactionStatus {
  PAID = 'paid',
  PROCESSING = 'processing',
  SCHEDULED = 'scheduled',
  PAYMENT_PENDING = 'payment_pending',
  FAILED = 'failed',
  OVERDUE = 'overdue',
  SUCCEEDED = 'succeeded',
  CREDITED = 'credited',
  REFUNDED = 'refunded',
  PENDING = 'pending',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  IN_DISPUTE = 'in_dispute',
}

export enum AmountDirection {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum BillingFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum MembershipTier {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  AGENCY = 'agency',
}

@Entity({ schema: 'transaction_service', name: 'transactions' })
@Index(['userId', 'createdAt'])
@Index(['userId', 'status'])
@Index(['userId', 'type'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId: string | null

  @Column({ name: 'payment_method_id', type: 'uuid', nullable: true })
  paymentMethodId: string | null

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', nullable: true })
  stripePaymentIntentId: string | null

  @Column({ name: 'stripe_invoice_id', type: 'varchar', nullable: true })
  stripeInvoiceId: string | null

  @Column({ name: 'parent_transaction_id', type: 'uuid', nullable: true })
  parentTransactionId: string | null

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus

  @Column({ type: 'enum', enum: AmountDirection })
  direction: AmountDirection

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  fee: number | null

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  net: number | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null

  @Column({ name: 'billing_frequency', type: 'enum', enum: BillingFrequency, nullable: true })
  billingFrequency: BillingFrequency | null

  @Column({ name: 'membership_tier', type: 'enum', enum: MembershipTier, nullable: true })
  membershipTier: MembershipTier | null

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null

  @Column({ name: 'problem_report_count', type: 'int', default: 0 })
  problemReportCount: number

  @ManyToOne(() => Contract, { nullable: true, eager: false })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract

  @ManyToOne(() => PaymentMethod, { nullable: true, eager: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
