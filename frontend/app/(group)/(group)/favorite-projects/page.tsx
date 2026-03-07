"use client"

import { useEffect, useState } from "react"
import { type Favorite, getProjectFavorites } from "@/src/lib/api/favorites"
import { getFirstItem } from "@/utils/functions"
import {
  Copy,
  Edit03,
  MoreHorizontal,
  Plus,
  SearchMd,
  Trash2,
  Zap,
} from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

interface CardProps {
  favorite: Favorite
  itemCount: number
}

const Card = ({ favorite, itemCount }: CardProps) => {
  return (
    <article className="bg-white border rounded-lg border-gray-200">
      <div className="h-[163px] lg:h-[222px] grid grid-cols-2 grid-rows-3 bg-gray-50">
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/dashboard.png"
            alt="Dashboard"
            sizes="25vw"
            fill
          />
        </div>
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/ui-ux.png"
            alt="UX/UX"
            sizes="25vw"
            fill
          />
        </div>
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/ui-ux.png"
            alt="UX/UX"
            sizes="25vw"
            fill
          />
        </div>
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/dashboard.png"
            alt="Dashboard"
            sizes="25vw"
            fill
          />
        </div>
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/dashboard.png"
            alt="Dashboard"
            sizes="25vw"
            fill
          />
        </div>
        <div className="relative">
          <NextImage
            className="object-cover"
            src="/ui-ux.png"
            alt="UX/UX"
            sizes="25vw"
            fill
          />
        </div>
      </div>

      <div className="relative pt-[30px] lg:pt-[47px] p-5 lg:p-[25px]">
        <div className="size-11 lg:size-[61px] bg-white absolute rounded-full -top-[22px] lg:-top-[30.5px] left-1/2 border border-gray-300 inline-flex flex-col shrink-0 justify-center items-center -translate-x-1/2">
          <span className="text-xs leading-[14.52px] lg:text-base font-semibold lg:leading-[19.36px] text-dark-blue-400">
            {itemCount}
          </span>
          <span className="text-[9px] leading-[10.89px] lg:text-xs font-light lg:leading-[14.52px] text-dark-blue-400">
            Saved
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-auto py-[2px] px-1.5 absolute top-1.5 right-1.5 lg:top-[9px] lg:right-[9px] lg:py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
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
            <DropdownMenuItem>
              <Zap className="h-4 w-4" /> Run Test
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NextLink href={`/project-details/${favorite.itemId}`}>
          <h1 className="text-[11px] leading-[13.31px] lg:text-base text-center lg:leading-[21.79px] font-bold text-dark-blue-400 hover:underline">
            Project {favorite.itemId}
          </h1>
        </NextLink>
        <p className="text-[9px] leading-[10.89px] lg:text-sm text-center lg:leading-[19.07px] font-light text-[#585C65] xs:max-lg:mt-0.5">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </p>
      </div>
    </article>
  )
}

