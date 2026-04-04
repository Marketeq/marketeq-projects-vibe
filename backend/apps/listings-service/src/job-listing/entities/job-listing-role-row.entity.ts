import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JobListing } from './job-listing.entity';
import { WorkSchedule } from '../enums/work-schedule.enum';

@Entity({ name: 'job_listing_role_rows' })
export class TeamMemberRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_listing_id', type: 'uuid' })
  jobListingId: string;

  @ManyToOne(() => JobListing, (listing) => listing.teamMemberRows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_listing_id' })
  jobListing: JobListing;

  @Column({ name: 'role_title', type: 'varchar', length: 100 })
  roleTitle: string;

  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ name: 'experience_level', type: 'varchar', length: 50, nullable: true })
  experienceLevel: string | null;

  @Column({ type: 'enum', enum: WorkSchedule, default: WorkSchedule.FULL_TIME })
  workSchedule: WorkSchedule;

  // Used when workSchedule is CUSTOM.
  @Column({ name: 'custom_hours', type: 'decimal', precision: 5, scale: 1, nullable: true })
  customHours: number | null;

  @Column({ name: 'custom_frequency', type: 'varchar', length: 20, nullable: true })
  customFrequency: string | null;

  // Contract length in months for this role.
  @Column({ name: 'contract_length_months', type: 'int', nullable: true })
  contractLengthMonths: number | null;

  // Hourly rate range from pricing-service. Stored in USD cents.
  @Column({ name: 'hourly_rate_low_usd_cents', type: 'int', nullable: true })
  hourlyRateLowUsdCents: number | null;

  @Column({ name: 'hourly_rate_high_usd_cents', type: 'int', nullable: true })
  hourlyRateHighUsdCents: number | null;

  // Assigned member's Marketeq user ID. Null means the role is unassigned (open).
  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string | null;

  // Assigned member's username for display. Populated when assigned_user_id is set.
  @Column({ name: 'assigned_username', type: 'varchar', length: 100, nullable: true })
  assignedUsername: string | null;

  // True when assigned_user_id references a deactivated account.
  // Role row enters disabled state in the UI when this is true.
  @Column({ name: 'assigned_user_deactivated', type: 'boolean', default: false })
  assignedUserDeactivated: boolean;

  @Column({ name: 'position_order', type: 'int', default: 0 })
  positionOrder: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
