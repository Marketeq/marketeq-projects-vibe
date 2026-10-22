"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { notFound, usePathname, useSearchParams } from "next/navigation"
import { AlertCircle } from "@blend-metrics/icons"
import {
  type CheckoutSession,
  getCheckoutSession,
} from "@/lib/checkout/session"
import { isCheckoutSessionAllowed } from "@/lib/checkout/step-access"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
} from "@/components/ui"

type CheckoutContextValue = {
  sessionId: string
  session: CheckoutSession | null
  slug: string | null
  listingId: string | null
}

const CheckoutContext = createContext<CheckoutContextValue>({
  sessionId: "",
  session: null,
  slug: null,
  listingId: null,
})

type LoadState = {
  sessionId: string
  status: "loading" | "ready" | "error" | "notFound"
  session: CheckoutSession | null
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isListingStep = pathname.startsWith("/checkout/project-details")
  const isSessionStep =
    pathname.startsWith("/checkout/") &&
    !isListingStep &&
    !pathname.startsWith("/checkout/cancel") &&
    !pathname.startsWith("/checkout/success")
  const sessionId = isSessionStep ? (searchParams.get("sessionId") ?? "") : ""
  const [loadState, setLoadState] = useState<LoadState>({
    sessionId: "",
    status: "ready",
    session: null,
  })

  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    let isActive = true
    setLoadState({ sessionId, status: "loading", session: null })
    getCheckoutSession(sessionId)
      .then((session) => {
        if (!isActive) return
        setLoadState({
          sessionId,
          status: session ? "ready" : "notFound",
          session,
        })
      })
      .catch(() => {
        if (!isActive) return
        setLoadState({ sessionId, status: "error", session: null })
      })
    return () => {
      isActive = false
    }
  }, [sessionId, retryKey])

  const session = loadState.sessionId === sessionId ? loadState.session : null
  const value = useMemo<CheckoutContextValue>(
    () => ({
      sessionId,
      session,
      slug: session?.slug ?? null,
      listingId: session?.listingId ?? null,
    }),
    [sessionId, session]
  )

  if (isListingStep && !(searchParams.get("listingId") ?? "").trim()) {
    notFound()
  }

  if (isSessionStep && !sessionId) {
    notFound()
  }

  if (
    sessionId &&
    loadState.sessionId === sessionId &&
    loadState.status === "notFound"
  ) {
    notFound()
  }

  if (session && !isCheckoutSessionAllowed(pathname, session.status)) {
    notFound()
  }

  if (
    sessionId &&
    (loadState.sessionId !== sessionId || loadState.status === "loading")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} strokeWidth={3} />
      </div>
    )
  }

  if (sessionId && loadState.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-[50px]">
        <div className="w-full max-w-[600px]">
          <Alert variant="error" className="items-center p-5">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>We were unable to load your checkout</AlertTitle>
              <AlertDescription className="mt-1">
                Please try again or start checkout again from the project page.
              </AlertDescription>
              <Button
                variant="filled"
                className="mt-4"
                onClick={() => setRetryKey((count) => count + 1)}
              >
                Try Again
              </Button>
            </AlertContent>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  )
}

export const useCheckout = () => useContext(CheckoutContext)
