import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

const LinkedinSolid = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("h-4 w-4 text-[#0077B5]", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.429 0A3.429 3.429 0 0 0 0 3.429V20.57A3.429 3.429 0 0 0 3.429 24H20.57A3.429 3.429 0 0 0 24 20.571V3.43A3.428 3.428 0 0 0 20.571 0H3.43Zm1.889 7.366a2.049 2.049 0 1 0 0-4.097 2.049 2.049 0 0 0 0 4.097Zm1.714 12.885V8.973H3.603V20.25h3.429ZM9.309 8.973h3.428v1.51c.506-.792 1.617-1.858 3.682-1.858 2.466 0 3.804 1.633 3.804 4.741 0 .15.014.83.014.83v6.053H16.81v-6.051c0-.832-.175-2.465-2.023-2.465-1.85 0-2.006 2.053-2.049 3.397v5.12H9.31V8.972Z"
        fill="currentColor"
      />
    </svg>
  )
}

export { LinkedinSolid }
