import { Injectable } from '@nestjs/common';
import { ProjectRepository } from '../publish/infrastructure/persistence/project.repository';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async findAll() {
    const projects = await this.projectRepository.findAll({});
    return projects.filter((project) => project.status === 'published');
  }

  async create(data: { title: string; userId: string; status?: string }) {
    return this.projectRepository.create({
      title: data.title,
      subtitle: null,
      strapiId: null,
      shortDescription: null,
      fullDescription: null,
      budget: null,
      initialTeamBudget: null,
      durationMonths: null,
      location: null,
      timezone: null,
      categories: [],
      subCategories: [],
      industries: [],
      tags: [],
      skills: [],
      userId: data.userId,
      status: data.status ?? 'pending_review',
      projectDatePublished: null,
    });
  }
}
