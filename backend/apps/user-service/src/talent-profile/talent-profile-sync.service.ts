import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSavedEvent } from './interfaces/talent-profile-events';

interface AlgoliaTalentPayload {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  skills: string[];
  location: string | null;
  industries: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  availability: string | null;
  languages: string[];
  certifications: string[];
  overview: string | null;
  tags: string[];
  experienceLevel: string | null;
  rating: number | null;
  avatarUrl: string | null;
  projectHighlights: string[];
}

@Injectable()
export class TalentProfileSyncService {
  private readonly logger = new Logger(TalentProfileSyncService.name);

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
  ) {}

  async upsert(event: TalentProfileSavedEvent): Promise<TalentProfile> {
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

    const existing = await this.repo.findOne({ where: { externalId: event.id } });

    if (existing) {
      Object.assign(existing, data);
      const saved = await this.repo.save(existing);
      this.logger.log(`Updated talent profile "${event.username}" (externalId=${event.id})`);
      this.emitAlgoliaUpdate(saved);
      return saved;
    }

    try {
      const profile = this.repo.create(data);
      const saved = await this.repo.save(profile);
      this.logger.log(`Created talent profile "${event.username}" (externalId=${event.id})`);
      this.emitAlgoliaUpdate(saved);
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        this.logger.warn(`Duplicate insert race for "${event.username}" — retrying as update`);
        const retryExisting = await this.repo.findOneOrFail({ where: { externalId: event.id } });
        Object.assign(retryExisting, data);
        const saved = await this.repo.save(retryExisting);
        this.emitAlgoliaUpdate(saved);
        return saved;
      }
      throw err;
    }
  }

  async delete(externalId: string): Promise<void> {
    const result = await this.repo.delete({ externalId });
    if (result.affected) {
      this.logger.log(`Deleted talent profile externalId=${externalId}`);
      this.algoliaClient.emit<void>('talent.deleted', { id: externalId }).subscribe({
        error: (err: Error) =>
          this.logger.warn(`Failed to emit talent.deleted for ${externalId}: ${err.message}`),
      });
    } else {
      this.logger.warn(`No talent profile found for externalId=${externalId}`);
    }
  }

  private emitAlgoliaUpdate(profile: TalentProfile): void {
    const payload = this.buildAlgoliaPayload(profile);
    this.algoliaClient.emit<void>('talent.updated', payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit talent.updated for ${profile.externalId}: ${err.message}`),
    });
  }

  private buildAlgoliaPayload(profile: TalentProfile): AlgoliaTalentPayload {
    return {
      id: profile.externalId,
      name: profile.name,
      username: profile.username,
      headline: profile.headline,
      skills: profile.skills ?? [],
      location: profile.location,
      industries: profile.industryExpertise ?? [],
      hourlyRateMin: profile.rateMin,
      hourlyRateMax: profile.rateMax,
      availability: profile.availability,
      languages: (profile.languages ?? []).map((l) => l.language),
      certifications: (profile.certifications ?? []).map((c) => c.title),
      overview: this.extractOverviewText(profile.overview),
      tags: [],
      experienceLevel: this.computeExperienceLevel(profile.workExperience ?? []),
      rating: profile.rating ? Number(profile.rating) : null,
      avatarUrl: null,
      projectHighlights: (profile.portfolio ?? []).map((p) => p.title),
    };
  }

  private extractOverviewText(overview: Record<string, any> | null): string | null {
    if (!overview) return null;
    if (typeof overview === 'string') return overview;
    // Walk Payload CMS rich text nodes to extract plain text
    try {
      const walk = (node: any): string => {
        if (typeof node?.text === 'string') return node.text;
        if (Array.isArray(node?.children)) return node.children.map(walk).join(' ');
        if (Array.isArray(node?.root?.children)) return node.root.children.map(walk).join(' ');
        return '';
      };
      const text = walk(overview).replace(/\s+/g, ' ').trim();
      return text || null;
    } catch {
      return null;
    }
  }

  private computeExperienceLevel(
    workExp: { startDate: string | null; endDate: string | null }[],
  ): string | null {
    if (!workExp.length) return null;
    const now = new Date();
    let totalMonths = 0;
    for (const exp of workExp) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : now;
      if (!start || isNaN(start.getTime())) continue;
      totalMonths +=
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
    }
    const years = Math.floor(totalMonths / 12);
    if (years < 3) return 'Junior (1-3 years)';
    if (years < 5) return 'Middle (3-5 years)';
    if (years < 7) return 'Senior (5-7 years)';
    if (years < 10) return 'Lead (7-10 years)';
    return 'Super Senior (10+ years)';
  }
}
