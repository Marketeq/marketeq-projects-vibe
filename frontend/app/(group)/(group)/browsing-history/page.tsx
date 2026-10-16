"use client"

import * as React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import {
  type TalentUser,
  talentToCardProps,
  useTalentUsers,
} from "@/src/lib/api/talent-users"
import {
  type FavoriteType,
  addFavorite,
  findFavoriteByTypeAndItemId,
  getAllFavorites,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { cn, getFirstItem } from "@/utils/functions"
import { Check, SearchMd, User01, XCircle } from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { ListingCard } from "@/components/listing-card"
import NextLink from "@/components/next-link"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
import { TeamCardLandscape } from "@/components/team-card-landscape"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  Input,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

const TABS = [
  "Show All",
  "Recent Projects",
  "Recent Services",
  "Recent Talent",
  "Recent Teams",
  "Recent Jobs",
] as const
type TabValue = (typeof TABS)[number]

// ========================
// Placeholder data — layout-only until browsing-history backend is wired
// ========================

interface ProjectPlaceholder {
  id: string
  title: string
  description: string
  mediaUrl: string
  budget: string
  duration?: string
  rating: number
  reviewCount: number
  collaborators: string[]
}

const STATIC_PROJECTS: ProjectPlaceholder[] = [
  {
    id: "history-project-1",
    title: "The Ultimate Mobile App Experience",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    mediaUrl: "/browsing-history-project.jpg",
    budget: "$50,000",
    duration: "Starting from 12 weeks",
    rating: 4.9,
    reviewCount: 5,
    collaborators: ["/woman.jpg", "/man.jpg", "/woman.jpg", "/man.jpg"],
  },
  {
    id: "history-project-2",
    title: "Corporate Dashboard Redesign",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    mediaUrl: "/dashboard.png",
    budget: "$32,000",
    duration: "Starting from 8 weeks",
    rating: 4.8,
    reviewCount: 12,
    collaborators: ["/man.jpg", "/woman.jpg"],
  },
]

const STATIC_SERVICES: ProjectPlaceholder[] = [
  {
    id: "history-service-1",
    title: "The Ultimate Mobile App Experience",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    mediaUrl: "/browsing-history-service.jpg",
    budget: "$5,000",
    rating: 4.9,
    reviewCount: 5,
    collaborators: ["/woman.jpg", "/man.jpg", "/woman.jpg", "/man.jpg"],
  },
  {
    id: "history-service-2",
    title: "Full-Stack Web Development",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    mediaUrl: "/dashboard.png",
    budget: "$3,200",
    rating: 4.7,
    reviewCount: 9,
    collaborators: ["/man.jpg"],
  },
]

interface TeamPlaceholder {
  id: string
  name: string
  handle: string
  tagline: string
  experience: string
  rate: string
  locations: string
  rating: number
  projectCount: number
  skills: string[]
  memberAvatars: string[]
  previousClientLogos: string[]
}

const STATIC_TEAMS: TeamPlaceholder[] = [
  {
    id: "history-team-1",
    name: "Team Name",
    handle: "@Tech_Sential",
    tagline: "Development Team",
    experience: "Average 10 years of experience",
    rate: "$85 - $120/hr",
    locations: "UK, USA, Brazil, Philippines, more...",
    rating: 4.9,
    projectCount: 16,
    skills: [
      "iOS",
      "E-commerce",
      "Mobile Application",
      "Small Business",
      "Software Development",
    ],
    memberAvatars: ["/woman.jpg", "/man.jpg", "/woman.jpg", "/man.jpg"],
    previousClientLogos: ["/Adobe-1.png", "/google.png"],
  },
]

interface JobPlaceholder {
  id: string
  title: string
}

const STATIC_JOBS: JobPlaceholder[] = [
  { id: "history-job-1", title: "Camera Motion Sensing Project" },
  { id: "history-job-2", title: "Encrypted SMS Gateway Integration" },
]

type HistoryItem =
  | { type: "talent"; data: ReturnType<typeof talentToCardProps>; raw: TalentUser }
  | { type: "project"; data: ProjectPlaceholder }
  | { type: "service"; data: ProjectPlaceholder }
  | { type: "team"; data: TeamPlaceholder }
  | { type: "job"; data: JobPlaceholder }

function getHistoryItemLabel(item: HistoryItem): string {
  switch (item.type) {
    case "talent":
      return item.data.name
    case "project":
    case "service":
    case "job":
      return item.data.title
    case "team":
      return item.data.name
  }
}

function interleave(lists: HistoryItem[][]): HistoryItem[] {
  const maxLen = Math.max(0, ...lists.map((list) => list.length))
  const result: HistoryItem[] = []
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (list[i]) result.push(list[i])
    }
  }
  return result
}

