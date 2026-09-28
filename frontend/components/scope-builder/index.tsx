"use client"

import {
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import React from "react"
import dynamic from "next/dynamic"
import { cn, getId, hookFormHasError } from "@/utils/functions"
import {
  useCallbackRef,
  useControllableState,
  useUncontrolledState,
} from "@/utils/hooks"
import { createStrictContext } from "@/utils/react-utils"
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpLeft,
  Check,
  ChevronDown,
  ChevronsDown,
  Calendar,
  ChevronsUp,
  Clock,
  Copy,
  Edit03,
  Lightbulb05,
  MoreHorizontal,
  PlayCircle,
  Plus,
  RefreshCcw05,
  SearchMd,
  Trash2,
  Type,
  X,
} from "@blend-metrics/icons"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { createColumnHelper } from "@tanstack/react-table"
import {
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Controller,
  SubmitHandler,
  get,
  useForm,
  useWatch,
} from "react-hook-form"
import { useIsomorphicLayoutEffect, useUpdateEffect } from "react-use"
import { z } from "zod"
import { Prettify } from "@/types/core"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import {
  CountriesCombobox,
  OwnCombobox,
  getStaticFlagUrl,
} from "@/components/own-combobox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
} from "@/components/ui"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  ScrollBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToastAction,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })
const PROJECT_SCOPE_TIP_VIDEO_URL =
  process.env.NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL ?? ""

// ─── Schemas & Constants ────────────────────────────────────────────────

const DURATION_TYPE = ["hours", "days", "weeks", "months"] as const

const formatDurationUnit = (
  value: number,
  type: (typeof DURATION_TYPE)[number]
) => {
  if (value === 1) {
    if (type === "days") return "day"
    if (type === "weeks") return "week"
    if (type === "months") return "month"
    return "hour"
  }

  return type
}

const durationToDays = (
  value: number,
  type: (typeof DURATION_TYPE)[number]
) => {
  if (type === "weeks") return value * 7
  if (type === "months") return value * 30
  if (type === "hours") return Math.max(1, Math.ceil(value / 24))
  return value
}

const EXPERIENCE_LEVELS = [
  "Student",
  "Junior",
  "Medior",
  "Senior",
  "Guru",
] as const
type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

const taskFormSchema = z.object({
  task: z.string().min(1, "Please enter a task name"),
  role: z.string().min(1, "Please select a role"),
  // PMCM-257 fix: reverted to optional (matches dev-main) — the
  // TaskDialog using this schema has no location input at all (it's set
  // afterward in the PhaseTable's own location column), so requiring it
  // here made "Add Task" permanently fail on a field the user can't see
  // or fill from this dialog. Location-required is now enforced where
  // location is actually editable — see the location column below.
  location: z.string().optional().default(""),
  experience: z.enum(EXPERIENCE_LEVELS, {
    required_error: "Please select an experience level",
    invalid_type_error: "Please select an experience level",
  }),
  duration: z.object({
    value: z.coerce
      .number({
        invalid_type_error: "Please enter a valid number",
      })
      // PMCM-257: "Task with 0 hours → inline 'Minimum 1 hour per task.'
      // on that row." Checked on the raw entered value/unit (not
      // converted through durationToHours) — the concrete, named failure
      // case is literally 0, regardless of unit.
      .min(1, "Minimum 1 hour per task."),
    type: z.enum(DURATION_TYPE, {
      invalid_type_error: "Please select an option",
      required_error: "Please select an option",
    }),
  }),
})

const rowSchema = taskFormSchema.merge(
  z.object({
    id: z.string().min(1, "Please enter a task ID"),
  })
)

const pickFromProjectScopeSchema = (
  options: {
    [Property in keyof z.infer<typeof rowSchema>]?: true
  } = {}
) => {
  return {
    safeParse: (data: unknown, params?: Partial<z.ParseParams>) => {
      const { success } = z
        .array(
          z.object({
            phaseName: z.string().min(1, "Please enter a phase name"),
            rows: z
              .array(rowSchema.pick(options))
              .min(1, "Please add at least one task"),
          })
        )
        .min(1, "Please add at least one phase")
        .safeParse(data, params)
      return success
    },
  }
}

const projectScopeSchema = pickFromProjectScopeSchema()

const phaseNameFormSchema = z.object({
  name: z.string().min(1, "Please enter a phase name"),
})

type PhaseNameFormValues = z.infer<typeof phaseNameFormSchema>

// ─── Types ──────────────────────────────────────────────────────────────

type TaskFormValues = z.infer<typeof taskFormSchema>

export interface TeamMember {
  id: string
  firstName: string
  username: string
  avatarUrl: string | null
  role: string
  /** Up to 3 job titles with optional per-role rates */
  jobTitles?: string[]
  /** Hourly rate in USD (e.g. 85 = $85/hr) */
  hourlyRate?: number | null
  /** "full_time" | "part_time" | "custom" */
  workSchedule?: string | null
  /** Custom hours per week (only relevant when workSchedule = "custom") */
  customHoursPerWeek?: number | null
  /** Team member's location/country */
  location?: string | null
  /** Experience level */
  experience?: string | null
}

/** Convert a duration to billable hours based on work schedule */
export function durationToHours(
  durationValue: number,
  durationType: string,
  workSchedule?: string | null,
  customHoursPerWeek?: number | null
): number {
  const hoursPerWeek =
    workSchedule === "part_time"
      ? 20
      : workSchedule === "custom" && customHoursPerWeek
        ? customHoursPerWeek
        : 40 // full_time default
  const hoursPerDay = hoursPerWeek / 5

  if (durationType === "hours") return durationValue
  if (durationType === "weeks") return durationValue * hoursPerWeek
  // PMCM-258 follow-up: months previously fell through to the "days"
  // branch below (durationValue * hoursPerDay), so "2 months" billed as
  // 2 days. Same 30-day month as listing-pricing.ts's MONTH_DAYS and this
  // file's own durationToDays — 30/7 weeks per month, scaled by the same
  // workSchedule-derived hoursPerWeek the other branches already use.
  if (durationType === "months") return durationValue * (30 / 7) * hoursPerWeek
  // days
  return durationValue * hoursPerDay
}

// Stand-in rate card (USD/hour by experience level) — mirrors the backend's
// cms-projects deriveBudgetFromScope. Swap for pricing-service rates once the
// roles/rate table is wired (docs §14.7 HOURLY_RATE_BY_LEVEL stand-in).
export const HOURLY_RATE_BY_LEVEL: Record<string, number> = {
  Student: 25,
  Junior: 55,
  Medior: 85,
  Senior: 125,
  Guru: 175,
}

// Role-specific hourly rates (USD/hr), reusing the pricing-service test seed
// (PS-07 / ps_platform_rate_averages median). Roles not listed fall back to
// HOURLY_RATE_BY_LEVEL by experience level.
export const HOURLY_RATE_BY_ROLE: Record<string, number> = {
  "ux designer": 100,
  "backend developer": 70,
  "product manager": 55,
  "devops engineer": 45,
}

// startingPriceTotal (docs §14.7): Σ (hours × rate), returned in USD cents.
// Hours come from an explicit estimatedHours, else derived from the task's
// duration via durationToHours (respecting workSchedule).
export function estimateScopeBudgetCents(
  phases: any[] | null | undefined
): number {
  if (!Array.isArray(phases)) return 0
  let totalUsd = 0
  for (const phase of phases) {
    const rows = phase?.rows ?? phase?.tasks ?? []
    for (const row of rows) {
      if (!row) continue
      const explicit = Number(row.estimatedHours)
      let hours = Number.isFinite(explicit) && explicit > 0 ? explicit : 0
      if (hours <= 0 && row.duration) {
        const dur = row.duration
        const value =
          typeof dur === "object"
            ? Number(dur?.value)
            : Number(String(dur).trim().split(/\s+/)[0])
        const type =
          typeof dur === "object"
            ? dur?.type
            : String(dur).trim().split(/\s+/)[1]
        if (Number.isFinite(value) && value > 0) {
          hours = durationToHours(value, type ?? "days", row.workSchedule)
        }
      }
      if (hours <= 0) continue
      const level = Array.isArray(row.experience)
        ? row.experience[0]
        : row.experienceLevel || row.experience || "Medior"
      const roleKey = String(row.role ?? "")
        .trim()
        .toLowerCase()
      const memberRate = Number(row.assignedMember?.hourlyRate)
      const fallbackRate =
        HOURLY_RATE_BY_ROLE[roleKey] ??
        HOURLY_RATE_BY_LEVEL[level] ??
        HOURLY_RATE_BY_LEVEL.Medior
      const rate =
        Number.isFinite(memberRate) && memberRate > 0
          ? memberRate
          : fallbackRate
      totalUsd += hours * rate
    }
  }
  return Math.round(totalUsd * 100)
}

/** Calculate task cost for an assigned team member */
export function calculateTaskCost(
  member: TeamMember,
  durationValue: number,
  durationType: string
): number | null {
  if (!member.hourlyRate) return null
  const hours = durationToHours(
    durationValue,
    durationType,
    member.workSchedule,
    member.customHoursPerWeek
  )
  return Math.round(member.hourlyRate * hours * 100) // USD cents
}

export type PhaseRow = Prettify<
  {
    id: string
    role?: string
    location?: string
    experience?: string
    assignedMember?: TeamMember | null
  } & TaskFormValues
>

export type PhaseType = "setup" | "recurring" | "ongoing"
export type RecurrenceSchedule = "weekly" | "monthly" | "quarterly"

export interface Phase {
  phaseName?: string
  rows?: PhaseRow[]
  // Service-scope only. Undefined on project (flat) phases.
  phaseType?: PhaseType
  recurrenceSchedule?: RecurrenceSchedule
  recurrenceCount?: number
}

// ─── Table meta augmentation ────────────────────────────────────────────

declare module "@tanstack/react-table" {
  // @ts-expect-error
  interface TableMeta<TData extends PhaseRow> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
    batchUpdateData?: (
      rowIndex: number,
      updates: Record<string, unknown>
    ) => void
    openDurationDialog: (index: number) => void
    roles: string[]
    teamMembers?: TeamMember[]
  }
}

// ─── Helper functions ───────────────────────────────────────────────────

const getPhaseDurationInDays = (phase?: Phase) => {
  const rows = phase?.rows ?? []
  const durations = rows
    .map((row) => {
      const value = Number(row?.duration?.value)
      const type = row?.duration?.type

      if (!Number.isFinite(value) || value <= 0 || !type) return null
      return durationToDays(value, type)
    })
    .filter((value): value is number => typeof value === "number")

  return durations.length ? Math.max(...durations) : 0
}

