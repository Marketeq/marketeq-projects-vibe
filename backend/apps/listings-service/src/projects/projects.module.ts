import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectsController } from './projects.controller';
import { ProjectsInternalController } from './projects-internal.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { DELIVERABLES_ADAPTER } from '../project-sync/deliverables/deliverables.adapter';
import { DeliverablesAdapterHeuristic } from '../project-sync/deliverables/deliverables.adapter.heuristic';
import { DeliverablesAdapterHuggingFace } from '../project-sync/deliverables/deliverables.adapter.huggingface';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), ConfigModule],
  controllers: [ProjectsController, ProjectsInternalController],
  providers: [
    ProjectsService,
    DeliverablesAdapterHeuristic,
    DeliverablesAdapterHuggingFace,
    { provide: DELIVERABLES_ADAPTER, useExisting: DeliverablesAdapterHuggingFace },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
