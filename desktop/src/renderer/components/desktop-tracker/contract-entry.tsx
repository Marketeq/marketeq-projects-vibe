"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"
import { useExclusiveTooltip } from "./tooltip-context"

// A locally-created task (not yet saved to the backend) can't start the
// timer — mirrors TimeTrackerApp's isRealTaskId check.
function isRealTaskId(id: string): boolean {
  return !/^task-/.test(id) && !/^t-\d/.test(id)
}

export interface TaskEntry {
  id: string
  name: string
  timeRange: string
  duration: string
  progress?: number
}

export interface ContractEntryProps {
  contractId: string
  contractName: string
  clientHandle: string
  avatarSrc?: string
  totalHours?: string
  tasks?: TaskEntry[]
  isExpanded?: boolean
  activeContractId?: string | null
  onToggle?: () => void
  onAddTask?: () => void
  onPlay?: () => void
  onPlayTask?: (taskId: string) => void
  onSwitchContract?: () => void
  className?: string
}

/** Tooltip that escapes overflow containers using fixed positioning + portal */
function FixedTooltip({
  anchorRef,
  children,
  wide,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
  wide?: boolean
}) {
  const tipRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: "hidden", position: "fixed" })

  React.useEffect(() => {
    const el = anchorRef.current
    const tip = tipRef.current
    if (!el || !tip) return
    const rect = el.getBoundingClientRect()
    const tipW = tip.offsetWidth
    const showBelow = rect.top < 60
    // Center on anchor, then clamp 12px from screen edges
    let left = rect.left + rect.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    setStyle({
      position: "fixed",
      left,
      top: showBelow ? rect.bottom + 8 : rect.top - 8 - tip.offsetHeight,
      visibility: "visible",
    })
  }, [anchorRef, wide])

  return ReactDOM.createPortal(
    <div
      ref={tipRef}
      className={cn(
        "fixed px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 pointer-events-none z-[400]",
        wide ? "w-52 whitespace-normal text-left leading-relaxed" : "whitespace-nowrap"
      )}
      style={style}
    >
      {children}
    </div>,
    document.body
  )
}

/** Interactive tooltip for "switch contracts" — stays open while hovering tooltip itself */
function SwitchContractTooltip({
  anchorRef,
  onSwitch,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  onSwitch: () => void
}) {
  const tipRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: "hidden", position: "fixed" })

  React.useEffect(() => {
    const el = anchorRef.current
    const tip = tipRef.current
    if (!el || !tip) return
    const rect = el.getBoundingClientRect()
    const tipW = tip.offsetWidth
    const showBelow = rect.top < 60
    let left = rect.left + rect.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    setStyle({
      position: "fixed",
      left,
      top: showBelow ? rect.bottom + 6 : rect.top - 6 - tip.offsetHeight,
      visibility: "visible",
    })
  }, [anchorRef])

  return ReactDOM.createPortal(
    <div
      ref={tipRef}
      className="fixed w-[210px] px-3 py-2.5 rounded-lg bg-white text-left text-xs shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-gray-100 z-[400]"
      style={style}
    >
      <p className="text-dark-blue-400 leading-normal">
        You can only track one contract at a time.
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); onSwitch() }}
        className="mt-1 text-primary-500 font-medium hover:text-primary-600 hover:underline transition cursor-pointer"
      >
        Switch contracts
      </button>

    </div>,
    document.body
  )
}

/** Play button with hover tooltip — context-aware */
function PlayWithTooltip({
  onClick,
  onSwitchContract,
  isSameContract,
  isDifferentContract,
  isTracking,
  size = "sm",
  label,
  clickHint,
}: {
  onClick?: () => void
  onSwitchContract?: () => void
  isSameContract: boolean
  isDifferentContract: boolean
  isTracking: boolean
  size?: "sm" | "xs"
  label?: string
  /**
   * For a ▶ that does not itself start the timer (the contract-header one,
   * which only opens the contract's task list): text flashed on click for
   * 2.5 s, matching the main Start button's "Please select a task first".
   * Hover still shows the normal "Start tracking time" tooltip.
   */
  clickHint?: string
}) {
  const { active: hovered, claim: show, release: hide } = useExclusiveTooltip()
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashing, setFlashing] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const disabled = isDifferentContract

  const tooltipText = !isTracking
    ? "Start tracking time"
    : isSameContract
    ? "Switch to this task"
    : null

  const enter = () => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null }
    show()
  }
  const leave = () => {
    hideTimeout.current = setTimeout(() => hide(), 150)
  }

  React.useEffect(() => () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    if (flashTimeout.current) clearTimeout(flashTimeout.current)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onClick?.()
    if (clickHint) {
      setFlashing(true)
      if (flashTimeout.current) clearTimeout(flashTimeout.current)
      flashTimeout.current = setTimeout(() => setFlashing(false), 2500)
    }
  }

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={handleClick}
        className={cn(
          "transition shrink-0",
          disabled
            ? size === "sm"
              ? "flex flex-col items-center gap-0.5 text-gray-400 cursor-not-allowed"
              : "text-gray-400 cursor-not-allowed"
            : size === "sm"
            ? "flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500"
            : "text-gray-400 hover:text-primary-500"
        )}
      >
        <PlaySmallIcon className={size === "sm" ? "h-5 w-5" : "h-4 w-4"} />
        {label && <span className="text-[10px] leading-3 text-gray-400">{label}</span>}
      </button>
      {hovered && disabled && (
        <div onMouseEnter={enter} onMouseLeave={leave}>
          <SwitchContractTooltip anchorRef={ref} onSwitch={() => { hide(); onSwitchContract?.() }} />
        </div>
      )}
      {flashing && clickHint ? (
        <FixedTooltip anchorRef={ref}>{clickHint}</FixedTooltip>
      ) : hovered && !disabled && tooltipText ? (
        <FixedTooltip anchorRef={ref}>{tooltipText}</FixedTooltip>
      ) : null}
    </div>
  )
}

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={cn(
        "h-4 w-4 text-gray-400 transition-transform duration-200",
        expanded ? "rotate-0" : "-rotate-90",
        className
      )}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlaySmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 6.5l5.5 3.5L8 13.5V6.5z" fill="currentColor" />
    </svg>
  )
}

