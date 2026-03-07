import React from "react"
import { cn } from "@/utils/functions"

export const Grid = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.25 12.3125L5.25 12.3125M7.25 7.8125L5.25 7.8125M7.25 16.8125L5.25 16.8125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 12.3125L11 12.3125M13 7.8125L11 7.8125M13 16.8125L11 16.8125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.75 12.3125L16.75 12.3125M18.75 7.8125L16.75 7.8125M18.75 16.8125L16.75 16.8125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
