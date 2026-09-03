import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

// ConsolidateListingsTables dropped listings.teams_v2, so this entity had been
// querying a table that no longer exists. The replacement is public.teams,
// which carries all 23 columns declared below. listings.teams is a different
// table entirely: it shares only the generic columns, has none of logo,
// specializations, rating or the counters, and is owned by supabase_admin.
// The schema is stated explicitly because the connection defaults to
// listings, which is what made the wrong table look plausible.
@Entity({ schema: 'public', name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  category: string;

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  industry: string[];

  @Column('text', { array: true, default: [] })
  mediaUrls: string[];

  @Column('text', { array: true, default: [] })
  memberIds: string[];

  @Column({ nullable: true })
  logo: string;

  @Column('text', { array: true, default: [] })
  specializations: string[];

  @Column({ type: 'int', default: 0 })
  completedProjects: number;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true })
  teamSize: number;

  // Fields the team row (Figma Component 1035) renders but the table never
  // held, so the card fell back to hiding them: the location line under the
  // headline, the "Average N years of experience" line, the footer rate range,
  // and the "Previous clients" logo strip.
  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'int', nullable: true })
  yearsExperience: number | null;

  @Column({ type: 'int', nullable: true })
  rateMin: number | null;

  @Column({ type: 'int', nullable: true })
  rateMax: number | null;

  @Column('text', { array: true, default: [] })
  previousClientLogos: string[];

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  completionsCount: number;

  @Column({ type: 'int', default: 0 })
  views90d: number;

  @Column({ type: 'decimal', default: 0 })
  adminBoost: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column()
  createdBy: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  payloadId: string | null;

  @Column({ type: 'varchar', nullable: true })
  editorialLabel: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
