import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum BillingFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
}

@Entity('billing_subscriptions')
@Index(['groupId'])
@Index(['contractId'])
export class BillingSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column({ nullable: true })
  contractId: string;

  @Column()
  clientId: string;

  @Column()
  stripeCustomerId: string;

  @Column()
  stripeSubscriptionId: string;

  @Column({ type: 'enum', enum: BillingFrequency })
  frequency: BillingFrequency;

  @Column('decimal', { precision: 10, scale: 2 })
  installmentAmount: number;

  @Column({ type: 'int' })
  totalInstallments: number;

  @Column({ type: 'int', default: 1 })
  paidInstallments: number;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  startDate: string;

  @Column({ nullable: true })
  endDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
