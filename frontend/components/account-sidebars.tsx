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
  ChevronsLeft,
  ChevronsRight,
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
// Animated sidebar icons (custom SVGs with separate paths for hover animation)
// ---------------------------------------------------------------------------

const AnimatedHome = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* House body (closed shape includes internal roofline) */}
    <path d="M4.664 6.988v7.35c0 .84 0 1.26.163 1.581a1.5 1.5 0 0 0 .656.656c.32.163.74.163 1.58.163h7.2c.84 0 1.26 0 1.582-.163a1.5 1.5 0 0 0 .655-.656c.164-.32.164-.74.164-1.58v-7.35l-4.56-3.42c-.517-.388-.775-.582-1.059-.656a1.5 1.5 0 0 0-.763 0c-.284.074-.542.268-1.058.655l-4.56 3.42Z" />
    {/* Door (static, no animation) */}
    <path d="M8.414 16.738v-5.55c0-.42 0-.63.081-.79a.75.75 0 0 1 .328-.328c.16-.082.37-.082.79-.082h2.1c.42 0 .63 0 .791.082a.75.75 0 0 1 .328.328c.082.16.082.37.082.79v5.55" />
    {/* Roof chevron (tips like a hat on hover) */}
    <path className="sidebar-roof" d="m3.164 8.113 6.78-5.085c.258-.193.387-.29.529-.328a.75.75 0 0 1 .382 0c.141.038.27.135.529.328l6.78 5.085" />
  </svg>
)

const AnimatedFileCheck = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Document outline */}
    <path d="M15.605 9.861V5.586c0-1.26 0-1.89-.245-2.371a2.25 2.25 0 0 0-.983-.984c-.481-.245-1.111-.245-2.372-.245h-4.8c-1.26 0-1.89 0-2.371.245a2.25 2.25 0 0 0-.983.984c-.246.481-.246 1.111-.246 2.371v7.8c0 1.26 0 1.89.246 2.372.215.423.56.767.983.983.481.245 1.111.245 2.371.245h2.4" />
    {/* Line 1 (top, longest) - draws L→R */}
    <line x1="6.605" y1="5.736" x2="12.605" y2="5.736" className="sidebar-doc-line sidebar-doc-line-1" />
    {/* Line 2 (middle) - draws L→R */}
    <line x1="6.605" y1="8.736" x2="11.105" y2="8.736" className="sidebar-doc-line sidebar-doc-line-2" />
    {/* Line 3 (short bottom) - draws L→R */}
    <line x1="6.605" y1="11.736" x2="8.105" y2="11.736" className="sidebar-doc-line sidebar-doc-line-3" />
    {/* Checkmark */}
    <polyline points="11.48,14.736 12.98,16.236 16.355,12.861" className="sidebar-checkmark" />
  </svg>
)

const AnimatedBarChart = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Square outline */}
    <path d="M6.036 16.228h6.3c1.26 0 1.89 0 2.371-.245A2.25 2.25 0 0 0 15.69 15c.245-.482.245-1.112.245-2.372v-6.3c0-1.26 0-1.89-.245-2.371a2.25 2.25 0 0 0-.983-.984c-.481-.245-1.111-.245-2.372-.245h-6.3c-1.26 0-1.89 0-2.37.245a2.25 2.25 0 0 0-.984.984c-.245.481-.245 1.111-.245 2.371v6.3c0 1.26 0 1.89.245 2.372.216.423.56.767.983.983.481.245 1.111.245 2.372.245Z" />
    {/* Bar 1 - short, left: bottom to top */}
    <line x1="6.186" y1="13.228" x2="6.186" y2="11.728" className="sidebar-bar sidebar-bar-1" />
    {/* Bar 2 - medium, center */}
    <line x1="9.186" y1="13.228" x2="9.186" y2="8.728" className="sidebar-bar sidebar-bar-2" />
    {/* Bar 3 - tall, right */}
    <line x1="12.186" y1="13.228" x2="12.186" y2="5.728" className="sidebar-bar sidebar-bar-3" />
  </svg>
)

const AnimatedMail = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Envelope body */}
    <path d="M5.35 15.49h7.8c1.26 0 1.89 0 2.372-.245a2.25 2.25 0 0 0 .983-.983c.245-.482.245-1.112.245-2.372v-4.8c0-1.26 0-1.89-.245-2.371a2.25 2.25 0 0 0-.984-.984c-.48-.245-1.11-.245-2.371-.245h-7.8c-1.26 0-1.89 0-2.371.245a2.25 2.25 0 0 0-.984.984c-.245.48-.245 1.111-.245 2.371v4.8c0 1.26 0 1.89.245 2.372.216.423.56.767.984.983.48.245 1.11.245 2.371.245Z" />
    {/* Closed flap (V pointing down into envelope) */}
    <path className="sidebar-flap-closed" d="m1.749 5.74 6.124 4.287c.496.347.744.52 1.013.588.238.059.488.059.726 0 .27-.068.518-.241 1.013-.588L16.75 5.74" />
    {/* Open flap (V pointing up above envelope) */}
    <path className="sidebar-flap-open" d="m1.749 5.74 6.124-4.287c.496-.347.744-.52 1.013-.588.238-.059.488-.059.726 0 .27.068.518.241 1.013.588L16.75 5.74" />
  </svg>
)

