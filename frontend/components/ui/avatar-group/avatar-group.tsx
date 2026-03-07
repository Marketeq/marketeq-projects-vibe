"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { getValidChildren } from "@/utils/react-utils"
import { VariantProps, cva } from "class-variance-authority"

export const AvatarRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("inline-flex items-center gap-x-2", className)}
    ref={ref}
    {...props}
  />
))

AvatarRoot.displayName = "AvatarRoot"

const avatarGroupVariants = cva(
  "inline-flex cursor-pointer items-center justify-center",
  {
    variants: {
      size: {
        xs: "-space-x-1",
        sm: "-space-x-1.5",
        md: "-space-x-2",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

const excessVariants = cva(
  "relative inline-flex items-center flex-none justify-center rounded-full font-medium bg-white border-2 border-primary-500 text-primary-500",
  {
    variants: {
      size: {
        xs: "text-[11px] leading-5 h-6 w-6",
        sm: "text-sm h-8 w-8",
        md: "text-base leading-5 h-10 w-10",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

interface AvatarGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarGroupVariants> {
  max?: number
  excessClassName?: string
  excess?: boolean
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    { className, children, max = 5, size, excessClassName, excess, ...props },
    ref
  ) => {
    const validChildren = getValidChildren(children)

    const totalChildren = validChildren.length
    const extra = totalChildren > max ? totalChildren - max : 0

    const childrenWithinMax =
      max != null ? validChildren.slice(0, max) : validChildren
    const reversedChildren = childrenWithinMax.reverse()

    return (
      <div
        className={cn(avatarGroupVariants({ size, className }))}
        {...props}
        ref={ref}
      >
        {reversedChildren}
        {excess && extra !== 0 && (
          <span
            className={cn(excessVariants({ size, className: excessClassName }))}
          >
            +{extra}
          </span>
        )}
      </div>
    )
  }
)

AvatarGroup.displayName = "AvatarGroup"

const avatarGroupButtonVariants = cva(
  "border border-gray-300 border-dashed active:text-gray-400 disabled:active:text-gray-200 cursor-pointer text-gray-400 hover:text-gray-500 disabled:hover:text-gray-200 active:ring-4 disabled:border-gray-200 disabled:bg-gray-50 disabled:active:ring-0 disabled:text-gray-200 active:ring-gray-100 rounded-full focus-visible:outline-none bg-white inline-flex flex-none items-center justify-center",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

export const AvatarGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof avatarGroupButtonVariants>
>(({ className, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(avatarGroupButtonVariants({ className, size }))}
    {...props}
  />
))

AvatarGroupButton.displayName = "AvatarGroupButton"

export { AvatarGroup }
