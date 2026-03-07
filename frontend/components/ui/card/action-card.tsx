import React from "react"
import { cn } from "@/utils/functions"

const ActionCardRoot = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "px-5 flex gap-x-3 hover:bg-gray-50 active:bg-primary-50 cursor-pointer items-center py-3",
        className
      )}
      {...props}
    />
  )
}

const ActionCardIcon = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-lg flex-none inline-flex items-center justify-center border-[1.5px] border-gray-200",
        className
      )}
      {...props}
    />
  )
}

const ActionCardContent = (props: React.HTMLAttributes<HTMLDivElement>) => {
  return <div {...props} />
}

const ActionCardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("text-sm font-medium leading-6 text-gray-900", className)}
      {...props}
    />
  )
}

const ActionCardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("text-xs leading-[14.52px] text-gray-500", className)}
      {...props}
    />
  )
}

export {
  ActionCardRoot,
  ActionCardIcon,
  ActionCardTitle,
  ActionCardDescription,
  ActionCardContent,
}
