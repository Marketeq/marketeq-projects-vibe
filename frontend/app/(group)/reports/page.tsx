"use client"

import { useMemo, useState } from "react"
import { differenceInCalendarDays, format, subDays } from "date-fns"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import NextLink from "@/components/next-link"
import { Calendar, ChevronDown } from "@blend-metrics/icons"
import {
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Badge,
  Button,
  Card,
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
import { cn } from "@/utils/functions"

type Kpi = {
  label: string
  value: string
  delta?: string
}

type RangeKey = "7d" | "30d" | "90d" | "custom"
type CustomRangeValue = { start: Date; end: Date }

const rangePresets: Array<{ key: Exclude<RangeKey, "custom">; label: string; days: number }> = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
]

const overviewMetricConfig = [
  { label: "Profile Impressions", baseValue: 18240, baseDelta: 12, type: "count" as const },
  { label: "Profile Views", baseValue: 3180, baseDelta: 8, type: "count" as const },
  { label: "Profile CTR", baseValue: 17.4, baseDelta: 0.9, type: "percent" as const },
  { label: "Total Listing Impressions", baseValue: 42610, baseDelta: 6, type: "count" as const },
  { label: "Total Clicks", baseValue: 6920, baseDelta: 4, type: "count" as const },
  { label: "Total Inquiries / Messages", baseValue: 118, baseDelta: 10, type: "count" as const },
  { label: "Job Applications", baseValue: 14, baseDelta: 2, type: "count" as const },
  { label: "Profile Saves / Shortlists", baseValue: 86, baseDelta: 7, type: "count" as const },
] as const

const kpiTrend = {
  "Profile Impressions": [2200, 2400, 2600, 2800, 3100, 2900, 3240],
  "Profile Views": [380, 420, 510, 470, 560, 520, 610],
  "Profile CTR": [14.2, 15.1, 16.4, 15.8, 17.4, 16.9, 17.8],
  "Total Listing Impressions": [5200, 6100, 5900, 6400, 7100, 6800, 7310],
  "Total Clicks": [820, 940, 980, 1010, 1120, 1030, 1180],
  "Total Inquiries / Messages": [10, 14, 12, 18, 22, 19, 23],
  "Job Applications": [1, 2, 1, 3, 2, 2, 3],
  "Profile Saves / Shortlists": [8, 10, 12, 11, 14, 13, 18],
} as const

const spark = (values: readonly number[]) =>
  values.map((value, index) => ({ index, value }))

const snapshotInsights = [
  { label: "Top Performing Asset", value: "Profile (CTR 17.4%)" },
  { label: "Worst Performing Asset", value: "Team Listing (CTR 1.9%)" },
  { label: "Most Clicked Category", value: "Product Design" },
  { label: "Most Effective Tag", value: "Next.js" },
]

const discoveryMixByRange = {
  "7d": [
    { name: "Search", value: 42, color: "#2563EB" },
    { name: "Category", value: 26, color: "#60A5FA" },
    { name: "Direct", value: 19, color: "#93C5FD" },
    { name: "Listings", value: 13, color: "#DBEAFE" },
  ],
  "30d": [
    { name: "Search", value: 39, color: "#2563EB" },
    { name: "Category", value: 28, color: "#60A5FA" },
    { name: "Direct", value: 21, color: "#93C5FD" },
    { name: "Listings", value: 12, color: "#DBEAFE" },
  ],
  "90d": [
    { name: "Search", value: 36, color: "#2563EB" },
    { name: "Category", value: 30, color: "#60A5FA" },
    { name: "Direct", value: 22, color: "#93C5FD" },
    { name: "Listings", value: 12, color: "#DBEAFE" },
  ],
} as const