// ========================
// Favorites
// ========================

type FavoriteEntityType = "project" | "service" | "team" | "talent" | "job"

// The shared ListingCard's "list" layout renders collaborators via its own
// default AvatarGroup, which doesn't match the approved row placement here
// (32px avatars, left-aligned directly under the description). Rather than
// touch the shared component, this is passed in through its existing
// `avatarsSlot` override prop — a supported customization point, not a
// workaround. Matches Figma "Property 1=Default" (Frame 1948757309).
function HistoryCollaboratorAvatars({ avatars }: { avatars: string[] }) {
  if (avatars.length === 0) return null
  const shown = avatars.slice(0, 5)
  const overflow = avatars.length - shown.length

  return (
    <div className="flex items-center">
      {shown.map((src, i) => (
        <Avatar
          key={i}
          className={cn(
            "size-8 border-2 border-white hover:ring-0 active:ring-0",
            i > 0 && "-ml-2"
          )}
        >
          <AvatarImage src={src} alt="Collaborator" />
          <AvatarFallback />
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-xs font-medium text-gray-500">
          +{overflow}
        </div>
      )}
    </div>
  )
}

const favoriteKey = (type: FavoriteEntityType, itemId: string) =>
  `${type}:${itemId}`

function FavoriteButton({
  itemId,
  type,
  favoritedItems,
  onToggle,
}: {
  itemId?: string | null
  type: FavoriteEntityType
  favoritedItems: Set<string>
  onToggle: (
    itemId: string,
    type: FavoriteEntityType,
    pressed: boolean
  ) => void
}) {
  const id = itemId ? String(itemId) : undefined
  const key = id ? favoriteKey(type, id) : undefined
  return (
    <FavoriteRoot
      value={key ? favoritedItems.has(key) : false}
      onValueChange={
        id ? (pressed: boolean) => onToggle(id, type, pressed) : undefined
      }
    >
      {({ pressed }) => (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Favorite />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {pressed ? (
                <span className="inline-flex items-center gap-x-1">
                  <Check className="size-[15px] shrink-0 text-green-500" />
                  Saved
                </span>
              ) : (
                "Save to favorites"
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </FavoriteRoot>
  )
}

// ========================
// Sort / Controls
// ========================

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc"

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  newest: "Newest First",
  oldest: "Oldest First",
}

function sortHistoryItems(
  items: HistoryItem[],
  sortBy: SortOption
): HistoryItem[] {
  const sorted = [...items]
  switch (sortBy) {
    case "name-asc":
      return sorted.sort((a, b) =>
        getHistoryItemLabel(a).localeCompare(getHistoryItemLabel(b))
      )
    case "name-desc":
      return sorted.sort((a, b) =>
        getHistoryItemLabel(b).localeCompare(getHistoryItemLabel(a))
      )
    case "oldest":
      return sorted.reverse()
    case "newest":
    default:
      return sorted
  }
}

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

const SortDropdown = ({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (v: SortOption) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" visual="gray" size="md" className="group shrink-0 size-[40px] rounded-[5px] p-0 data-[state=open]:bg-transparent">
        <SortAs className="size-4 lg:size-6 text-gray-500 group-hover:text-gray-700" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <ScrollArea
        viewportClassName="max-h-[250px]"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
          ([key, label]) => (
            <DropdownMenuCheckItem
              key={key}
              checked={value === key}
              onSelect={() => onChange(key)}
            >
              {label}
            </DropdownMenuCheckItem>
          )
        )}
      </ScrollArea>
    </DropdownMenuContent>
  </DropdownMenu>
)

// ========================
// Page
// ========================

export default function BrowsingHistoryPage() {
  useAuth()
  const [value, setValue] = useState([GRID_LAYOUT])
  const isGrid = getFirstItem(value) === GRID_LAYOUT
  const [activeTab, setActiveTab] = useState<TabValue>("Show All")
  const { talents, isLoading } = useTalentUsers()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set())
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isSearchOpen])

  React.useEffect(() => {
    getAllFavorites()
      .then((favorites) => {
        const keys = new Set<string>()
        for (const fav of favorites) {
          keys.add(fav.itemId)
          keys.add(favoriteKey(fav.type as FavoriteEntityType, fav.itemId))
        }
        setFavoritedItems(keys)
      })
      .catch(() => {})
  }, [])

  const handleFavoriteToggle = async (
    itemId: string,
    type: FavoriteEntityType,
    newPressed: boolean
  ) => {
    const key = favoriteKey(type, itemId)

    // Optimistic update — toggle immediately, persist in background.
    // Never revert: visual toggle must work even without login.
    if (newPressed) {
      setFavoritedItems((prev) => {
        const next = new Set(prev)
        next.add(itemId)
        next.add(key)
        return next
      })
      try { await addFavorite({ type, itemId }) } catch {}
    } else {
      setFavoritedItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        next.delete(key)
        return next
      })
      try {
        const fav = await findFavoriteByTypeAndItemId(type as FavoriteType, itemId)
        if (fav) await removeFavorite(fav.id)
      } catch {}
    }
  }

  // Build items using the same talentToCardProps the marketplace uses
  const talentItems: HistoryItem[] = talents.map((u, idx) => ({
    type: "talent",
    data: talentToCardProps(u, idx),
    raw: u,
  }))
  const projectItems: HistoryItem[] = STATIC_PROJECTS.map((data) => ({
    type: "project",
    data,
  }))
  const serviceItems: HistoryItem[] = STATIC_SERVICES.map((data) => ({
    type: "service",
    data,
  }))
  const teamItems: HistoryItem[] = STATIC_TEAMS.map((data) => ({
    type: "team",
    data,
  }))
  const jobItems: HistoryItem[] = STATIC_JOBS.map((data) => ({
    type: "job",
    data,
  }))

  const itemsByTab: Record<TabValue, HistoryItem[]> = {
    "Show All": sortHistoryItems(
      interleave([talentItems, teamItems, jobItems, projectItems, serviceItems]),
      sortBy
    ),
    "Recent Projects": sortHistoryItems(projectItems, sortBy),
    "Recent Services": sortHistoryItems(serviceItems, sortBy),
    "Recent Talent": sortHistoryItems(talentItems, sortBy),
    "Recent Teams": sortHistoryItems(teamItems, sortBy),
    "Recent Jobs": sortHistoryItems(jobItems, sortBy),
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesSearch = (item: HistoryItem) => {
    if (!normalizedQuery) return true
    return getHistoryItemLabel(item).toLowerCase().includes(normalizedQuery)
  }

  const showTalentLoading =
    isLoading && (activeTab === "Recent Talent" || activeTab === "Show All")

  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 lg:gap-x-6">
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <ToggleGroupRoot
            value={value}
            onValueChange={(details) => {
              if (details.value.length > 0) setValue(details.value)
            }}
          >
            <ToggleGroupItem value={GRID_LAYOUT}>
              <Grid className="size-4 lg:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value={LIST_LAYOUT}>
              <List className="size-4 lg:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>
      </div>

      <h1 className="flex items-center text-lg leading-[21.78px] lg:text-[28px] lg:leading-[34px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        Your Browsing History
      </h1>

      <Tabs
        className="mt-7 lg:mt-[19px]"
        value={activeTab}
        onValueChange={(next) => setActiveTab(next as TabValue)}
      >
        <div className="border-b flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex">
            {/* Search bar — slides open from icon-only to full input */}
            <div
              className={cn(
                "flex items-center h-[40px] overflow-clip border-b-2 transition-all ease-in-out",
                isSearchOpen
                  ? "w-[385px] border-primary-500 pr-[12px] duration-150"
                  : "w-[40px] border-transparent duration-300"
              )}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsSearchOpen(false)
                  setSearchQuery("")
                }
              }}
            >
              <Button
                variant="ghost"
                visual="gray"
                className={cn(
                  "shrink-0 size-[40px] rounded-full p-0 transition-colors duration-150",
                  isSearchOpen
                    ? "text-primary-500 pointer-events-none"
                    : "text-gray-500 hover:text-primary-500"
                )}
                onClick={() => setIsSearchOpen(true)}
              >
                <SearchMd className="size-[18px]" />
              </Button>
              <Input
                ref={searchInputRef}
                type="text"
                className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-normal text-[#101828] shadow-none placeholder:text-[#667085] placeholder:opacity-50 focus:outline-none focus:ring-0 focus-visible:ring-0"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                tabIndex={isSearchOpen ? 0 : -1}
              />
              <Button
                variant="ghost"
                visual="gray"
                size="sm"
                className={cn(
                  "shrink-0 p-0 hover:bg-transparent transition-opacity duration-200",
                  isSearchOpen && searchQuery
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                )}
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery("")
                }}
                aria-label="Close search"
              >
                <XCircle className="size-4 text-gray-500/50 hover:text-gray-500" />
              </Button>
            </div>

            {/* Tabs — fade out and collapse when search opens */}
            <div
              className={cn(
                "overflow-hidden transition-all ease-in-out",
                isSearchOpen
                  ? "max-w-0 opacity-0 pointer-events-none duration-150"
                  : "max-w-[800px] opacity-100 duration-300"
              )}
            >
              <TabsList className="flex justify-start border-b-0 px-0 whitespace-nowrap">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    className="pb-[11px] xs:max-lg:text-xs xs:max-lg:leading-5"
                    value={tab}
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="hidden items-center gap-x-6 pb-5 md:flex">
            <SortDropdown value={sortBy} onChange={setSortBy} />
            <ToggleGroupRoot
              className="gap-x-0 rounded-[5px] border-gray-200 bg-transparent p-0"
              value={value}
              onValueChange={(details) => {
                if (details.value.length > 0) setValue(details.value)
              }}
            >
              <ToggleGroupItem
                value={GRID_LAYOUT}
                className="rounded-none bg-[#F2F4F7] text-gray-800 shadow-none data-[state=on]:bg-white data-[state=on]:shadow-none"
              >
                <Grid className="size-4 lg:size-6" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value={LIST_LAYOUT}
                className="rounded-none border-l border-gray-200 bg-[#F2F4F7] text-gray-800 shadow-none data-[state=on]:bg-white data-[state=on]:shadow-none"
              >
                <List className="size-4 lg:size-6" />
              </ToggleGroupItem>
            </ToggleGroupRoot>
          </div>
        </div>

        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {showTalentLoading ? (
              <div className="columns-2 lg:columns-3 gap-x-3 lg:gap-x-6 pt-3.5 lg:pt-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="mb-3 break-inside-avoid rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden lg:mb-5"
                  >
                    <div className="relative h-[140px] bg-gray-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="relative h-4 w-32 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                      </div>
                      <div className="relative h-3 w-24 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (() => {
                const visibleItems = itemsByTab[tab]
                  .filter((item) => item.type !== "talent" || !isLoading)
                  .filter(matchesSearch)

                if (visibleItems.length === 0 && normalizedQuery) {
                  return (
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold text-dark-blue-400">
                        0 Results for &quot;{searchQuery}&quot;
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        We couldn&apos;t find any results for your search. Try
                        adjusting your keywords or clearing your search.
                      </p>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setSearchQuery("")
                          setIsSearchOpen(false)
                        }}
                      >
                        Clear Search
                      </Button>
                    </div>
                  )
                }

                if (visibleItems.length === 0) {
                  return (
                    <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
                      <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <User01 className="size-6 text-gray-400" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-dark-blue-400">
                        Your browsing history is empty
                      </h3>
                      <p className="mt-1 max-w-md text-sm text-gray-500">
                        Items you view across the marketplace will show up here
                        for easy access later.
                      </p>
                      <div className="mt-5">
                        <NextLink href="/talent">
                          <Button variant="outlined" visual="gray">
                            <SearchMd className="size-[15px]" />
                            Browse Talent
                          </Button>
                        </NextLink>
                      </div>
                    </div>
                  )
                }

                return isGrid ? (
                  <div className="columns-2 lg:columns-3 gap-x-3 lg:gap-x-6 pt-3.5 lg:pt-6">
                    {visibleItems.map((item, index) => (
                        <div
                          key={`${item.type}-${item.data.id}`}
                          className={`mb-3 break-inside-avoid lg:mb-5 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(index)}`}
                        >
                          {renderGridItem(item, handleFavoriteToggle, favoritedItems)}
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 lg:gap-6 pt-3.5 lg:pt-6">
                    {visibleItems.map((item, index) => (
                      <div
                        key={`${item.type}-${item.type === "talent" ? item.data.id : item.data.id}`}
                        className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(index)}`}
                      >
                        {renderListItem(item, handleFavoriteToggle, favoritedItems)}
                      </div>
                    ))}
                  </div>
                )
              })()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ========================
// Grid view — ALL types use ListingCard (same as marketplace)
// ========================

function renderGridItem(
  item: HistoryItem,
  onToggle: (id: string, type: FavoriteEntityType, pressed: boolean) => void,
  favoritedItems: Set<string>
) {
  switch (item.type) {
    case "project":
    case "service": {
      const listing = item.data
      return (
        <ListingCard
          kind={item.type}
          id={listing.id}
          title={listing.title}
          description={listing.description}
          mediaUrl={listing.mediaUrl}
          budget={listing.budget}
          duration={listing.duration}
          rating={listing.rating}
          reviewCount={listing.reviewCount}
          collaborators={listing.collaborators}
          href="#"
          favoriteSlot={
            <FavoriteButton
              itemId={listing.id}
              type={item.type}
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
    case "talent": {
      const props = item.data
      return (
        <ListingCard
          kind="talent"
          {...props}
          favoriteSlot={
            <FavoriteButton
              itemId={props.id}
              type="talent"
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
    case "job": {
      const job = item.data
      return (
        <ListingCard
          kind="project"
          id={job.id}
          title={job.title}
          budget=""
          cardVariant="job-grid"
          collaborators={[]}
          href="#"
          favoriteSlot={
            <FavoriteButton
              itemId={job.id}
              type="job"
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
    case "team": {
      const team = item.data
      return (
        <ListingCard
          kind="team"
          id={team.id}
          name={team.name}
          handle={team.handle}
          tagline={team.tagline}
          experience={team.experience}
          rate={team.rate}
          locations={team.locations}
          rating={team.rating}
          projectCount={team.projectCount}
          skills={team.skills}
          memberAvatars={team.memberAvatars}
          previousClientLogos={team.previousClientLogos}
          href="#"
          favoriteSlot={
            <FavoriteButton
              itemId={team.id}
              type="team"
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
  }
}

// ========================
// List view — projects/services use ListingCard layout="list",
// teams use TeamCardLandscape, talent uses TalentSearchCardLandscape
// ========================

function renderListItem(
  item: HistoryItem,
  onToggle: (id: string, type: FavoriteEntityType, pressed: boolean) => void,
  favoritedItems: Set<string>
) {
  switch (item.type) {
    case "project":
    case "service": {
      const listing = item.data
      return (
        <ListingCard
          kind={item.type}
          id={listing.id}
          title={listing.title}
          description={listing.description}
          mediaUrl={listing.mediaUrl}
          budget={listing.budget}
          duration={listing.duration}
          rating={listing.rating}
          reviewCount={listing.reviewCount}
          collaborators={listing.collaborators}
          layout="list"
          href="#"
          avatarsSlot={
            listing.collaborators?.length ? (
              <HistoryCollaboratorAvatars avatars={listing.collaborators} />
            ) : undefined
          }
          favoriteSlot={
            <FavoriteButton
              itemId={listing.id}
              type={item.type}
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
    case "job": {
      const job = item.data
      return (
        <ListingCard
          kind="project"
          id={job.id}
          title={job.title}
          budget=""
          cardVariant="job"
          collaborators={[]}
          layout="list"
          href="#"
          favoriteSlot={
            <FavoriteButton
              itemId={job.id}
              type="job"
              favoritedItems={favoritedItems}
              onToggle={onToggle}
            />
          }
        />
      )
    }
    case "talent": {
      return <TalentSearchCardLandscape />
    }
    case "team": {
      const team = item.data
      return (
        <TeamCardLandscape
          id={team.id}
          name={team.name}
          handle={team.handle}
          tagline={team.tagline}
          experience={team.experience}
          rate={team.rate}
          locations={team.locations}
          rating={team.rating}
          projectCount={team.projectCount}
          skills={team.skills}
          memberAvatars={team.memberAvatars}
          previousClientLogos={team.previousClientLogos}
          onSaveClick={() => onToggle(team.id, "team", true)}
        />
      )
    }
  }
}
