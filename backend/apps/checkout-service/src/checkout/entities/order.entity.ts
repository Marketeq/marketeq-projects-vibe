import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { PaymentMethod, PaymentPhase } from './payment.entity';

export type OrderStatus = 'processing' | 'paid' | 'failed';

export type OrderSnapshotAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phoneNumber: string;
};

export type OrderPaymentSnapshotEntry = {
  paymentId: string;
  phase: PaymentPhase;
  method: PaymentMethod;
  card: {
    brand: string;
    funding: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  billingAddress: OrderSnapshotAddress | null;
  capturedAt: string;
};

@Entity('orders')
@Index(['clientId', 'createdAt'])
export class Order {
  @PrimaryColumn({
    type: 'varchar',
    length: 14,
    default: () => '"checkout"."next_order_id"()',
  })
  orderId: string;

  @Column({ type: 'uuid', unique: true })
  sessionId: string;

  @Column({ type: 'varchar' })
  clientId: string;

  @Column({ type: 'varchar' })
  listingId: string;

  @Column({
    type: 'enum',
    enum: ['processing', 'paid', 'failed'],
    default: 'processing',
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderCost: number;

  @Column({ type: 'varchar', nullable: true })
  confirmationEmail: string | null;

  @Column({ type: 'jsonb', nullable: true })
  paymentSnapshot: OrderPaymentSnapshotEntry[] | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
