import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"

const Gmail = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-[34px] w-[34px]", className)}
    fill="none"
    viewBox="0 0 34 34"
    {...props}
  >
    <g filter="url(#a)">
      <path
        fill="#EA4335"
        d="m23.075 9.494-6.01 4.69-6.149-4.69v.001l.008.007v6.568l6.071 4.792 6.08-4.607v-6.76Z"
      />
      <path
        fill="#FBBC05"
        d="m24.653 8.353-1.578 1.14v6.762l4.967-3.814v-2.297s-.603-3.28-3.389-1.791Z"
      />
      <path
        fill="#34A853"
        d="M23.075 16.255v8.769h3.807s1.083-.112 1.16-1.347V12.441l-4.967 3.814Z"
      />
      <path
        fill="#C5221F"
        d="M10.924 25.032V16.07l-.008-.006.008 8.968ZM10.916 9.495l-1.57-1.134c-2.785-1.49-3.389 1.79-3.389 1.79v2.297l4.96 3.616V9.495Z"
      />
      <path fill="#C5221F" d="M10.916 9.495v6.568l.008.007V9.5l-.008-.006Z" />
      <path
        fill="#4285F4"
        d="M5.957 12.45v11.235a1.355 1.355 0 0 0 1.161 1.347h3.807l-.009-8.968-4.959-3.615Z"
      />
    </g>
    <defs>
      <filter
        id="a"
        width={36.125}
        height={36.125}
        x={-1.063}
        y={-0.063}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={1} />
        <feGaussianBlur stdDeviation={1} />
        <feColorMatrix values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.05 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_408_20270"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_408_20270"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
)

export { Gmail }
