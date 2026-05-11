import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { AlgoliaClient } from './search/algolia.client'
import { SearchService } from './search/search.service'
import { SearchController } from './search/search.controller'
import { DbFallbackService } from './search/db-fallback.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
  ],
  controllers: [SearchController],
  providers: [AlgoliaClient, SearchService, DbFallbackService],
})
export class SearchServiceModule {}
