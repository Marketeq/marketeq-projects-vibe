"use client"

import { isCreateListingBlocked } from "@/src/lib/api/create-listing-gate"
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
// import ReactPlayer from "react-player"
import dynamic from "next/dynamic"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  isUnauthorizedError,
  toUserMessage,
} from "@/lib/listing-errors"
import {
  PublishConfirmDialog,
  getPendingReviewToastTitle,
  getPublishedToastTitle,
  isPublishedResponse,
} from "@/components/listings/publish-confirm-dialog"
import options from "@/public/mock/options.json"
import {
  AutocompleteAPI,
  type AutocompleteCategorySuggestion,
  type AutocompleteTypeSuggestion,
} from "@/service/http/autocomplete"
import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category"
import { ProjectAPI } from "@/service/http/project"
import {
  idsToDrop,
  isGateUnavailable,
  notAdded,
  readDraftMemberResults,
  readSaveMembersResponse,
  TEAM_SAVE_UNAVAILABLE_MESSAGE,
  type MemberAddResult,
} from "@/lib/member-add-results"
import {
  availablePeriods,
  costPerPeriod,
  formatDuration,
  normalizePeriod,
  PERIOD_WIDGET_LABELS,
  resolvePeriod,
  scopeDurationDays,
  type PricingPeriod,
} from "@/lib/listing-pricing"
import { Spinner } from "@/components/ui/spinner/spinner"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { editProjectListingUrl } from "@/src/lib/listing-urls"
import {
  PROJECT_TYPE_OPTIONS,
  TEAM_SEED_LISTINGS,
  TITLE_MAX_LENGTH,
  TITLE_MAX_LENGTH_ERROR,
} from "@/src/lib/my-listings"
import { buildProjectUrl } from "@/src/lib/urlHelpers"
import { HTTPS, ONE_SECOND } from "@/utils/constants"
import {
  cn,
  debounce,
  getId,
  getIsNotEmpty,
  hookFormHasError,
  keys,
} from "@/utils/functions"
import {
  useCallbackRef,
  useControllableState,
  useStepper,
  useUncontrolledState,
  useUnmountEffect,
} from "@/utils/hooks"
import { createContext, createStrictContext } from "@/utils/react-utils"
import { TagsInputHiddenInput } from "@ark-ui/react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ChartBreakoutCircle,
  Check,
  XCircle,
  CheckCircle,
  CheckCircleBroken,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Clock,
  RefreshCcw05,
  Copy,
  Edit03,
  ExternalLink,
  Eye,
  FilterLines,
  HelpCircle,
  Home03,
  Info,
  Lightbulb05,
  Lock01,
  Mail01,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Plus2,
  SearchMd,
  Send,
  ShieldDollar,
  Stars02,
  Trash01,
  Trash2,
  Type,
  Upload01,
  WifiOff,
  X,
  X2,
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
import * as RadixTabs from "@radix-ui/react-tabs"
import { createColumnHelper, noop } from "@tanstack/react-table"
import {
  AddRoleDialog,
  convertPhasesForScopeType,
  countryFromLocation,
  ensureServicePhaseTypes,
  estimateScopeBudgetCents,
  PHASE_TYPE_TITLE,
  PhaseHeaderMeta,
  RolePicker,
  type PhaseType,
  type RecurrenceSchedule,
  type ScopeType,
  type TeamMember,
} from "@/components/scope-builder"
import { TeamsAPI } from "@/service/http/teams"
import { useInviteWindowStore } from "@/components/invite-window"
import { getCurrentUser } from "@/utils/auth"
import {
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Steps } from "headless-stepper"
import {
  Controller,
  type FieldPath,
  SubmitHandler,
  UseFormReturn,
  get,
  useForm,
  useWatch,
} from "react-hook-form"
import {
  useIsomorphicLayoutEffect,
  useToggle,
  useUpdateEffect,
} from "react-use"
import { util, z } from "zod"
import { Prettify } from "@/types/core"
import { CreateProjectType } from "@/types/project"
import { Logo3 } from "@/components/icons"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import NextLink from "@/components/next-link"
import { CountriesCombobox, OwnCombobox } from "@/components/own-combobox"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  ScaleOutIn,
  SquareShapeDropzone,
  Step,
  StepControl,
  StepRootProvider,
  StepperProvider,
  TagsInputContext,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputLabel,
  TagsInputRoot,
  useStepContext,
  useStepRootContext,
  useStepperContext,
} from "@/components/ui"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  BadgeCloseButton,
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
  Dropzone,
  HelperText,
  IconButton,
  ImageEditor,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ONE_MB,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ScrollArea,
  ScrollBar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToastAction,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

type ProgressProps = {
  setProgress?: (val: number) => void
}

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })
const PROJECT_SCOPE_TIP_VIDEO_URL =
  process.env.NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL ?? ""

declare module "@tanstack/react-table" {
  // @ts-expect-error
  interface TableMeta<TData extends PhaseRow> {
    updateData: (
      rowIndex: number,
      columnId: string,
      value: unknown,
      notifyTitle?: string
    ) => void
    batchUpdateData?: (
      rowIndex: number,
      updates: Record<string, unknown>,
      notifyTitle?: string
    ) => void
    openDurationDialog: (index: number) => void
    roles: string[]
    teamMembers?: TeamMember[]
  }
}

type SubmissionStatus = "in_review" | "published" | "needs_update"

type SubmissionOutcome = {
  status: SubmissionStatus
  projectId?: string
  projectSlug?: string
}

type PublishErrorClassification =
  | "image_rejection"
  | "video_rejection"
  | "content_rejection"
  | "temporary_unavailable"
  | "other"

function classifyPublishError(input: {
  message?: string
  statusCode?: number
  status?: string
}): PublishErrorClassification {
  const message = String(input.message ?? "").trim()
  const normalizedMessage = message.toLowerCase()
  const normalizedStatus = String(input.status ?? "")
    .trim()
    .toLowerCase()

  const isTemporaryUnavailable =
    input.statusCode === 502 ||
    input.statusCode === 503 ||
    normalizedStatus === "publish_blocked" ||
    /temporarily unavailable|currently unavailable|upstream listings-service|retry media upload|invalid response|failed with status 5\d{2}|bad gateway|service unavailable/.test(
      normalizedMessage
    )

  if (isTemporaryUnavailable) {
    return "temporary_unavailable"
  }

  const isVideoRejection =
    /project rejected:\s*video|video violates moderation policy|unsafe frame|frame_moderation|video rejected|video moderation review/.test(
      normalizedMessage
    )

  if (isVideoRejection) {
    return "video_rejection"
  }

  const isImageRejection =
    /project rejected:\s*image|image violates moderation policy|featured image failed moderation|image rejected by moderation|nudity|graphic|gore|weapon|hate symbol|blur/.test(
      normalizedMessage
    )

  if (isImageRejection) {
    return "image_rejection"
  }

  const isContentRejection =
    /project rejected:\s*content|content violates moderation policy|banned keyword|bad words|profanity|content failed validation|content moderation|community guidelines|rejected by moderation/.test(
      normalizedMessage
    )

  if (isContentRejection) {
    return "content_rejection"
  }

  return "other"
}

// PMCM-252 follow-up: each autosave's recursive setTimeout loop is re-entered
// from multiple places — the timer itself, the online-reconnect flush, and
// promptSignInToRetry's post-login resume — and a bare `let timeoutId` with
// no guard let two of those overlap into a second concurrent loop (doubling
// requests, outliving the effect that scheduled it). This factory is the one
// place that enforces: at most one pending timer, at most one in-flight
// `save()` call, and a `disposed` flag that permanently stops rescheduling
// once the owning effect's cleanup runs.
type AutosaveLoop = {
  // Entry point for every caller (the timer, the online flush, a retry
  // resume). Resolves once THIS invocation's save (plus any rerun folded
  // into it, see below) has actually completed — callers that `await` it
  // (the online flush's sequential ordering) keep working unchanged.
  run: () => Promise<void>
  // Permanently stops the loop: no further reschedule, no new run() actually
  // executes a save. Call once from the effect's cleanup.
  dispose: () => void
}