/** Smooth collapsible wrapper — measures content and animates height */
function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number>(0)

  // Sync measurement on every open change + ResizeObserver for dynamic content
  React.useEffect(() => {
    const el = innerRef.current
    if (!el) return
    setHeight(el.scrollHeight)
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  return (
    <div
      style={{ height: open ? height : 0 }}
      className="overflow-hidden transition-[height] duration-200 ease-in-out"
    >
      <div ref={innerRef}>
        {children}
      </div>
    </div>
  )
}

/** Progress bar with hover tooltip showing completion */
function ProgressBarWithTooltip({ progress, duration }: { progress: number; duration: string }) {
  const { active: hovered, claim, release } = useExclusiveTooltip()
  const ref = React.useRef<HTMLDivElement>(null)
  const pct = Math.min(progress, 100)

  return (
    <div
      ref={ref}
      className="w-full h-1 rounded-full bg-gray-100 overflow-hidden mt-1"
      onMouseEnter={claim}
      onMouseLeave={release}
    >
      <div
        className="h-full rounded-full bg-primary-500"
        style={{ width: `${pct}%` }}
      />
      {hovered && (
        <FixedTooltip anchorRef={ref}>
          {Math.round(pct)}% complete — {duration} tracked
        </FixedTooltip>
      )}
    </div>
  )
}

/** Add task button with styled tooltip */
function AddTaskButton({ onClick, variant = "icon" }: { onClick: (e: React.MouseEvent) => void; variant?: "icon" | "inline" }) {
  const { active: hovered, claim, release } = useExclusiveTooltip()
  const ref = React.useRef<HTMLDivElement>(null)

  if (variant === "inline") {
    return (
      <div ref={ref} className="relative inline-block" onMouseEnter={claim} onMouseLeave={release}>
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-[5px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add A Task
        </button>
        {hovered && <FixedTooltip anchorRef={ref}>Create a new task</FixedTooltip>}
      </div>
    )
  }

  return (
    <div ref={ref} className="shrink-0" onMouseEnter={claim} onMouseLeave={release}>
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 transition"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="text-[10px] leading-3 text-gray-400">Add task</span>
      </button>
      {hovered && <FixedTooltip anchorRef={ref}>Create a new task</FixedTooltip>}
    </div>
  )
}

export function ContractEntry({
  contractId,
  contractName,
  clientHandle,
  avatarSrc,
  totalHours = "0 hrs",
  tasks = [],
  isExpanded = false,
  activeContractId,
  onToggle,
  onAddTask,
  onPlay,
  onPlayTask,
  onSwitchContract,
  className,
}: ContractEntryProps) {
  const isTracking = !!activeContractId
  const isSameContract = activeContractId === contractId
  const isDifferentContract = isTracking && !isSameContract
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors overflow-hidden", className)}>
      {/* Contract header row — entire row toggles expand/collapse */}
      <div
        onClick={onToggle}
        className="flex items-center gap-2.5 px-3 py-3 cursor-pointer hover:bg-gray-25 transition-colors"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <ChevronIcon expanded={isExpanded} />
        </div>

        <Avatar size="sm">
          <AvatarImage src={avatarSrc} alt={contractName} />
          <AvatarFallback>{contractName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-blue-400 truncate leading-5">
            {contractName}
          </p>
          <p className="text-xs text-gray-500 truncate leading-4">@{clientHandle}</p>
        </div>

        <AddTaskButton onClick={(e) => { e.stopPropagation(); onAddTask?.() }} />

        <PlayWithTooltip
          onClick={() => onPlay?.()}
          onSwitchContract={onSwitchContract}
          isSameContract={isSameContract}
          isDifferentContract={isDifferentContract}
          isTracking={isTracking}
          size="sm"
          label={totalHours}
          clickHint="Please select a task first"
        />
      </div>

      {/* Animated task list */}
      <Collapsible open={isExpanded}>
        <div className="border-t border-gray-100 pb-3">
          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400 mb-3">
                This contract doesn&apos;t have any tasks yet.
              </p>
              <AddTaskButton onClick={() => onAddTask?.()} variant="inline" />
            </div>
          ) : (
            <>
              {/* Task list header */}
              <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500">
                <span>Task Name</span>
                <span>Time Tracked</span>
              </div>

              {/* Task rows */}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-25 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-blue-400 truncate leading-5">
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-400 leading-4">{task.timeRange}</p>
                    {/* Progress bar — left-aligned under task name */}
                    {task.progress !== undefined && (
                      <ProgressBarWithTooltip progress={task.progress} duration={task.duration} />
                    )}
                  </div>

                  <span className="text-sm font-medium text-dark-blue-400 tabular-nums whitespace-nowrap shrink-0">
                    {task.duration}
                  </span>

                  <PlayWithTooltip
                    onClick={() => onPlayTask?.(task.id)}
                    onSwitchContract={onSwitchContract}
                    isSameContract={isSameContract}
                    isDifferentContract={isDifferentContract}
                    isTracking={isTracking}
                    size="xs"
                    clickHint={isRealTaskId(task.id) ? undefined : "Please select a task first"}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </Collapsible>
    </div>
  )
}
