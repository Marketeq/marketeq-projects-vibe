import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { JobListing } from '../entities/job-listing.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { WorkSchedule } from '../enums/work-schedule.enum';

// ── Hours per week for each standard schedule ────────────────────────────────
const HOURS_PER_WEEK: Record<string, number> = {
  full_time: 40,
  part_time: 20,
};

const WORKING_DAYS_PER_WEEK = 5;

// ── normalizeExperienceLevel ──────────────────────────────────────────────
// pricing-service now stores and accepts the full 5-level scale (student/
// junior/medior/senior/guru), matching Step 4's picker and the shared
// scope-builder component — no collapsing needed, just lowercasing. The old
// 3-level 'mid' value is intentionally NOT mapped to 'medior' — it isn't
// supported. A task still carrying the legacy value falls through to
// pricing-service as literal "mid", which pricing-service's @IsIn now
// rejects (400), yielding a zero rate via getRateUsdCents's catch — same
// safe-fallback behavior as any other unresolvable rate lookup.
// Same mapping as publish.service.ts's signInternalToken-adjacent EXP map;
// kept local here rather than shared to avoid a cross-file dependency for
// two small lookup tables.
const EXPERIENCE_LEVEL_MAP: Record<string, string> = {
  student: 'student',
  junior:  'junior',
  medior:  'medior',
  senior:  'senior',
  guru:    'guru',
};

function normalizeExperienceLevel(experienceLevel: string | null): string | undefined {
  if (!experienceLevel) return undefined;
  const key = experienceLevel.toLowerCase();
  return EXPERIENCE_LEVEL_MAP[key] ?? key;
}

// ── normalizeLocation ─────────────────────────────────────────────────────
// pricing-service only understands 8 broad regions (GetRatesQueryDto's
// @IsIn list). Step 4's location field is CountriesCombobox — 56 individual
// countries (frontend/components/own-combobox.tsx's COUNTRY_CODES) — so a
// raw country name 400s against pricing-service every time except "Canada",
// which happens to collide with a region name.
//
// Bucketing follows the same rate-tier groupings hourlyRateForTask already
// uses for its static-fallback multipliers (../../shared/utils/pricing.ts)
// — this isn't a new taxonomy, just making that existing grouping explicit
// and complete for all 56 CountriesCombobox countries. Judgment calls, since
// pricing-service has no matching region for these at all:
//   - Australia / New Zealand → United States (hourlyRateForTask already
//     rate-tiers them with US/UK/Canada as developed anglophone markets;
//     there's no "Oceania" region to put them in instead)
//   - Japan / South Korea / China → Southeast Asia (hourlyRateForTask
//     explicitly rate-tiers "east asia" the same as Southeast Asia)
//   - Israel → Southeast Asia (hourlyRateForTask explicitly rate-tiers
//     "middle east" the same as Southeast Asia)
//   - Nigeria / Kenya / South Africa / Egypt → South Asia (pricing-service
//     has no Africa region at all; hourlyRateForTask's Africa multiplier,
//     0.25, is numerically identical to its South Asia multiplier, so this
//     is the closest existing rate tier, not a geographic claim)
// If any of these read wrong for the business, they're isolated in this one
// map — easy to revisit without touching the lookup logic around it.
// Exported so job-listing-ai.service.ts can build its "pick a country" prompt
// instruction and validate AI output from this exact same list — one source
// of truth instead of a third hardcoded copy.
export const COUNTRY_TO_REGION: Record<string, string> = {
  'United States': 'United States',
  'Canada': 'Canada',
  'United Kingdom': 'United Kingdom',
  'Australia': 'United States',
  'New Zealand': 'United States',

  'Germany': 'Western Europe',
  'France': 'Western Europe',
  'Spain': 'Western Europe',
  'Italy': 'Western Europe',
  'Netherlands': 'Western Europe',
  'Sweden': 'Western Europe',
  'Norway': 'Western Europe',
  'Denmark': 'Western Europe',
  'Finland': 'Western Europe',
  'Switzerland': 'Western Europe',
  'Austria': 'Western Europe',
  'Belgium': 'Western Europe',
  'Ireland': 'Western Europe',
  'Portugal': 'Western Europe',
  'Greece': 'Western Europe',

  'Ukraine': 'Eastern Europe',
  'Poland': 'Eastern Europe',
  'Romania': 'Eastern Europe',
  'Czech Republic': 'Eastern Europe',
  'Hungary': 'Eastern Europe',
  'Turkey': 'Eastern Europe',
  'Russia': 'Eastern Europe',
  'Estonia': 'Eastern Europe',
  'Latvia': 'Eastern Europe',
  'Lithuania': 'Eastern Europe',
  'Croatia': 'Eastern Europe',
  'Serbia': 'Eastern Europe',
  'Bulgaria': 'Eastern Europe',

  'Brazil': 'Latin America',
  'Mexico': 'Latin America',
  'Argentina': 'Latin America',
  'Colombia': 'Latin America',
  'Chile': 'Latin America',

  'India': 'South Asia',
  'Pakistan': 'South Asia',
  'Bangladesh': 'South Asia',
  'Sri Lanka': 'South Asia',
  'Nigeria': 'South Asia',
  'Kenya': 'South Asia',
  'South Africa': 'South Asia',
  'Egypt': 'South Asia',

  'Philippines': 'Southeast Asia',
  'Thailand': 'Southeast Asia',
  'Vietnam': 'Southeast Asia',
  'Indonesia': 'Southeast Asia',
  'Malaysia': 'Southeast Asia',
  'Singapore': 'Southeast Asia',
  'Japan': 'Southeast Asia',
  'South Korea': 'Southeast Asia',
  'China': 'Southeast Asia',
  'Israel': 'Southeast Asia',
};

