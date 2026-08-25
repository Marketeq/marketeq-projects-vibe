import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('earnings_cache')
@Index('idx_earnings_cache_contractor_created', ['contractorId', 'createdAt'])
@Index('idx_earnings_cache_contractor_status', ['contractorId', 'status'])
@Index('idx_earnings_cache_contract_id', ['contractId'])
@Index('idx_earnings_cache_work_start', ['contractorId', 'workStartAt'])
export class EarningsCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  transactionId: string;

  @Column({ type: 'uuid' })
  @Index('idx_earnings_cache_contractor_id')
  contractorId: string;

  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'varchar', length: 20 })
  entryType: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  grossAmount: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  feeAmount: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  netAmount: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  fxRateToUsd: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  netAmountUsd: string;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status: string;

  @Column({ type: 'timestamptz' })
  workStartAt: Date;

  @Column({ type: 'timestamptz' })
  workEndAt: Date;

  @Column({ type: 'integer' })
  durationMinutes: number;

  @Column({ type: 'integer', nullable: true })
  avgKeyboardPct: number | null;

  @Column({ type: 'integer', nullable: true })
  avgMousePct: number | null;

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reversedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  taskName: string | null;

  @Column({ type: 'text', nullable: true })
  contractRef: string | null;

  @Column({ type: 'text', nullable: true })
  taskRef: string | null;
}
