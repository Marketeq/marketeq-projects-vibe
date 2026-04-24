import { CollectionBeforeChangeHook } from 'payload/types';

/**
 * Populate every Projects.Computed-tab field we can derive locally from
 * the authored document — no external workers, no reviews pipeline.
 *
 * Currently handles (see docs/md/CMS Service/projects/GAP-ANALYSIS.md §2):
 *
 *   • `datePublished` (§01 §Date Published, data-dictionary:18)
 *       Set on the first save while `_status='published'`. Never
 *       overwritten once populated, so toggling a project back to draft
 *       and republishing preserves the original publish date. Also
 *       covers backfill for projects published before this hook landed.
 *
 *   • `totalEstimatedHours` (§14.1)
 *       `sum(scope[].tasks[].estimatedHours)`. The Pricing-tab field is
 *       still author-editable as a fallback for projects with no scope
 *       yet; scope-derived value wins when scope is populated. Once
 *       every project has a scope we can flip the field to `readOnly`.
 *
 *   • `projectDurationTotal` (weeks) + `projectDurationLabel` (§14.2)
 *       `max(1, ceil(totalHours / (teamSize × 40)))` — assumes every
 *       distinct assignee works in parallel at 40 hrs/week. `teamSize`
 *       is the same set that feeds §14.5 TotalTeamMembers, so duration
 *       and team count stay consistent. Falls back to 1 when no team
 *       is assigned yet. Spec §14.2 references `task.end_day` which
 *       doesn't exist on the Task component (see GAP-ANALYSIS §8 #2);
 *       the capacity interpretation is the closest defensible reading.
 *       `projectDurationLabel` pivots its unit per spec §01 L98-104:
 *       `< 7 days → "N days"`, `< 4 weeks → "N weeks"`, else `"N months"`.
 *
 *   • `startingPriceTotal` (§14.7)
 *       `sum(task.estimatedHours × role.hourlyRate)`. Rates come from
 *       the HOURLY_RATE_BY_LEVEL constant below — a rate card keyed by
 *       `experienceLevel` that stands in for the not-yet-built `roles`
 *       collection. Values are in USD and reflect typical marketplace
 *       rates; update here when the real roles table lands.
 *
 *   • `priceViewAmount` (§14.7)
 *       `startingPriceTotal ÷ periods(priceViewMode, durationWeeks)`
 *       where `periods()` converts weeks into the selected payment
 *       cadence (weekly / biweekly / monthly / quarterly / yearly).
 *       Matches doc §01 §Project Details L20 "total cost divided by
 *       week, two-week, month, quarter, or year".
 *
 *   • `teamMemberCount` (§14.5, proxy)
 *       Spec says `count(unique users in assignedTeam)`, but
 *       `assignedTeam` isn't wired yet (see GAP-ANALYSIS §3.3). Proxy:
 *       `count(unique (roleName, experienceLevel) tuples in scope[])`
 *       — "this project needs N distinct specialists". Approximation
 *       until the real team-assignment subsystem lands.
 *
 * NOT handled here (lives in a different layer, not blocked):
 *   - `projectHistoryRatings` (§14.14) — average of the *owner's* past
 *     projects' reviews. Derived at read time by the listings-service
 *     `CmsProjectsController` from sibling rows sharing `createdBy`,
 *     so it updates whenever a past project is re-rated without
 *     touching the current document. See
 *     `backend/apps/listings-service/src/cms-projects/cms-projects.controller.ts`.
 */

// Hourly rate card keyed by `Task.experienceLevel`. Stand-in for the
// not-yet-built `roles` collection. Rates in USD; typical marketplace
// mid-points for each tier. Single source of truth until the roles
// collection lands — see GAP-ANALYSIS §7 Tier 3 "Roles + hourly rates".
const HOURLY_RATE_BY_LEVEL: Record<string, number> = {
  Student: 25,
  Junior: 55,
  Medior: 85,
  Senior: 125,
  Guru: 175,
};
const FALLBACK_RATE = HOURLY_RATE_BY_LEVEL.Medior;

/**
 * Convert a duration in weeks into the number of payment periods for
 * the given priceViewMode. `total / periods = amount shown per period`.
 * Uses 4.345 as the average weeks-per-month constant (365.25 / 12 / 7).
 */
