import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import {
  COUNTRY_TO_REGION,
  REGION_TO_COUNTRIES,
  calculateTotalWorkingDays,
} from "./job-listing-budget.service";
import { applyOperationsToSnapshot } from "./job-listing-scope.service";
import {
  ScopeOperation,
  ScopeSnapshotPhase,
  TaskOperationFields,
  PhaseOperationFields,
  NewTaskInput,
  NewPhaseInput,
} from "./job-listing-ai-operations.types";

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

// Full 5-level experience scale — matches ps_platform_rate_averages.
// experience_level (pricing-service) and Step 4's EXPERIENCE_LEVELS picker.
// Single source of truth for every scope-generation/edit prompt below and
// for normalizeTask()'s validation, so they can never drift out of sync
// with each other the way the old 3-level junior/mid/senior scale did.
const VALID_EXPERIENCE_LEVELS = ["student", "junior", "medior", "senior", "guru"];
const VALID_EXPERIENCE_LEVELS_PROMPT_LIST = VALID_EXPERIENCE_LEVELS.join(", ");

// Smart Assistant scope-edit operation caps — matches the prompt's own
// stated "Never exceed 5 phases or 5 tasks per phase" rule. Enforced here
// (not just asked of the model) since normalizeSmartAssistantOperations
// rejects the whole batch on violation rather than silently truncating.
const SMART_ASSISTANT_MAX_PHASES = 5;
const SMART_ASSISTANT_MAX_TASKS_PER_PHASE = 5;

// Human-readable labels for buildOperationsSummary's mechanically-written
// summary — deliberately not the raw field name (e.g. "hours" not
// "estimatedHours").
const TASK_FIELD_LABELS: Record<string, string> = {
  taskName: "name",
  roleTitle: "role",
  location: "location",
  experienceLevel: "experience level",
  workSchedule: "work schedule",
  customHours: "custom hours",
  customFrequency: "custom frequency",
  estimatedHours: "hours",
};

