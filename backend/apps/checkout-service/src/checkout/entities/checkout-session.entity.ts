import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PaymentMethod = 'card' | 'ach' | 'wire';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
export type InstallmentPlan = 'full' | 'monthly' | 'biweekly';

@Entity('checkout_sessions')
export class CheckoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ type: 'enum', enum: ['card', 'ach', 'wire'], default: 'card' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'], default: 'pending' })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: ['full', 'monthly', 'biweekly'], default: 'full' })
  installmentPlan: InstallmentPlan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletAmountUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  giftCardAmountUsed: number;

  @Column({ nullable: true })
  giftCardCode: string;

  @Column({ default: false })
  splitPaymentEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  initialPaymentAmount: number;

  @Column({ default: false })
  paymentVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  stripeMetadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
