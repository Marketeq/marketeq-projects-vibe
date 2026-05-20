import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BlogPost } from './entities/blog-post.entity';

const BOOT_DELAY_MS = 5_000;
const PAGE_SIZE = 50;
const PAGE_DELAY_MS = 200;

@Injectable()
export class BlogBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BlogBackfillService.name);

  constructor(
    @InjectRepository(BlogPost)
    private readonly blogRepo: Repository<BlogPost>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await this.backfillBlogPosts();
  }

  private async backfillBlogPosts(): Promise<void> {
    const cmsUrl = this.config.get<string>('CMS_SERVICE_URL') ?? 'http://localhost:3020';
    let page = 1;
    let totalSynced = 0;
    let totalFailed = 0;

    try {
      // Check table is ready before starting
      await this.blogRepo.count();
    } catch (err: any) {
      this.logger.warn(`[BlogBackfill] Table not ready — skipping: ${err.message}`);
      return;
    }

    try {
      while (true) {
        const res = await fetch(
          `${cmsUrl}/api/blog-posts?limit=${PAGE_SIZE}&page=${page}&depth=1`,
        );
        if (!res.ok) {
          this.logger.warn(`[BlogBackfill] CMS returned ${res.status} — stopping`);
          break;
        }
        const data = (await res.json()) as any;
        const docs: any[] = data?.docs ?? [];
        if (docs.length === 0) break;

        for (const doc of docs) {
          try {
            await this.upsert(doc);
            totalSynced++;
          } catch (err: any) {
            totalFailed++;
            this.logger.error(`[BlogBackfill] Failed for "${doc.slug}": ${err.message}`);
          }
        }

        if (!data.hasNextPage) break;
        page++;
        await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
      }
      this.logger.log(`[BlogBackfill] Done — synced: ${totalSynced}, failed: ${totalFailed}`);
    } catch (err: any) {
      this.logger.warn(`[BlogBackfill] CMS unreachable — skipping: ${err.message}`);
    }
  }

  private async upsert(doc: any): Promise<void> {
    const existing = await this.blogRepo.findOne({ where: { payloadId: doc.id } });
    const payload = {
      payloadId: doc.id,
      slug: doc.slug,
      title: doc.title,
      body: doc.body ?? null,
      authorId: typeof doc.author === 'object' ? doc.author?.id : (doc.author ?? null),
      coverImageUrl: typeof doc.coverImage === 'object' ? (doc.coverImage?.url ?? null) : (doc.coverImage ?? null),
      status: doc.status ?? 'draft',
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : undefined,
    };
    if (existing) {
      await this.blogRepo.update(existing.id, payload);
    } else {
      await this.blogRepo.save(this.blogRepo.create(payload as any));
    }
  }
}