const getPhaseDayRange = (phases: Phase[], phaseIndex: number) => {
  const priorDays = phases
    .slice(0, phaseIndex)
    .reduce((sum, phase) => sum + getPhaseDurationInDays(phase), 0)
  const startDay = priorDays + 1
  const duration = getPhaseDurationInDays(phases[phaseIndex])
  const endDay = duration > 0 ? startDay + duration - 1 : undefined

  return { startDay, endDay }
}

const getPhaseDayRangeLabel = (phases: Phase[], phaseIndex: number) => {
  const { startDay, endDay } = getPhaseDayRange(phases, phaseIndex)

  if (typeof endDay !== "number" || endDay === startDay) {
    return `Day ${startDay}`
  }

  return `Day ${startDay} - Day ${endDay}`
}

// Setup phases show their TOTAL duration (e.g. "2 weeks"), not a day range.
export const getPhaseDurationLabel = (phases: Phase[], phaseIndex: number) => {
  const days = getPhaseDurationInDays(phases[phaseIndex])
  if (days <= 0) return getPhaseDayRangeLabel(phases, phaseIndex)
  if (days % 7 === 0) {
    const weeks = days / 7
    return `${weeks} ${formatDurationUnit(weeks, "weeks")}`
  }
  return `${days} ${formatDurationUnit(days, "days")}`
}

// PMCM-257 follow-up: converts phases between the Project (flat, no
// phaseType) and Service (setup/recurring/ongoing) shapes on a scope-type
// switch, preserving phaseName/rows/order instead of clearing them —
// replaces the earlier clear-on-switch behavior per product direction.
//
// PMCM-257 follow-up 2: the "service" branch is non-destructive and
// doubles as the general-purpose "every phase must have a phaseType in
// Service scope" normalizer (see ensureServicePhaseTypes below) — an
// already-typed phase (and its recurrenceSchedule/recurrenceCount) is
// left untouched; only an untyped phase gets assigned one. This keeps
// Project→Service conversion's own output identical to before (project
// phases have no phaseType at all, so index 0 still becomes "setup" and
// the rest "recurring") while also being safe to call on a scope that's
// already partially or fully typed.
export function convertPhasesForScopeType(
  phases: Phase[],
  target: ScopeType
): Phase[] {
  if (target === "service") {
    const hasSetup = phases.some((phase) => phase.phaseType === "setup")
    return phases.map((phase, index) => {
      if (phase.phaseType) {
        // Already typed — keep it and its recurrence fields as-is.
        return phase
      }
      if (index === 0 && !hasSetup) {
        return { ...phase, phaseType: "setup" as const }
      }
      // Every other untyped phase, and an untyped phase at index 0 when
      // some other phase already claims "setup" — never auto-assign
      // "ongoing".
      return {
        ...phase,
        phaseType: "recurring" as const,
        recurrenceSchedule: "monthly" as const,
        recurrenceCount: 1,
      }
    })
  }

  // target === "project": omit the service-only keys entirely (not set to
  // null/undefined) so day ranges recompute from task durations the same
  // way they always have for a flat project phase.
  return phases.map((phase) => {
    const { phaseType, recurrenceSchedule, recurrenceCount, ...rest } = phase
    return rest
  })
}

// PMCM-257 follow-up 2: Service scope must never show the Project header
// fallback ("Phase One") — every phase needs a phaseType. This is just
// convertPhasesForScopeType's non-destructive "service" branch under a
// name that reads correctly at a normalization call site (no actual
// scope-type switch happening).
export const ensureServicePhaseTypes = (phases: Phase[]): Phase[] =>
  convertPhasesForScopeType(phases, "service")

const RECURRENCE_LABEL: Record<RecurrenceSchedule, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
}

// Service phases are titled by their type (Setup / Recurring / Ongoing) rather
// than "Phase One/Two" (design: whole table.png).
export const PHASE_TYPE_TITLE: Record<PhaseType, string> = {
  setup: "Setup",
  recurring: "Recurring",
  ongoing: "Ongoing",
}

// Recurring-phase editor (docs: Scope edit.png) — schedule + repeats count.
const RecurrenceEditor = ({
  schedule,
  count,
  onChange,
}: {
  schedule?: RecurrenceSchedule
  count?: number
  onChange: (schedule: RecurrenceSchedule, count: number) => void
}) => {
  const [open, setOpen] = useState(false)
  const [draftSchedule, setDraftSchedule] = useState<RecurrenceSchedule>(
    schedule ?? "monthly"
  )
  const [draftCount, setDraftCount] = useState<number>(count ?? 1)
  useEffect(() => {
    if (open) {
      setDraftSchedule(schedule ?? "monthly")
      setDraftCount(count ?? 1)
    }
  }, [open, schedule, count])

  const value =
    schedule && count
      ? `${RECURRENCE_LABEL[schedule]}, ${count} time${count > 1 ? "s" : ""}`
      : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-[13px] font-semibold text-dark-blue-400 focus-visible:outline-none"
        >
          <RefreshCcw05 className="size-3.5 shrink-0" style={{ color: "#12B76A" }} />
          {value ? (
            <>
              <span>Recurs:</span>
              <span
                className="rounded-md px-2 py-0.5 text-[13px] font-medium"
                style={{ backgroundColor: "#F2F4F7", color: "#344054" }}
              >
                {value}
              </span>
            </>
          ) : (
            <span>Set recurrence</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px] p-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label size="sm" className="text-dark-blue-400">
              Recurring schedule
            </Label>
            <Listbox value={draftSchedule} onChange={setDraftSchedule}>
              <ListboxButton>
                {({ value }) => (
                  <span className="text-gray-black">
                    {RECURRENCE_LABEL[value as RecurrenceSchedule]}
                  </span>
                )}
              </ListboxButton>
              <ListboxOptions>
                <ListboxOption value="weekly">Weekly</ListboxOption>
                <ListboxOption value="monthly">Monthly</ListboxOption>
                <ListboxOption value="quarterly">Quarterly</ListboxOption>
              </ListboxOptions>
            </Listbox>
          </div>
          <div className="space-y-1.5">
            <Label size="sm" className="text-dark-blue-400">
              Repeats
            </Label>
            <div className="flex items-center rounded-md border border-gray-300">
              <button
                type="button"
                className="px-3.5 py-2.5 text-gray-500 hover:text-gray-900 focus-visible:outline-none"
                onClick={() => setDraftCount((v) => Math.max(1, v - 1))}
              >
                −
              </button>
              <span className="flex-auto text-center text-sm text-gray-900">
                {draftCount} times
              </span>
              <button
                type="button"
                className="px-3.5 py-2.5 text-gray-500 hover:text-gray-900 focus-visible:outline-none"
                onClick={() => setDraftCount((v) => Math.min(99, v + 1))}
              >
                +
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-x-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                onChange(draftSchedule, draftCount)
                setOpen(false)
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Phase-header meta: service phases show a type chip (Setup duration /
// Recurs editor / Ongoing); project phases show the Day range.
export const PhaseHeaderMeta = ({
  phases,
  index,
  onRecurrenceChange,
}: {
  phases: Phase[]
  index: number
  onRecurrenceChange: (schedule: RecurrenceSchedule, count: number) => void
}) => {
  const phase = phases[index]
  if (phase?.phaseType === "ongoing") {
    return (
      <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-[13px] font-semibold text-dark-blue-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
          style={{ color: "#12B76A" }}
          aria-hidden="true"
        >
          <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
        </svg>
        Ongoing
      </span>
    )
  }
  if (phase?.phaseType === "recurring") {
    return (
      <RecurrenceEditor
        schedule={phase.recurrenceSchedule}
        count={phase.recurrenceCount}
        onChange={onRecurrenceChange}
      />
    )
  }
  if (phase?.phaseType === "setup") {
    return (
      <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] font-semibold text-dark-blue-400">
        <Calendar className="size-3.5 shrink-0" style={{ color: "#12B76A" }} />
        {getPhaseDurationLabel(phases, index)}
      </span>
    )
  }
  return (
    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold whitespace-nowrap">
      {getPhaseDayRangeLabel(phases, index)}
    </span>
  )
}

const getPhaseSearchTargetId = (phaseIndex: number) =>
  `project-scope-phase-${phaseIndex}`

const getTaskSearchTargetId = (phaseIndex: number, rowIndex: number) =>
  `project-scope-phase-${phaseIndex}-task-${rowIndex}`

const normalizeSearchText = (value?: string) =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim()

// PMCM-257: matches a phase's own name OR any of its task rows' task/
// role/location text against the normalized search query.
const matchesPhaseSearch = (phase: Phase, normalizedQuery: string) => {
  if (!normalizedQuery) return true
  if (normalizeSearchText(phase.phaseName).includes(normalizedQuery)) {
    return true
  }
  return (phase.rows ?? []).some((row) =>
    [row.task, row.role, row.location].some((value) =>
      normalizeSearchText(value).includes(normalizedQuery)
    )
  )
}

const numberToWord = (num: number) => {
  const words = [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
  ]
  return words[num] || num + 1 // fallback for numbers > 10
}

// Member locations are free-text and inconsistent: "City, Country"
// (Munich, Germany), "City, State, Country" (San Francisco, California,
// United States), US "City, State" with no country (New York, NY), or a
// bare country (USA). This column is country-based (flag + country), so
// reduce any of those to a country name COUNTRY_CODES understands.
//
// "Georgia" is intentionally NOT treated as a US state — it collides with the
// country of the same name, so we default the ambiguous case to the country.
const US_STATES = new Set<string>([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
  "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
  "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
  "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
  "wi", "wy", "dc",
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "hawaii", "idaho", "illinois",
  "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland",
  "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
  "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming",
])

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  us: "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  uae: "United Arab Emirates",
}

export function countryFromLocation(location?: string | null): string {
  const parts = (location ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) return ""

  const last = parts[parts.length - 1]
  const key = last.toLowerCase()

  if (US_STATES.has(key)) return "United States"
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]
  return last
}

// ─── Roles ──────────────────────────────────────────────────────────────

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Database Administrator",
  "Security Engineer",
  "Mobile Developer",
  "QA Engineer",
  "System Architect",
  "Network Engineer",
  "Site Reliability Engineer (SRE)",
  "Software Engineer",
  "UI/UX Designer",
  "Graphic Designer",
  "Product Designer",
  "Interaction Designer",
  "Visual Designer",
  "Motion Designer",
  "Web Designer",
  "Brand Designer",
  "Illustrator",
  "Information Architect",
  "User Researcher",
  "Content Strategist",
  "Design Technologist",
  "Experience Designer",
  "Service Designer",
]

// ─── State types ────────────────────────────────────────────────────────

