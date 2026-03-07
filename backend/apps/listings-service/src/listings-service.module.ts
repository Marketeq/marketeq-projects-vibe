import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from './projects/projects.module';
import { ServicesModule } from './services/service.module';
import { JobsModule } from './jobs/job.module';
import { TeamsModule } from './teams/team.module';
import { MediaModule } from './media/media.module';
import { Project } from './projects/entities/project.entity';
import { Service } from './services/entities/service.entity';
import { Job } from './jobs/entities/job.entity';
import { Team } from './teams/entities/team.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'listings',
      entities: [Project, Service, Job, Team],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    ProjectsModule,
    ServicesModule,
    JobsModule,
    TeamsModule,
    MediaModule,
  ],
})
export class ListingsServiceModule {}
