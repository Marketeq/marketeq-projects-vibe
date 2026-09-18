"use client"

import { ComponentType, useCallback, useEffect, useMemo, useState } from "react"
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

// ---------------------------------------------------------------------------
// Persistent collapsed state (localStorage-backed, no flash on navigation)
// ---------------------------------------------------------------------------

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed"

const useSidebarCollapsed = () => {
  const [collapsed, setCollapsed] = useState<boolean | null>(null)

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true")
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY) {
        setCollapsed(e.newValue === "true")
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  return [collapsed, toggle] as const
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SidebarItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  badge?: string
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

const formatBadge = (count: number) => {
  if (count <= 0) return undefined
  if (count > 99) return "99+"
  return String(count)
}

// ---------------------------------------------------------------------------
// Single unified link — same layout in both states, text fades with opacity
// ---------------------------------------------------------------------------

const SidebarLink = ({
  item,
  isActive,
  collapsed,
}: {
  item: SidebarItem
  isActive: boolean
  collapsed: boolean
}) => {
  const Icon = item.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NextLink
          className={cn(
            "relative flex w-full items-center gap-x-3 font-semibold text-sm leading-6 text-dark-blue-400 rounded-[5px] h-10 flex-none px-3 whitespace-nowrap",
            isActive ? "bg-primary-50 text-primary-500" : "hover:bg-gray-100"
          )}
          href={item.href}
        >
          <span className="relative shrink-0">
            <Icon
              className={cn(
                "size-[18px]",
                isActive ? "text-primary-500" : "text-dark-blue-400/50"
              )}
            />
            {item.badge && collapsed && (
              <span className="absolute -top-0.5 -right-1.5 size-[7px] rounded-full bg-error-500 ring-2 ring-gray-50" />
            )}
          </span>
          <span
            className={cn(
              "truncate transition-opacity duration-300",
              collapsed ? "opacity-0" : "opacity-100"
            )}
          >
            {item.label}
          </span>
          {item.badge && (
            <Badge
              className={cn(
                "rounded-full ml-auto shrink-0 transition-opacity duration-300",
                collapsed ? "opacity-0" : "opacity-100"
              )}
              size="md"
              visual={isActive ? "primary" : "error"}
            >
              {item.badge}
            </Badge>
          )}
        </NextLink>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
          {item.label}
          {item.badge ? ` (${item.badge})` : ""}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

const renderSections = (
  sections: SidebarSection[],
  pathname: string,
  collapsed: boolean
) =>
  sections.map((section) => (
    <div key={section.label} className="flex flex-col">
      <span
        className={cn(
          "text-xs leading-5 font-medium text-dark-blue-400 whitespace-nowrap overflow-hidden transition-all duration-300",
          collapsed ? "opacity-0 h-0" : "opacity-100 h-5 mb-2"
        )}
      >
        {section.label}
      </span>
      <div className="flex flex-col gap-y-1">
        {section.items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <SidebarLink
              key={item.label}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
            />
          )
        })}
      </div>
    </div>
  ))

// ---------------------------------------------------------------------------
// Section data builders
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Toggle button (absolute top-right corner)
// ---------------------------------------------------------------------------

const CollapseToggle = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <IconButton
        className={cn(
          "bg-white absolute z-10 size-[23px] hover:opacity-100 border border-gray-200",
          collapsed
            ? "top-2.5 left-1/2 -translate-x-1/2 opacity-80"
            : "top-2.5 right-2.5 opacity-50"
        )}
        variant="outlined"
        visual="gray"
        size="md"
        onClick={onToggle}
      >
        <Sidebar className="size-[15px]" />
      </IconButton>
    </TooltipTrigger>
    <TooltipContent side={collapsed ? "right" : "bottom"} sideOffset={8} className="text-xs font-medium">
      {collapsed ? "Expand sidebar" : "Close sidebar"}
    </TooltipContent>
  </Tooltip>
)

// ---------------------------------------------------------------------------
// Sidebar shell (shared layout, role-specific sections)
// ---------------------------------------------------------------------------

const SidebarShell = ({
  sections,
  collapsed,
  toggle,
}: {
  sections: SidebarSection[]
  collapsed: boolean
  toggle: () => void
}) => {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 overflow-hidden overflow-y-auto",
          "transition-[width] duration-300 ease-in-out",
          "px-[15px] pb-[15px] space-y-6",
          collapsed ? "pt-[42px]" : "pt-[15px]",
          collapsed ? "w-[72px]" : "w-[224px]"
        )}
      >
        <CollapseToggle collapsed={collapsed} onToggle={toggle} />
        {renderSections(sections, pathname, collapsed)}
        <div
          className={cn(
            "border-t border-gray-200 pt-5 px-3 transition-opacity duration-300",
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <p className="text-xs text-gray-500 leading-4">
            Get the right talent for your next project.
          </p>
          <NextLink
            href="/"
            className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline mt-1.5 inline-block whitespace-nowrap"
          >
            Browse the Marketplace
          </NextLink>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Exported sidebars
// ---------------------------------------------------------------------------

export const TalentAccountSidebar = () => {
  const { totalUnread } = useInboxThreads()
  const [collapsed, toggle] = useSidebarCollapsed()
  const sections = useMemo(
    () => buildTalentSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  if (collapsed === null) return null

  return <SidebarShell sections={sections} collapsed={collapsed} toggle={toggle} />
}

export const ClientAccountSidebar = () => {
  const { totalUnread } = useInboxThreads()
  const [collapsed, toggle] = useSidebarCollapsed()
  const sections = useMemo(
    () => buildClientSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  if (collapsed === null) return null

  return <SidebarShell sections={sections} collapsed={collapsed} toggle={toggle} />
}
