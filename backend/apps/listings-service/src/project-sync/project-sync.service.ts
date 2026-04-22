import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ProjectSyncDto } from "./dto/project-sync.dto";
import {
  DELIVERABLES_ADAPTER,
  DeliverablesAdapter,
} from "./deliverables/deliverables.adapter";
import { SKILLS_ADAPTER, SkillsAdapter } from "./skills/skills.adapter";

/**
 * ProjectSyncService — receives Payload CMS project documents and
 * upserts them into `public.projects` keyed on `payloadId`.
 *
 * The frontend reads from `public.projects` via CmsProjectsController.
 * This service is the write path for that table from CMS edits, so a
 * round-trip through Payload admin lands on the project listing page
 * without any other moving parts.
 *
 * Soft-delete is implemented by flipping `status` to `archived` instead
 * of physically removing the row, which keeps `payloadId` as a stable
 * key if the editor later restores the document.
 */
@Injectable()
export class ProjectSyncService {
  private readonly logger = new Logger(ProjectSyncService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(DELIVERABLES_ADAPTER)
    private readonly deliverablesAdapter: DeliverablesAdapter,
    @Inject(SKILLS_ADAPTER)
    private readonly skillsAdapter: SkillsAdapter,
  ) {}

  async deriveDeliverablesFromScope(
    scope: NonNullable<ProjectSyncDto["scope"]>,
  ) {
    const normalized = this.scopePhases(scope);
    return this.deliverablesAdapter.deriveDeliverables(normalized);
  }

