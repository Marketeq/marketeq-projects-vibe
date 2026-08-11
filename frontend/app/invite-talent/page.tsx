"use client"

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import {
  CheckoutAPI,
  type CheckoutPaymentMethod,
} from "@/service/http/checkout"
import { JobListingAPI } from "@/service/http/job-listing"
import {
  type TalentUser,
  talentToCardProps,
  useRecommendedTalentUsers,
} from "@/src/lib/api/talent-users"
import {
  Check,
  ChevronDown,
  FilterLines,
  HelpCircle,
  Lock,
  Send01,
  X,
} from "@blend-metrics/icons"
import { Spinner } from "@/components/ui/spinner/spinner"
import { Logo3 } from "@/components/icons"
import {
  ACH,
  Amex,
  ApplePay1,
  Discover,
  GPay1,
  Klarna,
  Mastercard,
  Swift,
  Visa,
  Wire,
} from "@/components/icons/payment-icons"
import { TalentSearchCard } from "@/components/talent-search-card"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  IconButton,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Switch,
  useToast,
} from "@/components/ui"

const INVITE_VISIBLE_SKILL_COUNT = 3

type TeamRoleOption = {
  id: string
  label: string
  state: string
}

type InvitePaymentOption = {
  id: string
  method: CheckoutPaymentMethod
  title: string
  description: string
  icons: ReactNode[]
}

const invitePaymentOptions: InvitePaymentOption[] = [
  {
    id: "card",
    method: "card",
    title: "Credit / Debit Card",
    description: "2.9% + $0.30 per transaction",
    icons: [
      <Visa key="visa" />,
      <Mastercard key="mastercard" />,
      <Discover key="discover" />,
      <Amex key="amex" />,
    ],
  },
  {
    id: "ach",
    method: "ach",
    title: "Bank Account",
    description: "0.8% per transaction",
    icons: [<ACH key="ach" />],
  },
  {
    id: "wire",
    method: "wire",
    title: "Wire Transfer",
    description: "0.8% per transaction",
    icons: [<Wire key="wire" />, <Swift key="swift" />],
  },
  {
    id: "google-pay",
    method: "card",
    title: "Google Pay",
    description: "2.9% + $0.30 per transaction",
    icons: [<GPay1 key="google-pay" />],
  },
  {
    id: "apple-pay",
    method: "card",
    title: "Apple Pay",
    description: "2.9% + $0.30 per transaction",
    icons: [<ApplePay1 key="apple-pay" />],
  },
  {
    id: "klarna",
    method: "card",
    title: "Pay with Klarna",
    description: "starting at 5.9% + $0.30 per transaction",
    icons: [<Klarna key="klarna" />],
  },
]

const locationOptions = [
  "USA",
  "United States",
  "Austria",
  "Arab Emirates",
  "Afghanistan",
  "Algeria",
  "Australia",
  "India",
  "Pakistan",
]

const experienceOptions = [
  "Student (0 - 2 years)",
  "Junior (2 - 3 years)",
  "Medior (3 - 5 years)",
  "Senior (5 - 10 years)",
  "Guru (10+ years)",
]

const workScheduleOptions = ["Full-time", "Part-time", "Custom"]

const rateOptions = ["Up to $20/hr", "$20-30/hr", "$30-50/hr", "$50-70/hr"]

const upgradePlanOptions = [
  {
    label: "Essentials",
    monthlyAmount: 20,
    invites: "50 invites per month",
  },
  {
    label: "Premium",
    monthlyAmount: 49,
    invites: "100 invites per month",
  },
  {
    label: "Enterprise",
    monthlyAmount: 99,
    invites: "500 invites per month",
  },
]

const normalizeRoleId = (role: string) =>
  role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const normalizeRateFilter = (rate: string) => rate.replace(/[–—]/g, "-")

const getUniqueStrings = (values: unknown[]) => {
  const seen = new Set<string>()

  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false
      seen.add(value.toLowerCase())
      return true
    })
}

const getNonEmptyString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const getTalentSkillNames = (skills: TalentUser["skills"] = []) =>
  skills
    .map((skill) =>
      typeof skill === "string" ? skill : getNonEmptyString(skill?.name)
    )
    .filter(Boolean)

const getRolesFromListing = (listing: any) => {
  const roleValues = [
    ...(Array.isArray(listing?.teamMemberRows)
      ? listing.teamMemberRows.map(
          (row: any) => row?.role || row?.roleTitle || row?.title
        )
      : []),
    ...(Array.isArray(listing?.roles)
      ? listing.roles.map(
          (row: any) => row?.role || row?.roleTitle || row?.title || row?.name
        )
      : []),
    ...(Array.isArray(listing?.roleDescriptions)
      ? listing.roleDescriptions.map(
          (row: any) => row?.role || row?.roleTitle || row?.title || row?.name
        )
      : []),
    ...(Array.isArray(listing?.phases)
      ? listing.phases.flatMap((phase: any) =>
          Array.isArray(phase?.tasks)
            ? phase.tasks.map((task: any) => task?.roleTitle || task?.role)
            : []
        )
      : []),
  ]

  return getUniqueStrings(roleValues)
}

const getSkillsFromListing = (listing: any) =>
  getUniqueStrings([
    ...(Array.isArray(listing?.tools) ? listing.tools : []),
    ...(Array.isArray(listing?.technologies) ? listing.technologies : []),
    ...(Array.isArray(listing?.roleDescriptions)
      ? listing.roleDescriptions.flatMap((description: any) =>
          Array.isArray(description?.skills) ? description.skills : []
        )
      : []),
  ])

const getInvitePackCount = (invitePack: string) =>
  invitePack === "1,000 invites"
    ? 1000
    : invitePack === "500 invites"
      ? 500
      : 100

const getPlanInviteCount = (plan: string) =>
  plan === "Enterprise" ? 500 : plan === "Premium" ? 100 : 50

const getPlanMonthlyAmount = (plan: string) =>
  plan === "Enterprise" ? 99 : plan === "Essentials" ? 20 : 49

const inviteCheckoutStorageKey = (sessionId: string) =>
  `marketeq:invite-checkout:${sessionId}`

const processedInviteCheckoutStorageKey = (sessionId: string) =>
  `marketeq:invite-checkout-processed:${sessionId}`

type InviteFilterSet = {
  locations: string[]
  experiences: string[]
  schedules: string[]
  rate: string
}

const emptyInviteFilterSet: InviteFilterSet = {
  locations: [],
  experiences: [],
  schedules: [],
  rate: "",
}

const hasInviteFilterSetValues = (filterSet: InviteFilterSet) =>
  filterSet.locations.length > 0 ||
  filterSet.experiences.length > 0 ||
  filterSet.schedules.length > 0 ||
  Boolean(filterSet.rate)

type InviteTalentFlowProps = {
  embedded?: boolean
  jobListingId?: string
}

type InviteTalentCandidate = {
  id: string
  name: string
  handle: string
  title: string
  experience: string
  location: string
  level?: string
  hourlyRate: string
  skillsMatch: string
  availability?: string
  avatar: string
  skills: string[]
  rating: number
  projects: number
  match: number
}

type InviteTalentShellHeaderProps = {
  title: string
  description: string
  onClose: () => void
}

function InviteTalentShellHeader({
  title,
  description,
  onClose,
}: InviteTalentShellHeaderProps) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white">
      <div className="flex w-full items-start justify-between px-8 py-3 md:px-[70px]">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-gray-black">
            {title}
          </h1>
          <p className="mt-1 text-[13px] font-light leading-normal text-gray-black">
            {description}
          </p>
        </div>

        <IconButton variant="ghost" visual="gray" size="sm" onClick={onClose}>
          <X className="size-6 text-gray-500" />
        </IconButton>
      </div>
    </div>
  )
}

type InviteTalentSideCardProps = {
  children: ReactNode
}

function InviteTalentSideCard({ children }: InviteTalentSideCardProps) {
  return (
    <Card className="flex-col items-stretch justify-start rounded-[8px] border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
      {children}
    </Card>
  )
}

type InviteTalentCandidateRowProps = {
  candidate: InviteTalentCandidate
}

function InviteTalentCandidateRow({
  candidate,
}: InviteTalentCandidateRowProps) {
  return (
    <TalentSearchCard
      id={candidate.id}
      name={candidate.name}
      handle={candidate.handle}
      role={candidate.title}
      photo={candidate.avatar}
      rate={candidate.hourlyRate}
      experience={candidate.experience}
      country={candidate.location}
      rating={candidate.rating}
      projects={candidate.projects}
      skills={candidate.skills}
      availability={candidate.availability}
      level={candidate.level}
      matchScore={candidate.match}
      variant="compact"
    />
  )
}

