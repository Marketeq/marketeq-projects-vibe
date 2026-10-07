import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityCondition } from '../utils/types/entity-condition.type';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { hourlyRateForTask } from '../shared/utils/pricing';
import { NullableType } from '../utils/types/nullable.type';
import { ProjectRepository } from './infrastructure/persistence/project.repository';
import { Project } from './interface/project';
import { FilterProjectDto, SortProjectDto } from './dto/query-project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaRepository } from './infrastructure/persistence/media.repository';
import { Media } from './interface/media';
import { PhaseRepository } from './infrastructure/persistence/phase.repository';
import { Phase } from './interface/phase';
import { CreateProjectPhaseDto } from './dto/create-phase.dto';
import { TaskRepository } from './infrastructure/persistence/task.repository';
import { CreateProjectTaskDto } from './dto/create-task.dto';
import { Task } from './interface/task';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ModerationInvalidResponseError,
  ModerationUnavailableError,
  ProjectModerationInput,
  ProjectModerationResult,
  ProjectModerationService,
} from './project-moderation.service';
import { CloudflareStorageService } from './cloudflare-storage.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { CreateModeratedSubcategoryDto } from './dto/create-moderated-subcategory.dto';
import { UpsertProjectDraftDto } from './dto/upsert-project-draft.dto';
import { UpsertProjectScopeDto } from './dto/upsert-project-scope.dto';
import { slugify } from '../shared/utils/slugify';
import sanitizeHtml from 'sanitize-html';
import {
  DELIVERABLES_ADAPTER,
  DeliverablesAdapter,
} from '../project-sync/deliverables/deliverables.adapter';
import { ScopePhaseInput } from '../project-sync/deliverables/deliverables.types';
import { FAQ_ADAPTER, FaqAdapter } from './faq/faq.adapter';
import { FaqContext, FaqSuggestion } from './faq/faq.types';
import { UserProfileClient } from '../shared/user-profile/user-profile.client';

// PMCM-255: fullDescription comes straight from the seller's own browser
// (RichTextEditor, via createProjectDraft/updateProjectDraft below) and was
// never sanitized server-side before being persisted. `sanitize-html` is
// already a real dependency of this service (job-listing.service.ts's
// `sanitiseRichText`) — reused here with an allow-list matching what
// RichTextEditor actually produces (span[data-font-size] for headings, img
// with data-align for inline images, blockquote) rather than job-listing's
// narrower h2-h4/p/ul/ol/li set, which has no image/heading-mark support.
// Mirrors the frontend's sanitizeProjectDescription allow-list
// (frontend/lib/sanitize-html.ts) — no <a>, no custom fonts/CSS beyond
// alignment.
function sanitizeProjectFullDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'blockquote',
      'span',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ],
    allowedAttributes: {
      span: ['data-font-size'],
      img: ['src', 'alt', 'data-align'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      h5: ['style'],
      h6: ['style'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$|^center$|^right$|^justify$/],
      },
    },
    allowedSchemes: ['https', 'http'],
  });
}

type ProjectScopeReplacement = { scope: Phase[]; budgetUsdCents: number };

