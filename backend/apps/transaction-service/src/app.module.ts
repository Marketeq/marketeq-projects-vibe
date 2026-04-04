import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

import { validate } from './config/transaction.config';
import { JwtStrategy } from './strategies/jwt.strategy';

// Entities
import { Transaction } from './entities/transaction.entity';
import { Invoice } from './entities/invoice.entity';
import { TransactionDetail } from './entities/transaction-detail.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Contract } from './entities/contract.entity';
import { AuditLog } from './entities/audit-log.entity';

// Feature modules
import { HealthModule } from './modules/health.module';
import { TransactionModule } from './modules/transaction.module';
import { InvoiceModule } from './modules/invoice.module';
import { ExportModule } from './modules/export.module';
import { AuditModule } from './modules/audit.module';
import { ShareModule } from './modules/share.module';

// Shared RabbitMQ module — makes AmqpConnection available globally
@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [
          { name: 'marketeq.billing',      type: 'topic' },
          { name: 'marketeq.timetracking', type: 'topic' },
          { name: 'marketeq.payout',       type: 'topic' },
          { name: 'marketeq.transactions', type: 'topic' },
        ],
        uri: config.get<string>('RABBITMQ_URL'),
        connectionInitOptions: { wait: true },
        defaultRpcErrorHandler: (channel: any, msg: any, _err: any) => {
          channel.nack(msg, false, false);
        },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
class RabbitMQCoreModule {}

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // ── Scheduler (cron jobs) ──────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Event Emitter ──────────────────────────────────────────────────
    EventEmitterModule.forRoot(),

    // ── Authentication ─────────────────────────────────────────────────
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ── RabbitMQ (global) ──────────────────────────────────────────────
    RabbitMQCoreModule,

    // ── Database ───────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        url:         config.get<string>('DATABASE_URL'),
        schema:      config.get<string>('SUPABASE_SCHEMA') ?? 'transaction_service',
        entities: [
          Transaction,
          Invoice,
          TransactionDetail,
          PaymentMethod,
          Contract,
          AuditLog,
        ],
        synchronize: false,
        logging:     config.get<string>('NODE_ENV') !== 'production',
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // ── Feature Modules ────────────────────────────────────────────────
    HealthModule,
    AuditModule,
    TransactionModule,
    InvoiceModule,
    ExportModule,
    ShareModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}