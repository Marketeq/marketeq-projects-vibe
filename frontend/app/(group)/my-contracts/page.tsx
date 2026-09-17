"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/utils/functions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  type Contract as ApiContract,
  type ContractStatus as ApiContractStatus,
  getClientContracts,
  getTalentContracts,
} from "@/src/lib/api/contracts"
// PMCM-331: endContract moves onto the gateway-routed client — the direct-
// to-3010 client's version sends no Authorization header and always 401s.
// getClientContracts/getTalentContracts above are untouched: a separate,
// pre-existing gap (see the same file), out of scope here.
import { endContract as apiEndContract } from "@/service/http/contracts"
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Copy01,
  Download01,
  File02,
  FileCheck02,
  FilterLines,
  HelpCircle,
  LifeBuoy01,
  LinkExternal01,
  List,
  Mail01,
  Monitor,
  MoreHorizontal,
  Pause,
  Edit03,
  Play,
  Plus,
  RefreshCcw01,
  Repeat01,
  Search,
  Trash01,
  User,
  Users,
  Users01,
  XClose,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Card,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Label,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui"
import { ToggleGroupRoot, ToggleGroupItem } from "@/components/ui/toggle-group/toggle-group"

type ContractType = "project" | "service" | "team" | "individual"
type ContractStatus = "Active" | "Pending" | "Paused" | "Completed" | "Ended" | "Canceled" | "Disputed"
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

const statusBadgeVisual: Record<ContractStatus, string> = {
  Active: "success",
  Pending: "warning",
  Paused: "gray",
  Completed: "primary",
  Ended: "gray",
  Canceled: "error",
  Disputed: "orange",
}

