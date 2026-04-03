import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: 'topup' | 'giftcard' | 'payment';

  @Column('decimal')
  amount: number;

  @Column({ default: 'completed' })
  status: 'pending' | 'completed';

  @CreateDateColumn()
  createdAt: Date;
}