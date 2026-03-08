import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { AlgoliaClient } from './search/algolia.client'
import { SearchService } from './search/search.service'
import { SearchController } from './search/search.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
  ],
  controllers: [SearchController],
  providers: [AlgoliaClient, SearchService],
})
export class SearchServiceModule {}
