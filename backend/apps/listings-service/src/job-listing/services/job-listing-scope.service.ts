import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { JobListing } from '../entities/job-listing.entity';
import { PhaseType } from '../enums/phase-type.enum';
import { CreatePhaseDto } from '../dto/create-phase.dto';
import { ReorderPhasesDto } from '../dto/reorder-phases.dto';
import { SmartAssistantHistoryEntry } from '../entities/job-listing.entity';
import { JobListingBudgetService } from './job-listing-budget.service';

// ── AI generation phase/task caps ────────────────────────────────────────────
// Hard caps applied to AI-generated output before persisting.
// Human client input is never hard-blocked — only soft UI warnings shown.
const AI_PHASE_CAP_HAS_SCOPE  = 10;
const AI_PHASE_CAP_NO_SCOPE   = 8;
const AI_TASK_CAP_HAS_SCOPE   = 16;
const AI_TASK_CAP_NO_SCOPE    = 12;

export interface GeneratedScopeTaskInput {
  taskName: string;
  roleTitle: string;
  location?: string | null;
  experienceLevel?: string | null;
  workSchedule?: string | null;
  customHours?: number | null;
  customFrequency?: string | null;
  estimatedHours: number;
}

export interface GeneratedScopePhaseInput {
  phaseName: string;
  phaseType?: string | null;
  recurrenceSchedule?: string | null;
  recurrenceCount?: number | null;
  durationDays?: number | null;
  tasks: GeneratedScopeTaskInput[];
}

@Injectable()
export class JobListingScopeService {
  private readonly logger = new Logger(JobListingScopeService.name);

  constructor(
    @InjectRepository(JobListingPhase)
    private readonly phaseRepo: Repository<JobListingPhase>,
    @InjectRepository(JobListing)
    private readonly listingRepo: Repository<JobListing>,
    private readonly dataSource: DataSource,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly budgetService: JobListingBudgetService,
  ) {}

  // ── addPhase ───────────────────────────────────────────────────────────────
  // Adds a phase to a listing's scope with full ordering enforcement.
  //
  // Rules:
  //   SETUP   → max one; inserted at positionOrder 0, all others shift up.
  //   ONGOING → max one; appended at the end.
  //   RECURRING → inserted just before ONGOING (or at end if no ONGOING yet).
  async addPhase(listingId: string, dto: CreatePhaseDto): Promise<JobListingPhase> {
    this.validateRecurringPhase(dto);

    const existingPhases = await this.phaseRepo.find({
      where: { jobListingId: listingId },
      order: { positionOrder: 'ASC' },
    });

    // ── enforce uniqueness constraints ──────────────────────────────────────
    if (dto.phaseType === PhaseType.SETUP) {
      const hasSetup = existingPhases.some((p) => p.phaseType === PhaseType.SETUP);
      if (hasSetup) {
        throw new ConflictException({
          code:    'JL_PHASE_SETUP_EXISTS',
          message: 'A Setup phase already exists. Only one Setup phase is allowed per scope.',
        });
      }
      // Shift all existing phases up by 1 to make room at position 0.
      for (const phase of existingPhases) {
        await this.phaseRepo.update(phase.id, { positionOrder: phase.positionOrder + 1 });
      }
    }

    if (dto.phaseType === PhaseType.ONGOING) {
      const hasOngoing = existingPhases.some((p) => p.phaseType === PhaseType.ONGOING);
      if (hasOngoing) {
        throw new ConflictException({
          code:    'JL_PHASE_ONGOING_EXISTS',
          message: 'An Ongoing phase already exists. Only one Ongoing phase is allowed per scope.',
        });
      }
    }

    // ── determine positionOrder ──────────────────────────────────────────────
    // SETUP    → 0 (already shifted others above)
    // RECURRING → just before ONGOING if it exists, otherwise append
    // ONGOING  → append at end
    let positionOrder: number;

    if (dto.phaseType === PhaseType.SETUP) {
      positionOrder = 0;
    } else if (dto.phaseType === PhaseType.ONGOING) {
      positionOrder = existingPhases.length;
    } else {
      // RECURRING: insert before ONGOING
      const ongoingPhase = existingPhases.find((p) => p.phaseType === PhaseType.ONGOING);
      if (ongoingPhase) {
        positionOrder = ongoingPhase.positionOrder;
        await this.phaseRepo.update(ongoingPhase.id, {
          positionOrder: ongoingPhase.positionOrder + 1,
        });
      } else {
        positionOrder = existingPhases.length;
      }
    }

    const phase = this.phaseRepo.create({
      jobListingId:       listingId,
      phaseName:          dto.phaseName,
      phaseType:          dto.phaseType,
      positionOrder,
      durationDays:       dto.durationDays       ?? null,
      recurrenceSchedule: dto.recurrenceSchedule ?? null,
      recurrenceCount:    dto.recurrenceCount    ?? null,
    });

    return this.phaseRepo.save(phase);
  }