type PhaseNameDialogAction =
  | {
      type: "TOGGLE"
      payload?: {
        open?: boolean
        addTo?: "start" | "end" | "below"
        targetPhaseIndex?: number
      }
    }
  | { type: "EDIT"; payload: number }

type PhaseNameDialogState = {
  open: boolean
  editingPhaseIndex: number | null
  action: "EDIT" | null
  addTo: "start" | "end" | "below"
}

const phaseNameDialogReducer = (
  state: PhaseNameDialogState,
  action: PhaseNameDialogAction
): PhaseNameDialogState => {
  switch (action.type) {
    case "TOGGLE":
      const { payload } = action
      return {
        ...state,
        action: null,
        editingPhaseIndex:
          typeof payload?.targetPhaseIndex === "number"
            ? payload.targetPhaseIndex
            : null,
        open: typeof payload?.open === "boolean" ? payload.open : !state.open,
        addTo: typeof payload?.addTo === "string" ? payload.addTo : "end",
      }
    case "EDIT":
      return {
        ...state,
        addTo: "end",
        action: "EDIT",
        open: true,
        editingPhaseIndex: action.payload,
      }

    default:
      return state
  }
}

const defaultPhaseNameDialogState: PhaseNameDialogState = {
  action: null,
  editingPhaseIndex: null,
  open: false,
  addTo: "end",
}

type TaskDialogState = {
  open: boolean
  editingPhaseIndex: number | null
}

interface DurationDialogState extends TaskDialogState {
  editingPhaseRowIndex: number | null
}

type DeletePhaseDialogState = {
  open: boolean
  phaseIndex: number | null
}

// ─── Duration form types ────────────────────────────────────────────────

type DurationFormValues = {
  duration: {
    value: number
    type: "hours" | "days" | "weeks" | "months"
  }
}

// PMCM-257: this dialog previously had no resolver at all — a plain HTML
// min={1} on the number input, which React Hook Form's handleSubmit does
// not enforce, so 0 (or a negative value) saved silently. Same rule as
// taskFormSchema.duration above.
const durationFormSchema = z.object({
  duration: z.object({
    value: z.coerce.number().min(1, "Minimum 1 hour per task."),
    type: z.enum(DURATION_TYPE),
  }),
})

interface DurationDialogProps {
  open: boolean
  durationFormValues?: DurationFormValues
  onDurationFormValuesChange: (values: DurationFormValues) => void
  onOpenChange: (open: boolean) => void
}

// ─── Sub-components ─────────────────────────────────────────────────────

// PMCM-257 follow-up: extracted so the scope-type switch confirm dialog's
// "Learn More" can reuse the same tip video instead of duplicating it.
const ProjectScopeTipVideo = () => (
  <>
    <DialogHeader>
      <DialogTitle>Project Scope Tip Video</DialogTitle>
    </DialogHeader>
    {PROJECT_SCOPE_TIP_VIDEO_URL ? (
      <ReactPlayer
        controls
        width="100%"
        height={300}
        url={PROJECT_SCOPE_TIP_VIDEO_URL}
      />
    ) : (
      <p className="text-sm text-gray-500">
        Tip video URL is not configured yet. Add
        `NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL` in `.env`.
      </p>
    )}
  </>
)

const ProjectScopeTip = ({
  showArrow,
  closeTrigger,
  className,
}: {
  showArrow?: boolean
  closeTrigger?: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}

      {closeTrigger}

      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-normal font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-normal block text-dark-blue-400">
          Clarify phases, owners, and deliverables.
        </span>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Ensure all phases and tasks align with your project goals and
            deliverables.
          </li>
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Review dependencies, timelines, and assignments for clarity.
          </li>
        </ul>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-3 px-0" variant="link" type="button">
            <PlayCircle className="size-5" /> Show me how
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[560px]">
          <ProjectScopeTipVideo />
        </DialogContent>
      </Dialog>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-normal text-gray-500">
            Use the project planner to edit existing phases or tasks
            effortlessly.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Double-check for any overlapping or missing tasks to maintain
            efficiency.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Add new phases, tasks, or processes quickly with the + Add option.
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Leaving phases or tasks incomplete or ambiguous.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Try not to overload a single phase with too many tasks; break them
            down if needed.
          </li>
        </ul>
      </div>
    </div>
  )
}

