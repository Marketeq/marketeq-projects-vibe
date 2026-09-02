"use client"

import { SVGProps, useState } from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy02,
  EyeOff,
  Trash01,
} from "@blend-metrics/icons"
import { cn } from "@/utils/functions"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const Grid = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={13}
    height={11}
    viewBox="0 0 13 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10.842.342a1.166 1.166 0 1 1 1.65 1.65 1.166 1.166 0 0 1-1.65-1.65M6.417 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m-5.25 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m9.675 4.675a1.166 1.166 0 1 1 1.65 1.65 1.166 1.166 0 0 1-1.65-1.65m-4.425-.342a1.167 1.167 0 1 0 0 2.334 1.167 1.167 0 0 0 0-2.334m-5.25 0a1.167 1.167 0 1 0 0 2.334 1.167 1.167 0 0 0 0-2.334m9.675 4.676a1.166 1.166 0 1 1 1.65 1.649 1.166 1.166 0 0 1-1.65-1.65m-4.425-.341a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m-5.25 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333"
      fill="currentColor"
    />
  </svg>
)

/** Hover toolbar shown on a block/article: drag, move, hide, duplicate, delete. */
export const BlockToolbar = ({
  className,
  onDrag,
  canMoveLeft,
  canMoveRight,
  moveLeft,
  moveRight,
  onRemove,
  onDuplicate,
  canDuplicate,
  duplicateDisabled,
  canRemove,
  canHide,
  canMoveDown,
  canMoveUp,
  onMoveDown,
  onMoveUp,
}: {
  className?: string
  onDrag?: (event: React.PointerEvent<HTMLElement>) => void
  moveLeft?: () => void
  canMoveLeft?: boolean
  moveRight?: () => void
  canMoveRight?: boolean
  onRemove?: () => void
  canRemove?: boolean
  onDuplicate?: () => void
  canDuplicate?: boolean
  /** Keeps the Duplicate icon visible but greyed out and inert, instead of hiding it (as `canDuplicate={false}` does). */
  duplicateDisabled?: boolean
  canHide?: boolean
  canMoveDown?: boolean
  canMoveUp?: boolean
  onMoveDown?: () => void
  onMoveUp?: () => void
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "inline-flex rounded-[5px] bg-white border-gray-300 border divide-x divide-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]",
        className
      )}
    >
      <TooltipProvider delayDuration={75}>
        <Tooltip>
          <TooltipTrigger
            onPointerDown={onDrag}
            className="first:rounded-l-[5px] cursor-grab last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
          >
            <Grid />
          </TooltipTrigger>
          <TooltipContent visual="white">Drag</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {canMoveLeft && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={moveLeft}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Left</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveRight && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={moveRight}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowRight className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Right</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveDown && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={onMoveDown}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowDown className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Down</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveUp && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={onMoveUp}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowUp className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Up</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canHide && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950">
              <EyeOff className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Hide Element </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {(canDuplicate || duplicateDisabled) && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={duplicateDisabled ? undefined : onDuplicate}
              disabled={duplicateDisabled}
              className={cn(
                "first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center",
                duplicateDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-gray-100 hover:text-gray-950"
              )}
            >
              <Copy02 className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Duplicate</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canRemove && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setOpen(true)}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-error-500 justify-center hover:bg-error-100 hover:text-error-600"
            >
              <Trash01 className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[409px] p-0 z-[110]"
          dialogOverlay={<DialogOverlay className="z-[110]" />}
        >
          <div className="p-6">
            <DialogTitle className="text-dark-blue-400">
              Delete this column?
            </DialogTitle>
            <DialogDescription className="text-dark-blue-400 mt-2">
              The column will be removed permanently.
            </DialogDescription>
          </div>

          <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
            <DialogClose asChild>
              <Button variant="link" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <DialogClose onClick={onRemove} asChild>
              <Button variant="outlined" visual="gray">
                Yes, Delete
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
