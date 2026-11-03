"use client"

/**
 * /verify-withdrawal — Magic-link confirmation landing page (US-18/19/20/21).
 * This is the page payout-service's MAGIC_LINK_BASE_URL points at
 * (see backend/apps/payout-service/src/magic-link/magic-link.service.ts).
 * Reached via a single-use email link — must work fully logged out
 * (AC-18.05/18.06): the token itself is the credential for this action,
 * on any device, in any browser session.
 */
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Spinner } from "@/components/ui/spinner/spinner"
import { Button } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { useAuth } from "@/contexts/auth"
import { useIdentityVerification } from "@/contexts/identity-verification-host"
import { withdrawalBlockFor, type WithdrawalVerificationBlock } from "@/src/lib/api/withdrawal-verification"
import { Bank, Check, X } from "@blend-metrics/icons"

import { getPublicApiUrl } from "@/lib/runtime-urls"
import { csrfHeader } from "@/src/lib/csrf"

// Routed through api-gateway — access_token is an HttpOnly cookie, invisible to
// JS, so it can't be read here to build a manual Authorization header. The
// gateway forwards it server-side; credentials:'include' is what gets the
// cookie there at all (cross-port fetch).
const PAYOUT_SERVICE_URL = `${getPublicApiUrl()}/v1`

type VerifyState =
  | { kind: "loading" }
  | { kind: "success"; message: string; payoutRequestId?: string; amountUsd?: string; netAmountUsd?: string; feeUsd?: string; currency?: string; methodLabel?: string | null }
  | { kind: "expired" }
  | { kind: "used" }
  | { kind: "invalid" }
  | { kind: "verification"; block: Exclude<WithdrawalVerificationBlock, null> }
  | { kind: "network-error" }

// AC-21.01/21.02/21.03, ERR-48/49/50/51: three distinct failure modes, each with
// its own heading and copy — never a single generic "error" screen.
function ErrorMessages(kind: "expired" | "used" | "invalid") {
  switch (kind) {
    case "expired":
      return { heading: "Link Expired", body: "This link has expired. Magic links are valid for 15 minutes. Please start a new withdrawal to get a fresh link." }
    case "used":
      return { heading: "Link Already Used", body: "This link has already been used. If you need to make another withdrawal, start a new one below." }
    default:
      return { heading: "Invalid Link", body: "This link is not valid. It may have been altered or copied incorrectly. Please use the link from your email, or start a new withdrawal." }
  }
}

