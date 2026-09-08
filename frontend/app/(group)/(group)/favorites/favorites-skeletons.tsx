"use client"

/**
 * Loading skeletons for the favorites screens.
 *
 * Uses the gradient shimmer the rest of the app loads with — a gray-100 block
 * with `animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100`
 * sweeping across it — instead of a flat pulse, and mirrors the real card's
 * shape so nothing jumps when the data lands.
 */

const Shimmer = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

/** Matches the grid listing card: media well, title row, meta lines, footer. */
export const FavoriteCardSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
    <Shimmer className="h-[140px] rounded-[6px]" />
    <div className="mt-3 flex items-start gap-x-3">
      <Shimmer className="h-4 flex-auto rounded" />
      <Shimmer className="h-4 w-12 shrink-0 rounded" />
    </div>
    <Shimmer className="mt-3 h-3 w-full rounded" />
    <Shimmer className="mt-1.5 h-3 w-3/4 rounded" />
    <div className="mt-[14px] flex flex-col gap-y-3">
      <Shimmer className="h-3.5 w-40 rounded" />
      <Shimmer className="h-3.5 w-32 rounded" />
    </div>
    <div className="mt-5 flex items-end justify-between">
      <Shimmer className="h-8 w-28 rounded-full" />
      <Shimmer className="h-5 w-5 rounded" />
    </div>
  </div>
)

/** Matches the list listing card: 284px media on the left, content right. */
export const FavoriteListCardSkeleton = () => (
  <div className="flex w-full items-start overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
    <Shimmer className="h-[150px] w-[284px] shrink-0 self-stretch" />
    <div className="flex min-w-0 flex-1 flex-col gap-y-5 p-5">
      <div className="flex flex-col gap-y-3.5">
        <div className="flex items-start gap-x-6">
          <div className="flex min-w-0 flex-1 flex-col gap-y-3">
            <Shimmer className="h-4 w-64 rounded" />
            <Shimmer className="h-3 w-full rounded" />
          </div>
          <Shimmer className="h-5 w-5 shrink-0 rounded" />
        </div>
        <Shimmer className="h-8 w-28 rounded-full" />
      </div>
      <div className="flex items-end justify-between gap-x-6">
        <div className="flex items-center gap-x-6">
          <Shimmer className="h-3.5 w-40 rounded" />
          <Shimmer className="h-3.5 w-32 rounded" />
        </div>
        <Shimmer className="h-3.5 w-16 rounded" />
      </div>
    </div>
  </div>
)

/** Matches a group card on the groups index (ProjectGroupCard). */
export const FavoriteGroupCardSkeleton = () => (
  <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
    <Shimmer className="h-[163px] lg:h-[222px] rounded-t-lg" />
    <div className="relative pt-[30px] lg:pt-[47px] p-5 lg:p-[25px]">
      <Shimmer className="size-11 lg:size-[61px] rounded-full absolute -top-[22px] lg:-top-[30.5px] left-1/2 -translate-x-1/2" />
      <Shimmer className="h-4 w-28 rounded mx-auto" />
      <Shimmer className="mt-2 h-3 w-20 rounded mx-auto" />
    </div>
  </div>
)
