import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JobListing } from './job-listing.entity';

// One RoleDescription per role tab on the Step 5 review screen.
// For a listing with 5 roles there will be 5 RoleDescription records.
// roleTitle must match the roleTitle on the corresponding TeamMemberRow
// or JobListingTask to link descriptions to roles.
@Entity({ name: 'job_listing_role_descriptions' })
export class RoleDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_listing_id', type: 'uuid' })
  jobListingId: string;

  @ManyToOne(() => JobListing, (listing) => listing.roleDescriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_listing_id' })
  jobListing: JobListing;

  // Identifies which role tab this description belongs to.
  @Column({ name: 'role_title', type: 'varchar', length: 100 })
  roleTitle: string;

  // Project/service-level overview shown at the top of Step 5.
  // AI-generated. Max 100 words. Rich text stored as plain text.
  @Column({ name: 'overview', type: 'text', nullable: true })
  overview: string | null;

  // Benefits of joining the project/service. AI-generated. Max 100 words.
  @Column({ name: 'benefits', type: 'text', nullable: true })
  benefits: string | null;

  // Role-specific responsibilities. AI-generated. Max 100 words.
  @Column({ name: 'responsibilities', type: 'text', nullable: true })
  responsibilities: string | null;

  // Array of skill tags for this role. Max 20 tags. Each tag max 50 chars.
  @Column({ name: 'skills', type: 'text', array: true, default: () => "'{}'" })
  skills: string[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
