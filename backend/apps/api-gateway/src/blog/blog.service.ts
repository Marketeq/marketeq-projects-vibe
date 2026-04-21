import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BlogPostDetail, BlogPostListItem, BlogPostListResponse } from './blog.types';

type PayloadListResponse<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  private readonly cmsUrl: string | null;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.cmsUrl = config.get<string>('CMS_SERVICE_URL') || null;
  }

  async listPosts(opts: {
    page: number;
    limit: number;
    categorySlug?: string;
  }): Promise<BlogPostListResponse> {
    if (!this.cmsUrl) {
      throw new ServiceUnavailableException('CMS_SERVICE_URL is not configured');
    }

    const { page, limit } = opts;
    const categorySlug =
      typeof opts.categorySlug === 'string' ? opts.categorySlug.trim() : '';

    const categoryId = categorySlug
      ? await this.resolveCategoryIdBySlug(categorySlug)
      : null;

    const params: Record<string, string | number> = {
      page,
      limit,
      depth: 1,
      sort: '-publishedAt',
      'where[status][equals]': 'published',
    };
    if (categoryId) {
      params['where[category][equals]'] = categoryId;
    }

    const data = await this.queryCms<PayloadListResponse<any>>('/api/blog-posts', params);

    return {
      items: (data.docs ?? []).map((d: any) => this.toListItem(d)),
      pagination: {
        page: data.page ?? page,
        limit: data.limit ?? limit,
        totalDocs: data.totalDocs ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNextPage: Boolean(data.hasNextPage),
        hasPrevPage: Boolean(data.hasPrevPage),
      },
    };
  }

  async getPostBySlug(slug: string): Promise<BlogPostDetail> {
    if (!this.cmsUrl) {
      throw new ServiceUnavailableException('CMS_SERVICE_URL is not configured');
    }

    const normalized = (slug || '').trim();
    if (!normalized) throw new NotFoundException('Blog post not found');

    const params: Record<string, string | number> = {
      page: 1,
      limit: 1,
      depth: 2,
      sort: '-publishedAt',
      'where[status][equals]': 'published',
      'where[slug][equals]': normalized,
    };

    const data = await this.queryCms<PayloadListResponse<any>>('/api/blog-posts', params);
    const doc = data.docs?.[0];
    if (!doc) throw new NotFoundException('Blog post not found');

    return this.toDetail(doc);
  }

  private async queryCms<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const base = this.cmsUrl!.replace(/\/+$/, '');
    const url = `${base}${path}`;
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params,
          timeout: 5000,
          headers: { Accept: 'application/json' },
        }),
      );
      return data as T;
    } catch (err: any) {
      this.logger.warn(`CMS blog fetch failed (${url}): ${err?.message ?? err}`);
      throw new ServiceUnavailableException('CMS is unavailable');
    }
  }

  private async resolveCategoryIdBySlug(slug: string): Promise<string | null> {
    const normalized = slug.trim();
    if (!normalized) return null;

    try {
      const data = await this.queryCms<PayloadListResponse<any>>('/api/categories', {
        page: 1,
        limit: 1,
        depth: 0,
        'where[slug][equals]': normalized,
      });
      const doc = data.docs?.[0];
      if (!doc?.id) return null;
      return String(doc.id);
    } catch (err: any) {
      // CMS might block categories read depending on access; treat as no filter.
      this.logger.warn(`resolveCategoryIdBySlug failed (${normalized}): ${err?.message ?? err}`);
      return null;
    }
  }

  private toListItem(doc: any): BlogPostListItem {
    const id = String(doc?.id ?? '');
    const slug = typeof doc?.slug === 'string' ? doc.slug : '';
    const title = typeof doc?.title === 'string' ? doc.title : '';
    const publishedAt =
      typeof doc?.publishedAt === 'string' ? doc.publishedAt : null;

    const coverImageUrl = this.resolveMediaUrl(doc?.coverImage);
    const authorName =
      typeof doc?.author === 'object'
        ? (doc.author?.name ?? doc.author?.email ?? null)
        : null;

    const categoryName =
      typeof doc?.category === 'object'
        ? (doc.category?.name ?? doc.category?.title ?? null)
        : null;

    const tags: string[] = Array.isArray(doc?.tags)
      ? doc.tags
          .map((t: any) => (typeof t?.tag === 'string' ? t.tag.trim() : ''))
          .filter(Boolean)
      : [];

    const bodyText = this.toBodyText(doc?.body);
    const excerpt = bodyText ? this.toExcerptFromText(bodyText) : null;
    const readTimeMinutes = bodyText ? this.estimateReadTimeMinutesFromText(bodyText) : null;

    return {
      id,
      slug,
      title,
      publishedAt,
      coverImageUrl,
      authorName,
      categoryName,
      tags,
      excerpt,
      readTimeMinutes,
    };
  }

  private toDetail(doc: any): BlogPostDetail {
    return {
      ...this.toListItem(doc),
      body: doc?.body ?? null,
    };
  }

  private resolveMediaUrl(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null;
    if (typeof value !== 'object') return null;
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    if (url) {
      // Payload often returns a local mount like `/cms-media/<file>`.
      // Frontend exposes media as same-origin `/media/<file>` via rewrites.
      if (url.startsWith('/cms-media/')) return url.replace(/^\/cms-media\//, '/media/');
      return url;
    }
    const filename = typeof value.filename === 'string' ? value.filename.trim() : '';
    if (filename) return `/media/${filename}`;
    return null;
  }

  private toBodyText(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return this.stripHtml(value).trim();
    if (typeof value !== 'object') return '';

    const root = (value as any).root ?? value;
    return this.collectLexicalText(root, 0).trim().replace(/\s+/g, ' ');
  }

  private collectLexicalText(node: any, depth: number): string {
    if (!node || depth > 50) return '';
    if (typeof node === 'string') return node;
    if (typeof node !== 'object') return '';

    let out = '';

    if (typeof node.text === 'string') out += node.text;

    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      const childText = this.collectLexicalText(child, depth + 1);
      if (!childText) continue;
      if (out && !out.endsWith(' ') && !childText.startsWith(' ')) out += ' ';
      out += childText;
    }

    return out;
  }

  private toExcerptFromText(text: string, maxLen = 180): string {
    const normalized = String(text).trim().replace(/\s+/g, ' ');
    if (!normalized) return '';
    if (normalized.length <= maxLen) return normalized;
    return normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
  }

  private estimateReadTimeMinutesFromText(text: string): number {
    const normalized = String(text).trim();
    if (!normalized) return 1;
    const words = normalized.split(/\s+/).filter(Boolean).length;
    const wpm = 200;
    return Math.max(1, Math.round(words / wpm));
  }

  private stripHtml(html: string): string {
    return String(html)
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

