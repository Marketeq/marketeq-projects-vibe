import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentMethod = 'card' | 'ach' | 'wire' | 'klarna';
export type PaymentStatus =
  'pending' | 'success' | 'failed' | 'cancelled' | 'refunded' | 'expired';
export type AppliedGiftCard = { code: string; amountUsed: number };
export type InstallmentPlan = 'full' | 'monthly' | 'biweekly';

@Entity('sessions')
export class CheckoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  listingId: string;

  @Column({ type: 'varchar', nullable: true })
  contractId: string | null;

  @Column({ nullable: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({
    type: 'enum',
    enum: ['card', 'ach', 'wire', 'klarna'],
    default: 'card',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded', 'expired'],
    default: 'pending',
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: ['full', 'monthly', 'biweekly'],
    default: 'full',
  })
  installmentPlan: InstallmentPlan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletAmountUsed: number;

  @Column({ default: false })
  splitPaymentEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  initialPaymentAmount: number;

  @Column({ default: false })
  paymentVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  stripeMetadata: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  appliedGiftCards: AppliedGiftCard[] | null;

  @Column({ type: 'uuid', nullable: true })
  appliedPromoCode: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
