"use client"

import * as React from "react"
import { getSize } from "@/utils/dom-utils"
import { cn, computeCircumference, computePercentage } from "@/utils/functions"
import { useIsomorphicLayoutEffect } from "@/utils/hooks"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value?: number
    bubble?: boolean
    indicatorClassName?: string
  }
>(
  (
    { className, value = 0, bubble = true, indicatorClassName, ...props },
    ref
  ) => {
    const indicatorRef =
      React.useRef<React.ElementRef<typeof ProgressPrimitive.Indicator>>(null)
    const contentRef =
      React.useRef<React.ElementRef<typeof TooltipContent>>(null)
    const [alignOffset, setAlignOffset] = React.useState<number>()

    useIsomorphicLayoutEffect(() => {
      const indicator = indicatorRef.current

      if (!indicator) return

      const { width } = getSize(indicator)
      const offset = computePercentage(width, value)
      setAlignOffset(offset)
    }, [value])

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ProgressPrimitive.Root
              ref={ref}
              className={cn(
                "relative h-2 w-full overflow-hidden rounded-full bg-gray-100",
                className
              )}
              {...props}
            >
              <ProgressPrimitive.Indicator
                className={cn(
                  "h-full w-full flex-1 rounded-r-full bg-primary-500 transition-all duration-500",
                  indicatorClassName
                )}
                style={{ transform: `translateX(-${100 - value}%)` }}
                ref={indicatorRef}
              />
            </ProgressPrimitive.Root>
          </TooltipTrigger>
          <TooltipContent
            ref={contentRef}
            className={cn(
              "relative overflow-visible px-3 py-2 text-xs font-semibold leading-[18px] shadow-lg after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-3 after:w-3 after:-rotate-45 after:rounded-[1.5px] after:bg-white",
              bubble ? "after:content-['']" : "after:content-none"
            )}
            alignOffset={alignOffset}
            visual="white"
            align="start"
            side="top"
          >
            {value}%
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
Progress.displayName = ProgressPrimitive.Root.displayName

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  strokeWidth?: number
  value?: number
  trackClassName?: string
  show?: boolean
}

const CircularProgress = React.forwardRef<
  HTMLDivElement,
  CircularProgressProps
>(
  (
    {
      size = 58,
      value = 0,
      strokeWidth = 8,
      className,
      trackClassName,
      show = true,
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2
    const circumference = computeCircumference(radius)
    const strokeDashArray = `${computePercentage(circumference, value)} ${
      circumference - computePercentage(circumference, value)
    }`
    const offset = circumference / 4

    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 text-center text-sm font-medium text-gray-900",
          className
        )}
        {...props}
        ref={ref}
      >
        <svg width={size} height={size}>
          <circle
            className={cn("fill-none stroke-gray-200", trackClassName)}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="fill-none stroke-primary-500 transition-[stroke,stroke-dasharray] duration-500"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            opacity={value === 0 ? 0 : undefined}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDashArray}
            strokeDashoffset={offset}
          />
        </svg>
        {/* {show && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {value}%
          </span>
        )} */}
      </div>
    )
  }
)

CircularProgress.displayName = "CircularProgress"

export { CircularProgress, Progress }
