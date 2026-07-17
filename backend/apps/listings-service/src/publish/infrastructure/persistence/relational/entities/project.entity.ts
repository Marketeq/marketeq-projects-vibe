import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  UpdateDateColumn,
  Generated,
  PrimaryColumn,
  OneToMany,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { Project } from '../../../../interface/project';
import { MediaEntity } from './media.entity';

@Entity({ name: 'project' })
export class ProjectEntity extends EntityRelationalHelper implements Project {
  @Index()
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Index()
  @Column({ name: 'strapiId', type: String, nullable: true, unique: true })
  cmsId?: string;

  @Index()
  @Column({ type: String, nullable: true })
  slug?: string;

  @Index()
  @Column({ type: String, length: 120 })
  title: string;

  @Column({ type: String, nullable: true })
  shortDescription: string;

  @Column({ name: 'description', type: String, nullable: true })
  fullDescription: string;

  @Column({ type: String, array: true, default: [] })
  categories: string[];

  @Column({ name: 'subcategories', type: String, array: true, default: [] })
  subCategories: string[];

  @Column({ name: 'categorySelections', type: 'jsonb', default: [] })
  categorySelections: {
    category: string;
    subCategories: string[];
  }[];

  @Column({ type: String, array: true, default: [] })
  industries: string[];

  @Column({ type: String, array: true, default: [] })
  tags: string[];

  @Column({ type: String, array: true, default: [] })
  skills: string[];

  @Column({ type: String, nullable: true })
  subtitle: string;

  @Column({ type: String, nullable: true })
  listingType: string;

  @Column({ name: 'projectType', type: String, nullable: true })
  projectType?: string | null;

  @Column({ type: 'numeric', nullable: true })
  budget: number;

  @Column({ type: 'numeric', nullable: true })
  initialTeamBudget: number;

  @Column({ type: Number, nullable: true })
  durationMonths: number;

  @Column({ type: String, nullable: true })
  location: string;

  @Column({ type: String, nullable: true })
  timezone: string;

  @Column({ type: String, nullable: true, default: 'pending_review' })
  status?: string;

  @Column({ type: 'timestamptz', nullable: true })
  projectDatePublished?: Date;

  @Column({ type: 'jsonb', nullable: true, default: null })
  deliverables: any[] | null;

  @OneToMany(() => MediaEntity, (media) => media.project, { cascade: true })
  media: MediaEntity[];

  @Column({ name: 'mediaUrls', type: 'text', array: true, default: [] })
  mediaUrls: string[];

  @Column({ name: 'teamMemberIds', type: 'uuid', array: true, default: [] })
  teamMemberIds: string[];

  @Column({ name: 'videoUrl', type: String, nullable: true })
  videoUrl?: string | null;

  @Column({ type: 'jsonb', default: [] })
  faqs: { question: string; answer: string; is_ai_generated?: boolean }[];

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
