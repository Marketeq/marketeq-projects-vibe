"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/utils/functions"
import { useExclusiveTooltip } from "./tooltip-context"

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

/** Tooltip portaled to body — positioned above the anchor element, z-[400] */
function PortaledTooltip({ anchorEl, children }: { anchorEl: HTMLElement; children: React.ReactNode }) {
  const [style, setStyle] = React.useState<React.CSSProperties>({ position: "fixed", visibility: "hidden" })
  const tipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const tip = tipRef.current
    if (!tip) return
    const rect = anchorEl.getBoundingClientRect()
    const tipW = tip.offsetWidth
    let left = rect.left + rect.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    setStyle({
      position: "fixed",
      left,
      top: rect.top - 8 - tip.offsetHeight,
      visibility: "visible",
    })
  }, [anchorEl])

  return (
    <div
      ref={tipRef}
      className="px-3 py-1.5 rounded-md bg-white text-dark-blue-400 text-xs font-medium shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 whitespace-nowrap z-[400] pointer-events-none animate-fade-in"
      style={style}
    >
      {children}
    </div>
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
  const [showNotRunningTip, setShowNotRunningTip] = React.useState(false)
  const tipTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopTipTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const centerBtnRef = React.useRef<HTMLDivElement>(null)
  const stopBtnRef = React.useRef<HTMLDivElement>(null)
  const noTaskTooltip = useExclusiveTooltip()
  const notRunningTooltip = useExclusiveTooltip()
  const isCounting = countdown !== null
  const handleCenterClick = () => {
    if (isCounting) return
    if (isRunning) {
      onPause?.()
    } else if (noTaskSelected) {
      // Flash the tooltip — claim exclusive slot
      noTaskTooltip.claim()
      setShowNoTaskTip(true)
      if (tipTimeout.current) clearTimeout(tipTimeout.current)
      tipTimeout.current = setTimeout(() => { setShowNoTaskTip(false); noTaskTooltip.release() }, 2500)
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
      <div ref={centerBtnRef} className="relative">
        <button
          onClick={handleCenterClick}
          className={cn("flex flex-col items-center gap-1.5 group", isCounting && "cursor-default")}
        >
            <div className="relative flex items-center justify-center">
              {/* ── Active tracking: multi-layer spinning ring effect ── */}
              {isRunning && !isPaused && !isCounting && (<>
                {/* Layer 1: Breathing glow backdrop */}
                <div
                  className="absolute inset-[-6px] rounded-full animate-breathe-glow"
                  style={{ background: "radial-gradient(circle, rgba(48,108,254,0.25) 60%, transparent 70%)" }}
                />
                {/* Layer 2: Primary ring — fast spin, bright hot-spot that sweeps around */}
                <div className="absolute inset-[-5px] rounded-full animate-spin-ring">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0%, #306CFE 10%, #779EFF 25%, #C9D9FF 35%, transparent 50%, #5687FF 65%, #2459DB 80%, #306CFE 90%, transparent 100%)",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                    }}
                  />
                </div>
                {/* Layer 3: Secondary ring — slower counter-rotation, softer colors */}
                <div className="absolute inset-[-5px] rounded-full animate-spin-ring-reverse opacity-50">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: "conic-gradient(from 180deg, transparent 0%, #98B6FF 15%, transparent 35%, #E8EEFF 55%, transparent 75%, #779EFF 90%, transparent 100%)",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
                    }}
                  />
                </div>
                {/* Layer 4: Bright shimmer dot — fastest, creates the "traveling light" */}
                <div className="absolute inset-[-5px] rounded-full animate-shimmer">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0%, transparent 42%, #fff 49%, #C9D9FF 51%, transparent 58%, transparent 100%)",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px))",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px))",
                    }}
                  />
                </div>
              </>)}
              {/* ── Countdown: fast single ring ── */}
              {isCounting && (
                <div className="absolute inset-[-5px] rounded-full animate-spin-ring" style={{ animationDuration: "1s" }}>
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0%, #306CFE 20%, #779EFF 40%, #E8EEFF 50%, transparent 60%, transparent 100%)",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                    }}
                  />
                </div>
              )}
              <div
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full text-white transition-all",
                  "bg-primary-500",
                  isCounting
                    ? "shadow-[0_0_24px_8px_rgba(48,108,254,0.4)] scale-110"
                    : isRunning && !isPaused
                    ? "shadow-[0_0_20px_6px_rgba(48,108,254,0.25)] hover:bg-primary-600"
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
        {/* "Select a task first" tooltip — portaled to escape stacking contexts */}
        {showNoTaskTip && noTaskTooltip.active && centerBtnRef.current && ReactDOM.createPortal(
          <PortaledTooltip anchorEl={centerBtnRef.current}>
            Please select a task first
          </PortaledTooltip>,
          document.body
        )}
      </div>

      {/* Stop Time — shows tooltip when clicked while not tracking */}
      <div ref={stopBtnRef} className="relative">
        <button
          onClick={() => {
            if (isRunning) {
              onStop?.()
            } else {
              notRunningTooltip.claim()
              setShowNotRunningTip(true)
              if (stopTipTimeout.current) clearTimeout(stopTipTimeout.current)
              stopTipTimeout.current = setTimeout(() => { setShowNotRunningTip(false); notRunningTooltip.release() }, 2500)
            }
          }}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-400 transition hover:border-gray-400 hover:text-gray-600">
            <StopIcon className="h-5 w-5" />
          </div>
          <span className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700">
            Stop Time
          </span>
        </button>
        {showNotRunningTip && notRunningTooltip.active && stopBtnRef.current && ReactDOM.createPortal(
          <PortaledTooltip anchorEl={stopBtnRef.current}>
            Tracker is not running
          </PortaledTooltip>,
          document.body
        )}
      </div>
    </div>
  )
}
