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
        // If STRAPI_TOKEN isn't set, StrapiAdapterReal will always return []
        // (tax-groups endpoint is authenticated). In that case, fall back to the
        // mock adapter so category-pages can still be exercised end-to-end.
        const hasToken = !!process.env.STRAPI_TOKEN?.trim();
        return hasToken ? new StrapiAdapterReal(http) : new StrapiAdapterMock();
      },
      inject: [HttpService],
    },
    {
      provide: ListingAdapter,
      useFactory: (http: HttpService) => {
        // ListingAdapterReal expects Strapi content-types like /api/projects to exist.
        // For local smoke tests, fall back to the mock adapter when STRAPI_TOKEN is missing.
        const hasToken = !!process.env.STRAPI_TOKEN?.trim();
        return hasToken ? new ListingAdapterReal(http) : new ListingAdapterMock();
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