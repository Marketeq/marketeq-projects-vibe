import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';

// Import your actual controllers
import { AppController } from './app.controller';
import { ContractsController } from './controllers/contracts.controller';
import { GroupsController } from './controllers/groups.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { HealthController } from './controllers/health.controller';

// Import your actual services
import { ContractsService } from './services/contracts.service';
import { GroupsService } from './services/groups.service';
import { WebhooksService } from './services/webhooks.service';
import { BillingClient } from './services/billing.client';
import { ReviewsClient } from './services/reviews.client';
import { NotificationsClient } from './services/notifications.client';
import { AuditLoggerService } from './services/audit-logger.service';
import { TalentNetworkService } from './services/talent-network.service';
import { UserServiceClient } from './services/user-service.client';
import { ContractOwnerGuard } from './guards/contract-owner.guard';
import { OfferAcceptedSubscriber } from './subscribers/offer-accepted.subscriber';
import { ContractPartiesResponder } from './subscribers/contract-parties.responder';

// Import your entities
import { Contract } from './entities/contract.entity';
import { ContractGroup } from './entities/contract-group.entity';
import { ContractAudit } from './entities/audit.entity';
// Import your middleware
import { JwtAuthGuard } from './middleware/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: (config.get('DATABASE_SSL_ENABLED') ?? 'false').toLowerCase() === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    // Register your entities with TypeORM
    TypeOrmModule.forFeature([Contract, ContractGroup, ContractAudit]),
    HttpModule,
  ],
  controllers: [
    AppController,
    ContractsController,
    GroupsController,
    WebhooksController,
    HealthController,
  ],
  providers: [
    // Your services
    ContractsService,
    GroupsService,
    WebhooksService,
    BillingClient,
    ReviewsClient,
    NotificationsClient,
    AuditLoggerService,
    TalentNetworkService,
    UserServiceClient,
    ContractOwnerGuard,
    // OS-07: creates contracts from offer.accepted / offer.counter_accepted
    OfferAcceptedSubscriber,
    // Answers contracts.parties.rpc so other services can check who is the
    // client/talent on a contract without reading this schema.
    ContractPartiesResponder,
    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
