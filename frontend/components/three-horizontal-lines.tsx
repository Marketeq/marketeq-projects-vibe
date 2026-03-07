import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const ThreeHorizontalLines = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("w-5 h-[14px]", className)}
    viewBox="0 0 20 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M19 7C19 7 13.8007 7 8.33333 7M19 1L1 1M19 13H4.66667"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
