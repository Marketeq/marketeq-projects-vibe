"use client"

import Link from "next/link"
import { X } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { Button, Card } from "@/components/ui"

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-gray-25">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center gap-6 px-6">
          <Logo3 className="h-8 w-auto" />
          <div className="h-7 w-px bg-gray-200" />
          <span className="text-[18px] font-semibold text-gray-500">
            Secure Checkout
          </span>
        </div>
      </header>
      <section className="mx-auto flex w-full max-w-[720px] px-6 py-16">
        <Card className="w-full flex-col items-center rounded-[8px] border-gray-200 bg-white p-8 text-center shadow-none hover:border-gray-200 hover:ring-0">
          <span className="flex size-12 items-center justify-center rounded-full bg-error-50 text-error-600">
            <X className="size-7" />
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-tight text-dark-blue-400">
            Payment canceled
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] font-light leading-6 text-gray-500">
            No payment was submitted. You can return to checkout and choose a
            payment method when you are ready.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-10">
              <Link href="/invite-talent">Invite Talent</Link>
            </Button>
            <Button asChild className="h-10" variant="outlined" visual="gray">
              <Link href="/job-listing">Go to Job Listings</Link>
            </Button>
          </div>
        </Card>
      </section>
    </main>
  )
}
