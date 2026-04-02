import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity('services')
export class Service {
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

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Draft })
  status: ListingStatus;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  priceMin: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  priceMax: number;

  @Column({ nullable: true })
  deliveryTime: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