const trafficSourceBarsByRange = {
  "7d": [
    { source: "Search", views: 1320 },
    { source: "Category", views: 940 },
    { source: "Direct", views: 610 },
    { source: "Listings", views: 420 },
  ],
  "30d": [
    { source: "Search", views: 5160 },
    { source: "Category", views: 3810 },
    { source: "Direct", views: 2410 },
    { source: "Listings", views: 1560 },
  ],
  "90d": [
    { source: "Search", views: 14940 },
    { source: "Category", views: 11220 },
    { source: "Direct", views: 7020 },
    { source: "Listings", views: 4680 },
  ],
} as const

const discoveryMix = [
  { name: "Search", value: 42, color: "#2563EB" },
  { name: "Category", value: 26, color: "#60A5FA" },
  { name: "Direct", value: 19, color: "#93C5FD" },
  { name: "Listings", value: 13, color: "#DBEAFE" },
]

const listingRows = [
  { name: "Mobile App Experience (Project)", impressions: 12600, clicks: 2310, ctr: "18.3%", inquiries: 34 },
  { name: "UI Audit (Service)", impressions: 9200, clicks: 1280, ctr: "13.9%", inquiries: 21 },
  { name: "Design Sprint (Team)", impressions: 7100, clicks: 140, ctr: "2.0%", inquiries: 2 },
  { name: "Brand System (Project)", impressions: 3800, clicks: 420, ctr: "11.1%", inquiries: 9 },
]

const tagRows = [
  { tag: "Tailwind CSS", impressions: 10440, clicks: 1560, ctr: "14.9%" },
  { tag: "UX Research", impressions: 8920, clicks: 820, ctr: "9.2%" },
  { tag: "Next.js", impressions: 6820, clicks: 1210, ctr: "17.7%" },
  { tag: "Figma", impressions: 12100, clicks: 780, ctr: "6.4%" },
]

const searchTerms = [
  { term: "ux designer", impressions: 3240, clicks: 540, ctr: "16.7%" },
  { term: "product designer", impressions: 2810, clicks: 410, ctr: "14.6%" },
  { term: "nextjs freelancer", impressions: 1120, clicks: 210, ctr: "18.8%" },
  { term: "ui audit", impressions: 940, clicks: 120, ctr: "12.8%" },
]

const regions = [
  { region: "USA", impressions: 16420, clicks: 2840, ctr: "17.3%" },
  { region: "Canada", impressions: 5320, clicks: 710, ctr: "13.3%" },
  { region: "UK", impressions: 4180, clicks: 560, ctr: "13.4%" },
  { region: "EU (Other)", impressions: 2920, clicks: 330, ctr: "11.3%" },
]

const rateRows = [
  { label: "Your Avg Hourly Rate", value: "$85/hr", note: "Strong for your CTR" },
  { label: "Top CTR Rate Range", value: "$70–90/hr", note: "Best click performance" },
  { label: "Low CTR Rate Range", value: "$120+/hr", note: "Lower inquiry rate" },
]

const profileTrend = [
  { day: "Mon", views: 380, ctr: 14.2 },
  { day: "Tue", views: 420, ctr: 15.1 },
  { day: "Wed", views: 510, ctr: 16.4 },
  { day: "Thu", views: 470, ctr: 15.8 },
  { day: "Fri", views: 560, ctr: 17.4 },
  { day: "Sat", views: 520, ctr: 16.9 },
  { day: "Sun", views: 610, ctr: 17.8 },
]

const reportTabs = [
  { value: "overview", label: "Overview" },
  { value: "profile", label: "Profile" },
  { value: "listings", label: "Listings" },
  { value: "discovery", label: "Discovery" },
  { value: "engagement", label: "Engagement" },
] as const

