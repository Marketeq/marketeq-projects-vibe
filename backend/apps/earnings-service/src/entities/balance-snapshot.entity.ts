import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('balance_snapshots')
@Index(['contractorId'])
export class BalanceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractorId: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  availableBalanceUsd: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  pendingBalanceUsd: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  withdrawnBalanceUsd: number;

  @Column({ nullable: true })
  displayCurrency: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  displayBalance: number;

  @CreateDateColumn()
  snapshotAt: Date;
}
