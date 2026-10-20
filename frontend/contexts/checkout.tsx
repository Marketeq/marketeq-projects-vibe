"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  notFound,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
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
  Dialog,
  DialogContent,
} from "@/components/ui"

type CheckoutContextValue = {
  sessionId: string
  session: CheckoutSession | null
  slug: string | null
  listingId: string | null
  updateSession: (session: CheckoutSession) => void
}

const CheckoutContext = createContext<CheckoutContextValue>({
  sessionId: "",
  session: null,
  slug: null,
  listingId: null,
  updateSession: () => undefined,
})

type LoadState = {
  sessionId: string
  status: "loading" | "ready" | "error" | "unauthorized" | "notFound"
  session: CheckoutSession | null
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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
      .catch((error) => {
        if (!isActive) return
        const status = (error as { response?: { status?: number } })?.response
          ?.status
        setLoadState({
          sessionId,
          status: status === 401 ? "unauthorized" : "error",
          session: null,
        })
      })
    return () => {
      isActive = false
    }
  }, [sessionId, retryKey])

  const session = loadState.sessionId === sessionId ? loadState.session : null
  const updateSession = useCallback(
    (nextSession: CheckoutSession) =>
      setLoadState((current) =>
        current.sessionId === sessionId
          ? { ...current, session: nextSession }
          : current
      ),
    [sessionId]
  )
  const value = useMemo<CheckoutContextValue>(
    () => ({
      sessionId,
      session,
      slug: session?.slug ?? null,
      listingId: session?.listingId ?? null,
      updateSession,
    }),
    [sessionId, session, updateSession]
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

  if (sessionId && loadState.status === "unauthorized") {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            Your session has expired
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            Please log in again to continue.
          </p>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() =>
                router.push(
                  `/sign-in?redirect=${encodeURIComponent(
                    `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
                  )}`
                )
              }
            >
              Log In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
                Please try again or contact support.
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
