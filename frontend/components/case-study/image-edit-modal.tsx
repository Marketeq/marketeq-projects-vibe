"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
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
import { imageTransformStyle } from "./sections/_shared"

const PREVIEW_WIDTH = 436
const DEFAULT_ASPECT_RATIO = 436 / 320
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

export interface ImageEditResult {
  imageUrl: string
  zoom: number
  rotation: number
  offsetX: number
  offsetY: number
}

/**
 * Zoom + rotate + pan modal for any case-study image (section/column images,
 * the publish-dialog cover image). Edits are never baked into a new file —
 * the transform is saved alongside the existing blob URL and applied
 * wherever the image renders (see sections/_shared.tsx's imageTransformStyle),
 * so it stays reversible and doesn't force every image into one fixed aspect
 * ratio the way rendering to a canvas would.
 *
 * Pan is persisted as `offsetX`/`offsetY` percentages (drives CSS
 * `object-position`), not a pixel drag delta — a pixel offset captured
 * against this modal's fixed preview box wouldn't map onto the differently
 * -sized boxes each section actually renders images in, but a percentage
 * does, by construction.
 *
 * `aspectRatio` (width/height) and `objectFit` shape the preview box to
 * match the actual destination frame — a wide banner (big-image, gallery)
 * needs a wide crop box, and a `cover`-fit destination needs the preview to
 * crop the same way, or what's framed here won't match what the section
 * actually shows afterward. Callers whose destination frame varies in shape
 * (e.g. columns, whose width depends on how many columns are picked) can
 * omit `aspectRatio` and get the generic default box.
 */
export function ImageEditModal({
  open,
  onClose,
  imageUrl,
  title = "Edit Image",
  initialZoom = 1,
  initialRotation = 0,
  initialOffsetX = 50,
  initialOffsetY = 50,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  objectFit = "cover",
  onSave,
}: {
  open: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  initialZoom?: number
  initialRotation?: number
  initialOffsetX?: number
  initialOffsetY?: number
  aspectRatio?: number
  objectFit?: "contain" | "cover"
  onSave: (result: ImageEditResult) => void
}) {
  const [zoom, setZoom] = useState(initialZoom)
  const [rotation, setRotation] = useState(initialRotation)
  const [offsetX, setOffsetX] = useState(initialOffsetX)
  const [offsetY, setOffsetY] = useState(initialOffsetY)
  const previewHeight = PREVIEW_WIDTH / aspectRatio

  // Fresh edit session every time the modal opens, seeded from the image's
  // currently-saved transform (not whatever was left over from last time).
  useEffect(() => {
    if (!open) return
    setZoom(initialZoom)
    setRotation(initialRotation)
    setOffsetX(initialOffsetX)
    setOffsetY(initialOffsetY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handlePan = (deltaX: number, deltaY: number) => {
    // Screen-pixel drag -> percent-of-image pan. Dividing by zoom keeps the
    // drag feeling consistent at different zoom levels (the same screen
    // distance covers less of the underlying image once it's scaled up).
    // Dragging the image right should reveal more of its left side, hence
    // the subtraction.
    setOffsetX((prev) => clampPercent(prev - (deltaX / PREVIEW_WIDTH / zoom) * 100))
    setOffsetY((prev) => clampPercent(prev - (deltaY / previewHeight / zoom) * 100))
  }

  const handleSave = () => {
    onSave({ imageUrl, zoom, rotation, offsetX, offsetY })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="z-[110]" />}
        className="max-w-[486px] p-0 z-[110]"
      >
        <DialogDescription className="sr-only">
          Adjust the zoom, rotation, and position of this image.
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
            style={{ width: PREVIEW_WIDTH, height: previewHeight }}
          >
            <motion.div
              className="absolute inset-0 cursor-move touch-none"
              onPan={(_event, info) => handlePan(info.delta.x, info.delta.y)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Edit preview"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none pointer-events-none"
                style={{
                  objectFit,
                  ...imageTransformStyle(zoom, rotation, offsetX, offsetY),
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
