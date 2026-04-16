"use client"

import React, { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, ChevronRight } from "@blend-metrics/icons"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

const TeamMemberLink = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [teamCount, setTeamCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    UserAPI.listUsers(50)
      .then((res) => {
        const users = Array.isArray(res?.data) ? res.data : []
        setTeamCount(users.length)
      })
      .catch(() => {})
  }, [user?.id])

  return (
    <Button
      className="gap-x-0.5 text-[11px] leading-6 lg:text-[13px] lg:leading-6 text-dark-blue-400"
      variant="link"
      visual="gray"
      onClick={() => router.push("/my-team")}
    >
      {teamCount} team member{teamCount !== 1 ? "s" : ""}
      <ChevronRight className="size-3 lg:size-3.5" />
    </Button>
  )
}

export function MarketplaceSecondaryNavShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [showSecondaryNav, setShowSecondaryNav] = useState(true)
  const lastScrollY = useRef(0)

  // Keep the homepage-style secondary nav behavior consistent everywhere this
  // shell is used: every route change starts at the top with the nav visible.
  useEffect(() => {
    window.scrollTo(0, 0)
    setShowSecondaryNav(true)
    lastScrollY.current = 0

    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY

      if (currentY < 10) {
        setShowSecondaryNav(true)
      } else if (currentY < lastScrollY.current) {
        setShowSecondaryNav(true)
      } else if (currentY > lastScrollY.current) {
        setShowSecondaryNav(false)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // The primary header reads this attribute to decide when it should carry the
  // shadow itself versus letting the secondary nav own that visual treatment.
  useEffect(() => {
    document.documentElement.dataset.secondaryNav = showSecondaryNav
      ? "visible"
      : "hidden"

    return () => {
      delete document.documentElement.dataset.secondaryNav
    }
  }, [showSecondaryNav])

  return (
    <>
      <div
        className="fixed inset-x-0 top-[62px] lg:top-[65px] px-3.5 md:px-6 lg:px-[50px] bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] xs:max-md:hidden z-40 transition-transform duration-300"
        style={{ transform: showSecondaryNav ? "translateY(0)" : "translateY(-100%)" }}
      >
        <div className="pt-0.5 pb-3.5 lg:py-3 flex items-end gap-x-6 lg:justify-between lg:gap-x-[30px]">
          <div className="flex flex-col">
            <span className="inline-block text-[10px] leading-[12.1px] lg:text-xs lg:leading-[16.34px] text-dark-blue-400">
              You currently have
            </span>

            <TeamMemberLink />
          </div>

          <div className="flex items-center gap-x-6 lg:gap-x-[54.17px] lg:ml-[26.5px]">
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/research")}
            >
              Research
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/design")}
            >
              Design
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/development")}
            >
              Development
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/testing")}
            >
              Testing
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/security")}
            >
              Security
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/maintenance")}
            >
              Maintenance
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/c/digital-marketing")}
            >
              Digital Marketing
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100 lg:hidden"
                  variant="link"
                  visual="gray"
                >
                  More <ChevronDown className="size-[15px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ScrollArea
                  viewportClassName="max-h-[250px]"
                  scrollBar={<ScrollBar className="w-4 p-1" />}
                >
                  <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-x-[18px] ml-auto xs:max-lg:hidden">
            <Button
              className="text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() => router.push("/favorites")}
            >
              My Favorites
            </Button>
            <span className="inline-block h-4 w-px shrink-0 bg-gray-300" />
            <Button
              className="text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={() =>
                router.push(
                  user?.accountType === "TALENT"
                    ? "/talent-dashboard"
                    : "/client-dashboard",
                )
              }
            >
              My Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* This keeps marketplace pages rendering below both fixed nav layers
          while preserving the homepage's shared secondary-nav spacing. */}
      <div className="xs:max-md:pt-0 pt-[52px] lg:pt-[57px]">{children}</div>
    </>
  )
}
