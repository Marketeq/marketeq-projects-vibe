import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'sessions', schema: 'time_tracking' })
@Index('idx_sessions_user_contract', ['userId', 'contractId'])
@Index('idx_sessions_started_at', ['startedAt'])
export class Session {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ name: 'contract_id', type: 'text' })
  contractId!: string;

  @Column({ name: 'task_id', type: 'text' })
  taskId!: string;

  @Column({ name: 'device_id', type: 'text' })
  deviceId!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'end_reason', type: 'text', nullable: true })
  endReason!: string | null;

  @Column({ name: 'billable_seconds', type: 'int', default: 0 })
  billableSeconds!: number;

  @Column({ name: 'paid_break_seconds', type: 'int', default: 0 })
  paidBreakSeconds!: number;

  @Column({ name: 'unpaid_break_seconds', type: 'int', default: 0 })
  unpaidBreakSeconds!: number;

  @Column({ name: 'idle_seconds', type: 'int', default: 0 })
  idleSeconds!: number;

  @Column({ type: 'boolean', default: false })
  disputed!: boolean;

  @Column({ type: 'boolean', nullable: true })
  approved!: boolean | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'text', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
