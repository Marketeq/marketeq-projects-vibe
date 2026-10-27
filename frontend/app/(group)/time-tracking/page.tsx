"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { useStartTimeGate } from "@/utils/useStartTimeGate"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  type ContractDTO,
  getContractsForClient,
  getContractsForTalent,
} from "@/service/http/contracts"
import {
  type ScreenshotCardDTO,
  type ScreenshotCardsParams,
  getAllScreenshotCards,
  getScreenshotFacets,
  type ScreenshotFacetsDTO,
  deleteScreenshot,
  blurScreenshot,
  unblurScreenshot,
  requestScreenshotAccess,
  updateScreenshotMeta,
  reassignScreenshots,
  type ActivityBand,
  type TimeEntryType,
} from "@/service/http/screenshots"
import { cn } from "@/utils/functions"
import { getPublicApiUrl, getPublicBackendUrl } from "@/lib/runtime-urls"
import { TIME_ZONES } from "@/lib/time-zones"
import { ROLE } from "@/types/user"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell01,
  CalendarPlus02,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Droplet,
  Edit03,
  FilterLines,
  Globe02,
  HelpCircle,
  Image01,
  InfoCircle,
  Keyboard01,
  Monitor01,
  MoreHorizontal,
  Mouse,
  Plus,
  SearchSm,
  Send01,
  Settings02,
  SwitchHorizontal01,
  CheckSquare,
  Trash01,
  X,
  ZoomIn,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import { SortAs } from "@/components/icons"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network4 } from "@/components/icons/network-4"
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  AvatarFallback,
  Badge,
  BadgeCloseButton,
  Button,
  Card,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DoubleCalendar,
  DropdownCommand,
  DropdownCommandEmpty,
  DropdownCommandGroup,
  DropdownCommandInput,
  DropdownCommandItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownPopover,
  DropdownPopoverContent,
  DropdownPopoverTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ScaleOutIn,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  toast,
  useToast,
} from "@/components/ui"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { VscCode } from "react-icons/vsc"
import { FiFigma } from "react-icons/fi"
import { FaChrome, FaSlack, FaGithub, FaGoogle, FaTerminal, FaApple, FaSafari } from "react-icons/fa"
import { type ManualTimeDTO, getManualTime } from "@/service/http/manual-time"
import { AddManualTimeDialog } from "@/components/add-manual-time-dialog"
import { createContractTask, getTasksForContract } from "@/service/http/tasks"
import {
  DownloadDesktopTrackerDialog,
  openDesktopTracker,
} from "@/components/download-desktop-tracker-dialog"
import {
  type ScreenshotRulesDTO,
  type TimePreferencesDTO,
  getScreenshotRules,
  getTimePreferences,
  updateScreenshotRules,
  updateTimePreferences,
} from "@/service/http/time-tracking-settings"
import React from "react"


// ─── Types ──────────────────────────────────────────────────────────────

interface Screenshot {
  id: string
  time: string
  imageUrl: string
  activityLevel: number // 0-100 progress bar
  // The same apps with their real names and time in front during this
  // screenshot's interval — the detail panel's app activity.
  apps: string[] // app icon labels like "chrome", "slack", "github"
  appIconUrls?: Record<string, string> // normalized app key -> real extracted icon URL, when available
  appDisplayNames?: Record<string, string> // normalized app key -> real appName, for apps not in the curated appDisplay dictionary
  isDuplicate?: boolean
  duplicateCount?: number
  isNoActivity?: boolean
  isBlurred?: boolean
  /** The client has asked the talent to unblur it. */
  accessRequested?: boolean
  contractId?: string
  taskId?: string
  keyboardPct?: number
  mousePct?: number
  // Every monitor captured at the same moment, default (primary) screen
  // first. The grid shows only the first; the details view switches between
  // them. Always includes this screenshot itself.
  screens?: Screenshot[]
}

type ProjectColor =
  | "mint"
  | "salmon"
  | "lavender"
  | "cyan"
  | "gold"
  | "yellow"
  | "pink"
  | "teal"
  | "sage"
  | "lime"
  // Screenshots with no contract, or one we can't resolve (US-TT-014/015).
  | "neutral"

interface ProjectBlock {
  /** null for screenshots never assigned to a contract. */
  contractId: string | null
  projectName: string
  projectColor: ProjectColor
  taskId: string | null
  taskName: string
  screenshots: Screenshot[]
}

interface TimeBlock {
  id: string
  hour: string // "10 am", "11 am", etc.
  date: string // "May 2nd, 2025"
  totalTime: string // "0:20 hrs"
  isManualTime?: boolean
  manualDuration?: string // "0:23hr"
  projects: ProjectBlock[]
}

// ─── Color map for project bars (using design system project-* tokens) ──

const projectBarColors: Record<ProjectColor, string> = {
  mint: "bg-project-mint",
  salmon: "bg-project-salmon",
  lavender: "bg-project-lavender",
  cyan: "bg-project-cyan",
  gold: "bg-project-gold",
  yellow: "bg-project-yellow",
  pink: "bg-project-pink",
  teal: "bg-project-teal",
  sage: "bg-project-sage",
  lime: "bg-project-lime",
  neutral: "bg-gray-200",
}

const barColSpan: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
}

// Contract name / task text are darker shades of the bar's own hue. Mint and
// cyan are the Figma values; the rest follow the same hue-shift.
const projectLabelColors: Record<ProjectColor, string> = {
  mint: "text-[#0D553C]",
  salmon: "text-[#631724]",
  lavender: "text-[#391763]",
  cyan: "text-[#23777D]",
  gold: "text-[#634D17]",
  yellow: "text-[#635D17]",
  pink: "text-[#631733]",
  teal: "text-[#176353]",
  sage: "text-[#17633A]",
  lime: "text-[#3F6317]",
  neutral: "text-gray-700",
}

const projectTaskColors: Record<ProjectColor, string> = {
  mint: "text-[#56A087]",
  salmon: "text-[#B46A77]",
  lavender: "text-[#8B6AB4]",
  cyan: "text-[#80C4C8]",
  gold: "text-[#B49E6A]",
  yellow: "text-[#B4AD6A]",
  pink: "text-[#B46A85]",
  teal: "text-[#6AB4A4]",
  sage: "text-[#6AB48C]",
  lime: "text-[#91B46A]",
  neutral: "text-gray-500",
}

// ─── App icon components (small colored dots) ───────────────────────────

// function AppIcons({ apps }: { apps: string[] }) {
//   const colors: Record<string, string> = {
//     chromebrowser: "bg-success-500",
//     chrome: "bg-success-500",
//     googlesearch: "bg-warning-500",
//     slack: "bg-error-400",
//     github: "bg-gray-700",
//     githubdesktop: "bg-gray-700",
//     vscode: "bg-primary-500",
//     figma: "bg-purple-500",
//     terminal: "bg-gray-500",
//   }
//   return (
//     <div className="flex items-center gap-0.5">
//       {apps.map((app, i) => (
//         <div
//           key={i}
//           className={cn("size-3 rounded-full", colors[app] || "bg-gray-400")}
//           title={app}
//         />
//       ))}
//     </div>
//   )
// }

function AppIcons({
  apps,
  iconUrls,
  displayNames,
}: {
  apps: string[]
  iconUrls?: Record<string, string>
  displayNames?: Record<string, string>
}) {
  return (
    <div className="flex items-center gap-1">
      {apps.map((app, i) => (
        <AppIcon key={i} app={app} iconUrl={iconUrls?.[app]} displayName={displayNames?.[app]} />
      ))}
    </div>
  )
}

// The backend never sends anything but its own server-derived iconUrl (see
// screenshots.service.ts#confirm — a client-supplied value is always
// dropped) — this is a second, independent check on the render side, so a
// future backend regression can't turn into loading an arbitrary attacker
// URL in another user's browser just by re-introducing a passthrough field.
function isTrustedIconOrigin(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true
    const trustedOrigins = [getPublicBackendUrl(), getPublicApiUrl(), process.env.NEXT_PUBLIC_R2_CDN_BASE]
      .map((u) => {
        if (!u) return null
        try {
          return new URL(u).origin
        } catch {
          return null
        }
      })
      .filter((origin): origin is string => origin !== null)
    return trustedOrigins.includes(parsed.origin)
  } catch {
    return false
  }
}

function AppIcon({
  app,
  iconUrl,
  displayName,
}: {
  app: string
  iconUrl?: string
  displayName?: string
}) {
  const size = 14
  if (iconUrl && isTrustedIconOrigin(iconUrl)) {
    // Real, OS-extracted icon — exact, not a guess. Falls through to the
    // name-based guess below when unavailable or untrusted.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={iconUrl} alt={app} width={size} height={size} className="rounded-[3px]" />
    )
  }
  switch (app) {
    case "chrome":
    case "chromebrowser":
      return <FaChrome size={size} className="text-green-500" title="Chrome" />
    case "googlesearch":
      return <FaGoogle size={size} className="text-amber-500" title="Google Search" />
    case "slack":
      return <FaSlack size={size} className="text-rose-500" title="Slack" />
    case "github":
    case "githubdesktop":
      return <FaGithub size={size} className="text-gray-700" title="GitHub" />
    case "vscode":
      return <VscCode size={size} className="text-blue-500" title="VS Code" />
    case "figma":
      return <FiFigma size={size} className="text-purple-500" title="Figma" />
    case "terminal":
      return <FaTerminal size={size} className="text-gray-500" title="Terminal" />
    case "code":
      return <VscCode size={size} className="text-blue-500" title="VS Code" />
    case "googlechrome":
      return <FaChrome size={size} className="text-green-500" title="Chrome" />
    case "finder":
      return <FaApple size={size} className="text-gray-500" title="Finder" />
    case "safari":
      return <FaSafari size={size} className="text-blue-400" title="Safari" />
    case "electron":
      return <VscCode size={size} className="text-blue-400" title="Electron" />
    default:
      return <div className="size-3 rounded-full bg-gray-400" title={displayName ?? app} />
  }
}

// ─── Transform backend data → frontend TimeBlock[] ─────────────────────

const PROJECT_COLORS: ProjectColor[] = [
  "mint",
  "salmon",
  "lavender",
  "cyan",
  "gold",
  "yellow",
  "pink",
  "teal",
  "sage",
  "lime",
]

/**
 * A contract's colour follows the contract, not the order screenshots happen
 * to arrive in, so it is the same in every hour block, bar and picker
 * (US-TT-014). Contracts we know take the palette in list order; any other id
 * is hashed onto it.
 */
function contractColor(
  contractId: string | null | undefined,
  contracts: { id: string }[]
): ProjectColor {
  if (!contractId) return "neutral"
  const idx = contracts.findIndex((c) => c.id === contractId)
  if (idx >= 0) return PROJECT_COLORS[idx % PROJECT_COLORS.length]
  let hash = 0
  for (const ch of contractId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

interface ManualBlockEntry {
  start: Date
  minutes: number
  contractId: string | null
  taskId: string | null
}

/** "0:23hr", the Figma format for manual time. */
function formatHoursMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes)
  return `${Math.floor(rounded / 60)}:${(rounded % 60).toString().padStart(2, "0")}hr`
}

function transformScreenshotsToTimeBlocks(
  cards: ScreenshotCardDTO[],
  contracts: ContractDTO[] = [],
  opts: {
    timezone?: string
    dateFormat?: string
    timeFormat?: string
    oldestFirst?: boolean
    /** Order of the contract bars inside each hour (Sort → Project / Contract). */
    contractOrder?: "asc" | "desc"
    groupBy?: "hour" | "day"
    /** Manual entries to show in the hour they start in (Figma "Manual time" badge). */
    manual?: ManualBlockEntry[]
  } = {}
): TimeBlock[] {
  // Build lookup map for contract names
  const contractMap = new Map<string, ContractDTO>()
  for (const c of contracts) {
    contractMap.set(c.id, c)
  }
  // Group by hour (or by day in Day View), in the user's timezone so a block
  // matches the hour/date printed on its header.
  const groupBy = opts.groupBy ?? "hour"
  const keyFormat = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    ...(opts.timezone ? { timeZone: opts.timezone } : {}),
  })
  const hourMap = new Map<string, { date: Date; cards: ScreenshotCardDTO[] }>()

  for (const card of cards) {
    const ts = card.capturedAt
      ? new Date(card.capturedAt)
      : new Date(card.createdAt)
    const kp = keyFormat.formatToParts(ts)
    const kv = (t: Intl.DateTimeFormatPartTypes) => kp.find((p) => p.type === t)?.value ?? ""
    const dayKey = `${kv("year")}-${kv("month")}-${kv("day")}`
    const hourKey = groupBy === "day" ? dayKey : `${dayKey}-${kv("hour")}`
    if (!hourMap.has(hourKey)) {
      hourMap.set(hourKey, { date: ts, cards: [] })
    }
    hourMap.get(hourKey)!.cards.push(card)
  }

  const manualByKey = new Map<string, ManualBlockEntry[]>()
  for (const entry of opts.manual ?? []) {
    const kp = keyFormat.formatToParts(entry.start)
    const kv = (t: Intl.DateTimeFormatPartTypes) => kp.find((p) => p.type === t)?.value ?? ""
    const dayKey = `${kv("year")}-${kv("month")}-${kv("day")}`
    const hourKey = groupBy === "day" ? dayKey : `${dayKey}-${kv("hour")}`
    if (!hourMap.has(hourKey)) hourMap.set(hourKey, { date: entry.start, cards: [] })
    if (!manualByKey.has(hourKey)) manualByKey.set(hourKey, [])
    manualByKey.get(hourKey)!.push(entry)
  }


  const toScreenshot = (c: ScreenshotCardDTO): Screenshot => {
    const capturedDate = c.capturedAt
      ? new Date(c.capturedAt)
      : new Date(c.createdAt)
    const timeStr = capturedDate
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: opts.timeFormat !== "24h",
        ...(opts.timezone ? { timeZone: opts.timezone } : {}),
      })
      .toLowerCase()

    const activityLevel = Math.round((Number(c.keyboardPct) + Number(c.mousePct)) / 2)
    const apps = c.apps
      ? c.apps.map((a) => a.appName.toLowerCase().replace(/\s+/g, ""))
      : []
    const appIconUrls = c.apps
      ? c.apps.reduce<Record<string, string>>((acc, a) => {
          const key = a.appName.toLowerCase().replace(/\s+/g, "")
          if (a.iconUrl) acc[key] = a.iconUrl
          return acc
        }, {})
      : undefined
    const appDisplayNames = c.apps
      ? c.apps.reduce<Record<string, string>>((acc, a) => {
          const key = a.appName.toLowerCase().replace(/\s+/g, "")
          acc[key] = a.appName // keep the real, original name for display
          return acc
        }, {})
      : undefined

    return {
      id: c.id,
      time: timeStr,
      imageUrl: c.thumbnailUrl || "",
      activityLevel,
      apps,
      appIconUrls,
      appDisplayNames,
      isNoActivity: activityLevel === 0 && (!c.apps || c.apps.length === 0) && !c.thumbnailUrl,
      isBlurred: c.isBlurred ?? false,
      accessRequested: !!c.accessRequestedAt,
      contractId: c.contractId ?? undefined,
      taskId: c.taskId ?? undefined,
      keyboardPct: c.keyboardPct,
      mousePct: c.mousePct,
    }
  }

  // One capture = one screenshot per monitor. Collapse them so the grid gets
  // one card per capture. Rows from the desktop app share a groupKey; older
  // rows have none, but every monitor of one capture carries the identical
  // timestamp, so that stands in for the key.
  const captureGroups = new Map<string, ScreenshotCardDTO[]>()
  for (const c of cards) {
    const key = c.groupKey ?? `${c.userId}|${c.capturedAt ?? c.createdAt}`
    if (!captureGroups.has(key)) captureGroups.set(key, [])
    captureGroups.get(key)!.push(c)
  }
  // Primary card id → its capture's cards, default screen first. The desktop
  // app numbers monitors "1", "2", "3" with the primary display as "1".
  const screensByPrimary = new Map<string, ScreenshotCardDTO[]>()
  for (const group of captureGroups.values()) {
    group.sort((a, b) =>
      (a.monitorId ?? "").localeCompare(b.monitorId ?? "", undefined, { numeric: true })
    )
    screensByPrimary.set(group[0].id, group)
  }

  const blocks: TimeBlock[] = []

  for (const [hourKey, { date, cards: allHourCards }] of hourMap) {
    const hourCards = allHourCards.filter((c) => screensByPrimary.has(c.id))
    const hourManual = manualByKey.get(hourKey) ?? []
    if (hourCards.length === 0 && hourManual.length === 0) continue
    const tzOpts = opts.timezone ? { timeZone: opts.timezone } : {}
    const localeHour = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: opts.timeFormat !== "24h",
      ...tzOpts,
    }).toLowerCase()
    // "2 pm" in 12h; "14:00" in 24h, where a bare "14" reads as a number.
    // Day View heads each block with the weekday instead.
    const hourLabel =
      groupBy === "day"
        ? date.toLocaleDateString("en-US", { weekday: "long", ...tzOpts })
        : opts.timeFormat === "24h"
          ? `${localeHour.replace(/:00/, "").padStart(2, "0")}:00`
          : localeHour.replace(/:00/, "")

    const dateLocale = opts.dateFormat === "DD/MM/YYYY" ? "en-GB" : "en-US"
    const dateParts = new Intl.DateTimeFormat(dateLocale, {
      month: "long",
      day: "numeric",
      year: "numeric",
      ...tzOpts,
    }).formatToParts(date)
    const part = (t: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((p) => p.type === t)?.value ?? ""
    const dayNum = Number(part("day"))
    const ordinal =
      dayNum % 100 >= 11 && dayNum % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[dayNum % 10] ?? "th"
    // "May 2nd, 2025" (design); DD/MM users get "2nd May 2025".
    const dateLabel =
      dateLocale === "en-GB"
        ? `${dayNum}${ordinal} ${part("month")} ${part("year")}`
        : `${part("month")} ${dayNum}${ordinal}, ${part("year")}`

    // Group by contractId within this hour
    const projectMap = new Map<string, ScreenshotCardDTO[]>()
    for (const c of hourCards) {
      const pid = c.contractId ?? "__none__"
      if (!projectMap.has(pid)) projectMap.set(pid, [])
      projectMap.get(pid)!.push(c)
    }

    const projects: ProjectBlock[] = []
    for (const [pid, pCards] of projectMap) {
      const screenshots: Screenshot[] = pCards.map((c) => {
        const screens = screensByPrimary.get(c.id)!.map(toScreenshot)
        return { ...screens[0], screens }
      })

      const contractId = pid === "__none__" ? null : pid
      const known = contractId ? contractMap.get(contractId) : undefined
      projects.push({
        contractId,
        // US-TT-015: "Unassigned" when there is no contract; "Unknown
        // Contract" when the id isn't among the user's contracts (only once
        // that list has loaded, so it doesn't flash while loading).
        projectName: !contractId
          ? "Unassigned"
          : (pCards[0]?.contractName ?? known?.title ??
              (contracts.length > 0 ? "Unknown Contract" : "Contract")),
        projectColor: contractColor(contractId, contracts),
        taskId: pCards[0]?.taskId ?? null,
        taskName: pCards[0]?.taskName ?? "No task assigned",
        screenshots,
      })
    }

    for (const entry of hourManual) {
      if (projects.some((p) => p.contractId === entry.contractId && p.taskId === entry.taskId)) continue
      if (projects.some((p) => p.contractId === entry.contractId && p.screenshots.length > 0)) continue
      const known = entry.contractId ? contractMap.get(entry.contractId) : undefined
      projects.push({
        contractId: entry.contractId,
        projectName: !entry.contractId
          ? "Unassigned"
          : known?.title ?? (contracts.length > 0 ? "Unknown Contract" : "Contract"),
        projectColor: contractColor(entry.contractId, contracts),
        taskId: entry.taskId,
        taskName: "No task assigned",
        screenshots: [],
      })
    }

    if (opts.contractOrder) {
      const dir = opts.contractOrder === "asc" ? 1 : -1
      projects.sort((a, b) => dir * a.projectName.localeCompare(b.projectName))
    }

    // Total seconds in this hour block (rough: count * 10min intervals)
    const totalMinutes = hourCards.length * 10
    const hrs = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const totalTime = hourCards.length > 0 ? `${hrs}:${mins.toString().padStart(2, "0")} hrs` : ""
    const manualMinutes = hourManual.reduce((sum, e) => sum + e.minutes, 0)

    blocks.push({
      id: `tb-${date.getTime()}-${date.getHours()}`,
      hour: hourLabel,
      date: dateLabel,
      totalTime,
      isManualTime: manualMinutes > 0,
      manualDuration: formatHoursMinutes(manualMinutes),
      projects,
    })
  }

  // Sort blocks by time descending
  blocks.sort((a, b) =>
    opts.oldestFirst ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
  )

  return blocks
}

