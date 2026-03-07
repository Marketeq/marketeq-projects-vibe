import React from "react"
import { cn } from "@/utils/functions"
import {
  ClipboardControlProps,
  ClipboardIndicatorProps,
  ClipboardInputProps,
  ClipboardLabelProps,
  Clipboard as ClipboardPrimitives,
  ClipboardRootProps,
  ClipboardTriggerProps,
} from "@ark-ui/react"
import { inputVariants } from "../input"
import { labelVariants } from "../label"

export const ClipboardRoot = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Root>,
  ClipboardRootProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Root
    ref={ref}
    className={cn("flex flex-col gap-y-1.5", className)}
    {...props}
  />
))

ClipboardRoot.displayName = ClipboardPrimitives.Root.displayName

export const ClipboardLabel = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Label>,
  ClipboardLabelProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Label
    ref={ref}
    className={cn(
      labelVariants({ className: "text-dark-blue-400" }),
      className
    )}
    {...props}
  />
))

ClipboardLabel.displayName = ClipboardPrimitives.Label.displayName

export const ClipboardControl = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Input>,
  ClipboardControlProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Control
    ref={ref}
    className={cn("relative", className)}
    {...props}
  />
))

ClipboardControl.displayName = ClipboardPrimitives.Control.displayName

export const ClipboardInput = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Input>,
  ClipboardInputProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Input
    ref={ref}
    className={cn(
      inputVariants({ className: "pl-3.5 pr-[129px] text-gray-500" }),
      className
    )}
    {...props}
  />
))

ClipboardInput.displayName = ClipboardPrimitives.Input.displayName

export const ClipboardTrigger = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Trigger>,
  ClipboardTriggerProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Trigger
    ref={ref}
    type="button"
    className={cn(
      "group/trigger absolute inset-y-0 right-0 inline-block pr-3.5",
      className
    )}
    {...props}
  />
))

ClipboardTrigger.displayName = ClipboardPrimitives.Trigger.displayName

export const ClipboardIndicator = React.forwardRef<
  React.ElementRef<typeof ClipboardPrimitives.Indicator>,
  ClipboardIndicatorProps
>(({ className, ...props }, ref) => (
  <ClipboardPrimitives.Indicator
    ref={ref}
    className={cn(
      "group-data-[copied]/trigger:text-success-500 inline-flex items-center justify-center text-sm font-semibold leading-5 text-primary-500 gap-x-2",
      className
    )}
    {...props}
  />
))

ClipboardIndicator.displayName = ClipboardPrimitives.Indicator.displayName
