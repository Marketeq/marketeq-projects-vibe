"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Calendar,
  CalendarCheck01,
  ChevronDown,
  Download,
  HelpCircle,
  Lightbulb03,
  Settings02,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  EarningsTab,
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

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      toast({ title: `${format.toUpperCase()} export started`, description: 'Your file will download shortly.' })
      const { getAccessToken } = await import('@/utils/auth')
      const token = getAccessToken() ?? ''
      const url = `${process.env.NEXT_PUBLIC_EARNINGS_SERVICE_URL ?? "http://localhost:3026/v1"}/earnings/export?format=${format}&currency=USD`
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `earnings.${format}`
          a.click()
        })
        .catch(() => toast({ title: 'Export failed', description: 'Could not download file.' }))
    },
    [toast]
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
                        className="underline"
                        variant="link"
                        visual="gray"
                        size="sm"
                        leftIcon={<Lightbulb03 className="size-4" />}
                        onClick={() =>
                          toast({
                            title: "Help & Support",
                            description:
                              "Contact support at support@marketeq.com",
                          })
                        }
                      >
                        <span className="underline">Help & Support</span>
                      </Button>
                      <Button
                        variant="outlined"
                        className="border-primary-500 bg-white border-2 text-primary-500 ml-3"
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
                        className="underline"
                        variant="link"
                        visual="gray"
                        size="sm"
                        leftIcon={<CalendarCheck01 className="size-[15px]" />}
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
                        leftIcon={<HelpCircle className="size-4" />}
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

                  {/* Export dropdown (all tabs) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="bg-white"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        rightIcon={<ChevronDown className="size-[15px]" />}
                      >
                        Export
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
                  onNavigateTab={setActiveTab}
                  onEditPayoutSchedule={() => setShowPayoutSchedule(true)}
                />
              </TabsContent>

              <TabsContent value="earnings" className="mt-5">
                <EarningsTab />
              </TabsContent>

              <TabsContent value="payouts" className="mt-5">
                <PayoutsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <PayoutScheduleDialog
          open={showPayoutSchedule}
          onOpenChange={setShowPayoutSchedule}
        />
      </div>
    </AuthenticatedRoute>
  )
}
