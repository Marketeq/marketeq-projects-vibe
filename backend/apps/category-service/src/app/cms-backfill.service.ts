import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CategoryEventPublisher } from './category-event.publisher';

const PAGE_SIZE = 50;
const BOOT_DELAY_MS = 5_000;
const PAGE_DELAY_MS = 300;

@Injectable()
export class CmsBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CmsBackfillService.name);

  constructor(
    @InjectRepository(CategoryEntity) private readonly categoryRepo: Repository<CategoryEntity>,
    private readonly publisher: CategoryEventPublisher,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('CMS_BACKFILL_ON_BOOT') === 'false') return;
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await this.run();
  }

  async run(): Promise<void> {
    const total = await this.categoryRepo.count();
    this.logger.log(`[CmsBackfill:categories] Starting — ${total} categories to sync`);

    let offset = 0;
    let published = 0;
    let failed = 0;

    while (offset < total) {
      const categories = await this.categoryRepo.find({
        relations: ['parent'],
        order: { id: 'ASC' },
        skip: offset,
        take: PAGE_SIZE,
      });

      for (const category of categories) {
        try {
          await this.publisher.publishCategoryUpdated(category);
          published++;
        } catch (err: any) {
          failed++;
          this.logger.error(`[CmsBackfill:categories] Failed for ${category.slug}: ${err.message}`);
        }
      }

      offset += PAGE_SIZE;
      if (offset < total) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }

    this.logger.log(`[CmsBackfill:categories] Done — published: ${published}, failed: ${failed}`);
  }
}
