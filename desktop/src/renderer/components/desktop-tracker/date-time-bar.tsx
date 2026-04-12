"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface DateTimeBarProps {
  date: string
  utcTime: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export function DateTimeBar({
  date,
  utcTime,
  collapsed = false,
  onToggleCollapse,
  className,
}: DateTimeBarProps) {
  return (
    <button
      onClick={onToggleCollapse}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 bg-gray-25 shrink-0 w-full",
        "hover:bg-gray-50 transition-colors",
        className
      )}
    >
      <span className="text-xs font-medium text-dark-blue-400">{date}</span>

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
          <path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}
