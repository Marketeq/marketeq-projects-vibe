"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  type Contract as ApiContract,
  type ContractStatus as ApiContractStatus,
  endContract as apiEndContract,
  getClientContracts,
  getTalentContracts,
  respondToContract,
} from "@/src/lib/api/contracts"
import {
  Briefcase,
  Calendar,
  ChevronDown,
  Copy,
  Download01,
  FileCheck02,
  FilterLines,
  HelpCircle,
  Monitor,
  MoreHorizontal,
  Plus,
  Search,
  SwitchVertical01,
  User,
  Users,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Progress,
} from "@/components/ui"

type ContractType = "project" | "service" | "team" | "individual"
type ContractStatus = "Active" | "Pending" | "Ended" | "Canceled" | "Disputed"
type ViewMode = "grouped" | "individual"
type SortOption = "recent" | "milestone" | "az" | "za"

interface TeamMember {
  name: string
  avatar: string
  role: string
}

interface Contract {
  id: string
  title: string
  groupId: string
  groupName: string
  type: ContractType
  status: ContractStatus
  talentName: string
  talentAvatar: string
  clientName: string
  rate: string
  schedule: string
  duration: string
  startDate: string
  endDate: string
  nextMilestone: string
  updatedAt: string
  lastActivity: string
  billingCycle: string
  progress: number
  hoursToday: string
  hoursThisWeek: string
  hoursThisMonth: string
  hoursTotal: string
  weeklyLimit?: string
  talentUsername?: string
  talentRole?: string
  teamMembers: TeamMember[]
}

