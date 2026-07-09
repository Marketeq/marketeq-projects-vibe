import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'project_tags' })
export class ProjectTagEntity {
  @PrimaryColumn()
  projectId: string;

  @PrimaryColumn({ length: 100 })
  tag: string;

  @ManyToOne(() => ProjectEntity, (project) => project.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;
}
