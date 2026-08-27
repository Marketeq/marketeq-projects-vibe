"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { Button, Card } from "@/components/ui"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

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
          <span className="flex size-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <Check className="size-7" />
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-tight text-dark-blue-400">
            Payment successful
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] font-light leading-6 text-gray-500">
            Your checkout is complete. If this purchase was for talent invites,
            return to the invite flow to continue sending them.
          </p>
          {sessionId ? (
            <p className="mt-4 break-all text-[12px] font-light leading-5 text-gray-400">
              Session ID: {sessionId}
            </p>
          ) : null}
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
