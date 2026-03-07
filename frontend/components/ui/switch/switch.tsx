"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { type VariantProps, cva } from "class-variance-authority"

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus:ring-2 focus:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-50 data-[state=checked]:disabled:bg-gray-200",
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-[52px]",
      },
      visual: {
        blue: "bg-gray-200 hover:bg-primary-100 focus:ring-primary-50 focus:ring-offset-primary-50 data-[state=checked]:bg-primary-500 data-[state=checked]:hover:bg-primary-500",
        gray: "bg-gray-100 hover:bg-gray-200 focus:ring-gray-100 focus:ring-offset-gray-100 data-[state=checked]:bg-gray-300 data-[state=checked]:hover:bg-gray-300",
      },
    },
    defaultVariants: {
      size: "sm",
      visual: "blue",
    },
  }
)

const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-sm transition-transform data-unchecked:translate-x-0",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
    },
    compoundVariants: [
      {
        size: "sm",
        className: "data-[state=checked]:translate-x-4",
      },
      {
        size: "md",
        className: "data-[state=checked]:translate-x-5",
      },
      {
        size: "lg",
        className: "data-[state=checked]:translate-x-6",
      },
    ],
    defaultVariants: {
      size: "sm",
    },
  }
)

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, visual, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      className={cn(switchVariants({ size, visual, className }))}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className={thumbVariants({ size })} />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
