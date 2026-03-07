import React from "react"
import { cn } from "@/utils/functions"

export const List = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M19.25 12.3125L5.75 12.3125M19.25 7.8125L5.75 7.8125M19.25 16.8125L5.75 16.8125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
