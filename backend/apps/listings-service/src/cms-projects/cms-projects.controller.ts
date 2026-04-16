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
              categories, subcategories, skills, tags, "programmingLanguages", "developmentTech",
              "mediaUrls", "videoUrl", deliverables, faqs, scope,
              budget, "priceMax", "pricingModel", "priceViewMode", "projectType", "klarnaEnabled",
              "estimatedHours", duration,
              "recentQuestions", "skillsAndTools",
              "chatEnabled", "reportButtonEnabled", "shareButtonEnabled", "helpButtonEnabled",
              rating, "reviewCount", "completionsCount", "views90d", "adminBoost", featured,
              status, "createdAt", "updatedAt"
         FROM public.projects
        WHERE status != 'draft'
        ORDER BY featured DESC NULLS LAST, "createdAt" DESC
        LIMIT 50`,
    );
    return rows.map(shapeProject);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, "shortDescription", description, category,
              categories, subcategories, skills, tags, "programmingLanguages", "developmentTech",
              "mediaUrls", "videoUrl", deliverables, faqs, scope,
              budget, "priceMax", "pricingModel", "priceViewMode", "projectType", "klarnaEnabled",
              "estimatedHours", duration,
              "recentQuestions", "skillsAndTools",
              "chatEnabled", "reportButtonEnabled", "shareButtonEnabled", "helpButtonEnabled",
              rating, "reviewCount", "completionsCount", "views90d", "adminBoost", featured,
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
    subcategories: row.subcategories ?? [],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    budget: row.budget != null ? Number(row.budget) : null,
    priceMin: row.budget != null ? Number(row.budget) : null,
    priceMax: row.priceMax != null ? Number(row.priceMax) : null,
    pricingModel: row.pricingModel ?? null,
    priceViewMode: row.priceViewMode ?? null,
    projectType: row.projectType ?? null,
    klarnaEnabled: row.klarnaEnabled ?? false,
    estimatedHours: row.estimatedHours ?? null,
    duration: row.duration,
    mediaUrls: row.mediaUrls ?? [],
    videoUrl: row.videoUrl ?? null,
    skills: row.skills ?? [],
    tags: row.tags ?? [],
    programmingLanguages: row.programmingLanguages ?? [],
    developmentTech: row.developmentTech ?? [],
    deliverables: row.deliverables ?? [],
    faqs: row.faqs ?? [],
    // Scope tree: ordered phases each containing tasks with role +
    // experience + estimated hours. Shape matches docs §08 PhaseDto /
    // TaskDto. Pricing, duration, deliverables AI and skill derivation
    // all read from this downstream.
    scope: row.scope ?? [],
    recentQuestions: row.recentQuestions ?? [],
    skillsAndTools: row.skillsAndTools ?? [],
    chatEnabled: row.chatEnabled ?? false,
    reportButtonEnabled: row.reportButtonEnabled ?? true,
    shareButtonEnabled: row.shareButtonEnabled ?? true,
    helpButtonEnabled: row.helpButtonEnabled ?? false,
    rating: row.rating != null ? Number(row.rating) : 0,
    reviewCount: row.reviewCount ?? 0,
    completionsCount: row.completionsCount ?? 0,
    views90d: row.views90d ?? 0,
    adminBoost: row.adminBoost != null ? Number(row.adminBoost) : 0,
    featured: row.featured ?? false,
  };
}
