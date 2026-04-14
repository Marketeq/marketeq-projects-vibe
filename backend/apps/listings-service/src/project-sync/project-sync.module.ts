import { Module } from '@nestjs/common';
import { ProjectSyncController } from './project-sync.controller';
import { ProjectSyncService } from './project-sync.service';

@Module({
  controllers: [ProjectSyncController],
  providers: [ProjectSyncService],
  exports: [ProjectSyncService],
})
export class ProjectSyncModule {}
