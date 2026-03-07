"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { getValidChildren } from "@/utils/react-utils"
import { Badge } from "../badge"

interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  excessClassName?: string
}

const BadgeGroup = React.forwardRef<HTMLDivElement, BadgeGroupProps>(
  ({ className, children, max = 3, excessClassName, ...props }, ref) => {
    const validChildren = getValidChildren(children)

    const totalChildren = validChildren.length
    const excess = totalChildren > max ? totalChildren - max : 0

    const childrenWithinMax =
      max != null ? validChildren.slice(0, max) : validChildren
    const reversedChildren = childrenWithinMax.reverse()

    return (
      <div
        className={cn(
          "inline-flex items-center justify-center space-x-1",
          className
        )}
        {...props}
        ref={ref}
      >
        {reversedChildren}
        {excess !== 0 && <Badge className={excessClassName}>{excess}+</Badge>}
      </div>
    )
  }
)

BadgeGroup.displayName = "BadgeGroup"

export { BadgeGroup }
