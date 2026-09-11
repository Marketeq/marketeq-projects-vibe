"use client"

import React from "react"
import { cn } from "@/utils/functions"
import { Check } from "@blend-metrics/icons"
import { Logo } from "@/components/icons"
import { Pointer } from "@/components/icons/pointer"
import NextLink from "@/components/next-link"
import { Triangles } from "@/components/triangles"
import { Button } from "@/components/ui"

export interface OnboardingSidebarItem {
  title: string
  description?: string
}

/** The value-prop panel shown while a user is signing up or being onboarded. */
export const REMOTE_WORK_ITEMS: OnboardingSidebarItem[] = [
  {
    title: "Find Tailored Projects",
    description: "Discover curated matches to elevate your talent.",
  },
  {
    title: "Connect with Ideal Teams",
    description: "Collaborate with teams that align with your expertise.",
  },
  {
    title: "Get Paid, Stress Free",
    description: "Secure contracts. Fast, hassle-free payments every time.",
  },
]

/** The post-setup panel: what the user can now do on the platform. */
export const WELCOME_ITEMS: OnboardingSidebarItem[] = [
  { title: "Find top talent in exciting projects" },
  { title: "Manage all your projects in one place" },
  { title: "Track progress in real time" },
  { title: "Collaborate with ease" },
  { title: "Secure contracts and payments" },
]

export const OnboardingSidebar = ({
  heading = "The Future of Remote Work Is Here...",
  subheading,
  items = REMOTE_WORK_ITEMS,
  showSignIn = true,
  signInHref = "/sign-in",
  className,
}: {
  heading?: string
  subheading?: string
  items?: OnboardingSidebarItem[]
  showSignIn?: boolean
  signInHref?: string
  className?: string
}) => (
  <div
    className={cn(
      "relative hidden 2xl:flex w-[480px] shrink-0 flex-col overflow-hidden bg-dark-blue-500 p-[75px]",
      className
    )}
  >
    <NextLink href="/" className="focus-visible:outline">
      <Logo className="h-9 w-[245px] shrink-0" />
    </NextLink>

    <div className="mt-[80px]">
      <h1 className="text-[30px] leading-[36.31px] font-bold text-white">
        {heading}
      </h1>

      {subheading && (
        <p className="mt-3 text-base leading-[19.36px] text-white">
          {subheading}
        </p>
      )}

      <ul className="mt-[30px] space-y-5">
        {items.map((item) => (
          <li key={item.title} className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm leading-[16.94px] text-white">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>

    <Triangles className="absolute bottom-0 right-0" />

    {showSignIn && (
      <div className="relative mt-auto flex flex-col gap-y-5">
        <span className="text-base leading-[19.36px] text-white focus-visible:outline-none">
          Already have an account?
        </span>

        <div className="relative self-start">
          <NextLink href={signInHref} className="focus-visible:outline">
            <Button
              className="hover:bg-white hover:text-dark-blue-400 border-white/[.2] text-white hover:border-white"
              size="lg"
              visual="gray"
              variant="outlined"
            >
              Sign In
            </Button>
          </NextLink>

          <Pointer className="absolute top-[34px] right-0 -rotate-6" />
        </div>
      </div>
    )}
  </div>
)
