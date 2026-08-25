"use client"

import React, {
  SVGProps,
  useEffect,
  useState,
} from "react"
import { cn } from "@/utils/functions"
import {
  DragControls,
  HTMLMotionProps,
  MotionValue,
  Reorder,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion"
import { sanitizeRichText } from "@/lib/sanitize-html"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import { RichTextEditor as BaseRichTextEditor } from "@/components/rich-text-editor"

/**
 * Internal helpers shared by every section component in both edit and view
 * mode. Not part of the public case-study API surface — import from
 * `@/components/case-study/sections/_shared` only from within
 * `components/case-study/**`.
 */

/**
 * Section components must import RichTextEditor from here, not directly
 * from "@/components/rich-text-editor" — this pins its image-insert/replace
 * flow (the toolbar's image button, and the hover "Edit Image" action) to
 * the same URL.createObjectURL-only path every other case-study image field
 * uses (see lib/case-study-upload.ts), instead of RichTextEditor's default
 * network upload via ProjectAPI.UploadRichTextImage. That network path hits
 * portfolio-service, which isn't reliably reachable here — it was 503-ing
 * and popping a blocking window.alert() that Radix's Dialog dismissable
 * layer could misread as an outside interaction, closing the whole editor.
 *
 * Also hides the base component's floating "Add image" corner button —
 * every title/body field here already sits beside its own dedicated image
 * picker (the block's picture/gallery area), so the inline button was a
 * redundant second way to add an image, floating on top of the text.
 *
 * Uses the "simple" toolbar variant (Figma: case-study text editor
 * toolbar) — heading, bold/italic/underline/strike, align, and lists only.
 * No image button (see above), no Smart Assistant shortcut, no pin/lock.
 */
export const RichTextEditor = (
  props: React.ComponentProps<typeof BaseRichTextEditor>
) => (
  <BaseRichTextEditor
    {...props}
    onUploadImage={uploadCaseStudyImage}
    hideImageButton
    toolbarVariant="simple"
  />
)

// ---------------------------------------------------------------------------
// View-mode rendering helpers (ported from the old components/case-study-view.tsx)
// ---------------------------------------------------------------------------

export function Html({
  html,
  className,
}: {
  html: unknown
  className?: string
}) {
  const safe = sanitizeRichText(html)
  if (!safe) return null
  return (
    <div
      className={className}
      // sanitizeRichText strips everything outside a small allow-listed tag
      // set before this ever reaches dangerouslySetInnerHTML.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

export function BlockImage({
  url,
  alt,
  className,
  zoom,
  rotation,
}: {
  url?: unknown
  alt?: string
  className?: string
  zoom?: unknown
  rotation?: unknown
}) {
  if (typeof url !== "string" || !url) return null
  const style = imageTransformStyle(zoom, rotation)
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt ?? ""}
      className={cn("w-full h-auto rounded-lg object-cover", className)}
      style={style}
    />
  )
}

/**
 * CSS transform for a case-study image's saved zoom/rotation (see
 * lib/case-study-mapper.ts's ImageTransform) — shared by every section's
 * edit and view rendering so the two stay in sync. `transformOrigin: center`
 * keeps rotation/scale anchored regardless of the image's own aspect ratio.
 */
export function imageTransformStyle(
  zoom?: unknown,
  rotation?: unknown
): React.CSSProperties | undefined {
  const zoomValue = typeof zoom === "number" && zoom > 0 ? zoom : 1
  const rotationValue = typeof rotation === "number" ? rotation : 0
  if (zoomValue === 1 && rotationValue === 0) return undefined
  return {
    transform: `scale(${zoomValue}) rotate(${rotationValue}deg)`,
    transformOrigin: "center",
  }
}

// ---------------------------------------------------------------------------
// Edit-mode placeholder icon (ported from the old components/case-study-builder.tsx)
// ---------------------------------------------------------------------------

export const Picture = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={84}
    height={76}
    viewBox="0 0 84 76"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.952 65.638 38.04 44.75c1.386-1.254 2.08-1.88 2.878-2.116a3.85 3.85 0 0 1 2.164 0c.799.235 1.492.862 2.878 2.116L68.894 65.5M49 47.5l10.04-9.084c1.386-1.254 2.08-1.881 2.878-2.116a3.85 3.85 0 0 1 2.164 0c.799.235 1.492.862 2.878 2.116L77 47.5m-42-19c0 3.498-3.134 6.333-7 6.333s-7-2.835-7-6.333 3.134-6.333 7-6.333 7 2.835 7 6.333m-11.2 38h36.4c5.88 0 8.82 0 11.067-1.035 1.976-.911 3.582-2.365 4.589-4.152C77 59.28 77 56.62 77 51.3V24.7c0-5.32 0-7.98-1.144-10.013-1.007-1.787-2.613-3.24-4.59-4.152C69.022 9.5 66.082 9.5 60.2 9.5H23.8c-5.88 0-8.82 0-11.067 1.035-1.976.911-3.582 2.365-4.589 4.152C7 16.72 7 19.38 7 24.7v26.6c0 5.32 0 7.98 1.144 10.013 1.007 1.787 2.613 3.24 4.59 4.152C14.978 66.5 17.918 66.5 23.8 66.5"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// ---------------------------------------------------------------------------
// Drag-reorder chrome shared by Process, Testimonials, ResultMetrics and
// Columns (ported from the old components/case-study-builder.tsx)
// ---------------------------------------------------------------------------

export const swap = <T extends any[]>(values: T, i: number, j: number) => {
  ;[values[i], values[j]] = [values[j], values[i]]
  return values.slice()
}

export const ControlledDraggable = ({
  children,
  withFragments = false,
  ...props
}: Omit<HTMLMotionProps<"h1">, "children"> & {
  children?: (dragControls: DragControls) => React.ReactNode
  withFragments?: boolean
}) => {
  const dragControls = useDragControls()

  if (withFragments) {
    return <>{children?.(dragControls)}</>
  }

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      {...props}
    >
      {children?.(dragControls)}
    </motion.div>
  )
}

