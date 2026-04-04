import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices'
import { SyncService } from './sync.service'
import { SyncRecordDto, SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import {
  ListingEventPayload,
  ListingDeletedPayload,
  TalentEventPayload,
  TalentDeletedPayload,
} from '../types/event-payloads'

@Controller('algolia')
export class SyncController {
  constructor(private readonly svc: SyncService) {}

  // REST — manual sync trigger (requires auth)
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  sync(@Body() dto: SyncRecordDto) {
    return this.svc.sync(dto)
  }

  @Post('sync/batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
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
  onListingCreated(@Payload() listing: ListingEventPayload) {
    return this.svc.syncListing(listing, SyncOperation.UPSERT)
  }

  @EventPattern('listing.updated')
  onListingUpdated(@Payload() listing: ListingEventPayload) {
    return this.svc.syncListing(listing, SyncOperation.UPSERT)
  }

  @EventPattern('listing.deleted')
  onListingDeleted(@Payload() data: ListingDeletedPayload) {
    return this.svc.sync({
      index: data.type === 'service' ? AlgoliaIndex.SERVICES : AlgoliaIndex.PROJECTS,
      operation: SyncOperation.DELETE,
      objectID: data.id,
    })
  }

  // Domain events from user-service
  @EventPattern('talent.updated')
  onTalentUpdated(@Payload() user: TalentEventPayload) {
    return this.svc.syncTalent(user, SyncOperation.UPSERT)
  }

  @EventPattern('talent.deleted')
  onTalentDeleted(@Payload() data: TalentDeletedPayload) {
    return this.svc.sync({
      index: AlgoliaIndex.TALENT,
      operation: SyncOperation.DELETE,
      objectID: data.id,
    })
  }
}
