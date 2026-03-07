import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const Network = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-4", className)}
    fill="none"
    {...props}
  >
    <path
      stroke="#D0D5DD"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4.977 13.333v-1.815M7.703 13.334v-4.54M10.422 13.333V6.07M13.148 13.333V2.666"
    />
  </svg>
)
