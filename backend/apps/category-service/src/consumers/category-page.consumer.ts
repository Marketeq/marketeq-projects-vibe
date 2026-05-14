import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { ContentService } from '../content/content.service';

function levelToInt(level: any): number {
  if (typeof level === 'number') return level;
  const map: Record<string, number> = { l1: 1, l2: 2, l3: 3 };
  return map[String(level).toLowerCase()] ?? 0;
}

@Controller()
export class CategoryPageConsumer {
  private readonly logger = new Logger(CategoryPageConsumer.name);

  constructor(private readonly contentService: ContentService) {}

  @EventPattern('category-page.saved')
  async onCategoryPageSaved(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received category-page.saved for path: ${data.path}`);
      await this.contentService.upsertCategoryPage({
        ...(data.categoryId ? { categoryUuid: data.categoryId } : {}),
        path: data.path,
        displayTitle: data.displayTitle,
        level: levelToInt(data.level),
        heroBanner: data.heroBanner,
        intro: data.intro,
        faq: data.faq,
        featured: data.featured,
      });
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to handle category-page.saved: ${err.message}`);
      channel.nack(message, false, true);
    }
  }

  @EventPattern('category-page.deleted')
  async onCategoryPageDeleted(
    @Payload() data: { path: string },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received category-page.deleted for path: ${data.path}`);
      await this.contentService.deleteCategoryPageByPath(data.path);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to handle category-page.deleted: ${err.message}`);
      channel.nack(message, false, true);
    }
  }
}
