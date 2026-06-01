import axios from "axios"
import Cookies from "js-cookie"

const EARNINGS_BASE = process.env.NEXT_PUBLIC_EARNINGS_SERVICE_URL ?? "http://localhost:3026/v1"

function getToken() {
  return (
    Cookies.get("access_token") ||
    Cookies.get("accessToken") ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("token")
      : null) ||
    ""
  )
}

const earningsAxios = axios.create({ baseURL: EARNINGS_BASE, timeout: 15000 })
earningsAxios.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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
  status: "paid" | "failed"
  avgKeyboardPct: number | null
  avgMousePct: number | null
  feeBreakdown?: FeeBreakdown
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

export async function getEarningDetail(id: string) {
  const res = await earningsAxios.get(`/earnings/${id}`)
  return res.data
}

export interface BalanceResponse {
  availableBalance: string
  availableBalanceDisplay: string
  displayCurrency: string
  reserveBalance: string
  pendingHoldUsd: string
  totalEarnedUsd: string
  totalPaidOutUsd: string
  displayLabel: string
  lastUpdatedAt: string
}

export async function getBalance(): Promise<BalanceResponse> {
  const res = await earningsAxios.get("/earnings/balance")
  return res.data
}
