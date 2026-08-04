"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui"

/** Three shimmer rows shown while the category taxonomy is loading. */
export function CategorySkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
      ))}
    </div>
  )
}

/** Shown when the category-service request fails but a retry is possible. */
export function CategoryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-error-500">Couldn&apos;t load categories.</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-medium text-primary-500 hover:underline focus-visible:outline-none"
      >
        Retry
      </button>
    </div>
  )
}

/**
 * Shown instead of the control entirely when the service is down AND
 * react-query has no cached tree to fall back to — there is nothing
 * selectable, so a disabled trigger + tooltip is clearer than an empty list.
 */
export function CategoryUnavailable({ label }: { label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-400"
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent>Categories temporarily unavailable</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