  // ── reorderPhases ──────────────────────────────────────────────────────────
  // Accepts an ordered array of all phase IDs for the listing and persists
  // new positionOrder values. SETUP must remain first, ONGOING must remain last.
  // Only RECURRING phases may change position.
  async reorderPhases(listingId: string, dto: ReorderPhasesDto): Promise<void> {
    const existingPhases = await this.phaseRepo.find({
      where: { jobListingId: listingId },
    });

    const existingIds  = new Set(existingPhases.map((p) => p.id));
    const incomingIds  = new Set(dto.orderedPhaseIds);

    // Must contain exactly the same phase IDs — no additions or removals.
    if (
      existingIds.size !== incomingIds.size ||
      ![...existingIds].every((id) => incomingIds.has(id))
    ) {
      throw new ConflictException({
        code:    'JL_PHASE_REORDER_MISMATCH',
        message: 'orderedPhaseIds must contain exactly all existing phase IDs.',
      });
    }

    // Validate SETUP anchor.
    const setupPhase = existingPhases.find((p) => p.phaseType === PhaseType.SETUP);
    if (setupPhase && dto.orderedPhaseIds[0] !== setupPhase.id) {
      throw new ConflictException({
        code:    'JL_PHASE_SETUP_MUST_BE_FIRST',
        message: 'The Setup phase must remain first.',
      });
    }

    // Validate ONGOING anchor.
    const ongoingPhase = existingPhases.find((p) => p.phaseType === PhaseType.ONGOING);
    if (ongoingPhase && dto.orderedPhaseIds[dto.orderedPhaseIds.length - 1] !== ongoingPhase.id) {
      throw new ConflictException({
        code:    'JL_PHASE_ONGOING_MUST_BE_LAST',
        message: 'The Ongoing phase must remain last.',
      });
    }

    // Persist new positionOrder values safely under the unique
    // (job_listing_id, position_order) index. We first move every phase to a
    // temporary offset range, then write the final 0..n-1 order.
    await this.dataSource.transaction(async (manager) => {
      const temporaryOffset = dto.orderedPhaseIds.length;

      for (let i = 0; i < dto.orderedPhaseIds.length; i++) {
        await manager.update(JobListingPhase, dto.orderedPhaseIds[i], {
          positionOrder: i + temporaryOffset,
        });
      }

      for (let i = 0; i < dto.orderedPhaseIds.length; i++) {
        await manager.update(JobListingPhase, dto.orderedPhaseIds[i], {
          positionOrder: i,
        });
      }
    });
  }

