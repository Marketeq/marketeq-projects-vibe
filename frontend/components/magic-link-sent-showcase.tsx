"use client"

import Link from "next/link"
import { AlertCircle, ArrowLeft, Mail } from "@blend-metrics/icons"
import { Button } from "./ui"

export const MagicLinkSentShowcase = ({
  goBack,
  onResend,
}: {
  goBack?: () => void
  onResend?: () => void
}) => {
  return (
    <div className="py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]">
      <div className="max-w-[510px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]">
        <div className="flex items-center justify-center">
          <div className="size-12 shrink-0 border-[8px] border-primary-25 rounded-full inline-flex items-center justify-center bg-primary-50 text-primary-500">
            <Mail className="size-[24px]" />
          </div>
        </div>

        <h1 className="text-lg text-center font-semibold text-dark-blue-400 mt-5">
          Magic link sent!
        </h1>

        <p className="mt-2 text-center text-sm leading-5 text-dark-blue-400">
          We sent a magic link sent to the email{" "}
          <span className="font-semibold">johndoe@gmail.com.</span> The link
          will expire in <span className="font-semibold">24 hours.</span>
        </p>

        <div className="mt-8 flex flex-col items-center gap-y-8">
          <Button size="sm" onClick={onResend}>
            Resend Link
          </Button>
          <Button size="sm" variant="link" onClick={goBack}>
            <ArrowLeft className="size-[15px]" /> Back
          </Button>
        </div>

        <div className="mt-6 text-sm leading-5 text-dark-blue-400">
          No longer have access to this email?{" "}
          <Link
            className="focus-visible:outline-none underline font-semibold text-primary-500"
            href="#"
          >
            Start account recovery
          </Link>
        </div>
      </div>

      <div className="max-w-[510px] mt-10 3xl:mt-[50px] mx-auto px-5 md:px-[50px] w-full">
        <div className="flex items-center gap-x-2">
          <AlertCircle className="size-5 text-primary-500" />
          <span className="text-sm font-bold leading-5 text-dark-blue-400">
            Helpful Tip
          </span>
        </div>
        <div className="mt-2.5">
          <span className="text-sm leading-5 text-dark-blue-400">
            Be sure to check your spam folder if you don’t see the email in your
            inbox.
          </span>
        </div>
      </div>
    </div>
  )
}
