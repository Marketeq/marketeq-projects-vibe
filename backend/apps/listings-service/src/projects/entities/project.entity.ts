import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity({ name: 'project', schema: 'listings' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'project' })
  listingType: string;

  @Column({ unique: true, nullable: true })
  payloadId: string;

  @Column({ nullable: true })
  strapiId: string;

  @Column({ type: 'text', nullable: true, unique: true })
  slug?: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle?: string;

  @Column({ nullable: true, type: 'text' })
  shortDescription?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, type: 'text' })
  videoUrl?: string;

  @Column({ nullable: true, type: 'text' })
  projectType?: string;

  @Column({ nullable: true })
  editorialLabel?: string;

  @Column({ nullable: true })
  category?: string;

  @Column('text', { array: true, default: [] })
  categories: string[];

  @Column('text', { array: true, default: [] })
  subcategories: string[];

  @Column('text', { name: 'industries', array: true, default: [] })
  industry: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  programmingLanguages: string[];

  @Column('text', { array: true, default: [] })
  developmentTech: string[];

  @Column('text', { array: true, default: [] })
  languages: string[];

  @Column('text', { array: true, default: [] })
  locations: string[];

  @Column({ type: 'uuid', array: true, default: [] })
  teamMemberIds: string[];

  @Column('text', { array: true, default: [] })
  mediaUrls: string[];

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  budget?: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  initialTeamBudget?: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  priceMin?: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  priceMax?: number;

  @Column({ nullable: true })
  deliveryTime?: string;

  // Generated column (see AddProjectTeamSizeDerived migration): distinct
  // `roleName` count across scope[].tasks[]. Read-only — Postgres rejects any
  // write to it, so insert/update must stay false.
  @Column({ nullable: true, type: 'int', insert: false, update: false })
  teamSize?: number;

  @Column({ nullable: true, type: 'int' })
  durationMonths?: number;

  // PMCM-258: the seller's chosen display period for the Budget Calculator's
  // cost-per-period figure. Same column the publish module's draft-save
  // entity (publish/.../entities/project.entity.ts) writes — both classes
  // map to this schema's single `project` table.
  @Column({ nullable: true, type: 'varchar', length: 20 })
  pricingPeriod?: string | null;

  @Column({ nullable: true, type: 'int' })
  estimatedHours?: number;

  @Column({ nullable: true })
  duration?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  location?: string;

  @Column('jsonb', { default: [] })
  deliverables: Array<{ phaseLabel: string; phaseName: string; items: string[]; image?: string }>;

  @Column('jsonb', { default: [] })
  scope: {
    phaseName: string;
    order: number;
    tasks: {
      title: string;
      roleName: string;
      location?: string[];
      experienceLevel: string;
      estimatedHours: number;
    }[];
  }[];

  @Column('jsonb', { default: [] })
  faqs: { question: string; answer: string }[];

  @Column('jsonb', { default: [] })
  recentQuestions: Array<{
    id?: string;
    question: string;
    answer: string | null;
    askedByName?: string | null;
    askedByUsername?: string | null;
    askedAt?: string | null;
    answeredByUserId?: string | null;
    answeredByName?: string | null;
    answeredByRole?: string | null;
    assignedToUserId?: string | null;
    hidden?: boolean;
    moderationFailed?: boolean;
  }>;

  @Column('jsonb', { default: [] })
  categorySelections: any[];

  @Column('text', { array: true, default: [] })
  relatedProjectIds: string[];

  @Column({ type: 'boolean', default: false })
  chatEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  reportButtonEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  shareButtonEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  helpButtonEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

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

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true, type: 'timestamptz' })
  projectDatePublished?: Date;

  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
