import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

export const LinkedinSolid1 = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 21 20"
    fill="none"
    className={cn("h-5 w-5", className)}
    {...props}
  >
    <g clipPath="url(#a)">
      <path
        fill="#0076B2"
        d="M19.024 0H1.976A1.46 1.46 0 0 0 .5 1.443V18.56A1.46 1.46 0 0 0 1.975 20h17.05a1.464 1.464 0 0 0 1.475-1.444V1.438A1.463 1.463 0 0 0 19.024 0Z"
      />
      <path
        fill="#fff"
        d="M3.46 7.497h2.97v9.552H3.46V7.497Zm1.486-4.754a1.721 1.721 0 1 1 0 3.442 1.721 1.721 0 0 1 0-3.442Zm3.346 4.754h2.846v1.311h.039c.397-.75 1.364-1.542 2.808-1.542 3.007-.007 3.564 1.972 3.564 4.537v5.246H14.58v-4.647c0-1.107-.02-2.532-1.542-2.532-1.523 0-1.782 1.207-1.782 2.46v4.72H8.292V7.496Z"
      />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M.5 0h20v20H.5z" />
      </clipPath>
    </defs>
  </svg>
)
