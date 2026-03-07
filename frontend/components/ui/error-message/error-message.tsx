"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { VariantProps, cva } from "class-variance-authority"

const errorMessageVariants = cva(
  "block text-error-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
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

export const ErrorMessage = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> &
    VariantProps<typeof errorMessageVariants>
>(({ className, size, ...props }, ref) => (
  <span
    className={cn(errorMessageVariants({ size, className }))}
    {...props}
    ref={ref}
  />
))

ErrorMessage.displayName = "ErrorMessage"
