import React from "react"
import { cn } from "@/utils/functions"

const VersionCardRoot = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "border-t py-3 bg-white cursor-pointer hover:bg-gray-50 active:bg-primary-25 active:hover:bg-primary-50 border-gray-200 px-5",
        className
      )}
      {...props}
    />
  )
}

const VersionCardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex justify-between gap-x-5 items-center", className)}
      {...props}
    />
  )
}

const VersionCardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("flex items-center gap-x-2", className)} {...props} />
  )
}

const VersionCardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h1
      className={cn("text-sm font-medium text-gray-900", className)}
      {...props}
    />
  )
}

const VersionCardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p
      className={cn("text-sm leading-6 text-gray-500", className)}
      {...props}
    />
  )
}

export {
  VersionCardRoot,
  VersionCardTitle,
  VersionCardDescription,
  VersionCardFooter,
  VersionCardHeader,
}
