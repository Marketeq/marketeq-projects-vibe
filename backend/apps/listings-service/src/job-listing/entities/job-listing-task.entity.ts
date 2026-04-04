import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JobListingPhase } from './job-listing-phase.entity';
import { WorkSchedule } from '../enums/work-schedule.enum';

@Entity({ name: 'job_listing_tasks' })
export class JobListingTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'phase_id', type: 'uuid' })
  phaseId: string;

  @ManyToOne(() => JobListingPhase, (phase) => phase.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phase_id' })
  phase: JobListingPhase;

  @Column({ name: 'task_name', type: 'varchar', length: 200 })
  taskName: string;

  // Role title for the task (e.g. 'UX Designer', 'Backend Developer').
  // Used by AI to generate the job description and match talent.
  @Column({ name: 'role_title', type: 'varchar', length: 100 })
  roleTitle: string;

  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ name: 'experience_level', type: 'varchar', length: 50, nullable: true })
  experienceLevel: string | null;

  @Column({ type: 'enum', enum: WorkSchedule, default: WorkSchedule.FULL_TIME })
  workSchedule: WorkSchedule;

  // Used when workSchedule is CUSTOM. Stored as hours per the custom_frequency.
  @Column({ name: 'custom_hours', type: 'decimal', precision: 5, scale: 1, nullable: true })
  customHours: number | null;

  @Column({ name: 'custom_frequency', type: 'varchar', length: 20, nullable: true })
  customFrequency: string | null;

  // Estimated hours to complete this task. Drives duration and budget calculations.
  @Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 1 })
  estimatedHours: number;

  // Calculated fields. Updated automatically by job-listing-budget.service.ts
  // whenever estimated_hours, work_schedule, or role data changes.
  @Column({ name: 'start_day', type: 'int', nullable: true })
  startDay: number | null;

  @Column({ name: 'end_day', type: 'int', nullable: true })
  endDay: number | null;

  // Hourly rate in USD cents from pricing-service. Populated by budget service.
  @Column({ name: 'hourly_rate_usd_cents', type: 'int', nullable: true })
  hourlyRateUsdCents: number | null;

  @Column({ name: 'position_order', type: 'int', default: 0 })
  positionOrder: number;

  @Column({ name: 'i_want_to_change', type: 'text', nullable: true })
  iWantToChange: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
