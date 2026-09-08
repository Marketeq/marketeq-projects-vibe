import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// ── Entities ────────────────────────────────────────────────────────────────
import { JobListing } from './entities/job-listing.entity';
import { JobListingPhase } from './entities/job-listing-phase.entity';
import { JobListingTask } from './entities/job-listing-task.entity';
import { TeamMemberRow } from './entities/job-listing-role-row.entity';
import { RoleDescription } from './entities/job-listing-role-description.entity';
import { BasicInformation } from './entities/job-listing-basic-info.entity';

// ── Controllers ─────────────────────────────────────────────────────────────
import { JobListingController } from './controllers/job-listing.controller';
import { JobListingPhaseController } from './controllers/job-listing-phase.controller';
import { JobListingInternalController } from './controllers/job-listing-internal.controller';
import { JobListingEventsConsumer } from './events/job-listing-events.consumer';

// ── Services ─────────────────────────────────────────────────────────────────
import { JobListingService } from './services/job-listing.service';
import { JobListingPhaseService } from './services/job-listing-phase.service';
import { JobListingScopeService } from './services/job-listing-scope.service';
import { JobListingBudgetService } from './services/job-listing-budget.service';
import { JobListingAiService } from './services/job-listing-ai.service';
import { JobListingDraftService } from './services/job-listing-draft.service';
import { JobListingPublishService } from './services/job-listing-publish.service';
import { JobListingInviteService } from './services/job-listing-invite.service';
import { JobListingBriefStorageService } from './services/job-listing-brief-storage.service';
import { JobListingCmsSyncService } from './services/job-listing-cms-sync.service';

// ── Events ───────────────────────────────────────────────────────────────────
import { JobListingEventsPublisher } from './events/job-listing-events.publisher';

// ── Guards ───────────────────────────────────────────────────────────────────
import { JobListingOwnerGuard } from './guards/job-listing-owner.guard';

// ── External ─────────────────────────────────────────────────────────────────
import { AlgoliaService } from '../algolia/algolia.service';

@Module({
  imports: [
    // Required for @Cron() decorators used in JobListingDraftService.
    ScheduleModule.forRoot(),

    // Registers all job-listing entities so their TypeORM repositories
    // can be injected via @InjectRepository() in any service in this module.
    TypeOrmModule.forFeature([
      JobListing,
      JobListingPhase,
      JobListingTask,
      TeamMemberRow,
      RoleDescription,
      BasicInformation,
    ]),

    // HttpModule is needed by:
    //   - JobListingBudgetService  (pricing-service rate lookup)
    //   - JobListingScopeService   (contracts-service inherited scope)
    //   - JobListingAiService      (Groq API calls)
    //   - AlgoliaService           (algolia-service HTTP calls)
    HttpModule,

    // RabbitMQ client used by JobListingEventsPublisher to emit events.
    // Registered here (not in AppModule) so the RABBITMQ_CLIENT token
    // is available to this module's providers.
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls:         [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue:        'listings_queue',
            exchange:     'marketeq.listings',
            exchangeType: 'topic',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
      // Separate client for user-facing notifications. It has to be its own
      // registration rather than a second use of RABBITMQ_CLIENT above: that
      // one targets the listings topic exchange, and notification-service
      // consumes a plain durable queue. This mirrors how invitations-service
      // reaches notifications, which is the only wiring in the repo that
      // currently works.
      {
        name: 'NOTIFICATIONS_CLIENT',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls:         [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue:        'notification_service_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],

  controllers: [
    JobListingController,
    JobListingPhaseController,
    JobListingInternalController,
    // JobListingEventsConsumer is a @Controller() used for RabbitMQ event patterns.
    JobListingEventsConsumer,
  ],

  providers: [
    // Core CRUD and wizard services
    JobListingService,
    JobListingPhaseService,
    JobListingScopeService,
    JobListingBudgetService,
    JobListingAiService,

    // Job listing workflow services
    JobListingDraftService,
    JobListingPublishService,
    JobListingInviteService,
    JobListingBriefStorageService,

    // Infrastructure
    JobListingCmsSyncService,
    JobListingEventsPublisher,
    AlgoliaService,

    // Guards registered as providers so NestJS DI can instantiate them
    JobListingOwnerGuard,
  ],
})
export class JobListingModule {}
