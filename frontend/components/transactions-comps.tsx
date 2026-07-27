"use client"
import { Logo3 } from "@/components/icons"

import * as React from "react"
import { SVGProps, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { loadStripe, type Stripe as StripeJSInstance } from "@stripe/stripe-js"
import { getEarningsSummary, getEarnings, getEarningDetail, getBalance, type EarningsSummary, type EarningsListResponse, type EarningsRow, type BalanceResponse, type EarningDetail } from "@/service/http/earnings"
import { UserAPI } from "@/service/http/user"
import { formatDistanceToNowStrict } from "date-fns"
import { PayPalDefault, PayoneerDefault, StripeDefault } from "@blend-metrics/icons/payment-methods"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { useToast } from "@/components/ui"
import { QRCodeSVG } from "qrcode.react"
import {
  AlertCircle,
  AlertTriangle,
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
  RefreshCcw01,
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
import { Accordion, AccordionItem, AccordionTrigger, DisclosureContent } from "@/components/ui/accordion"

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
  <div className={cn("size-10 rounded-full bg-[#9FE870] flex items-center justify-center overflow-hidden shrink-0", className)}>
    <img src="https://cdn.simpleicons.org/wise/163300" className="w-1/2 h-1/2 object-contain" alt="Wise" />
  </div>
)

const PayoneerIcon = ({ className }: { className?: string }) => (
  <div className={cn("size-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden", className)}>
    <img src="/bank-logos/payoneer.png" className="w-9 h-9 object-contain" alt="Payoneer" />
  </div>
)

// ─── Crypto wallet provider display metadata (US-09/PS-11). Fee/token text
// is cosmetic marketing copy (mirrors the existing hardcoded "Transfer in
// 1-3 business days" pattern above), matching Figma exactly — not derived
// from the backend registry, which only carries the technical network/token
// support matrix. Icons use real brand logos where Simple Icons hosts them
// (Binance, Coinbase, Trezor — confirmed reachable); the rest don't have a
// hosted brand icon available, so they fall back to a colored monogram
// badge in the provider's brand color rather than one shared placeholder
// icon reused across every row.
const CRYPTO_PROVIDER_META: Record<string, { tokensText: string; feeText: string; bg: string; letter: string; cdnSlug?: string }> = {
  RAMP:       { tokensText: 'BTC, ETH, USDC',        feeText: '0.49–2.9% + network fee', bg: '#0FA968', letter: 'R' },
  TRANSAK:    { tokensText: '100+ tokens supported', feeText: '0.5–1.5% + network fee',   bg: '#2F6FED', letter: 'T' },
  CRYPTO_COM: { tokensText: '100+ tokens supported', feeText: '0.5–1.5% + network fee',   bg: '#12284D', letter: 'C' },
  COINBASE:   { tokensText: 'BTC, ETH, USDC',        feeText: '1.49% + network fee',      bg: '#0052FF', letter: 'C', cdnSlug: 'coinbase' },
  METAMASK:   { tokensText: 'BTC, ETH, USDC',        feeText: '1.49% + network fee',      bg: '#F6851B', letter: 'M' },
  LEDGER:     { tokensText: 'BTC, ETH, USDC',        feeText: '1.49% + network fee',      bg: '#000000', letter: 'L' },
  TREZOR:     { tokensText: 'BTC, ETH, USDC',        feeText: '1.49% + network fee',      bg: '#0A0A0A', letter: 'T', cdnSlug: 'trezor' },
  KRAKEN:     { tokensText: 'BTC, ETH',              feeText: '0.9% + network fee',       bg: '#5741D9', letter: 'K' },
  BINANCE:    { tokensText: 'BTC, ETH, USDT',        feeText: '0–0.1% + P2P margin',      bg: '#F0B90B', letter: 'B', cdnSlug: 'binance' },
}
const CryptoProviderIcon = ({ provider, className }: { provider: string; className?: string }) => {
  const meta = CRYPTO_PROVIDER_META[provider]
  if (!meta) return <div className={cn("size-10 rounded-lg bg-gray-100 shrink-0", className)} />
  return (
    <div className={cn("size-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0", className)} style={{ backgroundColor: meta.bg }}>
      {meta.cdnSlug ? (
        <img src={`https://cdn.simpleicons.org/${meta.cdnSlug}/ffffff`} className="w-1/2 h-1/2 object-contain" alt={meta.letter} />
      ) : (
        <span className="text-white text-sm font-bold">{meta.letter}</span>
      )}
    </div>
  )
}

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

// US-103/US-104: display-level earnings amounts render as whole numbers, no
// decimals — the one carved-out exception is the fee-breakdown sections
// (US-27's inline expand + the Entry Detail drawer), which keep 2 decimals
// since those show the precise raw billing figures. This only rounds for
// display; it never touches the underlying amount used in calculations.
function formatWholeAmount(amount: string | number | null | undefined): string {
  if (amount == null) return "—"
  const n = typeof amount === "number" ? amount : parseFloat(amount)
  if (!Number.isFinite(n)) return "—"
  return Math.round(Math.abs(n)).toLocaleString("en-US")
}
// Every call site renders the currency symbol as its own styled span
// (different font size/weight than the digits), so the "-" for a negative
// amount (refunds/adjustments) has to be placed before that span, not baked
// into formatWholeAmount's return value — "-$46", never "$-46".
function amountSign(amount: string | number | null | undefined): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "")
  return Number.isFinite(n) && n < 0 ? "-" : ""
}

// ES-06: resolves a real currency symbol ("€", "₹", "$"...) from an ISO 4217
// code instead of a hardcoded "$" — the balance display is now data-driven,
// so a non-USD displayCurrency must render its own symbol, not USD's.
const currencySymbolCache = new Map<string, string>()
function currencySymbol(code: string): string {
  const key = code || "USD"
  const cached = currencySymbolCache.get(key)
  if (cached) return cached
  let symbol = key
  try {
    const part = new Intl.NumberFormat(undefined, { style: "currency", currency: key })
      .formatToParts(0)
      .find((p) => p.type === "currency")
    if (part) symbol = part.value
  } catch { /* unsupported/unknown code — fall back to the raw code itself */ }
  currencySymbolCache.set(key, symbol)
  return symbol
}

// ES-06 EC-13: entry point surfaced whenever an earnings/balance response
// falls back to USD because no resolvable region currency exists yet.
function CurrencySettingsPrompt({ onSaved }: { onSaved?: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState("USD")

  const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "PHP", "PKR", "NGN", "BRL"]

  const save = async () => {
    setSaving(true)
    try {
      await UserAPI.updateCurrency(selected)
      toast({ title: "Currency updated", description: `Your earnings will now display in ${selected}.` })
      setOpen(false)
      onSaved?.()
    } catch {
      toast({ title: "Couldn't update currency", description: "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-primary-600 underline mb-2"
      >
        Showing USD — set your currency in Currency Settings
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        className="text-xs border border-gray-200 rounded px-2 py-1"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button disabled={saving} onClick={save} className="text-xs text-primary-600 font-medium disabled:opacity-50">
        {saving ? "Saving..." : "Save"}
      </button>
      <button disabled={saving} onClick={() => setOpen(false)} className="text-xs text-gray-400">
        Cancel
      </button>
    </div>
  )
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
// per-region field requirements (AC-04.02/04.03) and format checks (AC-04.04/04.05).
// Every country below maps to a real backend-validated region — nothing here
// is selectable without matching server-side support.
const SEPA_COUNTRIES = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','CH','MC','SM','AD','VA'])
const UK_COUNTRIES = new Set(['GB','GG','JE','IM'])
const GCC_COUNTRIES = new Set(['AE','SA','QA','BH','KW','OM'])
const BACS_COUNTRIES = new Set(['BR','MX','ZA','NG','KE','PK','BD','PH','ID','VN','TH','MY'])
const OFAC_BLOCKED_COUNTRIES = new Set(['CU','IR','KP','SD','SY'])
const SEPA_CURRENCY_MAP: Record<string, string> = { BG:'BGN', CZ:'CZK', DK:'DKK', HU:'HUF', PL:'PLN', RO:'RON', SE:'SEK', IS:'ISK', NO:'NOK', CH:'CHF', LI:'CHF' }
const GCC_CURRENCY_MAP: Record<string, string> = { AE:'AED', SA:'SAR', QA:'QAR', BH:'BHD', KW:'KWD', OM:'OMR' }

type BankRegion = 'US' | 'GB' | 'IN' | 'AU' | 'JP' | 'CA' | 'CN' | 'RU' | 'MX' | 'SEPA' | 'GCC' | 'BACS' | 'SWIFT'
function detectBankRegion(country: string): BankRegion {
  const c = (country || '').toUpperCase()
  if (c === 'US') return 'US'
  if (c === 'IN') return 'IN'
  if (c === 'AU') return 'AU'
  if (c === 'JP') return 'JP'
  if (c === 'CA') return 'CA'
  if (c === 'CN') return 'CN'
  if (c === 'RU') return 'RU'
  if (c === 'MX') return 'MX'
  if (UK_COUNTRIES.has(c)) return 'GB'
  if (SEPA_COUNTRIES.has(c)) return 'SEPA'
  if (GCC_COUNTRIES.has(c)) return 'GCC'
  if (BACS_COUNTRIES.has(c)) return 'BACS'
  return 'SWIFT'
}
function bankCountryCurrency(country: string): string {
  const region = detectBankRegion(country)
  const c = (country || '').toUpperCase()
  switch (region) {
    case 'US': return 'USD'
    case 'GB': return 'GBP'
    case 'IN': return 'INR'
    case 'AU': return 'AUD'
    case 'JP': return 'JPY'
    case 'CA': return 'CAD'
    case 'CN': return 'CNY'
    case 'RU': return 'RUB'
    case 'MX': return 'MXN'
    case 'SEPA': return SEPA_CURRENCY_MAP[c] ?? 'EUR'
    case 'GCC': return GCC_CURRENCY_MAP[c] ?? 'USD'
    default: return 'USD'
  }
}
// Full ISO 3166-1 country list, alphabetized to match Figma. OFAC-sanctioned
// countries are still listed (so the picker isn't mysteriously missing them)
// but selecting one surfaces ERR_DEPOSIT_COUNTRY_RESTRICTED from the backend,
// same as bank-validation.service.ts's own OFAC check.
const ALL_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' }, { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' }, { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' }, { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' }, { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' }, { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' }, { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' }, { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' }, { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' }, { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' }, { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' }, { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' }, { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' }, { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' }, { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' }, { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' }, { code: 'CV', name: 'Cape Verde', flag: '🇨🇻' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' }, { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' }, { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' }, { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' }, { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' }, { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' }, { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' }, { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' }, { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' }, { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' }, { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' }, { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' }, { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }, { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' }, { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' }, { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' }, { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' }, { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' }, { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' }, { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' }, { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' }, { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' }, { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' }, { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' }, { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' }, { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' }, { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' }, { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' }, { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' }, { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' }, { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' }, { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' }, { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' }, { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' }, { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' }, { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' }, { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' }, { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' }, { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' }, { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' }, { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' }, { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' }, { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' }, { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' }, { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' }, { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' }, { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' }, { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' }, { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' }, { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' }, { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' }, { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' }, { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' }, { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' }, { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' }, { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' }, { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' }, { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' }, { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' }, { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' }, { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' }, { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' }, { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' }, { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' }, { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' }, { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' }, { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' }, { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' }, { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' }, { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' }, { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' }, { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' }, { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
]
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
const isValidJpBankCode = (v: string) => /^\d{4}$/.test(v)
const isValidJpBranchCode = (v: string) => /^\d{3}$/.test(v)
const isValidSwiftBic = (v: string) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v.toUpperCase())
const isValidIban = (iban: string) => {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged.split('').map(c => (isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c)).join('')
  let remainder = BigInt(0)
  for (const chunk of numeric.match(/.{1,9}/g) ?? []) remainder = BigInt(remainder.toString() + chunk) % BigInt(97)
  return remainder === BigInt(1)
}
const isValidClabe = (clabe: string) => {
  if (!/^\d{18}$/.test(clabe)) return false
  const d = clabe.split('').map(Number)
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7]
  const sum = weights.reduce((acc, w, i) => acc + (w * d[i]) % 10, 0)
  return (10 - (sum % 10)) % 10 === d[17]
}
const isValidCnaps = (v: string) => /^\d{12}$/.test(v)
const isValidCnAccountNumber = (v: string) => /^\d{16,19}$/.test(v)
const isValidBik = (v: string) => /^\d{9}$/.test(v)
const isValidRuAccountNumber = (v: string) => /^\d{20}$/.test(v)

// US-63: bank-validation.service.ts throws these exact ERR_BANK_* codes as
// errorCode — mapped here to a friendly, field-specific checklist instead of
// showing the raw code or a generic "invalid details" message.
const BANK_FIELD_ERROR_MESSAGES: Record<string, string> = {
  ERR_BANK_ACCOUNT_NAME_INVALID: 'Account holder name is required (max 100 characters).',
  ERR_BANK_REGION_FIELD_MISMATCH: 'Select a country before continuing.',
  ERR_BANK_ROUTING_INVALID: 'Routing number must be a valid 9-digit ABA number.',
  ERR_BANK_ACCOUNT_NUMBER_INVALID: 'Account number format is invalid for the selected country.',
  ERR_BANK_CURRENCY_MISMATCH: 'Currency does not match what’s expected for this country.',
  ERR_BANK_IBAN_INVALID: 'IBAN is invalid — double-check for typos.',
  ERR_BANK_SWIFT_INVALID: 'SWIFT/BIC code is invalid.',
  ERR_BANK_SORT_CODE_INVALID: 'Sort code must be 6 digits.',
  ERR_BANK_IFSC_INVALID: 'IFSC code is invalid — format is 4 letters, 0, then 6 characters.',
  ERR_BANK_BSB_INVALID: 'BSB number must be 6 digits.',
  ERR_BANK_CODE_INVALID: 'Bank code must be 4 digits.',
  ERR_BANK_BRANCH_CODE_INVALID: 'Branch code must be 3 digits.',
  ERR_BANK_INSTITUTION_INVALID: 'Institution number must be 3 digits.',
  ERR_BANK_TRANSIT_INVALID: 'Transit number must be 5 digits.',
  ERR_BANK_CLABE_INVALID: 'CLABE must be 18 digits.',
  ERR_BANK_CNAPS_INVALID: 'CNAPS code must be 12 digits.',
  ERR_BANK_BIK_INVALID: 'BIK must be 9 digits.',
  ERR_DEPOSIT_COUNTRY_RESTRICTED: 'Payouts to this country are not currently supported.',
  ERR_DEPOSIT_METHOD_DUPLICATE: 'This account is already linked.',
  ERR_DEPOSIT_METHOD_VERIFIED_LOCKED: 'A verified account can’t be edited — remove it and add a new one instead.',
  ERR_DEPOSIT_METHOD_NOT_EDITABLE: 'Bank details can only be edited for manually-added bank accounts.',
}
const bankErrorMessage = (data: any): string =>
  BANK_FIELD_ERROR_MESSAGES[data?.errorCode] ?? data?.message ?? 'Please check your details and try again.'

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
  // US-102: defaults to "$" since every existing caller besides the Earnings
  // tab's own summary cards is genuinely USD-denominated payout-service data
  // (field names like totalPaidOutUsd) — only that caller passes a resolved
  // currencySymbol() for its region-currency amount.
  symbol?: string
  // Negative amounts (refunds/adjustments) render "-$X", not "$-X" — the
  // sign has to sit before the symbol span, not get swallowed into `amount`.
  negative?: boolean
  change?: { value: string; direction: "up" | "down"; label: string }
  extra?: React.ReactNode
  status?: string
}

