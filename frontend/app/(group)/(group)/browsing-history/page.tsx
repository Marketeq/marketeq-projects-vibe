"use client"

import * as React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import {
  addFavorite,
  findFavoriteByTypeAndItemId,
  getAllFavorites,
  removeFavorite,
  type FavoriteType,
} from "@/src/lib/api/favorites"
import { cn, getFirstItem } from "@/utils/functions"
import { Check, SearchMd, User01, X } from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { ListingCard } from "@/components/listing-card"
import { TalentSearchCard } from "@/components/talent-search-card"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
import { BrowsingHistoryTeamCardLandscape } from "./team-card-landscape"
import NextLink from "@/components/next-link"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
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
// Talent data (unchanged from prior implementation)
// ========================

interface TalentMember {
  id: string
  username: string
  name: string
  handle: string
  role: string
  avatarSrc: string
  rating: number
  experience: string
  country: string
  localTime: string
  rate: string
  skills: string[]
}

// Common female first names for gender inference
const FEMALE_NAMES = new Set([
  "mary",
  "patricia",
  "jennifer",
  "linda",
  "barbara",
  "elizabeth",
  "susan",
  "jessica",
  "sarah",
  "karen",
  "lisa",
  "nancy",
  "betty",
  "margaret",
  "sandra",
  "ashley",
  "dorothy",
  "kimberly",
  "emily",
  "donna",
  "michelle",
  "carol",
  "amanda",
  "melissa",
  "deborah",
  "stephanie",
  "rebecca",
  "sharon",
  "laura",
  "cynthia",
  "kathleen",
  "amy",
  "angela",
  "shirley",
  "anna",
  "brenda",
  "pamela",
  "emma",
  "nicole",
  "helen",
  "samantha",
  "katherine",
  "christine",
  "debra",
  "rachel",
  "carolyn",
  "janet",
  "catherine",
  "maria",
  "heather",
  "diane",
  "ruth",
  "julie",
  "olivia",
  "joyce",
  "virginia",
  "victoria",
  "kelly",
  "lauren",
  "christina",
  "joan",
  "evelyn",
  "judith",
  "megan",
  "andrea",
  "cheryl",
  "hannah",
  "jacqueline",
  "martha",
  "gloria",
  "teresa",
  "ann",
  "sara",
  "madison",
  "frances",
  "kathryn",
  "janice",
  "jean",
  "abigail",
  "alice",
  "judy",
  "sophia",
  "grace",
  "denise",
  "amber",
  "doris",
  "marilyn",
  "danielle",
  "beverly",
  "isabella",
  "theresa",
  "diana",
  "natalie",
  "brittany",
  "charlotte",
  "marie",
  "kayla",
  "alexis",
  "lori",
  "alicia",
  "jenny",
  "nadia",
  "priya",
  "aisha",
  "fatima",
  "mei",
  "yuki",
  "sofia",
  "elena",
  "rosa",
  "carmen",
  "lucia",
  "nina",
  "tanya",
  "svetlana",
  "ingrid",
  "bianca",
  "valentina",
  "ngozi",
  "amara",
  "zara",
])

function inferGender(firstName: string): "women" | "men" {
  return FEMALE_NAMES.has(firstName.toLowerCase()) ? "women" : "men"
}

const SYSTEM_GENERATED_USERNAME_REGEX = /^user_[a-f0-9]{8,}$/i

const toTitleWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")

function getReadableNameFromUser(u: any): string {
  // Prefer explicit onboarding/profile names first.
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
  if (fullName) return fullName

  const explicitName =
    u.displayName ?? u.fullName ?? u.name ?? u.profileName ?? ""
  if (typeof explicitName === "string" && explicitName.trim()) {
    return explicitName.trim()
  }

  const username = typeof u.username === "string" ? u.username.trim() : ""
  if (username && !SYSTEM_GENERATED_USERNAME_REGEX.test(username)) {
    return username
  }

  const email = typeof u.email === "string" ? u.email : ""
  const localPart = email.split("@")[0] ?? ""
  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (normalized) {
    return toTitleWords(normalized)
  }

  return "Team Member"
}

