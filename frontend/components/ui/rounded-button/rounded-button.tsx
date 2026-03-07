"use client"

import React from "react"
import { cn } from "@/utils/functions"
import { VariantProps, cva } from "class-variance-authority"

const roundedButtonVariants = cva(
  "rounded-full focus:outline-none inline-flex text-gray-500 border-gray-300 items-center justify-center flex-none",
  {
    variants: {
      variant: {
        primary: "border-2 bg-gray-100 hover:bg-white",
        secondary: "border bg-white hover:ring-1 hover:ring-gray-300",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-[41px] w-[41px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

interface RoundedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof roundedButtonVariants> {}

const RoundedButton = ({
  className,
  variant,
  size,
  ...props
}: RoundedButtonProps) => {
  return (
    <button
      className={cn(roundedButtonVariants({ className, variant, size }))}
      {...props}
    />
  )
}

export { RoundedButton }
