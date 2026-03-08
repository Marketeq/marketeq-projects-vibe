import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

export enum InvoiceStatus {
  PAID = 'paid',
  PROCESSING = 'processing',
  SCHEDULED = 'scheduled',
  PAYMENT_PENDING = 'payment_pending',
  FAILED = 'failed',
  OVERDUE = 'overdue',
  PARTIALLY_PAID = 'partially_paid',
}

@Entity({ schema: 'transaction_service', name: 'invoices' })
@Index(['userId', 'createdAt'])
@Index(['userId', 'status'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null

  @Column({ name: 'stripe_invoice_id', type: 'varchar', nullable: true })
  stripeInvoiceId: string | null

  @Column({ name: 'invoice_number', type: 'varchar', length: 50 })
  invoiceNumber: string

  @Column({ type: 'enum', enum: InvoiceStatus })
  status: InvoiceStatus

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null

  @Column({ name: 'hosted_invoice_url', type: 'text', nullable: true })
  hostedInvoiceUrl: string | null

  @Column({ name: 'invoice_pdf_url', type: 'text', nullable: true })
  invoicePdfUrl: string | null

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
