import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

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

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryEntity, TagEntity]),
    HttpModule,
    ContentModule,
  ],
  providers: [CategoryService, TagService, CronSyncService],
  controllers: [CategoryController, TagsController, TaxGroupsController, CategoryConsumer],
  exports: [CategoryService, TagService],
})
export class CategoryModule {}