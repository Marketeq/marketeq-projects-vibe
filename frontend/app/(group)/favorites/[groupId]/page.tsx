"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { type Favorite, getFavoritesByGroup, removeFavorite } from "@/src/lib/api/favorites"
import { type TalentCardData, getUsernamesForGroup, userProfileToCardData } from "@/src/lib/data/sample-talents"
import { UserAPI } from "@/service/http/user"
import { getFirstItem } from "@/utils/functions"
import {
  ArrowLeft,
  Copy,
  Edit03,
  MoreHorizontal,
  SearchMd,
  Star,
  Trash2,
} from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { TalentSearchCard } from "@/components/talent-search-card"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
import {
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

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/* ─── Sample data for when the API is unavailable ─── */

const sampleProjectFavorites: Favorite[] = [
  { id: "p1", type: "project", itemId: "proj-1", groupId: "g2", userId: "", createdAt: "2026-01-20T00:00:00Z" },
  { id: "p2", type: "project", itemId: "proj-2", userId: "", groupId: "g2", createdAt: "2026-02-05T00:00:00Z" },
  { id: "p3", type: "project", itemId: "proj-3", groupId: "g2", userId: "", createdAt: "2026-03-12T00:00:00Z" },
]

/* ─── Project Card (grid) ─── */

const ProjectGridCard = ({ favorite, onRemove }: { favorite: Favorite; onRemove: () => void }) => {
  return (
    <article className="bg-white border rounded-lg border-gray-200">
      <div className="h-[163px] lg:h-[222px] grid grid-cols-2 grid-rows-3 bg-gray-50">
        <div className="relative">
          <NextImage className="object-cover" src="/dashboard.png" alt="Dashboard" sizes="25vw" fill />
        </div>
        <div className="relative">
          <NextImage className="object-cover" src="/ui-ux.png" alt="UX/UX" sizes="25vw" fill />
        </div>
        <div className="relative">
          <NextImage className="object-cover" src="/ui-ux.png" alt="UX/UX" sizes="25vw" fill />
        </div>
        <div className="relative">
          <NextImage className="object-cover" src="/dashboard.png" alt="Dashboard" sizes="25vw" fill />
        </div>
        <div className="relative">
          <NextImage className="object-cover" src="/dashboard.png" alt="Dashboard" sizes="25vw" fill />
        </div>
        <div className="relative">
          <NextImage className="object-cover" src="/ui-ux.png" alt="UX/UX" sizes="25vw" fill />
        </div>
      </div>

      <div className="relative pt-5 p-5 lg:p-[25px]">
        <ItemDropdown className="absolute top-1.5 right-1.5" onRemove={onRemove} />

        <NextLink href={`/project-details/${favorite.itemId}`}>
          <h2 className="text-[11px] leading-[13.31px] lg:text-base text-center lg:leading-[21.79px] font-bold text-dark-blue-400 hover:underline">
            Project {favorite.itemId}
          </h2>
        </NextLink>
        <p className="text-[9px] leading-[10.89px] lg:text-sm text-center lg:leading-[19.07px] font-light text-[#585C65] mt-0.5">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </p>
      </div>
    </article>
  )
}

/* ─── Project List Card ─── */

const ProjectListCard = ({ favorite, onRemove }: { favorite: Favorite; onRemove: () => void }) => {
  return (
    <div className="flex md:flex-row flex-col md:gap-x-10 border overflow-hidden bg-white border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/[.04])] rounded-lg">
      <div className="py-3.5 lg:py-[16.5px] space-y-0.5 pl-5">
        <NextLink href={`/project-details/${favorite.itemId}`}>
          <h2 className="text-[11px] leading-[13.31px] lg:text-base lg:leading-[19.36px] font-bold text-dark-blue-400 hover:underline">
            Project {favorite.itemId}
          </h2>
        </NextLink>
        <p className="text-[9px] leading-[10.89px] lg:text-sm lg:leading-[16.94px] font-light text-[#585C65]">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex relative xs:max-md:border-t xs:max-md:bg-gray-50 border-gray-200 h-[35px] md:h-[55px] lg:h-[72px] items-center flex-auto md:pl-5 isolate">
        <div className="relative flex flex-auto self-stretch">
          <NextImage src="/dashboard.png" alt="Dashboard" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
          <NextImage src="/ui-ux.png" alt="UI/UX" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
          <NextImage src="/dashboard.png" alt="Dashboard" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
        </div>
      </div>

      <div className="justify-end py-2.5 space-y-1 pl-5 pr-2.5 lg:flex hidden">
        <ItemDropdown onRemove={onRemove} />
      </div>
    </div>
  )
}

/* ─── Shared ─── */

const ItemDropdown = ({ className, onRemove }: { className?: string; onRemove?: () => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={`h-auto py-[2px] px-1.5 text-gray-500 ${className ?? ""}`} visual="gray" variant="ghost">
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[165px]">
        <DropdownMenuItem>
          <Edit03 className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem visual="destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" /> Remove from Group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SortDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:outline-none shrink-0">
          <SortAs className="size-4 lg:size-6 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ScrollArea viewportClassName="max-h-[250px]" scrollBar={<ScrollBar className="w-4 p-1" />}>
          <DropdownMenuCheckItem>Recently Added</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Name A-Z</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Name Z-A</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Rating</DropdownMenuCheckItem>
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
  const groupId = params.groupId as string
  const groupName = searchParams.get("name") || "Favorites"
  const groupType = searchParams.get("type") || "talent" // talent | project

  const [value, setValue] = useState([GRID_LAYOUT])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [talents, setTalents] = useState<TalentCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const isTalent = groupType === "talent"

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        if (isTalent) {
          // Fetch real user profiles from the API for each group member
          const usernames = getUsernamesForGroup(groupId)
          const fallbackUsernames = usernames.length > 0 ? usernames : getUsernamesForGroup("grp-visual-designers")
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
          setFavorites(data.length > 0 ? data : sampleProjectFavorites)
        }
      } catch {
        if (!isTalent) {
          setFavorites(sampleProjectFavorites)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [groupId, groupType, isTalent])

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
        `${t.firstName} ${t.lastName} ${t.username} ${t.role}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : talents

  const filteredProjects = searchQuery
    ? favorites.filter((f) => f.itemId.toLowerCase().includes(searchQuery.toLowerCase()))
    : favorites

  const itemCount = isTalent ? talents.length : favorites.length
  const filteredCount = isTalent ? filteredTalents.length : filteredProjects.length

  return (
    <div className="p-3.5 md:p-10 lg:py-[60px] lg:px-[200px]">
      {/* Back link + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/favorites")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-dark-blue-400 transition-colors"
        >
          <ArrowLeft className="size-4" />
          My Favorites
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400">
            {groupName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {itemCount} saved {isTalent ? "talent" : "projects"}
          </p>
        </div>

        <div className="flex items-center gap-x-3 lg:gap-x-3.5">
          <SortDropdown />

          <ToggleGroupRoot value={value} onValueChange={(details) => setValue(details.value)}>
            <ToggleGroupItem value={GRID_LAYOUT}>
              <Grid className="size-4 lg:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value={LIST_LAYOUT}>
              <List className="size-4 lg:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-4 border-b border-gray-200 pb-4 flex items-center gap-3">
        <Button
          className="text-gray-500"
          variant="ghost"
          visual="gray"
          size="md"
          onClick={() => setShowSearch(!showSearch)}
        >
          <SearchMd className="size-[18px]" />
        </Button>
        {showSearch && (
          <Input
            className="h-9 w-[260px] text-sm"
            placeholder={`Search ${isTalent ? "talent" : "projects"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filteredCount} of {itemCount} shown
        </span>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className={`grid ${isTalent ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"} gap-3 lg:gap-6`}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white border rounded-lg h-[250px] animate-pulse" />
            ))}
          </div>
        ) : (isTalent ? filteredTalents.length === 0 : filteredProjects.length === 0) ? (
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
              {filteredTalents.map((talent) => (
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
              {filteredTalents.map((talent) => (
                <TalentSearchCardLandscape
                  key={talent.id}
                  showOptionsMenu
                  onRemove={() => handleRemoveTalent(talent.id)}
                />
              ))}
            </div>
          )
        ) : getFirstItem(value) === GRID_LAYOUT ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6">
            {filteredProjects.map((fav) => (
              <ProjectGridCard key={fav.id} favorite={fav} onRemove={() => handleRemoveFavorite(fav.id)} />
            ))}
          </div>
        ) : (
          <div className="grid gap-y-3">
            {filteredProjects.map((fav) => (
              <ProjectListCard key={fav.id} favorite={fav} onRemove={() => handleRemoveFavorite(fav.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
