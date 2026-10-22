"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Calendar,
  CalendarCheck01,
  ChevronDown,
  Lightbulb01,
  Settings02,
} from "@blend-metrics/icons"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  DownloadDesktopTrackerDialog,
  openDesktopTracker,
} from "@/components/download-desktop-tracker-dialog"
import {
  EarningsTab,
  type EarningsFilters,
  HelpSupportDialog,
  OverviewTab,
  PAYOUT_STATUS_LABELS,
  type PayoutDepositStatus,
  type PayoutsFilters,
  PayoutScheduleDialog,
  PayoutsTab,
} from "@/components/transactions-comps"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

export default function TransactionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  // Every "View Payout History" / "Withdraw Full Amount" style CTA elsewhere
  // in this area (withdraw-funds-dialog.tsx, transfer-funds/page.tsx, the
  // decline-state buttons below) navigates here via router.push("/earnings
  // ?tab=payouts") — but this page never actually read that query param, so
  // when the contractor was already on /earnings (the common case: Withdraw
  // Funds was opened from the Overview tab in the first place), the App
  // Router's shallow same-route navigation left activeTab untouched at its
  // "overview" default. The URL changed; nothing visible did. Initializing
  // from the param and reacting to it changing (the effect below) fixes
  // both the already-here case and a fresh /earnings?tab=payouts load.
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") ?? "overview"
  )
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) setActiveTab(tab)
  }, [searchParams])
  // BTB-286: keep the URL in step with the tab the contractor clicks. If it
  // stayed on ?tab=payouts after switching to Overview, a later "View Payout
  // History" pushed that same URL, searchParams didn't change, and the effect
  // above never switched back — the modal just closed.
  const selectTab = (tab: string) => {
    setActiveTab(tab)
    router.replace(`/earnings?tab=${tab}`, { scroll: false })
  }
  const [showPayoutSchedule, setShowPayoutSchedule] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  // Log Time works as on /time-tracking: open the desktop tracker if it's
  // installed, else offer its installer.
  const [showDownloadTracker, setShowDownloadTracker] = useState(false)
  const [openingDesktopTracker, setOpeningDesktopTracker] = useState(false)
  const handleLogTime = async () => {
    setOpeningDesktopTracker(true)
    try {
      // Either opens the installed tracker or offers the installer.
      await openDesktopTracker(() => {
        setOpeningDesktopTracker(false)
        setShowDownloadTracker(true)
      })
    } finally {
      setOpeningDesktopTracker(false)
    }
  }
  const [depositStatus, setDepositStatus] = useState<PayoutDepositStatus | null>(null)
  // Bumped after a successful schedule save to remount OverviewTab — it fetches
  // schedule/balance/methods once on mount, and PayoutScheduleDialog is a sibling
  // (not a child), so there's otherwise no way to tell it to refetch after a save.
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0)
  // Bumped when "Add New Deposit Method" is clicked from inside
  // PayoutScheduleDialog (a sibling, not a child, of OverviewTab) — tells
  // OverviewTab to open its own Add Deposit Method modal without a full remount.
  const [openAddMethodSignal, setOpenAddMethodSignal] = useState(0)
  // Populated by EarningsTab via onFiltersChange — Export reuses whatever the
  // contractor currently has the earnings table filtered to, rather than always
  // exporting the full unfiltered dataset regardless of what's on screen.
  const [earningsFilters, setEarningsFilters] = useState<EarningsFilters>({ dateRange: "this_month", entryType: "", statusFilter: "", search: "", projectId: "", clientId: "" })
  // Populated by PayoutsTab via onFiltersChange — same reasoning as
  // earningsFilters above, just for the Payouts tab's own filter set.
  const [payoutsFilters, setPayoutsFilters] = useState<PayoutsFilters>({ dateRange: "all_time", statusFilter: "", depositMethodId: "", search: "" })
  const [exporting, setExporting] = useState(false)
  // BTB-314 (AC-39.01): Earnings total for the current filters, from
  // EarningsTab. Export is disabled only on a known 0, never while unknown.
  const [earningsTotal, setEarningsTotal] = useState<number | null>(null)
  const nothingToExport = activeTab === "earnings" && earningsTotal === 0

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      setExporting(true)
      try {
        // Routed through api-gateway — see service/http/earnings.ts for why
        // (access_token is HttpOnly; the gateway forwards it server-side).
        const isPayouts = activeTab === "payouts"
        const params = new URLSearchParams({ format })
        if (isPayouts) {
          if (payoutsFilters.dateRange && payoutsFilters.dateRange !== "all_time") params.set("dateRange", payoutsFilters.dateRange)
          if (payoutsFilters.dateFrom) params.set("from", payoutsFilters.dateFrom)
          if (payoutsFilters.dateTo) params.set("to", payoutsFilters.dateTo)
          if (payoutsFilters.statusFilter) params.set("status", payoutsFilters.statusFilter)
          if (payoutsFilters.depositMethodId) params.set("depositMethodId", payoutsFilters.depositMethodId)
          if (payoutsFilters.search) params.set("search", payoutsFilters.search)
        } else {
          params.set("currency", "USD")
          if (earningsFilters.dateRange) params.set("dateRange", earningsFilters.dateRange)
          if (earningsFilters.startDate) params.set("startDate", earningsFilters.startDate)
          if (earningsFilters.endDate) params.set("endDate", earningsFilters.endDate)
          if (earningsFilters.entryType) params.set("entryType", earningsFilters.entryType)
          if (earningsFilters.statusFilter) params.set("status", earningsFilters.statusFilter)
          if (earningsFilters.projectId) params.set("projectId", earningsFilters.projectId)
          if (earningsFilters.clientId) params.set("clientId", earningsFilters.clientId)
          if (earningsFilters.search) params.set("search", earningsFilters.search)
        }
        const url = `${getPublicApiUrl()}/v1/${isPayouts ? "payouts" : "earnings"}/export?${params.toString()}`
        const res = await fetch(url, { credentials: "include" })

        if (res.status === 202) {
          // Large exports are queued server-side rather than streamed synchronously.
          const data = await res.json()
          toast({ title: "Export is being prepared", description: data.message ?? "You'll receive a download link by notification when it's ready." })
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({ title: "Export failed", description: data.message ?? `Could not export your ${isPayouts ? "payouts" : "earnings"}. Please try again.`, variant: "destructive" })
          return
        }

        const blob = await res.blob()
        // Use the server's actual filename (date-stamped) rather than a generic guess.
        const disposition = res.headers.get("Content-Disposition") ?? ""
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch?.[1] ?? `${isPayouts ? "payouts" : "earnings"}.${format}`
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
        toast({ title: `${format.toUpperCase()} export ready`, description: "Your file has downloaded." })
      } catch {
        toast({ title: "Export failed", description: "Could not reach the server. Please try again.", variant: "destructive" })
      } finally {
        setExporting(false)
      }
    },
    [toast, earningsFilters, payoutsFilters, activeTab]
  )

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-[50px] overflow-hidden">
          <div className="space-y-5 min-w-0">
            <h1 className="text-xl font-bold text-dark-blue-400">
              Financials
            </h1>

            <Tabs value={activeTab} onValueChange={selectTab}>
              {/* Tab Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <TabsList className="border-b-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="payouts">Payouts</TabsTrigger>
                </TabsList>

                {/* Tab-specific actions */}
                <div className="flex items-center gap-3">
                  {activeTab === "overview" && (
                    <>
                      <Button
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        leftIcon={<Lightbulb01 className="size-4" />}
                        onClick={() => setShowHelp(true)}
                      >
                        Help & Support
                      </Button>
                      <Button
                        className="border-primary-500 bg-white border-2 text-primary-500 ml-3"
                        variant="outlined"
                        visual="primary"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        loading={openingDesktopTracker}
                        onClick={handleLogTime}
                      >
                        Log Time
                      </Button>
                      <Button
                        className="bg-white"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={() => router.push("/time-tracking")}
                      >
                        View Time Sheets
                      </Button>
                    </>
                  )}

                  {activeTab === "earnings" && (
                    <>
                      <Button
                        className="underline text-[#22376B]"
                        variant="link"
                        visual="gray"
                        size="sm"
                        leftIcon={<CalendarCheck01 className="size-4 text-[#22376B]" />}
                        onClick={() => selectTab("payouts")}
                      >
                        View Deposit Schedule
                      </Button>
                      <Button
                        className="bg-white border-2 border-primary-500 text-primary-500"
                        variant="outlined"
                        visual="primary"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        loading={openingDesktopTracker}
                        onClick={handleLogTime}
                      >
                        Log Time
                      </Button>
                      <Button
                        className="bg-white"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={() => router.push("/time-tracking")}
                      >
                        View Time Sheets
                      </Button>
                    </>
                  )}

                  {activeTab === "payouts" && (
                    <>
                      <Button
                        className="underline"
                        variant="link"
                        visual="gray"
                        size="sm"
                        leftIcon={<Lightbulb01 className="size-4" />}
                        onClick={() => {
                          const description = depositStatus?.status
                            ? `Your $${depositStatus.amountUsd} payout is currently ${(PAYOUT_STATUS_LABELS[depositStatus.status] ?? depositStatus.status).toLowerCase()}.${depositStatus.estimatedArrivalAt ? ` Estimated arrival: ${new Date(depositStatus.estimatedArrivalAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : ""}`
                            : "No payout is currently in progress. Once initiated, deposits typically take 1-3 business days to arrive."
                          toast({ title: "Deposit Status", description })
                        }}
                      >
                        Where Is My Deposit?
                      </Button>
                      <Button
                        className="bg-white"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={() => setShowPayoutSchedule(true)}
                      >
                        Edit Schedule
                      </Button>
                    </>
                  )}

                  {/* Export — earnings-service and payout-service (v1/payouts/export)
                      each expose their own real export endpoint; handleExport
                      picks the right one based on activeTab. */}
                  {nothingToExport ? (
                    // BTB-314 AC-39.02/03: stays visible, not interactive, and
                    // explains why on hover or focus. A disabled button gets
                    // no pointer/focus events, so the span carries them.
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} aria-label="Export (no data to export for the selected range)">
                            <Button
                              className="h-9 bg-white px-5 text-sm font-semibold text-[#1F2937]"
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              disabled
                              rightIcon={<ChevronDown className="size-4 text-[#667085]" />}
                            >
                              Export
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>No data to export for the selected range.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="h-9 bg-white px-5 text-sm font-semibold text-[#1F2937]"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        disabled={exporting}
                        rightIcon={<ChevronDown className="size-4 text-[#667085]" />}
                      >
                        {exporting ? "Exporting…" : "Export"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("csv")}>
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("pdf")}>
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  )}

                  {/* Settings gear */}
                  <IconButton
                    className="bg-white"
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings02 className="size-[15px]" />
                  </IconButton>
                </div>
              </div>

              {/* Tab Content */}
              <TabsContent value="overview" className="mt-5">
                <OverviewTab
                  key={overviewRefreshKey}
                  onNavigateTab={selectTab}
                  onEditPayoutSchedule={() => setShowPayoutSchedule(true)}
                  onOpenHelp={() => setShowHelp(true)}
                  openAddMethodSignal={openAddMethodSignal}
                />
              </TabsContent>

              <TabsContent value="earnings" className="mt-5">
                <EarningsTab onFiltersChange={setEarningsFilters} onTotalChange={setEarningsTotal} />
              </TabsContent>

              <TabsContent value="payouts" className="mt-5">
                <PayoutsTab key={overviewRefreshKey} onDepositStatusChange={setDepositStatus} onFiltersChange={setPayoutsFilters} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <PayoutScheduleDialog
          open={showPayoutSchedule}
          onOpenChange={setShowPayoutSchedule}
          onSaved={() => setOverviewRefreshKey((k) => k + 1)}
          onAddNewMethod={() => setOpenAddMethodSignal((k) => k + 1)}
        />
        <HelpSupportDialog open={showHelp} onOpenChange={setShowHelp} />
        <DownloadDesktopTrackerDialog
          open={showDownloadTracker}
          onOpenChange={setShowDownloadTracker}
        />
      </div>
    </AuthenticatedRoute>
  )
}
