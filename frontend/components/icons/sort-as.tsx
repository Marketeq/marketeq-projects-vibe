import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const SortAs = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-6", className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M21 6H13M6 20L6 4M6 20L3 17M6 20L9 17M19.4 10.2667H13M15.1333 14.5333H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
