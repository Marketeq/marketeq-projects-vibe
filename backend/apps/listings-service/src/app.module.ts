import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ListingsController } from './listings/listings.controller';
import { AppController } from './app.controller';
import { ProjectService } from './listings/project.service';
import { ProjectSyncModule } from './project-sync/project-sync.module';
import { RelationalProjectPersistenceModule } from './publish/infrastructure/persistence/relational/relational-persistence.module';
import { PublishModule } from './publish/publish.module';
import { OwnerTargetGrpcModule } from './owner-target/owner-target.module';
import { JobListingModule } from './job-listing/job-listing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/listings-service/.env', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: false,
      autoLoadEntities: true,
      // TODO: set back to false before merging — local dev only.
      synchronize: true,
    }),
    RelationalProjectPersistenceModule,
    PublishModule,
    ProjectSyncModule,
    OwnerTargetGrpcModule,
    // Job listing feature module — registers all entities, services, and controllers.
    // ClientsModule (RABBITMQ_CLIENT) is registered inside JobListingModule.
    JobListingModule,
  ],
  controllers: [AppController, ListingsController],
  providers: [ProjectService],
})
export class AppModule {}
