import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [
    // Auto-load .env everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM: use migrations (no schema guessing)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,

        // ✅ Migrations (dev convenience: run on boot if present)
        migrationsRun: true,
        // Looks for compiled migrations at: dist/apps/portfolio-service/migrations/*.js
        migrations: [join(__dirname, '..', 'migrations', '*.js')],

        // 🚫 Stop auto-syncing tables; rely on migrations instead
        synchronize: false,

        // Nice-to-have resilience
        retryAttempts: 10,
        retryDelay: 2000,
        // logging: ['error'], // uncomment if you want migration logs only
      }),
    }),

    PortfolioModule,
  ],
  controllers: [
    // other controllers...
    MediaController,
  ],
  providers: [
    // other providers...
    MediaService,
  ],
})
export class AppModule {}
