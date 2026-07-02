import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ListingsController } from './listings/listings.controller';
import { AppController } from './app.controller';
import { ProjectSyncModule } from './project-sync/project-sync.module';
import { RelationalProjectPersistenceModule } from './publish/infrastructure/persistence/relational/relational-persistence.module';
import { PublishModule } from './publish/publish.module';
import { OwnerTargetGrpcModule } from './owner-target/owner-target.module';
import { JobListingModule } from './job-listing/job-listing.module';
import { ProjectsModule } from './projects/projects.module';
import { TeamsModule } from './teams/team.module';
import { ServicesModule } from './services/service.module';
import { MediaModule } from './media/media.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { CmsBackfillModule } from './cms-backfill/cms-backfill.module';
import { JobsModule } from './jobs/job.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'apps/listings-service/.env',
        'backend/apps/listings-service/.env',
        '../../.env',
        'backend/.env',
        '.env',
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'listings',
      ssl: false,
      autoLoadEntities: true,
      synchronize: process.env.LISTINGS_DATABASE_SYNCHRONIZE === 'true',
    }),
    RelationalProjectPersistenceModule,
    PublishModule,
    ProjectSyncModule,
    OwnerTargetGrpcModule,
    ProjectsModule,
    // Job listing feature module — registers all entities, services, and controllers.
    // ClientsModule (RABBITMQ_CLIENT) is registered inside JobListingModule.
    JobListingModule,
    TeamsModule,
    ServicesModule,
    MediaModule,
    TestimonialsModule,
    CmsBackfillModule,
    JobsModule,
  ],
  controllers: [AppController, ListingsController],
  providers: [],
})
export class AppModule {}
