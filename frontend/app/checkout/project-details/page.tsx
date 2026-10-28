"use client"

import * as React from "react"
import { useCheckoutTabLock } from "@/lib/checkout/use-checkout-tab-lock"
import {
  notFound,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { CheckoutAPI, type CheckoutRateEstimate } from "@/service/http/checkout"
import { getTalentNetwork } from "@/service/http/contracts"
import { FavoritesAPI } from "@/service/http/favorites"
import { SearchAPI, type SearchHit } from "@/service/http/search"
import { UserAPI } from "@/service/http/user"
import { talentProfileUrl } from "@/src/lib/listing-urls"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  Edit03,
  Globe,
  Info,
  List,
  Lock,
  MoreHorizontal,
  Plus,
  Repeat01,
  Search,
  Star,
  Trash03,
  TrendUp01,
  User,
  X,
  XCircle,
} from "@blend-metrics/icons"
import { MoneyBag } from "@blend-metrics/icons/marketeq"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import type { UserProfile } from "@/types/user"
import {
  type CheckoutDraftPricing,
  getCheckoutDraftPricing,
} from "@/lib/checkout/draft-pricing"
import {
  type CheckoutDraftGiftCard,
  type CheckoutDraftPromoCode,
  type CheckoutDraftSummary,
  getCheckoutDraftSummary,
  getDraftDateRangeLabel,
  getDraftDurationLabel,
} from "@/lib/checkout/draft-summary"
import {
  type CheckoutDraftTeamRow,
  getCheckoutDraftTeam,
} from "@/lib/checkout/draft-team"
import {
  type CheckoutProjectSummary,
  getCheckoutProjectSummary,
} from "@/lib/checkout/project-summary"
import {
  type CheckoutScopeSummary,
  getCheckoutScopeSummary,
} from "@/lib/checkout/scope-summary"
import {
  type ScopeSyncState,
  createScopeSyncState,
  findDuplicatedPhase,
  syncScopeChanges,
} from "@/lib/checkout/scope-sync"
import {
  GIFT_CARD_ERROR_FALLBACK_MESSAGE,
  getCheckoutValidationMessage,
  getGiftCardErrorMessage,
} from "@/lib/checkout/validation-messages"
import {
  taskWorkingDays,
  workingDaysToCalendarDays,
  workingDaysToWeeks,
} from "@/lib/checkout/working-days"
import { Spinner } from "@/components/ui/spinner/spinner"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import {
  OfferDialog,
  getExperienceLabel,
  offerRates,
} from "@/components/hire-me-button"
import { GiftCard, Logo3 } from "@/components/icons"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import NextImage from "@/components/next-image"
import { CountriesCombobox, getStaticFlagUrl } from "@/components/own-combobox"
import {
  type Phase,
  type PhaseRow,
  ScopeBuilder,
  type TeamMember as ScopeBuilderTeamMember,
  durationToHours,
} from "@/components/scope-builder"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DisclosureContent,
  DisclosureTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  IconButton,
  Input,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScrollArea,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
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
  ToastAction,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@/components/ui"

const UserGroup = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-4 text-primary-500", className)}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12.9837 11.75C13.4521 11.75 13.8246 11.4553 14.159 11.0432C14.8437 10.1996 13.7196 9.5255 13.2908 9.19537C12.855 8.85975 12.3684 8.66963 11.875 8.625M11.25 7.375C12.1129 7.375 12.8125 6.67544 12.8125 5.8125C12.8125 4.94956 12.1129 4.25 11.25 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M2.01623 11.75C1.54791 11.75 1.17542 11.4553 0.840964 11.0432C0.156307 10.1996 1.28042 9.5255 1.70915 9.19537C2.14498 8.85975 2.63161 8.66963 3.125 8.625M3.4375 7.375C2.57456 7.375 1.875 6.67544 1.875 5.8125C1.875 4.94956 2.57456 4.25 3.4375 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M5.05238 9.94401C4.41376 10.3389 2.73936 11.1452 3.75919 12.1541C4.25736 12.647 4.8122 12.9995 5.50976 12.9995H9.49026C10.1878 12.9995 10.7426 12.647 11.2408 12.1541C12.2606 11.1452 10.5863 10.3389 9.94764 9.94401C8.45008 9.01801 6.54989 9.01801 5.05238 9.94401Z"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.68751 5.18799C9.68751 6.39611 8.70814 7.37549 7.50001 7.37549C6.29189 7.37549 5.3125 6.39611 5.3125 5.18799C5.3125 3.97986 6.29189 3.00049 7.50001 3.00049C8.70814 3.00049 9.68751 3.97986 9.68751 5.18799Z"
      stroke="currentColor"
      strokeWidth={0.9375}
    />
  </svg>
)

const EXPERIENCE_OPTIONS: {
  value: string
  label: string
  icon: React.ReactNode
}[] = [
  { value: "Student", label: "Student (0 - 2 years)", icon: <Network /> },
  { value: "Junior", label: "Junior (2 - 3 years)", icon: <Network1 /> },
  { value: "Mediator", label: "Medior (3 - 5 years)", icon: <Network2 /> },
  { value: "Senior", label: "Senior (5 - 10 years)", icon: <Network3 /> },
  { value: "Guru", label: "Guru (10+ years)", icon: <Network4 /> },
]

