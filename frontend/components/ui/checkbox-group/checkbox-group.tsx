"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

const CheckboxGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div className={cn("space-y-2.5", className)} {...props} ref={ref} />
})

CheckboxGroup.displayName = "CheckboxGroup"

export { CheckboxGroup }
