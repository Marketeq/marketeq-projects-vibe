import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CategoryPagesController } from './category-pages.controller';
import { CategoryPagesService } from './category-pages.service';
import { CategoryEntity } from '../entities/category.entity';
import { TagEntity } from '../entities/tag.entity';

import { CmsAdapter } from './adapters/cms.adapter';
import { ListingAdapter } from './adapters/listing.adapter';
import { UserAdapter } from './adapters/user.adapter';
import { SuggestionsAdapter } from './suggestions/suggestions.adapter';

import { CmsAdapterReal } from './adapters/cms.adapter.real';
import { CmsAdapterMock } from './adapters/cms.adapter.mock';
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
 * Uses adapter pattern to decouple from CMS service.
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
      provide: CmsAdapter,
      useFactory: (http: HttpService) => {
        const hasKey = !!process.env.CMS_API_KEY?.trim();
        return hasKey ? new CmsAdapterReal(http) : new CmsAdapterMock();
      },
      inject: [HttpService],
    },
    {
      provide: ListingAdapter,
      useFactory: (http: HttpService) => {
        const hasKey = !!process.env.CMS_API_KEY?.trim();
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
