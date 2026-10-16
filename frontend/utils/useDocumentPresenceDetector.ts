import { useEffect, useState, type RefObject } from "react"

// Real-time "is a document actually in the camera's guide box" signal for
// the identity-verification scan/back-scan screens (Chris's feedback:
// corners must stay neutral/white and a black instruction overlay must show
// until a document is actually visible — no timers or mock flags as proof).
//
// No document/edge-detection capability exists anywhere in this codebase to
// reuse: `@shivantra/react-web-camera` (the `WebCamera` component used by
// identity-verification-flow.tsx) exposes only a one-shot `capture()`, no
// continuous frame access or detection callback; no CV/ML library
// (OpenCV.js, TensorFlow.js, etc.) is installed; and Didit (the KYC vendor)
// is backend/webhook-only, with no client-side live-capture SDK wired into
// this in-house-styled camera screen. Confirmed via a repo-wide search
// before writing this.
//
// This hook is therefore a homegrown heuristic, not real document
// recognition, and that limitation is real:
//   - It samples real video frames (via a hidden canvas) from the exact
//     on-screen guide-box region and measures edge/gradient density —
//     printed text, borders, and card edges produce many sharp local
//     intensity changes; an empty desk or out-of-focus background doesn't.
//   - It CANNOT confirm document type, authenticity, or content. Any other
//     edge-dense object roughly filling the guide box (a book, a phone, a
//     sheet of paper) will also read as "detected." Detected means "something
//     document-shaped is present," never "verified" — verification still
//     happens after capture, via the vendor webhook.
//   - Detection requires the actual rendered <video> element, which the
//     WebCamera package doesn't expose via props. Since it does render a
//     real <video> into the DOM (getUserMedia requires one), this hook
//     queries for it inside the caller's own container ref rather than
//     forking/patching the third-party package.
//
// A short consecutive-sample streak (not a single frame) is required before
// flipping state in either direction, so a hand or the camera settling
// briefly over the guide box doesn't cause flicker.
export type DocumentPresenceState =
  | "camera-loading"
  | "permission-denied"
  | "detection-unavailable"
  | "no-document"
  | "document-detected"

export interface GuideBoxRect {
  left: number
  top: number
  width: number
  height: number
}

interface UseDocumentPresenceDetectorOptions {
  /** Only samples frames while true — set this to the screen's own active state. */
  active: boolean
  /** Set true when the camera itself failed (WebCamera's onError) — takes priority over frame analysis. */
  cameraError: boolean
  containerRef: RefObject<HTMLElement | null>
  containerWidth: number
  containerHeight: number
  /** The guide box's rect in containerWidth x containerHeight coordinates. Pass a stable (module-level) constant, not an inline object literal. */
  guideBox: GuideBoxRect
}

const ANALYSIS_SIZE = 48
const SAMPLE_INTERVAL_MS = 200
// Consecutive same-result samples required before flipping state — at
// SAMPLE_INTERVAL_MS this is ~600ms of persistence, chosen to absorb a
// hand passing through frame or a momentary focus hunt without flickering.
const REQUIRED_STREAK = 3
// Empirical threshold on average Sobel-style gradient magnitude over the
// sampled (downscaled) region. Not derived from a dataset — this is a
// heuristic, see file header.
const EDGE_DENSITY_THRESHOLD = 18

export function useDocumentPresenceDetector({
  active,
  cameraError,
  containerRef,
  containerWidth,
  containerHeight,
  guideBox,
}: UseDocumentPresenceDetectorOptions): DocumentPresenceState {
  const [state, setState] = useState<DocumentPresenceState>("camera-loading")

  useEffect(() => {
    if (!active) {
      setState("camera-loading")
      return
    }
    if (cameraError) {
      setState("permission-denied")
      return
    }

    let cancelled = false
    let rafId = 0
    let lastSampleTime = 0
    let hasSeenReadyFrame = false
    let detectedStreak = 0
    let notDetectedStreak = 0

    const canvas = document.createElement("canvas")
    canvas.width = ANALYSIS_SIZE
    canvas.height = ANALYSIS_SIZE
    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    setState("camera-loading")

    const tick = (time: number) => {
      if (cancelled) return
      rafId = requestAnimationFrame(tick)
      if (time - lastSampleTime < SAMPLE_INTERVAL_MS) return
      lastSampleTime = time

      const video = containerRef.current?.querySelector("video")
      if (!video || video.readyState < 2 || !video.videoWidth) {
        if (!hasSeenReadyFrame) setState("camera-loading")
        return
      }

      if (!ctx) {
        setState("detection-unavailable")
        return
      }

      if (!hasSeenReadyFrame) {
        hasSeenReadyFrame = true
        setState("no-document")
      }

      try {
        // Map the on-screen guide box into the video's native pixel space.
        // object-fit: cover scales+crops the feed to fill the container, so
        // the rendered box never lines up 1:1 with the camera's native
        // resolution — this reproduces that mapping before sampling.
        const scale = Math.max(
          containerWidth / video.videoWidth,
          containerHeight / video.videoHeight
        )
        const renderedWidth = video.videoWidth * scale
        const renderedHeight = video.videoHeight * scale
        const offsetX = (renderedWidth - containerWidth) / 2
        const offsetY = (renderedHeight - containerHeight) / 2

        const srcX = (guideBox.left + offsetX) / scale
        const srcY = (guideBox.top + offsetY) / scale
        const srcW = guideBox.width / scale
        const srcH = guideBox.height / scale

        ctx.drawImage(
          video,
          srcX,
          srcY,
          srcW,
          srcH,
          0,
          0,
          ANALYSIS_SIZE,
          ANALYSIS_SIZE
        )
        const { data } = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE)

        const gray = new Float32Array(ANALYSIS_SIZE * ANALYSIS_SIZE)
        for (let p = 0; p < gray.length; p++) {
          const o = p * 4
          gray[p] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
        }

        let edgeSum = 0
        for (let y = 1; y < ANALYSIS_SIZE - 1; y++) {
          for (let x = 1; x < ANALYSIS_SIZE - 1; x++) {
            const i = y * ANALYSIS_SIZE + x
            const gx = gray[i + 1] - gray[i - 1]
            const gy = gray[i + ANALYSIS_SIZE] - gray[i - ANALYSIS_SIZE]
            edgeSum += Math.abs(gx) + Math.abs(gy)
          }
        }
        const avgEdge = edgeSum / ((ANALYSIS_SIZE - 2) * (ANALYSIS_SIZE - 2))

        if (avgEdge > EDGE_DENSITY_THRESHOLD) {
          detectedStreak += 1
          notDetectedStreak = 0
        } else {
          notDetectedStreak += 1
          detectedStreak = 0
        }

        if (detectedStreak >= REQUIRED_STREAK) {
          setState("document-detected")
        } else if (notDetectedStreak >= REQUIRED_STREAK) {
          setState("no-document")
        }
        // else: mid-streak — hold the previous state to avoid flicker.
      } catch {
        setState("detection-unavailable")
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [
    active,
    cameraError,
    containerRef,
    containerWidth,
    containerHeight,
    guideBox,
  ])

  return state
}
