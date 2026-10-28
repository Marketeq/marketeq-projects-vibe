"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ProjectAPI } from "@/service/http/project"
import { useCreateListingGate } from "@/utils/useCreateListingGate"
import { editProjectListingUrl } from "@/src/lib/listing-urls"
import { toUserMessage } from "@/lib/listing-errors"
import {
  PublishConfirmDialog,
  getPendingReviewToastTitle,
  getPublishedToastTitle,
  isPublishedResponse,
} from "@/components/listings/publish-confirm-dialog"
import {
  MY_LISTING_STATUSES,
  TITLE_MAX_LENGTH,
  TITLE_MAX_LENGTH_ERROR,
  TITLE_REQUIRED_ERROR,
  type MyListing,
  type MyListingStatus,
  type MyListingType,
  formatRelativeTime,
  statusToBadgeVisual,
  useMyListings,
} from "@/src/lib/my-listings"
import { cn } from "@/utils/functions"
import {
  Archive,
  Briefcase,
  ChevronRight,
  DotsHorizontal,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  File04,
  FilterLines,
  HelpCircle,
  LifeBuoy,
  Menu,
  Monitor,
  Pause,
  Plus,
  RefreshCw,
  Search,
  Trash02,
  Users,
  XCircle,
} from "@blend-metrics/icons"
import { Spinner } from "@/components/ui/spinner/spinner"
import { ROLE } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { DropdownIcon } from "@/components/icons/dropdown-icon"
import { Grid } from "@/components/icons/grid"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  ErrorMessage,
  IconButton,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

const newListingOptions = [
  {
    type: "project",
    label: "Project",
    description: "Post a project and hire talent to complete it",
    icon: Briefcase,
  },
  {
    type: "service",
    label: "Service",
    description: "Offer a service that clients can purchase",
    icon: Monitor,
  },
]

// Filter options per the my-listings Figma ("Filter by" → Offer type / Status type).
// Both lists come from the listing model itself, so a filter option can never
// name a status or type the app doesn't actually produce.
const OFFER_TYPE_OPTIONS: { value: MyListingType; label: string }[] = [
  { value: "project", label: "Projects" },
  { value: "service", label: "Services" },
]
const STATUS_OPTIONS = MY_LISTING_STATUSES

const CASCADE_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
]
const cascadeDelay = (i: number) =>
  CASCADE_DELAYS[Math.min(i, CASCADE_DELAYS.length - 1)]

