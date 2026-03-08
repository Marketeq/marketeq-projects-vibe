import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  FINALIZED = 'finalized',
  VOIDED = 'voided',
}

@Entity('billing_invoices')
@Index(['contractId'])
@Index(['groupId'])
@Index(['stripeInvoiceId'])
export class BillingInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractId: string;

  @Column()
  groupId: string;

  @Column()
  clientId: string;

  @Column()
  talentId: string;

  @Column({ nullable: true })
  subscriptionId: string;

  @Column({ nullable: true })
  stripeInvoiceId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  creditApplied: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ nullable: true })
  paidAt: string;

  @Column({ nullable: true })
  finalizedAt: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