type PendingScopeReplacement = {
  dto: UpsertProjectScopeDto;
  waiters: Array<{
    resolve: (result: ProjectScopeReplacement) => void;
    reject: (error: unknown) => void;
  }>;
};

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  private readonly pendingScopeReplacements = new Map<
    string,
    PendingScopeReplacement
  >();
  private readonly runningScopeReplacements = new Set<string>();

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly phaseRepository: PhaseRepository,
    private readonly taskRepository: TaskRepository,
    private readonly projectModerationService: ProjectModerationService,
    private readonly cloudflareStorageService: CloudflareStorageService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(DELIVERABLES_ADAPTER)
    private readonly deliverablesAdapter: DeliverablesAdapter,
    @Inject(FAQ_ADAPTER)
    private readonly faqAdapter: FaqAdapter,
    private readonly userProfileClient: UserProfileClient,
  ) {}

  private faqContextFromProject(project: Project): FaqContext {
    return {
      title: project.title,
      listingType: project.listingType,
      categories: project.categories,
      skills: project.skills,
      tags: project.tags,
      durationMonths: project.durationMonths,
      shortDescription: project.shortDescription,
      fullDescription: project.fullDescription,
    };
  }

  private async loadFaqScope(
    projectId: string,
  ): Promise<Array<{ phaseName: string; tasks: string[] }>> {
    try {
      const phases = await this.phaseRepository.findAll({
        filterOptions: { projectId },
      });
      const sorted = [...phases].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      return await Promise.all(
        sorted.map(async (phase, index) => {
          const hydrated =
            (await this.phaseRepository.findOneWithTasks(phase.id)) ?? phase;
          return {
            phaseName:
              hydrated.name || hydrated.stageName || `Phase ${index + 1}`,
            tasks: (hydrated.task ?? [])
              .map((t) => t.taskName)
              .filter(Boolean),
          };
        }),
      );
    } catch {
      return [];
    }
  }

  async suggestFaqs(
    userId: string,
    projectId: string,
  ): Promise<FaqSuggestion[]> {
    const project = await this.ensureProjectOwnership(projectId, userId);
    const scope = await this.loadFaqScope(projectId);
    return this.faqAdapter.suggestFaqs({
      ...this.faqContextFromProject(project),
      scope,
    });
  }

  async suggestFaqAnswer(
    userId: string,
    projectId: string,
    question: string,
  ): Promise<{ answer: string }> {
    const project = await this.ensureProjectOwnership(projectId, userId);
    const scope = await this.loadFaqScope(projectId);
    const answer = await this.faqAdapter.suggestAnswer(
      { ...this.faqContextFromProject(project), scope },
      question,
    );
    return { answer };
  }

  private get shouldSkipModeration(): boolean {
    return process.env.SKIP_CONTENT_MODERATION === 'true';
  }

  private throwIfHttpException(error: unknown): void {
    if (error instanceof HttpException) {
      throw error;
    }
  }

  // QA-196/PMCM-402: "ownership" here also covers anyone on the listing's
  // own team roster (teamMemberIds), not only its literal creator — the
  // editor is expected to be usable by the whole team the owner staffed on
  // this listing, matching the AC's "can access it normally".
  private isProjectMember(project: Project, userId: string): boolean {
    if (project.userId === userId) return true;
    return (project.teamMemberIds ?? [])
      .map((id) => String(id))
      .includes(String(userId));
  }

  private async ensureProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({ id: projectId });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!this.isProjectMember(project, userId)) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  private async ensurePhaseOwnership(
    phaseId: string,
    userId: string,
  ): Promise<Phase> {
    const phase = await this.phaseRepository.findOne({ id: phaseId });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    await this.ensureProjectOwnership(phase.projectId, userId);
    return phase;
  }

  private async ensureTaskOwnership(
    taskId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({ id: taskId });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensurePhaseOwnership(task.phaseId, userId);
    return task;
  }

  private toModerationInput(input: {
    title: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
    categories?: string[] | null;
    subCategories?: string[] | null;
    categorySelections?: { category: string; subCategories: string[] }[] | null;
    tags?: string[] | null;
    faqs?: { question: string; answer: string }[] | null;
    imageUrl?: string | null;
  }): ProjectModerationInput {
    return {
      title: input.title,
      shortDescription: input.shortDescription,
      fullDescription: input.fullDescription,
      categories: input.categories ?? [],
      subCategories: input.subCategories ?? [],
      categorySelections: input.categorySelections ?? [],
      tags: input.tags ?? [],
      faqs: input.faqs ?? [],
      imageUrl: input.imageUrl ?? undefined,
    };
  }

  private async markPublishBlocked(projectId?: string): Promise<void> {
    if (!projectId) return;

    try {
      await this.projectRepository.update(projectId, {
        status: 'publish_blocked',
        projectDatePublished: null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark project ${projectId} as publish_blocked.`,
      );
    }
  }

  private async applyModerationDecision(
    projectId: string,
    moderationResult: ProjectModerationResult,
  ): Promise<Project> {
    let status: 'published' | 'rejected' | 'pending_review' = 'pending_review';
    let projectDatePublished: Date | null = null;

    if (moderationResult.status === 'approved') {
      status = 'published';
      projectDatePublished = new Date();
    } else if (moderationResult.status === 'rejected') {
      status = 'rejected';
    }

    const updatePayload: Partial<Project> = {
      status,
      projectDatePublished,
    };

    if (status === 'published') {
      const media = await this.mediaRepository.find({ projectId });
      const hiddenSet = new Set(media?.hiddenImages ?? []);
      const galleryUrls = [
        media?.featuredImage,
        ...(media?.additionalImages ?? []).filter((url) => !hiddenSet.has(url)),
      ].filter((url): url is string => Boolean(url && url.trim()));
      if (galleryUrls.length > 0) {
        updatePayload.mediaUrls = galleryUrls;
      }

      const proj = await this.projectRepository.findOne({ id: projectId });
      if (proj) {
        updatePayload.publishedSnapshot = {
          title: proj.title,
          subtitle: proj.subtitle ?? null,
          shortDescription: proj.shortDescription ?? null,
          description: proj.fullDescription ?? null,
          categories: proj.categories ?? [],
          subcategories: proj.subCategories ?? [],
          industry: proj.industries ?? [],
          tags: proj.tags ?? [],
          skills: proj.skills ?? [],
          mediaUrls: galleryUrls,
          videoUrl: proj.videoUrl ?? null,
          faqs: proj.faqs ?? [],
          deliverables: proj.deliverables ?? [],
          scope: proj.scope ?? null,
        };
      }
    }

    const moderatedProject = await this.projectRepository.update(
      projectId,
      updatePayload,
    );

    if (status === 'rejected') {
      const moderationReason = moderationResult.reason ?? '';
      const isImageViolation =
        /media|image|animation|blur|policy violation|ai moderation/i.test(
          moderationReason,
        );
      const isVideoViolation =
        /video|unsafe frame|frame_moderation/i.test(moderationReason);
      const isContentViolation =
        /banned keyword|bad words|profanity|content failed validation|content moderation|community guidelines/i.test(
          moderationReason,
        );
      const message = isImageViolation
        ? `Project rejected: image violates moderation policy. ${moderationReason}`.trim()
        : isVideoViolation
          ? `Project rejected: video violates moderation policy. ${moderationReason}`.trim()
          : isContentViolation
            ? `Project rejected: content violates moderation policy (bad words/profanity). ${moderationReason}`.trim()
            : moderationResult.reason
              ? `Project rejected: content violates moderation policy. ${moderationResult.reason}`
              : 'Project rejected: content violates moderation policy.';
      throw new BadRequestException({
        message,
        field: moderationResult.field,
      });
    }

    if (status === 'pending_review') {
      this.logger.warn(
        `Project ${projectId} is pending review. Moderation reason: ${
          moderationResult.reason ?? 'none'
        }`,
      );
    }

    if (!moderatedProject) {
      throw new InternalServerErrorException(
        'Project moderation update failed',
      );
    }

    return moderatedProject;
  }

  private normalizeOptionalVideoUrl(
    rawValue?: string | null,
  ): string | null {
    const trimmed = (rawValue ?? '').trim();
    if (!trimmed) return null;

    if (/^(undefined|null|none|n\/a)$/i.test(trimmed)) {
      return null;
    }

    const normalized = trimmed.replace(/^(https?:\/\/)+/i, 'https://');
    if (!/^https?:\/\//i.test(normalized)) {
      return null;
    }

    return normalized;
  }

  async createModeratedSubcategory(dto: CreateModeratedSubcategoryDto) {
    const categoryServiceUrl =
      (process.env.CATEGORY_SERVICE_URL || 'http://localhost:3023').replace(/\/$/, '');
    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!serviceToken) {
      throw new InternalServerErrorException(
        'INTERNAL_SERVICE_TOKEN is not configured for listings-service.',
      );
    }

    const response = await this.httpService.axiosRef.post(
      `${categoryServiceUrl}/api/categories/user-subcategory/moderated`,
      dto,
      {
        headers: {
          'x-service-token': serviceToken,
        },
        timeout: 5000,
      },
    );

    return response.data;
  }

  async createNewProject(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<Project> {
    try {
      const payload = {
        ...dto,
        userId,
        industries: dto.industries ?? dto.industry ?? [],
        tags: dto.tags ?? [],
        skills: dto.skills ?? [],
        categorySelections: dto.categorySelections ?? [],
        status: 'draft',
        projectDatePublished: null,
      };

      const project = await this.projectRepository.create(payload);

      // Optional inline scope support: persist phases/tasks if provided.
      if (project?.id && dto.scope?.length) {
        for (const phaseDto of dto.scope) {
          const phase = await this.phaseRepository.create({
            name: phaseDto.name,
            stageName: phaseDto.stageName,
            startDay: phaseDto.startDay,
            endDay: phaseDto.endDay,
            order: phaseDto.order,
            projectId: project.id,
          });

          for (const taskDto of phaseDto.tasks ?? []) {
            await this.taskRepository.create({
              taskName: taskDto.taskName,
              role: taskDto.role,
              description: taskDto.description,
              location: taskDto.location,
              experience: taskDto.experience,
              experienceLevel: taskDto.experienceLevel,
              duration: taskDto.duration,
              estimatedHours: taskDto.estimatedHours,
              assigneeUserId: taskDto.assigneeUserId ?? null,
              phaseId: phase.id,
            });
          }
        }
      }

      return project;
    } catch (error) {
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  async createProjectDraft(
    userId: string,
    dto: UpsertProjectDraftDto,
  ): Promise<Project> {
    try {
      const title = dto.title ?? '';
      const payload = {
        title,
        slug: title ? slugify(title) : null,
        subtitle: dto.subtitle ?? null,
        shortDescription: dto.shortDescription ?? '',
        fullDescription: dto.fullDescription
          ? sanitizeProjectFullDescription(dto.fullDescription)
          : '',
        budget: dto.budget ?? null,
        initialTeamBudget: dto.initialTeamBudget ?? null,
        durationMonths: dto.durationMonths ?? null,
        location: dto.location ?? null,
        timezone: dto.timezone ?? null,
        categories: dto.categories ?? [],
        subCategories: dto.subCategories ?? [],
        categorySelections: dto.categorySelections ?? [],
        industries: dto.industries ?? dto.industry ?? [],
        tags: dto.tags ?? [],
        skills: dto.skills ?? [],
        listingType: dto.listingType ?? null,
        status: 'draft',
        projectDatePublished: null,
        userId,
      };

      return await this.projectRepository.create(payload);
    } catch (error) {
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create project draft');
    }
  }

  private signInternalToken(): string {
    const secret = this.configService.get<string>('JWT_SECRET') ?? '';
    return jwt.sign({ sub: 'listings-service' }, secret, { expiresIn: '5m' });
  }

  // Median hourly rate (USD cents) from pricing-service for a role/location/
  // experience. Returns 0 when pricing is unavailable or has no data.
  private async getRateUsdCents(
    role: string,
    location: string | null,
    experienceLevel: string | null,
  ): Promise<number> {
    const base = this.configService.get<string>('PRICING_SERVICE_URL');
    if (!base || !role) return 0;
    // Full 5-level scale, matching ps_platform_rate_averages and Step 4's
    // picker — no collapsing. The old 3-level 'mid' value is not supported;
    // it falls through unmapped and pricing-service's @IsIn rejects it,
    // same zero-rate fallback as any other unresolvable lookup.
    const EXP: Record<string, string> = {
      student: 'student',
      junior: 'junior',
      medior: 'medior',
      senior: 'senior',
      guru: 'guru',
    };
    const experience = experienceLevel
      ? (EXP[experienceLevel.toLowerCase()] ?? experienceLevel.toLowerCase())
      : undefined;
    try {
      // Location is intentionally omitted: task locations are cities
      // (e.g. "New York, NY") while pricing regions are broad ("United States"),
      // so an ILIKE region match never hits. Per PS-04/§7.3, omitting location
      // yields the platform average for the role + experience.
      void location;
      const res = await firstValueFrom(
        this.httpService.get(`${base}/v1/rates`, {
          params: { role, experience },
          headers: { Authorization: `Bearer ${this.signInternalToken()}` },
          timeout: 2000,
        }),
      );
      const data = res.data as any;
      if (data?.noData) return 0;
      return Number(data?.hourlyRateMedianUsdCents) || 0;
    } catch {
      return 0;
    }
  }

  private taskHours(task: Task): number {
    const explicit = Number(task.estimatedHours);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const [rawVal, rawUnit] = String(task.duration ?? '')
      .trim()
      .split(/\s+/);
    const value = Number(rawVal);
    if (!Number.isFinite(value) || value <= 0) return 0;
    const unit = (rawUnit ?? 'days').toLowerCase();
    if (unit.startsWith('hour')) return value;
    if (unit.startsWith('week')) return value * 40;
    if (unit.startsWith('month')) return value * 160;
    return value * 8;
  }

  private taskDurationDays(task: any): number {
    const [rawVal, rawUnit] = String(task.duration ?? '')
      .trim()
      .split(/\s+/);
    const value = Number(rawVal);
    if (!Number.isFinite(value) || value <= 0) return 0;
    const unit = (rawUnit ?? 'days').toLowerCase();
    if (unit.startsWith('week')) return value * 7;
    if (unit.startsWith('month')) return value * 30;
    if (unit.startsWith('hour')) return Math.max(1, Math.ceil(value / 24));
    return value;
  }

  private async calculateProjectBudgetUsdCents(phases: any[]): Promise<number> {
    const tasks: any[] = [];
    for (const phase of phases) {
      for (const task of phase.task ?? []) tasks.push(task);
    }

    const assigneeIds = Array.from(
      new Set(tasks.map((t) => t.assigneeUserId).filter(Boolean)),
    );
    const assignees = await this.userProfileClient.hydrateTeam(assigneeIds);
    const rateByUserId = new Map<string, number>();
    for (const m of assignees) {
      if (m.hourlyRate && m.hourlyRate > 0) {
        rateByUserId.set(m.userId, m.hourlyRate);
      }
    }

    const costs = await Promise.all(
      tasks.map(async (task) => {
        const hours = this.taskHours(task);
        if (hours <= 0) return 0;
        const level = String(
          task.experienceLevel || task.experience?.[0] || 'Medior',
        ).toLowerCase();

        const memberRate = task.assigneeUserId
          ? rateByUserId.get(task.assigneeUserId)
          : undefined;
        if (memberRate) {
          return Math.round(hours * memberRate * 100);
        }

        const location = task.location?.[0] ?? null;
        const pricingCents = await this.getRateUsdCents(
          task.role,
          location,
          task.experienceLevel ?? level,
        );
        const rateCents =
          pricingCents > 0
            ? pricingCents
            : Math.round(
                hourlyRateForTask({
                  roleName: task.role,
                  experienceLevel: task.experienceLevel ?? level,
                  location: task.location,
                }) * 100,
              );
        return Math.round(hours * rateCents);
      }),
    );
    return costs.reduce((sum, c) => sum + c, 0);
  }

  async getProjectDraft(userId: string, projectId: string): Promise<any> {
    const project = await this.ensureProjectOwnership(projectId, userId);

    const media = await this.mediaRepository.find({ projectId: project.id });
    const phases = await this.phaseRepository.findAll({
      filterOptions: { projectId: project.id },
    });

    const scope = await Promise.all(
      phases
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(async (phase) => {
          const hydratedPhase =
            (await this.phaseRepository.findOneWithTasks(phase.id)) ?? phase;

          return {
            ...hydratedPhase,
            task: [...(hydratedPhase.task ?? [])].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            ),
          };
        }),
    );

    const team = await this.userProfileClient.hydrateTeam(
      project.teamMemberIds,
    );
    const projectMembers = await this.projectRepository.getProjectMembers(
      project.id,
    );
    const leadUserId = projectMembers.find((m) => m.isLead)?.userId;
    const teamWithLead = leadUserId
      ? team.map((t: any) => ({
          ...t,
          isLead: String(t.userId ?? t.id ?? '') === String(leadUserId),
        }))
      : team;

    const recentQuestions = await this.projectRepository.getRecentQuestions(
      project.id,
    );

    return {
      ...project,
      media: media ?? null,
      scope,
      team: teamWithLead,
      projectMembers,
      recentQuestions,
      budgetUsdCents: await this.calculateProjectBudgetUsdCents(scope),
    };
  }

  async getProjectMembers(userId: string, projectId: string) {
    await this.ensureProjectOwnership(projectId, userId);
    return this.projectRepository.getProjectMembers(projectId);
  }

  async saveProjectMembers(
    userId: string,
    projectId: string,
    members: Array<{
      userId: string;
      projectRole?: string | null;
      status?: string | null;
      isLead?: boolean | null;
      leadLabel?: string | null;
    }>,
  ) {
    await this.ensureProjectOwnership(projectId, userId);
    await this.projectRepository.upsertProjectMembers(projectId, members ?? []);
    return this.projectRepository.getProjectMembers(projectId);
  }

  async getRecentQuestions(userId: string, projectId: string) {
    await this.ensureProjectOwnership(projectId, userId);
    return this.projectRepository.getRecentQuestions(projectId);
  }

  async saveRecentQuestions(
    userId: string,
    projectId: string,
    questions: Array<{
      id?: string;
      question: string;
      answer?: string | null;
      askedByName?: string | null;
      askedByUsername?: string | null;
      askedAt?: string | null;
      answeredByUserId?: string | null;
      answeredByName?: string | null;
      answeredByRole?: string | null;
      assignedToUserId?: string | null;
      hidden?: boolean;
    }>,
    authToken?: string,
  ) {
    await this.ensureProjectOwnership(projectId, userId);
    const existing = await this.projectRepository.getRecentQuestions(projectId);
    const existingById = new Map(existing.map((q) => [q.id, q] as const));
    const normalized = await Promise.all(
      (questions ?? [])
        .filter((q) => q && typeof q.question === 'string' && q.question.trim())
        .map(async (q) => {
          const answer = q.answer?.trim() ? q.answer : null;
          const hidden = !!q.hidden;
          const prev = q.id ? existingById.get(q.id) : undefined;
          const questionChanged = !prev || prev.question !== q.question;
          const answerChanged = !!answer && (!prev || prev.answer !== answer);
          let moderationFailed = prev?.moderationFailed ?? false;
          if (questionChanged || answerChanged) {
            moderationFailed = false;
            const qStatus = await this.projectModerationService.moderateText(
              q.question,
              projectId,
              authToken,
            );
            if (qStatus !== 'approved') moderationFailed = true;
            if (answer && !moderationFailed) {
              const aStatus = await this.projectModerationService.moderateText(
                answer,
                projectId,
                authToken,
              );
              if (aStatus !== 'approved') moderationFailed = true;
            }
          }
          return {
            id: q.id ?? undefined,
            question: q.question,
            answer,
            askedByName: q.askedByName ?? null,
            askedByUsername: q.askedByUsername ?? null,
            askedAt: q.askedAt ?? null,
            answeredByUserId: answer ? (q.answeredByUserId ?? null) : null,
            answeredByName: answer ? (q.answeredByName ?? null) : null,
            answeredByRole: answer ? (q.answeredByRole ?? null) : null,
            assignedToUserId: q.assignedToUserId ?? null,
            hidden,
            moderationFailed,
          };
        }),
    );
    await this.projectRepository.updateRecentQuestions(projectId, normalized);
    return this.projectRepository.getRecentQuestions(projectId);
  }

  async updateProjectDraft(
    userId: string,
    projectId: string,
    dto: UpsertProjectDraftDto,
  ): Promise<Project> {
    const existing = await this.ensureProjectOwnership(projectId, userId);

    const payload: Partial<Project> = {};

    if (dto.title !== undefined) {
      payload.title = dto.title;
      // PMCM-254: slug is generated from the title on first save only —
      // editing the title afterward must never change it. Previously this
      // regenerated the slug from the title on every update with no check
      // against the project's existing slug, so any title edit after the
      // first save silently changed the published URL.
      if (!existing.slug && dto.title) {
        payload.slug = slugify(dto.title);
      }
    }
    if (dto.subtitle !== undefined) payload.subtitle = dto.subtitle;
    if (dto.shortDescription !== undefined) {
      payload.shortDescription = dto.shortDescription;
    }
    if (dto.fullDescription !== undefined) {
      payload.fullDescription = dto.fullDescription
        ? sanitizeProjectFullDescription(dto.fullDescription)
        : dto.fullDescription;
    }
    if (dto.budget !== undefined) payload.budget = dto.budget;
    if (dto.initialTeamBudget !== undefined) {
      payload.initialTeamBudget = dto.initialTeamBudget;
    }
    if (dto.durationMonths !== undefined) {
      payload.durationMonths = dto.durationMonths;
    }
    if (dto.location !== undefined) payload.location = dto.location;
    if (dto.timezone !== undefined) payload.timezone = dto.timezone;
    if (dto.categories !== undefined) payload.categories = dto.categories;
    if (dto.subCategories !== undefined) {
      payload.subCategories = dto.subCategories;
    }
    if (dto.categorySelections !== undefined) {
      payload.categorySelections = dto.categorySelections;
    }
    if (dto.industries !== undefined || dto.industry !== undefined) {
      payload.industries = dto.industries ?? dto.industry ?? [];
    }
    if (dto.tags !== undefined) payload.tags = dto.tags;
    if (dto.skills !== undefined) payload.skills = dto.skills;
    if (dto.listingType !== undefined) payload.listingType = dto.listingType;
    if (dto.projectType !== undefined) payload.projectType = dto.projectType;
    if (dto.videoUrl !== undefined) payload.videoUrl = dto.videoUrl;
    if (dto.faqs !== undefined) payload.faqs = dto.faqs;
    if (dto.teamMemberIds !== undefined) {
      payload.teamMemberIds = dto.teamMemberIds;
    }
    if (dto.pendingInviteEmails !== undefined) {
      payload.pendingInviteEmails = dto.pendingInviteEmails;
    }

    const updated = await this.projectRepository.update(projectId, payload);
    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    return updated;
  }

  async getProjectDraftBySlug(userId: string, slug: string): Promise<any> {
    const project = await this.projectRepository.findBySlug(slug);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // QA-196/PMCM-402: findBySlug used to filter by userId at the query
    // level, so the row simply never came back for anyone but the literal
    // creator — including a real team member on this listing. The lookup
    // above is unscoped; the access check now happens explicitly here so a
    // team member sees the real listing and a stranger gets a 403 instead
    // of both silently falling through to "not found".
    if (!this.isProjectMember(project, userId)) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const media = await this.mediaRepository.find({ projectId: project.id });
    const phases = await this.phaseRepository.findAll({
      filterOptions: { projectId: project.id },
    });

    const scope = await Promise.all(
      phases
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(async (phase) => {
          const hydratedPhase =
            (await this.phaseRepository.findOneWithTasks(phase.id)) ?? phase;
          return {
            ...hydratedPhase,
            task: [...(hydratedPhase.task ?? [])].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            ),
          };
        }),
    );

    return {
      ...project,
      media: media ?? null,
      scope,
      budgetUsdCents: await this.calculateProjectBudgetUsdCents(scope),
    };
  }

  // QA-195/PMCM-403: mirrors the wizard's own "which required fields are
  // still missing" check (edit-listing/[slug]/page.tsx's firstInvalidStep)
  // at the level of "is the field populated at all" rather than the
  // wizard's exact character-count/regex niceties — this runs for every
  // listing regardless of status, so a Published listing whose content was
  // edited down below what's required after it went live is flagged the
  // same as an unfinished draft. Team is intentionally excluded: PMCM-395
  // made the account owner always satisfy it, so it can never be the
  // reason a listing gets flagged here either.
  private hasUnresolvedRequiredFields(
    project: Project,
    scopedProjectIds: Set<string>,
  ): boolean {
    const missingProjectInfo =
      !project.title?.trim() ||
      !(project.categories ?? []).length ||
      !(project.industries ?? []).length ||
      !(project.tags ?? []).length ||
      !(project.skills ?? []).length ||
      !project.shortDescription?.trim() ||
      !project.fullDescription?.trim();

    const hasFeaturedImage =
      (project.mediaUrls ?? []).length > 0 ||
      Boolean((project.media ?? [])[0]?.featuredImage);

    const completedFaqCount = (project.faqs ?? []).filter(
      (f) => f?.question?.trim() && f?.answer?.trim(),
    ).length;

    return (
      missingProjectInfo ||
      !hasFeaturedImage ||
      !scopedProjectIds.has(String(project.id)) ||
      completedFaqCount < 3
    );
  }

  async getMyProjects(
    userId: string,
  ): Promise<
    (Project & { teamAvatars: string[]; hasValidationError: boolean })[]
  > {
    const projects = await this.projectRepository.findAll({
      filterOptions: {
        userId,
      },
    });

    // Resolve team-member avatars for every project in one pass so the
    // listings cards can render an avatar stack without an N+1 fetch per card.
    const allMemberIds = Array.from(
      new Set(
        projects
          .flatMap((p) =>
            Array.isArray(p.teamMemberIds) ? p.teamMemberIds : [],
          )
          .filter(Boolean)
          .map(String),
      ),
    );
    const hydrated = await this.userProfileClient.hydrateTeam(
      allMemberIds,
      userId,
    );
    const avatarByUserId = new Map(
      hydrated.map((m) => [String(m.userId), m.avatarUrl]),
    );

    const scopedProjectIds = await this.projectRepository.getProjectIdsWithScope(
      projects.map((p) => p.id).filter((id): id is string => !!id),
    );

    return projects.map((p) => {
      const ids = [
        String(userId),
        ...(Array.isArray(p.teamMemberIds) ? p.teamMemberIds.map(String) : []),
      ];
      const teamAvatars = Array.from(new Set(ids))
        .map((id) => avatarByUserId.get(id))
        .filter((url): url is string => Boolean(url));
      return {
        ...p,
        teamAvatars,
        hasValidationError: this.hasUnresolvedRequiredFields(
          p,
          scopedProjectIds,
        ),
      };
    });
  }

  /**
   * Normalizes a service scope to the required shape (docs JL-07) instead of
   * rejecting it — so autosave never fails mid-edit. Runs only when the scope
   * carries phase types (project scopes pass through untouched):
   *   - Setup phases first, Recurring in the middle, Ongoing last (re-ordered).
   *   - Recurring phases get sensible recurrence defaults when missing.
   * The frontend enforces the "one Setup / one Ongoing" UX; if extras slip
   * through they're simply ordered by type, never dropped.
   */
  private normalizeServiceScope(
    phases: CreateProjectPhaseDto[],
  ): CreateProjectPhaseDto[] {
    if (!phases.some((p) => p.phaseType)) return phases;

    const rank = (t?: string) =>
      t === 'setup' ? 0 : t === 'ongoing' ? 2 : 1;

    return [...phases]
      .sort((a, b) => {
        const byType = rank(a.phaseType) - rank(b.phaseType);
        return byType !== 0 ? byType : (a.order ?? 0) - (b.order ?? 0);
      })
      .map((p, index) => ({
        ...p,
        order: index,
        ...(p.phaseType === 'recurring'
          ? {
              recurrenceSchedule: p.recurrenceSchedule ?? 'monthly',
              recurrenceCount: p.recurrenceCount ?? 1,
            }
          : {}),
      }));
  }

  async replaceProjectScope(
    userId: string,
    projectId: string,
    dto: UpsertProjectScopeDto,
  ): Promise<ProjectScopeReplacement> {
    await this.ensureProjectOwnership(projectId, userId);

    // One replace per project at a time, latest payload wins. The listing
    // editor re-sends the whole scope every 2s; when a save outlasted that,
    // identical requests piled up in this process until listings-service ran
    // out of heap (2026-10-03). A request that arrives while a replace is
    // running joins the next run instead of starting its own, and every
    // caller waiting on that run gets its result.
    return new Promise<ProjectScopeReplacement>((resolve, reject) => {
      const pending = this.pendingScopeReplacements.get(projectId);
      if (pending) {
        pending.dto = dto;
        pending.waiters.push({ resolve, reject });
      } else {
        this.pendingScopeReplacements.set(projectId, {
          dto,
          waiters: [{ resolve, reject }],
        });
      }
      void this.drainScopeReplacements(projectId);
    });
  }

  private async drainScopeReplacements(projectId: string): Promise<void> {
    if (this.runningScopeReplacements.has(projectId)) return;
    this.runningScopeReplacements.add(projectId);

    try {
      let next = this.pendingScopeReplacements.get(projectId);
      while (next) {
        this.pendingScopeReplacements.delete(projectId);
        try {
          const result = await this.writeProjectScope(projectId, next.dto);
          next.waiters.forEach((waiter) => waiter.resolve(result));
        } catch (error) {
          next.waiters.forEach((waiter) => waiter.reject(error));
        }
        next = this.pendingScopeReplacements.get(projectId);
      }
    } finally {
      this.runningScopeReplacements.delete(projectId);
    }
  }

  private async writeProjectScope(
    projectId: string,
    dto: UpsertProjectScopeDto,
  ): Promise<ProjectScopeReplacement> {
    const normalizedScope = this.normalizeServiceScope(dto.scope ?? []);

    const scope = await this.phaseRepository.replaceForProject(
      projectId,
      normalizedScope.map((phaseDto) => ({
        name: phaseDto.name,
        stageName: phaseDto.stageName,
        startDay: phaseDto.startDay,
        endDay: phaseDto.endDay,
        order: phaseDto.order,
        phaseType: phaseDto.phaseType ?? null,
        recurrenceSchedule: phaseDto.recurrenceSchedule ?? null,
        recurrenceCount: phaseDto.recurrenceCount ?? null,
        tasks: (phaseDto.tasks ?? []).map((taskDto) => ({
          taskName: taskDto.taskName,
          role: taskDto.role,
          description: taskDto.description,
          location: taskDto.location,
          experience: taskDto.experience,
          experienceLevel: taskDto.experienceLevel,
          duration: taskDto.duration,
          estimatedHours: taskDto.estimatedHours,
          assigneeUserId: taskDto.assigneeUserId ?? null,
        })),
      })),
    );

    // Auto-derive deliverables from the new scope
    try {
      const project = await this.projectRepository.findOne({ id: projectId });
      const projectContext = {
        projectType: project?.categories?.[0] ?? null,
        projectDescription: project?.shortDescription || project?.fullDescription || null,
      };

      const adapterInput: ScopePhaseInput[] = scope.map((phase, index) => ({
        phaseName: phase.name || phase.stageName || `Phase ${index + 1}`,
        order: phase.order ?? index,
        tasks: (phase.task ?? []).map((t) => ({
          title: t.taskName,
          roleName: t.role,
          description: t.description ?? undefined,
        })),
      }));

      const deliverables = await this.deliverablesAdapter.deriveDeliverables(adapterInput, projectContext);
      await this.projectRepository.update(projectId, { deliverables });
    } catch (err) {
      this.logger.warn(`Failed to derive deliverables for project ${projectId}: ${(err as Error).message}`);
    }

    const budgetUsdCents = await this.calculateProjectBudgetUsdCents(scope);

    let totalDays = 0;
    for (const phase of scope) {
      let phaseDays = 0;
      for (const task of phase.task ?? []) {
        phaseDays = Math.max(phaseDays, this.taskDurationDays(task));
      }
      totalDays += phaseDays;
    }
    const durationWeeks =
      totalDays > 0 ? Math.max(1, Math.ceil(totalDays / 7)) : 0;

    let totalHours = 0;
    const scopeSnapshot = scope.map((phase, index) => ({
      phaseName: phase.name || phase.stageName || `Phase ${index + 1}`,
      order: phase.order ?? index,
      phaseType: phase.phaseType ?? null,
      recurrenceSchedule: phase.recurrenceSchedule ?? null,
      recurrenceCount: phase.recurrenceCount ?? null,
      tasks: (phase.task ?? []).map((task) => {
        const hours = this.taskHours(task);
        totalHours += hours;
        return {
          title: task.taskName,
          roleName: task.role,
          location: task.location ?? [],
          experienceLevel:
            task.experienceLevel ?? task.experience?.[0] ?? 'Medior',
          estimatedHours: hours,
          duration: task.duration ?? null,
        };
      }),
    }));

    await this.projectRepository.updatePublishedSnapshot(projectId, {
      budget: budgetUsdCents / 100,
      scope: scopeSnapshot,
      duration: durationWeeks > 0 ? String(durationWeeks) : null,
      estimatedHours: totalHours > 0 ? Math.round(totalHours) : null,
    });

    return { scope, budgetUsdCents };
  }

  async publishExistingProject(
    userId: string,
    projectId: string,
    authToken?: string,
  ): Promise<Project> {
    const project = await this.ensureProjectOwnership(projectId, userId);

    try {
      const media = await this.mediaRepository.find({ projectId: project.id });
      const hasCover =
        !!media?.featuredImage ||
        (Array.isArray(project.mediaUrls) && project.mediaUrls.length > 0);
      if (!hasCover) {
        throw new BadRequestException(
          'Featured image is required before publishing.',
        );
      }

      if (this.shouldSkipModeration) {
        this.logger.warn(
          `Skipping content moderation for project ${project.id} (SKIP_CONTENT_MODERATION=true)`,
        );
        return await this.applyModerationDecision(project.id!, {
          status: 'approved',
        });
      }

      // Moderate every visible image (featured + gallery), not just the
      // cover — a rejected image anywhere in the listing must block publish.
      const hiddenSet = new Set(media?.hiddenImages ?? []);
      const imageUrls = Array.from(
        new Set(
          [media?.featuredImage, ...(media?.additionalImages ?? [])].filter(
            (url): url is string =>
              !!url && url.trim().length > 0 && !hiddenSet.has(url),
          ),
        ),
      );
      for (const url of imageUrls) {
        const imageResult =
          await this.projectModerationService.moderateImageUrl(
            project.id!,
            url,
            authToken,
          );
        if (imageResult.status !== 'approved') {
          return await this.applyModerationDecision(project.id!, imageResult);
        }
      }

      const videoUrl = media?.featuredVideo ?? project.videoUrl ?? undefined;
      if (videoUrl && videoUrl.trim().length > 0) {
        const videoResult =
          await this.projectModerationService.moderateVideoUrl(
            project.id!,
            videoUrl,
          );
        if (videoResult.status !== 'approved') {
          return await this.applyModerationDecision(project.id!, videoResult);
        }
      }

      const moderationResult =
        await this.projectModerationService.moderateProject(
          project.id!,
          this.toModerationInput({
            title: project.title,
            shortDescription: project.shortDescription,
            fullDescription: project.fullDescription,
            categories: project.categories,
            subCategories: project.subCategories,
            categorySelections: project.categorySelections,
            tags: project.tags,
            faqs: project.faqs,
            imageUrl: null,
          }),
          authToken,
        );

      return await this.applyModerationDecision(project.id!, moderationResult);
    } catch (error) {
      if (error instanceof ModerationUnavailableError) {
        await this.markPublishBlocked(project.id);
        throw new ServiceUnavailableException({
          message:
            'Content moderation is currently unavailable. Project was saved but not published.',
          projectId: project.id,
          status: 'publish_blocked',
        });
      }

      if (error instanceof ModerationInvalidResponseError) {
        await this.markPublishBlocked(project.id);
        throw new BadGatewayException({
          message:
            'Content moderation returned an invalid response. Please retry.',
          projectId: project.id,
          status: 'publish_blocked',
        });
      }

      // Re-throw moderation rejections (BadRequestException from
      // applyModerationDecision) and any other HttpException so the client
      // sees the actual rejection reason instead of a generic 500.
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to publish project');
    }
  }

  async unpublishProject(userId: string, projectId: string): Promise<Project> {
    await this.ensureProjectOwnership(projectId, userId);
    const updated = await this.projectRepository.update(projectId, {
      status: 'draft',
      projectDatePublished: null,
    });
    if (!updated) {
      throw new NotFoundException('Project not found');
    }
    return updated;
  }

  async createProjectOfPhase(
    userId: string,
    dto: CreateProjectPhaseDto,
  ): Promise<Phase> {
    try {
      await this.ensureProjectOwnership(dto.projectId, userId);

      const phase = await this.phaseRepository.create({
        name: dto.name,
        stageName: dto.stageName,
        startDay: dto.startDay,
        endDay: dto.endDay,
        order: dto.order,
        projectId: dto.projectId,
      });

      if (dto.tasks?.length) {
        for (const task of dto.tasks) {
          await this.taskRepository.create({
            taskName: task.taskName,
            role: task.role,
            description: task.description,
            location: task.location,
            experience: task.experience,
            experienceLevel: task.experienceLevel,
            duration: task.duration,
            estimatedHours: task.estimatedHours,
            phaseId: phase.id,
          });
        }
      }

      const phaseWithTasks = await this.phaseRepository.findOneWithTasks(
        phase.id,
      );
      return phaseWithTasks ?? phase;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create phase');
    }
  }

  async updateProjectOfPhase(
    userId: string,
    phaseId: string,
    dto: UpdatePhaseDto,
  ): Promise<Phase> {
    try {
      await this.ensurePhaseOwnership(phaseId, userId);
      const data = await this.phaseRepository.update(phaseId, dto);
      if (!data) {
        throw new NotFoundException('Phase not found');
      }
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to update phase');
    }
  }

  async duplicatePhaseWithTasks(userId: string, id: string): Promise<Phase> {
    try {
      await this.ensurePhaseOwnership(id, userId);
      const existingPhase = await this.phaseRepository.findOneWithTasks(id);

      if (!existingPhase) {
        throw new NotFoundException('Phase not found');
      }

      const newPhase = await this.phaseRepository.create({
        name: existingPhase.name,
        stageName: existingPhase.stageName,
        startDay: existingPhase.startDay,
        endDay: existingPhase.endDay,
        order: existingPhase.order,
        projectId: existingPhase.projectId,
      });

      for (const task of existingPhase.task ?? []) {
        await this.taskRepository.create({
          taskName: task.taskName,
          role: task.role,
          description: task.description,
          location: task.location,
          experience: task.experience,
          experienceLevel: task.experienceLevel,
          duration: task.duration,
          estimatedHours: task.estimatedHours,
          phaseId: newPhase.id,
        });
      }

      const phaseWithTasks = await this.phaseRepository.findOneWithTasks(
        newPhase.id,
      );
      return phaseWithTasks ?? newPhase;
    } catch (error) {
      console.error('Error duplicating phase with tasks:', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to duplicate phase');
    }
  }

  async deleteProjectOfPhase(userId: string, phaseId: string): Promise<void> {
    try {
      await this.ensurePhaseOwnership(phaseId, userId);
      const data = await this.phaseRepository.softDelete(phaseId);
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to delete phase');
    }
  }

  async createPhaseOfTask(
    userId: string,
    dto: CreateProjectTaskDto,
  ): Promise<Task> {
    try {
      await this.ensurePhaseOwnership(dto.phaseId, userId);
      const data = await this.taskRepository.create(dto);
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async updatePhaseOfTask(
    userId: string,
    phaseId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    try {
      await this.ensureTaskOwnership(phaseId, userId);
      const data = await this.taskRepository.update(phaseId, dto);
      if (!data) {
        throw new NotFoundException('Task not found');
      }
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async updateMediaGallery(
    userId: string,
    projectId: string,
    additionalImages: string[],
    hiddenImages?: string[],
  ): Promise<Media | null> {
    const project = await this.projectRepository.find({ id: projectId });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }
    const existingMedia = await this.mediaRepository.find({ projectId });
    const featured = existingMedia?.featuredImage ?? '';
    const hidden = hiddenImages ?? existingMedia?.hiddenImages ?? [];
    const hiddenSet = new Set(hidden);
    const galleryUrls = [
      featured,
      ...additionalImages.filter((url) => !hiddenSet.has(url)),
    ].filter((url): url is string => Boolean(url && url.trim()));
    if (project.status !== 'published') {
      await this.projectRepository.update(projectId, { mediaUrls: galleryUrls });
    }
    if (!existingMedia) {
      return this.mediaRepository.create({
        projectId,
        additionalImages,
        hiddenImages: hidden,
        featuredImage: '',
      } as any);
    }
    return this.mediaRepository.update(existingMedia.id, {
      additionalImages,
      hiddenImages: hidden,
    });
  }

  async createProjectOfMedia(
    userId: string,
    files: {
      featuredImage?: Express.Multer.File;
      additionalImages?: Express.Multer.File[];
      featuredVideo?: Express.Multer.File;
    },
    dto: CreateMediaDto,
  ): Promise<Media> {
    try {
      const project = await this.ensureProjectOwnership(dto.projectId, userId);

      if (files.additionalImages && files.additionalImages.length > 8) {
        throw new BadRequestException('You can upload a maximum of 8 images.');
      }

      const existingMedia = await this.mediaRepository.find({
        projectId: dto.projectId,
      });

      const resolvedVideoUrl = this.normalizeOptionalVideoUrl(
        dto.videoUrl ??
          (dto as CreateMediaDto & { featuredVideo?: string }).featuredVideo,
      );

      const uploadedFeaturedVideo = files.featuredVideo;
      let persistedVideoUrl: string | null = null;

      if (uploadedFeaturedVideo) {
        const featuredVideoUpload =
          await this.cloudflareStorageService.uploadProjectMedia(
            dto.projectId,
            uploadedFeaturedVideo,
          );
        persistedVideoUrl = featuredVideoUpload.url;
      } else if (resolvedVideoUrl) {
        persistedVideoUrl = resolvedVideoUrl;
      }

      const clearFeatured =
        (dto as CreateMediaDto & { clearFeatured?: string }).clearFeatured ===
        'true';
      let featuredImageUrl: string;
      if (files.featuredImage) {
        const featuredImageUpload =
          await this.cloudflareStorageService.uploadProjectMedia(
            dto.projectId,
            files.featuredImage,
          );
        featuredImageUrl = featuredImageUpload.url;
      } else if (dto.featuredImage) {
        featuredImageUrl = dto.featuredImage;
      } else if (clearFeatured) {
        // QA-176/PMCM-396: only the pure-clear path reaches here — a
        // request that also supplies a replacement (files.featuredImage or
        // dto.featuredImage above) never falls through to this branch, so
        // this is exactly "delete would leave the slot empty." A published
        // listing can't be left without a featured image; draft listings
        // are unrestricted, matching the pre-existing behavior below.
        if (project.status === 'published') {
          throw new BadRequestException(
            'The featured image cannot be deleted on a published listing until a replacement image is uploaded.',
          );
        }
        featuredImageUrl = '';
      } else {
        throw new BadRequestException('Featured image is required.');
      }

      const additionalImageUploads = await Promise.all(
        (files.additionalImages ?? []).map((file) =>
          this.cloudflareStorageService.uploadProjectMedia(dto.projectId, file),
        ),
      );
      const uploadedAdditionalUrls = additionalImageUploads.map(
        (image) => image.url,
      );
      const mergedAdditionalImages = [
        ...(dto.additionalImages ?? []),
        ...uploadedAdditionalUrls,
      ];
      const replaceAdditional =
        (dto as CreateMediaDto & { replaceAdditional?: string })
          .replaceAdditional === 'true';
      const hasProvidedAdditional =
        replaceAdditional ||
        dto.additionalImages !== undefined ||
        uploadedAdditionalUrls.length > 0;

      // Upsert: update existing media record if one exists, otherwise create
      let media: Media;
      const isGalleryUpload = dto.target === 'additional';
      const mediaPayload = {
        featuredImage: isGalleryUpload
          ? (existingMedia?.featuredImage ?? '')
          : featuredImageUrl,
        additionalImages: isGalleryUpload
          ? [...(existingMedia?.additionalImages ?? []), featuredImageUrl]
          : hasProvidedAdditional
            ? mergedAdditionalImages
            : (existingMedia?.additionalImages ?? []),
        hiddenImages:
          (dto as CreateMediaDto & { replaceHidden?: string }).replaceHidden ===
            'true' || dto.hiddenImages !== undefined
            ? (dto.hiddenImages ?? [])
            : (existingMedia?.hiddenImages ?? []),
        featuredVideo:
          persistedVideoUrl ?? existingMedia?.featuredVideo ?? undefined,
        projectId: dto.projectId,
      };
      if (existingMedia?.id) {
        const updated = await this.mediaRepository.update(existingMedia.id, mediaPayload);
        if (!updated) throw new InternalServerErrorException('Failed to update media');
        media = updated;
      } else {
        media = await this.mediaRepository.create(mediaPayload);
      }

      const hiddenSet = new Set(mediaPayload.hiddenImages ?? []);
      const galleryUrls = [
        mediaPayload.featuredImage,
        ...(mediaPayload.additionalImages ?? []).filter(
          (url) => !hiddenSet.has(url),
        ),
      ].filter((url): url is string => Boolean(url && url.trim()));
      if (project.status !== 'published') {
        if (galleryUrls.length > 0) {
          await this.projectRepository.update(dto.projectId, {
            mediaUrls: galleryUrls,
          });
        } else if (clearFeatured) {
          await this.projectRepository.update(dto.projectId, {
            mediaUrls: [],
          });
        }
      }

      return { ...media, url: featuredImageUrl } as Media;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      if (error instanceof Error && error.message) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException('Failed to upload media');
    }
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
    sortOptions?: SortProjectDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Project[]> {
    return this.projectRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findAll({
    filterOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
  }): Promise<Project[]> {
    return this.projectRepository.findAll({ filterOptions });
  }

  findOne(fields: EntityCondition<Project>): Promise<NullableType<Project>> {
    return this.projectRepository.findOne(fields);
  }

  find(fields: EntityCondition<Project>): Promise<NullableType<Project>> {
    return this.projectRepository.find(fields);
  }

  // async update(
  //   id: Project['id'],
  //   payload: DeepPartial<Project>,
  // ): Promise<Project | null> {
  //   const clonedPayload = { ...payload };

  //   // if (
  //   //   clonedPayload.password &&
  //   //   clonedPayload.previousPassword !== clonedPayload.password
  //   // ) {
  //   //   const salt = await bcrypt.genSalt();
  //   //   clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
  //   // }

  //   // if (clonedPayload.email) {
  //   //   const userObject = await this.projectRepository.findOne({
  //   //     email: clonedPayload.email,
  //   //   });

  //   //   if (userObject?.id !== id) {
  //   //     throw new HttpException(
  //   //       {
  //   //         status: HttpStatus.UNPROCESSABLE_ENTITY,
  //   //         errors: {
  //   //           email: 'emailAlreadyExists',
  //   //         },
  //   //       },
  //   //       HttpStatus.UNPROCESSABLE_ENTITY,
  //   //     );
  //   //   }
  //   // }

  //   // return this.projectRepository.update(id, clonedPayload);
  // }

  // QA-202/PMCM-403: this existed but was never wired to a controller route
  // — "Delete project" on the dashboard card menu had nowhere to call. Also
  // had no authorization check at all (would soft-delete any project by id
  // for any authenticated caller); ensureProjectOwnership now gates it the
  // same as every other mutating project endpoint in this service.
  async softDelete(userId: string, id: string): Promise<void> {
    await this.ensureProjectOwnership(id, userId);
    // Unpublish before deleting. search-service's DB fallback lists
    // listings by raw SQL on status = 'published' with no deletedAt check,
    // and this service never removes them from Algolia — a deleted listing
    // left as 'published' stays in marketplace search, linking to a 404.
    await this.projectRepository.update(id, {
      status: 'draft',
      projectDatePublished: null,
    });
    await this.projectRepository.softDelete(id);
  }

  async me(id: Project['id']) {
    const user = await this.findOne({
      id: id,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          errors: {
            message: 'Unauthorized',
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { user };
  }
}
