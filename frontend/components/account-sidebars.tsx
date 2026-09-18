"use client"

import { ComponentType, useMemo, useState } from "react"
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
import {
  Badge,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

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

const renderSections = (
  sections: SidebarSection[],
  pathname: string,
  collapsed: boolean
) => {
  const linkClass = (href: string) =>
    cn(
      "flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 rounded-[5px] h-10 flex-none",
      collapsed ? "justify-center px-0" : "gap-x-3 px-3",
      pathname === href || pathname?.startsWith(href + "/")
        ? "bg-primary-50 text-primary-500"
        : "hover:bg-gray-100"
    )

  return sections.map((section) => (
    <div key={section.label} className="flex flex-col gap-y-2">
      {!collapsed && (
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          {section.label}
        </span>
      )}

      <div className="flex flex-col gap-y-1">
        {section.items.map((item) => {
          const Icon = item.icon

          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")

          const link = (
            <NextLink
              key={item.label}
              className={linkClass(item.href)}
              href={item.href}
            >
              <Icon
                className={cn(
                  "size-[18px] shrink-0",
                  isActive ? "text-primary-500" : "text-dark-blue-400/50"
                )}
              />
              {!collapsed && item.label}
              {!collapsed && item.badge && (
                <Badge
                  className="rounded-full ml-auto"
                  size="md"
                  visual={isActive ? "primary" : "error"}
                >
                  {item.badge}
                </Badge>
              )}
              {collapsed && item.badge && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-error-500" />
              )}
            </NextLink>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div className="relative">{link}</div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ""}
                </TooltipContent>
              </Tooltip>
            )
          }

          return link
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
      { href: "/client-stats", label: "Stats & Trends", icon: BarChartSquare02 },
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
  const [collapsed, setCollapsed] = useState(false)
  const sections = useMemo(
    () => buildTalentSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-[64px] p-2 space-y-4" : "w-[224px] p-[15px] space-y-6"
        )}
      >
        <IconButton
          className="bg-white absolute size-[23px] opacity-50 hover:opacity-100 top-2.5 right-2.5 z-10"
          variant="outlined"
          visual="gray"
          size="md"
          onClick={() => setCollapsed((c) => !c)}
        >
          <Sidebar className="size-[15px]" />
        </IconButton>
        {renderSections(sections, pathname, collapsed)}
        {!collapsed && (
          <div className="border-t border-gray-200 pt-5 px-3">
            <p className="text-xs text-gray-500 leading-4">
              Get the right talent for your next project.
            </p>
            <NextLink
              href="/"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline mt-1.5 inline-block"
            >
              Browse the Marketplace
            </NextLink>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export const ClientAccountSidebar = () => {
  const pathname = usePathname()
  const { totalUnread } = useInboxThreads()
  const [collapsed, setCollapsed] = useState(false)
  const sections = useMemo(
    () => buildClientSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-[64px] p-2 space-y-4" : "w-[224px] p-[15px] space-y-6"
        )}
      >
        <IconButton
          className={cn(
            "bg-white absolute size-[23px] opacity-50 hover:opacity-100 top-2.5 z-10",
            collapsed ? "right-1/2 translate-x-1/2" : "right-2.5"
          )}
          variant="outlined"
          visual="gray"
          size="md"
          onClick={() => setCollapsed((c) => !c)}
        >
          <Sidebar className="size-[15px]" />
        </IconButton>
        {renderSections(sections, pathname, collapsed)}
        {!collapsed && (
          <div className="border-t border-gray-200 pt-5 px-3">
            <p className="text-xs text-gray-500 leading-4">
              Get the right talent for your next project.
            </p>
            <NextLink
              href="/"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline mt-1.5 inline-block"
            >
              Browse the Marketplace
            </NextLink>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