function periodsForViewMode(viewMode: string, weeks: number): number {
  const months = weeks / 4.345;
  switch (viewMode) {
    case 'weekly':
      return Math.max(1, weeks);
    case 'biweekly':
      return Math.max(1, weeks / 2);
    case 'monthly':
      return Math.max(1, months);
    case 'quarterly':
      return Math.max(1, months / 3);
    case 'yearly':
      return Math.max(1, months / 12);
    default:
      return Math.max(1, weeks / 2);
  }
}
// Fields whose edit triggers re-moderation when `forceReviewOnEdit` is
// true (§14.13). If any of these change between originalDoc and data,
// `moderationStatus` flips to 'pending'.
const SENSITIVE_FIELDS = [
  'title',
  'shortDescription',
  'fullDescription',
  'deliverables',
  'tags',
  'projectSkills',
  'videoWalkthrough',
] as const;

// §14.12 FlagScore heuristic — lightweight quality check on save.
// Score ≥ 20 → `moderationStatus = 'needs_update'` (auto-flag).
function computeFlagScore(data: Record<string, unknown>): number {
  let score = 0;
  const short = typeof data.shortDescription === 'string' ? data.shortDescription : '';
  if (short.length > 300) score += 5;
  const tags = Array.isArray(data.tags) ? data.tags : [];
  if (tags.length > 10) score += 10;
  return score;
}

