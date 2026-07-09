import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { HttpService } from "@nestjs/axios";
import { ProjectSyncDto } from "./dto/project-sync.dto";
import { Project } from "../projects/entities/project.entity";
import { ListingStatus } from "../shared/enums/listing.enum";
import {
  DELIVERABLES_ADAPTER,
  DeliverablesAdapter,
} from "./deliverables/deliverables.adapter";
import { SKILLS_ADAPTER, SkillsAdapter } from "./skills/skills.adapter";
import { budgetFromScope } from "../shared/utils/pricing";
import { CloudflareStorageService } from "../publish/cloudflare-storage.service";

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
    private readonly cloudflareStorageService: CloudflareStorageService,
    private readonly httpService: HttpService,
  ) {}

  async syncFromCms(
    dto: ProjectSyncDto,
  ): Promise<{ id: string; payloadId: string; action: "created" | "updated" }> {
    const payloadId = String(dto.id);
    const row = await this.toRow(dto);

    // Local dev uses a TypeORM-managed `projects` table (entity: Project).
    // Keep the CMS sync path aligned with that table so changes are visible
    // via `/v1/projects` immediately without requiring a separate SQL schema.
    const repo = this.dataSource.getRepository(Project);
    const existing = await repo.findOne({ where: { payloadId } });
    const project = existing ?? repo.create({ payloadId });

    project.title = row.title;
    project.slug = row.slug ?? undefined;
    project.description = row.description;
    project.shortDescription = row.shortDescription ?? undefined;
    project.projectType = row.projectType ?? undefined;
    project.category = row.category ?? null;
    project.categories = row.categories ?? [];
    project.subcategories = row.subcategories ?? [];
    project.tags = row.tags ?? [];
    project.skills = row.skills ?? [];
    project.programmingLanguages = row.programmingLanguages ?? [];
    project.developmentTech = row.developmentTech ?? [];
    project.mediaUrls = row.mediaUrls ?? [];
    project.videoUrl = row.videoUrl ?? undefined;
    project.deliverables = row.deliverables;
    project.faqs = row.faqs;
    project.scope = row.scope;
    project.estimatedHours = row.estimatedHours ?? undefined;
    project.budget = row.budget ?? undefined;
    project.duration = row.duration ?? undefined;
    project.recentQuestions = row.recentQuestions ?? [];
    project.relatedProjectIds = row.relatedProjectIds ?? [];
    project.chatEnabled = row.chatEnabled ?? false;
    project.reportButtonEnabled = row.reportButtonEnabled ?? true;
    project.shareButtonEnabled = row.shareButtonEnabled ?? true;
    project.helpButtonEnabled = row.helpButtonEnabled ?? false;
    project.featured = row.featured ?? false;
    project.status = row.status as ListingStatus;
    project.industry = row.industries ?? [];
    project.createdBy =
      dto.ownerId?.trim() || project.createdBy || "cms-sync";

    if (!existing && dto.datePublished) {
      const publishedAt = new Date(dto.datePublished);
      if (!Number.isNaN(publishedAt.getTime())) {
        project.createdAt = publishedAt;
      }
    }

    const saved = await repo.save(project);
    const action: "created" | "updated" = existing ? "updated" : "created";

    // Re-upload external media URLs to Cloudflare R2
    if (saved.mediaUrls?.length) {
      const r2Urls = await this.reuploadMediaToR2(saved.id, saved.mediaUrls);
      if (r2Urls.some((url, i) => url !== saved.mediaUrls[i])) {
        saved.mediaUrls = r2Urls;
        await repo.save(saved);
      }
    }

    this.logger.log(
      `Project ${action} from CMS: id=${saved.id} payloadId=${payloadId} slug=${row.slug}`,
    );
    return { id: saved.id, payloadId, action };
  }

  async deleteByPayloadId(payloadId: string): Promise<{ deleted: boolean }> {
    const repo = this.dataSource.getRepository(Project);
    const existing = await repo.findOne({ where: { payloadId } });
    if (!existing) return { deleted: false };
    existing.status = "archived" as any;
    await repo.save(existing);
    this.logger.log(`Project soft-deleted from CMS: payloadId=${payloadId}`);
    return { deleted: true };
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
      null;
    // Budget — prefer CMS computed total (startingPriceTotal), otherwise derive from scope.
    const scopeBudget = budgetFromScope(scope);
    const budget = dto.startingPriceTotal ?? scopeBudget.budget ?? null;

    const recentQuestions = (dto.recentQuestions ?? [])
      .map((q) => ({
        question: q.question,
        answer:
          typeof (q as any).answer === "string"
            ? (q as any).answer
            : (q as any).answer
              ? this.lexicalToHtml((q as any).answer)
              : null,
      }))
      .filter((q) => typeof q.question === "string" && q.question.length > 0);

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
      projectType: typeof dto.projectType === 'string' ? dto.projectType.trim() || null : null,
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
      deliverables,
      scope,
      faqs,
      estimatedHours:
        scopeBudget.totalHours > 0 ? Math.round(scopeBudget.totalHours) : null,
      budget,
      duration,
      featured: dto.featured ?? false,
      status,
      recentQuestions,
      relatedProjectIds,
      chatEnabled: dto.chatEnabled ?? false,
      reportButtonEnabled: dto.reportButtonEnabled ?? true,
      shareButtonEnabled: dto.shareButtonEnabled ?? true,
      helpButtonEnabled: dto.helpButtonEnabled ?? false,
    };
  }

  /**
   * Downloads external image URLs and re-uploads them to Cloudflare R2.
   * URLs already pointing to R2 are left as-is.
   */
  private async reuploadMediaToR2(
    projectId: string,
    urls: string[],
  ): Promise<string[]> {
    const r2PublicUrl =
      process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_ENDPOINT || "";

    return Promise.all(
      urls.map(async (url) => {
        // Skip URLs already on R2
        if (r2PublicUrl && url.startsWith(r2PublicUrl)) return url;
        // Skip non-HTTP URLs (relative paths, R2 keys, etc.)
        if (!/^https?:\/\//i.test(url)) return url;

        try {
          const response = await this.httpService.axiosRef.get(url, {
            responseType: "arraybuffer",
            timeout: 15_000,
          });

          const contentType =
            (response.headers["content-type"] as string) || "image/jpeg";
          const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
          const filename = `cms-sync.${ext}`;

          const file = {
            buffer: Buffer.from(response.data),
            originalname: filename,
            mimetype: contentType,
          } as Express.Multer.File;

          const upload =
            await this.cloudflareStorageService.uploadProjectMedia(
              projectId,
              file,
            );
          this.logger.log(
            `Re-uploaded external media to R2: ${url} → ${upload.url}`,
          );
          return upload.url;
        } catch (err) {
          this.logger.warn(
            `Failed to re-upload media to R2 (keeping original URL): ${url} — ${
              (err as Error).message
            }`,
          );
          return url;
        }
      }),
    );
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
      location?: string[];
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
      const location: string[] | undefined = Array.isArray(t.location)
        ? (t.location as string[])
        : typeof t.location === "string" && t.location
        ? [t.location]
        : undefined;
      const experienceLevel =
        typeof t.experienceLevel === "string"
          ? t.experienceLevel
          : typeof (t as any).experience_level === "string"
          ? ((t as any).experience_level as string)
          : "Medior";
      const parseFinite = (v: unknown): number | null => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim()) {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      };

      let estimatedHours =
        parseFinite(t.estimatedHours) ??
        parseFinite((t as any).estimated_hours) ??
        0;

      // CMS scope authoring stores duration as {durationValue, durationType}
      // and computes totalEstimatedHours in a hook; during sync we still need
      // per-task hours for pricing and downstream adapters.
      if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
        const dv = Number((t as any).durationValue);
        const dt =
          typeof (t as any).durationType === "string"
            ? String((t as any).durationType)
            : "";
        if (Number.isFinite(dv) && dv > 0 && dt) {
          if (dt === "hours") estimatedHours = dv;
          else if (dt === "days") estimatedHours = dv * 24;
          else estimatedHours = dv * 168; // weeks (default)
        }
      }
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
    if (!Array.isArray(value)) return [];
    return value
      .map((phase) => {
        if (!phase || typeof phase !== "object") return null;
        const p = phase as Record<string, unknown>;
        const phaseLabel = typeof p.phaseLabel === "string" ? p.phaseLabel : "";
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

  async deriveDeliverablesFromScope(scope: unknown) {
    const phases = this.scopePhases(scope);
    const adapterInput = phases.map((p) => ({
      phaseName: p.phaseName,
      order: p.order,
      tasks: p.tasks.map((t) => ({
        title: t.title,
        roleName: t.roleName,
        // CMS scope schema doesn't currently have a description field, but
        // accept it for forward-compat / legacy payloads.
        description: (t as any).description,
      })),
    }));
    return await this.deliverablesAdapter.deriveDeliverables(adapterInput);
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
