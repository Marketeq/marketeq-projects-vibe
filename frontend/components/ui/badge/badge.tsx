"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-x-1.5 whitespace-nowrap font-medium rounded-full",
  {
    variants: {
      visual: {
        gray: "bg-gray-100 text-gray-700",
        purple: "bg-purple-100 text-purple-700",
        error: "bg-error-100 text-error-700",
        warning: "bg-warning-100 text-warning-700",
        success: "bg-success-100 text-success-700",
        sky: "bg-sky-100 text-sky-700",
        primary: "bg-primary-100 text-primary-700",
        indigo: "bg-indigo-100 text-indigo-700",
        pink: "bg-pink-100 text-pink-700",
        rose: "bg-rose-100 text-rose-700",
        orange: "bg-orange-100 text-orange-700",
      },
      size: {
        sm: "h-[22px] text-xs leading-[18px]",
        md: "h-6 text-sm leading-5",
        lg: "h-7 text-sm leading-5",
      },
      variant: {
        rounded: "py-0.5 px-2",
        circular: "p-1",
      },
    },
    compoundVariants: [
      {
        variant: "rounded",
        size: "md",
        className: "py-0.5 px-2.5",
      },
      {
        variant: "rounded",
        size: "lg",
        className: "py-1 px-3 ",
      },
      {
        variant: "circular",
        size: "md",
        className: "p-1.5",
      },
      {
        variant: "circular",
        size: "lg",
        className: "p-2",
      },
    ],
    defaultVariants: {
      visual: "gray",
      size: "sm",
      variant: "rounded",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  visual,
  size,
  variant,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      className={cn(badgeVariants({ visual, size, variant, className }))}
      {...props}
    />
  )
}

export { Badge }
