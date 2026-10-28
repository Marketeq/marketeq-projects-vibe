import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OrderStatus = 'processing' | 'paid' | 'failed';

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

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
