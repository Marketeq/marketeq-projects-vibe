import React from "react"
import { cn } from "@/utils/functions"

const Sidebar = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  return (
    <nav
      className={cn(
        "flex w-[70px] flex-col items-center border-r border-gray-200 bg-white",
        className
      )}
      {...props}
    />
  )
}

const SidebarHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex h-[70px] flex-none items-center justify-center self-stretch border-b border-gray-200",
        className
      )}
      {...props}
    />
  )
}

const SidebarContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-auto pt-5 flex-col items-center justify-between gap-y-5 self-stretch",
        className
      )}
      {...props}
    />
  )
}

const SidebarGroup = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("flex flex-col gap-y-5", className)} {...props} />
}

const SidebarItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-500 focus:outline-none",
        className
      )}
      {...props}
      ref={ref}
    />
  )
})

SidebarItem.displayName = "SidebarItem"

export { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarItem }
