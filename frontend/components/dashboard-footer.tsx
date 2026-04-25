"use client"

import { cn } from "@/utils/functions"
import { InstagramDefault } from "@blend-metrics/icons/social"
import { Facebook, Linkedin, Logo3, XIcon } from "@/components/icons"
import NextLink from "@/components/next-link"
import { IconButton } from "@/components/ui"

type DashboardFooterProps = {
  className?: string
}

export function DashboardFooter({ className }: DashboardFooterProps) {
  const year = new Date().getFullYear()

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 md:flex-row md:justify-between",
        className
      )}
    >
      <div className="flex flex-col items-center gap-5 md:flex-row md:gap-x-[57px]">
        <NextLink className="focus-visible:outline-none" href="/">
          <Logo3 className="shrink-0 w-[120px] h-[17.63px]" />
        </NextLink>
        <span className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
          © 2011 - {year} Marketeq Digital Inc. All Rights Reserved.
        </span>
      </div>

      <div className="flex items-center gap-x-[16.6px]">
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Facebook className="fill-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <XIcon className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <InstagramDefault className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Linkedin className="text-dark-blue-400 size-4" />
        </IconButton>
      </div>
    </div>
  )
}