export const computeProjectFields: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
}) => {
  // ── previewToken ─────────────────────────────────────────────────────
  // Auto-generate a shareable preview token on first create so draft
  // projects can be previewed by stakeholders with the token in the URL.
  if (!data.previewToken) {
    const { randomUUID } = await import('crypto');
    data.previewToken = randomUUID();
  }

  // ── Moderation logic (§14.12 + §14.13) ──────────────────────────────
  // §14.13: if forceReviewOnEdit is true and any sensitive field changed,
  // flip moderationStatus back to 'pending'.
  if (
    operation === 'update' &&
    data.forceReviewOnEdit !== false &&
    originalDoc
  ) {
    const changed = SENSITIVE_FIELDS.some((key) => {
      const prev = JSON.stringify((originalDoc as Record<string, unknown>)[key] ?? null);
      const next = JSON.stringify(data[key] ?? null);
      return prev !== next;
    });
    if (changed && data.moderationStatus !== 'pending') {
      data.moderationStatus = 'pending';
    }
  }

  // §14.12 FlagScore — lightweight heuristic quality check.
  const flagScore = computeFlagScore(data as Record<string, unknown>);
  if (flagScore >= 20) {
    data.isFlagged = true;
    data.moderationStatus = 'pending';
  }

  // ── activityLog append ──────────────────────────────────────────────
  // Append one entry per save so admins can see the audit trail. Shape
  // matches spec §14.16 / §11 ActivityLogEntry.
  const log = Array.isArray(data.activityLog) ? [...data.activityLog] : [];
  const prevStatus = (originalDoc as Record<string, unknown> | undefined)?._status;
  const nextStatus = data._status;

  let actionType: string;
  if (operation === 'create') {
    actionType = 'create';
  } else if (nextStatus === 'published' && prevStatus !== 'published') {
    actionType = 'publish';
  } else if (nextStatus !== 'published' && prevStatus === 'published') {
    actionType = 'unpublish';
  } else {
    actionType = 'update';
  }

  log.push({
    actionType,
    performedBy: 'cms-admin',
    timestamp: new Date().toISOString(),
    fieldChanged: operation === 'create' ? '(all)' : '(save)',
  });
  data.activityLog = log;

  // ── datePublished ────────────────────────────────────────────────────
  // Set the first time the project appears in the `published` state with
  // no existing date. Covers three cases:
  //   1. create+published in one shot
  //   2. draft → published transition
  //   3. projects published before this hook was installed (backfill on
  //      the next save)
  // Never overwritten once populated, so toggling back to draft and
  // republishing preserves the original publish date.
  if (!data.datePublished && data._status === 'published') {
    data.datePublished = new Date().toISOString();
  }

  // ── Scope rollup ─────────────────────────────────────────────────────
  // Walk the scope tree once and collect:
  //   • totalHours     → §14.1 TotalEstimatedHours + §14.2 ProjectDurationWeeks
  //   • totalCost      → §14.7 EstimatedCost (hours × rate card)
  //   • teamRoles      → §14.5 proxy for TotalTeamMembers
  //
  // `data.scope` is a Phase[] with nested tasks; Payload array fields
  // arrive as plain JS arrays on the hook input, so we can walk them
  // without touching the DB.
  const scope: unknown = data.scope;
  if (Array.isArray(scope) && scope.length > 0) {
    let totalHours = 0;
    let totalCost = 0;
    const teamRoles = new Set<string>();

    for (const phase of scope) {
      if (!phase || typeof phase !== 'object') continue;
      const tasks = (phase as { tasks?: unknown }).tasks;
      if (!Array.isArray(tasks)) continue;
      for (const task of tasks) {
        if (!task || typeof task !== 'object') continue;
        const t = task as {
          estimatedHours?: unknown;
          experienceLevel?: unknown;
          roleName?: unknown;
          assigneeEmail?: unknown;
        };

        const hours = Number(t.estimatedHours);
        const level = typeof t.experienceLevel === 'string' ? t.experienceLevel : 'Medior';
        const rate = HOURLY_RATE_BY_LEVEL[level] ?? FALLBACK_RATE;

        if (Number.isFinite(hours) && hours > 0) {
          totalHours += hours;
          totalCost += hours * rate;
        }

        // Team-count: prefer real assigneeEmail when available,
        // fall back to (roleName, experienceLevel) proxy otherwise.
        // Emails are the canonical team identifier per spec §16 L96.
        const email =
          typeof t.assigneeEmail === 'string' ? t.assigneeEmail.trim().toLowerCase() : '';
        if (email) teamRoles.add(`email::${email}`);
        else {
          const role = typeof t.roleName === 'string' ? t.roleName.trim() : '';
          if (role) teamRoles.add(`role::${role}::${level}`);
        }
      }
    }

    if (totalHours > 0) {
      // §14.1 TotalEstimatedHours — overrides the author-declared value
      // when scope is populated. Left author-editable on the Pricing tab
      // so projects without scope can still pass validation.
      data.totalEstimatedHours = totalHours;

      // §14.2 ProjectDurationWeeks — divide by team capacity so adding
      // a second assignee roughly halves the duration. Each team member
      // contributes 40 hrs/week; `teamRoles.size` reuses the set that
      // feeds §14.5 TotalTeamMembers (email-first with role+level proxy
      // as fallback). When nothing is assigned, fall back to 1 resource
      // so the field still produces a sensible value for draft projects.
      const teamSize = Math.max(1, teamRoles.size);
      const capacityHoursPerWeek = teamSize * 40;
      const weeksFloat = totalHours / capacityHoursPerWeek;
      const weeks = Math.max(1, Math.ceil(weeksFloat));
      data.projectDurationTotal = weeks;

      // §01 L98-104 "Timestamps" pivot — choose the smallest unit that
      // still reads naturally:
      //   < 7 days  → "N days"
      //   < 4 weeks → "N weeks"
      //   else      → "N months"  (average 4.345 weeks/month)
      // `projectDurationTotal` stays in whole weeks so downstream
      // consumers (payment-period math, filters) keep a stable numeric
      // field; only the display label pivots.
      const days = Math.max(1, Math.ceil(weeksFloat * 7));
      if (days < 7) {
        data.projectDurationLabel = days === 1 ? '1 day' : `${days} days`;
      } else if (weeks < 4) {
        data.projectDurationLabel = weeks === 1 ? '1 week' : `${weeks} weeks`;
      } else {
        const months = Math.max(1, Math.ceil(weeksFloat / 4.345));
        data.projectDurationLabel = months === 1 ? '1 month' : `${months} months`;
      }

      // §14.7 EstimatedCost — rounded to whole dollars.
      if (totalCost > 0) {
        data.startingPriceTotal = Math.round(totalCost);

        // §14.7 priceViewAmount — divide by payment-period count. Uses
        // the `priceViewMode` the editor selected; defaults to biweekly.
        const viewMode =
          typeof data.priceViewMode === 'string' ? data.priceViewMode : 'biweekly';
        const periods = periodsForViewMode(viewMode, weeks);
        data.priceViewAmount = Math.round(totalCost / periods);
      }
    }

    if (teamRoles.size > 0) {
      data.teamMemberCount = teamRoles.size;
    }

    // Derive teamEmails — the unique set of email addresses assigned
    // to scope tasks. Always overwrite so clearing assignments in the
    // CMS actually shrinks the team (previous logic preserved stale
    // values when the new scope had no emails).
    const emails = [...teamRoles]
      .filter((k) => k.startsWith('email::'))
      .map((k) => k.slice(7));
    data.teamEmails = emails;
  }

  return data;
};