type InviteTalentShellFooterProps = {
  hasAnyInvites: boolean
  hasInsufficientInviteBalance: boolean
  isLoadingListing: boolean
  isSendingInvites: boolean
  selectedTalentCount: number
  sendInviteButtonLabel: string
  onBuyMore: () => void
  onUpgradePlan: () => void
  onSendInvites: () => void
}

function InviteTalentShellFooter({
  hasAnyInvites,
  hasInsufficientInviteBalance,
  isLoadingListing,
  isSendingInvites,
  selectedTalentCount,
  sendInviteButtonLabel,
  onBuyMore,
  onUpgradePlan,
  onSendInvites,
}: InviteTalentShellFooterProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white">
      <div className="flex w-full items-center justify-between gap-4 px-8 py-3 md:px-[70px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-[13px] font-medium leading-normal text-gray-500">
          <HelpCircle className="size-4" />
          {hasAnyInvites ? (
            <span>
              {hasInsufficientInviteBalance
                ? "Buy more invites or upgrade your plan to send this selection."
                : "Select talent profiles to invite for this role."}
            </span>
          ) : (
            <>
              <span>You&apos;re out of invites.</span>
              <button
                type="button"
                className="font-semibold text-primary-500"
                onClick={onBuyMore}
              >
                Buy more
              </button>
              <span>for one-time use, or</span>
              <button
                type="button"
                className="font-semibold text-primary-500"
                onClick={onUpgradePlan}
              >
                Upgrade your plan
              </button>
              <span>for ongoing invites.</span>
            </>
          )}
        </div>

        <div className="shrink-0">
          <Button
            onClick={onSendInvites}
            disabled={
              isLoadingListing || isSendingInvites || selectedTalentCount === 0
            }
            loading={isSendingInvites}
            loadingIcon={<Spinner size={16} strokeWidth={2} />}
            className="h-10 rounded-full px-6"
          >
            {sendInviteButtonLabel}
            <Send01 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InviteTalentFlow({
  embedded: _embedded = false,
  jobListingId: jobListingIdOverride,
}: InviteTalentFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const routeJobListingId =
    searchParams.get("jobListingId") || searchParams.get("projectId")
  const jobListingId = jobListingIdOverride || routeJobListingId
  const roleRowId = searchParams.get("roleRowId") || undefined
  const [roleOptions, setRoleOptions] = useState<TeamRoleOption[]>([])
  const [listingLoadError, setListingLoadError] = useState("")
  const [listingSkills, setListingSkills] = useState<string[]>([])
  const [listingContext, setListingContext] = useState({
    workType: "",
    description: "",
    deliverables: "",
    successCriteria: "",
  })
  const [hasLoadedListingContext, setHasLoadedListingContext] =
    useState(!jobListingId)
  const [showFilters, setShowFilters] = useState(true)
  const [roleFilter, setRoleFilter] = useState("")
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [isExperienceOpen, setIsExperienceOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isRateOpen, setIsRateOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState("")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([])
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  const [selectedRate, setSelectedRate] = useState("")
  const [appliedFilterSet, setAppliedFilterSet] =
    useState<InviteFilterSet>(emptyInviteFilterSet)
  const [applyToAllRoles, setApplyToAllRoles] = useState(false)
  const [roleFilterSets, setRoleFilterSets] = useState<
    Record<string, InviteFilterSet>
  >({})
  const [inviteBalance, setInviteBalance] = useState(0)
  const [isLoadingListing, setIsLoadingListing] = useState(false)
  const [isSendingInvites, setIsSendingInvites] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [isCompletingPayment, setIsCompletingPayment] = useState(false)
  const [invitePurchaseMode, setInvitePurchaseMode] = useState<
    "buy" | "upgrade" | null
  >(null)
  const [inviteCheckoutMode, setInviteCheckoutMode] = useState<
    "buy" | "upgrade" | null
  >(null)
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState("")
  const [selectedInvitePack, setSelectedInvitePack] = useState("100 invites")
  const [selectedPlan, setSelectedPlan] = useState("Premium")
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<
    "monthly" | "annual"
  >("monthly")
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod>("card")
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false)
  const [hasAuthorizedPayment, setHasAuthorizedPayment] = useState(false)
  const [showPromoCodeInput, setShowPromoCodeInput] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState("")
  const [appliedPromoCode, setAppliedPromoCode] = useState("")
  const [giftCardAmount, setGiftCardAmount] = useState(0)
  const [isApplyingPromoCode, setIsApplyingPromoCode] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [paymentCooldownMessage, setPaymentCooldownMessage] = useState("")
  const allRoleTitles = useMemo(
    () => roleOptions.map((role) => role.label).filter(Boolean),
    [roleOptions]
  )
  const recommendationRoleTitle =
    applyToAllRoles && allRoleTitles.length > 0
      ? allRoleTitles.join(", ")
      : roleFilter
  const roleSelectorLabel = applyToAllRoles
    ? "All Roles"
    : roleFilter || "Select role"
  const inviteRolePayload = applyToAllRoles
    ? {
        roleRowId: undefined,
        roleTitle: undefined,
      }
    : {
        roleRowId,
        roleTitle: roleFilter,
      }
  const recommendationRequest = useMemo(
    () =>
      hasLoadedListingContext && recommendationRoleTitle
        ? {
            roleTitle: recommendationRoleTitle,
            workType: listingContext.workType,
            description: listingContext.description,
            deliverables: listingContext.deliverables,
            successCriteria: listingContext.successCriteria,
            skills: listingSkills,
            locations: appliedFilterSet.locations,
            experienceLevels: appliedFilterSet.experiences,
            workSchedules: appliedFilterSet.schedules,
            hourlyRate: normalizeRateFilter(appliedFilterSet.rate),
            limit: 30,
          }
        : null,
    [
      hasLoadedListingContext,
      listingContext,
      listingSkills,
      recommendationRoleTitle,
      appliedFilterSet,
    ]
  )
  const {
    talents,
    aiStatus: recommendationStatus,
    message: recommendationMessage,
    isLoading: isLoadingTalents,
  } = useRecommendedTalentUsers(recommendationRequest)
  const rankedCandidates = useMemo(() => {
    return talents
      .map((talent, index) => {
        const card = talentToCardProps(talent, index)
        const profileSkills = getTalentSkillNames(talent.skills)
        const rawSkills = getUniqueStrings([
          ...(Array.isArray(talent.aiMatchedSkills)
            ? talent.aiMatchedSkills
            : []),
          ...profileSkills,
        ])
        const exactRate = Number(talent.rate)
        const minRate = Number(talent.rateMin)
        const maxRate = Number(talent.rateMax)
        const rate =
          Number.isFinite(exactRate) && exactRate > 0
            ? `$${exactRate}`
            : Number.isFinite(minRate) &&
                minRate > 0 &&
                Number.isFinite(maxRate) &&
                maxRate > 0
              ? `$${minRate} - $${maxRate}`
              : Number.isFinite(minRate) && minRate > 0
                ? `$${minRate}`
                : ""
        const yearsValue = talent.overview?.yearsOfExperience
        const yearsOfExperience = Number(yearsValue)
        const hasYearsOfExperience =
          yearsValue !== null &&
          yearsValue !== undefined &&
          yearsValue !== "" &&
          Number.isFinite(yearsOfExperience)
        const experience = hasYearsOfExperience
          ? `${yearsOfExperience} year${yearsOfExperience === 1 ? "" : "s"} of experience`
          : ""
        const level =
          getNonEmptyString(talent.overview?.experienceLevel) ||
          (hasYearsOfExperience
            ? yearsOfExperience >= 10
              ? "Guru"
              : yearsOfExperience >= 5
                ? "Senior"
                : yearsOfExperience >= 3
                  ? "Medior"
                  : yearsOfExperience >= 2
                    ? "Junior"
                    : "Student"
            : undefined)
        const availability =
          getNonEmptyString(talent.overview?.workSchedule) ||
          getNonEmptyString(talent.availability)
        const location =
          getNonEmptyString(talent.country) ||
          getNonEmptyString(talent.location)
        const rating = Number(talent.rating)
        const projects = Number(
          talent.totalProjectsCompleted ?? talent.reviewsCount ?? 0
        )

        return {
          id: card.id,
          name: card.name,
          handle: card.handle,
          title:
            card.role && card.role !== "Marketing Technologist"
              ? card.role
              : roleFilter,
          experience,
          location,
          level,
          hourlyRate: rate,
          skillsMatch: `${rawSkills.length} Matching Skills`,
          availability,
          avatar: card.photo === "/man.jpg" ? "" : card.photo,
          skills: rawSkills.slice(0, INVITE_VISIBLE_SKILL_COUNT + 5),
          rating: Number.isFinite(rating) ? rating : 0,
          projects: Number.isFinite(projects) ? projects : 0,
          match: talent.aiMatchScore ?? 0,
        }
      })
      .filter((candidate) => candidate.match > 0)
      .sort((a, b) => b.match - a.match)
      .slice(0, 30)
  }, [roleFilter, talents])
  const visibleCandidates = rankedCandidates
  const hasAnyInvites = inviteBalance > 0
  const shouldPromptForMoreInvites = inviteBalance < 30
  const inviteCandidateIds = visibleCandidates
    .slice(0, 30)
    .map((candidate) => candidate.id)
  const selectedInviteCount = inviteCandidateIds.length
  const hasInsufficientInviteBalance =
    hasAnyInvites && selectedInviteCount > inviteBalance
  const sendInviteButtonLabel = `Send ${selectedInviteCount} Invite${
    selectedInviteCount === 1 ? "" : "s"
  }`
  const currentFilterSet = useMemo<InviteFilterSet>(
    () => ({
      locations: selectedLocations,
      experiences: selectedExperiences,
      schedules: selectedSchedules,
      rate: selectedRate,
    }),
    [selectedExperiences, selectedLocations, selectedRate, selectedSchedules]
  )

  useEffect(() => {
    if (roleFilter) return

    applyFilterSet(emptyInviteFilterSet)
    setAppliedFilterSet(emptyInviteFilterSet)
  }, [roleFilter])

  useEffect(() => {
    if (!jobListingId) {
      return
    }

    let isMounted = true

    const loadJobListing = async () => {
      try {
        setIsLoadingListing(true)
        setListingLoadError("")
        setHasLoadedListingContext(false)
        const response = await JobListingAPI.Get(jobListingId)
        if (!isMounted) return

        const listing = response?.data
        const listingRoles = getRolesFromListing(listing)

        setInviteBalance(Number(listing?.inviteBalance ?? 0))
        setListingSkills(getSkillsFromListing(listing))
        setListingContext({
          workType: listing?.workType ?? "",
          description: listing?.description ?? "",
          deliverables: listing?.deliverables ?? "",
          successCriteria: listing?.successCriteria ?? "",
        })
        if (listingRoles.length > 0) {
          setRoleOptions(
            listingRoles.map((role) => ({
              id: normalizeRoleId(role),
              label: role,
              state: "Unfiltered",
            }))
          )
          setRoleFilter((current) =>
            listingRoles.some((role) => role === current)
              ? current
              : listingRoles[0]
          )
        } else {
          setRoleOptions([])
          setRoleFilter("")
          setListingLoadError(
            "This job listing does not have saved roles yet. Add roles in the scope step before inviting talent."
          )
        }
        setHasLoadedListingContext(true)
      } catch (error: any) {
        if (!isMounted) return

        setRoleOptions([])
        setRoleFilter("")
        setListingSkills([])
        setListingContext({
          workType: "",
          description: "",
          deliverables: "",
          successCriteria: "",
        })
        setListingLoadError(
          error?.response?.status === 404
            ? "This job listing could not be found. Go back to My Jobs and open a saved draft or published job."
            : error?.response?.data?.message ||
                error?.message ||
                "Unable to load this job listing."
        )
        setHasLoadedListingContext(true)
        toast({
          title:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load invite balance for this job.",
          variant: "destructive",
        })
      } finally {
        if (isMounted) {
          setIsLoadingListing(false)
        }
      }
    }

    void loadJobListing()

    return () => {
      isMounted = false
    }
  }, [jobListingId, toast])

  const activeFilterCount =
    appliedFilterSet.locations.length +
    appliedFilterSet.experiences.length +
    appliedFilterSet.schedules.length +
    (appliedFilterSet.rate ? 1 : 0)
  const filteredRoleCount = applyToAllRoles
    ? roleOptions.length
    : roleOptions.filter((role) =>
        hasInviteFilterSetValues(
          roleFilterSets[role.id] ?? emptyInviteFilterSet
        )
      ).length
  const roleProgressValue =
    roleOptions.length > 0 ? (filteredRoleCount / roleOptions.length) * 100 : 0
  const displayedTeamRoles = roleOptions.map((role) => {
    const completed =
      applyToAllRoles ||
      hasInviteFilterSetValues(roleFilterSets[role.id] ?? emptyInviteFilterSet)

    return {
      ...role,
      completed,
      state: completed ? "Filtered" : role.state,
    }
  })
  const filteredLocations = useMemo(
    () =>
      locationOptions.filter((option) =>
        option.toLowerCase().includes(locationSearch.toLowerCase())
      ),
    [locationSearch]
  )

  const toggleMultiValue = (
    value: string,
    current: string[],
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    )
  }
  const applyFilterSet = (filterSet: InviteFilterSet) => {
    setSelectedLocations(filterSet.locations)
    setSelectedExperiences(filterSet.experiences)
    setSelectedSchedules(filterSet.schedules)
    setSelectedRate(filterSet.rate)
  }
  const handleFilterPopoverOpenChange =
    (setter: Dispatch<SetStateAction<boolean>>) => (open: boolean) => {
      setter(open)
      if (!open) {
        applyFilterSet(appliedFilterSet)
      }
    }
  const persistCurrentRoleFilters = (filterSet = currentFilterSet) => {
    if (!roleFilter) return

    setRoleFilterSets((current) => ({
      ...current,
      [normalizeRoleId(roleFilter)]: filterSet,
    }))
  }
  const handleRoleChange = (role: TeamRoleOption) => {
    if (applyToAllRoles) {
      setIsRoleOpen(false)
      return
    }

    setRoleFilter(role.label)
    const nextFilterSet = roleFilterSets[role.id] ?? emptyInviteFilterSet
    applyFilterSet(nextFilterSet)
    setAppliedFilterSet(nextFilterSet)
    setIsRoleOpen(false)
  }
  const applyCurrentFiltersToAllRoles = (filterSet = currentFilterSet) => {
    setRoleFilterSets((current) => {
      const next = { ...current }
      roleOptions.forEach((role) => {
        next[role.id] = filterSet
      })
      return next
    })
  }
  const commitCurrentFilters = () => {
    if (applyToAllRoles) {
      applyCurrentFiltersToAllRoles()
      setAppliedFilterSet(currentFilterSet)
      return
    }

    persistCurrentRoleFilters()
    setAppliedFilterSet(currentFilterSet)
  }
  const handleApplyToAllRolesChange = (checked: boolean) => {
    setApplyToAllRoles(checked)
    if (checked) {
      applyCurrentFiltersToAllRoles()
      setAppliedFilterSet(currentFilterSet)
      setIsRoleOpen(false)
      return
    }

    if (roleFilter) {
      const activeRoleId = normalizeRoleId(roleFilter)
      const activeRoleFilterSet =
        roleFilterSets[activeRoleId] ?? currentFilterSet

      setRoleFilterSets({ [activeRoleId]: activeRoleFilterSet })
      applyFilterSet(activeRoleFilterSet)
      setAppliedFilterSet(activeRoleFilterSet)
    } else {
      setRoleFilterSets({})
      setAppliedFilterSet(emptyInviteFilterSet)
    }
  }
  const selectedInvitePackPrice =
    selectedInvitePack === "1,000 invites"
      ? "$90"
      : selectedInvitePack === "500 invites"
        ? "$45"
        : "$25"
  const selectedPlanAmount =
    selectedBillingCycle === "annual"
      ? getPlanMonthlyAmount(selectedPlan) * 12
      : getPlanMonthlyAmount(selectedPlan)
  const selectedPlanPrice = `$${selectedPlanAmount}`
  const selectedPlanPeriodLabel =
    selectedBillingCycle === "annual" ? "year" : "month"
  const selectedPlanCheckoutSuffix =
    selectedBillingCycle === "annual" ? "/yr" : "/mo"
  const selectedPaymentOptionDetails = invitePaymentOptions.find(
    (option) => option.id === selectedPaymentOption
  )
  const inviteBalanceLabel =
    inviteBalance >= 100
      ? `${inviteBalance} / 100 invites left`
      : `${inviteBalance} / 50 invites left`
  const parseCurrencyAmount = (value: string) =>
    Number(value.replace(/[^0-9.]/g, "") || 0)
  const checkoutAmount =
    inviteCheckoutMode === "upgrade"
      ? parseCurrencyAmount(selectedPlanPrice)
      : parseCurrencyAmount(selectedInvitePackPrice)
  const discountedCheckoutAmount = Math.max(0, checkoutAmount - giftCardAmount)
  const checkoutTotalLabel = `$${discountedCheckoutAmount.toLocaleString(
    undefined,
    {
      minimumFractionDigits: discountedCheckoutAmount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }
  )}`

  useEffect(() => {
    if (!inviteCheckoutMode) return

    let isMounted = true

    const loadPaymentReadiness = async () => {
      try {
        const [walletResponse, cooldownResponse] = await Promise.allSettled([
          CheckoutAPI.GetWalletBalance(),
          CheckoutAPI.CheckCooldown(),
        ])

        if (!isMounted) return

        if (walletResponse.status === "fulfilled") {
          setWalletBalance(Number(walletResponse.value?.data?.balance || 0))
        }

        if (cooldownResponse.status === "fulfilled") {
          const cooldown = cooldownResponse.value?.data
          if (cooldown?.onCooldown) {
            const endsAt = cooldown.cooldownEndsAt
              ? new Date(cooldown.cooldownEndsAt).toLocaleString()
              : "later"
            setPaymentCooldownMessage(
              `Payment attempts are temporarily paused until ${endsAt}.`
            )
          } else {
            setPaymentCooldownMessage("")
          }
        }
      } catch {
        if (isMounted) setPaymentCooldownMessage("")
      }
    }

    void loadPaymentReadiness()

    return () => {
      isMounted = false
    }
  }, [inviteCheckoutMode])

  useEffect(() => {
    if (!inviteSuccessMessage) return

    const timeoutId = window.setTimeout(() => {
      setInviteSuccessMessage("")
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [inviteSuccessMessage])

  useEffect(() => {
    if (!appliedPromoCode) return
    setGiftCardAmount((amount) => Math.min(amount, checkoutAmount))
  }, [appliedPromoCode, checkoutAmount])

  const handleSendInvites = async () => {
    if (!hasAnyInvites) {
      setInvitePurchaseMode("buy")
      return
    }

    if (inviteCandidateIds.length === 0) {
      toast({
        title: "No AI-recommended talent profiles are available to invite.",
        variant: "destructive",
      })
      return
    }

    if (inviteCandidateIds.length > inviteBalance) {
      setInvitePurchaseMode("buy")
      return
    }

    if (!jobListingId) {
      toast({
        title: "Open this page from a published job before sending invites.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSendingInvites(true)
      await JobListingAPI.SendInvites(jobListingId, {
        talentUserIds: inviteCandidateIds,
        ...inviteRolePayload,
      })
      setInviteBalance((current) =>
        Math.max(0, current - inviteCandidateIds.length)
      )
      setInviteSuccessMessage(
        `${inviteCandidateIds.length} invitation${
          inviteCandidateIds.length === 1 ? "" : "s"
        } ${inviteCandidateIds.length === 1 ? "was" : "were"} sent successfully`
      )
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to send invites right now"

      if (error?.response?.status === 422) {
        setInvitePurchaseMode("buy")
      }

      toast({
        title: message,
        variant: "destructive",
      })
    } finally {
      setIsSendingInvites(false)
    }
  }

  const applyPromoCode = async () => {
    const normalizedCode = promoCodeInput.trim().toUpperCase()
    if (!normalizedCode) {
      toast({
        title: "Enter a gift card or promo code first.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsApplyingPromoCode(true)
      const response = await CheckoutAPI.ApplyGiftCard({ code: normalizedCode })
      const isValid = Boolean(response?.data?.valid)
      const amount = Number(response?.data?.amount || 0)

      if (!isValid || amount <= 0) {
        setAppliedPromoCode("")
        setGiftCardAmount(0)
        toast({
          title: "That gift card or promo code is not valid.",
          variant: "destructive",
        })
        return
      }

      setAppliedPromoCode(normalizedCode)
      setGiftCardAmount(Math.min(amount, checkoutAmount))
      setShowPromoCodeInput(false)
      toast({
        title: "Gift card applied.",
      })
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to apply this code right now.",
        variant: "destructive",
      })
    } finally {
      setIsApplyingPromoCode(false)
    }
  }

  const submitInvitePayment = async () => {
    if (!jobListingId) {
      toast({
        title: "Open this page from a published job before checkout.",
        variant: "destructive",
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Please sign in before submitting payment.",
        variant: "destructive",
      })
      return
    }

    if (!selectedPaymentOptionDetails) {
      toast({
        title: "Select a payment method before submitting payment.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmittingPayment(true)
      const response = await CheckoutAPI.CreateSession({
        projectId: jobListingId,
        clientId: user.id,
        paymentMethod: selectedPaymentMethod,
        installmentPlanOption:
          inviteCheckoutMode === "upgrade"
            ? selectedBillingCycle === "annual"
              ? "yearly"
              : "monthly"
            : "full",
        amount: checkoutAmount,
        giftCardCode: appliedPromoCode || undefined,
        successUrl: `${window.location.origin}/invite-talent?jobListingId=${encodeURIComponent(
          jobListingId
        )}&inviteCheckoutSessionId={CHECKOUT_SESSION_ID}&inviteCheckoutMode=${inviteCheckoutMode}&invitePack=${encodeURIComponent(
          selectedInvitePack
        )}&invitePlan=${encodeURIComponent(selectedPlan)}`,
        cancelUrl: `${window.location.origin}/invite-talent?jobListingId=${encodeURIComponent(
          jobListingId
        )}`,
      })
      const checkoutUrl = response?.data?.checkoutUrl
      const checkoutSessionId = response?.data?.sessionId

      if (checkoutUrl) {
        if (checkoutSessionId) {
          window.sessionStorage.setItem(
            inviteCheckoutStorageKey(checkoutSessionId),
            JSON.stringify({
              mode: inviteCheckoutMode,
              invitePack: selectedInvitePack,
              plan: selectedPlan,
              billingCycle: selectedBillingCycle,
              giftCardCode: appliedPromoCode || undefined,
              giftCardAmount,
              applyToAllRoles,
              ...inviteRolePayload,
              talentUserIds: inviteCandidateIds,
            })
          )
        }
        window.location.assign(checkoutUrl)
        return
      }

      toast({
        title: "Payment session created, but no checkout URL was returned.",
        variant: "destructive",
      })
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to start payment right now",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  useEffect(() => {
    const checkoutSessionId = searchParams.get("inviteCheckoutSessionId")
    if (!checkoutSessionId || !jobListingId) return

    const processedKey = processedInviteCheckoutStorageKey(checkoutSessionId)
    if (window.sessionStorage.getItem(processedKey)) return

    let isMounted = true

    const completeInviteCheckout = async () => {
      try {
        setIsCompletingPayment(true)
        window.sessionStorage.setItem(processedKey, "in_progress")

        await CheckoutAPI.Confirm({ sessionId: checkoutSessionId })
        const statusResponse = await CheckoutAPI.GetStatus(checkoutSessionId)
        const checkoutStatus = statusResponse?.data?.status
        const paymentVerified = Boolean(statusResponse?.data?.paymentVerified)

        if (checkoutStatus !== "success" && !paymentVerified) {
          window.sessionStorage.removeItem(processedKey)
          toast({
            title:
              checkoutStatus === "failed"
                ? "Payment failed. Please try another payment method."
                : "Payment is still pending. We will unlock invites after it is confirmed.",
            variant: checkoutStatus === "failed" ? "destructive" : "default",
          })
          return
        }

        const pendingRaw = window.sessionStorage.getItem(
          inviteCheckoutStorageKey(checkoutSessionId)
        )
        const pending = pendingRaw ? JSON.parse(pendingRaw) : {}
        const checkoutMode =
          pending.mode || searchParams.get("inviteCheckoutMode") || "buy"
        const checkoutPack =
          pending.invitePack ||
          searchParams.get("invitePack") ||
          selectedInvitePack
        const checkoutPlan =
          pending.plan || searchParams.get("invitePlan") || selectedPlan
        const creditedInvites =
          checkoutMode === "upgrade"
            ? getPlanInviteCount(checkoutPlan)
            : getInvitePackCount(checkoutPack)

        const creditResponse = await JobListingAPI.CreditInviteBalance(
          jobListingId,
          {
            inviteCount: creditedInvites,
            checkoutSessionId,
          }
        )
        const nextBalance = Number(creditResponse?.data?.inviteBalance)
        if (isMounted && !Number.isNaN(nextBalance)) {
          setInviteBalance(nextBalance)
        }

        const talentUserIds = Array.isArray(pending.talentUserIds)
          ? pending.talentUserIds.filter(
              (candidateId: unknown): candidateId is string =>
                typeof candidateId === "string"
            )
          : []

        if (talentUserIds.length > 0) {
          await JobListingAPI.SendInvites(jobListingId, {
            talentUserIds,
            roleRowId: pending.applyToAllRoles
              ? undefined
              : pending.roleRowId || roleRowId,
            roleTitle: pending.applyToAllRoles
              ? undefined
              : pending.roleTitle || roleFilter,
          })
          if (isMounted) {
            setInviteBalance((current) =>
              Math.max(0, current - talentUserIds.length)
            )
            setInviteSuccessMessage(
              `${talentUserIds.length} invite${
                talentUserIds.length === 1 ? "" : "s"
              } sent successfully`
            )
          }
        } else if (isMounted) {
          setInviteSuccessMessage(
            `${creditedInvites} Invites successfully purchased`
          )
        }

        window.sessionStorage.removeItem(
          inviteCheckoutStorageKey(checkoutSessionId)
        )
        window.sessionStorage.setItem(processedKey, "complete")
        if (isMounted) {
          setInvitePurchaseMode(null)
          setInviteCheckoutMode(null)
        }
      } catch (error: any) {
        window.sessionStorage.removeItem(processedKey)
        toast({
          title:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to complete invite checkout.",
          variant: "destructive",
        })
      } finally {
        if (isMounted) {
          setIsCompletingPayment(false)
        }
      }
    }

    void completeInviteCheckout()

    return () => {
      isMounted = false
    }
  }, [
    applyToAllRoles,
    jobListingId,
    roleFilter,
    roleRowId,
    searchParams,
    selectedInvitePack,
    selectedPlan,
    toast,
  ])

  return (
    <div className="h-screen bg-gray-25">
      <div className="flex h-screen flex-col bg-gray-25">
        {inviteSuccessMessage ? (
          <div
            className="fixed left-1/2 top-8 z-[60] flex min-h-[52px] w-[min(420px,calc(100vw-48px))] -translate-x-1/2 items-center gap-4 rounded-[5px] bg-success-500 px-6 py-3 text-white shadow-[0px_6px_16px_0px_rgba(0,0,0,.12)]"
            role="status"
            aria-live="polite"
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white/80">
              <Check className="size-4" />
            </span>
            <span className="text-[15px] font-semibold leading-normal">
              {inviteSuccessMessage}
            </span>
          </div>
        ) : null}
        <InviteTalentShellHeader
          title="Invite Additional Talent"
          description="Send up to 30 invites to fill your open roles. The more invites you send out now, the faster you can start your project."
          onClose={() => router.back()}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1760px] px-10 py-5 pb-[88px]">
            <div className="flex items-center justify-between gap-4 pb-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] leading-normal">
                <span className="font-medium text-dark-blue-400">
                  {isLoadingTalents
                    ? "Loading available profiles that match your project requirements"
                    : `We found ${visibleCandidates.length} available profiles that match your project requirements`}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="font-semibold text-primary-500 hover:underline"
                    >
                      How it works?
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="isolate z-[100] w-[340px] rounded-[8px] border-gray-200 bg-white p-4 text-[13px] leading-5 text-gray-500 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                    <h2 className="text-[14px] font-semibold leading-none text-dark-blue-400">
                      Invite flow
                    </h2>
                    <div className="mt-3 space-y-2">
                      <p>
                        Recommendations come from active talent profiles matched
                        to the selected role or all roles, saved listing
                        context, and filters.
                      </p>
                      <p>
                        The visible AI-recommended list is included when invites
                        are sent. If the job has too few invites, buy a one-time
                        pack or upgrade the plan before sending.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                variant="outlined"
                visual="gray"
                size="md"
                className="shrink-0"
                onClick={() => setShowFilters((current) => !current)}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {isCompletingPayment ? (
              <div className="mt-4 rounded-[8px] border border-primary-100 bg-primary-50 px-4 py-3 text-[14px] font-semibold leading-normal text-primary-600">
                Confirming payment and preparing invites...
              </div>
            ) : null}

            <div className="mt-2 grid gap-x-6 gap-y-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              {showFilters ? (
                <div className="flex flex-wrap items-center justify-between gap-3 xl:col-span-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-[8px] bg-gray-100 px-3 py-2">
                      <span className="text-[14px] font-medium leading-normal text-dark-blue-400">
                        Filter Scope:
                      </span>
                      <Popover
                        open={isRoleOpen}
                        onOpenChange={(open) => {
                          setIsRoleOpen(applyToAllRoles ? false : open)
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            disabled={
                              applyToAllRoles || roleOptions.length === 0
                            }
                            className="h-7 rounded-[6px] border-gray-200 bg-gray-100 px-[5px] py-[6px]"
                          >
                            {roleSelectorLabel}
                            {!applyToAllRoles ? (
                              <ChevronDown className="ml-[6px] size-4" />
                            ) : null}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[180px] rounded-[8px] border-gray-200 bg-white p-2 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                          <div className="space-y-1">
                            {roleOptions.map((role) => (
                              <button
                                key={role.id}
                                type="button"
                                className="flex w-full rounded-[6px] px-2 py-2 text-left text-[14px] font-medium text-dark-blue-400 hover:bg-gray-50"
                                onClick={() => handleRoleChange(role)}
                              >
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Popover
                      open={isLocationOpen}
                      onOpenChange={handleFilterPopoverOpenChange(
                        setIsLocationOpen
                      )}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                        >
                          Location
                          <ChevronDown className="ml-2 size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                        <div className="border-b border-gray-200 p-3">
                          <SearchField className="w-full">
                            <SearchFieldInput
                              className="pr-[42px]"
                              placeholder="Search"
                              value={locationSearch}
                              onChange={(event) =>
                                setLocationSearch(event.target.value)
                              }
                            />
                            <SearchFieldButton>
                              <FilterLines className="size-4 text-gray-400" />
                            </SearchFieldButton>
                          </SearchField>
                        </div>
                        <ScrollArea className="h-[220px] px-3 py-2">
                          <div className="space-y-1">
                            {filteredLocations.map((option) => (
                              <label
                                key={option}
                                className="flex items-center gap-3 rounded-[6px] py-2"
                              >
                                <Checkbox
                                  checked={selectedLocations.includes(option)}
                                  onCheckedChange={() => {
                                    toggleMultiValue(
                                      option,
                                      selectedLocations,
                                      setSelectedLocations
                                    )
                                  }}
                                />
                                <span className="text-[14px] font-medium text-gray-500">
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex items-center justify-between border-t border-gray-200 p-3">
                          <Button
                            variant="link"
                            visual="gray"
                            className="px-0 text-[14px] font-semibold text-gray-500"
                            onClick={() => setSelectedLocations([])}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              commitCurrentFilters()
                              setIsLocationOpen(false)
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover
                      open={isExperienceOpen}
                      onOpenChange={handleFilterPopoverOpenChange(
                        setIsExperienceOpen
                      )}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                        >
                          Experience Level
                          <ChevronDown className="ml-2 size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="isolate z-[100] w-[278px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                        <div className="px-3 py-2">
                          {experienceOptions.map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-3 rounded-[6px] py-3"
                            >
                              <Checkbox
                                checked={selectedExperiences.includes(option)}
                                onCheckedChange={() => {
                                  toggleMultiValue(
                                    option,
                                    selectedExperiences,
                                    setSelectedExperiences
                                  )
                                }}
                              />
                              <span className="text-[14px] font-medium text-gray-500">
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 p-3">
                          <Button
                            variant="link"
                            visual="gray"
                            className="px-0 text-[14px] font-semibold text-gray-500"
                            onClick={() => setSelectedExperiences([])}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              commitCurrentFilters()
                              setIsExperienceOpen(false)
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover
                      open={isScheduleOpen}
                      onOpenChange={handleFilterPopoverOpenChange(
                        setIsScheduleOpen
                      )}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                        >
                          Work Schedule
                          <ChevronDown className="ml-2 size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                        <div className="px-3 py-2">
                          {workScheduleOptions.map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-3 rounded-[6px] py-3"
                            >
                              <Checkbox
                                checked={selectedSchedules.includes(option)}
                                onCheckedChange={() => {
                                  toggleMultiValue(
                                    option,
                                    selectedSchedules,
                                    setSelectedSchedules
                                  )
                                }}
                              />
                              <span className="text-[14px] font-medium text-gray-500">
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 p-3">
                          <Button
                            variant="link"
                            visual="gray"
                            className="px-0 text-[14px] font-semibold text-gray-500"
                            onClick={() => setSelectedSchedules([])}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              commitCurrentFilters()
                              setIsScheduleOpen(false)
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover
                      open={isRateOpen}
                      onOpenChange={handleFilterPopoverOpenChange(
                        setIsRateOpen
                      )}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                        >
                          Hourly Rate
                          <ChevronDown className="ml-2 size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                        <ScrollArea className="h-[220px] px-3 py-2">
                          <RadioGroup
                            value={selectedRate}
                            onValueChange={(value) => {
                              setSelectedRate(value)
                            }}
                            className="gap-y-0"
                          >
                            {rateOptions.map((rawOption) => {
                              const option = rawOption.replace(
                                /[^\x00-\x7F]+/g,
                                "-"
                              )

                              return (
                                <label
                                  key={option}
                                  className="flex items-center gap-3 rounded-[6px] py-3"
                                >
                                  <RadioGroupItem
                                    value={option}
                                    size="lg"
                                    className="border-gray-300 data-[state=checked]:border-primary-500 data-[state=checked]:text-primary-500"
                                  />
                                  <span className="text-[14px] font-medium text-gray-500">
                                    {option}
                                  </span>
                                </label>
                              )
                            })}
                          </RadioGroup>
                        </ScrollArea>
                        <div className="flex items-center justify-between border-t border-gray-200 p-3">
                          <Button
                            variant="link"
                            visual="gray"
                            className="px-0 text-[14px] font-semibold text-gray-500"
                            onClick={() => setSelectedRate("")}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              commitCurrentFilters()
                              setIsRateOpen(false)
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <label className="inline-flex items-center gap-3">
                    <Switch
                      visual="blue"
                      checked={applyToAllRoles}
                      onCheckedChange={(checked) =>
                        handleApplyToAllRolesChange(Boolean(checked))
                      }
                    />
                    <span className="text-[14px] font-semibold leading-normal text-gray-500">
                      Apply to All Roles
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="min-w-0 overflow-hidden">
                {isLoadingTalents || isLoadingListing ? (
                  <Card className="flex-col items-start rounded-[8px] border-gray-200 bg-white p-6 shadow-none hover:border-gray-200 hover:ring-0">
                    <div className="flex items-center gap-3 text-[14px] font-medium leading-normal text-dark-blue-400">
                      <Spinner size={18} strokeWidth={2} />
                      <span>Updating AI recommendations...</span>
                    </div>
                  </Card>
                ) : null}
                {!isLoadingTalents &&
                !isLoadingListing &&
                visibleCandidates.length === 0 ? (
                  <Card className="flex-col items-start rounded-[8px] border-gray-200 bg-white p-6 shadow-none hover:border-gray-200 hover:ring-0">
                    <h2 className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                      No AI recommendations available
                    </h2>
                    <p className="mt-2 text-[14px] font-light leading-normal text-gray-500">
                      {listingLoadError
                        ? listingLoadError
                        : activeFilterCount > 0
                          ? "No recommended profiles matched this role and filter set."
                          : recommendationStatus === "NO_TALENT"
                            ? "No active talent profiles are available for the AI to recommend."
                            : recommendationStatus === "AI_UNAVAILABLE" ||
                                recommendationStatus === "ERROR"
                              ? recommendationMessage ||
                                "AI recommendations are unavailable right now."
                              : "No recommended profiles matched this role and filter set."}
                    </p>
                  </Card>
                ) : null}
                {!isLoadingTalents && !isLoadingListing
                  ? visibleCandidates.map((candidate) => (
                      <InviteTalentCandidateRow
                        key={candidate.id}
                        candidate={candidate}
                      />
                    ))
                  : null}
              </div>

              <div className="w-full space-y-4 self-start">
                <InviteTalentSideCard>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[15px] font-semibold leading-none text-dark-blue-400">
                        Apply Filters to Your Team
                      </h2>
                      <p className="mt-2.5 text-[13px] font-light leading-[1.45] text-gray-500">
                        Customize filters for better match for each role, or
                        invite without them.
                      </p>
                    </div>
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-gray-400" />
                  </div>

                  <div className="mt-5">
                    <div className="text-[13px] font-medium leading-normal text-gray-500">
                      {filteredRoleCount} / {roleOptions.length} Roles have been
                      filtered
                    </div>
                    <Progress
                      className="mt-3 h-2 bg-gray-100"
                      value={roleProgressValue}
                    />
                  </div>

                  <div className="mt-5">
                    {displayedTeamRoles.length === 0 ? (
                      <p className="text-[13px] font-light leading-normal text-gray-500">
                        {listingLoadError ||
                          "No roles are available for this job listing yet."}
                      </p>
                    ) : null}
                    {displayedTeamRoles.map((role) => {
                      const isActiveRole =
                        !applyToAllRoles && role.label === roleFilter

                      return (
                        <button
                          key={role.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-t border-gray-200 py-3 text-left first:border-t-0 first:pt-0 last:pb-0 disabled:cursor-default"
                          disabled={applyToAllRoles}
                          onClick={() => handleRoleChange(role)}
                          aria-pressed={isActiveRole}
                        >
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold leading-normal text-dark-blue-400">
                              {role.label}
                            </span>
                            <span className="mt-0.5 block text-[13px] font-light leading-normal text-gray-500">
                              {role.state}
                            </span>
                          </span>
                          {role.completed ? (
                            <span className="pointer-events-none inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                              <Check className="size-3.5" />
                            </span>
                          ) : (
                            <span className="pointer-events-none inline-flex h-6 w-6 shrink-0 rounded-full border-[1.5px] border-gray-300 bg-white" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </InviteTalentSideCard>

                <InviteTalentSideCard>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-semibold leading-tight text-dark-blue-400">
                        {inviteBalanceLabel}
                      </h2>
                    </div>
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-gray-400" />
                  </div>

                  <p className="mt-3 text-[13px] font-light leading-[1.45] text-gray-500">
                    {shouldPromptForMoreInvites
                      ? "Buy more invites or upgrade your plan to invite talents."
                      : "You have enough invites to cover all roles for this job"}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <Button
                      className="w-full"
                      variant="outlined"
                      visual="gray"
                      onClick={() => setInvitePurchaseMode("buy")}
                    >
                      Buy More Invites
                    </Button>
                    <Button
                      className="w-full"
                      variant="outlined"
                      visual="gray"
                      onClick={() => setInvitePurchaseMode("upgrade")}
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </InviteTalentSideCard>
              </div>
            </div>
          </div>
        </div>

        <InviteTalentShellFooter
          hasAnyInvites={hasAnyInvites}
          hasInsufficientInviteBalance={hasInsufficientInviteBalance}
          isLoadingListing={isLoadingListing}
          isSendingInvites={isSendingInvites || isCompletingPayment}
          selectedTalentCount={selectedInviteCount}
          sendInviteButtonLabel={sendInviteButtonLabel}
          onBuyMore={() => setInvitePurchaseMode("buy")}
          onUpgradePlan={() => setInvitePurchaseMode("upgrade")}
          onSendInvites={handleSendInvites}
        />

        <Dialog
          open={Boolean(invitePurchaseMode && !inviteCheckoutMode)}
          onOpenChange={(open) => {
            if (!open) setInvitePurchaseMode(null)
          }}
        >
          <DialogContent
            accessibilityTitle={
              invitePurchaseMode === "upgrade"
                ? "Upgrade your current plan"
                : "Buy more invites"
            }
            className={`max-w-none rounded-[12px] border border-gray-200 bg-white p-0 shadow-lg ${
              invitePurchaseMode === "upgrade"
                ? "w-[min(980px,calc(100vw-48px))]"
                : "w-[min(704px,calc(100vw-48px))]"
            }`}
          >
            <div className="relative px-7 py-6">
              <DialogClose asChild>
                <IconButton
                  className="absolute right-5 top-5"
                  variant="ghost"
                  visual="gray"
                  size="sm"
                >
                  <X className="size-5 text-gray-400" />
                </IconButton>
              </DialogClose>

              {invitePurchaseMode === "buy" ? (
                <>
                  <DialogTitle className="pr-10 text-[26px] font-bold leading-tight text-dark-blue-400">
                    You are out of invites
                  </DialogTitle>
                  <DialogDescription className="mt-3 text-[15px] font-light leading-normal text-dark-blue-400">
                    <span className="font-semibold">0 of 50 invites left</span>{" "}
                    right now. Buy more invites.
                  </DialogDescription>
                  <RadioGroup
                    value={selectedInvitePack}
                    onValueChange={setSelectedInvitePack}
                    className="mt-6 grid gap-3 md:grid-cols-3"
                  >
                    {[
                      ["100 invites", "100", "$25"],
                      ["500 invites", "500", "$45"],
                      ["1,000 invites", "1,000", "$90"],
                    ].map(([value, count, price]) => (
                      <label
                        key={value}
                        className={`flex min-h-[96px] items-start justify-between gap-3 rounded-[8px] border p-4 ${
                          selectedInvitePack === value
                            ? "border-primary-500"
                            : "border-gray-200"
                        }`}
                      >
                        <span>
                          <span className="block text-[30px] font-bold leading-none text-dark-blue-400">
                            {count}
                          </span>
                          <span className="mt-3 block text-[15px] font-light leading-normal text-gray-500">
                            invites for {price}
                          </span>
                        </span>
                        <RadioGroupItem value={value} size="md" />
                      </label>
                    ))}
                  </RadioGroup>
                  <p className="mt-5 flex items-center gap-3 text-[13px] font-light leading-normal text-gray-500">
                    <HelpCircle className="size-4 shrink-0" />
                    These invites are a one-time purchase you can use right
                    away. No recurring charges.
                  </p>
                  <Button
                    className="mt-7 h-11 w-full"
                    onClick={() => {
                      setHasAuthorizedPayment(false)
                      setShowPaymentMethodPicker(false)
                      setInviteCheckoutMode("buy")
                    }}
                  >
                    Go to Payment
                  </Button>
                  <p className="mt-4 text-center text-[13px] font-light leading-normal text-gray-500">
                    Do you want to upgrade your plan?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary-500"
                      onClick={() => setInvitePurchaseMode("upgrade")}
                    >
                      Upgrade My Plan
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <DialogTitle className="pr-10 text-[28px] font-bold leading-tight text-dark-blue-400">
                    Upgrade Your Current Plan
                  </DialogTitle>
                  <div className="mt-6 flex gap-3">
                    <Button
                      type="button"
                      variant="outlined"
                      visual={
                        selectedBillingCycle === "monthly" ? "primary" : "gray"
                      }
                      onClick={() => setSelectedBillingCycle("monthly")}
                    >
                      Monthly
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      visual={
                        selectedBillingCycle === "annual" ? "primary" : "gray"
                      }
                      onClick={() => setSelectedBillingCycle("annual")}
                    >
                      Annual
                    </Button>
                  </div>
                  <RadioGroup
                    value={selectedPlan}
                    onValueChange={setSelectedPlan}
                    className="mt-5 grid gap-3 md:grid-cols-3"
                  >
                    {upgradePlanOptions.map(
                      ({ label, monthlyAmount, invites }) => (
                        <label
                          key={label}
                          className={`flex min-h-[210px] flex-col rounded-[8px] border p-4 ${
                            selectedPlan === label
                              ? "border-primary-500"
                              : "border-gray-200"
                          }`}
                        >
                          <span className="flex items-start justify-between gap-4">
                            <span className="text-[18px] font-semibold leading-normal text-dark-blue-400">
                              {label}
                            </span>
                            <RadioGroupItem value={label} size="md" />
                          </span>
                          <span className="mt-4 text-[30px] font-bold leading-none text-dark-blue-400">
                            $
                            {selectedBillingCycle === "annual"
                              ? monthlyAmount * 12
                              : monthlyAmount}
                            <span className="text-[18px] font-light">
                              /{selectedPlanPeriodLabel}
                            </span>
                          </span>
                          <span className="mt-5 text-[11px] font-semibold uppercase leading-normal text-gray-400">
                            Core features include:
                          </span>
                          {[
                            invites,
                            "Priority matching with top talent",
                            "Advanced project management tools",
                          ].map((feature) => (
                            <span
                              key={`${label}-${feature}`}
                              className="mt-3 flex items-center gap-2 text-[13px] font-semibold leading-normal text-dark-blue-400"
                            >
                              <span className="inline-flex size-4 items-center justify-center rounded-full bg-success-500 text-white">
                                <Check className="size-3" />
                              </span>
                              {feature}
                            </span>
                          ))}
                        </label>
                      )
                    )}
                  </RadioGroup>
                  <Button
                    className="mt-7 h-11 w-full"
                    disabled={selectedPlan === "Essentials"}
                    onClick={() => {
                      setHasAuthorizedPayment(false)
                      setShowPaymentMethodPicker(false)
                      setInviteCheckoutMode("upgrade")
                    }}
                  >
                    Go to Payment
                  </Button>
                  <p className="mt-4 text-center text-[13px] font-light leading-normal text-gray-500">
                    Do you want to buy more invites?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary-500"
                      onClick={() => setInvitePurchaseMode("buy")}
                    >
                      Buy more
                    </button>
                  </p>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {inviteCheckoutMode ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-25 scrollbar-none">
            <div className="flex h-16 items-center border-b border-gray-200 bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.08)]">
              <div className="mx-auto flex w-[min(1140px,calc(100vw-48px))] items-center gap-6 text-[18px] font-semibold leading-none text-dark-blue-400">
                <Logo3 className="h-[18.81px] w-[128px] shrink-0" />
                <span className="h-6 border-l border-gray-200" />
                <span className="inline-flex items-center gap-2 text-gray-500">
                  <Lock className="size-[18px]" />
                  Secure Checkout
                </span>
              </div>
            </div>
            <div className="mx-auto grid w-[min(1140px,calc(100vw-48px))] gap-8 py-4 xl:grid-cols-[minmax(0,803px)_305px]">
              <div className="space-y-4">
                <h2 className="text-[24px] font-bold leading-none text-dark-blue-400">
                  Checkout
                </h2>
                <Card className="flex-col items-stretch justify-start rounded-[8px] border-gray-200 bg-white p-0 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <h3 className="text-[18px] font-semibold leading-none text-dark-blue-400">
                      {inviteCheckoutMode === "upgrade"
                        ? `${selectedPlan} Plan`
                        : "Invite Details"}
                    </h3>
                    {inviteCheckoutMode === "upgrade" ? (
                      <p className="mt-3 text-[16px] font-light leading-normal text-dark-blue-400">
                        {selectedBillingCycle === "annual"
                          ? "Annual Subscription"
                          : "Monthly Subscription"}
                      </p>
                    ) : null}
                  </div>
                  <div className="px-5 py-4">
                    {inviteCheckoutMode === "upgrade" ? (
                      <div>
                        <h4 className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                          Top up your plan&apos;s invite numbers
                        </h4>
                        <div className="mt-4 grid gap-5 md:grid-cols-2">
                          <div>
                            <Label>Number of invites</Label>
                            <div className="mt-2 flex h-12 rounded-[5px] border border-gray-200 bg-white">
                              <button
                                className="w-12 border-r border-gray-200 text-gray-400"
                                type="button"
                              >
                                -
                              </button>
                              <div className="grid flex-1 place-items-center text-[18px] text-dark-blue-400">
                                {getPlanInviteCount(selectedPlan)}
                              </div>
                              <button
                                className="w-12 border-l border-gray-200 text-gray-500"
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label>Plan&apos;s price</Label>
                            <Input
                              className="mt-2"
                              readOnly
                              value={`${selectedPlanPrice} / ${selectedPlanPeriodLabel}`}
                            />
                          </div>
                        </div>
                        <p className="mt-4 text-[13px] font-light leading-normal text-gray-500">
                          Your plan includes a fixed number of invites. You may
                          add more, and the price adjusts automatically.
                        </p>
                      </div>
                    ) : (
                      <>
                        <RadioGroup
                          value={selectedInvitePack}
                          onValueChange={setSelectedInvitePack}
                          className="grid gap-3 md:grid-cols-3"
                        >
                          {[
                            ["100 invites", "100", "$25"],
                            ["500 invites", "500", "$45"],
                            ["1,000 invites", "1,000", "$90"],
                          ].map(([value, count, price]) => (
                            <label
                              key={value}
                              className={`flex min-h-[78px] items-start justify-between gap-3 rounded-[8px] border px-4 py-3 ${
                                selectedInvitePack === value
                                  ? "border-primary-500"
                                  : "border-gray-200"
                              }`}
                            >
                              <span>
                                <span className="block text-[26px] font-bold leading-none text-dark-blue-400">
                                  {count}
                                </span>
                                <span className="mt-1.5 block text-[13px] font-light leading-normal text-gray-500">
                                  invites for {price}
                                </span>
                              </span>
                              <RadioGroupItem value={value} size="md" />
                            </label>
                          ))}
                        </RadioGroup>
                        <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                          These invites are a one-time purchase you can use
                          right away. No recurring charges.
                        </p>
                      </>
                    )}
                  </div>
                </Card>

                <Card className="flex-col items-stretch justify-start rounded-[8px] border-gray-200 bg-white p-0 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="flex items-start justify-between border-b border-gray-200 p-4">
                    <div>
                      <h3 className="text-[17px] font-semibold leading-none text-dark-blue-400">
                        {selectedPaymentOptionDetails
                          ? "Payment Method"
                          : "Select payment method"}
                      </h3>
                      {selectedPaymentOptionDetails ? (
                        <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                          {selectedPaymentOptionDetails.title}
                        </p>
                      ) : null}
                    </div>
                    {selectedPaymentOptionDetails ? (
                      <Button
                        type="button"
                        variant="link"
                        visual="primary"
                        onClick={() =>
                          setShowPaymentMethodPicker((isOpen) => !isOpen)
                        }
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {showPaymentMethodPicker || !selectedPaymentOptionDetails ? (
                    <div
                      className={
                        selectedPaymentOptionDetails
                          ? "border-b border-gray-200 p-4"
                          : "p-4"
                      }
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        {invitePaymentOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`flex min-h-[78px] flex-col items-center justify-center rounded-[8px] border p-2.5 text-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 hover:ring-1 hover:ring-gray-200 ${
                              selectedPaymentOption === option.id
                                ? "border-primary-500"
                                : "border-gray-200"
                            }`}
                            onClick={() => {
                              setSelectedPaymentOption(option.id)
                              setSelectedPaymentMethod(option.method)
                              setShowPaymentMethodPicker(false)
                              setHasAuthorizedPayment(false)
                            }}
                          >
                            <span className="flex min-h-6 items-center justify-center gap-[3px] [&>svg]:shrink-0">
                              {option.icons.map((icon) => icon)}
                            </span>
                            <span className="mt-1.5 text-[12px] font-semibold leading-4 text-dark-blue-400">
                              {option.title}
                            </span>
                            <span className="mt-0.5 max-w-[180px] text-[10px] font-light leading-[14px] text-gray-500">
                              {option.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedPaymentOptionDetails && !showPaymentMethodPicker ? (
                    <div className="p-4">
                      <div className="flex gap-4">
                        <span className="flex h-[30px] min-w-[45px] items-center justify-center rounded bg-primary-500 px-2 text-[10px] font-bold uppercase leading-none text-white">
                          {selectedPaymentMethod === "card"
                            ? "AMEX"
                            : selectedPaymentOptionDetails.icons[0]}
                        </span>
                        <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <div>
                            <p className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              {selectedPaymentMethod === "card"
                                ? "AMEX credit card ending in *1234"
                                : selectedPaymentOptionDetails.title}
                            </p>
                            <p className="text-[13px] font-light leading-normal text-gray-500">
                              {selectedPaymentMethod === "card"
                                ? "Expires: 09/2027"
                                : selectedPaymentOptionDetails.description}
                            </p>
                            <p className="text-[13px] font-light leading-normal text-gray-500">
                              Payment Amount:{" "}
                              <span className="font-semibold text-dark-blue-400">
                                {checkoutTotalLabel}
                              </span>
                            </p>
                            {walletBalance > 0 ? (
                              <p className="text-[12px] font-light leading-normal text-gray-500">
                                Wallet balance available: ${walletBalance}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                              Billing Address
                            </p>
                            <p className="text-[13px] font-light leading-normal text-gray-500">
                              2125 Chestnut Street, San Francisco, CA 94123
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <label className="flex items-center gap-3 text-[13px] font-light leading-normal text-dark-blue-400">
                          <Checkbox
                            checked={hasAuthorizedPayment}
                            onCheckedChange={(checked) =>
                              setHasAuthorizedPayment(Boolean(checked))
                            }
                          />
                          <span>
                            I hereby authorize Marketeq to charge the selected
                            payment method for the total one-time amount of{" "}
                            <span className="font-semibold">
                              {checkoutTotalLabel}
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </Card>
              </div>

              <Card className="h-fit flex-col items-stretch justify-start rounded-[8px] border-gray-200 bg-white p-5 shadow-none hover:border-gray-200 hover:ring-0">
                <h3 className="text-[18px] font-semibold leading-none text-dark-blue-400">
                  Price Details
                </h3>
                <div className="mt-5 space-y-3 text-[13px] leading-normal">
                  <div className="flex justify-between font-semibold text-dark-blue-400">
                    <span>
                      {inviteCheckoutMode === "upgrade"
                        ? `${selectedPlan} plan`
                        : selectedInvitePack}
                    </span>
                    <span>
                      {inviteCheckoutMode === "upgrade"
                        ? `${selectedPlanPrice}${selectedPlanCheckoutSuffix}`
                        : selectedInvitePackPrice}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Estimated tax *</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Gift card applied</span>
                    <span>
                      {giftCardAmount > 0
                        ? `-$${giftCardAmount.toLocaleString()}`
                        : "$0"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-dark-blue-400">
                    <span>Total</span>
                    <span>{checkoutTotalLabel}</span>
                  </div>
                </div>
                {paymentCooldownMessage ? (
                  <p className="mt-4 rounded-[6px] bg-warning-50 px-3 py-2 text-[11px] leading-normal text-warning-700">
                    {paymentCooldownMessage}
                  </p>
                ) : null}
                <Button
                  className="mt-5 h-10 w-full"
                  onClick={submitInvitePayment}
                  disabled={
                    isSubmittingPayment ||
                    isCompletingPayment ||
                    !selectedPaymentOptionDetails ||
                    !hasAuthorizedPayment ||
                    Boolean(paymentCooldownMessage)
                  }
                  loading={isSubmittingPayment || isCompletingPayment}
                  loadingIcon={<Spinner size={16} strokeWidth={2} />}
                >
                  Submit Payment
                </Button>
                <p className="mt-4 text-center text-[11px] font-light leading-normal text-gray-500">
                  By submitting your payment, you agree to Marketeq&apos;s Terms
                  of Use and Privacy Policy
                </p>
                {showPromoCodeInput ? (
                  <div className="mt-4 space-y-2">
                    <Input
                      aria-label="Gift card or promo code"
                      className="h-10 text-[13px]"
                      placeholder="Gift card or promo code"
                      value={promoCodeInput}
                      onChange={(event) =>
                        setPromoCodeInput(event.target.value.toUpperCase())
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-9"
                        type="button"
                        variant="outlined"
                        visual="gray"
                        onClick={() => {
                          setShowPromoCodeInput(false)
                          setPromoCodeInput(appliedPromoCode)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="h-9"
                        type="button"
                        onClick={applyPromoCode}
                        disabled={isApplyingPromoCode}
                        loading={isApplyingPromoCode}
                        loadingIcon={<Spinner size={16} strokeWidth={2} />}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    variant="link"
                    visual="gray"
                    type="button"
                    onClick={() => {
                      setPromoCodeInput(appliedPromoCode)
                      setShowPromoCodeInput(true)
                    }}
                  >
                    {appliedPromoCode
                      ? `${appliedPromoCode} applied`
                      : "Add Gift Card / Promo Code"}
                  </Button>
                )}
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function InviteTalentPage() {
  return <InviteTalentFlow />
}
