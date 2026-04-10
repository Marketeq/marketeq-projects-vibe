"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface DaySummaryProps {
  label: string
  hoursTracked: string
  totalHours: string
  earned: string
  className?: string
}

export function DaySummary({
  label,
  hoursTracked,
  totalHours,
  earned,
  className,
}: DaySummaryProps) {
  const [tracked, total] = [
    parseFloat(hoursTracked) || 0,
    parseFloat(totalHours) || 8,
  ]
  const pct = total > 0 ? Math.min((tracked / total) * 100, 100) : 0

  return (
    <div className={cn("flex items-center gap-2.5 px-4 py-2.5 shrink-0", className)}>
      <span className="text-sm font-semibold text-dark-blue-500 shrink-0">
        {label}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="text-sm font-medium text-dark-blue-500 tabular-nums whitespace-nowrap shrink-0">
        {hoursTracked}/{totalHours} hrs
      </span>

      <span className="text-sm font-semibold text-primary-500 whitespace-nowrap shrink-0">
        {earned} earned
      </span>

      {/* Small chevron toggle */}
      <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" viewBox="0 0 14 14" fill="none">
        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
