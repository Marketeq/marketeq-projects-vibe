"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import {
  ArrowLeft,
  Download02,
  Home,
  HelpCircle,
  MessageSquare01,
} from "@blend-metrics/icons"

export default function EndContractPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [agreed, setAgreed] = useState(false)
  const [activeTab, setActiveTab] = useState("transactions")
  const [successOpen, setSuccessOpen] = useState(false)

  const talent = {
    name: "Chris",
    username: "@uxdesignpro22",
    role: "Senior UX Designer",
    avatar: "/man.jpg",
    status: "Offline",
    localTime: "3:30 PM",
    responseTime: "1 hour",
  }

  const contract = {
    id: "A1234567",
    role: "Senior UX Designer",
    rate: "$25.00/hr",
    hoursLogged: 237,
    duration: "6 months, 12 days",
    totalBilled: "15,925",
    billingPeriod: "January 2024 - March 2025",
  }

  const transactions = [
    {
      type: "Funds Held by Platform",
      amount: "$6,500",
      description: "Amount currently held by the platform",
    },
    {
      type: "Funds Allocated to Services",
      amount: "$5,925",
      description:
        "Total amount allocated to the freelancer, based on approved hours and rate",
    },
    {
      type: "Credit Applied",
      amount: "$575",
      description: "A credit of $575 has been applied to your account.",
    },
  ]

  const payments = [
    {
      invoice: "INV-001",
      date: "2024-Oct-15",
      description: "Initial Deposit",
      total: "$750.00",
      status: "Paid",
    },
    {
      invoice: "INV-002",
      date: "2024-Oct-31",
      description: "Bi-Weekly Payment",
      total: "$1,250.00",
      status: "Paid",
    },
    {
      invoice: "INV-003",
      date: "2024-Nov-15",
      description: "Bi-Weekly Payment",
      total: "$1,250.00",
      status: "Paid",
    },
  ]

  return (
    <AuthenticatedRoute>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto w-full max-w-[940px] px-8 py-8">
          {/* Back link */}
          <Button
            variant="ghost"
            visual="gray"
            className="gap-2 px-0 text-sm font-semibold text-gray-500 mb-6"
            onClick={() => router.push(`/active-project/${projectId}`)}
          >
            <ArrowLeft className="size-4" />
            Back to Project
          </Button>

          {/* Main content with 20px gap between sections */}
          <div className="flex flex-col gap-5">
            {/* Top card: talent info + contract summary */}
            <div className="bg-white border border-gray-200 rounded-lg drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)]">
              {/* Talent info row */}
              <div className="flex gap-5 items-center justify-center border-b border-gray-200 pl-6 pr-10 py-10 h-[208px] rounded-t-lg">
                <div className="flex flex-[1_0_0] gap-3 items-start min-w-0">
                  <Avatar size="2xl" className="shrink-0">
                    <AvatarImage src={talent.avatar} alt={talent.name} />
                    <AvatarFallback>{talent.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col gap-6 flex-[1_0_0] items-start min-w-0">
                    {/* Name + role */}
                    <div className="flex flex-col items-start gap-2 w-full text-dark-blue-400 leading-normal">
                      <div className="flex items-center gap-[3px] text-lg">
                        <span className="font-semibold">{talent.name}</span>
                        <span className="font-normal">{talent.username}</span>
                      </div>
                      <p className="text-sm font-medium leading-normal">
                        {talent.role}
                      </p>
                    </div>

                    {/* Actions + status */}
                    <div className="flex flex-col items-start gap-3">
                      <Button
                        variant="outlined"
                        visual="primary"
                        className="border-2 border-primary-500 text-primary-500 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] w-fit px-4 py-2.5 gap-2 text-sm font-semibold leading-5"
                      >
                        <MessageSquare01 className="size-[15px]" />
                        Send Message
                      </Button>

                      <div className="flex flex-col items-start gap-2">
                        <div className="flex items-start gap-1 text-sm text-dark-blue-400 leading-normal">
                          <div className="flex items-center gap-1">
                            <div className="size-2 rounded-full bg-gray-400" />
                            <span className="font-bold">{talent.status}</span>
                          </div>
                          <span className="font-light">
                            {talent.localTime} local time
                          </span>
                        </div>
                        <div className="flex items-start gap-1 text-sm text-dark-blue-400 leading-normal">
                          <span className="font-light">
                            Average response time
                          </span>
                          <span className="font-bold">
                            {talent.responseTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Amount Billed */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-[250px] shrink-0 bg-white border-4 border-gray-100 rounded-lg p-6 flex flex-col gap-3 justify-center h-full cursor-default">
                        <p className="text-sm font-normal text-dark-blue-400 leading-normal">
                          Total Amount Billed
                        </p>
                        <div className="flex flex-col gap-[9.642px]">
                          <div className="flex items-center gap-0.5 text-dark-blue-400">
                            <span className="text-base font-normal opacity-50 leading-normal">
                              $
                            </span>
                            <span className="font-semibold">
                              <span className="text-2xl leading-normal">{contract.totalBilled}</span>
                              <span className="text-sm leading-normal">.00</span>
                            </span>
                          </div>
                          <p className="text-xs font-normal text-dark-blue-400 leading-normal">
                            {contract.billingPeriod}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent visual="white" size="md" className="text-gray-500">
                      The total amount paid for this contract during the listed period
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Contract Summary */}
              <div className="p-6 rounded-b-lg">
                <div className="flex flex-col gap-6 pr-[50px]">
                  <TooltipProvider>
                    <Tooltip>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                          Contract Summary
                        </span>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <HelpCircle className="size-3.5 text-gray-400" />
                          </span>
                        </TooltipTrigger>
                      </div>
                      <TooltipContent visual="white" size="md" className="text-gray-500">
                        October 12, 2024 - March 9, 2025
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-light text-dark-blue-400 leading-normal">
                        Role
                      </span>
                      <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                        {contract.role}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-light text-dark-blue-400 leading-normal">
                        Contract ID
                      </span>
                      <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                        {contract.id}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-light text-dark-blue-400 leading-normal">
                        Rate
                      </span>
                      <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                        {contract.rate}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-light text-dark-blue-400 leading-normal">
                        Hours Logged
                      </span>
                      <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                        {contract.hoursLogged}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-light text-dark-blue-400 leading-normal">
                        Contract Duration
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-dark-blue-400 leading-normal">
                              {contract.duration}
                            </span>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                <HelpCircle className="size-3.5 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                          </div>
                          <TooltipContent visual="white" size="md" className="text-gray-500">
                            October 12, 2024 - March 9, 2025
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table + Checkbox + Button section */}
            <div className="flex flex-col gap-5">
              {/* Transactions / Payments table */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="bg-white border border-gray-200 flex items-end justify-between px-6">
                    <TabsList className="!justify-start gap-4 h-auto p-0 bg-transparent">
                      <TabsTrigger
                        value="transactions"
                        className="capitalize text-base font-semibold leading-6 px-1 pt-3 pb-3 rounded-none border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=active]:shadow-none"
                      >
                        Transactions
                      </TabsTrigger>
                      <TabsTrigger
                        value="payments"
                        className="capitalize text-base font-semibold leading-6 px-1 pt-3 pb-3 rounded-none border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=active]:shadow-none"
                      >
                        Payments
                      </TabsTrigger>
                    </TabsList>

                    {/* Download Report - visible on payments tab */}
                    {activeTab === "payments" && (
                      <Button
                        variant="link"
                        visual="gray"
                        className="gap-2 text-sm font-semibold leading-5 text-gray-500 no-underline hover:no-underline"
                      >
                        <Download02 className="size-[15px]" />
                        Download Report
                      </Button>
                    )}
                  </div>

                  {/* Transactions tab */}
                  <TabsContent value="transactions" className="mt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 w-[233px] border-b border-gray-200">
                            Type
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 w-[147px] border-b border-gray-200">
                            Payment Amount
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 border-b border-gray-200">
                            Description
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, i) => (
                          <TableRow key={i} className="hover:bg-transparent">
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 w-[233px] border-b border-gray-200">
                              {tx.type}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 w-[147px] border-b border-gray-200">
                              {tx.amount}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-normal text-gray-600 h-[72px] px-6 py-4 border-b border-gray-200">
                              {tx.type === "Credit Applied" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-default">
                                        {tx.description}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent visual="white" size="md" className="max-w-[312px] text-gray-500">
                                      <p className="text-xs font-normal leading-[18px]">
                                        A credit of <span className="font-bold">$575.00</span> was applied on <span className="font-bold">04/09/2025</span>.
                                        <br /><br />
                                        This adjustment may be due to an invoice correction, refund, or payment reconciliation.{" "}
                                        <span className="font-medium text-primary-500 underline decoration-[rgba(48,108,254,0.3)] cursor-pointer">View invoice</span> for more details.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                tx.description
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  {/* Payments tab */}
                  <TabsContent value="payments" className="mt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 border-b border-gray-200">
                            Invoice #
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 border-b border-gray-200">
                            Date
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 w-[272px] border-b border-gray-200">
                            Description
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 border-b border-gray-200">
                            Total
                          </TableHead>
                          <TableHead className="bg-gray-25 text-xs font-medium leading-[18px] text-gray-600 h-11 px-6 py-3 border-b border-gray-200">
                            Status
                          </TableHead>
                          <TableHead className="bg-gray-25 h-11 px-6 py-3 w-16 border-b border-gray-200" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p, i) => (
                          <TableRow key={i} className="hover:bg-transparent">
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 underline decoration-[rgba(71,84,103,0.3)] border-b border-gray-200">
                              {p.invoice}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 border-b border-gray-200">
                              {p.date}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-normal text-gray-600 h-[72px] px-6 py-4 w-[272px] border-b border-gray-200">
                              {p.description}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 border-b border-gray-200">
                              {p.total}
                            </TableCell>
                            <TableCell className="text-sm font-normal leading-5 text-gray-600 h-[72px] px-6 py-4 border-b border-gray-200">
                              {p.status}
                            </TableCell>
                            <TableCell className="h-[72px] p-4 w-16 border-b border-gray-200">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <IconButton
                                      variant="ghost"
                                      visual="gray"
                                      className="size-8 opacity-50 hover:opacity-100 rounded-[5px] p-2.5"
                                    >
                                      <Download02 className="size-4" />
                                    </IconButton>
                                  </TooltipTrigger>
                                  <TooltipContent visual="white" size="md" className="text-gray-500">
                                    View Invoice
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Checkbox acknowledgment */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="size-5 rounded-[5px] shrink-0"
                />
                <p className="flex-1 min-w-0 text-sm font-normal leading-normal text-dark-blue-400">
                  By clicking &apos;Confirm &amp; End Contract&apos;, you
                  acknowledge that the funds have been correctly allocated,
                  services have been rendered and approved, and you authorize the
                  final payment of any remaining balance.
                </p>
              </div>

              {/* Confirm button */}
              <Button
                className="w-fit bg-primary-500 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] px-3.5 py-2 text-sm font-semibold leading-5"
                disabled={!agreed}
                onClick={() => setSuccessOpen(true)}
              >
                Confirm &amp; End Contract
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Successfully Ended modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[421px] p-6 gap-8 rounded-xl">
          <div className="flex flex-col gap-2 w-[373px]">
            <DialogTitle className="text-lg font-semibold leading-7 text-gray-900">
              Contract Successfully Ended
            </DialogTitle>
            <p className="text-sm font-normal leading-5 text-gray-500">
              Leave feedback for {talent.name} {talent.username}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Button
              variant="outlined"
              visual="gray"
              className="border border-gray-300 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] px-[18px] py-2.5 text-base font-semibold leading-6 text-gray-800 gap-2"
              onClick={() => {
                setSuccessOpen(false)
                router.push("/my-contracts")
              }}
            >
              <Home className="size-[15px]" />
              Back to Dashboard
            </Button>
            <Button
              className="bg-primary-500 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] px-[18px] py-2.5 text-base font-semibold leading-6"
              onClick={() => {
                setSuccessOpen(false)
                router.push("/my-contracts")
              }}
            >
              Leave a Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedRoute>
  )
}
