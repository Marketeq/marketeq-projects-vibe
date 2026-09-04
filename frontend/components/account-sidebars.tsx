"use client"

import { ComponentType, useMemo } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/utils/functions"
import { useInboxThreads } from "@/utils/useInboxThreads"
import {
  AlertCircle,
  BarChartSquare02,
  Briefcase,
  CurrencyDollar,
  FileCheck02,
  Home03,
  Mail01,
  Search,
  Settings02,
  Sidebar,
  UserCircle,
  Users,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { Badge, IconButton } from "@/components/ui"

type SidebarItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  badge?: string
}

const formatBadge = (count: number) => {
  if (count <= 0) return undefined
  if (count > 99) return "99+"
  return String(count)
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

const sidebarFrameClass =
  "w-[224px] shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]"

const renderSections = (sections: SidebarSection[], pathname: string) => {
  const linkClass = (href: string) =>
    cn(
      "flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none px-3",
      pathname === href || pathname?.startsWith(href + "/")
        ? "bg-primary-50 text-primary-500"
        : "hover:bg-gray-100"
    )

  return sections.map((section) => (
    <div key={section.label} className="flex flex-col gap-y-2">
      <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
        {section.label}
      </span>

      <div className="flex flex-col gap-y-1">
        {section.items.map((item) => {
          const Icon = item.icon

          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")

          return (
            <NextLink
              key={item.label}
              className={linkClass(item.href)}
              href={item.href}
            >
              <Icon
                className={cn(
                  "size-[18px]",
                  isActive ? "text-primary-500" : "text-dark-blue-400/50"
                )}
              />
              {item.label}
              {item.badge && (
                <Badge
                  className="rounded-full ml-auto"
                  size="md"
                  visual={isActive ? "primary" : "error"}
                >
                  {item.badge}
                </Badge>
              )}
            </NextLink>
          )
        })}
      </div>
    </div>
  ))
}

const buildTalentSections = (inboxBadge?: string): SidebarSection[] => [
  {
    label: "Work",
    items: [
      { href: "/talent-dashboard", label: "Home", icon: Home03 },
      { href: "/my-listings", label: "My Listings", icon: Search },
      { href: "/my-contracts", label: "My Contracts", icon: FileCheck02 },
      { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
      { href: "/my-teams", label: "My Teams", icon: Users },
      { href: "/earnings", label: "Financials", icon: CurrencyDollar },
      { href: "/reports", label: "Reports", icon: BarChartSquare02 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/talent-profile", label: "Profile", icon: UserCircle },
      { href: "/inbox", label: "Inbox", icon: Mail01, badge: inboxBadge },
      {
        href: "/notifications",
        label: "Notifications",
        icon: AlertCircle,
        badge: "2",
      },
      { href: "/settings", label: "Settings", icon: Settings02 },
    ],
  },
]

const buildClientSections = (inboxBadge?: string): SidebarSection[] => [
  {
    label: "Work",
    items: [
      { href: "/client-dashboard", label: "Home", icon: Home03 },
      { href: "/my-contracts", label: "My Contracts", icon: FileCheck02 },
      { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
      { href: "/stats", label: "Stats & Trends", icon: BarChartSquare02 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/client-profile", label: "Profile", icon: UserCircle },
      { href: "/inbox", label: "Inbox", icon: Mail01, badge: inboxBadge },
      {
        href: "/notifications",
        label: "Notifications",
        icon: AlertCircle,
        badge: "2",
      },
      { href: "/settings", label: "Settings", icon: Settings02 },
    ],
  },
]

export const TalentAccountSidebar = () => {
  const pathname = usePathname()
  const { totalUnread } = useInboxThreads()
  const sections = useMemo(
    () => buildTalentSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <div className={sidebarFrameClass}>
      {renderSections(sections, pathname)}
      <div className="border-t border-gray-200 pt-5 px-3">
        <p className="text-xs text-gray-500 leading-4">
          Find talent, services, and projects.
        </p>
        <NextLink
          href="/search"
          className="text-sm font-semibold text-primary-500 hover:text-primary-600 hover:underline mt-1.5 inline-block"
        >
          Browse the Marketplace
        </NextLink>
      </div>
    </div>
  )
}

export const ClientAccountSidebar = () => {
  const pathname = usePathname()
  const { totalUnread } = useInboxThreads()
  const sections = useMemo(
    () => buildClientSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <div className={sidebarFrameClass}>
      <IconButton
        className="bg-white absolute size-[23px] opacity-50 hover:opacity-100 top-2.5 right-2.5"
        variant="outlined"
        visual="gray"
        size="md"
      >
        <Sidebar className="size-[15px]" />
      </IconButton>
      {renderSections(sections, pathname)}
      <div className="border-t border-gray-200 pt-5 px-3">
        <p className="text-xs text-gray-500 leading-4">
          Find talent, services, and projects.
        </p>
        <NextLink
          href="/search"
          className="text-sm font-semibold text-primary-500 hover:text-primary-600 hover:underline mt-1.5 inline-block"
        >
          Browse the Marketplace
        </NextLink>
      </div>
    </div>
  )
}
