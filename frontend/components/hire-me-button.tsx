"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn, isAccountTypeRole } from "@/utils/functions"
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  SearchMd,
  UserCircle,
  X,
} from "@blend-metrics/icons"
import { AnimatePresence, motion } from "framer-motion"
import { UserAPI } from "@/service/http/user"
import {
  logHireFlowInitiated,
  getMyContractGroups,
  addContractGroupMember,
  type ContractGroupSummary,
  type ContractGroupMemberSummary,
} from "@/service/http/contracts"
import { ProjectAPI } from "@/service/http/project"
import type { UserProfile } from "@/types/user"
import NextImage from "@/components/next-image"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  Calendar,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  ErrorMessage,
  IconButton,
  Input,
  RadioGroup,
  RadioGroupItemSelector,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from "@/components/ui"

export function getDefaultJobTitle(profile?: Partial<UserProfile> | null): string
export function getDefaultJobTitle(
  profile: Partial<UserProfile> | null | undefined,
  options: { fallback: string | null }
): string | null
export function getDefaultJobTitle(
  profile?: Partial<UserProfile> | null,
  options?: { fallback?: string | null }
): string | null {
  const jobTitles = (profile as any)?.jobTitles
  // `options?.fallback ?? "Full Stack Developer"` would defeat an explicit
  // `{ fallback: null }` — `??` falls through on `null` too, so it can't
  // distinguish "no options passed" from "caller wants null". Check
  // `undefined` specifically instead.
  const fallback =
    options?.fallback !== undefined ? options.fallback : "Full Stack Developer"
  const legacyRole =
    profile?.role && !isAccountTypeRole(profile.role) ? profile.role : ""

  return (
    jobTitles?.find((job: any) => job.isDefault || job.saveAsDefault)?.jobTitle ||
    jobTitles?.[0]?.jobTitle ||
    // GET /talent/users/:username (how this modal seeds and refetches the
    // profile) never loads jobTitles, so both rungs above are always
    // undefined here — recentJobTitle is a plain column on users and is the
    // only rung left that can carry a real title on username-reached profiles.
    profile?.recentJobTitle ||
    legacyRole ||
    fallback
  )
}

export function getExperienceLabel(profile?: Partial<UserProfile> | null): string
export function getExperienceLabel(
  profile: Partial<UserProfile> | null | undefined,
  options: { fallback: string | null }
): string | null
export function getExperienceLabel(
  profile?: Partial<UserProfile> | null,
  options?: { fallback?: string | null }
): string | null {
  const dates: Date[] = []
  const endDates: Date[] = []

  profile?.experience?.forEach((experience) => {
    if (experience.startDate) dates.push(new Date(experience.startDate))
    if (experience.endDate) endDates.push(new Date(experience.endDate))
    else endDates.push(new Date())
  })

  if (dates.length === 0) {
    // See getDefaultJobTitle above for why this isn't `options?.fallback ?? "..."`.
    return options?.fallback !== undefined
      ? options.fallback
      : "10 years of experience"
  }

  const earliest = dates.reduce((a, b) => (a < b ? a : b))
  const latest = endDates.reduce((a, b) => (a > b ? a : b))
  const months =
    (latest.getFullYear() - earliest.getFullYear()) * 12 +
    (latest.getMonth() - earliest.getMonth())

  if (months < 12) {
    return `${Math.max(1, months)} month${months === 1 ? "" : "s"} of experience`
  }

  const years = Math.round(months / 12)
  return `${years} year${years === 1 ? "" : "s"} of experience`
}

type HireMeButtonProps = {
  profile?: Partial<UserProfile> | null
  buttonProps?: React.ComponentPropsWithoutRef<typeof Button>
}

type OfferDialogProps = {
  profile?: Partial<UserProfile> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  mode?: "create" | "edit"
  onSaveOffer?: (offer: {
    selectedRate: string
    schedule: string
    selectedDuration: string
    // Only set when selectedRate is "custom" — the real number the user
    // typed, which no offerRates tile can carry. Optional so the existing
    // call sites that don't read it are unaffected.
    customRate?: string
  }) => void
}

type ContractRowAvatar = {
  url?: string
  name?: string
}

type ContractRow = {
  id: string
  title: string
  subtitle: string
  avatars: ContractRowAvatar[]
  extra?: string
  // T3: carried through so the start-date estimate effect can call
  // ProjectAPI.GetProjectDraft again for just the selected row, once the
  // user actually reaches the offer-details step — the initial list-build
  // fetch (T2-3) discards everything but title/subtitle/avatars.
  projectId: string | null
}

// Duplicated rather than imported from talent-profile/page.tsx:110-116 —
// that function isn't exported, and re-exporting a helper from a page
// component (rather than a shared utils module) to import it into another
// component isn't the right home for it either. Six lines, pure, matched
// exactly rather than reinvented; a real shared extraction into
// utils/functions.ts is a separate, small cleanup, not done here.
const getInitials = (name?: string | null): string => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase() || "?"
}

// T2-17/doc 05: "Talent profile photo is missing in the review popup ->
// Default silhouette icon shown as fallback avatar" — the only
// avatar-fallback rule in the epic. Initials still win when a NAME resolved
// but no photo did (matches the talent profile page, and a real name beats
// a generic icon); the silhouette is reserved for "neither resolved",
// i.e. a genuinely failed talent lookup — never a bare "?" glyph.
const renderAvatarFallbackContent = (name?: string) =>
  name ? (
    getInitials(name)
  ) : (
    <UserCircle className="size-full text-gray-400" />
  )

// T3/FR-7/AC-11 + the weekend edge case: the closest Monday on or after
// `date` — if `date` is already Monday, that counts (not forced a full
// week out). Reused for both "no scope, fall back to next Monday" and
// "a scope-derived date landed on a weekend, adjust to the following
// Monday" — same closest-Monday-on-or-after math either way.
const getNextMondayOnOrAfter = (date: Date): Date => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const daysUntilMonday = (8 - result.getDay()) % 7
  result.setDate(result.getDate() + daysUntilMonday)
  return result
}

const isWeekendDate = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

// T3/FR-1/AC-8.1: no backend endpoint computes this. offer-service
// specified it in full — offer-response.interface.ts's startDateDisplay
// field carries the exact "Monday, Jan 30, 2025" string this file had
// hardcoded, and a SCOPED_CONTRACT_TYPES array exists specifically to gate
// "contract types where start date is suggested by listings-service scope"
// — but SCOPED_CONTRACT_TYPES is never imported anywhere, and
// listings.client.ts (offer-service's own client for talking to
// listings-service) has exactly one method, validateListing. Specified,
// never built. See TICKET-3-CHECKLIST.md for the full finding.
//
// Computing it client-side instead is a declared deviation from "the
// estimate is calculated server-side" in the security line, not a hidden
// one — acceptable here specifically because FR-6 lets the client select
// ANY non-past date regardless of what this proposes. A tampered or wrong
// estimate produces nothing the client couldn't already pick legitimately;
// there's no privileged information in a proposed date.
//
// THE FORMULA (invented — nothing in any doc defines "derived from
// project scope"): anchor = the project's own createdAt, the only date
// field guaranteed present regardless of publish status
// (projectDatePublished is null for drafts, which is most of this seed
// data) + scope[0]'s startDay offset (first phase by order — the same
// phase this file already uses for the row subtitle elsewhere). If that
// lands in the past, or scope/the offset is unavailable at all, fall back
// to the next Monday from today (FR-7/AC-11 — deliberately one fallback
// for both cases, not two). If it lands on a genuine future weekend,
// adjust to the following Monday — the edge case this ticket names
// explicitly, and observable only for a real scope-derived date, since
// getNextMondayOnOrAfter never itself returns a weekend date.
//
// Honest weakness: createdAt is a DB timestamp, not "when work begins" —
// on this seed data (projects created weeks ago, small phase offsets)
// this will often compute a past date and fall through to next-Monday
// rather than a genuine scope-derived one. Expected, not a bug — no
// better anchor exists anywhere in the data model today.
const computeEstimatedStartDate = (
  projectCreatedAt: Date | null,
  startDayOffset: number | null | undefined
): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (projectCreatedAt && typeof startDayOffset === "number") {
    const candidate = new Date(projectCreatedAt)
    candidate.setHours(0, 0, 0, 0)
    candidate.setDate(candidate.getDate() + startDayOffset)

    if (candidate >= today) {
      return isWeekendDate(candidate)
        ? getNextMondayOnOrAfter(candidate)
        : candidate
    }
  }

  return getNextMondayOnOrAfter(today)
}

// Edit mode edits one specific, already-known offer directly — it never
// lists contracts, so it must never depend on the real fetched list below.
// Before this was decoupled, edit mode seeded selectedContractId from
// existingContracts[0], which broke two ways once that became live data:
// the synthetic id never matches a real backend id, and a client who
// actually has groups would make hasExistingContracts true, removing the
// isStepThree fallback that used to cover the mismatch. Single, static,
// intentionally disconnected from anything fetched.
const EDIT_MODE_PLACEHOLDER_CONTRACT: ContractRow = {
  id: "edit-mode-contract",
  title: "React Native Mobile App",
  subtitle: "Design Phase",
  avatars: [
    { url: "/man.jpg" },
    { url: "/woman.jpg" },
    { url: "/tutorial-thumbnails/image-2.png" },
    { url: "/tutorial-thumbnails/image-3.png" },
    { url: "/man.jpg" },
  ],
  extra: "+5",
  // T3: edit mode never runs the estimate-fetch effect (isExistingContractOfferStep
  // excludes it), so this is inert — null purely to satisfy the type.
  projectId: null,
}

// T2-17: one talent, resolved once, from either UserAPI.getProfile's
// response or nothing at all (lookup failed or never attempted). Shared
// shape the per-modal resolution map stores, so both row builders below
// read from the same place rather than each inventing their own.
type ResolvedTalent = {
  avatarUrl?: string
  name?: string
}

// T2-17: builds a group's avatars purely from the already-resolved
// per-modal talent map (see the fetch effect below) — replaces the old
// per-function avatar logic in both builders. A member absent from the map
// (lookup failed, or the talentId doesn't resolve to a real user at all)
// yields {} — renderAvatarFallbackContent's job, not this function's, to
// turn that into a silhouette instead of a "?".
const buildAvatarsFromTalentMap = (
  members: ContractGroupMemberSummary[],
  talentMap: Map<string, ResolvedTalent>
): ContractRowAvatar[] =>
  members.map((member): ContractRowAvatar => {
    const resolved = talentMap.get(member.talentId)
    return { url: resolved?.avatarUrl, name: resolved?.name }
  })

// T2-3 decision 3: a group can be type service/team/job with no projectId
// — nothing to hydrate for those in this chunk's scope. Also doubles as
// the per-row failure fallback (T2-3 spec #4): if a project group's own
// fetch fails (ensureProjectOwnership throwing, network error, etc.), that
// one row degrades to this rather than the whole list failing.
const buildFallbackContractRow = (
  group: ContractGroupSummary,
  talentMap: Map<string, ResolvedTalent>
): ContractRow => {
  const typeLabel = group.projectId
    ? "Project"
    : group.serviceId
      ? "Service Engagement"
      : group.teamId
        ? "Team"
        : group.jobId
          ? "Job"
          : "Contract"
  return {
    id: group.id,
    title: typeLabel,
    subtitle: "",
    // T2-17: no longer a blank stub — resolved from the same per-modal
    // talent map hydrateContractRow uses. A fallback row (no projectId)
    // has no less reason to show real avatars than a hydrated one.
    avatars: buildAvatarsFromTalentMap(group.members, talentMap),
    extra:
      group.members.length > 5
        ? `+${group.members.length - 5}`
        : undefined,
    projectId: group.projectId,
  }
}

