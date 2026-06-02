import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectStaticContent } from './entities/project-static-content.entity';

@Injectable()
export class ProjectStaticContentService {
  private readonly logger = new Logger(ProjectStaticContentService.name);

  constructor(
    @InjectRepository(ProjectStaticContent)
    private readonly repo: Repository<ProjectStaticContent>,
  ) {}

  async findBySlug(slug: string): Promise<ProjectStaticContent | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async upsert(data: Partial<ProjectStaticContent> & { slug: string }): Promise<void> {
    const existing = await this.repo.findOne({ where: { slug: data.slug } });
    if (existing) {
      await this.repo.update(existing.id, data);
      this.logger.log(`Updated project static content: ${data.slug}`);
    } else {
      const created = this.repo.create(data);
      await this.repo.save(created);
      this.logger.log(`Created project static content: ${data.slug}`);
    }
  }
}
