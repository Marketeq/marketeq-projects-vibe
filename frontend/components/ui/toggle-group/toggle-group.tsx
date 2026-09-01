import React from "react"
import { cn } from "@/utils/functions"
import { ToggleGroup } from "@ark-ui/react"

export const ToggleGroupRoot = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroup.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroup.Root
    className={cn(
      "inline-flex items-center overflow-hidden rounded-[5px] border border-gray-200 bg-white",
      className
    )}
    {...props}
    ref={ref}
  />
))

ToggleGroupRoot.displayName = "ToggleGroup"

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroup.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroup.Item
    className={cn(
      "inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-x-2 rounded-none bg-gray-100 px-3 text-sm font-semibold leading-5 text-gray-500 transition duration-300 focus-visible:outline-none data-[state=on]:bg-white data-[state=on]:text-dark-blue-400",
      className
    )}
    {...props}
    ref={ref}
  />
))

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup }
