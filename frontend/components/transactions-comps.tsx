"use client"
import { Logo3 } from "@/components/icons"

import * as React from "react"
import { SVGProps, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { getEarningsSummary, getEarnings, getBalance, type EarningsSummary, type EarningsListResponse, type BalanceResponse } from "@/service/http/earnings"
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
  InputGroup,
  InputLeftElement,
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
  const [balance, setBalance] = React.useState<BalanceResponse | null>(null)
  const comingSoon = (feature: string) => toast({ title: feature, description: "This feature is coming soon." })

  // ── Deposit Methods state ──────────────────────────────────────
  const [methods, setMethods] = React.useState<any[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  const [showAddMethod, setShowAddMethod] = React.useState(false)
  const [canAddMore, setCanAddMore] = React.useState(true)
  const [editingMethod, setEditingMethod] = React.useState<any | null>(null)
  const [addForm, setAddForm] = React.useState({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankRoutingNumber: '', bankCountry: 'US', bankCurrency: 'USD', accountType: 'CHECKING', paypalEmail: '', nickname: '', bankConsent: false })
  const [verifyState, setVerifyState] = React.useState<{methodId:string, displayLabel:string, bankName:string, step:'instructions'|'amounts'|'verifying'|'success'|'failed'} | null>(null)
  const [microAmounts, setMicroAmounts] = React.useState({amount1:'', amount2:''})

  const fetchMethods = React.useCallback(async () => {
    try {
      setMethodsLoading(true)
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods`, {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (res.ok) { const d = await res.json(); setMethods((d.methods ?? []).filter((m: any) => m.verificationStatus === 'verified')); setCanAddMore(d.canAddMore ?? true) }
    } catch (e) { console.error('Failed to fetch deposit methods', e) }
    finally { setMethodsLoading(false) }
  }, [])

  const handleAddMethod = async () => {
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const payload: any = { methodType: addForm.methodType }
      if (addForm.methodType === 'BANK_MANUAL') {
        payload.bankAccountName = addForm.bankAccountName
        payload.bankAccountNumber = addForm.bankAccountNumber
        payload.bankRoutingNumber = addForm.bankRoutingNumber
        payload.bankCountry = addForm.bankCountry
        payload.bankCurrency = 'USD'
      } else if (addForm.methodType === 'PAYPAL') {
        payload.paypalEmail = addForm.paypalEmail
      }
      if (addForm.methodType === 'BANK_MANUAL' && addForm.bankAccountName) payload.nickname = addForm.bankAccountName
      else if (addForm.nickname) payload.nickname = addForm.nickname
      const res = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
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

  const handleDeleteMethod = async (id: string) => {
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/${id}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
      })
      if (res.ok) { toast({ title: 'Account removed successfully' }); fetchMethods() }
      else { const e = await res.json(); toast({ title: 'Cannot remove account', description: e.message ?? 'Please try again', variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to remove account', variant: 'destructive' }) }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/${id}/set-default`, {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }
      })
      if (res.ok) { toast({ title: 'Default updated' }); fetchMethods() }
      else { const e = await res.json(); toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to update default', variant: 'destructive' }) }
  }

  const handleUpdateMethod = async () => {
    if (!editingMethod) return
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/${editingMethod.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ nickname: editingMethod.nickname ?? '' })
      })
      if (res.ok) { toast({ title: 'Account updated' }); setEditingMethod(null); fetchMethods() }
      else { const e = await res.json(); toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    } catch (e) { toast({ title: 'Error', description: 'Failed to update account', variant: 'destructive' }) }
  }

  const handleVerifyMicroDeposits = async () => {
    if (!verifyState) return
    setVerifyState(s => s ? {...s, step: 'verifying'} : null)
    setMicroAmounts({ amount1: '', amount2: '' })
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      const [res] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/${verifyState.methodId}/verify-micro-deposits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ amount1Cents: parseInt(microAmounts.amount1), amount2Cents: parseInt(microAmounts.amount2) })
        }),
        new Promise(r => setTimeout(r, 2000))
      ])
      if (res.ok) {
        setVerifyState(s => s ? {...s, step: 'success'} : null)
        fetchMethods()
      } else {
        await deleteMethod(verifyState.methodId)
        setVerifyState(s => s ? {...s, step: 'failed'} : null)
      }
    } catch {
      if (verifyState?.methodId) await deleteMethod(verifyState.methodId)
      setVerifyState(s => s ? {...s, step: 'failed'} : null)
    }
  }

  const deleteMethod = React.useCallback(async (methodId: string) => {
    try {
      const Cookies = (await import('js-cookie')).default
      const token = Cookies.get('access_token') || Cookies.get('accessToken')
      await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/${methodId}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
      })
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

  const defaultMethod = methods.find(m => m.isDefault)

  useEffect(() => {
    getEarningsSummary().then(setSummary).catch(e => console.error("Earnings summary fetch failed:", e))
    getBalance().then(setBalance).catch(e => console.error("Balance fetch failed:", e))
    fetchMethods()
  }, [fetchMethods])

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
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-dark-blue-400">Earnings Summary</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total time logged earnings after any reserve is held.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Today */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm text-gray-500">Today</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Earnings logged since 12:00 AM local time today.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-dark-blue-400">
                <span className="text-base align-top">$</span>{summary ? summary.today.amount : "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
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
              <p className="text-sm text-gray-500 mt-1"><span className="font-semibold">{summary?.today.hoursLabel ?? "—"}</span> Logged</p>
            </div>

            {/* This Week + This Month */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm text-gray-500">This Week</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
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
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm text-gray-500">This Month</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
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

          <div className="mt-4">
            <Button variant="outlined" visual="gray" size="sm" onClick={() => onNavigateTab?.("earnings")}>
              View All Earnings
            </Button>
          </div>
        </div>

        {/* Direct Deposit */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-dark-blue-400">Direct Deposit</h3>
            <Button variant="link" visual="gray" size="sm" onClick={() => onNavigateTab?.("payouts")}>
              View All Payouts
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upcoming Payout */}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Upcoming Payout</p>
              <p className="text-3xl font-bold text-dark-blue-400">
                <span className="text-base align-top">$</span>2,460<span className="text-lg">.00</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-gray-400">Scheduled for June 3, 2025</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimated arrival in 2-3 business days.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button variant="outlined" visual="gray" size="sm" className="mt-3" onClick={() => onEditPayoutSchedule?.()}>
                Edit Payout Schedule
              </Button>
            </div>

            {/* Deposit Method */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-500">Deposit Method</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
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

          {/* Previous Payout */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-500">Previous Payout</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Deposited on May 28, 2025 to <BankIcon className="size-3.5 inline" /> Chase Bank ...4553
              </p>
            </div>
            <p className="text-2xl font-bold text-dark-blue-400">
              <span className="text-sm align-top">$</span>2,460<span className="text-base">.00</span>
            </p>
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
                  <TooltipContent>
                    <p>Linked bank and wallet accounts available for receiving deposits.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button variant="outlined" visual="gray" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setShowAddMethod(true)} disabled={!canAddMore}>
              Add Deposit Method
            </Button>
          </div>

          <div className="space-y-3">
            {methodsLoading ? (
              [...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)
            ) : methods.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No connected accounts yet. Add one to receive payouts.</div>
            ) : methods.map((m) => {
              const { name, sub } = getMethodLabel(m)
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                  {getMethodIcon(m)}
                  <span className="text-sm font-medium text-dark-blue-400">{name}</span>
                  {sub && <span className="text-sm text-gray-400">{sub}</span>}
                  {m.isDefault ? (
                    <Badge visual="primary" size="sm" className="ml-auto mr-2">Default</Badge>
                  ) : (
                    <Button variant="link" visual="gray" size="sm" className="ml-auto mr-2" onClick={() => handleSetDefault(m.id)}>
                      Make Default
                    </Button>
                  )}
                  <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setEditingMethod({...m})}>
                    <Edit03 className="size-4" />
                  </IconButton>
                  <IconButton size="sm" variant="ghost" visual="gray" onClick={() => handleDeleteMethod(m.id)}>
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
                          <span className="text-xs text-gray-400">{addForm?.bankAccountType ? (addForm.bankAccountType.charAt(0).toUpperCase() + addForm.bankAccountType.slice(1)) + ' Account' : 'Checking Account'}</span>
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
                    <p className="text-sm text-gray-500">We couldn't verify your bank at this time. This may be due to a temporary network issue or incorrect information.</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-sm text-gray-500 hover:text-gray-700" onClick={() => { if(verifyState?.methodId) deleteMethod(verifyState.methodId); setVerifyState(null); fetchMethods() }}>Back to Deposit Methods</button>
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setVerifyState(s => s ? {...s, step: 'amounts'} : null)}>↺ Retry</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Method Dialog — multi-step */}
          {showAddMethod && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddMethod(false); setAddForm({ methodType: 'PICK', bankAccountName: '', bankAccountNumber: '', bankRoutingNumber: '', bankCountry: 'US', bankCurrency: 'USD', accountType: 'CHECKING', paypalEmail: '', nickname: '', bankConsent: false }); }}>
              <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                {/* Step 1: Pick method */}
                {!addForm.methodType || addForm.methodType === 'PICK' ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-semibold text-dark-blue-400">Add Deposit Method</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Securely connect your payout account to receive earnings.</p>
                    <div className="space-y-2">
                      {[
                        { type: 'BANK_CONNECT', label: 'Direct Deposit to U.S. Bank', sub: 'Transfer reflects in 1–2 business days · Charges $0–$1 per transaction', icon: <BankIcon className="size-6 text-gray-500" /> },
                        { type: 'PAYPAL', label: 'PayPal', sub: 'Transfer reflects in 1–2 business days · Charges $0–$1 per transaction', icon: <PaypalIcon className="size-6" /> },
                        { type: 'WISE', label: 'Wise', sub: 'Transfer in 1–3 business days · Charges flat $1–$2 per withdrawal', icon: <WiseIcon className="size-6" /> },
                        { type: 'PAYONEER', label: 'Payoneer', sub: 'Transfer in 1–3 business days · Often free or $1–$2', icon: <PayoneerIcon className="size-6" /> },
                        { type: 'CRYPTO', label: 'Crypto Wallet', sub: 'Transfer time varies (blockchain dependent) · Network gas fees may apply', icon: <div className="size-6 rounded-lg bg-gray-100 flex items-center justify-center"><svg viewBox="0 0 24 24" style={{width:'16px',height:'16px'}} fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="2" fill="#6B7280"/></svg></div> },
                        { type: 'MARKETEQ_DEBIT_CARD', label: 'Marketeq Debit Card', sub: 'Instant transfer · No processing fee', icon: <div className="size-6 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 22" style={{width:'20px',height:'12px'}}><path fill="#306CFE" d="M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"/><path fill="#306CFE" d="M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z" opacity="0.5"/></svg></div> },
                      ].map(opt => (
                        <div key={opt.type} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer" onClick={() => setAddForm(f => ({...f, methodType: opt.type}))}>
                          {opt.icon}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark-blue-400">{opt.label}</p>
                            <p className="text-xs text-gray-400">{opt.sub}</p>
                          </div>
                          <Button variant="outlined" visual="gray" size="sm" onClick={e => { e.stopPropagation(); setAddForm(f => ({...f, methodType: opt.type})) }}>Setup</Button>
                        </div>
                      ))}
                    </div>
                  </div>
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
                          <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_MANUAL', bankAccountName: '', bankAccountNumber: '', bankRoutingNumber: '', nickname: '', accountType: 'CHECKING', bankConsent: false, _selectedBank: '', _stripeConnecting: false} as any))}>
                            <BankIcon className="size-4 shrink-0" /> Add my bank account manually
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outlined" visual="gray" size="sm" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>Cancel</Button>
                            <Button variant="filled" visual="primary" size="sm" disabled={!(addForm as any)._stripePickedBank} onClick={() => setAddForm(f => ({...f, _selectedBank: (f as any)._stripePickedBank, bankAccountName: (f as any)._stripePickedBank} as any))}>Verify Account</Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stripe Connect iframe — matches Figma design exactly */}
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
                            onClick={async () => {
                              const bankName = (addForm as any)._selectedBank
                              setAddForm(f => ({...f, _stripeConnecting: true} as any))
                              try {
                                const Cookies = (await import('js-cookie')).default
                                const token = Cookies.get('access_token') || Cookies.get('accessToken')
                                const initRes = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/stripe/restart`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                                  body: JSON.stringify({}),
                                })
                                const initData = await initRes.json()
                                if (!initRes.ok) throw new Error('Failed to start Stripe session')
                                const { sessionId } = initData
                                const finalRes = await fetch(`${process.env.NEXT_PUBLIC_PAYOUT_SERVICE_URL ?? 'http://localhost:3022/v1'}/deposit-methods/stripe/finalise`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                                  body: JSON.stringify({ sessionId, linkedAccountId: '' }),
                                })
                                const method = await finalRes.json()
                                if (!finalRes.ok) throw new Error('Finalise failed')
                                setAddForm(f => ({...f, methodType: 'PICK', _selectedBank: '', _stripeConnecting: false, _stripeUser: '', _stripePass: '', _bankSearch: ''} as any))
                                setShowAddMethod(false)
                                setVerifyState({ methodId: method.id, displayLabel: `${bankName} ••••4242`, bankName, step: 'verifying' })
                                await new Promise(r => setTimeout(r, 2500))
                                setVerifyState({ methodId: method.id, displayLabel: `${bankName} ••••4242`, bankName, step: 'success' })
                                fetchMethods()
                              } catch {
                                setAddForm(f => ({...f, _stripeConnecting: false} as any))
                                setVerifyState({ methodId: '', displayLabel: '', bankName: (addForm as any)._selectedBank, step: 'failed' })
                                setShowAddMethod(false)
                              }
                            }}
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
                  /* Step 2a: Bank manual form — keep existing */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_CONNECT'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Add your bank account manually</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Country</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.bankCountry} onChange={e => setAddForm(f => ({...f, bankCountry: e.target.value}))}>
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
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.accountType} onChange={e => setAddForm(f => ({...f, accountType: e.target.value}))}>
                          <option value="">Select</option>
                          <option value="CHECKING">Checking</option>
                          <option value="SAVINGS">Savings</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Up to 17 digits" value={addForm.bankAccountNumber} onChange={e => setAddForm(f => ({...f, bankAccountNumber: e.target.value}))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Bank Routing Number</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="xxxx-xxxx-x" value={addForm.bankRoutingNumber} onChange={e => setAddForm(f => ({...f, bankRoutingNumber: e.target.value}))} />
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-primary-600" checked={addForm.bankConsent} onChange={e => setAddForm(f => ({...f, bankConsent: e.target.checked}))} />
                        <span className="text-xs text-gray-400">By linking your bank account, you authorize Marketeq to initiate direct deposit (ACH) payments to your account. You acknowledge that all transfers will comply with applicable U.S. laws and banking regulations.</span>
                      </label>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button variant="outlined" visual="gray" size="sm" className="flex-1" onClick={() => setAddForm(f => ({...f, methodType: 'BANK_CONNECT'}))}>Cancel</Button>
                      <Button variant="filled" visual="primary" size="sm" className="flex-1" onClick={handleAddMethod} disabled={!addForm.bankAccountName.trim() || !addForm.bankAccountNumber.trim() || !addForm.bankRoutingNumber.trim() || !addForm.bankConsent}>Save</Button>
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
                    </div>
                    <Button variant="filled" visual="primary" size="sm" className="w-full" onClick={handleAddMethod}>Continue To PayPal</Button>
                    <button className="w-full text-center text-xs text-gray-400 mt-2 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>← Back to Deposit Methods</button>
                  </div>
                ) : (
                  /* Step 2c: Other (Wise/Payoneer/Crypto) */
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}><ChevronLeft className="size-4" /></button>
                      <h3 className="text-base font-semibold text-dark-blue-400">Connect {addForm.methodType.charAt(0) + addForm.methodType.slice(1).toLowerCase()}</h3>
                      <IconButton size="sm" variant="ghost" visual="gray" className="ml-auto" onClick={() => setShowAddMethod(false)}><X className="size-4" /></IconButton>
                    </div>
                    <p className="text-sm text-gray-500 text-center py-6">You'll be redirected to {addForm.methodType.charAt(0) + addForm.methodType.slice(1).toLowerCase()} to securely connect your account.</p>
                    <Button variant="filled" visual="primary" size="sm" className="w-full" onClick={handleAddMethod}>Continue To {addForm.methodType.charAt(0) + addForm.methodType.slice(1).toLowerCase()}</Button>
                    <button className="w-full text-center text-xs text-gray-400 mt-2 hover:text-gray-600" onClick={() => setAddForm(f => ({...f, methodType: 'PICK'}))}>← Back to Deposit Methods</button>
                  </div>
                )}
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
                <TooltipContent>
                  <p>Earnings currently eligible for manual withdrawal. This amount excludes your $150 reserve balance and any pending transactions.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-3xl font-bold text-dark-blue-400">
              <span className="text-base align-top">$</span>{balance ? Math.floor(parseFloat(balance.availableBalanceDisplay)).toLocaleString() : "..."}<span className="text-lg">.{balance ? parseFloat(balance.availableBalanceDisplay).toFixed(2).split(".")[1] : "00"}</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <BankIcon className="size-3.5" />
              Chase Bank ...4553
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outlined" visual="gray" size="sm" onClick={() => comingSoon("Withdraw Funds")}>Withdraw Funds</Button>
            <Button variant="outlined" visual="gray" size="sm" onClick={() => router.push("/billing")}>Manage</Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-dark-blue-400 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn(
                  "size-9 rounded-full flex items-center justify-center shrink-0",
                  item.iconBg
                )}>
                  {item.icon}
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
const DEPOSIT_METHODS = [
  { value: "chase", label: "Chase Bank ...4553", icon: "🏦" },
  { value: "wellsfargo", label: "Wells Fargo Bank ...3472", icon: "🏦" },
  { value: "paypal", label: "PayPal email@example.com", icon: "P" },
  { value: "wise", label: "Wise email@example.com", icon: "W" },
  { value: "binance", label: "BinancePay email@example.com", icon: "B" },
  { value: "marketeq-debit", label: "Marketeq Debit Card ...9824", icon: "M" },
  { value: "teq-coin", label: "TEQ Coin ...9824", icon: "T" },
]

const DAYS_OF_WEEK = [
  { key: "S1", label: "S", fullName: "Sunday" },
  { key: "M", label: "M", fullName: "Monday" },
  { key: "T1", label: "T", fullName: "Tuesday" },
  { key: "W", label: "W", fullName: "Wednesday" },
  { key: "T2", label: "T", fullName: "Thursday" },
  { key: "F", label: "F", fullName: "Friday" },
  { key: "S2", label: "S", fullName: "Saturday" },
]

const RESERVE_PRESETS = [25, 50, 100, 150, 250]

export const PayoutScheduleDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast()

  // Deposit method state
  const [splitMode, setSplitMode] = useState(false)
  const [primaryMethod, setPrimaryMethod] = useState("chase")
  const [splitMethods, setSplitMethods] = useState([
    { method: "chase", percentage: 60 },
    { method: "paypal", percentage: 40 },
  ])
  const [autoSplit, setAutoSplit] = useState(true)

  // Schedule state
  const [schedule, setSchedule] = useState("weekly")
  const [customSchedule, setCustomSchedule] = useState("")
  const [selectedDay, setSelectedDay] = useState("W") // Wednesday

  // Minimum payout
  const [minimumPayout, setMinimumPayout] = useState("1000")

  // Reserve balance
  const [reserveEnabled, setReserveEnabled] = useState(false)
  const [reserveAmount, setReserveAmount] = useState<number | null>(null)
  const [showCustomReserve, setShowCustomReserve] = useState(false)
  const [customReserveInput, setCustomReserveInput] = useState("")

  // Authorization
  const [authorized, setAuthorized] = useState(false)

  const selectedDayFull = DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.fullName ?? "Wednesday"

  const getNextDepositDate = () => {
    const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.key === selectedDay)
    const today = new Date()
    const currentDay = today.getDay()
    let daysUntil = dayIndex - currentDay
    if (daysUntil <= 0) daysUntil += 7
    if (schedule === "biweekly") daysUntil += 7
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysUntil)
    return nextDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }

  const getScheduleLabel = () => {
    if (schedule === "weekly") return `Weekly (every ${selectedDayFull})`
    if (schedule === "biweekly") return `Bi-Weekly (every other ${selectedDayFull})`
    if (schedule === "monthly") return "Monthly (1st of each month)"
    if (schedule === "daily") return "Daily (every day)"
    if (schedule === "custom" && customSchedule) return customSchedule
    return "Select schedule"
  }

  const handleSplitPercentageChange = (index: number, value: string) => {
    const num = parseInt(value) || 0
    setSplitMethods((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], percentage: num }
      return updated
    })
  }

  const handleRemoveSplitMethod = (index: number) => {
    if (splitMethods.length <= 2) return
    setSplitMethods((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddSplitMethod = () => {
    const usedMethods = splitMethods.map((m) => m.method)
    const available = DEPOSIT_METHODS.find((m) => !usedMethods.includes(m.value))
    if (available) {
      setSplitMethods((prev) => [...prev, { method: available.value, percentage: 0 }])
    }
  }

  const handleSave = () => {
    onOpenChange(false)
    toast({
      title: "Payout schedule updated",
      description: `${getScheduleLabel()} — deposits to ${splitMode ? `${splitMethods.length} accounts` : DEPOSIT_METHODS.find((m) => m.value === primaryMethod)?.label}`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold text-dark-blue-400">
            Setup Your Direct Deposit Schedule
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">Last updated on Feb 21, 2025</p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-5 space-y-6">
            {/* ── Preferred Deposit Method ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-dark-blue-400">
                  {splitMode ? "Preferred Payout Method" : "Preferred Deposit Method"}
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  onClick={() => setSplitMode(!splitMode)}
                >
                  {splitMode ? (
                    <>
                      Auto Split
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Split earnings across multiple accounts</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  ) : (
                    <>
                      Split Payout
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Split earnings across multiple accounts</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">Choose where your earnings should be deposited.</p>

              {!splitMode ? (
                /* Single deposit method */
                <Select value={primaryMethod} onValueChange={setPrimaryMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                    <button
                      type="button"
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm text-primary-500 hover:bg-gray-50"
                      onClick={() => toast({ title: "Add Deposit Method", description: "Connect a new account in Settings → Payment Methods." })}
                    >
                      <Plus className="size-4 mr-2" />
                      Add New Deposit Method
                    </button>
                  </SelectContent>
                </Select>
              ) : (
                /* Split payout mode */
                <div className="space-y-3">
                  {splitMethods.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={item.method}
                        onValueChange={(val) => {
                          setSplitMethods((prev) => {
                            const updated = [...prev]
                            updated[index] = { ...updated[index], method: val }
                            return updated
                          })
                        }}
                      >
                        <SelectTrigger className="flex-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPOSIT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 flex-none">
                        <Input
                          className="w-16 text-center text-sm"
                          value={item.percentage}
                          onChange={(e) => handleSplitPercentageChange(index, e.target.value)}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="flex-none"
                        onClick={() => handleRemoveSplitMethod(index)}
                        disabled={splitMethods.length <= 2}
                      >
                        <Trash01 className="size-4" />
                      </IconButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    onClick={handleAddSplitMethod}
                  >
                    <Plus className="size-3.5" />
                    Add New Deposit Method
                  </button>
                </div>
              )}
            </div>

            {/* ── Deposit Schedule ── */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark-blue-400">Set your Deposit Schedule</label>
              <p className="text-xs text-gray-500">Deposits run on your schedule when minimum balance is met.</p>

              <Select
                value={schedule}
                onValueChange={(val) => {
                  setSchedule(val)
                  if (val === "custom") setCustomSchedule("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getScheduleLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (every {selectedDayFull})</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly (every other {selectedDayFull})</SelectItem>
                  <SelectItem value="monthly">Monthly (1st of each month)</SelectItem>
                  <SelectItem value="daily">Daily (every day)</SelectItem>
                  <SelectItem value="custom">Set Custom Schedule</SelectItem>
                </SelectContent>
              </Select>

              {schedule === "custom" && (
                <Select value={customSchedule} onValueChange={setCustomSchedule}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose custom schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily (every 2 days)">Daily (every 2 days)</SelectItem>
                    <SelectItem value={`Weekly (every week on ${selectedDayFull})`}>Weekly (every week on {selectedDayFull})</SelectItem>
                    <SelectItem value={`Bi-Weekly (every 2 weeks on ${selectedDayFull})`}>Bi-Weekly (every 2 weeks on {selectedDayFull})</SelectItem>
                    <SelectItem value="Monthly (every month on the 14th)">Monthly (every month on the 14th)</SelectItem>
                    <SelectItem value="Monthly (every 2 months on the 14th)">Monthly (every 2 months on the 14th)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Select Deposit Day ── */}
            {(schedule === "weekly" || schedule === "biweekly" || schedule === "custom") && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-dark-blue-400">Select Deposit Day</label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      className={cn(
                        "size-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center",
                        selectedDay === day.key
                          ? "bg-primary-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-500"
                      )}
                      onClick={() => setSelectedDay(day.key)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Next Deposit ── */}
            <div className="flex items-center gap-2">
              <Badge visual="primary" className="text-xs">
                Next Deposit (based on your schedule)
              </Badge>
              <span className="text-xs font-medium text-primary-500">{getNextDepositDate()}</span>
            </div>

            {/* ── Minimum Payout ── */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark-blue-400">Minimum Payout</label>
              <p className="text-xs text-gray-500">
                Scheduled deposits are made only if your balance exceeds this amount. Setting a minimum helps avoid frequent small payouts and lowers processing fees.
              </p>
              <Select value={minimumPayout} onValueChange={setMinimumPayout}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">$50 or more</SelectItem>
                  <SelectItem value="100">$100 or more</SelectItem>
                  <SelectItem value="250">$250 or more</SelectItem>
                  <SelectItem value="500">$500 or more</SelectItem>
                  <SelectItem value="1000">$1000 or more</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Reserve Balance ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-dark-blue-400">
                    Reserve Balance <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Keep up to $250 in your account after each payout to automatically cover subscription or platform fees without disruption.
                  </p>
                </div>
                <Switch
                  checked={reserveEnabled}
                  onCheckedChange={(checked) => {
                    setReserveEnabled(checked as boolean)
                    if (!checked) {
                      setReserveAmount(null)
                      setShowCustomReserve(false)
                      setCustomReserveInput("")
                    }
                  }}
                  size="sm"
                />
              </div>

              {reserveEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {RESERVE_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          reserveAmount === amt && !showCustomReserve
                            ? "border-primary-500 bg-primary-50 text-primary-600"
                            : "border-gray-200 text-gray-600 hover:border-primary-300"
                        )}
                        onClick={() => {
                          setReserveAmount(amt)
                          setShowCustomReserve(false)
                          setCustomReserveInput("")
                        }}
                      >
                        Reserve ${amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                        showCustomReserve
                          ? "border-primary-500 bg-primary-50 text-primary-600"
                          : "border-gray-200 text-gray-600 hover:border-primary-300"
                      )}
                      onClick={() => setShowCustomReserve(true)}
                    >
                      Custom
                    </button>
                  </div>

                  {showCustomReserve && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <InputGroup className="flex-auto">
                          <InputLeftElement className="text-gray-500">$</InputLeftElement>
                          <Input
                            placeholder="Enter custom amount"
                            value={customReserveInput}
                            onChange={(e) => setCustomReserveInput(e.target.value)}
                          />
                        </InputGroup>
                        <Button
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          onClick={() => {
                            setShowCustomReserve(false)
                            setCustomReserveInput("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">Custom amount needs to be under $250</p>
                    </div>
                  )}
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
                  I understand that any changes to my payout preferences may take up to 3 business days to process. I certify that I am an authorized user of the account(s) provided and that all information entered is accurate.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!authorized}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const RECENT_ACTIVITY = [
  {
    title: "Payout Scheduled",
    description: "Chase Bank ...4553",
    time: "Just now",
    icon: <Calendar className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Sent",
    description: "$250 to Bank of America ...9876",
    time: "2hrs ago",
    icon: <ArrowUp className="size-4 text-success-500" />,
    iconBg: "bg-success-50",
  },
  {
    title: "Deposit Received",
    description: "$120 to Visa Card ...1122",
    time: "2hrs ago",
    icon: <ArrowDown className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Initiated",
    description: "Instant deposit triggered",
    time: "2hrs ago",
    icon: <Clock className="size-4 text-gray-500" />,
    iconBg: "bg-gray-100",
  },
  {
    title: "Deposit Settings Changed",
    description: "Chase 70% \u2022 PayPal 30%",
    time: "2hrs ago",
    icon: <Settings02 className="size-4 text-gray-500" />,
    iconBg: "bg-gray-100",
  },
  {
    title: "Payout Scheduled",
    description: "Chase Bank ...4553",
    time: "2hrs ago",
    icon: <Calendar className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Sent",
    description: "$250 to Bank of America ...9876",
    time: "2hrs ago",
    icon: <ArrowUp className="size-4 text-success-500" />,
    iconBg: "bg-success-50",
  },
  {
    title: "Deposit Received",
    description: "$120 to Visa Card ...1122",
    time: "2hrs ago",
    icon: <ArrowDown className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
]

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

export const EarningsTab = () => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState("daily")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [earningsSummary, setEarningsSummary] = React.useState<EarningsSummary | null>(null)
  const [earningsResult, setEarningsResult] = React.useState<EarningsListResponse | null>(null)
  const [earningsLoading, setEarningsLoading] = React.useState(true)
  const [dateRange, setDateRange] = React.useState("all_time")
  const [entryType, setEntryType] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")

  useEffect(() => {
    getEarningsSummary().then(setEarningsSummary).catch(console.error)
  }, [])

  useEffect(() => {
    setEarningsLoading(true)
    const q: any = { view: viewMode, dateRange, page: currentPage, limit: 10, sortBy: "workStartAt", sortOrder: "desc" }
    if (entryType) q.entryType = entryType
    if (statusFilter) q.status = statusFilter
    if (searchQuery.length >= 2) q.search = searchQuery
    getEarnings(q).then(setEarningsResult).catch(console.error).finally(() => setEarningsLoading(false))
  }, [viewMode, dateRange, currentPage, entryType, statusFilter, searchQuery])

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-x-4">
        <StatCard
          label="Today"
          amount={earningsSummary?.today.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.today.hoursLabel + " Logged" : "Loading..."}
          change={earningsSummary?.today.changePercent != null ? { value: Math.abs(earningsSummary.today.changePercent) + "%", direction: earningsSummary.today.changeDirection === "up" ? "up" : "down", label: earningsSummary.today.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Week"
          amount={earningsSummary?.thisWeek.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.thisWeek.hoursLabel + " Logged" : "Loading..."}
          change={earningsSummary?.thisWeek.changePercent != null ? { value: Math.abs(earningsSummary.thisWeek.changePercent) + "%", direction: earningsSummary.thisWeek.changeDirection === "up" ? "up" : "down", label: earningsSummary.thisWeek.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
        <StatCard
          label="This Month"
          amount={earningsSummary?.thisMonth.amount ?? "—"}
          extra={earningsSummary ? earningsSummary.thisMonth.hoursLabel + " Logged" : "Loading..."}
          change={earningsSummary?.thisMonth.changePercent != null ? { value: Math.abs(earningsSummary.thisMonth.changePercent) + "%", direction: earningsSummary.thisMonth.changeDirection === "up" ? "up" : "down", label: earningsSummary.thisMonth.changeLabel?.replace(/^[\d.]+%\s*/, "") ?? "" } : undefined}
        />
      </div>

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

        <Select defaultValue="all-projects">
          <SelectTrigger className="h-9 w-auto min-w-[120px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-projects">All Projects</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-clients">
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-clients">All Clients</SelectItem>
          </SelectContent>
        </Select>

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
            {earningsResult ? earningsResult.manualTimeLabel : "Loading earnings..."}{" "}
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

const PAYOUTS_DATA = [
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "April 2, 2025", estArrival: "April 2, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "April 1, 2025", estArrival: "April 1, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "April 1, 2025", estArrival: "April 1, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "April 1, 2025", estArrival: "April 1, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "Mar 31, 2025", estArrival: "Mar 31, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "Mar 31, 2025", estArrival: "Mar 31, 2025" },
  { amount: "$1,800.00 USD", account: "Chase Bank", accountNum: "...4553", initiatedOn: "Mar 31, 2025", estArrival: "Mar 31, 2025" },
]

export const PayoutsTab = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-x-4">
        <StatCard
          label="Next Payout"
          sublabel="Tuesday, Aug 20th"
          amount="832.00"
          status="Processing..."
          extra={"\uD83C\uDFE6 Chase Bank ...4553"}
        />
        <StatCard
          label="Total Payouts This Month"
          amount="4,566.00"
          extra="Earnings in August"
          change={{ value: "5.2%", direction: "up", label: "from last month" }}
        />
        <StatCard
          label="Lifetime Payouts"
          amount="66,7777.00"
          extra="127 Completed Projects"
          sublabel="Since Jun 24, 2021"
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outlined" visual="gray" size="sm" leftIcon={<Calendar className="size-4" />}>
          All Time
        </Button>

        <Select defaultValue="all-accounts">
          <SelectTrigger className="h-9 w-auto min-w-[120px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-accounts">All Accounts</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-statuses">
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="link" size="sm" onClick={() => setSearchQuery("")}>Clear All</Button>

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
                Amount <ArrowDown className="size-3 inline ml-1" />
              </TableHead>
              <TableHead>External Account</TableHead>
              <TableHead>Initiated on</TableHead>
              <TableHead>Est. Arrival</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYOUTS_DATA.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-dark-blue-400">{row.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BankIcon className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{row.account}</span>
                    <span className="text-sm text-gray-400">{row.accountNum}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{row.initiatedOn}</TableCell>
                <TableCell className="text-sm text-gray-500">{row.estArrival}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton size="sm" variant="ghost" visual="gray">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast({ title: "Payout Details", description: `${row.amount} to ${row.account} ${row.accountNum}` })}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Download Receipt", description: "Receipt download started." })}>Download Receipt</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            {[1, 2, 3, "...", 8, 9, 10].map((page, i) => (
              <button
                key={i}
                className={cn(
                  "size-8 rounded-md text-sm font-medium flex items-center justify-center",
                  page === currentPage
                    ? "border border-gray-300 text-dark-blue-400 bg-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
                onClick={() => typeof page === "number" && setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 10))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