function createAutosaveLoop(
  save: () => Promise<boolean>,
  nextDelayMs: () => number
): AutosaveLoop {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null
  // Set when run() is called while a save is already in flight — instead of
  // starting a second concurrent save, the current one is asked to go again
  // once it finishes, so the latest data still goes out exactly once more.
  let rerunRequested = false
  let disposed = false

  const clearPendingTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const scheduleNext = () => {
    clearPendingTimer()
    if (disposed) return
    timeoutId = setTimeout(() => void run(), nextDelayMs())
  }

  const runOnce = async (): Promise<void> => {
    do {
      rerunRequested = false
      const paused = await save()
      if (disposed || paused) return
    } while (rerunRequested)
    scheduleNext()
  }

  const run = (): Promise<void> => {
    // Whoever calls run() — timer fire, online flush, retry resume — first
    // cancels any timer still pending, so a stale scheduled tick can never
    // kick off a second loop alongside this call.
    clearPendingTimer()
    if (disposed) return Promise.resolve()
    if (inFlight) {
      rerunRequested = true
      return inFlight
    }
    inFlight = runOnce().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  const dispose = () => {
    disposed = true
    clearPendingTimer()
  }

  return { run, dispose }
}

// PMCM-253 (locking removed per follow-up product direction: this is an
// edit system, not a step-by-step wizard — every section is always open):
// the five-state section model (AC1). One pure, exported, unit-testable
// function — every input is an explicit boolean, nothing here closes over
// component state. `isActive` takes top priority so the current section
// always has a visually distinct icon (N1) even while it also has an
// error or warning underneath; callers that need that underlying status
// (the publish gate, and the secondary badge shown next to an active
// section's icon) call this again with `isActive: false` to bypass it.
// `SectionStatus`/`SectionState` are local to this file (confirmed via
// repo-wide grep — nothing else imports them), so "locked" was removed
// from the union entirely rather than just never being returned.
export type SectionStatus = "incomplete" | "complete" | "warning" | "error"
export type SectionState = SectionStatus | "active"

export type DeriveSectionStateInput = {
  // Live validity for this section's required fields (the same schema/count
  // check already driving stepsState[index].isValid) — recalculated from
  // current form values on every render, never a stale save result (AC3).
  isValid: boolean
  // True forever once isValid has been true at least once this session —
  // lets a since-cleared required field in an already-finished section
  // drop straight to "error" (E1) instead of silently back to "incomplete".
  everCompleted: boolean
  // A field-level RHF error or a backend moderation rejection tied to this
  // section specifically (independent of the plain schema check above).
  hasBlockingFieldError: boolean
  // Publish was clicked at least once while this section was still invalid
  // — the existing AC4/E2 signal, forces every remaining gap into view.
  publishAttempted: boolean
  // A non-blocking advisory on an otherwise-valid section (X1). No trigger
  // is cataloged in this wizard today — see the PMCM-253 progress.md entry
  // — so every caller currently passes `false`; the state/icon/publish rule
  // below are fully implemented and ready for one.
  hasWarning: boolean
  isActive: boolean
}

export function deriveSectionState(
  input: DeriveSectionStateInput
): SectionState {
  if (input.isActive) return "active"

  const hasBlockingError =
    input.hasBlockingFieldError ||
    (input.everCompleted && !input.isValid) ||
    (input.publishAttempted && !input.isValid)

  if (hasBlockingError) return "error"
  if (input.isValid) return input.hasWarning ? "warning" : "complete"
  return "incomplete"
}

function makeUniqueFile(
  file: File | Blob | undefined
): File | Blob | undefined {
  if (!file) return file
  // If already a File, clone with a unique name
  if (file instanceof File) {
    const ext = file.name.split(".").pop()
    const base = file.name.replace(/\.[^/.]+$/, "")
    const uniqueName = `${base}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`
    return new File([file], uniqueName, { type: file.type })
  }
  // If Blob or other, just return as is
  return file
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PersistedMediaFile = File & {
  __persistedUrl?: string
}

// PMCM-256: Dropzone/SquareShapeDropzone (catalogued, frozen) generate
// their own error text — "Must be in .png .jpg .jpeg format(s)" for a
// rejected extension, and react-dropzone's own "File is larger than N
// bytes" for maxSize — neither matches the ticket's exact required copy.
// Both only ever surface through the page-level onError prop, so remap
// here instead of touching the frozen component.
const MEDIA_FILE_TYPE_ERROR = "Only JPG and PNG files are supported."
const MEDIA_FILE_SIZE_ERROR = "File size must be 10 MB or less."
const MEDIA_MAX_SIZE_BYTES = 10 * ONE_MB

const mapDropzoneErrorMessage = (message?: string): string | undefined => {
  if (!message) return message
  if (/larger than/i.test(message)) return MEDIA_FILE_SIZE_ERROR
  if (/must be in/i.test(message)) return MEDIA_FILE_TYPE_ERROR
  return message
}

// PMCM-256: mirrors mediaFormSchema's featuredVideo .refine() check below —
// used by the saveVideo autosave effect so an invalid URL is never
// persisted even though it's already blocked from reaching backend-submit
// via the form's own validation. Not derived from the schema object
// directly since mediaFormSchema is wrapped in a trailing object-level
// .refine(), which doesn't expose .shape.
const isValidFeaturedVideoUrl = (value: string): boolean => {
  const rawValue = value?.trim()
  if (!rawValue) return true // empty is allowed — video is optional
  const normalized = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue.replace(/^\/+/, "")}`
  try {
    const parsed = new URL(normalized)
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    )
  } catch {
    return false
  }
}

const isPersistedMediaFile = (file: unknown): file is PersistedMediaFile =>
  file instanceof File &&
  typeof (file as PersistedMediaFile).__persistedUrl === "string"

const buildPersistedMediaFile = (url: string, fallbackName: string) => {
  const pathname = (() => {
    try {
      return new URL(url).pathname
    } catch {
      return ""
    }
  })()
  const derivedName = pathname.split("/").pop() || fallbackName
  const file = new File([""], derivedName, {
    type: "image/jpeg",
  }) as PersistedMediaFile
  file.__persistedUrl = url
  return file
}

const resolveMediaFileForUpload = async (
  file: File | Blob | undefined,
  fallbackName: string
): Promise<File | Blob | undefined> => {
  if (!file) return undefined
  if (isPersistedMediaFile(file)) {
    const response = await fetch(file.__persistedUrl!)
    const blob = await response.blob()
    return new File([blob], file.name || fallbackName, {
      type: blob.type || file.type || "image/jpeg",
    })
  }
  return makeUniqueFile(file)
}

const appendFeaturedImageField = async (
  formData: FormData,
  meta: File | Blob | undefined
): Promise<boolean> => {
  if (!meta) return false
  if (isPersistedMediaFile(meta)) {
    formData.append("featuredImage", meta.__persistedUrl!)
    return true
  }
  const resolved = await resolveMediaFileForUpload(meta, "featured-image.jpg")
  if (!resolved) return false
  formData.append("featuredImage", resolved)
  return true
}

const appendAdditionalImageFields = async (
  formData: FormData,
  metas: (File | Blob | undefined)[]
): Promise<void> => {
  for (const meta of metas) {
    if (!meta) continue
    if (isPersistedMediaFile(meta)) {
      formData.append("additionalImages", meta.__persistedUrl!)
      continue
    }
    const resolved = await resolveMediaFileForUpload(
      meta,
      "additional-image.jpg"
    )
    if (resolved) formData.append("additionalImages", resolved)
  }
}

const hydrateRemoteMediaFile = async (url: string, fallbackName: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const file = new File([blob], fallbackName, {
      type: blob.type || "image/jpeg",
    }) as PersistedMediaFile
    file.__persistedUrl = url
    return file
  } catch {
    return buildPersistedMediaFile(url, fallbackName)
  }
}

const buildProjectDraftPayload = (projectInfo: ProjectInfoFormValues) => {
  const categorySelections = (projectInfo.category ?? [])
    .map((value) => ({
      category: value?.category?.trim() ?? "",
      subCategories: (value?.subCategories ?? [])
        .map((subCategory) => subCategory.trim())
        .filter(Boolean),
    }))
    .filter(
      (value) => value.category.length > 0 && value.subCategories.length > 0
    )

  const categories = Array.from(
    new Set(
      categorySelections
        .map((value) => value.category)
        .filter((value): value is string => Boolean(value))
    )
  )
  const subCategories = Array.from(
    new Set(
      categorySelections
        .flatMap((value) => value.subCategories)
        .filter((value): value is string => Boolean(value))
    )
  )

  return {
    title: projectInfo.title,
    categories,
    subCategories,
    categorySelections,
    industries: projectInfo.industry,
    tags: projectInfo.tags,
    skills: projectInfo.skills,
    projectType: projectInfo.projectType,
    shortDescription: projectInfo.shortDescription,
    fullDescription: projectInfo.fullDescription,
  }
}

// Draft autosave payload. Drafts are allowed to be partial, so we send every
// phase and every row (with fallbacks) rather than dropping incomplete ones —
// otherwise editing a not-yet-complete task/phase produces an unchanged payload
// and the autosave never fires. Publish-time validation is enforced separately.
const buildScopeDraftPayload = (projectId: string, phases: Phase[] = []) =>
  (phases ?? [])
    // Skip the blank starter phase ({}), but keep anything the user has begun
    // filling in (a name, a phase type, or at least one row).
    .filter(
      (phase) =>
        !!phase?.phaseName?.trim() ||
        !!phase?.phaseType ||
        (phase?.rows?.length ?? 0) > 0
    )
    .map((phase, phaseIndex) => {
    const phaseName = phase?.phaseName?.trim() || `Phase ${phaseIndex + 1}`
    const rows = (phase?.rows ?? []).map((row) => {
      const durationValue = row?.duration?.value
      const durationType = row?.duration?.type
      const experienceLevel = row?.experience?.trim() ?? ""
      return {
        taskName: row?.task?.trim() ?? "",
        role: row?.role?.trim() ?? "",
        location: [row?.location?.trim() ?? ""].filter(Boolean),
        experience: [experienceLevel].filter(Boolean),
        experienceLevel,
        duration:
          durationValue !== undefined && durationType
            ? `${durationValue} ${durationType}`
            : "1 days",
        assigneeUserId:
          row?.assigneeUserId ?? row?.assignedMember?.id ?? null,
        phaseId: "temporary-required-string",
      }
    })

    return {
      name: phaseName,
      stageName: `Stage ${phaseIndex + 1}`,
      startDay: 1,
      endDay: 8,
      order: phaseIndex + 1,
      projectId,
      phaseType: phase?.phaseType ?? undefined,
      recurrenceSchedule: phase?.recurrenceSchedule ?? undefined,
      recurrenceCount: phase?.recurrenceCount ?? undefined,
      tasks: rows,
    }
  })
const Empty = ({
  outcome,
  draftId,
}: {
  outcome?: SubmissionOutcome
  draftId?: string
}) => {
  const status = outcome?.status ?? "in_review"
  // Category slug is not known at this point in the flow; fall back to an
  // empty string so buildProjectUrl returns "/c//projects/<slug>-<shortId>",
  // which downstream category pages resolve. If no slug/id, go to marketplace.
  const marketplaceHref =
    outcome?.projectSlug && outcome?.projectId
      ? buildProjectUrl("", outcome.projectSlug, outcome.projectId)
      : "/marketplace"
  const router = useRouter()
  return (
    <div className="grid flex-auto place-items-center">
      <div className="flex w-full max-w-[460px] flex-col items-center px-6">
        {status === "published" ? (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-success-50 text-success-500">
            <CheckCircle className="size-7" />
          </div>
        ) : status === "needs_update" ? (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-warning-50 text-warning-500">
            <AlertTriangle className="size-7" />
          </div>
        ) : (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-primary-50 text-primary-500">
            <Send className="size-7" />
          </div>
        )}

        <h1
          className={
            status === "in_review" || status === "published"
              ? "mt-8 text-xl text-center text-gray-800 leading-[30px] font-semibold"
              : "mt-8 max-w-[420px] text-center text-[32px] leading-[38px] font-semibold text-gray-800"
          }
        >
          {status === "published"
            ? "Your project has been successfully published"
            : status === "needs_update"
              ? "Please update your project to meet community guidelines."
              : "Your Project has been submitted for a review!"}
        </h1>

        <p className="mt-5 max-w-[420px] text-center text-sm leading-[21px] text-gray-500">
          {status === "published"
            ? "Your project is now live in the marketplace and available for others to discover and collaborate. Thank you for contributing!"
            : status === "needs_update"
              ? "Review and adjust your project to ensure it complies with policies before publishing."
              : "Our team will review your project over the next few days and will get back to you if there are any changes to be made."}
        </p>

        {status !== "needs_update" ? (
          <div className="mt-6 flex items-center justify-center gap-x-1">
            <p className="text-sm leading-[16.94px] text-gray-500">
              You can check your project status anytime in
            </p>
            <Button
              variant="link"
              className="px-0"
              onClick={() => {
                router.push("/my-projects")
              }}
            >
              My Projects
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm leading-[21px] text-gray-500">
            Read community guidelines{" "}
            <Button
              variant="link"
              className="px-0"
              onClick={() => router.push("/community-guidelines")}
            >
              Here.
            </Button>
          </p>
        )}

        {status === "in_review" ? (
          <p className="mt-6 text-center text-sm font-semibold leading-[30px] text-gray-800">
            Thanks for submitting, we&apos;ll be in touch soon!
          </p>
        ) : null}

        {status === "published" ? (
          <div className="mt-8 flex items-center justify-center gap-x-3">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => {
                window.location.href = "/"
              }}
            >
              <Home03 className="size-[15px]" />
              Take me home
            </Button>
            <Button
              onClick={() => {
                window.location.href = marketplaceHref
              }}
            >
              View in Marketplace
            </Button>
          </div>
        ) : status === "needs_update" ? (
          <div className="mt-8">
            <Button
              onClick={() => {
                if (draftId) {
                  router.push(editProjectListingUrl(draftId))
                  return
                }
                router.push("/publish-project")
              }}
            >
              Update Project
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => {
                window.location.href = "/"
              }}
            >
              <Home03 className="size-[15px]" />
              Take me home
            </Button>
            <Button
              variant="link"
              className="mt-3 px-0"
              onClick={() => {
                router.push("/my-projects")
              }}
            >
              My Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const meta = {
  "Project Info": [
    { label: "Basic Info", name: "title" },
    { label: "Description", name: "shortDescription" },
    { label: "Project Details", name: "tags" },
  ],
  Media: [
    { label: "Featured Image", name: "featuredImages" },
    { label: "Additional Images", name: "additionalImages" },
    { label: "Featured Video", name: "featuredVideo" },
  ],
  "Project Scope": [
    { label: "Task Name", name: "task" },
    { label: "Role", name: "role" },
    { label: "Location", name: "location" },
    { label: "Experience", name: "experience" },
    { label: "Duration", name: "duration" },
  ],
  Team: [
    { label: "Members", name: "members" },
    { label: "Open Roles", name: "openRoles" },
    { label: "Application Questions", name: "applicationQuestions" },
    { label: "Requests", name: "requests" },
    { label: "Invites", name: "invites" },
  ] as { label: string; name: string }[],
  Questions: [
    { label: "FAQ's", name: "faqs" },
    { label: "Recent Questions", name: "recentQuestions" },
  ],
} as const

const plainTextFromRichTextHtml = (value: string) => {
  if (!value) return ""

  if (typeof window !== "undefined") {
    const container = window.document.createElement("div")
    container.innerHTML = value
    return (container.textContent ?? container.innerText ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const getRichTextCharacterCount = (value: string) =>
  plainTextFromRichTextHtml(value).length

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
  task: z.string().min(1, "Please enter at least 1 character(s)"),
  role: z.string().min(1, "Please enter/select at least 1 role(s)"),
  location: z.string().min(1, "Please enter/select at least 1 location(s)"),
  experience: z.enum(EXPERIENCE_LEVELS, {
    required_error: "Please enter/select at least 1 experience level",
    invalid_type_error: "Please enter/select at least 1 experience level",
  }),
  duration: z.object({
    value: z.coerce
      .number({
        invalid_type_error: "Please enter a valid number",
      })
      // PMCM-257: "Task with 0 hours → inline 'Minimum 1 hour per task.'
      // on that row." Checked on the raw entered value/unit — the
      // concrete, named failure case is literally 0, regardless of unit.
      .min(1, "Minimum 1 hour per task."),
    type: z.enum(DURATION_TYPE, {
      invalid_type_error: "Please select an option",
      required_error: "Please select an option",
    }),
  }),
})

const rowSchema = taskFormSchema.merge(
  z.object({
    id: z.string().min(1, "Please enter at least 1 character(s)"),
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
            phaseName: z
              .string()
              .min(1, "Please enter at least 1 character(s)"),
            rows: z
              .array(rowSchema.pick(options))
              .min(1, "Please add at least 1 task(s)"),
          })
        )
        .min(1, "Please add at least 1 phase(s)")
        .safeParse(data, params)
      return success
    },
  }
}

// PMCM-257: called with no options before, so rowSchema.pick({}) picked
// zero fields — any object (even `{}`) satisfied every row, so "at least
// one phase with at least one valid task" (AC5) was actually just "at
// least one phase with at least one row of any shape." Picking the
// fields that make a task real enforces role/location/experience/
// duration (which now includes the min-1-hour check above) for section
// completeness, matching the per-field TaskDialog validation used when
// adding a task.
const projectScopeSchema = pickFromProjectScopeSchema({
  task: true,
  role: true,
  location: true,
  experience: true,
  duration: true,
})

const Sidebar = ({
  hasFaqs = false,
  hasRecentQuestions = false,
  faqError = false,
  faqModerationHasError = false,
  projectInfoModerationHasError = false,
  mediaModerationHasError = false,
  publishAttempted = false,
  questionsStarted = false,
  everCompletedSteps = [false, false, false, false, false],
}: {
  hasFaqs?: boolean
  hasRecentQuestions?: boolean
  faqError?: boolean
  faqModerationHasError?: boolean
  projectInfoModerationHasError?: boolean
  mediaModerationHasError?: boolean
  publishAttempted?: boolean
  questionsStarted?: boolean
  // PMCM-253/E1: true forever, per section, once it has been valid at
  // least once this session — see deriveSectionState's `everCompleted`.
  everCompletedSteps?: boolean[]
}) => {
  const { currentStep, stepsState } = useStepRootContext()
  const { setStep } = useStepperContext()
  const projectInfoMethods: UseFormReturn<ProjectInfoFormValues> =
    useProjectInfoContext()
  const mediaMethods = useMediaContext()
  const { projectScopeMethods, setTaskSearchDialogOpen, teamSubTab, setTeamSubTab } =
    useProjectScopeContext()
  const [phases] = projectScopeMethods
  // Show status icons only after the user has started filling Project Scope
  const hasStartedScope =
    Array.isArray(phases) &&
    phases.some(
      (p) =>
        (p.phaseName?.trim?.() ?? "").length > 0 ||
        (Array.isArray(p.rows) && p.rows.length > 0)
    )
  const projectInfoValues = useWatch({ control: projectInfoMethods.control })
  const hasProjectInfoFieldError = useCallback(
    (name: (typeof meta)["Project Info"][number]["name"]) => {
      // Each sidebar sub-item maps to a tab grouping
      if (name === "title") {
        // Basic Info tab: title + category
        return (
          Boolean(projectInfoMethods.formState.errors.title) ||
          Boolean(projectInfoMethods.formState.errors.category)
        )
      }
      if (name === "shortDescription") {
        // Description tab: shortDescription + fullDescription
        return (
          Boolean(projectInfoMethods.formState.errors.shortDescription) ||
          Boolean(projectInfoMethods.formState.errors.fullDescription)
        )
      }
      if (name === "tags") {
        // Project Details tab: tags + skills + industry
        return (
          Boolean(projectInfoMethods.formState.errors.tags) ||
          Boolean(projectInfoMethods.formState.errors.skills) ||
          Boolean(projectInfoMethods.formState.errors.industry)
        )
      }
      return false
    },
    [projectInfoMethods.formState.errors]
  )
  const hasProjectInfoFieldValue = useCallback(
    (name: (typeof meta)["Project Info"][number]["name"]) => {
      const v = projectInfoValues ?? {}
      if (name === "title") {
        return (
          Boolean(v.title?.trim()) &&
          Boolean(
            v.category?.some(
              (c) =>
                Boolean(c?.category?.trim()) &&
                Boolean(c?.subCategories?.length)
            )
          )
        )
      }
      if (name === "shortDescription") {
        return (
          Boolean(v.shortDescription?.trim()) &&
          getRichTextCharacterCount(v.fullDescription ?? "") > 0
        )
      }
      if (name === "tags") {
        return (
          Boolean(v.tags?.length) &&
          Boolean(v.skills?.length) &&
          Boolean(v.industry?.length)
        )
      }
      return false
    },
    [projectInfoValues]
  )
  const hasMediaFieldError = useCallback(
    (name: (typeof meta)["Media"][number]["name"]) =>
      hookFormHasError({
        errors: mediaMethods.formState.errors,
        name: name as FieldPath<MediaFormValues>,
      }),
    [mediaMethods.formState.errors]
  )
  const mediaValues = useWatch({ control: mediaMethods.control })
  const hasMediaFieldValue = useCallback(
    (name: (typeof meta)["Media"][number]["name"]) => {
      const v = mediaValues ?? {}
      if (name === "featuredImages") return Boolean(v.featuredImages?.length)
      if (name === "additionalImages")
        return Boolean(v.additionalImages?.flat().length)
      if (name === "featuredVideo") return Boolean(v.featuredVideo?.trim())
      return false
    },
    [mediaValues]
  )

  return (
    <div className="sticky top-0 py-6 px-6 flex h-screen flex-col shrink-0 overflow-y-auto xs:max-[1024px]:hidden w-[260px] border-r border-gray-200 bg-gray-50">
      <div className="mb-8">
        <Logo3 className="h-[19px] w-auto" />
      </div>
      {stepsState.map(({ label, isValid }, index) => {
        const isActive = currentStep === index
        const isLast = index === stepsState.length - 1
        const hasBlockingFieldError =
          (label === "Questions" && faqModerationHasError) ||
          (label === "Project Info" && projectInfoModerationHasError) ||
          (label === "Media" && mediaModerationHasError)
        const commonStateInput = {
          isValid: Boolean(isValid),
          everCompleted: everCompletedSteps[index] ?? false,
          hasBlockingFieldError,
          publishAttempted,
          // No non-blocking advisory is cataloged in this wizard today —
          // see deriveSectionState's own comment. Always false until one
          // exists; the state/icon/publish rule below are fully wired for
          // it regardless.
          hasWarning: false,
        }
        const displayState = deriveSectionState({
          ...commonStateInput,
          isActive,
        })
        // The active section's icon always wins (N1), but the publish gate
        // and the secondary badge both need the status UNDER that — a
        // section can be actively open and still flagged error/warning.
        const underlyingStatus = deriveSectionState({
          ...commonStateInput,
          isActive: false,
        })
        const showErrorBadge = underlyingStatus === "error"
        const showWarningBadge = underlyingStatus === "warning"
        return (
          <div key={index} className="relative pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-3 top-7 bottom-0 border-l-2 border-dashed border-gray-300"
              />
            )}
            <button
              type="button"
              className="group relative z-[1] flex w-full items-center gap-x-3 focus-visible:outline-none"
              data-ui-state={displayState}
              onClick={() => setStep(index)}
            >
              <span className="size-6 shrink-0 rounded-full inline-flex justify-center items-center border-2 border-gray-300 bg-gray-50 group-data-[ui-state=complete]:border-primary-500 group-data-[ui-state=complete]:bg-primary-500 group-data-[ui-state=warning]:border-primary-500 group-data-[ui-state=warning]:bg-primary-500 group-data-[ui-state=active]:border-primary-500 group-data-[ui-state=error]:border-error-500">
                {displayState === "error" ? (
                  <Plus className="size-3.5 text-error-500" />
                ) : displayState === "active" ? (
                  <span className="size-2 rounded-full bg-primary-500" />
                ) : displayState === "complete" || displayState === "warning" ? (
                  <Check className="size-3.5 text-white" />
                ) : (
                  <Plus className="size-3.5 text-gray-400" />
                )}
              </span>
              <span className="text-dark-blue-400 text-sm leading-[16.94px] font-semibold group-data-[ui-state=error]:text-error-500">
                {label}
              </span>

              {(showErrorBadge || showWarningBadge) && (
                <AlertCircle
                  className={cn(
                    "size-[18px] shrink-0 ml-auto",
                    showErrorBadge ? "text-error-500" : "text-warning-500"
                  )}
                />
              )}
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
              <div className="mt-1 pl-9">
                  {label === "Project Info" &&
                    meta[label].map((field, i) => {
                      const hasError = hasProjectInfoFieldError(field.name)
                      const hasValue = hasProjectInfoFieldValue(field.name)
                      const shouldShowStatus = hasError || hasValue
                      const targetId = SIDEBAR_SUB_ITEM_TARGET_IDS[field.name]

                      return (
                        <div
                          className="py-1.5 flex items-center justify-between pr-3"
                          key={i}
                        >
                          <Button
                            variant="link"
                            visual="gray"
                            size="sm"
                            className="text-sm leading-6 p-0 h-auto text-gray-500 hover:text-dark-blue-400"
                            onClick={() => {
                              if (!targetId) return
                              scrollToWizardField(targetId)
                            }}
                          >
                            {field.label}
                          </Button>

                          {shouldShowStatus &&
                            (hasError ? (
                              <AlertCircle className="size-[22px] text-warning-500 shrink-0" />
                            ) : (
                              <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                <Check className="size-3 text-white" />
                              </div>
                            ))}
                        </div>
                      )
                    })}
                  {label === "Media" &&
                    meta[label].map((field, i) => {
                      const isAdditional = field.name === "additionalImages"
                      const mv = mediaValues ?? {}
                      const additionalCount = (mv.additionalImages ?? [])
                        .flat()
                        .filter((it) => it?.meta && it?.progress === 100).length
                      const requiredAdditional = mv.featuredVideo?.trim()
                        ? 2
                        : 3
                      const additionalStarted =
                        additionalCount > 0 ||
                        Boolean(mv.featuredImages?.length) ||
                        Boolean(mv.featuredVideo?.trim())
                      const hasError = isAdditional
                        ? additionalStarted &&
                          additionalCount < requiredAdditional
                        : hasMediaFieldError(field.name)
                      const hasValue = isAdditional
                        ? additionalCount >= requiredAdditional
                        : hasMediaFieldValue(field.name)
                      const shouldShowStatus = hasError || hasValue
                      const targetId = SIDEBAR_SUB_ITEM_TARGET_IDS[field.name]

                      return (
                        <div
                          className="py-1.5 flex items-center justify-between pr-3"
                          key={i}
                        >
                          <Button
                            variant="link"
                            visual="gray"
                            size="sm"
                            className="text-sm leading-6 p-0 h-auto text-gray-500 hover:text-dark-blue-400"
                            onClick={() => {
                              if (!targetId) return
                              scrollToWizardField(targetId)
                            }}
                          >
                            {field.label}
                          </Button>

                          {shouldShowStatus &&
                            (hasError ? (
                              <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
                            ) : (
                              <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                <Check className="size-3 text-white" />
                              </div>
                            ))}
                        </div>
                      )
                    })}
                  {label === "Project Scope" &&
                    meta[label].map((field, i) => {
                      const targetId =
                        field.label === "Task Name"
                          ? null
                          : SIDEBAR_SUB_ITEM_TARGET_IDS[field.name]
                      return (
                        <div
                          className="py-1.5 flex items-center justify-between pr-3"
                          key={i}
                        >
                          <Button
                            variant="link"
                            visual="gray"
                            size="sm"
                            className="text-sm leading-6 p-0 h-auto text-gray-500 hover:text-dark-blue-400"
                            onClick={() => {
                              if (field.label === "Task Name") {
                                setTaskSearchDialogOpen(true)
                              } else if (targetId) {
                                scrollToWizardField(targetId)
                              }
                            }}
                          >
                            {field.label}
                          </Button>

                          {hasStartedScope ? (
                            (field.label === "Task Name" &&
                              pickFromProjectScopeSchema({
                                task: true,
                              }).safeParse(phases)) ||
                            (field.label === "Role" &&
                              pickFromProjectScopeSchema({
                                role: true,
                              }).safeParse(phases)) ||
                            (field.label === "Location" &&
                              pickFromProjectScopeSchema({
                                location: true,
                              }).safeParse(phases)) ||
                            (field.label === "Experience" &&
                              pickFromProjectScopeSchema({
                                experience: true,
                              }).safeParse(phases)) ||
                            (field.label === "Duration" &&
                              pickFromProjectScopeSchema({
                                duration: true,
                              }).safeParse(phases)) ? (
                              <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                <Check className="size-3 text-white" />
                              </div>
                            ) : (
                              <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
                            )
                          ) : null}
                        </div>
                      )
                    })}
                  {label === "Team" &&
                    meta.Team.map((field, i) => {
                      const isSubActive = teamSubTab === field.name
                      return (
                        <div
                          className="py-1.5 flex items-center justify-between pr-3"
                          key={i}
                        >
                          <Button
                            variant="link"
                            visual="gray"
                            size="sm"
                            className={cn(
                              "text-sm leading-6 p-0 h-auto transition duration-300",
                              isSubActive
                                ? "text-primary-500"
                                : "text-gray-500 hover:text-dark-blue-400"
                            )}
                            onClick={() => setTeamSubTab(field.name)}
                          >
                            {field.label}
                          </Button>
                        </div>
                      )
                    })}
                  {label === "Questions" &&
                    meta[label].map((field, i) => {
                      const hasValue =
                        field.name === "faqs"
                          ? hasFaqs
                          : field.name === "recentQuestions"
                            ? hasRecentQuestions
                            : false
                      const hasError =
                        field.name === "faqs" &&
                        (faqError || faqModerationHasError)
                      const targetId = SIDEBAR_SUB_ITEM_TARGET_IDS[field.name]
                      return (
                        <div
                          className="py-1.5 flex items-center justify-between pr-3"
                          key={i}
                        >
                          <Button
                            variant="link"
                            visual="gray"
                            size="sm"
                            className="text-sm leading-6 p-0 h-auto text-gray-500 hover:text-dark-blue-400"
                            onClick={() => {
                              if (!targetId) return
                              scrollToWizardField(targetId)
                            }}
                          >
                            {field.label}
                          </Button>

                          {hasError ? (
                            <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
                          ) : hasValue ? (
                            <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                              <Check className="size-3 text-white" />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
              </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Header = ({
  onClose,
  slug,
  lastSavedAt,
  onPublish,
  publishing,
  saveStatus,
  isOffline,
  canPublish = true,
}: {
  onClose?: () => void
  slug?: string
  lastSavedAt?: Date | null
  onPublish?: () => void
  publishing?: boolean
  saveStatus?: "idle" | "saving" | "saved" | "error"
  isOffline?: boolean
  canPublish?: boolean
}) => {
  return (
    <div className="pr-[17px] pl-[32px] flex items-center justify-between sticky top-0 bg-white h-[70px] border-b border-gray-200 z-10">
      <h3 className="text-base leading-[19.36px] text-dark-blue-400 font-semibold">
        Edit Project
      </h3>

      <div className="flex items-center gap-x-3">
        {isOffline ? (
          <Badge visual="warning">
            <WifiOff className="size-3.5" />
            You&apos;re offline. Changes will sync when you reconnect.
          </Badge>
        ) : saveStatus === "error" ? (
          <Badge visual="error">
            <AlertCircle className="size-3.5" />
            Couldn&apos;t save. Retrying…
          </Badge>
        ) : saveStatus === "saving" ? (
          <span className="inline-flex items-center gap-x-1.5 text-sm text-gray-500">
            <RefreshCcw05 className="size-4 animate-spin" />
            Saving…
          </span>
        ) : (
          lastSavedAt && (
            <span className="inline-flex items-center gap-x-1.5 text-sm text-gray-500">
              <Clock className="size-4" />
              Saved at{" "}
              {lastSavedAt.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          )
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                className="text-gray-500"
                variant="outlined"
                visual="gray"
                onClick={() => {
                  if (slug) {
                    window.open(`/project-details/${slug}`, `preview-${slug}`)
                  }
                }}
              >
                <Eye className="size-4" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Preview</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {canPublish ? (
          <Button onClick={onPublish} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        ) : (
          // PMCM-403/F2: owner-or-lead only — a disabled control fires no
          // pointer events, so the Tooltip trigger wraps a focusable span
          // around it (same pattern already used elsewhere in this file
          // for a disabled control under a Tooltip).
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block" tabIndex={0}>
                  <Button disabled>Publish</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Only the owner or project lead can publish.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton variant="ghost" visual="gray" onClick={onClose}>
                <X className="size-5" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

const BottomBar = ({
  progressValue,
  onNextClick,
}: {
  progressValue?: number
  onNextClick?: () => void
}) => {
  const { nextStep, prevStep } = useStepperContext()
  const { hasNextStep, hasPreviousStep, totalSteps, currentStep, stepsState } =
    useStepRootContext()

  const { isValid } = stepsState[currentStep]
  const { user } = useAuth()
  const { toast } = useToast()
  const projectInfoMethods = useProjectInfoContext()
  const mediaMethods = useMediaContext()
  const { projectScopeMethods, setIsProjectSubmitted, setSubmissionOutcome } =
    useProjectScopeContext()
  const [phases] = projectScopeMethods

  const handleSubmit = async () => {
    const projectInfo: ProjectInfoFormValues = projectInfoMethods.getValues()
    const media = mediaMethods.getValues()
    let createdProjectId: string | undefined
    let createdProjectSlug: string | undefined
    const reviewStartTimeMs = Date.now()
    const reviewDelayMs = 10 * 1000
    const waitForReviewWindow = async () => {
      const elapsedMs = Date.now() - reviewStartTimeMs
      const remainingMs = reviewDelayMs - elapsedMs
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs))
      }
    }
    const ensureCustomSubcategories = async () => {
      try {
        const response = await CategoryAPI.getTree()
        const nodes: CategoryTreeNode[] = Array.isArray(response?.data)
          ? response.data
          : []
        const categoryNodesByName = indexCategoryTreeByName(nodes)
        const creations = new Map<
          string,
          { name: string; parentUuid?: string }
        >()

        ;(projectInfo.category ?? []).forEach((entry) => {
          const categoryName = entry?.category?.trim()
          if (!categoryName) return

          const categoryNode = categoryNodesByName.get(categoryName)
          if (!categoryNode) return

          const knownSubcategories = new Set(
            collectCategoryDescendants(categoryNode).map((node) =>
              node.name.trim().toLowerCase()
            )
          )

          ;(entry.subCategories ?? []).forEach((subCategory) => {
            const trimmedSubCategory = subCategory.trim()
            if (!trimmedSubCategory) return

            if (knownSubcategories.has(trimmedSubCategory.toLowerCase())) {
              return
            }

            creations.set(
              `${categoryNode.uuid}:${trimmedSubCategory.toLowerCase()}`,
              {
                name: trimmedSubCategory,
                parentUuid: categoryNode.uuid,
              }
            )
          })
        })

        for (const creation of creations.values()) {
          await ProjectAPI.CreateModeratedSubcategory(creation)
        }
      } catch (error) {
        // Keep project publishing functional even when category sync is unavailable.
      }
    }

    // Show "submitted for review" state immediately while validation/publish APIs run.
    setSubmissionOutcome({ status: "in_review" })
    setIsProjectSubmitted(true)

    await ensureCustomSubcategories()

    const payload: CreateProjectType = {
      ...buildProjectDraftPayload(projectInfo),
      userId: user?.id ?? "",
    }

    try {
      const projectIdFromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("draftId")
          : null
      let projectId =
        projectIdFromUrl && UUID_PATTERN.test(projectIdFromUrl)
          ? projectIdFromUrl
          : null
      let createProjectResponse

      if (projectId) {
        createProjectResponse = await ProjectAPI.UpdateProjectDraft(
          projectId,
          payload
        )
      } else {
        createProjectResponse = await ProjectAPI.CreateProjectDraft(payload)
        projectId =
          createProjectResponse?.data?.projectId ??
          createProjectResponse?.data?.id
        if (projectId && typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search)
          const type = urlParams.get("type") ?? "project"
          window.history.replaceState(
            window.history.state,
            "",
            `/publish-project?type=${encodeURIComponent(type)}&draftId=${encodeURIComponent(
              String(projectId)
            )}`
          )
        }
      }

      createdProjectId = projectId ? String(projectId) : undefined
      createdProjectSlug = createProjectResponse?.data?.slug

      // 2. Upload media after project draft is saved
      let mediaUploadSuccess = true
      let mediaUploadErrorMsg = ""
      if (projectId) {
        const featuredFile = media.featuredImages?.[0]?.meta
        const additionalFiles =
          media.additionalImages
            ?.flat()
            ?.map((item) => item?.meta)
            ?.filter(Boolean) ?? []
        const videoUrl = media.featuredVideo
          ?.trim()
          .replace(/^(https?:\/\/)+/i, "https://")

        if (featuredFile || additionalFiles.length || videoUrl) {
          const formData = new FormData()
          formData.append("projectId", String(projectId))
          await appendFeaturedImageField(formData, featuredFile)
          await appendAdditionalImageFields(formData, additionalFiles)
          for (const url of media.hiddenImages ?? []) {
            formData.append("hiddenImages", url)
          }
          formData.append("replaceHidden", "true")
          if (videoUrl) {
            formData.append("videoUrl", videoUrl)
          }
          try {
            await ProjectAPI.UploadMedia(formData)
          } catch (error: any) {
            mediaUploadSuccess = false
            mediaUploadErrorMsg =
              error?.response?.data?.reason ||
              error?.response?.data?.message ||
              error?.message ||
              "Media upload failed. Please check your files."
            const errorType = classifyPublishError({
              message: mediaUploadErrorMsg,
              statusCode: error?.response?.status,
              status: error?.response?.data?.status,
            })

            if (errorType === "temporary_unavailable") {
              toast({
                title:
                  mediaUploadErrorMsg ||
                  "Media upload is temporarily unavailable. Please try again.",
                variant: "destructive",
              })
              return
            }
          }
        }
      }

      // 3. If media upload failed, set project to needs_update and show re-upload option
      if (!mediaUploadSuccess) {
        const errorType = classifyPublishError({
          message: mediaUploadErrorMsg,
        })
        const isVideoViolation = errorType === "video_rejection"
        const isImageViolation = errorType === "image_rejection"
        const isContentModerationRejection = errorType === "content_rejection"

        if (
          !isVideoViolation &&
          !isImageViolation &&
          !isContentModerationRejection
        ) {
          toast({
            title:
              mediaUploadErrorMsg || "Media upload failed. Please try again.",
            variant: "destructive",
          })
          return
        }

        setSubmissionOutcome({
          status: "needs_update",
          projectId: projectId ? String(projectId) : undefined,
          projectSlug: createProjectResponse?.data?.slug,
        })
        setIsProjectSubmitted(true)
        toast({
          title: isVideoViolation
            ? `Project rejected: video violated moderation policy. ${mediaUploadErrorMsg}`
            : isImageViolation
              ? `Project rejected: image violated moderation policy. ${mediaUploadErrorMsg}`
              : `Project rejected: content did not meet community guidelines. ${mediaUploadErrorMsg}`,
          variant: "destructive",
        })
        return
      }

      // 4. Replace the saved project scope before publish
      if (projectId) {
        await ProjectAPI.ReplaceProjectScope(
          String(projectId),
          buildScopeDraftPayload(String(projectId), phases ?? [])
        )
      }

      if (projectId) {
        let publishResponse = await ProjectAPI.PublishProject(String(projectId))
        let rawStatus = String(publishResponse?.data?.status ?? "")
          .trim()
          .toLowerCase()
        await waitForReviewWindow()

        // Prevent getting stuck on review UI: retry once after the review window.
        if (
          rawStatus === "pending_review" ||
          rawStatus === "in_review" ||
          rawStatus === ""
        ) {
          try {
            publishResponse = await ProjectAPI.PublishProject(String(projectId))
            rawStatus = String(publishResponse?.data?.status ?? "")
              .trim()
              .toLowerCase()
          } catch {
            rawStatus = "in_review"
          }
        }

        const normalizedStatus: SubmissionStatus =
          rawStatus === "approved" || rawStatus === "published"
            ? "published"
            : rawStatus === "rejected" || rawStatus === "needs_update"
              ? "needs_update"
              : "in_review"

        setSubmissionOutcome({
          status: normalizedStatus,
          projectId: String(projectId),
          projectSlug: publishResponse?.data?.slug ?? createdProjectSlug,
        })
        setIsProjectSubmitted(true)
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.reason ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to submit project"
      const errorType = classifyPublishError({
        message: errorMessage,
        statusCode: error?.response?.status,
        status: error?.response?.data?.status,
      })
      const isVideoViolation = errorType === "video_rejection"
      const isImageViolation = errorType === "image_rejection"
      const isContentModerationRejection = errorType === "content_rejection"

      if (
        isVideoViolation ||
        isImageViolation ||
        isContentModerationRejection
      ) {
        await waitForReviewWindow()
        setSubmissionOutcome({
          status: "needs_update",
          projectId: createdProjectId,
          projectSlug: createdProjectSlug,
        })
        setIsProjectSubmitted(true)
      } else {
        setSubmissionOutcome(null)
        setIsProjectSubmitted(false)
      }

      toast({
        title: isVideoViolation
          ? `Project rejected: video violated moderation policy. ${errorMessage}`
          : isImageViolation
            ? `Project rejected: image violated moderation policy. ${errorMessage}`
            : isContentModerationRejection
              ? `Project rejected: content did not meet community guidelines. ${errorMessage}`
              : errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="h-[78px] z-40 fixed left-0 min-[1024px]:left-[260px] bottom-0 right-0 bg-white border-b border-gray-200">
      <Progress value={progressValue} bubble={false} />
      <div className="flex h-[70px] items-center justify-between py-[15px] pr-[17px] pl-[32px]">
        <span className="text-xs leading-[18px] font-semibold text-gray-700">
          {progressValue}% Complete
        </span>

        <div className="flex items-center gap-x-6">
          {hasPreviousStep && (
            <Button variant="outlined" onClick={prevStep}>
              <ChevronLeft className="size-[15px]" />
              Previous
            </Button>
          )}
          {hasNextStep ? (
            <Button
              onClick={() => {
                if (isValid) {
                  nextStep()
                } else {
                  onNextClick?.() // show errors on the current step
                }
              }}
            >
              Next <ChevronRight className="size-[15px]" />
            </Button>
          ) : (
            <Button
              disabled={!isValid}
              onClick={() => {
                handleSubmit()
              }}
            >
              Submit Project
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const ProjectInfoTip = ({
  closeTrigger,
  showArrow,
  className,
}: {
  closeTrigger?: React.ReactNode
  showArrow?: boolean
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
        <span className="text-xs leading-normal text-black/60">
          Show the outcome, audience, and value.
        </span>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <CheckCircle className="size-5 shrink-0 text-primary-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Outcome first
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-normal text-gray-500">
            Name the deliverable, who it helps, and the result it creates. If
            someone only reads the first two lines, they should still understand
            the value.
          </span>
        </div>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <CheckCircle className="size-5 shrink-0 text-primary-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Proof over filler
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-normal text-gray-500">
            Include scope, constraints, tools, timeline, or measurable impact.
            Specific tags and skills improve search visibility and help the
            right collaborators self-select.
          </span>
        </div>
      </div>
    </div>
  )
}

const projectInfoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .regex(
      /^[A-Za-z0-9 -]+$/,
      "Title can only contain letters, numbers, spaces, and hyphens."
    )
    .min(10, "Please enter at least 10 character(s)")
    .max(120, "Please do not enter more than 120 character(s)"),
  category: z
    .array(
      z
        .object({
          category: z.string().default(""),
          subCategories: z
            .array(z.string())
            .max(5, "You can add a maximum of five (5) sub-categories."),
        })
        .superRefine((value, ctx) => {
          const selectedCategory = value.category.trim()
          const selectedSubCategories = value.subCategories.filter(
            (subCategory) => subCategory.trim()
          )

          if (!selectedCategory) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["category"],
              message: "Please select a category",
            })
            return
          }

          if (!selectedSubCategories.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["subCategories"],
              message:
                "Please select at least 1 sub-category for this category",
            })
          }
        })
    )
    .length(3, "Please select all required categories"),
  industry: z
    .array(z.string(), {
      required_error: "Please enter/select at least 1 industry(s)",
    })
    .min(1, "Please enter at least 1 industry(s)")
    .max(5, "Please do not enter more than 5 industry(s)"),
  // PMCM-255: settled at max 300, no minimum — required just means
  // non-empty (after trim).
  shortDescription: z
    .string()
    .trim()
    .min(1, "Short description is required.")
    .max(300, "Please do not enter more than 300 character(s)"),
  fullDescription: z.string().superRefine((value, ctx) => {
    const contentLength = getRichTextCharacterCount(value)

    if (contentLength < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: "Full description is required.",
      })
    }

    if (contentLength > FULL_DESCRIPTION_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: FULL_DESCRIPTION_MAX_LENGTH,
        type: "string",
        inclusive: true,
        message: "Please do not enter more than 2,000 character(s)",
      })
    }
  }),
  tags: z
    .array(z.string(), {
      required_error: "Please add at least three tags",
    })
    .min(3, "Please add at least three tags")
    .max(10, "Please do not enter/select more than 10 tag(s)"),
  skills: z
    .array(z.string(), {
      required_error: "Please add at least three skills",
    })
    .min(3, "Please add at least three skills")
    .max(10, "Please do not enter/select more than 10 tag(s)"),
  projectType: z.string().default("Website"),
})

type ProjectInfoFormValues = z.infer<typeof projectInfoSchema>

const PROJECT_INFO_PROGRESS_FIELDS: Array<keyof ProjectInfoFormValues> = [
  "title",
  "category",
  "industry",
  "shortDescription",
  "fullDescription",
  "tags",
  "skills",
]

// PMCM-253 follow-up: which of the three Project Info tabs each field lives
// on — TabsContent (components/ui/tabs) unmounts inactive tab panels
// entirely (not just display:none), so a field's own targetId div doesn't
// exist in the DOM at all until its tab is the active one. `tab` lets the
// publish-validation jump below switch tabs before it scrolls/focuses.
type ProjectInfoTab = "basic-info" | "description" | "project-details"

const PROJECT_INFO_VALIDATION_TARGETS: Array<{
  name: FieldPath<ProjectInfoFormValues>
  targetId: string
  tab: ProjectInfoTab
}> = [
  { name: "title", targetId: "publish-project-title-field", tab: "basic-info" },
  {
    name: "category.0.category",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "category.0.subCategories",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "category.1.category",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "category.1.subCategories",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "category.2.category",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "category.2.subCategories",
    targetId: "publish-project-category-field",
    tab: "basic-info",
  },
  {
    name: "industry",
    targetId: "publish-project-industry-field",
    tab: "project-details",
  },
  {
    name: "shortDescription",
    targetId: "publish-project-short-description-field",
    tab: "description",
  },
  {
    name: "fullDescription",
    targetId: "publish-project-full-description-field",
    tab: "description",
  },
  { name: "tags", targetId: "publish-project-tags-field", tab: "project-details" },
  {
    name: "skills",
    targetId: "publish-project-skills-field",
    tab: "project-details",
  },
]

const PROJECT_INFO_TAB_TRIGGER_IDS: Record<ProjectInfoTab, string> = {
  "basic-info": "publish-project-info-tab-basic-info",
  description: "publish-project-info-tab-description",
  "project-details": "publish-project-info-tab-project-details",
}

// PMCM-253 follow-up: switches to the field's own tab first (a plain
// .click() — Tabs' useControllableState picks it up like any other click,
// no prop drilling needed since this only ever runs from an effect, not
// render), then waits a frame for that tab's content to mount before
// focusing/scrolling the field itself. A single rAF is what
// scrollToWizardField already relies on elsewhere in this file for the
// same click-then-render sequencing.
const focusAndScrollProjectInfoField = (
  methods: UseFormReturn<ProjectInfoFormValues>,
  target: { name: FieldPath<ProjectInfoFormValues>; targetId: string; tab: ProjectInfoTab }
) => {
  if (typeof window === "undefined") return
  document.getElementById(PROJECT_INFO_TAB_TRIGGER_IDS[target.tab])?.click()
  window.requestAnimationFrame(() => {
    methods.setFocus(target.name)
    document.getElementById(target.targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  })
}

const scrollToPublishField = (targetId: string) => {
  if (typeof window === "undefined") return

  window.requestAnimationFrame(() => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  })
}

// PMCM-252/N2: sidebar sub-item → field-group anchor, for every sub-item
// that doesn't already have a more specific click behavior (Project
// Scope's "Task Name" opens the task-search dialog; every Team sub-item
// already switches teamSubTab — both left as they are). The Questions
// targets are RadixTabs.Trigger buttons (uncontrolled tabs), so the
// shared helper below also clicks the element when it's a button, to
// actually switch to that tab, not just scroll to its (already visible)
// trigger.
const SIDEBAR_SUB_ITEM_TARGET_IDS: Record<string, string> = {
  title: "publish-project-title-field",
  shortDescription: "publish-project-short-description-field",
  tags: "publish-project-tags-field",
  featuredImages: "publish-project-featured-images-field",
  additionalImages: "publish-project-additional-images-field",
  featuredVideo: "publish-project-featured-video-field",
  role: "publish-project-scope-table-field",
  location: "publish-project-scope-table-field",
  experience: "publish-project-scope-table-field",
  duration: "publish-project-scope-table-field",
  faqs: "publish-project-faqs-field",
  recentQuestions: "publish-project-recent-questions-field",
}

const scrollToWizardField = (targetId: string) => {
  if (typeof window === "undefined") return
  const el = document.getElementById(targetId)
  if (el instanceof HTMLButtonElement) el.click()
  window.requestAnimationFrame(() => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  })
}

// PMCM-254/PMCM-403: TITLE_MAX_LENGTH/TITLE_MAX_LENGTH_ERROR now come from
// the shared src/lib/my-listings module (import above) so the dashboard's
// inline rename reuses this exact rule instead of a third copy.
// PMCM-255: settled at max 300 / 2,000, no minimum on either field.
const SHORT_DESCRIPTION_MAX_LENGTH = 300
const FULL_DESCRIPTION_MAX_LENGTH = 2000
const SHORT_DESCRIPTION_MAX_LENGTH_ERROR =
  "Please do not enter more than 300 character(s)"
const FULL_DESCRIPTION_MAX_LENGTH_ERROR =
  "Please do not enter more than 2,000 character(s)"

const FALLBACK_CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Graphic Design",
  "Software Engineering",
  "Product Design",
  "Frontend Development",
  "Backend Development",
  "Data Science",
  "Artificial Intelligence",
  "Cloud Computing",
  "Cybersecurity",
]

const MAX_SUBCATEGORIES_PER_CATEGORY = 5
const SUBCATEGORY_LIMIT_ERROR =
  "You can add a maximum of five (5) sub-categories."

const FALLBACK_SUBCATEGORY_OPTIONS = options.value
const FALLBACK_INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Media",
  "Real Estate",
  "Energy",
  "Transportation",
]
const FALLBACK_TAG_OPTIONS = [
  "Web App",
  "Mobile App",
  "AI",
  "Blockchain",
  "UI/UX",
  "SaaS",
  "Analytics",
  "Security",
  "E-commerce",
  "Automation",
]
const FALLBACK_SKILL_OPTIONS = [
  "Node.js",
  "JavaScript",
  "Wireframing",
  "React",
  "TypeScript",
  "Figma",
  "SQL",
  "Python",
  "UX Research",
  "API Integration",
]

const normalizeAutocompleteLabel = (item: AutocompleteTypeSuggestion) => {
  if ("value" in item && typeof item.value === "string") return item.value
  if ("label" in item && typeof item.label === "string") return item.label
  return ""
}

const getUniqueOptions = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  )

type SuggestedCategoryOption = {
  category: string
  subCategory: string
}

const DEFAULT_SUGGESTED_CATEGORIES: SuggestedCategoryOption[] = [
  { category: "Design", subCategory: "UI/UX Design" },
  { category: "Development", subCategory: "Mobile App" },
  { category: "Data Science", subCategory: "Machine Learning" },
]

const isActiveCategoryNode = (node: CategoryTreeNode) => node.approved

const collectCategoryDescendants = (
  node?: CategoryTreeNode
): CategoryTreeNode[] => {
  if (!node?.children?.length) return []

  return node.children.flatMap((child) => {
    const descendants = collectCategoryDescendants(child)
    return isActiveCategoryNode(child) ? [child, ...descendants] : descendants
  })
}

const collectSelectableCategories = (nodes: CategoryTreeNode[]) => {
  const secondLevelNodes = nodes.flatMap((node) =>
    (node.children ?? []).filter(isActiveCategoryNode)
  )

  return getIsNotEmpty(secondLevelNodes)
    ? secondLevelNodes
    : nodes.filter(isActiveCategoryNode)
}

const findSuggestedSubCategory = (node?: CategoryTreeNode): string | null => {
  const [firstDescendant] = collectCategoryDescendants(node)
  return firstDescendant?.name ?? null
}

const SUGGESTION_STOPWORDS = new Set([
  "the","and","for","with","your","our","that","this","from","into","over",
  "you","are","was","will","can","get","all","new","use","per","via",
])

const tokenizeForSuggestion = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !SUGGESTION_STOPWORDS.has(token))

const scoreCandidateAgainstTitle = (
  titleTokens: string[],
  candidateText: string
): number => {
  const candidateTokens = tokenizeForSuggestion(candidateText)
  let score = 0
  for (const candidateToken of candidateTokens) {
    for (const titleToken of titleTokens) {
      if (candidateToken === titleToken) {
        score += 2
        break
      }
      if (
        candidateToken.length >= 4 &&
        titleToken.length >= 4 &&
        (candidateToken.includes(titleToken) ||
          titleToken.includes(candidateToken))
      ) {
        score += 1
        break
      }
    }
  }
  return score
}

const suggestionsFromText = (
  text: string,
  nodes: CategoryTreeNode[]
): SuggestedCategoryOption[] => {
  const tokens = tokenizeForSuggestion(text)
  if (!tokens.length || !nodes.length) return []

  const scored: Array<SuggestedCategoryOption & { score: number }> = []
  for (const categoryNode of nodes) {
    if (!isActiveCategoryNode(categoryNode) || !categoryNode.name) continue
    const subs = (categoryNode.children ?? []).filter(isActiveCategoryNode)
    for (const sub of subs) {
      if (!sub.name || sub.name === categoryNode.name) continue
      const score = scoreCandidateAgainstTitle(
        tokens,
        `${categoryNode.name} ${sub.name}`
      )
      if (score > 0) {
        scored.push({
          category: categoryNode.name,
          subCategory: sub.name,
          score,
        })
      }
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const seenCategories = new Set<string>()
  const result: SuggestedCategoryOption[] = []
  for (const item of scored) {
    if (seenCategories.has(item.category)) continue
    seenCategories.add(item.category)
    result.push({ category: item.category, subCategory: item.subCategory })
  }
  return result
}

const indexCategoryTreeByName = (nodes: CategoryTreeNode[]) => {
  const index = new Map<string, CategoryTreeNode>()

  const visit = (entries: CategoryTreeNode[]) => {
    entries.forEach((entry) => {
      if (isActiveCategoryNode(entry)) {
        index.set(entry.name, entry)
      }
      if (entry.children?.length) {
        visit(entry.children)
      }
    })
  }

  visit(nodes)
  return index
}
type ProjectInfoProps = {
  setProgress?: (val: number) => void
}

const ProjectInfo = ({
  setProgress,
}: {
  setProgress?: (val: number) => void
}) => {
  const { toggleValidation } = useStepContext()
  const methods = useProjectInfoContext()
  const {
    formState: { errors },
    setValue,
    trigger,
  } = methods

  const projectType = methods.watch("projectType") ?? "Website"
  const setProjectType = (value: string) => setValue("projectType", value)

  const [suggested, setSuggested] = useState<SuggestedCategoryOption[]>(
    DEFAULT_SUGGESTED_CATEGORIES
  )

  const [showSuggestions] = useState(true)
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>(
    FALLBACK_CATEGORY_OPTIONS
  )
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([])
  const [industryOptions, setIndustryOptions] = useState<string[]>(
    FALLBACK_INDUSTRY_OPTIONS
  )
  const [tagOptions, setTagOptions] = useState<string[]>(FALLBACK_TAG_OPTIONS)
  const [skills, setSkills] = useState<string[]>(FALLBACK_SKILL_OPTIONS)
  const [suggestedSkillOptions, setSuggestedSkillOptions] =
    useState<string[]>(FALLBACK_SKILL_OPTIONS)
  const skillsSuggestRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skillsRequestRef = useRef(0)
  const categoryRequestRef = useRef(0)
  const categoryDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const typeRequestRef = useRef(0)
  const typeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const onSubmit: SubmitHandler<ProjectInfoFormValues> = (values) => {}
  const projectInfoValues = useWatch({ control: methods.control })
  const isProjectInfoValid =
    projectInfoSchema.safeParse(projectInfoValues).success
  useIsomorphicLayoutEffect(() => {
    toggleValidation(isProjectInfoValid)
  }, [isProjectInfoValid])

  useEffect(() => {
    const description =
      plainTextFromRichTextHtml(projectInfoValues.fullDescription ?? "").trim() ||
      (projectInfoValues.shortDescription ?? "").trim()
    const category = projectInfoValues.category?.[0]?.category?.trim() || undefined
    const tags = projectInfoValues.tags ?? []
    if (!description && !category && tags.length === 0) return
    if (skillsSuggestRef.current) clearTimeout(skillsSuggestRef.current)
    skillsSuggestRef.current = setTimeout(async () => {
      const requestId = ++skillsRequestRef.current
      try {
        const res = await ProjectAPI.SuggestSkills({ description, category, tags })
        if (requestId !== skillsRequestRef.current) return
        const nextSkills = Array.isArray(res?.data?.skills)
          ? (res.data.skills as string[])
          : []
        if (nextSkills.length > 0) {
          setSuggestedSkillOptions(
            Array.from(new Set([...nextSkills, ...FALLBACK_SKILL_OPTIONS]))
          )
        }
      } catch {
        // keep fallback options
      }
    }, 700)
    return () => {
      if (skillsSuggestRef.current) clearTimeout(skillsSuggestRef.current)
    }
  }, [
    projectInfoValues.fullDescription,
    projectInfoValues.shortDescription,
    projectInfoValues.category,
    projectInfoValues.tags,
  ])

  const categoryValues = useWatch({
    control: methods.control,
    name: "category",
  })
  const categoryNodesByName = useMemo(() => {
    return indexCategoryTreeByName(categoryTree)
  }, [categoryTree])
  const getSubCategoryOptionsForCategory = useCallback(
    (categoryName?: string, query = "") => {
      if (!categoryName) return []

      const normalizedQuery = query.trim().toLowerCase()
      const activeNode = categoryNodesByName.get(categoryName)
      const sourceNodes = activeNode
        ? collectCategoryDescendants(activeNode)
        : []

      return getUniqueOptions(
        sourceNodes
          .map((node) => node.name)
          .filter((name) =>
            normalizedQuery
              ? name.toLowerCase().includes(normalizedQuery)
              : true
          )
      )
    },
    [categoryNodesByName, categoryTree]
  )
  const handleSubCategoryChange = useCallback(
    (
      fieldName: `category.${0 | 1 | 2}.subCategories`,
      onChange: (value: string[]) => void
    ) =>
      (details: { value: string[] }) => {
        if (details.value.length > MAX_SUBCATEGORIES_PER_CATEGORY) {
          methods.setError(fieldName, {
            type: "manual",
            message: SUBCATEGORY_LIMIT_ERROR,
          })
          return
        }

        methods.clearErrors(fieldName)
        onChange(details.value)
        void methods.trigger(fieldName)
      },
    [methods]
  )
  const handleCategorySelection = useCallback(
    (
      index: 0 | 1 | 2,
      categoryName: string,
      onChange: (value: string) => void
    ) => {
      onChange(categoryName)
      setActiveCategoryIndex(index)

      const availableSubCategories =
        getSubCategoryOptionsForCategory(categoryName)
      setSubCategoryOptions(availableSubCategories)

      const fieldName = `category.${index}.subCategories` as const
      const currentSubCategories = methods.getValues(fieldName) ?? []
      const nextSubCategories = currentSubCategories.filter((value) =>
        availableSubCategories.includes(value)
      )

      if (nextSubCategories.length !== currentSubCategories.length) {
        methods.setValue(fieldName, nextSubCategories, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        })
      }

      methods.clearErrors(`category.${index}.category`)
      methods.clearErrors(`category.${index}.subCategories`)
    },
    [getSubCategoryOptionsForCategory, methods]
  )

  const completedProjectInfoFields = PROJECT_INFO_PROGRESS_FIELDS.filter(
    (fieldName) =>
      projectInfoSchema.shape[fieldName].safeParse(
        projectInfoValues?.[fieldName]
      ).success
  ).length
  const progressValue = Math.max(
    0,
    Math.min(
      33,
      Math.round(
        (completedProjectInfoFields / PROJECT_INFO_PROGRESS_FIELDS.length) * 33
      )
    )
  )
  const titleCharacterCount = projectInfoValues.title?.length || 0
  const titleHasError = hookFormHasError({
    errors,
    name: "title",
  })
  const shortDescriptionHasError = hookFormHasError({
    errors,
    name: "shortDescription",
  })
  const fullDescriptionHasError = hookFormHasError({
    errors,
    name: "fullDescription",
  })
  const fullDescriptionCharacterCount = getRichTextCharacterCount(
    projectInfoValues.fullDescription ?? ""
  )
  // PMCM-255 (follow-up): RichTextEditor only resyncs from `defaultValue`
  // when the user isn't actively editing it (rich-text-editor.tsx's
  // `!isEditing && !isFullscreenOpen` guard on its own resync effect), so
  // skipping a form-state commit while typing does nothing to stop the
  // seller from typing past the limit — the editor just keeps going on its
  // own internal state. Enforcement now happens at the DOM level (the
  // onBeforeInputCapture/onPasteCapture/onDropCapture wrapper around the
  // editor below); this ref gives those capture-phase handlers a
  // synchronous, always-current character count to check against (a
  // closure over `fullDescriptionCharacterCount` state could be stale).
  const fullDescriptionLiveCountRef = useRef(fullDescriptionCharacterCount)
  useEffect(() => {
    fullDescriptionLiveCountRef.current = fullDescriptionCharacterCount
  }, [fullDescriptionCharacterCount])
  const shortDescriptionField = methods.register("shortDescription", {
    onBlur: () => trigger("shortDescription"),
  })

  const triggerMaxLengthError = useCallback(
    (
      fieldName: "title" | "shortDescription" | "fullDescription",
      message: string
    ) => {
      methods.setError(fieldName, {
        type: "manual",
        message,
      })
    },
    [methods]
  )

  const shouldBlockMaxLengthInput = useCallback(
    (
      event:
        | React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
        | React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      currentLength: number,
      maxLength: number
    ) => {
      const selectionLength =
        event.currentTarget.selectionEnd !== null &&
        event.currentTarget.selectionStart !== null
          ? event.currentTarget.selectionEnd -
            event.currentTarget.selectionStart
          : 0

      if ("key" in event) {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.key.length !== 1
        ) {
          return false
        }

        return currentLength - selectionLength >= maxLength
      }

      const pastedText = event.clipboardData.getData("text")
      return currentLength - selectionLength + pastedText.length > maxLength
    },
    []
  )

  const fetchCategoriesAutocomplete = useCallback(
    (index: 0 | 1 | 2, query: string) => {
      const trimmedQuery = query.trim()
      setActiveCategoryIndex(index)
      const activeCategoryName = Array.isArray(categoryValues)
        ? categoryValues[index]?.category
        : undefined
      const fallbackOptions =
        getSubCategoryOptionsForCategory(activeCategoryName)

      if (!activeCategoryName) {
        setSubCategoryOptions([])
        return
      }

      if (!trimmedQuery) {
        setSubCategoryOptions(fallbackOptions)
        return
      }
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current)
      }

      categoryDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++categoryRequestRef.current

        try {
          const response = await AutocompleteAPI.getCategories(trimmedQuery)
          if (currentRequestId !== categoryRequestRef.current) return

          const values: AutocompleteCategorySuggestion[] = Array.isArray(
            response?.data
          )
            ? response.data
            : []

          const scopedSubCategoryOptions =
            getSubCategoryOptionsForCategory(activeCategoryName)
          const allowedSubCategories = new Set(
            scopedSubCategoryOptions.map((value) => value.toLowerCase())
          )
          const hasScopedSubCategories = allowedSubCategories.size > 0
          const matchingSubCategories = getUniqueOptions(
            values
              .filter((item) => item.type === "subcategory")
              .map((item) => item.value.trim())
              .filter((value) =>
                activeCategoryName && hasScopedSubCategories
                  ? allowedSubCategories.has(value.toLowerCase())
                  : true
              )
          )

          setSubCategoryOptions(
            getIsNotEmpty(matchingSubCategories)
              ? matchingSubCategories
              : getSubCategoryOptionsForCategory(
                  activeCategoryName,
                  trimmedQuery
                )
          )
        } catch (error) {
          setSubCategoryOptions(
            getSubCategoryOptionsForCategory(activeCategoryName, trimmedQuery)
          )
        }
      }, 250)
    },
    [categoryValues, getSubCategoryOptionsForCategory]
  )

  const fetchTypeAutocomplete = useCallback(
    (type: string, query: string, onSuccess: (options: string[]) => void) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) return
      if (typeDebounceTimerRef.current) {
        clearTimeout(typeDebounceTimerRef.current)
      }

      typeDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++typeRequestRef.current
        try {
          const response = await AutocompleteAPI.getByType(type, trimmedQuery)
          if (currentRequestId !== typeRequestRef.current) return

          const values: AutocompleteTypeSuggestion[] = Array.isArray(
            response?.data
          )
            ? response.data
            : []
          const normalizedOptions = getUniqueOptions(
            values.map((item) => normalizeAutocompleteLabel(item))
          )
          if (getIsNotEmpty(normalizedOptions)) {
            onSuccess(normalizedOptions)
          }
        } catch (error) {
          // Keep fallback options when endpoint is not ready.
        }
      }, 250)
    },
    []
  )
  useEffect(() => {
    const loadCategoryTree = async () => {
      try {
        const response = await CategoryAPI.getTree()
        const nodes: CategoryTreeNode[] = Array.isArray(response?.data)
          ? response.data
          : []
        const selectableCategories = collectSelectableCategories(nodes)
        const nextCategoryOptions = getUniqueOptions(
          selectableCategories.map((node) => node.name)
        )
        const nextSuggested = nodes
          .filter(isActiveCategoryNode)
          .map((node) => {
            const sub = (node.children ?? []).filter(isActiveCategoryNode)[0]
            return sub?.name && node.name
              ? { category: node.name, subCategory: sub.name }
              : null
          })
          .filter((value): value is SuggestedCategoryOption => value !== null)

        setCategoryTree(nodes)
        if (getIsNotEmpty(nextCategoryOptions)) {
          setCategoryOptions(nextCategoryOptions)
        }
        if (getIsNotEmpty(nextSuggested)) {
          setSuggested(nextSuggested)
        }
      } catch (error) {
        // Keep fallback options when category-service is unavailable.
      }
    }

    void loadCategoryTree()

    return () => {
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current)
      }
      if (typeDebounceTimerRef.current) {
        clearTimeout(typeDebounceTimerRef.current)
      }
    }
  }, [])
  useEffect(() => {
    const activeCategoryName = Array.isArray(categoryValues)
      ? categoryValues[activeCategoryIndex]?.category
      : undefined

    setSubCategoryOptions(getSubCategoryOptionsForCategory(activeCategoryName))
  }, [activeCategoryIndex, categoryValues, getSubCategoryOptionsForCategory])
  // NEW: Report progress to parent whenever it changes
  useEffect(() => {
    setProgress?.(progressValue) //calls the prop passed from PublishProject
  }, [progressValue, setProgress])

  const suggestedSkills = suggestedSkillOptions.filter(
    (value) => !projectInfoValues.skills?.includes(value)
  )
  const suggestedSkillsForDisplay = suggestedSkills.slice(0, 3)
  const activeCategory = Array.isArray(categoryValues)
    ? categoryValues[activeCategoryIndex]
    : null
  const getAvailableCategoriesForIndex = useCallback(
    (index: number, currentValue?: string) => {
      const selectedCategories = Array.isArray(categoryValues)
        ? categoryValues
            .map((item, itemIndex) =>
              itemIndex === index ? null : item?.category?.trim()
            )
            .filter(
              (item): item is string =>
                typeof item === "string" && item.length > 0
            )
        : []

      return categoryOptions.filter(
        (category) =>
          category === currentValue || !selectedCategories.includes(category)
      )
    },
    [categoryOptions, categoryValues]
  )
  const selectedSuggestedPairs = useMemo(
    () =>
      new Set(
        (Array.isArray(categoryValues) ? categoryValues : []).flatMap((item) =>
          item?.category && Array.isArray(item.subCategories)
            ? item.subCategories.map(
                (subCategory) => `${item.category}::${subCategory}`
              )
            : []
        )
      ),
    [categoryValues]
  )
  const selectedCategoryNames = useMemo(
    () =>
      new Set(
        (Array.isArray(categoryValues) ? categoryValues : [])
          .map((item) => item?.category?.trim())
          .filter(
            (category): category is string =>
              typeof category === "string" && category.length > 0
          )
      ),
    [categoryValues]
  )
  const derivedSuggestions = useMemo(() => {
    const enteredNames = (Array.isArray(categoryValues) ? categoryValues : [])
      .map((item) => item?.category?.trim())
      .filter((name): name is string => Boolean(name))
      .join(" ")
    return suggestionsFromText(
      `${projectType} ${enteredNames}`.trim(),
      categoryTree
    )
  }, [projectType, categoryValues, categoryTree])
  const suggestedForDisplay = useMemo(() => {
    const seenCategories = new Set(selectedCategoryNames)
    const result: SuggestedCategoryOption[] = []
    for (const item of [...derivedSuggestions, ...suggested]) {
      if (item.category === item.subCategory) continue
      if (seenCategories.has(item.category)) continue
      if (selectedSuggestedPairs.has(`${item.category}::${item.subCategory}`))
        continue
      seenCategories.add(item.category)
      result.push(item)
      if (result.length >= 3) break
    }
    return result
  }, [
    derivedSuggestions,
    suggested,
    selectedCategoryNames,
    selectedSuggestedPairs,
  ])

  return (
    <form className="contents" onSubmit={methods.handleSubmit(onSubmit)}>
      <ScrollArea
        className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row gap-y-10 min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    Show the outcome, audience, and value.
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" type="button">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <ProjectInfoTip
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

          <div className="flex-auto min-w-0">
            <Tabs defaultValue="basic-info">
              <TabsList className="px-0 pt-0 gap-6">
                <TabsTrigger id="publish-project-info-tab-basic-info" value="basic-info">
                  Basic Info
                </TabsTrigger>
                <TabsTrigger id="publish-project-info-tab-description" value="description">
                  Description
                </TabsTrigger>
                <TabsTrigger
                  id="publish-project-info-tab-project-details"
                  value="project-details"
                >
                  Project Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic-info">
                <div
                  id="publish-project-title-field"
                  className="space-y-1.5 mt-6 mb-6"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="title"
                    >
                      Title
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Write a title that accurately describes your project
                        scope for the marketplace.
                      </HelperText>

                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {titleCharacterCount}/{TITLE_MAX_LENGTH}
                      </span>
                    </div>
                  </div>

                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter Title"
                    value={projectInfoValues.title ?? ""}
                    maxLength={TITLE_MAX_LENGTH}
                    onChange={(event) => {
                      methods.setValue(
                        "title",
                        event.target.value.slice(0, TITLE_MAX_LENGTH),
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: false,
                        }
                      )
                      if (
                        titleHasError &&
                        get(errors, "title.type") === "manual"
                      ) {
                        methods.clearErrors("title")
                      }
                    }}
                    onBlur={() => void methods.trigger("title")}
                    onKeyDown={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          projectInfoValues.title?.length || 0,
                          TITLE_MAX_LENGTH
                        )
                      ) {
                        event.preventDefault()
                        triggerMaxLengthError("title", TITLE_MAX_LENGTH_ERROR)
                      }
                    }}
                    onPaste={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          projectInfoValues.title?.length || 0,
                          TITLE_MAX_LENGTH
                        )
                      ) {
                        event.preventDefault()
                        triggerMaxLengthError("title", TITLE_MAX_LENGTH_ERROR)
                      }
                    }}
                    isInvalid={titleHasError}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="title"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div
                  id="publish-project-type-field"
                  className="space-y-1.5 mt-6 mb-6"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                    >
                      Project Type
                    </Label>
                    <HelperText size="sm">
                      Select the category that best represents your project
                      scope.
                    </HelperText>
                  </div>

                  <div className="max-w-[202px]">
                    <Listbox value={projectType} onChange={setProjectType}>
                      <ListboxButton
                        placeholder="Select Type"
                        className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start border border-gray-300 rounded-[5px]"
                      >
                        {({ value }) => (
                          <span className="truncate block">
                            {(PROJECT_TYPE_OPTIONS as readonly string[]).includes(
                              value
                            )
                              ? value
                              : "Select Type"}
                          </span>
                        )}
                      </ListboxButton>
                      <ListboxOptions>
                        {PROJECT_TYPE_OPTIONS.map((option) => (
                          <ListboxOption key={option} value={option}>
                            {option}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Listbox>
                  </div>
                </div>

                <div
                  id="publish-project-category-field"
                  className="space-y-6 mt-0"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="email"
                      asChild
                    >
                      <span>Category</span>
                    </Label>

                    <HelperText size="sm">
                      Select categories that best fit your project scope for
                      easier discovery.
                    </HelperText>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      1
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.0.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(0, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(0)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(0, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  )
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.0.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field }, fieldState }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.0.subCategories",
                              onChange
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl
                                    className={cn(
                                      "relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px] border px-[14px] py-[10px] m-0",
                                      fieldState.error
                                        ? "border-error-300"
                                        : "border-gray-300"
                                    )}
                                  >
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      options={subCategoryOptions}
                                      allowCreateOption
                                      className="flex-1 min-w-[100px] "
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(0, value)
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(0)
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[0]?.category
                                          )
                                        )
                                      }}
                                    />
                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.0.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.0.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.0.category.message") ||
                            get(errors, "category.0.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      2
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.1.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(1, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(1)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(1, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  )
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.1.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field }, fieldState }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.1.subCategories",
                              onChange
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl
                                    className={cn(
                                      "relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px] border px-[14px] py-[10px] m-0",
                                      fieldState.error
                                        ? "border-error-300"
                                        : "border-gray-300"
                                    )}
                                  >
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      options={subCategoryOptions}
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      allowCreateOption
                                      className="flex-1 min-w-[100px]"
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(1, value)
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(1)
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[1]?.category
                                          )
                                        )
                                      }}
                                    />

                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.1.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.1.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.1.category.message") ||
                            get(errors, "category.1.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      3
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.2.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(2, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(2)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(2, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  )
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.2.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field }, fieldState }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.2.subCategories",
                              onChange
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl
                                    className={cn(
                                      "relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px] border px-[14px] py-[10px] m-0",
                                      fieldState.error
                                        ? "border-error-300"
                                        : "border-gray-300"
                                    )}
                                  >
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      options={subCategoryOptions}
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      allowCreateOption
                                      className="flex-1 min-w-[100px]"
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(2, value)
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(2)
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[2]?.category
                                          )
                                        )
                                      }}
                                    />

                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.2.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.2.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.2.category.message") ||
                            get(errors, "category.2.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>
                </div>

                {showSuggestions && (
                  <div className="mt-6 space-y-1.5">
                    <span className="block text-xs leading-5 text-dark-blue-400">
                      Suggested Categories
                    </span>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                      {suggestedForDisplay.map(({ category, subCategory }) => (
                        <Badge
                          size="md"
                          className="pr-2 focus-visible:outline-none text-primary-500 bg-primary-50"
                          visual="primary"
                          asChild
                          key={category}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const indexToUpdate = activeCategoryIndex

                              // write values and mark as user-driven so Sidebar shows the checkmark
                              setValue(
                                `category.${indexToUpdate}.category`,
                                category,
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                }
                              )
                              setValue(
                                `category.${indexToUpdate}.subCategories`,
                                [subCategory],
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                }
                              )

                              // validate that slot
                              trigger(`category.${indexToUpdate}`)

                              // keep suggestions visible for subsequent category slots
                            }}
                          >
                            {category} / {subCategory}
                            <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="description">
                <div
                  id="publish-project-short-description-field"
                  className="space-y-1.5 mt-6"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="short-description"
                    >
                      Short Description
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Provide a brief overview of your project scope.
                      </HelperText>

                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {projectInfoValues.shortDescription?.length || 0}/
                        {SHORT_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                  </div>

                  <Textarea
                    id="short-description"
                    placeholder="Enter a description..."
                    maxLength={SHORT_DESCRIPTION_MAX_LENGTH}
                    {...shortDescriptionField}
                    onChange={(event) => {
                      shortDescriptionField.onChange(event)
                      if (
                        shortDescriptionHasError &&
                        get(errors, "shortDescription.type") === "manual"
                      ) {
                        methods.clearErrors("shortDescription")
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          event.currentTarget.value.length,
                          SHORT_DESCRIPTION_MAX_LENGTH
                        )
                      ) {
                        event.preventDefault()
                        triggerMaxLengthError(
                          "shortDescription",
                          SHORT_DESCRIPTION_MAX_LENGTH_ERROR
                        )
                      }
                    }}
                    onPaste={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          event.currentTarget.value.length,
                          SHORT_DESCRIPTION_MAX_LENGTH
                        )
                      ) {
                        event.preventDefault()
                        triggerMaxLengthError(
                          "shortDescription",
                          SHORT_DESCRIPTION_MAX_LENGTH_ERROR
                        )
                      }
                    }}
                    isInvalid={shortDescriptionHasError}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="shortDescription"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div
                  id="publish-project-full-description-field"
                  className="space-y-1.5 mt-6"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="full-description"
                    >
                      Full Description
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Provide a comprehensive description of this project,
                        including its purpose and features.
                      </HelperText>

                      <span
                        className={cn(
                          "text-xs leading-[14.52px]",
                          fullDescriptionCharacterCount >=
                            FULL_DESCRIPTION_MAX_LENGTH
                            ? "text-error-500"
                            : "text-gray-500"
                        )}
                      >
                        {fullDescriptionCharacterCount}/
                        {FULL_DESCRIPTION_MAX_LENGTH.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Controller
                    name="fullDescription"
                    control={methods.control}
                    render={({ field }) => (
                      // PMCM-255 (follow-up): capture-phase guard — fires
                      // before the event reaches the editor's own
                      // contenteditable, so it blocks input without
                      // touching the frozen RichTextEditor component.
                      // Single-character typing is blocked once already at
                      // the limit (liveCount >= max); paste/drop are
                      // checked precisely against the text they'd actually
                      // insert, since a multi-character paste can cross the
                      // limit from under it. Deletions are never blocked.
                      <div
                        onBeforeInputCapture={(event) => {
                          const inputType = event.nativeEvent.inputType
                          if (
                            inputType?.startsWith("insert") &&
                            fullDescriptionLiveCountRef.current >=
                              FULL_DESCRIPTION_MAX_LENGTH
                          ) {
                            event.preventDefault()
                          }
                        }}
                        onPasteCapture={(event) => {
                          const pastedText =
                            event.clipboardData.getData("text")
                          if (
                            fullDescriptionLiveCountRef.current +
                              pastedText.length >
                            FULL_DESCRIPTION_MAX_LENGTH
                          ) {
                            event.preventDefault()
                          }
                        }}
                        onDropCapture={(event) => {
                          const droppedText = event.dataTransfer.getData(
                            "text/plain"
                          )
                          if (
                            fullDescriptionLiveCountRef.current +
                              droppedText.length >
                            FULL_DESCRIPTION_MAX_LENGTH
                          ) {
                            event.preventDefault()
                          }
                        }}
                      >
                        <RichTextEditor
                          defaultValue={field.value ?? ""}
                          placeholder="<p class='text-gray-400'>Enter a description...</p>"
                          allowFullscreen
                          fullscreenHelperText="Provide a comprehensive description of this project, including its purpose and features."
                          fullscreenCharacterCount={fullDescriptionCharacterCount}
                          fullscreenMaxCharacterCount={FULL_DESCRIPTION_MAX_LENGTH}
                          className={cn(
                            "rounded-lg border bg-white transition-colors",
                            fullDescriptionHasError
                              ? "border-error-500"
                              : "border-gray-300 focus-within:border-primary-500"
                          )}
                          toolbarClassName="left-4"
                          editorClassName="min-h-[176px] w-full max-w-full min-w-0 overflow-x-hidden px-4 py-4 text-base leading-7 text-gray-700 break-words [overflow-wrap:anywhere] [word-break:break-word] [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-full [&_.ProseMirror]:min-w-0 [&_.ProseMirror]:overflow-x-hidden [&_.ProseMirror]:focus:outline-none [&_[data-font-size='large-heading']]:text-2xl [&_[data-font-size='large-heading']]:font-semibold [&_[data-font-size='large-heading']_strong]:font-bold [&_[data-font-size='normal-heading']]:text-xl [&_[data-font-size='normal-heading']]:font-semibold [&_[data-font-size='normal-heading']_strong]:font-bold [&_[data-font-size='small-heading']]:text-base [&_[data-font-size='small-heading']]:font-semibold [&_[data-font-size='small-heading']_strong]:font-bold [&_h1]:break-words [&_h1]:[word-break:break-word] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1_strong]:font-bold [&_h2]:break-words [&_h2]:[word-break:break-word] [&_h2]:text-xl [&_h2]:font-semibold [&_h2_strong]:font-bold [&_h3]:break-words [&_h3]:[word-break:break-word] [&_h3]:text-base [&_h3]:font-semibold [&_h3_strong]:font-bold [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain [&_li]:break-words [&_li]:[word-break:break-word] [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-7 [&_p]:min-h-[1.75rem] [&_p]:break-words [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_strong]:font-bold [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-7"
                          onUpdate={(html) => {
                            // PMCM-255 (follow-up): always commit the real
                            // HTML, even over the limit — form state must
                            // reflect what the seller actually sees, so the
                            // counter/error are truthful and nothing typed
                            // (and visible) is ever silently lost. Actual
                            // enforcement is the capture-phase wrapper above.
                            const contentLength =
                              getRichTextCharacterCount(html)
                            fullDescriptionLiveCountRef.current = contentLength
                            field.onChange(html)

                            if (contentLength > FULL_DESCRIPTION_MAX_LENGTH) {
                              triggerMaxLengthError(
                                "fullDescription",
                                FULL_DESCRIPTION_MAX_LENGTH_ERROR
                              )
                            } else if (
                              fullDescriptionHasError &&
                              get(errors, "fullDescription.message") ===
                                FULL_DESCRIPTION_MAX_LENGTH_ERROR
                            ) {
                              methods.clearErrors("fullDescription")
                            }
                          }}
                          onBlur={() => {
                            field.onBlur()
                            void trigger("fullDescription")
                          }}
                        />
                      </div>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="fullDescription"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="project-details">
                <div
                  id="publish-project-tags-field"
                  className="space-y-1.5 mt-6"
                >
                  <Controller
                    name="tags"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 10) {
                            methods.setError("tags", {
                              type: "manual",
                              message: "You can only add up to 10 tags",
                            })
                            return
                          }
                          onChange(details.value)
                          void methods.trigger("tags")
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Tags
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    Add up to 10 tags that best describe your
                                    project. Use relevant keywords to highlight
                                    its features and make it easier to find.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.tags?.length || 0}/10
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={tagOptions}
                                  placeholder="Add Tags"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "search_keywords",
                                      value,
                                      setTagOptions
                                    )
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="tags"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div
                  id="publish-project-skills-field"
                  className="space-y-1.5 mt-6"
                >
                  <Controller
                    name="skills"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 10) {
                            methods.setError("skills", {
                              type: "manual",
                              message: "You can only add up to 10 skills",
                            })
                            return
                          }
                          onChange(details.value)
                          void methods.trigger("skills")
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Skills
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    List up to 10 key skills or proficiencies
                                    required to implement this project
                                    effectively.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.skills?.length || 0}/10
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={skills}
                                  placeholder="Add Skills"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "skills",
                                      value,
                                      setSkills
                                    )
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="skills"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {getIsNotEmpty(suggestedSkillsForDisplay) ? (
                  <div className="mt-6 space-y-1.5">
                    <span className="block text-xs leading-5 text-dark-blue-400">
                      Suggested Skills
                    </span>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                      {suggestedSkillsForDisplay.map(
                        (suggestedSkill, index) => (
                          <Badge
                            size="md"
                            className="pr-2 bg-primary-50 focus-visible:outline-none text-primary-500"
                            visual="primary"
                            key={index}
                            asChild
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const next = projectInfoValues.skills
                                  ? [
                                      ...projectInfoValues.skills,
                                      suggestedSkill,
                                    ]
                                  : [suggestedSkill]

                                // tell RHF this field changed and should be validated
                                setValue("skills", next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }}
                            >
                              {suggestedSkill}
                              <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                            </button>
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                <div
                  id="publish-project-industry-field"
                  className="space-y-1.5 mt-6"
                >
                  <Controller
                    name="industry"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 5) {
                            methods.setError("industry", {
                              type: "manual",
                              message: "You can only add up to 5 industries",
                            })
                            return
                          }
                          onChange(details.value)
                          void methods.trigger("industry")
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Industries
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    Add up to 5 industries that align with your
                                    project scope for targeted visibility.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.industry?.length || 0}/5
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={industryOptions}
                                  placeholder="Add Industries"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "industries",
                                      value,
                                      setIndustryOptions
                                    )
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="industry"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectInfoTip showArrow />
          </div>
        </div>
      </ScrollArea>
    </form>
  )
}

interface MediaTipProps {
  showArrow?: boolean
  closeTrigger?: React.ReactNode
  className?: string
}
const MediaTip = ({ showArrow, closeTrigger, className }: MediaTipProps) => {
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
        <span className="text-xs leading-normal text-black/60">
          Strong visuals build trust at a glance.
        </span>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4">
          <li className="text-sm leading-normal text-gray-500">
            Upload a professional, high-quality image to represent your scope.
          </li>
          <li className="text-sm leading-normal text-gray-500 mt-5">
            Ensure it reflects the essence of your work and attracts attention
            in the marketplace.
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

        <div className="mt-3">
          <span className="text-sm leading-normal text-gray-500">
            Use impactful keywords that communicate value and make it easy to
            identify in a list of projects.
          </span>
        </div>
      </div>
    </div>
  )
}

const mediaFormSchema = z
  .object({
    featuredImages: z
      .array(
        z.object({
          meta: z.any(),
          progress: z.number(),
          hasError: z.boolean(),
        }),
        {
          required_error: "Please upload a file",
        }
      )
      .min(1, "Please at least upload 1 image(s)"),
    additionalImages: z.array(
      z
        .array(
          z.object({
            meta: z.any(),
            progress: z.number(),
            hasError: z.boolean(),
          }),
          {
            required_error: "Please upload a file",
          }
        )
        .optional()
    ),
    featuredVideo: z
      .string()
      .refine(
        (value) => {
          const rawValue = value?.trim()
          if (!rawValue) return true // allow empty value

          const normalized = /^https?:\/\//i.test(rawValue)
            ? rawValue
            : `https://${rawValue.replace(/^\/+/, "")}`

          try {
            const parsed = new URL(normalized)
            return (
              (parsed.protocol === "http:" || parsed.protocol === "https:") &&
              parsed.hostname.includes(".")
            )
          } catch {
            return false
          }
        },
        {
          // PMCM-256 follow-up: match the inline editor's copy exactly.
          message: "Please enter a valid YouTube or Vimeo URL.",
        }
      )
      .optional(),
    hiddenImages: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.featuredImages.every((value) => value.progress === 100),
    {
      message: "Please let the images get uploaded to the server",
      path: ["featuredImages"],
    }
  )
  .refine(
    (data) =>
      z
        .array(
          z
            .array(
              z.object({
                meta: z.any(),
                progress: z.literal(100),
                hasError: z.literal(false).optional(),
              })
            )
            .optional()
        )
        .safeParse(data.additionalImages).success,
    {
      message: "Please let the images get uploaded to the server",
      path: ["additionalImages"],
    }
  )
  .refine(
    (data) => {
      const additionalCount = (data.additionalImages ?? [])
        .flat()
        .filter((item) => item?.meta && item.progress === 100).length
      const hasVideo = Boolean(data.featuredVideo?.trim())
      return additionalCount >= (hasVideo ? 2 : 3)
    },
    {
      message:
        "Add at least 3 additional images, or a featured video and 2 images, to publish.",
      path: ["additionalImages"],
    }
  )

