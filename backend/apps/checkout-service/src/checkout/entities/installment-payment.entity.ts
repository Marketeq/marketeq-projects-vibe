import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type InstallmentStatus = 'active' | 'canceled' | 'paused';

@Entity('installment_payments')
export class InstallmentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Column({ type: 'enum', enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] })
  frequency: InstallmentFrequency;

  @Column({ type: 'text' })
  stripeSubscriptionId: string;

  @Column({ type: 'enum', enum: ['active', 'canceled', 'paused'], default: 'active' })
  status: InstallmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  nextPaymentDue: Date | null;

  @Column({ type: 'int' })
  totalPayments: number;

  @Column({ type: 'int', default: 0 })
  completedPayments: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