const sampleContracts: Contract[] = [
  // Project contracts — grouped under "Redesigning and Optimizing Website"
  {
    id: "c1",
    title: "Redesigning and Optimizing Website for Enhanced User Experience.",
    groupId: "g1",
    groupName: "Website Redesign",
    type: "project",
    status: "Active",
    talentName: "Sarah Chen",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$85/hr",
    schedule: "Full-time",
    duration: "15 months",
    startDate: "Mar 10, 2025",
    endDate: "Jun 6, 2026",
    nextMilestone: "Wireframes Due — Mar 28",
    updatedAt: "2 hours ago",
    lastActivity: "No updates this week",
    billingCycle: "Billed every Monday",
    progress: 46,
    hoursToday: "4h 30m",
    hoursThisWeek: "21h 50m",
    hoursThisMonth: "86h 0m",
    hoursTotal: "142h 30m",
    teamMembers: [
      { name: "Sarah Chen", avatar: "/man.jpg", role: "UX Designer" },
      {
        name: "Alex Rivera",
        avatar: "/images/avatar-1.png",
        role: "Frontend Developer",
      },
      {
        name: "Jordan Lee",
        avatar: "/images/avatar-2.png",
        role: "QA Engineer",
      },
      { name: "Chris Patel", avatar: "/man.jpg", role: "Backend Developer" },
      { name: "Dana Kim", avatar: "/images/avatar-1.png", role: "PM" },
      { name: "Nina Torres", avatar: "/images/avatar-2.png", role: "Designer" },
      { name: "Leo Park", avatar: "/man.jpg", role: "DevOps" },
      { name: "Mia Johnson", avatar: "/images/avatar-1.png", role: "Content" },
    ],
  },
  {
    id: "c2",
    title: "Frontend Developer for Mobile App",
    groupId: "g1",
    groupName: "Website Redesign",
    type: "project",
    status: "Active",
    talentName: "Alex Rivera",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$95/hr",
    schedule: "Full-time",
    duration: "3 months",
    startDate: "Mar 1, 2026",
    endDate: "Jun 1, 2026",
    nextMilestone: "Sprint 2 Review — Apr 1",
    updatedAt: "5 hours ago",
    lastActivity: "Committed 3 files",
    billingCycle: "Billed every Friday",
    progress: 28,
    hoursToday: "3h 15m",
    hoursThisWeek: "18h 20m",
    hoursThisMonth: "62h 0m",
    hoursTotal: "62h 0m",
    teamMembers: [
      { name: "Alex Rivera", avatar: "/man.jpg", role: "Frontend Developer" },
    ],
  },
  {
    id: "c3",
    title: "QA Engineer for Mobile App",
    groupId: "g1",
    groupName: "Website Redesign",
    type: "project",
    status: "Pending",
    talentName: "Jordan Lee",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$70/hr",
    schedule: "Part-time",
    duration: "3 months",
    startDate: "",
    endDate: "",
    nextMilestone: "Awaiting deposit",
    updatedAt: "1 day ago",
    lastActivity: "Awaiting acceptance",
    billingCycle: "Billed bi-weekly",
    progress: 0,
    hoursToday: "0h 0m",
    hoursThisWeek: "0h 0m",
    hoursThisMonth: "0h 0m",
    hoursTotal: "0h 0m",
    teamMembers: [
      { name: "Jordan Lee", avatar: "/man.jpg", role: "QA Engineer" },
    ],
  },
  // Service contracts
  {
    id: "c4",
    title: "Redesigning and Optimizing Website for Enhanced User Experience.",
    groupId: "g2",
    groupName: "Website Services",
    type: "service",
    status: "Active",
    talentName: "Chris Patel",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$1,200/mo",
    schedule: "Ongoing",
    duration: "6 months",
    startDate: "Mar 10, 2025",
    endDate: "",
    nextMilestone: "Monthly Report — Mar 31",
    updatedAt: "1 day ago",
    lastActivity: "No updates this week",
    billingCycle: "Billed on the 1st of each month",
    progress: 46,
    hoursToday: "4h 30m",
    hoursThisWeek: "21h 50m",
    hoursThisMonth: "86h 0m",
    hoursTotal: "142h 30m",
    teamMembers: [
      { name: "Chris Patel", avatar: "/man.jpg", role: "SEO Specialist" },
      {
        name: "Dana Kim",
        avatar: "/images/avatar-1.png",
        role: "Content Writer",
      },
      { name: "Sarah Chen", avatar: "/images/avatar-2.png", role: "Designer" },
      { name: "Alex Rivera", avatar: "/man.jpg", role: "Developer" },
      { name: "Jordan Lee", avatar: "/images/avatar-1.png", role: "QA" },
      { name: "Nina Torres", avatar: "/images/avatar-2.png", role: "PM" },
      { name: "Leo Park", avatar: "/man.jpg", role: "DevOps" },
      { name: "Mia Johnson", avatar: "/images/avatar-1.png", role: "Content" },
    ],
  },
  {
    id: "c5",
    title: "Content Writer for SEO",
    groupId: "g2",
    groupName: "Website Services",
    type: "service",
    status: "Active",
    talentName: "Dana Kim",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$50/hr",
    schedule: "Part-time",
    duration: "6 months",
    startDate: "Jan 15, 2026",
    endDate: "",
    nextMilestone: "Blog Batch 4 — Apr 5",
    updatedAt: "3 days ago",
    lastActivity: "Published 2 blog posts",
    billingCycle: "Billed bi-weekly",
    progress: 0,
    hoursToday: "0h 0m",
    hoursThisWeek: "6h 0m",
    hoursThisMonth: "24h 0m",
    hoursTotal: "72h 0m",
    teamMembers: [
      { name: "Dana Kim", avatar: "/man.jpg", role: "Content Writer" },
    ],
  },
  // Team contracts
  {
    id: "c6",
    title: "Design Dynamics",
    groupId: "g3",
    groupName: "Design Dynamics",
    type: "team",
    status: "Active",
    talentName: "Nina Torres",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$60/hr",
    schedule: "Full-time",
    duration: "Ongoing",
    startDate: "Mar 10, 2025",
    endDate: "",
    nextMilestone: "Q1 Campaign Launch — Mar 30",
    updatedAt: "4 hours ago",
    lastActivity: "No updates this week",
    billingCycle: "Billed on the 1st of each month",
    progress: 0,
    hoursToday: "4h 30m",
    hoursThisWeek: "21h 50m",
    hoursThisMonth: "86h 0m",
    hoursTotal: "142h 30m",
    teamMembers: [
      { name: "Nina Torres", avatar: "/man.jpg", role: "Social Media Manager" },
      {
        name: "Leo Park",
        avatar: "/images/avatar-1.png",
        role: "Graphic Designer",
      },
      {
        name: "Mia Johnson",
        avatar: "/images/avatar-2.png",
        role: "Copywriter",
      },
      { name: "Tom Blake", avatar: "/man.jpg", role: "Designer" },
      { name: "Sam Reyes", avatar: "/images/avatar-1.png", role: "Video" },
      { name: "Chris Patel", avatar: "/images/avatar-2.png", role: "SEO" },
      { name: "Dana Kim", avatar: "/man.jpg", role: "Content" },
      { name: "Alex Rivera", avatar: "/images/avatar-1.png", role: "Dev" },
    ],
  },
  {
    id: "c7",
    title: "Graphic Designer",
    groupId: "g3",
    groupName: "Design Dynamics",
    type: "team",
    status: "Active",
    talentName: "Leo Park",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$55/hr",
    schedule: "Full-time",
    duration: "Ongoing",
    startDate: "Feb 1, 2026",
    endDate: "",
    nextMilestone: "Brand Assets V2 — Apr 2",
    updatedAt: "6 hours ago",
    lastActivity: "Uploaded 3 assets",
    billingCycle: "Billed every Monday",
    progress: 0,
    hoursToday: "4h 0m",
    hoursThisWeek: "20h 0m",
    hoursThisMonth: "80h 0m",
    hoursTotal: "160h 0m",
    teamMembers: [
      { name: "Leo Park", avatar: "/man.jpg", role: "Graphic Designer" },
    ],
  },
  {
    id: "c8",
    title: "Copywriter",
    groupId: "g3",
    groupName: "Design Dynamics",
    type: "team",
    status: "Pending",
    talentName: "Mia Johnson",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$45/hr",
    schedule: "Part-time",
    duration: "Ongoing",
    startDate: "",
    endDate: "",
    nextMilestone: "Awaiting acceptance",
    updatedAt: "2 days ago",
    lastActivity: "Awaiting acceptance",
    billingCycle: "Billed bi-weekly",
    progress: 0,
    hoursToday: "0h 0m",
    hoursThisWeek: "0h 0m",
    hoursThisMonth: "0h 0m",
    hoursTotal: "0h 0m",
    teamMembers: [
      { name: "Mia Johnson", avatar: "/man.jpg", role: "Copywriter" },
    ],
  },
  // Individual contracts
  {
    id: "c9",
    title: "UX Designer",
    groupId: "g4",
    groupName: "UX Designer",
    type: "individual",
    status: "Active",
    talentName: "Devon",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$15.00/hr",
    schedule: "Part-time",
    duration: "Ongoing",
    startDate: "Mar 10, 2025",
    endDate: "",
    nextMilestone: "—",
    updatedAt: "12 hours ago",
    lastActivity: "No updates this week",
    billingCycle: "",
    progress: 0,
    hoursToday: "4h 30m",
    hoursThisWeek: "4h 30m",
    hoursThisMonth: "4h 30m",
    hoursTotal: "4h 30m",
    weeklyLimit: "20 hrs weekly limit",
    talentUsername: "@uxdesignpro22",
    talentRole: "UX Designer",
    teamMembers: [{ name: "Devon", avatar: "/man.jpg", role: "UX Designer" }],
  },
  {
    id: "c10",
    title: "Video Editor",
    groupId: "g5",
    groupName: "Video Editor",
    type: "individual",
    status: "Ended",
    talentName: "Sam Reyes",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$75/hr",
    schedule: "Part-time",
    duration: "1 month",
    startDate: "Feb 1, 2026",
    endDate: "",
    nextMilestone: "—",
    updatedAt: "2 weeks ago",
    lastActivity: "Contract ended",
    billingCycle: "",
    progress: 0,
    hoursToday: "0h 0m",
    hoursThisWeek: "0h 0m",
    hoursThisMonth: "0h 0m",
    hoursTotal: "48h 0m",
    weeklyLimit: "40 hrs weekly limit",
    talentUsername: "@samreyes",
    talentRole: "Video Editor",
    teamMembers: [
      { name: "Sam Reyes", avatar: "/man.jpg", role: "Video Editor" },
    ],
  },
]

