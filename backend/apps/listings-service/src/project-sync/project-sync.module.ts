import { Module } from '@nestjs/common';
import { ProjectSyncController } from './project-sync.controller';
import { ProjectSyncService } from './project-sync.service';
import { RelationalProjectPersistenceModule } from '../publish/infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalProjectPersistenceModule],
  controllers: [ProjectSyncController],
  providers: [ProjectSyncService],
  exports: [ProjectSyncService],
})
export class ProjectSyncModule {}