  async syncFromCms(
    dto: ProjectSyncDto,
  ): Promise<{ id: string; payloadId: string; action: "created" | "updated" }> {
    const payloadId = String(dto.id);
    const row = await this.toRow(dto);

    const existing = await this.dataSource.query(
      `SELECT id FROM public.projects WHERE "payloadId" = $1 LIMIT 1`,
      [payloadId],
    );

    if (existing.length === 0) {
      const result = await this.dataSource.query(
        `INSERT INTO public.projects (
           "payloadId", title, slug, description, "shortDescription",
           category, categories, subcategories, tags, skills,
           "programmingLanguages", "developmentTech",
           "mediaUrls", "videoUrl", deliverables, faqs,
           "estimatedHours", budget, duration, featured, status,
           "pricingModel", "priceViewMode", "priceMax", "projectType",
           "klarnaEnabled", "recentQuestions", "skillsAndTools",
           "reportButtonEnabled", "shareButtonEnabled", "helpButtonEnabled",
           "scope", industries, "relatedProjectIds",
           "createdBy", "createdAt", "updatedAt"
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7::text[], $8::text[], $9::text[], $10::text[],
           $11::text[], $12::text[],
           $13::text[], $14, $15::jsonb, $16::jsonb,
           $17, $18, $19, $20, $21::listing_status_enum,
           $22, $23, $24, $25,
           $26, $27::jsonb, $28::jsonb,
           $29, $30, $31,
           $32::jsonb, $33::text[], $34::text[],
           $35,
           COALESCE($36::timestamptz, NOW()),
           NOW()
         ) RETURNING id`,
        [
          payloadId,
          row.title,
          row.slug,
          row.description,
          row.shortDescription,
          row.category,
          row.categories,
          row.subcategories,
          row.tags,
          row.skills,
          row.programmingLanguages,
          row.developmentTech,
          row.mediaUrls,
          row.videoUrl,
          row.deliverables,
          row.faqs,
          row.estimatedHours,
          row.budget,
          row.duration,
          row.featured,
          row.status,
          row.pricingModel,
          row.priceViewMode,
          row.priceMax,
          row.projectType,
          row.klarnaEnabled,
          row.recentQuestions,
          row.skillsAndTools,
          row.reportButtonEnabled,
          row.shareButtonEnabled,
          row.helpButtonEnabled,
          row.scope,
          row.industries,
          row.relatedProjectIds,
          // Owner identity — prefer the CMS-authored `ownerId` so
          // `projectHistoryRatings` (§14.14) can group by the same
          // owner across projects. Fall back to `cms-sync` for legacy
          // documents that were synced before the field existed.
          dto.ownerId?.trim() || "cms-sync",
          dto.datePublished ?? null,
        ],
      );
      const id = result[0]?.id as string;
      this.logger.log(
        `Project created from CMS: id=${id} payloadId=${payloadId} slug=${row.slug}`,
      );
      return { id, payloadId, action: "created" };
    }

    const id = existing[0].id as string;
    await this.dataSource.query(
      `UPDATE public.projects SET
         title = $2,
         slug = $3,
         description = $4,
         "shortDescription" = $5,
         category = $6,
         categories = $7::text[],
         subcategories = $8::text[],
         tags = $9::text[],
         skills = $10::text[],
         "programmingLanguages" = $11::text[],
         "developmentTech" = $12::text[],
         "mediaUrls" = $13::text[],
         "videoUrl" = $14,
         deliverables = $15::jsonb,
         faqs = $16::jsonb,
         "estimatedHours" = $17,
         budget = $18,
         duration = $19,
         featured = $20,
         status = $21::listing_status_enum,
         "pricingModel" = $22,
         "priceViewMode" = $23,
         "priceMax" = $24,
         "projectType" = $25,
         "klarnaEnabled" = $26,
         "recentQuestions" = $27::jsonb,
         "skillsAndTools" = $28::jsonb,
         "reportButtonEnabled" = $29,
         "shareButtonEnabled" = $30,
         "helpButtonEnabled" = $31,
         "scope" = $32::jsonb,
         industries = $33::text[],
         "relatedProjectIds" = $34::text[],
         -- Backfill ownership when the CMS now supplies an ownerId and
         -- the row still has the legacy 'cms-sync' placeholder. Never
         -- overwrite a real owner once it's set, so §14.14 history
         -- doesn't churn when an unrelated field is edited.
         "createdBy" = CASE
          WHEN $35::text IS NOT NULL AND $35::text <> '' AND "createdBy" = 'cms-sync'
            THEN $35::text
           ELSE "createdBy"
         END,
         "updatedAt" = NOW()
       WHERE id = $1`,
      [
        id,
        row.title,
        row.slug,
        row.description,
        row.shortDescription,
        row.category,
        row.categories,
        row.subcategories,
        row.tags,
        row.skills,
        row.programmingLanguages,
        row.developmentTech,
        row.mediaUrls,
        row.videoUrl,
        row.deliverables,
        row.faqs,
        row.estimatedHours,
        row.budget,
        row.duration,
        row.featured,
        row.status,
        row.pricingModel,
        row.priceViewMode,
        row.priceMax,
        row.projectType,
        row.klarnaEnabled,
        row.recentQuestions,
        row.skillsAndTools,
        row.reportButtonEnabled,
        row.shareButtonEnabled,
        row.helpButtonEnabled,
        row.scope,
        row.industries,
        row.relatedProjectIds,
        dto.ownerId?.trim() || null,
      ],
    );
    this.logger.log(
      `Project updated from CMS: id=${id} payloadId=${payloadId} slug=${row.slug}`,
    );
    return { id, payloadId, action: "updated" };
  }

  async deleteByPayloadId(payloadId: string): Promise<{ deleted: boolean }> {
    const result = await this.dataSource.query(
      `UPDATE public.projects
          SET status = 'archived'::listing_status_enum, "updatedAt" = NOW()
        WHERE "payloadId" = $1`,
      [payloadId],
    );
    const affected = Array.isArray(result) ? result[1] ?? 0 : 0;
    this.logger.log(
      `Project soft-deleted from CMS: payloadId=${payloadId} affected=${affected}`,
    );
    return { deleted: affected > 0 };
  }

  // ── Internal mapping ─────────────────────────────────────────────────

