"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface TimerDisplayProps {
  hours: number
  minutes: number
  seconds: number
  size?: "sm" | "lg"
  className?: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function TimerDisplay({
  hours,
  minutes,
  seconds,
  size = "lg",
  className,
}: TimerDisplayProps) {
  if (size === "sm") {
    return (
      <div className={cn("flex items-end gap-0", className)}>
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold tabular-nums text-dark-blue-400 leading-6">
            {pad(hours)}
          </span>
          <span className="text-[8px] text-gray-400">hrs</span>
        </div>
        <span className="text-lg font-semibold text-dark-blue-400 leading-6 mx-px mb-[10px]">:</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold tabular-nums text-dark-blue-400 leading-6">
            {pad(minutes)}
          </span>
          <span className="text-[8px] text-gray-400">mins</span>
        </div>
        <span className="text-lg font-semibold text-dark-blue-400 leading-6 mx-px mb-[10px]">:</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold tabular-nums text-dark-blue-400 leading-6">
            {pad(seconds)}
          </span>
          <span className="text-[8px] text-gray-400">secs</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-start justify-center gap-0", className)}>
      {/* Hours */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-400">
          {pad(hours)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">hrs</span>
      </div>

      <span className="text-[40px] leading-[48px] font-semibold text-dark-blue-400 mx-0.5">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-400">
          {pad(minutes)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">mins</span>
      </div>

      <span className="text-[40px] leading-[48px] font-semibold text-dark-blue-400 mx-0.5">:</span>

      {/* Seconds */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-400">
          {pad(seconds)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">secs</span>
      </div>
    </div>
  )
}
