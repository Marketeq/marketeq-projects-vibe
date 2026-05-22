import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { BasicInformation } from '../entities/job-listing-basic-info.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { RoleDescription } from '../entities/job-listing-role-description.entity';

@Injectable()
export class JobListingCmsSyncService {
  private readonly logger = new Logger(JobListingCmsSyncService.name);

  constructor(
    @InjectRepository(JobListing)
    private readonly listingRepo: Repository<JobListing>,
    @InjectRepository(BasicInformation)
    private readonly basicInfoRepo: Repository<BasicInformation>,
    @InjectRepository(TeamMemberRow)
    private readonly roleRowRepo: Repository<TeamMemberRow>,
    @InjectRepository(RoleDescription)
    private readonly roleDescRepo: Repository<RoleDescription>,
    private readonly dataSource: DataSource,
  ) {}

  async syncFromCms(listingId: string, body: Record<string, any>): Promise<void> {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`JobListing ${listingId} not found`);

    await this.dataSource.transaction(async (em) => {
      // ── Root fields ──────────────────────────────────────────────
      const rootPatch: Partial<JobListing> = {};
      if (body.ndaEnabled         !== undefined) rootPatch.ndaEnabled         = body.ndaEnabled;
      if (body.ndaScopeVisibility !== undefined) rootPatch.ndaScopeVisibility = body.ndaScopeVisibility;

      if (Object.keys(rootPatch).length > 0) {
        await em.save(JobListing, { id: listingId, ...rootPatch });
      }

      // ── BasicInformation (title, industries, languages) ──────────
      if (body.title !== undefined || body.jobType !== undefined || body.industries !== undefined || body.languages !== undefined) {
        const existing = await em.findOne(BasicInformation, { where: { jobListingId: listingId } });
        if (existing) {
          if (body.title      !== undefined) existing.title      = body.title;
          if (body.jobType    !== undefined) existing.jobType    = body.jobType ?? null;
          if (body.industries !== undefined) existing.industries = this.flattenTags(body.industries);
          if (body.languages  !== undefined) existing.languages  = this.flattenTags(body.languages);
          await em.save(BasicInformation, existing);
        } else {
          const bi = em.create(BasicInformation, {
            jobListingId: listingId,
            title:        body.title      ?? '',
            jobType:      body.jobType    ?? null,
            industries:   this.flattenTags(body.industries),
            languages:    this.flattenTags(body.languages),
          });
          await em.save(BasicInformation, bi);
        }
      }

      // ── Team Member Rows (full replace) ──────────────────────────
      if (Array.isArray(body.teamMemberRows)) {
        await em.delete(TeamMemberRow, { jobListingId: listingId });

        for (let ri = 0; ri < body.teamMemberRows.length; ri++) {
          const r = body.teamMemberRows[ri];
          const row = em.create(TeamMemberRow, {
            jobListingId:          listingId,
            roleTitle:             r.roleTitle,
            location:              r.location             ?? null,
            experienceLevel:       r.experienceLevel      ?? null,
            workSchedule:          r.workSchedule         ?? 'full_time',
            customHours:           r.customHours          ?? null,
            customFrequency:       r.customFrequency      ?? null,
            contractLengthMonths:  r.contractLengthMonths ?? null,
            assignedUsername:      r.assignedUsername      ?? null,
            positionOrder:         ri,
          });
          await em.save(TeamMemberRow, row);
        }
      }

      // ── Role Descriptions (full replace) ─────────────────────────
      if (Array.isArray(body.roleDescriptions)) {
        await em.delete(RoleDescription, { jobListingId: listingId });

        for (const rd of body.roleDescriptions) {
          const desc = em.create(RoleDescription, {
            jobListingId:    listingId,
            roleTitle:       rd.roleTitle,
            overview:        rd.overview        ?? null,
            benefits:        rd.benefits        ?? null,
            responsibilities: rd.responsibilities ?? null,
            skills:          this.flattenTags(rd.skills),
          });
          await em.save(RoleDescription, desc);
        }
      }
    });

    this.logger.log(`CMS sync applied to JobListing ${listingId}`);
  }

  // CMS chip arrays arrive as [{value: "..."}, ...] — flatten to string[].
  private flattenTags(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: any) => (typeof item === 'string' ? item : item?.value ?? ''))
      .filter(Boolean);
  }
}
