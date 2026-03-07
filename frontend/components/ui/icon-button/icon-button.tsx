"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 whitespace-nowrap gap-x-2 rounded-[5px] font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      visual: {
        primary: "",
        error: "",
        gray: "",
      },
      variant: {
        filled: "",
        light: "",
        outlined: "border",
        ghost: "",
      },
      size: {
        sm: "text-sm w-9 h-9",
        md: "text-sm w-10 h-10",
        lg: "text-base h-11 w-11",
        xl: "text-base h-11 w-12",
        "2xl": "text-lg leading-7 h-[60px]",
      },
    },
    compoundVariants: [
      {
        variant: "filled",
        className: "shadow-xs",
      },
      {
        variant: "outlined",
        className: "shadow-xs",
      },
      {
        visual: "primary",
        variant: "filled",
        className:
          "text-white bg-primary-500 active:ring-4 hover:bg-primary-600 active:ring-primary-100",
      },
      {
        visual: "primary",
        variant: "light",
        className:
          "text-primary-500 bg-primary-50 active:ring-4 hover:bg-primary-100 active:ring-primary-25",
      },

      {
        visual: "primary",
        variant: "ghost",
        className:
          "text-primary-500 hover:bg-primary-50 focus:bg-primary-100 focus:text-primary-700",
      },
      {
        visual: "error",
        variant: "filled",
        className:
          "text-white bg-error-500 active:ring-4 active:ring-error-200 hover:bg-error-600",
      },
      {
        visual: "error",
        variant: "light",
        className:
          "text-error-500 bg-error-50 hover:bg-error-100 focus:ring-error-100",
      },
      {
        visual: "error",
        variant: "outlined",
        className:
          "border-error-300 text-error-500 hover:bg-red-50 active:ring-4 active:ring-error-25",
      },
      {
        visual: "error",
        variant: "ghost",
        className:
          "text-error-500 hover:bg-error-50 focus:text-error-700 focus:bg-error-100",
      },
      {
        visual: "gray",
        variant: "outlined",
        className:
          "text-gray-800 border-gray-300 hover:bg-gray-50 focus:bg-gray-50",
      },
      {
        visual: "gray",
        variant: "ghost",
        className: "text-gray-800 hover:bg-gray-100 focus:bg-gray-200",
      },
      {
        size: "2xl",
        className: "gap-x-3",
      },
    ],
    defaultVariants: {
      variant: "filled",
      size: "sm",
      visual: "primary",
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant, size, visual, children, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(iconButtonVariants({ size, variant, visual, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