const PhaseNameDialog = ({
  onOpenChange,
  onAddPhaseName,
  open,
  defaultName,
  placeholder = "Enter Phase Name",
  showPhaseType = false,
  disabledTypes = [],
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAddPhaseName: (phaseName: string, phaseType?: PhaseType) => void
  defaultName?: string
  placeholder?: string
  showPhaseType?: boolean
  disabledTypes?: PhaseType[]
}) => {
  const [phaseType, setPhaseType] = useState<PhaseType | undefined>(undefined)
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PhaseNameFormValues>({
    resolver: zodResolver(phaseNameFormSchema),
    defaultValues: { name: defaultName ?? "" },
  })

  // whenever dialog opens for a different phase, sync the input
  useEffect(() => {
    if (isOpen) {
      reset({ name: defaultName ?? "" })
      setPhaseType(undefined)
    }
  }, [isOpen, defaultName, reset])

  const onSubmit: SubmitHandler<PhaseNameFormValues> = (values) => {
    const { name } = values
    // Services require a phase type before the phase can be created.
    if (showPhaseType && !phaseType) return
    onAddPhaseName(name, showPhaseType ? phaseType : undefined)

    toggleIsOpen(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
          <form
            className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="phase-name"
                className="text-dark-blue-400"
                size="sm"
              >
                Phase Name
              </Label>
              <Input
                id="phase-name"
                className="text-gray-900"
                placeholder={placeholder}
                {...register("name", {
                  onChange: (e) => {
                    const v = e.target.value
                    if (v && v[0] !== v[0].toUpperCase()) {
                      e.target.value = v.charAt(0).toUpperCase() + v.slice(1)
                    }
                  },
                })}
                isInvalid={hookFormHasError({ errors, name: "name" })}
              />
              <HookFormErrorMessage
                errors={errors}
                name="name"
                render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
              />
            </div>

            {showPhaseType && (
              <div className="space-y-1.5 mt-4">
                <Label size="sm" className="text-dark-blue-400">
                  Phase Type
                </Label>
                <Listbox value={phaseType} onChange={setPhaseType}>
                  <ListboxButton placeholder="Select phase type">
                    {({ value }) => (
                      <span className="text-gray-black">
                        {PHASE_TYPE_TITLE[value as PhaseType]}
                      </span>
                    )}
                  </ListboxButton>
                  <ListboxOptions>
                    <ListboxOption
                      value="setup"
                      disabled={disabledTypes.includes("setup")}
                    >
                      Setup
                    </ListboxOption>
                    <ListboxOption value="recurring">Recurring</ListboxOption>
                    <ListboxOption
                      value="ongoing"
                      disabled={disabledTypes.includes("ongoing")}
                    >
                      Ongoing
                    </ListboxOption>
                  </ListboxOptions>
                </Listbox>
                <p className="text-xs font-light text-gray-500">
                  Helps organize tasks by timing and frequency
                </p>
              </div>
            )}

            <DialogFooter className="mt-8 grid gap-x-3">
              <DialogClose asChild>
                <Button type="button" variant="outlined" visual="gray">
                  Cancel
                </Button>
              </DialogClose>

              <Button>Done</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

const TaskDialog = ({
  open,
  onOpenChange,
  onAddTask,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAddTask: (values: TaskFormValues) => void
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      task: "",
      role: "",
      location: "",
      experience: undefined,
      duration: {
        type: "days",
        value: 1,
      },
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      reset({
        task: "",
        role: "",
        location: "",
        experience: undefined,
        duration: { type: undefined as any, value: undefined as any },
      })
    }
  }, [isOpen, reset])

  const taskDurationValue = useWatch({
    control,
    name: "duration.value",
    defaultValue: 1,
  })
  const onSubmit: SubmitHandler<TaskFormValues> = (values) => {
    onAddTask(values)
    toggleIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="task-name" className="text-gray-700" size="sm">
              Task Name
            </Label>
            <Input
              id="task-name"
              placeholder="Enter task name"
              {...register("task")}
              isInvalid={hookFormHasError({ errors, name: "task" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="task"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duration" className="text-gray-700" size="sm">
              Duration
            </Label>
            <div className="grid grid-cols-2 gap-x-3">
              <Input
                id="duration"
                type="number"
                min={0}
                placeholder="0"
                {...register("duration.value")}
                isInvalid={hookFormHasError({ errors, name: "duration.value" })}
              />
              <Controller
                control={control}
                name="duration.type"
                render={({ field: { value, onChange } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_TYPE.map((format) => (
                        <SelectItem key={format} value={format}>
                          {formatDurationUnit(
                            Number(taskDurationValue) || 0,
                            format
                          ).replace(/^./, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {(hookFormHasError({ errors, name: "duration.value" }) ||
              hookFormHasError({ errors, name: "duration.type" })) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message") ||
                  get(errors, "duration.type.message")}
              </ErrorMessage>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-name" className="text-gray-700" size="sm">
              Role
            </Label>
            <Input
              id="role-name"
              placeholder="Enter role"
              {...register("role")}
              isInvalid={hookFormHasError({ errors, name: "role" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="role"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="experience" className="text-gray-700" size="sm">
              Experience
            </Label>
            <Controller
              control={control}
              name="experience"
              render={({ field: { value, onChange } }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="experience"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <DialogFooter className="grid grid-cols-2 gap-x-3 pt-2">
            <DialogClose asChild>
              <Button variant="outlined" type="button" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Done</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const TaskSearchDialog = ({
  open,
  onOpenChange,
  phases,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  phases: Phase[]
}) => {
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  const [query, setQuery] = useState("")

  const searchableItems = useMemo(
    () =>
      phases.flatMap((phase, phaseIndex) => {
        const phaseLabel = `Phase ${phaseIndex + 1}: ${phase.phaseName || "Untitled"}`
        const rows = Array.isArray(phase.rows) ? phase.rows : []
        const tasks = rows.map((row, rowIndex) => ({
          label: `Task ${rowIndex + 1}: ${row.task}`,
        }))
        return [{ label: phaseLabel }, ...tasks]
      }),
    [phases]
  )

  const filteredItems = useMemo(() => {
    if (!query.trim()) return searchableItems
    const normalized = query.trim().toLowerCase()
    return searchableItems.filter((item) =>
      item.label.toLowerCase().includes(normalized)
    )
  }, [query, searchableItems])

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[420px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Task Name</DialogTitle>
          <DialogDescription>
            Find a phase or task from your project scope.
          </DialogDescription>

          <div className="mt-3">
            <Input
              type="text"
              placeholder="Find a phase or task"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[240px] overflow-auto rounded-md border border-gray-200">
            {filteredItems.length ? (
              filteredItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  {item.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500">
                No phase or task found.
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
}: {
  onValueChange?: (value: ExperienceLevel | undefined) => void
  value?: ExperienceLevel
  placeholder?: string
}) => {
  const [state, setState] = useControllableState<ExperienceLevel | undefined>({
    onChange: onValueChange,
    value,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => setState(nextValue as ExperienceLevel)}
        >
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Student"
          >
            <Network />
            Student (0 - 2 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Junior"
          >
            <Network1 />
            Junior (2 - 3 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Medior"
          >
            <Network2 />
            Medior (3 - 5 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Senior"
          >
            <Network3 />
            Senior (5 - 10 years)
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Guru"
          >
            <Network4 />
            Guru (10+ years)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DeletePhaseDialog = ({
  onOpenChange,
  open,
  onDeletePhase,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDeletePhase: () => void
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Delete this phase</DialogTitle>
          <DialogDescription>
            This phase will be deleted permanently. You will not be able to
            recover it.
          </DialogDescription>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button
              onClick={() => {
                onDeletePhase()
                toggleIsOpen(false)
              }}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const MoreDropdown = (props: {
  openDeletePhaseDialog: () => void
  openPhaseDialog: () => void
  onChangeDuration: () => void
  onInsertBelow: () => void
  onInsertAbove: () => void
  onDuplicatePhase: () => void
  onSwapPhases: (to: number) => void
  phaseType?: PhaseType
}) => {
  const {
    openDeletePhaseDialog,
    openPhaseDialog,
    onChangeDuration,
    onInsertAbove,
    onInsertBelow,
    onDuplicatePhase,
    onSwapPhases: onSwapPhasesProp,
    phaseType,
  } = props
  // Setup and Ongoing are position-locked singletons (docs: whole table.png).
  const locked = phaseType === "setup" || phaseType === "ongoing"
  const arrayNavigator = useArrayNavigationContext()
  const selectedIndex = arrayNavigator?.selectedIndex

  const onSwapPhases = useCallbackRef(onSwapPhasesProp)

  useUpdateEffect(() => {
    if (selectedIndex !== undefined) {
      onSwapPhases(selectedIndex)
    }
  }, [onSwapPhases, selectedIndex])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-[23px] px-1.5 py-1 text-gray-500"
          variant="ghost"
          visual="gray"
        >
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={locked || !arrayNavigator?.canMoveLeft}
          onSelect={arrayNavigator?.moveToLeft}
        >
          <ArrowUp className="h-4 w-4" /> Move Up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={locked || !arrayNavigator?.canMoveRight}
          onSelect={arrayNavigator?.moveToRight}
        >
          <ArrowDown className="h-4 w-4" /> Move Down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={locked} onClick={onDuplicatePhase}>
          <Copy className="h-4 w-4" /> Duplicate Phase
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onInsertAbove}>
          <ArrowUpLeft className="h-4 w-4" /> Insert Phase Above
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onInsertBelow}>
          <ArrowDownLeft className="h-4 w-4" /> Insert Phase Below
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openPhaseDialog}>
          <Type className="h-4 w-4" /> Rename Phase
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onChangeDuration}>
          <Clock className="h-4 w-4" /> Change Duration
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem visual="destructive" onSelect={openDeletePhaseDialog}>
          <Trash2 className="h-4 w-4" /> Delete Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PlusDropdown = ({
  addPhase,
  addTask,
}: {
  addTask: () => void
  addPhase: () => void
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton className="text-gray-500" variant="outlined" visual="gray">
          <Plus className="size-3" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto" align="end">
        <DropdownMenuItem onSelect={addTask}>
          <Plus className="size-4" /> Add Task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={addPhase}>
          <Plus className="h-4 w-4" /> Add Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Array Navigator ────────────────────────────────────────────────────

const useArrayNavigator = <T,>(items: T[], itemIndex: number) => {
  const [selectedIndex, setSelectedIndex] = useState(itemIndex)

  const canMoveLeft = itemIndex > 0
  const canMoveRight = itemIndex < items.length - 1

  const moveToLeft = useCallback(() => {
    if (canMoveLeft) {
      setSelectedIndex((prev) => prev - 1)
    }
  }, [canMoveLeft])

  const moveToRight = useCallback(() => {
    if (canMoveRight) {
      setSelectedIndex((prev) => prev + 1)
    }
  }, [canMoveRight])

  return useMemo(
    () => ({
      moveToRight,
      moveToLeft,
      canMoveLeft,
      canMoveRight,
      selectedIndex,
    }),
    [moveToRight, moveToLeft, canMoveLeft, canMoveRight, selectedIndex]
  )
}

const [ArrayNavigatorProvider, useArrayNavigationContext] = createStrictContext<
  ReturnType<typeof useArrayNavigator>
>({
  displayName: "ArrayNavigatorContext",
  errorMessage: `useArrayNavigatorContext returned is 'undefined'. Seems you forgot to wrap the components in "<ArrayNavigator />"`,
})

const ArrayNavigator = ({
  children,
  value,
  index,
}: {
  children?: React.ReactNode
  value: { phaseName?: string; rows?: PhaseRow[] }[]
  index: number
}) => {
  const arrayNavigation = useArrayNavigator(value, index)
  return (
    <ArrayNavigatorProvider value={arrayNavigation}>
      {children}
    </ArrayNavigatorProvider>
  )
}

// ─── Table components ───────────────────────────────────────────────────

interface PhaseTableRowProps {
  row: Row<PhaseRow>
}

const PhaseTableRow = ({ row }: PhaseTableRowProps) => {
  const { transform, transition, setNodeRef, isDragging, isOver } = useSortable(
    {
      id: row.original.id,
    }
  )

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform), //let dnd-kit do its thing
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  }

  return (
    <TableRow
      className={cn(
        "group/row hover:bg-transparent relative",
        isOver &&
          "after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary-500"
      )}
      ref={setNodeRef}
      style={style}
    >
      {row.getVisibleCells().map((cell) => (
        <Fragment key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </Fragment>
      ))}
    </TableRow>
  )
}

const RowDragHandleCell = ({ rowId }: { rowId: string }) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  })
  return (
    <button
      className="focus-visible:outline-none transition duration-300 group-hover/row:opacity-100 opacity-0 text-gray-900/50 hover:text-gray-900"
      {...attributes}
      {...listeners}
    >
      <GripVertical2 />
    </button>
  )
}

// ─── Role Picker (team member or vacant role) ───────────────────────────

const WORK_SCHEDULES = ["Full-time", "Part-time", "Custom"] as const
const CUSTOM_PERIODS = [
  "per day",
  "per week",
  "per month",
  "per quarter",
] as const

export function AddRoleDialog({
  open,
  onOpenChange,
  roles,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: string[]
  onDone: (
    role: string,
    schedule: string,
    customHours?: number,
    customPeriod?: string
  ) => void
}) {
  const [roleValue, setRoleValue] = useState("")
  const [roleSearch, setRoleSearch] = useState("")
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [schedule, setSchedule] = useState("")
  const [customHours, setCustomHours] = useState<number>(15)
  const [customPeriod, setCustomPeriod] = useState("per week")

  const lowerSearch = roleSearch.toLowerCase()
  const filteredRoles = roles.filter((r) =>
    r.toLowerCase().includes(lowerSearch)
  )

  const handleDone = () => {
    if (!roleValue || !schedule) return
    const scheduleKey =
      schedule === "Full-time"
        ? "full_time"
        : schedule === "Part-time"
          ? "part_time"
          : "custom"
    onDone(
      roleValue,
      scheduleKey,
      schedule === "Custom" ? customHours : undefined,
      schedule === "Custom" ? customPeriod : undefined
    )
    // Reset
    setRoleValue("")
    setRoleSearch("")
    setSchedule("")
    setCustomHours(15)
    setCustomPeriod("per week")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-6 gap-0">
        <div>
          <Label className="text-sm font-medium text-gray-700">Role</Label>
          <div className="mt-1.5 relative">
            <Input
              placeholder="Enter role"
              value={roleValue}
              onChange={(e) => {
                setRoleValue(e.target.value)
                setRoleSearch(e.target.value)
                setRoleDropdownOpen(true)
              }}
              onFocus={() => setRoleDropdownOpen(true)}
            />
            {roleDropdownOpen &&
              roleSearch.length > 0 &&
              filteredRoles.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)] overflow-hidden">
                  <div className="flex items-center border-b border-gray-200 pl-3 px-2.5">
                    <input
                      className="flex h-8 w-full bg-transparent focus:ring-0 p-0 border-0 text-sm focus-visible:outline-none outline-none text-gray-900 placeholder:text-gray-500"
                      placeholder="Search"
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                    />
                    <SearchMd className="size-3.5 shrink-0 text-gray-400" />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 py-1">
                    {filteredRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition duration-150 cursor-pointer",
                          role === roleValue
                            ? "font-semibold text-gray-900 bg-gray-50"
                            : "text-gray-600"
                        )}
                        onClick={() => {
                          setRoleValue(role)
                          setRoleSearch(role)
                          setRoleDropdownOpen(false)
                        }}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-sm font-medium text-gray-700">
            Work Schedule
          </Label>
          <div className="mt-1.5">
            <Listbox value={schedule} onChange={setSchedule}>
              <ListboxButton
                className="w-full h-[44px]"
                placeholder="Select one"
              />
              <ListboxOptions className="w-full">
                {WORK_SCHEDULES.map((ws) => (
                  <ListboxOption key={ws} value={ws}>
                    {ws}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>
        </div>

        {schedule === "Custom" && (
          <div className="mt-4">
            <Label className="text-sm font-medium text-gray-700">
              Estimated hours
            </Label>
            <div className="mt-1.5 flex items-center gap-x-2">
              <div className="flex items-center gap-x-1.5">
                <Input
                  type="number"
                  min={1}
                  className="w-[60px] text-center"
                  value={customHours}
                  onChange={(e) => setCustomHours(Number(e.target.value) || 0)}
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
              <Listbox value={customPeriod} onChange={setCustomPeriod}>
                <ListboxButton
                  className="h-[44px] min-w-[120px]"
                  placeholder="per week"
                />
                <ListboxOptions>
                  {CUSTOM_PERIODS.map((p) => (
                    <ListboxOption key={p} value={p}>
                      {p}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-x-3">
          <Button
            variant="outlined"
            visual="gray"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!roleValue || !schedule}
            onClick={handleDone}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RolePicker({
  teamMembers,
  roles,
  onSelectMember,
  onSelectRole,
  onAddRole,
}: {
  teamMembers: TeamMember[]
  roles: string[]
  onSelectMember: (member: TeamMember) => void
  onSelectRole: (role: string) => void
  onAddRole: () => void
}) {
  const [search, setSearch] = useState("")
  const lowerSearch = search.toLowerCase()

  const filteredMembers = teamMembers.filter(
    (m) =>
      m.firstName.toLowerCase().includes(lowerSearch) ||
      m.username.toLowerCase().includes(lowerSearch) ||
      m.role.toLowerCase().includes(lowerSearch)
  )

  return (
    <div>
      <div className="flex items-center border-b border-gray-200 pl-3 px-2.5">
        <input
          className="flex h-9 w-full bg-transparent focus:ring-0 p-0 border-0 text-sm focus-visible:outline-none outline-none text-gray-900 placeholder:text-gray-500"
          placeholder="Search team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <SearchMd className="size-4 shrink-0 text-gray-400" />
      </div>
      <div className="max-h-[232px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pt-1">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full flex items-center gap-x-2 px-3 py-2 text-left hover:bg-gray-50 transition duration-150 cursor-pointer"
              onClick={() => onSelectMember(m)}
            >
              <Avatar className="size-6 shrink-0">
                {m.avatarUrl ? (
                  <AvatarImage src={m.avatarUrl} alt={m.firstName} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {m.firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">
                  {m.firstName}
                  <span className="text-gray-400 font-normal ml-0.5">
                    @{m.username}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 truncate leading-tight">
                  {m.role}
                </p>
              </div>
            </button>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            {search ? "No team members found." : "No team members yet."}
          </p>
        )}
      </div>
      <div className="border-t border-gray-100 px-3 py-2">
        <button
          type="button"
          className="text-[13px] font-medium text-dark-blue-400 hover:underline transition duration-150 cursor-pointer"
          onClick={onAddRole}
        >
          + Add Role
        </button>
      </div>
    </div>
  )
}

const columnHelper = createColumnHelper<PhaseRow>()

const columns = [
  columnHelper.accessor("task", {
    cell: ({ row: { id, index, original }, column, table }) => {
      // eslint-disable-next-line
      const [dialogOpen, setDialogOpen] = useState(false)
      // eslint-disable-next-line
      const [draft, setDraft] = useState(original.task)
      // eslint-disable-next-line
      const inputRef = useRef<HTMLInputElement>(null)

      // eslint-disable-next-line
      useEffect(() => {
        if (dialogOpen) {
          setDraft(original.task)
          setTimeout(() => inputRef.current?.focus(), 0)
        }
      }, [dialogOpen, original.task])

      const commit = () => {
        const trimmed = draft.trim()
        if (trimmed && trimmed !== original.task) {
          table.options.meta?.updateData(index, column.id, trimmed)
        }
        setDialogOpen(false)
      }

      return (
        <TableCell className="py-4 px-6 max-w-[220px]">
          <span className="inline-flex items-center gap-x-1.5 max-w-full">
            <RowDragHandleCell rowId={id} />
            <button
              type="button"
              className="text-sm font-semibold text-gray-900 truncate text-left hover:underline hover:decoration-gray-300 focus-visible:outline-none"
              onClick={() => setDialogOpen(true)}
            >
              {original.task}
            </button>
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Edit Task Name
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-y-1.5 pt-2">
                <Label size="sm" className="text-gray-700">
                  Task Name
                </Label>
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commit()
                    }
                  }}
                  placeholder="Enter task name"
                />
              </div>
              <DialogFooter className="gap-x-3 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outlined" visual="gray">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={commit}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TableCell>
      )
    },
    header: "Task Name",
  }),
  columnHelper.accessor("role", {
    cell: ({ row: { index, original }, column: { id }, table }) => {
      const value = original.role ?? ""
      const member = original.assignedMember ?? null
      // eslint-disable-next-line
      const [popoverOpen, setPopoverOpen] = useState(false)
      // eslint-disable-next-line
      const [addRoleOpen, setAddRoleOpen] = useState(false)

      const teamMembers = table.options.meta?.teamMembers ?? []
      const allRoles = table.options.meta?.roles ?? []

      const handleSelectMember = (tm: TeamMember) => {
        table.options.meta?.batchUpdateData?.(index, {
          role: tm.role,
          assignedMember: tm,
          location: tm.location ?? "",
        })
        setPopoverOpen(false)
      }

      const handleSelectVacantRole = (role: string) => {
        table.options.meta?.batchUpdateData?.(index, {
          role,
          assignedMember: null,
          location: "",
          experience: "",
        })
        setPopoverOpen(false)
      }

      const handleAddRole = () => {
        setPopoverOpen(false)
        setAddRoleOpen(true)
      }

      const handleAddRoleDone = (
        role: string,
        schedule: string,
        customHours?: number,
        customPeriod?: string
      ) => {
        table.options.meta?.batchUpdateData?.(index, {
          role,
          assignedMember: null,
          location: "",
          experience: "",
          workSchedule: schedule,
          ...(customHours != null ? { customHours, customPeriod } : {}),
        })
      }

      // eslint-disable-next-line
      const taskCostCents = member
        ? calculateTaskCost(
            member,
            original.duration.value,
            original.duration.type
          )
        : null

      const pickerPopover = (
        <>
          <PopoverContent className="w-[220px] pb-2 px-0 pt-0 z-50 bg-white border-gray-100 rounded-lg border shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
            <RolePicker
              teamMembers={teamMembers}
              roles={allRoles}
              onSelectMember={handleSelectMember}
              onSelectRole={handleSelectVacantRole}
              onAddRole={handleAddRole}
            />
          </PopoverContent>
          <AddRoleDialog
            open={addRoleOpen}
            onOpenChange={setAddRoleOpen}
            roles={allRoles}
            onDone={handleAddRoleDone}
          />
        </>
      )

      if (member) {
        return (
          <TableCell className="py-4 px-3">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="focus-visible:outline-none inline-flex items-center gap-x-2 max-w-full transition duration-300 hover:bg-gray-50 rounded-md px-1.5 py-1 -mx-1.5 -my-1">
                  <Avatar className="size-6 shrink-0">
                    {member.avatarUrl ? (
                      <AvatarImage
                        src={member.avatarUrl}
                        alt={member.firstName}
                      />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {member.firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                      {member.firstName}
                      <span className="text-gray-400 font-normal ml-0.5">
                        @{member.username}...
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate leading-tight">
                      {member.role}
                    </p>
                  </div>
                </button>
              </PopoverTrigger>
              {pickerPopover}
            </Popover>
          </TableCell>
        )
      }

      return (
        <TableCell className="py-4 px-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "focus-visible:outline-none transition duration-300 border border-transparent hover:border-gray-300 h-7 px-[8px] rounded-[5px] border-dashed hover:bg-gray-100 shrink-0 text-sm leading-[16.94px] truncate whitespace-nowrap max-w-full",
                  value ? "text-gray-600" : "text-gray-400"
                )}
              >
                <span className="block truncate">{value || "Add Role"}</span>
              </button>
            </PopoverTrigger>
            {pickerPopover}
          </Popover>
        </TableCell>
      )
    },
    header: "Team Member",
  }),
  columnHelper.accessor("location", {
    cell: ({ row: { index, original }, column: { id }, table }) => {
      const assigned = original.assignedMember
      const currentValue = original.location ?? ""
      if (assigned) {
        const country = countryFromLocation(original.location)
        const flagUrl = country ? getStaticFlagUrl(country) : null
        return (
          <TableCell className="px-3 py-4">
            <span className="inline-flex items-center gap-x-1.5 px-2 py-[5px] border border-gray-300 rounded-[5px] bg-white text-xs leading-[18px] font-medium text-gray-700 cursor-default">
              {flagUrl && (
                <span className="inline-flex items-center justify-center w-[18px] h-[14px] shrink-0 rounded-sm overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src={flagUrl}
                    alt={country}
                  />
                </span>
              )}
              {country || "—"}
            </span>
          </TableCell>
        )
      }

      // PMCM-257: location is required per task, but only enforceable
      // here — the TaskDialog that creates the row has no location input
      // at all (location is set afterward, in this column). Assigned
      // rows take the assignee's own country (the branch above), so this
      // only ever applies to an unassigned row.
      const isMissing = !currentValue.trim()
      return (
        <TableCell className="px-3 py-4">
          <CountriesCombobox
            placeholder="Location"
            value={currentValue}
            triggerClassName={isMissing ? "border-error-500" : undefined}
            onValueChange={(v) => {
              table.options.meta?.updateData(index, id, v)
            }}
          />
          {isMissing && (
            <ErrorMessage size="sm" className="mt-1">
              Please select a location
            </ErrorMessage>
          )}
        </TableCell>
      )
    },
    header: "Location",
  }),
  columnHelper.accessor("experience", {
    cell: ({ row: { index, original }, column: { id }, table }) => {
      const assigned = original.assignedMember
      const currentValue = (original.experience ?? "") as ExperienceLevel | ""

      if (assigned) {
        return (
          <TableCell className="py-4 px-6">
            <span className="inline-flex items-center px-2 py-[5px] border border-gray-300 rounded-[5px] bg-white text-xs leading-[18px] font-medium text-gray-700 cursor-default">
              {original.experience || "—"}
            </span>
          </TableCell>
        )
      }

      return (
        <TableCell className="py-4 px-6">
          <Dropdown
            placeholder="Experience"
            value={currentValue || undefined}
            onValueChange={(nextValue) => {
              if (!nextValue) return
              table.options.meta?.updateData(index, id, nextValue)
            }}
          />
        </TableCell>
      )
    },
    header: "Experience",
  }),
  columnHelper.accessor("duration", {
    cell: ({ getValue, table, row: { index } }) => (
      <TableCell className="py-4 px-6">
        <button
          className="focus-visible:outline-none"
          type="button"
          onClick={() => table.options.meta?.openDurationDialog(index)}
        >
          {getValue().value}{" "}
          {formatDurationUnit(getValue().value, getValue().type)}
        </button>
      </TableCell>
    ),
    header: "Duration",
  }),
]

interface PhaseTableProps {
  rows: PhaseRow[]
  onRowsChange: (rows: PhaseRow[]) => void
  openDurationDialog: (index: number) => void
  teamMembers: TeamMember[]
}

const PhaseTable = ({
  rows,
  onRowsChange,
  openDurationDialog,
  teamMembers,
}: PhaseTableProps) => {
  const [data, setData] = useControllableState({
    value: rows,
    onChange: onRowsChange,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
    meta: {
      updateData: (rowIndex, columnId, value) => {
        setData((prev) =>
          prev.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              }
            }
            return row
          })
        )
      },
      batchUpdateData: (rowIndex, updates) => {
        setData((prev) =>
          prev.map((row, index) => {
            if (index === rowIndex) {
              return { ...row, ...updates }
            }
            return row
          })
        )
      },
      openDurationDialog,
      roles: ROLES,
      teamMembers,
    },
  })

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data]
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <Table>
        <TableHeader className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={
                    header.column.id === "task"
                      ? "pl-[44px] text-left"
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <SortableContext
            items={dataIds}
            strategy={verticalListSortingStrategy}
          >
            {table.getRowModel().rows.map((row) => (
              <PhaseTableRow key={row.id} row={row} />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}

// ─── Duration Dialog ────────────────────────────────────────────────────

const DurationDialog = ({
  open,
  durationFormValues,
  onDurationFormValuesChange,
  onOpenChange,
}: DurationDialogProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DurationFormValues>({
    resolver: zodResolver(durationFormSchema),
    defaultValues: durationFormValues || {
      duration: { value: 1, type: "days" },
    },
    values: durationFormValues,
  })
  const selectedDurationValue = useWatch({
    control,
    name: "duration.value",
    defaultValue: 1,
  })

  React.useEffect(() => {
    if (open && durationFormValues) {
      reset(durationFormValues)
    }
  }, [open, durationFormValues, reset])

  const onSubmit = (data: DurationFormValues) => {
    onDurationFormValuesChange(data)
    onOpenChange(false)
  }

  const durationTypes = ["hours", "days", "weeks", "months"] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Edit Duration
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Set the time estimate for this task.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-y-5 pt-2"
        >
          <div className="flex flex-col gap-y-1.5">
            <Label size="sm" className="text-gray-700">
              Duration
            </Label>
            <div className="flex items-center gap-x-3">
              <Controller
                name="duration.value"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    className="w-[100px]"
                    placeholder="1"
                    isInvalid={hookFormHasError({
                      errors,
                      name: "duration.value",
                    })}
                  />
                )}
              />
              <Controller
                name="duration.type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatDurationUnit(
                            Number(selectedDurationValue) || 0,
                            type
                          ).replace(/^./, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {hookFormHasError({ errors, name: "duration.value" }) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message")}
              </ErrorMessage>
            )}
          </div>
          <DialogFooter className="gap-x-3">
            <DialogClose asChild>
              <Button type="button" variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ScopeBuilder component ────────────────────────────────────────

export type ScopeType = "project" | "service"

export interface ScopeBuilderProps {
  phases?: Phase[]
  onPhasesChange?: (phases: Phase[]) => void
  /** When true, renders without the ScrollArea wrapper and tip sidebar (for embedding in other pages) */
  embedded?: boolean
  /** Current scope type — defaults to "project" */
  scopeType?: ScopeType
  /** Called when the user confirms switching scope type */
  onScopeTypeChange?: (type: ScopeType) => void
  /** Team members available for task assignment */
  teamMembers?: TeamMember[]
}

export function ScopeBuilder({
  phases: initialPhases,
  onPhasesChange,
  embedded,
  scopeType = "project",
  onScopeTypeChange,
  teamMembers = [],
}: ScopeBuilderProps) {
  const { toast } = useToast()
  const lastUndo = useRef<null | (() => void)>(null)
  const [taskDialogState, setTaskDialogState] = useState<TaskDialogState>({
    editingPhaseIndex: null,
    open: false,
  })
  const [durationDialogState, setDurationDialogState] =
    useState<DurationDialogState>({
      editingPhaseIndex: null,
      editingPhaseRowIndex: null,
      open: false,
    })
  const [phaseDialogState, dispatch] = useReducer(
    phaseNameDialogReducer,
    defaultPhaseNameDialogState
  )
  const [scopeTypeDropdownOpen, setScopeTypeDropdownOpen] = useState(false)
  const [scopeTypeConfirmOpen, setScopeTypeConfirmOpen] = useState(false)
  const [scopeTypeLearnMoreOpen, setScopeTypeLearnMoreOpen] = useState(false)
  const [pendingScopeType, setPendingScopeType] = useState<ScopeType | null>(
    null
  )
  const [accordionState, setAccordionState] = useState(["item-0"])
  // PMCM-257: this input previously had no value/onChange at all — a
  // static placeholder with nothing wired up. getPhaseSearchTargetId/
  // getTaskSearchTargetId below are unused dead code (confirmed via
  // grep — no call sites), so there's no existing scroll-to-target
  // behavior this filter could break.
  const [phaseSearchQuery, setPhaseSearchQuery] = useState("")

  // Local state for phases — replaces useProjectScopeContext
  const [phases, setPhases] = useControllableState<Phase[]>({
    // PMCM-257 follow-up 2: a fresh/empty Service scope must start typed
    // ("Setup", not "Phase One") — this only matters when `initialPhases`
    // is undefined/empty (uncontrolled fallback); once a real scope
    // exists, the normalization effect below handles any untyped phase.
    defaultValue:
      initialPhases ??
      (scopeType === "service"
        ? [{ phaseName: "", phaseType: "setup" }]
        : [{ phaseName: "" }]),
    value: initialPhases,
    onChange: (value) => {
      onPhasesChange?.(value)
    },
  })

  // PMCM-257 follow-up 2: Service scope must never have an untyped phase
  // (the header falls back to "Phase One" otherwise) — this catches an
  // older service draft saved before phaseType was required, or a scope
  // hydrated after the type already switched. Runs once per untyped
  // scope: after normalizing, every phase has a phaseType, so the guard
  // condition is false on the next run and this does not loop.
  useEffect(() => {
    if (scopeType !== "service") return
    if (phases.some((phase) => !phase.phaseType)) {
      setPhases(ensureServicePhaseTypes(phases))
    }
  }, [scopeType, phases, setPhases])

  // Task search dialog state — managed internally
  const [isTaskSearchDialogOpen, setTaskSearchDialogOpen] = useState(false)

  const [deletePhaseDialogState, setDeletePhaseDialogState] =
    useState<DeletePhaseDialogState>({
      phaseIndex: null,
      open: false,
    })

  const expandAll = useCallback(() => {
    setAccordionState(phases.map((_, index) => `item-${index}`))
  }, [phases])

  const collapseAll = useCallback(() => {
    setAccordionState([])
  }, [])

  const handleOpenTaskDialog = useCallback(
    (phaseIndex: number) => {
      const { phaseName } = phases[phaseIndex]

      if (!phaseName) {
        dispatch({ type: "EDIT", payload: phaseIndex })
      } else {
        setTaskDialogState({
          open: true,
          editingPhaseIndex: phaseIndex,
        })
      }
    },
    [phases]
  )

  const handleRowsChange = useCallback(
    (phaseIndex: number, rows: PhaseRow[]) => {
      setPhases((prev) =>
        prev.map((phase, index) => {
          if (index === phaseIndex) {
            return {
              ...phase,
              rows,
            }
          }
          return phase
        })
      )
    },
    [setPhases]
  )

  const handleSwapPhases = useCallback(
    (from: number, to: number) => {
      setPhases((prev) => arrayMove(prev, from, to))
    },
    [setPhases]
  )

  const updatePhaseRecurrence = useCallback(
    (index: number, schedule: RecurrenceSchedule, count: number) => {
      setPhases((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, recurrenceSchedule: schedule, recurrenceCount: count }
            : p
        )
      )
    },
    [setPhases]
  )

  // Helper to show success toast with Undo
  const pushSuccess = useCallback(
    (label: string, onUndo?: () => void) => {
      toast({
        variant: "success",
        title: label,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => onUndo?.()}
          >
            Undo
          </ToastAction>
        ),
      })
    },
    [toast]
  )

  const onAddPhaseName = useCallback(
    (rawPhaseName: string, phaseType?: PhaseType) => {
      const trimmedName = rawPhaseName.trim()
      const phaseName = trimmedName
        ? trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)
        : trimmedName
      const { action, editingPhaseIndex, addTo } = phaseDialogState

      if (action === "EDIT" && typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const oldName = prev[editingPhaseIndex]?.phaseName ?? ""
          const nextState = prev.map((item, index) =>
            index === editingPhaseIndex ? { ...item, phaseName } : item
          )

          // prepare undo: restore old name
          lastUndo.current = () =>
            setPhases((s) =>
              s.map((p, i) =>
                i === editingPhaseIndex ? { ...p, phaseName: oldName } : p
              )
            )

          // Toast
          toast({
            variant: "success",
            title: "Phase Renamed",
            action: (
              <ToastAction
                altText="Undo"
                className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                onClick={() => {
                  lastUndo.current?.()
                  lastUndo.current = null
                }}
              >
                Undo
              </ToastAction>
            ),
          })

          return nextState
        })

        return
      }

      // Do the add
      let insertedPhaseIndex = 0
      setPhases((prev) => {
        const next = [...prev]
        const hasTargetPhase =
          typeof editingPhaseIndex === "number" &&
          editingPhaseIndex >= 0 &&
          editingPhaseIndex < next.length

        if (phaseType) {
          // Service ordering: Setup first, Ongoing last, Recurring before Ongoing.
          const ongoingIdx = next.findIndex((p) => p.phaseType === "ongoing")
          insertedPhaseIndex =
            phaseType === "setup"
              ? 0
              : phaseType === "ongoing"
                ? next.length
                : ongoingIdx >= 0
                  ? ongoingIdx
                  : next.length
        } else {
          insertedPhaseIndex =
            addTo === "start" && hasTargetPhase
              ? editingPhaseIndex
              : addTo === "below" && hasTargetPhase
                ? editingPhaseIndex + 1
                : next.length
        }

        next.splice(
          insertedPhaseIndex,
          0,
          phaseType === "recurring"
            ? {
                phaseName,
                phaseType,
                // Sensible defaults so the scope stays valid/saveable until
                // the seller edits the "Recurs" chip.
                recurrenceSchedule: "monthly",
                recurrenceCount: 1,
              }
            : phaseType
              ? { phaseName, phaseType }
              : { phaseName }
        )
        return next
      })

      // Expand all phases so the newly added one is visible
      expandAll()

      // Prepare Undo for this action
      lastUndo.current = () =>
        setPhases((prev) =>
          prev.filter((_, index) => index !== insertedPhaseIndex)
        )

      // Toast
      const phaseAddedTitle =
        addTo === "start"
          ? "Phase Added Above"
          : addTo === "below"
            ? "Phase Added Below"
            : "Phase Added"

      toast({
        variant: "success",
        title: phaseAddedTitle,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => {
              lastUndo.current?.()
              lastUndo.current = null // clear after use
            }}
          >
            Undo
          </ToastAction>
        ),
      })
    },
    [phaseDialogState, setPhases, toast]
  )

  const onAddTask = useCallback(
    (values: TaskFormValues) => {
      const { editingPhaseIndex } = taskDialogState

      if (typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const newPhases = prev.map((phase, index) => {
            if (index === editingPhaseIndex) {
              const newRow = { ...values, id: `${getId()}` }
              const { rows } = phase

              return {
                ...phase,
                rows: rows ? [...rows, newRow] : [newRow],
              }
            }
            return phase
          })

          return newPhases
        })
      }
    },
    [taskDialogState, setPhases]
  )

  const onDurationFormValuesChange = useCallback(
    (durationFormValues: DurationFormValues) => {
      const { editingPhaseIndex: pIdx, editingPhaseRowIndex: rIdx } =
        durationDialogState
      if (typeof pIdx !== "number" || typeof rIdx !== "number") return

      // we'll detect if anything actually changed, capture a snapshot for Undo,
      // then show the toast.
      let didChange = false
      let oldRowSnapshot: any = null

      setPhases((prev) => {
        const phase = prev[pIdx]
        const rows = phase?.rows ?? []
        const oldRow = rows[rIdx] ?? {}

        // shallow-compare only keys present in durationFormValues
        didChange = Object.keys(durationFormValues).some(
          (k) => (oldRow as any)?.[k] !== (durationFormValues as any)[k]
        )
        if (!didChange) return prev

        oldRowSnapshot = oldRow

        const newRows = rows.map((row, i) =>
          i === rIdx ? { ...row, ...durationFormValues } : row
        )
        const newPhases = prev.map((ph, i) =>
          i === pIdx ? { ...ph, rows: newRows } : ph
        )

        // prepare Undo: restore the old row snapshot
        lastUndo.current = () =>
          setPhases((s) => {
            const sPhase = s[pIdx]
            const sRows = (sPhase?.rows ?? []).slice()
            sRows[rIdx] = oldRowSnapshot
            const out = s.slice()
            out[pIdx] = { ...sPhase, rows: sRows }
            return out
          })

        return newPhases
      })

      if (didChange) {
        toast({
          variant: "success",
          title: "Duration Changed",
          action: (
            <ToastAction
              altText="Undo"
              className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
              onClick={() => {
                lastUndo.current?.()
                lastUndo.current = null
              }}
            >
              Undo
            </ToastAction>
          ),
        })
      }
    },
    [durationDialogState, setPhases, toast]
  )

  const durationFormValues = useMemo(() => {
    const { editingPhaseIndex, editingPhaseRowIndex } = durationDialogState
    if (
      typeof editingPhaseIndex === "number" &&
      typeof editingPhaseRowIndex === "number"
    ) {
      const { rows } = phases[editingPhaseIndex]
      const { duration } = (rows ?? [])[editingPhaseRowIndex]

      return {
        duration: { ...duration },
      }
    }
  }, [durationDialogState, phases])

  const onDeletePhase = useCallback(
    (id: string) => {
      setPhases((prev) => {
        const idx = prev.findIndex(
          (p, i) => String(i) === id || (p as any).id === id
        )
        if (idx < 0) return prev
        const removed = prev[idx]

        // prepare undo: reinsert at same index
        lastUndo.current = () =>
          setPhases((s) => {
            const next = [...s]
            next.splice(idx, 0, removed)
            return next
          })

        // do delete
        const next = [...prev]
        next.splice(idx, 0) // no-op to satisfy TS if needed
        return prev.filter((_, i) => i !== idx)
      })

      pushSuccess("Phase Deleted", lastUndo.current || undefined)
      lastUndo.current = null
    },
    [pushSuccess, setPhases]
  )

  const handleOpenDeletePhaseDialog = useCallback((phaseIndex: number) => {
    setDeletePhaseDialogState({
      phaseIndex,
      open: true,
    })
  }, [])

  const handleOpenPhaseDurationDialog = useCallback(
    (phaseIndex: number) => {
      const rows = phases[phaseIndex]?.rows ?? []
      if (!rows.length) {
        toast({
          title: "Please add at least 1 task before changing duration",
          variant: "destructive",
        })
        return
      }
      setDurationDialogState({
        editingPhaseIndex: phaseIndex,
        editingPhaseRowIndex: 0,
        open: true,
      })
    },
    [phases, toast]
  )

  const onDuplicatePhase = useCallback(
    (idx: number) => {
      setPhases((prev) => {
        const source = prev[idx]
        if (!source) return prev
        const dup = { ...source } // add new id if you have ids
        const next = [...prev]
        next.splice(idx + 1, 0, dup)

        // undo: remove the new duplicate at idx+1
        lastUndo.current = () =>
          setPhases((s) => s.filter((_, i) => i !== idx + 1))

        return next
      })

      pushSuccess("Phase Duplicated", lastUndo.current || undefined)
      lastUndo.current = null
    },
    [pushSuccess, setPhases]
  )

  const currentPhaseName =
    phaseDialogState.action === "EDIT" &&
    typeof phaseDialogState.editingPhaseIndex === "number"
      ? (phases[phaseDialogState.editingPhaseIndex]?.phaseName ?? "")
      : ""

  const coreContent = (
    <div className="space-y-6 flex-auto min-w-0">
      <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
        <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
          {scopeType === "service" ? "Service" : "Project"} Scope
        </h1>

        <div className="flex items-center md:gap-x-3">
          <DropdownMenu
            open={scopeTypeDropdownOpen}
            onOpenChange={setScopeTypeDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outlined" visual="gray">
                <RefreshCcw05 className="size-[15px]" />
                {scopeType === "service" ? "Service" : "Project"}
                <ChevronDown className="size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
              <DropdownMenuItem
                className="flex flex-col items-start gap-y-0.5 py-2.5 px-3"
                onClick={() => {
                  if (scopeType !== "project") {
                    setPendingScopeType("project")
                    setScopeTypeConfirmOpen(true)
                  }
                  setScopeTypeDropdownOpen(false)
                }}
              >
                <div className="flex items-center gap-x-2 w-full">
                  {scopeType === "project" && (
                    <Check className="size-4 text-primary-500 shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-gray-900">
                    Project{scopeType === "project" ? " (current)" : ""}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-6">
                  One-time job with a defined duration
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex flex-col items-start gap-y-0.5 py-2.5 px-3"
                onClick={() => {
                  if (scopeType !== "service") {
                    setPendingScopeType("service")
                    setScopeTypeConfirmOpen(true)
                  }
                  setScopeTypeDropdownOpen(false)
                }}
              >
                <div className="flex items-center gap-x-2 w-full">
                  {scopeType === "service" && (
                    <Check className="size-4 text-primary-500 shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-gray-900">
                    Service{scopeType === "service" ? " (current)" : ""}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-6">
                  Recurring work with consistent needs
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="border-r-0 rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    size="md"
                    onClick={expandAll}
                  >
                    <ChevronsDown className="size-[15px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Expand All</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    size="md"
                    onClick={collapseAll}
                  >
                    <ChevronsUp className="size-[15px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse All</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button
            className="border-l-0 rounded-l-none md:border-l md:rounded-l-[5px]"
            variant="outlined"
            visual="gray"
            onClick={() => dispatch({ type: "TOGGLE" })}
          >
            <Plus className="size-[15px]" /> Add Phase
          </Button>
        </div>
      </div>

      {/* Scope type change confirmation dialog. Width: Figma specs 409px;
          max-w-sm (384px) is the nearest standard Tailwind class — no
          arbitrary value added. */}
      <Dialog
        open={scopeTypeConfirmOpen}
        onOpenChange={setScopeTypeConfirmOpen}
      >
        <DialogContent className="max-w-sm p-0">
          <div className="p-6 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-dark-blue-400">
              Change to{" "}
              {pendingScopeType === "service" ? "Service" : "Project"}?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm font-light text-dark-blue-400">
              {pendingScopeType === "service"
                ? "This action will modify the entire project scope. You'll need to manually update the service plan details, including time intervals for each phase and other related settings. You can undo this at anytime."
                : "This action will modify the entire service scope. You'll need to manually update the project plan details, including the duration of each phase and other related settings. You can undo this at anytime."}
            </DialogDescription>
            <Dialog
              open={scopeTypeLearnMoreOpen}
              onOpenChange={setScopeTypeLearnMoreOpen}
            >
              <DialogTrigger asChild>
                {/* visual="gray" variant="link" already gives
                    text-gray-500, and size defaults to "sm" (text-sm) —
                    only font-semibold/underline(persistent)/capitalize
                    aren't covered by the variant. */}
                <Button
                  type="button"
                  variant="link"
                  visual="gray"
                  className="mt-3 font-semibold underline capitalize"
                >
                  Learn More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[560px]">
                <ProjectScopeTipVideo />
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-gray-25 px-6 py-4 rounded-b-xl flex items-center justify-between">
            <DialogClose asChild>
              <Button
                className="opacity-50 hover:opacity-100"
                variant="link"
                visual="gray"
                onClick={() => setPendingScopeType(null)}
              >
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button
              variant="outlined"
              visual="gray"
              onClick={() => {
                const previousType = scopeType
                // PMCM-257 follow-up: previously cleared the scope on
                // switch (setPhases([{ phaseName: "" }])) — per product
                // direction this now converts and preserves phaseName/
                // rows/order instead (convertPhasesForScopeType). Undo
                // still restores the exact previous phases (not the
                // converted ones) and the exact previous type.
                const previousPhases = phases
                if (pendingScopeType) {
                  setPhases(
                    convertPhasesForScopeType(phases, pendingScopeType)
                  )
                  onScopeTypeChange?.(pendingScopeType)
                  toast({
                    variant: "success",
                    title: `Your ${previousType} has been changed to a ${pendingScopeType}`,
                    action: (
                      <ToastAction
                        altText="Undo"
                        className="ml-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                        onClick={() => {
                          setPhases(previousPhases)
                          onScopeTypeChange?.(previousType)
                        }}
                      >
                        Undo
                      </ToastAction>
                    ),
                  })
                }
                setPendingScopeType(null)
                setScopeTypeConfirmOpen(false)
              }}
            >
              Yes, Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InputGroup>
        <Input
          type="text"
          placeholder="Find a phase or task"
          value={phaseSearchQuery}
          onChange={(event) => setPhaseSearchQuery(event.target.value)}
        />
        <InputLeftElement>
          <SearchMd className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
      </InputGroup>

      {(() => {
        const normalizedQuery = normalizeSearchText(phaseSearchQuery)
        const hasVisiblePhase = phases.some((phase) =>
          matchesPhaseSearch(phase, normalizedQuery)
        )
        if (normalizedQuery && !hasVisiblePhase) {
          return (
            <p className="py-6 text-center text-sm text-gray-500">
              No phases found
            </p>
          )
        }
        return (
          <Accordion
            value={accordionState}
            onValueChange={setAccordionState}
            type="multiple"
            className="flex-auto space-y-3"
          >
            {phases.map(({ phaseName, rows, phaseType }, index) => {
              if (
                !matchesPhaseSearch({ phaseName, rows, phaseType }, normalizedQuery)
              ) {
                return null
              }
              return (
          <ArrayNavigator key={index} value={phases} index={index}>
            {rows ? (
              <AccordionItem value={`item-${index}`} asChild>
                <div className="rounded-lg border border-gray-200 shadow-sm">
                  <div
                    className="mb-3 flex items-center gap-x-4 px-3 pt-3 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (
                        target.closest(
                          "button, a, [role='menuitem'], [data-radix-collection-item]"
                        )
                      )
                        return
                      const key = `item-${index}`
                      setAccordionState((prev) =>
                        prev.includes(key)
                          ? prev.filter((v) => v !== key)
                          : [...prev, key]
                      )
                    }}
                  >
                    <div className="flex flex-auto min-w-0 gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                      <div className="inline-flex items-center gap-x-3.5 min-w-0">
                        <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />

                        <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900 min-w-0 truncate">
                          {phaseType
                            ? PHASE_TYPE_TITLE[phaseType]
                            : `Phase ${numberToWord(index)}`}{" "}
                          {phaseName ? (
                            <button
                              type="button"
                              className="font-light hover:underline focus-visible:outline-none"
                              onClick={() =>
                                dispatch({
                                  type: "EDIT",
                                  payload: index,
                                })
                              }
                            >
                              {phaseName}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="font-light hover:underline focus-visible:outline-none inline-flex items-center gap-x-2"
                              onClick={() =>
                                dispatch({
                                  type: "EDIT",
                                  payload: index,
                                })
                              }
                            >
                              <Edit03 className="size-[15px] text-dark-blue-400" />
                              <span className="text-sm leading-5 font-semibold text-dark-blue-400">
                                Edit Phase Name
                              </span>
                            </button>
                          )}
                        </span>
                      </div>

                      <div className="inline-flex items-center justify-start gap-x-2 pl-10 md:pl-0 shrink-0">
                        <PhaseHeaderMeta
                          phases={phases}
                          index={index}
                          onRecurrenceChange={(s, c) =>
                            updatePhaseRecurrence(index, s, c)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-x-4 items-center shrink-0">
                      <MoreDropdown
                        onSwapPhases={(to) => handleSwapPhases(index, to)}
                        phaseType={phaseType}
                        openPhaseDialog={() =>
                          dispatch({ type: "EDIT", payload: index })
                        }
                        onChangeDuration={() =>
                          handleOpenPhaseDurationDialog(index)
                        }
                        openDeletePhaseDialog={() =>
                          handleOpenDeletePhaseDialog(index)
                        }
                        onInsertAbove={() =>
                          dispatch({
                            type: "TOGGLE",
                            payload: {
                              addTo: "start",
                              targetPhaseIndex: index,
                            },
                          })
                        }
                        onInsertBelow={() =>
                          dispatch({
                            type: "TOGGLE",
                            payload: {
                              addTo: "below",
                              targetPhaseIndex: index,
                            },
                          })
                        }
                        onDuplicatePhase={() => onDuplicatePhase(index)}
                      />
                      <PlusDropdown
                        addTask={() => handleOpenTaskDialog(index)}
                        addPhase={() => dispatch({ type: "TOGGLE" })}
                      />
                    </div>
                  </div>

                  <DisclosureContent className="overflow-auto">
                    <PhaseTable
                      rows={rows}
                      onRowsChange={(rows) => handleRowsChange(index, rows)}
                      openDurationDialog={(editingPhaseRowIndex) =>
                        setDurationDialogState({
                          editingPhaseIndex: index,
                          editingPhaseRowIndex,
                          open: true,
                        })
                      }
                      teamMembers={teamMembers}
                    />
                  </DisclosureContent>
                </div>
              </AccordionItem>
            ) : (
              <AccordionItem value={`item-${index}`} asChild>
                <div className="rounded-lg border border-gray-200 shadow-sm">
                  <div
                    className="mb-3 flex items-center gap-x-4 px-3 pt-3 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (
                        target.closest(
                          "button, a, [role='menuitem'], [data-radix-collection-item]"
                        )
                      )
                        return
                      const key = `item-${index}`
                      setAccordionState((prev) =>
                        prev.includes(key)
                          ? prev.filter((v) => v !== key)
                          : [...prev, key]
                      )
                    }}
                  >
                    <div className="flex flex-auto min-w-0 gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                      <div className="inline-flex items-center gap-x-3.5 min-w-0">
                        <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />

                        <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900 min-w-0 truncate">
                          {phaseType
                            ? PHASE_TYPE_TITLE[phaseType]
                            : `Phase ${numberToWord(index)}`}{" "}
                          {phaseName ? (
                            <button
                              type="button"
                              className="font-light hover:underline focus-visible:outline-none"
                              onClick={() =>
                                dispatch({
                                  type: "EDIT",
                                  payload: index,
                                })
                              }
                            >
                              {phaseName}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="font-light hover:underline focus-visible:outline-none inline-flex items-center gap-x-2"
                              onClick={() =>
                                dispatch({
                                  type: "EDIT",
                                  payload: index,
                                })
                              }
                            >
                              <Edit03 className="size-[15px] text-dark-blue-400" />
                              <span className="text-sm leading-5 font-semibold text-dark-blue-400">
                                Edit Phase Name
                              </span>
                            </button>
                          )}
                        </span>
                      </div>

                      <div className="inline-flex items-center justify-start gap-x-2 pl-10 md:pl-0 shrink-0">
                        <PhaseHeaderMeta
                          phases={phases}
                          index={index}
                          onRecurrenceChange={(s, c) =>
                            updatePhaseRecurrence(index, s, c)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-x-4 items-center shrink-0">
                      <MoreDropdown
                        onSwapPhases={(to) => handleSwapPhases(index, to)}
                        phaseType={phaseType}
                        openPhaseDialog={() =>
                          dispatch({ type: "EDIT", payload: index })
                        }
                        onChangeDuration={() =>
                          handleOpenPhaseDurationDialog(index)
                        }
                        openDeletePhaseDialog={() =>
                          handleOpenDeletePhaseDialog(index)
                        }
                        onInsertAbove={() =>
                          dispatch({
                            type: "TOGGLE",
                            payload: {
                              addTo: "start",
                              targetPhaseIndex: index,
                            },
                          })
                        }
                        onInsertBelow={() =>
                          dispatch({
                            type: "TOGGLE",
                            payload: {
                              addTo: "below",
                              targetPhaseIndex: index,
                            },
                          })
                        }
                        onDuplicatePhase={() => onDuplicatePhase(index)}
                      />
                      <PlusDropdown
                        addTask={() => handleOpenTaskDialog(index)}
                        addPhase={() => dispatch({ type: "TOGGLE" })}
                      />
                    </div>
                  </div>
                  <DisclosureContent className="overflow-auto">
                    <div className="w-full overflow-auto flex border-t border-gray-200 flex-col justify-center min-h-[208px] md:min-h-[228px]">
                      <div className="max-w-[352px] mx-auto">
                        <h1 className="text-base font-semibold text-center leading-6 text-gray-800">
                          {index === 0
                            ? "Create your first task"
                            : "Create a task"}
                        </h1>
                        <p className="text-sm mt-1 leading-5 text-center text-gray-800">
                          {index === 0
                            ? "Start defining your project scope with a clear, actionable step."
                            : "Define your project scope with a clear, actionable step."}
                        </p>
                        <div className="mt-6 flex justify-center">
                          <Button
                            className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                            onClick={() => handleOpenTaskDialog(index)}
                          >
                            <Plus className="size-[15px]" />
                            Add Task
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DisclosureContent>
                </div>
              </AccordionItem>
            )}
          </ArrayNavigator>
              )
            })}
          </Accordion>
        )
      })()}

      <Button
        className="mt-5"
        variant="ghost"
        visual="gray"
        onClick={() => dispatch({ type: "TOGGLE" })}
      >
        <Plus className="size-[15px]" /> Add Phase
      </Button>

      <PhaseNameDialog
        onOpenChange={(open) => dispatch({ type: "TOGGLE", payload: { open } })}
        open={phaseDialogState.open}
        onAddPhaseName={onAddPhaseName}
        defaultName={currentPhaseName}
        showPhaseType={
          scopeType === "service" && phaseDialogState.action !== "EDIT"
        }
        disabledTypes={
          phases
            .map((p) => p.phaseType)
            .filter((t): t is PhaseType => !!t)
        }
        placeholder={
          phaseDialogState.action === "EDIT"
            ? "Edit Phase name"
            : "Enter Phase Name"
        }
      />

      <TaskDialog
        open={taskDialogState.open}
        onOpenChange={(open) =>
          setTaskDialogState((prev) => ({
            ...prev,
            open,
            editingPhaseIndex: null,
          }))
        }
        onAddTask={onAddTask}
      />
      <DurationDialog
        durationFormValues={durationFormValues}
        open={durationDialogState.open}
        onDurationFormValuesChange={onDurationFormValuesChange}
        onOpenChange={(open) =>
          setDurationDialogState({
            editingPhaseIndex: null,
            editingPhaseRowIndex: null,
            open,
          })
        }
      />
      <DeletePhaseDialog
        open={deletePhaseDialogState.open}
        onOpenChange={(open) =>
          setDeletePhaseDialogState({
            phaseIndex: null,
            open,
          })
        }
        onDeletePhase={() => {
          if (deletePhaseDialogState.phaseIndex !== null) {
            onDeletePhase(String(deletePhaseDialogState.phaseIndex))
          }
        }}
      />
      <TaskSearchDialog
        open={isTaskSearchDialogOpen}
        onOpenChange={setTaskSearchDialogOpen}
        phases={phases}
      />
    </div>
  )

  if (embedded) {
    return (
      <>
        {coreContent}
        <Toaster />
      </>
    )
  }

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] min-[1024px]:flex space-y-10 min-[1024px]:space-y-0 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    A great title gives your audience a reason to open your
                    project
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" type="button">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <ProjectScopeTip
                      className="w-full"
                      closeTrigger={
                        <DialogClose asChild>
                          <IconButton
                            className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                            variant="light"
                            visual="gray"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {coreContent}

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectScopeTip showArrow />
          </div>
        </div>
      </ScrollArea>
      <Toaster />
    </>
  )
}

export default ScopeBuilder
