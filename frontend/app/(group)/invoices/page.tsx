"use client"

import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { BillingSectionHeader } from "@/components/billing-section-header"
import { BillingInvoicesContent } from "@/components/billing-invoices-content"
import { LeftSidebar } from "@/components/talent-dashboard-comps"

export { BillingInvoicesContent }

export default function InvoicesPage() {
  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="min-[1024px]:pl-[248px] min-[1024px]:pr-6 min-[1024px]:py-8 flex-auto overflow-hidden p-3.5 md:p-6">
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
