"use client"

import { useState } from "react"
import { Edit03, Eye, EyeOff, Image01, Trash01 } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  IconButton,
} from "@/components/ui"
import type { CaseStudyStatus } from "@/service/http/case-study"
import { imageTransformStyle } from "./sections/_shared"

/** Slim view of a case study for grid display — CaseStudyGrid maps the full API response down to this. */
export interface CaseStudySummary {
  id: string
  title: string
  status: CaseStudyStatus
  thumbnail: string | null
  thumbnailZoom?: number
  thumbnailRotation?: number
  thumbnailOffsetX?: number
  thumbnailOffsetY?: number
}

/**
 * Single case study tile for the profile Portfolio grid. The card itself
 * still opens the editor on click (same as before — draft or published),
 * with a hover overlay adding two more actions: visibility toggle (hides a
 * published case study from its public /case-studies/[slug] page rather
 * than opening it — draft case studies are never public, so the toggle
 * only appears once something has actually been published) and Delete
 * (with confirm).
 */
export function CaseStudyCard({
  caseStudy,
  onClick,
  onDelete,
  onToggleVisibility,
  readOnly = false,
}: {
  caseStudy: CaseStudySummary
  onClick: () => void
  onDelete?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  /** Client-facing view — hides the Edit/Hide/Delete hover overlay entirely. */
  readOnly?: boolean
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isHidden = caseStudy.status === "hidden"

  return (
    <div className="group relative h-[200px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition duration-300 hover:shadow-md hover:border-gray-300">
      <button
        type="button"
        onClick={onClick}
        aria-label={readOnly ? `Preview ${caseStudy.title}` : `Edit ${caseStudy.title}`}
        className="block h-full w-full text-left focus-visible:outline-none"
      >
        {caseStudy.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={caseStudy.thumbnail}
            alt={caseStudy.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            style={imageTransformStyle(
              caseStudy.thumbnailZoom,
              caseStudy.thumbnailRotation,
              caseStudy.thumbnailOffsetX,
              caseStudy.thumbnailOffsetY
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Image01 className="size-10 text-gray-300" />
          </div>
        )}

        {isHidden ? (
          <div className="absolute inset-0 flex items-end p-[15px] bg-black/50">
            <p className="text-white text-sm font-medium truncate">
              {caseStudy.title}
            </p>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium truncate">
              {caseStudy.title}
            </p>
          </div>
        )}
      </button>

      {!readOnly && (
        <div className="absolute inset-0 flex items-center justify-center gap-x-3 bg-black/50 opacity-0 pointer-events-none transition duration-300 group-hover:opacity-100 group-hover:pointer-events-auto">
          <IconButton
            className="size-9 rounded-full bg-white/10 text-white hover:bg-white/20"
            variant="ghost"
            visual="gray"
            aria-label="Edit case study"
            onClick={onClick}
          >
            <Edit03 className="size-4" />
          </IconButton>
          {caseStudy.status !== "draft" && (
            <IconButton
              className="size-[35px] rounded-full bg-white/10 text-white hover:bg-white/20 focus:bg-white/20"
              variant="ghost"
              visual="gray"
              aria-label={isHidden ? "Unhide case study" : "Hide case study"}
              onClick={() => onToggleVisibility?.(caseStudy.id)}
            >
              {isHidden ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </IconButton>
          )}
          <IconButton
            className="size-9 rounded-full bg-white/10 text-error-400 hover:bg-error-500 hover:text-white"
            variant="ghost"
            visual="gray"
            aria-label="Delete case study"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash01 className="size-4" />
          </IconButton>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-[409px] p-0 z-[110]"
          dialogOverlay={<DialogOverlay className="z-[110]" />}
        >
          <div className="p-6 border-b border-gray-200">
            <DialogTitle>Delete this case study?</DialogTitle>
            <DialogDescription className="mt-2">
              This action cannot be undone.
            </DialogDescription>
          </div>
          <div className="py-4 flex items-center justify-between rounded-b-xl bg-gray-25 px-6">
            <DialogClose asChild>
              <Button className="opacity-50 hover:opacity-100" visual="gray" variant="link">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="outlined"
              visual="gray"
              className="border-error-300 text-error-500 hover:bg-error-500 hover:text-white"
              onClick={() => {
                setDeleteOpen(false)
                onDelete?.(caseStudy.id)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
