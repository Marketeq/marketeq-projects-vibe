import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { AlgoliaClient } from './algolia.client'
import { GateSyncService } from '../gate/gate-sync.service'
import { SyncRecordDto, SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import {
  ListingEventPayload,
  TalentEventPayload,
  TeamEventPayload,
} from '../types/event-payloads'

// Attributes only the gate pipeline may write. A generic sync/REST caller that
// sends them is ignored, so `gate_open:true` cannot be set from outside.
// Only a real platform account (a user id) is an owner whose gate applies; system
// values such as 'cms-sync' are not.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isAccountId = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

const GATE_ATTRIBUTES = ['gate_open', 'gate_updated_at', 'account_id']
// G5: the same for the listing-owner gate on projects/services/teams records.
const OWNER_GATE_ATTRIBUTES = ['owner_gate_open', 'owner_gate_exempt', 'owner_gate_updated_at']
const withoutGate = (record: Record<string, unknown>): Record<string, unknown> => {
  const clean = { ...record }
  for (const key of GATE_ATTRIBUTES) delete clean[key]
  return clean
}
const withoutOwnerGate = (record: Record<string, unknown>): Record<string, unknown> => {
  const clean = { ...record }
  for (const key of OWNER_GATE_ATTRIBUTES) delete clean[key]
  return clean
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)

  constructor(
    private readonly algolia: AlgoliaClient,
    private readonly gateSync: GateSyncService,
  ) {}

  async sync(dto: SyncRecordDto): Promise<void> {
    const { index, operation, objectID, record } = dto

    try {
      if (operation === SyncOperation.DELETE) {
        await this.algolia.delete(index, objectID)
        this.logger.log(`Deleted ${objectID} from ${index}`)
      } else {
        if (!record) {
          throw new BadRequestException(`Upsert called with no record for ${objectID}`)
        }
        await this.upsertGeneric(index, objectID, record)
        this.logger.log(`Upserted ${objectID} into ${index}`)
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to sync ${objectID} to ${index}`, err)
      throw new InternalServerErrorException(`Failed to sync ${objectID} to index ${index}`)
    }
  }

  // Talent records are updated PARTIALLY (created if absent): a full replace
  // would drop `gate_open` and hide an eligible talent until the next gate
  // event. Every other index keeps its full-replace behaviour.
  private async upsertRecord(index: AlgoliaIndex, objectID: string, record: Record<string, unknown>): Promise<void> {
    if (index === AlgoliaIndex.TALENT) {
      await this.algolia.partialUpdate(index, objectID, withoutGate(record), true)
      return
    }
    await this.algolia.upsert(index, { objectID, ...record })
  }

  // The generic (REST / algolia.sync) entry point must not be able to set the
  // listing-owner gate; only the listing and gate-change pipelines do.
  private async upsertGeneric(index: AlgoliaIndex, objectID: string, record: Record<string, unknown>): Promise<void> {
    await this.upsertRecord(index, objectID, index === AlgoliaIndex.TALENT ? record : withoutOwnerGate(record))
  }

  async batchSync(records: SyncRecordDto[]): Promise<void> {
    const byIndex: Record<string, Record<string, unknown>[]> = {}

    try {
      for (const dto of records) {
        if (dto.operation === SyncOperation.DELETE) {
          await this.algolia.delete(dto.index, dto.objectID)
          continue
        }
        if (!dto.record) continue
        if (!byIndex[dto.index]) byIndex[dto.index] = []
        byIndex[dto.index].push({ objectID: dto.objectID, ...dto.record })
      }

      for (const [indexName, objects] of Object.entries(byIndex)) {
        if (indexName === AlgoliaIndex.TALENT) {
          // Same rule as sync(): talent records are partially updated, and a
          // caller can never write the gate itself.
          await this.algolia.partialUpdateBatch(
            indexName,
            objects.map((o) => ({ ...withoutGate(o), objectID: o.objectID as string })),
            true,
          )
        } else {
          await this.algolia.batchUpsert(indexName, objects.map(withoutOwnerGate))
        }
        this.logger.log(`Batch upserted ${objects.length} records into ${indexName}`)
      }
    } catch (err) {
      this.logger.error('Batch sync failed', err)
      throw new InternalServerErrorException('Batch sync operation failed')
    }
  }

  async syncListing(listing: ListingEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    const isService = listing.type === 'service'
    const index = isService ? AlgoliaIndex.SERVICES : AlgoliaIndex.PROJECTS

    const shared = {
      owner_id: listing.ownerId,
      skills: listing.skills ?? [],
      tags: listing.tags ?? [],
      industry: listing.industry,
      rating: listing.rating,
      created_at: new Date(listing.createdAt).getTime(),
      media_url: listing.mediaUrls?.[0] ?? null,
    }

    const record = isService
      ? {
          ...shared,
          service_title: listing.title,
          description: listing.description,
          category: listing.category,
          pricing_model: listing.pricingModel,
          delivery_time: listing.deliveryTime,
          // Team Size is hidden on the Services sidebar, and no service
          // publisher ever set `teamSizeRange` — this only ever wrote
          // undefined. Restore alongside the sidebar control if it comes back.
          // team_size_range: listing.teamSizeRange,
          price_range: listing.priceMin ?? listing.priceMax,
          price_min: listing.priceMin,
          price_max: listing.priceMax,
        }
      : {
          ...shared,
          project_title: listing.title,
          subtitle: listing.subtitle,
          overview: listing.overview,
          description: listing.description,
          technologies: listing.technologies ?? [],
          subcategories: listing.subcategories ?? [],
          project_lead: listing.projectLead,
          deliverables: listing.deliverables,
          project_category: listing.category,
          project_type: listing.projectType,
          budget_range: listing.budgetMax ?? listing.budgetMin,
          budget_min: listing.budgetMin,
          budget_max: listing.budgetMax,
          project_duration_range: listing.projectDurationRange,
          team_size_range: listing.teamSizeRange,
          additional_tags: listing.additionalTags ?? [],
          timeline: listing.timeline,
        }

    // G5: positive visibility. A listing owned by a platform account is visible
    // only while that owner's last known gate is open (`owner_gate_open`); an
    // unknown state is indexed closed. A listing with no platform owner (none, or
    // a system value such as 'cms-sync') is visible only because it is explicitly
    // marked `owner_gate_exempt`. Written here, not through sync(), because sync()
    // strips the owner-gate attributes from generic callers.
    const gated: Record<string, unknown> = isAccountId(listing.ownerId)
      ? { owner_gate_open: listing.ownerGateOpen === true, owner_gate_exempt: false, owner_gate_updated_at: Date.now() }
      : { owner_gate_exempt: true, owner_gate_open: false, owner_gate_updated_at: Date.now() }
    if (operation === SyncOperation.DELETE) {
      await this.sync({ index, operation, objectID: listing.id })
      return
    }
    try {
      await this.upsertRecord(index, listing.id, { ...record, ...gated })
      this.logger.log(`Upserted ${listing.id} into ${index}`)
    } catch (err) {
      this.logger.error(`Failed to sync ${listing.id} to ${index}`, err)
      throw new InternalServerErrorException(`Failed to sync ${listing.id} to index ${index}`)
    }
  }

  async syncTalent(user: TalentEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    if (operation === SyncOperation.DELETE) {
      await this.sync({ index: AlgoliaIndex.TALENT, operation, objectID: user.id })
      return
    }

    // The gate decision rides along only when the sender actually obtained one
    // AND no newer decision for the account has already been applied. Without
    // it the record's existing `gate_open` is left as it is (a partial update),
    // and a record that never had one stays hidden.
    const checkedAt = user.gateCheckedAt ? Date.parse(user.gateCheckedAt) : NaN
    const carriesGate =
      typeof user.gateOpen === 'boolean' &&
      Number.isFinite(checkedAt) &&
      this.gateSync.isGateCurrent(user.accountId, checkedAt)

    const record: Record<string, unknown> = {
      name: user.name,
      username: user.username,
      created_at: user.createdAt ? new Date(user.createdAt).getTime() : null,
      headline: user.headline,
      job_title: user.headline,
      skills: user.skills ?? [],
      location: user.location,
      industries: user.industries ?? [],
      categories: user.categories ?? [],
      subcategories: user.subcategories ?? [],
      hourly_rate: user.hourlyRateMin,
      hourly_rate_min: user.hourlyRateMin,
      hourly_rate_max: user.hourlyRateMax,
      availability: user.availability,
      languages: user.languages ?? [],
      certifications: user.certifications ?? [],
      overview: user.overview,
      tags: user.tags ?? [],
      experience_level: user.experienceLevel,
      rating: user.rating,
      avatar_url: user.avatarUrl,
      project_highlights: user.projectHighlights ?? [],
      // Stats behind the Talent sidebar's numeric filters and the result
      // card. Explicitly null rather than omitted when unknown, so a
      // re-sync clears a stale value instead of leaving it behind.
      country: user.country ?? null,
      timezone: user.timezone ?? null,
      // Weekly capacity as a number. `availability` itself is stored and
      // faceted as a string ("40"), and Algolia numeric comparisons only
      // work on real numbers — so the sidebar's Availability buckets, which
      // range over capacity, need this parallel numeric attribute.
      availability_hours: Number.isFinite(Number(user.availability))
        ? Number(user.availability)
        : null,
      projects_completed: user.projectsCompleted ?? null,
      reviews_count: user.reviewsCount ?? null,
      client_success_rate: user.clientSuccessRate ?? null,
      years_of_experience: user.yearsOfExperience ?? null,
    }
    if (user.accountId) record.account_id = user.accountId
    if (carriesGate) {
      record.gate_open = user.gateOpen
      record.gate_updated_at = checkedAt
    }

    // Partial update (created when absent): never a full replace, which would
    // drop `gate_open`. Written directly rather than through sync(), because
    // sync() strips the gate attributes from generic callers.
    await this.algolia.partialUpdate(AlgoliaIndex.TALENT, user.id, record, true)
    if (carriesGate) this.gateSync.noteGateApplied(user.accountId, checkedAt)
    this.logger.log(`Upserted ${user.id} into ${AlgoliaIndex.TALENT}`)
  }

  async syncTeam(team: TeamEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    if (operation === SyncOperation.DELETE) {
      await this.sync({ index: AlgoliaIndex.TEAMS, operation, objectID: team.id })
      return
    }
    // G5: same positive owner-gate rule as listings.
    const gated: Record<string, unknown> = isAccountId(team.ownerId)
      ? { owner_id: team.ownerId, owner_gate_open: team.ownerGateOpen === true, owner_gate_exempt: false, owner_gate_updated_at: Date.now() }
      : { owner_gate_exempt: true, owner_gate_open: false, owner_gate_updated_at: Date.now() }
    await this.upsertRecord(AlgoliaIndex.TEAMS, team.id, {
      ...gated,
      ...{
        team_name: team.teamName,
        created_at: team.createdAt ? new Date(team.createdAt).getTime() : null,
        username: team.username,
        category: team.category,
        services: team.services ?? [],
        skills: team.skills ?? [],
        location: team.location,
        tags: team.tags ?? [],
        industries: team.industries ?? [],
        hourly_rate: team.hourlyRate,
        team_size_range: team.teamSizeRange,
        rating: team.rating,
        projects_completed: team.projectsCompleted,
        client_success_rate: team.clientSuccessRate,
        availability: team.availability,
        languages: team.languages ?? [],
        description: team.description,
        specialties: team.specialties ?? [],
        stack: team.stack ?? [],
        featured_projects: team.featuredProjects,
        member_avatars: team.memberAvatars ?? [],
        member_count: team.memberCount,
      },
    })
  }
}
