import * as React from "react"
import { SVGProps } from "react"
import { cn } from "@/utils/functions"
import { Toggle } from "./ui"

const ThumbsUpToggle = ({
  className,
  indicatorClassName,
  pressed,
  onPressedChange,
  ...props
}: SVGProps<SVGSVGElement> & {
  indicatorClassName?: string
  pressed?: boolean
  onPressedChange?: (open: boolean) => void
}) => (
  <Toggle
    pressed={pressed}
    onPressedChange={onPressedChange}
    className={cn(
      "group focus-visible:outline-none transition duration-300 shrink-0 [--path-color:theme(colors.dark-blue.400)]",
      className
    )}
  >
    <svg
      className={cn("size-[18px]", indicatorClassName)}
      viewBox="0 0 18 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        className={cn(
          "fill-white group-data-[state=on]:fill-[color:--path-color]"
        )}
        d="M5.25 17.1367H13.0697C14.1802 17.1367 15.1247 16.3265 15.2935 15.2288L16.1012 9.97885C16.3109 8.61589 15.2564 7.38672 13.8774 7.38672H11.25C10.8358 7.38672 10.5 7.05093 10.5 6.63672V3.9861C10.5 2.96471 9.67201 2.13672 8.65062 2.13672C8.407 2.13672 8.18624 2.28019 8.08729 2.50281L5.44795 8.44132C5.38155 8.59074 5.3004 8.67807 5.25 8.70676L5.25 17.1367Z"
      />
      <path
        d="M5.25 17.1367L5.25 8.70676M5.25 17.1367H13.0697M5.25 17.1367H3M5.25 8.70676C5.3004 8.67807 5.38155 8.59074 5.44795 8.44132L8.08729 2.50281C8.18624 2.28019 8.407 2.13672 8.65062 2.13672C9.67201 2.13672 10.5 2.96471 10.5 3.9861V6.63672C10.5 7.05093 10.8358 7.38672 11.25 7.38672H13.8774C15.2564 7.38672 16.3109 8.61589 16.1012 9.97885L15.2935 15.2288C15.1247 16.3265 14.1802 17.1367 13.0697 17.1367M5.25 8.70676C5.10969 8.78666 5 8.88672 4.7626 8.88672H3C2.17157 8.88672 1.5 9.55829 1.5 10.3867V15.6367C1.5 16.4651 2.17157 17.1367 3 17.1367M3 17.1367H13.0697"
        strokeWidth={1.5}
        className={cn("stroke-[--path-color]")}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Toggle>
)
export { ThumbsUpToggle }
