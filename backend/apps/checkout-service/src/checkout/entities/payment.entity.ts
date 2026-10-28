import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentMethod =
  | 'card'
  | 'ach'
  | 'wire'
  | 'google_pay'
  | 'apple_pay'
  | 'klarna';
export type PaymentPhase = 'initial' | 'recurring';
export type PaymentLineStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'active'
  | 'inactive';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: ['initial', 'recurring'],
    default: 'initial',
  })
  phase: PaymentPhase;

  @Column({
    type: 'enum',
    enum: ['card', 'ach', 'wire', 'google_pay', 'apple_pay', 'klarna'],
  })
  method: PaymentMethod;

  @Column({ type: 'uuid', nullable: true })
  savedMethodId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'paid', 'failed', 'active', 'inactive'],
    default: 'pending',
  })
  status: PaymentLineStatus;

  @Column({ type: 'varchar', nullable: true, unique: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  stripeSubscriptionId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