const StatCard = ({ label, sublabel, amount, symbol = "$", negative, change, extra, status }: StatCardProps) => (
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
          {negative && "-"}<span className="text-base font-normal align-middle opacity-50">{symbol}</span>
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

export const OverviewTab = ({ onNavigateTab, onEditPayoutSchedule, onOpenHelp }: { onNavigateTab?: (tab: string) => void; onEditPayoutSchedule?: () => void; onOpenHelp?: () => void }) => {
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
  // US-100/US-101: previously a fetch failure here silently left
  // scheduleNextRunAt at its initial null and only logged to console — a
  // real load failure rendered identically to "No payout scheduled" (a
  // legitimate empty state), with no way to retry.
  const [scheduleError, setScheduleError] = React.useState(false)
  // Figma "Available for Withdrawal" tooltip claims this amount excludes the
  // reserve balance — it didn't (was showing raw availableBalanceDisplay) and
  // the copy hardcoded a literal "$150" regardless of the contractor's actual
  // configured reserve. Both fixed below using the real reserveUsd.
  const [reserveUsd, setReserveUsd] = React.useState(0)
  // Sourced from the real payout history (GET /v1/payouts?status=completed) — the most
  // recently settled payout, not a static mock value.
  const [previousPayout, setPreviousPayout] = React.useState<{ amountUsd: string; methodLabel: string | null; settledAt: string } | null>(null)
  const [previousPayoutLoading, setPreviousPayoutLoading] = React.useState(true)
  // US-100/US-101: same conflation risk as scheduleError above — a failed
  // fetch previously rendered identically to "No previous payouts yet".
  const [previousPayoutError, setPreviousPayoutError] = React.useState(false)
  // "Recent Activity" has no dedicated activity-feed endpoint in payout-service — this
  // derives real entries from the same payout history list rather than showing mock data.
  const [recentActivity, setRecentActivity] = React.useState<{ id: string; title: string; description: string; time: string; kind: 'scheduled' | 'sent' | 'processing' | 'failed' | 'cancelled' }[]>([])
  const [recentActivityLoading, setRecentActivityLoading] = React.useState(true)
  // US-100/US-101: same conflation risk — a failed fetch previously rendered
  // identically to a genuinely empty activity feed.
  const [recentActivityError, setRecentActivityError] = React.useState(false)

  // Recent Earnings has no visible UI in the Overview tab anymore — this data
  // is still fetched/polled purely as the source for the US-92 reversal-toast
  // detection effect below (diffs entry.status across polls).
  const [recentEarnings, setRecentEarnings] = React.useState<EarningsRow[]>([])

  const loadRecentEarnings = React.useCallback(() => {
    // EarningsQueryDto only accepts limit values of 10/25/50/100 — 5 400s.
    // Request the minimum valid page size and slice to the first 5.
    getEarnings({ view: "daily", limit: 10, sortBy: "workStartAt", sortOrder: "desc" })
      .then((res) => setRecentEarnings(res.data.slice(0, 5)))
      .catch((e) => console.error("Recent earnings fetch failed:", e))
  }, [])

  // Sourced from real payout history — no dedicated activity-feed endpoint
  // exists in payout-service; see toActivityItem(). Also the source of the
  // US-93 persistent failure banner (failedPayout, derived further below).
  const loadRecentActivity = React.useCallback(async () => {
    setRecentActivityError(false)
    try {
      const res = await payoutFetch(`/payouts?page=1&pageSize=8`)
      if (!res.ok) { setRecentActivityError(true); return }
      const d = await res.json()
      setRecentActivity((d.payouts ?? []).map((p: any) => toActivityItem(p)))
    } catch (e) { console.error('Failed to fetch recent activity', e); setRecentActivityError(true) }
    finally { setRecentActivityLoading(false) }
  }, [])

  // ── Deposit Methods state ──────────────────────────────────────
  const [methods, setMethods] = React.useState<any[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  // US-100/US-101: same conflation risk — a failed fetch previously rendered
  // identically to a genuinely empty deposit-methods list.
  const [methodsError, setMethodsError] = React.useState(false)
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
  // US-59: raw bank details are never returned by the backend (security —
  // see methods.service.ts toDetailItem), so editing means full re-entry,
  // not a diff against hidden values. Starts blank whenever Edit opens on
  // an eligible (BANK_MANUAL, not-yet-verified) method.
  const [editBankForm, setEditBankForm] = React.useState({ bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: '', bankCountry: 'US' })
  const [editBankError, setEditBankError] = React.useState('')
  // Dedicated "Bank Details Updated" / "Unable To Update Bank Info" screens
  // (Figma) for edits that actually touch bank fields — nickname-only edits
  // keep the plain toast, since nothing about the bank account changed.
  const [editBankSaveState, setEditBankSaveState] = React.useState<'success' | 'error' | null>(null)
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
  const [addForm, setAddForm] = React.useState({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: '', bankClabe: '', bankCnapsCode: '', bankBik: '', bankCountry: 'US', bankCountrySearch: '', bankCountryOpen: false, bankCurrency: 'USD', accountType: 'CHECKING', nickname: '', bankConsent: false })
  // source distinguishes the Stripe-connect flow from the manual/micro-deposit
  // flow — Figma specs different copy for each ("securely linked"/"Connection
  // Failed" for Stripe vs "has been verified"/"Verification Failed" for manual).
  const [verifyState, setVerifyState] = React.useState<{methodId:string, displayLabel:string, bankName:string, step:'instructions'|'amounts'|'verifying'|'success'|'failed'|'locked'|'expired', source: 'stripe' | 'manual', attemptsLeft?: number, lockedUntil?: string} | null>(null)
  const [microAmounts, setMicroAmounts] = React.useState({amount1:'', amount2:''})

  // ─── Crypto wallet (US-09) — provider/network/currency driven by the real
  // backend registry (GET /deposit-methods/crypto/providers), not a hardcoded list.
  const [cryptoProviders, setCryptoProviders] = React.useState<any[]>([])
  const [cryptoProvidersLoading, setCryptoProvidersLoading] = React.useState(false)
  // US-64: dedicated connecting/success/failure screens, not just a button
  // label + toast + silent close. 'qr' and 'paste' are the two WalletConnect
  // presentations of the same session (PS-10) offered alongside manual
  // address entry — 'connecting' covers both the manual-submit spinner and
  // the brief moment after a WalletConnect session reports 'connected'.
  const [cryptoStep, setCryptoStep] = React.useState<'provider' | 'details' | 'qr' | 'paste' | 'connecting' | 'success' | 'error'>('provider')
  const [cryptoForm, setCryptoForm] = React.useState({ provider: '', network: '', currency: '', address: '' })
  const [cryptoSubmitting, setCryptoSubmitting] = React.useState(false)
  const [cryptoError, setCryptoError] = React.useState('')
  const [cryptoResult, setCryptoResult] = React.useState<{ walletAddressLast6?: string; network?: string; token?: string; conversionDisplay?: string } | null>(null)
  const [cryptoWcSession, setCryptoWcSession] = React.useState<{ sessionId: string; wcUri: string; expiresAt: string } | null>(null)
  const [cryptoWcConsent, setCryptoWcConsent] = React.useState(false)
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

  // ─── WalletConnect session (PS-10/PS-11) — shared by the QR-scan and
  // paste-link screens, since they're two presentations of the same
  // underlying session, not two separate connection mechanisms.
  const startWalletConnectSession = React.useCallback(async () => {
    setCryptoError('')
    try {
      const res = await payoutFetch(`/deposit-methods/crypto/walletconnect-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cryptoProvider: cryptoForm.provider, network: cryptoForm.network }),
      })
      const data = await res.json()
      if (res.ok) {
        setCryptoWcSession({ sessionId: data.sessionId, wcUri: data.wcUri, expiresAt: data.expiresAt })
      } else {
        setCryptoError(data.message ?? 'Unable to start wallet connection.')
        setCryptoStep('error')
      }
    } catch {
      setCryptoError('Unable to start wallet connection.')
      setCryptoStep('error')
    }
  }, [cryptoForm.provider, cryptoForm.network])

  React.useEffect(() => {
    if ((cryptoStep === 'qr' || cryptoStep === 'paste') && !cryptoWcSession) {
      startWalletConnectSession()
    }
  }, [cryptoStep, cryptoWcSession, startWalletConnectSession])

  React.useEffect(() => {
    if ((cryptoStep !== 'qr' && cryptoStep !== 'paste') || !cryptoWcSession) return
    const poll = async () => {
      try {
        const res = await payoutFetch(`/deposit-methods/crypto/walletconnect-session/${cryptoWcSession.sessionId}`)
        const data = await res.json()
        if (data.status === 'connected') {
          setCryptoResult({ walletAddressLast6: data.walletAddressLast6, network: cryptoForm.network, token: cryptoForm.currency, conversionDisplay: data.conversionDisplay })
          setCryptoWcSession(null)
          fetchMethods()
          setCryptoStep('success')
        } else if (data.status === 'rejected') {
          setCryptoError('The connection request was declined in your wallet app.')
          setCryptoWcSession(null)
          setCryptoStep('error')
        } else if (data.status === 'expired') {
          setCryptoError('This connection link expired before a wallet approved it. Please try again.')
          setCryptoWcSession(null)
          setCryptoStep('error')
        }
      } catch { /* transient network error — next poll retries */ }
    }
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [cryptoStep, cryptoWcSession, cryptoForm.network, cryptoForm.currency])

  const handleAddCryptoWallet = async () => {
    setCryptoSubmitting(true)
    setCryptoError('')
    setCryptoStep('connecting')
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
      if (!res.ok) {
        setCryptoError(data.message ?? 'Unable to add this wallet — please check the address and try again.')
        setCryptoStep('error')
        return
      }
      setCryptoResult({ walletAddressLast6: data.walletAddressLast6, network: data.network, token: data.token, conversionDisplay: data.conversionDisplay })
      setCryptoStep('success')
      fetchMethods()
    } catch {
      setCryptoError('Unable to add this wallet — please try again.')
      setCryptoStep('error')
    } finally {
      setCryptoSubmitting(false)
    }
  }

  const fetchMethods = React.useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError(false)
    try {
      const res = await payoutFetch(`/deposit-methods`)
      // AC-01.02/01.05/01.06: every saved method must remain visible regardless of
      // verification status — pending/locked methods are surfaced via a status badge,
      // not hidden. Only the withdrawal method-selector (US-14) restricts to verified.
      if (!res.ok) { setMethodsError(true); return }
      const d = await res.json(); setMethods(d.methods ?? []); setCanAddMore(d.canAddMore ?? true)
    } catch (e) { console.error('Failed to fetch deposit methods', e); setMethodsError(true) }
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
        payload.bankCurrency = bankCountryCurrency(addForm.bankCountry)
        // AC-04.02/04.03: routing field adapts by region — only the field(s) relevant
        // to the selected country's region are sent, mirroring bank-validation.service.ts.
        switch (detectBankRegion(addForm.bankCountry)) {
          case 'US': payload.bankRoutingNumber = addForm.bankRoutingNumber; break
          case 'GB': payload.bankSortCode = addForm.bankSortCode; break
          case 'IN': payload.bankIfscCode = addForm.bankIfscCode; break
          case 'AU': payload.bankBsbNumber = addForm.bankBsbNumber; break
          case 'CA': payload.bankInstitutionNumber = addForm.bankInstitutionNumber; payload.bankTransitNumber = addForm.bankTransitNumber; break
          case 'JP': payload.bankCode = addForm.bankCode; payload.bankBranchCode = addForm.bankBranchCode; break
          case 'MX': payload.bankClabe = addForm.bankClabe; delete payload.bankAccountNumber; break
          case 'CN': payload.bankCnapsCode = addForm.bankCnapsCode; break
          case 'RU': payload.bankBik = addForm.bankBik; break
          case 'SEPA': payload.bankIban = addForm.bankIban; delete payload.bankAccountNumber; if (addForm.bankSwiftBic) payload.bankSwiftBic = addForm.bankSwiftBic; break
          case 'GCC': payload.bankIban = addForm.bankIban; payload.bankSwiftBic = addForm.bankSwiftBic; delete payload.bankAccountNumber; break
          case 'BACS': payload.bankSwiftBic = addForm.bankSwiftBic; break
          case 'SWIFT': payload.bankSwiftBic = addForm.bankSwiftBic; break
        }
        // "Bank Name" (e.g. "Chase") is cosmetic only — not a backend-validated field.
        if (addForm.bankAccountName) payload.nickname = addForm.bankAccountName
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
          const identifier = addForm.bankAccountNumber || addForm.bankClabe || addForm.bankIban
          const last4 = identifier.slice(-4); setMicroAmounts({ amount1: '', amount2: '' }); setVerifyState({ methodId: data.depositMethodId, displayLabel: data.displayLabel ?? ('••••' + last4), bankName: addForm.bankAccountName || '', step: 'instructions', source: 'manual' })
          setShowAddMethod(false)
        }
      } else {
        toast({ title: 'Error adding account', description: bankErrorMessage(data), variant: 'destructive' })
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
      setVerifyState({ methodId: method.id, displayLabel, bankName, step: 'verifying', source: 'stripe' })
      await new Promise(r => setTimeout(r, 2500))
      setVerifyState({ methodId: method.id, displayLabel, bankName, step: 'success', source: 'stripe' })
      fetchMethods()
    } catch (e) {
      setAddForm(f => ({...f, _stripeConnecting: false} as any))
      setVerifyState({ methodId: '', displayLabel: '', bankName, step: 'failed', source: 'stripe' })
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
  const handleConnectOAuth = async (methodType: 'PAYPAL' | 'WISE' | 'PAYONEER') => {
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
      // The provider callback (oauth.controller.ts) redirects back with only
      // ?oauth=success&methodId=... or ?oauth=error&code=... — no provider
      // name on the error path (nothing was created yet to read it off of).
      // Stash it client-side across the full-page redirect so the returning
      // "PayPal/Wise/Payoneer Connected" / "Couldn't Connect" screen knows
      // which provider it's reporting on.
      sessionStorage.setItem('oauth_pending_provider', methodType)
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
  // Figma: a dedicated "X Connected" / "Couldn't Connect to X" screen, not
  // just a toast — the toast alone gave no confirmation of *which* account
  // got linked or a way to set it default/retry in place.
  const [oauthResult, setOauthResult] = React.useState<{
    provider: 'PAYPAL' | 'WISE' | 'PAYONEER'
    status: 'success' | 'error'
    method?: any
    errorMessage?: string
  } | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('oauth')
    if (!result) return
    const provider = (sessionStorage.getItem('oauth_pending_provider') as 'PAYPAL' | 'WISE' | 'PAYONEER' | null) ?? 'PAYPAL'
    sessionStorage.removeItem('oauth_pending_provider')
    if (result === 'success') {
      const methodId = params.get('methodId')
      fetchMethods()
      if (methodId) {
        payoutFetch(`/deposit-methods/${methodId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((method) => setOauthResult({ provider, status: 'success', method }))
          .catch(() => setOauthResult({ provider, status: 'success' }))
      } else {
        setOauthResult({ provider, status: 'success' })
      }
    } else {
      const code = params.get('code') ?? undefined
      setOauthResult({ provider, status: 'error', errorMessage: code ? OAUTH_ERROR_MESSAGES[code] : undefined })
    }
    params.delete('oauth'); params.delete('methodId'); params.delete('code')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [fetchMethods])

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
      if (res.ok) {
        // Figma: names the method and, when split payout is active, states the
        // actual live percentages rather than a generic "Default updated".
        const target = methods.find((m: any) => m.id === id)
        const label = target ? getMethodLabel(target).name : 'This method'
        try {
          const scheduleRes = await payoutFetch(`/payouts/schedule`)
          if (scheduleRes.ok) {
            const s = await scheduleRes.json()
            if (s.splitEnabled && s.secondaryMethod) {
              const secondaryLabel = s.secondaryMethod.displayLabel ?? s.secondaryMethod.methodType
              const primaryPct = Math.round((s.primarySplitPercent ?? 100) * 100) / 100
              const secondaryPct = Math.round((100 - primaryPct) * 100) / 100
              toast({
                title: `${label} is now your default deposit method.`,
                description: `This will be used for all scheduled deposits. Split logic is on: ${primaryPct}% to ${label}, ${secondaryPct}% to ${secondaryLabel}.`,
              })
              fetchMethods()
              return
            }
          }
        } catch { /* fall through to the plain toast below */ }
        toast({ title: `${label} is now your default deposit method.` })
        fetchMethods()
      }
      else { const e = await res.json(); toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to update default', variant: 'destructive' }) }
  }

  // SCR-07: confirm before replacing the existing default deposit method
  // (Figma "Make this your default deposit method?").
  const [confirmSetDefault, setConfirmSetDefault] = React.useState<any | null>(null)
  const requestSetDefault = (method: any) => setConfirmSetDefault(method)

  // US-59/62/63: full bank-detail replacement, only offered for BANK_MANUAL
  // methods that haven't completed verification yet — see updateMethod() in
  // methods.service.ts for why VERIFIED methods stay nickname-only.
  const editingBankDetails = editingMethod?.methodType === 'BANK_MANUAL' && editingMethod?.verificationStatus !== 'verified'

  const handleUpdateMethod = async () => {
    if (!editingMethod) return
    setEditBankError('')
    try {
      const editRegion = detectBankRegion(editBankForm.bankCountry)
      const submittingBankDetails = editingBankDetails && (
        editBankForm.bankAccountNumber.trim() || editBankForm.bankIban.trim()
      )
      const payload: any = { nickname: editingMethod.nickname ?? '' }
      if (submittingBankDetails) {
        payload.bankAccountName = editBankForm.bankAccountName
        payload.bankCountry = editBankForm.bankCountry
        payload.bankCurrency = bankCountryCurrency(editBankForm.bankCountry)
        if (editRegion !== 'SEPA') payload.bankAccountNumber = editBankForm.bankAccountNumber
        switch (editRegion) {
          case 'US': payload.bankRoutingNumber = editBankForm.bankRoutingNumber; break
          case 'GB': payload.bankSortCode = editBankForm.bankSortCode; break
          case 'IN': payload.bankIfscCode = editBankForm.bankIfscCode; break
          case 'AU': payload.bankBsbNumber = editBankForm.bankBsbNumber; break
          case 'CA': payload.bankInstitutionNumber = editBankForm.bankInstitutionNumber; payload.bankTransitNumber = editBankForm.bankTransitNumber; break
          case 'JP': payload.bankCode = editBankForm.bankCode; payload.bankBranchCode = editBankForm.bankBranchCode; break
          case 'SEPA': payload.bankIban = editBankForm.bankIban; if (editBankForm.bankSwiftBic) payload.bankSwiftBic = editBankForm.bankSwiftBic; break
          case 'SWIFT': payload.bankSwiftBic = editBankForm.bankSwiftBic; break
        }
      }
      const res = await payoutFetch(`/deposit-methods/${editingMethod.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        if (data.verification?.type === 'micro_deposit') {
          // US-62: bank details changed, so verification restarted from
          // scratch — same "up to 2 business days" copy as adding a new
          // account, since that's exactly what happened underneath.
          setMicroAmounts({ amount1: '', amount2: '' })
          setVerifyState({ methodId: editingMethod.id, displayLabel: data.displayLabel ?? editingMethod.displayLabel, bankName: editBankForm.bankAccountName || '', step: 'instructions', source: 'manual' })
          setEditingMethod(null)
        } else if (submittingBankDetails) {
          setEditBankSaveState('success')
        } else {
          toast({ title: 'Account updated' })
          setEditingMethod(null)
        }
        fetchMethods()
      } else if (submittingBankDetails) {
        setEditBankError(bankErrorMessage(data))
        setEditBankSaveState('error')
      } else {
        setEditBankError(bankErrorMessage(data))
      }
    } catch (e) {
      setEditBankError('Failed to update account. Please try again.')
      if (editingBankDetails) setEditBankSaveState('error')
    }
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
    // Real per-provider icon (Ramp/Transak/Coinbase/MetaMask/etc.), not a
    // hardcoded "BTC" label shown regardless of the actual connected
    // provider or currency.
    if (type === 'CRYPTO') return <CryptoProviderIcon provider={typeof m === 'object' ? m?.cryptoProvider : ''} className="size-5 rounded" />
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

  React.useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) loadRecentEarnings() }, 60_000)
    return () => clearInterval(id)
  }, [loadRecentEarnings])

  const loadSummary = React.useCallback(() => {
    setSummaryError(false)
    getEarningsSummary().then(setSummary).catch((e) => { console.error("Earnings summary fetch failed:", e); setSummaryError(true) })
  }, [])

  // US-92: same "no real-time transport" constraint as above — reversal
  // detection is polling-based too. Each poll re-fetches Recent Earnings and
  // diffs entry.status against what was last seen; an entry that flips to
  // "failed" (this codebase's reversed-entry status, see EarningsRow.status)
  // since the previous poll gets a toast. Never toasts on first load (nothing
  // to diff against yet) or for entries already known to be failed.
  const knownEntryStatusRef = React.useRef<Map<string, string>>(new Map())
  React.useEffect(() => {
    const seen = knownEntryStatusRef.current
    let reversed = false
    for (const row of recentEarnings) {
      const prevStatus = seen.get(row.id)
      if (prevStatus && prevStatus !== "failed" && row.status === "failed") reversed = true
      seen.set(row.id, row.status)
    }
    if (reversed) {
      // US-92.01: balance, history, and summary cards all re-fetch together —
      // not just the recentEarnings poll that happened to notice the reversal.
      // US-92.02/92.03: exact copy, treated as a correction (default/neutral
      // toast styling), not an error.
      toast({ title: "Transaction reversed", description: "A transaction has been reversed. Your balance has been updated." })
      loadBalance()
      loadSummary()
    }
  }, [recentEarnings, toast, loadBalance, loadSummary])

  // US-100/US-101: extracted to a callback (not an inline mount-effect IIFE)
  // so the error state below has something to retry against.
  const loadSchedule = React.useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(false)
    try {
      const res = await payoutFetch(`/payouts/schedule`)
      if (!res.ok) { setScheduleError(true); return }
      const d = await res.json(); setScheduleNextRunAt(d.nextRunAt ?? null); setReserveUsd(d.reserveUsd ? parseFloat(d.reserveUsd) : 0)
    } catch (e) { console.error('Failed to fetch payout schedule', e); setScheduleError(true) }
    finally { setScheduleLoading(false) }
  }, [])

  const loadPreviousPayout = React.useCallback(async () => {
    setPreviousPayoutLoading(true)
    setPreviousPayoutError(false)
    try {
      const res = await payoutFetch(`/payouts?status=completed&page=1&pageSize=1`)
      if (!res.ok) { setPreviousPayoutError(true); return }
      const d = await res.json()
      const latest = d.payouts?.[0]
      setPreviousPayout(latest ? { amountUsd: latest.netAmountUsd ?? latest.amountUsd, methodLabel: latest.methodLabel, settledAt: latest.settledAt } : null)
    } catch (e) { console.error('Failed to fetch previous payout', e); setPreviousPayoutError(true) }
    finally { setPreviousPayoutLoading(false) }
  }, [])

  useEffect(() => {
    loadSummary()
    loadBalance()
    loadRecentEarnings()
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
    loadSchedule()
    loadPreviousPayout()
    loadRecentActivity()
  }, [fetchMethods, loadBalance, loadSummary, loadRecentEarnings, loadRecentActivity, loadSchedule, loadPreviousPayout])

  // US-93.01: the persistent failure banner must be able to appear live, not
  // only on page load — recentActivity (its data source) previously fetched
  // once on mount only, same "no Ably" polling-fallback pattern as balance
  // and recentEarnings above.
  React.useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) loadRecentActivity() }, 60_000)
    return () => clearInterval(id)
  }, [loadRecentActivity])

  // US-93: persistent failure banner — recentActivity is already sourced from
  // real payout history (GET /v1/payouts, most-recent-first), so the first
  // 'failed' item there is a genuine failed withdrawal, not a fabricated one.
  const failedPayout = React.useMemo(() => recentActivity.find((a) => a.kind === "failed") ?? null, [recentActivity])

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* US-93: persistent until the contractor navigates to it — no dismiss button. */}
        {failedPayout && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              <span className="mr-2">⚠️</span>
              A withdrawal could not be completed — {failedPayout.title}.
            </p>
            <Button variant="link" visual="gray" size="sm" onClick={() => onNavigateTab?.("payouts")}>
              View Details
            </Button>
          </div>
        )}

        {/* Congratulations Banner — hidden until there's actually something to celebrate */}
        {showBanner && balance && parseFloat(balance.totalEarnedUsd) > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-success-500 bg-success-25 px-4 py-3">
            <p className="text-sm text-dark-blue-400">
              <span className="mr-2">&#x1F929;</span>
              You&apos;ve earned <span className="font-semibold text-success-600">{balance ? amountSign(balance.totalEarnedUsd) : ""}${balance ? formatWholeAmount(balance.totalEarnedUsd) : "..."}</span> total &mdash; {summary?.allTime?.hoursLabel ?? "..."} logged
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
                {summary ? amountSign(summary.today.amount) : ""}<span className="text-base align-top">{currencySymbol(summary?.today.displayCurrency || "USD")}</span>{summary ? formatWholeAmount(summary.today.amount) : "—"}
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
                    {summary ? amountSign(summary.thisWeek.amount) : ""}<span className="text-sm align-top">{currencySymbol(summary?.thisWeek.displayCurrency || "USD")}</span>{summary ? formatWholeAmount(summary.thisWeek.amount) : "—"}
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
                    {summary ? amountSign(summary.thisMonth.amount) : ""}<span className="text-sm align-top">{currencySymbol(summary?.thisMonth.displayCurrency || "USD")}</span>{summary ? formatWholeAmount(summary.thisMonth.amount) : "—"}
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
              ) : scheduleError ? (
                <div>
                  <p className="text-sm text-red-600">Unavailable.</p>
                  <button className="text-sm text-primary-600 underline mt-1" onClick={loadSchedule}>Retry</button>
                </div>
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
                <Button variant="link" visual="gray" size="sm" onClick={() => { if (defaultMethod) { setEditingMethod({...defaultMethod}); setEditBankForm({ bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: '', bankCountry: defaultMethod.bankCountry || 'US' }); setEditBankError(''); setEditBankSaveState(null) } }}>Edit</Button>
              </div>
              {methodsLoading ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : methodsError ? (
                <div className="text-sm">
                  <span className="text-red-600">Unavailable.</span>{" "}
                  <button className="text-primary-600 underline" onClick={fetchMethods}>Retry</button>
                </div>
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
            ) : previousPayoutError ? (
              <div className="text-sm">
                <span className="text-red-600">Previous payout unavailable.</span>{" "}
                <button className="text-primary-600 underline" onClick={loadPreviousPayout}>Retry</button>
              </div>
            ) : previousPayout ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Previous Payout</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Deposited on {new Date(previousPayout.settledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to <BankIcon className="size-3.5 inline" /> {previousPayout.methodLabel ?? "Method unavailable"}
                  </p>
                </div>
                <p className="text-2xl font-bold text-dark-blue-400">
                  <span className="text-sm align-top">$</span>{parseFloat(previousPayout.amountUsd).toFixed(2)}
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
            ) : methodsError ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-600">We couldn't load your connected accounts.</p>
                <button className="text-sm text-primary-600 underline mt-1" onClick={fetchMethods}>Retry</button>
              </div>
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
                  <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { setEditingMethod({...m}); setEditBankForm({ bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: '', bankCountry: m.bankCountry || 'US' }); setEditBankError(''); setEditBankSaveState(null) }}>
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
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { if(verifyState?.methodId) deleteMethod(verifyState.methodId); setVerifyState(null); setShowAddMethod(true); setAddForm(f => ({...f, methodType: 'BANK_MANUAL'})) }}><ChevronLeft className="size-4" /></IconButton>
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
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setVerifyState(s => s ? {...s, step: 'instructions'} : null)}><ChevronLeft className="size-4" /></IconButton>
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
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        {verifyState.source === 'stripe' ? 'Your bank account has been securely linked.' : 'Your bank account has been verified.'}
                      </h4>
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                        <BankIcon className="size-5 text-gray-500" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-dark-blue-400">{verifyState.displayLabel}</span>
                          <span className="text-xs text-gray-400">{addForm?.accountType ? (addForm.accountType.charAt(0).toUpperCase() + addForm.accountType.slice(1)) + ' Account' : 'Checking Account'}</span>
                        </div>
                        <Badge visual="success" size="sm" className="ml-auto">Verified</Badge>
                      </div>
                    </div>
                    <Button variant="light" visual="primary" size="sm" className="w-full" onClick={async () => { await handleSetDefault(verifyState.methodId); setVerifyState(null) }}>Set As Default Deposit Method</Button>
                    <Button variant="outlined" visual="gray" size="sm" className="w-full" leftIcon={<ChevronLeft className="size-4" />} onClick={() => { setVerifyState(null); fetchMethods() }}>Back to Deposit Methods</Button>
                  </div>
                )}
                {verifyState.step === 'failed' && (
                  <div className="p-6 text-center space-y-4">
                    <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-warning-50"><AlertTriangle className="size-6 text-warning-600" /></div>
                    <h4 className="text-base font-semibold text-dark-blue-400">{verifyState.source === 'stripe' ? 'Connection Failed' : 'Verification Failed'}</h4>
                    <p className="text-sm text-gray-500">
                      {verifyState.source === 'stripe'
                        ? "We couldn't verify your bank at this time. This may be due to a temporary network issue or incorrect information."
                        : "We couldn't verify your bank at this time. Please check your deposit amounts and try again."}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outlined" visual="gray" size="sm" className="w-full" leftIcon={<RefreshCcw01 className="size-4" />}
                        onClick={() => {
                          if (verifyState.source === 'stripe') { const bankName = verifyState.bankName; setVerifyState(null); handleConnectStripe(bankName) }
                          else setVerifyState(s => s ? {...s, step: 'amounts'} : null)
                        }}
                      >Retry</Button>
                      <Button variant="link" visual="gray" size="sm" className="w-full" leftIcon={<ChevronLeft className="size-4" />} onClick={() => { setVerifyState(null); fetchMethods() }}>Back to Deposit Methods</Button>
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

          {/* PayPal/Wise/Payoneer OAuth return — dedicated "X Connected" /
              "Couldn't Connect to X" screens (Figma), replacing what used to be
              a toast-only confirmation with no way to set default or retry in place. */}
          {oauthResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOauthResult(null)}>
              <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6 relative" onClick={e => e.stopPropagation()}>
                <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => setOauthResult(null)}><X className="size-4" /></IconButton>
                {oauthResult.status === 'success' ? (
                  <div className="text-center py-2 space-y-4">
                    <div className="flex flex-col items-center gap-1">
                      {oauthResult.provider === 'PAYPAL' ? <PayPalDefault className="size-10" />
                        : oauthResult.provider === 'WISE' ? <WiseIcon className="size-12" />
                        : <PayoneerDefault className="size-10" />}
                    </div>
                    <h4 className="text-base font-semibold text-dark-blue-400">
                      {oauthResult.provider === 'PAYPAL' ? 'PayPal' : oauthResult.provider === 'WISE' ? 'Wise' : 'Payoneer'} Connected
                    </h4>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-left">
                      {oauthResult.provider === 'PAYPAL' ? <PayPalDefault className="size-5" />
                        : oauthResult.provider === 'WISE' ? <WiseIcon className="size-5 rounded-full" />
                        : <PayoneerDefault className="size-5" />}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-dark-blue-400">
                          {oauthResult.provider === 'PAYPAL' ? 'Paypal Email' : oauthResult.provider === 'WISE' ? 'Wise Account' : 'Payoneer Account'}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {oauthResult.method?.paypalEmail ?? oauthResult.method?.displayLabel ?? oauthResult.method?.nickname ?? '—'}
                        </span>
                      </div>
                      <Badge visual="success" size="sm" className="ml-auto shrink-0">Verified</Badge>
                    </div>
                    <Button variant="light" visual="primary" size="sm" className="w-full" onClick={async () => { if (oauthResult.method?.id) await handleSetDefault(oauthResult.method.id); setOauthResult(null) }}>Set As Default Deposit Method</Button>
                    <Button variant="outlined" visual="gray" size="sm" className="w-full" leftIcon={<ChevronLeft className="size-4" />} onClick={() => setOauthResult(null)}>Back to Deposit Methods</Button>
                  </div>
                ) : (
                  <div className="text-center py-2 space-y-4">
                    <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-warning-50"><AlertTriangle className="size-6 text-warning-600" /></div>
                    <h4 className="text-base font-semibold text-dark-blue-400">
                      Couldn't Connect to {oauthResult.provider === 'PAYPAL' ? 'PayPal' : oauthResult.provider === 'WISE' ? 'Wise' : 'Payoneer'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {oauthResult.errorMessage ?? `We were unable to link your ${oauthResult.provider === 'PAYPAL' ? 'PayPal' : oauthResult.provider === 'WISE' ? 'Wise' : 'Payoneer'} account. You may have canceled the login or encountered a connection issue.`}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button variant="outlined" visual="gray" size="sm" className="w-full" leftIcon={<RefreshCcw01 className="size-4" />} onClick={() => { const provider = oauthResult.provider; setOauthResult(null); handleConnectOAuth(provider) }}>Retry</Button>
                      <Button variant="link" visual="gray" size="sm" className="w-full" leftIcon={<ChevronLeft className="size-4" />} onClick={() => setOauthResult(null)}>Back to Deposit Methods</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Method Dialog — multi-step */}
          {showAddMethod && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddMethod(false); setAddForm({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: '', bankClabe: '', bankCnapsCode: '', bankBik: '', bankCountry: 'US', bankCountrySearch: '', bankCountryOpen: false, bankCurrency: 'USD', accountType: 'CHECKING', nickname: '', bankConsent: false }); setCryptoStep('provider'); setCryptoForm({ provider: '', network: '', currency: '', address: '' }); setCryptoError(''); setCryptoResult(null); setCryptoWcSession(null); setCryptoWcConsent(false); }}>
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
                        <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: ''}))}><ChevronLeft className="size-4" /></IconButton>
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
                          {/* Storybook Buttons/Button > GoogleOutlined pattern — outlined/
                              gray with a leftIcon brand mark, matching the other provider
                              connect buttons (PayPal/Wise/Payoneer) and GoogleLoginButton.tsx. */}
                          <Button
                            variant="outlined" visual="gray" size="sm" className="w-full py-3 text-base gap-x-3 active:ring-4 active:ring-gray-100"
                            leftIcon={<StripeDefault />}
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
                  /* Step 2a: Bank manual form — fields adapt by country/region
                     (AC-04.02/04.03), mirroring bank-validation.service.ts's full
                     region set (US/GB/IN/AU/JP/CA/CN/RU/MX/SEPA/GCC/BACS/SWIFT),
                     not just the 5-country subset this form used to expose. */
                  (() => {
                    const region = detectBankRegion(addForm.bankCountry)
                    const selectedCountry = ALL_COUNTRIES.find(c => c.code === addForm.bankCountry)
                    const filteredCountries = addForm.bankCountrySearch
                      ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(addForm.bankCountrySearch.toLowerCase()))
                      : ALL_COUNTRIES
                    const selectCountry = (code: string) => setAddForm(f => ({
                      ...f, bankCountry: code, bankCountrySearch: '', bankCountryOpen: false,
                      bankCurrency: bankCountryCurrency(code),
                      // Region change: clear every region-specific field so a stale
                      // sort code / IFSC / BSB / IBAN can't be silently submitted.
                      bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '',
                      bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '',
                      bankCode: '', bankBranchCode: '', bankClabe: '', bankCnapsCode: '', bankBik: '',
                    }))
                    const saveDisabled =
                      !addForm.nickname.trim() || !addForm.bankConsent ||
                      OFAC_BLOCKED_COUNTRIES.has(addForm.bankCountry.toUpperCase()) ||
                      (region !== 'MX' && region !== 'SEPA' && region !== 'GCC' && (
                        !addForm.bankAccountNumber.trim() ||
                        addForm.bankAccountNumberConfirm !== addForm.bankAccountNumber
                      )) ||
                      (region === 'US' && !isValidAbaRouting(addForm.bankRoutingNumber)) ||
                      (region === 'GB' && !isValidSortCode(addForm.bankSortCode)) ||
                      (region === 'IN' && !isValidIfsc(addForm.bankIfscCode)) ||
                      (region === 'AU' && !isValidBsb(addForm.bankBsbNumber)) ||
                      (region === 'CA' && (!isValidCaInstitution(addForm.bankInstitutionNumber) || !isValidCaTransit(addForm.bankTransitNumber))) ||
                      (region === 'JP' && (!isValidJpBankCode(addForm.bankCode) || !isValidJpBranchCode(addForm.bankBranchCode) || !/^\d{7}$/.test(addForm.bankAccountNumber))) ||
                      (region === 'MX' && !isValidClabe(addForm.bankClabe)) ||
                      (region === 'CN' && (!isValidCnaps(addForm.bankCnapsCode) || !isValidCnAccountNumber(addForm.bankAccountNumber))) ||
                      (region === 'RU' && (!isValidBik(addForm.bankBik) || !isValidRuAccountNumber(addForm.bankAccountNumber))) ||
                      (region === 'SEPA' && !isValidIban(addForm.bankIban)) ||
                      (region === 'GCC' && (!isValidIban(addForm.bankIban) || !isValidSwiftBic(addForm.bankSwiftBic))) ||
                      (region === 'BACS' && (!isValidSwiftBic(addForm.bankSwiftBic) || !addForm.bankAccountNumber.trim())) ||
                      (region === 'SWIFT' && (!isValidSwiftBic(addForm.bankSwiftBic) || !addForm.bankAccountNumber.trim()))

                    return (
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_CONNECT'}))}><ChevronLeft className="size-4" /></IconButton>
                      <h3 className="text-base font-semibold text-dark-blue-400">Add your bank account manually</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <label className="text-xs text-gray-500 mb-1 block">Country</label>
                        <div className="relative">
                          <input
                            className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm"
                            placeholder="Select country"
                            value={addForm.bankCountryOpen ? addForm.bankCountrySearch : (selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : '')}
                            onFocus={() => setAddForm(f => ({...f, bankCountryOpen: true, bankCountrySearch: ''}))}
                            onBlur={() => setTimeout(() => setAddForm(f => ({...f, bankCountryOpen: false})), 150)}
                            onChange={e => setAddForm(f => ({...f, bankCountrySearch: e.target.value}))}
                          />
                          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                        </div>
                        {addForm.bankCountryOpen && (
                          <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {filteredCountries.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">No countries found</p>
                            ) : filteredCountries.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                                onClick={() => selectCountry(c.code)}
                              >
                                <span>{c.flag}</span> <span className="text-dark-blue-400">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {OFAC_BLOCKED_COUNTRIES.has(addForm.bankCountry.toUpperCase()) && (
                        <p className="text-xs text-red-500">Payouts to this country are not currently supported.</p>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Bank of America" value={addForm.bankAccountName} onChange={e => setAddForm(f => ({...f, bankAccountName: e.target.value}))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="John Doe" value={addForm.nickname} onChange={e => setAddForm(f => ({...f, nickname: e.target.value}))} />
                      </div>
                      {region === 'US' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.accountType} onChange={e => setAddForm(f => ({...f, accountType: e.target.value}))}>
                            <option value="">Select</option>
                            <option value="CHECKING">Checking</option>
                            <option value="SAVINGS">Savings</option>
                          </select>
                        </div>
                      )}

                      {/* Account number — every region except MX (CLABE only)/SEPA/GCC
                          (IBAN only) uses a plain account number field. */}
                      {region !== 'MX' && region !== 'SEPA' && region !== 'GCC' && (
                        <>
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
                        </>
                      )}

                      {region === 'US' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Bank Routing Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="9-digit ABA routing number" value={addForm.bankRoutingNumber} onChange={e => setAddForm(f => ({...f, bankRoutingNumber: e.target.value}))} />
                          {addForm.bankRoutingNumber.length > 0 && !isValidAbaRouting(addForm.bankRoutingNumber) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 9-digit routing number</p>
                          )}
                        </div>
                      )}
                      {region === 'GB' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Sort Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 12-34-56" value={addForm.bankSortCode} onChange={e => setAddForm(f => ({...f, bankSortCode: e.target.value}))} />
                          {addForm.bankSortCode.length > 0 && !isValidSortCode(addForm.bankSortCode) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 6-digit sort code</p>
                          )}
                        </div>
                      )}
                      {region === 'IN' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. HDFC0001234" value={addForm.bankIfscCode} onChange={e => setAddForm(f => ({...f, bankIfscCode: e.target.value}))} />
                          {addForm.bankIfscCode.length > 0 && !isValidIfsc(addForm.bankIfscCode) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid IFSC code (e.g. HDFC0001234)</p>
                          )}
                        </div>
                      )}
                      {region === 'AU' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">BSB Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 123-456" value={addForm.bankBsbNumber} onChange={e => setAddForm(f => ({...f, bankBsbNumber: e.target.value}))} />
                          {addForm.bankBsbNumber.length > 0 && !isValidBsb(addForm.bankBsbNumber) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid 6-digit BSB number</p>
                          )}
                        </div>
                      )}
                      {region === 'CA' && (
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
                      {region === 'JP' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Bank Code</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="4 digits" value={addForm.bankCode} onChange={e => setAddForm(f => ({...f, bankCode: e.target.value}))} />
                            {addForm.bankCode.length > 0 && !isValidJpBankCode(addForm.bankCode) && <p className="text-xs text-red-500 mt-1">4 digits required</p>}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Branch Code</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="3 digits" value={addForm.bankBranchCode} onChange={e => setAddForm(f => ({...f, bankBranchCode: e.target.value}))} />
                            {addForm.bankBranchCode.length > 0 && !isValidJpBranchCode(addForm.bankBranchCode) && <p className="text-xs text-red-500 mt-1">3 digits required</p>}
                          </div>
                        </div>
                      )}
                      {region === 'MX' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">CLABE</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="18-digit CLABE" value={addForm.bankClabe} onChange={e => setAddForm(f => ({...f, bankClabe: e.target.value}))} />
                          {addForm.bankClabe.length > 0 && !isValidClabe(addForm.bankClabe) && <p className="text-xs text-red-500 mt-1">Enter a valid 18-digit CLABE</p>}
                        </div>
                      )}
                      {region === 'CN' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">CNAPS Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="12 digits" value={addForm.bankCnapsCode} onChange={e => setAddForm(f => ({...f, bankCnapsCode: e.target.value}))} />
                          {addForm.bankCnapsCode.length > 0 && !isValidCnaps(addForm.bankCnapsCode) && <p className="text-xs text-red-500 mt-1">12 digits required</p>}
                        </div>
                      )}
                      {region === 'RU' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">BIK</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="9 digits" value={addForm.bankBik} onChange={e => setAddForm(f => ({...f, bankBik: e.target.value}))} />
                          {addForm.bankBik.length > 0 && !isValidBik(addForm.bankBik) && <p className="text-xs text-red-500 mt-1">9 digits required</p>}
                        </div>
                      )}
                      {(region === 'SEPA' || region === 'GCC') && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">IBAN</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. DE89370400440532013000" value={addForm.bankIban} onChange={e => setAddForm(f => ({...f, bankIban: e.target.value}))} />
                          {addForm.bankIban.length > 0 && !isValidIban(addForm.bankIban) && <p className="text-xs text-red-500 mt-1">Enter a valid IBAN</p>}
                        </div>
                      )}
                      {(region === 'GCC' || region === 'BACS' || region === 'SWIFT') && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">SWIFT/BIC Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. DEUTDEFF" value={addForm.bankSwiftBic} onChange={e => setAddForm(f => ({...f, bankSwiftBic: e.target.value}))} />
                          {addForm.bankSwiftBic.length > 0 && !isValidSwiftBic(addForm.bankSwiftBic) && <p className="text-xs text-red-500 mt-1">Enter a valid SWIFT/BIC code</p>}
                        </div>
                      )}
                      {region === 'SEPA' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">SWIFT/BIC Code (optional)</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. DEUTDEFF" value={addForm.bankSwiftBic} onChange={e => setAddForm(f => ({...f, bankSwiftBic: e.target.value}))} />
                          {addForm.bankSwiftBic.length > 0 && !isValidSwiftBic(addForm.bankSwiftBic) && <p className="text-xs text-red-500 mt-1">Enter a valid SWIFT/BIC code</p>}
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
                        disabled={saveDisabled}
                      >Save</Button>
                    </div>
                  </div>
                    )
                  })()
                ) : addForm.methodType === 'PAYPAL' || addForm.methodType === 'WISE' || addForm.methodType === 'PAYONEER' ? (
                  /* Step 2b/2c: PayPal / Wise / Payoneer — real OAuth redirect
                     (AC-06.01/06.04, AC-07.01/07.04, AC-08.01/08.04). One shared
                     screen: same backend call (handleConnectOAuth -> POST
                     /deposit-methods -> verification.oauthUrl -> redirect) and
                     the same Figma layout for all three providers — centered
                     icon, no title bar, single X close in the corner. Figma places
                     the provider icon to the left of the heading, side by side —
                     not centered above it. */
                  <div className="p-8 relative flex flex-col">
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    <div className="flex items-center pt-6 pb-3 gap-4">
                      {addForm.methodType === 'PAYPAL' ? <PayPalDefault className="size-14 shrink-0" />
                        : addForm.methodType === 'WISE' ? <WiseIcon className="size-14 shrink-0" />
                        : <PayoneerDefault className="size-14 shrink-0" />}
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        You'll be redirected to {addForm.methodType === 'PAYPAL' ? 'PayPal' : addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'} to securely connect your account.
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 pb-2">Securely handle your information through a trusted third party.</p>
                    {/* Storybook Buttons/Button pattern, adapted: Figma shows this
                        specific CTA as a solid dark/black button rather than the
                        outlined "GoogleOutlined" style used elsewhere — no
                        filled+gray compound variant exists in button.tsx, so the
                        dark styling is layered on via className on top of the
                        shared Button component (still gets its focus/disabled/
                        sizing behavior from the component, not a raw <button>). */}
                    <Button
                      variant="filled" visual="gray" size="sm"
                      className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white active:ring-4 active:ring-gray-300"
                      disabled={!addForm.bankConsent || oauthConnecting}
                      onClick={() => handleConnectOAuth(addForm.methodType as 'PAYPAL' | 'WISE' | 'PAYONEER')}
                    >{oauthConnecting ? 'Connecting…' : `Continue To ${addForm.methodType === 'PAYPAL' ? 'PayPal' : addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'}`}</Button>
                    <Button variant="link" visual="gray" size="sm" className="w-full mt-2" leftIcon={<ChevronLeft className="size-4" />} onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>Back to Deposit Methods</Button>
                    <label className="flex items-start gap-2 cursor-pointer mt-6">
                      <input type="checkbox" className="mt-0.5 accent-primary-600" checked={addForm.bankConsent} onChange={e => setAddForm(f => ({...f, bankConsent: e.target.checked}))} />
                      <span className="text-xs text-gray-400">By connecting your account, you authorize Marketeq to send deposits to your linked {addForm.methodType === 'PAYPAL' ? 'PayPal' : addForm.methodType === 'WISE' ? 'Wise' : 'Payoneer'} account. You agree to abide by {addForm.methodType === 'PAYPAL' ? "PayPal's" : addForm.methodType === 'WISE' ? "Wise's" : "Payoneer's"} terms and conditions for receiving business payments.</span>
                    </label>
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'provider' ? (
                  /* Step 2d.1: Crypto — "Connect Your Wallet" provider list (AC-09.01) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}><ChevronLeft className="size-4" /></IconButton>
                      <h3 className="text-base font-semibold text-dark-blue-400">Connect Your Wallet</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Select your preferred wallet to securely receive crypto payouts.</p>
                    {cryptoProvidersLoading ? (
                      <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                    ) : cryptoProviders.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-6">Provider list unavailable — please try again.</div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cryptoProviders.map((p: any) => {
                          const meta = CRYPTO_PROVIDER_META[p.provider]
                          return (
                            <div key={p.provider} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200">
                              <CryptoProviderIcon provider={p.provider} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-dark-blue-400">{p.displayName}</p>
                                <p className="text-xs text-gray-400">{meta?.tokensText ?? p.networks?.map((n: any) => n.network).join(', ')}</p>
                                {meta?.feeText && <p className="text-xs text-gray-400">{meta.feeText}</p>}
                              </div>
                              <Button
                                variant="outlined" visual="gray" size="sm"
                                onClick={() => {
                                  setCryptoForm({ provider: p.provider, network: p.defaultNetwork ?? p.networks?.[0]?.network ?? '', currency: p.defaultToken ?? p.networks?.[0]?.tokens?.[0] ?? '', address: '' })
                                  setCryptoWcSession(null); setCryptoWcConsent(false); setCryptoError('')
                                  setCryptoStep('details')
                                }}
                              >Connect</Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'details' ? (
                  /* Step 2d.2: Crypto — "Enter your wallet address" (AC-09.02/09.03/09.04).
                     WalletConnect-capable providers also offer the QR-scan and
                     paste-link presentations of the same session as alternatives. */
                  <div className="p-6 relative">
                    <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { setCryptoStep('provider'); setCryptoError('') }}><ChevronLeft className="size-4" /></IconButton>
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    <div className="flex flex-col items-center gap-2 -mt-6">
                      <CryptoProviderIcon provider={cryptoForm.provider} className="size-12" />
                      <h3 className="text-sm font-semibold text-dark-blue-400">{selectedCryptoProvider?.displayName ?? 'Crypto Wallet'}</h3>
                    </div>
                    <div className="space-y-3 mt-5">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Network</label>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          value={cryptoForm.network}
                          onChange={e => {
                            const network = e.target.value
                            const net = selectedCryptoProvider?.networks?.find((n: any) => n.network === network)
                            setCryptoForm(f => ({...f, network, currency: net?.tokens?.[0] ?? ''}))
                            setCryptoWcSession(null)
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
                        <label className="text-xs text-gray-500 mb-1 block">Enter your wallet address</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="0xF23C...9u5M" value={cryptoForm.address} onChange={e => { setCryptoForm(f => ({...f, address: e.target.value})); setCryptoError('') }} />
                        <p className="text-xs text-gray-400 mt-1">Your connection is private and secure. Wallet credentials are not stored or shared.</p>
                        {cryptoForm.address.length > 0 && cryptoForm.address.trim().length < 10 && (
                          <p className="text-xs text-red-500 mt-1">Enter a valid wallet address</p>
                        )}
                      </div>
                      {cryptoError && <p className="text-xs text-red-500">{cryptoError}</p>}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="filled" visual="gray" size="sm" className="flex-1 bg-gray-900 hover:bg-gray-800 text-white active:ring-4 active:ring-gray-300"
                        onClick={handleAddCryptoWallet}
                        disabled={cryptoSubmitting || cryptoForm.address.trim().length < 10 || !cryptoForm.network || !cryptoForm.currency}
                      >Connect Wallet</Button>
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setCryptoStep('provider')}>Cancel</Button>
                    </div>
                    {selectedCryptoProvider?.supportsWalletConnect && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold text-dark-blue-400 mb-2">Other ways to connect</p>
                        <div className="space-y-2">
                          <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700" onClick={() => setCryptoStep('qr')}>
                            <Search className="size-3.5" /> Scan QR code from your wallet App
                          </button>
                          <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700" onClick={() => setCryptoStep('paste')}>
                            <ExternalLink className="size-3.5" /> Paste connection link instead
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : addForm.methodType === 'CRYPTO' && (cryptoStep === 'qr' || cryptoStep === 'paste') ? (
                  /* Step 2d.3: WalletConnect — QR-scan and paste-link are two
                     presentations of the same session (PS-10). */
                  <div className="p-6 relative">
                    <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setCryptoStep('details')}><ChevronLeft className="size-4" /></IconButton>
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    <div className="-mt-6">
                      <h3 className="text-sm font-semibold text-dark-blue-400 flex items-center gap-1.5">
                        {cryptoStep === 'qr' ? 'Scan this code in your wallet app' : 'Paste Wallet connection link'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{cryptoStep === 'qr' ? 'Accept the connection request in your wallet' : `Paste the connection link generated for ${selectedCryptoProvider?.displayName ?? 'your wallet'}`}</p>
                    </div>
                    {!cryptoWcSession ? (
                      <div className="h-48 flex items-center justify-center">
                        <div className="size-8 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin" />
                      </div>
                    ) : cryptoStep === 'qr' ? (
                      <div className="flex justify-center py-6">
                        <QRCodeSVG value={cryptoWcSession.wcUri} size={180} />
                      </div>
                    ) : (
                      <div className="py-6">
                        <label className="text-xs text-gray-500 mb-1 block">Connection link</label>
                        <input readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono truncate" value={cryptoWcSession.wcUri} onClick={e => (e.target as HTMLInputElement).select()} />
                      </div>
                    )}
                    {cryptoWcSession && (
                      <div className="flex flex-col items-center gap-3">
                        <button
                          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                          onClick={() => { navigator.clipboard?.writeText(cryptoWcSession.wcUri); toast({ title: 'Copied', description: 'Wallet connection link copied to clipboard.' }) }}
                        >
                          <ExternalLink className="size-3.5" /> Copy wallet connection link
                        </button>
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<RefreshCcw01 className="size-4" />} onClick={() => setCryptoWcSession(null)}>Try Again</Button>
                      </div>
                    )}
                    <div className="mt-5">
                      <p className="text-xs font-semibold text-dark-blue-400 mb-2">Other ways to connect</p>
                      <div className="space-y-2">
                        <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700" onClick={() => setCryptoStep('details')}>
                          <Search className="size-3.5" /> Enter your wallet address
                        </button>
                        <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700" onClick={() => setCryptoStep(cryptoStep === 'qr' ? 'paste' : 'qr')}>
                          <ExternalLink className="size-3.5" /> {cryptoStep === 'qr' ? 'Paste connection link instead' : 'Scan QR code from your wallet App'}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer mt-4">
                      <input type="checkbox" className="mt-0.5 accent-primary-600" checked={cryptoWcConsent} onChange={e => setCryptoWcConsent(e.target.checked)} />
                      <span className="text-xs text-gray-400">By connecting your wallet, you authorize Marketeq to initiate payouts to your linked crypto wallet via WalletConnect. You acknowledge this authorization remains valid unless revoked.</span>
                    </label>
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'connecting' ? (
                  /* US-64: "Connecting to Wallet..." transitional screen. */
                  <div className="p-10 text-center">
                    <CryptoProviderIcon provider={cryptoForm.provider} className="size-12 mx-auto" />
                    <p className="text-sm font-semibold text-dark-blue-400 mt-2">{selectedCryptoProvider?.displayName ?? 'Crypto Wallet'}</p>
                    <div className="mx-auto mt-6 size-10 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin" />
                    <h3 className="text-base font-semibold text-dark-blue-400 mt-4">Connecting to Wallet...</h3>
                    <p className="text-xs text-gray-400 mt-1">We're verifying and connecting to your wallet. This may take up to 30 seconds.</p>
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'success' ? (
                  /* US-64: dedicated success screen with wallet address + current value. */
                  <div className="p-8 text-center relative">
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => { setShowAddMethod(false); setCryptoStep('provider'); setCryptoForm({ provider: '', network: '', currency: '', address: '' }); setCryptoResult(null) }}><X className="size-4" /></IconButton>
                    <div className="mx-auto size-10 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                      <Check className="size-5 text-primary-600" />
                    </div>
                    <h3 className="text-base font-semibold text-dark-blue-400">Wallet Connected Successfully</h3>
                    <div className="mt-5 rounded-lg border border-gray-200 flex divide-x divide-gray-200 text-left">
                      <div className="flex-1 px-4 py-3">
                        <p className="text-xs text-gray-400">Wallet Address</p>
                        <p className="text-sm font-semibold text-dark-blue-400 font-mono">••••{cryptoResult?.walletAddressLast6 ?? cryptoForm.address.slice(-6)}</p>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <p className="text-xs text-gray-400">Current Conversion Value</p>
                        <p className="text-sm font-semibold text-dark-blue-400">{cryptoResult?.conversionDisplay ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ) : addForm.methodType === 'CRYPTO' && cryptoStep === 'error' ? (
                  /* US-64: dedicated failure screen — retry same details, or pick a
                      different provider entirely, rather than a dead-end toast. */
                  <div className="p-8 text-center relative">
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    <div className="mx-auto size-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                      <AlertTriangle className="size-5 text-red-600" />
                    </div>
                    <h3 className="text-base font-semibold text-dark-blue-400">Wallet Connected Failed</h3>
                    <p className="mt-2 text-sm text-gray-500">{cryptoError || "We couldn't connect to your selected wallet. Please check your connection and try again."}</p>
                    <p className="mt-2 text-xs text-gray-400 italic">If the issue persists, consider selecting a different wallet provider.</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { setCryptoStep('provider'); setCryptoForm({ provider: '', network: '', currency: '', address: '' }); setCryptoWcSession(null); setCryptoError('') }}>
                        Pick Another Wallet
                      </button>
                      <Button variant="outlined" visual="gray" size="sm" leftIcon={<RefreshCcw01 className="size-4" />} onClick={() => { setCryptoWcSession(null); setCryptoError(''); setCryptoStep('details') }}>
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Set Default Confirmation Dialog (SCR-07). setDefault() in
              methods.service.ts only flips isDefault flags on deposit
              methods — it never touches payout_schedules.primaryMethodId
              (that's only ever set explicitly via PATCH /payouts/schedule),
              so changing the default does not disable split payout. */}
          {confirmSetDefault && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSetDefault(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-dark-blue-400 mb-1">Make this your default deposit method?</h3>
                <p className="text-sm text-gray-500 mb-5">This method will become your primary destination for all payouts, unless you have split payout enabled. Your existing default method will be replaced.</p>
                <div className="flex gap-2">
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setConfirmSetDefault(null)}>Cancel</Button>
                  <Button
                    variant="filled" visual="primary" size="sm" className="flex-1"
                    onClick={async () => { const id = confirmSetDefault.id; setConfirmSetDefault(null); await handleSetDefault(id) }}
                  >Yes, make default</Button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Method Confirmation Dialog (AC-11.01/11.02/11.03) */}
          {confirmRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !removing && setConfirmRemove(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-dark-blue-400 mb-1">Remove Deposit Method?</h3>
                <p className="text-sm text-gray-500 mb-4">Are you sure you want to remove this payout method? Once removed, funds will no longer be routed to this account.</p>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setEditingMethod(null); setEditBankSaveState(null) }}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                {editBankSaveState === 'success' ? (
                  /* Figma "Bank Details Updated" */
                  <div className="text-center py-4">
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => { setEditingMethod(null); setEditBankSaveState(null) }}><X className="size-4" /></IconButton>
                    <div className="mx-auto size-10 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                      <Check className="size-5 text-primary-600" />
                    </div>
                    <h3 className="text-base font-semibold text-dark-blue-400">Bank Details Updated</h3>
                    <p className="mt-2 text-sm text-gray-500">You updated your bank account information successfully.</p>
                    <p className="mt-1 text-xs text-gray-400">Changes may take up to 3 days to reflect.</p>
                  </div>
                ) : editBankSaveState === 'error' ? (
                  /* Figma "Unable To Update Bank Info" */
                  <div className="text-center py-4">
                    <IconButton size="sm" variant="ghost" visual="gray" className="absolute top-4 right-4" onClick={() => { setEditingMethod(null); setEditBankSaveState(null) }}><X className="size-4" /></IconButton>
                    <div className="mx-auto size-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                      <AlertTriangle className="size-5 text-red-600" />
                    </div>
                    <h3 className="text-base font-semibold text-dark-blue-400">Unable To Update Bank Info</h3>
                    <p className="mt-1 text-sm text-gray-500">Please check your details and try again.</p>
                    <div className="mt-4 text-left rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-dark-blue-400 mb-1.5">Please check that:</p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                        <li>All fields are filled correctly</li>
                        <li>Account and routing numbers follow the correct format</li>
                        <li>Bank codes like SWIFT, IBAN, or IFSC are valid</li>
                        <li>The country selected matches the format used</li>
                        <li>No special characters are used in bank name</li>
                      </ul>
                    </div>
                    {editBankError && <p className="mt-3 text-sm text-red-600">{editBankError}</p>}
                    <div className="flex gap-2 mt-5">
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => { setEditingMethod(null); setEditBankSaveState(null) }}>Cancel</Button>
                      <Button variant="filled" visual="primary" size="sm" className="flex-1" leftIcon={<RefreshCcw01 className="size-4" />} onClick={() => { setEditBankSaveState(null); setEditBankError('') }}>Retry</Button>
                    </div>
                  </div>
                ) : (
                <>
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

                  {/* US-59: bank details are re-entered fresh, never pre-filled — the
                      backend never returns raw account numbers back out (security). */}
                  {editingBankDetails ? (() => {
                    const editRegion = detectBankRegion(editBankForm.bankCountry)
                    return (
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        To correct your bank account details, re-enter them below. This restarts verification — two small deposits will arrive within 2 business days. Leave blank to keep your current (unverified) details.
                      </p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Country</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editBankForm.bankCountry} onChange={e => setEditBankForm(f => ({...f, bankCountry: e.target.value, bankAccountNumber: '', bankAccountNumberConfirm: '', bankRoutingNumber: '', bankSortCode: '', bankIfscCode: '', bankBsbNumber: '', bankInstitutionNumber: '', bankTransitNumber: '', bankIban: '', bankSwiftBic: '', bankCode: '', bankBranchCode: ''}))}>
                          <option value="US">🇺🇸 United States</option>
                          <option value="DE">🇪🇺 Europe</option>
                          <option value="IN">🇮🇳 India</option>
                          <option value="AU">🇦🇺 Australia</option>
                          <option value="GB">🇬🇧 United Kingdom</option>
                          <option value="JP">🇯🇵 Japan</option>
                          <option value="SG">🌏 Asia</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Bank of America" value={editBankForm.bankAccountName} onChange={e => setEditBankForm(f => ({...f, bankAccountName: e.target.value}))} />
                      </div>
                      {editRegion !== 'SEPA' && (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Up to 17 digits" value={editBankForm.bankAccountNumber} onChange={e => setEditBankForm(f => ({...f, bankAccountNumber: e.target.value}))} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Confirm Account Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Re-enter account number" value={editBankForm.bankAccountNumberConfirm} onChange={e => setEditBankForm(f => ({...f, bankAccountNumberConfirm: e.target.value}))} />
                            {editBankForm.bankAccountNumberConfirm.length > 0 && editBankForm.bankAccountNumberConfirm !== editBankForm.bankAccountNumber && (
                              <p className="text-xs text-red-500 mt-1">Account numbers don't match.</p>
                            )}
                          </div>
                        </>
                      )}
                      {editRegion === 'US' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Routing Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="9-digit ABA routing number" value={editBankForm.bankRoutingNumber} onChange={e => setEditBankForm(f => ({...f, bankRoutingNumber: e.target.value}))} />
                          {editBankForm.bankRoutingNumber.length > 0 && !isValidAbaRouting(editBankForm.bankRoutingNumber) && (
                            <p className="text-xs text-red-500 mt-1">Invalid routing number.</p>
                          )}
                        </div>
                      )}
                      {editRegion === 'GB' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Sort Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 12-34-56" value={editBankForm.bankSortCode} onChange={e => setEditBankForm(f => ({...f, bankSortCode: e.target.value}))} />
                          {editBankForm.bankSortCode.length > 0 && !isValidSortCode(editBankForm.bankSortCode) && (
                            <p className="text-xs text-red-500 mt-1">Sort code must be 6 digits.</p>
                          )}
                        </div>
                      )}
                      {editRegion === 'IN' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="e.g. HDFC0001234" value={editBankForm.bankIfscCode} onChange={e => setEditBankForm(f => ({...f, bankIfscCode: e.target.value}))} />
                          {editBankForm.bankIfscCode.length > 0 && !isValidIfsc(editBankForm.bankIfscCode) && (
                            <p className="text-xs text-red-500 mt-1">Invalid IFSC code.</p>
                          )}
                        </div>
                      )}
                      {editRegion === 'AU' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">BSB Number</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="6 digits, e.g. 123-456" value={editBankForm.bankBsbNumber} onChange={e => setEditBankForm(f => ({...f, bankBsbNumber: e.target.value}))} />
                          {editBankForm.bankBsbNumber.length > 0 && !isValidBsb(editBankForm.bankBsbNumber) && (
                            <p className="text-xs text-red-500 mt-1">BSB must be 6 digits.</p>
                          )}
                        </div>
                      )}
                      {editRegion === 'CA' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Institution Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="3 digits" value={editBankForm.bankInstitutionNumber} onChange={e => setEditBankForm(f => ({...f, bankInstitutionNumber: e.target.value}))} />
                            {editBankForm.bankInstitutionNumber.length > 0 && !isValidCaInstitution(editBankForm.bankInstitutionNumber) && (
                              <p className="text-xs text-red-500 mt-1">Must be 3 digits.</p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Transit Number</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="5 digits" value={editBankForm.bankTransitNumber} onChange={e => setEditBankForm(f => ({...f, bankTransitNumber: e.target.value}))} />
                            {editBankForm.bankTransitNumber.length > 0 && !isValidCaTransit(editBankForm.bankTransitNumber) && (
                              <p className="text-xs text-red-500 mt-1">Must be 5 digits.</p>
                            )}
                          </div>
                        </div>
                      )}
                      {editRegion === 'JP' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Bank Code</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="4 digits" value={editBankForm.bankCode} onChange={e => setEditBankForm(f => ({...f, bankCode: e.target.value}))} />
                            {editBankForm.bankCode.length > 0 && !isValidJpBankCode(editBankForm.bankCode) && <p className="text-xs text-red-500 mt-1">4 digits required.</p>}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Branch Code</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="3 digits" value={editBankForm.bankBranchCode} onChange={e => setEditBankForm(f => ({...f, bankBranchCode: e.target.value}))} />
                            {editBankForm.bankBranchCode.length > 0 && !isValidJpBranchCode(editBankForm.bankBranchCode) && <p className="text-xs text-red-500 mt-1">3 digits required.</p>}
                          </div>
                        </div>
                      )}
                      {editRegion === 'SEPA' && (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">IBAN</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="Enter your full IBAN (starts with country code, e.g., DE...)" value={editBankForm.bankIban} onChange={e => setEditBankForm(f => ({...f, bankIban: e.target.value}))} />
                            {editBankForm.bankIban.length > 0 && !isValidIban(editBankForm.bankIban) && <p className="text-xs text-red-500 mt-1">Invalid IBAN.</p>}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">SWIFT/BIC Number (optional)</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="Enter 8 or 11 character SWIFT/BIC Code" value={editBankForm.bankSwiftBic} onChange={e => setEditBankForm(f => ({...f, bankSwiftBic: e.target.value}))} />
                            {editBankForm.bankSwiftBic.length > 0 && !isValidSwiftBic(editBankForm.bankSwiftBic) && <p className="text-xs text-red-500 mt-1">Invalid SWIFT/BIC code.</p>}
                          </div>
                        </>
                      )}
                      {editRegion === 'SWIFT' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">SWIFT Code</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" placeholder="Enter 8 or 11 character SWIFT/BIC Code" value={editBankForm.bankSwiftBic} onChange={e => setEditBankForm(f => ({...f, bankSwiftBic: e.target.value}))} />
                          {editBankForm.bankSwiftBic.length > 0 && !isValidSwiftBic(editBankForm.bankSwiftBic) && <p className="text-xs text-red-500 mt-1">Invalid SWIFT/BIC code.</p>}
                        </div>
                      )}
                    </div>
                    )
                  })() : editingMethod.methodType === 'BANK_MANUAL' && editingMethod.verificationStatus === 'verified' ? (
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                      This account is verified and its bank details can't be changed here — remove it and add a new one instead.
                    </p>
                  ) : null}

                  {editBankError && <p className="text-sm text-red-600">{editBankError}</p>}
                </div>
                <div className="flex gap-2 mt-5">
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setEditingMethod(null)}>Cancel</Button>
                  <Button
                    variant="filled" visual="primary" size="sm" className="flex-1"
                    disabled={(() => {
                      if (!editingBankDetails) return false
                      const editRegion = detectBankRegion(editBankForm.bankCountry)
                      const touchedBankDetails = editBankForm.bankAccountNumber.trim().length > 0 || editBankForm.bankIban.trim().length > 0
                      if (!touchedBankDetails) return false
                      return (
                        !editBankForm.bankAccountName.trim() ||
                        (editRegion !== 'SEPA' && editBankForm.bankAccountNumberConfirm !== editBankForm.bankAccountNumber) ||
                        (editRegion === 'US' && !isValidAbaRouting(editBankForm.bankRoutingNumber)) ||
                        (editRegion === 'GB' && !isValidSortCode(editBankForm.bankSortCode)) ||
                        (editRegion === 'IN' && !isValidIfsc(editBankForm.bankIfscCode)) ||
                        (editRegion === 'AU' && !isValidBsb(editBankForm.bankBsbNumber)) ||
                        (editRegion === 'CA' && (!isValidCaInstitution(editBankForm.bankInstitutionNumber) || !isValidCaTransit(editBankForm.bankTransitNumber))) ||
                        (editRegion === 'JP' && (!isValidJpBankCode(editBankForm.bankCode) || !isValidJpBranchCode(editBankForm.bankBranchCode))) ||
                        (editRegion === 'SEPA' && !isValidIban(editBankForm.bankIban)) ||
                        (editRegion === 'SWIFT' && !isValidSwiftBic(editBankForm.bankSwiftBic))
                      )
                    })()}
                    onClick={handleUpdateMethod}
                  >
                    Save Changes
                  </Button>
                </div>
                </>
                )}
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
                  <p>Earnings currently eligible for manual withdrawal. {reserveUsd > 0 ? `This amount excludes your $${reserveUsd.toFixed(2)} reserve balance and any pending transactions.` : "This amount excludes any pending transactions."} You can update these preferences under <button type="button" className="text-primary-600 underline hover:text-primary-700" onClick={() => onEditPayoutSchedule?.()}>Payout Settings</button>.</p>
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
              {/* US-99: takes the contractor straight to Help & Support (billing
                  section expanded by default) rather than a toast that dead-ends. */}
              <button
                className="text-sm text-primary-600 underline"
                onClick={() => onOpenHelp?.()}
              >
                How does billing work?
              </button>
            </div>
          ) : (() => {
            // reserveUsd is in USD (payout-service's schedule) while
            // availableBalanceDisplay may be FX-converted — apply the same
            // implicit rate the backend already computed rather than mixing
            // currencies.
            const grossUsd = balance ? parseFloat(balance.availableBalance) : 0
            const grossDisplay = balance ? parseFloat(balance.availableBalanceDisplay) : 0
            const rate = grossUsd > 0 ? grossDisplay / grossUsd : 1
            const netDisplay = balance ? Math.max(0, grossDisplay - reserveUsd * rate) : 0
            return (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-3xl font-bold text-dark-blue-400">
                  <span className="text-base align-top">{currencySymbol(balance?.displayCurrency || "USD")}</span>{balance ? formatWholeAmount(netDisplay) : "..."}
                  {/* US-08: never conditionally hidden, even though the balance
                      might look "off" from what the contractor expects. */}
                  {balance?.stale && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-0.5 text-lg text-amber-500 cursor-help align-super">*</span>
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          <p>Exchange rate may be delayed.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </p>
              </div>
              {/* ES-06 EC-13: currency is now resolved from the talent's saved
                  preference (or USD fallback) rather than hardcoded — this
                  prompt only shows when the backend actually reports a
                  fallback (no preference saved / region service unreachable). */}
              {balance?.currencyFallback && (
                <CurrencySettingsPrompt onSaved={loadBalance} />
              )}
              {/* US-07: secondary local-currency amount, shown only when it
                  actually differs from the display currency. */}
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
                const withdrawableUsd = balance ? netDisplay : null
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
            )
          })()}
        </div>

        {/* Recent Activity — derived from real payout history (no dedicated
            activity-feed endpoint exists in payout-service; see toActivityItem). */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-dark-blue-400 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivityLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)
            ) : recentActivityError ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-600">We couldn't load your recent activity.</p>
                <button className="text-sm text-primary-600 underline mt-1" onClick={loadRecentActivity}>Retry</button>
              </div>
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
  ERR_SCHEDULE_END_DATE_BEFORE_START: "End date must be after start date.",
}

