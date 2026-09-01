import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CaseStudy } from './case-study.entity';

export const CASE_STUDY_BLOCK_TYPES = [
  'hero',
  'results',
  'gallery',
  'testimonial',
  'before-after',
  'text-paragraph',
  // Types the frontend editor (components/case-study/section-renderer.tsx,
  // via lib/case-study-mapper.ts's CaseStudyBlockType) actually sends today.
  'introduction',
  'bold-statement',
  'challenges',
  'image-text',
  'conclusion',
  'interview',
  'big-image',
  'process',
  'personas',
  'video',
  'customer-journey',
  'results-metrics',
  'prototype',
  'custom-columns',
] as const;

export type CaseStudyBlockType = (typeof CASE_STUDY_BLOCK_TYPES)[number];

@Entity('case_study_blocks')
export class CaseStudyBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  caseStudyId: string;

  @ManyToOne(() => CaseStudy, (caseStudy) => caseStudy.blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseStudyId' })
  caseStudy: CaseStudy;

  @Column('varchar', { length: 50 })
  blockType: CaseStudyBlockType;

  @Column('int')
  position: number;

  @Column('jsonb')
  contentJson: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
