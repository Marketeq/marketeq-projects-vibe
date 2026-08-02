import {
  Injectable,
  Logger,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import sanitizeHtml from "sanitize-html";
import { v4 as uuidv4 } from "uuid";
import { JobListing } from "../entities/job-listing.entity";
import { TeamMemberRow } from "../entities/job-listing-role-row.entity";
import { BasicInformation } from "../entities/job-listing-basic-info.entity";
import { RoleDescription } from "../entities/job-listing-role-description.entity";
import { JobListingStatus } from "../enums/job-listing-status.enum";
import { JobListingType } from "../enums/job-listing-type.enum";
import { ContractType } from "../enums/contract-type.enum";
import { WorkType } from "../enums/work-type.enum";
import { HiringType } from "../enums/hiring-type.enum";
import { PresignBriefUploadDto } from "../dto/presign-brief-upload.dto";
import { CreateJobListingDto } from "../dto/create-job-listing.dto";
import { UpdateJobListingDto } from "../dto/update-job-listing.dto";
import { UpdateBasicInformationDto } from "../dto/update-basic-info.dto";
import { SendInvitesDto } from "../dto/send-invites.dto";
import { ListJobListingsQueryDto } from "../dto/list-job-listings-query.dto";
import { CreateRoleRowDto } from "../dto/create-role-row.dto";
import { UpdateRoleDescriptionDto } from "../dto/update-role-description.dto";
import { JobListingInviteService } from "./job-listing-invite.service";
import { JobListingBriefStorageService } from "./job-listing-brief-storage.service";
import { JobListingScopeService } from "./job-listing-scope.service";
import { JobListingEventsPublisher } from "../events/job-listing-events.publisher";

// ── Rich text helpers (exported so publish service can reuse wordCount) ───────

export function sanitiseRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li"],
    allowedAttributes: {},
  });
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(html: string): number {
  const plain = plainTextFromHtml(html);
  return plain.split(/\s+/).filter((w) => w.length > 0).length;
}

