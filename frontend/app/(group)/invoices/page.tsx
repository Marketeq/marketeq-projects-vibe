"use client"

import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { BillingSectionHeader } from "@/components/billing-section-header"
import { LeftSidebar } from "@/components/talent-dashboard-comps"

const invoices = [
  {
    id: "INV-1001",
    description: "Premium Individual Plan",
    status: "Paid",
    amount: "$52.00",
    date: "March 26, 2025",
  },
  {
    id: "INV-1002",
    description: "15 Invites Top-Up",
    status: "Open",
    amount: "$242.00",
    date: "February 26, 2026",
  },
  {
    id: "INV-1003",
    description: "Agency Premium Plan",
    status: "Paid",
    amount: "$2,420.00",
    date: "March 5, 2026",
  },
]

export function BillingInvoicesContent() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-[1.1fr_1.5fr_0.8fr_0.9fr_1fr] gap-4 border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-gray-500">
        <span>Invoice</span>
        <span>Description</span>
        <span>Status</span>
        <span>Amount</span>
        <span>Date</span>
      </div>

      <div className="divide-y divide-gray-100">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="grid grid-cols-[1.1fr_1.5fr_0.8fr_0.9fr_1fr] gap-4 px-5 py-4 text-sm text-dark-blue-400 transition hover:bg-gray-50"
          >
            <span className="font-semibold">{invoice.id}</span>
            <span>{invoice.description}</span>
            <span>{invoice.status}</span>
            <span>{invoice.amount}</span>
            <span className="text-gray-500">{invoice.date}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function InvoicesPage() {
  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="min-[1024px]:pl-[338px] min-[1024px]:pr-6 min-[1024px]:py-8 flex-auto overflow-hidden p-3.5 md:p-6">
          <div className="mx-auto max-w-[1160px] space-y-5">
            <BillingSectionHeader
              title="Billing"
              description="Manage your plan, billing activity, invoices, and payment methods."
            />

            <BillingInvoicesContent />
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
