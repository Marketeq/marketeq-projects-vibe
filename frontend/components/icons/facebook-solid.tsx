import * as React from "react"
import { SVGProps } from "react"

export const FacebookSolid = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={21}
    height={20}
    fill="none"
    {...props}
  >
    <g clipPath="url(#a)">
      <path
        fill="#1877F2"
        d="M20.5 10c0-5.523-4.477-10-10-10S.5 4.477.5 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988c4.78-.75 8.437-4.887 8.437-9.878Z"
      />
      <path
        fill="#fff"
        d="m14.393 12.89.443-2.89h-2.774V8.124c0-.79.388-1.562 1.63-1.562h1.261v-2.46s-1.144-.196-2.238-.196c-2.284 0-3.777 1.385-3.777 3.89V10h-2.54v2.89h2.54v6.988a10.08 10.08 0 0 0 3.124 0v-6.987h2.33Z"
      />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M.5 0h20v20H.5z" />
      </clipPath>
    </defs>
  </svg>
)
