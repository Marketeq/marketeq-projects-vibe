// PMCM-258: single source of truth for scope duration and pricing-period
// math. Before this, my-listings/[slug]/page.tsx, edit-listing/[slug]/
// page.tsx, and project-details/[slug]/page.tsx each had their own
// near-duplicate copy of this logic — the project-details copy never
// handled a "months" task duration (treated it as raw days), and all
// three disagreed on the Yearly-availability threshold (365 vs 360) and
// on rounding (Math.round vs Math.ceil). This module standardizes on:
//   - the months factor already used by scope-builder's own
//     getPhaseDurationInDays (×30), so phase day-ranges and pricing
//     duration agree,
//   - a 364-day (52-week) Yearly threshold (AC2/E2), and
//   - Math.ceil to whole dollars per period, matching what the buyer
//     page's pre-existing installment-plan logic already did (docs:
//     Installment Plans §04) — the editor pages' Math.round changes to
//     match; see the PMCM-258 report for the exact before/after.
// No page should reimplement any of this — import from here instead.

export type PricingPeriod = "week" | "biweek" | "month" | "quarter" | "year"

export const PERIODS: readonly PricingPeriod[] = [
  "week",
  "biweek",
  "month",
  "quarter",
  "year",
]

// Informal/lowercase labels matching each editor widget's existing copy
// verbatim (my-listings' and the buyer page's Listbox both already read
// this way) — kept as-is per the ticket's "keep the existing phrasing"
// instruction, not replaced with the capitalized full labels below.
export const PERIOD_WIDGET_LABELS: Readonly<Record<PricingPeriod, string>> = {
  week: "week",
  biweek: "2 weeks",
  month: "month",
  quarter: "quarter",
  year: "year",
}

// Full labels (AC2's own wording: "Weekly, Every 2 Weeks, Monthly,
// Quarterly, Yearly") for any place that needs the spelled-out form
// rather than the widget's informal phrasing.
export const PERIOD_FULL_LABELS: Readonly<Record<PricingPeriod, string>> = {
  week: "Weekly",
  biweek: "Every 2 Weeks",
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly",
}

const PERIOD_DAYS: Readonly<Record<PricingPeriod, number>> = {
  week: 7,
  biweek: 14,
  month: 30,
  quarter: 90,
  // 52 weeks — matches the Yearly-availability threshold (AC2/E2), not
  // a calendar year, so "available" and "period length" never disagree.
  year: 364,
}

// The one months-to-days factor, used everywhere duration is computed.
const MONTH_DAYS = 30

type DurationObject = {
  value?: number | string | null
  type?: "hours" | "days" | "weeks" | "months" | string | null
}

type TaskLike = {
  duration?: DurationObject | string | null
  estimatedHours?: number | string | null
}

type PhaseLike = {
  rows?: readonly TaskLike[] | null
  tasks?: readonly TaskLike[] | null
}

function taskDurationDays(task: TaskLike | null | undefined): number {
  const dur = task?.duration

  if (dur && typeof dur === "object") {
    const value = Number(dur.value) || 0
    if (value > 0) {
      if (dur.type === "weeks") return value * 7
      if (dur.type === "months") return value * MONTH_DAYS
      if (dur.type === "hours") return Math.max(1, Math.ceil(value / 24))
      return value // days (and the "no type" case)
    }
  }

  if (typeof dur === "string" && dur.trim()) {
    const [rawValue, rawUnit] = dur.trim().split(/\s+/)
    const value = Number(rawValue) || 0
    const unit = (rawUnit || "days").toLowerCase()
    if (value > 0) {
      if (unit.startsWith("week")) return value * 7
      if (unit.startsWith("month")) return value * MONTH_DAYS
      if (unit.startsWith("hour")) return Math.max(1, Math.ceil(value / 24))
      return value
    }
  }

  // No explicit duration — fall back to estimatedHours at 40 hrs/week.
  const hours = Number(task?.estimatedHours) || 0
  return hours > 0 ? Math.max(1, Math.round((hours * 7) / 40)) : 0
}

