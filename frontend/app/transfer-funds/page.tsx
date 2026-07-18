"use client"

/**
 * /transfer-funds — Withdrawal initiation (US-12 through US-17).
 * Three steps: Amount+Speed → Method → Confirm. Wired to the real
 * payout-service endpoints (POST /v1/payouts/validate-amount, POST
 * /v1/payouts/initiate) — nothing here is mocked or client-calculated.
 * Submitting does not move funds: it sends a magic-link confirmation
 * email (US-18) and the withdrawal stays PENDING_VERIFICATION until
 * that link is clicked.
 */
import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { ArrowLeft, Check, Lock } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { Button, Input } from "@/components/ui"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { getBalance, type BalanceResponse } from "@/service/http/earnings"
import { getPublicAuthUrl, getPublicApiUrl } from "@/lib/runtime-urls"

// Routed through api-gateway, not payout-service directly: access_token is an
// HttpOnly cookie (invisible to JS), so a manually-read "Bearer <token>" header
// was always empty here. The gateway reads the httpOnly cookie server-side and
// forwards it as a real Authorization header.
const PAYOUT_SERVICE_URL = `${getPublicApiUrl()}/v1`

type StepId = 1 | 2 | 3

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Amount" },
  { id: 2, label: "Method" },
  { id: 3, label: "Confirm" },
]

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
// (cookie-based, same as the axios instance's interceptor in service/index.ts)
// and retry the original request; if that also fails, this is a real session
// expiry mid-withdrawal — bounce to sign-in rather than a confusing generic error.
async function payoutFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: "include" })
  if (res.status !== 401) return res

  try {
    const authRes = await fetch(`${getPublicAuthUrl()}/auth/refresh`, { method: "POST", credentials: "include" })
    if (!authRes.ok) throw new Error("refresh failed")
  } catch {
    if (!sessionExpiredRedirecting && typeof window !== "undefined") {
      sessionExpiredRedirecting = true
      window.location.href = `/sign-in?redirect=${encodeURIComponent("/transfer-funds")}&sessionExpired=1`
    }
    return res
  }

  return fetch(input, { ...init, credentials: "include" })
}

// AC-25.03/EC pattern used throughout this epic: never map a backend errorCode
// to raw text on screen — always a mapped, user-friendly message (Doc 08 policy).
const ERROR_MESSAGES: Record<string, string> = {
  ERR_BELOW_MINIMUM_AMOUNT: "This amount is below the minimum withdrawal.",
  ERR_INSUFFICIENT_BALANCE: "Your available balance has changed and is now less than this amount. Please review and try again.",
  ERR_PAYOUT_FIRST_HOLD: "Your first payout is on hold as a standard security step for new contractors. This will lift automatically.",
  ERR_PAYOUT_ACCOUNT_SUSPENDED: "Your account is suspended. Please contact support.",
  ERR_WITHDRAWAL_RATE_LIMIT: "You've reached the maximum number of withdrawals for this hour. Please try again later.",
  // Matches the errorCode payout.service.ts's initiate() actually throws (ERR_PAYOUT_METHOD_NOT_FOUND,
  // not ERR_DEPOSIT_METHOD_NOT_FOUND — the deposit-methods CRUD endpoints use a different code).
  ERR_PAYOUT_METHOD_NOT_FOUND: "Your selected payout method is no longer available — please select another.",
  ERR_PAYOUT_METHOD_UNVERIFIED: "This payout method has not been verified yet. Please select a different method.",
  ERR_MAGIC_LINK_RESEND_LIMIT: "Maximum verification resends reached. Please start a new withdrawal.",
  ERR_PAYOUT_NOT_FOUND: "This withdrawal is no longer awaiting verification.",
  ERR_PAYOUT_INVALID_AMOUNT: "The amount entered is not valid.",
  ERR_PAYOUT_FEE_EXCEEDS_AMOUNT: "The instant withdrawal fee exceeds this amount. Choose Standard or increase the amount.",
}

// ERR-02/ERR-11: mandated copy names the actual current balance — the backend
// now returns availableBalanceUsd in the error body specifically for this.
function resolveErrorMessage(data: { errorCode?: string; message?: string; availableBalanceUsd?: string }, fallback: string): string {
  if (data.errorCode === "ERR_INSUFFICIENT_BALANCE" && data.availableBalanceUsd) {
    return `Your available balance has changed to $${data.availableBalanceUsd}, which is less than your requested amount. Please review and try again.`
  }
  return (data.errorCode && ERROR_MESSAGES[data.errorCode]) ?? data.message ?? fallback
}

// ── Step indicator ───────────────────────────────────────────────────────
const StepDot = ({ n, state }: { n: number; state: "active" | "complete" | "upcoming" }) => (
  <div
    className={cn(
      "size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-sm font-semibold",
      state === "active" && "bg-primary-500 text-white border-primary-500",
      state === "complete" && "bg-primary-500 text-white border-primary-500",
      state === "upcoming" && "bg-gray-300 text-white border-gray-300"
    )}
  >
    {state === "complete" ? <Check className="size-3.5" /> : n}
  </div>
)

const StepPill = ({ n, label, current }: { n: number; label: string; current: StepId }) => {
  const state: "active" | "complete" | "upcoming" = current === n ? "active" : current > n ? "complete" : "upcoming"
  return (
    <div className="flex gap-x-3 items-center">
      <StepDot n={n} state={state} />
      <span className={cn("text-sm shrink-0 whitespace-nowrap leading-none font-semibold", state === "upcoming" ? "text-gray-300" : "text-dark-blue-400")}>
        {label}
      </span>
    </div>
  )
}

const TopBar = ({ current }: { current: StepId }) => (
  <div className="bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
    <div className="max-w-[1140px] h-[64px] mx-auto px-6 flex items-center justify-between">
      <div className="flex items-center gap-x-6">
        <Logo3 className="w-[128px] h-[18.81px] shrink-0" />
        <span className="inline-block h-[18px] w-px shrink-0 bg-gray-200" />
        <div className="inline-flex items-center gap-x-2">
          <Lock className="size-[18px] text-gray-500" />
          <span className="text-base font-semibold leading-none text-gray-500">Withdraw Funds</span>
        </div>
      </div>
      <div className="flex items-center gap-x-3">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <StepPill n={s.id} label={s.label} current={current} />
            {i < STEPS.length - 1 && <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
)

// ── Step 1: Amount + Speed (US-12/13/15/16) ─────────────────────────────────
const AmountStep = ({
  amount, setAmount, speed, setSpeed,
  balance, balanceLoading, balanceError, onRetryBalance,
  validation, validationLoading, validationError,
}: {
  amount: string; setAmount: (v: string) => void
  speed: "standard" | "instant"; setSpeed: (s: "standard" | "instant") => void
  balance: BalanceResponse | null; balanceLoading: boolean; balanceError: string
  onRetryBalance: () => void
  validation: ValidateAmountResponse | null; validationLoading: boolean; validationError: string
}) => {
  const available = balance ? parseFloat(balance.availableBalance) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
      <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">How much would you like to withdraw?</h2>

      {/* AC-12.01/12.02/12.03/12.06: live balance, never cached or computed client-side */}
      {balanceLoading ? (
        <div className="mt-2 h-5 w-48 bg-gray-100 rounded animate-pulse" />
      ) : balanceError ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <span>{balanceError}</span>
          <button className="underline font-medium" onClick={onRetryBalance}>Retry</button>
        </div>
      ) : (
        <p className="mt-2 text-sm font-light text-gray-500 leading-none">
          Available to withdraw:{" "}
          <span className="font-semibold text-dark-blue-400">
            ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </span>
        </p>
      )}

      <div className="mt-6">
        <label className="text-sm font-medium text-dark-blue-400 block mb-1.5">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
          {/* Doc07 Domain 3 "balance long-form-open": a balance that drops to $0
              while the form is open (refetch-on-focus) disables entry in-place. */}
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={amount}
            disabled={balanceLoading || !!balanceError || (!!balance && available <= 0)}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
          />
        </div>
        {/* AC-32.01/13.02: inline error naming the actual available balance */}
        {amount && available > 0 && Number(amount) > available && (
          <p className="mt-2 text-xs text-red-600">This amount exceeds your available balance of ${available.toFixed(2)}.</p>
        )}
        {validationError && <p className="mt-2 text-xs text-red-600">{validationError}</p>}
      </div>

      {/* AC-15.01/15.02/15.03/15.04: Standard vs Instant, fee/net read from the API */}
      <div className="mt-6">
        <label className="text-sm font-medium text-dark-blue-400 block mb-2">Settlement speed</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSpeed("standard")}
            className={cn("text-left p-4 rounded-lg border transition-colors", speed === "standard" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300")}
          >
            <div className="text-sm font-semibold text-dark-blue-400">Standard</div>
            <div className="text-xs text-gray-500 mt-1">No fee · provider's normal timeline</div>
          </button>
          <button
            type="button"
            onClick={() => setSpeed("instant")}
            className={cn("text-left p-4 rounded-lg border transition-colors", speed === "instant" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300")}
          >
            <div className="text-sm font-semibold text-dark-blue-400">Instant</div>
            <div className="text-xs text-gray-500 mt-1">
              {validation ? `$${validation.instantPreview.feeUsd} fee · faster settlement` : "Flat fee · faster settlement"}
            </div>
          </button>
        </div>
      </div>

      {/* AC-16.01/16.02: fee + net shown before the contractor can proceed */}
      {amount && Number(amount) > 0 && (
        <div className="mt-5 rounded-lg border border-gray-200 divide-y divide-gray-200">
          {validationLoading ? (
            <div className="p-4"><div className="h-4 w-32 bg-gray-100 rounded animate-pulse" /></div>
          ) : validation ? (
            <>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-medium text-gray-500">Gross amount</span>
                <span className="text-sm font-semibold text-dark-blue-400">${validation.amountUsd}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-medium text-gray-500">Fee</span>
                <span className="text-sm font-semibold text-dark-blue-400">${validation.feeUsd}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-b-lg">
                <span className="text-xs font-medium text-gray-500">Net transfer</span>
                <span className="text-sm font-bold text-dark-blue-400">${validation.netAmountUsd}</span>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Step 2: Method (US-14) ───────────────────────────────────────────────────
const MethodStep = ({
  methods, methodsLoading, methodsError, methodId, setMethodId, onAddMethod,
}: {
  methods: DepositMethodSummary[]; methodsLoading: boolean; methodsError: string
  methodId: string | null; setMethodId: (id: string) => void
  onAddMethod: () => void
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">Where should we send it?</h2>
        {/* US-46: stays in the withdrawal flow — previously this exited to the
            Payouts tab entirely, losing the amount/speed already chosen. */}
        {methods.length > 0 && (
          <button className="text-sm text-primary-600 font-medium hover:text-primary-700" onClick={onAddMethod}>
            + Add a method
          </button>
        )}
      </div>
      <p className="mt-2 text-sm font-light text-gray-500 leading-none">Only verified payout methods can receive a withdrawal.</p>

      <div className="mt-6 space-y-3">
        {methodsLoading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)
        ) : methodsError ? (
          <div className="text-sm text-red-600">{methodsError}</div>
        ) : methods.length === 0 ? (
          // AC-14.08/F-32: empty-selector state — no verified methods available
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">You don't have a verified payout method yet.</p>
            <Button variant="outlined" visual="gray" onClick={onAddMethod}>Add a payout method</Button>
          </div>
        ) : (
          methods.map((m) => {
            const active = methodId === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethodId(m.id)}
                className={cn("w-full flex items-center gap-x-4 p-4 rounded-lg border text-left transition-colors", active ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-gray-300 bg-white")}
              >
                <div className="h-8 w-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                  {m.methodType.slice(0, 4)}
                </div>
                <div className="flex-auto">
                  <div className="text-sm font-semibold text-dark-blue-400 leading-none">{m.nickname || m.displayLabel || m.methodType}</div>
                  {m.isDefault && <div className="mt-1 text-xs font-light text-primary-600 leading-none">Default</div>}
                </div>
                <div className={cn("size-5 rounded-full border-2 flex items-center justify-center shrink-0", active ? "border-primary-500 bg-primary-500" : "border-gray-300 bg-white")}>
                  {active && <Check className="size-3 text-white" />}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// US-46: bank-manual only — Stripe FC/PayPal/Wise/Payoneer all redirect to an
// external hosted flow regardless of where the "Add" trigger lives, so an
// in-page modal genuinely keeps the contractor in-flow only for the manual
// bank-details path. A manually-added account also isn't instantly verified
// (micro-deposits take up to 2 business days), so it can't be selected in
// this same session — the modal is explicit about that rather than implying
// otherwise.
const ADD_METHOD_COUNTRY_CURRENCY: Record<string, string> = { US: "USD", GB: "GBP", IN: "INR", AU: "AUD", CA: "CAD" }
const AddBankMethodModal = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const [form, setForm] = React.useState({ bankAccountName: "", bankAccountNumber: "", bankAccountNumberConfirm: "", bankRoutingNumber: "", bankSortCode: "", bankIfscCode: "", bankBsbNumber: "", bankInstitutionNumber: "", bankTransitNumber: "", bankCountry: "US" })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)

  const isValidAbaRouting = (routing: string) => {
    if (!/^\d{9}$/.test(routing)) return false
    const d = routing.split("").map(Number)
    return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8])) % 10 === 0
  }
  const isValidSortCode = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ""))
  const isValidIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())
  const isValidBsb = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ""))
  const isValidCaInstitution = (v: string) => /^\d{3}$/.test(v)
  const isValidCaTransit = (v: string) => /^\d{5}$/.test(v)

  if (!open) return null

  const disabled =
    !form.bankAccountName.trim() || !form.bankAccountNumber.trim() ||
    form.bankAccountNumberConfirm !== form.bankAccountNumber ||
    (form.bankCountry === "US" && !isValidAbaRouting(form.bankRoutingNumber)) ||
    (form.bankCountry === "GB" && !isValidSortCode(form.bankSortCode)) ||
    (form.bankCountry === "IN" && !isValidIfsc(form.bankIfscCode)) ||
    (form.bankCountry === "AU" && !isValidBsb(form.bankBsbNumber)) ||
    (form.bankCountry === "CA" && (!isValidCaInstitution(form.bankInstitutionNumber) || !isValidCaTransit(form.bankTransitNumber)))

  const submit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const payload: any = {
        methodType: "BANK_MANUAL",
        bankAccountName: form.bankAccountName,
        bankAccountNumber: form.bankAccountNumber,
        bankCountry: form.bankCountry,
        bankCurrency: ADD_METHOD_COUNTRY_CURRENCY[form.bankCountry] ?? "USD",
        nickname: form.bankAccountName,
      }
      switch (form.bankCountry) {
        case "US": payload.bankRoutingNumber = form.bankRoutingNumber; break
        case "GB": payload.bankSortCode = form.bankSortCode; break
        case "IN": payload.bankIfscCode = form.bankIfscCode; break
        case "AU": payload.bankBsbNumber = form.bankBsbNumber; break
        case "CA": payload.bankInstitutionNumber = form.bankInstitutionNumber; payload.bankTransitNumber = form.bankTransitNumber; break
      }
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/deposit-methods`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "Please check your details and try again."); return }
      setDone(true)
      onAdded()
    } catch {
      setError("Failed to add account. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto size-12 rounded-full bg-primary-50 flex items-center justify-center mb-3">
              <Check className="size-6 text-primary-600" />
            </div>
            <h3 className="text-base font-semibold text-dark-blue-400">Account added</h3>
            <p className="mt-2 text-sm text-gray-500">Two small deposits will arrive within 2 business days to verify this account. It'll be available to withdraw to once verified.</p>
            <Button className="mt-4 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold text-dark-blue-400 mb-4">Add Bank Account</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Country</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.bankCountry} onChange={(e) => setForm((f) => ({ ...f, bankCountry: e.target.value }))}>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="IN">India</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="John Doe" value={form.bankAccountName} onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Up to 17 digits" value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confirm Account Number</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Re-enter account number" value={form.bankAccountNumberConfirm} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumberConfirm: e.target.value }))} />
                {form.bankAccountNumberConfirm.length > 0 && form.bankAccountNumberConfirm !== form.bankAccountNumber && (
                  <p className="text-xs text-red-500 mt-1">Account numbers don't match.</p>
                )}
              </div>
              {form.bankCountry === "US" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Routing Number</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="9-digit ABA routing number" value={form.bankRoutingNumber} onChange={(e) => setForm((f) => ({ ...f, bankRoutingNumber: e.target.value }))} />
                </div>
              )}
              {form.bankCountry === "GB" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sort Code</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits" value={form.bankSortCode} onChange={(e) => setForm((f) => ({ ...f, bankSortCode: e.target.value }))} />
                </div>
              )}
              {form.bankCountry === "IN" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. HDFC0001234" value={form.bankIfscCode} onChange={(e) => setForm((f) => ({ ...f, bankIfscCode: e.target.value }))} />
                </div>
              )}
              {form.bankCountry === "AU" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">BSB Number</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits" value={form.bankBsbNumber} onChange={(e) => setForm((f) => ({ ...f, bankBsbNumber: e.target.value }))} />
                </div>
              )}
              {form.bankCountry === "CA" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Institution Number</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="3 digits" value={form.bankInstitutionNumber} onChange={(e) => setForm((f) => ({ ...f, bankInstitutionNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Transit Number</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="5 digits" value={form.bankTransitNumber} onChange={(e) => setForm((f) => ({ ...f, bankTransitNumber: e.target.value }))} />
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button variant="filled" visual="primary" size="sm" className="flex-1" disabled={disabled || submitting} onClick={submit}>
                {submitting ? "Adding…" : "Add Account"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Confirm (US-15/16/17) ────────────────────────────────────────────
const ConfirmStep = ({ validation, speed, method }: { validation: ValidateAmountResponse | null; speed: "standard" | "instant"; method: DepositMethodSummary | null }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
    <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">Review and confirm</h2>
    <p className="mt-2 text-sm font-light text-gray-500 leading-none">
      We'll email you a confirmation link — your withdrawal is only processed after you click it.
    </p>

    <dl className="mt-6 divide-y divide-gray-200 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-5 py-4">
        <dt className="text-sm font-medium text-gray-500">Withdrawal amount</dt>
        <dd className="text-sm font-semibold text-dark-blue-400">${validation?.amountUsd ?? "0.00"}</dd>
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <dt className="text-sm font-medium text-gray-500">{speed === "instant" ? "Instant fee" : "Fee"}</dt>
        <dd className="text-sm font-semibold text-dark-blue-400">−${validation?.feeUsd ?? "0.00"}</dd>
      </div>
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-b-lg">
        <dt className="text-base font-bold text-dark-blue-400">You'll receive</dt>
        <dd className="text-base font-bold text-dark-blue-400">${validation?.netAmountUsd ?? "0.00"}</dd>
      </div>
    </dl>

    <div className="mt-6">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Sending to</div>
      <div className="mt-2 text-sm font-semibold text-dark-blue-400">
        {method ? (method.nickname || method.displayLabel || method.methodType) : "No method selected"}
      </div>
    </div>
  </div>
)

// ── Page ───────────────────────────────────────────────────────────────────
function TransferFundsInner() {
  const router = useRouter()
  const [step, setStep] = React.useState<StepId>(1)

  // US-30/31/AC-30.01/31.01: gate check runs on mount, before the form is shown —
  // fail-closed per AC-30.04 (gateAllowed starts false until the server confirms).
  const [gateAllowed, setGateAllowed] = React.useState<boolean | null>(null)
  const [gateBlockedBy, setGateBlockedBy] = React.useState<string | undefined>(undefined)
  const [gateHoldReleasesAt, setGateHoldReleasesAt] = React.useState<string | undefined>(undefined)
  const [gateKycRejectionReason, setGateKycRejectionReason] = React.useState<string | undefined>(undefined)

  const [balance, setBalance] = React.useState<BalanceResponse | null>(null)
  const [balanceLoading, setBalanceLoading] = React.useState(true)
  const [balanceError, setBalanceError] = React.useState("")

  const [amount, setAmount] = React.useState("")
  const [speed, setSpeed] = React.useState<"standard" | "instant">("standard")
  const [validation, setValidation] = React.useState<ValidateAmountResponse | null>(null)
  const [validationLoading, setValidationLoading] = React.useState(false)
  const [validationError, setValidationError] = React.useState("")

  const [methods, setMethods] = React.useState<DepositMethodSummary[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  const [methodsError, setMethodsError] = React.useState("")
  const [methodId, setMethodId] = React.useState<string | null>(null)
  const [showAddMethod, setShowAddMethod] = React.useState(false)

  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<InitiateResponse | null>(null)
  const [submitError, setSubmitError] = React.useState("")

  const [resending, setResending] = React.useState(false)
  const [resendDisabled, setResendDisabled] = React.useState(false)
  const [resendMessage, setResendMessage] = React.useState("")
  // ERR-52: server-defined cooldown between resends, counted down locally from
  // the seconds the server returns — never a client-guessed duration.
  const [resendCooldown, setResendCooldown] = React.useState(0)

  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown > 0])

  const resendMagicLink = async () => {
    if (!result) return
    setResending(true)
    setResendMessage("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/${result.payoutRequestId}/resend-verification`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.errorCode === "ERR_MAGIC_LINK_RESEND_COOLDOWN") {
          setResendCooldown(data.cooldownRemainingSeconds ?? 30)
          return
        }
        // AC-19.x / ERR-52: resend-limit exhausted disables the button permanently for this payout
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
      // AC-12.03/EC-36: block the form rather than show a stale or fabricated balance
      setBalanceError("Your available balance is temporarily unavailable — please try again.")
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  const loadMethods = React.useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/deposit-methods`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to load payout methods")
      // AC-14.02: unverified methods never appear in the withdrawal selector
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
      // AC-30.04: any failure to confirm the gate is treated as blocked, not allowed.
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

  React.useEffect(() => { loadGate(); loadBalance(); loadMethods() }, [loadGate, loadBalance, loadMethods])

  // EC-06/17/56, Doc06 Global Rule "Refetch-on-focus": balance, gate status, and
  // verified methods can all go stale while this tab is backgrounded (another tab
  // completes a withdrawal, KYC status changes, a method is removed elsewhere).
  // Re-check on return to the tab — but only pre-submission (a magic link is
  // already on its way once `result` is set, so nothing here should change under it).
  React.useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== "visible" || result) return
      loadGate(); loadBalance(); loadMethods()
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadGate, loadBalance, loadMethods, result])

  // EC-16: the balance shown on step 1 is a snapshot — re-validated fresh (not
  // recomputed client-side) whenever it might have drifted, either from typing
  // (debounced) or from arriving at the confirm step (immediate).
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
    const numeric = Number(amount)
    if (!amount || isNaN(numeric) || numeric <= 0) { setValidation(null); setValidationError(""); return }
    const id = setTimeout(() => { revalidateAmount() }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, speed])

  const method = methods.find((m) => m.id === methodId) ?? null
  const canContinueFromAmount = !!validation && validation.meetsMinimum && !validationLoading && !validationError
  const canContinueFromMethod = !!methodId

  // EC-16: re-fetch validate-amount fresh on arrival at the confirm step — if the
  // balance has changed underneath, `validation` (and its meetsMinimum flag) reflect
  // the CURRENT numbers, and ConfirmStep's Confirm button is disabled accordingly.
  const next = async () => {
    if (step === 2) {
      // Land on step 3 regardless of outcome — a failed re-validation shows the
      // EC-16 warning banner there (Confirm disabled) rather than blocking navigation.
      await revalidateAmount()
      // AC-17.01/EC-46: a fresh idempotency key is minted only on forward entry into
      // the confirmation step — never reused across distinct withdrawal attempts.
      setIdempotencyKey(crypto.randomUUID())
      setStep(3)
      return
    }
    setStep((s) => (s < 3 ? ((s + 1) as StepId) : s))
  }
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))

  // AC-17.03/SCR-10/SCR-21 Global Convention: the Confirm button must not
  // re-enable on error — recovery is either (a) navigating to a different step,
  // which makes the button moot and mints a fresh idempotency key on return, or
  // (b) an explicit Retry action that reuses the SAME idempotency key (EC-48).
  // Calling submit() again via Retry is correct: idempotencyKey is untouched here.
  const submit = async () => {
    if (!methodId || !validation) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await payoutFetch(`${PAYOUT_SERVICE_URL}/payouts/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount, speed, depositMethodId: methodId, idempotencyKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        // AC-17.04/17.05: specific, mapped errors — balance-changed and invalid-method
        // route back to the relevant step rather than a dead end. These navigate away,
        // so re-enabling here is safe: the Confirm button isn't visible on steps 1/2,
        // and a fresh idempotency key is minted when the contractor returns to step 3.
        setSubmitError(resolveErrorMessage(data, "Something went wrong — please try again."))
        if (data.errorCode === "ERR_INSUFFICIENT_BALANCE") { loadBalance(); setStep(1); setSubmitting(false) }
        else if (data.errorCode === "ERR_PAYOUT_METHOD_NOT_FOUND" || data.errorCode === "ERR_PAYOUT_METHOD_UNVERIFIED") { loadMethods(); setStep(2); setSubmitting(false) }
        // Unmapped/generic failures stay on step 3 with Confirm disabled — only the
        // explicit Retry control (same idempotency key) or Try Again (fresh flow) can proceed.
        return
      }
      // AC-17.06/EC-47: a 409/replay from the idempotency layer is a success, not an error.
      setResult(data)
      setSubmitting(false)
    } catch {
      setSubmitError("We couldn't reach the server. Your withdrawal may or may not have been submitted — check your payout history before retrying.")
      // Network/unknown failure: also stays on step 3 with Confirm disabled (see above).
    }
  }

  // Fresh flow: discards the current idempotency key and starts over from step 1.
  const tryAgainFresh = () => {
    setSubmitError("")
    setSubmitting(false)
    setStep(1)
  }

  // AC-30.01/31.01: full-screen gate, shown instead of the form, before the
  // contractor can fill out amount/method/confirm at all.
  if (gateAllowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="size-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (gateAllowed === false) {
    const gateCopy: Record<string, { heading: string; body: string }> = {
      KYC_SERVICE_UNAVAILABLE: { heading: "Unable to Verify Identity", body: "Our identity verification service is temporarily unavailable. Please try again later." },
      ACCOUNT_SUSPENDED: { heading: "Account Suspended", body: "Your account is suspended. Please contact support for assistance." },
      // AC-30.02: plain language only — never disclose a numeric KYC tier here.
      FIRST_PAYOUT_HOLD: { heading: "Your First Withdrawal Is On Its Way", body: "As a standard security step for new contractors, your first withdrawal is held for a few business days before it can be released. This is a one-time step — future withdrawals won't be held." },
      // ERR-35/36/37
      KYC_NOT_STARTED: { heading: "Verify Your Identity to Continue", body: "You need to complete identity verification before you can withdraw funds. This is a one-time step that typically takes a few minutes." },
      KYC_IN_REVIEW: { heading: "Identity Verification In Progress", body: "Your identity verification is under review. This typically takes 1–2 business days. You'll be notified once it's approved." },
      KYC_REJECTED: { heading: "Identity Verification Unsuccessful", body: "Your identity verification was unsuccessful. Please contact support for assistance." },
    }
    const copy = gateCopy[gateBlockedBy ?? "KYC_SERVICE_UNAVAILABLE"]
    // AC-31.02(b)/31.03: the specific lift date, sourced from the backend — never
    // computed here. Only shown when the server actually returned one.
    const holdDateLabel = gateHoldReleasesAt
      ? new Date(gateHoldReleasesAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : null
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar current={1} />
        <div className="px-6 py-[80px]">
          <div className="max-w-[560px] mx-auto bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-10 text-center">
            <div className="mx-auto size-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Lock className="size-6 text-gray-500" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">{copy.heading}</h1>
            <p className="mt-3 text-sm font-light text-gray-500">{copy.body}</p>
            {gateBlockedBy === "FIRST_PAYOUT_HOLD" && holdDateLabel && (
              <p className="mt-2 text-sm font-semibold text-dark-blue-400">Available on {holdDateLabel}</p>
            )}
            {gateBlockedBy === "KYC_REJECTED" && gateKycRejectionReason && (
              <p className="mt-2 text-sm text-dark-blue-400">{gateKycRejectionReason}</p>
            )}
            <div className="mt-8">
              <Button variant="outlined" visual="gray" onClick={() => router.push("/earnings?tab=payouts")}>Back to Payouts</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // AC-19.01: Email Sent confirmation state (US-19/US-17.02) — the withdrawal is
  // PENDING_VERIFICATION until the magic link is clicked, not yet processed.
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar current={3} />
        <div className="px-6 py-[80px]">
          <div className="max-w-[560px] mx-auto bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-10 text-center">
            <div className="mx-auto size-14 rounded-full bg-primary-50 flex items-center justify-center">
              <Check className="size-7 text-primary-600" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">Check your email</h1>
            <p className="mt-3 text-sm font-light text-gray-500">
              We sent a confirmation link to <strong>{result.magicLinkSentTo}</strong>. Click it to confirm this ${result.amountUsd} withdrawal — the link expires in 15 minutes. Nothing is sent until you confirm.
            </p>

            {/* AC-19.01: resend generates a new token and invalidates the previous one.
                Backend enforces a 3-resend cap per payout, plus a server-defined
                per-attempt cooldown (ERR-52). */}
            <div className="mt-4">
              <button
                className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:hover:text-primary-600"
                disabled={resending || resendDisabled || resendCooldown > 0}
                onClick={resendMagicLink}
              >
                {resending ? "Resending…" : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend email"}
              </button>
              {resendMessage && <p className="mt-1 text-xs text-gray-500">{resendMessage}</p>}
            </div>

            <div className="mt-8 flex items-center justify-center gap-x-3">
              <Button variant="outlined" visual="gray" onClick={() => router.push("/earnings?tab=payouts")}>View Payout History</Button>
              <Button onClick={() => router.push("/earnings?tab=payouts")}>Done</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar current={step} />
      <div className="px-6 py-[50px]">
        <div className="max-w-[720px] mx-auto">
          <button
            onClick={() => (step === 1 ? router.back() : back())}
            className="inline-flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300 mb-6"
          >
            <ArrowLeft className="size-4" /> {step === 1 ? "Back" : "Previous step"}
          </button>

          <h1 className="text-2xl leading-[.9] font-bold text-dark-blue-400">Withdraw your earnings</h1>
          <p className="mt-2 text-base font-light text-dark-blue-400 leading-none">
            Step {step} of {STEPS.length} · <span className="font-normal">{STEPS[step - 1].label}</span>
          </p>

          <div className="mt-6">
            {step === 1 && (
              <AmountStep
                amount={amount} setAmount={setAmount} speed={speed} setSpeed={setSpeed}
                balance={balance} balanceLoading={balanceLoading} balanceError={balanceError} onRetryBalance={loadBalance}
                validation={validation} validationLoading={validationLoading} validationError={validationError}
              />
            )}
            {step === 2 && (
              <MethodStep methods={methods} methodsLoading={methodsLoading} methodsError={methodsError} methodId={methodId} setMethodId={setMethodId} onAddMethod={() => setShowAddMethod(true)} />
            )}
            {step === 3 && <ConfirmStep validation={validation} speed={speed} method={method} />}
          </div>

          {/* EC-16: balance drifted between step 1 and arrival at step 3 — Confirm
              is disabled below until the contractor edits the amount. */}
          {step === 3 && validationError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-warning-50 px-4 py-3 text-sm text-dark-blue-400 flex items-center justify-between gap-3">
              <span>{validationError}</span>
              <button className="text-primary-600 font-medium underline shrink-0" onClick={() => setStep(1)}>Edit</button>
            </div>
          )}

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{submitError}</p>
              {/* US-50.03: this is the "Withdrawal Request Failed" terminal state
                  (submitting stays true deliberately for the generic/unmapped
                  failure branch — see submit() — so this box persists until the
                  contractor explicitly acts, matching US-50.04's "no auto-dismiss"). */}
              {submitting && (
                <a href="mailto:support@marketeqdigital.com" className="inline-block mt-1.5 text-red-700 underline font-medium">
                  Contact Support
                </a>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-x-3">
            {step > 1 && (
              <Button variant="outlined" visual="gray" onClick={back} disabled={submitting}>Back</Button>
            )}
            {step < 3 && (
              <Button
                onClick={next}
                disabled={(step === 1 && !canContinueFromAmount) || (step === 2 && !canContinueFromMethod)}
              >
                Continue
              </Button>
            )}
            {step === 3 && submitError && submitting ? (
              // Generic/network failure: Confirm stays permanently disabled for this
              // attempt — Retry reuses the idempotency key, Start Over mints a new one.
              <>
                <Button variant="outlined" visual="gray" onClick={tryAgainFresh}>Start Over</Button>
                <Button onClick={submit}>Retry</Button>
              </>
            ) : step === 3 && (
              <Button onClick={submit} disabled={submitting || !validation || !!validationError}>
                {submitting ? "Submitting…" : `Withdraw $${validation?.amountUsd ?? amount}`}
              </Button>
            )}
          </div>
        </div>
      </div>
      <AddBankMethodModal open={showAddMethod} onClose={() => setShowAddMethod(false)} onAdded={loadMethods} />
    </div>
  )
}

export default function TransferFundsPage() {
  return (
    <AuthenticatedRoute>
      <TransferFundsInner />
    </AuthenticatedRoute>
  )
}
