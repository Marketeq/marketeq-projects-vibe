"use client"

import React from "react"
import Link from "next/link"
import { shouldTriggerStartEvent } from "@/utils/react-utils"
import nProgress from "nprogress"

export const NextLink = React.forwardRef<
  React.ElementRef<typeof Link>,
  React.ComponentPropsWithoutRef<typeof Link>
>(({ onClick, href, ...props }, ref) => {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        if (shouldTriggerStartEvent(href.toString(), event)) {
          nProgress.configure({ showSpinner: false })
          nProgress.start()
          nProgress.set(0)
        }
        if (onClick) onClick(event)
      }}
      ref={ref}
    />
  )
})

NextLink.displayName = "NextLink"

export default NextLink
