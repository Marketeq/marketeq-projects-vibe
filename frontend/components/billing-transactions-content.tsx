"use client"

import { Badge, Button } from "@/components/ui"

const transactions = [
  {
    id: "txn_1001",
    description: "Premium Individual Plan renewal",
    type: "Subscription",
    method: "Visa ••••4292",
    amount: "$52.00",
    date: "Mar 26, 2025",
    status: "Paid",
  },
  {
    id: "txn_1002",
    description: "15 Invites top-up",
    type: "Top-Up",
    method: "Split (3 methods)",
    amount: "$242.00",
    date: "Feb 26, 2026",
    status: "Scheduled",
  },
  {
    id: "txn_1003",
    description: "Agency Premium Plan charge",
    type: "Membership",
    method: "ACH ••••6594",
    amount: "$2,420.00",
    date: "Mar 05, 2026",
    status: "Pending",
  },
]

export function BillingTransactionsContent() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-dark-blue-400">Recent Transactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track membership charges, top-ups, and scheduled billing activity.
          </p>
        </div>

        <Button size="sm" variant="outlined" visual="gray">
          Export
        </Button>
      </div>

      <div className="divide-y divide-gray-100">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="grid gap-3 px-5 py-4 transition hover:bg-gray-50 md:grid-cols-[1.7fr_0.9fr_1fr_0.8fr_0.8fr]"
          >
            <div>
              <p className="text-sm font-semibold text-dark-blue-400">
                {transaction.description}
              </p>
              <p className="mt-1 text-sm text-gray-500">{transaction.id}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-dark-blue-400">{transaction.type}</p>
              <p className="mt-1 text-sm text-gray-500">{transaction.method}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-dark-blue-400">{transaction.date}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-dark-blue-400">{transaction.amount}</p>
            </div>

            <div className="flex md:justify-end">
              <Badge
                visual="gray"
                className="rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-semibold text-dark-blue-400"
              >
                {transaction.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
