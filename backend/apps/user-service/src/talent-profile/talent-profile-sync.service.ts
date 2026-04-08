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
      sourceId: event.sourceId,
      username: event.username,
      name: event.name,
      headline: event.headline,
      availability: event.availability,
      isAvailable: event.isAvailable,
      location: event.location,
      country: event.country,
      timezone: event.timezone,
      rateMin: event.rateMin,
      rateMax: event.rateMax,
      overview: event.overview,
      skills: event.skills,
      industryExpertise: event.industryExpertise,
      languages: event.languages,
      certifications: event.certifications,
      education: event.education,
      workExperience: event.workExperience,
      portfolio: event.portfolio,
      status: event.status,
    };

    if (existing) {
      await this.repo.update({ id: existing.id }, data);
      this.logger.log(
        `Updated talent profile "${event.username}" (externalId=${event.id})`,
      );
      return this.repo.findOneOrFail({ where: { externalId: event.id } });
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
