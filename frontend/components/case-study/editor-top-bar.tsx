"use client"

import { Clock, Eye, EyeOff, ReverseLeft, ReverseRight, X } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"
import { CASE_STUDY_PUBLISH_ENABLED } from "@/lib/case-study-flags"
import {
  Button,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

/**
 * The editor top bar (Figma "Component 1000001833"), pixel-matched to the
 * spec: undo/redo + title on the left; a "Saved at …" status chip, a preview
 * toggle, Publish, and Close on the right.
 *
 * Note: the earlier version of this component (Phase 2) also rendered a
 * desktop/tablet/mobile device-preview switcher, an "Add AI" button, a
 * settings button, and the current user's avatar — none of those appear in
 * this component's real Figma spec, so they've been removed here rather
 * than kept as unverified guesses. The device-preview state still exists in
 * case-study-editor.tsx (now with no control to change it) — flagged
 * separately, since it's not clear yet whether that switcher lives in a
 * different component or should be dropped.
 */
export function EditorTopBar({
  projectName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  lastSavedAt,
  isPreview,
  onPreviewToggle,
  onPublish,
  onClose,
  className,
}: {
  projectName: string
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  lastSavedAt?: string | null
  isPreview?: boolean
  onPreviewToggle?: () => void
  onPublish?: () => void
  onClose?: () => void
  className?: string
}) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between bg-white border-b border-gray-200 drop-shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)] pl-6 pr-3 py-3 rounded-tl-[10px] rounded-tr-[10px]",
        className
      )}
    >
      {/* Left: undo/redo + title */}
      <div className="flex flex-1 items-center gap-x-6">
        <div className="inline-flex items-center gap-x-1">
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  className="size-9 text-gray-500 disabled:opacity-40"
                  variant="ghost"
                  visual="gray"
                  disabled={!canUndo}
                  onClick={onUndo}
                >
                  <ReverseLeft className="size-[18px]" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent sideOffset={9} visual="gray" side="bottom">
                Undo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  className="size-9 text-gray-500 disabled:opacity-40"
                  variant="ghost"
                  visual="gray"
                  disabled={!canRedo}
                  onClick={onRedo}
                >
                  <ReverseRight className="size-[18px]" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent sideOffset={9} visual="gray" side="bottom">
                Redo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <span className="text-base font-semibold leading-6 text-gray-500 truncate">
          {projectName}
        </span>
      </div>

      {/* Right: saved chip, preview toggle, publish, close */}
      <div className="flex flex-1 items-center justify-end gap-x-6">
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
                  className={cn(
                    "size-9 p-2",
                    isPreview
                      ? "bg-primary-500 text-white hover:bg-primary-600"
                      : "bg-primary-50 text-primary-500 hover:bg-primary-100"
                  )}
                  variant="light"
                  visual="primary"
                  onClick={onPreviewToggle}
                >
                  {isPreview ? (
                    <EyeOff className="size-3" />
                  ) : (
                    <Eye className="size-3" />
                  )}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent sideOffset={9} visual="gray" side="bottom">
                {isPreview ? "Exit preview" : "Preview"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {CASE_STUDY_PUBLISH_ENABLED && (
            <Button
              type="button"
              onClick={onPublish}
              className="h-auto px-[14px] py-2 text-xs font-semibold"
            >
              Publish
            </Button>
          )}
        </div>

        <IconButton
          className="p-[10px] rounded-[10px] size-11 text-gray-500"
          variant="ghost"
          visual="gray"
          type="button"
          onClick={onClose}
        >
          <X className="size-6" />
        </IconButton>
      </div>
    </nav>
  )
}
