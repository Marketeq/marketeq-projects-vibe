import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('stripe_customers')
export class StripeCustomer {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', unique: true })
  stripeCustomerId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
