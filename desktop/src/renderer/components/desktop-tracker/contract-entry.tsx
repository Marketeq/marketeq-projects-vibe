"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"

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
  const [pos, setPos] = React.useState<{ top: number; left: number; below: boolean } | null>(null)

  React.useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const showBelow = rect.top < 60
    let left = rect.left + rect.width / 2
    // Clamp to window edges with 8px padding
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
      ref={tipRef}
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

/** Play button with hover tooltip — context-aware */
function PlayWithTooltip({
  onClick,
  isSameContract,
  isDifferentContract,
  isTracking,
  size = "sm",
  label,
}: {
  onClick?: () => void
  isSameContract: boolean
  isDifferentContract: boolean
  isTracking: boolean
  size?: "sm" | "xs"
  label?: string
}) {
  const [hovered, setHovered] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const disabled = isDifferentContract

  const tooltipText = !isTracking
    ? "Start tracking time"
    : isSameContract
    ? "Switch to this task"
    : null

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={(e) => { e.stopPropagation(); if (!disabled) onClick?.() }}
        className={cn(
          "transition shrink-0",
          disabled
            ? size === "sm"
              ? "flex flex-col items-center gap-0.5 text-gray-200 cursor-not-allowed"
              : "text-gray-200 cursor-not-allowed"
            : size === "sm"
            ? "flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500"
            : "text-gray-400 hover:text-primary-500"
        )}
      >
        <PlaySmallIcon className={size === "sm" ? "h-5 w-5" : "h-4 w-4"} />
        {label && <span className={cn("text-[10px] leading-3", disabled ? "text-gray-200" : "text-gray-400")}>{label}</span>}
      </button>
      {hovered && disabled && (
        <FixedTooltip anchorRef={ref} wide>
          You can only track one contract at a time.
          <br />
          Click here to switch contracts.
        </FixedTooltip>
      )}
      {hovered && !disabled && tooltipText && (
        <FixedTooltip anchorRef={ref}>
          {tooltipText}
        </FixedTooltip>
      )}
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

/** Add task button with styled tooltip */
function AddTaskButton({ onClick, variant = "icon" }: { onClick: (e: React.MouseEvent) => void; variant?: "icon" | "inline" }) {
  const [hovered, setHovered] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  if (variant === "inline") {
    return (
      <div ref={ref} className="relative inline-block" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
    <div ref={ref} className="shrink-0" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
          isSameContract={isSameContract}
          isDifferentContract={isDifferentContract}
          isTracking={isTracking}
          size="sm"
          label={totalHours}
        />
      </div>

      {/* Animated task list */}
      <Collapsible open={isExpanded}>
        <div className="border-t border-gray-100">
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
                      <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-primary-500"
                          style={{ width: `${Math.min(task.progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-medium text-dark-blue-400 tabular-nums whitespace-nowrap shrink-0">
                    {task.duration}
                  </span>

                  <PlayWithTooltip
                    onClick={() => onPlayTask?.(task.id)}
                    isSameContract={isSameContract}
                    isDifferentContract={isDifferentContract}
                    isTracking={isTracking}
                    size="xs"
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
