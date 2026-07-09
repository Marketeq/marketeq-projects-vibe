import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { JobListing } from './job-listing.entity';
import { JobListingTask } from './job-listing-task.entity';
import { PhaseType } from '../enums/phase-type.enum';
import { RecurrenceSchedule } from '../enums/recurrence-schedule.enum';

@Entity({ name: 'job_listing_phases' })
// position_order is unique per job listing to enforce ordering.
@Index(['jobListingId', 'positionOrder'], { unique: true })
export class JobListingPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_listing_id', type: 'uuid' })
  jobListingId: string;

  @ManyToOne(() => JobListing, (listing) => listing.phases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_listing_id' })
  jobListing: JobListing;

  @Column({ name: 'phase_name', type: 'varchar', length: 100 })
  phaseName: string;

  @Column({ type: 'enum', enum: PhaseType })
  phaseType: PhaseType;

  // Position in the scope table. Enforced by the service layer:
  // SETUP is always position 0. ONGOING is always the highest position.
  // Only RECURRING phases can be reordered between those two anchors.
  @Column({ name: 'position_order', type: 'int' })
  positionOrder: number;

  // ── SETUP-SPECIFIC FIELDS ──────────────────────────────────────
  // Duration in days for SETUP phases. Null for RECURRING and ONGOING.
  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays: number | null;

  // ── RECURRING-SPECIFIC FIELDS ──────────────────────────────────
  @Column({ type: 'enum', enum: RecurrenceSchedule, nullable: true })
  recurrenceSchedule: RecurrenceSchedule | null;

  // Number of times this phase repeats. Max 99. Null for SETUP and ONGOING.
  @Column({ name: 'recurrence_count', type: 'int', nullable: true })
  recurrenceCount: number | null;

  @OneToMany(() => JobListingTask, (task) => task.phase, { cascade: true, eager: false })
  tasks: JobListingTask[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