// Lowercase-keyed copy so lookups tolerate minor casing drift (e.g. an LLM
// emitting "united states" instead of "United States") instead of silently
// falling through to "omitted".
const COUNTRY_TO_REGION_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_REGION).map(([country, region]) => [country.toLowerCase(), region]),
);

function normalizeLocation(location: string | null): string | undefined {
  if (!location) return undefined;
  return COUNTRY_TO_REGION_LOWER[location.toLowerCase()];
}

// ── REGION_TO_COUNTRIES ──────────────────────────────────────────────────
// The reverse of COUNTRY_TO_REGION — every real country grouped under its
// region tag. Derived, not hand-maintained, so it can never drift out of
// sync with the forward map. Used by job-listing-ai.service.ts's Smart
// Assistant: when the AI decides a task should move to a different region
// for cost reasons, the UI's location field still needs one specific real
// country (Step 4's CountriesCombobox has no "region" option), so a country
// gets picked from this list for whichever region the AI chose.
export const REGION_TO_COUNTRIES: Record<string, string[]> = Object.entries(
  COUNTRY_TO_REGION,
).reduce<Record<string, string[]>>((byRegion, [country, region]) => {
  (byRegion[region] ??= []).push(country);
  return byRegion;
}, {});

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

// ── calculateTotalWorkingDays ─────────────────────────────────────────────
// Sums working days across every task in every phase. Tasks are fully
// sequential (see assignTaskDays above) — there is no parallelism modeled,
// so this sum IS the project's total timeline in working days. Pure and
// synchronous (no pricing-service lookup, unlike calculateTotalBudget), so
// it's cheap enough to call unconditionally as a fallback when the client
// doesn't supply its own already-computed figure (mirrors the frontend's
// getProjectTimelineDaysFromScope in job-listing/page.tsx).
export function calculateTotalWorkingDays(phases: JobListingPhase[]): number {
  let totalWorkingDays = 0;
  for (const phase of phases) {
    for (const task of phase.tasks) {
      totalWorkingDays += calculateTaskDurationDays(task);
    }
  }
  return totalWorkingDays;
}

// ── calculateProjectDurationWeeks ────────────────────────────────────────────
// This is the read-only value shown in the Timeline Calculator panel.
// The client cannot set it directly — it changes only when tasks change.
export function calculateProjectDurationWeeks(phases: JobListingPhase[]): number {
  return Math.ceil(calculateTotalWorkingDays(phases) / 5);
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
  // Returns 0 when pricing-service has no rate or is unavailable so the
  // listing can remain saveable/publishable while the budget is stale.
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
              location:   normalizeLocation(location),
              experience: normalizeExperienceLevel(experienceLevel),
            },
            headers: { Authorization: `Bearer ${this.signInternalToken()}` },
          },
        ),
      );
      const median = response.data.hourlyRateMedianUsdCents;
      if (median != null) return median;

      this.logger.warn(
        `No platform rate data for "${roleTitle}" in "${location ?? 'any'}" — using zero rate`,
      );
    } catch {
      this.logger.warn(`pricing-service unavailable for rate lookup: ${roleTitle}`);
    }

    return 0;
  }

  // Signs a short-lived internal token for pricing-service's InternalJwtGuard.
  // Same pattern as publish.service.ts's signInternalToken() — HS256 with the
  // shared JWT_SECRET, sub identifies the calling service.
  private signInternalToken(): string {
    const secret = this.config.get<string>('JWT_SECRET') ?? '';
    return jwt.sign({ sub: 'listings-service' }, secret, { expiresIn: '5m' });
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