@Injectable()
export class JobListingService {
  private readonly logger = new Logger(JobListingService.name);

  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
    @InjectRepository(TeamMemberRow)
    private readonly roleRowRepo: Repository<TeamMemberRow>,
    @InjectRepository(BasicInformation)
    private readonly basicInfoRepo: Repository<BasicInformation>,
    @InjectRepository(RoleDescription)
    private readonly roleDescriptionRepo: Repository<RoleDescription>,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly inviteService: JobListingInviteService,
    private readonly briefStorage: JobListingBriefStorageService,
    private readonly publisher: JobListingEventsPublisher,
    private readonly scopeService: JobListingScopeService,
  ) {}

  private inferListingType(input: {
    listingType?: JobListingType | null;
    workType?: WorkType | null;
    hiringType?: HiringType | null;
  }): JobListingType | undefined {
    if (input.listingType) return input.listingType;
    if (input.workType === WorkType.PROJECT) return JobListingType.PROJECT;
    if (input.workType === WorkType.SERVICE) return JobListingType.SERVICE;
    if (input.hiringType === HiringType.TEAM) return JobListingType.TEAM;
    if (input.hiringType === HiringType.INDIVIDUAL)
      return JobListingType.INDIVIDUAL;
    return undefined;
  }

  private async attachInheritedScope<T extends JobListing>(
    listing: T,
  ): Promise<T & { inheritedScope?: any[] }> {
    if (listing.contractType !== ContractType.EXISTING || !listing.contractId) {
      return listing;
    }

    const inheritedScope = await this.scopeService.loadInheritedScope(
      listing.contractId,
    );
    return Object.assign(listing, { inheritedScope });
  }

  // Called during create() when contractType is EXISTING.
  // Validates the selected contract is in a selectable status and the user
  // has owner or lead permission on it. Throws 409 or 403 otherwise.
  async validateContractSelectable(
    contractId: string,
    userId: string,
  ): Promise<void> {
    const url = `${this.config.get("CONTRACTS_SERVICE_URL")}/v1/contracts/${contractId}`;
    const response = await firstValueFrom(
      this.http.get(url, { headers: { "x-user-id": userId } }),
    );
    const contract = response.data;

    const SELECTABLE_STATUSES = ["active", "paused"];
    if (!SELECTABLE_STATUSES.includes(contract.status)) {
      const reason =
        {
          disputed: "Contract is under dispute.",
          expired: "Contract has expired.",
          closed: "Contract is closed.",
        }[contract.status as string] ??
        "Contract is not available for new job listings.";

      throw new ConflictException({
        code: "JL_CONTRACT_NOT_SELECTABLE",
        message: reason,
      });
    }

    const hasPermission = contract.members?.some(
      (m: { userId: string; role: string }) =>
        m.userId === userId && ["owner", "lead"].includes(m.role),
    );
    if (!hasPermission) {
      throw new ForbiddenException({
        code: "JL_CONTRACT_FORBIDDEN",
        message:
          "You do not have permission to add job listings to this contract.",
      });
    }
  }

  async setStatus(
    listingId: string,
    status: JobListingStatus,
    extra?: Partial<JobListing>,
  ): Promise<void> {
    const update: Partial<JobListing> = { status, ...extra };

    // Record publishedAt on first transition to published (moderation approval).
    if (status === JobListingStatus.PUBLISHED) {
      const listing = await this.repo.findOne({ where: { id: listingId } });
      if (listing && !listing.publishedAt) {
        update.publishedAt = new Date();
      }
    }

    await this.repo.update(listingId, update as any);
  }

  // Returns a fully-loaded listing with all relations needed by AlgoliaService.
  async findOneInternal(listingId: string): Promise<JobListing> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: [
        "basicInformation",
        "roleDescriptions",
        "teamMemberRows",
        "phases",
        "phases.tasks",
      ],
    });

    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    return listing;
  }

  async linkContract(listingId: string, contractId: string): Promise<void> {
    const result = await this.repo.update(listingId, {
      contractId,
      lastActivityAt: new Date(),
    });

    if (!result.affected) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    this.logger.log(
      `Job listing linked to contract: listingId=${listingId} contractId=${contractId}`,
    );
  }

  // Called when contractType is EXISTING during create().
  // Fetches the parent contract from contracts-service and copies
  // budget, duration, NDA, and contract link onto the listing record.
  async populateFromContract(
    listingId: string,
    contractId: string,
  ): Promise<void> {
    const url = `${this.config.get("CONTRACTS_SERVICE_URL")}/v1/contracts/${contractId}`;
    const response = await firstValueFrom(this.http.get(url));
    const contract = response.data;

    await this.repo.update(listingId, {
      contractId,
      budgetAmountUsdCents: contract.budgetAmountUsdCents,
      budgetFrequency: contract.budgetFrequency,
      durationMonths: contract.durationMonths,
      isOngoing: contract.isOngoing,
      ndaEnabled: contract.ndaEnabled,
      ndaDocumentId: contract.ndaDocumentId ?? null,
      ndaScopeVisibility: contract.ndaScopeVisibility,
      inviteBalance: 0, // Calculated properly on publish.
    });
  }

  async create(userId: string, dto: CreateJobListingDto): Promise<JobListing> {
    if (dto.contractType === ContractType.EXISTING && dto.contractId) {
      await this.validateContractSelectable(dto.contractId, userId);
    }

    const listing = this.repo.create({
      clientUserId: userId,
      contractType: dto.contractType,
      scopeKnowledge: dto.scopeKnowledge ?? null,
      workType: dto.workType ?? null,
      hiringType: dto.hiringType ?? null,
      listingType: this.inferListingType(dto) ?? null,
      status: JobListingStatus.DRAFT,
      lastActivityAt: new Date(),
    });

    const saved = await this.repo.save(listing);

    if (dto.contractType === ContractType.EXISTING && dto.contractId) {
      await this.populateFromContract(saved.id, dto.contractId);
    }

    this.publisher.emit("job_listing.created", {
      listingId: saved.id,
      clientUserId: saved.clientUserId,
      contractType: saved.contractType,
      listingType: saved.listingType,
    });

    this.logger.log(`Job listing created: ${saved.id}`);
    return (await this.repo.findOne({ where: { id: saved.id } }))!;
  }

  async findAll(
    userId: string,
    query: ListJobListingsQueryDto,
  ): Promise<JobListing[]> {
    const where: Record<string, unknown> = { clientUserId: userId };
    if (query.status) where.status = query.status;
    if (query.type) where.listingType = query.type;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.repo.find({
      where: where as any,
      relations: [
        "basicInformation",
        "teamMemberRows",
        "phases",
        "phases.tasks",
      ],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(_userId: string, listingId: string): Promise<JobListing> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: [
        "basicInformation",
        "roleDescriptions",
        "teamMemberRows",
        "phases",
        "phases.tasks",
      ],
    });

    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    return this.attachInheritedScope(listing);
  }

  async update(
    _userId: string,
    listingId: string,
    dto: UpdateJobListingDto,
  ): Promise<JobListing> {
    const fields: Partial<JobListing> = {};
    const existing = await this.repo.findOne({ where: { id: listingId } });

    if (!existing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    if (dto.scopeKnowledge !== undefined)
      fields.scopeKnowledge = dto.scopeKnowledge;
    if (dto.workType !== undefined) fields.workType = dto.workType;
    if (dto.hiringType !== undefined) fields.hiringType = dto.hiringType;
    if (dto.listingType !== undefined) fields.listingType = dto.listingType;
    if (dto.description !== undefined) fields.description = dto.description;
    if (dto.deliverables !== undefined) fields.deliverables = dto.deliverables;
    if (dto.successCriteria !== undefined)
      fields.successCriteria = dto.successCriteria;
    if (dto.headcount !== undefined) fields.headcount = dto.headcount;
    if (dto.budgetFrequency !== undefined)
      fields.budgetFrequency = dto.budgetFrequency;
    if (dto.durationMonths !== undefined)
      fields.durationMonths = dto.durationMonths;
    if (dto.isOngoing !== undefined) fields.isOngoing = dto.isOngoing;
    if (
      dto.ndaEnabled !== undefined &&
      existing.contractType !== ContractType.EXISTING
    ) {
      fields.ndaEnabled = dto.ndaEnabled;
    }
    if (dto.ndaScopeVisibility !== undefined)
      fields.ndaScopeVisibility = dto.ndaScopeVisibility;
    if (dto.lastCompletedStep !== undefined)
      fields.lastCompletedStep = dto.lastCompletedStep;

    if (dto.listingType === undefined) {
      const inferredListingType = this.inferListingType({
        workType: dto.workType ?? existing.workType,
        hiringType: dto.hiringType ?? existing.hiringType,
      });
      if (inferredListingType && inferredListingType !== existing.listingType) {
        fields.listingType = inferredListingType;
      }
    }

    if (dto.budgetAmount !== undefined) {
      fields.budgetAmountUsdCents = await this.convertToUsdCents(
        dto.budgetAmount,
        dto.budgetDisplayCurrency,
      );
    }

    fields.lastActivityAt = new Date();
    fields.staleWarningSent = false;

    await this.repo.update(listingId, fields as any);

    const updated = (await this.repo.findOne({
      where: { id: listingId },
      relations: [
        "basicInformation",
        "roleDescriptions",
        "teamMemberRows",
        "phases",
        "phases.tasks",
      ],
    }))!;

    return this.attachInheritedScope(updated);
  }

  async updateBasicInformation(
    listingId: string,
    dto: UpdateBasicInformationDto,
  ): Promise<BasicInformation> {
    const normalizedTitle =
      typeof dto.title === "string" ? dto.title.trim() : undefined;
    const normalizedJobType =
      dto.jobType === null
        ? null
        : typeof dto.jobType === "string"
          ? dto.jobType.trim()
          : undefined;

    const listing = await this.repo.findOne({
      where: { id: listingId },
      select: ["id"],
    });

    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    let basicInfo = await this.basicInfoRepo.findOne({
      where: { jobListingId: listingId },
    });

    if (!basicInfo) {
      basicInfo = this.basicInfoRepo.create({
        jobListingId: listingId,
        title: normalizedTitle ?? "",
        jobType: normalizedJobType ?? null,
        industries: dto.industries ?? [],
        languages: dto.languages ?? [],
      });
    } else {
      if (normalizedTitle !== undefined) basicInfo.title = normalizedTitle;
      if (normalizedJobType !== undefined)
        basicInfo.jobType = normalizedJobType;
      if (dto.industries !== undefined) basicInfo.industries = dto.industries;
      if (dto.languages !== undefined) basicInfo.languages = dto.languages;
    }

    return this.basicInfoRepo.save(basicInfo);
  }

  async softDelete(listingId: string): Promise<void> {
    const listing = await this.repo.findOne({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    const closedAt = new Date();
    await this.repo.update(listingId, {
      status: JobListingStatus.CLOSED,
      closedAt,
    });

    const payload = {
      listingId,
      clientUserId: listing.clientUserId,
      algoliaObjectId: listing.algoliaObjectId,
    };

    this.publisher.emit("job_listing.closed", {
      ...payload,
      closedAt: closedAt.toISOString(),
    });
    this.publisher.emit("job_listing.deleted", {
      ...payload,
      deletedAt: closedAt.toISOString(),
    });
  }

  async duplicateRole(listingId: string, roleRowId: string): Promise<void> {
    const row = await this.roleRowRepo.findOne({
      where: { id: roleRowId, jobListingId: listingId },
    });

    if (!row) {
      throw new NotFoundException({
        code: "JL_ROLE_NOT_FOUND",
        message: "Role row not found.",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
    const duplicate = this.roleRowRepo.create({
      ...rest,
      positionOrder: row.positionOrder + 1,
      assignedUserId: null,
      assignedUsername: null,
      assignedUserDeactivated: false,
    });

    await this.roleRowRepo.save(duplicate);
  }

  async createRoleRow(
    listingId: string,
    dto: CreateRoleRowDto,
  ): Promise<TeamMemberRow> {
    const roleTitle = dto.role?.trim();
    if (!roleTitle) {
      throw new BadRequestException({
        code: "JL_ROLE_TITLE_REQUIRED",
        message: "Role title is required.",
      });
    }

    let positionOrder = dto.positionOrder;
    if (positionOrder === undefined) {
      const maxResult = await this.roleRowRepo
        .createQueryBuilder("row")
        .select("COALESCE(MAX(row.positionOrder), -1)", "maxOrder")
        .where("row.jobListingId = :listingId", { listingId })
        .getRawOne<{ maxOrder: string | number }>();

      positionOrder = Number(maxResult?.maxOrder ?? -1) + 1;
    }

    const roleRow = this.roleRowRepo.create({
      jobListingId: listingId,
      roleTitle,
      positionOrder,
      assignedUserId: dto.assignedUserId ?? null,
      assignedUsername: null,
      assignedUserDeactivated: false,
      location: null,
      experienceLevel: null,
      customHours: null,
      customFrequency: null,
      contractLengthMonths: null,
      hourlyRateLowUsdCents: null,
      hourlyRateHighUsdCents: null,
    });

    return this.roleRowRepo.save(roleRow);
  }

  async listRoleDescriptions(listingId: string): Promise<RoleDescription[]> {
    return this.roleDescriptionRepo.find({
      where: { jobListingId: listingId },
      order: { createdAt: "ASC" },
    });
  }

  async saveRoleDescription(
    listingId: string,
    roleTitle: string,
    dto: UpdateRoleDescriptionDto,
  ): Promise<RoleDescription> {
    const normalizedRoleTitle = roleTitle.trim();
    if (!normalizedRoleTitle) {
      throw new BadRequestException({
        code: "JL_ROLE_TITLE_REQUIRED",
        message: "Role title is required.",
      });
    }

    const listing = await this.repo.findOne({
      where: { id: listingId },
      select: ["id"],
    });
    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    for (const [field, value] of Object.entries({
      overview: dto.overview,
      benefits: dto.benefits,
      responsibilities: dto.responsibilities,
    })) {
      if (value !== undefined && wordCount(value) > 100) {
        throw new BadRequestException({
          code: "JL_ROLE_DESCRIPTION_TOO_LONG",
          message: `${field} must not exceed 100 words.`,
        });
      }
    }

    let roleDescription = await this.roleDescriptionRepo.findOne({
      where: { jobListingId: listingId, roleTitle: normalizedRoleTitle },
    });

    if (!roleDescription) {
      roleDescription = this.roleDescriptionRepo.create({
        jobListingId: listingId,
        roleTitle: normalizedRoleTitle,
        overview: null,
        benefits: null,
        responsibilities: null,
        skills: [],
      });
    }

    if (dto.overview !== undefined) roleDescription.overview = dto.overview;
    if (dto.benefits !== undefined) roleDescription.benefits = dto.benefits;
    if (dto.responsibilities !== undefined)
      roleDescription.responsibilities = dto.responsibilities;
    if (dto.skills !== undefined) roleDescription.skills = dto.skills;
    roleDescription.updatedAt = new Date();

    await this.repo.update(listingId, {
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return this.roleDescriptionRepo.save(roleDescription);
  }

  async saveGeneratedRoleDescriptions(
    listingId: string,
    descriptions: Array<{
      roleTitle: string;
      overview?: string;
      benefits?: string;
      responsibilities?: string;
      skills?: string[];
    }>,
  ): Promise<RoleDescription[]> {
    const saved: RoleDescription[] = [];

    for (const description of descriptions) {
      saved.push(
        await this.saveRoleDescription(listingId, description.roleTitle, {
          overview: description.overview,
          benefits: description.benefits,
          responsibilities: description.responsibilities,
          skills: description.skills,
        }),
      );
    }

    return saved;
  }

  resolveSmartAssistantRoleTitle(
    listing: JobListing,
    preferredRoleTitle?: string,
  ): string {
    const normalizedPreferred = preferredRoleTitle?.trim();
    if (normalizedPreferred) return normalizedPreferred;

    const existingRoleDescription = listing.roleDescriptions?.find((role) =>
      role.roleTitle?.trim(),
    );
    if (existingRoleDescription?.roleTitle)
      return existingRoleDescription.roleTitle;

    const teamRole = listing.teamMemberRows?.find((row) =>
      row.roleTitle?.trim(),
    );
    if (teamRole?.roleTitle) return teamRole.roleTitle;

    const taskRole = listing.phases
      ?.flatMap((phase) => phase.tasks ?? [])
      .find((task) => task.roleTitle?.trim());
    if (taskRole?.roleTitle) return taskRole.roleTitle;

    return "General";
  }

  async applySmartAssistantFieldValue(
    listing: JobListing,
    field: string,
    value: unknown,
    roleTitle?: string,
  ): Promise<void> {
    const stringValue = typeof value === "string" ? value : String(value ?? "");

    if (field === "title") {
      await this.updateBasicInformation(listing.id, { title: stringValue });
      await this.repo.update(listing.id, {
        lastActivityAt: new Date(),
        staleWarningSent: false,
      });
      return;
    }

    if (!["overview", "benefits", "responsibilities"].includes(field)) {
      throw new BadRequestException({
        code: "JL_SMART_ASSISTANT_FIELD_UNSUPPORTED",
        message:
          "Smart Assistant can only edit title, overview, benefits, or responsibilities.",
      });
    }

    const targetRoleTitle = this.resolveSmartAssistantRoleTitle(
      listing,
      roleTitle,
    );
    await this.saveRoleDescription(listing.id, targetRoleTitle, {
      [field]: stringValue,
    } as UpdateRoleDescriptionDto);
  }

  async recordSmartAssistantFieldEdit(
    listing: JobListing,
    field: string,
    before: string,
    after: string,
    command: string,
    roleTitle?: string,
  ): Promise<void> {
    const history = [
      ...(listing.smartAssistantHistory ?? []),
      {
        id: uuidv4(),
        field,
        before,
        after,
        command,
        createdAt: new Date().toISOString(),
        ...(roleTitle ? { roleTitle } : {}),
      },
    ];

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    await this.repo.update(listing.id, {
      smartAssistantHistory: history as any,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });
  }

  async restoreSmartAssistantFieldEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{ field: string; restoredValue: unknown }> {
    const entry = (listing.smartAssistantHistory ?? []).find(
      (item) => item.id === historyId && item.field !== "scope",
    );

    if (!entry) {
      throw new NotFoundException({
        code: "JL_SMART_ASSISTANT_HISTORY_NOT_FOUND",
        message: "Smart Assistant history entry not found.",
      });
    }

    await this.applySmartAssistantFieldValue(
      listing,
      entry.field,
      entry.after,
      entry.roleTitle,
    );

    const history = [
      ...(listing.smartAssistantHistory ?? []),
      {
        id: uuidv4(),
        field: entry.field,
        before: entry.before,
        after: entry.after,
        command: `restore:${historyId}`,
        createdAt: new Date().toISOString(),
        ...(entry.roleTitle ? { roleTitle: entry.roleTitle } : {}),
      },
    ];

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    await this.repo.update(listing.id, {
      smartAssistantHistory: history as any,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { field: entry.field, restoredValue: entry.after };
  }

  async undoLatestSmartAssistantFieldEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{ field: string; restoredValue: unknown }> {
    const history = [...(listing.smartAssistantHistory ?? [])];
    const latest = history[history.length - 1];

    if (!latest || latest.id !== historyId || latest.field === "scope") {
      throw new BadRequestException({
        code: "JL_SMART_ASSISTANT_UNDO_NOT_AVAILABLE",
        message:
          "Only the most recent Smart Assistant field edit can be undone.",
      });
    }

    await this.applySmartAssistantFieldValue(
      listing,
      latest.field,
      latest.before,
      latest.roleTitle,
    );
    history.pop();

    await this.repo.update(listing.id, {
      smartAssistantHistory: history as any,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { field: latest.field, restoredValue: latest.before };
  }

  async replaceLatestSmartAssistantFieldHistoryAfter(
    listing: JobListing,
    historyId: string,
    after: string,
  ): Promise<void> {
    const history = [...(listing.smartAssistantHistory ?? [])];
    const latest = history[history.length - 1];

    if (!latest || latest.id !== historyId || latest.field === "scope") {
      throw new BadRequestException({
        code: "JL_SMART_ASSISTANT_RETRY_NOT_AVAILABLE",
        message:
          "Only the most recent Smart Assistant field edit can be retried.",
      });
    }

    latest.after = after;
    latest.createdAt = new Date().toISOString();

    await this.repo.update(listing.id, {
      smartAssistantHistory: history as any,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });
  }

  async sendInvites(listingId: string, dto: SendInvitesDto): Promise<void> {
    return this.inviteService.send(listingId, dto);
  }

  async creditPurchasedInvites(
    listingId: string,
    inviteCount: number,
    checkoutSessionId?: string,
  ): Promise<{ inviteBalance: number }> {
    return this.inviteService.creditPurchasedInvites(
      listingId,
      inviteCount,
      checkoutSessionId,
    );
  }

  // Converts a budget amount in the client's display currency to USD cents.
  // Falls back to treating the amount as USD when the FX endpoint is unavailable.
  private async convertToUsdCents(
    amount: number,
    currency?: string,
  ): Promise<number> {
    if (!currency || currency.toUpperCase() === "USD") {
      return Math.round(amount * 100);
    }
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.config.get("PRICING_SERVICE_URL")}/v1/fx`, {
          params: { from: currency, to: "USD", amount },
        }),
      );
      return Math.round(response.data.convertedAmountUsd * 100);
    } catch {
      this.logger.warn(
        `FX conversion unavailable for ${currency}, treating amount as USD`,
      );
      return Math.round(amount * 100);
    }
  }

  async presignBriefUpload(
    listingId: string,
    dto: PresignBriefUploadDto,
  ): Promise<{ presignedUrl: string; key: string; expiresAt: string }> {
    // jl_brief_presign_rejected is not logged here: contentType and sizeBytes are
    // validated by class-validator at the DTO level (presign-brief-upload.dto.ts).
    // Invalid requests are rejected before reaching this service method.
    // If rejection logging is needed, add it to a validation exception filter.
    return this.briefStorage.createPresignedUpload(listingId, dto);
  }
}
