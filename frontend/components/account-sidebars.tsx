"use client"

import { ComponentType } from "react"
import { usePathname } from "next/navigation"
import {
  AlertCircle,
  BarChartSquare02,
  Briefcase,
  CoinStack,
  CurrencyDollar,
  FileCheck02,
  Home03,
  Mail01,
  Search,
  Settings02,
  UserCircle,
  Users,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { Badge } from "@/components/ui"
import { cn } from "@/utils/functions"

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

const sidebarFrameClass =
  "w-[224px] shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]"

const renderSections = (sections: SidebarSection[], pathname: string) => {
  const linkClass = (href: string) =>
    cn(
      "flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none px-3",
      pathname === href || pathname?.startsWith(href + "/")
        ? "bg-gray-100"
        : "hover:bg-gray-100",
    )

  return sections.map((section) => (
    <div key={section.label} className="flex flex-col gap-y-2">
      <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
        {section.label}
      </span>

      <div className="flex flex-col gap-y-1">
        {section.items.map((item) => {
          const Icon = item.icon

          return (
            <NextLink key={item.label} className={linkClass(item.href)} href={item.href}>
              <Icon className="size-[18px] text-dark-blue-400/50" />
              {item.label}
              {item.badge && (
                <Badge className="rounded-full ml-auto" size="md" visual="error">
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

const talentSections: SidebarSection[] = [
  {
    label: "Work",
    items: [
      { href: "/talent-dashboard", label: "Home", icon: Home03 },
      { href: "/my-listings", label: "My Listings", icon: Search },
      { href: "/my-contracts", label: "My Contracts", icon: FileCheck02 },
      { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
      { href: "/earnings", label: "Transactions", icon: CurrencyDollar },
      { href: "/reports", label: "Reports", icon: BarChartSquare02 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/talent-profile", label: "Profile", icon: UserCircle },
      { href: "/inbox", label: "Inbox", icon: Mail01, badge: "3" },
      { href: "/notifications", label: "Notifications", icon: AlertCircle, badge: "2" },
      { href: "/billing", label: "Billing", icon: CoinStack },
      { href: "/settings", label: "Settings", icon: Settings02 },
    ],
  },
]

const clientSections: SidebarSection[] = [
  {
    label: "Work",
    items: [
      { href: "/client-dashboard", label: "Home", icon: Home03 },
      { href: "/my-contracts", label: "My Contracts", icon: FileCheck02 },
      { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
      { href: "/my-team", label: "My Team", icon: Users },
      { href: "/payments", label: "Payments", icon: CurrencyDollar },
      { href: "/stats", label: "Stats & Trends", icon: BarChartSquare02 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/talent-profile", label: "Profile", icon: UserCircle },
      { href: "/inbox", label: "Inbox", icon: Mail01, badge: "3" },
      { href: "/notifications", label: "Notifications", icon: AlertCircle, badge: "2" },
      { href: "/billing", label: "Billing", icon: CoinStack },
      { href: "/settings", label: "Settings", icon: Settings02 },
    ],
  },
]

export const TalentAccountSidebar = () => {
  const pathname = usePathname()

  return <div className={sidebarFrameClass}>{renderSections(talentSections, pathname)}</div>
}

export const ClientAccountSidebar = () => {
  const pathname = usePathname()

  return <div className={sidebarFrameClass}>{renderSections(clientSections, pathname)}</div>
}
