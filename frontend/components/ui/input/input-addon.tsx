"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

export const InputLeftAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "inline-flex h-11 items-center rounded-l-lg border-y border-l border-gray-300 py-2.5 pl-[14px] pr-3 text-sm text-gray-500",
      className
    )}
    ref={ref}
    {...props}
  />
))
;(InputLeftAddon as any).id = "InputLeftAddon"

InputLeftAddon.displayName = "InputLeftAddon"

export const InputRightAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "inline-flex h-11 items-center rounded-r-lg border-y border-r border-gray-300 py-2.5 pl-[14px] pr-3 text-sm text-gray-500",
      className
    )}
    ref={ref}
    {...props}
  />
))
;(InputRightAddon as any).id = "InputRightAddon"

InputRightAddon.displayName = "InputRightAddon"
