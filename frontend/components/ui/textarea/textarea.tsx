"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isInvalid?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isInvalid, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex h-[128px] w-full resize-none rounded-[5px] border border-gray-300 bg-transparent bg-white px-[14px] py-2.5 text-base text-gray-black shadow-xs scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg placeholder:text-gray-500 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-50",
          {
            "border-error-300 focus:border-error-300 focus:ring-error-100":
              isInvalid,
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
