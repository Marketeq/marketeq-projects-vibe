"use client"

import { useMemo, useState } from "react"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { cn } from "@/utils/functions"
import {
  ArrowDown,
  ArrowUp,
  BarChartSquare02,
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  CurrencyDollar,
  FileCheck02,
  Lock01,
  RefreshCw,
  Send01,
  Target04,
  Users01,
} from "@blend-metrics/icons"
import { differenceInCalendarDays, format, subDays } from "date-fns"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import NextLink from "@/components/next-link"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import { DashboardFooter } from "@/components/dashboard-footer"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Card,
  CloseButton,
  DateRangeCalendar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangeKey = "7d" | "30d" | "90d" | "custom"
type CustomRangeValue = { start: Date; end: Date }

type Kpi = {
  label: string
  value: string
  delta?: string
  deltaUp?: boolean
}

// ---------------------------------------------------------------------------
// Range presets
// ---------------------------------------------------------------------------

const rangePresets: Array<{
  key: Exclude<RangeKey, "custom">
  label: string
  days: number
}> = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
]

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const statsTabs = [
  { value: "overview", label: "Overview" },
  { value: "spending", label: "Spending" },
  { value: "hiring", label: "Hiring" },
  { value: "contracts", label: "Contracts" },
  { value: "talent", label: "Talent" },
] as const

// ---------------------------------------------------------------------------
// Overview data
// ---------------------------------------------------------------------------

const overviewMetricConfig = [
  { label: "Active Contracts", baseValue: 4, baseDelta: 1, type: "count" as const, icon: FileCheck02 },
  { label: "Total Spent", baseValue: 24850, baseDelta: 12, type: "dollar" as const, icon: CurrencyDollar },
  { label: "Jobs Posted", baseValue: 12, baseDelta: 3, type: "count" as const, icon: Briefcase },
  { label: "Talent Hired", baseValue: 7, baseDelta: 2, type: "count" as const, icon: Users01 },
  { label: "Offers Sent", baseValue: 18, baseDelta: 8, type: "count" as const, icon: Send01 },
  { label: "Avg Contract Value", baseValue: 3550, baseDelta: 5, type: "dollar" as const, icon: CurrencyDollar },
  { label: "Response Rate", baseValue: 82, baseDelta: 3, type: "percent" as const, icon: Target04 },
  { label: "Open Jobs", baseValue: 3, baseDelta: 0, type: "count" as const, icon: Briefcase },
] as const

const overviewSparklines: Record<string, readonly number[]> = {
  "Active Contracts": [2, 2, 3, 3, 4, 3, 4],
  "Total Spent": [3200, 2800, 4100, 3600, 3900, 4500, 4850],
  "Jobs Posted": [1, 2, 1, 2, 2, 3, 1],
  "Talent Hired": [1, 0, 1, 1, 2, 1, 1],
  "Offers Sent": [2, 3, 2, 3, 4, 2, 2],
  "Avg Contract Value": [2800, 3100, 3400, 3200, 3550, 3800, 3550],
  "Response Rate": [75, 78, 80, 79, 82, 84, 82],
  "Open Jobs": [2, 3, 2, 1, 3, 2, 3],
}

const snapshotInsights = [
  { label: "Highest Spend Category", value: "Product Design" },
  { label: "Fastest Hire", value: "3 days (Backend Dev)" },
  { label: "Most Active Contract", value: "Mobile App Redesign" },
  { label: "Top Rated Talent", value: "4.9 avg across 7 hires" },
]

const hiringFunnel = [
  { label: "Jobs Posted", value: 12, pct: 100 },
  { label: "Applications Received", value: 84, pct: 100 },
  { label: "Shortlisted", value: 32, pct: 38 },
  { label: "Offers Sent", value: 18, pct: 21 },
  { label: "Offers Accepted", value: 14, pct: 17 },
  { label: "Contracts Started", value: 12, pct: 14 },
]

// ---------------------------------------------------------------------------
// Spending data
// ---------------------------------------------------------------------------

const monthlySpendData = [
  { month: "Jan", spend: 3200 },
  { month: "Feb", spend: 2800 },
  { month: "Mar", spend: 4100 },
  { month: "Apr", spend: 3600 },
  { month: "May", spend: 3900 },
  { month: "Jun", spend: 4500 },
  { month: "Jul", spend: 3800 },
  { month: "Aug", spend: 5200 },
  { month: "Sep", spend: 4850 },
]

