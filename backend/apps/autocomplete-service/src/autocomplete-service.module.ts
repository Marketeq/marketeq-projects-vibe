import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutocompleteEntry } from './entities/autocomplete-entry.entity';
import { AutocompleteReviewQueue } from './entities/autocomplete-review-queue.entity';
import { AutocompleteCategory } from './entities/autocomplete-category.entity';
import { AutocompleteRejectedEntry } from './entities/autocomplete-rejected-entry.entity';
import { AutocompleteService } from './autocomplete.service';
import { AutocompleteController } from './autocomplete.controller';
import { EntryFilter } from './filters/entry.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [AutocompleteEntry, AutocompleteReviewQueue, AutocompleteCategory, AutocompleteRejectedEntry],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([AutocompleteEntry, AutocompleteReviewQueue, AutocompleteCategory, AutocompleteRejectedEntry]),
  ],
  controllers: [AutocompleteController],
  providers: [AutocompleteService, EntryFilter],
})
export class AutocompleteServiceModule {}
