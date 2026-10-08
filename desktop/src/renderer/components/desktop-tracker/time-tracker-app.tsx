"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/utils/functions"
import { TrackerHeader } from "./tracker-header"
import { DateTimeBar } from "./date-time-bar"
import { TaskSearch, SearchResult } from "./task-search"
import { TimerControls } from "./timer-controls"
import { TimerDisplay } from "./timer-display"
import { ActiveTrackingBar } from "./active-tracking-bar"
import { DaySummary } from "./day-summary"
import { ContractEntry, TaskEntry } from "./contract-entry"
import { AccountMenu, MenuSection } from "./account-menu"
import { NewTaskForm } from "./new-task-form"
import { ManualTimeForm } from "./manual-time-form"
import { deriveUiRunningPaused, computeDisplayedElapsedSec, decideActiveTaskAction } from "./timer-ui-state"
import { IdleResolutionModal } from "../../views/IdleResolutionModal"
import type { IdleResolutionNeededPayload, TimerSnapshotDTO } from "../../../shared/ipc-contracts"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contract {
  id: string
  name: string
  clientHandle: string
  avatarSrc?: string
  /** Hourly rate for this contract (from the contracts API). */
  rate?: number
  tasks: TaskEntry[]
}

interface DayGroup {
  label: string
  fullDate: string
  totalHours: string
  hourlyRate: number
  contracts: Contract[]
}

interface TodayTaskStat {
  contractId: string
  taskId: string
  trackedSeconds: number
  firstStartedAt: number
  lastEndedAt: number | null
  /** The live session's share of trackedSeconds (0 unless running). */
  liveSeconds?: number
}

interface TodayStats {
  trackedSeconds: number
  earnedCents: number
  currency: string
  goalSeconds: number
  tasks?: TodayTaskStat[]
  lastTask?: { contractId: string; taskId: string } | null
  yesterday?: { trackedSeconds: number; earnedCents: number; tasks: TodayTaskStat[] }
}

// ── Persisted UI state (per device) ─────────────────────────────────────────

const EXPANDED_CARDS_KEY = "dtt.ui.expandedCards"
const COLLAPSED_DAYS_KEY = "dtt.ui.collapsedDays"

function cardKey(dayLabel: string, contractId: string): string {
  return `${dayLabel}:${contractId}`
}

function readStoredSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [])
  } catch {
    return new Set()
  }
}

function writeStoredSet(key: string, value: Set<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...value]))
  } catch {
    // Storage unavailable — the state just won't survive a relaunch.
  }
}

interface TimeTrackerAppProps {
  userName?: string
  userEmail?: string
  userId?: string
  userAvatar?: string
  initialDays?: DayGroup[]
  className?: string
}

type View = "main" | "menu" | "new-task" | "manual-time" | "all-tasks"