const spendByCategoryData = [
  { name: "Design", value: 9200, color: "#306CFE" },
  { name: "Development", value: 8400, color: "#6B9FFF" },
  { name: "Marketing", value: 4100, color: "#A3C4FF" },
  { name: "Writing", value: 3150, color: "#D6E4FF" },
]

const spendByContractType = [
  { type: "Project", amount: 14200, count: 5 },
  { type: "Service", amount: 6800, count: 3 },
  { type: "Team", amount: 3100, count: 1 },
  { type: "Individual", amount: 750, count: 3 },
]

const budgetUtilization = [
  { name: "Mobile App Redesign", budget: 8000, spent: 6200, pct: 78 },
  { name: "Brand Identity", budget: 5000, spent: 4800, pct: 96 },
  { name: "Content Strategy", budget: 3000, spent: 1200, pct: 40 },
  { name: "Backend API", budget: 6000, spent: 3400, pct: 57 },
]

const costPerHireData = [
  { month: "Jan", cost: 4200 },
  { month: "Feb", cost: 3800 },
  { month: "Mar", cost: 3500 },
  { month: "Apr", cost: 3900 },
  { month: "May", cost: 3200 },
  { month: "Jun", cost: 3600 },
  { month: "Jul", cost: 3100 },
  { month: "Aug", cost: 2900 },
  { month: "Sep", cost: 3050 },
]

const rateBenchmarks = [
  { label: "Your Avg Hourly Rate", value: "$85/hr", note: "Competitive for your categories" },
  { label: "Platform Avg (Design)", value: "$95/hr", note: "You're 11% below average" },
  { label: "Platform Avg (Dev)", value: "$110/hr", note: "You're 23% below average" },
]

// ---------------------------------------------------------------------------
// Hiring data
// ---------------------------------------------------------------------------

const timeToHireData = [
  { month: "Jan", days: 14 },
  { month: "Feb", days: 12 },
  { month: "Mar", days: 10 },
  { month: "Apr", days: 11 },
  { month: "May", days: 8 },
  { month: "Jun", days: 9 },
  { month: "Jul", days: 7 },
  { month: "Aug", days: 6 },
  { month: "Sep", days: 7 },
]

const offerAcceptanceData = [
  { month: "Jan", rate: 50 },
  { month: "Feb", rate: 60 },
  { month: "Mar", rate: 55 },
  { month: "Apr", rate: 65 },
  { month: "May", rate: 70 },
  { month: "Jun", rate: 68 },
  { month: "Jul", rate: 75 },
  { month: "Aug", rate: 72 },
  { month: "Sep", rate: 78 },
]

const applicationVolumeData = [
  { month: "Jan", applications: 8 },
  { month: "Feb", applications: 6 },
  { month: "Mar", applications: 12 },
  { month: "Apr", applications: 9 },
  { month: "May", applications: 15 },
  { month: "Jun", applications: 11 },
  { month: "Jul", applications: 14 },
  { month: "Aug", applications: 18 },
  { month: "Sep", applications: 16 },
]

const topJobCategories = [
  { category: "UI/UX Design", applications: 28, hires: 3, ctr: "10.7%" },
  { category: "Full-Stack Dev", applications: 22, hires: 2, ctr: "9.1%" },
  { category: "Content Writing", applications: 18, hires: 1, ctr: "5.6%" },
  { category: "Marketing", applications: 16, hires: 1, ctr: "6.3%" },
]

const pipelineStages = [
  { stage: "Screening", count: 12, color: "#93C5FD" },
  { stage: "Interview", count: 6, color: "#6B9FFF" },
  { stage: "Offer", count: 3, color: "#306CFE" },
  { stage: "Hired", count: 2, color: "#1D4ED8" },
]

// ---------------------------------------------------------------------------
// Contracts data
// ---------------------------------------------------------------------------

const contractsOverTime = [
  { month: "Jan", active: 2, completed: 0 },
  { month: "Feb", active: 2, completed: 1 },
  { month: "Mar", active: 3, completed: 1 },
  { month: "Apr", active: 3, completed: 0 },
  { month: "May", active: 4, completed: 1 },
  { month: "Jun", active: 3, completed: 2 },
  { month: "Jul", active: 4, completed: 1 },
  { month: "Aug", active: 5, completed: 0 },
  { month: "Sep", active: 4, completed: 1 },
]

