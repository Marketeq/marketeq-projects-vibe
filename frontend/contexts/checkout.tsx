"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { AlertCircle } from "@blend-metrics/icons"
import {
  type CheckoutSession,
  getCheckoutSession,
} from "@/lib/checkout/session"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
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
  status: "loading" | "ready" | "error"
  session: CheckoutSession | null
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sessionId = pathname.startsWith("/checkout/")
    ? (searchParams.get("sessionId") ?? "")
    : ""
  const [loadState, setLoadState] = useState<LoadState>({
    sessionId: "",
    status: "ready",
    session: null,
  })

  useEffect(() => {
    if (!sessionId) return
    let isActive = true
    setLoadState({ sessionId, status: "loading", session: null })
    getCheckoutSession(sessionId).then((session) => {
      if (!isActive) return
      setLoadState({
        sessionId,
        status: session ? "ready" : "error",
        session,
      })
    })
    return () => {
      isActive = false
    }
  }, [sessionId])

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
                Please start checkout again from the project page.
              </AlertDescription>
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
