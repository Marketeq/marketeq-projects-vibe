"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as LabelPrimitive from "@radix-ui/react-label"
import { VariantProps, cva } from "class-variance-authority"

export const labelVariants = cva(
  "block text-gray-800 font-medium cursor-pointer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        xs: "text-xs leading-[18px]",
        sm: "text-sm",
        md: "text-base",
        lg: "text-[18px] leading-7",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ size, className }))}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
