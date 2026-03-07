import * as React from "react"
import { cn } from "@/utils/functions"

const StarHalf = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 273 260"
      className={cn(
        "size-4 [--unfilled-path-color:theme(colors.transparent)] [--filled-path-color:theme(colors.primary.500)]",
        className
      )}
      {...props}
    >
      <path
        className="fill-[--filled-path-color]"
        fill="currentColor"
        fillRule="evenodd"
        d="m135.977 214.086-83.848 45.508 17.474-94.365L0 99.156l95.147-12.542 40.83-85.566v213.038Z"
        clipRule="evenodd"
      />
      <path
        className="fill-[var(--unfilled-path-color,transparent)]"
        fill="currentColor"
        fillRule="evenodd"
        d="m135.977 213.039 83.849 45.507-17.474-94.365 69.605-66.073-95.149-12.542L135.977 0v213.039Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export { StarHalf }
