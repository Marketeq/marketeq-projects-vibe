"use client"

import * as React from "react"
import { FileText, Share06 } from "@blend-metrics/icons"
import { Button, IconButton } from "@/components/ui"
import { cn } from "@/utils/functions"

export type ProjectDetailsPricingActionsProps = {
  /** Same labeled CTA pattern as `Button` gray outlined + `leftIcon` on contracts / transactions pages */
  applyLabel?: string
  onApply: () => void
  onShare: () => void
  /** Tint icons + label (default: sidebar navy `text-dark-blue-400`; Storybook header uses `text-gray-500` on share only) */
  accentClassName?: string
  className?: string
}

/**
 * Pairing from Storybook (`project-details.stories.tsx` sticky header, `talent-profile*.stories.tsx`):
 * `Button` outlined gray + `IconButton` outlined gray + {@link Share06} at 20px — same glyph as sidebar footer + talent profile header share control (verified vs Share07 in-browser).
 */
export function ProjectDetailsPricingActions({
  applyLabel = "Apply To Join",
  onApply,
  onShare,
  accentClassName = "text-dark-blue-400",
  className,
}: ProjectDetailsPricingActionsProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        size="lg"
        variant="outlined"
        visual="gray"
        className={cn(
          "flex-1 min-w-0 rounded-lg bg-white font-semibold shadow-none hover:bg-gray-50",
          accentClassName
        )}
        leftIcon={
          <FileText className={cn("size-[18px] shrink-0", accentClassName)} />
        }
        onClick={onApply}
      >
        {applyLabel}
      </Button>
      <IconButton
        type="button"
        variant="outlined"
        visual="gray"
        size="lg"
        className={cn(
          "shrink-0 rounded-lg shadow-none",
          accentClassName
        )}
        aria-label="Share this project"
        onClick={onShare}
      >
        <Share06 className="size-[20px]" />
      </IconButton>
    </div>
  )
}
