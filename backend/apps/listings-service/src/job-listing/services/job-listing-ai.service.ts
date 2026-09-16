import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { COUNTRY_TO_REGION, REGION_TO_COUNTRIES } from "./job-listing-budget.service";

// The 56 countries job-listing-budget.service.ts's normalizeLocation() can
// actually resolve to a pricing-service region. Reused here (not
// re-typed) so the AI is asked for exactly what the rate lookup can consume
// — a real country, never a bare region name like "Eastern Europe", which
// normalizeLocation() has no way to map back to itself.
const VALID_COUNTRIES = Object.keys(COUNTRY_TO_REGION);
const VALID_COUNTRIES_PROMPT_LIST = VALID_COUNTRIES.join(", ");
// lowercase -> canonical casing, so a model reply like "united states" still
// gets stored/displayed as "United States" (Step 4's country picker matches
// on exact casing), not just accepted as "close enough" for the rate lookup.
const VALID_COUNTRIES_CANONICAL: Record<string, string> = Object.fromEntries(
  VALID_COUNTRIES.map((c) => [c.toLowerCase(), c]),
);

// Region tags the Smart Assistant is allowed to reason in (the 8 distinct
// values COUNTRY_TO_REGION maps onto). The UI's location field only ever
// stores a real country — REGION_TO_COUNTRIES is how a region decision gets
// turned back into one.
const VALID_REGIONS = Object.keys(REGION_TO_COUNTRIES);
const VALID_REGIONS_CANONICAL: Record<string, string> = Object.fromEntries(
  VALID_REGIONS.map((r) => [r.toLowerCase(), r]),
);

// Curated subset (~5-6) of well-known countries per region for the PROMPT
// reference only — REGION_TO_COUNTRIES itself (and its full lists, up to 15
// countries for one region) stays untouched and is still what
// resolveTaskLocation() picks a real fallback country from. The model only
// needs enough options here to classify a task's current country into a
// region and to vary its choice when relocating one — it doesn't need every
// country the code can fall back to. Any region not covered below (e.g. a
// new region added later) falls back to its full REGION_TO_COUNTRIES list,
// so this can never omit a region entirely.
const REGION_COUNTRY_PROMPT_SAMPLE: Record<string, string[]> = {
  "Western Europe": ["Germany", "France", "Netherlands", "Sweden", "Ireland", "Portugal"],
  "Eastern Europe": ["Poland", "Romania", "Ukraine", "Bulgaria", "Hungary", "Czech Republic"],
  "South Asia": ["India", "Pakistan", "Bangladesh", "Nigeria", "Kenya", "South Africa"],
  "Southeast Asia": ["Philippines", "Vietnam", "Indonesia", "Malaysia", "Thailand", "China"],
};