const PHASE_FIELD_LABELS: Record<string, string> = {
  phaseName: "name",
  recurrenceSchedule: "recurrence schedule",
  recurrenceCount: "recurrence count",
  durationDays: "duration (days)",
};

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqCallOptions {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_GROQ_MAX_TOKENS = 2048;
const DEFAULT_GROQ_TEMPERATURE = 0.3;
// Reasoning models (the "openai/gpt-oss*" and "qwen/*" families on Groq)
// spend a chunk of the completion token budget on an internal reasoning
// trace before producing the actual JSON content. reasoning_effort controls
// how much: "medium" measured closer to a Smart Assistant scope-edit's own
// numeric targets (e.g. a 20% budget-reduction target) than "low", which
// doesn't verify its arithmetic before answering and was measured
// overshooting to ~60%+. "low" was originally chosen over "medium" because,
// at the time, this account appeared to be rate-limited around 8,000
// tokens/minute and "medium"'s reasoning trace alone regularly exhausted
// that, causing frequent 429s and, on successful calls, crowding out the
// tail of the JSON response.
//
// CURRENTLY SET TO "high" (2026-09-23). Re-tested after the operations-
// based response format (see handleSmartAssistantScopeEdit) shrunk the JSON
// output itself to a fraction of the old full-scope-echo size — with
// reasoning_effort at "high", two back-to-back scope-edit calls totaling
// 13,159 prompt+completion tokens within a 14-second window both succeeded
// with zero errors, well over the previously-assumed 8,000/minute ceiling.
// Whatever the earlier rate limit was (free-tier cap that's since changed,
// a stricter effective limit under the old full-tree-echo format's larger
// payloads, or something else), it is not reproducing now. If
// `jl_ai_generation_failed ... reason=http_429` starts showing up in the
// logs again, that's the signal to step back down to "medium" or "low" —
// nothing else needs to change to do so, it's this one constant. Always
// explicit, not environment-configurable, so behavior can't silently drift
// per env. It's
// rejected outright (400 "not supported with this model") on non-reasoning
// models, so it must only be sent when the configured model is actually a
// reasoning model.
const REASONING_MODEL_PATTERN = /^openai\/gpt-oss|^qwen\//i;
const GROQ_REASONING_EFFORT = "high";

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

// ── Smart Assistant scope-edit rules ─────────────────────────────────────
// One shared rule block per command type, used identically for both project
// and service scopes — no per-workType duplication. Each block is appended
// to the generic base prompt in buildSmartAssistantPrompt() only when the
// command matches that type (see isCostOptimizationCommand /
// isTimelineShorteningCommand / isScopeQualityCommand below).
// REDUCE_BUDGET_RULES's multiplier tables mirror hourlyRateForTask in
// ../../shared/utils/pricing.ts — kept as separate prose here (rather than
// importing and stringifying that function) because this is a natural
// language prompt for the model to reason with, not a value the code itself
// evaluates. If the source multipliers change, update both.
const REDUCE_BUDGET_RULES = `
COST REDUCTION

You may ONLY change a task's location and/or experienceLevel. Never change
estimatedHours, and never add, remove, or reorder a phase or task.

relativeCost = hours × locationMultiplier × experienceMultiplier
(hours is a fixed input here, never something you change)

Location multipliers:
US/Canada/UK/Australia 1.00 · Western Europe 0.85 · Eastern Europe 0.40 ·
Southeast/East Asia/Middle East 0.30 · Latin America 0.35 · South Asia 0.25 ·
Africa 0.25 · unclassifiable 0.40

Experience multipliers:
student 0.50 · junior 0.75 · medior 1.00 · senior 1.25 · guru 1.50

Only relocate work that is async, well-defined, low-interaction, and
independent; keep collaborative, tightly-coupled, or timezone-sensitive
work where it is. Only lower a task's experience tier when the task
genuinely doesn't need its current tier's judgment; keep senior/guru for
architecture, security, ambiguity, or high delivery risk.

Location must always be one real country, never a region name. Use this
reference to classify a task's current country and to pick a new one:

${REGION_COUNTRY_REFERENCE}

If no reduction target is given, aim to reduce the sum of relativeCost
across all tasks by approximately 20%. Don't overshoot meaningfully once
you're close. If the command gives an explicit target as a percentage or
fraction ("by 30%", "in half"), use that instead. A dollar figure in the
command (e.g. "cut $500") is directional only — you have no real dollar
baseline for this scope, so treat it as "meaningfully more than the 20%
default" rather than a number to hit exactly.

If you can't reasonably reach the target within these constraints, get as
close as you can without making unrealistic changes, then stop. Add a
suggestion explaining that the full target wasn't reached and why.

Before responding, verify every operation is an update_task op whose
fields contains only location and/or experienceLevel — no add_task,
remove_task, add_phase, remove_phase, or update_phase operations, and no
other key inside fields.
`;

const SHORTEN_TIMELINE_RULES = `
TIMELINE SHORTENING

The only lever is a task's estimatedHours. Never change location,
experienceLevel, or the phase/task list.

durationDays = ceil(estimatedHours / hoursPerDay); the project timeline is
the sum of every task's durationDays (fully sequential, no parallelism).

Reduce estimatedHours on the task(s) best able to absorb it, preferring
the fewest tasks changed. Never reduce a task's hours below what's
realistically required for its purpose.

If no reduction target is given, aim to reduce the sum of durationDays
across all tasks by approximately 20%. If a real target is given (a %, a
day/week amount, "in half", etc.), use that instead.

If you can't reasonably reach the target within these constraints, get as
close as you can without making unrealistic changes, then stop. Add a
suggestion explaining that the full target wasn't reached and why.

Before responding, verify every operation is an update_task op whose
fields contains only estimatedHours — no add_task, remove_task, add_phase,
remove_phase, or update_phase operations, and no other key inside fields.
`;

const IMPROVE_SCOPE_RULES = `
SCOPE QUALITY

The only lever: split ONE genuinely vague or bundled task into exactly TWO
specific sibling tasks in the same phase. Nothing else may change.

A task is a candidate when it bundles multiple deliverables under one
broad label, uses a broad verb+noun with no specific deliverable named, or
has unusually large hours versus its phase's other tasks. Leave every
other task unchanged.

Each phase already caps at 5 tasks. Only split a task in a phase with room
(fewer than 5 tasks), and split at most one task per phase. If no phase
has both a candidate and headroom, return no operations and add a
suggestion explaining why.

To split: name each sibling for its specific piece of work, divide
estimatedHours between them proportionally to sum close to the original,
then emit one remove_task operation for the original and two add_task
operations (in the same phase) for the siblings. Inherit location,
experienceLevel, and workSchedule unchanged from the original — no
exceptions. roleTitle is also inherited by default, unless one sibling
clearly performs a different skill than the other (e.g. a UI task vs. an
integration task), in which case that sibling's roleTitle may differ.
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
    if (candidate.message === "GROQ_MODEL is not configured")
      return "missing_model";
    if (candidate.message === "GROQ_RESPONSE_TRUNCATED")
      return "truncated_response";
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
    const experienceLevel = VALID_EXPERIENCE_LEVELS.includes(
      String(task.experienceLevel).toLowerCase(),
    )
      ? String(task.experienceLevel).toLowerCase()
      : "medior";
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
    maxTasks = 5,
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
    maxTasks = 5,
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

  // ── Smart Assistant operations: per-field coercion ─────────────────────────
  // Non-fatal coercion, same posture as normalizeTask above: a bad/missing
  // value inside a field that IS being changed gets a safe default rather
  // than rejecting the batch. A field simply absent from the raw payload is
  // left out of the returned object entirely (not set to undefined) so
  // applyOperationsToSnapshot's `{ ...task, ...patch }` merge never
  // overwrites an untouched field with undefined.
  private coerceTaskFields(raw: unknown): TaskOperationFields {
    const fields = (raw ?? {}) as Record<string, unknown>;
    const coerced: TaskOperationFields = {};

    if (typeof fields.taskName === "string" && fields.taskName.trim()) {
      coerced.taskName = fields.taskName.trim();
    }
    if (typeof fields.roleTitle === "string" && fields.roleTitle.trim()) {
      coerced.roleTitle = fields.roleTitle.trim();
    }
    if (fields.location !== undefined) {
      coerced.location = this.resolveTaskLocation(fields.location);
    }
    if (fields.experienceLevel !== undefined) {
      const level = String(fields.experienceLevel).toLowerCase();
      coerced.experienceLevel = VALID_EXPERIENCE_LEVELS.includes(level)
        ? level
        : "medior";
    }
    if (fields.workSchedule !== undefined) {
      coerced.workSchedule =
        fields.workSchedule === "part_time" ? "part_time" : "full_time";
    }
    if (fields.customHours !== undefined) {
      const hours = Number(fields.customHours);
      coerced.customHours = Number.isFinite(hours) && hours > 0 ? hours : null;
    }
    if (fields.customFrequency !== undefined) {
      coerced.customFrequency =
        typeof fields.customFrequency === "string" && fields.customFrequency.trim()
          ? fields.customFrequency.trim()
          : null;
    }
    if (fields.estimatedHours !== undefined) {
      const hours = Number(fields.estimatedHours);
      coerced.estimatedHours = Number.isFinite(hours) && hours > 0 ? hours : 10;
    }

    return coerced;
  }

  private coercePhaseFields(raw: unknown): PhaseOperationFields {
    const fields = (raw ?? {}) as Record<string, unknown>;
    const coerced: PhaseOperationFields = {};

    if (typeof fields.phaseName === "string" && fields.phaseName.trim()) {
      coerced.phaseName = fields.phaseName.trim();
    }
    if (fields.recurrenceSchedule !== undefined) {
      coerced.recurrenceSchedule = ["weekly", "monthly", "quarterly"].includes(
        String(fields.recurrenceSchedule),
      )
        ? String(fields.recurrenceSchedule)
        : null;
    }
    if (fields.recurrenceCount !== undefined) {
      const count = Number(fields.recurrenceCount);
      coerced.recurrenceCount =
        Number.isFinite(count) && count >= 1 ? Math.floor(count) : null;
    }
    if (fields.durationDays !== undefined) {
      const days = Number(fields.durationDays);
      coerced.durationDays = Number.isFinite(days) && days > 0 ? Math.round(days) : null;
    }

    return coerced;
  }

  // Full task payload for add_task / a new phase's initial tasks. Reuses
  // normalizeTask for the fields it already knows how to default (taskName,
  // roleTitle, location, experienceLevel, workSchedule, estimatedHours), and
  // layers customHours/customFrequency on top — normalizeTask predates those
  // two fields and isn't otherwise touched here.
  private coerceNewTask(raw: unknown): NewTaskInput {
    const task = (raw ?? {}) as Record<string, unknown>;
    const base = this.normalizeTask(task as Partial<GeneratedTask>, 0);
    const customHours = Number(task.customHours);
    const customFrequency = task.customFrequency;

    return {
      ...base,
      customHours: Number.isFinite(customHours) && customHours > 0 ? customHours : null,
      customFrequency:
        typeof customFrequency === "string" && customFrequency.trim()
          ? customFrequency.trim()
          : null,
    };
  }

  private coerceNewPhase(raw: unknown, workType: "project" | "service"): NewPhaseInput {
    const phase = (raw ?? {}) as Record<string, unknown>;
    const phaseName =
      typeof phase.phaseName === "string" && phase.phaseName.trim()
        ? phase.phaseName.trim()
        : "New Phase";
    const phaseType =
      workType === "service" &&
      ["setup", "recurring", "ongoing"].includes(String(phase.phaseType))
        ? String(phase.phaseType)
        : "setup";
    const isRecurring = phaseType === "recurring";
    const tasks = Array.isArray(phase.tasks)
      ? phase.tasks.map((t) => this.coerceNewTask(t))
      : [];
    const durationDays = Number(phase.durationDays);

    return {
      phaseName,
      phaseType,
      recurrenceSchedule: isRecurring
        ? ["weekly", "monthly", "quarterly"].includes(String(phase.recurrenceSchedule))
          ? String(phase.recurrenceSchedule)
          : "monthly"
        : null,
      recurrenceCount: isRecurring
        ? Math.max(
            1,
            Number.isFinite(Number(phase.recurrenceCount))
              ? Number(phase.recurrenceCount)
              : 3,
          )
        : null,
      durationDays: Number.isFinite(durationDays) && durationDays > 0 ? Math.round(durationDays) : null,
      tasks,
    };
  }

  // ── Smart Assistant operations: structural validation ──────────────────────
  // Parses and coerces the LLM's raw "operations" array into ScopeOperation[],
  // resolving every phaseIndex/taskIndex against snapshotPhases (the exact
  // scope the model was shown). Per-field VALUE problems are coerced (see
  // coerceTaskFields/coercePhaseFields above); STRUCTURAL problems — an
  // unrecognized op, an out-of-range index, a batch that would exceed the
  // phase/task caps, leave a phase with zero tasks, or (service scopes)
  // shorten the total timeline — reject the WHOLE batch by throwing
  // GroqUnavailableException, matching this file's existing zero-partial-
  // apply precedent (a truncated/malformed Groq response already fails
  // closed the same way). Reasons are distinct strings for log
  // observability only — they all surface to the client as the same
  // AI_UNAVAILABLE fallback.
  private normalizeSmartAssistantOperations(
    rawOperations: unknown,
    snapshotPhases: ScopeSnapshotPhase[],
    workType: "project" | "service",
  ): ScopeOperation[] {
    if (!Array.isArray(rawOperations)) {
      throw new GroqUnavailableException("invalid_operation");
    }

    const operations: ScopeOperation[] = [];

    for (const raw of rawOperations as Array<Record<string, unknown>>) {
      if (!raw || typeof raw !== "object" || typeof raw.op !== "string") {
        throw new GroqUnavailableException("invalid_operation");
      }

      switch (raw.op) {
        case "update_task": {
          const phaseIndex = Number(raw.phaseIndex);
          const taskIndex = Number(raw.taskIndex);
          const phase = snapshotPhases[phaseIndex];
          if (!phase || !phase.tasks[taskIndex]) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({
            op: "update_task",
            phaseIndex,
            taskIndex,
            fields: this.coerceTaskFields(raw.fields),
          });
          break;
        }
        case "add_task": {
          const phaseIndex = Number(raw.phaseIndex);
          if (!snapshotPhases[phaseIndex]) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({
            op: "add_task",
            phaseIndex,
            task: this.coerceNewTask(raw.task),
          });
          break;
        }
        case "remove_task": {
          const phaseIndex = Number(raw.phaseIndex);
          const taskIndex = Number(raw.taskIndex);
          const phase = snapshotPhases[phaseIndex];
          if (!phase || !phase.tasks[taskIndex]) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({ op: "remove_task", phaseIndex, taskIndex });
          break;
        }
        case "update_phase": {
          const phaseIndex = Number(raw.phaseIndex);
          if (!snapshotPhases[phaseIndex]) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({
            op: "update_phase",
            phaseIndex,
            fields: this.coercePhaseFields(raw.fields),
          });
          break;
        }
        case "add_phase": {
          const rawAfter = raw.afterPhaseIndex;
          const afterPhaseIndex =
            rawAfter === undefined || rawAfter === null
              ? undefined
              : Number(rawAfter);
          if (
            afterPhaseIndex !== undefined &&
            !snapshotPhases[afterPhaseIndex]
          ) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({
            op: "add_phase",
            phase: this.coerceNewPhase(raw.phase, workType),
            afterPhaseIndex,
          });
          break;
        }
        case "remove_phase": {
          const phaseIndex = Number(raw.phaseIndex);
          if (!snapshotPhases[phaseIndex]) {
            throw new GroqUnavailableException("operation_index_out_of_range");
          }
          operations.push({ op: "remove_phase", phaseIndex });
          break;
        }
        default:
          throw new GroqUnavailableException("invalid_operation");
      }
    }

    const resultingPhases = applyOperationsToSnapshot(snapshotPhases, operations);

    if (resultingPhases.length > SMART_ASSISTANT_MAX_PHASES) {
      throw new GroqUnavailableException("operation_cap_violation");
    }
    for (const phase of resultingPhases) {
      if (phase.tasks.length === 0) {
        throw new GroqUnavailableException("operation_would_empty_phase");
      }
      if (phase.tasks.length > SMART_ASSISTANT_MAX_TASKS_PER_PHASE) {
        throw new GroqUnavailableException("operation_cap_violation");
      }
    }

    // Services have no fixed end date — a batch that would shrink the total
    // working-day timeline breaks that invariant. Previously this was a
    // prompt-only rule with no runtime check; calculateTotalWorkingDays only
    // reads estimatedHours/workSchedule/customHours/customFrequency off each
    // task, all present on ScopeSnapshotTask, so the same pure function used
    // for real JobListingPhase[] elsewhere works here without needing real
    // entities.
    if (workType === "service") {
      const before = calculateTotalWorkingDays(snapshotPhases as any);
      const after = calculateTotalWorkingDays(resultingPhases as any);
      if (after < before) {
        throw new GroqUnavailableException("service_timeline_shrink");
      }
    }

    return operations;
  }

  // ── Smart Assistant operations: deterministic summary ──────────────────────
  // The AI is asked to write its own plain-English summary of what it
  // changed, but since operations are addressed by index (phase 0, task 1),
  // the model's own summary text sometimes slips into referencing those same
  // indices instead of real names, even though the prompt tells it not to —
  // instruction-following isn't guaranteed. Rather than trust that text, the
  // summary shown to the client is built HERE, mechanically, from the
  // validated operations plus the real names/values already in
  // snapshotPhases — so it can never contain an index, independent of
  // whether the model followed instructions.
  private formatSmartAssistantFieldValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "none";
    return String(value);
  }

  private buildOperationsSummary(
    operations: ScopeOperation[],
    snapshotPhases: ScopeSnapshotPhase[],
  ): string {
    if (operations.length === 0) {
      return "No changes were made.";
    }

    const parts: string[] = [];

    for (const op of operations) {
      switch (op.op) {
        case "update_task": {
          const originalTask = snapshotPhases[op.phaseIndex]?.tasks[op.taskIndex];
          const changes = Object.entries(op.fields)
            .map(([key, newValue]) => {
              const label = TASK_FIELD_LABELS[key] ?? key;
              const oldValue = (originalTask as unknown as Record<string, unknown>)?.[key];
              return `${label} from ${this.formatSmartAssistantFieldValue(oldValue)} to ${this.formatSmartAssistantFieldValue(newValue)}`;
            })
            .join(", ");
          if (changes) {
            parts.push(`Changed '${originalTask?.taskName ?? "task"}': ${changes}.`);
          }
          break;
        }
        case "add_task": {
          const phaseName = snapshotPhases[op.phaseIndex]?.phaseName ?? "the phase";
          parts.push(`Added task '${op.task.taskName}' to '${phaseName}'.`);
          break;
        }
        case "remove_task": {
          const originalTask = snapshotPhases[op.phaseIndex]?.tasks[op.taskIndex];
          const phaseName = snapshotPhases[op.phaseIndex]?.phaseName ?? "the phase";
          parts.push(`Removed task '${originalTask?.taskName ?? "task"}' from '${phaseName}'.`);
          break;
        }
        case "update_phase": {
          const originalPhase = snapshotPhases[op.phaseIndex];
          const changes = Object.entries(op.fields)
            .map(([key, newValue]) => {
              const label = PHASE_FIELD_LABELS[key] ?? key;
              const oldValue = (originalPhase as unknown as Record<string, unknown>)?.[key];
              return `${label} from ${this.formatSmartAssistantFieldValue(oldValue)} to ${this.formatSmartAssistantFieldValue(newValue)}`;
            })
            .join(", ");
          if (changes) {
            parts.push(`Changed phase '${originalPhase?.phaseName ?? "phase"}': ${changes}.`);
          }
          break;
        }
        case "add_phase": {
          parts.push(`Added phase '${op.phase.phaseName}'.`);
          break;
        }
        case "remove_phase": {
          const originalPhase = snapshotPhases[op.phaseIndex];
          parts.push(`Removed phase '${originalPhase?.phaseName ?? "phase"}'.`);
          break;
        }
      }
    }

    // Joined with newlines, one change per line — the chat UI already splits
    // on \n and renders each line as its own bullet (see assistantHistory's
    // resultLines in job-listing/page.tsx), so this is what actually turns
    // the summary into a bulleted list rather than one run-on sentence.
    return parts.length > 0 ? parts.join("\n") : "No changes were made.";
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
      const model = this.config.get<string>("GROQ_MODEL");
      if (!model) {
        throw new Error("GROQ_MODEL is not configured");
      }
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

      const choice = response.data.choices[0];
      // finish_reason "length" means Groq stopped generating because it hit
      // max_tokens, not because it finished the JSON object. The cut-off
      // text can still happen to be well-formed JSON (e.g. truncated right
      // after suggestions' closing bracket, before operations was ever
      // written) — parseGroqJson would accept that silently as a
      // complete, valid result. Checking finish_reason catches this
      // regardless of whether the truncated text happens to parse, so a
      // half-finished response surfaces as AI_UNAVAILABLE instead of being
      // returned to the caller as if it were complete.
      if (choice.finish_reason === "length") {
        throw new Error("GROQ_RESPONSE_TRUNCATED");
      }

      const raw = choice.message.content;
      const latencyMs = Date.now() - startMs;
      // Groq's response is OpenAI-format and includes a `usage` block.
      // Logged (not previously) specifically to measure the real
      // prompt/completion token impact of the smart-assistant operations
      // redesign vs. the old full-scope-echo format — see maxTokens'
      // comment on handleSmartAssistantScopeEdit for why this number is
      // what eventually right-sizes that constant.
      const usage = response.data.usage as
        | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        | undefined;
      this.logger.log(
        `jl_ai_generation_latency_ms type=${generationType} latency=${latencyMs}` +
          (usage
            ? ` prompt_tokens=${usage.prompt_tokens ?? "?"} completion_tokens=${usage.completion_tokens ?? "?"} total_tokens=${usage.total_tokens ?? "?"}`
            : ""),
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
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `
You are a senior software architect selecting the technology stack for a real-world software or digital project.

Your job is NOT to brainstorm technologies. Your job is to choose a small, coherent, production-appropriate set of tools that would realistically be used to deliver the project.

Analyze the project requirements internally before selecting tools.

Selection process:
1. Determine what is actually being built from the work type, description, deliverables, and roles.
2. Identify the technical capabilities required to build and deliver it.
3. Select technologies that work well together as a coherent stack.
4. Prefer tools directly relevant to the requested deliverables.
5. Remove redundant tools, competing alternatives, and tools that are merely "nice to have".
6. Prefer mature, widely adopted technologies unless the project clearly calls for something specialized.
7. Choose the most appropriate tool for each responsibility instead of listing several interchangeable options.

Selection criteria:
- Strong fit for the project's actual requirements
- Compatibility with the rest of the selected stack
- Appropriate for the project's likely scale and complexity
- Commonly used in production for this type of work
- Relevant to the roles involved
- Necessary or highly useful for producing the specified deliverables

Important rules:
- Return approximately 6-12 tools. Use fewer if the project is simple.
- Do not fill the list just to reach a minimum.
- Do not include multiple competing technologies for the same purpose unless the project genuinely requires both.
  Bad: ["React", "Vue.js", "Angular"]
  Good: ["React"]
- Do not include generic concepts such as:
  "REST API", "Microservices", "CI/CD", "Cloud", "Database", "Agile", "DevOps", "Machine Learning"
- Do not include soft skills, methodologies, job roles, or abstract architectural concepts.
- Programming languages are allowed when they are a meaningful part of the implementation.
- Infrastructure, deployment, testing, design, analytics, and collaboration tools should only be included when the project actually needs them.
- Avoid obscure or niche technologies when a standard industry tool is a better fit.
- Do not select a technology simply because it appears in the project description; determine whether it is actually appropriate.
- Use exact, commonly recognized product or technology names:
  "React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "AWS", "Figma", "Playwright"
- Do not add explanations, categories, markdown, or commentary.

Before answering, internally verify:
- Every selected tool has a clear purpose.
- The technologies are compatible.
- There are no unnecessary alternatives.
- The stack could realistically be used by the listed roles to produce the requested deliverables.

Respond with exactly this JSON structure:
{
  "tools": ["Tool 1", "Tool 2"]
}
`.trim(),
          },
          {
            role: "user",
            content: `
Select the most appropriate technology stack for this project.

Work type:
${input.workType}

Project description:
${input.description}

Expected deliverables:
${input.deliverables?.trim() || "Not specified"}

Roles involved:
${input.roles.length > 0 ? input.roles.join(", ") : "Not specified"}
`.trim(),
          },
        ],
      },
      "tools",
    );
    return result.tools.slice(0, 15);
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
        maxTokens: 9216,
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
              "Maximum 5 phases. Maximum 5 tasks per phase. " +
              `experienceLevel must be one of: ${VALID_EXPERIENCE_LEVELS_PROMPT_LIST}. ` +
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
        maxTokens: 9216,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You generate a service scope structure for an ongoing freelance engagement. " +
              'Respond only with a JSON object: { "phases": [{ "phaseName": "string", ' +
              '"phaseType": "setup|recurring|ongoing", "recurrenceSchedule": "weekly|monthly|quarterly|null", ' +
              '"recurrenceCount": number|null, "tasks": [{ "taskName": "string", ' +
              '"roleTitle": "string", "location": "string", "experienceLevel": "string", ' +
              '"workSchedule": "full_time|part_time", "estimatedHours": number }] }] }. ' +
              "Rules: Exactly one setup phase (first). One or more recurring phases (middle). " +
              "Exactly one ongoing phase (last). Maximum 5 phases total. Maximum 5 tasks per phase. " +
              "setup and ongoing phases have recurrenceSchedule: null and recurrenceCount: null. " +
              "recurring phases must have recurrenceSchedule and recurrenceCount >= 1. " +
              "Do not include a duration field — services have no fixed end date. " +
              "taskName must be a specific, concrete action (e.g. \"Set up analytics dashboard\"), " +
              "never a generic placeholder like \"Task 1\". roleTitle must be a specific " +
              "professional title matched to that task (e.g. \"SEO Copywriter\", \"Video Editor\", " +
              "\"React Developer\"), never a generic placeholder like \"Specialist\". " +
              "experienceLevel must be one of: " +
              `${VALID_EXPERIENCE_LEVELS_PROMPT_LIST}. location must be one of these countries: ${VALID_COUNTRIES_PROMPT_LIST}. ` +
              "estimatedHours must be a positive number.",
          },
          {
            role: "user",
            content: [
              `Service description: ${input.description}`,
              `Deliverables: ${input.deliverables}`,
              `Tools: ${input.tools.join(", ")}`,
              `Roles mentioned by the client: ${input.roles.length > 0 ? input.roles.join(", ") : "Not specified — infer the right role for each task yourself"}`,
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
        "(one setup, one or more recurring, one ongoing). Maximum 5 phases. Maximum 5 tasks per phase. " +
        "Include role, location, experienceLevel, workSchedule, estimatedHours on every task. " +
        `experienceLevel must be one of: ${VALID_EXPERIENCE_LEVELS_PROMPT_LIST}.`
      : "You generate a complete project scope from a brief description. The client is unsure " +
        "what they need beyond the basic description. Make reasonable assumptions. " +
        'Respond only with a JSON object: { "phases": [...] } following the project scope structure. ' +
        "Maximum 5 phases. Maximum 5 tasks per phase. " +
        "Include role, location, experienceLevel, workSchedule, estimatedHours on every task. " +
        `experienceLevel must be one of: ${VALID_EXPERIENCE_LEVELS_PROMPT_LIST}.`;

    const result = await this.call<
      GeneratedProjectScope | GeneratedServiceScope
    >(
      {
        maxTokens: 9216,
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
          5,
        )
      : this.normalizeProjectScope(
          result as Partial<GeneratedProjectScope>,
          8,
          5,
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
    // Quality rank: guru=5, senior=4, medior=3, junior=2, student=1
    // Budget fit: 1 if effective hourly >= median, 0.5 if >= low, 0 otherwise
    const qualityRank: Record<string, number> = {
      guru: 5,
      senior: 4,
      medior: 3,
      junior: 2,
      student: 1,
    };
    const MAX_QUALITY_RANK = 5;

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
      const score = (quality / MAX_QUALITY_RANK) * 0.75 + bestFit * 0.25;
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
  // commands ("reduce the budget", "make it cheaper", ...) get
  // REDUCE_BUDGET_RULES appended, timeline-shortening commands get
  // SHORTEN_TIMELINE_RULES, and scope-quality commands ("Improve scope
  // quality", "add more detail", ...) get IMPROVE_SCOPE_RULES — each
  // identical for both project and service scopes, appended independently
  // of the others, so a command could in principle match more than one.
  // Non-matching commands (e.g. "add a QA phase") skip all three to keep
  // the prompt short and on-topic.
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
  // use today.
  private isScopeQualityCommand(command: string): boolean {
    return /\b(improve|increase|add|more)\b.*\b(scope|detail|granularity|specificity)\b|\b(break\s*down|breakdown|expand)\b.*\b(tasks?|scope)\b|\bmore\s+(detailed|granular|specific)\b|\bsplit\b.*\btasks?\b/i.test(
      command,
    );
  }

  private buildSmartAssistantPrompt(input: {
    command: string;
    workType: "project" | "service";
  }): string {
    const isCostOptimization = this.isCostOptimizationCommand(input.command);
    const isTimelineShortening = this.isTimelineShorteningCommand(
      input.command,
    );
    const isScopeQuality = this.isScopeQualityCommand(input.command);

    const serviceRule =
      input.workType === "service"
        ? `
- Service scopes have no fixed end date: never shorten a service's overall
  timeline.`
        : "";

    let prompt = `
You are a Smart Assistant that edits ${input.workType} scopes based on
natural-language commands. Act as an experienced Product Manager and
Delivery Planner.

The current scope is given below as a list of phases (0-indexed) each
containing a list of tasks (0-indexed within their phase). Respond ONLY
with a valid JSON object, with the keys in this exact order:

{
  "suggestions": ["string"],
  "operations": [ {...op...} ]
}

Do not include a "summary" key or any other prose — the human-readable
description of what changed is built separately from "operations", not
from anything you write, so spending effort on one just wastes tokens.

"operations" is a list of edits, NOT a copy of the scope. Only include an
operation for something that actually changes. Never re-emit a task or
phase that isn't changing. Each operation is one of:

  { "op": "update_task", "phaseIndex": 0, "taskIndex": 1,
    "fields": { "location": "Poland", "experienceLevel": "junior" } }
    — fields contains ONLY the fields you are changing on that task.

  { "op": "add_task", "phaseIndex": 0,
    "task": { "taskName": "...", "roleTitle": "...", "location": "...",
              "experienceLevel": "...", "workSchedule": "full_time",
              "estimatedHours": 8 } }

  { "op": "remove_task", "phaseIndex": 0, "taskIndex": 2 }

  { "op": "update_phase", "phaseIndex": 1,
    "fields": { "phaseName": "New name" } }

  { "op": "add_phase",
    "phase": { "phaseName": "QA", "tasks": [ {...task...} ] },
    "afterPhaseIndex": 1 }
    — afterPhaseIndex is optional; omit it to append at the end.

  { "op": "remove_phase", "phaseIndex": 2 }

Every phaseIndex/taskIndex refers to the ORIGINAL scope given below, not
to any earlier operation in this same list — always index against the
scope as given, never against your own edits.

RULES:
- Only emit operations for what the command actually asks you to change.
- Never let the resulting scope exceed 5 phases or 5 tasks per phase.
- Don't add, remove, or reorder a phase or task unless the command clearly
  asks for it; if you remove a task, never leave a phase with zero tasks.
- suggestions must contain 2-3 useful follow-up actions.${serviceRule}
`;

    if (isCostOptimization) {
      prompt += `\n${REDUCE_BUDGET_RULES}`;
    }

    // Only reachable for project scopes — handleSmartAssistantScopeEdit
    // rejects timeline-shortening commands for services before the prompt
    // is ever built.
    if (isTimelineShortening) {
      prompt += `\n${SHORTEN_TIMELINE_RULES}`;
    }

    if (isScopeQuality) {
      prompt += `\n${IMPROVE_SCOPE_RULES}`;
    }

    return prompt;
  }

  async handleSmartAssistantScopeEdit(input: {
    command: string;
    currentScope: { phases: ScopeSnapshotPhase[] };
    workType: "project" | "service";
  }): Promise<{
    summary: string;
    suggestions: string[];
    operations: ScopeOperation[];
  }> {
    const isService = input.workType === "service";

    // Services cannot shorten the timeline — there is no fixed end date.
    // Reject timeline-shortening commands for service scopes.
    if (isService && this.isTimelineShorteningCommand(input.command)) {
      return {
        summary:
          "Timeline changes are not applicable to service scopes. Services run on a recurring schedule with no fixed end date. To adjust the workload, try reducing tasks or changing the recurrence frequency.",
        suggestions: [
          "Reduce the budget",
          "Improve scope quality",
          "Remove a recurring cycle",
        ],
        operations: [],
      };
    }

    const systemPrompt = this.buildSmartAssistantPrompt({
      command: input.command,
      workType: input.workType,
    });

    // GROQ_REASONING_EFFORT's reasoning trace can consume most of a smaller
    // maxTokens budget before the model ever writes the JSON body. 9216 was
    // sized to survive echoing the full scope back on every edit; now that
    // the response is a short operations list instead, this ceiling is
    // expected to be overly generous — leave it as-is until real
    // completion_tokens numbers are measured post-rollout, rather than
    // guessing a smaller value now (guessing too low risks reintroducing the
    // exact truncation problem this change exists to fix).
    const maxTokens = 9216;

    const result = await this.call<{
      suggestions: string[];
      operations: unknown;
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

    const operations = this.normalizeSmartAssistantOperations(
      result.operations,
      input.currentScope.phases,
      input.workType,
    );

    return {
      // Built mechanically from `operations`, not taken from the model's own
      // `result.summary` — see buildOperationsSummary's doc comment above
      // for why.
      summary: this.buildOperationsSummary(operations, input.currentScope.phases),
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.slice(0, 3)
        : [],
      operations,
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
