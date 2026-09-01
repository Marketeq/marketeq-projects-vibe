"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { UserAPI } from "@/service/http/user"
import {
  type Favorite,
  getFavoritesByGroup,
  removeFavorite,
} from "@/src/lib/api/favorites"
import {
  type TalentCardData,
  getUsernamesForGroup,
  userProfileToCardData,
} from "@/src/lib/data/sample-talents"
import { buildProjectUrl, buildServiceUrl } from "@/src/lib/urlHelpers"
import { getFirstItem } from "@/utils/functions"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MoreHorizontal,
  SearchMd,
  Star,
  Trash2,
} from "@blend-metrics/icons"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import {
  favoriteGroupIdFromParam,
  favoriteGroupNameFromParam,
} from "@/src/lib/listing-urls"
import { ListingCard } from "@/components/listing-card"
import { NewGroupModal } from "@/app/(group)/favorites/page"
import NextLink from "@/components/next-link"
import { cn } from "@/utils/functions"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import { TalentSearchCard } from "@/components/talent-search-card"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

/** Tabs from the My Favorites header (Figma 13111-46360). */
const FAVORITE_TABS = ["Projects", "Services", "Talent", "Teams", "Jobs"]

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/* ─── Full item data from API ─── */

interface ItemData {
  id: string | number
  title?: string
  slug?: string
  mediaUrls?: string[]
  coverImage?: string
  thumbnail?: string
  description?: string
  summary?: string
  rating?: number
  reviewCount?: number
  duration?: string
  budget?: string | number
  scopeTotal?: { budget?: string | number }
  deliveryTime?: string
  priceMin?: string | number
  priceMax?: string | number
  categories?: string[]
  category?: string
  listingType?: string
}