const ListCard = ({ favorite, itemCount }: CardProps) => {
  return (
    <div className="flex md:flex-row flex-col md:gap-x-10 border overflow-hidden bg-white border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/[.04])] rounded-lg">
      <div className="py-3.5 lg:py-[16.5px] space-y-0.5 pl-5">
        <NextLink href={`/projects/${favorite.itemId}`}>
          <h1 className="text-[11px] leading-[13.31px] lg:text-base lg:leading-[19.36px] font-bold text-dark-blue-400 hover:underline">
            Project {favorite.itemId}
          </h1>
        </NextLink>
        <p className="text-[9px] leading-[10.89px] lg:text-sm lg:leading-[16.94px] font-light text-[#585C65]">
          Saved {new Date(favorite.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex relative xs:max-md:border-t xs:max-md:bg-gray-50 border-gray-200 h-[35px] md:h-[55px] lg:h-[72px] items-center flex-auto md:pl-5 isolate">
        <div className="md:py-[4.53px] lg:py-[10.59px]">
          <div className="inline-flex absolute xs:max-md:-top-[22.5px] xs:max-md:right-3.5 md:relative z-10 flex-col shrink-0 size-[45px] lg:size-[50px] rounded-full justify-center items-center bg-white border-[.74px] lg:border-[.82px] border-gray-200 shadow-[0px_1.64px_4.1px_0px_theme(colors.black/.04)]">
            <span className="text-[12.01px] leading-[14.54px] lg:text-sm lg:leading-[16.94px] font-semibold text-dark-blue-400">
              {itemCount}
            </span>
            <span className="text-[9.01px] leading-[10.9px] lg:text-[10px] font-light lg:leading-[12.1px] text-dark-blue-400">
              saved
            </span>
          </div>
        </div>
        <div className="relative flex flex-auto self-stretch md:-left-[25px]">
          <NextImage
            src="/dashboard.png"
            alt="Dashboard"
            sizes="25vw"
            width={214.03}
            height={72}
            style={{
              width: "auto",
              height: "100%",
            }}
          />
          <NextImage
            src="/ui-ux.png"
            alt="UI/UX"
            sizes="25vw"
            width={214.03}
            height={72}
            style={{
              width: "auto",
              height: "100%",
            }}
          />
          <NextImage
            src="/dashboard.png"
            alt="Dashboard"
            sizes="25vw"
            width={214.03}
            height={72}
            style={{
              width: "auto",
              height: "100%",
            }}
          />
          <NextImage
            src="/ui-ux.png"
            alt="UI/UX"
            sizes="25vw"
            width={214.03}
            height={72}
            style={{
              width: "auto",
              height: "100%",
            }}
          />
        </div>
      </div>

      <div className="justify-end py-2.5 space-y-1 pl-5 pr-2.5 lg:flex hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              className="text-gray-400 h-6 w-8"
              variant="ghost"
              visual="gray"
            >
              <MoreHorizontal className="size-5" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[165px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap className="h-4 w-4" /> Run Test
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const Modal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:gap-x-1.5 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px] border-primary-500 text-primary-500 hover:text-white hover:bg-primary-500"
          variant="outlined"
          visual="gray"
          size="md"
        >
          <Plus className="size-[11.64px] lg:size-[15px]" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="flex items-center gap-x-3">
          <Input placeholder="Enter Group Name" className="flex-auto" />
          <Button size="lg">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function FavoriteProjects() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true)
        const projectFavs = await getProjectFavorites()
        setFavorites(projectFavs)
      } catch (error) {
        console.error("Failed to load favorites:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFavorites()
  }, [])

  return (
    <div className="p-3.5 md:p-10 lg:py-[100px] lg:px-[200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 xs:max-lg:hidden">
          My Favorites
        </h1>
        <div className="lg:hidden">
          <Modal />
        </div>

        <div className="flex items-center gap-x-1.5 lg:hidden">
          <button className="focus-visible:outline-none">
            <SortAs className="size-5 lg:size-6 text-gray-500" />
          </button>

          <ToggleGroupRoot
            value={value}
            onValueChange={(details) => setValue(details.value)}
          >
            <ToggleGroupItem
              className="xs:max-lg:size-[30px]"
              value={GRID_LAYOUT}
            >
              <Grid className="size-5 lg:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem
              className="xs:max-lg:size-[30px]"
              value={LIST_LAYOUT}
            >
              <List className="size-5 lg:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>
      </div>

      <h1 className="mt-6 text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 lg:hidden">
        My Favorites ({favorites.length})
      </h1>

      <Tabs className="mt-6 lg:mt-[19px]" defaultValue="All">
        <div className="border-b h-10 lg:h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3">
            <Button
              className="text-gray-500"
              variant="ghost"
              visual="gray"
              size="md"
            >
              <SearchMd className="size-[18px]" />
            </Button>

            <TabsList className="flex justify-start border-b-0 px-0 xs:max-lg:pt-2">
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="All"
              >
                All Projects
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="Recent"
              >
                Recent
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-x-3 lg:gap-x-6 self-start xs:max-lg:hidden">
            <div className="flex items-center gap-x-1.5">
              <button className="focus-visible:outline-none">
                <SortAs className="size-5 lg:size-6 text-gray-500" />
              </button>

              <ToggleGroupRoot
                value={value}
                onValueChange={(details) => setValue(details.value)}
              >
                <ToggleGroupItem
                  className="xs:max-lg:size-[30px]"
                  value={GRID_LAYOUT}
                >
                  <Grid className="size-5 lg:size-6" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="xs:max-lg:size-[30px]"
                  value={LIST_LAYOUT}
                >
                  <List className="size-5 lg:size-6" />
                </ToggleGroupItem>
              </ToggleGroupRoot>
            </div>

            <Modal />
          </div>
        </div>
        <TabsContent value="All">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border rounded-lg h-[300px] animate-pulse"
                  />
                ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-dark-blue-400 mb-4">No favorites yet</p>
              <NextLink href="/creative/projects">
                <Button>Explore Projects</Button>
              </NextLink>
            </div>
          ) : getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {favorites.map((fav) => (
                <Card
                  key={fav.id}
                  favorite={fav}
                  itemCount={favorites.length}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              {favorites.map((fav) => (
                <ListCard
                  key={fav.id}
                  favorite={fav}
                  itemCount={favorites.length}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="Recent">
          {/* Same as All tab but sorted by date */}
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {favorites
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((fav) => (
                  <Card
                    key={fav.id}
                    favorite={fav}
                    itemCount={favorites.length}
                  />
                ))}
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              {favorites
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((fav) => (
                  <ListCard
                    key={fav.id}
                    favorite={fav}
                    itemCount={favorites.length}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
