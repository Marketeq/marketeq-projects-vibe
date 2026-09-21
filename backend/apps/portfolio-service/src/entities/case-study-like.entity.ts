import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CaseStudy } from './case-study.entity';

/**
 * One row per (case study, user) like.
 *
 * `case_studies.likesCount` is the denormalized total the UI reads; this
 * table is what makes the total correct. Without it a like is just an
 * increment, so the same client could inflate a case study without limit
 * by clicking repeatedly, and the heart could never be restored to its
 * "already liked" state after a reload. The unique constraint below is the
 * real guard — the service also checks, but two concurrent requests can
 * both pass a check, and only the constraint can stop that.
 */
@Entity('case_study_likes')
@Unique('UQ_case_study_likes_case_study_user', ['caseStudyId', 'userId'])
export class CaseStudyLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  caseStudyId: string;

  @ManyToOne(() => CaseStudy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseStudyId' })
  caseStudy: CaseStudy;

  @Index()
  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
