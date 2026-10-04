"use client"

/**
 * /recovery-email/confirm — confirmation landing for the recovery email link.
 *
 * This is what auth-service's buildRecoveryEmailConfirmUrl points at. Reached
 * from a mail client, so it must work fully logged out and on a different
 * device from the one that made the request: the single-use token is the
 * credential, and that is the whole point of the flow.
 *
 * Deliberately a real screen rather than the raw JSON the API returns — the
 * person following this link is reading their email, not calling an API.
 */
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, X } from "@blend-metrics/icons"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Button } from "@/components/ui"
import { Spinner } from "@/components/ui/spinner/spinner"
import { AuthAPI } from "@/service/http/auth"

type State =
  | { kind: "loading" }
  | { kind: "success"; address: string }
  | { kind: "invalid"; message: string }
  | { kind: "network-error" }

function ConfirmRecoveryEmail() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const [state, setState] = useState<State>({ kind: "loading" })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!token) {
      setState({
        kind: "invalid",
        message:
          "This link is missing its confirmation code. Open the link from your email directly rather than copying part of it.",
      })
      return
    }

    let cancelled = false
    AuthAPI.VerifyRecoveryEmail({ token })
      .then((res) => {
        if (cancelled) return
        const data = (res as any)?.data ?? res
        setState({ kind: "success", address: data?.recoveryEmail ?? "" })
        // The result belongs on the Account Recovery screen, which is where
        // the design puts it. Verification has already happened here, so a
        // signed-out person who gets bounced to sign-in still ends up
        // confirmed — they simply miss the toast.
        router.replace("/settings/account-recovery?recovery=confirmed")
      })
      .catch((error) => {
        if (cancelled) return
        const response = (error as any)?.response
        // No response at all means we never reached the server — the link may
        // be perfectly valid, so offer a retry instead of calling it invalid.
        if (!response) {
          setState({ kind: "network-error" })
          return
        }
        const message = response?.data?.message
        setState({
          kind: "invalid",
          message: Array.isArray(message)
            ? message[0]
            : (message ??
              "That confirmation link is not valid. It may already have been used."),
        })
        router.replace("/settings/account-recovery?recovery=not-found")
      })

    return () => {
      cancelled = true
    }
  }, [token, retryTick, router])

  return (
    <>
      <div className="flex h-[64px] items-center px-5 md:px-[100px]">
        <Link href="/">
          <MarketeqLogo />
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5">
        <div className="w-full max-w-[467px] rounded-lg border border-gray-200 bg-white p-10 text-center shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
          {state.kind === "loading" && (
            <>
              <div className="mx-auto flex justify-center">
                <Spinner
                  size={32}
                  className="stroke-primary-500"
                  trackClassName="stroke-gray-200"
                  strokeWidth={2}
                />
              </div>
              <h1 className="mt-5 text-xl font-bold text-dark-blue-400">
                Confirming your recovery email…
              </h1>
            </>
          )}

          {state.kind === "network-error" && (
            <>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gray-100">
                <X className="size-7 text-gray-500" />
              </div>
              <h1 className="mt-5 text-2xl font-bold leading-none text-dark-blue-400">
                Connection Problem
              </h1>
              <p className="mt-3 text-sm font-light text-gray-500">
                You appear to be offline, or we couldn&apos;t reach the server.
                Your link is still valid — check your connection and try again.
              </p>
              <div className="mt-8">
                <Button onClick={() => setRetryTick((t) => t + 1)}>
                  Try Again
                </Button>
              </div>
            </>
          )}

          {state.kind === "success" && (
            <>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-100">
                <Check className="size-7 text-success-600" />
              </div>
              <h1 className="mt-5 text-2xl font-bold leading-none text-dark-blue-400">
                Recovery Email Confirmed
              </h1>
              <p className="mt-3 text-sm font-light text-gray-500">
                {state.address ? (
                  <>
                    <span className="font-semibold text-gray-900">
                      {state.address}
                    </span>{" "}
                    can now be used to recover your account.
                  </>
                ) : (
                  "This address can now be used to recover your account."
                )}
              </p>
              <div className="mt-8">
                <Button asChild>
                  <Link href="/settings/account-recovery">
                    Back to Account Recovery
                  </Link>
                </Button>
              </div>
            </>
          )}

          {state.kind === "invalid" && (
            <>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gray-100">
                <X className="size-7 text-gray-500" />
              </div>
              <h1 className="mt-5 text-2xl font-bold leading-none text-dark-blue-400">
                Link Not Valid
              </h1>
              <p className="mt-3 text-sm font-light text-gray-500">
                {state.message}
              </p>
              <div className="mt-8">
                <Button asChild>
                  <Link href="/settings/account-recovery">
                    Back to Account Recovery
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ConfirmRecoveryEmailPage() {
  return (
    <Suspense>
      <ConfirmRecoveryEmail />
    </Suspense>
  )
}
