"use client"

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import {
  Check,
  ChevronDown,
  FilterLines,
  HelpCircle,
  Send01,
  X,
} from "@blend-metrics/icons"
import StepIndicator from "@/components/ui/step-indicator/step-indicator"
import { JobListingAPI } from "@/service/http/job-listing"
import {
  type TalentUser,
  talentToCardProps,
  useRecommendedTalentUsers,
} from "@/src/lib/api/talent-users"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  HeadlessRadioGroupItem,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  ScrollArea,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Switch,
  useToast,
} from "@/components/ui"

type TeamRoleOption = {
  id: string
  label: string
  state: string
}
const INVITE_VISIBLE_SKILL_COUNT = 3

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

const teamRoles = [
  {
    id: "product-designer",
    label: "Product Designer",
    state: "Unfiltered",
    completed: true,
  },
  {
    id: "full-stack-developer",
    label: "Full-stack Developer",
    state: "Unfiltered",
    completed: true,
  },
  {
    id: "qa-engineer",
    label: "Q/A Engineer",
    state: "Unfiltered",
    completed: false,
  },
]

const locationOptions = [
  "Austria",
  "Arab Emirates",
  "Afghanistan",
  "Algeria",
  "Australia",
]

const experienceOptions = [
  "Student (0 - 2 years)",
  "Junior (2 - 3 years)",
  "Medior (3 - 5 years)",
  "Senior (5 - 10 years)",
  "Guru (10+ years)",
]

const workScheduleOptions = ["Full-time", "Part-time", "Custom"]

const rateOptions = [
  "Up to $20/hr",
  "$20–30/hr",
  "$30–50/hr",
  "$30–50/hr",
  "$50–70/hr",
]

export function InviteTalentFlow(_props: {
  embedded?: boolean
  jobListingId?: string
}) {
  return <InviteTalentPage />
}

