import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('billing_payment_retry_logs')
@Index(['invoiceId'])
export class PaymentRetryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column()
  subscriptionId: string;

  @Column({ type: 'int' })
  attemptNumber: number;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  nextRetryAt: string;

  @Column({ default: false })
  succeeded: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
