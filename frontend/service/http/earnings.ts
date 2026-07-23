import axios from "axios"
import { getPublicApiUrl } from "@/lib/runtime-urls"

// Routed through api-gateway (not earnings-service directly): access_token is an
// HttpOnly cookie, invisible to JS, so a manually-read "Bearer <token>" header was
// always empty here. The gateway reads the httpOnly cookie server-side and forwards
// it as a real Authorization header — withCredentials lets the browser attach it.
const EARNINGS_BASE = `${getPublicApiUrl()}/v1`

const earningsAxios = axios.create({ baseURL: EARNINGS_BASE, timeout: 15000, withCredentials: true })

export interface SummaryCard {
  amount: string
  displayCurrency: string
  hoursLogged: number
  hoursLabel: string
  changePercent: number | null
  changeLabel: string | null
  changeDirection: "up" | "down" | "unchanged"
  periodLabel: string
  dateRangeLabel: string
  feeNoteLabel: string
}

export interface EarningsSummary {
  today: SummaryCard
  thisWeek: SummaryCard
  thisMonth: SummaryCard
  allTime: SummaryCard
}

export interface FeeBreakdown {
  grossAmountDisplay: string
  grossAmountRaw: string
  feeAmountDisplay: string
  feeAmountRaw: string
  feeLabel: string
  feePercent: string
  netAmountRaw: string
  currency: string
  displayCurrency: string
}

export interface EarningsRow {
  id: string
  date: string | null
  weekRange: string | null
  month: string | null
  project: { id: string; name: string; clientHandle: string } | null
  task: { id: string; name: string | null } | null
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  durationLabel: string
  grossAmount: string
  feeAmount: string
  netAmount: string
  netAmountDisplay: string
  displayCurrency: string
  entryType: "automated" | "manual"
  status: "paid" | "failed" | "confirmed"
  avgKeyboardPct: number | null
  avgMousePct: number | null
  feeBreakdown?: FeeBreakdown
  weeklyHours?: number
  totalHours?: number
  weeklyEarnings?: string
  totalEarnings?: string
  budget?: string
}

export interface EarningsListResponse {
  view: string
  page: number
  limit: number
  total: number
  totalPages: number
  columns: string[]
  manualTimeMinutes: number
  manualTimeLabel: string
  data: EarningsRow[]
  appliedFilters: Record<string, string | null>
}

export interface EarningsQuery {
  view?: "daily" | "weekly" | "monthly"
  dateRange?: string
  startDate?: string
  endDate?: string
  projectId?: string
  clientId?: string
  entryType?: "manual" | "automated"
  status?: "paid" | "unpaid" | "failed"
  search?: string
  page?: number
  limit?: number
  sortBy?: "workStartAt" | "netAmount" | "durationMinutes"
  sortOrder?: "asc" | "desc"
}

export async function getEarningsSummary(timezone?: string): Promise<EarningsSummary> {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await earningsAxios.get(`/earnings/summary?timezone=${encodeURIComponent(tz)}`)
  return res.data
}

export async function getEarnings(query: EarningsQuery = {}): Promise<EarningsListResponse> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") params.set(k, String(v))
  }
  const res = await earningsAxios.get(`/earnings?${params.toString()}`)
  return res.data
}

export interface EarningDetailLineItem {
  label: string
  amount: string
  currency: string
  amountRaw: string
  currencyRaw: string
  isTotal?: boolean
}

export interface EarningDetailFeeSection {
  grossAmount: string
  grossAmountDisplay: string
  feeAmount: string
  feeAmountDisplay: string
  netAmount: string
  netAmountDisplay: string
  grossAmountUsd: string
  feeAmountUsd: string
  netAmountUsd: string
  billingCurrency: string
  displayCurrency: string
  fxRateToUsd: string
  fxRateLabel: string
  feeLabel: string
  feePercent: string
  lineItems: EarningDetailLineItem[]
}

export interface EarningDetail {
  id: string
  entryType: "automated" | "manual"
  status: "paid" | "failed" | "confirmed"
  grossAmount: string
  feeAmount: string
  netAmount: string
  netAmountDisplay: string
  currency: string
  displayCurrency: string
  fxRateToUsd: string
  workStartAt: string
  workEndAt: string
  durationMinutes: number
  durationLabel: string
  avgKeyboardPct: number | null
  avgMousePct: number | null
  reversedAt: string | null
  contract: { id: string; title: string; status: string } | null
  project: { id: string; name: string; clientHandle: string | null; clientName: string | null } | null
  feeSection: EarningDetailFeeSection
}

export async function getEarningDetail(id: string): Promise<EarningDetail> {
  const res = await earningsAxios.get(`/earnings/${id}`)
  return res.data
}

export interface BalanceResponse {
  availableBalance: string
  availableBalanceDisplay: string
  displayCurrency: string
  // US-07: secondary amount shown only when localCurrency !== displayCurrency.
  // Backend (balance.service.ts) already computes and returns both — the
  // frontend type just never declared them, so this was silently unused.
  availableBalanceLocal: string
  localCurrency: string
  reserveBalance: string
  pendingHoldUsd: string
  totalEarnedUsd: string
  totalPaidOutUsd: string
  displayLabel: string
  // US-08: explicit stale-FX signal — never hidden, always flagged with an
  // asterisk on the balance amount when true.
  stale: boolean
  lastUpdatedAt: string
  // US-01 Last Updated Label: when the balance figure was cached, distinct
  // from lastUpdatedAt (which reflects the underlying ledger snapshot, not
  // the cache read that actually produced this response).
  cachedAt?: string
}

export async function getBalance(): Promise<BalanceResponse> {
  try {
    const res = await earningsAxios.get("/earnings/balance")
    return res.data
  } catch (e: any) {
    // earnings-service returns 404 when a contractor has no BalanceSnapshot row
    // yet (never earned anything) — that's a real, valid state, not a service
    // failure. Callers shouldn't have to special-case it: it means $0.00, not
    // "unavailable" (which is reserved for genuine errors — 5xx/network/timeout).
    if (e?.response?.status === 404) {
      return {
        availableBalance: "0.00",
        availableBalanceDisplay: "0.00",
        displayCurrency: "USD",
        availableBalanceLocal: "0.00",
        localCurrency: "USD",
        reserveBalance: "0.00",
        pendingHoldUsd: "0.00",
        totalEarnedUsd: "0.00",
        totalPaidOutUsd: "0.00",
        displayLabel: "After reserve & threshold deductions",
        stale: false,
        lastUpdatedAt: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
      }
    }
    throw e
  }
}