const inactiveShadow = "0px 0px 0px rgba(0,0,0,0)"

function useRaisedShadow(value: MotionValue<number>) {
  const boxShadow = useMotionValue(inactiveShadow)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          animate(boxShadow, "0px 32px 64px -12px rgba(16,24,40,.14)")
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          animate(boxShadow, inactiveShadow)
        }
      }
    })
  }, [value, boxShadow])

  return boxShadow
}

const inactiveBorderColor = "rgba(0,0,0,0)"

function useRaisedBorderColor(value: MotionValue<number>) {
  const borderColor = useMotionValue(inactiveBorderColor)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          animate(borderColor, "rgba(48,108,254,1)")
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          animate(borderColor, inactiveBorderColor)
        }
      }
    })
  }, [value, borderColor])

  return borderColor
}

function useBeingDragged(value: MotionValue<number>) {
  const [dragged, setDragged] = useState(false)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          setDragged(true)
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          setDragged(false)
        }
      }
    })
  }, [value])

  return dragged
}

export const ArticleRoot = ({
  children,
  value,
  isLast,
  dragControls,
  className,
  outlinedContainer,
  outlinedContainerClassName,
}: {
  children?: React.ReactNode
  value: number
  isLast: boolean
  dragControls: DragControls
  className?: string
  outlinedContainer?: boolean
  outlinedContainerClassName?: string
}) => {
  const x = useMotionValue(0)
  const boxShadow = useRaisedShadow(x)
  const borderColor = useRaisedBorderColor(x)
  const isBeingDragged = useBeingDragged(x)

  return (
    <Reorder.Item
      as="article"
      value={value}
      style={{
        x,
        boxShadow: outlinedContainer ? inactiveShadow : boxShadow,
        borderColor: outlinedContainer ? inactiveBorderColor : borderColor,
      }}
      data-last={isLast}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "child-card peer group/article relative rounded-lg border-2",
        className
      )}
      data-state={isBeingDragged ? "dragged" : ""}
    >
      {outlinedContainer ? (
        <motion.div
          className={cn(
            "absolute rounded-lg border-2 -inset-5 bg-white border-primary-500 hidden group-hover/article:block group-focus-within/article:hidden group-hover/article:group-focus-within/article:hidden",
            outlinedContainerClassName
          )}
          style={{ boxShadow }}
        />
      ) : null}
      {/*
        Invisible hover-bridge: unstyled, sized to fully contain the
        BlockToolbar callers position at -top-[38px] -right-[37px] (see
        process/testimonials/result-metrics/customer-journey/columns).
        Without it, moving the pointer from the block up into the toolbar
        crosses a gap group-hover/article doesn't cover (the visual
        highlight above only extends -inset-5/20px, or less where
        outlinedContainerClassName shrinks it), so the toolbar vanishes a
        beat before the click lands. Kept separate from the visual
        highlight so the toolbar's rendered position is unaffected.
      */}
      <span className="absolute -top-11 -right-11 -bottom-5 -left-5 hidden group-hover/article:block" />
      <div className="relative">{children}</div>
    </Reorder.Item>
  )
}
