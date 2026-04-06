import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CategoryPagesController } from './category-pages.controller';
import { CategoryPagesService } from './category-pages.service';
import { CategoryEntity } from '../entities/category.entity';
import { TagEntity } from '../entities/tag.entity';

import { StrapiAdapter } from './adapters/strapi.adapter';
import { ListingAdapter } from './adapters/listing.adapter';
import { UserAdapter } from './adapters/user.adapter';
import { SuggestionsAdapter } from './suggestions/suggestions.adapter';

import { StrapiAdapterReal } from './adapters/strapi.adapter.real'; 
import { StrapiAdapterMock } from './adapters/strapi.adapter.mock';
import { ListingAdapterMock } from './adapters/listing.adapter.mock';
import { ListingAdapterReal } from './adapters/listing.adapter.real';
import { UserAdapterReal } from './adapters/user.adapter.real';
import { SuggestionsAdapterReal } from './suggestions/suggestions.adapter.real';

import { EvaluatorFactory } from './evaluators/evaluator-factory';
import { HealthModule } from './health/health.module';
/**
 * CategoryPagesModule
 * 
 * Provides the Category Pages API endpoint with:
 * - Dynamic content blocks from taxonomy rules
 * - Suggestions (related categories, trending, popular, skills)
 * - Navigation (breadcrumbs, parent, children, siblings)
 * 
 * Uses adapter pattern to decouple from external services.
 * Current setup uses mock adapters for development.
 * Jayesh will replace with real implementations when ready.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryEntity, TagEntity]),
    HttpModule,
    HealthModule,
  ],
  controllers: [CategoryPagesController],
  providers: [
    CategoryPagesService,
    EvaluatorFactory,
    
    {
      provide: StrapiAdapter,
      useFactory: (http: HttpService) => {
        // Use CMS_API_KEY (Payload CMS) or fall back to STRAPI_TOKEN for backward compat.
        // If neither is set, use mock adapter so category-pages can still be exercised.
        const hasKey = !!(process.env.CMS_API_KEY || process.env.STRAPI_TOKEN)?.trim();
        return hasKey ? new StrapiAdapterReal(http) : new StrapiAdapterMock();
      },
      inject: [HttpService],
    },
    {
      provide: ListingAdapter,
      useFactory: (http: HttpService) => {
        // ListingAdapterReal expects CMS/Strapi content-types.
        // Fall back to mock when no API key is configured.
        const hasKey = !!(process.env.CMS_API_KEY || process.env.STRAPI_TOKEN)?.trim();
        return hasKey ? new ListingAdapterReal(http) : new ListingAdapterMock();
      },
      inject: [HttpService],
    },
    {
      provide: UserAdapter,
      useClass: UserAdapterReal,
    },
    {
      provide: SuggestionsAdapter,
      useClass: SuggestionsAdapterReal,
    },
  ],
  exports: [CategoryPagesService],
})
export class CategoryPagesModule {}