  // ── applyAiGeneratedScope ──────────────────────────────────────────────────
  // Replaces the full scope of a listing with AI-generated phases and tasks.
  // Enforces phase and task caps based on whether the listing has an existing
  // scope description (hasScope path) or not (noScope path).
  // Runs in a single transaction — if anything fails the scope is unchanged.
  async applyAiGeneratedScope(
    listingId: string,
    rawPhases: GeneratedScopePhaseInput[],
    hasScope: boolean,
  ): Promise<JobListingPhase[]> {
    const phaseCap = hasScope ? AI_PHASE_CAP_HAS_SCOPE : AI_PHASE_CAP_NO_SCOPE;
    const taskCap  = hasScope ? AI_TASK_CAP_HAS_SCOPE  : AI_TASK_CAP_NO_SCOPE;

    // Apply hard caps to AI output.
    const cappedPhases = rawPhases
      .slice(0, phaseCap)
      .map((p) => ({ ...p, tasks: p.tasks.slice(0, taskCap) }));

    return this.dataSource.transaction(async (manager) => {
      // Delete all existing phases (cascades to tasks).
      await manager.delete(JobListingPhase, { jobListingId: listingId });

      const savedPhases: JobListingPhase[] = [];

      for (let i = 0; i < cappedPhases.length; i++) {
        const gen       = cappedPhases[i];
        const phaseType = this.mapPhaseType(gen.phaseType ?? 'setup');

        const phase = manager.create(JobListingPhase, {
          jobListingId:       listingId,
          phaseName:          gen.phaseName,
          phaseType,
          positionOrder:      i,
          durationDays:       gen.durationDays       ?? null,
          recurrenceSchedule: (gen.recurrenceSchedule as any) ?? null,
          recurrenceCount:    gen.recurrenceCount    ?? null,
          tasks:              [],
        });

        const savedPhase = await manager.save(JobListingPhase, phase);
        savedPhase.tasks = [];

        for (let j = 0; j < gen.tasks.length; j++) {
          const t    = gen.tasks[j];
          const task = manager.create(JobListingTask, {
            phaseId:         savedPhase.id,
            taskName:        t.taskName,
            roleTitle:       t.roleTitle,
            location:        t.location        ?? null,
            experienceLevel: t.experienceLevel ?? null,
            workSchedule:    (t.workSchedule as any) ?? 'full_time',
            customHours:     t.customHours     ?? null,
            customFrequency: t.customFrequency ?? null,
            estimatedHours:  t.estimatedHours,
            positionOrder:   j,
          });
          savedPhase.tasks.push(await manager.save(JobListingTask, task));
        }

        savedPhases.push(savedPhase);
      }

      return savedPhases;
    });
  }

