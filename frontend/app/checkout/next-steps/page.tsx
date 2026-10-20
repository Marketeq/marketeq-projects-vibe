"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCheckout } from "@/contexts/checkout"
import { useAuth } from "@/contexts/auth"
import {
  AlertCircle,
  CalendarPlus02,
  CheckCircle,
  File02,
  Home03,
  Link01,
  RefreshCw01,
  UserCheck01,
  UsersPlus,
} from "@blend-metrics/icons"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import { MarketplaceFooter } from "@/components/marketplace-footer"
import { Button } from "@/components/ui"

type LoadState = "loading" | "ready" | "error" | "timeout"

type ChecklistItem = {
  id: string
  title: string
  description: string
  cta: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const checklistItems: ChecklistItem[] = [
  {
    id: "invite-stakeholders",
    title: "Invite Stakeholders",
    description:
      "If you haven't already, start inviting your stakeholders to the project",
    cta: "Invite Stakeholders",
    icon: UsersPlus,
  },
  {
    id: "review-guidelines",
    title: "Review Guidelines",
    description:
      "Get in touch with your account manager and go over the initial project guidelines",
    cta: "Schedule A Call",
    icon: File02,
  },
  {
    id: "plan-meeting",
    title: "Plan a Meeting",
    description:
      "Schedule an appointment with your project manager and your stakeholders",
    cta: "Schedule A Meeting",
    icon: CalendarPlus02,
  },
  {
    id: "verify-contact",
    title: "Verify Contact Info",
    description:
      "Confirm your email and phone number to ensure seamless communication throughout the project",
    cta: "Confirm Your Info",
    icon: UserCheck01,
  },
  {
    id: "link-accounts",
    title: "Link Accounts",
    description:
      "Integrate your accounts to maximize the features and efficiency of Marketeq Projects",
    cta: "Connect Your Accounts",
    icon: Link01,
  },
]

export default function NextStepsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthChecked, isLoading, user } = useAuth()
  const checkout = useCheckout()
  const slug = safeDecodeSlug(
    checkout.slug ?? searchParams.get("username") ?? ""
  )
  const [loadState, setLoadState] = React.useState<LoadState>("loading")
  const [toastMessage, setToastMessage] = React.useState("")
  const [sessionExpired, setSessionExpired] = React.useState(false)

  const showToast = React.useCallback((message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(""), 4000)
  }, [])

  const loadNextSteps = React.useCallback(() => {
    setLoadState("loading")

    const timeoutId = window.setTimeout(() => {
      setLoadState((currentState) =>
        currentState === "loading" ? "timeout" : currentState
      )
    }, 10_000)

    const loadId = window.setTimeout(() => {
      setLoadState("ready")
      window.clearTimeout(timeoutId)
    }, 650)

    return () => {
      window.clearTimeout(loadId)
      window.clearTimeout(timeoutId)
    }
  }, [slug])

  React.useEffect(() => loadNextSteps(), [loadNextSteps])

  React.useEffect(() => {
    if (!isAuthChecked || isLoading) return
    if (!user) {
      setSessionExpired(true)
    }
  }, [isAuthChecked, isLoading, user])

  React.useEffect(() => {
    window.history.pushState(null, "", window.location.href)

    const handleBackNavigation = () => {
      router.replace("/client-dashboard")
    }

    window.addEventListener("popstate", handleBackNavigation)
    return () => window.removeEventListener("popstate", handleBackNavigation)
  }, [router])

  const handleDashboardNavigation = () => {
    try {
      router.push("/client-dashboard")
    } catch {
      showToast(
        "We were unable to redirect you to your project dashboard. Please try again or contact support."
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[64px]">
      <CheckoutNavigation currentStep={3} allStepsCompleted logoHref="" />

      {toastMessage ? (
        <div className="fixed bottom-6 left-6 z-50 rounded-md bg-black px-5 py-4 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}

      {sessionExpired ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-blue-400/40 px-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-x-3">
              <AlertCircle className="size-6 shrink-0 text-error-500" />
              <div>
                <h2 className="text-lg font-semibold text-dark-blue-400">
                  Your session has expired
                </h2>
                <p className="mt-2 text-sm font-light text-dark-blue-400">
                  Please log in again to continue.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => router.push("/sign-in")}>Log In</Button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1140px] px-8 py-10">
        <section className="text-center">
          <div className="mx-auto inline-flex size-[86px] items-center justify-center rounded-full border-[13px] border-success-50 bg-success-100 text-success-500">
            <CheckCircle className="size-[42px]" />
          </div>

          <p className="mt-8 text-2xl font-medium text-dark-blue-400">
            So you&apos;ve launched your project...
          </p>
          <h1 className="mt-4 text-4xl font-light text-dark-blue-400">
            That&apos;s pretty{" "}
            <span className="font-bold text-success-400">Awesome</span>!
            You&apos;re ready to start
          </h1>
          <p className="mt-4 text-xl font-light text-dark-blue-400">
            Here&apos;s some things you can do to get your project going in the
            right direction.
          </p>
        </section>

        {loadState === "error" || loadState === "timeout" ? (
          <div className="mt-8 rounded-lg border border-error-200 bg-error-50 p-4 text-error-700">
            <div className="flex items-start justify-between gap-x-4">
              <div className="flex items-start gap-x-3">
                <AlertCircle className="size-5 shrink-0" />
                <p className="text-sm font-semibold">
                  {loadState === "timeout"
                    ? "Connection timed out. Please check your internet connection and try again."
                    : "We were unable to load your next steps. Please try again or contact support."}
                </p>
              </div>
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                onClick={loadNextSteps}
              >
                <RefreshCw01 className="size-[15px]" />
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        <section className="mt-[50px] grid gap-y-4">
          {loadState === "loading"
            ? checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="h-[76px] animate-pulse rounded-lg border border-gray-200 bg-white p-6"
                >
                  <div className="h-4 w-1/4 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
                </div>
              ))
            : checklistItems.map((item) => {
                const ItemIcon = item.icon
                return (
                  <article
                    key={item.id}
                    className="flex items-center justify-between gap-x-4 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                  >
                    <div className="flex min-w-0 flex-auto items-center gap-x-5">
                      <ItemIcon className="size-8 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-dark-blue-400">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-sm font-light text-dark-blue-400">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <Button variant="outlined" visual="gray">
                      {item.cta}
                    </Button>
                  </article>
                )
              })}
        </section>

        <div className="mt-6 flex justify-end">
          <Button
            variant="link"
            visual="gray"
            onClick={handleDashboardNavigation}
          >
            <Home03 className="size-[15px]" />
            Go To Dashboard
          </Button>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  )
}
