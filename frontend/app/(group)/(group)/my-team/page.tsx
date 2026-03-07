"use client"

import { useState } from "react"
import { getFirstItem } from "@/utils/functions"
import {
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
import { InviteWindowTrigger } from "@/components/invite-window"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { TalentCardLandscape } from "@/components/talent-card-landscape"
import { TalentSearchCard } from "@/components/talent-search-card"
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

const InternalTeamCard = () => {
  return (
    <article className="relative grid rounded-[6px] lg:rounded-[8px] p-5 lg:py-[35px] lg:px-[30px] bg-white border border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="absolute h-6 w-auto top-2.5 px-1.5 right-2.5 text-gray-400"
            visual="gray"
            variant="ghost"
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

      <div className="flex items-center justify-center">
        <Avatar className="size-[62px] lg:size-[116px]" size="2xl">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
      </div>

      <h1 className="text-[13px] leading-[15.73px] lg:text-base text-center lg:leading-[19.36px] font-bold text-[#122A4B] mt-3 lg:mt-[17px]">
        Andrew Roddick
      </h1>
      <p className="text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-1">
        Talent Magnet
      </p>

      <div className="flex items-center justify-center mt-3 lg:mt-[17px]">
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-4"
          variant="link"
          visual="primary"
        >
          Alliance Corp.
        </Button>
      </div>

      <div className="lg:h-[90px] h-[63px] relative self-end mt-3 lg:mt-[25px]">
        <NextImage
          className="object-contain"
          src="/alliance.png"
          alt="Alliance"
          fill
        />
      </div>
    </article>
  )
}

const InternalTeamCardLandscape = () => {
  return (
    <div className="flex xs:max-lg:flex-col xs:max-lg:p-3 rounded-[8px] bg-white shadow-[0px_2px_5px_0px_theme(colors.black/.04)] border border-gray-200">
      <div className="lg:contents flex items-center justify-between">
        <div className="lg:flex-auto flex items-center gap-x-3 md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5">
          <NextLink
            href="#"
            className="focus-visible:outline-none inline-block"
          >
            <Avatar className="xs:max-lg:size-[50px]" size="md">
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </NextLink>

          <div className="space-y-0.5">
            <NextLink
              href="#"
              className="focus-visible:outline-none block text-[13px] hover:underline leading-[15.73px] lg:text-base font-bold lg:leading-[21.79px] text-dark-blue-400"
            >
              berra.unall4
            </NextLink>
            <span className="text-[11px] leading-[13.31px] lg:text-sm lg:leading-[19.07px] font-light text-[#585C65]">
              Lead Software Developer
            </span>
          </div>
        </div>

        <div className="flex-auto flex items-center gap-x-3 pl-5 py-5 last:pr-5 xs:max-lg:hidden">
          <div className="h-[50px] w-[78px] shrink-0 relative">
            <NextImage
              className="object-contain"
              src="/alliance.png"
              alt="Alliance"
              fill
            />
          </div>
        </div>

        <div className="flex-auto text-sm leading-[16.94px] font-light flex items-center gap-x-2 text-dark-blue-400 md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5 xs:max-lg:hidden">
          Role
          <span className="font-bold">Admin</span>
        </div>

        <div className="flex-auto text-sm leading-[16.94px] font-light flex items-center gap-x-2 text-dark-blue-400 md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5 xs:max-lg:hidden">
          Status <span className="font-bold">Active</span>
        </div>

        <div className="flex lg:flex-auto justify-end items-center md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5">
          <IconButton
            className="text-gray-400 xs:max-lg:size-[30.45px]"
            visual="gray"
            variant="ghost"
          >
            <MessageSquare className="size-3.5 lg:size-4" />
          </IconButton>
          <IconButton
            className="text-gray-400 xs:max-lg:size-[30.45px]"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="size-[18.32px] lg:size-5" />
          </IconButton>
        </div>
      </div>

      <div className="flex items-end md:items-center justify-between lg:hidden">
        <div className="flex items-center gap-x-3">
          <div className="flex-auto text-[10px] leading-[12.1px] font-light flex items-center gap-x-1.5 text-dark-blue-400 md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5">
            Role
            <span className="font-bold">Admin</span>
          </div>

          <div className="flex-auto text-[10px] leading-[12.1px] font-light flex items-center gap-x-1.5 text-dark-blue-400 md:pl-3 md:py-3 md:last:pr-3 lg:pl-5 lg:py-5 lg:last:pr-5">
            Status <span className="font-bold">Active</span>
          </div>
        </div>

        <div className="h-[30.55px] w-[43.33px] shrink-0 relative">
          <NextImage
            className="object-contain"
            src="/alliance.png"
            alt="Alliance"
            fill
          />
        </div>
      </div>
    </div>
  )
}

const InviteWindowButton = () => {
  return (
    <InviteWindowTrigger asChild>
      <Button
        className="border-primary-500 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px] xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 text-primary-500 hover:text-white hover:bg-primary-500"
        variant="outlined"
        visual="gray"
        size="md"
      >
        <Plus className="size-[11.64px] lg:size-[15px]" /> Add Team Member
      </Button>
    </InviteWindowTrigger>
  )
}

const Dropdown = () => {
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
          <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
          <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function MyTeam() {
  const [value, setValue] = useState([GRID_LAYOUT])
  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 lg:gap-x-6">
          <Dropdown />

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

        <InviteWindowButton />
      </div>

      <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        My Team
      </h1>
      <Tabs className="mt-7 lg:mt-[19px]" defaultValue="Show All">
        <div className="border-b h-10 lg:h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3 lg:gap-x-3.5">
            <Button
              className="text-gray-500"
              variant="ghost"
              visual="gray"
              size="md"
            >
              <SearchMd className="size-[18px]" />
            </Button>

            <TabsList className="flex justify-start border-b-0 px-0">
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="Show All"
              >
                Show All
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="Internal Team"
              >
                Internal Team
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="Talent Network"
              >
                Talent Network
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="hidden items-center gap-x-6 self-start md:flex">
            <div className="flex items-center gap-x-3 lg:gap-x-3.5">
              <Dropdown />

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

            <InviteWindowButton />
          </div>
        </div>

        <TabsContent value="Show All">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
              <TalentSearchCard />
              <InternalTeamCard />
              <TalentSearchCard />
              <InternalTeamCard />
              <TalentSearchCard />
              <InternalTeamCard />
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              <InternalTeamCardLandscape />
              <TalentCardLandscape />
              <TalentCardLandscape />
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
              <TalentCardLandscape />
            </div>
          )}
        </TabsContent>
        <TabsContent value="Talent Network">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
              <TalentSearchCard />
              <TalentSearchCard />
              <TalentSearchCard />
              <TalentSearchCard />
              <TalentSearchCard />
              <TalentSearchCard />
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              <TalentCardLandscape />
              <TalentCardLandscape />
              <TalentCardLandscape />
              <TalentCardLandscape />
              <TalentCardLandscape />
              <TalentCardLandscape />
            </div>
          )}
        </TabsContent>
        <TabsContent value="Internal Team">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
              <InternalTeamCard />
              <InternalTeamCard />
              <InternalTeamCard />
              <InternalTeamCard />
              <InternalTeamCard />
              <InternalTeamCard />
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
              <InternalTeamCardLandscape />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
