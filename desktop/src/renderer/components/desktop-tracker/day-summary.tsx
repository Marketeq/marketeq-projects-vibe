"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/utils/functions"

interface DaySummaryProps {
  label: string
  fullDate?: string
  hoursTracked: string
  totalHours: string
  earned: string
  collapsed?: boolean
  onToggle?: () => void
  className?: string
}

/** Styled tooltip that portals to body so it won't clip */
function Tip({
  anchorRef,
  text,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  text: string
}) {
  const tipRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: "hidden", position: "fixed" })

  React.useEffect(() => {
    const el = anchorRef.current
    const tip = tipRef.current
    if (!el || !tip) return
    const rect = el.getBoundingClientRect()
    const tipW = tip.offsetWidth
    const showBelow = rect.top < 50
    // Center on anchor, then clamp so tooltip is 12px from screen edges
    let left = rect.left + rect.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    setStyle({
      position: "fixed",
      left,
      top: showBelow ? rect.bottom + 6 : rect.top - 6 - tip.offsetHeight,
      visibility: "visible",
    })
  }, [anchorRef, text])

  return ReactDOM.createPortal(
    <div
      ref={tipRef}
      className="fixed px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs font-medium shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 pointer-events-none z-[200] whitespace-nowrap"
      style={style}
    >
      {text}
    </div>,
    document.body
  )
}

export function DaySummary({
  label,
  fullDate,
  hoursTracked,
  totalHours,
  earned,
  collapsed = false,
  onToggle,
  className,
}: DaySummaryProps) {
  const [tracked, total] = [
    parseFloat(hoursTracked) || 0,
    parseFloat(totalHours) || 8,
  ]
  const pct = total > 0 ? Math.min((tracked / total) * 100, 100) : 0

  const [labelHovered, setLabelHovered] = React.useState(false)
  const labelRef = React.useRef<HTMLSpanElement>(null)
  const [barHovered, setBarHovered] = React.useState(false)
  const barRef = React.useRef<HTMLDivElement>(null)

  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-4 py-2 shrink-0 w-full cursor-pointer hover:bg-gray-50 transition-colors",
        className
      )}
    >
      <span
        ref={labelRef}
        className="text-[11px] font-semibold text-dark-blue-400 shrink-0 whitespace-nowrap"
        onMouseEnter={() => setLabelHovered(true)}
        onMouseLeave={() => setLabelHovered(false)}
      >
        {label}
      </span>
      {labelHovered && <Tip anchorRef={labelRef} text={fullDate || label} />}

      {/* Progress bar */}
      <div
        ref={barRef}
        className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden min-w-[30px]"
        onMouseEnter={() => setBarHovered(true)}
        onMouseLeave={() => setBarHovered(false)}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {barHovered && <Tip anchorRef={barRef} text={`${hoursTracked} hrs tracked out of ${totalHours} hours`} />}

      <span className="text-[11px] font-medium text-dark-blue-400 tabular-nums whitespace-nowrap shrink-0">
        {hoursTracked}/{totalHours} hrs
      </span>

      <span className="text-[11px] font-semibold text-primary-500 whitespace-nowrap shrink-0">
        {earned} earned
      </span>

      {/* Chevron toggle */}
      <svg
        className={cn(
          "h-3 w-3 text-gray-400 shrink-0 transition-transform duration-200",
          collapsed ? "-rotate-90" : "rotate-0"
        )}
        viewBox="0 0 14 14"
        fill="none"
      >
        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
