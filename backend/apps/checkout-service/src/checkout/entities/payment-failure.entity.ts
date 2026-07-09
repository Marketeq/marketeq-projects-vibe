import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('payment_failures')
@Unique(['userId', 'paymentMethodId'])
export class PaymentFailure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'text' })
  paymentMethodId: string;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamptz' })
  lastFailureAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
