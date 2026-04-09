import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Read-only adapter over the `public.projects` table.
 *
 * The frontend expects `/v1/projects` to return a list of project cards and
 * `/v1/projects/slug/:slug` to return a single project by slug. This controller
 * runs raw SQL against the projects table and shapes the response into what the
 * homepage assembler and UI consume.
 */
@Controller('v1/projects')
export class CmsProjectsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async findAll() {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, "shortDescription", description, category,
              categories, skills, tags, "mediaUrls", budget, duration,
              status, "createdAt", "updatedAt"
         FROM public.projects
        WHERE status != 'draft'
        ORDER BY "createdAt" DESC
        LIMIT 50`,
    );
    return rows.map(shapeProject);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, "shortDescription", description, category,
              categories, skills, tags, "mediaUrls", budget, duration,
              status, "createdAt", "updatedAt"
         FROM public.projects
        WHERE slug = $1
        LIMIT 1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`Project not found: ${slug}`);
    return shapeProject(rows[0]);
  }
}

function shapeProject(row: any) {
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    category: row.category ?? 'Software Development',
    categories: row.categories ?? [],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    budget: row.budget != null ? Number(row.budget) : null,
    duration: row.duration,
    mediaUrls: row.mediaUrls ?? [],
    skills: row.skills ?? [],
    tags: row.tags ?? [],
  };
}
