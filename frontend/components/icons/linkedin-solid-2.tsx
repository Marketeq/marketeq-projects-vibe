import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const LinkedinSolid2 = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-4", className)}
    viewBox="0 0 17 16"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M15.477 9.509v5.158h-2.991V9.854c0-1.21-.433-2.034-1.515-2.034-.826 0-1.319.556-1.535 1.094-.079.192-.099.46-.099.729v5.024H6.345s.04-8.151 0-8.996h2.992v1.275l-.02.03h.02v-.03c.397-.612 1.107-1.487 2.696-1.487 1.968 0 3.444 1.287 3.444 4.05ZM3.216 1.334c-1.023 0-1.693.671-1.693 1.554 0 .863.65 1.555 1.654 1.555h.02c1.043 0 1.691-.692 1.691-1.555-.018-.883-.648-1.554-1.672-1.554ZM1.7 14.667h2.99V5.671h-2.99v8.996Z"
    />
  </svg>
)
