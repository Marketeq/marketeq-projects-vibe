"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { VariantProps, cva } from "class-variance-authority"

const helperTextVariants = cva(
  "block text-gray-500 font-normal peer-disabled:opacity-50",
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

interface HelperTextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof helperTextVariants> {}

const HelperText = React.forwardRef<HTMLSpanElement, HelperTextProps>(
  ({ className, size, ...props }, ref) => (
    <span
      className={cn(helperTextVariants({ size, className }))}
      ref={ref}
      {...props}
    />
  )
)

HelperText.displayName = "HelperText"

export { HelperText }
