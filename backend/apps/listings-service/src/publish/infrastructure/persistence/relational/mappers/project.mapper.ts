import { Project } from '../../../../interface/project';
import { ProjectEntity } from '../entities/project.entity';

export class ProjectMapper {
  static toDomain(raw: ProjectEntity): Project {
    const project = new Project();
    project.id = raw.id;
    project.cmsId = raw.cmsId;
    project.slug = raw.slug;
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
    project.listingType = raw.listingType;
    project.projectType = raw.projectType ?? null;
    project.categories = raw.categories;
    project.subCategories = raw.subCategories;
    project.categorySelections = raw.categorySelections;
    project.status = raw.status;
    project.projectDatePublished = raw.projectDatePublished;
    project.userId = raw.userId;
    project.createdAt = raw.createdAt;
    project.updatedAt = raw.updatedAt;
    project.deletedAt = raw.deletedAt;
    project.deliverables = raw.deliverables ?? null;
    project.mediaUrls = raw.mediaUrls ?? [];
    project.teamMemberIds = raw.teamMemberIds ?? [];
    project.pendingInviteEmails = raw.pendingInviteEmails ?? [];
    project.videoUrl = raw.videoUrl ?? null;
    project.faqs = raw.faqs ?? [];
    project.scope = raw.scope ?? null;
    if (raw.media) {
      project.media = raw.media;
    }

    return project;
  }

  static toPersistence(project: Project): ProjectEntity {
    const projectEntity = new ProjectEntity();

    if (project.id && typeof project.id === 'string') {
      projectEntity.id = project.id;
    }

    projectEntity.cmsId = project.cmsId ?? undefined;
    projectEntity.slug = project.slug ?? undefined;
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
    projectEntity.listingType = project.listingType!;
    projectEntity.projectType = project.projectType ?? undefined;
    projectEntity.categories = project.categories!;
    projectEntity.subCategories = project.subCategories!;
    projectEntity.categorySelections = project.categorySelections ?? [];
    projectEntity.deliverables = project.deliverables ?? null;
    projectEntity.mediaUrls = project.mediaUrls ?? [];
    projectEntity.teamMemberIds = project.teamMemberIds ?? [];
    projectEntity.pendingInviteEmails = project.pendingInviteEmails ?? [];
    projectEntity.videoUrl = project.videoUrl ?? undefined;
    projectEntity.faqs = project.faqs ?? [];
    if (project.publishedSnapshot !== undefined) {
      projectEntity.publishedSnapshot = project.publishedSnapshot;
    }
    projectEntity.status = project.status ?? undefined;
    projectEntity.projectDatePublished = project.projectDatePublished ?? undefined;
    projectEntity.userId = project.userId;
    projectEntity.createdAt = project.createdAt!;
    projectEntity.updatedAt = project.updatedAt!;
    projectEntity.deletedAt = project.deletedAt ?? null;
    return projectEntity;
  }
}
