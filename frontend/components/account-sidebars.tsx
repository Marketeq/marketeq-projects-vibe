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

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed"

const useSidebarCollapsed = () => {
  const [collapsed, setCollapsed] = useState(false)

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  // Sync across tabs
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

// ---------------------------------------------------------------------------
// Expanded sidebar link
// ---------------------------------------------------------------------------

const ExpandedLink = ({
  item,
  isActive,
}: {
  item: SidebarItem
  isActive: boolean
}) => {
  const Icon = item.icon
  return (
    <NextLink
      className={cn(
        "flex w-full items-center gap-x-3 font-semibold text-sm leading-6 text-dark-blue-400 rounded-[5px] h-10 flex-none px-3",
        isActive ? "bg-primary-50 text-primary-500" : "hover:bg-gray-100"
      )}
      href={item.href}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
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
}

// ---------------------------------------------------------------------------
// Collapsed sidebar link — square 40x40 target with tooltip
// ---------------------------------------------------------------------------

const CollapsedLink = ({
  item,
  isActive,
}: {
  item: SidebarItem
  isActive: boolean
}) => {
  const Icon = item.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NextLink
          className={cn(
            "relative flex items-center justify-center size-10 rounded-lg mx-auto",
            isActive ? "bg-primary-50" : "hover:bg-gray-100"
          )}
          href={item.href}
        >
          <Icon
            className={cn(
              "size-[20px]",
              isActive ? "text-primary-500" : "text-dark-blue-400/50"
            )}
          />
          {item.badge && (
            <span className="absolute top-1 right-1 size-[7px] rounded-full bg-error-500 ring-2 ring-gray-50" />
          )}
        </NextLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
        {item.label}
        {item.badge ? ` (${item.badge})` : ""}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

const renderExpanded = (sections: SidebarSection[], pathname: string) =>
  sections.map((section) => (
    <div key={section.label} className="flex flex-col gap-y-2">
      <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
        {section.label}
      </span>
      <div className="flex flex-col gap-y-1">
        {section.items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <ExpandedLink key={item.label} item={item} isActive={isActive} />
          )
        })}
      </div>
    </div>
  ))

const renderCollapsed = (sections: SidebarSection[], pathname: string) =>
  sections.map((section, sectionIdx) => (
    <div key={section.label} className="flex flex-col items-center gap-y-1">
      {sectionIdx > 0 && (
        <div className="w-6 border-t border-gray-200 mb-1" />
      )}
      {section.items.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/")
        return (
          <CollapsedLink key={item.label} item={item} isActive={isActive} />
        )
      })}
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
// Toggle button (sits at the bottom of the sidebar)
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
          "bg-white size-8 hover:bg-gray-100 border border-gray-200",
          collapsed ? "mx-auto" : ""
        )}
        variant="outlined"
        visual="gray"
        size="md"
        onClick={onToggle}
      >
        <Sidebar className="size-4" />
      </IconButton>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
      {collapsed ? "Expand sidebar" : "Collapse sidebar"}
    </TooltipContent>
  </Tooltip>
)

// ---------------------------------------------------------------------------
// Sidebar shells
// ---------------------------------------------------------------------------

export const TalentAccountSidebar = () => {
  const pathname = usePathname()
  const { totalUnread } = useInboxThreads()
  const [collapsed, toggle] = useSidebarCollapsed()
  const sections = useMemo(
    () => buildTalentSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:flex flex-col fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[224px]"
        )}
      >
        {/* Scrollable nav area */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            collapsed ? "px-[10px] pt-3 space-y-3" : "p-[15px] space-y-6"
          )}
        >
          {collapsed
            ? renderCollapsed(sections, pathname)
            : renderExpanded(sections, pathname)}
        </div>

        {/* Bottom section */}
        <div
          className={cn(
            "border-t border-gray-200 shrink-0",
            collapsed ? "px-[10px] py-3 flex justify-center" : "px-[15px] py-4"
          )}
        >
          {!collapsed && (
            <div className="px-3 mb-3">
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
          <CollapseToggle
            collapsed={collapsed}
            onToggle={toggle}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

export const ClientAccountSidebar = () => {
  const pathname = usePathname()
  const { totalUnread } = useInboxThreads()
  const [collapsed, toggle] = useSidebarCollapsed()
  const sections = useMemo(
    () => buildClientSections(formatBadge(totalUnread)),
    [totalUnread]
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:flex flex-col fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[224px]"
        )}
      >
        {/* Scrollable nav area */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            collapsed ? "px-[10px] pt-3 space-y-3" : "p-[15px] space-y-6"
          )}
        >
          {collapsed
            ? renderCollapsed(sections, pathname)
            : renderExpanded(sections, pathname)}
        </div>

        {/* Bottom section */}
        <div
          className={cn(
            "border-t border-gray-200 shrink-0",
            collapsed ? "px-[10px] py-3 flex justify-center" : "px-[15px] py-4"
          )}
        >
          {!collapsed && (
            <div className="px-3 mb-3">
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
          <CollapseToggle
            collapsed={collapsed}
            onToggle={toggle}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
