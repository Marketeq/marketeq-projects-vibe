"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  UserPlus,
} from "@blend-metrics/icons"
import {
  Button,
} from "@/components/ui"

export default function NextStepsPage() {
  const router = useRouter()

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-[150px] py-[50px]">
        <div className="flex flex-col">
          <div className="size-[75px] border-[13.39px] self-center text-success-500 border-success-50 bg-success-100 rounded-full shrink-0 inline-flex items-center justify-center">
            <CheckCircle className="size-[37.5px]" />
          </div>

          <h3 className="text-2xl mt-8 text-center font-medium text-dark-blue-400">
            So you&apos;ve launched your project...{" "}
          </h3>

          <h2 className="text-4xl mt-4 text-center font-light text-dark-blue-400">
            That&apos;s pretty{" "}
            <span className="font-bold text-success-400">Awesome</span>! You&apos;re
            ready to start
          </h2>

          <p className="text-xl mt-4 text-center font-light text-dark-blue-400">
            Here&apos;s some things you can do to get your project going in the
            right direction...
          </p>
        </div>

        <div className="mt-[50px]">
          <div className="grid gap-y-3">
            <article className="p-6 flex rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] items-center gap-x-2 justify-between">
              <div className="flex gap-x-5 flex-auto items-center">
                <UserPlus className="size-8 shrink-0 text-primary-500" />

                <div className="flex-auto space-y-2">
                  <h1 className="text-sm font-bold text-dark-blue-400">
                    Invite Stakeholders
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    If you haven&apos;t already, start inviting your
                    stakeholders to the project
                  </p>
                </div>
              </div>

              <Button variant="outlined" visual="gray">
                Invite Stakeholders
              </Button>
            </article>
            <article className="p-6 flex rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] items-center gap-x-2 justify-between">
              <div className="flex gap-x-5 flex-auto items-center">
                <UserPlus className="size-8 shrink-0 text-primary-500" />

                <div className="flex-auto space-y-2">
                  <h1 className="text-sm font-bold text-dark-blue-400">
                    Invite Stakeholders
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    If you haven&apos;t already, start inviting your
                    stakeholders to the project
                  </p>
                </div>
              </div>

              <Button variant="outlined" visual="gray">
                Invite Stakeholders
              </Button>
            </article>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="link"
              visual="gray"
              onClick={() => router.push("/client-dashboard")}
            >
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
