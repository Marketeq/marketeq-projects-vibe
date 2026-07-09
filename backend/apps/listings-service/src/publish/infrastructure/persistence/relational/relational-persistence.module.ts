import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectEntity } from './entities/project.entity';
import { ProjectRelationalRepository } from './repositories/project.repository';
import { ProjectRepository } from '../project.repository';
import { MediaEntity } from './entities/media.entity';
import { MediaRepository } from '../media.repository';
import { MediaRelationalRepository } from './repositories/media.repository';
import { PhaseEntity } from './entities/phase.entity';
import { TaskEntity } from './entities/task.entity';
import { PhaseRepository } from '../phase.repository';
import { PhaseRelationalRepository } from './repositories/phase.repository';
import { TaskRepository } from '../task.repository';
import { TaskRelationalRepository } from './repositories/task.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      MediaEntity,
      PhaseEntity,
      TaskEntity,
    ]),
  ],
  providers: [
    {
      provide: ProjectRepository,
      useClass: ProjectRelationalRepository,
    },
    {
      provide: MediaRepository,
      useClass: MediaRelationalRepository,
    },
    {
      provide: PhaseRepository,
      useClass: PhaseRelationalRepository,
    },
    {
      provide: TaskRepository,
      useClass: TaskRelationalRepository,
    },
  ],
  exports: [
    ProjectRepository,
    MediaRepository,
    PhaseRepository,
    TaskRepository,
  ],
})
export class RelationalProjectPersistenceModule {}
