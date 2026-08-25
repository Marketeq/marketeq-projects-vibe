"use client"

/**
 * Withdraw Funds modal — same business logic as /transfer-funds (US-12
 * through US-19: amount+speed → method → summary → magic-link send),
 * restyled into a Dialog per the Figma modal design. Wired to the real
 * payout-service endpoints — nothing here is mocked or client-calculated.
 * Submitting does not move funds: it sends a magic-link confirmation email
 * and the withdrawal stays PENDING_VERIFICATION until that link is clicked
 * (on /verify-withdrawal, which must work logged out and can be opened on
 * a different device — the "Success" state with a Transaction ID lives
 * there, not in this modal).
 */
import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  AlertTriangle, ArrowLeft, Bank, Check, Clock, CurrencyDollarCircle,
  HelpCircle, Plus, RefreshCcw01, X, Zap,
} from "@blend-metrics/icons"
import {
  Button, Checkbox, Dialog, DialogClose, DialogContent, DialogTitle,
  IconButton, Input, RadioGroup, RadioGroupItem,
} from "@/components/ui"
import { PayoneerDefault } from "@blend-metrics/icons/payment-methods"
import { PaypalIcon, CryptoProviderIcon, formatMethodOptionLabel } from "@/components/transactions-comps"
import { getBalance, type BalanceResponse } from "@/service/http/earnings"
import { getPublicAuthUrl, getPublicApiUrl } from "@/lib/runtime-urls"

const PAYOUT_SERVICE_URL = `${getPublicApiUrl()}/v1`

type StepId = "amount" | "method" | "summary" | "verify"

interface DepositMethodSummary {
  id: string
  methodType: string
  displayLabel: string | null
  nickname: string | null
  isDefault: boolean
  verificationStatus: string
}

interface ValidateAmountResponse {
  amountUsd: string
  speed: string
  feeUsd: string
  netAmountUsd: string
  availableBalanceUsd: string
  balanceAfterUsd: string
  meetsMinimum: boolean
  standardPreview: { feeUsd: string; netAmountUsd: string }
  instantPreview: { feeUsd: string; netAmountUsd: string }
}

interface InitiateResponse {
  payoutRequestId: string
  status: string
  amountUsd: string
  feeUsd: string
  netAmountUsd: string
  magicLinkSentTo: string
  magicLinkExpiresAt: string
  message: string
  replayed?: boolean
}

let sessionExpiredRedirecting = false

// EC-58/Doc06 "Session expiry handling": on 401, try POST /auth/refresh once
// and retry the original request — same pattern as /transfer-funds.
async function payoutFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: "include" })
  if (res.status !== 401) return res

  try {
    const authRes = await fetch(`${getPublicAuthUrl()}/auth/refresh`, { method: "POST", credentials: "include" })
    if (!authRes.ok) throw new Error("refresh failed")
  } catch {
    if (!sessionExpiredRedirecting && typeof window !== "undefined") {
      sessionExpiredRedirecting = true
      window.location.href = `/sign-in?redirect=${encodeURIComponent("/earnings")}&sessionExpired=1`
    }
    return res
  }

  return fetch(input, { ...init, credentials: "include" })
}

