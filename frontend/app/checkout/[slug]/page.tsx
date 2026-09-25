"use client"

import * as React from "react"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { UserAPI } from "@/service/http/user"
import { CheckoutAPI } from "@/service/http/checkout"
import {
  getCheckoutProjectSummary,
  titleizeCheckoutSlug,
  type CheckoutProjectSummary,
  type CheckoutRawTeamMember,
} from "@/lib/checkout/project-summary"
import {
  getCheckoutScopeSummary,
  type CheckoutScopeSummary,
} from "@/lib/checkout/scope-summary"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  Edit03,
  Globe,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  SwitchHorizontal01,
  Trash03,
  UserCircle,
  X,
} from "@blend-metrics/icons"
import { AnimatePresence, motion } from "framer-motion"
import type { UserProfile } from "@/types/user"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import {
  OfferDialog,
  getExperienceLabel,
  offerRates,
} from "@/components/hire-me-button"
import { Logo3 } from "@/components/icons"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import NextImage from "@/components/next-image"
import { CountriesCombobox } from "@/components/own-combobox"
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
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
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
  IconButton,
  Input,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
  defaultValue,
}: {
  onValueChange?: (value: string) => void
  value?: string
  placeholder?: string
  defaultValue?: string
}) => {
  const [state, setState] = useControllableState({
    onChange: onValueChange,
    value,
    defaultValue,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group max-w-full overflow-hidden bg-white data-[state=open]:bg-gray-100 hover:bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed hover:border-gray-300 hover:border-dashed border-solid rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="min-w-0 truncate text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={setState}>
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
            value="Mediator"
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

const PhaseDropdown = ({
  options,
  value,
  onValueChange,
}: {
  options: string[]
  value?: string
  onValueChange?: (value: string) => void
}) => {
  const [state, setState] = useControllableState({
    onChange: onValueChange,
    value,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group max-w-full overflow-hidden bg-white data-[state=open]:bg-gray-100 hover:bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed hover:border-gray-300 hover:border-dashed border-solid rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="min-w-0 truncate text-xs leading-[18px] font-medium text-gray-700">
          {state || "Unassigned"}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={state} onValueChange={setState}>
          <DropdownMenuRadioItem hideIndicator={false} value="Unassigned">
            Unassigned
          </DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} hideIndicator={false} value={option}>
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
  experience: string
  location: string
  rate: string
  status: "Confirmed" | "Pending Invite" | "Unassigned"
  avatarSrc: string
  source?: "All" | "Favorites" | "Talent Network"
  favorite?: boolean
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

const getCountryDisplayName = (location?: string | null) =>
  location === "United States" ? "USA" : (location ?? "USA")

const getCountryFlag = (location?: string | null) => {
  const country = getCountryDisplayName(location).toLowerCase()

  if (country === "usa" || country === "united states") return "🇺🇸"
  if (country === "india") return "🇮🇳"
  if (country === "pakistan") return "🇵🇰"
  if (country === "canada") return "🇨🇦"
  if (country === "united kingdom" || country === "uk") return "🇬🇧"

  return "🇺🇸"
}

const getShortHandle = (handle?: string | null) => {
  if (!handle) return ""
  const normalizedHandle = handle.startsWith("@") ? handle.slice(1) : handle

  return `@${normalizedHandle.slice(0, 6)}`
}

const renderRate = (rate?: string | null) => {
  if (!rate || rate === "Rate not set") {
    return (
      <span className="inline-flex h-5 items-center whitespace-nowrap text-sm leading-5 font-normal text-[#475467]">
        --
      </span>
    )
  }
  const [amount, unit = ""] = rate.split("/")

  return (
    <span className="inline-flex h-5 w-[47px] items-center whitespace-nowrap text-sm leading-5">
      <span className="font-semibold text-[#22376B]">{amount}</span>
      {unit ? (
        <span className="font-normal text-[#475467]">/{unit}</span>
      ) : null}
    </span>
  )
}

function CheckoutPageInner() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = safeDecodeSlug(slug)
  const safeSlugSegment = encodeURIComponent(decodedSlug)
  const addOnStateStorageKey = React.useMemo(
    () => `checkout-addons:${basePath}:${decodedSlug}`,
    [basePath, decodedSlug]
  )
  const fallbackTalentName =
    decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
    "Alex"
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [projectSummary, setProjectSummary] =
    React.useState<CheckoutProjectSummary | null>(null)
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] =
    React.useState(!isTalentCheckout)
  const [projectSummaryError, setProjectSummaryError] = React.useState(false)
  const [projectSummaryRetryKey, setProjectSummaryRetryKey] = React.useState(0)
  const [scopeSummary, setScopeSummary] =
    React.useState<CheckoutScopeSummary | null>(null)
  const [isScopeSummaryLoading, setIsScopeSummaryLoading] = React.useState(false)
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
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)
  const [checkoutExitDialog, setCheckoutExitDialog] = React.useState<
    "edit-scope" | "add-task" | null
  >(null)
  const [legalDialog, setLegalDialog] = React.useState<
    "terms" | "privacy" | null
  >(null)
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
  } | null>(null)
  const [teamMembers, setTeamMembers] = React.useState<CheckoutTeamMember[]>(
    []
  )
  const [selectedReplacementId, setSelectedReplacementId] = React.useState<
    string | null
  >(null)
  const [replacementFilter, setReplacementFilter] = React.useState<
    "All" | "Favorites" | "Talent Network"
  >("All")
  const [replacementSearch, setReplacementSearch] = React.useState("")

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
    setIsScopeSummaryLoading(true)

    const loadScopeSummary = async () => {
      const summary = await getCheckoutScopeSummary(listingId)
      if (isActive) {
        setScopeSummary(summary)
        setIsScopeSummaryLoading(false)
      }
    }

    loadScopeSummary()

    return () => {
      isActive = false
    }
  }, [isTalentCheckout, projectSummary?.id])

  React.useEffect(() => {
    if (isTalentCheckout) return
    if (!projectSummary) return

    setTeamMembers(
      projectSummary.teamMembers.map((member) => ({
        id: member.id,
        name: member.name,
        handle: member.username ? `@${member.username}` : "",
        role: member.role || "Team Member",
        phases: "Unassigned",
        experience: member.experienceLevel || "",
        location: member.location || "",
        rate: member.rate ? `$${member.rate}/hr` : "Rate not set",
        status: "Confirmed",
        avatarSrc: member.avatarUrl || "",
      }))
    )
  }, [isTalentCheckout, projectSummary])

  // Scope tasks only carry a role name (from the listing's scope, not a real
  // assignment), so the actual assignee shown here is looked up from the
  // real assigned roster (`projectSummary.team`) by matching role — the same
  // roster the Team Members tab renders. Falls back to "Unassigned" when no
  // team member has been assigned to that role yet.
  const assigneeByRole = React.useMemo(() => {
    const map = new Map<string, CheckoutRawTeamMember>()
    for (const member of projectSummary?.teamMembers ?? []) {
      if (member.role && !map.has(member.role.trim().toLowerCase())) {
        map.set(member.role.trim().toLowerCase(), member)
      }
    }
    return map
  }, [projectSummary?.teamMembers])

  const getTaskAssignee = (roleName: string | null) =>
    (roleName && assigneeByRole.get(roleName.trim().toLowerCase())) || null

  const getTaskAssigneeName = (roleName: string | null) =>
    getTaskAssignee(roleName)?.name || "Unassigned"

  // Real phase names from this project's own scope, so the Team Members
  // tab's Phase dropdown offers actual phases instead of an empty list.
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

  const getTaskAssigneeHandle = (roleName: string | null) => {
    const username = getTaskAssignee(roleName)?.username
    return username ? `@${username}` : null
  }

  const talentName = talentProfile?.firstName || fallbackTalentName
  const talentUsername = talentProfile?.username || decodedSlug
  const talentAvatarUrl = talentProfile?.avatarUrl || ""
  const talentExperienceLabel = getExperienceLabel(talentProfile)
  const checkoutProjectTitle =
    projectSummary?.title || titleizeCheckoutSlug(decodedSlug)
  const checkoutProjectImage = projectSummary?.mediaUrl || "/dashboard.png"
  const checkoutProjectTeamLabel =
    projectSummary?.teamMemberCount !== null &&
    projectSummary?.teamMemberCount !== undefined
      ? `${projectSummary.teamMemberCount} team members`
      : "Team details unavailable"
  const checkoutProjectDateRange =
    projectSummary?.dateRangeLabel || "Timeline unavailable"
  const checkoutProjectDuration = projectSummary?.durationLabel || null
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

  // Tax has no backend source yet; per the checkout spec's documented fallback
  // for an unavailable tax service, show $0.00 rather than guessing a rate.
  const projectCheckoutEstimatedTax = 0
  const projectCheckoutCost = projectSummary?.projectCost ?? null
  // Balance applied is shown and applied on the Payment Details step, not here.
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
  const formattedProjectCheckoutTax = centsFormatter.format(
    projectCheckoutEstimatedTax
  )
  const formattedProjectCheckoutTotal =
    projectCheckoutCost !== null
      ? formatter.format(
          Math.max(0, projectCheckoutCost + projectCheckoutEstimatedTax)
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

  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const rawSelectedAddOnIds =
        window.sessionStorage.getItem(addOnStateStorageKey)
      if (!rawSelectedAddOnIds) return

      const nextSelectedAddOnIds = JSON.parse(rawSelectedAddOnIds) as string[]
      if (Array.isArray(nextSelectedAddOnIds)) {
        setSelectedAddOnIds(nextSelectedAddOnIds)
      }
    } catch {
      window.sessionStorage.removeItem(addOnStateStorageKey)
    }
  }, [addOnStateStorageKey])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(
      addOnStateStorageKey,
      JSON.stringify(selectedAddOnIds)
    )
  }, [addOnStateStorageKey, selectedAddOnIds])

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

  const continueToPaymentDetails = React.useCallback(() => {
    if (isTalentCheckout) {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("rate", selectedRateValue)
      nextSearchParams.set("schedule", selectedSchedule)
      nextSearchParams.set("duration", selectedDuration)
      nextSearchParams.set("paymentPlan", selectedTalentPaymentPlanId)
      router.push(
        `${basePath}/${safeSlugSegment}/payment?${nextSearchParams.toString()}`
      )
      return
    }

    router.push(`${basePath}/${safeSlugSegment}/payment`)
  }, [
    basePath,
    isTalentCheckout,
    router,
    safeSlugSegment,
    searchParams,
    selectedDuration,
    selectedRateValue,
    selectedSchedule,
    selectedTalentPaymentPlanId,
  ])

  const closeTeamMemberDialog = () => {
    setTeamMemberDialog(null)
    setSelectedReplacementId(null)
    setReplacementFilter("All")
    setReplacementSearch("")
  }

  const selectedReplacementMember = replacementTeamMembers.find(
    (member) => member.id === selectedReplacementId
  )
  const filteredReplacementMembers = replacementTeamMembers.filter((member) => {
    const matchesFilter =
      replacementFilter === "All" ||
      (replacementFilter === "Favorites" && member.favorite) ||
      member.source === replacementFilter
    const normalizedSearch = replacementSearch.trim().toLowerCase()
    const matchesSearch =
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

    return matchesFilter && matchesSearch
  })

  const replaceTeamMember = () => {
    if (!teamMemberDialog || !selectedReplacementMember) return

    setTeamMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.id === teamMemberDialog.memberId
          ? {
              ...selectedReplacementMember,
              id: member.id,
              phases: member.phases,
              status: member.status,
            }
          : member
      )
    )
    closeTeamMemberDialog()
  }

  const removeTeamMember = () => {
    if (!teamMemberDialog) return

    setTeamMembers((currentMembers) =>
      currentMembers.filter((member) => member.id !== teamMemberDialog.memberId)
    )
    closeTeamMemberDialog()
  }

  const renderTeamMemberActions = (member: CheckoutTeamMember) => (
    <DropdownMenu>
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
        align="end"
        className="w-[165px] min-w-0 rounded-lg border border-gray-100 p-1 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      >
        <DropdownMenuItem
          className="h-9 gap-x-2 px-3 py-2.5 text-[13px] font-medium leading-[13.3px] text-gray-500"
          onSelect={() =>
            router.push(
              `${basePath}/${safeSlugSegment}/members/${encodeURIComponent(
                member.id
              )}`
            )
          }
        >
          <UserCircle className="h-3 w-[10.67px] shrink-0 text-gray-500" />
          <span className="whitespace-nowrap">View profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-9 gap-x-2 px-3 py-2.5 text-[13px] font-medium leading-[13.3px] text-gray-500"
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
            })
          }
        >
          <SwitchHorizontal01 className="h-3 w-[10.67px] shrink-0 text-gray-500" />
          <span className="whitespace-nowrap">Replace Member</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="h-9 gap-x-2 px-3 py-2.5 text-[13px] font-medium leading-[13.3px]"
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
            })
          }
        >
          <Trash03 className="h-3 w-[10.67px] shrink-0" />
          <span className="whitespace-nowrap">Remove Member</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderTeamMemberStatus = (member: CheckoutTeamMember) => {
    const statusBadge =
      member.status === "Confirmed" ? (
        <Badge visual="success">{member.status}</Badge>
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="inline-flex focus-visible:outline-none"
              type="button"
            >
              {statusBadge}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[360px] bg-dark-blue-400 px-5 py-3 text-sm leading-6 text-white">
            {member.status === "Pending Invite"
              ? "This user is currently pending, but they can be replaced at any time if they don't accept your invite."
              : "This user can be assigned at any time, their hourly rate will not affect your initial payment."}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

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

  const retryProjectSummary = () => {
    setProjectSummaryRetryKey((count) => count + 1)
  }

  if (!isTalentCheckout && projectSummaryError) {
    return (
      <div className="bg-gray-50 pt-[64px]">
        <CheckoutNavigation
          currentStep={1}
          logoHref=""
          firstStepLabel="Project Details"
        />
        <div className="px-[150px] py-[50px]">
          <div className="max-w-[1140px] mx-auto">
            <Alert variant="error" className="items-center p-5">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription className="mt-1">
                  We couldn&apos;t load your project details. Please try
                  again.
                </AlertDescription>
                <Button
                  variant="filled"
                  className="mt-4"
                  onClick={retryProjectSummary}
                >
                  Try Again
                </Button>
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
          <button
            onClick={() => {
              if (isTalentCheckout) {
                router.push(
                  `/talent-profile?username=${encodeURIComponent(decodedSlug)}`
                )
                return
              }
              router.back()
            }}
            className="inline-flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300 mb-6"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          <h1 className="text-2xl leading-[.7] font-bold text-dark-blue-400">
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
                            Start Date: Feb 5th, 2025
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

                  <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                      FAQ&apos;s
                    </h1>

                    <p className="mt-5 text-base leading-none font-light text-dark-blue-400">
                      We use proven design methods to create a personal approach
                      to each product. This allows you to achieve high results
                      and the quality of the work done.
                    </p>

                    <div className="mt-6">
                      <Accordion
                        type="multiple"
                        className="pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                        defaultValue={["item-1"]}
                      >
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-1"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
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
                  <div className="p-5 border flex items-center gap-x-3 border-gray-200 rounded-[8px] shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                    {isProjectSummaryLoading ? (
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
                        {isProjectSummaryLoading ? (
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
                          {isProjectSummaryLoading ? (
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
                          {isProjectSummaryLoading ? (
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
                        {isProjectSummaryLoading ? (
                          <div
                            className="relative h-6 w-16 overflow-hidden rounded bg-gray-100"
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ) : checkoutProjectDuration ? (
                          <Badge size="md" visual="primary">
                            {checkoutProjectDuration}
                          </Badge>
                        ) : null}

                        <div className="inline-flex flex-col gap-y-0.5 items-end">
                          {isProjectSummaryLoading ? (
                            <div
                              className="relative h-6 w-20 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <span className="inline-block text-dark-blue-400 text-xl leading-none font-semibold">
                              {formattedProjectCheckoutCost}
                            </span>
                          )}
                          {!isProjectSummaryLoading && (
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
                            className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] text-gray-700 data-[state=active]:bg-gray-100 data-[state=inactive]:rounded-[6px] data-[state=inactive]:text-gray-500"
                            value="Project Scope"
                          >
                            Project Scope
                          </DisclosureTrigger>
                          <DisclosureTrigger
                            className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] text-gray-700 data-[state=active]:bg-gray-100 data-[state=inactive]:rounded-[6px] data-[state=inactive]:text-gray-500"
                            value="Team Members"
                          >
                            Team Members
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
                        <div className="rounded-lg mt-6 bg-white border border-gray-200 shadow-xs overflow-hidden">
                          <Table className="table-fixed">
                            <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[24.66%] h-11 px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 bg-gray-50 hover:text-gray-600">
                                  <span className="inline-flex items-center gap-x-1">
                                    Name <ArrowDown className="size-[15px]" />
                                  </span>
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
                              {teamMembers.length > 0 ? (
                                teamMembers.map((member) => (
                                  <TableRow
                                    key={member.id}
                                    className="h-[72px] hover:bg-white"
                                  >
                                    <TableCell className="h-[72px] pl-6 pr-3 py-4 align-middle">
                                      <span className="flex items-center gap-x-2">
                                        <Avatar size="sm" className="shrink-0">
                                          {member.avatarSrc ? (
                                            <AvatarImage
                                              src={member.avatarSrc}
                                              alt={member.name}
                                            />
                                          ) : null}
                                          <AvatarFallback>
                                            {member.name.slice(0, 1)}
                                          </AvatarFallback>
                                        </Avatar>

                                        <span className="flex min-w-0 flex-col leading-[16.263px]">
                                          <span className="flex items-baseline gap-x-px truncate text-xs text-dark-blue-400">
                                            <span className="font-semibold">
                                              {member.name}
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
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      <PhaseDropdown
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
                                      <Dropdown
                                        defaultValue={member.experience}
                                        placeholder="None"
                                      />
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      <CountriesCombobox
                                        triggerClassName="group max-w-full overflow-hidden border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                        defaultValue={member.location}
                                      />
                                    </TableCell>
                                    <TableCell className="h-[72px] p-3 align-middle">
                                      <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                        {member.rate}
                                      </span>
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
                                    {isProjectSummaryLoading
                                      ? "Loading team members…"
                                      : "No team members selected."}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                          <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                            FAQ&apos;s
                          </h1>

                          <p className="mt-5 text-base leading-none font-light text-dark-blue-400">
                            We use proven design methods to create a personal
                            approach to each product. This allows you to achieve
                            high results and the quality of the work done.
                          </p>

                          <div className="mt-6">
                            <Accordion
                              type="multiple"
                              className="pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                              defaultValue={["item-1"]}
                            >
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-1"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-2"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-3"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-4"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-5"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-6"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-7"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
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
                              defaultValue={scopeSummary.phases.map((phase) => phase.id)}
                              className="flex-auto space-y-3"
                            >
                              {scopeSummary.phases.map((phase, phaseIndex) => {
                                // Dummy 7-day-per-phase timeline (no real start/end
                                // dates exist yet): phase N spans Day (8N+1) - Day (8N+8).
                                const phaseStartDay = phaseIndex * 8 + 1
                                const phaseEndDay = phaseStartDay + 7

                                return (
                                <AccordionItem
                                  key={phase.id}
                                  value={phase.id}
                                  className="overflow-hidden rounded-lg border border-gray-200 shadow-xs bg-white"
                                >
                                  <div className="flex items-center justify-between gap-x-4 border-b border-gray-200 p-3">
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
                                      <span className="inline-flex items-center gap-x-2 text-[13px] font-semibold leading-none text-[#122a4b]">
                                        <span>Day {phaseStartDay}</span>
                                        <span>-</span>
                                        <span>Day {phaseEndDay}</span>
                                      </span>

                                      <Button
                                        variant="outlined"
                                        visual="gray"
                                        className="bg-white"
                                        onClick={() => setCheckoutExitDialog("add-task")}
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
                                            <TableHead className="w-[22.93%] h-[44px] px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 hover:text-gray-600">
                                              Task
                                            </TableHead>
                                            <TableHead className="w-[40.52%] h-[44px] px-6 py-3 text-xs leading-[18px] font-medium text-gray-600 hover:text-gray-600">
                                              Description
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
                                                <span className="line-clamp-2 text-sm leading-5 font-normal text-gray-600">
                                                  {task.description || "No description provided"}
                                                </span>
                                              </TableCell>
                                              <TableCell className="h-[72px] px-6 py-4 align-middle">
                                                <span className="flex items-center gap-x-2">
                                                  <Avatar size="sm" className="shrink-0">
                                                    {getTaskAssignee(task.roleName)?.avatarUrl ? (
                                                      <AvatarImage
                                                        src={getTaskAssignee(task.roleName)!.avatarUrl!}
                                                        alt={getTaskAssigneeName(task.roleName)}
                                                      />
                                                    ) : null}
                                                    <AvatarFallback>
                                                      {getTaskAssigneeName(task.roleName)
                                                        .slice(0, 1)
                                                        .toUpperCase()}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <span className="flex min-w-0 flex-col leading-[16.263px]">
                                                    <span className="truncate text-xs font-semibold text-gray-900">
                                                      {getTaskAssigneeName(task.roleName)}
                                                    </span>
                                                    {getTaskAssigneeHandle(task.roleName) ? (
                                                      <span className="truncate text-xs font-normal text-gray-500">
                                                        {getTaskAssigneeHandle(task.roleName)}
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                </span>
                                              </TableCell>
                                              <TableCell className="h-[72px] px-6 py-4 align-middle">
                                                <span className="text-sm leading-5 text-nowrap font-normal text-gray-600">
                                                  {task.estimatedHours
                                                    ? `${task.estimatedHours} hours`
                                                    : "Duration unavailable"}
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
                          ) : (
                            <p className="text-sm font-light text-dark-blue-400">
                              Project scope unavailable.
                            </p>
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
                        {isProjectSummaryLoading ? (
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
                        {isProjectSummaryLoading ? (
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
                    </ul>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Total amount to be paid
                        </span>
                        {isProjectSummaryLoading ? (
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
                    onClick={continueToPaymentDetails}
                  >
                    Proceed to Payment
                  </Button>
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
                  <Button variant="link" visual="gray" className="text-xs">
                    Add Gift Card / Promo Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
            className="w-[360px]"
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
                onClick={leaveCheckoutForProjectPlanning}
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
        <>
          <Dialog
            open={teamMemberDialog?.action === "replace"}
            onOpenChange={(open) => {
              if (!open) closeTeamMemberDialog()
            }}
          >
            <DialogContent className="h-[664px] w-[558px] max-w-none gap-6 rounded-xl bg-white p-6 shadow-[0px_8px_8px_-4px_rgba(16,24,40,0.03),0px_20px_24px_-4px_rgba(16,24,40,0.08)]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Replace Team Member</DialogTitle>
                  <DialogClose asChild>
                    <IconButton variant="ghost" visual="gray">
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>
              </DialogHeader>

              <div className="border-2 mt-5 border-gray-300 bg-gray-50 rounded-lg min-h-[72px] flex items-center">
                <div className="flex items-center px-6 py-4 flex-auto">
                  <span className="inline-flex items-start gap-x-2">
                    <Avatar size="sm">
                      <AvatarImage
                        src={teamMemberDialog?.memberAvatarSrc ?? "/man.jpg"}
                        alt={teamMemberDialog?.memberName ?? "Team member"}
                      />
                      <AvatarFallback>
                        {(teamMemberDialog?.memberName ?? "T").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>

                    <span className="inline-flex flex-col">
                      <span className="inline-flex gap-px text-xs text-nowrap leading-[16.26px] text-dark-blue-400">
                        <span className="font-semibold">
                          {teamMemberDialog?.memberName ?? "Christopher"}
                        </span>
                        {teamMemberDialog?.memberHandle ? (
                          <span className="font-normal">
                            {getShortHandle(teamMemberDialog.memberHandle)}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                        {teamMemberDialog?.memberRole ?? "UX Researcher"}
                      </span>
                    </span>
                  </span>
                </div>
                <div className="flex items-center px-3 py-4">
                  <Badge
                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                    visual="gray"
                  >
                    {teamMemberDialog?.memberExperience ?? "Junior"}
                  </Badge>
                </div>
                <div className="flex items-center px-3 py-4">
                  <Badge
                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white gap-x-1.5"
                    visual="gray"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-[18px] items-center justify-center text-[18px] leading-none"
                    >
                      {getCountryFlag(teamMemberDialog?.memberLocation)}
                    </span>
                    {getCountryDisplayName(teamMemberDialog?.memberLocation)}
                  </Badge>
                </div>
                <div className="flex items-center px-6 py-4">
                  {renderRate(teamMemberDialog?.memberRate)}
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-sm leading-5 font-semibold text-dark-blue-400">
                  Select a new team member to replace{" "}
                  {teamMemberDialog?.memberHandle ?? "@topdesigner321"}
                </h2>

                <div className="mt-3 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] overflow-hidden">
                  <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
                    <div className="flex items-center gap-x-4 text-sm font-medium text-dark-blue-400">
                      {(["All", "Favorites", "Talent Network"] as const).map(
                        (filter) => (
                          <button
                            key={filter}
                            className={cn(
                              "inline-flex h-12 items-center gap-x-2 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 transition focus-visible:outline-none",
                              replacementFilter === filter &&
                                "border-primary-500 text-primary-500"
                            )}
                            type="button"
                            onClick={() => setReplacementFilter(filter)}
                          >
                            {filter === "All" ? null : filter ===
                              "Favorites" ? (
                              <Star className="size-5" />
                            ) : (
                              <Globe className="size-5" />
                            )}
                            {filter}
                          </button>
                        )
                      )}
                    </div>
                    <div className="relative flex h-9 w-[180px] items-center justify-end">
                      <Input
                        aria-label="Search replacement team members"
                        className="h-9 border-0 bg-transparent pl-2 pr-9 text-sm shadow-none focus-visible:ring-0"
                        placeholder=""
                        value={replacementSearch}
                        onChange={(event) =>
                          setReplacementSearch(event.target.value)
                        }
                      />
                      <Search className="absolute right-2 size-5 text-gray-400" />
                      {replacementSearch ? (
                        <button
                          aria-label="Clear replacement search"
                          className="absolute right-8 text-gray-400"
                          type="button"
                          onClick={() => setReplacementSearch("")}
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-white">
                        <TableHead className="px-6 py-3">
                          <span className="inline-flex items-center gap-x-1">
                            Name <ArrowDown className="size-4" />
                          </span>
                        </TableHead>
                        <TableHead className="px-3 py-3">Experience</TableHead>
                        <TableHead className="px-3 py-3">Country</TableHead>
                        <TableHead className="px-6 py-3">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReplacementMembers.length > 0 ? (
                        filteredReplacementMembers.map((candidate) => (
                          <TableRow
                            key={candidate.id}
                            aria-selected={
                              selectedReplacementId === candidate.id
                            }
                            tabIndex={0}
                            onClick={() =>
                              setSelectedReplacementId(candidate.id)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                setSelectedReplacementId(candidate.id)
                              }
                            }}
                            className={cn(
                              "cursor-pointer hover:bg-gray-50 focus-visible:outline-none",
                              selectedReplacementId === candidate.id &&
                                "outline outline-2 outline-primary-500 outline-offset-[-2px]"
                            )}
                          >
                            <TableCell className="px-6 py-3">
                              <span className="inline-flex items-start gap-x-2">
                                <Avatar size="sm">
                                  <AvatarImage
                                    src={candidate.avatarSrc}
                                    alt={candidate.name}
                                  />
                                  <AvatarFallback>
                                    {candidate.name.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>

                                <span className="inline-flex flex-col">
                                  <span className="inline-flex gap-px text-xs text-nowrap leading-[16.26px] text-dark-blue-400">
                                    <span className="font-semibold">
                                      {candidate.name}
                                    </span>
                                    <span className="font-normal">
                                      {getShortHandle(candidate.handle)}
                                    </span>
                                  </span>
                                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                    {candidate.role}
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                visual="gray"
                              >
                                {candidate.experience}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white gap-x-1.5"
                                visual="gray"
                              >
                                <span
                                  aria-hidden="true"
                                  className="inline-flex size-[18px] items-center justify-center text-[18px] leading-none"
                                >
                                  {getCountryFlag(candidate.location)}
                                </span>
                                {getCountryDisplayName(candidate.location)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {renderRate(candidate.rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="hover:bg-white">
                          <TableCell
                            className="px-6 py-8 text-center text-sm text-gray-500"
                            colSpan={4}
                          >
                            No matching team members.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="mt-5">
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
            <DialogContent className="w-[360px]">
              <DialogHeader>
                <DialogTitle>Remove Team Member?</DialogTitle>
              </DialogHeader>

              <p className="mt-2 text-sm leading-5 text-gray-500">
                Are you sure you want to remove{" "}
                {teamMemberDialog?.memberName ?? "Vivek"}{" "}
                {teamMemberDialog?.memberRole
                  ? `(${teamMemberDialog.memberRole})`
                  : ""}{" "}
                from the team?
              </p>

              <DialogFooter className="mt-8">
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={closeTeamMemberDialog}
                >
                  Cancel
                </Button>
                <Button visual="error" onClick={removeTeamMember}>
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
            location: talentProfile?.location || "United States",
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