/** Staggered fade-in wrapper — each child fades in with increasing delay */
function StaggerIn({ children, stagger = 50 }: { children: React.ReactNode; stagger?: number }) {
  const items = React.Children.toArray(children)
  return (
    <>
      {items.map((child, i) => (
        <div
          key={i}
          className="animate-stagger-in"
          style={{ animationDelay: `${i * stagger}ms`, animationFillMode: "both" }}
        >
          {child}
        </div>
      ))}
    </>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatUtcTime() {
  const now = new Date()
  const h = now.getUTCHours()
  const m = now.getUTCMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `UTC ${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
}

function calcTotalHours(tasks: TaskEntry[]): string {
  let total = 0
  for (const t of tasks) {
    const parts = t.duration.split(":")
    total += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  }
  const hrs = (total / 3600).toFixed(1)
  return `${hrs} hrs`
}

function calcDayTrackedHours(contracts: Contract[]): string {
  let total = 0
  for (const c of contracts) {
    for (const t of c.tasks) {
      const parts = t.duration.split(":")
      total += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    }
  }
  return (total / 3600).toFixed(1)
}

function calcDayEarnings(contracts: Contract[], rate: number): string {
  let total = 0
  for (const c of contracts) {
    for (const t of c.tasks) {
      const parts = t.duration.split(":")
      total += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    }
  }
  return `$${((total / 3600) * rate).toFixed(0)}`
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_CONTRACTS: Contract[] = [
  {
    id: "c1",
    name: "Detecting Edges Usi...",
    clientHandle: "bitcoinmasters321",
    tasks: [
      { id: "t1", name: "Card sorting features", timeRange: "10:32 am - 4:39 pm", duration: "01:00:00", progress: 60 },
      { id: "t2", name: "Low-fidelity wireframing", timeRange: "10:32 am - 4:39 pm", duration: "01:00:00" },
    ],
  },
  {
    id: "c2",
    name: "Referrizer Web Application",
    clientHandle: "referrizerllc",
    tasks: [
      { id: "t3", name: "Fine-tuning wireframes", timeRange: "10:32 am - 4:39 pm", duration: "01:30:00" },
    ],
  },
]

function generateSeedDays(): DayGroup[] {
  const taskNames = [
    "Card sorting features", "Low-fidelity wireframing", "Fine-tuning wireframes",
    "Competitive analysis", "Auditing screenshots", "Build high-fidelity wireframes",
    "Verify final wireframes", "User flow mapping", "Component library setup",
    "Design system tokens", "Responsive breakpoints", "Icon set creation",
    "Typography scale", "Color palette refinement", "Motion design specs",
    "Accessibility audit", "Heuristic evaluation", "Stakeholder presentation",
    "Developer handoff prep", "QA visual regression",
  ]
  const contracts: { id: string; name: string; handle: string }[] = [
    { id: "c1", name: "Detecting Edges Usi...", handle: "bitcoinmasters321" },
    { id: "c2", name: "Referrizer Web Application", handle: "referrizerllc" },
    { id: "c3", name: "Crypto App Mobile", handle: "bitcoinmasters321" },
    { id: "c4", name: "Marketing VSL Funnel", handle: "christheclient234" },
    { id: "c5", name: "Saas Landing Page", handle: "referrizerllc" },
  ]

  const days: DayGroup[] = []
  const now = new Date()

  for (let d = 0; d < 14; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)

    const fullDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

    let label: string
    if (d === 0) label = "Today"
    else if (d === 1) label = "Yesterday"
    else label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

    // Pick 1–3 contracts per day
    const numContracts = 1 + (d % 3)
    const dayContracts: Contract[] = []

    for (let ci = 0; ci < numContracts; ci++) {
      const c = contracts[(d + ci) % contracts.length]
      const numTasks = 2 + ((d + ci) % 4)
      const tasks: TaskEntry[] = []

      for (let ti = 0; ti < numTasks; ti++) {
        const tName = taskNames[(d * 3 + ci * 2 + ti) % taskNames.length]
        const hrs = 1 + ((d + ti) % 3)
        tasks.push({
          id: `t-${d}-${ci}-${ti}`,
          name: tName,
          timeRange: `${9 + ti}:00 am - ${10 + ti + hrs}:00 ${ti + hrs > 3 ? "pm" : "am"}`,
          duration: `0${hrs}:00:00`,
          progress: d === 0 ? undefined : Math.min(20 + (d * 15 + ti * 25) % 80, 100),
        })
      }

      dayContracts.push({
        id: `${c.id}-d${d}`,
        name: c.name,
        clientHandle: c.handle,
        tasks,
      })
    }

    const trackedHours = dayContracts.reduce((sum, c) =>
      sum + c.tasks.reduce((ts, t) => ts + parseInt(t.duration.split(":")[0]), 0), 0)

    days.push({
      label,
      fullDate,
      totalHours: "8",
      hourlyRate: 75,
      contracts: dayContracts,
    })
  }

  return days
}

const SEED_DAYS: DayGroup[] = generateSeedDays()

// ─── Mini Header Tooltip Button ─────────────────────────────────────────────

/** Button with portaled tooltip for minimized header icons */
function MiniHeaderBtn({
  onClick,
  tooltip,
  children,
  className,
}: {
  onClick: () => void
  tooltip: string
  children: React.ReactNode
  className?: string
}) {
  const [hovered, setHovered] = React.useState(false)
  const ref = React.useRef<HTMLButtonElement>(null)
  const [tipStyle, setTipStyle] = React.useState<React.CSSProperties>({ position: "fixed", visibility: "hidden" })
  const tipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!hovered) return
    const btn = ref.current
    const tip = tipRef.current
    if (!btn || !tip) return
    const rect = btn.getBoundingClientRect()
    const tipW = tip.offsetWidth
    let left = rect.left + rect.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    setTipStyle({
      position: "fixed",
      left,
      top: rect.bottom + 6,
      visibility: "visible",
    })
  }, [hovered])

  return (
    <>
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn("shrink-0", className)}
      >
        {children}
      </button>
      {hovered && ReactDOM.createPortal(
        <div
          ref={tipRef}
          className="px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs font-medium shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 whitespace-nowrap z-[400] pointer-events-none"
          style={tipStyle}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Smooth Collapsible ─────────────────────────────────────────────────────

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number>(0)

  React.useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    ro.observe(el)
    setHeight(el.scrollHeight)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      style={{ height: open ? height || "auto" : 0 }}
      className="overflow-hidden transition-[height] duration-150 ease-in-out"
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}

// ─── All Tasks View ─────────────────────────────────────────────────────────

/** Fixed tooltip that portals to body to escape overflow */
function FixedTooltip({
  anchorRef,
  children,
  wide,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
  wide?: boolean
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number; below: boolean } | null>(null)

  React.useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const showBelow = rect.top < 60
    let left = rect.left + rect.width / 2
    const tipWidth = wide ? 208 : 160
    left = Math.max(tipWidth / 2 + 8, Math.min(left, window.innerWidth - tipWidth / 2 - 8))
    setPos({
      left,
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      below: showBelow,
    })
  }, [anchorRef, wide])

  if (!pos) return null
  return ReactDOM.createPortal(
    <div
      className={cn(
        "fixed px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 pointer-events-none z-[400]",
        wide ? "w-52 whitespace-normal text-left leading-relaxed" : "whitespace-nowrap"
      )}
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.below ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
      }}
    >
      {children}
    </div>,
    document.body
  )
}

/** Interactive switch-contract tooltip for AllTasksView */
function SwitchContractTip({
  anchorRef,
  onSwitch,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  onSwitch: () => void
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number; below: boolean } | null>(null)
  React.useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const showBelow = rect.top < 60
    let left = rect.left + rect.width / 2
    left = Math.max(112, Math.min(left, window.innerWidth - 112))
    setPos({ left, top: showBelow ? rect.bottom + 6 : rect.top - 6, below: showBelow })
  }, [anchorRef])
  if (!pos) return null
  return ReactDOM.createPortal(
    <div
      className="fixed w-[210px] px-3 py-2.5 rounded-lg bg-white text-left text-xs shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-gray-100 z-[400]"
      style={{ left: pos.left, top: pos.top, transform: pos.below ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)" }}
    >
      <p className="text-dark-blue-400 leading-normal">You can only track one contract at a time.</p>
      <button onClick={(e) => { e.stopPropagation(); onSwitch() }} className="mt-1 text-primary-500 font-medium hover:text-primary-600 hover:underline transition cursor-pointer">
        Switch contracts
      </button>
    </div>,
    document.body
  )
}

function AllTasksPlayButton({
  onClick,
  contractId,
  activeContractId,
  onSwitchContract,
}: {
  onClick: () => void
  contractId: string
  activeContractId?: string | null
  onSwitchContract?: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  const isTracking = !!activeContractId
  const isSameContract = activeContractId === contractId
  const isDifferentContract = isTracking && !isSameContract
  const disabled = isDifferentContract

  const tooltipText = !isTracking
    ? "Start tracking time"
    : isSameContract
    ? "Switch to this task"
    : null

  const show = () => { if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null }; setHovered(true) }
  const hide = () => { hideTimeout.current = setTimeout(() => setHovered(false), 150) }

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => { if (!disabled) onClick() }}
        className={cn(
          "transition shrink-0",
          disabled ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-primary-500"
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.5 5l4 3-4 3V5z" fill="currentColor" />
        </svg>
      </button>
      {hovered && disabled && (
        <div onMouseEnter={show} onMouseLeave={hide}>
          <SwitchContractTip anchorRef={ref} onSwitch={() => { setHovered(false); onSwitchContract?.() }} />
        </div>
      )}
      {hovered && !disabled && tooltipText && (
        <FixedTooltip anchorRef={ref}>
          {tooltipText}
        </FixedTooltip>
      )}
    </div>
  )
}

function AllTasksView({
  days,
  onBack,
  onPlayTask,
  activeContractId,
  onSwitchContract,
}: {
  days: DayGroup[]
  onBack: () => void
  onPlayTask: (taskId: string, contractId: string) => void
  activeContractId?: string | null
  onSwitchContract?: (contractId: string) => void
}) {
  const [filter, setFilter] = React.useState("")

  const allTasks: (TaskEntry & { contractId: string; contractName: string })[] = []
  for (const day of days) {
    for (const c of day.contracts) {
      for (const t of c.tasks) {
        allTasks.push({ ...t, contractId: c.id, contractName: c.name })
      }
    }
  }

  const filtered = filter
    ? allTasks.filter(
        (t) =>
          t.name.toLowerCase().includes(filter.toLowerCase()) ||
          t.contractName.toLowerCase().includes(filter.toLowerCase())
      )
    : allTasks

  return (
    <>
      {/* Search bar with back arrow */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0">
        <button onClick={onBack} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-dark-blue-400 transition shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a task..."
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-50 shrink-0">
        <span>Task Name</span>
        <span>Time Tracked</span>
      </div>

      {/* Scrollable task list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No tasks found</div>
        ) : (
          filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-25 transition">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-blue-400 leading-5">{task.name}</p>
                <p className="text-xs text-gray-400 leading-4">{task.timeRange}</p>
                {task.progress !== undefined && (
                  <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden mt-1">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-dark-blue-400 tabular-nums shrink-0">{task.duration}</span>
              <AllTasksPlayButton
                onClick={() => onPlayTask(task.id, task.contractId)}
                contractId={task.contractId}
                activeContractId={activeContractId}
                onSwitchContract={() => onSwitchContract?.(task.contractId)}
              />
            </div>
          ))
        )}
      </div>
    </>
  )
}

// ─── Main Widget ────────────────────────────────────────────────────────────

export function TimeTrackerApp({
  userName = "Christopher Torres",
  userEmail = "chris@marketeqdigital.com",
  userId,
  userAvatar,
  initialDays,
  className,
}: TimeTrackerAppProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [view, _setView] = React.useState<View>("main")
  const [viewKey, setViewKey] = React.useState(0)
  const [viewTransition, setViewTransition] = React.useState<"enter" | "idle">("idle")
  const [slideDirection, setSlideDirection] = React.useState<"left" | "right">("left")

  const setView = React.useCallback((next: View) => {
    _setView((prev) => {
      // Skip transition if staying on the same view
      if (prev === next) return prev
      const isGoingBack = next === "main"
      setSlideDirection(isGoingBack ? "right" : "left")
      setViewTransition("enter")
      setViewKey((k) => k + 1)
      setTimeout(() => setViewTransition("idle"), 200)
      return next
    })
  }, [])
  // Always start with a "Today" row so the locally-computed todayStats
  // below has somewhere to render even if the contracts fetch never
  // succeeds (e.g. offline right after a restart) — fetchContracts()
  // overwrites this with real contract data once/if it succeeds.
  const [days, setDays] = React.useState<DayGroup[]>(
    initialDays || [{ label: "Today", fullDate: formatDate(), totalHours: "0", hourlyRate: 75, contracts: [] }]
  )
  const [contractsLoaded, setContractsLoaded] = React.useState(false)

  // ── "Today" hours/earnings — persisted locally, survives app restarts ──
  const [todayStats, setTodayStats] = React.useState<TodayStats | null>(null)
  // Expanded contract cards, keyed per strip ("Today:<id>", "Yesterday:<id>")
  // so the same contract's cards open/close independently in each strip
  // (DTT-AC-024.2), and collapsed strips by label. Both persist across
  // launches (DTT-AC-024.2 / AC-040.1 persistence clause). localStorage is a
  // per-device UI preference; it can be unavailable, so every access is
  // guarded and the app works without it.
  const [expandedContracts, setExpandedContracts] = React.useState<Set<string>>(
    () => readStoredSet(EXPANDED_CARDS_KEY),
  )
  const [collapsedDays, setCollapsedDays] = React.useState<Set<string>>(
    () => readStoredSet(COLLAPSED_DAYS_KEY),
  )
  React.useEffect(() => { writeStoredSet(EXPANDED_CARDS_KEY, expandedContracts) }, [expandedContracts])
  React.useEffect(() => { writeStoredSet(COLLAPSED_DAYS_KEY, collapsedDays) }, [collapsedDays])

  // Search
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedTask, setSelectedTask] = React.useState<SearchResult | null>(null)

  // Timer
  const [isRunning, setIsRunning] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [activeTask, setActiveTask] = React.useState<{ taskName: string; contractName: string; contractId: string; clientHandle: string; taskId?: string } | null>(null)
  const [trackingStartTime, setTrackingStartTime] = React.useState<Date | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  // The displayed clock is always "backend-confirmed elapsed seconds, plus
  // real time since that confirmation" — never computed from an absolute
  // start time. See timer-ui-state.ts for why (that's what caused the
  // clock to silently jump forward by the paused/idle duration on resume).
  const elapsedBaselineRef = React.useRef<{ sec: number; at: number }>({ sec: 0, at: Date.now() })
  // "Paused" covers two different backend states (manual/idle pause vs. on
  // break), and ending each one is a different IPC call (resume vs.
  // breakEnd). This ref — not state, since nothing needs to re-render off
  // it directly — lets handlePause pick the right one.
  const isOnBreakRef = React.useRef(false)
  // Mirrors `activeTask` for reading inside applyTimerSnapshot without
  // making that callback depend on (and go stale with) activeTask itself.
  const activeTaskRef = React.useRef(activeTask)
  React.useEffect(() => { activeTaskRef.current = activeTask }, [activeTask])
  // The backend snapshot only carries contractId/taskId, not display names.
  // When a real running/paused session is confirmed but the renderer has no
  // activeTask for it (e.g. the window reloaded mid-session — confirmed
  // live: the header card's clock/controls never appear afterward because
  // they're gated on `isRunning && activeTask`), this is where we're told
  // what to look up once `days` (task/contract names) is loaded. Existing
  // design is unchanged — this only restores the data that design expects.
  const [pendingPickedContract, setPendingPickedContract] = React.useState<{ contractId: string; taskId: string } | null>(null)
  // Idle event the backend is waiting on the user to resolve (Keep / Discard /
  // Convert to break). Non-null renders the IdleResolutionModal below.
  const [pendingIdle, setPendingIdle] = React.useState<IdleResolutionNeededPayload | null>(null)

  // Clock
  const [utcTime, setUtcTime] = React.useState(formatUtcTime())
  const [dateStr] = React.useState(formatDate())

  // Header collapse — scroll-based OR manual (clicking date row chevron)
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false)
  const [headerManualCollapsed, setHeaderManualCollapsed] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const expandedHeaderRef = React.useRef<HTMLDivElement>(null)
  const runningContentRef = React.useRef<HTMLDivElement>(null)
  const idleContentRef = React.useRef<HTMLDivElement>(null)
  const [runningHeight, setRunningHeight] = React.useState<number>(0)
  const [idleHeight, setIdleHeight] = React.useState<number>(0)

  // Measure running/idle header heights for smooth transitions
  React.useEffect(() => {
    const el = runningContentRef.current
    if (!el) return
    setRunningHeight(el.scrollHeight)
    const ro = new ResizeObserver(() => setRunningHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isRunning, activeTask])

  React.useEffect(() => {
    const el = idleContentRef.current
    if (!el) return
    setIdleHeight(el.scrollHeight)
    const ro = new ResizeObserver(() => setIdleHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isRunning])

  // New task form context
  const [newTaskContractId, setNewTaskContractId] = React.useState<string | undefined>()

  // Whether the user cleared the active task chip to browse/switch tasks
  const [activeTaskCleared, setActiveTaskCleared] = React.useState(false)

  // 3-2-1 countdown before tracking starts
  const [countdown, setCountdown] = React.useState<number | null>(null)
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingStartRef = React.useRef<(() => void) | null>(null)

  // Floating alert for contract switch
  const [switchAlert, setSwitchAlert] = React.useState<string | null>(null)
  const switchAlertTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Floating alert for task creation
  const [taskCreatedAlert, setTaskCreatedAlert] = React.useState<string | null>(null)
  const taskCreatedTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Floating alert after manual time is submitted for review (AC-091.1)
  const [manualTimeAlert, setManualTimeAlert] = React.useState(false)
  const manualTimeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual time entry
  const [showManualTime, setShowManualTime] = React.useState(false)

  const hourlyRate = days[0]?.hourlyRate || 75

  // ── Fetch real contracts from backend API ──────────────────────────────
  React.useEffect(() => {
    let cancelled = false
    async function fetchContracts() {
      try {
        const contracts = await window.dtt?.contracts?.getMine?.()
        if (cancelled || !contracts || contracts.length === 0) return

        // Convert backend contracts into the DayGroup format the UI expects.
        // Group all active contracts under "Today" so they appear in the picker.
        // Convert backend contracts into the DayGroup format the UI expects.
        const today = new Date()
        const fullDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        const uiContractsPromises = contracts
          .filter((c) => c.status === 'ACTIVE' || c.status === 'active')
          .map(async (c) => {
            let tasks: { id: string; name: string; timeRange: string; duration: string }[] = []
            try {
              const data = await window.dtt?.contracts?.getTasks?.(c.id)
              if (Array.isArray(data) && data.length > 0) {
                tasks = data.map((t) => ({
                  id: t.id,
                  name: t.name,
                  timeRange: "Not started",
                  duration: "00:00:00",
                }))
              }
            } catch { /* no tasks — the card shows its "Add A Task" empty state */ }
            return {
              id: c.id,
              name: c.title || "Untitled Contract",
              clientHandle: c.clientName || c.clientId?.slice(0, 12) || "client",
              rate: Number(c.rate) || 0,
              tasks,
            }
          })
        const uiContracts: Contract[] = await Promise.all(uiContractsPromises)
        if (uiContracts.length > 0) {
          const todayGroup: DayGroup = {
            label: "Today",
            fullDate,
            totalHours: "0",
            hourlyRate: Number(contracts[0]?.rate) || 75,
            contracts: uiContracts,
          }
          setDays([todayGroup])
          setContractsLoaded(true)
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err)
      }
    }
    fetchContracts()
    return () => { cancelled = true }
  }, [])

  // ── "Today" hours/earnings — fetched from local SQLite via IPC, so it
  // survives app restarts (unlike the ephemeral `days` state above) ──────
  const refreshTodayStats = React.useCallback(async () => {
    try {
      const stats = await window.dtt?.stats?.getToday?.()
      if (stats) setTodayStats(stats)
    } catch (err) {
      console.error("Failed to fetch today stats:", err)
    }
  }, [])

  const applyTimerSnapshot = React.useCallback((snap: TimerSnapshotDTO) => {
    elapsedBaselineRef.current = { sec: snap.elapsedSec, at: Date.now() }
    setElapsed(snap.elapsedSec)
    const { isRunning: running, isPaused: paused } = deriveUiRunningPaused(snap)
    setIsRunning(running)
    setIsPaused(paused)
    isOnBreakRef.current = snap.isOnBreak
    if (!snap.pendingIdle) setPendingIdle(null)
    // Counting is the in-between step of Start, not "tracking ended" — see
    // decideActiveTaskAction in timer-ui-state.ts.
    const taskAction = decideActiveTaskAction({
      state: snap.state,
      running,
      hasPickedContract: !!snap.pickedContract,
      hasActiveTask: !!activeTaskRef.current,
    })
    if (taskAction === 'clear') {
      setActiveTask(null)
      setTrackingStartTime(null)
      setPendingPickedContract(null)
    } else if (taskAction === 'restore' && snap.pickedContract) {
      setPendingPickedContract(snap.pickedContract)
    }
  }, [])

  // Resolves the restore-after-remount case above once the task/contract
  // names (`days`) are available — they're fetched by a separate effect and
  // may not have loaded yet at the moment a snapshot needs them.
  React.useEffect(() => {
    if (!pendingPickedContract) return
    for (const day of days) {
      const contract = day.contracts.find((c) => c.id === pendingPickedContract.contractId)
      const task = contract?.tasks.find((t) => t.id === pendingPickedContract.taskId)
      if (contract && task) {
        setActiveTask({ taskName: task.name, contractName: contract.name, contractId: contract.id, clientHandle: contract.clientHandle, taskId: task.id })
        setPendingPickedContract(null)
        return
      }
    }
  }, [pendingPickedContract, days])

  React.useEffect(() => {
    refreshTodayStats()
    // Hydrate from whatever the backend's real state already is right now —
    // not just future transitions. Without this, a remount while a session
    // is already running/paused/on-break (confirmed live: happens on an HMR
    // reload, and would equally happen on an app relaunch mid-session per
    // the main process's own "crash recovery: swept orphaned open session"
    // path) leaves the UI stuck on default Idle-ish state showing the wrong
    // button and clock until the next real transition happens to fire.
    window.dtt?.timer?.getState?.().then((snap) => {
      if (snap) applyTimerSnapshot(snap)
    }).catch((err: unknown) => console.error("timer.getState failed:", err))
    const off = window.dtt?.timer?.onStateChanged?.((snap) => {
      refreshTodayStats()
      applyTimerSnapshot(snap)
    })
    return () => { off?.() }
  }, [refreshTodayStats, applyTimerSnapshot])

  // Idle popup — the backend FSM is correctly detecting idle and freezing
  // billable time/capture already; this is what actually shows the prompt
  // and lets the user resolve it, instead of nothing happening visibly.
  React.useEffect(() => {
    const off = window.dtt?.timer?.onIdleResolutionNeeded?.((payload) => setPendingIdle(payload))
    return () => { off?.() }
  }, [])

  React.useEffect(() => {
    if (!isRunning || isPaused) return
    const id = setInterval(refreshTodayStats, 30_000)
    return () => clearInterval(id)
  }, [isRunning, isPaused, refreshTodayStats])

  // ── Restore today's work into the task list ─────────────────────────────
  // Sessions live in local SQLite, so after a quit + relaunch each task shows
  // the time worked on it today and its first-start / last-end range, instead
  // of every task resetting to "Not started".
  // The Yesterday strip (DTT-AC-024.1) is rebuilt from yesterday's saved
  // sessions: only contracts/tasks with tracked time, each with its own time.
  React.useEffect(() => {
    if (!contractsLoaded || !todayStats) return
    const withStat = (t: TaskEntry, stat: TodayTaskStat): TaskEntry => ({
      ...t,
      duration: formatDuration(stat.trackedSeconds),
      timeRange: `${formatTimeOfDay(new Date(stat.firstStartedAt))} - ${
        stat.lastEndedAt ? formatTimeOfDay(new Date(stat.lastEndedAt)) : "now"
      }`,
      progress: Math.min(Math.round((stat.trackedSeconds / (8 * 3600)) * 100), 100),
    })
    const todayByTask = new Map((todayStats.tasks ?? []).map((t) => [t.taskId, t]))
    const yesterdayByTask = new Map((todayStats.yesterday?.tasks ?? []).map((t) => [t.taskId, t]))
    setDays((prev) => {
      if (!prev[0]) return prev
      const today = { ...prev[0] }
      today.contracts = today.contracts.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => {
          const stat = todayByTask.get(t.id)
          return stat ? withStat(t, stat) : t
        }),
      }))

      const yesterdayContracts: Contract[] = today.contracts
        .map((c) => ({
          ...c,
          tasks: c.tasks.flatMap((t) => {
            const stat = yesterdayByTask.get(t.id)
            return stat ? [withStat(t, stat)] : []
          }),
        }))
        .filter((c) => c.tasks.length > 0)

      const next: DayGroup[] = [today]
      if (yesterdayContracts.length > 0) {
        const y = new Date()
        y.setDate(y.getDate() - 1)
        next.push({
          label: "Yesterday",
          fullDate: y.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          totalHours: today.totalHours,
          hourlyRate: today.hourlyRate,
          contracts: yesterdayContracts,
        })
      }
      return next
    })
  }, [contractsLoaded, todayStats])

  // ── Live row for the task being tracked (US-043) ────────────────────────
  // Only the active task's row in Today changes each second: its saved time
  // (without the live session) plus the running clock. Other rows keep the
  // saved totals from todayStats.
  const displayDays = React.useMemo(() => {
    if (!isRunning || !activeTask?.taskId || !days[0]) return days
    const stat = todayStats?.tasks?.find((t) => t.taskId === activeTask.taskId)
    const savedSeconds = stat ? stat.trackedSeconds - (stat.liveSeconds ?? 0) : 0
    const started = stat?.firstStartedAt ?? trackingStartTime?.getTime() ?? Date.now()
    const today = {
      ...days[0],
      contracts: days[0].contracts.map((c) =>
        c.id !== activeTask.contractId
          ? c
          : {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id !== activeTask.taskId
                  ? t
                  : {
                      ...t,
                      duration: formatDuration(savedSeconds + elapsed),
                      timeRange: `${formatTimeOfDay(new Date(started))} - now`,
                    },
              ),
            },
      ),
    }
    return [today, ...days.slice(1)]
  }, [days, isRunning, activeTask, todayStats, elapsed, trackingStartTime])

  // ── Pre-select the previous task on relaunch ────────────────────────────
  // Once, after contracts load: select the task of the most recent session
  // so "Start" continues where the user left off. The timer is never
  // auto-started — an unclean exit must not silently resume billing.
  const restoredLastTaskRef = React.useRef(false)
  React.useEffect(() => {
    if (restoredLastTaskRef.current || !contractsLoaded || isRunning) return
    const last = todayStats?.lastTask
    if (!last) return
    restoredLastTaskRef.current = true
    for (const day of days) {
      const c = day.contracts.find((x) => x.id === last.contractId)
      const t = c?.tasks.find((x) => x.id === last.taskId)
      if (c && t) {
        setSelectedTask({ id: t.id, taskName: t.name, contractName: c.name, clientHandle: c.clientHandle })
        return
      }
    }
  }, [contractsLoaded, todayStats, days, isRunning])

  // ── Live clock ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const id = setInterval(() => setUtcTime(formatUtcTime()), 10000)
    return () => clearInterval(id)
  }, [])

  // ── Timer tick ──────────────────────────────────────────────────────────
  // Extrapolates from the last backend-confirmed baseline (reset on every
  // real state change above), not from an absolute start time — see
  // timer-ui-state.ts for why that distinction is what actually matters.
  React.useEffect(() => {
    if (isRunning && !isPaused) {
      const tick = () => {
        setElapsed(computeDisplayedElapsedSec(elapsedBaselineRef.current, Date.now()))
      }
      tick() // immediate update
      intervalRef.current = setInterval(tick, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused])

  // ── Scroll handler — show minimized bar once expanded header + controls scroll away ──
  const handleContentScroll = React.useCallback(() => {
    const el = scrollRef.current
    const header = expandedHeaderRef.current
    if (!el || !header) return
    // Measure the active controls section directly from DOM for accuracy
    const controlsEl = isRunning ? runningContentRef.current : idleContentRef.current
    const controlsHeight = controlsEl ? controlsEl.offsetHeight : 0
    setHeaderCollapsed(el.scrollTop >= header.offsetHeight + controlsHeight)
  }, [isRunning])

  // ── Derived ─────────────────────────────────────────────────────────────
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  // Live earnings use the rate of the contract actually being tracked. This
  // used to be the first contract's rate (or a hard-coded $75) no matter
  // which contract was running.
  const activeRate = React.useMemo(() => {
    if (!activeTask) return 0
    for (const day of days) {
      const c = day.contracts.find((x) => x.id === activeTask.contractId)
      if (c?.rate !== undefined) return c.rate
    }
    return 0
  }, [days, activeTask])
  const amountEarned = `$${((elapsed / 3600) * activeRate).toFixed(2)}`

  const searchResults: SearchResult[] = React.useMemo(() => {
    if (!searchValue.trim()) return []
    const q = searchValue.toLowerCase()
    const results: SearchResult[] = []
    for (const day of days) {
      for (const c of day.contracts) {
        if (c.name.toLowerCase().includes(q)) {
          for (const t of c.tasks) {
            results.push({ id: t.id, taskName: t.name, contractName: c.name, clientHandle: c.clientHandle })
          }
        } else {
          for (const t of c.tasks) {
            if (t.name.toLowerCase().includes(q)) {
              results.push({ id: t.id, taskName: t.name, contractName: c.name, clientHandle: c.clientHandle })
            }
          }
        }
      }
    }
    return results.slice(0, 8)
  }, [searchValue, days])

  const allContracts = React.useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string; clientHandle?: string; tasks: { id: string; name: string }[] }[] = []
    for (const day of days) {
      for (const c of day.contracts) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          list.push({
            id: c.id,
            name: c.name,
            clientHandle: c.clientHandle,
            tasks: c.tasks.map((t) => ({ id: t.id, name: t.name })),
          })
        }
      }
    }
    return list
  }, [days])

  // Default items shown when search input is focused but empty
  const defaultSearchResults: SearchResult[] = React.useMemo(() => {
    const results: SearchResult[] = []
    for (const day of days) {
      for (const c of day.contracts) {
        for (const t of c.tasks) {
          if (!results.find((r) => r.id === t.id)) {
            results.push({ id: t.id, taskName: t.name, contractName: c.name, clientHandle: c.clientHandle })
          }
        }
      }
    }
    return results.slice(0, 8)
  }, [days])

  // Base URL: production → projects.marketeqdigital.com, dev → localhost:3000
  const webBase = (import.meta as any).env?.VITE_WEB_BASE_URL ?? "http://localhost:3000"

  const openExternal = (path: string) => {
    const url = `${webBase}${path}`
    window.dtt?.shell?.openExternal?.(url)
  }

  // Build menu sections with wired-up handlers
  const menuSections: MenuSection[] = React.useMemo(() => [
    {
      items: [
        { label: "My Profile", shortcut: "\u2318P", onClick: () => openExternal("/complete-profile") },
        { label: "Preferences", shortcut: "\u2318P", onClick: () => openExternal("/settings") },
        { label: "Keyboard Shortcuts", shortcut: "\u2318 + /", onClick: () => openExternal("/settings") },
      ],
    },
    {
      items: [
        { label: "Add Manual Time", shortcut: "\u2318M", onClick: () => { setView("manual-time") } },
        { label: "Reports", shortcut: "\u2318R", onClick: () => openExternal("/time-tracking") },
      ],
    },
    {
      items: [
        { label: "Send Feedback", onClick: () => openExternal("/inbox") },
        { label: "About Time Tracker", onClick: () => { window.dtt?.getAppInfo?.().then((info) => { alert(`Marketeq Time Tracker v${info?.version ?? "1.0.0"}`) }) } },
        { label: "Check for Updates...", onClick: () => { /* TODO: trigger auto-updater check */ } },
      ],
    },
    {
      items: [
        { label: "Switch Account", shortcut: "\u2318C", onClick: () => { window.dtt?.auth?.logout?.(); setView("main") } },
        { label: "Sign Out", shortcut: "\u2318+ Shift + Q", onClick: () => { window.dtt?.auth?.logout?.(); setView("main") } },
      ],
    },
    {
      items: [{ label: "Quit Time Tracker", shortcut: "\u2318Q", variant: "danger" as const, onClick: () => { window.close() } }],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [webBase])

  // ── Actions ─────────────────────────────────────────────────────────────

  // Pin a card at the top of the scroll area. Shared by toggleContract and
  // openContract.
  const scrollContractIntoView = (id: string) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(`contract-${id}`)
        const container = scrollRef.current
        if (el && container) {
          const cardRect = el.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const scrollTarget = container.scrollTop + (cardRect.top - containerRect.top) - 52 // 48px sticky header + 4px breathing room
          container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" })
        }
      }, 250)
    })
  }

  // Force-open a contract card (never toggles it shut) and scroll it into view.
  // Used when the user clicks ▶ on a contract header — per spec that only
  // re-scopes to the contract's tasks, it must not start the timer.
  const openContract = (id: string) => {
    const key = cardKey("Today", id)
    const alreadyOpen = expandedContracts.has(key)
    setExpandedContracts((prev) => new Set(prev).add(key))
    if (!alreadyOpen) scrollContractIntoView(id)
  }

  // A real task from the backend must be selected before the timer can start.
  // Reject a missing id, the raw contract id, the synthetic "task-<contractId>"
  // mirror placeholder, or a locally-created "t-<timestamp>" row — each
  // produces a session the website cannot map back to a task. A bare
  // "task-" prefix is NOT a placeholder signal: real TTS task ids use it too
  // (e.g. the seeded "task-seed-a-1"), and rejecting the prefix silently
  // blocked the timer on every one of them.
  const isRealTaskId = (id: string | undefined, contractId: string): id is string =>
    !!id && id !== contractId && id !== `task-${contractId}` && !/^t-\d+$/.test(id)

  const toggleContract = (id: string, dayLabel = "Today") => {
    const key = cardKey(dayLabel, id)
    const isOpening = !expandedContracts.has(key)
    setExpandedContracts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    // Single scroll: pin the card at the top, ensuring header is at least collapsed.
    // Only Today's cards carry the scroll-target DOM id.
    if (isOpening && dayLabel === "Today") {
      scrollContractIntoView(id)
    }
  }

  const startTimerImmediate = (taskName: string, contractName: string, contractId: string, taskId?: string, clientHandle?: string) => {
    if (!isRealTaskId(taskId, contractId)) {
      console.error("startTimer blocked: no real task selected", { contractId, taskId })
      return
    }
    setActiveTask({ taskName, contractName, contractId, clientHandle: clientHandle || "", taskId })
    setTrackingStartTime(new Date())
    elapsedBaselineRef.current = { sec: 0, at: Date.now() }
    setElapsed(0)
    setIsRunning(true)
    setIsPaused(false)
    setSelectedTask(null)
    setSearchValue("")
    setActiveTaskCleared(false)
    setView("main")

    // Start the main process timer → creates a session → enables screenshots
    window.dtt?.timer?.start?.({
      contractId,
      taskId,
    }).catch((err: unknown) => console.error("timer.start failed:", err))
  }

  const startTimer = (taskName: string, contractName: string, contractId: string, taskId?: string, clientHandle?: string) => {
    if (!isRealTaskId(taskId, contractId)) {
      console.error("startTimer blocked: no real task selected", { contractId, taskId })
      return
    }
    // Begin 3-2-1 countdown
    setCountdown(3)
    pendingStartRef.current = () => startTimerImmediate(taskName, contractName, contractId, taskId, clientHandle)

    if (countdownRef.current) clearInterval(countdownRef.current)
    let count = 3
    countdownRef.current = setInterval(() => {
      count -= 1
      if (count > 0) {
        setCountdown(count)
      } else {
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = null
        setCountdown(null)
        pendingStartRef.current?.()
        pendingStartRef.current = null
      }
    }, 1000)
  }

  const handleStart = () => {
    if (!selectedTask) return // require a task to be selected
    for (const day of days) {
      for (const c of day.contracts) {
        const found = c.tasks.find((t) => t.id === selectedTask.id)
        if (found) {
          startTimer(found.name, c.name, c.id, found.id, c.clientHandle)
          return
        }
      }
    }
  }

  // Neither handler optimistically mutates local state anymore — the real
  // outcome (success or failure) comes back through the onStateChanged
  // subscription above, which is the only source of truth for isRunning/
  // isPaused/elapsed/activeTask now. Optimistically flipping the UI here
  // regardless of whether the backend call actually succeeded was the exact
  // bug: Stop/Pause looked like they'd worked even when the backend was
  // still stuck (confirmed live — clicking Stop while idle left the FSM in
  // IdleSoftPaused, but the UI showed "stopped" anyway).
  const handlePause = () => {
    // Resuming from a break is a different FSM transition (BREAK_END) than
    // resuming from a manual/idle pause (RESUME) — dispatching the wrong one
    // is a silent no-op, confirmed live: clicking "Resume Time" while on
    // break left the backend stuck in OnBreakUnpaid.
    const action = isPaused
      ? (isOnBreakRef.current ? window.dtt?.timer?.breakEnd : window.dtt?.timer?.resume)
      : window.dtt?.timer?.pause
    action?.().catch((err: unknown) => console.error("timer.pause/resume/breakEnd failed:", err))
  }

  const handleStop = () => {
    // Stop the main process timer → closes the session. The resulting
    // Idle/Counting state change (via onStateChanged) is what actually
    // clears isRunning/activeTask/trackingStartTime — see above. The
    // stopped session is saved in local SQLite; that same state change also
    // triggers refreshTodayStats(), which writes the real task row's time
    // and range from that saved data.
    window.dtt?.timer?.stop?.({ reason: 'user_stop' }).catch((err: unknown) => console.error("timer.stop failed:", err))
  }

  const handlePlayTask = (taskId: string, contractId?: string) => {
    // Ignore synthetic / local ids that don't exist on the backend.
    if (!isRealTaskId(taskId, contractId ?? "")) return
    // If already tracking, switch immediately (no countdown)
    const start = isRunning ? startTimerImmediate : startTimer
    for (const day of days) {
      for (const c of day.contracts) {
        if (contractId && c.id !== contractId) continue
        const task = c.tasks.find((t) => t.id === taskId)
        if (task) {
          start(task.name, c.name, c.id, task.id, c.clientHandle)
          return
        }
      }
    }
  }

  const handlePlayContract = (contractId: string) => {
    // The contract-header ▶ never starts the timer — selecting a contract only
    // re-scopes to its tasks (spec DTT-AC-026.2). Open the card so the user
    // can click ▶ on a specific task row.
    openContract(contractId)
  }

  const handleSwitchContract = (contractId: string) => {
    // Don't auto-pick tasks[0]. Surface the target contract's tasks and let the
    // user choose a row (which starts via handlePlayTask). Contract selection
    // alone never starts the timer.
    for (const day of days) {
      const c = day.contracts.find((co) => co.id === contractId)
      if (c) {
        setView("main") // no-op if already on main
        openContract(contractId)
        // Confirm the context switch to the user
        setSwitchAlert(c.name)
        if (switchAlertTimeout.current) clearTimeout(switchAlertTimeout.current)
        switchAlertTimeout.current = setTimeout(() => setSwitchAlert(null), 3000)
        return
      }
    }
  }

  const handleAddTask = (contractId: string) => {
    setNewTaskContractId(contractId)
    setView("new-task")
  }

  // Guards against a double-click firing two POSTs for one task.
  const creatingTaskRef = React.useRef(false)

  const handleCreateTask = async (data: { contractId: string; taskName: string; notes: string }) => {
    if (creatingTaskRef.current) return
    creatingTaskRef.current = true
    let created: { id: string; name: string } | undefined
    try {
      // Persist to the backend first — the timer can only start a session
      // against a task id that exists in TTS and in the local SQLite mirror.
      created = await window.dtt?.contracts?.createTask?.({
        contractId: data.contractId,
        name: data.taskName,
      })
    } catch (err) {
      console.error("Failed to create task:", err)
    } finally {
      creatingTaskRef.current = false
    }
    // On failure stay on the form so the user's entry isn't lost.
    if (!created) return

    const newTask: TaskEntry = {
      id: created.id,
      name: created.name,
      timeRange: "Not started",
      duration: "00:00:00",
    }

    setDays((prev) => {
      const next = [...prev]
      const today = { ...next[0] }
      today.contracts = today.contracts.map((c) => {
        if (c.id === data.contractId) {
          return { ...c, tasks: [...c.tasks, newTask] }
        }
        return c
      })
      next[0] = today
      return next
    })

    setExpandedContracts((prev) => new Set(prev).add(cardKey("Today", data.contractId)))
    setView("main")

    // Show task created alert
    setTaskCreatedAlert(data.taskName)
    if (taskCreatedTimeout.current) clearTimeout(taskCreatedTimeout.current)
    taskCreatedTimeout.current = setTimeout(() => setTaskCreatedAlert(null), 3000)
  }

  const handleSearchSelect = (result: SearchResult) => {
    setSelectedTask(result)
    setSearchValue("")
  }

  const handleSearchClear = () => {
    setSelectedTask(null)
    setSearchValue("")
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "w-full h-screen bg-white overflow-hidden flex flex-col relative",
        className
      )}
    >
      {/* Top nav — always visible, white bg, no corner radius */}
      <TrackerHeader isMenuOpen={view === "menu"} onMenuClick={() => setView(view === "menu" ? "main" : "menu")} className="bg-white" />

      {/* ── Account Menu View ────────────────────────────────────────── */}
      {view === "menu" && (
        <div
          key={viewKey}
          className="flex-1 overflow-y-auto transition-[transform,opacity] duration-200 ease-out"
          style={{
            transform: viewTransition === "enter"
              ? (slideDirection === "right" ? "translateX(-20px)" : "translateX(20px)")
              : "translateX(0)",
            opacity: viewTransition === "enter" ? 0 : 1,
          }}
        >
          <AccountMenu
            name={userName}
            email={userEmail}
            avatarSrc={userAvatar}
            sections={menuSections}
            onClose={() => setView("main")}
          />
        </div>
      )}

      {/* ── New Task View ────────────────────────────────────────────── */}
      {view === "new-task" && (
        <div
          key={viewKey}
          className="flex-1 overflow-hidden transition-[transform,opacity] duration-200 ease-out"
          style={{
            transform: viewTransition === "enter"
              ? (slideDirection === "right" ? "translateX(-20px)" : "translateX(20px)")
              : "translateX(0)",
            opacity: viewTransition === "enter" ? 0 : 1,
          }}
        >
          <NewTaskForm
            contracts={allContracts}
            defaultContractId={newTaskContractId}
            lockContract={!!newTaskContractId}
            onCancel={() => setView("main")}
            onCreate={handleCreateTask}
          />
        </div>
      )}

      {/* ── Manual Time View ──────────────────────────────────────────── */}
      {view === "manual-time" && (
        <div
          key={viewKey}
          className="flex-1 overflow-hidden transition-[transform,opacity] duration-200 ease-out"
          style={{
            transform: viewTransition === "enter"
              ? (slideDirection === "right" ? "translateX(-20px)" : "translateX(20px)")
              : "translateX(0)",
            opacity: viewTransition === "enter" ? 0 : 1,
          }}
        >
          <ManualTimeForm
            contracts={allContracts}
            onCancel={() => setView("main")}
            onSubmit={async (data) => {
              const result = await window.dtt?.manualTime?.create?.(data)
              if (!result) return { ok: false, message: "Manual time isn't available right now. Please try again." }
              if (result.ok) {
                setView("main")
                setManualTimeAlert(true)
                if (manualTimeTimeout.current) clearTimeout(manualTimeTimeout.current)
                manualTimeTimeout.current = setTimeout(() => setManualTimeAlert(false), 3000)
              }
              return result
            }}
          />
        </div>
      )}

      {/* ── All Tasks View ───────────────────────────────────────────── */}
      {view === "all-tasks" && (
        <div
          key={viewKey}
          className="flex-1 overflow-hidden transition-[transform,opacity] duration-200 ease-out"
          style={{
            transform: viewTransition === "enter"
              ? (slideDirection === "right" ? "translateX(-20px)" : "translateX(20px)")
              : "translateX(0)",
            opacity: viewTransition === "enter" ? 0 : 1,
          }}
        >
          <AllTasksView
            days={days}
            onBack={() => setView("main")}
            onPlayTask={(taskId, contractId) => handlePlayTask(taskId, contractId)}
            activeContractId={activeTask?.contractId || null}
            onSwitchContract={handleSwitchContract}
          />
        </div>
      )}

      {/* ── Main View ────────────────────────────────────────────────── */}
      {view === "main" && (
        <div
          key={viewKey}
          className="flex-1 flex flex-col overflow-hidden transition-[transform,opacity] duration-200 ease-out"
          style={{
            transform: viewTransition === "enter"
              ? (slideDirection === "right" ? "translateX(-20px)" : "translateX(20px)")
              : "translateX(0)",
            opacity: viewTransition === "enter" ? 0 : 1,
          }}
        >
          {/* Single scroll container — everything scrolls together */}
          <div ref={scrollRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto">
            {/* Header card — gray-100 bg, 8px radius: date bar + search + controls */}
            <div ref={expandedHeaderRef} className="mx-2 bg-gray-100 rounded-lg overflow-hidden">
              {/* Combined date/tracking row — single row that changes content based on state */}
              <button
                onClick={() => setHeaderManualCollapsed((v) => !v)}
                className="flex items-center justify-between px-4 py-2.5 w-full bg-transparent hover:bg-gray-200/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isRunning && activeTask && !isPaused && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500" />
                    </span>
                  )}
                  <span className="text-xs font-medium text-dark-blue-400">
                    {isRunning && activeTask ? "Tracking time..." : dateStr}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{utcTime}</span>
                  <svg
                    className={cn(
                      "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                      headerManualCollapsed && "rotate-180"
                    )}
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
              {/* Collapsible section: search + controls — toggled by date row chevron */}
              <Collapsible open={!headerManualCollapsed}>
                {/* Search bar */}
                <div className="px-3 pt-2 pb-1 relative z-[100]">
                  <TaskSearch
                    value={searchValue}
                    onChange={setSearchValue}
                    results={searchResults}
                    defaultResults={defaultSearchResults}
                    selectedResult={isRunning && activeTask
                      ? (!activeTask || activeTaskCleared ? null : {
                          id: activeTask.taskId || "active",
                          taskName: activeTask.taskName,
                          contractName: activeTask.contractName,
                          clientHandle: activeTask.clientHandle,
                        })
                      : selectedTask
                    }
                    onSelect={isRunning && activeTask
                      ? (result) => {
                          for (const day of days) {
                            for (const c of day.contracts) {
                              const task = c.tasks.find((t) => t.id === result.id)
                              if (task) {
                                setActiveTask({ taskName: task.name, contractName: c.name, contractId: c.id, clientHandle: c.clientHandle, taskId: task.id })
                                setActiveTaskCleared(false)
                                break
                              }
                            }
                          }
                          setSearchValue("")
                        }
                      : handleSearchSelect
                    }
                    onClear={isRunning && activeTask
                      ? () => { setActiveTaskCleared(true); setSearchValue("") }
                      : handleSearchClear
                    }
                    activeContractName={isRunning && activeTask ? activeTask.contractName : undefined}
                  />
                </div>

                {/* Running-state controls + timer — height-animated */}
                <div
                  className="overflow-hidden transition-[height,opacity] duration-300 ease-in-out"
                  style={{
                    height: isRunning && activeTask ? (runningHeight || "auto") : 0,
                    opacity: isRunning && activeTask ? 1 : 0,
                  }}
                >
                  <div ref={runningContentRef}>
                    <div className="flex flex-col items-center py-3 gap-1 relative z-30">
                      <TimerControls
                        isRunning
                        isPaused={isPaused}
                        onPause={handlePause}
                        onStop={handleStop}
                        onManualTime={() => setView("manual-time")}
                      />
                      <div key={activeTask?.taskId || "timer"} className="mt-2 animate-fade-in">
                        <TimerDisplay hours={hours} minutes={minutes} seconds={seconds} size="lg" />
                      </div>
                      <span className="text-xs text-gray-500 mt-1 animate-fade-in">Amount Earned {amountEarned}</span>
                    </div>
                  </div>
                </div>

                {/* Idle-state controls — height-animated */}
                <div
                  className="overflow-hidden transition-[height,opacity] duration-300 ease-in-out"
                  style={{
                    height: !isRunning ? (idleHeight || "auto") : 0,
                    opacity: !isRunning ? 1 : 0,
                  }}
                >
                  <div ref={idleContentRef}>
                    <div className="py-2 relative z-50">
                      <TimerControls countdown={countdown} noTaskSelected={!selectedTask} onStart={handleStart} onPause={handlePause} onStop={handleStop} onManualTime={() => setView("manual-time")} />
                    </div>
                  </div>
                </div>
              </Collapsible>
            </div>

            {/* Running-state sticky collapsed bar — Figma Variant7 layout */}
            {isRunning && activeTask && (
              <div
                className="sticky top-0 z-50 bg-white overflow-hidden transition-[height] duration-200 ease-out border-b border-gray-100"
                style={{ height: (headerCollapsed || headerManualCollapsed) ? "auto" : 0 }}
              >
                <div
                  className="transition-[transform,opacity] duration-200 ease-out"
                  style={{
                    transform: (headerCollapsed || headerManualCollapsed) ? "translateY(0)" : "translateY(20px)",
                    opacity: (headerCollapsed || headerManualCollapsed) ? 1 : 0,
                  }}
                >
                  {/* Controls left, Timer + Earnings right */}
                  <div className="flex items-center justify-between px-4 py-2">
                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <MiniHeaderBtn onClick={handlePause} tooltip={isPaused ? "Resume Time" : "Pause Time"}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm hover:bg-primary-600 transition">
                          {isPaused ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill="currentColor"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
                          )}
                        </div>
                      </MiniHeaderBtn>
                      <MiniHeaderBtn onClick={() => setView("manual-time")} tooltip="Manual Time">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition">
                          <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </MiniHeaderBtn>
                      <MiniHeaderBtn onClick={handleStop} tooltip="Stop Time">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition">
                          <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                        </div>
                      </MiniHeaderBtn>
                    </div>

                    {/* Timer + Earnings */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-dark-blue-400 tabular-nums leading-tight">
                        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-dark-blue-400 leading-tight">Amount Earned {amountEarned}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Idle-state sticky collapsed bar — appears once scrolled past expanded header */}
            {!isRunning && (
              <div
                className="sticky top-0 z-50 bg-white overflow-hidden transition-[height] duration-150 ease-out"
                style={{ height: (headerCollapsed || headerManualCollapsed) ? 48 : 0 }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 transition-[transform,opacity] duration-150 ease-out"
                  style={{
                    transform: (headerCollapsed || headerManualCollapsed) ? "translateY(0)" : "translateY(100%)",
                    opacity: (headerCollapsed || headerManualCollapsed) ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <MiniHeaderBtn onClick={handleStart} tooltip="Start Time">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm hover:bg-primary-600 transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill="currentColor"/></svg>
                      </div>
                    </MiniHeaderBtn>
                    <MiniHeaderBtn onClick={() => setView("manual-time")} tooltip="Manual Time">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </MiniHeaderBtn>
                    <MiniHeaderBtn onClick={handleStop} tooltip="Stop Time">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                      </div>
                    </MiniHeaderBtn>
                  </div>
                  <TimerDisplay hours={0} minutes={0} seconds={0} size="sm" />
                </div>
              </div>
            )}
            {displayDays.map((day, dayIdx) => {
              const dayCollapsed = collapsedDays.has(day.label)
              const isToday = day.label === "Today"
              // Today and Yesterday come from saved sessions (per-contract
              // rates); other strips fall back to their task durations.
              const dayStats = isToday
                ? todayStats
                : day.label === "Yesterday" && todayStats?.yesterday
                  ? { ...todayStats.yesterday, goalSeconds: todayStats.goalSeconds }
                  : null
              const hoursTracked = dayStats
                ? (dayStats.trackedSeconds / 3600).toFixed(1)
                : calcDayTrackedHours(day.contracts)
              const totalHoursDisplay = dayStats
                ? (dayStats.goalSeconds / 3600).toFixed(1)
                : day.totalHours
              const earned = dayStats
                ? `$${(dayStats.earnedCents / 100).toFixed(2)}`
                : calcDayEarnings(day.contracts, day.hourlyRate)
              return (
                <div key={dayIdx} className="animate-stagger-in" style={{ animationDelay: `${dayIdx * 100}ms`, animationFillMode: "both" }}>
                  <DaySummary
                    label={day.label}
                    fullDate={day.fullDate}
                    hoursTracked={hoursTracked}
                    totalHours={totalHoursDisplay}
                    earned={earned}
                    collapsed={dayCollapsed}
                    onToggle={() => {
                      setCollapsedDays((prev) => {
                        const next = new Set(prev)
                        if (next.has(day.label)) next.delete(day.label)
                        else next.add(day.label)
                        return next
                      })
                    }}
                  />

                  <Collapsible open={!dayCollapsed}>
                    <div className="px-2 pb-2 space-y-2">
                      {day.contracts.map((contract, cIdx) => (
                        <div key={contract.id} id={isToday ? `contract-${contract.id}` : undefined} className="animate-stagger-in" style={{ animationDelay: `${(dayIdx * 100) + (cIdx * 80)}ms`, animationFillMode: "both" }}>
                        <ContractEntry
                          contractId={contract.id}
                          contractName={contract.name}
                          clientHandle={contract.clientHandle}
                          avatarSrc={contract.avatarSrc}
                          totalHours={calcTotalHours(contract.tasks)}
                          tasks={contract.tasks}
                          isExpanded={expandedContracts.has(cardKey(day.label, contract.id))}
                          activeContractId={activeTask?.contractId || null}
                          onToggle={() => toggleContract(contract.id, day.label)}
                          onAddTask={() => handleAddTask(contract.id)}
                          onPlay={() => handlePlayContract(contract.id)}
                          onPlayTask={(taskId) => handlePlayTask(taskId)}
                          onSwitchContract={() => handleSwitchContract(contract.id)}
                        />
                        </div>
                      ))}
                    </div>
                  </Collapsible>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 shrink-0">
            <button
              onClick={() => setView("all-tasks")}
              className="w-full text-center text-sm font-semibold text-dark-blue-400 hover:text-primary-500 transition"
            >
              View All Tasks
            </button>
          </div>
        </div>
      )}

      {/* Floating contract-switch alert — bottom-left */}
      {switchAlert && ReactDOM.createPortal(
        <div className="fixed bottom-4 left-4 z-[300] animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
            <svg className="h-4 w-4 text-success-500 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-dark-blue-400">
              Contract switched to <span className="font-semibold">&ldquo;{switchAlert}&rdquo;</span>
            </span>
          </div>
        </div>,
        document.body
      )}

      {/* Floating task-created alert — bottom-left */}
      {taskCreatedAlert && ReactDOM.createPortal(
        <div className="fixed bottom-4 left-4 z-[300] animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
            <svg className="h-4 w-4 text-success-500 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-dark-blue-400">
              Task created <span className="font-semibold">&ldquo;{taskCreatedAlert}&rdquo;</span>
            </span>
          </div>
        </div>,
        document.body
      )}

      {manualTimeAlert && ReactDOM.createPortal(
        <div className="fixed bottom-4 left-4 z-[300] animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
            <svg className="h-4 w-4 text-success-500 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-dark-blue-400">
              Manual time submitted for review
            </span>
          </div>
        </div>,
        document.body
      )}

      {pendingIdle && ReactDOM.createPortal(
        <IdleResolutionModal
          payload={pendingIdle}
          onResolve={async (resolution) => {
            try {
              await window.dtt?.timer?.resolveIdle?.({ resolution })
            } catch (err) {
              console.error("resolveIdle failed:", err)
            } finally {
              setPendingIdle(null)
            }
          }}
        />,
        document.body
      )}
    </div>
  )
}
