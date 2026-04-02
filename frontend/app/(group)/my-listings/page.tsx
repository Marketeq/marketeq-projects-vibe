"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import NextImage from "@/components/next-image"
import { Briefcase, ChevronDown, ChevronRight, Clock, Eye, Monitor, MoreHorizontal, Plus, Search, Users } from "@blend-metrics/icons"
import { Grid, List } from "@/components/icons"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
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

type ListingType = "project" | "service"
type ListingStatus = "Active" | "Draft" | "Paused" | "Completed"

interface Listing {
  id: string
  title: string
  type: ListingType
  status: ListingStatus
  category: string
  budget: string
  createdAt: string
  mediaUrl?: string
  views: number
  activeContracts: number
}

const statusColors: Record<ListingStatus, string> = {
  Active: "bg-green-50 text-green-700 border-green-200",
  Draft: "bg-gray-50 text-gray-600 border-gray-200",
  Paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
}

const statusMap: Record<string, ListingStatus> = {
  published: "Active",
  draft: "Draft",
  archived: "Completed",
  flagged: "Paused",
}

const newListingOptions = [
  {
    type: "project",
    label: "Project",
    description: "Post a project and hire talent to complete it",
    icon: Briefcase,
    href: "/publish-project",
  },
  {
    type: "service",
    label: "Service",
    description: "Offer a service that clients can purchase",
    icon: Monitor,
    href: "/publish-project",
  },
  {
    type: "team",
    label: "Team",
    description: "Create a team listing to find collaborators",
    icon: Users,
    href: "/publish-project",
  },
  {
    type: "job",
    label: "Job",
    description: "Post a job opening for your organization",
    icon: Briefcase,
    href: "/publish-project",
  },
]

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

function formatBudget(project: any): string {
  if (project.budget) return `$${Number(project.budget).toLocaleString()}`
  if (project.priceMin && project.priceMax) return `$${Number(project.priceMin).toLocaleString()} - $${Number(project.priceMax).toLocaleString()}`
  if (project.priceMin) return `From $${Number(project.priceMin).toLocaleString()}`
  return "—"
}

