import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

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
@Controller("v1/projects")
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
        WHERE status = 'published'
        ORDER BY featured DESC NULLS LAST, "createdAt" DESC
        LIMIT 50`,
    );
    return rows.map(shapeProject);
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, "shortDescription", description, category,
              categories, subcategories, skills, tags, "programmingLanguages", "developmentTech",
              "mediaUrls", "videoUrl", deliverables, faqs, scope, industries, "relatedProjectIds",
              budget, "priceMax", "pricingModel", "priceViewMode", "projectType", "klarnaEnabled",
              "estimatedHours", duration,
              "recentQuestions", "skillsAndTools",
              "chatEnabled", "reportButtonEnabled", "shareButtonEnabled", "helpButtonEnabled",
              rating, "reviewCount", "completionsCount", "views90d", "adminBoost", featured,
              status, "createdBy", "createdAt", "updatedAt"
         FROM public.projects
        WHERE slug = $1
          AND status = 'published'
        LIMIT 1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`Project not found: ${slug}`);

    const shaped = shapeProject(rows[0]);

    // Enrich with similar projects (§14.9) + category suggestions +
    // team profiles (Step 2 of the hybrid team model) + owner history
    // ratings (§14.14). All best-effort: errors return sensible defaults
    // so the primary project response is never blocked by a secondary
    // query/service failure.
    const [similarProjects, categorySuggestions, team, projectHistoryRatings] =
      await Promise.all([
      this.getSimilarProjects(rows[0]).catch((err) => {
        this.logger.warn(`similarProjects failed for ${slug}: ${err}`);
        return [];
      }),
      this.getCategorySuggestions(shaped.category).catch((err) => {
        this.logger.warn(`categorySuggestions failed for ${slug}: ${err}`);
        return { relatedCategories: [], relatedSkills: [] };
      }),
      this.hydrateTeam(rows[0]).catch((err) => {
        this.logger.warn(`hydrateTeam failed for ${slug}: ${err}`);
        return [];
      }),
      this.getProjectHistoryRatings(rows[0].createdBy, rows[0].id).catch(
        (err) => {
          this.logger.warn(`projectHistoryRatings failed for ${slug}: ${err}`);
          return null;
        },
      ),
    ]);

    return {
      ...shaped,
      similarProjects,
      relatedCategories: categorySuggestions.relatedCategories,
      relatedSkills: categorySuggestions.relatedSkills,
      team,
      projectHistoryRatings,
    };
  }

  /**
   * GET /v1/projects/:slug/similar
   *
   * Standalone endpoint returning top-6 similar projects using spec §14.9
   * RelatedScore = 0.5 × skill_overlap + 0.3 × tag_overlap + 0.2 × subcategory_overlap
   */
  @Get("slug/:slug/similar")
  async findSimilar(@Param("slug") slug: string) {
    const rows = await this.dataSource.query(
      `SELECT skills, tags, subcategories, id
         FROM public.projects
        WHERE slug = $1
          AND status = 'published'
        LIMIT 1`,
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
  @Get("slug/:slug/related-categories")
  async findRelatedCategories(@Param("slug") slug: string) {
    const rows = await this.dataSource.query(
      `SELECT category
         FROM public.projects
        WHERE slug = $1
          AND status = 'published'
        LIMIT 1`,
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
  private async getSimilarProjects(source: {
    id: string;
    skills: string[];
    tags: string[];
    subcategories: string[];
  }): Promise<
    Array<{
      id: string;
      slug: string;
      title: string;
      thumbnail: string | null;
      score: number;
    }>
  > {
    const skills = source.skills ?? [];
    const tags = source.tags ?? [];
    const subcategories = source.subcategories ?? [];

    if (
      skills.length === 0 &&
      tags.length === 0 &&
      subcategories.length === 0
    ) {
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
         AND p.status = 'published'
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
   * §14.14 `projectHistoryRatings` — "average rating of the owner's
   * past project reviews" (data-dictionary row 19). Weighted by
   * `reviewCount` so a 5.0 with one review doesn't outrank a 4.6 with
   * fifty.
   *
   * Scope: published projects owned by the same `createdBy`, excluding
   * the current project itself. Returns `null` (not zero) when the
   * owner has no rated history, so the UI can distinguish "no data"
   * from "genuinely 0 stars".
   *
   * Skips the placeholder owner id `cms-sync`, which would otherwise
   * lump every pre-ownerId-migration project under a single synthetic
   * "owner" and produce a meaningless average.
   */
  private async getProjectHistoryRatings(
    createdBy: string | null | undefined,
    currentId: string,
  ): Promise<{
    average: number;
    reviewCount: number;
    projectCount: number;
  } | null> {
    if (!createdBy || createdBy === "cms-sync") return null;

    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "projectCount",
         COALESCE(SUM("reviewCount"), 0)::int AS "reviewCount",
         CASE WHEN COALESCE(SUM("reviewCount"), 0) > 0
              THEN (SUM(rating * "reviewCount") / SUM("reviewCount"))::float
              ELSE NULL
         END AS average
       FROM public.projects
       WHERE "createdBy" = $1
         AND id != $2
         AND status = 'published'
         AND "reviewCount" > 0`,
      [createdBy, currentId],
    );

    const row = rows[0];
    if (!row || row.average == null) return null;
    return {
      average: Number(Number(row.average).toFixed(2)),
      reviewCount: row.reviewCount ?? 0,
      projectCount: row.projectCount ?? 0,
    };
  }

  /**
   * Step 2 of the hybrid team model (GAP-ANALYSIS §3.3).
   *
   * Walk the project's scope tree, collect unique assigneeEmail values,
   * and hydrate each via user-service GET /internal/users/by-email/:email.
   * Returns a team array shaped for the frontend <TeamSection />.
   *
   * Why email and not UUID (per spec §16 L96):
   *   - editors know emails, not UUIDs → safer authoring
   *   - emails don't leak the internal UUID space to CMS admins
   *   - invalid emails fail lookup loudly instead of silently
   *
   * Step 3 (presence): isOnline is always false here. Real-time
   * presence lives in Ably (messaging-service) via WebSocket channels
   * — there's no REST endpoint to query "is user X online?" today.
   * When one is added (e.g. GET /v1/presence/:userId on messaging-
   * service, or a Redis last-seen cache), overlay it here.
   */
  private async hydrateTeam(row: any): Promise<
    Array<{
      firstName: string;
      username: string;
      avatarUrl: string | null;
      location: string | null;
      languages: string[];
      skills: string[];
      isLead: boolean;
      isOnline: boolean;
    }>
  > {
    // Extract unique assigneeEmails from scope tasks.
    const scope = row.scope;
    if (!Array.isArray(scope)) return [];

    const emails = new Set<string>();
    for (const phase of scope) {
      if (!Array.isArray(phase?.tasks)) continue;
      for (const task of phase.tasks) {
        const email =
          typeof task?.assigneeEmail === "string"
            ? task.assigneeEmail.trim().toLowerCase()
            : "";
        if (email) emails.add(email);
      }
    }
    if (emails.size === 0) return [];

    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:3003";

    // Hydrate each email in parallel. Graceful per-user: if one lookup
    // fails the rest still render. Timeout after 3s per user so a slow
    // user-service doesn't block the whole project page.
    const profiles = await Promise.all(
      [...emails].map(async (email, index) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(
            `${userServiceUrl}/internal/users/by-email/${encodeURIComponent(
              email,
            )}`,
            { signal: controller.signal },
          );
          clearTimeout(timeout);
          if (!res.ok) return null;
          const user = await res.json();
          return {
            firstName: user.firstName ?? user.username ?? email,
            username: user.username ?? email,
            avatarUrl: user.avatarUrl ?? null,
            location: user.location ?? null,
            languages: Array.isArray(user.languages)
              ? user.languages
                  .map((l: any) =>
                    typeof l === "string" ? l : l?.name ?? l?.value ?? "",
                  )
                  .filter(Boolean)
              : [],
            skills: Array.isArray(user.skills)
              ? user.skills
                  .map((s: any) =>
                    typeof s === "string" ? s : s?.name ?? s?.value ?? "",
                  )
                  .filter(Boolean)
              : [],
            // First team member is marked as lead (the one assigned to
            // the earliest task in the scope tree). Real "isLead" should
            // come from an explicit field on the user or task — this is
            // a placeholder heuristic.
            isLead: index === 0,
            // Step 3 stub: always false until messaging-service exposes
            // a REST presence endpoint or a Redis last-seen cache.
            isOnline: false,
          };
        } catch {
          return null;
        }
      }),
    );

    return profiles.filter((p): p is NonNullable<typeof p> => p !== null);
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
      process.env.CATEGORY_SERVICE_URL || "http://localhost:3023";
    const slug = primaryCategory
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    try {
      const res = await fetch(
        `${categoryServiceUrl}/api/category-pages/${slug}`,
      );
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

/**
 * §12 L68 `badges: string[]` — spec §01 L65 "badges come from the
 * review system". Derived from the same scoring columns `isTopRated`
 * already uses, so `badges` and `isTopRated` can never disagree.
 *
 * Output is a stable, lowercase-kebab set the frontend can pattern-match
 * on (e.g. a `<Badge variant={b}>` switch). Order reflects visual
 * priority — highest-signal badges first.
 *
 *   top-rated      rating ≥ 4.0 AND reviewCount ≥ 20   (matches isTopRated per §13 L59)
 *   highly-rated   rating ≥ 4.8 AND reviewCount ≥ 10   (elite quality at smaller sample)
 *   proven         completionsCount ≥ 10               (delivered many times)
 *   featured       featured === true                   (editorial pin)
 *
 * When the real reviews pipeline lands it populates the same columns
 * — no code change needed here.
 */
function deriveBadges(row: {
  rating: unknown;
  reviewCount: unknown;
  completionsCount: unknown;
  featured: unknown;
}): string[] {
  const rating = row.rating != null ? Number(row.rating) : 0;
  const reviews = Number(row.reviewCount ?? 0);
  const completions = Number(row.completionsCount ?? 0);
  const badges: string[] = [];
  if (rating >= 4.0 && reviews >= 20) badges.push("top-rated");
  if (rating >= 4.8 && reviews >= 10) badges.push("highly-rated");
  if (completions >= 10) badges.push("proven");
  if (row.featured === true) badges.push("featured");
  return badges;
}

function shapeProject(row: any) {
  const normalizeMediaUrl = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Hide the internal `/cms-media` prefix from the UI.
    if (trimmed.startsWith("/cms-media/")) {
      return "/media/" + trimmed.slice("/cms-media/".length);
    }
    return trimmed;
  };

  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    category: row.category ?? "Software Development",
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
    mediaUrls: Array.isArray(row.mediaUrls)
      ? row.mediaUrls
          .map(normalizeMediaUrl)
          .filter((u: string | null): u is string => u !== null)
      : [],
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
    // §12 L68 + §01 L65 — derived from the same scoring columns.
    badges: deriveBadges(row),
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
