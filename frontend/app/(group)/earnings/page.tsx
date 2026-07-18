"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Calendar,
  Download,
  Lightbulb01,
  Settings02,
} from "@blend-metrics/icons"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  EarningsTab,
  type EarningsFilters,
  HelpSupportDialog,
  OverviewTab,
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
  useToast,
} from "@/components/ui"

export default function TransactionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [showPayoutSchedule, setShowPayoutSchedule] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  // Bumped after a successful schedule save to remount OverviewTab — it fetches
  // schedule/balance/methods once on mount, and PayoutScheduleDialog is a sibling
  // (not a child), so there's otherwise no way to tell it to refetch after a save.
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0)
  // Populated by EarningsTab via onFiltersChange — Export reuses whatever the
  // contractor currently has the earnings table filtered to, rather than always
  // exporting the full unfiltered dataset regardless of what's on screen.
  const [earningsFilters, setEarningsFilters] = useState<EarningsFilters>({ dateRange: "all_time", entryType: "", statusFilter: "", search: "" })
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      setExporting(true)
      try {
        // Routed through api-gateway — see service/http/earnings.ts for why
        // (access_token is HttpOnly; the gateway forwards it server-side).
        const params = new URLSearchParams({ format, currency: "USD" })
        if (earningsFilters.dateRange) params.set("dateRange", earningsFilters.dateRange)
        if (earningsFilters.entryType) params.set("entryType", earningsFilters.entryType)
        if (earningsFilters.statusFilter) params.set("status", earningsFilters.statusFilter)
        const url = `${getPublicApiUrl()}/v1/earnings/export?${params.toString()}`
        const res = await fetch(url, { credentials: "include" })

        if (res.status === 202) {
          // Large exports are queued server-side rather than streamed synchronously.
          const data = await res.json()
          toast({ title: "Export is being prepared", description: data.message ?? "You'll receive a download link by notification when it's ready." })
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({ title: "Export failed", description: data.message ?? "Could not export your earnings. Please try again.", variant: "destructive" })
          return
        }

        const blob = await res.blob()
        // Use the server's actual filename (date-stamped) rather than a generic guess.
        const disposition = res.headers.get("Content-Disposition") ?? ""
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch?.[1] ?? `earnings.${format}`
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
    [toast, earningsFilters]
  )

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          <div className="space-y-5 min-w-0">
            <h1 className="text-xl font-bold text-dark-blue-400">
              Transactions
            </h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                        onClick={() => router.push("/time-tracking")}
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
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        onClick={() => setActiveTab("payouts")}
                      >
                        View Deposit Schedule
                      </Button>
                      <Button
                        className="bg-white border-2 ml-3 border-primary-500 text-primary-500"
                        variant="outlined"
                        visual="primary"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        onClick={() => router.push("/time-tracking")}
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
                        onClick={() =>
                          toast({
                            title: "Deposit Status",
                            description:
                              "Deposits typically arrive within 2-3 business days.",
                          })
                        }
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

                  {/* Export — only earnings-service exposes a real export endpoint;
                      hidden on Payouts (exporting earnings data while viewing payout
                      transactions would silently hand the contractor the wrong file). */}
                  {activeTab !== "payouts" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="bg-white"
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          disabled={exporting}
                          rightIcon={<Download className="size-4" />}
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
                  onNavigateTab={setActiveTab}
                  onEditPayoutSchedule={() => setShowPayoutSchedule(true)}
                  onOpenHelp={() => setShowHelp(true)}
                />
              </TabsContent>

              <TabsContent value="earnings" className="mt-5">
                <EarningsTab onFiltersChange={setEarningsFilters} />
              </TabsContent>

              <TabsContent value="payouts" className="mt-5">
                <PayoutsTab key={overviewRefreshKey} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <PayoutScheduleDialog
          open={showPayoutSchedule}
          onOpenChange={setShowPayoutSchedule}
          onSaved={() => setOverviewRefreshKey((k) => k + 1)}
        />
        <HelpSupportDialog open={showHelp} onOpenChange={setShowHelp} />
      </div>
    </AuthenticatedRoute>
  )
}
