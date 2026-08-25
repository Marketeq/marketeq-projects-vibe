"use client"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  IconButton,
} from "@/components/ui"
import { X } from "@blend-metrics/icons"

export interface ColumnLayoutOption {
  id: string
  label: string
  /** Relative grid `fr` weights, e.g. [2, 1] renders a 66/33 split. */
  widths: number[]
}

export const COLUMN_LAYOUTS: ColumnLayoutOption[] = [
  // Row 1 — single/two-column basics
  { id: "1-col", label: "Full width", widths: [1] },
  { id: "2-col-equal", label: "2 equal", widths: [1, 1] },
  { id: "2-col-wide-left", label: "Wide left", widths: [2, 1] },
  { id: "2-col-wide-right", label: "Wide right", widths: [1, 2] },
  // Row 2 — three-column basics
  { id: "3-col-equal", label: "3 equal", widths: [1, 1, 1] },
  { id: "3-col-wide-center", label: "Wide center", widths: [1, 2, 1] },
  { id: "3-col-narrow-center", label: "Narrow center", widths: [2, 1, 2] },
  { id: "3-col-wide-left", label: "Wide left, two narrow right", widths: [2, 1, 1] },
  // Row 3 — four-column basics
  { id: "4-col-equal", label: "4 equal", widths: [1, 1, 1, 1] },
  { id: "4-col-wide-first", label: "Wide first", widths: [2, 1, 1, 1] },
  { id: "4-col-wide-last", label: "Wide last", widths: [1, 1, 1, 2] },
]

/** Small proportional preview of a layout's column widths. */
function LayoutThumbnail({ widths }: { widths: number[] }) {
  return (
    <div className="flex w-full h-10 gap-1">
      {widths.map((width, i) => (
        <div
          key={i}
          style={{ flexGrow: width, flexBasis: 0 }}
          className="h-full rounded-sm bg-gray-200 group-hover:bg-primary-200 transition duration-300"
        />
      ))}
    </div>
  )
}

export function ColumnLayoutPicker({
  open,
  onOpenChange,
  onSelect,
  onUseTemplate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (widths: number[]) => void
  onUseTemplate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="blur-lg z-[110]" />}
        className="max-w-[597px] p-0 z-[110]"
      >
        <div className="pl-6 p-3 flex items-center justify-between border-b border-gray-200">
          <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
            Select Your Column Layout
          </h1>

          <DialogClose asChild>
            <IconButton className="text-gray-500" variant="ghost" visual="gray">
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>
        <div className="p-6 grid grid-cols-4 gap-3">
          {COLUMN_LAYOUTS.map((layout) => (
            <DialogClose
              key={layout.id}
              onClick={() => onSelect(layout.widths)}
              aria-label={layout.label}
              className="group p-4 focus-visible:outline-none flex flex-col items-center justify-center rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
            >
              <LayoutThumbnail widths={layout.widths} />
            </DialogClose>
          ))}

          <button
            type="button"
            onClick={onUseTemplate}
            className="p-4 focus-visible:outline-none flex flex-col items-center justify-center text-center rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
          >
            <span className="text-xs text-gray-500 underline underline-offset-2">
              Need a pre-built section instead? Use a Template
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