const ExperienceCell = ({
  label,
  editable,
  value,
  onValueChange,
  placeholder,
}: {
  label: string
  editable?: boolean
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
}) => {
  if (!editable) {
    return (
      <Badge className={cn(PHASE_CELL_CLASSNAME, "justify-start")}>
        <span className="truncate" title={label}>
          {label}
        </span>
      </Badge>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          PHASE_CELL_CLASSNAME,
          "group inline-flex items-center gap-x-1.5 overflow-hidden border-gray-300 border-dashed bg-gray-100 focus-visible:outline-none"
        )}
      >
        <span className="min-w-0 truncate text-xs leading-[18px] font-medium text-gray-700">
          {value || placeholder || label}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              className="gap-x-2"
              hideIndicator={false}
              value={option.value}
            >
              {option.icon}
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PHASE_CELL_CLASSNAME =
  "h-auto max-w-full min-w-0 shrink bg-white border border-gray-200 rounded-[5px] px-2 py-[5px]"

const PhaseCell = ({
  label,
  editable,
  options,
  value,
  onValueChange,
}: {
  label: string
  editable?: boolean
  options?: string[]
  value?: string
  onValueChange?: (value: string) => void
}) => {
  if (!editable) {
    return (
      <Badge className={cn(PHASE_CELL_CLASSNAME, "justify-start")}>
        <span className="truncate" title={label}>
          {label}
        </span>
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          PHASE_CELL_CLASSNAME,
          "group overflow-hidden inline-flex items-center gap-x-1.5 data-[state=open]:bg-gray-100 hover:bg-gray-100 data-[state=open]:border-gray-300 data-[state=open]:border-dashed hover:border-gray-300 hover:border-dashed focus-visible:outline-none"
        )}
      >
        <span className="min-w-0 truncate text-xs leading-[18px] font-medium text-gray-700">
          {value || label}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {(options ?? []).map((option) => (
            <DropdownMenuRadioItem
              key={option}
              hideIndicator={false}
              value={option}
            >
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const LocationCell = ({
  label,
  editable,
  value,
  onValueChange,
}: {
  label: string
  editable?: boolean
  value?: string
  onValueChange?: (value: string) => void
}) => {
  if (!editable) {
    return (
      <Badge className={cn(PHASE_CELL_CLASSNAME, "justify-start gap-x-1.5")}>
        <img
          className="h-3 w-4 shrink-0 rounded-sm object-cover"
          src={getStaticFlagUrl(getCountryDisplayName(label)) ?? undefined}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
        <span className="truncate" title={getCountryDisplayName(label)}>
          {getCountryDisplayName(label)}
        </span>
      </Badge>
    )
  }

  return (
    <CountriesCombobox
      value={value}
      onValueChange={onValueChange}
      placeholder={label}
      triggerClassName={cn(
        PHASE_CELL_CLASSNAME,
        "group inline-flex items-center gap-x-1.5 overflow-hidden border-gray-300 border-dashed bg-gray-100 focus-visible:outline-none"
      )}
    />
  )
}

type PaymentPlanOption = {
  id: string
  label: string
  value: string
}

type CheckoutTeamMember = {
  id: string
  name: string
  handle: string
  role: string
  phases: string
  phaseEditable?: boolean
  experience: string
  experienceEditable?: boolean
  location: string
  locationEditable?: boolean
  rate: string
  status: "Confirmed" | "Pending Invite" | "Unassigned"
  avatarSrc: string
  source?: "All" | "Favorites" | "Talent Network"
  favorite?: boolean
}

type TeamMemberChangeResponse = {
  version: number
  teamMemberCount: number | null
  durationDays?: number | null
  phases?: { id: string; startDay: number; endDay: number }[]
  deletedTaskIds?: string[]
  updatedTasks?: {
    id: string
    assigneeUserId: string | null
    experienceLevel?: string | null
    location?: string[]
  }[]
  members: CheckoutDraftTeamRow[]
}

const formatOpenRoleRate = (rate: number | null | undefined) =>
  rate === null || rate === undefined ? "N/A" : `$${rate.toFixed(0)}/hr`

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toCheckoutTeamMember = (
  row: CheckoutDraftTeamRow
): CheckoutTeamMember => ({
  id: row.userId as string,
  name: row.name,
  handle: row.username ? `@${row.username}` : "",
  role: row.role || "Team Member",
  phases: row.phase,
  phaseEditable: false,
  experience: row.experience || "",
  experienceEditable: false,
  location: row.location || "",
  locationEditable: false,
  rate: row.rate ? `$${row.rate}/hr` : "",
  status: row.status,
  avatarSrc: row.avatarUrl || "",
})

const CHECKOUT_FAQ_LIST_CLASSNAME = "space-y-[15px]"
const CHECKOUT_FAQ_TRIGGER_CLASSNAME =
  "w-full h-[65px] min-h-0 px-5 py-0 flex items-center gap-x-2 text-lg leading-normal font-semibold flex-auto text-dark-blue-400 data-[state=open]:h-[51px] data-[state=open]:pt-5 data-[state=open]:pb-1"
const CHECKOUT_FAQ_CONTENT_CLASSNAME =
  "data-[state=closed]:animate-none data-[state=open]:animate-none text-base px-5 pb-5 pt-0 leading-[1.5] text-dark-blue-400 font-light"

const getTaskEffortHours = (row: PhaseRow): number | null => {
  if (!row.duration) return null
  const hours = durationToHours(
    Number(row.duration.value),
    row.duration.type,
    row.workSchedule ?? row.assignedMember?.workSchedule,
    row.workSchedule === "custom"
      ? row.estimatedHours
      : row.assignedMember?.customHoursPerWeek
  )
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours) : null
}

const toHourRows = (phases: Phase[]): Phase[] =>
  phases.map((phase) => ({
    ...phase,
    rows: phase.rows?.map((row) => {
      const effortHours = getTaskEffortHours(row)
      return effortHours !== null
        ? {
            ...row,
            duration: {
              value: effortHours,
              type: "hours" as const,
            },
          }
        : row
    }),
  }))

const SCOPE_EDITOR_NEW_TASK_DEFAULTS = {
  experience: "Medior",
  location: "United States",
} as const

const SCOPE_EDITOR_EXPERIENCE_LEVELS = [
  "Student",
  "Junior",
  "Medior",
  "Senior",
  "Guru",
] as const

const TeamMemberStatusTooltip = ({
  children,
  status,
}: {
  children: React.ReactElement
  status: "Confirmed" | "Pending Invite" | "Unassigned"
}) => {
  if (status !== "Pending Invite") return children

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={7}
          size="md"
          className="w-[320px] shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]"
        >
          This user is currently pending, but they can be replaced at any time
          if they don’t accept your invite.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const replacementTeamMembers: CheckoutTeamMember[] = [
  {
    id: "christopher",
    name: "Christopher",
    handle: "@topdesigner241",
    role: "UX Researcher",
    phases: "4 Phases",
    experience: "Junior",
    location: "United States",
    rate: "$500/hr",
    status: "Confirmed",
    avatarSrc: "/man.jpg",
    source: "All",
    favorite: true,
  },
  {
    id: "sofia",
    name: "Sofia",
    handle: "@sofiaproduct",
    role: "Product Designer",
    phases: "4 Phases",
    experience: "Senior",
    location: "United States",
    rate: "$30/hr",
    status: "Confirmed",
    avatarSrc: "/man.jpg",
    source: "Favorites",
    favorite: true,
  },
  {
    id: "daniel",
    name: "Daniel",
    handle: "@danielux",
    role: "UX Researcher",
    phases: "3 Phases",
    experience: "Medior",
    location: "United States",
    rate: "$30/hr",
    status: "Confirmed",
    avatarSrc: "/man.jpg",
    source: "Talent Network",
    favorite: false,
  },
  {
    id: "amara",
    name: "Amara",
    handle: "@amararesearch",
    role: "UX Researcher",
    phases: "2 Phases",
    experience: "Junior",
    location: "United States",
    rate: "$30/hr",
    status: "Confirmed",
    avatarSrc: "/man.jpg",
    source: "Talent Network",
    favorite: false,
  },
]

const phaseOrdinalWords = [
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
  "Eleven",
  "Twelve",
]

// "Phase One", "Phase Two", ... is a generated label for the phase's
// position, not part of the scope data — phase.phaseName (e.g.
// "Reconnaissance") is the separate, real name shown next to it.
const getPhaseOrdinalLabel = (phaseIndex: number): string =>
  `Phase ${phaseOrdinalWords[phaseIndex] ?? phaseIndex + 1}`

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const getTeamMemberStatus = (
  rawStatus: string | null
): CheckoutTeamMember["status"] => {
  if (rawStatus === "Pending Invite" || rawStatus === "Pending") {
    return "Pending Invite"
  }
  if (rawStatus === "Unassigned") return "Unassigned"
  return "Confirmed"
}

const isUnauthorizedError = (error: unknown): boolean =>
  (error as { response?: { status?: number } } | null)?.response?.status === 401

const isAlreadyPaidError = (error: unknown): boolean => {
  const response = (
    error as {
      response?: { status?: number; data?: { code?: string } }
    } | null
  )?.response
  return (
    response?.status === 409 && response.data?.code === "SESSION_ALREADY_PAID"
  )
}

const isStaleDraftError = (error: unknown): boolean => {
  const response = (
    error as {
      response?: { status?: number; data?: { code?: string } }
    } | null
  )?.response
  return (
    response?.status === 409 && response.data?.code !== "SESSION_ALREADY_PAID"
  )
}

const normalizeOpenRolePart = (value?: string | null) =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")

const getOpenRoleKey = (
  roleName?: string | null,
  experienceLevel?: string | null
) =>
  `${normalizeOpenRolePart(roleName)}|${normalizeOpenRolePart(experienceLevel)}`

const getCountryDisplayName = (location?: string | null) => {
  if (!location) return "N/A"
  const segments = location
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
  return segments[segments.length - 1] || location
}

const getShortHandle = (handle?: string | null) => {
  if (!handle) return ""
  const normalizedHandle = handle.startsWith("@") ? handle.slice(1) : handle

  return `@${normalizedHandle.slice(0, 6)}${
    normalizedHandle.length > 6 ? "..." : ""
  }`
}

const getFirstName = (name: string) => name.trim().split(/\s+/)[0] || name

const formatGiftCardCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, "$1-")

const isCompleteGiftCardCode = (value: string) =>
  value.replace(/-/g, "").length === 16

const getGiftCardEnding = (code: string) =>
  `*${code.replace(/-/g, "").slice(-4)}`


const REJECTED_CODE_REASONS: Record<string, string> = {
  expired: "has expired",
  used_up: "has no balance left",
  not_found: "is no longer valid",
}

const REJECTED_PROMO_REASONS: Record<string, string> = {
  ...REJECTED_CODE_REASONS,
  used_up: "can no longer be used",
}

const PROMO_INVALID_MESSAGE =
  "You have entered an invalid promo code. Please try again."

const getApiError = (error: unknown) =>
  (
    error as {
      response?: { data?: { code?: string; message?: string } }
    }
  )?.response?.data

const REPLACEMENT_BROWSE_LIMIT = 20
const REPLACEMENT_SEARCH_FETCH_LIMIT = 5
const REPLACEMENT_SEARCH_SHOWN = 4
const REPLACEMENT_PROFILE_LIMIT = 20

const normalizeHandle = (handle?: string | null): string =>
  handle ? handle.replace(/^@/, "").toLowerCase() : ""

const getExperienceBadgeLabel = (
  experiences?: Array<{ startDate?: string | null; endDate?: string | null }>
) => {
  const startDates = (experiences ?? [])
    .map((experience) => experience.startDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
  if (startDates.length === 0) return "None"

  const earliest = startDates.reduce((a, b) => (a < b ? a : b))
  const years =
    (Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 2) return "Junior"
  if (years < 5) return "Medior"
  return "Senior"
}

const getExperienceLabelFromYears = (years?: number | null): string => {
  if (years == null) return "None"
  if (years < 2) return "Junior"
  if (years < 5) return "Medior"
  return "Senior"
}

const mapProfileToTalentNetworkCandidate = (
  talentId: string,
  profile: UserProfile & {
    rate?: number | string | null
    experiences?: Array<{ startDate?: string | null; endDate?: string | null }>
  }
): CheckoutTeamMember => {
  const name =
    profile?.firstName ||
    (profile?.username ? getFirstName(profile.username) : "Talent")
  const role =
    profile?.recentJobTitle ||
    (Array.isArray(profile?.jobTitles) ? profile.jobTitles[0] : "") ||
    ""
  const rateValue = profile?.rate ?? profile?.rateMin ?? null
  const rate =
    rateValue !== null && rateValue !== undefined && rateValue !== ""
      ? `$${rateValue}/hr`
      : ""

  return {
    id: talentId,
    name,
    handle: profile?.username ? `@${profile.username}` : "",
    role,
    phases: "",
    experience: getExperienceBadgeLabel(profile?.experiences),
    location: profile?.location || "None",
    rate,
    status: "Confirmed",
    avatarSrc: profile?.avatarUrl || "",
    source: "Talent Network",
    favorite: false,
  }
}

const mapSearchHitToAllCandidate = (hit: SearchHit): CheckoutTeamMember => {
  const id = String(hit.objectID ?? hit.id ?? "")
  const username = hit.username ? String(hit.username) : ""

  return {
    id,
    name: hit.name
      ? getFirstName(String(hit.name))
      : hit.full_name
        ? getFirstName(String(hit.full_name))
        : username
          ? getFirstName(username)
          : "Talent",
    handle: username ? `@${username}` : "",
    role: hit.role || hit.job_title || hit.title || "",
    phases: "",
    experience:
      hit.years_of_experience != null
        ? getExperienceLabelFromYears(Number(hit.years_of_experience))
        : hit.experience || "None",
    location: hit.location || hit.country || "None",
    rate: hit.hourly_rate ? `$${hit.hourly_rate}/hr` : "",
    status: "Confirmed",
    avatarSrc: hit.photo || hit.avatar_url || hit.image || "",
    source: "All",
    favorite: false,
  }
}

const renderRate = (rate?: string | null) => {
  // The backend (projects.service.ts resolveTeamMembers) already resolves a
  // missing profile rate through pricing-service before this ever renders —
  // a still-missing rate here means no data was available at all, so show
  // that honestly instead of inventing a number.
  if (!rate || rate === "N/A") {
    return (
      <span className="inline-flex h-5 items-center whitespace-nowrap text-sm font-normal leading-5 text-[#475467]">
        N/A
      </span>
    )
  }
  const [amount, unit = ""] = rate.split("/")

  return (
    <span className="inline-flex h-5 w-[47px] items-center whitespace-nowrap text-sm leading-5">
      <span className="font-semibold text-[#22376B]">{amount}</span>
      {unit ? (
        <span className="font-normal text-[#22376B]">/{unit}</span>
      ) : null}
    </span>
  )
}

function CheckoutPageInner() {
  const { user: currentUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const routeParams = useParams()
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const slugParamName = isTalentCheckout ? "username" : "listingId"
  // PMCM-402/D3: the non-talent flow has no [slug] route segment at all
  // (app/checkout/project-details/page.tsx is a static path, confirmed no
  // sibling [slug] folder under app/checkout/) — params.slug is always
  // undefined there. Only the talent-checkout re-export
  // (app/talent-checkout/[slug]/project-details/page.tsx) has a real
  // dynamic segment. The project/listing flow identifies the listing via
  // the ?listingId= query param instead (what job-details/[slug]/page.tsx
  // and project-details/[slug]/page.tsx's Continue to Checkout both send).
  const slug =
    (routeParams?.slug as string | undefined) ??
    searchParams.get(slugParamName) ??
    ""
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = safeDecodeSlug(slug)
  const safeSlugSegment = encodeURIComponent(decodedSlug)
  const slugQuery = `${slugParamName}=${safeSlugSegment}`
  const fallbackTalentName =
    decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
    "Alex"
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [projectSummary, setProjectSummary] =
    React.useState<CheckoutProjectSummary | null>(null)
  const [draftSummary, setDraftSummary] =
    React.useState<CheckoutDraftSummary | null>(null)
  const [isDraftSummaryLoading, setIsDraftSummaryLoading] =
    React.useState(!isTalentCheckout)
  const [pricing, setPricing] = React.useState<CheckoutDraftPricing | null>(
    null
  )
  const [pricingError, setPricingError] = React.useState(false)
  const [isCostFetching, setIsCostFetching] = React.useState(false)
  const [isCreditsFetching, setIsCreditsFetching] = React.useState(false)
  const [validationCodes, setValidationCodes] = React.useState<string[]>([])
  const [isValidating, setIsValidating] = React.useState(false)
  const [pricingRefreshKey, setPricingRefreshKey] = React.useState(0)
  const refreshPricing = React.useCallback(
    (kind: "cost" | "credits" | "silent" = "cost") => {
      if (kind === "cost") setIsCostFetching(true)
      else if (kind === "credits") setIsCreditsFetching(true)
      setPricingRefreshKey((count) => count + 1)
    },
    []
  )
  const [teamLoadedFor, setTeamLoadedFor] = React.useState<string | null>(null)
  const [teamLoadError, setTeamLoadError] = React.useState(false)
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] =
    React.useState(!isTalentCheckout)
  const [projectSummaryError, setProjectSummaryError] = React.useState(false)
  const [isProjectNotFound, setIsProjectNotFound] = React.useState(false)
  const [isDraftAlreadyPaid, setIsDraftAlreadyPaid] = React.useState(false)
  const [projectSummaryRetryKey, setProjectSummaryRetryKey] = React.useState(0)
  const [scopeSummary, setScopeSummary] =
    React.useState<CheckoutScopeSummary | null>(null)
  const [isScopeSummaryLoading, setIsScopeSummaryLoading] =
    React.useState(false)
  const [isTalentProfileLoading, setIsTalentProfileLoading] =
    React.useState(isTalentCheckout)
  const [selectedRateValue, setSelectedRateValue] = React.useState(
    searchParams.get("rate") || "web-development"
  )
  const [selectedSchedule, setSelectedSchedule] = React.useState(
    searchParams.get("schedule") || "full-time"
  )
  const [selectedDuration, setSelectedDuration] = React.useState(
    searchParams.get("duration") || "Ongoing"
  )
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] =
    React.useState(false)
  const {
    isOtherTabOpen: isOtherCheckoutTabOpen,
    setIsOtherTabOpen: setIsOtherCheckoutTabOpen,
    continueHere: continueCheckoutHere,
  } = useCheckoutTabLock()
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)
  const [checkoutExitDialog, setCheckoutExitDialog] = React.useState<
    "edit-scope" | "add-task" | null
  >(null)
  const [addTaskPhaseId, setAddTaskPhaseId] = React.useState<string | null>(
    null
  )
  const [scopeEditorTaskPhaseIndex, setScopeEditorTaskPhaseIndex] =
    React.useState<number | null>(null)
  const [isScopeEditorOpen, setIsScopeEditorOpen] = React.useState(false)
  const [scopeEditorPhases, setScopeEditorPhases] = React.useState<Phase[]>([])
  const [scopeEditorBudgetPeriod, setScopeEditorBudgetPeriod] =
    React.useState("week")
  const [isScopeEditorDirty, setIsScopeEditorDirty] = React.useState(false)
  const scopeEditorLocationsRef = React.useRef<Record<string, string[]>>({})
  const scopeEditorInitialJsonRef = React.useRef("")
  const scopeEditorLastJsonRef = React.useRef("")
  const scopeEditorHeaderObserverRef = React.useRef<MutationObserver | null>(
    null
  )
  const scopeSummaryRef = React.useRef<CheckoutScopeSummary | null>(null)
  const scopeSyncRef = React.useRef<ScopeSyncState | null>(null)
  const scopeSyncTimerRef = React.useRef<number>(0)
  const scopeSyncChainRef = React.useRef<Promise<void>>(Promise.resolve())
  const scopeSyncNoticeShownRef = React.useRef(false)
  const scopeDuplicateInFlightRef = React.useRef(false)
  const scopeDeferredChangeRef = React.useRef<Phase[] | null>(null)
  const handleScopeEditorChangeRef = React.useRef<(phases: Phase[]) => void>(
    () => {}
  )
  const patchScopeEditorHeader = React.useCallback((node: HTMLElement) => {
    node.querySelectorAll("th").forEach((th) => {
      const text = th.firstChild
      if (
        text?.nodeType === Node.TEXT_NODE &&
        text.nodeValue === "Team Member"
      ) {
        text.nodeValue = "Role"
      }
    })
  }, [])
  const scopeEditorBodyRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scopeEditorHeaderObserverRef.current?.disconnect()
      scopeEditorHeaderObserverRef.current = null
      if (!node) return

      const observer = new MutationObserver(() => patchScopeEditorHeader(node))
      observer.observe(node, {
        childList: true,
        subtree: true,
        characterData: true,
      })
      scopeEditorHeaderObserverRef.current = observer
      queueMicrotask(() => patchScopeEditorHeader(node))
    },
    [patchScopeEditorHeader]
  )
  const [legalDialog, setLegalDialog] = React.useState<
    "terms" | "privacy" | null
  >(null)
  const [isRedeemCodeDialogOpen, setIsRedeemCodeDialogOpen] =
    React.useState(false)
  const [redeemCodeTab, setRedeemCodeTab] = React.useState<
    "gift-card" | "promo-code"
  >("gift-card")
  const [giftCardCode, setGiftCardCode] = React.useState("")
  const [giftCardMessage, setGiftCardMessage] = React.useState(
    GIFT_CARD_ERROR_FALLBACK_MESSAGE
  )
  const [duplicateGiftCard, setDuplicateGiftCard] = React.useState("")
  const [giftCardStatus, setGiftCardStatus] = React.useState<
    "idle" | "applying" | "invalid"
  >("idle")
  const [giftCardLockedUntil, setGiftCardLockedUntil] = React.useState<
    number | null
  >(null)
  const [promoCode, setPromoCode] = React.useState("")
  const [promoCodeStatus, setPromoCodeStatus] = React.useState<
    "idle" | "applying" | "invalid" | "applied" | "removed"
  >("idle")
  const [promoCodeMessage, setPromoCodeMessage] = React.useState(
    PROMO_INVALID_MESSAGE
  )
  const [promoCodeNotice, setPromoCodeNotice] = React.useState("")
  const [lastRemovedPromoCode, setLastRemovedPromoCode] = React.useState("")
  const promoRequestIdRef = React.useRef(0)
  const [appliedGiftCards, setAppliedGiftCards] = React.useState<
    Array<{ code: string; amount: number }>
  >([])
  const [lastAppliedGiftCardCode, setLastAppliedGiftCardCode] =
    React.useState("")
  const [showAllGiftCards, setShowAllGiftCards] = React.useState(false)
  const [giftCardRemoval, setGiftCardRemoval] = React.useState<{
    code: string
    amount: number
  } | null>(null)
  const [isGiftCardRemovalOpen, setIsGiftCardRemovalOpen] =
    React.useState(false)
  const [appliedPromoAmount, setAppliedPromoAmount] = React.useState(50)
  const [appliedPromoText, setAppliedPromoText] = React.useState("")
  const [appliedPromoDiscount, setAppliedPromoDiscount] = React.useState<{
    discountType: "percent" | "fixed"
    discountValue: number
  } | null>(null)
  const codeRequestInFlightRef = React.useRef(false)
  const pendingGiftCardRemovalsRef = React.useRef(new Set<string>())
  const giftCardRemovalQueueRef = React.useRef<Promise<void>>(Promise.resolve())
  const codesHydratedForRef = React.useRef<string | null>(null)
  const [teamMemberDialog, setTeamMemberDialog] = React.useState<{
    action: "replace" | "remove"
    memberId: string
    memberName: string
    memberHandle: string
    memberRole: string
    memberExperience: string
    memberLocation: string
    memberRate: string
    memberAvatarSrc: string
    memberPhases: string
  } | null>(null)
  const [viewProfileMemberId, setViewProfileMemberId] = React.useState<
    string | null
  >(null)
  const [teamMembers, setTeamMembers] = React.useState<CheckoutTeamMember[]>([])
  const viewProfileMember = React.useMemo(
    () =>
      viewProfileMemberId
        ? (teamMembers.find((member) => member.id === viewProfileMemberId) ??
          null)
        : null,
    [teamMembers, viewProfileMemberId]
  )
  const viewProfileUsername = viewProfileMember?.handle
    ? viewProfileMember.handle.replace(/^@/, "")
    : ""
  const [viewProfileCheck, setViewProfileCheck] = React.useState<{
    username: string
    exists: boolean
  } | null>(null)
  const viewProfileStatus: "loading" | "found" | "not-found" =
    !viewProfileUsername
      ? "not-found"
      : viewProfileCheck?.username !== viewProfileUsername
        ? "loading"
        : viewProfileCheck.exists
          ? "found"
          : "not-found"

  React.useEffect(() => {
    if (!viewProfileMemberId || !viewProfileUsername) return

    let isActive = true

    UserAPI.getByUsername(viewProfileUsername)
      .then((response) => {
        if (isActive) {
          setViewProfileCheck({
            username: viewProfileUsername,
            exists: Boolean(response?.data),
          })
        }
      })
      .catch(() => {
        if (isActive) {
          setViewProfileCheck({ username: viewProfileUsername, exists: false })
        }
      })

    return () => {
      isActive = false
    }
  }, [viewProfileMemberId, viewProfileUsername])
  const [openRoleRows, setOpenRoleRows] = React.useState<
    CheckoutDraftTeamRow[]
  >([])
  const [isTeamRefreshing, setIsTeamRefreshing] = React.useState(false)
  const teamRefreshSeqRef = React.useRef(0)
  const unassignedRates = React.useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        openRoleRows
          .filter((row) => row.roleKey)
          .map((row) => [
            `unassigned:${row.roleKey}`,
            formatOpenRoleRate(row.rate),
          ])
      ),
    [openRoleRows]
  )
  const unassignedTeamMembers = React.useMemo<CheckoutTeamMember[]>(
    () =>
      openRoleRows
        .filter((row) => row.roleKey)
        .map((row) => {
          const id = `unassigned:${row.roleKey}`
          return {
            id,
            name: "Unassigned Member",
            handle: "",
            role: row.role || "",
            phases: row.phase,
            phaseEditable: false,
            experience: row.experience || "",
            experienceEditable: true,
            location: row.location || "",
            locationEditable: true,
            rate: unassignedRates[id] ?? "N/A",
            status: "Unassigned" as const,
            avatarSrc: "",
          }
        }),
    [openRoleRows, unassignedRates]
  )
  const [teamNameSortAsc, setTeamNameSortAsc] = React.useState(true)
  const sortedTeamMembers = React.useMemo(
    () =>
      [...teamMembers, ...unassignedTeamMembers].sort((a, b) => {
        const compare = getFirstName(a.name).localeCompare(getFirstName(b.name))
        return teamNameSortAsc ? compare : -compare
      }),
    [teamMembers, unassignedTeamMembers, teamNameSortAsc]
  )
  const [selectedReplacementId, setSelectedReplacementId] = React.useState<
    string | null
  >(null)
  const [replacementFilter, setReplacementFilter] = React.useState<
    "All" | "Favorites" | "Talent Network"
  >("All")
  const [replacementSearch, setReplacementSearch] = React.useState("")
  const [replacementNameSortAsc, setReplacementNameSortAsc] =
    React.useState(true)
  const [isReplacementSearchOpen, setIsReplacementSearchOpen] =
    React.useState(false)
  const [favoriteCandidates, setFavoriteCandidates] = React.useState<
    CheckoutTeamMember[]
  >([])
  const [favoritesLoading, setFavoritesLoading] = React.useState(false)
  const [allCandidates, setAllCandidates] = React.useState<
    CheckoutTeamMember[]
  >([])
  const [allCandidatesLoading, setAllCandidatesLoading] = React.useState(false)
  const [talentNetworkCandidates, setTalentNetworkCandidates] = React.useState<
    CheckoutTeamMember[]
  >([])
  const [talentNetworkLoading, setTalentNetworkLoading] = React.useState(false)

  React.useEffect(() => {
    setSelectedReplacementId(null)
  }, [replacementFilter, replacementSearch])

  React.useEffect(() => {
    if (teamMemberDialog?.action !== "replace") return

    let isActive = true

    const loadFavorites = async () => {
      setFavoritesLoading(true)
      try {
        const groupsResponse = await FavoritesAPI.getFavorites("talent")
        const groups = (groupsResponse?.data ?? []) as Array<{
          favorites: Array<{ id: string; itemId: string }>
        }>
        const favorites = groups
          .flatMap((group) => group.favorites ?? [])
          .slice(0, REPLACEMENT_PROFILE_LIMIT)

        const profiles = await Promise.all(
          favorites.map((favorite) =>
            UserAPI.getProfile(favorite.itemId)
              .then((res) => res?.data)
              .catch(() => null)
          )
        )
        if (!isActive) return

        const mapped = favorites
          .map((favorite, index) => {
            const profile = profiles[index]
            if (!profile) return null

            const name =
              profile.firstName ||
              (profile.username ? getFirstName(profile.username) : "Talent")
            const role =
              profile.recentJobTitle ||
              (Array.isArray(profile.jobTitles) ? profile.jobTitles[0] : "") ||
              ""
            const rateValue = profile.rate ?? profile.rateMin ?? null
            const rate =
              rateValue !== null && rateValue !== undefined && rateValue !== ""
                ? `$${rateValue}/hr`
                : ""
            const experience = getExperienceBadgeLabel(profile.experiences)

            const member: CheckoutTeamMember = {
              id: favorite.itemId,
              name,
              handle: profile.username ? `@${profile.username}` : "",
              role,
              phases: "",
              experience,
              location: profile.location || "None",
              rate,
              status: "Confirmed",
              avatarSrc: profile.avatarUrl || "",
              source: "Favorites",
              favorite: true,
            }
            return member
          })
          .filter((member): member is CheckoutTeamMember => member !== null)

        setFavoriteCandidates(mapped)
      } catch {
        if (isActive) setFavoriteCandidates([])
      } finally {
        if (isActive) setFavoritesLoading(false)
      }
    }

    loadFavorites()

    return () => {
      isActive = false
    }
  }, [teamMemberDialog?.action])

  React.useEffect(() => {
    if (teamMemberDialog?.action !== "replace") return

    let isActive = true
    const query = replacementSearch.trim().replace(/^@/, "")

    const loadAllCandidates = async () => {
      setAllCandidatesLoading(true)
      try {
        const response = await SearchAPI.search({
          q: query,
          category: "talent",
          limit: query
            ? REPLACEMENT_SEARCH_FETCH_LIMIT
            : REPLACEMENT_BROWSE_LIMIT,
        })
        if (!isActive) return

        const data = response?.data
        const hits: SearchHit[] = Array.isArray(data?.hits) ? data.hits : []
        setAllCandidates(hits.map(mapSearchHitToAllCandidate))
      } catch {
        if (isActive) setAllCandidates([])
      } finally {
        if (isActive) setAllCandidatesLoading(false)
      }
    }

    const timeoutId = window.setTimeout(loadAllCandidates, query ? 300 : 0)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [teamMemberDialog?.action, replacementSearch])

  React.useEffect(() => {
    if (teamMemberDialog?.action !== "replace") return

    let isActive = true

    const loadTalentNetwork = async () => {
      setTalentNetworkLoading(true)
      try {
        const network = await getTalentNetwork()
        if (!isActive) return

        const entries = [
          ...(network?.active ?? []),
          ...(network?.pending ?? []),
          ...(network?.past ?? []),
        ].slice(0, REPLACEMENT_PROFILE_LIMIT)

        const profiles = await Promise.all(
          entries.map((entry) =>
            UserAPI.getProfile(entry.talentId)
              .then((res) => res?.data)
              .catch(() => null)
          )
        )
        if (!isActive) return

        const mapped = entries
          .map((entry, index) => {
            const profile = profiles[index]
            if (!profile) return null
            return mapProfileToTalentNetworkCandidate(entry.talentId, profile)
          })
          .filter((member): member is CheckoutTeamMember => member !== null)

        setTalentNetworkCandidates(mapped)
      } catch {
        if (isActive) setTalentNetworkCandidates([])
      } finally {
        if (isActive) setTalentNetworkLoading(false)
      }
    }

    loadTalentNetwork()

    return () => {
      isActive = false
    }
  }, [teamMemberDialog?.action])

  React.useEffect(() => {
    setSelectedRateValue(searchParams.get("rate") || "web-development")
    setSelectedSchedule(searchParams.get("schedule") || "full-time")
    setSelectedDuration(searchParams.get("duration") || "Ongoing")
  }, [searchParams])

  React.useEffect(() => {
    if (!isTalentCheckout) return

    let isActive = true

    const loadTalentProfile = async () => {
      if (isActive) {
        setIsTalentProfileLoading(true)
      }
      try {
        const response = await UserAPI.getByUsername(decodedSlug)
        if (isActive && response?.data) {
          setTalentProfile(response.data)
        }
      } catch {
        if (isActive) {
          setTalentProfile(null)
        }
      } finally {
        if (isActive) {
          setIsTalentProfileLoading(false)
        }
      }
    }

    loadTalentProfile()

    return () => {
      isActive = false
    }
  }, [decodedSlug, isTalentCheckout])

  React.useEffect(() => {
    if (isTalentCheckout) return

    let isActive = true
    setIsProjectSummaryLoading(true)
    setProjectSummaryError(false)
    setIsProjectNotFound(false)

    const loadProjectSummary = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      try {
        const summary = await getCheckoutProjectSummary(
          decodedSlug,
          controller.signal
        )
        if (isActive) {
          setProjectSummary(summary)
          setIsProjectNotFound(summary === null)
        }
      } catch {
        if (isActive) {
          setProjectSummaryError(true)
        }
      } finally {
        clearTimeout(timeoutId)
        if (isActive) {
          setIsProjectSummaryLoading(false)
        }
      }
    }

    loadProjectSummary()

    return () => {
      isActive = false
    }
  }, [decodedSlug, isTalentCheckout, projectSummaryRetryKey])

  React.useEffect(() => {
    if (isTalentCheckout) return
    const listingId = projectSummary?.id
    if (!listingId) return

    let isActive = true
    setIsDraftSummaryLoading(true)

    getCheckoutDraftSummary(listingId)
      .then((summary) => {
        if (isActive) {
          setDraftSummary(summary)
          setIsDraftSummaryLoading(false)
        }
      })
      .catch((error) => {
        if (!isActive) return
        setIsDraftSummaryLoading(false)
        if (isUnauthorizedError(error)) {
          setIsSessionExpiredDialogOpen(true)
          return
        }
        if (isAlreadyPaidError(error)) {
          setIsDraftAlreadyPaid(true)
          return
        }
        setProjectSummaryError(true)
      })

    return () => {
      isActive = false
    }
  }, [isTalentCheckout, projectSummary?.id])

  React.useEffect(() => {
    const draftId = draftSummary?.draftId
    if (!draftId) return

    let isActive = true
    setPricingError(false)
    getCheckoutDraftPricing(draftId).then((result) => {
      if (!isActive) return
      if (result) {
        setPricing(result)
        const lockedUntil = result.giftCardLockedUntil
          ? Date.parse(result.giftCardLockedUntil)
          : NaN
        setGiftCardLockedUntil(
          Number.isFinite(lockedUntil) && lockedUntil > Date.now()
            ? lockedUntil
            : null
        )
      } else setPricingError(true)
      setIsCostFetching(false)
      if (pendingGiftCardRemovalsRef.current.size === 0) {
        setIsCreditsFetching(false)
      }
    })

    return () => {
      isActive = false
    }
  }, [draftSummary?.draftId, pricingRefreshKey])

  React.useEffect(() => {
    const draftId = draftSummary?.draftId
    if (!draftId || !pricing || codesHydratedForRef.current === draftId) return
    codesHydratedForRef.current = draftId

    const { giftCards, promoCode: savedPromo } = pricing
    setAppliedGiftCards(
      giftCards
        .filter((item) => item.status === "valid")
        .map((item) => ({ code: item.code, amount: item.amount }))
    )
    if (savedPromo && savedPromo.status === "valid") {
      setPromoCode(savedPromo.code)
      setAppliedPromoText(savedPromo.code)
      setAppliedPromoAmount(savedPromo.amount)
      setAppliedPromoDiscount({
        discountType: savedPromo.discountType,
        discountValue: savedPromo.discountValue,
      })
      setPromoCodeStatus("applied")
    }

    giftCards
      .filter((item) => REJECTED_CODE_REASONS[item.status])
      .forEach((item) => {
        CheckoutAPI.RemoveDraftCode(draftId, item.code).catch(() => undefined)
        toast({
          variant: "destructive",
          title: `Gift card ending ${getGiftCardEnding(item.code)} ${
            REJECTED_CODE_REASONS[item.status]
          } and was removed.`,
        })
      })
    if (savedPromo && REJECTED_PROMO_REASONS[savedPromo.status]) {
      CheckoutAPI.RemoveDraftCode(draftId, savedPromo.code).catch(
        () => undefined
      )
      toast({
        variant: "destructive",
        title: `Promo code ${savedPromo.code} ${
          REJECTED_PROMO_REASONS[savedPromo.status]
        } and was removed.`,
      })
    }
  }, [draftSummary?.draftId, pricing])

  const refreshTeam = React.useCallback(async (draftId: string) => {
    const seq = ++teamRefreshSeqRef.current
    setIsTeamRefreshing(true)
    const rows = await getCheckoutDraftTeam(draftId)
    if (seq !== teamRefreshSeqRef.current) return
    setTeamLoadError(rows === null)
    if (rows) {
      setTeamMembers(rows.filter((row) => row.userId).map(toCheckoutTeamMember))
      setOpenRoleRows(rows.filter((row) => !row.userId))
    }
    setIsTeamRefreshing(false)
  }, [])

  React.useEffect(() => {
    if (isTalentCheckout) return
    const draftId = draftSummary?.draftId
    if (!draftId) return

    let isActive = true

    getCheckoutDraftTeam(draftId).then((rows) => {
      if (!isActive) return
      setTeamLoadError(rows === null)
      setTeamMembers(
        (rows ?? []).filter((row) => row.userId).map(toCheckoutTeamMember)
      )
      setOpenRoleRows((rows ?? []).filter((row) => !row.userId))
      setTeamLoadedFor(draftId)
    })

    return () => {
      isActive = false
    }
  }, [isTalentCheckout, draftSummary?.draftId])

  React.useEffect(() => {
    if (isTalentCheckout) return
    const draftId = draftSummary?.draftId
    if (!draftId) return

    let isActive = true
    setIsScopeSummaryLoading(true)

    getCheckoutScopeSummary(draftId).then((summary) => {
      if (isActive) {
        scopeSyncRef.current = summary ? createScopeSyncState(summary) : null
        setScopeSummary(summary)
        setIsScopeSummaryLoading(false)
      }
    })

    return () => {
      isActive = false
    }
  }, [isTalentCheckout, draftSummary?.draftId])

  const teamMembersById = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; username: string | null; avatarUrl: string | null }
    >()
    for (const member of teamMembers) {
      map.set(member.id, {
        name: member.name,
        username: member.handle ? member.handle.replace(/^@/, "") : null,
        avatarUrl: member.avatarSrc || null,
      })
    }
    return map
  }, [teamMembers])

  const resolveTaskAssigneeId = (task: {
    assigneeUserId?: string | null
    roleName: string | null
    experienceLevel?: string | null
  }): string | null => task.assigneeUserId || null

  const getTaskAssignee = (task: {
    assigneeUserId?: string | null
    roleName: string | null
    experienceLevel?: string | null
  }) => {
    const assigneeId = resolveTaskAssigneeId(task)
    return (assigneeId && teamMembersById.get(assigneeId)) || null
  }

  const getTaskAssigneeName = (task: {
    assigneeUserId?: string | null
    roleName: string | null
    experienceLevel?: string | null
  }) => {
    const name = getTaskAssignee(task)?.name
    return name ? getFirstName(name) : "Unassigned"
  }

  const getTaskAssigneeHandle = (task: {
    assigneeUserId?: string | null
    roleName: string | null
    experienceLevel?: string | null
  }) => {
    const username = getTaskAssignee(task)?.username
    return username ? `@${username}` : null
  }

  const phaseNamesByAssigneeId = React.useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const phase of scopeSummary?.phases ?? []) {
      if (!phase.phaseName) continue
      for (const task of phase.tasks) {
        const assigneeId = resolveTaskAssigneeId(task)
        if (!assigneeId) continue
        const set = map.get(assigneeId) ?? new Set<string>()
        set.add(phase.phaseName)
        map.set(assigneeId, set)
      }
    }
    return map
  }, [scopeSummary?.phases])

  const getMemberPhaseLabel = (memberId: string) => {
    const phaseNames = phaseNamesByAssigneeId.get(memberId) || null
    if (!phaseNames || phaseNames.size === 0) return "No Phase"
    if (phaseNames.size === 1) return [...phaseNames][0]
    return `${phaseNames.size} Phase`
  }

  const scopePhaseNames = React.useMemo(
    () =>
      Array.from(
        new Set(
          (scopeSummary?.phases ?? [])
            .map((phase) => phase.phaseName)
            .filter(Boolean)
        )
      ),
    [scopeSummary?.phases]
  )

  const phaseDayRanges = React.useMemo(() => {
    let nextStartDay = 1
    return (scopeSummary?.phases ?? []).map((phase) => {
      const taskDays = phase.tasks
        .map((task) =>
          taskWorkingDays(
            task.estimatedHours,
            task.workSchedule,
            task.customHoursPerWeek
          )
        )
        .filter((d) => d > 0)
      const phaseDays =
        phase.tasks.length === 0
          ? 0
          : taskDays.length > 0
            ? Math.max(...taskDays)
            : 1
      const startDay = nextStartDay
      const endDay = phaseDays > 0 ? startDay + phaseDays - 1 : startDay
      nextStartDay = startDay + phaseDays
      return { startDay, endDay, isEmpty: phase.tasks.length === 0 }
    })
  }, [scopeSummary?.phases])

  const talentName = talentProfile?.firstName || fallbackTalentName
  const talentUsername = talentProfile?.username || decodedSlug
  const talentAvatarUrl = talentProfile?.avatarUrl || ""
  const talentExperienceLabel = getExperienceLabel(talentProfile)
  const isCheckoutCardLoading =
    isProjectSummaryLoading ||
    (isDraftSummaryLoading && Boolean(projectSummary?.id))
  const isTeamTabLoading =
    isProjectSummaryLoading ||
    isDraftSummaryLoading ||
    (Boolean(draftSummary?.draftId) && teamLoadedFor !== draftSummary?.draftId)
  const checkoutProjectTitle = draftSummary
    ? draftSummary.title || "Project Title Unavailable"
    : projectSummary?.title || "Project Title Unavailable"
  const checkoutProjectImage = draftSummary
    ? draftSummary.mediaUrl || ""
    : projectSummary?.mediaUrl || ""
  const checkoutProjectTeamCount = draftSummary
    ? teamLoadedFor === draftSummary.draftId && !teamLoadError
      ? new Set(teamMembers.map((member) => member.id)).size
      : null
    : (projectSummary?.teamMemberCount ?? null)
  const checkoutProjectTeamLabel =
    checkoutProjectTeamCount !== null
      ? `${checkoutProjectTeamCount} team member${checkoutProjectTeamCount === 1 ? "" : "s"}`
      : "Team Details Unavailable"
  const isCheckoutScopeEmpty =
    !isScopeSummaryLoading && scopeSummary?.phases.length === 0
  const checkoutDurationDays = isCheckoutScopeEmpty
    ? 0
    : draftSummary?.durationDays
  const checkoutProjectDateRange = isCheckoutScopeEmpty
    ? "Timeline Unavailable"
    : draftSummary
      ? getDraftDateRangeLabel(checkoutDurationDays ?? null) ||
        "Timeline Unavailable"
      : projectSummary?.dateRangeLabel || "Timeline Unavailable"
  const checkoutProjectDuration =
    isCheckoutScopeEmpty || checkoutDurationDays === 0
      ? "0 Weeks"
      : draftSummary
        ? getDraftDurationLabel(checkoutDurationDays ?? null)
        : projectSummary?.durationLabel || null

  React.useEffect(() => {
    if (isTalentCheckout || isProjectSummaryLoading || !projectSummary) return
    if (projectSummary.teamMemberCount === null) {
      console.error("Checkout: team member count missing", {
        listingId: projectSummary.id,
      })
    }
    if (!projectSummary.durationLabel) {
      console.error("Checkout: project duration missing", {
        listingId: projectSummary.id,
      })
    }
  }, [isTalentCheckout, isProjectSummaryLoading, projectSummary])
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  // A custom rate has no offerRates tile to resolve against, so selectedRate
  // above falls through to the web-development tile for it — the real number
  // travels as its own param instead and wins here. Guarded on > 0 so an
  // absent or malformed customRate falls back to the tile price rather than
  // pricing the whole offer at $0.
  const customRateParam = Number(searchParams.get("customRate"))
  const hourlyRate =
    Number.isFinite(customRateParam) && customRateParam > 0
      ? customRateParam
      : Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
  const estimatedTax = hourlyRate * 0.07
  const totalHourlyRate = hourlyRate + estimatedTax
  const estimatedWeeklyCost = totalHourlyRate * 40
  const baseDueToday = estimatedWeeklyCost * 2
  const isOngoingTalentContract =
    isTalentCheckout && selectedDuration === "Ongoing"
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  )
  const scheduleLabel =
    selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail =
    selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
  const formattedEstimatedTax = `$${estimatedTax.toFixed(2)}/hr`
  const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
  const formattedWeeklyCost = `$${Math.round(estimatedWeeklyCost).toLocaleString()}/wk`

  const scopeEditorMetrics = React.useMemo(() => {
    const phases = scopeSummary?.phases ?? []
    let totalDays = 0
    for (const phase of phases) {
      const taskDays = phase.tasks
        .map((task) =>
          taskWorkingDays(
            task.estimatedHours,
            task.workSchedule,
            task.customHoursPerWeek
          )
        )
        .filter((days) => days > 0)
      if (taskDays.length > 0) totalDays += Math.max(...taskDays)
    }
    const totalWeeks = workingDaysToWeeks(totalDays)
    const durationLabel =
      totalDays > 0
        ? `${totalWeeks} Week${totalWeeks !== 1 ? "s" : ""}`
        : "0 Weeks"

    const parseHourlyRate = (value?: string) => {
      const rate = Number.parseFloat((value ?? "").replace(/[^0-9.]/g, ""))
      return Number.isFinite(rate) && rate > 0 ? rate : null
    }
    const memberRates = new Map(
      teamMembers.map((member) => [member.id, parseHourlyRate(member.rate)])
    )
    let budgetUsd = 0
    let isBudgetComplete = true
    for (const phase of phases) {
      for (const task of phase.tasks) {
        const hrs = Number(task.estimatedHours) || 0
        if (hrs <= 0) continue
        const rate = task.assigneeUserId
          ? (memberRates.get(task.assigneeUserId) ?? null)
          : parseHourlyRate(
              unassignedRates[
                `unassigned:${getOpenRoleKey(task.roleName, task.experienceLevel)}`
              ]
            )
        if (rate === null) {
          isBudgetComplete = false
          continue
        }
        budgetUsd += hrs * rate
      }
    }
    return {
      totalDays,
      durationLabel,
      budgetUsd,
      isBudgetComplete,
      hasScope: phases.length > 0,
    }
  }, [scopeSummary?.phases, teamMembers, unassignedRates])

  const projectCheckoutEstimatedTax = 0
  const isDraftPriced = Boolean(draftSummary?.draftId)
  const isProjectCostLoading =
    isProjectSummaryLoading ||
    isDraftSummaryLoading ||
    isCostFetching ||
    (isDraftPriced && !pricing && !pricingError)
  const isPriceLoading = isProjectCostLoading || isCreditsFetching
  const projectCheckoutCost = isDraftPriced
    ? (pricing?.projectCost ?? null)
    : scopeEditorMetrics.hasScope && scopeEditorMetrics.isBudgetComplete
      ? scopeEditorMetrics.budgetUsd
      : (projectSummary?.projectCost ?? null)
  const centsFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  )
  const formattedProjectCheckoutCost =
    projectCheckoutCost !== null
      ? formatter.format(projectCheckoutCost)
      : "Pricing unavailable"
  const formattedProjectCardCost =
    projectCheckoutCost !== null
      ? formatter.format(projectCheckoutCost)
      : "Pricing unavailable"
  const formattedProjectCheckoutTax = centsFormatter.format(
    projectCheckoutEstimatedTax
  )
  const totalGiftCardAmount = appliedGiftCards.reduce(
    (total, giftCard) => total + giftCard.amount,
    0
  )
  const projectCheckoutAmountBeforeCredits =
    projectCheckoutCost !== null
      ? projectCheckoutCost + projectCheckoutEstimatedTax
      : null
  const appliedGiftCardAmount = Math.min(
    projectCheckoutAmountBeforeCredits ?? Number.POSITIVE_INFINITY,
    totalGiftCardAmount
  )
  const appliedPromoCodeAmount =
    appliedPromoText !== ""
      ? Math.min(
          appliedPromoAmount,
          projectCheckoutAmountBeforeCredits !== null
            ? Math.max(
                0,
                projectCheckoutAmountBeforeCredits - appliedGiftCardAmount
              )
            : Number.POSITIVE_INFINITY
        )
      : 0
  const totalAppliedCreditAmount =
    appliedGiftCardAmount + appliedPromoCodeAmount

  const setSavedGiftCards = (giftCards: CheckoutDraftGiftCard[]) => {
    setAppliedGiftCards(
      giftCards
        .filter(
          (item) =>
            item.status === "valid" &&
            !pendingGiftCardRemovalsRef.current.has(item.code)
        )
        .map((item) => ({ code: item.code, amount: item.amount }))
    )
  }

  React.useEffect(() => {
    if (giftCardLockedUntil === null) return
    const remaining = giftCardLockedUntil - Date.now()
    if (remaining <= 0) {
      setGiftCardLockedUntil(null)
      return
    }
    const timer = window.setTimeout(
      () => setGiftCardLockedUntil(null),
      remaining
    )
    return () => window.clearTimeout(timer)
  }, [giftCardLockedUntil])

  const applyGiftCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (giftCardLockedUntil !== null) return

    const normalizedCode = formatGiftCardCode(giftCardCode)
    if (
      !isCompleteGiftCardCode(normalizedCode) ||
      giftCardStatus === "applying"
    ) {
      return
    }

    const draftId = draftSummary?.draftId
    if (draftId) {
      if (codeRequestInFlightRef.current) return
      if (
        appliedGiftCards.some((giftCard) => giftCard.code === normalizedCode)
      ) {
        setLastAppliedGiftCardCode("")
        setDuplicateGiftCard(normalizedCode)
        setGiftCardStatus("idle")
        return
      }
      codeRequestInFlightRef.current = true
      setGiftCardStatus("applying")
      try {
        const response = await CheckoutAPI.ApplyDraftCode(draftId, {
          type: "gift_card",
          code: normalizedCode,
        })
        setSavedGiftCards(response.data.giftCards)
        refreshPricing("credits")
        setLastAppliedGiftCardCode(normalizedCode)
        setGiftCardCode("")
        setGiftCardStatus("idle")
      } catch (error) {
        const failure = error as {
          response?: {
            status?: number
            data?: {
              code?: string
              lockedUntil?: string
              message?: { code?: string; lockedUntil?: string } | string
            }
          }
        }
        const data = failure.response?.data
        const nested = typeof data?.message === "object" ? data.message : null
        const lockCode = data?.code ?? nested?.code
        if (
          failure.response?.status === 429 ||
          lockCode === "GIFT_CARD_LOCKED"
        ) {
          const lockedUntil = Date.parse(
            data?.lockedUntil ?? nested?.lockedUntil ?? ""
          )
          setGiftCardLockedUntil(
            Number.isFinite(lockedUntil) ? lockedUntil : Date.now() + 3600000
          )
          setGiftCardStatus("idle")
        } else if (
          failure.response?.status === 401 ||
          lockCode === "SESSION_NOT_ACTIVE"
        ) {
          setIsSessionExpiredDialogOpen(true)
          setGiftCardStatus("idle")
        } else {
          setGiftCardMessage(getGiftCardErrorMessage(lockCode))
          setGiftCardStatus("invalid")
        }
      } finally {
        codeRequestInFlightRef.current = false
      }
      return
    }

    const existingGiftCard = appliedGiftCards.find(
      (giftCard) => giftCard.code === normalizedCode
    )

    if (!existingGiftCard) {
      const previewAmounts = [1000, 2500, 2000]
      const amount =
        previewAmounts[appliedGiftCards.length % previewAmounts.length]
      setAppliedGiftCards((current) => [
        ...current,
        { code: normalizedCode, amount },
      ])
    }

    setLastAppliedGiftCardCode(normalizedCode)
    setGiftCardCode("")
    setGiftCardStatus("idle")
  }

  const hideGiftCards = (codes: string[]) => {
    codes.forEach((code) => pendingGiftCardRemovalsRef.current.add(code))
    setAppliedGiftCards((current) =>
      current.filter((giftCard) => !codes.includes(giftCard.code))
    )
    setDuplicateGiftCard("")
    setIsCreditsFetching(true)
  }

  const sendGiftCardRemoval = (
    draftId: string,
    giftCard: { code: string; amount: number }
  ) => {
    giftCardRemovalQueueRef.current = giftCardRemovalQueueRef.current.then(
      async () => {
        try {
          const response = await CheckoutAPI.RemoveDraftCode(
            draftId,
            giftCard.code
          )
          pendingGiftCardRemovalsRef.current.delete(giftCard.code)
          setSavedGiftCards(response.data.giftCards)
        } catch {
          pendingGiftCardRemovalsRef.current.delete(giftCard.code)
          setAppliedGiftCards((current) =>
            current.some((item) => item.code === giftCard.code)
              ? current
              : [...current, giftCard]
          )
          toast({
            variant: "destructive",
            title: "The gift card could not be removed. Please try again.",
          })
        }
        if (pendingGiftCardRemovalsRef.current.size === 0) {
          refreshPricing("silent")
        }
      }
    )
  }

  const removeGiftCard = async (code: string) => {
    const draftId = draftSummary?.draftId
    if (draftId) {
      const giftCard = appliedGiftCards.find((item) => item.code === code)
      if (!giftCard) return
      hideGiftCards([code])
      setLastAppliedGiftCardCode((current) => (current === code ? "" : current))
      sendGiftCardRemoval(draftId, giftCard)
      return
    }
    setAppliedGiftCards((current) =>
      current.filter((giftCard) => giftCard.code !== code)
    )
    setLastAppliedGiftCardCode((current) => (current === code ? "" : current))
  }

  const removeAllGiftCards = async () => {
    const draftId = draftSummary?.draftId
    if (draftId) {
      if (appliedGiftCards.length === 0) return
      const giftCards = [...appliedGiftCards]
      hideGiftCards(giftCards.map((giftCard) => giftCard.code))
      setLastAppliedGiftCardCode("")
      setShowAllGiftCards(false)
      giftCards.forEach((giftCard) => sendGiftCardRemoval(draftId, giftCard))
      return
    }
    setAppliedGiftCards([])
    setLastAppliedGiftCardCode("")
    setShowAllGiftCards(false)
  }

  const formatGiftCardRemovalAmount = (amount: number) =>
    formatter.format(amount)

  const askRemoveGiftCard = (code: string, amount: number) => {
    setGiftCardRemoval({ code, amount })
    setIsGiftCardRemovalOpen(true)
  }

  const askRemoveAllGiftCards = () => {
    setGiftCardRemoval(
      appliedGiftCards.length === 1
        ? {
            code: appliedGiftCards[0].code,
            amount: appliedGiftCards[0].amount,
          }
        : null
    )
    setIsGiftCardRemovalOpen(true)
  }

  const confirmGiftCardRemoval = () => {
    setIsGiftCardRemovalOpen(false)
    if (giftCardRemoval) {
      removeGiftCard(giftCardRemoval.code)
      return
    }
    removeAllGiftCards()
  }

  const applyPromoCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCode = promoCode.trim().toUpperCase()
    if (!normalizedCode || promoCodeStatus === "applying") return

    const requestId = promoRequestIdRef.current + 1
    promoRequestIdRef.current = requestId
    setPromoCode(normalizedCode)
    setPromoCodeStatus("applying")
    setPromoCodeNotice("")
    setLastRemovedPromoCode("")

    const draftId = draftSummary?.draftId
    if (draftId) {
      try {
        const response = await CheckoutAPI.ApplyDraftCode(draftId, {
          type: "promo",
          code: normalizedCode,
        })
        if (promoRequestIdRef.current !== requestId) return
        const saved = response.data.promoCode as CheckoutDraftPromoCode | null
        setAppliedPromoAmount(saved?.amount ?? 0)
        setAppliedPromoDiscount(
          saved
            ? {
                discountType: saved.discountType,
                discountValue: saved.discountValue,
              }
            : null
        )
        setAppliedPromoText(saved?.code ?? normalizedCode)
        setPromoCodeStatus("applied")
        refreshPricing("credits")
      } catch (error) {
        if (promoRequestIdRef.current !== requestId) return
        const apiError = getApiError(error)
        if (apiError?.code === "PROMO_ALREADY_APPLIED") {
          setPromoCodeStatus("idle")
          setPromoCodeNotice(apiError.message ?? "")
          return
        }
        setPromoCodeMessage(
          apiError?.code === "CODE_UNAVAILABLE" && apiError.message
            ? apiError.message
            : PROMO_INVALID_MESSAGE
        )
        setPromoCodeStatus("invalid")
      }
      return
    }

    await new Promise((resolve) => window.setTimeout(resolve, 600))
    if (promoRequestIdRef.current !== requestId) return

    if (normalizedCode === "SSS1") setAppliedPromoText(normalizedCode)
    setPromoCodeStatus(normalizedCode === "SSS1" ? "applied" : "invalid")
  }

  const removePromoCode = async () => {
    const draftId = draftSummary?.draftId
    if (draftId) {
      if (codeRequestInFlightRef.current) return
      codeRequestInFlightRef.current = true
      try {
        await CheckoutAPI.RemoveDraftCode(draftId, appliedPromoText)
        refreshPricing("credits")
      } catch {
        toast({
          variant: "destructive",
          title: "The promo code could not be removed. Please try again.",
        })
        return
      } finally {
        codeRequestInFlightRef.current = false
      }
    }
    promoRequestIdRef.current += 1
    setAppliedPromoDiscount(null)
    setPromoCodeNotice("")
    setLastRemovedPromoCode(appliedPromoText)
    setAppliedPromoText("")
    setPromoCode("")
    setPromoCodeStatus("removed")
  }
  const formattedProjectCheckoutTotal =
    projectCheckoutAmountBeforeCredits !== null
      ? pricing
        ? formatter.format(pricing.total)
        : formatter.format(
            Math.max(
              0,
              projectCheckoutAmountBeforeCredits - totalAppliedCreditAmount
            )
          )
      : "Pricing unavailable"

  const recommendations = [
    {
      id: "project-manager",
      title: "Project manager",
      description: "Because your contract is 6+ months",
      points: [
        "A dedicated project manager to oversee your contract",
        "A dedicated point of contact to oversee your contract",
      ],
      checked: false,
      total: "$340/wk",
      weeklyTotal: 340,
      weeklyHours: "4hrs/week",
    },
    {
      id: "account-manager",
      title: "Account manager",
      description: "Because your hourly rate is $75+/hr",
      points: [
        "Handles invoicing, payments, and billing disputes on your behalf",
        "Supports contract renewals and ensures the engagement stays on track long term",
      ],
      checked: false,
      total: "$340/wk",
      weeklyTotal: 340,
      weeklyHours: "4hrs/week",
    },
  ]
  const [selectedAddOnIds, setSelectedAddOnIds] = React.useState<string[]>(
    recommendations
      .filter((recommendation) => recommendation.checked)
      .map((recommendation) => recommendation.id)
  )
  const selectedAddOns = recommendations.filter((recommendation) =>
    selectedAddOnIds.includes(recommendation.id)
  )
  const addOnsWeeklyTotal = selectedAddOns.reduce(
    (total, recommendation) => total + recommendation.weeklyTotal,
    0
  )
  const dueTodayTotal = baseDueToday + addOnsWeeklyTotal
  const talentPaymentPlanOptions = React.useMemo<PaymentPlanOption[]>(() => {
    const options: PaymentPlanOption[] = [
      {
        id: "weekly",
        label: "Weekly",
        value: formatter.format(Math.round(dueTodayTotal / 2)),
      },
      {
        id: "bi-weekly",
        label: "Bi-Weekly",
        value: formatter.format(Math.round(dueTodayTotal)),
      },
      {
        id: "monthly",
        label: "Monthly",
        value: formatter.format(Math.round(dueTodayTotal * 2)),
      },
    ]

    if (!isOngoingTalentContract) {
      options.push({
        id: "final",
        label: "Pay Full Amount",
        value: formatter.format(Math.round(dueTodayTotal * 4)),
      })
    }

    return options
  }, [dueTodayTotal, formatter, isOngoingTalentContract])

  const defaultTalentPaymentPlanId =
    talentPaymentPlanOptions[Math.min(1, talentPaymentPlanOptions.length - 1)]
      ?.id ?? "bi-weekly"
  const [selectedTalentPaymentPlanId, setSelectedTalentPaymentPlanId] =
    React.useState(
      searchParams.get("paymentPlan") || defaultTalentPaymentPlanId
    )
  const selectedTalentPaymentPlan =
    talentPaymentPlanOptions.find(
      (option) => option.id === selectedTalentPaymentPlanId
    ) ||
    talentPaymentPlanOptions[Math.min(1, talentPaymentPlanOptions.length - 1)]
  const paymentPlanCostLabel =
    selectedTalentPaymentPlanId === "weekly"
      ? "Estimated Weekly Cost"
      : selectedTalentPaymentPlanId === "bi-weekly"
        ? "Estimated Bi-Weekly Cost"
        : selectedTalentPaymentPlanId === "monthly"
          ? "Estimated Monthly Cost"
          : "Estimated Total Cost"
  const formattedDueTodayTotal = `$${Math.round(dueTodayTotal).toLocaleString()}`
  const preventCheckoutDialogDismiss = (event: Event) => {
    event.preventDefault()
  }

  React.useEffect(() => {
    if (
      !talentPaymentPlanOptions.some(
        (option) => option.id === selectedTalentPaymentPlanId
      )
    ) {
      setSelectedTalentPaymentPlanId(defaultTalentPaymentPlanId)
    }
  }, [
    defaultTalentPaymentPlanId,
    selectedTalentPaymentPlanId,
    talentPaymentPlanOptions,
  ])

  const updateOfferInUrl = React.useCallback(
    (
      nextRate: string,
      nextSchedule: string,
      nextDuration: string,
      nextCustomRate?: string
    ) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("rate", nextRate)
      nextSearchParams.set("schedule", nextSchedule)
      nextSearchParams.set("duration", nextDuration)
      // Deleted, not just skipped, when the offer moves back to a predefined
      // tile — otherwise a customRate left over from a previous edit would
      // keep overriding the newly-picked tile's price.
      if (nextCustomRate) {
        nextSearchParams.set("customRate", nextCustomRate)
      } else {
        nextSearchParams.delete("customRate")
      }
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  const leaveCheckoutForProjectPlanning = React.useCallback(() => {
    setCheckoutExitDialog(null)
    router.push(`/edit-listing/${safeSlugSegment}`)
  }, [router, safeSlugSegment])

  const scopeEditorTeamMembers = React.useMemo<ScopeBuilderTeamMember[]>(
    () =>
      teamMembers.map((member) => {
        const rate = Number.parseFloat(member.rate.replace(/[^0-9.]/g, ""))
        return {
          id: member.id,
          firstName: member.name.trim().split(/\s+/)[0],
          username: member.handle.replace(/^@/, ""),
          avatarUrl: member.avatarSrc || null,
          role: member.role,
          hourlyRate: Number.isFinite(rate) ? rate : null,
          location: member.location || null,
          experience: member.experience || null,
        }
      }),
    [teamMembers]
  )

  React.useEffect(() => {
    scopeSummaryRef.current = scopeSummary
  }, [scopeSummary])

  const buildScopeEditorPhases = React.useCallback(
    (summary: CheckoutScopeSummary | null): Phase[] => {
      scopeEditorLocationsRef.current = Object.fromEntries(
        (summary?.phases ?? []).flatMap((phase) =>
          phase.tasks.map((task) => [task.id, task.location ?? []] as const)
        )
      )
      return (summary?.phases ?? []).map((phase) => ({
        phaseName: phase.phaseName,
        rows: phase.tasks.map((task) => {
          const assignedMember =
            scopeEditorTeamMembers.find(
              (member) => member.id === task.assigneeUserId
            ) ?? null
          return {
            id: task.id,
            task: task.title,
            role: task.roleName ?? "",
            location: task.location?.[0] ?? assignedMember?.location ?? "",
            experience: (SCOPE_EDITOR_EXPERIENCE_LEVELS.find(
              (level) =>
                level.toLowerCase() ===
                (task.experienceLevel ?? assignedMember?.experience ?? "")
                  .trim()
                  .toLowerCase()
            ) ?? "") as PhaseRow["experience"],
            duration: {
              value: task.estimatedHours ?? 0,
              type: "hours" as const,
            },
            workSchedule: task.workSchedule ?? "full_time",
            estimatedHours:
              task.workSchedule === "custom"
                ? (task.customHoursPerWeek ?? undefined)
                : undefined,
            assignedMember,
          }
        }),
      }))
    },
    [scopeEditorTeamMembers]
  )

  const openScopeEditor = React.useCallback(() => {
    if (isScopeSummaryLoading) return
    scopeSyncNoticeShownRef.current = false
    setCheckoutExitDialog(null)
    const initialPhases = buildScopeEditorPhases(scopeSummary)
    const initialJson = JSON.stringify(initialPhases)
    if (!isScopeEditorDirty) {
      scopeEditorInitialJsonRef.current = initialJson
    }
    scopeEditorLastJsonRef.current = initialJson
    setScopeEditorPhases(initialPhases)
    setIsScopeEditorOpen(true)
  }, [
    buildScopeEditorPhases,
    isScopeEditorDirty,
    isScopeSummaryLoading,
    scopeSummary,
  ])

  const runScopeSync = React.useCallback(() => {
    window.clearTimeout(scopeSyncTimerRef.current)
    scopeSyncChainRef.current = scopeSyncChainRef.current.then(async () => {
      const state = scopeSyncRef.current
      const summary = scopeSummaryRef.current
      if (!state || !summary) {
        setIsCostFetching(false)
        return
      }
      const result = await syncScopeChanges(state, summary)

      if (result.status === "noop") {
        setIsCostFetching(false)
        return
      }

      if (result.status === "ok") {
        setDraftSummary((current) =>
          current
            ? {
                ...current,
                version: result.version,
                durationDays: result.durationDays,
                teamMemberCount: result.teamMemberCount,
              }
            : current
        )
        setScopeSummary((current) =>
          current
            ? {
                ...current,
                version: result.version,
                phases: current.phases.map((phase, phaseIndex) => {
                  const phaseId = result.editorPhaseIds[phaseIndex]
                  const range = result.phases.find(
                    (item) => item.id === (phaseId ?? phase.id)
                  )
                  const resolved = phaseId ? { ...phase, id: phaseId } : phase
                  return range
                    ? {
                        ...resolved,
                        startDay: range.startDay,
                        endDay: range.endDay,
                      }
                    : resolved
                }),
              }
            : current
        )
        void refreshTeam(state.draftId)
        refreshPricing()
        return
      }

      if (result.status === "structure") {
        if (!scopeSyncNoticeShownRef.current) {
          scopeSyncNoticeShownRef.current = true
          toast({
            variant: "destructive",
            title: "Moving tasks between phases is not saved yet",
          })
        }
        setIsCostFetching(false)
        return
      }

      if (result.status === "error") {
        if (isUnauthorizedError(result.error)) {
          setIsSessionExpiredDialogOpen(true)
          setIsCostFetching(false)
          return
        }
        const fresh = await getCheckoutScopeSummary(state.draftId)
        if (fresh) {
          scopeSyncRef.current = createScopeSyncState(fresh)
          setScopeSummary(fresh)
        }
        setIsScopeEditorDirty(false)
        setIsScopeEditorOpen(false)
        refreshPricing()
        toast({
          variant: "destructive",
          title: isStaleDraftError(result.error)
            ? "This scope was updated elsewhere. The latest scope was loaded and your changes were not saved."
            : "Your scope changes could not be saved. The latest scope was reloaded.",
        })
      }
    })
  }, [refreshTeam, refreshPricing])

  const closeScopeEditor = React.useCallback(() => {
    setIsCostFetching(true)
    runScopeSync()
    setIsScopeEditorOpen(false)
  }, [runScopeSync])

  const formatScopeEditorBudget = React.useCallback(
    (period: string) => {
      const budgetUsd = isDraftPriced
        ? projectCheckoutCost
        : scopeEditorMetrics.isBudgetComplete
          ? scopeEditorMetrics.budgetUsd
          : null
      const totalDays = workingDaysToCalendarDays(
        isDraftPriced
          ? (draftSummary?.durationDays ?? scopeEditorMetrics.totalDays)
          : scopeEditorMetrics.totalDays
      )
      if (budgetUsd === null) return "N/A"
      if (budgetUsd <= 0) return "$0"
      const periodDays: Record<string, number> = {
        week: 7,
        "2-week": 14,
        month: 30,
        quarter: 90,
        year: 365,
      }
      const numPeriods = Math.max(
        1,
        Math.ceil(totalDays / (periodDays[period] ?? 7))
      )
      return `$${Math.round(budgetUsd / numPeriods).toLocaleString()}`
    },
    [
      scopeEditorMetrics,
      isDraftPriced,
      projectCheckoutCost,
      draftSummary?.durationDays,
    ]
  )

  const duplicateScopePhase = React.useCallback(
    (sourceRowId: string) => {
      scopeDuplicateInFlightRef.current = true
      setIsCostFetching(true)
      runScopeSync()
      scopeSyncChainRef.current = scopeSyncChainRef.current.then(async () => {
        const state = scopeSyncRef.current
        setIsCostFetching(true)
        try {
          if (!state) {
            setIsCostFetching(false)
            return
          }
          const sourceTaskId =
            state.localToServer.get(sourceRowId) ?? sourceRowId
          const sourcePhaseId = state.tasks.get(sourceTaskId)?.phaseId
          if (!sourcePhaseId) throw new Error("Source phase not found")
          const response = await CheckoutAPI.DuplicateDraftPhase(
            state.draftId,
            sourcePhaseId,
            state.version
          )
          const fresh = await getCheckoutScopeSummary(state.draftId)
          if (!fresh) throw new Error("Scope reload failed")
          scopeSyncRef.current = createScopeSyncState(fresh)
          const phases = buildScopeEditorPhases(fresh)
          scopeEditorLastJsonRef.current = JSON.stringify(phases)
          setScopeEditorPhases(phases)
          setScopeSummary(fresh)
          setDraftSummary((current) =>
            current
              ? {
                  ...current,
                  version: response.data.version,
                  durationDays: response.data.durationDays ?? null,
                  teamMemberCount: response.data.teamMemberCount ?? null,
                }
              : current
          )
          void refreshTeam(state.draftId)
          refreshPricing()
        } catch (error) {
          if (isUnauthorizedError(error)) {
            setIsSessionExpiredDialogOpen(true)
            setIsCostFetching(false)
            return
          }
          const fresh = state
            ? await getCheckoutScopeSummary(state.draftId)
            : null
          if (fresh) {
            scopeSyncRef.current = createScopeSyncState(fresh)
            setScopeSummary(fresh)
          }
          setIsScopeEditorDirty(false)
          setIsScopeEditorOpen(false)
          refreshPricing()
          toast({
            variant: "destructive",
            title:
              "The phase could not be duplicated. The latest scope was reloaded.",
          })
        } finally {
          scopeDuplicateInFlightRef.current = false
          const deferred = scopeDeferredChangeRef.current
          scopeDeferredChangeRef.current = null
          if (
            deferred &&
            !findDuplicatedPhase(
              toHourRows(deferred.filter(Boolean)) as {
                rows?: { id: string }[]
              }[]
            )
          ) {
            handleScopeEditorChangeRef.current(deferred)
          }
        }
      })
    },
    [buildScopeEditorPhases, refreshPricing, refreshTeam, runScopeSync, toast]
  )

  const handleScopeEditorChange = React.useCallback(
    (rawPhases: Phase[]) => {
      if (scopeDuplicateInFlightRef.current) {
        scopeDeferredChangeRef.current = rawPhases
        return
      }
      let phases = toHourRows(rawPhases.filter(Boolean))
      if (!findDuplicatedPhase(phases as { rows?: { id: string }[] }[])) {
        const knownRows = new Map<string, { assignedMember?: unknown }>()
        try {
          const lastPhases = JSON.parse(scopeEditorLastJsonRef.current || "[]")
          for (const phase of lastPhases) {
            for (const row of phase?.rows ?? []) knownRows.set(row.id, row)
          }
        } catch {
          return
        }
        phases = phases.map((phase) => ({
          ...phase,
          rows: phase.rows?.map((row) =>
            knownRows.has(row.id)
              ? knownRows.get(row.id)?.assignedMember && !row.assignedMember
                ? {
                    ...row,
                    experience: SCOPE_EDITOR_NEW_TASK_DEFAULTS.experience,
                    location: SCOPE_EDITOR_NEW_TASK_DEFAULTS.location,
                  }
                : row
              : {
                  ...row,
                  experience:
                    row.experience === "Junior"
                      ? SCOPE_EDITOR_NEW_TASK_DEFAULTS.experience
                      : row.experience,
                  location:
                    row.location || SCOPE_EDITOR_NEW_TASK_DEFAULTS.location,
                }
          ),
        }))
      }
      const json = JSON.stringify(phases)
      if (json === scopeEditorLastJsonRef.current) return
      scopeEditorLastJsonRef.current = json
      setScopeEditorPhases(phases)
      const isDirty = json !== scopeEditorInitialJsonRef.current
      setIsScopeEditorDirty(isDirty)
      const duplicated = findDuplicatedPhase(
        phases as { rows?: { id: string }[] }[]
      )
      if (duplicated) {
        duplicateScopePhase(duplicated.sourceRowId)
        return
      }
      setScopeSummary((current) => {
        if (!current) return current
        const previousTasks = new Map(
          current.phases.flatMap((phase) =>
            phase.tasks.map((task) => [task.id, task] as const)
          )
        )
        return {
          ...current,
          phases: phases.map((phase, phaseIndex) => ({
            id: current.phases[phaseIndex]?.id ?? `scope-phase-${phaseIndex}`,
            phaseName: phase.phaseName ?? "",
            order: phaseIndex,
            tasks: (phase.rows ?? []).map((row) => ({
              id: row.id,
              title: row.task,
              roleName: row.role || null,
              assigneeUserId: row.assignedMember?.id ?? null,
              location:
                !row.location ||
                (!scopeEditorLocationsRef.current[row.id]?.length &&
                  row.location === row.assignedMember?.location)
                  ? (scopeEditorLocationsRef.current[row.id] ?? null)
                  : (scopeEditorLocationsRef.current[row.id] ?? [])[0] ===
                      row.location
                    ? scopeEditorLocationsRef.current[row.id]
                    : [row.location],
              experienceLevel:
                row.experience ||
                previousTasks.get(row.id)?.experienceLevel ||
                null,
              estimatedHours: getTaskEffortHours(row),
              workSchedule: row.workSchedule ?? "full_time",
              customHoursPerWeek:
                row.workSchedule === "custom"
                  ? Number(row.estimatedHours) || null
                  : null,
              customHours: previousTasks.get(row.id)?.customHours ?? null,
              customFrequency:
                previousTasks.get(row.id)?.customFrequency ?? null,
              locked: Boolean(row.assignedMember),
            })),
          })),
        }
      })
      setIsCostFetching(true)
      window.clearTimeout(scopeSyncTimerRef.current)
      scopeSyncTimerRef.current = window.setTimeout(runScopeSync, 600)
    },
    [duplicateScopePhase, runScopeSync]
  )

  handleScopeEditorChangeRef.current = handleScopeEditorChange

  const continueToPaymentDetails = React.useCallback(() => {
    if (isTalentCheckout) {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("rate", selectedRateValue)
      nextSearchParams.set("schedule", selectedSchedule)
      nextSearchParams.set("duration", selectedDuration)
      nextSearchParams.set("paymentPlan", selectedTalentPaymentPlanId)
      nextSearchParams.set("username", decodedSlug)
      router.push(
        `${basePath}/${safeSlugSegment}/payment?${nextSearchParams.toString()}`
      )
      return
    }

    router.push(`${basePath}/payment?${slugQuery}`)
  }, [
    basePath,
    decodedSlug,
    isTalentCheckout,
    router,
    safeSlugSegment,
    slugQuery,
    searchParams,
    selectedDuration,
    selectedRateValue,
    selectedSchedule,
    selectedTalentPaymentPlanId,
  ])

  const keepValidationCodesRef = React.useRef(false)
  React.useEffect(() => {
    if (keepValidationCodesRef.current) {
      keepValidationCodesRef.current = false
      return
    }
    setValidationCodes([])
  }, [scopeSummary, teamMembers, openRoleRows])

  const createSessionAndContinue = async () => {
    const draftId = draftSummary?.draftId
    if (!draftId || isValidating) return
    if (!pricing) {
      setValidationCodes(["PRICING_UNAVAILABLE"])
      return
    }
    setIsValidating(true)
    try {
      await scopeSyncChainRef.current
      const version = scopeSyncRef.current?.version ?? draftSummary?.version
      if (!version) return
      const response = await CheckoutAPI.CreateDraftSession(draftId, {
        version,
        expectedTotal: pricing.total,
      })
      setValidationCodes([])
      router.push(
        `${basePath}/payment?sessionId=${encodeURIComponent(
          response.data.sessionId
        )}`
      )
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setIsSessionExpiredDialogOpen(true)
        return
      }
      const response = (
        error as {
          response?: {
            status?: number
            data?: { code?: string; blockingReasons?: { code: string }[] }
          }
        } | null
      )?.response
      if (
        response?.status === 409 &&
        response.data?.code !== "SESSION_ALREADY_PAID"
      ) {
        const [fresh, rows] = await Promise.all([
          getCheckoutScopeSummary(draftId),
          getCheckoutDraftTeam(draftId),
        ])
        if (fresh) {
          scopeSyncRef.current = createScopeSyncState(fresh)
          setScopeSummary(fresh)
        }
        if (rows) {
          setTeamMembers(
            rows.filter((row) => row.userId).map(toCheckoutTeamMember)
          )
          setOpenRoleRows(rows.filter((row) => !row.userId))
        }
        refreshPricing()
        keepValidationCodesRef.current = true
        setValidationCodes(["DRAFT_STALE"])
        return
      }
      const codes =
        response?.data?.blockingReasons?.map((reason) => reason.code) ??
        (response?.data?.code ? [response.data.code] : [])
      setValidationCodes(codes.length > 0 ? codes : ["VALIDATION_FAILED"])
      if (codes.includes("PRICE_CHANGED")) refreshPricing()
    } finally {
      setIsValidating(false)
    }
  }

  const hasValidationCode = (...codes: string[]) =>
    validationCodes.some((code) => codes.includes(code))
  const isScopeTabInError = hasValidationCode(
    "SCOPE_EMPTY",
    "PHASE_EMPTY",
    "PRICE_ZERO"
  )
  const isTeamTabInError = hasValidationCode("TEAM_EMPTY")

  const toggleAddOn = (addOnId: string, enabled?: boolean) => {
    setSelectedAddOnIds((current) => {
      const hasAddOn = current.includes(addOnId)

      if (enabled === true && !hasAddOn) return [...current, addOnId]
      if (enabled === false && hasAddOn)
        return current.filter((id) => id !== addOnId)
      if (enabled !== undefined) return current

      return hasAddOn
        ? current.filter((id) => id !== addOnId)
        : [...current, addOnId]
    })
  }

  const closeTeamMemberDialog = () => {
    setTeamMemberDialog(null)
    setSelectedReplacementId(null)
    setReplacementFilter("All")
    setReplacementSearch("")
    setIsReplacementSearchOpen(false)
  }

  const selectedReplacementMember = [
    ...allCandidates,
    ...favoriteCandidates,
    ...talentNetworkCandidates,
  ].find((member) => member.id === selectedReplacementId)
  const isReplacementCandidatesLoading =
    replacementFilter === "Favorites"
      ? favoritesLoading
      : replacementFilter === "Talent Network"
        ? talentNetworkLoading
        : allCandidatesLoading
  const existingTeamMemberUsernames = React.useMemo(
    () =>
      new Set(
        teamMembers
          .map((member) => normalizeHandle(member.handle))
          .filter(Boolean)
      ),
    [teamMembers]
  )
  const isReplacementServerSearch =
    replacementFilter === "All" && replacementSearch.trim() !== ""
  const filteredReplacementMembers = (
    replacementFilter === "Favorites"
      ? favoriteCandidates
      : replacementFilter === "Talent Network"
        ? talentNetworkCandidates
        : allCandidates
  )
    .filter((member) => {
      if (currentUser?.id && member.id === currentUser.id) return false
      const ownHandle = normalizeHandle(currentUser?.username)
      return !ownHandle || normalizeHandle(member.handle) !== ownHandle
    })
    .filter((member) => {
      if (isReplacementServerSearch) return true
      const normalizedSearch = replacementSearch.trim().toLowerCase()
      return (
        normalizedSearch === "" ||
        [
          member.name,
          member.handle,
          member.role,
          member.experience,
          member.location,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      )
    })
    .sort((a, b) => {
      if (isReplacementServerSearch) return 0
      const compare = getFirstName(a.name).localeCompare(getFirstName(b.name))
      return replacementNameSortAsc ? compare : -compare
    })
    .slice(0, isReplacementServerSearch ? REPLACEMENT_SEARCH_SHOWN : undefined)

  const updateTeamMemberExperienceOrLocation = (
    member: CheckoutTeamMember,
    field: "experience" | "location",
    value: string
  ) => {
    if (member.status === "Unassigned") {
      const draftId = draftSummary?.draftId
      if (!draftId || !value.trim()) return
      const roleKey = member.id.slice("unassigned:".length)
      submitTeamMemberChange(
        (version) =>
          CheckoutAPI.UpdateDraftRole(draftId, {
            version,
            roleKey,
            ...(field === "experience"
              ? { experienceLevel: value }
              : { location: value }),
          }),
        () => toast({ variant: "success", title: "Role Updated" })
      )
      return
    }
    setTeamMembers((current) =>
      current.map((m) => (m.id === member.id ? { ...m, [field]: value } : m))
    )
  }

  const applyTeamMemberChange = (data: TeamMemberChangeResponse) => {
    setTeamMembers(
      data.members.filter((row) => row.userId).map(toCheckoutTeamMember)
    )
    setOpenRoleRows(data.members.filter((row) => !row.userId))
    const state = scopeSyncRef.current
    const updates = new Map(
      (data.updatedTasks ?? []).map((task) => [task.id, task] as const)
    )
    const deletedTaskIds = new Set(data.deletedTaskIds ?? [])
    const phaseDays = new Map(
      (data.phases ?? []).map((phase) => [phase.id, phase] as const)
    )
    setScopeSummary((current) =>
      current
        ? {
            ...current,
            version: data.version,
            phases: current.phases.map((phase) => ({
              ...phase,
              ...(phaseDays.has(phase.id) ? phaseDays.get(phase.id) : {}),
              tasks: phase.tasks
                .filter(
                  (task) =>
                    !deletedTaskIds.has(
                      state?.localToServer.get(task.id) ?? task.id
                    )
                )
                .map((task) => {
                  const update = updates.get(
                    state?.localToServer.get(task.id) ?? task.id
                  )
                  if (!update) return task
                  return {
                    ...task,
                    assigneeUserId: update.assigneeUserId,
                    ...(update.experienceLevel !== undefined
                      ? { experienceLevel: update.experienceLevel }
                      : {}),
                    ...(update.location !== undefined
                      ? { location: update.location }
                      : {}),
                  }
                }),
            })),
          }
        : current
    )
    if (state) {
      state.version = data.version
      for (const taskId of deletedTaskIds) {
        state.tasks.delete(taskId)
        for (const [phaseId, taskIds] of state.order) {
          state.order.set(
            phaseId,
            taskIds.filter((id) => id !== taskId)
          )
        }
      }
      for (const [id, update] of updates) {
        const task = state.tasks.get(id)
        if (!task) continue
        task.assigneeUserId = update.assigneeUserId
        if (update.experienceLevel !== undefined) {
          task.experienceLevel = update.experienceLevel ?? ""
        }
        if (update.location !== undefined) task.location = update.location
      }
    }
    setDraftSummary((current) =>
      current
        ? {
            ...current,
            version: data.version,
            teamMemberCount: data.teamMemberCount,
            ...(data.durationDays !== undefined
              ? { durationDays: data.durationDays }
              : {}),
          }
        : current
    )
  }

  const submitTeamMemberChange = (
    send: (version: number) => Promise<{ data: TeamMemberChangeResponse }>,
    onApplied?: () => void
  ) => {
    const draftId = draftSummary?.draftId
    setIsCostFetching(true)
    scopeSyncChainRef.current = scopeSyncChainRef.current.then(async () => {
      const version = scopeSyncRef.current?.version ?? draftSummary?.version
      if (!version || !draftId) {
        setIsCostFetching(false)
        return
      }
      try {
        const response = await send(version)
        applyTeamMemberChange(response.data)
        refreshPricing()
        onApplied?.()
      } catch (error) {
        if (isUnauthorizedError(error)) {
          setIsSessionExpiredDialogOpen(true)
          setIsCostFetching(false)
          return
        }
        const [fresh, rows] = await Promise.all([
          getCheckoutScopeSummary(draftId),
          getCheckoutDraftTeam(draftId),
        ])
        if (fresh) {
          scopeSyncRef.current = createScopeSyncState(fresh)
          setScopeSummary(fresh)
        }
        if (rows) {
          setTeamMembers(
            rows.filter((row) => row.userId).map(toCheckoutTeamMember)
          )
          setOpenRoleRows(rows.filter((row) => !row.userId))
        }
        refreshPricing()
        toast({
          variant: "destructive",
          title:
            "The team change could not be saved. The latest team was reloaded.",
        })
      }
    })
  }

  const replaceTeamMember = () => {
    if (!teamMemberDialog || !selectedReplacementMember) return
    const draftId = draftSummary?.draftId
    if (!draftId) return

    const previousMemberId = teamMemberDialog.memberId
    const previousMemberPhases = teamMemberDialog.memberPhases
    const previousMemberName = teamMemberDialog.memberName
    const newMember = selectedReplacementMember
    const source = previousMemberId.startsWith("unassigned:")
      ? { roleKey: previousMemberId.slice("unassigned:".length) }
      : { fromUserId: previousMemberId }

    let resolvedMemberId = newMember.id

    closeTeamMemberDialog()

    submitTeamMemberChange(
      async (version) => {
        if (!USER_ID_PATTERN.test(resolvedMemberId)) {
          const lookup = await UserAPI.getByUsername(
            newMember.handle.replace(/^@/, "")
          )
          resolvedMemberId = String(lookup?.data?.id ?? "")
        }
        return CheckoutAPI.ReplaceDraftMember(draftId, {
          version,
          toUserId: resolvedMemberId,
          ...source,
        })
      },
      () => {
        if (!newMember.rate && projectSummary?.id) {
          CheckoutAPI.GetRateEstimate(projectSummary.id, [
            {
              roleKey: resolvedMemberId,
              roleTitle: newMember.role || "Team Member",
              experience: newMember.experience || undefined,
              location: newMember.location || undefined,
            },
          ])
            .then((response) => {
              const estimate = response.data as CheckoutRateEstimate
              const rate = estimate.rates?.[0]
              if (!rate || rate.noData || rate.hourlyRateUsdCents === null) {
                return
              }
              const dollars = rate.hourlyRateUsdCents / 100
              const formattedRate = `$${dollars.toFixed(0)}/hr`
              setTeamMembers((current) =>
                current.map((m) =>
                  m.id === resolvedMemberId ? { ...m, rate: formattedRate } : m
                )
              )
            })
            .catch((error) => {
              if (isUnauthorizedError(error)) {
                setIsSessionExpiredDialogOpen(true)
              }
            })
        }

        toast({
          variant: "success",
          className: "max-w-none w-fit whitespace-nowrap",
          title: `Team member updated: ${getFirstName(newMember.name)} has replaced ${getFirstName(previousMemberName)}`,
          action: (
            <ToastAction
              altText="Change"
              className="ml-auto flex h-5 px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
              onClick={() =>
                setTeamMemberDialog({
                  action: "replace",
                  memberId: resolvedMemberId,
                  memberName: newMember.name,
                  memberHandle: newMember.handle,
                  memberRole: newMember.role,
                  memberExperience: newMember.experience,
                  memberLocation: newMember.location,
                  memberRate: newMember.rate,
                  memberAvatarSrc: newMember.avatarSrc,
                  memberPhases: previousMemberPhases,
                })
              }
            >
              Change
            </ToastAction>
          ),
        })
      }
    )
  }

  const removeTeamMember = () => {
    if (!teamMemberDialog) return
    const draftId = draftSummary?.draftId
    if (!draftId) return
    const memberId = teamMemberDialog.memberId
    const isUnassignedRole = memberId.startsWith("unassigned:")

    closeTeamMemberDialog()

    submitTeamMemberChange(
      (version) =>
        isUnassignedRole
          ? CheckoutAPI.RemoveDraftMemberAndTasks(draftId, {
              version,
              roleKey: memberId.slice("unassigned:".length),
            })
          : CheckoutAPI.RemoveDraftMember(draftId, memberId, version),
      () => toast({ variant: "success", title: "Team Member Removed" })
    )
  }

  const renderTeamMemberActions = (member: CheckoutTeamMember) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label={`Actions for ${member.name}`}
          className="w-[27px] h-[23px]"
          variant="ghost"
          visual="gray"
        >
          <MoreHorizontal className="size-[15px]" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="flex w-[165px] min-w-0 flex-col gap-1 rounded-lg border border-gray-100 py-1 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      >
        {member.status !== "Unassigned" ? (
          <DropdownMenuItem
            className="h-9 gap-x-2 py-2.5 text-[13px] font-medium leading-[13.3px] text-gray-500"
            onSelect={() => setViewProfileMemberId(member.id)}
          >
            <User className="size-4 shrink-0 text-gray-500" />
            <span className="whitespace-nowrap">View profile</span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="h-9 gap-x-2 py-2.5 text-[13px] font-medium leading-[13.3px] text-gray-500"
          onSelect={() =>
            setTeamMemberDialog({
              action: "replace",
              memberId: member.id,
              memberName: member.name,
              memberHandle: member.handle,
              memberRole: member.role,
              memberExperience: member.experience,
              memberLocation: member.location,
              memberRate: member.rate,
              memberAvatarSrc: member.avatarSrc,
              memberPhases: member.phases,
            })
          }
        >
          <Repeat01 className="size-4 shrink-0 text-gray-500" />
          <span className="whitespace-nowrap">Replace Member</span>
        </DropdownMenuItem>
        <>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem
            className="h-9 gap-x-2 py-2.5 text-[13px] font-medium leading-[13.3px] text-error-600 hover:text-error-600"
            visual="destructive"
            onSelect={() =>
              setTeamMemberDialog({
                action: "remove",
                memberId: member.id,
                memberName: member.name,
                memberHandle: member.handle,
                memberRole: member.role,
                memberExperience: member.experience,
                memberLocation: member.location,
                memberRate: member.rate,
                memberAvatarSrc: member.avatarSrc,
                memberPhases: member.phases,
              })
            }
          >
            <Trash03 className="size-4 shrink-0" />
            <span className="whitespace-nowrap">Remove Member</span>
          </DropdownMenuItem>
        </>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderTeamMemberStatus = (member: CheckoutTeamMember) => {
    const statusBadge =
      member.status === "Confirmed" ? (
        <Badge className="bg-success-50 text-success-500 hover:bg-success-50">
          {member.status}
        </Badge>
      ) : member.status === "Pending Invite" ? (
        <Badge className="bg-warning-50 text-warning-700 hover:bg-warning-50">
          {member.status}
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
          {member.status}
        </Badge>
      )

    if (member.status === "Confirmed") return statusBadge

    return (
      <TeamMemberStatusTooltip status={member.status}>
        <Button
          className="rounded-none font-normal hover:no-underline"
          type="button"
          variant="link"
        >
          {statusBadge}
        </Button>
      </TeamMemberStatusTooltip>
    )
  }

  const retryProjectSummary = () => {
    setProjectSummaryRetryKey((count) => count + 1)
    refreshPricing()
  }

  const hasMissingCoreProjectData =
    !isProjectSummaryLoading &&
    (!projectSummary ||
      !projectSummary.id ||
      !projectSummary.mediaUrl ||
      !projectSummary.projectCost ||
      projectSummary.projectCost <= 0 ||
      !projectSummary.durationLabel)

  if (!isTalentCheckout && isProjectNotFound) {
    notFound()
  }

  if (
    !isTalentCheckout &&
    (projectSummaryError ||
      isDraftAlreadyPaid ||
      hasMissingCoreProjectData ||
      pricingError)
  ) {
    const isNetworkFailure = projectSummaryError
    return (
      <div className="bg-gray-50 pt-[64px]">
        <CheckoutNavigation
          currentStep={1}
          logoHref=""
          firstStepLabel="Project Details"
        />
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-[50px]">
          <div className="w-full max-w-[600px]">
            <Alert variant="error" className="items-center p-5">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                {isDraftAlreadyPaid ? (
                  <>
                    <AlertTitle>This checkout has already been paid</AlertTitle>
                    <AlertDescription className="mt-1">
                      Please check your payment confirmation or contact support.
                    </AlertDescription>
                  </>
                ) : isNetworkFailure ? (
                  <>
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription className="mt-1">
                      Please refresh the page or contact support.
                    </AlertDescription>
                    <Button
                      variant="filled"
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                  </>
                ) : (
                  <>
                    <AlertTitle>
                      We were unable to load your project details
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      Please try again or contact support.
                    </AlertDescription>
                    <Button
                      variant="filled"
                      className="mt-4"
                      onClick={retryProjectSummary}
                    >
                      Try Again
                    </Button>
                  </>
                )}
              </AlertContent>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 pt-[64px]">
      <CheckoutNavigation
        currentStep={1}
        logoHref=""
        firstStepLabel={
          isTalentCheckout ? "Contract Details" : "Project Details"
        }
      />

      <div className="px-[150px] py-[50px]">
        <div className="max-w-[1140px] mx-auto">
          <Button
            onClick={() => {
              if (isTalentCheckout) {
                router.push(
                  `/talent-profile?username=${encodeURIComponent(decodedSlug)}`
                )
                return
              }
              if (projectSummary?.slug) {
                router.push(
                  `/project-details/${encodeURIComponent(projectSummary.slug)}`
                )
                return
              }
              router.back()
            }}
            className={
              isTalentCheckout
                ? "gap-x-1 rounded-none font-normal hover:text-gray-700 hover:no-underline focus:text-gray-500 mb-6"
                : "gap-x-1 rounded-none font-normal hover:text-gray-700 hover:no-underline focus:text-gray-500 mb-2 h-5 py-0"
            }
            variant="link"
            visual="gray"
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          <h1 className="text-2xl leading-7 font-bold text-dark-blue-400">
            {isTalentCheckout
              ? "Please confirm your offer details below"
              : "Please confirm your project details below"}
          </h1>
          <p className="mt-2 text-base font-light text-dark-blue-400 leading-none">
            Then click{" "}
            <span className="font-normal">&quot;Proceed to Payment&quot;</span>{" "}
            to continue
          </p>

          <div className="mt-6 flex items-start gap-x-8">
            <div className="flex-auto">
              {isTalentCheckout ? (
                <>
                  <div className="p-5 rounded-lg border flex items-center gap-x-3 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    {isTalentProfileLoading && !talentAvatarUrl ? (
                      <div
                        className="relative size-[92px] shrink-0 overflow-hidden rounded-full bg-gray-100"
                        aria-hidden="true"
                      >
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                    ) : (
                      <Avatar className="size-[92px] shrink-0">
                        <AvatarImage src={talentAvatarUrl} alt={talentName} />
                        <AvatarFallback>{talentName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-auto flex items-stretch justify-between gap-x-5">
                      <div className="flex-auto">
                        <div className="inline-flex items-center gap-x-1.5">
                          <h1 className="text-[14px] font-bold leading-[16.26px] text-dark-blue-400">
                            {talentName}
                          </h1>
                          <span className="text-[12px] text-nowrap leading-[16.26px] font-light text-dark-blue-400">
                            @{talentUsername}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-medium text-dark-blue-400">
                          Expert React Developer
                        </p>
                        <p className="mt-0.5 text-[12px] font-normal leading-normal text-gray-500">
                          {talentExperienceLabel}
                        </p>

                        <div className="mt-3 flex items-center gap-x-2">
                          <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                            Start Date: Unavailable
                          </span>
                        </div>
                      </div>

                      <div className="inline-flex flex-col items-end justify-between gap-y-3 self-stretch">
                        <Button
                          variant="link"
                          className="bg-white text-xs leading-5 text-primary-500"
                          onClick={() => setIsEditOfferOpen(true)}
                        >
                          <Edit03 className="size-[15px] text-primary-500" />
                          Edit Offer
                        </Button>

                        <div className="inline-flex flex-col items-end gap-y-0.5">
                          <span className="inline-block text-dark-blue-400 text-[20px] leading-none font-semibold">
                            {formattedHourlyRate}
                          </span>
                          <span className="mt-[2px] inline-flex items-center gap-x-1.5 text-xs leading-none text-dark-blue-400">
                            <span className="font-medium">{scheduleLabel}</span>
                            <span className="font-normal">
                              {scheduleDetail}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                      Recommendations
                    </h1>

                    <div className="mt-6 space-y-3">
                      {recommendations.map((recommendation) => (
                        <article
                          key={recommendation.id}
                          className="rounded-lg border border-gray-200 shadow-sm bg-white"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-x-4">
                              <div className="flex-auto">
                                <h2 className="text-base font-semibold leading-[1.3] text-dark-blue-400">
                                  {recommendation.title}
                                </h2>
                                <p className="mt-1 text-xs font-light text-dark-blue-400">
                                  {recommendation.description}
                                </p>
                              </div>

                              <Switch
                                size="md"
                                checked={selectedAddOnIds.includes(
                                  recommendation.id
                                )}
                                onCheckedChange={(checked) =>
                                  toggleAddOn(recommendation.id, checked)
                                }
                              />
                            </div>

                            <div className="mt-4 space-y-1">
                              {recommendation.points.map((point) => (
                                <p
                                  key={point}
                                  className="text-xs font-light leading-[1.5] text-dark-blue-400"
                                >
                                  • {point}
                                </p>
                              ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                              <div className="inline-flex items-center gap-x-2">
                                <span className="text-base font-bold leading-none text-dark-blue-400">
                                  Est. $85/hr
                                </span>
                                <span className="text-xs font-light text-dark-blue-400">
                                  •
                                </span>
                                <span className="text-xs font-light text-dark-blue-400">
                                  United States
                                </span>
                                <Button
                                  className="font-medium underline text-[10px] leading-[14px]"
                                  variant="link"
                                >
                                  Change
                                </Button>
                              </div>

                              <span className="text-base font-bold leading-none text-dark-blue-400">
                                {recommendation.total}
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)] bg-white">
                    <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                      FAQ&apos;s
                    </h1>

                    <p className="mt-5 text-base leading-normal font-light text-dark-blue-400">
                      We use proven design methods to create a personal approach
                      to each product. This allows you to achieve high results
                      and the quality of the work done.
                    </p>

                    <div className="mt-6">
                      <Accordion
                        type="multiple"
                        className={CHECKOUT_FAQ_LIST_CLASSNAME}
                        defaultValue={["item-1"]}
                      >
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-1"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-2"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-3"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-4"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-5"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-6"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-7"
                        >
                          <AccordionTrigger
                            className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                          >
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>
                          <DisclosureContent
                            className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                          >
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-[132px] p-5 border flex items-center gap-x-3 border-gray-200 rounded-[8px] shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)] bg-white">
                    {isCheckoutCardLoading ? (
                      <div
                        className="relative h-[92px] overflow-hidden w-[181px] rounded-md shrink-0 bg-gray-100"
                        aria-hidden="true"
                      >
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                    ) : (
                      <div className="relative h-[92px] overflow-hidden w-[181px] border border-[#DFDFDF] rounded-md shrink-0">
                        <NextImage
                          className="object-cover"
                          src={checkoutProjectImage}
                          alt={checkoutProjectTitle}
                          sizes="25vw"
                          fill
                        />
                      </div>
                    )}

                    <div className="flex-auto flex items-center gap-x-5">
                      <div className="flex-auto">
                        {isCheckoutCardLoading ? (
                          <div
                            className="relative h-5 w-40 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <h1 className="text-sm font-medium leading-5 text-gray-800">
                            {checkoutProjectTitle}
                          </h1>
                        )}

                        <div className="mt-2 inline-flex items-center gap-x-2">
                          {isTeamTabLoading ||
                          isTeamRefreshing ||
                          isCostFetching ? (
                            <div
                              className="relative h-4 w-28 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <>
                              <UserGroup />
                              <span className="text-xs leading-5 font-semibold text-primary-500">
                                {checkoutProjectTeamLabel}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex mt-2 items-center gap-x-2">
                          {isCheckoutCardLoading || isCostFetching ? (
                            <div
                              className="relative h-4 w-24 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <span className="text-[13px] leading-none font-semibold text-[#122A4B]">
                              {checkoutProjectDateRange}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="self-stretch inline-flex flex-col items-end justify-between">
                        {isCheckoutCardLoading || isCostFetching ? (
                          <div
                            className="relative h-6 w-16 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <Badge size="md" visual="primary">
                            {checkoutProjectDuration || "Duration Unavailable"}
                          </Badge>
                        )}

                        <div className="inline-flex flex-col gap-y-0.5 items-end">
                          {isProjectCostLoading ? (
                            <div
                              className="relative h-6 w-20 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <span className="inline-block text-dark-blue-400 text-xl leading-none font-semibold">
                              {formattedProjectCardCost}
                            </span>
                          )}
                          {!isProjectCostLoading && (
                            <span className="inline-block text-[#122a4b] text-xs leading-none">
                              Project Cost
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Tabs defaultValue="Project Scope">
                      <div className="flex items-center justify-between">
                        <TabsList className="h-auto items-center p-1 rounded-[5px] gap-x-2 gap-y-0 bg-white border border-gray-200">
                          <DisclosureTrigger
                            className={cn(
                              "focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] text-gray-700 data-[state=active]:bg-gray-100 data-[state=inactive]:rounded-[6px] data-[state=inactive]:text-gray-500",
                              isScopeTabInError &&
                                "gap-x-1.5 text-error-500 data-[state=inactive]:text-error-500"
                            )}
                            value="Project Scope"
                          >
                            Project Scope
                            {isScopeTabInError ? (
                              <AlertCircle className="size-4 shrink-0 text-error-500" />
                            ) : null}
                          </DisclosureTrigger>
                          <DisclosureTrigger
                            className={cn(
                              "focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] text-gray-700 data-[state=active]:bg-gray-100 data-[state=inactive]:rounded-[6px] data-[state=inactive]:text-gray-500",
                              isTeamTabInError &&
                                "gap-x-1.5 text-error-500 data-[state=inactive]:text-error-500"
                            )}
                            value="Team Members"
                          >
                            Team Members
                            {isTeamTabInError ? (
                              <AlertCircle className="size-4 shrink-0 text-error-500" />
                            ) : null}
                          </DisclosureTrigger>
                        </TabsList>

                        <Button
                          variant="outlined"
                          className="bg-white text-xs leading-5"
                          onClick={() => setCheckoutExitDialog("edit-scope")}
                        >
                          <Edit03 className="size-[15px] text-gray-500" /> Edit
                          Scope
                        </Button>
                      </div>
                      <TabsContent value="Team Members">
                        <div
                          className={cn(
                            "rounded-lg mt-6 bg-white border border-gray-200 shadow-xs overflow-hidden",
                            hasValidationCode("TEAM_EMPTY") &&
                              "border-error-300"
                          )}
                        >
                          <Table className="table-fixed">
                            <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[24.66%] h-11 px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  <Button
                                    type="button"
                                    className="gap-x-1 rounded-none text-xs leading-[18px] font-medium text-inherit hover:no-underline focus:text-inherit"
                                    onClick={() =>
                                      setTeamNameSortAsc((current) => !current)
                                    }
                                    variant="link"
                                    visual="gray"
                                  >
                                    Name{" "}
                                    <ArrowDown
                                      className={cn(
                                        "size-[15px] transition-transform duration-200",
                                        !teamNameSortAsc && "rotate-180"
                                      )}
                                    />
                                  </Button>
                                </TableHead>
                                <TableHead className="w-[13.5%] h-11 p-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  Phase
                                </TableHead>
                                <TableHead className="w-[13.5%] h-11 p-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  Experience
                                </TableHead>
                                <TableHead className="w-[13.5%] h-11 p-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  Location
                                </TableHead>
                                <TableHead className="w-[13.5%] h-11 p-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  Rate
                                </TableHead>
                                <TableHead className="w-[13.5%] h-11 p-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  Status
                                </TableHead>
                                <TableHead className="w-[7.85%] h-11 pl-3 pr-6 py-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedTeamMembers.length > 0 ? (
                                sortedTeamMembers.map((member) => (
                                  <TableRow
                                    key={member.id}
                                    className="h-[72px] hover:bg-white"
                                  >
                                    <TableCell className="h-[72px] pl-6 pr-3 py-4 align-middle">
                                      <TeamMemberStatusTooltip
                                        status={member.status}
                                      >
                                        <span className="flex items-center gap-x-2">
                                          <Avatar
                                            size="sm"
                                            className="shrink-0"
                                          >
                                            {member.avatarSrc ? (
                                              <AvatarImage
                                                src={member.avatarSrc}
                                                alt={member.name}
                                              />
                                            ) : null}
                                            {member.status === "Unassigned" ? (
                                              <AvatarFallbackIcon
                                                className="bg-gray-100 hover:bg-gray-100"
                                                iconClass="text-gray-400"
                                              />
                                            ) : (
                                              <AvatarFallback>
                                                {member.name.charAt(0)}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>

                                          <span className="flex min-w-0 flex-col leading-[16.263px]">
                                            <span className="flex items-baseline gap-x-px truncate text-xs text-dark-blue-400">
                                              <span className="font-semibold">
                                                {member.status === "Unassigned"
                                                  ? member.name
                                                  : getFirstName(member.name)}
                                              </span>
                                              {member.handle ? (
                                                <span className="truncate font-normal">
                                                  {member.handle}
                                                </span>
                                              ) : null}
                                            </span>
                                            <span className="truncate text-xs font-normal text-gray-500">
                                              {member.role}
                                            </span>
                                          </span>
                                        </span>
                                      </TeamMemberStatusTooltip>
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle max-w-0">
                                      <PhaseCell
                                        label={
                                          member.status === "Unassigned"
                                            ? member.phases || "Unassigned"
                                            : member.phases ||
                                              getMemberPhaseLabel(member.id)
                                        }
                                        editable={member.phaseEditable}
                                        options={scopePhaseNames}
                                        value={member.phases}
                                        onValueChange={(value) =>
                                          setTeamMembers((current) =>
                                            current.map((m) =>
                                              m.id === member.id
                                                ? { ...m, phases: value }
                                                : m
                                            )
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      <ExperienceCell
                                        label={
                                          member.experience || "Unavailable"
                                        }
                                        editable={member.experienceEditable}
                                        value={member.experience}
                                        placeholder="None"
                                        onValueChange={(value) =>
                                          updateTeamMemberExperienceOrLocation(
                                            member,
                                            "experience",
                                            value
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      <LocationCell
                                        label={member.location || "None"}
                                        editable={member.locationEditable}
                                        value={member.location}
                                        onValueChange={(value) =>
                                          updateTeamMemberExperienceOrLocation(
                                            member,
                                            "location",
                                            value
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      {member.status === "Unassigned" &&
                                      isTeamRefreshing ? (
                                        <span
                                          aria-label="Loading rate"
                                          className="relative inline-block h-4 w-14 overflow-hidden rounded bg-gray-100 align-middle"
                                        >
                                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                                        </span>
                                      ) : (
                                        <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                          {renderRate(member.rate)}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      {renderTeamMemberStatus(member)}
                                    </TableCell>

                                    <TableCell className="h-[72px] pl-3 pr-6 py-4 align-middle">
                                      {renderTeamMemberActions(member)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow className="hover:bg-white">
                                  <TableCell
                                    className="py-10 px-6 text-center text-sm text-gray-500"
                                    colSpan={7}
                                  >
                                    {isTeamTabLoading
                                      ? "Loading team members…"
                                      : "Team Member Unavailable"}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {projectSummary && projectSummary.faqs.length > 0 ? (
                          <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)] bg-white">
                            <h1 className="text-2xl font-bold leading-[0.703] text-dark-blue-400">
                              FAQ&apos;s
                            </h1>

                            <p className="mt-5 text-base leading-normal font-light text-dark-blue-400">
                              We use proven design methods to create a personal
                              approach to each product. This allows you to
                              achieve high results and the quality of the work
                              done.
                            </p>

                            <div className="mt-6">
                              <Accordion
                                type="multiple"
                                className={CHECKOUT_FAQ_LIST_CLASSNAME}
                              >
                                {projectSummary.faqs.map((faq, faqIndex) => (
                                  <AccordionItem
                                    key={`faq-${faqIndex}`}
                                    className="rounded-lg bg-white border border-gray-300"
                                    value={`faq-${faqIndex}`}
                                  >
                                    <AccordionTrigger
                                      className={CHECKOUT_FAQ_TRIGGER_CLASSNAME}
                                    >
                                      <span className="flex-auto text-left inline-block">
                                        {faq.question}
                                      </span>
                                      <ChevronDown className="size-7 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                    </AccordionTrigger>

                                    <DisclosureContent
                                      className={CHECKOUT_FAQ_CONTENT_CLASSNAME}
                                    >
                                      {faq.answer}
                                    </DisclosureContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          </div>
                        ) : null}
                      </TabsContent>
                      <TabsContent value="Project Scope">
                        <div className="mt-6">
                          {isScopeSummaryLoading ? (
                            <div className="space-y-3" aria-hidden="true">
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            </div>
                          ) : scopeSummary && scopeSummary.phases.length > 0 ? (
                            <Accordion
                              type="multiple"
                              defaultValue={scopeSummary.phases.map(
                                (phase) => phase.id
                              )}
                              className="flex-auto space-y-3"
                            >
                              {scopeSummary.phases.map((phase, phaseIndex) => {
                                const phaseStartDay =
                                  phase.startDay ??
                                  phaseDayRanges[phaseIndex]?.startDay ??
                                  1
                                const phaseEndDay =
                                  phase.endDay ??
                                  phaseDayRanges[phaseIndex]?.endDay ??
                                  phaseStartDay

                                return (
                                  <AccordionItem
                                    key={phase.id}
                                    value={phase.id}
                                    className={cn(
                                      "overflow-hidden rounded-lg border border-gray-200 shadow-xs bg-white",
                                      hasValidationCode("PHASE_EMPTY") &&
                                        phase.tasks.length === 0 &&
                                        "border-error-300 bg-error-25"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex items-center justify-between gap-x-4 border-b border-gray-200 p-3",
                                        hasValidationCode("PHASE_EMPTY") &&
                                          phase.tasks.length === 0 &&
                                          "border-error-300"
                                      )}
                                    >
                                      <div className="inline-flex items-center gap-x-2">
                                        <AccordionTrigger asChild>
                                          <IconButton
                                            variant="ghost"
                                            visual="gray"
                                            className="size-8"
                                          >
                                            <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                          </IconButton>
                                        </AccordionTrigger>

                                        <span className="inline-flex items-center gap-x-1.5 text-base md:text-[18px] whitespace-nowrap">
                                          <span className="font-semibold leading-7 text-gray-900">
                                            {getPhaseOrdinalLabel(phaseIndex)}
                                          </span>
                                          <span className="font-light leading-5 text-gray-600">
                                            {phase.phaseName}
                                          </span>
                                        </span>
                                      </div>

                                      <div className="inline-flex items-center gap-x-8">
                                        {phase.tasks.length > 0 ? (
                                          <span className="inline-flex items-center gap-x-2 text-[13px] font-semibold leading-none text-[#122a4b]">
                                            <span>Day {phaseStartDay}</span>
                                            {phaseEndDay !== phaseStartDay ? (
                                              <>
                                                <span>-</span>
                                                <span>Day {phaseEndDay}</span>
                                              </>
                                            ) : null}
                                          </span>
                                        ) : null}

                                        <Button
                                          variant="outlined"
                                          visual="gray"
                                          className="bg-white"
                                          onClick={() => {
                                            setAddTaskPhaseId(phase.id)
                                            setCheckoutExitDialog("add-task")
                                          }}
                                        >
                                          <Plus className="size-[15px]" />
                                          Add task
                                        </Button>
                                      </div>
                                    </div>

                                    <DisclosureContent>
                                      <Table className="table-fixed">
                                        <TableHeader className="bg-gray-50 [&_tr]:border-y-0 [&_tr]:border-b">
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[63.45%] h-[44px] px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 hover:text-gray-600">
                                              Task
                                            </TableHead>
                                            <TableHead className="w-[23.30%] h-[44px] px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 hover:text-gray-600">
                                              Assignee
                                            </TableHead>
                                            <TableHead className="w-[13.26%] h-[44px] px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 hover:text-gray-600">
                                              Duration
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {phase.tasks.map((task) => (
                                            <TableRow
                                              key={task.id}
                                              className="h-[72px] hover:bg-white"
                                            >
                                              <TableCell className="h-[72px] px-6 py-4 align-middle">
                                                <span className="block truncate text-sm leading-5 font-semibold text-gray-900">
                                                  {task.title}
                                                </span>
                                              </TableCell>
                                              <TableCell className="h-[72px] px-6 py-4 align-middle">
                                                <span className="flex items-center gap-x-2">
                                                  <Avatar
                                                    size="sm"
                                                    className="shrink-0"
                                                  >
                                                    {getTaskAssignee(task)
                                                      ?.avatarUrl ? (
                                                      <AvatarImage
                                                        src={
                                                          getTaskAssignee(task)!
                                                            .avatarUrl!
                                                        }
                                                        alt={getTaskAssigneeName(
                                                          task
                                                        )}
                                                      />
                                                    ) : null}
                                                    <AvatarFallback>
                                                      {getTaskAssigneeName(task)
                                                        .slice(0, 1)
                                                        .toUpperCase()}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <span className="flex min-w-0 flex-col leading-[16.263px]">
                                                    <span className="truncate text-xs font-semibold text-gray-900">
                                                      {getTaskAssigneeName(
                                                        task
                                                      )}
                                                    </span>
                                                    {getTaskAssigneeHandle(
                                                      task
                                                    ) ? (
                                                      <span className="truncate text-xs font-normal text-gray-500">
                                                        {getTaskAssigneeHandle(
                                                          task
                                                        )}
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                </span>
                                              </TableCell>
                                              <TableCell className="h-[72px] px-6 py-4 align-middle">
                                                <span className="text-sm leading-5 text-nowrap font-normal text-gray-600">
                                                  {task.estimatedHours
                                                    ? `${task.estimatedHours} ${task.estimatedHours === 1 ? "hr" : "hrs"}`
                                                    : "Duration Unavailable"}
                                                </span>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </DisclosureContent>
                                  </AccordionItem>
                                )
                              })}
                            </Accordion>
                          ) : scopeSummary?.phases.length === 0 ? (
                            <div className="flex min-h-[228px] flex-col items-center justify-center px-6 py-5 text-center">
                              <h2 className="text-base font-semibold leading-6 text-gray-800">
                                Create your first phase
                              </h2>
                              <p className="mt-1 max-w-[352px] text-sm leading-5 text-gray-800">
                                Start defining your project scope with a clear,
                                actionable phase.
                              </p>
                              <Button
                                type="button"
                                className="mt-6"
                                variant="light"
                                onClick={openScopeEditor}
                              >
                                <Plus className="size-[15px]" /> Add Phase
                              </Button>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "space-y-3",
                                hasValidationCode("SCOPE_EMPTY") &&
                                  "rounded-lg border border-error-300 bg-error-25 p-3"
                              )}
                              aria-hidden="true"
                            >
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                              <div className="relative h-14 overflow-hidden rounded-lg bg-gray-100">
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              )}
            </div>
            <div className="w-[305px] shrink-0 bg-white">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)]">
                <h1 className="text-base font-semibold leading-[normal] text-dark-blue-400">
                  Price Details
                </h1>

                {isTalentCheckout ? (
                  <>
                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Hourly Rate
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedHourlyRate}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Estimated tax *
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedEstimatedTax}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Total Hourly rate
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedTotalHourlyRate}
                        </span>
                      </li>
                    </ul>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          {paymentPlanCostLabel}
                        </span>
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          {selectedTalentPaymentPlan?.value ||
                            formattedWeeklyCost}
                        </span>
                      </li>
                    </ul>

                    <AnimatePresence initial={false}>
                      {selectedAddOns.length > 0 ? (
                        <motion.div
                          key="talent-add-ons"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-gray-200">
                            <h2 className="text-base font-semibold leading-none text-dark-blue-400">
                              Add-ons
                            </h2>

                            <ul className="mt-4 space-y-2">
                              <AnimatePresence initial={false}>
                                {selectedAddOns.map((recommendation) => (
                                  <motion.li
                                    key={recommendation.id}
                                    layout
                                    initial={{ height: 0, opacity: 0, y: -8 }}
                                    animate={{
                                      height: "auto",
                                      opacity: 1,
                                      y: 0,
                                    }}
                                    exit={{ height: 0, opacity: 0, y: -8 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeInOut",
                                    }}
                                    className="flex items-start justify-between gap-x-3"
                                  >
                                    <span className="inline-flex flex-col">
                                      <span className="text-xs font-light text-dark-blue-400">
                                        {recommendation.title.replace(
                                          /\b\w/g,
                                          (char) => char.toUpperCase()
                                        )}
                                      </span>
                                      <Button
                                        className="group h-auto justify-start px-0 font-light text-[10px] leading-[14px] text-primary-500"
                                        variant="link"
                                        onClick={() =>
                                          toggleAddOn(recommendation.id, false)
                                        }
                                      >
                                        <span className="underline decoration-primary-500/30 transition-[text-decoration-color,color] duration-300 group-hover:decoration-primary-500">
                                          Remove
                                        </span>
                                      </Button>
                                    </span>
                                    <span className="inline-flex flex-col items-end">
                                      <span className="text-xs text-dark-blue-400">
                                        Est. $85/hr
                                      </span>
                                      <span className="text-[10px] leading-[14px] text-dark-blue-400">
                                        {recommendation.weeklyHours}
                                      </span>
                                    </span>
                                  </motion.li>
                                ))}
                              </AnimatePresence>
                              <li className="flex items-center justify-between">
                                <span className="text-xs font-light text-dark-blue-400">
                                  Estimated Weekly Total
                                </span>
                                <span className="text-base font-bold leading-none text-dark-blue-400">
                                  ${addOnsWeeklyTotal.toLocaleString()}/wk
                                </span>
                              </li>
                            </ul>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                        Payment Plan
                      </h1>

                      <div className="mt-4">
                        <Listbox
                          className="mt-4"
                          value={selectedTalentPaymentPlan}
                          onChange={(option) => {
                            if (option) {
                              setSelectedTalentPaymentPlanId(option.id)
                            }
                          }}
                        >
                          <ListboxButton
                            className="text-xs text-dark-blue-400"
                            iconClassName="text-gray-500"
                            placeholderClassName="text-xs"
                            placeholder="Select Option"
                          >
                            {({ value }) =>
                              value ? (
                                <span className="flex w-full items-center justify-between gap-x-3">
                                  <span>{value.label}</span>
                                  <span className="font-bold">
                                    {value.value}
                                  </span>
                                </span>
                              ) : null
                            }
                          </ListboxButton>
                          <ListboxOptions>
                            {() => (
                              <>
                                {talentPaymentPlanOptions.map((option) => (
                                  <ListboxOption
                                    className="hover:text-gray-900"
                                    indicator={false}
                                    key={option.id}
                                    value={option}
                                  >
                                    <>
                                      {option.label}
                                      <span className="ml-auto inline-block font-bold">
                                        {option.value}
                                      </span>
                                    </>
                                  </ListboxOption>
                                ))}
                              </>
                            )}
                          </ListboxOptions>
                        </Listbox>
                      </div>
                    </div>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          Due today
                        </span>
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          {selectedTalentPaymentPlan?.value ||
                            formattedDueTodayTotal}
                        </span>
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Project cost
                        </span>
                        {isProjectCostLoading ? (
                          <div
                            className="relative h-3.5 w-14 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <span className="text-xs text-dark-blue-400">
                            {formattedProjectCheckoutCost}
                          </span>
                        )}
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Estimated tax *
                        </span>
                        {isProjectCostLoading ? (
                          <div
                            className="relative h-3.5 w-14 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <span className="text-xs text-dark-blue-400">
                            {formattedProjectCheckoutTax}
                          </span>
                        )}
                      </li>
                      {pricing ? (
                        pricing.lines.map((line) => (
                          <li
                            key={line.key}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs font-light text-dark-blue-400">
                              {line.label}
                            </span>
                            {isPriceLoading ? (
                              <div
                                className="relative h-3.5 w-14 overflow-hidden rounded bg-gray-100"
                                aria-hidden="true"
                              >
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            ) : (
                              <span className="text-xs text-dark-blue-400">
                                {line.amount < 0 ? "- " : ""}
                                {formatter.format(Math.abs(line.amount))}
                              </span>
                            )}
                          </li>
                        ))
                      ) : (
                        <>
                          {appliedGiftCardAmount > 0 ? (
                            <li className="flex items-center justify-between">
                              <span className="text-xs font-light text-dark-blue-400">
                                {appliedGiftCards.length === 1
                                  ? "Gift card applied"
                                  : `${appliedGiftCards.length} Gift cards applied`}
                              </span>
                              <span className="text-xs text-dark-blue-400">
                                - {formatter.format(appliedGiftCardAmount)}
                              </span>
                            </li>
                          ) : null}
                          {appliedPromoCodeAmount > 0 ? (
                            <li className="flex items-center justify-between">
                              <span className="text-xs font-light text-dark-blue-400">
                                Promo code applied
                              </span>
                              <span className="text-xs text-dark-blue-400">
                                - {formatter.format(appliedPromoCodeAmount)}
                              </span>
                            </li>
                          ) : null}
                        </>
                      )}
                    </ul>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Total amount to be paid
                        </span>
                        {isPriceLoading ? (
                          <div
                            className="relative h-4 w-16 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <span className="text-base font-bold leading-none text-dark-blue-400">
                            {formattedProjectCheckoutTotal}
                          </span>
                        )}
                      </li>
                    </ul>
                  </>
                )}

                <div className="mt-[21.33px]">
                  <Button
                    className="w-full"
                    size="md"
                    disabled={
                      isTalentCheckout
                        ? isTalentProfileLoading
                        : isPriceLoading || isValidating
                    }
                    onClick={
                      isTalentCheckout
                        ? continueToPaymentDetails
                        : createSessionAndContinue
                    }
                  >
                    Proceed to Payment
                  </Button>
                  {validationCodes.map((code) => (
                    <ErrorMessage
                      key={code}
                      className="mt-2 text-center"
                      size="sm"
                    >
                      {getCheckoutValidationMessage(code)}
                    </ErrorMessage>
                  ))}
                </div>

                {isTalentCheckout ? (
                  <div className="mt-[21.33px] flex items-center justify-center">
                    <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                      Learn More about{" "}
                      <Button
                        className="font-medium underline text-[10px] leading-[14px]"
                        variant="link"
                      >
                        Estimated Taxes
                      </Button>
                    </span>
                  </div>
                ) : null}

                <div className="mt-[21.33px]">
                  <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                    By clicking the above, you agree to Marketeq&apos;s{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                      onClick={() => setLegalDialog("terms")}
                    >
                      Terms of Use
                    </Button>{" "}
                    and{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                      onClick={() => setLegalDialog("privacy")}
                    >
                      Privacy Policy
                    </Button>
                  </span>
                </div>

                <div className="mt-[21.33px] flex items-center justify-center">
                  <Button
                    variant="link"
                    visual="gray"
                    className="text-xs"
                    onClick={() => setIsRedeemCodeDialogOpen(true)}
                  >
                    Add Gift Card / Promo Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={isRedeemCodeDialogOpen}
        onOpenChange={setIsRedeemCodeDialogOpen}
      >
        <DialogContent className="w-[735px] max-w-[calc(100vw-32px)] overflow-hidden p-0">
          <Tabs
            value={redeemCodeTab}
            onValueChange={(value) =>
              setRedeemCodeTab(value as "gift-card" | "promo-code")
            }
            unanimated
          >
            <div className="flex h-11 items-center border-b border-gray-200 pl-6 pr-1">
              <DialogTitle className="shrink-0 text-lg font-semibold leading-7 text-dark-blue-400">
                Redeem Code
              </DialogTitle>

              <div className="ml-auto flex h-full items-center gap-x-6">
                <MotionConfig transition={{ duration: 0 }}>
                  <TabsList className="h-full items-start border-b-0 px-5 pt-3">
                    <TabsTrigger containerClassName="h-full" value="gift-card">
                      Gift Card
                    </TabsTrigger>
                    <TabsTrigger containerClassName="h-full" value="promo-code">
                      Promo Code
                    </TabsTrigger>
                  </TabsList>
                </MotionConfig>

                <DialogClose asChild>
                  <IconButton
                    aria-label="Close redeem code dialog"
                    className="rounded-lg text-gray-500"
                    size="sm"
                    variant="ghost"
                    visual="gray"
                  >
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>
            </div>

            <TabsContent value="gift-card" className="p-5">
              <div className="flex flex-col gap-y-3 rounded-lg bg-primary-25 p-5 text-dark-blue-400">
                <div className="flex items-center justify-between gap-x-4">
                  <p className="text-sm font-semibold leading-normal">
                    Redeem a gift card{" "}
                    <span className="text-xs font-light">
                      (dashes not required)
                    </span>
                  </p>

                  {appliedGiftCards.length > 0 ? (
                    <Button
                      type="button"
                      className="rounded-none text-xs leading-5 hover:text-error-500 hover:no-underline focus:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-100"
                      onClick={askRemoveAllGiftCards}
                      variant="link"
                      visual="gray"
                    >
                      Remove ({appliedGiftCards.length})
                      <Trash03 className="size-[15px]" />
                    </Button>
                  ) : null}
                </div>

                <form onSubmit={applyGiftCard}>
                  <div className="flex items-stretch gap-x-2">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        aria-label="Gift card number"
                        autoComplete="off"
                        className={cn(
                          "min-w-0",
                          giftCardStatus === "invalid" && "pr-11"
                        )}
                        disabled={giftCardLockedUntil !== null}
                        isInvalid={giftCardStatus === "invalid"}
                        placeholder="Enter gift card number"
                        value={giftCardCode}
                        onChange={(event) => {
                          setGiftCardCode(
                            formatGiftCardCode(event.target.value)
                          )
                          setGiftCardStatus("idle")
                          setLastAppliedGiftCardCode("")
                          setDuplicateGiftCard("")
                        }}
                      />
                      {giftCardStatus === "invalid" ? (
                        <AlertCircle className="absolute right-3.5 top-3.5 size-4 text-error-500" />
                      ) : null}
                    </div>
                    <Button
                      className={cn(
                        "h-11 px-3.5 text-xs",
                        giftCardStatus === "applying" ? "w-[91px]" : "w-[62px]"
                      )}
                      disabled={
                        !isCompleteGiftCardCode(giftCardCode) ||
                        giftCardLockedUntil !== null ||
                        giftCardStatus === "applying" ||
                        giftCardStatus === "invalid"
                      }
                      size="lg"
                      type="submit"
                      visual={
                        giftCardStatus === "invalid" ? "error" : "primary"
                      }
                    >
                      {giftCardStatus === "applying" ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                </form>

                {giftCardLockedUntil !== null ? (
                  <p className="text-sm leading-5 text-error-500">
                    Too many invalid gift card attempts. Please try again in 1
                    hour.
                  </p>
                ) : null}

                {giftCardStatus === "invalid" &&
                giftCardLockedUntil === null ? (
                  <p className="text-sm leading-5 text-error-500">
                    {giftCardMessage}
                  </p>
                ) : null}

                {lastAppliedGiftCardCode ? (
                  <Alert
                    variant="success"
                    className="w-fit max-w-full items-center rounded-[5px] p-4"
                  >
                    <AlertIcon className="shrink-0">
                      <CheckCircle className="size-5" />
                    </AlertIcon>
                    <AlertContent>
                      <AlertTitle className="text-sm leading-5 text-success-600">
                        Gift Card &ldquo;{lastAppliedGiftCardCode}&rdquo; has
                        been applied.
                      </AlertTitle>
                    </AlertContent>
                  </Alert>
                ) : null}

                {duplicateGiftCard ? (
                  <Alert
                    variant="error"
                    className="w-fit max-w-full items-center rounded-[5px] p-4"
                  >
                    <AlertIcon className="shrink-0">
                      <AlertCircle className="size-5" />
                    </AlertIcon>
                    <AlertContent>
                      <AlertTitle className="text-sm leading-5 text-error-600">
                        Gift Card &ldquo;{duplicateGiftCard}&rdquo; has already
                        been redeemed.
                      </AlertTitle>
                    </AlertContent>
                  </Alert>
                ) : null}

                {appliedGiftCards.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-x-4">
                      <p className="text-xs font-light leading-normal">
                        Total gift card amount{" "}
                        <span className="font-bold">
                          {formatter.format(totalGiftCardAmount)}
                        </span>
                      </p>

                      <Button
                        type="button"
                        className="rounded-none text-xs leading-5 hover:text-gray-600 hover:no-underline focus:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-100"
                        aria-expanded={showAllGiftCards}
                        onClick={() =>
                          setShowAllGiftCards((current) => !current)
                        }
                        variant="link"
                        visual="gray"
                      >
                        View All Gift Cards
                        <ChevronDown
                          className={cn(
                            "size-[15px] transition-transform",
                            showAllGiftCards && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>

                    {showAllGiftCards ? (
                      <div className="mt-4">
                        {appliedGiftCards.map((giftCard, index) => (
                          <div
                            key={giftCard.code}
                            className={cn(
                              "flex min-h-10 items-center gap-x-3",
                              index < appliedGiftCards.length - 1 &&
                                "border-b border-gray-300"
                            )}
                          >
                            <GiftCard className="size-7 shrink-0 text-dark-blue-400 [&>path]:fill-current" />
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-x-8">
                              <span className="w-[185px] shrink-0 text-sm font-medium leading-normal">
                                Gift card ending in{" "}
                                {getGiftCardEnding(giftCard.code)}
                              </span>
                              <span className="whitespace-nowrap text-xs leading-normal">
                                Amount:{" "}
                                <span className="font-bold">
                                  {formatter.format(giftCard.amount)}
                                </span>
                              </span>
                            </div>
                            <IconButton
                              type="button"
                              aria-label={`Remove gift card ending in ${getGiftCardEnding(giftCard.code)}`}
                              className="flex rounded-[4px] text-gray-400 hover:bg-transparent hover:text-error-500 focus:bg-transparent focus:text-gray-400 focus-visible:ring-2 focus-visible:ring-primary-100"
                              onClick={() =>
                                askRemoveGiftCard(
                                  giftCard.code,
                                  giftCard.amount
                                )
                              }
                              size="md"
                              variant="ghost"
                              visual="gray"
                            >
                              <Trash03 className="size-[18px]" />
                            </IconButton>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="promo-code" className="p-5">
              <div className="flex flex-col gap-y-3 rounded-lg bg-primary-25 p-5">
                <p className="text-sm font-semibold leading-normal text-dark-blue-400">
                  Redeem Promo Code
                </p>

                <form onSubmit={applyPromoCode}>
                  <div className="flex items-start gap-x-2">
                    <div className="min-w-0 flex-1">
                      <div className="relative">
                        <Input
                          aria-label="Promo code"
                          autoComplete="off"
                          className={cn(
                            "min-w-0",
                            promoCodeStatus === "invalid" && "pr-11"
                          )}
                          isInvalid={promoCodeStatus === "invalid"}
                          placeholder={
                            promoCodeStatus === "removed"
                              ? "Enter promo code number"
                              : "Enter promo code"
                          }
                          value={promoCode}
                          onChange={(event) => {
                            promoRequestIdRef.current += 1
                            setPromoCode(event.target.value.toUpperCase())
                            setPromoCodeStatus("idle")
                            setPromoCodeNotice("")
                            setLastRemovedPromoCode("")
                          }}
                        />
                        {promoCodeStatus === "invalid" ? (
                          <AlertCircle className="absolute right-3.5 top-3.5 size-4 text-error-500" />
                        ) : null}
                      </div>

                      {promoCodeStatus === "invalid" ? (
                        <p className="mt-1.5 text-sm leading-5 text-error-500">
                          {promoCodeMessage}
                        </p>
                      ) : null}

                      {promoCodeNotice ? (
                        <p className="mt-1.5 text-sm leading-5 text-error-500">
                          {promoCodeNotice}
                        </p>
                      ) : null}

                      {promoCodeStatus === "removed" && lastRemovedPromoCode ? (
                        <p className="mt-1.5 text-sm leading-5 text-gray-500">
                          Promo code &ldquo;{lastRemovedPromoCode}&rdquo; has
                          been removed
                        </p>
                      ) : null}
                    </div>

                    <Button
                      className={cn(
                        "h-11 px-3.5 text-xs",
                        promoCodeStatus === "applying" ? "w-[91px]" : "w-[62px]"
                      )}
                      disabled={
                        !promoCode.trim() ||
                        promoCodeStatus === "applying" ||
                        promoCodeStatus === "invalid"
                      }
                      size="lg"
                      type="submit"
                      visual={
                        promoCodeStatus === "invalid" ? "error" : "primary"
                      }
                    >
                      {promoCodeStatus === "applying" ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                </form>

                {appliedPromoText ? (
                  <Alert
                    variant="success"
                    className="items-center justify-between rounded-[5px] py-4 pl-4 pr-5"
                  >
                    <div className="flex min-w-0 items-center gap-x-3">
                      <AlertIcon className="shrink-0">
                        <CheckCircle className="size-5" />
                      </AlertIcon>
                      <AlertContent className="flex min-w-0 items-center gap-x-3">
                        <AlertTitle className="truncate text-sm leading-5 text-success-600">
                          &ldquo;{appliedPromoText}&rdquo; has been applied
                        </AlertTitle>
                        <span className="shrink-0 rounded-2xl bg-success-50 px-2 py-0.5 text-xs font-medium leading-[18px] text-success-700">
                          -{formatter.format(appliedPromoAmount)}
                          {appliedPromoDiscount?.discountType === "percent"
                            ? ` (${appliedPromoDiscount.discountValue}% off)`
                            : null}
                        </span>
                      </AlertContent>
                    </div>

                    <Button
                      type="button"
                      className="rounded-none text-xs leading-5 text-success-600 underline hover:no-underline focus:text-success-600 focus-visible:ring-2 focus-visible:ring-success-100"
                      onClick={removePromoCode}
                      variant="link"
                    >
                      Remove
                    </Button>
                  </Alert>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isGiftCardRemovalOpen}
        onOpenChange={setIsGiftCardRemovalOpen}
      >
        <DialogContent
          onInteractOutside={() => setIsGiftCardRemovalOpen(false)}
        >
          <DialogHeader>
            <div className="flex flex-col gap-y-2">
              <DialogTitle>
                {giftCardRemoval
                  ? "Remove Gift Card?"
                  : "Remove All Gift Cards?"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-bold">
                  {giftCardRemoval
                    ? `gift card ending in ${getGiftCardEnding(giftCardRemoval.code)} for the amount of ${formatGiftCardRemovalAmount(giftCardRemoval.amount)}`
                    : `all added gift cards for the amount of ${formatGiftCardRemovalAmount(totalGiftCardAmount)}`}
                </span>
                ?
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-8 gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button visual="error" onClick={confirmGiftCardRemoval}>
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!isTalentCheckout ? (
        <Dialog
          open={checkoutExitDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCheckoutExitDialog(null)
              return
            }
            setCheckoutExitDialog((current) => current ?? "edit-scope")
          }}
        >
          <DialogContent
            className="w-[405px]"
            onEscapeKeyDown={preventCheckoutDialogDismiss}
            onInteractOutside={preventCheckoutDialogDismiss}
          >
            <DialogHeader>
              <DialogTitle>
                {checkoutExitDialog === "add-task"
                  ? "Are you sure you want to leave checkout to add a task?"
                  : "Are you sure you want to leave checkout to edit the scope?"}
              </DialogTitle>
            </DialogHeader>
            <DialogFooter className="mt-8">
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                disabled={isScopeSummaryLoading}
                onClick={() => {
                  if (checkoutExitDialog === "add-task" && addTaskPhaseId) {
                    const phaseIndex = scopeSummary?.phases.findIndex(
                      (phase) => phase.id === addTaskPhaseId
                    )
                    setScopeEditorTaskPhaseIndex(
                      typeof phaseIndex === "number" && phaseIndex >= 0
                        ? phaseIndex
                        : null
                    )
                    openScopeEditor()
                    return
                  }
                  openScopeEditor()
                }}
              >
                {checkoutExitDialog === "add-task" ? "Add Task" : "Edit Scope"}
              </Button>
              <Button type="button" onClick={() => setCheckoutExitDialog(null)}>
                Continue Checkout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {!isTalentCheckout ? (
        <Dialog
          open={isScopeEditorOpen}
          onOpenChange={(open) => {
            if (!open) {
              setScopeEditorTaskPhaseIndex(null)
              closeScopeEditor()
            }
          }}
        >
          <DialogContent className="flex h-[min(768px,calc(100vh-40px))] max-h-[768px] max-w-[900px] flex-col overflow-hidden p-0">
            <DialogHeader className="h-[84px] shrink-0 gap-0 p-6">
              <div className="flex h-9 items-center justify-between">
                <DialogTitle className="leading-7 capitalize">
                  Edit your project scope
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton
                    aria-label="Close edit scope dialog"
                    variant="ghost"
                    visual="gray"
                  >
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>
            </DialogHeader>
            <ScrollArea
              className="min-h-0 flex-1"
              type="always"
              viewportClassName="[&>div]:!block"
              scrollBar={
                <ScrollAreaScrollbar
                  className="h-[259px] w-4 p-1"
                  orientation="vertical"
                >
                  <ScrollAreaThumb className="bg-gray-200" />
                </ScrollAreaScrollbar>
              }
            >
              <div className="px-6 pb-6">
                <div className="flex h-[106px] rounded-lg border border-gray-200 bg-white shadow-xs">
                  <div className="flex flex-1 items-center gap-x-6 p-6">
                    <div className="flex flex-1 flex-col gap-y-2">
                      <span className="inline-flex items-center gap-x-2 text-sm leading-5 font-medium text-gray-400">
                        Budget Calculator
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-4 cursor-help text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Calculated from your scope tasks
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <div className="flex items-baseline gap-x-1">
                        {isCostFetching ? (
                          <div
                            className="relative h-8 w-28 self-center overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : (
                          <span className="text-2xl leading-[normal] font-bold text-dark-blue-400">
                            {formatScopeEditorBudget(scopeEditorBudgetPeriod)}
                          </span>
                        )}
                        <span className="text-sm font-medium text-dark-blue-400">
                          per
                        </span>
                        <Listbox
                          value={scopeEditorBudgetPeriod}
                          onChange={setScopeEditorBudgetPeriod}
                        >
                          <ListboxButton
                            className="h-[25px] w-auto px-[7px] py-[5px] text-sm lowercase"
                            iconClassName="ml-1 size-3"
                            placeholder="Select"
                          />
                          <ListboxOptions className="w-[153px]">
                            {[
                              "week",
                              "2-week",
                              "month",
                              "quarter",
                              ...(scopeEditorMetrics.totalDays >= 365
                                ? ["year"]
                                : []),
                            ].map((period) => (
                              <ListboxOption key={period} value={period}>
                                {period}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      </div>
                    </div>
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary-25">
                      <MoneyBag className="size-8 text-primary-500" />
                    </div>
                  </div>
                  <div className="w-px self-stretch bg-gray-200" />
                  <div className="flex flex-1 items-start gap-x-6 p-6">
                    <div className="flex flex-1 flex-col gap-y-2">
                      <span className="inline-flex items-center gap-x-2 text-sm leading-5 font-medium text-gray-400">
                        Duration
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-4 cursor-help text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Total duration based on tasks
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      {isCostFetching ? (
                        <div
                          className="relative h-8 w-32 overflow-hidden rounded bg-gray-100"
                          aria-hidden="true"
                        >
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                      ) : (
                        <span className="text-2xl leading-[normal] font-bold text-dark-blue-400">
                          {(isDraftPriced ? checkoutProjectDuration : null) ??
                            scopeEditorMetrics.durationLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary-25">
                      <TrendUp01 className="size-8 text-primary-500" />
                    </div>
                  </div>
                </div>
                <div ref={scopeEditorBodyRef} className="mt-[50px]">
                  <ScopeBuilder
                    embedded
                    phases={scopeEditorPhases}
                    onPhasesChange={handleScopeEditorChange}
                    teamMembers={scopeEditorTeamMembers}
                    openTaskDialogForPhaseIndex={scopeEditorTaskPhaseIndex}
                    onTaskDialogOpened={() => {
                      setScopeEditorTaskPhaseIndex(null)
                      setAddTaskPhaseId(null)
                    }}
                  />
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ) : null}
      {!isTalentCheckout ? (
        <>
          <Dialog
            open={teamMemberDialog?.action === "replace"}
            onOpenChange={(open) => {
              if (!open) closeTeamMemberDialog()
            }}
          >
            <DialogContent className="max-w-[558px]">
              <DialogHeader className="h-9 shrink-0 gap-0">
                <div className="flex h-9 items-center justify-between">
                  <DialogTitle className="leading-7">
                    Replace Team Member
                  </DialogTitle>
                  <DialogClose asChild>
                    <IconButton
                      aria-label="Close replace team member dialog"
                      variant="ghost"
                      visual="gray"
                    >
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>
              </DialogHeader>

              <div className="mt-5 flex h-[72px] w-[510px] shrink-0 items-center rounded-lg border-2 border-gray-300 bg-gray-50">
                <div className="flex h-[72px] min-w-0 flex-1 items-center py-4 pl-6 pr-3">
                  <span className="flex min-w-0 items-start gap-x-2">
                    <Avatar size="sm">
                      {teamMemberDialog?.memberAvatarSrc ? (
                        <AvatarImage
                          src={teamMemberDialog.memberAvatarSrc}
                          alt={teamMemberDialog.memberName ?? "Team member"}
                        />
                      ) : null}
                      <AvatarFallback>
                        {(teamMemberDialog?.memberName ?? "T").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 items-start gap-x-px text-xs leading-[16.26px] text-dark-blue-400">
                        <span className="shrink-0 font-semibold">
                          {teamMemberDialog?.memberName || "Name Unavailable"}
                        </span>
                        {teamMemberDialog?.memberHandle ? (
                          <span className="min-w-0 truncate font-normal">
                            {getShortHandle(teamMemberDialog.memberHandle)}
                          </span>
                        ) : null}
                      </span>
                      <span className="block max-w-full truncate text-xs leading-[16.26px] font-normal text-dark-blue-400">
                        {teamMemberDialog?.memberRole || "Role Unavailable"}
                      </span>
                    </span>
                  </span>
                </div>
                <div className="flex h-[72px] w-[88px] shrink-0 items-center px-3 py-4">
                  <Badge
                    className="h-auto rounded-[5px] border border-gray-300 bg-white px-[8px] py-[5px] text-xs leading-[18px]"
                    visual="gray"
                  >
                    {teamMemberDialog?.memberExperience || "Unavailable"}
                  </Badge>
                </div>
                <div className="flex h-[72px] w-[107px] shrink-0 items-center px-3 py-4">
                  <Badge
                    className="h-auto min-w-0 shrink overflow-hidden gap-x-1.5 rounded-[5px] border border-gray-300 bg-white pl-[5px] pr-[8px] py-[5px] text-xs leading-[18px]"
                    visual="gray"
                  >
                    <img
                      className="h-3 w-4 shrink-0 rounded-sm object-cover"
                      src={
                        getStaticFlagUrl(
                          getCountryDisplayName(
                            teamMemberDialog?.memberLocation
                          )
                        ) ?? undefined
                      }
                      alt=""
                      onError={(event) => {
                        event.currentTarget.hidden = true
                      }}
                    />
                    <span className="min-w-0 truncate">
                      {getCountryDisplayName(teamMemberDialog?.memberLocation)}
                    </span>
                  </Badge>
                </div>
                <div className="flex h-[72px] shrink-0 items-center py-4 pl-3 pr-6">
                  {renderRate(teamMemberDialog?.memberRate)}
                </div>
              </div>

              <div className="mt-5 flex h-[408px] shrink-0 flex-col gap-3">
                <h2 className="h-5 text-sm font-semibold leading-5 text-dark-blue-400">
                  Select a new team member to replace{" "}
                  {teamMemberDialog?.memberHandle || "Handle Unavailable"}
                </h2>

                <div className="h-[376px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                  <div className="h-[42px] w-full">
                    {!isReplacementSearchOpen ? (
                      <Tabs
                        value={replacementFilter}
                        onValueChange={(value) =>
                          setReplacementFilter(
                            value as "All" | "Favorites" | "Talent Network"
                          )
                        }
                        unanimated
                      >
                        <MotionConfig transition={{ duration: 0 }}>
                          <TabsList className="h-[42px] w-full items-center justify-between gap-0 overflow-visible px-5 pt-0">
                            <span className="flex h-full items-center gap-x-4 pt-3">
                              {(
                                ["All", "Favorites", "Talent Network"] as const
                              ).map((filter) => (
                                <TabsTrigger
                                  key={filter}
                                  className="gap-x-2 pb-2.5 text-dark-blue-400 data-[state=active]:text-primary-500"
                                  value={filter}
                                >
                                  {filter === "All" ? null : filter ===
                                    "Favorites" ? (
                                    <Star className="size-[18px]" />
                                  ) : (
                                    <Globe className="size-[18px]" />
                                  )}
                                  {filter}
                                </TabsTrigger>
                              ))}
                            </span>
                            <IconButton
                              aria-label="Search replacement team members"
                              className="size-4 rounded-none p-0 text-gray-400 hover:bg-transparent"
                              type="button"
                              variant="ghost"
                              visual="gray"
                              onClick={() => setIsReplacementSearchOpen(true)}
                            >
                              <Search className="size-4" />
                            </IconButton>
                          </TabsList>
                        </MotionConfig>
                      </Tabs>
                    ) : (
                      <div className="flex h-[42px] gap-x-3 border-b border-gray-200 pl-5 pr-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="link"
                              visual="gray"
                              className="shrink-0 self-center gap-x-2 text-sm text-gray-800 hover:no-underline"
                            >
                              {replacementFilter}
                              <ChevronDown className="size-[15px]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            alignOffset={-6}
                            sideOffset={8}
                            className="w-[165px]"
                          >
                            <DropdownMenuItem
                              icon={<List className="size-4" />}
                              onSelect={() => {
                                setReplacementFilter("All")
                                setReplacementSearch("")
                              }}
                            >
                              All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              icon={<Star className="size-4" />}
                              onSelect={() => {
                                setReplacementFilter("Favorites")
                                setReplacementSearch("")
                              }}
                            >
                              Favorites
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              icon={<Globe className="size-4" />}
                              onSelect={() => {
                                setReplacementFilter("Talent Network")
                                setReplacementSearch("")
                              }}
                            >
                              Talent Network
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex h-full flex-1 items-center gap-x-2 border-b-2 border-primary-500 py-[10px]">
                          <Search className="size-4 shrink-0 text-gray-400" />
                          <Input
                            autoFocus={isReplacementSearchOpen}
                            value={replacementSearch}
                            onChange={(event) =>
                              setReplacementSearch(event.target.value)
                            }
                            placeholder="Search"
                            className="h-auto w-full flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-dark-blue-400 shadow-none placeholder:text-gray-500 placeholder:opacity-50 focus:border-0 focus:ring-0"
                          />
                          {replacementSearch ? (
                            <IconButton
                              type="button"
                              variant="ghost"
                              visual="gray"
                              className="size-4 shrink-0 rounded-none p-0 hover:bg-transparent"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setReplacementSearch("")
                                setIsReplacementSearchOpen(false)
                              }}
                              aria-label="Clear search"
                            >
                              <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
                            </IconButton>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  <Table className="table-fixed">
                    <colgroup>
                      <col className="w-[247px]" />
                      <col className="w-[88px]" />
                      <col className="w-[90px]" />
                      <col className="w-[83px]" />
                    </colgroup>
                    <TableHeader className="bg-white [&_tr]:border-b [&_tr]:border-t-0">
                      <TableRow className="hover:bg-white">
                        <TableHead className="h-11 py-3 pl-6 pr-3 text-dark-blue-400">
                          <Button
                            type="button"
                            variant="link"
                            visual="gray"
                            className="gap-x-1 text-xs text-dark-blue-400 hover:no-underline"
                            onClick={() =>
                              setReplacementNameSortAsc((current) => !current)
                            }
                          >
                            Name{" "}
                            <ArrowDown
                              className={cn(
                                "size-4 transition-transform duration-200",
                                !replacementNameSortAsc && "rotate-180"
                              )}
                            />
                          </Button>
                        </TableHead>
                        <TableHead className="h-11 px-3 py-3 text-dark-blue-400">
                          Experience
                        </TableHead>
                        <TableHead className="h-11 px-3 py-3 text-dark-blue-400">
                          Country
                        </TableHead>
                        <TableHead className="h-11 py-3 pl-3 pr-6 text-dark-blue-400">
                          Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isReplacementCandidatesLoading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                          <TableRow
                            key={`replacement-skeleton-${index}`}
                            className="!border-b hover:bg-white"
                          >
                            <TableCell className="h-[72px] max-w-0 py-4 pl-6 pr-3">
                              <span className="flex w-full min-w-0 items-start gap-x-2">
                                <div
                                  className="relative size-8 shrink-0 overflow-hidden rounded-full bg-gray-100"
                                  aria-hidden="true"
                                >
                                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                                </div>
                                <span className="flex min-w-0 flex-1 flex-col gap-y-1.5">
                                  <div
                                    className="relative h-[10px] w-24 shrink-0 overflow-hidden rounded bg-gray-100"
                                    aria-hidden="true"
                                  >
                                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                                  </div>
                                  <div
                                    className="relative h-[10px] w-36 shrink-0 overflow-hidden rounded bg-gray-100"
                                    aria-hidden="true"
                                  >
                                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                                  </div>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="h-[72px] px-3 py-4">
                              <div
                                className="relative h-[26px] w-16 shrink-0 overflow-hidden rounded-[5px] bg-gray-100"
                                aria-hidden="true"
                              >
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            </TableCell>
                            <TableCell className="h-[72px] max-w-0 px-3 py-4">
                              <div
                                className="relative h-[26px] w-20 shrink-0 overflow-hidden rounded-[5px] bg-gray-100"
                                aria-hidden="true"
                              >
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            </TableCell>
                            <TableCell className="h-[72px] py-4 pl-3 pr-6">
                              <div
                                className="relative h-[14px] w-14 shrink-0 overflow-hidden rounded bg-gray-100"
                                aria-hidden="true"
                              >
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredReplacementMembers.length > 0 ? (
                        filteredReplacementMembers.map((candidate) => {
                          const isAlreadyOnTeam =
                            existingTeamMemberUsernames.has(
                              normalizeHandle(candidate.handle)
                            )
                          return (
                            <TableRow
                              key={candidate.id}
                              aria-selected={
                                selectedReplacementId === candidate.id
                              }
                              aria-disabled={isAlreadyOnTeam}
                              tabIndex={isAlreadyOnTeam ? -1 : 0}
                              onClick={() => {
                                if (isAlreadyOnTeam) return
                                setSelectedReplacementId(candidate.id)
                              }}
                              onKeyDown={(event) => {
                                if (isAlreadyOnTeam) return
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault()
                                  setSelectedReplacementId(candidate.id)
                                }
                              }}
                              className={cn(
                                "!border-b focus-visible:outline-none",
                                isAlreadyOnTeam
                                  ? "cursor-not-allowed opacity-50 hover:bg-white"
                                  : "cursor-pointer hover:bg-gray-50",
                                !isAlreadyOnTeam &&
                                  selectedReplacementId === candidate.id &&
                                  "rounded-lg bg-white outline outline-2 outline-primary-500 outline-offset-[-2px] hover:bg-white"
                              )}
                            >
                              <TableCell className="h-[72px] max-w-0 py-4 pl-6 pr-3">
                                <span className="flex w-full min-w-0 items-start gap-x-2">
                                  <Avatar size="sm">
                                    <AvatarImage
                                      src={candidate.avatarSrc}
                                      alt={candidate.name}
                                    />
                                    <AvatarFallback>
                                      {candidate.name.slice(0, 1)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex min-w-0 items-baseline gap-x-px text-xs leading-[16.26px] text-dark-blue-400">
                                      <span className="shrink-0 font-semibold">
                                        {candidate.name}
                                      </span>
                                      <span className="min-w-0 truncate font-normal">
                                        {candidate.handle}
                                      </span>
                                    </span>
                                    <span className="block max-w-full truncate text-xs leading-[16.26px] font-normal text-dark-blue-400">
                                      {candidate.role}
                                    </span>
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="h-[72px] px-3 py-4">
                                <Badge
                                  className="h-auto text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white px-[8px] py-[5px] text-dark-blue-400"
                                  visual="gray"
                                >
                                  {candidate.experience}
                                </Badge>
                              </TableCell>
                              <TableCell className="h-[72px] max-w-0 px-3 py-4">
                                <Badge
                                  className="h-auto max-w-full min-w-0 overflow-hidden text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white gap-x-1.5 pl-[5px] pr-[8px] py-[5px]"
                                  visual="gray"
                                >
                                  {getStaticFlagUrl(
                                    getCountryDisplayName(candidate.location)
                                  ) ? (
                                    <img
                                      className="h-[14px] w-[18px] shrink-0 rounded-sm object-cover"
                                      src={
                                        getStaticFlagUrl(
                                          getCountryDisplayName(
                                            candidate.location
                                          )
                                        ) as string
                                      }
                                      alt=""
                                      onError={(event) => {
                                        event.currentTarget.hidden = true
                                      }}
                                    />
                                  ) : null}
                                  <span className="min-w-0 truncate">
                                    {getCountryDisplayName(candidate.location)}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell className="h-[72px] py-4 pl-3 pr-6">
                                {renderRate(candidate.rate)}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow className="hover:bg-white">
                          <TableCell
                            className="px-6 py-8 text-center text-sm text-gray-500"
                            colSpan={4}
                          >
                            {replacementSearch
                              ? "No matching team members"
                              : replacementFilter === "Favorites"
                                ? "You haven't favorited anyone yet"
                                : replacementFilter === "Talent Network"
                                  ? "You haven't hired anyone yet"
                                  : "No matching team members"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="mt-6 flex h-9 shrink-0 justify-end gap-x-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={closeTeamMemberDialog}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedReplacementMember}
                  onClick={replaceTeamMember}
                >
                  Replace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={teamMemberDialog?.action === "remove"}
            onOpenChange={(open) => {
              if (!open) closeTeamMemberDialog()
            }}
          >
            <DialogContent className="w-[400px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]">
              <DialogHeader>
                <DialogTitle>Remove Team Member?</DialogTitle>
              </DialogHeader>

              <p className="mt-2 text-sm leading-5 text-gray-500">
                Are you sure you want to remove{" "}
                <span className="font-bold">
                  {teamMemberDialog?.memberName || "Name Unavailable"}
                  {teamMemberDialog?.memberRole
                    ? ` (${teamMemberDialog.memberRole})`
                    : ""}
                </span>{" "}
                from the team?
                {teamMemberDialog?.memberId.startsWith("unassigned:")
                  ? " Their tasks will also be removed from this checkout draft."
                  : ""}
              </p>

              <DialogFooter className="mt-8 gap-x-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  className="shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
                  onClick={closeTeamMemberDialog}
                >
                  Cancel
                </Button>
                <Button
                  visual="error"
                  className="shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
                  onClick={removeTeamMember}
                >
                  Yes, Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
      {isTalentCheckout ? (
        <OfferDialog
          open={isEditOfferOpen}
          onOpenChange={setIsEditOfferOpen}
          mode="edit"
          onSaveOffer={({
            selectedRate,
            schedule,
            selectedDuration,
            customRate,
          }) => {
            setSelectedRateValue(selectedRate)
            setSelectedSchedule(schedule)
            setSelectedDuration(selectedDuration)
            updateOfferInUrl(
              selectedRate,
              schedule,
              selectedDuration,
              customRate
            )
          }}
          profile={{
            username: talentUsername,
            firstName: talentName,
            avatarUrl: talentAvatarUrl,
            location: talentProfile?.location || "",
            experience: talentProfile?.experience || [],
          }}
        />
      ) : null}
      <Dialog
        open={legalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLegalDialog(null)
        }}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            {legalDialog === "privacy" ? "Privacy Policy" : "Terms of Use"}
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            {legalDialog === "privacy"
              ? "This privacy policy explains how Marketeq collects, uses, and protects checkout information. Payment details are handled securely and are only used to process and support your order."
              : "These terms explain the basic conditions for using Marketeq checkout. By continuing, you confirm that your order details are accurate and authorize Marketeq to process the selected payment method."}
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setLegalDialog(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isOtherCheckoutTabOpen}
        onOpenChange={setIsOtherCheckoutTabOpen}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            Checkout open in another tab
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            You have checkout open in another tab. Please complete or close that
            session before continuing.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={continueCheckoutHere}>Continue Here</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSessionExpiredDialogOpen}
        onOpenChange={setIsSessionExpiredDialogOpen}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            Your session has expired
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            Please log in again to continue.
          </p>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() =>
                router.push(
                  `/sign-in?redirect=${encodeURIComponent(
                    `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
                  )}`
                )
              }
            >
              Log In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={viewProfileMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setViewProfileMemberId(null)
        }}
      >
        <DialogContent
          className="flex h-[768px] w-[1288px] max-w-[calc(100vw-152px)] flex-col overflow-hidden p-0 font-sans text-dark-blue-400 shadow-[0px_20px_40px_rgba(16,24,40,0.18)]"
          accessibilityTitle={
            viewProfileMember
              ? `Viewing ${viewProfileMember.name}'s profile`
              : "Team member profile"
          }
        >
          <header className="flex h-[84px] shrink-0 items-center justify-between border-gray-200 px-6">
            <h1 className="text-lg font-semibold leading-7 text-gray-900">
              {viewProfileMember
                ? `Viewing ${viewProfileMember.name}'s profile`
                : "Team member profile"}
            </h1>
            <IconButton
              type="button"
              aria-label="Close profile"
              onClick={() => setViewProfileMemberId(null)}
              visual="gray"
              variant="ghost"
              className="rounded-full text-gray-500 hover:text-gray-700"
            >
              <X className="size-5" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 px-6 pb-6">
            {viewProfileStatus === "found" ? (
              <iframe
                key={viewProfileUsername}
                src={`${talentProfileUrl(viewProfileUsername)}&view=checkout`}
                title={
                  viewProfileMember
                    ? `${viewProfileMember.name}'s profile`
                    : "Team member profile"
                }
                className="size-full rounded-lg border border-gray-200"
              />
            ) : viewProfileStatus === "not-found" ? (
              <div className="flex size-full items-center justify-center rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-500">
                  User not found
                </p>
              </div>
            ) : (
              <div className="flex size-full items-center justify-center">
                <Spinner />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <AuthenticatedRoute>
      <CheckoutPageInner />
    </AuthenticatedRoute>
  )
}
