import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { JobListingOwnerGuard } from "../guards/job-listing-owner.guard";
import { JobListingService } from "../services/job-listing.service";
import { JobListingPublishService } from "../services/job-listing-publish.service";
import { CreateJobListingDto } from "../dto/create-job-listing.dto";
import { UpdateJobListingDto } from "../dto/update-job-listing.dto";
import { UpdateBasicInformationDto } from "../dto/update-basic-info.dto";
import { SendInvitesDto } from "../dto/send-invites.dto";
import { CreditInvitesDto } from "../dto/credit-invites.dto";
import { PresignBriefUploadDto } from "../dto/presign-brief-upload.dto";
import { ListJobListingsQueryDto } from "../dto/list-job-listings-query.dto";
import { CreateRoleRowDto } from "../dto/create-role-row.dto";
import {
  ShortenSelectedTextDto,
  SmartAssistantDto,
} from "../dto/smart-assistant.dto";
import {
  ApplyGeneratedScopeDto,
  GenerateBasicInformationDto,
  GenerateTitleDto,
  RecommendRoleConfigurationDto,
  GenerateRoleDescriptionsDto,
  GenerateScopeDto,
  GenerateToolsDto,
} from "../dto/ai-generation.dto";
import { UpdateRoleDescriptionDto } from "../dto/update-role-description.dto";
import {
  GroqUnavailableException,
  JobListingAiService,
} from "../services/job-listing-ai.service";
import {
  GeneratedScopePhaseInput,
  JobListingScopeService,
} from "../services/job-listing-scope.service";

@UseGuards(JwtAuthGuard)
@Controller("v1/job-listings")
export class JobListingController {
  constructor(
    private readonly jobListingService: JobListingService,
    private readonly publishService: JobListingPublishService,
    private readonly aiService: JobListingAiService,
    private readonly scopeService: JobListingScopeService,
  ) {}

