"use client"

import NextLink from "next/link"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CreditCard02,
  LifeBuoy,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Card,
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

function SegmentPill({ active }: { active: "individual" | "team" }) {
  return (
    <div className="inline-flex items-center rounded-[10px] border border-gray-200 bg-gray-50 p-1">
      <Button
        variant={active === "individual" ? "outlined" : "ghost"}
        visual="gray"
        size="sm"
        className={cn(
          "h-8 px-3 text-xs font-semibold shadow-none",
          active !== "individual" && "text-gray-400 hover:bg-transparent"
        )}
      >
        Individual
      </Button>
      <Button
        variant={active === "team" ? "outlined" : "ghost"}
        visual="gray"
        size="sm"
        className={cn(
          "h-8 px-3 text-xs font-semibold shadow-none",
          active !== "team" && "text-gray-400 hover:bg-transparent"
        )}
      >
        Team
      </Button>
    </div>
  )
}

export default function BillingPage() {
  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto overflow-hidden bg-black p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          <div className="mx-auto max-w-[1160px] space-y-6">
            <Alert variant="error" className="rounded-none border-x-0 border-b-0 border-t border-error-200 bg-error-25 px-4 py-3">
              <AlertIcon>
                <AlertTriangle className="h-5 w-5" />
              </AlertIcon>
              <AlertContent className="flex items-center justify-between gap-3">
                <AlertTitle className="text-sm font-medium text-error-700">
                  The Payment failed. Update your payment method.
                </AlertTitle>
                <Button
                  asChild
                  variant="link"
                  visual="error"
                  size="sm"
                  className="text-sm font-semibold"
                >
                  <NextLink href="/payments">
                    Manage Payment Method
                    <ArrowRight className="h-4 w-4" />
                  </NextLink>
                </Button>
              </AlertContent>
            </Alert>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-6">
                <Card className="block rounded-2xl border-gray-200 p-6 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                        Premium Plan
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        This plan Renews On March 26, 2025
                      </p>
                    </div>
                    <SegmentPill active="individual" />
                  </div>

                  <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="flex items-end gap-1 text-dark-blue-400">
                        <span className="text-5xl font-semibold leading-none">$52</span>
                        <span className="pb-1 text-xl font-medium text-gray-500">/mo</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-dark-blue-400">
                        Visa ending in 4292
                      </p>
                      <Button className="mt-5">Upgrade Plan</Button>
                    </div>

                    <p className="text-sm text-gray-500">Last Updated 5/21/2025</p>
                  </div>
                </Card>

                <Card className="block rounded-2xl border-gray-200 p-6 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                        Basic Plan
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        Everything you need to get started.
                      </p>
                    </div>
                    <SegmentPill active="team" />
                  </div>

                  <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <div className="flex items-end gap-1 text-dark-blue-400">
                        <span className="text-5xl font-semibold leading-none">$0</span>
                        <span className="pb-1 text-xl font-medium text-gray-500">/mo</span>
                      </div>
                      <Button className="mt-5">Upgrade Plan</Button>
                    </div>

                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {basicPlanFeatures.map((feature) => (
                        <div key={feature} className="flex items-center gap-2.5">
                          <CheckCircle className="h-4 w-4 shrink-0 text-dark-blue-400" />
                          <span className="text-sm font-medium text-dark-blue-400">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card className="block rounded-2xl border-gray-200 p-6 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                          Invites
                        </h2>
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-dark-blue-400" />
                      </div>
                      <p className="mt-6 text-sm text-gray-500">
                        You have <span className="font-semibold text-dark-blue-400">10 invites</span> remaining
                      </p>
                    </div>

                    <Button>Buy More Invites</Button>
                  </div>
                </Card>

                <Card className="block rounded-2xl border-gray-200 p-6 shadow-none hover:border-gray-200 hover:ring-0">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                        Upcoming Payments
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        view and pay for upcoming payments on your account.
                      </p>
                    </div>

                    <Button
                      asChild
                      variant="link"
                      visual="gray"
                      size="sm"
                      className="justify-start p-0 text-base font-semibold text-dark-blue-400 hover:no-underline"
                    >
                      <NextLink href="/payments">Manage Payment Methods</NextLink>
                    </Button>
                  </div>

                  <div className="mt-6 space-y-4">
                    {upcomingPayments.map((payment) => (
                      <div
                        key={`${payment.title}-${payment.account}`}
                        className={cn(
                          "grid gap-4 rounded-xl border border-gray-300 px-4 py-4 md:grid-cols-[1.8fr_1.1fr_1.3fr_0.9fr]",
                          payment.isCritical && "border-error-300"
                        )}
                      >
                        <div>
                          <p
                            className={cn(
                              "text-base font-semibold",
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
                              "text-base font-semibold",
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
                            <p className="text-base font-semibold text-dark-blue-400">
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
                                "text-base font-semibold",
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
                    asChild
                    variant="link"
                    visual="gray"
                    size="sm"
                    className="mt-5 justify-start p-0 text-base font-semibold text-dark-blue-400 hover:no-underline"
                  >
                    <NextLink href="/payments">
                      View All Payments
                      <ArrowRight className="h-4 w-4" />
                    </NextLink>
                  </Button>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="block rounded-2xl border-gray-200 p-6 shadow-none hover:border-gray-200 hover:ring-0">
                  <div>
                    <h3 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                      Questions?
                    </h3>
                    <p className="mt-5 max-w-[200px] text-sm text-dark-blue-400">
                      For more information on billing and membership plans Visit our{" "}
                      <NextLink
                        href="/help-center"
                        className="font-semibold underline underline-offset-2"
                      >
                        Help Center
                      </NextLink>
                    </p>
                  </div>

                  <div className="my-6 border-t border-gray-200" />

                  <div>
                    <h3 className="text-[34px] font-semibold leading-none text-dark-blue-400">
                      Billing Support
                    </h3>
                    <p className="mt-5 text-sm text-dark-blue-400">
                      Our Support team is here to help with any questions you may have!
                    </p>

                    <Button className="mt-5" leftIcon={<LifeBuoy className="h-4 w-4" />}>
                      Get Help
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
