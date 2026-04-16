import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Read-only adapter over the `public.projects` table.
 *
 * The frontend expects `/v1/projects` to return a list of project cards and
 * `/v1/projects/slug/:slug` to return a single project by slug. This controller
 * runs raw SQL against the projects table and shapes the response into what the
 * homepage assembler and UI consume.
 *
 * Additional enrichment endpoints:
 *   GET /v1/projects/:slug/similar
 *     Returns top-6 similar projects using spec §14.9 RelatedScore formula:
 *       RelatedScore = 0.5 × skill_overlap + 0.3 × tag_overlap + 0.2 × subcategory_overlap
 *     Pure SQL against public.projects — no embedding service needed.
 *
 *   GET /v1/projects/:slug/related-categories
 *     Proxies to category-service for the project's primary category and
 *     returns relatedCategories + relatedSkills from the suggestions engine.
 */
@Controller('v1/projects')
export class CmsProjectsController {
  private readonly logger = new Logger(CmsProjectsController.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async findAll() {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, "shortDescription", description, category,
              categories, subcategories, skills, tags, "programmingLanguages", "developmentTech",
              "mediaUrls", "videoUrl", deliverables, faqs, scope, industries, "relatedProjectIds",
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
              "mediaUrls", "videoUrl", deliverables, faqs, scope, industries, "relatedProjectIds",
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

    const shaped = shapeProject(rows[0]);

    // Enrich with similar projects (§14.9) + category suggestions.
    // Both are best-effort: errors return empty arrays so the primary
    // project response is never blocked by a secondary query failure.
    const [similarProjects, categorySuggestions] = await Promise.all([
      this.getSimilarProjects(rows[0]).catch((err) => {
        this.logger.warn(`similarProjects failed for ${slug}: ${err}`);
        return [];
      }),
      this.getCategorySuggestions(shaped.category).catch((err) => {
        this.logger.warn(`categorySuggestions failed for ${slug}: ${err}`);
        return { relatedCategories: [], relatedSkills: [] };
      }),
    ]);

    return {
      ...shaped,
      similarProjects,
      relatedCategories: categorySuggestions.relatedCategories,
      relatedSkills: categorySuggestions.relatedSkills,
    };
  }

  /**
   * GET /v1/projects/:slug/similar
   *
   * Standalone endpoint returning top-6 similar projects using spec §14.9
   * RelatedScore = 0.5 × skill_overlap + 0.3 × tag_overlap + 0.2 × subcategory_overlap
   */
  @Get('slug/:slug/similar')
  async findSimilar(@Param('slug') slug: string) {
    const rows = await this.dataSource.query(
      `SELECT skills, tags, subcategories, id FROM public.projects WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`Project not found: ${slug}`);
    return this.getSimilarProjects(rows[0]);
  }

  /**
   * GET /v1/projects/:slug/related-categories
   *
   * Proxies to category-service for the project's primary category and
   * returns the suggestions engine output (relatedCategories + relatedSkills).
   */
  @Get('slug/:slug/related-categories')
  async findRelatedCategories(@Param('slug') slug: string) {
    const rows = await this.dataSource.query(
      `SELECT category FROM public.projects WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`Project not found: ${slug}`);
    return this.getCategorySuggestions(rows[0].category);
  }

  // ── Private helpers ──────────────────────────────────────────────────

  /**
   * §14.9 RelatedScore = 0.5 × skill_overlap + 0.3 × tag_overlap + 0.2 × subcategory_overlap
   *
   * Uses Postgres array overlap operators for a single-query ranking.
   * Returns top 6 projects excluding the source project.
   */
  private async getSimilarProjects(
    source: { id: string; skills: string[]; tags: string[]; subcategories: string[] },
  ): Promise<Array<{ id: string; slug: string; title: string; thumbnail: string | null; score: number }>> {
    const skills = source.skills ?? [];
    const tags = source.tags ?? [];
    const subcategories = source.subcategories ?? [];

    if (skills.length === 0 && tags.length === 0 && subcategories.length === 0) {
      return [];
    }

    // cardinality(array_intersect) / cardinality(source_array) gives a
    // 0–1 overlap ratio per dimension. Weighted sum = RelatedScore.
    const rows = await this.dataSource.query(
      `WITH source AS (
         SELECT $1::text[] AS skills, $2::text[] AS tags, $3::text[] AS subcats
       )
       SELECT
         p.id, p.slug, p.title, p."mediaUrls"[1] AS thumbnail,
         (
           CASE WHEN cardinality(s.skills) > 0
                THEN 0.5 * cardinality(ARRAY(SELECT unnest(p.skills) INTERSECT SELECT unnest(s.skills)))::float / cardinality(s.skills)
                ELSE 0 END
         + CASE WHEN cardinality(s.tags) > 0
                THEN 0.3 * cardinality(ARRAY(SELECT unnest(p.tags) INTERSECT SELECT unnest(s.tags)))::float / cardinality(s.tags)
                ELSE 0 END
         + CASE WHEN cardinality(s.subcats) > 0
                THEN 0.2 * cardinality(ARRAY(SELECT unnest(p.subcategories) INTERSECT SELECT unnest(s.subcats)))::float / cardinality(s.subcats)
                ELSE 0 END
         ) AS score
       FROM public.projects p, source s
       WHERE p.id != $4
         AND p.status != 'draft'
         AND (p.skills && s.skills OR p.tags && s.tags OR p.subcategories && s.subcats)
       ORDER BY score DESC
       LIMIT 6`,
      [skills, tags, subcategories, source.id],
    );

    return rows.map((r: any) => ({
      id: String(r.id),
      slug: r.slug,
      title: r.title,
      thumbnail: r.thumbnail ?? null,
      score: Number(Number(r.score).toFixed(3)),
    }));
  }

  /**
   * Call category-service's category-page endpoint for the project's
   * primary category and extract relatedCategories + relatedSkills from
   * the suggestions engine response.
   *
   * Gracefully returns empty arrays if category-service is unreachable
   * or the category doesn't exist (the project page still renders, just
   * without the "related" rails).
   */
  private async getCategorySuggestions(
    primaryCategory: string,
  ): Promise<{ relatedCategories: any[]; relatedSkills: any[] }> {
    const empty = { relatedCategories: [], relatedSkills: [] };
    if (!primaryCategory) return empty;

    const categoryServiceUrl =
      process.env.CATEGORY_SERVICE_URL || 'http://localhost:3023';
    const slug = primaryCategory
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      const res = await fetch(`${categoryServiceUrl}/api/category-pages/${slug}`);
      if (!res.ok) return empty;
      const body = await res.json();
      return {
        relatedCategories: body?.suggestions?.relatedCategories ?? [],
        relatedSkills: body?.suggestions?.relatedSkills ?? [],
      };
    } catch {
      return empty;
    }
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
    // Industries — distinct from categories, shown as badges per §13 L52.
    industries: row.industries ?? [],
    // Editor-curated related projects — CMS payloadIds stored as strings.
    relatedProjectIds: row.relatedProjectIds ?? [],
    // §13 L59 + §01: "20+ reviews, 4.0+ avg rating". Derived at read
    // time from the scoring columns (no separate stored flag needed).
    isTopRated:
      row.rating != null &&
      Number(row.rating) >= 4.0 &&
      (row.reviewCount ?? 0) >= 20,
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
