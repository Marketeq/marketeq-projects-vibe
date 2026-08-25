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
  TeamEventPayload,
  TeamDeletedPayload,
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

  // RabbitMQ — generic sync commands
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

  // Domain events from user-service (talent profiles)
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

  // Domain events from listings-service (teams)
  @EventPattern('team.created')
  onTeamCreated(@Payload() team: TeamEventPayload) {
    return this.svc.syncTeam(team, SyncOperation.UPSERT)
  }

  @EventPattern('team.updated')
  onTeamUpdated(@Payload() team: TeamEventPayload) {
    return this.svc.syncTeam(team, SyncOperation.UPSERT)
  }

  @EventPattern('team.deleted')
  onTeamDeleted(@Payload() data: TeamDeletedPayload) {
    return this.svc.sync({
      index: AlgoliaIndex.TEAMS,
      operation: SyncOperation.DELETE,
      objectID: data.id,
    })
  }
}