// F-13 Help & Support Tab (US-95–99). Facts below are pulled from the actual
// backend constants rather than invented: 20% default platform fee (see
// earnings.service.ts getRecentFeePercent fallback), 5-business-day
// first-payout KYC hold (kyc-gate.service.ts), $600 USD annual tax
// threshold (transaction-created.consumer.ts / earnings.service.ts).
export const HelpSupportDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg p-0 gap-0">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <DialogTitle className="text-base font-semibold text-dark-blue-400">Help & Support</DialogTitle>
        <DialogClose asChild>
          <IconButton size="sm" variant="ghost" visual="gray"><X className="size-4" /></IconButton>
        </DialogClose>
      </div>
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        <Accordion type="multiple" className="space-y-3" defaultValue={["billing"]}>
          {/* US-95 */}
          <AccordionItem className="rounded-lg border border-gray-200" value="billing">
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">How does billing work?</span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Marketeq deducts a service fee — 20% by default — from each confirmed work session before it's added to your available balance. Your gross earnings (time logged × your rate) minus this fee equals your net balance. The exact fee percent for each entry is shown in that entry's Fee Breakdown.
            </DisclosureContent>
          </AccordionItem>

          {/* US-96 */}
          <AccordionItem className="rounded-lg border border-gray-200" value="kyc">
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">Why is my first payout on hold?</span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              For your security, your first withdrawal from Marketeq is held for 5 business days before being released. This is a one-time step — after your first successful payout, future withdrawals are not subject to this hold.
            </DisclosureContent>
          </AccordionItem>

          {/* US-97 */}
          <AccordionItem className="rounded-lg border border-gray-200" value="fx">
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">How are exchange rates applied?</span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Your contract rate is locked in the currency it was created in — that locked amount is what you're actually paid. Your display currency is for reference only, converted at a live rate each time you view it, so amounts shown may differ slightly from what was billed.
            </DisclosureContent>
          </AccordionItem>

          {/* US-98 */}
          <AccordionItem className="rounded-lg border border-gray-200" value="tax">
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">What are my tax reporting obligations?</span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Once your earnings on Marketeq reach $600 USD in a calendar year, we're required to collect a completed W-9 (U.S. contractors) or W-8BEN (non-U.S. contractors) from you for tax reporting purposes. We'll notify you when you approach this threshold so you can prepare.
            </DisclosureContent>
          </AccordionItem>
        </Accordion>
        <p className="text-xs text-gray-400 mt-4">
          Still have questions? Contact us at <a href="mailto:support@marketeqdigital.com" className="text-primary-600 underline">support@marketeqdigital.com</a>.
        </p>
      </div>
    </DialogContent>
  </Dialog>
)

