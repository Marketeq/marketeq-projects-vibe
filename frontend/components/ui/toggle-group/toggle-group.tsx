import React from "react"
import { cn } from "@/utils/functions"
import { ToggleGroup } from "@ark-ui/react"

export const ToggleGroupRoot = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroup.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroup.Root
    className={cn(
      "flex items-center border gap-x-1 p-1 border-gray-200 bg-gray-100 rounded-lg",
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
      "h-9 text-sm transition duration-300 leading-5 px-3 font-semibold focus-visible:outline-none shrink-0 inline-flex items-center gap-x-2 justify-center text-gray-500 data-[focus]:bg-white data-[state=on]:shadow-[0px_1px_2px_0px_rgba(16,24,40,.06)_0px_1px_3px_0px_rgba(16,24,40,.1)] py-3 rounded-md data-[state=on]:bg-white",
      className
    )}
    {...props}
    ref={ref}
  />
))

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup }
