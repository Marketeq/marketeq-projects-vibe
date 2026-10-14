import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AlgoliaClient } from './sync/algolia.client'
import { SyncService } from './sync/sync.service'
import { SyncController } from './sync/sync.controller'
import { GateSyncService } from './gate/gate-sync.service'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AlgoliaClient, SyncService, GateSyncService],
  controllers: [SyncController],
})
export class AlgoliaServiceModule {}
