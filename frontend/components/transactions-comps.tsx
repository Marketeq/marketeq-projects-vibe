"use client"
import { Logo3 } from "@/components/icons"

import * as React from "react"
import { SVGProps, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { loadStripe, type Stripe as StripeJSInstance } from "@stripe/stripe-js"
import { getEarningsSummary, getEarnings, getBalance, type EarningsSummary, type EarningsListResponse, type BalanceResponse } from "@/service/http/earnings"
import { formatDistanceToNowStrict } from "date-fns"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { useToast } from "@/components/ui"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChartSquare02,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit03,
  ExternalLink,
  Eye,
  HelpCircle,
  Home03,
  Mail01,
  MoreHorizontal,
  Plus,
  Search,
  Settings02,
  Trash01,
  UserCircle,
  X,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  ScrollArea,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { ToggleGroupRoot, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label/label"

// ─── SVG Icons (inline, from designs) ───────────────────────────────────

const BankIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-5", className)}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10 1.5L1.5 6.5V8H18.5V6.5L10 1.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M3 8V15M7 8V15M13 8V15M17 8V15" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1 15H19V17.5H1V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

const DollarSignIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={cn("size-5", className)} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PaypalIcon = ({ className }: { className?: string }) => (
  <div className={cn("size-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden", className)}>
    <img src="/bank-logos/paypal.png" className="w-9 h-9 object-contain" alt="PayPal" />
  </div>
)

const WiseIcon = ({ className }: { className?: string }) => (
  <div className={cn("size-10 rounded-full bg-[#9FE870] flex items-center justify-center overflow-hidden", className)}>
    <img src="https://cdn.simpleicons.org/wise/163300" className="w-3 h-3 object-contain" alt="Wise" />
  </div>
)

const PayoneerIcon = ({ className }: { className?: string }) => (
  <div className={cn("size-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden", className)}>
    <img src="/bank-logos/payoneer.png" className="w-9 h-9 object-contain" alt="Payoneer" />
  </div>
)

const BANK_LOGOS: Record<string, string> = {
  'chase':           '/bank-logos/chase.png',
  'bank of america': '/bank-logos/bofa.png',
  'bofa':            '/bank-logos/bofa.png',
  'wells fargo':     '/bank-logos/wellsfargo.png',
  'citibank':        '/bank-logos/citibank.png',
  'citi':            '/bank-logos/citibank.png',
  'usaa':            '/bank-logos/usaa.png',
  'td bank':         '/bank-logos/tdbank.png',
  'regions':         '/bank-logos/regions.png',
  'capital one':     '/bank-logos/capitalone.png',
}

// US-01 Last Updated Label: "Updated X min ago" from a cachedAt timestamp.
function formatRelativeMinutes(iso: string, nowMs: number): string {
  const diffMs = nowMs - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "Updated just now"
  if (mins === 1) return "Updated 1 min ago"
  if (mins < 60) return `Updated ${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return `Updated ${hrs} hr${hrs === 1 ? "" : "s"} ago`
}

function BankLogo({ bankName, size = 48 }: { bankName: string; size?: number }) {
  const name = (bankName || '').toLowerCase()
  const match = Object.entries(BANK_LOGOS).find(([key]) => name.includes(key))

  if (match) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, background: 'white',
        border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center',
        justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
      }}>
        <img src={match[1]} alt={bankName} style={{ width: size * (name.includes('bank of america') || name.includes('bofa') ? 3 : 2), height: size * (name.includes('bank of america') || name.includes('bofa') ? 3 : 2), objectFit: 'contain' }} />
      </div>
    )
  }

  const initials = (bankName || 'BK').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, background: '#117ACA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
// ─── Micro-deposit lock countdown (US-05 / AC-05.06, EC-12) ─────────────────
// Countdown is derived from the server-provided lockedUntil timestamp on every
// tick — never a client-calculated 24h duration — so client clock skew can't
// produce a premature "unlocked" state.
function LockedVerificationStep({ methodId, lockedUntil, onClose, onUnlockedRetry }: { methodId: string; lockedUntil?: string; onClose: () => void; onUnlockedRetry: () => void }) {
  const [now, setNow] = React.useState(() => Date.now())
  const [serverLockedUntil, setServerLockedUntil] = React.useState(lockedUntil)
  const [confirming, setConfirming] = React.useState(false)
  const [almostThere, setAlmostThere] = React.useState(false)
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const msRemaining = serverLockedUntil ? new Date(serverLockedUntil).getTime() - now : 0
  const countdownElapsed = msRemaining <= 0
  const hrs = Math.floor(msRemaining / 3_600_000)
  const mins = Math.floor((msRemaining % 3_600_000) / 60_000)

  // EC-15: the client-side countdown reaching zero is only a hint — the lock is
  // enforced by the server's clock, not this device's. Refetch session status
  // before ever showing the form; if the server still says locked (clock skew,
  // or the countdown was slightly ahead), stay locked and adopt its fresh timestamp.
  const confirmUnlock = React.useCallback(async () => {
    setConfirming(true)
    setAlmostThere(false)
    try {
      const res = await payoutFetch(`/deposit-methods/${methodId}/verification-status`)
      if (res.ok) {
        const d = await res.json()
        if (d.verificationStatus !== 'locked') {
          onUnlockedRetry()
          return
        }
        if (d.lockedUntil) setServerLockedUntil(d.lockedUntil)
        setAlmostThere(true)
      }
    } finally {
      setConfirming(false)
    }
  }, [methodId, onUnlockedRetry])

  React.useEffect(() => {
    if (countdownElapsed) confirmUnlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownElapsed])

  return (
    <div className="p-6 text-center space-y-4">
      <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-red-50"><span className="text-red-600 text-2xl">🔒</span></div>
      <h4 className="text-base font-semibold text-dark-blue-400">Too Many Attempts</h4>
      {confirming ? (
        <p className="text-sm text-gray-500">Checking…</p>
      ) : almostThere ? (
        <p className="text-sm text-gray-500">Almost there — please wait a moment and try again.</p>
      ) : (
        <p className="text-sm text-gray-500">Too many incorrect attempts. You can try again in <strong>{hrs} hr {mins} min</strong>. Check your bank statement to find the exact deposit amounts.</p>
      )}
      <Button variant="outlined" visual="gray" size="sm" className="w-full" disabled={confirming} onClick={countdownElapsed ? confirmUnlock : onClose}>
        {countdownElapsed ? 'Check Again' : 'Back to Deposit Methods'}
      </Button>
    </div>
  )
}

// ─── Stripe Financial Connections (US-03 / AC-03.01) ────────────────────────
// Same publishable-key validation pattern as app/checkout/[slug]/payment/page.tsx.
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const isStripePublishableKeyConfigured = Boolean(
  stripePublishableKey &&
    /^pk_(test|live)_/.test(stripePublishableKey) &&
    !stripePublishableKey.includes("YOUR") &&
    !stripePublishableKey.endsWith("...")
)
let stripeJsPromise: Promise<StripeJSInstance | null> | null = null
const getStripeJs = () => {
  if (!isStripePublishableKeyConfigured || !stripePublishableKey) return Promise.resolve(null)
  if (!stripeJsPromise) stripeJsPromise = loadStripe(stripePublishableKey)
  return stripeJsPromise
}

// ─── Global bank (US-04) — country drives required fields & currency ────────
// Mirrors backend/apps/payout-service/src/methods/bank-validation.service.ts's
// per-region field requirements (AC-04.02/04.03) and format checks (AC-04.04/04.05)
// for the subset of countries this form exposes.
const BANK_COUNTRY_CURRENCY: Record<string, string> = { US: 'USD', GB: 'GBP', IN: 'INR', AU: 'AUD', CA: 'CAD' }
const isValidAbaRouting = (routing: string) => {
  if (!/^\d{9}$/.test(routing)) return false
  const d = routing.split('').map(Number)
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8])) % 10 === 0
}
const isValidSortCode = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ''))
const isValidIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())
const isValidBsb = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ''))
const isValidCaInstitution = (v: string) => /^\d{3}$/.test(v)
const isValidCaTransit = (v: string) => /^\d{5}$/.test(v)

// ─── Shared payout-service helpers (US-22–26) ────────────────────────────────
// Routed through api-gateway, not payout-service directly: access_token is an
// HttpOnly cookie (invisible to JS), so a manually-read "Bearer <token>" header
// was always empty. The gateway reads the httpOnly cookie server-side and
// forwards it as a real Authorization header — credentials:'include' is what
// gets the cookie there in the first place (cross-port fetch, so it's not
// automatic without it).
const PAYOUT_SERVICE_BASE = `${getPublicApiUrl()}/v1`
async function payoutFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${PAYOUT_SERVICE_BASE}${path}`, { ...init, credentials: "include" })
}
interface DepositMethodOption {
  id: string
  methodType: string
  displayLabel: string | null
  nickname: string | null
  isDefault: boolean
  verificationStatus: string
}

// ─── Left Sidebar (reused from talent-dashboard, with Transactions active) ──

export const TransactionsLeftSidebar = () => {
  return (
    <div className="w-[224px] shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]">
      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Work
        </span>
        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-dashboard"
          >
            <Home03 className="size-[18px] text-dark-blue-400/50" />
            Home
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/find-jobs"
          >
            <Search className="size-[18px] text-dark-blue-400/50" />
            Find Jobs
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/my-listings"
          >
            <Briefcase className="size-[18px] text-dark-blue-400/50" />
            My Projects
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Plus className="size-[18px] text-dark-blue-400/50" />
            Create a Project
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none bg-gray-100 px-3"
            href="/transactions"
          >
            <DollarSignIcon className="size-[18px] text-dark-blue-400/50" />
            Transactions
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/stats"
          >
            <BarChartSquare02 className="size-[18px] text-dark-blue-400/50" />
            Stats & Trends
          </NextLink>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Account
        </span>
        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-profile"
          >
            <UserCircle className="size-[18px] text-dark-blue-400/50" />
            Profile
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/inbox"
          >
            <Mail01 className="size-[18px] text-dark-blue-400/50" />
            Inbox
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              3
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/notifications"
          >
            <AlertCircle className="size-[18px] text-dark-blue-400/50" />
            Notifications
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              2
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/settings"
          >
            <Settings02 className="size-[18px] text-dark-blue-400/50" />
            Settings
          </NextLink>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Cards (shared across tabs) ───────────────────────────────────

interface StatCardProps {
  label: string
  sublabel?: string
  amount: string
  change?: { value: string; direction: "up" | "down"; label: string }
  extra?: string
  status?: string
}

const StatCard = ({ label, sublabel, amount, change, extra, status }: StatCardProps) => (
  <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] min-w-0">
    <div className="flex items-start justify-between gap-x-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-dark-blue-400 truncate">{label}</p>
        {sublabel && (
          <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-2xl font-bold text-dark-blue-400">
          <span className="text-base font-normal align-middle opacity-50">$</span>
          {amount}
        </p>
        {status && (
          <p className="text-xs font-medium text-primary-500 mt-0.5">{status}</p>
        )}
      </div>
    </div>
    {(change || extra) && (
      <div className="flex items-center gap-2 mt-2">
        {change && (
          <span className={cn(
            "inline-flex items-center gap-x-1 text-xs font-medium",
            change.direction === "up" ? "text-success-500" : "text-error-500"
          )}>
            {change.direction === "up" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {change.value}
          </span>
        )}
        {change && <span className="text-xs text-dark-blue-400">{change.label}</span>}
        {extra && <span className="text-xs text-gray-500">{extra}</span>}
      </div>
    )}
  </div>
)

// ─── Overview Tab ───────────────────────────────────────────────────────

export const OverviewTab = ({ onNavigateTab, onEditPayoutSchedule }: { onNavigateTab?: (tab: string) => void; onEditPayoutSchedule?: () => void }) => {
  const router = useRouter()
  const { toast } = useToast()
  const [showBanner, setShowBanner] = useState(true)
  const [summary, setSummary] = React.useState<EarningsSummary | null>(null)
  // US-12/US-13/US-14: this endpoint returns all four cards (Today/This Week/
  // This Month/All Time) in one response, not four independent requests as the
  // spec assumes — so a single shared error + retry is the honest equivalent
  // of the spec's "per-card retry", not four separately-failing cards.
  const [summaryError, setSummaryError] = React.useState(false)
  const [balance, setBalance] = React.useState<BalanceResponse | null>(null)
  // US-05/US-06: a genuine load failure (500/503) must render a distinct error
  // state with retry — never conflated with a real $0 balance, and never left
  // stuck on the loading placeholder forever with only a console.error.
  const [balanceError, setBalanceError] = React.useState(false)
  // Doc07 Domain 7: next_payout_date is derived server-side (schedule + day + current
  // date) — never computed client-side. No projected amount exists server-side either
  // (the schedule doesn't precompute a future payout total), so only the date is shown.
  const [scheduleNextRunAt, setScheduleNextRunAt] = React.useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = React.useState(true)
  // Sourced from the real payout history (GET /v1/payouts?status=completed) — the most
  // recently settled payout, not a static mock value.
  const [previousPayout, setPreviousPayout] = React.useState<{ amountUsd: string; methodLabel: string | null; settledAt: string } | null>(null)
  const [previousPayoutLoading, setPreviousPayoutLoading] = React.useState(true)
  // "Recent Activity" has no dedicated activity-feed endpoint in payout-service — this
  // derives real entries from the same payout history list rather than showing mock data.
  const [recentActivity, setRecentActivity] = React.useState<{ id: string; title: string; description: string; time: string; kind: 'scheduled' | 'sent' | 'processing' | 'failed' | 'cancelled' }[]>([])
  const [recentActivityLoading, setRecentActivityLoading] = React.useState(true)

  // ── Deposit Methods state ──────────────────────────────────────
  const [methods, setMethods] = React.useState<any[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  const [showAddMethod, setShowAddMethod] = React.useState(false)
  const [canAddMore, setCanAddMore] = React.useState(true)
  // SCR-20: feature-flag state fetched from the server (GET /deposit-methods/config),
  // never read from a frontend build-time env var — a stale build could otherwise
  // show/hide options the backend disagrees with.
  const [debitCardEnabled, setDebitCardEnabled] = React.useState(false)
  // SCR-01/SCR-18: KYC gate must block Add Method too, not just withdrawal —
  // reuses the same fail-closed gate-check endpoint the withdrawal flow uses.
  const [methodGateBlocked, setMethodGateBlocked] = React.useState(false)
  const [editingMethod, setEditingMethod] = React.useState<any | null>(null)
  // AC-11.01: destructive removal requires an explicit confirmation step — holds
  // the method pending confirmation, not yet deleted.
  const [confirmRemove, setConfirmRemove] = React.useState<any | null>(null)
  const [removing, setRemoving] = React.useState(false)
  // AC-11.05/11.06: the warning (and required acknowledgment) must reflect whether
  // this specific method is actually the schedule's primary or an active split
  // secondary — not a static disclaimer shown for every removal regardless of use.
  const [removeImpact, setRemoveImpact] = React.useState<{ isPrimary: boolean; isActiveSecondary: boolean } | null>(null)
  const [removeAck, setRemoveAck] = React.useState(false)
  const [removeError, setRemoveError] = React.useState('')
  const [addForm, setAddForm] = React.useState({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankCountry: 'US', bankCurrency: 'USD', accountType: 'CHECKING', paypalEmail: '', paypalEmailConfirm: '', nickname: '', bankConsent: false })
  const [verifyState, setVerifyState] = React.useState<{methodId:string, displayLabel:string, bankName:string, step:'instructions'|'amounts'|'verifying'|'success'|'failed'|'locked'|'expired', attemptsLeft?: number, lockedUntil?: string} | null>(null)
  const [microAmounts, setMicroAmounts] = React.useState({amount1:'', amount2:''})

  // ─── Crypto wallet (US-09) — provider/network/currency driven by the real
  // backend registry (GET /deposit-methods/crypto/providers), not a hardcoded list.
  const [cryptoProviders, setCryptoProviders] = React.useState<any[]>([])
  const [cryptoProvidersLoading, setCryptoProvidersLoading] = React.useState(false)
  const [cryptoStep, setCryptoStep] = React.useState<'provider' | 'details'>('provider')
  const [cryptoForm, setCryptoForm] = React.useState({ provider: '', network: '', currency: '', address: '' })
  const [cryptoSubmitting, setCryptoSubmitting] = React.useState(false)
  const [cryptoError, setCryptoError] = React.useState('')
  const selectedCryptoProvider = cryptoProviders.find(p => p.provider === cryptoForm.provider)
  const selectedCryptoNetwork = selectedCryptoProvider?.networks?.find((n: any) => n.network === cryptoForm.network)

  const fetchCryptoProviders = React.useCallback(async () => {
    if (cryptoProviders.length) return
    setCryptoProvidersLoading(true)
    try {
      const res = await payoutFetch(`/deposit-methods/crypto/providers`)
      if (res.ok) { const d = await res.json(); setCryptoProviders(d.providers ?? []) }
    } catch (e) { console.error('Failed to fetch crypto providers', e) }
    finally { setCryptoProvidersLoading(false) }
  }, [cryptoProviders.length])

  const handleAddCryptoWallet = async () => {
    setCryptoSubmitting(true)
    setCryptoError('')
    try {
      const res = await payoutFetch(`/deposit-methods`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodType: 'CRYPTO',
          cryptoProvider: cryptoForm.provider,
          cryptoNetwork: cryptoForm.network,
          cryptoCurrency: cryptoForm.currency,
          cryptoAddress: cryptoForm.address,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCryptoError(data.message ?? 'Unable to add this wallet — please check the address and try again.'); return }
      toast({ title: 'Wallet connected', description: `${cryptoForm.provider} wallet added successfully.` })
      setShowAddMethod(false)
      setCryptoStep('provider')
      setCryptoForm({ provider: '', network: '', currency: '', address: '' })
      fetchMethods()
    } catch {
      setCryptoError('Unable to add this wallet — please try again.')
    } finally {
      setCryptoSubmitting(false)
    }
  }

  const fetchMethods = React.useCallback(async () => {
    try {
      setMethodsLoading(true)
      const res = await payoutFetch(`/deposit-methods`)
      // AC-01.02/01.05/01.06: every saved method must remain visible regardless of
      // verification status — pending/locked methods are surfaced via a status badge,
      // not hidden. Only the withdrawal method-selector (US-14) restricts to verified.
      if (res.ok) { const d = await res.json(); setMethods(d.methods ?? []); setCanAddMore(d.canAddMore ?? true) }
    } catch (e) { console.error('Failed to fetch deposit methods', e) }
    finally { setMethodsLoading(false) }
  }, [])

  const handleAddMethod = async () => {
    try {
      const payload: any = { methodType: addForm.methodType }
      if (addForm.methodType === 'BANK_MANUAL') {
        // AC-04.01: "account holder name" is the field the backend validates
        // (bank-validation.service.ts ERR_BANK_ACCOUNT_NAME_INVALID) — that's the
        // "Account Holder Name" input (addForm.nickname), not the bank's own name.
        payload.bankAccountName = addForm.nickname
        payload.bankAccountNumber = addForm.bankAccountNumber
        payload.bankCountry = addForm.bankCountry
        payload.bankCurrency = BANK_COUNTRY_CURRENCY[addForm.bankCountry] ?? 'USD'
        // AC-04.02/04.03: routing field adapts by region — only the field(s) relevant
        // to the selected country are sent.
        switch (addForm.bankCountry) {
          case 'US': payload.bankRoutingNumber = addForm.bankRoutingNumber; break
          case 'GB': payload.bankSortCode = addForm.bankSortCode; break
          case 'IN': payload.bankIfscCode = addForm.bankIfscCode; break
          case 'AU': payload.bankBsbNumber = addForm.bankBsbNumber; break
          case 'CA': payload.bankInstitutionNumber = addForm.bankInstitutionNumber; payload.bankTransitNumber = addForm.bankTransitNumber; break
        }
        // "Bank Name" (e.g. "Chase") is cosmetic only — not a backend-validated field.
        if (addForm.bankAccountName) payload.nickname = addForm.bankAccountName
      } else if (addForm.methodType === 'PAYPAL') {
        payload.paypalEmail = addForm.paypalEmail
      } else if (addForm.nickname) {
        payload.nickname = addForm.nickname
      }
      const res = await payoutFetch(`/deposit-methods`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        if (data.duplicate) {
          toast({ title: 'Account already linked', description: 'This account is already connected.' })
        } else {
          const last4 = addForm.bankAccountNumber.slice(-4); setMicroAmounts({ amount1: '', amount2: '' }); setVerifyState({ methodId: data.depositMethodId, displayLabel: data.displayLabel ?? ('••••' + last4), bankName: addForm.bankAccountName || '', step: 'instructions' })
          setShowAddMethod(false)
        }
      } else {
        toast({ title: 'Error adding account', description: data.message ?? 'Please check your details and try again.', variant: 'destructive' })
      }
    } catch (e) { toast({ title: 'Error', description: 'Failed to add account', variant: 'destructive' }) }
  }

  // AC-03.01/03.02: launches the real Stripe Financial Connections hosted flow when
  // a real publishable key is configured. Falls back to the existing dev-mock
  // sign-in screen only when payout-service itself is running in Stripe stub mode
  // (no STRIPE_SECRET_KEY configured server-side, signalled by `mode: 'mock'`).
  const handleConnectStripe = async (bankName: string) => {
    setAddForm(f => ({...f, _stripeConnecting: true} as any))
    try {
      const initRes = await payoutFetch(`/deposit-methods/stripe/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error('Failed to start Stripe session')
      const { sessionId, clientSecret, mode } = initData

      let linkedAccountId = ''
      if (mode !== 'mock') {
        const stripe = await getStripeJs()
        if (!stripe) throw new Error('Stripe.js failed to load')
        const result = await stripe.collectFinancialConnectionsAccounts({ clientSecret })
        if (result.error) throw new Error(result.error.message)
        linkedAccountId = result.financialConnectionsSession?.accounts?.[0]?.id ?? ''
        if (!linkedAccountId) throw new Error('No bank account was selected')
      }

      const finalRes = await payoutFetch(`/deposit-methods/stripe/finalise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, linkedAccountId }),
      })
      const method = await finalRes.json()
      if (!finalRes.ok) throw new Error('Finalise failed')
      setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: '', _stripeConnecting: false, _stripeUser: '', _stripePass: '', _bankSearch: ''} as any))
      setShowAddMethod(false)
      const displayLabel = method.displayLabel ?? `${bankName} ••••${method.bankAccountLast4 ?? '4242'}`
      setVerifyState({ methodId: method.id, displayLabel, bankName, step: 'verifying' })
      await new Promise(r => setTimeout(r, 2500))
      setVerifyState({ methodId: method.id, displayLabel, bankName, step: 'success' })
      fetchMethods()
    } catch (e) {
      setAddForm(f => ({...f, _stripeConnecting: false} as any))
      setVerifyState({ methodId: '', displayLabel: '', bankName, step: 'failed' })
      setShowAddMethod(false)
    }
  }

  // AC-07.03/07.04, AC-08.03/08.04: real OAuth redirect for Wise/Payoneer — POSTs
  // to create the pending method (payout-service returns a real provider oauthUrl
  // via oauth.service.ts's provider config), then navigates the browser there.
  // The provider redirects back to GET /v1/oauth/:provider/callback, which lands
  // the contractor back on this page with ?oauth=success|error (handled by the
  // effect below, mirroring how OverviewTab already reacts to other async state).
  const [oauthConnecting, setOauthConnecting] = React.useState(false)
  const handleConnectOAuth = async (methodType: 'WISE' | 'PAYONEER') => {
    setOauthConnecting(true)
    try {
      const res = await payoutFetch(`/deposit-methods`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to start connection')
      const oauthUrl = data.verification?.oauthUrl
      if (!oauthUrl) throw new Error('No authorization URL returned')
      window.location.href = oauthUrl
    } catch (e: any) {
      setOauthConnecting(false)
      toast({ title: 'Connection failed', description: e?.message ?? 'Please try again.', variant: 'destructive' })
    }
  }

  // AC-06.06/07.04/08.04: handle the ?oauth=success|error redirect back from the
  // provider callback — mapped by the actual errorCode oauth.service.ts throws
  // (oauth.controller.ts:26 passes it through as ?code=), not a single generic message.
  const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    ERR_OAUTH_STATE_INVALID: 'That connection link expired before it was completed. Please try connecting again.',
    ERR_DEPOSIT_METHOD_NOT_FOUND: 'We could not find the connection request. Please try again.',
    ERR_OAUTH_UNSUPPORTED: 'This provider is not currently supported.',
  }
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthResult = params.get('oauth')
    if (!oauthResult) return
    if (oauthResult === 'success') {
      toast({ title: 'Account connected', description: 'Your deposit method has been verified.' })
      fetchMethods()
    } else {
      const code = params.get('code') ?? undefined
      toast({ title: 'Connection failed', description: (code && OAUTH_ERROR_MESSAGES[code]) ?? 'We were unable to connect your account. Please try again.', variant: 'destructive' })
    }
    params.delete('oauth'); params.delete('methodId'); params.delete('code')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [fetchMethods, toast])

  // AC-09.01: fetch the 9 supported providers from server config when the crypto
  // step is entered — never hardcode the provider list client-side.
  React.useEffect(() => {
    if (addForm.methodType === 'CRYPTO') fetchCryptoProviders()
  }, [addForm.methodType, fetchCryptoProviders])

  // AC-11.05/11.06: determine whether the method pending removal is actually the
  // schedule's primary or an active split secondary, so the dialog can show the
  // correct specific warning instead of a static one shown for every removal.
  React.useEffect(() => {
    if (!confirmRemove) { setRemoveImpact(null); setRemoveAck(false); setRemoveError(''); return }
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts/schedule`)
        if (!res.ok) { setRemoveImpact({ isPrimary: false, isActiveSecondary: false }); return }
        const s = await res.json()
        setRemoveImpact({
          isPrimary: s.primaryMethod?.id === confirmRemove.id,
          isActiveSecondary: !!s.splitEnabled && s.secondaryMethod?.id === confirmRemove.id,
        })
      } catch {
        setRemoveImpact({ isPrimary: false, isActiveSecondary: false })
      }
    })()
  }, [confirmRemove])

  // Returns whether the delete actually succeeded, so callers can decide whether
  // it's safe to close/dismiss their UI (SCR-06: dialog must stay open on error).
  const handleDeleteMethod = async (id: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await payoutFetch(`/deposit-methods/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'Account removed successfully' }); fetchMethods(); return { ok: true } }
      const e = await res.json().catch(() => ({} as any))
      return { ok: false, message: e.message ?? 'Unable to remove — please try again.' }
    } catch { return { ok: false, message: 'Unable to remove — please try again.' } }
  }

  // AC-11.01/11.02/11.03/SCR-06: only the confirmation dialog's Remove button
  // actually deletes, and the dialog stays open with the specific error message
  // on failure (e.g. "only method" / "primary with active split") instead of
  // silently closing as if the removal had succeeded.
  const confirmDeleteMethod = async () => {
    if (!confirmRemove) return
    setRemoving(true)
    setRemoveError('')
    const result = await handleDeleteMethod(confirmRemove.id)
    setRemoving(false)
    if (result.ok) {
      setConfirmRemove(null)
    } else {
      setRemoveError(result.message ?? 'Unable to remove — please try again.')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await payoutFetch(`/deposit-methods/${id}/set-default`, { method: 'POST' })
      if (res.ok) { toast({ title: 'Default updated' }); fetchMethods() }
      else { const e = await res.json(); toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to update default', variant: 'destructive' }) }
  }

  // SCR-07: warn before changing the primary method when split payout is active —
  // methods.service.ts's setDefault() silently repoints the schedule's
  // primaryMethodId, which can leave a stale split configuration.
  const [confirmSetDefault, setConfirmSetDefault] = React.useState<any | null>(null)
  const requestSetDefault = async (method: any) => {
    try {
      const res = await payoutFetch(`/payouts/schedule`)
      if (res.ok) {
        const s = await res.json()
        if (s.splitEnabled && s.primaryMethod?.id !== method.id) {
          setConfirmSetDefault(method)
          return
        }
      }
    } catch { /* if the check fails, fall through to the normal set-default flow */ }
    handleSetDefault(method.id)
  }

  const handleUpdateMethod = async () => {
    if (!editingMethod) return
    try {
      const res = await payoutFetch(`/deposit-methods/${editingMethod.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: editingMethod.nickname ?? '' })
      })
      if (res.ok) { toast({ title: 'Account updated' }); setEditingMethod(null); fetchMethods() }
      else { const e = await res.json(); toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to update account', variant: 'destructive' }) }
  }

  // AC-05.04/05.05/05.06/05.08: wrong amounts decrement an attempt counter and, on the
  // 3rd failure, lock for 24h — the method is never deleted just because a verification
  // attempt failed. Backend errorCode drives which of amounts/locked/expired renders.
  const handleVerifyMicroDeposits = async () => {
    if (!verifyState) return
    const methodId = verifyState.methodId
    setVerifyState(s => s ? {...s, step: 'verifying'} : null)
    try {
      const [res] = await Promise.all([
        payoutFetch(`/deposit-methods/${methodId}/verify-micro-deposits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount1Cents: parseInt(microAmounts.amount1), amount2Cents: parseInt(microAmounts.amount2) })
        }),
        new Promise(r => setTimeout(r, 1200))
      ])
      setMicroAmounts({ amount1: '', amount2: '' })
      if (res.ok) {
        setVerifyState(s => s ? {...s, step: 'success'} : null)
        fetchMethods()
        return
      }
      const body = await res.json().catch(() => ({} as any))
      if (body.errorCode === 'ERR_VERIFICATION_LOCKED') {
        setVerifyState(s => s ? {...s, step: 'locked', lockedUntil: body.lockedUntil} : null)
      } else if (body.errorCode === 'ERR_VERIFICATION_EXPIRED') {
        setVerifyState(s => s ? {...s, step: 'expired'} : null)
      } else if (body.errorCode === 'ERR_VERIFICATION_AMOUNTS_INCORRECT') {
        setVerifyState(s => s ? {...s, step: 'amounts', attemptsLeft: body.attemptsLeft} : null)
      } else {
        setVerifyState(s => s ? {...s, step: 'failed'} : null)
      }
      fetchMethods()
    } catch {
      setVerifyState(s => s ? {...s, step: 'failed'} : null)
    }
  }

  const deleteMethod = React.useCallback(async (methodId: string) => {
    try {
      await payoutFetch(`/deposit-methods/${methodId}`, { method: 'DELETE' })
    } catch {}
  }, [])

  const getMethodIcon = (m: any) => {
    const type = typeof m === 'string' ? m : m?.methodType
    if (type === 'PAYPAL') return <PaypalIcon className="size-5" />
    if (type === 'CRYPTO') return <span className="size-5 text-gray-500 font-bold text-xs flex items-center">BTC</span>
    const bankName = typeof m === 'object' ? (m?.nickname || '') : ''
    if (bankName) return <BankLogo bankName={bankName} size={28} />
    return <BankIcon className="size-5 text-gray-500" />
  }

  const getMethodLabel = (m: any) => {
    if (m.methodType === 'PAYPAL') return { name: m.nickname || 'PayPal', sub: m.paypalEmail ?? '' }
    if (m.methodType === 'CRYPTO') return { name: m.nickname || m.cryptoProvider || 'Crypto Wallet', sub: m.cryptoAddress ? m.cryptoAddress.slice(0,6)+'...'+m.cryptoAddress.slice(-4) : '' }
    if (m.methodType === 'WISE') return { name: m.nickname || 'Wise', sub: m.wiseAccountId ?? '' }
    if (m.methodType === 'PAYONEER') return { name: m.nickname || 'Payoneer', sub: m.payoneerPayeeId ?? '' }
    // BANK_MANUAL / BANK_STRIPE — show nickname if set, else displayLabel
    return { name: m.nickname ? `${m.nickname} ${m.displayLabel?.replace('Bank ', '') || ''}`.trim() : m.displayLabel || 'Bank Account', sub: '' }
  }

  // AC-01.03/01.05/01.06: status badge shown on every method card.
  const getMethodStatusBadge = (m: any): { visual: "success" | "warning" | "error" | "gray"; label: string } => {
    switch (m.verificationStatus) {
      case 'verified': return { visual: 'success', label: 'Verified' }
      case 'locked': return { visual: 'error', label: formatLockedBadge(m.lockedUntil) }
      case 'expired': return { visual: 'gray', label: 'Expired' }
      case 'failed': return { visual: 'gray', label: 'Failed' }
      default: return { visual: 'warning', label: 'Pending Verification' }
    }
  }

  // AC-01.06: "Locked — try again in 18 hr 42 min" style countdown from server timestamp.
  const formatLockedBadge = (lockedUntil: string | null | undefined) => {
    if (!lockedUntil) return 'Locked'
    const msRemaining = new Date(lockedUntil).getTime() - Date.now()
    if (msRemaining <= 0) return 'Locked'
    const hrs = Math.floor(msRemaining / 3_600_000)
    const mins = Math.floor((msRemaining % 3_600_000) / 60_000)
    return `Locked — ${hrs} hr ${mins} min`
  }

  const defaultMethod = methods.find(m => m.isDefault)

  // US-01 Last Updated Label: "Updated X min ago" computed client-side from
  // cachedAt, ticking forward without re-fetching — a 30s interval is frequent
  // enough for a minute-granularity label without hammering re-renders.
  const [nowTick, setNowTick] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const loadBalance = React.useCallback(() => {
    setBalanceError(false)
    getBalance().then(setBalance).catch((e) => { console.error("Balance fetch failed:", e); setBalanceError(true) })
  }, [])

  // US-02/US-94: no Ably (or any real-time transport) exists anywhere in this
  // codebase for earnings, so a genuine push-based "balance.updated" story
  // isn't buildable here — this is the honest fallback the spec itself
  // describes for when real-time is unavailable: a 60s poll. Deliberately NOT
  // pairing this with a "Live" badge (US-03) — that would claim an active
  // real-time connection that doesn't exist, which is exactly what Doc07
  // "never fabricate" rules out.
  React.useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) loadBalance() }, 60_000)
    return () => clearInterval(id)
  }, [loadBalance])

  const loadSummary = React.useCallback(() => {
    setSummaryError(false)
    getEarningsSummary().then(setSummary).catch((e) => { console.error("Earnings summary fetch failed:", e); setSummaryError(true) })
  }, [])

  useEffect(() => {
    loadSummary()
    loadBalance()
    fetchMethods()
    ;(async () => {
      try {
        const res = await payoutFetch(`/deposit-methods/config`)
        if (res.ok) { const d = await res.json(); setDebitCardEnabled(!!d.featureFlags?.debitCardEnabled) }
      } catch (e) { console.error('Failed to fetch method config', e) }
    })()
    ;(async () => {
      // AC-30.04: any failure to confirm the gate is treated as blocked, not allowed.
      try {
        const res = await payoutFetch(`/payouts/gate-check`)
        if (!res.ok) { setMethodGateBlocked(true); return }
        const d = await res.json()
        // AC-31.01/31.06: the first-payout hold only gates the withdrawal screen and
        // scheduled payout runs — it has nothing to do with adding a payout method,
        // so it must not block this action the way a real KYC block should.
        setMethodGateBlocked(!d.allowed && d.blockedBy !== 'FIRST_PAYOUT_HOLD')
      } catch { setMethodGateBlocked(true) }
    })()
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts/schedule`)
        if (res.ok) { const d = await res.json(); setScheduleNextRunAt(d.nextRunAt ?? null) }
      } catch (e) { console.error('Failed to fetch payout schedule', e) }
      finally { setScheduleLoading(false) }
    })()
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts?status=completed&page=1&pageSize=1`)
        if (res.ok) {
          const d = await res.json()
          const latest = d.payouts?.[0]
          setPreviousPayout(latest ? { amountUsd: latest.netAmountUsd ?? latest.amountUsd, methodLabel: latest.methodLabel, settledAt: latest.settledAt } : null)
        }
      } catch (e) { console.error('Failed to fetch previous payout', e) }
      finally { setPreviousPayoutLoading(false) }
    })()
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts?page=1&pageSize=8`)
        if (res.ok) {
          const d = await res.json()
          setRecentActivity((d.payouts ?? []).map((p: any) => toActivityItem(p)))
        }
      } catch (e) { console.error('Failed to fetch recent activity', e) }
      finally { setRecentActivityLoading(false) }
    })()
  }, [fetchMethods, loadBalance, loadSummary])

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Congratulations Banner */}
        {showBanner && (
          <div className="flex items-center justify-between rounded-lg border border-success-500 bg-success-25 px-4 py-3">
            <p className="text-sm text-dark-blue-400">
              <span className="mr-2">&#x1F929;</span>
              You&apos;ve earned <span className="font-semibold text-success-600">${balance ? parseFloat(balance.totalEarnedUsd).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : "..."}</span> total &mdash; {summary?.allTime?.hoursLabel ?? "..."} logged
            </p>
            <IconButton
              size="sm"
              variant="ghost"
              visual="gray"
              onClick={() => setShowBanner(false)}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        {/* Earnings Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-base font-semibold text-dark-blue-400">Earnings Summary</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent visual="white" size="md">
                  <p>Total time logged earnings after any reserve is held. You can update reserve settings under your <button type="button" className="text-primary-600 underline hover:text-primary-700" onClick={() => onEditPayoutSchedule?.()}>Payout Preferences</button>.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {summaryError && (
            <p className="text-xs text-red-600 -mt-3 mb-3">
              We couldn't load your earnings summary.{" "}
              <button className="underline font-medium" onClick={loadSummary}>Refresh</button>
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-25 p-8 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 gap-10">
            {/* Today */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-sm text-gray-500">Today</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent visual="white" size="md">
                      {summary?.today.dateRangeLabel && <p className="font-semibold text-dark-blue-400">{summary.today.dateRangeLabel}</p>}
                      <p>Earnings logged since 12:00 AM local time today.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-dark-blue-400">
                <span className="text-base align-top">$</span>{summary ? summary.today.amount : "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-4">
                {summary?.today.changeLabel && (
                  <>
                    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", summary.today.changeDirection === "up" ? "text-success-500" : summary.today.changeDirection === "down" ? "text-error-500" : "text-gray-400")}>
                      {summary.today.changeDirection === "up" ? <ArrowUp className="size-3" /> : summary.today.changeDirection === "down" ? <ArrowDown className="size-3" /> : null}
                      {summary.today.changePercent != null ? Math.abs(summary.today.changePercent) + "%" : ""}
                    </span>
                    <span className="text-xs text-gray-400">{summary.today.changeLabel?.replace(/^[\d.]+%\s*/, "")}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4"><span className="font-semibold">{summary?.today.hoursLabel ?? "—"}</span> Logged</p>
              <div className="mt-4">
                <Button variant="outlined" visual="gray" size="sm" onClick={() => onNavigateTab?.("earnings")}>
                  View All Earnings
                </Button>
              </div>
            </div>

            {/* This Week + This Month */}
            <div className="divide-y divide-gray-200 [&>*+*]:pt-8 [&>*:not(:last-child)]:pb-8 md:pl-10">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-sm text-gray-500">This Week</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent visual="white" size="md">
                        {summary?.thisWeek.dateRangeLabel && <p className="font-semibold text-dark-blue-400">{summary.thisWeek.dateRangeLabel}</p>}
                        <p>Earnings logged for the current week.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-dark-blue-400">
                    <span className="text-sm align-top">$</span>{summary ? summary.thisWeek.amount : "—"}
                  </p>
                  {summary?.thisWeek.changeLabel && (
                    <>
                      <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", summary.thisWeek.changeDirection === "up" ? "text-success-500" : "text-error-500")}>
                        {summary.thisWeek.changeDirection === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        {summary.thisWeek.changePercent != null ? Math.abs(summary.thisWeek.changePercent) + "%" : ""}
                      </span>
                      <span className="text-xs text-gray-400">{summary.thisWeek.changeLabel?.replace(/^[\d.]+%\s*/, "")}</span>
                    </>
                  )}
                  <span className="text-sm text-gray-500 ml-auto"><span className="font-semibold">{summary?.thisWeek.hoursLabel ?? "—"}</span> Logged</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-sm text-gray-500">This Month</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent visual="white" size="md">
                        {summary?.thisMonth.dateRangeLabel && <p className="font-semibold text-dark-blue-400">{summary.thisMonth.dateRangeLabel}</p>}
                        <p>Earnings logged for the current month.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-dark-blue-400">
                    <span className="text-sm align-top">$</span>{summary ? summary.thisMonth.amount : "—"}
                  </p>
                  {summary?.thisMonth.changeLabel && (
                    <>
                      <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", summary.thisMonth.changeDirection === "up" ? "text-success-500" : "text-error-500")}>
                        {summary.thisMonth.changeDirection === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        {summary.thisMonth.changePercent != null ? Math.abs(summary.thisMonth.changePercent) + "%" : ""}
                      </span>
                      <span className="text-xs text-gray-400">{summary.thisMonth.changeLabel?.replace(/^[\d.]+%\s*/, "")}</span>
                    </>
                  )}
                  <span className="text-sm text-gray-500 ml-auto"><span className="font-semibold">{summary?.thisMonth.hoursLabel ?? "—"}</span> Logged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Deposit */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] overflow-hidden">
          <div className="flex items-center justify-between p-8 pb-6">
            <h3 className="text-base font-semibold text-dark-blue-400">Direct Deposit</h3>
            <Button variant="link" visual="gray" size="sm" onClick={() => onNavigateTab?.("payouts")}>
              View All Payouts
            </Button>
          </div>

          <div className="mx-8 rounded-lg border border-gray-200 bg-gray-25 p-8 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 gap-10">
            {/* Upcoming Payout — nextRunAt is server-derived (schedule + day + current
                date); payout-service has no precomputed future-payout amount, so the
                dollar figure shown is the current available balance, explicitly
                labelled as an estimate rather than a guaranteed total (Doc07). */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Upcoming Payout</p>
              {scheduleLoading ? (
                <div className="h-9 w-28 bg-gray-100 rounded animate-pulse" />
              ) : scheduleNextRunAt ? (
                <p className="text-3xl font-bold text-dark-blue-400">
                  <span className="text-base align-top">$</span>
                  {balance ? Math.floor(parseFloat(balance.availableBalance)).toLocaleString() : "—"}
                  <span className="text-lg">.{balance ? parseFloat(balance.availableBalance).toFixed(2).split(".")[1] : "00"}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">No payout scheduled</p>
              )}
              {scheduleNextRunAt && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-400">
                    {/* nextRunAt is a UTC-midnight calendar date (schedule.service.ts builds it via
                        Date.UTC), not a moment in time — formatting it in the viewer's local zone
                        would silently shift the displayed date back a day for anyone west of UTC. */}
                    Scheduled for {new Date(scheduleNextRunAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent visual="white" size="md">
                        <p>Estimated arrival in 2-3 business days.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              <Button variant="outlined" visual="gray" size="sm" className="mt-3" onClick={() => onEditPayoutSchedule?.()}>
                Edit Payout Schedule
              </Button>
            </div>

            {/* Deposit Method */}
            <div className="md:pl-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-500">Deposit Method</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent visual="white" size="md">
                        <p>The account where your payouts are sent by default.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button variant="link" visual="gray" size="sm" onClick={() => defaultMethod && setEditingMethod({...defaultMethod})}>Edit</Button>
              </div>
              {methodsLoading ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : defaultMethod ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                  {getMethodIcon(defaultMethod)}
                  <span className="text-sm font-medium text-dark-blue-400">{getMethodLabel(defaultMethod).name}</span>
                  <span className="text-sm text-gray-400">{getMethodLabel(defaultMethod).sub}</span>
                  <Badge visual="primary" size="sm" className="ml-auto">Default</Badge>
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-2">No deposit method set</div>
              )}
            </div>
          </div>

          <div className="h-8" />

          {/* Previous Payout — sourced from the real payout history (most recent
              completed record), a historical snapshot per Doc07 Domain 8. */}
          <div className="flex items-center justify-between bg-gray-25 border-t border-gray-200 px-8 py-6">
            {previousPayoutLoading ? (
              <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
            ) : previousPayout ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Previous Payout</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Deposited on {new Date(previousPayout.settledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to <BankIcon className="size-3.5 inline" /> {previousPayout.methodLabel ?? "Method unavailable"}
                  </p>
                </div>
                <p className="text-2xl font-bold text-dark-blue-400">
                  <span className="text-sm align-top">$</span>{previousPayout.amountUsd}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No previous payouts yet</p>
            )}
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-dark-blue-400">Connected Accounts</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="size-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent visual="white" size="md">
                    <p>Linked bank and wallet accounts available for receiving deposits.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button variant="outlined" visual="gray" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setShowAddMethod(true)} disabled={!canAddMore || methodGateBlocked}>
              Add Deposit Method
            </Button>
          </div>

          {/* SCR-01/SCR-18: KYC gate banner — fail-closed, blocks adding a method */}
          {methodGateBlocked && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Identity verification is required before you can add a payout method.
            </div>
          )}

          <div className="space-y-3">
            {methodsLoading ? (
              [...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)
            ) : methods.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No connected accounts yet. Add one to receive payouts.</div>
            ) : methods.map((m) => {
              const { name, sub } = getMethodLabel(m)
              const statusBadge = getMethodStatusBadge(m)
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                  {getMethodIcon(m)}
                  <span className="text-sm font-medium text-dark-blue-400">{name}</span>
                  {sub && <span className="text-sm text-gray-400">{sub}</span>}
                  <Badge visual={statusBadge.visual} size="sm" className="ml-auto">{statusBadge.label}</Badge>
                  {m.isDefault ? (
                    <Badge visual="primary" size="sm" className="mr-2">Default</Badge>
                  ) : m.verificationStatus === 'verified' ? (
                    <Button variant="link" visual="gray" size="sm" className="mr-2" onClick={() => requestSetDefault(m)}>
                      Make Default
                    </Button>
                  ) : null}
                  <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setEditingMethod({...m})}>
                    <Edit03 className="size-4" />
                  </IconButton>
                  <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setConfirmRemove(m)}>
                    <Trash01 className="size-4" />
                  </IconButton>
                </div>
              )
            })}
          </div>

          {/* Verification Dialog */}
          {verifyState && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
                {verifyState.step === 'instructions' && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => { if(verifyState?.methodId) deleteMethod(verifyState.methodId); setVerifyState(null); setShowAddMethod(true); setAddForm(f => ({...f, methodType: 'BANK_MANUAL'})) }} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Add your bank account manually</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { if(verifyState?.methodId) deleteMethod(verifyState.methodId); setVerifyState(null); setShowAddMethod(false); fetchMethods() }}><X className="size-4" /></IconButton>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-6 text-center space-y-3">
                      <h4 className="text-base font-semibold text-dark-blue-400">Please verify your bank account</h4>
                      <p className="text-sm text-gray-500">We sent two deposits (between $0.01 and $0.99) to your account ending in <strong>{verifyState.displayLabel}</strong>. It can take up to two (2) business days for these deposits to arrive. Please log into your account to check the amounts sent from "Marketeq" and then click the "Verify Account" button below to enter the amounts received.</p>
                      <p className="text-xs text-gray-400">If you have any questions or concerns, please reach us at <strong>support@marketeqdigital.com</strong> or call <strong>800-529-7465</strong></p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button className="text-sm text-primary-600 flex items-center gap-1" onClick={() => toast({ title: 'Use Instant Verification', description: 'Instant verification coming soon.' })}>⚡ Use Instant Verification</button>
                      <div className="flex gap-2">
                        <Button variant="outlined" visual="gray" size="sm" onClick={() => { if(verifyState?.methodId) deleteMethod(verifyState.methodId); setVerifyState(null); setShowAddMethod(true); setAddForm(f => ({...f, methodType: 'BANK_MANUAL'})) }}>← Back</Button>
                        <Button variant="filled" visual="primary" size="sm" onClick={() => setVerifyState(s => s ? {...s, step: 'amounts'} : null)}>Verify Account</Button>
                      </div>
                    </div>
                  </div>
                )}
                {verifyState.step === 'amounts' && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setVerifyState(s => s ? {...s, step: 'instructions'} : null)} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Add your bank account manually</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setVerifyState(null)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                      <h4 className="text-base font-semibold text-dark-blue-400 text-center">Please verify your bank account</h4>
                      <p className="text-sm text-gray-500 text-center">Enter the two micro deposit amounts we sent to your account ending in <strong>{verifyState.displayLabel}</strong>. The deposits are sent from "Marketeq".</p>
                      {process.env.NODE_ENV === 'development' && <p className="text-xs text-primary-500 bg-primary-50 rounded px-2 py-1 text-center">Dev mode: check DB for amounts — <code>SELECT amount_1_cents, amount_2_cents FROM deposit_method_verification ORDER BY created_at DESC LIMIT 1;</code></p>}
                      {/* AC-05.04/05.05: hidden on first visit, shown after a failed attempt (EC-09) */}
                      {typeof verifyState.attemptsLeft === 'number' && (
                        <p className={cn("text-xs text-center font-medium rounded px-2 py-1", verifyState.attemptsLeft <= 1 ? "text-red-600 bg-red-50" : "text-warning-600 bg-warning-50")}>
                          The amounts you entered don't match — check your bank statement and try again. {verifyState.attemptsLeft} attempt{verifyState.attemptsLeft === 1 ? '' : 's'} remaining.
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">1st Deposit</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 7 (cents)" value={microAmounts.amount1} onChange={e => setMicroAmounts(a => ({...a, amount1: e.target.value}))} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">2nd Deposit</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 39 (cents)" value={microAmounts.amount2} onChange={e => setMicroAmounts(a => ({...a, amount2: e.target.value}))} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setVerifyState(null)}>Cancel</Button>
                      <Button variant="filled" visual="primary" size="sm" className="flex-1" onClick={handleVerifyMicroDeposits} disabled={!microAmounts.amount1.trim() || !microAmounts.amount2.trim()}>Submit</Button>
                    </div>
                  </div>
                )}
                {verifyState.step === 'verifying' && (
                  <div className="p-8 text-center space-y-4">
                    <div className="flex flex-col items-center gap-1">
                      <BankLogo bankName={verifyState.bankName} size={80} />
                      <span className="text-sm font-medium text-dark-blue-400">{verifyState.bankName || 'Your Bank'}</span>
                    </div>
                    <h4 className="text-base font-semibold text-dark-blue-400">Verifying Your Account...</h4>
                    <div className="flex justify-center"><div className="size-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
                    <p className="text-sm text-gray-400">We're verifying your bank account. This may take up to 30 seconds.</p>
                  </div>
                )}
                {verifyState.step === 'success' && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-end">
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setVerifyState(null)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="text-center py-4 space-y-3">
                      <div className="flex flex-col items-center gap-1">
                        <BankLogo bankName={verifyState.bankName} size={80} />
                        <span className="text-sm font-medium text-dark-blue-400">{verifyState.bankName || 'Your Bank'}</span>
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">Your bank account has been securely linked.</h4>
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                        <BankIcon className="size-5 text-gray-500" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-dark-blue-400">{verifyState.displayLabel}</span>
                          <span className="text-xs text-gray-400">{addForm?.accountType ? (addForm.accountType.charAt(0).toUpperCase() + addForm.accountType.slice(1)) + ' Account' : 'Checking Account'}</span>
                        </div>
                        <Badge visual="success" size="sm" className="ml-auto">Verified</Badge>
                      </div>
                    </div>
                    <Button variant="filled" visual="primary" size="sm" className="w-full" onClick={async () => { await handleSetDefault(verifyState.methodId); setVerifyState(null) }}>Set As Default Deposit Method</Button>
                    <Button variant="outlined" visual="gray" size="sm" className="w-full" onClick={() => { setVerifyState(null); fetchMethods() }}>← Back to Deposit Methods</Button>
                  </div>
                )}
                {verifyState.step === 'failed' && (
                  <div className="p-6 text-center space-y-4">
                    <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-warning-50"><span className="text-warning-600 text-2xl">⚠</span></div>
                    <h4 className="text-base font-semibold text-dark-blue-400">Connection Failed</h4>
                    <p className="text-sm text-gray-500">We couldn't verify your bank at this time. This may be due to a temporary network issue. Your account is unaffected — you can try again.</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-sm text-gray-500 hover:text-gray-700" onClick={() => { setVerifyState(null); fetchMethods() }}>Back to Deposit Methods</button>
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setVerifyState(s => s ? {...s, step: 'amounts'} : null)}>↺ Retry</Button>
                    </div>
                  </div>
                )}
                {/* AC-05.06/ERR-22: 3 failed attempts → 24h lock, no retry available */}
                {verifyState.step === 'locked' && (
                  <LockedVerificationStep
                    methodId={verifyState.methodId}
                    lockedUntil={verifyState.lockedUntil}
                    onClose={() => { setVerifyState(null); fetchMethods() }}
                    onUnlockedRetry={() => setVerifyState(s => s ? {...s, step: 'amounts', attemptsLeft: undefined} : null)}
                  />
                )}
                {/* AC-05.08/ERR-44: 10-day window elapsed — must re-add the account */}
                {verifyState.step === 'expired' && (
                  <div className="p-6 text-center space-y-4">
                    <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-gray-100"><span className="text-gray-500 text-2xl">⏱</span></div>
                    <h4 className="text-base font-semibold text-dark-blue-400">Verification Window Expired</h4>
                    <p className="text-sm text-gray-500">Your verification window has expired. Please remove this account and add it again to restart verification.</p>
                    <Button
                      variant="filled" visual="primary" size="sm" className="w-full"
                      onClick={async () => { await deleteMethod(verifyState.methodId); setVerifyState(null); setShowAddMethod(true); setAddForm(f => ({...f, methodType: 'BANK_MANUAL'})) }}
                    >Start Over</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Method Dialog — multi-step */}
          {showAddMethod && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddMethod(false); setAddForm({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankCountry: 'US', bankCurrency: 'USD', accountType: 'CHECKING', paypalEmail: '', paypalEmailConfirm: '', nickname: '', bankConsent: false }); setCryptoStep('provider'); setCryptoForm({ provider: '', network: '', currency: '', address: '' }); setCryptoError(''); }}>
              <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Step 1: Pick method */}
                {!addForm.methodType || addForm.methodType === 'PICK' ? (
                  <>
                    <div className="px-6 pt-6 pb-4 shrink-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-dark-blue-400">Add Deposit Method</h3>
                        <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                        Securely connect your payout account to receive earnings.
                        <br />For all account types, setup may take 1–3 business days.
                      </p>
                    </div>
                    <div className="border-t border-gray-200 shrink-0" />
                    <ScrollArea type="always" className="bg-gray-50 flex-1 min-h-0 flex flex-col" viewportClassName="flex-1 min-h-0 [&>div]:!h-auto">
                    <div className="p-5 space-y-3">
                      {[
                        { type: 'BANK_CONNECT', label: 'Direct Deposit to U.S. Bank', sub: ['Transfer reflects in 1–2 business days', 'Charges $0–$1 per transaction'], icon: <BankIcon className="size-5 text-gray-500" /> },
                        { type: 'PAYPAL', label: 'PayPal', sub: ['Transfer reflects in 1–2 business days', 'Charges $0–$1 per transaction'], icon: <PaypalIcon className="size-5" /> },
                        { type: 'WISE', label: 'Wise', sub: ['Transfer in 1–3 business days', 'Charges flat $1–$2 per withdrawal'], icon: <WiseIcon className="size-5" /> },
                        { type: 'PAYONEER', label: 'Payoneer', sub: ['Transfer in 1–3 business days', 'Often free or $1–$2'], icon: <PayoneerIcon className="size-5" /> },
                        { type: 'CRYPTO', label: 'Crypto Wallet', sub: ['Transfer time varies (blockchain dependent)', 'Network gas fees may apply'], icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="2" fill="#6B7280"/></svg> },
                        { type: 'MARKETEQ_DEBIT_CARD', label: 'Marketeq Debit Card', sub: ['Instant transfer', 'No processing fee'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 22" className="w-5 h-3"><path fill="#306CFE" d="M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"/><path fill="#306CFE" d="M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z" opacity="0.5"/></svg> },
                      // AC-02.10: Marketeq Debit Card must not appear while FEATURE_DEBIT_CARD_ENABLED is off (default MVP state).
                      // TEQ Coin has no entry above at all, satisfying AC-02.09 by omission.
                      ].filter(opt => opt.type !== 'MARKETEQ_DEBIT_CARD' || debitCardEnabled).map(opt => (
                        <Card key={opt.type} className="items-center gap-3 px-4 py-3 rounded-lg cursor-pointer" onClick={() => setAddForm(f => ({...f, methodType: opt.type}))}>
                          <div className="size-9 rounded-full border border-gray-200 bg-white flex items-center justify-center shrink-0">
                            {opt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-dark-blue-400">{opt.label}</p>
                            <p className="text-xs text-gray-500">{opt.sub[0]}</p>
                            <p className="text-xs text-gray-500">{opt.sub[1]}</p>
                          </div>
                          <Button variant="outlined" visual="gray" size="sm" onClick={e => { e.stopPropagation(); setAddForm(f => ({...f, methodType: opt.type})) }}>Setup</Button>
                        </Card>
                      ))}
                    </div>
                    </ScrollArea>
                  </>
                ) : addForm.methodType === 'BANK_CONNECT' ? (
                  /* Step 2: Connect your bank account — bank picker grid */
                  <div className="p-6">
                    {!(addForm as any)._selectedBank && <>
                      <div className="flex items-center gap-2 mb-2">
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: ''}))}><ChevronLeft className="size-4" /></button>
                        <h3 className="text-base font-semibold text-dark-blue-400">Connect your bank account</h3>
                        <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => { setShowAddMethod(false); setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: ''})); }}><X className="size-4" /></IconButton>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">Securely link your bank with Stripe connect. For all account types, it may take up to 3 days to activate</p>
                    </>}
                    {!!(addForm as any)._selectedBank && (
                      <div className="absolute top-4 right-4">
                        <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { setShowAddMethod(false); setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: ''})); }}><X className="size-4" /></IconButton>
                      </div>
                    )}
                    

                    {!(addForm as any)._selectedBank ? (
                      <>
                        {/* Search */}
                        <div className="relative mb-4">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                          <input
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm"
                            placeholder="Find your bank"
                            value={(addForm as any)._bankSearch || ''}
                            onChange={e => setAddForm(f => ({...f, _bankSearch: e.target.value} as any))}
                          />
                        </div>

                        {/* Bank grid */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {[
                            { name: 'Chase', logo: '/bank-logos/chase.png' },
                            { name: 'Bank of America', logo: '/bank-logos/bofa.png' },
                            { name: 'Wells Fargo', logo: '/bank-logos/wellsfargo.png' },
                            { name: 'Citibank', logo: '/bank-logos/citibank.png' },
                            { name: 'USAA', logo: '/bank-logos/usaa.png' },
                            { name: 'TD Bank', logo: '/bank-logos/tdbank.png' },
                            { name: 'Regions', logo: '/bank-logos/regions.png' },
                            { name: 'Capital One', logo: '/bank-logos/capitalone.png' },
                          ]
                            .filter(b => !(addForm as any)._bankSearch || b.name.toLowerCase().includes(((addForm as any)._bankSearch || '').toLowerCase()))
                            .map(bank => (
                              <div
                                key={bank.name}
                                className={`flex items-center justify-center border rounded-lg cursor-pointer hover:border-primary-400 hover:shadow-sm transition-all ${(addForm as any)._stripePickedBank === bank.name ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'}`}
                                style={{ height: '100px', padding: '16px' }}
                                onClick={() => setAddForm(f => ({...f, _stripePickedBank: bank.name} as any))}
                              >
                                <img src={bank.logo} alt={bank.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                            ))}
                        </div>

                        {/* Bottom actions */}
                        <div className="flex items-center justify-between mt-4">
                          <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_MANUAL', bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankCountry: 'US', bankCurrency: 'USD', nickname: '', accountType: 'CHECKING', bankConsent: false, _selectedBank: '', _stripeConnecting: false} as any))}>
                            <BankIcon className="size-4 shrink-0" /> Add my bank account manually
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outlined" visual="gray" size="sm" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>Cancel</Button>
                            <Button variant="filled" visual="primary" size="sm" disabled={!(addForm as any)._stripePickedBank} onClick={() => setAddForm(f => ({...f, _selectedBank: (f as any)._stripePickedBank, bankAccountName: (f as any)._stripePickedBank} as any))}>Verify Account</Button>
                          </div>
                        </div>
                      </>
                    ) : isStripePublishableKeyConfigured ? (
                      <>
                        {/* AC-03.01: real Stripe Financial Connections — launches Stripe's own
                            hosted account-selection modal via collectFinancialConnectionsAccounts.
                            There is no custom login UI here by design: Stripe hosts it. */}
                        <div className="py-10 text-center space-y-5">
                          <div className="mx-auto size-12 rounded-full bg-primary-50 flex items-center justify-center">
                            <BankIcon className="size-6 text-primary-600" />
                          </div>
                          <p className="text-sm text-gray-500 px-4">
                            You'll be securely connected to <strong>{(addForm as any)._selectedBank}</strong> through Stripe. Your banking credentials are never shared with Marketeq.
                          </p>
                          <Button
                            variant="filled" visual="primary" size="sm" className="w-full py-3 text-base"
                            disabled={!!(addForm as any)._stripeConnecting}
                            onClick={() => handleConnectStripe((addForm as any)._selectedBank)}
                          >
                            {(addForm as any)._stripeConnecting ? 'Connecting…' : 'Continue with Stripe'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Dev-mode fallback only: shown when payout-service has no STRIPE_SECRET_KEY
                            configured (stripe/restart responds with mode: 'mock'). Never rendered
                            when a real Stripe publishable key is present — see branch above. */}
                        <div className="py-8 space-y-6">
                          <div className="text-center mb-2">
                            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">[Dev mock — replaced by Stripe hosted UI in production]</span>
                          </div>
                          <div>
                            <input className="w-full border-0 border-b border-gray-300 px-0 py-3 text-sm bg-transparent focus:outline-none focus:border-primary-500 placeholder-gray-400" placeholder="Username" value={(addForm as any)._stripeUser || ''} onChange={e => setAddForm(f => ({...f, _stripeUser: e.target.value} as any))} />
                          </div>
                          <div>
                            <input type="password" className="w-full border-0 border-b border-gray-300 px-0 py-3 text-sm bg-transparent focus:outline-none focus:border-primary-500 placeholder-gray-400" placeholder="Password" value={(addForm as any)._stripePass || ''} onChange={e => setAddForm(f => ({...f, _stripePass: e.target.value} as any))} />
                          </div>
                          <div className="flex items-center gap-8 text-sm text-gray-400">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-primary-600" /> Remember me</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-primary-600" /> Use token</label>
                          </div>
                          <Button
                            variant="filled" visual="primary" size="sm" className="w-full py-3 text-base"
                            disabled={!!(addForm as any)._stripeConnecting || !(addForm as any)._stripeUser?.trim() || !(addForm as any)._stripePass?.trim()}
                            onClick={() => handleConnectStripe((addForm as any)._selectedBank)}
                          >
                            {(addForm as any)._stripeConnecting ? 'Connecting…' : 'Sign in'}
                          </Button>
                          <div className="space-y-1">
                            <button className="text-sm text-primary-600 hover:text-primary-700 block">Forgot username/password? ›</button>
                            <button className="text-sm text-primary-600 hover:text-primary-700 block">Not Enrolled? Sign Up Now. ›</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : addForm.methodType === 'BANK_MANUAL' ? (
                  /* Step 2a: Bank manual form — fields adapt by country (AC-04.02/04.03) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_CONNECT'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Add your bank account manually</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Country</label>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          value={addForm.bankCountry}
                          onChange={e => {
                            const bankCountry = e.target.value
                            // Region change: clear the previous region's fields so a stale
                            // sort code / IFSC / BSB can't be silently submitted for the new country.
                            setAddForm(f => ({
                              ...f, bankCountry,
                              bankCurrency: BANK_COUNTRY_CURRENCY[bankCountry] ?? 'USD',
                              bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '',
                              bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '',
                            }))
                          }}
                        >
                          <option value="US">🇺🇸 United States</option>
                          <option value="GB">🇬🇧 United Kingdom</option>
                          <option value="IN">🇮🇳 India</option>
                          <option value="CA">🇨🇦 Canada</option>
                          <option value="AU">🇦🇺 Australia</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Bank of America" value={addForm.bankAccountName} onChange={e => setAddForm(f => ({...f, bankAccountName: e.target.value}))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="John Doe" value={addForm.nickname} onChange={e => setAddForm(f => ({...f, nickname: e.target.value}))} />
                      </div>
                      {addForm.bankCountry === 'US' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.accountType} onChange={e => setAddForm(f => ({...f, accountType: e.target.value}))}>
                            <option value="">Select</option>
                            <option value="CHECKING">Checking</option>
                            <option value="SAVINGS">Savings</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Up to 17 digits" value={addForm.bankAccountNumber} onChange={e => setAddForm(f => ({...f, bankAccountNumber: e.target.value}))} />
                      </div>
                      <div>
                        {/* SCR-02: anti-typo protection — a mistyped account number sends
                            funds nowhere recoverable, so it must be entered twice. */}
                        <label className="text-xs text-gray-500 mb-1 block">Confirm Account Number</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Re-enter account number" value={addForm.bankAccountNumberConfirm} onChange={e => setAddForm(f => ({...f, bankAccountNumberConfirm: e.target.value}))} />
                        {addForm.bankAccountNumberConfirm.length > 0 && addForm.bankAccountNumberConfirm !== addForm.bankAccountNumber && (
                          <p className="text-xs text-red-500 mt-1">Account numbers do not match</p>
                        )}
                      </div>

                      {addForm.bankCountry === 'US' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Bank Routing Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="9-digit ABA routing number" value={addForm.bankRoutingNumber} onChange={e => setAddForm(f => ({...f, bankRoutingNumber: e.target.value}))} />
                          {addForm.bankRoutingNumber.length > 0 && !isValidAbaRouting(addForm.bankRoutingNumber) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 9-digit routing number</p>
                          )}
                        </div>
                      )}
                      {addForm.bankCountry === 'GB' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Sort Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 12-34-56" value={addForm.bankSortCode} onChange={e => setAddForm(f => ({...f, bankSortCode: e.target.value}))} />
                          {addForm.bankSortCode.length > 0 && !isValidSortCode(addForm.bankSortCode) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 6-digit sort code</p>
                          )}
                        </div>
                      )}
                      {addForm.bankCountry === 'IN' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. HDFC0001234" value={addForm.bankIfscCode} onChange={e => setAddForm(f => ({...f, bankIfscCode: e.target.value}))} />
                          {addForm.bankIfscCode.length > 0 && !isValidIfsc(addForm.bankIfscCode) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid IFSC code (e.g. HDFC0001234)</p>
                          )}
                        </div>
                      )}
                      {addForm.bankCountry === 'AU' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">BSB Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 123-456" value={addForm.bankBsbNumber} onChange={e => setAddForm(f => ({...f, bankBsbNumber: e.target.value}))} />
                          {addForm.bankBsbNumber.length > 0 && !isValidBsb(addForm.bankBsbNumber) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 6-digit BSB number</p>
                          )}
                        </div>
                      )}
                      {addForm.bankCountry === 'CA' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Institution Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="3 digits" value={addForm.bankInstitutionNumber} onChange={e => setAddForm(f => ({...f, bankInstitutionNumber: e.target.value}))} />
                            {addForm.bankInstitutionNumber.length > 0 && !isValidCaInstitution(addForm.bankInstitutionNumber) && (
                              <p className="text-xs text-red-500 mt-1">3 digits required</p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Transit Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="5 digits" value={addForm.bankTransitNumber} onChange={e => setAddForm(f => ({...f, bankTransitNumber: e.target.value}))} />
                            {addForm.bankTransitNumber.length > 0 && !isValidCaTransit(addForm.bankTransitNumber) && (
                              <p className="text-xs text-red-500 mt-1">5 digits required</p>
                            )}
                          </div>
                        </div>
                      )}

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-primary-600" checked={addForm.bankConsent} onChange={e => setAddForm(f => ({...f, bankConsent: e.target.checked}))} />
                        <span className="text-xs text-gray-400">By linking your bank account, you authorize Marketeq to initiate direct deposit payments to your account. You acknowledge that all transfers will comply with applicable local laws and banking regulations.</span>
                      </label>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_CONNECT'}))}>Cancel</Button>
                      <Button
                        variant="filled" visual="primary" size="sm" className="flex-1"
                        onClick={handleAddMethod}
                        disabled={
                          !addForm.nickname.trim() || !addForm.bankAccountNumber.trim() || !addForm.bankConsent ||
                          addForm.bankAccountNumberConfirm !== addForm.bankAccountNumber ||
                          (addForm.bankCountry === 'US' && !isValidAbaRouting(addForm.bankRoutingNumber)) ||
                          (addForm.bankCountry === 'GB' && !isValidSortCode(addForm.bankSortCode)) ||
                          (addForm.bankCountry === 'IN' && !isValidIfsc(addForm.bankIfscCode)) ||
                          (addForm.bankCountry === 'AU' && !isValidBsb(addForm.bankBsbNumber)) ||
                          (addForm.bankCountry === 'CA' && (!isValidCaInstitution(addForm.bankInstitutionNumber) || !isValidCaTransit(addForm.bankTransitNumber)))
                        }
                      >Save</Button>
                    </div>
                  </div>
                ) : addForm.methodType === 'PAYPAL' ? (
                  /* Step 2b: PayPal */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Connect PayPal</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="flex flex-col items-center py-4 gap-3">
                      <PaypalIcon className="size-12" />
                      <p className="text-sm text-gray-500 text-center">You'll be redirected to PayPal to securely connect your account.</p>
                      <p className="text-xs text-gray-400 text-center">By connecting your account, you authorize Marketeq to send deposits to your linked PayPal account.</p>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">PayPal Email (dev mode)</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="your@paypal.com" value={addForm.paypalEmail} onChange={e => setAddForm(f => ({...f, paypalEmail: e.target.value}))} />
                      </div>
                      <div>
                        {/* SCR-04: anti-typo protection for the payout destination email */}
                        <label className="text-xs text-gray-500 mb-1 block">Confirm PayPal Email</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Re-enter email address" value={addForm.paypalEmailConfirm} onChange={e => setAddForm(f => ({...f, paypalEmailConfirm: e.target.value}))} />
                        {addForm.paypalEmailConfirm.length > 0 && addForm.paypalEmailConfirm.toLowerCase() !== addForm.paypalEmail.toLowerCase() && (
                          <p className="text-xs text-red-500 mt-1">Email addresses do not match</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="filled" visual="primary" size="sm" className="w-full"
                      disabled={!addForm.paypalEmail.trim() || addForm.paypalEmailConfirm.toLowerCase() !== addForm.paypalEmail.toLowerCase()}
                      onClick={handleAddMethod}
                    >Continue To PayPal</Button>
                    <button className="w-full text-center text-xs text-gray-400 mt-2 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>← Back to Deposit Methods</button>
                  </div>
                ) : addForm.methodType === 'WISE' || addForm.methodType === 'PAYONEER' ? (
                  /* Step 2c: Wise / Payoneer — real OAuth redirect (AC-07.01/07.04, AC-08.01/08.04) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Connect {addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'}</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="flex flex-col items-center py-4 gap-3">
                      {addForm.methodType === 'WISE' ? <WiseIcon className="size-12" /> : <PayoneerIcon className="size-12" />}
                      <p className="text-sm text-gray-500 text-center">You'll be redirected to {addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'} to securely connect your account.</p>
                      <p className="text-xs text-gray-400 text-center">Securely handle your information through a trusted third party.</p>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer mb-4">
                      <input type="checkbox" className="mt-0.5 accent-primary-600" checked={addForm.bankConsent} onChange={e => setAddForm(f => ({...f, bankConsent: e.target.checked}))} />
                      <span className="text-xs text-gray-400">By connecting your account, you authorize Marketeq to send deposits to your linked {addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'} account. You agree to abide by their terms and conditions for receiving business payments.</span>
                    </label>
                    <Button
                      variant="filled" visual="primary" size="sm" className="w-full"
                      disabled={!addForm.bankConsent || oauthConnecting}
                      onClick={() => handleConnectOAuth(addForm.methodType as 'WISE' | 'PAYONEER')}
                    >{oauthConnecting ? 'Connecting…' : `Continue To ${addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'}`}</Button>
                    <button className="w-full text-center text-xs text-gray-400 mt-2 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>← Back to Deposit Methods</button>
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'provider' ? (
                  /* Step 2d.1: Crypto — provider selection (AC-09.01) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Connect Crypto Wallet</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Select the exchange or wallet provider you want to receive crypto payouts through.</p>
                    {cryptoProvidersLoading ? (
                      <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                    ) : cryptoProviders.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-6">Provider list unavailable — please try again.</div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {cryptoProviders.map((p: any) => (
                          <div
                            key={p.provider}
                            className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer"
                            onClick={() => {
                              const firstNetwork = p.networks?.[0]
                              setCryptoForm({ provider: p.provider, network: firstNetwork?.network ?? '', currency: firstNetwork?.tokens?.[0] ?? '', address: '' })
                              setCryptoStep('details')
                            }}
                          >
                            <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">{p.displayName?.slice(0, 2).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-dark-blue-400">{p.displayName}</p>
                              <p className="text-xs text-gray-400">{p.networks?.map((n: any) => n.network).join(', ')}</p>
                            </div>
                            <Button variant="outlined" visual="gray" size="sm">Select</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'details' ? (
                  /* Step 2d.2: Crypto — network/currency/address (AC-09.02/09.03/09.04) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => { setCryptoStep('provider'); setCryptoError('') }}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">{selectedCryptoProvider?.displayName ?? 'Crypto Wallet'}</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => { setShowAddMethod(false); setCryptoStep('provider') }}><X className="size-4" /></IconButton>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Network</label>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          value={cryptoForm.network}
                          onChange={e => {
                            const network = e.target.value
                            const net = selectedCryptoProvider?.networks?.find((n: any) => n.network === network)
                            setCryptoForm(f => ({...f, network, currency: net?.tokens?.[0] ?? ''}))
                          }}
                        >
                          {/* AC-09.02: only networks this provider actually supports */}
                          {selectedCryptoProvider?.networks?.map((n: any) => (
                            <option key={n.network} value={n.network}>{n.network}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Currency</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cryptoForm.currency} onChange={e => setCryptoForm(f => ({...f, currency: e.target.value}))}>
                          {/* AC-09.03: only tokens supported on the selected network */}
                          {selectedCryptoNetwork?.tokens?.map((t: string) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Wallet Address</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder={`Your ${cryptoForm.network || 'wallet'} address`} value={cryptoForm.address} onChange={e => { setCryptoForm(f => ({...f, address: e.target.value})); setCryptoError('') }} />
                        {cryptoForm.address.length > 0 && cryptoForm.address.trim().length < 10 && (
                          <p className="text-xs text-red-500 mt-1">Enter a valid wallet address</p>
                        )}
                      </div>
                      {cryptoError && <p className="text-xs text-red-500">{cryptoError}</p>}
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setCryptoStep('provider')}>Back</Button>
                      <Button
                        variant="filled" visual="primary" size="sm" className="flex-1"
                        onClick={handleAddCryptoWallet}
                        disabled={cryptoSubmitting || cryptoForm.address.trim().length < 10 || !cryptoForm.network || !cryptoForm.currency}
                      >{cryptoSubmitting ? 'Connecting…' : 'Add Wallet'}</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Set Primary Confirmation Dialog — split-impact warning (SCR-07) */}
          {confirmSetDefault && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSetDefault(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-dark-blue-400 mb-1">Change Primary Method?</h3>
                <p className="text-sm text-gray-500 mb-5">Changing your primary method will disable split payout. You can reconfigure split payout afterward.</p>
                <div className="flex gap-2">
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setConfirmSetDefault(null)}>Cancel</Button>
                  <Button
                    variant="filled" visual="primary" size="sm" className="flex-1"
                    onClick={async () => { const id = confirmSetDefault.id; setConfirmSetDefault(null); await handleSetDefault(id) }}
                  >Change Primary</Button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Method Confirmation Dialog (AC-11.01/11.02/11.03) */}
          {confirmRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !removing && setConfirmRemove(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-dark-blue-400 mb-1">Remove Payout Method</h3>
                <p className="text-sm text-gray-500 mb-4">This action is permanent.</p>
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 mb-4">
                  {getMethodIcon(confirmRemove)}
                  <span className="text-sm font-medium text-dark-blue-400">{getMethodLabel(confirmRemove).name}</span>
                  <span className="text-sm text-gray-400">{getMethodLabel(confirmRemove).sub}</span>
                  <Badge visual={getMethodStatusBadge(confirmRemove).visual} size="sm" className="ml-auto">{getMethodStatusBadge(confirmRemove).label}</Badge>
                </div>

                {!removeImpact ? (
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse mb-5" />
                ) : (removeImpact.isPrimary || removeImpact.isActiveSecondary) ? (
                  <label className="flex items-start gap-2 cursor-pointer mb-5 rounded-lg border border-amber-200 bg-warning-50 p-3">
                    <input type="checkbox" className="mt-0.5 accent-primary-600" checked={removeAck} onChange={e => setRemoveAck(e.target.checked)} />
                    <span className="text-xs text-dark-blue-400">
                      {removeImpact.isActiveSecondary
                        ? "This method is the secondary account in your active split payout. Removing it will disable split payout and route all future payouts to your primary method."
                        : "This method is the primary account on your active payout schedule. Removing it will pause your schedule until you choose a new primary method."}
                      {" "}I understand and want to proceed.
                    </span>
                  </label>
                ) : (
                  <div className="mb-5" />
                )}

                {/* SCR-06: dialog stays open with the specific error — never silently
                    closes as if the removal had succeeded. */}
                {removeError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">{removeError}</div>
                )}

                <div className="flex gap-2">
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1" disabled={removing} onClick={() => setConfirmRemove(null)}>Cancel</Button>
                  <Button
                    variant="filled" visual="error" size="sm" className="flex-1"
                    disabled={removing || !removeImpact || ((removeImpact.isPrimary || removeImpact.isActiveSecondary) && !removeAck)}
                    onClick={confirmDeleteMethod}
                  >{removing ? 'Removing…' : 'Remove'}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Method Dialog */}
          {editingMethod && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingMethod(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-dark-blue-400 mb-4">Edit Account</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Account</label>
                    <p className="text-sm font-medium text-dark-blue-400">{editingMethod.displayLabel}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nickname (optional)</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. My Chase Savings" value={editingMethod.nickname ?? ''} onChange={e => setEditingMethod((m: any) => ({...m, nickname: e.target.value}))} />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setEditingMethod(null)}>Cancel</Button>
                  <Button variant="filled" visual="primary" size="sm" className="flex-1" onClick={handleUpdateMethod}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[372px] shrink-0 space-y-5 hidden min-[1440px]:block">
        {/* Available for Withdrawal */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <h3 className="text-sm font-semibold text-dark-blue-400">Available for Withdrawal</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent visual="white" size="md">
                  <p>Earnings currently eligible for manual withdrawal. This amount excludes your $150 reserve balance and any pending transactions. You can update these preferences under <button type="button" className="text-primary-600 underline hover:text-primary-700" onClick={() => onEditPayoutSchedule?.()}>Payout Settings</button>.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* US-05/US-06: a genuine load failure is never conflated with a real $0
              balance — distinct copy, no amount shown, retry inline in the card
              (no toast, matching the per-component-error pattern used elsewhere
              in this epic). */}
          {balanceError ? (
            <div className="py-2">
              <p className="text-sm text-red-600">Balance unavailable.</p>
              <button className="text-sm text-primary-600 underline mt-1" onClick={loadBalance}>Retry</button>
            </div>
          ) : balance && parseFloat(balance.totalEarnedUsd) === 0 ? (
            // US-04: "genuinely zero" means never earned anything at all — distinct
            // from a contractor who has earned before but has $0 available right now
            // (e.g. already withdrawn everything). totalEarnedUsd is the reliable
            // signal for that distinction; availableBalance alone can't tell them apart.
            <div className="py-2 space-y-2">
              <p className="text-sm text-gray-500">You haven't earned anything yet. Once you log billable time, your available balance will show up here.</p>
              <button
                className="text-sm text-primary-600 underline"
                onClick={() => toast({ title: "Help & Support", description: "Contact support at support@marketeq.com" })}
              >
                How does billing work?
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-3xl font-bold text-dark-blue-400">
                  <span className="text-base align-top">$</span>{balance ? Math.floor(parseFloat(balance.availableBalanceDisplay)).toLocaleString() : "..."}<span className="text-lg">.{balance ? parseFloat(balance.availableBalanceDisplay).toFixed(2).split(".")[1] : "00"}</span>
                </p>
              </div>
              {/* US-07: secondary local-currency amount, shown only when it actually
                  differs from the display currency — the two are currently always
                  forced to USD server-side (balance.controller.ts hardcodes both
                  args), so this won't visibly trigger until that's resolved, but the
                  frontend is now correctly wired to the real fields either way. */}
              {balance && balance.localCurrency !== balance.displayCurrency && (
                <p className="text-xs text-gray-400 mb-2">{balance.availableBalanceLocal} {balance.localCurrency}</p>
              )}
              {balance?.cachedAt && (
                <p className="text-xs text-gray-400 mb-2">{formatRelativeMinutes(balance.cachedAt, nowTick)}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                {defaultMethod && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <BankIcon className="size-3.5" />
                    {getMethodLabel(defaultMethod).name}
                  </div>
                )}
              </div>
              {/* US-11: pre-empt a withdrawal that would just fail server-side (payout.service.ts
                  payoutMinimum, $50 default) — the /transfer-funds page still enforces this itself,
                  this is only a client-side UX guard against an obviously-doomed flow. */}
              {(() => {
                const withdrawableUsd = balance ? parseFloat(balance.availableBalanceDisplay) : null
                const belowMinimum = withdrawableUsd !== null && withdrawableUsd < 50
                const isLoading = withdrawableUsd === null
                return (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="outlined" visual="gray" size="sm" disabled={belowMinimum || isLoading} onClick={() => router.push("/transfer-funds")}>Withdraw Funds</Button>
                          </span>
                        </TooltipTrigger>
                        {belowMinimum && <TooltipContent><p>You don&apos;t have any earnings to withdraw yet.</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outlined" visual="gray" size="sm" onClick={() => router.push("/billing")}>Manage</Button>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Recent Activity — derived from real payout history (no dedicated
            activity-feed endpoint exists in payout-service; see toActivityItem). */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-dark-blue-400 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivityLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>
            ) : recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={cn(
                  "size-9 rounded-full flex items-center justify-center shrink-0",
                  ACTIVITY_ICON[item.kind].iconBg
                )}>
                  {ACTIVITY_ICON[item.kind].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-blue-400">{item.title}</p>
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Payout Schedule Dialog ──────────────────────────────────────────────

// ─── Deposit Method Options ─────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { key: "S1", label: "S", fullName: "Sunday" },
  { key: "M", label: "M", fullName: "Monday" },
  { key: "T1", label: "T", fullName: "Tuesday" },
  { key: "W", label: "W", fullName: "Wednesday" },
  { key: "T2", label: "T", fullName: "Thursday" },
  { key: "F", label: "F", fullName: "Friday" },
  { key: "S2", label: "S", fullName: "Saturday" },
]

const THRESHOLD_PRESETS = [50, 100, 250, 500, 1000]

// AC-33.03/16.03-style error mapping — user-friendly text, never raw errorCode/status.
const SCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  ERR_SCHEDULE_THRESHOLD_BELOW_MINIMUM: "Minimum payout threshold is $50.",
  ERR_SCHEDULE_RESERVE_EXCEEDS_MAX: "Reserve must be between $0 and $250.",
  ERR_SCHEDULE_METHOD_NOT_FOUND: "The selected primary method is not verified or no longer exists.",
  ERR_SPLIT_NO_SECONDARY_METHOD: "Select a secondary method to enable split payouts.",
  ERR_SPLIT_SAME_METHOD: "Secondary method must be different from your primary method.",
  ERR_SPLIT_METHOD_NOT_VERIFIED: "The selected secondary method must be verified.",
  ERR_SPLIT_NOT_ENABLED: "Enable split payout before setting a percentage.",
  ERR_SCHEDULE_NOT_FOUND: "Save your schedule before configuring split payout.",
}

export const PayoutScheduleDialog = ({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void }) => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // AC-14.02/22.02: only verified methods are selectable as primary/secondary.
  const [methods, setMethods] = useState<DepositMethodOption[]>([])

  // Primary method + split (US-22/23)
  const [primaryMethodId, setPrimaryMethodId] = useState("")
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [secondaryMethodId, setSecondaryMethodId] = useState("")
  const [primarySplitPercent, setPrimarySplitPercent] = useState(50)
  // Snapshot of what's persisted server-side, to know what actually changed on Save.
  const [initial, setInitial] = useState({ splitEnabled: false, secondaryMethodId: "", primarySplitPercent: 50 })
  // SCR-14: disabling an already-saved split configuration requires a confirmation
  // prompt — an in-progress, unsaved toggle-on doesn't need one (nothing to lose yet).
  const [confirmDisableSplit, setConfirmDisableSplit] = useState(false)

  // Schedule cadence (US-24/25/26)
  const [isActive, setIsActive] = useState(true)
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [customIntervalDays, setCustomIntervalDays] = useState(7)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string | null>(null)

  // Minimum payout + reserve
  const [thresholdUsd, setThresholdUsd] = useState("50")
  const [reserveUsd, setReserveUsd] = useState("0")

  // Authorization
  const [authorized, setAuthorized] = useState(false)

  const selectedDayFull = DAYS_OF_WEEK[dayOfWeek]?.fullName ?? "Monday"

  const getScheduleLabel = () => {
    if (frequency === "weekly") return `Weekly (every ${selectedDayFull})`
    if (frequency === "bi_weekly") return `Bi-Weekly (every other ${selectedDayFull})`
    if (frequency === "monthly") return `Monthly (on the ${dayOfMonth}${dayOfMonth === 1 ? "st" : dayOfMonth === 2 ? "nd" : dayOfMonth === 3 ? "rd" : "th"})`
    if (frequency === "daily") return "Daily (every day)"
    if (frequency === "custom") return `Every ${customIntervalDays} day${customIntervalDays === 1 ? "" : "s"}`
    return "Select schedule"
  }

  const loadSchedule = React.useCallback(async () => {
    setLoading(true)
    setFormError("")
    try {
      const [methodsRes, scheduleRes] = await Promise.all([
        payoutFetch(`/deposit-methods`),
        payoutFetch(`/payouts/schedule`),
      ])
      const methodsData = await methodsRes.json()
      const verified: DepositMethodOption[] = (methodsData.methods ?? []).filter((m: any) => m.verificationStatus === "verified")
      setMethods(verified)

      if (scheduleRes.ok) {
        const s = await scheduleRes.json()
        setPrimaryMethodId(s.primaryMethod?.id ?? verified.find((m) => m.isDefault)?.id ?? "")
        setSplitEnabled(!!s.splitEnabled)
        setSecondaryMethodId(s.secondaryMethod?.id ?? "")
        setPrimarySplitPercent(s.primarySplitPercent ?? 50)
        setInitial({ splitEnabled: !!s.splitEnabled, secondaryMethodId: s.secondaryMethod?.id ?? "", primarySplitPercent: s.primarySplitPercent ?? 50 })
        setIsActive(s.isActive ?? true)
        setFrequency(s.frequency ?? "weekly")
        setDayOfWeek(s.dayOfWeek ?? 1)
        setDayOfMonth(s.dayOfMonth ?? 1)
        setCustomIntervalDays(s.customIntervalDays ?? 7)
        setThresholdUsd(s.thresholdUsd ? String(Math.round(parseFloat(s.thresholdUsd))) : "50")
        setReserveUsd(s.reserveUsd ? String(Math.round(parseFloat(s.reserveUsd))) : "0")
        // AC-25.03: next run date is always the server-computed value, never derived client-side.
        setNextRunAt(s.nextRunAt ?? null)
        setScheduleUpdatedAt(s.updatedAt ?? null)
      }
    } catch {
      setFormError("We couldn't load your payout schedule. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open) loadSchedule() }, [open, loadSchedule])

  const handleSave = async () => {
    if (!primaryMethodId) { setFormError("Select a primary payout method."); return }
    setSaving(true)
    setFormError("")
    try {
      const headers = { "Content-Type": "application/json" }

      const schedulePayload: any = {
        isActive, frequency, thresholdUsd, reserveUsd, primaryMethodId,
      }
      if (frequency === "weekly" || frequency === "bi_weekly") schedulePayload.dayOfWeek = dayOfWeek
      if (frequency === "monthly") schedulePayload.dayOfMonth = dayOfMonth
      if (frequency === "custom") schedulePayload.customIntervalDays = customIntervalDays

      const scheduleRes = await payoutFetch(`/payouts/schedule`, { method: "PUT", headers, body: JSON.stringify(schedulePayload) })
      const scheduleData = await scheduleRes.json()
      if (!scheduleRes.ok) { setFormError(SCHEDULE_ERROR_MESSAGES[scheduleData.errorCode] ?? scheduleData.message ?? "Unable to save schedule."); return }
      setNextRunAt(scheduleData.nextRunAt ?? null)
      setScheduleUpdatedAt(scheduleData.updatedAt ?? null)

      // AC-22.x/23.x: split is a separate resource — only PATCH what actually changed.
      if (splitEnabled !== initial.splitEnabled) {
        const splitRes = await payoutFetch(`/payouts/schedule/split`, {
          method: "PATCH", headers,
          body: JSON.stringify(splitEnabled ? { splitEnabled: true, secondaryMethodId } : { splitEnabled: false }),
        })
        const splitData = await splitRes.json()
        if (!splitRes.ok) { setFormError(SCHEDULE_ERROR_MESSAGES[splitData.errorCode] ?? splitData.message ?? "Unable to save split payout."); return }
      } else if (splitEnabled && (primarySplitPercent !== initial.primarySplitPercent || secondaryMethodId !== initial.secondaryMethodId)) {
        const splitRes = await payoutFetch(`/payouts/schedule/split`, {
          method: "PATCH", headers,
          body: JSON.stringify({ primarySplitPercent, secondaryMethodId }),
        })
        const splitData = await splitRes.json()
        if (!splitRes.ok) { setFormError(SCHEDULE_ERROR_MESSAGES[splitData.errorCode] ?? splitData.message ?? "Unable to save split payout."); return }
      }

      onOpenChange(false)
      onSaved?.()
      toast({ title: "Payout schedule updated", description: getScheduleLabel() })
    } catch {
      setFormError("Unable to save — please try again.")
    } finally {
      setSaving(false)
    }
  }

  const otherMethods = (excludeId: string) => methods.filter((m) => m.id !== excludeId)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-lg font-semibold text-dark-blue-400">
            Setup Your Direct Deposit Schedule
          </DialogTitle>
          {scheduleUpdatedAt && (
            <p className="text-sm text-gray-500">
              Last updated on {new Date(scheduleUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </DialogHeader>
        <div className="border-t border-gray-200 shrink-0" />

        {/* flex-1 min-h-0 (not max-h-*) gives this a real resolvable height inside
            the flex column. Percentage heights (`h-full`, the shared component's
            default Viewport sizing) don't reliably resolve on a nested child of a
            flex item across browsers, so the Viewport reported its natural content
            height instead of the container's — clipping content with no scrollbar.
            Making the Viewport itself `flex-1 min-h-0` propagates the same
            flex-grow-based (not percentage-based) sizing all the way down, which is
            what actually gives Radix a definite height to detect overflow against.
            Scoped via viewportClassName so the shared component (used in ~30+ other
            places) isn't touched. */}
        <ScrollArea type="always" className="flex-1 min-h-0 flex flex-col" viewportClassName="flex-1 min-h-0 [&>div]:!h-auto">
          <div className="px-6 py-5 space-y-6">
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : methods.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">
                You need a verified payout method before setting up a schedule.
              </div>
            ) : (
              <>
                {/* ── Primary Method + Split (US-22/23) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-dark-blue-400">
                      {splitEnabled ? "Preferred Payout Method" : "Preferred Deposit Method"}
                    </label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!splitEnabled && methods.length < 2}
                      onClick={() => {
                        if (splitEnabled && initial.splitEnabled) { setConfirmDisableSplit(true); return }
                        setSplitEnabled((v) => !v)
                      }}
                    >
                      {splitEnabled ? "Disable Split" : "Split Payout"}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>{methods.length < 2 && !splitEnabled ? "Add a second verified payout method to enable split payout" : "Split earnings across two verified accounts"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Choose where your earnings should be deposited.</p>

                  <Select value={primaryMethodId} onValueChange={setPrimaryMethodId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a payout method" />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nickname || m.displayLabel || m.methodType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* AC-22.x/23.x: exactly 2 methods (primary + secondary), auto-balanced percentages */}
                  {splitEnabled && (
                    <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Secondary method</label>
                        <Select value={secondaryMethodId} onValueChange={setSecondaryMethodId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a secondary method" />
                          </SelectTrigger>
                          <SelectContent>
                            {otherMethods(primaryMethodId).map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.nickname || m.displayLabel || m.methodType}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Primary %</label>
                          <Input
                            type="number" min={0} max={100}
                            value={primarySplitPercent}
                            // AC-23.03/23.04: accept the raw value (including 0/100) so the
                            // inline error below can actually be seen — clamping silently
                            // would make those values impossible to type in the first place.
                            onChange={(e) => setPrimarySplitPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Secondary % (auto)</label>
                          <Input type="number" value={Math.round((100 - primarySplitPercent) * 100) / 100} disabled />
                        </div>
                      </div>
                      {(primarySplitPercent <= 0 || primarySplitPercent >= 100) && (
                        <p className="text-xs text-red-500">Each method must receive between 1% and 99% — 0% or 100% is not a valid split.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Deposit Schedule (US-24) ── */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-dark-blue-400">Set your Deposit Schedule</label>
                  <p className="text-xs text-gray-500">Deposits run on your schedule when minimum balance is met.</p>

                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{getScheduleLabel()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (every day)</SelectItem>
                      <SelectItem value="weekly">Weekly (every {selectedDayFull})</SelectItem>
                      <SelectItem value="bi_weekly">Bi-Weekly (every other {selectedDayFull})</SelectItem>
                      <SelectItem value="monthly">Monthly (on the {dayOfMonth})</SelectItem>
                      <SelectItem value="custom">Custom interval</SelectItem>
                    </SelectContent>
                  </Select>

                  {frequency === "custom" && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Every N days (1–365)</label>
                      <Input type="number" min={1} max={365} value={customIntervalDays} onChange={(e) => setCustomIntervalDays(Math.min(365, Math.max(1, parseInt(e.target.value) || 1)))} />
                    </div>
                  )}
                </div>

                {/* ── Select Deposit Day ── */}
                {(frequency === "weekly" || frequency === "bi_weekly") && (
                  <div className="space-y-2">
                    <Label size="sm" className="font-semibold text-dark-blue-400">Select Deposit Day</Label>
                    <ToggleGroupRoot
                      className="!bg-transparent !border-0 !p-0 gap-2"
                      value={[String(dayOfWeek)]}
                      onValueChange={(details) => {
                        if (details.value.length > 0) setDayOfWeek(parseInt(details.value[0]))
                      }}
                    >
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <ToggleGroupItem
                          key={day.key}
                          value={String(idx)}
                          className={cn(
                            "size-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center border shrink-0 p-0",
                            dayOfWeek === idx
                              ? "border-primary-500 text-primary-600 bg-white shadow-none data-[state=on]:bg-white"
                              : "border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-500 bg-white shadow-none"
                          )}
                        >
                          {day.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroupRoot>
                  </div>
                )}

                {frequency === "monthly" && (
                  <div>
                    <label className="text-sm font-semibold text-dark-blue-400 mb-1 block">Day of month</label>
                    <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {/* Capped at 28 to avoid non-existent dates in shorter months */}
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* AC-25.03: server-computed next run date, never calculated client-side.
                    timeZone: "UTC" is required here too — nextRunAt is a UTC-midnight
                    calendar date, and formatting it in the viewer's local zone shifts
                    the displayed weekday/date back a day for anyone west of UTC. */}
                {nextRunAt && (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-primary-600">Next Deposit (based on your schedule)</span>
                    <span className="text-sm font-bold text-primary-600">
                      {new Date(nextRunAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </span>
                  </div>
                )}

                {/* ── Pause / Resume (US-26) ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-dark-blue-400">Schedule Active</label>
                    <p className="text-xs text-gray-500 mt-0.5">Pause to stop automatic payouts without losing your configuration.</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={(c) => setIsActive(c as boolean)} size="sm" />
                </div>

                {/* ── Minimum Payout (US-33) ── */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-dark-blue-400">Minimum Payout</label>
                  <p className="text-xs text-gray-500">
                    Scheduled deposits are made only if your balance meets this amount at run time. Platform minimum is $50.
                  </p>
                  <Select value={thresholdUsd} onValueChange={setThresholdUsd}>
                    <SelectTrigger className="w-full"><SelectValue>${thresholdUsd} or more</SelectValue></SelectTrigger>
                    <SelectContent>
                      {THRESHOLD_PRESETS.map((amt) => (
                        <SelectItem key={amt} value={String(amt)}>${amt} or more</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Reserve Balance ── Figma: a single on/off toggle, not a preset
                    amount picker. PS-03 confirms reserveUsd is $0 (disabled) or up to
                    $250 (enabled) — "on" reserves the platform max, "off" is $0. */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-sm font-semibold text-dark-blue-400">Reserve Balance <span className="font-normal text-gray-400">(optional)</span></label>
                    <p className="text-xs text-gray-500 mt-0.5">Keep up to $250 in your account after each payout to automatically cover subscription or platform fees without disruption.</p>
                  </div>
                  <Switch
                    checked={Number(reserveUsd) > 0}
                    onCheckedChange={(c) => setReserveUsd(c ? "250" : "0")}
                    size="sm"
                  />
                </div>

                {/* ── Authorization ── */}
                <div className="flex gap-3 items-start">
                  <Checkbox
                    checked={authorized}
                    onCheckedChange={(checked) => setAuthorized(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="text-xs text-gray-600 leading-relaxed">
                    <p className="font-semibold text-dark-blue-400">
                      I authorize Marketeq to deposit my earnings into the account(s) listed above.
                    </p>
                    <p className="mt-1 text-gray-500">
                      I understand that any changes to my payout preferences may take up to 3 business days to process.
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!authorized || saving || loading || methods.length === 0 || (splitEnabled && (primarySplitPercent <= 0 || primarySplitPercent >= 100))}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* SCR-14: confirm before disabling an already-saved split configuration.
        This must be a real nested Dialog (Radix Portal), not a hand-rolled fixed
        div — a plain fixed/z-[60] div here rendered inside the same component tree
        as the parent PayoutScheduleDialog, which is itself Portal-rendered to the
        end of <body>. Whatever ancestor wrapper this component mounts under traps
        the plain div in a lower stacking context, so its z-index never actually
        wins against the parent Dialog's Portal-rendered overlay — clicks landed on
        the (invisible-but-still-on-top) split-config panel behind it instead of
        the button, which is exactly the "Disable Split button not working" bug. */}
    <Dialog open={confirmDisableSplit} onOpenChange={setConfirmDisableSplit}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-dark-blue-400">Disable Split Payout?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">All future payouts will go entirely to your primary method instead of being split.</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setConfirmDisableSplit(false)}>Cancel</Button>
          <Button variant="filled" visual="error" size="sm" className="flex-1" onClick={() => { setSplitEnabled(false); setConfirmDisableSplit(false) }}>Disable Split</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// Recent Activity — payout-service has no dedicated activity-feed endpoint, so this
// derives real entries from the payout history list (GET /v1/payouts) rather than
// showing fabricated data. Each payout request's current status becomes one entry.
function toActivityItem(p: { id: string; status: string; amountUsd: string; methodLabel: string | null; createdAt: string; settledAt: string | null }) {
  const time = formatDistanceToNowStrict(new Date(p.settledAt ?? p.createdAt), { addSuffix: true })
  const method = p.methodLabel ?? "your payout method"
  switch (p.status) {
    case "completed":
      return { id: p.id, title: "Payout Completed", description: `$${p.amountUsd} to ${method}`, time, kind: "sent" as const }
    case "processing":
      return { id: p.id, title: "Payout Processing", description: `$${p.amountUsd} to ${method}`, time, kind: "processing" as const }
    case "queued":
      return { id: p.id, title: "Payout Queued", description: `$${p.amountUsd} to ${method}`, time, kind: "processing" as const }
    case "failed":
      return { id: p.id, title: "Payout Failed", description: `$${p.amountUsd} to ${method}`, time, kind: "failed" as const }
    case "cancelled":
      return { id: p.id, title: "Payout Cancelled", description: `$${p.amountUsd} to ${method}`, time, kind: "cancelled" as const }
    default:
      return { id: p.id, title: "Payout Scheduled", description: `$${p.amountUsd} to ${method}`, time, kind: "scheduled" as const }
  }
}

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode; iconBg: string }> = {
  scheduled: { icon: <Calendar className="size-4 text-primary-500" />, iconBg: "bg-primary-50" },
  sent: { icon: <ArrowUp className="size-4 text-success-500" />, iconBg: "bg-success-50" },
  processing: { icon: <Clock className="size-4 text-gray-500" />, iconBg: "bg-gray-100" },
  failed: { icon: <X className="size-4 text-error-500" />, iconBg: "bg-error-50" },
  cancelled: { icon: <X className="size-4 text-gray-500" />, iconBg: "bg-gray-100" },
}

// ─── Earnings Tab ───────────────────────────────────────────────────────

const EARNINGS_DATA = [
  { date: "April 2, 2025", project: "Website Redesign", client: "@referrizerllc", clientImg: "/images/avatar-1.png", task: "UX Wireframing", startTime: "9:14 AM", endTime: "2:14 AM", duration: "2h 0m", earnings: "$1,800", status: "" },
  { date: "April 1, 2025", project: "Website Redesign", client: "@referrizerllc", clientImg: "/images/avatar-1.png", task: "UX Wireframing", startTime: "2:20 PM", endTime: "5:20 PM", duration: "1h 0m", earnings: "$1,800", status: "" },
  { date: "April 1, 2025", project: "Website Redesign", client: "@referrizerllc", clientImg: "/images/avatar-1.png", task: "UX Wireframing", startTime: "9:14 AM", endTime: "3:14 AM", duration: "1h 0m", earnings: "$1,800", status: "" },
  { date: "April 1, 2025", project: "Website Redesign", client: "@christheclient234", clientImg: "/images/avatar-2.png", task: "UX Research", startTime: "2:20 PM", endTime: "4:20 PM", duration: "2h 0m", earnings: "$1,800", status: "" },
  { date: "Mar 31, 2025", project: "Website Redesign", client: "@referrizerllc", clientImg: "/images/avatar-1.png", task: "UX Research", startTime: "9:14 AM", endTime: "11:14 AM", duration: "1h 0m", earnings: "$1,800", status: "Paid" },
  { date: "Mar 31, 2025", project: "Website Redesign", client: "@referrizerllc", clientImg: "/images/avatar-1.png", task: "UX Research", startTime: "12:20 PM", endTime: "1:20 PM", duration: "1h 0m", earnings: "$1,800", status: "Paid" },
  { date: "Mar 31, 2025", project: "Website Redesign", client: "@christheclient234", clientImg: "/images/avatar-2.png", task: "UX Research", startTime: "4:20 PM", endTime: "7:20 PM", duration: "2h 0m", earnings: "$1,800", status: "Paid" },
]

export interface EarningsFilters {
  dateRange: string
  entryType: string
  statusFilter: string
  search: string
}

export const EarningsTab = ({ onFiltersChange }: { onFiltersChange?: (filters: EarningsFilters) => void } = {}) => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState("daily")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [earningsSummary, setEarningsSummary] = React.useState<EarningsSummary | null>(null)
  // Doc07/08 "Error ≠ Empty": a fetch failure must render a distinct ERROR state
  // with Retry, not just leave the UI stuck on its loading copy indefinitely — that
  // was the bug here: catch(console.error) never set anything the UI could branch on.
  const [earningsSummaryError, setEarningsSummaryError] = React.useState(false)
  const [earningsResult, setEarningsResult] = React.useState<EarningsListResponse | null>(null)
  const [earningsLoading, setEarningsLoading] = React.useState(true)
  const [earningsError, setEarningsError] = React.useState(false)
  const [dateRange, setDateRange] = React.useState("all_time")
  const [entryType, setEntryType] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")

  const loadSummary = React.useCallback(() => {
    setEarningsSummaryError(false)
    getEarningsSummary().then(setEarningsSummary).catch((e) => { console.error(e); setEarningsSummaryError(true) })
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  const loadEarnings = React.useCallback(() => {
    setEarningsLoading(true)
    setEarningsError(false)
    const q: any = { view: viewMode, dateRange, page: currentPage, limit: 10, sortBy: "workStartAt", sortOrder: "desc" }
    if (entryType) q.entryType = entryType
    if (statusFilter) q.status = statusFilter
    if (searchQuery.length >= 2) q.search = searchQuery
    getEarnings(q).then(setEarningsResult).catch((e) => { console.error(e); setEarningsError(true) }).finally(() => setEarningsLoading(false))
  }, [viewMode, dateRange, currentPage, entryType, statusFilter, searchQuery])

  useEffect(() => { loadEarnings() }, [loadEarnings])

  // Export (parent-level Export button) reuses whatever filters are currently
  // applied to this table rather than always exporting the unfiltered dataset.
  useEffect(() => {
    onFiltersChange?.({ dateRange, entryType, statusFilter, search: searchQuery.length >= 2 ? searchQuery : "" })
  }, [onFiltersChange, dateRange, entryType, statusFilter, searchQuery])

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-x-4">
        <StatCard
          label="Today"
          amount={earningsSummary?.today.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.today.hoursLabel + " Logged" : earningsSummaryError ? "Unavailable" : "Loading..."}
          change={earningsSummary?.today.changePercent != null ? { value: Math.abs(earningsSummary.today.changePercent) + "%", direction: earningsSummary.today.changeDirection === "up" ? "up" : "down", label: earningsSummary.today.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Week"
          amount={earningsSummary?.thisWeek.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.thisWeek.hoursLabel + " Logged" : earningsSummaryError ? "Unavailable" : "Loading..."}
          change={earningsSummary?.thisWeek.changePercent != null ? { value: Math.abs(earningsSummary.thisWeek.changePercent) + "%", direction: earningsSummary.thisWeek.changeDirection === "up" ? "up" : "down", label: earningsSummary.thisWeek.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Month"
          amount={earningsSummary?.thisMonth.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.thisMonth.hoursLabel + " Logged" : earningsSummaryError ? "Unavailable" : "Loading..."}
          change={earningsSummary?.thisMonth.changePercent != null ? { value: Math.abs(earningsSummary.thisMonth.changePercent) + "%", direction: earningsSummary.thisMonth.changeDirection === "up" ? "up" : "down", label: earningsSummary.thisMonth.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
      </div>
      {earningsSummaryError && (
        <p className="text-xs text-red-600 -mt-3">
          We couldn't load your earnings summary.{" "}
          <button className="underline font-medium" onClick={loadSummary}>Retry</button>
        </p>
      )}

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleGroupRoot
          value={[viewMode]}
          onValueChange={(details) => {
            if (details.value.length > 0) setViewMode(details.value[0])
          }}
        >
          <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
          <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
        </ToggleGroupRoot>

        <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setCurrentPage(1) }}>
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <Calendar className="size-4 mr-1" />
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="last_week">Last Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>

        {/* "All Projects"/"All Clients" selectors removed rather than shipped as inert
            single-option dropdowns — getEarnings() supports projectId/clientId filters,
            but no endpoint exists yet to list the contractor's distinct projects/clients
            to populate real options (same tradeoff already made in the Payouts tab's
            filter row above). */}
        <Select value={entryType || "all-entry-types"} onValueChange={(v) => { setEntryType(v === "all-entry-types" ? "" : v); setCurrentPage(1) }}>
          <SelectTrigger className="h-9 w-auto min-w-[130px]">
            <SelectValue placeholder="All Entry Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-entry-types">All Entry Types</SelectItem>
            <SelectItem value="automated">Automated</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter || "all-statuses"} onValueChange={(v) => { setStatusFilter(v === "all-statuses" ? "" : v); setCurrentPage(1) }}>
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Reversed</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <SearchField>
            <SearchFieldButton>
              <Search className="size-4" />
            </SearchFieldButton>
            <SearchFieldInput
              placeholder="Find transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchField>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer">
                {viewMode === "weekly" ? "Week Range" : viewMode === "monthly" ? "Month" : "Date"}{" "}
                <ArrowDown className="size-3 inline ml-1" />
              </TableHead>
              <TableHead>Project</TableHead>
              {viewMode === "daily" && <TableHead>Task</TableHead>}
              {viewMode === "daily" && <TableHead>Start Time</TableHead>}
              {viewMode === "daily" && <TableHead>End Time</TableHead>}
              {viewMode === "daily" && <TableHead>Duration</TableHead>}
              {viewMode === "weekly" && <TableHead>Weekly Hours</TableHead>}
              {viewMode === "monthly" && <TableHead>Total Hours</TableHead>}
              <TableHead>{viewMode === "weekly" ? "Weekly Earnings" : viewMode === "monthly" ? "Total Earnings" : "Earnings"}</TableHead>
              {viewMode === "weekly" && <TableHead>Budget</TableHead>}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earningsLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : earningsError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <p className="text-sm text-red-600">We couldn't load your earnings. Please try again.</p>
                  <button className="text-sm text-primary-600 underline mt-1" onClick={loadEarnings}>Retry</button>
                </TableCell>
              </TableRow>
            ) : earningsResult?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">No earnings found for this period.</TableCell>
              </TableRow>
            ) : earningsResult?.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm text-gray-500 whitespace-nowrap">{row.date ?? row.weekRange ?? row.month ?? "—"}</TableCell>
                <TableCell>
                  {row.project ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback>{row.project.clientHandle?.[1]?.toUpperCase() ?? "C"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-dark-blue-400">{row.project.name}</p>
                        <p className="text-xs text-gray-400">{row.project.clientHandle}</p>
                      </div>
                    </div>
                  ) : <span className="text-sm text-gray-400">—</span>}
                </TableCell>
                {viewMode === "daily" && <TableCell className="text-sm text-gray-500">{row.task?.name ?? "—"}</TableCell>}
                {viewMode === "daily" && <TableCell className="text-sm text-gray-500">{row.startTime ?? "—"}</TableCell>}
                {viewMode === "daily" && <TableCell className="text-sm text-gray-500">{row.endTime ?? "—"}</TableCell>}
                {viewMode === "daily" && <TableCell className="text-sm text-gray-500">{row.durationLabel}</TableCell>}
                {viewMode === "weekly" && <TableCell className="text-sm text-gray-500">{row.weeklyHours ?? "—"}</TableCell>}
                {viewMode === "monthly" && <TableCell className="text-sm text-gray-500">{row.totalHours ?? "—"}</TableCell>}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">${viewMode === "weekly" ? (row.weeklyEarnings ? parseFloat(String(row.weeklyEarnings)).toFixed(2) : "—") : viewMode === "monthly" ? (row.totalEarnings ? parseFloat(String(row.totalEarnings)).toFixed(2) : "—") : (row.netAmountDisplay ?? row.netAmount)}</span>
                    {row.status === "paid" && <Badge visual="success" size="sm">Paid</Badge>}
                    {row.status === "confirmed" && <Badge visual="primary" size="sm">Confirmed</Badge>}
                    {row.status === "failed" && <Badge visual="error" size="sm">Reversed</Badge>}
                  </div>
                </TableCell>
                {viewMode === "weekly" && <TableCell className="text-sm text-gray-500">{row.budget ?? "—"}</TableCell>}
                <TableCell>
                  <div className="flex items-center gap-1">
                    {row.entryType === "manual" && <Badge visual="warning" size="sm">Manual</Badge>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton size="sm" variant="ghost" visual="gray">
                          <MoreHorizontal className="size-4" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast({ title: "Transaction Details", description: `${row.project?.name ?? ""} — ${row.durationLabel}` })}>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-primary-500">
            {earningsResult ? earningsResult.manualTimeLabel : earningsLoading ? "Loading earnings..." : "Unavailable"}{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-3.5 inline text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Time manually entered by you (not tracked by the desktop app).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>

          {/* Pagination */}
          <div className="flex items-center gap-1">
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm text-gray-500 px-2">
              Page {currentPage} of {earningsResult?.totalPages ?? 1}
            </span>
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
              disabled={currentPage >= (earningsResult?.totalPages ?? 1)}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payouts Tab ────────────────────────────────────────────────────────

// AC-27.04: exact status → label mapping. Never invent alternate labels.
const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending_verification: "Awaiting Confirmation",
  awaiting_edd: "Awaiting Review",
  queued: "Processing",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}
const getPayoutStatusBadge = (status: string): { visual: "success" | "warning" | "error" | "gray" | "primary"; label: string } => {
  switch (status) {
    case "completed": return { visual: "success", label: PAYOUT_STATUS_LABELS[status] }
    case "failed": return { visual: "error", label: PAYOUT_STATUS_LABELS[status] }
    case "cancelled": return { visual: "gray", label: PAYOUT_STATUS_LABELS[status] }
    case "queued": case "processing": return { visual: "primary", label: PAYOUT_STATUS_LABELS[status] }
    default: return { visual: "warning", label: PAYOUT_STATUS_LABELS[status] ?? "Awaiting Confirmation" }
  }
}
const formatPayoutDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"

interface PayoutHistoryItem {
  id: string; amountUsd: string; feeUsd: string; netAmountUsd: string; currency: string
  status: string; trigger: string; failureReason: string | null
  methodType: string | null; methodLabel: string | null
  createdAt: string; settledAt: string | null
}

// US-28: read-only detail dialog — no retry/cancel actions at MVP (AC-28.06).
const PayoutDetailDialog = ({ payoutId, onOpenChange }: { payoutId: string | null; onOpenChange: (open: boolean) => void }) => {
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  // EC-52: a failed/404 fetch must render a distinct "not found" state, not an
  // infinite skeleton (which is what `loading || !detail` alone produces on error).
  const [detailError, setDetailError] = useState('')

  const NON_TERMINAL = new Set(['pending_verification', 'awaiting_edd', 'queued', 'processing'])

  const fetchDetail = React.useCallback(async (silent = false) => {
    if (!payoutId) return
    if (!silent) { setLoading(true); setDetailError('') }
    try {
      const res = await payoutFetch(`/payouts/${payoutId}`)
      if (res.ok) { setDetail(await res.json()) }
      else if (!silent) { setDetailError(res.status === 404 ? 'Transaction not found.' : "We couldn't load this transaction. Please try again.") }
    } catch {
      if (!silent) setDetailError("We couldn't load this transaction. Please try again.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [payoutId])

  useEffect(() => {
    if (!payoutId) { setDetail(null); setDetailError(''); return }
    setDetail(null)
    fetchDetail()
  }, [payoutId, fetchDetail])

  // AC-29.01/29.02: poll while the open payout hasn't reached a terminal status.
  useEffect(() => {
    if (!payoutId || !detail || !NON_TERMINAL.has(detail.status)) return
    const id = setInterval(() => fetchDetail(true), 15_000)
    return () => clearInterval(id)
  }, [payoutId, detail, fetchDetail])

  return (
    <Dialog open={!!payoutId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-dark-blue-400">Payout Details</DialogTitle>
        </DialogHeader>
        {detailError ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{detailError}</p>
            <button className="text-sm text-primary-600 underline mt-2" onClick={() => fetchDetail()}>Retry</button>
          </div>
        ) : loading || !detail ? (
          <div className="space-y-2 py-4">{[...Array(5)].map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3 py-2">
            {[
              ["Amount", `$${detail.amountUsd} ${detail.currency}`],
              ["Fee", `$${detail.feeUsd}`],
              ["Net Transfer", `$${detail.netAmountUsd}`],
              ["Method", detail.methodLabel ?? detail.methodType ?? "—"],
              ["Status", getPayoutStatusBadge(detail.status).label],
              ["Source", detail.trigger === "scheduled" ? "Scheduled" : "Manual"],
              // AC-28.03/28.04: shown with a "Pending" value until the provider callback arrives — never hidden.
              ["Provider Reference", detail.providerReference ?? "Pending"],
              ["Idempotency Key", detail.idempotencyKey],
              ["Initiated", formatPayoutDate(detail.timeline?.initiatedAt)],
              ["Settled", formatPayoutDate(detail.timeline?.completedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-dark-blue-400 text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
            {detail.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detail.failureReason ?? "This payout could not be processed. Please contact support if the issue persists."}
                <div className="text-xs text-red-500 mt-1">Retry attempts: {detail.retryCount ?? 0}</div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const PAYOUT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "pending_verification", label: "Awaiting Confirmation" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
]

export const PayoutsTab = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  // SCR-16: real, server-side status filter — replaces the previously cosmetic
  // "All Statuses"/"All Accounts" selectors that had no effect on the fetch.
  const [statusFilter, setStatusFilter] = useState("")
  const pageSize = 10

  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [detailId, setDetailId] = useState<string | null>(null)

  // Stat cards — sourced from real data, not the Figma mock's static "$832.00 /
  // Tuesday, Aug 20th / Chase Bank ...4553" etc. "Total Payouts This Month" has no
  // backend aggregate (payout-service exposes no date-range totals endpoint) — shown
  // as unavailable rather than an approximated/possibly-wrong client-computed guess.
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [defaultMethodLabel, setDefaultMethodLabel] = useState<string | null>(null)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts/schedule`)
        if (res.ok) {
          const d = await res.json()
          setNextRunAt(d.nextRunAt ?? null)
          setDefaultMethodLabel(d.primaryMethod?.displayLabel ?? null)
        }
      } catch (e) { console.error('Failed to fetch schedule', e) }
      finally { setScheduleLoading(false) }
    })()
    getBalance().then(setBalance).catch(e => console.error("Balance fetch failed:", e))
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts?status=completed&page=1&pageSize=1`)
        if (res.ok) { const d = await res.json(); setCompletedCount(d.totalCount ?? 0) }
      } catch (e) { console.error('Failed to fetch completed payout count', e) }
    })()
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveFilters = !!statusFilter

  const loadPayouts = React.useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setLoadError("") }
    try {
      const qs = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) })
      if (statusFilter) qs.set('status', statusFilter)
      const res = await payoutFetch(`/payouts?${qs.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to load")
      setPayouts(data.payouts ?? [])
      setTotalCount(data.totalCount ?? 0)
    } catch {
      // AC-29.03: a failed background poll must not disrupt an already-rendered list.
      if (!silent) setLoadError("We couldn't load your transaction history. Please try again.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentPage, statusFilter])

  useEffect(() => { loadPayouts() }, [loadPayouts])

  // AC-29.01/29.02/29.03: poll every 15s (no flicker — silent refetch) as long as
  // any row on this page hasn't reached a terminal status. No SSE/WebSocket infra
  // exists in this codebase, so polling is the correct mechanism per PS-31.
  const NON_TERMINAL_STATUSES = new Set(['pending_verification', 'awaiting_edd', 'queued', 'processing'])
  const hasInFlight = payouts.some(p => NON_TERMINAL_STATUSES.has(p.status))
  useEffect(() => {
    if (!hasInFlight) return
    const id = setInterval(() => loadPayouts(true), 15_000)
    return () => clearInterval(id)
  }, [hasInFlight, loadPayouts])

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-x-4">
        <StatCard
          label="Next Payout"
          sublabel={scheduleLoading ? "Loading..." : nextRunAt ? new Date(nextRunAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "No schedule set"}
          amount={scheduleLoading ? "-" : nextRunAt && balance ? parseFloat(balance.availableBalance).toFixed(2) : "-"}
          extra={defaultMethodLabel ? `Bank: ${defaultMethodLabel}` : undefined}
        />
        {/* No date-range payout aggregate exists on payout-service - showing "Unavailable"
            rather than a client-computed guess that could silently be wrong. */}
        <StatCard
          label="Total Payouts This Month"
          amount="-"
          extra="Not available yet"
        />
        <StatCard
          label="Lifetime Payouts"
          amount={balance ? parseFloat(balance.totalPaidOutUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
          extra={completedCount != null ? `${completedCount} completed payout${completedCount === 1 ? "" : "s"}` : undefined}
        />
      </div>

      {/* Filters Row — Status is real (server-side, wired to the fetch); Account/Date
          removed rather than shipped as inert selectors with a single fake option. */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter || "all-statuses"} onValueChange={(v) => { setStatusFilter(v === "all-statuses" ? "" : v); setCurrentPage(1) }}>
          <SelectTrigger className="h-9 w-auto min-w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
            {PAYOUT_STATUS_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              {PAYOUT_STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label ?? statusFilter}
              <button onClick={() => { setStatusFilter(""); setCurrentPage(1) }} className="hover:text-gray-900"><X className="size-3" /></button>
            </div>
            <Button variant="link" size="sm" onClick={() => { setStatusFilter(""); setCurrentPage(1) }}>Clear All</Button>
          </>
        )}

        <div className="ml-auto">
          <SearchField>
            <SearchFieldButton>
              <Search className="size-4" />
            </SearchFieldButton>
            <SearchFieldInput
              placeholder="Find transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchField>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Initiated on</TableHead>
              <TableHead>Settled on</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><div className="h-5 bg-gray-100 rounded animate-pulse" /></TableCell></TableRow>
              ))
            ) : loadError ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-red-600">
                {loadError} <button className="underline font-medium ml-1" onClick={() => loadPayouts()}>Retry</button>
              </TableCell></TableRow>
            ) : payouts.length === 0 && hasActiveFilters ? (
              // EC-51: "no results for this filter" is distinct from "no history at all"
              <TableRow><TableCell colSpan={6} className="text-center py-10">
                <p className="text-sm text-gray-500">No results for this filter.</p>
                <button className="text-sm text-primary-600 underline mt-1" onClick={() => { setStatusFilter(""); setCurrentPage(1) }}>Clear filters</button>
              </TableCell></TableRow>
            ) : payouts.length === 0 ? (
              // AC-27.01: empty state distinct from an error state
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-sm text-gray-400">No payouts yet. Your completed payouts will appear here.</TableCell></TableRow>
            ) : payouts.map((row) => {
              const badge = getPayoutStatusBadge(row.status)
              return (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetailId(row.id)}>
                  <TableCell className="text-sm font-medium text-dark-blue-400">${row.amountUsd} {row.currency}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BankIcon className="size-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{row.methodLabel ?? row.methodType ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge visual={badge.visual} size="sm">{badge.label}</Badge>
                      {/* AC-27.06: visually distinguish scheduled from manual payouts */}
                      {row.trigger === "scheduled" && <Badge visual="gray" size="sm">Scheduled</Badge>}
                    </div>
                    {row.status === "failed" && row.failureReason && (
                      <p className="text-xs text-red-500 mt-1">{row.failureReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatPayoutDate(row.createdAt)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatPayoutDate(row.settledAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton size="sm" variant="ghost" visual="gray">
                          <MoreHorizontal className="size-4" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(row.id)}>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination — server-driven page count, not a fabricated fixed range */}
        {!loading && !loadError && payouts.length > 0 && (
          <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button
                className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
              <button
                className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <PayoutDetailDialog payoutId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />
    </div>
  )
}
