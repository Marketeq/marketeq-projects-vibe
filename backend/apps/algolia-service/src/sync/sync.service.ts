import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { AlgoliaClient } from './algolia.client'
import { SyncRecordDto, SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import {
  ListingEventPayload,
  TalentEventPayload,
  TeamEventPayload,
} from '../types/event-payloads'

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)

  constructor(private readonly algolia: AlgoliaClient) {}

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
        await this.algolia.upsert(index, { objectID, ...record })
        this.logger.log(`Upserted ${objectID} into ${index}`)
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to sync ${objectID} to ${index}`, err)
      throw new InternalServerErrorException(`Failed to sync ${objectID} to index ${index}`)
    }
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
        await this.algolia.batchUpsert(indexName, objects)
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
      created_at: listing.createdAt,
    }

    const record = isService
      ? {
          ...shared,
          service_title: listing.title,
          description: listing.description,
          category: listing.category,
          pricing_model: listing.pricingModel,
          delivery_time: listing.deliveryTime,
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

    await this.sync({ index, operation, objectID: listing.id, record })
  }

  async syncTalent(user: TalentEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: AlgoliaIndex.TALENT,
      operation,
      objectID: user.id,
      record: {
        name: user.name,
        username: user.username,
        headline: user.headline,
        job_title: user.headline,
        skills: user.skills ?? [],
        location: user.location,
        industries: user.industries ?? [],
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
      },
    })
  }

  async syncTeam(team: TeamEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: AlgoliaIndex.TEAMS,
      operation,
      objectID: team.id,
      record: {
        team_name: team.teamName,
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
