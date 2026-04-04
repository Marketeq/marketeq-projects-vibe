import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'project_categories' })
export class ProjectCategoryEntity {
  @PrimaryColumn()
  projectId: string;

  @PrimaryColumn()
  categoryId: number;

  @ManyToOne(() => ProjectEntity, (project) => project.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;
}
