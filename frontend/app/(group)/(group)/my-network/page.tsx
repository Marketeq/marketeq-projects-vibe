"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import type { TalentNetworkStatus } from "@/service/http/contracts"
import { logHireFlowInitiated } from "@/service/http/contracts"
import { UserAPI } from "@/service/http/user"
import {
  useCompanyAdminIds,
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
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Briefcase01,
  Edit03,
  FileText,
  Globe01,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw04,
  SearchMd,
  Star,
  Trash2,
  User01,
  X,
  XClose,
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
import { OfferDialog } from "@/components/hire-me-button"
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

/**
 * How long an undoable confirmation holds its request before sending it.
 * AC-17.4 (R3-09): "A resend is held until the ... toast closes. Undo drops
 * it: nothing goes out and the old link and expiry stay as they were." The
 * Toaster keeps a toast carrying an action on screen for 8s
 * (`toaster.tsx`: `duration={action ? 8000 : undefined}`), so that window is
 * the undo window — these must stay in step.
 */
const UNDOABLE_CONFIRMATION_MS = 8000

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
  /**
   * The viewer holds company_users.role 'admin' on this row's company - the
   * column user-service's assertIsAdmin gates on. Drives only the menu items
   * that write to company membership (R3-12).
   */
  viewerIsCompanyAdmin: boolean
  /** Invitation date; drives Newest/Oldest sorting. */
  joinedAt?: string | null
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
  projects: number
  skills: string[]
  email?: string
  company?: string
  /** Profile availability, drives the card's avatar indicator. */
  availability?: string | null
  /** First hire date from contracts-service; drives Newest/Oldest sorting. */
  joinedAt?: string | null
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
          <div className="flex items-center gap-x-3">
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
        // Figma Status column: pill badges, not plain text. Active is
        // Success/50 on Success/500 — the Badge's own `success` visual is
        // 100/700, so those two colours are overridden here rather than by
        // touching the shared component. Pending is exactly `visual="gray"`
        // (Gray/100 on Gray/700), so that one needs no override.
        return val === "active" ? (
          <Badge
            visual="success"
            size="sm"
            variant="rounded"
            className="bg-success-50 text-success-500"
          >
            Active
          </Badge>
        ) : (
          <Badge visual="gray" size="sm" variant="rounded">
            Invitation pending
          </Badge>
        )
      },
    }),
    accountColumnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const isPending = row.original.status === "pending"
        // Editing permissions requires a company_users row to write back to,
        // and only accepted members tied to a company have one. The write is
        // assertIsAdmin-gated, so a non-admin viewer is not offered it (R3-12).
        const canEdit =
          !isPending &&
          !!row.original.userId &&
          !!row.original.companyId &&
          row.original.viewerIsCompanyAdmin
        // AC-17.3: "A viewer with no valid action on a row sees no menu."
        // Pending rows always offer Resend/Cancel; an Active row offers only
        // the two admin writes, so a non-admin gets no trigger rather than an
        // empty dropdown.
        if (!isPending && !canEdit && !row.original.viewerIsCompanyAdmin) {
          return null
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                className="rounded-full text-gray-400"
                visual="gray"
                variant="ghost"
              >
                <MoreHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            {/* Same items, same labels and same status rules as the card
                menu in MemberCard. The two are different views of one row,
                and this one used to offer three items — two of them
                relabelled to "Edit" and "Remove" — against the card's
                five. */}
            <DropdownMenuContent align="end" className="w-[185px]">
              {canEdit && (
                <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                  <Edit03 className="h-4 w-4" /> Edit Permissions
                </DropdownMenuItem>
              )}
              {isPending ? (
                <>
                  <DropdownMenuItem onSelect={() => onResend(row.original.id)}>
                    <RefreshCw04 className="h-4 w-4" /> Resend Invite
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    visual="destructive"
                    onSelect={() => onCancel(row.original.id)}
                  >
                    <Trash2 className="h-4 w-4" /> Cancel Invite
                  </DropdownMenuItem>
                </>
              ) : (
                /* AC-17.3: on an Active member only the owner and an
                   Administrator may remove. Same gate as Edit Permissions
                   above, because both write to company membership. */
                row.original.viewerIsCompanyAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      visual="destructive"
                      onSelect={() => onCancel(row.original.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Remove User
                    </DropdownMenuItem>
                  </>
                )
              )}
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
      {/* Figma's header cells are #FFFFFF, same as the body rows — the
          component defaults to bg-gray-25, which reads as a tinted bar. */}
      <TableHeader className="bg-white [&_tr]:border-t-0">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                // leading-[18px] is Figma's header line-height; the component
                // sets text-[18px] (a size, not a leading) and text-xs then
                // pulls the computed leading down to 16px.
                className={cn(
                  "leading-[18px]",
                  header.column.getCanSort() && "cursor-pointer select-none"
                )}
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
          <TableRow key={row.id} className="hover:bg-transparent">
            {row.getVisibleCells().map((cell) => (
              <TableCell
                // Figma body cell is 16px/24px, giving a 72px row off the
                // 40px avatar; the component defaults to py-[26px] (98px).
                className="py-4"
                key={cell.id}
              >
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
        <div className="flex items-center gap-x-3">
          {/* `flex` so the link is not an inline box: as an inline element
              it added ~5px of descender space under the 40px avatar and
              pushed the row past Figma's 72px. */}
          <NextLink href={profileHref} className="flex shrink-0">
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
          <IconButton className="rounded-full text-gray-400" visual="gray" variant="ghost">
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
      {/* Same as the External Team table: Figma's header cell is Base/White,
          not the component's bg-gray-25. Confirmed on the Talent Network
          frame's own "Table header cell" — #FFFFFF, 44px, 12px/24px. */}
      <TableHeader className="bg-white [&_tr]:border-t-0">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                // Figma header line-height is 18px; see the note on the
                // External Team table above for why it needs pinning.
                className={cn(
                  "leading-[18px]",
                  header.column.getCanSort() && "cursor-pointer select-none"
                )}
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
          <TableRow key={row.id} className="hover:bg-transparent">
            {row.getVisibleCells().map((cell) => (
              <TableCell
                // Figma body cell is 16px/24px, giving a 72px row off the
                // 40px avatar; the component defaults to py-[26px] (98px).
                className="py-4"
                key={cell.id}
              >
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
  viewerIsCompanyAdmin,
  onResend,
  onCancel,
  onEdit,
}: AccountMember & {
  onResend: (id: string) => void
  onCancel: (id: string) => void
  onEdit: (member: AccountMember) => void
}) => {
  const isPending = status === "pending"
  // Same rule as the list view: the permissions write is assertIsAdmin-gated,
  // so a non-admin viewer is not offered it (R3-12).
  const canEdit = !isPending && !!userId && !!companyId && viewerIsCompanyAdmin

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
    // `min-w-0` matters: a flex item defaults to min-width:auto, so a long
    // unbroken invitee email sets the card's min-content width and the card
    // grows past its grid cell — swallowing the 24px gap and making adjacent
    // cards look joined. This lets it shrink back to the cell.
    <article className="relative flex min-w-0 flex-1 flex-col rounded-lg p-5 lg:py-[35px] lg:px-[30px] lg:min-h-[396px] bg-white border border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
      {/* AC-17.3: no valid action for this viewer on this row means no menu at
          all, not an empty one. Same rule as the list view. */}
      {(isPending || canEdit || viewerIsCompanyAdmin) && (
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
                    viewerIsCompanyAdmin,
                  })
                }
              >
                Edit Permissions
              </DropdownMenuItem>
            )}
            {/* View Profile is gone. R3-12's table names four actions across
                the two states and this is not one of them; it had no handler
                either, and a pending invitee has no profile to open. If it
                comes back it needs a route for an external member, which does
                not exist today. */}
            {/* R3-12: a pending row has two actions, an accepted one has
                Remove User. Pending used to offer Cancel Invite *and* Remove
                User, both calling the same handler. */}
            {isPending ? (
              <>
                <DropdownMenuItem onSelect={() => onResend(id)}>
                  Resend Invite
                </DropdownMenuItem>
                <DropdownMenuItem visual="destructive" onSelect={() => onCancel(id)}>
                  Cancel Invite
                </DropdownMenuItem>
              </>
            ) : (
              /* AC-17.3: Remove User is owner/Administrator only, same as the
                 list view. */
              viewerIsCompanyAdmin && (
                <DropdownMenuItem visual="destructive" onSelect={() => onCancel(id)}>
                  Remove User
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex items-center justify-center mt-2">
        {/* The member's own photo when one is set; otherwise the empty dashed
            profile circle from the design, never a name initial.

            The dashed circle is styled from Avatar, not AvatarFallback:
            AvatarFallback destructures `className` and never applies it
            (components/ui/avatar/avatar.tsx), so anything set there is
            silently dropped — which is why this rendered as a plain circle.
            Radix renders the fallback as a <span>, and a descendant selector
            outranks the component's own utility class without !important.
            Figma: 116px, #F9FAFB fill, 2px dashed #D0D5DD. */}
        <Avatar
          size="3xl"
          className="h-[62px] w-[62px] lg:h-[116px] lg:w-[116px] hover:ring-0 active:ring-0 [&_span]:border-2 [&_span]:border-dashed [&_span]:border-gray-300 [&_span]:bg-gray-50"
        >
          <AvatarImage src={avatarSrc} alt={displayName || email} />
          <AvatarFallback />
        </Avatar>
      </div>

      {isPending ? (
        <>
          {/* break-all because an email has no spaces to wrap at; without it
              the address sets the card's min-content width. The design only
              ever shows a short address, so this long-value state is ours. */}
          <p className="w-full break-all text-[11px] leading-[13.31px] lg:text-sm text-center font-light lg:leading-[16.94px] text-[#585C65] mt-3 lg:mt-[17px]">
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

const TALENT_NETWORK_TAB = "Talent Network"

/**
 * Add Team Member. One button in the shared header serves both tabs, so it
 * branches on the active one (US-25 / PMCM-731, AC-25.1): External Team opens
 * the invite flow, Talent Network opens the "How do you want to add this team
 * member?" chooser. Passing `onClick` selects the chooser; without it the
 * button keeps its original InviteWindowTrigger behaviour.
 */
const InviteWindowButton = ({ onClick }: { onClick?: () => void }) => {
  const button = (
    <Button
      className="bg-white w-[170px] h-10 px-[14px] py-2 gap-2 text-[13px] leading-6 capitalize border-2 border-primary-500 text-primary-500 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-primary-500 hover:text-white xs:max-lg:w-auto xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px]"
      variant="outlined"
      visual="gray"
      size="md"
      onClick={onClick}
    >
      {/* shrink-0 matches the Figma's `flex: none` on the icon. Without it
          the 170px button has 142px of content space, the label takes its
          natural 119px, and flexbox squeezes the icon from 15px to 11px. */}
      <Plus className="shrink-0 size-[11.64px] lg:size-[15px] [&_path]:stroke-[1.25]" />{" "}
      Add Team Member
    </Button>
  )

  return onClick ? (
    button
  ) : (
    <InviteWindowTrigger asChild>{button}</InviteWindowTrigger>
  )
}

// ========================
// Add Team Member (Talent Network) — S16 chooser + S17 recipient picker
// US-25 / PMCM-731 and US-26 / PMCM-732.
// ========================

type AddTalentOptionId = "post-job" | "send-offer" | "browse"

const ADD_TALENT_OPTIONS: {
  id: AddTalentOptionId
  Icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  /** Figma sticky note for this option's destination; "send-offer" has none
   *  because it opens the recipient picker rather than leaving the modal. */
  href?: string
}[] = [
  {
    id: "post-job",
    Icon: Briefcase01,
    title: "Post a job",
    description:
      "Create a job post and let qualified talent apply. Best when you want to compare applicants before hiring.",
    // "The user is sent to the job creation flow"
    href: "/my-jobs",
  },
  {
    id: "send-offer",
    Icon: FileText,
    title: "Send an offer",
    description:
      "Search for a specific talent and send them a contract offer directly. Best when you already know who you want to hire.",
  },
  {
    id: "browse",
    Icon: Globe01,
    title: "Browse the Marketplace",
    description:
      "Explore available talent, compare profiles, and send an offer when you find the right fit.",
    // "The user is sent to the Marketplace page"
    href: "/projects",
  },
]

/** The picker only offers talent with no live engagement. Designer's rule:
 *  direct offers go to people who are not already under contract (active) and
 *  do not already have an offer out (pending). */
const isOfferEligible = (member: TalentMember) => member.status === "past"

const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

const AddTalentMemberModal = ({
  open,
  onClose,
  talentMembers,
  onSendOffer,
}: {
  open: boolean
  onClose: () => void
  talentMembers: TalentMember[]
  /** Hands the revalidated recipient up to the page, which opens the existing
   *  Hire Me offer modal. 04 Frontend Specs §S17 and AC-26.5: Continue hands
   *  off to that modal, it does not navigate. */
  onSendOffer: (member: TalentMember) => void
}) => {
  const router = useRouter()
  const [step, setStep] = useState<"choose" | "recipient">("choose")
  const [selectedOption, setSelectedOption] =
    useState<AddTalentOptionId | null>(null)
  const [query, setQuery] = useState("")
  const [recipient, setRecipient] = useState<TalentMember | null>(null)
  const [staleRecipient, setStaleRecipient] = useState(false)

  // Reopening must not inherit the previous run's selection.
  useEffect(() => {
    if (open) return
    setStep("choose")
    setSelectedOption(null)
    setQuery("")
    setRecipient(null)
    setStaleRecipient(false)
  }, [open])

  const eligible = useMemo(
    () => talentMembers.filter(isOfferEligible),
    [talentMembers]
  )

  // "The system does not support email-based recipients in this modal because
  // direct offers can only be sent to existing Marketeq profiles."
  const queryIsEmail = looksLikeEmail(query)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || queryIsEmail) return []
    return eligible
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          m.handle.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [eligible, query, queryIsEmail])

  const showNoResults = Boolean(query.trim()) && matches.length === 0

  const handleOptionContinue = () => {
    const option = ADD_TALENT_OPTIONS.find((o) => o.id === selectedOption)
    if (!option) return
    if (option.id === "send-offer") {
      setStep("recipient")
      return
    }
    onClose()
    if (option.href) router.push(option.href)
  }

  // "If the selected profile is deactivated, unavailable, or no longer
  // eligible before the user clicks Continue, the system revalidates the
  // selected profile and blocks continuation."
  const handleRecipientContinue = () => {
    if (!recipient) return
    const current = talentMembers.find((m) => m.id === recipient.id)
    if (!current || !isOfferEligible(current)) {
      setStaleRecipient(true)
      return
    }
    onClose()
    logHireFlowInitiated(recipient.id).catch(() => {
      // Audit only — never block the hand-off on it.
    })
    onSendOffer(current)
  }

  const chooseRecipient = (member: TalentMember) => {
    setRecipient(member)
    setStaleRecipient(false)
    setQuery("")
  }

  const clearRecipient = () => {
    setRecipient(null)
    setStaleRecipient(false)
    setQuery("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      {/* Figma (S16/S17 card): 582px wide, 12px radius, Shadow/3xl
          `0px 32px 64px -12px rgba(16,24,40,0.14)`. DialogContent's default
          variant ships Tailwind's `shadow-xl`, and the config defines no 3xl
          token, so the exact value is set here and twMerge drops the base. */}
      {/* No `overflow-hidden`: overflow clips absolutely-positioned
          descendants, which trapped the S17 recipient dropdown inside the
          card. The white fill and radius sit on DialogContent itself and no
          child paints to the corners, so nothing needs clipping. */}
      <DialogContent className="p-0 gap-0 max-w-[582px] w-[582px] rounded-xl shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.14)]">
        <div className="flex items-center gap-4 px-5 py-5">
          <DialogTitle className="flex-1 text-[20px] font-bold leading-normal text-dark-blue-400">
            {step === "choose"
              ? "How do you want to add this team member?"
              : "Who do you want to send this offer to?"}
          </DialogTitle>
          <DialogClose asChild>
            <IconButton
              variant="ghost"
              visual="gray"
              size="sm"
              className="shrink-0 rounded-[8px]"
            >
              <XClose className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        {step === "choose" ? (
          <>
            <div className="flex flex-col gap-[10px] px-5 pb-[6px] pt-[6px]">
              {ADD_TALENT_OPTIONS.map(({ id, Icon, title, description }) => {
                const isSelected = selectedOption === id
                return (
                  <Button
                    key={id}
                    variant="ghost"
                    visual="gray"
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-auto w-full items-start justify-start gap-x-4 rounded-[8px] p-6 text-left",
                      "shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]",
                      isSelected
                        ? "border-2 border-primary-500 bg-transparent hover:bg-transparent"
                        : "border border-gray-200 bg-transparent hover:border-gray-300 hover:bg-transparent"
                    )}
                    onClick={() => setSelectedOption(id)}
                  >
                    <Icon
                      className={cn(
                        "size-6 shrink-0",
                        isSelected ? "text-primary-500" : "text-dark-blue-400"
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                      <span
                        className={cn(
                          "whitespace-normal text-[16px] font-semibold leading-normal",
                          isSelected ? "text-primary-500" : "text-dark-blue-400"
                        )}
                      >
                        {title}
                      </span>
                      <span className="whitespace-normal text-[15px] font-normal leading-5 text-gray-500">
                        {description}
                      </span>
                    </div>
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-7 px-5 py-[14px]">
              <Button variant="link" visual="gray" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-auto w-[108px] px-4 py-[10px]"
                disabled={!selectedOption}
                onClick={handleOptionContinue}
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-6 px-5 pb-2 pt-[6px]">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="offer-recipient"
                  className="text-[14px] font-semibold leading-5 text-dark-blue-400"
                >
                  Select recipient
                </Label>

                {recipient ? (
                  <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[8px] border border-primary-500 px-3 py-2">
                    <span className="inline-flex items-center gap-x-2 rounded-[6px] bg-primary-50 px-2 py-1">
                      <span className="text-[14px] font-semibold leading-5 text-primary-500">
                        {recipient.name}
                      </span>
                      {/* "The username is clickable in for the client to view
                          the profile if they want" */}
                      <NextLink
                        href={`/talent-profile?username=${encodeURIComponent(recipient.username)}`}
                        className="text-[14px] font-normal leading-5 text-primary-500 underline-offset-2 hover:underline"
                      >
                        @{recipient.username}
                      </NextLink>
                      <IconButton
                        type="button"
                        visual="gray"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${recipient.name}`}
                        /* Sized down to sit inside the chip: the component's
                           own h-9/w-9 and padding are overridden here. */
                        className="h-auto w-auto min-w-0 p-0 text-primary-500 hover:bg-transparent hover:opacity-70"
                        onClick={clearRecipient}
                      >
                        <X className="size-4" />
                      </IconButton>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className={cn(
                        "flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3 py-2",
                        showNoResults
                          ? "border-error-500"
                          : "border-gray-300 focus-within:border-primary-500"
                      )}
                    >
                      <Input
                        id="offer-recipient"
                        autoComplete="off"
                        /* The bordered box is the wrapper above (it also holds
                           the chip), so Input's own height, border, radius,
                           padding, shadow and focus ring are overridden away
                           and only its behaviour is used. */
                        className="h-5 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-[14px] leading-5 text-gray-900 shadow-none placeholder:text-gray-500 focus:border-0 focus:outline-none focus:ring-0"
                        placeholder="Search by name or username"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {showNoResults && (
                        <AlertCircle className="size-[18px] shrink-0 text-error-500" />
                      )}
                    </div>

                    {showNoResults && (
                      <p className="mt-1.5 text-[13px] leading-5 text-gray-500">
                        No results. Try searching by name or username.
                      </p>
                    )}

                    {matches.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-[308px] overflow-y-auto rounded-[8px] border border-gray-200 bg-white py-1 shadow-lg">
                        {matches.map((member) => (
                          <Button
                            key={member.id}
                            type="button"
                            visual="gray"
                            variant="ghost"
                            size="sm"
                            /* A full-width result row, not a pill: the
                               component's height, centring and horizontal
                               padding are overridden. */
                            className="flex h-auto w-full items-center justify-start gap-x-3 rounded-none px-3 py-2.5 text-left font-normal hover:bg-gray-50"
                            onClick={() => chooseRecipient(member)}
                          >
                            <Avatar className="size-9 flex-none">
                              <AvatarImage
                                src={member.avatarSrc}
                                alt={member.name}
                              />
                              <AvatarFallback>
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-[15px] font-semibold leading-5 text-dark-blue-400">
                              {member.name}
                            </span>
                            <span className="truncate text-[15px] font-normal leading-5 text-gray-500">
                              @{member.username}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {staleRecipient && (
                  <p className="text-[13px] leading-5 text-error-500">
                    This user has no availability for new projects or services
                    right now. Please select someone else to continue.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-[14px]">
              <Button
                variant="link"
                visual="gray"
                size="sm"
                onClick={() => {
                  setStep("choose")
                  clearRecipient()
                }}
              >
                <ArrowDown className="size-4 rotate-90" /> Back
              </Button>
              <Button
                size="sm"
                className="h-auto w-[108px] px-4 py-[10px]"
                disabled={!recipient || staleRecipient}
                onClick={handleRecipientContinue}
              >
                Continue
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Sort order for both tabs. The four options are the ones this menu has
 * always listed; note the menu itself is not in the Figma (UX-14), so the
 * labels are the build's own, not the design's.
 *
 * "Newest/Oldest" sorts by when the person joined the network: the first
 * hire date for Talent Network, the invitation date for External Team.
 * Anyone missing that date sorts last, so a gap never silently reorders
 * the people who do have one.
 */
type SortKey = "name-asc" | "name-desc" | "newest" | "oldest"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name A-Z" },
  { key: "name-desc", label: "Name Z-A" },
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
]

/** Pending invitees have no name yet, so fall back to the email. */
const sortLabel = (m: { name?: string; email?: string }) =>
  (m.name?.trim() || m.email?.trim() || "").toLowerCase()

const sortMembers = <T extends { name?: string; email?: string; joinedAt?: string | null }>(
  list: T[],
  key: SortKey
): T[] => {
  const next = [...list]
  if (key === "name-asc" || key === "name-desc") {
    const dir = key === "name-asc" ? 1 : -1
    return next.sort((a, b) => dir * sortLabel(a).localeCompare(sortLabel(b)))
  }
  const time = (m: T) => {
    const t = m.joinedAt ? new Date(m.joinedAt).getTime() : NaN
    return Number.isNaN(t) ? null : t
  }
  return next.sort((a, b) => {
    const ta = time(a)
    const tb = time(b)
    // Undated rows sink to the bottom of either direction.
    if (ta === null && tb === null) return sortLabel(a).localeCompare(sortLabel(b))
    if (ta === null) return 1
    if (tb === null) return -1
    return key === "newest" ? tb - ta : ta - tb
  })
}

const SortDropdown = ({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (key: SortKey) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="focus-visible:outline-none shrink-0" aria-label="Sort">
        <SortAs className="size-4 lg:size-6 text-gray-500" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <ScrollArea
        viewportClassName="max-h-[250px]"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuCheckItem
            key={option.key}
            checked={value === option.key}
            // Re-picking the active option must not clear the sort, so only
            // a positive check changes it.
            onCheckedChange={(checked) => {
              if (checked) onChange(option.key)
            }}
          >
            {option.label}
          </DropdownMenuCheckItem>
        ))}
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
  status: TalentNetworkStatus,
  joinedAt: string | null
): TalentMember {
  const card = talentToCardProps(u, index)

  // The master mapper hardcodes a placeholder experience string. Where the
  // profile actually carries work history, derive the real figure instead.
  // getUserById returns the relation twice — spread as `experiences` and
  // aliased to `experience` — so either name works; keep the singular.
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

  // The master mapper hardcodes "7:30pm local time" for everyone. Where the
  // profile carries a zone, show the talent's actual local time instead.
  let localTime = card.localTime
  if (u.timezone) {
    try {
      const clock = new Intl.DateTimeFormat("en-US", {
        timeZone: u.timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
        .format(new Date())
        .toLowerCase()
        .replace(/\s/g, "")
      localTime = `${clock} local time`
    } catch {
      // An unknown zone string must not take the card down.
    }
  }

  return {
    id: card.id,
    username: card.username,
    name: card.name,
    handle: card.handle,
    role: card.role,
    avatarSrc: card.photo,
    // The master mapper reads `u.rating`, which this endpoint does not return —
    // the profile carries the figure as `clientSuccessRating`, so prefer that
    // and keep the mapper's value as the fallback.
    rating: Number(u.clientSuccessRating) || card.rating,
    experience,
    country: card.country,
    localTime,
    rate: card.rate,
    projects: card.projects,
    skills: card.skills,
    availability: u.availability,
    joinedAt,
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
  // One order shared by both tabs, matching the single toolbar control.
  const [sortBy, setSortBy] = useState<SortKey>("name-asc")
  const isGrid = getFirstItem(value) === GRID_LAYOUT
  const [activeTab, setActiveTab] = useState(TALENT_NETWORK_TAB)

  // PMCM-720 AC-14.1: the "N team members" count is active members on the open
  // tab only. It is rendered by the shared secondary nav, which sits above this
  // page in the layout and so cannot be handed the tab - publish it on the URL
  // instead and let useTeamMemberCount read it back. Pages without the param
  // keep the previous combined total, so only My Team changes.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", activeTab === TALENT_NETWORK_TAB ? "talent" : "external")
    const query = params.toString()
    if (query === searchParams.toString()) return
    router.replace(`/my-network?${query}`, { scroll: false })
  }, [activeTab, searchParams, router])
  const [isAddTalentOpen, setIsAddTalentOpen] = useState(false)
  // Recipient chosen in S17. Holding the member (rather than a boolean) keeps
  // the offer modal mounted with their profile after the picker has closed.
  const [offerRecipient, setOfferRecipient] = useState<TalentMember | null>(
    null
  )
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
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
    router.replace(query ? `/my-network?${query}` : "/my-network", { scroll: false })
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

  // R3-12: the menu should only offer what the server will allow. Shares the
  // member lists already fetched above, so this costs no extra requests.
  const adminCompanyIds = useCompanyAdminIds(rosterCompanyIds)

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
        viewerIsCompanyAdmin:
          !!inv.companyId && adminCompanyIds.has(inv.companyId),
        joinedAt: inv.createdAt ?? null,
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
    adminCompanyIds,
  ])

  const resendInvitation = useResendInvitation()
  const cancelInvitation = useCancelInvitation()

  // Requests held open for Undo. Kept in a ref so a re-render cannot lose a
  // timer and strand the request.
  const pendingUndos = useRef<
    { timer: ReturnType<typeof setTimeout>; run: () => void }[]
  >([])

  useEffect(
    () => () => {
      // Unmounting is not an Undo — the client never asked to drop these, so
      // flush anything still waiting instead of silently discarding it.
      pendingUndos.current.forEach(({ timer, run }) => {
        clearTimeout(timer)
        run()
      })
      pendingUndos.current = []
    },
    []
  )

  /**
   * Confirmation whose Undo drops the request outright (AC-17.4 / R3-09).
   * The toast appears at once and `run` is held until it closes; pressing
   * Undo clears it so nothing reaches the backend at all. Radix's
   * ToastAction closes the toast itself, so Undo only has to cancel the
   * timer.
   */
  const confirmWithUndo = (title: string, run: () => void) => {
    const forget = () => {
      pendingUndos.current = pendingUndos.current.filter(
        (entry) => entry.timer !== timer
      )
    }
    const timer = setTimeout(() => {
      forget()
      run()
    }, UNDOABLE_CONFIRMATION_MS)
    pendingUndos.current.push({ timer, run })

    toast({
      title,
      variant: "success",
      className: CONFIRMATION_TOAST_CLASS,
      action: (
        <ToastAction
          altText="Undo"
          className={CONFIRMATION_TOAST_UNDO_CLASS}
          onClick={() => {
            clearTimeout(timer)
            forget()
          }}
        >
          Undo
        </ToastAction>
      ),
    })
  }

  const handleResend = (id: string) => {
    confirmWithUndo("Your invitation has been resent", () => {
      resendInvitation.mutateAsync(id).catch((err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to resend",
          description: err?.response?.data?.message ?? "Please try again.",
        })
      })
    })
  }

  const handleCancel = (id: string) => {
    confirmWithUndo("Your invitation has been canceled", () => {
      cancelInvitation.mutateAsync(id).catch((err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to remove",
          description: err?.response?.data?.message ?? "Please try again.",
        })
      })
    })
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
        // When this person first joined the network, for Newest/Oldest.
        const joinedAtByTalentId = new Map(
          networkEntries.map((entry) => [entry.talentId, entry.firstHiredAtISO])
        )
        const profiles = results
          .filter(
            (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"
          )
          .map((r) => r.value?.data)
          .filter(Boolean)

        setTalentMembers(
          profiles.map((u, i) =>
            mapUserToTalent(
              u,
              i,
              statusByTalentId.get(u.id) ?? "active",
              joinedAtByTalentId.get(u.id) ?? null
            )
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

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesQuery = (m: {
    name?: string
    email?: string
    company?: string
  }) =>
    m.name?.toLowerCase().includes(normalizedQuery) ||
    m.email?.toLowerCase().includes(normalizedQuery) ||
    m.company?.toLowerCase().includes(normalizedQuery)

  // Sort after filtering so the visible rows are what gets ordered.
  const filteredTalentMembers = sortMembers(
    normalizedQuery ? talentMembers.filter(matchesQuery) : talentMembers,
    sortBy
  )
  const filteredTeamMembers = sortMembers(
    normalizedQuery ? teamMembers.filter(matchesQuery) : teamMembers,
    sortBy
  )

  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 lg:gap-x-6">
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <ToggleGroupRoot
            value={value}
            // A view switcher must always have exactly one segment on. Ark
            // allows empty selection by default, so clicking the active
            // segment cleared it and left both rendering as off.
            deselectable={false}
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
        <InviteWindowButton
          onClick={
            activeTab === TALENT_NETWORK_TAB
              ? () => setIsAddTalentOpen(true)
              : undefined
          }
        />
      </div>

      <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        My Network
      </h1>

      <Tabs
        className="mt-7 lg:mt-[19px]"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="border-b h-10 lg:h-[60px] flex items-end justify-between border-gray-200">
          <div className={cn("items-end inline-flex gap-x-3 lg:gap-x-3.5", isSearchOpen && "min-w-0 flex-1")}>
            {isSearchOpen ? (
              <div className="flex w-full items-center gap-3 border-b-2 border-primary-500 py-2.5 pr-3">
                <SearchMd className="size-[18px] shrink-0 text-primary-500" />
                <input
                  autoFocus
                  type="text"
                  className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal text-gray-500 placeholder:text-gray-500 placeholder:opacity-50 focus:outline-none focus:ring-0"
                  placeholder="Type to search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 text-gray-500 opacity-50 hover:opacity-100"
                  onClick={() => { setIsSearchOpen(false); setSearchQuery("") }}
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button
                className="text-gray-500"
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => setIsSearchOpen(true)}
              >
                <SearchMd className="size-[18px]" />
              </Button>
            )}

            {!isSearchOpen && (
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
            )}
          </div>

          <div className="hidden items-center gap-x-6 self-start md:flex">
            <div className="flex items-center gap-x-3 lg:gap-x-3.5">
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <ToggleGroupRoot
                value={value}
                // A view switcher must always have exactly one segment on.
                // Ark allows empty selection by default, so clicking the
                // active segment cleared it and left both rendering as off.
                deselectable={false}
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
            <InviteWindowButton
          onClick={
            activeTab === TALENT_NETWORK_TAB
              ? () => setIsAddTalentOpen(true)
              : undefined
          }
        />
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
          ) : filteredTalentMembers.length === 0 ? (
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
              key={filteredTalentMembers.map((member) => member.id).join(",")}
            >
              {filteredTalentMembers.map((member, index) => (
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
                  projects={member.projects}
                  skills={member.skills}
                  profileHref={`/talent-profile?username=${member.username}`}
                  status={member.status}
                  availability={member.availability}
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
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
                <TalentNetworkTable data={filteredTalentMembers} />
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
          ) : filteredTeamMembers.length === 0 ? (
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
              key={filteredTeamMembers.map((member) => member.id).join(",")}
            >
              {filteredTeamMembers.map((member, index) => (
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
              <div className="rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
                <AccountMembersTable
                  data={filteredTeamMembers}
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
            // Captured before the panel closes: Undo needs the roles the
            // member held going in, and `editingMember` is cleared below.
            const { userId, permissions: previousRoleIds } = editingMember
            if (userId) {
              updateCompanyMember.mutate(
                { userId, dto: { permissions: roleIds } },
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
                          onClick={() =>
                            // R2-25: a permission change applies immediately,
                            // so Undo writes the previous roles back rather
                            // than dropping a held request the way the
                            // resend and cancel confirmations do.
                            updateCompanyMember.mutate({
                              userId,
                              dto: { permissions: previousRoleIds },
                            })
                          }
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

      <AddTalentMemberModal
        open={isAddTalentOpen}
        onClose={() => setIsAddTalentOpen(false)}
        talentMembers={talentMembers}
        onSendOffer={setOfferRecipient}
      />

      {offerRecipient && (
        <OfferDialog
          open
          onOpenChange={(next) => {
            if (!next) setOfferRecipient(null)
          }}
          profile={{
            id: offerRecipient.id,
            username: offerRecipient.username,
            firstName: offerRecipient.name,
            avatarUrl: offerRecipient.avatarSrc,
          }}
        />
      )}
    </div>
  )
}
