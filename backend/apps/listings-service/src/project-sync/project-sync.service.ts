import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectSyncDto } from './dto/project-sync.dto';

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
  ) {}

  async syncFromCms(dto: ProjectSyncDto): Promise<{ id: string; payloadId: string; action: 'created' | 'updated' }> {
    const payloadId = String(dto.id);
    const row = this.toRow(dto);

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
           "chatEnabled", "reportButtonEnabled", "shareButtonEnabled", "helpButtonEnabled",
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
           $29, $30, $31, $32,
           $33::jsonb, $34::text[], $35::text[],
           $36,
           COALESCE($37::timestamptz, NOW()),
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
          row.chatEnabled,
          row.reportButtonEnabled,
          row.shareButtonEnabled,
          row.helpButtonEnabled,
          row.scope,
          row.industries,
          row.relatedProjectIds,
          'cms-sync',
          dto.datePublished ?? null,
        ],
      );
      const id = result[0]?.id as string;
      this.logger.log(`Project created from CMS: id=${id} payloadId=${payloadId} slug=${row.slug}`);
      return { id, payloadId, action: 'created' };
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
         "chatEnabled" = $29,
         "reportButtonEnabled" = $30,
         "shareButtonEnabled" = $31,
         "helpButtonEnabled" = $32,
         "scope" = $33::jsonb,
         industries = $34::text[],
         "relatedProjectIds" = $35::text[],
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
        row.chatEnabled,
        row.reportButtonEnabled,
        row.shareButtonEnabled,
        row.helpButtonEnabled,
        row.scope,
        row.industries,
        row.relatedProjectIds,
      ],
    );
    this.logger.log(`Project updated from CMS: id=${id} payloadId=${payloadId} slug=${row.slug}`);
    return { id, payloadId, action: 'updated' };
  }

  async deleteByPayloadId(payloadId: string): Promise<{ deleted: boolean }> {
    const result = await this.dataSource.query(
      `UPDATE public.projects
          SET status = 'archived'::listing_status_enum, "updatedAt" = NOW()
        WHERE "payloadId" = $1`,
      [payloadId],
    );
    const affected = Array.isArray(result) ? (result[1] ?? 0) : 0;
    this.logger.log(`Project soft-deleted from CMS: payloadId=${payloadId} affected=${affected}`);
    return { deleted: affected > 0 };
  }

  // ── Internal mapping ─────────────────────────────────────────────────

  private toRow(dto: ProjectSyncDto) {
    const categories = (dto.categories ?? []).map((c) => c.value).filter(Boolean);
    const subcategories = (dto.subcategories ?? []).map((c) => c.value).filter(Boolean);
    const tags = (dto.tags ?? []).map((t) => t.value).filter(Boolean);
    const skills = (dto.projectSkills ?? []).map((s) => s.value).filter(Boolean);
    const programmingLanguages = (dto.programmingLanguages ?? []).map((p) => p.value).filter(Boolean);
    const developmentTech = (dto.developmentTechnologies ?? []).map((d) => d.value).filter(Boolean);

    const thumbnail = dto.thumbnailUrl ?? this.resolveMediaUrl(dto.thumbnail);
    const galleryUrls = dto.galleryUrls && dto.galleryUrls.length
      ? dto.galleryUrls
      : (dto.gallery ?? [])
          .map((g) => this.resolveMediaUrl(g.image))
          .filter((u): u is string => !!u);
    const mediaUrls = [thumbnail, ...galleryUrls].filter((u): u is string => !!u);

    const videoUrl =
      dto.videoUrl ??
      dto.videoWalkthrough?.externalUrl ??
      this.resolveMediaUrl(dto.videoWalkthrough?.upload) ??
      null;

    const description = this.lexicalToHtml(dto.fullDescription) || dto.shortDescription || '';
    const deliverables = this.deliverablePhases(dto.deliverables);
    const scope = this.scopePhases(dto.scope);
    // Payload v2 delivers `answer` as a Lexical rich-text tree once the
    // field type flipped from textarea → richText. Run it through the same
    // converter used by fullDescription so the column holds ready-to-render
    // HTML and the frontend can drop it into dangerouslySetInnerHTML without
    // a second parser. Legacy textarea strings are passed through unchanged.
    const faqs = (dto.faqQuestions ?? []).map((f) => ({
      question: f.question,
      answer:
        typeof f.answer === 'string' ? f.answer : this.lexicalToHtml(f.answer),
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
    const industries = (dto.industries ?? []).map((i) => i.value).filter(Boolean);
    // relatedProjects arrives as array of IDs (numbers) or populated
    // docs. Normalize to string IDs for storage.
    const relatedProjectIds = (Array.isArray(dto.relatedProjects) ? dto.relatedProjects : [])
      .map((r) => {
        if (typeof r === 'number' || typeof r === 'string') return String(r);
        if (r && typeof r === 'object' && (r as any).id) return String((r as any).id);
        return '';
      })
      .filter(Boolean);

    return {
      title: dto.title,
      slug: dto.slug,
      description,
      shortDescription: dto.shortDescription ?? '',
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
      chatEnabled: dto.chatEnabled ?? false,
      reportButtonEnabled: dto.reportButtonEnabled ?? true,
      shareButtonEnabled: dto.shareButtonEnabled ?? true,
      helpButtonEnabled: dto.helpButtonEnabled ?? false,
    };
  }

  private resolveStatus(dto: ProjectSyncDto): 'draft' | 'published' | 'flagged' | 'archived' {
    const raw = dto.status ?? dto._status;
    if (raw === 'published' || raw === 'draft' || raw === 'flagged' || raw === 'archived') {
      return raw;
    }
    return 'published';
  }

  private resolveMediaUrl(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object') {
      const obj = ref as Record<string, unknown>;
      if (typeof obj.url === 'string') return obj.url;
      if (typeof obj.filename === 'string') {
        const base = process.env.CMS_PUBLIC_URL || process.env.CMS_SERVICE_URL || '';
        return `${base.replace(/\/$/, '')}/media/${obj.filename}`;
      }
    }
    return null;
  }

  private serializeRichText(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    try {
      return this.extractText(value).trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize Payload's `scope` array field (Phase → Task[]) into the
   * jsonb shape the listings entity expects. Mirrors docs §08 PhaseDto /
   * TaskDto field names — Payload already authors in the correct case
   * (phaseName, roleName, experienceLevel, estimatedHours) so this is
   * mostly a pass-through with defensive normalization for stray inputs
   * (e.g. legacy snake_case from Strapi migrations).
   */
  private scopePhases(
    value: unknown,
  ): Array<{
    phaseName: string;
    order: number;
    tasks: Array<{
      title: string;
      roleName: string;
      location?: string;
      experienceLevel: string;
      estimatedHours: number;
    }>;
  }> {
    if (!Array.isArray(value)) return [];
    const normalizeTask = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null;
      const t = raw as Record<string, unknown>;
      const title = typeof t.title === 'string' ? t.title : '';
      const roleName =
        typeof t.roleName === 'string'
          ? t.roleName
          : typeof (t as any).role_name === 'string'
            ? ((t as any).role_name as string)
            : '';
      const location =
        typeof t.location === 'string' ? (t.location as string) : undefined;
      const experienceLevel =
        typeof t.experienceLevel === 'string'
          ? t.experienceLevel
          : typeof (t as any).experience_level === 'string'
            ? ((t as any).experience_level as string)
            : 'Medior';
      const estimatedHours =
        typeof t.estimatedHours === 'number'
          ? t.estimatedHours
          : typeof (t as any).estimated_hours === 'number'
            ? ((t as any).estimated_hours as number)
            : 0;
      if (!title || !roleName) return null;
      return {
        title,
        roleName,
        location,
        experienceLevel,
        estimatedHours,
      };
    };
    return value
      .map((phase) => {
        if (!phase || typeof phase !== 'object') return null;
        const p = phase as Record<string, unknown>;
        const phaseName =
          typeof p.phaseName === 'string'
            ? p.phaseName
            : typeof (p as any).phase_name === 'string'
              ? ((p as any).phase_name as string)
              : '';
        const order = typeof p.order === 'number' ? p.order : 0;
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
        if (!phase || typeof phase !== 'object') return null;
        const p = phase as Record<string, unknown>;
        const phaseLabel = typeof p.phaseLabel === 'string' ? p.phaseLabel : '';
        const phaseName = typeof p.phaseName === 'string' ? p.phaseName : '';
        const rawItems = Array.isArray(p.items) ? p.items : [];
        const items = rawItems
          .map((it) => {
            if (typeof it === 'string') return it;
            if (it && typeof it === 'object' && typeof (it as { text?: unknown }).text === 'string') {
              return (it as { text: string }).text;
            }
            return '';
          })
          .filter(Boolean);
        if (!phaseLabel && !phaseName && items.length === 0) return null;
        return { phaseLabel, phaseName, items };
      })
      .filter((p): p is { phaseLabel: string; phaseName: string; items: string[] } => !!p);
  }

  private extractText(node: unknown): string {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map((n) => this.extractText(n)).join('\n');
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === 'string') return obj.text;
      if (Array.isArray(obj.children)) return this.extractText(obj.children);
      if (obj.root) return this.extractText(obj.root);
    }
    return '';
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
    if (node == null) return '';
    if (typeof node === 'string') return this.escapeHtml(node);
    if (Array.isArray(node)) return node.map((n) => this.lexicalToHtml(n)).join('');
    if (typeof node !== 'object') return '';

    const n = node as Record<string, unknown>;

    // Root wrapper — { root: { type, children, ... } }
    if (n.root) return this.lexicalToHtml(n.root);

    const children = Array.isArray(n.children)
      ? this.lexicalToHtml(n.children)
      : '';

    const type = typeof n.type === 'string' ? n.type : '';

    // Block-level text alignment — Lexical stores this in the `format`
    // string field of block nodes. Convert to a style attribute.
    const alignStyle = this.blockAlignStyle(n.format);

    switch (type) {
      case 'root':
        return children;

      case 'paragraph':
        if (!children) return '';
        return alignStyle
          ? `<p style="${alignStyle}">${children}</p>`
          : `<p>${children}</p>`;

      case 'heading': {
        const tag =
          typeof n.tag === 'string' && /^h[1-6]$/.test(n.tag) ? n.tag : 'h2';
        return alignStyle
          ? `<${tag} style="${alignStyle}">${children}</${tag}>`
          : `<${tag}>${children}</${tag}>`;
      }

      case 'list': {
        const listType = n.listType;
        if (listType === 'check') {
          return `<ul class="task-list">${children}</ul>`;
        }
        const listTag = listType === 'number' ? 'ol' : 'ul';
        return `<${listTag}>${children}</${listTag}>`;
      }

      case 'listitem': {
        // Check-list items carry a `checked: boolean` flag
        if (typeof n.checked === 'boolean') {
          return `<li data-checked="${n.checked}">${children}</li>`;
        }
        return `<li>${children}</li>`;
      }

      case 'quote':
        return `<blockquote>${children}</blockquote>`;

      case 'code': {
        const language =
          typeof n.language === 'string' && n.language
            ? ` class="language-${this.escapeHtml(n.language)}"`
            : '';
        return `<pre><code${language}>${children}</code></pre>`;
      }

      case 'horizontalrule':
        return '<hr/>';

      case 'linebreak':
        return '<br/>';

      case 'link':
      case 'autolink': {
        const fields = (n.fields ?? {}) as Record<string, unknown>;
        const url =
          typeof n.url === 'string'
            ? n.url
            : typeof fields.url === 'string'
              ? (fields.url as string)
              : typeof fields.doc === 'string'
                ? `/${fields.doc}`
                : '#';
        const newTab =
          typeof fields.newTab === 'boolean' ? fields.newTab : true;
        const escapedUrl = this.escapeHtml(url);
        const target = newTab ? ' target="_blank"' : '';
        const rel = newTab ? ' rel="noopener noreferrer"' : '';
        return `<a href="${escapedUrl}"${target}${rel}>${children}</a>`;
      }

      case 'upload': {
        // Expect `value` to be a populated media doc (cms hook populates
        // upload IDs before posting). If it arrives as a raw id we skip
        // gracefully rather than breaking the HTML.
        const value = n.value;
        if (!value || typeof value !== 'object') return '';
        const v = value as Record<string, unknown>;
        const url = this.resolveMediaUrl(v);
        if (!url) return '';
        const alt = typeof v.alt === 'string' ? v.alt : '';
        const width = typeof v.width === 'number' ? ` width="${v.width}"` : '';
        const height =
          typeof v.height === 'number' ? ` height="${v.height}"` : '';
        return `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(alt)}"${width}${height} loading="lazy" />`;
      }

      case 'text': {
        const text =
          typeof n.text === 'string' ? this.escapeHtml(n.text) : '';
        if (!text) return '';
        const fmt = typeof n.format === 'number' ? n.format : 0;
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
    if (typeof format !== 'string' || !format) return '';
    switch (format) {
      case 'center':
        return 'text-align:center';
      case 'right':
      case 'end':
        return 'text-align:right';
      case 'justify':
        return 'text-align:justify';
      case 'left':
      case 'start':
        return 'text-align:left';
      default:
        return '';
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
