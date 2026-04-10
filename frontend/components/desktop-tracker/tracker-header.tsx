"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface TrackerHeaderProps {
  title?: string
  onMenuClick?: () => void
  className?: string
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function TrackerHeader({
  title = "Marketeq Projects",
  onMenuClick,
  className,
}: TrackerHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0",
        className
      )}
    >
      {/* macOS traffic lights */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ED6A5E]" />
        <span className="h-3 w-3 rounded-full bg-[#F5BF4F]" />
        <span className="h-3 w-3 rounded-full bg-[#62C554]" />
      </div>

      <span className="text-sm font-semibold text-dark-blue-500">{title}</span>

      <button
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-700 transition"
      >
        <HamburgerIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
