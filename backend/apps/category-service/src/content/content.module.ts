// apps/category-sync-service/src/content/content.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ContentService } from './content.service';
import { CategoryPageEntity } from '../app/entities/category-page.entity';
import { CategoryPageConsumer } from '../consumers/category-page.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryPageEntity]), ConfigModule],
  controllers: [CategoryPageConsumer],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