  private getUserId(req: any): string {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException("Authenticated user id is missing.");
    }
    return userId;
  }

  private getBasicInformation(listing: any): any {
    return Array.isArray(listing.basicInformation)
      ? listing.basicInformation[0]
      : listing.basicInformation;
  }

  private getSmartAssistantCurrentFieldValue(
    listing: any,
    field: string,
    roleTitle?: string,
  ): string {
    if (field === "title") {
      return this.getBasicInformation(listing)?.title ?? "";
    }

    const targetRoleTitle =
      this.jobListingService.resolveSmartAssistantRoleTitle(listing, roleTitle);
    const roleDescription =
      listing.roleDescriptions?.find(
        (role: any) => role.roleTitle === targetRoleTitle,
      ) ?? listing.roleDescriptions?.[0];

    return roleDescription?.[field] ?? "";
  }

  private getSmartAssistantFieldContext(listing: any): Record<string, unknown> {
    const basicInformation = this.getBasicInformation(listing);
    const roleTitles = new Set<string>();

    (listing.teamMemberRows ?? []).forEach((row: any) => {
      if (typeof row?.roleTitle === "string" && row.roleTitle.trim()) {
        roleTitles.add(row.roleTitle.trim());
      }
    });
    (listing.phases ?? []).forEach((phase: any) => {
      (phase.tasks ?? []).forEach((task: any) => {
        if (typeof task?.roleTitle === "string" && task.roleTitle.trim()) {
          roleTitles.add(task.roleTitle.trim());
        }
      });
    });

    return {
      workType: listing.workType,
      jobType: basicInformation?.jobType,
      industries: Array.isArray(basicInformation?.industries)
        ? basicInformation.industries
        : [],
      description: listing.description,
      deliverables: listing.deliverables,
      tools: Array.isArray((listing as any).tools)
        ? (listing as any).tools
        : [],
      roles: Array.from(roleTitles),
    };
  }

  // ── POST /v1/job-listings ────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() dto: CreateJobListingDto) {
    return this.jobListingService.create(this.getUserId(req), dto);
  }

  // ── GET /v1/job-listings ─────────────────────────────────────
  @Get()
  findAll(@Req() req: any, @Query() query: ListJobListingsQueryDto) {
    return this.jobListingService.findAll(this.getUserId(req), query);
  }

  // ── GET /v1/job-listings/:id ─────────────────────────────────
  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.jobListingService.findOne(this.getUserId(req), id);
  }

  // ── PATCH /v1/job-listings/:id ───────────────────────────────
  @Patch(":id")
  @UseGuards(JobListingOwnerGuard)
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateJobListingDto,
  ) {
    const existing = await this.jobListingService.findOneInternal(id);
    const updateDto: UpdateJobListingDto = { ...dto };

    if (dto.ndaEnabled !== undefined) {
      if (existing.contractType === "existing") {
        delete updateDto.ndaEnabled;
      } else {
        await this.publishService.handleNdaToggle(id, dto.ndaEnabled);
        delete updateDto.ndaEnabled;
      }
    }

    return this.jobListingService.update(this.getUserId(req), id, updateDto);
  }

  // ── PATCH /v1/job-listings/:id/basic-information ─────────────
  @Patch(":id/basic-information")
  @UseGuards(JobListingOwnerGuard)
  updateBasicInformation(
    @Param("id") id: string,
    @Body() dto: UpdateBasicInformationDto,
  ) {
    return this.jobListingService.updateBasicInformation(id, dto);
  }

  // ── POST /v1/job-listings/:id/publish ────────────────────────
  @Post(":id/publish")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  publish(@Req() req: any, @Param("id") id: string) {
    return this.publishService.publish(this.getUserId(req), id);
  }

  // ── POST /v1/job-listings/:id/revert-to-draft ────────────────
  @Post(":id/revert-to-draft")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  revertToDraft(@Req() req: any, @Param("id") id: string) {
    return this.publishService.revertToDraft(this.getUserId(req), id);
  }

  // ── DELETE /v1/job-listings/:id ──────────────────────────────
  @Delete(":id")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.jobListingService.softDelete(id);
  }

  // ── POST /v1/job-listings/:id/duplicate-role ─────────────────
  @Post(":id/duplicate-role")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  duplicateRole(@Param("id") id: string, @Body("roleRowId") roleRowId: string) {
    return this.jobListingService.duplicateRole(id, roleRowId);
  }

  // ── POST /v1/job-listings/:id/invite ─────────────────────────
  @Post(":id/invite")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  sendInvites(@Param("id") id: string, @Body() dto: SendInvitesDto) {
    return this.jobListingService.sendInvites(id, dto);
  }

  @Post(":id/invite-balance/credit")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  creditPurchasedInvites(
    @Param("id") id: string,
    @Body() dto: CreditInvitesDto,
  ) {
    return this.jobListingService.creditPurchasedInvites(
      id,
      dto.inviteCount,
      dto.checkoutSessionId,
    );
  }

  // ── POST /v1/job-listings/:id/brief-upload/presign ───────────
  @Post(":id/brief-upload/presign")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  presignBriefUpload(
    @Param("id") id: string,
    @Body() dto: PresignBriefUploadDto,
  ) {
    return this.jobListingService.presignBriefUpload(id, dto);
  }

  // ── POST /v1/job-listings/:id/roles ──────────────────────────
  @Post(":id/roles")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  createRoleRow(@Param("id") id: string, @Body() dto: CreateRoleRowDto) {
    return this.jobListingService.createRoleRow(id, dto);
  }

  // ── POST /v1/job-listings/:id/smart-assistant ─────────────────────────────
  @Post(":id/generate-tools")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async generateTools(@Param("id") id: string, @Body() dto: GenerateToolsDto) {
    const listing = await this.jobListingService.findOneInternal(id);

    try {
      const tools = await this.aiService.generateTools({
        workType: dto.workType ?? listing.workType ?? "project",
        description: dto.description ?? listing.description ?? "",
        deliverables: dto.deliverables ?? listing.deliverables ?? "",
        roles:
          dto.roles ??
          listing.teamMemberRows?.map((row) => row.roleTitle) ??
          [],
      });

      return { aiStatus: "OK", tools };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          tools: [],
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Post(":id/generate-title")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async generateTitle(@Param("id") id: string, @Body() dto: GenerateTitleDto) {
    const listing = await this.jobListingService.findOneInternal(id);

    try {
      const title = await this.aiService.generateJobTitle({
        workType: dto.workType ?? listing.workType ?? "project",
        description: dto.description ?? listing.description ?? "",
        roles:
          dto.roles ??
          listing.teamMemberRows?.map((row) => row.roleTitle) ??
          [],
      });

      return { aiStatus: "OK", title };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          title: null,
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Post(":id/generate-basic-information")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async generateBasicInformation(
    @Param("id") id: string,
    @Body() dto: GenerateBasicInformationDto,
  ): Promise<Record<string, unknown>> {
    const listing = await this.jobListingService.findOneInternal(id);

    try {
      const basicInformation = await this.aiService.generateBasicInformation({
        workType: dto.workType ?? listing.workType ?? "project",
        description: dto.description ?? listing.description ?? "",
        deliverables: dto.deliverables ?? listing.deliverables ?? "",
        tools: dto.tools ?? [],
        roles:
          dto.roles ??
          listing.teamMemberRows?.map((row) => row.roleTitle) ??
          [],
      });

      const saved =
        dto.save === false
          ? null
          : await this.jobListingService.updateBasicInformation(
              id,
              basicInformation,
            );

      return { aiStatus: "OK", basicInformation, saved };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          basicInformation: null,
          saved: null,
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Post(":id/generate-scope")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async generateScope(
    @Param("id") id: string,
    @Body() dto: GenerateScopeDto,
  ): Promise<any> {
    const listing = await this.jobListingService.findOneInternal(id);
    const workType = dto.workType ?? listing.workType ?? "project";
    const roles =
      dto.roles ?? listing.teamMemberRows?.map((row) => row.roleTitle) ?? [];
    const budgetUsdCents =
      dto.budgetUsdCents ?? listing.budgetAmountUsdCents ?? 0;

    try {
      const scope = dto.minimalInput
        ? await this.aiService.generateScopeFromMinimalInput({
            workType,
            description: dto.description ?? listing.description ?? "",
            budgetUsdCents,
            roles,
          })
        : workType === "service"
          ? await this.aiService.generateServiceScope({
              description: dto.description ?? listing.description ?? "",
              deliverables: dto.deliverables ?? listing.deliverables ?? "",
              tools: dto.tools ?? [],
              roles,
              budgetUsdCents,
            })
          : await this.aiService.generateProjectScope({
              description: dto.description ?? listing.description ?? "",
              deliverables: dto.deliverables ?? listing.deliverables ?? "",
              successCriteria:
                dto.successCriteria ?? listing.successCriteria ?? "",
              tools: dto.tools ?? [],
              roles,
              budgetUsdCents,
              durationMonths: dto.durationMonths ?? listing.durationMonths ?? 1,
              hiringType: dto.hiringType ?? listing.hiringType ?? "team",
            });

      if (dto.apply) {
        const applied =
          await this.scopeService.applyGeneratedScopeAndRecalculate(
            id,
            scope.phases as GeneratedScopePhaseInput[],
            !dto.minimalInput,
          );
        return {
          aiStatus: "OK",
          workType,
          scope,
          phases: scope.phases,
          appliedPhases: applied.phases,
          totalBudgetUsdCents: applied.totalBudgetUsdCents,
        };
      }

      return { aiStatus: "OK", workType, scope, phases: scope.phases };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        const phases =
          workType === "service"
            ? [
                {
                  phaseName: "Setup",
                  phaseType: "setup",
                  recurrenceSchedule: null,
                  recurrenceCount: null,
                  tasks: [],
                },
                {
                  phaseName: "Recurring Work",
                  phaseType: "recurring",
                  recurrenceSchedule: "monthly",
                  recurrenceCount: 3,
                  tasks: [],
                },
                {
                  phaseName: "Ongoing Support",
                  phaseType: "ongoing",
                  recurrenceSchedule: null,
                  recurrenceCount: null,
                  tasks: [],
                },
              ]
            : [];
        return {
          aiStatus: "AI_UNAVAILABLE",
          workType,
          scope: { phases },
          phases,
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Post(":id/scope/apply-generated")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async applyGeneratedScope(
    @Param("id") id: string,
    @Body() dto: ApplyGeneratedScopeDto,
  ) {
    await this.jobListingService.findOneInternal(id);
    const applied = await this.scopeService.applyGeneratedScopeAndRecalculate(
      id,
      dto.phases as GeneratedScopePhaseInput[],
      dto.hasScope ?? true,
    );

    return {
      phases: applied.phases,
      totalBudgetUsdCents: applied.totalBudgetUsdCents,
    };
  }

  @Post(":id/recommend-role-configuration")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async recommendRoleConfiguration(
    @Param("id") id: string,
    @Body() dto: RecommendRoleConfigurationDto,
  ): Promise<Record<string, unknown>> {
    const listing = await this.jobListingService.findOneInternal(id);

    const recommendation = await this.aiService.recommendRoleConfiguration({
      roleTitle: dto.roleTitle,
      budgetUsdCents: dto.budgetUsdCents ?? listing.budgetAmountUsdCents ?? 0,
      durationMonths: dto.durationMonths ?? listing.durationMonths ?? 1,
      estimatedHours: dto.estimatedHours,
      rateData: dto.rateData,
    });

    return { recommendation };
  }

  @Post(":id/generate-role-descriptions")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async generateRoleDescriptions(
    @Param("id") id: string,
    @Body() dto: GenerateRoleDescriptionsDto,
  ) {
    const listing = await this.jobListingService.findOneInternal(id);
    const rolesSource = dto.roles?.length
      ? dto.roles
      : (listing.teamMemberRows?.map((row) => ({
          roleTitle: row.roleTitle,
          experienceLevel: row.experienceLevel ?? "",
          location: row.location ?? "",
          workSchedule: row.customFrequency ?? "",
          tasks: [],
        })) ?? []);
    const roles = rolesSource.map((role) => ({
      roleTitle: role.roleTitle,
      experienceLevel: role.experienceLevel ?? "",
      location: role.location ?? "",
      workSchedule: role.workSchedule ?? "",
      tasks: role.tasks ?? [],
    }));
    const basicInformation = Array.isArray(listing.basicInformation)
      ? listing.basicInformation[0]
      : listing.basicInformation;

    try {
      const descriptions = await this.aiService.generateRoleDescriptions({
        projectTitle:
          dto.projectTitle ?? basicInformation?.title ?? "Untitled job",
        workType: dto.workType ?? listing.workType ?? "project",
        description: dto.description ?? listing.description ?? "",
        roles,
      });
      const saved = await this.jobListingService.saveGeneratedRoleDescriptions(
        id,
        descriptions,
      );

      return { aiStatus: "OK", roleDescriptions: saved };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          roleDescriptions: [],
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Get(":id/role-descriptions")
  @UseGuards(JobListingOwnerGuard)
  listRoleDescriptions(@Param("id") id: string) {
    return this.jobListingService.listRoleDescriptions(id);
  }

  @Patch(":id/role-descriptions/:roleTitle")
  @UseGuards(JobListingOwnerGuard)
  updateRoleDescription(
    @Param("id") id: string,
    @Param("roleTitle") roleTitle: string,
    @Body() dto: UpdateRoleDescriptionDto,
  ) {
    return this.jobListingService.saveRoleDescription(
      id,
      decodeURIComponent(roleTitle),
      dto,
    );
  }

  @Post(":id/smart-assistant")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async smartAssistant(
    @Param("id") id: string,
    @Body() dto: SmartAssistantDto,
  ): Promise<any> {
    const listing = await this.jobListingService.findOneInternal(id);
    const mode = dto.mode ?? (dto.field === "scope" ? "scope" : "field");

    try {
      if (mode === "scope") {
        const workType = dto.workType ?? listing.workType ?? "project";
        const currentScope = dto.currentScope ?? {
          phases: (listing.phases ?? []).map((phase) => ({
            phaseName: phase.phaseName,
            phaseType: phase.phaseType,
            recurrenceSchedule: phase.recurrenceSchedule,
            recurrenceCount: phase.recurrenceCount,
            durationDays: phase.durationDays,
            tasks: (phase.tasks ?? []).map((task) => ({
              taskName: task.taskName,
              roleTitle: task.roleTitle,
              location: task.location,
              experienceLevel: task.experienceLevel,
              workSchedule: task.workSchedule,
              customHours: task.customHours,
              customFrequency: task.customFrequency,
              estimatedHours: task.estimatedHours,
            })),
          })),
        };
        const result = await this.aiService.handleSmartAssistantScopeEdit({
          command: dto.command,
          currentScope: currentScope as any,
          workType,
        });

        const persisted = await this.scopeService.applySmartAssistantScopeEdit(
          listing,
          result.updatedScope.phases as GeneratedScopePhaseInput[],
          dto.command,
        );

        return {
          aiStatus: "OK",
          mode: "scope",
          ...result,
          phases: persisted.phases,
          totalBudgetUsdCents: persisted.totalBudgetUsdCents,
        };
      }

      const beforeValue =
        dto.currentValue ??
        this.getSmartAssistantCurrentFieldValue(
          listing,
          dto.field!,
          dto.roleTitle,
        );
      const result = await this.aiService.handleSmartAssistantFieldEdit({
        field: dto.field!,
        currentValue: beforeValue,
        command: dto.command,
        context: this.getSmartAssistantFieldContext(listing),
      });
      await this.jobListingService.applySmartAssistantFieldValue(
        listing,
        dto.field!,
        result.updatedValue,
        dto.roleTitle,
      );
      await this.jobListingService.recordSmartAssistantFieldEdit(
        listing,
        dto.field!,
        beforeValue,
        result.updatedValue,
        dto.command,
        dto.roleTitle,
      );

      return {
        aiStatus: "OK",
        mode: "field",
        field: dto.field,
        ...result,
      };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        const fallback =
          mode === "scope"
            ? {
                currentScope: dto.currentScope ?? {
                  phases: listing.phases ?? [],
                },
              }
            : { currentValue: dto.currentValue ?? "" };
        return {
          aiStatus: "AI_UNAVAILABLE",
          mode,
          message: error.message,
          fallback,
        };
      }

      throw error;
    }
  }

  @Post(":id/smart-assistant/scope")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  smartAssistantScope(
    @Param("id") id: string,
    @Body() dto: SmartAssistantDto,
  ): Promise<any> {
    return this.smartAssistant(id, { ...dto, mode: "scope" });
  }

  @Post(":id/smart-assistant/field")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  smartAssistantField(
    @Param("id") id: string,
    @Body() dto: SmartAssistantDto,
  ): Promise<any> {
    return this.smartAssistant(id, { ...dto, mode: "field" });
  }

  @Post(":id/smart-assistant/shorten")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async shortenSelectedText(
    @Param("id") id: string,
    @Body() dto: ShortenSelectedTextDto,
  ): Promise<Record<string, unknown>> {
    await this.jobListingService.findOneInternal(id);

    try {
      const result = await this.aiService.shortenSelectedText(dto);
      return { aiStatus: "OK", ...result };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          shortenedText: dto.selectedText,
          message: error.message,
          fallback: { selectedText: dto.selectedText },
        };
      }
      throw error;
    }
  }

  @Post(":id/smart-assistant/history/:historyId/restore")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async restoreSmartAssistantHistory(
    @Param("id") id: string,
    @Param("historyId") historyId: string,
  ) {
    const listing = await this.jobListingService.findOneInternal(id);
    const entry = (listing.smartAssistantHistory ?? []).find(
      (item) => item.id === historyId,
    );

    if (entry?.field === "scope") {
      const restored = await this.scopeService.restoreSmartAssistantScopeEdit(
        listing,
        historyId,
      );
      return {
        mode: "scope",
        phases: restored.phases,
        totalBudgetUsdCents: restored.totalBudgetUsdCents,
      };
    }

    const restored =
      await this.jobListingService.restoreSmartAssistantFieldEdit(
        listing,
        historyId,
      );
    return {
      mode: "field",
      field: restored.field,
      restoredValue: restored.restoredValue,
    };
  }

  @Post(":id/smart-assistant/history/:historyId/undo")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async undoSmartAssistantHistory(
    @Param("id") id: string,
    @Param("historyId") historyId: string,
  ) {
    const listing = await this.jobListingService.findOneInternal(id);
    const entry = (listing.smartAssistantHistory ?? []).find(
      (item) => item.id === historyId,
    );

    if (entry?.field === "scope") {
      const undone = await this.scopeService.undoLatestSmartAssistantScopeEdit(
        listing,
        historyId,
      );
      return {
        mode: "scope",
        phases: undone.phases,
        totalBudgetUsdCents: undone.totalBudgetUsdCents,
      };
    }

    const undone =
      await this.jobListingService.undoLatestSmartAssistantFieldEdit(
        listing,
        historyId,
      );
    return {
      mode: "field",
      field: undone.field,
      restoredValue: undone.restoredValue,
    };
  }

  @Post(":id/smart-assistant/history/:historyId/retry")
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async retrySmartAssistantHistory(
    @Param("id") id: string,
    @Param("historyId") historyId: string,
  ) {
    const listing = await this.jobListingService.findOneInternal(id);
    const history = listing.smartAssistantHistory ?? [];
    const entry = history[history.length - 1];

    if (!entry || entry.id !== historyId) {
      throw new BadRequestException({
        code: "JL_SMART_ASSISTANT_RETRY_NOT_AVAILABLE",
        message: "Only the most recent Smart Assistant edit can be retried.",
      });
    }

    try {
      if (entry.field === "scope") {
        const workType = listing.workType ?? "project";
        const result = await this.aiService.handleSmartAssistantScopeEdit({
          command: entry.command,
          currentScope: entry.before as any,
          workType,
        });
        const applied =
          await this.scopeService.applyGeneratedScopeAndRecalculate(
            id,
            result.updatedScope.phases as GeneratedScopePhaseInput[],
            true,
          );
        await this.scopeService.replaceLatestSmartAssistantScopeHistoryAfter(
          listing,
          historyId,
          applied.phases,
        );
        return {
          aiStatus: "OK",
          mode: "scope",
          ...result,
          phases: applied.phases,
          totalBudgetUsdCents: applied.totalBudgetUsdCents,
        };
      }

      const result = await this.aiService.handleSmartAssistantFieldEdit({
        field: entry.field,
        currentValue: String(entry.before ?? ""),
        command: entry.command,
      });
      await this.jobListingService.applySmartAssistantFieldValue(
        listing,
        entry.field,
        result.updatedValue,
        entry.roleTitle,
      );
      await this.jobListingService.replaceLatestSmartAssistantFieldHistoryAfter(
        listing,
        historyId,
        result.updatedValue,
      );
      return {
        aiStatus: "OK",
        mode: "field",
        field: entry.field,
        ...result,
      };
    } catch (error) {
      if (error instanceof GroqUnavailableException) {
        return {
          aiStatus: "AI_UNAVAILABLE",
          mode: entry.field === "scope" ? "scope" : "field",
          message: error.message,
          fallback: { value: entry.after },
        };
      }
      throw error;
    }
  }
}