// ─── Screenshot Thumbnail ───────────────────────────────────────────────

function ScreenshotThumbnail({
  screenshot,
  selected,
  onSelect,
  bulkMode,
  bulkSelected,
  onBulkToggle,
}: {
  screenshot: Screenshot
  selected: boolean
  onSelect: (id: string) => void
  bulkMode?: boolean
  bulkSelected?: boolean
  onBulkToggle?: (id: string) => void
}) {
  return (
    <div
      className="min-w-0 cursor-pointer"
      onClick={() => bulkMode ? onBulkToggle?.(screenshot.id) : onSelect(screenshot.id)}
    >
      <div
        className={cn(
          "relative aspect-[172/120] overflow-hidden rounded-md transition-shadow",
          selected && "ring-2 ring-primary-500"
        )}
      >
        {bulkMode && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <Checkbox
              checked={bulkSelected}
              onCheckedChange={() => onBulkToggle?.(screenshot.id)}
              className="bg-white shadow-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {screenshot.isNoActivity ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-gray-200 bg-white">
            <span className="text-xs text-gray-500">No Activity</span>
          </div>
        ) : screenshot.isBlurred ? (
          <div className="relative w-full h-full">
            <img
              src={screenshot.imageUrl}
              alt={`Screenshot at ${screenshot.time}`}
              className="w-full h-full object-cover blur-lg"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
              <Droplet className="size-4 text-white" />
            </div>
          </div>
        ) : screenshot.imageUrl ? (
          <img
            src={screenshot.imageUrl}
            alt={`Screenshot at ${screenshot.time}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        {/* Duplicate badge */}
        {screenshot.isDuplicate && screenshot.duplicateCount && (
          <div className="absolute bottom-2.5 left-0 flex items-center gap-1 rounded-r-md bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
            {screenshot.duplicateCount}x
            <Image01 className="size-4" />
          </div>
        )}
      </div>
      {/* Activity bar */}
      <div className="mt-[7px] h-1.5 overflow-hidden rounded-full bg-gray-200">
        {!screenshot.isNoActivity && (
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${screenshot.activityLevel}%` }}
          />
        )}
      </div>
      {/* Timestamp + app icons */}
      <div className="mt-2 flex h-5 items-center justify-between">
        <span className="text-sm leading-5 text-dark-blue-400">{screenshot.time}</span>
        {screenshot.apps.length > 0 && (
          <AppIcons
            apps={screenshot.apps}
            iconUrls={screenshot.appIconUrls}
            displayNames={screenshot.appDisplayNames}
          />
        )}
      </div>
    </div>
  )
}

// ─── Shared contract / task data ────────────────────────────────────────
// The page loads the user's contracts and their tasks once; the project
// bars, filters, transfer dialog and detail-panel pickers all read from
// here rather than keeping their own (formerly hard-coded) lists.

interface ContractOption {
  id: string
  name: string
  status: string
  color: ProjectColor
}

interface TaskOption {
  id: string
  contractId: string
  name: string
}

interface TimeTrackingData {
  contracts: ContractOption[]
  tasksByContract: Record<string, TaskOption[]>
  /** Clients see labels only (US-TT-015); no reassigning. */
  readOnly: boolean
  loadTasks: (contractId: string) => Promise<TaskOption[]>
  createTask: (contractId: string, name: string) => Promise<TaskOption>
  /** Throws on failure so callers can restore what they showed. */
  reassign: (
    ids: string[],
    data: { contractId?: string; taskId?: string | null }
  ) => Promise<void>
}

const TimeTrackingDataContext = React.createContext<TimeTrackingData | null>(null)

function useTimeTrackingData(): TimeTrackingData {
  const data = React.useContext(TimeTrackingDataContext)
  if (!data) throw new Error("useTimeTrackingData needs TimeTrackingDataContext")
  return data
}

/** Only active contracts can take newly assigned time. */
function isAssignable(contract: ContractOption): boolean {
  return contract.status.toLowerCase() === "active"
}

/** The API's own message when it sent one, otherwise the fallback copy. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message
  if (typeof message === "string" && message) return message
  if (Array.isArray(message) && typeof message[0] === "string") return message[0]
  return fallback
}

const TASK_NAME_MAX = 50

/**
 * "+ Add New Task" row for a task dropdown (US-TT-012): opens an inline input
 * with Save / Cancel, rejects empty and duplicate names (case-insensitive,
 * per contract) and stays open on an error so the name can be fixed.
 */
function AddTaskRow({
  contractId,
  onCreated,
  className,
}: {
  contractId: string
  onCreated: (task: TaskOption) => void
  className?: string
}) {
  const { tasksByContract, createTask } = useTimeTrackingData()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setAdding(false)
    setName("")
    setError(null)
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Task name is required.")
      return
    }
    const taken = (tasksByContract[contractId] ?? []).some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (taken) {
      setError("A task with this name already exists. Please choose a different name.")
      return
    }
    setSaving(true)
    try {
      const task = await createTask(contractId, trimmed)
      reset()
      onCreated(task)
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't create this task. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <div className={cn("border-t border-gray-100 px-4 py-3", className)}>
        <Button
          onClick={() => setAdding(true)}
          variant="link"
          visual="gray"
          leftIcon={<Plus className="size-4" />}
          className="w-full justify-center text-sm"
        >
          Add New Task
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2 border-t border-gray-100 px-4 py-3", className)}>
      <Input
        autoFocus
        value={name}
        maxLength={TASK_NAME_MAX}
        placeholder="Task name"
        isInvalid={!!error}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        // Keep typing out of the command list's own keyboard handling.
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter") {
            e.preventDefault()
            void save()
          }
          if (e.key === "Escape") reset()
        }}
      />
      {error && <p className="text-xs text-error-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outlined" visual="gray" size="sm" onClick={reset}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void save()} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  )
}

// ─── Project Bar ────────────────────────────────────────────────────────

/**
 * One contract's bar inside an hour block. The contract and task labels are
 * dropdowns that reassign every screenshot under the bar (US-TT-010–012):
 * changing the contract clears the task, a failed save restores the old
 * labels, and clients see the labels read-only.
 */
function ProjectBar({ project }: { project: ProjectBlock }) {
  const { contracts, tasksByContract, readOnly, loadTasks, reassign } =
    useTimeTrackingData()
  const { toast } = useToast()

  // What the bar shows right now: the saved values, or an optimistic change
  // until the refreshed timeline replaces it.
  const [contractId, setContractId] = useState(project.contractId)
  const [taskId, setTaskId] = useState(project.taskId)
  useEffect(() => {
    setContractId(project.contractId)
    setTaskId(project.taskId)
  }, [project.contractId, project.taskId])

  useEffect(() => {
    if (contractId) void loadTasks(contractId).catch(() => undefined)
  }, [contractId, loadTasks])

  // Every monitor of every capture under this bar moves together.
  const ids = project.screenshots.flatMap((s) => (s.screens ?? [s]).map((x) => x.id))
  const assignable = contracts.filter(isAssignable)
  const selectedContract = contracts.find((c) => c.id === contractId) ?? null
  const tasks = contractId ? tasksByContract[contractId] ?? [] : []
  const selectedTask = tasks.find((t) => t.id === taskId) ?? null
  const contractChanged = contractId !== project.contractId

  const contractLabel = contractChanged
    ? selectedContract?.name ?? project.projectName
    : project.projectName
  // After a contract change the task is cleared until one is picked.
  const taskLabel = selectedTask?.name ?? (contractChanged ? "Select Task" : project.taskName)

  const apply = async (
    next: { contractId: string | null; taskId: string | null },
    data: { contractId?: string; taskId?: string | null }
  ) => {
    const prev = { contractId, taskId }
    setContractId(next.contractId)
    setTaskId(next.taskId)
    try {
      await reassign(ids, data)
    } catch (err) {
      setContractId(prev.contractId)
      setTaskId(prev.taskId)
      toast({
        title: "Update failed",
        description: apiErrorMessage(
          err,
          "We couldn't update this assignment. The original value has been restored."
        ),
        variant: "destructive",
      })
    }
  }

  const selectContract = (option: ContractOption | null) => {
    if (!option || option.id === contractId) return
    // The task never carries over to another contract.
    void apply({ contractId: option.id, taskId: null }, { contractId: option.id, taskId: null })
  }

  const selectTask = (option: TaskOption | null) => {
    if (!option || option.id === taskId || !contractId) return
    void apply({ contractId, taskId: option.id }, { taskId: option.id })
  }

  const barClass = cn(
    "flex h-9 min-w-0 items-center gap-3 overflow-hidden rounded-md pl-3 pr-3",
    projectBarColors[project.projectColor]
  )
  const nameClass = cn(
    "inline-flex items-center gap-2 text-base font-semibold leading-6",
    projectLabelColors[project.projectColor]
  )
  const taskClass = cn(
    "inline-flex min-w-0 items-center gap-2 text-base leading-6",
    projectTaskColors[project.projectColor]
  )

  if (readOnly || ids.length === 0) {
    return (
      <div className={barClass}>
        <span className={cn(nameClass, "min-w-0")}>
          <span className="truncate">{contractLabel}</span>
        </span>
        <div className="h-[18px] w-px shrink-0 bg-black/10" />
        <span className={taskClass}>
          <span className="truncate">{taskLabel}</span>
        </span>
      </div>
    )
  }

  return (
    <div className={barClass}>
      <DropdownPopover selected={selectedContract ?? undefined} onSelectedChange={selectContract}>
        <DropdownPopoverTrigger className="h-auto w-auto min-w-0 max-w-full shrink border-0 bg-transparent p-0 text-left shadow-none ring-0 hover:bg-transparent data-[state=open]:border-0 data-[state=open]:bg-transparent data-[state=open]:ring-0">
          <span className={cn(nameClass, "min-w-0")}>
            <span className="truncate">{contractLabel}</span>
            <ChevronDown className="size-4 shrink-0" />
          </span>
        </DropdownPopoverTrigger>
        <DropdownPopoverContent
          sideOffset={4}
          className="w-[448px] max-w-[calc(100vw-3rem)] rounded-xl border border-gray-100 p-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]"
        >
          <DropdownCommand>
            <InputGroup>
              <InputLeftElement className="w-8 text-gray-400">
                <SearchSm className="size-4" />
              </InputLeftElement>
              <DropdownCommandInput placeholder="Find contracts" className="pl-8" />
            </InputGroup>
            <DropdownCommandEmpty>
              {assignable.length === 0 ? "No contracts available." : "No contracts found."}
            </DropdownCommandEmpty>
            <ScrollArea className="max-h-[224px]" type="always">
              <DropdownCommandGroup className="py-1">
                {assignable.map((option) => (
                  <DropdownCommandItem
                    key={option.id}
                    itemValue={option}
                    value={`${option.name} ${option.id}`}
                    className="items-center gap-3 px-4 py-3 text-left data-[state=selected]:bg-gray-50"
                  >
                    <Avatar
                      size="sm"
                      className={cn("hover:ring-0 active:ring-0", projectBarColors[option.color])}
                    >
                      {/* The initial sits on the coloured root: AvatarFallback
                          drops className, so it can't take the contract colour. */}
                      <span
                        className={cn(
                          "flex size-full items-center justify-center text-sm font-semibold",
                          projectLabelColors[option.color]
                        )}
                      >
                        {option.name.charAt(0).toUpperCase()}
                      </span>
                    </Avatar>
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-dark-blue-400">
                      {option.name}
                    </div>
                  </DropdownCommandItem>
                ))}
              </DropdownCommandGroup>
            </ScrollArea>
          </DropdownCommand>
        </DropdownPopoverContent>
      </DropdownPopover>

      <div className="h-[18px] w-px shrink-0 bg-black/10" />

      <DropdownPopover selected={selectedTask ?? undefined} onSelectedChange={selectTask}>
        <DropdownPopoverTrigger
          disabled={!contractId}
          className="h-auto w-auto min-w-0 flex-1 justify-start border-0 bg-transparent p-0 text-left shadow-none ring-0 hover:bg-transparent data-[state=open]:border-0 data-[state=open]:bg-transparent data-[state=open]:ring-0"
        >
          <span className={taskClass}>
            <span className="truncate">{taskLabel}</span>
            {contractId && <Edit03 className="size-[15px] shrink-0" />}
          </span>
        </DropdownPopoverTrigger>
        {contractId && (
          <DropdownPopoverContent
            align="start"
            sideOffset={4}
            className="w-[462px] max-w-[calc(100vw-3rem)] rounded-xl border border-gray-100 p-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]"
          >
            <DropdownCommand>
              <InputGroup>
                <InputLeftElement className="w-8 text-gray-400">
                  <SearchSm className="size-4" />
                </InputLeftElement>
                <DropdownCommandInput placeholder="Find Tasks" className="pl-8" />
              </InputGroup>
              <DropdownCommandEmpty>
                {tasks.length === 0 ? "No tasks yet for this contract." : "No tasks found."}
              </DropdownCommandEmpty>
              <ScrollArea className="max-h-[224px]" type="always">
                <DropdownCommandGroup className="py-1">
                  {tasks.map((option) => (
                    <DropdownCommandItem
                      key={option.id}
                      itemValue={option}
                      value={`${option.name} ${option.id}`}
                      className={cn(
                        "px-4 py-3 text-left text-sm font-medium data-[state=selected]:bg-gray-50",
                        option.id === taskId ? "text-dark-blue-400" : "text-gray-500"
                      )}
                    >
                      {option.name}
                    </DropdownCommandItem>
                  ))}
                </DropdownCommandGroup>
              </ScrollArea>
            </DropdownCommand>
            <AddTaskRow contractId={contractId} onCreated={(task) => selectTask(task)} />
          </DropdownPopoverContent>
        )}
      </DropdownPopover>
    </div>
  )
}

// ─── Time Block ─────────────────────────────────────────────────────────