// T2-3 accepted trade-off: getProjectDraft hydrates tasks, media and
// questions and runs a per-task pricing calculation — far more than this
// row needs (title, one phase name, member avatars). One call per group
// per modal open is a deliberate interim choice, not a claim that it's
// optimal; a lean batched summary endpoint is the correct fix, raised
// separately.
const hydrateContractRow = async (
  group: ContractGroupSummary,
  talentMap: Map<string, ResolvedTalent>
): Promise<ContractRow> => {
  if (!group.projectId) return buildFallbackContractRow(group, talentMap)

  const res = await ProjectAPI.GetProjectDraft(group.projectId)
  const projectData = res?.data ?? {}
  const scope = Array.isArray(projectData.scope) ? projectData.scope : []

  // T2-17: team[] (the project listing's assigned team) is no longer read
  // here at all — it was never the right source (members[], who's actually
  // contracted, and team[], who the client assigned to the listing, are
  // different sets; a contracted talent absent from team[] resolved to
  // nothing). Replaced entirely by the per-modal talent map, resolved
  // directly from each member's talentId via UserAPI.getProfile.
  const avatars = buildAvatarsFromTalentMap(group.members, talentMap)

  return {
    id: group.id,
    title: projectData.title || "Project",
    // Decision 2: no source anywhere derives a "current" phase —
    // publish.service.ts:628-641 only ever sorts scope by `order`. First
    // by order is a declared invention, chosen because it's the one line
    // easiest to replace with a real date-derived rule later.
    subtitle: scope[0]?.name || "",
    avatars,
    extra:
      group.members.length > 5
        ? `+${group.members.length - 5}`
        : undefined,
    projectId: group.projectId,
  }
}

// T2-14 flagged this, not fixed here: these three prices are a hardcoded
// module constant, not the talent's actual rate — amitreyes78's real range
// (profile.rateMin/rateMax) is $65-$132/hr, nowhere near $45/$70/$85. This
// was already misleading as a *display*; T2-14 is the first thing that
// *persists* one of these numbers into a Contract row that governs payment.
// Same category of fabrication T1-2 removed from the talent header, now
// written to the database instead of just rendered. Declared in the PR, not
// silently shipped — see the T2-14 report for what sourcing these tiles
// from profile.rateMin/rateMax would actually take.
export const offerRates = [
  { value: "logo-design", label: "Logo Design", price: "$45/hr" },
  { value: "web-development", label: "Web Development", price: "$70/hr" },
  { value: "ux-ui-design", label: "UX/UI Design", price: "$85/hr" },
]