const number = (value: number) => value.toLocaleString()
const kpiId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`

export default function ReportsPage() {
  const [tab, setTab] = useState("overview")
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7d")
  const [isRangeOpen, setIsRangeOpen] = useState(false)
  const [customRange, setCustomRange] = useState<CustomRangeValue>({
    start: subDays(new Date(), 6),
    end: new Date(),
  })

  const rangeDays =
    selectedRange === "custom"
      ? Math.max(1, differenceInCalendarDays(customRange.end, customRange.start) + 1)
      : rangePresets.find((preset) => preset.key === selectedRange)?.days ?? 7

  const rangeLabel =
    selectedRange === "custom"
      ? `${format(customRange.start, "LLL d")} - ${format(customRange.end, "LLL d, yyyy")}`
      : rangePresets.find((preset) => preset.key === selectedRange)?.label ?? "Last 7 days"

  const scaleFactor = rangeDays / 7

  const overviewKpis: Kpi[] = useMemo(
    () =>
      overviewMetricConfig.map((metric) => {
        if (metric.type === "percent") {
          const value = metric.baseValue + (rangeDays - 7) * 0.03
          const delta = metric.baseDelta + (rangeDays - 7) * 0.005
          return {
            label: metric.label,
            value: percent(value),
            delta: `+${delta.toFixed(1)}%`,
          }
        }

        const value = Math.round(metric.baseValue * scaleFactor)
        const delta = metric.baseDelta + Math.max(0, Math.round((rangeDays - 7) / 23))
        return {
          label: metric.label,
          value: number(value),
          delta: `+${delta}%`,
        }
      }),
    [rangeDays, scaleFactor],
  )

  const dynamicDiscoveryMix =
    selectedRange === "custom"
      ? trafficSourceBarsByRange["30d"] && discoveryMixByRange["30d"]
      : discoveryMixByRange[selectedRange]

  const dynamicTrafficSourceBars =
    selectedRange === "custom"
      ? trafficSourceBarsByRange["30d"].map((row) => ({
          ...row,
          views: Math.round(row.views * (rangeDays / 30)),
        }))
      : trafficSourceBarsByRange[selectedRange]

  const dynamicKpiTrend = useMemo(() => {
    return (Object.entries(kpiTrend) as Array<[keyof typeof kpiTrend, readonly number[]]>).reduce(
      (acc, [label, values]) => {
        if (label === "Profile CTR") {
          acc[label] = values.map((value) => Number((value + (rangeDays - 7) * 0.03).toFixed(1)))
          return acc
        }
        acc[label] = values.map((value) => Math.round(value * scaleFactor))
        return acc
      },
      {} as Record<keyof typeof kpiTrend, number[]>,
    )
  }, [rangeDays, scaleFactor])

  const dynamicProfileTrend = useMemo(
    () =>
      profileTrend.map((point) => ({
        ...point,
        views: Math.round(point.views * scaleFactor),
        ctr: Number((point.ctr + (rangeDays - 7) * 0.03).toFixed(1)),
      })),
    [rangeDays, scaleFactor],
  )

  const funnel = useMemo(() => {
    const impressions = Math.round(60850 * scaleFactor)
    const clicks = Math.round(6920 * scaleFactor)
    const inquiries = Math.round(118 * scaleFactor)
    const applications = Math.max(1, Math.round(14 * scaleFactor))
    return [
      { label: "Impressions", value: impressions, pct: 100 },
      { label: "Clicks", value: clicks, pct: Math.round((clicks / impressions) * 100) },
      { label: "Inquiries", value: inquiries, pct: Math.round((inquiries / impressions) * 100) },
      { label: "Job Applications", value: applications, pct: Math.round((applications / impressions) * 100) },
    ]
  }, [scaleFactor])

  const primaryTabs = reportTabs.slice(0, 4)
  const overflowTabs = reportTabs.slice(4)
  const profileViewsValue = overviewKpis.find((item) => item.label === "Profile Views")?.value ?? "0"
  const profileCtrValue = overviewKpis.find((item) => item.label === "Profile CTR")?.value ?? "0%"
  const inquiriesValue = overviewKpis.find((item) => item.label === "Total Inquiries / Messages")?.value ?? "0"

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto p-3.5 gap-x-6 flex md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          <div className="flex-auto min-w-0">
            <div className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-[24px] font-bold leading-none text-dark-blue-400">
                    Reports
                  </h1>
                  <p className="mt-2 max-w-[760px] text-[14px] font-light leading-normal text-gray-500">
                    Personal performance analytics for your profile and listings.
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

              <div className="mt-6 max-w-[920px]">
                <div className="text-[30px] font-bold leading-[1.1] text-dark-blue-400">
                  {`Your profile got ${profileViewsValue} views in ${rangeLabel.toLowerCase()}.`}
                </div>
                <p className="mt-3 text-[14px] font-light leading-normal text-gray-500">
                  {`CTR is ${profileCtrValue}, and you turned visibility into ${inquiriesValue} inquiries or messages during this range.`}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Tabs value={tab} onValueChange={setTab}>
                <div className="flex items-end justify-between gap-3 border-b border-gray-200">
                  <TabsList className="min-w-0 flex-1 justify-start gap-5 overflow-hidden border-b-0 px-0 pt-0">
                    {primaryTabs.map((tabItem) => (
                      <TabsTrigger key={tabItem.value} value={tabItem.value}>
                        {tabItem.label}
                      </TabsTrigger>
                    ))}
                    {overflowTabs.map((tabItem) => (
                      <TabsTrigger
                        key={tabItem.value}
                        value={tabItem.value}
                        containerClassName="hidden xl:flex"
                      >
                        {tabItem.label}
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
                          overflowTabs.some((tabItem) => tabItem.value === tab)
                            ? "text-primary-500"
                            : "text-gray-500",
                        )}
                      >
                        More
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[220px]">
                      {overflowTabs.map((tabItem) => (
                        <DropdownMenuItem key={tabItem.value} onSelect={() => setTab(tabItem.value)}>
                          {tabItem.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <TabsContent value="overview" className="mt-6">
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
                              {kpi.delta ? (
                                <Badge visual="gray" className="border border-gray-200 bg-white">
                                  {kpi.delta}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="h-[44px] w-[92px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={spark(dynamicKpiTrend[kpi.label as keyof typeof dynamicKpiTrend])}>
                                <defs>
                                  <linearGradient id={`kpi-${kpiId(kpi.label)}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#2563EB"
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

                  <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="grid gap-3">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Discovery Mix
                            </div>
                            <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                              Where visibility is coming from right now.
                            </div>
                          </div>
                          <Badge visual="gray" className="border border-gray-200 bg-white">
                            Overview
                          </Badge>
                        </div>
                        <div className="mt-4 grid items-center gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                          <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dynamicDiscoveryMix}
                                  dataKey="value"
                                  innerRadius={62}
                                  outerRadius={92}
                                  stroke="none"
                                  paddingAngle={2}
                                >
                                  {dynamicDiscoveryMix.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <text
                                  x="50%"
                                  y="48%"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-[#0F2B66] text-[14px] font-medium"
                                >
                                  Discovery
                                </text>
                                <text
                                  x="50%"
                                  y="58%"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-[#0F2B66] text-[22px] font-bold"
                                >
                                  100%
                                </text>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-3">
                            {dynamicDiscoveryMix.map((item) => (
                              <div
                                key={item.name}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-[13px] font-semibold text-dark-blue-400">
                                    {item.name}
                                  </span>
                                </div>
                                <span className="text-[13px] font-semibold text-gray-500">
                                  {item.value}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                          Snapshot Insights
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {snapshotInsights.map((row) => (
                            <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="text-[12px] font-medium leading-normal text-gray-500">
                                {row.label}
                              </div>
                              <div className="mt-1 text-[14px] font-semibold leading-normal text-dark-blue-400">
                                {row.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                          Funnel
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        {funnel.map((step) => (
                          <div key={step.label}>
                            <div className="flex items-center justify-between gap-3 text-[13px] leading-normal">
                              <span className="font-medium text-gray-500">{step.label}</span>
                              <span className="font-semibold text-dark-blue-400">
                                {number(step.value)}
                              </span>
                            </div>
                            <Progress
                              className="mt-2 h-2 bg-transparent"
                              indicatorClassName="rounded-full"
                              value={step.pct}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="profile" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                          Profile
                        </div>
                        <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                          Is your profile getting attention and converting?
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Profile → Inquiry Rate", value: "3.1%" },
                        { label: "Profile → Message Rate", value: "2.4%" },
                        { label: "Profile → Hire Me Click Rate", value: "0.4%" },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">
                            {row.label}
                          </div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-2">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                            {`Profile Views (${rangeLabel})`}
                          </div>
                        </div>
                        <div className="mt-3 h-[160px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dynamicProfileTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="day" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <RechartsTooltip
                                contentStyle={{
                                  borderRadius: 12,
                                  borderColor: "#E5E7EB",
                                  fontSize: 12,
                                }}
                              />
                              <Line type="monotone" dataKey="views" stroke="#2563EB" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                            {`Profile CTR (${rangeLabel})`}
                          </div>
                        </div>
                        <div className="mt-3 h-[160px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dynamicProfileTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="day" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis
                                tick={{ fill: "#667085", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${value}%`}
                                domain={[0, 25]}
                              />
                              <RechartsTooltip
                                formatter={(value) => [`${value ?? 0}%`, "CTR"]}
                                contentStyle={{
                                  borderRadius: 12,
                                  borderColor: "#E5E7EB",
                                  fontSize: 12,
                                }}
                              />
                              <Line type="monotone" dataKey="ctr" stroke="#2563EB" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    <div className="mt-6">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                            Traffic Sources
                          </div>
                        </div>
                        <div className="mt-3 h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dynamicTrafficSourceBars} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="source" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <RechartsTooltip
                                contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB", fontSize: 12 }}
                              />
                              <Bar dataKey="views" radius={[10, 10, 0, 0]} fill="#2563EB" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    <div className="mt-6">
                      <div className="grid gap-3 md:grid-cols-3">
                        {rateRows.map((row) => (
                          <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="text-[12px] font-medium leading-normal text-gray-500">
                              {row.label}
                            </div>
                            <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">
                              {row.value}
                            </div>
                            <div className="mt-2 text-[12px] font-light leading-normal text-gray-500">
                              {row.note}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                        Premium Adds Deeper Breakdowns
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        Unlock traffic sources, click depth, benchmarks, and conversion correlations.
                      </div>
                      <div className="mt-3">
                        <NextLink href="/billing">
                          <Button size="sm" variant="outlined" visual="gray">
                            View Premium Analytics
                          </Button>
                        </NextLink>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="listings" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Listings
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      Projects, services, teams, and the tags connected to them.
                    </div>

                    <div className="mt-5 h-[220px] rounded-lg border border-gray-200 bg-white p-4">
                      <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                        Top Listings by Clicks
                      </div>
                      <div className="mt-3 h-[160px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={listingRows} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" hide />
                            <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB", fontSize: 12 }}
                            />
                            <Bar dataKey="clicks" radius={[10, 10, 0, 0]} fill="#2563EB" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_90px_90px] bg-white px-4 py-3 text-[12px] font-semibold text-gray-500">
                        <div>Listing</div>
                        <div className="text-right">Impressions</div>
                        <div className="text-right">Clicks</div>
                        <div className="text-right">CTR</div>
                        <div className="text-right">Inquiries</div>
                      </div>
                      {listingRows.map((row) => (
                        <div
                          key={row.name}
                          className="grid grid-cols-[minmax(0,1fr)_110px_90px_90px_90px] items-center border-t border-gray-200 px-4 py-3 text-[13px]"
                        >
                          <div className="min-w-0 truncate font-semibold text-dark-blue-400">
                            {row.name}
                          </div>
                          <div className="text-right font-medium text-gray-500">
                            {number(row.impressions)}
                          </div>
                          <div className="text-right font-medium text-gray-500">
                            {number(row.clicks)}
                          </div>
                          <div className="text-right font-semibold text-dark-blue-400">
                            {row.ctr}
                          </div>
                          <div className="text-right font-medium text-gray-500">
                            {number(row.inquiries)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                        Tag Performance
                      </div>
                      <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                        Which tags are helping your listings get traction?
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {tagRows.map((row) => (
                          <div key={row.tag} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                                {row.tag}
                              </div>
                              <Badge visual="gray" className="border border-gray-200 bg-white">
                                CTR {row.ctr}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                              <div>
                                <div className="text-[12px] font-medium text-gray-500">Impressions</div>
                                <div className="mt-1 font-semibold text-dark-blue-400">
                                  {number(row.impressions)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[12px] font-medium text-gray-500">Clicks</div>
                                <div className="mt-1 font-semibold text-dark-blue-400">
                                  {number(row.clicks)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="discovery" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Discovery
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      Search terms, regions, and where visibility is building.
                    </div>

                    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_90px] bg-white px-4 py-3 text-[12px] font-semibold text-gray-500">
                        <div>Search Term</div>
                        <div className="text-right">Impressions</div>
                        <div className="text-right">Clicks</div>
                        <div className="text-right">CTR</div>
                      </div>
                      {searchTerms.map((row) => (
                        <div
                          key={row.term}
                          className="grid grid-cols-[minmax(0,1fr)_110px_90px_90px] items-center border-t border-gray-200 px-4 py-3 text-[13px]"
                        >
                          <div className="min-w-0 truncate font-semibold text-dark-blue-400">
                            {row.term}
                          </div>
                          <div className="text-right font-medium text-gray-500">
                            {number(row.impressions)}
                          </div>
                          <div className="text-right font-medium text-gray-500">
                            {number(row.clicks)}
                          </div>
                          <div className="text-right font-semibold text-dark-blue-400">
                            {row.ctr}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-4 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                        <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                          Regional Clicks
                        </div>
                        <div className="mt-3 h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regions} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="region" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <RechartsTooltip
                                contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB", fontSize: 12 }}
                              />
                              <Bar dataKey="clicks" radius={[10, 10, 0, 0]} fill="#2563EB" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <div className="grid gap-3">
                        {regions.map((row) => (
                          <div key={row.region} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                                {row.region}
                              </div>
                              <Badge visual="gray" className="border border-gray-200 bg-white">
                                CTR {row.ctr}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                              <div>
                                <div className="text-[12px] font-medium text-gray-500">Impressions</div>
                                <div className="mt-1 font-semibold text-dark-blue-400">
                                  {number(row.impressions)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[12px] font-medium text-gray-500">Clicks</div>
                                <div className="mt-1 font-semibold text-dark-blue-400">
                                  {number(row.clicks)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="engagement" className="mt-6">
                  <Card className="flex-col items-stretch justify-start rounded-lg border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                    <div className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                      Engagement
                    </div>
                    <div className="mt-1 text-[13px] font-light leading-normal text-gray-500">
                      Turn visibility into opportunities.
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Job Applications", value: "14" },
                        { label: "Inquiries Received", value: "42" },
                        { label: "Messages Started", value: "76" },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-[12px] font-medium leading-normal text-gray-500">
                            {row.label}
                          </div>
                          <div className="mt-2 text-[18px] font-bold leading-none text-dark-blue-400">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="text-[13px] font-semibold leading-normal text-dark-blue-400">
                        Quick Signals
                      </div>
                      <div className="mt-2 space-y-2 text-[13px] font-light leading-normal text-gray-500">
                        <div>
                          Listings with <span className="font-semibold text-dark-blue-400">high impressions</span>{" "}
                          but <span className="font-semibold text-dark-blue-400">low CTR</span> need better titles/tags.
                        </div>
                        <div>
                          If CTR is strong but inquiries are low, your{" "}
                          <span className="font-semibold text-dark-blue-400">rate or messaging</span> may be the blocker.
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
