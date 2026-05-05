"use client"

import { useEffect, useRef, useState } from "react"
import NextLink from "next/link"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChartSquare02,
  Briefcase,
  CheckCircle,
  ChevronDown,
  CreditCard02,
  HelpCircle,
  LifeBuoy,
  Lock01,
  Plus,
  User,
} from "@blend-metrics/icons"
import {
  BillingTabValue,
  billingTabs,
  getActiveBillingTab,
} from "@/components/billing-section-header"
import { BillingTransactionsContent } from "@/components/billing-transactions-content"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Progress,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { BillingInvoicesContent } from "@/app/(group)/invoices/page"
import {
  BillingPaymentMethodsContent,
  BillingPaymentMethodsContentHandle,
} from "@/app/(group)/payments/page"

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

const myPlanFeatureRows = [
  { label: "Project posting", status: "active" as const, icon: Briefcase },
  { label: "Invites (20/mo)", status: "active" as const, icon: CheckCircle },
  {
    label: "Basic analytics",
    status: "active" as const,
    icon: BarChartSquare02,
  },
  { label: "Team collaboration", status: "active" as const, icon: User },
  { label: "Ad management", status: "premium" as const, icon: Lock01 },
  { label: "Custom analytics", status: "premium" as const, icon: Lock01 },
]

const inviteThresholdOptions = ["5 Invites", "10 Invites", "15 Invites"]

const inviteTopUpOptions = [
  "+10 invites for $20",
  "+20 invites for $20",
  "+30 invites for $45",
]

const managedAdFeatures = [
  "10x more visibility",
  "Lower fees",
  "Performance analytics",
  "Audience targeting & optimization",
  "Campaign setup",
  "Budget management",
  "Premium agency plan",
  "Monthly reporting & insights",
]