  async applyGeneratedScopeAndRecalculate(
    listingId: string,
    rawPhases: GeneratedScopePhaseInput[],
    hasScope: boolean,
  ): Promise<{ phases: JobListingPhase[]; totalBudgetUsdCents: number }> {
    const phases = await this.applyAiGeneratedScope(listingId, rawPhases, hasScope);
    const totalBudgetUsdCents = await this.budgetService.recalculateAndPersist(listingId, phases);

    await this.listingRepo.update(listingId, {
      budgetAmountUsdCents: totalBudgetUsdCents,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { phases, totalBudgetUsdCents };
  }

  // ── applySmartAssistantScopeEdit ───────────────────────────────────────────
  // Called when the client submits the "I want to change..." field in Step 4.
  // Deletes all existing phases/tasks and re-inserts the AI-updated scope in a
  // single transaction. Appends an entry to smartAssistantHistory on the listing.
  // Budget and timeline are recalculated on the new scope before returning.
  async applySmartAssistantScopeEdit(
    listing: JobListing,
    updatedScope: GeneratedScopePhaseInput[],
    command: string,
  ): Promise<{ phases: JobListingPhase[]; totalBudgetUsdCents: number }> {
    // Snapshot current scope before replacing (for history entry).
    const beforePhases = await this.phaseRepo.find({
      where: { jobListingId: listing.id },
      relations: ['tasks'],
      order: { positionOrder: 'ASC' },
    });

    // Replace scope inside a transaction.
    const savedPhases = await this.applyAiGeneratedScope(
      listing.id,
      updatedScope,
      true, // treat as hasScope path for cap purposes
    );

    // Recalculate budget and timeline on new scope.
    const totalBudgetUsdCents = await this.budgetService.recalculateAndPersist(
      listing.id,
      savedPhases,
    );

    // Append history entry (max 20 kept; oldest pruned).
    const historyEntry: SmartAssistantHistoryEntry = {
      id:        uuidv4(),
      field:     'scope',
      before:    beforePhases,
      after:     savedPhases,
      command,
      createdAt: new Date().toISOString(),
    };

    const history = [...(listing.smartAssistantHistory ?? []), historyEntry];
    if (history.length > 20) history.splice(0, history.length - 20);

    await this.listingRepo.update(listing.id, {
      smartAssistantHistory: history as any,
      budgetAmountUsdCents:  totalBudgetUsdCents,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { phases: savedPhases, totalBudgetUsdCents };
  }

  async restoreSmartAssistantScopeEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{ phases: JobListingPhase[]; totalBudgetUsdCents: number }> {
    const entry = (listing.smartAssistantHistory ?? []).find(
      (item) => item.id === historyId && item.field === 'scope',
    );

    if (!entry) {
      throw new NotFoundException({
        code: 'JL_SMART_ASSISTANT_HISTORY_NOT_FOUND',
        message: 'Smart Assistant scope history entry not found.',
      });
    }

    const savedPhases = await this.applyAiGeneratedScope(
      listing.id,
      entry.after as GeneratedScopePhaseInput[],
      true,
    );

    const totalBudgetUsdCents = await this.budgetService.recalculateAndPersist(
      listing.id,
      savedPhases,
    );

    const historyEntry: SmartAssistantHistoryEntry = {
      id: uuidv4(),
      field: 'scope',
      before: entry.before,
      after: savedPhases,
      command: `restore:${historyId}`,
      createdAt: new Date().toISOString(),
    };

    const history = [...(listing.smartAssistantHistory ?? []), historyEntry];
    if (history.length > 20) history.splice(0, history.length - 20);

    await this.listingRepo.update(listing.id, {
      smartAssistantHistory: history as any,
      budgetAmountUsdCents: totalBudgetUsdCents,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { phases: savedPhases, totalBudgetUsdCents };
  }

  // ── loadInheritedScope ─────────────────────────────────────────────────────
  // Fetches the scope from contracts-service for an existing contract listing.
  // The phases are NOT persisted in job_listing_phases — they are returned as
  // read-only display data in the GET /v1/job-listings/:id response.
  // isInherited: true signals the frontend to render them as non-editable.
  async undoLatestSmartAssistantScopeEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{ phases: JobListingPhase[]; totalBudgetUsdCents: number }> {
    const history = [...(listing.smartAssistantHistory ?? [])];
    const latest = history[history.length - 1];

    if (!latest || latest.id !== historyId || latest.field !== 'scope') {
      throw new ConflictException({
        code: 'JL_SMART_ASSISTANT_UNDO_NOT_AVAILABLE',
        message: 'Only the most recent Smart Assistant scope edit can be undone.',
      });
    }

    const savedPhases = await this.applyAiGeneratedScope(
      listing.id,
      latest.before as GeneratedScopePhaseInput[],
      true,
    );

    const totalBudgetUsdCents = await this.budgetService.recalculateAndPersist(
      listing.id,
      savedPhases,
    );

    history.pop();

    await this.listingRepo.update(listing.id, {
      smartAssistantHistory: history as any,
      budgetAmountUsdCents: totalBudgetUsdCents,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { phases: savedPhases, totalBudgetUsdCents };
  }

  async replaceLatestSmartAssistantScopeHistoryAfter(
    listing: JobListing,
    historyId: string,
    after: JobListingPhase[],
  ): Promise<void> {
    const history = [...(listing.smartAssistantHistory ?? [])];
    const latest = history[history.length - 1];

    if (!latest || latest.id !== historyId || latest.field !== 'scope') {
      throw new ConflictException({
        code: 'JL_SMART_ASSISTANT_RETRY_NOT_AVAILABLE',
        message: 'Only the most recent Smart Assistant scope edit can be retried.',
      });
    }

    latest.after = after;
    latest.createdAt = new Date().toISOString();

    await this.listingRepo.update(listing.id, {
      smartAssistantHistory: history as any,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });
  }

  async loadInheritedScope(contractId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.config.get('CONTRACTS_SERVICE_URL')}/v1/contracts/${contractId}/scope`,
        ),
      );
      return response.data.phases.map((p: any) => ({
        ...p,
        isInherited: true,
      }));
    } catch (err) {
      this.logger.warn(`contracts-service unavailable for scope load: ${contractId}`);
      return [];
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  // Maps AI-returned phase type string to PhaseType enum.
  private mapPhaseType(type: string): PhaseType {
    switch (type) {
      case 'recurring': return PhaseType.RECURRING;
      case 'ongoing':   return PhaseType.ONGOING;
      default:          return PhaseType.SETUP;
    }
  }

  // Validates recurrence fields when phaseType is RECURRING.
  // Called before addPhase persists anything.
  private validateRecurringPhase(dto: CreatePhaseDto): void {
    if (dto.phaseType === PhaseType.RECURRING || dto.recurrenceSchedule) {
      if (!dto.recurrenceSchedule) {
        throw new UnprocessableEntityException(
          'recurrenceSchedule is required for RECURRING phases.',
        );
      }
      if (!dto.recurrenceCount || dto.recurrenceCount < 1) {
        throw new UnprocessableEntityException(
          'recurrenceCount must be at least 1 for RECURRING phases.',
        );
      }
    }
  }
}
