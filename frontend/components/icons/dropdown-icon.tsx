import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const DropdownIcon = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-4", className)}
    viewBox="0 0 25 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M21.5 6h-8m-7 14V4m0 16-3-3m3 3 3-3m10.4-6.733h-6.4m2.133 4.266H13.5"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
