"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { JobListingAPI } from "@/service/http/job-listing"
import {
  ArrowRight,
  Check,
  ChevronDown,
  HelpCircle,
  MoreHorizontal,
  SearchMd,
  Star01,
  X,
} from "@blend-metrics/icons"
import { ROLE } from "@/types/user"
import { ListingCard } from "@/components/listing-card"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const jobTabs = [
  { value: "saved", label: "Saved" },
  { value: "invited", label: "Invited", count: "2 NEW" },
  { value: "applied", label: "Applied" },
  { value: "archived", label: "Archived" },
]

const jobProgressByTab = {
  saved: [
    {
      id: "job-progress-1",
      title: "Bay City College Campus Expansion Project",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "Ongoing service", "Payment Verified"],
    },
    {
      id: "job-progress-2",
      title: "1200 West Grand Ave. Renovation",
      role: "Software Tester",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "6 months", "Payment Verified"],
    },
    {
      id: "job-progress-3",
      title: "Tracy Courthouse Rebid",
      role: "Software Development Manager",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "6 months", "Payment Verified"],
    },
  ],
  invited: [
    {
      id: "job-progress-4",
      title: "Project Name Invitation",
      role: "Software Developer",
      skillsMatch: "7 out of 9 skills line up",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted today",
      meta: ["4.9 client rating", "Invited", "Payment Verified"],
    },
  ],
  applied: [
    {
      id: "job-progress-5",
      title: "Applied Opportunity",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Applied 1 day ago",
      meta: ["4.8 client rating", "Open", "Payment Verified"],
    },
  ],
  archived: [
    {
      id: "job-progress-6",
      title: "Archived Opportunity",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Archived",
      meta: ["4.6 client rating", "Closed", "Payment Verified"],
    },
  ],
} as const

const pickedJobs = [
  "picked-job-1",
  "picked-job-2",
  "picked-job-3",
  "picked-job-4",
]

const tutorials = [
  {
    title: "ChatGBT Masterclass: The Ultimate Beginners Guide!",
    rating: "4.9",
    level: "Beginner",
    image: "/tutorial-thumbnails/image.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-beginner.svg",
    isNew: true,
  },
  {
    title: "Mastering Behavioral Interview Questions",
    rating: "4.7",
    level: "Beginner",
    image: "/tutorial-thumbnails/image-1.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-beginner-2.svg",
  },
  {
    title: "How to Spot Red Flags in Candidate Interviews",
    rating: "4.5",
    level: "Advanced",
    image: "/tutorial-thumbnails/image-2.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-advanced.svg",
  },
  {
    title: "Building an Inclusive and Diverse Hiring Process",
    rating: "4.1",
    level: "Intermediate",
    image: "/tutorial-thumbnails/image-3.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-intermediate.svg",
  },
]

const recentSearches = [
  {
    title: "Software Engineer",
    meta: "Full-Time · Junior and 3 more filters",
  },
  {
    title: "UX Designer",
    meta: "USA",
  },
  {
    title: "QA / Engine",
    meta: "Remote · Junior and 1 more filter",
  },
  {
    title: "Graphic Designer",
    meta: "Part-Time · Hybrid and 2 more filters",
  },
  {
    title: "Product Designer",
    meta: "Hybrid · Junior · Serbia",
  },
]

type JobListingCardViewModel = {
  id: string
  title: string
  rawStatus: string
  rawType: string
  meta: string[]
  status: string
  statusVisual: "success" | "warning" | "error" | "gray"
  primary: string
  badge?: string
  link?: string
  action?: string
  timestamp: string
  hasApplicantMetrics?: boolean
}

const statusFilters = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const

const typeFilters = [
  { value: "all", label: "All Types" },
  { value: "project", label: "Projects" },
  { value: "service", label: "Services" },
  { value: "team", label: "Teams" },
  { value: "individual", label: "Individuals" },
] as const