function VerifyWithdrawal() {
  const router = useRouter()
  const { user } = useAuth()
  const { startVerification } = useIdentityVerification()
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerifyState>({ kind: "loading" })
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<"sent" | "needs-login" | "cooldown" | "">("")
  const [resendCooldown, setResendCooldown] = useState(0)

  const token = searchParams?.get("token") ?? ""
  const id = searchParams?.get("id") ?? ""

  // Doc 04 SCR-11/13 gap: recovering from an expired link shouldn't force a full
  // restart when the visitor still has an active session on this device — try a
  // targeted resend first. resend-verification requires auth (unlike verify-email,
  // which is intentionally token-only), so this only works if the contractor is
  // still logged in here; otherwise we fall back to the full-restart CTA below.
  // There's no client-readable way to check login status up front (access_token
  // is HttpOnly) — just attempt it and let a 401 tell us.
  const resendFromExpiredLink = async () => {
    if (!id) return
    setResending(true)
    try {
      const res = await fetch(`${PAYOUT_SERVICE_URL}/payouts/${id}/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...csrfHeader("POST") },
        body: JSON.stringify({ redirectUrl: `${window.location.origin}/verify-withdrawal` }),
      })
      if (res.ok) { setResendResult("sent"); return }
      const data = await res.json().catch(() => ({}))
      // ERR-52: a cooldown rejection isn't a login problem — don't misroute it
      // into the "start a new withdrawal" fallback CTA below.
      if (data.errorCode === "ERR_MAGIC_LINK_RESEND_COOLDOWN") {
        setResendCooldown(data.cooldownRemainingSeconds ?? 30)
        setResendResult("cooldown")
        return
      }
      setResendResult("needs-login")
    } catch {
      setResendResult("needs-login")
    } finally {
      setResending(false)
    }
  }

  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const tick = setInterval(() => setResendCooldown((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => clearInterval(tick)
  }, [resendCooldown > 0])

  useEffect(() => {
    // AC-21.03/ERR-48: token or id missing from the URL entirely — no server
    // round-trip needed, this is unambiguously an invalid link.
    if (!token || !id) {
      setState({ kind: "invalid" })
      return
    }

    let cancelled = false
    setState({ kind: "loading" })
    ;(async () => {
      try {
        const res = await fetch(`${PAYOUT_SERVICE_URL}/payouts/verify-email?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok) {
          setState({
            kind: "success",
            message: data.message ?? "Your withdrawal has been confirmed and is being processed.",
            payoutRequestId: data.payoutRequestId,
            amountUsd: data.amountUsd, netAmountUsd: data.netAmountUsd, feeUsd: data.feeUsd, currency: data.currency,
            methodLabel: data.methodLabel,
          })
          // Notify any open Withdraw Funds modal on another tab in this browser
          // so it flips to the confirmed/success state immediately.
          const verifiedId = data.payoutRequestId ?? id
          if (verifiedId) {
            try {
              const channel = new BroadcastChannel("marketeq:withdrawal-verified")
              channel.postMessage({ payoutRequestId: verifiedId })
              channel.close()
            } catch { /* ignore */ }
            try {
              localStorage.setItem(
                "marketeq:withdrawal-verified",
                JSON.stringify({ payoutRequestId: verifiedId, at: Date.now() })
              )
            } catch { /* ignore */ }
          }
          return
        }
        // G9: the withdrawal was not confirmed because the account is not verified
        // (or that could not be checked). The link stays valid; the existing Verify
        // My Account popup opens instead of the generic invalid-link state.
        const block = withdrawalBlockFor(res.status, data)
        if (block) { setState({ kind: "verification", block }); return }
        // AC-21.04: no matter which error, the underlying payout request is
        // untouched server-side — this page only ever reflects, never mutates
        // state beyond what verify-email itself already decided.
        if (data.errorCode === "ERR_MAGIC_LINK_EXPIRED") setState({ kind: "expired" })
        else if (data.errorCode === "ERR_MAGIC_LINK_ALREADY_USED") setState({ kind: "used" })
        else setState({ kind: "invalid" })
      } catch {
        // ERR-54: a network/timeout failure is transient, not a server-confirmed
        // invalid token — collapsing the two told a user with a perfectly valid
        // link that it "may have been altered," with no way to just retry.
        if (!cancelled) setState({ kind: "network-error" })
      }
    })()

    return () => { cancelled = true }
  }, [token, id, retryTick])

  return (
    <>
      <AccountVerificationGate
        open={state.kind === "verification"}
        reason={state.kind === "verification" && state.block === "verification_unavailable" ? "status_unavailable" : "unstarted"}
        connectionCheckState="idle"
        // Signed in: verification opens over this page and the link stays as it is (it is not
        // retried by itself; reload or reopen the link after verifying). Signed out (this page
        // must work logged out): there is nothing to verify in place, so it continues to the
        // dashboard, which asks for sign-in first, as before.
        onVerify={() => (user ? void startVerification() : router.push("/talent-dashboard"))}
        onRetryConnectionCheck={() => setRetryTick((t) => t + 1)}
        onDismissConnectionError={() => setState({ kind: "invalid" })}
      />
      <div className="px-5 md:px-[100px] h-[64px] flex items-center">
        <Link href="/">
          <MarketeqLogo />
        </Link>
      </div>

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5">
        <div className="max-w-[467px] w-full bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-10 text-center">
          {state.kind === "loading" && (
            <>
              <div className="mx-auto flex justify-center"><Spinner size={32} className="stroke-primary-500" trackClassName="stroke-gray-200" strokeWidth={2} /></div>
              <h1 className="mt-5 text-xl font-bold text-dark-blue-400">Verifying your link…</h1>
            </>
          )}

          {/* ERR-54: transient failure, not a server-confirmed bad token — the
              link itself may still be perfectly valid, so offer a plain retry
              rather than routing into the "invalid/expired/used" recovery paths. */}
          {state.kind === "network-error" && (
            <>
              <div className="mx-auto size-14 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="size-7 text-gray-500" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">Connection Problem</h1>
              <p className="mt-3 text-sm font-light text-gray-500">You appear to be offline, or we couldn't reach the server. Please check your connection and try again.</p>
              <div className="mt-8">
                <Button onClick={() => setRetryTick((t) => t + 1)}>Try Again</Button>
              </div>
            </>
          )}

          {state.kind === "success" && (
            <>
              <div className="mx-auto size-14 rounded-full bg-success-100 flex items-center justify-center">
                <Check className="size-7 text-success-600" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">Success!</h1>
              {/* AC-20.01: amount + destination method shown on the success screen.
                  feeUsd > 0 implies instant speed — speed itself isn't persisted,
                  only used transiently to compute feeUsd at initiate() time. */}
              <p className="mt-3 text-sm font-semibold text-dark-blue-400">
                {state.amountUsd
                  ? `Your $${state.netAmountUsd ?? state.amountUsd} withdrawal has been processed.`
                  : state.message}
              </p>

              {(state.methodLabel || state.payoutRequestId) && (
                <div className="mt-5 rounded-lg border border-gray-200 p-4 text-left flex items-start gap-x-3">
                  <div className="size-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                    <Bank className="size-4 text-dark-blue-400" />
                  </div>
                  <div className="min-w-0">
                    {state.methodLabel && (
                      <div className="text-sm font-bold text-dark-blue-400 break-words">{state.methodLabel}</div>
                    )}
                    {state.feeUsd != null && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {parseFloat(state.feeUsd) > 0 ? `$${state.feeUsd} fee · ETA about 15 minutes` : "No fee · ETA 1–2 business days"}
                      </div>
                    )}
                    {state.payoutRequestId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Transaction ID <span className="font-mono font-semibold text-dark-blue-400 underline underline-offset-2">{state.payoutRequestId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8">
                <Button className="w-full" onClick={() => router.push("/earnings?tab=payouts")}>Return to Dashboard</Button>
              </div>
            </>
          )}

          {(state.kind === "expired" || state.kind === "used" || state.kind === "invalid") && (
            <>
              <div className="mx-auto size-14 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="size-7 text-gray-500" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">{ErrorMessages(state.kind).heading}</h1>
              <p className="mt-3 text-sm font-light text-gray-500">{ErrorMessages(state.kind).body}</p>

              {/* Only "expired" is resendable — the underlying withdrawal is still
                  PENDING_VERIFICATION. "used"/"invalid" have nothing left to resend. */}
              {state.kind === "expired" && id && resendResult !== "sent" && (
                <div className="mt-4">
                  <button
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                    disabled={resending || resendCooldown > 0}
                    onClick={resendFromExpiredLink}
                  >
                    {resending ? "Sending…" : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend link to this session"}
                  </button>
                  {resendResult === "needs-login" && (
                    <p className="mt-1 text-xs text-gray-400">You'll need to be signed in on this device to resend directly — start a new withdrawal below instead.</p>
                  )}
                </div>
              )}
              {resendResult === "sent" && (
                <p className="mt-4 text-sm text-success-600">A new confirmation email has been sent — check your inbox.</p>
              )}

              <div className="mt-8">
                <Button onClick={() => router.push("/transfer-funds")}>Start a New Withdrawal</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function VerifyWithdrawalPage() {
  return (
    <Suspense>
      <VerifyWithdrawal />
    </Suspense>
  )
}