// Split-payout row icon (Figma). A smaller, local counterpart to
// OverviewTab's getMethodIcon — that one isn't reachable from here since
// it's a closure inside a different component.
const renderScheduleMethodIcon = (m: any) => {
  if (m.methodType === "PAYPAL") return <PaypalIcon className="size-5" />
  if (m.methodType === "WISE") return <WiseIcon className="size-5" />
  if (m.methodType === "PAYONEER") return <PayoneerIcon className="size-5" />
  if (m.methodType === "CRYPTO") return <CryptoProviderIcon provider={m.cryptoProvider} className="size-5" />
  return <BankLogo bankName={m.nickname || ""} size={20} />
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
  // Figma "Repeat Every [N] [Days/Weeks/Months]" — customIntervalDays is the
  // only column the backend stores, so weeks/months are converted to days
  // before saving (weeks*7, months*30) and back when hydrating from a saved
  // schedule. customIntervalCount is the number shown in the unit the user
  // picked, not the raw day count.
  const [customIntervalUnit, setCustomIntervalUnit] = useState<'days' | 'weeks' | 'months'>('days')
  const [customIntervalCount, setCustomIntervalCount] = useState(7)
  // US-72: optional window for a custom schedule, e.g. pause payouts during
  // a planned absence without disabling the schedule outright. yyyy-mm-dd
  // strings for <input type="date">; empty string = unset. Figma gates the
  // end date behind a "Stop Deposits On" toggle rather than showing it bare.
  const [scheduleStartDate, setScheduleStartDate] = useState("")
  const [scheduleEndDate, setScheduleEndDate] = useState("")
  const [stopDepositsEnabled, setStopDepositsEnabled] = useState(false)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string | null>(null)

  // Minimum payout + reserve. Figma shows preset buttons ($25/$50/$100/$150/
  // $250) plus a Custom amount input, not a plain on/off toggle — backend
  // (schedule.service.ts) enforces 0 <= reserveUsd <= 250 regardless of
  // which UI sets it, so presets are fully within that range already.
  const [thresholdUsd, setThresholdUsd] = useState("50")
  const [reserveUsd, setReserveUsd] = useState("0")
  const RESERVE_PRESETS = [25, 50, 100, 150, 250]
  const [reserveCustomOpen, setReserveCustomOpen] = useState(false)
  const [reserveCustomValue, setReserveCustomValue] = useState("")

  // Split payout — Figma's "Auto Split" toggle switches between a fixed
  // 50/50 default and manual per-side percent entry; there's no backend
  // auto-balance algorithm (primarySplitPercent is the only stored value,
  // secondarySplitPercent is just its complement), so "auto" just means
  // "keep it at 50/50 and don't let the user type a number".
  const [autoSplit, setAutoSplit] = useState(true)

  // Authorization
  const [authorized, setAuthorized] = useState(false)

  const selectedDayFull = DAYS_OF_WEEK[dayOfWeek]?.fullName ?? "Monday"

  const getScheduleLabel = () => {
    if (frequency === "weekly") return `Weekly (every ${selectedDayFull})`
    if (frequency === "bi_weekly") return `Bi-Weekly (every other ${selectedDayFull})`
    if (frequency === "monthly") return `Monthly (on the ${dayOfMonth}${dayOfMonth === 1 ? "st" : dayOfMonth === 2 ? "nd" : dayOfMonth === 3 ? "rd" : "th"})`
    if (frequency === "daily") return "Daily (every day)"
    if (frequency === "custom") return `Every ${customIntervalCount} ${customIntervalUnit}${customIntervalCount === 1 ? customIntervalUnit.slice(0, -1) : customIntervalUnit}`
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
        setAutoSplit((s.primarySplitPercent ?? 50) === 50)
        setInitial({ splitEnabled: !!s.splitEnabled, secondaryMethodId: s.secondaryMethod?.id ?? "", primarySplitPercent: s.primarySplitPercent ?? 50 })
        setIsActive(s.isActive ?? true)
        setFrequency(s.frequency ?? "weekly")
        setDayOfWeek(s.dayOfWeek ?? 1)
        setDayOfMonth(s.dayOfMonth ?? 1)
        const loadedIntervalDays = s.customIntervalDays ?? 7
        if (loadedIntervalDays >= 30 && loadedIntervalDays % 30 === 0) {
          setCustomIntervalUnit("months"); setCustomIntervalCount(loadedIntervalDays / 30)
        } else if (loadedIntervalDays % 7 === 0) {
          setCustomIntervalUnit("weeks"); setCustomIntervalCount(loadedIntervalDays / 7)
        } else {
          setCustomIntervalUnit("days"); setCustomIntervalCount(loadedIntervalDays)
        }
        setScheduleStartDate(s.startDate ? s.startDate.slice(0, 10) : "")
        setScheduleEndDate(s.endDate ? s.endDate.slice(0, 10) : "")
        setStopDepositsEnabled(!!s.endDate)
        setThresholdUsd(s.thresholdUsd ? String(Math.round(parseFloat(s.thresholdUsd))) : "50")
        const loadedReserve = s.reserveUsd ? Math.round(parseFloat(s.reserveUsd)) : 0
        setReserveUsd(String(loadedReserve))
        if (loadedReserve > 0 && !RESERVE_PRESETS.includes(loadedReserve)) {
          setReserveCustomOpen(true); setReserveCustomValue(String(loadedReserve))
        } else {
          setReserveCustomOpen(false); setReserveCustomValue("")
        }
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
      if (frequency === "custom") {
        // customIntervalDays is the only interval column the backend stores —
        // weeks/months are converted to days before saving (weeks*7, months*30).
        const unitMultiplier = customIntervalUnit === "months" ? 30 : customIntervalUnit === "weeks" ? 7 : 1
        schedulePayload.customIntervalDays = customIntervalCount * unitMultiplier
        schedulePayload.dayOfWeek = dayOfWeek
        // Explicit null (not omitted) clears a previously-set date server-side.
        schedulePayload.startDate = scheduleStartDate ? new Date(scheduleStartDate).toISOString() : null
        schedulePayload.endDate = stopDepositsEnabled && scheduleEndDate ? new Date(scheduleEndDate).toISOString() : null
      }

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
      // Figma: split on/off gets its own specific toast naming the actual
      // methods/percentages involved, not the generic schedule-updated one.
      if (splitEnabled && !initial.splitEnabled) {
        const primaryLabel = methods.find((m) => m.id === primaryMethodId)?.displayLabel ?? methods.find((m) => m.id === primaryMethodId)?.nickname ?? "your primary method"
        const secondaryLabel = methods.find((m) => m.id === secondaryMethodId)?.displayLabel ?? methods.find((m) => m.id === secondaryMethodId)?.nickname ?? "your secondary method"
        const secondaryPct = Math.round((100 - primarySplitPercent) * 100) / 100
        toast({ title: "Split Deposits activated.", description: `Funds will be distributed: ${primarySplitPercent}% to ${primaryLabel}, ${secondaryPct}% to ${secondaryLabel}.` })
      } else if (!splitEnabled && initial.splitEnabled) {
        const defaultLabel = methods.find((m) => m.id === primaryMethodId)?.displayLabel ?? methods.find((m) => m.id === primaryMethodId)?.nickname ?? "your default method"
        toast({ title: "Split Deposits turned off.", description: `You turned off split Deposits. All deposits will go to your default method: ${defaultLabel}.` })
      } else {
        toast({ title: "Payout schedule updated", description: getScheduleLabel() })
      }
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

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Auto Split</span>
                        <Switch
                          checked={autoSplit}
                          onCheckedChange={(c) => { setAutoSplit(c as boolean); if (c) setPrimarySplitPercent(50) }}
                          size="sm"
                        />
                      </div>

                      {/* Per-method rows (Figma): icon + name + percent + remove.
                          Removing either side has the same effect — there's no
                          backend concept of a 2-method split with one side gone —
                          so both route through the existing disable-split confirm. */}
                      {[
                        { m: methods.find((mm) => mm.id === primaryMethodId), pct: primarySplitPercent, isPrimary: true },
                        { m: methods.find((mm) => mm.id === secondaryMethodId), pct: Math.round((100 - primarySplitPercent) * 100) / 100, isPrimary: false },
                      ].map(({ m, pct, isPrimary }, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                          <span className="shrink-0">{m ? renderScheduleMethodIcon(m) : <BankIcon className="size-5 text-gray-400" />}</span>
                          <span className="flex-1 min-w-0 text-sm font-medium text-dark-blue-400 truncate">{m ? (m.nickname || m.displayLabel || m.methodType) : (isPrimary ? "Select a payout method" : "Select a secondary method")}</span>
                          <Input
                            type="number" min={0} max={100}
                            className="w-16 text-right"
                            disabled={autoSplit || !isPrimary}
                            value={pct}
                            // AC-23.03/23.04: accept the raw value (including 0/100) so the
                            // inline error below can actually be seen — clamping silently
                            // would make those values impossible to type in the first place.
                            onChange={(e) => setPrimarySplitPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          />
                          <span className="text-sm text-gray-400">%</span>
                          <IconButton size="sm" variant="ghost" visual="gray" onClick={() => { if (initial.splitEnabled) { setConfirmDisableSplit(true) } else { setSplitEnabled(false) } }}><Trash01 className="size-4" /></IconButton>
                        </div>
                      ))}
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
                    <>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Start Deposits On</label>
                        <Input type="date" value={scheduleStartDate} onChange={(e) => setScheduleStartDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Repeat Every</label>
                          <Input
                            type="number" min={1} max={customIntervalUnit === "days" ? 365 : customIntervalUnit === "weeks" ? 52 : 12}
                            value={customIntervalCount}
                            onChange={(e) => setCustomIntervalCount(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">&nbsp;</label>
                          <Select value={customIntervalUnit} onValueChange={(v) => setCustomIntervalUnit(v as 'days' | 'weeks' | 'months')}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* US-72: optional window — e.g. pause payouts during a
                          planned absence without disabling the schedule outright. */}
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <label className="text-sm font-semibold text-dark-blue-400">Stop Deposits On <span className="font-normal text-gray-400">(optional)</span></label>
                          <p className="text-xs text-gray-500 mt-0.5">Select a date when you want deposits to stop.</p>
                        </div>
                        <Switch checked={stopDepositsEnabled} onCheckedChange={(c) => setStopDepositsEnabled(c as boolean)} size="sm" />
                      </div>
                      {stopDepositsEnabled && (
                        <Input type="date" value={scheduleEndDate} onChange={(e) => setScheduleEndDate(e.target.value)} />
                      )}
                      {stopDepositsEnabled && scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
                        <p className="text-xs text-red-500">Stop date must be after the start date.</p>
                      )}
                    </>
                  )}
                </div>

                {/* ── Select Deposit Day ── */}
                {(frequency === "weekly" || frequency === "bi_weekly" || frequency === "custom") && (
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

                {/* ── Reserve Balance ── Figma: preset amount buttons + Custom,
                    gated behind an on/off toggle. schedule.service.ts enforces
                    0 <= reserveUsd <= 250 regardless of which button set it. */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-sm font-semibold text-dark-blue-400">Reserve Balance <span className="font-normal text-gray-400">(optional)</span></label>
                      <p className="text-xs text-gray-500 mt-0.5">Keep up to $250 in your account after each payout to automatically cover subscription or platform fees without disruption.</p>
                    </div>
                    <Switch
                      checked={Number(reserveUsd) > 0}
                      onCheckedChange={(c) => {
                        if (c) { setReserveUsd(String(RESERVE_PRESETS[0])) }
                        else { setReserveUsd("0"); setReserveCustomOpen(false); setReserveCustomValue("") }
                      }}
                      size="sm"
                    />
                  </div>
                  {Number(reserveUsd) > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {RESERVE_PRESETS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm font-medium text-center",
                              !reserveCustomOpen && Number(reserveUsd) === amt
                                ? "border-primary-500 text-primary-600 bg-primary-25"
                                : "border-gray-200 text-dark-blue-400 hover:border-primary-300"
                            )}
                            onClick={() => { setReserveUsd(String(amt)); setReserveCustomOpen(false); setReserveCustomValue("") }}
                          >Reserve ${amt}</button>
                        ))}
                        <button
                          type="button"
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-medium text-center",
                            reserveCustomOpen ? "border-primary-500 text-primary-600 bg-primary-25" : "border-gray-200 text-dark-blue-400 hover:border-primary-300"
                          )}
                          onClick={() => { setReserveCustomOpen(true); setReserveCustomValue(RESERVE_PRESETS.includes(Number(reserveUsd)) ? "" : reserveUsd) }}
                        >Custom</button>
                      </div>
                      {reserveCustomOpen && (
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                            <Input
                              type="number" min={1} max={249} placeholder="Enter custom amount" className="pl-6"
                              value={reserveCustomValue}
                              onChange={(e) => {
                                const v = e.target.value
                                setReserveCustomValue(v)
                                const n = parseInt(v)
                                if (!isNaN(n)) setReserveUsd(String(Math.max(0, Math.min(249, n))))
                              }}
                            />
                          </div>
                          <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { setReserveCustomOpen(false); setReserveCustomValue(""); setReserveUsd(String(RESERVE_PRESETS[0])) }}>Cancel</button>
                        </div>
                      )}
                      {reserveCustomOpen && <p className="text-xs text-gray-400">Custom amount needs to be under $250.</p>}
                    </div>
                  )}
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
            disabled={!authorized || saving || loading || methods.length === 0 || (splitEnabled && (primarySplitPercent <= 0 || primarySplitPercent >= 100)) || (frequency === "custom" && stopDepositsEnabled && !!scheduleStartDate && !!scheduleEndDate && scheduleEndDate <= scheduleStartDate)}
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
  const amount = parseFloat(p.amountUsd).toFixed(2)
  switch (p.status) {
    case "completed":
      return { id: p.id, title: "Payout Completed", description: `$${amount} to ${method}`, time, kind: "sent" as const }
    case "processing":
      return { id: p.id, title: "Payout Processing", description: `$${amount} to ${method}`, time, kind: "processing" as const }
    case "queued":
      return { id: p.id, title: "Payout Queued", description: `$${amount} to ${method}`, time, kind: "processing" as const }
    case "failed":
      return { id: p.id, title: "Payout Failed", description: `$${amount} to ${method}`, time, kind: "failed" as const }
    case "cancelled":
      return { id: p.id, title: "Payout Cancelled", description: `$${amount} to ${method}`, time, kind: "cancelled" as const }
    default:
      return { id: p.id, title: "Payout Scheduled", description: `$${amount} to ${method}`, time, kind: "scheduled" as const }
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

// US-28: numbered pagination with ellipsis — always shows first/last page,
// a window of 1 around the current page, and collapses long gaps to "…".
function getPaginationItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | "ellipsis")[] = [1]
  if (current > 3) items.push("ellipsis")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) items.push(p)
  if (current < total - 2) items.push("ellipsis")
  items.push(total)
  return items
}

