"use client"

import NextLink from "next/link"
import { useEffect, useRef, useState } from "react"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  BillingTabValue,
  billingTabs,
  getActiveBillingTab,
} from "@/components/billing-section-header"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  BillingInvoicesContent,
} from "@/app/(group)/invoices/page"
import {
  BillingPaymentMethodsContent,
  BillingPaymentMethodsContentHandle,
} from "@/app/(group)/payments/page"
import {
  BillingTransactionsContent,
} from "@/components/billing-transactions-content"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CreditCard02,
  HelpCircle,
  LifeBuoy,
  Plus,
} from "@blend-metrics/icons"
import {
  Badge,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { cn } from "@/utils/functions"

const basicPlanFeatures = [
  "Collaborate with 10 members",
  "Collaborate with 10 members",
  "Seamless Collaborations",
  "Collaborate with 10 members",
  "Collaborate with 10 members",
  "View More Features",
]

const upcomingPayments = [
  {
    title: "Hourly Payment for “Chris @UXde...”",
    subtitle: "Renews Quarterly on March 26th",
    status: "Payment Overdue!",
    statusDate: "26 Feb 2026",
    method: "ACH",
    account: "Checking(...6594)",
    accountStatus: "Account Closed",
    product: "Membership",
    amount: "$ 2420",
    isCritical: true,
  },
  {
    title: "15 Invites",
    subtitle: "Renews Quarterly on March 26th",
    status: "Scheduled Today",
    statusDate: "26 Feb 2026",
    method: "",
    account: "Split(3 Methods)",
    accountStatus: "",
    product: "Top-Up",
    amount: "$ 2420",
    isCritical: false,
  },
  {
    title: "Agency Premium Plan",
    subtitle: "Renews Quarterly on March 26th",
    status: "Scheduled in 5 days",
    statusDate: "05 March 2026",
    method: "ACH",
    account: "Checking(...6594)",
    accountStatus: "Card Expired",
    product: "Membership",
    amount: "$ 2420",
    isCritical: false,
  },
]

function BillingOverviewContent({
  onNavigateTab,
}: {
  onNavigateTab: (tab: BillingTabValue) => void
}) {
  const [planTab, setPlanTab] = useState<"individual" | "team">("individual")

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-error-200 bg-error-25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-error-500" />
          <p className="text-sm font-medium text-error-700">
            The Payment failed. Update your payment method.
          </p>
        </div>
        <Button
          variant="link"
          visual="error"
          size="sm"
          className="justify-start p-0 text-sm font-semibold hover:underline"
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={() => onNavigateTab("payment-methods")}
        >
          Manage Payment Method
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-dark-blue-400">
                  {planTab === "individual" ? "Premium Plan" : "Basic Plan"}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {planTab === "individual"
                    ? "This plan Renews On March 26, 2025"
                    : "Everything you need to get started."}
                </p>
              </div>
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
                <Button
                  variant={planTab === "individual" ? "outlined" : "ghost"}
                  visual="gray"
                  size="sm"
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold shadow-none",
                    planTab !== "individual" && "text-gray-400 hover:bg-transparent"
                  )}
                  onClick={() => setPlanTab("individual")}
                >
                  Individual
                </Button>
                <Button
                  variant={planTab === "team" ? "outlined" : "ghost"}
                  visual="gray"
                  size="sm"
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold shadow-none",
                    planTab !== "team" && "text-gray-400 hover:bg-transparent"
                  )}
                  onClick={() => setPlanTab("team")}
                >
                  Team
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <div className="flex items-end gap-1 text-dark-blue-400">
                  <span className="text-3xl font-semibold leading-none">
                    {planTab === "individual" ? "$52" : "$0"}
                  </span>
                  <span className="pb-0.5 text-base font-medium text-gray-500">/mo</span>
                </div>
                {planTab === "individual" && (
                  <p className="mt-3 text-sm font-medium text-dark-blue-400">
                    Visa ending in 4292
                  </p>
                )}
                <Button size="sm" className="mt-5">
                  Upgrade Plan
                </Button>
              </div>

              {planTab === "individual" ? (
                <div className="flex items-end justify-end">
                  <p className="text-sm text-gray-500">Last Updated 5/21/2025</p>
                </div>
              ) : (
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {basicPlanFeatures.map((feature, index) => (
                    <div key={`${feature}-${index}`} className="flex items-center gap-2.5">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary-500" />
                      <span className="text-sm text-dark-blue-400">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-dark-blue-400">Invites</h2>
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary-500" />
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  You have <span className="font-semibold text-dark-blue-400">10 invites</span> remaining
                </p>
              </div>

              <Button size="sm" variant="outlined" visual="gray">
                Buy More Invites
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-dark-blue-400">
                  Upcoming Payments
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  view and pay for upcoming payments on your account.
                </p>
              </div>

              <Button
                variant="link"
                visual="gray"
                size="sm"
                className="justify-start p-0 text-sm font-semibold text-dark-blue-400 hover:text-primary-500 hover:underline"
                onClick={() => onNavigateTab("payment-methods")}
              >
                Manage Payment Methods
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {upcomingPayments.map((payment) => (
                <div
                  key={`${payment.title}-${payment.account}`}
                  className={cn(
                    "grid gap-4 rounded-lg border border-gray-200 px-4 py-4 transition hover:border-gray-300 hover:bg-gray-50 md:grid-cols-[1.8fr_1.1fr_1.3fr_0.9fr]",
                    payment.isCritical && "border-error-300"
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        payment.isCritical ? "text-error-500" : "text-dark-blue-400"
                      )}
                    >
                      {payment.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        payment.isCritical ? "text-error-500" : "text-gray-500"
                      )}
                    >
                      {payment.subtitle}
                    </p>
                  </div>

                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        payment.isCritical ? "text-error-500" : "text-dark-blue-400"
                      )}
                    >
                      {payment.status}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        payment.isCritical ? "text-error-500" : "text-gray-500"
                      )}
                    >
                      {payment.statusDate}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    {payment.method ? (
                      <Badge
                        visual="gray"
                        size="sm"
                        className="mt-0.5 rounded-md border border-gray-300 bg-white px-2 text-[11px] font-semibold text-dark-blue-400"
                      >
                        {payment.method}
                      </Badge>
                    ) : (
                      <CreditCard02 className="mt-0.5 h-4 w-4 text-gray-400" />
                    )}

                    <div>
                      <p className="text-sm font-semibold text-dark-blue-400">
                        {payment.account}
                      </p>
                      {!!payment.accountStatus && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-sm text-error-500">
                            {payment.accountStatus}
                          </span>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-semibold text-white">
                            !
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          payment.isCritical ? "text-error-500" : "text-dark-blue-400"
                        )}
                      >
                        {payment.product}
                      </p>
                      {payment.isCritical && (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-semibold text-white">
                          !
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium",
                        payment.isCritical ? "text-error-500" : "text-dark-blue-400"
                      )}
                    >
                      {payment.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="link"
              visual="gray"
              size="sm"
              className="mt-4 justify-start p-0 text-sm font-semibold text-dark-blue-400 hover:text-primary-500 hover:underline"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => onNavigateTab("transactions")}
            >
              View All Payments
            </Button>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
            <div>
              <h3 className="text-base font-semibold text-dark-blue-400">Questions?</h3>
              <p className="mt-4 max-w-[220px] text-sm text-dark-blue-400">
                For more information on billing and membership plans Visit our{" "}
                <NextLink
                  href="/help-center"
                  className="font-semibold underline underline-offset-2"
                >
                  Help Center
                </NextLink>
              </p>
            </div>

            <div className="my-5 border-t border-gray-200" />

            <div>
              <h3 className="text-base font-semibold text-dark-blue-400">
                Billing Support
              </h3>
              <p className="mt-4 text-sm text-dark-blue-400">
                Our Support team is here to help with any questions you may have!
              </p>

              <Button
                size="sm"
                variant="outlined"
                visual="gray"
                className="mt-5"
                leftIcon={<LifeBuoy className="h-4 w-4" />}
              >
                Get Help
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTabValue>("overview")
  const paymentMethodsRef = useRef<BillingPaymentMethodsContentHandle | null>(null)

  useEffect(() => {
    const syncTabFromLocation = () => {
      setActiveTab(getActiveBillingTab(window.location.pathname))
    }

    syncTabFromLocation()
    window.addEventListener("popstate", syncTabFromLocation)

    return () => {
      window.removeEventListener("popstate", syncTabFromLocation)
    }
  }, [])

  const handleTabChange = (value: BillingTabValue) => {
    setActiveTab(value)

    const nextTab = billingTabs.find((tab) => tab.value === value)
    if (nextTab && window.location.pathname !== nextTab.href) {
      window.history.pushState({}, "", nextTab.href)
    }
  }

  const headerActions =
    activeTab === "payment-methods" ? (
      <>
        <Button variant="ghost" visual="gray" size="sm" leftIcon={<HelpCircle className="size-4" />}>
          Get Help
        </Button>
        <Button
          onClick={() => paymentMethodsRef.current?.openAddPaymentMethodDialog()}
          leftIcon={<Plus className="size-4" />}
        >
          Add payment method
        </Button>
      </>
    ) : null

  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          <div className="mx-auto max-w-[1160px] space-y-5 min-w-0">
            <Tabs
              value={activeTab}
              layoutId="billing-section-tabs"
              onValueChange={(value) => handleTabChange(value as BillingTabValue)}
            >
              <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-dark-blue-400">Billing</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage your plan, billing activity, invoices, and payment methods.
                    </p>
                  </div>

                  {headerActions ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {headerActions}
                    </div>
                  ) : null}
                </div>

                <TabsList className="w-full justify-start gap-x-6 border-b border-gray-200 bg-transparent px-0 pt-0">
                  {billingTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="pb-3">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-5">
                <BillingOverviewContent onNavigateTab={handleTabChange} />
              </TabsContent>

              <TabsContent value="transactions" className="mt-5">
                <BillingTransactionsContent />
              </TabsContent>

              <TabsContent value="invoices" className="mt-5">
                <BillingInvoicesContent />
              </TabsContent>

              <TabsContent value="payment-methods" className="mt-5 h-[calc(100dvh-230px)] min-h-0">
                <BillingPaymentMethodsContent ref={paymentMethodsRef} embedded />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
