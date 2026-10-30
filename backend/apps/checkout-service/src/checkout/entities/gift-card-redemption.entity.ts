import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type GiftCardRedemptionType = 'payment' | 'refund';
export type GiftCardRedemptionStatus = 'pending' | 'completed';

@Entity('gift_card_redemptions')
export class GiftCardRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  giftCardId: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ['payment', 'refund'] })
  type: GiftCardRedemptionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'completed'], default: 'pending' })
  status: GiftCardRedemptionStatus;

  @Index()
  @Column({ type: 'varchar', length: 14 })
  orderId: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  sourceIp: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
