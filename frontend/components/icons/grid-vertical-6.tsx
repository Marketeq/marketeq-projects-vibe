import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

const GridVertical6 = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-3.5", className)}
    fill="none"
    viewBox="0 0 15 14"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M6.042 2.917a1.167 1.167 0 1 1-2.333 0 1.167 1.167 0 0 1 2.333 0Zm-1.166 5.25a1.167 1.167 0 1 0 0-2.334 1.167 1.167 0 0 0 0 2.334Zm0 4.083a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Zm6.416-9.333a1.167 1.167 0 1 1-2.333 0 1.167 1.167 0 0 1 2.333 0Zm-1.166 5.25a1.167 1.167 0 1 0 0-2.334 1.167 1.167 0 0 0 0 2.334Zm0 4.083a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Z"
      clipRule="evenodd"
      opacity={0.5}
    />
  </svg>
)
export { GridVertical6 }