const sortOptions = [
  { value: "name_asc", label: "Name A to Z" },
  { value: "name_desc", label: "Name Z to A" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const

const CLIENT_JOBS_PAGE_SIZE = 5

const getBasicInformation = (listing: any) =>
  Array.isArray(listing?.basicInformation)
    ? listing.basicInformation[0]
    : listing?.basicInformation

const pluralize = (value: number, singular: string, plural = `${singular}s`) =>
  `${value} ${value === 1 ? singular : plural}`

const formatRelativeJobDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return "just now"

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "just now"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getJobListingStatusDisplay = (
  status?: string
): Pick<JobListingCardViewModel, "status" | "statusVisual"> => {
  switch (status) {
    case "published":
    case "pending_review":
      return { status: "Open", statusVisual: "success" }
    case "closed":
      return { status: "Closed", statusVisual: "gray" }
    case "needs_update":
    case "draft":
    default:
      return { status: "Draft", statusVisual: "warning" }
  }
}

const getJobListingStatusGroup = (
  status?: string
): (typeof statusFilters)[number]["value"] => {
  if (status === "closed") return "closed"
  if (status === "published" || status === "pending_review") return "open"

  return "draft"
}

const getOpenRoleCount = (listing: any) => {
  const teamRows = Array.isArray(listing?.teamMemberRows)
    ? listing.teamMemberRows
    : []

  if (teamRows.length > 0) {
    return {
      open: teamRows.filter((row: any) => !row?.assignedUserId).length,
      total: teamRows.length,
    }
  }

  const roles = new Set<string>()
  const phases = Array.isArray(listing?.phases) ? listing.phases : []

  phases.forEach((phase: any) => {
    const tasks = Array.isArray(phase?.tasks) ? phase.tasks : []
    tasks.forEach((task: any) => {
      const roleTitle = String(task?.roleTitle ?? "").trim()
      if (roleTitle) roles.add(roleTitle)
    })
  })

  return { open: roles.size, total: roles.size }
}

const formatJobListingMeta = (listing: any) => {
  const workType = listing?.workType
  const durationMonths = Number(listing?.durationMonths)
  const isOngoing = Boolean(listing?.isOngoing)
  const roleCount = getOpenRoleCount(listing)
  const typeLabel =
    workType === "service" || isOngoing
      ? "Ongoing service"
      : Number.isFinite(durationMonths) && durationMonths > 0
        ? `${durationMonths} ${durationMonths === 1 ? "month" : "months"} project`
        : workType === "project"
          ? "Project"
          : "Job"

  return [
    typeLabel,
    roleCount.total > 0
      ? `${roleCount.open} of ${roleCount.total} ${roleCount.total === 1 ? "role" : "roles"} open`
      : "No roles open",
  ]
}

const getNumericListingMetric = (...values: unknown[]) => {
  for (const value of values) {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue
    }
  }

  return null
}

const mapJobListingToCard = (listing: any): JobListingCardViewModel => {
  const basicInformation = getBasicInformation(listing)
  const statusDisplay = getJobListingStatusDisplay(listing?.status)
  const title =
    String(basicInformation?.title ?? "").trim() ||
    String(listing?.description ?? "")
      .trim()
      .slice(0, 100) ||
    "Untitled Job"
  const isDraft = listing?.status === "draft"
  const isOpen = getJobListingStatusGroup(listing?.status) === "open"
  const isNeedsUpdate = listing?.status === "needs_update"
  const statusDate =
    isDraft || isNeedsUpdate
      ? listing?.createdAt
      : (listing?.publishedAt ?? listing?.updatedAt)
  const applicantCount = getNumericListingMetric(
    listing?.applicantCount,
    listing?.applicantsCount,
    listing?.applicationsCount
  )
  const newApplicantCount = getNumericListingMetric(
    listing?.newApplicantCount,
    listing?.newApplicantsCount,
    listing?.newApplicationsCount
  )
  const matchingProfileCount = getNumericListingMetric(
    listing?.matchingProfileCount,
    listing?.matchingProfilesCount,
    listing?.talentMatchesCount
  )
  const displayApplicantCount = applicantCount ?? 0
  const displayNewApplicantCount = newApplicantCount ?? 0
  const displayMatchingProfileCount = matchingProfileCount ?? 0
  const hasApplicants = isOpen && displayApplicantCount > 0
  const hasApplicantMetrics = isOpen && applicantCount !== null

  return {
    id: String(listing?.id ?? title),
    title,
    rawStatus: String(listing?.status ?? ""),
    rawType: String(listing?.listingType ?? listing?.workType ?? ""),
    meta: formatJobListingMeta(listing),
    ...statusDisplay,
    primary: hasApplicants
      ? pluralize(displayApplicantCount, "applicant")
      : "No applicants yet",
    badge:
      hasApplicants && displayNewApplicantCount > 0
        ? `${displayNewApplicantCount} new`
        : undefined,
    link: isOpen
      ? hasApplicants
        ? `${displayMatchingProfileCount} matching profiles`
        : "Edit job to find better matches"
      : undefined,
    action: isDraft || isNeedsUpdate ? "Keep Editing" : undefined,
    timestamp: `${isDraft || isNeedsUpdate ? "Created" : isOpen ? "Published" : "Updated"} ${formatRelativeJobDate(
      statusDate
    )}`,
    hasApplicantMetrics,
  }
}

const ClientMyJobsView = () => {
  const router = useRouter()
  const [jobListings, setJobListings] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusFilters)[number]["value"]>("all")
  const [typeFilter, setTypeFilter] =
    useState<(typeof typeFilters)[number]["value"]>("all")
  const [sortBy, setSortBy] =
    useState<(typeof sortOptions)[number]["value"]>("name_asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [jobsError, setJobsError] = useState("")

  const loadJobs = useCallback(
    async (cancelledRef?: { current: boolean }) => {
      setIsLoadingJobs(true)
      setJobsError("")

      try {
        const response = await JobListingAPI.List({
          limit: 100,
          type: typeFilter === "all" ? undefined : typeFilter,
        })
        const listings = Array.isArray(response?.data) ? response.data : []

        if (!cancelledRef?.current) {
          setJobListings(listings)
        }
      } catch (error: any) {
        if (!cancelledRef?.current) {
          setJobsError(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load your jobs."
          )
          setJobListings([])
        }
      } finally {
        if (!cancelledRef?.current) {
          setIsLoadingJobs(false)
        }
      }
    },
    [typeFilter]
  )

  useEffect(() => {
    const cancelledRef = { current: false }

    void loadJobs(cancelledRef)

    return () => {
      cancelledRef.current = true
    }
  }, [loadJobs])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, statusFilter, typeFilter])

  const clientJobs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return jobListings
      .map(mapJobListingToCard)
      .filter((job) =>
        normalizedSearch
          ? [job.title, ...job.meta, job.status]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          : true
      )
      .filter((job) =>
        statusFilter === "all"
          ? true
          : getJobListingStatusGroup(job.rawStatus) === statusFilter
      )
      .sort((first, second) => {
        if (sortBy === "name_desc") {
          return second.title.localeCompare(first.title)
        }

        if (sortBy === "newest" || sortBy === "oldest") {
          const firstDate = new Date(
            jobListings.find((listing) => String(listing?.id) === first.id)
              ?.createdAt ?? 0
          ).getTime()
          const secondDate = new Date(
            jobListings.find((listing) => String(listing?.id) === second.id)
              ?.createdAt ?? 0
          ).getTime()

          return sortBy === "newest"
            ? secondDate - firstDate
            : firstDate - secondDate
        }

        return first.title.localeCompare(second.title)
      })
      .map((job, _index, sortedJobs) => {
        const firstOpenWithoutApplicantMetrics = sortedJobs.find(
          (sortedJob) =>
            getJobListingStatusGroup(sortedJob.rawStatus) === "open" &&
            !sortedJob.hasApplicantMetrics
        )

        if (job.id !== firstOpenWithoutApplicantMetrics?.id) {
          return job
        }

        return {
          ...job,
          primary: "8 applicants",
          badge: "3 new",
          link: "60 matching profiles",
        }
      })
  }, [jobListings, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(
    1,
    Math.ceil(clientJobs.length / CLIENT_JOBS_PAGE_SIZE)
  )
  const pageStartIndex = (currentPage - 1) * CLIENT_JOBS_PAGE_SIZE
  const paginatedClientJobs = clientJobs.slice(
    pageStartIndex,
    pageStartIndex + CLIENT_JOBS_PAGE_SIZE
  )
  const pageEndIndex = Math.min(
    pageStartIndex + paginatedClientJobs.length,
    clientJobs.length
  )
  const canGoToPreviousPage = currentPage > 1
  const canGoToNextPage = currentPage < totalPages

  const selectedStatusLabel =
    statusFilters.find((status) => status.value === statusFilter)?.label ??
    "All Statuses"
  const selectedTypeLabel =
    typeFilters.find((type) => type.value === typeFilter)?.label ?? "All Types"
  const selectedSortLabel =
    sortOptions.find((sort) => sort.value === sortBy)?.label ?? "Name A to Z"

  const openJobListingDraft = (jobId: string) => {
    router.push(`/job-listing?jobListingId=${jobId}&edit=1`)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_322px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-bold text-dark-blue-400">My Jobs</h1>
          <Button onClick={() => router.push("/job-listing")}>
            Create Job
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-[305px]">
            <SearchMd className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-[5px] border border-gray-200 bg-white pl-9 pr-3 text-sm leading-5 text-dark-blue-400 shadow-xs outline-none placeholder:text-gray-400 focus:border-primary-500"
              placeholder="Search by title or name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-10 justify-between"
                variant="outlined"
                visual="gray"
              >
                {selectedStatusLabel} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusFilters.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onSelect={() => setStatusFilter(status.value)}
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-10 justify-between"
                variant="outlined"
                visual="gray"
              >
                {selectedTypeLabel} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {typeFilters.map((type) => (
                <DropdownMenuItem
                  key={type.value}
                  onSelect={() => setTypeFilter(type.value)}
                >
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto hidden items-center gap-x-2 text-sm leading-5 text-gray-400 lg:flex">
            Sort by:
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-10 px-0 text-dark-blue-400"
                  variant="link"
                  visual="gray"
                >
                  {selectedSortLabel} <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((sort) => (
                  <DropdownMenuItem
                    key={sort.value}
                    onSelect={() => setSortBy(sort.value)}
                  >
                    {sort.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-3">
          {isLoadingJobs ? (
            <Card className="overflow-hidden hover:border-gray-200 hover:ring-0">
              <div className="p-5 text-sm leading-5 text-gray-500">
                Loading jobs...
              </div>
            </Card>
          ) : jobsError ? (
            <Card className="overflow-hidden hover:border-gray-200 hover:ring-0">
              <div className="flex flex-col gap-3 p-5">
                <p className="text-sm leading-5 text-error-500">{jobsError}</p>
                <Button
                  className="h-8 self-start"
                  variant="outlined"
                  visual="gray"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </Card>
          ) : clientJobs.length === 0 ? (
            <Card className="overflow-hidden hover:border-gray-200 hover:ring-0">
              <div className="p-5 text-sm leading-5 text-gray-500">
                {searchQuery.trim()
                  ? "No jobs match your search."
                  : "No jobs yet. Create a job to start hiring."}
              </div>
            </Card>
          ) : (
            <>
              {paginatedClientJobs.map((job) => (
                <Card
                  key={job.id}
                  className="overflow-hidden hover:border-gray-200 hover:ring-0"
                >
                  <div className="w-full p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold leading-6 text-gray-black">
                          {job.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs leading-5 text-gray-500">
                          {job.meta.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-x-3">
                        <Badge visual={job.statusVisual}>{job.status}</Badge>
                        {job.action ? (
                          <Button
                            className="h-8"
                            variant="outlined"
                            visual="gray"
                            onClick={() => {
                              if (job.action === "Keep Editing") {
                                openJobListingDraft(job.id)
                              }
                            }}
                          >
                            {job.action}
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                variant="ghost"
                                visual="gray"
                                size="sm"
                              >
                                <MoreHorizontal className="size-4" />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {job.rawStatus === "published" ? (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    router.push(
                                      `/invite-talent?jobListingId=${job.id}`
                                    )
                                  }
                                >
                                  Invite Talent
                                </DropdownMenuItem>
                              ) : null}
                              {job.rawStatus === "draft" ||
                              job.rawStatus === "needs_update" ? (
                                <DropdownMenuItem
                                  onSelect={() => openJobListingDraft(job.id)}
                                >
                                  Keep Editing
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => void loadJobs()}
                              >
                                Refresh
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-200 pt-4 text-sm leading-5">
                      <span className="font-semibold text-gray-black">
                        {job.primary}
                      </span>
                      {job.badge ? (
                        <Badge
                          visual="gray"
                          className="bg-primary-50 text-primary-500"
                        >
                          {job.badge}
                        </Badge>
                      ) : null}
                      {job.link ? (
                        <Button
                          className="h-auto px-0 text-primary-500"
                          variant="link"
                          visual="primary"
                          onClick={() => {
                            if (
                              job.link === "Edit job to find better matches"
                            ) {
                              openJobListingDraft(job.id)
                            } else if (job.link) {
                              router.push(
                                `/invite-talent?jobListingId=${job.id}`
                              )
                            }
                          }}
                        >
                          {job.link}
                        </Button>
                      ) : null}
                      <span className="ml-auto text-xs text-gray-500">
                        {job.timestamp}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              {totalPages > 1 ? (
                <div className="flex flex-col gap-3 pt-2 text-sm leading-5 text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing {pageStartIndex + 1}-{pageEndIndex} of{" "}
                    {clientJobs.length} jobs
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      className="h-9"
                      variant="outlined"
                      visual="gray"
                      disabled={!canGoToPreviousPage}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Previous
                    </Button>
                    <span className="px-2 text-xs leading-[18px] text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      className="h-9"
                      variant="outlined"
                      visual="gray"
                      disabled={!canGoToNextPage}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Card className="w-full self-start hover:border-gray-200 hover:ring-0">
        <div className="w-full p-6">
          <h2 className="text-base font-semibold text-gray-black">
            Level Up Your Hiring Skills
          </h2>

          <div className="mt-6 space-y-3">
            {tutorials.map((tutorial, index) => (
              <div
                key={`${tutorial.title}-${index}`}
                className="flex items-start gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="relative h-16 w-[104px] shrink-0 overflow-hidden rounded-[5px]">
                  <NextImage
                    src={tutorial.image}
                    alt={tutorial.title}
                    fill
                    sizes="104px"
                    className="object-cover"
                  />
                  {tutorial.isNew ? (
                    <span className="absolute left-1 top-1 rounded-[3px] bg-success-500 p-[3px] text-[8px] font-bold leading-none text-white">
                      NEW
                    </span>
                  ) : null}
                  <span className="absolute bottom-1 right-1 rounded-[3px] bg-white p-[3px] text-[8px] font-bold leading-none text-dark-blue-400">
                    1h 34m
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <NextLink
                    href="/find-jobs"
                    className="line-clamp-2 text-xs font-semibold leading-normal text-gray-black hover:underline"
                  >
                    {tutorial.title}
                  </NextLink>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1">
                      <NextImage
                        src={tutorial.ratingIcon}
                        alt=""
                        width={13}
                        height={13}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium leading-4 text-gray-500">
                        4.8
                      </span>
                    </div>
                    <div className="ml-auto inline-flex items-center gap-1">
                      <NextImage
                        src={tutorial.levelIcon}
                        alt=""
                        width={16}
                        height={16}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium leading-4 text-gray-500">
                        Beginner
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outlined"
            visual="gray"
            className="mt-6 w-full text-sm font-semibold text-dark-blue-400"
            onClick={() => router.push("/find-jobs")}
          >
            View More Tutorials
          </Button>
        </div>
      </Card>
    </div>
  )
}

const TalentMyJobsView = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] =
    useState<(typeof jobTabs)[number]["value"]>("saved")

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="min-w-0 space-y-6">
        <Card className="overflow-hidden rounded-xl border-primary-100 bg-primary-50">
          <div className="flex w-full items-start gap-4 p-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="size-12 border border-white shadow-sm">
                <AvatarImage src="/man.jpg" alt="Invited role" />
                <AvatarFallback>MT</AvatarFallback>
              </Avatar>
              <Badge
                visual="gray"
                className="bg-white text-[10px] text-gray-500"
              >
                8/9 match
              </Badge>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-dark-blue-400">
                You&apos;ve Been Invited to Apply to &quot;Project Name&quot;
              </p>
              <p className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
                You&apos;re a great match â€” your skills line up with 7 out of
                9 in the job description. That means you&apos;ve got a strong
                chance at landing this role.
              </p>

              <Button
                variant="link"
                visual="gray"
                className="mt-3 px-0 text-primary-500"
              >
                Apply Now <ArrowRight className="size-4" />
              </Button>
            </div>

            <IconButton variant="ghost" visual="gray" size="sm">
              <X className="size-4" />
            </IconButton>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-dark-blue-400">
              Job Progress
            </h1>
            <Button variant="outlined" visual="gray" size="sm">
              View all <ArrowRight className="size-4" />
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            unanimated
          >
            <TabsList className="mb-4 justify-start border-b-0 px-0 pt-0">
              {jobTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {tab.count ? (
                    <Badge
                      visual="gray"
                      className="ml-2 bg-gray-100 text-[10px] text-gray-500"
                    >
                      {tab.count}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>

            {jobTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="space-y-3">
                  {jobProgressByTab[
                    tab.value as keyof typeof jobProgressByTab
                  ].map((job) => (
                    <Card
                      key={job.id}
                      className="overflow-hidden hover:border-gray-200 hover:ring-0"
                    >
                      <div className="w-full p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Button
                              variant="link"
                              visual="gray"
                              className="h-auto px-0 text-left text-lg font-semibold leading-normal text-dark-blue-400 hover:underline"
                            >
                              {job.title}
                            </Button>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              {job.meta.map((item, index) => (
                                <span
                                  key={item}
                                  className="inline-flex items-center gap-2"
                                >
                                  {index === 0 ? (
                                    <Star01 className="size-3.5" />
                                  ) : null}
                                  {index === 2 ? (
                                    <Check className="size-3.5 text-success-600" />
                                  ) : null}
                                  <span>{item}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <IconButton variant="ghost" visual="gray" size="sm">
                            <MoreHorizontal className="size-4" />
                          </IconButton>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 pt-4 text-sm text-dark-blue-400">
                          <Button
                            variant="link"
                            visual="gray"
                            className="h-auto px-0 font-semibold text-dark-blue-400 hover:underline"
                          >
                            {job.role}
                          </Button>
                          <span className="text-gray-500">
                            {job.skillsMatch}
                          </span>
                          <span>{job.schedule}</span>
                          <span>{job.compensation}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {job.posted}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-dark-blue-400">
              Jobs picked for you
            </h2>
            <Button
              variant="link"
              visual="gray"
              className="text-primary-500"
              onClick={() => router.push("/find-jobs")}
            >
              <span className="inline-flex items-center gap-1">
                Browse more jobs <ArrowRight className="size-4" />
              </span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {pickedJobs.map((id) => (
              <ListingCard
                key={id}
                kind="project"
                id={id}
                title="The Ultimate Mobile App Experience"
                description="Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
                budget="$90,200"
                duration="Full-Time"
                cardVariant="job-grid"
              />
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <Card className="w-full hover:border-gray-200 hover:ring-0">
          <div className="w-full p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-dark-blue-400">
                Level Up Your Job Search
              </h2>
              <HelpCircle className="size-4 text-gray-400" />
            </div>

            <div className="mt-6 space-y-3">
              {tutorials.map((tutorial, index) => (
                <div
                  key={`${tutorial.title}-${index}`}
                  className="flex items-start gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="relative h-16 w-[104px] shrink-0 overflow-hidden rounded-[8px]">
                    <NextImage
                      src={tutorial.image}
                      alt={tutorial.title}
                      fill
                      sizes="104px"
                      className="object-cover"
                    />
                    {tutorial.isNew ? (
                      <span className="absolute left-1 top-1 rounded-[3px] bg-success-500 p-[3px] text-[8px] font-bold leading-none text-white">
                        NEW
                      </span>
                    ) : null}
                    <span className="absolute bottom-1 right-1 rounded-[3px] bg-black/50 p-[3px] text-[8px] font-bold leading-none text-white">
                      01:20
                    </span>
                  </div>
                  <div className="min-w-0">
                    <NextLink
                      href="/find-jobs"
                      className="line-clamp-2 text-xs font-semibold leading-normal text-dark-blue-400 hover:underline"
                    >
                      {tutorial.title}
                    </NextLink>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-1">
                        <NextImage
                          src={tutorial.ratingIcon}
                          alt=""
                          width={13}
                          height={13}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium leading-4 text-dark-blue-400">
                          {tutorial.rating}
                        </span>
                      </div>
                      <div className="ml-auto inline-flex items-center gap-1">
                        <NextImage
                          src={tutorial.levelIcon}
                          alt=""
                          width={16}
                          height={16}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium leading-4 text-gray-500">
                          {tutorial.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outlined"
              visual="gray"
              className="mt-6 w-full text-sm font-semibold text-dark-blue-400"
            >
              View More Tutorials
            </Button>
          </div>
        </Card>

        <Card className="hover:border-gray-200 hover:ring-0">
          <div className="w-full p-5">
            <h2 className="text-base font-semibold text-dark-blue-400">
              Recent Searches
            </h2>

            <div className="mt-4 space-y-3">
              {recentSearches.map((search) => (
                <div
                  key={search.title}
                  className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-blue-400">
                      {search.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{search.meta}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {search.title === "QA / Engine" ? (
                      <Button
                        variant="link"
                        visual="gray"
                        className="px-0 text-xs text-dark-blue-400"
                      >
                        Remove
                      </Button>
                    ) : null}
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <MoreHorizontal className="size-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function MyJobsPage() {
  const { user } = useAuth()
  const dashboardRole = resolveDashboardRole(user)
  const isClient = dashboardRole === ROLE.CLIENT

  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          {isClient ? <ClientMyJobsView /> : <TalentMyJobsView />}
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
