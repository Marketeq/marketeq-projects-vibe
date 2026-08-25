"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ROLE } from "@/types/user"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import {
  clientSortOptions,
  clientStatusFilters,
  clientTypeFilters,
  useClientJobs,
} from "./my-jobs.data"
import { toast } from "@/components/ui/toast/use-toast"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  ArrowRight,
  Check,
  ChevronDown,
  HelpCircle,
  MoreHorizontal,
  SearchMd,
  XCircle,
  Star01,
  X,
} from "@blend-metrics/icons"
import { ListingCard } from "@/components/listing-card"
import { useInviteWindowStore } from "@/components/invite-window"
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
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
      meta: ["4.8 client rating", "In review", "Payment Verified"],
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

/**
 * Stagger ladder for the card cascade. Only uses values that exist on
 * Tailwind's delay scale; tailwindcss-animate maps `delay-*` to
 * animation-delay. Beyond the last step every card shares the final delay
 * so a long list never feels slow.
 */
const CASCADE_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
]

const cascadeDelay = (index: number) =>
  CASCADE_DELAYS[Math.min(index, CASCADE_DELAYS.length - 1)]

const ClientMyJobsView = () => {
  const router = useRouter()
  const { jobs, isLoading, error, setJobStatus, duplicateJob, removeJob } =
    useClientJobs()
  const { toggle: openInviteWindow } = useInviteWindowStore()
  const [pendingAction, setPendingAction] = useState<{
    job: (typeof jobs)[number]
    type: "delete" | "close"
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(
    clientStatusFilters[0]
  )
  const [typeFilter, setTypeFilter] = useState<string>(clientTypeFilters[0])
  const [sortBy, setSortBy] = useState<string>(clientSortOptions[0])

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== clientStatusFilters[0] ||
    typeFilter !== clientTypeFilters[0]

  const clearAllFilters = () => {
    setSearchQuery("")
    setStatusFilter(clientStatusFilters[0])
    setTypeFilter(clientTypeFilters[0])
  }

  const visibleJobs = jobs
    .filter((job) => {
      const query = searchQuery.trim().toLowerCase()

      if (query && !job.title.toLowerCase().includes(query)) {
        return false
      }

      if (
        statusFilter !== clientStatusFilters[0] &&
        job.status !== statusFilter
      ) {
        return false
      }

      if (typeFilter !== clientTypeFilters[0] && job.type !== typeFilter) {
        return false
      }

      return true
    })
    .sort((first, second) => {
      if (sortBy === "Name Z to A") {
        return second.title.localeCompare(first.title)
      }

      if (sortBy === "Newest") {
        return first.daysAgo - second.daysAgo
      }

      if (sortBy === "Oldest") {
        return second.daysAgo - first.daysAgo
      }

      return first.title.localeCompare(second.title)
    })

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
          <InputGroup className="group/search w-full lg:w-60">
            <Input
              className="transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0"
              type="text"
              placeholder="Search by title or name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <InputLeftElement>
              <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
            </InputLeftElement>
            {searchQuery ? (
              <InputRightElement>
                <Button
                  variant="link"
                  visual="gray"
                  type="button"
                  className="text-inherit"
                  aria-label="Clear search"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setSearchQuery("")}
                >
                  <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
                </Button>
              </InputRightElement>
            ) : null}
          </InputGroup>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="justify-between bg-white"
                size="lg"
                variant="outlined"
                visual="gray"
              >
                {statusFilter} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {clientStatusFilters.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => setStatusFilter(status)}
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="justify-between bg-white"
                size="lg"
                variant="outlined"
                visual="gray"
              >
                {typeFilter} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {clientTypeFilters.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => setTypeFilter(type)}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters ? (
            <Button
              variant="link"
              visual="gray"
              className="ml-3 shrink-0 text-sm font-semibold text-primary-500"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          ) : null}

          <div className="ml-auto hidden items-center gap-x-2 text-sm leading-5 text-gray-400 lg:flex">
            Sort by:
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="px-0 text-dark-blue-400"
                  variant="link"
                  visual="gray"
                >
                  {sortBy} <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {clientSortOptions.map((sort) => (
                  <DropdownMenuItem key={sort} onSelect={() => setSortBy(sort)}>
                    {sort}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div
          className="space-y-3"
          key={`${searchQuery}|${statusFilter}|${typeFilter}|${sortBy}`}
        >
          {isLoading ? (
            <Card className="hover:border-gray-200 hover:ring-0">
              <div className="w-full p-5 text-sm leading-5 text-gray-500">
                Loading jobs...
              </div>
            </Card>
          ) : error ? (
            <Card className="hover:border-gray-200 hover:ring-0">
              <div className="flex w-full flex-col gap-3 p-5">
                <p className="text-sm leading-5 text-error-500">{error}</p>
              </div>
            </Card>
          ) : visibleJobs.length === 0 ? (
            <div
              key="empty"
              className="flex flex-col items-center px-6 py-[100px] gap-8 self-stretch"
              style={{ animation: "fadeSlideIn 300ms ease-out" }}
            >
              <div className="flex flex-col items-center gap-2 px-12 self-stretch">
                <h2 className="text-lg font-semibold leading-[22px] text-dark-blue-400 text-center self-stretch">
                  0 Results
                  {searchQuery.trim() ? (
                    <> for &ldquo;{searchQuery.trim()}&rdquo;</>
                  ) : (
                    ""
                  )}
                </h2>
                <p className="text-sm font-normal leading-[150%] text-gray-500 text-center">
                  We couldn&apos;t find any results for your{" "}
                  {searchQuery.trim() ? "search" : "selected filters"}.
                  <br />
                  Try adjusting your{" "}
                  {searchQuery.trim()
                    ? "keywords or clearing your search"
                    : "filters or clearing your selection"}
                  .
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-200 rounded-[5px] text-sm font-semibold leading-5 text-dark-blue-400 transition-colors duration-300 hover:bg-gray-300"
                onClick={() => {
                  setSearchQuery("")
                  clearAllFilters()
                }}
              >
                {searchQuery.trim() ? "Clear Search" : "Clear Filters"}
              </button>
            </div>
          ) : (
            visibleJobs.map((job, index) => (
              <Card
                key={job.id}
                className={`overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(
                  index
                )}`}
              >
                <div className="w-full p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold leading-6 text-dark-blue-400">
                        <NextLink
                          className="hover:underline"
                          href={`/job-details/${job.id}`}
                        >
                          {job.title}
                        </NextLink>
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
                          className="h-8 bg-white"
                          variant="outlined"
                          visual="gray"
                          onClick={() =>
                            router.push(`/job-listing?jobListingId=${job.id}&edit=1`)
                          }
                        >
                          {job.action}
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton
                              className="rounded-full"
                              variant="ghost"
                              visual="gray"
                              size="sm"
                            >
                              <MoreHorizontal className="size-4" />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {job.status === "Draft" ? (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => router.push(`/job-listing?jobListingId=${job.id}&edit=1`)}
                                >
                                  Keep Editing
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/job-details/${job.id}`)}>
                                  Preview Job
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => duplicateJob(job.id)}>
                                  Duplicate Job
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  visual="destructive"
                                  onSelect={() => setPendingAction({ job, type: "delete" })}
                                >
                                  Delete Draft
                                </DropdownMenuItem>
                              </>
                            ) : job.status === "Closed" ? (
                              <>
                                <DropdownMenuItem onSelect={() => router.push("/job-screening")}>
                                  View Applicants
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setJobStatus(job.id, "Open", "Published just now")}
                                >
                                  Reopen Job
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => duplicateJob(job.id)}>
                                  Duplicate Job
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  visual="destructive"
                                  onSelect={() => setPendingAction({ job, type: "delete" })}
                                >
                                  Delete Job
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onSelect={() => router.push("/job-screening")}>
                                  View Applicants
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => router.push(`/job-listing?jobListingId=${job.id}&edit=1`)}
                                >
                                  Edit Job
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push("/invite-talent")}>
                                  Invite Talent
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openInviteWindow(true, job.title)}>
                                  Share Job
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  visual="destructive"
                                  onSelect={() => setPendingAction({ job, type: "close" })}
                                >
                                  Close Job
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-200 pt-4 text-sm leading-5">
                    <span className="font-semibold text-dark-blue-400">
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
                        onClick={() =>
                          router.push(
                            job.link === "Edit job to find better matches"
                              ? `/job-listing?jobListingId=${job.id}&edit=1`
                              : "/invite-talent"
                          )
                        }
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
            ))
          )}
        </div>
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <DialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
          <DialogTitle className="text-lg font-bold text-dark-blue-400">
            {pendingAction?.type === "close"
              ? "Close this job?"
              : pendingAction?.job.status === "Draft"
                ? "Delete this draft?"
                : "Delete this job?"}
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-600">
            {pendingAction?.type === "close" ? (
              <>
                This will close{" "}
                <span className="font-bold">
                  &ldquo;{pendingAction?.job.title}&rdquo;
                </span>{" "}
                and stop it from receiving new applicants. You can reopen it
                later.
              </>
            ) : (
              <>
                This will permanently delete{" "}
                <span className="font-bold">
                  &ldquo;{pendingAction?.job.title}&rdquo;
                </span>
                {pendingAction?.job.status === "Draft"
                  ? " and everything in it."
                  : " and remove it from search, along with its applicants."}{" "}
                This action cannot be undone.
              </>
            )}
          </p>
          <div className="mt-4 flex justify-end gap-x-3">
            <Button
              variant="outlined"
              visual="gray"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              visual="error"
              onClick={() => {
                if (!pendingAction) return
                const { job: target, type } = pendingAction

                if (type === "close") {
                  setJobStatus(target.id, "Closed", "Closed just now")
                  toast({ title: `"${target.title}" was closed` })
                } else {
                  removeJob(target.id)
                  toast({ title: `"${target.title}" was deleted` })
                }

                setPendingAction(null)
              }}
            >
              {pendingAction?.type === "close"
                ? "Close Job"
                : pendingAction?.job.status === "Draft"
                  ? "Delete Draft"
                  : "Delete Job"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full self-start hover:border-gray-200 hover:ring-0">
        <div className="w-full p-6">
          <h2 className="text-base font-semibold text-dark-blue-400">
            Level Up Your Hiring Skills
          </h2>

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
    </div>
  )
}

export default function MyJobsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] =
    useState<(typeof jobTabs)[number]["value"]>("saved")
  const { user } = useAuth()
  const { toggle: openInviteWindow } = useInviteWindowStore()

  if (resolveDashboardRole(user) === ROLE.CLIENT) {
    return (
      <AuthenticatedRoute>
        <div className="flex min-h-screen bg-gray-50">
          <LeftSidebar />

          <div className="flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
            <ClientMyJobsView />
          </div>
        </div>
      </AuthenticatedRoute>
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
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
                      You&apos;ve Been Invited to Apply to &quot;Project
                      Name&quot;
                    </p>
                    <p className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
                      You&apos;re a great match — your skills line up with 7 out
                      of 9 in the job description. That means you&apos;ve got a
                      strong chance at landing this role.
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
                  onValueChange={(value) =>
                    setActiveTab(value as typeof activeTab)
                  }
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
                            className="overflow-hidden"
                          >
                            <div className="w-full p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <NextLink
                                    href="/job-screening"
                                    className="text-lg font-semibold leading-normal text-dark-blue-400 hover:underline"
                                  >
                                    {job.title}
                                  </NextLink>
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

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <IconButton
                                      className="rounded-full"
                                      variant="ghost"
                                      visual="gray"
                                      size="sm"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </IconButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => router.push(`/job-details/${job.id}`)}>
                                      View Job Details
                                    </DropdownMenuItem>
                                    {activeTab === "applied" ? (
                                      <DropdownMenuItem onSelect={() => router.push("/job-screening")}>
                                        View My Application
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onSelect={() => router.push(`/job-details/${job.id}`)}>
                                        Apply Now
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onSelect={() => openInviteWindow(true, job.title)}>
                                      Share Job
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {activeTab === "archived" ? (
                                      <DropdownMenuItem onSelect={() => setActiveTab("saved")}>
                                        Restore Job
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onSelect={() => setActiveTab("archived")}>
                                        Archive Job
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      visual="destructive"
                                      onSelect={() =>
                                        toast({
                                          title: `"${job.title}" was ${
                                            activeTab === "saved"
                                              ? "removed from saved"
                                              : activeTab === "invited"
                                                ? "declined"
                                                : activeTab === "applied"
                                                  ? "withdrawn"
                                                  : "deleted"
                                          }`,
                                        })
                                      }
                                    >
                                      {activeTab === "saved"
                                        ? "Remove from Saved"
                                        : activeTab === "invited"
                                          ? "Decline Invite"
                                          : activeTab === "applied"
                                            ? "Withdraw Application"
                                            : "Delete Job"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
              <Card className="w-full">
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
                          <p className="mt-1 text-xs text-gray-500">
                            {search.meta}
                          </p>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                className="rounded-full"
                                variant="ghost"
                                visual="gray"
                                size="sm"
                              >
                                <MoreHorizontal className="size-4" />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() =>
                                  router.push(`/search?q=${encodeURIComponent(search.title)}`)
                                }
                              >
                                Run Search Again
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => router.push("/find-jobs")}>
                                Edit Search
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() =>
                                  toast({ title: `Job alert created for "${search.title}"` })
                                }
                              >
                                Create Job Alert
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                visual="destructive"
                                onSelect={() =>
                                  toast({ title: `"${search.title}" was removed from recent searches` })
                                }
                              >
                                Remove Search
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
