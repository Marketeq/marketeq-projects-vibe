"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  getClientContracts,
  getTalentContracts,
  endContract as apiEndContract,
  respondToContract,
  type Contract as ApiContract,
  type ContractStatus as ApiContractStatus,
} from "@/src/lib/api/contracts"
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileCheck02,
  Monitor,
  MoreHorizontal,
  Search,
  User,
  Users,
} from "@blend-metrics/icons"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  nextMilestone: string
  updatedAt: string
  teamMembers: TeamMember[]
}

const sampleContracts: Contract[] = [
  // Project contracts — grouped under "Mobile App Redesign"
  {
    id: "c1",
    title: "UX Designer for Mobile App",
    groupId: "g1",
    groupName: "Mobile App Redesign",
    type: "project",
    status: "Active",
    talentName: "Sarah Chen",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$85/hr",
    schedule: "Full-time",
    duration: "3 months",
    startDate: "Mar 1, 2026",
    nextMilestone: "Wireframes Due — Mar 28",
    updatedAt: "2 hours ago",
    teamMembers: [
      { name: "Sarah Chen", avatar: "/man.jpg", role: "UX Designer" },
    ],
  },
  {
    id: "c2",
    title: "Frontend Developer for Mobile App",
    groupId: "g1",
    groupName: "Mobile App Redesign",
    type: "project",
    status: "Active",
    talentName: "Alex Rivera",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$95/hr",
    schedule: "Full-time",
    duration: "3 months",
    startDate: "Mar 1, 2026",
    nextMilestone: "Sprint 2 Review — Apr 1",
    updatedAt: "5 hours ago",
    teamMembers: [
      { name: "Alex Rivera", avatar: "/man.jpg", role: "Frontend Developer" },
    ],
  },
  {
    id: "c3",
    title: "QA Engineer for Mobile App",
    groupId: "g1",
    groupName: "Mobile App Redesign",
    type: "project",
    status: "Pending",
    talentName: "Jordan Lee",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$70/hr",
    schedule: "Part-time",
    duration: "3 months",
    startDate: "",
    nextMilestone: "Awaiting deposit",
    updatedAt: "1 day ago",
    teamMembers: [
      { name: "Jordan Lee", avatar: "/man.jpg", role: "QA Engineer" },
    ],
  },
  // Service contracts — grouped under "SEO Optimization Package"
  {
    id: "c4",
    title: "SEO Specialist",
    groupId: "g2",
    groupName: "SEO Optimization Package",
    type: "service",
    status: "Active",
    talentName: "Chris Patel",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$1,200/mo",
    schedule: "Ongoing",
    duration: "6 months",
    startDate: "Jan 15, 2026",
    nextMilestone: "Monthly Report — Mar 31",
    updatedAt: "1 day ago",
    teamMembers: [
      { name: "Chris Patel", avatar: "/man.jpg", role: "SEO Specialist" },
    ],
  },
  {
    id: "c5",
    title: "Content Writer for SEO",
    groupId: "g2",
    groupName: "SEO Optimization Package",
    type: "service",
    status: "Active",
    talentName: "Dana Kim",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$50/hr",
    schedule: "Part-time",
    duration: "6 months",
    startDate: "Jan 15, 2026",
    nextMilestone: "Blog Batch 4 — Apr 5",
    updatedAt: "3 days ago",
    teamMembers: [
      { name: "Dana Kim", avatar: "/man.jpg", role: "Content Writer" },
    ],
  },
  // Team contract — grouped under "Marketing Team"
  {
    id: "c6",
    title: "Social Media Manager",
    groupId: "g3",
    groupName: "Marketing Team",
    type: "team",
    status: "Active",
    talentName: "Nina Torres",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$60/hr",
    schedule: "Full-time",
    duration: "Ongoing",
    startDate: "Feb 1, 2026",
    nextMilestone: "Q1 Campaign Launch — Mar 30",
    updatedAt: "4 hours ago",
    teamMembers: [
      { name: "Nina Torres", avatar: "/man.jpg", role: "Social Media Manager" },
    ],
  },
  {
    id: "c7",
    title: "Graphic Designer",
    groupId: "g3",
    groupName: "Marketing Team",
    type: "team",
    status: "Active",
    talentName: "Leo Park",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$55/hr",
    schedule: "Full-time",
    duration: "Ongoing",
    startDate: "Feb 1, 2026",
    nextMilestone: "Brand Assets V2 — Apr 2",
    updatedAt: "6 hours ago",
    teamMembers: [
      { name: "Leo Park", avatar: "/man.jpg", role: "Graphic Designer" },
    ],
  },
  {
    id: "c8",
    title: "Copywriter",
    groupId: "g3",
    groupName: "Marketing Team",
    type: "team",
    status: "Pending",
    talentName: "Mia Johnson",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$45/hr",
    schedule: "Part-time",
    duration: "Ongoing",
    startDate: "",
    nextMilestone: "Awaiting acceptance",
    updatedAt: "2 days ago",
    teamMembers: [
      { name: "Mia Johnson", avatar: "/man.jpg", role: "Copywriter" },
    ],
  },
  // Individual contract (standalone)
  {
    id: "c9",
    title: "Logo Design",
    groupId: "g4",
    groupName: "Logo Design",
    type: "individual",
    status: "Active",
    talentName: "Tom Blake",
    talentAvatar: "/man.jpg",
    clientName: "You",
    rate: "$2,500",
    schedule: "Fixed",
    duration: "2 weeks",
    startDate: "Mar 10, 2026",
    nextMilestone: "Final Delivery — Mar 24",
    updatedAt: "12 hours ago",
    teamMembers: [
      { name: "Tom Blake", avatar: "/man.jpg", role: "Designer" },
    ],
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
    nextMilestone: "—",
    updatedAt: "2 weeks ago",
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
    groupName: c.title, // group name resolved when grouped
    type: ct,
    status: statusMap[c.status] ?? "Active",
    talentName: c.talentId,
    talentAvatar: "/man.jpg",
    clientName: c.clientId,
    rate: `$${c.rate}`,
    schedule: c.schedule,
    duration: c.duration,
    startDate: c.startAtISO ? new Date(c.startAtISO).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    nextMilestone: "—",
    updatedAt: new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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
      const data = user.role === "TALENT"
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
      if (activeTab === "active" && c.status !== "Active" && c.status !== "Ended" && c.status !== "Disputed") return false
      if (activeTab === "pending" && c.status !== "Pending" && c.status !== "Canceled") return false
      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.groupName.toLowerCase().includes(q) &&
          !c.talentName.toLowerCase().includes(q)
        ) return false
      }
      return true
    })

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "recent": return a.updatedAt.localeCompare(b.updatedAt)
        case "milestone": return a.nextMilestone.localeCompare(b.nextMilestone)
        case "az": return a.title.localeCompare(b.title)
        case "za": return b.title.localeCompare(a.title)
        default: return 0
      }
    })

    return results
  }, [activeTab, typeFilter, searchQuery, sortBy])

  // Group contracts by groupId for grouped view
  const grouped = useMemo(() => {
    const map = new Map<string, { groupName: string; type: ContractType; contracts: Contract[] }>()
    for (const c of filtered) {
      if (!map.has(c.groupId)) {
        map.set(c.groupId, { groupName: c.groupName, type: c.type, contracts: [] })
      }
      map.get(c.groupId)!.contracts.push(c)
    }
    return Array.from(map.values())
  }, [filtered])

  const activeCount = contracts.filter((c) => c.status === "Active" || c.status === "Ended" || c.status === "Disputed").length
  const pendingCount = contracts.filter((c) => c.status === "Pending" || c.status === "Canceled").length

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-dark-blue-400">My Contracts</h1>
              <p className="text-sm text-gray-500 mt-1">
                {contracts.length} total contracts &middot; {contracts.filter((c) => c.status === "Active").length} active
              </p>
            </div>
          </div>

          {/* Tabs: Active / Pending */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "pending")} className="mt-6">
            <TabsList className="border-b border-gray-200 bg-transparent w-full justify-start gap-x-6 px-0">
              <TabsTrigger
                value="active"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                Active
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500">
                  {activeCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                Pending
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500">
                  {pendingCount}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Shared filter bar for both tabs */}
            <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Type filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outlined" visual="gray" size="sm">
                      {typeFilter === "all" ? "All Types" : typeLabels[typeFilter]}
                      <ChevronDown className="size-4 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("project")}>Projects</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("service")}>Services</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("team")}>Teams</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("individual")}>Individual</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outlined" visual="gray" size="sm">
                      {sortBy === "recent" ? "Recently Updated" : sortBy === "milestone" ? "Next Milestone" : sortBy === "az" ? "A → Z" : "Z → A"}
                      <ChevronDown className="size-4 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setSortBy("recent")}>Recently Updated</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("milestone")}>Next Milestone</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("az")}>A → Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("za")}>Z → A</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Search */}
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9 h-9 w-[220px] text-sm"
                    placeholder="Search contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* View toggle: Grouped / Individual */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5">
                <button
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "grouped" ? "bg-gray-100 text-dark-blue-400" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => setViewMode("grouped")}
                >
                  Grouped
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "individual" ? "bg-gray-100 text-dark-blue-400" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => setViewMode("individual")}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Content for both tabs — same layout, different data via filter */}
            <TabsContent value="active" className="mt-4">
              <ContractsView contracts={filtered} grouped={grouped} viewMode={viewMode} />
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
              <ContractsView contracts={filtered} grouped={grouped} viewMode={viewMode} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