  private async toRow(dto: ProjectSyncDto) {
    const categories = (dto.categories ?? [])
      .map((c) => c.value)
      .filter(Boolean);
    const subcategories = (dto.subcategories ?? [])
      .map((c) => c.value)
      .filter(Boolean);
    const tags = (dto.tags ?? []).map((t) => t.value).filter(Boolean);
    const authoredSkills = (dto.projectSkills ?? [])
      .map((s) => s.value)
      .filter(Boolean);
    const programmingLanguages = (dto.programmingLanguages ?? [])
      .map((p) => p.value)
      .filter(Boolean);
    const developmentTech = (dto.developmentTechnologies ?? [])
      .map((d) => d.value)
      .filter(Boolean);

    const thumbnail = dto.thumbnailUrl ?? null;
    const galleryUrls = dto.galleryUrls ?? [];
    const mediaUrls = [thumbnail, ...galleryUrls].filter(
      (u): u is string => !!u,
    );

    const videoUrl = dto.videoUrl ?? null;

    const description =
      this.lexicalToHtml(dto.fullDescription) || dto.shortDescription || "";
    const authoredDeliverables = this.deliverablePhases(dto.deliverables);
    const scope = this.scopePhases(dto.scope);
    // §01 Deliverables — spec says deliverables are "derived from an
    // AI summary that uses a large language model". When no author
    // content is present, delegate to the `DeliverablesAdapter` seam.
    // The bound adapter (`DeliverablesAdapterHuggingFace`) uses the
    // same MiniLM-L6-v2 embedding endpoint as
    // `favorites-service/ai/ai.service.ts` to cluster semantically
    // similar task titles into a single deliverable, and falls back
    // to the heuristic adapter when `HUGGINGFACE_API_KEY` is absent
    // or any inference call fails. Authored content always wins so
    // editors can override task-by-task.
    const deliverables =
      authoredDeliverables.length > 0
        ? authoredDeliverables
        : await this.deliverablesAdapter.deriveDeliverables(scope);

    // §14.11 SuggestedSkills + §03 Task → Skill Map — delegate to the
    // `SkillsAdapter` seam when the editor hasn't supplied
    // `projectSkills`. Bound adapter
    // (`SkillsAdapterHuggingFace`) embeds the description + category +
    // tags + scope task titles and ranks against the `public.projects`
    // skills vocabulary; `SkillsAdapterHeuristic` is the no-model
    // fallback. Authored content always wins.
    const scopeTaskTitles = scope
      .flatMap((p) => p.tasks.map((t) => t.title))
      .filter(Boolean);
    const skills =
      authoredSkills.length > 0
        ? authoredSkills
        : await this.skillsAdapter.extractSkills({
            description,
            category: categories[0] ?? null,
            tags,
            scopeTaskTitles,
          });
    // Payload v2 delivers `answer` as a Lexical rich-text tree once the
    // field type flipped from textarea → richText. Run it through the same
    // converter used by fullDescription so the column holds ready-to-render
    // HTML and the frontend can drop it into dangerouslySetInnerHTML without
    // a second parser. Legacy textarea strings are passed through unchanged.
    const faqs = (dto.faqQuestions ?? []).map((f) => ({
      question: f.question,
      answer:
        typeof f.answer === "string" ? f.answer : this.lexicalToHtml(f.answer),
    }));

    // Per docs §13 L62 the UI "Project Duration" label maps to the
    // `duration` column, described as a "calculated backend value".
    // Prefer the CMS-derived `projectDurationLabel` (scope rollup via
    // computeProjectFields beforeChange hook); fall back to the
    // author-declared timelineValue/Unit pair only when scope is empty.
    const duration =
      dto.projectDurationLabel ??
      (dto.timelineValue && dto.timelineUnit
        ? `${dto.timelineValue} ${dto.timelineUnit}`
        : null);
    const budget = dto.priceRangeMin ?? null;
    const priceMax = dto.priceRangeMax ?? null;

    const recentQuestions = (dto.recentQuestions ?? [])
      .map((q) => q.question)
      .filter(Boolean);

    const skillsAndTools = (dto.skillsAndTools ?? []).map((s) => ({
      title: s.title,
      iconUrl: this.resolveMediaUrl(s.icon),
    }));

    const status = this.resolveStatus(dto);
    const industries = (dto.industries ?? [])
      .map((i) => i.value)
      .filter(Boolean);
    // relatedProjects arrives as array of IDs (numbers) or populated
    // docs. Normalize to string IDs for storage.
    const relatedProjectIds = (
      Array.isArray(dto.relatedProjects) ? dto.relatedProjects : []
    )
      .map((r) => {
        if (typeof r === "number" || typeof r === "string") return String(r);
        if (r && typeof r === "object" && (r as any).id)
          return String((r as any).id);
        return "";
      })
      .filter(Boolean);

    return {
      title: dto.title,
      slug: dto.slug,
      description,
      shortDescription: dto.shortDescription ?? "",
      category: categories[0] ?? null,
      categories,
      subcategories,
      tags,
      skills,
      programmingLanguages,
      developmentTech,
      industries,
      mediaUrls,
      videoUrl,
      deliverables: JSON.stringify(deliverables),
      scope: JSON.stringify(scope),
      faqs: JSON.stringify(faqs),
      estimatedHours: dto.totalEstimatedHours ?? null,
      budget,
      duration,
      featured: dto.featured ?? false,
      status,
      pricingModel: dto.pricingModel ?? null,
      priceViewMode: dto.priceViewMode ?? null,
      priceMax,
      projectType: dto.projectType ?? null,
      klarnaEnabled: dto.klarnaPaymentEnabled ?? false,
      recentQuestions: JSON.stringify(recentQuestions),
      skillsAndTools: JSON.stringify(skillsAndTools),
      relatedProjectIds,
      reportButtonEnabled: dto.reportButtonEnabled ?? true,
      shareButtonEnabled: dto.shareButtonEnabled ?? true,
      helpButtonEnabled: dto.helpButtonEnabled ?? false,
    };
  }

