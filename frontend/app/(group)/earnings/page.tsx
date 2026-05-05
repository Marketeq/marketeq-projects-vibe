"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Calendar,
  Download,
  HelpCircle,
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
    (format: "csv" | "pdf") => {
      toast({
        title: `${format.toUpperCase()} export started`,
        description: "Your file will download shortly.",
      })
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
                <div className="flex items-center gap-2">
                  {activeTab === "overview" && (
                    <>
                      <Button
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        leftIcon={<HelpCircle className="size-4" />}
                        onClick={() =>
                          toast({
                            title: "Help & Support",
                            description:
                              "Contact support at support@marketeq.com",
                          })
                        }
                      >
                        Help & Support
                      </Button>
                      <Button
                        variant="outlined"
                        visual="primary"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        onClick={() => router.push("/time-tracking")}
                      >
                        Log Time
                      </Button>
                      <Button
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
                        variant="outlined"
                        visual="primary"
                        size="sm"
                        leftIcon={<Calendar className="size-4" />}
                        onClick={() => router.push("/time-tracking")}
                      >
                        Log Time
                      </Button>
                      <Button
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
                        variant="ghost"
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
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        rightIcon={<Download className="size-4" />}
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
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings02 className="size-4" />
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
