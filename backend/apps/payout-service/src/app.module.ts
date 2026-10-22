import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

import { PayoutRequest } from './entities/payout-request.entity';
import { DepositMethod } from './entities/deposit-method.entity';
import { PayoutSchedule } from './entities/payout-schedule.entity';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { MagicLinkVerification } from './entities/magic-link-verification.entity';
import { DepositMethodVerification } from './entities/deposit-method-verification.entity';
import { PayoutAuditLog } from './entities/payout-audit-log.entity';
import { FirstPayoutHold } from './entities/first-payout-hold.entity';
import { EncryptionKeyRotation } from './entities/encryption-key-rotation.entity';
import { KeyRotationRecorderService } from './crypto/key-rotation-recorder.service';

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
import { BankModule } from './bank/bank.module';
import { KycModule } from './kyc/kyc.module';
import { PauseModule } from './pause/pause.module';

// Real topic-exchange pub/sub — separate from publishers/payout.publisher.ts's
// point-to-point send() straight into earnings-service's own queue, which
// stays as-is. marketeq.payout already exists — declared and consumed by
// transaction-service (apps/transaction-service/src/consumers/payout.consumer.ts,
// routing keys payout.initiated/payout.completed/payout.failed) — payout-service
// itself never published onto it. marketeq.identity is declared ahead of
// identity-service actually publishing anything (PS-35) so the exchange
// exists for payout-service's consumer bindings to attach to; consumers
// bound to routing keys nothing publishes yet simply never fire.
//
// Must be imported directly here, at the top level — NOT nested inside a
// custom wrapper module's own `imports` array. golevelup's forRoot() uses a
// static RxJS Subject internally (the "ConfigurableDynamicRootModule"
// pattern) to broadcast its config to every module that references
// RabbitMQModule directly; nesting the DynamicModule one level down (an
// earlier version of this wired it through a @Global() RabbitMQCoreModule
// wrapper, copying apps/transaction-service/src/app.module.ts's pattern)
// silently breaks that — the module resolves in the DI graph and logs
// "dependencies initialized", but AmqpConnection.init() never actually
// runs: confirmed live, no exchange ever appeared in the broker, and none
// of AmqpConnection's own connection-lifecycle log lines fired either.
const rabbitmqUrl = process.env.RABBITMQ_URL;
const rabbitMQImports = rabbitmqUrl
  ? [
      RabbitMQModule.forRoot(RabbitMQModule, {
        exchanges: [
          { name: 'marketeq.payout', type: 'topic' },
          { name: 'marketeq.identity', type: 'topic' },
        ],
        uri: rabbitmqUrl,
        connectionInitOptions: { wait: true },
        defaultRpcErrorHandler: (channel: any, msg: any, _err: any) => {
          channel.nack(msg, false, false);
        },
      }),
    ]
  : [];

@Module({
  imports: [
    ...rabbitMQImports,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/payout-service/.env', '.env'],
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl:
        (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true'
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
        EncryptionKeyRotation,
      ],
      synchronize: false,
      logging: false,
    }),

    ...(process.env.REDIS_URL
      ? [BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            url: config.get('REDIS_URL'),
          }),
        })]
      : []),

    TypeOrmModule.forFeature([EncryptionKeyRotation]),
    ScheduleModule.forRoot(),

    DatabaseModule,
    CommonModule,
    AuditModule,
    // ScheduleConfigModule's literal `v1/payouts/schedule` route must register before
    // PayoutModule's `v1/payouts/:id` — Express matches routes in registration order,
    // so :id would otherwise shadow it and try (and fail) to parse "schedule" as a UUID.
    ScheduleConfigModule,
    PayoutModule,
    MethodsModule,
    ProvidersModule,
    MagicLinkModule,
    ConsumersModule,
    PublishersModule,
    MetricsModule,
    OAuthModule,
    CryptoModule,
    ExecutionModule,
    CardModule,
    BankModule,
    KycModule,
    PauseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // AC-1.3.3: records which encryption key is current for each ring and
    // when it changed. Writes at most one row per key per ring, at startup.
    KeyRotationRecorderService,
  ],
})
export class AppModule {}
