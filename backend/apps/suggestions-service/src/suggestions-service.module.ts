import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { JobTitle } from './entities/job-title.entity';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [JobTitle],
        synchronize: false,
        migrationsRun: true,
        migrationsTableName: 'sug_migrations', // avoids colliding with public.migrations (shared by other services with an identically named InitSchema1710000000000 migration)
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: (config.get('DATABASE_SSL_ENABLED') ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([JobTitle]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          // @keyv/redis@2 is CommonJS and its module.exports IS the
          // constructor, so destructuring `default` yields undefined and the
          // service crash loops with "KeyvRedis is not a constructor". This
          // path only runs when REDIS_URL is set, which is why it stayed
          // hidden until Redis was provisioned. Accept every module shape.
          const mod: any = await import('@keyv/redis');
          const KeyvRedis = mod?.default ?? mod?.KeyvRedis ?? mod;

          if (typeof KeyvRedis !== 'function') {
            // Falling back to the in-memory store keeps suggestions serving
            // instead of taking the whole container down over a cache.
            return {};
          }

          return { stores: [new KeyvRedis(redisUrl)] };
        }
        return {}; // in-memory fallback
      },
    }),
  ],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsServiceModule {}
