import { cn } from "@/utils/functions"

/**
 * Dollar amount scale used by My Earnings on /talent-dashboard:
 * $ = text-xl, whole = text-2xl, cents = text-sm, items-center.
 */
export function DashboardAmount({
  whole,
  cents,
  symbol = "$",
  sign = "",
  muted = false,
  className,
}: {
  whole: string
  cents?: string | null
  symbol?: string
  sign?: string
  muted?: boolean
  className?: string
}) {
  const wholeColor = muted ? "text-[#667085]" : "text-dark-blue-400"
  const symbolColor = muted ? "text-[#98A2B3]" : "text-dark-blue-400/50"
  const centsColor = muted ? "text-[#667085]" : "text-dark-blue-400"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-x-0.5 whitespace-nowrap tabular-nums",
        className
      )}
    >
      {sign ? (
        <span
          className={cn(
            "text-2xl leading-[29.05px] font-semibold",
            wholeColor
          )}
        >
          {sign}
        </span>
      ) : null}
      <span className={cn("text-xl leading-6", symbolColor)}>{symbol}</span>
      <span
        className={cn("text-2xl leading-[29.05px] font-semibold", wholeColor)}
      >
        {whole}
        {cents != null && cents !== "" ? (
          <span className={cn("text-sm leading-[16.94px]", centsColor)}>
            .{cents}
          </span>
        ) : null}
      </span>
    </span>
  )
}