const ItemDropdown = ({
  className,
  onRemove,
  onMove,
}: {
  className?: string
  onRemove?: () => void
  onMove?: () => void
}) => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          className={`h-auto py-[2px] px-1.5 text-gray-500 ${className ?? ""}`}
          visual="gray"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[165px]"
        onClick={(e) => e.stopPropagation()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem onSelect={onMove}>
          <ArrowRight className="h-4 w-4" /> Move
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem visual="destructive" onSelect={onRemove}>
          <Trash2 className="h-4 w-4" /> Remove Item
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type DetailSortOption = "recent" | "name-asc" | "name-desc" | "rating"

const DETAIL_SORT_LABELS: Record<DetailSortOption, string> = {
  recent: "Recently Added",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  rating: "Rating",
}

const SortDropdown = ({
  value,
  onChange,
}: {
  value: DetailSortOption
  onChange: (v: DetailSortOption) => void
}) => {
  return (
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
          {(
            Object.entries(DETAIL_SORT_LABELS) as [DetailSortOption, string][]
          ).map(([key, label]) => (
            <DropdownMenuCheckItem
              key={key}
              checked={value === key}
              onSelect={() => onChange(key)}
            >
              {label}
            </DropdownMenuCheckItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─── Main Page ─── */

export default function FavoriteGroupDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const groupParam = params.groupId as string
  const groupId = favoriteGroupIdFromParam(groupParam)
  const groupName =
    searchParams.get("name") ||
    favoriteGroupNameFromParam(groupParam) ||
    "Favorites"
  const groupType = searchParams.get("type") || "talent"

  const [value, setValue] = useState([GRID_LAYOUT])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [talents, setTalents] = useState<TalentCardData[]>([])
  const [itemData, setItemData] = useState<Record<string, ItemData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState<DetailSortOption>("recent")

  const isTalent = groupType === "talent"
  const itemNoun = isTalent
    ? "talent"
    : groupType === "service"
      ? "services"
      : "projects"
  const activeTabLabel = isTalent
    ? "Talent"
    : groupType === "service"
      ? "Services"
      : "Projects"
  const apiBase = getPublicApiUrl() || "http://localhost:4000"

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        if (isTalent) {
          const usernames = getUsernamesForGroup(groupId)
          const fallbackUsernames =
            usernames.length > 0
              ? usernames
              : getUsernamesForGroup("grp-visual-designers")
          const profiles = await Promise.all(
            fallbackUsernames.map(async (username) => {
              try {
                const res = await UserAPI.getByUsername(username)
                return res?.data ? userProfileToCardData(res.data) : null
              } catch {
                return null
              }
            })
          )
          setTalents(profiles.filter((p): p is TalentCardData => p !== null))
        } else {
          const data = await getFavoritesByGroup(groupId)
          setFavorites(data)

          // Fetch full item data for project/service items
          if (data.length > 0) {
            const [projRes, svcRes] = await Promise.all([
              fetch(`${apiBase}/v1/projects`).catch(() => null),
              fetch(`${apiBase}/v1/services`).catch(() => null),
            ])
            const items: Record<string, ItemData> = {}
            if (projRes?.ok) {
              const list: any[] = await projRes.json()
              for (const item of list) {
                items[String(item.id)] = item
              }
            }
            if (svcRes?.ok) {
              const list: any[] = await svcRes.json()
              for (const item of list) {
                items[String(item.id)] = item
              }
            }
            setItemData(items)
          }
        }
      } catch (err) {
        console.error("Failed to load group detail:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [groupId, groupType, isTalent, apiBase])

  const handleRemoveTalent = (talentId: string) => {
    setTalents((prev) => prev.filter((t) => t.id !== talentId))
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    const success = await removeFavorite(favoriteId)
    if (success) {
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
    }
  }

  const filteredTalents = searchQuery
    ? talents.filter((t) =>
        `${t.firstName} ${t.lastName} ${t.username} ${t.role}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : talents

  const filteredProjects = searchQuery
    ? favorites.filter((f) => {
        const item = itemData[f.itemId]
        const searchable =
          `${item?.title || ""} ${item?.description || ""} ${f.itemId}`.toLowerCase()
        return searchable.includes(searchQuery.toLowerCase())
      })
    : favorites

  // Sort talents
  const sortedTalents = [...filteredTalents].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      case "name-desc":
        return `${b.firstName} ${b.lastName}`.localeCompare(
          `${a.firstName} ${a.lastName}`
        )
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0)
      case "recent":
      default:
        return 0 // keep original order (most recently added)
    }
  })

  // Sort project/service favorites
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const itemA = itemData[a.itemId]
    const itemB = itemData[b.itemId]
    switch (sortBy) {
      case "name-asc":
        return (itemA?.title ?? "").localeCompare(itemB?.title ?? "")
      case "name-desc":
        return (itemB?.title ?? "").localeCompare(itemA?.title ?? "")
      case "rating":
        return (itemB?.rating ?? 0) - (itemA?.rating ?? 0)
      case "recent":
      default:
        return 0
    }
  })

  const itemCount = isTalent ? talents.length : favorites.length
  const filteredCount = isTalent ? sortedTalents.length : sortedProjects.length

  return (
    <div className="p-3.5 md:p-10 lg:py-[60px] lg:px-[200px]">
      {/* Section 1 — the My Favorites header (Figma 13111-46360). */}
      <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400">
        My Favorites
      </h1>

      <div className="mt-7 lg:mt-[19px] border-b h-[60px] flex items-end justify-between border-gray-200">
        <div className="items-end inline-flex gap-x-3">
          <Button
            className="text-gray-500"
            variant="ghost"
            visual="gray"
            size="md"
            onClick={() => setShowSearch(!showSearch)}
          >
            <SearchMd className="size-[18px]" />
          </Button>

          {showSearch ? (
            <Input
              className="mb-2.5 h-9 w-[260px] text-sm"
              placeholder={`Search ${isTalent ? "talent" : "projects"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          ) : (
            <div className="flex items-start gap-x-4">
              {FAVORITE_TABS.map((tab) => {
                const isActive = tab === activeTabLabel
                return (
                  <NextLink
                    key={tab}
                    href={`/favorites?tab=${encodeURIComponent(tab)}`}
                    className={cn(
                      "flex items-center justify-center px-1 pb-[11px] pt-px text-sm font-semibold capitalize",
                      isActive
                        ? "border-b-2 border-primary-500 text-primary-500"
                        : "text-gray-500 hover:text-dark-blue-400"
                    )}
                  >
                    {tab}
                  </NextLink>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-3 self-start lg:gap-x-6">
          <SortDropdown value={sortBy} onChange={setSortBy} />

            <ToggleGroupRoot
              className="gap-x-0 overflow-hidden rounded-[5px] border-gray-200 bg-white p-0"
              value={value}
              onValueChange={(details) => setValue(details.value)}
            >
              <ToggleGroupItem
                className="size-10 rounded-none bg-gray-100 px-0 data-[state=on]:bg-white data-[state=on]:shadow-none"
                value={GRID_LAYOUT}
              >
                <Grid className="size-[18px]" />
              </ToggleGroupItem>
              <ToggleGroupItem
                className="size-10 rounded-none bg-gray-100 px-0 data-[state=on]:bg-white data-[state=on]:shadow-none"
                value={LIST_LAYOUT}
              >
                <List className="size-[18px]" />
              </ToggleGroupItem>
            </ToggleGroupRoot>

          <NewGroupModal
            onCreated={() => router.push("/favorites")}
            existingNames={[]}
            activeTab={activeTabLabel}
          />
        </div>
      </div>

      {/* Section 2 — the group heading (Figma 13113-118147). */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex flex-col gap-y-2 text-dark-blue-400">
          <h2 className="text-[22px] font-semibold leading-normal">
            {groupName}
          </h2>
          <p className="text-lg font-light leading-normal">
            Below are your favorite {groupName} {itemNoun}
          </p>
        </div>

        <Button
          className="group px-0 text-base font-semibold capitalize leading-6 text-gray-500"
          variant="link"
          visual="gray"
          onClick={() => router.push("/favorites")}
        >
          <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
          Back To Groups
        </Button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div
            className={`grid ${isTalent ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-3 lg:gap-6`}
          >
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-white border rounded-lg h-[350px] animate-pulse"
                />
              ))}
          </div>
        ) : (
            isTalent ? sortedTalents.length === 0 : sortedProjects.length === 0
          ) ? (
          <div className="text-center py-20">
            <Star className="size-10 text-gray-300 mx-auto" />
            <p className="text-dark-blue-400 mt-4 mb-2 font-medium">
              {searchQuery ? "No results found" : "This group is empty"}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try a different search term"
                : `Add ${isTalent ? "talent" : "projects"} to this group from the marketplace`}
            </p>
          </div>
        ) : isTalent ? (
          getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
              {sortedTalents.map((talent) => (
                <TalentSearchCard
                  key={talent.id}
                  id={talent.id}
                  name={talent.firstName}
                  handle={`@${talent.username}`}
                  role={talent.role}
                  photo={talent.avatarUrl}
                  rate={talent.rate}
                  experience={talent.experience}
                  country={talent.country}
                  localTime={talent.localTime}
                  rating={talent.rating}
                  projects={talent.projects}
                  skills={talent.skills}
                  profileHref={talent.profileHref}
                  showOptionsMenu
                  onRemove={() => handleRemoveTalent(talent.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-y-3">
              {sortedTalents.map((talent) => (
                <TalentSearchCardLandscape
                  key={talent.id}
                  showOptionsMenu
                  onRemove={() => handleRemoveTalent(talent.id)}
                />
              ))}
            </div>
          )
        ) : getFirstItem(value) === GRID_LAYOUT ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedProjects.map((fav) => {
              const item = itemData[fav.itemId] || { id: fav.itemId }
              const isService = fav.type === "service"
              const categorySlug = (
                item.categories?.[0] ||
                item.category ||
                "research"
              )
                .toLowerCase()
                .replace(/\s+/g, "-")
              const itemId = String(item.id)

              return (
                <ListingCard
                  key={fav.id}
                  kind={isService ? "service" : "project"}
                  id={itemId}
                  cardVariant="is-favorited"
                  href={
                    item.slug
                      ? isService
                        ? buildServiceUrl(categorySlug, item.slug, itemId)
                        : buildProjectUrl(categorySlug, item.slug, itemId)
                      : undefined
                  }
                  title={item.title || "Untitled"}
                  description={item.summary || item.description}
                  mediaUrl={
                    item.mediaUrls?.[0] || item.coverImage || item.thumbnail
                  }
                  budget={
                    isService
                      ? item.priceMin
                        ? `$${Number(item.priceMin).toLocaleString()} - $${Number(
                            item.priceMax
                          ).toLocaleString()}`
                        : ""
                      : item.budget
                        ? `$${Number(item.budget).toLocaleString()}`
                        : ""
                  }
                  duration={
                    isService ? item.deliveryTime : item.duration
                  }
                  rating={item.rating}
                  reviewCount={item.reviewCount}
                  optionsSlot={
                    <ItemDropdown
                      onRemove={() => handleRemoveFavorite(fav.id)}
                    />
                  }
                />
              )
            })}
          </div>
        ) : (
          <div className="grid gap-y-3">
            {sortedProjects.map((fav) => {
              const item = itemData[fav.itemId] || { id: fav.itemId }
              const isService = fav.type === "service"
              const categorySlug = (
                item.categories?.[0] ||
                item.category ||
                "research"
              )
                .toLowerCase()
                .replace(/\s+/g, "-")
              const itemId = String(item.id)

              return (
                <ListingCard
                  key={fav.id}
                  kind={isService ? "service" : "project"}
                  id={itemId}
                  layout="list"
                  cardVariant="is-favorited"
                  href={
                    item.slug
                      ? isService
                        ? buildServiceUrl(categorySlug, item.slug, itemId)
                        : buildProjectUrl(categorySlug, item.slug, itemId)
                      : undefined
                  }
                  title={item.title || "Untitled"}
                  description={item.summary || item.description}
                  mediaUrl={
                    item.mediaUrls?.[0] || item.coverImage || item.thumbnail
                  }
                  budget={
                    isService
                      ? item.priceMin
                        ? `$${Number(item.priceMin).toLocaleString()} - $${Number(
                            item.priceMax
                          ).toLocaleString()}`
                        : ""
                      : item.budget
                        ? `$${Number(item.budget).toLocaleString()}`
                        : ""
                  }
                  duration={isService ? item.deliveryTime : item.duration}
                  rating={item.rating}
                  reviewCount={item.reviewCount}
                  optionsSlot={
                    <ItemDropdown
                      onRemove={() => handleRemoveFavorite(fav.id)}
                    />
                  }
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
