import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { CategoryModule } from './category.module';
import { CategoryPagesModule } from './category-pages/category-pages.module';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { CategoryPageEntity } from './entities/category-page.entity';
import { ContentModule } from '../content/content.module';
// import { SupabaseModule } from '../supabase/supabase.module';

const envPaths = [
  resolve(process.cwd(), 'apps/category-service/.env'),
  resolve(process.cwd(), '.env'),
].filter((candidate) => existsSync(candidate));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envPaths,
    }),
    // SupabaseModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSSL = String(config.get('DATABASE_SSL_ENABLED')).toLowerCase() === 'true';
        const showQueries = String(config.get('DATABASE_LOG_QUERIES') ?? '0') === '1';
        const databaseUrl = config.get<string>('DATABASE_URL');

        const logging: ('query' | 'error' | 'warn' | 'schema' | 'migration')[] =
          showQueries ? ['error', 'warn', 'query'] : ['error', 'warn'];

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('DATABASE_HOST'),
                port: Number(config.get('DATABASE_PORT') ?? 5432),
                username: config.get<string>('DATABASE_USERNAME'),
                password: config.get<string>('DATABASE_PASSWORD'),
                database: config.get<string>('DATABASE_NAME'),
              }),

          entities: [CategoryEntity, TagEntity, CategoryPageEntity],
          autoLoadEntities: true,
          synchronize: config.get('NODE_ENV') === 'development' && String(config.get('DATABASE_SYNCHRONIZE')).toLowerCase() === 'true',

          ssl: useSSL ? { rejectUnauthorized: false } : false,
          extra: useSSL ? { ssl: { rejectUnauthorized: false } } : undefined,
          logging,
        };
      },
    }),

    ScheduleModule.forRoot(),
    ContentModule,
    CategoryModule,
    CategoryPagesModule,
  ],
})
export class AppModule {}
