import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TagService } from './tag.service';
import { TagsController } from './tags.controller';
import { CronSyncService } from './cron-sync-service';
import { ContentModule } from '../content/content.module';
import { TaxGroupsController } from './tax-groups.controller';
import { CategoryConsumer } from '../consumers/category.consumer';
import { CategoryEventPublisher } from './category-event.publisher';
import { CmsBackfillService } from './cms-backfill.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryEntity, TagEntity]),
    HttpModule,
    ContentModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'category_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [CategoryService, TagService, CronSyncService, CategoryEventPublisher, CmsBackfillService],
  controllers: [CategoryController, TagsController, TaxGroupsController, CategoryConsumer],
  exports: [CategoryService, TagService],
})
export class CategoryModule {}