import { Injectable, Logger } from '@nestjs/common';
import { ProjectRepository } from '../publish/infrastructure/persistence/project.repository';
import { ProjectSyncDto } from './dto/project-sync.dto';

@Injectable()
export class ProjectSyncService {
  private readonly logger = new Logger(ProjectSyncService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
  ) {}

  async syncFromStrapi(dto: ProjectSyncDto): Promise<void> {
    try {
      const id = String(dto.id);

      // Find existing project by strapiId
      const existingProject = await this.projectRepository.findOne({
        strapiId: id,
      });

      const payload = {
        strapiId: id,
        title: dto.title,
        subtitle: null,
        shortDescription: dto.summary || '',
        fullDescription: dto.description || '',
        categories: dto.categories?.map((cat) => cat.name) || [],
        subCategories: [],
        industries: [],
        tags: dto.tags?.map((tag) => tag.name) || [],
        skills: dto.required_skills ? Object.keys(dto.required_skills) : [],
        budget: null,
        initialTeamBudget: null,
        durationMonths: null,
        location: null,
        timezone: null,
        projectDatePublished: dto.publishedAt
          ? new Date(dto.publishedAt)
          : null,
        userId: 'strapi-sync',
        status: dto.status || 'pending_review',
      };

      let project;

      if (!existingProject) {
        project = await this.projectRepository.create(payload);
      } else {
        project = await this.projectRepository.update(existingProject.id!, {
          ...payload,
          userId: existingProject.userId,
        });
      }

      this.logger.log(`✅ Project synced: ${project?.id} (Strapi ID: ${dto.id})`);
    } catch (error) {
      this.logger.error(`Failed to sync project ${dto.id}: ${(error as Error).message}`);
      throw error;
    }
  }
}