const contractRows = [
  { name: "Mobile App Redesign", type: "Project", status: "Active", value: "$8,000", duration: "3.2 mo", rating: "4.9" },
  { name: "Brand Identity System", type: "Project", status: "Completed", value: "$5,000", duration: "2.1 mo", rating: "5.0" },
  { name: "Monthly SEO Service", type: "Service", status: "Active", value: "$1,500/mo", duration: "4.0 mo", rating: "4.7" },
  { name: "Content Strategy", type: "Project", status: "Active", value: "$3,000", duration: "1.5 mo", rating: "4.8" },
  { name: "Backend API Dev", type: "Project", status: "Active", value: "$6,000", duration: "2.8 mo", rating: "4.6" },
]

const contractValueDist = [
  { range: "$0-1k", count: 3, color: "#D6E4FF" },
  { range: "$1k-3k", count: 4, color: "#A3C4FF" },
  { range: "$3k-5k", count: 3, color: "#6B9FFF" },
  { range: "$5k+", count: 2, color: "#306CFE" },
]

const hoursTrackedData = [
  { month: "Jan", hours: 120 },
  { month: "Feb", hours: 95 },
  { month: "Mar", hours: 160 },
  { month: "Apr", hours: 140 },
  { month: "May", hours: 155 },
  { month: "Jun", hours: 180 },
  { month: "Jul", hours: 150 },
  { month: "Aug", hours: 200 },
  { month: "Sep", hours: 185 },
]

// ---------------------------------------------------------------------------
// Talent data
// ---------------------------------------------------------------------------

const repeatHireData = [
  { month: "Jan", rate: 20 },
  { month: "Feb", rate: 25 },
  { month: "Mar", rate: 30 },
  { month: "Apr", rate: 28 },
  { month: "May", rate: 35 },
  { month: "Jun", rate: 33 },
  { month: "Jul", rate: 40 },
  { month: "Aug", rate: 38 },
  { month: "Sep", rate: 43 },
]

const ratingDistribution = [
  { rating: "5.0", count: 4, color: "#306CFE" },
  { rating: "4.5-4.9", count: 2, color: "#6B9FFF" },
  { rating: "4.0-4.4", count: 1, color: "#A3C4FF" },
  { rating: "<4.0", count: 0, color: "#D6E4FF" },
]

const topSkillsHired = [
  { skill: "React / Next.js", hires: 3, avgRate: "$105/hr" },
  { skill: "UI/UX Design", hires: 3, avgRate: "$90/hr" },
  { skill: "Node.js / NestJS", hires: 2, avgRate: "$110/hr" },
  { skill: "Content Writing", hires: 1, avgRate: "$65/hr" },
  { skill: "SEO / Marketing", hires: 1, avgRate: "$75/hr" },
]

