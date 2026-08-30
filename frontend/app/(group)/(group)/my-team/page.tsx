"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import type { TalentNetworkStatus } from "@/service/http/contracts"
import { UserAPI } from "@/service/http/user"
import {
  useCompanyMemberPermissions,
  useMyCompanies,
  useUpdateCompanyMember,
} from "@/src/hooks/useCompanies"
import {
  useCancelInvitation,
  useInvitations,
  useResendInvitation,
} from "@/src/hooks/useInvitations"
import { useTalentNetwork } from "@/src/hooks/useTeamNetwork"
import {
  addFavorite,
  findFavoriteByItemId,
  getAllFavorites,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { capitalizeWords, getFirstItem } from "@/utils/functions"
import { cn } from "@/utils/functions"
import {
  ArrowDown,
  ArrowUp,
  Edit03,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw04,
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
import type { Company } from "@/types/company"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { InviteAcceptedNotification } from "@/components/invite-sent-notification"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import {
  SelectPermissionsPanel,
  formatPermissionRolesLabel,
  getPermissionRoleName,
} from "@/components/select-permissions-panel"
import { talentToCardProps } from "@/src/lib/api/talent-users"
import { TalentNetworkStatusCard } from "@/components/talent-network-status-card"
import { useToast } from "@/components/ui"
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
  ToastAction,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

/**
 * Confirmation toast styling, straight off the Figma "Alert" component
 * (13363:45078-45080): 52px tall, 16/18/16/16 padding, 12px between every
 * child, Undo in Inter 600 12/20 underlined success-500.
 *
 * These live here rather than in the shared Toaster because the toast
 * primitives are Storybook-owned and read-only. The `!` overrides beat
 * ToastAction's h-8/text-sm/font-medium base, and `-ml-1` trims the
 * Toaster's 16px action gap back to the spec's 12px. The 20px-tall action
 * is what keeps the whole toast at 52px instead of 64px.
 */
const CONFIRMATION_TOAST_CLASS = "pr-[18px]"
const CONFIRMATION_TOAST_UNDO_CLASS =
  "-ml-1 !flex !h-5 border-0 bg-transparent px-0 !text-xs !font-semibold !leading-5 text-success-500 underline hover:no-underline focus:outline-none"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

// ========================
// Data
// ========================

interface AccountMember {
  id: string
  name: string
  email: string
  role: string
  /** Granular permission-role ids (select-permissions-panel.tsx). */
  permissions: string[]
  avatarSrc?: string
  company: string
  /** Company's uploaded logo (companies.logo_url). Absent when none is set. */
  companyLogoUrl?: string
  status: "active" | "pending"
  /** Set for accepted members with a company, and needed to edit permissions. */
  userId?: string
  companyId?: string
}

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
  /** Bucket from contracts-service. Drives the Status column and badge. */
  status: TalentNetworkStatus
}

// ========================
// Account Members Table (External Team list view)
// ========================

const accountColumnHelper = createColumnHelper<AccountMember>()

function buildAccountColumns(
  onResend: (id: string) => void,
  onCancel: (id: string) => void,
  onEdit: (member: AccountMember) => void
) {
  return [
    accountColumnHelper.accessor("name", {
      header: "Team Member",
      cell: (info) => {
        const row = info.row.original
        return (
          <div className="inline-flex items-center gap-x-3">
            {/* Show the member's own photo when one is set; when it is not,
                fall back to the empty profile circle, never a name initial. */}
            <Avatar
              size="md"
              className="h-10 w-10"
              containerClassName="shrink-0"
            >
              <AvatarImage src={row.avatarSrc} alt={row.name || row.email} />
              <AvatarFallback className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-50" />
            </Avatar>
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
        const { role, permissions } = info.row.original
        // permissions (Select Permissions) are the only per-invitee access
        // control now. The legacy `role` is a vestigial always-"viewer"
        // field, so it must never win over an actual permission selection.
        const label =
          permissions.length > 0
            ? formatPermissionRolesLabel(permissions)
            : role
        return label ? (
          <span className="text-sm text-dark-blue-400">{label}</span>
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
          <Button
            className="text-sm p-0 h-auto"
            variant="link"
            visual="primary"
          >
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
        // Editing permissions requires a company_users row to write back to,
        // and only accepted members tied to a company have one.
        const canEdit =
          !isPending && !!row.original.userId && !!row.original.companyId
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                className="text-gray-400"
                visual="gray"
                variant="ghost"
              >
                <MoreHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[165px]">
              {canEdit && (
                <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                  <Edit03 className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {isPending && (
                <DropdownMenuItem onSelect={() => onResend(row.original.id)}>
                  <RefreshCw04 className="h-4 w-4" /> Resend Invite
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                visual="destructive"
                onSelect={() => onCancel(row.original.id)}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    }),
  ]
}

const AccountMembersTable = ({
  data,
  onResend,
  onCancel,
  onEdit,
}: {
  data: AccountMember[]
  onResend: (id: string) => void
  onCancel: (id: string) => void
  onEdit: (member: AccountMember) => void
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = React.useMemo(
    () => buildAccountColumns(onResend, onCancel, onEdit),
    [onResend, onCancel, onEdit]
  )

  const table = useReactTable({
    data,
    columns,
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
                  header.column.getCanSort() ? "cursor-pointer select-none" : ""
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
            <Avatar
              size="md"
              className="transition-transform duration-500 ease-out hover:scale-110"
            >
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
            <span className="text-sm capitalize text-gray-500">{row.role}</span>
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
                  header.column.getCanSort() ? "cursor-pointer select-none" : ""
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

// Breathing room the role names must keep from the card's own padding
// before collapsing to "N roles". Mirrors MIN_ROLES_GAP_PX on the invite
// "added" screen (frontend/app/invite/setup/page.tsx).
const ROLE_LABEL_EDGE_PADDING_PX = 24

const CASCADE_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
]

const cascadeDelay = (index: number) =>
  CASCADE_DELAYS[Math.min(index, CASCADE_DELAYS.length - 1)]

const ExternalTeamCard = ({
  id,
  name,
  email,
  role,
  permissions,
  avatarSrc,
  company,
  companyLogoUrl,
  status,
  userId,
  companyId,
  onResend,
  onCancel,
  onEdit,
}: AccountMember & {
  onResend: (id: string) => void
  onCancel: (id: string) => void
  onEdit: (member: AccountMember) => void
}) => {
  const isPending = status === "pending"
  const canEdit = !isPending && !!userId && !!companyId

  // The card always presents the member's name and company title-cased,
  // whatever casing they were typed/stored in. Display only, since the values
  // handed back to onEdit stay exactly as they came from the API.
  const displayName = capitalizeWords(name)
  const displayCompany = capitalizeWords(company)

  // Measured collapse: show every role name in full ("Negotiator, Hiring
  // Manager") as long as it fits on one line without crowding the card's
  // padding; below ROLE_LABEL_EDGE_PADDING_PX of clearance on either side,
  // the "N roles" summary + tooltip takes over.
  const roleNames = useMemo(
    () => permissions.map(getPermissionRoleName),
    [permissions]
  )
  const rolesInline = roleNames.join(", ")
  const roleRowRef = useRef<HTMLParagraphElement>(null)
  const roleMeasureRef = useRef<HTMLSpanElement>(null)
  const [areRolesCollapsed, setAreRolesCollapsed] = useState(false)

  useEffect(() => {
    // One role always renders in full. There is nothing to collapse it to.
    if (roleNames.length < 2) {
      setAreRolesCollapsed(false)
      return
    }

    const row = roleRowRef.current
    const measurer = roleMeasureRef.current
    if (!row || !measurer) return

    const measure = () => {
      const availableWidth = row.clientWidth - ROLE_LABEL_EDGE_PADDING_PX * 2
      setAreRolesCollapsed(
        measurer.getBoundingClientRect().width > availableWidth
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [roleNames, rolesInline])

  return (
    <article className="relative flex flex-1 flex-col rounded-lg p-5 lg:py-[35px] lg:px-[30px] bg-white border border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
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
        <DropdownMenuContent align="start" className="w-[165px]">
          {canEdit && (
            <DropdownMenuItem
              onSelect={() =>
                onEdit({
                  id,
                  name,
                  email,
                  role,
                  permissions,
                  avatarSrc,
                  company,
                  companyLogoUrl,
                  status,
                  userId,
                  companyId,
                })
              }
            >
              Edit Permissions
            </DropdownMenuItem>
          )}
          <DropdownMenuItem>View Profile</DropdownMenuItem>
          {/* Invite-specific actions only apply while the invitation is pending. */}
          {isPending && (
            <>
              <DropdownMenuItem onSelect={() => onResend(id)}>
                Resend Invite
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCancel(id)}>
                Cancel Invite
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem visual="destructive" onSelect={() => onCancel(id)}>
            Remove User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center justify-center mt-2">
        {/* The member's own photo when one is set; otherwise the empty dashed
            profile circle from the design, never a name initial. */}
        <Avatar
          size="3xl"
          className="h-[62px] w-[62px] lg:h-[116px] lg:w-[116px] hover:ring-0 active:ring-0"
        >
          <AvatarImage src={avatarSrc} alt={displayName || email} />
          <AvatarFallback className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-50" />
        </Avatar>
      </div>

      {isPending ? (
        <>
          <p className="text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-3 lg:mt-[17px]">
            {email}
          </p>
          {/* Same height as the accepted card's logo slot so both cards line
              up in the grid; the badge sits at the top of it. */}
          <div className="lg:h-[90px] h-[63px] flex items-start justify-center self-stretch mt-3 lg:mt-[25px]">
            <Badge visual="gray" size="sm" variant="rounded">
              Invitation pending
            </Badge>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-[13px] leading-[15.73px] lg:text-base text-center lg:leading-[19.36px] font-bold text-[#122A4B] mt-3 lg:mt-[17px]">
            {displayName}
          </h2>
          <p
            ref={roleRowRef}
            className="relative text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-1"
          >
            {/* Off-layout copy of the full inline label, kept at the same
                type styles purely so the effect above can measure the width
                it *would* take before deciding whether it fits. */}
            <span
              ref={roleMeasureRef}
              aria-hidden
              className="pointer-events-none invisible absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap"
            >
              {rolesInline}
            </span>

            {/* permissions (Select Permissions) are the only per-invitee
                access control now. The legacy `role` is a vestigial
                always-"viewer" field, so it must never win over an actual
                permission selection. */}
            {permissions.length < 2 ? (
              permissions.length === 1 ? (
                roleNames[0]
              ) : (
                role || "Team Member"
              )
            ) : areRolesCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    className="cursor-default whitespace-nowrap focus-visible:outline-none"
                  >
                    {formatPermissionRolesLabel(permissions)}
                  </TooltipTrigger>
                  <TooltipContent
                    visual="white"
                    size="md"
                    side="bottom"
                    className="flex flex-col gap-y-1 font-semibold shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                  >
                    {roleNames.map((roleName) => (
                      <span key={roleName}>{roleName}</span>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="whitespace-nowrap">{rolesInline}</span>
            )}
          </p>
          {company && (
            <div className="flex items-center justify-center mt-3 lg:mt-[17px]">
              <Button
                className="h-5 p-0 text-[10px] leading-4 font-semibold lg:text-xs lg:leading-5"
                variant="link"
                visual="primary"
              >
                {displayCompany}
              </Button>
            </div>
          )}
          {/* The company this member was invited under. The slot keeps its
              height whether or not a logo exists, so cards stay aligned in
              the grid, the same reason the pending card reserves it too.

              A plain <img> rather than next/image: the logo lives on whatever
              R2 public host or custom domain the deployment configures, and
              next/image would need every one of those in next.config.js
              remotePatterns or it throws at runtime. CompanyAvatar in
              components/company-fields.tsx renders company logos the same way
              for the same reason. */}
          <div className="lg:h-[90px] h-[63px] relative w-full mt-auto pt-3 lg:pt-[25px]">
            {companyLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="absolute inset-0 size-full object-contain"
                src={companyLogoUrl}
                alt={company || "Company logo"}
              />
            )}
          </div>
        </>
      )}
    </article>
  )
}

// ========================
// Shared Controls
// ========================

const InviteWindowButton = () => (
  <InviteWindowTrigger asChild>
    <Button
      className="bg-white w-[170px] h-10 px-[14px] py-2 gap-2 text-[13px] leading-6 capitalize border-2 border-primary-500 text-primary-500 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-primary-500 hover:text-white xs:max-lg:w-auto xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px]"
      variant="outlined"
      visual="gray"
      size="md"
    >
      <Plus className="size-[11.64px] lg:size-[15px] [&_path]:stroke-[1.25]" />{" "}
      Add Team Member
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

// Talent cards come from the master mapper in src/lib/api/talent-users.ts, so
// this page renders the same first-name-only names, non-blank handles and
// profile-resolved job titles as every other talent surface. The page-local
// duplicate this replaced also invented avatars and randomised ratings.
function mapUserToTalent(
  u: any,
  index: number,
  status: TalentNetworkStatus
): TalentMember {
  const card = talentToCardProps(u, index)

  // The master mapper hardcodes a placeholder experience string. Where the
  // profile actually carries work history, derive the real figure instead.
  let experience = card.experience
  if (u.experience?.length) {
    const earliest = u.experience.reduce((min: string, e: any) => {
      const d = e.startDate ?? e.start_date
      return d && d < min ? d : min
    }, new Date().toISOString())
    const yearsExp = Math.max(
      1,
      Math.round(
        (Date.now() - new Date(earliest).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    )
    experience = `${yearsExp} years of experience`
  }

  return {
    id: card.id,
    username: card.username,
    name: card.name,
    handle: card.handle,
    role: card.role,
    avatarSrc: card.photo,
    rating: card.rating,
    experience,
    country: card.country,
    localTime: card.localTime,
    rate: card.rate,
    skills: card.skills,
    status,
  }
}

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

export default function MyTeam() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState([GRID_LAYOUT])
  const isGrid = getFirstItem(value) === GRID_LAYOUT
  const [talentMembers, setTalentMembers] = useState<TalentMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set())

  // Set by app/invite/setup/page.tsx's "Go to Dashboard" click, right after
  // the invite is actually accepted. Landing here, rather than on a dedicated
  // success screen, is the confirmation moment, so the notification shows
  // once on arrival and the query flag is stripped so a refresh doesn't
  // repeat it.
  const [acceptedInviteCompany, setAcceptedInviteCompany] = useState<
    string | null
  >(null)
  const [showAcceptedNotice, setShowAcceptedNotice] = useState(false)
  useEffect(() => {
    if (searchParams.get("inviteAccepted") !== "1") return

    setAcceptedInviteCompany(searchParams.get("company"))
    setShowAcceptedNotice(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete("inviteAccepted")
    params.delete("company")
    const query = params.toString()
    router.replace(query ? `/my-team?${query}` : "/my-team", { scroll: false })
    // Only ever fires once per navigation into this page, deliberately not
    // re-run on every searchParams change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const teamId = (user as any)?.id || (user as any)?.sub
  const signedInEmailRaw = (user as any)?.email
  const signedInEmail =
    typeof signedInEmailRaw === "string"
      ? signedInEmailRaw.trim().toLowerCase()
      : undefined

  // Inviter-side records and invitee-side accepted membership, fetched in
  // parallel via react-query. This replaces the previous manual
  // Promise.allSettled + useEffect. Mutations below invalidate all three
  // automatically (useResendInvitation/useCancelInvitation share the
  // "invitations","list" key prefix), which is also what makes the
  // previously-dead `refresh-pending-invites` window event unnecessary.
  const pendingQuery = useInvitations(
    teamId ? { teamId, status: "pending" } : undefined
  )
  const acceptedQuery = useInvitations(
    teamId ? { teamId, status: "accepted" } : undefined
  )
  const inviteeQuery = useInvitations(
    signedInEmail ? { invitedEmail: signedInEmail } : undefined
  )
  const teamLoading =
    pendingQuery.isLoading || acceptedQuery.isLoading || inviteeQuery.isLoading

  // Resolves company_id -> display name for the "Company" column/label.
  // Invitations only carry teamName for the legacy, company-less path
  // (@/lib/company-directory predates this), so a company-linked
  // invitation with no teamName previously always fell back to the
  // generic "Client Team" label even when the real name was one query
  // away. useMyCompanies() covers both directions: the inviter's own
  // companies, and (for an invitee viewing their own accepted invites)
  // the companies they were just added to.
  // Same lookup also feeds the card's company logo, so it maps to the whole
  // company row rather than just its name.
  const { data: myCompanies } = useMyCompanies()
  const companyById = useMemo(() => {
    const map = new Map<string, Company>()
    for (const company of myCompanies ?? []) map.set(company.id, company)
    return map
  }, [myCompanies])

  // Permissions are edited on the company_users row (PATCH
  // /v1/companies/:id/members/:userId), but the roster is built from
  // invitations, whose permissions column only ever holds the invite-time
  // snapshot. Overlaying the live membership is what makes an applied edit
  // visible: the mutation invalidates these exact keys, and a reload reads
  // the same source rather than falling back to the stale invite.
  //
  // Scoped to every company on the roster rather than one "current" company:
  // the roster mixes invitations from all of them, and picking a single one
  // would leave the rest stale and invalidate a query nobody is watching.
  // Restricted to companies the caller belongs to, because the members
  // endpoint is membership-gated and anything else 403s.
  const rosterCompanyIds = useMemo(() => {
    const ids = new Set<string>()
    for (const inv of [
      ...(acceptedQuery.data?.data ?? []),
      ...(inviteeQuery.data?.data ?? []),
    ]) {
      if (inv.companyId && companyById.has(inv.companyId)) ids.add(inv.companyId)
    }
    // Sorted so the useQueries list stays order-stable across renders.
    return Array.from(ids).sort()
  }, [acceptedQuery.data, inviteeQuery.data, companyById])

  const livePermissions = useCompanyMemberPermissions(rosterCompanyIds)

  const teamMembers = useMemo(() => {
    const pending = pendingQuery.data?.data ?? []
    const acceptedForTeam = acceptedQuery.data?.data ?? []
    const inviteeAll = inviteeQuery.data?.data ?? []
    const normalizeStatus = (status: unknown) =>
      typeof status === "string" ? status.trim().toLowerCase() : ""
    const acceptedForInvitee = inviteeAll.filter(
      (inv) => normalizeStatus(inv?.status) === "accepted"
    )
    const pendingForInvitee = inviteeAll.filter(
      (inv) => normalizeStatus(inv?.status) === "pending"
    )

    const toMember = (
      inv: (typeof pending)[number],
      status: "pending" | "active"
    ): AccountMember => {
      // Members without an uploaded photo are left with no avatarSrc on
      // purpose. The card and list rows render the empty profile circle
      // rather than a generated initials image.
      const displayName =
        status === "pending"
          ? ""
          : (inv.inviteeName ?? inv.invitedEmail ?? inv.email ?? "")

      return {
        id: inv.id,
        name: displayName,
        email: inv.invitedEmail ?? inv.email ?? "",
        role: inv.role ?? "",
        // Live membership wins over the invite-time snapshot for accepted
        // members; pending invitees have no company_users row yet, so they
        // keep the permissions the invite was sent with.
        permissions:
          (status === "active" && inv.companyId && inv.inviteeUserId
            ? livePermissions.get(`${inv.companyId}:${inv.inviteeUserId}`)
            : undefined) ??
          inv.permissions ??
          [],
        avatarSrc: inv.avatarUrl ?? undefined,
        // Never show internal UUIDs in UI labels; use a readable fallback.
        company:
          (inv.companyId && companyById.get(inv.companyId)?.name) ||
          inv.teamName ||
          "Client Team",
        companyLogoUrl: inv.companyId
          ? companyById.get(inv.companyId)?.logoUrl
          : undefined,
        status,
        userId: status === "active" ? inv.inviteeUserId : undefined,
        companyId: inv.companyId,
      }
    }

    const acceptedCombined = [...acceptedForTeam, ...acceptedForInvitee]
    const pendingCombined = [...pending, ...pendingForInvitee]
    const liveMembers = [
      ...acceptedCombined.map((inv) => toMember(inv, "active")),
      ...pendingCombined.map((inv) => toMember(inv, "pending")),
    ]

    return Array.from(
      new Map(
        liveMembers.map((member) => [
          member.email.toLowerCase() || member.id,
          member,
        ])
      ).values()
    )
  }, [
    pendingQuery.data,
    acceptedQuery.data,
    inviteeQuery.data,
    companyById,
    livePermissions,
  ])

  const resendInvitation = useResendInvitation()
  const cancelInvitation = useCancelInvitation()

  const handleResend = async (id: string) => {
    try {
      await resendInvitation.mutateAsync(id)
      toast({
        title: "Your invitation has been resent",
        variant: "success",
        className: CONFIRMATION_TOAST_CLASS,
        action: (
          <ToastAction altText="Undo" className={CONFIRMATION_TOAST_UNDO_CLASS}>
            Undo
          </ToastAction>
        ),
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: err?.response?.data?.message ?? "Please try again.",
      })
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id)
      toast({
        title: "Your invitation has been canceled",
        variant: "success",
        className: CONFIRMATION_TOAST_CLASS,
        action: (
          <ToastAction altText="Undo" className={CONFIRMATION_TOAST_UNDO_CLASS}>
            Undo
          </ToastAction>
        ),
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to remove",
        description: err?.response?.data?.message ?? "Please try again.",
      })
    }
  }

  // Edit Permissions opens for accepted members tied to a company, and writes
  // back to the company_users row via useUpdateCompanyMember.
  const [editingMember, setEditingMember] = useState<AccountMember | null>(null)
  const updateCompanyMember = useUpdateCompanyMember(
    editingMember?.companyId ?? ""
  )

  // Talent Network comes straight from contracts-service, which buckets the
  // client's hires into active/pending/past per the Final Logic doc. All
  // three render in this tab; only active counts toward the team number.
  const { data: talentNetwork, isLoading: hiredLoading } =
    useTalentNetwork(teamId)

  const networkEntries = useMemo(() => {
    if (!talentNetwork) return []
    return [
      ...talentNetwork.active,
      ...talentNetwork.pending,
      ...talentNetwork.past,
    ]
  }, [talentNetwork])

  useEffect(() => {
    if (hiredLoading) {
      setIsLoading(true)
      return
    }

    if (networkEntries.length === 0) {
      setTalentMembers([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    // Contracts carry only talentId, so each card's name/avatar/skills needs
    // the profile. allSettled keeps one failed lookup from emptying the tab.
    Promise.allSettled(
      networkEntries.map((entry) => UserAPI.getProfile(entry.talentId))
    )
      .then((results) => {
        if (cancelled) return

        const statusByTalentId = new Map(
          networkEntries.map((entry) => [entry.talentId, entry.status])
        )
        const profiles = results
          .filter(
            (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"
          )
          .map((r) => r.value?.data)
          .filter(Boolean)

        setTalentMembers(
          profiles.map((u, i) =>
            mapUserToTalent(u, i, statusByTalentId.get(u.id) ?? "active")
          )
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [networkEntries, hiredLoading])

  useEffect(() => {
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
          ) : talentMembers.length === 0 ? (
            <EmptyState
              icon={User01}
              title="Your talent network is empty"
              description="Discover and favorite talent to build your network. Saved talent will appear here for easy access on future projects."
              action={
                <NextLink href="/talent">
                  <Button variant="outlined" visual="gray">
                    <SearchMd className="size-[15px]" />
                    Browse Talent
                  </Button>
                </NextLink>
              }
            />
          ) : isGrid ? (
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6"
              key={talentMembers.map((member) => member.id).join(",")}
            >
              {talentMembers.map((member, index) => (
                <div
                  key={member.id}
                  className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(
                    index
                  )}`}
                >
                <TalentNetworkStatusCard
                  id={member.id}
                  name={member.name}
                  handle={member.handle}
                  role={member.role}
                  photo={member.avatarSrc}
                  imageLoading={index < 2 ? "eager" : "lazy"}
                  rate={member.rate}
                  experience={member.experience}
                  country={member.country}
                  localTime={member.localTime}
                  rating={member.rating}
                  skills={member.skills}
                  profileHref={`/talent-profile?username=${member.username}`}
                  status={member.status}
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
                </div>
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
          {teamLoading ? (
            <div className="pt-3.5 lg:pt-6">
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
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
                  </div>
                ))}
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <EmptyState
              icon={User01}
              title="No external team members yet"
              description="Invite colleagues, collaborators, or clients to join your external team. They'll get access to shared projects and workspaces."
              action={
                <InviteWindowTrigger asChild>
                  <Button variant="outlined" visual="gray">
                    <Plus className="size-[15px]" />
                    Invite a Member
                  </Button>
                </InviteWindowTrigger>
              }
            />
          ) : isGrid ? (
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 pt-3.5 lg:pt-6"
              key={teamMembers.map((member) => member.id).join(",")}
            >
              {teamMembers.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex h-full animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(
                    index
                  )}`}
                >
                  <ExternalTeamCard
                    {...member}
                    onResend={handleResend}
                    onCancel={handleCancel}
                    onEdit={setEditingMember}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-3.5 lg:pt-6">
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
                <AccountMembersTable
                  data={teamMembers}
                  onResend={handleResend}
                  onCancel={handleCancel}
                  onEdit={setEditingMember}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingMember && (
        <SelectPermissionsPanel
          open={!!editingMember}
          title="Edit Permissions"
          value={editingMember.permissions}
          onApply={(roleIds) => {
            if (editingMember.userId) {
              updateCompanyMember.mutate(
                { userId: editingMember.userId, dto: { permissions: roleIds } },
                {
                  onSuccess: () =>
                    toast({
                      title: "User permissions have been updated",
                      variant: "success",
                      className: CONFIRMATION_TOAST_CLASS,
                      action: (
                        <ToastAction
                          altText="Undo"
                          className={CONFIRMATION_TOAST_UNDO_CLASS}
                        >
                          Undo
                        </ToastAction>
                      ),
                    }),
                  onError: (err: any) =>
                    toast({
                      variant: "destructive",
                      title: "Failed to update permissions",
                      description:
                        err?.response?.data?.message ?? "Please try again.",
                    }),
                }
              )
            }
            setEditingMember(null)
          }}
          onCollapse={() => setEditingMember(null)}
        />
      )}

      {showAcceptedNotice && (
        <InviteAcceptedNotification
          companyName={acceptedInviteCompany ?? undefined}
          onDismiss={() => setShowAcceptedNotice(false)}
        />
      )}
    </div>
  )
}
