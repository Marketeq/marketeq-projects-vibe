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
import {
  ScopeOperation,
  ScopeSnapshotPhase,
  ScopeSnapshotTask,
  NewTaskInput,
  NewPhaseInput,
  TaskOperationFields,
  PhaseOperationFields,
} from './job-listing-ai-operations.types';
import type { EntityManager } from 'typeorm';

// ── AI generation phase/task caps ────────────────────────────────────────────
// Hard caps applied to AI-generated output before persisting.
// Human client input is never hard-blocked — only soft UI warnings shown.
const AI_PHASE_CAP_HAS_SCOPE  = 10;
const AI_PHASE_CAP_NO_SCOPE   = 8;
const AI_TASK_CAP_HAS_SCOPE   = 16;
const AI_TASK_CAP_NO_SCOPE    = 12;

// ── Smart Assistant scope-edit: prompt-shape trimming ────────────────────────
// Converts persisted entities to the anonymous, index-addressed shape sent to
// the LLM and consumed by applyOperationsToSnapshot below. Used by the
// controller for both the live-edit path (from listing.phases) and the retry
// path (from a stored SmartAssistantHistoryEntry.before snapshot) — one place
// defining "phases/tasks -> prompt shape, in what order" so indices always
// line up with what applySmartAssistantScopeOperations resolves against.
export function buildScopeSnapshotForPrompt(
  phases: JobListingPhase[],
): ScopeSnapshotPhase[] {
  return [...(phases ?? [])]
    .sort((a, b) => a.positionOrder - b.positionOrder)
    .map((phase) => ({
      phaseName: phase.phaseName,
      phaseType: phase.phaseType,
      recurrenceSchedule: phase.recurrenceSchedule,
      recurrenceCount: phase.recurrenceCount,
      durationDays: phase.durationDays,
      tasks: [...(phase.tasks ?? [])]
        .sort((a, b) => a.positionOrder - b.positionOrder)
        .map((task) => ({
          taskName: task.taskName,
          roleTitle: task.roleTitle,
          location: task.location,
          experienceLevel: task.experienceLevel,
          workSchedule: task.workSchedule,
          customHours: task.customHours,
          customFrequency: task.customFrequency,
          estimatedHours: Number(task.estimatedHours),
        })),
    }));
}

