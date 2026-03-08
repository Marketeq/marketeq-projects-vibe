import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AlgoliaClient } from './sync/algolia.client'
import { SyncService } from './sync/sync.service'
import { SyncController } from './sync/sync.controller'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AlgoliaClient, SyncService],
  controllers: [SyncController],
})
export class AlgoliaServiceModule {}
