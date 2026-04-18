"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface TrackerHeaderProps {
  title?: string
  isMenuOpen?: boolean
  onMenuClick?: () => void
  className?: string
}

/** Animated hamburger ↔ X icon using three CSS-transitioned spans */
function MenuIcon({ open }: { open: boolean }) {
  const bar = "block absolute left-0 w-full h-[1.5px] bg-current rounded-full transition-all duration-200 ease-in-out"
  return (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <span className={cn(bar, open ? "top-[9px] rotate-45" : "top-[4px] rotate-0")} />
      <span className={cn(bar, "top-[9px]", open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100")} />
      <span className={cn(bar, open ? "top-[9px] -rotate-45" : "top-[14px] rotate-0")} />
    </div>
  )
}

export function TrackerHeader({
  title: _title,
  isMenuOpen = false,
  onMenuClick,
  className,
}: TrackerHeaderProps) {
  return (
    <div
      className={cn(
        "drag-region flex items-center justify-end pr-4 pt-2 pb-1 shrink-0",
        className
      )}
    >
      <button
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-700 transition"
      >
        <MenuIcon open={isMenuOpen} />
      </button>
    </div>
  )
}