const statusColors: Record<ContractStatus, string> = {
  Active: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Paused: "bg-gray-50 text-gray-600 border-gray-200",
  Completed: "bg-primary-50 text-primary-700 border-primary-200",
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
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grouped")
  const [statusFilter, setStatusFilter] = useState<Set<ContractStatus>>(new Set())
  const [contractTypeFilter, setContractTypeFilter] = useState<Set<ContractType>>(new Set())
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Set<string>>(new Set())
  const [lastActivityFilter, setLastActivityFilter] = useState<string | null>(null)
  const [endingInFilter, setEndingInFilter] = useState<string | null>(null)
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")

  const toggleStatus = (s: ContractStatus) => setStatusFilter(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  const toggleContractType = (t: ContractType) => setContractTypeFilter(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
  const togglePaymentStatus = (p: string) => setPaymentStatusFilter(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })
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
      // Contract type filter
      if (contractTypeFilter.size > 0 && !contractTypeFilter.has(c.type)) return false
      // Status filter
      if (statusFilter.size > 0 && !statusFilter.has(c.status)) return false
      // Payment status filter (future data field)
      // Last activity filter
      if (lastActivityFilter === "today") {
        if (!c.updatedAt.toLowerCase().includes("hour") && !c.updatedAt.toLowerCase().includes("just")) return false
      } else if (lastActivityFilter === "7days") {
        if (!c.updatedAt.toLowerCase().includes("hour") && !c.updatedAt.toLowerCase().includes("day")) return false
      } else if (lastActivityFilter === "none") {
        if (!c.lastActivity.toLowerCase().includes("no update")) return false
      }
      // Ending in filter
      if (endingInFilter === "today" && c.endDate !== new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) return false
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
  }, [activeTab, contractTypeFilter, statusFilter, paymentStatusFilter, lastActivityFilter, endingInFilter, searchQuery, sortBy])

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

  const allCount = contracts.length
  const activeCount = contracts.filter(
    (c) =>
      c.status === "Active" || c.status === "Ended" || c.status === "Disputed"
  ).length
  const pendingCount = contracts.filter(
    (c) => c.status === "Pending" || c.status === "Canceled"
  ).length

  const [showSearch, setShowSearch] = useState(false)
  const [newContractOpen, setNewContractOpen] = useState(false)

  return (
    <AuthenticatedRoute>
      <NewContractModal open={newContractOpen} onClose={() => setNewContractOpen(false)} />
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[274px] min-[1024px]:pr-[50px] overflow-hidden">
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
            <div className="flex items-center gap-6">
              <Button
                variant="link"
                visual="gray"
                size="sm"
                className="text-gray-500 hover:text-gray-600"
                leftIcon={<HelpCircle className="size-4" />}
              >
                Get Help
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="bg-white"
                  leftIcon={<Search className="size-[15px]" />}
                >
                  Browse Marketplace
                </Button>
                <Button size="sm" leftIcon={<Plus className="size-[15px]" />} onClick={() => setNewContractOpen(true)}>
                  New Contract
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs row + Filter bar row */}
          <div className="mt-6">
            {/* Tabs + filter actions on same visual row */}
            <div className="flex items-end justify-between">
              {/* Left: search icon + tab triggers */}
              <div className="flex items-end gap-3">
                <IconButton
                  variant="ghost"
                  visual="gray"
                  size="md"
                  className="rounded-full size-10 shrink-0"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="size-[18px]" />
                </IconButton>

                <Tabs
                  value={activeTab}
                  onValueChange={(val) => setActiveTab(val as "all" | "active" | "pending")}
                  unanimated
                >
                  <TabsList className="px-0 pt-0 justify-start border-b-0">
                    <TabsTrigger value="all" className="pb-[11px]">
                      All
                      <Badge
                        visual={activeTab === "all" ? "primary" : "gray"}
                        size="sm"
                        className={activeTab === "all" ? "h-5 px-2 font-bold" : "h-5 px-2 font-bold text-gray-500"}
                      >
                        {allCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="pb-[11px]">
                      Active
                      <Badge
                        visual={activeTab === "active" ? "primary" : "gray"}
                        size="sm"
                        className={activeTab === "active" ? "h-5 px-2 font-bold" : "h-5 px-2 font-bold text-gray-500"}
                      >
                        {activeCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="pb-[11px]">
                      Pending
                      <Badge
                        visual={activeTab === "pending" ? "primary" : "gray"}
                        size="sm"
                        className={activeTab === "pending" ? "h-5 px-2 font-bold" : "h-5 px-2 font-bold text-gray-500"}
                      >
                        {pendingCount}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Right: Filters, Recent Activity, divider, Download, Group/Individual toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" visual="gray" size="sm" className="gap-2 text-gray-500">
                        Filters
                        <FilterLines className="size-[15px]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px]">
                      <DropdownMenuLabel className="px-3 py-2.5 text-[13px] font-bold text-gray-900">Filter by</DropdownMenuLabel>

                      {/* Status */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                            <Button variant="link" visual="gray" className="text-[12px]" onClick={() => setStatusFilter(new Set(["Active","Pending","Paused","Completed","Ended","Canceled","Disputed"] as ContractStatus[]))}>Select All</Button>
                            {statusFilter.size > 0 && <Button variant="link" visual="primary" className="text-[12px]" onClick={() => setStatusFilter(new Set())}>Clear</Button>}
                          </div>
                          {(["Active","Pending","Paused","Completed","Ended","Canceled"] as ContractStatus[]).map(s => (
                            <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} onSelect={e => e.preventDefault()}>{s}</DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Contract type */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Contract type</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                            <Button variant="link" visual="gray" className="text-[12px]" onClick={() => setContractTypeFilter(new Set(["project","service","team","individual"] as ContractType[]))}>Select All</Button>
                            {contractTypeFilter.size > 0 && <Button variant="link" visual="primary" className="text-[12px]" onClick={() => setContractTypeFilter(new Set())}>Clear</Button>}
                          </div>
                          {([["project","Project"],["service","Service"],["team","Team"],["individual","Individual"]] as [ContractType,string][]).map(([val,label]) => (
                            <DropdownMenuCheckboxItem key={val} checked={contractTypeFilter.has(val)} onCheckedChange={() => toggleContractType(val)} onSelect={e => e.preventDefault()}>{label}</DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Date */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Date</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[260px] py-[4px]">
                          <div className="px-3 py-3 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[12px] font-medium text-gray-500">Contract start date</Label>
                              <Input type="date" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} className="h-9 text-[13px]" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[12px] font-medium text-gray-500">Contract end date</Label>
                              <Input type="date" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} className="h-9 text-[13px]" />
                            </div>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Last activity */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Last activity</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          {([["today","Today"],["7days","Last 7 days"],["30days","Last 30 days"],["none","No recent activity"]] as [string,string][]).map(([val,label]) => (
                            <DropdownMenuItem key={val} className={lastActivityFilter === val ? "bg-gray-100 text-gray-900" : ""} onClick={() => setLastActivityFilter(lastActivityFilter === val ? null : val)}>{label}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setLastActivityFilter(null)}>Custom...</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Ending in */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Ending in</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          {([["today","Today"],["7days","7 days"],["30days","30 days"],["30plus","30+ days"]] as [string,string][]).map(([val,label]) => (
                            <DropdownMenuItem key={val} className={endingInFilter === val ? "bg-gray-100 text-gray-900" : ""} onClick={() => setEndingInFilter(endingInFilter === val ? null : val)}>{label}</DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Payment status */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Payment status</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                            <Button variant="link" visual="gray" className="text-[12px]" onClick={() => setPaymentStatusFilter(new Set(["pending","scheduled","paid","overdue"]))}>Select All</Button>
                            {paymentStatusFilter.size > 0 && <Button variant="link" visual="primary" className="text-[12px]" onClick={() => setPaymentStatusFilter(new Set())}>Clear</Button>}
                          </div>
                          {(["Pending","Scheduled","Paid","Overdue"]).map(s => (
                            <DropdownMenuCheckboxItem key={s} checked={paymentStatusFilter.has(s.toLowerCase())} onCheckedChange={() => togglePaymentStatus(s.toLowerCase())} onSelect={e => e.preventDefault()}>{s}</DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Action required */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Action required</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-[180px] py-[4px]">
                          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                            <Button variant="link" visual="gray" className="text-[12px]">Select All</Button>
                          </div>
                          <DropdownMenuItem onSelect={e => e.preventDefault()}>Awaiting acceptance</DropdownMenuItem>
                          <DropdownMenuItem onSelect={e => e.preventDefault()}>Payment due</DropdownMenuItem>
                          <DropdownMenuItem onSelect={e => e.preventDefault()}>Review pending</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" visual="gray" size="sm" className="gap-2 text-gray-500">
                        Recent Activity
                        <img src="/icons/sort.svg" alt="" className="size-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px]">
                      <DropdownMenuLabel className="px-3 py-2.5 text-[13px] font-bold text-gray-900">Sort by</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSortBy("recent")}>Recent Activity</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("milestone")}>Next Milestone</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("az")}>A → Z</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("za")}>Z → A</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Vertical divider */}
                <div className="h-[21px] w-px bg-gray-200 shrink-0" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="rounded-full size-9 text-gray-500"
                    >
                      <Download01 className="size-[15px]" />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4}>
                    <DropdownMenuItem>CSV</DropdownMenuItem>
                    <DropdownMenuItem>PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Group / Individual toggle */}
                <ToggleGroupRoot
                  value={[viewMode]}
                  onValueChange={(details) => {
                    const val = details.value[0] as ViewMode | undefined
                    if (val) setViewMode(val)
                  }}
                  className="rounded-[8px] bg-gray-100 border-gray-200 p-1 gap-0 overflow-visible"
                >
                  <ToggleGroupItem
                    value="grouped"
                    className="rounded-[6px] h-auto py-2 px-3 bg-transparent data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-gray-700"
                  >
                    Group
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="individual"
                    className="rounded-[6px] h-auto py-[7px] px-3 bg-transparent data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-gray-700"
                  >
                    Individual
                  </ToggleGroupItem>
                </ToggleGroupRoot>
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
      <div
        className="space-y-3"
        key={contracts.map((contract) => contract.id).join(",")}
      >
        {contracts.map((contract, index) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            index={index}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
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

function ContractCard({
  contract,
  index,
}: {
  contract: Contract
  index: number
}) {
  const TypeIcon = typeIcons[contract.type]
  const isProject = contract.type === "project"
  const isService = contract.type === "service"
  const isTeam = contract.type === "team"
  const isIndividual = contract.type === "individual"

  return (
    <Card
      className={`flex-col items-start justify-start py-4 px-5 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(
        index
      )}`}
    >
      {/* Row 1: Title + Type badge + Billing info + Status + Actions */}
      <div className="flex items-start justify-between gap-10 self-stretch">
        <div className="flex flex-col justify-center items-start gap-1.5 flex-1 min-w-0">
          <Link href={`/active-project/${contract.id}?title=${encodeURIComponent(contract.title)}&group=${encodeURIComponent(contract.groupName)}`} className="text-sm font-semibold text-dark-blue-400 leading-5 self-stretch hover:underline cursor-pointer">
            {contract.title}
          </Link>
          <div className="flex items-center gap-3">
            {/* Contract type badge */}
            {(isProject || isService) && (
              <Badge visual="success" size="sm" className="rounded-[5px] bg-success-50 text-success-400 text-[10px] font-bold px-1.5 py-1 gap-1">
                <TypeIcon className="size-[10.8px]" />
                {typeLabels[contract.type]}
              </Badge>
            )}
            {/* Billing cycle / phase info */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] leading-[13px] text-gray-400">
                {isIndividual ? "Rate" : "Billing cycle"}
              </span>
              <span className="size-0.5 rounded-full bg-gray-400" />
              <span className="text-[11px] font-semibold leading-[13px] text-gray-500">
                {isIndividual ? contract.rate : contract.billingCycle}
              </span>
            </div>
            {isIndividual && contract.weeklyLimit && (
              <span className="text-[11px] leading-[13px] text-gray-400">
                {contract.weeklyLimit}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {/* Status badge */}
          <Badge
            visual={statusBadgeVisual[contract.status] as any}
            size="sm"
            className="rounded-full mr-3"
          >
            {contract.status}
          </Badge>
          {/* Add Team Member CTA */}
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            leftIcon={<Plus className="size-3.5" />}
          >
            Add Team Member
          </Button>
          {/* More actions */}
          <ContractActions contract={contract} viewMode="grouped" />
        </div>
      </div>

      {/* Row 2: People + Time Stats */}
      <div className="flex items-center gap-5 self-stretch">
        {/* Left side: Avatars or single talent */}
        {isIndividual ? (
          <div className="flex items-center gap-3">
            <Avatar size="md" className="hover:ring-0 active:ring-0">
              <AvatarImage
                src={contract.talentAvatar}
                alt={contract.talentName}
              />
              <AvatarFallback>{contract.talentName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[13px] font-bold leading-4 text-gray-600">
                {contract.talentName}{" "}
                {contract.talentUsername && (
                  <span className="font-normal text-gray-400">
                    {contract.talentUsername}
                  </span>
                )}
              </p>
              {contract.talentRole && (
                <p className="text-[11px] text-gray-400 mt-0.5">{contract.talentRole}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center flex-none min-w-[423px]">
          <AvatarGroup size="md" max={4} excess excessClassName="!border-gray-400 !text-gray-500 !text-[13px] !font-medium !bg-white">
            {contract.teamMembers.map((member, i) => (
              <Avatar
                key={i}
                size="md"
                className="border-2 border-white hover:ring-0 active:ring-0"
              >
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          </div>
        )}

        {/* Right side: Time stats */}
        <div className="flex items-center gap-[50px] rounded-lg ml-auto">
          {[
            { label: "Today", value: contract.hoursToday },
            { label: "This Week", value: contract.hoursThisWeek },
            { label: "This Month", value: contract.hoursThisMonth },
            { label: "Total Hours", value: contract.hoursTotal },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col justify-between items-start gap-0.5 w-[104px]">
              <p className="text-[11px] font-medium leading-5 text-gray-500">
                {stat.label}
              </p>
              <p className="text-[13px] font-bold leading-4 text-gray-600">
                {stat.value} <span className="text-[10px] font-normal">Logged</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Date range + Progress bar + Last activity */}
      <div className="flex items-center justify-between self-stretch">
        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="flex flex-wrap items-center gap-x-[3px]">
            <Calendar className="size-3 text-gray-500" strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-3 text-gray-500">
              {contract.startDate}
              {contract.startDate && " - "}
              {contract.endDate || "Present"}
            </span>
          </div>
          {/* Progress bar: only for project type */}
          {isProject && contract.progress > 0 && (
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-0.5 h-2 w-[163px]">
                <div
                  className="h-2 bg-[#A6F4C5] rounded-l"
                  style={{ width: `${Math.round(contract.progress * 0.34)}%` }}
                />
                <div
                  className="h-2 bg-[#98B6FF] rounded-sm"
                  style={{ width: `${Math.round(contract.progress * 0.41)}%` }}
                />
                <div
                  className="h-2 bg-gray-200 rounded-r flex-1"
                />
              </div>
              <span className="text-[10px] font-medium leading-3 text-dark-blue-400">
                {contract.progress}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-[3px]">
          <span className="text-[10px] leading-3 text-gray-400">
            Last activity
          </span>
          <span className="text-[10px] font-medium leading-3 text-gray-500">
            {contract.lastActivity}
          </span>
        </div>
      </div>
    </Card>
  )
}

function ContractRow({ contract }: { contract: Contract }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <Link href={`/active-project/${contract.id}?title=${encodeURIComponent(contract.title)}&group=${encodeURIComponent(contract.groupName)}`} className="text-sm font-semibold text-dark-blue-400 truncate max-w-[240px] hover:underline cursor-pointer block">
            {contract.title}
          </Link>
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
        <ContractActions contract={contract} viewMode="individual" />
      </td>
    </tr>
  )
}

function PostJobIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15.9999 20.9998V4.99977C15.9999 4.46934 15.7892 3.96063 15.4141 3.58556C15.039 3.21048 14.5303 2.99977 13.9999 2.99977H9.99989C9.46946 2.99977 8.96075 3.21048 8.58568 3.58556C8.21061 3.96063 7.99989 4.46934 7.99989 4.99977V20.9998M3.99989 6.99977H19.9999C21.1045 6.99977 21.9999 7.8952 21.9999 8.99977V18.9998C21.9999 20.1043 21.1045 20.9998 19.9999 20.9998H3.99989C2.89532 20.9998 1.99989 20.1043 1.99989 18.9998V8.99977C1.99989 7.8952 2.89532 6.99977 3.99989 6.99977Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SendOfferIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14.0005 11H8.00054M10.0005 15H8.00054M16.0005 7.00001H8.00054M20.0005 6.80001V17.2C20.0005 18.8802 20.0005 19.7202 19.6736 20.362C19.3859 20.9265 18.927 21.3854 18.3625 21.673C17.7208 22 16.8807 22 15.2005 22H8.80054C7.12038 22 6.2803 22 5.63857 21.673C5.07408 21.3854 4.61514 20.9265 4.32752 20.362C4.00054 19.7202 4.00054 18.8802 4.00054 17.2V6.80001C4.00054 5.11985 4.00054 4.27977 4.32752 3.63803C4.61514 3.07355 5.07408 2.61461 5.63857 2.32699C6.2803 2.00001 7.12038 2.00001 8.80054 2.00001H15.2005C16.8807 2.00001 17.7208 2.00001 18.3625 2.32699C18.927 2.61461 19.3859 3.07355 19.6736 3.63803C20.0005 4.27977 20.0005 5.11985 20.0005 6.80001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrowseMarketplaceIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22.0009 11.9998C22.0009 17.5226 17.5237 21.9998 12.0009 21.9998M22.0009 11.9998C22.0009 6.47695 17.5237 1.9998 12.0009 1.9998M22.0009 11.9998H2.00087M12.0009 21.9998C6.47802 21.9998 2.00087 17.5226 2.00087 11.9998M12.0009 21.9998C14.5021 19.2614 15.9236 15.7078 16.0009 11.9998C15.9236 8.29183 14.5021 4.73815 12.0009 1.9998M12.0009 21.9998C9.49959 19.2614 8.07812 15.7078 8.00087 11.9998C8.07812 8.29183 9.49959 4.73815 12.0009 1.9998M2.00087 11.9998C2.00087 6.47695 6.47802 1.9998 12.0009 1.9998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NewContractModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [selected, setSelected] = useState<"post-job" | "send-offer" | "browse" | null>(null)

  const options = [
    {
      id: "post-job" as const,
      Icon: PostJobIcon,
      title: "Post a job",
      description:
        "Create a job post and let qualified talent apply. Best when you want to compare applicants before hiring.",
      href: "/my-jobs",
    },
    {
      id: "send-offer" as const,
      Icon: SendOfferIcon,
      title: "Send an offer",
      description:
        "Search for a specific talent and send them a contract offer directly. Best when you already know who you want to hire.",
      href: "/inbox",
    },
    {
      id: "browse" as const,
      Icon: BrowseMarketplaceIcon,
      title: "Browse the Marketplace",
      description:
        "Explore available talent, compare profiles, and send an offer when you find the right fit.",
      href: "/",
    },
  ]

  const handleContinue = () => {
    const opt = options.find((o) => o.id === selected)
    if (!opt) return
    onClose()
    router.push(opt.href)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="p-0 gap-0 max-w-[582px] w-[582px] overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-5">
          <DialogTitle className="flex-1 text-[20px] font-bold text-dark-blue-400 leading-normal">
            How do you want to create this contact?
          </DialogTitle>
          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray" size="sm" className="shrink-0 rounded-[8px]">
              <XClose className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-[10px] px-5 pt-[6px] pb-[6px]">
          {options.map(({ id, Icon, title, description }) => {
            const isSelected = selected === id
            return (
              <Button
                key={id}
                variant="ghost"
                visual="gray"
                className={cn(
                  "flex items-start gap-x-4 p-6 rounded-[8px] text-left w-full h-auto justify-start",
                  "shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]",
                  isSelected
                    ? "border-2 border-primary-500 bg-transparent hover:bg-transparent"
                    : "border border-gray-200 bg-transparent hover:border-gray-300 hover:bg-transparent"
                )}
                onClick={() => setSelected(id)}
              >
                <Icon
                  className={cn(
                    "size-6 shrink-0",
                    isSelected ? "text-primary-500" : "text-dark-blue-400"
                  )}
                />
                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-[16px] font-semibold leading-normal whitespace-normal",
                      isSelected ? "text-primary-500" : "text-dark-blue-400"
                    )}
                  >
                    {title}
                  </span>
                  <span className="text-[15px] font-normal leading-5 text-gray-500 whitespace-normal">
                    {description}
                  </span>
                </div>
              </Button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-7 px-5 py-[14px]">
          <Button variant="link" visual="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="py-[10px] px-4 w-[108px] h-auto" disabled={!selected} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ActionItem = { label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; destructive?: boolean } | "sep"

import type React from "react"

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Manage members":    Users01,
  "Manage member":     Users01,
  "Manage contractor": Users01,
  "View members":      Users01,
  "View team members": Users01,
  "View profile":      User,
  "Pause project":     Pause,
  "Pause service":     Pause,
  "Pause team":        Pause,
  "Pause contract":    Pause,
  "Resume project":    Play,
  "Resume service":    Play,
  "Resume team":       Play,
  "Resume contract":   Play,
  "Rename project":    Edit03,
  "Rename service":    Edit03,
  "Rename team":       Edit03,
  "Rename contract":   Edit03,
  "Create similar":    Copy01,
  "Change to service": RefreshCcw01,
  "Change to project": RefreshCcw01,
  "Restart project":   Repeat01,
  "View invites":      Mail01,
  "View offer":        File02,
  "Add tasks":         List,
  "Ask a question":    HelpCircle,
  "Get help":          LifeBuoy01,
  "View listing":      LinkExternal01,
  "View team":         LinkExternal01,
  "View job":          LinkExternal01,
  "End contract":      Trash01,
  "Move to group":     ArrowLeft,
  "Move member":       ArrowLeft,
  "Rehire team":       Repeat01,
  "Rehire":            Repeat01,
}

function ContractActions({ contract, viewMode }: { contract: Contract; viewMode: ViewMode }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isClient = user?.accountType === "CLIENT"
  const isGrouped = viewMode === "grouped"
  const { status, type } = contract

  const isActive = status === "Active" || status === "Disputed"
  const isPending = status === "Pending"
  const isPaused = status === "Paused"
  const isCompleted = status === "Completed" || status === "Ended"
  const isCanceled = status === "Canceled"
  const isTerminal = isCompleted || isCanceled

  // PMCM-331: AC-26 confirmation modal + FR-5/FR-6 loading + duplicate-click
  // guard + FR-11 error toast around the existing End contract action.
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isEndingContract, setIsEndingContract] = useState(false)

  const handleEndContract = async () => {
    // Same offline pre-flight shape as hire-me-button.tsx: checked before any
    // loading state flips, nothing async has started yet so no cleanup is
    // needed on this path.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast({
        variant: "destructive",
        description:
          "You appear to be offline. Please check your connection and try again.",
        duration: 5000,
      })
      return
    }

    setIsEndingContract(true)
    try {
      // service/http/contracts.ts's endContract throws on non-2xx (via
      // AxiosRequest's interceptor) instead of returning null — the
      // src/lib/api/contracts.ts client this replaced returned null on
      // failure, so the success/failure split moves into try/catch here.
      await apiEndContract(contract.id, { reasonCode: "Service no longer needed", notes: "" })
      window.location.reload()
    } catch {
      setIsEndingContract(false)
      toast({
        variant: "destructive",
        description: "We couldn't end this contract. Please try again.",
        duration: 5000,
      })
    }
  }

  const viewLabel = type === "team" ? "View team" : type === "individual" ? "View job" : "View listing"

  const navRoutes: Record<string, string> = {
    "Ask a question":    "/inbox",
    "Get help":          "/settings",
    "Add tasks":         `/active-project/${contract.id}`,
    "View members":      `/active-project/${contract.id}`,
    "View team members": `/active-project/${contract.id}`,
    "Manage members":    `/active-project/${contract.id}`,
    "Manage member":     `/active-project/${contract.id}`,
    "Manage contractor": `/active-project/${contract.id}`,
    "View team":         "/my-teams",
    "View offer":        "/inbox",
    "View invites":      "/inbox",
    // "View listing" needs the listing slug from the API — not available yet
    // "View job" needs the job slug from the API — not available yet
    // "View profile" needs the talent's profile slug — not available yet
  }

  const items: ActionItem[] = []
  const add = (...labels: string[]) =>
    labels.forEach(l => {
      const route = navRoutes[l]
      items.push({ label: l, icon: ACTION_ICONS[l] ?? HelpCircle, onClick: route ? () => router.push(route) : undefined })
    })
  const sep = () => items.push("sep")
  const tail = () => { sep(); add("Ask a question", "Get help", viewLabel) }
  const endItem: ActionItem = { label: "End contract", icon: Trash01, onClick: () => setShowEndConfirm(true), destructive: true }

  if (isGrouped) {
    if (type === "project") {
      isTerminal ? add("View members") : add("Manage members")
      if (isActive) {
        add("Pause project")
        if (isClient) add("Create similar", "Change to service")
        add("Rename project")
      } else if (isPending) {
        add("View invites")
        if (isClient) add("Create similar", "Change to service")
        add("Rename project")
      } else if (isPaused) {
        if (isClient) add("Resume project", "Create similar", "Change to service")
        add("Rename project")
      } else if (isCompleted) {
        if (isClient) add("Restart project", "Rehire team", "Create similar")
        add("Rename project")
      } else if (isCanceled) {
        if (isClient) add("Rehire team", "Create similar")
        add("Rename project")
      }
    } else if (type === "service") {
      isTerminal ? add("View members") : add("Manage members")
      if (isActive) {
        add("Pause service")
        if (isClient) add("Change to project", "Create similar")
        add("Rename service")
      } else if (isPending) {
        add("View invites")
        if (isClient) add("Change to project", "Create similar")
        add("Rename service")
      } else if (isPaused) {
        if (isClient) add("Resume service", "Create similar", "Change to project")
        add("Rename service")
      } else if (isTerminal) {
        if (isClient) add("Rehire team", "Create similar")
        add("Rename service")
      }
    } else if (type === "team") {
      isTerminal ? add("View members") : add("Manage members")
      if (isActive) {
        add("Pause team")
        if (isClient) add("Add tasks")
        add("Rename team")
      } else if (isPending) {
        add("View invites")
        if (isClient) add("Add tasks")
        add("Rename team")
      } else if (isPaused) {
        if (isClient) add("Resume team", "Add tasks")
        add("Rename team")
      } else if (isTerminal) {
        if (isClient) add("Rehire team")
        add("Rename team")
      }
    } else {
      // individual - group view
      isTerminal ? add("View profile") : add("Manage contractor")
      if (isActive) {
        add("Move to group", "Pause contract", "Rename contract")
        if (isClient) add("Add tasks")
      } else if (isPending) {
        add("View offer", "Rename contract")
      } else if (isPaused) {
        add("Move to group")
        if (isClient) add("Resume contract")
        add("Rename contract")
        if (isClient) add("Add tasks")
      } else if (isTerminal) {
        add("Rename contract")
        if (isClient) add("Rehire")
      }
    }
    tail()
    if (type === "individual" && isClient && !isTerminal) items.push(endItem)
  } else {
    // individual view (table rows)
    if (type === "project") {
      isTerminal ? add("View profile") : add("Manage member")
      if (isActive) {
        add("Move member", "Pause contract", "Rename project")
      } else if (isPending) {
        add("View offer", "Rename project")
      } else if (isPaused) {
        if (isClient) add("Resume contract")
        add("Move member", "Rename project")
      } else if (isCompleted) {
        add("Rename project")
        if (isClient) add("Rehire")
      } else if (isCanceled) {
        add("Rename contract")
        if (isClient) add("Rehire")
      }
    } else if (type === "service") {
      isTerminal ? add("View profile") : add("Manage member")
      if (isActive) add("Move member", "Pause contract")
      else if (isPending) add("View offer")
      else if (isPaused) {
        add("Move member")
        if (isClient) add("Resume contract")
      } else if (isTerminal) {
        if (isClient) add("Rehire")
      }
    } else if (type === "team") {
      isTerminal ? add("View profile") : add("Manage member")
      if (isActive) add("Move member", "Pause team", "Add tasks")
      else if (isPending) add("View offer", "Add tasks")
      else if (isPaused) {
        add("Move member")
        if (isClient) add("Resume contract")
        add("Add tasks")
      } else if (isTerminal) {
        if (isClient) add("Rehire")
      }
    } else {
      // individual - individual view
      isTerminal ? add("View profile") : add("Manage contractor")
      if (isActive) {
        add("Move to group", "Pause contract", "Rename contract")
        if (isClient) add("Add tasks")
      } else if (isPending) {
        add("View offer", "Rename contract")
        if (isClient) add("Add tasks")
      } else if (isPaused) {
        add("Move to group")
        if (isClient) add("Resume contract")
        add("Rename contract")
        if (isClient) add("Add tasks")
      } else if (isTerminal) {
        add("Rename contract")
        if (isClient) add("Rehire")
      }
    }
    tail()
    if (isClient && !isTerminal) items.push(endItem)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <IconButton variant="ghost" visual="gray" size="sm" className="rounded-full focus:!bg-transparent focus-visible:!bg-transparent data-[state=open]:bg-gray-100">
            <MoreHorizontal className="size-4" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item, i) =>
            item === "sep" ? (
              <DropdownMenuSeparator key={i} />
            ) : (
              <DropdownMenuItem
                key={i}
                className={item.destructive ? "text-red-600 focus:text-red-600 gap-2" : "gap-2"}
                onClick={item.onClick}
              >
                <item.icon className={`size-4 shrink-0 ${item.destructive ? "text-red-500" : "text-gray-500"}`} />
                {item.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PMCM-331 / AC-26: same shape as the bulk-delete confirm in
      inbox/components/left-sidebar.tsx — Dialog/DialogContent/DialogTitle/
      DialogDescription/DialogClose/Button from @/components/ui, no new
      component. AC-26.4: Cancel is a bare DialogClose, so it closes with no
      other state change. */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-[348px] p-7 rounded-xl">
          <DialogTitle>End this contract?</DialogTitle>
          <DialogDescription className="mt-2">
            This will end the contract for {contract.talentName}. This action
            cannot be undone.
          </DialogDescription>
          <div className="mt-8 grid grid-cols-2 gap-x-3">
            <DialogClose asChild>
              <Button visual="gray" variant="outlined">
                Cancel
              </Button>
            </DialogClose>
            <Button
              visual="error"
              loading={isEndingContract}
              onClick={handleEndContract}
            >
              Yes, End Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
