"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Circle } from "@blend-metrics/icons"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { VariantProps, cva } from "class-variance-authority"

const radioGroupItemVariants = cva(
  "peer inline-flex flex-none items-center justify-center rounded-full border-[1.5px] border-gray-300 hover:border-primary-400 hover:ring hover:ring-primary-50 focus:ring focus:ring-primary-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-200 hover:disabled:ring-0 hover:disabled:ring-offset-0 data-[state=checked]:border-primary-500 data-[state=checked]:text-primary-500 hover:data-[state=checked]:border-primary-500 data-[state=checked]:disabled:border-gray-200 data-[state=checked]:disabled:bg-gray-50 data-[state=checked]:disabled:text-gray-200",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

const iconVariants = cva("fill-current shrink-0 text-current", {
  variants: {
    size: {
      sm: "h-1.5 w-1.5",
      md: "h-2 w-2",
      lg: "h-2.5 w-2.5",
    },
  },
  defaultVariants: {
    size: "sm",
  },
})

interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioGroupItemVariants> {}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, children, size, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(radioGroupItemVariants({ size, className }))}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className={iconVariants({ size })} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-y-2.5", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const HeadlessRadioGroupItem = RadioGroupPrimitive.Item

export { RadioGroup, RadioGroupItem, HeadlessRadioGroupItem }
