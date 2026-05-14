import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectEventPublisher {
  private readonly logger = new Logger(ProjectEventPublisher.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  /**
   * Publishes a project.updated event to the cms_events_queue.
   * This is consumed by cms-service to keep Payload projects in sync.
   */
  async publishProjectUpdated(project: Project): Promise<void> {
    const payload = {
      event: 'project.updated',
      id: project.id,
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      description: project.description,
      status: project.status,
      category: project.category,
      categories: project.categories,
      subcategories: project.subcategories,
      budget: project.budget,
      estimatedHours: project.estimatedHours,
      duration: project.duration,
      mediaUrls: project.mediaUrls,
      videoUrl: project.videoUrl,
      skills: project.skills,
      tags: project.tags,
      programmingLanguages: project.programmingLanguages,
      developmentTech: project.developmentTech,
      deliverables: project.deliverables,
      faqs: project.faqs,
      scope: project.scope,
      industry: project.industry,
      featured: project.featured,
      // Pass a source tag to prevent infinite sync loops
      sourceId: 'listings-service',
      timestamp: new Date().toISOString(),
    };

    try {
      this.client.emit('project.updated', payload);
      this.logger.log(`Published project.updated for project ${project.id} (${project.slug})`);
    } catch (err) {
      this.logger.error(`Failed to publish project.updated for project ${project.id}:`, err);
    }
  }
}
