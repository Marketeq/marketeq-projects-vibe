import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CaseStudyBlock } from './case-study-block.entity';

export type CaseStudyStatus = 'draft' | 'published' | 'hidden' | 'archived';

@Entity('case_studies')
export class CaseStudy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  ownerUserId: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Index({ unique: true })
  @Column('varchar', { length: 100 })
  slug: string;

  @Index()
  @Column('varchar', { length: 20, default: 'draft' })
  status: CaseStudyStatus;

  @Column('jsonb', { nullable: true })
  schemaJson: Record<string, any> | null;

  @Column('text', { nullable: true })
  htmlPreview: string | null;

  @Column('text', { nullable: true })
  htmlPublished: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('text', { nullable: true })
  coverImage: string | null;

  @Column('float', { default: 1 })
  coverImageZoom: number;

  @Column('int', { default: 0 })
  coverImageRotation: number;

  @Column('float', { default: 50 })
  coverImageOffsetX: number;

  @Column('float', { default: 50 })
  coverImageOffsetY: number;

  @Column('jsonb', { default: () => "'[]'" })
  skills: string[];

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CaseStudyBlock, (block) => block.caseStudy, { cascade: true })
  blocks: CaseStudyBlock[];
}