const AnimatedUsers = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Back person (peeks right on hover) */}
    <g className="sidebar-peek-person">
      {/* Original visible parts (shoulder + right half of head) */}
      <path d="M17.408 15.75v-1.5a3 3 0 0 0-2.25-2.902" />
      <path d="M12.158 2.348a3 3 0 0 1 0 5.812" />
      {/* Hidden parts revealed during peek */}
      <path className="sidebar-peek-reveal" d="M12.158 8.16a3 3 0 0 1 0-5.812" />
      <path className="sidebar-peek-reveal" d="M15.158 11.348h-2.5a3 3 0 0 0-2.25 2.902v1.5" />
    </g>
    {/* Front person (static) */}
    <path d="M12.908 15.75v-1.5a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v1.5" />
    <path d="M9.908 5.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
)

const AnimatedDollar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 19 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* S-curve (top to bottom) */}
    <path className="sidebar-dollar-s" d="M14.085 6.984a3 3 0 0 0-3-3h-3a3 3 0 1 0 0 6h3a3 3 0 0 1 0 6h-3a3 3 0 0 1-3-3" />
    {/* Vertical line */}
    <line x1="9.585" y1="2.484" x2="9.585" y2="17.484" className="sidebar-dollar-line" />
  </svg>
)

// Map labels to custom animated icon components
const ANIMATED_ICONS: Partial<Record<string, ComponentType<{ className?: string }>>> = {
  Home: AnimatedHome,
  "My Contracts": AnimatedFileCheck,
  Reports: AnimatedBarChart,
  "Stats & Trends": AnimatedBarChart,
  "My Teams": AnimatedUsers,
  Financials: AnimatedDollar,
  Inbox: AnimatedMail,
}

const ICON_ANIM: Record<string, string> = {
  Home: "sidebar-anim-home",
  "My Listings": "sidebar-anim-search",
  "My Contracts": "sidebar-anim-contracts",
  "My Jobs": "sidebar-anim-briefcase",
  "My Teams": "sidebar-anim-users",
  Financials: "sidebar-anim-dollar",
  Reports: "sidebar-anim-chart",
  "Stats & Trends": "sidebar-anim-chart",
  Profile: "sidebar-anim-profile",
  Inbox: "sidebar-anim-inbox",
  Notifications: "sidebar-anim-alert",
  Settings: "sidebar-anim-settings",
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
  const Icon = ANIMATED_ICONS[item.label] ?? item.icon
  const animClass = ICON_ANIM[item.label] ?? ""
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NextLink
          className={cn(
            "group relative flex w-full items-center gap-x-3 font-semibold text-sm leading-6 text-dark-blue-400 rounded-[5px] h-10 flex-none px-3 whitespace-nowrap",
            isActive ? "bg-primary-50 text-primary-500" : "hover:bg-gray-100"
          )}
          href={item.href}
        >
          <span className={cn("relative shrink-0", animClass)}>
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
  sections.map((section, index) => (
    <div key={section.label} className={cn("flex flex-col", index === 0 && "relative")}>
      <span
        className={cn(
          "text-xs leading-5 font-medium text-dark-blue-400 whitespace-nowrap overflow-hidden",
          index === 0
            ? cn("absolute -top-7 left-0 transition-opacity duration-300", collapsed ? "opacity-0" : "opacity-100")
            : cn("transition-all duration-300", collapsed ? "opacity-0 h-0" : "opacity-100 h-5 mb-2")
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
            ? "top-6 left-1/2 -translate-x-1/2 opacity-80"
            : "top-2.5 right-2.5 opacity-50"
        )}
        variant="outlined"
        visual="gray"
        size="md"
        onClick={onToggle}
      >
        <span className="relative inline-flex items-center justify-center size-[15px]">
          <Sidebar className="size-[15px]" />
          <svg
            className="absolute left-[62%] top-1/2 -translate-x-1/2 -translate-y-1/2 size-[5px] text-current drop-shadow-[0_0_1px_white]"
            viewBox="0 0 24 24"
            fill="white"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </span>
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

  // Publish sidebar width as a CSS variable so content areas can react
  useEffect(() => {
    const pl = collapsed ? "122px" : "274px" // sidebar width + 50px gap
    document.documentElement.style.setProperty("--sidebar-content-pl", pl)
  }, [collapsed])

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200 overflow-hidden overflow-y-auto",
          "transition-[width] duration-300 ease-in-out",
          "px-[15px] pb-[15px] space-y-6",
          "pt-[45px]",
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