  private resolveStatus(
    dto: ProjectSyncDto,
  ): "draft" | "published" | "flagged" | "archived" {
    const raw = dto.status ?? dto._status;
    if (
      raw === "published" ||
      raw === "draft" ||
      raw === "flagged" ||
      raw === "archived"
    ) {
      return raw;
    }
    return "published";
  }

  private resolveMediaUrl(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object") {
      const obj = ref as Record<string, unknown>;
      if (typeof obj.url === "string") return obj.url;
      if (typeof obj.filename === "string") {
        const base =
          process.env.CMS_PUBLIC_URL || process.env.CMS_SERVICE_URL || "";
        return `${base.replace(/\/$/, "")}/media/${obj.filename}`;
      }
    }
    return null;
  }

  /**
   * Normalize Payload's `scope` array field (Phase → Task[]) into the
   * jsonb shape the listings entity expects. Mirrors docs §08 PhaseDto /
   * TaskDto field names — Payload already authors in the correct case
   * (phaseName, roleName, experienceLevel, estimatedHours) so this is
   * mostly a pass-through with defensive normalization for stray inputs
   * (e.g. legacy snake_case from Strapi migrations).
   */
  private scopePhases(value: unknown): Array<{
    phaseName: string;
    order: number;
    tasks: Array<{
      title: string;
      roleName: string;
      location?: string;
      experienceLevel: string;
      estimatedHours: number;
      assigneeEmail?: string;
    }>;
  }> {
    if (!Array.isArray(value)) return [];
    const normalizeTask = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return null;
      const t = raw as Record<string, unknown>;
      const title = typeof t.title === "string" ? t.title : "";
      const roleName =
        typeof t.roleName === "string"
          ? t.roleName
          : typeof (t as any).role_name === "string"
          ? ((t as any).role_name as string)
          : "";
      const location =
        typeof t.location === "string" ? (t.location as string) : undefined;
      const experienceLevel =
        typeof t.experienceLevel === "string"
          ? t.experienceLevel
          : typeof (t as any).experience_level === "string"
          ? ((t as any).experience_level as string)
          : "Medior";
      const estimatedHours =
        typeof t.estimatedHours === "number"
          ? t.estimatedHours
          : typeof (t as any).estimated_hours === "number"
          ? ((t as any).estimated_hours as number)
          : 0;
      if (!title || !roleName) return null;
      const assigneeEmail =
        typeof t.assigneeEmail === "string" && t.assigneeEmail.trim()
          ? t.assigneeEmail.trim().toLowerCase()
          : undefined;
      return {
        title,
        roleName,
        location,
        experienceLevel,
        estimatedHours,
        assigneeEmail,
      };
    };
    return value
      .map((phase) => {
        if (!phase || typeof phase !== "object") return null;
        const p = phase as Record<string, unknown>;
        const phaseName =
          typeof p.phaseName === "string"
            ? p.phaseName
            : typeof (p as any).phase_name === "string"
            ? ((p as any).phase_name as string)
            : "";
        const order = typeof p.order === "number" ? p.order : 0;
        const rawTasks = Array.isArray(p.tasks) ? p.tasks : [];
        const tasks = rawTasks
          .map(normalizeTask)
          .filter((t): t is NonNullable<typeof t> => !!t);
        if (!phaseName || tasks.length === 0) return null;
        return { phaseName, order, tasks };
      })
      .filter((p): p is NonNullable<typeof p> => !!p)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Normalize Payload's `deliverables` array field into the phase shape
   * the frontend renders. Payload sends `[{ phaseLabel, phaseName, items: [{text}] }]`;
   * we strip the item wrapper so storage holds `[{ phaseLabel, phaseName, items: string[] }]`
   * — a jsonb column so the Figma-style grouped rendering is preserved end-to-end.
   */
  private deliverablePhases(
    value: unknown,
  ): Array<{ phaseLabel: string; phaseName: string; items: string[] }> {
    // Back-compat: older Payload schema shipped deliverables as a phased array:
    //   [{ phaseLabel, phaseName, items: [{text}] }]
    if (Array.isArray(value)) {
      return value
        .map((phase) => {
          if (!phase || typeof phase !== "object") return null;
          const p = phase as Record<string, unknown>;
          const phaseLabel =
            typeof p.phaseLabel === "string" ? p.phaseLabel : "";
          const phaseName = typeof p.phaseName === "string" ? p.phaseName : "";
          const rawItems = Array.isArray(p.items) ? p.items : [];
          const items = rawItems
            .map((it) => {
              if (typeof it === "string") return it;
              if (
                it &&
                typeof it === "object" &&
                typeof (it as { text?: unknown }).text === "string"
              ) {
                return (it as { text: string }).text;
              }
              return "";
            })
            .filter(Boolean);
          if (!phaseLabel && !phaseName && items.length === 0) return null;
          return { phaseLabel, phaseName, items };
        })
        .filter(
          (p): p is { phaseLabel: string; phaseName: string; items: string[] } =>
            !!p,
        );
    }

    // Docs-aligned: Payload now authors deliverables as Lexical rich-text.
    // Normalize rich-text → grouped phases by extracting headings + list items.
    const html =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
        ? this.lexicalToHtml(value)
        : "";
    return this.deliverablesFromHtml(html);
  }

  private deliverablesFromHtml(
    html: string,
  ): Array<{ phaseLabel: string; phaseName: string; items: string[] }> {
    const stripTags = (s: string) =>
      s
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const tokens: Array<
      | { type: "heading"; text: string }
      | { type: "li"; text: string }
      | { type: "text"; text: string }
    > = [];

    const tokenRe =
      /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<li[^>]*>([\s\S]*?)<\/li>|<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null = null;
    while ((m = tokenRe.exec(html))) {
      const headingInner = m[2];
      const liInner = m[3];
      const pInner = m[4];
      if (headingInner != null) {
        const text = stripTags(headingInner);
        if (text) tokens.push({ type: "heading", text });
      } else if (liInner != null) {
        const text = stripTags(liInner);
        if (text) tokens.push({ type: "li", text });
      } else if (pInner != null) {
        const text = stripTags(pInner);
        if (text) tokens.push({ type: "text", text });
      }
    }

    const groups: Array<{
      phaseLabel: string;
      phaseName: string;
      items: string[];
    }> = [];

    let current: { phaseLabel: string; phaseName: string; items: string[] } | null =
      null;

    for (const t of tokens) {
      if (t.type === "heading") {
        if (current && current.items.length > 0) groups.push(current);
        current = { phaseLabel: "", phaseName: t.text, items: [] };
        continue;
      }
      if (t.type === "li") {
        if (!current) current = { phaseLabel: "", phaseName: "Deliverables", items: [] };
        current.items.push(t.text);
        continue;
      }
    }

    if (current && current.items.length > 0) groups.push(current);

    // Fallback: no list items; use paragraph text as single-item list.
    if (groups.length === 0) {
      const textItems = tokens
        .filter((t) => t.type === "text")
        .map((t) => t.text)
        .filter(Boolean);
      if (textItems.length > 0) {
        groups.push({ phaseLabel: "", phaseName: "Deliverables", items: textItems });
      }
    }

    return groups;
  }

  /**
   * Convert a Payload Lexical rich-text JSON tree into HTML.
   *
   * Covers every node type the Payload Projects collection's `fullDescription`
   * editor can produce (Lexical v0.11.x / Payload v2):
   *
   *   Block nodes
   *     paragraph          → <p>
   *     heading            → <h1>..<h6>
   *     list (bullet)      → <ul><li>
   *     list (number)      → <ol><li>
   *     list (check)       → <ul class="task-list"><li data-checked="...">
   *     quote              → <blockquote>
   *     code               → <pre><code class="language-*">
   *     horizontalrule     → <hr/>
   *     upload (image)     → <img src alt width height>
   *
   *   Inline nodes
   *     text               → text, wrapped in format tags
   *     link / autolink    → <a href target rel>
   *     linebreak          → <br/>
   *
   *   Text format bitmask (Lexical)
   *     1  bold       → <strong>
   *     2  italic     → <em>
   *     4  strike     → <s>
   *     8  underline  → <u>
   *     16 code       → <code>
   *     32 subscript  → <sub>
   *     64 superscript→ <sup>
   *
   *   Block-level `format` field ("left"|"center"|"right"|"justify") is
   *   serialized as an inline style on the block tag so prose styling
   *   respects author intent.
   *
   *   Upload node handling: the cms-service syncProjects hook pre-populates
   *   `node.value` with the full media doc (url/filename/alt/width/height)
   *   before POSTing, so this converter only needs to read those fields.
   *
   *   HTML is stored in the `description` column and rendered on the
   *   frontend via `dangerouslySetInnerHTML` inside a Tailwind `prose`
   *   wrapper. Content is admin-authored so no additional sanitization
   *   is needed — text content IS still escaped via escapeHtml() for
   *   defense-in-depth.
   */
  private lexicalToHtml(node: unknown): string {
    if (node == null) return "";
    if (typeof node === "string") return this.escapeHtml(node);
    if (Array.isArray(node))
      return node.map((n) => this.lexicalToHtml(n)).join("");
    if (typeof node !== "object") return "";

    const n = node as Record<string, unknown>;

    // Root wrapper — { root: { type, children, ... } }
    if (n.root) return this.lexicalToHtml(n.root);

    const children = Array.isArray(n.children)
      ? this.lexicalToHtml(n.children)
      : "";

    const type = typeof n.type === "string" ? n.type : "";

    // Block-level text alignment — Lexical stores this in the `format`
    // string field of block nodes. Convert to a style attribute.
    const alignStyle = this.blockAlignStyle(n.format);

    switch (type) {
      case "root":
        return children;

      case "paragraph":
        if (!children) return "";
        return alignStyle
          ? `<p style="${alignStyle}">${children}</p>`
          : `<p>${children}</p>`;

      case "heading": {
        const tag =
          typeof n.tag === "string" && /^h[1-6]$/.test(n.tag) ? n.tag : "h2";
        return alignStyle
          ? `<${tag} style="${alignStyle}">${children}</${tag}>`
          : `<${tag}>${children}</${tag}>`;
      }

      case "list": {
        const listType = n.listType;
        if (listType === "check") {
          return `<ul class="task-list">${children}</ul>`;
        }
        const listTag = listType === "number" ? "ol" : "ul";
        return `<${listTag}>${children}</${listTag}>`;
      }

      case "listitem": {
        // Check-list items carry a `checked: boolean` flag
        if (typeof n.checked === "boolean") {
          return `<li data-checked="${n.checked}">${children}</li>`;
        }
        return `<li>${children}</li>`;
      }

      case "quote":
        return `<blockquote>${children}</blockquote>`;

      case "code": {
        const language =
          typeof n.language === "string" && n.language
            ? ` class="language-${this.escapeHtml(n.language)}"`
            : "";
        return `<pre><code${language}>${children}</code></pre>`;
      }

      case "horizontalrule":
        return "<hr/>";

      case "linebreak":
        return "<br/>";

      case "link":
      case "autolink": {
        const fields = (n.fields ?? {}) as Record<string, unknown>;
        const url =
          typeof n.url === "string"
            ? n.url
            : typeof fields.url === "string"
            ? (fields.url as string)
            : typeof fields.doc === "string"
            ? `/${fields.doc}`
            : "#";
        const newTab =
          typeof fields.newTab === "boolean" ? fields.newTab : true;
        const escapedUrl = this.escapeHtml(url);
        const target = newTab ? ' target="_blank"' : "";
        const rel = newTab ? ' rel="noopener noreferrer"' : "";
        return `<a href="${escapedUrl}"${target}${rel}>${children}</a>`;
      }

      case "upload": {
        // Expect `value` to be a populated media doc (cms hook populates
        // upload IDs before posting). If it arrives as a raw id we skip
        // gracefully rather than breaking the HTML.
        const value = n.value;
        if (!value || typeof value !== "object") return "";
        const v = value as Record<string, unknown>;
        const url = this.resolveMediaUrl(v);
        if (!url) return "";
        const alt = typeof v.alt === "string" ? v.alt : "";
        const width = typeof v.width === "number" ? ` width="${v.width}"` : "";
        const height =
          typeof v.height === "number" ? ` height="${v.height}"` : "";
        return `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(
          alt,
        )}"${width}${height} loading="lazy" />`;
      }

      case "text": {
        const text = typeof n.text === "string" ? this.escapeHtml(n.text) : "";
        if (!text) return "";
        const fmt = typeof n.format === "number" ? n.format : 0;
        let wrapped = text;
        // Apply inline formats inside-out so the innermost tag hugs the text.
        if (fmt & 64) wrapped = `<sup>${wrapped}</sup>`;
        if (fmt & 32) wrapped = `<sub>${wrapped}</sub>`;
        if (fmt & 16) wrapped = `<code>${wrapped}</code>`;
        if (fmt & 8) wrapped = `<u>${wrapped}</u>`;
        if (fmt & 4) wrapped = `<s>${wrapped}</s>`;
        if (fmt & 2) wrapped = `<em>${wrapped}</em>`;
        if (fmt & 1) wrapped = `<strong>${wrapped}</strong>`;
        return wrapped;
      }

      default:
        // Unknown block type — recurse into children so we don't drop content.
        return children;
    }
  }

  private blockAlignStyle(format: unknown): string {
    if (typeof format !== "string" || !format) return "";
    switch (format) {
      case "center":
        return "text-align:center";
      case "right":
      case "end":
        return "text-align:right";
      case "justify":
        return "text-align:justify";
      case "left":
      case "start":
        return "text-align:left";
      default:
        return "";
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