export default function InviteTalentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const routeJobListingId =
    searchParams.get("jobListingId") || searchParams.get("projectId")
  const jobListingId = routeJobListingId
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
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState("")
  const [inviteBalance, setInviteBalance] = useState(0)
  const [appliedFilterSet, setAppliedFilterSet] =
    useState<InviteFilterSet>(emptyInviteFilterSet)
  const [applyToAllRoles, setApplyToAllRoles] = useState(false)
  const [roleFilterSets, setRoleFilterSets] = useState<
    Record<string, InviteFilterSet>
  >({})

  const [isLoadingListing, setIsLoadingListing] = useState(false)

  const [isSendingInvites, setIsSendingInvites] = useState(false)

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
      // Gating this on a role meant the page sat on an empty state whenever it
      // was opened without a job listing, or with a listing that has no saved
      // roles. The role is a filter, not a precondition: an empty one asks for
      // unfiltered recommendations, which is what the screen should show.
      hasLoadedListingContext
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
              : roleFilter || card.role,
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

  const handleSendInvites = async () => {
    if (!hasAnyInvites) {
      toast({
        title: "You are out of invites.",
        variant: "destructive",
      })
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
      toast({
        title: "You do not have enough invites for this selection.",
        variant: "destructive",
      })
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

      toast({
        title: message,
        variant: "destructive",
      })
    } finally {
      setIsSendingInvites(false)
    }
  }
  return (
    <div className="h-screen bg-gray-25">
      <div className="flex h-screen flex-col bg-gray-25">
        <div className="shrink-0 border-b border-gray-200 bg-white">
          <div className="flex w-full items-start justify-between pl-[32px] pr-[17px] py-[15px]">
            <div>
              <h1 className="text-[24px] font-bold leading-none text-dark-blue-400">
                Invite Talent
              </h1>
              <p className="mt-3 text-[14px] font-light leading-normal text-gray-500">
                Send up to 30 invites to fill your open roles. The more invites
                you send out now, the faster you can start your project.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <IconButton variant="outlined" visual="gray" size="md">
                <HelpCircle className="size-[18px]" />
              </IconButton>
              <IconButton
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => router.back()}
              >
                <X className="size-[18px]" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-[75px] py-[50px]">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] leading-normal">
                <span className="font-medium text-dark-blue-400">
                  {isLoadingTalents || isLoadingListing
                    ? "Loading available profiles that match your project requirements"
                    : `We found ${rankedCandidates.length} available profiles that match your project requirements`}
                </span>
                <button
                  type="button"
                  className="font-semibold text-primary-500 hover:underline"
                >
                  How it works?
                </button>
              </div>

              <Button
                variant="outlined"
                visual="gray"
                size="md"
                className="shrink-0"
                onClick={() => setShowFilters((current) => !current)}
              >
                <FilterLines className="size-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
              <div className="min-w-0">
                {showFilters ? (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-[8px] bg-gray-100 px-3 py-2">
                        <span className="text-[14px] font-medium leading-normal text-dark-blue-400">
                          Selected Role:
                        </span>
                        <Popover open={isRoleOpen} onOpenChange={setIsRoleOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="h-7 rounded-[6px] border-gray-200 bg-gray-100 px-[5px] py-[6px]"
                            >
                              {roleFilter || "Select role"}
                              <ChevronDown className="ml-[6px] size-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="isolate z-[100] w-[180px] rounded-[8px] border-gray-200 bg-white p-2 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                            <div className="space-y-1">
                              {roleOptions.map((role) => (
                                <Button
                                  key={role.id}
                                  type="button"
                                  variant="ghost"
                                  visual="gray"
                                  className="h-auto w-full justify-start rounded-[6px] px-2 py-2 text-left text-[14px] font-medium text-dark-blue-400 hover:bg-gray-50"
                                  onClick={() => {
                                    handleRoleChange(role)
                                    setIsRoleOpen(false)
                                  }}
                                >
                                  {role.label}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <Popover
                        open={isLocationOpen}
                        onOpenChange={setIsLocationOpen}
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
                                      setIsLocationOpen(false)
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
                              disabled={selectedLocations.length === 0}
                              onClick={() => setIsLocationOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={isExperienceOpen}
                        onOpenChange={setIsExperienceOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Experience
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
                                    setIsExperienceOpen(false)
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
                              disabled={selectedExperiences.length === 0}
                              onClick={() => setIsExperienceOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={isScheduleOpen}
                        onOpenChange={setIsScheduleOpen}
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
                                    setIsScheduleOpen(false)
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
                              disabled={selectedSchedules.length === 0}
                              onClick={() => setIsScheduleOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover open={isRateOpen} onOpenChange={setIsRateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Rate
                            <ChevronDown className="ml-2 size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                          <ScrollArea className="h-[220px] px-3 py-2">
                            <RadioGroup
                              value={selectedRate}
                              onValueChange={(value) => {
                                setSelectedRate(value)
                                setIsRateOpen(false)
                              }}
                              className="gap-y-0"
                            >
                              {rateOptions.map((option) => (
                                <label
                                  key={option}
                                  className="flex items-center gap-3 rounded-[6px] py-3"
                                >
                                  <HeadlessRadioGroupItem
                                    value={option}
                                    className="inline-flex h-5 w-5 shrink-0 rounded-full border-[1.5px] border-gray-300 data-[state=checked]:border-gray-400"
                                  >
                                    <span className="m-auto hidden h-2 w-2 rounded-full bg-gray-400 data-[state=checked]:block" />
                                  </HeadlessRadioGroupItem>
                                  <span className="text-[14px] font-medium text-gray-500">
                                    {option}
                                  </span>
                                </label>
                              ))}
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
                              disabled={!selectedRate}
                              onClick={() => setIsRateOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <label className="inline-flex items-center gap-3">
                      <Switch visual="blue" />
                      <span className="text-[14px] font-semibold leading-normal text-gray-500">
                        Apply to All Roles
                      </span>
                    </label>
                  </div>
                ) : null}

                {rankedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border-b border-gray-200 py-5 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex w-[96px] shrink-0 flex-col items-center justify-center">
                          <div className="relative h-[86px] w-[86px]">
                            <CircularProgress
                              size={86}
                              strokeWidth={5}
                              value={candidate.match}
                              className="absolute inset-0 text-primary-500"
                              trackClassName="stroke-transparent"
                            />
                            <Avatar
                              containerClassName="absolute inset-0 grid place-items-center"
                              className="size-[66px] hover:ring-0 active:ring-0"
                            >
                              <AvatarImage
                                src={candidate.avatar}
                                alt={candidate.name}
                              />
                              <AvatarFallback>
                                {candidate.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <span className="mt-2 text-[11px] font-medium leading-normal text-dark-blue-400">
                            {candidate.match}% match
                          </span>
                          {candidate.hourlyRate ? (
                            <span className="mt-1 inline-flex items-end gap-0.5 text-dark-blue-400">
                              <span className="text-[20px] font-bold leading-none">
                                {candidate.hourlyRate}
                              </span>
                              <span className="text-[14px] font-light leading-none">
                                /hr
                              </span>
                            </span>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                            <span className="text-[16px] font-bold leading-none text-dark-blue-400">
                              {candidate.name}
                            </span>
                            <span className="text-[16px] font-light leading-none text-gray-500">
                              {candidate.handle}
                            </span>
                          </div>

                          {candidate.title ? (
                            <div className="mt-2 text-[14px] font-semibold leading-normal text-dark-blue-400">
                              {candidate.title}
                            </div>
                          ) : null}
                          {candidate.experience ? (
                            <div className="mt-1 text-[14px] font-light leading-normal text-gray-500">
                              {candidate.experience}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge
                              visual="gray"
                              className="rounded-[5px] border border-gray-200 bg-white px-2 py-[5px]"
                            >
                              Top Match
                            </Badge>
                            {candidate.availability ? (
                              <Badge
                                visual="gray"
                                className="rounded-[5px] border border-gray-200 bg-white px-2 py-[5px]"
                              >
                                {candidate.availability}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-1">
                        {candidate.location ? (
                          <Badge
                            visual="gray"
                            className="border border-gray-200 bg-white"
                          >
                            <span className="text-[14px]">🇺🇸</span>
                            {candidate.location}
                          </Badge>
                        ) : null}
                        {candidate.level ? (
                          <Badge
                            visual="gray"
                            className="border border-gray-200 bg-white"
                          >
                            {candidate.level}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 flex">
                      {/* 96px left column + 16px gutter to align with main text column */}
                      <div className="w-[112px] shrink-0" />
                      <div className="min-w-0 flex flex-nowrap items-center gap-2 overflow-hidden">
                        <span className="mr-1 shrink-0 text-[14px] font-semibold leading-normal text-dark-blue-400 whitespace-nowrap">
                          {candidate.skillsMatch}
                        </span>
                        {candidate.skills.map((skill, index) => (
                          <Badge
                            key={`${candidate.id}-${skill}-${index}`}
                            visual="gray"
                            className="shrink-0 whitespace-nowrap bg-gray-100 text-dark-blue-400"
                          >
                            <Check className="size-3.5 text-primary-500" />
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 6 ? (
                          <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold leading-normal text-dark-blue-400">
                            + {candidate.skills.length - 6} more...
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="relative z-0 h-fit w-full max-w-[294px] self-start flex-col items-stretch justify-start rounded-[8px] border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold leading-none text-dark-blue-400">
                      Apply Filters to Your Team
                    </h2>
                    <p className="mt-3 text-[14px] font-light leading-[1.45] text-gray-500">
                      Customize filters for better match for each role, or
                      invite without them.
                    </p>
                  </div>
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-gray-400" />
                </div>

                <div className="mt-6">
                  <div className="text-[14px] font-medium leading-normal text-gray-500">
                    {filteredRoleCount}/{displayedTeamRoles.length} Roles have
                    been filtered
                  </div>
                  <Progress
                    className="mt-3 h-2 bg-transparent"
                    value={
                      displayedTeamRoles.length
                        ? (filteredRoleCount / displayedTeamRoles.length) * 100
                        : 0
                    }
                  />
                </div>

                <div className="mt-7">
                  {displayedTeamRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between gap-3 border-t border-gray-200 py-4 first:border-t-0 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold leading-normal text-dark-blue-400">
                          {role.label}
                        </span>
                        <span className="mt-1 block text-[14px] font-light leading-normal text-gray-500">
                          {role.state}
                        </span>
                      </span>
                      {role.completed ? (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white pointer-events-none">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 shrink-0 rounded-full border-[1.5px] border-gray-300 bg-white pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white">
          <div className="flex w-full flex-col gap-4 pl-[32px] pr-[17px] py-[15px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[14px] font-medium leading-normal text-gray-500">
              <HelpCircle className="size-4" />
              Invitations will be sent after checkout
            </div>

            <div className="flex items-center justify-center gap-3 self-center">
              <StepIndicator index={0} />
              <span className="text-[16px] font-semibold leading-none text-dark-blue-400">
                Invitation
              </span>
              <span className="w-[48px] border-t-2 border-dashed border-gray-300" />
              <StepIndicator index={1} disabled />
              <span className="text-[16px] font-semibold leading-none text-gray-300">
                Checkout
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 self-end lg:self-auto">
              <Button
                variant="ghost"
                visual="gray"
                onClick={() => router.push("/projects")}
              >
                Skip & Continue
              </Button>
              <Button
                onClick={handleSendInvites}
                disabled={
                  isLoadingListing || isSendingInvites || !rankedCandidates.length
                }
                loading={isSendingInvites}
                loadingIcon={<Spinner size={16} strokeWidth={2} />}
              >
                {sendInviteButtonLabel}
                <Send01 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