function TimeBlockCard({
  block,
  selectedScreenshotId,
  onSelectScreenshot,
  bulkMode,
  selectedScreenshots,
  onBulkToggle,
  showCheckbox,
  onToggleBlock,
}: {
  block: TimeBlock
  selectedScreenshotId: string | null
  onSelectScreenshot: (id: string) => void
  bulkMode?: boolean
  selectedScreenshots?: Set<string>
  onBulkToggle?: (id: string) => void
  showCheckbox?: boolean
  onToggleBlock?: (ids: string[], checked: boolean) => void
}) {
  const blockIds = block.projects.flatMap((p) => p.screenshots.map((s) => s.id))
  const blockChecked =
    blockIds.length > 0 && blockIds.every((id) => selectedScreenshots?.has(id))
  // Each bar sits over its own screenshots in the six-column grid; the last
  // bar runs to the end of the row. Past six captures the columns no longer
  // line up, so the bars just share the row.
  const shotCount = blockIds.length
  const alignBars = block.projects.length > 1 && shotCount <= 6
  const barSpans = block.projects.map((p, i) =>
    i === block.projects.length - 1
      ? 6 - block.projects.slice(0, i).reduce((n, q) => n + q.screenshots.length, 0)
      : p.screenshots.length
  )

  return (
    <div>
      {/* Block header */}
      <div className="flex h-9 items-center justify-between">
        <div className="flex items-center gap-2">
          {showCheckbox && blockIds.length > 0 && (
            <div className="flex size-9 items-center justify-center">
              <Checkbox
                checked={blockChecked}
                onCheckedChange={(checked) => onToggleBlock?.(blockIds, checked === true)}
                size="md"
                className="hover:ring-0 active:ring-0"
              />
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-dark-blue-400">{block.hour}</h3>
            <span className="text-base text-dark-blue-400">{block.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {block.isManualTime && (
            <Badge size="lg" className="rounded-md text-dark-blue-400">
              Manual time <span className="font-bold">{block.manualDuration}</span>
            </Badge>
          )}
          {block.totalTime && (
            <span className="text-base text-dark-blue-400">{block.totalTime}</span>
          )}
        </div>
      </div>

      {/* Project bars + screenshots */}
      <div className="mt-4">
        {alignBars ? (
          <div className="grid grid-cols-6 gap-x-6">
            {block.projects.map((project, i) => (
              <div key={i} className={barColSpan[barSpans[i]] ?? "col-span-1"}>
                <ProjectBar project={project} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-6">
            {block.projects.map((project, i) => (
              <div key={i} className="min-w-0 flex-1">
                <ProjectBar project={project} />
              </div>
            ))}
          </div>
        )}

        {/* Screenshots — at most six per row, wrapping instead of scrolling */}
        <div className={cn("mt-[17px] grid grid-cols-6 gap-6", blockIds.length === 0 && "hidden")}>
          {block.projects.flatMap((project, pi) =>
            project.screenshots.map((screenshot, si) => (
              <ScreenshotThumbnail
                key={`${pi}-${si}`}
                screenshot={screenshot}
                selected={selectedScreenshotId === screenshot.id}
                onSelect={onSelectScreenshot}
                bulkMode={bulkMode}
                bulkSelected={selectedScreenshots?.has(screenshot.id)}
                onBulkToggle={onBulkToggle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Bulk action dialogs (Figma "Edit Modals") ──────────────────────────
// Every bulk action on the selection opens one of these. They share the
// Figma modal frame: 488px wide, 24px padding, 32px between sections, an ✕
// in the corner and right-aligned Cancel / primary buttons.

const MODAL_CLASS = "flex max-w-[488px] flex-col gap-y-8"

/** "3 hours 15 mins" for titles, "3h 15m" for summaries. */
function formatDuration(minutes: number, style: "long" | "short"): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (style === "short") return h > 0 ? `${h}h ${m}m` : `${m}m`
  const hours = h > 0 ? `${h} hour${h === 1 ? "" : "s"}` : ""
  const mins = m > 0 || h === 0 ? `${m} min${m === 1 ? "" : "s"}` : ""
  return [hours, mins].filter(Boolean).join(" ")
}

function pluralShots(count: number): string {
  return `${count} screenshot${count === 1 ? "" : "s"}`
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-x-4">
      <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
        {title}
      </DialogTitle>
      <IconButton
        variant="ghost"
        visual="gray"
        size="sm"
        className="-mr-1.5 -mt-1 shrink-0 text-gray-500"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="size-5" />
      </IconButton>
    </div>
  )
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-x-3">{children}</div>
}

/** What the selection is on now; null ids mean the selection is mixed. */
interface SelectionSource {
  contractId: string | null
  contractName: string
  taskId: string | null
  taskName: string
}

function ContractAvatar({ option }: { option: ContractOption }) {
  return (
    <Avatar
      size="xs"
      className={cn("shrink-0 hover:ring-0 active:ring-0", projectBarColors[option.color])}
    >
      <span
        className={cn(
          "flex size-full items-center justify-center text-xs font-semibold",
          projectLabelColors[option.color]
        )}
      >
        {option.name.charAt(0).toUpperCase()}
      </span>
    </Avatar>
  )
}

/**
 * Edit Details (Edit / Transfer / Change Task in the bulk bar). Picks a
 * contract and a task — or a new task typed in place — then confirms:
 * a contract change is a transfer, a task-only change is a reassignment.
 */
function EditDetailsDialog({
  open,
  onOpenChange,
  count,
  minutes,
  source,
  onApply,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  minutes: number
  source: SelectionSource
  onApply: (contractId: string, taskId: string | null) => Promise<void>
}) {
  const { contracts, tasksByContract, loadTasks, createTask } = useTimeTrackingData()
  const [contractId, setContractId] = useState("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<"edit" | "transfer" | "task">("edit")
  const [saving, setSaving] = useState(false)
  const [contractOpen, setContractOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setContractId(source.contractId ?? "")
    setTaskId(source.taskId)
    setAddingTask(false)
    setNewTaskName("")
    setError(null)
    setStep("edit")
    setSaving(false)
  }, [open, source.contractId, source.taskId])

  useEffect(() => {
    if (contractId) void loadTasks(contractId).catch(() => undefined)
  }, [contractId, loadTasks])

  const assignable = contracts.filter(isAssignable)
  const contract = contracts.find((c) => c.id === contractId) ?? null
  const tasks = contractId ? tasksByContract[contractId] ?? [] : []
  const task = tasks.find((t) => t.id === taskId) ?? null
  const targetTaskName = addingTask ? newTaskName.trim() : task?.name ?? ""

  const contractChanged = contractId !== (source.contractId ?? "")
  const taskChanged = addingTask ? !!newTaskName.trim() : taskId !== source.taskId
  const canSave = !!contractId && (!addingTask || !!newTaskName.trim())

  const close = () => onOpenChange(false)

  const save = () => {
    if (!canSave) return
    if (addingTask) {
      const name = newTaskName.trim()
      if (tasks.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        setError("A task with this name already exists. Please choose a different name.")
        return
      }
    }
    if (contractChanged) setStep("transfer")
    else if (taskChanged) setStep("task")
    else close()
  }

  const confirm = async () => {
    setSaving(true)
    try {
      let nextTaskId = addingTask ? null : taskId
      if (addingTask) nextTaskId = (await createTask(contractId, newTaskName.trim())).id
      await onApply(contractId, nextTaskId)
      close()
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't save these changes. Please try again."))
      setStep("edit")
    } finally {
      setSaving(false)
    }
  }

  const summary = (
    <div className="flex items-center gap-x-3 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-dark-blue-400">
      <span className="inline-flex items-center gap-x-2">
        <Image01 className="size-4 text-gray-500" />
        {pluralShots(count)}
      </span>
      <span className="size-1 rounded-full bg-gray-300" />
      <span className="inline-flex items-center gap-x-2">
        <Clock className="size-4 text-gray-500" />
        {formatDuration(minutes, "short")}
      </span>
    </div>
  )

  const card = (title: string, sub?: string, icon?: React.ReactNode) => (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-2 rounded-lg border-2 border-gray-200 bg-gray-25 px-3 py-3">
      {icon}
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-dark-blue-400">{title}</p>
        {sub && <p className="truncate text-sm text-gray-500">{sub}</p>}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CLASS}>
        {step === "transfer" ? (
          <>
            <div className="flex flex-col gap-y-2">
              <ModalHeader
                title={`Transfer ${formatDuration(minutes, "long")} to ${contract?.name ?? "this contract"}?`}
                onClose={close}
              />
              <p className="text-sm text-gray-500">
                {formatDuration(minutes, "short")} will be moved to {contract?.name}
              </p>
            </div>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-stretch gap-x-4">
                {card(
                  source.contractName,
                  undefined,
                  <span className="flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-primary-500">
                    <Send01 className="size-4" />
                  </span>
                )}
                <ArrowRight className="size-6 shrink-0 self-center text-gray-400" />
                {card(
                  contract?.name ?? "",
                  targetTaskName || undefined,
                  contract ? <ContractAvatar option={contract} /> : undefined
                )}
              </div>
              {summary}
            </div>
            <ModalFooter>
              <Button variant="outlined" visual="gray" size="md" onClick={() => setStep("edit")} disabled={saving}>
                Cancel
              </Button>
              <Button size="md" onClick={() => void confirm()} loading={saving}>
                Confirm
              </Button>
            </ModalFooter>
          </>
        ) : step === "task" ? (
          <>
            <div className="flex flex-col gap-y-2">
              <ModalHeader title="Change assigned task?" onClose={close} />
              <p className="text-sm text-gray-500">
                {formatDuration(minutes, "short")} will be reassigned to “{targetTaskName}”
              </p>
            </div>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-stretch gap-x-4">
                {card(source.taskName, `(${source.contractName})`)}
                <ArrowRight className="size-6 shrink-0 self-center text-gray-400" />
                {card(targetTaskName, `(${contract?.name ?? source.contractName})`)}
              </div>
              {summary}
            </div>
            <ModalFooter>
              <Button variant="outlined" visual="gray" size="md" onClick={() => setStep("edit")} disabled={saving}>
                Cancel
              </Button>
              <Button size="md" onClick={() => void confirm()} loading={saving}>
                Confirm
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-y-2">
              <ModalHeader title="Edit Details" onClose={close} />
              <p className="text-base font-semibold text-primary-500">
                {pluralShots(count)} selected
              </p>
              <p className="text-sm text-gray-500">
                Change the task or project for the selected screenshots.
                <br />
                This change will apply to all selected time blocks.
              </p>
            </div>

            <div className="flex flex-col gap-y-6">
              <div className="flex flex-col gap-y-1.5">
                <Label size="sm" className="text-dark-blue-400">Contract</Label>
                <DropdownPopover
                  open={contractOpen}
                  onOpenChange={setContractOpen}
                  selected={contract ?? undefined}
                  onSelectedChange={(option: ContractOption | null) => {
                    if (!option || option.id === contractId) return
                    setContractId(option.id)
                    // A task never carries over to another contract.
                    setTaskId(null)
                    setError(null)
                    setContractOpen(false)
                  }}
                >
                  <DropdownPopoverTrigger className="gap-x-2 text-left">
                    {contract ? (
                      <span className="flex min-w-0 flex-1 items-center gap-x-2">
                        <ContractAvatar option={contract} />
                        <span className="truncate text-base text-dark-blue-400">
                          {contract.name}
                        </span>
                      </span>
                    ) : (
                      <span className="flex-1 truncate text-base text-gray-500">
                        {source.contractId === null && source.contractName
                          ? source.contractName
                          : "Select Contract"}
                      </span>
                    )}
                    <ChevronDown className="size-5 shrink-0 text-gray-500" />
                  </DropdownPopoverTrigger>
                  <DropdownPopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-lg border border-gray-100 p-0">
                    <DropdownCommand>
                      <InputGroup className="w-full border-b border-gray-100">
                        <InputLeftElement className="w-8 text-gray-400">
                          <SearchSm className="size-4" />
                        </InputLeftElement>
                        <DropdownCommandInput placeholder="Find contracts" className="pl-8" />
                      </InputGroup>
                      <DropdownCommandEmpty>
                        {assignable.length === 0 ? "No contracts available." : "No contracts found."}
                      </DropdownCommandEmpty>
                      <ScrollArea className="max-h-[224px]" type="always">
                        <DropdownCommandGroup className="py-1">
                          {assignable.map((option) => (
                            <DropdownCommandItem
                              key={option.id}
                              itemValue={option}
                              value={`${option.name} ${option.id}`}
                              className="items-center gap-3 px-3 py-2.5 text-left data-[state=selected]:bg-gray-50"
                            >
                              <ContractAvatar option={option} />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-blue-400">
                                {option.name}
                              </span>
                            </DropdownCommandItem>
                          ))}
                        </DropdownCommandGroup>
                      </ScrollArea>
                    </DropdownCommand>
                  </DropdownPopoverContent>
                </DropdownPopover>
              </div>

              <div className="flex flex-col gap-y-1.5">
                <div className="flex items-center justify-between">
                  <Label size="sm" className="text-dark-blue-400">
                    {addingTask ? "Add Task" : "Task"}
                  </Label>
                  {addingTask && (
                    <Button
                      variant="link"
                      visual="gray"
                      size="sm"
                      leftIcon={<Plus className="size-4" />}
                      onClick={() => {
                        setAddingTask(false)
                        setNewTaskName("")
                        setError(null)
                      }}
                    >
                      Add Existing Task
                    </Button>
                  )}
                </div>
                {addingTask ? (
                  <Textarea
                    autoFocus
                    value={newTaskName}
                    maxLength={TASK_NAME_MAX}
                    placeholder="What are you working on?"
                    isInvalid={!!error}
                    onChange={(e) => {
                      setNewTaskName(e.target.value)
                      setError(null)
                    }}
                  />
                ) : (
                  <DropdownPopover
                    open={taskOpen}
                    onOpenChange={setTaskOpen}
                    selected={task ?? undefined}
                    onSelectedChange={(option: TaskOption | null) => {
                      if (!option) return
                      setTaskId(option.id)
                      setError(null)
                      setTaskOpen(false)
                    }}
                  >
                    <DropdownPopoverTrigger disabled={!contractId} className="gap-x-2 text-left disabled:cursor-not-allowed disabled:bg-gray-50">
                      <span
                        className={cn(
                          "flex-1 truncate text-base",
                          task ? "text-dark-blue-400" : "text-gray-500"
                        )}
                      >
                        {task?.name ?? "Select Task"}
                      </span>
                      <ChevronDown className="size-5 shrink-0 text-gray-500" />
                    </DropdownPopoverTrigger>
                    <DropdownPopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-lg border border-gray-100 p-0">
                      <DropdownCommand>
                        <InputGroup className="w-full border-b border-gray-100">
                          <InputLeftElement className="w-8 text-gray-400">
                            <SearchSm className="size-4" />
                          </InputLeftElement>
                          <DropdownCommandInput placeholder="Find tasks" className="pl-8" />
                        </InputGroup>
                        <DropdownCommandEmpty>
                          {tasks.length === 0 ? "No tasks yet for this contract." : "No tasks found."}
                        </DropdownCommandEmpty>
                        <ScrollArea className="max-h-[224px]" type="always">
                          <DropdownCommandGroup className="py-1">
                            {tasks.map((option) => (
                              <DropdownCommandItem
                                key={option.id}
                                itemValue={option}
                                value={`${option.name} ${option.id}`}
                                className="px-3 py-2.5 text-left text-sm text-dark-blue-400 data-[state=selected]:bg-gray-50"
                              >
                                {option.name}
                              </DropdownCommandItem>
                            ))}
                          </DropdownCommandGroup>
                        </ScrollArea>
                      </DropdownCommand>
                      <div className="border-t border-gray-100 px-4 py-3">
                        <Button
                          variant="link"
                          visual="gray"
                          leftIcon={<Plus className="size-4" />}
                          className="w-full justify-center text-sm"
                          onClick={() => {
                            setTaskOpen(false)
                            setAddingTask(true)
                          }}
                        >
                          Add New Task
                        </Button>
                      </div>
                    </DropdownPopoverContent>
                  </DropdownPopover>
                )}
                {error && <p className="text-sm text-error-500">{error}</p>}
              </div>
            </div>

            <ModalFooter>
              <Button variant="outlined" visual="gray" size="md" onClick={close}>
                Cancel
              </Button>
              <Button size="md" disabled={!canSave} onClick={save}>
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

type DownloadFormat = "pdf" | "jpg"

/** Download Screenshots: the selection or everything on screen, as one ZIP of PDFs (one per screenshot) or JPGs. */
function DownloadScreenshotsDialog({
  open,
  onOpenChange,
  selectedCount,
  totalCount,
  onDownload,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedCount: number
  totalCount: number
  onDownload: (scope: "selected" | "all", format: DownloadFormat) => Promise<void>
}) {
  const [scope, setScope] = useState<"selected" | "all">("selected")
  const [format, setFormat] = useState<DownloadFormat | "">("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setScope(selectedCount > 0 ? "selected" : "all")
    setFormat("")
    setBusy(false)
  }, [open, selectedCount])

  const close = () => onOpenChange(false)
  const scopes = [
    { value: "selected" as const, label: "Download Selected", disabled: selectedCount === 0 },
    { value: "all" as const, label: "Download All", disabled: totalCount === 0 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CLASS}>
        <div className="flex flex-col gap-y-2">
          <ModalHeader title="Download Screenshots" onClose={close} />
          <p className="text-base font-semibold text-primary-500">
            {pluralShots(scope === "all" ? totalCount : selectedCount)} selected
          </p>
        </div>

        <div className="flex flex-col gap-y-6">
          <div className="flex flex-col gap-y-2.5">
            {scopes.map((opt) => (
              <div key={opt.value} className="flex items-center gap-x-2">
                <Checkbox
                  id={`tt-download-${opt.value}`}
                  variant="circular"
                  checked={scope === opt.value}
                  disabled={opt.disabled}
                  onCheckedChange={() => setScope(opt.value)}
                />
                <Label htmlFor={`tt-download-${opt.value}`} className="text-base font-normal text-dark-blue-400">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-y-1.5">
            <Label size="sm" className="text-dark-blue-400">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as DownloadFormat)}>
              <SelectTrigger className="w-full text-base text-dark-blue-400">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outlined" visual="gray" size="md" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="md"
            leftIcon={<Download className="size-5" />}
            disabled={!format}
            loading={busy}
            onClick={async () => {
              if (!format) return
              setBusy(true)
              try {
                await onDownload(scope, format)
                close()
              } finally {
                setBusy(false)
              }
            }}
          >
            Download
          </Button>
        </ModalFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Blur Screenshots and Delete Screenshots: both name the count, explain the
 * effect and need a reason before the action button turns on.
 */
function ReasonActionDialog({
  kind,
  open,
  onOpenChange,
  count,
  onConfirm,
}: {
  kind: "blur" | "delete"
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setReason("")
      setBusy(false)
    }
  }, [open])

  const isBlur = kind === "blur"
  const close = () => !busy && onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className={MODAL_CLASS}>
        <div className="flex flex-col gap-y-2">
          <ModalHeader title={isBlur ? "Blur Screenshots" : "Delete Screenshots"} onClose={close} />
          <p className="text-base text-dark-blue-400">
            {isBlur ? "You are about to blur " : "You are about to permanently delete "}
            <span className="font-semibold">{pluralShots(count)}.</span>
          </p>
        </div>

        <div className="flex flex-col gap-y-6">
          {isBlur ? (
            <Alert className="items-center gap-x-3 p-4">
              <AlertIcon>
                <InfoCircle className="size-5 text-gray-500" />
              </AlertIcon>
              <AlertDescription className="mt-0 text-sm font-medium text-gray-600">
                Screenshots will be marked as “Blurred for Privacy.”
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning" className="gap-x-3 p-4">
              <AlertIcon>
                <AlertTriangle className="size-5 text-warning-500" />
              </AlertIcon>
              <AlertDescription className="mt-0 text-sm font-semibold text-warning-600">
                This action can’t be undone and any time tracking related to these screenshots will
                also be deleted
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-y-1.5">
            <Label size="sm" htmlFor={`tt-${kind}-reason`} className="text-dark-blue-400">
              Reason
            </Label>
            <Textarea
              id={`tt-${kind}-reason`}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isBlur
                  ? "Please tell us why you are blurring them"
                  : "Please tell us why you are deleting them"
              }
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outlined" visual="gray" size="md" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="md"
            visual={isBlur ? "primary" : "error"}
            leftIcon={isBlur ? <Droplet className="size-5" /> : <Trash01 className="size-5" />}
            disabled={!reason.trim()}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm(reason.trim())
              } finally {
                setBusy(false)
              }
              onOpenChange(false)
            }}
          >
            {isBlur ? "Blur" : "Delete"}
          </Button>
        </ModalFooter>
      </DialogContent>
    </Dialog>
  )
}


// ─── Time Tracking Settings Dialog (US-TT-038 through US-TT-044) ──────────
// "America/Argentina/Buenos_Aires" → "Buenos Aires"
function timezoneCity(timeZone: string) {
  if (timeZone === "UTC") return "UTC"
  return (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ")
}

// Offset in minutes for today, so DST shifts are reflected. "GMT+5:30" → 330.
function timezoneOffsetMinutes(timeZone: string) {
  try {
    const offset =
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (!match) return 0
    const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0)
    return match[1] === "-" ? -minutes : minutes
  } catch {
    return 0
  }
}

// Every IANA time zone in TIME_ZONES plus UTC, west to east.
const TIMEZONE_OPTIONS: { value: string; city: string }[] = [...TIME_ZONES, "UTC"]
  .map((value) => ({ value, city: timezoneCity(value), offset: timezoneOffsetMinutes(value) }))
  .sort((a, b) => a.offset - b.offset || a.city.localeCompare(b.city))
  .map(({ value, city }) => ({ value, city }))

// Keeps a saved zone selectable even if it isn't in TIME_ZONES (e.g. "Asia/Calcutta").
function timezoneOptionsWith(timeZone: string) {
  return TIMEZONE_OPTIONS.some((tz) => tz.value === timeZone)
    ? TIMEZONE_OPTIONS
    : [{ value: timeZone, city: timezoneCity(timeZone) }, ...TIMEZONE_OPTIONS]
}

// "UTC−4 New York" — offset is computed for today so DST shifts are reflected.
function formatTimezoneLabel(timeZone: string, city: string) {
  if (timeZone === "UTC") return "UTC"
  try {
    const offset =
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    return `${offset.replace("GMT", "UTC").replace("-", "−")} ${city}`
  } catch {
    return city
  }
}

type SettingsTab = "time" | "manual" | "preferences" | "permissions" | "notifications"

// Talent sees their own preferences; the client sees the per-contract rules.
const SETTINGS_TABS: {
  value: SettingsTab
  label: string
  Icon: typeof Clock
  side: "talent" | "client"
}[] = [
  { value: "time", label: "Time & Display", Icon: Clock, side: "talent" },
  { value: "manual", label: "Manual Time", Icon: Clock, side: "client" },
  { value: "preferences", label: "Screenshot Preferences", Icon: Monitor01, side: "talent" },
  { value: "permissions", label: "Screenshot Permissions", Icon: Monitor01, side: "client" },
  { value: "notifications", label: "Notifications", Icon: Bell01, side: "talent" },
]

const DEFAULT_RULES: ScreenshotRulesDTO = {
  allowDelete: true,
  allowBlur: true,
  autoApproveBlur: false,
  allowReassign: true,
  deletedNonBillable: true,
  blurredBillable: true,
  requireDeleteApproval: false,
  manualTimeEnabled: true,
  manualTimeRequireApproval: true,
  manualTimeRequireReason: true,
}

function TimeTrackingSettingsDialog({
  open,
  onOpenChange,
  isClient,
  contracts,
  onPreferencesSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  isClient: boolean
  contracts: { id: string; name: string }[]
  onPreferencesSaved?: (prefs: TimePreferencesDTO) => void
}) {
  // Time & Display, Screenshot Preferences and Notifications are the talent's
  // own preferences. Manual Time and Screenshot Permissions are the client's
  // per-contract rules. Each side only sees its own panels.
  const visibleTabs = SETTINGS_TABS.filter((t) => t.side === (isClient ? "client" : "talent"))
  const [activeTab, setActiveTab] = useState<SettingsTab>(visibleTabs[0].value)
  useEffect(() => {
    if (!visibleTabs.some((t) => t.value === activeTab)) setActiveTab(visibleTabs[0].value)
  }, [isClient])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // ── Time & Display prefs ──
  const [timezone, setTimezone] = useState("America/New_York")
  const [dateFormat, setDateFormat] = useState<"MM/DD/YYYY" | "DD/MM/YYYY">("MM/DD/YYYY")
  const [startOfWeek, setStartOfWeek] = useState<"Sunday" | "Monday">("Sunday")
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h")

  // ── Screenshot preferences ──
  const [defaultScreenshotView, setDefaultScreenshotView] = useState<"hour" | "day">("hour")
  const [showTooltips, setShowTooltips] = useState(true)
  const [captureMode, setCaptureMode] = useState<"active" | "all">("active")

  // ── Notifications ──
  const [notifyManualTime, setNotifyManualTime] = useState(true)
  const [notifyReassignment, setNotifyReassignment] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [notifyScreenshotComments, setNotifyScreenshotComments] = useState(true)

  // ── Per-contract rules (Manual Time + Screenshot Permissions) ──
  const [selectedContract, setSelectedContract] = useState(contracts[0]?.id ?? "")
  // Contracts load after the page mounts; pick the first once they arrive.
  useEffect(() => {
    if (!contracts.some((c) => c.id === selectedContract)) {
      setSelectedContract(contracts[0]?.id ?? "")
    }
  }, [contracts, selectedContract])
  const [rules, setRules] = useState<ScreenshotRulesDTO>(DEFAULT_RULES)
  const setRule = (key: keyof ScreenshotRulesDTO) => (v: boolean) =>
    setRules((prev) => ({ ...prev, [key]: v }))

  // Fetch user prefs on open
  useEffect(() => {
    if (!open || isClient) return
    getTimePreferences()
      .then((data) => {
        setTimezone(data.timezone ?? "America/New_York")
        setDateFormat(data.dateFormat ?? "MM/DD/YYYY")
        setStartOfWeek(data.startOfWeek ?? "Sunday")
        setTimeFormat(data.timeFormat ?? "12h")
        setDefaultScreenshotView(data.defaultScreenshotView ?? "hour")
        setShowTooltips(data.showTooltips ?? true)
        setCaptureMode(data.captureMode ?? "active")
        setNotifyManualTime(data.notifyManualTime ?? true)
        setNotifyReassignment(data.notifyReassignment ?? true)
        setNotifyWeeklyReport(data.notifyWeeklyReport ?? true)
        setNotifyScreenshotComments(data.notifyScreenshotComments ?? true)
      })
      .catch(() => {
        toast({ title: "Error", description: "Couldn't load your preferences.", variant: "destructive" })
      })
  }, [open, isClient])

  // Fetch the selected contract's rules
  useEffect(() => {
    if (!open || !isClient || !selectedContract) return
    getScreenshotRules(selectedContract)
      .then((data) => setRules({ ...DEFAULT_RULES, ...data }))
      .catch(() => {
        toast({ title: "Error", description: "Couldn't load this contract's settings.", variant: "destructive" })
      })
  }, [open, isClient, selectedContract])

  const isRulesTab = activeTab === "manual" || activeTab === "permissions"

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isRulesTab) {
        if (!selectedContract) return
        await updateScreenshotRules(selectedContract, {
          allowDelete: rules.allowDelete,
          allowBlur: rules.allowBlur,
          autoApproveBlur: rules.autoApproveBlur,
          allowReassign: rules.allowReassign,
          deletedNonBillable: rules.deletedNonBillable,
          blurredBillable: rules.blurredBillable,
          requireDeleteApproval: rules.requireDeleteApproval,
          manualTimeEnabled: rules.manualTimeEnabled,
          manualTimeRequireApproval: rules.manualTimeRequireApproval,
          manualTimeRequireReason: rules.manualTimeRequireReason,
        })
        toast({ title: "Saved", description: "Settings updated for this contract." })
      } else {
        const saved = await updateTimePreferences({
          timezone,
          dateFormat,
          startOfWeek,
          timeFormat,
          defaultScreenshotView,
          showTooltips,
          captureMode,
          notifyManualTime,
          notifyReassignment,
          notifyWeeklyReport,
          notifyScreenshotComments,
        })
        onPreferencesSaved?.(saved)
        toast({ title: "Saved", description: "Your settings have been updated." })
      }
      onOpenChange(false)
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const contractPicker = (
    <div className="flex flex-col gap-y-1.5">
      <Label size="sm" className="text-dark-blue-400">Select Contract</Label>
      <Select value={selectedContract} onValueChange={setSelectedContract}>
        <SelectTrigger className="w-full text-base text-dark-blue-400">
          <SelectValue placeholder="No contracts" />
        </SelectTrigger>
        <SelectContent>
          {contracts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-x-2">
                <Avatar size="xs">
                  <AvatarFallback>{c.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Alert variant="default" className="mt-2.5 gap-x-2 p-4">
        <AlertIcon className="flex pt-0.5">
          <InfoCircle className="size-4 text-gray-500" />
        </AlertIcon>
        <AlertDescription className="mt-0 text-sm font-medium text-gray-600">
          Changes will apply to selected contract screenshots only
        </AlertDescription>
      </Alert>
    </div>
  )

  // Title + description on the left, switch on the right.
  const switchRow = (
    id: string,
    title: string,
    description: string,
    checked: boolean,
    onChange: (v: boolean) => void,
    opts: { titleClassName?: string; descriptionClassName?: string } = {}
  ) => (
    <div className="flex items-start justify-between gap-x-6">
      <div className="flex flex-col gap-y-0.5">
        <Label
          htmlFor={id}
          className={cn("text-sm font-semibold leading-6 text-dark-blue-400", opts.titleClassName)}
        >
          {title}
        </Label>
        <p className={cn("text-sm leading-6 text-gray-500", opts.descriptionClassName)}>
          {description}
        </p>
      </div>
      <Switch
        id={id}
        size="md"
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )

  // Single-line permission row, optionally with an info tooltip.
  const permissionRow = (
    id: string,
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
    hint?: string
  ) => (
    <div className="flex items-center justify-between gap-x-6">
      <span className="flex items-center gap-x-1.5">
        <Label htmlFor={id} className="text-sm font-normal leading-6 text-dark-blue-400">
          {label}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex text-gray-500">
                <InfoCircle className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        )}
      </span>
      <Switch
        id={id}
        size="md"
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )

  const activeTabMeta = visibleTabs.find((t) => t.value === activeTab) ?? visibleTabs[0]
  const ActiveIcon = activeTabMeta.Icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="unanimated"
        className="right-0 top-0 h-full w-full sm:max-w-[480px] bg-white shadow-xl flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-200 px-6">
          <DialogTitle className="text-base font-semibold text-dark-blue-400">
            Settings
          </DialogTitle>
          <DialogClose asChild>
            <IconButton size="sm" variant="ghost" visual="gray" aria-label="Close settings">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        <TooltipProvider>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col divide-y divide-gray-200">
              <div className="py-6">
                <Select value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
                  <SelectTrigger className="w-full text-base text-dark-blue-400">
                    <span className="flex items-center gap-x-2.5">
                      <ActiveIcon className="size-[18px] text-gray-500" />
                      <SelectValue>{activeTabMeta.label}</SelectValue>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {visibleTabs.map(({ value, label, Icon }) => (
                      <SelectItem key={value} value={value} className="text-sm">
                        <span className="flex items-center gap-x-2">
                          <Icon className="size-4 text-gray-500" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeTab === "time" && (
                <div className="flex flex-col gap-y-6 py-6">
                  <div className="flex flex-col gap-y-1.5">
                    <Label size="sm" className="text-dark-blue-400">Time Zone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full text-base text-dark-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptionsWith(timezone).map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {formatTimezoneLabel(tz.value, tz.city)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-y-1.5">
                    <Label size="sm" className="text-dark-blue-400">Date Format</Label>
                    <Select
                      value={dateFormat}
                      onValueChange={(v) => setDateFormat(v as "MM/DD/YYYY" | "DD/MM/YYYY")}
                    >
                      <SelectTrigger className="w-full text-base text-dark-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-y-1.5">
                    <Label size="sm" className="text-dark-blue-400">Start of week</Label>
                    <Select
                      value={startOfWeek}
                      onValueChange={(v) => setStartOfWeek(v as "Sunday" | "Monday")}
                    >
                      <SelectTrigger className="w-full text-base text-dark-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sunday">Sunday</SelectItem>
                        <SelectItem value="Monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-y-3">
                    <Label size="sm" className="text-dark-blue-400">Time Format</Label>
                    <div className="flex flex-col gap-y-2.5">
                      {([
                        { value: "12h", label: "12 hours, AM / PM" },
                        { value: "24h", label: "24 hours" },
                      ] as const).map((opt) => (
                        <div key={opt.value} className="flex items-center gap-x-2">
                          <Checkbox
                            id={`tt-time-format-${opt.value}`}
                            variant="circular"
                            checked={timeFormat === opt.value}
                            onCheckedChange={() => setTimeFormat(opt.value)}
                          />
                          <Label
                            htmlFor={`tt-time-format-${opt.value}`}
                            size="sm"
                            className="text-dark-blue-400"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "manual" && (
                <>
                  <div className="py-6">{contractPicker}</div>
                  <div className="py-6">
                    {switchRow(
                      "tt-manual-enabled",
                      "Enable Manual Time Entry",
                      "Allow contractors to add time manually if auto-tracking is not used.",
                      rules.manualTimeEnabled,
                      setRule("manualTimeEnabled")
                    )}
                  </div>
                  <div className="py-6">
                    {switchRow(
                      "tt-manual-approval",
                      "Require Approval",
                      "Manually added time must be reviewed and approved before it is billed.",
                      rules.manualTimeRequireApproval,
                      setRule("manualTimeRequireApproval")
                    )}
                  </div>
                  <div className="py-6">
                    {switchRow(
                      "tt-manual-reason",
                      "Require Reason For Approval",
                      "Contractors must submit a reason when logging manual time for transparency.",
                      rules.manualTimeRequireReason,
                      setRule("manualTimeRequireReason")
                    )}
                  </div>
                </>
              )}

              {activeTab === "preferences" && (
                <>
                  <div className="flex flex-col gap-y-1.5 py-6">
                    <Label size="sm" className="text-dark-blue-400">Default Screenshot View</Label>
                    <Select
                      value={defaultScreenshotView}
                      onValueChange={(v) => setDefaultScreenshotView(v as "hour" | "day")}
                    >
                      <SelectTrigger className="w-full text-base text-dark-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Hour View</SelectItem>
                        <SelectItem value="day">Day View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-6">
                    {switchRow(
                      "tt-show-tooltips",
                      "Show tooltips on interface",
                      "Helpful hints will be displayed on key elements",
                      showTooltips,
                      setShowTooltips,
                      { titleClassName: "text-base font-normal", descriptionClassName: "text-base" }
                    )}
                  </div>
                  <div className="flex flex-col gap-y-1.5 py-6">
                    <Label size="sm" className="text-dark-blue-400">Screen Capture Settings</Label>
                    <div className="grid grid-cols-2 gap-x-2.5">
                      {([
                        { value: "active", label: "Capture Active Monitor" },
                        { value: "all", label: "Capture All Monitors" },
                      ] as const).map((opt) => (
                        <Label
                          key={opt.value}
                          htmlFor={`tt-capture-${opt.value}`}
                          className={cn(
                            "flex h-[100px] cursor-pointer flex-col items-start justify-between rounded-lg p-5 text-sm font-medium text-dark-blue-400",
                            captureMode === opt.value
                              ? "border-2 border-primary-500"
                              : "border border-gray-200"
                          )}
                        >
                          <Checkbox
                            id={`tt-capture-${opt.value}`}
                            variant="circular"
                            size="md"
                            checked={captureMode === opt.value}
                            onCheckedChange={() => setCaptureMode(opt.value)}
                          />
                          {opt.label}
                        </Label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "permissions" && (
                <>
                  <div className="py-6">{contractPicker}</div>
                  <div className="flex flex-col gap-y-6 py-6">
                    <p className="text-sm font-semibold text-dark-blue-400">Blurring Screenshots</p>
                    {permissionRow(
                      "tt-allow-blur",
                      "Allow screenshot blurring",
                      rules.allowBlur,
                      setRule("allowBlur")
                    )}
                    {permissionRow(
                      "tt-auto-approve-blur",
                      "Auto-approve blurring",
                      rules.autoApproveBlur,
                      setRule("autoApproveBlur"),
                      "Blurred screenshots are automatically counted as logged time"
                    )}
                    {permissionRow(
                      "tt-blurred-billable",
                      "Log blurred screenshots as time",
                      rules.blurredBillable,
                      setRule("blurredBillable"),
                      "Include blurred screenshot time in billing totals"
                    )}
                  </div>
                  <div className="py-6">
                    {switchRow(
                      "tt-allow-reassign",
                      "Allow Screenshot Editing",
                      "Let contractors assign or change task and project labels on their screenshots.",
                      rules.allowReassign,
                      setRule("allowReassign")
                    )}
                  </div>
                  <div className="flex flex-col gap-y-6 py-6">
                    <p className="text-sm font-semibold text-dark-blue-400">Deleting Screenshots</p>
                    {permissionRow(
                      "tt-allow-delete",
                      "Allow screenshot deletion",
                      rules.allowDelete,
                      setRule("allowDelete")
                    )}
                    {permissionRow(
                      "tt-delete-approval",
                      "Require approval for deleted screenshots",
                      rules.requireDeleteApproval,
                      setRule("requireDeleteApproval")
                    )}
                  </div>
                </>
              )}

              {activeTab === "notifications" &&
                [
                  {
                    id: "tt-notify-manual",
                    title: "Manual time",
                    description: "Get notified when manual time is approved or rejected.",
                    checked: notifyManualTime,
                    onChange: setNotifyManualTime,
                  },
                  {
                    id: "tt-notify-reassign",
                    title: "Reassignment alerts",
                    description: "Be alerted when you are moved to a different project or task.",
                    checked: notifyReassignment,
                    onChange: setNotifyReassignment,
                  },
                  {
                    id: "tt-notify-weekly",
                    title: "Weekly report",
                    description: "Receive weekly summary of time tracked and activities.",
                    checked: notifyWeeklyReport,
                    onChange: setNotifyWeeklyReport,
                  },
                  {
                    id: "tt-notify-comments",
                    title: "Screenshot comments",
                    description: "Get notified when a client comments on your screenshot",
                    checked: notifyScreenshotComments,
                    onChange: setNotifyScreenshotComments,
                  },
                ].map((row) => (
                  <div key={row.id} className="py-6">
                    {switchRow(row.id, row.title, row.description, row.checked, row.onChange, {
                      titleClassName: "font-medium",
                    })}
                  </div>
                ))}
            </div>
          </div>
        </TooltipProvider>

        <div className="flex shrink-0 items-center justify-end gap-x-3 border-t border-gray-200 p-3">
          <DialogClose asChild>
            <Button variant="ghost" visual="gray" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            variant="filled"
            visual="primary"
            size="sm"
            disabled={saving || (isRulesTab && !selectedContract)}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Filter system ──────────────────────────────────────────────────────

type FilterCategory =
  | "contracts"
  | "tasks"
  | "apps"
  | "urls"
  | "activity"
  | "timeEntry"

interface FilterOptionItem {
  value: string
  label: string
  subLabel?: string
  avatar?: { initial: string; color: string }
  icon?: React.ReactNode
}

interface CategoryConfig {
  label: string
  pluralChip: string
  searchPlaceholder: string
  searchable: boolean
  combinable: boolean
  emptyText: string
  options: FilterOptionItem[]
}

const activityFilterOpts: FilterOptionItem[] = [
  { value: "none", label: "No Activity", icon: <Network className="size-4" /> },
  { value: "low", label: "Low Activity", icon: <Network1 className="size-4" /> },
  { value: "medium", label: "Medium Activity", icon: <Network2 className="size-4" /> },
  { value: "high", label: "High Activity", icon: <Network4 className="size-4" /> },
]

// Values are the API's timeEntryTypes (US-TT-026).
const timeEntryFilterOpts: FilterOptionItem[] = [
  { value: "automatic", label: "Auto Tracked Time" },
  { value: "manual", label: "Manual Time" },
  { value: "edited", label: "Edited Time" },
]

const filterCategories: Record<FilterCategory, CategoryConfig> = {
  contracts: {
    label: "Contracts",
    pluralChip: "Projects",
    searchPlaceholder: "Filter by contract...",
    searchable: true,
    combinable: true,
    emptyText: "No contracts yet.",
    // Filled from the user's contracts (FilterOptions below).
    options: [],
  },
  tasks: {
    label: "Tasks",
    pluralChip: "Tasks",
    searchPlaceholder: "Filter by task...",
    searchable: true,
    combinable: true,
    emptyText: "No tasks for these contracts.",
    // Filled from the tasks of the selected contracts.
    options: [],
  },
  apps: {
    label: "Apps",
    pluralChip: "Apps",
    searchPlaceholder: "Filter by app...",
    searchable: true,
    combinable: true,
    emptyText: "No apps recorded yet.",
    // Filled from the apps seen in the user's screenshots.
    options: [],
  },
  urls: {
    label: "URL's",
    pluralChip: "URL's",
    searchPlaceholder: "Filter by url...",
    searchable: true,
    combinable: true,
    emptyText: "No URLs recorded yet.",
    // Filled from the URLs seen in the user's screenshots.
    options: [],
  },
  activity: {
    label: "Activity Level",
    pluralChip: "",
    searchPlaceholder: "",
    searchable: false,
    combinable: false,
    emptyText: "",
    options: activityFilterOpts,
  },
  timeEntry: {
    label: "Time Entry",
    pluralChip: "",
    searchPlaceholder: "",
    searchable: false,
    combinable: false,
    emptyText: "",
    options: timeEntryFilterOpts,
  },
}

const filterCategoryOrder: FilterCategory[] = [
  "contracts",
  "tasks",
  "apps",
  "urls",
  "activity",
  "timeEntry",
]

type AppliedFilters = Record<FilterCategory, string[]>
const emptyAppliedFilters: AppliedFilters = {
  contracts: [],
  tasks: [],
  apps: [],
  urls: [],
  activity: [],
  timeEntry: [],
}

/** Options per category; contracts, tasks, apps and URLs come from loaded data. */
type FilterOptions = Record<FilterCategory, FilterOptionItem[]>

interface AppliedChip {
  category: FilterCategory
  value?: string
  count?: number
  label: string
}

function getAppliedChips(
  applied: AppliedFilters,
  options: FilterOptions
): AppliedChip[] {
  const chips: AppliedChip[] = []
  for (const cat of filterCategoryOrder) {
    const values = applied[cat]
    if (values.length === 0) continue
    const config = filterCategories[cat]
    const labelOf = (v: string) =>
      options[cat].find((o) => o.value === v)?.label ?? v
    if (!config.combinable || values.length === 1) {
      for (const v of values) chips.push({ category: cat, value: v, label: labelOf(v) })
    } else {
      chips.push({
        category: cat,
        count: values.length,
        label: config.pluralChip,
      })
    }
  }
  return chips
}

// Category rows are 34px with a 4px gap; the values card lines up with the active row.
const FILTER_ROW_HEIGHT = 38

/**
 * Filter menu (Figma "Filters"): a card of categories and, beside it, a card
 * with the active category's values — searchable lists get Select All /
 * Clear. Every change applies at once.
 */
function FilterPopover({
  applied,
  options,
  onChange,
  children,
}: {
  applied: AppliedFilters
  options: FilterOptions
  onChange: (next: AppliedFilters) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] =
    useState<FilterCategory>("contracts")
  const [query, setQuery] = useState("")

  const config = filterCategories[activeCategory]
  const selected = applied[activeCategory]
  const categoryOptions = options[activeCategory]
  const filteredOptions =
    config.searchable && query
      ? categoryOptions.filter((o) =>
          `${o.label} ${o.subLabel ?? ""}`.toLowerCase().includes(query.toLowerCase())
        )
      : categoryOptions

  const toggle = (value: string) => {
    const curr = applied[activeCategory]
    const next = curr.includes(value)
      ? curr.filter((v) => v !== value)
      : [...curr, value]
    onChange({ ...applied, [activeCategory]: next })
  }

  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => selected.includes(o.value))

  const toggleSelectAll = () => {
    const values = filteredOptions.map((o) => o.value)
    onChange({
      ...applied,
      [activeCategory]: allSelected
        ? selected.filter((v) => !values.includes(v))
        : Array.from(new Set([...selected, ...values])),
    })
  }

  const clearCategory = () => onChange({ ...applied, [activeCategory]: [] })
  const activeIndex = filterCategoryOrder.indexOf(activeCategory)

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setQuery("")
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="flex w-auto items-start border-0 bg-transparent p-0 shadow-none"
      >
        {/* Categories */}
        <div className="flex w-[278px] flex-col gap-y-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
          {filterCategoryOrder.map((cat) => (
            <Button
              key={cat}
              variant="ghost"
              visual="gray"
              size="sm"
              onClick={() => {
                setActiveCategory(cat)
                setQuery("")
              }}
              className={cn(
                "h-[34px] w-full justify-start rounded-none px-3 py-2.5 text-sm font-normal",
                activeCategory === cat
                  ? "bg-gray-50 font-medium text-dark-blue-400"
                  : "text-gray-500"
              )}
            >
              {filterCategories[cat].label}
              {applied[cat].length > 0 && (
                <Badge visual="primary" variant="circular" className="ml-auto size-5 p-0">
                  {applied[cat].length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Values for the active category */}
        <div
          className="flex w-[260px] flex-col rounded-lg border border-gray-100 bg-white shadow-lg"
          style={{ marginTop: activeIndex * FILTER_ROW_HEIGHT }}
        >
          {config.searchable && (
            <InputGroup className="w-full border-b border-gray-100">
              <InputLeftElement className="w-8 text-gray-400">
                <SearchSm className="size-4" />
              </InputLeftElement>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={config.searchPlaceholder}
                className="h-9 border-0 pl-8 text-sm shadow-none focus:ring-0"
              />
            </InputGroup>
          )}
          {config.searchable && filteredOptions.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-x-3">
                <Checkbox
                  id={`tt-filter-all-${activeCategory}`}
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <Label
                  htmlFor={`tt-filter-all-${activeCategory}`}
                  className="cursor-pointer text-sm font-normal text-dark-blue-400"
                >
                  Select All
                </Label>
              </div>
              <Button
                variant="link"
                visual="primary"
                size="sm"
                className="h-auto p-0 text-xs font-semibold"
                disabled={selected.length === 0}
                onClick={clearCategory}
              >
                Clear
              </Button>
            </div>
          )}
          <ScrollArea viewportClassName="max-h-[220px] [&>div]:!block">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">
                {query || !config.emptyText ? "No results" : config.emptyText}
              </p>
            ) : (
              <div className="py-1">
                {filteredOptions.map((opt) => {
                  const id = `tt-filter-${activeCategory}-${opt.value}`
                  return (
                    <div key={opt.value} className="flex items-center gap-x-3 px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        id={id}
                        checked={selected.includes(opt.value)}
                        onCheckedChange={() => toggle(opt.value)}
                      />
                      <Label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-x-2.5">
                        {opt.icon && <span className="flex size-5 shrink-0 items-center justify-center">{opt.icon}</span>}
                        {opt.avatar && (
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              opt.avatar.color
                            )}
                          >
                            {opt.avatar.initial}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-normal text-dark-blue-400">
                            {opt.label}
                          </span>
                          {opt.subLabel && (
                            <span className="block truncate text-xs font-normal text-gray-500">
                              {opt.subLabel}
                            </span>
                          )}
                        </span>
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Sort choices for the timeline (Figma "Sort by"). Hour blocks stay in time
// order; the contract sorts order the bars inside each hour.
type SortKey = "contract-asc" | "contract-desc" | "time-desc" | "time-asc"

const sortGroups: { key: SortKey; label: string }[][] = [
  [
    { key: "contract-asc", label: "Project / Contract A-Z" },
    { key: "contract-desc", label: "Project / Contract Z-A" },
  ],
  [
    { key: "time-desc", label: "Newest First" },
    { key: "time-asc", label: "Oldest First" },
  ],
]
const sortOptions = sortGroups.flat()

// Filters and sort live in the URL (US-TT-022) so leaving the page and coming
// back — or sharing the link — restores them.
const FILTER_URL_KEYS: Record<FilterCategory, string> = {
  contracts: "contracts",
  tasks: "tasks",
  apps: "apps",
  urls: "urls",
  activity: "activity",
  timeEntry: "entry",
}

function readFiltersFromUrl(): { filters: AppliedFilters; sort: SortKey } {
  const params = new URLSearchParams(window.location.search)
  const list = (key: string) =>
    (params.get(key) ?? "").split(",").map((v) => v.trim()).filter(Boolean)
  const allowed = (cat: FilterCategory, values: string[]) =>
    cat === "activity" || cat === "timeEntry"
      ? values.filter((v) =>
          (cat === "activity" ? activityFilterOpts : timeEntryFilterOpts).some(
            (o) => o.value === v
          )
        )
      : values
  const filters = { ...emptyAppliedFilters }
  for (const cat of filterCategoryOrder) {
    filters[cat] = allowed(cat, list(FILTER_URL_KEYS[cat]))
  }
  const sortParam = params.get("sort")
  const sort = sortOptions.some((o) => o.key === sortParam)
    ? (sortParam as SortKey)
    : "time-desc"
  return { filters, sort }
}

function writeFiltersToUrl(filters: AppliedFilters, sort: SortKey): void {
  const params = new URLSearchParams(window.location.search)
  for (const cat of filterCategoryOrder) {
    const key = FILTER_URL_KEYS[cat]
    if (filters[cat].length > 0) params.set(key, filters[cat].join(","))
    else params.delete(key)
  }
  if (sort !== "time-desc") params.set("sort", sort)
  else params.delete("sort")
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, "", next)
  }
}

// ─── Screenshot Details Dialog ──────────────────────────────────────────

interface FlatScreenshot {
  screenshot: Screenshot
  projectName: string
  taskName: string
  blockDate: string
  blockHour: string
}

function flattenScreenshots(blocks: TimeBlock[]): FlatScreenshot[] {
  return blocks.flatMap((b) =>
    b.projects.flatMap((p) =>
      p.screenshots.map((s) => ({
        screenshot: s,
        projectName: p.projectName,
        taskName: p.taskName,
        blockDate: b.date,
        blockHour: b.hour,
      }))
    )
  )
}

// const appDisplay: Record<string, { name: string; color: string }> = {
//   chrome: { name: "Chrome Browser", color: "bg-success-500" },
//   slack: { name: "Slack", color: "bg-error-400" },
//   github: { name: "Github Desktop", color: "bg-gray-700" },
//   vscode: { name: "VS Code", color: "bg-primary-500" },
//   figma: { name: "Figma", color: "bg-purple-500" },
//   terminal: { name: "Terminal", color: "bg-gray-500" },
// }

const appDisplay: Record<string, { name: string; color: string }> = {
  chrome: { name: "Chrome Browser", color: "bg-success-500" },
  chromebrowser: { name: "Chrome Browser", color: "bg-success-500" },
  googlesearch: { name: "Google Search", color: "bg-warning-500" },
  slack: { name: "Slack", color: "bg-error-400" },
  github: { name: "GitHub Desktop", color: "bg-gray-700" },
  githubdesktop: { name: "GitHub Desktop", color: "bg-gray-700" },
  vscode: { name: "VS Code", color: "bg-primary-500" },
  figma: { name: "Figma", color: "bg-purple-500" },
  terminal: { name: "Terminal", color: "bg-gray-500" },
  googlechrome: { name: "Google Chrome", color: "bg-success-500" },
  code: { name: "VS Code", color: "bg-primary-500" },
}
// ─── Contract / Task pickers ───────────────────────────────────────────
// The detail panel's in-context edit (US-TT-034). Same data and rules as the
// project bar: only active contracts, tasks scoped to the chosen contract.

const PICKER_TRIGGER_CLASS =
  "h-11 gap-x-2 rounded-[5px] border-gray-300 px-3 text-left text-base text-dark-blue-400"

function ContractPicker({
  value,
  fallbackName,
  onChange,
}: {
  value: string | null
  fallbackName: string
  onChange: (contractId: string) => void
}) {
  const { contracts } = useTimeTrackingData()
  const [open, setOpen] = useState(false)
  const assignable = contracts.filter(isAssignable)
  const selected = contracts.find((c) => c.id === value) ?? null

  return (
    <div className="flex flex-col gap-y-1.5">
      <Label size="sm" className="text-dark-blue-400">Contract</Label>
      <DropdownPopover
        open={open}
        onOpenChange={setOpen}
        selected={selected ?? undefined}
        onSelectedChange={(option: ContractOption | null) => {
          setOpen(false)
          if (option && option.id !== value) onChange(option.id)
        }}
      >
        <DropdownPopoverTrigger className={PICKER_TRIGGER_CLASS}>
          {selected && <ContractAvatar option={selected} />}
          <span className="min-w-0 flex-1 truncate">{selected?.name ?? fallbackName}</span>
          <Edit03 className="size-4 shrink-0 text-gray-500" />
        </DropdownPopoverTrigger>
        <DropdownPopoverContent
          align="end"
          className="w-[300px] rounded-lg border border-gray-100 p-0"
        >
          <DropdownCommand>
            <InputGroup className="w-full border-b border-gray-100">
              <InputLeftElement className="w-8 text-gray-400">
                <SearchSm className="size-4" />
              </InputLeftElement>
              <DropdownCommandInput placeholder="Find Project" className="pl-8" />
            </InputGroup>
            <DropdownCommandEmpty>
              {assignable.length === 0 ? "No contracts available." : "No contracts found."}
            </DropdownCommandEmpty>
            <ScrollArea className="max-h-[224px]" type="always">
              <DropdownCommandGroup className="py-1">
                {assignable.map((option) => (
                  <DropdownCommandItem
                    key={option.id}
                    itemValue={option}
                    value={`${option.name} ${option.id}`}
                    className="items-center gap-3 px-3 py-2.5 text-left data-[state=selected]:bg-gray-50"
                  >
                    <ContractAvatar option={option} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-blue-400">
                      {option.name}
                    </span>
                  </DropdownCommandItem>
                ))}
              </DropdownCommandGroup>
            </ScrollArea>
          </DropdownCommand>
        </DropdownPopoverContent>
      </DropdownPopover>
    </div>
  )
}

function TaskPicker({
  value,
  fallbackName,
  contractId,
  onChange,
}: {
  value: string | null
  fallbackName: string
  contractId: string | null
  onChange: (taskId: string) => void
}) {
  const { tasksByContract, loadTasks } = useTimeTrackingData()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (contractId) void loadTasks(contractId).catch(() => undefined)
  }, [contractId, loadTasks])

  const tasks = contractId ? tasksByContract[contractId] ?? [] : []
  const selected = tasks.find((t) => t.id === value) ?? null

  return (
    <div className="flex flex-col gap-y-1.5">
      <Label size="sm" className="text-dark-blue-400">Task</Label>
      <DropdownPopover
        open={open}
        onOpenChange={setOpen}
        selected={selected ?? undefined}
        onSelectedChange={(option: TaskOption | null) => {
          setOpen(false)
          if (option && option.id !== value) onChange(option.id)
        }}
      >
        <DropdownPopoverTrigger
          disabled={!contractId}
          className={cn(PICKER_TRIGGER_CLASS, "disabled:cursor-not-allowed disabled:bg-gray-50")}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && !value && "text-gray-500")}>
            {selected?.name ?? (value ? fallbackName : "Select Task")}
          </span>
          <Edit03 className="size-4 shrink-0 text-gray-500" />
        </DropdownPopoverTrigger>
        {contractId && (
          <DropdownPopoverContent
            align="end"
            className="w-[300px] rounded-lg border border-gray-100 p-0"
          >
            <DropdownCommand>
              <InputGroup className="w-full border-b border-gray-100">
                <InputLeftElement className="w-8 text-gray-400">
                  <SearchSm className="size-4" />
                </InputLeftElement>
                <DropdownCommandInput placeholder="Find Tasks" className="pl-8" />
              </InputGroup>
              <DropdownCommandEmpty>
                {tasks.length === 0 ? "No tasks yet for this contract." : "No tasks found."}
              </DropdownCommandEmpty>
              <ScrollArea className="max-h-[224px]" type="always">
                <DropdownCommandGroup className="py-1">
                  {tasks.map((task) => (
                    <DropdownCommandItem
                      key={task.id}
                      itemValue={task}
                      value={`${task.name} ${task.id}`}
                      className={cn(
                        "px-3 py-2.5 text-left text-sm data-[state=selected]:bg-gray-50",
                        task.id === value ? "font-medium text-dark-blue-400" : "text-gray-500"
                      )}
                    >
                      {task.name}
                    </DropdownCommandItem>
                  ))}
                </DropdownCommandGroup>
              </ScrollArea>
            </DropdownCommand>
            <AddTaskRow
              contractId={contractId}
              onCreated={(task) => {
                setOpen(false)
                onChange(task.id)
              }}
            />
          </DropdownPopoverContent>
        )}
      </DropdownPopover>
    </div>
  )
}

/** The screenshot (or a placeholder) filling its box; blurred ones stay blurred. */
function ScreenshotImage({
  shot,
  dim,
  className,
  onLoad,
}: {
  shot: Screenshot
  dim?: boolean
  className?: string
  onLoad?: React.ReactEventHandler<HTMLImageElement>
}) {
  if (shot.isNoActivity) {
    return (
      <div className={cn("flex size-full items-center justify-center bg-white", className)}>
        <span className="text-sm text-gray-500">No Activity</span>
      </div>
    )
  }
  if (!shot.imageUrl) {
    return <div className={cn("size-full bg-gradient-to-br from-gray-700 to-gray-900", className)} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shot.imageUrl}
      alt={`Screenshot at ${shot.time}`}
      onLoad={onLoad}
      className={cn(
        "size-full object-cover",
        shot.isBlurred && "blur-md",
        shot.isBlurred && dim && "opacity-60 grayscale",
        className
      )}
    />
  )
}

/**
 * Screenshot details (Figma "Screenshot Details"): the capture with its
 * monitor switcher and actions, the time / activity / contract / task / apps
 * panel beside it and the filmstrip of the timeline underneath. Clients see
 * the task as text and a blurred capture as a Request Access card.
 */
function ScreenshotDetailsDialog({
  flatScreenshots,
  openId,
  onOpenChange,
  onNavigate,
  onDelete,
  onBlur,
  onUnblur,
  onRequestAccess,
  onDownload,
  onUpdateMeta,
  isClient = false,
  allowReassign = true,
  showTooltips = true,
}: {
  flatScreenshots: FlatScreenshot[]
  openId: string | null
  onOpenChange: (open: boolean) => void
  onNavigate: (id: string) => void
  onDelete?: (id: string) => void
  onBlur?: (id: string) => void
  onUnblur?: (id: string) => void
  onRequestAccess?: (id: string) => Promise<void>
  onDownload?: (imageUrl: string) => void
  onUpdateMeta?: (id: string, data: { contractId?: string; taskId?: string | null }) => void
  isClient?: boolean
  allowReassign?: boolean
  showTooltips?: boolean
}) {
  const [requesting, setRequesting] = useState(false)
  // "Show tooltips on interface" off keeps every hint here closed.
  const tooltipState = showTooltips ? {} : { open: false }
  const currentIndex = openId
    ? flatScreenshots.findIndex((f) => f.screenshot.id === openId)
    : -1
  const current = currentIndex >= 0 ? flatScreenshots[currentIndex] : null
  const total = flatScreenshots.length
  // Which monitor of the open capture is on screen; back to the default
  // screen whenever another capture is opened.
  const [screenIndex, setScreenIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  // The capture's own width / height, read off the loaded image, so the frame
  // takes the monitor's real shape (16:10, ultrawide, portrait…) instead of
  // cropping it into 16:9. 16:9 until the image has loaded.
  const [captureRatio, setCaptureRatio] = useState(16 / 9)
  useEffect(() => setScreenIndex(0), [openId])
  useEffect(() => {
    if (!openId) setFullscreen(false)
  }, [openId])

  // Filmstrip: no scrollbar, arrows page it, the open capture stays in view.
  // A callback ref: the dialog content mounts after this component renders.
  const [stripEl, setStripEl] = useState<HTMLDivElement | null>(null)
  const [stripEdges, setStripEdges] = useState({ start: true, end: true })
  const updateStripEdges = useCallback(() => {
    const el = stripEl
    if (!el) return
    setStripEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    })
  }, [stripEl])
  useEffect(() => {
    const el = stripEl
    if (!el) return
    el.querySelector<HTMLElement>('[data-current="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    })
    updateStripEdges()
    // Thumbnails and the dialog size settle after the first paint.
    const observer = new ResizeObserver(updateStripEdges)
    observer.observe(el)
    return () => observer.disconnect()
  }, [stripEl, openId, total, updateStripEdges])
  const pageStrip = (dir: 1 | -1) => {
    const el = stripEl
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" })
  }

  const goPrev = () => {
    if (currentIndex > 0) onNavigate(flatScreenshots[currentIndex - 1].screenshot.id)
  }
  const goNext = () => {
    if (currentIndex < total - 1) onNavigate(flatScreenshots[currentIndex + 1].screenshot.id)
  }

  if (!current) return null
  const screens = current.screenshot.screens ?? [current.screenshot]
  const s = screens[screenIndex] ?? screens[0]
  const keyboardActivity = s.keyboardPct ?? s.activityLevel
  const mouseActivity = s.mousePct ?? Math.max(0, Math.round(s.activityLevel * 0.7))
  // Clients never see a blurred capture; they get the Request Access card.
  const clientBlurred = isClient && s.isBlurred

  // Bottom-left on the capture; centered at the bottom when zoomed (Figma
  // "Screenshot Details" zoom frame: 4px gap, icon in a 44×40 slot).
  const renderMonitorSwitcher = (zoomed = false) => screens.length > 1 && (
    <div
      className={cn(
        "absolute flex items-center",
        zoomed ? "bottom-5 left-1/2 -translate-x-1/2 gap-x-1" : "bottom-4 left-4 gap-x-2"
      )}
    >
      <span className={cn("flex items-center justify-center", zoomed && "px-3 py-2.5")}>
        <Monitor01 className="size-5 text-white drop-shadow" />
      </span>
      <ToggleGroupRoot
        value={[String(screenIndex)]}
        onValueChange={({ value }: { value: string[] }) => {
          if (value[0] !== undefined) setScreenIndex(Number(value[0]))
        }}
        className="rounded-[5px] border-gray-300 shadow-xs"
      >
        {screens.map((screen, i) => (
          <ToggleGroupItem
            key={screen.id}
            value={String(i)}
            aria-label={`Screen ${i + 1}`}
            // Figma "Button group": 122×40 including its 1px border, so each
            // item is 40px wide (border-r included) and 38px tall inside it.
            className="h-[38px] w-10 bg-white p-0 text-gray-700 border-r border-gray-300 last:border-r-0 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-700"
          >
            {i + 1}
          </ToggleGroupItem>
        ))}
      </ToggleGroupRoot>
    </div>
  )

  const actionButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    className?: string
  ) => (
    <Tooltip {...tooltipState}>
      <TooltipTrigger asChild>
        <IconButton
          variant="ghost"
          visual="gray"
          size="sm"
          aria-label={label}
          className={cn("size-8 text-gray-500", className)}
          onClick={onClick}
        >
          {icon}
        </IconButton>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )

  return (
    <Dialog open={!!openId} onOpenChange={onOpenChange}>
      <DialogContent className="!left-0 !top-0 flex h-screen w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden !rounded-none bg-gray-50 p-0 shadow-none">
        <TooltipProvider delayDuration={200}>
          {/* Top bar */}
          <div className="flex h-[70px] flex-none items-center justify-between border-b border-gray-200 bg-white px-8">
            <div className="flex items-center gap-x-4">
              <IconButton
                variant="outlined"
                visual="gray"
                size="sm"
                aria-label="Back"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <DialogTitle className="text-base font-normal text-gray-500">
                Screen {currentIndex + 1} of {total}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-x-3">
              <DropdownMenu>
                <Tooltip {...tooltipState}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <IconButton variant="outlined" visual="gray" size="sm" aria-label="Options">
                        <MoreHorizontal className="size-5" />
                      </IconButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  {!clientBlurred && (
                    <DropdownMenuItem onSelect={() => onDownload?.(s.imageUrl)}>Download</DropdownMenuItem>
                  )}
                  {onBlur && !s.isBlurred && (
                    <DropdownMenuItem onSelect={() => onBlur(s.id)}>Blur</DropdownMenuItem>
                  )}
                  {onUnblur && !isClient && s.isBlurred && (
                    <DropdownMenuItem onSelect={() => onUnblur(s.id)}>Unblur</DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem className="text-error-500" onSelect={() => onDelete(s.id)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip {...tooltipState}>
                <TooltipTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    aria-label="Exit"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-5" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Exit</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Capture + details panel */}
          <div className="flex min-h-0 flex-1 gap-x-8 px-8 pt-8">
            {/* Left-aligned; the capture tracks the column width and only
                stops growing when it would run past the column's height. */}
            <div className="flex min-w-0 flex-1 items-start justify-start [container-type:size]">
              <div
                className="relative flex-none overflow-hidden rounded-lg bg-gray-900"
                style={{
                  aspectRatio: captureRatio,
                  width: `min(100cqw, 100cqh * ${captureRatio})`,
                }}
              >
                <ScreenshotImage
                  shot={s}
                  dim={!isClient}
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                    if (w > 0 && h > 0) setCaptureRatio(w / h)
                  }}
                />

                {clientBlurred && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 p-6">
                    <Card className="w-full max-w-[400px] flex-col justify-start gap-y-4 rounded-xl border-0 p-6 text-center shadow-xl">
                      <span className="flex size-10 items-center justify-center rounded-full bg-warning-100 text-warning-600">
                        <AlertTriangle className="size-5" />
                      </span>
                      <div className="flex flex-col gap-y-1">
                        <p className="text-base font-semibold text-dark-blue-400">Screenshot Blurred</p>
                        <p className="text-sm text-gray-500">
                          This screenshot was blurred by the contractor to protect sensitive
                          content. If you believe this content is relevant to the project, you
                          can request access.
                        </p>
                      </div>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="md"
                        className="w-full"
                        disabled={s.accessRequested}
                        loading={requesting}
                        onClick={async () => {
                          setRequesting(true)
                          try {
                            await onRequestAccess?.(s.id)
                          } finally {
                            setRequesting(false)
                          }
                        }}
                      >
                        {s.accessRequested ? "Access Requested" : "Request Access"}
                      </Button>
                    </Card>
                  </div>
                )}

                {/* Previous / next capture tabs inside the image edges */}
                {(["prev", "next"] as const).map((dir) => {
                  const disabled = dir === "prev" ? currentIndex <= 0 : currentIndex >= total - 1
                  return (
                    <IconButton
                      key={dir}
                      variant="ghost"
                      visual="gray"
                      aria-label={dir === "prev" ? "Previous screenshot" : "Next screenshot"}
                      disabled={disabled}
                      onClick={dir === "prev" ? goPrev : goNext}
                      className={cn(
                        "absolute top-1/2 h-[86px] w-[26px] -translate-y-1/2 rounded-md border border-white/20 bg-gray-900/50 p-0 text-white hover:bg-gray-900/70 hover:text-white disabled:opacity-30",
                        dir === "prev" ? "left-5" : "right-5"
                      )}
                    >
                      <ChevronRight className={cn("size-5", dir === "prev" && "rotate-180")} />
                    </IconButton>
                  )
                })}

                {renderMonitorSwitcher()}

                {!clientBlurred && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-x-1 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
                    {actionButton("Download", <Download className="size-4" />, () => onDownload?.(s.imageUrl))}
                    {!isClient && onBlur && !s.isBlurred &&
                      actionButton("Blur", <Droplet className="size-4" />, () => onBlur(s.id))}
                    {!isClient && onUnblur && s.isBlurred &&
                      actionButton(
                        "Unblur",
                        <Droplet className="size-4" />,
                        () => onUnblur(s.id),
                        "bg-primary-50 text-primary-500"
                      )}
                    {!isClient && onDelete &&
                      actionButton(
                        "Delete",
                        <Trash01 className="size-4" />,
                        () => onDelete(s.id),
                        "bg-error-500 text-white hover:bg-error-600 hover:text-white"
                      )}
                    {actionButton("Zoom in", <ZoomIn className="size-4" />, () => setFullscreen(true))}
                  </div>
                )}
              </div>
            </div>

            {/* Details panel */}
            <div className="w-[250px] flex-none overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col divide-y divide-gray-200">
                <div className="flex flex-col gap-y-1 pb-10 text-sm text-dark-blue-400">
                  <p>
                    Time <span className="font-semibold">{s.time.toUpperCase()}</span>
                  </p>
                  <p>
                    Date <span className="font-semibold">{current.blockDate}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-y-3 py-10">
                  {[
                    { Icon: Keyboard01, value: keyboardActivity, label: "Keyboard activity" },
                    { Icon: Mouse, value: mouseActivity, label: "Mouse activity" },
                  ].map(({ Icon, value, label }) => (
                    <div key={label} className="flex items-center gap-x-3" aria-label={`${label} ${value}%`}>
                      <Icon className="size-4 flex-none text-gray-500" />
                      <Progress value={value} className="flex-1" />
                      <span className="w-9 text-right text-sm text-dark-blue-400">{value}%</span>
                    </div>
                  ))}
                </div>

                {isClient ? (
                  <div className="py-10 text-sm text-dark-blue-400">
                    Task <span className="font-semibold">{current.taskName}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-4 py-10" data-edit-contract>
                    {allowReassign ? (
                      <>
                        <ContractPicker
                          value={s.contractId ?? null}
                          fallbackName={current.projectName}
                          // A task never carries over to another contract.
                          onChange={(contractId) => onUpdateMeta?.(s.id, { contractId, taskId: null })}
                        />
                        <TaskPicker
                          value={s.taskId ?? null}
                          fallbackName={current.taskName}
                          contractId={s.contractId ?? null}
                          onChange={(taskId) => onUpdateMeta?.(s.id, { taskId })}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col gap-y-1 text-sm text-dark-blue-400">
                        <p>
                          Contract <span className="font-semibold">{current.projectName}</span>
                        </p>
                        <p>
                          Task <span className="font-semibold">{current.taskName}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-y-3 py-10">
                  <p className="text-sm font-medium text-dark-blue-400">Apps</p>
                  {s.apps.length === 0 ? (
                    <p className="text-xs text-gray-500">No app activity recorded</p>
                  ) : (
                    s.apps.map((app, i) => (
                      <div key={i} className="flex items-center gap-x-2">
                        <span className="flex size-4 flex-none items-center justify-center">
                          <AppIcon
                            app={app}
                            iconUrl={s.appIconUrls?.[app]}
                            displayName={s.appDisplayNames?.[app]}
                          />
                        </span>
                        <span className="truncate text-xs text-dark-blue-400">
                          {s.appDisplayNames?.[app] ?? appDisplay[app]?.name ?? app}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filmstrip */}
          <div className="flex flex-none items-stretch gap-x-2 px-8 pb-8 pt-5">
            {!stripEdges.start && (
              <IconButton
                variant="outlined"
                visual="gray"
                aria-label="Earlier screenshots"
                onClick={() => pageStrip(-1)}
                className="h-full w-[30px] flex-none rounded-lg bg-white p-0"
              >
                <ChevronRight className="size-4 rotate-180" />
              </IconButton>
            )}
            <div
              ref={setStripEl}
              onScroll={updateStripEdges}
              className="flex min-w-0 flex-1 gap-x-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {flatScreenshots.map((f) => {
                const isCurrent = f.screenshot.id === openId
                return (
                  <Button
                    key={f.screenshot.id}
                    variant="ghost"
                    visual="gray"
                    data-current={isCurrent}
                    onClick={() => onNavigate(f.screenshot.id)}
                    className={cn(
                      "h-[123px] w-[131px] flex-none flex-col items-stretch justify-start gap-y-1.5 rounded-lg border p-2 font-normal",
                      isCurrent ? "border-gray-200 bg-white" : "border-transparent hover:bg-white"
                    )}
                  >
                    <span className="block h-[67px] flex-none overflow-hidden rounded-[5px] bg-gray-900">
                      <ScreenshotImage shot={f.screenshot} />
                    </span>
                    <Progress
                      value={f.screenshot.isNoActivity ? 0 : f.screenshot.activityLevel}
                      className="h-1.5 flex-none bg-gray-200"
                    />
                    <span className="flex items-center justify-between gap-x-1">
                      <span className="whitespace-nowrap text-xs text-dark-blue-400">{f.screenshot.time}</span>
                      {f.screenshot.apps.length > 0 && (
                        <AppIcons
                          apps={f.screenshot.apps.slice(0, 3)}
                          iconUrls={f.screenshot.appIconUrls}
                          displayNames={f.screenshot.appDisplayNames}
                        />
                      )}
                    </span>
                  </Button>
                )
              })}
            </div>
            {!stripEdges.end && (
              <IconButton
                variant="outlined"
                visual="gray"
                aria-label="Later screenshots"
                onClick={() => pageStrip(1)}
                className="h-full w-[30px] flex-none rounded-lg bg-white p-0"
              >
                <ChevronRight className="size-4" />
              </IconButton>
            )}
          </div>

          {/* Zoomed: the capture alone, full screen */}
          {fullscreen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
              {s.isNoActivity || !s.imageUrl || clientBlurred ? (
                <ScreenshotImage shot={s} dim={!isClient} className="object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imageUrl}
                  alt={`Screenshot at ${s.time}`}
                  className={cn("max-h-full max-w-full object-contain", s.isBlurred && "blur-md")}
                />
              )}
              {/* Figma zoom frame: 28×83 edge tabs, 19px in, vertically centred. */}
              {(["prev", "next"] as const).map((dir) => {
                const disabled = dir === "prev" ? currentIndex <= 0 : currentIndex >= total - 1
                return (
                  <IconButton
                    key={dir}
                    variant="ghost"
                    visual="gray"
                    aria-label={dir === "prev" ? "Previous screenshot" : "Next screenshot"}
                    disabled={disabled}
                    onClick={dir === "prev" ? goPrev : goNext}
                    className={cn(
                      "absolute top-1/2 h-[83px] w-7 -translate-y-1/2 rounded-[5px] border border-white/20 bg-black/[0.07] p-2 text-white shadow-xs hover:bg-black/20 hover:text-white disabled:opacity-30",
                      dir === "prev" ? "left-[19px]" : "right-[19px]"
                    )}
                  >
                    <ChevronRight className={cn("size-3", dir === "prev" && "rotate-180")} />
                  </IconButton>
                )
              })}
              <IconButton
                variant="ghost"
                visual="gray"
                aria-label="Exit zoom"
                onClick={() => setFullscreen(false)}
                className="absolute right-5 top-5 size-9 rounded-full border-2 border-white/50 bg-black/40 p-0 text-white hover:bg-black/60 hover:text-white"
              >
                <X className="size-5" />
              </IconButton>
              {renderMonitorSwitcher(true)}
            </div>
          )}
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const { toast } = useToast()
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<
    string | null
  >(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [datePreset, setDatePreset] = useState("all time")
  const [dateOpen, setDateOpen] = useState(false)
  
  // ── User preferences (consumed from backend) ──
  const [userTimezone, setUserTimezone] = useState("America/New_York")
  const [userDateFormat, setUserDateFormat] = useState<"MM/DD/YYYY" | "DD/MM/YYYY">("MM/DD/YYYY")
  const [userTimeFormat, setUserTimeFormat] = useState<"12h" | "24h">("12h")
  const [userScreenshotView, setUserScreenshotView] = useState<"hour" | "day">("hour")
  const [userShowTooltips, setUserShowTooltips] = useState(true)
  const [userStartOfWeek, setUserStartOfWeek] = useState<"Sunday" | "Monday">("Sunday")

  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null)
  useEffect(() => {
    setBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? null)
  }, [])

  const dateLocale = userDateFormat === "DD/MM/YYYY" ? "en-GB" : "en-US"
  const dateRange = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })} – ${new Date(dateTo).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`
    : "All Time"

  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false)
  const [selectedScreenshots, setSelectedScreenshots] = useState<Set<string>>(new Set())
  const [showManualTimeDialog, setShowManualTimeDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  // Screenshot ids a Blur / Delete modal is open for (bulk or the detail view).
  // `count` is captures, as the user selected them; `ids` holds every monitor.
  const [blurTargets, setBlurTargets] = useState<{ ids: string[]; count: number } | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<{ ids: string[]; count: number } | null>(null)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showDownloadTracker, setShowDownloadTracker] = useState(false)
  const [openingDesktopTracker, setOpeningDesktopTracker] = useState(false)
  const { runStart, startTimeGateDialog } = useStartTimeGate()
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>(emptyAppliedFilters)
  const [sort, setSort] = useState<SortKey>("time-desc")
  // Filters come from the URL on first load; hold the first fetch until then.
  const [filtersReady, setFiltersReady] = useState(false)
  useEffect(() => {
    const fromUrl = readFiltersFromUrl()
    setAppliedFilters(fromUrl.filters)
    setSort(fromUrl.sort)
    setFiltersReady(true)
  }, [])
  useEffect(() => {
    if (filtersReady) writeFiltersToUrl(appliedFilters, sort)
  }, [appliedFilters, sort, filtersReady])

  // The header "All Contracts" select is the single-contract view of the
  // contract filter.
  const contractFilter =
    appliedFilters.contracts.length === 1 ? appliedFilters.contracts[0] : "all"

  // Tasks are scoped to the selected contracts, so a contract change clears
  // the task filter (US-TT-024).
  const updateFilters = (next: AppliedFilters) => {
    const contractsChanged =
      next.contracts.length !== appliedFilters.contracts.length ||
      next.contracts.some((c) => !appliedFilters.contracts.includes(c))
    setAppliedFilters(contractsChanged ? { ...next, tasks: [] } : next)
  }

  const { user } = useAuth()
  // ── Role-based view (US-TT-008/009/015/029/030/035/036) ──
  // The view follows the side of the contracts the user is actually on, not
  // the account's role: a talent account can carry role "client" and vice
  // versa. Someone on both sides falls back to their account role.
  const accountRole =
    (user as any)?.role?.toUpperCase?.() ||
    (user as any)?.accountType?.toUpperCase?.() ||
    ""
  const [contractSides, setContractSides] = useState<{
    talent: ContractDTO[]
    client: ContractDTO[]
  } | null>(null)
  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      getContractsForTalent(user.id).catch(() => [] as ContractDTO[]),
      getContractsForClient(user.id).catch(() => [] as ContractDTO[]),
    ]).then(([talent, client]) =>
      setContractSides({
        talent,
        // A contract with yourself is your own work — it belongs to the
        // talent side, not the client side.
        client: client.filter((c) => c.talentId !== user.id),
      })
    )
  }, [user?.id])
  const viewAsRole =
    accountRole === "ADMIN" ? ROLE.ADMIN
    : !contractSides ? (accountRole === "CLIENT" ? ROLE.CLIENT : ROLE.TALENT)
    : contractSides.client.length > 0 && contractSides.talent.length === 0 ? ROLE.CLIENT
    : contractSides.talent.length > 0 && contractSides.client.length === 0 ? ROLE.TALENT
    : accountRole === "CLIENT" ? ROLE.CLIENT
    : ROLE.TALENT
  const isClient = viewAsRole === ROLE.CLIENT
  const switcherRole = (user as any)?.activeRole?.toUpperCase?.()
  const settingsIsClient =
    switcherRole === ROLE.CLIENT ? true : switcherRole === ROLE.TALENT ? false : isClient
  const isAdmin = viewAsRole === ROLE.ADMIN
  const isTalent = viewAsRole === ROLE.TALENT
  const realContracts = useMemo<ContractDTO[]>(
    () => (!contractSides ? [] : isClient ? contractSides.client : contractSides.talent),
    [contractSides, isClient]
  )

  // Screenshot rules per contract (allow delete/blur/reassign…). Actions in
  // the detail view follow the rules of the screenshot's own contract.
  const [rulesByContract, setRulesByContract] = useState<Record<string, ScreenshotRulesDTO>>({})
  useEffect(() => {
    let cancelled = false
    Promise.all(
      realContracts.map((c) =>
        getScreenshotRules(c.id)
          .then((rules) => [c.id, rules] as const)
          .catch(() => null)
      )
    ).then((entries) => {
      if (cancelled) return
      setRulesByContract(
        Object.fromEntries(entries.filter((e): e is readonly [string, ScreenshotRulesDTO] => !!e))
      )
    })
    return () => {
      cancelled = true
    }
  }, [realContracts])

  const contractOptions = useMemo<ContractOption[]>(
    () =>
      realContracts.map((c) => ({
        id: c.id,
        name: c.title || "Untitled contract",
        status: c.status ?? "",
        color: contractColor(c.id, realContracts),
      })),
    [realContracts]
  )

  // Tasks per contract, fetched once per contract and shared by the bars,
  // pickers, transfer dialog and task filter.
  const [tasksByContract, setTasksByContract] = useState<Record<string, TaskOption[]>>({})
  const taskRequests = React.useRef(new Map<string, Promise<TaskOption[]>>())
  const loadTasks = useCallback((contractId: string): Promise<TaskOption[]> => {
    const pending = taskRequests.current.get(contractId)
    if (pending) return pending
    const request = getTasksForContract(contractId)
      .then((list) => {
        const tasks = list.map((t) => ({ id: t.id, contractId, name: t.name }))
        setTasksByContract((prev) => ({ ...prev, [contractId]: tasks }))
        return tasks
      })
      .catch((err) => {
        taskRequests.current.delete(contractId)
        throw err
      })
    taskRequests.current.set(contractId, request)
    return request
  }, [])
  const createTask = useCallback(
    async (contractId: string, name: string): Promise<TaskOption> => {
      const created = await createContractTask({
        contractId,
        name,
        createdBy: user?.id ?? "",
      })
      const task = { id: created.id, contractId, name: created.name }
      setTasksByContract((prev) => {
        const tasks = [...(prev[contractId] ?? []), task].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        taskRequests.current.set(contractId, Promise.resolve(tasks))
        return { ...prev, [contractId]: tasks }
      })
      return task
    },
    [user?.id]
  )
  useEffect(() => {
    for (const c of realContracts) void loadTasks(c.id).catch(() => undefined)
  }, [realContracts, loadTasks])

  // Apps and visited URLs in this user's screenshots, for the Apps / URLs filters.
  const [facets, setFacets] = useState<ScreenshotFacetsDTO>({ apps: [], urls: [] })
  useEffect(() => {
    if (!contractSides) return
    getScreenshotFacets(isClient ? "client" : "talent")
      .then(setFacets)
      .catch(() => setFacets({ apps: [], urls: [] }))
  }, [contractSides, isClient])

  const filterOptions = useMemo<FilterOptions>(() => {
    const scope =
      appliedFilters.contracts.length > 0
        ? appliedFilters.contracts
        : contractOptions.map((c) => c.id)
    return {
      contracts: contractOptions.map((c) => ({
        value: c.id,
        label: c.name,
        avatar: {
          initial: c.name.charAt(0).toUpperCase(),
          color: cn(projectBarColors[c.color], projectLabelColors[c.color]),
        },
      })),
      tasks: scope.flatMap((id) =>
        (tasksByContract[id] ?? []).map((t) => ({
          value: t.id,
          label: t.name,
          subLabel:
            scope.length > 1
              ? contractOptions.find((c) => c.id === id)?.name
              : undefined,
        }))
      ),
      apps: facets.apps.map((a) => ({
        value: a.name,
        label: a.name,
        icon: (
          <AppIcon
            app={a.name.toLowerCase().replace(/\s+/g, "")}
            iconUrl={a.iconUrl ?? undefined}
            displayName={a.name}
          />
        ),
      })),
      urls: facets.urls.map((u) => ({
        value: u,
        label: u,
        icon: <Globe02 className="size-4 text-gray-500" />,
      })),
      activity: activityFilterOpts,
      timeEntry: timeEntryFilterOpts,
    }
  }, [appliedFilters.contracts, contractOptions, tasksByContract, facets])

  // --- Real data fetching ---
  const [cards, setCards] = useState<ScreenshotCardDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Manual entries: the talent's own, or (client view) those logged on the
  // client's contracts. Shown in the header total and in their hour blocks.
  const [manualEntries, setManualEntries] = useState<ManualTimeDTO[] | null>(null)
  const fetchManualTime = useCallback(async () => {
    if (!contractSides) return
    try {
      setManualEntries(await getManualTime(isClient ? "client" : "talent"))
    } catch {
      setManualEntries(null)
    }
  }, [contractSides, isClient])

  useEffect(() => { fetchManualTime() }, [fetchManualTime])

  // Manual time follows the date range and the contract / task / time-entry
  // filters; it has no activity, apps or URLs, so those filters hide it.
  const visibleManual = useMemo<ManualBlockEntry[]>(() => {
    const f = appliedFilters
    if (!manualEntries) return []
    if (f.activity.length || f.apps.length || f.urls.length) return []
    if (f.timeEntry.length && !f.timeEntry.includes("manual")) return []
    return manualEntries
      .filter(
        (e) =>
          e.status !== "rejected" &&
          (!dateFrom || e.startTime >= dateFrom) &&
          (!dateTo || e.startTime <= dateTo) &&
          (!f.contracts.length || f.contracts.includes(e.contractId)) &&
          (!f.tasks.length || (!!e.taskId && f.tasks.includes(e.taskId)))
      )
      .map((e) => ({
        start: new Date(e.startTime),
        minutes: Math.max(0, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60_000),
        contractId: e.contractId ?? null,
        taskId: e.taskId ?? null,
      }))
  }, [manualEntries, appliedFilters, dateFrom, dateTo])
  const manualTimeLabel = manualEntries
    ? formatHoursMinutes(visibleManual.reduce((sum, e) => sum + e.minutes, 0))
    : null

  // Fetch user time/display preferences from backend
  const applyPreferences = useCallback((data: Partial<TimePreferencesDTO>) => {
    if (data.timezone) setUserTimezone(data.timezone)
    if (data.dateFormat) setUserDateFormat(data.dateFormat)
    if (data.timeFormat) setUserTimeFormat(data.timeFormat)
    if (data.startOfWeek) setUserStartOfWeek(data.startOfWeek)
    if (data.defaultScreenshotView) setUserScreenshotView(data.defaultScreenshotView)
    if (typeof data.showTooltips === "boolean") setUserShowTooltips(data.showTooltips)
  }, [])
  useEffect(() => {
    getTimePreferences().then(applyPreferences).catch(() => undefined)
  }, [applyPreferences])

  const hasActiveFilters = filterCategoryOrder.some(
    (cat) => appliedFilters[cat].length > 0
  )

  // Only the latest request may write: an older one (e.g. a talent-view
  // fetch still in flight when the view resolves to client) must not land
  // on top of it.
  const fetchSeq = React.useRef(0)
  const fetchScreenshots = useCallback(async () => {
    // Wait until we know which side of the contracts this user is on.
    if (!filtersReady || !contractSides) return
    const seq = ++fetchSeq.current
    setIsLoading(true)
    try {
      const params: ScreenshotCardsParams = {
        sortBy: "timestamp",
        sortOrder: sort === "time-asc" ? "ASC" : "DESC",
        view: isClient ? "client" : "talent",
      }
      // Every selected value goes to the API — filtering is server-side.
      if (appliedFilters.contracts.length > 0) params.contractIds = appliedFilters.contracts
      if (appliedFilters.tasks.length > 0) params.taskIds = appliedFilters.tasks
      if (appliedFilters.apps.length > 0) params.apps = appliedFilters.apps
      if (appliedFilters.urls.length > 0) params.urls = appliedFilters.urls
      if (appliedFilters.activity.length > 0) {
        params.activityBands = appliedFilters.activity as ActivityBand[]
      }
      if (appliedFilters.timeEntry.length > 0) {
        params.timeEntryTypes = appliedFilters.timeEntry as TimeEntryType[]
      }
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      // Every page, not just the first 100 — the range can hold more.
      const result = await getAllScreenshotCards(params)
      if (seq !== fetchSeq.current) return
      setCards(result)
    } catch {
      if (seq !== fetchSeq.current) return
      // Keep what is on screen; say the refresh failed (US-TT-022).
      toast({
        title: "Couldn't load screenshots",
        description: hasActiveFilters
          ? "We couldn't apply your filters. Please try again."
          : "We couldn't load your screenshots. Please try again.",
        variant: "destructive",
      })
    } finally {
      if (seq === fetchSeq.current) setIsLoading(false)
    }
  }, [
    filtersReady,
    contractSides,
    sort,
    isClient,
    dateFrom,
    dateTo,
    appliedFilters,
    hasActiveFilters,
    toast,
  ])

  const timeBlocks = useMemo(
    () =>
      transformScreenshotsToTimeBlocks(cards, realContracts, {
        timezone: userTimezone,
        dateFormat: userDateFormat,
        timeFormat: userTimeFormat,
        oldestFirst: sort === "time-asc",
        contractOrder:
          sort === "contract-asc" ? "asc" : sort === "contract-desc" ? "desc" : undefined,
        groupBy: userScreenshotView,
        manual: visibleManual,
      }),
    [cards, realContracts, userTimezone, userDateFormat, userTimeFormat, sort, userScreenshotView, visibleManual]
  )
  // Each capture stands for ten minutes of tracked time.
  const totalTime = (() => {
    const totalMin = cards.length * 10
    return `${Math.floor(totalMin / 60).toString().padStart(2, "0")}:${(totalMin % 60).toString().padStart(2, "0")}`
  })()

  const reassign = useCallback(
    async (ids: string[], data: { contractId?: string; taskId?: string | null }) => {
      await reassignScreenshots(ids, data)
      await fetchScreenshots()
    },
    [fetchScreenshots]
  )

  const timeTrackingData = useMemo<TimeTrackingData>(
    () => ({
      contracts: contractOptions,
      tasksByContract,
      readOnly: isClient,
      loadTasks,
      createTask,
      reassign,
    }),
    [contractOptions, tasksByContract, isClient, loadTasks, createTask, reassign]
  )

  useEffect(() => {
    fetchScreenshots()
  }, [fetchScreenshots])

  // ── Screenshot action handlers ────────────────────────────────────
  const clearSelection = () => {
    setSelectedScreenshots(new Set())
    setBulkSelectionEnabled(false)
  }

  /**
   * Deletes with the reason from the Delete modal. A single screenshot from
   * the detail view moves the viewer on to the next one.
   */
  const confirmDelete = async (ids: string[], reason: string) => {
    const single = ids.length === 1 && detailsOpen
    const currentIdx = single ? flatScreenshots.findIndex((f) => f.screenshot.id === ids[0]) : -1
    const next =
      currentIdx >= 0
        ? flatScreenshots[currentIdx + 1] ?? flatScreenshots[currentIdx - 1]
        : undefined
    try {
      let requested = 0
      for (const id of ids) {
        const result = await deleteScreenshot(id, reason)
        if (result.deleteRequested) requested++
      }
      toast(
        requested > 0
          ? {
              title: "Delete request sent",
              description: "The client needs to approve this before the screenshots are removed.",
            }
          : { title: "Screenshots deleted", description: "The screenshots have been removed." }
      )
      if (!single) clearSelection()
      await fetchScreenshots()
      // A second or third monitor was deleted — the capture is still there.
      if (requested > 0 || !single || currentIdx === -1) return
      if (next) setSelectedScreenshotId(next.screenshot.id)
      else {
        setDetailsOpen(false)
        setSelectedScreenshotId(null)
      }
    } catch (err) {
      toast({
        title: "Delete failed",
        description: apiErrorMessage(err, "Failed to delete screenshots. Please try again."),
        variant: "destructive",
      })
      await fetchScreenshots()
    }
  }

  const confirmBlur = async (ids: string[], reason: string) => {
    try {
      for (const id of ids) await blurScreenshot(id, reason)
      toast({ title: "Screenshots blurred", description: "Marked as “Blurred for Privacy.”" })
      if (!detailsOpen) clearSelection()
      await fetchScreenshots()
    } catch (err) {
      toast({
        title: "Blur failed",
        description: apiErrorMessage(err, "Failed to blur screenshots. Please try again."),
        variant: "destructive",
      })
      await fetchScreenshots()
    }
  }

  const handleRequestAccess = async (id: string) => {
    try {
      await requestScreenshotAccess(id)
      toast({ title: "Access Requested", description: "The contractor has been notified of your request." })
      await fetchScreenshots()
    } catch (err) {
      toast({
        title: "Request failed",
        description: apiErrorMessage(err, "We couldn't send your request. Please try again."),
        variant: "destructive",
      })
    }
  }

  const handleUnblurScreenshot = async (id: string) => {
    try {
      await unblurScreenshot(id)
      toast({ title: "Screenshot unblurred", description: "The screenshot has been restored." })
      await fetchScreenshots()
    } catch (err) {
      toast({ title: "Unblur failed", description: apiErrorMessage(err, "Please try again."), variant: "destructive" })
    }
  }

  const fetchImageBlob = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.blob()
  }

  const saveBlob = (blob: Blob, name: string) => {
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoking in the same tick can cancel a large download in some browsers.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  }

  const handleDownloadScreenshot = async (imageUrl: string) => {
    if (!imageUrl) {
      toast({ title: "Download failed", description: "No image URL available.", variant: "destructive" })
      return
    }
    try {
      saveBlob(await fetchImageBlob(imageUrl), `screenshot-${Date.now()}.jpg`)
    } catch {
      toast({ title: "Download failed", description: "Could not download screenshot.", variant: "destructive" })
    }
  }

  /**
   * The chosen captures as one ZIP. PDF: one PDF per screenshot, its monitors
   * as pages. JPG: one JPG per monitor ("-screen2" only on multi-monitor
   * captures). Files are numbered per screenshot and named by capture time.
   */
  const downloadScreenshots = async (scope: "selected" | "all", format: DownloadFormat) => {
    const cards =
      scope === "all"
        ? flatScreenshots
        : flatScreenshots.filter((f) => selectedScreenshots.has(f.screenshot.id))
    const captures = cards
      .map((f) =>
        (f.screenshot.screens ?? [f.screenshot]).filter((sc) => !sc.isNoActivity && sc.imageUrl)
      )
      .filter((screens) => screens.length > 0)
    if (captures.length === 0) {
      toast({
        title: "Nothing to download",
        description: "These screenshots have no images.",
        variant: "destructive",
      })
      return
    }
    const fetchBytes = async (url: string) =>
      new Uint8Array(await (await fetchImageBlob(url)).arrayBuffer())
    try {
      const [{ zipSync }, jsPDF] = await Promise.all([
        import("fflate"),
        format === "pdf" ? import("jspdf").then((m) => m.jsPDF) : Promise.resolve(null),
      ])
      // JPGs and PDFs of JPGs are already compressed, so store them as-is.
      const files: Record<string, [Uint8Array, { level: 0 }]> = {}
      for (const [i, screens] of captures.entries()) {
        const base = `screenshot-${i + 1}-${screens[0].time.replace(/[^\w]+/g, "")}`
        if (!jsPDF) {
          for (const [n, sc] of screens.entries()) {
            const suffix = screens.length > 1 ? `-screen${n + 1}` : ""
            files[`${base}${suffix}.jpg`] = [await fetchBytes(sc.imageUrl), { level: 0 }]
          }
          continue
        }
        let pdf: InstanceType<typeof jsPDF> | null = null
        for (const sc of screens) {
          const bytes = await fetchBytes(sc.imageUrl)
          const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "image/jpeg" }))
            const img = new window.Image()
            img.onload = () => {
              URL.revokeObjectURL(url)
              resolve({ w: img.naturalWidth, h: img.naturalHeight })
            }
            img.onerror = (e) => {
              URL.revokeObjectURL(url)
              reject(e)
            }
            img.src = url
          })
          const orientation = size.w >= size.h ? "landscape" : "portrait"
          if (!pdf) pdf = new jsPDF({ orientation, unit: "px", format: [size.w, size.h] })
          else pdf.addPage([size.w, size.h], orientation)
          pdf.addImage(bytes, "JPEG", 0, 0, size.w, size.h)
        }
        if (pdf) files[`${base}.pdf`] = [new Uint8Array(pdf.output("arraybuffer")), { level: 0 }]
      }
      const zipped = zipSync(files)
      saveBlob(
        new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }),
        `screenshots-${Date.now()}.zip`
      )
      toast({ title: "Download started", description: `${pluralShots(captures.length)} downloaded.` })
      if (scope === "selected") clearSelection()
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Could not download the screenshots.",
        variant: "destructive",
      })
      throw err
    }
  }

  const handleUpdateMeta = async (
    id: string,
    data: { contractId?: string; taskId?: string | null }
  ) => {
    try {
      // Every monitor of the capture moves with it.
      await reassign(withAllScreens(new Set([id])), data)
      toast({ title: "Updated", description: "Screenshot assignment updated." })
    } catch (err) {
      toast({
        title: "Update failed",
        description: apiErrorMessage(err, "Couldn't update assignment. Please try again."),
        variant: "destructive",
      })
    }
  }

  const toggleScreenshotSelection = (id: string) => {
    setSelectedScreenshots(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Edit Details: moves the selection (every monitor) to a contract / task. */
  const applyEditDetails = async (contractId: string, taskId: string | null) => {
    await reassign(withAllScreens(selectedScreenshots), { contractId, taskId })
    toast({ title: "Updated", description: `${pluralShots(selectedScreenshots.size)} updated.` })
    clearSelection()
  }

  const flatScreenshots = useMemo(
    () => flattenScreenshots(timeBlocks),
    [timeBlocks]
  )
  // Rules of the open screenshot's own contract (a secondary monitor shares
  // its capture's contract). Until they load, nothing is restricted — the
  // server enforces them either way.
  const selectedRules = useMemo(() => {
    const card = flatScreenshots.find(
      (f) =>
        f.screenshot.id === selectedScreenshotId ||
        f.screenshot.screens?.some((sc) => sc.id === selectedScreenshotId)
    )
    const contractId = card?.screenshot.contractId
    return (contractId && rulesByContract[contractId]) || null
  }, [flatScreenshots, selectedScreenshotId, rulesByContract])
  // A grid card stands for every monitor of its capture, so bulk actions on
  // it apply to all of them, not only the default screen.
  const withAllScreens = (ids: Set<string>) =>
    Array.from(ids).flatMap((id) => {
      const card = flatScreenshots.find((f) => f.screenshot.id === id)
      return card?.screenshot.screens?.map((sc) => sc.id) ?? [id]
    })

  // ── Bulk selection summary (bulk bar + Edit Details) ──
  const allCardIds = flatScreenshots.map((f) => f.screenshot.id)
  const selectedCards = flatScreenshots.filter((f) => selectedScreenshots.has(f.screenshot.id))
  const selectionState: boolean | "indeterminate" =
    selectedCards.length === 0
      ? false
      : selectedCards.length === allCardIds.length
        ? true
        : "indeterminate"
  const selectionContractIds = new Set(selectedCards.map((f) => f.screenshot.contractId ?? ""))
  const selectionTaskIds = new Set(selectedCards.map((f) => f.screenshot.taskId ?? ""))
  const oneContract = selectionContractIds.size === 1
  const selectionSource: SelectionSource = {
    contractId: oneContract ? Array.from(selectionContractIds)[0] || null : null,
    contractName: oneContract
      ? selectedCards[0]?.projectName ?? ""
      : `${selectionContractIds.size} contracts`,
    taskId: oneContract && selectionTaskIds.size === 1 ? Array.from(selectionTaskIds)[0] || null : null,
    taskName:
      selectionTaskIds.size === 1 ? selectedCards[0]?.taskName ?? "" : `${selectionTaskIds.size} tasks`,
  }
  // Each block counts ten minutes per capture, so the selection does too.
  const selectionMinutes = selectedCards.length * 10
  // Contract rules decide which bulk actions are on; the server enforces them too.
  const selectionRules = selectedCards.map((f) =>
    f.screenshot.contractId ? rulesByContract[f.screenshot.contractId] : undefined
  )
  const bulkCanBlur = selectionRules.every((r) => r?.allowBlur !== false)
  const bulkCanDelete = selectionRules.every((r) => r?.allowDelete !== false)
  const bulkCanEdit = selectionRules.every((r) => r?.allowReassign !== false)
  const selectAllCards = (checked: boolean) => {
    setBulkSelectionEnabled(true)
    setSelectedScreenshots(checked ? new Set(allCardIds) : new Set())
  }

  const appliedChips = getAppliedChips(appliedFilters, filterOptions)
  const totalActiveFilters = Object.values(appliedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  const selectScreenshot = (id: string) => {
    setSelectedScreenshotId(id)
    setDetailsOpen(true)
  }

  const removeChip = (chip: AppliedChip) => {
    if (chip.value === undefined) {
      updateFilters({ ...appliedFilters, [chip.category]: [] })
    } else {
      updateFilters({
        ...appliedFilters,
        [chip.category]: appliedFilters[chip.category].filter(
          (v) => v !== chip.value
        ),
      })
    }
  }

  return (
    <AuthenticatedRoute>
      <TimeTrackingDataContext.Provider value={timeTrackingData}>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[calc(var(--sidebar-content-pl,274px)-18px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-8 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex h-10 items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-normal text-dark-blue-400">
                Total time <span className="font-bold">{totalTime}</span>
              </h1>
              {manualTimeLabel && (
                <Badge size="lg" className="gap-x-1.5 rounded-md text-dark-blue-400">
                  <Plus className="size-4" />
                  Manual time <span className="font-bold">{manualTimeLabel}</span>
                </Badge>
              )}
              {/* US-89: only shown when a single contract is selected — with
                  "all" selected, contracts can have different rates, and
                  picking one to display (or averaging) would be a guess. */}
              {contractFilter !== "all" && realContracts.find((c) => c.id === contractFilter) && (
                <span className="text-sm text-gray-400">
                  Rate{" "}
                  <span className="font-bold text-primary-500">
                    ${realContracts.find((c) => c.id === contractFilter)!.rate}/hr
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isClient && (
                <Button
                  variant="ghost"
                  visual="gray"
                  size="sm"
                  className="text-gray-500"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => setShowManualTimeDialog(true)}
                >
                  Add Manual Time
                </Button>
              )}
              <Button
                variant="outlined"
                visual="primary"
                size="sm"
                className="border-2 border-primary-500 bg-white text-base text-primary-500 hover:bg-primary-50"
                leftIcon={<Clock className="size-4" />}
                loading={openingDesktopTracker}
                // BTB-325: open the desktop tracker if it's installed, else
                // offer the installer for this OS. Manual entries stay on
                // "Add Manual Time".
                onClick={async () => {
                  setOpeningDesktopTracker(true)
                  try {
                    // G8: the gate is asked first; a refusal opens the blocked modal
                    // and nothing below runs. Otherwise: either opens the installed
                    // tracker or offers the installer.
                    await runStart(() =>
                      openDesktopTracker(() => {
                        setOpeningDesktopTracker(false)
                        setShowDownloadTracker(true)
                      })
                    )
                  } finally {
                    setOpeningDesktopTracker(false)
                  }
                }}
              >
                Log Time
              </Button>
              <IconButton
                variant="outlined"
                visual="gray"
                size="sm"
                className="border-gray-200 bg-white"
                onClick={() =>
                  toast({
                    title: "Help",
                    description:
                      "Visit support.marketeq.com for time tracking guides.",
                  })
                }
              >
                <HelpCircle className="size-4" />
              </IconButton>
              <IconButton
                variant="outlined"
                visual="gray"
                size="sm"
                className="border-gray-200 bg-white"
                onClick={() => setShowSettingsDialog(true)}
              >
                <Settings02 className="size-4" />
              </IconButton>
            </div>
          </div>

          {/* ── Filter bar, or the bulk bar while screenshots are being selected ── */}
          {bulkSelectionEnabled && !isClient ? (
            <div className="mt-6 flex items-center justify-between gap-x-4 rounded-lg bg-gray-100 py-3 pl-3 pr-6">
              <div className="flex items-center gap-x-4">
                <div className="flex h-9 items-center gap-x-1 pl-2">
                  <Checkbox
                    checked={selectionState}
                    onCheckedChange={() => selectAllCards(selectionState !== true)}
                    size="md"
                    aria-label="Select all screenshots"
                    className="hover:ring-0 active:ring-0"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="size-6 p-0 text-gray-500 hover:bg-transparent"
                        aria-label="Selection options"
                      >
                        <ChevronDown className="size-[18px]" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => selectAllCards(true)}>Select All</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => selectAllCards(false)}>Select None</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="text-base font-medium text-dark-blue-400">
                  {selectedScreenshots.size} selected
                </span>
                <Button
                  variant="link"
                  visual="primary"
                  size="sm"
                  className="font-semibold"
                  disabled={selectedScreenshots.size === 0}
                  onClick={() => setSelectedScreenshots(new Set())}
                >
                  Clear
                </Button>
              </div>
              <div className="flex h-9 items-center gap-x-3">
                {[
                  { label: "Edit", Icon: Edit03, onClick: () => setShowEditDialog(true), enabled: bulkCanEdit },
                  {
                    label: "Blur",
                    Icon: Droplet,
                    onClick: () =>
                      setBlurTargets({ ids: withAllScreens(selectedScreenshots), count: selectedScreenshots.size }),
                    enabled: bulkCanBlur,
                  },
                  { label: "Transfer", Icon: SwitchHorizontal01, onClick: () => setShowEditDialog(true), enabled: bulkCanEdit },
                  { label: "Change Task", Icon: CheckSquare, onClick: () => setShowEditDialog(true), enabled: bulkCanEdit },
                  { label: "Download", Icon: Download, onClick: () => setShowDownloadDialog(true), enabled: true },
                  {
                    label: "Delete",
                    Icon: Trash01,
                    onClick: () =>
                      setDeleteTargets({ ids: withAllScreens(selectedScreenshots), count: selectedScreenshots.size }),
                    enabled: bulkCanDelete,
                  },
                ].map(({ label, Icon, onClick, enabled }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="gap-x-2 text-gray-500"
                    leftIcon={<Icon className="size-4" />}
                    disabled={selectedScreenshots.size === 0 || !enabled}
                    onClick={onClick}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  visual="primary"
                  size="sm"
                  className="gap-x-2"
                  leftIcon={<X className="size-4" />}
                  onClick={clearSelection}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
          <div className="flex items-center justify-between mt-6 gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  buttonVariants({
                    variant: "outlined",
                    visual: "gray",
                    size: "sm",
                  }),
                  "w-[62px] justify-start gap-x-2 border-gray-200 bg-white px-2",
                  isClient && "hidden"
                )}
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => selectAllCards(true)}
                  size="md"
                  aria-label="Select all screenshots"
                  className="hover:ring-0 active:ring-0"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="size-[18px] p-0 text-gray-500 hover:bg-transparent"
                      aria-label="Selection options"
                    >
                      <ChevronDown className="size-[18px]" />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => selectAllCards(true)}>Select All</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => selectAllCards(false)}>Select None</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Filter button */}
              <FilterPopover
                applied={appliedFilters}
                options={filterOptions}
                onChange={updateFilters}
              >
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="border-gray-200 bg-white px-3 text-dark-blue-400"
                  leftIcon={
                    totalActiveFilters > 0 ? (
                      <Badge visual="primary" variant="circular" className="size-5 p-0">
                        {totalActiveFilters}
                      </Badge>
                    ) : (
                      <FilterLines className="size-4 text-gray-500" />
                    )
                  }
                >
                  Filter
                </Button>
              </FilterPopover>

              {/* Contract filter */}
              <Select
                value={contractFilter}
                onValueChange={(v) =>
                  updateFilters({ ...appliedFilters, contracts: v === "all" ? [] : [v] })
                }
              >
                <SelectTrigger className="h-9 w-auto max-w-[240px] gap-x-2 border-gray-200 bg-white font-semibold text-dark-blue-400 shadow-xs [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left [&>svg]:shrink-0">
                  <SelectValue placeholder="All Contracts">
                    {appliedFilters.contracts.length > 1
                      ? `${appliedFilters.contracts.length} Contracts`
                      : contractFilter === "all"
                        ? "All Contracts"
                        : contractOptions.find((c) => c.id === contractFilter)?.name ??
                          "All Contracts"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contracts</SelectItem>
                  {contractOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range */}
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="border-gray-200 bg-white text-dark-blue-400"
                    leftIcon={<CalendarPlus02 className="size-5" />}
                  >
                    {dateRange}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={4}
                  className="w-auto border-0 bg-transparent p-0 shadow-none"
                >
                  <DoubleCalendar
                    value={
                      dateFrom && dateTo
                        ? { start: new Date(dateFrom), end: new Date(dateTo) }
                        : undefined
                    }
                    preset={datePreset}
                    onCancel={() => setDateOpen(false)}
                    onApply={(range, preset) => {
                      if (range) {
                        const start = new Date(range.start)
                        start.setHours(0, 0, 0, 0)
                        const end = new Date(range.end)
                        end.setHours(23, 59, 59, 999)
                        setDateFrom(start.toISOString())
                        setDateTo(end.toISOString())
                      } else {
                        setDateFrom(undefined)
                        setDateTo(undefined)
                      }
                      setDatePreset(preset)
                      setDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="size-6 p-0 text-gray-500 hover:bg-transparent"
                    aria-label={`Sort: ${sortOptions.find((o) => o.key === sort)?.label}`}
                  >
                    <SortAs className="size-6" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[189px]">
                  <DropdownMenuLabel className="px-3 py-2 text-base font-semibold text-dark-blue-400">
                    Sort by
                  </DropdownMenuLabel>
                  {sortGroups.map((group, gi) => (
                    <React.Fragment key={gi}>
                      {gi > 0 && <DropdownMenuSeparator />}
                      {group.map((o) => (
                        <DropdownMenuItem
                          key={o.key}
                          onSelect={() => setSort(o.key)}
                          className={cn(
                            "gap-x-2 px-3 text-sm",
                            o.key === sort ? "font-semibold text-dark-blue-400" : "text-gray-500"
                          )}
                        >
                          <Check
                            className={cn(
                              "size-4 shrink-0 text-primary-500",
                              o.key !== sort && "invisible"
                            )}
                          />
                          {o.label}
                        </DropdownMenuItem>
                      ))}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Timezone */}
              <Select value={userTimezone} onValueChange={setUserTimezone}>
                <SelectTrigger className="h-9 w-auto gap-x-2 border-gray-200 bg-white font-semibold text-dark-blue-400 shadow-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptionsWith(userTimezone).map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {formatTimezoneLabel(tz.value, tz.city)}
                      {tz.value === browserTimezone ? " (Me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {/* ── Active filter chips ── */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              appliedChips.length > 0
                ? "grid-rows-[1fr] opacity-100 mt-6"
                : "grid-rows-[0fr] opacity-0 mt-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="flex items-center gap-3 flex-wrap">
                {appliedChips.map((chip) => (
                  <Badge
                    key={`${chip.category}-${chip.value ?? "count"}`}
                    visual="primary"
                    className="h-9 gap-x-3 rounded-md px-3 text-base animate-in fade-in slide-in-from-left-2 zoom-in-95 duration-200"
                  >
                    {chip.count !== undefined && (
                      <Badge visual="primary" variant="circular" className="size-5 p-0 bg-white">
                        {chip.count}
                      </Badge>
                    )}
                    {chip.label}
                    <BadgeCloseButton
                      onClick={() => removeChip(chip)}
                      aria-label={`Remove ${chip.label}`}
                    >
                      <X className="size-4" />
                    </BadgeCloseButton>
                  </Badge>
                ))}
                <FilterPopover
                  applied={appliedFilters}
                  options={filterOptions}
                  onChange={updateFilters}
                >
                  <Button
                    variant="filled"
                    visual="gray"
                    size="sm"
                    className="bg-gray-100 px-3 text-base font-medium text-gray-500 shadow-none hover:bg-gray-200"
                    leftIcon={<Plus className="size-5" />}
                  >
                    Add Filter
                  </Button>
                </FilterPopover>
                <Button
                  variant="link"
                  visual="primary"
                  className="text-base"
                  onClick={() => updateFilters(emptyAppliedFilters)}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* ── Time blocks ── */}
          <div className="mt-6 space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">
                    Loading screenshots...
                  </span>
                </div>
              </div>
            ) : timeBlocks.length === 0 && hasActiveFilters ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Image01 className="size-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No screenshots match your current filters.
                </p>
                <Button
                  variant="link"
                  visual="primary"
                  onClick={() => updateFilters(emptyAppliedFilters)}
                >
                  Clear Filters
                </Button>
              </div>
            ) : timeBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Image01 className="size-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No activity recorded for this period.
                </p>
              </div>
            ) : (
              timeBlocks.map((block) => (
                <TimeBlockCard
                  key={block.id}
                  block={block}
                  selectedScreenshotId={selectedScreenshotId}
                  onSelectScreenshot={selectScreenshot}
                  bulkMode={bulkSelectionEnabled}
                  selectedScreenshots={selectedScreenshots}
                  onBulkToggle={toggleScreenshotSelection}
                  showCheckbox={!isClient}
                  onToggleBlock={(ids, checked) => {
                    setBulkSelectionEnabled(true)
                    setSelectedScreenshots((prev) => {
                      const next = new Set(prev)
                      for (const id of ids) {
                        if (checked) next.add(id)
                        else next.delete(id)
                      }
                      return next
                    })
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AddManualTimeDialog
        open={showManualTimeDialog}
        onOpenChange={setShowManualTimeDialog}
        onSaved={() => { fetchScreenshots(); fetchManualTime() }}
      />

      <EditDetailsDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        count={selectedCards.length}
        minutes={selectionMinutes}
        source={selectionSource}
        onApply={applyEditDetails}
      />

      <DownloadScreenshotsDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        selectedCount={selectedCards.length}
        totalCount={flatScreenshots.length}
        onDownload={downloadScreenshots}
      />

      <ReasonActionDialog
        kind="blur"
        open={!!blurTargets}
        onOpenChange={(v) => !v && setBlurTargets(null)}
        count={blurTargets?.count ?? 0}
        onConfirm={(reason) => confirmBlur(blurTargets?.ids ?? [], reason)}
      />

      <ReasonActionDialog
        kind="delete"
        open={!!deleteTargets}
        onOpenChange={(v) => !v && setDeleteTargets(null)}
        count={deleteTargets?.count ?? 0}
        onConfirm={(reason) => confirmDelete(deleteTargets?.ids ?? [], reason)}
      />

      <TimeTrackingSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          isClient={settingsIsClient}
          contracts={(contractSides?.client ?? []).map((c) => ({
            id: c.id,
            name: c.title || "Untitled contract",
          }))}
          onPreferencesSaved={applyPreferences}
        />

      <DownloadDesktopTrackerDialog
        open={showDownloadTracker}
        onOpenChange={setShowDownloadTracker}
      />
      {startTimeGateDialog}

      <ScreenshotDetailsDialog
        showTooltips={userShowTooltips}
        flatScreenshots={flatScreenshots}
        openId={detailsOpen ? selectedScreenshotId : null}
        onOpenChange={(open) => setDetailsOpen(open)}
        onNavigate={(id) => setSelectedScreenshotId(id)}
        onDelete={isClient || selectedRules?.allowDelete === false ? undefined : (id) => setDeleteTargets({ ids: [id], count: 1 })}
        onBlur={isClient || selectedRules?.allowBlur === false ? undefined : (id) => setBlurTargets({ ids: [id], count: 1 })}
        allowReassign={selectedRules?.allowReassign ?? true}
        isClient={isClient}
        onUnblur={handleUnblurScreenshot}
        onRequestAccess={handleRequestAccess}
        onDownload={handleDownloadScreenshot}
        onUpdateMeta={handleUpdateMeta}
      />

      </TimeTrackingDataContext.Provider>
    </AuthenticatedRoute>
  )
}
