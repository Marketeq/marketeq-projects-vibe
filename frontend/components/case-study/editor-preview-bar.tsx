"use client"

import { Clock, Edit03, X } from "@blend-metrics/icons"
import {
  Button,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

/**
 * The secondary top bar shown above the in-editor client preview — mirrors
 * EditorTopBar's right-hand cluster (saved chip, Publish, close) but swaps
 * the preview toggle for an "exit preview" pencil, since this bar lives
 * nested inside a preview that's already open (no undo/redo either — those
 * only make sense in the editing chrome above this one).
 */
export function EditorPreviewBar({
  projectName,
  lastSavedAt,
  onEdit,
  onPublish,
  onClose,
}: {
  projectName: string
  lastSavedAt?: string | null
  onEdit?: () => void
  onPublish?: () => void
  onClose?: () => void
}) {
  return (
    <nav className="flex items-center justify-between bg-white border-b border-gray-200 pl-6 pr-3 py-3 rounded-tl-[10px] rounded-tr-[10px]">
      <h1 className="text-lg font-bold leading-6 text-dark-blue-400 truncate">
        {projectName}
      </h1>

      <div className="flex items-center gap-x-6">
        <div className="inline-flex items-center gap-x-3">
          {lastSavedAt ? (
            <span className="inline-flex items-center gap-x-2 h-9 px-3 text-xs text-gray-700">
              <Clock className="size-[15px]" />
              Saved at {lastSavedAt}
            </span>
          ) : null}

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  className="size-9 text-gray-500"
                  variant="ghost"
                  visual="gray"
                  onClick={onEdit}
                  aria-label="Back to editing"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent sideOffset={9} visual="gray" side="bottom">
                Back to editing
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            type="button"
            onClick={onPublish}
            className="h-auto px-[14px] py-2 text-xs font-semibold"
          >
            Publish
          </Button>
        </div>

        <IconButton
          className="p-[10px] rounded-[10px] size-11 text-gray-500"
          variant="ghost"
          visual="gray"
          type="button"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="size-6" />
        </IconButton>
      </div>
    </nav>
  )
}
