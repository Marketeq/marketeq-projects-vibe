import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        synchronize: config.get<string>('CONTRACTS_DATABASE_SYNCHRONIZE') === 'true',
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    // Register your entities with TypeORM
    TypeOrmModule.forFeature([Contract, ContractGroup, ContractAudit]),
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
    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
