import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type TxType = 'payment' | 'refund' | 'payout' | 'credit' | 'debit';
export type TxStatus = 'pending' | 'completed' | 'failed' | 'reversed';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() fromUserId: string;
  @Column() toUserId: string;
  @Column({ type: 'enum', enum: ['payment','refund','payout','credit','debit'] }) type: TxType;
  @Column({ type: 'enum', enum: ['pending','completed','failed','reversed'], default: 'pending' }) status: TxStatus;
  @Column({ type: 'decimal', precision: 14, scale: 4 }) amount: number;
  @Column({ default: 'USD' }) currency: string;
  @Column({ nullable: true }) referenceId: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}
