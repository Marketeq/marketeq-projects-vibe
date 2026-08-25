import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';

import { NdaModule } from './nda/nda.module';
import { LegalDocumentsModule } from './legal-documents/legal-documents.module';
import { AcceptanceModule } from './acceptance/acceptance.module';
import { OutboxModule } from './outbox/outbox.module';
import { AdminModule } from './admin/admin.module';
import { DataRetentionModule } from './data-retention/data-retention.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/legal-service/.env', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: false, // port 5433 = Supabase PgBouncer pooler — SSL not supported on this port
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),

    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: 10_000,
        maxRedirects: 3,
        baseURL: config.get<string>('USER_SERVICE_URL'),
      }),
    }),

    NdaModule,
    LegalDocumentsModule,
    AcceptanceModule,
    OutboxModule,
    AdminModule,
    DataRetentionModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
