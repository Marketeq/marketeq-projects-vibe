import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RatesModule } from './rates/rates.module';
import { BudgetModule } from './budget/budget.module';
import { CurrencyModule } from './currency/currency.module';
import { RedisModule } from './config/redis.module';
import { HealthController } from './health/health.controller';
import { PlatformRateAverage } from './rates/entities/platform-rate-average.entity';
import { CurrencyRate } from './currency/entities/currency-rate.entity';

@Module({
  imports: [
    // ── Global config ─────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Cron / scheduled jobs ─────────────────────────────────────
    // Enables @Cron decorators in RatesRefreshService and FxCacheService.
    ScheduleModule.forRoot(),

    // ── TypeORM — shared Supabase PostgreSQL ──────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [PlatformRateAverage, CurrencyRate],
        synchronize: false,
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // ── HTTP client — for FX API and transaction-service calls ─────
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => ({
        timeout: 10_000,
        maxRedirects: 3,
      }),
    }),

    // ── Shared Redis client ────────────────────────────────────────
    RedisModule,

    // ── Feature modules ────────────────────────────────────────────
    RatesModule,
    BudgetModule,
    CurrencyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
