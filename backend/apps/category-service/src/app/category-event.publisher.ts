import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class CategoryEventPublisher {
  private readonly logger = new Logger(CategoryEventPublisher.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  async publishCategoryUpdated(category: CategoryEntity): Promise<void> {
    const payload = {
      event: 'category.updated',
      sourceId: 'category-service',
      id: category.uuid,
      name: category.name,
      slug: category.slug,
      status: category.published_in_marketplace ? 'active' : 'inactive',
      description: category.seo_meta_description ?? '',
      parentId: category.parent?.uuid || null,
      seo_meta_title: category.seo_meta_title ?? null,
    };

    try {
      this.client.emit('category.updated', payload);
      this.logger.log(`Published category.updated for slug: ${category.slug}`);
    } catch (err) {
      this.logger.error(`Failed to publish category.updated for ${category.slug}`, err);
    }
  }
}
