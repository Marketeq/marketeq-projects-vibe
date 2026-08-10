"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  ArrowRight,
  ChevronLeft,
  MapPin,
  Plus,
  SearchMd,
  X,
} from "@blend-metrics/icons"
import { AnimatePresence, motion } from "framer-motion"
import { UserAPI } from "@/service/http/user"
import {
  logHireFlowInitiated,
  getMyContractGroups,
  type ContractGroupSummary,
} from "@/service/http/contracts"
import { ProjectAPI } from "@/service/http/project"
import type { UserProfile } from "@/types/user"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  ErrorMessage,
  IconButton,
  Input,
  RadioGroup,
  RadioGroupItemSelector,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  ScrollArea,
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
  return (
    jobTitles?.find((job: any) => job.isDefault || job.saveAsDefault)?.jobTitle ||
    jobTitles?.[0]?.jobTitle ||
    profile?.role ||
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
}

// T2-3 decision 3: a group can be type service/team/job with no projectId
// — nothing to hydrate for those in this chunk's scope. Also doubles as
// the per-row failure fallback (T2-3 spec #4): if a project group's own
// fetch fails (ensureProjectOwnership throwing, network error, etc.), that
// one row degrades to this rather than the whole list failing.
const buildFallbackContractRow = (group: ContractGroupSummary): ContractRow => {
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
    // No talent name lives on ContractGroupMemberSummaryDto — only
    // contractId/talentId/title/status — so a fallback row genuinely has
    // nothing to compute initials from. Renders "?" via getInitials' own
    // empty-input handling, not a bug in the initials logic itself.
    avatars: group.members.map(() => ({})),
    extra:
      group.members.length > 5
        ? `+${group.members.length - 5}`
        : undefined,
  }
}

// T2-3 accepted trade-off: getProjectDraft hydrates tasks, media and
// questions and runs a per-task pricing calculation — far more than this
// row needs (title, one phase name, member avatars). One call per group
// per modal open is a deliberate interim choice, not a claim that it's
// optimal; a lean batched summary endpoint is the correct fix, raised
// separately.
const hydrateContractRow = async (
  group: ContractGroupSummary
): Promise<ContractRow> => {
  if (!group.projectId) return buildFallbackContractRow(group)

  const res = await ProjectAPI.GetProjectDraft(group.projectId)
  const projectData = res?.data ?? {}
  const scope = Array.isArray(projectData.scope) ? projectData.scope : []
  const team = Array.isArray(projectData.team) ? projectData.team : []

  // Decision 1: members[] (the actually-contracted talents) decide who's
  // in the row — team[] is only an avatarUrl/name lookup by talentId,
  // never the source of who appears. A contracted talent with no match in
  // the project's team list falls back to initials-from-nothing ("?"),
  // same as any other unresolved avatar.
  const avatars = group.members.map((member): ContractRowAvatar => {
    const match = team.find(
      (t: { userId?: string }) => String(t.userId) === String(member.talentId)
    )
    return {
      url: match?.avatarUrl || undefined,
      // hydrateTeam only ever carries firstName, not lastName (see
      // user-profile.client.ts:42-68) — getInitials still degrades
      // correctly on a single word, just to one letter instead of two.
      name: match?.firstName || match?.username || undefined,
    }
  })

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
  }
}

