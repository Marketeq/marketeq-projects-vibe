"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface DateTimeBarProps {
  date: string
  utcTime: string
  className?: string
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M3 9l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DateTimeBar({ date, utcTime, className }: DateTimeBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 bg-gray-25 shrink-0",
        className
      )}
    >
      <span className="text-xs font-medium text-dark-blue-500">{date}</span>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{utcTime}</span>
        <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
      </div>
    </div>
  )
}
