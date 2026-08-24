import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Project } from './entities/project.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Controller('internal/projects')
export class ProjectsSeedController {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post('seed')
  async seed(
    @Headers('x-internal-token') token: string | undefined,
    @Body() dto: any,
  ) {
    this.validateToken(token);

    const scope = Array.isArray(dto.scope)
      ? dto.scope.map((phase: any, i: number) => ({
          phaseName: phase.phaseName || `Phase ${i + 1}`,
          order: phase.order ?? i,
          tasks: Array.isArray(phase.tasks)
            ? phase.tasks.map((t: any) => ({
                title: t.taskName || t.title || 'Untitled Task',
                roleName: t.role || t.roleName || 'Developer',
                experienceLevel: t.experience || t.experienceLevel || 'Medior',
                estimatedHours: t.estimatedHours || 40,
              }))
            : [],
        }))
      : [];

    const totalHours = scope.reduce(
      (sum: number, p: any) =>
        sum + p.tasks.reduce((ts: number, t: any) => ts + (t.estimatedHours || 0), 0),
      0,
    );

    const slug = slugify(dto.title) + '-' + Date.now().toString(36);

    const item = this.repo.create({
      payloadId: randomUUID(),
      title: dto.title,
      description: dto.description,
      shortDescription: dto.shortDescription || '',
      slug,
      category: Array.isArray(dto.categories) ? dto.categories[0] || null : null,
      categories: dto.categories || [],
      skills: dto.skills || [],
      tags: dto.tags || [],
      industry: dto.industry || [],
      mediaUrls: dto.mediaUrls || [],
      scope,
      faqs: dto.faqs || [],
      estimatedHours: totalHours || null,
      status: ListingStatus.Published,
      createdBy: 'seed:n8n-automation',
    });

    const saved = await this.repo.save(item);
    return saved;
  }
}
