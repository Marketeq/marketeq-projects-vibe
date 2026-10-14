import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices'
import { SyncService } from './sync.service'
import { SyncRecordDto, SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { GateSyncService } from '../gate/gate-sync.service'
import {
  ListingEventPayload,
  ListingDeletedPayload,
  TalentEventPayload,
  TalentDeletedPayload,
  GateChangedPayload,
  TalentGateBackfillPayload,
  TeamEventPayload,
  TeamDeletedPayload,
} from '../types/event-payloads'

@Controller('algolia')
export class SyncController {
  constructor(
    private readonly svc: SyncService,
    private readonly gateSync: GateSyncService,
  ) {}

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

  // G1 discovery gate. identity-verification-service reports every change of an
  // account's gate_open; the decision is mirrored onto that account's talent
  // record(s) as a partial update. Failures are retried inside GateSyncService.
  @EventPattern('identity.gate_changed')
  onGateChanged(@Payload() payload: GateChangedPayload) {
    return this.gateSync.applyGateChange(payload)
  }

  // user-service's repeatable backfill/reconcile of gate_open for existing
  // talent records (see TalentProfileSyncService.reindexGate).
  @MessagePattern('talent.gate_backfill')
  onGateBackfill(@Payload() payload: TalentGateBackfillPayload) {
    return this.gateSync.applyBackfill(payload)
  }

  // Propagation monitoring: pending/failed index updates and event-to-index lag
  // against the alert threshold.
  @Get('gate-sync/health')
  @UseGuards(JwtAuthGuard)
  gateSyncHealth() {
    return this.gateSync.getHealth()
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
