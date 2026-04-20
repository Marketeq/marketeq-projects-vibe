"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Archive,
  Briefcase,
  ChevronRight,
  DotsHorizontal,
  Edit3,
  ExternalLink,
  File04,
  FilterLines,
  HelpCircle,
  LifeBuoy,
  Menu,
  Monitor,
  Pause,
  Plus,
  Search,
  Trash02,
  Users,
  XCircle,
} from "@blend-metrics/icons"
import { DropdownIcon } from "@/components/icons/dropdown-icon"
import { Grid } from "@/components/icons/grid"
import { type ListingStatus } from "@/components/listing-card"
import { editProjectListingUrl } from "@/src/lib/listing-urls"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
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
import {
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"

type ListingType = "project" | "service"

interface Listing {
  id: string
  title: string
  type: ListingType
  status: ListingStatus
  category: string
  description?: string
  budget: string
  duration?: string
  rating?: number
  reviewCount?: number
  mediaUrl?: string
  updatedAt?: string
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

// Local fallback images supplied for the My Listings project thumbnails.
// Used to fill in featured images for draft listings that were saved without
// a selected image so the page always renders with platform-approved artwork.
const FALLBACK_IMAGES = [
  "/my-listings-thumbnails/project-thumbnail-0.png",
  "/my-listings-thumbnails/project-thumbnail-1.png",
  "/my-listings-thumbnails/project-thumbnail-2.png",
  "/my-listings-thumbnails/project-thumbnail-3.png",
  "/my-listings-thumbnails/project-thumbnail-4.png",
  "/my-listings-thumbnails/project-thumbnail-5.png",
  "/my-listings-thumbnails/project-thumbnail-6.png",
  "/my-listings-thumbnails/project-thumbnail-7.png",
  "/my-listings-thumbnails/project-thumbnail-8.png",
  "/my-listings-thumbnails/project-thumbnail-9.png",
]

// Team-oriented placeholder titles used when a draft has no title yet.
const FALLBACK_TITLES = [
  "Cross-Functional Delivery Squad",
  "Full-Stack Product Pod",
  "Design + Engineering Sprint Team",
  "Growth & Marketing Retainer Team",
  "Mobile App Delivery Squad",
  "AI Integration Team",
  "DevOps & Platform Engineering Pod",
  "Brand & Website Sprint Team",
]

// Deterministic picker — same draft id always gets the same image/title.
function pickFromList<T>(list: T[], key: string): T {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return list[Math.abs(hash) % list.length]
}

// Seed listings for team-oriented projects and services. These demonstrate
// the kinds of work that are designed to be delivered by multiple team members
// collaborating together (squads, pods, agencies) rather than a single
// freelancer. They always appear on /my-listings alongside the user's drafts.
const TEAM_SEED_LISTINGS: Listing[] = [
  {
    id: "seed-team-product-launch",
    title: "Cross-Functional Product Launch Squad",
    type: "project",
    status: "Active",
    category: "Product",
    description:
      "Assemble a PM, designer, full-stack devs, and growth marketer to take a SaaS product from beta to public launch in 10 weeks.",
    budget: "$45,000 budget",
    duration: "10 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-0.png",
  },
  {
    id: "seed-team-design-system",
    title: "Design System & Component Library Pod",
    type: "project",
    status: "Active",
    category: "Design",
    description:
      "A 4-person team of product designers and frontend engineers builds a Figma design system + React component library for your brand.",
    budget: "$28,000 budget",
    duration: "8 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-1.png",
  },
  {
    id: "seed-team-ai-integration",
    title: "AI Integration & ML Ops Team",
    type: "project",
    status: "Active",
    category: "AI / ML",
    description:
      "ML engineers, data scientists, and a backend lead integrate an LLM workflow into your product with evals, guardrails, and observability.",
    budget: "$62,000 budget",
    duration: "12 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-2.png",
  },
  {
    id: "seed-team-growth-retainer",
    title: "Full-Stack Growth Marketing Retainer",
    type: "service",
    status: "Active",
    category: "Marketing",
    description:
      "A growth lead, paid media specialist, content strategist, and SEO engineer run your acquisition funnel end-to-end each month.",
    budget: "$12,500 / month",
    duration: "Rolling monthly retainer",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-3.png",
  },
  {
    id: "seed-team-mobile-app",
    title: "iOS + Android App Delivery Team",
    type: "service",
    status: "Active",
    category: "Mobile",
    description:
      "A shipped-together pod of iOS, Android, and backend engineers (plus a QA lead) delivers new app features on a 2-week sprint cadence.",
    budget: "$18,000 / sprint",
    duration: "2 week sprints",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-4.png",
  },
  {
    id: "seed-team-brand-sprint",
    title: "Brand Identity & Website Sprint Team",
    type: "service",
    status: "Active",
    category: "Branding",
    description:
      "A brand strategist, visual designer, copywriter, and webflow developer deliver a full brand refresh and marketing site in 6 weeks.",
    budget: "$22,000 flat",
    duration: "6 week sprint",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-5.png",
  },
]

function formatBudget(p: any): string {
  if (p.budget) return `$${Number(p.budget).toLocaleString()} budget`
  if (p.priceMin && p.priceMax)
    return `$${Number(p.priceMin).toLocaleString()} - $${Number(p.priceMax).toLocaleString()}`
  if (p.priceMin) return `From $${Number(p.priceMin).toLocaleString()}`
  return "Budget TBD"
}

function formatDuration(p: any): string {
  if (p.duration) return `${p.duration}`
  if (p.durationWeeks) return `Starting from ${p.durationWeeks} weeks`
  if (p.deliveryDays) return `${p.deliveryDays} day delivery`
  return "Flexible timeline"
}

function statusToBadgeVisual(
  status: ListingStatus
): "success" | "warning" | "gray" | "primary" {
  switch (status) {
    case "Active":
      return "success"
    case "In Review":
    case "Needs Update":
      return "warning"
    case "Draft":
    case "Paused":
    case "Completed":
    default:
      return "gray"
  }
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "—"
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export default function MyListingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT
  const [showNewListingDialog, setShowNewListingDialog] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState("grid")
  const [searchVisible, setSearchVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")

  // Redirect clients to their dashboard — listings is a talent-only page
  useEffect(() => {
    if (user && !isTalent) {
      router.replace("/client-dashboard")
    }
  }, [user, isTalent, router])

  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true)
      const all: Listing[] = []

      // Load autosaved drafts from localStorage (publish-project autosave).
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("marketeq-project-drafts")
          const drafts = raw ? JSON.parse(raw) : {}
          const sortedKeys = Object.keys(drafts).sort((a, b) => {
            const ta = new Date(drafts[a]?.savedAt ?? 0).getTime()
            const tb = new Date(drafts[b]?.savedAt ?? 0).getTime()
            return tb - ta
          })
          for (const key of sortedKeys) {
            const d = drafts[key]
            const info = d?.projectInfo ?? {}
            const scope = d?.projectScope ?? []
            const firstCategory =
              info?.category?.[0]?.category ||
              (Array.isArray(info?.categories) ? info.categories[0] : "") ||
              "Uncategorized"
            const statusLabel: ListingStatus =
              d?.status === "published"
                ? "Active"
                : d?.status === "in_review"
                  ? "In Review"
                  : d?.status === "needs_update"
                    ? "Needs Update"
                    : "Draft"
            const draftId = d?.id || key
            // publish-project strips File-typed featured images on autosave,
            // so drafts almost always come back with no mediaUrl. Fall back
            // to a deterministic local project image so every card shows one.
            const draftMediaUrl =
              d?.media?.featuredImageUrl ||
              d?.media?.coverImageUrl ||
              pickFromList(FALLBACK_IMAGES, draftId)
            const draftTitle =
              info?.title && info.title.trim().length > 0
                ? info.title
                : pickFromList(FALLBACK_TITLES, draftId)
            all.push({
              id: draftId,
              title: draftTitle,
              type: "project",
              status: statusLabel,
              category: firstCategory,
              description: info?.shortDescription || info?.fullDescription,
              mediaUrl: draftMediaUrl,
              budget: formatBudget(info),
              duration: formatDuration({
                duration: scope?.[0]?.rows?.[0]?.duration
                  ? `${scope[0].rows[0].duration.value ?? ""} ${scope[0].rows[0].duration.type ?? ""}`.trim()
                  : undefined,
              }),
              updatedAt: d?.savedAt,
            })
          }
        } catch (e) {
          console.error("Failed to read drafts:", e)
        }
      }

      // Always surface the team-oriented seed listings FIRST so users see
      // the fully-populated examples (title + image + description) before
      // any of their in-progress drafts.
      setListings([...TEAM_SEED_LISTINGS, ...all])
    } catch (error) {
      console.error("Failed to fetch listings:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Refresh when the tab regains focus (user returns from publish-project)
  useEffect(() => {
    const onFocus = () => fetchListings()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchListings])

  const filteredListings = useMemo(() => {
    let items = listings
    if (activeTab === "Shared") items = []
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter((l) => l.title.toLowerCase().includes(q))
    }
    return items
  }, [listings, activeTab, searchQuery])

  const goEdit = (id: string) => router.push(editProjectListingUrl(id))

  const renderListingMenu = (id: string) => (
    <DropdownMenuContent side="bottom" align="end" className="w-56">
      <DropdownMenuItem onClick={() => goEdit(id)}>
        <Edit3 className="h-4 w-4" /> Edit listing
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Users className="h-4 w-4" /> Manage members
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Pause className="h-4 w-4" /> Pause listing
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Archive className="h-4 w-4" /> Archive listing
      </DropdownMenuItem>
      <DropdownMenuItem>
        <HelpCircle className="h-4 w-4" /> Ask a question
      </DropdownMenuItem>
      <DropdownMenuItem>
        <LifeBuoy className="h-4 w-4" /> Get help
      </DropdownMenuItem>
      <DropdownMenuItem>
        <ExternalLink className="h-4 w-4" /> View in marketplace
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem visual="destructive">
        <Trash02 className="h-4 w-4" />
        Delete listing
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-1 p-[32px] min-[1024px]:pl-[248px]">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-dark-blue-400">
              My Listings
            </h1>

            <div className="flex items-center gap-x-6">
              <Button visual="gray" variant="link">
                <HelpCircle className="size-[15px]" />
                Get help
              </Button>
              <div className="flex items-center gap-x-3">
                <Button
                  className="bg-white"
                  variant="outlined"
                  visual="gray"
                  onClick={() => router.push("/find-projects")}
                >
                  <File04 className="size-[15px]" />
                  Browse Projects
                </Button>
                <Button onClick={() => setShowNewListingDialog(true)}>
                  <Plus className="size-[15px]" />
                  New Listing
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
              <TabsList className="justify-between w-full h-[60px] items-start">
                <div className="flex items-end self-end gap-x-4">
                  {searchVisible ? (
                    <IconButton
                      className="text-gray-500"
                      size="md"
                      visual="gray"
                      variant="ghost"
                      onClick={() => setSearchVisible(false)}
                    >
                      <Search className="size-5" />
                    </IconButton>
                  ) : (
                    <div className="relative">
                      <div className="size-10 absolute left-0 inset-y-0 inline-flex items-center justify-center shrink-0">
                        <Search className="size-[18px] text-primary-500" />
                      </div>
                      <input
                        className="p-2.5 pl-[50px] pr-[26px] text-sm focus:ring-0 h-[40px] bg-transparent border-0 border-b border-primary-500"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          setSearchQuery("")
                          setSearchVisible(true)
                        }}
                        className="focus-visible:outline-none text-gray-500 hover:text-primary-500 absolute right-2.5 inset-y-0 flex items-center justify-center"
                      >
                        <XCircle className="size-4" />
                      </button>
                    </div>
                  )}
                  <TabsTrigger value="All">View All</TabsTrigger>
                  <TabsTrigger value="Created">Created by Me</TabsTrigger>
                  <TabsTrigger value="Shared">Shared With Me</TabsTrigger>
                </div>

                <div className="flex items-center gap-x-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        className="text-gray-500"
                        visual="gray"
                        variant="ghost"
                      >
                        Filters <FilterLines className="size-[15px]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="min-w-[11.25rem]"
                    >
                      <DropdownMenuItem>All Listings</DropdownMenuItem>
                      <DropdownMenuItem>Listing type</DropdownMenuItem>
                      <DropdownMenuItem>Status type</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <IconButton
                        className="text-gray-500"
                        size="md"
                        visual="gray"
                        variant="ghost"
                      >
                        <DropdownIcon className="size-6" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="min-w-[11.25rem]"
                    >
                      <DropdownMenuItem>Recently Created</DropdownMenuItem>
                      <DropdownMenuItem>Oldest First</DropdownMenuItem>
                      <DropdownMenuItem>A - Z</DropdownMenuItem>
                      <DropdownMenuItem>Z - A</DropdownMenuItem>
                      <DropdownMenuItem>Last Modified</DropdownMenuItem>
                      <DropdownMenuItem>Last Published</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ToggleGroupRoot
                    className="p-0"
                    value={[viewMode]}
                    onValueChange={(details) => {
                      if (details.value[0]) setViewMode(details.value[0])
                    }}
                  >
                    <ToggleGroupItem
                      className="size-10 p-0 rounded-r-none"
                      value="grid"
                    >
                      <Grid className="size-7" />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      className="size-10 p-0 rounded-l-none"
                      value="list"
                    >
                      <Menu className="size-6" />
                    </ToggleGroupItem>
                  </ToggleGroupRoot>
                </div>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="py-16 text-center text-sm text-gray-500">
                    Loading listings...
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-gray-500">
                      {activeTab === "Shared"
                        ? "No listings have been shared with you yet."
                        : searchQuery
                          ? "No listings match your search."
                          : "You haven't created any listings yet."}
                    </p>
                    {!searchQuery && activeTab !== "Shared" && (
                      <Button
                        className="mt-4"
                        variant="outlined"
                        visual="gray"
                        onClick={() => setShowNewListingDialog(true)}
                      >
                        <Plus className="size-[15px]" />
                        Create your first listing
                      </Button>
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-3 pt-[20px]">
                    {filteredListings.map((listing) => (
                      <article key={listing.id}>
                        <div className="group h-[170px] relative rounded-lg overflow-hidden bg-gray-100">
                          {listing.mediaUrl ? (
                            <Image
                              className="object-cover"
                              src={listing.mediaUrl}
                              alt={listing.title}
                              fill
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Briefcase className="size-10 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 group-hover:opacity-100 opacity-0 transition duration-300">
                            <div className="absolute top-2.5 right-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton
                                    className="text-white size-[27px] rounded-full bg-white/20 hover:text-dark-blue-400 hover:bg-white"
                                    visual="gray"
                                    asChild
                                  >
                                    <span>
                                      <DotsHorizontal className="size-[15px]" />
                                    </span>
                                  </IconButton>
                                </DropdownMenuTrigger>
                                {renderListingMenu(listing.id)}
                              </DropdownMenu>
                            </div>
                            <button
                              onClick={() => goEdit(listing.id)}
                              className="focus-visible:outline-none text-white text-xs leading-none font-semibold"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-start gap-x-3">
                            <div className="space-y-1.5 flex-auto min-w-0">
                              <h2
                                className="text-sm font-semibold text-dark-blue-400 line-clamp-2 hover:underline cursor-pointer"
                                onClick={() => goEdit(listing.id)}
                              >
                                {listing.title}
                              </h2>
                              <div className="flex items-center gap-x-1.5 mt-1.5">
                                <Badge
                                  size="md"
                                  visual={statusToBadgeVisual(listing.status)}
                                >
                                  {listing.status}
                                </Badge>
                                <span className="text-xs leading-none text-dark-blue-400">
                                  Updated {formatRelativeTime(listing.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <table className="border-collapse w-full">
                    <thead>
                      <tr>
                        <th className="text-left px-6 py-3 border-b border-gray-200">
                          <span className="text-xs leading-[18px] font-medium text-dark-blue-400">
                            Listing Name
                          </span>
                        </th>
                        <th className="text-left px-6 py-3 border-b border-gray-200">
                          <span className="text-xs leading-[18px] font-medium text-dark-blue-400">
                            Type
                          </span>
                        </th>
                        <th className="text-left px-6 py-3 border-b border-gray-200">
                          <span className="text-xs leading-[18px] font-medium text-dark-blue-400">
                            Status
                          </span>
                        </th>
                        <th className="text-left px-6 py-3 border-b border-gray-200">
                          <span className="text-xs leading-[18px] font-medium text-dark-blue-400">
                            Last updated
                          </span>
                        </th>
                        <th className="text-left px-6 py-3 border-b border-gray-200"></th>
                      </tr>
                    </thead>
                    <tbody className="mt-3">
                      {filteredListings.map((listing) => (
                        <tr
                          key={listing.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => goEdit(listing.id)}
                        >
                          <td className="px-6 py-2">
                            <span className="text-sm font-semibold text-dark-blue-400">
                              {listing.title}
                            </span>
                          </td>
                          <td className="px-6 py-2">
                            <span className="text-sm leading-5 text-gray-500 capitalize">
                              {listing.type}
                            </span>
                          </td>
                          <td className="px-6 py-2">
                            <Badge
                              size="md"
                              visual={statusToBadgeVisual(listing.status)}
                            >
                              {listing.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-2">
                            <span className="text-sm leading-5 text-gray-500">
                              {formatRelativeTime(listing.updatedAt)}
                            </span>
                          </td>
                          <td
                            className="px-6 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <IconButton variant="ghost" visual="gray">
                                  <DotsHorizontal className="size-[15px]" />
                                </IconButton>
                              </DropdownMenuTrigger>
                              {renderListingMenu(listing.id)}
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Dialog open={showNewListingDialog} onOpenChange={setShowNewListingDialog}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="p-6 pb-2">
              <h2 className="text-lg font-semibold text-dark-blue-400">
                Create New Listing
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                What type of listing would you like to create?
              </p>
            </div>
            <div className="px-4 pb-4 space-y-1">
              {newListingOptions.map((option) => (
                <button
                  key={option.type}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  onClick={() => {
                    setShowNewListingDialog(false)
                    // Pre-create an "Untitled" draft so that simply clicking
                    // this button results in a listing, even if the user
                    // never enters anything and navigates away.
                    const draftId = `draft-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`
                    try {
                      const key = "marketeq-project-drafts"
                      const raw = window.localStorage.getItem(key)
                      const drafts = raw ? JSON.parse(raw) : {}
                      drafts[draftId] = {
                        id: draftId,
                        projectInfo: { title: "Untitled" },
                        media: {},
                        projectScope: [],
                        currentStep: 0,
                        savedAt: new Date().toISOString(),
                      }
                      window.localStorage.setItem(key, JSON.stringify(drafts))
                    } catch {
                      /* ignore */
                    }
                    router.push(
                      `${option.href}?type=${option.type}&draftId=${draftId}`
                    )
                  }}
                >
                  <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                    <option.icon className="size-5 text-primary-500" />
                  </div>
                  <div className="flex-auto min-w-0">
                    <p className="text-sm font-medium text-dark-blue-400">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                  <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500 flex-none" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedRoute>
  )
}
