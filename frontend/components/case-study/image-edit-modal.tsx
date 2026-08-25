"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useDragControls, useMotionValue } from "framer-motion"
import { Check, RotateCw, X, ZoomIn, ZoomOut } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  IconButton,
  Slider,
} from "@/components/ui"

const PREVIEW_WIDTH = 436
const PREVIEW_HEIGHT = 320
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

export interface ImageEditResult {
  imageUrl: string
  zoom: number
  rotation: number
}

/**
 * Zoom + rotate modal for any case-study image (section/column images, the
 * publish-dialog cover image). Edits are never baked into a new file —
 * `zoom`/`rotation` are saved alongside the existing blob URL and applied
 * via CSS `transform` wherever the image renders (see
 * sections/_shared.tsx's imageTransformStyle), so they stay reversible and
 * don't force every image into one fixed aspect ratio the way rendering to
 * a canvas would.
 *
 * Pan (drag-to-reposition while zoomed) is edit-time-only feedback, not
 * persisted: a pixel offset captured against this modal's fixed preview box
 * wouldn't map correctly onto the differently-sized boxes each section
 * actually renders images in.
 */
export function ImageEditModal({
  open,
  onClose,
  imageUrl,
  title = "Edit Image",
  initialZoom = 1,
  initialRotation = 0,
  onSave,
}: {
  open: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  initialZoom?: number
  initialRotation?: number
  onSave: (result: ImageEditResult) => void
}) {
  const [zoom, setZoom] = useState(initialZoom)
  const [rotation, setRotation] = useState(initialRotation)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  // Fresh edit session every time the modal opens, seeded from the image's
  // currently-saved transform (not whatever was left over from last time).
  useEffect(() => {
    if (!open) return
    setZoom(initialZoom)
    setRotation(initialRotation)
    x.set(0)
    y.set(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const dragConstraints = useMemo(() => {
    const extra = Math.max(0, zoom - 1)
    return {
      top: -(PREVIEW_HEIGHT * extra),
      bottom: PREVIEW_HEIGHT * extra,
      left: -(PREVIEW_WIDTH * extra),
      right: PREVIEW_WIDTH * extra,
    }
  }, [zoom])

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handleSave = () => {
    onSave({ imageUrl, zoom, rotation })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="z-[110]" />}
        className="max-w-[486px] p-0 z-[110]"
      >
        <DialogDescription className="sr-only">
          Adjust the zoom and rotation of this image.
        </DialogDescription>

        <div className="p-5 flex items-center justify-between border-b border-gray-200">
          <DialogTitle className="text-lg leading-7 font-semibold text-dark-blue-400">
            {title}
          </DialogTitle>
          <IconButton
            className="size-9 text-gray-500"
            variant="ghost"
            visual="gray"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="px-5 pb-5 pt-5">
          <div
            className="relative mx-auto overflow-hidden rounded-xl bg-gray-100"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          >
            <motion.div
              drag
              dragControls={dragControls}
              dragConstraints={dragConstraints}
              dragElastic={0}
              style={{ x, y }}
              className="absolute inset-0 cursor-move"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Edit preview"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-contain pointer-events-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
              />
            </motion.div>
          </div>

          <div className="mt-6 flex items-center gap-x-3">
            <button
              type="button"
              className="text-gray-500 shrink-0 focus-visible:outline-none"
              aria-label="Zoom out"
              onClick={() =>
                setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))
              }
            >
              <ZoomOut className="size-6" />
            </button>
            <Slider
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
            />
            <button
              type="button"
              className="text-gray-500 shrink-0 focus-visible:outline-none"
              aria-label="Zoom in"
              onClick={() =>
                setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))
              }
            >
              <ZoomIn className="size-6" />
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outlined"
              leftIcon={<RotateCw className="size-4" />}
              onClick={handleRotate}
            >
              Rotate
            </Button>

            <div className="flex items-center gap-x-3">
              <Button variant="link" visual="gray" onClick={onClose}>
                Cancel
              </Button>
              <Button leftIcon={<Check className="size-4" />} onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