function mapUserToTalent(u: any, index: number): TalentMember {
  const firstName = u.firstName ?? ""
  const lastName = u.lastName ?? ""
  const name = getReadableNameFromUser(u)
  const rateMin = u.rateMin ? `$${Math.round(Number(u.rateMin))}` : "$50"
  const rateMax = u.rateMax ? `$${Math.round(Number(u.rateMax))}` : "$100"

  // Calculate years of experience from work history
  let yearsExp = 3
  if (u.experience?.length) {
    const earliest = u.experience.reduce((min: string, e: any) => {
      const d = e.startDate ?? e.start_date
      return d && d < min ? d : min
    }, new Date().toISOString())
    yearsExp = Math.max(
      1,
      Math.round(
        (Date.now() - new Date(earliest).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    )
  }

  const skills = (u.skills ?? []).map((s: any) => s.name).filter(Boolean)

  // Assign gender-appropriate profile photo if none provided
  const gender = inferGender(firstName || u.username || "")
  const photoIndex = ((index * 7 + 13) % 90) + 1 // deterministic spread across 1-90
  const fallbackAvatar = `https://randomuser.me/api/portraits/${gender}/${photoIndex}.jpg`

  return {
    id: u.id,
    username: u.username ?? "",
    name,
    // Hide auto-generated usernames like user_abc12345 from UI handles.
    handle:
      u.username && !SYSTEM_GENERATED_USERNAME_REGEX.test(u.username)
        ? `@${u.username}`
        : "",
    role: u.role ?? u.industry ?? "Freelancer",
    avatarSrc: u.avatarUrl || fallbackAvatar,
    rating: 4.0 + Math.round(Math.random() * 10) / 10,
    experience: `${yearsExp} years of experience`,
    country: u.location ?? "United States",
    localTime:
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + " local time",
    rate: `${rateMin} - ${rateMax}`,
    skills,
  }
}

// ========================
// Placeholder data for item types this page has no live data source for yet
// (Projects, Services, Jobs, Teams). Layout-only — feeds the existing,
// unmodified ListingCard component so the Figma layout can be reviewed
// before a real browsing-history endpoint exists. No API/backend involved.
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

interface JobPlaceholder {
  id: string
  title: string
  earningsValue?: string
  ndaRequired?: boolean
}

const STATIC_JOBS: JobPlaceholder[] = [
  {
    id: "history-job-1",
    title: "Camera Motion Sensing Project",
    earningsValue: "$90,200/mo",
    ndaRequired: true,
  },
  { id: "history-job-2", title: "Encrypted SMS Gateway Integration" },
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

type HistoryItem =
  | { type: "talent"; data: TalentMember }
  | { type: "project"; data: ProjectPlaceholder }
  | { type: "service"; data: ProjectPlaceholder }
  | { type: "job"; data: JobPlaceholder }
  | { type: "team"; data: TeamPlaceholder }

// Round-robins the per-type lists together so "Show All" mixes item types
// the way the Figma feed does, instead of grouping everything by type.
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

const favoriteKey = (type: FavoriteType, itemId: string) => `${type}:${itemId}`

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

// Same FavoriteRoot/Tooltip/Favorite markup as the master favorite control
// (see TalentSearchCard's built-in default and the shared FavoriteButton in
// the category/search page) — kept in sync here so every card on this page
// looks and behaves identically to its counterpart elsewhere in the app.
function HistoryFavoriteButton({
  itemId,
  type,
  favoritedItems,
  onToggle,
}: {
  itemId: string
  type: FavoriteType
  favoritedItems: Set<string>
  onToggle: (itemId: string, type: FavoriteType, pressed: boolean) => void
}) {
  const pressed = favoritedItems.has(favoriteKey(type, itemId))
  return (
    <FavoriteRoot
      value={pressed}
      onValueChange={(next) => onToggle(itemId, type, next)}
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

function renderHistoryItem(
  item: HistoryItem,
  isGrid: boolean,
  talentFavorites: {
    favoritedItems: Set<string>
    onFavoriteChange: (id: string, favorited: boolean) => void
  },
  favorites: {
    favoritedItems: Set<string>
    onToggle: (itemId: string, type: FavoriteType, pressed: boolean) => void
  }
) {
  switch (item.type) {
    case "talent": {
      const member = item.data
      const profileHref = `/talent-profile?username=${member.username}`
      if (!isGrid) {
        // TalentSearchCardLandscape (dev-main, unmodified) takes no data
        // props — it always renders its own fixed demo person. Accepted
        // limitation: real talent data cannot be shown in this layout.
        return <TalentSearchCardLandscape key={`talent-${member.id}`} />
      }
      return (
        <TalentSearchCard
          key={`talent-${member.id}`}
          id={member.id}
          name={member.name}
          handle={member.handle}
          role={member.role}
          photo={member.avatarSrc}
          rate={member.rate}
          experience={member.experience}
          country={member.country}
          localTime={member.localTime}
          rating={member.rating}
          skills={member.skills}
          profileHref={profileHref}
          isFavorited={talentFavorites.favoritedItems.has(String(member.id))}
          onFavoriteChange={(favorited) =>
            talentFavorites.onFavoriteChange(String(member.id), favorited)
          }
        />
      )
    }
    case "project":
    case "service": {
      const listing = item.data
      return (
        <ListingCard
          key={`${item.type}-${listing.id}`}
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
          layout={isGrid ? "grid" : "list"}
          avatarsSlot={
            !isGrid && listing.collaborators?.length ? (
              <HistoryCollaboratorAvatars avatars={listing.collaborators} />
            ) : undefined
          }
          favoriteSlot={
            <HistoryFavoriteButton
              itemId={listing.id}
              type={item.type}
              favoritedItems={favorites.favoritedItems}
              onToggle={favorites.onToggle}
            />
          }
        />
      )
    }
    case "job": {
      const job = item.data
      // The shared ListingCard's "job-grid" star is purely decorative — it
      // never reads favoriteSlot, so clicking it does nothing. Rather than
      // touch the shared component or rebuild the card, the real favorite
      // toggle is overlaid directly on top of it (same bottom-right spot,
      // since that row always sits flush in the card's own padding via
      // mt-auto). List view is untouched — not part of this fix.
      return (
        <div className={isGrid ? "relative" : undefined}>
          <ListingCard
            key={`job-${job.id}`}
            kind="project"
            id={job.id}
            title={job.title}
            budget=""
            cardVariant={isGrid ? "job-grid" : "job"}
          />
          {isGrid && (
            <span className="absolute bottom-6 right-6">
              <HistoryFavoriteButton
                itemId={job.id}
                type="job"
                favoritedItems={favorites.favoritedItems}
                onToggle={favorites.onToggle}
              />
            </span>
          )}
        </div>
      )
    }
    case "team": {
      const team = item.data
      // TeamCardProps has no list/landscape layout in dev-main's shared
      // ListingCard — grid view uses the real shared component unmodified;
      // list view uses a Browsing History-local recreation of the approved
      // Figma row (see team-card-landscape.tsx), since the shared component
      // cannot produce it without being modified.
      if (!isGrid) {
        return (
          <BrowsingHistoryTeamCardLandscape
            key={`team-${team.id}`}
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
            isSaved={favorites.favoritedItems.has(favoriteKey("team", team.id))}
            onSaveClick={() =>
              favorites.onToggle(
                team.id,
                "team",
                !favorites.favoritedItems.has(favoriteKey("team", team.id))
              )
            }
          />
        )
      }
      return (
        <ListingCard
          key={`team-${team.id}`}
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
          favoriteSlot={
            <HistoryFavoriteButton
              itemId={team.id}
              type="team"
              favoritedItems={favorites.favoritedItems}
              onToggle={favorites.onToggle}
            />
          }
        />
      )
    }
  }
}

// ========================
// Shared Controls
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

const SortDropdown = ({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (v: SortOption) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="focus-visible:outline-none shrink-0">
        <SortAs className="size-4 lg:size-6 text-gray-500" />
      </button>
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

function EmptyState({
  icon: Icon = User01,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="size-6 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-dark-blue-400">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ========================
// Page
// ========================

export default function BrowsingHistoryPage() {
  useAuth()
  const [value, setValue] = useState([GRID_LAYOUT])
  const isGrid = getFirstItem(value) === GRID_LAYOUT
  const [activeTab, setActiveTab] = useState<TabValue>("Show All")
  const [talentMembers, setTalentMembers] = useState<TalentMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  React.useEffect(() => {
    setIsLoading(true)
    UserAPI.listUsers(20)
      .then((res) => {
        const users = Array.isArray(res?.data) ? res.data : []
        setTalentMembers(users.map((u, i) => mapUserToTalent(u, i)))
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))

    async function loadFavorites() {
      const favorites = await getAllFavorites()
      const keys = new Set<string>()
      for (const fav of favorites) {
        // Seed both the plain itemId (TalentSearchCard's own internal check)
        // and the composite type:itemId key (used by HistoryFavoriteButton
        // and the job/team "Save" buttons below), so both lookup styles work.
        keys.add(fav.itemId)
        keys.add(favoriteKey(fav.type, fav.itemId))
      }
      setFavoritedItems(keys)
    }
    loadFavorites()
  }, [])

  const handleTalentFavoriteChange = (id: string, favorited: boolean) => {
    setFavoritedItems((prev) => {
      const next = new Set(prev)
      if (favorited) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Real, persisting favorite toggle for Project/Service/Job/Team cards
  // (Talent already persists itself inside TalentSearchCard — see
  // handleTalentFavoriteChange above, which only syncs local UI state).
  const handleFavoriteToggle = async (
    itemId: string,
    type: FavoriteType,
    pressed: boolean
  ) => {
    const key = favoriteKey(type, itemId)
    setFavoritedItems((prev) => {
      const next = new Set(prev)
      if (pressed) next.add(key)
      else next.delete(key)
      return next
    })

    if (pressed) {
      const favorite = await addFavorite({ type, itemId })
      if (!favorite) {
        setFavoritedItems((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    } else {
      const fav = await findFavoriteByTypeAndItemId(type, itemId)
      const removed = fav ? await removeFavorite(fav.id) : true
      if (!removed) {
        setFavoritedItems((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
      }
    }
  }

  const talentItems: HistoryItem[] = talentMembers.map((data) => ({
    type: "talent",
    data,
  }))
  const projectItems: HistoryItem[] = STATIC_PROJECTS.map((data) => ({
    type: "project",
    data,
  }))
  const serviceItems: HistoryItem[] = STATIC_SERVICES.map((data) => ({
    type: "service",
    data,
  }))
  const jobItems: HistoryItem[] = STATIC_JOBS.map((data) => ({
    type: "job",
    data,
  }))
  const teamItems: HistoryItem[] = STATIC_TEAMS.map((data) => ({
    type: "team",
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

  const talentFavoriteProps = {
    favoritedItems,
    onFavoriteChange: handleTalentFavoriteChange,
  }

  const favoritesProps = {
    favoritedItems,
    onToggle: handleFavoriteToggle,
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesSearch = (item: HistoryItem) => {
    if (!normalizedQuery) return true
    const label = getHistoryItemLabel(item)
    return label.toLowerCase().includes(normalizedQuery)
  }

  const showTalentLoading =
    isLoading && (activeTab === "Recent Talent" || activeTab === "Show All")
  const showTalentEmptyState =
    activeTab === "Recent Talent" && !isLoading && talentMembers.length === 0

  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 lg:gap-x-6">
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <ToggleGroupRoot
            value={value}
            onValueChange={(details) => setValue(details.value)}
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
          <div
            className={cn(
              "items-end inline-flex gap-x-3",
              isSearchOpen && "min-w-0 flex-1"
            )}
          >
            {isSearchOpen ? (
              <div className="flex w-full items-center gap-3 border-b-2 border-primary-500 py-2.5 pr-3">
                <SearchMd className="size-[18px] shrink-0 text-primary-500" />
                <input
                  autoFocus
                  type="text"
                  className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal text-gray-500 placeholder:text-gray-500 placeholder:opacity-50 focus:outline-none focus:ring-0"
                  placeholder="Type to search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 text-gray-500 opacity-50 hover:opacity-100"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchQuery("")
                  }}
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button
                className="text-gray-500"
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => setIsSearchOpen(true)}
              >
                <SearchMd className="size-[18px]" />
              </Button>
            )}
            {!isSearchOpen && (
              <TabsList className="flex justify-start border-b-0 px-0">
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
            )}
          </div>

          <div className="hidden items-center gap-x-6 pb-5 md:flex">
            <SortDropdown value={sortBy} onChange={setSortBy} />
            <ToggleGroupRoot
              className="gap-x-0 rounded-[5px] border-gray-200 bg-transparent p-0"
              value={value}
              onValueChange={(details) => setValue(details.value)}
            >
              <ToggleGroupItem
                value={GRID_LAYOUT}
                className="rounded-none bg-white text-gray-800 shadow-none data-[state=on]:bg-[#F2F4F7] data-[state=on]:shadow-none"
              >
                <Grid className="size-4 lg:size-6" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value={LIST_LAYOUT}
                className="rounded-none border-l border-gray-200 bg-white text-gray-800 shadow-none data-[state=on]:bg-[#F2F4F7] data-[state=on]:shadow-none"
              >
                <List className="size-4 lg:size-6" />
              </ToggleGroupItem>
            </ToggleGroupRoot>
          </div>
        </div>

        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {tab === "Recent Talent" && showTalentLoading ? (
              <div className="columns-2 lg:columns-3 gap-x-3 lg:gap-x-6 pt-3.5 lg:pt-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="mb-3 break-inside-avoid rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden lg:mb-5"
                  >
                    <div className="relative h-[140px] bg-gray-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="relative h-4 w-32 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-3 w-24 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : showTalentEmptyState ? (
              <EmptyState
                icon={User01}
                title="Your browsing history is empty"
                description="Items you view across the marketplace will show up here for easy access later."
                action={
                  <NextLink href="/talent">
                    <Button variant="outlined" visual="gray">
                      <SearchMd className="size-[15px]" />
                      Browse Talent
                    </Button>
                  </NextLink>
                }
              />
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

              return isGrid ? (
                <div className="columns-2 lg:columns-3 gap-x-3 lg:gap-x-6 pt-3.5 lg:pt-6">
                  {visibleItems.map((item) => (
                    <div
                      key={`${item.type}-${item.data.id}`}
                      className="mb-3 break-inside-avoid lg:mb-5"
                    >
                      {renderHistoryItem(
                        item,
                        true,
                        talentFavoriteProps,
                        favoritesProps
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 lg:gap-6 pt-3.5 lg:pt-6">
                  {visibleItems.map((item) =>
                    renderHistoryItem(
                      item,
                      false,
                      talentFavoriteProps,
                      favoritesProps
                    )
                  )}
                </div>
              )
            })()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
