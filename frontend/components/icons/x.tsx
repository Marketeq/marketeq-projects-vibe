import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const XIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
    viewBox="0 0 20 21"
    fill="none"
    {...props}
  >
    <path
      fill="#000"
      d="M15.75 1.777h3.067l-6.7 7.659L20 19.855h-6.172l-4.833-6.32-5.532 6.32H.395l7.167-8.192L0 1.778h6.328l4.37 5.777 5.053-5.778ZM14.676 18.02h1.7L5.404 3.517H3.582L14.675 18.02Z"
    />
  </svg>
)
