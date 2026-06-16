import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { PayoutRequest } from './entities/payout-request.entity';
import { DepositMethod } from './entities/deposit-method.entity';
import { PayoutSchedule } from './entities/payout-schedule.entity';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { MagicLinkVerification } from './entities/magic-link-verification.entity';
import { DepositMethodVerification } from './entities/deposit-method-verification.entity';
import { PayoutAuditLog } from './entities/payout-audit-log.entity';
import { FirstPayoutHold } from './entities/first-payout-hold.entity';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { CommonModule } from './common/common.module';
import { PayoutModule } from './payout/payout.module';
import { MethodsModule } from './methods/methods.module';
import { ScheduleConfigModule } from './schedule/schedule.module';
import { ProvidersModule } from './providers/providers.module';
import { MagicLinkModule } from './magic-link/magic-link.module';
import { ConsumersModule } from './consumers/consumers.module';
import { PublishersModule } from './publishers/publishers.module';
import { MetricsModule } from './metrics/metrics.module';
import { OAuthModule } from './oauth/oauth.module';
import { CryptoModule } from './crypto/crypto.module';
import { ExecutionModule } from './execution/execution.module';
import { CardModule } from './card/card.module';
import { KycModule } from './kyc/kyc.module';
import { PauseModule } from './pause/pause.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/payout-service/.env', '.env'],
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
      entities: [
        PayoutRequest,
        DepositMethod,
        PayoutSchedule,
        MagicLinkToken,
        MagicLinkVerification,
        DepositMethodVerification,
        PayoutAuditLog,
        FirstPayoutHold,
      ],
      synchronize: false,
      logging: false,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    ScheduleModule.forRoot(),

    DatabaseModule,
    CommonModule,
    AuditModule,
    PayoutModule,
    MethodsModule,
    ScheduleConfigModule,
    ProvidersModule,
    MagicLinkModule,
    ConsumersModule,
    PublishersModule,
    MetricsModule,
    OAuthModule,
    CryptoModule,
    ExecutionModule,
    CardModule,
    KycModule,
    PauseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
