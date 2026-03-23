"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { type Favorite, getFavoritesByGroup } from "@/src/lib/api/favorites"
import { getFirstItem } from "@/utils/functions"
import {
  ArrowLeft,
  Copy,
  Edit03,
  MoreHorizontal,
  Plus,
  SearchMd,
  Star,
  Trash2,
  Zap,
} from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { TalentCardLandscape } from "@/components/talent-card-landscape"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/* ─── Sample data for when the API is unavailable ─── */

const sampleTalentFavorites: Favorite[] = [
  { id: "t1", type: "talent", itemId: "talent-1", groupId: "g1", userId: "", createdAt: "2026-01-15T00:00:00Z" },
  { id: "t2", type: "talent", itemId: "talent-2", groupId: "g1", userId: "", createdAt: "2026-02-10T00:00:00Z" },
  { id: "t3", type: "talent", itemId: "talent-3", groupId: "g1", userId: "", createdAt: "2026-02-20T00:00:00Z" },
  { id: "t4", type: "talent", itemId: "talent-4", groupId: "g1", userId: "", createdAt: "2026-03-01T00:00:00Z" },
]

const sampleProjectFavorites: Favorite[] = [
  { id: "p1", type: "project", itemId: "proj-1", groupId: "g2", userId: "", createdAt: "2026-01-20T00:00:00Z" },
  { id: "p2", type: "project", itemId: "proj-2", userId: "", groupId: "g2", createdAt: "2026-02-05T00:00:00Z" },
  { id: "p3", type: "project", itemId: "proj-3", groupId: "g2", userId: "", createdAt: "2026-03-12T00:00:00Z" },
]

/* ─── Talent Card (grid) ─── */

const TalentGridCard = ({ favorite }: { favorite: Favorite }) => {
  return (
    <article className="relative bg-white py-[25px] px-5 lg:p-[35px] lg:pb-[25px] rounded-lg border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="flex justify-center">
        <Avatar className="size-16 lg:size-20" size="2xl">
          <AvatarImage src="/man.jpg" alt="Talent" />
          <AvatarFallback>T</AvatarFallback>
        </Avatar>
      </div>

      <ItemDropdown className="absolute top-[10px] right-[9.8px]" />

      <div className="mt-3 text-center">
        <h2 className="text-sm lg:text-base font-bold text-dark-blue-400">
          Talent {favorite.itemId}
        </h2>
        <p className="text-xs lg:text-sm text-[#585C65] mt-0.5">
          UX/UI Designer
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Badge className="rounded-full text-[10px]" size="sm" visual="primary">
            Available
          </Badge>
          <div className="flex items-center gap-0.5">
            <Star className="size-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-500">4.9</span>
          </div>
        </div>
        <p className="text-[10px] lg:text-xs text-gray-400 mt-2">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </p>
      </div>
    </article>
  )
}

/* ─── Talent List Card ─── */

const TalentListCard = ({ favorite }: { favorite: Favorite }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <Avatar className="size-12" size="lg">
        <AvatarImage src="/man.jpg" alt="Talent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
      <div className="flex-auto min-w-0">
        <h2 className="text-sm font-bold text-dark-blue-400">Talent {favorite.itemId}</h2>
        <p className="text-xs text-[#585C65]">UX/UI Designer</p>
      </div>
      <div className="flex items-center gap-3 flex-none">
        <Badge className="rounded-full text-[10px]" size="sm" visual="primary">
          Available
        </Badge>
        <div className="flex items-center gap-0.5">
          <Star className="size-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-500">4.9</span>
        </div>
        <span className="text-xs text-gray-400">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </span>
        <ItemDropdown />
      </div>
    </div>
  )
}

/* ─── Project Card (grid) ─── */

const ProjectGridCard = ({ favorite }: { favorite: Favorite }) => {
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
        <ItemDropdown className="absolute top-1.5 right-1.5" />

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

const ProjectListCard = ({ favorite }: { favorite: Favorite }) => {
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
        <ItemDropdown />
      </div>
    </div>
  )
}

/* ─── Shared ─── */

const ItemDropdown = ({ className }: { className?: string }) => {
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
        <DropdownMenuItem visual="destructive">
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
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await getFavoritesByGroup(groupId)
        if (data.length > 0) {
          setFavorites(data)
        } else {
          // Fallback sample data based on type
          setFavorites(groupType === "project" ? sampleProjectFavorites : sampleTalentFavorites)
        }
      } catch {
        setFavorites(groupType === "project" ? sampleProjectFavorites : sampleTalentFavorites)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [groupId, groupType])

  const filtered = searchQuery
    ? favorites.filter((f) => f.itemId.toLowerCase().includes(searchQuery.toLowerCase()))
    : favorites

  const isTalent = groupType === "talent"

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
            {favorites.length} saved {isTalent ? "talent" : "projects"}
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
          {filtered.length} of {favorites.length} shown
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
        ) : filtered.length === 0 ? (
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
              {filtered.map((fav) => (
                <TalentGridCard key={fav.id} favorite={fav} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-y-3">
              {filtered.map((fav) => (
                <TalentListCard key={fav.id} favorite={fav} />
              ))}
            </div>
          )
        ) : getFirstItem(value) === GRID_LAYOUT ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6">
            {filtered.map((fav) => (
              <ProjectGridCard key={fav.id} favorite={fav} />
            ))}
          </div>
        ) : (
          <div className="grid gap-y-3">
            {filtered.map((fav) => (
              <ProjectListCard key={fav.id} favorite={fav} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
