import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stripe_metadata')
export class StripeMetadata {
  @PrimaryColumn({ type: 'text' })
  stripeSessionId: string;

  @Column({ type: 'text', nullable: true })
  paymentIntentId: string | null;

  @Column({ type: 'text', nullable: true })
  customerId: string | null;

  @Column('uuid')
  clientId: string;

  @Column('uuid')
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ type: 'text' })
  paymentMethod: string;

  @Column({ type: 'text' })
  billingType: string;

  @Column({ type: 'text', nullable: true })
  subscriptionId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', default: 'pending' })
  paymentStatus: string;

  @Column({ type: 'text', default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'boolean', default: false })
  wireTransferConfirmed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
