"use client"

import * as React from "react"
import dynamic from "next/dynamic"

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })

/**
 * Lightbox video player with a custom control bar (design frame) so the
 * playing video carries no platform branding/chrome. Uses ReactPlayer
 * (the app's existing player) with native controls hidden — works for
 * YouTube, Vimeo, and direct file URLs alike.
 */
export function LightboxVideoPlayer({
  url,
  active,
}: {
  url: string
  active: boolean
}) {
  const playerRef = React.useRef<any>(null)
  const [playing, setPlaying] = React.useState(true)
  const [progress, setProgress] = React.useState(0)
  const [hovered, setHovered] = React.useState(false)

  // Show the bar on hover, or whenever the video is paused.
  const showBar = hovered || !playing

  React.useEffect(() => {
    // Autoplay when the lightbox opens; reset when it closes / url changes.
    setPlaying(active)
    setProgress(0)
  }, [active, url])

  const toggle = () => setPlaying((p) => !p)

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    playerRef.current?.seekTo?.(ratio, "fraction")
    setProgress(ratio)
  }

  return (
    <div
      className="absolute inset-0"
      style={{ backgroundColor: "#000" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing && active}
        controls={false}
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onProgress={({ played }: { played: number }) => setProgress(played)}
        config={{
          youtube: {
            playerVars: {
              modestbranding: 1,
              rel: 0,
              iv_load_policy: 3,
              disablekb: 1,
              playsinline: 1,
            },
          },
        }}
      />
      {/* click surface toggles play/pause */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
        className="absolute inset-x-0 top-0 focus-visible:outline-none"
        style={{ bottom: 56, background: "transparent" }}
      />
      {/* custom control bar (design frame) */}
      {/* bottom scrim so the bar stays readable on bright videos */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: 80,
          background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)",
          opacity: showBar ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />
      {/* custom control bar (design) — pause/play + thin progress line */}
      <div
        className="absolute inset-x-4 bottom-4 flex items-center gap-x-3"
        style={{
          opacity: showBar ? 1 : 0,
          pointerEvents: showBar ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="shrink-0 focus-visible:outline-none"
          style={{ color: "#fff", lineHeight: 0 }}
        >
          <svg
            viewBox="0 0 24 24"
            width={24}
            height={24}
            style={{ fill: "currentColor" }}
          >
            {playing ? (
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>
        <div
          className="relative flex-auto cursor-pointer overflow-hidden rounded-full"
          style={{ height: 7, backgroundColor: "rgba(255,255,255,0.35)" }}
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: "#fff" }}
          />
        </div>
      </div>
    </div>
  )
}
