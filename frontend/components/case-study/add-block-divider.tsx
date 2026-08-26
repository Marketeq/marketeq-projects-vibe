"use client"

import { Plus } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"

/**
 * The two "insert a block here" affordances used throughout the case study
 * editor: a horizontal divider between stacked blocks (was `ToBeAdded`) and
 * a vertical divider between reorderable items in a row, e.g. Process steps,
 * Testimonials, Result Metrics, Columns (was `Addened`).
 */

function Horizontal({ onPlus }: { onPlus?: () => void }) {
  return (
    <div className="flex items-center flex-auto">
      <div className="h-0.5 flex-auto bg-gray-200" />
      <button
        onClick={onPlus}
        className="size-[41px] shrink-0 focus-visible:outline-none rounded-full inline-flex justify-center items-center border-2 bg-gray-100 hover:bg-white text-gray-500 border-gray-300 hover:border-gray-400 shadow-[0px_4px_8px_-2px_rgba(16,24,40,.1)] transition duration-300"
      >
        <Plus className="size-5" />
      </button>
      <div className="h-0.5 flex-auto bg-gray-200" />
    </div>
  )
}

function Vertical({
  className,
  onAdd,
  triggerClassName,
}: {
  className?: string
  onAdd?: () => void
  triggerClassName?: string
}) {
  return (
    <div className={cn("h-[402px] relative inline-flex", className)}>
      <div className="w-1 rounded-full bg-primary-500" />
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2",
          triggerClassName
        )}
      >
        <button
          onClick={onAdd}
          className="rounded-full focus-visible:outline-none transition duration-300 hover:bg-white hover:text-primary-500 bg-primary-500 shrink-0 text-white border-2 border-primary-500 size-[25px] inline-flex items-center justify-center"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

export const AddBlockDivider = { Horizontal, Vertical }
