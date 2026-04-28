import { Project } from '../../../../interface/project';
import { ProjectEntity } from '../entities/project.entity';

export class ProjectMapper {
  static toDomain(raw: ProjectEntity): Project {
    const project = new Project();
    project.id = raw.id;
    project.cmsId = raw.cmsId;
    project.title = raw.title;
    project.subtitle = raw.subtitle;
    project.shortDescription = raw.shortDescription;
    project.fullDescription = raw.fullDescription;
    project.budget = raw.budget;
    project.initialTeamBudget = raw.initialTeamBudget;
    project.durationMonths = raw.durationMonths;
    project.location = raw.location;
    project.timezone = raw.timezone;
    project.industries = raw.industries;
    project.tags = raw.tags;
    project.skills = raw.skills;
    project.categories = raw.categories;
    project.subCategories = raw.subCategories;
    project.categorySelections = raw.categorySelections;
    project.status = raw.status;
    project.projectDatePublished = raw.projectDatePublished;
    project.userId = raw.userId;
    project.createdAt = raw.createdAt;
    project.updatedAt = raw.updatedAt;
    project.deletedAt = raw.deletedAt;

    return project;
  }

  static toPersistence(project: Project): ProjectEntity {
    const projectEntity = new ProjectEntity();

    if (project.id && typeof project.id === 'string') {
      projectEntity.id = project.id;
    }

    projectEntity.cmsId = project.cmsId ?? undefined;
    projectEntity.title = project.title;
    projectEntity.subtitle = project.subtitle!;
    projectEntity.shortDescription = project.shortDescription!;
    projectEntity.fullDescription = project.fullDescription!;
    projectEntity.budget = project.budget!;
    projectEntity.initialTeamBudget = project.initialTeamBudget!;
    projectEntity.durationMonths = project.durationMonths!;
    projectEntity.location = project.location!;
    projectEntity.timezone = project.timezone!;
    projectEntity.industries = project.industries!;
    projectEntity.tags = project.tags!;
    projectEntity.skills = project.skills!;
    projectEntity.categories = project.categories!;
    projectEntity.subCategories = project.subCategories!;
    projectEntity.categorySelections = project.categorySelections ?? [];
    projectEntity.status = project.status ?? undefined;
    projectEntity.projectDatePublished = project.projectDatePublished ?? undefined;
    projectEntity.userId = project.userId;
    projectEntity.createdAt = project.createdAt!;
    projectEntity.updatedAt = project.updatedAt!;
    projectEntity.deletedAt = project.deletedAt ?? null;
    return projectEntity;
  }
}
