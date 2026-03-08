import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('earnings_cache')
@Index(['contractorId'])
export class EarningsCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractorId: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  contractLabel: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  grossAmountUsd: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0.05 })
  platformFeeRate: number;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  netAmountUsd: number;

  @Column({ nullable: true })
  displayCurrency: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  displayAmount: number;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  earnedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
