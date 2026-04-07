import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { CategoryService } from '../app/category.service';

interface CategorySavedEvent {
  event: 'category.saved';
  id: string;    // UUID from CMS Categories.uuid field
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  parent: string | null;  // parent UUID or null
  listingTypes: string[];
  sortOrder?: number;
  algoliaFacetOrder?: number;
}

interface CategoryDeletedEvent {
  event: 'category.deleted';
  id: string;    // UUID from CMS Categories.uuid field
  slug: string;
}

@Controller()
export class CategoryConsumer {
  private readonly logger = new Logger(CategoryConsumer.name);

  constructor(private readonly categoryService: CategoryService) {}

  @EventPattern('category.saved')
  async onCategorySaved(
    @Payload() event: CategorySavedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received category.saved for slug: ${event.slug}`);

      await this.categoryService.syncFromCms({
        uuid: event.id,
        name: event.name,
        slug: event.slug,
        approved: event.status === 'active',
        published_in_marketplace: event.status === 'active',
        parent: event.parent,
        tags: [],
      });

      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to process category.saved for ${event.slug}`, err);
      channel.nack(message, false, false);
    }
  }

  @EventPattern('category.deleted')
  async onCategoryDeleted(
    @Payload() event: CategoryDeletedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received category.deleted for slug: ${event.slug}`);
      await this.categoryService.deleteCategory(event.id);
      channel.ack(message);
    } catch (err: any) {
      if (err?.message?.includes('not found')) {
        this.logger.warn(`Category already deleted: ${event.slug}`);
        channel.ack(message);
      } else {
        this.logger.error(`Failed to process category.deleted for ${event.slug}`, err);
        channel.nack(message, false, false);
      }
    }
  }
}
