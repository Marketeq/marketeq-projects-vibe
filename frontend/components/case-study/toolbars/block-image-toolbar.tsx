"use client"

import { useState } from "react"
import { Edit03, Trash01, Upload, X } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui"

/** Hover toolbar shown on an image slot: edit, add image, remove. */
export const BlockImageToolbar = ({
  className,
  onAddImage,
  onRemove,
  onEdit,
  enableEdit,
  enableRemove,
}: {
  className?: string
  onAddImage: () => void
  onRemove: () => void
  onEdit: () => void
  enableEdit: boolean
  enableRemove: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "inline-flex rounded-[5px] bg-white border-gray-300 border divide-x divide-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]",
        className
      )}
    >
      {enableEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
        >
          <Edit03 className="size-4" />
        </button>
      )}
      <button
        type="button"
        className="first:rounded-l-[5px] last:rounded-r-[5px] px-2.5 focus-visible:outline-none text-xs leading-5 font-semibold inline-flex items-center gap-x-2 h-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
        onClick={onAddImage}
      >
        <Upload className="size-4" /> Add Image
      </button>
      {enableRemove && (
        <button
          type="button"
          className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-error-500 justify-center hover:bg-error-100 hover:text-error-600"
          onClick={() => setOpen(true)}
        >
          <Trash01 className="size-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[409px] p-0 z-[110]"
          dialogOverlay={<DialogOverlay className="z-[110]" />}
        >
          <div className="p-6 border-b border-gray-200">
            <DialogTitle>Delete this image?</DialogTitle>
            <DialogDescription className="mt-2">
              Your image will be removed permanently.
            </DialogDescription>
          </div>
          <div className="py-4 flex rounded-b-xl bg-gray-25 items-center justify-between px-6">
            <DialogClose asChild>
              <Button
                className="opacity-50 hover:opacity-100"
                visual="gray"
                variant="link"
              >
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button
              variant="outlined"
              visual="gray"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