export const offerRates = [
  { value: "logo-design", label: "Logo Design", price: "$45/hr" },
  { value: "web-development", label: "Web Development", price: "$70/hr" },
  { value: "ux-ui-design", label: "UX/UI Design", price: "$85/hr" },
]

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
  const [contractTitle, setContractTitle] = React.useState(
    initialState.contractTitle
  )
  const [message, setMessage] = React.useState(initialState.message)
  const [offerSent, setOfferSent] = React.useState(initialState.offerSent)
  const [showValidationErrors, setShowValidationErrors] = React.useState(false)
  const [customScheduleOpen, setCustomScheduleOpen] = React.useState(false)
  const [customHours, setCustomHours] = React.useState("")
  // "day" | "week" | "month" | "" — "" means no frequency chosen yet.
  // Defaults to "week" per explicit request — not an empty placeholder,
  // and not "day" (Figma's own rest state) — overridden on purpose.
  const [customFrequency, setCustomFrequency] = React.useState("week")
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
  const hasExistingContracts = isLoadingGroups || existingContracts.length > 0
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
  const isOfferReady =
    (isStepThree
      ? Boolean(
          schedule &&
          selectedContractId &&
          selectedRate &&
          selectedDuration &&
          selectedStartDateAction
        )
      : isStepFour
        ? Boolean(
            schedule && contractTitle.trim() && selectedRate && selectedDuration
          )
        : false) && !isCustomScheduleIncomplete
  const contractTitleError =
    showValidationErrors && isStepFour && !contractTitle.trim()
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
    setContractTitle(initialState.contractTitle)
    setMessage(initialState.message)
    setOfferSent(initialState.offerSent)
    setShowValidationErrors(false)
    setCustomScheduleOpen(false)
    setCustomHours("")
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

    let isActive = true
    setIsLoadingGroups(true)

    getMyContractGroups()
      .then(async (groups) => {
        const settled = await Promise.allSettled(
          groups.map(hydrateContractRow)
        )
        if (!isActive) return
        setExistingContracts(
          settled.map((result, index) =>
            result.status === "fulfilled"
              ? result.value
              : buildFallbackContractRow(groups[index])
          )
        )
      })
      .catch(() => {
        // T2-5 owns real error/retry UI for this list. A failed groups
        // fetch degrades to "no contracts" for now — isLoadingGroups still
        // resolves to false via `finally`, so hasExistingContracts ends up
        // correctly false rather than stuck permanently "loading".
        if (isActive) setExistingContracts([])
      })
      .finally(() => {
        if (isActive) setIsLoadingGroups(false)
      })

    return () => {
      isActive = false
    }
  }, [open, isEditMode])

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

          <div
            className={cn(
              "min-h-0 flex-1 px-6 pb-6 pt-5",
              isStepTwo ? "overflow-hidden" : "overflow-y-auto"
            )}
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
                          onClick={() => setOfferSent(false)}
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
                      {!isEditMode &&
                      (currentScreen === "select-schedule" ||
                        currentScreen === "select-contract") ? (
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

                          <ScrollArea viewportClassName="mt-3 max-h-[300px]">
                            <div className="space-y-2 pr-3">
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
                                              {getInitials(avatar.name)}
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
                          </ScrollArea>

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
                        <div>
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
                                          {getInitials(avatar.name)}
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
                              onClick={() => setSelectedContractId(null)}
                            >
                              Change Contract
                            </Button>
                          ) : null}
                        </div>
                      ) : null}

                      {isStepFour ? (
                        <div>
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Contract Title
                          </h2>
                          <Input
                            className="mt-3"
                            placeholder="Enter your contract title"
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
                            >
                              Custom Rate
                            </Button>
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
                            >
                              Custom Duration
                            </Button>
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

                      {isStepThree ? (
                        <div className="mt-7">
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Confirm Start Date
                          </h2>
                          <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                            Based on the project scope, the anticipated start
                            date is
                            <br />
                            <span className="font-semibold text-dark-blue-400">
                              Monday, Jan 30, 2025
                            </span>
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <Button
                              variant="outlined"
                              visual="gray"
                              className={
                                selectedStartDateAction === "confirm"
                                  ? "border-2 border-primary-500 text-primary-500"
                                  : ""
                              }
                              onClick={() =>
                                setSelectedStartDateAction("confirm")
                              }
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
                              onClick={() =>
                                setSelectedStartDateAction("change")
                              }
                            >
                              Change Date
                            </Button>
                          </div>
                          {selectedStartDateActionError ? (
                            <ErrorMessage className="mt-2">
                              {selectedStartDateActionError}
                            </ErrorMessage>
                          ) : null}
                        </div>
                      ) : null}

                      {isOfferDetailsStep ? (
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
                            onChange={(event) => setMessage(event.target.value)}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
          {isOfferDetailsStep ? (
            <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
              <Button
                className={cn(
                  "w-full",
                  !isOfferReady && "cursor-not-allowed opacity-50"
                )}
                aria-disabled={!isOfferReady}
                onClick={() => {
                  if (!isOfferReady) {
                    setShowValidationErrors(true)
                    return
                  }

                  setShowValidationErrors(false)
                  onSaveOffer?.({ selectedRate, schedule, selectedDuration })
                  onOpenChange(false)
                  if (!isEditMode) {
                    const nextSearchParams = new URLSearchParams()
                    nextSearchParams.set("rate", selectedRate)
                    nextSearchParams.set("schedule", schedule)
                    nextSearchParams.set("duration", selectedDuration)
                    router.push(
                      `/talent-checkout/${checkoutSlug}?${nextSearchParams.toString()}`
                    )
                  }
                }}
              >
                {isEditMode ? "Save Offer" : "Send Offer"}
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
