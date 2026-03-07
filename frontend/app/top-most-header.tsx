"use client"

import React, { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { cn } from "@/utils/functions"
import {
  BarChart2,
  Bell,
  ChevronDown,
  CoinStack,
  LifeBuoy,
  LogOut,
  Monitor,
  Plus,
  Repeat,
  SearchMd,
  Settings,
  Star,
  Users,
  X,
} from "@blend-metrics/icons"
import { Campaigns, Logo3, Project, Talent } from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScaleOutIn,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"

const Notifications = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          className="rounded-full"
          size="md"
          variant="ghost"
          visual="gray"
        >
          <Bell className="size-[18px]" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[370px] bg-white border border-gray-100 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
        align="end"
      >
        <Tabs defaultValue="Notifications">
          <TabsList className="w-full">
            <TabsTrigger value="Notifications">
              Notifications
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                5
              </span>
            </TabsTrigger>
            <TabsTrigger value="Messages">
              Messages
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                2
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Notifications">
            <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
              <ScrollArea
                className="h-[328px]"
                scrollBar={<ScrollBar className="w-4 px-1" />}
              >
                <div className="px-2">
                  <article className="cursor-pointer hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </ScrollArea>
            </div>

            <div className="py-3.5 grid">
              <button className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium">
                View All
              </button>
            </div>
          </TabsContent>
          <TabsContent value="Messages">
            <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
              <ScrollArea
                className="h-[328px]"
                scrollBar={<ScrollBar className="w-4 px-1" />}
              >
                <div className="px-2">
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </ScrollArea>
            </div>
            <div className="py-3.5 grid">
              <button className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium">
                View All
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

const options = [
  {
    value: "$1,540",
    currencyCode: "USD",
  },
  {
    value: "$1,440",
    currencyCode: "USD",
  },
  {
    value: "$1,340",
    currencyCode: "USD",
  },
  {
    value: "$1,240",
    currencyCode: "USD",
  },
]

const [{ value: defaultValue }] = options

const fixedSuggestions = [
  {
    id: 1,
    icon: Talent,
    value: "Browse Talent",
  },
  {
    id: 2,
    icon: Project,
    value: "Browse Project",
  },
  {
    id: 3,
    icon: Campaigns,
    value: "Browse Campaigns",
  },
]

const suggestions = [
  { id: 1, value: "UX Architect" },
  { id: 2, value: "Bulma developer" },
  { id: 3, value: "React" },
  { id: 4, value: "Golang framework" },
  { id: 5, value: "Mobile applications" },
  { id: 6, value: "Magento development" },
]

interface Person {
  name: string
}

type People = Person[]

const people: People = [
  { name: "Wade Cooper" },
  { name: "Arlene Mccoy" },
  { name: "Devon Webb" },
  { name: "Tom Cook" },
  { name: "Tanya Fox" },
  { name: "Hellen Schmidt" },
  { name: "Hellen Walker" },
  { name: "Hellen Waller" },
]

const SearchBar = () => {
  const [state, setState] = useState<string>()
  const [selected, setSelected] = React.useState<{
    id: number
    value: string
    icon?: React.JSXElementConstructor<any>
  }>()
  const [query, setQuery] = React.useState("")

  const filteredSuggestions =
    query === ""
      ? suggestions
      : suggestions.filter((industry) =>
          industry.value
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const reset = () => setQuery("")

  return (
    <Combobox
      className="group/root w-auto flex-auto"
      value={selected}
      onChange={setSelected}
    >
      <ComboboxTrigger className="relative flex h-[34px] lg:h-10 rounded-[5px] items-center gap-x-3 border border-gray-300 ui-open:rounded-b-none py-[7px] lg:py-2 pl-2.5 pr-3 lg:px-3">
        <div className="flex items-center gap-x-2 flex-auto">
          <SearchMd className="size-4 shrink-0 text-gray-400" />
          <ComboboxInput
            placeholder="Search by skills or project type"
            className="p-0 border-0 text-xs leading-5 h-auto rounded-none hover:ring-0 hover:border-gray-300 focus:ring-0 focus:border-gray-300 ui-open:rounded-b-none"
            size="lg"
            displayValue={(value: {
              id: number
              value: string
              icon?: React.JSXElementConstructor<any>
            }) => value.value}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="w-px h-4 shrink-0 inline-block bg-gray-200" />
        <Listbox className="w-auto" value={state} onChange={setState}>
          <ListboxButton
            className="p-0 border-0 text-[11px] leading-[16.67px] lg:text-sm lg:leading-5 font-semibold gap-x-[6.67px] lg:gap-x-1.5 w-auto h-auto rounded-none hover:ring-0 focus:ring-0"
            placeholder="Category"
            iconClassName="size-[12.5px]"
          />
          <ListboxOptions className="w-max -right-3 left-auto mt-3.5">
            {people.map((person) => (
              <ListboxOption key={person.name} value={person.name}>
                {person.name}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </ComboboxTrigger>
      <ScaleOutIn afterLeave={reset}>
        <ComboboxOptions className="px-0 mt-0 space-y-0 border border-gray-300 border-t-0 rounded-t-none">
          <div className="p-3">
            {fixedSuggestions.map((fixedSuggestion) => (
              <ComboboxOption
                key={fixedSuggestion.id}
                value={fixedSuggestion}
                className="text-xs flex items-center gap-x-3 leading-[13.3px] text-gray-400"
              >
                <fixedSuggestion.icon className="size-5" />
                {fixedSuggestion.value}
              </ComboboxOption>
            ))}
          </div>

          <div className="space-y-1 p-3 border-t border-gray-100">
            <div className="px-3 flex items-center justify-between">
              <h1 className="text-[13px] leading-6 font-semibold text-dark-blue-400">
                Recent Searches
              </h1>

              <Button
                className="opacity-50 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Clear Search History
              </Button>
            </div>
            <ScrollArea viewportClassName="max-h-[360px]">
              {filteredSuggestions.map((suggestion) => (
                <ComboboxOption key={suggestion.id} value={suggestion}>
                  {suggestion.value}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </div>
        </ComboboxOptions>
      </ScaleOutIn>
    </Combobox>
  )
}

const PATHNAMES = ["/talent-dashboard", "/client-dashboard", "/talent-profile"]

const ONBOARDING = "/onboarding"

export const TopMostHeader = () => {
  const pathname = usePathname()

  const { logoutHandler, user } = useAuth()

  if (pathname.startsWith(ONBOARDING)) {
    return null
  }

  return (
    <div
      className={cn(
        "px-3.5 md:px-6 lg:px-[50px] relative bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5",
        PATHNAMES.includes(pathname) && "md:max-lg:pb-2.5 sticky top-0 z-50"
      )}
    >
      <div className="flex items-center justify-between md:gap-x-3 lg:gap-x-[50px] md:pt-2 md:pb-1 lg:py-3">
        <NextLink className="focus-visible:outline-none" href="/marketplace">
          <Logo3 className="h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]" />
        </NextLink>

        <div className="flex flex-auto gap-x-3 xs:max-lg:ml-3 xs:max-md:hidden">
          <SearchBar />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="gap-x-2 xs:max-lg:h-[34px] xs:max-lg:px-[12.6px] xs:max-lg:py-[7.2px] bg-white"
                visual="gray"
                variant="outlined"
                size="md"
              >
                <span className="inline-flex items-center gap-x-[7.2px] lg:gap-x-1 text-[12.6px] leading-5 lg:text-base lg:leading-6 font-light">
                  <span className="font-semibold">$ 1,540</span> USD
                </span>
                <ChevronDown className="text-gray-500 size-[13.5px] lg:size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[174px]">
              <DropdownMenuItem>
                <Plus className="size-4" /> Add Funds
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Repeat className="size-4" /> Transfer Funds
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <InviteWindowTrigger asChild>
              <IconButton
                className="rounded-full"
                size="md"
                variant="ghost"
                visual="gray"
              >
                <Plus className="size-[18px]" />
              </IconButton>
            </InviteWindowTrigger>
            <Notifications />
            <IconButton
              className="rounded-full lg:hidden"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <ThreeHorizontalLines className="text-dark-blue-400" />
            </IconButton>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="hidden lg:inline-flex items-center gap-x-2 px-3 py-1.5 rounded-[8px] hover:bg-gray-100 focus-visible:outline-none">
              <div className="inline-flex items-center gap-x-2">
                <Avatar>
                  <AvatarImage
                    src={
                      user?.avatarUrl
                        ? user?.avatarUrl?.startsWith("https://") ||
                          user?.avatarUrl?.startsWith("http://")
                          ? user?.avatarUrl
                          : `${process?.env?.NEXT_PUBLIC_API_URL}/${user?.avatarUrl}`
                        : ""
                    }
                    alt="Man"
                  />
                  <AvatarFallback>
                    {user?.firstName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-[15px] text-gray-700">
                    {user?.firstName || ""} {user?.lastName || ""}
                  </span>
                  <span className="text-[9px] leading-[14px] text-gray-500">
                    {user?.email}
                  </span>
                </div>
              </div>

              <ChevronDown className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[278px]">
              <DropdownMenuLabel className="font-normal" size="md">
                <div className="flex flex-col gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs leading-5 text-gray-700">
                      User ID: 2459749
                    </span>
                    <span className="text-[13px] leading-5 text-primary-500">
                      {user?.email}
                    </span>
                  </div>

                  <Button className="w-full">My Account</Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <Monitor className="size-4" />
                My Projects
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BarChart2 className="size-4" />
                My Campaigns
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Users className="size-4" />
                My Team
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="size-4" />
                My Favorites
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CoinStack className="size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-2 gap-x-[9px]">
                <DropdownMenuItem>
                  <LifeBuoy className="size-4" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutHandler()}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:hidden">
        <SearchBar />
      </div>
    </div>
  )
}
