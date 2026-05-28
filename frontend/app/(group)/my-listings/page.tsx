"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { editProjectListingUrl } from "@/src/lib/listing-urls"
import {
  formatRelativeTime,
  statusToBadgeVisual,
  useMyListings,
} from "@/src/lib/my-listings"
import { ProjectAPI } from "@/service/http/project"
import { cn } from "@/utils/functions"
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
import { ROLE } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { DropdownIcon } from "@/components/icons/dropdown-icon"
import { Grid } from "@/components/icons/grid"
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

export default function MyListingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT
  const [showNewListingDialog, setShowNewListingDialog] = useState(false)
  const [creatingType, setCreatingType] = useState<string | null>(null)
  const { listings, isLoading } = useMyListings()
  const [viewMode, setViewMode] = useState("grid")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [sortBy, setSortBy] = useState<string>("recent")

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
      case "recent":
      case "modified":
      default:
        // Already sorted by recent activity from useMyListings
        break
    }
    return sorted
  }, [listings, activeTab, searchQuery, sortBy])

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
                          <div
                            className={cn(
                              "absolute inset-0 flex items-center justify-center bg-black/50 transition duration-300 cursor-pointer",
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
                                {renderListingMenu(listing.id)}
                              </DropdownMenu>
                            </div>
                            <span className="text-white text-xs leading-none font-semibold">
                              View Details
                            </span>
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
                                  Updated{" "}
                                  {formatRelativeTime(listing.updatedAt)}
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
                    setCreatingType(option.type)
                    try {
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
      </div>
    </AuthenticatedRoute>
  )
}