const statusColors: Record<ContractStatus, string> = {
  Active: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Ended: "bg-gray-50 text-gray-600 border-gray-200",
  Canceled: "bg-red-50 text-red-700 border-red-200",
  Disputed: "bg-orange-50 text-orange-700 border-orange-200",
}

const typeIcons: Record<ContractType, typeof Briefcase> = {
  project: Briefcase,
  service: Monitor,
  team: Users,
  individual: User,
}

const typeLabels: Record<ContractType, string> = {
  project: "Project",
  service: "Service",
  team: "Team",
  individual: "Individual",
}

const typeColors: Record<ContractType, string> = {
  project: "primary",
  service: "purple",
  team: "blue",
  individual: "gray",
}

/** Map API contract to local UI contract shape */
function mapApiContract(c: ApiContract): Contract {
  const typeMap: Record<string, ContractType> = {
    PROJECT: "project",
    SERVICE: "service",
    TEAM: "team",
    JOB: "individual",
  }
  const statusMap: Record<ApiContractStatus, ContractStatus> = {
    ACTIVE: "Active",
    PENDING: "Pending",
    ENDED: "Ended",
    CANCELED: "Canceled",
    DISPUTED: "Disputed",
  }
  const ct: ContractType = c.projectId
    ? "project"
    : c.serviceId
      ? "service"
      : c.teamId
        ? "team"
        : "individual"

  return {
    id: c.id,
    title: c.title,
    groupId: c.groupId,
    groupName: c.title,
    type: ct,
    status: statusMap[c.status] ?? "Active",
    talentName: c.talentId,
    talentAvatar: "/man.jpg",
    clientName: c.clientId,
    rate: `$${c.rate}`,
    schedule: c.schedule,
    duration: c.duration,
    startDate: c.startAtISO
      ? new Date(c.startAtISO).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    endDate: "",
    nextMilestone: "—",
    updatedAt: new Date(c.updatedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    lastActivity: "—",
    billingCycle: "Billed weekly",
    progress: 0,
    hoursToday: "0h 0m",
    hoursThisWeek: "0h 0m",
    hoursThisMonth: "0h 0m",
    hoursTotal: "0h 0m",
    teamMembers: [{ name: c.talentId, avatar: "/man.jpg", role: c.title }],
  }
}

export default function MyContractsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"active" | "pending">("active")
  const [viewMode, setViewMode] = useState<ViewMode>("grouped")
  const [typeFilter, setTypeFilter] = useState<"all" | ContractType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [contracts, setContracts] = useState<Contract[]>(sampleContracts)
  const [loading, setLoading] = useState(true)

  const fetchContracts = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data =
        user.accountType === "TALENT"
          ? await getTalentContracts(user.id)
          : await getClientContracts(user.id)

      if (data.length > 0) {
        setContracts(data.map(mapApiContract))
      } else {
        // Fall back to sample data if API returns empty (service may not be running)
        setContracts(sampleContracts)
      }
    } catch {
      // Fall back to sample data if service is unavailable
      setContracts(sampleContracts)
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  const filtered = useMemo(() => {
    let results = contracts.filter((c) => {
      // Tab filter
      if (
        activeTab === "active" &&
        c.status !== "Active" &&
        c.status !== "Ended" &&
        c.status !== "Disputed"
      )
        return false
      if (
        activeTab === "pending" &&
        c.status !== "Pending" &&
        c.status !== "Canceled"
      )
        return false
      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.groupName.toLowerCase().includes(q) &&
          !c.talentName.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return a.updatedAt.localeCompare(b.updatedAt)
        case "milestone":
          return a.nextMilestone.localeCompare(b.nextMilestone)
        case "az":
          return a.title.localeCompare(b.title)
        case "za":
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

    return results
  }, [activeTab, typeFilter, searchQuery, sortBy])

  // Group contracts by groupId for grouped view
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { groupName: string; type: ContractType; contracts: Contract[] }
    >()
    for (const c of filtered) {
      if (!map.has(c.groupId)) {
        map.set(c.groupId, {
          groupName: c.groupName,
          type: c.type,
          contracts: [],
        })
      }
      map.get(c.groupId)!.contracts.push(c)
    }
    return Array.from(map.values())
  }, [filtered])

  const activeCount = contracts.filter(
    (c) =>
      c.status === "Active" || c.status === "Ended" || c.status === "Disputed"
  ).length
  const pendingCount = contracts.filter(
    (c) => c.status === "Pending" || c.status === "Canceled"
  ).length

  const [showSearch, setShowSearch] = useState(false)
  const [filterCount] = useState(3)

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-dark-blue-400">
                My Contracts
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                You have {contracts.length} contracts in total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                visual="gray"
                size="sm"
                leftIcon={<HelpCircle className="size-4" />}
              >
                Get help
              </Button>
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                leftIcon={<Copy className="size-4" />}
              >
                Browse Contracts
              </Button>
              <Button size="sm" leftIcon={<Plus className="size-4" />}>
                New Contract
              </Button>
            </div>
          </div>

          {/* Tabs row + Filter bar row */}
          <div className="mt-6">
            {/* Tabs + filter actions on same visual row */}
            <div className="flex items-end justify-between border-b border-gray-200">
              {/* Left: search icon + tab triggers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex items-center justify-center size-9 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="size-4" />
                </button>

                <button
                  type="button"
                  className={`px-3 pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "active"
                      ? "border-primary-500 text-primary-500"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("active")}
                >
                  Active
                  <span
                    className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                      activeTab === "active"
                        ? "bg-primary-50 text-primary-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {activeCount}
                  </span>
                </button>

                <button
                  type="button"
                  className={`px-3 pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "pending"
                      ? "border-primary-500 text-primary-500"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending
                  <span
                    className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                      activeTab === "pending"
                        ? "bg-primary-50 text-primary-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-3 pb-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      More
                      <ChevronDown className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("project")}>
                      Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("service")}>
                      Services
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("team")}>
                      Teams
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTypeFilter("individual")}
                    >
                      Individual
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right: Filters, Recent Activity, Download, Group/Individual toggle */}
              <div className="flex items-center gap-2 pb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="gap-1.5"
                    >
                      <FilterLines className="size-4" />
                      Filters
                      {filterCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-medium text-gray-600">
                          {filterCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("project")}>
                      Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("service")}>
                      Services
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("team")}>
                      Teams
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTypeFilter("individual")}
                    >
                      Individual
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="gap-1.5"
                    >
                      <SwitchVertical01 className="size-4" />
                      Recent Activity
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("recent")}>
                      Recent Activity
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("milestone")}>
                      Next Milestone
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("az")}>
                      A → Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("za")}>
                      Z → A
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <IconButton variant="ghost" visual="gray" size="sm">
                  <Download01 className="size-4" />
                </IconButton>

                {/* Group / Individual toggle */}
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 ml-1">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "grouped"
                        ? "bg-gray-100 text-dark-blue-400"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    onClick={() => setViewMode("grouped")}
                  >
                    Group
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "individual"
                        ? "bg-gray-100 text-dark-blue-400"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    onClick={() => setViewMode("individual")}
                  >
                    Individual
                  </button>
                </div>
              </div>
            </div>

            {/* Search bar (expandable) */}
            {showSearch && (
              <div className="mt-3">
                <div className="relative max-w-sm">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Contract cards */}
            <div className="mt-4">
              <ContractsView
                contracts={filtered}
                grouped={grouped}
                viewMode={viewMode}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

function ContractsView({
  contracts,
  viewMode,
}: {
  contracts: Contract[]
  grouped: { groupName: string; type: ContractType; contracts: Contract[] }[]
  viewMode: ViewMode
}) {
  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <FileCheck02 className="size-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">
          No contracts match your filters
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Browse the Marketplace to start a project
        </p>
      </div>
    )
  }

  if (viewMode === "grouped") {
    return (
      <div className="space-y-3">
        {contracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Contract
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Type
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Talent
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Status
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Total Hours
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Progress
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
              Last Activity
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContractCard({ contract }: { contract: Contract }) {
  const TypeIcon = typeIcons[contract.type]
  const isProject = contract.type === "project"
  const isService = contract.type === "service"
  const isTeam = contract.type === "team"
  const isIndividual = contract.type === "individual"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
      {/* Row 1: Title + Status + Actions */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-dark-blue-400 leading-snug">
          {contract.title}
        </h3>
        <div className="flex items-center gap-3 flex-none">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full border ${statusColors[contract.status]}`}
          >
            {contract.status}
          </span>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="flex-none"
          >
            <Plus className="size-4 mr-1.5" />
            Add Team Member
          </Button>
          <ContractActions contract={contract} />
        </div>
      </div>

      {/* Row 2: Subtitle — varies by type */}
      <div className="flex items-center gap-2.5 mt-1.5">
        {/* Project & Service: Type badge + Billing cycle */}
        {(isProject || isService) && (
          <>
            <Badge
              visual={typeColors[contract.type] as any}
              size="sm"
              className="rounded-full capitalize gap-1"
            >
              <TypeIcon className="size-3.5" />
              {typeLabels[contract.type]}
            </Badge>
            <span className="text-sm text-gray-400">
              Billing cycle ·{" "}
              <span className="font-semibold text-dark-blue-400">
                {contract.billingCycle}
              </span>
            </span>
          </>
        )}
        {/* Team: Billing Cycle only (no type badge) */}
        {isTeam && (
          <span className="text-sm text-gray-400">
            Billing Cycle ·{" "}
            <span className="font-semibold text-dark-blue-400">
              {contract.billingCycle}
            </span>
          </span>
        )}
        {/* Individual: Rate + weekly limit */}
        {isIndividual && (
          <span className="text-sm text-gray-400">
            Rate ·{" "}
            <span className="font-semibold text-dark-blue-400">
              {contract.rate}
            </span>
            {contract.weeklyLimit && (
              <span className="ml-1.5 text-gray-400">
                {contract.weeklyLimit}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Row 3: People + Time Stats */}
      <div className="flex items-center justify-between mt-5">
        {/* Left side: Avatars or single talent */}
        {isIndividual ? (
          /* Individual: single avatar with name & role */
          <div className="flex items-center gap-3">
            <Avatar size="md">
              <AvatarImage
                src={contract.talentAvatar}
                alt={contract.talentName}
              />
              <AvatarFallback>{contract.talentName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-dark-blue-400">
                {contract.talentName}{" "}
                {contract.talentUsername && (
                  <span className="font-normal text-gray-400">
                    {contract.talentUsername}
                  </span>
                )}
              </p>
              {contract.talentRole && (
                <p className="text-xs text-gray-400">{contract.talentRole}</p>
              )}
            </div>
          </div>
        ) : (
          /* Project / Service / Team: avatar group */
          <AvatarGroup size="md" max={3} excess>
            {contract.teamMembers.map((member, i) => (
              <Avatar key={i} size="md">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        )}

        {/* Right side: Time stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-400">Today</p>
            <p className="text-sm font-bold text-dark-blue-400">
              {contract.hoursToday}{" "}
              <span className="font-normal text-gray-400">Logged</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">This Week</p>
            <p className="text-sm font-bold text-dark-blue-400">
              {contract.hoursThisWeek}{" "}
              <span className="font-normal text-gray-400">Logged</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">This Month</p>
            <p className="text-sm font-bold text-dark-blue-400">
              {contract.hoursThisMonth}{" "}
              <span className="font-normal text-gray-400">Logged</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Hours</p>
            <p className="text-sm font-bold text-dark-blue-400">
              {contract.hoursTotal}{" "}
              <span className="font-normal text-gray-400">Logged</span>
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Date range + (optional progress bar) + Last activity */}
      <div className="flex items-center justify-between mt-5">
        <div className="flex items-center gap-3 min-w-0 flex-auto mr-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-none">
            <Calendar className="size-3.5" />
            <span>
              {contract.startDate}
              {contract.startDate && " - "}
              {contract.endDate || "Present"}
            </span>
          </div>
          {/* Progress bar: only for project type (has fixed end date) */}
          {isProject && contract.progress > 0 && (
            <div className="flex items-center gap-2.5 flex-auto max-w-[180px]">
              <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-success-500"
                  style={{ width: `${Math.min(contract.progress, 100)}%` }}
                />
                {contract.progress < 100 && (
                  <div
                    className="absolute inset-y-0 rounded-r-full bg-primary-500"
                    style={{
                      left: `${contract.progress}%`,
                      width: `${Math.min(20, 100 - contract.progress)}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500 flex-none">
                {contract.progress}%
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 flex-none">
          Last activity{" "}
          <span className="font-semibold text-dark-blue-400">
            {contract.lastActivity}
          </span>
        </p>
      </div>
    </div>
  )
}

function ContractRow({ contract }: { contract: Contract }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-dark-blue-400 truncate max-w-[240px]">
            {contract.title}
          </p>
          <p className="text-xs text-gray-400">{contract.groupName}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          className="rounded-full text-[10px] capitalize"
          size="sm"
          visual={typeColors[contract.type] as any}
        >
          {typeLabels[contract.type]}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar size="xs">
            <AvatarImage
              src={contract.talentAvatar}
              alt={contract.talentName}
            />
            <AvatarFallback>{contract.talentName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-dark-blue-400">
            {contract.talentName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[contract.status]}`}
        >
          {contract.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-blue-400">
          {contract.hoursTotal}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress
            value={contract.progress}
            bubble={false}
            className="h-1.5 flex-auto"
          />
          <span className="text-xs text-gray-500">{contract.progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">{contract.lastActivity}</span>
      </td>
      <td className="px-4 py-3">
        <ContractActions contract={contract} />
      </td>
    </tr>
  )
}

function ContractActions({ contract }: { contract: Contract }) {
  const handleEndContract = async () => {
    const result = await apiEndContract(contract.id, {
      reasonCode: "Service no longer needed",
      notes: "",
    })
    if (result) window.location.reload()
  }

  const handleRejectContract = async () => {
    const result = await respondToContract(contract.id, {
      accepted: false,
      talentId: contract.talentName,
    })
    if (result) window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton variant="ghost" visual="gray" size="sm">
          <MoreHorizontal className="size-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>View Details</DropdownMenuItem>
        {contract.status === "Active" && (
          <>
            <DropdownMenuItem>View Milestones</DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={handleEndContract}
            >
              End Contract
            </DropdownMenuItem>
          </>
        )}
        {contract.status === "Pending" && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={handleRejectContract}
          >
            Cancel
          </DropdownMenuItem>
        )}
        {contract.status === "Ended" && (
          <DropdownMenuItem>Leave Review</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
