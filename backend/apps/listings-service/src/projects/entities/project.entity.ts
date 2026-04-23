import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity('projects', { schema: 'listings' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payloadId', nullable: true })
  payloadId: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'slug', nullable: true })
  slug: string;

  @Column({ name: 'category', nullable: true })
  category: string;

  @Column('text', { name: 'categories', array: true, default: [] })
  categories: string[];

  @Column('text', { name: 'skills', array: true, default: [] })
  skills: string[];

  @Column('text', { name: 'tags', array: true, default: [] })
  tags: string[];

  @Column('text', { name: 'industries', array: true, default: [] })
  industries: string[];

  @Column('text', { name: 'subcategories', array: true, default: [] })
  subcategories: string[];

  @Column('text', { name: 'programmingLanguages', array: true, default: [] })
  programmingLanguages: string[];

  @Column('text', { name: 'developmentTech', array: true, default: [] })
  developmentTech: string[];



  @Column('text', { name: 'mediaUrls', array: true, default: [] })
  mediaUrls: string[];

  @Column({ name: 'shortDescription', nullable: true, type: 'text' })
  shortDescription: string;

  @Column({ name: 'videoUrl', nullable: true, type: 'text' })
  videoUrl: string;

  @Column('jsonb', { nullable: true, default: () => "'[]'" })
  deliverables: Array<{ phaseLabel: string; phaseName: string; items: string[] }>;

  @Column('jsonb', { nullable: true, default: '[]' })
  faqs: { question: string; answer: string }[];

  @Column({ name: 'scope', type: 'jsonb', nullable: true, default: '[]' })
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

  @Column({ name: 'estimatedHours', nullable: true, type: 'int' })
  estimatedHours: number;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ nullable: true })
  duration: string;

  @Column({ name: 'pricingModel', nullable: true })
  pricingModel: string;

  @Column({ name: 'priceViewMode', nullable: true })
  priceViewMode: string;

  @Column({ name: 'priceMax', nullable: true, type: 'decimal', precision: 10, scale: 2 })
  priceMax: number;

  @Column({ name: 'projectType', nullable: true })
  projectType: string;

  @Column({ name: 'klarnaEnabled', default: false })
  klarnaEnabled: boolean;

  @Column({ name: 'recentQuestions', type: 'jsonb', nullable: true })
  recentQuestions: string;

  @Column({ name: 'skillsAndTools', type: 'jsonb', nullable: true })
  skillsAndTools: string;

  @Column({ name: 'reportButtonEnabled', default: true })
  reportButtonEnabled: boolean;

  @Column({ name: 'shareButtonEnabled', default: true })
  shareButtonEnabled: boolean;


  @Column({ name: 'relatedProjectIds', type: 'text', array: true, default: [] })
  relatedProjectIds: string[];

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'reviewCount', type: 'int', default: 0 })
  reviewCount: number;

  @Column({ name: 'completionsCount', type: 'int', default: 0 })
  completionsCount: number;

  @Column({ name: 'views90d', type: 'int', default: 0 })
  views90d: number;

  @Column({ name: 'adminBoost', type: 'decimal', default: 0 })
  adminBoost: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ name: 'createdBy' })
  createdBy: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
