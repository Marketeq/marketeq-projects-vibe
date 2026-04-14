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
           "createdBy", "createdAt", "updatedAt"
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7::text[], $8::text[], $9::text[], $10::text[],
           $11::text[], $12::text[],
           $13::text[], $14, $15::text[], $16::jsonb,
           $17, $18, $19, $20, $21::listing_status_enum,
           $22, NOW(), NOW()
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
          'cms-sync',
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
         deliverables = $15::text[],
         faqs = $16::jsonb,
         "estimatedHours" = $17,
         budget = $18,
         duration = $19,
         featured = $20,
         status = $21::listing_status_enum,
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

    const description = this.serializeRichText(dto.fullDescription) ?? dto.shortDescription ?? '';
    const deliverables = this.richTextToBullets(dto.deliverables);
    const faqs = (dto.faqQuestions ?? []).map((f) => ({ question: f.question, answer: f.answer }));

    const duration = dto.timelineValue && dto.timelineUnit
      ? `${dto.timelineValue} ${dto.timelineUnit}`
      : null;
    const budget = dto.priceRangeMin ?? null;

    const status = this.resolveStatus(dto);

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
      mediaUrls,
      videoUrl,
      deliverables,
      faqs: JSON.stringify(faqs),
      estimatedHours: dto.totalEstimatedHours ?? null,
      budget,
      duration,
      featured: dto.featured ?? false,
      status,
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

  private richTextToBullets(value: unknown): string[] {
    if (!value) return [];
    const text = this.serializeRichText(value);
    if (!text) return [];
    return text
      .split(/\r?\n+/)
      .map((line) => line.replace(/^[-*•\s]+/, '').trim())
      .filter(Boolean);
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
}
