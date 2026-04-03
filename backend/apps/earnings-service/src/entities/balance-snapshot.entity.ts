import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('balance_snapshots')
export class BalanceSnapshot {
  @PrimaryColumn({ type: 'uuid' })
  contractorId: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  availableBalance: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  availableBalanceLocal: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  availableBalanceDisplay: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  displayCurrency: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  localCurrency: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  totalEarnedUsd: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  totalPaidOutUsd: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: '0' })
  pendingHoldUsd: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastCreditAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastDebitAt: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