/**
 * Tasks within a phase run in parallel (the phase's length is the longest
 * task); phases themselves are sequential (summed). Handles every task
 * duration form seen across the three pages: the {value,type} object
 * (hours/days/weeks/months), the "N weeks"-style string form, and the
 * estimatedHours@40h/week fallback when neither is present.
 */
export function scopeDurationDays(
  phases: readonly PhaseLike[] | null | undefined
): number {
  if (!Array.isArray(phases)) return 0
  let totalDays = 0
  for (const phase of phases) {
    const rows: readonly TaskLike[] = phase?.rows ?? phase?.tasks ?? []
    const taskDays = rows
      .map((task: TaskLike) => taskDurationDays(task))
      .filter((days: number): days is number => days > 0)
    if (taskDays.length > 0) totalDays += Math.max(...taskDays)
  }
  return totalDays
}

/**
 * X2: <7 days -> days; <4 weeks (28 days) -> weeks (ceil); else -> months
 * (ceil /30). Returns "—" for a non-positive day count (no scope yet).
 */
export function formatDuration(days: number): string {
  if (days <= 0) return "—"
  if (days < 7) {
    return `${days} Day${days !== 1 ? "s" : ""}`
  }
  if (days < 28) {
    const weeks = Math.max(1, Math.ceil(days / 7))
    return `${weeks} Week${weeks !== 1 ? "s" : ""}`
  }
  const months = Math.max(1, Math.ceil(days / MONTH_DAYS))
  return `${months} Month${months !== 1 ? "s" : ""}`
}

/**
 * E2: a Project's Yearly option only appears once the scope runs at least
 * 52 weeks (364 days). A Service listing's duration is open-ended, so
 * every period stays selectable regardless of the computed cycle length.
 */
export function availablePeriods(
  days: number,
  isService: boolean
): PricingPeriod[] {
  if (isService) return [...PERIODS]
  return PERIODS.filter(
    (period) => period !== "year" || days >= PERIOD_DAYS.year
  )
}

/**
 * total ÷ max(1, ceil(days / periodDays)), ceil'd to whole dollars — the
 * buyer page's pre-existing installment-plan rounding (docs: Installment
 * Plans §04), now the one rule every page uses. `totalCents` is USD
 * cents; the return value is whole dollars.
 */
export function costPerPeriod(
  totalCents: number,
  days: number,
  period: PricingPeriod
): number {
  if (totalCents <= 0 || days <= 0) return 0
  const periodCount = Math.max(1, Math.ceil(days / PERIOD_DAYS[period]))
  return Math.ceil(totalCents / 100 / periodCount)
}

/**
 * Accepts a legacy "2-week"/"2 weeks" value (the pre-PMCM-258 key used by
 * my-listings/the wizard) as the canonical "biweek", and any other
 * unrecognized value as "week" (the prior default everywhere).
 */
export function normalizePeriod(
  period: string | null | undefined
): PricingPeriod {
  if (period === "2-week" || period === "2 weeks") return "biweek"
  if ((PERIODS as readonly string[]).includes(period ?? "")) {
    return period as PricingPeriod
  }
  return "week"
}

/**
 * Resolves a requested period (e.g. the persisted pricingPeriod, or the
 * current widget selection) against what's actually available for this
 * listing's current duration — if it's no longer available (the AC2/E2
 * case: duration dropped under 52 weeks while Yearly was selected), falls
 * back to biweek rather than silently picking Weekly.
 */
export function resolvePeriod(
  period: string | null | undefined,
  days: number,
  isService: boolean,
  fallback: PricingPeriod = "week"
): PricingPeriod {
  const requested = period ? normalizePeriod(period) : fallback
  const available = availablePeriods(days, isService)
  return available.includes(requested) ? requested : "biweek"
}