const faqColumns = [
  [
    {
      id: "carry-over-left",
      question: "What happens to my invites if I upgrade?",
      answer:
        "Unused invites from your current plan will carry over when you upgrade to a higher plan.",
    },
    {
      id: "renewal-left",
      question: "What happens to my invites if I upgrade?",
      answer:
        "Any invite add-ons stay available on your account and continue to apply before new monthly invite limits reset.",
    },
    {
      id: "switch-left",
      question: "Can I switch between Individual and Team billing?",
      answer:
        "Yes. You can change billing types from your plan settings and we’ll confirm the new billing cycle before the update takes effect.",
    },
    {
      id: "resources-left",
      question: "How do I access exclusive resources as a premium member?",
      answer:
        "Premium resources unlock automatically on your account after upgrade and stay available while your plan remains active.",
    },
  ],
  [
    {
      id: "carry-over-right",
      question: "What happens to my invites if I upgrade?",
      answer:
        "Unused invites from your current plan will carry over when you upgrade to a higher plan.",
    },
    {
      id: "ad-management-right",
      question: "What is Ad Management and how does it work?",
      answer:
        "Managed Ad Campaigns gives you a hands-on team for setup, optimization, and reporting so your campaign budget is spent more effectively.",
    },
    {
      id: "switch-right",
      question: "Can I switch between Individual and Team billing?",
      answer:
        "Yes. You can move between billing types as your workflow changes, and your next renewal will reflect the selected billing setup.",
    },
    {
      id: "resources-right",
      question: "How do I access exclusive resources as a premium member?",
      answer:
        "Premium members get access inside the billing area along with any linked support resources available to the upgraded plan.",
    },
  ],
] as const

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
                    planTab !== "individual" &&
                      "text-gray-400 hover:bg-transparent"
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
                  <span className="pb-0.5 text-base font-medium text-gray-500">
                    /mo
                  </span>
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
                  <p className="text-sm text-gray-500">
                    Last Updated 5/21/2025
                  </p>
                </div>
              ) : (
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {basicPlanFeatures.map((feature, index) => (
                    <div
                      key={`${feature}-${index}`}
                      className="flex items-center gap-2.5"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary-500" />
                      <span className="text-sm text-dark-blue-400">
                        {feature}
                      </span>
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
                  <h2 className="text-base font-semibold text-dark-blue-400">
                    Invites
                  </h2>
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary-500" />
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  You have{" "}
                  <span className="font-semibold text-dark-blue-400">
                    10 invites
                  </span>{" "}
                  remaining
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
                        payment.isCritical
                          ? "text-error-500"
                          : "text-dark-blue-400"
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
                        payment.isCritical
                          ? "text-error-500"
                          : "text-dark-blue-400"
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
                          payment.isCritical
                            ? "text-error-500"
                            : "text-dark-blue-400"
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
                        payment.isCritical
                          ? "text-error-500"
                          : "text-dark-blue-400"
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
              <h3 className="text-base font-semibold text-dark-blue-400">
                Questions?
              </h3>
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
                Our Support team is here to help with any questions you may
                have!
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

function BillingMyPlansContent() {
  const [planTab, setPlanTab] = useState<"individual" | "team">("team")
  const [inviteThreshold, setInviteThreshold] = useState(
    inviteThresholdOptions[0]
  )
  const [inviteTopUp, setInviteTopUp] = useState(inviteTopUpOptions[0])
  const [autoReplenish, setAutoReplenish] = useState(true)

  return (
    <div className="space-y-5 pb-2">
      <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-dark-blue-400">
                Premium Plan
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                This plan renews on March 26, 2025
              </p>
            </div>

            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
              <Button
                variant={planTab === "individual" ? "outlined" : "ghost"}
                visual="gray"
                size="sm"
                onClick={() => setPlanTab("individual")}
              >
                Individual
              </Button>
              <Button
                variant={planTab === "team" ? "outlined" : "ghost"}
                visual="gray"
                size="sm"
                onClick={() => setPlanTab("team")}
              >
                Team
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-end gap-1 text-dark-blue-400">
                <span className="text-3xl font-semibold leading-none">
                  $200
                </span>
                <span className="pb-0.5 text-base font-medium text-gray-500">
                  /mo
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-sm font-medium text-dark-blue-400">
                  Visa ending in 4292
                </p>
                <Button variant="link" visual="gray" size="sm">
                  Edit
                </Button>
              </div>
              <div className="mt-5">
                <Button size="sm">Change Plan</Button>
              </div>
            </div>

            <p className="text-sm text-gray-500">Last Updated 5/21/2025</p>
          </div>
        </div>

        <div className="my-6 border-t border-gray-200" />

        <div>
          <h3 className="text-base font-semibold text-dark-blue-400">
            Plan Usage
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Usage limits reset in 18 days
          </p>

          <div className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-dark-blue-400">
                  Invites
                </h4>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">10 of 25 invites sent</p>
            </div>

            <div className="mt-3">
              <Progress value={40} bubble={false} />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-error-300 bg-error-25 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-500" />
                <div>
                  <p className="text-sm font-semibold text-error-700">
                    5 invites left this month.
                  </p>
                  <p className="mt-1 text-sm text-error-700">
                    Upgrade to Premium for unlimited invites and advanced
                    analytics.
                  </p>
                </div>
              </div>

              <Button variant="outlined" visual="error" size="sm">
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {myPlanFeatureRows.map((feature) => {
            const Icon = feature.icon

            return (
              <section
                key={feature.label}
                className="rounded-lg border border-gray-200 bg-white px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <Icon className="size-5" />
                    </div>
                    <p className="text-sm font-medium capitalize text-dark-blue-400">
                      {feature.label}
                    </p>
                  </div>

                  {feature.status === "active" ? (
                    <Badge visual="success" size="sm">
                      Active
                    </Badge>
                  ) : (
                    <Badge visual="gray" size="sm">
                      <Lock01 className="size-3.5" />
                      Premium
                    </Badge>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-dark-blue-400">
                Top Up Your Invites
              </h3>
              <HelpCircle className="size-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              You have{" "}
              <span className="font-semibold text-dark-blue-400">
                15 invites
              </span>{" "}
              remaining. You can contact more contractors directly with
              additional invites. Choose a package below.
            </p>
          </div>

          <Button size="sm">Add Invites</Button>
        </div>

        <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-dark-blue-400">
                  Auto-Replenish Invites
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Tops up automatically when invites become low
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-dark-blue-400">
                  On
                </span>
                <Switch
                  checked={autoReplenish}
                  onCheckedChange={setAutoReplenish}
                  visual="blue"
                  size="sm"
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div>
                <p className="text-sm font-medium text-dark-blue-400">
                  Top up when below:
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {inviteThresholdOptions.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      visual={inviteThreshold === option ? "primary" : "gray"}
                      variant={
                        inviteThreshold === option ? "filled" : "outlined"
                      }
                      onClick={() => setInviteThreshold(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-dark-blue-400">
                  Add How Many:
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {inviteTopUpOptions.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      visual={inviteTopUp === option ? "primary" : "gray"}
                      variant={inviteTopUp === option ? "filled" : "outlined"}
                      onClick={() => setInviteTopUp(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Alert>
              <AlertIcon>
                <AlertCircle className="h-5 w-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>
                  <span className="font-semibold text-dark-blue-400">
                    You stay in control:
                  </span>{" "}
                  we&apos;ll charge VISA 4292. You get an email receipt each
                  time. Auto-replenish pauses if your card declines. Turn off
                  any time.
                </AlertDescription>
              </AlertContent>
            </Alert>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-dark-blue-400">
              Grow Your Agency with Managed Ad Campaigns
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Let us manage your ads on the platform. You focus on the work, we
              handle the visibility.
            </p>
          </div>

          <Button size="sm" leftIcon={<LifeBuoy className="size-4" />}>
            Talk to sales
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-dark-blue-400">
            Included in this service
          </p>
          <NextLink
            href="/help-center"
            className="text-sm font-semibold text-dark-blue-400 underline-offset-2 hover:underline"
          >
            Learn More
          </NextLink>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {managedAdFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5">
              <CheckCircle className="size-5 shrink-0 text-success-500" />
              <span className="text-sm font-medium capitalize text-dark-blue-400">
                {feature}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-3xl font-semibold leading-none text-dark-blue-400">
          $1,500
          <span className="ml-1 text-base font-medium text-gray-500">/mo</span>
          <span className="ml-2 text-sm font-medium text-dark-blue-400">
            + Your Ad Budget
          </span>
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 md:p-6">
        <div>
          <h3 className="text-base font-semibold text-dark-blue-400">
            Frequently Asked Questions
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Quick answers about invites, billing changes, and premium plan
            access.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {faqColumns.map((column, columnIndex) => (
            <div key={`faq-column-${columnIndex}`} className="space-y-3">
              {column.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={
                      item.id === column[0].id ? item.id : undefined
                    }
                  >
                    <AccordionItem value={item.id}>
                      <AccordionTrigger>
                        <div className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left">
                          <span className="text-sm font-semibold text-dark-blue-400">
                            {item.question}
                          </span>
                          <ChevronDown className="mt-0.5 size-5 shrink-0 text-gray-500" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-gray-500">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-25 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-dark-blue-400">
                Still have questions about plans?
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Our support team can help with billing, upgrades, and invite
                limits.
              </p>
            </div>

            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              leftIcon={<HelpCircle className="size-4" />}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTabValue>("overview")
  const paymentMethodsRef = useRef<BillingPaymentMethodsContentHandle | null>(
    null
  )

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
        <Button
          variant="link"
          visual="gray"
          size="sm"
          className="text-gray-500"
          leftIcon={<HelpCircle className="size-4" />}
        >
          Get Help
        </Button>
        <Button
          onClick={() =>
            paymentMethodsRef.current?.openAddPaymentMethodDialog()
          }
          leftIcon={<Plus className="size-4" />}
        >
          Add Payment Method
        </Button>
      </>
    ) : null

  return (
    <AuthenticatedRoute>
      <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
        <LeftSidebar />

        <div className="flex h-full flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          <div className="mx-auto flex h-full min-w-0 max-w-[1160px] flex-1 flex-col gap-5 overflow-hidden">
            <Tabs
              value={activeTab}
              layoutId="billing-section-tabs"
              onValueChange={(value) =>
                handleTabChange(value as BillingTabValue)
              }
              className="flex h-full min-h-0 flex-col overflow-hidden"
            >
              <div className="shrink-0 space-y-6">
                <div className="flex flex-col gap-3 lg:min-h-10 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-dark-blue-400">
                      Billing
                    </h1>
                  </div>

                  {headerActions ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      {headerActions}
                    </div>
                  ) : null}
                </div>

                <TabsList className="w-full justify-start gap-x-6 border-b border-gray-200 bg-transparent px-0 pt-0">
                  {billingTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="pb-3"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent
                value="overview"
                className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <BillingOverviewContent onNavigateTab={handleTabChange} />
              </TabsContent>

              <TabsContent
                value="transactions"
                className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <BillingTransactionsContent />
              </TabsContent>

              <TabsContent
                value="invoices"
                className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <BillingInvoicesContent />
              </TabsContent>

              <TabsContent
                value="payment-methods"
                className="mt-5 min-h-0 flex-1 overflow-hidden"
              >
                <BillingPaymentMethodsContent
                  ref={paymentMethodsRef}
                  embedded
                />
              </TabsContent>

              <TabsContent
                value="my-plans"
                className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <BillingMyPlansContent />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
