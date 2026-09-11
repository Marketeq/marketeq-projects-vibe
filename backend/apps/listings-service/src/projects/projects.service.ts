import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Project } from './entities/project.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';
import { budgetFromScope } from '../shared/utils/pricing';
import { toStringArray, normalizeN8nScope } from '../shared/utils/scope';
import {
  DELIVERABLES_ADAPTER,
  DeliverablesAdapter,
} from '../project-sync/deliverables/deliverables.adapter';
import { FAQ_ADAPTER, FaqAdapter } from '../publish/faq/faq.adapter';
import { RelatedTermsService } from './related-terms.service';
import { taxonomyChildren } from './related-taxonomy';
import { ReportProjectDto } from './dto/report-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private static readonly SUGGESTED_TTL_MS = 60 * 60 * 1000;
  private static readonly SUGGESTED_CACHE_MAX = 500;
  private readonly suggestedQuestionsCache = new Map<
    string,
    { questions: string[]; expiresAt: number }
  >();

  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @Inject(DELIVERABLES_ADAPTER)
    private readonly deliverablesAdapter: DeliverablesAdapter,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
    @Inject(FAQ_ADAPTER)
    private readonly faqAdapter: FaqAdapter,
    private readonly relatedTerms: RelatedTermsService,
  ) {}

  async getSuggestedQuestions(projectId: string): Promise<string[]> {
    const cached = this.suggestedQuestionsCache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) return cached.questions;

    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) return [];

    const scope = (project.scope ?? []).map((phase: any) => ({
      phaseName: phase?.title ?? phase?.phaseName ?? '',
      tasks: (phase?.tasks ?? [])
        .map((t: any) => t?.title ?? t?.name ?? '')
        .filter(Boolean),
    }));

    const questions = await this.faqAdapter.suggestQuestions({
      title: project.title,
      listingType: (project as any).listingType,
      categories: project.categories,
      skills: project.skills,
      tags: project.tags,
      durationMonths: project.durationMonths,
      shortDescription: project.shortDescription,
      fullDescription: project.description,
      scope,
    });

    const result = questions.slice(0, 10);
    this.setSuggestedCache(projectId, result);
    return result;
  }

  private setSuggestedCache(projectId: string, questions: string[]): void {
    const now = Date.now();
    if (this.suggestedQuestionsCache.size >= ProjectsService.SUGGESTED_CACHE_MAX) {
      for (const [key, value] of this.suggestedQuestionsCache) {
        if (value.expiresAt <= now) this.suggestedQuestionsCache.delete(key);
      }
      while (
        this.suggestedQuestionsCache.size >= ProjectsService.SUGGESTED_CACHE_MAX
      ) {
        const oldest = this.suggestedQuestionsCache.keys().next().value;
        if (oldest === undefined) break;
        this.suggestedQuestionsCache.delete(oldest);
      }
    }
    this.suggestedQuestionsCache.set(projectId, {
      questions,
      expiresAt: now + ProjectsService.SUGGESTED_TTL_MS,
    });
  }

  async findAll(status = ListingStatus.Published) {
    const items = await this.repo.find({
      where: { status, listingType: 'project' },
      order: { featured: 'DESC', createdAt: 'DESC' },
    });
    return items.map((item) => this.shapeProject(item));
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id, listingType: 'project' } });
    if (!item) throw new NotFoundException('Project not found');
    return this.shapeProject(item);
  }

  async findOnePublished(id: string) {
    const item = await this.repo.findOne({
      where: { id, status: ListingStatus.Published, listingType: 'project' },
    });
    if (!item) throw new NotFoundException('Project not found');
    return this.shapeProject(item);
  }

  async findBySlug(slug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );
    const item = await this.repo.findOne({
      where: {
        ...(isUuid ? { id: slug } : { slug }),
        status: ListingStatus.Published,
        listingType: 'project',
      },
    });
    if (!item) throw new NotFoundException('Project not found');

    const [similarProjects, projectHistoryRatings, team] = await Promise.all([
      this.getSimilarProjects(item),
      this.getProjectHistoryRatings(item),
      this.resolveTeamMembers(item),
    ]);

    return {
      ...this.shapeProject(item),
      ownerId: item.userId ? String(item.userId) : null,
      similarProjects,
      team,
      isTemporarilyUnavailable: team.length === 0,
      projectHistoryRatings,
    };
  }

  private async resolveTeamMembers(project: Project) {
    const rawRows: Array<{ teamMemberIds: string[]; userId: string | null }> = await this.repo.manager.query(
      `SELECT "teamMemberIds", "userId"::text FROM listings.project WHERE id = $1`,
      [project.id],
    );
    const row = rawRows[0];
    const memberIds: string[] = Array.isArray(row?.teamMemberIds) && row.teamMemberIds.length
      ? row.teamMemberIds
      : row?.userId ? [row.userId] : [];
    if (!memberIds.length) return [];

    const statusRows: Array<{ userId: string; status: string }> = await this.repo.manager.query(
      `SELECT "userId"::text, "status" FROM listings.project_members WHERE "projectId" = $1`,
      [project.id],
    );
    const inactiveIds = new Set(
      statusRows.filter((r) => r.status === 'Inactive').map((r) => r.userId),
    );
    const visibleIds = memberIds.filter((id) => !inactiveIds.has(id));
    if (!visibleIds.length) return [];

    const [users, skillRows, langRows, experienceRows] = await Promise.all([
      this.repo.manager.query<Array<{
        id: string; firstName: string; lastName: string; username: string | null;
        avatarUrl: string | null; recentJobTitle: string | null; location: string | null;
        rate: string | null; rateMin: number | null; rateMax: number | null;
      }>>(
        `SELECT id::text, "firstName", "lastName", username, "avatarUrl", "recentJobTitle", location, rate, "rateMin", "rateMax"
         FROM user_service.users WHERE id = ANY($1::uuid[])`,
        [visibleIds],
      ),
      this.repo.manager.query<Array<{ userId: string; name: string }>>(
        `SELECT "userId"::text, name FROM user_service.skills WHERE "userId" = ANY($1::uuid[])`,
        [visibleIds],
      ),
      this.repo.manager.query<Array<{ userId: string; name: string }>>(
        `SELECT "userId"::text, name FROM user_service.languages WHERE "userId" = ANY($1::uuid[])`,
        [visibleIds],
      ),
      this.repo.manager.query<Array<{ userId: string; startDate: string | null; endDate: string | null }>>(
        `SELECT "userId"::text, "startDate", "endDate" FROM user_service.experience WHERE "userId" = ANY($1::uuid[])`,
        [visibleIds],
      ),
    ]);

    const skillsByUser = new Map<string, string[]>();
    skillRows.forEach((s) => {
      const arr = skillsByUser.get(s.userId) ?? [];
      arr.push(s.name);
      skillsByUser.set(s.userId, arr);
    });
    const langsByUser = new Map<string, string[]>();
    langRows.forEach((l) => {
      const arr = langsByUser.get(l.userId) ?? [];
      arr.push(l.name);
      langsByUser.set(l.userId, arr);
    });
    const experienceLevelByUser = new Map<string, string | null>();
    const experienceEntriesByUser = new Map<
      string,
      Array<{ startDate: string | null; endDate: string | null }>
    >();
    experienceRows.forEach((e) => {
      const arr = experienceEntriesByUser.get(e.userId) ?? [];
      arr.push({ startDate: e.startDate, endDate: e.endDate });
      experienceEntriesByUser.set(e.userId, arr);
    });
    experienceEntriesByUser.forEach((entries, userId) => {
      experienceLevelByUser.set(userId, this.resolveExperienceLevel(entries));
    });

    const ownerUserId = String(project.userId ?? '');
    return users
      .map((u) => ({
        id: u.id,
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        username: u.username ?? u.id,
        avatarUrl: u.avatarUrl ?? null,
        role: u.recentJobTitle ?? 'Team Member',
        location: u.location ?? null,
        // `rate` is a Postgres `numeric` column — node-postgres returns those
        // as strings (not numbers) to avoid precision loss, so coerce here
        // rather than leaking that quirk to callers expecting a real number.
        rate: u.rate != null ? Number(u.rate) : (u.rateMin ?? null),
        experienceLevel: experienceLevelByUser.get(u.id) ?? null,
        isLead: u.id === String(project.userId),
        isOnline: false,
        skills: skillsByUser.get(u.id) ?? [],
        languages: langsByUser.get(u.id) ?? [],
      }))
      .sort((a, b) => {
        if (a.id === ownerUserId) return -1;
        if (b.id === ownerUserId) return 1;
        return visibleIds.indexOf(a.id) - visibleIds.indexOf(b.id);
      });
  }

  // Total career span across a user's real work-experience rows, bucketed
  // into the same Student/Junior/Mediator/Senior/Guru brackets the
  // checkout page's Experience dropdown already offers (0-2/2-3/3-5/5-10/10+
  // years) — see the Dropdown component in
  // frontend/app/checkout/[slug]/page.tsx.
  private resolveExperienceLevel(
    entries: Array<{ startDate: string | null; endDate: string | null }>,
  ): string | null {
    const starts: number[] = [];
    const ends: number[] = [];
    for (const entry of entries) {
      const start = entry.startDate ? Date.parse(entry.startDate) : NaN;
      if (!Number.isNaN(start)) starts.push(start);
      const end = entry.endDate ? Date.parse(entry.endDate) : NaN;
      ends.push(Number.isNaN(end) ? Date.now() : end);
    }
    if (!starts.length) return null;

    const earliest = Math.min(...starts);
    const latest = Math.max(...ends);
    const years = (latest - earliest) / (1000 * 60 * 60 * 24 * 365.25);

    if (years < 2) return 'Student';
    if (years < 3) return 'Junior';
    if (years < 5) return 'Mediator';
    if (years < 10) return 'Senior';
    return 'Guru';
  }

  async seedFromN8n(dto: Record<string, any>) {
    const { randomUUID } = await import('crypto');
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    if (/undefined|null/i.test(title)) throw new BadRequestException(`Invalid title: "${title}" — category variable was not resolved in n8n`);
    const rawDescription = String(dto.description ?? dto.fullDescription ?? '').trim();
    if (!rawDescription) throw new BadRequestException('description or fullDescription is required');
    // Strip <img> tags whose src is not an absolute http/https URL (relative/local paths from n8n)
    const description = rawDescription.replace(/<img\s[^>]*>/gi, (tag) => {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
      return src.startsWith('http://') || src.startsWith('https://') ? tag : '';
    });

    const rawScope = dto.scope ?? dto.phases ?? dto.projectPhases ?? dto.project_phases
      ?? dto.projectScope ?? dto.project_scope ?? dto.workPhases ?? dto.work_phases ?? [];
    const scope = normalizeN8nScope(Array.isArray(rawScope) ? rawScope : []);
    const { budget, totalHours } = budgetFromScope(scope);
    const durationWeeks = totalHours > 0 ? Math.ceil(totalHours / 40) : null;
    const duration = durationWeeks ? `${durationWeeks} week${durationWeeks !== 1 ? 's' : ''}` : undefined;
    const deliverables = Array.isArray(dto.deliverables) && dto.deliverables.length
      ? dto.deliverables
      : scope.length
      ? await this.deliverablesAdapter.deriveDeliverables(scope)
      : [];

    const duplicate = await this.repo.findOne({ where: { title, createdBy: 'n8n-seed' } });
    if (duplicate) return { ...this.shapeProject(duplicate), _contentType: 'project', _skipped: true };

    const item = this.repo.create({
      listingType: 'project',
      payloadId: `n8n-${randomUUID()}`,
      title,
      description,
      shortDescription: dto.shortDescription ?? undefined,
      skills: toStringArray(dto.skills),
      tags: toStringArray(dto.tags),
      categories: toStringArray(dto.categories ?? dto.category).filter(c => c !== 'null' && c !== 'undefined'),
      category: toStringArray(dto.categories ?? dto.category).filter(c => c !== 'null' && c !== 'undefined')[0] ?? undefined,
      subcategories: toStringArray(dto.subcategories).filter(c => c !== 'null' && c !== 'undefined'),
      industry: toStringArray(dto.industry),
      scope,
      deliverables,
      budget: dto.budget ?? budget ?? undefined,
      estimatedHours: dto.estimatedHours ?? (totalHours > 0 ? totalHours : undefined),
      duration,
      mediaUrls: this.resolveMediaUrls(dto.mediaUrls, dto.categories ?? dto.category ?? []),
      status: ListingStatus.Published,
      createdBy: 'n8n-seed',
      slug: await this.resolveUniqueSlug(title),
    });

    const saved = await this.repo.save(item);
    this.emitAlgoliaUpsert(saved);
    return { ...this.shapeProject(saved), _contentType: 'project' };
  }

  async create(dto: Partial<Project>, userId: string) {
    if (!userId) {
      throw new ForbiddenException('You do not have permission to create a project');
    }

    const writable = this.filterWritableProjectFields(dto);
    const title = this.normalizeRequiredText(writable.title, 'Project title is required');
    const description = this.normalizeRequiredText(
      writable.description,
      'Project description is required',
    );

    const item = this.repo.create({
      ...writable,
      listingType: 'project',
      title,
      description,
      status: ListingStatus.Draft,
      createdBy: userId,
      slug: await this.resolveUniqueSlug(title),
    });

    const saved = await this.repo.save(item);
    this.emitAlgoliaUpsert(saved);
    return this.shapeProject(saved);
  }

  async update(id: string, dto: Partial<Project>, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    const writable = this.filterWritableProjectFields(dto);

    if (Object.prototype.hasOwnProperty.call(writable, 'title')) {
      const title = this.normalizeRequiredText(writable.title, 'Project title cannot be empty');
      writable.title = title;
      writable.slug = await this.resolveUniqueSlug(title, id);
    }

    if (Object.prototype.hasOwnProperty.call(writable, 'description')) {
      writable.description = this.normalizeRequiredText(
        writable.description,
        'Project description cannot be empty',
      );
    }

    if (Object.keys(writable).length === 0) {
      return this.findOne(id);
    }

    await this.repo.update(id, writable);
    const updated = await this.repo.findOne({ where: { id } });
    if (updated) this.emitAlgoliaUpsert(updated);
    return this.findOne(id);
  }

  /**
   * Claim an unowned project. The update is conditional on `userId IS NULL` so
   * the first commit wins: a second concurrent claim matches zero rows and is
   * rejected, rather than silently overwriting the first claimer.
   */
  async claim(id: string, userId: string) {
    if (!userId) throw new ForbiddenException('Sign in to claim a project');

    const result = await this.repo
      .createQueryBuilder()
      .update(Project)
      .set({ userId })
      .where('id = :id', { id })
      .andWhere('"userId" IS NULL')
      .execute();

    if (!result.affected) {
      const existing = await this.repo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Project not found');
      if (existing.userId === userId) return this.findOne(id);
      throw new ConflictException('This project has just been claimed by someone else');
    }

    const claimed = await this.repo.findOne({ where: { id } });
    if (claimed) this.emitAlgoliaUpsert(claimed);
    return this.findOne(id);
  }

  async publish(id: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    await this.repo.update(id, { status: ListingStatus.Published });
    const published = await this.repo.findOne({ where: { id } });
    if (published) this.emitAlgoliaUpsert(published);
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    await this.repo.delete(id);
    this.algoliaClient.emit<void>('listing.deleted', { id }).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit listing.deleted for ${id}: ${err.message}`),
    });
  }

  private assertOwnership(project: Project, userId: string): void {
    if (!userId || project.createdBy !== userId) {
      throw new ForbiddenException('You do not have permission to modify this project');
    }
  }

  private emitAlgoliaUpsert(project: Project): void {
    const payload = {
      id: String(project.id),
      title: project.title,
      description: project.shortDescription ?? project.description?.substring(0, 500) ?? null,
      category: project.category ?? project.categories?.[0] ?? null,
      categories: project.categories ?? [],
      subcategories: project.subcategories ?? [],
      skills: project.skills ?? [],
      tags: project.tags ?? [],
      industries: project.industry ?? [],
      budget: project.budget != null ? Number(project.budget) : null,
      status: project.status,
      slug: project.slug,
    };
    const event = project.status === ListingStatus.Published ? 'listing.updated' : 'listing.created';
    this.algoliaClient.emit<void>(event, payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit ${event} for ${project.id}: ${err.message}`),
    });
  }

  private normalizeRequiredText(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private filterWritableProjectFields(dto: Partial<Project>): Partial<Project> {
    const {
      id: _id,
      slug: _slug,
      status: _status,
      rating: _rating,
      reviewCount: _reviewCount,
      completionsCount: _completionsCount,
      views90d: _views90d,
      adminBoost: _adminBoost,
      featured: _featured,
      createdBy: _createdBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...writable
    } = dto as Project;

    return writable;
  }

  private resolveMediaUrls(mediaUrls: any, categories: any): string[] {
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) return mediaUrls;
    const cats: string[] = Array.isArray(categories)
      ? categories
      : typeof categories === 'string'
      ? [categories]
      : [];
    const cat = cats.map((c) => c.toLowerCase()).join(' ');
    const FALLBACKS: [RegExp, string][] = [
      [/design|ui|ux/, 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=500&fit=crop&q=80'],
      [/ai|ml|machine|data/, 'https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=800&h=500&fit=crop&q=80'],
      [/marketing|seo|growth/, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80'],
      [/content|copy|writ/, 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800&h=500&fit=crop&q=80'],
      [/mobile|ios|android/, 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=500&fit=crop&q=80'],
      [/cloud|devops|infra/, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop&q=80'],
      [/ecommerce|shop|retail/, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80'],
      [/health|medical|clinic/, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop&q=80'],
    ];
    for (const [pattern, url] of FALLBACKS) {
      if (pattern.test(cat)) return [url];
    }
    return ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop&q=80'];
  }

  private async resolveUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(title) || 'project';
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.repo.findOne({
        where: excludeId ? { slug: candidate, id: Not(excludeId) } : { slug: candidate },
        select: ['id'],
      });

      if (!existing) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private deriveBadges(project: Project): string[] {
    const rating = project.rating != null ? Number(project.rating) : 0;
    const reviews = Number(project.reviewCount ?? 0);
    const completions = Number(project.completionsCount ?? 0);
    const badges: string[] = [];

    if (rating >= 4.0 && reviews >= 20) badges.push('top-rated');
    if (rating >= 4.8 && reviews >= 10) badges.push('highly-rated');
    if (completions >= 10) badges.push('proven');
    if (project.featured === true) badges.push('featured');

    return badges;
  }

  private shapeProject(project: Project) {
    const budget =
      project.budget != null && project.budget !== ('' as any)
        ? Number(project.budget)
        : null;
    const rating = project.rating != null ? Number(project.rating) : 0;
    const adminBoost = project.adminBoost != null ? Number(project.adminBoost) : 0;

    return {
      id: String(project.id),
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription ?? null,
      projectType: project.projectType ?? null,
      description: project.description,
      category: project.category ?? project.categories?.[0] ?? 'Software Development',
      categories: project.categories ?? [],
      subcategories: project.subcategories ?? [],
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      projectDatePublished: project.projectDatePublished ?? null,
      durationMonths: project.durationMonths ?? null,
      budget,
      priceMin: budget,
      budgetUsdCents: budget != null ? Math.round(budget * 100) : null,
      estimatedHours: project.estimatedHours ?? null,
      duration: project.duration ?? null,
      mediaUrls: this.resolveMediaUrls(project.mediaUrls, project.categories ?? project.category),
      videoUrl: project.videoUrl ?? null,
      skills: project.skills ?? [],
      tags: project.tags ?? [],
      programmingLanguages: project.programmingLanguages ?? [],
      developmentTech: project.developmentTech ?? [],
      deliverables: project.deliverables ?? [],
      faqs: project.faqs ?? [],
      scope: project.scope ?? [],
      industries: project.industry ?? [],
      relatedProjectIds: project.relatedProjectIds ?? [],
      isTopRated: rating >= 4.0 && Number(project.reviewCount ?? 0) >= 20,
      badges: this.deriveBadges(project),
      recentQuestions: project.recentQuestions ?? [],
      chatEnabled: project.chatEnabled ?? false,
      reportButtonEnabled: project.reportButtonEnabled ?? true,
      shareButtonEnabled: project.shareButtonEnabled ?? true,
      helpButtonEnabled: project.helpButtonEnabled ?? false,
      rating,
      reviewCount: project.reviewCount ?? 0,
      completionsCount: project.completionsCount ?? 0,
      views90d: project.views90d ?? 0,
      adminBoost,
      featured: project.featured ?? false,
    };
  }

  private getSkillsAndTools(project: Project): string[] {
    return Array.from(
      new Set([
        ...(project.skills ?? []),
        ...(project.programmingLanguages ?? []),
        ...(project.developmentTech ?? []),
      ]),
    );
  }


  async getSimilarById(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) return [];
    return this.getSimilarProjects(item);
  }

  private async getSimilarProjects(project: Project) {
    const published = await this.repo.find({
      where: {
        status: ListingStatus.Published,
        listingType: In(['project', 'service']),
      },
      order: { featured: 'DESC', createdAt: 'DESC' },
      take: 200,
    });

    const sourceSkills = new Set(project.skills ?? []);
    const sourceTags = new Set(project.tags ?? []);
    const sourceSubcategories = new Set(project.subcategories ?? []);

    const top = published
      .filter((candidate) => candidate.id !== project.id)
      .map((candidate) => {
        const score =
          this.overlapRatio(sourceSkills, candidate.skills) * 0.5 +
          this.overlapRatio(sourceTags, candidate.tags) * 0.3 +
          this.overlapRatio(sourceSubcategories, candidate.subcategories) * 0.2;

        return {
          candidate,
          score: Number(score.toFixed(3)),
          engagement: this.engagementScore(candidate),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.engagement - a.engagement || b.score - a.score)
      .slice(0, 6);

    const avatarsByProject = await this.resolveTeamAvatars(
      top.map((entry) => entry.candidate),
    );

    return top.map(({ candidate, score }) => ({
      id: String(candidate.id),
      slug: candidate.slug,
      title: candidate.title,
      shortDescription: candidate.shortDescription ?? null,
      thumbnail: candidate.mediaUrls?.[0] ?? null,
      budget:
        candidate.budget != null && candidate.budget !== ('' as any)
          ? Number(candidate.budget)
          : null,
      duration: candidate.duration ?? null,
      rating: candidate.rating != null ? Number(candidate.rating) : 0,
      reviewCount: candidate.reviewCount ?? 0,
      teamAvatars: avatarsByProject.get(String(candidate.id)) ?? [],
      score,
    }));
  }

  private async resolveTeamAvatars(
    projects: Project[],
  ): Promise<Map<string, string[]>> {
    const idsByProject = new Map<string, string[]>();
    const allIds = new Set<string>();
    for (const p of projects) {
      const memberIds =
        Array.isArray(p.teamMemberIds) && p.teamMemberIds.length
          ? p.teamMemberIds
          : p.userId
            ? [String(p.userId)]
            : [];
      idsByProject.set(String(p.id), memberIds);
      memberIds.forEach((id) => allIds.add(id));
    }
    if (allIds.size === 0) return new Map();

    const rows: Array<{ id: string; avatarUrl: string | null }> =
      await this.repo.manager.query(
        `SELECT id::text, "avatarUrl" FROM user_service.users WHERE id = ANY($1::uuid[])`,
        [Array.from(allIds)],
      );
    const avatarById = new Map(rows.map((r) => [r.id, r.avatarUrl]));

    const result = new Map<string, string[]>();
    for (const [projectId, memberIds] of idsByProject) {
      result.set(
        projectId,
        memberIds
          .map((id) => avatarById.get(id))
          .filter((url): url is string => Boolean(url))
          .slice(0, 4),
      );
    }
    return result;
  }

  private async getProjectHistoryRatings(project: Project) {
    if (!project.createdBy || project.createdBy === 'cms-sync') return null;

    const history = await this.repo.find({
      where: {
        listingType: 'project',
        createdBy: project.createdBy,
        status: ListingStatus.Published,
      },
    });

    const eligible = history.filter(
      (candidate) => candidate.id !== project.id && Number(candidate.reviewCount ?? 0) > 0,
    );

    const totalReviews = eligible.reduce(
      (sum, candidate) => sum + Number(candidate.reviewCount ?? 0),
      0,
    );

    if (totalReviews === 0) return null;

    const weightedRating = eligible.reduce(
      (sum, candidate) =>
        sum + Number(candidate.rating ?? 0) * Number(candidate.reviewCount ?? 0),
      0,
    );

    return {
      average: Number((weightedRating / totalReviews).toFixed(2)),
      reviewCount: totalReviews,
      projectCount: eligible.length,
    };
  }

  async addQuestion(projectId: string, question: string, userId: string) {
    if (!userId) {
      throw new ForbiddenException('You must be logged in to ask a question');
    }

    const trimmed = question?.trim();
    if (!trimmed) {
      throw new BadRequestException('Question cannot be empty');
    }

    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const questions = project.recentQuestions ?? [];
    questions.push({ question: trimmed, answer: null });
    await this.repo.update(projectId, { recentQuestions: questions });

    return { question: trimmed, answer: null };
  }

  async answerQuestion(projectId: string, questionIndex: number, answer: string, userId: string) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    this.assertOwnership(project, userId);

    const trimmed = answer?.trim();
    if (!trimmed) {
      throw new BadRequestException('Answer cannot be empty');
    }

    const questions = project.recentQuestions ?? [];
    if (questionIndex < 0 || questionIndex >= questions.length) {
      throw new BadRequestException('Invalid question index');
    }

    questions[questionIndex].answer = trimmed;
    await this.repo.update(projectId, { recentQuestions: questions });

    return questions[questionIndex];
  }

  async getQuestions(projectId: string) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return project.recentQuestions ?? [];
  }

  async getRelatedTerms(projectId: string) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const [
      relatedCategories,
      relatedSkills,
      relatedCategoryGroups,
      relatedSkillGroups,
    ] = await Promise.all([
      this.relatedTerms.relatedCategories([
        ...(project.categories ?? []),
        ...(project.subcategories ?? []),
      ]),
      this.relatedTerms.relatedSkills(this.getSkillsAndTools(project)),
      this.relatedTerms
        .relatedCategoryGroups(project.categories ?? [])
        .catch(() => []),
      this.relatedTerms
        .relatedSkillGroups(this.getSkillsAndTools(project))
        .catch(() => []),
    ]);

    const curatedTags = (groups: Array<{ name: string; items: string[] }>) =>
      groups.flatMap((g) => [g.name, ...(taxonomyChildren(g.name) ?? [])]);
    const relatedSearchTags = [
      ...curatedTags(relatedSkillGroups as Array<{ name: string; items: string[] }>),
      ...curatedTags(relatedCategoryGroups as Array<{ name: string; items: string[] }>),
    ];

    return {
      relatedCategories,
      relatedSkills,
      relatedCategoryGroups,
      relatedSkillGroups,
      relatedSearchTags,
    };
  }

  async reportProject(
    projectId: string,
    dto: ReportProjectDto,
    reporterId?: string,
  ) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    this.logger.warn(
      `[ProjectReport] project=${projectId} reporter=${
        reporterId ?? 'anon'
      } reason="${dto.reason}" attachments=${
        dto.attachments?.length ?? 0
      } description=${
        dto.description ? JSON.stringify(dto.description.slice(0, 200)) : 'n/a'
      }`,
    );

    return { success: true };
  }

  async getRelatedSearches(projectId: string, limit = 60) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const ownTerms = [
      ...(project.skills ?? []),
      ...(project.tags ?? []),
      ...(project.programmingLanguages ?? []),
      ...(project.developmentTech ?? []),
      ...(project.subcategories ?? []),
      ...(project.categories ?? []),
    ]
      .map((t) => t?.trim())
      .filter((t): t is string => !!t);

    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of ownTerms) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= limit) break;
    }
    return out;
  }

  async getRecommendedBySkills(skills: string[], limit = 10) {
    const where = { status: ListingStatus.Published, listingType: 'project' };
    const select: (keyof Project)[] = ['id', 'slug', 'title', 'mediaUrls', 'skills', 'tags', 'subcategories', 'userId'];

    let candidates: Project[];
    if (!skills.length) {
      candidates = await this.repo.find({ where, order: { featured: 'DESC', createdAt: 'DESC' }, take: limit, select });
    } else {
      const published = await this.repo.find({ where, order: { featured: 'DESC', createdAt: 'DESC' }, take: 100, select });
      const sourceSkills = new Set(skills.map((s) => s.toLowerCase()));
      const scored = published
        .map((p) => ({ p, score: this.overlapRatio(sourceSkills, (p.skills ?? []).map((s) => s.toLowerCase())) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      candidates = scored.map((c) => c.p);
    }

    return this.attachMemberAvatars(candidates, !skills.length ? 0 : undefined);
  }

  private async attachMemberAvatars(projects: Project[], fixedScore?: number) {
    if (!projects.length) return [];

    const rawRows: Array<{ id: string; userId: string | null; teamMemberIds: string[] }> = await this.repo.manager.query(
      `SELECT p.id::text, p."userId"::text, p."teamMemberIds"
       FROM listings.project p
       WHERE p.id = ANY($1::uuid[])`,
      [projects.map((p) => p.id)],
    );

    const memberMap = new Map<string, string[]>();
    const allUserIds = new Set<string>();
    for (const row of rawRows) {
      const ids: string[] = Array.isArray(row.teamMemberIds) && row.teamMemberIds.length
        ? row.teamMemberIds
        : row.userId ? [row.userId] : [];
      memberMap.set(row.id, ids);
      ids.forEach((id) => allUserIds.add(id));
    }

    const avatarMap = new Map<string, string | null>();
    if (allUserIds.size) {
      const userRows: Array<{ id: string; avatarUrl: string | null }> = await this.repo.manager.query(
        `SELECT id::text, "avatarUrl" FROM user_service.users WHERE id = ANY($1::uuid[])`,
        [Array.from(allUserIds)],
      );
      userRows.forEach((u) => avatarMap.set(u.id, u.avatarUrl));
    }

    return projects.map((p) => {
      const memberIds = memberMap.get(String(p.id)) ?? [];
      const memberAvatars = memberIds
        .map((id) => avatarMap.get(id) ?? null)
        .filter((url): url is string => !!url);
      return {
        id: String(p.id),
        slug: p.slug,
        title: p.title,
        memberCount: memberIds.length,
        memberAvatars,
        score: fixedScore !== undefined ? fixedScore : 0,
      };
    });
  }

  private overlapRatio(source: Set<string>, candidate: string[] | null | undefined): number {
    if (source.size === 0) return 0;
    const candidateSet = new Set(candidate ?? []);
    let overlap = 0;

    for (const value of source) {
      if (candidateSet.has(value)) overlap += 1;
    }

    return overlap / source.size;
  }

  private engagementScore(p: Project): number {
    return (
      Number(p.views90d ?? 0) * 1 +
      Number(p.reviewCount ?? 0) * 5 +
      Number(p.completionsCount ?? 0) * 10 +
      Number(p.rating ?? 0) * 4 +
      (p.featured ? 25 : 0) +
      Number(p.adminBoost ?? 0)
    );
  }
}
