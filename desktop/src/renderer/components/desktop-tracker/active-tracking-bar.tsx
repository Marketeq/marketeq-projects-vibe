"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface ActiveTrackingBarProps {
  utcTime: string
  isRecording?: boolean
  label?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export function ActiveTrackingBar({
  utcTime,
  isRecording = true,
  label = "Tracking time...",
  collapsed = false,
  onToggleCollapse,
  className,
}: ActiveTrackingBarProps) {
  return (
    <button
      onClick={onToggleCollapse}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 bg-gray-25 shrink-0 w-full hover:bg-gray-50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isRecording && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500" />
          </span>
        )}
        <span className="text-xs font-medium text-dark-blue-400">{label}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{utcTime}</span>
        <svg
          className={cn(
            "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
            collapsed && "rotate-180"
          )}
          viewBox="0 0 14 14"
          fill="none"
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}
