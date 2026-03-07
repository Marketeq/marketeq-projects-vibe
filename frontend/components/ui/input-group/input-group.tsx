"use client"

import * as React from "react"
import { cn, toPxIfNumber } from "@/utils/functions"
import { createContext, getValidChildren } from "@/utils/react-utils"

const [InputGroupProvider, useInputGroupContext] = createContext<{
  [key: string]: string
}>({
  displayName: "InputGroupProvider",
  errorMessage: `useInputGroupContext returned is 'undefined'. Seems you forgot to wrap the components in "<InputGroup />"`,
})

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { fieldHeight?: string | number }
>(({ children, className, fieldHeight = "2.75rem", ...props }, ref) => {
  const validChildren = getValidChildren(children)
  let fieldStyles: { [key: string]: string } = {}

  validChildren.forEach((child: any) => {
    const id = child.type.id
    if (id === "InputLeftElement") {
      fieldStyles = {
        ...fieldStyles,
        "--pl": toPxIfNumber(fieldHeight),
      }
    }
    if (id === "InputRightElement") {
      fieldStyles = {
        ...fieldStyles,
        "--pr": toPxIfNumber(fieldHeight),
      }
    }
    if (id === "InputLeftAddon") {
      fieldStyles = {
        ...fieldStyles,
        "--rounded-l": "0rem",
      }
    }
    if (id === "InputRightAddon") {
      fieldStyles = {
        ...fieldStyles,
        "--rounded-r": "0rem",
      }
    }
  })

  const clones = validChildren.map((child: any) => {
    return child.type.id === "Input"
      ? React.cloneElement(child, { style: { ...fieldStyles } })
      : child
  })

  return (
    <InputGroupProvider value={{ fieldHeight: toPxIfNumber(fieldHeight) }}>
      <div
        className={cn("relative flex items-center", className)}
        ref={ref}
        {...props}
      >
        {clones}
      </div>
    </InputGroupProvider>
  )
})

InputGroup.displayName = "InputGroup"

export { InputGroup, InputGroupProvider, useInputGroupContext }
