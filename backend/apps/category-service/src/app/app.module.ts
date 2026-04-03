import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CategoryModule } from './category.module';
import { CategoryPagesModule } from './category-pages/category-pages.module';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
// import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // SupabaseModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSSL = String(config.get('DATABASE_SSL_ENABLED')).toLowerCase() === 'true';
        const showQueries = String(config.get('DATABASE_LOG_QUERIES') ?? '0') === '1';

        const logging: ('query' | 'error' | 'warn' | 'schema' | 'migration')[] =
          showQueries ? ['error', 'warn', 'query'] : ['error', 'warn'];

        return {
          type: 'postgres',
          host: config.get<string>('DATABASE_HOST'),
          port: Number(config.get('DATABASE_PORT') ?? 5432),
          username: config.get<string>('DATABASE_USERNAME'),
          password: config.get<string>('DATABASE_PASSWORD'),
          database: config.get<string>('DATABASE_NAME'),

          entities: [CategoryEntity, TagEntity],
          autoLoadEntities: true,
          synchronize: false,

          ssl: useSSL ? { rejectUnauthorized: false } : false,
          extra: useSSL ? { ssl: { rejectUnauthorized: false } } : undefined,
          logging,
        };
      },
    }),

    ScheduleModule.forRoot(),
    CategoryModule,          // ← All category stuff is here
    CategoryPagesModule,
  ],
})
export class AppModule {}