// AC-25.03/EC pattern: never map a backend errorCode to raw text on screen —
// always a mapped, user-friendly message (Doc 08 policy).
const ERROR_MESSAGES: Record<string, string> = {
  ERR_BELOW_MINIMUM_AMOUNT: "This amount is below the minimum withdrawal.",
  ERR_INSUFFICIENT_BALANCE: "Your available balance has changed and is now less than this amount. Please review and try again.",
  ERR_PAYOUT_FIRST_HOLD: "Your first payout is on hold as a standard security step for new contractors. This will lift automatically.",
  ERR_PAYOUT_ACCOUNT_SUSPENDED: "Your account is suspended. Please contact support.",
  ERR_WITHDRAWAL_RATE_LIMIT: "You've reached the maximum number of withdrawals for this hour. Please try again later.",
  ERR_PAYOUT_METHOD_NOT_FOUND: "Your selected payout method is no longer available — please select another.",
  ERR_PAYOUT_METHOD_UNVERIFIED: "This payout method has not been verified yet. Please select a different method.",
  ERR_MAGIC_LINK_RESEND_LIMIT: "Maximum verification resends reached. Please start a new withdrawal.",
  ERR_PAYOUT_NOT_FOUND: "This withdrawal is no longer awaiting verification.",
  ERR_PAYOUT_INVALID_AMOUNT: "The amount entered is not valid.",
  ERR_PAYOUT_FEE_EXCEEDS_AMOUNT: "The instant withdrawal fee exceeds this amount. Choose Standard or increase the amount.",
  ERR_RESERVE_BALANCE_TOO_LOW: "Your reserve balance is too low for this withdrawal. Edit your reserve amount in payout settings or reduce the withdrawal amount.",
}

// ERR-02/ERR-11: mandated copy names the actual current balance.
function resolveErrorMessage(data: { errorCode?: string; message?: string; availableBalanceUsd?: string }, fallback: string): string {
  if (data.errorCode === "ERR_INSUFFICIENT_BALANCE" && data.availableBalanceUsd) {
    return `Your available balance has changed to $${data.availableBalanceUsd}, which is less than your requested amount. Please review and try again.`
  }
  return (data.errorCode && ERROR_MESSAGES[data.errorCode]) ?? data.message ?? fallback
}

function methodIcon(m: { methodType: string; displayLabel: string | null }) {
  switch (m.methodType) {
    case "PAYPAL":
      return (
        <div className="size-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0">
          <PaypalIcon className="w-1/2 h-1/2" />
        </div>
      )
    case "PAYONEER":
      return (
        <div className="size-10 flex items-center justify-center shrink-0">
          <PayoneerDefault className="w-full h-full" />
        </div>
      )
    case "CRYPTO":
      // Generic crypto wallet glyph, not a per-provider brand icon — this
      // dialog's method list doesn't carry cryptoProvider, only displayLabel,
      // so passing "" always hits CryptoProviderIcon's own fallback box.
      return <CryptoProviderIcon provider="" className="size-10" />
    default:
      return (
        <div className="size-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
          <Bank className="size-5 text-dark-blue-400" />
        </div>
      )
  }
}

// ── Modal chrome shared by every step ───────────────────────────────────
const ModalHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3 shrink-0">
    <div className="flex items-center gap-x-3">
      {onBack && (
        <button type="button" onClick={onBack} className="text-dark-blue-400 hover:text-dark-blue-500">
          <ArrowLeft className="size-5" />
        </button>
      )}
      <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">{title}</DialogTitle>
    </div>
    <DialogClose asChild>
      <IconButton variant="ghost" visual="gray" size="md">
        <X className="size-5" />
      </IconButton>
    </DialogClose>
  </div>
)

const SummaryTile = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex items-start gap-x-3 rounded-lg border border-gray-200 p-4">
    <div className="size-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 text-dark-blue-400">
      {icon}
    </div>
    <div className="min-w-0" title={value}>
      <div className="text-sm font-bold text-dark-blue-400 truncate">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  </div>
)

