"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface TimerControlsProps {
  isRunning?: boolean
  isPaused?: boolean
  onStart?: () => void
  onPause?: () => void
  onStop?: () => void
  onManualTime?: () => void
  className?: string
}

function ManualTimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z"
        fill="currentColor"
      />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function TimerControls({
  isRunning = false,
  isPaused = false,
  onStart,
  onPause,
  onStop,
  onManualTime,
  className,
}: TimerControlsProps) {
  const handleCenterClick = () => {
    if (isRunning) {
      onPause?.()
    } else {
      onStart?.()
    }
  }

  const centerLabel = isRunning ? (isPaused ? "Resume" : "Pause") : "Start Time"

  return (
    <div className={cn("flex items-center justify-center gap-5", className)}>
      {/* Manual Time */}
      <button
        onClick={onManualTime}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-400 transition hover:border-gray-400 hover:text-gray-600">
          <ManualTimeIcon className="h-5 w-5" />
        </div>
        <span className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700">
          Manual Time
        </span>
      </button>

      {/* Start / Pause / Resume (main action) */}
      <button
        onClick={handleCenterClick}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(48,108,254,0.35)] transition",
            isRunning && !isPaused
              ? "bg-dark-blue-500 hover:bg-dark-blue-600 shadow-[0_4px_12px_rgba(14,32,76,0.35)]"
              : "bg-primary-500 hover:bg-primary-600"
          )}
        >
          {isRunning && !isPaused ? (
            <PauseIcon className="h-6 w-6" />
          ) : (
            <PlayIcon className="h-6 w-6" />
          )}
        </div>
        <span className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700">
          {centerLabel}
        </span>
      </button>

      {/* Stop Time */}
      <button
        onClick={onStop}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-400 transition hover:border-gray-400 hover:text-gray-600">
          <StopIcon className="h-5 w-5" />
        </div>
        <span className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700">
          Stop Time
        </span>
      </button>
    </div>
  )
}
