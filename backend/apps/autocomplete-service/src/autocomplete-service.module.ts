import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { AutocompleteEntry } from './entities/autocomplete-entry.entity';
import { AutocompleteReviewQueue } from './entities/autocomplete-review-queue.entity';
import { AutocompleteCategory } from './entities/autocomplete-category.entity';
import { AutocompleteRejectedEntry } from './entities/autocomplete-rejected-entry.entity';
import { AutocompleteService } from './autocomplete.service';
import { AutocompleteController } from './autocomplete.controller';
import { EntryFilter } from './filters/entry.filter';
import { JwtStrategy } from './guards/jwt-auth.guard';

const envPaths = [
  resolve(process.cwd(), 'apps/autocomplete-service/.env'),
  resolve(process.cwd(), '.env'),
].filter((candidate) => existsSync(candidate));

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envPaths,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [AutocompleteEntry, AutocompleteReviewQueue, AutocompleteCategory, AutocompleteRejectedEntry],
        synchronize: config.get('NODE_ENV') !== 'production',
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([AutocompleteEntry, AutocompleteReviewQueue, AutocompleteCategory, AutocompleteRejectedEntry]),
  ],
  controllers: [AutocompleteController],
  providers: [AutocompleteService, EntryFilter, JwtStrategy],
})
export class AutocompleteServiceModule {}
