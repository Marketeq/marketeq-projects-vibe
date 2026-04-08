import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSavedEvent } from './interfaces/talent-profile-events';

@Injectable()
export class TalentProfileSyncService {
  private readonly logger = new Logger(TalentProfileSyncService.name);

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
  ) {}

  async upsert(event: TalentProfileSavedEvent): Promise<TalentProfile> {
    const existing = await this.repo.findOne({
      where: { externalId: event.id },
    });

    const data: Partial<TalentProfile> = {
      externalId: event.id,
      sourceId: event.sourceId ?? null,
      username: event.username,
      name: event.name,
      headline: event.headline ?? null,
      availability: event.availability ?? null,
      isAvailable: event.isAvailable ?? true,
      location: event.location ?? null,
      country: event.country ?? null,
      timezone: event.timezone ?? null,
      rateMin: event.rateMin ?? null,
      rateMax: event.rateMax ?? null,
      overview: event.overview ?? null,
      skills: event.skills ?? [],
      industryExpertise: event.industryExpertise ?? [],
      languages: event.languages ?? [],
      certifications: event.certifications ?? [],
      education: event.education ?? [],
      workExperience: event.workExperience ?? [],
      portfolio: event.portfolio ?? [],
      status: event.status ?? 'active',
    };

    if (existing) {
      Object.assign(existing, data);
      const saved = await this.repo.save(existing);
      this.logger.log(
        `Updated talent profile "${event.username}" (externalId=${event.id})`,
      );
      return saved;
    }

    const profile = this.repo.create(data);
    const saved = await this.repo.save(profile);
    this.logger.log(
      `Created talent profile "${event.username}" (externalId=${event.id})`,
    );
    return saved;
  }

  async delete(externalId: string): Promise<void> {
    const result = await this.repo.delete({ externalId });
    if (result.affected) {
      this.logger.log(`Deleted talent profile externalId=${externalId}`);
    } else {
      this.logger.warn(
        `No talent profile found for externalId=${externalId}`,
      );
    }
  }
}
