"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui"

export const billingTabs = [
  { value: "overview", label: "Overview", href: "/billing" },
  { value: "transactions", label: "Transactions", href: "/billing/transactions" },
  { value: "invoices", label: "Invoices", href: "/billing/invoices" },
  { value: "payment-methods", label: "Payment Methods", href: "/billing/payment-methods" },
] as const

export type BillingTabValue = (typeof billingTabs)[number]["value"]

export const getActiveBillingTab = (pathname: string): BillingTabValue => {
  if (pathname.startsWith("/billing/transactions")) return "transactions"
  if (pathname.startsWith("/billing/payment-methods") || pathname.startsWith("/payments")) {
    return "payment-methods"
  }
  if (pathname.startsWith("/billing/invoices") || pathname.startsWith("/invoices")) {
    return "invoices"
  }
  return "overview"
}

export function BillingSectionHeader({
  title,
  description,
  actions,
  activeTab,
  onTabChange,
}: {
  title: string
  description: string
  actions?: ReactNode
  activeTab?: BillingTabValue
  onTabChange?: (value: BillingTabValue) => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const routeActiveTab = useMemo(() => getActiveBillingTab(pathname), [pathname])
  const resolvedActiveTab = activeTab ?? routeActiveTab
  const [displayedTab, setDisplayedTab] = useState(resolvedActiveTab)
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDisplayedTab(resolvedActiveTab)
  }, [resolvedActiveTab])

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-blue-400">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>

      <Tabs
        value={displayedTab}
        layoutId="billing-section-tabs"
        onValueChange={(value) => {
          const nextValue = value as BillingTabValue
          const nextTab = billingTabs.find((tab) => tab.value === nextValue)
          if (!nextTab) return

          setDisplayedTab(nextValue)

          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current)
          }

          if (onTabChange) {
            onTabChange(nextValue)
            return
          }

          if (nextTab.href !== pathname) {
            navigationTimeoutRef.current = setTimeout(() => {
              router.push(nextTab.href)
            }, 160)
          }
        }}
      >
        <TabsList className="w-full justify-start gap-x-6 border-b border-gray-200 bg-transparent px-0 pt-0">
          {billingTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="pb-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