export default function MyListingsPage() {
  const router = useRouter()
  const { runCreate, createListingGateDialog } = useCreateListingGate()
  const { user } = useAuth()
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT
  const { toast } = useToast()
  const [showNewListingDialog, setShowNewListingDialog] = useState(false)
  const [creatingType, setCreatingType] = useState<string | null>(null)
  const { listings, isLoading, hasError, refreshListings, updateListing } =
    useMyListings()
  const [deleteTarget, setDeleteTarget] = useState<MyListing | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState("grid")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [sortBy, setSortBy] = useState<string>("recent")
  const [typeFilters, setTypeFilters] = useState<MyListingType[]>([])
  const [statusFilters, setStatusFilters] = useState<MyListingStatus[]>([])

  // PMCM-403/AC1: inline rename — only one card can be renaming at a time.
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const skipRenameBlurRef = useRef(false)

  // PMCM-403/AC3: Live/Draft toggle state.
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmPublishTarget, setConfirmPublishTarget] =
    useState<MyListing | null>(null)
  // PMCM-403/AC3: per-listing inline publish-blocked message — either the
  // client-side "complete the required sections" copy (listing.
  // hasValidationError, #715's computation) or a backend rejection
  // (toUserMessage/curated), both rendered the same way per the ticket.
  const [blockedMessageById, setBlockedMessageById] = useState<
    Record<string, string>
  >({})

  const toggleFilter = <T,>(
    value: T,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )

  const activeFilterCount = typeFilters.length + statusFilters.length

  // Redirect clients to their dashboard — listings is a talent-only page
  useEffect(() => {
    if (user && !isTalent) {
      router.replace("/client-dashboard")
    }
  }, [user, isTalent, router])

  const filteredListings = useMemo(() => {
    let items = listings
    if (activeTab === "Shared") {
      items = []
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter((l) => l.title.toLowerCase().includes(q))
    }
    if (typeFilters.length) {
      items = items.filter((l) => typeFilters.includes(l.type))
    }
    if (statusFilters.length) {
      items = items.filter((l) => statusFilters.includes(l.status))
    }
    // Sort
    const sorted = [...items]
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => {
          const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
          const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
          return aT - bT
        })
        break
      case "a-z":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "z-a":
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "published":
        sorted.sort((a, b) => {
          const aT = a.datePublished ? new Date(a.datePublished).getTime() : 0
          const bT = b.datePublished ? new Date(b.datePublished).getTime() : 0
          return bT - aT
        })
        break
      case "recent":
      case "modified":
      default:
        // Already sorted by recent activity from useMyListings
        break
    }
    return sorted
  }, [listings, activeTab, searchQuery, sortBy, typeFilters, statusFilters])

  const goEdit = (id: string) => router.push(editProjectListingUrl(id))

  // PMCM-403/AC1: inline rename — clicking a manageable listing's name
  // (grid or list) starts this instead of navigating to the editor.
  const startRename = (listing: MyListing) => {
    setRenamingId(listing.id)
    setRenameValue(listing.title)
    setRenameError(null)
  }

  const cancelRename = () => {
    skipRenameBlurRef.current = true
    setRenamingId(null)
    setRenameError(null)
  }

  const commitRename = async (listing: MyListing) => {
    if (skipRenameBlurRef.current) {
      // Escape already cancelled — the input's own blur (from unmounting)
      // must not also save.
      skipRenameBlurRef.current = false
      return
    }
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenameError(TITLE_REQUIRED_ERROR)
      return
    }
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setRenameError(TITLE_MAX_LENGTH_ERROR)
      return
    }
    setRenamingId(null)
    if (trimmed === listing.title) return
    const previousTitle = listing.title
    updateListing(listing.id, { title: trimmed })
    try {
      // PMCM-403/AC1: same endpoint the inline editor's own title field
      // already uses for both drafts and already-published listings
      // (verified: updateProjectDraft has no status gate and keeps
      // PMCM-254's first-save-only slug rule either way) — no new backend
      // path needed.
      await ProjectAPI.UpdateProjectDraft(listing.id, { title: trimmed })
    } catch (err) {
      updateListing(listing.id, { title: previousTitle })
      toast({ title: toUserMessage(err), variant: "destructive" })
    }
  }

  // PMCM-403/AC3: Live → Draft is instant, no confirmation.
  const handleUnpublish = async (listing: MyListing) => {
    const previousStatus = listing.status
    updateListing(listing.id, { status: "Draft" })
    setTogglingId(listing.id)
    try {
      await ProjectAPI.UnpublishProject(listing.id)
    } catch (err) {
      updateListing(listing.id, { status: previousStatus })
      toast({ title: toUserMessage(err), variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  const clearBlockedMessage = (id: string) =>
    setBlockedMessageById((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })

  // PMCM-403/AC3: Draft → Live — reuses #715's existing hasValidationError
  // computation (src/lib/my-listings.ts) as the validation gate, same
  // signal the red "Needs Attention" badge already uses. Blocked listings
  // never see the confirmation modal at all.
  const handleDraftToggleClick = (listing: MyListing) => {
    if (listing.hasValidationError) {
      setBlockedMessageById((prev) => ({
        ...prev,
        [listing.id]: "Complete the required sections to publish.",
      }))
      return
    }
    clearBlockedMessage(listing.id)
    setConfirmPublishTarget(listing)
  }

  const handleConfirmPublish = async () => {
    if (!confirmPublishTarget) return
    const listing = confirmPublishTarget
    setTogglingId(listing.id)
    try {
      const res = await ProjectAPI.PublishProject(listing.id)
      setConfirmPublishTarget(null)
      if (isPublishedResponse(res)) {
        updateListing(listing.id, { status: "Active" })
        toast({
          title: getPublishedToastTitle(listing.type),
          variant: "success",
        })
      } else {
        // Held by moderation ("pending_review"): not live, so it stays
        // Draft here (fetchBackendListings maps pending_review to Draft).
        toast({ title: getPendingReviewToastTitle(listing.type) })
      }
    } catch (err) {
      // PMCM-403/AC3: backend still rejected it (validation/moderation) —
      // leave it Draft, treat it like the client-blocked case above.
      setConfirmPublishTarget(null)
      setBlockedMessageById((prev) => ({
        ...prev,
        [listing.id]: toUserMessage(err),
      }))
    } finally {
      setTogglingId(null)
    }
  }

  // QA-202/PMCM-403: the menu item below called nothing — this is the
  // actual delete action, soft-deleting via the endpoint newly wired up in
  // publish.controller.ts (backed by the pre-existing but previously
  // unreachable PublishService.softDelete).
  const handleDeleteProject = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await ProjectAPI.DeleteProject(deleteTarget.id)
      setDeleteTarget(null)
      toast({
        variant: "success",
        title: `${deleteTarget.title || "Listing"} deleted`,
      })
      await refreshListings()
    } catch (err) {
      console.error("Failed to delete project", err)
      toast({
        variant: "destructive",
        title: "Failed to delete listing",
        description: "Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Card ••• menu — matches the Figma Project/Service menus (owner variant;
  // my-listings only surfaces listings the current user owns).
  const renderListingMenu = (listing: MyListing) => {
    const noun = listing.type === "service" ? "service" : "project"
    return (
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuItem>
          <Users className="h-4 w-4" /> Manage members
        </DropdownMenuItem>
        {/* Opens the full editor — renaming itself now happens inline, by
            clicking the listing's name directly (PMCM-403/AC1). */}
        <DropdownMenuItem onClick={() => goEdit(listing.id)}>
          <Edit3 className="h-4 w-4" /> Edit {noun}
        </DropdownMenuItem>
        {/* PMCM-403: out of scope, report only — these two do nothing yet. */}
        <DropdownMenuItem>
          <Pause className="h-4 w-4" /> Pause {noun}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Archive className="h-4 w-4" /> Archive {noun}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
        <DropdownMenuItem
          visual="destructive"
          onClick={() => setDeleteTarget(listing)}
        >
          <Trash02 className="h-4 w-4" />
          Delete {noun}
        </DropdownMenuItem>
      </DropdownMenuContent>
    )
  }

  // PMCM-403/AC3: Figma's "Publishing the Offer" status control — an
  // outlined "• Live"/"• Draft" button whose menu offers Unpublish/Publish.
  // Only meaningful for the two statuses that can actually toggle; every
  // other status (In Review, Needs Update, Paused, Completed) keeps the
  // plain, non-interactive status Badge it already had.
  const renderStatusControl = (listing: MyListing) => {
    const isLive = listing.status === "Active"
    const isDraft = listing.status === "Draft"
    if (!isLive && !isDraft) {
      return (
        <Badge size="md" visual={statusToBadgeVisual(listing.status)}>
          {listing.status}
        </Badge>
      )
    }
    const loading = togglingId === listing.id
    const dotAndLabel = loading ? (
      <Spinner size={14} />
    ) : (
      <>
        <span
          className={cn(
            "size-2 rounded-full shrink-0",
            isLive ? "bg-success-500" : "bg-gray-400"
          )}
        />
        {isLive ? "Live" : "Draft"}
      </>
    )

    // PMCM-403/F2: owner-or-lead only (listings-service's ensureCanPublish)
    // — everyone else sees the same control, DS-disabled, with a tooltip
    // explaining why (same focusable-span wrapper pattern used elsewhere in
    // this codebase for a disabled control under a Tooltip, since a
    // disabled element fires no pointer events on its own).
    if (!listing.canPublish) {
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-block"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="outlined" visual="gray" disabled>
                  {dotAndLabel}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Only the owner or project lead can publish.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outlined"
            visual="gray"
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
          >
            {dotAndLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          {isLive ? (
            <DropdownMenuItem onClick={() => handleUnpublish(listing)}>
              <EyeOff className="h-4 w-4" /> Unpublish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleDraftToggleClick(listing)}>
              <Eye className="h-4 w-4" /> Publish
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderBlockedMessage = (listing: MyListing) => {
    const message = blockedMessageById[listing.id]
    if (!message) return null
    return (
      <ErrorMessage className="mt-1 block" size="sm">
        {message}{" "}
        <span
          className="underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            goEdit(listing.id)
          }}
        >
          Edit listing
        </span>
      </ErrorMessage>
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-1 p-[32px] min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pt-[50px] min-[1024px]:pr-[50px]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-dark-blue-400">
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
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="text-gray-500"
                        visual="gray"
                        variant="ghost"
                      >
                        Filters
                        {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                        <FilterLines className="size-[15px]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="min-w-[11.25rem]"
                    >
                      <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => {
                          setTypeFilters([])
                          setStatusFilters([])
                        }}
                      >
                        All Offers
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="[&>svg]:hidden">
                          Offer type
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="min-w-[11.25rem]">
                          <DropdownMenuCheckItem
                            checked={typeFilters.length === 0}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={() => setTypeFilters([])}
                          >
                            All Types
                          </DropdownMenuCheckItem>
                          {OFFER_TYPE_OPTIONS.map((o) => (
                            <DropdownMenuCheckItem
                              key={o.value}
                              checked={typeFilters.includes(o.value)}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={() =>
                                toggleFilter(o.value, setTypeFilters)
                              }
                            >
                              {o.label}
                            </DropdownMenuCheckItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="[&>svg]:hidden">
                          Status type
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="min-w-[11.25rem]">
                          <DropdownMenuCheckItem
                            checked={statusFilters.length === 0}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={() => setStatusFilters([])}
                          >
                            All Statuses
                          </DropdownMenuCheckItem>
                          {STATUS_OPTIONS.map((s) => (
                            <DropdownMenuCheckItem
                              key={s}
                              checked={statusFilters.includes(s)}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={() =>
                                toggleFilter(s, setStatusFilters)
                              }
                            >
                              {s}
                            </DropdownMenuCheckItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                      <DropdownMenuItem onClick={() => setSortBy("recent")}>
                        Recently Created{sortBy === "recent" ? " ✓" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                        Oldest First{sortBy === "oldest" ? " ✓" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("a-z")}>
                        A - Z{sortBy === "a-z" ? " ✓" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("z-a")}>
                        Z - A{sortBy === "z-a" ? " ✓" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("modified")}>
                        Last Modified{sortBy === "modified" ? " ✓" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("published")}>
                        Last Published{sortBy === "published" ? " ✓" : ""}
                      </DropdownMenuItem>
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
                  <div className="grid grid-cols-4 gap-4 pt-[20px]">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3">
                        <div className="relative h-[170px] overflow-hidden rounded-xl bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </div>
                        <div className="flex flex-col gap-2 px-1">
                          <div className="relative h-4 w-3/4 overflow-hidden rounded bg-gray-100">
                            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                          </div>
                          <div className="relative h-3 w-1/2 overflow-hidden rounded bg-gray-100">
                            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                          </div>
                          <div className="mt-1 flex gap-2">
                            <div className="relative h-5 w-14 overflow-hidden rounded-full bg-gray-100">
                              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                            </div>
                            <div className="relative h-5 w-14 overflow-hidden rounded-full bg-gray-100">
                              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasError && filteredListings.length === 0 ? (
                  // QA-201/PMCM-403: a failed fetch used to render the same
                  // "you haven't created any listings yet" copy below as a
                  // genuinely empty account — misleading, and with no way to
                  // recover short of a full page reload. Mirrors the
                  // error-text + outlined Retry button pattern already used
                  // for other failed-list-loads in the app (e.g. the inbox
                  // right sidebar's profile-load error).
                  <div className="py-16 flex flex-col items-center gap-y-3 text-center">
                    <p className="text-sm text-error-500">
                      Couldn&apos;t load your listings.
                    </p>
                    <Button
                      variant="outlined"
                      visual="gray"
                      onClick={() => refreshListings()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-gray-500">
                      {activeTab === "Shared"
                        ? "No listings have been shared with you yet."
                        : searchQuery
                          ? "No listings match your search."
                          : activeFilterCount > 0
                            ? "No listings match your filters."
                            : "You haven't created any listings yet."}
                    </p>
                    {activeFilterCount > 0 && activeTab !== "Shared" ? (
                      <Button
                        className="mt-4"
                        variant="outlined"
                        visual="gray"
                        onClick={() => {
                          setTypeFilters([])
                          setStatusFilters([])
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      !searchQuery &&
                      activeTab !== "Shared" && (
                        <Button
                          className="mt-4"
                          onClick={() => setShowNewListingDialog(true)}
                        >
                          <Plus className="size-[15px]" />
                          Create Your First Listing
                        </Button>
                      )
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-4 pt-[20px]">
                    {filteredListings.map((listing, index) => (
                      <article key={listing.id} className={`group animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(index)}`}>
                        <div className="h-[170px] relative overflow-hidden rounded-xl bg-gray-100">
                          {listing.mediaUrl ? (
                            <Image
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              src={listing.mediaUrl}
                              alt={listing.title}
                              fill
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-150">
                              <Briefcase className="size-10 text-gray-300" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition duration-300 cursor-pointer",
                              openMenuId === listing.id
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            )}
                            onClick={() => goEdit(listing.id)}
                          >
                            <div
                              className="absolute top-2.5 right-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu
                                open={openMenuId === listing.id}
                                onOpenChange={(open) =>
                                  setOpenMenuId(open ? listing.id : null)
                                }
                              >
                                <DropdownMenuTrigger asChild>
                                  <IconButton
                                    className={cn(
                                      "text-white size-[27px] rounded-full bg-white/20 hover:text-dark-blue-400 hover:bg-white",
                                      openMenuId === listing.id &&
                                        "text-dark-blue-400 bg-white"
                                    )}
                                    visual="gray"
                                    asChild
                                  >
                                    <span>
                                      <DotsHorizontal className="size-[15px]" />
                                    </span>
                                  </IconButton>
                                </DropdownMenuTrigger>
                                {renderListingMenu(listing)}
                              </DropdownMenu>
                            </div>
                            <span className="text-white text-sm font-medium tracking-wide">
                              View Details
                            </span>
                          </div>
                          {/* Service-type indicator on image */}
                          {listing.type === "service" && (
                            <div className="absolute top-2.5 left-2.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                              <Badge
                                size="md"
                                className="gap-x-1 border-transparent bg-gray-900/80 text-white"
                              >
                                <RefreshCw className="size-3" />
                                Service
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="pt-3">
                          <div className="flex items-start justify-between gap-x-2">
                            {renamingId === listing.id ? (
                              <div className="flex-auto min-w-0" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  autoFocus
                                  className="h-8 text-sm font-semibold"
                                  value={renameValue}
                                  maxLength={TITLE_MAX_LENGTH}
                                  isInvalid={!!renameError}
                                  onChange={(e) => {
                                    setRenameValue(e.target.value)
                                    setRenameError(null)
                                  }}
                                  onBlur={() => commitRename(listing)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      ;(e.target as HTMLInputElement).blur()
                                    } else if (e.key === "Escape") {
                                      e.preventDefault()
                                      cancelRename()
                                    }
                                  }}
                                />
                                {renameError && (
                                  <ErrorMessage size="sm">{renameError}</ErrorMessage>
                                )}
                              </div>
                            ) : (
                              <h2
                                className="text-sm font-semibold text-dark-blue-400 line-clamp-2 hover:text-primary-500 cursor-pointer transition-colors duration-150"
                                onClick={(e) => {
                                  if (listing.canRename) {
                                    e.stopPropagation()
                                    startRename(listing)
                                  } else {
                                    goEdit(listing.id)
                                  }
                                }}
                              >
                                {listing.title || "Untitled Listing"}
                              </h2>
                            )}
                            {listing.teamAvatars &&
                              listing.teamAvatars.length > 0 && (
                                <div className="shrink-0">
                                  <AvatarGroup
                                    max={3}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    {listing.teamAvatars.map((src, i) => (
                                      <Avatar
                                        key={i}
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src={src}
                                          alt="Team member"
                                        />
                                        <AvatarFallback />
                                      </Avatar>
                                    ))}
                                  </AvatarGroup>
                                </div>
                              )}
                          </div>
                          <div
                            className="mt-2 flex items-center gap-x-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderStatusControl(listing)}
                            {listing.hasValidationError && (
                              <Badge
                                size="md"
                                visual="error"
                                className="cursor-pointer"
                                onClick={() => goEdit(listing.id)}
                              >
                                Needs Attention
                              </Badge>
                            )}
                            <p className="text-xs text-gray-400">
                              Updated {formatRelativeTime(listing.updatedAt)}
                            </p>
                          </div>
                          {renderBlockedMessage(listing)}
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
                            Team
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
                            <div className="flex items-center gap-x-2">
                              {renamingId === listing.id ? (
                                <div
                                  className="flex-auto min-w-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    autoFocus
                                    className="h-8 text-sm font-semibold"
                                    value={renameValue}
                                    maxLength={TITLE_MAX_LENGTH}
                                    isInvalid={!!renameError}
                                    onChange={(e) => {
                                      setRenameValue(e.target.value)
                                      setRenameError(null)
                                    }}
                                    onBlur={() => commitRename(listing)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        ;(e.target as HTMLInputElement).blur()
                                      } else if (e.key === "Escape") {
                                        e.preventDefault()
                                        cancelRename()
                                      }
                                    }}
                                  />
                                  {renameError && (
                                    <ErrorMessage size="sm">{renameError}</ErrorMessage>
                                  )}
                                </div>
                              ) : (
                                <span
                                  className="text-sm font-semibold text-dark-blue-400"
                                  onClick={(e) => {
                                    if (listing.canRename) {
                                      e.stopPropagation()
                                      startRename(listing)
                                    }
                                  }}
                                >
                                  {listing.title}
                                </span>
                              )}
                              {/* The Type column was replaced by Team, so the
                                  service marker moves next to the name here —
                                  same badge the grid card uses. */}
                              {listing.type === "service" && (
                                <Badge
                                  size="md"
                                  visual="gray"
                                  className="gap-x-1"
                                >
                                  <RefreshCw className="size-3" />
                                  Service
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2">
                            {listing.teamAvatars &&
                            listing.teamAvatars.length > 0 ? (
                              <AvatarGroup
                                max={3}
                                size="sm"
                                excess
                                excessClassName="border-gray-300 text-gray-500"
                              >
                                {listing.teamAvatars.map((src, i) => (
                                  <Avatar
                                    key={i}
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src={src} alt="Team member" />
                                    <AvatarFallback />
                                  </Avatar>
                                ))}
                              </AvatarGroup>
                            ) : (
                              <span className="text-sm leading-5 text-gray-400">
                                —
                              </span>
                            )}
                          </td>
                          <td
                            className="px-6 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-x-2">
                              {renderStatusControl(listing)}
                              {listing.hasValidationError && (
                                <Badge
                                  size="md"
                                  visual="error"
                                  className="cursor-pointer"
                                  onClick={() => goEdit(listing.id)}
                                >
                                  Needs Attention
                                </Badge>
                              )}
                            </div>
                            {renderBlockedMessage(listing)}
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
                              {renderListingMenu(listing)}
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

        <Dialog
          open={showNewListingDialog}
          onOpenChange={(open) => {
            setShowNewListingDialog(open)
            if (!open) setCreatingType(null)
          }}
        >
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
                  disabled={creatingType !== null}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group disabled:opacity-50"
                  onClick={async () => {
                    // G2: the verification check runs before any draft exists. While blocked
                    // the chooser closes and nothing is created or saved.
                    setCreatingType(option.type)
                    try {
                      const { proceeded } = await runCreate(async () => {
                        const res = await ProjectAPI.CreateProjectDraft({
                          title: "",
                          listingType: option.type,
                        })
                        const draftId =
                          res?.data?.projectId ?? res?.data?.id
                        if (draftId) {
                          setShowNewListingDialog(false)
                          router.push(`/my-listings/${draftId}`)
                        } else {
                          console.error("No draft ID returned", res)
                          setCreatingType(null)
                        }
                      })
                      if (!proceeded) {
                        setShowNewListingDialog(false)
                        setCreatingType(null)
                      }
                    } catch (err) {
                      console.error("Failed to create draft", err)
                      setCreatingType(null)
                    }
                  }}
                >
                  <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                    <option.icon className="size-5 text-primary-500" />
                  </div>
                  <div className="flex-auto min-w-0">
                    <p className="text-sm font-medium text-dark-blue-400">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {option.description}
                    </p>
                  </div>
                  {creatingType === option.type ? (
                    <div className="size-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-none" />
                  ) : (
                    <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500 flex-none" />
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {createListingGateDialog}

        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        >
          <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
            <div className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
              <DialogTitle>
                Delete this {deleteTarget?.type === "service" ? "service" : "project"}
              </DialogTitle>
              <DialogDescription>
                &ldquo;{deleteTarget?.title}&rdquo; will be deleted
                permanently. You will not be able to recover it.
              </DialogDescription>

              <DialogFooter className="mt-8 grid gap-x-3">
                <DialogClose asChild>
                  <Button variant="outlined" visual="gray" disabled={isDeleting}>
                    Cancel
                  </Button>
                </DialogClose>

                <Button onClick={handleDeleteProject} disabled={isDeleting}>
                  {isDeleting ? "Deleting…" : "Yes, Delete"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* PMCM-403/AC3: shared publish-confirmation dialog, same component
            the wizard and the inline editor use. */}
        <PublishConfirmDialog
          open={confirmPublishTarget !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmPublishTarget(null)
          }}
          onConfirm={handleConfirmPublish}
          listingType={confirmPublishTarget?.type ?? "project"}
          loading={
            confirmPublishTarget != null &&
            togglingId === confirmPublishTarget.id
          }
        />
      </div>
    </AuthenticatedRoute>
  )
}