// Authoritative region -> country listing for the prompt. Every region still
// appears (so the model can classify any task's country), but a region with
// a curated sample above only shows that sample instead of its full
// REGION_TO_COUNTRIES list — the same reference resolveTaskLocation() falls
// back on for real, just trimmed for what the model needs to read here.
const REGION_COUNTRY_REFERENCE = VALID_REGIONS.map(
  (region) =>
    `- ${region}: ${(REGION_COUNTRY_PROMPT_SAMPLE[region] ?? REGION_TO_COUNTRIES[region]).join(", ")}`,
).join("\n");

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqCallOptions {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GROQ_MAX_TOKENS = 2048;
const DEFAULT_GROQ_TEMPERATURE = 0.3;
// Reasoning models (the "openai/gpt-oss*" and "qwen/*" families on Groq)
// spend a chunk of the completion token budget on an internal reasoning
// trace before producing the actual JSON content. reasoning_effort controls
// how much: "low" is cheaper and more reliable per call, but was measured
// to overshoot a Smart Assistant scope-edit's own numeric targets (e.g. a
// 20% budget-reduction target landing at ~60%+) because it doesn't verify
// its arithmetic before answering; "medium" measured within a few dollars
// of the same target. Always "medium" — a fixed choice, not
// environment-configurable, so behavior can't silently drift per env.
// It's rejected outright (400 "not supported with this model") on
// non-reasoning models, so it must only be sent when the configured model
// is actually a reasoning model.
const REASONING_MODEL_PATTERN = /^openai\/gpt-oss|^qwen\//i;
const GROQ_REASONING_EFFORT = "medium";

interface GeneratedTask {
  taskName: string;
  roleTitle: string;
  location: string;
  experienceLevel: string;
  workSchedule: string;
  estimatedHours: number;
}

interface GeneratedPhase {
  phaseName: string;
  tasks: GeneratedTask[];
}

export interface GeneratedProjectScope {
  phases: GeneratedPhase[];
}

interface GeneratedServicePhase {
  phaseName: string;
  phaseType: "setup" | "recurring" | "ongoing";
  recurrenceSchedule?: string | null;
  recurrenceCount?: number | null;
  tasks: GeneratedTask[];
}

export interface GeneratedServiceScope {
  phases: GeneratedServicePhase[];
}

interface RateData {
  region: string;
  experienceLevel: string;
  hourlyRateLow: number;
  hourlyRateHigh: number;
  hourlyMedian: number;
}

interface RoleRecommendation {
  location: string;
  experienceLevel: string;
  workSchedule: string;
  rationale: string;
}

interface BasicInformationOutput {
  title: string;
  jobType: string;
  industries: string[];
  languages: string[];
}

interface RoleDescriptionOutput {
  roleTitle: string;
  responsibilities: string;
  overview: string;
  benefits: string;
  skills: string[];
}

interface SmartAssistantFieldContext {
  workType?: string;
  jobType?: string;
  industries?: string[];
  description?: string;
  deliverables?: string;
  tools?: string[];
  roles?: string[];
}

export class GroqUnavailableException extends Error {
  constructor(public readonly reason = "unknown") {
    super("AI generation service is temporarily unavailable.");
  }
}

// ── Smart Assistant cost-optimization prompt ─────────────────────────────
// These multiplier tables mirror hourlyRateForTask in
// ../../shared/utils/pricing.ts — kept as separate prose here (rather than
// importing and stringifying that function) because this is a natural
// language prompt for the model to reason with, not a value the code itself
// evaluates. If the source multipliers change, update both.
const LOCATION_MULTIPLIERS = `
LOCATION COST MULTIPLIERS

Use these multipliers when evaluating location cost:

- United States / Canada / UK / Australia: 1.00
- Western Europe (Germany, Netherlands, France, Sweden, Norway, Denmark, etc.): 0.85
- Eastern Europe (Poland, Romania, Ukraine, Bulgaria, etc.): 0.40
- Southeast Asia / East Asia / Middle East: 0.30
- Latin America (Brazil, Mexico, Argentina, Colombia, etc.): 0.35
- South Asia (India, Pakistan, Bangladesh, Sri Lanka): 0.25
- Africa: 0.25
- Any location that does not clearly match one of the above regions: 0.40

A lower multiplier means lower estimated labor cost.

The multiplier represents COST ONLY.
It does not mean that the location is more or less capable, productive, or suitable.
`;

const EXPERIENCE_MULTIPLIERS = `
EXPERIENCE COST MULTIPLIERS

Use these multipliers when evaluating experience-level cost:

- junior: 0.75
- mid / medior: 1.00
- senior: 1.25

Treat "mid" and "medior" as equivalent.

A lower multiplier means lower estimated labor cost.

The multiplier represents COST ONLY.
It does not mean that a lower experience level is appropriate for every task.
`;

const COST_OPTIMIZATION_RULES = `
COST OPTIMIZATION MODE

The user's goal is to reduce the total cost of the scope while preserving a
realistic and deliverable project.

${LOCATION_MULTIPLIERS}

${EXPERIENCE_MULTIPLIERS}

COST COMPARISON

For each task, estimate relative labor cost as:

relativeCost =
  hours
  × locationMultiplier
  × experienceMultiplier

If the task contains a base hourly rate or other base cost, use:

estimatedCost =
  baseRate
  × hours
  × locationMultiplier
  × experienceMultiplier

Use this formula to compare alternatives.

Do not invent a base rate if none is provided.
Relative cost is sufficient for comparing options.

IMPORTANT:
The mathematically cheapest option is NOT automatically the correct option.

Optimize the whole project, not individual rows independently.

For every task consider:

1. KEEP unchanged
2. Change LOCATION
3. Change EXPERIENCE LEVEL
4. Reduce HOURS
5. Apply a combination of the above
6. Remove or consolidate the task when genuinely unnecessary

KEEP is a valid optimization decision.

LOCATION DECISION RULES

A lower-cost location should only be selected when the task is appropriate
for that delivery model.

Changing location is more reasonable when:

- the task is well defined
- work can be done asynchronously
- acceptance criteria are clear
- stakeholder interaction is limited
- the task is relatively independent
- handoff requirements are low
- timezone overlap is not important
- the cost difference is meaningful

Prefer keeping the current location when:

- frequent stakeholder/customer interaction is required
- timezone alignment is important
- tasks are tightly coupled
- there are frequent cross-task dependencies
- rapid collaboration is important
- continuity/domain knowledge is important
- the financial savings are small compared with coordination overhead

Evaluate related tasks together.

Do not move one task to a cheaper location when doing so creates an awkward
handoff between several tightly coupled tasks.

Example:

Moving an independent implementation task from a 1.00 location multiplier
to a 0.25 location multiplier may provide substantial savings.

Moving a highly collaborative task from 1.00 to 0.85 may not justify the
additional coordination complexity.

EXPERIENCE DECISION RULES

Do not automatically change senior -> mid -> junior because the multiplier
is lower.

Prefer senior or experienced resources for:

- architecture
- ambiguous requirements
- product or technical strategy
- stakeholder management
- security-sensitive work
- complex integrations
- difficult technical decisions
- high-impact design decisions
- tasks where mistakes could cause substantial downstream rework

Mid-level resources are appropriate for:

- standard implementation
- moderately complex development
- tasks with reasonably clear requirements
- work requiring some independent judgment

Junior resources are more appropriate for:

- well-defined execution
- repetitive work
- straightforward implementation
- documentation
- routine testing
- data preparation
- tasks with clear acceptance criteria
- work that can be efficiently reviewed by a more experienced person

Compare savings against the potential cost of errors and rework.

For example:

senior = 1.25
mid = 1.00

Changing senior -> mid saves 20% of the experience-adjusted portion of the
cost.

Do it only when the task does not genuinely require senior expertise.

HOURS DECISION RULES

Do not reduce hours simply because fewer hours reduces cost.

Hours may be reduced when there is a defensible reason such as:

- narrowing the task to MVP scope
- removing unnecessary documentation
- reducing unnecessary polish
- removing duplicated work
- reducing low-value edge cases
- using templates
- reusing existing components
- using automation
- merging overlapping activities
- simplifying the deliverable

Never reduce hours below what is realistically required to achieve the
task's purpose.

COMBINED CHANGES

Multiple optimizations may be applied to the same task, but be more
conservative when stacking changes.

For example, a task currently US + Senior + 16 hours has relative cost
1.00 × 1.25 × 16 = 20.00. Moving it to South Asia + Mid + 12 hours gives
0.25 × 1.00 × 12 = 3.00 — substantially cheaper mathematically, but that
does NOT mean the second configuration is appropriate.

Before applying multiple changes, determine whether:

- the task can reasonably move locations
- the task can reasonably use lower experience
- the task can realistically be completed in fewer hours

Critical tasks should generally not receive several risk-increasing changes
at once.

PROJECT-LEVEL OPTIMIZATION

Before modifying the scope:

1. Understand the overall project objective.
2. Understand what each phase is intended to accomplish.
3. Identify high-impact and critical tasks.
4. Identify dependencies and tightly coupled tasks.
5. Identify tasks requiring significant stakeholder interaction.
6. Identify tasks that genuinely require senior experience.
7. Identify independent work suitable for lower-cost locations.
8. Identify well-defined work suitable for lower experience.
9. Identify effort that can realistically be reduced.
10. Consider downstream rework and coordination costs.
11. Prefer meaningful savings with low or moderate execution risk.

Do NOT attempt to force every task toward:

lowest-location-multiplier
+ junior
+ minimum-hours.

The goal is the lowest-cost REALISTIC delivery plan, not the lowest possible
mathematical score.

If two alternatives have similar cost:

- prefer fewer changes
- prefer lower delivery risk
- prefer preserving team continuity
- prefer fewer cross-location handoffs

LOCATION CLASSIFICATION AND OUTPUT

A task's "location" field is always one specific real country — never a
region name — both when you read the current scope and when you write the
updated one. The UI only offers a country picker; there is no way to select
a region directly.

To reason about cost, first translate a task's country into its region using
the reference below, then apply that region's multiplier from LOCATION COST
MULTIPLIERS above.

REGION -> COUNTRY REFERENCE

${REGION_COUNTRY_REFERENCE}

When you decide a task should move to a different region for cost reasons,
pick one specific real country from that region's list above to write into
"location". Vary your choice across the countries listed for a region
instead of always defaulting to the same one or two countries — different
tasks moving to the same region should not all land on an identical country
unless there is a specific reason to group them together (e.g. they hand off
work to each other).

Never write a region name itself (e.g. "South Asia") into a task's
"location" field.

If a task's current location cannot confidently be classified into any
region, treat it as the default multiplier tier (0.40) and leave the task's
location unchanged.
`;

// ── Smart Assistant timeline-shortening prompt ───────────────────────────
// Unlike cost, timeline has exactly one lever — a task's estimatedHours —
// because the schedule is a fully sequential sum with no parallelism
// modeled at all (see assignTaskDays/calculateTotalWorkingDays in
// job-listing-budget.service.ts). No multiplier tables are needed here.
const TIMELINE_OPTIMIZATION_RULES = `
TIMELINE OPTIMIZATION MODE

The user's goal is to shorten the overall project timeline while preserving
a realistic and deliverable project.

HOW THE TIMELINE IS CALCULATED

Every task's duration in working days is:

durationDays = ceil(estimatedHours / hoursPerDay)

where hoursPerDay is 8 for full_time, 4 for part_time, or derived from
customHours/customFrequency for a custom schedule.

Tasks run fully sequentially — every task, in every phase, in order, with
no parallelism. The project's total timeline is simply the sum of every
task's durationDays. Reducing any one task's estimatedHours therefore
reduces the OVERALL project timeline by the same number of working days
that task's own duration drops by.

Location and experienceLevel do not affect timeline at all. Do not change
either field in response to a timeline command — the only lever is hours.

TASK SELECTION

Prefer changing the hours of exactly ONE task — the single most suitable
candidate that can absorb the needed reduction. Only touch a second or
third task if that one task's hours cannot reasonably be reduced enough
without making its own scope unrealistic (e.g. cutting it to near-zero
hours).

A task is a reasonable candidate to compress when:

- it is well defined, with clear acceptance criteria
- it has a large enough duration to meaningfully move the total (a 2-day
  task cannot realistically absorb a 10-day cut)
- it can reasonably be scoped down: MVP scoping, removing unnecessary
  documentation or polish, removing duplicated work, using templates,
  reusing existing components, using automation, merging overlapping
  activities, simplifying the deliverable

Prefer to leave unchanged, or compress only slightly, tasks that genuinely
need the time:

- architecture
- ambiguous requirements
- complex integrations
- high-impact design decisions
- tasks where mistakes would cause substantial downstream rework

Never reduce a task's hours below what is realistically required to
achieve its purpose. Do not force an unrealistic cut onto a single task
just to avoid touching a second one — if no single task can reasonably
absorb the full reduction, spread it across the smallest number of
reasonable tasks that can.

LAST RESORT: REMOVE OR CONSOLIDATE

If reducing hours on a small number of reasonable tasks cannot reach the
target without becoming unrealistic, removing or consolidating a genuinely
unnecessary task is an acceptable last resort — same principle as when
optimizing cost. Prefer reducing hours first; only remove or consolidate
when that alone is not enough.
`;

// ── Smart Assistant scope-quality prompt ─────────────────────────────────
// Unlike cost/timeline, there is no numeric target here — the goal is
// identifying genuinely vague/bundled tasks and decomposing them into
// specific sibling tasks in the SAME flat phase.tasks array (the data model
// has no parent/child task relation — see job-listing-task.entity.ts — so
// "decomposition" always means adding more entries to the same flat list,
// never nesting). normalizeProjectScope/normalizeServiceScope silently
// .slice(0, 16) any phase over the cap, so the prompt must make the model
// budget-aware rather than splitting indiscriminately.
const SCOPE_QUALITY_RULES = `
SCOPE QUALITY MODE

The user's goal is to make the scope more specific and actionable by
decomposing vague or overly broad tasks into multiple specific sibling
tasks — NOT to add unrelated new work, NOT to inflate the budget or
timeline, and NOT to touch tasks that are already well-scoped.

There is no parent/child or subtask relationship in this data model. A
task's "children" ARE simply additional entries in the same phase's tasks
array, at the same level as the task they replace. "Decompose task X into
three sibling tasks" means: remove X, add three new tasks to that same
phase.

IDENTIFYING GENERIC TASKS

A task is a genuinely good candidate for decomposition when it shows one or
more of these signals:

- taskName bundles multiple distinct deliverables under one broad label
  (e.g. "Build checkout" covering UI + payment integration + error
  handling; "Set up backend" covering API + database + auth).
- taskName uses a broad verb + broad noun with no specific deliverable
  named (e.g. "Build the app", "Handle user management", "Do testing").
- estimatedHours is unusually large for a single task relative to the
  other tasks in the same phase (e.g. one 80-hour task sitting alongside
  several 8-16 hour tasks is a strong signal it is actually several tasks
  wearing one label).
- The task, read on its own, gives an implementer no clear sense of what
  "done" looks like without them making several unstated design decisions.

A task is NOT a candidate — leave it completely unchanged — when it is
already specific and reasonably scoped:

- taskName already names one concrete deliverable or activity (e.g.
  "Implement Stripe payment webhook handler", "Write unit tests for the
  cart service", "Design the checkout page wireframe").
- estimatedHours is modest and in line with the other tasks around it.

Do not decompose a task just because you can technically split it further.
If a task is already clear and singular in purpose, preserve it exactly as
is — this is consistent with the GENERAL RULES principle: preserve fields
unless changing them is reasonably necessary.

HOW TO DECOMPOSE A CANDIDATE TASK

For each task you decide to decompose:

1. Identify the distinct, concrete pieces of work actually bundled inside
   it. Each piece should be something a single person could pick up and
   understand without further clarification.
2. Create one new sibling task per distinct piece, each with:
   - taskName: a specific, actionable label naming the concrete deliverable
     (e.g. split "Build checkout" into "Build checkout UI",
     "Integrate payment gateway", "Implement checkout error handling").
   - roleTitle: default to the SAME roleTitle as the original task, unless
     a sub-piece clearly requires a different skill set (e.g. splitting a
     bundled "Build feature" task into a frontend piece and a backend piece
     genuinely may need different roleTitles). Do not invent role changes
     that aren't clearly justified by the nature of the sub-piece.
   - location, experienceLevel, workSchedule: inherit from the original
     task unless the command or context gives a specific reason to change
     one for a particular sibling.
   - estimatedHours: see HOUR DISTRIBUTION below.
3. Remove the original bundled task from the phase entirely — it is
   replaced BY its siblings, not kept alongside them. Keeping both the
   original and the new siblings double-counts the work and inflates
   estimatedHours across the phase; this is not acceptable.
4. Place the new sibling tasks in the same phase, in a sensible order
   (e.g. design/setup work before implementation, implementation before
   testing).

HOUR DISTRIBUTION

This is a detail/clarity pass, not a scope-inflation pass.

The sum of estimatedHours across a decomposed task's new siblings should
stay close to the original task's estimatedHours. Distribute the original
hours across the siblings in proportion to the realistic effort of each
piece — do not split hours evenly by default if the pieces are not
actually equal in effort.

A modest total increase (roughly 10-20% over the original task's hours) is
acceptable ONLY when decomposition makes genuinely missing work explicit
that was implicitly bundled in before and had no visible hours anywhere
(e.g. the original "Build checkout" task never had any separate testing or
documentation task in the phase, and splitting it out now makes that work
visible for the first time). This is the exception, not the default —
most decompositions should redistribute the existing hours, not add to
them.

Never use decomposition as a way to multiply the total project budget or
timeline. If you find yourself adding substantial extra hours across many
tasks, you are scope-inflating, not clarifying — stop and reconsider.

PHASE AND TASK CAPS — SILENT TRUNCATION WARNING

The 16-tasks-per-phase and 10-phases caps from GENERAL RULES above are HARD
caps enforced by the system AFTER your response — any tasks beyond the
16th in a phase, or any phase beyond the 10th, are SILENTLY DROPPED with no
error shown to you or the user. There is no warning when this happens; the
extra work simply disappears from the scope.

Because of this:

- Before decomposing, count how many tasks are already in a phase and how
  much headroom remains under 16.
- Do NOT decompose every generic-looking task in a phase indiscriminately.
  Prioritize the tasks that most need decomposition (the broadest, most
  bundled, or largest-hours tasks) and leave clearly-adequate ones alone.
- If a phase is already near 16 tasks, prefer decomposing fewer tasks into
  fewer, well-chosen siblings (2-3) rather than many siblings, or skip
  decomposition in that phase entirely if it would exceed the cap.
- Never let your changes push any phase over 16 tasks or the scope over 10
  phases, even if it means leaving some generic tasks undecomposed.

If uncertain whether decomposing a task will fit within the cap, prefer
leaving that task unchanged over risking silent data loss.

APPLIES TO BOTH PROJECT AND SERVICE SCOPES

This decomposition applies identically whether the scope is a project or a
service — service tasks can be just as generic as project tasks, and the
same identification and decomposition rules apply. For service scopes,
continue to follow SERVICE RULES elsewhere in this prompt: do not change
phaseType on existing phases, and do not introduce or imply a fixed
completion date. Decomposing a task's tasks list within an existing phase
does not conflict with either of those constraints.

WORKED EXAMPLE

Original task in an "Implementation" phase:

  taskName: "Build checkout"
  roleTitle: "Full-Stack Developer"
  estimatedHours: 40

This is a good candidate: broad verb+noun, no specific deliverable named,
and 40 hours is noticeably larger than the phase's other tasks (e.g. most
are 8-16 hours).

Decomposed into three siblings, same phase, hours redistributed to sum
close to the original 40 (here 42, a small increase to make testing
explicit):

  1. taskName: "Build checkout UI"
     roleTitle: "Full-Stack Developer"
     estimatedHours: 14
  2. taskName: "Integrate payment gateway"
     roleTitle: "Full-Stack Developer"
     estimatedHours: 16
  3. taskName: "Write checkout error handling and tests"
     roleTitle: "Full-Stack Developer"
     estimatedHours: 12

The original "Build checkout" task is removed; only the three siblings
remain in the phase.
`;

@Injectable()
export class JobListingAiService {
  private readonly logger = new Logger(JobListingAiService.name);
  private readonly defaultApiUrl =
    "https://api.groq.com/openai/v1/chat/completions";

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private configNumber(key: string, fallback: number): number {
    const value = this.config.get<string | number>(key);
    if (value === undefined || value === null || value === "") return fallback;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseGroqJson<T>(raw: string): T {
    const trimmed = raw.trim();
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");
    const json =
      objectStart >= 0 && objectEnd >= objectStart
        ? withoutFence.slice(objectStart, objectEnd + 1)
        : withoutFence;

    return JSON.parse(json) as T;
  }

  private getFailureReason(error: unknown): string {
    const candidate = error as {
      response?: { status?: number };
      code?: string;
      message?: string;
      name?: string;
    };

    if (candidate.response?.status) return `http_${candidate.response.status}`;
    if (candidate.code) return candidate.code;
    if (candidate.message === "GROQ_API_KEY is not configured")
      return "missing_api_key";
    if (candidate instanceof SyntaxError) return "invalid_json_response";
    return candidate.name ?? "unknown";
  }

  private stripMarkdown(value: string): string {
    return value
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}[-*+]\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private limitWords(value: string, maxWords: number): string {
    const words = this.stripMarkdown(value).split(/\s+/).filter(Boolean);
    return words.slice(0, maxWords).join(" ");
  }

  private limitCharacters(value: string, maxCharacters: number): string {
    const normalized = this.stripMarkdown(value);
    if (normalized.length <= maxCharacters) return normalized;

    const truncated = normalized.slice(0, maxCharacters).trim();
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    return lastSpaceIndex > 0
      ? truncated.slice(0, lastSpaceIndex).trim()
      : truncated;
  }

  private normalizeSmartAssistantFieldValue(
    field: string,
    aiValue: unknown,
    fallbackValue: string,
    context?: SmartAssistantFieldContext,
  ): string {
    const candidate = typeof aiValue === "string" ? aiValue : "";
    const safeValue = candidate.trim() ? candidate : fallbackValue;

    if (field === "title") {
      const normalizedTitle = this.limitCharacters(safeValue, 100);
      if (
        this.isGenericSmartAssistantTitle(normalizedTitle) ||
        this.normalizeComparableTitle(normalizedTitle) ===
          this.normalizeComparableTitle(fallbackValue)
      ) {
        return this.buildSmartAssistantTitleFallback(context, fallbackValue);
      }

      return normalizedTitle;
    }

    if (["overview", "benefits", "responsibilities"].includes(field)) {
      return this.limitCharacters(safeValue, 100);
    }

    return this.stripMarkdown(safeValue);
  }

  private normalizeComparableTitle(value: string): string {
    return this.stripMarkdown(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  private isGenericSmartAssistantTitle(value: string): boolean {
    const normalized = this.normalizeComparableTitle(value);
    return [
      "change project title",
      "change a project title",
      "project title",
      "new project title",
      "untitled job",
      "untitled project",
    ].includes(normalized);
  }

  private titleCase(value: string): string {
    return value
      .replace(/[_-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const lower = word.toLowerCase();
        if (["api", "ui", "ux", "cms", "crm", "saas", "seo"].includes(lower)) {
          return lower.toUpperCase();
        }

        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  private buildSmartAssistantTitleFallback(
    context?: SmartAssistantFieldContext,
    fallbackValue = "Project",
  ): string {
    const jobType = this.titleCase(
      context?.jobType?.trim() ||
        (context?.workType === "service" ? "Service" : "Website"),
    );
    const industry = this.titleCase(
      context?.industries?.find((item) => item?.trim())?.trim() ?? "",
    );
    const role = this.titleCase(
      context?.roles?.find((item) => item?.trim())?.trim() ?? "",
    );
    const tool = this.titleCase(
      context?.tools?.find((item) => item?.trim())?.trim() ?? "",
    );
    const description =
      `${context?.description ?? ""} ${context?.deliverables ?? ""}`.toLowerCase();
    const action = /redesign|revamp|refresh|moderni[sz]e/.test(description)
      ? "Redesign"
      : /audit|review|analysis/.test(description)
        ? "Audit"
        : /marketing|campaign|seo|ads?/.test(description)
          ? "Campaign"
          : context?.workType === "service"
            ? "Support"
            : "Development";

    const candidates = [
      [industry, jobType, action].filter(Boolean).join(" "),
      [tool, jobType, action].filter(Boolean).join(" "),
      [role, jobType, action].filter(Boolean).join(" "),
      [jobType, action].filter(Boolean).join(" "),
      this.isGenericSmartAssistantTitle(fallbackValue) ? "" : fallbackValue,
    ].filter((title) => title && !this.isGenericSmartAssistantTitle(title));

    return this.limitCharacters(
      candidates[0] || "Website Development Project",
      100,
    );
  }

  private normalizeRoleDescriptionOutput(
    role: RoleDescriptionOutput,
  ): RoleDescriptionOutput {
    return {
      roleTitle: role.roleTitle,
      overview: this.limitCharacters(role.overview ?? "", 100),
      benefits: this.limitCharacters(role.benefits ?? "", 100),
      responsibilities: this.limitCharacters(role.responsibilities ?? "", 100),
      skills: Array.isArray(role.skills) ? role.skills.slice(0, 10) : [],
    };
  }

  // Coerce to one of the 56 countries job-listing-budget.service.ts's
  // normalizeLocation() can actually resolve. The prompt asks for a real
  // country (or, in cost-optimization mode, permits a region name that this
  // method then resolves to one), but models don't always comply exactly:
  //   - a valid country, just wrong casing → canonicalize it
  //   - a region name (e.g. "South Asia") instead of a country → the Smart
  //     Assistant reasons about regions when optimizing cost, so this is the
  //     expected shape when it decides to relocate a task; pick a real
  //     country from that region rather than discarding the decision
  //   - anything else unrecognized → fall back to "United States" rather
  //     than let a stray value quietly go un-priced or show up unmatched in
  //     Step 4's country picker
  private resolveTaskLocation(rawLocation: unknown): string {
    const value = typeof rawLocation === "string" ? rawLocation.trim() : "";
    if (!value) return "United States";

    const canonicalCountry = VALID_COUNTRIES_CANONICAL[value.toLowerCase()];
    if (canonicalCountry) return canonicalCountry;

    const canonicalRegion = VALID_REGIONS_CANONICAL[value.toLowerCase()];
    if (canonicalRegion) {
      const countries = REGION_TO_COUNTRIES[canonicalRegion];
      return countries[Math.floor(Math.random() * countries.length)];
    }

    return "United States";
  }

  private normalizeTask(
    task: Partial<GeneratedTask>,
    index: number,
  ): GeneratedTask {
    const estimatedHours = Number(task.estimatedHours);
    const experienceLevel = ["junior", "mid", "senior"].includes(
      String(task.experienceLevel),
    )
      ? String(task.experienceLevel)
      : "mid";
    const workSchedule =
      task.workSchedule === "part_time" ? "part_time" : "full_time";

    return {
      taskName:
        typeof task.taskName === "string" && task.taskName.trim()
          ? task.taskName.trim()
          : `Task ${index + 1}`,
      roleTitle:
        typeof task.roleTitle === "string" && task.roleTitle.trim()
          ? task.roleTitle.trim()
          : "Specialist",
      location: this.resolveTaskLocation(task.location),
      experienceLevel,
      workSchedule,
      estimatedHours:
        Number.isFinite(estimatedHours) && estimatedHours > 0
          ? estimatedHours
          : 10,
    };
  }

  private normalizeProjectScope(
    scope: Partial<GeneratedProjectScope>,
    maxPhases = 10,
    maxTasks = 16,
  ): GeneratedProjectScope {
    const phases = Array.isArray(scope.phases) ? scope.phases : [];

    return {
      phases: phases.slice(0, maxPhases).map((phase, phaseIndex) => ({
        phaseName:
          typeof phase.phaseName === "string" && phase.phaseName.trim()
            ? phase.phaseName.trim()
            : `Phase ${phaseIndex + 1}`,
        tasks: (Array.isArray(phase.tasks) ? phase.tasks : [])
          .slice(0, maxTasks)
          .map((task, taskIndex) => this.normalizeTask(task, taskIndex)),
      })),
    };
  }

  private normalizeServiceScope(
    scope: Partial<GeneratedServiceScope>,
    maxPhases = 10,
    maxTasks = 16,
  ): GeneratedServiceScope {
    const phases = Array.isArray(scope.phases) ? scope.phases : [];
    const normalized = phases.slice(0, maxPhases).map((phase, phaseIndex) => {
      const phaseType = ["setup", "recurring", "ongoing"].includes(
        String(phase.phaseType),
      )
        ? phase.phaseType
        : phaseIndex === 0
          ? "setup"
          : "recurring";

      const recurrenceSchedule =
        phaseType === "recurring"
          ? ["weekly", "monthly", "quarterly"].includes(
              String(phase.recurrenceSchedule),
            )
            ? String(phase.recurrenceSchedule)
            : "monthly"
          : null;
      const recurrenceCount =
        phaseType === "recurring"
          ? Math.max(
              1,
              Number.isFinite(Number(phase.recurrenceCount))
                ? Number(phase.recurrenceCount)
                : 3,
            )
          : null;

      return {
        phaseName:
          typeof phase.phaseName === "string" && phase.phaseName.trim()
            ? phase.phaseName.trim()
            : phaseType === "setup"
              ? "Setup"
              : phaseType === "ongoing"
                ? "Ongoing Support"
                : `Recurring ${phaseIndex + 1}`,
        phaseType,
        recurrenceSchedule,
        recurrenceCount,
        tasks: (Array.isArray(phase.tasks) ? phase.tasks : [])
          .slice(0, maxTasks)
          .map((task, taskIndex) => this.normalizeTask(task, taskIndex)),
      };
    });

    if (!normalized.some((phase) => phase.phaseType === "setup")) {
      normalized.unshift({
        phaseName: "Setup",
        phaseType: "setup",
        recurrenceSchedule: null,
        recurrenceCount: null,
        tasks: [],
      });
    }

    if (!normalized.some((phase) => phase.phaseType === "recurring")) {
      normalized.splice(Math.min(1, normalized.length), 0, {
        phaseName: "Recurring Work",
        phaseType: "recurring",
        recurrenceSchedule: "monthly",
        recurrenceCount: 3,
        tasks: [],
      });
    }

    if (!normalized.some((phase) => phase.phaseType === "ongoing")) {
      normalized.push({
        phaseName: "Ongoing Support",
        phaseType: "ongoing",
        recurrenceSchedule: null,
        recurrenceCount: null,
        tasks: [],
      });
    }

    return { phases: normalized.slice(0, maxPhases) };
  }

  private preserveExistingServicePhaseTypes(
    updatedScope: GeneratedProjectScope | GeneratedServiceScope,
    currentScope: GeneratedProjectScope | GeneratedServiceScope,
  ): GeneratedServiceScope {
    const updatedPhases = Array.isArray(
      (updatedScope as GeneratedServiceScope).phases,
    )
      ? (updatedScope as GeneratedServiceScope).phases
      : [];
    const currentPhases = Array.isArray(
      (currentScope as GeneratedServiceScope).phases,
    )
      ? (currentScope as GeneratedServiceScope).phases
      : [];

    return {
      phases: updatedPhases.map((phase, index) => {
        const matchingCurrentPhase =
          currentPhases.find(
            (currentPhase) => currentPhase.phaseName === phase.phaseName,
          ) ?? currentPhases[index];

        return {
          ...phase,
          phaseType: matchingCurrentPhase?.phaseType ?? phase.phaseType,
        };
      }),
    };
  }

  private async call<T>(
    options: GroqCallOptions,
    generationType: string,
  ): Promise<T> {
    const startMs = Date.now();
    try {
      const apiKey = this.config.get<string>("GROQ_API_KEY");
      if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured");
      }

      const apiUrl =
        this.config.get<string>("GROQ_API_URL") ?? this.defaultApiUrl;
      const model = this.config.get<string>("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL;
      const maxTokens =
        options.maxTokens ??
        this.configNumber("GROQ_MAX_TOKENS", DEFAULT_GROQ_MAX_TOKENS);
      const temperature =
        options.temperature ??
        this.configNumber("GROQ_TEMPERATURE", DEFAULT_GROQ_TEMPERATURE);

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: options.messages,
        response_format: { type: "json_object" },
      };
      if (REASONING_MODEL_PATTERN.test(model)) {
        requestBody.reasoning_effort = GROQ_REASONING_EFFORT;
      }

      const response = await firstValueFrom(
        this.http.post(apiUrl, requestBody, {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 30_000,
        }),
      );

      const raw = response.data.choices[0].message.content;
      const latencyMs = Date.now() - startMs;
      this.logger.log(
        `jl_ai_generation_latency_ms type=${generationType} latency=${latencyMs}`,
      );
      return this.parseGroqJson<T>(raw);
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      const reason = this.getFailureReason(error);
      // getFailureReason only classifies the HTTP status (e.g. "http_400"),
      // which doesn't say WHY Groq rejected the request. Groq's own error
      // body (the actual validation message) is attached below whenever the
      // failure came back from the API itself, so a 400 is diagnosable from
      // this log line alone instead of needing to reproduce it separately.
      const groqErrorBody = (error as { response?: { data?: unknown } })
        ?.response?.data;
      const groqErrorDetail = groqErrorBody
        ? ` groq_error=${JSON.stringify(groqErrorBody).slice(0, 500)}`
        : "";
      this.logger.error(
        `jl_ai_generation_failed type=${generationType} latency=${latencyMs} reason=${reason} error=${(error as Error).message}${groqErrorDetail}`,
      );
      throw new GroqUnavailableException(reason);
    }
  }

  // All generation methods follow below.

  async generateJobTitle(input: {
    workType: string;
    description: string;
    roles: string[];
  }): Promise<string> {
    const result = await this.call<{ title: string }>(
      {
        maxTokens: 2048,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              'You generate concise, professional job listing titles for a freelance marketplace. Respond only with a JSON object: { "title": "string" }. Maximum 100 characters. Do not include quotation marks in the title. Do not start with words like We, Our, or I.',
          },
          {
            role: "user",
            content: [
              `Work type: ${input.workType}`,
              `Description: ${input.description}`,
              `Roles involved: ${input.roles.join(", ")}`,
              "Generate a project or service title that a freelancer would find when searching for work.",
            ].join("\n"),
          },
        ],
      },
      "job_title",
    );
    return this.limitCharacters(result.title ?? "", 100);
  }

  async generateTools(input: {
    workType: string;
    description: string;
    deliverables: string;
    roles: string[];
  }): Promise<string[]> {
    const result = await this.call<{ tools: string[] }>(
      {
        maxTokens: 2048,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              'You identify tools, technologies, frameworks, and platforms required for a software or digital project. Respond only with a JSON object: { "tools": ["string"] }. Return 5 to 15 tools. Use the exact common name for each tool (e.g. "React", "Node.js", "PostgreSQL", "Figma"). Do not include soft skills or methodologies.',
          },
          {
            role: "user",
            content: [
              `Work type: ${input.workType}`,
              `Description: ${input.description}`,
              `Deliverables: ${input.deliverables ?? "Not specified"}`,
              `Roles: ${input.roles.join(", ")}`,
            ].join("\n"),
          },
        ],
      },
      "tools",
    );
    return result.tools.slice(0, 20);
  }

  async generateProjectScope(input: {
    description: string;
    deliverables: string;
    successCriteria: string;
    tools: string[];
    roles: string[];
    budgetUsdCents: number;
    durationMonths: number;
    hiringType: string;
  }): Promise<GeneratedProjectScope> {
    const budgetUsd = (input.budgetUsdCents / 100).toFixed(2);

    const result = await this.call<GeneratedProjectScope>(
      {
        maxTokens: 6144,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a senior project manager generating a structured project scope " +
              "for a software development project. Respond only with a JSON object matching: " +
              '{ "phases": [{ "phaseName": "string", "tasks": [{ "taskName": "string", ' +
              '"roleTitle": "string", "location": "string", "experienceLevel": "string", ' +
              '"workSchedule": "full_time|part_time", "estimatedHours": number }] }] }. ' +
              "Maximum 10 phases. Maximum 16 tasks per phase. " +
              "experienceLevel must be one of: junior, mid, senior. " +
              `location must be one of these countries: ${VALID_COUNTRIES_PROMPT_LIST}. ` +
              "estimatedHours must be a positive number. Do not include markdown or prose.",
          },
          {
            role: "user",
            content: [
              `Project description: ${input.description}`,
              `Deliverables: ${input.deliverables}`,
              `Success criteria: ${input.successCriteria ?? "Not specified"}`,
              `Tools and technologies: ${input.tools.join(", ")}`,
              `Roles needed: ${input.roles.join(", ")}`,
              `Budget: $${budgetUsd} USD`,
              `Timeline: ${input.durationMonths} months`,
              "Generate a complete phase and task breakdown. Each task must have an estimated " +
                "number of hours to complete. Assign the most appropriate role, location, and " +
                "experience level to each task based on the budget.",
            ].join("\n"),
          },
        ],
      },
      "scope_project",
    );

    return this.normalizeProjectScope(result);
  }

  async generateServiceScope(input: {
    description: string;
    deliverables: string;
    tools: string[];
    roles: string[];
    budgetUsdCents: number;
  }): Promise<GeneratedServiceScope> {
    const budgetUsd = (input.budgetUsdCents / 100).toFixed(2);

    const result = await this.call<GeneratedServiceScope>(
      {
        maxTokens: 6144,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You generate a service scope structure for an ongoing freelance engagement. " +
              'Respond only with a JSON object: { "phases": [{ "phaseName": "string", ' +
              '"phaseType": "setup|recurring|ongoing", "recurrenceSchedule": "weekly|monthly|quarterly|null", ' +
              '"recurrenceCount": number|null, "tasks": [...] }] }. ' +
              "Rules: Exactly one setup phase (first). One or more recurring phases (middle). " +
              "Exactly one ongoing phase (last). Maximum 10 phases total. Maximum 16 tasks per phase. " +
              "setup and ongoing phases have recurrenceSchedule: null and recurrenceCount: null. " +
              "recurring phases must have recurrenceSchedule and recurrenceCount >= 1. " +
              "Do not include a duration field — services have no fixed end date.",
          },
          {
            role: "user",
            content: [
              `Service description: ${input.description}`,
              `Deliverables: ${input.deliverables}`,
              `Tools: ${input.tools.join(", ")}`,
              `Roles: ${input.roles.join(", ")}`,
              `Monthly budget: $${budgetUsd} USD`,
              "Generate the service scope with setup, recurring work cycles, and ongoing maintenance.",
            ].join("\n"),
          },
        ],
      },
      "scope_service",
    );

    return this.normalizeServiceScope(result);
  }

  async generateScopeFromMinimalInput(input: {
    workType: "project" | "service";
    description: string;
    budgetUsdCents: number;
    roles: string[];
  }): Promise<GeneratedProjectScope | GeneratedServiceScope> {
    const budgetUsd = (input.budgetUsdCents / 100).toFixed(2);
    const isService = input.workType === "service";

    const systemPrompt = isService
      ? "You generate a complete service scope from a brief description. The client is unsure " +
        "what they need beyond the basic description. Make reasonable assumptions. " +
        'Respond only with a JSON object: { "phases": [...] } following the service scope structure ' +
        "(one setup, one or more recurring, one ongoing). Maximum 8 phases. Maximum 12 tasks per phase. " +
        "Include role, location, experienceLevel, workSchedule, estimatedHours on every task."
      : "You generate a complete project scope from a brief description. The client is unsure " +
        "what they need beyond the basic description. Make reasonable assumptions. " +
        'Respond only with a JSON object: { "phases": [...] } following the project scope structure. ' +
        "Maximum 8 phases. Maximum 12 tasks per phase. " +
        "Include role, location, experienceLevel, workSchedule, estimatedHours on every task.";

    const result = await this.call<
      GeneratedProjectScope | GeneratedServiceScope
    >(
      {
        maxTokens: 6144,
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              `What they need: ${input.description}`,
              `Budget: $${budgetUsd} USD`,
              `Roles they mentioned: ${input.roles.length > 0 ? input.roles.join(", ") : "Not specified"}`,
              "Generate a realistic scope they can refine. Prefer fewer phases with clear names " +
                "over many vague phases.",
            ].join("\n"),
          },
        ],
      },
      "scope_minimal",
    );

    return isService
      ? this.normalizeServiceScope(
          result as Partial<GeneratedServiceScope>,
          8,
          12,
        )
      : this.normalizeProjectScope(
          result as Partial<GeneratedProjectScope>,
          8,
          12,
        );
  }

  async generateRoleDescriptions(input: {
    projectTitle: string;
    workType: string;
    description: string;
    roles: Array<{
      roleTitle: string;
      experienceLevel: string;
      location: string;
      workSchedule: string;
      tasks: string[];
    }>;
  }): Promise<RoleDescriptionOutput[]> {
    const result = await this.call<{ roles: RoleDescriptionOutput[] }>(
      {
        maxTokens: 6144,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write professional job listing descriptions for freelance roles. " +
              'Respond only with a JSON object: { "roles": [{ "roleTitle": "string", ' +
              '"responsibilities": "string (max 100 characters)", ' +
              '"overview": "string (max 100 characters)", ' +
              '"benefits": "string (max 100 characters)", ' +
              '"skills": ["string"] (5-10 skills) }] }. ' +
              "overview and benefits describe the project/service as a whole, not the specific role. " +
              "responsibilities are specific to the role. " +
              "Write in second person (You will...). Do not use markdown.",
          },
          {
            role: "user",
            content: [
              `Project/service title: ${input.projectTitle}`,
              `Work type: ${input.workType}`,
              `Description: ${input.description}`,
              "Roles:",
              ...input.roles.map(
                (r, i) =>
                  `${i + 1}. ${r.roleTitle} | ${r.experienceLevel} | ${r.location} | ${r.workSchedule}\n` +
                  `   Tasks: ${r.tasks.join(", ")}`,
              ),
            ].join("\n"),
          },
        ],
      },
      "role_descriptions",
    );
    return (Array.isArray(result.roles) ? result.roles : []).map((role) =>
      this.normalizeRoleDescriptionOutput(role),
    );
  }

  async generateBasicInformation(input: {
    workType: string;
    description: string;
    deliverables: string;
    tools: string[];
    roles: string[];
  }): Promise<BasicInformationOutput> {
    const result = await this.call<BasicInformationOutput>(
      {
        maxTokens: 2048,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You classify a freelance project or service listing. " +
              'Respond only with a JSON object: { "title": "string (max 100 chars)", ' +
              '"jobType": "string", "industries": ["string"] (max 10), ' +
              '"languages": ["string"] (max 10) }. ' +
              "jobType examples: Website, Mobile App, API Integration, E-commerce, SaaS Platform, " +
              "Brand Identity, Data Pipeline, CMS, Marketplace. Use the most specific applicable type. " +
              "industries: use well-known industry names (Fintech, Healthcare, Education, etc). " +
              "languages: programming languages and frameworks only (TypeScript, React, Python, etc). " +
              "Do not include human spoken languages in the languages field.",
          },
          {
            role: "user",
            content: [
              `Work type: ${input.workType}`,
              `Description: ${input.description}`,
              `Deliverables: ${input.deliverables ?? "Not specified"}`,
              `Tools: ${input.tools.join(", ")}`,
              `Roles: ${input.roles.join(", ")}`,
            ].join("\n"),
          },
        ],
      },
      "basic_information",
    );
    return {
      title: this.limitCharacters(result.title ?? "", 100),
      jobType: result.jobType,
      industries: result.industries.slice(0, 10),
      languages: result.languages.slice(0, 10),
    };
  }

  async recommendRoleConfiguration(input: {
    roleTitle: string;
    budgetUsdCents: number;
    durationMonths: number;
    estimatedHours?: number;
    rateData: RateData[];
  }): Promise<RoleRecommendation> {
    // Step 1 — Calculate effective hourly budget
    // durationMonths * 4.33 weeks/month * hours per schedule
    const fullTimeHours = input.durationMonths * 4.33 * 40;
    const partTimeHours = input.durationMonths * 4.33 * 20;
    const budgetUsd = input.budgetUsdCents / 100;
    const effectiveHourlyFull = budgetUsd / fullTimeHours;
    const effectiveHourlyPart = budgetUsd / partTimeHours;

    // Step 2 — Score each region/experience combination
    // Composite score = quality weight (0.75) + budget fit weight (0.25)
    // Quality rank: senior=3, mid=2, junior=1
    // Budget fit: 1 if effective hourly >= median, 0.5 if >= low, 0 otherwise
    const qualityRank: Record<string, number> = {
      senior: 3,
      mid: 2,
      junior: 1,
    };

    const scored = input.rateData.map((rate) => {
      const quality = qualityRank[rate.experienceLevel] ?? 1;
      const fitFull =
        effectiveHourlyFull >= rate.hourlyMedian
          ? 1
          : effectiveHourlyFull >= rate.hourlyRateLow
            ? 0.5
            : 0;
      const fitPart =
        effectiveHourlyPart >= rate.hourlyMedian
          ? 1
          : effectiveHourlyPart >= rate.hourlyRateLow
            ? 0.5
            : 0;
      const bestFit = Math.max(fitFull, fitPart);
      const schedule = fitPart > fitFull ? "part_time" : "full_time";
      const score = (quality / 3) * 0.75 + bestFit * 0.25;
      return { rate, score, schedule, fitFull, fitPart };
    });

    // Step 3 — EEOC Four-Fifths Rule bias check
    // Ensure no single region accounts for > 80% of top-scored recommendations
    const topScored = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    const regionCounts: Record<string, number> = {};
    topScored.forEach((s) => {
      regionCounts[s.rate.region] = (regionCounts[s.rate.region] ?? 0) + 1;
    });
    const maxRegionShare =
      Math.max(...Object.values(regionCounts)) / topScored.length;
    if (maxRegionShare > 0.8) {
      // Redistribute — promote the next highest-scoring diverse region
      this.logger.warn(
        `Bias check: single region dominates top-5 results for ${input.roleTitle}`,
      );
    }

    const best = topScored[0];
    return {
      location: best.rate.region,
      experienceLevel: best.rate.experienceLevel,
      workSchedule: best.schedule,
      rationale:
        `${best.rate.experienceLevel} ${input.roleTitle} from ${best.rate.region} ` +
        `at $${best.rate.hourlyMedian}/hr fits within the ${best.schedule.replace("_", "-")} budget.`,
    };
  }

  // Builds the system prompt for handleSmartAssistantScopeEdit. Cost-related
  // commands ("reduce the budget", "make it cheaper", ...) get the full
  // COST_OPTIMIZATION_RULES appended — the multiplier tables and decision
  // rules that keep the model from just racing every task to junior/cheapest
  // region/minimum hours. Timeline-shortening commands get
  // TIMELINE_OPTIMIZATION_RULES, and scope-quality commands ("Improve scope
  // quality", "add more detail", ...) get SCOPE_QUALITY_RULES — each
  // independently of the others, so a command could in principle match more
  // than one and get multiple blocks appended. Non-matching commands (e.g.
  // "add a QA phase") skip all three to keep the prompt short and on-topic.
  // Shared with handleSmartAssistantScopeEdit, which uses the same checks to
  // decide maxTokens — a cost-optimization command needs more careful,
  // multi-task arithmetic to hit its reduction target than a simple
  // structural edit does, and a scope-quality command's decomposition grows
  // the expected JSON output. Single source of truth so the two never
  // disagree on what counts as which kind of command.
  private isCostOptimizationCommand(command: string): boolean {
    return /\b(reduce|lower|cut|optimi[sz]e|decrease|save)\b.*\b(cost|costs|budget|spend|spending)\b|\bcheaper\b/i.test(
      command,
    );
  }

  // Shared with handleSmartAssistantScopeEdit's SERVICE-only rejection
  // check (services have no fixed end date) and with the controller's
  // fallback-computation gate — single source of truth for what counts as
  // a timeline-shortening command.
  private isTimelineShorteningCommand(command: string): boolean {
    return /shorten.*timeline|reduce.*duration|faster|speed up/i.test(
      command,
    );
  }

  // Detects "Improve scope quality" and free-text variants asking for more
  // detail/granularity in the scope (e.g. "add more detail", "break down the
  // tasks", "expand the tasks into subtasks"). Deliberately does NOT match
  // plain structural edits like "add a QA phase" (no detail/granularity/
  // specificity/split keyword present), nor the cost/timeline commands.
  // Independent of isCostOptimizationCommand and isTimelineShorteningCommand
  // — a command could theoretically match more than one; buildSmartAssistant-
  // Prompt appends whichever blocks match, same pattern cost+timeline already
  // use today. Shared with handleSmartAssistantScopeEdit's maxTokens gate —
  // decomposition grows both the prompt and the expected JSON output.
  private isScopeQualityCommand(command: string): boolean {
    return /\b(improve|increase|add|more)\b.*\b(scope|detail|granularity|specificity)\b|\b(break\s*down|breakdown|expand)\b.*\b(tasks?|scope)\b|\bmore\s+(detailed|granular|specific)\b|\bsplit\b.*\btasks?\b/i.test(
      command,
    );
  }

  private buildSmartAssistantPrompt(input: {
    command: string;
    workType: "project" | "service";
    currentTotalBudgetUsdCents?: number;
    currentTotalTimelineDays?: number;
  }): string {
    const isCostOptimization = this.isCostOptimizationCommand(input.command);
    const isTimelineShortening = this.isTimelineShorteningCommand(
      input.command,
    );
    const isScopeQuality = this.isScopeQualityCommand(input.command);

    // Whether the command already names a target — a percentage, a dollar
    // amount, or a fraction like "in half" — as opposed to just "reduce the
    // budget" with no target at all. Only the latter gets the default target
    // below; an explicit target in the command always wins.
    const hasExplicitReductionTarget =
      /\d+(\.\d+)?\s*(%|percent)|\$\s*\d|\bby\s+\$?\d|\bto\s+\$?\d|\bin half\b|\bhalve[ds]?\b|\bdouble\b|\btriple\b|\bquarter\b/i.test(
        input.command,
      );

    // Same idea, for a timeline target (days/weeks/months instead of a
    // dollar amount) — "shorten the timeline by 2 weeks" vs. just "shorten
    // the project timeline" with no target named.
    const hasExplicitTimelineTarget =
      /\d+(\.\d+)?\s*(%|percent)|\d+(\.\d+)?\s*(day|days|week|weeks|month|months)|\bby\s+\d|\bto\s+\d|\bin half\b|\bhalve[ds]?\b|\bdouble\b|\btriple\b|\bquarter\b/i.test(
        input.command,
      );

    let prompt = `
You are a Smart Assistant that edits project scopes based on natural-language commands.

Act as an experienced Product Manager and Delivery Planner.

Respond ONLY with a valid JSON object:

{
  "updatedScope": {...},
  "summary": "string",
  "suggestions": ["string"]
}

GENERAL RULES:

- Preserve fields unless changing them is reasonably necessary to satisfy the command.
- Do not make unrelated changes.
- Preserve existing IDs.
- Never exceed 10 phases or 16 tasks per phase.
- Keep the resulting scope realistic and internally consistent.
- Consider relationships between tasks and phases.
- Do not treat each task as an isolated row.
- Do not invent unsupported enum values.
- summary must be one sentence describing the important changes.
- suggestions must contain 2-3 useful follow-up actions.
`;

    if (input.workType === "service") {
      prompt += `
SERVICE RULES:

- Service scopes have no fixed completion date.
- Do not shorten an overall service timeline.
- Do not change phaseType on existing service phases.
`;
    }

    if (isCostOptimization) {
      prompt += `\n${COST_OPTIMIZATION_RULES}`;

      if (!hasExplicitReductionTarget) {
        const currentBudgetUsd =
          typeof input.currentTotalBudgetUsdCents === "number" &&
          input.currentTotalBudgetUsdCents > 0
            ? input.currentTotalBudgetUsdCents / 100
            : undefined;

        prompt +=
          currentBudgetUsd !== undefined
            ? `
DEFAULT REDUCTION TARGET

The command did not specify how much to reduce cost by (no percentage,
dollar amount, or fraction such as "in half").

Current total budget: $${currentBudgetUsd.toFixed(2)}
Target total budget: approximately $${(currentBudgetUsd * 0.8).toFixed(2)} (a 20% reduction) — a real dollar figure, not the relative cost unit used elsewhere in this prompt.

The scope below does not include real per-task hourly rates, so you cannot
compute each task's exact dollar cost. Instead:

1. Compute the scope's current total relative cost as the sum, across every
   task, of hours × locationMultiplier × experienceMultiplier.
2. Treat that relative-cost total as corresponding to the real current
   budget above ($${currentBudgetUsd.toFixed(2)}) — i.e. reducing the relative-cost
   total by roughly 20% should correspond to roughly a 20% reduction in the
   real total.
3. Use the real dollar figures above as a sanity check on the SCALE of
   change needed (e.g. a large budget with many tasks likely needs changes
   spread across several tasks; a small one may need only one), not as a
   number to hit exactly.

Stop making changes once you estimate you are close to the target — do not
keep minimizing cost further, and do not land significantly below the
target.

This 20% default applies ONLY because no target was specified. If the
command gives an explicit target (a percentage, a dollar amount, "in half",
etc.), follow that target instead and ignore this default.
`
            : `
DEFAULT REDUCTION TARGET

The command did not specify how much to reduce cost by (no percentage,
dollar amount, or fraction such as "in half").

Compute the scope's current total relative cost as the sum, across every
task, of:

  hours × locationMultiplier × experienceMultiplier

Target a new total relative cost of approximately 80% of that value — a
reduction of roughly 20%. Do not go meaningfully below that target. Stop
once you are close to it rather than continuing to minimize cost further.

This 20% default applies ONLY because no target was specified. If the
command gives an explicit target (a percentage, a dollar amount, "in half",
etc.), follow that target instead and ignore this default.
`;
      }
    }

    // Only reachable for project scopes — handleSmartAssistantScopeEdit
    // rejects timeline-shortening commands for services before the prompt
    // is ever built.
    if (isTimelineShortening) {
      prompt += `\n${TIMELINE_OPTIMIZATION_RULES}`;

      if (!hasExplicitTimelineTarget) {
        const currentDays =
          typeof input.currentTotalTimelineDays === "number" &&
          input.currentTotalTimelineDays > 0
            ? input.currentTotalTimelineDays
            : undefined;

        prompt +=
          currentDays !== undefined
            ? `
DEFAULT TIMELINE REDUCTION TARGET

The command did not specify how much to shorten the timeline by (no
percentage, day/week/month amount, or fraction such as "in half").

Current total timeline: ${currentDays} working days
Target total timeline: approximately ${Math.round(currentDays * 0.8)} working days (a 20% reduction)

Since every task's duration is ceil(estimatedHours / hoursPerDay) and the
schedule is fully sequential, this is direct: the reduction in estimatedHours
you make (converted to working days) should sum to roughly ${currentDays - Math.round(currentDays * 0.8)} working days
across the task(s) you change.

Stop once you estimate you are close to the target — do not keep cutting
hours further, and do not land significantly below the target.

This 20% default applies ONLY because no target was specified. If the
command gives an explicit target (a percentage, a day/week/month amount,
"in half", etc.), follow that target instead and ignore this default.
`
            : `
DEFAULT TIMELINE REDUCTION TARGET

The command did not specify how much to shorten the timeline by (no
percentage, day/week/month amount, or fraction such as "in half").

Compute the scope's current total timeline as the sum, across every task,
of ceil(estimatedHours / hoursPerDay).

Target a new total of approximately 80% of that value — a reduction of
roughly 20%. Do not go meaningfully below that target. Stop once you are
close to it rather than continuing to cut hours further.

This 20% default applies ONLY because no target was specified. If the
command gives an explicit target (a percentage, a day/week/month amount,
"in half", etc.), follow that target instead and ignore this default.
`;
      }
    }

    if (isScopeQuality) {
      prompt += `\n${SCOPE_QUALITY_RULES}`;
    }

    return prompt;
  }

  async handleSmartAssistantScopeEdit(input: {
    command: string;
    currentScope: GeneratedProjectScope | GeneratedServiceScope;
    workType: "project" | "service";
    // Real current total budget in USD cents. Normally passed straight
    // through from the client, which already computed it to render the
    // current budget on screen; the controller only falls back to
    // computing it itself (a pricing-service round trip per task) when the
    // client didn't send one. Lets the default 20%-reduction target (below)
    // anchor to a real dollar figure instead of a purely abstract one.
    currentTotalBudgetUsdCents?: number;
    // Real current total project timeline in working days. Same pass-
    // through pattern as currentTotalBudgetUsdCents, but the controller's
    // fallback here is a cheap synchronous sum (calculateTotalWorkingDays),
    // not a pricing-service round trip.
    currentTotalTimelineDays?: number;
  }): Promise<{
    updatedScope: GeneratedProjectScope | GeneratedServiceScope;
    summary: string;
    suggestions: string[];
  }> {
    const isService = input.workType === "service";

    // Services cannot shorten the timeline — there is no fixed end date.
    // Reject timeline-shortening commands for service scopes.
    if (isService && this.isTimelineShorteningCommand(input.command)) {
      return {
        updatedScope: input.currentScope,
        summary:
          "Timeline changes are not applicable to service scopes. Services run on a recurring schedule with no fixed end date. To adjust the workload, try reducing tasks or changing the recurrence frequency.",
        suggestions: [
          "Reduce the budget",
          "Improve scope quality",
          "Remove a recurring cycle",
        ],
      };
    }

    const systemPrompt = this.buildSmartAssistantPrompt({
      command: input.command,
      workType: input.workType,
      currentTotalBudgetUsdCents: input.currentTotalBudgetUsdCents,
      currentTotalTimelineDays: input.currentTotalTimelineDays,
    });

    // GROQ_REASONING_EFFORT's reasoning trace can consume most of a smaller
    // maxTokens budget before the model ever writes the JSON body —
    // measured close to the old 4096 ceiling even on a small scope. 6144
    // leaves headroom regardless of how heavy a given command's reasoning
    // turns out to be, cost-optimization or not; otherwise Groq's reasoning
    // trace can crowd the JSON body out entirely (json_validate_failed —
    // see GroqUnavailableException call sites). Scope-quality decomposition
    // grows both the system prompt (SCOPE_QUALITY_RULES, ~150 lines) and
    // the expected JSON output (more tasks = more JSON) versus cost/timeline
    // edits, which only ever change existing fields rather than adding new
    // ones — bump to 9216 for this mode only.
    const isScopeQuality = this.isScopeQualityCommand(input.command);
    const maxTokens = isScopeQuality ? 9216 : 6144;

    const result = await this.call<{
      updatedScope: GeneratedProjectScope | GeneratedServiceScope;
      summary: string;
      suggestions: string[];
    }>(
      {
        maxTokens,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `
Current scope:
${JSON.stringify(input.currentScope)}

Command:
${input.command}
`,
          },
        ],
      },
      "smart_assistant",
    );

    return {
      ...result,
      updatedScope: isService
        ? this.normalizeServiceScope(
            this.preserveExistingServicePhaseTypes(
              result.updatedScope,
              input.currentScope,
            ),
          )
        : this.normalizeProjectScope(
            result.updatedScope as Partial<GeneratedProjectScope>,
          ),
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.slice(0, 3)
        : [],
    };
  }

  async handleSmartAssistantFieldEdit(input: {
    field: string;
    currentValue: string;
    command: string;
    context?: SmartAssistantFieldContext;
  }): Promise<{
    updatedValue: string;
    suggestions: string[];
  }> {
    const limitInstruction = "updatedValue must not exceed 100 characters. ";
    const titleInstruction =
      input.field === "title"
        ? "For title edits, create a specific, client-ready listing title from the context. Do not repeat the command or current title. "
        : "";
    const contextLines = input.context
      ? [
          `Work type: ${input.context.workType ?? "Not specified"}`,
          `Job type: ${input.context.jobType ?? "Not specified"}`,
          `Industries: ${(input.context.industries ?? []).join(", ") || "Not specified"}`,
          `Tools: ${(input.context.tools ?? []).join(", ") || "Not specified"}`,
          `Roles: ${(input.context.roles ?? []).join(", ") || "Not specified"}`,
          `Description: ${input.context.description ?? "Not specified"}`,
          `Deliverables: ${input.context.deliverables ?? "Not specified"}`,
        ].join("\n")
      : "No additional listing context provided.";

    const result = await this.call<{
      updatedValue: string;
      suggestions: string[];
    }>(
      {
        maxTokens: 2048,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              `You are a Smart Assistant editing a ${input.field} field for a freelance job listing. ` +
              `Respond only with JSON: { "updatedValue": "string", "suggestions": ["string"] }. ` +
              limitInstruction +
              titleInstruction +
              'suggestions contains 2-3 short follow-up action options (e.g. "Make it shorter"). ' +
              "Preserve the original meaning unless the command explicitly asks to change the meaning, audience, scope, tone, or emphasis. " +
              "Do not use markdown in updatedValue.",
          },
          {
            role: "user",
            content: [
              `Current ${input.field}:`,
              input.currentValue,
              "",
              "Listing context:",
              contextLines,
              "",
              `Command: ${input.command}`,
            ].join("\n"),
          },
        ],
      },
      "smart_assistant",
    );

    return {
      updatedValue: this.normalizeSmartAssistantFieldValue(
        input.field,
        result.updatedValue,
        input.currentValue,
        input.context,
      ),
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.slice(0, 3)
        : [],
    };
  }

  async shortenSelectedText(input: {
    selectedText: string;
    fieldContext: string;
  }): Promise<{ shortenedText: string }> {
    return this.call<{ shortenedText: string }>(
      {
        maxTokens: 2048,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              'You shorten selected text from a job listing field. Respond only with JSON: { "shortenedText": "string" }. Preserve the meaning. Remove redundant words. Do not use markdown.',
          },
          {
            role: "user",
            content: `Field context:\n${input.fieldContext}\n\nSelected text to shorten:\n${input.selectedText}`,
          },
        ],
      },
      "shorten_text",
    );
  }
}