type MediaFormValues = {
  featuredImages: {
    progress: number
    hasError: boolean
    meta: any
  }[]
  additionalImages: {
    progress: number
    hasError: boolean
    meta: any
  }[][]
  featuredVideo: string
  hiddenImages?: string[]
}

const MEDIA_VALIDATION_TARGETS: Array<{
  name: FieldPath<MediaFormValues>
  targetId: string
}> = [
  { name: "featuredImages", targetId: "publish-project-featured-images-field" },
  {
    name: "additionalImages",
    targetId: "publish-project-additional-images-field",
  },
  { name: "featuredVideo", targetId: "publish-project-featured-video-field" },
]

// PMCM-253 follow-up: Media has no sub-tabs — a single rAF after the step
// itself is active is enough for the field's targetId div to be in the DOM.
const focusAndScrollMediaField = (
  methods: UseFormReturn<MediaFormValues>,
  target: { name: FieldPath<MediaFormValues>; targetId: string }
) => {
  if (typeof window === "undefined") return
  window.requestAnimationFrame(() => {
    methods.setFocus(target.name)
    document.getElementById(target.targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  })
}

type MediaProps = {
  setProgress?: (val: number) => void
}

const Media = ({ setProgress }: { setProgress?: (val: number) => void }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { toggleValidation } = useStepContext()
  const {
    control,
    formState: { errors, isValid, isSubmitted },
    setError,
    handleSubmit,
    trigger,
    setValue,
  } = useMediaContext()
  const { isExistingPublishedListing } = useProjectScopeContext()

  const formHiddenImages =
    (useWatch({ control, name: "hiddenImages" }) as string[] | undefined) ?? []
  const hiddenKey = formHiddenImages.join("|")
  const [hiddenImages, setHiddenImages] = useState<string[]>([])
  useEffect(() => {
    setHiddenImages(formHiddenImages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenKey])
  const setHiddenForUrl = (url: string, hidden: boolean) => {
    const next = hidden
      ? hiddenImages.includes(url)
        ? hiddenImages
        : [...hiddenImages, url]
      : hiddenImages.filter((u) => u !== url)
    setHiddenImages(next)
    setValue("hiddenImages", next, { shouldDirty: true })
  }

  const { currentStep } = useStepRootContext()
  const [progressValue, setProgressValue] = useState(0)

  const onSubmit: SubmitHandler<MediaFormValues> = (values) => {}

  const mediaValues = useWatch({ control: control })
  const isMediaValid = mediaFormSchema.safeParse(mediaValues).success
  const { error } = mediaFormSchema.safeParse(mediaValues)
  const featuredImage = useWatch({ control, name: "featuredImages" })
  const additionalImages = useWatch({ control, name: "additionalImages" })
  const featuredVideo = useWatch({ control, name: "featuredVideo" })

  const additionalUploadedCount = (additionalImages ?? [])
    .flat()
    .filter((item) => item?.meta && item?.progress === 100).length
  const hasFeaturedVideo = Boolean(featuredVideo?.trim())
  const mediaStarted = Boolean(
    (Array.isArray(featuredImage) && featuredImage.length > 0) ||
      additionalUploadedCount > 0 ||
      hasFeaturedVideo
  )
  const showMediaCountError =
    mediaStarted && additionalUploadedCount < (hasFeaturedVideo ? 2 : 3)

  useIsomorphicLayoutEffect(() => {
    toggleValidation(isMediaValid)
  }, [isMediaValid])

  const featuredImageRef = React.useRef(featuredImage)
  const progressValueRef = React.useRef(progressValue)

  useEffect(() => {
    featuredImageRef.current = featuredImage
  }, [featuredImage])

  useEffect(() => {
    progressValueRef.current = progressValue
  }, [progressValue])

  useEffect(() => {
    if (currentStep === 1) {
      let count = 0

      const allFeaturedUploaded =
        Array.isArray(featuredImage) &&
        featuredImage.length > 0 &&
        featuredImage.every((img) => img.progress === 100)

      const hasAdditionalImages =
        Array.isArray(additionalImages) &&
        additionalImages.some(
          (group) =>
            Array.isArray(group) && group.some((img) => img.progress === 100)
        )

      if (allFeaturedUploaded) count += 1
      if (hasAdditionalImages) count += 1
      if (featuredVideo) count += 1

      const percent = count * 11
      setProgressValue(percent)
      setProgress?.(percent)
    }
  }, [currentStep, featuredImage, additionalImages, featuredVideo, setProgress])

  useEffect(() => {
    return () => {
      // only when leaving the Media step
      if (currentStep !== 1) return

      const fi = featuredImageRef.current
      const allFeaturedUploaded =
        Array.isArray(fi) &&
        fi.length > 0 &&
        fi.every((img) => img.progress === 100)

      if (allFeaturedUploaded) {
        // bump Media to at least its full 33% share,
        // but don't reduce if user already reached 55/66
        const bumped = Math.max(progressValueRef.current ?? 0, 33)
        setProgressValue(bumped)
        setProgress?.(bumped)
      } else {
        setProgressValue(0)
        setProgress?.(0)
      }
    }
  }, [currentStep, setProgress])

  const ref = React.useRef(new Set<() => void>())

  useUnmountEffect(() => {
    ref.current.forEach((cb) => cb())
    ref.current.clear()
  })
  //Report progress to parent whenever it changes
  useEffect(() => {
    setProgress?.(progressValue)
  }, [progressValue, setProgress])

  return (
    <form className="contents" onSubmit={handleSubmit(onSubmit)}>
      <ScrollArea
        className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col gap-y-10 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    Make your project stand out with a better images.
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <MediaTip
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

          <div className="flex-auto min-w-0">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Media
            </h1>

            <div
              id="publish-project-featured-images-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="title"
                  asChild
                >
                  <span>Featured Image</span>
                </Label>

                <HelperText size="sm">
                  Make a strong first impression with a standout featured image.
                </HelperText>
              </div>
              <Controller
                control={control}
                name="featuredImages"
                render={({ field: { value, onChange } }) => {
                  const currentMeta = value?.[0]?.meta
                  const currentUrl =
                    currentMeta && isPersistedMediaFile(currentMeta)
                      ? currentMeta.__persistedUrl
                      : undefined
                  return (
                    <>
                      <Dropzone
                        className="transition-colors duration-300"
                        size="lg"
                        icon
                        maxSize={MEDIA_MAX_SIZE_BYTES}
                        value={value ?? []}
                        onValueChange={(nextValue) => {
                          // PMCM-256/QA-176/PMCM-396: a published listing
                          // can't be left with no featured image — the
                          // backend already rejects a bare clear, but it
                          // can't undo this Dropzone's own optimistic
                          // empty state, so block the clear here instead,
                          // matching the inline editor's guard.
                          if (
                            isExistingPublishedListing &&
                            (value?.length ?? 0) > 0 &&
                            (nextValue?.length ?? 0) === 0
                          ) {
                            setError("featuredImages", {
                              message:
                                "This listing is published. A replacement image must be uploaded first.",
                            })
                            return
                          }

                          ref.current.forEach((cb) => cb())
                          ref.current.clear()

                          onChange(nextValue)

                          ref.current.add(
                            debounce(
                              () =>
                                onChange(
                                  nextValue?.map((item) => ({
                                    ...item,
                                    progress: 50,
                                  }))
                                ),
                              ONE_SECOND * 3
                            ).cancel
                          )
                          ref.current.add(
                            debounce(
                              () =>
                                onChange(
                                  nextValue?.map((item) => ({
                                    ...item,
                                    progress: 100,
                                  }))
                                ),
                              ONE_SECOND * 6
                            ).cancel
                          )
                        }}
                        onError={(message) =>
                          setError("featuredImages", {
                            message: mapDropzoneErrorMessage(message),
                          })
                        }
                      />
                      {/* PMCM-256: true edit (scale/rotate) via the
                          catalogued ImageEditor — Dropzone's own hover
                          overlay (frozen) only exposes Change/Remove, with
                          no slot for a third action, so this renders
                          alongside it rather than inside it. Save feeds
                          the edited file back into this same RHF field,
                          so it uploads through the exact same saveMedia
                          autosave path (moderation included) and only
                          swaps in once that succeeds. */}
                      {currentUrl && (
                        <ImageEditor
                          variant="image"
                          defaultDataUrl={currentUrl}
                          defaultFileName={
                            currentUrl.split("?")[0].split("/").pop() ||
                            "featured-image.jpg"
                          }
                          editDialogTitle="Edit Image"
                          onSaveImage={(file) =>
                            onChange([
                              { meta: file, hasError: false, progress: 100 },
                            ])
                          }
                          startingPoint={({ open, onEdit }) => (
                            // PMCM-256 fix: ImageEditor's state machine
                            // has no EDIT transition from "ideal" —
                            // open() sends REMOVE first (ideal→removing,
                            // dataUrl is set so no file picker opens),
                            // then onEdit() sends EDIT (removing→editing).
                            <Button
                              type="button"
                              variant="link"
                              visual="gray"
                              className="mt-1"
                              onClick={() => {
                                open()
                                onEdit()
                              }}
                            >
                              Edit image
                            </Button>
                          )}
                        />
                      )}
                    </>
                  )
                }}
              />

              <HookFormErrorMessage
                errors={errors}
                name="featuredImages"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            <div
              id="publish-project-additional-images-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="title"
                  asChild
                >
                  <span>Additional Images</span>
                </Label>

                <HelperText size="sm">
                  Include additional images to showcase more details.
                </HelperText>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }, (_, index) => index).map((index) => (
                  <Controller
                    key={index}
                    name={`additionalImages.${index}`}
                    control={control}
                    render={({ field: { value, onChange } }) => {
                      const meta = value?.[0]?.meta
                      const url =
                        meta && isPersistedMediaFile(meta)
                          ? meta.__persistedUrl
                          : undefined
                      return (
                        <div>
                          <SquareShapeDropzone
                            className="transition-colors duration-300"
                            value={value}
                            maxSize={MEDIA_MAX_SIZE_BYTES}
                            onValueChange={(value) => {
                              onChange(
                                value?.map((item) => ({
                                  ...item,
                                  progress: 50,
                                }))
                              )
                              window.setTimeout(() => {
                                onChange(
                                  value?.map((item) => ({
                                    ...item,
                                    progress: 100,
                                  }))
                                )
                              }, ONE_SECOND * 2)
                              isSubmitted ? trigger("additionalImages") : noop
                            }}
                            onError={(message) =>
                              setError(`additionalImages.${index}`, {
                                message: mapDropzoneErrorMessage(message),
                              })
                            }
                            isHidden={
                              url ? hiddenImages.includes(url) : undefined
                            }
                            onToggleHidden={
                              url ? (h) => setHiddenForUrl(url, h) : undefined
                            }
                          />
                          {/* PMCM-256: see the Featured Image ImageEditor
                              comment above — same reasoning, rendered
                              alongside this slot since the frozen
                              SquareShapeDropzone has no slot for a third
                              overlay action. */}
                          {url && (
                            <ImageEditor
                              variant="image"
                              defaultDataUrl={url}
                              defaultFileName={
                                url.split("?")[0].split("/").pop() ||
                                "additional-image.jpg"
                              }
                              editDialogTitle="Edit Image"
                              onSaveImage={(file) =>
                                onChange([
                                  {
                                    meta: file,
                                    hasError: false,
                                    progress: 100,
                                  },
                                ])
                              }
                              startingPoint={({ open, onEdit }) => (
                                // PMCM-256 fix: ImageEditor's state
                                // machine has no EDIT transition from
                                // "ideal" — open() sends REMOVE first
                                // (ideal→removing, dataUrl is set so no
                                // file picker opens), then onEdit() sends
                                // EDIT (removing→editing).
                                <Button
                                  type="button"
                                  variant="link"
                                  visual="gray"
                                  size="sm"
                                  className="mt-0.5 w-full"
                                  onClick={() => {
                                    open()
                                    onEdit()
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            />
                          )}
                        </div>
                      )
                    }}
                  />
                ))}
              </div>

              <HookFormErrorMessage
                errors={errors}
                name="additionalImages.root"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />

              {showMediaCountError && !errors.additionalImages?.root && (
                <ErrorMessage size="sm">
                  Add at least 3 additional images, or a featured video and 2
                  images, to publish.
                </ErrorMessage>
              )}
            </div>

            <div
              id="publish-project-featured-video-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="featured-video"
                >
                  Featured Video
                </Label>

                <HelperText size="sm">
                  Grab attention with a compelling video that showcases your
                  vision.
                </HelperText>
              </div>

              <InputGroup>
                <InputLeftAddon>https://</InputLeftAddon>
                <Controller
                  control={control}
                  name="featuredVideo"
                  render={({ field: { onChange, value, ...field } }) => (
                    <Input
                      type="text"
                      id="featured-video"
                      className="rounded-l-none"
                      placeholder="www.video.com"
                      value={(value || "").replace(/^https?:\/\//i, "")}
                      onChange={(event) => {
                        const {
                          target: { value },
                        } = event
                        const cleanedValue = value.trim()
                        if (!cleanedValue) {
                          onChange("")
                          return
                        }
                        const normalized = /^https?:\/\//i.test(cleanedValue)
                          ? cleanedValue
                          : `${HTTPS}${cleanedValue.replace(/^\/+/, "")}`
                        onChange(
                          normalized.replace(/^(https?:\/\/)+/i, "https://")
                        )
                      }}
                      {...field}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "featuredVideo",
                      })}
                    />
                  )}
                />
              </InputGroup>

              <HookFormErrorMessage
                errors={errors}
                name="featuredVideo"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />

              {(() => {
                const previewUrl = mediaValues.featuredVideo
                if (!previewUrl) return null
                if (error?.formErrors.fieldErrors.featuredVideo) {
                  return null
                }
                return (
                  <div className="mt-6 inline-flex flex-col items-start gap-3">
                    {mounted && (
                      <ReactPlayer
                        url={previewUrl}
                        width={229}
                        height={140}
                        style={{
                          borderRadius: "0.5rem",
                          overflow: "hidden",
                        }}
                      />
                    )}

                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-error-300 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 focus-visible:outline-none"
                      type="button"
                      onClick={() => {
                        setValue("featuredVideo", "")
                        isValid ? trigger("featuredVideo") : noop()
                      }}
                    >
                      <Trash01 className="size-4" />
                      Remove video
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <MediaTip />
          </div>
        </div>
      </ScrollArea>
    </form>
  )
}

// PMCM-257 follow-up: extracted so the scope-type switch confirm dialog's
// "Learn More" can reuse the same tip video instead of duplicating it.
// Mirrors the identical extraction in scope-builder/index.tsx.
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
            Add new phases, tasks, or processes quickly with the + Add option. •
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

const phaseNameFormSchema = z.object({
  name: z.string().min(1, "Please enter at least 1 character(s)"),
})

type PhaseNameFormValues = z.infer<typeof phaseNameFormSchema>

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

type TaskFormValues = z.infer<typeof taskFormSchema>

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
    // QA-199/PMCM-397: modal (the default) makes Radix wrap this dialog's
    // content in a scroll lock (react-remove-scroll) that only recognizes
    // scrollable elements that are DOM descendants of the dialog's own
    // portal. The Location/Role comboboxes below are cmdk popovers that
    // portal to document.body as a *separate* tree, so the lock intercepts
    // their wheel events and blocks scrolling entirely — reproduced and
    // confirmed fixed by this prop alone (before: scrollTop stuck at 0 on
    // every wheel tick; after: scrolls normally). Non-modal still closes on
    // outside click/Escape; it only drops the focus trap and body scroll
    // lock, which this single-field-at-a-time add-task form doesn't rely on.
    <Dialog open={isOpen} onOpenChange={toggleIsOpen} modal={false}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <form
          className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-name" className="text-gray-700" size="sm">
              Task Name
            </Label>
            <Input
              id="task-name"
              className="text-gray-900"
              {...register("task")}
              isInvalid={hookFormHasError({ errors, name: "task" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="task"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="duration" className="text-gray-700" size="sm">
              Duration
            </Label>
            <div className="grid grid-cols-2 gap-x-3">
              <Input
                id="duration"
                className="text-gray-900"
                type="number"
                min={1}
                {...register("duration.value")}
                isInvalid={hookFormHasError({ errors, name: "duration.value" })}
              />
              <Controller
                control={control}
                name="duration.type"
                render={({ field: { value, onChange } }) => (
                  <Listbox value={value} onChange={onChange} id="duration">
                    <ListboxButton placeholder="Select">
                      {({ value: selectedValue }) =>
                        formatDurationUnit(
                          Number(taskDurationValue) || 0,
                          selectedValue as (typeof DURATION_TYPE)[number]
                        ).replace(/^./, (character) => character.toUpperCase())
                      }
                    </ListboxButton>
                    <ListboxOptions>
                      {DURATION_TYPE.map((format) => (
                        <ListboxOption key={format} value={format}>
                          {formatDurationUnit(
                            Number(taskDurationValue) || 0,
                            format
                          ).replace(/^./, (character) =>
                            character.toUpperCase()
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Listbox>
                )}
              />
            </div>

            {(hookFormHasError({ errors, name: "duration.value" }) ||
              hookFormHasError({
                errors,
                name: "duration.type",
              })) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message") ||
                  get(errors, "duration.type.message")}
              </ErrorMessage>
            )}
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="role-name" className="text-gray-700" size="sm">
              Role
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange } }) => (
                <OwnCombobox
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select role"
                  options={ROLES}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="role"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="location" className="text-gray-700" size="sm">
              Location
            </Label>
            <Controller
              control={control}
              name="location"
              render={({ field: { value, onChange } }) => (
                <CountriesCombobox
                  placeholder="Select country"
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="location"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="experience" className="text-gray-700" size="sm">
              Experience
            </Label>
            <Controller
              control={control}
              name="experience"
              render={({ field: { value, onChange } }) => (
                <Dropdown
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select experience"
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="experience"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" type="button" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button>Done</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const SaveExitDialog = ({
  onOpenChange,
  open,
  onConfirm,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onConfirm?: () => void
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
          <DialogTitle>Save & Exit</DialogTitle>
          <DialogDescription>
            Would you like to save your project scope progress before exiting?
            You can resume editing any time.
          </DialogDescription>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={onConfirm}>Save & Exit</Button>
          </DialogFooter>
        </div>
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
}) => {
  const {
    openDeletePhaseDialog,
    openPhaseDialog,
    onChangeDuration,
    onInsertAbove,
    onInsertBelow,
    onDuplicatePhase,
    onSwapPhases: onSwapPhasesProp,
  } = props
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
          disabled={!arrayNavigator?.canMoveLeft}
          onSelect={arrayNavigator?.moveToLeft}
        >
          <ArrowUp className="h-4 w-4" /> Move Up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!arrayNavigator?.canMoveRight}
          onSelect={arrayNavigator?.moveToRight}
        >
          <ArrowDown className="h-4 w-4" /> Move Down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDuplicatePhase}>
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

type PhaseRow = Prettify<
  {
    id: string
    role?: string
    location?: string
    experience?: string
    assignedMember?: TeamMember | null
    assigneeUserId?: string | null
  } & TaskFormValues
>

interface Phase {
  phaseName?: string
  rows?: PhaseRow[]
  phaseType?: PhaseType
  recurrenceSchedule?: RecurrenceSchedule
  recurrenceCount?: number
}

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

const getPhaseSearchTargetId = (phaseIndex: number) =>
  `project-scope-phase-${phaseIndex}`

const getTaskSearchTargetId = (phaseIndex: number, rowIndex: number) =>
  `project-scope-phase-${phaseIndex}-task-${rowIndex}`

const normalizeSearchText = (value?: string) =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim()

// PMCM-257: matches a phase's own name OR any of its task rows'
// task/role/location text against the normalized search query. Mirrors
// the same helper added to scope-builder/index.tsx's ScopeBuilder.
const matchesPhaseSearch = (
  phase: Pick<Phase, "phaseName" | "rows">,
  normalizedQuery: string
) => {
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

const columnHelper = createColumnHelper<PhaseRow>()

const columns = [
  columnHelper.accessor("task", {
    cell: ({ getValue, row: { id } }) => (
      <TableCell className="py-4 px-6">
        <span className="inline-flex items-center gap-x-1.5">
          <RowDragHandleCell rowId={id} />
          <span className="text-sm font-semibold text-gray-900">
            {getValue()}
          </span>
        </span>
      </TableCell>
    ),
    header: "Task Name",
  }),
  columnHelper.accessor("role", {
    cell: ({ row: { index, original }, table }) => {
      const value = original.role ?? ""
      const teamMembers = table.options.meta?.teamMembers ?? []
      const allRoles = table.options.meta?.roles ?? []
      const member =
        original.assignedMember ??
        teamMembers.find((m) => m.id === original.assigneeUserId) ??
        null
      // eslint-disable-next-line
      const [popoverOpen, setPopoverOpen] = useState(false)
      // eslint-disable-next-line
      const [addRoleOpen, setAddRoleOpen] = useState(false)

      const handleSelectMember = (tm: TeamMember) => {
        table.options.meta?.batchUpdateData?.(index, {
          role: tm.role,
          assignedMember: tm,
          assigneeUserId: tm.id,
          location: tm.location ?? "",
        })
        setPopoverOpen(false)
      }

      const handleSelectVacantRole = (role: string) => {
        table.options.meta?.batchUpdateData?.(index, {
          role,
          assignedMember: null,
          assigneeUserId: null,
        })
        setPopoverOpen(false)
      }

      const handleAddRole = () => {
        setPopoverOpen(false)
        setAddRoleOpen(true)
      }

      const handleAddRoleDone = (role: string) => {
        table.options.meta?.batchUpdateData?.(index, {
          role,
          assignedMember: null,
          assigneeUserId: null,
        })
      }

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
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState({
        defaultValue: countryFromLocation(getValue()),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      })
      return (
        <TableCell className="px-3 py-4">
          <CountriesCombobox
            placeholder="Location"
            value={value}
            onValueChange={setValue}
          />
        </TableCell>
      )
    },
    header: "Location",
  }),
  columnHelper.accessor("experience", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState<
        ExperienceLevel | undefined
      >({
        defaultValue: getValue(),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      })
      return (
        <TableCell className="py-4 px-6">
          <Dropdown
            placeholder="Experience"
            value={value}
            onValueChange={(nextValue) => {
              if (!nextValue) return
              setValue(nextValue)
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
      batchUpdateData: (rowIndex, patch) => {
        setData((prev) =>
          prev.map((row, index) =>
            index === rowIndex ? ({ ...row, ...patch } as PhaseRow) : row
          )
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
                <TableHead key={header.id} colSpan={header.colSpan}>
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
type ProjectScopeProps = {
  setProgress?: (val: number) => void
}

const ProjectScope = ({
  setProgress,
}: {
  setProgress?: (val: number) => void
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const lastUndo = useRef<null | (() => void)>(null)
  const handledCheckoutActionRef = useRef(false)
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
  const [accordionState, setAccordionState] = useState(["item-0"])
  // PMCM-257: this search input previously had no value/onChange — a
  // static placeholder. getPhaseSearchTargetId/getTaskSearchTargetId
  // above are unused dead code (confirmed via grep — no call sites), so
  // there's no existing scroll-to-target behavior this filter could break.
  const [phaseSearchQuery, setPhaseSearchQuery] = useState("")
  const [scopeTeam, setScopeTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await TeamsAPI.getMyTeam()
        const data = res?.data?.data ?? res?.data
        const roster = Array.isArray(data?.members) ? data.members : []
        const mapped: TeamMember[] = roster.map((m: any) => {
          const jobTitleList = Array.isArray(m.jobTitles)
            ? m.jobTitles
                .map((j: any) =>
                  typeof j === "string" ? j : (j?.jobTitle ?? j?.headline ?? "")
                )
                .filter(Boolean)
            : []
          const jobTitle = m.recentJobTitle || jobTitleList[0] || ""
          return {
            id: m.userId || m.id,
            firstName: m.firstName || m.username || "User",
            username: m.username || "",
            avatarUrl: m.avatarUrl || null,
            role: jobTitle,
            jobTitles: jobTitleList,
            hourlyRate: m.hourlyRate ?? m.rateMax ?? null,
            workSchedule: m.workSchedule ?? null,
            customHoursPerWeek: m.customHoursPerWeek ?? null,
            location: m.location ?? m.country ?? null,
            experience: m.experience ?? m.experienceLevel ?? null,
          }
        })
        if (!cancelled) setScopeTeam(mapped)
      } catch {
        /* roster fetch failed — picker shows empty state */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  const {
    projectScopeMethods,
    isTaskSearchDialogOpen,
    setTaskSearchDialogOpen,
    teamMemberIds,
    pricingBudgetCents,
    scopeType,
    setScopeType,
    draftProjectId,
    initialPricingPeriod,
    publishAttempted,
  } = useProjectScopeContext()
  const isService = scopeType === "service"

  // PMCM-257: this used to switch instantly — no confirmation, and
  // (because it never touched `phases`) no clearing of the now-
  // incompatible scope data either, leaving a Project-shaped scope
  // (flat phases) sitting under a "Service" label or vice versa. Gated
  // behind a confirm dialog now (state below), matching the inline
  // editor's shared ScopeBuilder component, which already had the
  // dialog but had the identical "doesn't actually clear" gap.
  const [scopeTypeConfirmOpen, setScopeTypeConfirmOpen] = React.useState(false)
  const [scopeTypeLearnMoreOpen, setScopeTypeLearnMoreOpen] =
    React.useState(false)
  const [pendingScopeType, setPendingScopeType] =
    React.useState<ScopeType | null>(null)

  const requestScopeTypeChange = (type: ScopeType) => {
    if (type === scopeType) return
    setPendingScopeType(type)
    setScopeTypeConfirmOpen(true)
  }

  const confirmScopeTypeChange = () => {
    const type = pendingScopeType
    if (!type) return
    const previousType = scopeType
    const previousPhases = phases
    setScopeType(type)
    // PMCM-257 follow-up: previously cleared the scope on switch — per
    // product direction this now converts and preserves phaseName/rows/
    // order instead (convertPhasesForScopeType, same helper the inline
    // editor's ScopeBuilder uses). Undo still restores the exact previous
    // phases (not the converted ones) and the exact previous type.
    // service-scope-ongoing-phase: applyOngoingRule is true here (an actual
    // switch), same as the shared ScopeBuilder's own confirm handler —
    // closes a Project→Service conversion with an Ongoing phase.
    setPhases(
      convertPhasesForScopeType(phases, type, { applyOngoingRule: true })
    )
    if (draftProjectId) {
      ProjectAPI.UpdateProjectDraft(draftProjectId, {
        listingType: type,
      }).catch(() => {})
    }
    toast({
      variant: "success",
      title: type === "service" ? "Switched to Service" : "Switched to Project",
      action: (
        <ToastAction
          altText="Undo"
          className="ml-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
          onClick={() => {
            setScopeType(previousType)
            setPhases(previousPhases)
            if (draftProjectId) {
              ProjectAPI.UpdateProjectDraft(draftProjectId, {
                listingType: previousType,
              }).catch(() => {})
            }
          }}
        >
          Undo
        </ToastAction>
      ),
    })
    setPendingScopeType(null)
    setScopeTypeConfirmOpen(false)
  }
  // Scope assignees must be members ON this project (Chris 07-28) — the owner
  // (self) plus added members — never the whole roster.
  const scopeOwnerId = getCurrentUser()?.id
  const projectTeam = useMemo(
    () =>
      scopeTeam.filter(
        (m) =>
          String(m.id) === String(scopeOwnerId) ||
          teamMemberIds.includes(m.id)
      ),
    [scopeTeam, teamMemberIds, scopeOwnerId]
  )
  const { toggleValidation } = useStepContext()

  const [projectScopeState, setProjectScopeState] = projectScopeMethods

  const [phases, setPhases] = useControllableState<Phase[]>({
    value: projectScopeState,
    onChange: (value) => {
      setProjectScopeState(value)
      expandAll()
    },
  })

  // PMCM-257 follow-up 2: Service scope must never have an untyped phase
  // (the header falls back to "Phase One" otherwise) — covers a scope
  // that was already "service" when this page mounted but had an
  // untyped phase slip through some other path. Hydration (draftIsService)
  // and the scope-type-switch confirm (confirmScopeTypeChange) already
  // normalize on their own; this is the catch-all. After normalizing,
  // every phase has a phaseType, so the guard condition is false on the
  // next run and this does not loop.
  useEffect(() => {
    if (scopeType !== "service") return
    if (phases.some((phase) => !phase.phaseType)) {
      setPhases(ensureServicePhaseTypes(phases))
    }
  }, [scopeType, phases, setPhases])

  const success = projectScopeSchema.safeParse(phases)

  // Budget + duration computed from the scope (same helper/rate-card as the
  // inline my-listings view) — replaces the hardcoded sidebar figures.
  // PMCM-258: duration day-counting now comes from the shared
  // frontend/lib/listing-pricing.ts module instead of this file's own copy
  // (which, per QA-200/PMCM-397, already matched my-listings' months
  // handling — now both pages share one implementation instead of two
  // copies that have to be kept in sync by hand).
  const { budgetTotalCents, durationLabel, durationDays } = React.useMemo(() => {
    const scopePhases = Array.isArray(phases) ? phases : []
    const totalDays = scopeDurationDays(scopePhases as any)
    const computedCents = estimateScopeBudgetCents(scopePhases)
    // QA-178/PMCM-397: always prefer the freshly-computed total.
    // pricingBudgetCents only updates ~1.5-2s after a change, via the
    // debounced ReplaceProjectScope round-trip (see the ReplaceProjectScope
    // callers below) — so any edit made before that round-trip lands, or
    // any edit made again in that window, was masked by a stale number.
    // This is what made phase deletion look broken while task deletion
    // looked fine: both mutate `phases` through the same setPhases path
    // and land in this same memo, but by the time a *later* edit (e.g. a
    // phase delete) ran, an *earlier* edit's round-trip had already primed
    // a stale positive pricingBudgetCents that outranked anything computed
    // live afterward — including the AC's "reset to zero when every phase
    // is deleted" case, since a stale positive number would win over a
    // correctly-computed 0.
    return {
      budgetTotalCents: computedCents,
      durationLabel: formatDuration(totalDays),
      durationDays: totalDays,
    }
  }, [phases])

  // PMCM-258/AC5: the wizard previously had no period selector at all —
  // the sidebar budget was always shown "per week". Mirrors the
  // hydrate-once-then-persist-on-change pattern used in my-listings so the
  // seller's choice here round-trips through the same `pricingPeriod`
  // draft field.
  const [budgetPeriod, setBudgetPeriodState] = React.useState<PricingPeriod>("week")
  const pricingPeriodHydratedRef = React.useRef(false)

  React.useEffect(() => {
    if (pricingPeriodHydratedRef.current) return
    if (!initialPricingPeriod) return
    pricingPeriodHydratedRef.current = true
    setBudgetPeriodState(normalizePeriod(initialPricingPeriod))
  }, [initialPricingPeriod])

  const setBudgetPeriod = React.useCallback(
    (next: PricingPeriod) => {
      setBudgetPeriodState(next)
      if (draftProjectId) {
        ProjectAPI.UpdateProjectDraft(draftProjectId, {
          pricingPeriod: next,
        } as any).catch(() => {})
      }
    },
    [draftProjectId]
  )

  const availableBudgetPeriods = React.useMemo(
    () => availablePeriods(durationDays, isService),
    [durationDays, isService]
  )

  React.useEffect(() => {
    if (!availableBudgetPeriods.includes(budgetPeriod)) {
      setBudgetPeriodState(resolvePeriod(budgetPeriod, durationDays, isService))
    }
  }, [availableBudgetPeriods, budgetPeriod, durationDays, isService])

  const formatBudget = React.useCallback(
    (cents: number, period: PricingPeriod) => {
      if (cents <= 0) return "$0"
      return `$${costPerPeriod(cents, durationDays, period).toLocaleString()}`
    },
    [durationDays]
  )

  useIsomorphicLayoutEffect(() => {
    toggleValidation(success)
  }, [success])

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

  useEffect(() => {
    if (handledCheckoutActionRef.current) return
    if (searchParams.get("checkoutAction") !== "add-task") return
    if (phases.length < 1) return

    handledCheckoutActionRef.current = true
    setAccordionState((current) =>
      current.includes("item-0") ? current : [...current, "item-0"]
    )
    handleOpenTaskDialog(0)

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("checkoutStep")
    nextSearchParams.delete("checkoutAction")
    const nextQuery = nextSearchParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
  }, [handleOpenTaskDialog, pathname, phases.length, router, searchParams])

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
                recurrenceSchedule: "monthly",
                recurrenceCount: 1,
              }
            : phaseType
              ? { phaseName, phaseType }
              : { phaseName }
        )
        return next
      })

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

  const fieldsValidationArr = [
    pickFromProjectScopeSchema({ task: true }).safeParse(phases),
    pickFromProjectScopeSchema({ experience: true }).safeParse(phases),
    pickFromProjectScopeSchema({ role: true }).safeParse(phases),
    pickFromProjectScopeSchema({ location: true }).safeParse(phases),
    pickFromProjectScopeSchema({ duration: true }).safeParse(phases),
  ]

  // Each valid field contributes 34% to the total progress
  const progressValue = Math.round(
    (fieldsValidationArr.filter((item) => item).length /
      fieldsValidationArr.length) *
      34
  )
  // Report progress to parent
  useEffect(() => {
    setProgress?.(progressValue)
  }, [progressValue, setProgress])

  //helper function to convert numbers to words
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

  // --- DurationFormValues type and DurationDialog component (hoisted) ---
  type DurationFormValues = {
    duration: {
      value: number
      type: "hours" | "days" | "weeks" | "months"
    }
  }

  // PMCM-257: this dialog previously had no resolver at all — a plain
  // HTML min={1} on the number input, which React Hook Form's
  // handleSubmit does not enforce, so 0 (or a negative value) saved
  // silently. Same rule as taskFormSchema.duration above.
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

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <Controller
                name="duration.value"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    className="w-24"
                    placeholder="Value"
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
                  <select {...field} className="border rounded px-2 py-1">
                    <option value="days">
                      {formatDurationUnit(
                        Number(selectedDurationValue) || 0,
                        "days"
                      ).replace(/^./, (character) => character.toUpperCase())}
                    </option>
                    <option value="weeks">
                      {formatDurationUnit(
                        Number(selectedDurationValue) || 0,
                        "weeks"
                      ).replace(/^./, (character) => character.toUpperCase())}
                    </option>
                    <option value="hours">
                      {formatDurationUnit(
                        Number(selectedDurationValue) || 0,
                        "hours"
                      ).replace(/^./, (character) => character.toUpperCase())}
                    </option>
                  </select>
                )}
              />
            </div>
            {hookFormHasError({ errors, name: "duration.value" }) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message")}
              </ErrorMessage>
            )}
            <DialogFooter>
              <Button type="submit">Save</Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }
  const currentPhaseName =
    phaseDialogState.action === "EDIT" &&
    typeof phaseDialogState.editingPhaseIndex === "number"
      ? (phases[phaseDialogState.editingPhaseIndex]?.phaseName ?? "")
      : ""

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
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

          <div
            className="space-y-6 flex-auto min-w-0"
            id="publish-project-scope-table-field"
          >
            {/* PMCM-253 follow-up: Project Scope has no RHF form to show
            a field-level error — `success` just above is the same live
            projectScopeSchema check Step's own toggleValidation already
            uses, so this reacts to the live phases/tasks state exactly
            like every other section's inline errors do. */}
            {!success && publishAttempted ? (
              <ErrorMessage size="sm">
                Add at least 1 phase with 1 task to publish.
              </ErrorMessage>
            ) : null}
            {/* Budget Calculator & Duration cards */}
            <div className="grid grid-cols-2 gap-x-4">
              <div className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-x-1.5">
                    Budget Calculator
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Calculated from your scope tasks
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <div className="mt-2 flex items-baseline gap-x-1.5">
                    <span className="text-[28px] leading-none font-bold text-dark-blue-400">
                      {formatBudget(budgetTotalCents, budgetPeriod)}
                    </span>
                    <span className="text-sm text-dark-blue-400">per</span>
                    <Listbox value={budgetPeriod} onChange={setBudgetPeriod}>
                      <ListboxButton
                        className="text-sm lowercase py-[5px] px-[7px] h-max w-auto"
                        iconClassName="ml-1"
                        placeholder="Select"
                      />
                      <ListboxOptions className="w-[153px]">
                        {availableBudgetPeriods.map((period) => (
                          <ListboxOption key={period} value={period}>
                            {PERIOD_WIDGET_LABELS[period]}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Listbox>
                  </div>
                </div>
                <ShieldDollar className="size-10 text-primary-500" />
              </div>

              <div className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-x-1.5">
                    Duration
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Total duration based on tasks
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <div className="mt-2">
                    <span className="text-[28px] leading-none font-bold text-dark-blue-400">
                      {isService ? "Ongoing" : durationLabel}
                    </span>
                  </div>
                </div>
                <ChartBreakoutCircle className="size-10 text-primary-500" />
              </div>
            </div>

            <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
              <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
                {isService ? "Service" : "Project"} Scope
              </h1>

              <div className="flex items-center md:gap-x-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outlined" visual="gray">
                      <RefreshCcw05 className="size-[15px]" />
                      {isService ? "Service" : "Project"}
                      <ChevronDown className="size-[15px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[280px]">
                    <DropdownMenuItem
                      className="flex flex-col items-start gap-y-0.5 py-2.5 px-3"
                      aria-current={!isService ? "true" : undefined}
                      onClick={() => requestScopeTypeChange("project")}
                    >
                      <div className="flex items-center gap-x-2 w-full">
                        <Check
                          className={cn(
                            "size-4 text-primary-500 shrink-0",
                            isService && "invisible"
                          )}
                        />
                        <span className="font-semibold text-sm text-gray-900">
                          Project
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-6">
                        One-time job with a defined duration
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex flex-col items-start gap-y-0.5 py-2.5 px-3"
                      aria-current={isService ? "true" : undefined}
                      onClick={() => requestScopeTypeChange("service")}
                    >
                      <div className="flex items-center gap-x-2 w-full">
                        <Check
                          className={cn(
                            "size-4 text-primary-500 shrink-0",
                            !isService && "invisible"
                          )}
                        />
                        <span className="font-semibold text-sm text-gray-900">
                          Service
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-6">
                        Recurring work with consistent needs
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* PMCM-257: mirrors the confirm dialog already built into
                    the shared scope-builder/index.tsx ScopeBuilder (used by
                    the inline editor) — same copy/structure, since the
                    wizard has its own separate phase/task UI here rather
                    than rendering <ScopeBuilder>. */}
                <Dialog
                  open={scopeTypeConfirmOpen}
                  onOpenChange={setScopeTypeConfirmOpen}
                >
                  {/* Figma specs 409px; max-w-sm (384px) is the nearest
                      standard Tailwind class — no arbitrary value added. */}
                  <DialogContent className="max-w-sm p-0">
                    <div className="p-6 border-b border-gray-200">
                      <DialogTitle className="text-lg font-semibold text-dark-blue-400">
                        Change to{" "}
                        {pendingScopeType === "service"
                          ? "Service"
                          : "Project"}
                        ?
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
                              text-gray-500, and size defaults to "sm"
                              (text-sm) — only font-semibold/underline
                              (persistent)/capitalize aren't covered by
                              the variant. */}
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
                        onClick={confirmScopeTypeChange}
                      >
                        Yes, Change
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center">
                  <Button
                    className="border-r-0 rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    onClick={expandAll}
                  >
                    <ChevronsDown className="size-[15px]" /> Expand All
                  </Button>
                  <Button
                    className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    onClick={collapseAll}
                  >
                    <ChevronsUp className="size-[15px]" /> Collapse All
                  </Button>
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
              {phases.map(({ phaseName, rows }, index) => {
                if (!matchesPhaseSearch({ phaseName, rows }, normalizedQuery)) {
                  return null
                }
                return (
                <ArrayNavigator key={index} value={phases} index={index}>
                  {rows ? (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto min-w-0 gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5 min-w-0">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                {isService && phases[index]?.phaseType
                                  ? PHASE_TYPE_TITLE[phases[index].phaseType!]
                                  : `Phase ${numberToWord(index)}`}{" "}
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
                              </span>
                            </div>

                            <div className="inline-flex items-center justify-start gap-x-2 pl-10 md:pl-0 shrink-0">
                              <PhaseHeaderMeta
                                phases={phases}
                                index={index}
                                onRecurrenceChange={(schedule, count) =>
                                  updatePhaseRecurrence(index, schedule, count)
                                }
                              />
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center shrink-0">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
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
                            onRowsChange={(rows) =>
                              handleRowsChange(index, rows)
                            }
                            openDurationDialog={(editingPhaseRowIndex) =>
                              setDurationDialogState({
                                editingPhaseIndex: index,
                                editingPhaseRowIndex,
                                open: true,
                              })
                            }
                            teamMembers={projectTeam}
                          />
                        </DisclosureContent>
                      </div>
                    </AccordionItem>
                  ) : (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto min-w-0 gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5 min-w-0">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <div className="inline-flex md:flex-row gap-x-1.5 flex-col md:items-center gap-y-3 md:gap-x-5">
                                <span className="text-base md:text-[18px] font-semibold md:font-light leading-7 text-gray-900">
                                  {isService && phases[index]?.phaseType
                                    ? PHASE_TYPE_TITLE[phases[index].phaseType!]
                                    : `Phase ${numberToWord(index)}`}
                                </span>{" "}
                                {phaseName ? (
                                  <button
                                    type="button"
                                    className="text-lg leading-8 font-semibold text-gray-900 hover:underline focus-visible:outline-none"
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
                                    className="focus-visible:outline-none inline-flex items-center gap-x-2"
                                    onClick={() =>
                                      dispatch({
                                        type: "EDIT",
                                        payload: index,
                                      })
                                    }
                                  >
                                    <Edit03 className="size-[15px] text-gray-800" />
                                    <span className="inline-block text-sm leading-5 font-semibold text-gray-800">
                                      Edit Phase Name
                                    </span>
                                  </button>
                                )}
                                <div className="inline-block md:hidden">
                                  <PhaseHeaderMeta
                                    phases={phases}
                                    index={index}
                                    onRecurrenceChange={(schedule, count) =>
                                      updatePhaseRecurrence(index, schedule, count)
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="hidden items-center justify-start gap-x-2 pl-10 md:inline-flex md:pl-0 shrink-0">
                              <PhaseHeaderMeta
                                phases={phases}
                                index={index}
                                onRecurrenceChange={(schedule, count) =>
                                  updatePhaseRecurrence(index, schedule, count)
                                }
                              />
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center shrink-0">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
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
              onOpenChange={(open) =>
                dispatch({ type: "TOGGLE", payload: { open } })
              }
              open={phaseDialogState.open}
              onAddPhaseName={onAddPhaseName}
              defaultName={currentPhaseName}
              showPhaseType={
                isService && phaseDialogState.action !== "EDIT"
              }
              disabledTypes={phases
                .map((p) => p.phaseType)
                .filter((t): t is PhaseType => !!t)}
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

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectScopeTip showArrow />
          </div>
        </div>
      </ScrollArea>
    </>
  )
}

const steps: Steps[] = [
  { label: "Project Info", isValid: false, disabled: false },
  { label: "Media", isValid: false, disabled: false },
  { label: "Project Scope", isValid: false, disabled: false },
  { label: "Team", isValid: false, disabled: false },
  { label: "Questions", isValid: false, disabled: false },
]

const [ProjectInfoProvider, useProjectInfoContext] = createContext<
  UseFormReturn<ProjectInfoFormValues>
>({
  displayName: "ProjectInfoProvider",
  errorMessage: `useProjectInfoContext returned is 'undefined'. Seems you forgot to wrap the components in "<ProjectInfoPopover />"`,
})

const [MediaProvider, useMediaContext] = createContext<
  UseFormReturn<MediaFormValues>
>({
  displayName: "MediaProvider",
  errorMessage: `useMediaContext returned is 'undefined'. Seems you forgot to wrap the components in "<MediaPopover />"`,
})

const [ProjectScopeProvider, useProjectScopeContext] = createContext<{
  projectScopeMethods: [Phase[], React.Dispatch<React.SetStateAction<Phase[]>>]
  isProjectSubmitted: boolean
  setIsProjectSubmitted: React.Dispatch<React.SetStateAction<boolean>>
  submissionOutcome: SubmissionOutcome | null
  setSubmissionOutcome: React.Dispatch<
    React.SetStateAction<SubmissionOutcome | null>
  >
  isTaskSearchDialogOpen: boolean
  setTaskSearchDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  teamMemberIds: string[]
  setTeamMemberIds: React.Dispatch<React.SetStateAction<string[]>>
  // QA-180/PMCM-399: emails invited (search or email) via the shared
  // InviteWindow while this listing's dialog context was active — shown
  // as "Pending Invite" rows below teamMemberIds' real members. Locally
  // tracked: invitations-service has no per-listing correlation, so this
  // can't be re-derived from a server-side "pending invites for this
  // project" query, only from what this session actually sent.
  pendingInviteEmails: string[]
  setPendingInviteEmails: React.Dispatch<React.SetStateAction<string[]>>
  draftProjectId: string | null
  // PMCM-256: whether this draft was already a published/live listing when
  // the wizard loaded — distinct from isProjectSubmitted above, which only
  // tracks "submitted during this session" and resets on a fresh load.
  // Used to block clearing the featured image without a replacement
  // (QA-176/PMCM-396), matching the inline editor's guard.
  isExistingPublishedListing: boolean
  pricingBudgetCents: number
  // PMCM-258/AC5: the seller's saved pricing-period preference, hydrated
  // once from the draft on load — read-only from ProjectScope's side, it
  // only seeds that component's own `budgetPeriod` state once.
  initialPricingPeriod: string | null
  scopeType: ScopeType
  setScopeType: React.Dispatch<React.SetStateAction<ScopeType>>
  teamSubTab: string
  setTeamSubTab: React.Dispatch<React.SetStateAction<string>>
  // PMCM-253 follow-up: Project Scope and Team have no RHF form to drive
  // an inline error off of — their own live validity already exists
  // (projectScopeSchema.safeParse(phases), the team-member count check),
  // this just lets their inline error copy show only once Publish has
  // actually been clicked, same gating every other section already uses.
  publishAttempted: boolean
}>({
  displayName: "MediaProvider",
  errorMessage: `useMediaContext returned is 'undefined'. Seems you forgot to wrap the components in "<MediaPopover />"`,
})

type TeamSubTab = "openRoles" | "applicationQuestions" | "members" | "requests" | "invites"

const TEAM_SUB_TAB_LABELS: Record<TeamSubTab, string> = {
  openRoles: "Open Roles",
  applicationQuestions: "Application Questions",
  members: "Members",
  requests: "Requests",
  invites: "Invites",
}

const TEAM_SUB_TAB_ENTRY_ANIMATION =
  "editStepFadeIn 450ms cubic-bezier(0.4, 0, 0.2, 1) forwards"

// ---------------------------------------------------------------------------
// Open Roles sub-tab content (pixel-perfect from Figma node 13101:118765)
// ---------------------------------------------------------------------------
const SAMPLE_SELECTED_ROLES = [
  "Product Designer",
  "UX Researcher",
  "Frontend Developer",
  "iOS Developer",
  "Android Developer",
  "Backend Engineer",
  "UX Writer",
  "DevOps Engineer",
  "QA Engineer",
  "React Native Dev",
  "Full Stack Developer",
  "Product Manager",
]

const ALL_ROLES_POOL = [
  "Product Designer",
  "UX Researcher",
  "Frontend Developer",
  "iOS Developer",
  "Android Developer",
  "Backend Engineer",
  "UX Writer",
  "DevOps Engineer",
  "QA Engineer",
  "React Native Dev",
  "Full Stack Developer",
  "Product Manager",
  "Project Manager",
  "Data Scientist",
  "ML Engineer",
  "Security Engineer",
  "Cloud Architect",
  "Technical Writer",
  "Scrum Master",
  "Solutions Architect",
]

const SAMPLE_ROLE_OPTIONS = [
  "Product Designer",
  "UX Researcher",
  "Frontend Developer",
  "iOS Developer",
]

const SAMPLE_ROLE_QUESTIONS = [
  "What is your experience with mobile design systems?",
  "Describe a challenging task you solved.",
]

const OpenRolesContent = () => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(SAMPLE_SELECTED_ROLES)
  const suggestedRoles = useMemo(
    () => ALL_ROLES_POOL.filter((r) => !selectedRoles.includes(r)).slice(0, 3),
    [selectedRoles]
  )
  const contentRef = useRef<HTMLDivElement>(null)
  const lastRoleBadgeRef = useRef<HTMLDivElement>(null)
  const questionLockRef = useRef<HTMLSpanElement>(null)
  const [connector, setConnector] = useState<{ top: number; height: number } | null>(null)
  const MAX_ROLES = 15

  const removeRole = (role: string) => {
    setSelectedRoles((prev) => prev.filter((r) => r !== role))
  }

  const addRole = (role: string) => {
    if (selectedRoles.length < MAX_ROLES && !selectedRoles.includes(role)) {
      setSelectedRoles((prev) => [...prev, role])
    }
  }

  useEffect(() => {
    const content = contentRef.current
    const lastRoleBadge = lastRoleBadgeRef.current
    const questionLock = questionLockRef.current

    if (!content || !lastRoleBadge || !questionLock) {
      setConnector(null)
      return
    }

    const updateConnector = () => {
      const contentRect = content.getBoundingClientRect()
      const sourceRect = lastRoleBadge.getBoundingClientRect()
      const targetRect = questionLock.getBoundingClientRect()
      const sourceCenter = sourceRect.top + sourceRect.height / 2
      const targetCenter = targetRect.top + targetRect.height / 2
      const height = targetCenter - sourceCenter

      setConnector(
        height > 0
          ? { top: sourceCenter - contentRect.top, height }
          : null
      )
    }

    updateConnector()

    const observer = new ResizeObserver(updateConnector)
    observer.observe(content)
    observer.observe(lastRoleBadge)
    observer.observe(questionLock)
    window.addEventListener("resize", updateConnector)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateConnector)
    }
  }, [selectedRoles])

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div
        ref={contentRef}
        className="relative py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row min-[1024px]:gap-[50px]"
      >
        {/* Dynamic connector between the last role badge and the default question card. */}
        {connector && (
          <div
            aria-hidden="true"
            className="absolute hidden min-[1024px]:block left-[57px] pointer-events-none w-[18px]"
            style={{ top: connector.top, height: connector.height }}
          >
            <div className="absolute bg-gray-300 left-0 top-0 w-px [height:calc(100%-9px)]" />
            <div className="absolute border-b border-l border-gray-300 bottom-0 h-[9px] left-0 rounded-bl-[9px] w-[9px]" />
            <div className="absolute bg-gray-300 bottom-0 h-px left-[8px] w-[7px]" />
            <div className="absolute border-r border-t border-gray-300 bottom-[-2px] right-0 rotate-45 size-[6px]" />
          </div>
        )}

        {/* Left column */}
        <div className="flex-auto min-w-0 flex flex-col">
          <div className="flex flex-col gap-[18px]">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Open Roles
            </h1>

            <div className="flex flex-col gap-6">
              {/* Roles input section */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-3 items-end">
                    <p className="flex-1 min-w-0 text-sm leading-5 font-normal text-gray-500">
                      Specify the roles needed for this project, select a minimum of 3 and a maximum of 15. Roles are derived from your project categories.
                    </p>
                    <span className={cn(
                      "shrink-0 text-xs font-normal text-right whitespace-nowrap",
                      selectedRoles.length >= MAX_ROLES ? "text-warning-500" : "text-gray-500"
                    )}>
                      {selectedRoles.length}/{MAX_ROLES}
                    </span>
                  </div>

                  {/* Roles input box */}
                  <div className={cn(
                    "bg-white border rounded-[5px] p-3 shadow-xs flex flex-wrap content-start gap-x-2 gap-y-[10px] items-center",
                    selectedRoles.length >= MAX_ROLES ? "border-warning-300" : "border-gray-300"
                  )}>
                    {selectedRoles.map((role, index) => (
                      <div
                        key={role}
                        ref={index === selectedRoles.length - 1 ? lastRoleBadgeRef : undefined}
                      >
                        <Badge
                          visual="primary"
                          size="sm"
                          className="pl-2 pr-1.5 py-0.5 gap-1 cursor-default transition duration-300 hover:bg-primary-100"
                        >
                          {role}
                          <BadgeCloseButton onClick={() => removeRole(role)}>
                            <X className="size-3" />
                          </BadgeCloseButton>
                        </Badge>
                      </div>
                    ))}
                    {selectedRoles.length < MAX_ROLES && (
                      <Badge
                        visual="gray"
                        size="sm"
                        className="pl-1.5 pr-2 py-0.5 gap-1 cursor-pointer transition duration-300 hover:bg-gray-200"
                      >
                        <Plus className="size-3" />
                        Add Role
                      </Badge>
                    )}
                  </div>
                  {selectedRoles.length >= MAX_ROLES && (
                    <p className="text-sm leading-5 font-normal text-warning-500">
                      You've reached the maximum of {MAX_ROLES} roles.
                    </p>
                  )}
                </div>

                {/* Suggested Roles — hidden when max reached */}
                {selectedRoles.length < MAX_ROLES && suggestedRoles.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-normal leading-5 text-dark-blue-400">
                      Suggested Roles
                    </span>
                    <div className="flex flex-wrap content-start gap-3">
                      {suggestedRoles.map((role) => (
                        <Badge
                          key={role}
                          visual="gray"
                          size="md"
                          className="pl-2.5 pr-2 py-0.5 gap-1 cursor-pointer transition duration-300 hover:bg-gray-200 active:bg-gray-300"
                          onClick={() => addRole(role)}
                        >
                          {role}
                          <Plus className="size-3.5 text-gray-500" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Empty state — shown when all roles are removed */}
              {selectedRoles.length === 0 && (
                <div className="flex flex-col gap-3 items-center justify-center p-4 rounded-[5px]">
                  <div className="flex flex-col gap-2 items-center text-center">
                    <h2 className="text-lg leading-7 font-semibold text-dark-blue-400">
                      No Open Roles yet
                    </h2>
                    <p className="text-sm leading-5 font-light text-dark-blue-400">
                      Start by adding open roles to define who you're looking for.
                    </p>
                  </div>
                  <Button
                    visual="gray"
                    variant="outlined"
                    className="bg-white"
                    onClick={() => {
                      /* TODO: open role picker */
                    }}
                  >
                    <Plus className="size-[15px]" />
                    Add Open Roles
                  </Button>
                </div>
              )}

              {/* Question preview card — hidden when no roles selected */}
              {selectedRoles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm leading-5 font-normal text-gray-500">
                    This question appears when talent requests to join the project.
                  </p>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)]">
                    <div className="flex gap-2.5 items-start">
                      <div className="shrink-0 w-[15px] pt-[3px]">
                        <span ref={questionLockRef} className="block size-[15px]">
                          <Lock01 className="size-[15px] text-gray-500" />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-3">
                        {/* Question title + tags */}
                        <div className="flex items-center">
                          <div className="flex gap-6 items-center">
                            <span className="text-base font-semibold leading-[1.3] text-dark-blue-400">
                              Which role are you interested in?
                            </span>
                            <div className="flex gap-2 items-center">
                              <Badge
                                visual="gray"
                                size="sm"
                                className="rounded bg-gray-50 border border-gray-300 px-2 py-0.5 h-5 text-gray-700"
                              >
                                Default
                              </Badge>
                              <Badge
                                visual="gray"
                                size="sm"
                                className="rounded bg-gray-100 border-0 px-2 py-0.5 h-5 text-gray-700"
                              >
                                Multi-Select
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="w-full h-px bg-gray-200" />

                        {/* Available Options */}
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-3 items-center">
                            <span className="text-[13px] font-normal leading-[21px] text-dark-blue-400">
                              Available Options
                            </span>
                            <Button
                              variant="link"
                              visual="primary"
                              className="gap-1 text-xs font-bold leading-5 underline decoration-primary-500/30 hover:decoration-primary-500"
                            >
                              Edit Roles
                              <ExternalLink className="size-[15px]" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap content-center gap-2.5 items-center">
                            {SAMPLE_ROLE_OPTIONS.map((role) => (
                              <Badge
                                key={role}
                                visual="gray"
                                size="sm"
                                className="h-[26px] pl-2 pr-1.5 py-0.5"
                              >
                                {role}
                              </Badge>
                            ))}
                            <span className="pl-2.5 pr-2 py-0.5 text-sm font-medium leading-5 text-gray-500 cursor-pointer transition duration-300 hover:opacity-70">
                              + 8 more
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Questions — hidden when no roles selected */}
              {selectedRoles.length > 0 && (
                <div className="bg-gray-100 rounded-lg p-5 flex flex-col gap-[15px]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <span className="text-base font-semibold text-dark-blue-400">
                        Role-Specific Questions
                      </span>
                      <p className="text-sm font-normal leading-5 text-gray-600">
                        Here are your current Role-Specific questions. Click Edit to update them.
                      </p>
                    </div>
                    <Button
                      visual="gray"
                      variant="outlined"
                      className="shrink-0 bg-white"
                    >
                      <Edit03 className="size-[15px]" />
                      Edit Role Questions
                    </Button>
                  </div>

                  <div className="flex flex-wrap content-start gap-3">
                    {SAMPLE_ROLE_QUESTIONS.map((q) => (
                      <div
                        key={q}
                        className="bg-white border-[1.5px] border-gray-300 rounded-full px-3 py-1 flex items-center justify-center cursor-pointer transition duration-300 hover:bg-gray-50 hover:border-gray-400"
                      >
                        <span className="text-sm font-medium leading-5 text-gray-700">
                          {q}
                        </span>
                      </div>
                    ))}
                    <span className="opacity-50 pl-2.5 pr-2 py-0.5 text-sm font-semibold leading-5 text-gray-800 cursor-pointer transition duration-300 hover:opacity-100">
                      + 26 more
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — Arrow + Tip sidebar */}
        <div className="shrink-0 self-start sticky top-6 xs:max-[1024px]:hidden flex items-start pt-6">
          {/* Connector arrow (Figma 13101:176334) */}
          <div className="flex items-center justify-center mr-[-8px] shrink-0 w-[25.455px] h-[71px]">
            <svg className="rotate-90" width="71" height="20" viewBox="0 0 182.364 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 19V20V20V19ZM167 19V18V18V19ZM1 1.00001H0V11H1H2V1.00001H1ZM9 19V20L167 20V19V18L9 18V19ZM175 11H176V1H175H174V11H175ZM167 19V20C171.971 20 176 15.9705 176 11H175H174C174 14.866 170.866 18 167 18V19ZM1 11H0C0 15.9706 4.02944 20 9 20V19V18C5.13401 18 2 14.866 2 11H1ZM175.707 0.292893C175.317 -0.0976311 174.683 -0.0976311 174.293 0.292893L167.929 6.65685C167.538 7.04738 167.538 7.68054 167.929 8.07107C168.319 8.46159 168.953 8.46159 169.343 8.07107L175 2.41421L180.657 8.07107C181.047 8.46159 181.681 8.46159 182.071 8.07107C182.462 7.68054 182.462 7.04738 182.071 6.65685L175.707 0.292893Z" fill="#D0D5DD"/>
            </svg>
          </div>

          <div className="p-5 rounded-lg w-[269px] bg-primary-50 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-x-2">
                <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
                <span className="text-base leading-[30px] font-semibold capitalize text-gray-800">
                  Tip
                </span>
              </div>
              <p className="text-xs leading-normal text-black/60 tracking-[0.12px]">
                A great title gives your audience a reason to open your project
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Video player (Figma I13101:120092;112:190717) */}
              <div className="w-full h-[141px] rounded-lg relative overflow-hidden cursor-pointer group/video">
                <div className="absolute inset-0 bg-black/56 rounded-lg z-[1]" />
                <div className="absolute inset-0 bg-black/10 rounded-lg z-[2]" />
                {/* Play button */}
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[58px] z-10 transition duration-300 group-hover/video:scale-110" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.3" />
                  <circle cx="24" cy="24" r="18" fill="white" fillOpacity="0.4" />
                  <path d="M20 16L32 24L20 32V16Z" fill="white" />
                </svg>
                {/* Duration badge */}
                <div className="absolute bottom-[9.2px] right-[9.5px] bg-gray-500 rounded-[3.22px] px-[4.6px] py-[4.6px] z-10">
                  <span className="text-xs font-normal leading-[24.7px] text-white text-center">01:20</span>
                </div>
                {/* Text overlay */}
                <div className="absolute left-[12.4px] top-[47.6px] flex flex-col gap-1 z-10">
                  <span className="text-xs font-medium leading-[27.6px] text-white/80">Part 1</span>
                  <span className="text-[15.3px] font-medium leading-[36.8px] text-white">How to get started</span>
                </div>
              </div>

              {/* Tip card 1 */}
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-25">
                <div className="flex items-start gap-x-3">
                  <CheckCircle className="size-5 shrink-0 text-primary-500" />
                  <span className="text-sm leading-5 font-semibold text-gray-700 truncate">
                    Focus on purpose
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm leading-normal font-normal text-gray-500">
                    Use impactful keywords that communicate value and make it easy to identify in a list of projects.
                  </p>
                </div>
              </div>

              {/* Tip card 2 */}
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-25">
                <div className="flex items-start gap-x-3">
                  <CheckCircle className="size-5 shrink-0 text-primary-500" />
                  <span className="text-sm leading-5 font-semibold text-gray-700 truncate">
                    Keep it short and sweet
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm leading-normal font-normal text-gray-500">
                    Try to trim your project title to be less than 6 words
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Application Questions sub-tab content (pixel-perfect from Figma node 13101:119062)
// ---------------------------------------------------------------------------
const SAMPLE_SELECTED_TASK_TYPES = [
  "Affinity Mapping",
  "Visual Design",
  "Mobile Development",
  "Frontend Development",
  "QA Testing",
  "Competitive Analysis",
  "UX Auditing",
  "Prototyping",
  "User Research",
  "iOS Development",
  "Android Development",
  "Card Sorting",
]

const ALL_TASK_TYPES_POOL = [
  "Persona Creation",
  "User Flow Design",
  "Wireframing",
  "Usability Testing",
  "Information Architecture",
  "Design System",
  "Accessibility Auditing",
  "Interaction Design",
  "API Integration",
  "Database Design",
  "Performance Optimization",
  "Code Review",
  "Technical Writing",
  "Data Modeling",
  "Security Auditing",
]

const SAMPLE_TASK_TYPE_OPTIONS = [
  "Affinity Mapping",
  "Visual Design",
  "Mobile Development",
  "Frontend Development",
]

const ApplicationQuestionsContent = () => {
  const { draftProjectId } = useProjectScopeContext()
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>(SAMPLE_SELECTED_TASK_TYPES)
  const suggestedTaskTypes = useMemo(
    () => ALL_TASK_TYPES_POOL.filter((t) => !selectedTaskTypes.includes(t)).slice(0, 3),
    [selectedTaskTypes]
  )
  const contentRef = useRef<HTMLDivElement>(null)
  const lastTaskTypeBadgeRef = useRef<HTMLDivElement>(null)
  const questionLockRef = useRef<HTMLSpanElement>(null)
  const [connector, setConnector] = useState<{ top: number; height: number } | null>(null)
  const MAX_TASK_TYPES = 15

  // AI FAQ generation state (copied from my-listings inline edit mode)
  const [aiFaqDialogOpen, setAiFaqDialogOpen] = useState(false)
  const [faqGenLoading, setFaqGenLoading] = useState(false)
  const [faqGenError, setFaqGenError] = useState(false)
  const [faqSuggestions, setFaqSuggestions] = useState<
    Array<{ question: string; answer: string; added?: boolean }>
  >([])
  const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string; is_ai_generated?: boolean }>>([])

  const faqRemainingSlots = Math.max(0, 10 - faqItems.length)
  const faqAddedCount = faqSuggestions.filter((s) => s.added).length

  const runFaqGeneration = async () => {
    if (!draftProjectId) return
    setFaqGenError(false)
    setFaqGenLoading(true)
    try {
      const res = await ProjectAPI.SuggestFaqs(draftProjectId)
      const data = (res?.data ?? []) as Array<{
        question: string
        answer: string
      }>
      const existing = new Set(
        faqItems.map((f) => (f.question || "").trim().toLowerCase())
      )
      const deduped = data
        .filter((s) => s?.question && !existing.has(s.question.trim().toLowerCase()))
        .map((s) => ({ question: s.question, answer: s.answer, added: false }))
      setFaqSuggestions(deduped)
    } catch {
      setFaqGenError(true)
    } finally {
      setFaqGenLoading(false)
    }
  }

  const openAiFaqDialog = () => {
    setAiFaqDialogOpen(true)
    void runFaqGeneration()
  }

  const insertFaqSuggestion = (idx: number) => {
    const s = faqSuggestions[idx]
    if (!s || s.added || faqItems.length >= 10) return
    setFaqItems((prev) => [
      ...prev,
      { question: s.question, answer: s.answer, is_ai_generated: true },
    ])
    setFaqSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: true } : x))
    )
  }

  const removeFaqSuggestion = (idx: number) => {
    const s = faqSuggestions[idx]
    if (!s) return
    const q = s.question.trim().toLowerCase()
    setFaqItems((prev) =>
      prev.filter((f) => (f.question || "").trim().toLowerCase() !== q)
    )
    setFaqSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: false } : x))
    )
  }

  const insertAllFaqSuggestions = () => {
    const slots = Math.max(0, 10 - faqItems.length)
    const toAdd = faqSuggestions.filter((s) => !s.added).slice(0, slots)
    if (toAdd.length === 0) return
    setFaqItems((prev) => [
      ...prev,
      ...toAdd.map((s) => ({
        question: s.question,
        answer: s.answer,
        is_ai_generated: true,
      })),
    ])
    const addedSet = new Set(toAdd.map((s) => s.question))
    setFaqSuggestions((prev) =>
      prev.map((x) => (addedSet.has(x.question) ? { ...x, added: true } : x))
    )
  }

  // Edit Skills dialog state
  const MAX_SKILLS = 25
  const [editSkillsOpen, setEditSkillsOpen] = useState(false)
  const [editSkillsRole, setEditSkillsRole] = useState("")
  const [editSkillsList, setEditSkillsList] = useState<{ id: string | number; name: string }[]>([])
  const [editSkillsSaved, setEditSkillsSaved] = useState<{ id: string | number; name: string }[]>([])
  const [skillQuery, setSkillQuery] = useState("")
  const [skillResults, setSkillResults] = useState<{ id: string | number; name: string }[]>([])

  const fetchSkillResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSkillResults([])
      return
    }
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/skills?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id?: string; label?: string; name?: string }[] =
        Array.isArray(data) ? data : (data.entries ?? data.results ?? [])
      setSkillResults(
        entries
          .map((e) => {
            const name = e.label ?? e.name ?? ""
            return { id: e.id ?? name, name }
          })
          .filter((e) => e.name)
      )
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkillResults(skillQuery), 300)
    return () => clearTimeout(timer)
  }, [skillQuery, fetchSkillResults])

  const editSkillsHasChanges = useMemo(() => {
    const a = [...editSkillsList].map((s) => s.name.toLowerCase()).sort()
    const b = [...editSkillsSaved].map((s) => s.name.toLowerCase()).sort()
    if (a.length !== b.length) return true
    return a.some((v, i) => v !== b[i])
  }, [editSkillsList, editSkillsSaved])

  const openEditSkills = (role: string) => {
    setEditSkillsRole(role)
    setEditSkillsList([...editSkillsSaved])
    setSkillQuery("")
    setSkillResults([])
    setEditSkillsOpen(true)
  }

  const removeEditSkill = (index: number) => {
    setEditSkillsList((prev) => prev.filter((_, i) => i !== index))
  }

  const saveEditSkills = () => {
    setEditSkillsSaved([...editSkillsList])
    setEditSkillsOpen(false)
  }

  const removeTaskType = (taskType: string) => {
    setSelectedTaskTypes((prev) => prev.filter((t) => t !== taskType))
  }

  const addTaskType = (taskType: string) => {
    if (selectedTaskTypes.length < MAX_TASK_TYPES && !selectedTaskTypes.includes(taskType)) {
      setSelectedTaskTypes((prev) => [...prev, taskType])
    }
  }

  useEffect(() => {
    const content = contentRef.current
    const lastTaskTypeBadge = lastTaskTypeBadgeRef.current
    const questionLock = questionLockRef.current

    if (!content || !lastTaskTypeBadge || !questionLock) {
      setConnector(null)
      return
    }

    const updateConnector = () => {
      const contentRect = content.getBoundingClientRect()
      const sourceRect = lastTaskTypeBadge.getBoundingClientRect()
      const targetRect = questionLock.getBoundingClientRect()
      const sourceCenter = sourceRect.top + sourceRect.height / 2
      const targetCenter = targetRect.top + targetRect.height / 2
      const height = targetCenter - sourceCenter

      setConnector(
        height > 0
          ? { top: sourceCenter - contentRect.top, height }
          : null
      )
    }

    updateConnector()

    const observer = new ResizeObserver(updateConnector)
    observer.observe(content)
    observer.observe(lastTaskTypeBadge)
    observer.observe(questionLock)
    window.addEventListener("resize", updateConnector)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateConnector)
    }
  }, [selectedTaskTypes])

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div
        ref={contentRef}
        className="relative py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row min-[1024px]:gap-[50px]"
      >
        {/* Dynamic connector between the last task type badge and the default question card. */}
        {connector && (
          <div
            aria-hidden="true"
            className="absolute hidden min-[1024px]:block left-[57px] pointer-events-none w-[18px]"
            style={{ top: connector.top, height: connector.height }}
          >
            <div className="absolute bg-gray-300 left-0 top-0 w-px [height:calc(100%-9px)]" />
            <div className="absolute border-b border-l border-gray-300 bottom-0 h-[9px] left-0 rounded-bl-[9px] w-[9px]" />
            <div className="absolute bg-gray-300 bottom-0 h-px left-[8px] w-[7px]" />
            <div className="absolute border-r border-t border-gray-300 bottom-[-2px] right-0 rotate-45 size-[6px]" />
          </div>
        )}

        {/* Left column */}
        <div className="flex-auto min-w-0 flex flex-col">
          <div className="flex flex-col gap-[18px]">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Application Questions
            </h1>

            {/* Tabs */}
            <Tabs defaultValue="default-question">
              <TabsList className="justify-start px-0 border-b-0">
                <TabsTrigger value="default-question" className="pb-[11px]">Default Questions</TabsTrigger>
                <TabsTrigger value="role-specific-questions" className="pb-[11px]">Role-Specific Questions</TabsTrigger>
                <TabsTrigger value="general-questions" className="pb-[11px]">General Questions</TabsTrigger>
              </TabsList>

              <TabsContent value="default-question">
                <div className="flex flex-col gap-6 pt-6">
                  {/* Task types input section */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-3 items-end">
                        <p className="flex-1 min-w-0 text-sm leading-5 font-normal text-gray-500">
                          Select at least 3 task types that best fit your project scope for easier discovery.
                        </p>
                        <span className={cn(
                          "shrink-0 text-xs font-normal text-right whitespace-nowrap",
                          selectedTaskTypes.length >= MAX_TASK_TYPES ? "text-warning-500" : "text-gray-500"
                        )}>
                          {selectedTaskTypes.length}/{MAX_TASK_TYPES}
                        </span>
                      </div>

                      {/* Task types input box */}
                      <div className={cn(
                        "bg-white border rounded-[5px] p-3 shadow-xs flex flex-wrap content-start gap-x-2 gap-y-[10px] items-center",
                        selectedTaskTypes.length >= MAX_TASK_TYPES ? "border-warning-300" : "border-gray-300"
                      )}>
                        {selectedTaskTypes.map((taskType, index) => (
                          <div
                            key={taskType}
                            ref={index === selectedTaskTypes.length - 1 ? lastTaskTypeBadgeRef : undefined}
                          >
                            <Badge
                              visual="primary"
                              size="sm"
                              className="pl-2 pr-1.5 py-0.5 gap-1 cursor-default"
                            >
                              {taskType}
                              <BadgeCloseButton onClick={() => removeTaskType(taskType)}>
                                <X className="size-3" />
                              </BadgeCloseButton>
                            </Badge>
                          </div>
                        ))}
                        {selectedTaskTypes.length < MAX_TASK_TYPES && (
                          <Badge
                            visual="gray"
                            size="sm"
                            className="pl-1.5 pr-2 py-0.5 gap-1 cursor-pointer transition duration-300 hover:bg-gray-200"
                          >
                            <Plus className="size-3" />
                            Add Task Type
                          </Badge>
                        )}
                      </div>
                      {selectedTaskTypes.length >= MAX_TASK_TYPES && (
                        <p className="text-sm leading-5 font-normal text-warning-500">
                          You've reached the maximum of {MAX_TASK_TYPES} task types.
                        </p>
                      )}
                    </div>

                    {/* Suggested Task Types — hidden when max reached */}
                    {selectedTaskTypes.length < MAX_TASK_TYPES && suggestedTaskTypes.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-normal leading-5 text-dark-blue-400">
                          Suggested Task Types
                        </span>
                        <div className="flex flex-wrap content-start gap-3">
                          {suggestedTaskTypes.map((taskType) => (
                            <Badge
                              key={taskType}
                              visual="gray"
                              size="md"
                              className="pl-2.5 pr-2 py-0.5 gap-1 cursor-pointer transition duration-300 hover:bg-gray-200 active:bg-gray-300"
                              onClick={() => addTaskType(taskType)}
                            >
                              {taskType}
                              <Plus className="size-3.5 text-gray-500" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Empty state */}
                  {selectedTaskTypes.length === 0 && (
                    <div className="flex flex-col gap-3 items-center justify-center p-4 rounded-[5px]">
                      <div className="flex flex-col gap-2 items-center text-center">
                        <h2 className="text-lg leading-7 font-semibold text-dark-blue-400">
                          No Task Types yet
                        </h2>
                        <p className="text-sm leading-5 font-light text-dark-blue-400">
                          Start by adding task types to define the work for this project.
                        </p>
                      </div>
                      <Button
                        visual="gray"
                        variant="outlined"
                        className="bg-white"
                        onClick={() => {
                          /* TODO: open task type picker */
                        }}
                      >
                        <Plus className="size-[15px]" />
                        Add Task Types
                      </Button>
                    </div>
                  )}

                  {/* Question preview card */}
                  {selectedTaskTypes.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm leading-5 font-normal text-gray-500">
                        This question appears when talent requests to join the project.
                      </p>

                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)]">
                        <div className="flex gap-2.5 items-start">
                          <div className="shrink-0 w-[15px] pt-[3px]">
                            <span ref={questionLockRef} className="block size-[15px]">
                              <Lock01 className="size-[15px] text-gray-500" />
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-3">
                            {/* Question title + tags */}
                            <div className="flex items-center">
                              <div className="flex gap-6 items-center">
                                <span className="text-base font-semibold leading-[1.3] text-dark-blue-400">
                                  What types of tasks can you help with?
                                </span>
                                <div className="flex gap-2 items-center">
                                  <Badge
                                    visual="gray"
                                    size="sm"
                                    className="rounded bg-gray-50 border border-gray-300 px-2 py-0.5 h-5 text-gray-700"
                                  >
                                    Default
                                  </Badge>
                                  <Badge
                                    visual="gray"
                                    size="sm"
                                    className="rounded bg-gray-100 border-0 px-2 py-0.5 h-5 text-gray-700"
                                  >
                                    Multi-Select
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="w-full h-px bg-gray-200" />

                            {/* Available Options */}
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-3 items-center">
                                <span className="text-[13px] font-normal leading-[21px] text-dark-blue-400">
                                  Available Options
                                </span>
                                <Button
                                  variant="link"
                                  visual="primary"
                                  className="gap-1 text-xs font-bold leading-5 underline decoration-primary-500/30 hover:decoration-primary-500"
                                >
                                  Edit Task Types
                                  <ExternalLink className="size-[15px]" />
                                </Button>
                              </div>

                              <div className="flex flex-wrap content-center gap-2.5 items-center">
                                {SAMPLE_TASK_TYPE_OPTIONS.map((taskType) => (
                                  <Badge
                                    key={taskType}
                                    visual="gray"
                                    size="sm"
                                    className="h-[26px] pl-2 pr-1.5 py-0.5"
                                  >
                                    {taskType}
                                  </Badge>
                                ))}
                                <span className="pl-2.5 pr-2 py-0.5 text-sm font-medium leading-5 text-gray-500 cursor-pointer transition duration-300 hover:opacity-70">
                                  + 8 more
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Task Type Source */}
                  {selectedTaskTypes.length > 0 && (
                    <div className="bg-gray-100 rounded-lg p-5 flex flex-col gap-[15px]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <span className="text-base font-semibold text-dark-blue-400">
                            Task Type Source
                          </span>
                          <p className="text-sm font-normal leading-5 text-gray-600">
                            Task types are derived from your project's categories and scope. Click "Edit Scope" to update phases and tasks.
                          </p>
                        </div>
                        <Button
                          visual="gray"
                          variant="outlined"
                          className="shrink-0 bg-white"
                        >
                          <Edit03 className="size-[15px]" />
                          Edit Scope
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="role-specific-questions">
                <div className="flex flex-col gap-[14px] pt-6">
                  <p className="text-sm leading-5 font-normal text-gray-500">
                    Tailored questions for each role appear when a user selects one. Keep up to 3 question per role.
                  </p>

                  {/* Editing questions for + actions */}
                  <div className="flex items-end justify-end gap-5">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <span className="text-sm font-medium leading-5 text-dark-blue-400">
                        Editing questions for
                      </span>
                      <div className="flex items-center gap-4">
                        <Listbox value="Android Developer" onChange={() => {}}>
                          <ListboxButton
                            placeholder="Select role"
                            className="w-[246px] bg-gray-50 border border-gray-200 rounded-[5px] px-3 py-2"
                          >
                            {({ value }) => (
                              <span className="truncate block text-sm leading-5 font-normal text-gray-700">
                                {value || "Select role"}
                              </span>
                            )}
                          </ListboxButton>
                          <ListboxOptions>
                            {["Android Developer", "iOS Developer", "Frontend Developer", "Backend Engineer", "Product Designer"].map((role) => (
                              <ListboxOption key={role} value={role}>
                                {role}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>

                        <Button
                          variant="link"
                          visual="primary"
                          className="gap-1 text-xs font-bold leading-5 underline decoration-primary-500/30 hover:decoration-primary-500"
                          onClick={() => openEditSkills("Android Developer")}
                        >
                          Edit Skills
                          <ExternalLink className="size-[15px]" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Button
                        visual="gray"
                        variant="outlined"
                        className="bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]"
                        onClick={openAiFaqDialog}
                        disabled={!draftProjectId}
                      >
                        <Stars02 className="size-[15px]" />
                        Generate With AI
                      </Button>

                      <Button
                        visual="gray"
                        variant="outlined"
                        className="bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)] opacity-50"
                      >
                        <RefreshCcw05 className="size-[15px]" />
                        Reset To Defaults
                      </Button>
                    </div>
                  </div>

                  {/* Question cards */}
                  <div className="flex flex-col gap-[10px]">
                    {[
                      {
                        q: "How do you typically start a mobile project?",
                        role: "Android Developer",
                        type: "Single-Select",
                        options: ["Design-first (Figma/prototype)", "Code-first", "Research-first", "It depends"],
                      },
                      {
                        q: "Which testing approaches do you use?",
                        role: "Android Developer",
                        type: "Multi-Select",
                        options: ["Manual", "Automated", "AI-based", "Jira"],
                      },
                      {
                        q: "Which mobile platforms have you shipped products on?",
                        role: "Android Developer",
                        type: "Multi-Select",
                        optional: true,
                        options: ["iOS", "Android", "Web"],
                      },
                    ].map((card) => (
                      <div key={card.q} className="bg-white border border-gray-300 rounded-lg p-4 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)]">
                        <div className="flex items-start gap-[10px]">
                          <div className="shrink-0 w-[15px] py-[3px] cursor-grab">
                            <GripVertical2 />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-3">
                            <div className="flex items-center gap-6">
                              <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                                <span className="text-base font-semibold leading-[1.3] text-dark-blue-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                  {card.q}
                                </span>
                                <div className="flex gap-[6px] items-center">
                                  <Badge visual="gray" size="sm" className="rounded-[4px] bg-gray-50 border border-gray-300 py-[2px] px-2 text-xs font-medium leading-[15px] text-gray-700">
                                    {card.role}
                                  </Badge>
                                  <Badge visual="gray" size="sm" className="rounded-[4px] bg-gray-100 border-0 py-[2px] px-2 text-xs font-medium leading-[15px] text-gray-700">
                                    {card.type}
                                  </Badge>
                                  {card.optional && (
                                    <Badge visual="gray" size="sm" className="rounded-[4px] bg-gray-100 border-0 py-[2px] px-2 text-xs font-medium leading-[15px] text-gray-700">
                                      Optional
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 h-6">
                                <IconButton variant="ghost" visual="gray" className="w-[35px] p-[10px] rounded-[5px]">
                                  <Edit03 className="size-[15px]" />
                                </IconButton>
                                <IconButton variant="ghost" visual="gray" className="w-[35px] p-[10px] rounded-[5px]">
                                  <Trash01 className="size-[15px]" />
                                </IconButton>
                              </div>
                            </div>
                            <div className="w-full h-px bg-gray-200" />
                            <div className="flex flex-col gap-2">
                              <span className="text-[13px] font-normal leading-[21.4px] text-dark-blue-400">
                                Available Options
                              </span>
                              <div className="flex flex-wrap gap-2 items-center">
                                {card.options.map((opt) => (
                                  <Badge key={opt} visual="gray" size="sm" className="rounded-[16px] bg-gray-100 border-0 py-[2px] px-2 text-xs font-medium leading-[18px] text-gray-700">
                                    {opt}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* + Add Question */}
                    <div className="border border-dashed border-gray-300 rounded-[5px] py-[17px] flex items-center justify-center cursor-pointer transition duration-300 hover:border-gray-400 hover:bg-gray-50">
                      <span className="flex items-center gap-2 text-sm font-semibold leading-5 text-gray-500 capitalize">
                        <Plus className="size-[15px]" />
                        Add Question
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="general-questions">
                <div className="flex flex-col gap-[21px] pt-6">
                  <p className="text-sm leading-5 font-normal text-gray-500">
                    These questions appear for all applicants, regardless of their role. Keep it to 2-3 questions to avoid drop-off.
                  </p>

                  <div className="flex flex-col gap-5 pb-6">
                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        visual="gray"
                        variant="outlined"
                        className="bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]"
                        onClick={openAiFaqDialog}
                        disabled={!draftProjectId}
                      >
                        <Stars02 className="size-[15px]" />
                        Generate With AI
                      </Button>

                      <Button
                        visual="gray"
                        variant="outlined"
                        className="bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)] opacity-50"
                      >
                        <RefreshCcw05 className="size-[15px]" />
                        Reset To Defaults
                      </Button>
                    </div>

                    {/* Question cards */}
                    <div className="flex flex-col gap-[10px]">
                      {[
                        { q: "Why do you want to join this project?" },
                        { q: "Briefly describe a relevant project you've worked on and your contribution." },
                      ].map((card) => (
                        <div key={card.q} className="bg-white border border-gray-300 rounded-lg p-4 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)]">
                          <div className="flex items-start gap-[10px]">
                            <div className="shrink-0 w-[15px] py-[3px] cursor-grab">
                              <GripVertical2 />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                              <div className="flex items-center gap-6">
                                <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                                  <span className="text-base font-semibold leading-[1.3] text-dark-blue-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {card.q}
                                  </span>
                                  <div className="flex gap-[6px] items-center">
                                    <Badge visual="gray" size="sm" className="rounded-[4px] bg-gray-50 border border-gray-300 py-[2px] px-2 text-xs font-medium leading-[15px] text-gray-700">
                                      General
                                    </Badge>
                                    <Badge visual="gray" size="sm" className="rounded-[4px] bg-gray-100 border-0 py-[2px] px-2 text-xs font-medium leading-[15px] text-gray-700">
                                      Long text
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 h-6">
                                  <IconButton variant="ghost" visual="gray" className="w-[35px] p-[10px] rounded-[5px]">
                                    <Edit03 className="size-[15px]" />
                                  </IconButton>
                                  <IconButton variant="ghost" visual="gray" className="w-[35px] p-[10px] rounded-[5px]">
                                    <Trash01 className="size-[15px]" />
                                  </IconButton>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* + Add Question */}
                      <div className="border border-dashed border-gray-300 rounded-[5px] py-[17px] flex items-center justify-center cursor-pointer transition duration-300 hover:border-gray-400 hover:bg-gray-50">
                        <span className="flex items-center gap-2 text-sm font-semibold leading-5 text-gray-500 capitalize">
                          <Plus className="size-[15px]" />
                          Add Question
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right column — Arrow + Tip sidebar */}
        <div className="shrink-0 self-start sticky top-6 xs:max-[1024px]:hidden flex items-start pt-6">
          {/* Connector arrow (same as Open Roles) */}
          <div className="flex items-center justify-center mr-[-8px] shrink-0 w-[25.455px] h-[71px]">
            <svg className="rotate-90" width="71" height="20" viewBox="0 0 182.364 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 19V20V20V19ZM167 19V18V18V19ZM1 1.00001H0V11H1H2V1.00001H1ZM9 19V20L167 20V19V18L9 18V19ZM175 11H176V1H175H174V11H175ZM167 19V20C171.971 20 176 15.9705 176 11H175H174C174 14.866 170.866 18 167 18V19ZM1 11H0C0 15.9706 4.02944 20 9 20V19V18C5.13401 18 2 14.866 2 11H1ZM175.707 0.292893C175.317 -0.0976311 174.683 -0.0976311 174.293 0.292893L167.929 6.65685C167.538 7.04738 167.538 7.68054 167.929 8.07107C168.319 8.46159 168.953 8.46159 169.343 8.07107L175 2.41421L180.657 8.07107C181.047 8.46159 181.681 8.46159 182.071 8.07107C182.462 7.68054 182.462 7.04738 182.071 6.65685L175.707 0.292893Z" fill="#D0D5DD"/>
            </svg>
          </div>

          <div className="p-5 rounded-lg w-[269px] bg-primary-50 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-x-2">
                <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
                <span className="text-base leading-[30px] font-semibold capitalize text-gray-800">
                  Tip
                </span>
              </div>
              <p className="text-xs leading-normal text-black/60 tracking-[0.12px]">
                A great title gives your audience a reason to open your project
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Video player */}
              <div className="w-full h-[141px] rounded-lg relative overflow-hidden cursor-pointer group/video">
                <div className="absolute inset-0 bg-black/56 rounded-lg z-[1]" />
                <div className="absolute inset-0 bg-black/10 rounded-lg z-[2]" />
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[58px] z-10 transition duration-300 group-hover/video:scale-110" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.3" />
                  <circle cx="24" cy="24" r="18" fill="white" fillOpacity="0.4" />
                  <path d="M20 16L32 24L20 32V16Z" fill="white" />
                </svg>
                <div className="absolute bottom-[9.2px] right-[9.5px] bg-gray-500 rounded-[3.22px] px-[4.6px] py-[4.6px] z-10">
                  <span className="text-xs font-normal leading-[24.7px] text-white text-center">01:20</span>
                </div>
                <div className="absolute left-[12.4px] top-[47.6px] flex flex-col gap-1 z-10">
                  <span className="text-xs font-medium leading-[27.6px] text-white/80">Part 1</span>
                  <span className="text-[15.3px] font-medium leading-[36.8px] text-white">How to get started</span>
                </div>
              </div>

              {/* Tip card 1 */}
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-25">
                <div className="flex items-start gap-x-3">
                  <CheckCircle className="size-5 shrink-0 text-primary-500" />
                  <span className="text-sm leading-5 font-semibold text-gray-700 truncate">
                    Focus on purpose
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm leading-normal font-normal text-gray-500">
                    Use impactful keywords that communicate value and make it easy to identify in a list of projects.
                  </p>
                </div>
              </div>

              {/* Tip card 2 */}
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-25">
                <div className="flex items-start gap-x-3">
                  <CheckCircle className="size-5 shrink-0 text-primary-500" />
                  <span className="text-sm leading-5 font-semibold text-gray-700 truncate">
                    Keep it short and sweet
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm leading-normal font-normal text-gray-500">
                    Try to trim your project title to be less than 6 words
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI FAQ Generation Modal (copied from my-listings inline edit mode) */}
      <Dialog
        open={aiFaqDialogOpen}
        onOpenChange={setAiFaqDialogOpen}
      >
        <DialogContent className="max-w-[640px] p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-start justify-between">
            <div className="flex items-start gap-x-2">
              <Stars02 className="size-5 text-dark-blue-400 shrink-0 mt-0.5" />
              <div>
                <DialogTitle>
                  AI Generated FAQ&apos;s
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Review and adjust your
                  AI-generated FAQ&apos;s as needed
                </DialogDescription>
              </div>
            </div>
            <Badge
              className="rounded-full bg-success-50 text-success-600 shrink-0"
              visual="gray"
            >
              {faqAddedCount} of{" "}
              {faqSuggestions.length} added
            </Badge>
          </div>

          {faqRemainingSlots <
            faqSuggestions.filter((s) => !s.added)
              .length && (
            <p className="px-6 pt-4 text-sm text-error-500">
              You currently have{" "}
              {faqItems.length} FAQ&apos;s
              in total, so you can only add{" "}
              {faqRemainingSlots} more
            </p>
          )}

          <ScrollArea
            scrollBar={
              <ScrollBar className="w-4 p-1" />
            }
            viewportClassName="max-h-[420px]"
          >
          <div className="px-6 py-4 space-y-3">
            {faqGenLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Spinner
                  size={32}
                  strokeWidth={4}
                />
                <p className="text-sm text-gray-500">
                  Generating suggestions…
                </p>
              </div>
            ) : faqGenError ? (
              <div className="py-8 text-center">
                <p className="text-sm text-error-500">
                  Suggestions couldn&apos;t be
                  loaded. Try again.
                </p>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="mt-3"
                  onClick={runFaqGeneration}
                >
                  <Stars02 className="size-[15px]" />
                  Retry
                </Button>
              </div>
            ) : (
              faqSuggestions.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "group/sfaq relative rounded-lg border p-4 transition",
                    s.added
                      ? "border-success-300 bg-success-25"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-x-3">
                    <h3
                      className={cn(
                        "text-sm font-bold",
                        s.added
                          ? "text-success-700"
                          : "text-dark-blue-400"
                      )}
                    >
                      {s.question}
                    </h3>
                    {s.added ? (
                      <span className="shrink-0 inline-flex items-center gap-x-1 text-sm font-medium text-success-600">
                        <Check className="size-4" />
                        Added
                      </span>
                    ) : (
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover/sfaq:opacity-100 transition"
                        onClick={() =>
                          insertFaqSuggestion(i)
                        }
                      >
                        <Upload01 className="size-[15px]" />
                        Insert
                      </Button>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-sm font-light",
                      s.added
                        ? "text-success-700"
                        : "text-dark-blue-400"
                    )}
                  >
                    {s.answer}
                  </p>
                  {s.added && (
                    <button
                      type="button"
                      onClick={() =>
                        removeFaqSuggestion(i)
                      }
                      className="absolute bottom-3 right-3 size-9 rounded-full border border-success-300 bg-white text-success-600 hover:border-error-300 hover:text-error-500 inline-flex items-center justify-center opacity-0 group-hover/sfaq:opacity-100 transition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button
              variant="outlined"
              visual="gray"
              onClick={runFaqGeneration}
              disabled={faqGenLoading}
            >
              <Stars02 className="size-[15px]" />
              Regenerate
            </Button>
            <Button
              onClick={insertAllFaqSuggestions}
              disabled={
                faqGenLoading ||
                faqRemainingSlots === 0 ||
                faqSuggestions.every((s) => s.added)
              }
            >
              Insert All ({faqSuggestions.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Skills Modal (based on talent profile SkillsDialog, adapted for project roles) */}
      <Dialog open={editSkillsOpen} onOpenChange={setEditSkillsOpen}>
        <DialogContent className="max-w-[700px] rounded-[12px] p-0">
          <DialogTitle className="sr-only">Skills</DialogTitle>
          <ScrollArea
            scrollBar={<ScrollBar className="w-4 p-1" />}
            className="p-6"
            viewportClassName="max-h-[calc(100vh-10rem)]"
          >
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                    Skills
                  </h1>
                  {editSkillsRole && (
                    <Badge
                      className="bg-gray-50 border border-gray-300 rounded-[4px] px-[9px] py-[2px] h-[22px] text-xs font-medium text-gray-700"
                    >
                      {editSkillsRole}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-light text-dark-blue-400">
                  Edit Skills to improve how users are matched to your project.
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Combobox
              multiple
              className="mt-8 w-auto"
              value={editSkillsList}
              onChange={(val: typeof editSkillsList) => {
                const capped = val.slice(0, MAX_SKILLS)
                const unique = capped.filter(
                  (s, i, arr) =>
                    arr.findIndex(
                      (x) => x.name.toLowerCase() === s.name.toLowerCase()
                    ) === i
                )
                setEditSkillsList(unique)
                setSkillQuery("")
              }}
              disabled={editSkillsList.length >= MAX_SKILLS}
            >
              <ComboboxTrigger>
                <ComboboxInput
                  size="lg"
                  displayValue={() => skillQuery}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSkillQuery(event.target.value)}
                  placeholder="Search for skills"
                  disabled={editSkillsList.length >= MAX_SKILLS}
                />
                <ComboboxButton>
                  <SearchMd className="h-4 w-4" />
                </ComboboxButton>
              </ComboboxTrigger>
              <ScaleOutIn afterLeave={() => setSkillQuery("")}>
                <ComboboxOptions>
                  <ScrollArea viewportClassName="max-h-[304px]">
                    {skillResults
                      .filter(
                        (skill) =>
                          !editSkillsList.some(
                            (s) =>
                              s.name.toLowerCase() === skill.name.toLowerCase()
                          )
                      )
                      .map((skill) => (
                        <ComboboxOption
                          key={`${skill.id}-${skill.name}`}
                          value={skill}
                        >
                          {skill.name}
                        </ComboboxOption>
                      ))}
                    {(() => {
                      const q = skillQuery.trim().toLowerCase()
                      const alreadySelected = editSkillsList.some(
                        (s) => s.name.toLowerCase() === q
                      )
                      const visibleOptions = skillResults.filter(
                        (skill) =>
                          !editSkillsList.some(
                            (s) =>
                              s.name.toLowerCase() === skill.name.toLowerCase()
                          )
                      )
                      if (!q || alreadySelected || visibleOptions.length > 0)
                        return null
                      return (
                        <ComboboxOption
                          value={{
                            id: `custom-${skillQuery.trim()}`,
                            name: skillQuery.trim(),
                          }}
                        >
                          Add &ldquo;{skillQuery.trim()}&rdquo;
                        </ComboboxOption>
                      )
                    })()}
                  </ScrollArea>
                </ComboboxOptions>
              </ScaleOutIn>
            </Combobox>

            {editSkillsList.length >= MAX_SKILLS && (
              <p
                role="status"
                aria-live="assertive"
                className="mt-1.5 text-sm font-medium text-error-500"
              >
                You have reached the maximum limit of {MAX_SKILLS} skills.
              </p>
            )}

            <div className="mt-3 flex gap-3 flex-wrap">
              {editSkillsList.map((skill, index) => (
                <Badge visual="primary" key={skill.id ?? skill.name}>
                  {skill.name}
                  <BadgeCloseButton
                    type="button"
                    onClick={() => removeEditSkill(index)}
                  />
                </Badge>
              ))}
            </div>
          </ScrollArea>
          <div className="py-4 px-6 flex items-center justify-between border-t border-gray-200 bg-gray-25 rounded-b-[12px]">
            <DialogClose asChild>
              <Button variant="link" visual="gray" className="opacity-50" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button
              disabled={!editSkillsHasChanges || editSkillsList.length === 0}
              onClick={saveEditSkills}
              className={cn(!editSkillsHasChanges && "opacity-50")}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Requests sub-tab content (pixel-perfect from Figma node 13101:119543)
// ---------------------------------------------------------------------------
const SAMPLE_REQUESTS = [
  {
    id: "1",
    name: "Jordan",
    username: "jordan_dev",
    avatar: "/avatars/kevinpark.fe.png",
    roles: ["Frontend Engineer", "UI Developer"],
    matchPercent: 92,
    requestedAgo: "8 minutes ago",
    skills: ["React", "TypeScript", "CSS"],
    moreSkills: 2,
    quote: "I've rolled out 4 design systems and helped move our Figma tokens to React in my last job.",
  },
  {
    id: "2",
    name: "Jordan",
    username: "jordan_dev",
    avatar: "/avatars/lucasf.pm.png",
    roles: ["Frontend Engineer", "UI Developer"],
    matchPercent: 92,
    requestedAgo: "8 minutes ago",
    skills: ["React", "TypeScript", "CSS"],
    moreSkills: 2,
    quote: "I've rolled out 4 design systems and helped move our Figma tokens to React in my last job.",
  },
  {
    id: "3",
    name: "Jordan",
    username: "jordan_dev",
    avatar: "/avatars/andresilva.be.png",
    roles: ["Frontend Engineer", "UI Developer"],
    matchPercent: 92,
    requestedAgo: "8 minutes ago",
    skills: ["React", "TypeScript", "CSS"],
    moreSkills: 2,
    quote: "I've rolled out 4 design systems and helped move our Figma tokens to React in my last job.",
  },
  {
    id: "4",
    name: "Jordan",
    username: "jordan_dev",
    avatar: "/avatars/dan.okoro.png",
    roles: ["Frontend Engineer", "UI Developer"],
    matchPercent: 92,
    requestedAgo: "8 minutes ago",
    skills: ["React", "TypeScript", "CSS"],
    moreSkills: 2,
    quote: "I've rolled out 4 design systems and helped move our Figma tokens to React in my last job.",
  },
]

const RequestsContent = () => {
  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-8">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Manage Requests
            </h1>
            <p className="text-sm leading-5 font-normal text-gray-500">
              Review join requests, approve contributors, and manage your project team.
            </p>
          </div>

          {/* Requests container */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)] overflow-clip isolate">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-center border-b border-gray-200 rounded-t-lg">
              <div className="flex flex-1 min-w-0 gap-4 items-center">
                <p className="shrink-0 text-dark-blue-400 leading-9 whitespace-pre">
                  <span className="text-base font-semibold">Requests</span>
                  <span className="text-xs font-normal">  </span>
                  <span className="text-xs font-normal">&bull; {SAMPLE_REQUESTS.length} people</span>
                </p>

                <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-[284px]">
                  <SearchMd className="absolute left-[10px] top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or username"
                    className="pl-[34px] pr-3 py-[10px] h-9 rounded-[5px] shadow-xs"
                  />
                </div>

                <Button visual="gray" variant="outlined" className="bg-white h-9 px-[14px] py-2 shadow-xs">
                  <FilterLines className="size-[15px]" />
                  Filters
                </Button>

                <span className="flex items-center gap-2 text-sm font-semibold leading-5 text-gray-500 cursor-pointer transition duration-300 hover:opacity-70">
                  Newest First
                  <ArrowDown className="size-4" />
                </span>
                </div>
              </div>
            </div>

            {/* Request rows */}
            {SAMPLE_REQUESTS.map((req, idx) => (
              <div
                key={req.id + idx}
                className={cn(
                  "px-6 py-4 flex items-start gap-10",
                  idx > 0 && "border-t border-gray-200"
                )}
              >
                {/* Avatar + Content group */}
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  {/* Avatar */}
                  <div className="shrink-0 size-[46px] rounded-full overflow-hidden relative">
                    <Avatar className="size-full">
                      <AvatarImage src={req.avatar || undefined} alt={req.name} className="object-cover" />
                      <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-0.5 flex-wrap">
                        <span className="text-sm font-semibold leading-5 text-dark-blue-400">
                          {req.name}
                        </span>
                        <span className="text-sm font-light text-gray-500">
                          @{req.username}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {req.roles.map((role) => (
                            <Badge key={role} visual="gray" size="sm" className="rounded-[16px] bg-gray-100 border-0 py-[2px] px-2 text-xs font-medium leading-[18px] text-gray-700 mix-blend-multiply">
                              {role}
                            </Badge>
                          ))}
                          <Badge visual="gray" size="sm" className="rounded-[16px] bg-success-50 border-0 py-[2px] px-2 text-xs font-medium leading-[18px] text-success-700 mix-blend-multiply">
                            {req.matchPercent}% Match
                          </Badge>
                          <span className="text-xs font-medium leading-[18px] text-gray-400">
                            Requested {req.requestedAgo}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {req.skills.map((skill) => (
                            <Badge key={skill} visual="gray" size="sm" className="rounded-[100px] bg-gray-100 border-0 px-[7px] py-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                              <Check className="size-[15px] text-primary-500" />
                              {skill}
                            </Badge>
                          ))}
                          {req.moreSkills > 0 && (
                            <span className="text-xs font-semibold leading-[18px] text-dark-blue-400">
                              + {req.moreSkills} more...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-normal leading-4 text-gray-500 not-italic">
                      &ldquo;{req.quote}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <Button visual="gray" variant="outlined" className="bg-white h-9 px-[14px] py-2 shadow-xs">
                    View Request
                  </Button>
                  <IconButton variant="ghost" visual="gray" className="h-9 p-[10px] rounded-full opacity-50 hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="size-[15px]" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Invites sub-tab content (pixel-perfect from Figma nodes 13101:119745 + 13109:182550)
// ---------------------------------------------------------------------------
const SAMPLE_PENDING_INVITES = [
  {
    id: "1",
    email: "david.park@example.com",
    username: "",
    name: "",
    avatar: "",
    status: "Pending" as const,
    role: "Viewer",
    sentAgo: "Sent 3 days ago",
  },
  {
    id: "2",
    email: "lisa.wang@example.com",
    username: "",
    name: "",
    avatar: "",
    status: "Pending" as const,
    role: "Viewer",
    sentAgo: "Sent 7 days ago",
  },
  {
    id: "3",
    email: "lisa.wang@example.com",
    username: "jordan_dev",
    name: "",
    avatar: "/avatars/jamesokafor.png",
    status: "Pending" as const,
    role: "Member",
    sentAgo: "Sent 7 days ago",
    secondarySentAgo: "Sent 12 days ago",
  },
]

const SAMPLE_INVITE_HISTORY = [
  {
    id: "1",
    email: "james.miller@example.com",
    username: "",
    name: "",
    avatar: "",
    status: "Expired" as const,
    role: "Viewer",
    sentAgo: "Sent 2 months ago",
  },
  {
    id: "2",
    email: "",
    username: "ux23isee",
    name: "Sarah",
    avatar: "/avatars/bella.ux.png",
    status: "Accepted" as const,
    role: "Member",
    jobTitle: "Full Stack Designer",
    sentAgo: "Sent 2 months ago",
  },
]

const InvitesContent = () => {
  const [inviteTab, setInviteTab] = useState("pending-invites")

  const currentData = inviteTab === "pending-invites" ? SAMPLE_PENDING_INVITES : SAMPLE_INVITE_HISTORY
  const description = inviteTab === "pending-invites"
    ? "Manage and invite contributors to your project."
    : "View and manage your team's invite history."

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-8">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Manage Invites
            </h1>

            {/* Tabs */}
            <Tabs value={inviteTab} onValueChange={setInviteTab}>
              <TabsList className="justify-start px-0 pt-0 gap-4 border-b-0">
                <TabsTrigger value="pending-invites" className="px-1 pb-[11px] pt-px capitalize">Pending Invites</TabsTrigger>
                <TabsTrigger value="invite-history" className="px-1 pb-[11px] pt-px capitalize">Invite History</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div
            key={inviteTab}
            className="flex flex-col gap-6"
            style={{ animation: "editStepFadeIn 300ms linear forwards" }}
          >
          <div className="flex items-end justify-between gap-6">
            <p className="flex-1 text-sm leading-5 font-normal text-gray-500">
              {description}
            </p>
            <div className="relative shrink-0 w-[284px]">
              <SearchMd className="absolute left-[10px] top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search by name or username"
                className="pl-[34px] pr-3 py-[10px] h-9 rounded-[5px] shadow-xs"
              />
            </div>
          </div>

          {/* Invites container */}
          <div className="bg-white border border-gray-200 rounded-lg drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] overflow-clip">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold leading-5 text-dark-blue-400">
                    {inviteTab === "pending-invites" ? "Pending Invites" : "Invite History"}
                  </span>
                  <div className="size-1 rounded-full bg-dark-blue-400" />
                  <span className="text-xs font-normal text-dark-blue-400">
                    {currentData.length} people
                  </span>
                </div>

                <span className="flex items-center gap-2 px-[14px] py-2 rounded-[5px] text-sm font-semibold leading-5 text-gray-500 cursor-pointer transition duration-300 hover:opacity-70">
                  Newest First
                  <ArrowDown className="size-4" />
                </span>
              </div>

              <Button
                className="h-9 px-[14px] py-2 rounded-[5px] bg-primary-500/15 text-primary-500 text-sm font-semibold leading-5 capitalize border-0 shadow-none hover:bg-primary-500/25"
              >
                <Plus className="size-[15px]" />
                Invite Member
              </Button>
            </div>

            {/* Invite rows */}
            {currentData.map((invite, idx) => (
              <div
                key={invite.id + idx}
                className={cn(
                  "h-20 px-6 py-4 flex items-center gap-3 overflow-clip",
                  idx > 0 && "border-t border-gray-200"
                )}
              >
                {/* Avatar */}
                {invite.avatar && invite.avatar.trim() !== "" ? (
                  <div className="shrink-0 size-[46px] rounded-full overflow-hidden relative">
                    <Avatar className="size-full">
                      <AvatarImage src={invite.avatar} alt={invite.name || invite.email} className="object-cover" />
                      <AvatarFallback>{(invite.name || invite.email).charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                ) : invite.name ? (
                  <div className="shrink-0 size-[46px] rounded-full overflow-hidden relative">
                    <Avatar className="size-full">
                      <AvatarFallback>{invite.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="shrink-0 size-[46px] rounded-full border border-dashed border-gray-400 flex items-center justify-center px-[11px] py-px">
                    <Mail01 className="size-[14px] text-gray-400" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold leading-5 text-dark-blue-400">
                      {invite.name || invite.email}
                    </span>
                    {invite.username && (
                      <span className="text-sm font-light text-gray-500">
                        @{invite.username}
                      </span>
                    )}
                    {invite.status === "Pending" && (
                      <Badge visual="gray" size="sm" className="rounded-[16px] bg-gray-100 border-0 pl-1.5 pr-2 py-[2px] text-xs font-medium leading-[18px] text-gray-700 mix-blend-multiply">
                        <Clock className="size-3" />
                        Pending
                      </Badge>
                    )}
                    {invite.status === "Expired" && (
                      <Badge visual="gray" size="sm" className="rounded-[16px] bg-gray-100 border-0 pl-1.5 pr-2 py-[2px] text-xs font-medium leading-[18px] text-gray-700 mix-blend-multiply">
                        <Clock className="size-3" />
                        Expired
                      </Badge>
                    )}
                    {invite.status === "Accepted" && (
                      <Badge visual="gray" size="sm" className="rounded-[16px] bg-success-50 border-0 pl-1.5 pr-2 py-[2px] text-xs font-medium leading-[18px] text-success-700 mix-blend-multiply">
                        <Check className="size-3" />
                        Accepted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap gap-y-1.5">
                    {(invite as any).jobTitle ? (
                      <span className="text-sm font-normal leading-5 text-dark-blue-400">
                        {(invite as any).jobTitle}
                      </span>
                    ) : (invite as any).secondarySentAgo ? (
                      <span className="text-sm font-normal leading-5 text-dark-blue-400">
                        {invite.sentAgo}
                      </span>
                    ) : null}
                    <Badge
                      visual="primary"
                      size="sm"
                      className="rounded-[16px] bg-primary-50 border-0 py-[2px] px-2 text-xs font-medium leading-[18px] text-primary-500 mix-blend-multiply"
                    >
                      {invite.role}
                    </Badge>
                    <span className="text-xs font-medium leading-[18px] text-gray-400">
                      {(invite as any).secondarySentAgo || invite.sentAgo}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-[9px] shrink-0">
                  {invite.status !== "Accepted" && (
                    <Button visual="gray" variant="outlined" className="bg-white h-9 px-[14px] py-2 shadow-xs">
                      Resend Invitation
                    </Button>
                  )}
                  <IconButton variant="ghost" visual="gray" className="h-9 p-[10px] rounded-full opacity-50 hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="size-[15px]" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

const Team = () => {
  const [members, setMembers] = React.useState<any[]>([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await TeamsAPI.getMyTeam()
        const data = (res as any)?.data?.data ?? (res as any)?.data
        const roster = Array.isArray(data?.members) ? data.members : []
        if (!cancelled) setMembers(roster)
      } catch {
        /* no roster — render empty */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const currentUserId = getCurrentUser()?.id
  const owner =
    members.find((m: any) => m.role === "owner") ?? members[0] ?? null
  const mapRole = (role?: string) =>
    role === "owner" ? "Owner" : role === "lead" ? "Manager" : "Contributor"

  const {
    teamMemberIds,
    setTeamMemberIds,
    pendingInviteEmails,
    setPendingInviteEmails,
    draftProjectId,
    projectScopeMethods,
    teamSubTab,
    publishAttempted,
  } = useProjectScopeContext()
  const inviteWindow = useInviteWindowStore()
  const [addQuery, setAddQuery] = React.useState("")
  const [wizardRoles, setWizardRoles] = React.useState<Record<string, string>>(
    {}
  )
  const [wizardStatus, setWizardStatus] = React.useState<
    Record<string, string>
  >({})
  const [wizardLeadLabel, setWizardLeadLabel] = React.useState("")
  const [wizardLeadId, setWizardLeadId] = React.useState<string | null>(null)
  const [wizardLeadSearch, setWizardLeadSearch] = React.useState("")
  const { toast: wizardToast } = useToast()
  const [wizardRemoveTarget, setWizardRemoveTarget] = React.useState<{
    id: string
    firstName: string
  } | null>(null)
  const confirmWizardRemove = (deactivate: boolean) => {
    const t = wizardRemoveTarget
    if (!t) return
    if (deactivate) {
      setWizardStatus((s) => ({ ...s, [t.id]: "Inactive" }))
      wizardToast({
        title: `${t.firstName} has been deactivated`,
        variant: "success",
      })
    } else {
      removeFromProject(t.id)
      wizardToast({
        title: `${t.firstName} has been removed`,
        variant: "success",
      })
    }
    setWizardRemoveTarget(null)
  }

  const inProject = (m: any) =>
    m.role === "owner" || teamMemberIds.includes(String(m.userId || m.id))
  const projectMembers = members.filter(inProject)
  const addable = members.filter(
    (m: any) =>
      !inProject(m) &&
      (m.firstName || m.username || "")
        .toLowerCase()
        .includes(addQuery.trim().toLowerCase())
  )

  // G7: who the owner is told about. The roster is saved through endpoints that
  // gate every NEW person on verification and answer with one result per entry; a
  // person who is not added never fails the save, so each result is read here, the
  // owner is told who was left out (neutral wording, never why), and the person is
  // taken back out of the roster the page is showing. Failures are never discarded.
  const memberLabelFor = (userId: string | null, index: number) => {
    const m = members.find((x: any) => String(x.userId || x.id) === String(userId))
    return m?.firstName || m?.username || m?.email || (userId ? "this person" : `entry ${index + 1}`)
  }
  const reportedMemberProblems = React.useRef<Map<string, number>>(new Map())
  const reportMemberResults = (
    results: MemberAddResult[],
    announceAlreadyMember: Set<string> = new Set()
  ) => {
    const problems = notAdded(results, memberLabelFor, announceAlreadyMember)
    if (problems.length === 0) return
    const drop = idsToDrop(problems)
    if (drop.size > 0) {
      setTeamMemberIds((prev) => prev.filter((id) => !drop.has(String(id))))
    }
    // The same person can be reported by both saves of one change; say it once.
    const now = Date.now()
    for (const p of problems) {
      const key = `${p.kind}:${p.userId ?? p.index}`
      const last = reportedMemberProblems.current.get(key)
      if (last && now - last < 5000) continue
      reportedMemberProblems.current.set(key, now)
      wizardToast({ title: p.message, variant: "destructive" })
    }
  }
  const reportMemberSaveFailure = (err: unknown, revertTo?: string[]) => {
    // Only the gate being unavailable is announced here; every other failure keeps
    // the autosave's existing quiet behaviour.
    if (!isGateUnavailable(err)) return
    // Only when it actually differs, so an outage cannot make the autosave retry in a loop.
    if (revertTo) {
      setTeamMemberIds((prev) =>
        [...prev].sort().join(",") === [...revertTo].sort().join(",") ? prev : revertTo
      )
    }
    const now = Date.now()
    const last = reportedMemberProblems.current.get("gate-unavailable")
    if (last && now - last < 5000) return
    reportedMemberProblems.current.set("gate-unavailable", now)
    wizardToast({ title: TEAM_SAVE_UNAVAILABLE_MESSAGE, variant: "destructive" })
  }

  const wizardHydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (!draftProjectId || wizardHydratedRef.current) return
    ;(async () => {
      try {
        const res = await ProjectAPI.GetProjectMembers(draftProjectId)
        const pm = ((res as any)?.data ?? []) as any[]
        if (Array.isArray(pm) && pm.length > 0) {
          const roles: Record<string, string> = {}
          const statuses: Record<string, string> = {}
          let leadId: string | null = null
          let leadLabel = ""
          for (const m of pm) {
            const uid = String(m.userId)
            if (m.projectRole) roles[uid] = m.projectRole
            if (m.status) statuses[uid] = m.status
            if (m.isLead) {
              leadId = uid
              leadLabel = m.leadLabel || ""
            }
          }
          setWizardRoles(roles)
          setWizardStatus(statuses)
          if (leadId) setWizardLeadId(leadId)
          if (leadLabel) setWizardLeadLabel(leadLabel)
        }
      } catch {
        /* no members yet */
      }
      wizardHydratedRef.current = true
    })()
  }, [draftProjectId])

  React.useEffect(() => {
    if (!draftProjectId || !wizardHydratedRef.current) return
    const payload = projectMembers.map((m: any) => {
      const id = String(m.userId || m.id)
      const isOwner = m.role === "owner" || m.userId === currentUserId
      const isLead = wizardLeadId ? id === wizardLeadId : isOwner
      return {
        userId: id,
        projectRole: isOwner ? "Owner" : (wizardRoles[id] ?? "Contributor"),
        status: wizardStatus[id] ?? "Active",
        isLead,
        leadLabel: isLead ? wizardLeadLabel || null : null,
      }
    })
    if (payload.length === 0) return
    const t = setTimeout(() => {
      ProjectAPI.SaveProjectMembers(draftProjectId, payload)
        .then((res) => reportMemberResults(readSaveMembersResponse(res).results))
        .catch((err) => reportMemberSaveFailure(err, lastSavedTeamIds.current))
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardRoles, wizardStatus, wizardLeadId, wizardLeadLabel, teamMemberIds])

  // The roster the server last accepted, so an unavailable gate can put the page
  // back instead of leaving people on screen who were not actually added.
  const lastSavedTeamIds = React.useRef<string[]>(teamMemberIds)
  const persistTeam = (next: string[]) => {
    const previous = teamMemberIds
    setTeamMemberIds(next)
    if (draftProjectId) {
      const justChosen = new Set(next.filter((id) => !previous.includes(id)).map(String))
      ProjectAPI.UpdateProjectDraft(draftProjectId, {
        teamMemberIds: next,
      } as any)
        .then((res) => {
          const results = readDraftMemberResults(res)
          lastSavedTeamIds.current = next.filter(
            (id) => !results.some((r) => r.userId === String(id) && !r.added && r.status !== "already_member")
          )
          reportMemberResults(results, justChosen)
        })
        .catch((err) => reportMemberSaveFailure(err, previous))
    }
  }
  // QA-180/PMCM-399: same persistence shape as persistTeam above, for the
  // emails invited via the shared InviteWindow (search or email method)
  // while this listing's dialog context was active. Passed as
  // context.onInvited to inviteWindow.toggle below. Uses the functional
  // setState form (unlike persistTeam) because this fires from a callback
  // captured at dialog-open time, so teamMemberIds's simpler
  // read-then-persistTeam(next) shape could dedupe against a stale prev.
  const handleInvited = React.useCallback(
    (emails: string[]) => {
      if (!emails.length) return
      setPendingInviteEmails((prev) => {
        const next = Array.from(
          new Set([...prev, ...emails.map((email) => email.toLowerCase())])
        )
        if (draftProjectId) {
          ProjectAPI.UpdateProjectDraft(draftProjectId, {
            pendingInviteEmails: next,
          } as any).catch(() => {})
        }
        return next
      })
    },
    [draftProjectId, setPendingInviteEmails]
  )
  const addToProject = (userId: string) => {
    persistTeam(Array.from(new Set([...teamMemberIds, String(userId)])))
    setAddQuery("")
  }
  const removeFromProject = (userId: string) => {
    if (wizardLeadId === String(userId)) setWizardLeadId(null)
    persistTeam(teamMemberIds.filter((id) => id !== String(userId)))
    const [, setPhases] = projectScopeMethods
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        rows: (phase.rows ?? []).map((row) =>
          String(row.assigneeUserId ?? row.assignedMember?.id ?? "") ===
          String(userId)
            ? { ...row, assigneeUserId: null, assignedMember: null }
            : row
        ),
      }))
    )
  }

  if (teamSubTab === "openRoles") {
    return <OpenRolesContent key={teamSubTab} />
  }

  if (teamSubTab === "applicationQuestions") {
    return <ApplicationQuestionsContent key={teamSubTab} />
  }

  if (teamSubTab === "requests") {
    return <RequestsContent key={teamSubTab} />
  }

  if (teamSubTab === "invites") {
    return <InvitesContent key={teamSubTab} />
  }

  if (teamSubTab !== "members") {
    const subLabel = TEAM_SUB_TAB_LABELS[teamSubTab as TeamSubTab] ?? teamSubTab
    return (
      <ScrollArea
        key={teamSubTab}
        className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
        style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px]">
          <div className="flex-auto min-w-0">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              {subLabel}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {teamSubTab === "applicationQuestions" &&
                "Add screening questions that applicants must answer when requesting to join your project."}
              {teamSubTab === "requests" &&
                "Review and manage incoming join requests from talent who want to work on your project."}
              {teamSubTab === "invites" &&
                "Track invitations you have sent to talent for this project."}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center py-16 text-center">
              <div className="mx-auto mb-4 size-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Info className="size-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {subLabel} will be available here once the project is published.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea
      key={teamSubTab}
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      style={{ animation: TEAM_SUB_TAB_ENTRY_ANIMATION }}
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div
        className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row gap-y-10 min-[1024px]:gap-x-[41.45px]"
        id="publish-project-team-members-field"
      >
        <div className="flex-auto min-w-0">
          <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
            Members
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Select a team member to transfer lead status and all related
            permissions for Project Title. Only an existing team member can be
            made the project lead. Read more about roles and permissions.
          </p>

          {/* PMCM-253 follow-up: practically unreachable (the account
          owner always satisfies this check once signed in — see
          sectionValidity's identical condition), kept for defensiveness
          since Team has no RHF form to otherwise surface this on. */}
          {!(teamMemberIds.length > 0 || Boolean(getCurrentUser()?.id)) &&
          publishAttempted ? (
            <ErrorMessage size="sm" className="mt-2">
              Add at least 1 team member to publish.
            </ErrorMessage>
          ) : null}

          {/* Project Owner */}
          <div className="mt-6">
            <span className="text-sm font-semibold text-dark-blue-400">
              Project Owner
            </span>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-x-3">
                <Avatar size="md">
                  <AvatarImage
                    src={owner?.avatarUrl || ""}
                    alt={owner?.firstName || "Owner"}
                  />
                  <AvatarFallback>
                    {(owner?.firstName || owner?.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-bold text-dark-blue-400">
                    {owner?.firstName || owner?.username || "—"}
                  </span>
                  <span className="text-sm font-light text-gray-500">
                    {" "}
                    @{owner?.username || ""}
                  </span>
                  <p className="text-xs font-light text-dark-blue-400">
                    {owner ? "Project Owner" : ""}
                  </p>
                </div>
              </div>
              <Badge visual="primary" className="rounded-[4px] bg-primary-50">
                Account Manager
              </Badge>
            </div>
          </div>

          {/* Assign Project Lead & Select Label */}
          <div className="mt-8 grid grid-cols-2 gap-x-6">
            <div>
              <span className="text-sm font-semibold text-dark-blue-400">
                Assign Project Lead
              </span>
              <div className="mt-2">
                {wizardLeadId ? (
                  (() => {
                    const lead = members.find(
                      (mm: any) => String(mm.userId || mm.id) === wizardLeadId
                    )
                    return lead ? (
                      <div className="flex h-[44px] items-center justify-between rounded-lg border border-gray-200 px-3">
                        <div className="flex items-center gap-x-2">
                          <Avatar size="sm">
                            <AvatarImage
                              src={lead.avatarUrl || undefined}
                              alt={lead.firstName}
                            />
                            <AvatarFallback>
                              {(lead.firstName || "U").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-dark-blue-400">
                            {lead.firstName || lead.username || "User"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-semibold text-gray-700 hover:text-dark-blue-400 focus-visible:outline-none"
                          onClick={() => setWizardLeadId(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null
                  })()
                ) : (
                  <>
                    <InputGroup>
                      <Input
                        className="h-[44px]"
                        placeholder="Search team members"
                        value={wizardLeadSearch}
                        onChange={(e) => setWizardLeadSearch(e.target.value)}
                      />
                      <InputLeftElement>
                        <SearchMd className="text-gray-500 h-4 w-4" />
                      </InputLeftElement>
                    </InputGroup>
                    {wizardLeadSearch &&
                      (() => {
                        const q = wizardLeadSearch.trim().toLowerCase()
                        const candidates = members.filter(
                          (mm: any) =>
                            !q ||
                            (mm.firstName || "").toLowerCase().includes(q) ||
                            (mm.username || "").toLowerCase().includes(q)
                        )
                        return (
                          <div className="mt-1 max-h-[240px] overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-lg">
                            {candidates.length > 0 ? (
                              candidates.map((mm: any) => (
                                <button
                                  key={mm.userId || mm.id}
                                  type="button"
                                  className="flex w-full items-center gap-x-2 px-3 py-2 text-left hover:bg-gray-50"
                                  onClick={() => {
                                    setWizardLeadId(String(mm.userId || mm.id))
                                    setWizardLeadSearch("")
                                  }}
                                >
                                  <Avatar size="sm">
                                    <AvatarImage
                                      src={mm.avatarUrl || undefined}
                                      alt={mm.firstName}
                                    />
                                    <AvatarFallback>
                                      {(
                                        mm.firstName ||
                                        mm.username ||
                                        "U"
                                      ).charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="text-sm font-semibold text-dark-blue-400">
                                      {mm.firstName || mm.username || "User"}
                                    </span>
                                    {mm.username && (
                                      <span className="text-sm font-light text-gray-500">
                                        {" "}
                                        @{mm.username}
                                      </span>
                                    )}
                                    {mm.userId === currentUserId && (
                                      <span className="text-sm font-semibold text-dark-blue-400">
                                        {" "}
                                        (You)
                                      </span>
                                    )}
                                    {mm.recentJobTitle && (
                                      <p className="text-xs font-light text-dark-blue-400">
                                        {mm.recentJobTitle}
                                      </p>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm font-light text-gray-500">
                                No matching members.
                              </div>
                            )}
                          </div>
                        )
                      })()}
                  </>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-dark-blue-400">
                Select label
              </span>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:border-gray-300 focus-visible:outline-none"
                    >
                      <span
                        className={
                          wizardLeadLabel
                            ? "text-dark-blue-400"
                            : "text-gray-500"
                        }
                      >
                        {wizardLeadLabel || "None selected"}
                      </span>
                      <ChevronDown className="size-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    style={{
                      width: "var(--radix-dropdown-menu-trigger-width)",
                    }}
                  >
                    {[
                      "Account Manager",
                      "Project Manager",
                      "Client Relations Manager",
                      "Team Manager",
                    ].map((l) => (
                      <DropdownMenuItem
                        key={l}
                        onClick={() => setWizardLeadLabel(l)}
                      >
                        {l}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setWizardLeadLabel("Use Profile Job Title")}
                    >
                      Use Profile Job Title
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setWizardLeadLabel("Create Custom Label")}
                    >
                      Create Custom Label
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="mt-10">
            <div className="flex items-start justify-between">
              <h2 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
                Team Members
              </h2>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() =>
                  inviteWindow.toggle(true, "Invite Team Members", {
                    // QA-180/PMCM-399: without this the shared dialog
                    // treats any custom-titled caller as share-flavored
                    // and skips company assignment, which is why contact
                    // search always came back empty here — company never
                    // got picked, so useCompanyMembers had nothing to
                    // search. teamInvite: true keeps the custom title but
                    // still shows the company step, same as the default
                    // "Invite Your Team" flow.
                    teamInvite: true,
                    listingId: draftProjectId,
                    onInvited: handleInvited,
                  })
                }
              >
                <Plus className="size-[15px]" />
                Add Team Member
              </Button>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-dark-blue-400">
                All assignees ({projectMembers.length})
              </h3>
              <p className="mt-1 text-xs font-light text-dark-blue-400">
                View and manage all users currently assigned to Project name
                below.
              </p>
            </div>

            <div className="mt-4 relative">
              <span className="text-sm font-semibold text-dark-blue-400">
                Add team members to this project
              </span>
              <InputGroup className="mt-2">
                <Input
                  placeholder="Add users to this project"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                />
                <InputLeftElement>
                  <SearchMd className="text-gray-500 h-4 w-4" />
                </InputLeftElement>
              </InputGroup>
              {addQuery.trim().length > 0 && addable.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)] overflow-hidden max-h-[232px] overflow-y-auto">
                  {addable.map((m: any) => (
                    <button
                      key={m.userId || m.id}
                      type="button"
                      className="w-full flex items-center gap-x-2 px-3 py-2 text-left hover:bg-gray-50 transition duration-150"
                      onClick={() => addToProject(m.userId || m.id)}
                    >
                      <Avatar className="size-6 shrink-0">
                        {m.avatarUrl ? (
                          <AvatarImage src={m.avatarUrl} alt={m.firstName} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {(m.firstName || m.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">
                          {m.firstName || m.username || "User"}
                          <span className="text-gray-400 font-normal ml-0.5">
                            @{m.username}
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-500">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">
                      Project Role
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">
                      Status
                    </TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectMembers.map((m: any, mi: number) => {
                    const id = String(m.userId || m.id || "")
                    const isOwner =
                      m.role === "owner" || m.userId === currentUserId
                    const member = {
                      name: m.firstName || m.username || "User",
                      username: m.username || "",
                      you: m.userId === currentUserId,
                      avatar: m.avatarUrl || "",
                    }
                    const role = isOwner
                      ? "Owner"
                      : (wizardRoles[id] ?? mapRole(m.role))
                    const status = wizardStatus[id] ?? "Active"
                    return (
                    <TableRow key={m.userId || mi}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-x-3">
                          <Avatar size="sm">
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name}
                            />
                            <AvatarFallback>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-semibold text-dark-blue-400">
                              {member.name}
                            </span>
                            <span className="text-sm font-light text-gray-500">
                              {" "}
                              @{member.username}
                            </span>
                            {member.you && (
                              <span className="text-sm font-semibold text-dark-blue-400">
                                {" "}
                                (You)
                              </span>
                            )}
                            <p className="text-xs font-light text-dark-blue-400">
                              Full Stack Designer
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {isOwner ? (
                          <div className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                            Owner
                            <ChevronDown className="size-4 opacity-50" />
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-dark-blue-400 hover:border-gray-300 focus-visible:outline-none"
                              >
                                {role}
                                <ChevronDown className="size-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[288px]"
                            >
                              {["Manager", "Contributor", "Viewer"].map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  className="flex flex-col items-start gap-0.5 py-2"
                                  onClick={() =>
                                    setWizardRoles((mr) => ({ ...mr, [id]: r }))
                                  }
                                >
                                  <span className="flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
                                    {role === r ? (
                                      <Check className="size-4 text-primary-500" />
                                    ) : (
                                      <span className="size-4" />
                                    )}
                                    {r}
                                  </span>
                                  <span className="pl-6 text-xs font-light text-gray-500">
                                    This is where the role&apos;s permissions and
                                    limitations are briefly explained.
                                  </span>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-error-600 focus:text-error-600"
                                onClick={() =>
                                  setWizardRemoveTarget({
                                  id: String(m.userId || m.id),
                                  firstName: member.name,
                                })
                                }
                              >
                                <XCircle className="size-4" />
                                Remove from project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            status === "Active"
                              ? "text-success-500"
                              : "text-gray-500"
                          )}
                        >
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton variant="ghost" visual="gray" size="sm">
                              <MoreHorizontal className="size-4" />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[200px]"
                          >
                            <DropdownMenuItem>Manage User</DropdownMenuItem>
                            <DropdownMenuItem>
                              Assign Team Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Transfer Ownership
                            </DropdownMenuItem>
                            {status === "Inactive" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setWizardStatus((s) => ({
                                    ...s,
                                    [id]: "Active",
                                  }))
                                }
                              >
                                Activate User
                              </DropdownMenuItem>
                            )}
                            {!isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-error-600 focus:text-error-600"
                                  onClick={() =>
                                    setWizardRemoveTarget({
                                  id: String(m.userId || m.id),
                                  firstName: member.name,
                                })
                                  }
                                >
                                  <XCircle className="size-4" />
                                  Remove from project
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                  {/* QA-180/PMCM-399 AC: invited-but-not-yet-accepted addresses
                  show as "Pending Invite" here, same table/columns as real
                  members — no role yet (nothing to assign until they accept),
                  no dropdown (nothing to manage besides canceling). */}
                  {pendingInviteEmails.map((email) => (
                    <TableRow key={`pending-invite-${email}`}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-x-3">
                          <Avatar size="sm">
                            <AvatarFallback>
                              {email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-dark-blue-400">
                            {email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-400">—</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm font-semibold text-gray-500">
                          Pending Invite
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="link"
                          visual="gray"
                          size="sm"
                          className="text-error-600"
                          onClick={() => {
                            const next = pendingInviteEmails.filter(
                              (e) => e !== email
                            )
                            setPendingInviteEmails(next)
                            if (draftProjectId) {
                              ProjectAPI.UpdateProjectDraft(draftProjectId, {
                                pendingInviteEmails: next,
                              } as any).catch(() => {})
                            }
                          }}
                        >
                          Cancel Invite
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
          <ProjectInfoTip showArrow />
        </div>
      </div>

      <Dialog
        open={!!wizardRemoveTarget}
        onOpenChange={(o) => !o && setWizardRemoveTarget(null)}
      >
        <DialogContent className="max-w-[540px] p-0">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-dark-blue-400">
              Remove this user?
            </h3>
            <p className="mt-2 text-sm font-light text-gray-500">
              <span className="font-semibold text-dark-blue-400">
                {wizardRemoveTarget?.firstName}
              </span>{" "}
              will no longer have access to this project, including any tasks,
              files, or chat threads previously assigned. This will not delete
              any tasks, files, or comments.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 py-4 px-6">
            <Button
              type="button"
              variant="link"
              visual="gray"
              onClick={() => setWizardRemoveTarget(null)}
            >
              <X className="size-[15px]" />
              Cancel
            </Button>
            <div className="flex items-center gap-x-3">
              <Button
                variant="outlined"
                visual="gray"
                className="text-error-600"
                onClick={() => confirmWizardRemove(true)}
              >
                Deactivate Instead
              </Button>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => confirmWizardRemove(false)}
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}

type WizardFaq = { id: string; q: string; a: string }

type RecentQuestion = {
  id: string
  question: string
  answer: string | null
  askedByName?: string | null
  askedByUsername?: string | null
  askedAt?: string | null
  answeredByUserId?: string | null
  answeredByName?: string | null
  answeredByRole?: string | null
  assignedToUserId?: string | null
  hidden?: boolean
  moderationFailed?: boolean
}

function HideToggle({
  hidden,
  moderationFailed,
  onToggle,
}: {
  hidden: boolean
  moderationFailed?: boolean
  onToggle: (value: boolean) => void
}) {
  if (moderationFailed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Switch checked={hidden} disabled />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            This question can&apos;t be made visible because it didn&apos;t pass
            content moderation.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return <Switch checked={hidden} onCheckedChange={(v) => onToggle(!!v)} />
}

const SortableFaqItem = ({
  id,
  faq,
  index,
  onChange,
  onDelete,
}: {
  id: string
  faq: { q: string; a: string }
  index: number
  onChange: (id: string, patch: Partial<{ q: string; a: string }>) => void
  onDelete: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <AccordionItem
      ref={setNodeRef}
      style={style}
      value={id}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <div className="flex items-center gap-3 p-4 [&:has([data-state=open])_.closed-icons]:hidden [&:has([data-state=closed])_.open-icons]:hidden [&:has([data-state=open])_.closed-text]:hidden [&:has([data-state=open])_.open-text]:inline">
        <div
          className="cursor-grab text-gray-400 hover:text-gray-600 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical2 />
        </div>
        <AccordionTrigger className="flex-1 min-w-0 flex items-center gap-3">
          <div className="min-w-0 flex-1 text-left">
            <span className="text-sm font-bold text-dark-blue-400">
              Question {index + 1}
              <span className="closed-text">:</span>
            </span>
            <span className="closed-text"> </span>
            <span className="closed-text text-sm text-dark-blue-400">
              {faq.q}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="open-icons">
              <IconButton
                asChild
                variant="ghost"
                visual="gray"
                size="sm"
                className="rounded-full text-gray-500 hover:text-gray-800"
              >
                <span>
                  <Check className="size-4" />
                </span>
              </IconButton>
            </span>
            <span className="closed-icons">
              <IconButton
                asChild
                variant="ghost"
                visual="gray"
                size="sm"
                className="rounded-full text-gray-500 hover:text-gray-800"
              >
                <span>
                  <Edit03 className="size-4" />
                </span>
              </IconButton>
            </span>
          </div>
        </AccordionTrigger>
        <IconButton
          variant="ghost"
          visual="gray"
          size="sm"
          className="rounded-full text-gray-500 hover:text-gray-800 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(id)
          }}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      <DisclosureContent className="px-4 pb-4">
        <p className="text-sm font-light text-dark-blue-400">
          Make this clear and concise, this is what customers will see first.
        </p>
        <Input
          className="mt-2"
          value={faq.q}
          onChange={(e) => onChange(id, { q: e.target.value })}
        />
        <div className="mt-4">
          <h3 className="text-sm font-bold text-dark-blue-400">Answer</h3>
          <p className="mt-1 text-sm font-light text-dark-blue-400">
            Provide a detailed, helpful response that fully addresses the
            question
          </p>
        </div>
        <Textarea
          className="mt-2"
          rows={4}
          value={faq.a}
          onChange={(e) => onChange(id, { a: e.target.value })}
          maxLength={300}
        />
        <div className="mt-1 flex items-center justify-between">
          <Button variant="outlined" visual="gray" size="sm">
            <Stars02 className="size-[15px]" />
            Generate With AI
          </Button>
          <span className="text-xs text-gray-500">{faq.a.length}/300</span>
        </div>
      </DisclosureContent>
    </AccordionItem>
  )
}

const Questions = ({
  faqs,
  setFaqs,
  draftProjectId,
  onRecentQuestionsChange,
  publishAttempted = false,
  moderationError = null,
}: {
  faqs: WizardFaq[]
  setFaqs: React.Dispatch<React.SetStateAction<WizardFaq[]>>
  draftProjectId: string | null
  onRecentQuestionsChange?: (hasQuestions: boolean) => void
  publishAttempted?: boolean
  moderationError?: string | null
}) => {
  const completedFaqCount = faqs.filter(
    (faq) => faq.q.trim() && faq.a.trim()
  ).length
  const showFaqError =
    completedFaqCount < 3 && (publishAttempted || faqs.length > 0)
  const [questionsTab, setQuestionsTab] = useState("FAQs")
  const [recentQTab, setRecentQTab] = useState("all")
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(false)
  const [suggestions, setSuggestions] = useState<
    Array<{ question: string; answer: string; added?: boolean }>
  >([])

  const [questions, setQuestions] = useState<RecentQuestion[]>([])
  const [assignTeam, setAssignTeam] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const questionsHydrated = useRef(false)

  useEffect(() => {
    if (!draftProjectId) return
    ProjectAPI.GetProjectDraft(draftProjectId)
      .then((res) => {
        const d = res?.data ?? {}
        const rq = (d.recentQuestions ?? []).map(
          (q: RecentQuestion, i: number) => ({
            ...q,
            id: q.id ?? `rq-${i}`,
          })
        )
        setQuestions(rq)
        const team = (d.team ?? []).map((t: any) => ({
          id: String(t.userId ?? t.id ?? ""),
          name:
            [t.firstName, t.lastName].filter(Boolean).join(" ") ||
            t.username ||
            "Team Member",
        }))
        setAssignTeam(team.filter((t: { id: string }) => t.id))
        questionsHydrated.current = true
      })
      .catch(() => {})
  }, [draftProjectId])

  useEffect(() => {
    onRecentQuestionsChange?.(questions.length > 0)
  }, [questions, onRecentQuestionsChange])

  useEffect(() => {
    if (!questionsHydrated.current || !draftProjectId) return
    const t = setTimeout(() => {
      ProjectAPI.SaveProjectQuestions(draftProjectId, questions)
        .then((res) => {
          const saved = res?.data
          if (!Array.isArray(saved)) return
          const byId = new Map(
            saved.map((s: RecentQuestion, i: number) => [s.id ?? `rq-${i}`, s])
          )
          setQuestions((prev) => {
            let changed = false
            const next = prev.map((q) => {
              const s = q.id ? byId.get(q.id) : undefined
              if (s && !!s.moderationFailed !== !!q.moderationFailed) {
                changed = true
                return { ...q, moderationFailed: s.moderationFailed }
              }
              return q
            })
            return changed ? next : prev
          })
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [questions, draftProjectId])

  const isAnswered = (q: RecentQuestion) => !!(q.answer && q.answer.trim())
  const updateQuestion = (id: string, patch: Partial<RecentQuestion>) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, ...patch } : q))
    )
  const handleAnswerChange = (id: string, text: string) => {
    const me = getCurrentUser() as
      | {
          id?: string
          firstName?: string
          lastName?: string
          username?: string
        }
      | null
    const hasText = !!text.trim()
    updateQuestion(id, {
      answer: text,
      answeredByUserId: hasText ? (me?.id ? String(me.id) : null) : null,
      answeredByName: hasText
        ? [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
          me?.username ||
          "You"
        : null,
      answeredByRole: hasText ? "Project Lead" : null,
    })
  }
  const answeredCount = questions.filter(isAnswered).length
  const awaitingCount = questions.length - answeredCount
  const visibleQuestions =
    recentQTab === "awaiting"
      ? questions.filter((q) => !isAnswered(q))
      : recentQTab === "answered"
        ? questions.filter(isAnswered)
        : questions

  const remainingSlots = Math.max(0, 10 - faqs.length)
  const addedCount = suggestions.filter((s) => s.added).length

  const runFaqGeneration = async () => {
    if (!draftProjectId) return
    setGenError(false)
    setGenerating(true)
    try {
      const res = await ProjectAPI.SuggestFaqs(draftProjectId)
      const data = (res?.data ?? []) as Array<{
        question: string
        answer: string
      }>
      const seen = new Set<string>()
      const deduped = data.filter((d) => {
        const key = (d?.question ?? "").trim().toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      setSuggestions(deduped.map((d) => ({ ...d, added: false })))
    } catch (error) {
      console.error("Failed to generate FAQs", error)
      setGenError(true)
    } finally {
      setGenerating(false)
    }
  }

  const openAiFaqDialog = () => {
    setAiOpen(true)
    void runFaqGeneration()
  }

  const insertSuggestion = (idx: number) => {
    const s = suggestions[idx]
    if (!s || s.added || faqs.length >= 10) return
    setFaqs((items) => [
      ...items,
      { id: `faq-ai-${Date.now()}-${idx}`, q: s.question, a: s.answer },
    ])
    setSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: true } : x))
    )
  }

  const removeSuggestion = (idx: number) => {
    const s = suggestions[idx]
    if (!s) return
    const key = s.question.trim().toLowerCase()
    setFaqs((items) => items.filter((f) => f.q.trim().toLowerCase() !== key))
    setSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: false } : x))
    )
  }

  const insertAllSuggestions = () => {
    const seen = new Set(faqs.map((f) => f.q.trim().toLowerCase()))
    const toAdd = suggestions
      .filter((s) => !s.added && !seen.has(s.question.trim().toLowerCase()))
      .slice(0, remainingSlots)
    if (toAdd.length === 0) return
    setFaqs((items) => [
      ...items,
      ...toAdd.map((s, i) => ({
        id: `faq-ai-all-${Date.now()}-${i}`,
        q: s.question,
        a: s.answer,
      })),
    ])
    const addedKeys = new Set(toAdd.map((s) => s.question.trim().toLowerCase()))
    setSuggestions((prev) =>
      prev.map((x) =>
        addedKeys.has(x.question.trim().toLowerCase())
          ? { ...x, added: true }
          : x
      )
    )
  }

  const handleAddFaq = () => {
    setFaqs((items) =>
      items.length >= 10
        ? items
        : [...items, { id: `faq-${Date.now()}-${items.length}`, q: "", a: "" }]
    )
  }

  const handleFaqChange = (
    id: string,
    patch: Partial<{ q: string; a: string }>
  ) => {
    setFaqs((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const handleDeleteFaq = (id: string) => {
    setFaqs((items) => items.filter((item) => item.id !== id))
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFaqs((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-70px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row gap-y-10 min-[1024px]:gap-x-[41.45px]">
        <div className="flex-auto min-w-0">
          <RadixTabs.Root defaultValue="FAQs">
            <RadixTabs.List className="inline-flex items-end gap-4 border-b border-b-gray-200 w-full">
              <RadixTabs.Trigger
                id="publish-project-faqs-field"
                value="FAQs"
                className="inline-flex items-center justify-center px-1 pb-2 pt-px text-sm font-semibold text-gray-500 data-[state=active]:text-primary-500 border-b-2 border-transparent data-[state=active]:border-primary-500 focus-visible:outline-none"
              >
                FAQ&apos;s
              </RadixTabs.Trigger>
              <RadixTabs.Trigger
                id="publish-project-recent-questions-field"
                value="RecentQuestions"
                className="inline-flex items-center justify-center px-1 pb-2 pt-px text-sm font-semibold text-gray-500 data-[state=active]:text-primary-500 border-b-2 border-transparent data-[state=active]:border-primary-500 focus-visible:outline-none"
              >
                Recent Questions
              </RadixTabs.Trigger>
            </RadixTabs.List>

            <RadixTabs.Content
              value="FAQs"
              className="focus-visible:outline-none"
            >
              <p className="mt-4 text-sm font-light text-dark-blue-400">
                Write a response for each of the question added to this project.
                Drag and drop FAQ items to reorder them. The order you set here
                will be reflected on your project&apos;s public FAQ page.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={openAiFaqDialog}
                  disabled={!draftProjectId}
                >
                  <Stars02 className="size-[15px]" />
                  Generate With AI
                </Button>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={handleAddFaq}
                  disabled={faqs.length >= 10}
                >
                  <Plus className="size-[15px]" />
                  Add Question
                </Button>
              </div>

              {showFaqError && (
                <ErrorMessage size="sm" className="mt-2">
                  Please add at least 3 FAQs before publishing.
                </ErrorMessage>
              )}

              {moderationError && (
                <ErrorMessage size="sm" className="mt-2">
                  {`FAQ content did not meet community guidelines. ${moderationError}`}
                </ErrorMessage>
              )}

              <Dialog open={aiOpen} onOpenChange={setAiOpen}>
                <DialogContent className="max-w-[640px] p-0 gap-0">
                  <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-start justify-between">
                    <div className="flex items-start gap-x-2">
                      <Stars02 className="size-5 text-dark-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <DialogTitle>AI Generated FAQ&apos;s</DialogTitle>
                        <DialogDescription className="mt-1">
                          Review and adjust your AI-generated FAQ&apos;s as needed
                        </DialogDescription>
                      </div>
                    </div>
                    <Badge
                      className="rounded-full bg-success-50 text-success-600 shrink-0"
                      visual="gray"
                    >
                      {addedCount} of {suggestions.length} added
                    </Badge>
                  </div>

                  {remainingSlots <
                    suggestions.filter((s) => !s.added).length && (
                    <p className="px-6 pt-4 text-sm text-error-500">
                      You currently have {faqs.length} FAQ&apos;s in total, so
                      you can only add {remainingSlots} more
                    </p>
                  )}

                  <div className="px-6 py-4 max-h-[420px] overflow-y-auto space-y-3">
                    {generating ? (
                      <p className="py-8 text-center text-sm text-gray-500">
                        Generating suggestions…
                      </p>
                    ) : genError ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-error-500">
                          Suggestions couldn&apos;t be loaded. Try again.
                        </p>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="mt-3"
                          onClick={runFaqGeneration}
                        >
                          <Stars02 className="size-[15px]" />
                          Retry
                        </Button>
                      </div>
                    ) : suggestions.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500">
                        No suggestions available.
                      </p>
                    ) : (
                      suggestions.map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            "group/sfaq relative rounded-lg border p-4 transition",
                            s.added
                              ? "border-success-300 bg-success-25"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-x-3">
                            <h3
                              className={cn(
                                "text-sm font-bold",
                                s.added
                                  ? "text-success-700"
                                  : "text-dark-blue-400"
                              )}
                            >
                              {s.question}
                            </h3>
                            {s.added ? (
                              <span className="shrink-0 inline-flex items-center gap-x-1 text-sm font-medium text-success-600">
                                <Check className="size-4" />
                                Added
                              </span>
                            ) : (
                              <Button
                                variant="outlined"
                                visual="gray"
                                size="sm"
                                className="shrink-0 opacity-0 group-hover/sfaq:opacity-100 transition"
                                onClick={() => insertSuggestion(i)}
                              >
                                <Upload01 className="size-[15px]" />
                                Insert
                              </Button>
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-1 text-sm font-light",
                              s.added
                                ? "text-success-700"
                                : "text-dark-blue-400"
                            )}
                          >
                            {s.answer}
                          </p>
                          {s.added && (
                            <button
                              type="button"
                              onClick={() => removeSuggestion(i)}
                              className="absolute bottom-3 right-3 size-9 rounded-full border border-success-300 bg-white text-success-600 hover:border-error-300 hover:text-error-500 inline-flex items-center justify-center opacity-0 group-hover/sfaq:opacity-100 transition"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <Button
                      variant="outlined"
                      visual="gray"
                      onClick={runFaqGeneration}
                      disabled={generating}
                    >
                      <Stars02 className="size-[15px]" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={insertAllSuggestions}
                      disabled={
                        generating ||
                        remainingSlots === 0 ||
                        suggestions.every((s) => s.added)
                      }
                    >
                      Insert All ({suggestions.length})
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                {faqs.length === 0 ? (
                  <div className="mt-4 rounded-lg border-2 border-gray-200 bg-gray-25 p-6">
                    <h3 className="text-base font-semibold text-dark-blue-400">
                      No FAQs Yet
                    </h3>
                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                      Add a frequently asked question, or generate suggestions
                      with AI, to help visitors understand your project.
                    </p>
                  </div>
                ) : (
                  <SortableContext
                    items={faqs.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Accordion
                      type="single"
                      collapsible
                      className="mt-4 space-y-3"
                      value={openFaqId ?? ""}
                      onValueChange={(val) => setOpenFaqId(val || null)}
                    >
                      {faqs.map((faq, idx) => (
                        <SortableFaqItem
                          key={faq.id}
                          id={faq.id}
                          faq={faq}
                          index={idx}
                          onChange={handleFaqChange}
                          onDelete={handleDeleteFaq}
                        />
                      ))}
                    </Accordion>
                  </SortableContext>
                )}
              </DndContext>
            </RadixTabs.Content>

            <RadixTabs.Content
              value="RecentQuestions"
              className="focus-visible:outline-none"
            >
              <p className="mt-4 text-sm font-light text-dark-blue-400">
                Write an response for each of the recently asked questions
                below. You can only respond to questions that have not yet been
                answered.
              </p>

              <Tabs
                value={recentQTab}
                onValueChange={setRecentQTab}
                className="mt-4"
              >
                <TabsList className="justify-start border-b border-gray-200 px-0 pt-0">
                  <TabsTrigger value="all">
                    All ({questions.length})
                  </TabsTrigger>
                  <TabsTrigger value="awaiting">
                    Awaiting Response ({awaitingCount})
                  </TabsTrigger>
                  <TabsTrigger value="answered">
                    Answered ({answeredCount})
                  </TabsTrigger>
                </TabsList>

                {visibleQuestions.length === 0 ? (
                  <div className="mt-4 rounded-lg border-2 border-gray-200 bg-gray-25 p-6">
                    <h3 className="text-base font-semibold text-dark-blue-400">
                      No Recent Questions
                    </h3>
                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                      You will see recent questions here once your project is
                      live in the marketplace and visitors engage in chat with
                      you and your team.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {visibleQuestions.map((q) => {
                      const answered = isAnswered(q)
                      const expanded = expandedId === q.id
                      const responding = respondingId === q.id
                      const showEditor = expanded && (answered || responding)
                      const assignedName = q.assignedToUserId
                        ? assignTeam.find(
                            (t) => t.id === String(q.assignedToUserId)
                          )?.name
                        : null
                      return (
                        <div
                          key={q.id}
                          className="rounded-lg border border-gray-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              {expanded && (
                                <Check
                                  className={cn(
                                    "size-4 mt-0.5 shrink-0",
                                    answered
                                      ? "text-success-500"
                                      : "text-gray-400"
                                  )}
                                />
                              )}
                              <p className="text-sm font-medium text-dark-blue-400">
                                {q.question}
                              </p>
                            </div>
                            {!expanded && (
                              <IconButton
                                variant="ghost"
                                visual="gray"
                                size="sm"
                                className="rounded-full text-gray-500 hover:text-gray-800 shrink-0"
                                onClick={() => setExpandedId(q.id)}
                              >
                                <Edit03 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-2 text-xs text-gray-500",
                              expanded && "ml-6"
                            )}
                          >
                            Asked by {q.askedByName ?? "Someone"}{" "}
                            <span className="text-gray-400">
                              @{q.askedByUsername ?? "user"}
                            </span>{" "}
                            {q.askedAt ?? "recently"}
                            {!expanded && (
                              <span
                                className={cn(
                                  "ml-3 text-xs font-semibold",
                                  answered
                                    ? "text-success-500"
                                    : "text-warning-500"
                                )}
                              >
                                {answered ? "Answered" : "Awaiting Response"}
                              </span>
                            )}
                          </p>

                          {showEditor && (
                            <div className="mt-3 ml-6">
                              <div className="flex items-center gap-2">
                                <Avatar size="xs">
                                  <AvatarImage src="/man.jpg" alt="" />
                                  <AvatarFallback>
                                    {(q.answeredByName ?? "You").slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-medium text-dark-blue-400">
                                  {q.answeredByName ?? "You"}{" "}
                                  <Badge
                                    visual="primary"
                                    className="ml-1 rounded-[4px] bg-primary-50 text-[10px]"
                                  >
                                    {q.answeredByRole ?? "Project Lead"}
                                  </Badge>
                                </p>
                              </div>
                              <Textarea
                                className="mt-2"
                                rows={3}
                                maxLength={300}
                                placeholder="Write your response..."
                                value={q.answer ?? ""}
                                onChange={(e) =>
                                  handleAnswerChange(q.id, e.target.value)
                                }
                              />
                              <p className="mt-1 text-right text-xs text-gray-500">
                                {(q.answer ?? "").length}/300
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <HideToggle
                                  hidden={!!q.hidden}
                                  moderationFailed={q.moderationFailed}
                                  onToggle={(v) =>
                                    updateQuestion(q.id, { hidden: v })
                                  }
                                />
                                <span className="text-xs text-gray-500">
                                  Hide this question
                                </span>
                              </div>
                            </div>
                          )}

                          {expanded && !showEditor && (
                            <>
                              <div className="mt-3 ml-6 flex items-center gap-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outlined"
                                      visual="gray"
                                      size="sm"
                                    >
                                      {assignedName
                                        ? `Assigned: ${assignedName}`
                                        : "Assign To Team Member"}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="min-w-[220px]"
                                  >
                                    {assignTeam.length === 0 ? (
                                      <DropdownMenuItem disabled>
                                        No team members
                                      </DropdownMenuItem>
                                    ) : (
                                      assignTeam.map((t) => (
                                        <DropdownMenuItem
                                          key={t.id}
                                          onSelect={() =>
                                            updateQuestion(q.id, {
                                              assignedToUserId: t.id,
                                            })
                                          }
                                        >
                                          {t.name}
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  size="sm"
                                  onClick={() => setRespondingId(q.id)}
                                >
                                  Respond
                                </Button>
                              </div>
                              <div className="mt-3 ml-6 flex items-center gap-2">
                                <HideToggle
                                  hidden={!!q.hidden}
                                  moderationFailed={q.moderationFailed}
                                  onToggle={(v) =>
                                    updateQuestion(q.id, { hidden: v })
                                  }
                                />
                                <span className="text-xs text-gray-500">
                                  Hide this question
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Tabs>

              {visibleQuestions.length > 5 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outlined" visual="gray" size="sm">
                    View More
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              )}
            </RadixTabs.Content>
          </RadixTabs.Root>
        </div>
        <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
          <ProjectInfoTip showArrow />
        </div>
      </div>
    </ScrollArea>
  )
}

function PublishProject({
  media,
  projectInfo,
  projectScope,
  slug,
}: {
  projectInfo?: React.ReactElement<ProgressProps>
  media?: React.ReactElement<ProgressProps>
  projectScope?: React.ReactElement<ProgressProps>
  slug?: string
}) {
  const {
    nextStep,
    prevStep,
    setStep,
    toggleStepValidation,
    state: { currentStep, hasNextStep, hasPreviousStep, totalSteps },
    stepsState,
  } = useStepper({
    steps,
  })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, openAuthModal } = useAuth()
  // PMCM-261/AC3: this wizard has no auth-prompt mechanism of its own
  // (unlike project-details' promptSignIn, PMCM-402/PMCM-260) — a 401 on
  // publish/autosave previously fell through to generic/leaky error
  // handling with no way to resume. Open the modal in place (never
  // router.push("/sign-in")) and queue the retry, same local
  // ref-resume pattern as my-listings/project-details.
  const pendingSessionActionRef = useRef<(() => void) | null>(null)
  const promptSignInToRetry = useCallback(
    (retry: () => void) => {
      pendingSessionActionRef.current = retry
      openAuthModal("sign-in")
    },
    [openAuthModal]
  )
  useEffect(() => {
    if (user?.id && pendingSessionActionRef.current) {
      const action = pendingSessionActionRef.current
      pendingSessionActionRef.current = null
      action()
    }
  }, [user?.id])
  const handledCheckoutStepRef = useRef(false)

  useEffect(() => {
    if (handledCheckoutStepRef.current) return
    if (searchParams.get("checkoutStep") !== "scope") return

    handledCheckoutStepRef.current = true
    setStep(2)

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("checkoutStep")
    const nextQuery = nextSearchParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
  }, [pathname, router, searchParams, setStep])

  // PMCM-253 follow-up: setStep(n) unmounts the previous step's whole
  // subtree and mounts the new one (Step in components/ui/stepper renders
  // `active ? children : null`) — any trigger()/setFocus/scrollIntoView
  // aimed at the new step's fields has to run AFTER that mount, not in the
  // same tick as setStep. pendingStepFocusRef holds what to run once
  // currentStep catches up; stepFocusToken always changes on every publish
  // attempt (even re-clicking Publish while already sitting on the target
  // step, where currentStep itself never changes) so the effect below
  // reliably fires on the very first click, not just the second.
  const pendingStepFocusRef = useRef<{ step: number; run: () => void } | null>(
    null
  )
  const [stepFocusToken, setStepFocusToken] = useState(0)
  const scheduleStepFocus = useCallback((step: number, run: () => void) => {
    pendingStepFocusRef.current = { step, run }
    setStepFocusToken((token) => token + 1)
  }, [])
  useEffect(() => {
    const pending = pendingStepFocusRef.current
    if (!pending || pending.step !== currentStep) return
    pendingStepFocusRef.current = null
    pending.run()
  }, [currentStep, stepFocusToken])

  const stepperValue = useMemo(
    () => ({ nextStep, prevStep, setStep, toggleStepValidation }),
    [nextStep, prevStep, setStep, toggleStepValidation]
  )
  // PMCM-253/E1: true forever once a section has been valid at least once
  // this session — lets a since-cleared required field in an
  // already-finished section drop straight to "error" instead of quietly
  // back to "incomplete".
  const [everCompletedSteps, setEverCompletedSteps] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ])
  // PMCM-253 follow-up (product direction): this is an edit system, not a
  // step-by-step wizard — every section is always open, nothing is ever
  // locked. The shared useStepper hook (utils/hooks.ts, shared by
  // onboarding/client, onboarding/talent, job-listing, publish-project, and
  // security-settings.tsx) still runs its own disabled cascade internally
  // on an invalid step — left untouched since other flows depend on it —
  // so `disabled` is hardcoded false here on every step before it reaches
  // context, instead of changing the hook itself. Every existing reader of
  // stepsState[index].disabled (this sidebar's click handling, the
  // PMCM-252 sub-items) now always sees an unlocked section.
  const stepperRootValue = useMemo(
    () => ({
      currentStep,
      hasNextStep,
      hasPreviousStep,
      totalSteps,
      stepsState: stepsState.map((step) => ({
        ...step,
        disabled: false,
      })),
    }),
    [currentStep, hasNextStep, hasPreviousStep, totalSteps, stepsState]
  )
  const [isSaveExitDialogOpen, toggleIsSaveExitDialogOpen] = useToggle(false)
  // PMCM-403: shared publish-confirmation modal's open state.
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const projectInfoMethods = useForm<ProjectInfoFormValues>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      title: "",
      category: [
        { category: "", subCategories: [] },
        { category: "", subCategories: [] },
        { category: "", subCategories: [] },
      ],
      industry: [],
      shortDescription: "",
      fullDescription: "",
      tags: [],
      skills: [],
      projectType: "Website",
    },
  })
  const mediaMethods = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      featuredImages: [],
      additionalImages: [],
      featuredVideo: "",
      hiddenImages: [],
    },
  })
  const projectScopeMethods = useState<Phase[]>([{}])
  const [isProjectSubmitted, setIsProjectSubmitted] = useState(false)
  const [submissionOutcome, setSubmissionOutcome] =
    useState<SubmissionOutcome | null>(null)
  const [isTaskSearchDialogOpen, setTaskSearchDialogOpen] = useState(false)
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null)
  const [isExistingPublishedListing, setIsExistingPublishedListing] =
    useState(false)
  // PMCM-403/F2: owner-or-lead signal from getProjectDraft's own
  // viewerCanPublish (listings-service), not derived client-side. Defaults
  // true — a brand-new draft just created by this caller has no
  // viewerCanPublish field yet, and its creator is trivially the owner.
  const [viewerCanPublish, setViewerCanPublish] = useState(true)
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [teamSubTab, setTeamSubTab] = useState<string>("members")
  const [pendingInviteEmails, setPendingInviteEmails] = useState<string[]>([])
  const [pricingBudgetCents, setPricingBudgetCents] = useState(0)
  // PMCM-258/AC5: the seller's saved display-period preference, hydrated
  // once from the draft below and read (not written) by ProjectScope via
  // context — same read-only-from-context shape as pricingBudgetCents.
  const [initialPricingPeriod, setInitialPricingPeriod] = useState<
    string | null
  >(null)
  const [scopeType, setScopeType] = useState<ScopeType>("project")
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishAttempted, setPublishAttempted] = useState(false)

  // PMCM-253 follow-up (product decision): Publish with an incomplete
  // section no longer toasts — it opens that section (and, for Project
  // Info/Questions, the sub-tab the first invalid field actually lives
  // on), shows every inline field error in it (RHF trigger()), and
  // scrolls/focuses the first invalid field. Runs once the target step is
  // confirmed mounted (see scheduleStepFocus above).
  const runPublishValidationJump = async (step: number) => {
    if (step === 0) {
      await projectInfoMethods.trigger()
      const firstInvalidTarget = PROJECT_INFO_VALIDATION_TARGETS.find(
        ({ name }) => projectInfoMethods.getFieldState(name).invalid
      )
      if (firstInvalidTarget) {
        focusAndScrollProjectInfoField(projectInfoMethods, firstInvalidTarget)
      }
      return
    }
    if (step === 1) {
      await mediaMethods.trigger()
      const firstInvalidTarget = MEDIA_VALIDATION_TARGETS.find(
        ({ name }) => mediaMethods.getFieldState(name).invalid
      )
      if (firstInvalidTarget) {
        focusAndScrollMediaField(mediaMethods, firstInvalidTarget)
      }
      return
    }
    if (step === 2) {
      // Project Scope isn't RHF — its own inline error (gated on
      // publishAttempted, same as every other non-RHF section here) is
      // already reactive to the live phases/tasks state; just bring it
      // into view.
      window.requestAnimationFrame(() => {
        document
          .getElementById("publish-project-scope-table-field")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return
    }
    if (step === 3) {
      // Team's validity (teamMemberIds.length > 0 || currentUser id) is
      // effectively always true once signed in — practically unreachable,
      // but handled defensively. "members" is the one sub-tab the
      // member-count error can actually render on.
      setTeamSubTab("members")
      window.requestAnimationFrame(() => {
        document
          .getElementById("publish-project-team-members-field")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return
    }
    if (step === 4) {
      // Questions' own inline error ("Please add at least 3 FAQs before
      // publishing.") is already reactive to publishAttempted — just
      // switch to the FAQ tab (scrollToWizardField clicks the trigger
      // since it's a real <button>, same as every other sidebar sub-item
      // target) and scroll to it.
      scrollToWizardField("publish-project-faqs-field")
    }
  }

  // PMCM-403: Header's Publish button calls this — PMCM-253's exact
  // behavior is unchanged (always clickable, invalid → inline jump, no
  // modal, no toast). Only once the listing is actually valid does it open
  // the new shared confirmation modal; the real publish call now happens
  // in handlePublish below, on "Yes, Publish".
  const attemptPublish = () => {
    if (!draftProjectId || isPublishing || !viewerCanPublish) return
    setPublishAttempted(true)
    setFaqModerationError(null)
    setProjectInfoModerationError(null)
    setMediaModerationError(null)
    if (firstInvalidStep !== null) {
      const invalidStep = firstInvalidStep
      setStep(invalidStep)
      scheduleStepFocus(invalidStep, () => {
        void runPublishValidationJump(invalidStep)
      })
      return
    }
    setPublishDialogOpen(true)
  }

  // PMCM-403: no validity check here — attemptPublish above already gated
  // entry (modal only opens once valid). Also the session-expiry resume
  // target (handlePublishRef, PMCM-261/AC3): on a 401 mid-publish this
  // re-runs unchanged, retrying the same API call rather than re-validating
  // or re-opening the modal.
  const handlePublish = async () => {
    if (!draftProjectId || isPublishing) return
    setIsPublishing(true)
    try {
      const publishResponse = await ProjectAPI.PublishProject(draftProjectId)
      setIsProjectSubmitted(true)
      setPublishDialogOpen(false)
      const publishedType = scopeType === "service" ? "service" : "project"
      toast(
        isPublishedResponse(publishResponse)
          ? { title: getPublishedToastTitle(publishedType), variant: "success" }
          : { title: getPendingReviewToastTitle(publishedType) }
      )
      router.push("/my-listings")
    } catch (error: any) {
      console.error("Failed to publish project", error)
      if (isUnauthorizedError(error)) {
        // PMCM-261/AC3: queue through the ref (below), not `handlePublish`
        // by name, to always resume with the freshest closure.
        setIsPublishing(false)
        promptSignInToRetry(() => handlePublishRef.current())
        return
      }
      setPublishDialogOpen(false)
      const errorMessage =
        error?.response?.data?.reason ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to publish project"
      const errorType = classifyPublishError({
        message: errorMessage,
        statusCode: error?.response?.status,
        status: error?.response?.data?.status,
      })

      const field = error?.response?.data?.field
      const projectInfoFields = [
        "title",
        "category",
        "industry",
        "shortDescription",
        "fullDescription",
        "tags",
        "skills",
      ]
      // PMCM-253 follow-up: a curated, field-tagged rejection already has
      // an inline home (the setError calls above/below) — scroll to it
      // and drop the toast instead of showing both. Only a genuinely
      // generic/infra error (no field, no moderation category) still has
      // nowhere inline to live, so it keeps the toast.
      if (field && projectInfoFields.includes(field)) {
        projectInfoMethods.setError(field as any, { message: errorMessage })
        setProjectInfoModerationError(errorMessage)
        setStep(0)
        const target = PROJECT_INFO_VALIDATION_TARGETS.find(
          (t) => t.name === field || t.name.startsWith(`${field}.`)
        )
        if (target) {
          scheduleStepFocus(0, () =>
            focusAndScrollProjectInfoField(projectInfoMethods, target)
          )
        }
      } else if (field === "faqs") {
        setFaqModerationError(errorMessage)
        setStep(4)
        scheduleStepFocus(4, () =>
          scrollToWizardField("publish-project-faqs-field")
        )
      } else if (errorType === "video_rejection") {
        mediaMethods.setError("featuredVideo", { message: errorMessage })
        setMediaModerationError(errorMessage)
        setStep(1)
        scheduleStepFocus(1, () =>
          focusAndScrollMediaField(mediaMethods, {
            name: "featuredVideo",
            targetId: "publish-project-featured-video-field",
          })
        )
      } else if (errorType === "image_rejection") {
        mediaMethods.setError("featuredImages", { message: errorMessage })
        setMediaModerationError(errorMessage)
        setStep(1)
        scheduleStepFocus(1, () =>
          focusAndScrollMediaField(mediaMethods, {
            name: "featuredImages",
            targetId: "publish-project-featured-images-field",
          })
        )
      } else if (errorType === "content_rejection") {
        projectInfoMethods.setError("fullDescription", { message: errorMessage })
        setProjectInfoModerationError(errorMessage)
        setStep(0)
        const target = PROJECT_INFO_VALIDATION_TARGETS.find(
          (t) => t.name === "fullDescription"
        )
        if (target) {
          scheduleStepFocus(0, () =>
            focusAndScrollProjectInfoField(projectInfoMethods, target)
          )
        }
      } else {
        // PMCM-261/X3: no field tag, no moderation category — a generic
        // or infra failure with no inline home. toUserMessage keeps the
        // raw backend message off the screen either way.
        toast({
          title: toUserMessage(error),
          variant: "destructive",
        })
      }
    } finally {
      setIsPublishing(false)
    }
  }
  const handlePublishRef = useRef(handlePublish)
  handlePublishRef.current = handlePublish
  const [isDraftBootstrapping, setIsDraftBootstrapping] = useState(true)
  // QA-196/PMCM-402: set when the backend 403s the draft fetch — the
  // listing exists but this account isn't its owner or a team member on it.
  const [isAccessDenied, setIsAccessDenied] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [faqs, setFaqs] = useState<WizardFaq[]>([])
  const [faqModerationError, setFaqModerationError] = useState<string | null>(
    null
  )
  const [projectInfoModerationError, setProjectInfoModerationError] = useState<
    string | null
  >(null)
  // PMCM-253/AC4: Media's moderation/validation rejections (saveMedia's and
  // handlePublish's `mediaMethods.setError(...)` calls, PMCM-261/252) had no
  // boolean flag reaching the sidebar the way Project Info's and FAQ's do —
  // the section's own circle/badge, and therefore the publish gate, never
  // actually reflected a rejected image/video. Mirrors the other two.
  const [mediaModerationError, setMediaModerationError] = useState<
    string | null
  >(null)
  const [hasRecentQuestions, setHasRecentQuestions] = useState(false)
  const persistedMediaRef = useRef<{
    featuredImage?: string
    additionalImages?: string[]
    hiddenImages?: string[]
    featuredVideo?: string
  } | null>(null)
  const lastDraftPayloadRef = useRef<string>("")
  const lastScopePayloadRef = useRef<string>("")
  const scopeSavesInFlightRef = useRef(0)
  const lastMediaPayloadRef = useRef<string>("")
  // PMCM-252/E1: consecutive-failure counts, for the backoff curve above —
  // reset to 0 on success or on a definitive 4xx (which stops retrying
  // that payload instead of backing off on it). The "rejected" refs below
  // are the definitive-4xx payload signatures themselves, so that exact
  // payload isn't retried again until the seller actually changes it.
  const draftFailureCountRef = useRef(0)
  const draftRejectedPayloadRef = useRef<string>("")
  const scopeFailureCountRef = useRef(0)
  const scopeRejectedPayloadRef = useRef<string>("")
  const mediaFailureCountRef = useRef(0)
  const faqsFailureCountRef = useRef(0)
  const faqsRejectedPayloadRef = useRef<string>("")
  const videoFailureCountRef = useRef(0)
  const videoRejectedPayloadRef = useRef<string>("")
  // PMCM-252/E1: the header already shows "Couldn't save. Retrying…" for the
  // whole duration of a failure streak, so a toast per autosave tick (or per
  // edit made while still failing) would be redundant noise on top of that.
  // One shared gate across all four generic-failure autosaves below — set on
  // the first failure of a streak, cleared only in endSaveSuccess (i.e. on
  // the NEXT successful save, by any autosave), so at most one toast fires
  // per streak regardless of how many payload changes happen during it.
  // (Supersedes the former per-save, per-payload-signature dedup refs, which
  // would otherwise re-toast on every new edit made while still failing.)
  const hasToastedForFailureRef = useRef(false)
  // QA-205/PMCM-403: unlike saveDraft/saveScope/saveFaqs/saveVideo below,
  // saveMedia had no ref here and its effect's cleanup only cleared the
  // interval — a media change made within the ~2s polling window, followed
  // by navigating to the other editor (or a hard reload before the next
  // tick), was silently dropped: never reaches the backend, so whichever
  // editor loads next hydrates the pre-change media. Reusing the same
  // flush-on-unmount/flush-on-unload pattern every sibling autosave here
  // already has.
  const saveMediaRef = useRef<() => Promise<void>>(async () => {})
  const lastFaqsPayloadRef = useRef<string>("")
  const faqsRef = useRef<WizardFaq[]>([])
  const saveFaqsRef = useRef<() => Promise<void>>(async () => {})
  const lastVideoUrlRef = useRef<string>("")
  const saveVideoRef = useRef<() => Promise<void>>(async () => {})
  const hasHydratedRef = useRef(false)

  // PMCM-252/AC2/E1/E3: one shared save-status machine derived from every
  // autosave below, so the header can show more than just "Saved at h:mm".
  // "saving" wins while anything is in flight; "error" is sticky until the
  // NEXT save (any of them) succeeds, since a silent "saved" while a
  // different field is still failing to persist would be misleading.
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const saveInFlightCountRef = useRef(0)
  // Set true the moment any autosave starts, cleared only once EVERY
  // in-flight save has resolved successfully — covers X1/beforeunload
  // ("are there unsynced changes right now").
  const hasUnsyncedChangesRef = useRef(false)
  const beginSave = () => {
    saveInFlightCountRef.current += 1
    hasUnsyncedChangesRef.current = true
    setSaveStatus("saving")
  }
  const endSaveSuccess = () => {
    saveInFlightCountRef.current = Math.max(0, saveInFlightCountRef.current - 1)
    setLastSavedAt(new Date())
    if (saveInFlightCountRef.current === 0) {
      hasUnsyncedChangesRef.current = false
      setSaveStatus("saved")
    }
    hasToastedForFailureRef.current = false
  }
  const endSaveError = () => {
    saveInFlightCountRef.current = Math.max(0, saveInFlightCountRef.current - 1)
    setSaveStatus("error")
  }
  // A 401 isn't a save failure in the "couldn't save, retrying" sense —
  // it's paused on login, with its own modal as the indicator — so it
  // intentionally does NOT flip saveStatus to "error".
  const endSavePaused = () => {
    saveInFlightCountRef.current = Math.max(0, saveInFlightCountRef.current - 1)
  }

  // PMCM-252/E1: shared backoff curve for every autosave's retry loop —
  // 2s baseline, doubling per consecutive non-definitive failure, capped
  // at 30s; back to 2s the moment that autosave's failure count resets
  // (on success, or on a definitive 4xx that stops retrying until the
  // payload changes).
  const nextAutosaveDelayMs = (consecutiveFailures: number): number =>
    consecutiveFailures <= 0
      ? 2000
      : Math.min(2000 * 2 ** consecutiveFailures, 30000)

  // PMCM-252/E3: offline detection. A ref (not just the state) so the
  // long-lived recursive autosave timeouts below always read the CURRENT
  // connectivity without needing to be recreated on every flip.
  const [isOffline, setIsOffline] = useState(false)
  const isOfflineRef = useRef(false)

  useEffect(() => {
    faqsRef.current = faqs
    setFaqModerationError(null)
  }, [faqs])

  const projectInfoModerationWatch = useWatch({
    control: projectInfoMethods.control,
  })
  useEffect(() => {
    setProjectInfoModerationError(null)
  }, [projectInfoModerationWatch])

  // PMCM-253: same clear-on-edit convention as the two watches above —
  // the instant the seller touches Media again, drop the stale rejection
  // so E3's "fixing it updates the status automatically" actually applies.
  const mediaModerationWatch = useWatch({ control: mediaMethods.control })
  useEffect(() => {
    setMediaModerationError(null)
  }, [mediaModerationWatch])

  // Sidebar step ticks: each step's form only mounts when it's the active step,
  // so validate every step here (always mounted) — an existing/edited project
  // shows completed steps immediately, and Team/Questions can tick too.
  // Criteria: Project Info / Media / Project Scope pass their schema; Team has
  // at least one member; Questions has at least one FAQ.
  const [scopePhases] = projectScopeMethods
  const lastStepValidRef = useRef<Record<number, boolean>>({})
  const setStepValid = useCallback(
    (index: number, valid: boolean) => {
      if (lastStepValidRef.current[index] === valid) return
      lastStepValidRef.current[index] = valid
      toggleStepValidation(index)(valid)
    },
    [toggleStepValidation]
  )
  // useWatch re-computes on every value change — including the async reset() on
  // load — so ticks reflect the loaded project immediately (no user edit needed).
  const projectInfoWatch = useWatch({ control: projectInfoMethods.control })
  const mediaWatch = useWatch({ control: mediaMethods.control })
  const completedFaqCount = faqs.filter(
    (faq) => faq.q.trim() && faq.a.trim()
  ).length
  useEffect(() => {
    setStepValid(
      0,
      projectInfoSchema.safeParse(projectInfoMethods.getValues()).success
    )
  }, [projectInfoWatch, projectInfoMethods, setStepValid])
  useEffect(() => {
    setStepValid(
      1,
      mediaFormSchema.safeParse(mediaMethods.getValues()).success
    )
  }, [mediaWatch, mediaMethods, setStepValid])
  useEffect(() => {
    setStepValid(2, projectScopeSchema.safeParse(scopePhases))
  }, [scopePhases, setStepValid])
  useEffect(() => {
    // QA-198/PMCM-395: teamMemberIds never contains the project owner's own
    // id — inProject() (in the Team step) treats role "owner" as always
    // in-project without ever writing to teamMemberIds, and addable()
    // excludes anyone already inProject, so the owner can never be
    // programmatically added to this array. A solo owner is therefore
    // permanently "0 members" by this check alone, even though the Team
    // table already shows them (You / Owner) with nothing left to fill
    // in. The account owner always counts as the team's one required
    // member, matching what the UI already displays.
    setStepValid(
      3,
      teamMemberIds.length > 0 || Boolean(getCurrentUser()?.id)
    )
  }, [teamMemberIds, setStepValid])
  useEffect(() => {
    setStepValid(4, completedFaqCount >= 3)
  }, [completedFaqCount, setStepValid])

  // PMCM-253: the one canonical per-section validity record — PMCM-261
  // flagged `firstInvalidStep` as a second, independently-reimplemented copy
  // of the exact same five checks `setStepValid` above already runs; this
  // extracts it once so firstInvalidStep, the "ever completed" tracking,
  // and the publish-gate state machine below all read the SAME values
  // instead of separately-maintained copies that could drift apart.
  const sectionValidity = useMemo<Record<number, boolean>>(
    () => ({
      0: projectInfoSchema.safeParse(projectInfoMethods.getValues()).success,
      1: mediaFormSchema.safeParse(mediaMethods.getValues()).success,
      2: projectScopeSchema.safeParse(scopePhases),
      // QA-198/PMCM-395: same owner-always-counts fix as setStepValid(3, ...)
      // above — this is the Publish button's own separate validity check
      // (PMCM-401), and it was blocked by the identical stale condition.
      3: teamMemberIds.length > 0 || Boolean(getCurrentUser()?.id),
      4: completedFaqCount >= 3,
    }),
    [
      projectInfoWatch,
      mediaWatch,
      scopePhases,
      teamMemberIds,
      completedFaqCount,
      projectInfoMethods,
      mediaMethods,
    ]
  )

  const firstInvalidStep = useMemo(
    () => [0, 1, 2, 3, 4].find((index) => !sectionValidity[index]) ?? null,
    [sectionValidity]
  )

  // PMCM-253/E1: mark a section "ever completed" the first time it's valid
  // — stays true even if a required field is cleared afterward, which is
  // exactly the signal deriveSectionState uses to drop that section to
  // "error" instead of back to "incomplete".
  useEffect(() => {
    setEverCompletedSteps((prev) => {
      let changed = false
      const next = prev.map((wasCompleted, index) => {
        if (wasCompleted) return true
        if (sectionValidity[index]) {
          changed = true
          return true
        }
        return false
      })
      return changed ? next : prev
    })
  }, [sectionValidity])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasHydratedRef.current) return

    let cancelled = false

    const hydrateDraft = async () => {
      try {
        // Edit mode: fetch existing project by slug
        let response: any = null
        if (slug) {
          try {
            response = await ProjectAPI.GetProjectBySlug(slug)
          } catch (err: any) {
            // QA-196/PMCM-402: a 403 means this listing exists but the
            // signed-in account isn't its owner or a team member on it —
            // that must stop here, not fall through to auto-creating an
            // unrelated blank draft under this URL.
            if (err?.response?.status === 403) {
              setIsAccessDenied(true)
              return
            }
            response = null
          }
        }

        // If no project found by slug, try draftId from query params as fallback
        if (!response?.data) {
          const urlParams = new URLSearchParams(window.location.search)
          const existingDraftId = urlParams.get("draftId")
          if (existingDraftId && UUID_PATTERN.test(existingDraftId)) {
            try {
              response = await ProjectAPI.GetProjectDraft(existingDraftId)
            } catch (err: any) {
              if (err?.response?.status === 403) {
                setIsAccessDenied(true)
                return
              }
              throw err
            }
          }
        }

        // Path param is itself a draft id (editor reached as /edit-listing/{draftId})
        if (!response?.data && slug && UUID_PATTERN.test(slug)) {
          try {
            response = await ProjectAPI.GetProjectDraft(slug)
          } catch (err: any) {
            if (err?.response?.status === 403) {
              setIsAccessDenied(true)
              return
            }
            // fall through to create a fresh draft below
          }
        }

        if (cancelled) return

        // If no project found by slug, create a new draft so edits still save
        //    If the slug matches a seed listing, use its title/description
        if (!response?.data) {
          const seedListing = TEAM_SEED_LISTINGS.find((s) => s.id === slug)
          response = await ProjectAPI.CreateProjectDraft({
            title: seedListing?.title || "",
            shortDescription: seedListing?.description || "",
            fullDescription: seedListing?.description || "",
            listingType: "project",
            projectType: seedListing?.projectType || "Website",
          })
        }

        if (cancelled) return

        const draft = response?.data ?? {}
        const nextDraftId = String(draft?.id ?? "")
        setDraftProjectId(nextDraftId || null)
        setIsExistingPublishedListing(draft?.status === "published")
        setViewerCanPublish(draft?.viewerCanPublish !== false)
        setTeamMemberIds(
          Array.isArray(draft?.teamMemberIds)
            ? draft.teamMemberIds.map(String)
            : []
        )
        setPendingInviteEmails(
          Array.isArray(draft?.pendingInviteEmails)
            ? draft.pendingInviteEmails.map(String)
            : []
        )
        setPricingBudgetCents(Number(draft?.budgetUsdCents) || 0)
        setInitialPricingPeriod(draft?.pricingPeriod ?? null)
        const draftIsService =
          draft?.listingType === "service" ||
          (Array.isArray(draft?.scope) &&
            draft.scope.some(
              (p: any) =>
                p?.phaseType === "setup" ||
                p?.phaseType === "recurring" ||
                p?.phaseType === "ongoing"
            ))
        setScopeType(draftIsService ? "service" : "project")

        const rawCategorySelections = Array.isArray(draft?.categorySelections)
          ? draft.categorySelections
          : []
        const fallbackSubcategories = Array.isArray(draft?.subcategories)
          ? draft.subcategories
          : Array.isArray(draft?.subCategories)
            ? draft.subCategories
            : []
        const categoryRows =
          rawCategorySelections.length > 0
            ? rawCategorySelections.map((cs: any) => ({
                category: cs?.category || "",
                subCategories: Array.isArray(cs?.subCategories)
                  ? cs.subCategories
                  : [],
              }))
            : Array.isArray(draft?.categories) && draft.categories.length > 0
              ? draft.categories.map((cat: string, i: number) => ({
                  category: cat,
                  subCategories: i === 0 ? fallbackSubcategories : [],
                }))
              : []
        while (categoryRows.length < 3)
          categoryRows.push({ category: "", subCategories: [] })

        projectInfoMethods.reset({
          title: draft?.title ?? "",
          category: categoryRows.slice(0, 3),
          industry: Array.isArray(draft?.industries) ? draft.industries : [],
          shortDescription: draft?.shortDescription ?? "",
          fullDescription: draft?.fullDescription ?? "",
          tags: Array.isArray(draft?.tags) ? draft.tags : [],
          skills: Array.isArray(draft?.skills) ? draft.skills : [],
          projectType: draft?.projectType ?? draft?.listingType ?? "Website",
        })
        if (draft?.title) void projectInfoMethods.trigger()
        lastDraftPayloadRef.current = JSON.stringify(
          buildProjectDraftPayload({
            title: draft?.title ?? "",
            category: categoryRows.slice(0, 3),
            industry: Array.isArray(draft?.industries) ? draft.industries : [],
            shortDescription: draft?.shortDescription ?? "",
            fullDescription: draft?.fullDescription ?? "",
            tags: Array.isArray(draft?.tags) ? draft.tags : [],
            skills: Array.isArray(draft?.skills) ? draft.skills : [],
            projectType: draft?.projectType ?? draft?.listingType ?? "Website",
          })
        )

        const loadedFaqs: WizardFaq[] = Array.isArray(draft?.faqs)
          ? draft.faqs.map(
              (f: { question?: string; answer?: string }, i: number) => ({
                id: `faq-${i}`,
                q: f?.question ?? "",
                a: f?.answer ?? "",
              })
            )
          : []
        setFaqs(loadedFaqs)
        lastFaqsPayloadRef.current = JSON.stringify(
          loadedFaqs
            .filter((f) => f.q.trim() || f.a.trim())
            .map((f) => ({ question: f.q.trim(), answer: f.a.trim() }))
        )

        const persistedMedia = draft?.media
          ? {
              featuredImage: draft.media.featuredImage,
              additionalImages: Array.isArray(draft.media.additionalImages)
                ? draft.media.additionalImages
                : [],
              hiddenImages: Array.isArray(draft.media.hiddenImages)
                ? draft.media.hiddenImages
                : [],
              featuredVideo: draft.media.featuredVideo ?? "",
            }
          : null
        persistedMediaRef.current = persistedMedia

        const hydratedFeaturedImage = persistedMedia?.featuredImage
          ? await hydrateRemoteMediaFile(
              persistedMedia.featuredImage,
              "featured-image.jpg"
            )
          : null
        // PMCM-256 follow-up: additionalImages can now contain "" placeholders
        // for a cleared slot (gallery slots persist in place, see
        // handleGalleryDelete-equivalent fixes). hydrateRemoteMediaFile("")
        // would fetch("") — resolves against the current page in a browser,
        // producing a bogus "file" rather than an empty slot. Map position
        // to null instead of calling it, so index alignment with the
        // per-slot additionalImages.${index} fields below is preserved.
        const hydratedAdditionalImages = await Promise.all(
          (persistedMedia?.additionalImages ?? []).map((url: string) =>
            url ? hydrateRemoteMediaFile(url, "additional-image.jpg") : null
          )
        )

        mediaMethods.reset({
          featuredImages: hydratedFeaturedImage
            ? [
                {
                  meta: hydratedFeaturedImage,
                  progress: 100,
                  hasError: false,
                },
              ]
            : [],
          additionalImages: hydratedAdditionalImages.map((file) =>
            file ? [{ meta: file, progress: 100, hasError: false }] : []
          ),
          featuredVideo: draft?.videoUrl ?? persistedMedia?.featuredVideo ?? "",
          hiddenImages: persistedMedia?.hiddenImages ?? [],
        })
        lastMediaPayloadRef.current = JSON.stringify({
          featuredImage: persistedMedia?.featuredImage ?? "",
          additionalImages: persistedMedia?.additionalImages ?? [],
          featuredVideo: persistedMedia?.featuredVideo ?? "",
        })
        lastVideoUrlRef.current = (
          draft?.videoUrl ??
          persistedMedia?.featuredVideo ??
          ""
        ).trim()

        const scope = Array.isArray(draft?.scope)
          ? draft.scope.map((phase: any) => ({
              phaseName: phase?.name ?? "",
              phaseType: phase?.phaseType ?? undefined,
              recurrenceSchedule: phase?.recurrenceSchedule ?? undefined,
              recurrenceCount: phase?.recurrenceCount ?? undefined,
              rows: Array.isArray(phase?.task)
                ? phase.task.map((task: any) => {
                    const durationRaw = String(task?.duration ?? "").trim()
                    const [durationValue, ...durationTypeParts] =
                      durationRaw.split(/\s+/)
                    return {
                      id: String(task?.id ?? getId()),
                      task: task?.taskName ?? "",
                      role: task?.role ?? "",
                      assigneeUserId: task?.assigneeUserId ?? null,
                      location: Array.isArray(task?.location)
                        ? (task.location[0] ?? "")
                        : "",
                      experience: Array.isArray(task?.experience)
                        ? (task.experience[0] ?? task?.experienceLevel ?? "")
                        : (task?.experienceLevel ?? ""),
                      duration: {
                        value: Number(durationValue) || 0,
                        type:
                          (durationTypeParts.join(" ") as
                            | "days"
                            | "weeks"
                            | "hours") || "weeks",
                      },
                    }
                  })
                : [],
            }))
          : []

        // PMCM-257 follow-up 2: an older service draft saved before
        // phaseType was required stays untyped on disk — normalize once
        // on hydration so the header never falls back to "Phase One"
        // (project scopes are passed through as-is). The empty-scope
        // fallback also needs to start typed for a fresh service draft.
        projectScopeMethods[1](
          draftIsService
            ? ensureServicePhaseTypes(
                scope.length > 0 ? scope : [{ phaseName: "" }]
              )
            : scope.length > 0
              ? scope
              : [{}]
        )
        lastScopePayloadRef.current = JSON.stringify(
          buildScopeDraftPayload(nextDraftId, scope.length > 0 ? scope : [])
        )
      } catch (error) {
        console.error("Failed to hydrate project draft", error)
        // G2: the creation gate refused (the modal is already showing): leave the empty form.
        if (isCreateListingBlocked(error)) router.replace("/my-listings")
      } finally {
        if (!cancelled) {
          hasHydratedRef.current = true
          setIsDraftBootstrapping(false)
        }
      }
    }

    void hydrateDraft()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Ref-stable save functions so cleanup/beforeunload can call them
  const saveDraftRef = useRef<() => Promise<void>>(async () => {})
  const saveScopeRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return

    // Returns true when this attempt was skipped/paused (offline, or a
    // 401 handed off to promptSignInToRetry) — the scheduler below uses
    // that to decide whether to keep the normal retry loop running.
    const saveDraft = async (): Promise<boolean> => {
      if (isOfflineRef.current) return true

      const info = projectInfoMethods.getValues()
      const payload = buildProjectDraftPayload({
        title: info.title ?? "",
        category: info.category ?? [],
        industry: info.industry ?? [],
        tags: info.tags ?? [],
        skills: info.skills ?? [],
        projectType: info.projectType ?? "Website",
        shortDescription: info.shortDescription ?? "",
        fullDescription: info.fullDescription ?? "",
      })

      const serializedPayload = JSON.stringify(payload)
      if (
        serializedPayload === lastDraftPayloadRef.current ||
        serializedPayload === draftRejectedPayloadRef.current
      ) {
        return false
      }

      beginSave()
      try {
        await ProjectAPI.UpdateProjectDraft(draftProjectId, payload)
        lastDraftPayloadRef.current = serializedPayload
        draftRejectedPayloadRef.current = ""
        draftFailureCountRef.current = 0
        endSaveSuccess()
        return false
      } catch (error) {
        console.error("Failed to save project draft", error)
        if (isUnauthorizedError(error)) {
          endSavePaused()
          // PMCM-261: the queued retry calls saveDraftRef.current(), which
          // (below) is this same recursive cycle — resuming it also
          // re-arms the backoff loop, not just one bare retry.
          promptSignInToRetry(() => void saveDraftRef.current())
          return true
        }
        const status = (error as any)?.response?.status
        const isDefiniteRejection =
          typeof status === "number" && status >= 400 && status < 500
        if (isDefiniteRejection) {
          // PMCM-252/E1: a real validation/moderation rejection — stop
          // retrying THIS payload (it will never succeed unchanged), but
          // don't back off on it; the next genuinely new edit tries fresh.
          draftRejectedPayloadRef.current = serializedPayload
        } else {
          draftFailureCountRef.current += 1
        }
        endSaveError()
        if (!hasToastedForFailureRef.current) {
          hasToastedForFailureRef.current = true
          toast({ title: toUserMessage(error), variant: "destructive" })
        }
        return false
      }
    }

    const loop = createAutosaveLoop(saveDraft, () =>
      nextAutosaveDelayMs(draftFailureCountRef.current)
    )

    saveDraftRef.current = loop.run

    void loop.run()
    return () => {
      loop.dispose()
      void saveDraft()
    }
  }, [
    draftProjectId,
    isDraftBootstrapping,
    projectInfoMethods,
    isProjectSubmitted,
  ])

  useEffect(() => {
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return

    const saveScope = async (): Promise<boolean> => {
      if (isOfflineRef.current) return true

      const payload = buildScopeDraftPayload(
        draftProjectId,
        projectScopeMethods[0]
      )
      const serializedPayload = JSON.stringify(payload)

      if (
        serializedPayload === lastScopePayloadRef.current ||
        serializedPayload === scopeRejectedPayloadRef.current
      ) {
        return false
      }

      // Never stack ticks: the recursive scheduler below only ever starts
      // the next cycle once this one resolves, which is what actually
      // prevents the overlapping-saves pile-up that took listings-service
      // down on 2026-10-03 — this counter is now just an in-flight marker,
      // kept for that same defensive intent.
      scopeSavesInFlightRef.current += 1
      beginSave()
      try {
        const scopeRes = await ProjectAPI.ReplaceProjectScope(
          draftProjectId,
          payload
        )
        const nextBudget = Number((scopeRes as any)?.data?.budgetUsdCents)
        if (Number.isFinite(nextBudget) && nextBudget > 0) {
          setPricingBudgetCents(nextBudget)
        }
        lastScopePayloadRef.current = serializedPayload
        scopeRejectedPayloadRef.current = ""
        scopeFailureCountRef.current = 0
        endSaveSuccess()
        return false
      } catch (error) {
        console.error("Failed to save project scope draft", error)
        if (isUnauthorizedError(error)) {
          endSavePaused()
          promptSignInToRetry(() => void saveScopeRef.current())
          return true
        }
        const status = (error as any)?.response?.status
        const isDefiniteRejection =
          typeof status === "number" && status >= 400 && status < 500
        if (isDefiniteRejection) {
          scopeRejectedPayloadRef.current = serializedPayload
        } else {
          scopeFailureCountRef.current += 1
        }
        endSaveError()
        if (!hasToastedForFailureRef.current) {
          hasToastedForFailureRef.current = true
          toast({ title: toUserMessage(error), variant: "destructive" })
        }
        return false
      } finally {
        scopeSavesInFlightRef.current -= 1
      }
    }

    const loop = createAutosaveLoop(saveScope, () =>
      nextAutosaveDelayMs(scopeFailureCountRef.current)
    )

    saveScopeRef.current = loop.run

    void loop.run()
    return () => {
      loop.dispose()
      void saveScope()
    }
  }, [
    draftProjectId,
    isDraftBootstrapping,
    isProjectSubmitted,
    projectScopeMethods,
  ])

  useEffect(() => {
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return

    const saveFaqs = async (): Promise<boolean> => {
      if (isOfflineRef.current) return true

      const payload = faqsRef.current
        .filter((f) => f.q.trim() || f.a.trim())
        .map((f) => ({ question: f.q.trim(), answer: f.a.trim() }))
      const serializedPayload = JSON.stringify(payload)

      if (
        serializedPayload === lastFaqsPayloadRef.current ||
        serializedPayload === faqsRejectedPayloadRef.current
      ) {
        return false
      }

      beginSave()
      try {
        await ProjectAPI.UpdateProjectDraft(draftProjectId, { faqs: payload })
        lastFaqsPayloadRef.current = serializedPayload
        faqsRejectedPayloadRef.current = ""
        faqsFailureCountRef.current = 0
        endSaveSuccess()
        return false
      } catch (error) {
        console.error("Failed to save project FAQs draft", error)
        if (isUnauthorizedError(error)) {
          endSavePaused()
          promptSignInToRetry(() => void saveFaqsRef.current())
          return true
        }
        const status = (error as any)?.response?.status
        const isDefiniteRejection =
          typeof status === "number" && status >= 400 && status < 500
        if (isDefiniteRejection) {
          faqsRejectedPayloadRef.current = serializedPayload
        } else {
          faqsFailureCountRef.current += 1
        }
        endSaveError()
        if (!hasToastedForFailureRef.current) {
          hasToastedForFailureRef.current = true
          toast({ title: toUserMessage(error), variant: "destructive" })
        }
        return false
      }
    }

    const loop = createAutosaveLoop(saveFaqs, () =>
      nextAutosaveDelayMs(faqsFailureCountRef.current)
    )

    saveFaqsRef.current = loop.run

    void loop.run()
    return () => {
      loop.dispose()
      void saveFaqs()
    }
  }, [draftProjectId, isDraftBootstrapping, isProjectSubmitted])

  useEffect(() => {
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return

    const saveVideo = async (): Promise<boolean> => {
      if (isOfflineRef.current) return true

      const videoUrl = mediaMethods.getValues().featuredVideo?.trim() ?? ""

      if (videoUrl === lastVideoUrlRef.current) return false
      // PMCM-256: invalid URL gets an inline error (mediaFormSchema's
      // featuredVideo .refine()) and nothing saved — without this gate,
      // this 2s-interval autosave persisted whatever was typed regardless
      // of validity, since it reads form state directly rather than
      // going through form validation.
      if (!isValidFeaturedVideoUrl(videoUrl)) return false
      if (videoUrl === videoRejectedPayloadRef.current) return false

      beginSave()
      try {
        await ProjectAPI.UpdateProjectDraft(draftProjectId, { videoUrl })
        lastVideoUrlRef.current = videoUrl
        videoRejectedPayloadRef.current = ""
        videoFailureCountRef.current = 0
        endSaveSuccess()
        return false
      } catch (error) {
        console.error("Failed to save project video draft", error)
        if (isUnauthorizedError(error)) {
          endSavePaused()
          promptSignInToRetry(() => void saveVideoRef.current())
          return true
        }
        const status = (error as any)?.response?.status
        const isDefiniteRejection =
          typeof status === "number" && status >= 400 && status < 500
        if (isDefiniteRejection) {
          videoRejectedPayloadRef.current = videoUrl
        } else {
          videoFailureCountRef.current += 1
        }
        endSaveError()
        if (!hasToastedForFailureRef.current) {
          hasToastedForFailureRef.current = true
          toast({ title: toUserMessage(error), variant: "destructive" })
        }
        return false
      }
    }

    const loop = createAutosaveLoop(saveVideo, () =>
      nextAutosaveDelayMs(videoFailureCountRef.current)
    )

    saveVideoRef.current = loop.run

    void loop.run()
    return () => {
      loop.dispose()
      void saveVideo()
    }
  }, [draftProjectId, isDraftBootstrapping, isProjectSubmitted, mediaMethods])

  // Flush pending saves when the user navigates away or closes the tab.
  // PMCM-252/E3/X1: also warns the user first (native "leave site?"
  // dialog) when there's a save still in flight or unsynced from an
  // offline edit — reusing this same handler rather than adding a second
  // one, since firing the saves fire-and-forget here was already the
  // existing behavior and the browser may kill the page before any of
  // them complete.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      void saveDraftRef.current()
      void saveScopeRef.current()
      void saveMediaRef.current()
      void saveVideoRef.current()
      void saveFaqsRef.current()
      if (hasUnsyncedChangesRef.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // PMCM-252/E3: offline/online. While offline, every autosave below
  // pauses (no API calls, no error spam) instead of treating a network
  // failure as a save error. The moment the browser reports "online"
  // again, flush every pending save once, in a safe order — draft (the
  // project's own fields) before scope (which can reference team members
  // the draft save doesn't touch), then media, then video, then FAQs —
  // reusing the exact same save functions autosave/beforeunload already
  // use, not a new sync path.
  useEffect(() => {
    const syncOnline = () => {
      isOfflineRef.current = false
      setIsOffline(false)
      void (async () => {
        await saveDraftRef.current()
        await saveScopeRef.current()
        await saveMediaRef.current()
        await saveVideoRef.current()
        await saveFaqsRef.current()
      })()
    }
    const syncOffline = () => {
      isOfflineRef.current = true
      setIsOffline(true)
    }
    isOfflineRef.current = !navigator.onLine
    setIsOffline(!navigator.onLine)
    window.addEventListener("online", syncOnline)
    window.addEventListener("offline", syncOffline)
    return () => {
      window.removeEventListener("online", syncOnline)
      window.removeEventListener("offline", syncOffline)
    }
  }, [])

  useEffect(() => {
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return

    const saveMedia = async (): Promise<boolean> => {
      if (isOfflineRef.current) return true

      const mediaValues = mediaMethods.getValues()
      const featuredMeta = mediaValues.featuredImages?.[0]?.meta
      const additionalMeta =
        mediaValues.additionalImages
          ?.flat()
          .map((item) => item?.meta)
          .filter(Boolean) ?? []
      const videoUrl = mediaValues.featuredVideo?.trim() ?? ""
      const hiddenImages = mediaValues.hiddenImages ?? []

      const signature = JSON.stringify({
        featuredImage: isPersistedMediaFile(featuredMeta)
          ? featuredMeta.__persistedUrl
          : (featuredMeta?.name ?? ""),
        additionalImages: additionalMeta.map((item: any) =>
          isPersistedMediaFile(item) ? item.__persistedUrl : (item?.name ?? "")
        ),
        hiddenImages,
      })

      if (signature === lastMediaPayloadRef.current) return false

      const isClearingFeatured =
        !featuredMeta && !!persistedMediaRef.current?.featuredImage
      if (!featuredMeta && !isClearingFeatured) return false

      const prevMediaSignature = lastMediaPayloadRef.current
      lastMediaPayloadRef.current = signature

      const formData = new FormData()
      formData.append("projectId", draftProjectId)

      if (isClearingFeatured) {
        formData.append("clearFeatured", "true")
      } else {
        const hasFeatured = await appendFeaturedImageField(
          formData,
          featuredMeta
        )
        if (!hasFeatured) {
          lastMediaPayloadRef.current = prevMediaSignature
          return false
        }
      }

      await appendAdditionalImageFields(formData, additionalMeta)
      formData.append("replaceAdditional", "true")

      for (const url of hiddenImages) {
        formData.append("hiddenImages", url)
      }
      formData.append("replaceHidden", "true")

      beginSave()
      try {
        const response = await ProjectAPI.UploadMedia(formData)
        const nextMedia = {
          featuredImage:
            response?.data?.featuredImage ??
            persistedMediaRef.current?.featuredImage ??
            "",
          additionalImages:
            response?.data?.additionalImages ??
            persistedMediaRef.current?.additionalImages ??
            [],
          hiddenImages: response?.data?.hiddenImages ?? hiddenImages,
          featuredVideo: videoUrl,
        }

        persistedMediaRef.current = nextMedia

        mediaMethods.reset({
          featuredImages: nextMedia.featuredImage
            ? [
                {
                  meta: buildPersistedMediaFile(
                    nextMedia.featuredImage,
                    "featured-image.jpg"
                  ),
                  progress: 100,
                  hasError: false,
                },
              ]
            : [],
          // PMCM-256 follow-up: a blank slot must reset to an empty
          // array (SquareShapeDropzone's own "empty" shape), not a
          // PersistedMediaFile wrapping an empty URL — the latter reads
          // as "has a file" with nothing to actually preview.
          additionalImages: (nextMedia.additionalImages ?? []).map(
            (url: string) =>
              url
                ? [
                    {
                      meta: buildPersistedMediaFile(
                        url,
                        "additional-image.jpg"
                      ),
                      progress: 100,
                      hasError: false,
                    },
                  ]
                : []
          ),
          featuredVideo: nextMedia.featuredVideo ?? "",
          hiddenImages: nextMedia.hiddenImages ?? [],
        })

        const resetValues = mediaMethods.getValues()
        const resetFeatured = resetValues.featuredImages?.[0]?.meta
        const resetAdditional =
          resetValues.additionalImages
            ?.flat()
            .map((item) => item?.meta)
            .filter(Boolean) ?? []
        lastMediaPayloadRef.current = JSON.stringify({
          featuredImage: isPersistedMediaFile(resetFeatured)
            ? resetFeatured.__persistedUrl
            : (resetFeatured?.name ?? ""),
          additionalImages: resetAdditional.map((item: any) =>
            isPersistedMediaFile(item) ? item.__persistedUrl : (item?.name ?? "")
          ),
          hiddenImages: resetValues.hiddenImages ?? [],
        })
        mediaFailureCountRef.current = 0
        endSaveSuccess()
        return false
      } catch (error: any) {
        console.error("Failed to save project media draft", error)
        if (isUnauthorizedError(error)) {
          // PMCM-261/AC3: this autosave has no `fields`-style argument to
          // thread through — reverting the signature ref (like the 5xx
          // branch below) makes the *next* poll see the payload as
          // changed again and resend it once logged back in, which is
          // exactly the retry this needs.
          lastMediaPayloadRef.current = prevMediaSignature
          endSavePaused()
          promptSignInToRetry(() => void saveMediaRef.current())
          return true
        }
        const status = error?.response?.status
        if (!status || status >= 500) {
          lastMediaPayloadRef.current = prevMediaSignature
          mediaFailureCountRef.current += 1
          endSaveError()
        } else {
          // PMCM-252/E1: a real validation/moderation rejection — never
          // retried (lastMediaPayloadRef is already at this signature, so
          // the next tick's unchanged-check skips it), so the backoff
          // resets rather than growing.
          mediaFailureCountRef.current = 0
          endSaveError()
          const errorMessage =
            error?.response?.data?.reason ||
            error?.response?.data?.message ||
            error?.message ||
            "Failed to save media. Please try again."
          const errorType = classifyPublishError({
            message: errorMessage,
            statusCode: status,
            status: error?.response?.data?.status,
          })
          // PMCM-261/X3: only the moderation-rejection categories keep
          // their curated, backend-sourced detail (the exception this
          // ticket carves out) — anything else uses the shared generic
          // copy instead of the raw backend message.
          const isCuratedMessage =
            errorType === "video_rejection" ||
            errorType === "image_rejection" ||
            errorType === "content_rejection"
          const safeMessage = isCuratedMessage
            ? errorMessage
            : toUserMessage(error)
          // PMCM-261/AC2/E1: this autosave previously left the Dropzone
          // showing the picked file at its (cosmetic, upload-unrelated)
          // 100% progress even though the backend rejected it — only a
          // toast said anything was wrong. Surface it inline on the Media
          // step too, via the same RHF setError path handlePublish's own
          // moderation-rejection branch already uses.
          if (errorType === "video_rejection") {
            mediaMethods.setError("featuredVideo", { message: safeMessage })
          } else {
            mediaMethods.setError("featuredImages", { message: safeMessage })
          }
          setMediaModerationError(safeMessage)
          toast({
            title:
              errorType === "video_rejection"
                ? `Media rejected: video violated moderation policy. ${safeMessage}`
                : errorType === "image_rejection"
                  ? `Media rejected: image violated moderation policy. ${safeMessage}`
                  : errorType === "content_rejection"
                    ? `Media rejected: content did not meet community guidelines. ${safeMessage}`
                    : safeMessage,
            variant: "destructive",
          })
        }
        return false
      }
    }

    const loop = createAutosaveLoop(saveMedia, () =>
      nextAutosaveDelayMs(mediaFailureCountRef.current)
    )

    saveMediaRef.current = loop.run

    void loop.run()
    return () => {
      loop.dispose()
      void saveMedia()
    }
  }, [draftProjectId, isDraftBootstrapping, isProjectSubmitted, mediaMethods])

  const projectScopeValue = useMemo(
    () => ({
      projectScopeMethods,
      isProjectSubmitted,
      setIsProjectSubmitted,
      submissionOutcome,
      setSubmissionOutcome,
      isTaskSearchDialogOpen,
      setTaskSearchDialogOpen,
      teamMemberIds,
      setTeamMemberIds,
      pendingInviteEmails,
      setPendingInviteEmails,
      draftProjectId,
      isExistingPublishedListing,
      pricingBudgetCents,
      initialPricingPeriod,
      scopeType,
      setScopeType,
      teamSubTab,
      setTeamSubTab,
      publishAttempted,
    }),
    [
      projectScopeMethods,
      isProjectSubmitted,
      setIsProjectSubmitted,
      submissionOutcome,
      setSubmissionOutcome,
      isTaskSearchDialogOpen,
      setTaskSearchDialogOpen,
      teamMemberIds,
      setTeamMemberIds,
      pendingInviteEmails,
      setPendingInviteEmails,
      draftProjectId,
      isExistingPublishedListing,
      pricingBudgetCents,
      initialPricingPeriod,
      scopeType,
      setScopeType,
      publishAttempted,
      teamSubTab,
      setTeamSubTab,
    ]
  )
  //  Validate the current step when Next is clicked
  const validateCurrentStep = React.useCallback(async () => {
    if (currentStep === 0) {
      const isStepValid = await projectInfoMethods.trigger(undefined, {
        shouldFocus: true,
      })

      if (!isStepValid) {
        const firstInvalidTarget = PROJECT_INFO_VALIDATION_TARGETS.find(
          ({ name }) => projectInfoMethods.getFieldState(name).invalid
        )
        if (firstInvalidTarget) {
          scrollToPublishField(firstInvalidTarget.targetId)
        }
      }

      return isStepValid
    }
    if (currentStep === 1) {
      const isStepValid = await mediaMethods.trigger(undefined, {
        shouldFocus: true,
      })

      if (!isStepValid) {
        const firstInvalidTarget = MEDIA_VALIDATION_TARGETS.find(
          ({ name }) => mediaMethods.getFieldState(name).invalid
        )
        if (firstInvalidTarget) {
          scrollToPublishField(firstInvalidTarget.targetId)
        }
      }

      return isStepValid
    }
    // Step 3 uses its own schema checks
    return true
  }, [currentStep, projectInfoMethods, mediaMethods])

  //  NEW: Track cumulative progress for all steps
  const [projectInfoProgress, setProjectInfoProgress] = useState(0)

  const [mediaProgress, setMediaProgress] = useState(0)
  const [projectScopeProgress, setProjectScopeProgress] = useState(0)

  const overallProgress = useMemo(() => {
    return projectInfoProgress + mediaProgress + projectScopeProgress
  }, [projectInfoProgress, mediaProgress, projectScopeProgress])

  const handleSaveExit = React.useCallback(() => {
    toggleIsSaveExitDialogOpen(false)
    router.push("/my-listings")
  }, [toggleIsSaveExitDialogOpen, router])

  // QA-196/PMCM-402: reusing the same "not found" empty-state pattern
  // already used on the public listing page and the my-listings editor
  // (centered AlertCircle + heading + description + button) rather than
  // inventing a new one, per the design-system reuse rule.
  if (isAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertCircle className="size-6 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-dark-blue-400">
            Unauthorized access
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            You don&apos;t have access to this project&apos;s editor. Ask the
            listing owner to add you to the team if you should be able to
            edit it.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push("/my-listings")}>
              Go to My Listings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return isProjectSubmitted ? (
    <div className="min-h-screen flex flex-col">
      <div className="h-[70px] border-b border-gray-200 flex items-center pr-[17px] pl-8">
        <h1 className="text-base leading-[19.36px] font-semibold text-dark-blue-400">
          Create a Project
        </h1>
      </div>
      <Empty
        outcome={submissionOutcome ?? undefined}
        draftId={draftProjectId ?? undefined}
      />
    </div>
  ) : (
    <StepperProvider value={stepperValue}>
      <StepRootProvider value={stepperRootValue}>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes editStepFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`,
          }}
        />
        <div className="h-screen flex overflow-x-hidden">
          <ProjectInfoProvider value={projectInfoMethods}>
            <MediaProvider value={mediaMethods}>
              <ProjectScopeProvider value={projectScopeValue}>
                <Sidebar
                  hasFaqs={completedFaqCount >= 3}
                  hasRecentQuestions={hasRecentQuestions}
                  faqError={
                    completedFaqCount < 3 &&
                    (publishAttempted || faqs.length > 0)
                  }
                  faqModerationHasError={Boolean(faqModerationError)}
                  projectInfoModerationHasError={Boolean(
                    projectInfoModerationError
                  )}
                  mediaModerationHasError={Boolean(mediaModerationError)}
                  publishAttempted={publishAttempted}
                  questionsStarted={faqs.length > 0}
                  everCompletedSteps={everCompletedSteps}
                />
                <div className="flex-auto bg-white min-w-0 overflow-x-hidden">
                  <Header
                    onClose={() => {
                      if (window.history.length > 1) {
                        router.back()
                      } else {
                        router.push("/my-listings")
                      }
                    }}
                    slug={slug}
                    lastSavedAt={lastSavedAt}
                    onPublish={attemptPublish}
                    publishing={isPublishing}
                    saveStatus={saveStatus}
                    isOffline={isOffline}
                    canPublish={viewerCanPublish}
                  />
                  <SaveExitDialog
                    open={isSaveExitDialogOpen}
                    onOpenChange={toggleIsSaveExitDialogOpen}
                    onConfirm={handleSaveExit}
                  />
                  {/* PMCM-403: shared publish-confirmation dialog, same
                      component the inline editor and the dashboard use. */}
                  <PublishConfirmDialog
                    open={publishDialogOpen}
                    onOpenChange={setPublishDialogOpen}
                    onConfirm={handlePublish}
                    listingType={scopeType === "service" ? "service" : "project"}
                    loading={isPublishing}
                  />
                  <div
                    key={currentStep}
                    style={{
                      animation:
                        "editStepFadeIn 450ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
                    }}
                  >
                    <StepControl className="contents">
                      {/*  Wrap steps to inject progress setter props */}
                      <Step className="contents">
                        {projectInfo && React.isValidElement(projectInfo)
                          ? React.cloneElement(projectInfo, {
                              setProgress: setProjectInfoProgress, // <-- inject progress
                            })
                          : null}
                      </Step>
                      <Step className="contents">
                        {media && React.isValidElement(media)
                          ? React.cloneElement(media, {
                              setProgress: setMediaProgress,
                            })
                          : null}
                      </Step>
                      <Step className="contents">
                        {projectScope && React.isValidElement(projectScope)
                          ? React.cloneElement(projectScope, {
                              setProgress: setProjectScopeProgress, // <-- inject progress
                            })
                          : null}
                      </Step>
                      <Step className="contents">
                        <Team />
                      </Step>
                      <Step className="contents">
                        <Questions
                          faqs={faqs}
                          setFaqs={setFaqs}
                          draftProjectId={draftProjectId}
                          onRecentQuestionsChange={setHasRecentQuestions}
                          publishAttempted={publishAttempted}
                          moderationError={faqModerationError}
                        />
                      </Step>
                    </StepControl>
                  </div>
                  {/* No BottomBar in edit mode */}
                </div>
              </ProjectScopeProvider>
            </MediaProvider>
          </ProjectInfoProvider>
        </div>
      </StepRootProvider>
    </StepperProvider>
  )
}

export default function PublishRootProject() {
  const params = useParams<{ slug: string }>()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Edit Project | Marketeq"
    }
  }, [])

  if (!mounted) {
    return null
  }

  // PMCM-402/QA-190: this used to redirect an unauthenticated visitor to the
  // full /sign-in page, which bypasses the on-page auth modal SOP §1.4.1
  // requires everywhere on listing pages. AuthenticatedRoute gives the same
  // "protected route" behavior (spinner, then the modal, then the page)
  // every other gated route already uses, with no full-page redirect.
  return (
    <AuthenticatedRoute>
      <PublishProject
        slug={params.slug}
        projectInfo={<ProjectInfo />}
        media={<Media />}
        projectScope={<ProjectScope />}
      />
      <Toaster />
    </AuthenticatedRoute>
  )
}
