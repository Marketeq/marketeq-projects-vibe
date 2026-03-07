"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { VariantProps, cva } from "class-variance-authority"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const tooltipContentVariants = cva(
  "z-50 max-w-[320px] text-xs leading-[18px] overflow-hidden rounded-[5px] shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      size: {
        sm: "py-[3px] px-[7px]",
        md: "p-3",
      },
      visual: {
        white: "bg-white text-gray-700",
        gray: "bg-gray-900 text-white",
      },
    },
    defaultVariants: {
      size: "sm",
      visual: "gray",
    },
  }
)

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    VariantProps<typeof tooltipContentVariants>
>(({ className, sideOffset = 4, size, visual, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(tooltipContentVariants({ size, visual, className }))}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const TooltipArrow = TooltipPrimitive.Arrow

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipArrow,
}
