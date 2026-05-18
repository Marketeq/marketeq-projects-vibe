import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ListingStatus } from '../../shared/enums/listing.enum';

@Entity('teams_v2')
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
