import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Read-only adapter over the Strapi-owned `public.projects` table.
 *
 * The frontend expects `/v1/projects` to return a list of project cards and
 * `/v1/projects/slug/:slug` to return a single project by slug. The existing
 * TypeORM entities in this service don't match the Strapi schema (integer ids,
 * different columns) so we run raw SQL against the CMS table and shape the
 * response into what the UI consumes.
 */
@Controller('v1/projects')
export class StrapiProjectsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async findAll() {
    const rows = await this.dataSource.query(
      `SELECT id, document_id, title, slug, summary, description, role,
              project_status, featured, published_at, created_at, updated_at
         FROM public.projects
        WHERE published_at IS NOT NULL
        ORDER BY featured DESC NULLS LAST, published_at DESC
        LIMIT 50`,
    );
    return rows.map(shapeProject);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const rows = await this.dataSource.query(
      `SELECT id, document_id, title, slug, summary, description, role,
              project_status, featured, published_at, created_at, updated_at
         FROM public.projects
        WHERE slug = $1
        ORDER BY published_at DESC NULLS LAST
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
    documentId: row.document_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    role: row.role,
    category: row.role ?? 'Software Development',
    categories: row.role ? [row.role] : [],
    status: row.project_status,
    featured: row.featured,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Placeholder fields the UI reads — fill in when CMS exposes them.
    budget: null,
    duration: null,
    mediaUrls: [],
    skills: [],
    tags: [],
  };
}