export function WithdrawFundsDialog({ open, onOpenChange, onVerified }: {
  open: boolean; onOpenChange: (open: boolean) => void
  // Fires once the magic link is confirmed (from any device/tab) while this
  // modal is still open on the "verify" step — lets the parent page refresh
  // its balance/recent-activity without a manual reload.
  onVerified?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = React.useState<StepId>("amount")

  const [gateAllowed, setGateAllowed] = React.useState<boolean | null>(null)
  const [gateBlockedBy, setGateBlockedBy] = React.useState<string | undefined>(undefined)
  const [gateHoldReleasesAt, setGateHoldReleasesAt] = React.useState<string | undefined>(undefined)
  const [gateKycRejectionReason, setGateKycRejectionReason] = React.useState<string | undefined>(undefined)

  const [balance, setBalance] = React.useState<BalanceResponse | null>(null)
  const [balanceLoading, setBalanceLoading] = React.useState(true)
  const [balanceError, setBalanceError] = React.useState("")
  const [reserveUsd, setReserveUsd] = React.useState(0)

  const [amount, setAmount] = React.useState("")
  const [speed, setSpeed] = React.useState<"standard" | "instant">("standard")
  const [validation, setValidation] = React.useState<ValidateAmountResponse | null>(null)
  const [validationLoading, setValidationLoading] = React.useState(false)
  const [validationError, setValidationError] = React.useState("")

  const [methods, setMethods] = React.useState<DepositMethodSummary[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  const [methodsError, setMethodsError] = React.useState("")
  const [methodId, setMethodId] = React.useState<string | null>(null)

  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  const [authorized, setAuthorized] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<InitiateResponse | null>(null)
  const [declineState, setDeclineState] = React.useState<{
    type: "below_minimum" | "reserve_too_low" | "network_failure" | "method_invalid"
  } | null>(null)
  const [ignoreReserve, setIgnoreReserve] = React.useState(false)

  const [resending, setResending] = React.useState(false)
  const [resendDisabled, setResendDisabled] = React.useState(false)
  const [resendMessage, setResendMessage] = React.useState("")
  const [resendCooldown, setResendCooldown] = React.useState(0)

  // Set once polling (below) detects the magic link was confirmed elsewhere —
  // the modal must not sit frozen on "Verify it's you" forever.
  const [verifiedOutcome, setVerifiedOutcome] = React.useState<"verified" | "failed" | null>(null)

  const resetAll = React.useCallback(() => {
    setStep("amount")
    setAmount("")
    setSpeed("standard")
    setValidation(null)
    setValidationError("")
    setMethodId(null)
    setAuthorized(false)
    setSubmitting(false)
    setResult(null)
    setDeclineState(null)
    setIgnoreReserve(false)
    setResendDisabled(false)
    setResendMessage("")
    setResendCooldown(0)
    setVerifiedOutcome(null)
  }, [])

  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown > 0])

  // PS-14: the magic link can be clicked on a different tab/device at any
  // moment — poll this payout's status (and listen for the verify-page
  // BroadcastChannel) while parked on the verify step so the modal flips to
  // success instead of staying stuck on "Verify it's you".
  React.useEffect(() => {
    if (step !== "verify" || !result || verifiedOutcome) return
    const payoutId = result.payoutRequestId
    let cancelled = false

    const markVerified = () => {
      if (cancelled) return
      onVerified?.()
      setVerifiedOutcome("verified")
    }

    const markFailed = () => {
      if (cancelled) return
      onVerified?.()
      setVerifiedOutcome("failed")
    }

    // /verify-withdrawal posts this as soon as verify-email succeeds — same
    // browser, different tab — so the open modal updates without waiting for
    // the next poll tick (and without mistaking a later bank-rail failure).
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel("marketeq:withdrawal-verified")
      channel.onmessage = (event) => {
        if (event?.data?.payoutRequestId === payoutId) markVerified()
      }
    } catch { /* BroadcastChannel unavailable — poll path below still works */ }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "marketeq:withdrawal-verified" || !event.newValue) return
      try {
        const payload = JSON.parse(event.newValue) as { payoutRequestId?: string }
        if (payload.payoutRequestId === payoutId) markVerified()
      } catch { /* ignore malformed */ }
    }
    window.addEventListener("storage", onStorage)

    const poll = async () => {
      try {
        const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/${payoutId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (data.status === "pending_verification") return
        // Magic-link confirm sets verifiedAt and advances to queued/processing.
        // Only expiry-cancel (no verifiedAt) is "didn't go through" for this
        // modal — a later bank/Stripe failure must not overwrite Success.
        const wasVerified = Boolean(data.timeline?.verifiedAt)
        if (data.status === "cancelled" && !wasVerified) {
          markFailed()
        } else {
          markVerified()
        }
      } catch { /* transient — next poll tick retries */ }
    }
    poll()
    const id = setInterval(poll, 1500)
    return () => {
      cancelled = true
      clearInterval(id)
      channel?.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [step, result, verifiedOutcome, onVerified])

  const resendMagicLink = async () => {
    if (!result) return
    setResending(true)
    setResendMessage("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/${result.payoutRequestId}/resend-verification`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        if (data.errorCode === "ERR_MAGIC_LINK_RESEND_COOLDOWN") {
          setResendCooldown(data.cooldownRemainingSeconds ?? 30)
          return
        }
        setResendMessage(ERROR_MESSAGES[data.errorCode] ?? data.message ?? "Unable to resend — please try again in a moment.")
        if (data.errorCode === "ERR_MAGIC_LINK_RESEND_LIMIT") setResendDisabled(true)
        return
      }
      setResendMessage("A new confirmation email has been sent.")
    } catch {
      setResendMessage("Unable to resend — please try again in a moment.")
    } finally {
      setResending(false)
    }
  }

  const loadBalance = React.useCallback(async () => {
    setBalanceLoading(true)
    setBalanceError("")
    try {
      const b = await getBalance()
      setBalance(b)
    } catch {
      setBalanceError("Your available balance is temporarily unavailable — please try again.")
    } finally {
      setBalanceLoading(false)
    }
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/schedule`)
      if (res.ok) { const d = await res.json(); setReserveUsd(d.reserveUsd ? parseFloat(d.reserveUsd) : 0) }
    } catch { /* non-blocking */ }
  }, [])

  const loadMethods = React.useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/deposit-methods`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to load payout methods")
      const verified = (data.methods ?? []).filter((m: DepositMethodSummary) => m.verificationStatus === "verified")
      setMethods(verified)
      const def = verified.find((m: DepositMethodSummary) => m.isDefault)
      if (def) setMethodId(def.id)
    } catch {
      setMethodsError("We couldn't load your payout methods. Please try again.")
    } finally {
      setMethodsLoading(false)
    }
  }, [])

  const loadGate = React.useCallback(async () => {
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/gate-check`)
      const data = await res.json()
      if (!res.ok) { setGateAllowed(false); setGateBlockedBy("KYC_SERVICE_UNAVAILABLE"); return }
      setGateAllowed(!!data.allowed)
      setGateBlockedBy(data.blockedBy)
      setGateHoldReleasesAt(data.holdReleasesAt)
      setGateKycRejectionReason(data.kycRejectionReason)
    } catch {
      setGateAllowed(false)
      setGateBlockedBy("KYC_SERVICE_UNAVAILABLE")
    }
  }, [])

  // Fetch fresh every time the modal opens, and reset local state on close.
  React.useEffect(() => {
    if (!open) return
    resetAll()
    loadGate(); loadBalance(); loadMethods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const revalidateAmount = React.useCallback(async (): Promise<boolean> => {
    setValidationLoading(true)
    setValidationError("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/validate-amount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount, speed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setValidation(null)
        setValidationError(resolveErrorMessage(data, "This amount can't be withdrawn."))
        return false
      }
      setValidation(data)
      return true
    } catch {
      setValidation(null)
      setValidationError("Unable to check this amount right now. Please try again.")
      return false
    } finally {
      setValidationLoading(false)
    }
  }, [amount, speed])

  React.useEffect(() => {
    if (!open) return
    const numeric = Number(amount)
    if (!amount || isNaN(numeric) || numeric <= 0) { setValidation(null); setValidationError(""); return }
    const id = setTimeout(() => { revalidateAmount() }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, speed, open])

  const method = methods.find((m) => m.id === methodId) ?? null
  const canContinueFromAmount = !!validation && validation.meetsMinimum && !validationLoading && !validationError
  const canContinueFromMethod = !!methodId

  const goToMethod = async () => {
    if (!canContinueFromAmount) return
    setStep("method")
  }

  const goToSummary = async () => {
    if (!canContinueFromMethod) return
    await revalidateAmount()
    setIdempotencyKey(crypto.randomUUID())
    setStep("summary")
  }

  const submit = async () => {
    if (!methodId || !validation) return
    setSubmitting(true)
    setDeclineState(null)
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount, speed, depositMethodId: methodId, idempotencyKey, ignoreReserve }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.errorCode === "ERR_INSUFFICIENT_BALANCE") {
          loadBalance(); setStep("amount"); setSubmitting(false)
          return
        }
        setSubmitting(false)
        if (data.errorCode === "ERR_BELOW_MINIMUM_AMOUNT") { setDeclineState({ type: "below_minimum" }); return }
        if (data.errorCode === "ERR_RESERVE_BALANCE_TOO_LOW") { setDeclineState({ type: "reserve_too_low" }); return }
        if (data.errorCode === "ERR_PAYOUT_METHOD_NOT_FOUND" || data.errorCode === "ERR_PAYOUT_METHOD_UNVERIFIED") { loadMethods(); setDeclineState({ type: "method_invalid" }); return }
        setDeclineState({ type: "network_failure" })
        return
      }
      setResult(data)
      setStep("verify")
      setSubmitting(false)
    } catch {
      setSubmitting(false)
      setDeclineState({ type: "network_failure" })
    }
  }

  const grossAvailable = balance ? parseFloat(balance.availableBalance) : 0
  const available = Math.max(0, grossAvailable - reserveUsd)

  // AC-30.01/31.01: fail-closed gate — shown as its own compact card instead
  // of blocking the whole modal from rendering.
  const gateCopy: Record<string, { heading: string; body: string }> = {
    KYC_SERVICE_UNAVAILABLE: { heading: "Unable to Verify Identity", body: "Our identity verification service is temporarily unavailable. Please try again later." },
    ACCOUNT_SUSPENDED: { heading: "Account Suspended", body: "Your account is suspended. Please contact support for assistance." },
    FIRST_PAYOUT_HOLD: { heading: "Your First Withdrawal Is On Its Way", body: "As a standard security step for new contractors, your first withdrawal is held for a few business days before it can be released. This is a one-time step — future withdrawals won't be held." },
    KYC_NOT_STARTED: { heading: "Verify Your Identity to Continue", body: "You need to complete identity verification before you can withdraw funds. This is a one-time step that typically takes a few minutes." },
    KYC_IN_REVIEW: { heading: "Identity Verification In Progress", body: "Your identity verification is under review. This typically takes 1–2 business days. You'll be notified once it's approved." },
    KYC_REJECTED: { heading: "Identity Verification Unsuccessful", body: "Your identity verification was unsuccessful. Please contact support for assistance." },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="unanimated"
        className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onOpenChange(false)
        }}
      >
        <div className="pointer-events-auto w-[480px] overflow-hidden rounded-[20px] bg-white shadow-xl">
          {gateAllowed === null ? (
            <>
              <ModalHeader title="Withdraw Funds" />
              <div className="flex items-center justify-center py-16">
                <div className="size-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </>
          ) : gateAllowed === false ? (
            (() => {
              const copy = gateCopy[gateBlockedBy ?? "KYC_SERVICE_UNAVAILABLE"]
              const holdDateLabel = gateHoldReleasesAt
                ? new Date(gateHoldReleasesAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : null
              return (
                <>
                  <ModalHeader title="Withdraw Funds" />
                  <div className="px-6 py-8 text-center">
                    <div className="mx-auto size-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <AlertTriangle className="size-6 text-gray-500" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-dark-blue-400 leading-tight">{copy.heading}</h2>
                    <p className="mt-2 text-sm font-light text-gray-500">{copy.body}</p>
                    {gateBlockedBy === "FIRST_PAYOUT_HOLD" && holdDateLabel && (
                      <p className="mt-2 text-sm font-semibold text-dark-blue-400">Available on {holdDateLabel}</p>
                    )}
                    {gateBlockedBy === "KYC_REJECTED" && gateKycRejectionReason && (
                      <p className="mt-2 text-sm text-dark-blue-400">{gateKycRejectionReason}</p>
                    )}
                  </div>
                </>
              )
            })()
          ) : declineState ? (
            (() => {
              const isDecline = declineState.type === "below_minimum" || declineState.type === "reserve_too_low"
              const heading = isDecline ? "Your withdrawal was declined." : "Your withdrawal attempt failed."
              const body =
                declineState.type === "below_minimum"
                  ? "Your withdrawal is below the minimum amount. Please try again with a higher amount or change your payout threshold in settings."
                  : declineState.type === "reserve_too_low"
                  ? "Your reserve balance is too low. You can either ignore the reserve balance for this transfer, or you can edit the reserve amount in your payout settings."
                  : declineState.type === "method_invalid"
                  ? "Your selected deposit method is either unverified or unsupported. Please select a different deposit method or verify your selected deposit account."
                  : "This may be due to a temporary network issue. Please try again."
              return (
                <>
                  <ModalHeader title="Withdraw Funds" />
                  <div className="px-6 py-8 text-center">
                    <div className="mx-auto size-12 rounded-full bg-warning-50 flex items-center justify-center">
                      <AlertTriangle className="size-6 text-warning-600" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-dark-blue-400 leading-tight">{heading}</h2>
                    <p className="mt-3 text-sm font-light text-gray-500">{body}</p>

                    {declineState.type === "below_minimum" && (
                      <div className="mt-6 flex items-center justify-center gap-x-4">
                        <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { setDeclineState(null); setStep("amount") }}>Retry with Higher Amount</button>
                        <Button variant="outlined" visual="gray" size="sm" onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>Change Payout Threshold</Button>
                      </div>
                    )}
                    {declineState.type === "reserve_too_low" && (
                      <div className="mt-6 flex items-center justify-center gap-x-4">
                        <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>Edit Reserve</button>
                        <Button variant="outlined" visual="gray" size="sm" onClick={() => { setIgnoreReserve(true); setDeclineState(null); submit() }}>Ignore Reserve Balance</Button>
                      </div>
                    )}
                    {declineState.type === "network_failure" && (
                      <div className="mt-6 flex items-center justify-center">
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<RefreshCcw01 className="size-4" />} onClick={() => { setDeclineState(null); submit() }}>Retry</Button>
                      </div>
                    )}
                    {declineState.type === "method_invalid" && (
                      <div className="mt-6 flex items-center justify-center gap-x-4">
                        <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>Verify Deposit Account</button>
                        <Button variant="outlined" visual="gray" size="sm" onClick={() => { setDeclineState(null); setStep("method") }}>Select a Different Method</Button>
                      </div>
                    )}
                  </div>
                </>
              )
            })()
          ) : verifiedOutcome && result ? (
            <>
              <ModalHeader title="Withdraw Funds" />
              {verifiedOutcome === "verified" ? (
                <div className="px-6 py-8 text-center">
                  <div className="mx-auto size-14 rounded-full bg-success-100 flex items-center justify-center">
                    <Check className="size-7 text-success-600" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-dark-blue-400">Withdrawal Confirmed</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Your ${parseFloat(result.amountUsd).toFixed(2)} withdrawal has been confirmed and is being processed.
                  </p>
                  <Button className="mt-6 w-full" onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>
                    View Payout History
                  </Button>
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="mx-auto size-12 rounded-full bg-warning-50 flex items-center justify-center">
                    <AlertTriangle className="size-6 text-warning-600" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-dark-blue-400">This withdrawal didn&apos;t go through</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Check your payout history for details, or start a new withdrawal.
                  </p>
                  <Button className="mt-6 w-full" onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>
                    View Payout History
                  </Button>
                </div>
              )}
            </>
          ) : step === "verify" && result ? (
            <>
              <ModalHeader title="Verify it's you" />
              <div className="px-6 py-8">
                <p className="text-sm text-gray-500">
                  We sent a magic link to your email.
                  <br />
                  Click the link to continue your withdrawal.
                </p>
                {resendMessage && <p className="mt-2 text-xs text-gray-500">{resendMessage}</p>}
                <div className="mt-5 flex items-center gap-x-5">
                  <Button
                    variant="filled" visual="primary" size="sm"
                    disabled={resending || resendDisabled || resendCooldown > 0}
                    onClick={resendMagicLink}
                    className={cn(resendCooldown > 0 && "opacity-60")}
                  >
                    {resending ? "Resending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Magic Link"}
                  </Button>
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    onClick={() => { setResult(null); setDeclineState(null); setStep("method") }}
                  >
                    Try Another Way
                  </button>
                </div>
              </div>
            </>
          ) : step === "amount" ? (
            <>
              <ModalHeader title="Withdraw Funds" />
              <div className="px-6 py-6">
                <div className="text-sm font-semibold text-dark-blue-400">Available balance</div>
                {balanceLoading ? (
                  <div className="mt-2 h-8 w-32 bg-gray-100 rounded animate-pulse" />
                ) : balanceError ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <span>{balanceError}</span>
                    <button className="underline font-medium" onClick={loadBalance}>Retry</button>
                  </div>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline text-dark-blue-400">
                      <span className="text-xl font-semibold text-gray-400 mr-0.5">$</span>
                      <span className="text-[32px] font-bold leading-none">{Math.floor(available)}</span>
                      <span className="text-xl font-semibold">.{available.toFixed(2).split(".")[1]}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-x-1 text-xs text-gray-400">
                      <span>After reserve &amp; threshold deductions</span>
                      <HelpCircle className="size-3.5" />
                    </div>
                  </>
                )}

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-dark-blue-400">Enter Withdrawal Amount</label>
                    {available > 0 && (
                      <button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={() => setAmount(available.toFixed(2))}>
                        Withdraw Full Amount
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                    <Input
                      type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00"
                      value={amount}
                      disabled={balanceLoading || !!balanceError || (!!balance && available <= 0)}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  {amount && available > 0 && Number(amount) > available && (
                    <p className="mt-2 text-xs text-red-600">This amount exceeds your available balance of ${available.toFixed(2)}.</p>
                  )}
                  {validationError && <p className="mt-2 text-xs text-red-600">{validationError}</p>}
                </div>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-dark-blue-400 block mb-2">Choose Deposit Speed</label>
                  <RadioGroup value={speed} onValueChange={(v) => setSpeed(v as "standard" | "instant")} className="space-y-2.5">
                    <label
                      htmlFor="wf-speed-instant"
                      className={cn("flex items-center gap-x-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                        speed === "instant" ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300")}
                    >
                      <RadioGroupItem value="instant" id="wf-speed-instant" />
                      <div>
                        <div className="flex items-center gap-x-1.5 text-sm font-semibold text-dark-blue-400">
                          <Zap className="size-4 text-primary-500" /> Instant
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {validation ? `$${parseFloat(validation.instantPreview.feeUsd).toFixed(2)} fee` : "$1.75 fee"} · arrives in about 15 minutes
                        </div>
                      </div>
                    </label>
                    <label
                      htmlFor="wf-speed-standard"
                      className={cn("flex items-center gap-x-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                        speed === "standard" ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300")}
                    >
                      <RadioGroupItem value="standard" id="wf-speed-standard" />
                      <div>
                        <div className="text-sm font-semibold text-dark-blue-400">1–2 Business Days</div>
                        <div className="text-xs text-gray-500 mt-0.5">No fee</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              </div>
              <div className="px-6 pb-6">
                <Button className="w-full" onClick={goToMethod} disabled={!canContinueFromAmount}>Continue</Button>
              </div>
            </>
          ) : step === "method" ? (
            <>
              <ModalHeader title="Select Deposit Method" onBack={() => setStep("amount")} />
              <div className="px-6 py-6">
                <p className="text-sm font-semibold text-dark-blue-400">
                  Where would you like to receive your ${amount ? Number(amount).toFixed(2) : "0.00"}?
                </p>

                <div className="mt-4">
                  {methodsLoading ? (
                    <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                  ) : methodsError ? (
                    <div className="text-sm text-red-600">{methodsError}</div>
                  ) : methods.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">You don&apos;t have a verified payout method yet.</p>
                    </div>
                  ) : (
                    <RadioGroup value={methodId ?? undefined} onValueChange={setMethodId} className="space-y-3">
                      {methods.map((m) => {
                        const label = formatMethodOptionLabel(m)
                        return (
                          <label
                            key={m.id}
                            htmlFor={`wf-method-${m.id}`}
                            className={cn("flex items-center gap-x-4 p-4 rounded-lg border cursor-pointer transition-colors",
                              methodId === m.id ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300")}
                          >
                            <RadioGroupItem value={m.id} id={`wf-method-${m.id}`} />
                            {methodIcon(m)}
                            <div className="flex-auto min-w-0">
                              <div className="text-sm font-semibold text-dark-blue-400 break-words">{label}</div>
                            </div>
                          </label>
                        )
                      })}
                    </RadioGroup>
                  )}
                </div>

                <button type="button" className="mt-4 inline-flex items-center gap-x-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => { onOpenChange(false); router.push("/earnings?tab=payouts") }}>
                  <Plus className="size-4" /> Add Deposit Method
                </button>
              </div>
              <div className="px-6 pb-6">
                <Button className="w-full" onClick={goToSummary} disabled={!canContinueFromMethod}>Continue</Button>
              </div>
            </>
          ) : step === "summary" ? (
            <>
              <ModalHeader title="Withdrawal Summary" onBack={() => setStep("method")} />
              <div className="px-6 py-6">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryTile
                    icon={<CurrencyDollarCircle className="size-5" />}
                    value={`$${validation ? parseFloat(validation.amountUsd).toFixed(2) : "0.00"}`}
                    label="Deposit Amount"
                  />
                  <SummaryTile
                    icon={<Bank className="size-5" />}
                    value={method ? formatMethodOptionLabel(method) : "—"}
                    label="Deposit Account"
                  />
                  <SummaryTile
                    icon={<Zap className="size-5" />}
                    value={speed === "instant" ? `Instant · $${validation ? parseFloat(validation.feeUsd).toFixed(2) : "0.00"} fee` : "Standard · No fee"}
                    label="Deposit Method"
                  />
                  <SummaryTile
                    icon={<Clock className="size-5" />}
                    value={speed === "instant" ? "15 minutes" : "1–2 business days"}
                    label="Estimated arrival"
                  />
                </div>

                {validationError && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-warning-50 px-4 py-3 text-sm text-dark-blue-400 flex items-center justify-between gap-3">
                    <span>{validationError}</span>
                    <button className="text-primary-600 font-medium underline shrink-0" onClick={() => setStep("amount")}>Edit</button>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6">
                <Button className="w-full" disabled={submitting || !validation || !!validationError || !authorized} onClick={submit}>
                  {submitting ? "Submitting…" : "Deposit Now"}
                </Button>
                <label className="mt-4 flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={authorized} onCheckedChange={(c) => setAuthorized(c === true)} className="mt-0.5" />
                  <span className="text-xs text-gray-500">
                    By confirming this withdrawal, you authorize Marketeq to initiate a direct deposit payment to your account. You acknowledge that all transfers will comply with applicable U.S. laws and banking regulations.
                  </span>
                </label>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
