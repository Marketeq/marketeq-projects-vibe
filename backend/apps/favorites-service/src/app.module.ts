import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AiModule } from './ai/ai.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-store';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './types/deps.d';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/favorites-service/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Permanent guardrail: schema changes must go through migrations.
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (cfg: ConfigService) => {
        const redisUrl = cfg.get<string>('REDIS_URL');
        if (!redisUrl) {
          return {
            ttl: 30000,
          };
        }
        return {
          store: await redisStore({
            url: redisUrl,
          }),
          ttl: 30000,
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => [
        {
          ttl: Number(cfg.get<string>('THROTTLE_TTL') || 60) * 1000,
          limit: Number(cfg.get<string>('THROTTLE_LIMIT') || 20),
        },
      ],
      inject: [ConfigService],
    }),
    FavoritesModule,
    AiModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
