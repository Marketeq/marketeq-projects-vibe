"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { TrackerHeader } from "./tracker-header"
import { DateTimeBar } from "./date-time-bar"
import { TaskSearch, SearchResult } from "./task-search"
import { TimerControls } from "./timer-controls"
import { TimerDisplay } from "./timer-display"
import { ActiveTrackingBar } from "./active-tracking-bar"
import { DaySummary } from "./day-summary"
import { ContractEntry, TaskEntry } from "./contract-entry"
import { AccountMenu } from "./account-menu"
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
  totalHours: string
  hourlyRate: number
  contracts: Contract[]
}

interface TimeTrackerAppProps {
  userName?: string
  userEmail?: string
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

const SEED_DAYS: DayGroup[] = [
  { label: "Today", totalHours: "8", hourlyRate: 30, contracts: SEED_CONTRACTS },
  {
    label: "Yesterday",
    totalHours: "8",
    hourlyRate: 30,
    contracts: [
      {
        id: "c3",
        name: "Crypto App Mobile",
        clientHandle: "bitcoinmasters321",
        tasks: [
          { id: "t4", name: "Competitive analysis", timeRange: "9:00 am - 12:00 pm", duration: "03:00:00", progress: 80 },
          { id: "t5", name: "Auditing screenshots", timeRange: "1:00 pm - 3:00 pm", duration: "02:00:00", progress: 40 },
        ],
      },
    ],
  },
]

// ─── All Tasks View ─────────────────────────────────────────────────────────

function AllTasksView({
  days,
  onBack,
  onPlayTask,
}: {
  days: DayGroup[]
  onBack: () => void
  onPlayTask: (taskId: string, contractId: string) => void
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
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 transition shrink-0">
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
                <p className="text-sm font-medium text-dark-blue-500 leading-5">{task.name}</p>
                <p className="text-xs text-gray-400 leading-4">{task.timeRange}</p>
              </div>
              {task.progress !== undefined && (
                <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${task.progress}%` }} />
                </div>
              )}
              <span className="text-sm font-medium text-dark-blue-500 tabular-nums shrink-0">{task.duration}</span>
              <button
                onClick={() => onPlayTask(task.id, task.contractId)}
                className="text-gray-400 hover:text-primary-500 transition shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 5l4 3-4 3V5z" fill="currentColor" />
                </svg>
              </button>
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
  userAvatar,
  initialDays,
  className,
}: TimeTrackerAppProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [view, setView] = React.useState<View>("main")
  const [days, setDays] = React.useState<DayGroup[]>(initialDays || SEED_DAYS)
  const [expandedContracts, setExpandedContracts] = React.useState<Set<string>>(new Set())

  // Search
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedTask, setSelectedTask] = React.useState<SearchResult | null>(null)

  // Timer
  const [isRunning, setIsRunning] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [activeTask, setActiveTask] = React.useState<{ taskName: string; contractName: string; contractId: string; taskId?: string } | null>(null)
  const [trackingStartTime, setTrackingStartTime] = React.useState<Date | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Clock
  const [utcTime, setUtcTime] = React.useState(formatUtcTime())
  const [dateStr] = React.useState(formatDate())

  // New task form context
  const [newTaskContractId, setNewTaskContractId] = React.useState<string | undefined>()

  const hourlyRate = days[0]?.hourlyRate || 30

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

  // ── Actions ─────────────────────────────────────────────────────────────

  const toggleContract = (id: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startTimer = (taskName: string, contractName: string, contractId: string, taskId?: string) => {
    setActiveTask({ taskName, contractName, contractId, taskId })
    setTrackingStartTime(new Date())
    setElapsed(0)
    setIsRunning(true)
    setIsPaused(false)
    setSelectedTask(null)
    setSearchValue("")
    setView("main")
  }

  const handleStart = () => {
    if (selectedTask) {
      for (const day of days) {
        for (const c of day.contracts) {
          const found = c.tasks.find((t) => t.id === selectedTask.id)
          if (found) {
            startTimer(found.name, c.name, c.id, found.id)
            return
          }
        }
      }
    }
    startTimer("Unassigned work", allContracts[0]?.name || "General", allContracts[0]?.id || "general")
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
    for (const day of days) {
      for (const c of day.contracts) {
        if (contractId && c.id !== contractId) continue
        const task = c.tasks.find((t) => t.id === taskId)
        if (task) {
          startTimer(task.name, c.name, c.id, task.id)
          return
        }
      }
    }
  }

  const handlePlayContract = (contractId: string) => {
    for (const day of days) {
      const c = day.contracts.find((co) => co.id === contractId)
      if (c) {
        if (c.tasks.length > 0) {
          startTimer(c.tasks[0].name, c.name, c.id, c.tasks[0].id)
        } else {
          startTimer("General work", c.name, c.id)
        }
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
        "w-[323px] h-[528px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col relative",
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
        />
      )}

      {/* ── Main View ────────────────────────────────────────────────── */}
      {view === "main" && (
        <>
          {isRunning && activeTask ? (
            <>
              <ActiveTrackingBar
                taskName={activeTask.taskName}
                contractName={activeTask.contractName}
                utcTime={utcTime}
                isRecording={!isPaused}
                label={isPaused ? "Paused" : "Tracking time..."}
              />

              <div className="flex flex-col items-center py-3 gap-1">
                <TimerControls
                  isRunning
                  isPaused={isPaused}
                  onPause={handlePause}
                  onStop={handleStop}
                  onManualTime={() => {}}
                />
                <div className="mt-2">
                  <TimerDisplay hours={hours} minutes={minutes} seconds={seconds} size="lg" />
                </div>
                <span className="text-sm text-gray-500 mt-1">Amount Earned {amountEarned}</span>
              </div>
            </>
          ) : (
            <>
              <DateTimeBar date={dateStr} utcTime={utcTime} />

              <div className="px-4 pt-3 pb-2">
                <TaskSearch
                  value={searchValue}
                  onChange={setSearchValue}
                  results={searchResults}
                  onSelect={handleSearchSelect}
                  selectedResult={selectedTask}
                  onClear={handleSearchClear}
                />
              </div>

              <div className="py-2">
                <TimerControls onStart={handleStart} onPause={handlePause} onStop={handleStop} onManualTime={() => {}} />
              </div>
            </>
          )}

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {days.map((day, dayIdx) => (
              <div key={dayIdx}>
                <DaySummary
                  label={day.label}
                  hoursTracked={calcDayTrackedHours(day.contracts)}
                  totalHours={day.totalHours}
                  earned={calcDayEarnings(day.contracts, day.hourlyRate)}
                />

                <div className="px-2 pb-2 space-y-2">
                  {day.contracts.map((contract) => (
                    <ContractEntry
                      key={contract.id}
                      contractName={contract.name}
                      clientHandle={contract.clientHandle}
                      avatarSrc={contract.avatarSrc}
                      totalHours={calcTotalHours(contract.tasks)}
                      tasks={contract.tasks}
                      isExpanded={expandedContracts.has(contract.id)}
                      onToggle={() => toggleContract(contract.id)}
                      onAddTask={() => handleAddTask(contract.id)}
                      onPlay={() => handlePlayContract(contract.id)}
                      onPlayTask={(taskId) => handlePlayTask(taskId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 shrink-0">
            <button
              onClick={() => setView("all-tasks")}
              className="w-full text-center text-sm font-semibold text-dark-blue-500 hover:text-primary-500 transition"
            >
              View All Tasks
            </button>
          </div>
        </>
      )}
    </div>
  )
}
