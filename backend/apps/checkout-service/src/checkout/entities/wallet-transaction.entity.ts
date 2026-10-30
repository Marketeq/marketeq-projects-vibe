import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type WalletTransactionType =
  | 'topup'
  | 'giftcard'
  | 'payment'
  | 'refund';
export type WalletTransactionStatus = 'pending' | 'completed';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ['topup', 'giftcard', 'payment', 'refund'] })
  type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'completed'], default: 'pending' })
  status: WalletTransactionStatus;

  @Index()
  @Column({ type: 'varchar', length: 14, nullable: true })
  orderId: string | null;

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
