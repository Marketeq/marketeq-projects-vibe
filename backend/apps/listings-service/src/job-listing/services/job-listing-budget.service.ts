import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { JobListing } from '../entities/job-listing.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { WorkSchedule } from '../enums/work-schedule.enum';
import { hourlyRateForTask, popularRegionForRole } from '../../shared/utils/pricing';

// ── Hours per week for each standard schedule ────────────────────────────────
const HOURS_PER_WEEK: Record<string, number> = {
  full_time: 40,
  part_time: 20,
};

const WORKING_DAYS_PER_WEEK = 5;

// ── Frequency label → number of working days in that period ─────────────────
// Used to convert custom hours (e.g. "15 hours per week") into a daily rate.
const FREQUENCY_TO_DAYS: Record<string, number> = {
  per_day:     1,
  per_week:    5,
  per_month:   21.67,
  per_quarter: 65,
  per_year:    260,
};

// ── resolveCustomDailyHours ──────────────────────────────────────────────────
// Converts a custom schedule (e.g. 15 hours per week) into hours per day.
// Example: resolveCustomDailyHours(15, 'per_week') = 15 / 5 = 3 h/day
// Example: resolveCustomDailyHours(80, 'per_month') = 80 / 21.67 ≈ 3.69 h/day
export function resolveCustomDailyHours(
  customHours: number,
  customFrequency: string,
): number {
  const frequencyDays = FREQUENCY_TO_DAYS[customFrequency] ?? 5;
  return customHours / frequencyDays;
}

// ── dailyHours (internal helper) ─────────────────────────────────────────────
// Returns how many hours per day the task worker is scheduled to work.
function dailyHours(task: JobListingTask): number {
  if (task.workSchedule === WorkSchedule.CUSTOM) {
    return resolveCustomDailyHours(task.customHours ?? 0, task.customFrequency ?? 'per_week');
  }
  const weeklyHours = HOURS_PER_WEEK[task.workSchedule] ?? 40;
  return weeklyHours / WORKING_DAYS_PER_WEEK;
}

// ── calculateTaskDurationDays ─────────────────────────────────────────────────
// Returns the duration of a task in working days (weekends excluded).
// Always rounds up — a task that takes 8.1 days takes 9 working days.
//
// Schedule reference:
//   full_time  → 8 h/day  → 80h task = 10 days
//   part_time  → 4 h/day  → 80h task = 20 days
//   custom     → resolved from customHours + customFrequency
export function calculateTaskDurationDays(task: JobListingTask): number {
  const hoursPerDay = dailyHours(task);
  if (hoursPerDay <= 0) return 0;
  return Math.ceil(task.estimatedHours / hoursPerDay);
}

// ── assignTaskDays ────────────────────────────────────────────────────────────
// Assigns startDay and endDay to every task across all phases.
// Tasks within a phase are sequential. Phases are also sequential.
// Day 1 = first working day of the project (always a Monday conceptually).
//
// Example:
//   Phase 1 — Discovery
//     Task A: 40h full_time → 5 days  → startDay=1, endDay=5
//     Task B: 24h full_time → 3 days  → startDay=6, endDay=8
//   Phase 2 — Build
//     Task C: 80h full_time → 10 days → startDay=9, endDay=18
export function assignTaskDays(phases: JobListingPhase[]): JobListingPhase[] {
  let currentDay = 1;
  for (const phase of phases) {
    for (const task of phase.tasks) {
      const duration = calculateTaskDurationDays(task);
      task.startDay = currentDay;
      task.endDay   = currentDay + duration - 1;
      currentDay    = task.endDay + 1;
    }
  }
  return phases;
}

// ── calculateProjectDurationWeeks ────────────────────────────────────────────
// Sums working days across all tasks in all phases and converts to weeks.
// This is the read-only value shown in the Timeline Calculator panel.
// The client cannot set it directly — it changes only when tasks change.
export function calculateProjectDurationWeeks(phases: JobListingPhase[]): number {
  let totalWorkingDays = 0;
  for (const phase of phases) {
    for (const task of phase.tasks) {
      totalWorkingDays += calculateTaskDurationDays(task);
    }
  }
  return Math.ceil(totalWorkingDays / 5);
}

@Injectable()
export class JobListingBudgetService {
  private readonly logger = new Logger(JobListingBudgetService.name);

