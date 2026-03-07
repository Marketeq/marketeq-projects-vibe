"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Check } from "@blend-metrics/icons"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { VariantProps, cva } from "class-variance-authority"

const checkboxSelectorVariants = cva(
  "group flex items-center gap-x-5 rounded-[7px] border border-gray-200 text-left data-[state=checked]:border-primary-500 data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 data-[state=checked]:hover:border-primary-500 data-[state=checked]:hover:ring-primary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50 disabled:data-[state=checked]:border-gray-200 disabled:data-[state=checked]:ring-0 disabled:hover:border-gray-200 disabled:hover:ring-0",
  {
    variants: {
      size: {
        sm: "px-5 py-2",
        md: "px-5 py-2.5",
        lg: "px-[22px] py-3",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

const checkboxVariants = cva(
  "inline-flex flex-none items-center justify-center rounded-[5px] border-[1.5px] border-gray-300 text-white group-hover:border-primary-400 group-hover:ring group-hover:ring-primary-50 group-focus:ring group-focus:ring-primary-50 group-disabled:border-gray-200 group-disabled:text-gray-200 group-disabled:group-hover:border-gray-200 group-disabled:group-hover:ring-0 group-data-[state=checked]:border-primary-500 group-data-[state=checked]:bg-primary-500 group-disabled:group-data-[state=checked]:border-gray-200 group-disabled:group-data-[state=checked]:bg-gray-50",
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

const iconVariants = cva("", {
  variants: {
    size: {
      sm: "h-3 w-3",
      md: "h-[14px] w-[14px]",
      lg: "h-4 w-4",
    },
  },
  defaultVariants: {
    size: "sm",
  },
})

export const CheckboxSelector = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
    VariantProps<typeof checkboxSelectorVariants> & {
      contentClassName?: string
      iconClassName?: string
      left?: () => React.ReactNode
    }
>(
  (
    {
      children,
      className,
      size,
      contentClassName,
      iconClassName,
      left,
      ...props
    },
    ref
  ) => (
    <CheckboxPrimitive.Root
      className={cn(checkboxSelectorVariants({ size, className }))}
      {...props}
      ref={ref}
    >
      {left && <span className="block">{left()}</span>}
      <span
        className={cn(checkboxVariants({ size, className: contentClassName }))}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check
            className={cn(iconVariants({ size, className: iconClassName }))}
          />
        </CheckboxPrimitive.Indicator>
      </span>
      <span className="block">{children}</span>
    </CheckboxPrimitive.Root>
  )
)

CheckboxSelector.displayName = "CheckboxSelector"
