import * as React from "react"
import { cn } from "@/utils/functions"

export const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-gray-200 bg-white shadow-xs transition-all duration-300 ease-out hover:border-gray-300 hover:ring-1 hover:ring-gray-300",
        className
      )}
      {...props}
    />
  )
}
