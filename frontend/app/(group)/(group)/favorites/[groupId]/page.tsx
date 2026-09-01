"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { UserAPI } from "@/service/http/user"
import {
  type Favorite,
  type FavoriteGroup,
  getFavoritesByGroup,
  getGroups,
  addFavorite,
  moveFavorite,
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
  Check,
  Clock,
  Folder1,
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
import { FAVORITE_TABS } from "@/src/lib/favorites-tabs"
import { toast } from "@/components/ui/toast/use-toast"
import { ToastAction } from "@/components/ui/toast/toast"
import { NewGroupModal } from "@/app/(group)/(group)/favorites/page"
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollBar,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

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
        <IconButton
          className="shrink-0 text-gray-500"
          variant="ghost"
          visual="gray"
          size="md"
          aria-label="Sort"
        >
          <SortAs className="size-4 lg:size-6" />
        </IconButton>
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

  // Removing is destructive, so it goes through a confirmation. Moving opens
  // a picker of the other groups.
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null)
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [moveTargetId, setMoveTargetId] = useState("")
  const [isMoving, setIsMoving] = useState(false)

  const handleRemoveFavorite = async () => {
    if (!pendingRemoveId) return
    const removed = favorites.find((f) => f.id === pendingRemoveId)
    const success = await removeFavorite(pendingRemoveId)
    if (success && removed) {
      setFavorites((prev) => prev.filter((f) => f.id !== pendingRemoveId))
      toast({
        variant: "success",
        title: "Item removed from this group",
        action: (
          <ToastAction
            altText="Undo"
            className="h-auto shrink-0 border-0 bg-transparent p-0 text-sm font-semibold leading-5 text-success-500 underline hover:bg-transparent hover:no-underline focus:outline-none"
            onClick={async () => {
              const restored = await addFavorite({
                type: removed.type,
                itemId: removed.itemId,
                groupId,
              })
              if (restored) setFavorites((prev) => [restored, ...prev])
            }}
          >
            Undo
          </ToastAction>
        ),
      })
    }
    setPendingRemoveId(null)
  }

  const openMoveDialog = async (favoriteId: string) => {
    setPendingMoveId(favoriteId)
    setMoveTargetId("")
    try {
      const all = await getGroups()
      setGroups(all.filter((g) => g.id !== groupId))
    } catch {
      setGroups([])
    }
  }

  const handleMoveFavorite = async () => {
    if (!pendingMoveId || !moveTargetId) return
    const favoriteId = pendingMoveId
    const target = groups.find((g) => g.id === moveTargetId)
    const movedItem = favorites.find((f) => f.id === favoriteId)
    setIsMoving(true)
    const moved = await moveFavorite(favoriteId, { groupId: moveTargetId })
    if (moved) {
      // It now lives in another group, so it leaves this list.
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
      toast({
        variant: "success",
        title: `Moved to ${target?.name ?? "another group"}`,
        action: (
          <ToastAction
            altText="Undo"
            className="h-auto shrink-0 border-0 bg-transparent p-0 text-sm font-semibold leading-5 text-success-500 underline hover:bg-transparent hover:no-underline focus:outline-none"
            onClick={async () => {
              const back = await moveFavorite(favoriteId, { groupId })
              if (back && movedItem) setFavorites((prev) => [movedItem, ...prev])
            }}
          >
            Undo
          </ToastAction>
        ),
      })
    }
    setIsMoving(false)
    setPendingMoveId(null)
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
    <div className="p-3.5 md:p-10 lg:px-[200px] lg:py-[100px]">
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
            <Tabs
              value={activeTabLabel}
              onValueChange={(tab) =>
                router.push(`/favorites?tab=${encodeURIComponent(tab)}`)
              }
            >
              <TabsList className="justify-start border-b-0 px-0">
                {FAVORITE_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
                      onRemove={() => setPendingRemoveId(fav.id)}
                      onMove={() => openMoveDialog(fav.id)}
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
                      onRemove={() => setPendingRemoveId(fav.id)}
                      onMove={() => openMoveDialog(fav.id)}
                    />
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Move an item to another group */}
      <Dialog
        open={Boolean(pendingMoveId)}
        onOpenChange={(open) => !open && setPendingMoveId(null)}
      >
        <DialogContent className="max-w-[420px] p-0">
          <div className="border-b border-gray-200 px-6 py-5">
            <DialogTitle asChild>
              <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                Move to another group
              </h2>
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-500">
              Choose the group this item should move to.
            </p>
          </div>

          <div className="px-6 py-5">
            {groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                You have no other groups to move this into.
              </p>
            ) : (
              <>
                <Label className="mb-1.5 block" htmlFor="move-target-group">
                  Group
                </Label>
                <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                  <SelectTrigger id="move-target-group" className="w-full">
                    <span className="flex items-center gap-x-2 truncate">
                      <Folder1 className="size-[18px] shrink-0 text-gray-400" />
                      <SelectValue placeholder="Choose a group" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <DialogClose asChild>
              <Button variant="link" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={!moveTargetId || isMoving}
              onClick={handleMoveFavorite}
            >
              Move Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm before removing an item */}
      <Dialog
        open={Boolean(pendingRemoveId)}
        onOpenChange={(open) => !open && setPendingRemoveId(null)}
      >
        <DialogContent className="max-w-[420px] p-0">
          <div className="px-6 py-5">
            <DialogTitle asChild>
              <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                Remove this item?
              </h2>
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-500">
              It will be taken out of {groupName}.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <DialogClose asChild>
              <Button variant="link" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" visual="error" onClick={handleRemoveFavorite}>
              <Trash2 className="size-4" /> Remove Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
