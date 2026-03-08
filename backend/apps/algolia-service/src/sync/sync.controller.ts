import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices'
import { SyncService } from './sync.service'
import { SyncRecordDto, SyncOperation } from '../dto/sync.dto'

@Controller('algolia')
export class SyncController {
  constructor(private readonly svc: SyncService) {}

  // REST — manual sync trigger
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@Body() dto: SyncRecordDto) {
    return this.svc.sync(dto)
  }

  @Post('sync/batch')
  @HttpCode(HttpStatus.OK)
  batchSync(@Body() records: SyncRecordDto[]) {
    return this.svc.batchSync(records)
  }

  // RabbitMQ — event-driven sync from other services
  @MessagePattern('algolia.sync')
  handleSync(@Payload() dto: SyncRecordDto) {
    return this.svc.sync(dto)
  }

  @MessagePattern('algolia.batch-sync')
  handleBatch(@Payload() records: SyncRecordDto[]) {
    return this.svc.batchSync(records)
  }

  // Domain events from listings-service
  @EventPattern('listing.created')
  onListingCreated(@Payload() listing: any) {
    return this.svc.syncListing(listing, SyncOperation.UPSERT)
  }

  @EventPattern('listing.updated')
  onListingUpdated(@Payload() listing: any) {
    return this.svc.syncListing(listing, SyncOperation.UPSERT)
  }

  @EventPattern('listing.deleted')
  onListingDeleted(@Payload() data: { id: string; type: string }) {
    return this.svc.sync({
      index: data.type === 'service' ? 'services' : 'projects',
      operation: SyncOperation.DELETE,
      objectID: data.id,
    })
  }

  // Domain events from user-service
  @EventPattern('talent.updated')
  onTalentUpdated(@Payload() user: any) {
    return this.svc.syncTalent(user, SyncOperation.UPSERT)
  }

  @EventPattern('talent.deleted')
  onTalentDeleted(@Payload() data: { id: string }) {
    return this.svc.sync({
      index: 'talent',
      operation: SyncOperation.DELETE,
      objectID: data.id,
    })
  }
}