export default function MyListingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [view, setView] = useState<"grid" | "list">("grid")
  const [typeFilter, setTypeFilter] = useState<"all" | ListingType>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | ListingStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewListingDialog, setShowNewListingDialog] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true)
      const [projRes, svcRes] = await Promise.all([
        fetch(`${apiBase}/v1/projects`).catch(() => null),
        fetch(`${apiBase}/v1/services`).catch(() => null),
      ])

      const all: Listing[] = []

      if (projRes?.ok) {
        const projects: any[] = await projRes.json()
        for (const p of projects) {
          all.push({
            id: p.id,
            title: p.title,
            type: "project",
            status: statusMap[p.status] || "Active",
            category: p.category || p.categories?.[0] || "Uncategorized",
            budget: formatBudget(p),
            createdAt: p.createdAt,
            mediaUrl: p.mediaUrls?.[0],
            views: 0,
            activeContracts: 0,
          })
        }
      }

      if (svcRes?.ok) {
        const services: any[] = await svcRes.json()
        for (const s of services) {
          all.push({
            id: s.id,
            title: s.title,
            type: "service",
            status: statusMap[s.status] || "Active",
            category: s.category || s.categories?.[0] || "Uncategorized",
            budget: formatBudget(s),
            createdAt: s.createdAt,
            mediaUrl: s.mediaUrls?.[0],
            views: 0,
            activeContracts: 0,
          })
        }
      }

      // Sort newest first
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setListings(all)
    } catch (error) {
      console.error("Failed to fetch listings:", error)
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const filtered = listings.filter((listing) => {
    if (typeFilter !== "all" && listing.type !== typeFilter) return false
    if (statusFilter !== "all" && listing.status !== statusFilter) return false
    if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const projectCount = listings.filter((l) => l.type === "project").length
  const serviceCount = listings.filter((l) => l.type === "service").length

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-dark-blue-400">My Listings</h1>
              <p className="text-sm text-gray-500 mt-1">
                {listings.length} total listings &middot; {projectCount} projects &middot; {serviceCount} services
              </p>
            </div>
            <Button size="sm" onClick={() => setShowNewListingDialog(true)}>
              <Plus className="size-4 mr-1.5" />
              New Listing
            </Button>

            <Dialog open={showNewListingDialog} onOpenChange={setShowNewListingDialog}>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-lg font-semibold text-dark-blue-400">Create New Listing</h2>
                  <p className="text-sm text-gray-500 mt-1">What type of listing would you like to create?</p>
                </div>
                <div className="px-4 pb-4 space-y-1">
                  {newListingOptions.map((option) => (
                    <button
                      key={option.type}
                      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                      onClick={() => {
                        setShowNewListingDialog(false)
                        router.push(`${option.href}?type=${option.type}`)
                      }}
                    >
                      <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                        <option.icon className="size-5 text-primary-500" />
                      </div>
                      <div className="flex-auto min-w-0">
                        <p className="text-sm font-medium text-dark-blue-400">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500 flex-none" />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters bar */}
          <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Type filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outlined" visual="gray" size="sm">
                    {typeFilter === "all" ? "All Types" : typeFilter === "project" ? "Projects" : "Services"}
                    <ChevronDown className="size-4 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("project")}>Projects</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("service")}>Services</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outlined" visual="gray" size="sm">
                    {statusFilter === "all" ? "All Statuses" : statusFilter}
                    <ChevronDown className="size-4 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Active")}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Draft")}>Draft</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Paused")}>Paused</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Completed")}>Completed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search */}
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9 h-9 w-[220px] text-sm"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5">
              <button
                className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-gray-100 text-dark-blue-400" : "text-gray-400 hover:text-gray-600"}`}
                onClick={() => setView("grid")}
              >
                <Grid className="size-5" />
              </button>
              <button
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-gray-100 text-dark-blue-400" : "text-gray-400 hover:text-gray-600"}`}
                onClick={() => setView("list")}
              >
                <List className="size-5" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="mt-6">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-sm text-gray-500">Loading listings...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-sm text-gray-500">No listings match your filters</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Listing</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Budget</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Views</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contracts</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((listing) => (
                      <ListingRow key={listing.id} listing={listing} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Featured Image */}
      <div className="relative w-full h-[160px] bg-gray-100">
        {listing.mediaUrl ? (
          <NextImage
            src={listing.mediaUrl}
            alt={listing.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Briefcase className="size-8 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <Badge
            className="rounded-full text-[10px] capitalize shadow-sm"
            size="sm"
            visual={listing.type === "project" ? "primary" : "purple"}
          >
            {listing.type}
          </Badge>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border shadow-sm bg-white ${statusColors[listing.status]}`}>
            {listing.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-dark-blue-400 truncate">{listing.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">{listing.category.replace(/-/g, " ")}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-dark-blue-400">{listing.budget}</span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {listing.views}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="size-3" />
            {formatDate(listing.createdAt)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton variant="ghost" visual="gray" size="sm">
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>
                {listing.status === "Paused" ? "Resume" : "Pause"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function ListingRow({ listing }: { listing: Listing }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative size-10 rounded-lg bg-gray-100 overflow-hidden flex-none">
            {listing.mediaUrl ? (
              <NextImage src={listing.mediaUrl} alt={listing.title} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Briefcase className="size-4 text-gray-300" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-dark-blue-400 truncate max-w-[200px]">{listing.title}</p>
            <p className="text-xs text-gray-400 capitalize">{listing.category.replace(/-/g, " ")}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          className="rounded-full text-[10px] capitalize"
          size="sm"
          visual={listing.type === "project" ? "primary" : "purple"}
        >
          {listing.type}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[listing.status]}`}>
          {listing.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-blue-400">{listing.budget}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500">{listing.views}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500">{listing.activeContracts}</span>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton variant="ghost" visual="gray" size="sm">
              <MoreHorizontal className="size-4" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>
              {listing.status === "Paused" ? "Resume" : "Pause"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
