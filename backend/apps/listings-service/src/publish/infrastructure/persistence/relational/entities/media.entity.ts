import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  UpdateDateColumn,
  ManyToOne,
  Generated,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { Media } from '../../../../interface/media';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'media' })
export class MediaEntity extends EntityRelationalHelper implements Media {
  @Index()
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: String, nullable: false })
  featuredImage: string; // maps to frontend: "featured_image"

  @Column({ type: String, array: true, nullable: true })
  additionalImages?: string[];

  @Column({ type: String, nullable: true })
  videoUrl?: string; // maps to frontend: "video_url"

  @ManyToOne(() => ProjectEntity, (project) => project.media, {
    onDelete: 'CASCADE',
  })
  project: ProjectEntity;

  @Column('uuid')
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
