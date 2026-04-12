"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface TimerControlsProps {
  isRunning?: boolean
  isPaused?: boolean
  countdown?: number | null
  noTaskSelected?: boolean
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
  countdown = null,
  noTaskSelected = false,
  onStart,
  onPause,
  onStop,
  onManualTime,
  className,
}: TimerControlsProps) {
  const [showNoTaskTip, setShowNoTaskTip] = React.useState(false)
  const tipTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCounting = countdown !== null
  const handleCenterClick = () => {
    if (isCounting) return
    if (isRunning) {
      onPause?.()
    } else if (noTaskSelected) {
      // Flash the tooltip
      setShowNoTaskTip(true)
      if (tipTimeout.current) clearTimeout(tipTimeout.current)
      tipTimeout.current = setTimeout(() => setShowNoTaskTip(false), 2500)
    } else {
      onStart?.()
    }
  }

  const centerLabel = isCounting
    ? "Starting..."
    : isRunning
    ? (isPaused ? "Resume Time" : "Pause Time")
    : "Start Time"

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

      {/* Start / Pause / Resume (main action) — always blue per design */}
      <div className="relative">
        <button
          onClick={handleCenterClick}
          className={cn("flex flex-col items-center gap-1.5 group", isCounting && "cursor-default")}
        >
            <div className="relative">
              {/* Pulsing glow ring when actively tracking */}
              {isRunning && !isPaused && !isCounting && (
                <span className="absolute inset-[-8px] rounded-full bg-primary-300 opacity-40 animate-ping" />
              )}
              {/* Expanding ring animation during countdown */}
              {isCounting && (
                <span className="absolute inset-[-6px] rounded-full border-2 border-primary-400 opacity-60 animate-ping" />
              )}
              <div
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full text-white transition-all",
                  "bg-primary-500",
                  isCounting
                    ? "shadow-[0_0_30px_10px_rgba(48,108,254,0.5)] scale-110"
                    : isRunning && !isPaused
                    ? "shadow-[0_0_24px_8px_rgba(48,108,254,0.45)] hover:bg-primary-600"
                    : "shadow-[0_4px_14px_rgba(48,108,254,0.4)] hover:bg-primary-600"
                )}
              >
                {isCounting ? (
                  <span key={countdown} className="text-2xl font-bold tabular-nums animate-scale-in">{countdown}</span>
                ) : isRunning && !isPaused ? (
                  <PauseIcon className="h-6 w-6" />
                ) : (
                  <PlayIcon className="h-6 w-6" />
                )}
              </div>
            </div>
            <span className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700">
              {centerLabel}
            </span>
          </button>
        {/* "Select a task first" tooltip — shown on click */}
        {showNoTaskTip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs font-medium shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 whitespace-nowrap z-50 animate-fade-in">
            Please select a task first
          </div>
        )}
      </div>

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
