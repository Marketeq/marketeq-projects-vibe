import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

const GripVertical2 = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-3.5", className)}
    xmlns="http://www.w3.org/2000/svg"
    width={14}
    height={14}
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M5.544 2.917a1.167 1.167 0 1 1-2.333 0 1.167 1.167 0 0 1 2.333 0Zm-1.166 5.25a1.167 1.167 0 1 0 0-2.334 1.167 1.167 0 0 0 0 2.334Zm0 4.083a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Zm6.416-9.333a1.167 1.167 0 1 1-2.333 0 1.167 1.167 0 0 1 2.333 0Zm-1.166 5.25a1.167 1.167 0 1 0 0-2.334 1.167 1.167 0 0 0 0 2.334Zm0 4.083a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Z"
      clipRule="evenodd"
      opacity={0.5}
    />
  </svg>
)

export { GripVertical2 }
