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
  @Column({ type: String, length: 120 })
  title: string;

  @Column({ type: String, nullable: true })
  shortDescription: string;

  @Column({ type: String, nullable: true })
  fullDescription: string;

  @Column({ type: String, array: true, default: [] })
  categories: string[];

  @Column({ type: String, array: true, default: [] })
  subCategories: string[];

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

  @OneToMany(() => MediaEntity, (media) => media.project, { cascade: true })
  media: MediaEntity[];

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