// US-23: chip labels must match the dateRange <SelectItem> copy verbatim.
const EARNINGS_DATE_RANGE_LABELS: Record<string, string> = {
  all_time: "All Time",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
}

export interface EarningsFilters {
  dateRange: string
  entryType: string
  statusFilter: string
  search: string
}

export const EarningsTab = ({ onFiltersChange }: { onFiltersChange?: (filters: EarningsFilters) => void } = {}) => {
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
  // US-24.02 QA spec: default/reset date range is "this_month", not "all_time".
  const [dateRange, setDateRange] = React.useState("this_month")
  const [entryType, setEntryType] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")

  // US-27 Fee Breakdown Expander: per-row chevron toggle. feeBreakdown is only
  // meaningful for single-entry (daily view) rows — weekly/monthly rows are
  // aggregated totals across multiple entries with no single fee attribution.
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const toggleRowExpanded = React.useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // US-30 (F-05 Entry Detail Drawer), opened from history rows here too — a
  // second, self-contained instance mirroring OverviewTab's, since the two
  // tabs are separate components with no shared state/context to lift into.
  const [detailEntryId, setDetailEntryId] = React.useState<string | null>(null)
  const [detailData, setDetailData] = React.useState<EarningDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailError, setDetailError] = React.useState<"not-found" | "error" | null>(null)

  const openEntryDetail = React.useCallback((id: string) => {
    setDetailEntryId(id)
    setDetailData(null)
    setDetailError(null)
    setDetailLoading(true)
    getEarningDetail(id)
      .then(setDetailData)
      .catch((e) => setDetailError(e?.response?.status === 404 ? "not-found" : "error"))
      .finally(() => setDetailLoading(false))
  }, [])

  const closeEntryDetail = React.useCallback(() => {
    setDetailEntryId(null)
    setDetailData(null)
    setDetailError(null)
  }, [])

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

  // US-23/US-24: chips + Clear All. dateRange excluded — "this_month" is the
  // default and isn't a contractor-applied filter to display as a chip.
  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [
    ...(dateRange !== "this_month" ? [{ key: "dateRange", label: EARNINGS_DATE_RANGE_LABELS[dateRange] ?? dateRange, onRemove: () => { setDateRange("this_month"); setCurrentPage(1) } }] : []),
    ...(entryType ? [{ key: "entryType", label: entryType === "manual" ? "Manual" : "Automated", onRemove: () => { setEntryType(""); setCurrentPage(1) } }] : []),
    ...(statusFilter ? [{ key: "statusFilter", label: statusFilter === "paid" ? "Paid" : "Reversed", onRemove: () => { setStatusFilter(""); setCurrentPage(1) } }] : []),
  ]
  const hasActiveFilters = activeFilterChips.length > 0
  const clearAllFilters = React.useCallback(() => {
    setDateRange("this_month")
    setEntryType("")
    setStatusFilter("")
    setCurrentPage(1)
  }, [])

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
          amount={earningsSummary ? formatWholeAmount(earningsSummary.today.amount) : "—"}
          symbol={currencySymbol(earningsSummary?.today.displayCurrency || "USD")}
          negative={!!earningsSummary && amountSign(earningsSummary.today.amount) === "-"}
          extra={earningsSummary ? earningsSummary.today.hoursLabel + " Logged" : earningsSummaryError ? "Unavailable" : "Loading..."}
          change={earningsSummary?.today.changePercent != null ? { value: Math.abs(earningsSummary.today.changePercent) + "%", direction: earningsSummary.today.changeDirection === "up" ? "up" : "down", label: earningsSummary.today.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Week"
          amount={earningsSummary ? formatWholeAmount(earningsSummary.thisWeek.amount) : "—"}
          symbol={currencySymbol(earningsSummary?.thisWeek.displayCurrency || "USD")}
          negative={!!earningsSummary && amountSign(earningsSummary.thisWeek.amount) === "-"}
          extra={earningsSummary ? earningsSummary.thisWeek.hoursLabel + " Logged" : earningsSummaryError ? "Unavailable" : "Loading..."}
          change={earningsSummary?.thisWeek.changePercent != null ? { value: Math.abs(earningsSummary.thisWeek.changePercent) + "%", direction: earningsSummary.thisWeek.changeDirection === "up" ? "up" : "down", label: earningsSummary.thisWeek.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Month"
          amount={earningsSummary ? formatWholeAmount(earningsSummary.thisMonth.amount) : "—"}
          symbol={currencySymbol(earningsSummary?.thisMonth.displayCurrency || "USD")}
          negative={!!earningsSummary && amountSign(earningsSummary.thisMonth.amount) === "-"}
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
            // US-29: pagination resets whenever the result set underneath it changes.
            if (details.value.length > 0) { setViewMode(details.value[0]); setCurrentPage(1) }
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            />
          </SearchField>
        </div>
      </div>

      {/* US-23/US-24: active filter chips + Clear All */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-25 px-3 py-1 text-xs font-medium text-dark-blue-400 hover:bg-gray-50"
            >
              {chip.label}
              <X className="size-3 text-gray-400" />
            </button>
          ))}
          <button onClick={clearAllFilters} className="text-xs font-medium text-primary-600 hover:underline">
            Clear All
          </button>
        </div>
      )}

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
              {viewMode === "daily" && <TableHead className="w-8"></TableHead>}
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
            ) : earningsResult?.data.length === 0 && searchQuery.length >= 2 ? (
              /* Figma: a dedicated, prominent empty state for a zero-result
                 search — distinct from the plain filtered-empty row, and
                 its "Clear Search" only clears the search term, not the
                 other active filters. */
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <p className="text-sm font-semibold text-dark-blue-400">0 Results for &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-gray-400 mt-1">We couldn&apos;t find any results for your search. Try adjusting your keywords or clearing your search.</p>
                  <Button variant="outlined" visual="gray" size="sm" className="mt-4" onClick={() => { setSearchQuery(""); setCurrentPage(1) }}>Clear Search</Button>
                </TableCell>
              </TableRow>
            ) : earningsResult?.data.length === 0 ? (
              <TableRow>
                {/* US-25: filtered-empty vs no-data-at-all are visually distinct —
                    the filtered case keeps a Clear All CTA, the no-data case doesn't
                    imply anything is filterable. hasActiveFilters is defined below. */}
                <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">
                  {hasActiveFilters ? (
                    <>
                      No earnings match your current filters.
                      <button className="text-primary-600 underline ml-1" onClick={clearAllFilters}>Clear All</button>
                    </>
                  ) : (
                    "No earnings found for this period."
                  )}
                </TableCell>
              </TableRow>
            ) : earningsResult?.data.map((row) => (
              <React.Fragment key={row.id}>
              <TableRow className="cursor-pointer hover:bg-gray-25" onClick={() => openEntryDetail(row.id)}>
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
                    {(() => {
                      const rowAmount = viewMode === "weekly" ? row.weeklyEarnings : viewMode === "monthly" ? row.totalEarnings : (row.netAmountDisplay ?? row.netAmount)
                      return (
                        <span className="text-sm text-gray-500">{amountSign(rowAmount)}{currencySymbol(row.displayCurrency || "USD")}{formatWholeAmount(rowAmount)}</span>
                      )
                    })()}
                    {row.status === "paid" && <Badge visual="success" size="sm">Paid</Badge>}
                    {row.status === "confirmed" && <Badge visual="primary" size="sm">Confirmed</Badge>}
                    {row.status === "failed" && <Badge visual="error" size="sm">Reversed</Badge>}
                  </div>
                </TableCell>
                {viewMode === "weekly" && <TableCell className="text-sm text-gray-500">{row.budget ?? "—"}</TableCell>}
                {viewMode === "daily" && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {row.feeBreakdown && (
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => toggleRowExpanded(row.id)}>
                        <ChevronDown className={cn("size-4 transition-transform", expandedRows.has(row.id) && "rotate-180")} />
                      </IconButton>
                    )}
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {row.entryType === "manual" && <Badge visual="warning" size="sm">Manual</Badge>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton size="sm" variant="ghost" visual="gray">
                          <MoreHorizontal className="size-4" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEntryDetail(row.id)}>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
              {/* US-27: a sibling row directly below the entry, not a height
                  change on the entry row itself, so multiple rows can be
                  expanded independently without shifting each other's layout. */}
              {viewMode === "daily" && row.feeBreakdown && expandedRows.has(row.id) && (
                <TableRow className="bg-gray-25">
                  <TableCell colSpan={7} className="py-3">
                    <div className="flex items-center gap-8 pl-4">
                      <div>
                        <p className="text-xs text-gray-400">Gross</p>
                        <p className="text-sm font-medium text-dark-blue-400">{currencySymbol(row.feeBreakdown.displayCurrency || "USD")}{row.feeBreakdown.grossAmountDisplay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{row.feeBreakdown.feeLabel}</p>
                        <p className="text-sm font-medium text-dark-blue-400">-{currencySymbol(row.feeBreakdown.displayCurrency || "USD")}{row.feeBreakdown.feeAmountDisplay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">You Receive</p>
                        <p className="text-sm font-semibold text-dark-blue-400">{currencySymbol(row.displayCurrency || "USD")}{row.netAmountDisplay ?? row.netAmount}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
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

          {/* US-28: numbered pagination with ellipsis, replacing the prior
              prev/next-only control. */}
          <div className="flex items-center gap-1">
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            {getPaginationItems(currentPage, earningsResult?.totalPages ?? 1).map((item, i) =>
              item === "ellipsis" ? (
                <span key={`e-${i}`} className="size-8 flex items-center justify-center text-sm text-gray-400">…</span>
              ) : (
                <button
                  key={item}
                  className={cn(
                    "size-8 rounded-md text-sm font-medium flex items-center justify-center",
                    item === currentPage ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-100"
                  )}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}
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

      {/* F-05 Entry Detail Drawer — second, self-contained instance mirroring
          OverviewTab's (US-30), since the two tabs are separate components
          with no shared state/context to lift into. */}
      <Dialog open={!!detailEntryId} onOpenChange={(open) => { if (!open) closeEntryDetail() }}>
        <DialogContent
          variant="unanimated"
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-xl overflow-y-auto p-0 gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 sticky top-0 bg-white z-10">
            <DialogTitle className="text-base font-semibold text-dark-blue-400">Entry Details</DialogTitle>
            <DialogClose asChild>
              <IconButton size="sm" variant="ghost" visual="gray"><X className="size-4" /></IconButton>
            </DialogClose>
          </div>

          {detailLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : detailError === "not-found" ? (
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-500">This entry could not be found.</p>
              <DialogClose asChild>
                <Button variant="outlined" visual="gray" size="sm">Close</Button>
              </DialogClose>
            </div>
          ) : detailError === "error" ? (
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-red-600">We couldn't load this entry. Please try again.</p>
              <Button variant="outlined" visual="gray" size="sm" onClick={() => detailEntryId && openEntryDetail(detailEntryId)}>Retry</Button>
            </div>
          ) : detailData ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-dark-blue-400">
                  {new Date(detailData.workStartAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <div className="flex items-center gap-2">
                  <Badge visual={detailData.entryType === "automated" ? "primary" : "warning"} size="sm">
                    {detailData.entryType === "automated" ? "Automated" : "Manual"}
                  </Badge>
                  <Badge visual={detailData.status === "paid" ? "success" : detailData.status === "failed" ? "error" : "primary"} size="sm">
                    {detailData.status === "paid" ? "Paid" : detailData.status === "failed" ? "Reversed" : "Confirmed"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-dark-blue-400">{detailData.project?.name ?? "Untitled project"}</p>
                {detailData.project?.clientName && <p className="text-xs text-gray-400">{detailData.project.clientName}</p>}
                {detailData.contract?.title && <p className="text-xs text-gray-400 mt-0.5">{detailData.contract.title}</p>}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Block</p>
                <p className="text-sm text-dark-blue-400">
                  {new Date(detailData.workStartAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {" – "}
                  {new Date(detailData.workEndAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="text-xs text-gray-500">{detailData.durationLabel}</p>
              </div>

              {detailData.entryType === "automated" && (detailData.avgKeyboardPct != null || detailData.avgMousePct != null) && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</p>
                  <div className="flex gap-4 text-sm text-dark-blue-400">
                    {detailData.avgKeyboardPct != null && <span>⌨ {detailData.avgKeyboardPct}% keyboard</span>}
                    {detailData.avgMousePct != null && <span>🖱 {detailData.avgMousePct}% mouse</span>}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fee Breakdown</p>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {detailData.feeSection.lineItems.map((item, i) => (
                    <div key={i} className={cn("flex items-center justify-between px-4 py-2.5", item.isTotal && "bg-gray-25")}>
                      <span className={cn("text-sm", item.isTotal ? "font-semibold text-dark-blue-400" : "text-gray-500")}>{item.label}</span>
                      <span className={cn("text-sm", item.isTotal ? "font-semibold text-dark-blue-400" : "text-gray-500")}>{item.amount} {item.currency}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exchange Rate</p>
                <p className="text-sm text-gray-500">
                  {detailData.feeSection.fxRateLabel}
                  {detailData.feeSection.billingCurrency !== detailData.feeSection.displayCurrency && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-amber-500 cursor-help align-super">*</span>
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          <p>This entry was billed in {detailData.feeSection.billingCurrency}. Amounts shown in {detailData.feeSection.displayCurrency} use a live rate that may differ slightly from the rate locked at the time this entry was logged.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
  const router = useRouter()
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
              ["Amount", `$${parseFloat(detail.amountUsd).toFixed(2)} ${detail.currency}`],
              ["Fee", `$${parseFloat(detail.feeUsd).toFixed(2)}`],
              ["Net Transfer", `$${parseFloat(detail.netAmountUsd).toFixed(2)}`],
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
            {/* US-50: a specific failed state with next steps, not just a status
                badge — payout.service.ts's own cancel() error explicitly tells
                contractors to "start a new request" for a failed payout (there's
                no resume-same-payout endpoint), so Retry starts a fresh
                withdrawal rather than attempting to resurrect this one. */}
            {detail.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detail.failureReason ?? "This payout could not be processed. Please contact support if the issue persists."}
                <div className="text-xs text-red-500 mt-1">Retry attempts: {detail.retryCount ?? 0}</div>
                <div className="flex gap-2 mt-3">
                  <Button variant="filled" visual="primary" size="sm" onClick={() => router.push("/transfer-funds")}>
                    Retry Withdrawal
                  </Button>
                  <Button variant="outlined" visual="gray" size="sm" onClick={() => window.open("mailto:support@marketeqdigital.com", "_blank")}>
                    Contact Support
                  </Button>
                </div>
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
  // US-100/US-101: same conflation risk as balanceError below — a failed
  // fetch previously left nextRunAt at null, rendering identically to "No
  // schedule set" (a legitimate empty state) with no way to retry.
  const [scheduleError, setScheduleError] = useState(false)
  const [defaultMethodLabel, setDefaultMethodLabel] = useState<string | null>(null)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)
  // US-101: a failed balance fetch must be retryable in place — previously
  // this just logged to console and left the stat cards stuck on "-"
  // forever, indistinguishable from a legitimate $0 state (Doc07 Error ≠
  // Empty).
  const [balanceError, setBalanceError] = useState(false)
  const loadPayoutsBalance = React.useCallback(() => {
    setBalanceError(false)
    getBalance().then(setBalance).catch((e) => { console.error("Balance fetch failed:", e); setBalanceError(true) })
  }, [])

  const loadPayoutsSchedule = React.useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(false)
    try {
      const res = await payoutFetch(`/payouts/schedule`)
      if (!res.ok) { setScheduleError(true); return }
      const d = await res.json()
      setNextRunAt(d.nextRunAt ?? null)
      setDefaultMethodLabel(d.primaryMethod?.displayLabel ?? null)
    } catch (e) { console.error('Failed to fetch schedule', e); setScheduleError(true) }
    finally { setScheduleLoading(false) }
  }, [])

  useEffect(() => {
    loadPayoutsSchedule()
    loadPayoutsBalance()
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts?status=completed&page=1&pageSize=1`)
        if (res.ok) { const d = await res.json(); setCompletedCount(d.totalCount ?? 0) }
      } catch (e) { console.error('Failed to fetch completed payout count', e) }
    })()
  }, [loadPayoutsBalance, loadPayoutsSchedule])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveFilters = !!statusFilter

  const loadPayouts = React.useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setLoadError("") }
    try {
      const qs = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) })
      if (statusFilter) qs.set('status', statusFilter)
      if (searchQuery.trim().length >= 2) qs.set('search', searchQuery.trim())
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
  }, [currentPage, statusFilter, searchQuery])

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
          sublabel={scheduleLoading ? "Loading..." : scheduleError ? "Unavailable" : nextRunAt ? new Date(nextRunAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "No schedule set"}
          amount={scheduleLoading ? "-" : nextRunAt && balance ? parseFloat(balance.availableBalance).toFixed(2) : "-"}
          extra={scheduleError ? (
            <button className="text-red-600 underline" onClick={loadPayoutsSchedule}>Unavailable — Retry</button>
          ) : balanceError ? (
            <button className="text-red-600 underline" onClick={loadPayoutsBalance}>Unavailable — Retry</button>
          ) : defaultMethodLabel ? `Bank: ${defaultMethodLabel}` : undefined}
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
          extra={balanceError ? (
            <button className="text-red-600 underline" onClick={loadPayoutsBalance}>Unavailable — Retry</button>
          ) : completedCount != null ? `${completedCount} completed payout${completedCount === 1 ? "" : "s"}` : undefined}
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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
            ) : payouts.length === 0 && searchQuery.trim().length >= 2 ? (
              // Figma: a dedicated, prominent empty state for a zero-result
              // search — "Clear Search" only clears the search term, not
              // the status filter.
              <TableRow><TableCell colSpan={6} className="text-center py-16">
                <p className="text-sm font-semibold text-dark-blue-400">0 Results for &quot;{searchQuery}&quot;</p>
                <p className="text-sm text-gray-400 mt-1">We couldn&apos;t find any results for your search. Try adjusting your keywords or clearing your search.</p>
                <Button variant="outlined" visual="gray" size="sm" className="mt-4" onClick={() => { setSearchQuery(""); setCurrentPage(1) }}>Clear Search</Button>
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
                  <TableCell className="text-sm font-medium text-dark-blue-400">${parseFloat(row.amountUsd).toFixed(2)} {row.currency}</TableCell>
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