const platformBenchmarks = [
  { label: "Your avg rate vs market", value: "$85/hr", comparison: "12% below avg", positive: true },
  { label: "Time-to-hire", value: "7 days", comparison: "3 days faster than avg", positive: true },
  { label: "Offer acceptance rate", value: "78%", comparison: "Top 20% of clients", positive: true },
  { label: "Talent retention", value: "4.2 months", comparison: "8% above avg", positive: true },
  { label: "Repeat hire rate", value: "43%", comparison: "Top 15% of clients", positive: true },
  { label: "Avg rating given", value: "4.8", comparison: "Above platform avg of 4.5", positive: true },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const number = (value: number) => value.toLocaleString()
const dollar = (value: number) => `$${value.toLocaleString()}`
const kpiId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
const spark = (values: readonly number[]) => values.map((value, index) => ({ index, value }))

const PremiumOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    <div className="pointer-events-none select-none blur-[6px]">{children}</div>
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-y-3 rounded-lg bg-white/60 backdrop-blur-[2px]">
      <div className="flex size-12 items-center justify-center rounded-full border-8 border-gray-50 bg-gray-100">
        <Lock01 className="size-5 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-dark-blue-400">Premium Analytics</p>
        <p className="mt-1 text-xs text-gray-500">Upgrade your plan to unlock these insights</p>
      </div>
      <NextLink href="/settings?tab=billing-plans">
        <Button size="sm" variant="filled" visual="primary">
          Upgrade Plan
        </Button>
      </NextLink>
    </div>
  </div>
)

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {prefix}
          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          {suffix}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientStatsPage() {
  const [tab, setTab] = useState("overview")
  const [selectedRange, setSelectedRange] = useState<RangeKey>("30d")
  const [isRangeOpen, setIsRangeOpen] = useState(false)
  const [customRange, setCustomRange] = useState<CustomRangeValue>({
    start: subDays(new Date(), 29),
    end: new Date(),
  })

  const rangeDays =
    selectedRange === "custom"
      ? Math.max(1, differenceInCalendarDays(customRange.end, customRange.start) + 1)
      : (rangePresets.find((p) => p.key === selectedRange)?.days ?? 30)

  const scaleFactor = rangeDays / 30

  const rangeLabel =
    selectedRange === "custom"
      ? `${format(customRange.start, "LLL d")} - ${format(customRange.end, "LLL d, yyyy")}`
      : (rangePresets.find((p) => p.key === selectedRange)?.label ?? "Last 30 days")

  const overviewKpis: Kpi[] = useMemo(
    () =>
      overviewMetricConfig.map((metric) => {
        if (metric.type === "percent") {
          const value = metric.baseValue + (rangeDays - 30) * 0.1
          return {
            label: metric.label,
            value: `${value.toFixed(1)}%`,
            delta: metric.baseDelta > 0 ? `+${metric.baseDelta}%` : undefined,
            deltaUp: metric.baseDelta >= 0,
          }
        }
        if (metric.type === "dollar") {
          const value = Math.round(metric.baseValue * scaleFactor)
          return {
            label: metric.label,
            value: dollar(value),
            delta: metric.baseDelta > 0 ? `+${metric.baseDelta}%` : undefined,
            deltaUp: metric.baseDelta >= 0,
          }
        }
        const value = Math.max(1, Math.round(metric.baseValue * scaleFactor))
        return {
          label: metric.label,
          value: number(value),
          delta: metric.baseDelta > 0 ? `+${metric.baseDelta}%` : undefined,
          deltaUp: metric.baseDelta >= 0,
        }
      }),
    [rangeDays, scaleFactor]
  )

  const primaryTabs = statsTabs.slice(0, 3)
  const overflowTabs = statsTabs.slice(3)

  const totalSpentValue = overviewKpis.find((k) => k.label === "Total Spent")?.value ?? "$0"
  const activeContractsValue = overviewKpis.find((k) => k.label === "Active Contracts")?.value ?? "0"
  const talentHiredValue = overviewKpis.find((k) => k.label === "Talent Hired")?.value ?? "0"

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50">
        <LeftSidebar forceRole="CLIENT" />

        <div className="flex-auto p-3.5 gap-x-6 flex md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[274px] min-[1024px]:pr-[50px] overflow-hidden">
          <div className="flex-auto min-w-0">
            {/* Summary banner */}
            <Alert variant="primary" className="mb-6">
              <AlertIcon>
                <BarChartSquare02 className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>{`You've spent ${totalSpentValue} across ${activeContractsValue} active contracts.`}</AlertTitle>
                <AlertDescription>{`${talentHiredValue} talent hired in ${rangeLabel.toLowerCase()}. Your offer acceptance rate is 78%.`}</AlertDescription>
              </AlertContent>
              <CloseButton />
            </Alert>

            {/* Header */}
            <div className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-[24px] font-bold leading-none text-dark-blue-400">
                    Stats & Trends
                  </h1>
                  <p className="mt-2 max-w-[760px] text-[14px] font-light leading-normal text-gray-500">
                    Track your hiring activity, spending, and contract performance across the platform.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {rangePresets.map((preset) => (
                    <Button
                      key={preset.key}
                      size="sm"
                      variant={selectedRange === preset.key ? "outlined" : "ghost"}
                      visual="gray"
                      onClick={() => setSelectedRange(preset.key)}
                    >
                      {preset.label}
                    </Button>
                  ))}

                  <Popover open={isRangeOpen} onOpenChange={setIsRangeOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outlined" visual="gray" size="sm">
                        <Calendar className="size-4" />
                        {selectedRange === "custom" ? rangeLabel : "Custom Range"}
                        <ChevronDown className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto border-0 bg-transparent p-0 shadow-none" align="end">
                      <DateRangeCalendar
                        value={customRange}
                        onValueChange={(value) => {
                          if (!value) return
                          setCustomRange(value)
                          setSelectedRange("custom")
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <Tabs value={tab} onValueChange={setTab}>
                <div className="flex items-end justify-between gap-3 border-b border-gray-200">
                  <TabsList className="min-w-0 flex-1 justify-start gap-5 overflow-hidden border-b-0 px-0 pt-0">
                    {primaryTabs.map((t) => (
                      <TabsTrigger key={t.value} value={t.value}>
                        {t.label}
                      </TabsTrigger>
                    ))}
                    {overflowTabs.map((t) => (
                      <TabsTrigger key={t.value} value={t.value} containerClassName="hidden xl:flex">
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className={cn(
                          "h-auto pb-2 pl-0 pr-0 xl:hidden",
                          overflowTabs.some((t) => t.value === tab) ? "text-primary-500" : "text-gray-500"
                        )}
                      >
                        More
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[220px]">
                      {overflowTabs.map((t) => (
                        <DropdownMenuItem key={t.value} onSelect={() => setTab(t.value)}>
                          {t.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* ========================================================= */}
                {/* OVERVIEW TAB */}
                {/* ========================================================= */}
                <TabsContent value="overview" className="mt-6">
                  {/* KPI cards with sparklines */}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {overviewKpis.map((kpi) => (
                      <Card
                        key={kpi.label}
                        className="group flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium leading-normal text-gray-500">
                              {kpi.label}
                            </div>
                            <div className="mt-2 flex items-end gap-3">
                              <div className="text-[22px] font-bold leading-none text-dark-blue-400">
                                {kpi.value}
                              </div>
                              {kpi.delta && (
                                <Badge visual="gray" className="border border-gray-200 bg-white">
                                  {kpi.delta}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="h-[44px] w-[92px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={spark(
                                  overviewSparklines[kpi.label] ?? [0, 0, 0, 0, 0, 0, 0]
                                )}
                              >
                                <defs>
                                  <linearGradient id={`kpi-${kpiId(kpi.label)}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#306CFE" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#306CFE" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#306CFE"
                                  strokeWidth={2}
                                  fill={`url(#kpi-${kpiId(kpi.label)})`}
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Spend trend + Hiring funnel side by side */}
                  <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="grid gap-3">
                      {/* Spending over time */}
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Spending Over Time
                            </div>
                            <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                              Monthly spend across all contracts
                            </div>
                          </div>
                          <Badge visual="gray" className="border border-gray-200 bg-white">
                            {rangeLabel}
                          </Badge>
                        </div>
                        <div className="mt-4 h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlySpendData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#306CFE" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#306CFE" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                              <RechartsTooltip content={<ChartTooltip prefix="$" />} />
                              <Area type="monotone" dataKey="spend" stroke="#306CFE" strokeWidth={2} fill="url(#spendGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      {/* Snapshot insights */}
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                          Snapshot Insights
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {snapshotInsights.map((row) => (
                            <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                              <div className="mt-1 text-[14px] font-semibold leading-normal text-dark-blue-400">{row.value}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Hiring funnel */}
                    <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        Hiring Funnel
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        From job posting to contract
                      </div>
                      <div className="mt-4 space-y-4">
                        {hiringFunnel.map((step) => (
                          <div key={step.label}>
                            <div className="flex items-center justify-between gap-3 text-[13px] leading-normal">
                              <span className="font-medium text-gray-500">{step.label}</span>
                              <span className="font-semibold text-dark-blue-400">{number(step.value)}</span>
                            </div>
                            <Progress className="mt-2 h-2 bg-transparent" indicatorClassName="rounded-full" value={step.pct} />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* SPENDING TAB */}
                {/* ========================================================= */}
                <TabsContent value="spending" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                          Spending Analytics
                        </div>
                        <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                          Where your money goes and how efficiently you're spending.
                        </div>
                      </div>
                    </div>

                    {/* Spend summary cards */}
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Total Spent (All Time)", value: "$24,850" },
                        { label: "Avg Monthly Spend", value: "$3,856" },
                        { label: "Avg Cost Per Hire", value: "$3,550" },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">{row.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Spend by category + Monthly trend */}
                    <div className="mt-6 grid gap-3 lg:grid-cols-2">
                      {/* Spend by category donut */}
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Spend by Category
                        </div>
                        <div className="mt-3 grid items-center gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                          <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={spendByCategoryData} dataKey="value" innerRadius={50} outerRadius={75} stroke="none" paddingAngle={2}>
                                  {spendByCategoryData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-[#0F2B66] text-[12px] font-medium">
                                  Total
                                </text>
                                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-[#0F2B66] text-[18px] font-bold">
                                  $24.8k
                                </text>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-3">
                            {spendByCategoryData.map((cat) => (
                              <div key={cat.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                                <div className="flex items-center gap-3">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span className="text-[13px] font-semibold text-dark-blue-400">{cat.name}</span>
                                </div>
                                <span className="text-[13px] font-semibold text-gray-500">{dollar(cat.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      {/* Spend by contract type */}
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Spend by Contract Type
                        </div>
                        <div className="mt-3 h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={spendByContractType} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="type" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                              <RechartsTooltip content={<ChartTooltip prefix="$" />} />
                              <Bar dataKey="amount" radius={[10, 10, 0, 0]} fill="#306CFE" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Budget utilization */}
                    <div className="mt-6">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        Budget Utilization
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        How much of each project budget has been used.
                      </div>
                      <div className="mt-4 space-y-4">
                        {budgetUtilization.map((row) => (
                          <div key={row.name}>
                            <div className="flex items-center justify-between gap-3 text-[13px] leading-normal">
                              <span className="font-semibold text-dark-blue-400">{row.name}</span>
                              <span className="font-medium text-gray-500">
                                {dollar(row.spent)} / {dollar(row.budget)} ({row.pct}%)
                              </span>
                            </div>
                            <Progress
                              className="mt-2 h-2 bg-transparent"
                              indicatorClassName={cn(
                                "rounded-full",
                                row.pct > 90 ? "bg-amber-500" : ""
                              )}
                              value={row.pct}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium: Cost per hire + benchmarks */}
                    <div className="mt-8">
                      <PremiumOverlay>
                        <div className="space-y-6">
                          <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                            <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                              Cost Per Hire Trend
                            </div>
                            <div className="mt-3 h-[180px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={costPerHireData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                  <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                                  <RechartsTooltip content={<ChartTooltip prefix="$" />} />
                                  <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </Card>

                          <div className="grid gap-3 md:grid-cols-3">
                            {rateBenchmarks.map((row) => (
                              <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                                <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">{row.value}</div>
                                <div className="mt-2 text-[12px] font-light leading-normal text-gray-500">{row.note}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PremiumOverlay>
                    </div>
                  </Card>
                </TabsContent>

                {/* ========================================================= */}
                {/* HIRING TAB */}
                {/* ========================================================= */}
                <TabsContent value="hiring" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Hiring Analytics
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      How effectively you're finding and hiring talent.
                    </div>

                    {/* Hiring KPI cards */}
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      {[
                        { label: "Avg Time-to-Hire", value: "7 days", delta: "-2 days", deltaUp: true },
                        { label: "Offer Acceptance", value: "78%", delta: "+6%", deltaUp: true },
                        { label: "Applications / Job", value: "7.0", delta: "+1.2", deltaUp: true },
                        { label: "Active Pipeline", value: "23", delta: "+5", deltaUp: true },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">{row.value}</div>
                          <div className="mt-2 flex items-center gap-x-1">
                            {row.deltaUp ? (
                              <ArrowUp className="size-3 text-success-500" />
                            ) : (
                              <ArrowDown className="size-3 text-error-500" />
                            )}
                            <span className={cn("text-[12px]", row.deltaUp ? "text-success-600" : "text-error-600")}>
                              {row.delta}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Time-to-hire + Offer acceptance charts */}
                    <div className="mt-6 grid gap-3 lg:grid-cols-2">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Time-to-Hire Trend
                        </div>
                        <div className="mt-3 h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeToHireData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} unit=" d" />
                              <RechartsTooltip content={<ChartTooltip suffix=" days" />} />
                              <Line type="monotone" dataKey="days" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Offer Acceptance Rate
                        </div>
                        <div className="mt-3 h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={offerAcceptanceData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="acceptGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                              <RechartsTooltip content={<ChartTooltip suffix="%" />} />
                              <Area type="monotone" dataKey="rate" stroke="#7C3AED" strokeWidth={2} fill="url(#acceptGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Application volume chart */}
                    <div className="mt-6">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Application Volume
                        </div>
                        <div className="mt-3 h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={applicationVolumeData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip content={<ChartTooltip />} />
                              <Bar dataKey="applications" radius={[10, 10, 0, 0]} fill="#306CFE" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Top job categories table */}
                    <div className="mt-6">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        Top Job Categories
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        Which categories attract the most talent.
                      </div>

                      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                        <div className="grid grid-cols-[minmax(0,1fr)_110px_80px_80px] bg-white px-4 py-3 text-[12px] font-semibold text-gray-500">
                          <div>Category</div>
                          <div className="text-right">Applications</div>
                          <div className="text-right">Hires</div>
                          <div className="text-right">Hire Rate</div>
                        </div>
                        {topJobCategories.map((row) => (
                          <div key={row.category} className="grid grid-cols-[minmax(0,1fr)_110px_80px_80px] items-center border-t border-gray-200 px-4 py-3 text-[13px]">
                            <div className="min-w-0 truncate font-semibold text-dark-blue-400">{row.category}</div>
                            <div className="text-right font-medium text-gray-500">{number(row.applications)}</div>
                            <div className="text-right font-medium text-gray-500">{row.hires}</div>
                            <div className="text-right font-semibold text-dark-blue-400">{row.ctr}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium: Pipeline */}
                    <div className="mt-8">
                      <PremiumOverlay>
                        <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                          <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                            Active Pipeline Stages
                          </div>
                          <div className="mt-3 h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={pipelineStages} layout="vertical" margin={{ top: 8, right: 12, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <YAxis type="category" dataKey="stage" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                                <RechartsTooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                                  {pipelineStages.map((entry) => (
                                    <Cell key={entry.stage} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>
                      </PremiumOverlay>
                    </div>
                  </Card>
                </TabsContent>

                {/* ========================================================= */}
                {/* CONTRACTS TAB */}
                {/* ========================================================= */}
                <TabsContent value="contracts" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Contracts
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      Active, completed, and contract performance metrics.
                    </div>

                    {/* Contract KPI cards */}
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      {[
                        { label: "Active Contracts", value: "4" },
                        { label: "Completed", value: "8" },
                        { label: "Avg Duration", value: "2.8 mo" },
                        { label: "Completion Rate", value: "92%" },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">{row.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Active vs completed over time */}
                    <div className="mt-6">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Contracts Over Time
                        </div>
                        <div className="mt-3 h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={contractsOverTime} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB", fontSize: 12 }} />
                              <Bar dataKey="active" stackId="a" fill="#306CFE" radius={[0, 0, 0, 0]} name="Active" />
                              <Bar dataKey="completed" stackId="a" fill="#93C5FD" radius={[10, 10, 0, 0]} name="Completed" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-[#306CFE]" />
                            <span className="text-[12px] font-medium text-gray-500">Active</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-[#93C5FD]" />
                            <span className="text-[12px] font-medium text-gray-500">Completed</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Contract table */}
                    <div className="mt-6">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        All Contracts
                      </div>

                      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                        <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_100px_80px_60px] bg-white px-4 py-3 text-[12px] font-semibold text-gray-500">
                          <div>Contract</div>
                          <div>Type</div>
                          <div>Status</div>
                          <div className="text-right">Value</div>
                          <div className="text-right">Duration</div>
                          <div className="text-right">Rating</div>
                        </div>
                        {contractRows.map((row) => (
                          <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_90px_90px_100px_80px_60px] items-center border-t border-gray-200 px-4 py-3 text-[13px]">
                            <div className="min-w-0 truncate font-semibold text-dark-blue-400">{row.name}</div>
                            <div className="font-medium text-gray-500">{row.type}</div>
                            <div>
                              <Badge visual={row.status === "Active" ? "primary" : "gray"} size="sm">
                                {row.status}
                              </Badge>
                            </div>
                            <div className="text-right font-medium text-gray-500">{row.value}</div>
                            <div className="text-right font-medium text-gray-500">{row.duration}</div>
                            <div className="text-right font-semibold text-dark-blue-400">{row.rating}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium: Hours tracked + value distribution */}
                    <div className="mt-8">
                      <PremiumOverlay>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                            <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                              Hours Tracked
                            </div>
                            <div className="mt-3 h-[180px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hoursTrackedData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                  <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} unit="h" />
                                  <RechartsTooltip content={<ChartTooltip suffix=" hours" />} />
                                  <Bar dataKey="hours" fill="#F59E0B" radius={[10, 10, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </Card>

                          <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                            <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                              Contract Value Distribution
                            </div>
                            <div className="mt-3 grid items-center gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                              <div className="h-[140px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={contractValueDist} dataKey="count" innerRadius={35} outerRadius={60} stroke="none" paddingAngle={2}>
                                      {contractValueDist.map((entry) => (
                                        <Cell key={entry.range} fill={entry.color} />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="space-y-2">
                                {contractValueDist.map((entry) => (
                                  <div key={entry.range} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-[13px] font-medium text-dark-blue-400">{entry.range}</span>
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-500">{entry.count} contracts</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        </div>
                      </PremiumOverlay>
                    </div>
                  </Card>
                </TabsContent>

                {/* ========================================================= */}
                {/* TALENT TAB */}
                {/* ========================================================= */}
                <TabsContent value="talent" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Talent Insights
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      Your hiring quality, retention, and talent relationships.
                    </div>

                    {/* Talent KPI cards */}
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      {[
                        { label: "Total Talent Hired", value: "7" },
                        { label: "Repeat Hire Rate", value: "43%" },
                        { label: "Avg Rating Given", value: "4.8" },
                        { label: "Avg Retention", value: "4.2 mo" },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">{row.label}</div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">{row.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Top skills table */}
                    <div className="mt-6">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        Top Skills Hired
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        What skills you hire for most often.
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {topSkillsHired.map((row) => (
                          <div key={row.skill} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">{row.skill}</div>
                              <Badge visual="gray" className="border border-gray-200 bg-white">
                                {row.hires} hires
                              </Badge>
                            </div>
                            <div className="mt-3 text-[13px]">
                              <span className="text-[12px] font-medium text-gray-500">Avg Rate: </span>
                              <span className="font-semibold text-dark-blue-400">{row.avgRate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rating distribution */}
                    <div className="mt-6 grid gap-3 lg:grid-cols-2">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Ratings You've Given
                        </div>
                        <div className="mt-3 grid items-center gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                          <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={ratingDistribution} dataKey="count" innerRadius={35} outerRadius={60} stroke="none" paddingAngle={2}>
                                  {ratingDistribution.map((entry) => (
                                    <Cell key={entry.rating} fill={entry.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-2">
                            {ratingDistribution.map((entry) => (
                              <div key={entry.rating} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[13px] font-medium text-dark-blue-400">{entry.rating}</span>
                                </div>
                                <span className="text-[13px] font-semibold text-gray-500">{entry.count} talent</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      {/* Repeat hire trend */}
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Repeat Hire Rate Trend
                        </div>
                        <div className="mt-3 h-[140px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={repeatHireData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="repeatGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#306CFE" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#306CFE" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                              <RechartsTooltip content={<ChartTooltip suffix="%" />} />
                              <Area type="monotone" dataKey="rate" stroke="#306CFE" strokeWidth={2} fill="url(#repeatGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Premium: Platform benchmarking */}
                    <div className="mt-8">
                      <PremiumOverlay>
                        <div>
                          <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Platform Benchmarking
                          </div>
                          <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                            See how you compare to other clients on the platform.
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {platformBenchmarks.map((b) => (
                              <div key={b.label} className="flex flex-col gap-y-1 rounded-lg border border-gray-100 bg-gray-50 p-4">
                                <span className="text-[12px] text-gray-500">{b.label}</span>
                                <span className="text-[18px] font-semibold text-dark-blue-400">{b.value}</span>
                                <div className="flex items-center gap-x-1">
                                  {b.positive ? (
                                    <ArrowUp className="size-3 text-success-500" />
                                  ) : (
                                    <ArrowDown className="size-3 text-error-500" />
                                  )}
                                  <span className={cn("text-[12px]", b.positive ? "text-success-600" : "text-error-600")}>
                                    {b.comparison}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PremiumOverlay>
                    </div>

                    {/* Quick signals */}
                    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                        Quick Signals
                      </div>
                      <div className="mt-2 space-y-2 text-[13px] font-light leading-normal text-gray-500">
                        <div>
                          Your{" "}
                          <span className="font-semibold text-dark-blue-400">repeat hire rate of 43%</span>{" "}
                          suggests strong talent relationships. Keep building long-term partnerships.
                        </div>
                        <div>
                          Your{" "}
                          <span className="font-semibold text-dark-blue-400">avg rating of 4.8</span>{" "}
                          makes you attractive to top talent. High-rated clients get 2x more applications.
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <DashboardFooter className="mt-8 mb-3.5 px-5 md:my-8 md:px-6" />
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
