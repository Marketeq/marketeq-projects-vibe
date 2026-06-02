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
  const isLarge = size === "lg"

  if (!isLarge) {
    return (
      <div className={cn("flex items-baseline gap-0.5", className)}>
        <span className="text-xl font-semibold tabular-nums text-dark-blue-500 leading-7">
          {pad(hours)}
        </span>
        <span className="text-xl font-semibold text-dark-blue-500 leading-7">
          :
        </span>
        <span className="text-xl font-semibold tabular-nums text-dark-blue-500 leading-7">
          {pad(minutes)}
        </span>
        <span className="text-xl font-semibold text-dark-blue-500 leading-7">
          :
        </span>
        <span className="text-xl font-semibold tabular-nums text-dark-blue-500 leading-7">
          {pad(seconds)}
        </span>
        <span className="text-[10px] text-gray-400 ml-1">hrs</span>
        <span className="text-[10px] text-gray-400 ml-2.5">mins</span>
        <span className="text-[10px] text-gray-400 ml-2.5">secs</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-end justify-center gap-0", className)}>
      {/* Hours */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-500">
          {pad(hours)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">hrs</span>
      </div>

      <span className="text-[40px] leading-[48px] font-semibold text-dark-blue-500 mx-0.5">
        :
      </span>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-500">
          {pad(minutes)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">mins</span>
      </div>

      <span className="text-[40px] leading-[48px] font-semibold text-dark-blue-500 mx-0.5">
        :
      </span>

      {/* Seconds */}
      <div className="flex flex-col items-center">
        <span className="text-[40px] leading-[48px] font-semibold tabular-nums text-dark-blue-500">
          {pad(seconds)}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5">secs</span>
      </div>
    </div>
  )
}