  constructor(
    @InjectRepository(JobListingTask)
    private readonly taskRepo: Repository<JobListingTask>,
    @InjectRepository(JobListing)
    private readonly listingRepo: Repository<JobListing>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ── getRateUsdCents ─────────────────────────────────────────────────────────
  // Fetches the hourly median rate from pricing-service for a given role,
  // region, and experience level.
  // When location or experienceLevel is missing, pricing-service returns the
  // platform average for the role across all regions/levels.
  // Fallback chain:
  //   1. pricing-service real data (PlatformRateAverage)
  //   2. Static rate table (hourlyRateForTask) using the most popular
  //      sourcing region for the role — produces realistic estimates
  //      when the platform lacks transaction history for a role/region combo.
  async getRateUsdCents(
    roleTitle: string,
    location: string | null,
    experienceLevel: string | null,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.config.get('PRICING_SERVICE_URL')}/v1/rates`,
          {
            params: {
              role:       roleTitle,
              location:   location       ?? undefined,
              experience: experienceLevel ?? undefined,
            },
          },
        ),
      );
      const median = response.data.hourlyRateMedianUsdCents;
      if (median != null) return median;

      // pricing-service returned noData — fall back to static rate table
      this.logger.log(
        `No platform rate data for "${roleTitle}" in "${location ?? 'any'}" — using static fallback`,
      );
    } catch {
      this.logger.warn(`pricing-service unavailable for rate lookup: ${roleTitle}`);
    }

    // Static fallback: use the most popular sourcing region for this role
    // so budget estimates reflect realistic talent market rates.
    const fallbackLocation = location ?? popularRegionForRole(roleTitle);
    const fallbackRate = hourlyRateForTask({
      roleName: roleTitle,
      experienceLevel: experienceLevel ?? 'Medior',
      location: fallbackLocation,
    });
    // hourlyRateForTask returns dollars — convert to USD cents
    return fallbackRate * 100;
  }

  // ── calculateTotalBudget ────────────────────────────────────────────────────
  // Sums (estimatedHours × hourlyRate) for every task in the scope.
  // Also stores the fetched hourlyRateUsdCents on each task record
  // so the frontend can display it in the price guide hover modal.
  // Result is in USD cents.
  async calculateTotalBudget(phases: JobListingPhase[]): Promise<number> {
    let totalUsdCents = 0;
    for (const phase of phases) {
      for (const task of phase.tasks) {
        const rateUsdCents = await this.getRateUsdCents(
          task.roleTitle,
          task.location,
          task.experienceLevel,
        );
        task.hourlyRateUsdCents = rateUsdCents;
        totalUsdCents += Math.round(task.estimatedHours * rateUsdCents);
      }
    }
    return totalUsdCents;
  }

  // ── calculateTeamTableBudget ────────────────────────────────────────────────
  // For Team and Individual listings that use the team member table instead
  // of the scope table. Budget is derived from role rows using contract length.
  // Also stores hourlyRateLow/High on each row for the price guide hover modal.
  async calculateTeamTableBudget(rows: TeamMemberRow[]): Promise<number> {
    let totalUsdCents = 0;
    for (const row of rows) {
      const rateUsdCents = await this.getRateUsdCents(
        row.roleTitle,
        row.location,
        row.experienceLevel,
      );
      row.hourlyRateLowUsdCents  = Math.round(rateUsdCents * 0.85);
      row.hourlyRateHighUsdCents = Math.round(rateUsdCents * 1.15);

      const weeklyHours =
        row.workSchedule === WorkSchedule.FULL_TIME ? 40
        : row.workSchedule === WorkSchedule.PART_TIME ? 20
        : resolveCustomDailyHours(row.customHours ?? 0, row.customFrequency ?? 'per_week') * 5;

      const totalHours = weeklyHours * (row.contractLengthMonths ?? 1) * 4.33;
      totalUsdCents += Math.round(totalHours * rateUsdCents);
    }
    return totalUsdCents;
  }

  // ── recalculateAndPersist ───────────────────────────────────────────────────
  // Called after any task field change that triggers budget or timeline update.
  // Reloads all phases + tasks for the listing, reassigns days, recalculates
  // budget, and saves updated task records back to the database.
  // Returns the new total budget in USD cents.
  async recalculateAndPersist(
    listingId: string,
    phases: JobListingPhase[],
  ): Promise<number> {
    // Re-assign start/end days across all tasks.
    assignTaskDays(phases);

    // Recalculate budget and store rates on tasks.
    const totalUsdCents = await this.calculateTotalBudget(phases);

    // Persist updated startDay, endDay, hourlyRateUsdCents on each task.
    for (const phase of phases) {
      for (const task of phase.tasks) {
        await this.taskRepo.update(task.id, {
          startDay:           task.startDay,
          endDay:             task.endDay,
          hourlyRateUsdCents: task.hourlyRateUsdCents,
        });
      }
    }

    // Persist the new total budget on the listing record itself.
    await this.listingRepo.update(listingId, {
      budgetAmountUsdCents: totalUsdCents,
    });

    return totalUsdCents;
  }
}
