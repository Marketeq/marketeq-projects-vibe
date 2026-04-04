import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { JobListing } from './job-listing.entity';

// One BasicInformation record per JobListing. Stored separately to keep
// the main entity lean. Created by AI from Step 2 input when the client
// reaches Step 5. Client can edit all fields before publishing.
@Entity({ name: 'job_listing_basic_info' })
export class BasicInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_listing_id', type: 'uuid', unique: true })
  jobListingId: string;

  @OneToOne(() => JobListing, (listing) => listing.basicInformation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_listing_id' })
  jobListing: JobListing;

  // AI-generated from Step 2 description. Max 100 characters.
  // Labelled 'Project Title' for projects, 'Service Title' for services.
  @Column({ name: 'title', type: 'varchar', length: 100 })
  title: string;

  // AI-detected job type (e.g. 'Website', 'Mobile App', 'API Integration').
  @Column({ name: 'job_type', type: 'varchar', length: 100, nullable: true })
  jobType: string | null;

  // Array of industry tags. AI-generated. Max 10 tags. Each tag max 50 chars.
  @Column({ name: 'industries', type: 'text', array: true, default: () => "'{}'" })
  industries: string[];

  // Array of language tags. AI-generated. Max 10 tags. Each tag max 50 chars.
  @Column({ name: 'languages', type: 'text', array: true, default: () => "'{}'" })
  languages: string[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
