import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity('projects_v2')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stable key for CMS ↔ listings sync (Payload document id as string)
  @Column({ unique: true })
  payloadId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'text', nullable: true })
  slug?: string;

  @Column({ nullable: true })
  category: string;

  @Column('text', { array: true, default: [] })
  categories: string[];

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { name: 'industries', array: true, default: [] })
  industry: string[];

  @Column('text', { array: true, default: [] })
  subcategories: string[];

  @Column('text', { array: true, default: [] })
  programmingLanguages: string[];

  @Column('text', { array: true, default: [] })
  developmentTech: string[];

  @Column('text', { array: true, default: [] })
  languages: string[];

  @Column('text', { array: true, default: [] })
  locations: string[];

  @Column('text', { array: true, default: [] })
  mediaUrls: string[];

  @Column({ nullable: true, type: 'text' })
  shortDescription?: string;

  @Column({ nullable: true, type: 'text' })
  videoUrl?: string;

  @Column('jsonb', { nullable: true, default: () => "'[]'" })
  deliverables: Array<{ phaseLabel: string; phaseName: string; items: string[] }>;

  @Column('jsonb', { nullable: true, default: '[]' })
  faqs: { question: string; answer: string }[];

  @Column('jsonb', { nullable: true, default: '[]' })
  scope: {
    phaseName: string;
    order: number;
    tasks: {
      title: string;
      roleName: string;
      experienceLevel: string;
      estimatedHours: number;
    }[];
  }[];

  @Column({ nullable: true, type: 'int' })
  estimatedHours?: number;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  budget?: number;

  @Column({ nullable: true })
  duration?: string;

  @Column('jsonb', { name: 'recentQuestions', nullable: true, default: '[]' })
  recentQuestions: Array<{ question: string; answer: string | null }>;

  @Column('text', { name: 'relatedProjectIds', array: true, default: [] })
  relatedProjectIds: string[];

  @Column({ name: 'chatEnabled', type: 'boolean', default: false })
  chatEnabled: boolean;

  @Column({ name: 'reportButtonEnabled', type: 'boolean', default: true })
  reportButtonEnabled: boolean;

  @Column({ name: 'shareButtonEnabled', type: 'boolean', default: true })
  shareButtonEnabled: boolean;

  @Column({ name: 'helpButtonEnabled', type: 'boolean', default: false })
  helpButtonEnabled: boolean;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
