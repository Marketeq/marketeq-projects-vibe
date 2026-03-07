import * as React from "react"
import { cn } from "@/utils/functions"
import {
  RatingGroup,
  RatingGroupControlProps,
  RatingGroupItemProps,
  RatingGroupLabelProps,
  RatingGroupRootProps,
} from "@ark-ui/react"
import { VariantProps } from "class-variance-authority"
import { labelVariants } from "../label"

const RatingGroupRoot = React.forwardRef<
  React.ElementRef<typeof RatingGroup.Root>,
  RatingGroupRootProps
>(({ className, ...props }, ref) => (
  <RatingGroup.Root
    className={cn("flex flex-col gap-y-1.5", className)}
    {...props}
    ref={ref}
  />
))

RatingGroupRoot.displayName = "RatingGroupRoot"

const RatingGroupLabel = React.forwardRef<
  React.ElementRef<typeof RatingGroup.Label>,
  RatingGroupLabelProps & VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <RatingGroup.Label
    className={cn(labelVariants({ className, size }))}
    {...props}
    ref={ref}
  />
))

RatingGroupLabel.displayName = "RatingGroupLabel"

const RatingGroupControl = React.forwardRef<
  React.ElementRef<typeof RatingGroup.Control>,
  RatingGroupControlProps
>(({ className, ...props }, ref) => (
  <RatingGroup.Control
    className={cn("flex items-center gap-x-0.5", className)}
    {...props}
    ref={ref}
  />
))

RatingGroupControl.displayName = "RatingGroupControl"

const RatingGroupContext = RatingGroup.Context

const RatingGroupItem = React.forwardRef<
  React.ElementRef<typeof RatingGroup.Item>,
  RatingGroupItemProps
>(({ className, ...props }, ref) => (
  <RatingGroup.Item
    className={cn(
      "inline-block focus-visible:outline-none shrink-0 [&_svg]:size-[18px] [&_svg]:fill-transparent [&_svg]:text-primary-500 [&_svg]:data-[highlighted]:fill-primary-500",
      className
    )}
    {...props}
    ref={ref}
  />
))

RatingGroupItem.displayName = "RatingGroupItem"

const RatingGroupItemContext = RatingGroup.ItemContext

const RatingGroupHiddenInput = RatingGroup.HiddenInput

export {
  RatingGroupRoot,
  RatingGroupLabel,
  RatingGroupControl,
  RatingGroupItem,
  RatingGroupContext,
  RatingGroupItemContext,
  RatingGroupHiddenInput,
}
