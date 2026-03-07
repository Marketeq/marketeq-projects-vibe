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

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  industry: string[];

  @Column('text', { array: true, default: [] })
  mediaUrls: string[];

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
