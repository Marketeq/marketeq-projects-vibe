import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSavedEvent } from './interfaces/talent-profile-events';
import { User } from '../user/entities/user.entity';

interface AlgoliaTalentPayload {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  skills: string[];
  location: string | null;
  industries: string[];
  hourlyRate: number | null;
  availability: string | null;
  languages: string[];
  certifications: string[];
  overview: string | null;
  tags: string[];
  experienceLevel: string | null;
  rating: number | null;
  projectHighlights: string[];
}

@Injectable()
export class TalentProfileSyncService {
  private readonly logger = new Logger(TalentProfileSyncService.name);

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
  ) {}

  async upsert(event: TalentProfileSavedEvent): Promise<TalentProfile> {
    const id = event.id;
    let sourceId = event.sourceId ?? null;

    // For CMS-first profiles that don't have a platform user yet, generate a 
    // sourceId so we can create a canonical user row. This ensures they are 
    // visible in the platform's user-based lists/filters.
    if (!sourceId) {
      // Use the externalId if it's a valid UUID, or generate a new one
      sourceId = event.id.length === 36 ? event.id : null; 
      // If we still don't have one, the underlying DB will handle it or we could generate here.
      // Actually, let's generate if still null.
      if (!sourceId) {
        sourceId = require('crypto').randomUUID();
      }
    }

    const data: Partial<TalentProfile> = {
      externalId: id,
      sourceId,
      username: event.username,
      name: event.name,
      availability: event.availability ?? null,
      rate: event.rate ?? null,
      jobTitles: event.jobTitles ?? [],
      overview: event.overview ?? null,
      skills: event.skills ?? [],
      industryExpertise: event.industryExpertise ?? [],
      languages: event.languages ?? [],
      certifications: event.certifications ?? [],
      education: event.education ?? [],
      workExperience: (event.workExperience ?? []).map((w: any) => ({ ...w, skills: w.skills ?? [] })),
      portfolio: (event.portfolio ?? []).map((p) => ({
        ...p,
        thumbnailUrl: null,
      })),
      location: event.location ?? null,
      timezone: event.timezone ?? null,
      status: event.status ?? 'active',
    };

    // Use save() which does INSERT ... ON CONFLICT UPDATE when entity has
    // a matching unique key, avoiding race conditions between find and insert.
    const existing = await this.repo.findOne({
      where: { externalId: event.id },
    });

    if (existing) {
      Object.assign(existing, data);
      const saved = await this.repo.save(existing);
      this.logger.log(
        `Updated talent profile "${event.username}" (externalId=${event.id})`,
      );
      this.emitAlgoliaUpdate(saved);
      await this.syncUserRow(event, sourceId);
      return saved;
    }

    try {
      const profile = this.repo.create(data);
      const saved = await this.repo.save(profile);
      this.logger.log(
        `Created talent profile "${event.username}" (externalId=${event.id})`,
      );
      this.emitAlgoliaUpdate(saved);
      await this.syncUserRow(event, sourceId);
      return saved;
    } catch (err: any) {
      // Handle race condition: another process inserted between find and save
      if (err?.code === '23505') {
        this.logger.warn(
          `Duplicate insert race for "${event.username}" — retrying as update`,
        );
        const retryExisting = await this.repo.findOneOrFail({
          where: { externalId: event.id },
        });
        Object.assign(retryExisting, data);
        const saved = await this.repo.save(retryExisting);
        this.emitAlgoliaUpdate(saved);
        await this.syncUserRow(event, sourceId);
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
      this.logger.warn(
        `No talent profile found for externalId=${externalId}`,
      );
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
    const headline = profile.jobTitles?.[0]?.headline ?? null;
    return {
      id: profile.externalId,
      name: profile.name,
      username: profile.username,
      headline,
      skills: profile.skills ?? [],
      location: profile.location,
      industries: profile.industryExpertise ?? [],
      hourlyRate: profile.rate ?? null,
      availability: profile.availability,
      languages: (profile.languages ?? []).map((l) => l.language),
      certifications: (profile.certifications ?? []).map((c) => c.title),
      overview: this.extractOverviewText(profile.overview),
      tags: [],
      experienceLevel: this.computeExperienceLevel(profile.workExperience ?? []),
      rating: profile.rating ? Number(profile.rating) : null,
      projectHighlights: (profile.portfolio ?? []).map((p) => p.title),
    };
  }

  private extractOverviewText(overview: Record<string, any> | null): string | null {
    if (!overview) return null;
    if (typeof overview === 'string') return overview;
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

  private async syncUserRow(
    event: TalentProfileSavedEvent,
    resolvedSourceId: string | null,
  ): Promise<void> {
    // Keep the canonical user row in sync for endpoints that read from `users`
    // (e.g. /talent/users). Prefer sourceId (auth/user UUID) when provided.
    const sourceId = resolvedSourceId ?? event.sourceId ?? null;
    if (!sourceId) return;

    let user = await this.userRepo.findOne({ where: { id: sourceId } });
    if (!user) {
      this.logger.log(`Creating missing user for sourceId=${sourceId} (username="${event.username}")`);
      user = this.userRepo.create({
        id: sourceId,
        email: `${event.username}@example.com`, // Fallback email
        isActive: true,
        provider: 'SEED',
      });
    }

    user.userType = 'talent';
    user.username = event.username;

    // Sync name to firstName/lastName for the users table
    if (event.name) {
      const parts = event.name.trim().split(/\s+/);
      if (parts.length > 1) {
        user.firstName = parts[0];
        user.lastName = parts.slice(1).join(' ');
      } else {
        user.firstName = parts[0];
        user.lastName = undefined;
      }
    }

    user.availability = event.availability ?? undefined;
    user.rate = event.rate ?? undefined;
    user.location = event.location ?? undefined;

    // Extract plain text for the users table overview/bio fields
    if (event.overview) {
      if (typeof event.overview === "string") {
        user.overview = event.overview;
      } else if ((event.overview as any).root?.children) {
        const extract = (node: any): string => {
          if (node.text) return node.text;
          if (node.children) {
            return node.children.map(extract).join("");
          }
          return "";
        };
        user.overview = (event.overview as any).root.children
          .map(extract)
          .join("\n");
      }
    } else if (event.headline) {
      user.overview = event.headline;
    }

    try {
      await this.userRepo.save(user);
    } catch (err: any) {
      // Best-effort only; the talent_profiles row is the primary read model for profile pages.
      this.logger.warn(
        `Failed to sync users row for sourceId=${sourceId} username="${event.username}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
