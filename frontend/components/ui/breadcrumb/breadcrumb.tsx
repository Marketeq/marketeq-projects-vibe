"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { createContext, getValidChildren } from "@/utils/react-utils"

const [BreadcrumbProvider, useBreadcrumbContext] = createContext<{
  separator?: React.ReactNode
  spacing?: string
}>({
  displayName: "Breadcrumb",
  errorMessage: `useBreadcrumbContext returned is 'undefined'. Seems you forgot to wrap the components in "<Breadcrumb />"`,
})

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    listClassName?: string
    separator?: React.ReactNode
    spacing?: string
  }
>(
  (
    { children, listClassName, separator = "/", spacing = "1.25rem", ...props },
    ref
  ) => {
    const validChildren = getValidChildren(children)
    const count = validChildren.length

    const clones = validChildren.map((child, index) =>
      React.cloneElement(child, {
        isLastChild: count === index + 1,
      })
    )

    return (
      <nav aria-label="breadcrumb" ref={ref} {...props}>
        <BreadcrumbProvider value={{ separator, spacing }}>
          <ol className={cn("flex items-center", listClassName)}>{clones}</ol>
        </BreadcrumbProvider>
      </nav>
    )
  }
)

Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbSeparator = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, style, ...props }, ref) => {
  const context = useBreadcrumbContext()

  return (
    <span
      className={cn(
        "mx-[var(--mx,1.25rem)] text-base font-semibold leading-5 text-gray-500",
        className
      )}
      {...props}
      ref={ref}
      style={{
        ...style,
        ...{ "--mx": context.spacing },
      }}
    >
      {children ?? context.separator}
    </span>
  )
})

BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

// FIXME: improve types
const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    isCurrentPage?: boolean
  }
>(({ isCurrentPage, className, href, ...props }, ref) => {
  if (isCurrentPage) {
    return (
      <span
        aria-current="page"
        className={cn(
          "text-sm font-semibold leading-5 text-gray-black",
          className
        )}
        {...props}
        ref={ref}
      />
    )
  }

  return (
    <a
      ref={ref}
      className={cn("text-sm font-semibold leading-6 text-gray-500", className)}
      href={href}
      {...props}
    />
  )
})

BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement> & {
    isLastChild?: boolean
    isCurrentPage?: boolean
    separator?: React.ReactNode
  }
>(
  (
    {
      children,
      separator,
      isCurrentPage = false,
      isLastChild,
      className,
      ...props
    },
    ref
  ) => {
    const validChildren = getValidChildren(children)
    const clones = validChildren.map((child) =>
      React.cloneElement(child, {
        isCurrentPage,
      })
    )

    return (
      <li className={cn("flex items-center", className)} {...props} ref={ref}>
        {clones}
        {!isLastChild && (separator ?? <BreadcrumbSeparator />)}
      </li>
    )
  }
)

BreadcrumbItem.displayName = "BreadcrumbItem"

export { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbLink }
