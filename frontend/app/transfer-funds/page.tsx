"use client"

/**
 * /transfer-funds — Step-by-step flow for withdrawing the USD account
 * balance shown in the top nav (e.g. "$ 1,540 USD") to a linked bank
 * account. Mirrors /add-funds visually so the two flows feel like a
 * matched pair.
 *
 * Three steps:
 *   1. Amount   — pick or enter a USD amount (capped at available balance)
 *   2. Bank     — choose a linked bank account or add a new one
 *   3. Confirm  — review fees + ETA and submit
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { ArrowLeft, Check, Lock, Plus } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { Button, Input } from "@/components/ui"

type StepId = 1 | 2 | 3

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Amount" },
  { id: 2, label: "Bank" },
  { id: 3, label: "Confirm" },
]

// Placeholder available balance — same number shown in the top nav.
// When the wallet/billing endpoint is wired, fetch this from the API.
const AVAILABLE_BALANCE = 1540

const QUICK_AMOUNTS = [100, 250, 500, 1000]

interface BankAccount {
  id: string
  bankName: string
  accountType: "Checking" | "Savings"
  last4: string
  routingLast4: string
}

const INITIAL_BANKS: BankAccount[] = [
  {
    id: "bank_1",
    bankName: "Chase",
    accountType: "Checking",
    last4: "9921",
    routingLast4: "0021",
  },
  {
    id: "bank_2",
    bankName: "Bank of America",
    accountType: "Savings",
    last4: "4477",
    routingLast4: "1199",
  },
]

// ── Step indicator (matches /add-funds) ────────────────────────────────────
const StepDot = ({
  n,
  state,
}: {
  n: number
  state: "active" | "complete" | "upcoming"
}) => (
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

const StepPill = ({
  n,
  label,
  current,
}: {
  n: number
  label: string
  current: StepId
}) => {
  const state: "active" | "complete" | "upcoming" =
    current === n ? "active" : current > n ? "complete" : "upcoming"
  return (
    <div className="flex gap-x-3 items-center">
      <StepDot n={n} state={state} />
      <span
        className={cn(
          "text-sm shrink-0 whitespace-nowrap leading-none font-semibold",
          state === "upcoming" ? "text-gray-300" : "text-dark-blue-400"
        )}
      >
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
          <span className="text-base font-semibold leading-none text-gray-500">
            Transfer Funds
          </span>
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <StepPill n={s.id} label={s.label} current={current} />
            {i < STEPS.length - 1 && (
              <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
)

// ── Step 1: Amount ─────────────────────────────────────────────────────────
const AmountStep = ({
  amount,
  setAmount,
}: {
  amount: string
  setAmount: (v: string) => void
}) => {
  const numeric = Number(amount)
  const selected = QUICK_AMOUNTS.find((a) => a === numeric)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
      <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">
        How much would you like to transfer?
      </h2>
      <p className="mt-2 text-sm font-light text-gray-500 leading-none">
        Available balance:{" "}
        <span className="font-semibold text-dark-blue-400">
          ${AVAILABLE_BALANCE.toLocaleString()}.00 USD
        </span>
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {QUICK_AMOUNTS.map((a) => {
          const disabled = a > AVAILABLE_BALANCE
          return (
            <button
              key={a}
              type="button"
              disabled={disabled}
              onClick={() => setAmount(String(a))}
              className={cn(
                "h-14 rounded-lg border text-base font-semibold transition-colors",
                selected === a
                  ? "border-primary-500 bg-primary-50 text-primary-600 ring-1 ring-primary-500"
                  : "border-gray-200 text-dark-blue-400 hover:border-gray-300 bg-white",
                disabled && "opacity-40 cursor-not-allowed hover:border-gray-200"
              )}
            >
              ${a.toLocaleString()}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setAmount(String(AVAILABLE_BALANCE))}
          className={cn(
            "h-14 rounded-lg border text-base font-semibold transition-colors",
            numeric === AVAILABLE_BALANCE
              ? "border-primary-500 bg-primary-50 text-primary-600 ring-1 ring-primary-500"
              : "border-gray-200 text-dark-blue-400 hover:border-gray-300 bg-white"
          )}
        >
          Transfer all
        </button>
      </div>

      <div className="mt-6">
        <label className="text-sm font-medium text-dark-blue-400 block mb-1.5">
          Or enter a custom amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
            $
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            max={AVAILABLE_BALANCE}
            step={1}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 font-light">
          Minimum $10.00 · Cannot exceed available balance
        </p>
      </div>
    </div>
  )
}

// ── Step 2: Bank account ───────────────────────────────────────────────────
const BankStep = ({
  banks,
  bankId,
  setBankId,
  onAddBank,
}: {
  banks: BankAccount[]
  bankId: string | null
  setBankId: (id: string | null) => void
  onAddBank: (bank: BankAccount) => void
}) => {
  const [adding, setAdding] = React.useState(false)
  const [bankName, setBankName] = React.useState("")
  const [accountType, setAccountType] =
    React.useState<"Checking" | "Savings">("Checking")
  const [routing, setRouting] = React.useState("")
  const [account, setAccount] = React.useState("")
  const [accountConfirm, setAccountConfirm] = React.useState("")

  const routingValid = /^\d{9}$/.test(routing)
  const accountValid = /^\d{4,17}$/.test(account)
  const accountsMatch = account.length > 0 && account === accountConfirm
  const canSave =
    bankName.trim().length >= 2 && routingValid && accountValid && accountsMatch

  const reset = () => {
    setAdding(false)
    setBankName("")
    setAccountType("Checking")
    setRouting("")
    setAccount("")
    setAccountConfirm("")
  }

  const save = () => {
    const newBank: BankAccount = {
      id: `bank_${Date.now()}`,
      bankName: bankName.trim(),
      accountType,
      last4: account.slice(-4),
      routingLast4: routing.slice(-4),
    }
    onAddBank(newBank)
    reset()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
      <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">
        Where should we send it?
      </h2>
      <p className="mt-2 text-sm font-light text-gray-500 leading-none">
        Linked bank accounts are verified and stored securely by Stripe.
      </p>

      <div className="mt-6 space-y-3">
        {banks.map((b) => {
          const active = bankId === b.id
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBankId(b.id)}
              className={cn(
                "w-full flex items-center gap-x-4 p-4 rounded-lg border text-left transition-colors",
                active
                  ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div className="h-8 w-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                BANK
              </div>
              <div className="flex-auto">
                <div className="text-sm font-semibold text-dark-blue-400 leading-none">
                  {b.bankName} {b.accountType} ···· {b.last4}
                </div>
                <div className="mt-1 text-xs font-light text-gray-500 leading-none">
                  Routing ···· {b.routingLast4}
                </div>
              </div>
              <div
                className={cn(
                  "size-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  active
                    ? "border-primary-500 bg-primary-500"
                    : "border-gray-300 bg-white"
                )}
              >
                {active && <Check className="size-3 text-white" />}
              </div>
            </button>
          )
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-x-2 p-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-sm font-medium"
          >
            <Plus className="size-4" /> Link a new bank account
          </button>
        )}

        {adding && (
          <div className="rounded-lg border border-gray-200 p-5 bg-gray-50/50">
            <div className="text-sm font-semibold text-dark-blue-400">
              Link a new bank account
            </div>
            <p className="mt-1 text-xs text-gray-500 font-light">
              We'll do a small test deposit to verify the account before any
              transfer is processed.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-dark-blue-400 block mb-1">
                  Bank name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Wells Fargo"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-dark-blue-400 block mb-1">
                  Account type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Checking", "Savings"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccountType(t)}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-colors",
                        accountType === t
                          ? "border-primary-500 bg-primary-50 text-primary-600 ring-1 ring-primary-500"
                          : "border-gray-200 text-dark-blue-400 hover:border-gray-300 bg-white"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-dark-blue-400 block mb-1">
                  Routing number
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="9 digits"
                  value={routing}
                  onChange={(e) =>
                    setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                />
                {routing.length > 0 && !routingValid && (
                  <p className="mt-1 text-xs text-red-500">
                    Routing number must be 9 digits
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-dark-blue-400 block mb-1">
                  Account number
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="4–17 digits"
                  value={account}
                  onChange={(e) =>
                    setAccount(e.target.value.replace(/\D/g, "").slice(0, 17))
                  }
                />
                {account.length > 0 && !accountValid && (
                  <p className="mt-1 text-xs text-red-500">
                    Account number must be 4–17 digits
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-dark-blue-400 block mb-1">
                  Confirm account number
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="Re-enter account number"
                  value={accountConfirm}
                  onChange={(e) =>
                    setAccountConfirm(
                      e.target.value.replace(/\D/g, "").slice(0, 17)
                    )
                  }
                />
                {accountConfirm.length > 0 && !accountsMatch && (
                  <p className="mt-1 text-xs text-red-500">
                    Account numbers do not match
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-x-2">
              <Button variant="outlined" visual="gray" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!canSave}>
                Save bank account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Confirm ────────────────────────────────────────────────────────
const ConfirmStep = ({
  amount,
  bank,
}: {
  amount: string
  bank: BankAccount | null
}) => {
  const subtotal = Number(amount) || 0
  const fee = subtotal > 0 ? 0.25 : 0 // flat ACH withdrawal fee placeholder
  const total = Math.round((subtotal - fee) * 100) / 100
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-8">
      <h2 className="text-lg font-semibold text-dark-blue-400 leading-none">
        Review and confirm
      </h2>
      <p className="mt-2 text-sm font-light text-gray-500 leading-none">
        Funds typically arrive in 1–3 business days via ACH.
      </p>

      <dl className="mt-6 divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Transfer amount</dt>
          <dd className="text-sm font-semibold text-dark-blue-400">
            ${subtotal.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">
            ACH transfer fee
          </dt>
          <dd className="text-sm font-semibold text-dark-blue-400">
            −${fee.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-b-lg">
          <dt className="text-base font-bold text-dark-blue-400">
            You'll receive
          </dt>
          <dd className="text-base font-bold text-dark-blue-400">
            ${total.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Sending to
        </div>
        <div className="mt-2 text-sm font-semibold text-dark-blue-400">
          {bank
            ? `${bank.bankName} ${bank.accountType} ···· ${bank.last4}`
            : "No bank account selected"}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function TransferFundsPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<StepId>(1)
  const [amount, setAmount] = React.useState<string>("")
  const [banks, setBanks] = React.useState<BankAccount[]>(INITIAL_BANKS)
  const [bankId, setBankId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const bank = banks.find((b) => b.id === bankId) ?? null

  const handleAddBank = (newBank: BankAccount) => {
    setBanks((prev) => [...prev, newBank])
    setBankId(newBank.id)
  }
  const numericAmount = Number(amount)
  const canContinueFromAmount =
    numericAmount >= 10 && numericAmount <= AVAILABLE_BALANCE
  const canContinueFromBank = bankId !== null

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as StepId) : s))
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))

  const submit = async () => {
    setSubmitting(true)
    // Placeholder — wire to billing/payout service when endpoint lands.
    await new Promise((r) => setTimeout(r, 900))
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    const fee = 0.25
    const received = Math.max(0, Number(amount) - fee).toFixed(2)
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar current={3} />
        <div className="px-6 py-[80px]">
          <div className="max-w-[560px] mx-auto bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] p-10 text-center">
            <div className="mx-auto size-14 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="size-7 text-green-600" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-dark-blue-400 leading-none">
              Transfer initiated
            </h1>
            <p className="mt-3 text-sm font-light text-gray-500">
              ${received} is on its way to{" "}
              {bank
                ? `${bank.bankName} ···· ${bank.last4}`
                : "your bank account"}
              . Funds typically arrive in 1–3 business days. A confirmation has
              been emailed to you.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-3">
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => router.push("/")}
              >
                Back to home
              </Button>
              <Button
                onClick={() => {
                  setDone(false)
                  setStep(1)
                  setAmount("")
                  setBankId(null)
                }}
              >
                Make another transfer
              </Button>
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
            <ArrowLeft className="size-4" />{" "}
            {step === 1 ? "Back" : "Previous step"}
          </button>

          <h1 className="text-2xl leading-[.9] font-bold text-dark-blue-400">
            Transfer funds to your bank
          </h1>
          <p className="mt-2 text-base font-light text-dark-blue-400 leading-none">
            Step {step} of {STEPS.length} ·{" "}
            <span className="font-normal">{STEPS[step - 1].label}</span>
          </p>

          <div className="mt-6">
            {step === 1 && (
              <AmountStep amount={amount} setAmount={setAmount} />
            )}
            {step === 2 && (
              <BankStep
                banks={banks}
                bankId={bankId}
                setBankId={setBankId}
                onAddBank={handleAddBank}
              />
            )}
            {step === 3 && <ConfirmStep amount={amount} bank={bank} />}
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-3">
            {step > 1 && (
              <Button variant="outlined" visual="gray" onClick={back}>
                Back
              </Button>
            )}
            {step < 3 && (
              <Button
                onClick={next}
                disabled={
                  (step === 1 && !canContinueFromAmount) ||
                  (step === 2 && !canContinueFromBank)
                }
              >
                Continue
              </Button>
            )}
            {step === 3 && (
              <Button onClick={submit} disabled={submitting}>
                {submitting
                  ? "Processing…"
                  : `Transfer $${Number(amount).toFixed(2)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