// ── Smart Assistant scope-edit: pure operation apply ─────────────────────────
// Resolves a batch of ScopeOperations against a pre-edit snapshot and returns
// the resulting full phase list. Pure and synchronous — no DB access — so
// it's the single source of truth for "what does the scope look like after
// these operations," shared by:
//   1. job-listing-ai.service.ts's operation validator (cap / empty-phase /
//      service-timeline-shrink checks against the WOULD-BE result).
//   2. applySmartAssistantScopeOperations below (diffed against live DB rows).
//   3. the controller's retry path (applied to a stored history snapshot,
//      then fed to the existing delete-all-reinsert applyGeneratedScopeAndRecalculate).
//
// Every phaseIndex/taskIndex resolves against the INPUT snapshot, never
// against this function's own growing output — operations in one batch never
// see each other's effects, only the pre-edit state (see
// job-listing-ai-operations.types.ts's module doc).
export function applyOperationsToSnapshot(
  snapshot: ScopeSnapshotPhase[],
  operations: ScopeOperation[],
): ScopeSnapshotPhase[] {
  const removedPhaseIndexes = new Set<number>();
  const removedTaskIndexes = new Map<number, Set<number>>();
  const taskFieldPatches = new Map<number, Map<number, Partial<ScopeSnapshotTask>>>();
  const phaseFieldPatches = new Map<number, Partial<ScopeSnapshotPhase>>();
  const addedTasksByPhase = new Map<number, ScopeSnapshotTask[]>();
  const addedPhases: Array<{ phase: ScopeSnapshotPhase; afterPhaseIndex?: number }> = [];

  const toSnapshotTask = (task: NewTaskInput): ScopeSnapshotTask => ({
    taskName: task.taskName,
    roleTitle: task.roleTitle,
    location: task.location ?? null,
    experienceLevel: task.experienceLevel ?? null,
    workSchedule: task.workSchedule ?? 'full_time',
    customHours: task.customHours ?? null,
    customFrequency: task.customFrequency ?? null,
    estimatedHours: task.estimatedHours,
  });

  for (const op of operations) {
    switch (op.op) {
      case 'update_task': {
        if (!taskFieldPatches.has(op.phaseIndex)) taskFieldPatches.set(op.phaseIndex, new Map());
        const phaseMap = taskFieldPatches.get(op.phaseIndex)!;
        phaseMap.set(op.taskIndex, { ...(phaseMap.get(op.taskIndex) ?? {}), ...op.fields });
        break;
      }
      case 'remove_task': {
        if (!removedTaskIndexes.has(op.phaseIndex)) removedTaskIndexes.set(op.phaseIndex, new Set());
        removedTaskIndexes.get(op.phaseIndex)!.add(op.taskIndex);
        break;
      }
      case 'add_task': {
        if (!addedTasksByPhase.has(op.phaseIndex)) addedTasksByPhase.set(op.phaseIndex, []);
        addedTasksByPhase.get(op.phaseIndex)!.push(toSnapshotTask(op.task));
        break;
      }
      case 'update_phase': {
        phaseFieldPatches.set(op.phaseIndex, { ...(phaseFieldPatches.get(op.phaseIndex) ?? {}), ...op.fields });
        break;
      }
      case 'remove_phase': {
        removedPhaseIndexes.add(op.phaseIndex);
        break;
      }
      case 'add_phase': {
        addedPhases.push({
          phase: {
            ...op.phase,
            tasks: op.phase.tasks.map((t) => toSnapshotTask(t)),
          },
          afterPhaseIndex: op.afterPhaseIndex,
        });
        break;
      }
    }
  }

  const resultPhases: ScopeSnapshotPhase[] = [];

  snapshot.forEach((phase, phaseIndex) => {
    if (!removedPhaseIndexes.has(phaseIndex)) {
      const taskRemovals = removedTaskIndexes.get(phaseIndex) ?? new Set<number>();
      const taskPatches = taskFieldPatches.get(phaseIndex) ?? new Map<number, Partial<ScopeSnapshotTask>>();

      const survivingTasks = phase.tasks
        .map((task, taskIndex) => {
          if (taskRemovals.has(taskIndex)) return null;
          const patch = taskPatches.get(taskIndex);
          return patch ? { ...task, ...patch } : task;
        })
        .filter((t): t is ScopeSnapshotTask => t !== null);

      const newTasks = addedTasksByPhase.get(phaseIndex) ?? [];
      const phasePatch = phaseFieldPatches.get(phaseIndex);

      resultPhases.push({
        ...phase,
        ...(phasePatch ?? {}),
        tasks: [...survivingTasks, ...newTasks],
      });
    }

    for (const added of addedPhases.filter((a) => a.afterPhaseIndex === phaseIndex)) {
      resultPhases.push(added.phase);
    }
  });

  for (const added of addedPhases.filter(
    (a) =>
      a.afterPhaseIndex === undefined ||
      a.afterPhaseIndex < 0 ||
      a.afterPhaseIndex >= snapshot.length,
  )) {
    resultPhases.push(added.phase);
  }

  return resultPhases;
}

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
  ): Promise<{
    phases: JobListingPhase[];
    totalBudgetUsdCents: number;
    isBudgetStale: boolean;
  }> {
    const phases = await this.applyAiGeneratedScope(listingId, rawPhases, hasScope);
    const { totalBudgetUsdCents, isBudgetStale } =
      await this.budgetService.recalculateAndPersistWithStatus(listingId, phases);

    await this.listingRepo.update(listingId, {
      budgetAmountUsdCents: totalBudgetUsdCents,
      lastActivityAt: new Date(),
      staleWarningSent: false,
    });

    return { phases, totalBudgetUsdCents, isBudgetStale };
  }

  // ── applySmartAssistantScopeOperations ─────────────────────────────────────
  // Called when the client submits the "I want to change..." field in Step 4.
  // Unlike applyAiGeneratedScope (delete-all-and-reinsert), this applies the
  // operations as TARGETED mutations against the listing's current phases/
  // tasks — updates in place, creates only what's added, deletes only what's
  // removed — inside a single transaction. Appends an entry to
  // smartAssistantHistory on the listing. Budget and timeline are
  // recalculated on the new scope before returning, matching
  // applyGeneratedScopeAndRecalculate's outside-the-transaction placement
  // (the budget service uses its own injected repos, not the transaction's
  // manager, so it must run only after the mutating transaction has
  // committed — same ordering this method's delete-all-reinsert predecessor
  // already relied on).
  async applySmartAssistantScopeOperations(
    listing: JobListing,
    operations: ScopeOperation[],
    command: string,
  ): Promise<{
    phases: JobListingPhase[];
    totalBudgetUsdCents: number;
    isBudgetStale: boolean;
  }> {
    // Snapshot current scope before mutating (for history entry). A separate
    // read from the one the mutation transaction below takes, same as the
    // delete-all-reinsert path always did — independent object references so
    // the in-place entity mutations below can never retroactively change
    // what "before" recorded.
    const beforePhases = await this.phaseRepo.find({
      where: { jobListingId: listing.id },
      relations: ['tasks'],
      order: { positionOrder: 'ASC' },
    });
    beforePhases.forEach((phase) => {
      phase.tasks = [...(phase.tasks ?? [])].sort((a, b) => a.positionOrder - b.positionOrder);
    });

    const savedPhases = await this.applyScopeOperationsInTransaction(listing.id, operations);

    const { totalBudgetUsdCents, isBudgetStale } =
      await this.budgetService.recalculateAndPersistWithStatus(
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

    return { phases: savedPhases, totalBudgetUsdCents, isBudgetStale };
  }

  private applyTaskFieldPatch(task: JobListingTask, patch: TaskOperationFields): void {
    if (patch.taskName !== undefined) task.taskName = patch.taskName;
    if (patch.roleTitle !== undefined) task.roleTitle = patch.roleTitle;
    if (patch.location !== undefined) task.location = patch.location;
    if (patch.experienceLevel !== undefined) task.experienceLevel = patch.experienceLevel;
    if (patch.workSchedule !== undefined) task.workSchedule = patch.workSchedule as any;
    if (patch.customHours !== undefined) task.customHours = patch.customHours;
    if (patch.customFrequency !== undefined) task.customFrequency = patch.customFrequency;
    if (patch.estimatedHours !== undefined) task.estimatedHours = patch.estimatedHours;
  }

  private applyPhaseFieldPatch(phase: JobListingPhase, patch: PhaseOperationFields): void {
    if (patch.phaseName !== undefined) phase.phaseName = patch.phaseName;
    if (patch.recurrenceSchedule !== undefined) phase.recurrenceSchedule = patch.recurrenceSchedule as any;
    if (patch.recurrenceCount !== undefined) phase.recurrenceCount = patch.recurrenceCount;
    if (patch.durationDays !== undefined) phase.durationDays = patch.durationDays;
  }

  private async createPhaseEntityFromInput(
    manager: EntityManager,
    listingId: string,
    input: NewPhaseInput,
  ): Promise<JobListingPhase> {
    const phase = manager.create(JobListingPhase, {
      jobListingId: listingId,
      phaseName: input.phaseName,
      phaseType: this.mapPhaseType(input.phaseType),
      positionOrder: 0, // renumbered by the caller once final order is known
      durationDays: input.durationDays ?? null,
      recurrenceSchedule: (input.recurrenceSchedule as any) ?? null,
      recurrenceCount: input.recurrenceCount ?? null,
      tasks: [],
    });
    const savedPhase = await manager.save(JobListingPhase, phase);
    savedPhase.tasks = [];

    for (let i = 0; i < input.tasks.length; i++) {
      const t = input.tasks[i];
      const task = manager.create(JobListingTask, {
        phaseId: savedPhase.id,
        taskName: t.taskName,
        roleTitle: t.roleTitle,
        location: t.location ?? null,
        experienceLevel: t.experienceLevel ?? null,
        workSchedule: (t.workSchedule as any) ?? 'full_time',
        customHours: t.customHours ?? null,
        customFrequency: t.customFrequency ?? null,
        estimatedHours: t.estimatedHours,
        positionOrder: i,
      });
      savedPhase.tasks.push(await manager.save(JobListingTask, task));
    }

    return savedPhase;
  }

  // Loads the listing's current phases/tasks fresh, resolves every
  // operation's phaseIndex/taskIndex against that snapshot (mirroring
  // applyOperationsToSnapshot's partitioning exactly, but mutating real
  // entities via targeted save/update/delete instead of building a plain
  // object), renumbers positionOrder, and returns the resulting full
  // JobListingPhase[] with real, persisted ids. Single transaction — if
  // anything fails the scope is unchanged.
  private async applyScopeOperationsInTransaction(
    listingId: string,
    operations: ScopeOperation[],
  ): Promise<JobListingPhase[]> {
    return this.dataSource.transaction(async (manager) => {
      const currentPhases = await manager.find(JobListingPhase, {
        where: { jobListingId: listingId },
        relations: ['tasks'],
        order: { positionOrder: 'ASC' },
      });
      currentPhases.forEach((phase) => {
        phase.tasks = [...(phase.tasks ?? [])].sort((a, b) => a.positionOrder - b.positionOrder);
      });

      const removedPhaseIndexes = new Set<number>();
      const removedTaskIndexes = new Map<number, Set<number>>();
      const taskFieldPatches = new Map<number, Map<number, TaskOperationFields>>();
      const phaseFieldPatches = new Map<number, PhaseOperationFields>();
      const addedTasksByPhase = new Map<number, NewTaskInput[]>();
      const addedPhaseOps: Array<{ phase: NewPhaseInput; afterPhaseIndex?: number }> = [];

      for (const op of operations) {
        switch (op.op) {
          case 'update_task': {
            if (!taskFieldPatches.has(op.phaseIndex)) taskFieldPatches.set(op.phaseIndex, new Map());
            const phaseMap = taskFieldPatches.get(op.phaseIndex)!;
            phaseMap.set(op.taskIndex, { ...(phaseMap.get(op.taskIndex) ?? {}), ...op.fields });
            break;
          }
          case 'remove_task': {
            if (!removedTaskIndexes.has(op.phaseIndex)) removedTaskIndexes.set(op.phaseIndex, new Set());
            removedTaskIndexes.get(op.phaseIndex)!.add(op.taskIndex);
            break;
          }
          case 'add_task': {
            if (!addedTasksByPhase.has(op.phaseIndex)) addedTasksByPhase.set(op.phaseIndex, []);
            addedTasksByPhase.get(op.phaseIndex)!.push(op.task);
            break;
          }
          case 'update_phase': {
            phaseFieldPatches.set(op.phaseIndex, { ...(phaseFieldPatches.get(op.phaseIndex) ?? {}), ...op.fields });
            break;
          }
          case 'remove_phase': {
            removedPhaseIndexes.add(op.phaseIndex);
            break;
          }
          case 'add_phase': {
            addedPhaseOps.push({ phase: op.phase, afterPhaseIndex: op.afterPhaseIndex });
            break;
          }
        }
      }

      const finalPhases: JobListingPhase[] = [];

      for (let phaseIndex = 0; phaseIndex < currentPhases.length; phaseIndex++) {
        const phase = currentPhases[phaseIndex];

        if (removedPhaseIndexes.has(phaseIndex)) {
          await manager.delete(JobListingPhase, phase.id); // cascades to tasks
        } else {
          const taskRemovals = removedTaskIndexes.get(phaseIndex) ?? new Set<number>();
          const taskPatches = taskFieldPatches.get(phaseIndex) ?? new Map<number, TaskOperationFields>();
          const survivingTasks: JobListingTask[] = [];

          for (let taskIndex = 0; taskIndex < phase.tasks.length; taskIndex++) {
            const task = phase.tasks[taskIndex];
            if (taskRemovals.has(taskIndex)) {
              await manager.delete(JobListingTask, task.id);
              continue;
            }
            const patch = taskPatches.get(taskIndex);
            if (patch) {
              this.applyTaskFieldPatch(task, patch);
              await manager.save(JobListingTask, task);
            }
            survivingTasks.push(task);
          }

          for (const input of addedTasksByPhase.get(phaseIndex) ?? []) {
            const created = manager.create(JobListingTask, {
              phaseId: phase.id,
              taskName: input.taskName,
              roleTitle: input.roleTitle,
              location: input.location ?? null,
              experienceLevel: input.experienceLevel ?? null,
              workSchedule: (input.workSchedule as any) ?? 'full_time',
              customHours: input.customHours ?? null,
              customFrequency: input.customFrequency ?? null,
              estimatedHours: input.estimatedHours,
              positionOrder: survivingTasks.length,
            });
            survivingTasks.push(await manager.save(JobListingTask, created));
          }

          for (let i = 0; i < survivingTasks.length; i++) {
            if (survivingTasks[i].positionOrder !== i) {
              survivingTasks[i].positionOrder = i;
              await manager.update(JobListingTask, survivingTasks[i].id, { positionOrder: i });
            }
          }

          const phasePatch = phaseFieldPatches.get(phaseIndex);
          if (phasePatch) {
            this.applyPhaseFieldPatch(phase, phasePatch);
            await manager.save(JobListingPhase, phase);
          }

          phase.tasks = survivingTasks;
          finalPhases.push(phase);
        }

        for (const added of addedPhaseOps.filter((a) => a.afterPhaseIndex === phaseIndex)) {
          finalPhases.push(await this.createPhaseEntityFromInput(manager, listingId, added.phase));
        }
      }

      for (const added of addedPhaseOps.filter(
        (a) =>
          a.afterPhaseIndex === undefined ||
          a.afterPhaseIndex < 0 ||
          a.afterPhaseIndex >= currentPhases.length,
      )) {
        finalPhases.push(await this.createPhaseEntityFromInput(manager, listingId, added.phase));
      }

      for (let i = 0; i < finalPhases.length; i++) {
        if (finalPhases[i].positionOrder !== i) {
          finalPhases[i].positionOrder = i;
          await manager.update(JobListingPhase, finalPhases[i].id, { positionOrder: i });
        }
      }

      return finalPhases;
    });
  }

  async restoreSmartAssistantScopeEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{
    phases: JobListingPhase[];
    totalBudgetUsdCents: number;
    isBudgetStale: boolean;
  }> {
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

    const { totalBudgetUsdCents, isBudgetStale } =
      await this.budgetService.recalculateAndPersistWithStatus(
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

    return { phases: savedPhases, totalBudgetUsdCents, isBudgetStale };
  }

  // ── loadInheritedScope ─────────────────────────────────────────────────────
  // Fetches the scope from contracts-service for an existing contract listing.
  // The phases are NOT persisted in job_listing_phases — they are returned as
  // read-only display data in the GET /v1/job-listings/:id response.
  // isInherited: true signals the frontend to render them as non-editable.
  async undoLatestSmartAssistantScopeEdit(
    listing: JobListing,
    historyId: string,
  ): Promise<{
    phases: JobListingPhase[];
    totalBudgetUsdCents: number;
    isBudgetStale: boolean;
  }> {
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

    const { totalBudgetUsdCents, isBudgetStale } =
      await this.budgetService.recalculateAndPersistWithStatus(
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

    return { phases: savedPhases, totalBudgetUsdCents, isBudgetStale };
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
