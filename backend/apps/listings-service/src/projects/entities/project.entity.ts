import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity('projects')
export class Project {
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

  @Column('text', { array: true, default: '{}' })
  categories: string[];

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  industry: string[];

  @Column('text', { array: true, default: '{}' })
  subcategories: string[];

  @Column('text', { array: true, default: '{}' })
  programmingLanguages: string[];

  @Column('text', { array: true, default: '{}' })
  developmentTech: string[];

  @Column('text', { array: true, default: '{}' })
  languages: string[];

  @Column('text', { array: true, default: '{}' })
  locations: string[];

  @Column('text', { array: true, default: [] })
  mediaUrls: string[];

  @Column({ nullable: true, type: 'text' })
  shortDescription: string;

  @Column({ nullable: true, type: 'text' })
  videoUrl: string;

  @Column('text', { array: true, default: '{}' })
  deliverables: string[];

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
  estimatedHours: number;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ nullable: true })
  duration: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
