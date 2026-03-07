import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

const Arrow = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("w-[32px] h-5", className)}
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.9227 14.5L16 0.795396L27.0773 14.5L4.9227 14.5Z"
        fill="white"
        stroke="#EAECF0"
      />
      <rect
        x={32}
        y={18}
        width={32}
        height={4}
        transform="rotate(-180 32 18)"
        fill="white"
      />
    </svg>
  )
}

export { Arrow }
