"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

const HoverCard = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Root>,
  React.ComponentPropsWithRef<typeof HoverCardPrimitive.Root>
>(({ openDelay = 300, ...props }) => (
  <HoverCardPrimitive.Root openDelay={openDelay} {...props} />
))

HoverCard.displayName = HoverCardPrimitive.Root.displayName

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(
  (
    { className, align = "start", side = "left", sideOffset = 6, ...props },
    ref
  ) => (
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-[346px] rounded-lg border border-gray-100 bg-white py-2.5 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50",
        className
      )}
      {...props}
    />
  )
)
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
