"use client"

import type { ReactElement } from "react"
import {
  BarChart10,
  Dataflow02,
  File02,
  File06,
  Image as ImageIcon,
  List,
  MessageSquare,
  Mic,
  Type02,
  Users03,
  X,
} from "@blend-metrics/icons"
import type { CaseStudyBlockType } from "@/lib/case-study-mapper"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  IconButton,
} from "@/components/ui"
import { GalleryIcon } from "./gallery-icon"

type IconComponent = (props: { className?: string }) => ReactElement

/** The complete, user-selectable section catalog — also the source of
 *  truth for "Use a Template", which seeds a new case study with one of
 *  every section listed here, in this order. */
export const SECTION_TILES: {
  type: CaseStudyBlockType
  label: string
  Icon: IconComponent
}[] = [
  { type: "introduction", label: "Introduction", Icon: File02 },
  { type: "challenges", label: "Challenges", Icon: List },
  { type: "image-text", label: "Image & Text", Icon: ImageIcon },
  { type: "big-image", label: "Big Image", Icon: ImageIcon },
  { type: "bold-statement", label: "Bold Statement", Icon: Type02 },
  { type: "process", label: "Process", Icon: Dataflow02 },
  { type: "interview", label: "Interview", Icon: Mic },
  { type: "personas", label: "Personas", Icon: Users03 },
  { type: "testimonial", label: "Testimonial", Icon: MessageSquare },
  { type: "gallery", label: "Gallery", Icon: GalleryIcon },
  { type: "results-metrics", label: "Result Metrics", Icon: BarChart10 },
  { type: "conclusion", label: "Conclusion", Icon: File06 },
]

/** Every CaseStudyBlockType's display name, including the handful (custom
 *  columns, video, customer journey, prototype) that don't have a tile in
 *  the picker above but still need a label wherever a block's type is
 *  shown — e.g. the editor's per-block hover chrome. */
export const SECTION_TYPE_LABELS: Record<CaseStudyBlockType, string> = {
  ...Object.fromEntries(SECTION_TILES.map(({ type, label }) => [type, label])),
  "custom-columns": "Columns",
  video: "Video",
  "customer-journey": "Customer Journey",
  prototype: "Prototype",
} as Record<CaseStudyBlockType, string>

/**
 * The "Select your section" block picker modal.
 *
 * Replaces two previously-existing, drifted copies of this grid: the
 * unused exported `TemplateDialog` in the old case-study-builder.tsx (and
 * its Storybook twin), which had no click wiring and mislabeled the 6th
 * tile "Process" a second time instead of "Image & Text" — versus the
 * live, working 16-tile grid inlined further down in the same file, which
 * was already correct. This component is that live version, generalized
 * behind an `onSelect` callback instead of a hardcoded `dispatch` call.
 */
export function TemplateDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: CaseStudyBlockType) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="blur-lg z-[110]" />}
        className="max-w-[597px] p-0 z-[110]"
      >
        <div className="pl-6 p-3 flex items-center justify-between border-b border-gray-200">
          <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
            Select your section
          </h1>

          <DialogClose asChild>
            <IconButton className="text-gray-500" variant="ghost" visual="gray">
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>
        <div className="p-6 grid grid-cols-3 gap-3">
          {SECTION_TILES.map(({ type, label, Icon }) => (
            <DialogClose
              key={type}
              onClick={() => onSelect(type)}
              className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
            >
              <Icon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
              <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                {label}
              </span>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