function ContractsView({
  contracts,
  grouped,
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
        <p className="text-sm text-gray-500 mt-3">No contracts match your filters</p>
        <p className="text-xs text-gray-400 mt-1">Browse the Marketplace to start a project</p>
      </div>
    )
  }

  if (viewMode === "grouped") {
    return (
      <div className="space-y-4">
        {grouped.map((group) => (
          <GroupCard key={group.groupName} group={group} />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contract</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Talent</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rate</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Next Milestone</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Updated</th>
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

function GroupCard({
  group,
}: {
  group: { groupName: string; type: ContractType; contracts: Contract[] }
}) {
  const [expanded, setExpanded] = useState(true)
  const TypeIcon = typeIcons[group.type]
  const activeCount = group.contracts.filter((c) => c.status === "Active").length
  const allMembers = group.contracts.map((c) => ({ name: c.talentName, avatar: c.talentAvatar }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
          <TypeIcon className="size-5 text-primary-500" />
        </div>
        <div className="flex-auto min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-dark-blue-400 truncate">{group.groupName}</h3>
            <Badge
              className="rounded-full text-[10px] capitalize"
              size="sm"
              visual={typeColors[group.type] as any}
            >
              {typeLabels[group.type]}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {group.contracts.length} contract{group.contracts.length !== 1 ? "s" : ""} &middot; {activeCount} active
          </p>
        </div>

        <div className="flex items-center gap-4 flex-none">
          <AvatarGroup size="xs" max={4} excess>
            {allMembers.map((member, i) => (
              <Avatar key={i} size="xs">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>

          <ChevronDown className={`size-4 text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </div>
      </button>

      {/* Expanded contracts */}
      {expanded && (
        <div className="border-t border-gray-100">
          {group.contracts.map((contract) => (
            <ContractCardInGroup key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  )
}

function ContractCardInGroup({ contract }: { contract: Contract }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
      <Avatar size="sm">
        <AvatarImage src={contract.talentAvatar} alt={contract.talentName} />
        <AvatarFallback>{contract.talentName[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-auto min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-dark-blue-400 truncate">{contract.title}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-none ${statusColors[contract.status]}`}>
            {contract.status}
          </span>
        </div>
        <p className="text-xs text-gray-500">{contract.talentName} &middot; {contract.rate} &middot; {contract.schedule}</p>
      </div>

      <div className="flex items-center gap-6 flex-none text-xs text-gray-400">
        <span className="hidden md:block">{contract.nextMilestone}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {contract.updatedAt}
        </span>
        <ContractActions contract={contract} />
      </div>
    </div>
  )
}

function ContractRow({ contract }: { contract: Contract }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-dark-blue-400 truncate max-w-[200px]">{contract.title}</p>
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
            <AvatarImage src={contract.talentAvatar} alt={contract.talentName} />
            <AvatarFallback>{contract.talentName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-dark-blue-400">{contract.talentName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[contract.status]}`}>
          {contract.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-blue-400">{contract.rate}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">{contract.nextMilestone}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">{contract.updatedAt}</span>
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
            <DropdownMenuItem className="text-red-600" onClick={handleEndContract}>End Contract</DropdownMenuItem>
          </>
        )}
        {contract.status === "Pending" && (
          <DropdownMenuItem className="text-red-600" onClick={handleRejectContract}>Cancel</DropdownMenuItem>
        )}
        {contract.status === "Ended" && (
          <DropdownMenuItem>Leave Review</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
