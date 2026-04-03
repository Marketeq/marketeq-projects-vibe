// apps/category-sync-service/src/content/content.module.ts
import { Module } from '@nestjs/common';
import { ContentService } from './content.service';

@Module({
  providers: [ContentService],
  exports: [ContentService], // <-- so CategoryModule can inject it
})
export class ContentModule {}
