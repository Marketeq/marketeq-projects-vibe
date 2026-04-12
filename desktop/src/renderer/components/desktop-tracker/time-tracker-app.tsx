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

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contract {
  id: string
  name: string
  clientHandle: string
  avatarSrc?: string
  tasks: TaskEntry[]
}

interface DayGroup {
  label: string
  fullDate: string
  totalHours: string
  hourlyRate: number
  contracts: Contract[]
}

interface TimeTrackerAppProps {
  userName?: string
  userEmail?: string
  userId?: string
  userAvatar?: string
  initialDays?: DayGroup[]
  className?: string
}

type View = "main" | "menu" | "new-task" | "all-tasks"

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
        "fixed px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 pointer-events-none z-[200]",
        wide ? "w-52 whitespace-normal text-center leading-relaxed" : "whitespace-nowrap"
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
      className="fixed w-[210px] px-3 py-2.5 rounded-lg bg-white text-left text-xs shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-gray-100 z-[200]"
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
  const [view, setView] = React.useState<View>("main")
  const [days, setDays] = React.useState<DayGroup[]>(initialDays || SEED_DAYS)
  const [expandedContracts, setExpandedContracts] = React.useState<Set<string>>(new Set())
  const [collapsedDays, setCollapsedDays] = React.useState<Set<number>>(new Set())

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

  // Clock
  const [utcTime, setUtcTime] = React.useState(formatUtcTime())
  const [dateStr] = React.useState(formatDate())

  // Header collapse — show minimized bar once expanded header scrolls out of view
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const expandedHeaderRef = React.useRef<HTMLDivElement>(null)

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

  // Manual time entry
  const [showManualTime, setShowManualTime] = React.useState(false)

  const hourlyRate = days[0]?.hourlyRate || 75

  // ── Live clock ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const id = setInterval(() => setUtcTime(formatUtcTime()), 10000)
    return () => clearInterval(id)
  }, [])

  // ── Timer tick ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused])

  // ── Scroll handler — show minimized bar once expanded header scrolls away ──
  const handleContentScroll = React.useCallback(() => {
    const el = scrollRef.current
    const header = expandedHeaderRef.current
    if (!el || !header) return
    // Collapsed once the expanded header has scrolled out of view
    setHeaderCollapsed(el.scrollTop >= header.offsetHeight)
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const amountEarned = `$${((elapsed / 3600) * hourlyRate).toFixed(2)}`

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
    const list: { id: string; name: string; clientHandle?: string }[] = []
    for (const day of days) {
      for (const c of day.contracts) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          list.push({ id: c.id, name: c.name, clientHandle: c.clientHandle })
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
        { label: "Add Manual Time", shortcut: "\u2318M", onClick: () => { setView("main") } },
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

  const toggleContract = (id: string) => {
    const isOpening = !expandedContracts.has(id)
    setExpandedContracts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Single scroll: pin the card at the top, ensuring header is at least collapsed
    if (isOpening) {
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
  }

  const startTimerImmediate = (taskName: string, contractName: string, contractId: string, taskId?: string, clientHandle?: string) => {
    setActiveTask({ taskName, contractName, contractId, clientHandle: clientHandle || "", taskId })
    setTrackingStartTime(new Date())
    setElapsed(0)
    setIsRunning(true)
    setIsPaused(false)
    setSelectedTask(null)
    setSearchValue("")
    setActiveTaskCleared(false)
    setView("main")
  }

  const startTimer = (taskName: string, contractName: string, contractId: string, taskId?: string, clientHandle?: string) => {
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

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleStop = () => {
    if (!isRunning || !activeTask || !trackingStartTime) {
      setIsRunning(false)
      setIsPaused(false)
      setElapsed(0)
      setActiveTask(null)
      return
    }

    const endTime = new Date()
    const newTask: TaskEntry = {
      id: `t-${Date.now()}`,
      name: activeTask.taskName,
      timeRange: `${formatTimeOfDay(trackingStartTime)} - ${formatTimeOfDay(endTime)}`,
      duration: formatDuration(elapsed),
      progress: Math.min(Math.round((elapsed / (8 * 3600)) * 100), 100),
    }

    setDays((prev) => {
      const next = [...prev]
      const today = { ...next[0] }
      today.contracts = today.contracts.map((c) => {
        if (c.id === activeTask.contractId) {
          return { ...c, tasks: [...c.tasks, newTask] }
        }
        return c
      })
      if (!today.contracts.find((c) => c.id === activeTask.contractId)) {
        today.contracts = [
          ...today.contracts,
          { id: activeTask.contractId, name: activeTask.contractName, clientHandle: "user", tasks: [newTask] },
        ]
      }
      next[0] = today
      return next
    })

    setIsRunning(false)
    setIsPaused(false)
    setElapsed(0)
    setActiveTask(null)
    setTrackingStartTime(null)
  }

  const handlePlayTask = (taskId: string, contractId?: string) => {
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
    const start = isRunning ? startTimerImmediate : startTimer
    for (const day of days) {
      const c = day.contracts.find((co) => co.id === contractId)
      if (c) {
        if (c.tasks.length > 0) {
          start(c.tasks[0].name, c.name, c.id, c.tasks[0].id, c.clientHandle)
        } else {
          start("General work", c.name, c.id, undefined, c.clientHandle)
        }
        return
      }
    }
  }

  const handleSwitchContract = (contractId: string) => {
    // Stop current tracking, switch to new contract, start immediately
    for (const day of days) {
      const c = day.contracts.find((co) => co.id === contractId)
      if (c) {
        const taskName = c.tasks.length > 0 ? c.tasks[0].name : "General work"
        const taskId = c.tasks.length > 0 ? c.tasks[0].id : undefined
        startTimerImmediate(taskName, c.name, c.id, taskId, c.clientHandle)
        // Show floating alert
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

  const handleCreateTask = (data: { contractId: string; taskName: string; notes: string }) => {
    const newTask: TaskEntry = {
      id: `t-${Date.now()}`,
      name: data.taskName,
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

    setExpandedContracts((prev) => new Set(prev).add(data.contractId))
    setView("main")
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
      {/* Header — always visible */}
      <TrackerHeader onMenuClick={() => setView(view === "menu" ? "main" : "menu")} />

      {/* ── Account Menu View ────────────────────────────────────────── */}
      {view === "menu" && (
        <div className="flex-1 overflow-y-auto">
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
        <NewTaskForm
          contracts={allContracts}
          defaultContractId={newTaskContractId}
          onCancel={() => setView("main")}
          onCreate={handleCreateTask}
        />
      )}

      {/* ── All Tasks View ───────────────────────────────────────────── */}
      {view === "all-tasks" && (
        <AllTasksView
          days={days}
          onBack={() => setView("main")}
          onPlayTask={(taskId, contractId) => handlePlayTask(taskId, contractId)}
          activeContractId={activeTask?.contractId || null}
          onSwitchContract={handleSwitchContract}
        />
      )}

      {/* ── Main View ────────────────────────────────────────────────── */}
      {view === "main" && (
        <>
          {isRunning && activeTask ? (
            <>
              <ActiveTrackingBar
                utcTime={utcTime}
                isRecording={!isPaused}
                label={isPaused ? "Paused" : "Tracking time..."}
                collapsed={headerCollapsed}
                onToggleCollapse={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: headerCollapsed ? 0 : 300, behavior: "smooth" })
                  }
                }}
              />

            </>
          ) : (
            <>
              <DateTimeBar
                date={dateStr}
                utcTime={utcTime}
                collapsed={headerCollapsed}
                onToggleCollapse={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: headerCollapsed ? 0 : 300, behavior: "smooth" })
                  }
                }}
              />

            </>
          )}

          {/* Single scroll container — everything scrolls together */}
          <div ref={scrollRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto">
            {/* Running-state expanded header — scrolls away naturally */}
            {isRunning && activeTask && (
              <div ref={expandedHeaderRef}>
                <div className="px-4 pt-3 pb-2 relative z-40">
                  <TaskSearch
                    value={searchValue}
                    onChange={setSearchValue}
                    results={searchResults}
                    defaultResults={defaultSearchResults}
                    selectedResult={activeTaskCleared ? null : {
                      id: activeTask.taskId || "active",
                      taskName: activeTask.taskName,
                      contractName: activeTask.contractName,
                      clientHandle: activeTask.clientHandle,
                    }}
                    onSelect={(result) => {
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
                    }}
                    onClear={() => {
                      setActiveTaskCleared(true)
                      setSearchValue("")
                    }}
                    activeContractName={activeTask.contractName}
                  />
                </div>
                <div className="flex flex-col items-center py-3 gap-1 relative z-30">
                  <TimerControls
                    isRunning
                    isPaused={isPaused}
                    onPause={handlePause}
                    onStop={handleStop}
                    onManualTime={() => setView("new-task")}
                  />
                  <div key={activeTask?.taskId || "timer"} className="mt-2 animate-fade-in">
                    <TimerDisplay hours={hours} minutes={minutes} seconds={seconds} size="lg" />
                  </div>
                  <span className="text-sm text-gray-500 mt-1 animate-fade-in">Amount Earned {amountEarned}</span>
                </div>
              </div>
            )}

            {/* Running-state sticky collapsed bar — appears once scrolled past expanded header */}
            {isRunning && activeTask && (
              <div
                className="sticky top-0 z-50 bg-white overflow-hidden transition-[height] duration-150 ease-out"
                style={{ height: headerCollapsed ? 48 : 0 }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 bg-gray-25 border-b border-gray-100 transition-[transform,opacity] duration-150 ease-out"
                  style={{
                    transform: headerCollapsed ? "translateY(0)" : "translateY(100%)",
                    opacity: headerCollapsed ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <button onClick={handlePause} className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm">
                        {isPaused ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill="currentColor"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
                        )}
                      </div>
                    </button>
                    <button onClick={() => {}} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={handleStop} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                    </button>
                  </div>
                  <TimerDisplay hours={hours} minutes={minutes} seconds={seconds} size="sm" />
                </div>
              </div>
            )}

            {/* Idle-state expanded header (search + controls) — scrolls away naturally */}
            {!isRunning && (
              <div ref={!isRunning ? expandedHeaderRef : undefined}>
                <div className="px-4 pt-3 pb-2 relative z-40">
                  <TaskSearch
                    value={searchValue}
                    onChange={setSearchValue}
                    results={searchResults}
                    defaultResults={defaultSearchResults}
                    onSelect={handleSearchSelect}
                    selectedResult={selectedTask}
                    onClear={handleSearchClear}
                  />
                </div>
                <div className="py-2 relative z-30">
                  <TimerControls countdown={countdown} noTaskSelected={!selectedTask} onStart={handleStart} onPause={handlePause} onStop={handleStop} onManualTime={() => setView("new-task")} />
                </div>
              </div>
            )}

            {/* Idle-state sticky collapsed bar — appears once scrolled past expanded header */}
            {!isRunning && (
              <div
                className="sticky top-0 z-50 bg-white overflow-hidden transition-[height] duration-150 ease-out"
                style={{ height: headerCollapsed ? 48 : 0 }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 transition-[transform,opacity] duration-150 ease-out"
                  style={{
                    transform: headerCollapsed ? "translateY(0)" : "translateY(100%)",
                    opacity: headerCollapsed ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <button onClick={handleStart} className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill="currentColor"/></svg>
                      </div>
                    </button>
                    <button onClick={() => {}} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={handleStop} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                    </button>
                  </div>
                  <TimerDisplay hours={0} minutes={0} seconds={0} size="sm" />
                </div>
              </div>
            )}
            {days.map((day, dayIdx) => {
              const dayCollapsed = collapsedDays.has(dayIdx)
              return (
                <div key={dayIdx}>
                  <DaySummary
                    label={day.label}
                    fullDate={day.fullDate}
                    hoursTracked={calcDayTrackedHours(day.contracts)}
                    totalHours={day.totalHours}
                    earned={calcDayEarnings(day.contracts, day.hourlyRate)}
                    collapsed={dayCollapsed}
                    onToggle={() => {
                      setCollapsedDays((prev) => {
                        const next = new Set(prev)
                        if (next.has(dayIdx)) next.delete(dayIdx)
                        else next.add(dayIdx)
                        return next
                      })
                    }}
                  />

                  <Collapsible open={!dayCollapsed}>
                    <div className="px-2 pb-2 space-y-2">
                      {day.contracts.map((contract) => (
                        <div key={contract.id} id={`contract-${contract.id}`}>
                        <ContractEntry
                          contractId={contract.id}
                          contractName={contract.name}
                          clientHandle={contract.clientHandle}
                          avatarSrc={contract.avatarSrc}
                          totalHours={calcTotalHours(contract.tasks)}
                          tasks={contract.tasks}
                          isExpanded={expandedContracts.has(contract.id)}
                          activeContractId={activeTask?.contractId || null}
                          onToggle={() => toggleContract(contract.id)}
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
        </>
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
    </div>
  )
}
