import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { WorkSchedule } from '../enums/work-schedule.enum';
import { CreatePhaseDto } from '../dto/create-phase.dto';
import { UpdatePhaseDto } from '../dto/update-phase.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ReorderPhasesDto } from '../dto/reorder-phases.dto';
import { JobListingScopeService } from './job-listing-scope.service';
import { JobListingBudgetService } from './job-listing-budget.service';

@Injectable()
export class JobListingPhaseService {
  constructor(
    @InjectRepository(JobListingPhase)
    private readonly phaseRepo: Repository<JobListingPhase>,
    @InjectRepository(JobListingTask)
    private readonly taskRepo: Repository<JobListingTask>,
    private readonly scopeService: JobListingScopeService,
    private readonly budgetService: JobListingBudgetService,
  ) {}

  // ── PHASES ───────────────────────────────────────────────────────────────

  // Delegates to JobListingScopeService which enforces ordering and type rules.
  addPhase(listingId: string, dto: CreatePhaseDto): Promise<JobListingPhase> {
    return this.scopeService.addPhase(listingId, dto);
  }

  async updatePhase(
    listingId: string,
    phaseId: string,
    dto: UpdatePhaseDto,
  ): Promise<JobListingPhase> {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, jobListingId: listingId },
    });
    if (!phase) throw new NotFoundException('Phase not found.');

    if (dto.phaseName          !== undefined) phase.phaseName          = dto.phaseName;
    if (dto.durationDays       !== undefined) phase.durationDays       = dto.durationDays;
    if (dto.recurrenceSchedule !== undefined) phase.recurrenceSchedule = dto.recurrenceSchedule;
    if (dto.recurrenceCount    !== undefined) phase.recurrenceCount    = dto.recurrenceCount;

    return this.phaseRepo.save(phase);
  }

  async removePhase(listingId: string, phaseId: string): Promise<void> {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, jobListingId: listingId },
    });
    if (!phase) throw new NotFoundException('Phase not found.');

    const removedPosition = phase.positionOrder;
    await this.phaseRepo.remove(phase);

    // Close the gap in positionOrder for the remaining phases.
    const remaining = await this.phaseRepo.find({
      where: { jobListingId: listingId },
      order: { positionOrder: 'ASC' },
    });
    for (const p of remaining) {
      if (p.positionOrder > removedPosition) {
        await this.phaseRepo.update(p.id, { positionOrder: p.positionOrder - 1 });
      }
    }

    // Recalculate budget and timeline now that a phase (and its tasks) is gone.
    await this.triggerRecalculation(listingId);
  }

  // Delegates to JobListingScopeService which validates anchor positions.
  // After reorder, timeline recalculates because task sequence has changed.
  async reorderPhases(listingId: string, dto: ReorderPhasesDto): Promise<void> {
    await this.scopeService.reorderPhases(listingId, dto);
    await this.triggerRecalculation(listingId);
  }

  // ── TASKS ────────────────────────────────────────────────────────────────

  async addTask(
    listingId: string,
    phaseId: string,
    dto: CreateTaskDto,
  ): Promise<JobListingTask> {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, jobListingId: listingId },
    });
    if (!phase) throw new NotFoundException('Phase not found.');

    if (dto.workSchedule === WorkSchedule.CUSTOM) {
      if (!dto.customHours || !dto.customFrequency) {
        throw new UnprocessableEntityException(
          'customHours and customFrequency are required when workSchedule is CUSTOM.',
        );
      }
    }

    const taskCount = await this.taskRepo.count({ where: { phaseId } });

    const task = this.taskRepo.create({
      phaseId,
      taskName:        dto.taskName,
      roleTitle:       dto.roleTitle,
      location:        dto.location        ?? null,
      experienceLevel: dto.experienceLevel ?? null,
      workSchedule:    dto.workSchedule,
      customHours:     dto.customHours     ?? null,
      customFrequency: dto.customFrequency ?? null,
      estimatedHours:  dto.estimatedHours,
      positionOrder:   taskCount,
    });

    const saved = await this.taskRepo.save(task);

    // New task adds its hours × rate to the budget total.
    await this.triggerRecalculation(listingId);

    return saved;
  }

  async updateTask(
    listingId: string,
    phaseId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<JobListingTask> {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, jobListingId: listingId },
    });
    if (!phase) throw new NotFoundException('Phase not found.');

    const task = await this.taskRepo.findOne({ where: { id: taskId, phaseId } });
    if (!task) throw new NotFoundException('Task not found.');

    if (dto.taskName        !== undefined) task.taskName        = dto.taskName;
    if (dto.roleTitle       !== undefined) task.roleTitle       = dto.roleTitle;
    if (dto.location        !== undefined) task.location        = dto.location;
    if (dto.experienceLevel !== undefined) task.experienceLevel = dto.experienceLevel;
    if (dto.workSchedule    !== undefined) task.workSchedule    = dto.workSchedule;
    if (dto.customHours     !== undefined) task.customHours     = dto.customHours;
    if (dto.customFrequency !== undefined) task.customFrequency = dto.customFrequency;
    if (dto.estimatedHours  !== undefined) task.estimatedHours  = dto.estimatedHours;

    const saved = await this.taskRepo.save(task);

    // Any field change that affects hours, rate, or schedule triggers recalculation.
    await this.triggerRecalculation(listingId);

    return saved;
  }

  async removeTask(listingId: string, phaseId: string, taskId: string): Promise<void> {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, jobListingId: listingId },
    });
    if (!phase) throw new NotFoundException('Phase not found.');

    const task = await this.taskRepo.findOne({ where: { id: taskId, phaseId } });
    if (!task) throw new NotFoundException('Task not found.');

    const removedPosition = task.positionOrder;
    await this.taskRepo.remove(task);

    // Close the gap in positionOrder for remaining tasks in this phase.
    const remaining = await this.taskRepo.find({
      where: { phaseId },
      order: { positionOrder: 'ASC' },
    });
    for (const t of remaining) {
      if (t.positionOrder > removedPosition) {
        await this.taskRepo.update(t.id, { positionOrder: t.positionOrder - 1 });
      }
    }

    // Removed task subtracts its hours × rate from the budget total.
    await this.triggerRecalculation(listingId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  // Reloads all phases+tasks for the listing and runs budget + timeline recalc.
  // Called after any task or phase mutation.
  private async triggerRecalculation(listingId: string): Promise<void> {
    const phases = await this.phaseRepo.find({
      where: { jobListingId: listingId },
      relations: ['tasks'],
      order: { positionOrder: 'ASC' },
    });
    await this.budgetService.recalculateAndPersist(listingId, phases);
  }
}