// Parses the number back out of offerRates' own display string ("$70/hr" ->
// 70) — this is the number already shown to the user for their selection,
// not a second invented value on top of the first. Still fabricated data
// (see the comment above); this only avoids inventing a THIRD number
// disconnected from what the UI displayed. Returns null if selectedRate
// doesn't match any tile and isn't "custom" (e.g. nothing selected yet).
//
// T4-A: "custom" now returns the real entered number instead of falling
// through to null ?? 0 — the whole point of wiring the Custom Rate button
// is that this stops being a fabricated tile price and becomes what the
// user actually typed.
const parseFabricatedRateValue = (
  selectedRateValue: string,
  customRateValue: string
): number | null => {
  if (selectedRateValue === "custom") {
    const parsed = Number(customRateValue)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  const match = offerRates.find((rate) => rate.value === selectedRateValue)
  if (!match) return null
  const parsed = Number(match.price.replace(/[^0-9.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

const durations = [
  "3 Months",
  "6 Months",
  "1 Year",
  "18 Months",
  "2 Years",
  "Ongoing",
]

const customScheduleFrequencies = [
  { value: "day", label: "Per Day" },
  { value: "week", label: "Per Week" },
  { value: "month", label: "Per Month" },
] as const

// Physical upper bound on hours within each frequency window — facts,
// not workload opinions, so the numbers can't be argued in review.
// Not specified in the ticket or docs; new behaviour, declared in the PR.
const CUSTOM_HOURS_MAX: Record<string, number> = {
  day: 24,
  week: 168, // 7 * 24
  month: 744, // 31 * 24
}

// Local copy of the shimmer pattern from talent-profile/page.tsx:531 — not
// extracted to components/ui, that's a separate PR.
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("relative overflow-hidden rounded bg-gray-100", className)}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

// Same module-level guard as transfer-funds/page.tsx:69 — module scope, not
// component state, so concurrent 401s (e.g. two effects racing on
// close-and-reopen) can't stack navigations. Only one redirect ever fires.
let sessionExpiredRedirecting = false

const getInitialOfferState = (mode: "create" | "edit") => ({
  schedule: mode === "edit" ? "full-time" : "",
  search: "",
  selectedContractId:
    mode === "edit" ? EDIT_MODE_PLACEHOLDER_CONTRACT.id : null,
  creatingContract: false,
  selectedRate: mode === "edit" ? "web-development" : "",
  selectedDuration: mode === "edit" ? "Ongoing" : "",
  selectedStartDateAction: mode === "edit" ? "confirm" : "",
  contractTitle: "",
  message: "",
  offerSent: false,
})

export function OfferDialog({
  profile,
  open,
  onOpenChange,
  trigger,
  mode = "create",
  onSaveOffer,
}: OfferDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const initialState = React.useMemo(() => getInitialOfferState(mode), [mode])
  const [schedule, setSchedule] = React.useState(initialState.schedule)
  // T1-11: setting `schedule` unmounts the tile screen in the same render
  // pass (isStepTwo/currentScreen derive from it), so there is no frame
  // where a tile can be both mounted and shown selected. pendingSchedule
  // holds the click's value for a short, deliberately perceptible delay so
  // the highlight renders before schedule commits and the screen advances.
  const [pendingSchedule, setPendingSchedule] = React.useState("")
  const modalScrollViewportRef = React.useRef<HTMLDivElement>(null)
  const startDateAccordionRef = React.useRef<HTMLDivElement>(null)
  const [modalScrollThumb, setModalScrollThumb] = React.useState({
    height: 0,
    offset: 0,
    visible: false,
  })
  const scheduleCommitTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const clearScheduleCommitTimeout = React.useCallback(() => {
    if (scheduleCommitTimeoutRef.current) {
      clearTimeout(scheduleCommitTimeoutRef.current)
      scheduleCommitTimeoutRef.current = null
    }
  }, [])
  const [search, setSearch] = React.useState(initialState.search)
  // FR-4/AC-5.2: 200ms debounce. `search` stays immediate (drives the input
  // itself); filtering and the empty-state check both read this instead,
  // so they can never disagree with each other mid-typing.
  const [debouncedSearch, setDebouncedSearch] = React.useState(
    initialState.search
  )
  const [selectedContractId, setSelectedContractId] = React.useState<
    string | null
  >(initialState.selectedContractId)
  // T2-3: real data replacing the old hardcoded mock, fetched below.
  // Edit mode never populates or reads this — see
  // EDIT_MODE_PLACEHOLDER_CONTRACT above.
  const [existingContracts, setExistingContracts] = React.useState<
    ContractRow[]
  >([])
  // Defaults true in create mode (a fetch is about to start) and false in
  // edit mode (nothing is ever fetched there, so there's nothing to wait
  // on). Feeds hasExistingContracts below: while loading, treat as "has
  // contracts" so T1-10's routing doesn't act on a not-yet-known answer —
  // picking a schedule before the fetch resolves must not skip straight to
  // Estimated Start Date only to have the screen change once real data
  // lands. No spinner; this is a routing decision, not a visual state —
  // the loading skeleton itself is T2-4.
  const [isLoadingGroups, setIsLoadingGroups] = React.useState(
    mode !== "edit"
  )
  // T2-5: mirrors fetchError's shape ("data" | null) below, but a separate
  // flag — this fetch and the talent fetch are independent and must retry
  // independently. Single value rather than distinguishing offline from a
  // generic failure: the toast already carries the "why" for 5s, so the
  // inline copy's job is just "the list didn't load, here's Retry" —
  // identical regardless of cause. Two inline strings for one outcome
  // would just be two things that could say something different about the
  // same event.
  const [groupsFetchError, setGroupsFetchError] = React.useState<
    "data" | null
  >(null)
  const [groupsRetryToken, setGroupsRetryToken] = React.useState(0)
  const [creatingContract, setCreatingContract] = React.useState(
    initialState.creatingContract
  )
  const [selectedRate, setSelectedRate] = React.useState(
    initialState.selectedRate
  )
  const [selectedDuration, setSelectedDuration] = React.useState(
    initialState.selectedDuration
  )
  const [selectedStartDateAction, setSelectedStartDateAction] = React.useState(
    initialState.selectedStartDateAction
  )
  const [confirmStartDateOpen, setConfirmStartDateOpen] = React.useState(false)
  // T3: FR-7/AC-11's fallback, not an arbitrary placeholder — this is the
  // correct starting assumption before the estimate effect below has a
  // chance to resolve (or fails to), not a "wrong until fetched" stopgap
  // the way the old hardcoded 2025-01-30 was.
  const [selectedStartDate, setSelectedStartDate] = React.useState(() =>
    getNextMondayOnOrAfter(new Date())
  )
  const [focusedStartDate, setFocusedStartDate] = React.useState(() =>
    getNextMondayOnOrAfter(new Date())
  )
  const [startDateCalendarOpen, setStartDateCalendarOpen] =
    React.useState(false)
  // T3/FR-9: mirrors groupsFetchError's shape and reasoning exactly — one
  // "data" value covering both offline and a genuine fetch failure, not
  // two strings that could say something different about the same event.
  const [isLoadingStartDateEstimate, setIsLoadingStartDateEstimate] =
    React.useState(false)
  const [startDateEstimateError, setStartDateEstimateError] = React.useState<
    "data" | null
  >(null)
  const [startDateRetryToken, setStartDateRetryToken] = React.useState(0)
  const selectedStartDateLabel = selectedStartDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const [contractTitle, setContractTitle] = React.useState(
    initialState.contractTitle
  )
  // T2-14: true only while the Send Offer click is awaiting
  // addContractGroupMember — separate from isLoadingGroups/isFetchingTalent,
  // which are about the two background fetches, not this user-initiated
  // submission.
  const [isSubmittingOffer, setIsSubmittingOffer] = React.useState(false)
  // ERR-007: 409 from addContractGroupMember — inline in the footer, not a
  // toast (that's ERR-006, the 5xx/network case). Single "duplicate" value
  // rather than the literal message string, matching groupsFetchError's
  // convention elsewhere in this file.
  const [addMemberError, setAddMemberError] = React.useState<
    "duplicate" | null
  >(null)
  const [message, setMessage] = React.useState(initialState.message)
  const [offerSent, setOfferSent] = React.useState(initialState.offerSent)
  const [showValidationErrors, setShowValidationErrors] = React.useState(false)
  const [customScheduleOpen, setCustomScheduleOpen] = React.useState(false)
  const [customHours, setCustomHours] = React.useState("")
  // "day" | "week" | "month" | "" — "" means no frequency chosen yet.
  // Defaults to "week" per explicit request — not an empty placeholder,
  // and not "day" (Figma's own rest state) — overridden on purpose.
  const [customFrequency, setCustomFrequency] = React.useState("week")
  // T4-A: selectedRate/selectedDuration double as their own "custom row is
  // open" flag — the literal value "custom" means the row is showing and
  // the tiles above it are deselected (RadioGroup/tile highlighting below
  // already compares against selectedRate/selectedDuration directly, so
  // this falls out for free rather than needing a second boolean kept in
  // sync with it, the way customScheduleOpen has to be kept in sync with
  // schedule).
  const [customRateValue, setCustomRateValue] = React.useState("")
  const [customDurationValue, setCustomDurationValue] = React.useState("")
  // No default named anywhere in the ticket; "Months" chosen only because
  // it's first in the unit list, same non-empty-default reasoning as
  // customFrequency above — an empty Select would have no placeholder to
  // fall back on either.
  const [customDurationUnit, setCustomDurationUnit] =
    React.useState<"Months" | "Years">("Months")
  // Same class of blur-vs-click race T1-5 fixed on the Cancel button
  // (onMouseDown + preventDefault, below): a blur fired by clicking
  // somewhere INSIDE this row shouldn't count as "done with the field."
  // T1-5's guard only covers Cancel, since Cancel sits outside this
  // container; this covers everything inside it, including the frequency
  // Select trigger, without needing a guard per-control.
  const customScheduleRowRef = React.useRef<HTMLDivElement>(null)
  const [isFetchingTalent, setIsFetchingTalent] = React.useState(false)
  // FR-11: guards the audit-log effect below against firing twice for the
  // same open — reset only when the effect itself observes open === false,
  // not via a cleanup return, so it survives React StrictMode's dev-only
  // mount/cleanup/remount without double-posting.
  const hireInitiatedFiredRef = React.useRef(false)
  const [fetchedProfile, setFetchedProfile] = React.useState<UserProfile | null>(
    null
  )
  // "data" covers ERR-005 (5xx or network failure) — offline is its own
  // ERR-025 toast and never sets this. See the fetch effect below.
  const [fetchError, setFetchError] = React.useState<"data" | null>(null)
  const [retryToken, setRetryToken] = React.useState(0)

  const getDisplayName = (p?: Partial<UserProfile> | null) =>
    p?.username || `${p?.firstName || ""}${p?.lastName || ""}`.trim() || ""

  const seedDisplayName = getDisplayName(profile)
  const fetchedDisplayName = getDisplayName(fetchedProfile)
  // `||` not `??`: a resolved-but-nameless fetch yields "", which should
  // still defer to the seed name rather than display blank.
  const displayName = fetchedDisplayName || seedDisplayName
  // Shared by headerName below and the AC-1.3 name line — same
  // fetched-over-seed precedence as displayName throughout.
  const username = fetchedProfile?.username || profile?.username || ""
  // AC-1.3: the header wants "@handle", not a name with "@" glued on —
  // "Hire @John Smith" is wrong. displayName already prefers username over
  // firstName+lastName (:322), so it can't tell the header which one it got.
  // Falls back to the plain name only when there's no username at all.
  // Header-only — every other displayName use (avatar fallback/alt, Offer
  // Sent) is untouched.
  const headerName = username ? `@${username}` : displayName

  // Independent of displayName so a missing name can't also break the
  // checkout URL. Fetched wins over seed, same precedence as every other
  // field below. Neither is a hard guarantee — `profile` is typed
  // Partial<UserProfile> | null, and a fetch can fail — so `id` is still
  // technically optional at the type level either way.
  const checkoutSlug = encodeURIComponent(
    fetchedProfile?.username ||
      profile?.username ||
      fetchedProfile?.id ||
      profile?.id ||
      ""
  )

  const seedJobTitle = getDefaultJobTitle(profile, { fallback: null })
  const fetchedJobTitle = fetchedProfile
    ? getDefaultJobTitle(fetchedProfile, { fallback: null })
    : null
  // `??` not `||`: an empty job title is still "no title" either way, so
  // only a genuine null/undefined (fetch pending or found nothing) should
  // fall through to the seed — never let a legitimately-empty result get
  // silently overridden.
  const jobTitle = fetchedJobTitle ?? seedJobTitle

  const seedExperienceLabel = getExperienceLabel(profile, { fallback: null })
  const fetchedExperienceLabel = fetchedProfile
    ? getExperienceLabel(fetchedProfile, { fallback: null })
    : null
  const experienceLabel = fetchedExperienceLabel ?? seedExperienceLabel

  const seedLocationLabel = profile?.location || null
  // `||` not `??`: confirmation/page.tsx:1365 seeds location with a
  // deliberate "United States" placeholder rather than null. If the fetch
  // resolves with an empty string (not just null/undefined), `??` would
  // let that empty value win and blank a row that call site chose to keep
  // populated — `||` correctly defers to the seed in that case too.
  const locationLabel = fetchedProfile?.location || seedLocationLabel

  const seedAvatarUrl = profile?.avatarUrl || undefined
  // Same reasoning as locationLabel — an empty string from the fetch must
  // not override a seed that already has something to show.
  const avatarUrl = fetchedProfile?.avatarUrl || seedAvatarUrl
  const isEditMode = mode === "edit"
  const filteredContracts = existingContracts.filter((contract) =>
    contract.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  )
  // T2-14: the talent being hired, sent as addContractGroupMember's
  // talentId on Send Offer. Same expression as the FR-11 audit effect below
  // (fetchedProfile is authoritative once T1-3's self-fetch resolves;
  // profile is the seed passed in from callers like checkout confirmation's
  // Edit Offer, which carries no id at all). A separate const rather than
  // reusing that effect's local — this is a render-time value, not an
  // effect dependency.
  const hiredTalentId = fetchedProfile?.id || profile?.id
  // T2-3: edit mode always resolves to its own static placeholder, never a
  // lookup into the real fetched list — see EDIT_MODE_PLACEHOLDER_CONTRACT.
  const selectedContract = isEditMode
    ? EDIT_MODE_PLACEHOLDER_CONTRACT
    : existingContracts.find(
        (contract) => contract.id === selectedContractId
      ) || null
  // T1-10: a client with no existing contracts skips select-contract
  // entirely — schedule selection alone should be enough to reach
  // Estimated Start Date. isLoadingGroups keeps this true until the real
  // fetch settles, so an early schedule pick can't mis-route before we
  // actually know whether the client has any groups (see the state
  // declaration above). Edit mode's isLoadingGroups is always false and
  // its selectedContract is always truthy regardless, so this never
  // affects it either way.
  // T2-5: a failed fetch (or the offline pre-flight) must also count as
  // "has contracts" — otherwise the client gets silently routed to
  // Estimated Start Date as if their list were genuinely empty, hiding a
  // real failure instead of showing FR-10's inline error.
  const hasExistingContracts =
    isLoadingGroups || groupsFetchError !== null || existingContracts.length > 0
  const isStepTwo =
    Boolean(schedule) &&
    hasExistingContracts &&
    !selectedContract &&
    !creatingContract
  const isStepThree =
    Boolean(schedule) && (Boolean(selectedContract) || !hasExistingContracts)
  const isStepFour = Boolean(schedule) && creatingContract
  const scheduleLabel =
    schedule === "part-time"
      ? "part-time"
      : schedule === "custom"
        ? "custom" // Figma has no Offer Sent copy for a custom schedule — guessing here.
        : "full-time"
  const currentScreen = offerSent
    ? "offer-sent"
    : isStepFour
      ? "create-contract"
      : isStepThree
        ? "offer-details"
        : isStepTwo
          ? "select-contract"
          : "select-schedule"

  const syncModalScrollThumb = React.useCallback(() => {
    const viewport = modalScrollViewportRef.current
    if (!viewport) return

    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    if (maxScroll <= 0) {
      setModalScrollThumb({ height: 0, offset: 0, visible: false })
      return
    }

    const proportionalHeight =
      (viewport.clientHeight * viewport.clientHeight) / viewport.scrollHeight
    const height = proportionalHeight / 3
    const maxOffset = viewport.clientHeight - height
    const offset = (viewport.scrollTop / maxScroll) * maxOffset

    setModalScrollThumb({ height, offset, visible: true })
  }, [])

  React.useEffect(() => {
    const animationFrame = requestAnimationFrame(syncModalScrollThumb)
    return () => cancelAnimationFrame(animationFrame)
  }, [currentScreen, existingContracts.length, open, syncModalScrollThumb])

  React.useEffect(() => {
    if (selectedStartDateAction !== "change") return

    const timeout = setTimeout(() => {
      const viewport = modalScrollViewportRef.current
      if (!viewport) return

      if (startDateCalendarOpen) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        })
      } else {
        startDateAccordionRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        })
      }
      syncModalScrollThumb()
    }, 300)

    return () => clearTimeout(timeout)
  }, [
    selectedStartDateAction,
    startDateCalendarOpen,
    syncModalScrollThumb,
  ])

  const screenTransition = {
    duration: 0.26,
    ease: [0.22, 1, 0.36, 1] as const,
  }
  // Both modes use dvh now, not just edit mode. 100vh ignores the mobile
  // browser's address bar, so the bottom of the modal could render under
  // browser chrome; dvh tracks the actually-visible viewport. Desktop is
  // unaffected — with no collapsing toolbar, dvh and vh resolve
  // identically there. This is a straight swap, not a fallback pair: cn's
  // twMerge collapses a vh+dvh max-h pair down to whichever is last, it
  // doesn't cascade the way plain CSS would.
  const dialogContentClass = isEditMode
    ? "!top-[100px] !-translate-y-0 max-h-[calc(100dvh-200px)]"
    : "max-h-[calc(100dvh-24px)]"
  const dialogBodyClass = isEditMode
    ? "max-h-[calc(100dvh-200px)]"
    : "max-h-[calc(100dvh-24px)]"
  const isOfferDetailsStep = isStepThree || isStepFour
  // Reopening the custom row mid-edit visually deselects the tiles (T1-5's
  // derived RadioGroup value) but leaves `schedule` at whatever it was
  // last set to, so isOfferReady alone can't see an invalid draft sitting
  // in the still-open row. This closes that gap for mode="edit", where the
  // CTA and the row can be on screen at the same time.
  const isCustomScheduleIncomplete =
    customScheduleOpen &&
    !(
      Number(customHours) > 0 &&
      Number(customHours) <= CUSTOM_HOURS_MAX[customFrequency] &&
      customFrequency
    )
  // T4-A/AC-14.3 & AC-15.3: same shape as isCustomScheduleIncomplete above —
  // selectedRate/selectedDuration being "custom" is itself the "row is
  // open" signal (see the state declarations), so a revealed-but-empty (or
  // zero) custom value is caught here rather than by isOfferReady seeing a
  // truthy-but-meaningless "custom" string and calling it ready.
  const isCustomRateIncomplete =
    selectedRate === "custom" && !(Number(customRateValue) > 0)
  const isCustomDurationIncomplete =
    selectedDuration === "custom" && !(Number(customDurationValue) > 0)
  // The "custom" sentinel is only meaningful INSIDE this component (see the
  // state declarations). Everything downstream reads these two values
  // literally: the four checkout screens price an offer by looking
  // selectedRate up in offerRates — which has no "custom" tile, so it falls
  // through to the web-development tile and silently prices a custom offer
  // at $70/hr — and confirmation/page.tsx renders selectedDuration straight
  // into its duration badge. Resolve both here, once, so every exit from
  // this dialog (the addContractGroupMember payload, the checkout URL, and
  // onSaveOffer) carries the same real values rather than each call site
  // remembering to unwrap the sentinel itself.
  const resolvedDuration =
    selectedDuration === "custom"
      ? `${customDurationValue} ${customDurationUnit}`
      : selectedDuration
  // Deliberately NOT folded into `rate`: offerRates is a fixed three-tile
  // list and the checkout pages key off it, so a custom rate has to travel
  // as its own value rather than as a tile that doesn't exist. Empty string
  // whenever a predefined tile is selected, which is what lets the callers
  // below clear a stale customRate instead of leaving the previous custom
  // price applied to a newly-picked tile.
  const resolvedCustomRate = selectedRate === "custom" ? customRateValue : ""
  // Single builder for the checkout query string — used by both the Review
  // Your Offer button and the Send Offer redirect below, so the two can't
  // drift apart the way they would if each set its own params inline.
  const buildCheckoutSearchParams = () => {
    const nextSearchParams = new URLSearchParams()
    nextSearchParams.set("rate", selectedRate)
    nextSearchParams.set("schedule", schedule)
    nextSearchParams.set("duration", resolvedDuration)
    if (resolvedCustomRate) {
      nextSearchParams.set("customRate", resolvedCustomRate)
    }
    return nextSearchParams
  }
  // AC-13.1: "A contract title input field is displayed and required" — doc
  // 04 §6 places it on the Send Offer screen, which is isStepThree here,
  // not just isStepFour. The input was only ever wired to isStepFour; this
  // is closing that gap against the spec, not adding a new field. Excluded
  // for edit mode (selectedContract is always the static placeholder there,
  // and edit mode never calls addContractGroupMember) and for the
  // zero-existing-contracts case (selectedContract is null, isStepThree is
  // true only via T1-10's `!hasExistingContracts` fallthrough — there's no
  // group to title a membership against).
  const isExistingContractOfferStep =
    isStepThree && !isEditMode && Boolean(selectedContract)
  const isOfferReady =
    (isStepThree
      ? Boolean(
          schedule &&
          selectedContractId &&
          selectedRate &&
          selectedDuration &&
          selectedStartDateAction &&
          (!isExistingContractOfferStep || contractTitle.trim())
        )
      : isStepFour
        ? Boolean(
            schedule && contractTitle.trim() && selectedRate && selectedDuration
          )
        : false) &&
    !isCustomScheduleIncomplete &&
    !isCustomRateIncomplete &&
    !isCustomDurationIncomplete
  const contractTitleError =
    showValidationErrors &&
    (isStepFour || isExistingContractOfferStep) &&
    !contractTitle.trim()
      ? "Please enter a contract title."
      : null
  const selectedRateError =
    showValidationErrors && isOfferDetailsStep && !selectedRate
      ? "Please select a rate."
      : null
  const selectedDurationError =
    showValidationErrors && isOfferDetailsStep && !selectedDuration
      ? "Please select a contract duration."
      : null
  const selectedStartDateActionError =
    showValidationErrors && isStepThree && !selectedStartDateAction
      ? "Please confirm or change the start date."
      : null
  const staticAvatarClassName = "hover:ring-0 active:ring-0"
  const staticAvatarFallbackClassName = "hover:bg-primary-25"

  const resetFlow = React.useCallback(() => {
    setSchedule(initialState.schedule)
    setSearch(initialState.search)
    setDebouncedSearch(initialState.search)
    setSelectedContractId(initialState.selectedContractId)
    setCreatingContract(initialState.creatingContract)
    setSelectedRate(initialState.selectedRate)
    setSelectedDuration(initialState.selectedDuration)
    setSelectedStartDateAction(initialState.selectedStartDateAction)
    setConfirmStartDateOpen(false)
    setSelectedStartDate(getNextMondayOnOrAfter(new Date()))
    setFocusedStartDate(getNextMondayOnOrAfter(new Date()))
    setStartDateCalendarOpen(false)
    setIsLoadingStartDateEstimate(false)
    setStartDateEstimateError(null)
    setStartDateRetryToken(0)
    setContractTitle(initialState.contractTitle)
    setIsSubmittingOffer(false)
    setAddMemberError(null)
    setMessage(initialState.message)
    setOfferSent(initialState.offerSent)
    setShowValidationErrors(false)
    setCustomScheduleOpen(false)
    setCustomHours("")
    setCustomRateValue("")
    setCustomDurationValue("")
    setCustomDurationUnit("Months")
    setCustomFrequency("week")
    setIsFetchingTalent(false)
    setFetchedProfile(null)
    setFetchError(null)
    setRetryToken(0)
    setExistingContracts([])
    setIsLoadingGroups(mode !== "edit")
    clearScheduleCommitTimeout()
    setPendingSchedule("")
  }, [initialState, clearScheduleCommitTimeout, mode])

  // T3/FR-1/AC-8.1: fetches the estimated start date on entering the
  // offer-details step. Mirrors the groups-fetch effect's shape exactly
  // (offline pre-flight before the loading flag, isActive cleanup guard,
  // 401 via the shared sessionExpiredRedirecting module flag, inline
  // error + retry rather than a silent fallback on genuine failure).
  React.useEffect(() => {
    if (!isOfferDetailsStep) return

    // FR-8: once the user has confirmed or changed a date this session,
    // this effect never runs again for it — matches how selectedRate/
    // selectedDuration already behave (flow-level state, not re-derived
    // on every re-entry into this step). Re-entering this step for the
    // SAME selection (e.g. Change Contract, then picking the same
    // contract again) must not silently overwrite what the user already
    // decided.
    if (selectedStartDateAction !== "") return

    if (!isExistingContractOfferStep || !selectedContract?.projectId) {
      // isStepFour (brand-new contract) or the zero-existing-contracts
      // skip-through case: there is no project to derive scope from at
      // all — FR-7's fallback applies unconditionally here, not just on
      // a fetch failure below.
      const next = getNextMondayOnOrAfter(new Date())
      setSelectedStartDate(next)
      setFocusedStartDate(next)
      return
    }

    // Checked and returned on BEFORE setIsLoadingStartDateEstimate(true)
    // — same ordering as every other offline pre-flight in this file;
    // flipping the flag first and returning here would pin the skeleton
    // forever with nothing left to clear it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast({
        variant: "destructive",
        description:
          "You appear to be offline. Please check your connection and try again.",
        duration: 5000,
      })
      setStartDateEstimateError("data")
      setIsLoadingStartDateEstimate(false)
      return
    }

    let isActive = true
    setIsLoadingStartDateEstimate(true)
    setStartDateEstimateError(null)

    ProjectAPI.GetProjectDraft(selectedContract.projectId)
      .then((res) => {
        if (!isActive) return
        const projectData = res?.data ?? {}
        const scope = Array.isArray(projectData.scope) ? projectData.scope : []
        const createdAt = projectData.createdAt
          ? new Date(projectData.createdAt)
          : null
        const estimate = computeEstimatedStartDate(
          createdAt,
          scope[0]?.startDay
        )
        setSelectedStartDate(estimate)
        setFocusedStartDate(estimate)
      })
      .catch((error) => {
        if (!isActive) return

        if (error?.response?.status === 401) {
          if (!sessionExpiredRedirecting) {
            sessionExpiredRedirecting = true
            const returnTo = `${window.location.pathname}${window.location.search}`
            window.location.href = `/sign-in?redirect=${encodeURIComponent(returnTo)}&sessionExpired=1`
          }
          return
        }

        // FR-9: inline error + retry, not a silent fallback to
        // next-Monday — a genuine fetch failure is a different, worse
        // signal than "scope legitimately doesn't exist" and must say so.
        setStartDateEstimateError("data")
      })
      .finally(() => {
        if (isActive) setIsLoadingStartDateEstimate(false)
      })

    return () => {
      isActive = false
    }
  }, [
    isOfferDetailsStep,
    isExistingContractOfferStep,
    selectedContract?.projectId,
    startDateRetryToken,
  ])

  const tryConfirmCustomSchedule = (hours: string, frequency: string) => {
    const parsedHours = Number(hours)
    if (
      hours.trim() !== "" &&
      Number.isFinite(parsedHours) &&
      parsedHours > 0 &&
      parsedHours <= CUSTOM_HOURS_MAX[frequency] &&
      frequency
    ) {
      setSchedule("custom")
      setCustomScheduleOpen(false)
    }
  }

  React.useEffect(() => {
    if (open) resetFlow()
  }, [open, resetFlow])

  // T2-3: real "existing contracts" data. Edit mode never runs this — it
  // has its own static placeholder and must stay decoupled (see
  // EDIT_MODE_PLACEHOLDER_CONTRACT). Parallel per-group hydration via
  // Promise.allSettled (spec #5): each group's project fetch is
  // independent, and one failing (spec #4) must not fail the batch — a
  // rejected row degrades to buildFallbackContractRow instead of blanking
  // the whole list.
  React.useEffect(() => {
    if (!open || isEditMode) return

    // T2-5: checked and returned on BEFORE setIsLoadingGroups(true), same
    // order as the talent fetch's own offline check above — flipping the
    // flag first and returning here would pin the skeleton forever with
    // nothing left to clear it, since no promise chain starts on this
    // path. groupsFetchError is also set here (not just the toast): the
    // pre-flight return leaves existingContracts empty, which without this
    // would mis-route past the contract list exactly like an unhandled
    // fetch failure would. isLoadingGroups is explicitly set false too —
    // it defaults true (and resetFlow's own open-effect re-asserts true
    // right before this effect runs), and the render chain checks
    // isLoadingGroups before groupsFetchError, so leaving it true here
    // would pin the skeleton forever instead of showing the inline error.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast({
        variant: "destructive",
        description:
          "You appear to be offline. Please check your connection and try again.",
        // Same call as the talent fetch's offline toast above — doc 08
        // §2/§11 want 5s, the Provider defaults to 3000 (toaster.tsx:18).
        duration: 5000,
      })
      setGroupsFetchError("data")
      setIsLoadingGroups(false)
      return
    }

    let isActive = true
    setIsLoadingGroups(true)
    setGroupsFetchError(null)

    getMyContractGroups()
      .then(async (groups) => {
        // T2-17: one shared per-modal-open resolution, deduped by
        // talentId — not one lookup per group. The same talent can be a
        // member of several groups in this list (e.g. one talent pending
        // in three separate groups); a per-group lookup would re-fetch
        // that same user N times. Built once, before hydrating any row,
        // so every row — hydrated or fallback — reads from the same
        // resolved map. This also means the skeleton holds until talent
        // resolution finishes too, not just group hydration: both are
        // inside this same isLoadingGroups-gated promise chain, so
        // avatars never pop in after the row already rendered.
        const uniqueTalentIds = Array.from(
          new Set(
            groups.flatMap((group) =>
              group.members.map((member) => member.talentId)
            )
          )
        )
        const talentResults = await Promise.allSettled(
          uniqueTalentIds.map((talentId) => UserAPI.getProfile(talentId))
        )
        const talentMap = new Map<string, ResolvedTalent>()
        talentResults.forEach((result, index) => {
          // A rejected lookup (talent deleted, network hiccup, or a
          // talentId with no backing user at all) just leaves that
          // talentId out of the map — buildAvatarsFromTalentMap already
          // treats "not in the map" as unresolved, and
          // renderAvatarFallbackContent turns that into the silhouette,
          // not a crash and not a "?".
          if (result.status !== "fulfilled") return
          const profile = result.value?.data
          if (!profile) return
          talentMap.set(uniqueTalentIds[index], {
            avatarUrl: profile.avatarUrl || undefined,
            name: profile.firstName || profile.username || undefined,
          })
        })

        const settled = await Promise.allSettled(
          groups.map((group) => hydrateContractRow(group, talentMap))
        )
        if (!isActive) return
        setExistingContracts(
          settled.map((result, index) =>
            result.status === "fulfilled"
              ? result.value
              : buildFallbackContractRow(groups[index], talentMap)
          )
        )
      })
      .catch((error) => {
        if (!isActive) return

        if (error?.response?.status === 401) {
          // Reachable here, unlike the talent fetch's @Public() endpoint —
          // /contracts/groups/mine requires req.user.sub. AxiosRequest
          // already attempted one silent refresh+retry before this catch
          // ever sees it, so this means that refresh also failed. Same
          // module-level guard as the talent fetch above — one flag, so a
          // concurrent 401 from both fetches still only redirects once.
          if (!sessionExpiredRedirecting) {
            sessionExpiredRedirecting = true
            const returnTo = `${window.location.pathname}${window.location.search}`
            window.location.href = `/sign-in?redirect=${encodeURIComponent(returnTo)}&sessionExpired=1`
          }
          return
        }

        // FR-10/ERR-004: inline error with Retry, not a silent empty list —
        // hasExistingContracts already accounts for groupsFetchError above.
        setGroupsFetchError("data")
      })
      .finally(() => {
        if (isActive) setIsLoadingGroups(false)
      })

    return () => {
      isActive = false
    }
  }, [open, isEditMode, groupsRetryToken])

  // FR-4/AC-5.2: 200ms debounce. Same cleanup handles both cases — clears
  // the previous timer on every keystroke (a new one is scheduled below),
  // and clears it on unmount since React runs the last cleanup then too.
  React.useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(timeoutId)
  }, [search])

  // Belt-and-suspenders on top of resetFlow's close/reopen coverage: if
  // OfferDialog itself unmounts without ever going through onOpenChange
  // (e.g. the parent page navigates away), this still cancels a pending
  // commit rather than leaving a stray timeout to fire against nothing.
  React.useEffect(() => {
    return () => clearScheduleCommitTimeout()
  }, [clearScheduleCommitTimeout])

  React.useEffect(() => {
    if (!open || !profile?.username) return

    // Checked, and returned on, BEFORE setIsFetchingTalent(true) — and with
    // no isActive/cleanup needed, because nothing async has started yet.
    // Flipping the flag first and early-returning here would pin the
    // skeleton forever with nothing left to clear it: the exact bug this
    // effect's own .finally exists to prevent, reopened through a new door.
    // ERR-025: offline is a toast, never the inline error state.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast({
        variant: "destructive",
        description:
          "You appear to be offline. Please check your connection and try again.",
        // Doc 08 §2/§11 want 5s; the Provider defaults to 3000
        // (toaster.tsx:18). Root's own `duration` prop overrides the
        // Provider per-toast — a call-site override, not a shared-file edit.
        duration: 5000,
      })
      return
    }

    let isActive = true
    setIsFetchingTalent(true)
    setFetchError(null)

    UserAPI.getByUsername(profile.username)
      .then((res: { data?: UserProfile }) => {
        if (isActive && res?.data) setFetchedProfile(res.data)
      })
      .catch((error) => {
        if (!isActive) return

        if (error?.response?.status === 401) {
          // Structurally unreachable through this endpoint today —
          // getUserByUsername is @Public() at both the gateway and
          // user-service, neither can produce a 401 for it — but built to
          // match ERR-026 in case that ever changes, and because this
          // branch mirrors the shape every other authenticated call in
          // the app already hits against the same interceptor.
          if (!sessionExpiredRedirecting) {
            sessionExpiredRedirecting = true
            const returnTo = `${window.location.pathname}${window.location.search}`
            window.location.href = `/sign-in?redirect=${encodeURIComponent(returnTo)}&sessionExpired=1`
          }
          return
        }

        // ERR-005 covers "5xx OR network failure" in one bucket, and doc
        // 08 has no row for a 404 at all — so a bad identifier (e.g.
        // confirmation/page.tsx:360 handing this fetch an id-shaped slug
        // like user_550c209b against a username endpoint) lands here too,
        // by elimination, not by spec. Retry can't fix a wrong identifier,
        // but the ticket gives no other copy to show instead.
        setFetchError("data")
      })
      .finally(() => {
        if (isActive) setIsFetchingTalent(false)
      })

    return () => {
      isActive = false
    }
  }, [open, profile?.username, retryToken])

  // FR-11: audit entry when the Hire Me flow is initiated. Create mode only
  // — reopening an existing offer (checkout confirmation's Edit Offer) isn't
  // initiating a hire flow, and that seed has no `id` at all (only
  // username/firstName/avatarUrl/location/experience), so a resolved
  // talentId is required too: a missing id is a no-op, not a 400 swallowed
  // forever by the catch below. Deliberately separate from the self-fetch
  // effect above — that one's deps include `retryToken` and re-runs on
  // every ERR-005 retry, which isn't a new flow initiation.
  React.useEffect(() => {
    if (!open) {
      hireInitiatedFiredRef.current = false
      return
    }
    if (mode !== "create") return
    if (hireInitiatedFiredRef.current) return

    const talentId = fetchedProfile?.id || profile?.id
    if (!talentId) return

    hireInitiatedFiredRef.current = true
    logHireFlowInitiated(talentId).catch(() => {})
  }, [open, mode, fetchedProfile, profile?.id])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetFlow()
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent
        accessibilityTitle="Hire Me"
        className={`flex ${dialogContentClass} max-w-[520px] flex-col overflow-hidden rounded-[12px] p-0 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.2)]`}
        // AC-3.2: only the X button or a CTA may dismiss. Deliberately
        // onPointerDownOutside, not onInteractOutside — the AC is about
        // clicks, not focus moving outside, and blocking focus-outside
        // too risks fighting the frequency Select's own portaled focus
        // handling. Escape is left untouched; see T1-7 checklist notes.
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div
          className={`relative flex ${dialogBodyClass} flex-1 flex-col overflow-hidden`}
        >
          <div className="shrink-0 flex h-[52px] items-center justify-between border-b border-gray-200 px-3 py-2 pl-3">
            {isEditMode ? (
              <DialogTitle className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                Edit Offer
              </DialogTitle>
            ) : (isStepThree || isStepFour) && hasExistingContracts ? (
              // T1-10: with no existing contracts, select-contract is
              // skipped entirely (isStepTwo can't be true), so Back's only
              // job — clearing selectedContractId/creatingContract to
              // return to that list — has nothing to return to. Both are
              // already null/false here; rendering it would be a clickable
              // no-op. The X button remains the exit, per AC-3.1.
              <Button
                variant="link"
                visual="gray"
                className="px-0 text-[16px] font-medium leading-normal text-dark-blue-400"
                onClick={() => {
                  setSelectedContractId(null)
                  setCreatingContract(false)
                }}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            ) : (
              <DialogTitle className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                Hire Me
              </DialogTitle>
            )}

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="sm">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={modalScrollViewportRef}
              className="max-h-[calc(100dvh-76px)] overflow-y-auto px-6 pb-6 pt-5 scrollbar-none"
              onScroll={syncModalScrollThumb}
            >
            <motion.div layout transition={screenTransition}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${mode}-${currentScreen}`}
                  layout
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={screenTransition}
                  className="will-change-transform"
                >
                  {offerSent ? (
                    <div className="flex flex-col items-center pb-2 pt-2 text-center">
                      <div className="inline-flex items-center justify-center text-primary-500">
                        <NextImage
                          src="/hire-me-sent-02.svg"
                          alt="Offer sent"
                          width={67}
                          height={67}
                          className="size-[67px]"
                        />
                      </div>

                      <h2 className="mt-7 text-[16px] font-semibold leading-normal text-dark-blue-400">
                        Offer Sent!
                      </h2>

                      <p className="mt-6 text-[14px] font-light leading-normal text-dark-blue-400">
                        <span className="font-semibold">{displayName}</span> has
                        been invited to a {scheduleLabel} contract
                      </p>

                      <Avatar
                        className={cn(
                          "mt-8 size-[64px]",
                          staticAvatarClassName
                        )}
                      >
                        <AvatarImage
                          src={avatarUrl}
                          alt={displayName}
                        />
                        <AvatarFallback
                          className={staticAvatarFallbackClassName}
                        >
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <span className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium leading-normal text-gray-500">
                        Pending Invite
                      </span>

                      <h3 className="mt-8 text-[16px] font-semibold leading-normal text-dark-blue-400">
                        What would you like to do next?
                      </h3>

                      <div className="mt-5 flex w-full items-center justify-center gap-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          onClick={() => {
                            // FR-13/AC-20.1: this used to be
                            // setOfferSent(false), reopening the draft form.
                            // AC-20.1 says "review the SENT offer details" —
                            // the draft form is what's being edited, not
                            // what was sent. The checkout confirmation
                            // page's own heading ("Please confirm your offer
                            // details below") is what actually reviews the
                            // submitted offer, and it's also the only entry
                            // point into the Stripe flow anywhere in the app
                            // (see the T4-B report) — this redirect used to
                            // fire unconditionally on success; now it only
                            // fires from here, so it can't be skipped.
                            onOpenChange(false)
                            router.push(
                              `/talent-checkout/${checkoutSlug}?${buildCheckoutSearchParams().toString()}`
                            )
                          }}
                        >
                          Review Your Offer
                        </Button>
                        <Button
                          onClick={() => {
                            onOpenChange(false)
                            router.push("/find-jobs")
                          }}
                        >
                          Continue Browsing
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isEditMode ? (
                        isFetchingTalent && !fetchedProfile && !fetchError ? (
                          <div className="flex items-center gap-4">
                            <Shimmer className="size-[90px] shrink-0 rounded-full" />
                            <div className="min-w-0 flex-auto space-y-2">
                              <Shimmer className="h-4 w-40" />
                              <Shimmer className="h-3 w-32" />
                              <Shimmer className="h-3 w-36" />
                              <Shimmer className="h-3 w-28" />
                            </div>
                          </div>
                        ) : fetchError && !fetchedProfile ? (
                          <div className="flex items-center gap-4">
                            <Avatar
                              className={cn(
                                "size-[90px] shrink-0",
                                staticAvatarClassName
                              )}
                            >
                              <AvatarImage
                                src={avatarUrl}
                                alt={displayName}
                              />
                              <AvatarFallback
                                className={staticAvatarFallbackClassName}
                              >
                                {displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="text-[14px] font-light leading-normal text-dark-blue-400">
                                Hire{" "}
                                <span className="font-semibold">
                                  {headerName}
                                </span>{" "}
                                for a new contract
                              </p>
                              {/* Data-load failure, not a validation error and not
                                  T1-2's empty-profile case: this is the only place in
                                  the modal an ErrorMessage is paired with a Retry
                                  button, and it only ever shows here, alongside the
                                  avatar/name, never alongside a form field. */}
                              <ErrorMessage className="mt-1">
                                We couldn&apos;t load this talent&apos;s
                                details. Please try again.
                              </ErrorMessage>
                              <Button
                                visual="gray"
                                variant="outlined"
                                className="mt-2"
                                onClick={() => setRetryToken((t) => t + 1)}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <Avatar
                              className={cn(
                                "size-[90px] shrink-0",
                                staticAvatarClassName
                              )}
                            >
                              <AvatarImage
                                src={avatarUrl}
                                alt={displayName}
                              />
                              <AvatarFallback
                                className={staticAvatarFallbackClassName}
                              >
                                {displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="text-[14px] font-light leading-normal text-dark-blue-400">
                                Hire{" "}
                                <span className="font-semibold">
                                  {headerName}
                                </span>{" "}
                                for a new contract
                              </p>
                              {jobTitle && (
                                <p className="text-[12px] font-medium leading-normal text-dark-blue-400">
                                  {jobTitle}
                                </p>
                              )}
                              {experienceLabel && (
                                <p className="mt-0.5 text-[11px] font-light leading-normal text-gray-500">
                                  {experienceLabel}
                                </p>
                              )}
                              {locationLabel && (
                                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-light leading-normal text-gray-500">
                                  <MapPin className="size-3.5 text-dark-blue-400" />
                                  <span>{locationLabel}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ) : null}

                      {isStepTwo ? (
                        <div>
                          <h2 className="mt-6 text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Select From Existing Contracts
                          </h2>

                          <SearchField className="mt-4 w-full">
                            <SearchFieldInput
                              className="pr-[46px]"
                              size="lg"
                              placeholder="Search contracts"
                              value={search}
                              onChange={(event) =>
                                setSearch(event.target.value)
                              }
                            />
                            <SearchFieldButton size="lg">
                              <SearchMd className="size-4 text-gray-400" />
                            </SearchFieldButton>
                          </SearchField>

                          {/* T2-4/T2-5 priority chain: skeleton, then
                          error, then the list (with T2-6/T2-7's own
                          empty-search state nested inside the loaded
                          branch). A failed fetch and a no-match search can
                          otherwise both be true at once — existingContracts
                          stays [] either way — so these must be mutually
                          exclusive if/else, not independent {cond && ...}
                          blocks, or both would render together. */}
                          {isLoadingGroups ? (
                            <div className="mt-3 space-y-2">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between rounded-[8px] border border-gray-200 bg-white px-4 py-3"
                                >
                                  <div className="min-w-0 flex-auto space-y-1.5">
                                    <Shimmer className="h-3.5 w-32" />
                                    <Shimmer className="h-3 w-20" />
                                  </div>
                                  <Shimmer className="size-8 shrink-0 rounded-full" />
                                </div>
                              ))}
                            </div>
                          ) : groupsFetchError ? (
                            <div className="mt-3 text-center">
                              {/* FR-10/ERR-004: same inline copy regardless
                              of whether this came from the offline
                              pre-flight or a real request failure — the
                              toast (when offline) already carries the
                              distinct "why" for 5s; this only needs to say
                              the list didn't load and offer Retry. */}
                              <ErrorMessage className="mt-1">
                                We couldn&apos;t load your contracts. Please
                                try again.
                              </ErrorMessage>
                              <Button
                                visual="gray"
                                variant="outlined"
                                className="mt-2"
                                onClick={() =>
                                  setGroupsRetryToken((t) => t + 1)
                                }
                              >
                                Retry
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="mt-3 space-y-2">
                                  {filteredContracts.map((contract) => (
                                    <button
                                      key={contract.id}
                                      type="button"
                                      className="flex w-full items-center justify-between rounded-[8px] border border-gray-200 bg-white px-4 py-3 text-left"
                                      onClick={() =>
                                        setSelectedContractId(contract.id)
                                      }
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold leading-normal text-dark-blue-400">
                                          {contract.title}
                                        </span>
                                        <span className="block text-[12px] font-light leading-normal text-gray-500">
                                          {contract.subtitle}
                                        </span>
                                        {/* T2-9 built a "Pending" badge here for
                                        FR-8/AC-7.1. Removed: the Figma frame for
                                        this row doesn't show one, and Figma now
                                        outranks the ticket's ACs. Not an
                                        oversight — deliberately absent. */}
                                      </span>

                                      <span className="ml-4 flex items-center gap-3">
                                        <span className="flex items-center -space-x-2">
                                          {/* excess deliberately off — the
                                          manual pill right after this closes is
                                          the +N indicator; AvatarGroup's own
                                          built-in badge would double up with it
                                          otherwise. */}
                                          <AvatarGroup
                                            className="cursor-default"
                                            max={5}
                                            size="sm"
                                          >
                                            {contract.avatars.map((avatar, index) => (
                                              <Avatar
                                                key={`${contract.id}-${index}`}
                                                className={cn(
                                                  "size-8 border-2 border-white",
                                                  staticAvatarClassName
                                                )}
                                              >
                                                <AvatarImage
                                                  src={avatar.url}
                                                  alt={avatar.name || `Member ${index + 1}`}
                                                />
                                                <AvatarFallback
                                                  className={
                                                    staticAvatarFallbackClassName
                                                  }
                                                >
                                                  {renderAvatarFallbackContent(
                                                    avatar.name
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                            ))}
                                          </AvatarGroup>
                                          {contract.extra ? (
                                            <span className="relative z-10 inline-flex size-8 items-center justify-center rounded-full border-2 border-gray-500 bg-white text-sm font-medium leading-none text-gray-500">
                                              {contract.extra}
                                            </span>
                                          ) : null}
                                        </span>
                                        <ArrowRight className="size-4 text-gray-400" />
                                      </span>
                                    </button>
                                  ))}
                              </div>

                              {/* FR-5/AC-5.3, doc 05 EC-008: verbatim copy, not
                              quoted — trimmed only so leading/trailing spaces in
                              the query don't make the rendered string ambiguous. */}
                              {debouncedSearch && filteredContracts.length === 0 ? (
                                <div className="mt-3 text-center">
                                  <p className="text-[13px] font-light leading-normal text-gray-500">
                                    No contracts found for {debouncedSearch.trim()}.
                                  </p>
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    className="mt-1 px-0 text-[12px] font-medium leading-normal text-primary-500"
                                    onClick={() => {
                                      setSearch("")
                                      setDebouncedSearch("")
                                    }}
                                  >
                                    Clear search
                                  </Button>
                                </div>
                              ) : null}
                            </>
                          )}

                          <Button
                            variant="link"
                            visual="gray"
                            className="mx-auto mt-4 flex px-0 text-[14px] font-medium leading-normal text-dark-blue-400"
                            onClick={() => setCreatingContract(true)}
                          >
                            <Plus className="size-4" />
                            Invite me to a new contract
                          </Button>

                          <div className="mt-5 flex items-center gap-4">
                            <span className="h-px flex-1 bg-gray-200" />
                            <span className="text-[14px] font-light leading-normal text-gray-500">
                              Or
                            </span>
                            <span className="h-px flex-1 bg-gray-200" />
                          </div>
                        </div>
                      ) : null}

                      {isStepThree && selectedContract ? (
                        <div className="mt-6">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-[8px] border-2 border-primary-500 bg-white px-4 py-3 text-left"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold leading-normal text-dark-blue-400">
                                {selectedContract?.title}
                              </span>
                              <span className="block text-[12px] font-light leading-normal text-gray-500">
                                {selectedContract?.subtitle}
                              </span>
                            </span>

                            <span className="ml-4 flex items-center gap-3">
                              <span className="flex items-center -space-x-2">
                                {/* excess deliberately off — same reasoning
                                as the list row above. */}
                                <AvatarGroup
                                  className="cursor-default"
                                  max={5}
                                  size="sm"
                                >
                                  {selectedContract?.avatars.map(
                                    (avatar, index) => (
                                      <Avatar
                                        key={`${selectedContract?.id}-${index}`}
                                        className={cn(
                                          "size-8 border-2 border-white",
                                          staticAvatarClassName
                                        )}
                                      >
                                        <AvatarImage
                                          src={avatar.url}
                                          alt={avatar.name || `Member ${index + 1}`}
                                        />
                                        <AvatarFallback
                                          className={
                                            staticAvatarFallbackClassName
                                          }
                                        >
                                          {renderAvatarFallbackContent(
                                            avatar.name
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                    )
                                  )}
                                </AvatarGroup>
                                {selectedContract?.extra ? (
                                  <span className="relative z-10 inline-flex size-8 items-center justify-center rounded-full border-2 border-gray-500 bg-white text-sm font-medium leading-none text-gray-500">
                                    {selectedContract.extra}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>

                          {!isEditMode ? (
                            <Button
                              variant="link"
                              visual="gray"
                              className="ml-auto mt-3 flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                              onClick={() => {
                                setSelectedContractId(null)
                                // ERR-007 recovery path: this button IS "the
                                // client selects a different contract" — the
                                // stale 409 from the abandoned selection
                                // must not carry over to whatever they pick
                                // next.
                                setAddMemberError(null)
                              }}
                            >
                              Change Contract
                            </Button>
                          ) : null}
                        </div>
                      ) : null}

                      {/* AC-13.1 / doc 04 §6: required on the Send Offer
                      screen, which is isStepThree here too, not just
                      isStepFour — see isExistingContractOfferStep above. */}
                      {isStepFour || isExistingContractOfferStep ? (
                        <div className={isStepFour ? "mt-6" : undefined}>
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Contract Title
                          </h2>
                          <Input
                            className="mt-3"
                            placeholder="Enter your contract title"
                            // AC-13.2
                            maxLength={100}
                            value={contractTitle}
                            onChange={(event) =>
                              setContractTitle(event.target.value)
                            }
                          />
                          {contractTitleError ? (
                            <ErrorMessage className="mt-2">
                              {contractTitleError}
                            </ErrorMessage>
                          ) : null}
                        </div>
                      ) : null}

                      {isStepThree || isStepFour ? (
                        <>
                          <div className="mt-7">
                            <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Select Rate
                            </h2>

                            <RadioGroup
                              value={selectedRate}
                              onValueChange={setSelectedRate}
                              className="mt-4"
                            >
                              {offerRates.map((rate) => (
                                <RadioGroupItemSelector
                                  key={rate.value}
                                  value={rate.value}
                                  size="lg"
                                  className="min-h-[52px] justify-between rounded-[8px] px-4 py-3 hover:ring-0 focus:ring-0 data-[state=checked]:border-[2px] data-[state=checked]:ring-0 data-[state=checked]:hover:ring-0 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
                                >
                                  <span className="flex min-w-0 w-full items-center justify-between gap-3">
                                    <span className="min-w-0 text-[13px] font-semibold leading-normal text-dark-blue-400">
                                      {rate.label}
                                    </span>
                                    <span className="ml-auto shrink-0 text-[13px] font-semibold leading-normal text-dark-blue-400">
                                      {rate.price}
                                    </span>
                                  </span>
                                </RadioGroupItemSelector>
                              ))}
                            </RadioGroup>

                            <Button
                              variant="link"
                              visual="gray"
                              className="mt-3 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                              onClick={() => setSelectedRate("custom")}
                            >
                              Custom Rate
                            </Button>
                            {/* FR-4/AC-14.3: selectedRate === "custom" is the
                            same value the RadioGroup above compares against,
                            so a predefined tile click (which sets
                            selectedRate to that tile's own value) closes
                            this row for free — no second boolean to keep in
                            sync, and AC-14.2's "vice versa" falls out of the
                            same comparison. */}
                            {selectedRate === "custom" ? (
                              <div className="mt-3">
                                <Input
                                  autoFocus
                                  className="w-full"
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Enter hourly rate"
                                  value={customRateValue}
                                  onChange={(event) => {
                                    // T4-A: same keystroke-level whole-value
                                    // rejection as customHours (T1-6/T1-12)
                                    // below — reject the candidate outright
                                    // rather than stripping bad characters,
                                    // so the caret never jumps. Decimals ARE
                                    // allowed here unlike customHours — this
                                    // is a dollar rate, not a whole-hours
                                    // count, and cents are a normal input.
                                    const value = event.target.value
                                    if (/^\d*(\.\d{0,2})?$/.test(value)) {
                                      setCustomRateValue(value)
                                    }
                                  }}
                                />
                                {/* No inline "must be greater than zero"
                                message on purpose — Figma doesn't show one
                                on this screen and Figma outranks the ticket
                                (same call already made for custom schedule).
                                An empty or zero value just keeps Send Offer
                                disabled via isCustomRateIncomplete; nothing
                                renders here to say why. The ticket does
                                specify copy for this state — deliberately
                                not built, not an oversight. */}
                              </div>
                            ) : null}
                            {selectedRateError ? (
                              <ErrorMessage className="mt-2">
                                {selectedRateError}
                              </ErrorMessage>
                            ) : null}
                          </div>

                          <div className="mt-7">
                            <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Select Contract Duration
                            </h2>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                              {durations.map((duration) => (
                                <Button
                                  key={duration}
                                  variant="outlined"
                                  visual="gray"
                                  className={
                                    duration === selectedDuration
                                      ? "border-2 border-primary-500 text-primary-500"
                                      : ""
                                  }
                                  onClick={() => setSelectedDuration(duration)}
                                >
                                  {duration}
                                </Button>
                              ))}
                            </div>

                            <Button
                              variant="link"
                              visual="gray"
                              className="mt-3 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                              onClick={() => setSelectedDuration("custom")}
                            >
                              Custom Duration
                            </Button>
                            {/* FR-6/AC-15.3: same "custom" sentinel doubling
                            as the open flag as Custom Rate above — a tile
                            click sets selectedDuration to that tile's own
                            string, which isn't "custom", so this row and the
                            tile highlighting above both fall out of the one
                            comparison (AC-15.2). */}
                            {selectedDuration === "custom" ? (
                              <div className="mt-3 flex gap-3">
                                <Input
                                  autoFocus
                                  className="flex-1"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Enter duration"
                                  value={customDurationValue}
                                  onChange={(event) => {
                                    // Same whole-value keystroke rejection as
                                    // customHours/customRateValue — integers
                                    // only, no fractional months/years.
                                    const value = event.target.value
                                    if (/^\d*$/.test(value)) {
                                      setCustomDurationValue(value)
                                    }
                                  }}
                                />
                                <Select
                                  value={customDurationUnit}
                                  onValueChange={(value) =>
                                    setCustomDurationUnit(
                                      value as "Months" | "Years"
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-[140px] shrink-0 text-left">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Months">
                                      Months
                                    </SelectItem>
                                    <SelectItem value="Years">
                                      Years
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {/* No inline "must be greater than zero"
                                message here either — same Figma-outranks-
                                the-ticket call as Custom Rate above. Empty
                                or zero keeps Send Offer disabled via
                                isCustomDurationIncomplete; nothing renders
                                to explain why. Deliberate, not an oversight. */}
                              </div>
                            ) : null}
                            {selectedDurationError ? (
                              <ErrorMessage className="mt-2">
                                {selectedDurationError}
                              </ErrorMessage>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {currentScreen !== "offer-sent" ? (
                        <div className="mt-7">
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Select Work Schedule
                          </h2>

                          <RadioGroup
                            value={
                              customScheduleOpen
                                ? ""
                                : pendingSchedule || schedule
                            }
                            onValueChange={(value) => {
                              clearScheduleCommitTimeout()
                              setCustomScheduleOpen(false)
                              if (isEditMode) {
                                // No screen to wait for here — selectedContractId
                                // is prefilled, so isStepThree is already true and
                                // stays true regardless of which tile is picked.
                                // Nothing unmounts on commit, so a delay would
                                // only add latency for no benefit.
                                setPendingSchedule("")
                                setSchedule(value)
                                return
                              }
                              setPendingSchedule(value)
                              scheduleCommitTimeoutRef.current = setTimeout(() => {
                                setSchedule(value)
                                setPendingSchedule("")
                                scheduleCommitTimeoutRef.current = null
                              }, 200)
                            }}
                            className="mt-4 grid grid-cols-2 gap-3"
                          >
                            <RadioGroupItemSelector
                              value="part-time"
                              size="lg"
                              className="min-h-[62px] rounded-[8px] px-5 py-[15px] data-[state=checked]:border-[2px]"
                            >
                              <span className="block">
                                <span className="block text-[14px] font-semibold leading-normal text-dark-blue-400">
                                  Part Time
                                </span>
                                <span className="block text-[12px] font-medium leading-normal text-dark-blue-400">
                                  up to 30 hrs/week
                                </span>
                              </span>
                            </RadioGroupItemSelector>

                            <RadioGroupItemSelector
                              value="full-time"
                              size="lg"
                              className="min-h-[62px] rounded-[8px] px-5 py-[15px] data-[state=checked]:border-[2px]"
                            >
                              <span className="block">
                                <span className="block text-[14px] font-semibold leading-normal text-dark-blue-400">
                                  Full Time
                                </span>
                                <span className="block text-[12px] font-medium leading-normal text-dark-blue-400">
                                  over 30 hrs/week
                                </span>
                              </span>
                            </RadioGroupItemSelector>
                          </RadioGroup>

                          {customScheduleOpen ? (
                            <div className="mt-3" ref={customScheduleRowRef}>
                              <div className="flex gap-3">
                                <Input
                                  autoFocus
                                  className="flex-1"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Enter total hours"
                                  value={customHours}
                                  onChange={(event) => {
                                    // Reject the whole keystroke rather than
                                    // stripping invalid characters out — a
                                    // rejected value never differs from the
                                    // last one, so there's no length/shape
                                    // change for the caret to be wrong
                                    // relative to. AC-2.4/EC-004: integers
                                    // only, decimals flagged as an open
                                    // question for the lead, not built.
                                    // T1-12: same rejection, extended with
                                    // the per-frequency max.
                                    const value = event.target.value
                                    if (
                                      /^\d*$/.test(value) &&
                                      Number(value) <=
                                        CUSTOM_HOURS_MAX[customFrequency]
                                    ) {
                                      setCustomHours(value)
                                    }
                                  }}
                                  onBlur={(event) => {
                                    // Same blur-vs-click race T1-5 fixed on
                                    // Cancel: clicking the frequency
                                    // Select's trigger blurs this input
                                    // first. With customFrequency
                                    // defaulting to "week" (truthy), that
                                    // blur alone could already satisfy
                                    // tryConfirmCustomSchedule and advance
                                    // the screen before the user picks a
                                    // new frequency.
                                    //
                                    // containment alone isn't enough: Radix
                                    // renders SelectContent through a Portal
                                    // (select.tsx:43) and moves focus straight
                                    // into the selected option the instant it
                                    // opens, so relatedTarget is never a
                                    // descendant of this row's container —
                                    // it's a role="option" node living near
                                    // document.body. Took two attempts to
                                    // find that; the role check below is why.
                                    const next = event.relatedTarget as Element | null
                                    if (
                                      next &&
                                      (customScheduleRowRef.current?.contains(
                                        next
                                      ) ||
                                        next.closest(
                                          '[role="listbox"], [role="option"]'
                                        ))
                                    ) {
                                      return
                                    }
                                    tryConfirmCustomSchedule(
                                      customHours,
                                      customFrequency
                                    )
                                  }}
                                />
                                <Select
                                  value={customFrequency}
                                  onValueChange={(value) => {
                                    // T1-12: a value valid under the old
                                    // frequency can exceed the new one's max
                                    // with no keystroke to catch it. Clamp
                                    // once here, into a local, so the
                                    // confirm-check below reads the clamped
                                    // number instead of stale closure state.
                                    const max = CUSTOM_HOURS_MAX[value]
                                    const clamped =
                                      Number(customHours) > max
                                        ? String(max)
                                        : customHours
                                    setCustomFrequency(value)
                                    setCustomHours(clamped)
                                    // Only advance when the value survived
                                    // unchanged. If we clamped, keep the row
                                    // open so the corrected number is visible
                                    // before the flow moves on — silently
                                    // substituting a number AND changing
                                    // screens in one click hides the
                                    // correction from the user.
                                    if (clamped === customHours) {
                                      tryConfirmCustomSchedule(clamped, value)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] shrink-0 text-left">
                                    {/* No placeholder: customFrequency
                                    defaults to "week" and is never empty, so
                                    SelectValue's placeholder can never render. */}
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {customScheduleFrequencies.map(
                                      (option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                          // Checkmark removed for this dropdown
                                          // only — SelectItem is shared, so this
                                          // hides its indicator span locally
                                          // rather than editing the shared file.
                                          className="[&>span:first-child]:hidden"
                                        >
                                          {option.label}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : null}

                          <Button
                            variant="link"
                            visual="gray"
                            className="mt-4 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                            onMouseDown={(event) => {
                              if (customScheduleOpen) event.preventDefault()
                            }}
                            onClick={() => {
                              if (customScheduleOpen) {
                                setCustomScheduleOpen(false)
                                setCustomHours("")
                                // Not named in the ticket, but the same "week"
                                // default applies here too — otherwise Cancel
                                // then reopening the row would show a blank
                                // Select now that its placeholder is gone.
                                setCustomFrequency("week")
                              } else {
                                // A tile click may have a commit in flight
                                // (T1-11's 200ms delay). Without cancelling
                                // it here, it would fire while this row is
                                // open, flip currentScreen, and unmount the
                                // row the user just opened out from under
                                // them — the exact T1-5 bug this prevents.
                                clearScheduleCommitTimeout()
                                setPendingSchedule("")
                                setCustomScheduleOpen(true)
                              }
                            }}
                          >
                            {customScheduleOpen ? "Cancel" : "Custom Work Schedule"}
                          </Button>
                        </div>
                      ) : null}

                      {isOfferDetailsStep ? (
                        <div className="mt-7">
                          {/* T3/FR-9: same skeleton -> error+retry -> content
                          priority chain as T2-4/T2-5's contracts list —
                          mutually exclusive states, not independent
                          {cond && ...} blocks. */}
                          {isLoadingStartDateEstimate ? (
                            <div className="space-y-3">
                              <Shimmer className="h-3.5 w-32" />
                              <Shimmer className="h-3 w-full max-w-[280px]" />
                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <Shimmer className="h-9 w-full rounded-[5px]" />
                                <Shimmer className="h-9 w-full rounded-[5px]" />
                              </div>
                            </div>
                          ) : startDateEstimateError ? (
                            <div className="text-center">
                              <ErrorMessage className="mt-1">
                                We couldn&apos;t load the date picker. Please
                                try again.
                              </ErrorMessage>
                              <Button
                                visual="gray"
                                variant="outlined"
                                className="mt-2"
                                onClick={() =>
                                  setStartDateRetryToken((t) => t + 1)
                                }
                              >
                                Retry
                              </Button>
                            </div>
                          ) : (
                            <>
                              {selectedStartDateAction !== "change" ? (
                                <>
                                  <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                                    Confirm Start Date
                                  </h2>
                                  <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                                    Based on the project scope, the
                                    anticipated start date is
                                    <br />
                                    <span className="font-semibold text-dark-blue-400">
                                      {selectedStartDateLabel}
                                    </span>
                                  </p>
                                </>
                              ) : null}
                              <div
                                className={cn(
                                  "grid grid-cols-2 gap-3",
                                  selectedStartDateAction !== "change"
                                    ? "mt-4"
                                    : ""
                                )}
                              >
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className={
                                    selectedStartDateAction === "confirm"
                                      ? "border-2 border-primary-500 text-primary-500"
                                      : ""
                                  }
                                  onClick={() => setConfirmStartDateOpen(true)}
                                >
                                  Confirm Start Date
                                </Button>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className={
                                    selectedStartDateAction === "change"
                                      ? "border-2 border-primary-500 text-primary-500"
                                      : ""
                                  }
                                  onClick={() => {
                                    setSelectedStartDateAction("change")
                                    setStartDateCalendarOpen(true)
                                  }}
                                >
                                  Change Date
                                </Button>
                              </div>
                              {selectedStartDateActionError ? (
                                <ErrorMessage className="mt-2">
                                  {selectedStartDateActionError}
                                </ErrorMessage>
                              ) : null}

                              {selectedStartDateAction === "change" ? (
                                <div className="mt-7">
                                  <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                                    Select A Start Date
                                  </h2>
                                  <Accordion
                                    type="single"
                                    collapsible
                                    value={
                                      startDateCalendarOpen ? "start-date" : ""
                                    }
                                    onValueChange={(value) =>
                                      setStartDateCalendarOpen(
                                        value === "start-date"
                                      )
                                    }
                                  >
                                    <AccordionItem
                                      ref={startDateAccordionRef}
                                      value="start-date"
                                    >
                                      <AccordionTrigger asChild>
                                        <Button
                                          variant="outlined"
                                          visual="gray"
                                          className="mt-3 w-full justify-between"
                                        >
                                          {selectedStartDateLabel}
                                          <ChevronDown className="size-4 text-gray-500 transition-transform group-data-[state=open]/trigger:rotate-180" />
                                        </Button>
                                      </AccordionTrigger>
                                      <DisclosureContent className="shadow-xl">
                                        <div className="relative mt-1">
                                          <span className="absolute left-6 top-5 z-10 flex items-center gap-0.5 text-[14px] font-semibold leading-normal text-dark-blue-400">
                                            {focusedStartDate.getFullYear()}
                                            <ChevronRight className="size-4 text-primary-500" />
                                          </span>
                                          <Calendar
                                        className="w-full shadow-none [&>div]:hidden [&>header]:justify-end [&>header]:gap-2 [&>header>h2]:hidden [&>header_svg]:text-primary-500 [&_table]:!mt-0 [&_table]:w-full [&_th]:relative [&_th]:text-center [&_th]:text-transparent [&_th]:before:absolute [&_th]:before:inset-0 [&_th]:before:flex [&_th]:before:items-center [&_th]:before:justify-center [&_th]:before:text-[11px] [&_th]:before:text-gray-400 [&_th:nth-child(1)]:before:content-['SUN'] [&_th:nth-child(2)]:before:content-['MON'] [&_th:nth-child(3)]:before:content-['TUE'] [&_th:nth-child(4)]:before:content-['WED'] [&_th:nth-child(5)]:before:content-['THU'] [&_th:nth-child(6)]:before:content-['FRI'] [&_th:nth-child(7)]:before:content-['SAT'] [&_td]:text-center [&_[data-outside-month]]:invisible [&_[data-hovered]:not([data-selected])]:!bg-transparent [&_[data-today]:not([data-selected])]:!bg-transparent [&_[data-today]:not([data-selected])]:!text-primary-500 [&_[data-selected]]:!bg-primary-50 [&_[data-selected]]:!text-primary-500"
                                            value={selectedStartDate}
                                            // FR-6/AC-10.3: past dates
                                            // disabled — forwarded to
                                            // AriaCalendar's own minValue,
                                            // which blocks selection, not
                                            // just styles it gray.
                                            minValue={new Date()}
                                            onValueChange={(date) => {
                                              setSelectedStartDate(date)
                                              setFocusedStartDate(date)
                                              setSelectedStartDateAction(
                                                "change"
                                              )
                                              setStartDateCalendarOpen(false)
                                            }}
                                            focusedValue={focusedStartDate}
                                            onFocusedValueChange={
                                              setFocusedStartDate
                                            }
                                          />
                                        </div>
                                      </DisclosureContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                              ) : null}
                            </>
                          )}

                          {!startDateCalendarOpen ? (
                            <div className="mt-7">
                              <div className="flex items-center justify-between gap-3">
                                <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                                  Add a Message
                                </h2>
                                <span className="text-[12px] font-light leading-normal text-gray-500">
                                  Optional
                                </span>
                              </div>
                              <Textarea
                                className="mt-3 min-h-[110px]"
                                placeholder="Write your message"
                                value={message}
                                onChange={(event) =>
                                  setMessage(event.target.value)
                                }
                              />
                            </div>
                          ) : null}

                          <Dialog
                            open={confirmStartDateOpen}
                            onOpenChange={setConfirmStartDateOpen}
                          >
                            <DialogContent className="max-w-[440px] rounded-[12px] p-0">
                              <div className="flex h-[52px] items-center justify-between border-b border-gray-200 px-3 py-2">
                                <DialogTitle className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                                  Confirm Start Date
                                </DialogTitle>
                                <DialogClose asChild>
                                  <IconButton
                                    variant="ghost"
                                    visual="gray"
                                    size="sm"
                                  >
                                    <X className="size-5" />
                                  </IconButton>
                                </DialogClose>
                              </div>

                              <div className="px-6 pb-6 pt-5">
                                <p className="text-[14px] font-light leading-normal text-dark-blue-400">
                                  Start on {selectedStartDateLabel}?
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    onClick={() => {
                                      setConfirmStartDateOpen(false)
                                      setSelectedStartDateAction("change")
                                      setStartDateCalendarOpen(true)
                                    }}
                                  >
                                    Change date
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedStartDateAction("confirm")
                                      setConfirmStartDateOpen(false)
                                    }}
                                  >
                                    {selectedStartDateLabel}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ) : null}

                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
            </div>
            {modalScrollThumb.visible ? (
              <div className="absolute inset-y-0 right-0 w-2.5">
                <div
                  className="absolute right-[1px] w-2 cursor-pointer rounded-lg bg-gray-300"
                  style={{
                    height: modalScrollThumb.height,
                    transform: `translateY(${modalScrollThumb.offset}px)`,
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    const viewport = modalScrollViewportRef.current
                    if (!viewport) return

                    const startY = event.clientY
                    const startScrollTop = viewport.scrollTop
                    const maxScroll =
                      viewport.scrollHeight - viewport.clientHeight
                    const maxThumbOffset =
                      viewport.clientHeight - modalScrollThumb.height

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      if (maxThumbOffset <= 0) return
                      viewport.scrollTop =
                        startScrollTop +
                        ((moveEvent.clientY - startY) / maxThumbOffset) *
                          maxScroll
                    }
                    const handlePointerUp = () => {
                      document.removeEventListener(
                        "pointermove",
                        handlePointerMove
                      )
                      document.removeEventListener(
                        "pointerup",
                        handlePointerUp
                      )
                    }

                    document.addEventListener("pointermove", handlePointerMove)
                    document.addEventListener("pointerup", handlePointerUp)
                  }}
                />
              </div>
            ) : null}
          </div>
          {isOfferDetailsStep && !startDateCalendarOpen && !offerSent ? (
            // FR-13: without !offerSent this footer (live Send Offer button
            // included) would render underneath the Offer Sent screen —
            // nothing else resets schedule/selectedContractId/etc. when
            // offerSent flips true, so isOfferDetailsStep stays true. Never
            // visible before because offerSent was never reachable.
            <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
              {/* ERR-007: inline, not a toast (that's ERR-006 below). The
              Change Contract button above is the recovery path this error
              points at — clicking it already clears addMemberError. */}
              {addMemberError ? (
                <ErrorMessage className="mb-3">
                  This talent is already part of this contract.
                </ErrorMessage>
              ) : null}
              <Button
                className={cn(
                  "w-full",
                  (!isOfferReady || isSubmittingOffer) &&
                    "cursor-not-allowed opacity-50"
                )}
                aria-disabled={!isOfferReady || isSubmittingOffer}
                onClick={async () => {
                  if (!isOfferReady || isSubmittingOffer) {
                    setShowValidationErrors(true)
                    return
                  }

                  setShowValidationErrors(false)

                  // T2-14: only the existing-contract path calls
                  // addContractGroupMember. isStepFour ("Invite me to a new
                  // contract") has no wiring yet — that's POST
                  // /contract-groups, a different endpoint, out of scope
                  // here. Edit mode and the zero-existing-contracts
                  // fallthrough (isExistingContractOfferStep excludes both)
                  // proceed exactly as before this chunk.
                  if (isExistingContractOfferStep && selectedContract) {
                    // Checked and returned on BEFORE setIsSubmittingOffer(true)
                    // — same ordering as every other offline pre-flight in
                    // this file. Nothing async has started, so no cleanup
                    // is needed on this path.
                    if (typeof navigator !== "undefined" && !navigator.onLine) {
                      toast({
                        variant: "destructive",
                        description:
                          "You appear to be offline. Please check your connection and try again.",
                        duration: 5000,
                      })
                      return
                    }

                    if (!hiredTalentId) return

                    setAddMemberError(null)
                    setIsSubmittingOffer(true)
                    try {
                      await addContractGroupMember(selectedContract.id, {
                        talentId: hiredTalentId,
                        title: contractTitle.trim(),
                        // T2-14 report: fabricated for the predefined
                        // tiles — see offerRates' own comment above. Not the
                        // talent's real rate. T4-A: when custom is active
                        // this is the real number the user typed, not a
                        // fabricated tile price.
                        rate:
                          parseFabricatedRateValue(
                            selectedRate,
                            customRateValue
                          ) ?? 0,
                        schedule,
                        // T4-A: selectedDuration holds the literal string
                        // "custom" while that row is open (see the state
                        // declaration) — that sentinel is meaningless to
                        // the backend, so it's resolved into the same shape
                        // as the predefined tiles ("5 Months"). Shared with
                        // the checkout URL and onSaveOffer via
                        // resolvedDuration above, rather than formatted
                        // only here where the other two exits missed it.
                        duration: resolvedDuration,
                      })
                    } catch (error: any) {
                      setIsSubmittingOffer(false)

                      if (error?.response?.status === 401) {
                        // Same module-level guard as the two fetch effects
                        // above — one flag, so a concurrent 401 from any of
                        // them only redirects once.
                        if (!sessionExpiredRedirecting) {
                          sessionExpiredRedirecting = true
                          const returnTo = `${window.location.pathname}${window.location.search}`
                          window.location.href = `/sign-in?redirect=${encodeURIComponent(returnTo)}&sessionExpired=1`
                        }
                        return
                      }

                      if (error?.response?.status === 409) {
                        setAddMemberError("duplicate")
                        return
                      }

                      if (error?.response?.status === 429) {
                        // ERR-009: rate-limited is a different signal from
                        // "something broke" (ERR-006 below), so it gets its
                        // own copy — same toast shape/duration as every
                        // other toast in this file. setIsSubmittingOffer(false)
                        // already ran at the top of this catch block, so the
                        // CTA re-enables and every piece of form state is
                        // untouched — nothing here resets or clears it.
                        toast({
                          variant: "destructive",
                          description:
                            "You're sending too quickly. Please wait a moment and try again.",
                          duration: 5000,
                        })
                        return
                      }

                      // ERR-006: every other failure (5xx, network) is a
                      // toast, not inline — the modal stays open so the
                      // client can just press Send Offer again.
                      toast({
                        variant: "destructive",
                        description:
                          "Couldn't add talent to this contract. Please try again.",
                        duration: 5000,
                      })
                      return
                    }
                    setIsSubmittingOffer(false)

                    // FR-13: a real successful submission — show Offer Sent
                    // instead of closing and redirecting. The dialog stays
                    // open (no onOpenChange(false) here); offerSent flips
                    // currentScreen to "offer-sent" via the ternary above,
                    // and the footer below is now gated on !offerSent so it
                    // doesn't render underneath this screen.
                    onSaveOffer?.({
                      selectedRate,
                      schedule,
                      selectedDuration: resolvedDuration,
                      customRate: resolvedCustomRate,
                    })
                    setOfferSent(true)
                    return
                  }

                  // Reached only when there's no real submission to call
                  // "successful": isStepFour (new-contract path — T2-14,
                  // POST /contract-groups was never wired) and isEditMode
                  // (editing an ALREADY-sent offer, not sending a new one —
                  // "Offer Sent!" copy would be wrong here regardless of
                  // wiring). Both keep exactly today's behaviour; FR-13 only
                  // changes the path above that actually submits something.
                  onSaveOffer?.({
                    selectedRate,
                    schedule,
                    selectedDuration: resolvedDuration,
                    customRate: resolvedCustomRate,
                  })
                  onOpenChange(false)
                  if (!isEditMode) {
                    router.push(
                      `/talent-checkout/${checkoutSlug}?${buildCheckoutSearchParams().toString()}`
                    )
                  }
                }}
              >
                {isSubmittingOffer
                  ? "Sending..."
                  : isEditMode
                    ? "Save Offer"
                    : "Send Offer"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function HireMeButton({ profile, buttonProps }: HireMeButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <OfferDialog
      profile={profile}
      open={open}
      onOpenChange={setOpen}
      mode="create"
      trigger={
        <Button {...buttonProps}>
          <Plus className="size-[15px]" />
          Hire Me
        </Button>
      }
    />
  )
}
