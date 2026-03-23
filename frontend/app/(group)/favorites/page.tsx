"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { type Favorite, getProjectFavorites, getTalentFavorites } from "@/src/lib/api/favorites"
import { cn, getFirstItem } from "@/utils/functions"
import {
  ChevronDown,
  Copy,
  Edit03,
  MessageSquare,
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DisclosureContent,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/* ─── Project Cards ─── */

interface ProjectCardProps {
  favorite: Favorite
  itemCount: number
}

const ProjectCard = ({ favorite, itemCount, groupId, groupName }: ProjectCardProps & { groupId: string; groupName: string }) => {
  return (
    <NextLink href={`/favorites/${groupId}?name=${encodeURIComponent(groupName)}&type=project`} className="block">
    <article className="bg-white border rounded-lg border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
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

      <div className="relative pt-[30px] lg:pt-[47px] p-5 lg:p-[25px]">
        <div className="size-11 lg:size-[61px] bg-white absolute rounded-full -top-[22px] lg:-top-[30.5px] left-1/2 border border-gray-300 inline-flex flex-col shrink-0 justify-center items-center -translate-x-1/2">
          <span className="text-xs leading-[14.52px] lg:text-base font-semibold lg:leading-[19.36px] text-dark-blue-400">
            {itemCount}
          </span>
          <span className="text-[9px] leading-[10.89px] lg:text-xs font-light lg:leading-[14.52px] text-dark-blue-400">
            Saved
          </span>
        </div>

        <CardDropdown />

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
    </NextLink>
  )
}

const ProjectListCard = ({ favorite, itemCount, groupId, groupName }: ProjectCardProps & { groupId: string; groupName: string }) => {
  return (
    <NextLink href={`/favorites/${groupId}?name=${encodeURIComponent(groupName)}&type=project`} className="block">
    <div className="flex md:flex-row flex-col md:gap-x-10 border overflow-hidden bg-white border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/[.04])] rounded-lg cursor-pointer hover:shadow-md transition-shadow">
      <div className="py-3.5 lg:py-[16.5px] space-y-0.5 pl-5">
        <NextLink href={`/project-details/${favorite.itemId}`}>
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
          <NextImage src="/dashboard.png" alt="Dashboard" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
          <NextImage src="/ui-ux.png" alt="UI/UX" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
          <NextImage src="/dashboard.png" alt="Dashboard" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
          <NextImage src="/ui-ux.png" alt="UI/UX" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
        </div>
      </div>

      <div className="justify-end py-2.5 space-y-1 pl-5 pr-2.5 lg:flex hidden">
        <CardDropdown />
      </div>
    </div>
    </NextLink>
  )
}

/* ─── Talent Cards ─── */

const TalentCard = ({ groupId, groupName }: { groupId: string; groupName: string }) => {
  return (
    <NextLink href={`/favorites/${groupId}?name=${encodeURIComponent(groupName)}&type=talent`} className="block">
    <article className="relative bg-white py-[25px] px-5 lg:p-[35px] lg:pb-[25px] rounded-lg border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex justify-center items-center">
        <div className="relative size-[127.5px] lg:size-[176px] flex-none rounded-full isolate">
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:45deg]">
            <button className="inline-flex items-center justify-center shrink-0 size-[44.96px] lg:size-[61px] rounded-full border-dashed border-[1.5px] border-gray-300 text-gray-300 focus-visible:outline-none rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]">
              <Plus className="size-5" />
            </button>
          </div>
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:0deg]">
            <Avatar className="border-2 border-white size-[44.96px] lg:size-[61px] rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]" size="2xl">
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:-45deg]">
            <Avatar className="border-2 border-white size-[44.96px] lg:size-[61px] rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]" size="2xl">
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:-90deg]">
            <Avatar className="border-2 border-white size-[44.96px] lg:size-[61px] rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]" size="2xl">
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:-135deg]">
            <Avatar className="border-2 border-white size-[44.96px] lg:size-[61px] rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]" size="2xl">
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:-180deg]">
            <div className="size-[44.96px] lg:size-[61px] bg-white border border-gray-300 flex rounded-full flex-col shrink-0 justify-center items-center rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))]">
              <span className="inline-block text-[11.79px] leading-[14.27px] lg:text-base lg:leading-[19.36px] font-semibold text-dark-blue-400">
                4
              </span>
              <span className="inline-block text-[8.84px] leading-[10.7px] lg:text-xs lg:leading-[14.52px] font-light text-dark-blue-400">
                saved
              </span>
            </div>
          </div>
        </div>
      </div>

      <CardDropdown className="absolute top-[10px] right-[9.8px]" />

      <div className="mt-[13.24px] lg:mt-[17px]">
        <h1 className="text-[13px] leading-[15.73px] lg:text-base text-center lg:leading-[19.36px] font-bold text-dark-blue-400">
          {groupName}
        </h1>
        <h1 className="text-[11px] lg:text-sm mt-[2px] text-center lg:leading-[16.94px] text-[#585C65]">
          Created Jan 2024
        </h1>
      </div>
    </article>
    </NextLink>
  )
}

