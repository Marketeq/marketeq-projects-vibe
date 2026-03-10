"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { UserAPI } from "@/service/http/user"
import {
  addFavorite,
  findFavoriteByItemId,
  getAllFavorites,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { getFirstItem } from "@/utils/functions"
import {
  ArrowDown,
  ArrowUp,
  Edit03,
  MapPin,
  MoreHorizontal,
  Plus,
  SearchMd,
  Star,
  Trash2,
  User01,
} from "@blend-metrics/icons"
import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { InviteWindow, InviteWindowTrigger } from "@/components/invite-window"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { TalentSearchCard } from "@/components/talent-search-card"
import { cn } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  ScrollArea,
  ScrollBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

// ========================
// Data
// ========================

interface AccountMember {
  name: string
  email: string
  role: string
  avatarSrc?: string
  company: string
  status: "active" | "pending"
}

const ACCOUNT_MEMBERS: AccountMember[] = [
  {
    name: "Alicia Hebert",
    email: "jfriedl@me.com",
    role: "General Manager",
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    company: "Alliance Corp.",
    status: "active",
  },
  {
    name: "Kevin Zavala",
    email: "raines@live.com",
    role: "Legal Adviser",
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    company: "Alliance Corp.",
    status: "pending",
  },
  {
    name: "Paul Cannon",
    email: "rande@gmail.com",
    role: "Graphic Designer",
    avatarSrc: "https://randomuser.me/api/portraits/men/75.jpg",
    company: "Alliance Corp.",
    status: "active",
  },
  {
    name: "Elliot Spencer",
    email: "leviathan@yahoo.com",
    role: "Marketing Manager",
    avatarSrc: "https://randomuser.me/api/portraits/men/22.jpg",
    company: "Alliance Corp.",
    status: "active",
  },
  {
    name: "",
    email: "oevans@icloud.com",
    role: "",
    company: "",
    status: "pending",
  },
  {
    name: "Jenny Gill",
    email: "hmbrand@me.com",
    role: "Project Manager",
    avatarSrc: "https://randomuser.me/api/portraits/women/68.jpg",
    company: "Alliance Corp.",
    status: "active",
  },
  {
    name: "Andrew Roddick",
    email: "john.jacob@gmail.com",
    role: "Systems Analyst",
    avatarSrc: "https://randomuser.me/api/portraits/men/86.jpg",
    company: "Alliance Corp.",
    status: "active",
  },
]

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

// ========================
// Account Members Table (External Team list view)
// ========================

const accountColumnHelper = createColumnHelper<AccountMember>()

const accountColumns = [
  accountColumnHelper.accessor("name", {
    header: "Team Member",
    cell: (info) => {
      const row = info.row.original
      const isPending = row.status === "pending"
      return (
        <div className="inline-flex items-center gap-x-3">
          {isPending && !row.avatarSrc ? (
            <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User01 className="size-5 text-gray-400" />
            </div>
          ) : (
            <Avatar size="md">
              <AvatarImage src={row.avatarSrc || "/man.jpg"} alt={row.name} />
              <AvatarFallback>{row.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col">
            {row.name && (
              <span className="text-sm font-bold text-dark-blue-400">
                {row.name}
              </span>
            )}
            <span className="text-sm text-gray-500">{row.email}</span>
          </div>
        </div>
      )
    },
    enableMultiSort: true,
  }),
  accountColumnHelper.accessor("role", {
    header: "Role",
    cell: (info) => {
      const val = info.getValue()
      return val ? (
        <span className="text-sm text-dark-blue-400">{val}</span>
      ) : (
        <span className="text-sm text-gray-300">&mdash;</span>
      )
    },
  }),
  accountColumnHelper.accessor("company", {
    header: "Company",
    cell: (info) => {
      const val = info.getValue()
      return val ? (
        <Button className="text-sm p-0 h-auto" variant="link" visual="primary">
          {val}
        </Button>
      ) : (
        <span className="text-sm text-gray-300">&mdash;</span>
      )
    },
  }),
  accountColumnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const val = info.getValue()
      return val === "active" ? (
        <span className="text-sm font-medium text-success-500">Active</span>
      ) : (
        <span className="text-sm text-gray-400">Invitation pending</span>
      )
    },
  }),
  accountColumnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      const isPending = row.original.status === "pending"
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton className="text-gray-400" visual="gray" variant="ghost">
              <MoreHorizontal className="size-5" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[165px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            {isPending && (
              <DropdownMenuItem>
                <Plus className="h-4 w-4" /> Resend Invite
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash2 className="h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableSorting: false,
  }),
]

const AccountMembersTable = () => {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: ACCOUNT_MEMBERS,
    columns: accountColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className={
                  header.column.getCanSort()
                    ? "cursor-pointer select-none"
                    : ""
                }
                key={header.id}
                colSpan={header.colSpan}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="inline-flex items-center gap-x-1">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {header.column.getIsSorted() === "asc" && (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  {header.column.getIsSorted() === "desc" && (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ========================
// Talent Network Table (Talent Network list view)
// ========================

const talentColumnHelper = createColumnHelper<TalentMember>()

const talentColumns = [
  talentColumnHelper.accessor("name", {
    header: "Team Member",
    cell: (info) => {
      const row = info.row.original
      const profileHref = `/talent-profile?username=${row.username}`
      return (
        <div className="inline-flex items-center gap-x-3">
          <NextLink href={profileHref} className="shrink-0">
            <Avatar size="md" className="transition-transform duration-500 ease-out hover:scale-110">
              <AvatarImage src={row.avatarSrc} alt={row.name} />
              <AvatarFallback>{row.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </NextLink>
          <div className="flex flex-col">
            <div className="flex items-center gap-x-1.5">
              <NextLink href={profileHref} className="hover:underline">
                <span className="text-sm font-bold text-dark-blue-400">
                  {row.name}
                </span>
              </NextLink>
              <span className="text-xs text-gray-400">{row.handle}</span>
            </div>
            <span className="text-sm text-gray-500">{row.role}</span>
          </div>
        </div>
      )
    },
    enableMultiSort: true,
  }),
  talentColumnHelper.accessor("rating", {
    header: "Experience",
    cell: (info) => {
      const row = info.row.original
      return (
        <div className="flex items-center gap-x-2">
          <div className="inline-flex items-center bg-primary-500 gap-x-1 flex-none py-0.5 px-1.5 rounded">
            <Star className="size-3 shrink-0 fill-white text-white" />
            <span className="text-xs font-medium text-white">
              {info.getValue()}
            </span>
          </div>
          <span className="text-sm text-dark-blue-400">{row.experience}</span>
        </div>
      )
    },
  }),
  talentColumnHelper.accessor("country", {
    header: "Location",
    cell: (info) => {
      const row = info.row.original
      return (
        <div className="flex items-center gap-x-1.5">
          <MapPin className="size-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-dark-blue-400">{row.country}</span>
          <span className="text-xs text-gray-400">({row.localTime})</span>
        </div>
      )
    },
  }),
  talentColumnHelper.accessor("rate", {
    header: "Rate",
    cell: (info) => (
      <span className="text-sm font-semibold text-dark-blue-400">
        {info.getValue()}
        <span className="font-normal text-gray-400">/hr</span>
      </span>
    ),
  }),
  talentColumnHelper.display({
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton className="text-gray-400" visual="gray" variant="ghost">
            <MoreHorizontal className="size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[165px]">
          <NextLink href={`/talent-profile?username=${row.original.username}`}>
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" /> View Profile
            </DropdownMenuItem>
          </NextLink>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash2 className="h-4 w-4" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
  }),
]

const TalentNetworkTable = ({ data }: { data: TalentMember[] }) => {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns: talentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className={
                  header.column.getCanSort()
                    ? "cursor-pointer select-none"
                    : ""
                }
                key={header.id}
                colSpan={header.colSpan}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="inline-flex items-center gap-x-1">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {header.column.getIsSorted() === "asc" && (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  {header.column.getIsSorted() === "desc" && (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ========================
// External Team Card (Grid view)
// ========================

const ExternalTeamCard = ({
  name,
  email,
  role,
  avatarSrc,
  company,
  status,
}: AccountMember) => {
  const isPending = status === "pending"

  return (
    <article className="relative grid rounded-lg p-5 lg:py-[35px] lg:px-[30px] bg-white border border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
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
          {isPending && (
            <DropdownMenuItem>
              <Plus className="h-4 w-4" /> Resend Invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash2 className="h-4 w-4" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center justify-center mt-2">
        {isPending && !avatarSrc ? (
          <div className="size-[62px] lg:size-[116px] rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
            <User01 className="size-6 lg:size-10 text-gray-300" />
          </div>
        ) : (
          <Avatar className="size-[62px] lg:size-[116px]" size="2xl">
            <AvatarImage src={avatarSrc || "/man.jpg"} alt={name} />
            <AvatarFallback>{name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {isPending && !name ? (
        <>
          <p className="text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-3 lg:mt-[17px]">
            {email}
          </p>
          <p className="text-[10px] leading-[12.1px] lg:text-xs text-center font-medium lg:leading-[14.52px] text-gray-400 mt-1.5">
            Invitation pending
          </p>
        </>
      ) : (
        <>
          <h2 className="text-[13px] leading-[15.73px] lg:text-base text-center lg:leading-[19.36px] font-bold text-[#122A4B] mt-3 lg:mt-[17px]">
            {name}
          </h2>
          <p className="text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-1">
            {role}
          </p>
          {company && (
            <div className="flex items-center justify-center mt-3 lg:mt-[17px]">
              <Button
                className="xs:max-lg:text-[10px] xs:max-lg:leading-4"
                variant="link"
                visual="primary"
              >
                {company}
              </Button>
            </div>
          )}
        </>
      )}

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

// ========================
// Shared Controls
// ========================

const InviteWindowButton = () => (
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

const SortDropdown = () => (
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
        <DropdownMenuCheckItem>Name A-Z</DropdownMenuCheckItem>
        <DropdownMenuCheckItem>Name Z-A</DropdownMenuCheckItem>
        <DropdownMenuCheckItem>Newest First</DropdownMenuCheckItem>
        <DropdownMenuCheckItem>Oldest First</DropdownMenuCheckItem>
      </ScrollArea>
    </DropdownMenuContent>
  </DropdownMenu>
)

// ========================
// Page
// ========================

// Common female first names for gender inference
const FEMALE_NAMES = new Set([
  "mary","patricia","jennifer","linda","barbara","elizabeth","susan","jessica",
  "sarah","karen","lisa","nancy","betty","margaret","sandra","ashley","dorothy",
  "kimberly","emily","donna","michelle","carol","amanda","melissa","deborah",
  "stephanie","rebecca","sharon","laura","cynthia","kathleen","amy","angela",
  "shirley","anna","brenda","pamela","emma","nicole","helen","samantha",
  "katherine","christine","debra","rachel","carolyn","janet","catherine",
  "maria","heather","diane","ruth","julie","olivia","joyce","virginia",
  "victoria","kelly","lauren","christina","joan","evelyn","judith","megan",
  "andrea","cheryl","hannah","jacqueline","martha","gloria","teresa","ann",
  "sara","madison","frances","kathryn","janice","jean","abigail","alice",
  "judy","sophia","grace","denise","amber","doris","marilyn","danielle",
  "beverly","isabella","theresa","diana","natalie","brittany","charlotte",
  "marie","kayla","alexis","lori","alicia","jenny","nadia","priya","aisha",
  "fatima","mei","yuki","sofia","elena","rosa","carmen","lucia","nina",
  "tanya","svetlana","ingrid","bianca","valentina","ngozi","amara","zara",
])

function inferGender(firstName: string): "women" | "men" {
  return FEMALE_NAMES.has(firstName.toLowerCase()) ? "women" : "men"
}

function mapUserToTalent(u: any, index: number): TalentMember {
  const firstName = u.firstName ?? ""
  const lastName = u.lastName ?? ""
  const name = `${firstName} ${lastName}`.trim() || u.username || "Unknown"
  const rateMin = u.rateMin ? `$${Math.round(Number(u.rateMin))}` : "$50"
  const rateMax = u.rateMax ? `$${Math.round(Number(u.rateMax))}` : "$100"

  // Calculate years of experience from work history
  let yearsExp = 3
  if (u.experience?.length) {
    const earliest = u.experience.reduce((min: string, e: any) => {
      const d = e.startDate ?? e.start_date
      return d && d < min ? d : min
    }, new Date().toISOString())
    yearsExp = Math.max(1, Math.round(
      (Date.now() - new Date(earliest).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    ))
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
    handle: u.username ? `@${u.username}` : "",
    role: u.role ?? u.industry ?? "Freelancer",
    avatarSrc: u.avatarUrl || fallbackAvatar,
    rating: 4.0 + Math.round(Math.random() * 10) / 10,
    experience: `${yearsExp} years of experience`,
    country: u.location ?? "United States",
    localTime: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " local time",
    rate: `${rateMin} - ${rateMax}`,
    skills,
  }
}

export default function MyTeam() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const isGrid = getFirstItem(value) === GRID_LAYOUT
  const [talentMembers, setTalentMembers] = useState<TalentMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
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
      const itemIds = new Set(favorites.map((f) => f.itemId))
      setFavoritedItems(itemIds)
    }
    loadFavorites()
  }, [])

  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 lg:gap-x-6">
          <SortDropdown />
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

      <Tabs className="mt-7 lg:mt-[19px]" defaultValue="Talent Network">
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
                value="Talent Network"
              >
                Talent Network
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-lg:text-xs xs:max-lg:leading-5"
                value="External Team"
              >
                External Team
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="hidden items-center gap-x-6 self-start md:flex">
            <div className="flex items-center gap-x-3 lg:gap-x-3.5">
              <SortDropdown />
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

        {/* Talent Network Tab */}
        <TabsContent value="Talent Network">
          {isLoading ? (
            isGrid ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden"
                  >
                    <div className="relative h-[140px] bg-gray-100 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="relative h-4 w-20 rounded bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                        <div className="relative h-4 w-12 rounded bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative h-4 w-32 rounded bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                        <div className="relative h-3 w-24 rounded bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                      </div>
                      <div className="relative h-3 w-28 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-3 w-20 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <div className="relative h-5 w-14 rounded-full bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                        <div className="relative h-5 w-16 rounded-full bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                        <div className="relative h-5 w-12 rounded-full bg-gray-100 overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pt-3.5 lg:pt-6">
                <div className="rounded-lg border border-gray-200 bg-white shadow-xs p-4 space-y-4">
                  <div className="relative h-8 w-full rounded bg-gray-100 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                  </div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-x-4">
                      <div className="relative size-10 rounded-full bg-gray-100 shrink-0 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-4 w-32 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-4 w-24 rounded bg-gray-100 ml-auto overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-4 w-20 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                      <div className="relative h-4 w-16 rounded bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : isGrid ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
              {talentMembers.map((member) => (
                <TalentSearchCard
                  key={member.id}
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
                  profileHref={`/talent-profile?username=${member.username}`}
                  isFavorited={favoritedItems.has(String(member.id))}
                  onFavoriteChange={(favorited) => {
                    setFavoritedItems((prev) => {
                      const next = new Set(prev)
                      if (favorited) {
                        next.add(String(member.id))
                      } else {
                        next.delete(String(member.id))
                      }
                      return next
                    })
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="pt-3.5 lg:pt-6">
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
                <TalentNetworkTable data={talentMembers} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* External Team Tab */}
        <TabsContent value="External Team">
          {isGrid ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6">
              {ACCOUNT_MEMBERS.map((member) => (
                <ExternalTeamCard key={member.email} {...member} />
              ))}
            </div>
          ) : (
            <div className="pt-3.5 lg:pt-6">
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
                <AccountMembersTable />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InviteWindow />
    </div>
  )
}
