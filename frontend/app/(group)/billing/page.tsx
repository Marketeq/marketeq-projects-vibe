"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  CoinStack,
  CreditCard02,
  Download,
  FileText,
  Plus,
} from "@blend-metrics/icons"
import {
  Badge,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

interface PaymentMethod {
  id: string
  type: "visa" | "mastercard"
  last4: string
  expiry: string
  isDefault: boolean
}

interface Invoice {
  id: string
  date: string
  description: string
  amount: string
  status: "Paid" | "Pending" | "Failed"
}

const samplePaymentMethods: PaymentMethod[] = [
  { id: "1", type: "visa", last4: "4242", expiry: "12/27", isDefault: true },
  { id: "2", type: "mastercard", last4: "8888", expiry: "06/26", isDefault: false },
]

const sampleInvoices: Invoice[] = [
  { id: "INV-001", date: "Mar 15, 2026", description: "Pro Plan — Monthly", amount: "$49.00", status: "Paid" },
  { id: "INV-002", date: "Feb 15, 2026", description: "Pro Plan — Monthly", amount: "$49.00", status: "Paid" },
  { id: "INV-003", date: "Jan 15, 2026", description: "Pro Plan — Monthly", amount: "$49.00", status: "Paid" },
  { id: "INV-004", date: "Dec 15, 2025", description: "Pro Plan — Monthly", amount: "$49.00", status: "Paid" },
  { id: "INV-005", date: "Nov 15, 2025", description: "Service Fee — Mobile App Redesign", amount: "$500.00", status: "Paid" },
]

const invoiceStatusColors: Record<Invoice["status"], string> = {
  Paid: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
}

export default function BillingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-dark-blue-400">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your plan, payment methods, and invoices</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="border-b border-gray-200 bg-transparent w-full justify-start gap-x-6 px-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                <CoinStack className="size-4 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                <CreditCard02 className="size-4 mr-1.5" />
                Payment Methods
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                <FileText className="size-4 mr-1.5" />
                Invoices
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Current Plan */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark-blue-400">Current Plan</h2>
                    <p className="text-sm text-gray-500 mt-1">You are currently on the Pro plan</p>
                  </div>
                  <Button variant="outlined" visual="gray" size="sm">Change Plan</Button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Plan</p>
                    <p className="text-lg font-semibold text-dark-blue-400 mt-1">Pro</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Monthly Cost</p>
                    <p className="text-lg font-semibold text-dark-blue-400 mt-1">$49.00</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Next Billing Date</p>
                    <p className="text-lg font-semibold text-dark-blue-400 mt-1">Apr 15, 2026</p>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Account Balance</h2>
                <p className="text-sm text-gray-500 mt-1">Your available balance and pending transactions</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Available Balance</p>
                    <p className="text-lg font-semibold text-green-600 mt-1">$1,250.00</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-lg font-semibold text-yellow-600 mt-1">$350.00</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Total Earned</p>
                    <p className="text-lg font-semibold text-dark-blue-400 mt-1">$8,450.00</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="payment" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark-blue-400">Payment Methods</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your saved payment methods</p>
                  </div>
                  <Button size="sm">
                    <Plus className="size-4 mr-1.5" />
                    Add Method
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  {samplePaymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <CreditCard02 className="size-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-dark-blue-400 capitalize">
                              {method.type} ending in {method.last4}
                            </p>
                            {method.isDefault && (
                              <Badge className="rounded-full text-[10px]" size="sm" visual="primary">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button variant="outlined" visual="gray" size="sm">Set Default</Button>
                        )}
                        <Button variant="outlined" visual="gray" size="sm">Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="text-lg font-semibold text-dark-blue-400">Invoice History</h2>
                  <p className="text-sm text-gray-500 mt-1">View and download your past invoices</p>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Invoice</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Description</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <span className="text-sm font-medium text-dark-blue-400">{invoice.id}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-gray-500">{invoice.date}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-gray-500">{invoice.description}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm font-medium text-dark-blue-400">{invoice.amount}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${invoiceStatusColors[invoice.status]}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Button variant="ghost" visual="gray" size="sm">
                            <Download className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
