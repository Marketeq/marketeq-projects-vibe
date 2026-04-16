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
  /** 0 = fully expanded, 1 = fully compact. Drives continuous button shrinking. */
  shrinkProgress?: number
  /** When true, apply CSS transitions (for chevron click). When false, sizes snap to scroll position. */
  useTransition?: boolean
  onStart?: () => void
  onPause?: () => void
  onStop?: () => void
  onManualTime?: () => void
  className?: string
}

function ManualTimeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z"
        fill="currentColor"
      />
    </svg>
  )
}

function PauseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

function StopIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/* ── Inject keyframes once via a <style> tag ── */
const RING_STYLES = `
@keyframes dtt-spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(1turn) } }
@keyframes dtt-chase {
  0%   { transform: rotate(0deg) }
  40%  { transform: rotate(300deg) }
  70%  { transform: rotate(340deg) }
  100% { transform: rotate(360deg) }
}
@keyframes dtt-chase-fast {
  0%   { transform: rotate(0deg) }
  25%  { transform: rotate(240deg) }
  50%  { transform: rotate(290deg) }
  75%  { transform: rotate(330deg) }
  100% { transform: rotate(360deg) }
}
@keyframes dtt-shrink-in {
  0%   { transform: scale(1.4) }
  100% { transform: scale(1) }
}
`

let stylesInjected = false
function injectRingStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const el = document.createElement("style")
  el.textContent = RING_STYLES
  document.head.appendChild(el)
}

/** Staggered arcs — short ones lead, long ones trail, each offset 60deg */
function ActiveRing() {
  React.useEffect(() => { injectRingStyles() }, [])
  const ringMask = "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))"
  const arcs = [
    { size: 14, delay: 0 },
    { size: 18, delay: 0.05 },
    { size: 22, delay: 0.1 },
    { size: 28, delay: 0.15 },
    { size: 34, delay: 0.2 },
    { size: 42, delay: 0.25 },
  ]
  return (
    <>
      {arcs.map((arc, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: -5,
            background: `conic-gradient(from 0deg, #306CFE ${arc.size}deg, transparent ${arc.size}deg)`,
            mask: ringMask,
            WebkitMask: ringMask,
            animation: `dtt-chase 1.2s ease-in-out infinite`,
            animationDelay: `${arc.delay}s`,
          }}
        />
      ))}
    </>
  )
}

/** Smaller version of ActiveRing for minimized header play button */
export function MiniActiveRing() {
  React.useEffect(() => { injectRingStyles() }, [])
  const ringMask = "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))"
  const arcs = [
    { size: 14, delay: 0 },
    { size: 18, delay: 0.05 },
    { size: 22, delay: 0.1 },
    { size: 28, delay: 0.15 },
    { size: 34, delay: 0.2 },
    { size: 42, delay: 0.25 },
  ]
  return (
    <>
      {arcs.map((arc, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: -3,
            background: `conic-gradient(from 0deg, #306CFE ${arc.size}deg, transparent ${arc.size}deg)`,
            mask: ringMask,
            WebkitMask: ringMask,
            animation: `dtt-chase 1.2s ease-in-out infinite`,
            animationDelay: `${arc.delay}s`,
          }}
        />
      ))}
    </>
  )
}

/** Countdown — same staggered arcs, faster loop, tight delays */
function CountdownRing() {
  React.useEffect(() => { injectRingStyles() }, [])
  const ringMask = "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))"
  const arcs = [
    { size: 14, delay: 0 },
    { size: 18, delay: 0.02 },
    { size: 22, delay: 0.04 },
    { size: 28, delay: 0.06 },
    { size: 34, delay: 0.08 },
    { size: 42, delay: 0.10 },
  ]
  return (
    <>
      {arcs.map((arc, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: -5,
            background: `conic-gradient(from 0deg, #306CFE ${arc.size}deg, transparent ${arc.size}deg)`,
            mask: ringMask,
            WebkitMask: ringMask,
            animation: `dtt-chase 0.9s ease-in-out infinite`,
            animationDelay: `${arc.delay}s`,
          }}
        />
      ))}
    </>
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
  shrinkProgress = 0,
  useTransition = false,
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

  // Interpolate sizes based on shrinkProgress (0 = expanded, 1 = compact)
  const t = shrinkProgress
  const lerp = (a: number, b: number) => a + (b - a) * t
  const centerSize = lerp(60, 40)
  const sideSize = lerp(40, 32)
  const centerIconSize = lerp(24, 16)
  const sideIconSize = lerp(20, 16)
  const gap = lerp(20, 12)
  const labelOpacity = Math.max(0, 1 - t * 2.5) // fade out by 40% progress
  const labelHeight = t > 0.4 ? 0 : undefined
  const transitionStyle = useTransition ? "all 200ms" : "none"

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
    <div className={cn("flex items-end justify-center", className)} style={{ gap, transition: transitionStyle }}>
      {/* Manual Time */}
      <button
        onClick={onManualTime}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div
          className="flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600"
          style={{ width: sideSize, height: sideSize, transition: transitionStyle }}
        >
          <ManualTimeIcon style={{ width: sideIconSize, height: sideIconSize, transition: transitionStyle }} />
        </div>
        <span
          className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700 overflow-hidden"
          style={{ opacity: labelOpacity, height: labelHeight, transition: useTransition ? "opacity 200ms, height 200ms" : "none" }}
        >
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
              {/* ── Active tracking: Instagram-style gradient ring ── */}
              {isRunning && !isPaused && !isCounting && (
                t > 0.5 ? <MiniActiveRing /> : <ActiveRing />
              )}
              {/* ── Countdown: fast spinning ring ── */}
              {isCounting && (
                <CountdownRing />
              )}
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full text-white",
                  "bg-primary-500",
                  isCounting
                    ? "shadow-[0_0_24px_8px_rgba(48,108,254,0.4)] scale-110"
                    : isRunning && !isPaused
                    ? "hover:bg-primary-600"
                    : "shadow-[0_4px_14px_rgba(48,108,254,0.4)] hover:bg-primary-600"
                )}
                style={{ width: centerSize, height: centerSize, transition: transitionStyle }}
              >
                {isCounting ? (
                  <span key={countdown} className="text-2xl font-bold tabular-nums animate-scale-in">{countdown}</span>
                ) : isRunning && !isPaused ? (
                  <PauseIcon style={{ width: centerIconSize, height: centerIconSize, transition: transitionStyle }} />
                ) : (
                  <PlayIcon style={{ width: centerIconSize, height: centerIconSize, transition: transitionStyle }} />
                )}
              </div>
            </div>
            <span
              className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700 overflow-hidden"
              style={{ opacity: labelOpacity, height: labelHeight, transition: useTransition ? "opacity 200ms, height 200ms" : "none" }}
            >
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
          <div
            className="flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600"
            style={{ width: sideSize, height: sideSize, transition: transitionStyle }}
          >
            <StopIcon style={{ width: sideIconSize, height: sideIconSize, transition: transitionStyle }} />
          </div>
          <span
            className="text-[10px] leading-3 text-gray-500 group-hover:text-gray-700 overflow-hidden"
            style={{ opacity: labelOpacity, height: labelHeight, transition: useTransition ? "opacity 200ms, height 200ms" : "none" }}
          >
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
