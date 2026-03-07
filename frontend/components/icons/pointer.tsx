import * as React from "react"
import { cn } from "@/utils/functions"

const Pointer = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-6", className)}
    fill="none"
    viewBox="0 0 23 23"
    {...props}
  >
    <path
      fill="#306CFE"
      fillOpacity={0.5}
      stroke="#306CFE"
      d="M11.595 2.72c-2.3-2.383-6.31-1.485-7.17 1.606L.745 17.563c-.779 2.8 1.85 5.48 4.762 4.828 1.208-.27 2.144-1.18 3.12-2.19 1.48-1.529 3.647-2.05 5.729-1.388l.137.044c1.458.465 2.803.894 4.083.607l.473-.106c3.166-.709 4.258-4.51 1.99-6.858l-9.444-9.78Z"
    />
  </svg>
)

export { Pointer }