const TalentCardLandscapeRow = ({ value }: { value: string }) => {
  return (
    <AccordionItem
      className="border border-gray-200 bg-white shadow-[0px_2px_5px_0px_theme(colors.black/.04)] rounded-lg"
      value={value}
    >
      <div className="flex xs:max-md:p-3 xs:max-md:flex-col xs:max-md:gap-y-[17px]">
        <div className="md:contents flex items-center justify-between">
          <div className="xs:max-md:flex xs:max-md:flex-col xs:max-md:gap-y-1 md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <NextLink href={`/favorites/sample-group-1?name=${encodeURIComponent("Visual Designers")}&type=talent`} className="text-sm leading-[15.73px] lg:text-base font-bold inline-block lg:leading-[19.07px] text-dark-blue-400 hover:underline">
              Visual Designers
            </NextLink>
            <div className="xs:max-md:flex hidden items-center gap-x-2">
              <span className="text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
                Created on
              </span>
              <span className="inline-flex gap-x-2 items-center text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light text-dark-blue-400">
                <span className="font-bold">January</span>
                2024
              </span>
            </div>
          </div>
          <InlineDropdown className="xs:max-md:inline-flex md:hidden" />
        </div>

        <div className="md:contents flex items-center justify-between">
          <div className="md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <div className="flex items-center gap-x-3">
              <div className="flex flex-col">
                <span className="text-xs leading-[14.52px] lg:text-base font-semibold inline-block lg:leading-[19.07px] text-dark-blue-400">
                  34
                </span>
                <span className="text-[9px] leading-[10.89px] lg:text-xs lg:leading-[14.52px] inline-block font-light text-dark-blue-400">
                  saved
                </span>
              </div>
              <div className="flex items-center -space-x-2 lg:-space-x-1.5">
                {Array(6).fill(0).map((_, i) => (
                  <Avatar key={i} className="border-2 border-white xs:max-lg:size-6" size="sm">
                    <AvatarImage src="/man.jpg" alt="Man" />
                    <AvatarFallback>M</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>

          <div className="xs:max-md:hidden flex-auto pl-6 lg:pl-[25px] py-3 lg:py-[25px] last:pr-3 lg:last:pr-[25px]">
            <div className="flex items-center gap-x-2">
              <span className="text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
                Created on
              </span>
              <span className="inline-flex gap-x-2 items-center text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light text-dark-blue-400">
                <span className="font-bold">January</span>
                2024
              </span>
            </div>
          </div>

          <div className="md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <div className="contents md:flex justify-end items-center gap-x-3 lg:gap-x-6">
              <AccordionTrigger asChild>
                <Button className="xs:max-lg:text-[10px] xs:max-lg:leading-6 xs:max-lg:gap-x-1" variant="link" visual="primary">
                  Expand <ChevronDown className="size-3 lg:size-[15px]" />
                </Button>
              </AccordionTrigger>
              <InlineDropdown />
            </div>
          </div>
        </div>
      </div>

      <DisclosureContent>
        <div className="px-3 pb-3 lg:px-[25px] flex flex-col gap-y-3 lg:pb-[25px]">
          <TalentCardLandscape />
          <TalentCardLandscape />
          <TalentCardLandscape />
        </div>
      </DisclosureContent>
    </AccordionItem>
  )
}

/* ─── Shared Components ─── */

const CardDropdown = ({ className }: { className?: string }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn("h-auto py-[2px] px-1.5 py-1 text-gray-500", className)}
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
  )
}

const InlineDropdown = ({ className }: { className?: string }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          className={cn("text-gray-400 xs:max-md:hidden xs:max-lg:h-5 xs:max-lg:w-auto xs:max-lg:px-1.5", className)}
          variant="ghost"
          visual="gray"
        >
          <MoreHorizontal className="size-4 lg:size-5" />
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
  )
}

const NewGroupModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="border-primary-500 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px] xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 text-primary-500 hover:text-white hover:bg-primary-500"
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
          <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─── Main Page ─── */

export default function FavoritesPage() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [projectFavorites, setProjectFavorites] = useState<Favorite[]>([])
  const [talentFavorites, setTalentFavorites] = useState<Favorite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true)
        const [projects, talent] = await Promise.all([
          getProjectFavorites(),
          getTalentFavorites(),
        ])
        setProjectFavorites(projects)
        setTalentFavorites(talent)
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
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
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

        <NewGroupModal />
      </div>

      <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        My Favorites
      </h1>

      <Tabs className="mt-7 lg:mt-[19px]" defaultValue="Talent Network">
        <div className="border-b h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3">
            <Button className="text-gray-500" variant="ghost" visual="gray" size="md">
              <SearchMd className="size-[18px]" />
            </Button>

            <TabsList className="flex justify-start border-b-0 px-0">
              <TabsTrigger className="xs:max-lg:text-xs xs:max-lg:leading-5" value="Talent Network">
                Talent Network
              </TabsTrigger>
              <TabsTrigger className="xs:max-lg:text-xs xs:max-lg:leading-5" value="Projects">
                Projects
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="hidden items-center gap-x-3 lg:gap-x-6 self-start md:flex">
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

            <NewGroupModal />
          </div>
        </div>

        {/* Talent Network Tab */}
        <TabsContent value="Talent Network">
          <div className="pt-[14px] lg:pt-6">
            {getFirstItem(value) === GRID_LAYOUT ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
                <TalentCard groupId="grp-visual-designers" groupName="Visual Designers" />
                <TalentCard groupId="grp-ux-researchers" groupName="UX Researchers" />
                <TalentCard groupId="grp-frontend-devs" groupName="Frontend Developers" />
                <TalentCard groupId="grp-backend-devs" groupName="Backend Developers" />
                <TalentCard groupId="grp-product-managers" groupName="Product Managers" />
                <TalentCard groupId="grp-data-analysts" groupName="Data Analysts" />
                <TalentCard groupId="grp-copywriters" groupName="Copywriters" />
              </div>
            ) : (
              <Accordion type="multiple" className="flex flex-col gap-y-3">
                <TalentCardLandscapeRow value="first" />
                <TalentCardLandscapeRow value="second" />
                <TalentCardLandscapeRow value="third" />
              </Accordion>
            )}
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="Projects">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg h-[300px] animate-pulse" />
              ))}
            </div>
          ) : projectFavorites.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-dark-blue-400 mb-4">No favorites yet</p>
              <NextLink href="/search">
                <Button>Explore Projects</Button>
              </NextLink>
            </div>
          ) : getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {projectFavorites.map((fav) => (
                <ProjectCard key={fav.id} favorite={fav} itemCount={projectFavorites.length} groupId={fav.groupId ?? fav.id} groupName={`Project ${fav.itemId}`} />
              ))}
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              {projectFavorites.map((fav) => (
                <ProjectListCard key={fav.id} favorite={fav} itemCount={projectFavorites.length} groupId={fav.groupId ?? fav.id} groupName={`Project ${fav.itemId}`} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
