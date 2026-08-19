"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/utils/functions"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { useRef, useEffect, useState, useMemo } from "react"
import {
  Bell,
  Building05,
  ChevronLeft,
  CoinStack,
  CreditCard,
  File02,
  Globe01,
  Grid01,
  Lock,
  LogIn01,
  Monitor01,
  RefreshCcw05,
  Shield01,
  Smartphone,
  UserCircle,
  Users,
  Wallet02,
  Zap,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { Badge } from "@/components/ui"
import { ComponentType } from "react"

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
  "w-[224px] shrink-0 bg-gray-50 min-[1024px]:flex flex-col fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r border-gray-200"

const sharedAccountItems: SidebarItem[] = [
  { href: "/settings/personal-info", label: "Personal Info", icon: UserCircle },
]

const talentOnlyAccountItems: SidebarItem[] = [
  { href: "/settings/company-info", label: "Company Info", icon: Building05 },
]

const sharedAccountTail: SidebarItem[] = [
  { href: "/settings/privacy", label: "Privacy", icon: Shield01 },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/tax-info", label: "Tax Info", icon: File02 },
]

const signInSecurityItems: SidebarItem[] = [
  { href: "/settings/login-password", label: "Login & Password", icon: Lock },
  { href: "/settings/two-factor-auth", label: "Two-Factor Auth", icon: Shield01 },
  { href: "/settings/social-login", label: "Social Login", icon: LogIn01 },
  { href: "/settings/account-recovery", label: "Account Recovery", icon: RefreshCcw05 },
]

const billingItems: SidebarItem[] = [
  { href: "/settings/billing-overview", label: "Overview", icon: CoinStack },
  { href: "/settings/transactions", label: "Transactions", icon: CreditCard },
  { href: "/settings/invoices", label: "Invoices", icon: File02 },
  { href: "/settings/payment-methods", label: "Payment Methods", icon: Wallet02 },
  { href: "/settings/plans", label: "Plans", icon: Zap },
]

const teamManagementItems: SidebarItem[] = [
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/roles", label: "Roles", icon: Shield01 },
]

const accessManagementItems: SidebarItem[] = [
  { href: "/settings/devices", label: "Devices", icon: Smartphone },
  { href: "/settings/ip-restrictions", label: "IP Restrictions", icon: Globe01 },
]

const integrationsItems: SidebarItem[] = [
  { href: "/settings/integrations", label: "Integrations", icon: Monitor01 },
  { href: "/settings/my-apps", label: "My Apps", icon: Grid01 },
]

const buildSections = (role: string | null): SidebarSection[] => {
  const isTalent = role === "TALENT" || role === "ADMIN"

  const accountItems = [
    ...sharedAccountItems,
    ...(isTalent ? talentOnlyAccountItems : []),
    ...sharedAccountTail,
  ]

  return [
    { label: "Account", items: accountItems },
    { label: "Sign In & Security", items: signInSecurityItems },
    { label: "Billing", items: billingItems },
    { label: "Team Management", items: teamManagementItems },
    { label: "Access Management", items: accessManagementItems },
    { label: "Integrations", items: integrationsItems },
  ]
}

export default function SettingsSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = useMemo(() => resolveDashboardRole(user), [user])
  const sections = useMemo(() => buildSections(role), [role])

  const backHref = role === "CLIENT" ? "/client-dashboard" : "/talent-dashboard"

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 0)
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className={sidebarFrameClass}>
      <div
        className={cn(
          "shrink-0 px-[15px] transition-all duration-200",
          isScrolled ? "pt-2 pb-2" : "pt-[15px] pb-3"
        )}
      >
        <NextLink
          href={backHref}
          className={cn(
            "group flex items-center gap-x-2.5 rounded-[5px] -mx-1 px-1 transition-colors hover:bg-gray-100",
            isScrolled ? "py-0.5" : "py-1"
          )}
        >
          <span className="inline-flex items-center justify-center size-6 rounded-md border border-gray-200 bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] transition-all group-hover:border-gray-300 group-hover:shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
            <ChevronLeft className="size-3.5 text-gray-500 transition-transform group-hover:-translate-x-px" />
          </span>
          <span className={cn(
            "font-semibold text-dark-blue-400 transition-all duration-200",
            isScrolled ? "text-xs leading-4" : "text-sm leading-5"
          )}>
            Settings
          </span>
        </NextLink>
      </div>
      <div className={cn(
        "h-px bg-gray-200 shrink-0 transition-all duration-200",
        isScrolled ? "mx-0" : "mx-[15px]"
      )} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-5 px-[15px] pb-[15px] space-y-6">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-y-2">
          <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400 uppercase tracking-[0.02em]">
            {section.label}
          </span>

          <div className="flex flex-col gap-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              const tabId = item.href.replace("/settings/", "")
              const isActive = activeTab === tabId

              return (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none px-3 text-left",
                    isActive
                      ? "bg-primary-50 text-primary-500"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => onTabChange(tabId)}
                >
                  <Icon
                    className={cn(
                      "size-[18px]",
                      isActive ? "text-primary-500" : "text-dark-blue-400/50"
                    )}
                  />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

export const buildSettingsTabItems = (role: string | null) =>
  buildSections(role).flatMap((s) =>
    s.items.map((item) => ({
      id: item.href.replace("/settings/", ""),
      label: item.label,
      icon: item.icon,
    }))
  )

export type SettingsTabId = string
