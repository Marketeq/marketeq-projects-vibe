// apps/payout-service/src/entities/payout-schedule.entity.ts
// PS-01 §3.3 + PS-17 + PS-18: PayoutSchedule entity with auto-balance split columns
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ScheduleFrequency {
  DAILY     = 'daily',
  WEEKLY    = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY   = 'monthly',
  CUSTOM    = 'custom',
}

@Entity('payout_schedules')
export class PayoutSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id', unique: true })
  contractorId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ScheduleFrequency, default: ScheduleFrequency.WEEKLY })
  frequency: ScheduleFrequency;

  @Column({ name: 'day_of_week', type: 'smallint', nullable: true })
  dayOfWeek: number | null;

  @Column({ name: 'day_of_month', type: 'smallint', nullable: true })
  dayOfMonth: number | null;

  @Column({ name: 'custom_interval_days', type: 'smallint', nullable: true })
  customIntervalDays: number | null;

  // US-72: optional window for a custom schedule — e.g. pause payouts during
  // a planned absence without disabling the schedule outright. Both null by
  // default (no window restriction, matches existing behavior).
  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ name: 'threshold_usd', type: 'numeric', precision: 18, scale: 8, default: '50' })
  thresholdUsd: string;

  @Column({ name: 'reserve_usd', type: 'numeric', precision: 18, scale: 8, default: '0' })
  reserveUsd: string;

  // ─── Split config (PS-18) ─────────────────────────────────────
  @Column({ name: 'primary_method_id', nullable: true, type: 'varchar' })
  primaryMethodId: string | null;

  @Column({ name: 'secondary_method_id', nullable: true, type: 'varchar' })
  secondaryMethodId: string | null;

  // PS-18 §2: primarySplitPercent is the single source of truth.
  // secondarySplitPercent = 100.00 - primarySplitPercent (computed in code).
  @Column({ name: 'primary_split_percent', type: 'numeric', precision: 5, scale: 2, default: 100.00 })
  primarySplitPercent: number;

  @Column({ name: 'split_enabled', default: false })
  splitEnabled: boolean;

  @Column({ name: 'split_enabled_at', type: 'timestamptz', nullable: true })
  splitEnabledAt: Date | null;

  @Column({ name: 'split_disabled_at', type: 'timestamptz', nullable: true })
  splitDisabledAt: Date | null;

  // ─── Scheduling ───────────────────────────────────────────────
  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  // PS-17: Execution engine columns
  @Column({ name: 'anchor_date', type: 'timestamptz', nullable: true })
  anchorDate: Date | null;

  @Column({ name: 'paused_at', type: 'timestamptz', nullable: true })
  pausedAt: Date | null;

  @Column({ name: 'consecutive_miss_count', type: 'int', default: 0 })
  consecutiveMissCount: number;

  @Column({ name: 'last_skipped_at', type: 'timestamptz', nullable: true })
  lastSkippedAt: Date | null;

  @Column({ name: 'last_skip_reason', type: 'varchar', length: 64, nullable: true })
  lastSkipReason: string | null;

  @Column({ name: 'next_execution_at', type: 'timestamptz', nullable: true })
  nextExecutionAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Computed getter (PS-18 §2) ───────────────────────────────
  get secondarySplitPercent(): number {
    return Math.round((100.00 - this.primarySplitPercent) * 100) / 100;
  }
}
